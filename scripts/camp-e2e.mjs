#!/usr/bin/env node
/**
 * camp-e2e.mjs — end-to-end verification of camp mode P1 against the
 * RUNNING dev server (http://localhost:3000). Repeatable: reuses the two
 * test auth users + the E2E test academy, but seeds a FRESH camp
 * program/classroom/enrollment per run so landing/session state starts
 * clean.
 *
 * Seeds (service role):
 *   - auth users camp.teacher.test@classraum.com / camp.student.test@classraum.com
 *   - public.users + teachers + students + classroom_students rows
 *   - academy "E2E Camp Test Academy", camp program (sat, quota 60, cap 5),
 *     classroom wired to the program
 * Then exercises the real HTTP APIs with real Bearer tokens:
 *   teacher builder (+ quota race), student landing shelf, camp start
 *   (idempotency), cache integrity, submit grading, done-state.
 *
 * Leaves all seeded data in place; writes ids + credentials to the
 * session scratchpad (outside the repo).
 */
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const BASE = process.env.CAMP_E2E_BASE ?? 'http://localhost:3000'
const ACCOUNTS_FILE =
  '/private/tmp/claude-501/-Users-andylee-Downloads-saas-classraum/93d95221-6d94-4948-9914-9bd6bbc5b2a4/scratchpad/camp-e2e-accounts.txt'

// ── env (.env.local, same pattern as scripts/study-bank/bank-helper.mjs) ──
const env = {}
for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2]
}
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL
const admin = createClient(URL_, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = () => createClient(URL_, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })

const TEACHER_EMAIL = 'camp.teacher.test@classraum.com'
const STUDENT_EMAIL = 'camp.student.test@classraum.com'
const ACADEMY_NAME = 'E2E Camp Test Academy'
const RUN = new Date().toISOString().replace(/[:.]/g, '-')

const results = []
function record(step, pass, detail) {
  results.push({ step, pass, detail })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${step}${detail ? ` — ${detail}` : ''}`)
}
function die(msg) { console.error('FATAL: ' + msg); printTable(); process.exit(1) }
function printTable() {
  console.log('\n== PASS/FAIL table ==')
  for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.step}${r.detail ? ` — ${r.detail}` : ''}`)
  console.log(`${results.filter(r => r.pass).length}/${results.length} passed`)
}

async function must(promiseLike, label) {
  const { data, error } = await promiseLike
  if (error) die(`${label}: ${error.message}`)
  return data
}

