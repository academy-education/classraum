#!/usr/bin/env node
/**
 * isee-verbal-s18-oo-score.mjs <tag>   e.g. isee-verbal-s18-sc-oo
 *
 * Scores the options-only render of a make-oo-render.mjs file against its
 * interleaved live control, exactly as isee-verbal-s18.prereg.md defines it:
 *   M = arm rate - arm best-fixed-letter (from the arm's own deal), pooled over samples
 *   E = M_candidate - M_live          (PASS <= +10)
 *   SC: also E against the single-blank live controls alone (two-blank key contains "..")
 *   ceiling: live arm >= 85% -> SATURATED, no verdict
 * Elimination: item certainly eliminable when >= 2 samples reject_certain the SAME
 * non-key letter. Refuses (exit 2) if any sample did not answer every item.
 */
import { readFileSync, readdirSync } from 'node:fs'
const tag = process.argv[2]
if (!tag) { console.error('usage: <tag>'); process.exit(2) }
const DIR = 'scripts/study-bank'
const key = JSON.parse(readFileSync(`${DIR}/${tag}.key.json`, 'utf8'))
const blind = JSON.parse(readFileSync(`${DIR}/${tag}.blind.json`, 'utf8'))
const files = readdirSync(DIR).filter(f => f.startsWith(`${tag}.solver-`) && f.endsWith('.json')).sort()
if (files.length < 3) { console.error(`REFUSING: ${files.length} solver files, need 3`); process.exit(2) }
const S = files.map(f => JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8')))
const ids = Object.keys(key)
for (const [i, s] of S.entries()) {
  const ok = ids.filter(id => ['A', 'B', 'C', 'D'].includes(s[id]?.pick)).length
  console.log(`  ${files[i]}: ${ok} of ${ids.length} picks readable; reject_certain=true on ${ids.filter(id => s[id]?.reject_certain === true).length}`)
  if (ok !== ids.length) { console.error('REFUSING: partial sample'); process.exit(2) }
}
const twoBlank = id => String(blind[id].options[key[id].letter]).includes('..')
const arms = {
  candidate: ids.filter(id => key[id].kind === 'candidate'),
  live: ids.filter(id => key[id].kind === 'live-control'),
}
arms['live single-blank'] = arms.live.filter(id => !twoBlank(id))
const stat = (list) => {
  const deal = {}; for (const id of list) deal[key[id].letter] = (deal[key[id].letter] ?? 0) + 1
  const line = 100 * Math.max(...Object.values(deal)) / list.length
  let hit = 0; for (const s of S) for (const id of list) if (s[id].pick === key[id].letter) hit++
  const rate = 100 * hit / (list.length * S.length)
  let unan = 0; for (const id of list) if (S.every(s => s[id].pick === key[id].letter)) unan++
  let elim = 0
  for (const id of list) {
    const c = {}
    for (const s of S) if (s[id].reject_certain === true && s[id].reject && s[id].reject !== key[id].letter) c[s[id].reject] = (c[s[id].reject] ?? 0) + 1
    if (Object.values(c).some(v => v >= 2)) elim++
  }
  return { n: list.length, hit, rate, line, M: rate - line, unan, elim }
}
const r = Object.fromEntries(Object.entries(arms).map(([k, v]) => [k, stat(v)]))
for (const [k, a] of Object.entries(r)) console.log(`  ${k.padEnd(18)} n=${String(a.n).padStart(3)}  ${a.hit}/${a.n * S.length} = ${a.rate.toFixed(1)}%  letter ${a.line.toFixed(1)}%  M ${a.M >= 0 ? '+' : ''}${a.M.toFixed(1)}  unanimous ${a.unan}/${a.n}  certainly-eliminable ${a.elim}/${a.n}`)
let pairs = 0, agree = 0
for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) for (const id of ids) { pairs++; if (S[i][id].pick === S[j][id].pick) agree++ }
console.log(`  pairwise agreement ${(100 * agree / pairs).toFixed(1)}%`)
const verdicts = []
for (const ctl of ['live', 'live single-blank']) {
  if (!r[ctl].n) continue
  const E = r.candidate.M - r[ctl].M
  const sat = r[ctl].rate >= 85
  const under = ctl === 'live single-blank' && r[ctl].n < 12
  const floor = r[ctl].rate < r[ctl].line
  const v = sat ? 'SATURATED (no verdict -> HOLD)' : E <= 10 ? 'PASS' : 'HOLD'
  verdicts.push(under ? null : v)
  console.log(`  EXCESS vs ${ctl}: ${E >= 0 ? '+' : ''}${E.toFixed(1)} -> ${v}${under ? ' (UNDERPOWERED, n<12: reported only)' : ''}${floor ? ' [live arm below its letter line]' : ''}`)
}
const vs = verdicts.filter(Boolean)
const elimBar = Math.max(100 * r.live.elim / r.live.n, 5)
const elimPass = 100 * r.candidate.elim / r.candidate.n <= elimBar
console.log(`  NOSOURCE: ${vs.every(v => v === 'PASS') ? 'PASS' : 'HOLD'}`)
console.log(`  ELIMINATION: candidate ${r.candidate.elim}/${r.candidate.n} vs bar max(live ${r.live.elim}/${r.live.n}, 5%) = ${elimBar.toFixed(1)}% -> ${elimPass ? 'PASS' : 'FAIL'}`)
const byAuthor = {}
for (const id of arms.candidate) { const a = key[id].localId.replace(/-\d+$/, ''); (byAuthor[a] ??= []).push(id) }
for (const [a, l] of Object.entries(byAuthor)) { const s = stat(l); console.log(`    by author ${a}: ${s.hit}/${s.n * S.length} = ${s.rate.toFixed(1)}%`) }
