import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user is an admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userDataError || !userData || !['admin', 'super_admin'].includes(userData.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '0');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');

    // Fetch subscription usage with academy info
    const { data: usageData, error: usageError, count } = await supabase
      .from('subscription_usage')
      .select(`
        *,
        academies!subscription_usage_academy_id_fkey(
          id,
          name,
          subscription_tier
        )
      `, { count: 'exact' })
      .order('calculated_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (usageError) {
      console.error('[Subscription Usage API] Error:', usageError);
      throw usageError;
    }

    // Fetch subscription data separately and merge
    if (usageData && usageData.length > 0) {
      const academyIds = usageData.map(u => u.academy_id);
      const { data: subscriptions } = await supabase
        .from('academy_subscriptions')
        .select('*')
        .in('academy_id', academyIds);

      // Merge subscription data with usage data
      if (subscriptions) {
        usageData.forEach((usage: any) => {
          usage.academy_subscriptions = subscriptions.find(
            (sub: any) => sub.academy_id === usage.academy_id
          );
        });
      }
    }

    // Platform-wide statistics.
    //
    // All three of these used to be derived from the current 50-row page:
    //   - total_usage summed the page and was rendered as the platform total
    //   - approaching_limits scanned only the page, so an academy at 99% of
    //     its student limit was invisible unless it happened to land on page 1
    //     (and a zero limit produced a division by zero → Infinity)
    //   - total_academies was the subscription_usage row count, which is a
    //     count of usage snapshots, not of academies
    // They are now aggregated in SQL over every row (migration 052).
    const [
      { data: totalsRows, error: totalsError },
      { data: limitRows, error: limitsError },
    ] = await Promise.all([
      supabase.rpc('admin_subscription_usage_totals'),
      supabase.rpc('admin_subscription_usage_approaching_limits', { p_threshold: 0.8 }),
    ]);

    if (totalsError) {
      console.error('[Subscription Usage API] Error fetching totals:', totalsError);
      throw totalsError;
    }
    if (limitsError) {
      console.error('[Subscription Usage API] Error fetching limit warnings:', limitsError);
      throw limitsError;
    }

    const toNum = (v: unknown) => {
      const n = typeof v === 'number' ? v : Number(v);
      return Number.isFinite(n) ? n : 0;
    };
    const totals = Array.isArray(totalsRows) && totalsRows.length > 0 ? totalsRows[0] : null;

    const totalUsage = {
      students: toNum(totals?.students),
      teachers: toNum(totals?.teachers),
      storage: toNum(totals?.storage_gb),
      classrooms: toNum(totals?.classrooms),
    };

    const approaching_limits = (Array.isArray(limitRows) ? limitRows : []).map((r: any) => ({
      academy_id: r.academy_id,
      academy_name: r.academy_name,
      // Kept as strings with one decimal for backward compatibility with the UI.
      student_usage: toNum(r.student_usage).toFixed(1),
      teacher_usage: toNum(r.teacher_usage).toFixed(1),
      storage_usage: toNum(r.storage_usage).toFixed(1),
    }));

    return NextResponse.json({
      success: true,
      data: usageData || [],
      statistics: {
        total_usage: totalUsage,
        approaching_limits,
        // Distinct academies that have a usage snapshot — not the snapshot count.
        total_academies: toNum(totals?.academies)
      },
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize)
      }
    });

  } catch (error: any) {
    console.error('[Subscription Usage API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch subscription usage' },
      { status: 500 }
    );
  }
}
