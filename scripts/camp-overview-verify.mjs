#!/usr/bin/env node
/**
 * camp-overview-verify.mjs — live verification of the multi-program camp
 * dashboard upgrades against the RUNNING dev server:
 *   - GET /api/camp/program returning ALL programs with classrooms
 *     grouped per program (multi-program support)
 *   - GET /api/camp/overview program stats strip
 *   - GET /api/camp/student per-student drill-down, cross-checked against
 *     both the P2 dashboard and a freshly generated P4 report (the three
 *     must agree — one shared implementation)
 *
 * Uses the data the last camp-e2e.mjs run left in place (accounts file in
 * the session scratchpad), then seeds a SECOND program (toefl) for the
 * same academy with its own classroom + the same enrolled student, so the
 * grouping is non-trivial.
 *
 * Run: node scripts/camp-overview-verify.mjs   (after camp-e2e.mjs)
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const BASE = process.env.CAMP_E2E_BASE ?? 'http://localhost:3000'
const ACCOUNTS_FILE =
  '/private/tmp/claude-501/-Users-andylee-Downloads-saas-classraum/93d95221-6d94-4948-9914-9bd6bbc5b2a4/scratchpad/camp-e2e-accounts.txt'
const RUN = new Date().toISOString().replace(/[:.]/g, '-')

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

// ── latest run's credentials + ids from the accounts file ──
const accounts = readFileSync(ACCOUNTS_FILE, 'utf8')
const last = re => { const all = [...accounts.matchAll(re)]; return all.length ? all[all.length - 1] : null }
const teacherLine = last(/teacher: (\S+) \/ (\S+) \(uid (\S+)\)/g)
const studentLine = last(/student: (\S+) \/ (\S+) \(uid (\S+), student_record (\S+)\)/g)
const academyLine = last(/academy: .* \(([0-9a-f-]{36})\)/g)
const programLine = last(/camp_program: (\S+)/g)
const classroomLine = last(/classroom: (\S+)/g)
const doneAssignmentLine = last(/assignment: (\S+) \(E2E set\)/g)
if (!teacherLine || !studentLine || !academyLine || !programLine || !classroomLine || !doneAssignmentLine) {
  console.error('FATAL: accounts file missing expected lines — run scripts/camp-e2e.mjs first')
  process.exit(1)
}
const [, TEACHER_EMAIL, TEACHER_PASSWORD, TEACHER_UID] = teacherLine
const [, STUDENT_EMAIL, STUDENT_PASSWORD, STUDENT_UID, STUDENT_RECORD_ID] = studentLine
const ACADEMY_ID = academyLine[1]
const SAT_PROGRAM_ID = programLine[1]
const SAT_CLASSROOM_ID = classroomLine[1]
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
  // ── 0. seed a SECOND (toefl) program + classroom, enroll the student ──
  const today = new Date()
  const iso = d => d.toISOString().slice(0, 10)
  const toeflProgram = await must(admin.from('camp_programs').insert({
    academy_id: ACADEMY_ID,
    name: `E2E TOEFL Camp ${RUN}`,
    test_family: 'toefl',
    question_quota: 40,
    questions_used: 0,
    student_cap: 5,
    starts_on: iso(new Date(today.getTime() - 86400000)),
    ends_on: iso(new Date(today.getTime() + 30 * 86400000)),
  }).select('id').single(), 'toefl camp_programs insert')
  const toeflClassroom = await must(admin.from('classrooms').insert({
    academy_id: ACADEMY_ID,
    name: `E2E TOEFL Classroom ${RUN}`,
    teacher_id: TEACHER_UID,
    camp_program_id: toeflProgram.id,
  }).select('id').single(), 'toefl classrooms insert')
  await must(admin.from('classroom_students').insert({
    classroom_id: toeflClassroom.id,
    student_id: STUDENT_UID,
    student_record_id: STUDENT_RECORD_ID,
  }), 'toefl classroom_students insert')
  console.log(`seeded toefl program ${toeflProgram.id}, classroom ${toeflClassroom.id}`)

  // ── sign in ──
  const tAuth = await anon().auth.signInWithPassword({ email: TEACHER_EMAIL, password: TEACHER_PASSWORD })
  if (tAuth.error) return die(`teacher sign-in: ${tAuth.error.message}`)
  const sAuth = await anon().auth.signInWithPassword({ email: STUDENT_EMAIL, password: STUDENT_PASSWORD })
  if (sAuth.error) return die(`student sign-in: ${sAuth.error.message}`)
  const tTok = tAuth.data.session.access_token
  const sTok = sAuth.data.session.access_token

  // ── 1. program API returns BOTH programs, classrooms grouped right ──
  const progRes = await api(`/api/camp/program?academyId=${ACADEMY_ID}`, { token: tTok })
  record('V1 program API returns 200 with a programs array',
    progRes.ok && Array.isArray(progRes.json?.programs),
    `status ${progRes.status}, programs n=${progRes.json?.programs?.length}`)
  if (!progRes.ok) return die('program API failed')
  const groups = progRes.json.programs
  const satGroup = groups.find(g => g.program.id === SAT_PROGRAM_ID)
  const toeflGroup = groups.find(g => g.program.id === toeflProgram.id)
  record('V2 both programs present (sat + seeded toefl)',
    !!satGroup && !!toeflGroup && satGroup.program.test_family === 'sat' &&
    toeflGroup.program.test_family === 'toefl',
    `sat=${!!satGroup}, toefl=${!!toeflGroup}`)
  const satRooms = (satGroup?.classrooms ?? []).map(c => c.id)
  const toeflRooms = (toeflGroup?.classrooms ?? []).map(c => c.id)
  record('V3 classrooms grouped under the right program (no cross-leak)',
    satRooms.includes(SAT_CLASSROOM_ID) && !satRooms.includes(toeflClassroom.id) &&
    toeflRooms.length === 1 && toeflRooms[0] === toeflClassroom.id,
    `sat rooms=${satRooms.length}, toefl rooms=[${toeflRooms.join(',')}]`)

  // ── 2. overview stats for the SAT program match the known data ──
  // Known: 1 enrolled student (cap 5), exactly ONE completed session at
  // 20/20 → avg 100%; expected sessions = assignments × 1 student.
  const assignList = await api(`/api/camp/assignments?classroomId=${SAT_CLASSROOM_ID}`, { token: tTok })
  if (!assignList.ok) return die(`assignments list failed: ${assignList.status} ${JSON.stringify(assignList.json)}`)
  const nAssignments = (assignList.json?.assignments ?? []).length
  const ov = await api(`/api/camp/overview?programId=${SAT_PROGRAM_ID}`, { token: tTok })
  record('V4 overview returns 200', ov.ok, `status ${ov.status}`)
  if (!ov.ok) return die('overview failed')
  const o = ov.json
  record('V5 students enrolled 1 of cap 5',
    o.studentsEnrolled === 1 && o.studentCap === 5,
    `enrolled=${o.studentsEnrolled}/${o.studentCap}`)
  const expectPct = nAssignments > 0 ? Math.round(100 / nAssignments) : 0
  record('V6 completion = 1 done of (assignments × 1 student)',
    o.completion?.done === 1 && o.completion?.expected === nAssignments * 1 &&
    o.completion?.pct === expectPct,
    `done=${o.completion?.done}/${o.completion?.expected} (${o.completion?.pct}%), assignments=${nAssignments}`)
  record('V7 average score 100% over exactly 1 graded session',
    o.averageScorePct === 100 && o.scoredSessions === 1,
    `avg=${o.averageScorePct}%, scored=${o.scoredSessions}`)
  record('V8 skills to review = 0 (perfect cohort, threshold 70%)',
    o.skillsToReview?.count === 0 && o.skillsToReview?.accuracyThreshold === 70 &&
    o.skillsToReview?.minAnswers === 5,
    `count=${o.skillsToReview?.count}, threshold=${o.skillsToReview?.accuracyThreshold}`)

  // Fresh toefl program: 1 enrolled, nothing assigned or graded yet.
  const ov2 = await api(`/api/camp/overview?programId=${toeflProgram.id}`, { token: tTok })
  const o2 = ov2.json ?? {}
  record('V9 toefl overview: 1 enrolled, 0 expected, no graded sessions',
    ov2.ok && o2.studentsEnrolled === 1 && o2.completion?.expected === 0 &&
    o2.completion?.done === 0 && o2.averageScorePct === null && o2.skillsToReview?.count === 0,
    `enrolled=${o2.studentsEnrolled}, expected=${o2.completion?.expected}, avg=${o2.averageScorePct}`)

  // ── 3. student drill-down agrees with dashboard AND report ──
  const stu = await api(
    `/api/camp/student?classroomId=${SAT_CLASSROOM_ID}&studentId=${STUDENT_UID}`,
    { token: tTok },
  )
  record('V10 student drill-down returns 200 with a payload', stu.ok && !!stu.json?.payload,
    `status ${stu.status}`)
  if (!stu.ok) return die('student drill-down failed')
  const payload = stu.json.payload

  const dash = await api(`/api/camp/dashboard?classroomId=${SAT_CLASSROOM_ID}`, { token: tTok })
  const dashAssignments = dash.json?.assignments ?? []
  // Per-assignment state/score must match the dashboard cell for this
  // student, assignment by assignment (order differs by design).
  const dashState = new Map(dashAssignments.map(a => {
    const s = (a.students ?? []).find(x => x.studentId === STUDENT_UID)
    return [a.id, s ? `${s.state}:${s.correctCount}/${s.totalCount}` : 'MISSING']
  }))
  const mismatches = payload.assignments.filter(a =>
    dashState.get(a.id) !== `${a.state}:${a.correctCount}/${a.totalCount}`)
  record('V11 per-assignment states/scores match the dashboard',
    payload.assignments.length === dashAssignments.length && mismatches.length === 0,
    `${payload.assignments.length} assignments, mismatches=${mismatches.length}`)
  const doneRow = payload.assignments.find(a => a.id === DONE_ASSIGNMENT_ID)
  record('V12 the completed assignment reads done 20/20 (100%)',
    doneRow?.state === 'done' && doneRow?.correctCount === 20 &&
    doneRow?.totalCount === 20 && doneRow?.scorePct === 100,
    `state=${doneRow?.state}, ${doneRow?.correctCount}/${doneRow?.totalCount}`)

  // Single-student classroom → student skills == cohort skills.
  const skillKey = s => `${s.section}:${s.domain}=${s.correct}/${s.total}`
  const dashSkills = (dash.json?.skills ?? []).map(skillKey).sort().join('|')
  const stuSkills = (payload.skills ?? []).map(skillKey).sort().join('|')
  record('V13 per-domain accuracy matches the dashboard (single-student cohort)',
    dashSkills.length > 0 && dashSkills === stuSkills,
    `domains=${payload.skills?.length}`)
  // lastActivity = latest completion across camp assignments + mock
  // tests. With no mock tests it must be exactly the done session's time.
  const completions = [
    ...payload.assignments.map(a => a.completedAt),
    ...payload.mockTests.map(m => m.completedAt),
  ].filter(Boolean).sort()
  const expectedLast = completions.at(-1) ?? null
  record('V14 lastActivity = latest completion (the 20/20 session)',
    !!stu.json.lastActivity && stu.json.lastActivity === expectedLast &&
    (payload.mockTests.length > 0 || stu.json.lastActivity === doneRow?.completedAt),
    `lastActivity=${stu.json.lastActivity}, mockTests=${payload.mockTests.length}`)

  // Report generated NOW must carry the same numbers (shared builder).
  const gen = await api('/api/camp/reports/generate', {
    method: 'POST', token: tTok,
    body: { classroomId: SAT_CLASSROOM_ID, studentId: STUDENT_UID },
  })
  const reportId = gen.json?.generated?.[0]?.id
  const rep = reportId
    ? await api(`/api/camp/reports?id=${reportId}`, { token: tTok })
    : { ok: false, json: null }
  const rp = rep.json?.report?.payload
  // Postgres jsonb does NOT preserve key order, so the snapshot comes
  // back with reordered keys — compare canonically (sorted keys).
  const sortKeys = x => Array.isArray(x)
    ? x.map(sortKeys)
    : (x && typeof x === 'object'
      ? Object.fromEntries(Object.keys(x).sort().map(k => [k, sortKeys(x[k])]))
      : x)
  const stripVolatile = p => JSON.stringify(sortKeys({
    assignments: p.assignments, skills: p.skills, strengths: p.strengths,
    weaknesses: p.weaknesses, cohort: p.cohort, completion: p.completion,
    mockTests: p.mockTests,
  }))
  record('V15 freshly generated report carries identical numbers',
    gen.status === 201 && rep.ok && !!rp && stripVolatile(rp) === stripVolatile(payload),
    `gen status ${gen.status}, equal=${!!rp && stripVolatile(rp) === stripVolatile(payload)}`)

  // ── 4. auth negatives ──
  const progAsStudent = await api(`/api/camp/program?academyId=${ACADEMY_ID}`, { token: sTok })
  const ovAsStudent = await api(`/api/camp/overview?programId=${SAT_PROGRAM_ID}`, { token: sTok })
  const stuAsStudent = await api(
    `/api/camp/student?classroomId=${SAT_CLASSROOM_ID}&studentId=${STUDENT_UID}`, { token: sTok })
  record('V16 student token rejected on program/overview/student (403)',
    progAsStudent.status === 403 && ovAsStudent.status === 403 && stuAsStudent.status === 403,
    `statuses ${progAsStudent.status}/${ovAsStudent.status}/${stuAsStudent.status}`)
  const ovAnon = await api(`/api/camp/overview?programId=${SAT_PROGRAM_ID}`)
  const stuAnon = await api(`/api/camp/student?classroomId=${SAT_CLASSROOM_ID}&studentId=${STUDENT_UID}`)
  record('V17 anonymous rejected (401)',
    ovAnon.status === 401 && stuAnon.status === 401,
    `statuses ${ovAnon.status}/${stuAnon.status}`)

  finish()
}

main().catch(e => { console.error(e); finish() })
