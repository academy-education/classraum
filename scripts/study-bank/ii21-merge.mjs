#!/usr/bin/env node
// ii21-merge.mjs [--freeze] — merge sat-ii-v21-work/{A,B,C,D}/items.json, check the PREREG-II21 rules,
// and with --freeze (only at 0 problems) write sat-ii-hard-v21.batch.json with meta stripped and print its sha256.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
const W = 'scripts/study-bank/sat-ii-v21-work', RANGE = { A: 'ABCDEF', B: 'GHIJKL', C: 'MNOPQR', D: 'STUVWXYZ' }
// generic place words (Pond, Chapel ...) are not names; the range applies to the distinctive token
const GENERIC = new Set(['Valley','Lake','Pond','Chapel','County','Mount','Marsh','Basin','Depot','Barn','Annex','Works','Hall','Lane','Hollow','River','Creek','Bay','Island','Street','Mill','Library','School','Station','Ridge','Bridge'])
const probs = [], all = [], nameOwner = {}
for (const L of 'ABCD') {
  const p = `${W}/${L}/items.json`
  if (!existsSync(p)) { probs.push(`${L}: items.json missing`); continue }
  const items = JSON.parse(readFileSync(p, 'utf8'))
  if (!Array.isArray(items) || items.length !== 6) probs.push(`${L}: expected 6 items, got ${items.length}`)
  const letters = new Set(), rank = []
  let longest = 0, shortest = 0
  items.forEach((it, i) => {
    const id = `II21${L}-0${i + 1}`
    if (it.id !== id) probs.push(`${L}: item ${i} id ${it.id} != ${id}`)
    if (it.domain !== 'Information and Ideas') probs.push(`${id}: domain`)
    if ((it.choices || []).length !== 4 || new Set(it.choices).size !== 4) probs.push(`${id}: needs 4 distinct choices`)
    const k = it.choices.indexOf(it.correct_answer); if (k < 0) probs.push(`${id}: key not among choices`)
    letters.add('ABCD'[k])
    const len = it.choices.map(c => c.length), kl = len[k]
    if (len.filter(x => x >= kl).length === 1) longest++
    if (len.filter(x => x <= kl).length === 1) shortest++
    if (Math.max(...len) / Math.min(...len) > 1.4) probs.push(`${id}: length ratio ${(Math.max(...len) / Math.min(...len)).toFixed(2)} > 1.4`)
    const quant = i >= 3
    if (quant && !(it.graphic && it.graphic.type === 'table' && Array.isArray(it.graphic.cells))) probs.push(`${id}: quantitative item needs a table graphic`)
    if (quant && !it.passage.includes('______')) probs.push(`${id}: quantitative passage needs ______`)
    if (!quant && !/finding, if true/i.test(it.prompt)) probs.push(`${id}: textual prompt must be "finding, if true"`)
    if (!quant && !['2x2', 'no-reverse'].includes(it.meta?.design)) probs.push(`${id}: meta.design must be 2x2 or no-reverse`)
    if (quant) rank.push(it.meta?.key_rank)
    if (/\b(choice|option) [A-D]\b/.test(it.explanation)) probs.push(`${id}: explanation names a letter`)
    for (const n of it.meta?.names || []) {
      for (const part of n.split(/\s+/).filter(w => /^[A-Z]/.test(w) && !GENERIC.has(w))) if (!RANGE[L].includes(part[0].toUpperCase())) probs.push(`${id}: name "${n}" outside ${L}'s range`)
      if (nameOwner[n] && nameOwner[n] !== id) probs.push(`${id}: name "${n}" also in ${nameOwner[n]}`)
      nameOwner[n] = id
    }
    all.push(it)
  })
  if (letters.size < 4) probs.push(`${L}: key letters use only ${[...letters].join('')}`)
  if (longest > 2) probs.push(`${L}: key strictly longest ${longest}/6 > 2`)
  if (shortest > 2) probs.push(`${L}: key strictly shortest ${shortest}/6 > 2`)
  if (new Set(rank).size < rank.length) probs.push(`${L}: quantitative key_rank repeats (${rank.join(', ')})`)
}
// surnames repeated across the merged batch, from passage text (capitalised words in 2+ authors' passages)
const capw = it => new Set((it.passage.match(/\b[A-Z][a-z]{2,}\b/g) || []))
const STOP = new Set(['The', 'Which', 'This', 'These', 'That', 'Both', 'However', 'Her', 'His', 'Its', 'Their', 'One', 'Some', 'When', 'While', 'Because', 'Although', 'In', 'On', 'At', 'For', 'But', 'And', 'From', 'After', 'Before', 'During', 'Since', 'If', 'As', 'Researchers', 'Scholars', 'Historians', 'She', 'He', 'They', 'Such', 'Each', 'Over', 'Among', 'Only', 'Most', 'Many'])
const seen = {}
for (const it of all) for (const w of capw(it)) if (!STOP.has(w) && !GENERIC.has(w)) (seen[w] ||= new Set()).add(it.id.slice(4, 5))
for (const [w, s] of Object.entries(seen)) if (s.size > 1) probs.push(`capitalised word "${w}" in passages of authors ${[...s].join('')} (check proper-noun reuse)`)
console.log(`items ${all.length}; problems ${probs.length}`); probs.forEach(p => console.log('  ' + p))
if (process.argv.includes('--freeze')) {
  if (probs.length || all.length !== 24) { console.error('REFUSING to freeze'); process.exit(1) }
  const out = all.map(({ meta, ...it }) => it)
  const txt = JSON.stringify(out, null, 1) + '\n'
  writeFileSync('scripts/study-bank/sat-ii-hard-v21.batch.json', txt)
  console.log('frozen sat-ii-hard-v21.batch.json sha256', createHash('sha256').update(txt).digest('hex'))
}
