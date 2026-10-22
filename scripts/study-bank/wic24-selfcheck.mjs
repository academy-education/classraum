#!/usr/bin/env node
/**
 * wic24-selfcheck.mjs [A|B|C|D ...] [--final]
 *
 * Structural self-check for sat-cs-wic-v24 author files
 * (scripts/study-bank/sat-cs-wic-v24-work/<L>/<ID>.json, one item per file).
 * Rules from PREREG-WIC24-2026-10-23.md (R1-R6 + item rules). Per-author count
 * rules (rarity, POS, shapes) apply once the author has 10 files or with --final;
 * batch-wide key-length bands only with --final.
 *
 * --work <dir> reads another folder (break-tests only).
 * --live <path> reads another live-words file (break-tests only: proves the
 *   frozen-file net catches a word pruned from the live-words file).
 *
 * v24 additions (PREREG-WIC24): ranges of >= 6 letters (asserted); v23 frozen words
 * excluded; key never the odd one out in polarity or register (it must share its
 * label with at least one distractor); deletion_test per item (the blank's own
 * sentence alone leaves >= 2 options defensible, key among them).
 *
 * Exit 1 on any problem, 2 on unreadable input (a file that is not JSON, an
 * empty author folder when one is named). Never a pass over nothing.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
// v24: no range narrower than 6 letters (v23's D a-c stayed OVER on both probe axes);
// rotated from v23 (A d-i, B j-q, C r-z, D a-c)
const RANGE = { A: 'abcdef', B: 'ghijkl', C: 'mnopqr', D: 'stuvwxyz' }
{ const joined = Object.values(RANGE).join('')
  if (Object.values(RANGE).some(r => r.length < 6) || joined.length !== 26 || new Set(joined).size !== 26) { console.error('REFUSING: RANGE must be four disjoint ranges of >= 6 letters covering a-z'); process.exit(2) } }
const REGISTERS = ['everyday', 'neutral', 'formal', 'technical', 'literary']
const PROMPT = 'Which choice completes the text with the most logical and precise word or phrase?'
const DENY = new Set(['ductile', 'hygroscopic', 'allopatric', 'recondite', 'sedulous', 'pellucid', 'inchoate', 'perspicacious', 'lachrymose', 'sententious', 'plangent', 'friable', 'fusible', 'abstemious', 'bilious', 'avuncular', 'commodious', 'mawkish', 'raffish', 'scabrous', 'venal', 'promulgate', 'sesquipedalian', 'obstreperous', 'pusillanimous', 'tendentious', 'apodictic', 'dispositive', 'eleemosynary', 'quotidian', 'otiose', 'ineffable', 'jejune', 'lugubrious', 'nugatory', 'pertinacious'])
const args = process.argv.slice(2)
const wi = args.indexOf('--work')
const W = wi >= 0 ? args[wi + 1] : 'scripts/study-bank/sat-cs-wic-v24-work'
const final = args.includes('--final')
const letters = args.filter(a => /^[ABCD]$/.test(a))
const rdj = p => { if (!existsSync(p)) { console.error(`REFUSING: ${p} missing (run wic24-livewords.mjs first)`); process.exit(2) } try { return JSON.parse(readFileSync(p, 'utf8')) } catch (e) { console.error(`REFUSING: ${p}: ${e.message}`); process.exit(2) } }
const li = args.indexOf('--live')
const live = rdj(li >= 0 ? args[li + 1] : 'scripts/study-bank/sat-cs-wic-v24.live-words.json')
/* v24: every v19, v20 and v23 option word (key AND distractors, kept AND dropped) is
 * excluded directly from the frozen files as well, so the exclusion does not depend on
 * the live-words file having been regenerated. Refuses unless each holds 40 items. */
const prior = {}
const PRIOR = ['v19', 'v20', 'v23']
for (const v of PRIOR) {
  const b = rdj(`scripts/study-bank/sat-cs-wic-${v}.batch.json`)
  if (!Array.isArray(b) || b.length !== 40) { console.error(`REFUSING: sat-cs-wic-${v}.batch.json holds ${b?.length} items, not 40`); process.exit(2) }
  prior[v] = b.flatMap(it => it.choices.map(c => String(c).toLowerCase().trim()))
}
const lw = [...live.keys, ...live.options].map(w => w.toLowerCase())
for (const v of PRIOR) { const miss = prior[v].filter(w => !lw.includes(w)); if (miss.length) console.log(`note: ${miss.length} ${v} word(s) not in live-words file, excluded from the frozen file: ${miss.slice(0, 5).join(', ')}`) }
/* Stem: strip one inflectional/derivational suffix only when at least 4 letters
 * remain (the old regex cut "speed" to "spe" and missed speed/speeds), then fold
 * a final "e" and a doubled final consonant so "use/used", "stop/stopped" meet. */
