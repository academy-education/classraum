#!/usr/bin/env node
/**
 * merge-halves.mjs <a.batch.json> <b.batch.json> <out.batch.json>
 *
 * Merge two halves of one batch written by two different authors, and check
 * the things that only become visible once they sit together. Splitting a
 * batch was introduced on 2026-09-25 because single-author runs of 14-16 items
 * kept being killed by a no-progress watchdog; it worked, and it created its
 * own defects:
 *
 *   - an option VALUE appearing in several items (15 in four of the fourteen
 *     Algebra items). Two blind solvers noticed exactly this kind of repeat
 *     unprompted on the words-in-context batch.
 *   - a shared KEY value across items
 *   - one author writing a paragraph into `subskill` while the other writes a
 *     label. That is a bank taxonomy column, and it would go into the database
 *     as written.
 *   - two "disjoint" assigned skills that are not actually disjoint. That one
 *     is the commissioner's error, not the authors': A1 "discriminant giving a
 *     quadratic in the parameter" and B8 "parameter in both a coefficient and
 *     the constant" are the same item family under two descriptions.
 *
 * STEM OVERLAP IS REPORTED BUT NOT TRUSTED. Bulk word-Jaccard on maths stems is
 * dominated by boilerplate -- "the equation above", "what is the value of" --
 * and has now produced the same false positive twice, flagging a linear
 * equation, a solve-for-the-coefficient and an absolute-value equation as near
 * duplicates at 0.50-0.60. The line says so on every hit.
 */
import { readFileSync, writeFileSync } from 'node:fs'
const D = 'scripts/study-bank'
const [pa, pb, pout] = process.argv.slice(2)
if (!pa || !pb || !pout) { console.error('usage: merge-halves.mjs <a.batch.json> <b.batch.json> <out.batch.json>'); process.exit(2) }
const a = JSON.parse(readFileSync(pa, 'utf8'))
const b = JSON.parse(readFileSync(pb, 'utf8'))
const all = [...a, ...b]
if (new Set(all.map(i => i.id)).size !== all.length) { console.error('REFUSING: duplicate ids across halves'); process.exit(2) }
console.log(`merged ${a.length} + ${b.length} = ${all.length} items`)

const keys = {}
for (const it of all) (keys[String(it.correct_answer)] ??= []).push(it.id)
const dupKey = Object.entries(keys).filter(([, v]) => v.length > 1)
console.log(dupKey.length ? `SHARED KEY VALUE: ${dupKey.map(([k, v]) => k + ' ' + v.join('/')).join(', ')}` : 'no two items share a key value')

const opt = {}
for (const it of all) for (const c of it.choices) (opt[String(c)] ??= []).push(it.id)
const dupOpt = Object.entries(opt).filter(([, v]) => v.length > 1)
console.log(dupOpt.length ? `OPTION VALUE IN MORE THAN ONE ITEM: ${dupOpt.map(([k, v]) => k + ' ' + v.join('/')).join(', ')}` : 'no option value appears in two items')

const norm = s => String(s).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
const bag = s => new Set(norm(s).split(' ').filter(w => w.length > 4))
for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
  const x = bag(all[i].prompt), y = bag(all[j].prompt)
  let n = 0; for (const w of x) if (y.has(w)) n++
  const jac = n / (x.size + y.size - n)
  /* BULK STEM JACCARD DOES NOT WORK ON MATHS AND THIS IS THE SECOND TIME.
   * It flagged A5/A6 at 0.50 and A6/A7 at 0.60; the three items are a
   * three-denominator linear equation, a solve-for-the-coefficient, and an
   * absolute-value equation. The overlap is entirely boilerplate -- "the
   * equation above", "what is the value of". The same instrument produced the
   * same false positive checking v16-adv against the live bank. Reported as a
   * LOOK-AT-THIS, never as a duplicate. */
  if (jac >= 0.45) console.log(`stem-overlap ${jac.toFixed(2)}: ${all[i].id} / ${all[j].id}  (boilerplate-dominated on maths — read them, do not trust the number)`)
}
/* CLOSURE, over the merged set and within each option set. Added after the
 * merge below snapshotted a half MID-WRITE: the author was still working and
 * its A1 draft `{49, 52, 55, 61}` carried avg(49,55)=52 AND avg(49,61)=55 --
 * the author caught it itself minutes later, and I had already handed the stale
 * file to an auditor. Two lessons, and the tool can only fix one: never merge
 * before the agent reports done, and check closure here so a bad set cannot
 * pass through the merge silently. */
const num = x => { const t = String(x).trim().replace(/[$,%]/g, '')
  if (/^-?\d+\/\d+$/.test(t)) { const [p2, q] = t.split('/').map(Number); return p2 / q }
  return Number(t) }
const near = (x, y) => Number.isFinite(x) && Number.isFinite(y) && Math.abs(x - y) < 1e-9 * Math.max(1, Math.abs(x), Math.abs(y))
let closureHits = 0
for (const it of all) {
  const o = it.choices.map(c => ({ s: String(c), n: num(c) }))
  if (o.some(z => !Number.isFinite(z.n))) continue
  const hits = []
  for (const t of o) for (let i = 0; i < o.length; i++) for (let j = i + 1; j < o.length; j++) {
    const x = o[i], y = o[j]
    if (t.s === x.s || t.s === y.s) continue
    if (near(t.n, x.n + y.n)) hits.push(`${t.s} = ${x.s} + ${y.s}`)
    if (near(t.n, (x.n + y.n) / 2)) hits.push(`${t.s} = avg(${x.s}, ${y.s})`)
    if (near(t.n, x.n * y.n)) hits.push(`${t.s} = ${x.s} x ${y.s}`)
  }
  if (hits.length) { closureHits++
    const isKey = hits.some(h => h.startsWith(String(it.correct_answer) + ' ='))
    console.log(`CLOSURE ${isKey ? 'ON THE KEY' : 'among distractors'} in ${it.id}: ${[...new Set(hits)].join(' ; ')}`) }
}
if (!closureHits) console.log('no option set contains a sum, average or product of two others')

const sub = {}
for (const it of all) (sub[it.subskill] ??= []).push(it.id)
console.log(`\nsubskills (${Object.keys(sub).length} distinct across ${all.length} items):`)
for (const [k, v] of Object.entries(sub).sort((x, y) => y[1].length - x[1].length)) console.log(`  ${String(v.length)}x ${k.padEnd(46)} ${v.join(', ')}`)
const longLabels = all.filter(i => String(i.subskill ?? '').length > 45)
if (longLabels.length) console.log(`\nSUBSKILL IS A TAXONOMY COLUMN, NOT A NOTE FIELD: ${longLabels.length} of ${all.length} items carry a paragraph (${longLabels.map(i => i.id).join(', ')})`)
const triples = Object.entries(sub).filter(([, v]) => v.length >= 3)
console.log(triples.length ? `TRIPLE ON ONE SUBSKILL: ${triples.map(([k, v]) => k + ' (' + v.join(', ') + ')').join('; ')}` : 'no subskill carries three or more items')
writeFileSync(pout, JSON.stringify(all, null, 1))
console.log(`\nwrote ${pout}`)
