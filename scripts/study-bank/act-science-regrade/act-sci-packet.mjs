#!/usr/bin/env node
/**
 * act-sci-packet.mjs: per-item with-source re-grade of the staged ACT Science cohorts, under
 * scripts/study-bank/ACT-SCIENCE-AGENT-RELEASE.prereg.md. Run from the repo root. Reads the bank READ-ONLY; never writes it.
 *
 *   node scripts/study-bank/act-science-regrade/act-sci-packet.mjs build <batch> [--root DIR] [--from rows.json]
 *   node .../act-sci-packet.mjs release-keyed <batch> <g1|g2|r1> [--root DIR]
 *   node .../act-sci-packet.mjs check <batch> <g1|g2|r1> [--root DIR]
 *   node .../act-sci-packet.mjs recheck <batch> [--root DIR]
 *   node .../act-sci-packet.mjs decide <batch> [--root DIR] [--write]
 *   node .../act-sci-packet.mjs --selftest                                   # no DB
 *   default DIR: scratchpad/act-science-regrade (repo-root scratchpad, git-excluded)
 *
 * LAYOUT under DIR (one folder per grader: two MAP graders once overwrote each other's output):
 *   _coordinator/<batch>/  grader-keyed.md, packet.key.json, build.json, confirm.json, decision.json  GRADERS NEVER OPEN THIS
 *   <batch>-g1/  <batch>-g2/  grader-cold.md, then cold.json (grader), then grader-keyed.md (released), keyed.json (grader)
 *   <batch>-r1/  recheck-cold.md, cold.json, recheck-keyed.md, keyed.json   (built by `recheck` from the single-grader flags)
 *
 * WHAT IT GUARANTEES
 *   - The cold packet carries no key, no explanation, no difficulty, no passage_title (the runner never draws it) and no
 *     option order that maps back to the stored one: options are dealt with the keys FLAT across the batch (seed fixed in
 *     batches.json), because a stored order can carry a positional tell (act-science-v5b stores the key in D on 3 of 40).
 *     Students see a per-form shuffle (assemble.ts shuffleDrawnChoices), so the stored order is not what they see either.
 *   - The keyed packet reaches a grader's folder only through `release-keyed`, which first freezes that grader's cold.json
 *     (sha256 in cold.lock.json). `check` refuses a keyed.json whose cold picks differ from the frozen ones.
 *   - Every figure is decoded the way QuestionGraphicView draws it: tables keep only truthy row/column labels and index
 *     cells by the FILTERED row (so a blank label shifts rows, as on screen); bars show the 5 y tick labels and no values;
 *     line/scatter show the 5 ticks per axis and all series in black with NO legend. An svg figure, or any type the
 *     decoder cannot render as text, REFUSES (exit 2): a grader who cannot see the figure must not return a grade.
 *   - `decide` applies the pre-registered drop rules mechanically and refuses while anything is pending (a coordinator
 *     confirmation, a re-check). Any drop takes its whole passage with it: assembleActSection only draws a passage with
 *     its full count (DR 5, RS 6, CV 6), so a short passage is never served.
 * Exit 2 on unreadable input, an empty population, or any refusal.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { rng, shuffleWith } from '../seeded-shuffle.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const BANK = join(HERE, '..')
const SLOTS = ['A', 'B', 'C', 'D']
export const SIZE = { data_representation: 5, research_summaries: 6, conflicting_viewpoints: 6 }
const FORM = { data_representation: 2, research_summaries: 3, conflicting_viewpoints: 2 }
const SHORT = { data_representation: 'DR', research_summaries: 'RS', conflicting_viewpoints: 'CV' }
const GRADERS = ['g1', 'g2', 'r1']
export class Refusal extends Error {}
const sha = s => createHash('sha256').update(s).digest('hex')

/* ------------------------------------------------------------------ *
 * Rendering, mirrored from the student runner
 * ------------------------------------------------------------------ */

/** = helpers.tsx normalizeDisplayText (passage and prompt go through it on screen). */
export function normalizeDisplayText(text) {
  if (!text) return ''
  let s = String(text)
  s = s.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\'/g, "'")
  s = s.replace(/\*\*([^*\n]+?)\*\*/g, '$1').replace(/(?<![*\w])\*([^*\n]+?)\*(?![*\w])/g, '$1')
  s = s.replace(/^#{1,4}\s+/gm, '')
  return s
}
/** = helpers.tsx fmtTick */
const fmtTick = v => (Number.isInteger(v) ? String(v) : v.toFixed(Math.abs(v) < 1 ? 2 : 1))

/** The figure as the student sees it, in text, plus render warnings. Throws Refusal on anything it cannot render. */
export function decodeGraphic(g) {
  if (!g) return { text: '(no figure)', warnings: [] }
  if (!g.type) throw new Refusal(`figure with no type${g.svg ? ' (raw svg)' : ''}: the decoder cannot show it to a grader`)
  const t = String(g.type).toLowerCase(), out = [], warnings = []
  if (t === 'table' || t === 'twowaytable') {
    const rowsRaw = g.rowLabels ?? [], colsRaw = g.colLabels ?? [], cells = g.cells ?? []
    const rows = rowsRaw.filter(Boolean), cols = colsRaw.filter(Boolean)
    if (rows.length !== rowsRaw.length) warnings.push(`${rowsRaw.length - rows.length} blank row label(s) dropped by the renderer; cells are indexed by the remaining labels, so rows below a blank label show the WRONG cells`)
    if (cols.length !== colsRaw.length) warnings.push(`${colsRaw.length - cols.length} blank column label(s) dropped by the renderer; cells are not, so columns misalign`)
    if (cells.length > rows.length) warnings.push(`${cells.length - rows.length} cell row(s) beyond the row labels are NOT drawn`)
    cells.forEach((r, i) => { if ((r ?? []).length !== cols.length) warnings.push(`row ${i + 1} has ${(r ?? []).length} cells for ${cols.length} column labels`) })
    out.push(`TABLE${g.caption ? ` (caption under the table: "${g.caption}")` : ''}`, `| | ${cols.join(' | ')} |`, `|---|${cols.map(() => '---').join('|')}|`)
    rows.forEach((r, i) => out.push(`| ${r} | ${(cells[i] ?? []).map(v => String(v ?? '')).join(' | ')} |`))
  } else if (t === 'bar' || t === 'histogram') {
    const bars = (g.bars ?? []).filter(b => b && typeof b.value === 'number')
    if (!bars.length) throw new Refusal('bar figure with no numeric bars: the renderer draws nothing')
    const max = Math.max(...bars.map(b => b.value), 1)
    out.push(`BAR CHART${g.caption ? ` (caption: "${g.caption}")` : ''}`, `x-axis label: ${g.xLabel ?? '(none)'}   y-axis label: ${g.yLabel ?? '(none)'}`,
      `y-axis tick labels the student sees: ${[0, max * 0.25, max * 0.5, max * 0.75, max].map(v => (Number.isInteger(v) ? v : v.toFixed(1))).join(', ')}`,
      'bars (solid black, NO value labels; the heights below are the data, which the student can only ESTIMATE against the ticks):',
      ...bars.map(b => `  ${b.label ?? ''}: ${b.value}`))
  } else if (t === 'line' || t === 'linegraph' || t === 'scatter') {
    const series = t === 'scatter'
      ? [{ points: (g.points ?? []).map(p => (Array.isArray(p) ? [Number(p[0]), Number(p[1])] : [Number(p?.x), Number(p?.y)])) }]
      : (g.series ?? []).map(s => ({ label: s.label, points: (s.points ?? []).filter(p => Array.isArray(p) && p.length >= 2).map(p => [Number(p[0]), Number(p[1])]) }))
    const pts = series.flatMap(s => s.points)
    if (!pts.length) throw new Refusal(`${t} figure with no points: the renderer draws nothing`)
    if (series.length > 1) warnings.push(`${series.length} series drawn identically in black with NO legend or series labels: the student cannot tell which line is which`)
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1])
    const ticks = (lo, hi) => Array.from({ length: 5 }, (_, i) => lo + ((hi - lo || 1) * i) / 4).map(fmtTick).join(', ')
    out.push(`${t === 'scatter' ? 'SCATTER PLOT' : 'LINE GRAPH'}${g.caption ? ` (caption: "${g.caption}")` : ''}`, `x-axis label: ${g.xLabel ?? '(none)'}   y-axis label: ${g.yLabel ?? '(none)'}`,
      `x tick labels: ${ticks(Math.min(...xs, 0), Math.max(...xs))}`, `y tick labels: ${ticks(Math.min(...ys, 0), Math.max(...ys))}`,
      ...series.map((s, i) => `points${series.length > 1 ? ` (series ${i + 1}, unlabeled on screen)` : ''} (data; the student reads them against the ticks): ${s.points.map(p => `(${p[0]}, ${p[1]})`).join(' ')}`))
  } else {
    throw new Refusal(`figure type "${g.type}" is not decoded to text by this packet builder; a grader would grade a figure nobody showed them`)
  }
  return { text: out.join('\n'), warnings }
}