const stem = w => {
  let x = String(w).toLowerCase().trim()
  for (const suf of ['ically', 'ally', 'ities', 'ity', 'ness', 'ments', 'ment', 'ings', 'ing', 'edly', 'ed', 'ies', 'es', 's', 'ly', 'ions', 'ion', 'al', 'ive']) {
    if (x.endsWith(suf) && x.length - suf.length >= 4) { x = x.slice(0, -suf.length); break }
  }
  return x.replace(/e$/, '').replace(/([bcdfgklmnprst])\1$/, '$1')
}
/* exact-plus-inflection forms, a second net under the stemmer (materials/material
 * slipped past it on 2026-10-09: "material" strips -al, "materials" strips -s). */
const forms = w => { w = String(w).toLowerCase(); const o = new Set([w, w + 's', w + 'es', w + 'ed', w + 'd', w + 'ing', w + 'ly', w + 'er', w + 'ers']); if (w.endsWith('e')) o.add(w.slice(0, -1) + 'ing'); if (w.endsWith('y')) { o.add(w.slice(0, -1) + 'ies'); o.add(w.slice(0, -1) + 'ied') } const l = w.slice(-1); if (/[bdgmnprt]/.test(l)) { o.add(w + l + 'ed'); o.add(w + l + 'ing') } return o }
const liveSet = new Set([...live.keys, ...live.options, ...PRIOR.flatMap(v => prior[v])].map(w => w.toLowerCase()))
const liveStem = new Map([...liveSet].map(w => [stem(w), w]))

