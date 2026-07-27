import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/lib/database.types';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      }
    );

    // Verify user is admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin/super_admin
    const { data: userInfo, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userInfo || !['admin', 'super_admin'].includes(userInfo.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Past the auth gate, read with the service role like the sibling admin
    // routes. The platform-wide aggregates below are service_role-only RPCs
    // (migration 052) so revenue totals are not reachable with a public key.
    const db = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Parse pagination params
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '0');
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '500'), 1000);
    const from = page * pageSize;
    const to = from + pageSize - 1;

    // Fetch paginated subscriptions with academy data and total count
    const { data: subscriptions, error: subsError, count: totalCount } = await db
      .from('academy_subscriptions')
      .select(`
        *,
        academies!inner(
          id,
          name
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (subsError) {
      console.error('[Admin Subscriptions API] Error fetching subscriptions:', subsError);
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      );
    }

    // Fetch usage data only for academies on this page
    const academyIds = subscriptions?.map(s => s.academy_id) || [];

    const [
      { data: usageData, error: usageError },
      { count: managerCount },
      { count: teacherCount },
      { count: studentCount },
      { count: parentCount }
    ] = await Promise.all([
      db
        .from('subscription_usage')
        .select('*')
        .in('academy_id', academyIds),
      db.from('managers').select('*', { count: 'exact', head: true }).in('academy_id', academyIds),
      db.from('teachers').select('*', { count: 'exact', head: true }).in('academy_id', academyIds),
      db.from('students').select('*', { count: 'exact', head: true }).in('academy_id', academyIds),
      db.from('parents').select('*', { count: 'exact', head: true }).in('academy_id', academyIds),
    ]);

    if (usageError) {
      console.error('[Admin Subscriptions API] Error fetching usage:', usageError);
    }

    // Create usage map
    const usageMap = new Map(usageData?.map(u => [u.academy_id, u]) || []);

    // For per-academy user counts, fetch grouped by academy_id for the current page's academies
    const [
      { data: managersPerAcademy },
      { data: teachersPerAcademy },
      { data: studentsPerAcademy },
      { data: parentsPerAcademy }
    ] = await Promise.all([
      db.from('managers').select('academy_id').in('academy_id', academyIds),
      db.from('teachers').select('academy_id').in('academy_id', academyIds),
      db.from('students').select('academy_id').in('academy_id', academyIds),
      db.from('parents').select('academy_id').in('academy_id', academyIds),
    ]);

    // Create user count map by academy
    const userCountMap = new Map<string, number>();

    [managersPerAcademy, teachersPerAcademy, studentsPerAcademy, parentsPerAcademy].forEach(roleUsers => {
      roleUsers?.forEach((user: { academy_id: string }) => {
        if (!user.academy_id) return;
        userCountMap.set(user.academy_id, (userCountMap.get(user.academy_id) || 0) + 1);
      });
    });

    // Platform-wide subscription metrics.
    //
    // These used to reduce over `subscriptions` — the CURRENT PAGE (500 rows
    // by default). With 501 subscriptions the MRR card silently understated
    // revenue, and churnRate divided the canceled count by the page length
    // instead of the real subscription count, so the same churn number moved
    // whenever someone changed pageSize. The aggregate now runs in SQL over
    // every row; the page below is only ever used for the visible list.
    const { data: metricsRows, error: metricsError } = await db.rpc('admin_subscription_metrics');
    if (metricsError) {
      console.error('[Admin Subscriptions API] Error fetching metrics:', metricsError);
      return NextResponse.json({ error: 'Failed to fetch subscription metrics' }, { status: 500 });
    }
    const agg = Array.isArray(metricsRows) && metricsRows.length > 0 ? metricsRows[0] : null;
    const toNum = (v: unknown) => {
      const n = typeof v === 'number' ? v : Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    const totalMRR = toNum(agg?.mrr_won);
    const allSubscriptionsCount = toNum(agg?.total_count);
    const canceledThisMonth = toNum(agg?.canceled_30d);
    const churnRate = allSubscriptionsCount > 0 ? (canceledThisMonth / allSubscriptionsCount) * 100 : 0;

    const metrics = {
      totalMRR,
      totalARR: totalMRR * 12,
      growth: 0, // Would need historical data
      churnRate: Math.round(churnRate * 10) / 10,
      newSubscriptions: toNum(agg?.new_30d),
      canceledSubscriptions: canceledThisMonth
    };

    // Last payment actually taken for each academy on this page. `monthly_amount`
    // was previously handed back as `lastPaymentAmount`, so a failed or partial
    // charge still rendered as a successful payment of the full plan price.
    const { data: paidInvoices } = await db
      .from('subscription_invoices')
      .select('academy_id, amount, paid_at')
      .in('academy_id', academyIds)
      .eq('status', 'paid')
      .order('paid_at', { ascending: false });

    const lastPaymentMap = new Map<string, { amount: number; paidAt: string | null }>();
    for (const inv of paidInvoices ?? []) {
      // academy_id is nullable on subscription_invoices; a null one cannot be
      // attributed to any academy on this page.
      if (!inv.academy_id) continue;
      // Rows arrive newest-first, so the first hit per academy is the latest.
      if (!lastPaymentMap.has(inv.academy_id)) {
        lastPaymentMap.set(inv.academy_id, { amount: toNum(inv.amount), paidAt: inv.paid_at });
      }
    }

    // Format subscription data
    const formattedSubscriptions = subscriptions?.map(sub => {
      const usage = usageMap.get(sub.academy_id);
      const totalUsers = userCountMap.get(sub.academy_id) || 0;
      const lastPayment = lastPaymentMap.get(sub.academy_id) || null;

      return {
        id: sub.id,
        academyId: sub.academy_id,
        academyName: sub.academies?.name || 'Unknown Academy',
        tier: sub.plan_tier,
        status: sub.status,
        monthlyAmount: sub.monthly_amount,
        billingCycle: sub.billing_cycle,
        currentPeriodStart: sub.current_period_start,
        currentPeriodEnd: sub.current_period_end,
        nextBillingDate: sub.next_billing_date,
        // Both now come from the latest PAID invoice; null when the academy
        // has never had one, so the UI can show "—" instead of a plan price
        // that was never charged.
        lastPaymentDate: lastPayment?.paidAt ?? sub.last_payment_date ?? null,
        lastPaymentAmount: lastPayment?.amount ?? null,
        autoRenew: sub.auto_renew,
        totalUsers: totalUsers,
        // The stored billing key / customer id live in `billing_key` and
        // `kg_customer_id`; there are no `portone_*` columns on this table.
        paymentMethod: sub.billing_key ? 'Card (PortOne)' : 'Not set',
        portoneCustomerId: sub.kg_customer_id,
        portoneBillingKey: sub.billing_key,
        totalUserLimit: sub.total_user_limit,
        storageLimitGb: sub.storage_limit_gb
      };
    }) || [];

    return NextResponse.json({
      success: true,
      data: {
        subscriptions: formattedSubscriptions,
        metrics,
        pagination: {
          page,
          pageSize,
          total: totalCount || 0,
          totalPages: Math.ceil((totalCount || 0) / pageSize),
        }
      }
    });

  } catch (error) {
    console.error('[Admin Subscriptions API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
