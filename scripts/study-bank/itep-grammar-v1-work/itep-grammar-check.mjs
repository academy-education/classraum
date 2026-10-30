#!/usr/bin/env node
/**
 * itep-grammar-check.mjs — structural pre-flight for the iTEP SLATE Grammar v1 pilot
 * (ITEP-SLATE-GRAMMAR-V1.prereg.md §2). Pre-flight only; the gate is the agent review.
 *
 *   node scripts/study-bank/itep-grammar-v1-work/itep-grammar-check.mjs <items.json ...> --expect 24
 *   node .../itep-grammar-check.mjs <items.json ...> --expect 25 --assigned itep-grammar-v2-work/ASSIGNED.json [--author C]
 *
 * --assigned (v2 scale-up, ITEP-SLATE-GRAMMAR-V2.prereg.md §2) replaces the pilot's hard-coded table with a
 * per-id table [{id, author, slot, len, difficulty, category}], optionally restricted to one author, and adds
 * one check: the item's category must be the assigned one. The brief's "category at most twice per part" is
 * applied per input FILE under --assigned (one file = one author = the brief's batch); every other check,
 * including varied_dimension uniqueness, still runs over the whole input. Without --assigned behaviour is
 * unchanged.
 *
 * Exits 2 on unreadable/empty input or a count other than --expect (never prints a verdict
 * over data it did not read). Exits 1 on any structural failure. Prints every denominator.
 */
import { readFileSync } from 'node:fs'

const args = process.argv.slice(2)
const ei = args.indexOf('--expect')
const expect = ei >= 0 ? Number(args[ei + 1]) : null
const ai = args.indexOf('--assigned'), au = args.indexOf('--author')
const valueIdx = new Set([ei, ai, au].filter(i => i >= 0).map(i => i + 1))
const files = args.filter((a, i) => !a.startsWith('--') && !valueIdx.has(i))
const die = m => { console.error(`itep-grammar-check: ${m}`); process.exit(2) }
if (!files.length) die('no item files given')
if (expect == null || !Number.isInteger(expect) || expect < 1) die('--expect <n> is required')

// The brief's assigned table (briefs/itep-slate-grammar-v1.md), copied verbatim.
let ASSIGNED = {
  C01: ['D', 1, 'medium'], C02: ['D', 2, 'easy'], C03: ['C', 3, 'medium'], C04: ['B', 2, 'hard'],
  C05: ['C', 4, 'medium'], C06: ['B', 3, 'hard'], C07: ['A', 2, 'easy'], C08: ['A', 1, 'easy'],
  C09: ['B', 3, 'easy'], C10: ['C', 4, 'hard'], C11: ['D', 4, 'medium'], C12: ['A', 1, 'hard'],
  E01: ['C', 1, 'easy'], E02: ['D', 4, 'medium'], E03: ['B', 2, 'hard'], E04: ['D', 3, 'hard'],
  E05: ['C', 4, 'medium'], E06: ['A', 4, 'easy'], E07: ['D', 2, 'easy'], E08: ['A', 1, 'hard'],
  E09: ['A', 3, 'hard'], E10: ['C', 2, 'medium'], E11: ['B', 3, 'medium'], E12: ['B', 1, 'medium'],
}
const ASSIGNED_CAT = {}
if (ai >= 0) {
  let t
  try { t = JSON.parse(readFileSync(args[ai + 1], 'utf8')) } catch (e) { die(`--assigned ${args[ai + 1]}: unreadable (${e.message})`) }
  if (!Array.isArray(t) || !t.length) die('--assigned: not a non-empty array')
  const who = au >= 0 ? args[au + 1] : null
  if (who && !t.some(r => r.author === who)) die(`--author ${who}: no rows in the assigned table`)
  ASSIGNED = {}
  for (const r of t) if (!who || r.author === who) { const k = r.id.replace(/^ITG\d+-/, ''); ASSIGNED[k] = [r.slot, r.len, r.difficulty]; ASSIGNED_CAT[k] = r.category }
}
const P1 = 'Part 1: Sentence Completion', P2 = 'Part 2: Error Identification'
const PROMPT = { [P1]: 'Choose the word or phrase that correctly completes the sentence.', [P2]: 'Choose the underlined word or phrase that is NOT correct.' }
const WORDS = { easy: [8, 12], medium: [12, 18], hard: [15, 24] }
const BANNED = [/\bwhom\b/i, /\bfewer\b/i, /\bless\b/i, /\bthan (me|i)\b/i, /\bdata (is|are)\b/i, /\bneither\b.*\bnor\b/i, /\bdifferent than\b/i, /\bI wish I (was|were)\b/i, /\beveryone\b.*\btheir\b/i, /\bmay I\b/i, /\bcan I\b/i]
const LETTERS = ['A', 'B', 'C', 'D']

