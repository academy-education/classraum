#!/usr/bin/env node
/**
 * merge.mjs — mechanical check + key-slot deal for map-v2 Reading batch 1 PASSAGE sets (author aid and coordinator).
 * Adapted from scratchpad/isee-draft16-work/merge.mjs (the ISEE agent route) for MAP's shape: one passage, THREE
 * four-choice items, all in the passage's own instructional area (Literary Text or Informational Text).
 *
 *   node scripts/study-bank/map-v2-work/reading/merge.mjs <authored.json> [more.json ...]
 *   OUT=<merged.json> to write the dealt items (default: next to the first input, "<name>.merged.json")
 *
 * Exits 2 on input it cannot read, 1 on any mechanical problem, 0 only when "mechanical problems: 0".
 * With several files (the coordinator's cross-author run) it also flags passages that share a title or most of
 * their content words with another passage in the run, and every passage that repeats an EXCLUSIONS opening.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const die = m => { console.error('REFUSING: ' + m); process.exit(2) }
const files = process.argv.slice(2)
if (!files.length) die('usage: merge.mjs <authored.json> [...]')
const sets = files.flatMap(f => { if (!existsSync(f)) die(`missing ${f}`); try { const a = JSON.parse(readFileSync(f, 'utf8')); if (!Array.isArray(a)) die(`${f} is not an array of passage sets`); return a.map(s => ({ ...s, _file: basename(f) })) } catch (e) { die(`${f}: ${e.message}`) } })
if (!sets.length) die('zero passage sets read')
const ASSIGN = JSON.parse(readFileSync(join(HERE, 'assignments.json'), 'utf8'))
const slot = Object.fromEntries(ASSIGN.passages.map(p => [p.passage_id, p]))
const excl = readFileSync(join(HERE, 'EXCLUSIONS-reading-passages.txt'), 'utf8').split('\n').filter(l => l.startsWith('['))
if (excl.length < 500) die(`exclusion list holds only ${excl.length} passages`)

const K = 4
const WORDS = { 5: [170, 260], 6: [200, 300], 7: [240, 340], 8: [280, 380] }
const KINDS = {
  'Literary Text': { must: 'theme', may: ['inference', 'character', 'point-of-view', 'structure', 'figurative', 'purpose'] },
  'Informational Text': { must: 'central-idea', may: ['detail', 'inference', 'structure', 'purpose', 'point-of-view', 'evidence'] },
}
const NEG = /\b(not|no|never|nothing|nor|none|neither|nobody|nowhere|cannot)\b|n't\b/gi
const norm = s => String(s ?? '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim()
const words = s => norm(s).split(' ').filter(Boolean).length
const content = s => new Set(norm(s).toLowerCase().match(/[a-z]{5,}/g) ?? [])
const jac = (a, b) => { let i = 0; for (const x of a) if (b.has(x)) i++; return i / (a.size + b.size - i || 1) }
const probs = []
const P = (m) => probs.push(m)

for (const p of sets) {
  const s = slot[p.passage_id]
  if (!s) { P(`${p.passage_id}: not an assigned passage id (assignments.json)`); continue }
  if (p.map_area !== s.map_area) P(`${p.passage_id}: map_area must be "${s.map_area}"`)
  if (p.grade_target !== s.grade) P(`${p.passage_id}: grade_target ${p.grade_target}, assigned ${s.grade}`)
  if (p.genre !== s.genre) P(`${p.passage_id}: genre "${p.genre}", assigned "${s.genre}"`)
  if (!p.title) P(`${p.passage_id}: title missing`)
  const poem = p.genre === 'poem'
  const w = words(p.passage), [lo, hi] = poem ? [120, 260] : WORDS[s.grade]
  if (w < lo || w > hi) P(`${p.passage_id}: ${w} words, grade ${s.grade} ${poem ? 'poem ' : ''}range ${lo}-${hi}`)
  String(p.passage ?? '').split(/\n\n/).forEach((para, i) => { const n = (para.match(NEG) || []).length; if (n > 1) P(`${p.passage_id} para ${i + 1}: ${n} negation words (${para.match(NEG).join(',')}); at most one`) })
  if (!Array.isArray(p.items) || p.items.length !== 3) { P(`${p.passage_id}: needs exactly 3 items`); continue }
  const kinds = p.items.map(i => i.kind)
  const spec = KINDS[s.map_area]
  if (kinds.filter(k => k === spec.must).length !== 1) P(`${p.passage_id}: exactly one "${spec.must}" item`)
  if (kinds.some(k => k !== spec.must && !spec.may.includes(k))) P(`${p.passage_id}: kinds ${kinds.join(',')}; others must come from ${spec.may.join('/')}`)
  if (new Set(kinds).size !== 3) P(`${p.passage_id}: three different kinds`)
  for (const it of p.items) {
    const q = it.qid ?? '?'
    if (!/^MRV2-R\d-P\d{2}-[123]$/.test(q) || !q.startsWith(p.passage_id)) P(`${q}: qid must be <passage_id>-1..3`)
    if (!Array.isArray(it.choices) || it.choices.length !== K || new Set(it.choices.map(norm)).size !== K) { P(`${q}: needs ${K} distinct choices`); continue }
    if (!it.choices.includes(it.correct_answer)) P(`${q}: key not in choices`)
    if (!it.why || !norm(p.passage).includes(norm(it.why))) P(`${q}: "why" must be a verbatim passage substring`)
    const L = it.choices.map(c => norm(c).length)
    if (Math.max(...L) / Math.min(...L) > 1.5 + 1e-9) P(`${q}: option length ratio ${(Math.max(...L) / Math.min(...L)).toFixed(2)} > 1.5`)
    if (!it.explanation || /\b(choice|option|answer) [A-D]\b|\([A-D]\)/.test(it.explanation)) P(`${q}: explanation missing or names a letter`)
    else if (!it.explanation.includes(`"${it.correct_answer}"`)) P(`${q}: explanation must quote the key in double quotes`)
    const dr = it.distractor_rationales ?? []
    if (dr.length !== K - 1 || new Set(dr.map(d => d.choice)).size !== K - 1 || dr.some(d => !it.choices.includes(d.choice) || d.choice === it.correct_answer)) P(`${q}: distractor_rationales: one per wrong option`)
    for (const d of dr) { if (!String(d.reason ?? '').includes(`"${d.choice}"`)) P(`${q}: rationale does not quote its choice`); if (!d.fault) P(`${q}: rationale for "${String(d.choice).slice(0, 30)}" needs a "fault" (contradicts / different question / not in passage / too narrow / too broad / overstates)`) }
    if (!['easy', 'medium', 'hard'].includes(it.difficulty)) P(`${q}: difficulty must be easy|medium|hard`)
    if (/\b(paragraph|stanza|line) (\d+)|\b(first|second|third|fourth|fifth|final|last) (paragraph|stanza)/i.test(it.prompt ?? '')) {
      const blocks = String(p.passage).split(/\n\n/).length
      const m = (it.prompt.match(/\b(?:paragraph|stanza) (\d+)/i) ?? [])[1]
      if (m && +m > blocks) P(`${q}: prompt points at block ${m} but the passage has ${blocks}`)
    }
  }
  // exclusion overlap: the opening of this passage vs every banked opening
  const c = content(norm(p.passage).slice(0, 400))
  let best = { j: 0 }
  for (const l of excl) { const j = jac(c, content(l)); if (j > best.j) best = { j, l } }
  if (best.j >= 0.25) P(`${p.passage_id}: opening overlaps a banked passage (j=${best.j.toFixed(2)}): ${best.l.slice(0, 120)}`)
}
// cross-passage checks inside the run
for (let a = 0; a < sets.length; a++) for (let b = a + 1; b < sets.length; b++) {
  const A = sets[a], B = sets[b]
  if (norm(A.title).toLowerCase() === norm(B.title).toLowerCase()) P(`${A.passage_id} / ${B.passage_id}: same title`)
  const j = jac(content(A.passage), content(B.passage)); if (j >= 0.2) P(`${A.passage_id} / ${B.passage_id}: content words overlap j=${j.toFixed(2)} (same topic?)`)
}
// batch-level option-set reuse across theme / central-idea items (a reused key wording is a tell, AUTHORING-RULES 7)
const keyStems = new Map()
for (const p of sets) for (const it of p.items ?? []) { const k = norm(it.correct_answer).toLowerCase().split(' ').slice(0, 5).join(' '); keyStems.set(k, [...(keyStems.get(k) ?? []), it.qid]) }
for (const [k, q] of keyStems) if (q.length > 1) P(`keys open with the same five words in ${q.join(', ')} ("${k}")`)

console.log(`passage sets read: ${sets.length}; items: ${sets.reduce((n, p) => n + (p.items?.length ?? 0), 0)}`)
console.log(`mechanical problems: ${probs.length}`); probs.forEach(x => console.log('  ' + x))

// deal key slots flat over the run, at most 2 keys in one slot per passage
const all = sets.flatMap(p => (p.items ?? []).map(it => ({ p, it })))
let attempt = 0, slots, s0
const seed = () => { s0 = createHash('sha256').update('map-v2-reading-b1-2026-10-24:' + files.map(f => basename(f)).join(',') + (attempt ? '#' + attempt : '')).digest().readUInt32BE(0) || 1 }
seed()
const rnd = () => { s0 ^= s0 << 13; s0 >>>= 0; s0 ^= s0 >> 17; s0 ^= s0 << 5; s0 >>>= 0; return s0 / 4294967296 }
const sh = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }
for (;;) {
  slots = sh(Array.from({ length: all.length }, (_, i) => i % K))
  let ok = true, k = 0
  for (const p of sets) { const n = p.items?.length ?? 0; const sl = slots.slice(k, k + n); k += n; if ([0, 1, 2, 3].some(L => sl.filter(x => x === L).length > 2)) ok = false }
  if (ok) break
  attempt++; seed(); if (attempt > 200) die('slot rule unsatisfiable')
}
const items = all.map(({ p, it }, i) => {
  const d = sh(it.choices.filter(c => c !== it.correct_answer)), sl = slots[i]
  return { ...it, passage_id: p.passage_id, title: p.title, genre: p.genre, map_area: p.map_area, grade_target: p.grade_target, passage: p.passage, choices: [...d.slice(0, sl), it.correct_answer, ...d.slice(sl)], key_slot: 'ABCD'[sl] }
})
const uniq = (it, f) => { const L = it.choices.map(c => norm(c).length), m = f(...L); return norm(it.correct_answer).length === m && L.filter(x => x === m).length === 1 }
const longest = items.filter(i => uniq(i, Math.max)).length, shortest = items.filter(i => uniq(i, Math.min)).length
const hist = {}; for (const i of items) hist[i.key_slot] = (hist[i.key_slot] || 0) + 1
console.log('key slots', hist, `(re-deals ${attempt})`)
console.log(`key uniquely longest: ${longest}/${items.length}; key uniquely shortest: ${shortest}/${items.length} (aim: about a quarter each, never more than a third)`)
if (items.length >= 9 && (longest > Math.ceil(items.length / 3) || shortest > Math.ceil(items.length / 3))) { console.log('  ^ length tell: lengthen a distractor (never trim the key into vagueness)'); probs.push('length tell') }
const diff = {}; items.forEach(i => diff[i.difficulty] = (diff[i.difficulty] || 0) + 1); console.log('difficulty', diff)
for (const p of sets) console.log(p.passage_id, String(p.genre).padEnd(14), 'g' + p.grade_target, String(words(p.passage)).padStart(3) + 'w', p.title)
const out = process.env.OUT || files[0].replace(/\.json$/, '.merged.json')
writeFileSync(out, JSON.stringify({ sets: sets.map(p => ({ passage_id: p.passage_id, title: p.title, genre: p.genre, map_area: p.map_area, grade_target: p.grade_target, words: words(p.passage) })), items }, null, 1))
if (probs.length) process.exit(1)
