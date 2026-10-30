#!/usr/bin/env node
/**
 * sci-check.mjs: slot and structure checker for the MAP Science pilot. Run from the repo root.
 *
 *   node scripts/study-bank/map-v2-work/science-pilot/sci-check.mjs <author items.json>        # per-item (authors)
 *   node scripts/study-bank/map-v2-work/science-pilot/sci-check.mjs --batch <L.json> <P.json> <E.json>  # + batch checks
 *   node scripts/study-bank/map-v2-work/science-pilot/sci-check.mjs --selftest                 # proves every check fires
 *   options: --slots <slots.json> (default ./slots.json), --exclusions <file> (default ./EXCLUSIONS-science.txt)
 *
 * PER ITEM (refusing):
 *   SLOT    id is a slot; every slot field matches (area, grade, tier, difficulty, RIT band, DCI, kind, stimulus,
 *           format, ask, invented); NGSS PE is in the grade's band and names the slot's DCI
 *   SHAPE   prompt; 4 distinct choices; key verbatim among them; key at the slot's LETTER; 3 distractor rationales
 *           naming the three non-key choices; model items name a misconception in every fault; real_world_check
 *   RANK    values: key's ascending value rank = slot rank, one unit, one decimal-place count;
 *           other formats: key's length rank = slot rank, all four lengths >= 2 characters apart
 *   FORMAT  conditions / variable options appear verbatim in the stimulus; trend options carry direction words and
 *           the key's direction matches the slot's ask; term <= 5 words; claim >= 6 words
 *   STIM    stimulus <-> graphic/passage presence; graphic is a shape QuestionGraphicView draws (table rows x cols
 *           rectangular, <= 8 x 4; bar 2-8 numeric bars; line exactly ONE series, >= 3 points, x increasing; scatter
 *           >= 5 points), axis labels, caption; passage word limits by stimulus and grade; prompt <= 70 words
 *   READ    values items on bar/line/scatter: every pair of options >= 1/8 of the axis range apart (the renderer
 *           prints 5 ticks per axis and no value labels)
 *   EVID    invented items carry key_evidence whose refs exist in the graphic (or a quote found in the passage);
 *           values items' expr evaluates to the key at the key's decimal places
 *   LEAK    the key's number / wording never appears in the caption; no explanation names an option by letter or
 *           position; no line numbers; the key copies no 4-word passage span that no distractor shares;
 *           no two numeric options sum or difference to a third
 *   DUP     no near-duplicate of an EXCLUSIONS-science.txt stimulus, no invented name already in it
 * BATCH (--batch, refusing): every slot written once or marked EMPTY; key letter and rank histograms vs slots;
 *   science-cliche keys <= 2 and never more cliche keys than cliche distractors; no 4-word phrase shared by >= 3
 *   keys; the lone-hedged / lone-absolute option is the key at most chance-plus-one; invented names unique across
 *   authors; no near-duplicate pair inside the batch. Prints every denominator.
 *
 * RULE SETS (--rules): pilot | b1 (default; adds QUAL ROLE LABEL NAMEPROP ABS LAW, batch ABSDIS) | b3 (b2 plus one check
 *   per cross-item pattern both graders of an area named in batch 2 (MAP-SCIENCE-B3.prereg.md): TRENDPAR trend options
 *   not parallel; ROLESTATE a variable procedure states a role; ECHO the key alone repeats a stem word; INTERP the
 *   interpolation key is the lone unprinted value or the lone mean of two options; BARTOP the asked bar/point is the
 *   chart's extreme or the lone option on a tick; CLAIMRAT a lone reasoned / intensified claim option; batch VARTPL
 *   templated variable passages, CLAIMBAL reasons/intensifiers on distractors but not keys, NAMEREUSE an invented
 *   name core in two items, ORDER numeric distractors kept in sorted order) | b2 (b1 plus, from the
 *   batch-1 REGISTER findings and the 2026-10-30 audit: INVENTED "invented" in student-facing text; LSHAPE the key is the
 *   only label of its shape; TICK a line point sits between x ticks; batch XDUP cross-author duplicate (words / key /
 *   form refuse, stem route printed as XDUP-REVIEW), KEYDUP same term/trend/claim key twice in one area, MISC a stock
 *   misconception family more than once per author). --break-test --rules b2 proves each is load-bearing;
 *   science-b2/validate-b2-rules.mjs proves each reproduces its known batch-1 finding.
 *
 * Exit codes: 2 unreadable input or empty population (never a number over nothing), 1 any item or batch failure,
 * 0 only when every item prints ok.
 */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  AREAS, PES, peBand, dciOfPe, DIFF, RIT, STIMULI, FORMATS, TREND_WORDS, CLICHES, ABSOLUTE, HEDGE, LETTERS, norm, numOf,
  QUALIFIER, RESULT_WORDS, NAME_PROPERTY, ABSOLUTE_B1, INVENTED_WORD, STOCK_MISCONCEPTIONS,
  TREND_STRIP, ROLE_STATEMENT, ECHO_STOP, RATIONALE, INTENSIFIER,
} from './sci-spec.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const words = s => String(s ?? '').trim().split(/\s+/).filter(Boolean)
const STOP = new Set('that this with from were which their there they them then than have been when what into each other these those about after before while where will would could should also only some more most such very much many does your used using shows show table figure graph students student following based data results result'.split(' '))
const toks = s => new Set(norm(s).split(' ').filter(w => w.length >= 4 && !STOP.has(w) && !/^\d/.test(w)))
const jacc = (a, b) => { let i = 0; for (const x of a) if (b.has(x)) i++; return { i, j: i / (a.size + b.size - i || 1) } }
const grams = (s, n = 4) => { const w = norm(s).split(' ').filter(Boolean), out = new Set(); for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(' ')); return out }

