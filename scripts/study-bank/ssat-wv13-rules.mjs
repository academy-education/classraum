#!/usr/bin/env node
/**
 * ssat-wv13-rules.mjs — the WV13-only mechanical rules (READING-BATCH-WV13-2026-10-11.prereg.md).
 *
 * Pre-flight for a WV13 unit = `ssat-wv.mjs verify` (WV12 branch, extended to WV13 ids) AND `ssat-wv12-rules.mjs check`
 * (R1-R5, extended to WV13 ids) AND `ssat-wv13-rules.mjs check` (below), all clean; plus the persistent-judge sense
 * check (`ssat-wv13-senses.mjs`, read by verify --senses). After a fix round also `fixguard`.
 *
 *   check <a.wv.json>...                         exit 2 on any problem
 *   fixguard <pre.wv.json> <post.wv.json> <PROBLEMS.txt>   exit 2 if the fixer touched a version's vocabulary sentence
 *                                                or a gloss that no PROBLEM line named
 *   --selftest
 *
 * Rules (ids WV13- only):
 *   R6 the vocabulary headword is on the unit's ASSIGNED list (HEADWORDS; five disjoint lists, no word any earlier WV
 *      batch used as a vocabulary headword).
 *   R7 the vocabulary stem names paragraph N; the headword occurs in paragraph N of every version; version k's `why` is
 *      verbatim inside paragraph N and contains the headword (each version's support quotes ITS OWN use of the word).
 *   R8 at most one character-form unit in a check call (the batch is author form, character action in <= 1 unit).
 *   fixguard: version k's vocabulary sentence (the sentence of paragraph N holding the headword) may change only if a
 *      PROBLEM line names that vocabulary question's version k, or quotes gloss k (a sense-overlap line on gloss k), or
 *      gloss k itself changed; gloss j may change only if a
 *      PROBLEM line quotes gloss j (a sense-overlap line) or names version j of the vocabulary question. A fixer may
 *      not touch another version's sense. That the changed sentence still keys its own gloss is then checked by the
 *      licensing judges, re-run on the changed unit (both must pick gloss k in version k).
 */
import { readFileSync } from 'node:fs'
import { norm } from './ssat-wv.mjs'

