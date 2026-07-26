import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendPushNotification } from '@/lib/notifications'
import type { NotificationInsert } from '@/lib/notification-types'

/**
 * Terminal-state transitions for a background full-test generation.
 *
 * WHY THIS MODULE EXISTS
 * ----------------------
 * Two entirely separate processes can decide that a generation is over:
 *
 *   1. the generator itself (`/api/study/test/generate`), on the happy path;
 *   2. the out-of-band reaper (`/api/cron/study-reap-stuck-generations`),
 *      when the invocation was KILLED (Vercel maxDuration / OOM / deploy)
 *      and no `finally` ever ran in that process.
 *
 * Those two used to each write `generation_status` by hand, and only the
 * generator also notified the student. Result: a student whose generation
 * was killed by a timeout got a perfectly usable test sitting silently in
 * the DB with no inbox row and no push — indistinguishable from a hang.
 *
 * "Set the status" and "tell the student" are now a SINGLE exported
 * operation, so the two call sites physically cannot drift again: there is
 * no code path in either that writes the terminal status without going
 * through here.
 */

/** Same marker the generate route and the reaper use for the cache row. */
const CACHED_TEST_MARKER = '[full-test-v1]'

type Lang = 'en' | 'ko'

/**
 * Insert one inbox row, LOGGING failures.
 *
 * supabase-js `.insert()` resolves with `{ error }` — it does NOT throw. A
 * `try/catch` around it therefore catches nothing, which is exactly how a
 * CHECK-constraint rejection on `notifications.type` stayed invisible since
 * launch. Always read `error`.
 */
async function insertInboxRow(row: NotificationInsert, tag: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin.from('notifications').insert(row)
    if (error) {
      console.error(`[${tag}] inbox insert REJECTED`, {
        userId: row.user_id,
        type: row.type,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })
      return false
    }
    return true
  } catch (err) {
    // Only network/transport faults reach here.
    console.error(`[${tag}] inbox insert threw`, err)
    return false
  }
}

/** Best-effort title of the generated test, read back from the cache row.
 *  The reaper never held the payload in memory, so it can't pass one. */
async function readCachedTestTitle(sessionId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('study_messages')
    .select('content')
    .eq('session_id', sessionId)
    .eq('role', 'assistant')
    .ilike('content', `${CACHED_TEST_MARKER}%`)
    .limit(1)
  if (error || !data || data.length === 0) return null
  try {
    const parsed = JSON.parse(String(data[0].content).slice(CACHED_TEST_MARKER.length)) as { title?: string }
    return typeof parsed.title === 'string' && parsed.title ? parsed.title : null
  } catch {
    return null
  }
}

/**
 * Flip a session to `generation_status: 'ready'` AND tell the student.
 *
 * The ONLY sanctioned way to mark a full-test generation complete. Used by
 * both the generator's happy path and the reaper's recovery path.
 *
 * Notification delivery is best-effort (the test is already cached, so a
 * failed notification must not fail the run) but is never silent.
 */
export async function markTestReadyAndNotify({
  userId,
  sessionId,
  testTitle,
  lang = 'en',
}: {
  userId: string
  sessionId: string
  /** Omit when the caller doesn't hold the payload (the reaper) — it is
   *  then read back from the cached test row. */
  testTitle?: string
  lang?: Lang
}): Promise<void> {
  const { error: statusErr } = await supabaseAdmin
    .from('study_sessions')
    .update({ generation_status: 'ready' })
    .eq('id', sessionId)
  if (statusErr) {
    console.error('[study/test-ready] status write failed', sessionId, statusErr)
  }

  const resolvedTitle = testTitle ?? (await readCachedTestTitle(sessionId)) ?? (lang === 'ko' ? '연습 시험' : 'Your practice test')
  const title = lang === 'ko' ? '시험 준비 완료' : 'Your test is ready'
  const message = lang === 'ko'
    ? `${resolvedTitle} — 탭하여 시작하세요.`
    : `${resolvedTitle} — tap to start.`

  await insertInboxRow({
    user_id: userId,
    title_key: 'notifications.studyTestReady.title',
    message_key: 'notifications.studyTestReady.message',
    title_params: {},
    message_params: { testTitle: resolvedTitle },
    title,
    message,
    type: 'system',
    navigation_data: {
      page: 'study-session',
      filters: { sessionId },
    },
    is_read: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, 'study/test-ready')

  try {
    await sendPushNotification([userId], title, message, {
      type: 'system',
      page: 'study-session',
      sessionId,
    })
  } catch (err) {
    console.error('[study/test-ready] push send failed', err)
  }
}

/**
 * Tell the student a generation died and their credit was returned.
 *
 * The reaper already fails the row and refunds; without this the student
 * only ever learns about it by reopening the app and noticing the spinner
 * turned into a retry button. Credit/refund logic lives in the reaper —
 * this function only reports what already happened.
 */
export async function notifyTestGenerationFailed({
  userId,
  sessionId,
  refundedCredits,
  lang = 'en',
}: {
  userId: string
  sessionId: string
  /** Credits actually returned to the student (0 when the refund no-oped). */
  refundedCredits: number
  lang?: Lang
}): Promise<void> {
  const title = lang === 'ko' ? '시험 생성 실패' : 'Test generation failed'
  const message = lang === 'ko'
    ? `시험을 만들지 못했습니다. 크레딧 ${refundedCredits}개를 돌려드렸습니다. 다시 시도해 주세요.`
    : `We couldn't build your test. ${refundedCredits} credit(s) have been returned — please try again.`

  await insertInboxRow({
    user_id: userId,
    title_key: 'notifications.studyTestFailed.title',
    message_key: 'notifications.studyTestFailed.message',
    title_params: {},
    message_params: { credits: refundedCredits },
    title,
    message,
    type: 'system',
    navigation_data: {
      page: 'study-session',
      filters: { sessionId },
    },
    is_read: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, 'study/test-failed')

  try {
    await sendPushNotification([userId], title, message, {
      type: 'system',
      page: 'study-session',
      sessionId,
    })
  } catch (err) {
    console.error('[study/test-failed] push send failed', err)
  }
}