/* ---------------- graphic helpers ---------------- */
function graphicText(g) {
  if (!g) return ''
  return [g.caption, g.xLabel, g.yLabel, ...(g.rowLabels ?? []), ...(g.colLabels ?? []), ...((g.cells ?? []).flat()),
    ...((g.bars ?? []).map(b => b?.label))].filter(x => x !== undefined && x !== null).join(' \n ')
}
function shapeProblems(g) {
  const p = [], t = String(g?.type ?? '')
  if (typeof g?.caption !== 'string' || !g.caption.trim()) p.push('STIM graphic has no caption')
  if (t === 'table') {
    const R = g.rowLabels, C = g.colLabels, X = g.cells
    if (!Array.isArray(R) || !R.length || R.some(r => typeof r !== 'string' || !r.trim())) p.push('STIM table rowLabels must be non-empty strings')
    if (!Array.isArray(C) || !C.length || C.some(c => typeof c !== 'string' || !c.trim())) p.push('STIM table colLabels must be non-empty strings')
    if (!Array.isArray(X) || X.length !== (R?.length ?? -1)) p.push('STIM table cells must have one row per row label')
    else if (X.some(row => !Array.isArray(row) || row.length !== C?.length)) p.push('STIM table cells must have one cell per column label (ragged rows)')
    if ((R?.length ?? 0) > 8 || (C?.length ?? 0) > 4) p.push('STIM table larger than 8 rows x 4 columns (phone width)')
  } else if (t === 'bar') {
    const B = g.bars
    if (!Array.isArray(B) || B.length < 2 || B.length > 8) p.push('STIM bar needs 2-8 bars')
    else {
      if (B.some(b => typeof b?.value !== 'number' || !Number.isFinite(b.value) || b.value < 0)) p.push('STIM bar values must be non-negative numbers')
      if (new Set(B.map(b => b?.label)).size !== B.length || B.some(b => typeof b?.label !== 'string' || !b.label.trim())) p.push('STIM bar labels must be distinct non-empty strings')
    }
    if (!g.xLabel || !g.yLabel) p.push('STIM bar needs xLabel and yLabel')
  } else if (t === 'line') {
    const S = g.series
    if (!Array.isArray(S) || S.length !== 1) p.push('STIM line must have exactly ONE series (the renderer draws every series black with no legend)')
    const P = S?.[0]?.points
    if (!Array.isArray(P) || P.length < 3 || P.some(q => !Array.isArray(q) || q.length !== 2 || !q.every(Number.isFinite))) p.push('STIM line needs >= 3 numeric [x, y] points')
    else if (P.some((q, i) => i && q[0] <= P[i - 1][0])) p.push('STIM line x values must strictly increase')
    if (!g.xLabel || !g.yLabel) p.push('STIM line needs xLabel and yLabel')
  } else if (t === 'scatter') {
    const P = g.points
    if (!Array.isArray(P) || P.length < 5 || P.some(q => !Array.isArray(q) || q.length !== 2 || !q.every(Number.isFinite))) p.push('STIM scatter needs >= 5 numeric [x, y] points')
    if (!g.xLabel || !g.yLabel) p.push('STIM scatter needs xLabel and yLabel')
  } else p.push(`STIM graphic.type "${t}" is not allowed in the pilot (table, bar, line, scatter)`)
  return p
}
/** The y-axis range the renderer uses (axes always include 0). */
function yRange(g) {
  const ys = g.type === 'bar' ? g.bars.map(b => b.value) : g.type === 'line' ? g.series[0].points.map(q => q[1]) : g.points.map(q => q[1])
  return Math.max(...ys) - Math.min(...ys, 0)
}
function refValue(g, ref, passage) {
  if (ref && typeof ref === 'object' && !Array.isArray(ref) && 'quote' in ref) return norm(passage).includes(norm(ref.quote)) && norm(ref.quote).length >= 12 ? NaN : undefined
  if (!g) return undefined
  if (g.type === 'table') { const [r, c] = Array.isArray(ref) ? ref : []; const v = g.cells?.[r]?.[c]; return v === undefined ? undefined : numOf(v)?.v ?? NaN }
  if (g.type === 'bar') { const b = (g.bars ?? []).find(x => x.label === ref); return b ? b.value : undefined }
  const pts = g.type === 'line' ? g.series?.[0]?.points ?? [] : g.points ?? []
  const hit = Array.isArray(ref) && pts.find(q => q[0] === ref[0] && q[1] === ref[1])
  return hit ? ref[1] : undefined
}
function evalExpr(expr, vals) {
  if (!/^[v0-9+\-*/(). ]+$/.test(expr)) return { err: `expr "${expr}" has characters other than v0.. numbers + - * / ( )` }
  const src = expr.replace(/v(\d+)/g, (_, i) => { const v = vals[+i]; return v === undefined || !Number.isFinite(v) ? 'NaN' : `(${v})` })
  try { const r = Function(`"use strict"; return (${src})`)(); return Number.isFinite(r) ? { v: r } : { err: `expr "${expr}" does not evaluate to a number with these refs` } } catch (e) { return { err: `expr "${expr}": ${e.message}` } }
}
const trendFamilies = s => Object.entries(TREND_WORDS).filter(([, re]) => re.test(s)).map(([k]) => k).sort().join('+')
const WANT_TREND = { increase: 'increase', decrease: 'decrease', 'no-change': 'same', 'increase-then-level': 'increase+same' }

/* ---------------- exclusions ---------------- */
export function loadExclusions(path) {
  if (!existsSync(path)) throw new Error(`no exclusions file ${path} (run make-exclusions.mjs --live)`)
  const lines = readFileSync(path, 'utf8').split('\n').filter(l => l && !l.startsWith('#'))
  if (!lines.length) throw new Error(`${path} holds no stimuli`)
  return lines.map(l => ({ line: l, text: norm(l), toks: toks(l.split(' | ').slice(1).join(' ')) }))
}

/* ---------------- per item ---------------- */
/** opts.rules: 'b1' (default) adds the batch-1 rules; 'pilot' reproduces the pilot's checker exactly.
 *  opts.disabled: a Set of B1 check ids switched off, used ONLY by --break-test to prove each check is load-bearing. */
export const B1_CHECKS = ['QUAL', 'ROLE', 'LABEL', 'NAMEPROP', 'ABS', 'LAW', 'ABSDIS']
/** Batch-2 checks (MAP-SCIENCE-B2.prereg.md): findings 1-4 of the batch-1 REGISTER entry plus the 2026-10-30
 *  key-visible audit's unreadable kink (MSB1-L8-16). `--rules b2` = every b1 check + these. */