/* ------------------------------------------------------------------ *
 * Structure and the deal
 * ------------------------------------------------------------------ */

/**
 * rows: bank rows { id, cohort, verified, archived, passage_group_id, task, domain, item, verify_meta, content_sha, created_at }.
 * Returns passages [{ cohort, gid, format, figure, items: [row...] }] in cohort order then authored order (created_at, id),
 * the order the assembler restores inside a passage. strictForm checks the 7-passage / 40-item form shape per cohort.
 */
export function structure(rows, cohorts, { strictForm = true } = {}) {
  if (!rows.length) throw new Refusal('zero rows: nothing to grade')
  const problems = []
  for (const r of rows) {
    if (!cohorts.includes(r.cohort)) problems.push(`row ${r.id} is in cohort ${r.cohort}, not in this batch`)
    if (r.verified || r.archived) problems.push(`row ${r.id} (${r.verify_meta?.localId}) is not staged (verified=${r.verified}, archived=${r.archived}): the prereg grades staged rows only`)
    const it = r.item ?? {}
    if (!Array.isArray(it.choices) || it.choices.length !== 4 || new Set(it.choices).size !== 4 || !it.choices.includes(it.correct_answer)) problems.push(`row ${r.id}: needs 4 distinct choices containing its key`)
    if (typeof r.verify_meta?.localId !== 'string' || !r.verify_meta.localId) problems.push(`row ${r.id}: no verify_meta.localId to key the grade on`)
    if (!SIZE[r.task]) problems.push(`row ${r.id}: task "${r.task}" is not a science format`)
  }
  const ids = rows.map(r => r.verify_meta?.localId)
  if (new Set(ids).size !== ids.length) problems.push('verify_meta.localId is not unique across the batch')
  const passages = []
  for (const c of cohorts) {
    const mine = rows.filter(r => r.cohort === c)
    if (!mine.length) { problems.push(`cohort ${c}: no rows`); continue }
    const by = new Map()
    for (const r of [...mine].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)) || String(a.id).localeCompare(String(b.id)))) {
      if (!by.has(r.passage_group_id)) by.set(r.passage_group_id, [])
      by.get(r.passage_group_id).push(r)
    }
    const fmtCount = {}
    for (const [gid, items] of by) {
      const format = items[0].task
      fmtCount[format] = (fmtCount[format] ?? 0) + 1
      if (items.some(i => i.task !== format)) problems.push(`${gid}: mixed formats`)
      if (items.length !== SIZE[format]) problems.push(`${gid}: ${items.length} items, a ${format} passage needs ${SIZE[format]}`)
      if (new Set(items.map(i => i.item.passage)).size !== 1) problems.push(`${gid}: items carry different passage text`)
      const figs = new Set(items.map(i => JSON.stringify(i.item.graphic ?? null)))
      if (figs.size !== 1) problems.push(`${gid}: items carry different figures (the packet prints one figure per passage)`)
      if (format !== 'conflicting_viewpoints' && !items[0].item.graphic) problems.push(`${gid}: a ${format} passage with no figure`)
      passages.push({ cohort: c, gid, format, figure: items[0].item.graphic ?? null, items })
    }
    if (strictForm) {
      if (mine.length !== 40) problems.push(`cohort ${c}: ${mine.length} rows, a form is 40`)
      for (const [f, n] of Object.entries(FORM)) if ((fmtCount[f] ?? 0) !== n) problems.push(`cohort ${c}: ${fmtCount[f] ?? 0} ${f} passages, a form has ${n}`)
    }
  }
  if (problems.length) throw new Refusal(`structure:\n  ${problems.join('\n  ')}`)
  return passages
}

