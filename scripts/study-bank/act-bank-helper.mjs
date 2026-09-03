#!/usr/bin/env node
/**
 * act-bank-helper.mjs — validate and insert ACT English and Reading
 * batches. (Math goes through math-bank-helper.mjs with BANK_FAMILY=act,
 * because its sandbox recompute is the stronger gate.)
 *
 *   node act-bank-helper.mjs check  english|reading <batch.json>
 *   node act-bank-helper.mjs insert english|reading <batch.json> <cohort> [--apply]
 *   node act-bank-helper.mjs update english|reading <batch.json> <cohort> [--apply]
 *       - after a repair: rewrites prompt/choices/key/explanation of rows already
 *         in the bank, matched by verify_meta.localId within the cohort. The
 *         batch file stays the source of truth; passages are never changed here.
 *
 * REFUSES THE BATCH, NOT THE ITEM. An ACT section is a fixed structure —
 * English is five passages of exactly ten, Reading is four passages of
 * exactly nine, one per genre — and a passage with nine English items is
 * not "90% usable", it is a passage the assembler will never draw. So a
 * structural failure anywhere stops the whole insert, and nothing is
 * written until every check passes. This is the same rule the verbal
 * bijective-set inserter follows, for the same reason.
 *
 * What is checked, all decidable:
 *   - exactly 4 options, key present verbatim, no duplicate options
 *   - every item in a passage group carries the IDENTICAL passage text
 *     (the client groups a passage run by identical text, and a group
 *     whose items differ in passage text renders as ten separate
 *     passages)
 *   - English: 10 items per group; "No Change" is choices[0] wherever it
 *     appears; the stem quotes the target span (Andy's decision of
 *     2026-09-02: SAT convention, no underline renderer)
 *   - Reading: 9 items per group; `genre` in the published four; no stem
 *     cites a LINE NUMBER (text reflows on a phone, so "line 26" is a
 *     lie — items cite paragraphs and quoted phrases instead)
 *   - `domain` is one of the section's published reporting categories,
 *     spelled exactly as ACT_QUOTAS spells it, so the quota checker can
 *     count it
 *   - explanations name no option letter or position
 *
 * Batch shape (both sections):
 *   [{ id, passage_id, passage_title?, passage, prompt, choices[4],
 *      correct_answer, explanation, domain, subskill, difficulty,
 *      genre? (reading), paired? (reading) }]
 */
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const [cmd, section, file, cohort] = process.argv.slice(2)
const APPLY = process.argv.includes('--apply')
if (!cmd || !section || !file || (cmd === 'insert' && !cohort)) {
  console.error('usage: act-bank-helper.mjs check|insert english|reading <batch.json> [cohort] [--apply]')
  process.exit(1)
}
if (!['english', 'reading', 'science'].includes(section)) { console.error(`section must be english, reading or science (math uses math-bank-helper.mjs)`); process.exit(1) }

/* Mirrors src/lib/study/act-test.ts. Kept literal here so this script
   has no TS import path to break; act-blueprint.test.ts pins the source. */
const PER_PASSAGE = { english: 10, reading: 9 }
const GENRES = ['literary_narrative', 'social_science', 'humanities', 'natural_science']
/* Science: seven passages per form in three formats, sized as ACT ships
   them on form 25MC5 (DR 5, RS 6, CV 6 -> 10 + 18 + 12 = 40). A passage's
   `format` drives the draw (assembleActSection takes 2 DR, 3 RS, 2 CV) and
   is stored in the row's `task`, the way reading stores its genre. Every
   item of a Data Representation or Research Summaries passage must carry
   the same `graphic` (a table, bar, line or svg figure) - a science item
   with no data to read is a reading item. Conflicting Viewpoints is prose
   and may omit it. */
