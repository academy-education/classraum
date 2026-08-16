#!/usr/bin/env node
/**
 * camp-reports-verify.mjs — live verification of Camp P4
 * (camp_reports + /api/camp/reports*) against the RUNNING dev server,
 * using the data the last camp-e2e.mjs run left in place (one COMPLETED
 * 20/20 session by camp.student.test on the "E2E set" assignment).
 *
 * Seeds (service role, idempotent):
 *   - camp.parent.test@classraum.com   linked to the camp student via a
 *     families/family_members pair (the same linkage the academy uses
 *     for report cards — get_user_family_students reads it)
 *   - camp.parent2.test@classraum.com  a parent with NO family link
 *   - camp.student2.test@classraum.com a student not enrolled anywhere
 *
 * Then, all through HTTP + RLS like real users:
 *   1. teacher generates reports for the E2E classroom
 *   2. teacher list + single view; payload numbers cross-checked against
 *      the live /api/camp/dashboard for the same classroom
 *   3. linked parent sees exactly their child's reports (API + direct
 *      RLS read); completion is stripped for family viewers
 *   4. student sees their own; unlinked parent and stranger student
 *      get 403/empty everywhere
 *
 * Run: node scripts/camp-reports-verify.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'

const BASE = process.env.CAMP_E2E_BASE ?? 'http://localhost:3000'
const ACCOUNTS_FILE =
  '/private/tmp/claude-501/-Users-andylee-Downloads-saas-classraum/93d95221-6d94-4948-9914-9bd6bbc5b2a4/scratchpad/camp-e2e-accounts.txt'

const PARENT_EMAIL = 'camp.parent.test@classraum.com'
const PARENT2_EMAIL = 'camp.parent2.test@classraum.com'
const STUDENT2_EMAIL = 'camp.student2.test@classraum.com'
const FAMILY_NAME = 'Camp E2E Family'

const env = {}
for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2]
}
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL
const admin = createClient(URL_, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = () => createClient(URL_, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })

// ── latest run's credentials + ids from the accounts file ──
const accounts = readFileSync(ACCOUNTS_FILE, 'utf8')
const last = re => { const all = [...accounts.matchAll(re)]; return all.length ? all[all.length - 1] : null }
const teacherLine = last(/teacher: (\S+) \/ (\S+) /g)
const studentLine = last(/student: (\S+) \/ (\S+) \(uid (\S+),/g)
const academyLine = last(/academy: .* \((\S+)\)/g)
const classroomLine = last(/classroom: (\S+)/g)
const doneAssignmentLine = last(/assignment: (\S+) \(E2E set\)/g)
if (!teacherLine || !studentLine || !academyLine || !classroomLine || !doneAssignmentLine) {
  console.error('FATAL: accounts file missing expected lines — run scripts/camp-e2e.mjs first')
  process.exit(1)
}
const [, TEACHER_EMAIL, TEACHER_PASSWORD] = teacherLine
const [, STUDENT_EMAIL, STUDENT_PASSWORD, STUDENT_UID] = studentLine
const ACADEMY_ID = academyLine[1]
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

async function must(promiseLike, label) {
  const { data, error } = await promiseLike
  if (error) die(`${label}: ${error.message}`)
  return data
}

async function ensureAuthUser(email, password) {
  const { data: pub } = await admin.from('users').select('id').eq('email', email).maybeSingle()
  let uid = pub?.id ?? null
  if (!uid) {
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    if (!error) return data.user.id
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

async function signIn(email, password) {
  const client = anon()
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error) die(`sign-in ${email}: ${error.message}`)
  return { token: data.session.access_token, client }
}

async function main() {
  // ════ SEED: parents + stranger student (service role, idempotent) ════
  // Stable for the same reason as camp-e2e.mjs (rotation locked Andy out).
  const parentPassword = 'CampParent!2026'
  const parent2Password = 'CampParent2!2026'
  const student2Password = 'CampStudy2!2026'

  const parentUid = await ensureAuthUser(PARENT_EMAIL, parentPassword)
  const parent2Uid = await ensureAuthUser(PARENT2_EMAIL, parent2Password)
  const student2Uid = await ensureAuthUser(STUDENT2_EMAIL, student2Password)

  await must(admin.from('users').upsert([
    { id: parentUid, email: PARENT_EMAIL, name: 'Camp E2E Parent', role: 'parent' },
    { id: parent2Uid, email: PARENT2_EMAIL, name: 'Camp E2E Unlinked Parent', role: 'parent' },
    { id: student2Uid, email: STUDENT2_EMAIL, name: 'Camp E2E Stranger Student', role: 'student' },
  ], { onConflict: 'id' }), 'users upsert')

  // family link: one family in the E2E academy holding parent + student
  let { data: family } = await admin.from('families')
    .select('id').eq('academy_id', ACADEMY_ID).eq('name', FAMILY_NAME).is('deleted_at', null).maybeSingle()
  if (!family) {
    family = await must(
      admin.from('families').insert({ academy_id: ACADEMY_ID, name: FAMILY_NAME }).select('id').single(),
      'families insert')
  }
  for (const [userId, role] of [[parentUid, 'parent'], [STUDENT_UID, 'student']]) {
    const { data: existing } = await admin.from('family_members')
      .select('id').eq('family_id', family.id).eq('user_id', userId).eq('role', role).maybeSingle()
    if (!existing) {
      await must(admin.from('family_members').insert({ family_id: family.id, user_id: userId, role }),
        `family_members insert (${role})`)
    }
  }
  // the unlinked parent must stay unlinked even across reruns
  await must(admin.from('family_members').delete().eq('user_id', parent2Uid), 'unlink parent2')

  console.log(`seeded: parent ${parentUid} linked to student ${STUDENT_UID} via family ${family.id}`)

  // ════ SIGN-IN ════
  const teacher = await signIn(TEACHER_EMAIL, TEACHER_PASSWORD)
  const student = await signIn(STUDENT_EMAIL, STUDENT_PASSWORD)
  const parent = await signIn(PARENT_EMAIL, parentPassword)
  const parent2 = await signIn(PARENT2_EMAIL, parent2Password)
  const student2 = await signIn(STUDENT2_EMAIL, student2Password)

  // ════ 1. teacher generates reports for the classroom ════
  const gen = await api('/api/camp/reports/generate', {
    method: 'POST', token: teacher.token, body: { classroomId: CLASSROOM_ID },
  })
  const generated = gen.json?.generated ?? []
  const studentReport = generated.find(r => r.student_id === STUDENT_UID)
  record('R1 generate returns 201 with a report for the camp student',
    gen.status === 201 && !!studentReport,
    `status ${gen.status}, generated=${generated.length}, student report ${studentReport?.id ?? 'MISSING'}`)
  if (!studentReport) return die('no report generated for the camp student')
  const REPORT_ID = studentReport.id

  // ════ 2. teacher list + single view, cross-checked vs dashboard ════
  const list = await api(`/api/camp/reports?classroomId=${CLASSROOM_ID}`, { token: teacher.token })
  const listed = (list.json?.reports ?? []).find(r => r.id === REPORT_ID)
  record('R2 teacher list contains the new report with the student name',
    list.ok && !!listed && !!listed.studentName,
    `status ${list.status}, n=${list.json?.reports?.length}, name=${listed?.studentName ?? '-'}`)

  const single = await api(`/api/camp/reports?id=${REPORT_ID}`, { token: teacher.token })
  const payload = single.json?.report?.payload
  record('R3 teacher single view returns the payload', single.ok && !!payload, `status ${single.status}`)
  if (!payload) return die('no payload on teacher view')

  const doneA = (payload.assignments ?? []).find(a => a.id === DONE_ASSIGNMENT_ID)
  record('R4 payload: E2E assignment done with 20/20 (matches the seeded session)',
    doneA?.state === 'done' && doneA?.correctCount === 20 && doneA?.totalCount === 20 && doneA?.scorePct === 100,
    `state=${doneA?.state}, score=${doneA?.correctCount}/${doneA?.totalCount}, pct=${doneA?.scorePct}`)

  const skillTotal = (payload.skills ?? []).reduce((s, x) => s + x.total, 0)
  const skillCorrect = (payload.skills ?? []).reduce((s, x) => s + x.correct, 0)
  record('R5 payload: skills sum to the graded 20, all domains 100%',
    (payload.skills ?? []).length > 0 && skillTotal === 20 && skillCorrect === 20 &&
    payload.skills.every(x => x.accuracy === 100),
    `domains=${payload.skills?.length}, answers=${skillTotal}, correct=${skillCorrect}`)

  // cross-check against the live dashboard for the same classroom: the
  // cohort is this one student, so per-domain numbers must be identical
  const dash = await api(`/api/camp/dashboard?classroomId=${CLASSROOM_ID}`, { token: teacher.token })
  const dashSkills = dash.json?.skills ?? []
  const skillKey = s => `${s.section}:${s.domain}:${s.correct}/${s.total}`
  const payloadSet = new Set((payload.skills ?? []).map(skillKey))
  const dashSet = new Set(dashSkills.map(skillKey))
  record('R6 payload skills identical to the live dashboard skills',
    dash.ok && payloadSet.size === dashSet.size && [...payloadSet].every(k => dashSet.has(k)),
    `payload=${[...payloadSet].join(' ')} vs dashboard=${[...dashSet].join(' ')}`)

  record('R7 payload: teacher sees completion; strengths/weaknesses respect n>=5',
    payload.completion !== null && typeof payload.completion?.rate === 'number' &&
    [...(payload.strengths ?? []), ...(payload.weaknesses ?? [])].every(s => s.total >= 5),
    `completion=${JSON.stringify(payload.completion)}, strengths=${payload.strengths?.length}, weaknesses=${payload.weaknesses?.length}`)

  // ════ 3. linked parent ════
  const pList = await api(`/api/camp/reports?studentId=${STUDENT_UID}`, { token: parent.token })
  const pRows = pList.json?.reports ?? []
  record('R8 linked parent lists the child reports (only that child)',
    pList.ok && pRows.some(r => r.id === REPORT_ID) && pRows.every(r => r.studentId === STUDENT_UID),
    `status ${pList.status}, n=${pRows.length}`)

  const pSingle = await api(`/api/camp/reports?id=${REPORT_ID}`, { token: parent.token })
  const pPayload = pSingle.json?.report?.payload
  record('R9 linked parent opens the report; completion stripped for family view',
    pSingle.ok && !!pPayload && pPayload.completion === null &&
    (pPayload.skills ?? []).reduce((s, x) => s + x.total, 0) === 20,
    `status ${pSingle.status}, completion=${JSON.stringify(pPayload?.completion)}`)

  // direct RLS read as the parent (migration 086 policy, not the API)
  const { data: pDirect, error: pDirectErr } = await parent.client
    .from('camp_reports').select('id, student_id')
  record('R10 RLS: parent direct read returns only the child rows',
    !pDirectErr && (pDirect ?? []).length > 0 && pDirect.every(r => r.student_id === STUDENT_UID),
    `rows=${pDirect?.length ?? 0}${pDirectErr ? `, err=${pDirectErr.message}` : ''}`)

  // ════ 4. the student themself ════
  const sSingle = await api(`/api/camp/reports?id=${REPORT_ID}`, { token: student.token })
  record('R11 student opens their own report (completion stripped)',
    sSingle.ok && sSingle.json?.report?.payload?.completion === null,
    `status ${sSingle.status}`)

  // ════ 5. negatives ════
  const p2List = await api(`/api/camp/reports?studentId=${STUDENT_UID}`, { token: parent2.token })
  const p2Single = await api(`/api/camp/reports?id=${REPORT_ID}`, { token: parent2.token })
  record('R12 unlinked parent gets 403 on list and single',
    p2List.status === 403 && p2Single.status === 403,
    `list ${p2List.status}, single ${p2Single.status}`)

  const { data: p2Direct } = await parent2.client.from('camp_reports').select('id')
  record('R13 RLS: unlinked parent direct read returns zero rows',
    (p2Direct ?? []).length === 0, `rows=${p2Direct?.length ?? 0}`)

  const s2Single = await api(`/api/camp/reports?id=${REPORT_ID}`, { token: student2.token })
  const s2List = await api(`/api/camp/reports?studentId=${STUDENT_UID}`, { token: student2.token })
  record('R14 stranger student gets 403 on single and on another student list',
    s2Single.status === 403 && s2List.status === 403,
    `single ${s2Single.status}, list ${s2List.status}`)

  const noAuth = await api(`/api/camp/reports?id=${REPORT_ID}`)
  const genAsStudent = await api('/api/camp/reports/generate', {
    method: 'POST', token: student.token, body: { classroomId: CLASSROOM_ID },
  })
  record('R15 anonymous is 401; student cannot generate (403)',
    noAuth.status === 401 && genAsStudent.status === 403,
    `anon ${noAuth.status}, student-generate ${genAsStudent.status}`)

  finish()
}

main().catch(e => { console.error(e); finish() })
