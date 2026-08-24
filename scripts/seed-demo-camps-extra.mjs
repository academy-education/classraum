#!/usr/bin/env node
/**
 * seed-demo-camps-extra.mjs — adds two MORE camp programs to the demo
 * academy so the multi-camp cases can be tested: a second test family,
 * a camp that has already ended, and a quota that is nearly exhausted.
 *
 * Same rule as seed-demo-camp.mjs: every number comes from the real
 * HTTP APIs. Assignments are drawn by the teacher builder and charged
 * to the quota; students start and submit their own sessions.
 *
 * One deliberate exception, called out because it looks like cheating:
 * the ENDED camp is seeded with its dates OPEN and then closed
 * afterwards with a direct update. The API refuses to create an
 * assignment or start a session outside the program window (that gate
 * is the thing being tested), so there is no way to build history for
 * a finished camp through the API alone.
 *
 * Usage: CAMP_BASE=http://localhost:PORT node scripts/seed-demo-camps-extra.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const BASE = process.env.CAMP_BASE ?? 'http://localhost:3000'
const ACADEMY_NAME = '클래스라움 데모 학원'
const DEMO_PASSWORD = 'demo1234!'

const env = {}
for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2]
}
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = () => createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })

const iso = d => d.toISOString().slice(0, 10)
const day = n => new Date(Date.now() + n * 86400000)
const die = m => { console.error('FATAL: ' + m); process.exit(1) }
const must = async (p, l) => { const { data, error } = await p; if (error) die(`${l}: ${error.message}`); return data }

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

/* Two more camps. Between them plus the existing summer SAT camp this
   covers: two test families, an active / an ended / a not-yet-open
   window, and a quota that is nearly gone. */
const PROGRAMS = [
  {
    name: '2026 겨울 TOEFL 캠프',
    family: 'toefl',
    quota: 300, cap: 20,
    starts: -14, ends: 45,           // active
    closeTo: null,
    rooms: [
      { name: 'TOEFL 집중반 — Reading', section: 'reading',   teacher: 'teacher3@demo.classraum.com', take: 5 },
      { name: 'TOEFL 집중반 — Listening', section: 'listening', teacher: 'teacher4@demo.classraum.com', take: 5 },
    ],
  },
  {
    name: '2026 봄 SAT 심화캠프',
    family: 'sat',
    quota: 120, cap: 15,
    starts: -120, ends: 30,          // seeded open …
    closeTo: -10,                    // … then closed 10 days ago
    rooms: [
      { name: 'SAT 심화반 — Math', section: 'math', teacher: 'teacher5@demo.classraum.com', take: 6 },
    ],
  },
]

const ACCURACY = [0.92, 0.84, 0.77, 0.71, 0.66, 0.59, 0.52, 0.45]