const SCIENCE_FORMATS = { data_representation: 5, research_summaries: 6, conflicting_viewpoints: 6 }
const DOMAINS = {
  english: ['Production of Writing', 'Knowledge of Language', 'Conventions of Standard English'],
  reading: ['Key Ideas and Details', 'Craft and Structure', 'Integration of Knowledge and Ideas'],
  science: ['Interpretation of Data', 'Scientific Investigation', 'Evaluation of Models, Inferences, and Experimental Results'],
}

const batch = JSON.parse(readFileSync(file, 'utf8'))
const problems = []
const flat = s => String(s ?? '').replace(/\s+/g, ' ').trim()

/* ---- per-item checks ---- */
for (const it of batch) {
  const tag = it.id ?? '(no id)'
  if (!it.passage_id) problems.push(`${tag}: no passage_id`)
  if (!flat(it.passage)) problems.push(`${tag}: empty passage`)
  if (!flat(it.prompt)) problems.push(`${tag}: empty prompt`)
  if (!Array.isArray(it.choices) || it.choices.length !== 4) problems.push(`${tag}: needs exactly 4 choices`)
  else {
    if (!it.choices.includes(it.correct_answer)) problems.push(`${tag}: key is not among the choices verbatim`)
    if (new Set(it.choices.map(flat)).size !== 4) problems.push(`${tag}: duplicate options`)
    if (section === 'english') {
      const nc = it.choices.findIndex(c => /^no change$/i.test(flat(c)))
      if (nc > 0) problems.push(`${tag}: "No Change" must be choices[0], found at ${nc}`)
    }
  }
  if (!DOMAINS[section].includes(it.domain)) problems.push(`${tag}: domain "${it.domain}" is not one of ${DOMAINS[section].join(' | ')}`)
  if (!['easy', 'medium', 'hard'].includes(it.difficulty)) problems.push(`${tag}: difficulty "${it.difficulty}"`)
  if (/\b(option|choice|answer)\s*\(?[A-J]\)?(?![a-z])|\b(first|second|third|fourth|last) (option|choice|answer)\b/i.test(it.explanation ?? '')) problems.push(`${tag}: explanation names an option position`)
  if (section === 'reading') {
    if (!GENRES.includes(it.genre)) problems.push(`${tag}: genre "${it.genre}" is not one of ${GENRES.join(' | ')}`)
    if (/\blines?\s+\d+/i.test(it.prompt)) problems.push(`${tag}: stem cites a line number — cite the paragraph or quote the phrase`)
  }
  if (section === 'english') {
    /* The SAT convention: nothing is underlined on screen, so the stem
       itself must LOCATE what is being asked about — a quoted span, a
       paragraph number, a placement point, or the essay as a whole. The
       first draft exempted any stem containing "transition" or "writer",
       which let 'Which transition is most logical in context?' through
       with no way for the student to know which transition. */
    const located = /["“][^"”]{2,}["”]/.test(it.prompt)
      || /\bparagraph\s*\d|\bPoint\s*\[?[A-D]\]?|\bessay as a whole|\bpreceding passage|\bsequence of sentences/i.test(it.prompt)
    if (!located) problems.push(`${tag}: stem neither quotes a span nor names a paragraph/point/whole essay — the student cannot locate what is being revised`)
  }
  if (section === 'science') {
    if (!(it.format in SCIENCE_FORMATS)) problems.push(`${tag}: format "${it.format}" is not one of ${Object.keys(SCIENCE_FORMATS).join(' | ')}`)
    if (/\b(figure|table)\s+\d/i.test(it.prompt) && !it.graphic) problems.push(`${tag}: stem cites a figure or table but the item carries no graphic`)
    if (it.format !== 'conflicting_viewpoints' && !it.graphic) problems.push(`${tag}: ${it.format} item has no graphic - nothing for the student to read data from`)
    if (it.graphic && !['table', 'twowaytable', 'bar', 'histogram', 'line', 'scatter', 'svg'].includes(String(it.graphic.type ?? '').toLowerCase())) problems.push(`${tag}: graphic.type "${it.graphic.type}" is not one the runner renders`)
    if (it.graphic?.type === 'svg' && !/^<svg[\s>]/.test(String(it.graphic.svg ?? '').trim())) problems.push(`${tag}: graphic.type svg but graphic.svg is not an <svg> element`)
    if (/\blines?\s+\d+/i.test(it.prompt)) problems.push(`${tag}: stem cites a line number`)
  }
  if (section === 'reading' && /most nearly means/i.test(it.prompt)) {
    /* The B5 finding, made decidable: a vocab stem whose target word
       occurs more than once in the passage must quote a longer phrase
       that pins ONE occurrence. Nine repaired items and thirteen found. */
    // Strip trailing punctuation that American quoting puts INSIDE the
    // quote: "the ledger was patient work," must match the passage's
    // "the ledger was patient work." The self-test caught this too.
    const quoted = [...it.prompt.matchAll(/["“]([^"”]{1,})["”]/g)].map(m => flat(m[1]).replace(/[,.;:!?]+$/, ''))
    if (!quoted.length) problems.push(`${tag}: vocab stem quotes no target word`)
    else {
      const target = quoted.slice().sort((a, b) => a.length - b.length)[0]
      const passage = flat(it.passage).toLowerCase()
      const esc = target.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const hits = (passage.match(new RegExp(`\\b${esc}\\b`, 'g')) ?? []).length
      if (hits === 0) problems.push(`${tag}: vocab target "${target}" does not occur in the passage`)
      else if (hits > 1) {
        const pin = quoted.find(q => q !== target && q.split(' ').length >= 4 && q.toLowerCase().includes(target.toLowerCase())
          && passage.split(q.toLowerCase()).length - 1 === 1)
        if (!pin) problems.push(`${tag}: vocab target "${target}" occurs ${hits}x in the passage and the stem quotes no unique 4+-word phrase containing it`)
      }
    }
  }
}

/* ---- per-passage checks ---- */
const groups = {}
for (const it of batch) (groups[it.passage_id] = groups[it.passage_id] ?? []).push(it)
for (const [pid, g] of Object.entries(groups)) {
  const want = section === 'science' ? SCIENCE_FORMATS[g[0].format] : PER_PASSAGE[section]
  if (g.length !== want) problems.push(`passage ${pid}: ${g.length} items, ${section === 'science' ? `a ${g[0].format} passage` : 'section'} needs exactly ${want}`)
  if (section === 'science') {
    if (new Set(g.map(i => i.format)).size !== 1) problems.push(`passage ${pid}: mixed formats within one passage`)
    if (g[0].format !== 'conflicting_viewpoints' && new Set(g.map(i => JSON.stringify(i.graphic ?? null))).size !== 1) problems.push(`passage ${pid}: items do not share an IDENTICAL graphic - the runner shows the figure under every question of the passage`)
    if (g[0].format === 'conflicting_viewpoints' && !/(Scientist|Student|Hypothesis|Theory)\s+[12AB]/.test(g[0].passage)) problems.push(`passage ${pid}: conflicting_viewpoints passage has no labelled viewpoints (Scientist 1 / Scientist 2 ...)`)
  }
  // RAW comparison. The client's passageKey() canonicalises whitespace
  // before grouping, so it would survive a stray space - but byte identity
  // is what the authoring brief promised, it is free to demand, and a
  // batch whose ten copies differ at all has been edited by hand somewhere.
  // The first draft compared normalized text and the self-test caught it.
  if (new Set(g.map(i => String(i.passage))).size !== 1) problems.push(`passage ${pid}: items do not share IDENTICAL passage text — the client would render them as separate passages`)
  if (section === 'reading' && new Set(g.map(i => i.genre)).size !== 1) problems.push(`passage ${pid}: mixed genres within one passage`)
  if (section === 'reading') {
    const paired = !!g[0].paired
    const hasAB = /Passage A/.test(g[0].passage) && /Passage B/.test(g[0].passage)
    if (paired !== hasAB) problems.push(`passage ${pid}: paired=${paired} but passage ${hasAB ? 'has' : 'lacks'} "Passage A"/"Passage B" headers`)
  }
  const ids = g.map(i => i.id)
  if (new Set(ids).size !== ids.length) problems.push(`passage ${pid}: duplicate item ids`)
}

const total = batch.length
const dom = {}
for (const it of batch) dom[it.domain] = (dom[it.domain] ?? 0) + 1
console.log(`${total} items in ${Object.keys(groups).length} passage(s)`)
console.log('domain mix:', Object.entries(dom).map(([k, v]) => `${k} ${v} (${(100 * v / total).toFixed(0)}%)`).join(' | '))
if (section === 'reading') {
  const gen = {}; for (const g of Object.values(groups)) gen[g[0].genre] = (gen[g[0].genre] ?? 0) + 1
  console.log('genres:', JSON.stringify(gen), ' paired passages:', Object.values(groups).filter(g => g[0].paired).length)
}
if (section === 'science') {
  const fm = {}; for (const g of Object.values(groups)) fm[g[0].format] = (fm[g[0].format] ?? 0) + 1
  console.log('formats (passages):', JSON.stringify(fm), ' - a form needs DR 2, RS 3, CV 2')
}

if (problems.length) {
  console.error(`\nREFUSED — ${problems.length} problem(s):\n  ` + problems.slice(0, 40).join('\n  ') + (problems.length > 40 ? `\n  ...and ${problems.length - 40} more` : ''))
  process.exit(1)
}
console.log('\nstructure OK')
if (cmd === 'check') process.exit(0)
if (!APPLY && cmd !== 'update') { console.log('DRY RUN — pass --apply to write'); process.exit(0) }

/* ---- insert ---- */
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const norm = s => String(s).trim().replace(/\s+/g, ' ').toLowerCase()
const hashOf = it => createHash('md5').update([norm(it.prompt), (it.choices || []).map(norm).join('|')].join('~~')).digest('hex')

if (cmd === 'update') { await updateExisting(); process.exit(0) }

const { data: existing } = await db.from('study_item_bank').select('content_hash').eq('family', 'act').eq('section', section)
const seen = new Set((existing ?? []).map(r => r.content_hash))

let inserted = 0, dup = 0
for (const it of batch) {
  const item = {
    type: 'multiple_choice', passage: it.passage, prompt: it.prompt, choices: it.choices,
    correct_answer: it.correct_answer, explanation: it.explanation, difficulty: it.difficulty,
    passageGroupId: `${cohort}:${it.passage_id}`,
    ...(it.passage_title ? { passage_title: it.passage_title } : {}),
    // Science figures/tables ride on the item (QuestionGraphicView renders
    // item.graphic under the stem); the helper refuses DR/RS items without one.
    ...(it.graphic ? { graphic: it.graphic } : {}),
  }
  const content_hash = hashOf(item)
  if (seen.has(content_hash)) { console.log(`DUP ${it.id}`); dup++; continue }
  const { error } = await db.from('study_item_bank').insert({
    family: 'act', section, domain: it.domain, subskill: it.subskill ?? null,
    // `task` carries the GENRE for reading (the assembler draws one passage
    // per genre off it) and the item type for english. NOT NULL since 068.
    task: section === 'reading' ? it.genre : section === 'science' ? it.format : 'multiple_choice',
    item_type: 'multiple_choice', difficulty: it.difficulty, topic_tag: it.subskill ?? null,
    item, content_hash, passage_group_id: `${cohort}:${it.passage_id}`,
    // BANK_VERIFIED=false stages a cohort: rows exist, the assembler ignores
    // them (it filters verified=true), and a later human sitting flips the
    // flag. Used for ACT English/Reading forms whose model attack reads as a
    // louder tell than the shipped forms had (B7 says the model number is a
    // screen, not a verdict - but a screen still screens).
    word_count: null, verified: process.env.BANK_VERIFIED !== 'false', archived: false, source: 'hand', cohort,
    verify_meta: {
      method: 'claude-authored; structure-checked by act-bank-helper before insert',
      localId: it.id, passage_id: it.passage_id, ...(section === 'reading' ? { genre: it.genre, paired: !!it.paired } : {}), ...(section === 'science' ? { format: it.format } : {}),
      difficulty_ungraded: true,
      author_reported_difficulty: it.difficulty,
      note: 'Difficulty is the author\'s own label, not an independent grade. Not yet blind-attacked, not yet read by a human.',
    },
  })
  if (error) { console.error(`ERR ${it.id}: ${error.message}`); process.exit(1) }
  seen.add(content_hash); inserted++
}
console.log(`inserted ${inserted}, dup-skipped ${dup}`)

/* CHECK the write, do not trust it. */
const { data: after } = await db.from('study_item_bank').select('passage_group_id,task').eq('cohort', cohort)
const g2 = {}; for (const r of after ?? []) g2[r.passage_group_id] = (g2[r.passage_group_id] ?? 0) + 1
// DB passage_group_id is "<cohort>:<passage_id>"; strip the cohort to find the
// authored group (the first science insert wrote all 80 rows and then crashed
// HERE on groups[undefined] - the data was right, the check was not).
const authored = pid => groups[String(pid).replace(`${cohort}:`, '')] ?? []
const short = Object.entries(g2).filter(([pid, n]) => n !== (section === 'science' ? SCIENCE_FORMATS[authored(pid)[0]?.format] : PER_PASSAGE[section]))
console.log(`verified in DB: ${after?.length ?? 0} rows in ${Object.keys(g2).length} passage groups`)
if (short.length) { console.error(`FAIL: ${short.length} group(s) not at ${PER_PASSAGE[section]}: ${short.map(([k, n]) => `${k}=${n}`).join(', ')}`); process.exit(1) }
if (section === 'reading') {
  const tg = {}; for (const r of after ?? []) tg[r.task] = (tg[r.task] ?? 0) + 1
  console.log('task (genre) in DB:', JSON.stringify(tg))
}

/* ---- update (post-repair) ---- */
async function updateExisting() {
  const { data: rows, error } = await db.from('study_item_bank').select('id, item, verify_meta, content_hash').eq('cohort', cohort)
  if (error) { console.error(error.message); process.exit(1) }
  const byLocal = Object.fromEntries((rows ?? []).map(r => [r.verify_meta?.localId, r]))
  let changed = 0, same = 0, missing = 0, passageDrift = 0
  const drifted = []
  for (const it of batch) {
    const row = byLocal[it.id]
    if (!row) { missing++; continue }
    if (String(row.item.passage) !== String(it.passage)) { passageDrift++; drifted.push(it.id); continue }
    const next = { ...row.item, prompt: it.prompt, choices: it.choices, correct_answer: it.correct_answer, explanation: it.explanation, difficulty: it.difficulty }
    const hash = hashOf(next)
    if (hash === row.content_hash) { same++; continue }
    const before = { prompt: row.item.prompt, choices: row.item.choices, correct_answer: row.item.correct_answer }
    if (!APPLY) { changed++; continue }
    const { error: e } = await db.from('study_item_bank').update({
      item: next, content_hash: hash, domain: it.domain, subskill: it.subskill ?? null, topic_tag: it.subskill ?? null, difficulty: it.difficulty,
      verify_meta: { ...row.verify_meta, repaired_at: new Date().toISOString(), repaired_from: before,
        repair_why: process.env.REPAIR_WHY ?? 'distractor rewrite after blind attack' },
    }).eq('id', row.id)
    if (e) { console.error(`ERR ${it.id}: ${e.message}`); process.exit(1) }
    changed++
  }
  console.log(`${APPLY ? 'updated' : 'WOULD update (dry run)'} ${changed}, unchanged ${same}, not in bank ${missing}`)
  if (passageDrift) { console.error(`REFUSED ${passageDrift} item(s) whose PASSAGE differs from the bank row - passages are not repaired here: ${drifted.join(', ')}`); process.exit(1) }
}
