#!/usr/bin/env node
/**
 * seed-demo-camp.mjs — adds a realistic CAMP PROGRAM to the existing
 * demo academy (클래스라움 데모 학원) so the camp dashboards have real
 * numbers to show.
 *
 * Everything that produces a number goes through the REAL HTTP APIs
 * with real bearer tokens — assignments are drawn by the teacher
 * builder, sessions are started and submitted by the students. Nothing
 * is hand-inserted into camp_assignments / study_sessions, because a
 * hand-written row can disagree with what the dashboards compute from
 * it (quota vs assignments, completion vs sessions, average vs answers).
 *
 * Re-runnable: it finds-or-creates the program and skips a classroom
 * that already has assignments, so a second run does not double-charge
 * the question quota.
 *
 * Usage: node scripts/seed-demo-camp.mjs            (BASE defaults to :3000)
 *        CAMP_BASE=http://localhost:53745 node scripts/seed-demo-camp.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const BASE = process.env.CAMP_BASE ?? 'http://localhost:3000'
const ACADEMY_NAME = '클래스라움 데모 학원'
const PROGRAM_NAME = '2026 여름 SAT 집중캠프'
const DEMO_PASSWORD = 'demo1234!'

const env = {}
for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2]
}
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = () => createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })

const iso = (d) => d.toISOString().slice(0, 10)
const day = (n) => new Date(Date.now() + n * 86400000)
const die = (m) => { console.error('FATAL: ' + m); process.exit(1) }

async function must(p, label) {
  const { data, error } = await p
  if (error) die(`${label}: ${error.message}`)
  return data
}

async function token(email) {
  const { data, error } = await anon().auth.signInWithPassword({ email, password: DEMO_PASSWORD })
  if (error) die(`sign-in ${email}: ${error.message}`)
  return data.session.access_token
}

async function api(path, { method = 'GET', tok, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { ...(tok ? { Authorization: `Bearer ${tok}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  let json = null
  try { json = await res.json() } catch {}
  return { status: res.status, ok: res.ok, json }
}

/* Deterministic per-student accuracy so the cohort has a real spread
   instead of everyone at 100%. Index into the enrolled list -> target. */
const ACCURACY = [0.95, 0.90, 0.85, 0.80, 0.78, 0.72, 0.70, 0.65, 0.60, 0.58, 0.50, 0.45]

