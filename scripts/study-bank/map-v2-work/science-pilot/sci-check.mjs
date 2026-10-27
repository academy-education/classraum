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
 * Exit codes: 2 unreadable input or empty population (never a number over nothing), 1 any item or batch failure,
 * 0 only when every item prints ok.
 */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  AREAS, PES, peBand, dciOfPe, DIFF, RIT, STIMULI, FORMATS, TREND_WORDS, CLICHES, ABSOLUTE, HEDGE, LETTERS, norm, numOf,
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
export function checkItem(it, slot, ex = []) {
  const p = [], add = m => p.push(m)
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
export function checkBatch(items, SLOT) {
  const p = [], add = m => p.push(m), info = []
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
  return { p, info, fatal: false }
}

/* ---------------- CLI ---------------- */
function slotIndex(path) {
  const S = JSON.parse(readFileSync(path, 'utf8'))
  const idx = {}
  for (const [code, v] of Object.entries(S)) if (!code.startsWith('_')) for (const r of v.rows) idx[r.id] = { ...r, area: v.area, author: code }
  if (!Object.keys(idx).length) throw new Error(`${path} has no slots`)
  return idx
}

async function selftest() {
  const { FIXTURES, FIXTURE_SLOTS, MUTATIONS, BATCH_MUTATIONS } = await import('./sci-check.fixtures.mjs')
  let fail = 0
  const ex = [{ line: 'act-science-v1 | Corrosion of Steel Coupons | steel coupons immersed in salt solution lost mass over fourteen days in aerated sodium chloride', text: 'corrosion of steel coupons steel coupons immersed in salt solution lost mass over fourteen days in aerated sodium chloride solution oxygen', toks: toks('steel coupons immersed salt solution lost mass fourteen days aerated sodium chloride corrosion oxygen coating zinc epoxy temperature') }]
  for (const f of FIXTURES) {
    const pr = checkItem(f, FIXTURE_SLOTS[f.id], ex)
    if (pr.length) { fail++; console.log(`  FAIL clean fixture ${f.id} (${f.stimulus}/${f.format}) refused:\n    ${pr.join('\n    ')}`) } else console.log(`  ok   clean fixture ${f.id} ${f.kind}/${f.stimulus}/${f.format} passes`)
  }
  for (const m of MUTATIONS) {
    const base = structuredClone(FIXTURES.find(f => f.id === m.on)); m.mutate(base)
    const pr = checkItem(base, FIXTURE_SLOTS[base.id], ex)
    const fired = pr.some(x => x.startsWith(m.expect))
    if (!fired) { fail++; console.log(`  FAIL ${m.name}: expected a ${m.expect} refusal, got ${pr.length ? pr.join(' | ') : 'none'}`) } else console.log(`  ok   ${m.name} -> ${pr.find(x => x.startsWith(m.expect))}`)
  }
  {
    const clean = checkBatch(FIXTURES, FIXTURE_SLOTS)
    if (clean.p.length) { fail++; console.log(`  FAIL clean fixture batch refused: ${clean.p.join(' | ')}`) } else console.log(`  ok   clean fixture batch passes (${clean.info[0]})`)
  }
  for (const m of BATCH_MUTATIONS) {
    const b = structuredClone(FIXTURES); m.mutate(b)
    const r = checkBatch(b, FIXTURE_SLOTS)
    const fired = r.p.some(x => x.includes(m.expect))
    if (!fired) { fail++; console.log(`  FAIL batch ${m.name}: expected "${m.expect}", got ${r.p.join(' | ') || 'none'}`) } else console.log(`  ok   batch ${m.name} -> ${r.p.find(x => x.includes(m.expect))}`)
  }
  {
    const r = checkBatch([{ id: FIXTURES[0].id, empty: true }], { [FIXTURES[0].id]: FIXTURE_SLOTS[FIXTURES[0].id] })
    if (!r.fatal) { fail++; console.log('  FAIL all-empty batch did not refuse as fatal') } else console.log(`  ok   all-empty batch -> fatal: ${r.p[0]}`)
  }
  console.log(fail ? `SELFTEST FAILED: ${fail}` : `SELFTEST OK: ${FIXTURES.length} clean fixtures pass, ${MUTATIONS.length} item mutations and ${BATCH_MUTATIONS.length + 1} batch mutations each refused`)
  process.exit(fail ? 1 : 0)
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (isMain) {
  const A = process.argv.slice(2)
  if (A.includes('--selftest')) await selftest()
  const die = m => { console.error('REFUSING: ' + m); process.exit(2) }
  const opt = n => { const i = A.indexOf(n); return i >= 0 ? A[i + 1] : null }
  const files = A.filter((a, i) => !a.startsWith('--') && !['--slots', '--exclusions'].includes(A[i - 1]))
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
    const pr = checkItem(it, SLOT[it?.id], EX)
    if (pr.length) { bad++; console.log(`${it?.id}: FAIL\n  ${pr.join('\n  ')}`) } else { ok++; console.log(`${it.id}: ok`) }
  }
  if (A.includes('--batch')) {
    const scope = Object.fromEntries(Object.entries(SLOT).filter(([id]) => items.some(i => i.id?.split('-')[1] === id.split('-')[1])))
    const r = checkBatch(items, scope)
    for (const l of r.info) console.log(`  [batch] ${l}`)
    for (const l of r.p) console.log(`  [batch] FAIL ${l}`)
    if (r.fatal) process.exit(2)
    if (r.p.length) bad++
  }
  console.log(`sci-check: ${ok} ok, ${empty} empty, ${bad} failing`)
  if (!ok) process.exit(2)
  process.exit(bad ? 1 : 0)
}
