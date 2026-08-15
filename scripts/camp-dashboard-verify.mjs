#!/usr/bin/env node
/**
 * camp-dashboard-verify.mjs — live verification of Camp P2
 * (GET /api/camp/dashboard) against the RUNNING dev server, using the
 * data the last camp-e2e.mjs run left in place:
 *   - academy "E2E Camp Test Academy"
 *   - classroom + program from the latest run recorded in the
 *     scratchpad accounts file
 *   - one COMPLETED 20/20 session by camp.student.test@classraum.com
 *     on the "E2E set" assignment, plus the un-started "E2E race A"
 *
 * Steps:
 *   1. sign in as the teacher (password from the accounts file)
 *   2. create a SECOND assignment (count 10) via the real builder API so
 *      the dashboard must show mixed per-assignment states — or, if the
 *      quota is already spent by a previous verify run, reuse the
 *      un-started assignment that run created
 *   3. GET /api/camp/dashboard?classroomId=… and assert per-student
 *      status, completion %, domain accuracy, and skills-to-review
 *   4. negative: the student's token must get 403
 *
 * No service-role writes to camp tables; everything goes through the
 * HTTP APIs like a real teacher. Run: node scripts/camp-dashboard-verify.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const BASE = process.env.CAMP_E2E_BASE ?? 'http://localhost:3000'
const ACCOUNTS_FILE =
  '/private/tmp/claude-501/-Users-andylee-Downloads-saas-classraum/93d95221-6d94-4948-9914-9bd6bbc5b2a4/scratchpad/camp-e2e-accounts.txt'

const env = {}
for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2]
}
const anon = () => createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
})

// ── latest run's credentials + ids from the accounts file ──
const accounts = readFileSync(ACCOUNTS_FILE, 'utf8')
const last = re => { const all = [...accounts.matchAll(re)]; return all.length ? all[all.length - 1] : null }
const teacherLine = last(/teacher: (\S+) \/ (\S+) /g)
const studentLine = last(/student: (\S+) \/ (\S+) /g)
const classroomLine = last(/classroom: (\S+)/g)
const doneAssignmentLine = last(/assignment: (\S+) \(E2E set\)/g)
if (!teacherLine || !studentLine || !classroomLine || !doneAssignmentLine) {
  console.error('FATAL: accounts file missing expected lines — run scripts/camp-e2e.mjs first')
  process.exit(1)
}
const [, TEACHER_EMAIL, TEACHER_PASSWORD] = teacherLine
const [, STUDENT_EMAIL, STUDENT_PASSWORD] = studentLine
const CLASSROOM_ID = classroomLine[1]
const DONE_ASSIGNMENT_ID = doneAssignmentLine[1]

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

async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
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

  // ── 1. second assignment so the dashboard shows mixed states ──
  const create = await api('/api/camp/assignments', {
    method: 'POST', token: tTok,
    body: { classroomId: CLASSROOM_ID, title: 'P2 dashboard set', section: 'math', count: 10 },
  })
  let newAssignmentId = create.json?.assignment?.id ?? null
  if (create.ok && newAssignmentId) {
    record('D1 second assignment created (10q, un-started)', true, `id ${newAssignmentId}`)
  } else if (create.status === 402 && create.json?.code === 'quota_exceeded') {
    // A previous verify run already spent the quota; its un-started
    // assignment still serves the mixed-state purpose.
    const list = await api(`/api/camp/assignments?classroomId=${CLASSROOM_ID}`, { token: tTok })
    const reuse = (list.json?.assignments ?? []).find(a => a.title === 'P2 dashboard set')
    newAssignmentId = reuse?.id ?? null
    record('D1 second assignment (reused from prior verify run — quota spent)',
      !!newAssignmentId, `id ${newAssignmentId ?? 'MISSING'}`)
  } else {
    record('D1 second assignment created', false, `status ${create.status}: ${JSON.stringify(create.json)}`)
  }
  if (!newAssignmentId) return die('no second assignment; dashboard would be trivial')

  // ── 2. the dashboard itself ──
  const dash = await api(`/api/camp/dashboard?classroomId=${CLASSROOM_ID}`, { token: tTok })
  record('D2 dashboard returns 200', dash.ok, `status ${dash.status}`)
  if (!dash.ok) return die('dashboard failed')
  const d = dash.json

  const student = (d.roster ?? []).find(r => r.email === STUDENT_EMAIL)
  record('D3 roster contains the enrolled student with a name',
    !!student && !!student.name, `roster n=${d.roster?.length}, name=${student?.name ?? '-'}`)

  const doneA = (d.assignments ?? []).find(a => a.id === DONE_ASSIGNMENT_ID)
  const doneStatus = doneA?.students?.find(s => s.studentId === student?.studentId)
  record('D4 completed assignment: student done with 20/20',
    doneStatus?.state === 'done' && doneStatus?.correctCount === 20 && doneStatus?.totalCount === 20,
    `state=${doneStatus?.state}, score=${doneStatus?.correctCount}/${doneStatus?.totalCount}`)
  record('D5 completed assignment: completion 100%',
    doneA?.completion?.pct === 100 && doneA?.completion?.done === 1 &&
    doneA?.completion?.total === (d.roster?.length ?? 0),
    `pct=${doneA?.completion?.pct}, done=${doneA?.completion?.done}/${doneA?.completion?.total}`)

  const newA = (d.assignments ?? []).find(a => a.id === newAssignmentId)
  const newStatus = newA?.students?.find(s => s.studentId === student?.studentId)
  record('D6 new assignment: not started, completion 0%',
    newStatus?.state === 'not_started' && newA?.completion?.pct === 0 && newA?.completion?.done === 0,
    `state=${newStatus?.state}, pct=${newA?.completion?.pct}`)

  // Domain accuracy must reflect exactly the one perfect 20-question
  // session: non-empty, totals summing to 20, every domain at 100%.
  const skills = d.skills ?? []
  const totalAnswers = skills.reduce((s, x) => s + x.total, 0)
  const totalCorrect = skills.reduce((s, x) => s + x.correct, 0)
  record('D7 accuracy-by-domain non-empty, sums to the graded 20',
    skills.length > 0 && totalAnswers === 20 && totalCorrect === 20,
    `domains=${skills.length}, answers=${totalAnswers}, correct=${totalCorrect}`)
  record('D8 every domain reads 100% (perfect session)',
    skills.length > 0 && skills.every(x => x.accuracy === 100),
    skills.map(x => `${x.domain}=${x.accuracy}%(n${x.total})`).join(', '))

  // Skills-to-review: only domains with >= min answers are ranked, each
  // states its n, and with a perfect cohort every wrong-rate is 0.
  const review = d.skillsToReview ?? []
  const minN = d.minAnswersForRanking
  record('D9 skills-to-review respects min-n and states n',
    minN === 5 && review.every(x => x.n >= minN && typeof x.wrongRate === 'number') &&
    review.every(x => x.wrongRate === 0) &&
    review.length === skills.filter(x => x.total >= minN).length,
    `ranked=${review.length} of ${skills.length} domains, minN=${minN}, ` +
    review.map(x => `${x.domain}:${x.wrongRate}%(n${x.n})`).join(', '))

  // ── 3. auth negative: a student may not read the teacher dashboard ──
  const asStudent = await api(`/api/camp/dashboard?classroomId=${CLASSROOM_ID}`, { token: sTok })
  record('D10 student token is rejected (403)', asStudent.status === 403, `status ${asStudent.status}`)
  const noAuth = await api(`/api/camp/dashboard?classroomId=${CLASSROOM_ID}`)
  record('D11 anonymous is rejected (401)', noAuth.status === 401, `status ${noAuth.status}`)

  finish()
}

main().catch(e => { console.error(e); finish() })
