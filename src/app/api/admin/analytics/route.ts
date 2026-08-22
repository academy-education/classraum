import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { listAllAuthUsers } from '../_lib/admin-auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Admin analytics.
 *
 * Every number returned here is measured. Where the platform is not
 * instrumented for a metric, the metric is ABSENT from the payload rather
 * than filled in with a plausible-looking constant. Previously this route
 * shipped, among others:
 *
 *   - websiteVisitors = academies * 8.5, trialSignups = academies * 0.85, and
 *     trialConversionRate = (visitors / signups) * 100 — which is
 *     algebraically 8.5/0.85 = exactly 1000.0% on every deployment forever.
 *   - apiResponseTime '245ms', databasePerformance 'Good', errorRate '0.2%',
 *     peakHours '9 AM - 11 AM, 2 PM - 4 PM' — hardcoded strings, no APM.
 *   - monthlyBreakdown = { monthly: total*0.7, annual: total*0.3 } — a guess
 *     rendered under the heading "Revenue breakdown / By billing cycle".
 *   - avgSessionDuration 24.5 and five topFeatures percentages.
 *   - totalSessions = the user count, relabelled as sessions.
 *
 * It also queried a `subscriptions` table and `academies.region` /
 * `academies.city`, none of which exist in this database — those queries
 * errored, the errors were discarded, and the resulting nulls rendered as
 * zeroes and an empty region list. Revenue now comes from
 * `subscription_invoices` (money that was actually collected) and the
 * recurring run-rate from `academy_subscriptions`.
 *
 * Aggregates are computed in SQL (migration 052) so a total is never the sum
 * of one PostgREST page.
 */

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

    // Get time range from query params
    const searchParams = request.nextUrl.searchParams;
    const timeRange = searchParams.get('range') || '30d';

    // Calculate date ranges
    const now = new Date();
    const startDate = new Date();

    switch (timeRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    const windowMs = now.getTime() - startDate.getTime();
    const prevStart = new Date(startDate.getTime() - windowMs);
    const lastYearStart = new Date(startDate);
    lastYearStart.setFullYear(lastYearStart.getFullYear() - 1);
    const lastYearEnd = new Date(now);
    lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1);

    const iso = (d: Date) => d.toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    type RpcRow = Record<string, unknown>;
    const first = <T = RpcRow>(res: { data: unknown }): T | null => {
      const rows = res.data as T[] | null;
      return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    };
    const rows = <T = RpcRow>(res: { data: unknown }): T[] => {
      const r = res.data as T[] | null;
      return Array.isArray(r) ? r : [];
    };
    const num = (v: unknown): number => {
      const n = typeof v === 'number' ? v : Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    const [
      revenueTotals,
      prevRevenueTotals,
      lastYearTotals,
      revenueByMonth,
      revenueByPlan,
      revenueByCycle,
      subMetrics,
      statusCounts,
      sessionStats,
      eventCounts,
      { count: allAcademies },
      { count: newAcademies },
      { count: trialAcademies },
    ] = await Promise.all([
      supabase.rpc('admin_invoice_revenue_totals', { p_start: iso(startDate), p_end: iso(now) }),
      supabase.rpc('admin_invoice_revenue_totals', { p_start: iso(prevStart), p_end: iso(startDate) }),
      supabase.rpc('admin_invoice_revenue_totals', { p_start: iso(lastYearStart), p_end: iso(lastYearEnd) }),
      supabase.rpc('admin_invoice_revenue_by_month', { p_start: iso(startDate), p_end: iso(now) }),
      supabase.rpc('admin_invoice_revenue_by_plan', { p_start: iso(startDate), p_end: iso(now) }),
      supabase.rpc('admin_invoice_revenue_by_cycle', { p_start: iso(startDate), p_end: iso(now) }),
      supabase.rpc('admin_subscription_metrics'),
      supabase.rpc('admin_academy_subscription_status_counts'),
      supabase.rpc('admin_study_session_stats', { p_start: iso(startDate), p_end: iso(now) }),
      supabase.rpc('admin_study_event_counts', { p_start: iso(startDate), p_end: iso(now) }),
      supabase.from('academies').select('*', { count: 'exact', head: true }),
      supabase.from('academies').select('*', { count: 'exact', head: true }).gte('created_at', iso(startDate)),
      // Every academy that has ever been given a trial window. This is a real
      // count of trial starts, not a multiple of the academy count.
      supabase.from('academies').select('*', { count: 'exact', head: true }).not('trial_ends_at', 'is', null),
    ]);

    // ---- Active users (30d) -----------------------------------------------
    //
    // MUST be last_sign_in_at, not users.updated_at.
    //
    // `updated_at` counts any row write, including ones no human caused. The
    // name-migration on 2026-08-20 touched 444 user rows in a single batch,
    // and every one of them then read as "active in the last 30 days" — 419
    // of them, against 48 accounts that had actually signed in. The System
    // page, which has always used last_sign_in_at, said 48 on the same
    // platform on the same day; two pages, one question, an 8.7x gap.
    //
    // last_sign_in_at lives on auth.users, which PostgREST does not expose,
    // so this goes through the paginated admin listing (the same helper the
    // System page uses — one definition, so the two cannot drift again).
    const thirtyDaysAgoMs = Date.parse(thirtyDaysAgo);
    let activeUsers: number | null = null;
    try {
      const authUsers = await listAllAuthUsers();
      activeUsers = authUsers.filter(u => {
        if (!u.last_sign_in_at) return false;
        const t = Date.parse(u.last_sign_in_at);
        return Number.isFinite(t) && t >= thirtyDaysAgoMs;
      }).length;
    } catch (e) {
      // Absent, not zero — a failed lookup must not read as "nobody is
      // using the platform".
      console.error('[Admin Analytics API] listAllAuthUsers failed:', e);
    }

    // ---- Revenue: collected (paid invoices) in the selected window ---------
    const collected = num(first(revenueTotals)?.amount_won);
    const previousCollected = num(first(prevRevenueTotals)?.amount_won);
    const lastYearCollected = num(first(lastYearTotals)?.amount_won);

    // Growth is null (not 0, not Infinity) when there is no baseline to grow
    // from — the UI omits the figure instead of printing "+0%" or "+Infinity%".
    const pctChange = (current: number, base: number): number | null =>
      base > 0 ? Number((((current - base) / base) * 100).toFixed(1)) : null;

    const trend = rows(revenueByMonth).map(r => ({
      year: num(r.year),
      monthIndex: num(r.month_index),
      amount: num(r.amount_won),
    }));

    const byPlan = rows(revenueByPlan).map(r => ({
      plan: String(r.plan_tier ?? 'unknown'),
      amount: num(r.amount_won),
      percentage: collected > 0 ? Number(((num(r.amount_won) / collected) * 100).toFixed(1)) : 0,
    }));

    // Real monthly/annual split, straight off each invoice's billing_cycle.
    const cycleRows = rows(revenueByCycle);
    const byBillingCycle = {
      monthly: cycleRows.filter(r => r.billing_cycle !== 'annual').reduce((s, r) => s + num(r.amount_won), 0),
      annual: cycleRows.filter(r => r.billing_cycle === 'annual').reduce((s, r) => s + num(r.amount_won), 0),
    };

    // ---- Recurring run-rate (MRR/ARR/ARPU) --------------------------------
    // MRR is the sum of monthly_amount over subscriptions that are currently
    // billing — NOT the sum of everything booked inside the selected window.
    // The old MRR card showed the window total, so picking "Last 12 months"
    // displayed a year of bookings as MRR and then multiplied it by 12 for ARR.
    const m = first(subMetrics);
    const mrr = num(m?.mrr_won);
    const payingSubscriptions = num(m?.active_count) + num(m?.trialing_count);
    const recurring = {
      mrr,
      arr: mrr * 12,
      arpu: payingSubscriptions > 0 ? Math.round(mrr / payingSubscriptions) : 0,
      payingSubscriptions,
    };

    // "past_due" → "Past due" (the old title-caser left the underscore in).
    const byStatus = rows(statusCounts).map(r => ({
      status: String(r.status ?? 'unknown')
        .replace(/_/g, ' ')
        .replace(/^./, c => c.toUpperCase()),
      count: num(r.cnt),
    }));

    // ---- Acquisition ------------------------------------------------------
    // websiteVisitors is gone: nothing on the platform records them, and the
    // previous value was the academy count times 8.5.
    const trialSignups = trialAcademies || 0;
    const paidConversions = num(m?.active_count);
    const acquisition = {
      trialSignups,
      paidConversions,
      paidConversionRate: trialSignups > 0
        ? Number(((paidConversions / trialSignups) * 100).toFixed(1))
        : null,
    };

    // ---- Usage ------------------------------------------------------------
    // Sessions are real study sessions in the window; duration is the measured
    // created_at → completed_at mean over sessions that actually completed, and
    // is null when nothing completed.
    const s = first(sessionStats);
    const avgSessionDuration = s?.avg_duration_minutes == null
      ? null
      : Number(num(s.avg_duration_minutes).toFixed(1));

    const eventRows = rows(eventCounts);
    const totalEvents = eventRows.reduce((sum, r) => sum + num(r.cnt), 0);
    const topEvents = eventRows.slice(0, 5).map(r => ({
      event: String(r.event ?? 'unknown'),
      count: num(r.cnt),
      share: totalEvents > 0 ? Number(((num(r.cnt) / totalEvents) * 100).toFixed(1)) : 0,
    }));

    const analyticsData = {
      revenue: {
        // Collected revenue: paid invoices whose paid_at falls in the window.
        collected,
        growth: pctChange(collected, previousCollected),
        yearOverYearGrowth: pctChange(collected, lastYearCollected),
        byPlan: byPlan.slice(0, 5),
        trend,
        byBillingCycle,
        recurring,
      },
      customers: {
        total: allAcademies || 0,
        new: newAcademies || 0,
        churn: num(m?.canceled_30d),
        byStatus,
        acquisition,
      },
      usage: {
        activeUsers,
        studySessions: num(s?.session_count),
        completedStudySessions: num(s?.completed_count),
        avgSessionDuration,
        topEvents,
      },
    };

    return NextResponse.json({
      success: true,
      data: analyticsData
    });

  } catch (error: any) {
    console.error('[Admin Analytics API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}