async function main() {
  // ── academy + people ────────────────────────────────────────────────
  const academy = (await must(admin.from('academies').select('id,name').eq('name', ACADEMY_NAME).limit(1), 'academy'))[0]
  if (!academy) die(`academy "${ACADEMY_NAME}" not found — run scripts/seed-demo.ts first`)
  console.log(`academy: ${academy.name} (${academy.id})`)

  const teacherUsers = await must(
    admin.from('users').select('id,email,name').in('email', ['teacher1@demo.classraum.com', 'teacher2@demo.classraum.com']),
    'teachers')
  if (teacherUsers.length < 2) die('need teacher1/teacher2 demo accounts')
  const byEmail = Object.fromEntries(teacherUsers.map(t => [t.email, t]))

  // 12 existing demo students, stable order
  const studentRows = await must(
    admin.from('students').select('id,user_id,users!inner(email,name)')
      .eq('academy_id', academy.id).eq('active', true)
      .like('users.email', 'student%@demo.classraum.com')
      .order('user_id', { ascending: true }).limit(12),
    'students')
  if (studentRows.length < 12) die(`only ${studentRows.length} demo students found`)
  console.log(`students: ${studentRows.length}`)

  // ── camp program (find or create) ───────────────────────────────────
  let program = (await must(
    admin.from('camp_programs').select('id,name,question_quota,questions_used,student_cap')
      .eq('academy_id', academy.id).eq('name', PROGRAM_NAME).is('deleted_at', null).limit(1),
    'program lookup'))[0]
  if (!program) {
    program = await must(admin.from('camp_programs').insert({
      academy_id: academy.id,
      name: PROGRAM_NAME,
      test_family: 'sat',
      question_quota: 400,
      questions_used: 0,
      student_cap: 24,
      starts_on: iso(day(-30)),
      ends_on: iso(day(30)),
    }).select('id,name,question_quota,questions_used,student_cap').single(), 'program create')
    console.log(`created program ${program.id}`)
  } else {
    console.log(`reusing program ${program.id} (used ${program.questions_used}/${program.question_quota})`)
  }

  // ── two camp classrooms ─────────────────────────────────────────────
  const specs = [
    { name: 'SAT 집중반 A — Reading & Writing', teacher: byEmail['teacher1@demo.classraum.com'], section: 'reading_writing', slice: [0, 6] },
    { name: 'SAT 집중반 B — Math',              teacher: byEmail['teacher2@demo.classraum.com'], section: 'math',            slice: [6, 12] },
  ]

  const built = []
  for (const spec of specs) {
    let room = (await must(
      admin.from('classrooms').select('id,name').eq('academy_id', academy.id).eq('name', spec.name).is('deleted_at', null).limit(1),
      'classroom lookup'))[0]
    if (!room) {
      room = await must(admin.from('classrooms').insert({
        academy_id: academy.id, name: spec.name, teacher_id: spec.teacher.id,
        camp_program_id: program.id, grade: '고등', subject: 'SAT', color: spec.section === 'math' ? '#2563eb' : '#7c3aed',
      }).select('id,name').single(), 'classroom create')
      console.log(`created classroom ${room.name}`)
    }
    const cohort = studentRows.slice(spec.slice[0], spec.slice[1])
    for (const s of cohort) {
      const { data: exists } = await admin.from('classroom_students')
        .select('id').eq('classroom_id', room.id).eq('student_id', s.user_id).maybeSingle()
      if (!exists) {
        await must(admin.from('classroom_students').insert({
          classroom_id: room.id, student_id: s.user_id, student_record_id: s.id,
        }), 'enroll')
      }
    }
    built.push({ ...spec, room, cohort })
    console.log(`  ${room.name}: ${cohort.length} students`)
  }

  // ── assignments via the real teacher builder ────────────────────────
  for (const b of built) {
    const tok = await token(b.teacher.email)
    const existing = await api(`/api/camp/assignments?classroomId=${b.room.id}`, { tok })
    let assignments = existing.json?.assignments ?? []
    if (assignments.length === 0) {
      const plan = [
        { title: '1주차 진단 세트', count: 20, dueAt: day(-14).toISOString() },
        { title: '2주차 집중 세트', count: 20, dueAt: day(-7).toISOString() },
        { title: '3주차 실전 세트', count: 15, dueAt: day(3).toISOString() },
      ]
      for (const p of plan) {
        const r = await api('/api/camp/assignments', {
          method: 'POST', tok,
          body: { classroomId: b.room.id, title: p.title, section: b.section, count: p.count, dueAt: p.dueAt },
        })
        if (!r.ok) die(`assignment "${p.title}": ${r.status} ${JSON.stringify(r.json)}`)
        assignments.push(r.json.assignment)
        console.log(`  + ${p.title} (${r.json.assignment.question_count}q)`)
      }
    } else {
      console.log(`  ${b.room.name}: ${assignments.length} assignments already exist — skipping build`)
    }
    b.assignments = assignments
  }

  // ── students sit the first two assignments ──────────────────────────
  for (const b of built) {
    // oldest first so "3주차" stays outstanding for a live-looking board
    const ordered = [...b.assignments].sort((x, y) => new Date(x.created_at) - new Date(y.created_at))
    const toSit = ordered.slice(0, 2)
    for (let i = 0; i < b.cohort.length; i++) {
      const s = b.cohort[i]
      const email = s.users.email
      const stok = await token(email)
      const acc = ACCURACY[(b.slice[0] + i) % ACCURACY.length]
      for (const a of toSit) {
        // one student per classroom leaves the 2nd set unfinished
        if (i === b.cohort.length - 1 && a === toSit[1]) continue
        const start = await api('/api/study/camp/start', { method: 'POST', tok: stok, body: { assignmentId: a.id } })
        if (!start.ok) { console.log(`    ! start failed ${email} ${a.title}: ${start.status}`); continue }
        const sessionId = start.json.sessionId
        const { data: rows } = await admin.from('study_messages')
          .select('content').eq('session_id', sessionId).like('content', '[full-test-v1]%')
        if (!rows?.length) { console.log(`    ! no cache for ${sessionId}`); continue }
        const payload = JSON.parse(rows[0].content.slice('[full-test-v1]'.length))
        const questions = payload.questions ?? []
        const target = Math.round(questions.length * acc)
        const answers = questions.map((q, qi) => {
          const right = q.type === 'numeric_entry' ? (q.acceptable_answers?.[0] ?? '')
            : q.type === 'multi_select' ? JSON.stringify(q.correct_answers ?? [])
            : (q.correct_answer ?? '')
          if (qi < target) return right
          // a deliberate miss: any choice that is not the key
          if (q.type === 'numeric_entry') return String(Number(right) + 1)
          const wrong = (q.choices ?? []).find(c => c !== right)
          return wrong ?? ''
        })
        const sub = await api('/api/study/test/submit', {
          method: 'POST', tok: stok,
          body: { sessionId, questions, answers, elapsedSeconds: 600 + i * 37 },
        })
        if (!sub.ok) { console.log(`    ! submit failed ${email}: ${sub.status} ${JSON.stringify(sub.json)}`); continue }
        console.log(`    ${s.users.name} · ${a.title}: ${sub.json.correctCount}/${sub.json.totalQuestions}`)
      }
    }
  }

  // ── reports ─────────────────────────────────────────────────────────
  for (const b of built) {
    const tok = await token(b.teacher.email)
    const r = await api('/api/camp/reports/generate', { method: 'POST', tok, body: { classroomId: b.room.id } })
    console.log(`reports ${b.room.name}: ${r.status} ${JSON.stringify(r.json)?.slice(0, 160)}`)
  }

  const final = await must(admin.from('camp_programs').select('questions_used,question_quota').eq('id', program.id).single(), 'final')
  console.log(`\nquota: ${final.questions_used}/${final.question_quota}`)
  console.log('DONE')
}

main().catch(e => { console.error(e); process.exit(1) })
