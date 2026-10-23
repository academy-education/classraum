#!/usr/bin/env node
/**
 * ii23-merge.mjs [--work <dir>] [--slots <SLOTS.json>] [--out <batch.json>] [--probe-out <prefix>] [--freeze]
 *
 * Merge + rule check + freeze for sat-ii-hard-v23 (PREREG-II23-2026-10-23.md). A copy of ii22-merge.mjs
 * (same name-range rule, GENERIC list, length / letter / table-design rules) scaled to 4 authors x 8 and
 * extended with the v23 checks. Without --freeze it only checks.
 *
 * Checks (each a PROBLEM, exit 1):
 *   ids II23<L>-01..08, 01-05 textual ("finding, if true"), 06-08 quantitative (table + "______");
 *   domain / subskill labels as live (textual "Command of Textual Evidence", quantitative "Command of Evidence");
 *   4 distinct choices, key among them, key LETTER = the slot's letter (SLOTS.json);
 *   meta.roles = the slot's roles (key role on the key, the three distractor roles as a set), meta.design = the
 *   slot's design, meta.stem = the slot's stem and the prompt says it, meta.last / meta.su as the slot,
 *   meta.ranks = the slot's headline-number ranks (quant); meta.profiles (textual): each option's winner and loser
 *   group as [T, R, C] 0/1 flags, which must produce the declared role under ii23-roles.mjs;
 *   no reversed pair: meta.compare lists each option's compared groups/rows (winner first), each must appear in
 *   the option's text, and no two options may be [x, y] and [y, x] (II21: 7 of 7 such items dropped). Options that
 *   merely share every word are a NOTE (a crossed pair is legal);
 *   table_design "exception" (trend-break) banned (II22 result); at most one group-best per author;
 *   quant meta.derived: 4 numbers, no two DISTRACTORS equal to 2 significant figures (II22D-04: three distractors
 *   at 0.70 made the key the odd one out); meta.visible_fail <= 1 (options a student strikes on sight);
 *   per author: key strictly longest <= 2 and strictly shortest <= 2 of 8; longest/shortest option <= 1.4;
 *   proper nouns in the author's initial-letter range, never repeated across items or authors, never a name
 *   used by any II21/II22 candidate (their meta.names); topic_tag distinct and not a v17/v21/v22 tag;
 *   ii23-tellsim.mjs --work passes (the declared roles still meet the cross-item tell bars).
 * --freeze (only with 0 problems and 32 items): ii23-sprobe.mjs verify must exit 0 (the probe's one revision
 *   round is complete), the output must not exist; writes the batch with `meta` stripped and prints its sha256.
 *
 * EXIT 0 clean (and frozen with --freeze); 1 problems (nothing written); 2 refused: no work dir, no author file,
 * an author file that is not a non-empty array, unreadable JSON, SLOTS.json missing or empty, unknown argument,
 * a red verify or an existing output at --freeze.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { T as ROLE_T, profileFeatures } from './ii23-roles.mjs'

const args = process.argv.slice(2)
const die = m => { console.error(`REFUSING: ${m}`); process.exit(2) }
for (let i = 0; i < args.length; i++) {
  if (['--work', '--slots', '--out', '--probe-out'].includes(args[i])) { if (!args[i + 1] || args[i + 1].startsWith('--')) die(`${args[i]} needs a value`); i++ }
  else if (args[i] !== '--freeze') die(`unknown argument ${args[i]}`)
}
const argOf = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null }
const D = 'scripts/study-bank'
const here = dirname(fileURLToPath(import.meta.url))
const W = argOf('--work') ?? `${D}/sat-ii-v23-work`
const SLOTS = argOf('--slots') ?? `${W}/SLOTS.json`
const OUT = argOf('--out') ?? `${D}/sat-ii-hard-v23.batch.json`
const PRE = argOf('--probe-out')
const freeze = args.includes('--freeze')
const rd = p => { if (!existsSync(p)) die(`${p} missing`); try { return JSON.parse(readFileSync(p, 'utf8')) } catch (e) { die(`${p}: ${e.message}`) } }
if (!existsSync(W)) die(`${W} missing`)
const table = rd(SLOTS)
if (!Array.isArray(table?.slots) || !table.slots.length) die(`${SLOTS} has no slots`)
const SL = Object.fromEntries(table.slots.map(s => [s.slot, s]))

const RANGE = { A: 'ABCDEF', B: 'GHIJKL', C: 'MNOPQR', D: 'STUVWXYZ' }
const GENERIC = new Set(['Valley','Lake','Pond','Chapel','County','Mount','Marsh','Basin','Depot','Barn','Annex','Works','Hall','Lane','Hollow','River','Creek','Bay','Island','Street','Mill','Library','School','Station','Ridge','Bridge','Hills','Forest','Reserve','Spit','Point','Sands','Strand','Museum','Delta','Range','Conservator'])
const LET = ['A', 'B', 'C', 'D']

// prior names and topic tags (II21/II22 author files carry meta.names; v17/v21/v22 frozen batches carry topic_tag)
const priorNames = new Map(), priorTags = new Set()
for (const v of ['21', '22']) for (const a of 'ABCD') {
  const f = `${D}/sat-ii-v${v}-work/${a}/items.json`
  if (!existsSync(f)) die(`${f} missing: the prior-name exclusion would be incomplete`)
  for (const it of rd(f)) { for (const n of it.meta?.names ?? []) priorNames.set(n, it.id); if (it.topic_tag) priorTags.add(it.topic_tag) }
}
for (const v of ['17', '21', '22']) { const f = `${D}/sat-ii-hard-v${v}.batch.json`; if (!existsSync(f)) die(`${f} missing`); for (const it of rd(f)) if (it.topic_tag) priorTags.add(it.topic_tag) }

const probs = [], notes = [], all = [], nameOwner = {}, tagOwner = {}
const wordsBag = s => String(s).toLowerCase().match(/[a-z0-9.,%°−-]+/g)?.sort().join(' ') ?? ''
const sig2 = x => Number(Number(x).toPrecision(2))
let authorsSeen = 0
for (const L of 'ABCD') {
  const p = `${W}/${L}/items.json`
  if (!existsSync(p)) { probs.push(`${L}: items.json missing`); continue }
  const items = rd(p)
  if (!Array.isArray(items) || !items.length) die(`${p} is not a non-empty array`)
  authorsSeen++
  if (items.length !== 8) probs.push(`${L}: expected 8 items, got ${items.length}`)
  const tds = []
  let longest = 0, shortest = 0
  items.forEach((it, i) => {
    const id = `II23${L}-0${i + 1}`, slot = SL[`${L}${i + 1}`]
    if (it.id !== id) probs.push(`${L}: item ${i} id ${it.id} != ${id}`)
    if (!slot) { probs.push(`${id}: no slot ${L}${i + 1} in ${SLOTS}`); return }
    const quant = slot.type === 'quant'
    if (it.domain !== 'Information and Ideas') probs.push(`${id}: domain`)
    if (it.subskill !== (quant ? 'Command of Evidence' : 'Command of Textual Evidence')) probs.push(`${id}: subskill "${it.subskill}" (live label is "${quant ? 'Command of Evidence' : 'Command of Textual Evidence'}")`)
    if (it.difficulty !== 'hard') probs.push(`${id}: difficulty must be "hard"`)
    if (!Array.isArray(it.choices) || it.choices.length !== 4 || new Set(it.choices).size !== 4) { probs.push(`${id}: needs 4 distinct choices`); return }
    const k = it.choices.indexOf(it.correct_answer)
    if (k < 0) { probs.push(`${id}: key not among choices`); return }
    if (LET[k] !== slot.letter) probs.push(`${id}: key letter ${LET[k]} != slot ${slot.letter}`)
    for (const f of ['passage', 'prompt', 'explanation', 'topic_tag']) if (typeof it[f] !== 'string' || !it[f].trim()) probs.push(`${id}: ${f} missing`)
    const len = it.choices.map(c => c.length), kl = len[k]
    if (len.filter(x => x >= kl).length === 1) longest++
    if (len.filter(x => x <= kl).length === 1) shortest++
    if (Math.max(...len) / Math.min(...len) > 1.4) probs.push(`${id}: length ratio ${(Math.max(...len) / Math.min(...len)).toFixed(2)} > 1.4`)
    // roles against the slot
    const m = it.meta ?? {}
    if (!Array.isArray(m.roles) || m.roles.length !== 4) probs.push(`${id}: meta.roles must give the role of each choice, in order`)
    else {
      if (m.roles[k] !== slot.key) probs.push(`${id}: key role ${m.roles[k]} != slot ${slot.key}`)
      const dr = m.roles.filter((_, j) => j !== k).sort().join(','), sr = slot.distractors.slice().sort().join(',')
      if (dr !== sr) probs.push(`${id}: distractor roles [${dr}] != slot [${sr}]`)
    }
    if (m.design !== slot.design) probs.push(`${id}: meta.design "${m.design}" != slot "${slot.design}"`)
    // reversed pairs, from meta.compare (each option's compared groups/rows, winner first), checked against the text
    const cmp = m.compare
    if (!Array.isArray(cmp) || cmp.length !== 4 || cmp.some(c => !Array.isArray(c) || c.length < 1 || c.length > 2 || c.some(g => typeof g !== 'string' || !g.trim()))) probs.push(`${id}: meta.compare must give, per choice, the 1-2 groups/rows it compares (winner first)`)
    else {
      cmp.forEach((c, j) => { for (const g of c) if (!it.choices[j].toLowerCase().includes(g.toLowerCase())) probs.push(`${id}: meta.compare "${g}" is not in choice ${LET[j]}`) })
      for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) {
        const x = cmp[a].map(g => g.toLowerCase()), y = cmp[b].map(g => g.toLowerCase())
        if (x.length === 2 && y.length === 2 && x[0] === y[1] && x[1] === y[0]) probs.push(`${id}: options ${LET[a]} and ${LET[b]} are a reversed pair (${cmp[a].join(' > ')} / ${cmp[b].join(' > ')})`)
      }
    }
    for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) if (wordsBag(it.choices[a]) === wordsBag(it.choices[b])) notes.push(`${id}: options ${LET[a]} and ${LET[b]} share every word (a crossed pair is legal; a reversed one is not - meta.compare decides)`)
    if (/\b(choice|option) [A-D]\b/.test(it.explanation ?? '')) probs.push(`${id}: explanation names a letter`)
    if (!quant) {
      if (it.graphic) probs.push(`${id}: textual item has a graphic`)
      if (!/finding, if true/i.test(it.prompt ?? '')) probs.push(`${id}: textual prompt must be "finding, if true"`)
      if (m.stem !== slot.stem) probs.push(`${id}: meta.stem "${m.stem}" != slot "${slot.stem}"`)
      if (!new RegExp(`\\b${slot.stem}\\b`, 'i').test(it.prompt ?? '')) probs.push(`${id}: prompt does not say "${slot.stem}"`)
      if ((m.last ?? null) !== (slot.last ?? null)) probs.push(`${id}: meta.last ${m.last ?? null} != slot ${slot.last ?? null}`)
      if ((m.su ?? []).slice().sort().join() !== (slot.su ?? []).slice().sort().join()) probs.push(`${id}: meta.su [${m.su ?? []}] != slot [${slot.su ?? []}]`)
      if (m.dir !== slot.dir) probs.push(`${id}: meta.dir "${m.dir}" != slot "${slot.dir}"`)
      // each option's declared group profiles must produce its declared role (ii23-roles.mjs)
      const pr = m.profiles, okP = v => Array.isArray(v) && v.length === 3 && v.every(x => x === 0 || x === 1)
      if (!Array.isArray(pr) || pr.length !== 4 || pr.some(x => !x || !okP(x.win) || !okP(x.lose))) probs.push(`${id}: meta.profiles must give, per choice, {win:[T,R,C], lose:[T,R,C]} with 0/1 entries`)
      else if (Array.isArray(m.roles) && m.roles.length === 4) pr.forEach((x, j) => {
        const want = ROLE_T[m.roles[j]]?.f, got = profileFeatures(x.win, x.lose)
        if (!want) probs.push(`${id}: unknown role ${m.roles[j]}`)
        else if (want.join() !== got.join()) probs.push(`${id}: choice ${LET[j]} declared ${m.roles[j]} [${want}] but its profiles give [${got}]`)
        if (slot.design === '4G' && (x.win[2] || x.lose[2])) probs.push(`${id}: a 4G item has no confound C (profiles C must be 0)`)
      })
    } else {
      if (!(it.graphic && it.graphic.type === 'table' && Array.isArray(it.graphic.cells) && it.graphic.cells.length >= 4)) probs.push(`${id}: quantitative item needs a table graphic (4+ rows)`)
      if (!String(it.passage ?? '').includes('______')) probs.push(`${id}: quantitative passage needs ______`)
      tds.push(slot.design)
      if (slot.design === 'exception' || m.table_design === 'exception') probs.push(`${id}: trend-break / exception table design is banned`)
      if (!Array.isArray(m.ranks) || m.ranks.length !== 4) probs.push(`${id}: meta.ranks must give each choice's headline-number rank`)
      else if (Array.isArray(m.roles) && m.roles.length === 4) {
        const want = m.roles.map(r => r === slot.key ? slot.ranks[0] : slot.ranks[1 + slot.distractors.indexOf(r)])
        if (want.some((x, j) => x !== m.ranks[j])) probs.push(`${id}: meta.ranks [${m.ranks}] != the slot's ranks by role [${want}]`)
      }
      if (!Array.isArray(m.derived) || m.derived.length !== 4 || m.derived.some(x => typeof x !== 'number' || !isFinite(x))) probs.push(`${id}: meta.derived must give 4 numbers (each choice's derived value)`)
      else { const dv = m.derived.filter((_, j) => j !== k).map(sig2); if (new Set(dv).size < 3) probs.push(`${id}: two distractors share a derived value (${m.derived.filter((_, j) => j !== k).join(', ')}): the key reads as the odd one out`) }
      if (!Number.isInteger(m.visible_fail) || m.visible_fail > 1 || m.visible_fail < 0) probs.push(`${id}: meta.visible_fail must be 0 or 1`)
    }
    if (it.topic_tag) { if (priorTags.has(it.topic_tag)) probs.push(`${id}: topic_tag "${it.topic_tag}" used by v17/v21/v22`); if (tagOwner[it.topic_tag]) probs.push(`${id}: topic_tag also in ${tagOwner[it.topic_tag]}`); tagOwner[it.topic_tag] = id }
    if (!Array.isArray(m.names) || !m.names.length) probs.push(`${id}: meta.names missing`)
    for (const n of m.names ?? []) {
      for (const part of String(n).split(/\s+/).filter(w => /^[A-Z]/.test(w) && !GENERIC.has(w))) if (!RANGE[L].includes(part[0].toUpperCase())) probs.push(`${id}: name "${n}" outside ${L}'s range`)
      if (nameOwner[n] && nameOwner[n] !== id) probs.push(`${id}: name "${n}" also in ${nameOwner[n]}`)
      if (priorNames.has(n)) probs.push(`${id}: name "${n}" was used by ${priorNames.get(n)}`)
      nameOwner[n] = id
    }
    all.push(it)
  })
  if (longest > 2) probs.push(`${L}: key strictly longest ${longest}/8 > 2`)
  if (shortest > 2) probs.push(`${L}: key strictly shortest ${shortest}/8 > 2`)
  if (new Set(tds).size < tds.length) probs.push(`${L}: table designs repeat (${tds.join(', ')})`)
  if (tds.filter(t => t === 'group-best').length > 1) probs.push(`${L}: more than one group-best table item`)
}
if (!authorsSeen) die(`no author file under ${W}/<A-D>/items.json`)
// capitalised words shared across authors' passages (ii22's proper-noun reuse net)
const STOP = new Set(['The', 'Which', 'This', 'These', 'That', 'Both', 'However', 'Her', 'His', 'Its', 'Their', 'One', 'Some', 'When', 'While', 'Because', 'Although', 'In', 'On', 'At', 'For', 'But', 'And', 'From', 'After', 'Before', 'During', 'Since', 'If', 'As', 'Researchers', 'Scholars', 'Historians', 'She', 'He', 'They', 'Such', 'Each', 'Over', 'Among', 'Only', 'Most', 'Many'])
const seen = {}
for (const it of all) for (const w of new Set(String(it.passage ?? '').match(/\b[A-Z][a-z]{2,}\b/g) || [])) if (!STOP.has(w) && !GENERIC.has(w)) (seen[w] ||= new Set()).add(String(it.id).slice(4, 5))
for (const [w, s] of Object.entries(seen)) if (s.size > 1) probs.push(`capitalised word "${w}" in passages of authors ${[...s].join('')} (check proper-noun reuse)`)

// declared roles still meet the cross-item tell bars
const ts = spawnSync(process.execPath, [join(here, 'ii23-tellsim.mjs'), '--work', W], { encoding: 'utf8' })
if (ts.status === 2) probs.push(`ii23-tellsim refused the declarations: ${(ts.stderr || '').trim()}`)
else if (ts.status !== 0) probs.push(`ii23-tellsim --work: a cross-item tell bar is missed or a declaration is illegal (run it for the table)`)

console.log(`items ${all.length}; problems ${probs.length}`); probs.forEach(p => console.log('  ' + p))
if (notes.length) { console.log(`notes ${notes.length} (not problems)`); notes.forEach(n => console.log('  ' + n)) }
if (!freeze) process.exit(probs.length ? 1 : 0)
if (probs.length || all.length !== 32) { console.error(`REFUSING to freeze: ${probs.length} problem(s), ${all.length} items`); process.exit(1) }
if (existsSync(OUT)) die(`${OUT} exists (a frozen batch is never rewritten)`)
const v = spawnSync(process.execPath, [join(here, 'ii23-sprobe.mjs'), 'verify', '--work', W, ...(PRE ? ['--out', PRE] : [])], { encoding: 'utf8' })
process.stdout.write(v.stdout ?? ''); process.stderr.write(v.stderr ?? '')
if (v.status !== 0) die(`ii23-sprobe.mjs verify exited ${v.status}: the probe's revision round is not complete, so nothing is frozen`)
const out = all.map(({ meta, ...it }) => it)
const txt = JSON.stringify(out, null, 1) + '\n'
writeFileSync(OUT, txt)
console.log(`frozen ${out.length} items -> ${OUT}\nsha256 ${createHash('sha256').update(txt).digest('hex')}`)