export const B2_CHECKS = ['INVENTED', 'LSHAPE', 'TICK', 'XDUP', 'KEYDUP', 'MISC']
/** Batch-3 checks (MAP-SCIENCE-B3.prereg.md): one per batch-2 rule-10 pattern. `--rules b3` = every b2 check + these. */
export const B3_CHECKS = ['TRENDPAR', 'ROLESTATE', 'ECHO', 'INTERP', 'BARTOP', 'CLAIMRAT', 'VARTPL', 'CLAIMBAL', 'NAMEREUSE', 'ORDER']
const RULESETS = ['pilot', 'b1', 'b2', 'b3']
/** What a trend option says once its direction words are removed (TRENDPAR). */
export const trendSkeleton = s => norm(String(s).replace(TREND_STRIP, ' ')).replace(/[.]/g, ' ').replace(/\s+/g, ' ').trim()
/** Crude stem for ECHO: lower-case, one suffix off. Two words echo when one stem starts the other (>= 4 letters). */
const stemOf = w => { const t = w.replace(/(ations?|ings?|ed|es|s|ic|al|ion)$/, ''); return t.length >= 4 ? t : w }
const echoToks = s => [...new Set(norm(s).split(' ').map(w => w.replace(/[^a-z-]/g, '')).flatMap(w => w.split('-')).filter(w => w.length >= 4 && !STOP.has(w) && !ECHO_STOP.has(w)))].map(stemOf).filter(w => w.length >= 4)
const echoes = (a, b) => a.startsWith(b) || b.startsWith(a)
/** ECHO: prompt words that the key shares and no distractor shares. */
export function stemEcho(prompt, key, others) {
  const K = echoToks(key), D = others.flatMap(echoToks)
  return echoToks(prompt).filter(t => K.some(k => echoes(k, t)) && !D.some(d => echoes(d, t)))
}
/** Every number a student can read printed in a graphic (table cells and row labels, bar values, plotted x and y). */
export function printedNumbers(g) {
  const out = [], push = v => { if (typeof v === 'number' && Number.isFinite(v)) out.push(v); else for (const m of String(v ?? '').matchAll(/-?\d+(?:\.\d+)?/g)) out.push(Number(m[0])) }
  if (!g) return out
  if (g.type === 'table') { for (const r of g.cells ?? []) for (const v of r) push(v); for (const r of g.rowLabels ?? []) push(r) }
  else if (g.type === 'bar') for (const b of g.bars ?? []) push(b.value)
  else for (const q of (g.type === 'line' ? g.series?.[0]?.points : g.points) ?? []) { push(q[0]); push(q[1]) }
  return out
}
/** Index of every option that is the mean of two OTHER options. */
export function meanOptions(vals) {
  return vals.map((v, i) => vals.some((a, j) => vals.some((b, k) => j < k && j !== i && k !== i && Math.abs(v - (a + b) / 2) < 1e-9))).flatMap((x, i) => (x ? [i] : []))
}
/** Tick labels the renderer prints on the value axis: bar 0, 1/4 .. max; line from min(0, lowest) to the highest. */
export function valueTicks(g) {
  const ys = g.type === 'bar' ? g.bars.map(b => b.value) : g.series[0].points.map(q => q[1])
  const lo = g.type === 'bar' ? 0 : Math.min(...ys, 0), hi = Math.max(...ys)
  return [0, 1, 2, 3, 4].map(i => lo + ((hi - lo) * i) / 4)
}
/** Shape of a condition label as a reader sees it: words -> W, all-caps codes -> C<n>, digit runs -> D<n>. */
export function labelShape(s) {
  return String(s).trim().split(/(\s+|-)/).filter(t => t && !/^\s+$/.test(t)).map(t => t === '-' ? '-' : /^\d+$/.test(t) ? `D${t.length}` : /^[A-Z]+$/.test(t) ? `C${t.length}` : /^[A-Z][a-z']+$/.test(t) ? 'W' : 'M').join(' ')
}
/** Line-graph x positions a student can place: on one of the renderer's 5 x ticks or exactly halfway between two. */
export function offTickX(g) {
  if (g?.type !== 'line' || !Array.isArray(g.series?.[0]?.points)) return []
  const xs = g.series[0].points.map(q => q[0]), lo = Math.min(...xs, 0), hi = Math.max(...xs), half = (hi - lo) / 8
  if (!(half > 0)) return []
  return xs.filter(x => { const r = (x - lo) / half; return Math.abs(r - Math.round(r)) > 1e-9 })
}
const fmtNum = v => (Number.isInteger(v) ? String(v) : String(+v.toFixed(2)))
const xdupToks = i => toks(`${i.passage ?? ''} ${i.prompt ?? ''} ${i.correct_answer ?? ''} ${(i.choices ?? []).join(' ')}`)
/** Cross-item duplicate test used by XDUP (inside a batch) and probe-live.mjs (against live and staged rows).
 *  Batch 1's named duplicates were mostly SEMANTIC (same PE and concept, or the same ask with the same key), so a
 *  token overlap alone caught 6 of 13 (validate-b2-rules.mjs). Routes:
 *    words   whole-item token overlap i >= 6 and Jaccard >= 0.22                      REFUSES
 *    key     same NGSS PE and >= 2 content words shared by the two KEYS              REFUSES
 *    form    same `ratio`/`difference` ask with the same numeric key (the "4 times"
 *            twins L7-02/L8-08, E6-08/E8-16)                                          REFUSES
 *    stem    same NGSS PE and >= 4 content words shared by the two stems             REVIEW (printed, never a pass)
 *  On batch 1 the three refusing routes catch 10 of the 13 named pairs and fire on 17 other pairs; the stem route
 *  catches the last 3 (the volcano-forecast triple) but also fires on ~70 unnamed same-PE pairs, too coarse to refuse.
 *  Every REVIEW pair is adjudicated by the coordinator in writing before packets (MAP-SCIENCE-B2.prereg.md). */
export const XDUP_MIN = { i: 6, j: 0.22 }
export function xdupScore(a, b) { return jacc(xdupToks(a), xdupToks(b)) }
const stemToks = i => toks(`${i.passage ?? ''} ${i.prompt ?? ''}`)
/** Returns { refuse: bool, why } or null. */
export function xdupReason(a, b) {
  const w = xdupScore(a, b)
  if (w.i >= XDUP_MIN.i && w.j >= XDUP_MIN.j) return { refuse: true, why: `words ${w.i}, J=${w.j.toFixed(2)}` }
  const na = numOf(a.correct_answer), nb = numOf(b.correct_answer)
  if (a.ask && a.ask === b.ask && ['ratio', 'difference'].includes(a.ask) && na && nb && na.v === nb.v) return { refuse: true, why: `form: both ${a.ask} items key ${na.v}` }
  if (a.ngss_pe && a.ngss_pe === b.ngss_pe) {
    const k = jacc(toks(a.correct_answer), toks(b.correct_answer)).i, st = jacc(stemToks(a), stemToks(b)).i
    if (k >= 2) return { refuse: true, why: `key: same PE ${a.ngss_pe}, ${k} key words shared` }
    if (st >= 4) return { refuse: false, why: `stem: same PE ${a.ngss_pe}, ${st} stem words shared` }
  }
  return null
}
export function checkItem(it, slot, ex = [], opts = {}) {
  const p = [], add = m => p.push(m)
  const R = opts.rules ?? 'b1', b1 = R === 'b1' || R === 'b2' || R === 'b3', dis = opts.disabled ?? new Set()
  const on = id => b1 && !dis.has(id), on2 = id => (R === 'b2' || R === 'b3') && !dis.has(id)
  if (!slot) return [`SLOT ${it?.id}: not a slot in slots.json`]
  const want = { map_area: slot.area, grade_target: slot.g, tier: slot.tier, difficulty: DIFF[slot.tier], rit_band_target: RIT[slot.g][slot.tier], dci: slot.dci, kind: slot.kind, stimulus: slot.stimulus, format: slot.format, ask: slot.ask, invented: slot.invent }
  for (const [k, v] of Object.entries(want)) if (it[k] !== v) add(`SLOT ${k} is ${JSON.stringify(it[k])}, slot says ${JSON.stringify(v)}`)
  if (!PES[peBand(slot.g)].includes(it.ngss_pe)) add(`SLOT ngss_pe "${it.ngss_pe}" is not an NGSS PE of the ${slot.g === 5 ? '3-5' : 'MS'} band`)
  else if (dciOfPe(it.ngss_pe) !== slot.dci) add(`SLOT ngss_pe ${it.ngss_pe} is ${dciOfPe(it.ngss_pe)}, slot DCI ${slot.dci}`)

  const ch = it.choices, key = it.correct_answer
  if (!String(it.prompt ?? '').trim()) add('SHAPE empty prompt')
  if (words(it.prompt).length > 70) add(`SHAPE prompt ${words(it.prompt).length} words (max 70)`)
  if (!Array.isArray(ch) || ch.length !== 4 || ch.some(c => typeof c !== 'string' || !c.trim())) { add('SHAPE needs exactly 4 non-empty string choices'); return p }
  if (new Set(ch.map(norm)).size !== 4) add('SHAPE duplicate options')
  const ki = ch.indexOf(key)
  if (ki < 0) { add('SHAPE key is not among the choices verbatim'); return p }
  if (LETTERS[ki] !== slot.key) add(`SHAPE key is at ${LETTERS[ki]}, slot letter ${slot.key}`)
  const others = ch.filter((_, i) => i !== ki)
  const dr = it.distractor_rationales
  if (!Array.isArray(dr) || dr.length !== 3 || new Set(dr.map(d => d?.choice)).size !== 3 || dr.some(d => !others.includes(d?.choice))) add('SHAPE distractor_rationales must name each of the three non-key choices once')
  else {
    if (dr.some(d => words(d.fault).length < 4)) add('SHAPE every distractor fault needs >= 4 words')
    if (slot.kind === 'model' && dr.some(d => !/misconception/i.test(d.fault))) add('SHAPE model item: every distractor fault must name its misconception ("misconception: ...")')
  }
  if (!String(it.explanation ?? '').trim()) add('SHAPE empty explanation')
  if (words(it.real_world_check).length < 6) add('SHAPE real_world_check missing or under 6 words')

  // RANK
  if (slot.format === 'values') {
    const ns = ch.map(numOf)
    if (ns.some(n => !n)) add('RANK values options must each be one number with an optional unit')
    else {
      if (new Set(ns.map(n => n.unit)).size !== 1) add(`RANK values options mix units: ${[...new Set(ns.map(n => n.unit))].join(' / ')}`)
      if (new Set(ns.map(n => n.places)).size !== 1) add('RANK values options mix decimal places')
      if (new Set(ns.map(n => n.v)).size !== 4) add('RANK values options repeat a value')
      const r = 1 + ns.filter(n => n.v < ns[ki].v).length
      if (r !== slot.rank) add(`RANK key is value rank ${r} (1 = smallest), slot rank ${slot.rank}`)
      for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) for (let c = 0; c < 4; c++) {
        if (a >= b || c === a || c === b) continue
        const x = ns[a].v, y = ns[b].v, z = ns[c].v, eq = (u, w) => Math.abs(u - w) < 1e-9
        if (eq(x + y, z) || eq(Math.abs(x - y), z)) add(`LEAK options ${ch[a]} and ${ch[b]} sum or difference to ${ch[c]} (an option reconstructs the data)`)
      }
    }
  } else {
    const L = ch.map(c => c.length), sorted = [...L].sort((a, b) => a - b)
    if (sorted.some((v, i) => i && v - sorted[i - 1] < 2)) add(`RANK option lengths ${L.join('/')} must all differ by >= 2 characters`)
    const r = 1 + L.filter(v => v < L[ki]).length
    if (r !== slot.rank) add(`RANK key is length rank ${r} (1 = shortest), slot rank ${slot.rank}`)
  }

  // STIM
  const S = STIMULI[slot.stimulus], g = it.graphic ?? null, passage = it.passage ?? null
  if (S.graphic && (!g || g.type !== S.graphic)) add(`STIM stimulus ${slot.stimulus} needs a ${S.graphic} graphic, got ${g?.type ?? 'none'}`)
  if (!S.graphic && g) add(`STIM stimulus ${slot.stimulus} carries no graphic`)
  if (g && S.graphic) for (const m of shapeProblems(g)) add(m)
  const pw = words(passage).length, maxProc = slot.g <= 6 ? 130 : 170
  if (S.passage === 'required' && (pw < 60 || pw > maxProc)) add(`STIM procedure passage ${pw} words (need 60-${maxProc} at grade ${slot.g})`)
  if (S.passage === 'none' && pw) add('STIM scenario items put the situation in the prompt; passage must be null')
  if (S.passage === 'optional' && pw > 80) add(`STIM data passage ${pw} words (max 80)`)
  const stimText = `${passage ?? ''} \n ${graphicText(g)}`

  // FORMAT
  if (slot.format === 'conditions') for (const c of ch) if (!norm(stimText).includes(norm(c))) add(`FORMAT conditions option "${c}" does not appear in the stimulus`)
  if (slot.format === 'variable') for (const c of ch) if (!norm(passage).includes(norm(c))) add(`FORMAT variable option "${c}" is not named in the procedure`)
  if (slot.format === 'term') for (const c of ch) if (words(c).length > 5) add(`FORMAT term option "${c}" over 5 words`)
  if (slot.format === 'claim') for (const c of ch) if (words(c).length < 6) add(`FORMAT claim option "${c}" under 6 words`)
  if (slot.format === 'trend') {
    const fams = ch.map(trendFamilies)
    if (fams.some(f => !f)) add('FORMAT every trend option needs a direction word (increases / decreases / stays the same ...)')
    if (fams[ki] !== WANT_TREND[slot.ask]) add(`FORMAT key's direction is "${fams[ki] || 'none'}", slot ask ${slot.ask} wants "${WANT_TREND[slot.ask]}"`)
    if (new Set(fams).size < 3) add('FORMAT trend options must cover at least 3 different directions')
  }

  // READ (values off a drawn axis)
  if (slot.format === 'values' && g && ['bar', 'line', 'scatter'].includes(g.type) && !shapeProblems(g).length) {
    const ns = ch.map(numOf)
    if (ns.every(Boolean)) {
      const R = yRange(g), gaps = []
      for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) gaps.push(Math.abs(ns[a].v - ns[b].v))
      if (Math.min(...gaps) < R / 8 - 1e-9) add(`READ options ${Math.min(...gaps)} apart on an axis of range ${R}; need >= ${(R / 8).toFixed(2)} (the student reads 5 ticks, no labels)`)
    }
  }

  // EVID
  if (slot.invent) {
    if (!Array.isArray(it.names_used) || !it.names_used.length || it.names_used.some(n => typeof n !== 'string' || !n.trim())) add('EVID invented item must list names_used')
    const ev = it.key_evidence
    if (!ev || !Array.isArray(ev.refs) || !ev.refs.length) add('EVID invented item needs key_evidence.refs')
    else {
      const vals = ev.refs.map(r => refValue(g, r, passage))
      ev.refs.forEach((r, i) => { if (vals[i] === undefined) add(`EVID ref ${JSON.stringify(r)} does not exist in the ${g ? g.type : 'passage'}`) })
      if (slot.format === 'values' && vals.every(v => v !== undefined)) {
        const kn = numOf(key)
        if (typeof ev.expr !== 'string') add('EVID values item needs key_evidence.expr')
        else if (kn) {
          const r = evalExpr(ev.expr, vals)
          if (r.err) add(`EVID ${r.err}`)
          else if (r.v.toFixed(kn.places) !== kn.v.toFixed(kn.places)) add(`EVID expr ${ev.expr} = ${r.v.toFixed(kn.places)}, key is ${kn.v.toFixed(kn.places)}`)
        }
      }
    }
  }

  /* ---------- B1 rules (MAP-SCIENCE-B1.prereg.md; each from the pilot's graders g3/g4) ---------- */
  // QUAL (rule b): trend options carry a qualifier on all four or on none. The pilot's lone qualified option was the key
  // on L-10 "steadily", P-04 "with every trial", P-11 "overall", E-02 "close to".
  if (on('QUAL') && slot.format === 'trend') {
    const q = ch.filter(c => QUALIFIER.test(c)).length
    if (q !== 0 && q !== 4) add(`QUAL ${q} of 4 trend options carry a qualifier (steadily / overall / about / each year ...); all four or none`)
  }
  // ROLE (rule a): variable items tag every option setting|result; the tags must agree with the wording; an outcome ask
  // needs >= 2 result-worded options (E-12: the key was the only one); a setting ask (independent / controlled) takes
  // none (L-06, P-07: "an outcome can never be the controlled variable" killed them free).
  if (on('ROLE') && slot.format === 'variable') {
    const R = it.option_roles
    if (!Array.isArray(R) || R.length !== 4 || R.some(r => r !== 'setting' && r !== 'result')) add('ROLE variable item needs option_roles: four of "setting" | "result", in choice order')
    else {
      ch.forEach((c, i) => { if (RESULT_WORDS.test(c) && R[i] !== 'result') add(`ROLE "${c}" is worded as a measured result but tagged ${R[i]}`) })
      const nRes = R.filter(r => r === 'result').length
      if (slot.ask === 'dependent' && nRes < 2) add(`ROLE outcome ask with ${nRes} result-worded option(s): need >= 2, or the key is the lone measured result`)
      if (slot.ask !== 'dependent' && nRes > 0) add(`ROLE ${slot.ask} ask with ${nRes} result-worded option(s): an outcome can never be the ${slot.ask} variable, so it dies free; use settings only`)
      if (slot.ask === 'dependent' && R[ki] !== 'result') add('ROLE outcome ask but the key is tagged setting')
    }
  }
  // LABEL (rule a): a condition label is an opaque name. No commas or slashes (E-04 "Marlowe, 30°, close"), no number
  // with a unit, no lowercase descriptive word (L-03 "R-17, watered"), no token that repeats a setting printed in the
  // table, and it must carry a code token (a digit, or a 1-4 letter capital code) or be one of names_used.
  if (on('LABEL') && slot.format === 'conditions') {
    const names = new Set((it.names_used ?? []).map(norm))
    const cellWords = new Set()
    if (g?.type === 'table') {
      for (const row of g.cells ?? []) for (const v of row) if (typeof v === 'string') for (const w of norm(v).split(' ')) if (w.length >= 3) cellWords.add(w)
      for (const c of g.colLabels ?? []) for (const w of norm(c.replace(/\(.*?\)/g, '')).split(' ')) if (w.length >= 3) cellWords.add(w)
    }
    for (const c of ch) {
      const t = c.trim().split(/\s+/)
      if (/[,;/]/.test(c)) add(`LABEL "${c}" lists several settings; use an opaque label and put the settings in the stimulus`)
      else if (/\d\s*(°|%|[a-zA-Z]{1,3}\b)/.test(c) && !/^[A-Z]{0,4}-?\d+[A-Z]?$/.test(t[t.length - 1])) add(`LABEL "${c}" carries a number with a unit`)
      else if (t.some(w => /^[a-z]{3,}$/.test(w))) add(`LABEL "${c}" has a lowercase descriptive word; labels name, they do not describe`)
      const rep = t.map(w => w.toLowerCase().replace(/[^a-z]/g, '')).filter(w => w.length >= 3 && cellWords.has(w))
      if (rep.length) add(`LABEL "${c}" repeats the setting "${rep[0]}" printed in the table`)
      const code = t.some(w => /\d/.test(w) || /^[A-Z]{1,4}(-[A-Z0-9]+)?$/.test(w))
      if (!code && !names.has(norm(c))) add(`LABEL "${c}" has no code token and is not one of names_used`)
    }
  }
  // NAMEPROP (E-11): invented names and condition labels never carry a property word (low, steep, bluff, wet ...).
  if (on('NAMEPROP')) {
    const pool = [...(it.names_used ?? []), ...(slot.format === 'conditions' ? ch : [])]
    for (const n of pool) { const m = String(n).match(NAME_PROPERTY); if (m) add(`NAMEPROP "${n}" carries the property word "${m[1]}"; use a neutral invented name`) }
  }
  // ABS (rule c): in claim items no option is the lone absolute or the lone absolute-free one.
  if (on('ABS') && slot.format === 'claim') {
    const a = ch.filter(c => ABSOLUTE_B1.test(c)).length
    if (a === 1 || a === 3) add(`ABS ${a} of 4 claim options carry an absolute (always / never / only / all / any ...): that makes a lone ${a === 1 ? 'absolute' : 'absolute-free'} option; use 0, 2 or 4`)
  }
  // LAW (the dropped P-04 / P-11): an invented trend or values item states why the standard does not already give the
  // answer. Presence and length only: the graders judge it (no_source_needed).
  if (on('LAW') && slot.invent && (slot.format === 'trend' || slot.format === 'values') && words(it.prior_free).length < 8) add('LAW invented trend/values item needs prior_free (>= 8 words): why a student who knows the standard still needs these data')

  /* ---------- B2 rules (MAP-SCIENCE-B2.prereg.md) ---------- */
  // INVENTED (b1 finding 4): "invented" reached three student-facing passages (E6-07, E6-08, E6-10).
  if (on2('INVENTED')) {
    const face = [passage, it.prompt, ...ch, graphicText(g)].filter(Boolean).join(' \n ')
    const m = face.match(INVENTED_WORD); if (m) add(`INVENTED student-facing text says "${m[0]}"; the system is fictional to the author, never to the student`)
  }
  // LSHAPE (b1 finding 1): in E6 the key was the lone three-letter code among shorter ones (B1-A2 item 2).
  if (on2('LSHAPE') && slot.format === 'conditions') {
    const sh = ch.map(labelShape), c = {}; for (const x of sh) c[x] = (c[x] ?? 0) + 1
    if (c[sh[ki]] === 1) add(`LSHAPE the key "${key}" is the only label shaped "${sh[ki]}" (${sh.join(' | ')}); give the labels one shared shape (for example four invented names "Site Orla", "Site Penwick" ...), never a padded code ladder`)
  }
  // TICK (audit 2026-10-30, MSB1-L8-16): a line point the student must place sits between the renderer's x ticks.
  if (on2('TICK') && g?.type === 'line' && !shapeProblems(g).length) {
    const off = offTickX(g)
    if (off.length) add(`TICK line points at x = ${off.join(', ')} fall neither on an x tick nor halfway between two (ticks every ${((Math.max(...g.series[0].points.map(q => q[0])) - Math.min(...g.series[0].points.map(q => q[0]), 0)) / 4)}); choose x values so ticks land on the data`)
  }

  /* ---------- B3 rules (MAP-SCIENCE-B3.prereg.md; each from a batch-2 rule-10 pattern) ---------- */
  const on3 = id => R === 'b3' && !dis.has(id)
  // TRENDPAR (Life): the four trend options say the same thing apart from the direction.
  if (on3('TRENDPAR') && slot.format === 'trend') {
    const sk = ch.map(trendSkeleton)
    if (new Set(sk).size > 1) add(`TRENDPAR trend options are not parallel: with the direction words removed they read ${sk.map(x => `"${x}"`).join(' | ')}; write all four in one frame (L5-14's key alone ended "as the water got deeper")`)
  }
  // ROLESTATE (Life, Physical, Earth): the procedure must not state any quantity's role.
  if (on3('ROLESTATE') && slot.format === 'variable') {
    const m = String(passage ?? '').match(ROLE_STATEMENT)
    if (m) add(`ROLESTATE the procedure states a role ("${m[0]}"); describe what was done and let the student infer which quantity was changed, measured or held (batch 2's "the X was the same / was the variable they changed" made the key a string lookup)`)
  }
  // ECHO (Life): a word in the stem that only the key repeats.
  if (on3('ECHO') && (slot.format === 'term' || slot.format === 'claim')) {
    const e = stemEcho(it.prompt, key, others)
    if (e.length) add(`ECHO the key alone repeats the stem word(s) ${e.map(x => `"${x}"`).join(', ')} (L6-17 "breed" -> "breeding"); share the word with distractors or drop it from the key`)
  }
  // INTERP (Life, Physical): interpolation casts.
  if (on3('INTERP') && slot.format === 'values' && slot.ask === 'interpolate') {
    const ns = ch.map(numOf)
    if (ns.every(Boolean)) {
      const pr = printedNumbers(g), isP = v => pr.some(x => Math.abs(x - v) < 1e-9), vals = ns.map(n => n.v)
      if (!isP(vals[ki]) && vals.every((v, i) => i === ki || isP(v))) add(`INTERP the key ${key} is the only option not printed in the figure (L7-06 / L8-01); make at least one distractor an unprinted value`)
      const mo = meanOptions(vals)
      if (mo.length === 1 && mo[0] === ki) add(`INTERP the key ${key} is the only option that is the mean of two other options (P8-01); break the ladder`)
    }
  }
  // BARTOP (Physical): a value read off a bar or line is not the chart's extreme and not the lone option on a tick.
  if (on3('BARTOP') && slot.format === 'values' && slot.ask === 'read' && (g?.type === 'bar' || g?.type === 'line') && !shapeProblems(g).length) {
    const kn = numOf(key), ys = g.type === 'bar' ? g.bars.map(b => b.value) : g.series[0].points.map(q => q[1])
    if (kn) {
      const eq = (a, b) => Math.abs(a - b) < 1e-9
      if (eq(kn.v, Math.max(...ys))) add(`BARTOP the asked ${g.type === 'bar' ? 'bar' : 'point'} is the tallest in the chart and sits on the top tick (P5-07 / P6-14 / P7-01)`)
      else if (eq(kn.v, Math.min(...ys))) add(`BARTOP the asked ${g.type === 'bar' ? 'bar' : 'point'} is the shortest in the chart (the other extreme of P5-07's tell)`)
      const T = valueTicks(g), onT = v => T.some(t => eq(t, v)), ns = ch.map(numOf)
      if (ns.every(Boolean) && onT(kn.v) && ns.every((n, i) => i === ki || !onT(n.v))) add(`BARTOP the key ${key} is the only option on a tick label (${T.map(fmtNum).join(', ')})`)
    }
  }
  // CLAIMRAT (Earth): a stated reason or a degree word on one option, or on all but one.
  if (on3('CLAIMRAT') && slot.format === 'claim') {
    const r = ch.filter(c => RATIONALE.test(c)).length, n = ch.filter(c => INTENSIFIER.test(c)).length
    if (r === 1 || r === 3) add(`CLAIMRAT ${r} of 4 claim options give a reason (because / since / , so ...): that makes a lone ${r === 1 ? 'reasoned' : 'unreasoned'} option; use 0, 2 or 4 (E5-06, E5-20)`)
    if (n === 1 || n === 3) add(`CLAIMRAT ${n} of 4 claim options carry a degree word (much / exactly / very / no effect ...): use 0, 2 or 4 (E5-06 "much hotter", E8-14 "exactly the same")`)
  }

  // LEAK
  if (g?.caption) {
    const kn = numOf(key)
    if (kn && new RegExp(`(^|[^\\d.])${String(kn.v).replace('.', '\\.')}([^\\d]|$)`).test(g.caption)) add(`LEAK caption contains the key's number ${kn.v}`)
    if (!kn && norm(key).length >= 6 && norm(g.caption).includes(norm(key))) add('LEAK caption contains the key wording')
  }
  if (/\b(option|choice|answer)\s*\(?[A-D]\)?(?![a-z])|\b(first|second|third|fourth|last) (option|choice|answer)\b|^\(?[A-D]\)\s/i.test(it.explanation ?? '')) add('LEAK explanation names an option by letter or position')
  if (/\blines?\s+\d+/i.test(`${it.prompt} ${passage ?? ''}`)) add('LEAK cites a line number')
  if (/\b(figure|table|graph)\s+\d/i.test(it.prompt) && !g) add('LEAK stem cites a figure or table but the item has no graphic')
  if (passage && slot.format !== 'conditions' && slot.format !== 'variable') {
    const pg = grams(passage), kHit = [...grams(key)].some(x => pg.has(x)), oHit = others.some(o => [...grams(o)].some(x => pg.has(x)))
    if (kHit && !oHit) add('LEAK the key copies a 4-word span of the passage and no distractor does (lexical anchor)')
  }

  // DUP
  const mine = toks(`${passage ?? ''} ${it.prompt ?? ''}`)
  for (const e of ex) {
    const { i, j } = jacc(mine, e.toks)
    if (i >= 8 && j >= 0.35) { add(`DUP near-duplicate (${i} shared words, J=${j.toFixed(2)}) of: ${e.line.slice(0, 90)}`); break }
  }
  for (const n of it.names_used ?? []) if (norm(n).length >= 4 && ex.some(e => e.text.includes(norm(n)))) add(`DUP invented name "${n}" already appears in EXCLUSIONS-science.txt`)
  return p
}