async function main() {
  const academy = (await must(admin.from('academies').select('id,name').eq('name', ACADEMY_NAME).limit(1), 'academy'))[0]
  if (!academy) die(`academy "${ACADEMY_NAME}" not found`)
  console.log(`academy: ${academy.name}`)

  // students already in a camp — don't double-enrol them
  const { data: taken } = await admin.from('classroom_students')
    .select('student_id, classrooms!inner(camp_program_id)')
    .not('classrooms.camp_program_id', 'is', null)
  const busy = new Set((taken ?? []).map(r => r.student_id))

  const pool = (await must(
    admin.from('students').select('id,user_id,users!inner(email,name)')
      .eq('academy_id', academy.id).eq('active', true)
      .like('users.email', 'student%@demo.classraum.com')
      .order('user_id', { ascending: true }).limit(80),
    'students')).filter(s => !busy.has(s.user_id))
  console.log(`free students: ${pool.length}`)
  let cursor = 0

  for (const spec of PROGRAMS) {
    let program = (await must(
      admin.from('camp_programs').select('id,name,questions_used,question_quota')
        .eq('academy_id', academy.id).eq('name', spec.name).is('deleted_at', null).limit(1),
      'program lookup'))[0]
    if (program) { console.log(`\n${spec.name}: already exists — skipping`); continue }

    program = await must(admin.from('camp_programs').insert({
      academy_id: academy.id, name: spec.name, test_family: spec.family,
      question_quota: spec.quota, questions_used: 0, student_cap: spec.cap,
      starts_on: iso(day(spec.starts)), ends_on: iso(day(spec.ends)),
    }).select('id').single(), 'program create')
    console.log(`\ncreated ${spec.name} (${spec.family}, quota ${spec.quota}, cap ${spec.cap})`)

    for (const r of spec.rooms) {
      const teacher = (await must(admin.from('users').select('id,email').eq('email', r.teacher).limit(1), 'teacher'))[0]
      if (!teacher) die(`teacher ${r.teacher} not found`)

      const room = await must(admin.from('classrooms').insert({
        academy_id: academy.id, name: r.name, teacher_id: teacher.id,
        camp_program_id: program.id, grade: '고등', subject: spec.family.toUpperCase(),
      }).select('id,name').single(), 'classroom create')

      const cohort = pool.slice(cursor, cursor + r.take); cursor += r.take
      for (const s of cohort) {
        await must(admin.from('classroom_students').insert({
          classroom_id: room.id, student_id: s.user_id, student_record_id: s.id,
        }), 'enroll')
      }
      console.log(`  ${room.name}: ${cohort.length} students`)

      const tok = await token(teacher.email)
      const plan = [
        { title: '1주차 세트', count: 20, dueAt: day(-7).toISOString() },
        { title: '2주차 세트', count: 20, dueAt: day(4).toISOString() },
      ]
      const made = []
      for (const p of plan) {
        const res = await api('/api/camp/assignments', {
          method: 'POST', tok,
          body: { classroomId: room.id, title: p.title, section: r.section, count: p.count, dueAt: p.dueAt },
        })
        if (!res.ok) { console.log(`    ! ${p.title}: ${res.status} ${JSON.stringify(res.json)}`); continue }
        made.push(res.json.assignment)
        console.log(`    + ${p.title} (${res.json.assignment.question_count}q)`)
      }

      // students sit the first set only — the second stays outstanding
      for (let i = 0; i < cohort.length; i++) {
        const s = cohort[i]
        if (!made[0]) break
        const stok = await token(s.users.email)
        const start = await api('/api/study/camp/start', { method: 'POST', tok: stok, body: { assignmentId: made[0].id } })
        if (!start.ok) { console.log(`      ! start ${s.users.name}: ${start.status}`); continue }
        const sid = start.json.sessionId
        const { data: rows } = await admin.from('study_messages')
          .select('content').eq('session_id', sid).like('content', '[full-test-v1]%')
        if (!rows?.length) continue
        const questions = JSON.parse(rows[0].content.slice('[full-test-v1]'.length)).questions ?? []
        const target = Math.round(questions.length * ACCURACY[i % ACCURACY.length])
        const answers = questions.map((q, qi) => {
          const right = q.type === 'numeric_entry' ? (q.acceptable_answers?.[0] ?? '')
            : q.type === 'multi_select' ? JSON.stringify(q.correct_answers ?? [])
            : (q.correct_answer ?? '')
          if (qi < target) return right
          if (q.type === 'numeric_entry') return String(Number(right) + 1)
          return (q.choices ?? []).find(c => c !== right) ?? ''
        })
        const sub = await api('/api/study/test/submit', {
          method: 'POST', tok: stok, body: { sessionId: sid, questions, answers, elapsedSeconds: 700 + i * 31 },
        })
        if (sub.ok) console.log(`      ${s.users.name}: ${sub.json.correctCount}/${sub.json.totalQuestions}`)
        else console.log(`      ! submit ${s.users.name}: ${sub.status}`)
      }

      const rep = await api('/api/camp/reports/generate', { method: 'POST', tok, body: { classroomId: room.id } })
      console.log(`    reports: ${rep.status}`)
    }

    if (spec.closeTo !== null) {
      await must(admin.from('camp_programs').update({ ends_on: iso(day(spec.closeTo)) }).eq('id', program.id), 'close')
      console.log(`  window closed → ended ${iso(day(spec.closeTo))}`)
    }
  }

  const all = await must(admin.from('camp_programs')
    .select('name,test_family,starts_on,ends_on,questions_used,question_quota,student_cap')
    .eq('academy_id', academy.id).is('deleted_at', null).order('starts_on'), 'final')
  console.log('\n=== camps in the demo academy ===')
  for (const p of all) {
    const today = iso(new Date())
    const state = p.starts_on > today ? 'not started' : p.ends_on < today ? 'ENDED' : 'active'
    console.log(`  ${p.name} · ${p.test_family} · ${state} · quota ${p.questions_used}/${p.question_quota} · cap ${p.student_cap}`)
  }
  console.log('DONE')
}
main().catch(e => { console.error(e); process.exit(1) })
