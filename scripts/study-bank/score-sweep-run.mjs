#!/usr/bin/env node
/**
 * Score a MULTI-COHORT sitting, one verdict per cohort.
 *
 * ── Why this exists, and it is a bug I created ───────────────────────
 *
 * On 2026-08-11 draw-review-run.mjs was widened to put several cohorts
 * into ONE run, so a reviewer could finish TOEFL in a single sitting
 * instead of four separate 20-minute asks. The scoring side was not
 * widened with it.
 *
 * scoreRun() in lib/study/item-review.ts computes ONE pct, ONE control
 * and ONE verdict per RUN. Point it at a four-cohort run and it blends
 * 60 items from four different cohorts into a single number — and a
 * blended verdict can read "clean" while one cohort inside it leaks, or
 * "leaks" on the strength of one bad cohort dragging three sound ones
 * down. The register already records this exact confound for the
 * calibration run: "gap CONFOUNDED with cohort, do not read alone".
 *
 * Changing the draw without changing the scorer is the same shape of
 * mistake as every other one in this file's history: one side of a pair
 * moved and the other did not.
 *
 * ── The control is PER COHORT, deliberately ──────────────────────────
 *
 * Best single fixed letter over THAT cohort's own key spread, never a
 * flat 25 and never the run-wide spread. The draw makes letters flat
 * across the whole run, which does not guarantee flatness inside each
 * cohort; scoring against the run-wide figure would quietly credit or
 * penalise a cohort for the others' shuffle.
 *
 * usage: score-sweep-run.mjs <runId> [--selftest]
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const args = process.argv.slice(2)
const selftest = args.includes('--selftest')
const runId = args.find(a => !a.startsWith('--'))
if (!runId && !selftest) {
  console.error('usage: score-sweep-run.mjs <runId> [--selftest]'); process.exit(1)
}

/* Thresholds from SITTING-PROCEDURE.md §5, fixed before the sitting.
 * 25 is SYSTEM.md's line because official ETS items sit at +25.5 on this
 * same instrument. */
const LEAKS = 25
const CLEAN = 10
const MIN_ITEMS = 8

