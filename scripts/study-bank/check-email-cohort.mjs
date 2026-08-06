#!/usr/bin/env node
/**
 * Measure the 92-item Email cohort before repairing 10 of it.
 *
 * CLAUDE.md: "measure the population before believing the backlog." The
 * register says 10 items state no task. Reading them turned up two
 * things the register did not say, so the rest of the cohort gets
 * counted before anything is written.
 *
 * READ ONLY. Also `--selftest`, which runs the same functions over
 * fixtures whose answers are known.
 *
 * usage: node check-email-cohort.mjs [--selftest]
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

/*
 * The ETS Jan-2026 shape, as WritingScenario() branches on it: a
 * situation, an "In your email ...:" line, then bullets. This is the
 * same test the production gate applies — repeated here rather than
 * imported so the two can disagree and be noticed.
 */
const TASK_LINE = /In your (email|reply|response)[^\n]*:/i
const BULLET = /^\s*[•\-•*]\s+/

/*
 * A task stated INSIDE the email body is not the same as a task stated
 * to the candidate. "Write a reply that: (1) ..." pasted after the
 * professor's sign-off renders as words the professor wrote — the
 * student is reading test instructions in the voice of a character.
 */
const INLINE_TASK = /write a (reply|response|email) that:/i

export function taskState(item) {
  const text = `${item.passage ?? ''}\n${item.prompt ?? ''}`
  const bullets = String(item.passage ?? '').split('\n').filter(l => BULLET.test(l)).length
  if (TASK_LINE.test(text)) return { state: bullets >= 2 ? 'ets' : 'task-line-no-bullets', bullets }
  if (INLINE_TASK.test(text)) return { state: 'inline-in-body', bullets }
  return { state: 'none', bullets }
}

/* ── scenario concentration ────────────────────────────────────────── */

const STOP = new Set(('a an the you your yours i me my we our to of in on at for from with by and or but that this it is are was were be been being as if not do does did have has had will would can could should may might must about into over under after before your their her his its them they he she who whom which what when where how not no so than then there here also just more most some any each other another'
).split(' '))

export function contentWords(s) {
  return String(s ?? '').toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/)
    .filter(w => w.length > 3 && !STOP.has(w))
}

/*
 * Jaccard over CONTENT WORDS, not 4-grams.
 *
 * This is the point of the script. The production gate compared 4-gram
 * overlap and reported 0 near-duplicate pairs. Two items in this cohort
 * are the same scenario with the professor's name changed and a few
 * clauses reordered — near-zero 4-gram overlap, near-total content-word
 * overlap. An n-gram measure cannot see a paraphrase.
 */
export function jaccard(a, b) {
  const A = new Set(contentWords(a)), B = new Set(contentWords(b))
  if (!A.size || !B.size) return 0
  let hit = 0
  for (const w of A) if (B.has(w)) hit++
  return hit / (A.size + B.size - hit)
}

/*
 * The situation TYPE, by the verb the candidate has to perform. Crude
 * on purpose — it is a count, not a judgement, and it is reported
 * alongside the pair distances so a reader can see how coarse it is.
 */
const SHAPES = [
  ['decline/negotiate a request', /(would you be willing|asking if you|asked you to|request(ing)? (that )?you|invit(e|ing) you|step in|take on)/i],
  ['report a problem or conflict', /(conflict|cannot (make|attend|complete)|unable to|emergency|has not submitted|missed|delay)/i],
  ['ask for something', /(you (need|want) to (ask|request)|apply for|permission|extension|appeal)/i],
  ['explain or defend yourself', /(explain how you|integrity|flagged|accused|discrepanc)/i],
]
export function shapeOf(item) {
  const t = `${item.passage ?? ''}`
  for (const [name, re] of SHAPES) if (re.test(t)) return name
  return 'other'
}

/* ── self-test ─────────────────────────────────────────────────────── */

