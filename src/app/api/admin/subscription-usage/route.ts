import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

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

    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

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

    // Read the LIVE per-academy view, not subscription_usage.
    //
    // subscription_usage is a snapshot table nothing populates — zero rows
    // for every academy on 2026-07-27, while the platform had 173 active
    // students, 8 teachers and 55 classrooms across 10 academies. This page
    // therefore reported 0 for everything: not an empty state, a wrong
    // answer on the screen you'd use to spot an academy about to breach its
    // limits. admin_academy_usage (migration 061) counts live and keeps the
    // same column names, so the response shape below is unchanged.
    //
    // Ordering is by academy name: `calculated_at` is now() for every row
    // once it is computed live, so sorting on it is meaningless.
    // Restrict the list to academies that HAVE a subscription. This page
    // measures usage against plan limits, and the table renderer skips any
    // row with no subscription — so listing all academies made the footer
    // claim "1–10 of 10" while only the 2 subscribed ones rendered.
    // Counting what we don't show is worse than not counting it.
    const { data: subscribedRows, error: subscribedError } = await supabase
      .from('academy_subscriptions')
      .select('academy_id');
    if (subscribedError) {
      console.error('[Subscription Usage API] Error listing subscribed academies:', subscribedError);
      throw subscribedError;
    }
    const subscribedIds = (subscribedRows ?? [])
      .map(r => r.academy_id)
      .filter((id): id is string => id !== null);

    const { data: usageRows, error: usageError, count } = await supabase
      .from('admin_academy_usage')
      .select('*', { count: 'exact' })
      .in('academy_id', subscribedIds)
      .order('academy_name', { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (usageError) {
      console.error('[Subscription Usage API] Error:', usageError);
      throw usageError;
    }

    // The view carries the academy columns flat; the UI expects them nested
    // under `academies` (previously a PostgREST FK embed, which a view has
    // no foreign key to provide).
    const usageData = (usageRows ?? []).map(row => ({
      ...row,
      academies: {
        id: row.academy_id,
        name: row.academy_name,
        subscription_tier: row.subscription_tier,
      },
    }));

    // Fetch subscription data separately and merge
    if (usageData && usageData.length > 0) {
      // academy_id is nullable on the view (every view column is), but it is
      // the academies PK so it can never actually be null — filter rather
      // than assert, so a surprise null narrows the lookup instead of
      // throwing.
      const academyIds = usageData
        .map(u => u.academy_id)
        .filter((id): id is string => id !== null);
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
