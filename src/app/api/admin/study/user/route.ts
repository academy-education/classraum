import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { dbAdmin } from '@/lib/supabase-admin';
import { requireAdminAuth, logAdminActivity } from '@/lib/admin-auth';

/**
 * GET /api/admin/study/user
 *   ?list=all   → the FULL study user directory (every student), for the
 *                 lookup tab. Filtering/ranking happens client-side; this
 *                 route pages past the PostgREST 1000-row cap so nothing is
 *                 silently truncated.
 *   ?id=<uuid>  → full study profile for one student (support lookup)
 *
 * PATCH /api/admin/study/user   { studentId, isTestUser }
 *   → mark/unmark a student as a TEST USER (study_user_prefs.is_test_user).
 *     Display-only flag for now — not wired into analytics exclusion.
 *
 * Admin-only (super_admin or admin). Every detail lookup is written to
 * admin_activity_logs — study data is minors' academic + billing info, so
 * access is audited. Reads go through the service-role client only.
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * Read past the PostgREST 1000-row cap: keep requesting CHUNK-sized ranges
 * until a short page arrives. Never trust a single .select() to be the whole
 * table (see CLAUDE.md: a verifier once read a bank truncated at 1000 rows).
 */
const CHUNK = 1000;
async function fetchAllPages<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += CHUNK) {
    const { data, error } = await page(from, from + CHUNK - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < CHUNK) break;
  }
  return out;
}

export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.success) return auth.response;

  const id = req.nextUrl.searchParams.get('id')?.trim();
  const list = req.nextUrl.searchParams.get('list');

  // ── Directory mode: every study user ───────────────────────────
  if (!id) {
    if (list !== 'all') return NextResponse.json({ error: 'list=all or id required' }, { status: 400 });
    try {
      const [students, prefs, activity] = await Promise.all([
        fetchAllPages((from, to) => dbAdmin
          .from('users')
          .select('id, name, email, role, created_at')
          .eq('role', 'student')
          .order('id')
          .range(from, to)),
        fetchAllPages((from, to) => dbAdmin
          .from('study_user_prefs')
          .select('student_id, nickname, is_test_user, updated_at')
          .order('student_id')
          .range(from, to)),
        fetchAllPages((from, to) => dbAdmin
          .rpc('admin_study_last_activity')
          .order('student_id')
          .range(from, to)),
      ]);

      const prefMap = new Map(prefs.map(p => [p.student_id, p]));
      const activeMap = new Map(activity.map(a => [a.student_id, a.last_active]));

      const users = students.map(u => {
        const p = prefMap.get(u.id);
        return {
          id: u.id,
          name: u.name ?? null,
          email: u.email ?? null,
          role: u.role,
          nickname: p?.nickname ?? null,
          isTestUser: p?.is_test_user ?? false,
          // Best available recency signal: last session heartbeat, else the
          // last prefs write, else account creation.
          lastActiveAt: activeMap.get(u.id) ?? p?.updated_at ?? u.created_at ?? null,
        };
      });
      return NextResponse.json({ users, total: users.length });
    } catch (e) {
      console.error('[admin/study/user] directory', e);
      return NextResponse.json({ error: 'directory failed' }, { status: 500 });
    }
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
    dbAdmin.from('users').select('id, name, email, role, created_at').eq('id', id).maybeSingle(),
    dbAdmin.from('study_subscriptions')
      .select('status, plan, currency, grant_credits_remaining, purchased_credits_remaining, current_period_end, cancel_at_period_end, last_payment_failure, pending_plan')
      .eq('student_id', id).maybeSingle(),
    dbAdmin.from('study_credit_ledger')
      .select('delta, bucket, kind, note, created_at')
      .eq('student_id', id).order('created_at', { ascending: false }).limit(10),
    // Full prefs row — the admin detail groups these into Profile / Goals /
    // Study settings, so fetch everything the student set rather than just
    // the nickname + targets.
    dbAdmin.from('study_user_prefs')
      .select('nickname, nickname_changed, grade_level, target_test, target_tests, goal_score, goal_scores, test_date, daily_goal_minutes, default_language, default_difficulty, onboarded_at, is_test_user')
      .eq('student_id', id).maybeSingle(),
    dbAdmin.from('study_streak_state')
      .select('max_streak, freezes, protected_days, updated_at').eq('student_id', id).maybeSingle(),
    // study_attempts links to a student via session_id (no student_id
    // column), so pull the student's session ids and count attempts within.
    dbAdmin.from('study_sessions').select('id').eq('student_id', id),
    dbAdmin.from('study_league_memberships')
      .select('xp_this_week, final_rank, promotion_event, league:study_leagues!inner(tier, week_start)')
      .eq('student_id', id).order('id', { ascending: false }).limit(4),
    dbAdmin.from('study_question_reports')
      .select('id, reason, status, created_at').eq('student_id', id).order('created_at', { ascending: false }).limit(5),
  ]);

  if (!user) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const sessionIds = (sessions ?? []).map(s => s.id as string);
  const sessionCount = sessionIds.length;
  let attemptCount = 0;
  if (sessionIds.length > 0) {
    const { count } = await dbAdmin
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
    isTestUser: prefs?.is_test_user ?? false,
  });
}

/* ── Test-user flag ─────────────────────────────────────────────── */

const FlagSchema = z.object({
  studentId: z.string().uuid(),
  isTestUser: z.boolean(),
});

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.success) return auth.response;

  const parsed = FlagSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'bad body' }, { status: 400 });
  const { studentId, isTestUser } = parsed.data;

  const { data: user } = await dbAdmin
    .from('users').select('id, email').eq('id', studentId).maybeSingle();
  if (!user) return NextResponse.json({ error: 'user not found' }, { status: 404 });

  // Upsert: a student who never opened study mode has no prefs row yet; the
  // flag must still stick. onConflict student_id makes repeat toggles safe.
  const { error } = await dbAdmin
    .from('study_user_prefs')
    .upsert(
      { student_id: studentId, is_test_user: isTestUser, updated_at: new Date().toISOString() },
      { onConflict: 'student_id' },
    );
  if (error) {
    console.error('[admin/study/user] test flag', error);
    return NextResponse.json({ error: 'update failed' }, { status: 500 });
  }

  await logAdminActivity({
    adminUserId: auth.user.id,
    action: 'STUDY_TEST_USER_FLAG',
    description: `${isTestUser ? 'Marked' : 'Unmarked'} ${user.email} as study test user`,
    targetType: 'user',
    targetId: studentId,
  });

  return NextResponse.json({ ok: true, isTestUser });
}
