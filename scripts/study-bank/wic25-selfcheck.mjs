#!/usr/bin/env node
/**
 * wic25-selfcheck.mjs [A|B|C|D ...] [--final] [--work <dir>] [--live <path>] [--per-author N]
 *
 * Structural self-check for sat-cs-wic-v25 FOUR-WORLD author files
 * (scripts/study-bank/sat-cs-wic-v25-work/<L>/WIC25<L>-NN.json, one item per file).
 * Rules from PREREG-WIC25-2026-10-23.md.
 *
 * One item = ONE option set of four words + FOUR passage variants ("worlds").
 * World k keys a different option; the other three are killed by that world's
 * passage. A seeded selection (wic25-select.mjs) later picks ONE world to serve.
 * Because every option is the key of some world, the option set carries no
 * information about which is served. This script checks, for EVERY world (any
 * world could be the one served):
 *   - the four worlds key four DIFFERENT options, which together are the option set
 *   - every world contains the item's blank_sentence verbatim (so the blank's own
 *     sentence is identical across worlds and cannot decide the key by itself)
 *   - each kill quotes 2+ consecutive words of THAT world's passage lying OUTSIDE
 *     the blank sentence; at most one kill per world is "explicit"
 *   - passage 50-110 words, one six-underscore blank, no a/an before it, the word
 *     after the blank equals after_blank; worlds share >= 40% of their content words
 *   - letters in the author's range, exclusion list (live + v17..v24), denylist,
 *     no stem repeated in the batch, no antonym pairs, all items hard, no blank sentence
 *     shared across items, world lengths within 1.3x, the brief's worked-example words banned
 * Per-author count rules apply once the author has N files (default 8) or --final.
 *
 * --work / --live / --per-author are for break-tests only.
 * Exit 1 on any problem, 2 on unreadable or absent input. Never a pass over nothing.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
// v25 ranges, rotated from v24 (A a-f, B g-l, C m-r, D s-z); none narrower than 6 letters
const RANGE = { A: 'stuvwxyz', B: 'abcdef', C: 'ghijkl', D: 'mnopqr' }
{ const joined = Object.values(RANGE).join('')
  if (Object.values(RANGE).some(r => r.length < 6) || joined.length !== 26 || new Set(joined).size !== 26) { console.error('REFUSING: RANGE must be four disjoint ranges of >= 6 letters covering a-z'); process.exit(2) } }
const PROMPT = 'Which choice completes the text with the most logical and precise word or phrase?'
const DENY = new Set(['ductile', 'hygroscopic', 'allopatric', 'recondite', 'sedulous', 'pellucid', 'inchoate', 'perspicacious', 'lachrymose', 'sententious', 'plangent', 'friable', 'fusible', 'abstemious', 'bilious', 'avuncular', 'commodious', 'mawkish', 'raffish', 'scabrous', 'venal', 'promulgate', 'sesquipedalian', 'obstreperous', 'pusillanimous', 'tendentious', 'apodictic', 'dispositive', 'eleemosynary', 'quotidian', 'otiose', 'ineffable', 'jejune', 'lugubrious', 'nugatory', 'pertinacious'])
// the worked example in sat-cs-wic-v25-work/AUTHOR-BRIEF.md: every author has read it, so its words are spent
for (const w of ['outstayed', 'reflected', 'parceled', 'rerouted']) DENY.add(w)
const args = process.argv.slice(2)
const argOf = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null }
const W = argOf('--work') ?? 'scripts/study-bank/sat-cs-wic-v25-work'
const PER = Number(argOf('--per-author') ?? 8)
const final = args.includes('--final')
const letters = args.filter(a => /^[ABCD]$/.test(a))
const rdj = p => { if (!existsSync(p)) { console.error(`REFUSING: ${p} missing (run wic25-livewords.mjs first)`); process.exit(2) } try { return JSON.parse(readFileSync(p, 'utf8')) } catch (e) { console.error(`REFUSING: ${p}: ${e.message}`); process.exit(2) } }
const live = rdj(argOf('--live') ?? 'scripts/study-bank/sat-cs-wic-v25.live-words.json')
if (!Array.isArray(live.keys) || !Array.isArray(live.options) || live.options.length < 1000) { console.error(`REFUSING: live-words file holds ${live.options?.length} option words (expected >= 1000 after v24)`); process.exit(2) }
/* every v19, v20, v23 and v24 option word (key AND distractors, kept AND dropped) is
 * excluded directly from the frozen files too, so the exclusion does not depend on
 * the live-words file having been regenerated. Refuses unless each holds 40 items. */
const PRIOR = ['v19', 'v20', 'v23', 'v24']
const prior = {}
for (const v of PRIOR) {
  const b = rdj(`scripts/study-bank/sat-cs-wic-${v}.batch.json`)
  if (!Array.isArray(b) || b.length !== 40) { console.error(`REFUSING: sat-cs-wic-${v}.batch.json holds ${b?.length} items, not 40`); process.exit(2) }
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
const wordsOf = s => String(s ?? '').split(/\s+/).filter(Boolean)
/* CONTENT-word set: on the worked example, variants of one passage share 53-62% of their content
 * words and an unrelated passage that keeps only the blank sentence shares 29-32%; all-word sets
 * read 61-68% vs 43-47%, too close to separate. The bar is 40% of content words. */
const STOP = new Set('a an the and or but of to in on at by for with from as that this it its their his her they them was were is are be been had has have did do not no nor so than then when while which who whom whose what where after before into over under every each any all one two'.split(' '))
const wordSet = s => new Set((norm(s).replace(/______/g, ' ').match(/[a-z']+/g) ?? []).filter(w => !STOP.has(w)))

const load = L => {
  const dir = `${W}/${L}`
  if (!existsSync(dir)) return []
  return readdirSync(dir).filter(f => /^WIC25[A-D]-\d\d\.json$/.test(f)).sort().map(f => {
    try { return JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')) } catch (e) { console.error(`REFUSING: ${dir}/${f} unreadable: ${e.message}`); process.exit(2) }
  })
}
const all = Object.fromEntries(['A', 'B', 'C', 'D'].map(L => [L, load(L)]))
const targets = letters.length ? letters : ['A', 'B', 'C', 'D'].filter(L => all[L].length)
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
    if (!new RegExp(`^WIC25${L}-\\d\\d$`).test(id)) P(id, `id must be WIC25${L}-NN`)
    if (it.domain !== 'Craft and Structure' || it.subskill !== 'Words in Context') P(id, 'domain/subskill must be Craft and Structure / Words in Context')
    if (it.difficulty !== 'hard') P(id, 'difficulty must be hard (every world of every v25 item is authored hard)')
    if (it.prompt !== PROMPT) P(id, 'prompt must be the standard WIC prompt exactly')
    const ch = (it.choices ?? []).map(String)
    if (ch.length !== 4 || new Set(ch.map(c => c.toLowerCase())).size !== 4) P(id, 'need 4 distinct choices')
    for (const c of ch) {
      if (wordsOf(c).length > 2) P(id, `"${c}" is more than two words (word-shaped only)`)
      if (c !== c.toLowerCase()) P(id, `"${c}" must be lowercase`)
      if (!RANGE[L].includes(c[0]?.toLowerCase())) P(id, `"${c}" outside author ${L} letters ${RANGE[L]}`)
      if (DENY.has(c.toLowerCase())) P(id, `"${c}" is denylisted (above ceiling, or spent as the brief's worked example)`)
      if (liveSet.has(c.toLowerCase())) P(id, `"${c}" is a live WIC / v17-v24 option or key word`)
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
