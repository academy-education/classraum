#!/usr/bin/env node
/**
 * wic26-selfcheck.mjs [A|B|C|D|E ...] [--final] [--work <dir>] [--live <path>] [--per-author N]
 *
 * Structural self-check for sat-cs-wic-v26 FOUR-WORLD author files
 * (scripts/study-bank/sat-cs-wic-v26-work/<L>/WIC26<L>-NN.json, one item per file).
 * Rules from PREREG-WIC26-2026-10-23.md: v25's self-check (wic25-selfcheck.mjs) with
 *   - five authors A-E (40 items, 160 worlds), letter ranges rotated from v25;
 *   - the exclusion net extended to EVERY v25 option word, read from the frozen
 *     sat-cs-wic-v25.worlds.json (kept and dropped, served and unserved), on top of the
 *     live-words file and the frozen v19/v20/v23/v24 batches;
 *   - NEW: no pivot clause in any world (a sentence opening "But", "Yet", "However",
 *     "Still" or "Even so", or a ", but" / ", yet" / "; but" / "; yet" clause). This was
 *     v25's revision instruction after the world probe found the pivot clause handing
 *     over the key on ~120 of 128 worlds; v26 applies it from the start.
 * What it still CANNOT check, and does not try to (PREREG-WIC26): that a kill works,
 * that a clause exists only to kill one distractor, that a distractor fits the passage
 * literally, that two options are near-opposites, that a word is above an 11th-grader's
 * ceiling, or that the blank sentence presupposes something absent. A mechanical count
 * of distractor-negating cues was judged NOT feasible and was not built; those are the
 * world probe's and the graders' to find.
 *
 * Exit 1 on any problem, 2 on unreadable or absent input. Never a pass over nothing.
 * --work / --live / --per-author are for break-tests only.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
// v26 ranges, rotated from v25 (A s-z, B a-f, C g-l, D m-r): every author moves to letters it did not hold.
// v25's "none narrower than 6 letters" floor cannot hold for FIVE disjoint ranges over 26 letters (5 x 6 = 30), so
// the floor is now on SUPPLY: each range must hold >= 15% of the initials of the excluded-word pool, a proxy for
// how much SAT-register vocabulary starts there (checked at start-up below, against the live-words file).
const RANGE = { A: 'opqr', B: 'stuvwxyz', C: 'abc', D: 'defgh', E: 'ijklmn' }
const RANGE_V25 = { A: 'stuvwxyz', B: 'abcdef', C: 'ghijkl', D: 'mnopqr' }
{ const joined = Object.values(RANGE).join('')
  if (joined.length !== 26 || new Set(joined).size !== 26) { console.error('REFUSING: RANGE must be five disjoint ranges covering a-z'); process.exit(2) }
  for (const [L, r] of Object.entries(RANGE)) if (RANGE_V25[L] && [...r].some(c => RANGE_V25[L].includes(c))) { console.error(`REFUSING: author ${L} range ${r} overlaps its v25 range ${RANGE_V25[L]} (not rotated)`); process.exit(2) } }
const PROMPT = 'Which choice completes the text with the most logical and precise word or phrase?'
const DENY = new Set(['ductile', 'hygroscopic', 'allopatric', 'recondite', 'sedulous', 'pellucid', 'inchoate', 'perspicacious', 'lachrymose', 'sententious', 'plangent', 'friable', 'fusible', 'abstemious', 'bilious', 'avuncular', 'commodious', 'mawkish', 'raffish', 'scabrous', 'venal', 'promulgate', 'sesquipedalian', 'obstreperous', 'pusillanimous', 'tendentious', 'apodictic', 'dispositive', 'eleemosynary', 'quotidian', 'otiose', 'ineffable', 'jejune', 'lugubrious', 'nugatory', 'pertinacious'])
// the worked example in sat-cs-wic-v26-work/AUTHOR-BRIEF.md (kept from v25): every author has read it, so its words are spent.
// ancillary and lodestar: v25 drops for above-ceiling (already excluded as v25 words; listed so the reason is on record).
for (const w of ['outstayed', 'reflected', 'parceled', 'rerouted', 'ancillary', 'lodestar']) DENY.add(w)
const args = process.argv.slice(2)
const argOf = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null }
const W = argOf('--work') ?? 'scripts/study-bank/sat-cs-wic-v26-work'
const PER = Number(argOf('--per-author') ?? 8)
const final = args.includes('--final')
const letters = args.filter(a => /^[ABCDE]$/.test(a))
const rdj = p => { if (!existsSync(p)) { console.error(`REFUSING: ${p} missing (the live-words file comes from wic26-livewords.mjs)`); process.exit(2) } try { return JSON.parse(readFileSync(p, 'utf8')) } catch (e) { console.error(`REFUSING: ${p}: ${e.message}`); process.exit(2) } }
const live = rdj(argOf('--live') ?? 'scripts/study-bank/sat-cs-wic-v26.live-words.json')
if (!Array.isArray(live.keys) || !Array.isArray(live.options) || live.options.length < 1100) { console.error(`REFUSING: live-words file holds ${live.options?.length} option words (expected >= 1100 after v25; regenerate with wic26-livewords.mjs)`); process.exit(2) }
{ // supply floor per range (see RANGE above)
  const ini = live.options.map(w => String(w)[0]).filter(c => /[a-z]/.test(c))
  for (const [L, r] of Object.entries(RANGE)) { const sh = ini.filter(c => r.includes(c)).length / ini.length; if (sh < 0.15) { console.error(`REFUSING: author ${L} range ${r} holds ${(100 * sh).toFixed(1)}% of excluded-pool initials (min 15%)`); process.exit(2) } } }
/* every v19, v20, v23, v24 and v25 option word (key AND distractors, kept AND dropped, served AND
 * unserved) is excluded directly from the frozen files too, so the exclusion does not depend on
 * the live-words file having been regenerated. Refuses unless v19..v24 each hold 40 items and the
 * v25 worlds file holds 32 four-world items. */
