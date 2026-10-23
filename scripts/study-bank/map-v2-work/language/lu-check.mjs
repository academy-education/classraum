#!/usr/bin/env node
/**
 * lu-check.mjs <author-file.json> — per-item mechanical check for map-v2 Language Usage batch 1 (author aid).
 * Run from the repo root:  node scripts/study-bank/map-v2-work/language/lu-check.mjs <file>
 *
 * Checks every item against its seeded slot (slots.json) and the brief's exact rules:
 *   schema and area/strand labels; 4 distinct choices; key in choices; one student_error per wrong option;
 *   explanation names no letter; grade and format match the slot;
 *   writing: assigned key length rank (all four lengths >= 2 chars apart); position-option formats use positions;
 *   grids (grammar, punctuation): one edit region per single-error option, two for the both-errors option,
 *     the both-errors option = the union of the other two, and the seeded site kinds (add / remove / sub);
 *   capitalization: options identical except letter case; seeded case pattern (mixed / both-over / both-under);
 *   key sentence not in EXCLUSIONS-map-language.txt; macOS spellchecker on every word of the KEY (and stimulus).
 * Batch statistics (T2, pooled E3, flat deal) are NOT run here: the coordinator runs them over the whole batch.
 * Exits 2 on input it cannot read, 1 if any item fails, 0 only when every item prints ok.
 */
import { readFileSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '../../../..')
const die = m => { console.error('REFUSING: ' + m); process.exit(2) }
const file = process.argv[2]
if (!file || !existsSync(file)) die(`no such file: ${file}`)
let items; try { items = JSON.parse(readFileSync(file, 'utf8')) } catch (e) { die('unparseable JSON: ' + e.message) }
if (!Array.isArray(items) || !items.length) die('expected a non-empty JSON array')
const SLOTS = JSON.parse(readFileSync(join(HERE, 'slots.json'), 'utf8'))
const slotOf = Object.fromEntries(Object.entries(SLOTS).flatMap(([a, v]) => v.rows.map(r => [r.id, { ...r, author: a, strand: v.strand }])))
const AREA = {
  writing: 'Writing: Write, Revise Texts for Purpose and Audience',
  grammar: 'Language: Understand, Edit for Grammar, Usage',
  punctuation: 'Language: Understand, Edit for Mechanics',
  capitalization: 'Language: Understand, Edit for Mechanics',
}
const STRANDS = {
  writing: ['Plan, Organize; Create Cohesion, Use Transitions', 'Establish and Maintain Style; Use Precise Language'],
  grammar: ['Parts of Speech', 'Phrases, Clauses, Agreement, Sentences'],
  punctuation: ['Punctuation'], capitalization: ['Capitalization'],
}
const norm = s => String(s ?? '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim()
const excl = existsSync(join(HERE, 'EXCLUSIONS-map-language.txt'))
  ? new Set(readFileSync(join(HERE, 'EXCLUSIONS-map-language.txt'), 'utf8').split('\n').filter(l => l.trim().startsWith('KEY:')).map(l => norm(l.replace(/^\s*KEY:/, '')).toLowerCase()))
  : die('EXCLUSIONS-map-language.txt missing')
if (excl.size < 300) die(`exclusion list holds only ${excl.size} keys`)

/* token diff: words and punctuation marks are tokens; returns edit regions [{a:[i,j), b:[k,l)}] */
const tok = s => norm(s).match(/[A-Za-z0-9'’-]+|[^\sA-Za-z0-9]/g) ?? []
function regions(a, b) {
  const n = a.length, m = b.length, L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1))
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1])
  const out = []; let i = 0, j = 0, cur = null
  const open = () => { if (!cur) cur = { a0: i, b0: j } }, close = () => { if (cur) { out.push({ a: [cur.a0, i], b: [cur.b0, j] }); cur = null } }
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) { close(); i++; j++ }
    else if (j < m && (i === n || L[i][j + 1] >= L[i + 1][j])) { open(); j++ }
    else { open(); i++ }
  }
  close(); return out
}
const kindOf = r => { const da = r.a[1] - r.a[0], db = r.b[1] - r.b[0]; return da === 0 ? 'add' : db === 0 ? 'remove' : 'sub' }

