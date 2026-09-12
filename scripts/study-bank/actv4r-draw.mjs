/* Sibling-free options-only attack render for the REPAIRED ACT English
 * Conventions items (act-english-v4r).
 *
 * The bar this is measured against is NOT zero. The matched live control run
 * today put shipped ACT English Conventions at 68.0% (17/25) options-only,
 * against a derived 26.7% line -- the family leaks to this instrument by
 * construction, and B7 already showed a human at 10.0% where the model scored
 * 76-79%. The original v4 scored 100.0% (27/27), p=0.0014 against live, and
 * that gap is what the repair targeted. So:
 *
 *     v4 before repair   27/27 = 100.0%
 *     shipped live bank  17/25 =  68.0%   <- the target, not 25%
 *     v4r                     ?
 *
 * A v4r result near 68% means the repair worked. Near 100% means it did not.
 * Below ~50% would mean the repair overshot and stripped the items of the
 * mechanical grammar ACT actually tests.
 *
 * SIBLING-FREE, mirroring how both v4 and the live control were attacked: ACT
 * English is passage-drawn, and a solver who sees two items from one passage
 * reconstructs the passage. 27 Conventions items sit across 5 passages, so one
 * file holds at most 5 and six files are needed. Sibling-freedom is ASSERTED.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const B = JSON.parse(readFileSync('scripts/study-bank/act-english-v4r.batch.json', 'utf8'))
const cse = B.filter(i => i.domain === 'Conventions of Standard English')
const widths = [...new Set(cse.map(i => i.choices.length))]
if (widths.length !== 1) { console.error('REFUSING: mixed widths ' + widths); process.exit(2) }
const SLOT = ['A', 'B', 'C', 'D'].slice(0, widths[0])

let s = 20260912 >>> 0
const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32)
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }

const byPassage = new Map()
for (const it of shuffle(cse)) {
  const p = it.passage_id
  if (!byPassage.has(p)) byPassage.set(p, [])
  byPassage.get(p).push(it)
}
const passages = [...byPassage.keys()]
const deepest = Math.max(...[...byPassage.values()].map(v => v.length))
console.log('Conventions items: ' + cse.length + ' across ' + passages.length + ' passages')
console.log('per passage: ' + JSON.stringify(Object.fromEntries([...byPassage].map(([k, v]) => [k, v.length]))))
console.log('files needed (one item per passage per file): ' + deepest)

/* Slots are dealt GLOBALLY, not per file. A round-robin inside a 5-item file
 * gives A,B,C,D,A -- and six such files pool to A:11 B:6 C:5 D:5, a 40.7%
 * best-fixed-letter control. The live Conventions control this is measured
 * against sits at 32.0%, so a per-file deal would have compared two different
 * instruments. Dealing across all 27 first gives 7/7/7/6 = 25.9%. */
const globalSlot = new Map()
{
  const all = []
  for (let f = 0; f < deepest; f++) for (const [, items] of byPassage) if (items[f]) all.push(items[f])
  all.forEach((it, i) => globalSlot.set(it.id, SLOT[i % SLOT.length]))
  const t = {}; for (const v of globalSlot.values()) t[v] = (t[v] ?? 0) + 1
  const ctl = 100 * Math.max(...Object.values(t)) / all.length
  console.log('global deal ' + JSON.stringify(t) + '  ->  best-fixed-letter control ' + ctl.toFixed(1) + '%')
}

let total = 0
for (let f = 0; f < deepest; f++) {
  const picked = []
  for (const [, items] of byPassage) if (items[f]) picked.push(items[f])
  const ps = picked.map(i => i.passage_id)
  if (new Set(ps).size !== ps.length) { console.error('REFUSING: file ' + (f + 1) + ' has two items from one passage'); process.exit(2) }

  const order = shuffle(picked)
  const blind = {}, key = {}
  order.forEach((it, i) => {
    const want = globalSlot.get(it.id)
    const ch = it.choices.map(String)
    const ci = ch.findIndex(c => c === String(it.correct_answer))
    if (ci < 0) { console.error('REFUSING: key absent from choices on ' + it.id); process.exit(2) }
    const rest = shuffle(ch.filter((_, j) => j !== ci))
    let r = 0
    const out = SLOT.map(sl => (sl === want ? ch[ci] : rest[r++]))
    const bid = 'R' + (f + 1) + '-' + String(i + 1).padStart(2, '0')
    blind[bid] = { options: Object.fromEntries(SLOT.map((sl, j) => [sl, out[j]])) }
    key[bid] = { letter: want, localId: it.id, subskill: it.subskill ?? null }
  })
  const dealt = {}; for (const k of Object.values(key)) dealt[k.letter] = (dealt[k.letter] ?? 0) + 1
  writeFileSync(`scripts/study-bank/act-en-v4r-f${f + 1}.blind.json`, JSON.stringify(blind, null, 1) + '\n')
  writeFileSync(`scripts/study-bank/act-en-v4r-f${f + 1}.key.json`, JSON.stringify(key, null, 1) + '\n')
  total += order.length
  console.log('  file ' + (f + 1) + ': ' + order.length + ' items, ' + new Set(ps).size + ' passages, keys ' + JSON.stringify(dealt))
}
console.log('')
console.log('total ' + total + ' of ' + cse.length + ' Conventions items rendered sibling-free')
console.log('Keys dealt globally, so the POOLED control is the one to score against; per-file counts below are uneven by construction and must not be used alone.')
