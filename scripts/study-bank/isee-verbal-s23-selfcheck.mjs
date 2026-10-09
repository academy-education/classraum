#!/usr/bin/env node
/**
 * isee-verbal-s23-selfcheck.mjs <author.batch.json>
 *
 * s23: s22's self-check unchanged plus ONE forced pick, `blind_guess` (the
 * author's honest best guess at the key with the sentence hidden), under the
 * same < 35% bar - s22 author A's option sets drew 62.2% options-only with no
 * heuristic any sample could name, so none of the four named picks could see it.
 *
 * --- s22's header ---
 * isee-verbal-s22.prereg.md's author self-check. s21's SC check unchanged in
 * kind (rules 1, 2 and the four forced picks), with the bar written as the
 * prereg states it: a heuristic's forced pick may hit the key on FEWER than 35%
 * of the file's items (15 items -> at most 5). Plus, new in s22:
 *
 *   SC   denylist     no option is one of the 20 words graders have already
 *                     marked above band (s18/s20/s21) - the named ceiling's floor
 *   SYN  first-letter the key is the ONLY option sharing the headword's initial
 *                     in at most 2 items of the file (s21's rule for author D)
 *   SYN  gloss_of     every distractor names the headword it glosses
 *   SYN  denylist     headword and options likewise
 *
 * Per SC item the author records, with only the four options visible:
 *   polarity { word: '+'|'-'|'0' }, antonym_pairs [], selfcheck { antonym_pole,
 *   odd_one_out, most_specific, test_word } (each a forced pick among the choices).
 * Reported only: key strictly longest / shortest, key with a unique initial
 * among its options, authored difficulty mix.
 *
 * Exits 1 on any breach, 2 if it cannot read its input (a missing field is a
 * refusal, never a pass).
 */
import { readFileSync, existsSync } from 'node:fs'
export const ABOVE_BAND = ['fusible', 'friable', 'hygroscopic', 'mawkish', 'intranasally', 'lachrymose', 'sedulous', 'recondite',
  'raffish', 'plangent', 'pellucid', 'scabrous', 'bilious', 'abstemious', 'avuncular', 'ductile', 'commodious', 'venal',
  'sententious', 'promulgate']
const path = process.argv[2]
if (!path || !existsSync(path)) { console.error(`REFUSING: ${path} does not exist`); process.exit(2) }
const b = JSON.parse(readFileSync(path, 'utf8'))
if (!Array.isArray(b) || !b.length) { console.error(`REFUSING: ${path} holds no items`); process.exit(2) }
const kinds = [...new Set(b.map(it => it.kind))]
if (kinds.length !== 1 || !['synonym', 'sentence completion'].includes(kinds[0])) { console.error(`REFUSING: ${path} mixes or lacks kinds: ${kinds}`); process.exit(2) }
const isSyn = kinds[0] === 'synonym'
const H = ['antonym_pole', 'odd_one_out', 'most_specific', 'test_word', 'blind_guess']
const hits = Object.fromEntries(H.map(h => [h, 0]))
const problems = []
let longest = 0, shortest = 0, uniqInitial = 0, firstLetter = 0
for (const it of b) {
  const ch = it.choices ?? [], key = it.correct_answer
  if (ch.length !== 4 || !ch.includes(key)) { console.error(`REFUSING: ${it.id} needs 4 choices with the key among them`); process.exit(2) }
  const words = isSyn ? [it.prompt.replace(/^\[Synonym\]\s*/, '').toLowerCase(), ...ch] : ch
  for (const w of words) if (ABOVE_BAND.includes(String(w).toLowerCase())) problems.push(`${it.id}: DENYLIST '${w}' was marked above band by graders before`)
  if (isSyn) {
    const hw = it.prompt.replace(/^\[Synonym\]\s*/, '').toLowerCase()
    const g = it.gloss_of
    if (!g || ch.filter(c => c !== key).some(c => typeof g[c] !== 'string' || !g[c].trim())) { console.error(`REFUSING: ${it.id} gloss_of must name a headword for every distractor`); process.exit(2) }
    const share = ch.filter(c => c[0] === hw[0])
    if (share.length === 1 && share[0] === key) firstLetter++
  } else {
    const pol = it.polarity, sc = it.selfcheck
    if (!pol || ch.some(c => !['+', '-', '0'].includes(pol[c]))) { console.error(`REFUSING: ${it.id} polarity missing or not +/-/0 for every choice`); process.exit(2) }
    if (!sc || H.some(h => !ch.includes(sc[h]))) { console.error(`REFUSING: ${it.id} selfcheck must name a choice for ${H.join(', ')}`); process.exit(2) }
    if (!Array.isArray(it.antonym_pairs)) { console.error(`REFUSING: ${it.id} antonym_pairs missing (record [] when none)`); process.exit(2) }
    if (it.antonym_pairs.length) problems.push(`${it.id}: RULE 1 antonym pair(s) declared ${JSON.stringify(it.antonym_pairs)}`)
    const count = {}; for (const c of ch) count[pol[c]] = (count[pol[c]] ?? 0) + 1
    for (const [v, n] of Object.entries(count)) if (v !== pol[key] && n >= 3) problems.push(`${it.id}: RULE 2 ${n} options share polarity '${v}' the key '${key}' (${pol[key]}) lacks`)
    for (const h of H) if (sc[h] === key) hits[h]++
  }
  const L = ch.map(c => c.length), k = key.length
  if (L.filter(x => x >= k).length === 1) longest++
  if (L.filter(x => x <= k).length === 1) shortest++
  if (ch.filter(c => c[0] === key[0]).length === 1) uniqInitial++
}
const n = b.length, pct = x => (100 * x / n).toFixed(1)
console.log(`${path}: ${n} ${kinds[0]} items`)
if (isSyn) {
  const ok = firstLetter <= 2
  if (!ok) problems.push(`FIRST-LETTER key is the only option sharing the headword initial on ${firstLetter}/${n} (bar <= 2)`)
  console.log(`  first-letter  key the only option sharing the headword initial ${firstLetter}/${n}  ${ok ? 'ok' : 'OVER'} (bar <= 2)`)
} else for (const h of H) {
  const ok = hits[h] / n < 0.35
  if (!ok) problems.push(`RULE 4 ${h} hits the key on ${hits[h]}/${n} = ${pct(hits[h])}% (bar < 35%)`)
  console.log(`  ${h.padEnd(14)} forced pick = key ${hits[h]}/${n} = ${pct(hits[h])}%  ${ok ? 'ok' : 'OVER'}`)
}
const diff = {}; for (const it of b) diff[it.difficulty] = (diff[it.difficulty] ?? 0) + 1
console.log(`  key strictly longest ${longest}/${n} = ${pct(longest)}%, strictly shortest ${shortest}/${n} = ${pct(shortest)}% (batch band 15-35%, reported here); key unique initial among options ${uniqInitial}/${n}`)
console.log(`  authored difficulty ${JSON.stringify(diff)}`)
if (problems.length) { for (const p of problems) console.log(`  ${p}`); console.log(`  ${problems.length} problem(s)`); process.exit(1) }
console.log('  0 problems')