/** Keys dealt FLAT round-robin over a seeded item order; distractors shuffled. Returns { order: {qid: [text x4]}, keyLetter: {qid: letter}, dealt }. */
export function deal(passages, seed) {
  const rand = rng(seed)
  const all = passages.flatMap(p => p.items)
  const seq = shuffleWith(all.map((_, i) => i), rand)
  const order = {}, keyLetter = {}, dealt = { A: 0, B: 0, C: 0, D: 0 }
  seq.forEach((idx, n) => {
    const r = all[idx], want = SLOTS[n % 4]
    const rest = shuffleWith(r.item.choices.filter(c => c !== r.item.correct_answer), rand)
    let k = 0
    order[r.verify_meta.localId] = SLOTS.map(s => (s === want ? r.item.correct_answer : rest[k++]))
    keyLetter[r.verify_meta.localId] = want; dealt[want]++
  })
  return { order, keyLetter, dealt }
}

/** One packet. keyed adds the key and the author's explanation; nothing else differs. only: restrict to these qids (re-check). */
export function packet(passages, d, { keyed, title, only = null }) {
  const L = [`# ${title} (${keyed ? 'KEYED' : 'COLD, no key'})`, '',
    'Read scripts/study-bank/act-science-regrade/GRADER-BRIEF.md first. The figure under each passage is drawn under EVERY question of that passage on screen; it is printed once here.',
    'Options are in the order dealt for this grading (the app shuffles them per student). Answer by these letters.', '']
  let n = 0
  for (const p of passages) {
    const items = only ? p.items.filter(i => only.has(i.verify_meta.localId)) : p.items
    if (!items.length) continue
    const fig = decodeGraphic(p.figure)
    L.push(`## PASSAGE ${p.gid.split(':').pop()}  (${p.cohort}; ${SHORT[p.format]}, ${p.items.length} questions)`, '',
      normalizeDisplayText(p.items[0].item.passage), '', fig.text, '')
    for (const w of fig.warnings) L.push(`RENDER WARNING: ${w}`)
    if (fig.warnings.length) L.push('')
    for (const r of items) {
      const q = r.verify_meta.localId, opts = d.order[q]
      L.push(`### ${q}  (${r.domain})`, '', `QUESTION: ${normalizeDisplayText(r.item.prompt)}`, ...opts.map((c, i) => `  ${SLOTS[i]}) ${c}`), '')
      if (keyed) L.push(`KEY: ${d.keyLetter[q]}) ${r.item.correct_answer}`, `AUTHOR'S EXPLANATION: ${r.item.explanation ?? '(none)'}`, '')
      n++
    }
  }
  if (!n) throw new Refusal('packet would hold zero items')
  return { text: L.join('\n') + '\n', n }
}

/* ------------------------------------------------------------------ *
 * Grade files
 * ------------------------------------------------------------------ */

const LET = v => typeof v === 'string' && /^[A-D]$/.test(v)
/** cold.json: { items: [{ id, cold_pick, cold_defensible: [letters], cold_note }] } */
export function validateCold(doc, qids) {
  const errs = [], items = Array.isArray(doc?.items) ? doc.items : null
  if (!items) return ['cold.json has no "items" array']
  const seen = new Set()
  for (const it of items) {
    if (!qids.has(it?.id)) errs.push(`unknown id ${it?.id}`)
    if (seen.has(it?.id)) errs.push(`duplicate id ${it.id}`); seen.add(it?.id)
    if (!LET(it?.cold_pick)) errs.push(`${it?.id}: cold_pick must be one letter A-D`)
    if (!Array.isArray(it?.cold_defensible) || !it.cold_defensible.every(LET)) errs.push(`${it?.id}: cold_defensible must be an array of letters`)
  }
  for (const q of qids) if (!seen.has(q)) errs.push(`missing ${q}`)
  return errs
}

/** keyed.json: { items: [...per GRADER-BRIEF...], batch: { cross_item_pattern: null | { rule, items: [qid...] } } } */
export function validateKeyed(doc, qids, coldPicks) {
  const errs = [], items = Array.isArray(doc?.items) ? doc.items : null
  if (!items) return ['keyed.json has no "items" array']
  const yn = v => v === 'yes' || v === 'no'
  const seen = new Set()
  for (const it of items) {
    const id = it?.id
    if (!qids.has(id)) { errs.push(`unknown id ${id}`); continue }
    if (seen.has(id)) errs.push(`duplicate id ${id}`); seen.add(id)
    if (coldPicks && it.cold_pick !== coldPicks[id]) errs.push(`${id}: cold_pick ${it.cold_pick} differs from the frozen cold.json (${coldPicks[id]})`)
    if (!['yes', 'no', 'unsure'].includes(it.key_correct)) errs.push(`${id}: key_correct must be yes|no|unsure`)
    if (!(it.second_defensible === null || (LET(it.second_defensible?.letter) && typeof it.second_defensible?.reason === 'string'))) errs.push(`${id}: second_defensible must be null or {letter, reason}`)
    if (!(it.fact_error === null || typeof it.fact_error === 'string')) errs.push(`${id}: fact_error must be null or a string`)
    if (!yn(it.no_source_needed)) errs.push(`${id}: no_source_needed must be yes|no`)
    if (!(it.recognised_real_data === null || typeof it.recognised_real_data === 'string')) errs.push(`${id}: recognised_real_data must be null or a string`)
    if (!(it.free_elimination === null || (Array.isArray(it.free_elimination?.letters) && it.free_elimination.letters.length && it.free_elimination.letters.every(LET) && typeof it.free_elimination?.how === 'string'))) errs.push(`${id}: free_elimination must be null or {letters:[...], how}`)
    if (!['ok', 'problem'].includes(it.readability)) errs.push(`${id}: readability must be ok|problem`)
    if (!yn(it.single_sentence)) errs.push(`${id}: single_sentence must be yes|no`)
    if (!['easy', 'medium', 'hard'].includes(it.difficulty)) errs.push(`${id}: difficulty must be easy|medium|hard`)
  }
  for (const q of qids) if (!seen.has(q)) errs.push(`missing ${q}`)
  const p = doc?.batch?.cross_item_pattern
  if (!doc?.batch || !(p === null || (typeof p?.rule === 'string' && Array.isArray(p?.items)))) errs.push('batch.cross_item_pattern must be null or {rule, items:[qid...]}')
  return errs
}

/* ------------------------------------------------------------------ *
 * The drop rules (ACT-SCIENCE-AGENT-RELEASE.prereg.md §Drop rules), pure
 * ------------------------------------------------------------------ */

