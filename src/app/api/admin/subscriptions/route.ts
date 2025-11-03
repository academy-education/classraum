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

    // Fetch all subscriptions with academy and usage data
    const { data: subscriptions, error: subsError } = await supabase
      .from('academy_subscriptions')
      .select(`
        *,
        academies!inner(
          id,
          name
        )
      `)
      .order('created_at', { ascending: false });

    if (subsError) {
      console.error('[Admin Subscriptions API] Error fetching subscriptions:', subsError);
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      );
    }

    // Fetch usage data for all academies
    const { data: usageData, error: usageError } = await supabase
      .from('subscription_usage')
      .select('*');

    if (usageError) {
      console.error('[Admin Subscriptions API] Error fetching usage:', usageError);
    }

    // Create usage map
    const usageMap = new Map(usageData?.map(u => [u.academy_id, u]) || []);

    // Fetch actual user counts from role-specific tables (managers, teachers, students, parents)
    // since academy_id is stored in those tables, not the users table
    const [
      { data: managers },
      { data: teachers },
      { data: students },
      { data: parents }
    ] = await Promise.all([
      supabase.from('managers').select('academy_id'),
      supabase.from('teachers').select('academy_id'),
      supabase.from('students').select('academy_id'),
      supabase.from('parents').select('academy_id')
    ]);

    // Create user count map by academy
    const userCountMap = new Map();

    [managers, teachers, students, parents].forEach(roleUsers => {
      roleUsers?.forEach(user => {
        if (!user.academy_id) return;

        if (!userCountMap.has(user.academy_id)) {
          userCountMap.set(user.academy_id, 0);
        }

        userCountMap.set(user.academy_id, userCountMap.get(user.academy_id) + 1);
      });
    });

    console.log('[Admin Subscriptions API] User counts by academy:', Object.fromEntries(userCountMap));

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
        metrics
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