const PRIOR = ['v19', 'v20', 'v23', 'v24', 'v25']
const prior = {}
for (const v of PRIOR) {
  const f = v === 'v25' ? 'sat-cs-wic-v25.worlds.json' : `sat-cs-wic-${v}.batch.json`, want = v === 'v25' ? 32 : 40
  const b = rdj(`scripts/study-bank/${f}`)
  if (!Array.isArray(b) || b.length !== want || b.some(it => (it.choices ?? []).length !== 4)) { console.error(`REFUSING: ${f} holds ${b?.length} items, not ${want} four-choice items`); process.exit(2) }
  prior[v] = b.flatMap(it => it.choices.map(c => String(c).toLowerCase().trim()))
}
const lw = new Set([...live.keys, ...live.options].map(w => w.toLowerCase()))
for (const v of PRIOR) { const miss = prior[v].filter(w => !lw.has(w)); if (miss.length) console.log(`note: ${miss.length} ${v} word(s) not in live-words file, excluded from the frozen file: ${miss.slice(0, 5).join(', ')}`) }
const stem = w => {
  let x = String(w).toLowerCase().trim()
  for (const suf of ['ically', 'ally', 'ities', 'ity', 'ness', 'ments', 'ment', 'ings', 'ing', 'edly', 'ed', 'ies', 'es', 's', 'ly', 'ions', 'ion', 'al', 'ive']) {
    if (x.endsWith(suf) && x.length - suf.length >= 4) { x = x.slice(0, -suf.length); break }
  }
  return x.replace(/e$/, '').replace(/([bcdfgklmnprst])\1$/, '$1')
}
const forms = w => { w = String(w).toLowerCase(); const o = new Set([w, w + 's', w + 'es', w + 'ed', w + 'd', w + 'ing', w + 'ly', w + 'er', w + 'ers']); if (w.endsWith('e')) o.add(w.slice(0, -1) + 'ing'); if (w.endsWith('y')) { o.add(w.slice(0, -1) + 'ies'); o.add(w.slice(0, -1) + 'ied') } const l = w.slice(-1); if (/[bdgmnprt]/.test(l)) { o.add(w + l + 'ed'); o.add(w + l + 'ing') } return o }
const liveSet = new Set([...lw, ...PRIOR.flatMap(v => prior[v])])
const liveStem = new Map([...liveSet].map(w => [stem(w), w]))
const norm = s => String(s ?? '').replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim().toLowerCase()
// sentence-opening pivots, and comma/semicolon "but"/"yet" clauses ("not only ... but also" and "but for" are not pivots)
const PIVOT = /(?:^|[.!?]["”]?\s+)(?:But|Yet|However|Still|Even so)\b|[,;]\s+(?:but|yet)\b(?!\s+(?:also|for)\b)/g
const wordsOf = s => String(s ?? '').split(/\s+/).filter(Boolean)
/* CONTENT-word set: on the worked example, variants of one passage share 53-62% of their content
 * words and an unrelated passage that keeps only the blank sentence shares 29-32%; all-word sets
 * read 61-68% vs 43-47%, too close to separate. The bar is 40% of content words. */
const STOP = new Set('a an the and or but of to in on at by for with from as that this it its their his her they them was were is are be been had has have did do not no nor so than then when while which who whom whose what where after before into over under every each any all one two'.split(' '))
const wordSet = s => new Set((norm(s).replace(/______/g, ' ').match(/[a-z']+/g) ?? []).filter(w => !STOP.has(w)))

const load = L => {
  const dir = `${W}/${L}`
  if (!existsSync(dir)) return []
  return readdirSync(dir).filter(f => /^WIC26[A-E]-\d\d\.json$/.test(f)).sort().map(f => {
    try { return JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')) } catch (e) { console.error(`REFUSING: ${dir}/${f} unreadable: ${e.message}`); process.exit(2) }
  })
}
const all = Object.fromEntries(['A', 'B', 'C', 'D', 'E'].map(L => [L, load(L)]))
const targets = letters.length ? letters : ['A', 'B', 'C', 'D', 'E'].filter(L => all[L].length)
if (!targets.length) { console.error('REFUSING: no author files on disk'); process.exit(2) }
for (const L of letters) if (!all[L].length) { console.error(`REFUSING: author ${L} has no files`); process.exit(2) }

const problems = [], warns = []
const P = (id, m) => problems.push(`${id}: ${m}`)
const wordAt = new Map()
for (const L of Object.keys(all)) for (const it of all[L]) for (const c of it.choices ?? []) {
  const s = stem(c); if (!wordAt.has(s)) wordAt.set(s, []); wordAt.get(s).push(`${it.id}:${c}`)
}
const COMMON_CAPS = new Set(['The', 'A', 'An', 'In', 'I', 'English', 'European', 'American', 'British', 'French', 'German', 'Latin', 'Greek', 'Roman', 'Christian', 'Spanish', 'Italian', 'Chinese', 'Japanese', 'Korean', 'African', 'Asian', 'Atlantic', 'Pacific'])
const propers = it => {
  const out = new Set()
  for (const w of it.worlds ?? []) for (const m of String(w.passage ?? '').matchAll(/(?<![.!?]\s|^|["“(]\s?)\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/g)) out.add(m[1])
  for (const n of it.proper_nouns ?? []) out.add(String(n))
  return out
}
const bsIdx = new Map()
for (const L of Object.keys(all)) for (const it of all[L]) { const k = norm(it.blank_sentence); if (!k) continue; if (!bsIdx.has(k)) bsIdx.set(k, []); bsIdx.get(k).push(it.id) }
const propIdx = new Map()
for (const L of Object.keys(all)) for (const it of all[L]) for (const n of propers(it)) for (const tok of n.split(/\s+/)) {
  if (COMMON_CAPS.has(tok)) continue; if (!propIdx.has(tok)) propIdx.set(tok, new Set()); propIdx.get(tok).add(it.id)
}

let worldsChecked = 0, itemsChecked = 0
for (const L of targets) {
  const items = all[L]
  for (const it of items) {
    const id = it.id ?? '(no id)'
    itemsChecked++
    if (!new RegExp(`^WIC26${L}-\\d\\d$`).test(id)) P(id, `id must be WIC26${L}-NN`)
    if (it.domain !== 'Craft and Structure' || it.subskill !== 'Words in Context') P(id, 'domain/subskill must be Craft and Structure / Words in Context')
    if (it.difficulty !== 'hard') P(id, 'difficulty must be hard (every world of every v26 item is authored hard)')
    if (it.prompt !== PROMPT) P(id, 'prompt must be the standard WIC prompt exactly')
    const ch = (it.choices ?? []).map(String)
    if (ch.length !== 4 || new Set(ch.map(c => c.toLowerCase())).size !== 4) P(id, 'need 4 distinct choices')
    for (const c of ch) {
      if (wordsOf(c).length > 2) P(id, `"${c}" is more than two words (word-shaped only)`)
      if (c !== c.toLowerCase()) P(id, `"${c}" must be lowercase`)
      if (!RANGE[L].includes(c[0]?.toLowerCase())) P(id, `"${c}" outside author ${L} letters ${RANGE[L]}`)
      if (DENY.has(c.toLowerCase())) P(id, `"${c}" is denylisted (above ceiling, or spent as the brief's worked example)`)
      if (liveSet.has(c.toLowerCase())) P(id, `"${c}" is a live WIC / v17-v25 option or key word`)
      else if (liveStem.has(stem(c))) P(id, `"${c}" shares a stem with excluded word "${liveStem.get(stem(c))}"`)
      else { const hit = [...liveSet].find(l => forms(c).has(l) || forms(l).has(c.toLowerCase())); if (hit) P(id, `"${c}" is an inflection of excluded word "${hit}"`) }
      const uses = wordAt.get(stem(c)) ?? []
      if (uses.length > 1) P(id, `"${c}" (stem) used ${uses.length}x in the batch: ${uses.join(', ')}`)
    }
    if (new Set(ch.map(c => wordsOf(c).length)).size > 1) P(id, 'options mix one-word and two-word shapes (shape tell)')
    if (!Array.isArray(it.antonym_pairs) || it.antonym_pairs.length) P(id, 'antonym_pairs must be [] (R1: no opposites in the option set)')
    const ro = (it.rarity_order ?? []).map(String)
    if (ro.length !== 4 || ro.slice().sort().join('|') !== ch.slice().sort().join('|')) P(id, 'rarity_order must list the four choices, most common first')
    if (!['noun', 'verb', 'adjective', 'adverb'].includes(it.pos)) P(id, 'pos must be noun|verb|adjective|adverb')
    if (typeof it.after_blank !== 'string') P(id, 'after_blank must state the word after the blank ("" if punctuation)')
    const bs = String(it.blank_sentence ?? '')
    if ((bs.match(/______/g) ?? []).length !== 1) P(id, 'blank_sentence must contain exactly one ______')
    if ((bsIdx.get(norm(bs)) ?? []).length > 1) P(id, `blank_sentence shared with ${bsIdx.get(norm(bs)).filter(x => x !== id).join(', ')}`)
    // ---- the four worlds ----
    const ws = Array.isArray(it.worlds) ? it.worlds : []
    if (ws.length !== 4) { P(id, `${ws.length} worlds, expected exactly 4`); continue }
    const keys = ws.map(w => String(w.key ?? ''))
    for (const [k, key] of keys.entries()) if (!ch.includes(key)) P(id, `world ${k} key "${key}" is not one of the four choices`)
    for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) if (keys[a] === keys[b]) P(id, `world ${b} reuses world ${a}'s key "${keys[a]}" (the four worlds must key four different options)`)
    if (new Set(keys).size === 4 && ch.length === 4 && ch.some(c => !keys.includes(c))) P(id, `option(s) ${ch.filter(c => !keys.includes(c)).join(', ')} are the key of no world`)
    const passages = ws.map(w => String(w.passage ?? ''))
    if (new Set(passages.map(norm)).size !== 4) P(id, 'two worlds have the same passage')
    const bsN = norm(bs)
    ws.forEach((w, k) => {
      worldsChecked++
      const tag = `${id} w${k}`
      const p = passages[k], pn = norm(p)
      if (!bs || !pn.includes(bsN)) P(tag, 'passage does not contain the item\'s blank_sentence verbatim (the blank\'s sentence must be identical in all four worlds)')
      const blanks = (p.match(/______/g) ?? []).length
      if (blanks !== 1) P(tag, `passage needs exactly one ______ (has ${blanks})`)
      if (/_{7,}/.test(p)) P(tag, 'blank must be exactly six underscores')
      if (/\b(a|an)\s+______/i.test(p)) P(tag, '"a"/"an" directly before the blank (R5)')
      const wc = wordsOf(p).length
      if (wc < 50 || wc > 110) P(tag, `passage ${wc} words (50-110)`)
      if (bs && wordsOf(bs).length > 0.6 * wc) P(tag, 'blank_sentence is most of the passage (the other sentences must carry the deciding facts)')
      if (typeof it.after_blank === 'string') { const m = p.match(/______\s*([A-Za-z']+)?/); const nxt = (m?.[1] ?? '').toLowerCase(); if (nxt !== it.after_blank.toLowerCase()) P(tag, `after_blank "${it.after_blank}" but passage has "${nxt}"`) }
      // NEW in v26: no pivot clause (PREREG-WIC26; v25 revision instruction, now from the start)
      for (const m of p.matchAll(PIVOT)) P(tag, `pivot clause "${m[0].trim()}" (no But/Yet/However/Still/Even so pivot: the key must come from combining sentences, not from a turn)`)
      if (w.key_from_one_sentence !== false) P(tag, 'key_from_one_sentence must be false (hard)')
      if (typeof w.shape !== 'string' || !w.shape.trim()) P(tag, 'shape must name the argument shape')
      const ex = String(w.explanation ?? '')
      if (/\b(option|choice)\s+[A-D]\b/.test(ex) || /\b[A-D]\)/.test(ex)) P(tag, 'explanation names an option by letter')
      const exl = ex.toLowerCase()
      if (!exl.includes(String(w.key).toLowerCase())) P(tag, 'explanation must quote this world\'s key')
      for (const d of ch.filter(c => c !== w.key)) if (!exl.includes(d.toLowerCase())) P(tag, `explanation must say why "${d}" fails`)
      const outside = pn.replace(bsN, ' | ')  // text of this world outside the blank sentence
      const kills = w.kills ?? {}
      let explicit = 0
      for (const d of ch.filter(c => c !== w.key)) {
        const kl = kills[d]
        if (!kl || typeof kl !== 'object') { P(tag, `no kill for "${d}"`); continue }
        if (!['logic', 'explicit'].includes(kl.type)) P(tag, `kill for "${d}": type must be logic|explicit`)
        if (kl.type === 'explicit') explicit++
        const q = norm(kl.quote)
        if (wordsOf(q).length < 2) P(tag, `kill for "${d}": quote must be 2+ consecutive words of this world's passage`)
        else if (!pn.includes(q)) P(tag, `kill for "${d}": quote "${kl.quote}" is not in this world's passage`)
        else if (!outside.includes(q)) P(tag, `kill for "${d}": quote lies inside the blank sentence (a kill must come from another sentence)`)
        if (typeof kl.why !== 'string' || kl.why.trim().length < 10) P(tag, `kill for "${d}": why must say how the passage kills it`)
        // REPORTED, not blocking: the exact span that kills d here also appears in the world where d is the key,
        // so this kill can only work in combination with other text. Graders decide; the author should look.
        const dk = keys.indexOf(d)
        if (q && dk >= 0 && dk !== k && norm(passages[dk]).includes(q)) warns.push(`${tag}: the span killing "${d}" ("${kl.quote}") also appears in w${dk}, where "${d}" is the key`)
      }
      if (explicit > 1) P(tag, `${explicit} kills are explicit (max 1 per world, R4)`)
    })
    // symmetry: no world may be a long contortion of the others (with-source tell, and contorted worlds are the
    // ones graders drop, which would tilt the kept keys - see the stage-5 attrition check)
    const lens = passages.map(x => wordsOf(x).length)
    if (Math.max(...lens) > 1.3 * Math.min(...lens)) P(id, `world lengths ${lens.join('/')} words: longest > 1.3x shortest (write four equally natural worlds, not one native and three contorted)`)
    for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) {
      const A = wordSet(passages[a]), B = wordSet(passages[b])
      const ov = [...A].filter(x => B.has(x)).length / Math.min(A.size || 1, B.size || 1)
      if (ov < 0.4) P(id, `worlds ${a} and ${b} share ${(100 * ov).toFixed(0)}% of their content words (min 40%: variants of one passage, not four passages)`)
    }
    for (const n of propers(it)) for (const tok of n.split(/\s+/)) { const s = propIdx.get(tok); if (s && s.size > 1) P(id, `proper noun "${tok}" also in ${[...s].filter(x => x !== id).join(', ')}`) }
  }
  if (items.length >= PER || final) {
    const n = items.length
    if (n !== PER) P(`author ${L}`, `${n} items (commission ${PER})`)
    const nv = items.filter(it => ['noun', 'verb'].includes(it.pos)).length
    if (nv < Math.ceil(PER * 3 / 8)) P(`author ${L}`, `noun/verb option sets ${nv}/${n} (min ${Math.ceil(PER * 3 / 8)})`)
    const shapes = items.flatMap(it => (it.worlds ?? []).map(w => String(w.shape ?? '').toLowerCase().trim()))
    if (new Set(shapes).size < 4) P(`author ${L}`, `${new Set(shapes).size} distinct world shapes (min 4)`)
    const ov = shapes.filter(s => /overturn|received view|revis/.test(s)).length
    if (ov > shapes.length / 4) P(`author ${L}`, `"received view overturned" in ${ov}/${shapes.length} worlds (max 25%)`)
  }
  console.log(`author ${L}: ${items.length} files`)
}
if (!itemsChecked) { console.error('REFUSING: zero items were checked'); process.exit(2) }
const items = targets.flatMap(L => all[L])
// what selection will see: share of option sets with a unique longest / shortest word (the served key is that word ~1 in 4)
const uniq = (it, f) => { const ls = it.choices.map(c => c.length); const m = f(...ls); return ls.filter(x => x === m).length === 1 }
console.log(`checked ${items.length} items, ${worldsChecked} worlds; option sets with a unique longest word ${items.filter(it => Array.isArray(it.choices) && uniq(it, Math.max)).length}, unique shortest ${items.filter(it => Array.isArray(it.choices) && uniq(it, Math.min)).length}`)
for (const w of warns) console.log('  warn ' + w)
for (const x of problems) console.log('  PROBLEM ' + x)
console.log(problems.length ? `${problems.length} problem(s)` : 'self-check: 0 problems')
process.exit(problems.length ? 1 : 0)