/* ---------------- batch ---------------- */
export function checkBatch(items, SLOT, opts = {}) {
  const p = [], add = m => p.push(m), info = []
  const R = opts.rules ?? 'b1', b1 = R === 'b1' || R === 'b2' || R === 'b3', dis = opts.disabled ?? new Set()
  const on = id => b1 && !dis.has(id), on2 = id => (R === 'b2' || R === 'b3') && !dis.has(id)
  const ids = items.map(i => i.id)
  if (new Set(ids).size !== ids.length) add('BATCH duplicate item ids')
  for (const id of Object.keys(SLOT)) if (!ids.includes(id)) add(`BATCH slot ${id} neither written nor marked empty`)
  const live = items.filter(i => !i.empty && SLOT[i.id])
  if (!live.length) return { p: ['BATCH zero written items: nothing to measure'], info, fatal: true }
  info.push(`written ${live.length} of ${Object.keys(SLOT).length} slots, ${items.filter(i => i.empty).length} empty`)
  const kc = {}; for (const i of live) { const l = LETTERS[i.choices.indexOf(i.correct_answer)]; kc[l] = (kc[l] ?? 0) + 1 }
  info.push(`key letters ${JSON.stringify(kc)} (n=${live.length}; flat by slot construction)`)
  // cliches
  const isC = s => CLICHES.some(re => re.test(s))
  const cKeys = live.filter(i => isC(i.correct_answer)).length
  const cDis = live.reduce((n, i) => n + i.choices.filter(c => c !== i.correct_answer && isC(c)).length, 0)
  info.push(`cliche keys ${cKeys}, cliche distractors ${cDis} (n=${live.length} items)`)
  if (cKeys > 2) add(`BATCH ${cKeys} items key a science cliche (max 2)`)
  if (cKeys > cDis) add(`BATCH cliches appear as keys ${cKeys}x but as distractors only ${cDis}x (a solver's rule)`)
  // shared key prose
  const gc = {}
  for (const i of live) for (const g of grams(i.correct_answer)) (gc[g] ??= new Set()).add(i.id)
  for (const [g, s] of Object.entries(gc)) if (s.size >= 3) add(`BATCH ${s.size} keys share the phrase "${g}" (${[...s].join(', ')})`)
  // lone hedge / lone absolute
  for (const [name, re] of [['absolute-free (hedged)', ABSOLUTE], ['hedge-free (absolute)', HEDGE]]) {
    const pool = live.filter(i => i.choices.filter(c => !re.test(c)).length === 1 && i.choices.some(c => re.test(c)))
    const hits = pool.filter(i => !re.test(i.correct_answer)).length
    info.push(`lone ${name} option is the key: ${hits} of ${pool.length} eligible (chance ${(pool.length / 4).toFixed(1)})`)
    if (pool.length >= 4 && hits > Math.ceil(pool.length / 4) + 1) add(`BATCH the lone ${name} option is the key ${hits}/${pool.length} (a solver's rule; max chance+1)`)
  }
  // invented names unique across authors
  const owner = {}
  for (const i of live) for (const n of i.names_used ?? []) {
    const k = norm(n), a = i.id.split('-')[1]
    if (owner[k] && owner[k] !== a) add(`BATCH invented name "${n}" used by authors ${owner[k]} and ${a}`)
    owner[k] = owner[k] ?? a
  }
  // near-dup pairs
  const T = live.map(i => toks(`${i.passage ?? ''} ${i.prompt ?? ''}`))
  for (let a = 0; a < live.length; a++) for (let b = a + 1; b < live.length; b++) {
    const { i, j } = jacc(T[a], T[b]); if (i >= 8 && j >= 0.35) add(`BATCH ${live[a].id} and ${live[b].id} near-duplicate (J=${j.toFixed(2)})`)
  }
  // ABSDIS (B1 rule c, batch): absolutes must not sit only on distractors across the claim items.
  if (on('ABSDIS')) {
    const claims = live.filter(i => SLOT[i.id]?.format === 'claim')
    const onKey = claims.filter(i => ABSOLUTE_B1.test(i.correct_answer)).length
    const onDis = claims.reduce((n, i) => n + i.choices.filter(c => c !== i.correct_answer && ABSOLUTE_B1.test(c)).length, 0)
    info.push(`claim items ${claims.length}: absolutes on keys ${onKey}, on distractors ${onDis}`)
    if (onDis >= 3 && onKey === 0) add(`BATCH absolutes appear on ${onDis} claim distractors and on no claim key: "reject the absolute" solves them`)
  }
  const area = i => SLOT[i.id]?.area, author = i => i.id.split('-')[1]
  // XDUP (b1 finding 2): cross-grade duplicates were invisible to every per-author check (12 pairs dropped, B1-A2).
  if (on2('XDUP')) {
    let n = 0; const review = []
    for (let a = 0; a < live.length; a++) for (let b = a + 1; b < live.length; b++) {
      if (area(live[a]) !== area(live[b]) || author(live[a]) === author(live[b])) continue
      n++
      const r = xdupReason(live[a], live[b])
      if (r?.refuse) add(`BATCH XDUP ${live[a].id} and ${live[b].id} share a topic across authors (${r.why})`)
      else if (r) review.push(`${live[a].id} ~ ${live[b].id} (${r.why})`)
    }
    info.push(`XDUP cross-author same-area pairs compared: ${n}; REVIEW (stem route, adjudicate in writing): ${review.length}`)
    for (const x of review) info.push(`XDUP-REVIEW ${x}`)
  }
  // KEYDUP: two items of one area keying the same term or the same trend wording.
  if (on2('KEYDUP')) {
    const seen = {}
    for (const i of live) {
      const f = SLOT[i.id]?.format; if (f !== 'term' && f !== 'trend' && f !== 'claim') continue
      const k = `${area(i)}|${norm(i.correct_answer)}`
      if (seen[k]) add(`BATCH KEYDUP ${seen[k]} and ${i.id} key the same ${f} "${i.correct_answer}"`)
      else seen[k] = i.id
    }
  }
  // MISC (b1 finding 3): stock misconception families at most once per author.
  if (on2('MISC')) {
    const per = {}
    for (const i of live) for (const c of i.choices) if (c !== i.correct_answer) for (const [fam, re] of Object.entries(STOCK_MISCONCEPTIONS)) if (re.test(c)) (per[`${author(i)}|${fam}`] ??= []).push(i.id)
    for (const [k, ids] of Object.entries(per)) if (ids.length > 1) add(`BATCH MISC author ${k.split('|')[0]} uses the stock "${k.split('|')[1]}" distractor ${ids.length} times (${ids.join(', ')}); max once per author`)
    info.push(`MISC stock-misconception distractors: ${Object.values(per).reduce((n, x) => n + x.length, 0)}`)
  }
  /* ---------- B3 batch rules ---------- */
  const on3 = id => R === 'b3' && !dis.has(id)
  const areas = [...new Set(live.map(area))]
  // VARTPL (Physical P5-03 / P8-03, Earth E5-12 / E8-17): two variable passages of one area built on one template.
  if (on3('VARTPL')) {
    let n = 0
    for (const ar of areas) {
      const V = live.filter(i => area(i) === ar && SLOT[i.id]?.format === 'variable')
      for (let a = 0; a < V.length; a++) for (let b = a + 1; b < V.length; b++) {
        n++
        const ra = rolePhrases(V[a].passage), shared = [...rolePhrases(V[b].passage)].filter(x => ra.has(x))
        if (shared.length >= VARTPL_MIN) add(`BATCH VARTPL ${V[a].id} and ${V[b].id} state roles with the same ${shared.length} phrases ("${shared.join('", "')}"): one passage template`)
      }
    }
    info.push(`VARTPL variable-passage pairs compared: ${n} (refuse at >= ${VARTPL_MIN} shared role-statement phrases)`)
  }
  // CLAIMBAL (Earth): across one area's claim items, reasons and degree words sit on keys as often as on distractors.
  if (on3('CLAIMBAL')) {
    for (const ar of areas) {
      const C = live.filter(i => area(i) === ar && SLOT[i.id]?.format === 'claim')
      if (!C.length) continue
      const either = { test: c => RATIONALE.test(c) || INTENSIFIER.test(c) }
      for (const [nm, re] of [['reason', RATIONALE], ['degree word', INTENSIFIER], ['reason or degree word', either]]) {
        const k = C.filter(i => re.test(i.correct_answer)).length, d = C.reduce((s, i) => s + i.choices.filter(c => c !== i.correct_answer && re.test(c)).length, 0)
        const sh = k + d ? k / (k + d) : null
        info.push(`CLAIMBAL ${ar} ${nm}: on keys ${k}/${C.length}, on distractors ${d}/${3 * C.length}; key share of marked options ${sh === null ? 'n/a (none marked)' : `${(100 * sh).toFixed(0)}% (no-tell 25%)`}`)
        if (k + d >= CLAIMBAL_MIN && (sh < CLAIMBAL_BAND[0] || sh > CLAIMBAL_BAND[1])) add(`BATCH CLAIMBAL ${ar}: of ${k + d} claim options carrying a ${nm}, ${k} are keys (${(100 * sh).toFixed(0)}%; band ${100 * CLAIMBAL_BAND[0]}-${100 * CLAIMBAL_BAND[1]}%, no-tell 25%): "${sh < 0.25 ? 'pick the plain one' : 'pick the marked one'}" (Earth b2)`)
      }
    }
  }
  // NAMEREUSE (Earth E8 "Sy" x4): an invented name core in more than one item.
  if (on3('NAMEREUSE')) {
    const where = {}
    for (const i of live) for (const n of new Set((i.names_used ?? []).map(x => String(x).trim().split(/\s+/).pop()))) {
      if (!/[A-Z0-9]/.test(n) || n.length < 2) continue
      ;(where[n.toLowerCase()] ??= new Set()).add(i.id)
    }
    for (const [n, s] of Object.entries(where)) if (s.size > 1) add(`BATCH NAMEREUSE invented name "${n}" appears in ${s.size} items (${[...s].join(', ')}); one name, one item`)
  }
  // ORDER (Earth g1, all areas): numeric distractors left in sorted order with the key dropped in.
  if (on3('ORDER')) {
    for (const ar of areas) {
      const N = live.filter(i => area(i) === ar && SLOT[i.id]?.format === 'values' && i.choices.every(c => numOf(c)))
      if (!N.length) continue
      const dv = i => i.choices.filter(c => c !== i.correct_answer).map(c => numOf(c).v)
      const asc = N.filter(i => { const v = dv(i); return v[0] < v[1] && v[1] < v[2] }).length, desc = N.filter(i => { const v = dv(i); return v[0] > v[1] && v[1] > v[2] }).length
      const cap = Math.ceil(N.length / 6) + 1
      info.push(`ORDER ${ar}: numeric items ${N.length}, distractors ascending ${asc}, descending ${desc} (chance ${(N.length / 6).toFixed(1)} each; cap ${cap})`)
      if (asc > cap) add(`BATCH ORDER ${ar}: ${asc} of ${N.length} numeric items list their distractors in ascending order (cap ${cap}); the key is the value out of order`)
      if (desc > cap) add(`BATCH ORDER ${ar}: ${desc} of ${N.length} numeric items list their distractors in descending order (cap ${cap})`)
    }
  }
  return { p, info, fatal: false }
}
/** VARTPL measures the template batch 2's graders named: the same role-STATEMENT phrases ("for every", "not the same",
 *  "changed") reused across an area's variable passages. Literal four-word overlap and function-word skeleton overlap
 *  were measured on batch 2 first and do not separate the named pairs (P5-03~P8-03 2 spans, P6-03~P8-03 6), so they are
 *  not used. Under b3 ROLESTATE refuses any role statement, so VARTPL is a second guard that fires only if ROLESTATE
 *  is switched off or its list is narrowed. */
