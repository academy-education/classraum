#!/usr/bin/env node
/**
 * bank-state.mjs — the ONE place to read what is in the bank and what has
 * been sat. Run this before answering any question about bank state.
 *
 * WHY THIS EXISTS. On 2026-09-04 I got the same class of fact wrong three
 * times in one session, each time by writing a fresh ad-hoc query and
 * picking a plausible-looking column:
 *
 *   - Claimed "the SAT R&W bank has never had a human blind sitting."
 *     False. `b2-all-cohorts-2026-08-15` is reviewer_kind 'human'; its SAT
 *     R&W slice is 80 items at 26.3% against a 25% control. (Even the
 *     correction needed correcting: I first reported it as 28.0% over 100,
 *     which folded in 20 TOEFL items from the same run. This report splits
 *     by family so that cannot happen again.) I had never looked at
 *     study_item_reviews, and then cited my own earlier sentence as source.
 *   - Claimed the co-founder had six abandoned open runs blocking a draw.
 *     False. I counted rows with a null `blind_pick`; the draw guard uses
 *     `blind_at`. He had one.
 *   - Read `craft-and-structure-2026-08-06` at 20/20 as a human result.
 *     It is reviewer_kind 'model_assisted'.
 *
 * The through-line is that these columns do NOT mean what their names
 * suggest, so this file states the semantics once and every report below
 * uses them consistently:
 *
 *   verified=false   row exists, assembler IGNORES it (staged)
 *   archived=true    retired; excluded everywhere here
 *   blind_at         the reviewer SAW the item. This is what the draw guard
 *                    and "is this run open?" mean. Null => run still open.
 *   blind_pick       the letter they chose. Can be null while blind_at is
 *                    set: seen but skipped. NEVER use it to decide openness.
 *   key_slot         the key's position under shown_order for that reviewer.
 *                    Score blind_pick against THIS, not against the item.
 *   reviewer_kind    'human' | 'model_assisted'. A model run is NOT a
 *                    sitting. Mixing them is how a 20/20 got read as a
 *                    person scoring full marks.
 *
 *   usage: node scripts/study-bank/bank-state.mjs [counts|sittings|open|held|all]
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync(process.cwd() + '/.env.local', 'utf8')
  .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } })

const pageAll = async (table, select, tune = q => q) => {
  const out = []
  for (let from = 0; ; from += 1000) {          // PostgREST caps a page at 1000
    const { data, error } = await tune(db.from(table).select(select)).range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return out
}

const pad = (s, n) => String(s).padEnd(n)
const num = (s, n) => String(s).padStart(n)

async function counts() {
  const rows = await pageAll('study_item_bank', 'family,section,domain,difficulty,verified,archived',
    q => q.eq('archived', false))
  const g = {}
  for (const r of rows) {
    const k = `${r.family}/${r.section}`
    ;(g[k] ??= {})
    const d = r.domain ?? '(none)'
    ;(g[k][d] ??= { hard: 0, medium: 0, easy: 0, staged: 0 })
    if (!r.verified) g[k][d].staged++
    else g[k][d][r.difficulty] = (g[k][d][r.difficulty] ?? 0) + 1
  }
  // A third state, and the one most easily missed: an item can be verified
  // AND drawable AND still unreachable, because its subtopic is hidden or its
  // topic locked in the student UI. ACT Science reads as 120 drawable items
  // while no student can open it. Read the gates from source rather than
  // repeating them here, so they cannot drift apart.
  const page = readFileSync('src/app/mobile/study/topic/[slug]/page.tsx', 'utf8')
  const grab = re => (page.match(re)?.[1] ?? '').match(/'([^']+)'/g)?.map(x => x.slice(1, -1)) ?? []
  const hidden = grab(/HIDDEN_SUBTOPIC_SLUGS = new Set\(\[([^\]]*)\]/)
  const locked = grab(/LOCKED_TOPIC_SLUGS = new Set\(\[([\s\S]*?)\]\)/)
  console.log('\n=== DRAWABLE COUNTS  (verified=true; "staged" = verified=false, assembler ignores)')
  if (hidden.length) console.log(`    subtopics HIDDEN from students: ${hidden.join(', ')}`)
  if (locked.length) console.log(`    topics LOCKED:                  ${locked.join(', ')}`)
  console.log('    a hidden/locked row is drawable by the assembler but unreachable in the UI\n')
  for (const [k, doms] of Object.entries(g).sort()) {
    const tot = Object.values(doms).reduce((a, c) => a + c.hard + c.medium + c.easy, 0)
    const st = Object.values(doms).reduce((a, c) => a + c.staged, 0)
    console.log(`${k}   ${tot} drawable${st ? `, ${st} STAGED` : ''}`)
    for (const [d, c] of Object.entries(doms).sort())
      console.log(`   ${pad(d, 36)} hard ${num(c.hard, 4)}  medium ${num(c.medium, 4)}  easy ${num(c.easy, 4)}${c.staged ? `   staged ${c.staged}` : ''}`)
  }
}

async function sittings() {
  const revs = await pageAll('study_item_reviews',
    'run_id,reviewer_id,reviewer_kind,blind_at,blind_pick,key_slot,item_id')
  // Reviews reference ARCHIVED items too (a cohort retired after its
  // sitting). Filtering them out here printed the family as '?' and split
  // one run across two lines, which is how a 100-item run looked like 80.
  const items = await pageAll('study_item_bank', 'id,family,section,archived')
  const meta = new Map(items.map(r => [r.id, r]))
  const { data: users } = await db.from('users').select('id,email')
  const email = new Map((users ?? []).map(u => [u.id, u.email]))

  const g = {}
  for (const r of revs) {
    const m = meta.get(r.item_id)
    const k = `${r.run_id}|${m ? `${m.family}/${m.section}` : '?'}`
    ;(g[k] ??= { n: 0, seen: 0, picked: 0, correct: 0, kinds: new Set(), who: new Set() })
    const e = g[k]
    e.n++
    if (r.blind_at) e.seen++
    if (r.blind_pick) { e.picked++; if (r.blind_pick === r.key_slot) e.correct++ }
    if (r.reviewer_kind) e.kinds.add(r.reviewer_kind)
    e.who.add(email.get(r.reviewer_id) ?? '?')
  }
  // A model run is not a sitting. Print them apart so they cannot be conflated.
  for (const want of ['human', 'model_assisted', 'other']) {
    const rows = Object.entries(g).filter(([, v]) => {
      const kinds = [...v.kinds]
      return want === 'other' ? kinds.length === 0 : kinds.includes(want) && !(want === 'human' && kinds.includes('model_assisted'))
    })
    if (!rows.length) continue
    console.log(`\n=== ${want.toUpperCase()} REVIEW RUNS   (score = blind_pick vs key_slot; control 25%)\n`)
    for (const [k, v] of rows.sort()) {
      const [run, fam] = k.split('|')
      const pct = v.picked ? `${(100 * v.correct / v.picked).toFixed(1)}%` : '—'
      console.log(`${pad(run, 36)} ${pad(fam, 22)} ${num(v.picked, 3)}/${num(v.n, 3)} answered  ${num(pct, 6)}  ${[...v.who].join(',')}`)
    }
  }
}

async function open_() {
  // The draw guard is: any row with blind_at IS NULL keeps the run open.
  const revs = await pageAll('study_item_reviews', 'run_id,reviewer_id,blind_at')
  const { data: users } = await db.from('users').select('id,email')
  const email = new Map((users ?? []).map(u => [u.id, u.email]))
  const g = {}
  for (const r of revs) {
    const k = `${r.run_id}|${email.get(r.reviewer_id) ?? r.reviewer_id}`
    ;(g[k] ??= { n: 0, unseen: 0 })
    g[k].n++
    if (!r.blind_at) g[k].unseen++
  }
  const open = Object.entries(g).filter(([, v]) => v.unseen > 0)
  console.log('\n=== OPEN RUNS   (blind_at IS NULL — this is what blocks a new draw)\n')
  if (!open.length) { console.log('   none — a new run can be drawn for any reviewer'); return }
  for (const [k, v] of open.sort()) {
    const [run, who] = k.split('|')
    console.log(`${pad(run, 36)} ${pad(who, 26)} ${v.unseen} of ${v.n} still unseen`)
  }
}

async function held() {
  const dir = 'scripts/study-bank'
  const batches = readdirSync(dir).filter(f => f.endsWith('.batch.json'))
  const rows = await pageAll('study_item_bank', 'item,verified', q => q.eq('archived', false))
  // Key on prompt+passage, never prompt alone. Prompts are NOT unique: making
  // C&S stems positional gave 8 of 18 rows in one cohort an identical prompt,
  // and a prompt-keyed lookup silently returned a sibling's row the same day.
  const sig = it => `${it?.prompt ?? ''}\u0000${it?.passage ?? ''}`
  // "in the bank" and "reachable by a student" are different things: a staged
  // row (verified=false) exists and the assembler ignores it. Reporting both
  // as "banked" is how 86 staged ACT items read as shipped.
  const live = new Set(rows.filter(r => r.verified).map(r => sig(r.item)))
  const staged = new Set(rows.filter(r => !r.verified).map(r => sig(r.item)))
  console.log('\n=== AUTHORED BATCH FILES   (banked = every prompt already live)\n')
  for (const f of batches.sort()) {
    let items
    try { const j = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')); items = Array.isArray(j) ? j : j.items } catch { continue }
    if (!Array.isArray(items) || !items.length) continue
    const nLive = items.filter(i => live.has(sig(i))).length
    const nStaged = items.filter(i => staged.has(sig(i))).length
    const state = nStaged === items.length ? 'STAGED (assembler ignores)'
      : nLive === 0 && nStaged === 0 ? 'HELD (not in bank)'
      : nLive === items.length ? 'drawable'
      : `partial — ${nLive} drawable, ${nStaged} staged, ${items.length - nLive - nStaged} absent`
    console.log(`${pad(f.replace('.batch.json', ''), 32)} ${num(items.length, 4)} items   ${state}`)
  }
}

const mode = process.argv[2] ?? 'all'
if (!existsSync('.env.local')) { console.error('run from the repo root (.env.local not found)'); process.exit(1) }
if (mode === 'counts' || mode === 'all') await counts()
if (mode === 'sittings' || mode === 'all') await sittings()
if (mode === 'open' || mode === 'all') await open_()
if (mode === 'held' || mode === 'all') await held()
console.log()