const env = Object.fromEntries(readFileSync(process.cwd() + '/.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const L = ['A', 'B', 'C', 'D']

/** Pure, so the self-test can drive it without a database. */
export function scoreCohort(rows) {
  const answered = rows.filter(r => r.blind_at)
  const n = answered.length
  if (!n) return { n: 0, correct: 0, pct: null, control: null, margin: null, reading: 'not-enough' }
  const correct = answered.filter(r => r.blind_pick && r.blind_pick === r.key_slot).length
  const counts = L.map(x => answered.filter(r => r.key_slot === x).length)
  const control = (100 * Math.max(...counts)) / n
  const pct = (100 * correct) / n
  const margin = pct - control
  const abstained = answered.filter(r => !r.blind_pick || String(r.blind_pick).trim() === '').length
  let reading
  /* ABSTENTION VOIDS A COHORT, it does not lower its score.
   *
   * Caught by running this scorer on the 2026-08-11 calibration run:
   * Choose a Response came out 2/9 = 22.2%, margin -11.1, and my first
   * draft read that as CLEAN — on a cohort where SIX of the nine were
   * abstentions. Abstentions count as not-correct, so a sitting nobody
   * engaged with deflates toward the control and reads as sound.
   *
   * That is the exact confusion recorded in the register as having
   * nearly cleared 275 Academic Talk items on a 0% score. A number that
   * cannot distinguish "no leak" from "no data" must say so.
   *
   * The abstain button is gone, so this cannot fire on a new run — it
   * fires on historic runs and on a stale deployed UI, which is why it
   * is a verdict rather than only a warning. */
  const abstainRate = abstained / n
  if (abstainRate > 0.20) reading = 'void'
  else if (n < MIN_ITEMS) reading = 'not-enough'
  else if (margin >= LEAKS) reading = 'leaks'
  else if (margin <= CLEAN) reading = 'clean'
  else reading = 'inconclusive'
  return { n, correct, abstained, pct, control, margin, reading }
}

if (selftest) {
  /* A scorer that cannot reproduce a known number on known data has no
   * business being pointed at unknown data. These three are hand-checked
   * against the register. */
  const mk = (keys, picks) => keys.map((k, i) => ({ blind_at: 't', key_slot: k, blind_pick: picks[i] }))
  const cases = [
    { name: 'all correct, flat keys -> +75 leaks',
      rows: mk(['A','B','C','D','A','B','C','D'], ['A','B','C','D','A','B','C','D']),
      pct: 100, control: 25, reading: 'leaks' },
    { name: 'all wrong -> negative margin, clean',
      rows: mk(['A','B','C','D','A','B','C','D'], ['B','C','D','A','B','C','D','A']),
      pct: 0, control: 25, reading: 'clean' },
    { name: 'lumpy keys raise the control, not the score',
      rows: mk(['A','A','A','A','A','A','B','C'], ['A','A','A','A','A','A','B','C']),
      pct: 100, control: 75, reading: 'leaks' },
    /* A LIGHT sprinkle of abstention still counts as not-correct and is
     * still scored — only a heavy rate voids. This case used to have 6 of
     * 8 abstained and expected 'clean'; the void branch correctly
     * reclassified it, which is the self-test catching a stale
     * expectation rather than a regression. Rewritten at 1 of 10 so it
     * tests what it was written to test. */
    { name: 'light abstention counts as not-correct but still scores',
      rows: mk(['A','B','C','D','A','B','C','D','A','B'],
               ['A','B','A','A','B','A','A','B','B',null]),
      pct: 20, control: 30, reading: 'clean' },
    { name: 'heavy abstention VOIDS rather than reading clean',
      rows: mk(['A','B','C','D','A','B','C','D','A'], ['A','B',null,null,null,null,null,null,null]),
      pct: 22.2, control: 33.3, reading: 'void' },
    { name: 'under the floor is not-enough whatever the margin',
      rows: mk(['A','B','C','D'], ['A','B','C','D']), pct: 100, control: 25, reading: 'not-enough' },
  ]
  let bad = 0
  for (const c of cases) {
    const r = scoreCohort(c.rows)
    const ok = Math.abs(r.pct - c.pct) < 0.05 && Math.abs(r.control - c.control) < 0.05 && r.reading === c.reading
    if (!ok) { bad++; console.log(`FAIL  ${c.name}\n      got pct=${r.pct} control=${r.control} reading=${r.reading}`) }
    else console.log(`ok    ${c.name}`)
  }
  console.log(bad ? `\n${bad} self-test failure(s)` : '\nself-test clean')
  process.exit(bad ? 1 : 0)
}

const { data: rows, error } = await db.from('study_item_reviews')
  .select('item_id, blind_at, blind_pick, key_slot, reviewed_at, note, verdict, realism')
  .eq('run_id', runId)
if (error) { console.error(error.message); process.exit(1) }
if (!rows.length) { console.error(`no rows for run "${runId}"`); process.exit(1) }

/* Cohort comes from the bank, not from the run — the run does not store
 * it, and inferring it from draw order would break the moment a draw
 * changes. */
const ids = [...new Set(rows.map(r => r.item_id))]
const meta = new Map()
for (let i = 0; i < ids.length; i += 200) {
  const { data } = await db.from('study_item_bank').select('id, domain, family')
    .in('id', ids.slice(i, i + 200))
  for (const d of data ?? []) meta.set(d.id, d)
}

const byCohort = new Map()
for (const r of rows) {
  const d = meta.get(r.item_id)?.domain ?? '(unknown cohort)'
  if (!byCohort.has(d)) byCohort.set(d, [])
  byCohort.get(d).push(r)
}

/* ── VALIDITY FIRST, per SITTING-PROCEDURE §4. The number is seductive
 *    and a sitting can be invalid for reasons unrelated to it. ─────── */
const answered = rows.filter(r => r.blind_at)
const done = answered.length
const times = answered.map(r => new Date(r.blind_at).getTime()).sort((a, b) => a - b)
const minutes = times.length > 1 ? (times[times.length - 1] - times[0]) / 60000 : 0
const perItem = done > 1 ? minutes / done : null
const abstained = answered.filter(r => !r.blind_pick || String(r.blind_pick).trim() === '').length

console.log(`\nrun "${runId}"  —  ${done}/${rows.length} answered across ${byCohort.size} cohort(s)\n`)
console.log('VALIDITY')
console.log(`  pace           ${perItem === null ? 'n/a' : perItem.toFixed(2) + ' min/item over ' + minutes.toFixed(0) + ' min'}`)
if (perItem !== null && perItem < 0.25)
  console.log('    *** UNDER 15s PER ITEM — this is clicking, not reading. Do not score. ***')
console.log(`  abstentions    ${abstained}` + (abstained ? '  *** the button was removed 2026-08-11; any abstention in a NEW run means the UI is stale ***' : ''))
if (done < rows.length) console.log(`  INCOMPLETE     ${rows.length - done} unanswered — scoring only what was answered, never extrapolating`)

console.log('\nPER COHORT — each against its OWN key spread, never a flat 25\n')
const order = [...byCohort.keys()]
for (const d of order) {
  const s = scoreCohort(byCohort.get(d))
  if (!s.n) { console.log(`  ${d.padEnd(20)} not started`); continue }
  const verdict = { leaks: 'LEAKS — options give it away', clean: 'clean — a person cannot shortcut these',
                    inconclusive: 'inconclusive — needs more items, not more argument',
                    void: 'VOID — too many abstentions to read as anything',
                    'not-enough': 'not enough answered' }[s.reading]
  console.log(`  ${d}`)
  console.log(`    ${s.correct}/${s.n} = ${s.pct.toFixed(1)}%   control ${s.control.toFixed(1)}%   margin ${s.margin >= 0 ? '+' : ''}${s.margin.toFixed(1)}`)
  console.log(`    ${verdict}\n`)
}

console.log('n=15 per cohort is COARSE — roughly +/-13 points. "clean" means a')
console.log('15-item sample found nothing, which is not the same as verified.\n')

const notes = rows.filter(r => r.note && r.note.trim())
if (notes.length) {
  console.log(`${notes.length} note(s) — read these regardless of the verdicts; every defect no`)
  console.log('automated check caught has come out of them:')
  for (const r of notes) console.log(`  · [${meta.get(r.item_id)?.domain ?? '?'}] ${r.note.trim()}`)
  console.log('')
}
const flagged = rows.filter(r => r.verdict && r.verdict !== 'unique')
if (flagged.length) {
  console.log(`${flagged.length} item(s) flagged at step 2 as not the only defensible answer:`)
  for (const r of flagged) console.log(`  · ${r.item_id}  [${meta.get(r.item_id)?.domain ?? '?'}]  ${r.verdict}`)
  console.log('')
}