const die = m => { console.error(`REFUSING: ${m}`); process.exit(2) }
export const isV13 = id => /^WV13-/.test(String(id))
// Five disjoint lists of polysemous headwords, each with four or more clearly separate senses of the kind a
// learner's dictionary lists. None was a vocabulary headword in WV1-WV12 (PRIOR). Each author sees only its own list.
export const HEADWORDS = {
  'WV13-P01': ['trunk', 'bolt', 'bill', 'scale', 'range', 'cell'],
  'WV13-P02': ['spring', 'bar', 'plot', 'seal', 'file', 'tip'],
  'WV13-P03': ['post', 'board', 'plant', 'stock', 'club', 'deck'],
  'WV13-P04': ['jam', 'row', 'volume', 'mint', 'ring', 'lodge'],
  'WV13-P05': ['capital', 'match', 'note', 'train', 'court', 'suit'],
}
export const PRIOR = ['bank', 'break', 'carried', 'charge', 'cover', 'draft', 'drew', 'fair', 'figure', 'fixed', 'held', 'kept', 'pitch', 'raised', 'ran', 'set', 'settled', 'stand', 'struck']
const NUMW = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6 }
export function paraOf(prompt) {
  const m = String(prompt).match(/paragraph (\d|one|two|three|four|five|six)\b/i) ?? String(prompt).match(/the (first|second|third|fourth|fifth|sixth) paragraph/i)
  return m ? (/\d/.test(m[1]) ? Number(m[1]) : NUMW[m[1].toLowerCase()]) : null
}
export const wordOf = prompt => (String(prompt).match(/["“]([^"”]+)["”]/) ?? [])[1] ?? null
const wordRe = w => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
const paras = t => String(t).split(/\n\s*\n/).filter(x => x.trim())
export function vocabSentence(text, n, w) {
  const P = paras(text)[n - 1]; if (!P) return null
  const ss = P.match(/[^.!?]+[.!?]+["'’”)]*/g) ?? [P]
  return ss.find(s => wordRe(w).test(s))?.trim() ?? null
}

export function unitProblems(p) {
  const id = p.passage_id, probs = []
  if (!isV13(id)) return [`${id}: not a WV13 unit`]
  const vq = (p.questions ?? []).filter(q => q.kind === 'vocabulary-in-context')
  if (vq.length !== 1) return [`${id}: ${vq.length} vocabulary questions (need 1)`]
  const q = vq[0], tag = `${id}/${q.qid}`, w = wordOf(q.prompt), n = paraOf(q.prompt)
  if (!w) return [`${tag}: vocabulary stem must quote the headword`]
  const list = HEADWORDS[id]
  if (!list) probs.push(`${tag}: ${id} has no assigned headword list`)
  else if (!list.includes(w.toLowerCase())) probs.push(`${tag}: headword "${w}" is not on ${id}'s assigned list (${list.join(', ')}); use one of them, in that form`)
  if (!n) probs.push(`${tag}: vocabulary stem must name the paragraph (R7)`)
  else (p.versions ?? []).forEach((v, k) => {
    const P = paras(v.text)[n - 1]
    if (!P || !wordRe(w).test(P)) { probs.push(`${tag} v${k}: the headword "${w}" is not in paragraph ${n} of version ${k} (R7)`); return }
    const why = q.support?.[k]?.why
    if (!why || !norm(P).includes(norm(why))) probs.push(`${tag} v${k}: the vocabulary "why" must be a verbatim span of paragraph ${n} of version ${k} (R7)`)
    else if (!wordRe(w).test(why)) probs.push(`${tag} v${k}: the vocabulary "why" must quote the sentence that uses "${w}" (R7)`)
  })
  return probs
}

export function check(units) {
  const problems = []
  units.forEach(p => unitProblems(p).forEach(x => problems.push(x)))
  const ch = units.filter(p => p.attitude_form === 'character').map(p => p.passage_id)
  if (ch.length > 1) problems.push(`R8: ${ch.length} character-form units (${ch.join(', ')}); WV13 allows character action in at most one unit`)
  return problems
}

/** fixguard: pre, post parsed units; problemsText = the PROBLEM lines the fixer received */
export function fixguard(pre, post, problemsText) {
  const probs = [], P = String(problemsText)
  const q0 = pre.questions.find(q => q.kind === 'vocabulary-in-context'), q1 = post.questions.find(q => q.kind === 'vocabulary-in-context')
  if (!q0 || !q1 || q0.qid !== q1.qid) return [`${pre.passage_id}: vocabulary question missing or renamed in the fix`]
  const w0 = wordOf(q0.prompt), w1 = wordOf(q1.prompt), n0 = paraOf(q0.prompt), n1 = paraOf(q1.prompt)
  if (w0 !== w1) probs.push(`${q1.qid}: the fixer changed the headword ("${w0}" -> "${w1}")`)
  if (n0 !== n1) probs.push(`${q1.qid}: the fixer changed the vocabulary paragraph (${n0} -> ${n1})`)
  const namesV = k => P.includes(`${q0.qid} v${k}:`)
  const glossChanged = q0.choices.map((c, j) => norm(c) !== norm(q1.choices[j]))
  glossChanged.forEach((ch, j) => { if (ch && !P.includes(`"${q0.choices[j]}"`) && !namesV(j)) probs.push(`${q1.qid}: gloss ${j} changed ("${q0.choices[j]}" -> "${q1.choices[j]}") but no PROBLEM line names it`) })
  for (let k = 0; k < 5; k++) {
    const s0 = vocabSentence(pre.versions[k].text, n0, w0), s1 = vocabSentence(post.versions[k].text, n1 ?? n0, w1 ?? w0)
    if (s1 === null) { probs.push(`${q1.qid} v${k}: after the fix, paragraph ${n1} has no sentence using "${w1}"`); continue }
    if (norm(s0 ?? '') !== norm(s1) && !glossChanged[k] && !namesV(k) && !P.includes(`"${q0.choices[k]}"`)) probs.push(`${q1.qid} v${k}: the fixer changed version ${k}'s vocabulary sentence, which no PROBLEM line named and whose gloss did not change ("${s0}" -> "${s1}")`)
  }
  return probs
}

function selftest() {
  let fail = 0; const ok = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fail++ }
  const all = Object.values(HEADWORDS).flat()
  ok(new Set(all).size === all.length, `the five headword lists are disjoint (${all.length} words)`)
  ok(!all.some(w => PRIOR.includes(w)), 'no listed headword was an earlier WV vocabulary word')
  const gl = ['tree stem', 'storage chest', 'elephant nose', 'car boot', 'human torso']
  const sent = ['The oak trunk had split in the storm.', 'She packed the trunk with winter coats.', 'The calf curled its trunk around the pail.', 'He loaded the bags into the trunk of the car.', 'The coach told him to keep his trunk upright.']
  const text = k => `First paragraph sits here with enough words to count.\n\nSecond paragraph opens. ${sent[k]} It ends here.\n\nThird paragraph closes the piece.`
  const mk = o => ({ passage_id: 'WV13-P01', attitude_form: 'author', versions: [0, 1, 2, 3, 4].map(k => ({ text: text(k) })), questions: [{ qid: 'WV13-P01-4', kind: 'vocabulary-in-context', prompt: 'In paragraph 2, the word "trunk" is closest in meaning to', choices: [...gl], support: [0, 1, 2, 3, 4].map(k => ({ why: sent[k], kills: {} })) }], ...o })
  ok(unitProblems(mk()).length === 0, `a clean unit passes (${unitProblems(mk()).join('; ')})`)
  const off = mk(); off.questions[0].prompt = 'In paragraph 2, the word "spring" is closest in meaning to'
  ok(unitProblems(off).some(x => /not on WV13-P01's assigned list/.test(x)), 'R6: another unit\'s headword refuses')
  const pit = mk(); pit.questions[0].prompt = 'In paragraph 2, the word "pitch" is closest in meaning to'
  ok(unitProblems(pit).some(x => /assigned list/.test(x)), 'R6: an earlier example word ("pitch") refuses')
  const wp = mk(); wp.questions[0].prompt = 'In paragraph 3, the word "trunk" is closest in meaning to'
  ok(unitProblems(wp).filter(x => /not in paragraph 3/.test(x)).length === 5, 'R7: the wrong paragraph refuses in every version')
  const wy = mk(); wy.questions[0].support[2].why = 'It ends here.'
  ok(unitProblems(wy).some(x => /v2: the vocabulary "why" must quote the sentence/.test(x)), 'R7: a why that does not quote the headword refuses')
  const wo = mk(); wo.questions[0].support[1].why = 'Third paragraph closes the piece.'
  ok(unitProblems(wo).some(x => /v1: the vocabulary "why" must be a verbatim span of paragraph 2/.test(x)), 'R7: a why from another paragraph refuses')
  ok(check([mk({ attitude_form: 'character' }), mk({ passage_id: 'WV13-P02', attitude_form: 'character' })]).some(x => /R8/.test(x)), 'R8: two character-form units refuse')
  ok(!check([mk({ attitude_form: 'character' }), mk({ passage_id: 'WV13-P02' })]).some(x => /R8/.test(x)), 'R8: one character-form unit passes')
  // fixguard: the WV12 P03 failure (a fixer rewrote another version's vocabulary sentence into a different sense)
  const pre = mk(), rekey = mk(); rekey.versions[4].text = text(4).replace(sent[4], 'She packed the trunk with towels for the beach.')
  const fgP = 'PROBLEM WV13-P01/WV13-P01-4: both sense judges rate "elephant nose" / "human torso" as overlapping'
  const fgP2 = 'PROBLEM WV13-P01/WV13-P01-4: both sense judges rate "elephant nose" / "tree stem" as overlapping'
  ok(fixguard(pre, rekey, fgP2).some(x => /v4: the fixer changed version 4's vocabulary sentence/.test(x)), 'fixguard: re-keying version 4 (the WV12 P03 failure) refuses when gloss 4 is unchanged, unquoted and v4 unnamed')
  const fix = mk(); fix.questions[0].choices[2] = 'nose of an elephant'; fix.versions[2].text = text(2).replace(sent[2], 'The elephant raised its trunk to drink.')
  ok(fixguard(pre, fix, fgP).length === 0, `fixguard: replacing the named gloss 2 and rewriting only version 2's sentence passes (${fixguard(pre, fix, fgP).join('; ')})`)
  const extra = mk(); extra.questions[0].choices[3] = 'rear of a car'
  ok(fixguard(pre, extra, fgP).some(x => /gloss 3 changed/.test(x)), 'fixguard: changing an unnamed gloss refuses')
  const dis = mk(); dis.versions[3].text = text(3).replace(sent[3], 'He loaded the bags into the trunk of the hatchback.')
  ok(fixguard(pre, dis, fgP).some(x => /v3: the fixer changed/.test(x)), 'fixguard: even a clarifying edit to an unnamed version\'s sentence (gloss 3, not in the named pair) refuses')
  const dis4 = mk(); dis4.versions[4].text = text(4).replace(sent[4], 'The coach told him to keep his trunk upright while rowing.')
  ok(fixguard(pre, dis4, fgP).length === 0, 'fixguard: an edit to the sentence of a gloss quoted in the overlap PROBLEM (gloss 4) passes')
  ok(fixguard(pre, rekey, 'PROBLEM WV13-P01/WV13-P01-4 v4: licensing judge a picks choice 1').length === 0, 'fixguard: a PROBLEM naming v4 of the vocabulary item permits its sentence to change')
  const moved = mk(); moved.versions[0].text = text(0).replace(sent[0], 'The oak split in the storm.')
  ok(fixguard(pre, moved, fgP).some(x => /v0: after the fix, paragraph 2 has no sentence/.test(x)), 'fixguard: deleting the headword from a version refuses')
  console.log(fail ? `SELFTEST FAILED (${fail})` : 'selftest passed'); process.exit(fail ? 1 : 0)
}

const [cmd, ...rest] = process.argv.slice(2)
if (import.meta.url === `file://${process.argv[1]}`) {
  const rd = f => { try { return JSON.parse(readFileSync(f, 'utf8')) } catch { die(`cannot read ${f}`) } }
  if (cmd === 'check') { if (!rest.length) die('no files'); const units = rest.map(rd); const pr = check(units); console.log(`  WV13 headwords: ${units.map(p => `${p.passage_id}=${wordOf(p.questions.find(q => q.kind === 'vocabulary-in-context')?.prompt ?? '')}`).join(', ')}`); if (pr.length) { pr.forEach(x => console.log('  PROBLEM ' + x)); die(`${pr.length} WV13 problem(s)`) } console.log(`  WV13 check OK: ${units.length} unit(s)`) }
  else if (cmd === 'fixguard') { if (rest.length !== 3) die('fixguard <pre> <post> <PROBLEMS.txt>'); const pr = fixguard(rd(rest[0]), rd(rest[1]), readFileSync(rest[2], 'utf8')); if (pr.length) { pr.forEach(x => console.log('  PROBLEM ' + x)); die(`${pr.length} fixguard problem(s)`) } console.log('  fixguard OK') }
  else if (cmd === '--selftest') selftest()
  else die('usage: check | fixguard | --selftest')
}