if (process.argv.includes('--selftest')) {
  const fail = []
  const eq = (label, got, want) => { if (JSON.stringify(got) !== JSON.stringify(want)) fail.push(`${label}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`) }

  eq('ets shape', taskState({ passage: 'Situation.\n\nIn your email to the office, be sure to:\n• one\n• two\n• three' }).state, 'ets')
  eq('task line but no bullets', taskState({ passage: 'In your email, be sure to: do things' }).state, 'task-line-no-bullets')
  eq('inline in the body', taskState({ passage: 'Dear Student, ... Write a reply that: (1) x (2) y' }).state, 'inline-in-body')
  eq('nothing stated', taskState({ passage: 'Dear Student, please let me know.' }).state, 'none')

  /*
   * The load-bearing fixture: a paraphrase with no shared 4-gram. If
   * jaccard cannot separate this from an unrelated scenario the script
   * is no better than the gate it is correcting.
   */
  const p1 = 'You are a graduate student working as a research assistant for Professor Lin, who asked you to help organize a guest lecture. The lecture date conflicts with a family event you cannot miss.'
  const p2 = 'Professor Lee recently asked you, a graduate research assistant, to organize a guest lecture; you have learned the date clashes with a family commitment you cannot reschedule.'
  const unrelated = 'The library is raising fines for overdue laptops next term and wants student feedback on the proposal before the vote.'
  if (jaccard(p1, p2) < 0.45) fail.push(`paraphrase pair scored ${jaccard(p1, p2).toFixed(2)}, expected >= 0.45`)
  if (jaccard(p1, unrelated) > 0.10) fail.push(`unrelated pair scored ${jaccard(p1, unrelated).toFixed(2)}, expected <= 0.10`)

  // And confirm 4-grams really would miss it — the premise of the fix.
  const grams = s => { const w = String(s).toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean); return new Set(w.slice(0, -3).map((_, i) => w.slice(i, i + 4).join(' '))) }
  const g1 = grams(p1), g2 = grams(p2)
  let shared = 0; for (const g of g1) if (g2.has(g)) shared++
  if (shared / Math.min(g1.size, g2.size) > 0.2) fail.push('4-gram overlap was high — the premise of this script is wrong')
  console.log(`  4-gram overlap on that same pair: ${(100 * shared / Math.min(g1.size, g2.size)).toFixed(1)}% (this is why the gate missed it)`)

  if (fail.length) { console.error('SELFTEST FAILED:'); fail.forEach(f => console.error('  ' + f)); process.exit(1) }
  console.log('selftest passed')
  process.exit(0)
}

/* ── live sweep ────────────────────────────────────────────────────── */

const env = Object.fromEntries(readFileSync(process.cwd() + '/.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } })

const all = []
for (let f = 0; ; f += 1000) {
  const { data } = await db.from('study_item_bank').select('id, item, archived').order('id').range(f, f + 999)
  if (!data?.length) break
  all.push(...data)
  if (data.length < 1000) break
}
const em = all.filter(r => r.item?.type === 'writing_email' && !r.archived)
console.log(`Email cohort: ${em.length} live items\n`)

const byState = new Map()
for (const r of em) {
  const t = taskState(r.item)
  if (!byState.has(t.state)) byState.set(t.state, [])
  byState.get(t.state).push(r)
}
console.log('TASK STATEMENT')
for (const [s, rs] of [...byState].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${String(rs.length).padStart(3)}  ${s}`)
  if (s !== 'ets') rs.forEach(r => console.log(`         ${r.id.slice(0, 8)}`))
}

console.log('\nSITUATION SHAPE')
const byShape = new Map()
for (const r of em) byShape.set(shapeOf(r.item), (byShape.get(shapeOf(r.item)) ?? 0) + 1)
for (const [s, n] of [...byShape].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(3)}  ${String(Math.round(100 * n / em.length)).padStart(3)}%  ${s}`)
}

console.log('\nNEAR-DUPLICATE SCENARIOS (content-word Jaccard, not 4-grams)')
const pairs = []
for (let i = 0; i < em.length; i++) {
  for (let j = i + 1; j < em.length; j++) {
    const s = jaccard(em[i].item.passage, em[j].item.passage)
    if (s >= 0.35) pairs.push([s, em[i], em[j]])
  }
}
pairs.sort((a, b) => b[0] - a[0])
if (!pairs.length) console.log('  none at >= 0.35')
for (const [s, a, b] of pairs) {
  console.log(`  ${s.toFixed(2)}  ${a.id.slice(0, 8)}  ${b.id.slice(0, 8)}`)
  console.log(`         ${String(a.item.passage).replace(/\s+/g, ' ').slice(0, 96)}`)
  console.log(`         ${String(b.item.passage).replace(/\s+/g, ' ').slice(0, 96)}`)
}

console.log('\nNAMED CHARACTERS')
const names = new Map()
for (const r of em) {
  for (const m of String(r.item.passage ?? '').matchAll(/Profess(?:or|er)\s+([A-Z][a-z]+)/g)) {
    names.set(m[1], (names.get(m[1]) ?? 0) + 1)
  }
}
for (const [n, c] of [...names].sort((a, b) => b[1] - a[1])) console.log(`  ${String(c).padStart(3)}  Professor ${n}`)