// ── auth user find-or-create, always resetting to a fresh password ──
async function ensureAuthUser(email, password) {
  // public.users row (if a prior run created it) gives us the uid cheaply
  const { data: pub } = await admin.from('users').select('id').eq('email', email).maybeSingle()
  let uid = pub?.id ?? null
  if (!uid) {
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    if (!error) return data.user.id
    // already registered but no public row — page listUsers to find it
    for (let page = 1; page <= 50 && !uid; page++) {
      const { data: list, error: le } = await admin.auth.admin.listUsers({ page, perPage: 200 })
      if (le) die(`listUsers: ${le.message}`)
      uid = list.users.find(u => u.email === email)?.id ?? null
      if (list.users.length < 200) break
    }
    if (!uid) die(`auth user for ${email}: createUser said exists but not found (${error.message})`)
  }
  const { error: ue } = await admin.auth.admin.updateUserById(uid, { password, email_confirm: true })
  if (ue) die(`password reset for ${email}: ${ue.message}`)
  return uid
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
  // ════ 1. SEED ════
  const teacherPassword = 'Tt1!' + randomBytes(12).toString('hex')
  const studentPassword = 'Ss1!' + randomBytes(12).toString('hex')

  const teacherUid = await ensureAuthUser(TEACHER_EMAIL, teacherPassword)
  const studentUid = await ensureAuthUser(STUDENT_EMAIL, studentPassword)

  await must(admin.from('users').upsert([
    { id: teacherUid, email: TEACHER_EMAIL, name: 'Camp E2E Teacher', role: 'teacher' },
    { id: studentUid, email: STUDENT_EMAIL, name: 'Camp E2E Student', role: 'student' },
  ], { onConflict: 'id' }), 'users upsert')

  // academy: reuse the dedicated test academy or create it
  let academy = (await must(
    admin.from('academies').select('id, name').eq('name', ACADEMY_NAME).limit(1),
    'academy lookup',
  ))[0]
  if (!academy) {
    academy = await must(
      admin.from('academies').insert({ name: ACADEMY_NAME }).select('id, name').single(),
      'academy create',
    )
  }
  console.log(`academy: ${academy.name} (${academy.id})`)

  // teacher membership
  const { data: tRow } = await admin.from('teachers').select('user_id')
    .eq('user_id', teacherUid).eq('academy_id', academy.id).maybeSingle()
  if (!tRow) await must(
    admin.from('teachers').insert({ user_id: teacherUid, academy_id: academy.id, active: true }),
    'teachers insert')

  // student record (students.id is the student_record_id)
  let { data: sRow } = await admin.from('students').select('id')
    .eq('user_id', studentUid).eq('academy_id', academy.id).maybeSingle()
  if (!sRow) sRow = await must(
    admin.from('students').insert({ user_id: studentUid, academy_id: academy.id, active: true }).select('id').single(),
    'students insert')

  // fresh program + classroom per run
  const today = new Date()
  const iso = d => d.toISOString().slice(0, 10)
  const program = await must(admin.from('camp_programs').insert({
    academy_id: academy.id,
    name: `E2E Camp Program ${RUN}`,
    test_family: 'sat',
    question_quota: 60,
    questions_used: 0,
    student_cap: 5,
    starts_on: iso(new Date(today.getTime() - 86400000)),
    ends_on: iso(new Date(today.getTime() + 30 * 86400000)),
  }).select('id').single(), 'camp_programs insert')

  const classroom = await must(admin.from('classrooms').insert({
    academy_id: academy.id,
    name: `E2E Camp Classroom ${RUN}`,
    teacher_id: teacherUid,
    camp_program_id: program.id,
  }).select('id').single(), 'classrooms insert')

  await must(admin.from('classroom_students').insert({
    classroom_id: classroom.id,
    student_id: studentUid,          // auth uid — the identity bridge
    student_record_id: sRow.id,      // students.id
  }), 'classroom_students insert')

  record('SEED', true, `program ${program.id}, classroom ${classroom.id}`)

  // credentials + ids to scratchpad (NOT in the repo)
  mkdirSync(dirname(ACCOUNTS_FILE), { recursive: true })
  writeFileSync(ACCOUNTS_FILE, [
    `run: ${RUN}`,
    `teacher: ${TEACHER_EMAIL} / ${teacherPassword} (uid ${teacherUid})`,
    `student: ${STUDENT_EMAIL} / ${studentPassword} (uid ${studentUid}, student_record ${sRow.id})`,
    `academy: ${academy.name} (${academy.id})`,
    `camp_program: ${program.id}`,
    `classroom: ${classroom.id}`,
    '',
  ].join('\n'), { flag: 'a' })

  // ════ sign in both users ════
  const tAuth = await anon().auth.signInWithPassword({ email: TEACHER_EMAIL, password: teacherPassword })
  if (tAuth.error) die(`teacher sign-in: ${tAuth.error.message}`)
  const sAuth = await anon().auth.signInWithPassword({ email: STUDENT_EMAIL, password: studentPassword })
  if (sAuth.error) die(`student sign-in: ${sAuth.error.message}`)
  const tTok = tAuth.data.session.access_token
  const sTok = sAuth.data.session.access_token

  // ════ 2. TEACHER API ════
  const create = await api('/api/camp/assignments', {
    method: 'POST', token: tTok,
    body: { classroomId: classroom.id, title: 'E2E set', section: 'reading_writing', count: 20 },
  })
  const assignment = create.json?.assignment
  record('T1 create assignment (20q)',
    create.ok && !!assignment?.id && assignment.question_count === 20 && (assignment.item_ids?.length ?? 0) === 20,
    `status ${create.status}, id ${assignment?.id ?? '-'}, items ${assignment?.item_ids?.length ?? '-'}`)
  if (!assignment?.id) die('no assignment created; cannot continue')

  let prog = await must(admin.from('camp_programs').select('questions_used').eq('id', program.id).single(), 'prog read')
  record('T2 quota charged to 20', prog.questions_used === 20, `questions_used=${prog.questions_used}`)

  // RACE: bump used to 30 → remaining 30; two parallel 20s → exactly one fits
  await must(admin.from('camp_programs').update({ questions_used: 30 }).eq('id', program.id), 'bump used')
  const [r1, r2] = await Promise.all([
    api('/api/camp/assignments', { method: 'POST', token: tTok, body: { classroomId: classroom.id, title: 'E2E race A', section: 'reading_writing', count: 20 } }),
    api('/api/camp/assignments', { method: 'POST', token: tTok, body: { classroomId: classroom.id, title: 'E2E race B', section: 'reading_writing', count: 20 } }),
  ])
  const okCount = [r1, r2].filter(r => r.ok).length
  const quotaRejects = [r1, r2].filter(r => r.status === 402 && r.json?.code === 'quota_exceeded').length
  prog = await must(admin.from('camp_programs').select('questions_used').eq('id', program.id).single(), 'prog read 2')
  const { data: allAssignments } = await admin.from('camp_assignments')
    .select('id, title, question_count').eq('classroom_id', classroom.id).is('deleted_at', null)
  const sumQ = (allAssignments ?? []).reduce((s, a) => s + a.question_count, 0)
  record('T3 quota race: exactly one of two parallel 20s lands',
    okCount === 1 && quotaRejects === 1 && prog.questions_used === 50 &&
    (allAssignments?.length ?? 0) === 2 && sumQ === 40,
    `statuses ${r1.status}/${r2.status}, used=${prog.questions_used}, assignments=${allAssignments?.length} (sum ${sumQ})`)

  // ════ 3. STUDENT API ════
  const landing1 = await api('/api/study/landing', { token: sTok })
  const shelf1 = landing1.json?.campAssignments ?? []
  const mine1 = shelf1.find(a => a.id === assignment.id)
  record('S1 landing shelf shows assignment, not_started',
    landing1.ok && !!mine1 && mine1.state === 'not_started' && mine1.questionCount === 20,
    `status ${landing1.status}, state ${mine1?.state ?? 'MISSING'}`)

  const start1 = await api('/api/study/camp/start', { method: 'POST', token: sTok, body: { assignmentId: assignment.id } })
  const sessionId = start1.json?.sessionId
  record('S2 camp start returns session', start1.ok && !!sessionId, `status ${start1.status}, session ${sessionId ?? '-'}`)
  if (!sessionId) die('no session; cannot continue')

  const start2 = await api('/api/study/camp/start', { method: 'POST', token: sTok, body: { assignmentId: assignment.id } })
  record('S3 second start is idempotent',
    start2.ok && start2.json?.sessionId === sessionId && start2.json?.reused === true,
    `session ${start2.json?.sessionId ?? '-'}, reused=${start2.json?.reused}`)

  // cache integrity: exactly the assignment's item_ids, as questions
  const { data: cacheRows } = await admin.from('study_messages')
    .select('content').eq('session_id', sessionId).like('content', '[full-test-v1]%')
  const payload = cacheRows?.[0] ? JSON.parse(cacheRows[0].content.slice('[full-test-v1]'.length)) : null
  const questions = payload?.questions ?? []
  const cachedIds = new Set(questions.map(q => q.bankItemId).filter(Boolean))
  const wantIds = new Set(assignment.item_ids)
  const idsMatch = cachedIds.size === wantIds.size && [...wantIds].every(id => cachedIds.has(id))
  record('S4 cache holds exactly the assignment items',
    (cacheRows?.length ?? 0) === 1 && questions.length === 20 && idsMatch,
    `cache rows ${cacheRows?.length}, questions ${questions.length}, id-set match ${idsMatch}`)

  // session config tag
  const { data: sessRow } = await admin.from('study_sessions').select('config').eq('id', sessionId).single()
  record('S5 session config.campAssignmentId set',
    sessRow?.config?.campAssignmentId === assignment.id,
    `config.campAssignmentId=${sessRow?.config?.campAssignmentId ?? '-'}`)

  // submit: answer every question with its correct answer (from the cache)
  const answers = questions.map(q => {
    if (q.type === 'numeric_entry') return q.acceptable_answers?.[0] ?? ''
    if (q.type === 'multi_select') return JSON.stringify(q.correct_answers ?? [])
    return q.correct_answer ?? ''
  })
  const submit = await api('/api/study/test/submit', {
    method: 'POST', token: sTok,
    body: { sessionId, questions, answers, elapsedSeconds: 600 },
  })
  record('S6 submit grades the test',
    submit.ok && submit.json?.success === true && submit.json?.totalQuestions === 20 &&
    submit.json?.correctCount === 20,
    `status ${submit.status}, ${submit.json?.correctCount ?? '-'} / ${submit.json?.totalQuestions ?? '-'} (${submit.json?.scorePercent ?? '-'}%)`)

  const landing2 = await api('/api/study/landing', { token: sTok })
  const mine2 = (landing2.json?.campAssignments ?? []).find(a => a.id === assignment.id)
  record('S7 landing shows done with score',
    landing2.ok && mine2?.state === 'done' && mine2?.sessionId === sessionId &&
    mine2?.correctCount === 20 && mine2?.totalCount === 20,
    `state ${mine2?.state ?? '-'}, score ${mine2?.correctCount ?? '-'}/${mine2?.totalCount ?? '-'}`)

  // append run artifacts
  writeFileSync(ACCOUNTS_FILE, [
    `assignment: ${assignment.id} (E2E set)`,
    `race assignments kept: ${(allAssignments ?? []).map(a => `${a.title}=${a.id}`).join(', ')}`,
    `session: ${sessionId}`,
    '', '',
  ].join('\n'), { flag: 'a' })

  printTable()
  process.exit(results.every(r => r.pass) ? 0 : 1)
}

main().catch(e => { console.error(e); printTable(); process.exit(1) })