export const VARTPL_MIN = 2
const rolePhrases = s => new Set([...String(s ?? '').matchAll(new RegExp(ROLE_STATEMENT.source, 'gi'))].map(m => m[0].toLowerCase()))
/** CLAIMBAL: with no tell, a marked option (reason / degree word) is the key 1 time in 4. Refuse outside 15-40% once
 *  at least 4 options in an area's claims are marked. Fixed before batch 3; batch 2 Earth reads 0 of 9 degree words. */
export const CLAIMBAL_BAND = [0.15, 0.4]
export const CLAIMBAL_MIN = 4

/* ---------------- CLI ---------------- */
function slotIndex(path) {
  const S = JSON.parse(readFileSync(path, 'utf8'))
  const idx = {}
  for (const [code, v] of Object.entries(S)) if (!code.startsWith('_')) for (const r of v.rows) idx[r.id] = { ...r, area: v.area, author: code }
  if (!Object.keys(idx).length) throw new Error(`${path} has no slots`)
  return idx
}

/** One pass over a fixture suite. Returns { fail, lines }. Pure: no exit, so --break-test can call it repeatedly. */
function runSuite(label, { fixtures, slots, mutations, batchMutations }, opts, ex) {
  let fail = 0; const lines = [], failed = []
  const log = (ok, m) => { lines.push(`  ${ok ? 'ok  ' : 'FAIL'} [${label}] ${m}`); if (!ok) { fail++; failed.push(m) } }
  for (const f of fixtures) {
    const pr = checkItem(f, slots[f.id], ex, opts)
    log(!pr.length, pr.length ? `clean fixture ${f.id} refused: ${pr.join(' | ')}` : `clean fixture ${f.id} ${f.kind}/${f.stimulus}/${f.format} passes`)
  }
  for (const m of mutations) {
    const base = structuredClone(fixtures.find(f => f.id === m.on)); m.mutate(base)
    const pr = checkItem(base, slots[base.id], ex, opts)
    const hit = pr.find(x => x.startsWith(m.expect))
    log(!!hit, hit ? `${m.name} -> ${hit}` : `${m.name}: expected a ${m.expect} refusal, got ${pr.length ? pr.join(' | ') : 'none'}`)
  }
  const clean = checkBatch(fixtures, slots, opts)
  log(!clean.p.length, clean.p.length ? `clean fixture batch refused: ${clean.p.join(' | ')}` : `clean fixture batch passes (${clean.info[0]})`)
  for (const m of batchMutations) {
    const b = structuredClone(fixtures); m.mutate(b)
    const r = checkBatch(b, slots, opts), hit = r.p.find(x => x.includes(m.expect))
    log(!!hit, hit ? `batch ${m.name} -> ${hit}` : `batch ${m.name}: expected "${m.expect}", got ${r.p.join(' | ') || 'none'}`)
  }
  return { fail, lines, failed, n: fixtures.length, nm: mutations.length, nb: batchMutations.length }
}
const SELFTEST_EX = [{ line: 'act-science-v1 | Corrosion of Steel Coupons | steel coupons immersed in salt solution lost mass over fourteen days in aerated sodium chloride', text: 'corrosion of steel coupons steel coupons immersed in salt solution lost mass over fourteen days in aerated sodium chloride solution oxygen', toks: toks('steel coupons immersed salt solution lost mass fourteen days aerated sodium chloride corrosion oxygen coating zinc epoxy temperature') }]
async function suites() {
  const F = await import('./sci-check.fixtures.mjs')
  return {
    pilot: { fixtures: F.FIXTURES, slots: F.FIXTURE_SLOTS, mutations: F.MUTATIONS, batchMutations: F.BATCH_MUTATIONS },
    b1: { fixtures: F.FIXTURES_B1, slots: F.FIXTURE_SLOTS_B1, mutations: [...F.MUTATIONS_B1_CARRIED, ...F.MUTATIONS_B1], batchMutations: [...F.BATCH_MUTATIONS, ...F.BATCH_MUTATIONS_B1] },
    b2: { fixtures: F.FIXTURES_B2, slots: F.FIXTURE_SLOTS_B2, mutations: [...F.MUTATIONS_B2_CARRIED, ...F.MUTATIONS_B2], batchMutations: [...F.BATCH_MUTATIONS, ...F.BATCH_MUTATIONS_B1, ...F.BATCH_MUTATIONS_B2] },
    b3: { fixtures: F.FIXTURES_B3, slots: F.FIXTURE_SLOTS_B3, mutations: [...F.MUTATIONS_B3_CARRIED, ...F.MUTATIONS_B3], batchMutations: [...F.BATCH_MUTATIONS_B3_CARRIED, ...F.BATCH_MUTATIONS_B3] },
  }
}
async function selftest(disabled = new Set()) {
  const S = await suites()
  const a = runSuite('pilot rules', S.pilot, { rules: 'pilot' }, SELFTEST_EX)
  const b = runSuite('b1 rules', S.b1, { rules: 'b1', disabled }, SELFTEST_EX)
  const c = runSuite('b2 rules', S.b2, { rules: 'b2', disabled }, SELFTEST_EX)
  const d = runSuite('b3 rules', S.b3, { rules: 'b3', disabled }, SELFTEST_EX)
  for (const l of [...a.lines, ...b.lines, ...c.lines, ...d.lines]) console.log(l)
  const e = checkBatch([{ id: S.pilot.fixtures[0].id, empty: true }], { [S.pilot.fixtures[0].id]: S.pilot.slots[S.pilot.fixtures[0].id] })
  const efail = e.fatal ? 0 : 1
  console.log(`  ${e.fatal ? 'ok  ' : 'FAIL'} all-empty batch -> ${e.fatal ? 'fatal: ' + e.p[0] : 'not fatal'}`)
  const fail = a.fail + b.fail + c.fail + d.fail + efail
  console.log(fail ? `SELFTEST FAILED: ${fail}` : `SELFTEST OK: pilot rules ${a.n} clean + ${a.nm} item + ${a.nb} batch mutations; b1 rules ${b.n} clean + ${b.nm} item + ${b.nb} batch mutations; b2 rules ${c.n} clean + ${c.nm} item + ${c.nb} batch mutations; b3 rules ${d.n} clean + ${d.nm} item + ${d.nb} batch mutations; + all-empty fatal`)
  process.exit(fail ? 1 : 0)
}
/** --break-test: switch off each B1 check in turn; the b1 suite MUST then fail, and fail on that check's own fixtures. */
async function breakTest(rules = 'b1') {
  const S = await suites(); let bad = 0
  const suite = S[rules], label = `${rules} rules`, ids = rules === 'b3' ? [...B1_CHECKS, ...B2_CHECKS, ...B3_CHECKS] : rules === 'b2' ? [...B1_CHECKS, ...B2_CHECKS] : B1_CHECKS
  const base = runSuite(label, suite, { rules }, SELFTEST_EX)
  console.log(`  control: all ${rules} checks on -> ${base.fail} failures (must be 0)`); if (base.fail) bad++
  for (const id of ids) {
    const r = runSuite(label, suite, { rules, disabled: new Set([id]) }, SELFTEST_EX)
    const own = r.failed.filter(m => m.includes(`expected a ${id} `) || (id === 'ABSDIS' && m.includes('absolutes appear on')) || m.includes(`expected "${id} `))
    const okk = r.fail > 0 && own.length > 0
    if (!okk) bad++
    console.log(`  ${okk ? 'ok  ' : 'FAIL'} ${id} disabled -> ${r.fail} fixture(s) fail, ${own.length} of them its own: ${r.failed.slice(0, 2).map(x => x.split(':')[0]).join('; ')}`)
  }
  console.log(bad ? `BREAK-TEST FAILED: ${bad}` : `BREAK-TEST OK (${rules}): each of ${ids.join(', ')} is load-bearing (removing it fails its own fixture), and the suite is clean with all on`)
  process.exit(bad ? 1 : 0)
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (isMain) {
  const A = process.argv.slice(2)
  const ri = A.indexOf('--rules'), di = A.indexOf('--disable')
  const RUNOPTS = { rules: ri >= 0 ? A[ri + 1] : 'b1', disabled: new Set(di >= 0 ? A[di + 1].split(',') : []) }
  if (!RULESETS.includes(RUNOPTS.rules)) { console.error('REFUSING: --rules must be pilot, b1, b2 or b3'); process.exit(2) }
  if (A.includes('--break-test')) await breakTest(RUNOPTS.rules === 'pilot' ? 'b1' : RUNOPTS.rules)
  if (A.includes('--selftest')) await selftest(RUNOPTS.disabled)
  const die = m => { console.error('REFUSING: ' + m); process.exit(2) }
  const opt = n => { const i = A.indexOf(n); return i >= 0 ? A[i + 1] : null }
  const files = A.filter((a, i) => !a.startsWith('--') && !['--slots', '--exclusions', '--rules', '--disable'].includes(A[i - 1]))
  if (!files.length) die('usage: sci-check.mjs <items.json> | --batch <files...> | --selftest')
  let SLOT, EX
  try { SLOT = slotIndex(opt('--slots') ?? join(HERE, 'slots.json')); EX = loadExclusions(opt('--exclusions') ?? join(HERE, 'EXCLUSIONS-science.txt')) } catch (e) { die(e.message) }
  const items = []
  for (const f of files) {
    if (!existsSync(f)) die(`no such file ${f}`)
    let arr; try { arr = JSON.parse(readFileSync(f, 'utf8')) } catch (e) { die(`${f}: unparseable JSON: ${e.message}`) }
    if (!Array.isArray(arr) || !arr.length) die(`${f}: expected a non-empty JSON array`)
    items.push(...arr)
  }
  console.log(`sci-check: ${items.length} entries from ${files.length} file(s); ${Object.keys(SLOT).length} slots; ${EX.length} exclusion stimuli`)
  let bad = 0, ok = 0, empty = 0
  for (const it of items) {
    if (it?.empty) { empty++; console.log(`${it.id}: EMPTY (${it.reason ?? 'no reason given'})`); if (!SLOT[it.id]) { bad++; console.log('  not a slot') } continue }
    const pr = checkItem(it, SLOT[it?.id], EX, RUNOPTS)
    if (pr.length) { bad++; console.log(`${it?.id}: FAIL\n  ${pr.join('\n  ')}`) } else { ok++; console.log(`${it.id}: ok`) }
  }
  if (A.includes('--batch')) {
    const scope = Object.fromEntries(Object.entries(SLOT).filter(([id]) => items.some(i => i.id?.split('-')[1] === id.split('-')[1])))
    const r = checkBatch(items, scope, RUNOPTS)
    for (const l of r.info) console.log(`  [batch] ${l}`)
    for (const l of r.p) console.log(`  [batch] FAIL ${l}`)
    if (r.fatal) process.exit(2)
    if (r.p.length) bad++
  }
  console.log(`sci-check: ${ok} ok, ${empty} empty, ${bad} failing`)
  if (!ok) process.exit(2)
  process.exit(bad ? 1 : 0)
}
