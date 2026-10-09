#!/usr/bin/env node
/**
 * isee-verbal-s23-withsource.mjs <syn|sc> [tag]
 *
 * s23: isee-verbal-s22-withsource.mjs with ONE added drop rule, from s22's
 * IS22B-02 ("had become ------- to the score"): grader a named ALL THREE
 * distractors free eliminations (only "disproportionate" takes "to"), no blind
 * sample certainly rejected anything, and no second grader named the same
 * option - so no rule fired and a stem-side tell shipped. Now:
 *   a single grader naming EVERY distractor of an item as a free elimination
 *   -> DROP (the item is answerable from grammar alone by that grader's read).
 * Break-test, run for the prereg on a scratch copy of s22 SC: reproduces s22's
 * 32/45 except IS22B-02, which now drops (31/45), and nothing else moves.
 *
 * --- s22's header, unchanged below ---
 *
 * s21's with-source rules (isee-verbal-s21-withsource.mjs, unchanged in what
 * they drop), with ONE change, made because s21's change-5 rule was never
 * exercised on a real grader file: every s21 grader wrote free_elimination
 * null on all 70 items, so the rule's only test was a scratch injection, and
 * the script read the field with String(x).toLowerCase() - an object
 * {option, reason} would have become "[object object]", an array of two
 * words "a,b", and neither would ever match an option or another grader.
 * Silent, and always in the direction of keeping the item.
 *
 * So each grader field is now PARSED against the item before any rule runs:
 *   pick               a string equal to one of the item's choices
 *   second_defensible  null | "" | a choice | [choices]   (s21 graders: null or string)
 *   free_elimination   null | "" | a choice | [choices]   (s21 graders: always null)
 *   above_band         [] | [words] | a word, each word the headword or a choice
 *                      (s21 graders: array; one grader wrote 'PROMULGATE' upper-case)
 *   reads_correctly    SC: true | false;  syn: anything
 *   difficulty         easy | medium | hard
 * Anything else - an object, a number, a word that is not on the item - REFUSES
 * (exit 2) and names the grader, item and value. A refusal means re-ask the
 * grader for that field; it never means drop or keep.
 *
 * Per-item DROP (s19/s20/s21): any grader picks a non-key or names a second
 * defensible option; any grader marks the headword or KEY above band, or >= 2
 * mark the same distractor above band; a grader-named free elimination that
 * >= 2 blind samples also certainly rejected; a free elimination >= 2 graders
 * name on the SAME option; (SC) any grader says the key-completed sentence does
 * not read correctly; difficulty = median of three; SC median easy -> DROP.
 * Stage bar: FAIL if any grader is off key on > 10% of the type's items.
 * Writes <tag>.withsource.json in qc.json shape.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const type = process.argv[2]
if (!['syn', 'sc'].includes(type)) { console.error('usage: <syn|sc> [tag]'); process.exit(2) }
const D = 'scripts/study-bank'
const tag = process.argv[3] ?? `isee-verbal-s23-${type}`
const batch = JSON.parse(readFileSync(`${D}/${tag}.batch.json`, 'utf8'))
if (!Array.isArray(batch) || !batch.length) { console.error(`REFUSING: ${tag}.batch.json holds no items`); process.exit(2) }
const G = ['a', 'b', 'c'].map(g => [g, JSON.parse(readFileSync(`${D}/${tag}.grader-${g}.json`, 'utf8'))])
const ookey = JSON.parse(readFileSync(`${D}/${tag}-oo.key.json`, 'utf8'))
const ooblind = JSON.parse(readFileSync(`${D}/${tag}-oo.blind.json`, 'utf8'))
const S = ['a', 'b', 'c'].map(s => JSON.parse(readFileSync(`${D}/${tag}-oo.solver-${s}.json`, 'utf8')))
const blindOf = Object.fromEntries(Object.entries(ookey).filter(([, v]) => v.kind === 'candidate').map(([bid, v]) => [v.localId, bid]))
const norm = s => String(s ?? '').trim().toLowerCase()
const refuse = (g, id, field, v) => { console.error(`REFUSING: grader ${g} ${id} ${field} = ${JSON.stringify(v)} is not a readable value (see header)`); process.exit(2) }
const headOf = it => type === 'syn' ? norm(it.prompt.replace(/^\[Synonym\]\s*/, '')) : null

// Parse one grader row into the shape every rule below reads.
function parse(g, it, r) {
  if (!r || typeof r !== 'object') refuse(g, it.id, 'row', r)
  const ch = it.choices.map(norm)
  if (typeof r.pick !== 'string' || !ch.includes(norm(r.pick))) refuse(g, it.id, 'pick', r.pick)
  const choiceList = (field, v) => {
    if (v === null || v === undefined || v === '' || v === false) return []
    const arr = typeof v === 'string' ? [v] : Array.isArray(v) ? v : refuse(g, it.id, field, v)
    return arr.map(x => { if (typeof x !== 'string' || !ch.includes(norm(x))) refuse(g, it.id, field, v); return norm(x) })
  }
  const onItem = [...ch, ...(headOf(it) ? [headOf(it)] : [])]
  const ab = r.above_band
  const abArr = ab === null || ab === undefined || ab === '' ? [] : typeof ab === 'string' ? [ab] : Array.isArray(ab) ? ab : refuse(g, it.id, 'above_band', ab)
  const above = abArr.map(x => { if (typeof x !== 'string' || !onItem.includes(norm(x))) refuse(g, it.id, 'above_band', ab); return norm(x) })
  if (!['easy', 'medium', 'hard'].includes(r.difficulty)) refuse(g, it.id, 'difficulty', r.difficulty)
  if (type === 'sc' && typeof r.reads_correctly !== 'boolean') refuse(g, it.id, 'reads_correctly', r.reads_correctly)
  return {
    pick: norm(r.pick), second: choiceList('second_defensible', r.second_defensible).filter(x => x !== norm(r.pick)),
    fe: choiceList('free_elimination', r.free_elimination), above, difficulty: r.difficulty, reads: r.reads_correctly,
  }
}
const P = Object.fromEntries(G.map(([g, f]) => [g, Object.fromEntries(batch.map(it => [it.id, parse(g, it, f[it.id])]))]))

