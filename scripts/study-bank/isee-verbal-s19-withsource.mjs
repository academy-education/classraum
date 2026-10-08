#!/usr/bin/env node
/**
 * isee-verbal-s19-withsource.mjs <syn|sc>
 *
 * Applies isee-verbal-s19.prereg.md's with-source rules to the three grader
 * files and writes isee-verbal-s19-<type>.withsource.json in qc.json shape
 * ({ id: { keep, key_votes, difficulty, exclusivity, graders, authored, drop_reasons } }).
 *
 * Per-item DROP: any grader picks a non-key or names a second defensible
 * option; any grader marks the headword or KEY above band, or >= 2 graders mark
 * the same distractor above band; a grader-named free elimination that >= 2
 * blind samples also certainly rejected; (SC) any grader says the key-completed
 * sentence does not read correctly; difficulty = median of three; SC median
 * easy -> DROP. Stage bar: FAIL if any grader is off key on > 10% of items.
 *
 * Refuses (exit 2) unless every grader answered every item with a readable
 * pick that is one of the item's choices.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const type = process.argv[2]
if (!['syn', 'sc'].includes(type)) { console.error('usage: <syn|sc>'); process.exit(2) }
const D = 'scripts/study-bank'
const tag = (process.argv[3] ?? `isee-verbal-s19-${type}`)  // optional tag: s20 passes isee-verbal-s20-sc
const batch = JSON.parse(readFileSync(`${D}/${tag}.batch.json`, 'utf8'))
const G = ['a', 'b', 'c'].map(g => [g, JSON.parse(readFileSync(`${D}/${tag}.grader-${g}.json`, 'utf8'))])
const ookey = JSON.parse(readFileSync(`${D}/${tag}-oo.key.json`, 'utf8'))
const ooblind = JSON.parse(readFileSync(`${D}/${tag}-oo.blind.json`, 'utf8'))
const S = ['a', 'b', 'c'].map(s => JSON.parse(readFileSync(`${D}/${tag}-oo.solver-${s}.json`, 'utf8')))
const blindOf = Object.fromEntries(Object.entries(ookey).filter(([, v]) => v.kind === 'candidate').map(([bid, v]) => [v.localId, bid]))
const norm = s => String(s ?? '').trim().toLowerCase()
for (const [g, f] of G) for (const it of batch) {
  const r = f[it.id]
  if (!r || !it.choices.map(norm).includes(norm(r.pick))) { console.error(`REFUSING: grader ${g} has no readable pick for ${it.id} (${r?.pick})`); process.exit(2) }
}
const rank = { easy: 0, medium: 1, hard: 2 }, name = ['easy', 'medium', 'hard']
const out = {}
const off = { a: 0, b: 0, c: 0 }
for (const it of batch) {
  const key = norm(it.correct_answer)
  const reasons = []
  const headword = type === 'syn' ? norm(it.prompt.replace(/^\[Synonym\]\s*/, '')) : null
  let votes = 0
  const aboveCount = {}
  for (const [g, f] of G) {
    const r = f[it.id]
    if (norm(r.pick) === key) votes++; else { off[g]++; reasons.push(`grader ${g} picked ${r.pick}`) }
    if (r.second_defensible && norm(r.second_defensible) !== norm(r.pick)) reasons.push(`grader ${g} second defensible: ${r.second_defensible}`)
    for (const w of (r.above_band ?? []).map(norm)) {
      if (w === key || w === headword) reasons.push(`grader ${g} marks ${w === key ? 'key' : 'headword'} '${w}' above band`)
      else aboveCount[w] = (aboveCount[w] ?? 0) + 1
    }
    if (type === 'sc' && r.reads_correctly === false) reasons.push(`grader ${g}: key-completed sentence does not read correctly`)
    if (r.free_elimination) {
      const fe = norm(r.free_elimination)
      const bid = blindOf[it.id]
      const letter = bid && Object.entries(ooblind[bid].options).find(([, t]) => norm(t) === fe)?.[0]
      const certain = letter ? S.filter(s => s[bid]?.reject_certain === true && s[bid]?.reject === letter).length : 0
      if (certain >= 2) reasons.push(`free elimination '${fe}' (grader ${g}) also certainly rejected by ${certain} blind samples`)
    }
  }
  for (const [w, n] of Object.entries(aboveCount)) if (n >= 2) reasons.push(`${n} graders mark distractor '${w}' above band`)
  const labels = G.map(([, f]) => f[it.id].difficulty)
  if (labels.some(l => !(l in rank))) { console.error(`REFUSING: unreadable difficulty on ${it.id}: ${labels}`); process.exit(2) }
  const med = name[labels.map(l => rank[l]).sort((a, b) => a - b)[1]]
  if (type === 'sc' && med === 'easy') reasons.push('median easy')
  out[it.id] = {
    keep: reasons.length === 0, key_votes: votes, difficulty: med,
    exclusivity: G.some(([, f]) => f[it.id].second_defensible) ? 'second-defensible' : 'exclusive',
    graders: Object.fromEntries(G.map(([g, f]) => [g, f[it.id].difficulty])), authored: it.difficulty, drop_reasons: reasons,
  }
}
writeFileSync(`${D}/${tag}.withsource.json`, JSON.stringify(out, null, 1) + '\n')
const n = batch.length
const kept = Object.values(out).filter(v => v.keep)
const bar = Object.entries(off).map(([g, k]) => `${g} ${n - k}/${n}`).join(', ')
const fail = Object.values(off).some(k => k / n > 0.10)
console.log(`${tag}: on key ${bar}; stage bar (any grader > 10% off key) -> ${fail ? 'FAIL' : 'PASS'}`)
const tally = l => ['easy', 'medium', 'hard'].map(d => l.filter(v => v.difficulty === d).length).join('/')
console.log(`  kept ${kept.length} of ${n} (e/m/h ${tally(kept)}); all medians e/m/h ${tally(Object.values(out))}`)
const why = {}
for (const v of Object.values(out)) for (const r of v.drop_reasons) { const k = r.replace(/'[^']*'/g, "'…'").replace(/grader [abc]/g, 'grader').replace(/\d+ (graders|blind)/, 'N $1').replace(/picked .*/, 'picked non-key').replace(/defensible: .*/, 'defensible'); why[k] = (why[k] ?? 0) + 1 }
for (const [k, c] of Object.entries(why).sort((a, b) => b[1] - a[1])) console.log(`    ${c} x ${k}`)
const byAuthor = {}
for (const [id, v] of Object.entries(out)) { const a = id.replace(/-\d+$/, ''); byAuthor[a] ??= [0, 0]; byAuthor[a][1]++; if (v.keep) byAuthor[a][0]++ }
console.log(`  kept by author: ${Object.entries(byAuthor).map(([a, [k, t]]) => `${a} ${k}/${t}`).join(', ')}`)
const authHard = Object.values(out).filter(v => v.authored === 'hard')
console.log(`  authored hard -> banked e/m/h ${tally(authHard)}; authored medium -> ${tally(Object.values(out).filter(v => v.authored === 'medium'))}; authored easy -> ${tally(Object.values(out).filter(v => v.authored === 'easy'))}`)