/**
 * passages: from structure(); keyLetter: {qid: letter}; g1, g2: keyed docs; r1: re-check keyed doc or null;
 * confirm: coordinator confirmations { items: { qid: { key?: 'key_ok'|'key_wrong', fact?: 'confirmed'|'rejected',
 *   real_data?: 'confirmed'|'rejected', readability?: 'confirmed'|'rejected', scope?: 'item'|'passage', why } },
 *   batch: { pattern: { named_by_both: false } | { named_by_both: true, rule, decides: [qid...] } } }.
 * Returns { pending: [...], recheck: [qids], perCohort: { cohort: { cleared: [qid], drop_rules: {qid: reason},
 *   passage_incomplete: {qid: reason} } }, recorded: [...], failedCohorts: [...] }.
 */
export function decide({ passages, keyLetter, g1, g2, r1 = null, confirm = { items: {}, batch: {} } }) {
  const by = d => Object.fromEntries((d?.items ?? []).map(i => [i.id, i]))
  const A = by(g1), B = by(g2), R = r1 ? by(r1) : null
  const C = confirm?.items ?? {}
  const pending = [], recheck = new Set(), recorded = [], drop = new Map(), passageDrop = new Map()
  const qidsOf = p => p.items.map(i => i.verify_meta.localId)
  const add = (q, why) => { if (!drop.has(q)) drop.set(q, why) }
  for (const p of passages) for (const q of qidsOf(p)) {
    const a = A[q], b = B[q], k = keyLetter[q], c = C[q] ?? {}
    if (!a || !b) { pending.push(`${q}: missing from ${!a ? 'g1' : 'g2'}`); continue }
    const stim = why => (c.scope === 'passage' ? passageDrop.set(p.gid, `${why} (stimulus-level, ${q})`) : add(q, why))
    // R1 key
    const bothColdOff = a.cold_pick === b.cold_pick && a.cold_pick !== k
    if (a.key_correct !== 'yes' || b.key_correct !== 'yes' || bothColdOff) {
      if (c.key === 'key_wrong') add(q, 'R1 key wrong (coordinator recomputation confirmed)')
      else if (c.key !== 'key_ok') pending.push(`${q}: R1 needs confirm.items.${q}.key = key_ok|key_wrong (key_correct ${a.key_correct}/${b.key_correct}${bothColdOff ? `, both cold picks ${a.cold_pick} vs key ${k}` : ''})`)
    }
    // R2 second defensible
    const sa = a.second_defensible?.letter, sb = b.second_defensible?.letter
    if (sa && sb && sa === sb) add(q, `R2 second defensible ${sa} from both graders`)
    else for (const s of [sa, sb].filter(Boolean)) {
      if (!R) { recheck.add(q); pending.push(`${q}: R2 single-grader second_defensible ${s}: needs the re-check grader`) }
      else if (!R[q]) { recheck.add(q); pending.push(`${q}: R2 flagged ${s} but the re-check grader did not grade it`) }
      else if (R[q].second_defensible?.letter === s) add(q, `R2b second defensible ${s} from one grader and the re-check grader`)
      else recorded.push(`${q}: R2 single ${s}, re-check did not confirm`)
    }
    // R3 fact error
    if (a.fact_error || b.fact_error) {
      if (c.fact === 'confirmed') stim('R3 fact error confirmed')
      else if (c.fact !== 'rejected') pending.push(`${q}: R3 needs confirm.items.${q}.fact = confirmed|rejected (+ scope item|passage)`)
    }
    // R4 no source needed
    const na = a.no_source_needed === 'yes', nb = b.no_source_needed === 'yes'
    if (na && nb) add(q, 'R4 no_source_needed from both graders')
    else if (na || nb) {
      if (!R) { recheck.add(q); pending.push(`${q}: R4 single-grader no_source_needed: needs the re-check grader`) }
      else if (!R[q]) { recheck.add(q); pending.push(`${q}: R4 single-grader no_source_needed but the re-check grader did not grade it`) }
      else if (R[q].no_source_needed === 'yes') add(q, 'R4b no_source_needed from one grader and the re-check grader')
      else recorded.push(`${q}: R4 single no_source_needed, re-check did not confirm`)
    }
    // R5 recognised real data
    if (a.recognised_real_data || b.recognised_real_data) {
      if (c.real_data === 'confirmed') stim('R5 recognised real data confirmed')
      else if (c.real_data !== 'rejected') pending.push(`${q}: R5 needs confirm.items.${q}.real_data = confirmed|rejected (+ scope)`)
    }
    // R6 free elimination of 2+ distractors from both
    const killed = g => new Set((g.free_elimination?.letters ?? []).filter(l => l !== k)).size
    if (killed(a) >= 2 && killed(b) >= 2) add(q, `R6 free elimination of 2+ distractors from both graders (${killed(a)}, ${killed(b)})`)
    else if (killed(a) || killed(b)) recorded.push(`${q}: R6 free elimination ${killed(a)}/${killed(b)} (counts toward the batch rate)`)
    // R7 readability
    if (a.readability === 'problem' || b.readability === 'problem') {
      if (c.readability === 'confirmed') stim('R7 readability problem confirmed against the renderer')
      else if (c.readability !== 'rejected') pending.push(`${q}: R7 needs confirm.items.${q}.readability = confirmed|rejected (+ scope)`)
    }
  }
  // R8 cross-item pattern named by both graders: holds the batch until the coordinator records it
  const pa = g1?.batch?.cross_item_pattern, pb = g2?.batch?.cross_item_pattern
  const failedCohorts = []
  if (pa && pb) {
    const pc = confirm?.batch?.pattern
    if (!pc) pending.push(`batch: R8 both graders named a cross-item pattern ("${pa.rule}" / "${pb.rule}"): needs confirm.batch.pattern`)
    else if (pc.named_by_both) {
      for (const q of pc.decides ?? []) add(q, `R8 cross-item pattern: ${pc.rule}`)
      for (const c of [...new Set(passages.map(p => p.cohort))]) {
        const mine = passages.filter(p => p.cohort === c).flatMap(qidsOf)
        const hit = mine.filter(q => (pc.decides ?? []).includes(q)).length
        if (hit * 2 >= mine.length) failedCohorts.push(`${c}: the pattern decides ${hit}/${mine.length} items (>= half): the cohort does not ship`)
      }
    }
  } else if (pa || pb) recorded.push(`batch: cross-item pattern from one grader only: ${(pa ?? pb).rule}`)
  const perCohort = {}
  for (const p of passages) {
    const pc = (perCohort[p.cohort] ??= { cleared: [], drop_rules: {}, passage_incomplete: {} })
    const qs = qidsOf(p)
    const failed = failedCohorts.some(f => f.startsWith(p.cohort + ':'))
    const lost = passageDrop.get(p.gid) ?? (failed ? 'R8 cohort failed whole' : null)
    const dropped = qs.filter(q => drop.has(q))
    for (const q of qs) {
      if (drop.has(q)) pc.drop_rules[q] = drop.get(q)
      else if (lost) pc.drop_rules[q] = lost
      else if (dropped.length) pc.passage_incomplete[q] = `passage ${p.gid} lost ${dropped.join(', ')}; a short passage is never drawn (assembleActSection needs ${SIZE[p.format]})`
      else pc.cleared.push(q)
    }
  }
  return { pending, recheck: [...recheck], perCohort, recorded, failedCohorts }
}

