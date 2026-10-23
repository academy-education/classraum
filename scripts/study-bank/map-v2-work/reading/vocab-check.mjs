#!/usr/bin/env node
/**
 * vocab-check.mjs <authored.json> [more.json ...] — mechanical check for map-v2 Reading batch 1 STANDALONE
 * Vocabulary items (author aid and coordinator). Exits 2 on unreadable input, 1 on any problem, 0 when clean.
 *
 * Per item: id in the author's range; grade in the author's grades; target word starts with the author's
 * letters and is not in EXCLUSIONS-vocab-words.txt; the target word (or its inflection) appears in the context
 * for context/multiple-meaning/figurative/connotation items; four distinct choices, key among them;
 * length ratio <= 1.5; one rationale with a named fault per wrong option; explanation quotes the key and names
 * no letter. Per run: no target word twice; subtype mix; key uniquely longest / shortest counts.
 */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const die = m => { console.error('REFUSING: ' + m); process.exit(2) }
const files = process.argv.slice(2)
if (!files.length) die('usage: vocab-check.mjs <authored.json> [...]')
const items = files.flatMap(f => { if (!existsSync(f)) die(`missing ${f}`); try { const a = JSON.parse(readFileSync(f, 'utf8')); if (!Array.isArray(a)) die(`${f}: not an array`); return a } catch (e) { die(`${f}: ${e.message}`) } })
if (!items.length) die('zero items read')
const ASSIGN = JSON.parse(readFileSync(join(HERE, 'assignments.json'), 'utf8')).vocab
const used = new Set(readFileSync(join(HERE, 'EXCLUSIONS-vocab-words.txt'), 'utf8').split('\n').filter(l => l && !l.startsWith('#')).map(l => l.replace(/\s*\(.*\)$/, '').trim().toLowerCase()))
if (used.size < 150) die(`vocab exclusion list holds only ${used.size} words`)
const SUB = ['context-clue', 'multiple-meaning', 'word-parts', 'figurative', 'connotation']
const norm = s => String(s ?? '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim()
const probs = []
const seen = new Map()
for (const it of items) {
  const id = it.id ?? '?', m = String(id).match(/^MRV2-(V[12])-(\d{2})$/)
  if (!m) { probs.push(`${id}: id must be MRV2-V1-NN or MRV2-V2-NN`); continue }
  const a = ASSIGN[m[1]]
  if (+m[2] < 1 || +m[2] > a.n) probs.push(`${id}: number outside 01-${a.n}`)
  if (!a.grades.includes(it.grade_target)) probs.push(`${id}: grade ${it.grade_target}; author ${m[1]} writes grades ${a.grades.join(', ')}`)
  if (it.map_area !== 'Vocabulary' || it.family !== 'map') probs.push(`${id}: family "map", map_area "Vocabulary"`)
  if (!SUB.includes(it.subtype)) probs.push(`${id}: subtype must be one of ${SUB.join('/')}`)
  const w = String(it.target_word ?? '').toLowerCase().trim()
  if (!w) probs.push(`${id}: target_word missing`)
  else {
    const [lo, hi] = a.letters.split('-')
    if (w[0] < lo || w[0] > hi) probs.push(`${id}: target word "${w}" must start with ${a.letters}`)
    if (used.has(w)) probs.push(`${id}: "${w}" is already tested in the bank (EXCLUSIONS-vocab-words.txt)`)
    seen.set(w, [...(seen.get(w) ?? []), id])
    if (it.subtype !== 'word-parts') {
      const stem = w.replace(/(ing|ed|es|s|ly)$/, '').slice(0, Math.max(4, w.length - 3))
      if (!norm(it.context).toLowerCase().includes(stem)) probs.push(`${id}: the target word does not appear in its context`)
    }
  }
  if (!it.context && it.subtype !== 'word-parts') probs.push(`${id}: context (1-4 sentences) missing`)
  if (it.context && norm(it.context).split(' ').length > 80) probs.push(`${id}: context over 80 words; keep it 1-4 sentences`)
  const ch = it.choices
  if (!Array.isArray(ch) || ch.length !== 4 || new Set(ch.map(norm)).size !== 4) { probs.push(`${id}: 4 distinct choices`); continue }
  if (!ch.includes(it.correct_answer)) probs.push(`${id}: key not in choices`)
  const L = ch.map(c => norm(c).length)
  if (Math.max(...L) / Math.min(...L) > 1.5 + 1e-9 && Math.max(...L) > 12) probs.push(`${id}: option length ratio ${(Math.max(...L) / Math.min(...L)).toFixed(2)} > 1.5`)
  if (!it.explanation || /\b(choice|option|answer) [A-D]\b|\([A-D]\)/.test(it.explanation)) probs.push(`${id}: explanation missing or names a letter`)
  else if (!it.explanation.includes(`"${it.correct_answer}"`)) probs.push(`${id}: explanation must quote the key in double quotes`)
  const dr = it.distractor_rationales ?? []
  if (dr.length !== 3 || dr.some(d => !ch.includes(d.choice) || d.choice === it.correct_answer || !d.fault)) probs.push(`${id}: one rationale with a "fault" per wrong option`)
  if (!['easy', 'medium', 'hard'].includes(it.difficulty)) probs.push(`${id}: difficulty easy|medium|hard`)
}
for (const [w, ids] of seen) if (ids.length > 1) probs.push(`"${w}" tested twice: ${ids.join(', ')}`)
const uniq = (it, f) => { const L = it.choices.map(c => norm(c).length), m = f(...L); return norm(it.correct_answer).length === m && L.filter(x => x === m).length === 1 }
const ok = items.filter(i => Array.isArray(i.choices) && i.choices.length === 4)
const longest = ok.filter(i => uniq(i, Math.max)).length, shortest = ok.filter(i => uniq(i, Math.min)).length
const mix = {}; for (const i of items) mix[i.subtype] = (mix[i.subtype] || 0) + 1
console.log(`items read: ${items.length} from ${files.map(f => basename(f)).join(', ')}; subtypes ${JSON.stringify(mix)}`)
console.log(`key uniquely longest ${longest}/${ok.length}, uniquely shortest ${shortest}/${ok.length} (aim about a quarter each, never more than a third)`)
if (ok.length >= 9 && (longest > Math.ceil(ok.length / 3) || shortest > Math.ceil(ok.length / 3))) probs.push('length tell across the file')
console.log(`problems: ${probs.length}`); probs.forEach(p => console.log('  ' + p))
process.exit(probs.length ? 1 : 0)