const words = new Set()
const results = []
for (const it of items) {
  const bad = [], read = []
  const s = slotOf[it.id]
  if (!s) { results.push({ id: it.id, bad: [`id ${it.id} is not a slot in slots.json`], read }); continue }
  const strand = s.strand
  if (it.family !== 'map' || it.map_subject !== 'language_usage') bad.push('family must be "map" and map_subject "language_usage"')
  if (it.map_area !== AREA[strand]) bad.push(`map_area must be "${AREA[strand]}"`)
  if (!STRANDS[strand].includes(it.map_strand)) bad.push(`map_strand must be one of ${JSON.stringify(STRANDS[strand])}`)
  if (it.grade_target !== s.g) bad.push(`grade_target ${it.grade_target} but the slot is grade ${s.g}`)
  if (it.format !== s.fmt) bad.push(`format "${it.format}" but the slot is "${s.fmt}"`)
  const ccssRe = strand === 'writing' ? new RegExp(`^(W|L)\\.${s.g}\\.`) : new RegExp(`^L\\.${s.g}\\.`)
  if (!ccssRe.test(String(it.ccss ?? ''))) bad.push(`ccss "${it.ccss}" is not a grade-${s.g} ${strand === 'writing' ? 'W or L' : 'L'} code`)
  const ch = it.choices
  if (!Array.isArray(ch) || ch.length !== 4 || new Set(ch.map(norm)).size !== 4) { bad.push('need exactly 4 distinct choices'); results.push({ id: it.id, bad, read }); continue }
  if (!ch.includes(it.correct_answer)) bad.push('correct_answer is not exactly one of the choices')
  const wrong = ch.filter(c => c !== it.correct_answer)
  const se = it.student_error ?? {}
  if (Object.keys(se).length !== 3 || wrong.some(w => !se[w])) bad.push('student_error needs one entry per wrong option, keyed by the exact option text')
  if (!it.explanation || /\b(choice|option|answer) [A-D]\b|\([A-D]\)/.test(it.explanation)) bad.push('explanation missing or names a letter')
  if (!it.prompt) bad.push('prompt missing')
  if (excl.has(norm(it.correct_answer).toLowerCase())) bad.push('the key sentence is already in EXCLUSIONS-map-language.txt')
  const L = ch.map(c => norm(c).length)
  // writing formats
  if (strand === 'writing') {
    const posFmt = ['placement', 'irrelevant'].includes(s.fmt)
    if (['transition', 'placement', 'irrelevant', 'intro-conclusion'].includes(s.fmt) && !it.passage) bad.push(`format ${s.fmt} needs a numbered passage`)
    if (it.passage && posFmt) { const nums = [...String(it.passage).matchAll(/\((\d+)\)/g)].map(m => +m[1]); if (nums.length < 4) bad.push('passage sentences must be numbered (1) (2) ... with at least 4 sentences') }
    if (posFmt) { if (!ch.every(c => /sentence\s+\d+/i.test(c))) bad.push('position formats: every option names a sentence number ("Sentence 3", "after sentence 2")') }
    else {
      const m = s.rule.match(/key length rank (\d)/)
      if (m) {
        const want = +m[1], sorted = [...L].sort((a, b) => b - a), k = norm(it.correct_answer).length
        const gaps = sorted.slice(1).map((x, i) => sorted[i] - x)
        if (gaps.some(g => g < 2)) bad.push(`all four option lengths must differ by >= 2 characters (lengths ${L.join('/')})`)
        else if (sorted.indexOf(k) + 1 !== want) bad.push(`key length rank is ${sorted.indexOf(k) + 1} (1 = longest) but the slot assigns ${want}`)
        if (+it.key_length_rank !== want) bad.push(`copy key_length_rank ${want} from your slot`)
      }
    }
  }
  // grids
  if (s.fmt === 'grid' && strand !== 'capitalization') {
    const kt = tok(it.correct_answer)
    const R = wrong.map(w => ({ w, r: regions(kt, tok(w)) }))
    const singles = R.filter(x => x.r.length === 1), both = R.filter(x => x.r.length === 2)
    if (singles.length !== 2 || both.length !== 1) bad.push(`grid: need two options with ONE difference from the key and one with TWO (got ${R.map(x => x.r.length).join('/')} edit regions)`)
    else {
      const sites = singles.map(x => x.r[0]).sort((p, q) => p.a[0] - q.a[0])
      const br = both[0].r
      const same = (p, q) => p.a[0] === q.a[0] && p.a[1] === q.a[1]
      if (!(same(br[0], sites[0]) && same(br[1], sites[1]))) bad.push('grid: the both-errors option must carry exactly the two single-error changes')
      const kinds = sites.map(kindOf).join(',')
      const want = (s.rule.match(/site kinds (\S+)/) ?? [])[1]
      if (want && kinds !== want) bad.push(`grid: site kinds are ${kinds} (in sentence order) but the slot assigns ${want}`)
      if (Math.abs(sites[1].a[0] - sites[0].a[1]) < 2) read.push('the two sites are adjacent; the brief asks for sites apart')
    }
    if (!Array.isArray(it.error_sites) || it.error_sites.length !== 2) bad.push('error_sites must name the two sites')
  }
  // capitalization
  if (strand === 'capitalization') {
    if (new Set(ch.map(c => norm(c).toLowerCase())).size !== 1) bad.push('capitalization: options must be identical except letter case')
    const caps = c => (norm(c).match(/[A-Z]/g) ?? []).length
    const kc = caps(it.correct_answer)
    const kt = tok(it.correct_answer)
    const R = wrong.map(w => ({ w, r: regions(kt, tok(w)), d: caps(w) - kc })).map(x => ({ ...x, n: x.r.length }))
    const singles = R.filter(x => x.n === 1), twos = R.filter(x => x.n === 2)
    if (singles.length !== 2 || twos.length !== 1) bad.push('capitalization: need two one-site options and one two-site option')
    else {
      const sites = singles.map(x => x.r[0]).sort((p, q) => p.a[0] - q.a[0]), br = twos[0].r
      const same = (p, q) => p.a[0] === q.a[0] && p.a[1] === q.a[1]
      if (!(same(br[0], sites[0]) && same(br[1], sites[1]))) bad.push('capitalization: the both-errors option must carry exactly the two single-error changes')
      const dir = singles.map(x => x.d > 0 ? 'over' : 'under').sort().join(',')
      const pat = dir === 'over,under' ? 'mixed' : dir === 'over,over' ? 'both-over' : 'both-under'
      const want = (s.rule.match(/case pattern (\S+)/) ?? [])[1]
      if (want && pat !== want) bad.push(`capitalization: case pattern is ${pat} but the slot assigns ${want} (over = the error adds a capital, under = drops one)`)
    }
    if (!it.cap_rule) bad.push('cap_rule missing')
  }
  for (const w of (norm(it.correct_answer) + ' ' + norm(it.passage ?? '')).replace(/\(\d+\)/g, ' ').match(/[A-Za-z]+(?:'[a-z]+)?/g) ?? []) words.add(w.replace(/'[a-z]+$/, ''))
  results.push({ id: it.id, bad, read })
}
// spellchecker over the keys and stimuli, in chunks
const rejects = new Set()
const list = [...words]
for (let i = 0; i < list.length; i += 150) {
  const r = spawnSync('node', [join(ROOT, 'scripts/study-bank/map-lu-v6.mjs'), 'spell', ...list.slice(i, i + 150)], { cwd: ROOT, encoding: 'utf8' })
  if (r.status !== 0 && !r.stdout) die('spell oracle failed: ' + (r.stderr || '').slice(0, 300))
  for (const line of r.stdout.split('\n')) { const m = line.match(/^(\S+)\s+NSSpellChecker rejects/); if (m) rejects.add(m[1]) }
}
let failed = 0
for (const x of results) {
  const it = items.find(i => i.id === x.id)
  const hit = [...words].filter(w => rejects.has(w) && (norm(it?.correct_answer) + ' ' + norm(it?.passage ?? '')).includes(w))
  if (hit.length) x.bad.push(`spellchecker rejects in the key or passage: ${hit.join(', ')} (a name is fine if it is a common first name; otherwise fix)`)
  if (x.bad.length) failed++
  console.log(`${x.id}  ${x.bad.length ? 'FAIL' : 'ok'}`)
  for (const b of x.bad) console.log('    - ' + b)
  for (const r of x.read) console.log('    (read) ' + r)
}
const ids = items.map(i => i.id); const dup = ids.filter((v, i) => ids.indexOf(v) !== i)
let batchBad = 0
if (dup.length) { console.log(`duplicate ids: ${dup.join(', ')}`); batchBad++ }
const keys = items.map(i => norm(i.correct_answer).toLowerCase()); if (new Set(keys).size !== keys.length) { console.log('two items share a key sentence'); batchBad++ }
console.log(`\n${items.length} items read, ${items.length - failed} ok, ${failed} failing${batchBad ? `, ${batchBad} file-level problem(s)` : ''}`)
process.exit(failed || batchBad ? 1 : 0)
