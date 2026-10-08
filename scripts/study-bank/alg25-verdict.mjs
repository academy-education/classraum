#!/usr/bin/env node
/**
 * alg25-verdict.mjs <frozen.batch.json> <grader.json> <grader.json> <grader.json>
 *
 * Applies PREREG-ALG25-2026-10-08.md's per-item bars to three with-source grader
 * files (stage 2, each carrying its stage-1 fields). Written before any grader
 * ran. Prints one line per item and writes m25alg.verdict.json next to the batch.
 *
 * Drops (any one): 1 key disputed (key_ok false by any grader) | 2 not exclusive
 * by majority | 3 distractors weak by majority | 4 median n_struck >= 2, or the
 * key struck by any grader | 5 path incoherent (any grader; listed for a hand
 * confirmation, printed as CONFIRM) | 6 majority plug-back <= 2 routine |
 * 7 majority names an EARLIER id as one template | EXT-1 drop_recommend by any.
 * HOLD: off-blueprint by majority. Difficulty: panel median; easy -> REJECT.
 * Refuses (exit 2) if any grader file misses an item or the batch is empty.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const [bp, ...gp] = process.argv.slice(2)
if (!bp || gp.length !== 3) { console.error('usage: alg25-verdict.mjs <frozen.batch.json> <g1.json> <g2.json> <g3.json>'); process.exit(2) }
const items = JSON.parse(readFileSync(bp, 'utf8'))
if (!Array.isArray(items) || !items.length) { console.error('REFUSING: empty batch'); process.exit(2) }
const G = gp.map(p => JSON.parse(readFileSync(p, 'utf8')))
for (const [i, g] of G.entries()) for (const it of items) if (!g[it.id]) { console.error(`REFUSING: ${gp[i]} has no row for ${it.id}`); process.exit(2) }
const val = s => { const t = String(s).trim().replace(/−/g, '-'); const m = t.match(/^(-?)(\d+)\s*\/\s*(\d+)$/); return m ? (m[1] ? -1 : 1) * m[2] / m[3] : Number(t) }
const same = (a, b) => Math.abs(val(a) - val(b)) < 1e-9
const order = new Map(items.map((x, i) => [x.id, i]))
const RANK = { easy: 0, medium: 1, hard: 2 }
const out = {}
for (const it of items) {
  const R = G.map(g => g[it.id])
  const why = []
  const keyVotes = R.filter(r => same(r.my_answer, it.correct_answer)).length
  if (R.some(r => r.key_ok === false)) why.push(`rule1 key disputed (${R.filter(r => r.key_ok === false).length}/3)`)
  if (R.filter(r => r.exclusive === false).length >= 2) why.push('rule2 not exclusive by majority')
  if (R.filter(r => r.distractors_weak === true).length >= 2) why.push('rule3 distractors weak by majority')
  const ns = R.map(r => Number(r.n_struck) || 0).sort((a, b) => a - b)
  if (ns[1] >= 2) why.push(`rule4 median struck ${ns[1]}`)
  if (R.some(r => (r.struck || []).map(String).some(s => same(s, it.correct_answer)))) why.push('rule4 key struck')
  const pb = R.map(r => r.plugback_tries ?? null)
  if (R.filter(r => r.plugback_routine === true && r.plugback_tries != null && r.plugback_tries <= 2).length >= 2) why.push('rule6 plug-back <= 2 by majority')
  const earlier = {}
  for (const r of R) for (const t of (r.same_template_as || [])) if (order.has(t) && order.get(t) < order.get(it.id)) earlier[t] = (earlier[t] || 0) + 1
  for (const [t, n] of Object.entries(earlier)) if (n >= 2) why.push(`rule7 template of ${t} (${n}/3)`)
  if (R.some(r => r.drop_recommend === true)) why.push(`EXT-1 drop_recommend by ${R.map((r, i) => r.drop_recommend ? 'DEF'[i] : '').join('')}`)
  const confirm = R.some(r => r.path_coherent === false) ? `rule5 path incoherent per ${R.filter(r => r.path_coherent === false).length}/3 - CONFIRM BY HAND` : null
  const offBp = R.filter(r => r.on_blueprint === false).length
  const diffs = R.map(r => r.difficulty)
  const med = diffs.map(d => RANK[d]).sort((a, b) => a - b)[1]
  const difficulty = Object.keys(RANK).find(k => RANK[k] === med)
  let status = why.length ? 'DROP' : offBp >= 2 ? 'HOLD' : difficulty === 'easy' ? 'REJECT-EASY' : 'KEEP'
  out[it.id] = { difficulty, difficulties: diffs, key_votes: keyVotes, n_struck_median: ns[1], struck: R.map(r => r.struck || []),
    plugback: pb, templates: R.map(r => r.same_template_as || []), off_blueprint_votes: offBp,
    off_by_one_named: R.map(r => r.off_by_one_adjacent || null), status, why, confirm }
  console.log(`${it.id.padEnd(10)} ${status.padEnd(11)} ${difficulty.padEnd(6)} [${diffs.join(',')}] key ${keyVotes}/3 struck~${ns[1]}${why.length ? '  ' + why.join('; ') : ''}${confirm ? '  ' + confirm : ''}`)
}
const keep = Object.values(out).filter(v => v.status === 'KEEP')
console.log(`\nKEEP ${keep.length} of ${items.length} (hard ${keep.filter(v => v.difficulty === 'hard').length}, medium ${keep.filter(v => v.difficulty === 'medium').length}); DROP ${Object.values(out).filter(v => v.status === 'DROP').length}; HOLD ${Object.values(out).filter(v => v.status === 'HOLD').length}`)
const vp = bp.replace(/sat-math-v25-alg\.batch\.json$/, 'm25alg.verdict.json')
if (vp === bp) { console.error('REFUSING to write the verdict over the batch: pass sat-math-v25-alg.batch.json'); process.exit(2) }
writeFileSync(vp, JSON.stringify(out, null, 1))