/* ------------------------------------------------------------------ *
 * IO
 * ------------------------------------------------------------------ */

function loadBatches() { return JSON.parse(readFileSync(join(HERE, 'batches.json'), 'utf8')) }
function batchOf(id) { const b = loadBatches().batches[id]; if (!b) throw new Refusal(`unknown batch ${id} (batches.json)`); return b }
const readJson = p => { if (!existsSync(p)) throw new Refusal(`missing ${p}`); try { return JSON.parse(readFileSync(p, 'utf8')) } catch (e) { throw new Refusal(`${p}: ${e.message}`) } }
function put(p, body) { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, typeof body === 'string' ? body : JSON.stringify(body, null, 1) + '\n'); console.log(`  wrote ${p}`) }

async function readRows(cohorts, from) {
  if (from) { const a = readJson(from); if (!Array.isArray(a)) throw new Refusal(`${from}: not an array of rows`); return a.filter(r => cohorts.includes(r.cohort)) }
  const { client, pageExact } = await import('../autonomy-io.mjs')
  const db = client(), rows = []
  for (const c of cohorts) rows.push(...await pageExact(db, 'study_item_bank', 'id,cohort,family,section,verified,archived,passage_group_id,task,domain,item,verify_meta,content_sha,created_at', q => q.eq('cohort', c), `cohort ${c}`))
  const wrong = rows.filter(r => r.family !== 'act' || r.section !== 'science')
  if (wrong.length) throw new Refusal(`${wrong.length} row(s) are not act/science`)
  return rows
}

