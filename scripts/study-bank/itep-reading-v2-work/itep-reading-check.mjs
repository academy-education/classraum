#!/usr/bin/env node
/**
 * itep-reading-check.mjs — STRUCTURAL pre-flight for iTEP SLATE Reading v2 (briefs/itep-slate-reading-v2.md).
 * v2 changes from v1: ITR2 ids and per-author set lists from ASSIGNED.json; the assigned key-length rank per
 * non-vocabulary item (longest / shortest / middle); a he/she/him/her/his in an option when the passage has none;
 * a two-part ("and" / comma) lone feature; prompt-opening caps 3 per author and max(4, ceil(n/16)) per batch;
 * the uniquely-longest/shortest caps counted over non-vocabulary items.
 * Not the gate: a clean run means the file is well-formed and free of the mechanical tells we know how to count.
 *
 *   node itep-reading-check.mjs <items-X.json> [more...] --expect <n-items> [--assigned ASSIGNED.json]
 *        [--existing-names existing-names.json] [--batch]
 *
 * Exits 2 (never a verdict) on unreadable/empty input or an item count other than --expect.
 * Exits 1 on any problem; prints "PROBLEMS 0" and exits 0 otherwise.
 *
 * Per item: 4 distinct choices incl. the key; why (and why2 for inference) verbatim in the passage; 3 rationales
 * quoting their choices; explanation quotes the key; no letter names; length ratio <= 1.5; quotations in
 * explanations/rationales verbatim from the passage or an option.
 * Per set: word range per part; <= 1 negation per paragraph; names declared, initials as assigned, absent from the
 * bank's name list, never shared across sets; every mid-sentence capitalised word declared; kinds and difficulty
 * exactly as assigned; tested vocabulary word occurs once.
 * Per author (and with --batch over all files): key uniquely longest / shortest caps; prompt-opening caps; key
 * 4-gram shared by two keys; option text repeated; and the lone-surface-feature check (ISEE d17-21 merge): for every
 * feature carried by exactly one option of an item, the key must not carry it in >= 75% of >= 3 such items, nor in
 * 0 of >= 4 (a free elimination).
 */
import { readFileSync, existsSync } from 'node:fs'

const argv = process.argv.slice(2)
const flag = k => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null }
const files = argv.filter((a, i) => !a.startsWith('--') && !['--expect', '--assigned', '--existing-names'].includes(argv[i - 1]))
const expect = Number(flag('--expect'))
const BATCH = argv.includes('--batch')
const die = (m, c = 2) => { console.error(`itep-reading-check: ${m}`); process.exit(c) }
if (!files.length) die('no input files')
if (!Number.isInteger(expect) || expect < 1) die('--expect <n> is required')
const readJson = p => { if (!existsSync(p)) die(`missing ${p}`); try { return JSON.parse(readFileSync(p, 'utf8')) } catch (e) { die(`${p}: ${e.message}`) } }
const assigned = flag('--assigned') ? readJson(flag('--assigned')) : null
const existingNames = flag('--existing-names') ? new Set(Object.keys(readJson(flag('--existing-names')))) : null

const docs = files.map(f => ({ f, d: readJson(f) }))
const sets = docs.flatMap(({ f, d }) => (Array.isArray(d?.sets) ? d.sets : []).map(s => ({ ...s, _file: f, _author: d.author })))
const items = sets.flatMap(s => (s.items || []).map(it => ({ ...it, _set: s })))
if (!items.length) die('read 0 items')
if (items.length !== expect) die(`read ${items.length} items from ${files.length} file(s), --expect ${expect}`)

