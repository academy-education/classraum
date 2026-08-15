#!/usr/bin/env node
/**
 * camp-review-verify.mjs — live verification of Camp P3
 * (/api/camp/review-set + the kind='review' exclusions) against the
 * RUNNING dev server, using the data the last camp-e2e.mjs run left in
 * place (accounts file in the session scratchpad).
 *
 * Steps:
 *   0. service role: top up the program's question_quota by +20 if
 *      fewer than 5 questions remain (the e2e run spends 50/60 and the
 *      dashboard verifier may have spent the rest) — logged when done
 *   1. sign in teacher + student
 *   2. teacher POST /api/camp/review-set (count 5) → 201, kind='review'
 *   3. quota charged by exactly 5 (service-role read)
 *   4. teacher GET ?id= → 5 full items with 4 choices each, the key
 *      among the choices, and a non-empty explanation
 *   5. student GET ?id= → 403 (keys must never reach students)
 *   6. student landing → the review set is NOT in campAssignments
 *   7. student POST /api/study/camp/start on the set id → 404
 *   8. teacher GET /api/camp/assignments → the set is NOT listed
 *
 * Run: node scripts/camp-review-verify.mjs
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
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = () => createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
})

// ── latest run's credentials + ids from the accounts file ──
const accounts = readFileSync(ACCOUNTS_FILE, 'utf8')
const last = re => { const all = [...accounts.matchAll(re)]; return all.length ? all[all.length - 1] : null }
const teacherLine = last(/teacher: (\S+) \/ (\S+) /g)
const studentLine = last(/student: (\S+) \/ (\S+) /g)
const classroomLine = last(/classroom: (\S+)/g)
const programLine = last(/camp_program: (\S+)/g)
if (!teacherLine || !studentLine || !classroomLine || !programLine) {
  console.error('FATAL: accounts file missing expected lines — run scripts/camp-e2e.mjs first')
  process.exit(1)
}
const [, TEACHER_EMAIL, TEACHER_PASSWORD] = teacherLine
const [, STUDENT_EMAIL, STUDENT_PASSWORD] = studentLine
const CLASSROOM_ID = classroomLine[1]
const PROGRAM_ID = programLine[1]

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

const COUNT = 5

async function main() {
  // ── 0. quota headroom (service role; logged, not silent) ──
  const { data: prog0, error: pe } = await admin
    .from('camp_programs')
    .select('question_quota, questions_used')
    .eq('id', PROGRAM_ID)
    .single()
  if (pe) return die(`program read: ${pe.message}`)
  if (prog0.question_quota - prog0.questions_used < COUNT) {
    const newQuota = prog0.question_quota + 20
    const { error } = await admin.from('camp_programs')
      .update({ question_quota: newQuota }).eq('id', PROGRAM_ID)
    if (error) return die(`quota top-up: ${error.message}`)
    console.log(`NOTE  quota was ${prog0.questions_used}/${prog0.question_quota} — topped up to ${newQuota} (service role)`)
    prog0.question_quota = newQuota
  }
  const usedBefore = prog0.questions_used

  // ── 1. sign in ──
  const tAuth = await anon().auth.signInWithPassword({ email: TEACHER_EMAIL, password: TEACHER_PASSWORD })
  if (tAuth.error) return die(`teacher sign-in: ${tAuth.error.message}`)
  const sAuth = await anon().auth.signInWithPassword({ email: STUDENT_EMAIL, password: STUDENT_PASSWORD })
  if (sAuth.error) return die(`student sign-in: ${sAuth.error.message}`)
  const tTok = tAuth.data.session.access_token
  const sTok = sAuth.data.session.access_token

  // ── 2. create the review set ──
  const create = await api('/api/camp/review-set', {
    method: 'POST', token: tTok,
    body: { classroomId: CLASSROOM_ID, section: 'reading_writing', count: COUNT },
  })
  const set = create.json?.reviewSet
  record('R1 teacher creates review set (5q)',
    create.status === 201 && !!set?.id && set.kind === 'review' &&
    set.question_count === COUNT && (set.item_ids?.length ?? 0) === COUNT,
    `status ${create.status}, id ${set?.id ?? '-'}, kind ${set?.kind ?? '-'}, items ${set?.item_ids?.length ?? '-'}`)
  if (!set?.id) return die('no review set created; cannot continue')

  // ── 3. quota charged ──
  const { data: prog1 } = await admin
    .from('camp_programs').select('questions_used').eq('id', PROGRAM_ID).single()
  record('R2 quota charged by 5',
    prog1?.questions_used === usedBefore + COUNT,
    `questions_used ${usedBefore} → ${prog1?.questions_used}`)

  // ── 4. teacher GET returns full items ──
  const get = await api(`/api/camp/review-set?id=${set.id}`, { token: tTok })
  const questions = get.json?.questions ?? []
  const allComplete = questions.length === COUNT && questions.every(q =>
    typeof q.prompt === 'string' && q.prompt.length > 0 &&
    Array.isArray(q.choices) && q.choices.length === 4 &&
    typeof q.correct_answer === 'string' && q.choices.includes(q.correct_answer) &&
    typeof q.explanation === 'string' && q.explanation.length > 0)
  record('R3 teacher GET returns 5 full items (key in choices + explanation)',
    get.ok && allComplete,
    `status ${get.status}, questions ${questions.length}, complete ${allComplete}`)

  // ── 5. student GET is rejected ──
  const sGet = await api(`/api/camp/review-set?id=${set.id}`, { token: sTok })
  record('R4 student GET gets 403', sGet.status === 403, `status ${sGet.status}`)

  // ── 6. review set absent from the student shelf ──
  const landing = await api('/api/study/landing', { token: sTok })
  const shelfIds = (landing.json?.campAssignments ?? []).map(a => a.id)
  record('R5 review set NOT on student landing shelf',
    landing.ok && shelfIds.length > 0 && !shelfIds.includes(set.id),
    `status ${landing.status}, shelf has ${shelfIds.length} assignments, contains set: ${shelfIds.includes(set.id)}`)

  // ── 7. student cannot start a session from it ──
  const start = await api('/api/study/camp/start', {
    method: 'POST', token: sTok, body: { assignmentId: set.id },
  })
  record('R6 student camp/start on review set gets 404', start.status === 404, `status ${start.status}`)

  // ── 8. absent from the teacher assignments list ──
  const list = await api(`/api/camp/assignments?classroomId=${CLASSROOM_ID}`, { token: tTok })
  const listIds = (list.json?.assignments ?? []).map(a => a.id)
  record('R7 review set NOT in /api/camp/assignments list',
    list.ok && listIds.length > 0 && !listIds.includes(set.id),
    `status ${list.status}, ${listIds.length} assignments, contains set: ${listIds.includes(set.id)}`)

  finish()
}

main().catch(e => { console.error(e); finish() })