async function cmdBuild(batch, root, from) {
  const b = batchOf(batch), rows = await readRows(b.cohorts, from)
  const passages = structure(rows, b.cohorts, { strictForm: b.strictForm !== false }), d = deal(passages, b.seed)
  const title = `ACT Science agent re-grade, batch ${batch} (${b.cohorts.join(' + ')})`
  const cold = packet(passages, d, { keyed: false, title }), keyed = packet(passages, d, { keyed: true, title })
  if (/^KEY:|AUTHOR'S EXPLANATION/m.test(cold.text)) throw new Refusal('cold packet carries a key line: refusing to write it')
  const co = join(root, '_coordinator', batch)
  for (const g of ['g1', 'g2']) put(join(root, `${batch}-${g}`, 'grader-cold.md'), cold.text)
  put(join(co, 'grader-keyed.md'), keyed.text)
  const key = Object.fromEntries(passages.flatMap(p => p.items.map(r => [r.verify_meta.localId, {
    cohort: p.cohort, passage: p.gid, format: p.format, rowId: r.id, content_sha: r.content_sha ?? null, key: d.keyLetter[r.verify_meta.localId], options: d.order[r.verify_meta.localId],
  }])))
  put(join(co, 'packet.key.json'), { batch, seed: b.seed, dealt: d.dealt, items: key })
  put(join(co, 'build.json'), { batch, cohorts: b.cohorts, items: cold.n, passages: passages.length, cold_sha256: sha(cold.text), keyed_sha256: sha(keyed.text), built_from: from ?? 'study_item_bank (read-only)' })
  const warn = passages.filter(p => decodeGraphic(p.figure).warnings.length).length
  console.log(`build ${batch}: ${cold.n} items in ${passages.length} passages (${b.cohorts.join(', ')}); keys dealt ${JSON.stringify(d.dealt)}; render warnings on ${warn} passage(s)`)
}

function qidsFor(root, batch, grader) {
  const key = readJson(join(root, '_coordinator', batch, 'packet.key.json'))
  if (grader !== 'r1') return new Set(Object.keys(key.items))
  return new Set(readJson(join(root, '_coordinator', batch, 'recheck.json')).ids)
}

function cmdReleaseKeyed(batch, grader, root) {
  if (!GRADERS.includes(grader)) throw new Refusal(`grader must be one of ${GRADERS.join(', ')}`)
  const dir = join(root, `${batch}-${grader}`), coldPath = join(dir, 'cold.json')
  const raw = existsSync(coldPath) ? readFileSync(coldPath, 'utf8') : null
  if (!raw) throw new Refusal(`${coldPath} does not exist: the keyed packet is released only after the cold picks are written`)
  const errs = validateCold(readJson(coldPath), qidsFor(root, batch, grader))
  if (errs.length) throw new Refusal(`cold.json invalid (${errs.length}):\n  ${errs.slice(0, 20).join('\n  ')}`)
  const lockPath = join(dir, 'cold.lock.json')
  if (existsSync(lockPath) && readJson(lockPath).sha256 !== sha(raw)) throw new Refusal('cold.json changed after it was frozen: this grader is void; use a fresh grader')
  if (!existsSync(lockPath)) put(lockPath, { sha256: sha(raw), frozen_at: new Date().toISOString() })
  const src = join(root, '_coordinator', batch, grader === 'r1' ? 'recheck-keyed.md' : 'grader-keyed.md')
  put(join(dir, grader === 'r1' ? 'recheck-keyed.md' : 'grader-keyed.md'), readFileSync(src, 'utf8'))
}

function cmdCheck(batch, grader, root) {
  const dir = join(root, `${batch}-${grader}`), lock = readJson(join(dir, 'cold.lock.json'))
  const coldRaw = readFileSync(join(dir, 'cold.json'), 'utf8')
  if (sha(coldRaw) !== lock.sha256) throw new Refusal('cold.json changed after it was frozen: this grader is void')
  const picks = Object.fromEntries(JSON.parse(coldRaw).items.map(i => [i.id, i.cold_pick]))
  const qids = qidsFor(root, batch, grader), doc = readJson(join(dir, 'keyed.json'))
  const errs = validateKeyed(doc, qids, picks)
  console.log(`check ${batch}-${grader}: ${doc.items?.length ?? 0} graded of ${qids.size} expected`)
  if (errs.length) throw new Refusal(`keyed.json invalid (${errs.length}):\n  ${errs.slice(0, 30).join('\n  ')}`)
  const key = readJson(join(root, '_coordinator', batch, 'packet.key.json')).items
  const agree = doc.items.filter(i => i.cold_pick === key[i.id].key).length
  const cnt = f => doc.items.filter(f).length
  console.log(`  cold pick = key ${agree}/${qids.size}; key_correct no ${cnt(i => i.key_correct === 'no')}, unsure ${cnt(i => i.key_correct === 'unsure')}; second_defensible ${cnt(i => i.second_defensible)}; fact_error ${cnt(i => i.fact_error)}; no_source_needed ${cnt(i => i.no_source_needed === 'yes')}; real_data ${cnt(i => i.recognised_real_data)}; free_elimination ${cnt(i => i.free_elimination)}; readability problem ${cnt(i => i.readability === 'problem')}; cross_item_pattern ${doc.batch.cross_item_pattern ? 'YES' : 'none'}`)
}

async function loadForDecide(batch, root) {
  const b = batchOf(batch), co = join(root, '_coordinator', batch), key = readJson(join(co, 'packet.key.json'))
  const built = readJson(join(co, 'build.json'))
  const rows = await readRows(b.cohorts, built.built_from.startsWith('study_item_bank') ? null : built.built_from)
  const passages = structure(rows, b.cohorts, { strictForm: b.strictForm !== false })
  for (const p of passages) for (const r of p.items) {
    const k = key.items[r.verify_meta.localId]
    if (!k) throw new Refusal(`${r.verify_meta.localId} is not in the packet key: rebuild`)
    if (k.content_sha !== (r.content_sha ?? null)) throw new Refusal(`${r.verify_meta.localId} was edited after its packet was built (content_sha ${k.content_sha} -> ${r.content_sha}): its grades do not bind to the current content`)
  }
  const keyLetter = Object.fromEntries(Object.entries(key.items).map(([q, v]) => [q, v.key]))
  return { b, co, passages, keyLetter }
}

async function cmdRecheck(batch, root) {
  const { co, passages, keyLetter } = await loadForDecide(batch, root)
  const g = n => { cmdCheck(batch, n, root); return readJson(join(root, `${batch}-${n}`, 'keyed.json')) }
  const r = decide({ passages, keyLetter, g1: g('g1'), g2: g('g2') })
  if (!r.recheck.length) { console.log(`recheck ${batch}: no single-grader flags; no re-check grader needed`); return }
  const only = new Set(r.recheck), key = readJson(join(co, 'packet.key.json'))
  const d = { order: Object.fromEntries(Object.entries(key.items).map(([q, v]) => [q, v.options])), keyLetter }
  const title = `ACT Science agent re-grade, batch ${batch}, RE-CHECK of ${only.size} items`
  put(join(co, 'recheck.json'), { ids: [...only] })
  put(join(root, `${batch}-r1`, 'recheck-cold.md'), packet(passages, d, { keyed: false, title, only }).text)
  put(join(co, 'recheck-keyed.md'), packet(passages, d, { keyed: true, title, only }).text)
  console.log(`recheck ${batch}: ${only.size} item(s) for one fresh grader (r1)`)
}

async function cmdDecide(batch, root, write) {
  const { b, co, passages, keyLetter } = await loadForDecide(batch, root)
  const g = n => { cmdCheck(batch, n, root); return readJson(join(root, `${batch}-${n}`, 'keyed.json')) }
  const r1 = existsSync(join(root, `${batch}-r1`, 'keyed.json')) ? g('r1') : null
  const confirm = existsSync(join(co, 'confirm.json')) ? readJson(join(co, 'confirm.json')) : { items: {}, batch: {} }
  const r = decide({ passages, keyLetter, g1: g('g1'), g2: g('g2'), r1, confirm })
  put(join(co, 'decision.json'), r)
  for (const x of r.recorded) console.log(`  recorded: ${x}`)
  for (const [c, v] of Object.entries(r.perCohort)) console.log(`  ${c}: ${r.pending.length ? `PROVISIONAL while ${r.pending.length} pending: ` : ''}cleared ${v.cleared.length}/40, dropped by rule ${Object.keys(v.drop_rules).length}, passage_incomplete ${Object.keys(v.passage_incomplete).length}`)
  if (r.pending.length) throw new Refusal(`${r.pending.length} pending; nothing written to the repo:\n  ${r.pending.join('\n  ')}`)
  if (!write) { console.log('DRY: pass --write to write the per-cohort cleared/dropped files and copy the grades into the repo'); return }
  const out = join(HERE, 'results', batch)
  for (const n of ['g1', 'g2', ...(r1 ? ['r1'] : [])]) put(join(out, `${n}.keyed.json`), readJson(join(root, `${batch}-${n}`, 'keyed.json')))
  put(join(out, 'confirm.json'), confirm)
  for (const c of b.cohorts) {
    const v = r.perCohort[c]
    put(join(out, `${c}.cleared.json`), v.cleared)
    put(join(out, `${c}.dropped.json`), { drop_rules: v.drop_rules, passage_incomplete: v.passage_incomplete })
  }
}

/* ------------------------------------------------------------------ *
 * Self-test (no DB). Each case names the mechanism it pins.
 * ------------------------------------------------------------------ */

function fixtureRows() {
  const table = { type: 'table', rowLabels: ['Trial 1', 'Trial 2', 'Trial 3'], colLabels: ['Mass (g)', 'Time (s)'], cells: [[10, 2.0], [20, 2.8], [30, 3.4]], caption: 'Table 1' }
  const rows = []
  const mk = (cohort, gid, task, n, graphic) => {
    for (let i = 1; i <= n; i++) rows.push({
      id: `${gid}-${i}`, cohort, verified: false, archived: false, passage_group_id: `${cohort}:${gid}`, task, domain: 'Interpretation of Data', content_sha: `sha-${gid}-${i}`,
      created_at: `2026-10-23T00:00:${String(rows.length).padStart(2, '0')}Z`, verify_meta: { localId: `${gid.toUpperCase()}-Q${i}` },
      item: { passage: `Passage ${gid}. **Bold** text.`, prompt: `Question ${i} of ${gid}?`, choices: [`key ${gid}${i}`, `d1 ${gid}${i}`, `d2 ${gid}${i}`, `d3 ${gid}${i}`], correct_answer: `key ${gid}${i}`, explanation: `EXPLAIN-${gid}-${i}`, passage_title: `TITLE-${gid}`, graphic },
    })
  }
  mk('c1', 'p1', 'data_representation', 5, table)
  mk('c1', 'p2', 'conflicting_viewpoints', 6, null)
  return rows
}

async function selftest() {
  let fail = 0; const ok = (c, m) => { if (c) console.log(`  ok   ${m}`); else { fail++; console.log(`  FAIL ${m}`) } }
  const throwsR = f => { try { f(); return false } catch (e) { return e instanceof Refusal } }
  const rows = fixtureRows(), P = structure(rows, ['c1'], { strictForm: false }), d = deal(P, 7)
  const cold = packet(P, d, { keyed: false, title: 't' }).text, keyed = packet(P, d, { keyed: true, title: 't' }).text
  ok(!/^KEY:/m.test(cold) && /^KEY:/m.test(keyed), 'cold packet carries no KEY line; keyed does')
  ok(!cold.includes('EXPLAIN-') && keyed.includes('EXPLAIN-p1-1'), 'explanation only in the keyed packet')
  ok(!cold.includes('TITLE-') && !keyed.includes('TITLE-'), 'passage_title (not drawn by the runner) withheld from both')
  ok(!cold.includes('**Bold**') && cold.includes('Bold text'), 'passage goes through normalizeDisplayText as on screen')
  ok((cold.match(/^TABLE/gm) ?? []).length === 1, 'a DR passage figure is printed once, not per item')
  ok(Math.max(...Object.values(d.dealt)) - Math.min(...Object.values(d.dealt)) <= 1, `keys dealt flat ${JSON.stringify(d.dealt)}`)
  ok(Object.entries(d.keyLetter).every(([q, l]) => d.order[q][SLOTS.indexOf(l)] === rows.find(r => r.verify_meta.localId === q).item.correct_answer), 'key letter points at the real key in every dealt item')
  ok(Object.values(d.order).some(o => o[0] !== o.find(x => x.startsWith('key'))), 'deal moves the key off the stored slot A (stored order not reproduced)')
  // renderer mirroring
  const blank = decodeGraphic({ type: 'table', rowLabels: ['a', '', 'c'], colLabels: ['x'], cells: [[1], [2], [3]] })
  ok(blank.warnings.some(w => /blank row label/.test(w)) && /\| c \| 2 \|/.test(blank.text), 'blank row label: decoder shows the shifted cell the renderer draws (c -> 2) and warns')
  const ln = decodeGraphic({ type: 'line', series: [{ label: 's1', points: [[0, 0], [4, 14]] }, { label: 's2', points: [[0, 1], [4, 2]] }] })
  ok(/y tick labels: 0, 3.5, 7, 10.5, 14/.test(ln.text) && ln.warnings.some(w => /NO legend/.test(w)), 'line: renderer ticks, and a multi-series graph warns that no legend is drawn')
  ok(/tick labels the student sees: 0, 20, 40, 60, 80/.test(decodeGraphic({ type: 'bar', bars: [{ label: 'a', value: 80 }, { label: 'b', value: 30 }] }).text), 'bar: renderer y ticks, no value labels')
  ok(throwsR(() => decodeGraphic({ type: 'svg', svg: '<svg/>' })) && throwsR(() => decodeGraphic({ svg: '<svg/>' })), 'svg figure REFUSES (a grader would grade a figure nobody showed them)')
  // structure refusals
  ok(throwsR(() => structure(rows.slice(0, 10), ['c1'], { strictForm: false })), 'a 4-item DR passage refuses')
  ok(throwsR(() => structure(rows.map((r, i) => (i === 0 ? { ...r, verified: true } : r)), ['c1'], { strictForm: false })), 'a released row refuses (staged rows only)')
  ok(throwsR(() => structure(rows.map((r, i) => (i === 1 ? { ...r, item: { ...r.item, graphic: { ...r.item.graphic, caption: 'other' } } } : r)), ['c1'], { strictForm: false })), 'different figures inside one passage refuse')
  ok(throwsR(() => structure(rows, ['c1'])), 'strictForm refuses a cohort that is not a 40-item, 2/3/2 form')
  ok(throwsR(() => structure([], ['c1'])), 'zero rows refuse')
  // grade validation
  const qids = new Set(Object.keys(d.keyLetter))
  const coldDoc = { items: [...qids].map(q => ({ id: q, cold_pick: d.keyLetter[q], cold_defensible: [], cold_note: '' })) }
  ok(!validateCold(coldDoc, qids).length, 'valid cold.json passes')
  ok(validateCold({ items: coldDoc.items.slice(1) }, qids).some(e => /missing/.test(e)), 'cold.json missing an item refuses')
  ok(validateCold({ items: coldDoc.items.map((x, i) => (i ? x : { ...x, cold_pick: { pick: 'A' } })) }, qids).length > 0, 'cold_pick as an object refuses (the MAP 0/72 scorer bug)')
  const clean = q => ({ id: q, cold_pick: d.keyLetter[q], cold_defensible: [], cold_note: '', key_correct: 'yes', second_defensible: null, fact_error: null, no_source_needed: 'no', recognised_real_data: null, free_elimination: null, readability: 'ok', readability_note: '', single_sentence: 'no', difficulty: 'medium', note: '' })
  const doc = over => ({ items: [...qids].map(q => ({ ...clean(q), ...(over[q] ?? {}) })), batch: { cross_item_pattern: null } })
  const picks = Object.fromEntries(coldDoc.items.map(i => [i.id, i.cold_pick]))
  ok(!validateKeyed(doc({}), qids, picks).length, 'valid keyed.json passes')
  const q0 = 'P1-Q1', q1 = 'P1-Q2', cv = 'P2-Q3', other = l => SLOTS.find(s => s !== l)
  ok(validateKeyed(doc({ [q0]: { cold_pick: other(d.keyLetter[q0]) } }), qids, picks).some(e => /frozen/.test(e)), 'keyed.json whose cold pick changed refuses')
  ok(validateKeyed({ items: doc({}).items }, qids, picks).some(e => /cross_item_pattern/.test(e)), 'keyed.json without a batch-level pattern answer refuses')
  // decide
  const base = { passages: P, keyLetter: d.keyLetter }
  const all = r => Object.values(r.perCohort).reduce((a, v) => a + v.cleared.length, 0)
  const r0 = decide({ ...base, g1: doc({}), g2: doc({}) })
  ok(!r0.pending.length && all(r0) === 11, 'two clean graders clear all 11')
  const k0 = d.keyLetter[q0], wrongL = other(k0)
  const sd = decide({ ...base, g1: doc({ [q0]: { second_defensible: { letter: wrongL, reason: 'x' } } }), g2: doc({ [q0]: { second_defensible: { letter: wrongL, reason: 'y' } } }) })
  ok(sd.perCohort.c1.drop_rules[q0]?.startsWith('R2') && Object.keys(sd.perCohort.c1.passage_incomplete).length === 4 && sd.perCohort.c1.cleared.length === 6, 'R2 both graders same option: item drops, its 4 DR siblings go passage_incomplete, the CV passage still ships')
  const single = decide({ ...base, g1: doc({ [cv]: { second_defensible: { letter: other(d.keyLetter[cv]), reason: 'x' } } }), g2: doc({}) })
  ok(single.pending.length === 1 && single.recheck.includes(cv), 'R2 one grader: pending, routed to the re-check grader')
  const rc = l => ({ items: [{ ...clean(cv), second_defensible: { letter: l, reason: 'z' } }], batch: { cross_item_pattern: null } })
  const sdl = other(d.keyLetter[cv])
  ok(decide({ ...base, g1: doc({ [cv]: { second_defensible: { letter: sdl, reason: 'x' } } }), g2: doc({}), r1: rc(sdl) }).perCohort.c1.drop_rules[cv]?.startsWith('R2b'), 'R2 one grader + re-check same option: drops')
  ok(!decide({ ...base, g1: doc({ [cv]: { second_defensible: { letter: sdl, reason: 'x' } } }), g2: doc({}), r1: { items: [clean(cv)], batch: { cross_item_pattern: null } } }).perCohort.c1.drop_rules[cv], 'R2 one grader, re-check disagrees: kept')
  ok(decide({ ...base, g1: doc({ [q1]: { key_correct: 'no' } }), g2: doc({}) }).pending.some(p => p.startsWith(`${q1}: R1`)), 'R1 key_correct no from ONE grader: pending until the coordinator recomputes')
  ok(decide({ ...base, g1: doc({ [q1]: { key_correct: 'no' } }), g2: doc({}), confirm: { items: { [q1]: { key: 'key_wrong' } }, batch: {} } }).perCohort.c1.drop_rules[q1]?.startsWith('R1'), 'R1 confirmed: drops')
  ok(decide({ ...base, g1: doc({ [q1]: { cold_pick: wrongL } }), g2: doc({ [q1]: { cold_pick: wrongL } }) }).pending.some(p => p.includes('both cold picks')), 'R1 also opens when both graders cold-picked the same non-key letter, even with key_correct yes')
  ok(decide({ ...base, g1: doc({ [q0]: { no_source_needed: 'yes' } }), g2: doc({ [q0]: { no_source_needed: 'yes' } }) }).perCohort.c1.drop_rules[q0]?.startsWith('R4'), 'R4 both graders: drops')
  const fe2 = l => ({ letters: l, how: 'h' })
  const nk = SLOTS.filter(s => s !== k0)
  ok(decide({ ...base, g1: doc({ [q0]: { free_elimination: fe2(nk.slice(0, 2)) } }), g2: doc({ [q0]: { free_elimination: fe2(nk.slice(1, 3)) } }) }).perCohort.c1.drop_rules[q0]?.startsWith('R6'), 'R6 both graders kill 2+ distractors: drops')
  ok(!decide({ ...base, g1: doc({ [q0]: { free_elimination: fe2([k0, nk[0]]) } }), g2: doc({ [q0]: { free_elimination: fe2([k0, nk[1]]) } }) }).perCohort.c1.drop_rules[q0], 'R6 counts DISTRACTORS: naming the key as eliminated does not count toward 2')
  const fact = decide({ ...base, g1: doc({ [q0]: { fact_error: 'table breaks a law' } }), g2: doc({}), confirm: { items: { [q0]: { fact: 'confirmed', scope: 'passage' } }, batch: {} } })
  ok(Object.keys(fact.perCohort.c1.drop_rules).length === 5 && !Object.keys(fact.perCohort.c1.passage_incomplete).length, 'R3 stimulus-level fact error drops the whole passage by rule')
  const pat = { rule: 'key is the only option naming two trials', items: [q0] }
  const g1p = { ...doc({}), batch: { cross_item_pattern: pat } }, g2p = { ...doc({}), batch: { cross_item_pattern: pat } }
  ok(decide({ ...base, g1: g1p, g2: g2p }).pending.some(p => p.startsWith('batch: R8')), 'R8 pattern from both graders holds the batch')
  const many = [...qids].slice(0, 6)
  ok(decide({ ...base, g1: g1p, g2: g2p, confirm: { items: {}, batch: { pattern: { named_by_both: true, rule: pat.rule, decides: many } } } }).failedCohorts.length === 1, 'R8 pattern deciding >= half a cohort fails the cohort whole')
  ok(decide({ ...base, g1: g1p, g2: doc({}) }).recorded.some(x => /one grader only/.test(x)), 'R8 one grader: recorded only')
  ok(decide({ ...base, g1: doc({}), g2: { items: doc({}).items.slice(1), batch: { cross_item_pattern: null } } }).pending.some(p => /missing from g2/.test(p)), 'decide refuses an item missing from a grader')
  console.log(fail ? `ACT-SCI-PACKET SELFTEST FAILED: ${fail}` : 'ACT-SCI-PACKET SELFTEST OK')
  process.exit(fail ? 1 : 0)
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (isMain) {
  const A = process.argv.slice(2)
  if (A.includes('--selftest')) await selftest()
  const opt = f => (A.includes(f) ? A[A.indexOf(f) + 1] : null)
  const pos = A.filter((a, i) => !a.startsWith('--') && !['--root', '--from'].includes(A[i - 1]))
  const root = opt('--root') ?? 'scratchpad/act-science-regrade'
  try {
    const [cmd, batch, grader] = pos
    if (cmd === 'build') await cmdBuild(batch, root, opt('--from'))
    else if (cmd === 'release-keyed') cmdReleaseKeyed(batch, grader, root)
    else if (cmd === 'check') cmdCheck(batch, grader, root)
    else if (cmd === 'recheck') await cmdRecheck(batch, root)
    else if (cmd === 'decide') await cmdDecide(batch, root, A.includes('--write'))
    else throw new Refusal('usage: act-sci-packet.mjs build|release-keyed|check|recheck|decide <batch> [g1|g2|r1] [--root DIR] [--from rows.json] [--write] | --selftest')
  } catch (e) {
    if (e instanceof Refusal) { console.error('REFUSING: ' + e.message); process.exit(2) }
    throw e
  }
}