const P = []
const prob = m => P.push(m)
const norm = s => String(s ?? '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim()
const words = s => norm(s).split(' ').filter(Boolean).length
const NEG = /\b(not|no|never|nothing|nor|none|neither|nobody|nowhere|cannot)\b|n't\b/gi
const RANGE = { 1: [55, 95], 2: [180, 240], 3: [450, 560] }
const ITEMS_PER = { 1: 1, 2: 4, 3: 6 }
const KINDS = new Set(['main-idea', 'detail', 'vocabulary', 'not-except', 'purpose', 'inference'])

// ---------- per set ----------
const nameOwner = new Map()
const byAuthor = new Map()
for (const s of sets) {
  const id = s.set_id || '(no set_id)'
  const a = s._author
  if (!byAuthor.has(a)) byAuthor.set(a, [])
  byAuthor.get(a).push(s)
  const suffix = id.split('-').pop()
  const part = s.part
  if (![1, 2, 3].includes(part)) { prob(`${id}: part ${part}`); continue }
  if (!/^ITR2-[A-H]-(P1A|P1B|P2A|P2B|P3A|P3B)$/.test(id)) prob(`${id}: set_id shape`)
  if (Number(suffix[1]) !== part) prob(`${id}: part ${part} does not match id`)
  const w = words(s.passage)
  const [lo, hi] = RANGE[part]
  if (w < lo || w > hi) prob(`${id}: ${w} words, part ${part} wants ${lo}-${hi}`)
  String(s.passage || '').split(/\n\s*\n/).forEach((para, i) => {
    const n = (para.match(NEG) || []).length
    if (n > 1) prob(`${id} para ${i + 1}: ${n} negations (${para.match(NEG).join(',')})`)
  })
  if ((s.items || []).length !== ITEMS_PER[part]) prob(`${id}: ${(s.items || []).length} items, part ${part} wants ${ITEMS_PER[part]}`)
  // names
  const names = Array.isArray(s.names) ? s.names : (prob(`${id}: names missing`), [])
  const other = new Set(Array.isArray(s.other_caps) ? s.other_caps : [])
  const declared = new Set([...names.flatMap(n => n.split(/\s+/)), ...other])
  const passage = String(s.passage || '')
  for (const m of passage.matchAll(/(?<![.!?:"“]\s)(?<![.!?:"“])(?<!^)(?<!\n)\b([A-Z][a-zA-Z'’-]+)\b/g)) {
    const before = passage.slice(Math.max(0, m.index - 3), m.index)
    if (/^\s*$/.test(before) || /[.!?:"“]\s*$/.test(before) || /\n\s*$/.test(before)) continue
    const wd = m[1].replace(/['’]s$/, '')
    if (wd === 'I' || declared.has(wd)) continue
    prob(`${id}: capitalised "${wd}" not declared in names/other_caps`)
  }
  const want = assigned?.authors?.[a]
  for (const n of names) {
    for (const part of n.split(/\s+/)) {
      if (want?.initials && !want.initials.includes(part[0])) prob(`${id}: name "${part}" outside assigned initials ${want.initials}`)
      if (existingNames?.has(part)) prob(`${id}: name "${part}" already used in a bank passage`)
      const prev = nameOwner.get(part)
      if (prev && prev !== id) prob(`${id}: name "${part}" also used in ${prev}`)
      nameOwner.set(part, id)
    }
  }
  if (want) {
    const plan = want.sets?.[suffix]
    if (!plan) prob(`${id}: not in the assignment for author ${a}`)
    else {
      const kinds = (s.items || []).map(i => i.kind).join(',')
      if (kinds !== plan.kinds.join(',')) prob(`${id}: kinds ${kinds}, assigned ${plan.kinds.join(',')}`)
      if (s.genre !== plan.genre) prob(`${id}: genre "${s.genre}", assigned "${plan.genre}"`)
      if (plan.part !== part) prob(`${id}: part ${part}, assigned ${plan.part}`)
    }
  }
}
for (const [a, ss] of byAuthor) {
  const ids = ss.map(s => s.set_id.split('-').pop()).join(',')
  const want = assigned?.authors?.[a] ? Object.keys(assigned.authors[a].sets).join(',') : null
  if (want && ids !== want) prob(`author ${a}: sets ${ids}, want ${want}`)
}
const planOf = it => assigned?.authors?.[it._set._author]?.sets?.[String(it._set.set_id).split('-').pop()]?.items?.[Number(String(it.qid).split('-').pop()) - 1] ?? null

// ---------- per item ----------
const quotesOf = s => [...String(s).matchAll(/"([^"]+)"/g)].map(m => m[1])
const featureSets = []
for (const it of items) {
  const s = it._set, id = it.qid || '(no qid)'
  const passage = norm(s.passage)
  if (!String(id).startsWith(`${s.set_id}-`)) prob(`${id}: qid does not start with ${s.set_id}-`)
  if (!KINDS.has(it.kind)) prob(`${id}: kind ${it.kind}`)
  const wantDiff = s.part === 1 ? 'easy' : s.part === 2 ? 'medium' : (['main-idea', 'detail'].includes(it.kind) ? 'medium' : 'hard')
  if (it.difficulty !== wantDiff) prob(`${id}: difficulty ${it.difficulty}, brief wants ${wantDiff}`)
  const ch = Array.isArray(it.choices) ? it.choices : []
  if (ch.length !== 4 || new Set(ch.map(c => norm(c).toLowerCase())).size !== 4) prob(`${id}: needs 4 distinct choices`)
  if (!ch.includes(it.correct_answer)) prob(`${id}: key is not one of the choices`)
  if (!it.why || !passage.includes(norm(it.why))) prob(`${id}: why is not verbatim passage text`)
  if (it.kind === 'inference') {
    if (!it.why2 || !passage.includes(norm(it.why2))) prob(`${id}: inference needs a verbatim why2`)
    else if (norm(it.why2) === norm(it.why) || norm(it.why).includes(norm(it.why2)) || norm(it.why2).includes(norm(it.why))) prob(`${id}: why2 must be a different place in the text`)
  }
  if (it.kind === 'vocabulary') {
    const w = quotesOf(it.prompt)[0]
    if (!w) prob(`${id}: vocabulary prompt must quote the tested word`)
    else {
      const n = (passage.match(new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')) || []).length
      if (n !== 1) prob(`${id}: tested word "${w}" occurs ${n} times in the passage (want 1)`)
    }
  }
  if (it.kind === 'not-except' && !/\b(NOT|EXCEPT)\b/.test(it.prompt || '')) prob(`${id}: not-except prompt needs NOT or EXCEPT in capitals`)
  const L = ch.map(c => String(c).length)
  if (L.length === 4 && Math.max(...L) / Math.min(...L) > 1.5 + 1e-9) prob(`${id}: length ratio ${(Math.max(...L) / Math.min(...L)).toFixed(2)} > 1.5`)
  const texts = [it.explanation || '', ...(it.distractor_rationales || []).map(d => d.reason || '')]
  for (const t of texts) if (/\b(choice|option|answer) [A-D]\b|\([A-D]\)/.test(t)) prob(`${id}: names a letter`)
  if (!String(it.explanation || '').includes(`"${it.correct_answer}"`)) prob(`${id}: explanation does not quote the key`)
  const dr = it.distractor_rationales || []
  if (dr.length !== 3 || new Set(dr.map(d => d.choice)).size !== 3 || dr.some(d => !ch.includes(d.choice) || d.choice === it.correct_answer)) prob(`${id}: needs 3 rationales, one per distractor`)
  for (const d of dr) if (!String(d.reason || '').startsWith(`"${d.choice}"`)) prob(`${id}: rationale does not start with its choice quoted`)
  for (const t of texts) for (const q of quotesOf(t)) {
    const nq = norm(q).replace(/[.,;:!?]+$/, '')
    if (!passage.includes(nq) && !ch.some(c => norm(c).includes(nq)) && !norm(it.prompt).includes(nq)) prob(`${id}: quotation not in passage or options: "${q.slice(0, 60)}"`)
  }
  // v2: assigned key-length rank (R5)
  const plan = planOf(it)
  if (assigned && it.kind !== 'vocabulary' && L.length === 4) {
    const want = plan?.key_length, k = String(it.correct_answer).length, mx = Math.max(...L), mn = Math.min(...L)
    const uMax = k === mx && L.filter(x => x === mx).length === 1, uMin = k === mn && L.filter(x => x === mn).length === 1
    if (!want) prob(`${id}: no assigned key_length`)
    else if (want === 'longest' && k !== mx) prob(`${id}: key length assigned longest, key is not the longest option`)
    else if (want === 'shortest' && k !== mn) prob(`${id}: key length assigned shortest, key is not the shortest option`)
    else if (want === 'middle' && (uMax || uMin)) prob(`${id}: key length assigned middle, key is uniquely ${uMax ? 'longest' : 'shortest'}`)
  }
  // v2: no gendered pronoun in an option unless the passage has one (pending lesson 4)
  for (const c of ch) for (const pr of String(c).match(/\b(he|she|him|her|his|hers)\b/gi) || []) {
    const fam = /^(he|him|his)$/i.test(pr) ? /\b(he|him|his)\b/i : /\b(she|her|hers)\b/i
    if (!fam.test(String(s.passage))) prob(`${id}: option uses "${pr}" but the passage never does`)
  }
  if (ch.length === 4) featureSets.push({ it, ch, passage })
}

// ---------- cross-item (per author, and batch-wide with --batch) ----------
const HEDGE = /\b(may|might|some|partly|perhaps|could|somewhat|likely|probably|seem|seems|usually|often)\b/i
const ABS = /\b(all|every|always|never|only|entirely|completely|whole|any|none|nothing|must|alone)\b/i
const CONTRAST = /\b(but|although|though|while|however|yet|instead)\b/i
const firstWord = c => norm(c).toLowerCase().split(' ')[0]
const quotes4 = (c, passage) => { const w = norm(c).toLowerCase().replace(/[^a-z0-9' ]/g, '').split(' '); const p = passage.toLowerCase().replace(/[^a-z0-9' ]/g, ' ').replace(/\s+/g, ' '); for (let i = 0; i + 4 <= w.length; i++) if (p.includes(w.slice(i, i + 4).join(' '))) return true; return false }
const FEATURES = {
  hedge: c => HEDGE.test(c), absolute: c => ABS.test(c), contrast: c => CONTRAST.test(c),
  punct: c => /[;—–]|\s-\s/.test(c), two_part: c => /\band\b|,/i.test(c), number: c => /\d|\b(one|two|three|four|five|six|seven|eight|nine|ten|twenty|hundred|thousand)\b/i.test(c),
}
function crossChecks(group, label, isBatch) {
  const n = group.length
  let uLong = 0, uShort = 0
  for (const { it, ch } of group) {
    if (it.kind === 'vocabulary') continue
    const L = ch.map(c => c.length), k = it.correct_answer.length
    if (k === Math.max(...L) && L.filter(x => x === k).length === 1) uLong++
    if (k === Math.min(...L) && L.filter(x => x === k).length === 1) uShort++
  }
  const cap = Math.max(3, Math.ceil(group.filter(g => g.it.kind !== 'vocabulary').length / 4))
  if (uLong > cap) prob(`${label}: key uniquely longest ${uLong}/${n} (max ${cap})`)
  if (uShort > cap) prob(`${label}: key uniquely shortest ${uShort}/${n} (max ${cap})`)
  // prompt openings
  const stem = s => norm(s).toLowerCase().replace(/"[^"]*"/g, 'Q').split(' ').slice(0, 4).join(' ')
  const stems = {}; for (const { it } of group) stems[stem(it.prompt)] = (stems[stem(it.prompt)] || 0) + 1
  const sCap = isBatch ? Math.max(4, Math.ceil(n / 16)) : 3
  for (const [s, c] of Object.entries(stems)) if (c > sCap) prob(`${label}: prompt opening "${s}" x${c} (max ${sCap})`)
  // shared key 4-grams, repeated options
  const grams = new Map()
  for (const { it } of group) {
    const w = norm(it.correct_answer).toLowerCase().replace(/[^a-z0-9' ]/g, '').split(' ')
    const mine = new Set(); for (let i = 0; i + 4 <= w.length; i++) mine.add(w.slice(i, i + 4).join(' '))
    for (const g of mine) { if (grams.has(g) && grams.get(g) !== it.qid) prob(`${label}: keys ${grams.get(g)} and ${it.qid} share "${g}"`); grams.set(g, it.qid) }
  }
  const opt = new Map()
  for (const { it, ch } of group) for (const c of ch) { const k = norm(c).toLowerCase(); if (opt.has(k) && opt.get(k) !== it.qid) prob(`${label}: option "${c.slice(0, 50)}" in ${opt.get(k)} and ${it.qid}`); opt.set(k, it.qid) }
  // lone surface features (single-word vocabulary options excluded from first-word)
  const tally = {}
  const add = (f, keyHas) => { tally[f] ??= { lone: 0, key: 0 }; tally[f].lone++; if (keyHas) tally[f].key++ }
  for (const { it, ch, passage } of group) {
    const fs = { ...FEATURES, quotes_passage: c => quotes4(c, passage) }
    for (const [f, test] of Object.entries(fs)) { const has = ch.map(test); if (has.filter(Boolean).length === 1) add(f, has[ch.indexOf(it.correct_answer)]) }
    if (it.kind !== 'vocabulary') { const fw = ch.map(firstWord); for (const w of new Set(fw)) if (fw.filter(x => x === w).length === 1 && ch.length === 4) add(`first word "${w}"`, firstWord(it.correct_answer) === w) }
    const L = ch.map(c => c.length), k = it.correct_answer.length
    if (L.filter(x => x === Math.max(...L)).length === 1) add('uniquely longest', k === Math.max(...L))
    if (L.filter(x => x === Math.min(...L)).length === 1) add('uniquely shortest', k === Math.min(...L))
  }
  for (const [f, t] of Object.entries(tally)) {
    if (f.startsWith('first word') && t.lone < 3) continue
    if (t.lone >= 3 && t.key / t.lone >= 0.75) prob(`${label}: key carries the lone "${f}" in ${t.key}/${t.lone} items (>= 75%)`)
    if (t.lone >= 4 && t.key === 0 && !f.startsWith('first word') && !f.startsWith('uniquely')) prob(`${label}: lone "${f}" is never the key (0/${t.lone}): a free elimination`)
  }
  return { n, uLong, uShort, tally }
}
const summaries = []
for (const [a] of byAuthor) summaries.push([`author ${a}`, crossChecks(featureSets.filter(x => x.it._set._author === a), `author ${a}`, false)])
if (BATCH) summaries.push(['batch', crossChecks(featureSets, 'batch', true)])

// ---------- report ----------
const perPart = {}; for (const s of sets) perPart[`part ${s.part}`] = (perPart[`part ${s.part}`] || 0) + (s.items || []).length
const kinds = {}; for (const it of items) kinds[it.kind] = (kinds[it.kind] || 0) + 1
console.log(`read ${files.length} file(s): ${sets.length} sets, ${items.length} items ${JSON.stringify(perPart)}`)
console.log(`kinds ${JSON.stringify(kinds)}`)
for (const s of sets) console.log(`  ${s.set_id.padEnd(12)} part ${s.part} ${String(words(s.passage)).padStart(3)} words  ${s.genre}: ${s.title}`)
for (const [label, r] of summaries) console.log(`${label}: key uniquely longest ${r.uLong}/${r.n}, uniquely shortest ${r.uShort}/${r.n}`)
console.log(`PROBLEMS ${P.length}`)
for (const p of P) console.log('  ' + p)
process.exit(P.length ? 1 : 0)
