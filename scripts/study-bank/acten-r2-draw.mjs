/* Sibling-free options-only attack render for act-english-v5r2 + v6r2.
 *
 * Both files were repaired TWICE and neither has ever been attacked:
 *   Conventions — strike-on-sight 6/27 -> 0 (v5), 10/27 -> 0 (v6); number
 *     singleton 2/2 -> 0; doubled joiners 9/27 -> 0.
 *   Production  — Kept/Yes 8/9 = 88.9% -> 5/9 = 55.6% (v5), 8/8 = 100% ->
 *     4/8 = 50.0% (v6), against a live bank at 11/21 = 52.4%.
 *   Placement   — "Point D" was never the key in either file; now keyed once each.
 *
 * THE BAR IS THE LIVE BANK, NOT ZERO. The matched live control run earlier
 * today put shipped ACT English at 73.3% pooled against a derived 26.7%, and
 * per domain: Conventions 68.0%, Knowledge of Language 92.9%, Production 66.7%.
 * B7 separately sat a human on this family at 10.0% where the model scored
 * 76-79%, so a model number here is a screen and not a verdict. A result near
 * the live figures means the repairs held; well above means they did not.
 *
 * ALL 100 ITEMS ARE ATTACKED, not just the repaired Conventions half. The
 * Production repair changed which answer is correct on nine items, and the
 * Kept/Deleted and Yes/No split is visible in the option strings themselves --
 * so it is exactly an options-only channel and must be measured as one.
 *
 * SIBLING-FREE: ACT English is passage-drawn and a solver seeing two items
 * from one passage reconstructs the passage. Ten passages across the two files
 * means a file holds at most ten items, so ten files. Asserted, not intended.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const FILES = ['act-english-v5r2', 'act-english-v6r2']
const items = []
for (const f of FILES) {
  const b = JSON.parse(readFileSync(`scripts/study-bank/${f}.batch.json`, 'utf8'))
  if (b.length !== 50) { console.error(`REFUSING: ${f} holds ${b.length} items, expected 50`); process.exit(2) }
  for (const it of b) items.push({ ...it, _src: f, _pid: `${f}:${it.passage_id}` })
}
const widths = [...new Set(items.map(i => i.choices.length))]
if (widths.length !== 1) { console.error(`REFUSING: mixed widths ${widths}`); process.exit(2) }
const SLOT = ['A', 'B', 'C', 'D'].slice(0, widths[0])

let s = 20260912 >>> 0
const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32)
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }

const byPassage = new Map()
for (const it of shuffle(items)) {
  if (!byPassage.has(it._pid)) byPassage.set(it._pid, [])
  byPassage.get(it._pid).push(it)
}
const depth = Math.max(...[...byPassage.values()].map(v => v.length))
console.log(`${items.length} items across ${byPassage.size} passages; deepest passage ${depth} -> ${depth} files`)

/* Slots dealt GLOBALLY. A round-robin inside each file would pool to a lopsided
 * best-fixed-letter control -- that mistake was caught before the v4r run and
 * is not repeated here. */
const order = []
for (let f = 0; f < depth; f++) for (const [, list] of byPassage) if (list[f]) order.push(list[f])
const slotOf = new Map()
order.forEach((it, i) => slotOf.set(it.id + '@' + it._src, SLOT[i % SLOT.length]))
const tally = {}; for (const v of slotOf.values()) tally[v] = (tally[v] ?? 0) + 1
console.log(`global deal ${JSON.stringify(tally)} -> best-fixed-letter control ${(100 * Math.max(...Object.values(tally)) / order.length).toFixed(1)}%`)

let total = 0
for (let f = 0; f < depth; f++) {
  const picked = []
  for (const [, list] of byPassage) if (list[f]) picked.push(list[f])
  const pids = picked.map(i => i._pid)
  if (new Set(pids).size !== pids.length) { console.error(`REFUSING: file ${f + 1} repeats a passage`); process.exit(2) }

  const blind = {}, key = {}
  shuffle(picked).forEach((it, i) => {
    const want = slotOf.get(it.id + '@' + it._src)
    const ch = it.choices.map(String)
    const ci = ch.findIndex(c => c === String(it.correct_answer))
    if (ci < 0) { console.error(`REFUSING: key absent from choices on ${it._src}:${it.id}`); process.exit(2) }
    const rest = shuffle(ch.filter((_, j) => j !== ci))
    let r = 0
    const out = SLOT.map(sl => (sl === want ? ch[ci] : rest[r++]))
    const bid = `E${f + 1}-${String(i + 1).padStart(2, '0')}`
    blind[bid] = { options: Object.fromEntries(SLOT.map((sl, j) => [sl, out[j]])) }
    key[bid] = { letter: want, localId: it.id, src: it._src, domain: it.domain }
  })
  writeFileSync(`scripts/study-bank/acten-r2-f${f + 1}.blind.json`, JSON.stringify(blind, null, 1) + '\n')
  writeFileSync(`scripts/study-bank/acten-r2-f${f + 1}.key.json`, JSON.stringify(key, null, 1) + '\n')
  total += picked.length
  console.log(`  file ${f + 1}: ${picked.length} items, ${new Set(pids).size} passages`)
}
console.log(`\ntotal ${total} of ${items.length} rendered sibling-free across ${depth} files`)
console.log('Score the POOLED result; per-file counts are uneven by construction.')
