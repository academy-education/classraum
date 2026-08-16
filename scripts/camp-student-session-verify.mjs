#!/usr/bin/env node
/**
 * camp-student-session-verify.mjs — live verification of
 * GET /api/camp/student-session (teacher answer review) against the
 * RUNNING dev server.
 *
 * Uses the accounts + session the last camp-e2e.mjs run left in place
 * (stable passwords, no rotation). The e2e's session answered every
 * question with the key, so the expected shape is fully determined:
 *   - teacher 200, 20 rows, all isCorrect === true
 *   - question parity against the [full-test-v1] cache (same prompts in
 *     the same delivery order, key among the delivered choices)
 *   - answer parity against study_attempts (same student_answer per
 *     position)
 *   - student / linked parent 403, anonymous 401, bogus id 404,
 *     non-camp session 404 (route must not read ordinary sessions)
 *
 * Run: node scripts/camp-student-session-verify.mjs   (after camp-e2e.mjs;
 * the parent check uses the account camp-reports-verify.mjs seeds.)
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'

const BASE = process.env.CAMP_E2E_BASE ?? 'http://localhost:3000'
const ACCOUNTS_FILE =
  '/private/tmp/claude-501/-Users-andylee-Downloads-saas-classraum/93d95221-6d94-4948-9914-9bd6bbc5b2a4/scratchpad/camp-e2e-accounts.txt'
const PARENT_EMAIL = 'camp.parent.test@classraum.com'
const PARENT_PASSWORD = 'CampParent!2026'

const env = {}
for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2]
}
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})
const anon = () => createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
})

const accounts = readFileSync(ACCOUNTS_FILE, 'utf8')
const last = re => { const all = [...accounts.matchAll(re)]; return all.length ? all[all.length - 1] : null }
const teacherLine = last(/teacher: (\S+) \/ (\S+) \(uid (\S+)\)/g)
const studentLine = last(/student: (\S+) \/ (\S+) \(uid (\S+), student_record (\S+)\)/g)
const sessionLine = last(/session: (\S+)/g)
if (!teacherLine || !studentLine || !sessionLine) {
  console.error('FATAL: accounts file missing expected lines — run scripts/camp-e2e.mjs first')
  process.exit(1)
}
const [, TEACHER_EMAIL, TEACHER_PASSWORD] = teacherLine
const [, STUDENT_EMAIL, STUDENT_PASSWORD, STUDENT_UID] = studentLine
const SESSION_ID = sessionLine[1]

const results = []
function record(step, pass, detail) {
  results.push({ step, pass })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${step}${detail ? ` — ${detail}` : ''}`)
}
function die(msg) { console.error('FATAL: ' + msg); finish() }
function finish() {
  console.log(`\n${results.filter(r => r.pass).length}/${results.length} passed`)
  process.exit(results.length > 0 && results.every(r => r.pass) ? 0 : 1)
}

async function api(path, { token } = {}) {
  const res = await fetch(BASE + path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  let json = null
  try { json = await res.json() } catch { /* non-JSON */ }
  return { status: res.status, ok: res.ok, json }
}

