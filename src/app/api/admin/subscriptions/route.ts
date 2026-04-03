import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

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

    const supabase = createClient(
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

    // Parse pagination params
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '0');
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '500'), 1000);
    const from = page * pageSize;
    const to = from + pageSize - 1;

    // Fetch paginated subscriptions with academy data and total count
    const { data: subscriptions, error: subsError, count: totalCount } = await supabase
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
      supabase
        .from('subscription_usage')
        .select('*')
        .in('academy_id', academyIds),
      supabase.from('managers').select('*', { count: 'exact', head: true }).in('academy_id', academyIds),
      supabase.from('teachers').select('*', { count: 'exact', head: true }).in('academy_id', academyIds),
      supabase.from('students').select('*', { count: 'exact', head: true }).in('academy_id', academyIds),
      supabase.from('parents').select('*', { count: 'exact', head: true }).in('academy_id', academyIds),
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
      supabase.from('managers').select('academy_id').in('academy_id', academyIds),
      supabase.from('teachers').select('academy_id').in('academy_id', academyIds),
      supabase.from('students').select('academy_id').in('academy_id', academyIds),
      supabase.from('parents').select('academy_id').in('academy_id', academyIds),
    ]);

    // Create user count map by academy
    const userCountMap = new Map<string, number>();

    [managersPerAcademy, teachersPerAcademy, studentsPerAcademy, parentsPerAcademy].forEach(roleUsers => {
      roleUsers?.forEach((user: { academy_id: string }) => {
        if (!user.academy_id) return;
        userCountMap.set(user.academy_id, (userCountMap.get(user.academy_id) || 0) + 1);
      });
    });

    // Fetch revenue metrics
    const activeSubscriptions = subscriptions?.filter(s => s.status === 'active' || s.status === 'trialing') || [];
    const totalMRR = activeSubscriptions.reduce((sum, sub) => sum + (sub.monthly_amount || 0), 0);
    const totalARR = totalMRR * 12;

    // Calculate churn (simplified - would need historical data for accurate calculation)
    const canceledThisMonth = subscriptions?.filter(s =>
      s.status === 'canceled' &&
      new Date(s.updated_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length || 0;

    const newThisMonth = subscriptions?.filter(s =>
      new Date(s.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length || 0;

    const totalSubscriptions = subscriptions?.length || 1;
    const churnRate = (canceledThisMonth / totalSubscriptions) * 100;

    const metrics = {
      totalMRR,
      totalARR,
      growth: 0, // Would need historical data
      churnRate: Math.round(churnRate * 10) / 10,
      newSubscriptions: newThisMonth,
      canceledSubscriptions: canceledThisMonth
    };

    // Format subscription data
    const formattedSubscriptions = subscriptions?.map(sub => {
      const usage = usageMap.get(sub.academy_id);
      const totalUsers = userCountMap.get(sub.academy_id) || 0;

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
        lastPaymentDate: sub.last_payment_date,
        lastPaymentAmount: sub.monthly_amount, // Could fetch from invoices
        autoRenew: sub.auto_renew,
        totalUsers: totalUsers,
        paymentMethod: sub.portone_billing_key ? 'Card (PortOne)' : 'Not set',
        portoneCustomerId: sub.portone_customer_id,
        portoneBillingKey: sub.portone_billing_key,
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
