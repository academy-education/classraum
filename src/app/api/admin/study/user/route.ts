import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminAuth, logAdminActivity } from '@/lib/admin-auth';

/**
 * GET /api/admin/study/user
 *   ?q=<text>   → search students by name/email (max 15), for the picker
 *   ?id=<uuid>  → full study profile for one student (support lookup)
 *
 * Admin-only (super_admin or admin). Every detail lookup is written to
 * admin_activity_logs — study data is minors' academic + billing info, so
 * access is audited. Reads go through the service-role client only.
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.success) return auth.response;

  const q = req.nextUrl.searchParams.get('q')?.trim();
  const id = req.nextUrl.searchParams.get('id')?.trim();

  // ── Search mode ────────────────────────────────────────────────
  if (!id) {
    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] });
    }
    const pattern = `%${q.replace(/[%_]/g, '')}%`;
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, name, email, role')
      .or(`name.ilike.${pattern},email.ilike.${pattern}`)
      .limit(15);
    if (error) {
      console.error('[admin/study/user] search', error);
      return NextResponse.json({ error: 'search failed' }, { status: 500 });
    }
    return NextResponse.json({ results: data ?? [] });
  }

  // ── Detail mode ────────────────────────────────────────────────
  const [
    { data: user },
    { data: sub },
    { data: ledger },
    { data: prefs },
    { data: streak },
    { data: sessions },
    { data: memberships },
    { data: reports },
  ] = await Promise.all([
    supabaseAdmin.from('users').select('id, name, email, role, created_at').eq('id', id).maybeSingle(),
    supabaseAdmin.from('study_subscriptions')
      .select('status, plan, currency, grant_credits_remaining, purchased_credits_remaining, current_period_end, cancel_at_period_end, last_payment_failure, pending_plan')
      .eq('student_id', id).maybeSingle(),
    supabaseAdmin.from('study_credit_ledger')
      .select('delta, bucket, kind, note, created_at')
      .eq('student_id', id).order('created_at', { ascending: false }).limit(10),
    supabaseAdmin.from('study_user_prefs')
      .select('nickname, target_test, target_tests').eq('student_id', id).maybeSingle(),
    supabaseAdmin.from('study_streak_state')
      .select('max_streak, freezes, protected_days, updated_at').eq('student_id', id).maybeSingle(),
    // study_attempts links to a student via session_id (no student_id
    // column), so pull the student's session ids and count attempts within.
    supabaseAdmin.from('study_sessions').select('id').eq('student_id', id),
    supabaseAdmin.from('study_league_memberships')
      .select('xp_this_week, final_rank, promotion_event, league:study_leagues!inner(tier, week_start)')
      .eq('student_id', id).order('id', { ascending: false }).limit(4),
    supabaseAdmin.from('study_question_reports')
      .select('id, reason, status, created_at').eq('student_id', id).order('created_at', { ascending: false }).limit(5),
  ]);

  if (!user) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const sessionIds = (sessions ?? []).map(s => s.id as string);
  const sessionCount = sessionIds.length;
  let attemptCount = 0;
  if (sessionIds.length > 0) {
    const { count } = await supabaseAdmin
      .from('study_attempts').select('id', { count: 'exact', head: true })
      .in('session_id', sessionIds);
    attemptCount = count ?? 0;
  }

  await logAdminActivity({
    adminUserId: auth.user.id,
    action: 'STUDY_USER_LOOKUP',
    description: `Viewed study profile for ${user.email}`,
    targetType: 'user',
    targetId: id,
  });

  const grant = (sub?.grant_credits_remaining as number | undefined) ?? 0;
  const purchased = (sub?.purchased_credits_remaining as number | undefined) ?? 0;

  return NextResponse.json({
    user,
    subscription: sub
      ? { ...sub, creditsTotal: grant + purchased }
      : null,
    prefs: prefs ?? null,
    streak: streak ?? null,
    counts: { sessions: sessionCount ?? 0, attempts: attemptCount ?? 0 },
    memberships: memberships ?? [],
    ledger: ledger ?? [],
    reports: reports ?? [],
  });
}