async function main() {
  const tAuth = await anon().auth.signInWithPassword({ email: TEACHER_EMAIL, password: TEACHER_PASSWORD })
  if (tAuth.error) return die(`teacher sign-in: ${tAuth.error.message}`)
  const sAuth = await anon().auth.signInWithPassword({ email: STUDENT_EMAIL, password: STUDENT_PASSWORD })
  if (sAuth.error) return die(`student sign-in: ${sAuth.error.message}`)
  const tTok = tAuth.data.session.access_token
  const sTok = sAuth.data.session.access_token

  // ── ground truth straight from the DB ──
  const { data: cacheRows } = await admin.from('study_messages')
    .select('content').eq('session_id', SESSION_ID).like('content', '[full-test-v1]%')
  const cache = cacheRows?.[0]
    ? JSON.parse(cacheRows[0].content.slice('[full-test-v1]'.length))
    : null
  const cachedQuestions = cache?.questions ?? []
  if (cachedQuestions.length === 0) return die('no [full-test-v1] cache for the e2e session')

  const { data: attemptRows } = await admin.from('study_attempts')
    .select('position, student_answer, is_correct, question')
    .eq('session_id', SESSION_ID)
    .order('position', { ascending: true, nullsFirst: false })
    .order('id', { ascending: true })
  if (!attemptRows?.length) return die('no study_attempts for the e2e session')

  // ── S1: teacher gets the full review ──
  const res = await api(`/api/camp/student-session?sessionId=${SESSION_ID}`, { token: tTok })
  record('S1 teacher 200 with session/assignment/rows',
    res.ok && !!res.json?.session && !!res.json?.assignment && Array.isArray(res.json?.rows),
    `status ${res.status}`)
  if (!res.ok) return die('teacher fetch failed')
  const { session, rows } = res.json

  record('S2 session header matches the graded row (20/20, completed)',
    session.correctCount === 20 && session.totalCount === 20 &&
    session.studentId === STUDENT_UID && !!session.completedAt,
    `${session.correctCount}/${session.totalCount}, student ${session.studentId === STUDENT_UID ? 'ok' : 'WRONG'}`)

  // ── S3: question parity against the cache, in delivery order ──
  const promptsMatch = rows.length === cachedQuestions.length &&
    rows.every((r, i) => r.question?.prompt === cachedQuestions[i]?.prompt)
  record('S3 rows mirror the cached questions (count + prompts in order)',
    promptsMatch, `rows=${rows.length}, cache=${cachedQuestions.length}`)

  // Every delivered MC question carries its key among the choices the
  // student saw — what lets the UI mark the key on the real question.
  const keysDelivered = rows
    .filter(r => Array.isArray(r.question?.choices) && r.question.choices.length > 0)
    .every(r => r.question.choices.includes(r.question.correct_answer))
  record('S4 every choice question carries its key among its choices',
    keysDelivered, `mc rows=${rows.filter(r => (r.question?.choices ?? []).length > 0).length}`)

  // ── S5: answer parity against study_attempts ──
  const answersMatch = rows.length === attemptRows.length &&
    rows.every((r, i) =>
      r.studentAnswer === (attemptRows[i].student_answer ?? null) &&
      r.isCorrect === attemptRows[i].is_correct)
  record('S5 studentAnswer/isCorrect match study_attempts row-for-row',
    answersMatch, `attempts=${attemptRows.length}`)
  record('S6 all 20 graded correct (e2e answered with the key)',
    rows.every(r => r.isCorrect === true), '')

  // ── auth negatives ──
  const asStudent = await api(`/api/camp/student-session?sessionId=${SESSION_ID}`, { token: sTok })
  record('S7 student token rejected (403) — keys must not reach students',
    asStudent.status === 403, `status ${asStudent.status}`)

  const pAuth = await anon().auth.signInWithPassword({ email: PARENT_EMAIL, password: PARENT_PASSWORD })
  if (pAuth.error) {
    record('S8 linked parent rejected (403)', false,
      `parent sign-in failed (${pAuth.error.message}) — run camp-reports-verify.mjs once to seed it`)
  } else {
    const asParent = await api(`/api/camp/student-session?sessionId=${SESSION_ID}`, {
      token: pAuth.data.session.access_token,
    })
    record('S8 linked parent rejected (403)', asParent.status === 403, `status ${asParent.status}`)
  }

  const asAnon = await api(`/api/camp/student-session?sessionId=${SESSION_ID}`)
  record('S9 anonymous rejected (401)', asAnon.status === 401, `status ${asAnon.status}`)

  const bogus = await api(`/api/camp/student-session?sessionId=${randomUUID()}`, { token: tTok })
  record('S10 unknown session 404', bogus.status === 404, `status ${bogus.status}`)

  // A session that is NOT a camp session must also read as 404 — the
  // route must never become a generic study-session reader.
  const { data: nonCamp } = await admin.from('study_sessions')
    .select('id')
    .eq('student_id', STUDENT_UID)
    .is('config->campAssignmentId', null)
    .limit(1)
  if (nonCamp?.length) {
    const plain = await api(`/api/camp/student-session?sessionId=${nonCamp[0].id}`, { token: tTok })
    record('S11 non-camp session reads as 404 even for the teacher',
      plain.status === 404, `status ${plain.status}`)
  } else {
    // Seed one throwaway non-camp session to prove the negative.
    const { data: seeded, error: seedErr } = await admin.from('study_sessions')
      .insert({ student_id: STUDENT_UID, mode: 'full_test', status: 'completed', language: 'en' })
      .select('id').single()
    if (seedErr) {
      record('S11 non-camp session reads as 404 even for the teacher', false, `seed failed: ${seedErr.message}`)
    } else {
      const plain = await api(`/api/camp/student-session?sessionId=${seeded.id}`, { token: tTok })
      record('S11 non-camp session reads as 404 even for the teacher',
        plain.status === 404, `status ${plain.status}`)
      await admin.from('study_sessions').delete().eq('id', seeded.id)
    }
  }

  finish()
}

main().catch(e => { console.error(e); finish() })