const rank = { easy: 0, medium: 1, hard: 2 }, name = ['easy', 'medium', 'hard']
const out = {}
const off = { a: 0, b: 0, c: 0 }
let feNamed = 0
for (const it of batch) {
  const key = norm(it.correct_answer), headword = headOf(it)
  const reasons = []
  let votes = 0
  const aboveCount = {}, feCount = {}
  for (const [g] of G) {
    const r = P[g][it.id]
    if (r.pick === key) votes++; else { off[g]++; reasons.push(`grader ${g} picked ${r.pick}`) }
    for (const s of r.second) reasons.push(`grader ${g} second defensible: ${s}`)
    for (const w of r.above) {
      if (w === key || w === headword) reasons.push(`grader ${g} marks ${w === key ? 'key' : 'headword'} '${w}' above band`)
      else aboveCount[w] = (aboveCount[w] ?? 0) + 1
    }
    if (type === 'sc' && r.reads === false) reasons.push(`grader ${g}: key-completed sentence does not read correctly`)
    for (const fe of r.fe) {
      feNamed++
      feCount[fe] = (feCount[fe] ?? 0) + 1
      const bid = blindOf[it.id]
      const letter = bid && Object.entries(ooblind[bid].options).find(([, t]) => norm(t) === fe)?.[0]
      const certain = letter ? S.filter(s => s[bid]?.reject_certain === true && s[bid]?.reject === letter).length : 0
      if (certain >= 2) reasons.push(`free elimination '${fe}' (grader ${g}) also certainly rejected by ${certain} blind samples`)
    }
  }
  for (const [w, n] of Object.entries(aboveCount)) if (n >= 2) reasons.push(`${n} graders mark distractor '${w}' above band`)
  for (const [w, n] of Object.entries(feCount)) if (n >= 2) reasons.push(`${n} graders name free elimination '${w}'`)
  const distractors = it.choices.map(norm).filter(c => c !== key)
  for (const [g] of G) if (distractors.every(d => P[g][it.id].fe.includes(d))) reasons.push(`grader ${g} names every distractor a free elimination`)
  const med = name[G.map(([g]) => rank[P[g][it.id].difficulty]).sort((a, b) => a - b)[1]]
  if (type === 'sc' && med === 'easy') reasons.push('median easy')
  out[it.id] = {
    keep: reasons.length === 0, key_votes: votes, difficulty: med,
    exclusivity: G.some(([g]) => P[g][it.id].second.length) ? 'second-defensible' : 'exclusive',
    graders: Object.fromEntries(G.map(([g]) => [g, P[g][it.id].difficulty])), authored: it.difficulty, drop_reasons: reasons,
  }
}
writeFileSync(`${D}/${tag}.withsource.json`, JSON.stringify(out, null, 1) + '\n')
const n = batch.length
const kept = Object.values(out).filter(v => v.keep)
const bar = Object.entries(off).map(([g, k]) => `${g} ${n - k}/${n}`).join(', ')
const fail = Object.values(off).some(k => k / n > 0.10)
console.log(`${tag}: parsed ${G.length} graders x ${n} items; free eliminations named ${feNamed}`)
console.log(`  on key ${bar}; stage bar (any grader > 10% off key) -> ${fail ? 'FAIL' : 'PASS'}`)
const tally = l => ['easy', 'medium', 'hard'].map(d => l.filter(v => v.difficulty === d).length).join('/')
console.log(`  kept ${kept.length} of ${n} (e/m/h ${tally(kept)}); all medians e/m/h ${tally(Object.values(out))}`)
const why = {}
for (const v of Object.values(out)) for (const r of v.drop_reasons) { const k = r.replace(/'[^']*'/g, "'…'").replace(/grader [abc]/g, 'grader').replace(/\d+ (graders|blind)/, 'N $1').replace(/picked .*/, 'picked non-key').replace(/defensible: .*/, 'defensible'); why[k] = (why[k] ?? 0) + 1 }
for (const [k, c] of Object.entries(why).sort((a, b) => b[1] - a[1])) console.log(`    ${c} x ${k}`)
const byAuthor = {}
for (const [id, v] of Object.entries(out)) { const a = id.replace(/-\d+$/, ''); byAuthor[a] ??= [0, 0]; byAuthor[a][1]++; if (v.keep) byAuthor[a][0]++ }
console.log(`  kept by author: ${Object.entries(byAuthor).map(([a, [k, t]]) => `${a} ${k}/${t}`).join(', ')}`)
console.log(`  authored hard -> banked e/m/h ${tally(Object.values(out).filter(v => v.authored === 'hard'))}; authored medium -> ${tally(Object.values(out).filter(v => v.authored === 'medium'))}; authored easy -> ${tally(Object.values(out).filter(v => v.authored === 'easy'))}`)
for (const [id, v] of Object.entries(out)) if (!v.keep) console.log(`  DROP ${id}: ${v.drop_reasons.join('; ')}`)