let items = []
for (const f of files) {
  let j
  try { j = JSON.parse(readFileSync(f, 'utf8')) } catch (e) { die(`${f}: unreadable (${e.message})`) }
  if (!Array.isArray(j) || !j.length) die(`${f}: not a non-empty JSON array`)
  items.push(...j.map(x => ({ ...x, __file: f })))
}
if (items.length !== expect) die(`read ${items.length} items from ${files.length} file(s), expected ${expect}`)

const norm = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9']+/g, ' ').trim()
const fails = [], warns = []
const fail = (id, m) => fails.push(`${id}: ${m}`)
const lenRank = (choices, k) => 1 + choices.filter(c => c.length < choices[k].length).length // ties -> lower rank

const ids = new Set(), dims = new Map(), cats = {}
const stat = { [P1]: { slot: {}, len: {}, n: 0 }, [P2]: { slot: {}, len: {}, n: 0 } }
const feats = { [P1]: [], [P2]: [] }
for (const it of items) {
  const id = String(it.id || '').replace(ai >= 0 ? /^ITG\d+-/ : /^ITG1-/, '')
  if (!ASSIGNED[id]) { fail(it.id, 'unknown id'); continue }
  if (ids.has(id)) fail(it.id, 'duplicate id'); ids.add(id)
  const [aSlot, aLen, aDiff] = ASSIGNED[id]
  const part = id.startsWith('C') ? P1 : P2
  if (it.part !== part) fail(it.id, `part ${JSON.stringify(it.part)} should be ${part}`)
  if (it.prompt !== PROMPT[part]) fail(it.id, 'prompt is not the verbatim brief prompt')
  if (it.difficulty !== aDiff) fail(it.id, `difficulty ${it.difficulty}, assigned ${aDiff}`)
  const ch = it.choices
  if (!Array.isArray(ch) || ch.length !== 4 || ch.some(c => typeof c !== 'string' || !c.trim())) { fail(it.id, 'needs exactly 4 non-empty string choices'); continue }
  if (new Set(ch.map(norm)).size !== 4) fail(it.id, 'duplicate options (normalised)')
  const hits = ch.filter(c => c === it.correct_answer).length
  if (hits !== 1) { fail(it.id, `key occurs ${hits} times in choices`); continue }
  const k = ch.indexOf(it.correct_answer)
  if (LETTERS[k] !== aSlot) fail(it.id, `key at ${LETTERS[k]}, assigned ${aSlot}`)
  if (it.key_slot !== LETTERS[k]) fail(it.id, `key_slot field ${it.key_slot} != actual ${LETTERS[k]}`)
  const r = lenRank(ch, k)
  if (r !== aLen) fail(it.id, `key length rank ${r}, assigned ${aLen}`)
  if (!String(it.explanation || '').trim()) fail(it.id, 'no explanation')
  if (!it.category) fail(it.id, 'no category')
  else if (ai >= 0 && it.category !== ASSIGNED_CAT[id]) fail(it.id, `category ${JSON.stringify(it.category)}, assigned ${JSON.stringify(ASSIGNED_CAT[id])}`)
  if (!it.varied_dimension) fail(it.id, 'no varied_dimension')
  else { const d = norm(it.varied_dimension); if (dims.has(d)) fail(it.id, `varied_dimension duplicates ${dims.get(d)}`); dims.set(d, it.id) }
  const scope = ai >= 0 ? `${part} [${it.__file}]` : part
  cats[scope] ??= {}; cats[scope][it.category] = (cats[scope][it.category] || 0) + 1
  const p = String(it.passage || '')
  let sentence = p
  if (part === P1) {
    const blanks = (p.match(/_{4,}/g) || []).length
    if (blanks !== 1) fail(it.id, `passage has ${blanks} blanks, needs exactly 1`)
  } else {
    const segs = [...p.matchAll(/\[([A-D]):\s?([^\]]*)\]/g)]
    if (segs.length !== 4 || segs.map(s => s[1]).join('') !== 'ABCD') fail(it.id, 'passage needs [A: ..] [B: ..] [C: ..] [D: ..] in order')
    else {
      segs.forEach((s, i) => { if (s[2] !== ch[i]) fail(it.id, `segment ${s[1]} text ${JSON.stringify(s[2])} != choice ${JSON.stringify(ch[i])}`) })
      sentence = p.replace(/\[[A-D]:\s?([^\]]*)\]/g, '$1')
      for (const c of ch) {
        const n = sentence.split(c).length - 1
        if (n !== 1) fail(it.id, `segment ${JSON.stringify(c)} occurs ${n} times in the sentence`)
      }
    }
  }
  const wc = sentence.replace(/_{4,}/g, 'X').split(/\s+/).filter(Boolean).length
  const [lo, hi] = WORDS[aDiff]
  if (wc < lo - 2 || wc > hi + 3) warns.push(`${it.id}: ${wc} words, target about ${lo}-${hi} for ${aDiff}`)
  for (const re of BANNED) if (re.test(sentence) || ch.some(c => re.test(c))) warns.push(`${it.id}: banned-point keyword ${re} present - graders check`)
  const s = stat[part]; s.n++; s.slot[LETTERS[k]] = (s.slot[LETTERS[k]] || 0) + 1; s.len[r] = (s.len[r] || 0) + 1
  const wcs = ch.map(c => c.split(/\s+/).length)
  feats[part].push({ k, longest: ch.every((c, i) => i === k || c.length < ch[k].length), shortest: ch.every((c, i) => i === k || c.length > ch[k].length), mostWords: wcs.every((w, i) => i === k || w < wcs[k]), fewestWords: wcs.every((w, i) => i === k || w > wcs[k]), onlyCap: /^[A-Z]/.test(ch[k]) && ch.filter(c => /^[A-Z]/.test(c)).length === 1 })
}
for (const [part, m] of Object.entries(cats)) for (const [c, n] of Object.entries(m)) if (n > 2) fail(part, `category ${c} used ${n} times (max 2)`)
for (const id of Object.keys(ASSIGNED)) if ((ai >= 0 || expect === 24) && !ids.has(id)) fail(id, 'missing')

console.log(`read ${items.length} items from ${files.length} file(s); Part 1 n=${stat[P1].n}, Part 2 n=${stat[P2].n}`)
for (const part of [P1, P2]) {
  const s = stat[part], f = feats[part], n = f.length
  const nCats = new Set(Object.entries(cats).filter(([k]) => k.startsWith(part)).flatMap(([, m]) => Object.keys(m))).size
  console.log(`${part}: key slot ${JSON.stringify(s.slot)} | key length rank ${JSON.stringify(s.len)} | categories ${nCats} distinct`)
  if (!n) continue
  for (const name of ['longest', 'shortest', 'mostWords', 'fewestWords', 'onlyCap']) {
    const hit = f.filter(x => x[name]).length
    console.log(`  key is uniquely ${name}: ${hit}/${n} (${(100 * hit / n).toFixed(1)}%; chance about 25% for a unique extreme)`)
  }
}
if (warns.length) { console.log(`warnings (${warns.length}):`); warns.forEach(w => console.log('  ' + w)) }
if (fails.length) { console.log(`FAIL (${fails.length}):`); fails.forEach(x => console.log('  ' + x)); process.exit(1) }
console.log('PASS: structural pre-flight (not the gate)')