const load = L => {
  const dir = `${W}/${L}`
  if (!existsSync(dir)) return []
  return readdirSync(dir).filter(f => /^WIC24[A-D]-\d\d\.json$/.test(f)).sort().map(f => {
    try { return JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')) } catch (e) { console.error(`REFUSING: ${dir}/${f} unreadable: ${e.message}`); process.exit(2) }
  })
}
const all = Object.fromEntries(['A', 'B', 'C', 'D'].map(L => [L, load(L)]))
const targets = letters.length ? letters : ['A', 'B', 'C', 'D'].filter(L => all[L].length)
if (!targets.length) { console.error('REFUSING: no author files on disk'); process.exit(2) }
for (const L of letters) if (!all[L].length) { console.error(`REFUSING: author ${L} has no files`); process.exit(2) }

const problems = []
const P = (id, m) => problems.push(`${id}: ${m}`)
// batch-wide word index (all authors on disk), for R6 uniqueness
const wordAt = new Map()
for (const L of Object.keys(all)) for (const it of all[L]) for (const c of it.choices ?? []) {
  const s = stem(c); if (!wordAt.has(s)) wordAt.set(s, []); wordAt.get(s).push(`${it.id}:${c}`)
}
// proper nouns: capitalised tokens not sentence-initial
const propers = it => {
  const out = new Set(); const p = String(it.passage ?? '')
  for (const m of p.matchAll(/(?<![.!?]\s|^|["“(]\s?)\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/g)) out.add(m[1])
  for (const n of it.proper_nouns ?? []) out.add(String(n))
  return out
}
const COMMON_CAPS = new Set(['The', 'A', 'An', 'In', 'I', 'English', 'European', 'American', 'British', 'French', 'German', 'Latin', 'Greek', 'Roman', 'Christian', 'Spanish', 'Italian', 'Chinese', 'Japanese', 'Korean', 'African', 'Asian', 'Atlantic', 'Pacific'])
const propIdx = new Map()
for (const L of Object.keys(all)) for (const it of all[L]) for (const n of propers(it)) {
  for (const tok of n.split(/\s+/)) { if (COMMON_CAPS.has(tok)) continue; if (!propIdx.has(tok)) propIdx.set(tok, new Set()); propIdx.get(tok).add(it.id) }
}

for (const L of targets) {
  const items = all[L]
  for (const it of items) {
    const id = it.id ?? '(no id)'
    if (!new RegExp(`^WIC24${L}-\\d\\d$`).test(id)) P(id, `id must be WIC24${L}-NN`)
    if (it.domain !== 'Craft and Structure' || it.subskill !== 'Words in Context') P(id, 'domain/subskill must be Craft and Structure / Words in Context')
    if (!['hard', 'medium'].includes(it.difficulty)) P(id, 'difficulty must be hard|medium')
    if (it.prompt !== PROMPT) P(id, 'prompt must be the standard WIC prompt exactly')
    const ch = (it.choices ?? []).map(String)
    if (ch.length !== 4 || new Set(ch.map(c => c.toLowerCase())).size !== 4) P(id, 'need 4 distinct choices')
    if (!ch.includes(String(it.correct_answer))) P(id, 'key not among choices')
    for (const c of ch) {
      const words = c.trim().split(/\s+/)
      if (words.length > 2) P(id, `"${c}" is more than two words (word-shaped only)`)
      if (c !== c.toLowerCase()) P(id, `"${c}" must be lowercase`)
      if (!RANGE[L].includes(c[0]?.toLowerCase())) P(id, `"${c}" outside author ${L} letters ${RANGE[L]}`)
      if (DENY.has(c.toLowerCase())) P(id, `"${c}" is denylisted (above ceiling)`)
      if (liveSet.has(c.toLowerCase())) P(id, `"${c}" is a live WIC / v17 / v18 / v19 / v20 / v23 option or key word`)
      else if (liveStem.has(stem(c))) P(id, `"${c}" shares a stem with live/v17 word "${liveStem.get(stem(c))}"`)
      else { const hit = [...liveSet].find(l => forms(c).has(l) || forms(l).has(c.toLowerCase())); if (hit) P(id, `"${c}" is an inflection of live/v17 word "${hit}"`) }
      const uses = wordAt.get(stem(c)) ?? []
      if (uses.length > 1) P(id, `"${c}" (stem) used ${uses.length}x in the batch: ${uses.join(', ')}`)
    }
    if (new Set(ch.map(c => c.trim().split(/\s+/).length)).size > 1) P(id, 'options mix one-word and two-word shapes (shape tell)')
    const p = String(it.passage ?? '')
    const blanks = (p.match(/______/g) ?? []).length
    if (blanks !== 1) P(id, `passage needs exactly one ______ (has ${blanks})`)
    if (/_{7,}/.test(p)) P(id, 'blank must be exactly six underscores')
    if (/\b(a|an)\s+______/i.test(p)) P(id, '"a"/"an" directly before the blank (R5)')
    const wc = p.split(/\s+/).filter(Boolean).length
    if (wc < 50 || wc > 110) P(id, `passage ${wc} words (50-110)`)
    if (!Array.isArray(it.antonym_pairs) || it.antonym_pairs.length) P(id, 'antonym_pairs must be [] (R1)')
    const pol = it.polarity ?? {}
    if (ch.some(c => !['+', '-', '0'].includes(pol[c]))) P(id, 'polarity must label every option +, - or 0')
    else for (const s of ['+', '-']) { if (pol[it.correct_answer] !== s && ch.filter(c => c !== it.correct_answer && pol[c] === s).length >= 3) P(id, `three distractors share polarity ${s} the key lacks (R1)`) }
    // v24: key never the odd one out in polarity (v23 solvers picked the polarity odd one out)
    if (ch.every(c => ['+', '-', '0'].includes(pol[c])) && !ch.some(c => c !== it.correct_answer && pol[c] === pol[it.correct_answer])) P(id, `key polarity "${pol[it.correct_answer]}" shared by no distractor (polarity odd one out)`)
    // v24: register per option; key never the odd one out in register
    const reg = it.register ?? {}
    if (ch.some(c => !REGISTERS.includes(reg[c]))) P(id, `register must label every option ${REGISTERS.join('|')}`)
    else if (!ch.some(c => c !== it.correct_answer && reg[c] === reg[it.correct_answer])) P(id, `key register "${reg[it.correct_answer]}" shared by no distractor (register odd one out)`)
    // v24: deletion test - the blank's own sentence alone, neighbours deleted, leaves >= 2 options defensible
    const dt = it.deletion_test ?? {}
    const kept = String(dt.kept_sentence ?? '')
    if (!kept.includes('______') || !p.includes(kept)) P(id, 'deletion_test.kept_sentence must be the blank\'s own sentence, verbatim from the passage')
    else if (kept.split(/\s+/).length > 0.6 * p.split(/\s+/).length) P(id, 'deletion_test.kept_sentence is most of the passage (neighbours must carry the deciding facts)')
    const dd = (Array.isArray(dt.defensible) ? dt.defensible : []).map(String)
    if (new Set(dd).size < 2 || dd.some(d => !ch.includes(d)) || !dd.includes(String(it.correct_answer))) P(id, 'deletion_test.defensible must list >= 2 distinct options (key included) defensible from kept_sentence alone')
    if (typeof dt.why !== 'string' || dt.why.trim().length < 10) P(id, 'deletion_test.why must say why each listed option survives the blank\'s sentence alone')
    const ro = (it.rarity_order ?? []).map(String)
    if (ro.length !== 4 || ro.slice().sort().join('|') !== ch.slice().sort().join('|')) P(id, 'rarity_order must list the four choices, most common first')
    const kb = it.killed_by ?? {}
    const ds = ch.filter(c => c !== it.correct_answer)
    if (ds.some(d => !['logic', 'explicit'].includes(kb[d]))) P(id, 'killed_by must mark every distractor logic|explicit')
    if (ds.filter(d => kb[d] === 'explicit').length > 1) P(id, 'more than one distractor killed by an explicit phrase (R4)')
    if (typeof it.after_blank !== 'string') P(id, 'after_blank must state the word after the blank ("" if punctuation)')
    else {
      const m = p.match(/______\s*([A-Za-z']+)?/); const nxt = (m?.[1] ?? '').toLowerCase()
      if (nxt !== it.after_blank.toLowerCase()) P(id, `after_blank "${it.after_blank}" but passage has "${nxt}"`)
    }
    if (!['noun', 'verb', 'adjective', 'adverb'].includes(it.pos)) P(id, 'pos must be noun|verb|adjective|adverb')
    if (typeof it.shape !== 'string' || !it.shape) P(id, 'shape must name the argument shape')
    if (it.difficulty === 'hard' && it.key_from_one_sentence !== false) P(id, 'hard items need key_from_one_sentence false')
    const ex = String(it.explanation ?? '')
    if (/\b(option|choice)\s+[A-D]\b/.test(ex) || /\b[A-D]\)/.test(ex)) P(id, 'explanation names an option by letter')
    if (!ex.includes(String(it.correct_answer))) P(id, 'explanation must quote the key')
    for (const n of propers(it)) for (const tok of n.split(/\s+/)) { const s = propIdx.get(tok); if (s && s.size > 1) P(id, `proper noun "${tok}" also in ${[...s].filter(x => x !== id).join(', ')}`) }
  }
  if (items.length >= 10 || final) {
    const n = items.length
    const rarest = items.filter(it => (it.rarity_order ?? []).at(-1) === it.correct_answer).length
    const commonest = items.filter(it => (it.rarity_order ?? [])[0] === it.correct_answer).length
    if (rarest > 2) P(`author ${L}`, `key rarest in ${rarest}/${n} (max 2: key NOT rarest in >= 8 of 10)`)
    if (commonest < 2) P(`author ${L}`, `key most common in ${commonest}/${n} (min 2)`)
    const nv = items.filter(it => ['noun', 'verb'].includes(it.pos)).length
    if (nv < 4) P(`author ${L}`, `noun/verb keys ${nv}/${n} (min 4)`)
    const shapes = items.map(it => String(it.shape ?? '').toLowerCase())
    const ov = shapes.filter(s => /overturn|received view|revis/.test(s)).length
    if (ov > 2) P(`author ${L}`, `"received view overturned" ${ov}/${n} (max 2)`)
    if (new Set(shapes).size < 4) P(`author ${L}`, `${new Set(shapes).size} distinct shapes (min 4)`)
    const hard = items.filter(it => it.difficulty === 'hard').length
    if (hard !== 8 || n !== 10) P(`author ${L}`, `${n} items, ${hard} hard (commission 10 / 8 hard)`)
  }
  console.log(`author ${L}: ${items.length} files`)
}
if (final) {
  const items = Object.values(all).flat()
  const len = s => String(s).length
  const longest = items.filter(it => { const k = len(it.correct_answer); return it.choices.every(c => c === it.correct_answer || len(c) < k) }).length
  const shortest = items.filter(it => { const k = len(it.correct_answer); return it.choices.every(c => c === it.correct_answer || len(c) > k) }).length
  const band = x => x / items.length >= 0.15 && x / items.length <= 0.35
  console.log(`batch ${items.length}: key strictly longest ${longest}, strictly shortest ${shortest} (band 15-35%)`)
  if (!band(longest)) P('batch', `key strictly longest ${longest}/${items.length} outside 15-35%`)
  if (!band(shortest)) P('batch', `key strictly shortest ${shortest}/${items.length} outside 15-35%`)
}
for (const x of problems) console.log('  PROBLEM ' + x)
console.log(problems.length ? `${problems.length} problem(s)` : 'self-check: 0 problems')
process.exit(problems.length ? 1 : 0)
