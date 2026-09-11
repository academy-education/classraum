#!/usr/bin/env node
/**
 * verify-act-science-v8.mjs — reconstruct BOTH act-science-v8 figures FROM
 * THEIR DRAWN GEOMETRY and re-answer the items from the reconstruction.
 *
 * There is no table of holding forces or glow times in this file and none
 * in the batch JSON. The only numbers this script has are pixel
 * coordinates and the axis tick LABELS and table text scraped out of the
 * SVG — exactly what a student has. It
 *
 *   - pairs each y-axis tick label with the nearest drawn tick line and
 *     fits value = a*y + b by least squares, per figure, refusing the file
 *     if any label is off its own fit or the plot floor does not read 0,
 *   - fits the Figure 1 x axis the same way,
 *   - identifies the four curves of passage 1 the way a student does: by
 *     matching each bold end-of-curve letter to a curve endpoint under one
 *     shared baseline offset, refusing if the best assignment is not
 *     clearly better than the runner-up, and cross-checking that each
 *     series has its own dash pattern and its own marker shape,
 *   - checks every plotted marker against a vertex of its own curve,
 *   - reads every bar off the fitted axis, from its TOP and independently
 *     from its HEIGHT, and requires the two to agree,
 *   - requires every bar to carry an IDENTICAL stroke. v6 is held partly
 *     because its filled bars were unstroked while its open bars were
 *     1px-stroked, biasing every open bar ~0.5px toward the key,
 *   - reconstructs Table 1 of passage 2 from the drawn rules: row bands
 *     and column bands from the lines, then one text per cell, refusing a
 *     cell that holds none or two, or a value that sits too near a rule to
 *     be assigned to one column,
 *   - measures, in SERVED pixels, the margin of every comparison an item
 *     turns on, and FAILS any that is thinner than --min-margin,
 *   - and only then answers the items and compares each with its key.
 *
 * INPUT IDENTITY. It asserts the exact item count and the exact ids and
 * exits 2 if either is wrong. A check that cannot name the bytes it read
 * must not return a number.
 *
 *   node verify-act-science-v8.mjs [batch.json] [--width 260] [--min-margin 10]
 *   exit 0 = every reconstruction, every margin and every key agrees
 *   exit 1 = a verification failure (named)
 *   exit 2 = the input is not the file this checker is about
 */
import { readFileSync } from 'node:fs'

const argv = process.argv.slice(2)
const flag = (name, dflt) => { const i = argv.indexOf(name); return i < 0 ? dflt : Number(argv[i + 1]) }
const FILE = argv.find(a => !a.startsWith('--') && !/^[\d.]+$/.test(a)) ?? new URL('./act-science-v8.batch.json', import.meta.url).pathname
/* The width the app actually serves. RawSvgFigure gives the <svg>
   w-full h-auto max-h-[300px], so a 260x300 viewBox is painted at
   260x300 CSS px and a 260x292 one at 267x300. 260 is the floor, and it
   is the width every margin below is quoted at. */
const SERVED_W = flag('--width', 260)
const MIN_MARGIN = flag('--min-margin', 10)

const EXPECT_IDS = [
  'ACT-SC8-P1-Q1', 'ACT-SC8-P1-Q2', 'ACT-SC8-P1-Q3',
  'ACT-SC8-P1-Q4', 'ACT-SC8-P1-Q5', 'ACT-SC8-P1-Q6',
  'ACT-SC8-P2-Q1', 'ACT-SC8-P2-Q2', 'ACT-SC8-P2-Q3',
  'ACT-SC8-P2-Q4', 'ACT-SC8-P2-Q5', 'ACT-SC8-P2-Q6',
]

const die2 = m => { console.error(`INPUT REFUSED: ${m}`); process.exit(2) }
const fails = []
const fail = m => { fails.push(m); console.log(`  FAIL  ${m}`) }
const pass = m => console.log(`  ok    ${m}`)
const margins = []

/* ---------- 0. input identity ---------- */
let batch
try { batch = JSON.parse(readFileSync(FILE, 'utf8')) } catch (e) { die2(`${FILE}: ${e.message}`) }
if (!Array.isArray(batch)) die2('batch is not an array')
console.log(`read ${FILE}`)
console.log(`items read: ${batch.length} (expected ${EXPECT_IDS.length})`)
if (batch.length !== EXPECT_IDS.length) die2(`${batch.length} items, this checker is only about the ${EXPECT_IDS.length}-item v8 batch`)
const gotIds = batch.map(i => i.id)
if (gotIds.join(',') !== EXPECT_IDS.join(',')) die2(`ids are not the v8 ids, in order.\n  got:  ${gotIds.join(' ')}\n  want: ${EXPECT_IDS.join(' ')}`)
const byId = Object.fromEntries(batch.map(i => [i.id, i]))
const oneSvg = tag => {
  const g = batch.filter(i => i.id.includes(`-${tag}-`))
  const s = new Set(g.map(i => i.graphic?.svg ?? null))
  if (s.size !== 1 || [...s][0] == null) die2(`the ${g.length} ${tag} items do not share one graphic.svg (${s.size} distinct)`)
  return [...s][0]
}
const SVG1 = oneSvg('P1'), SVG2 = oneSvg('P2')
console.log(`passage 1: 6 items sharing 1 identical SVG of ${SVG1.length} bytes`)
console.log(`passage 2: 6 items sharing 1 identical SVG of ${SVG2.length} bytes`)
console.log(`served width assumed: ${SERVED_W}px   minimum decisive margin: ${MIN_MARGIN}px\n`)

/* ---------- 1. scan an SVG into tags ---------- */
const ent = s => String(s ?? '').replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d))).replace(/&amp;/g, '&')
function scan(SVG) {
  const tags = []
  const TAG = /<([a-zA-Z]+)((?:\s+[a-zA-Z0-9:_-]+\s*=\s*"[^"]*")*)\s*\/?>(?:([^<]*)<\/\1>)?/g
  for (const m of SVG.matchAll(TAG)) {
    const attrs = {}
    for (const a of m[2].matchAll(/([a-zA-Z0-9:_-]+)\s*=\s*"([^"]*)"/g)) attrs[a[1]] = a[2]
    tags.push({ name: m[1], attrs, text: m[3] == null ? null : ent(m[3]) })
  }
  const vb = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(SVG)
  if (!vb) { console.error('no viewBox'); process.exit(1) }
  return { tags, of: n => tags.filter(t => t.name === n), vbw: Number(vb[1]), vbh: Number(vb[2]) }
}
const num = v => Number(v)
const lsq = pts => {
  const n = pts.length, sx = pts.reduce((s, p) => s + p[0], 0), sy = pts.reduce((s, p) => s + p[1], 0)
  const sxx = pts.reduce((s, p) => s + p[0] * p[0], 0), sxy = pts.reduce((s, p) => s + p[0] * p[1], 0)
  return { a: (n * sxy - sx * sy) / (n * sxx - sx * sx), b: 0 } // b filled below
}
const fit1d = pts => { const f = lsq(pts); const n = pts.length
  f.b = (pts.reduce((s, p) => s + p[1], 0) - f.a * pts.reduce((s, p) => s + p[0], 0)) / n; return f }

function frames(S) {
  const out = []
  for (const p of S.of('path')) {
    const m = /^M([\d.]+),([\d.]+)\s*V([\d.]+)\s*H([\d.]+)$/.exec(String(p.attrs.d ?? '').trim())
    if (m && p.attrs.stroke === '#000') out.push({ x0: num(m[1]), top: num(m[2]), bottom: num(m[3]), x1: num(m[4]) })
  }
  return out.sort((a, b) => a.top - b.top)
}

/* MAJOR ticks only: minor ticks are drawn shorter, and a calibration that
   paired 6 labels with 11 tick lines would silently drop half its
   evidence. They are told apart by LENGTH, which is on the page. */
function calibrateY(S, frame, tag) {
  const all = S.of('line').filter(t => num(t.attrs.y1) === num(t.attrs.y2) && num(t.attrs.x2) <= frame.x0 + 0.01 && num(t.attrs.x2) > num(t.attrs.x1)
    && num(t.attrs.y1) >= frame.top - 1 && num(t.attrs.y1) <= frame.bottom + 1)
  const len = t => num(t.attrs.x2) - num(t.attrs.x1)
  const ticks = all.filter(t => len(t) >= 3.5)
  console.log(`  ${tag}: ${all.length} tick marks drawn, ${ticks.length} major (>=3.5px), ${all.length - ticks.length} minor`)
  const labs = S.of('text').filter(t => t.attrs['text-anchor'] === 'end' && /^-?[\d.]+$/.test(String(t.text).trim())
    && num(t.attrs.y) >= frame.top - 8 && num(t.attrs.y) <= frame.bottom + 8)
  const pairs = []
  for (const l of labs) {
    const ly = num(l.attrs.y)
    const s = ticks.map(t => ({ y: num(t.attrs.y1), d: Math.abs(num(t.attrs.y1) - ly) })).sort((p, q) => p.d - q.d)
    if (!s.length) { fail(`${tag}: axis label "${l.text}" has no tick line`); continue }
    if (s.length > 1 && s[1].d - s[0].d < 4) { fail(`${tag}: axis label "${l.text}" is equidistant between two ticks - cannot be calibrated`); continue }
    if (s[0].d > 8) { fail(`${tag}: axis label "${l.text}" is ${s[0].d.toFixed(1)}px from the nearest tick`); continue }
    pairs.push([s[0].y, Number(l.text)])
  }
  if (pairs.length !== ticks.length) fail(`${tag}: ${ticks.length} major tick lines but ${pairs.length} usable labels`)
  if (pairs.length < 3) { fail(`${tag}: only ${pairs.length} calibration points`); return null }
  const f = fit1d(pairs)
  const worst = Math.max(...pairs.map(([y, v]) => Math.abs(f.a * y + f.b - v)))
  console.log(`  ${tag}: ${pairs.length} ticks ${pairs.map(p => p[1]).join('/')} -> value = ${f.a.toFixed(5)}*y + ${f.b.toFixed(4)}, worst residual ${worst.toFixed(4)}`)
  if (worst > 0.012) fail(`${tag}: axis labels do not lie on one straight line - worst residual ${worst.toFixed(4)} (a mislabelled or misplaced tick)`)
  else pass(`${tag} is linear to ${worst.toFixed(4)}`)
  if (Math.abs(f.a * frame.bottom + f.b) > 0.012) fail(`${tag}: the plot floor reads ${(f.a * frame.bottom + f.b).toFixed(4)}, not 0`)
  const val = y => f.a * y + f.b
  val.perPx = Math.abs(f.a)                   // value units per viewBox px
  return val
}
/* Every value a student has to READ must sit ON a drawn line. This is the
   property that v6 lacked: its key comparison fell between gridlines, so
   the student had to resolve a 2.4px gap by eye instead of reading two
   labelled values. Here the gridlines are collected from the drawing and
   every plotted point and every bar top must land on one. */
function gridYs(S, frame) {
  /* Identify gridlines STRUCTURALLY, not by colour: any horizontal rule
     that spans the frame, plus every drawn axis tick. The first draft
     matched two literal hex colours and a benign recolour of the minor
     grid broke it - caught by the benign half of the rig harness, which
     is the half that exists for exactly this. */
  const ys = new Set([frame.top, frame.bottom])
  for (const p of S.of('path')) {
    for (const m of String(p.attrs.d ?? '').matchAll(/M([\d.]+),([\d.]+)\s*H([\d.]+)/g)) {
      const x0 = Number(m[1]), y = Number(m[2]), x1 = Number(m[3])
      if (Math.abs(x0 - frame.x0) < 1 && Math.abs(x1 - frame.x1) < 1 && y >= frame.top - 0.5 && y <= frame.bottom + 0.5) ys.add(y)
    }
  }
  for (const t of S.of('line')) {
    const y = Number(t.attrs.y1)
    if (Number(t.attrs.y2) === y && Number(t.attrs.x2) <= frame.x0 + 0.01 && y >= frame.top - 0.5 && y <= frame.bottom + 0.5) ys.add(y)
  }
  return [...ys].sort((a, b) => a - b)
}
function onGrid(ys, y) { return ys.some(g => Math.abs(g - y) <= 0.4) }
function assertOnGrid(S, frame, pts, tag) {
  const ys = gridYs(S, frame)
  if (ys.length < 3) { fail(`${tag}: only ${ys.length} horizontal gridlines drawn`); return }
  const off = pts.filter(p => !onGrid(ys, p.y))
  if (off.length) fail(`${tag}: ${off.length} of ${pts.length} read-off values do not sit on any of the ${ys.length} drawn gridlines (${off.slice(0, 3).map(p => `${p.what} at y=${p.y}`).join('; ')})`)
  else pass(`${tag}: all ${pts.length} read-off values sit on one of the ${ys.length} drawn gridlines`)
}
const round05 = v => Math.round(v * 20) / 20   // both figures are drawn on a 0.05-unit grid

/* Bars: read from the top AND from the height, and require identical strokes. */
function readBars(S, frame, wMin, tag) {
  const bars = S.of('rect')
    .filter(r => num(r.attrs.width) > wMin && num(r.attrs.y) >= frame.top - 1 && num(r.attrs.y) + num(r.attrs.height) <= frame.bottom + 1
      && num(r.attrs.x) >= frame.x0 - 1 && num(r.attrs.x) + num(r.attrs.width) <= frame.x1 + 1)
    .map(r => ({ x: num(r.attrs.x) + num(r.attrs.width) / 2, w: num(r.attrs.width), top: num(r.attrs.y), h: num(r.attrs.height),
      fill: r.attrs.fill, stroke: r.attrs.stroke ?? 'none', sw: r.attrs['stroke-width'] ?? 'none' }))
    .sort((a, b) => a.x - b.x)
  const strokes = new Set(bars.map(b => `${b.stroke}/${b.sw}`))
  if (strokes.size !== 1) fail(`${tag}: bars do not all carry the same stroke (${[...strokes].join(', ')}) - an unstroked bar reads ~0.5px taller than a stroked one`)
  else pass(`${tag}: all ${bars.length} bars carry an identical stroke (${[...strokes][0]})`)
  if (new Set(bars.map(b => b.w)).size !== 1) fail(`${tag}: bars are not all the same width`)
  return bars
}

/* ================================================================== */
/* ============== PASSAGE 1: line chart + grouped bars =============== */
/* ================================================================== */
console.log('PASSAGE 1 — reconstruction')
const S1 = scan(SVG1)
console.log(`  viewBox ${S1.vbw}x${S1.vbh}  ->  served ${(S1.vbw * Math.min(SERVED_W / S1.vbw, 300 / S1.vbh)).toFixed(0)}x${(S1.vbh * Math.min(SERVED_W / S1.vbw, 300 / S1.vbh)).toFixed(0)} px`)
const PX1 = SERVED_W / S1.vbw                  // viewBox px -> served px
const fr1 = frames(S1)
if (fr1.length !== 2) { console.error(`passage 1: expected 2 plot frames, found ${fr1.length}`); process.exit(1) }
const [F1, F2] = fr1
console.log(`  frames: Fig1 y ${F1.top}..${F1.bottom} x ${F1.x0}..${F1.x1} | Fig2 y ${F2.top}..${F2.bottom} x ${F2.x0}..${F2.x1}`)
const v1 = calibrateY(S1, F1, 'Fig1 y'), v2 = calibrateY(S1, F2, 'Fig2 y')
if (!v1 || !v2) { console.error('\nVERIFY FAILED - passage 1 axes could not be calibrated:\n  ' + fails.join('\n  ')); process.exit(1) }

// x axis of Fig 1
const xTicks = S1.of('line').filter(t => num(t.attrs.x1) === num(t.attrs.x2) && num(t.attrs.y1) >= F1.bottom - 0.01 && num(t.attrs.y1) <= F1.bottom + 1)
const xLabs = S1.of('text').filter(t => t.attrs['text-anchor'] === 'middle' && /^\d+$/.test(String(t.text).trim()) && num(t.attrs.y) > F1.bottom && num(t.attrs.y) < F1.bottom + 20)
const xPairs = []
for (const l of xLabs) {
  const s = xTicks.map(t => ({ x: num(t.attrs.x1), d: Math.abs(num(t.attrs.x1) - num(l.attrs.x)) })).sort((p, q) => p.d - q.d)
  if (s.length && s[0].d < 3) xPairs.push([s[0].x, Number(l.text)])
}
if (xPairs.length !== xTicks.length || xPairs.length < 3) fail(`Fig1 x: ${xTicks.length} ticks, ${xPairs.length} labels paired`)
const xf = fit1d(xPairs)
const xw = Math.max(...xPairs.map(([x, v]) => Math.abs(xf.a * x + xf.b - v)))
console.log(`  Fig1 x: ${xPairs.length} ticks ${xPairs.map(p => p[1]).join('/')} -> cycles = ${xf.a.toFixed(4)}*x + ${xf.b.toFixed(3)}, worst residual ${xw.toFixed(3)}`)
if (xw > 0.5) fail(`Fig1 x axis labels are not linear in x - worst residual ${xw.toFixed(3)}`); else pass(`Fig1 x is linear to ${xw.toFixed(3)}`)
const cycAt = x => xf.a * x + xf.b

// curves, identified by end letter under one shared baseline offset
const curves = S1.of('polyline').map(p => ({
  dash: p.attrs['stroke-dasharray'] ?? 'solid',
  pts: String(p.attrs.points).trim().split(/\s+/).map(s => s.split(',').map(Number)),
}))
console.log(`  curves: ${curves.length}, vertices ${curves.map(c => c.pts.length).join('/')}`)
if (new Set(curves.map(c => c.dash)).size !== curves.length) fail('two curves share a dash pattern - a student cannot tell them apart')
else pass(`${curves.length} distinct dash patterns: ${curves.map(c => c.dash).join(' | ')}`)
const endLetters = S1.of('text').filter(t => t.attrs['font-weight'] === 'bold' && /^[A-Z]$/.test(String(t.text).trim()) && num(t.attrs.x) > F1.x1 && num(t.attrs.y) < F1.bottom + 10)
const series = {}
{
  const labs = endLetters.map(l => ({ k: String(l.text).trim(), y: num(l.attrs.y) }))
  const ends = curves.map(c => ({ c, y: c.pts[c.pts.length - 1][1] }))
  if (labs.length !== ends.length) fail(`${labs.length} end letters for ${ends.length} curves`)
  else {
    const perms = []; const permute = (rest, acc) => { if (!rest.length) return perms.push(acc); rest.forEach((e, i) => permute(rest.filter((_, j) => j !== i), acc.concat([e]))) }
    permute(ends, [])
    const scored = perms.map(pm => { const r = labs.map((l, i) => l.y - pm[i].y); const c = r.reduce((a, b) => a + b, 0) / r.length
      return { pm, c, rms: Math.sqrt(r.reduce((a, b) => a + (b - c) ** 2, 0) / r.length) } }).sort((a, b) => a.rms - b.rms)
    const [best, next] = scored
    console.log(`  legend fit: baseline offset ${best.c.toFixed(2)}px, rms ${best.rms.toFixed(2)}px (runner-up ${next.rms.toFixed(2)}px)`)
    if (best.rms > 1.5) fail(`the end letters do not line up with the curve ends (rms ${best.rms.toFixed(2)}px)`)
    else if (next.rms - best.rms < 2) fail(`two end letters are interchangeable within ${(next.rms - best.rms).toFixed(2)}px - the labelling is ambiguous`)
    else labs.forEach((l, i) => { series[l.k] = best.pm[i].c })
  }
}
const AK = Object.keys(series).sort()
console.log(`  series identified from end letters: ${AK.join(', ')}`)
if (AK.length !== curves.length) fail(`${AK.length} labelled curves for ${curves.length} drawn curves`)
if (new Set(Object.values(series)).size !== AK.length) fail('two end letters point at the same curve')
{
  let clipped = 0
  for (const c of curves) for (const [x, y] of c.pts) if (x < F1.x0 - 0.5 || x > F1.x1 + 0.5 || y < F1.top - 0.5 || y > F1.bottom + 0.5) clipped++
  if (clipped) fail(`${clipped} curve vertices fall outside the Figure 1 frame`); else pass('no Figure 1 vertex is clipped')
}
// markers must sit on vertices, one shape per series
const markers = []
for (const c of S1.of('circle')) markers.push({ kind: 'circle', x: num(c.attrs.cx), y: num(c.attrs.cy) })
for (const r of S1.of('rect')) { const w = num(r.attrs.width), h = num(r.attrs.height)
  if (w > 0 && w < 6 && Math.abs(w - h) < 0.01) markers.push({ kind: 'square', x: num(r.attrs.x) + w / 2, y: num(r.attrs.y) + h / 2 }) }
for (const g of S1.of('polygon')) { const pts = String(g.attrs.points).trim().split(/\s+/).map(s => s.split(',').map(Number))
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length
  markers.push({ kind: pts.length === 3 ? 'triangle' : pts.length === 4 ? 'diamond' : `poly${pts.length}`, x: cx, y: cy }) }
console.log(`  markers: ${markers.length} (${[...new Set(markers.map(m => m.kind))].map(k => `${k} ${markers.filter(m => m.kind === k).length}`).join(', ')})`)
{
  const used = new Set(); let orphan = 0
  for (const k of AK) { const shapes = new Set()
    for (const [vx, vy] of series[k].pts) {
      const hit = markers.map((m, i) => ({ m, i, d: Math.hypot(m.x - vx, m.y - vy) })).sort((a, b) => a.d - b.d)[0]
      if (!hit || hit.d > 0.9) { fail(`Design ${k}: the vertex at (${vx}, ${vy}) carries no marker within 0.9px (nearest ${hit ? hit.d.toFixed(2) : 'none'})`); orphan++; continue }
      used.add(hit.i); shapes.add(hit.m.kind) }
    if (shapes.size > 1) fail(`Design ${k} is drawn with ${shapes.size} marker shapes (${[...shapes].join(', ')})`) }
  const stray = markers.length - used.size
  if (stray) fail(`${stray} marker(s) sit on no curve vertex`)
  if (!orphan && !stray) pass(`all ${used.size} markers sit on a vertex of their own curve, one shape per series`)
}
// values
const fig1 = {}, CYC = []
for (const k of AK) {
  fig1[k] = series[k].pts.map(([, y]) => round05(v1(y)))
  const t = series[k].pts.map(([x]) => Math.round(cycAt(x)))
  if (!CYC.length) CYC.push(...t); else if (t.join() !== CYC.join()) fail(`Design ${k} is not plotted at the same cycle counts as the others`)
}
console.log(`\n  FIGURE 1 reconstructed at ${CYC.join('/')} cycles:`)
for (const k of AK) console.log(`    Design ${k}: ${fig1[k].map(v => v.toFixed(2)).join('  ')}`)
{
  let minSep = Infinity, where = ''
  for (let i = 0; i < CYC.length; i++) { const ys = AK.map(k => series[k].pts[i][1]).sort((a, b) => a - b)
    for (let j = 1; j < ys.length; j++) if (ys[j] - ys[j - 1] < minSep) { minSep = ys[j] - ys[j - 1]; where = `${CYC[i]} cycles` } }
  assertOnGrid(S1, F1, AK.flatMap(k => series[k].pts.map(([x, y]) => ({ y, what: `Design ${k} at x=${x}` }))), 'Fig1 (passage 1)')
  console.log(`    closest two plotted points on any one vertical: ${(minSep * PX1).toFixed(1)}px (at ${where})`)
  if (minSep * PX1 < MIN_MARGIN) fail(`two series come within ${(minSep * PX1).toFixed(1)}px at ${where}`)
  else pass(`series stay ${(minSep * PX1).toFixed(1)}px apart at every cycle count`)
}
// Figure 2 bars
const bars2 = readBars(S1, F2, 12, 'Fig2')
console.log(`  bars in Figure 2: ${bars2.length}`)
for (const b of bars2) {
  if (Math.abs(b.top + b.h - F2.bottom) > 0.51) fail(`a Fig2 bar at x=${b.x} does not stand on the plot floor`)
  const byTop = v2(b.top), byH = b.h * v2.perPx
  if (Math.abs(byTop - byH) > 0.012) fail(`a Fig2 bar at x=${b.x} reads ${byTop.toFixed(3)} from its top but ${byH.toFixed(3)} from its height`)
}
assertOnGrid(S1, F2, bars2.map(b => ({ y: b.top, what: `bar at x=${b.x}` })), 'Fig2 (passage 1)')
if (bars2.length !== 8) fail(`expected 8 bars in Figure 2, found ${bars2.length}`)
const swatch2 = S1.of('rect').filter(r => num(r.attrs.width) > 6 && num(r.attrs.width) < 12 && num(r.attrs.y) < F2.top && num(r.attrs.y) > F1.bottom)
const caps2 = S1.of('text').filter(t => /\d+\s*°C/.test(String(t.text ?? '')) && num(t.attrs.y) < F2.top && num(t.attrs.y) > F1.bottom)
const fillToTemp = {}
for (const c of caps2) {
  const s = swatch2.map(w => ({ w, d: num(c.attrs.x) - (num(w.attrs.x) + num(w.attrs.width)) })).filter(o => o.d >= 0 && o.d <= 20).sort((a, b) => a.d - b.d)[0]
  if (s) fillToTemp[s.w.attrs.fill] = String(c.text).trim()
}
console.log(`  Fig2 legend: ${Object.entries(fillToTemp).map(([f, t]) => `${f} = ${t}`).join(', ')}`)
if (Object.keys(fillToTemp).length !== 2) fail('Figure 2 legend does not map exactly two fills to two temperatures')
const gLab2 = S1.of('text').filter(t => t.attrs['font-weight'] === 'bold' && /^[A-Z]$/.test(String(t.text).trim()) && num(t.attrs.y) > F2.bottom)
const fig2 = {}
for (let i = 0; i < bars2.length; i += 2) {
  const g = bars2.slice(i, i + 2), cx = (g[0].x + g[1].x) / 2
  const l = gLab2.map(t => ({ t, d: Math.abs(num(t.attrs.x) - cx) })).sort((a, b) => a.d - b.d)
  if (!l.length || l[0].d > 6 || (l.length > 1 && l[1].d - l[0].d < 6)) { fail(`the Fig2 bar pair centred at x=${cx.toFixed(1)} has no unambiguous design label`); continue }
  fig2[String(l[0].t.text).trim()] = Object.fromEntries(g.map(b => [fillToTemp[b.fill] ?? `fill ${b.fill}`, round05(v2(b.top))]))
}
console.log('  FIGURE 2 reconstructed (after 400 cycles):')
for (const k of Object.keys(fig2).sort()) console.log(`    Design ${k}: ${Object.entries(fig2[k]).map(([t, v]) => `${t} ${v.toFixed(2)}`).join('   ')}`)
if (Object.keys(fig2).sort().join() !== AK.join()) fail(`Figure 2 designs ${Object.keys(fig2).sort().join('/')} do not match Figure 1 designs ${AK.join('/')}`)
const T10 = Object.values(fillToTemp).sort()[0], T40 = Object.values(fillToTemp).sort()[1]  // "10 °C" < "40 °C"

/* ================================================================== */
/* ============ PASSAGE 2: grouped bars + a drawn table ============== */
/* ================================================================== */
console.log('\nPASSAGE 2 — reconstruction')
const S2 = scan(SVG2)
const PX2 = SERVED_W / S2.vbw
console.log(`  viewBox ${S2.vbw}x${S2.vbh}  ->  served ${(S2.vbw * Math.min(SERVED_W / S2.vbw, 300 / S2.vbh)).toFixed(0)}x${(S2.vbh * Math.min(SERVED_W / S2.vbw, 300 / S2.vbh)).toFixed(0)} px`)
const fr2 = frames(S2)
if (fr2.length !== 1) { console.error(`passage 2: expected 1 plot frame, found ${fr2.length}`); process.exit(1) }
const G1 = fr2[0]
console.log(`  frame: y ${G1.top}..${G1.bottom} x ${G1.x0}..${G1.x1}`)
const w1 = calibrateY(S2, G1, 'Fig1 y')
if (!w1) { console.error('\nVERIFY FAILED - passage 2 axis could not be calibrated'); process.exit(1) }
const barsB = readBars(S2, G1, 12, 'Fig1')
console.log(`  bars in Figure 1: ${barsB.length}`)
for (const b of barsB) {
  if (Math.abs(b.top + b.h - G1.bottom) > 0.51) fail(`a bar at x=${b.x} does not stand on the plot floor`)
  const byTop = w1(b.top), byH = b.h * w1.perPx
  if (Math.abs(byTop - byH) > 0.012) fail(`a bar at x=${b.x} reads ${byTop.toFixed(3)} from its top but ${byH.toFixed(3)} from its height`)
}
assertOnGrid(S2, G1, barsB.map(b => ({ y: b.top, what: `bar at x=${b.x}` })), 'Fig1 (passage 2)')
if (barsB.length !== 12) fail(`expected 12 bars in Figure 1, found ${barsB.length}`)
const swatchB = S2.of('rect').filter(r => num(r.attrs.width) > 6 && num(r.attrs.width) < 12 && num(r.attrs.y) < G1.top)
const capsB = S2.of('text').filter(t => /^\d+\s*min$/.test(String(t.text ?? '').trim()) && num(t.attrs.y) < G1.top)
const fillToLit = {}
for (const c of capsB) {
  const s = swatchB.map(w => ({ w, d: num(c.attrs.x) - (num(w.attrs.x) + num(w.attrs.width)) })).filter(o => o.d >= 0 && o.d <= 20).sort((a, b) => a.d - b.d)[0]
  if (s) fillToLit[s.w.attrs.fill] = String(c.text).trim()
}
console.log(`  Fig1 legend: ${Object.entries(fillToLit).map(([f, t]) => `${f} = ${t}`).join(', ')}`)
if (Object.keys(fillToLit).length !== 3) fail('Figure 1 legend does not map exactly three fills to three lighting times')
const gLabB = S2.of('text').filter(t => t.attrs['text-anchor'] === 'middle' && /^Coating \d$/.test(String(t.text ?? '').trim()) && num(t.attrs.y) > G1.bottom && num(t.attrs.y) < G1.bottom + 20)
const figB = {}
for (let i = 0; i < barsB.length; i += 3) {
  const g = barsB.slice(i, i + 3), cx = g.reduce((s, b) => s + b.x, 0) / 3
  const l = gLabB.map(t => ({ t, d: Math.abs(num(t.attrs.x) - cx) })).sort((a, b) => a.d - b.d)
  if (!l.length || l[0].d > 6 || (l.length > 1 && l[1].d - l[0].d < 6)) { fail(`the bar triple centred at x=${cx.toFixed(1)} has no unambiguous coating label`); continue }
  figB[String(l[0].t.text).trim()] = Object.fromEntries(g.map(b => [fillToLit[b.fill] ?? `fill ${b.fill}`, round05(w1(b.top))]))
}
const BK = Object.keys(figB).sort()
console.log('  FIGURE 1 reconstructed (glow time, min):')
for (const k of BK) console.log(`    ${k}: ${Object.entries(figB[k]).map(([t, v]) => `${t} ${v.toFixed(2)}`).join('   ')}`)
if (BK.length !== 4) fail(`expected 4 coating groups, found ${BK.length}`)

/* ---- Table 1, from the drawn rules ---- */
const rules = S2.of('path').filter(p => p.attrs.stroke === '#000' && /^M[\d.]+,[\d.]+ ?[HV]/.test(String(p.attrs.d ?? '')) && !/V[\d.]+\s*H/.test(String(p.attrs.d ?? '')))
const hRule = [], vRule = []
for (const p of rules) {
  for (const m of String(p.attrs.d).matchAll(/M([\d.]+),([\d.]+)\s*H([\d.]+)/g)) hRule.push({ y: Number(m[2]), x0: Number(m[1]), x1: Number(m[3]) })
  for (const m of String(p.attrs.d).matchAll(/M([\d.]+),([\d.]+)\s*V([\d.]+)/g)) vRule.push({ x: Number(m[1]), y0: Number(m[2]), y1: Number(m[3]) })
}
const hT = hRule.filter(r => r.y > G1.bottom).map(r => r.y).sort((a, b) => a - b)
const vT = vRule.filter(r => r.y0 > G1.bottom).map(r => r.x).sort((a, b) => a - b)
console.log(`  table rules below the plot: ${hT.length} horizontal at y ${hT.join('/')}, ${vT.length} vertical at x ${vT.join('/')}`)
if (hT.length < 3 || vT.length < 3) fail('Table 1 does not have enough drawn rules to define rows and columns')
const cellTexts = S2.of('text').filter(t => num(t.attrs.y) > hT[0] && num(t.attrs.y) < hT[hT.length - 1] + 1 && num(t.attrs.x) > vT[0] && num(t.attrs.x) < vT[vT.length - 1])
const grid = []
for (let r = 0; r < hT.length - 1; r++) { grid.push([])
  for (let c = 0; c < vT.length - 1; c++) {
    const inCell = cellTexts.filter(t => num(t.attrs.y) > hT[r] && num(t.attrs.y) <= hT[r + 1] && num(t.attrs.x) > vT[c] && num(t.attrs.x) <= vT[c + 1])
    if (inCell.length !== 1) { fail(`Table 1 cell (row ${r}, col ${c}) holds ${inCell.length} text elements, not 1`); grid[r].push(null); continue }
    const t = inCell[0], x = num(t.attrs.x)
    const clearance = Math.min(x - vT[c], vT[c + 1] - x)
    if (clearance < 4) fail(`Table 1 cell (row ${r}, col ${c}) has its text ${clearance.toFixed(1)}px from a rule - it cannot be assigned to one column`)
    grid[r].push(String(t.text).trim())
  }
}
console.log('  TABLE 1 reconstructed:')
for (const row of grid) console.log(`    ${row.map(c => String(c).padEnd(12)).join('| ')}`)
const header = grid[0], body = grid.slice(1)
if (!header || header.some(h => h == null)) fail('Table 1 header row is unreadable')
if (body.length !== 4) fail(`Table 1 has ${body.length} data rows, expected 4`)
const table = {}
for (const row of body) {
  const vals = {}
  for (let c = 1; c < header.length; c++) { const nvm = Number(row[c]); if (!Number.isFinite(nvm)) fail(`Table 1 value "${row[c]}" is not a number`); vals[header[c]] = nvm }
  table[row[0]] = vals
}
const COLS = header.slice(1)
if (Object.keys(table).sort().join() !== BK.join()) fail(`Table 1 rows ${Object.keys(table).sort().join('/')} do not match Figure 1 groups ${BK.join('/')}`)
const WHITE = COLS.find(c => /white/i.test(c)), BLACK = COLS.find(c => /black/i.test(c))
if (!WHITE || !BLACK) fail(`Table 1 columns ${COLS.join('/')} do not name a white-card and a black-card condition`)

/* ================================================================== */
/* ====================== 8. re-answer the items ==================== */
/* ================================================================== */
console.log('\nre-answering from the reconstruction:')
const check = (id, derived, why) => {
  const it = byId[id]
  if (derived == null) { fail(`${id}: could not derive an answer (${why})`); return }
  if (derived === it.correct_answer) pass(`${id}: geometry gives "${derived}" - matches the key   [${why}]`)
  else fail(`${id}: geometry gives "${derived}" but the key is "${it.correct_answer}"   [${why}]`)
}
const nearestNumeric = (item, v) => {
  const o = item.choices.map(c => ({ c, n: Number(/(-?[\d.]+)/.exec(c)?.[1]) })).filter(o => Number.isFinite(o.n))
  return o.sort((a, b) => Math.abs(a.n - v) - Math.abs(b.n - v))[0]?.c
}
const named = (item, re) => item.choices.find(c => re.test(c))
const rec = (id, what, px) => { margins.push({ id, what, px })
  if (px < MIN_MARGIN) fail(`${id}: the comparison it turns on (${what}) is only ${px.toFixed(1)}px at ${SERVED_W}px wide`) }
const px1 = units => units / v1.perPx * PX1     // Fig1 value units -> served px
const px2 = units => units / v2.perPx * PX1
const pxB = units => units / w1.perPx * PX2

// --- P1 Q1: Design Q after 800 cycles
{
  const i = CYC.length - 1, v = fig1['Q'][i]
  const others = AK.filter(k => k !== 'Q').map(k => Math.abs(fig1[k][i] - v))
  rec('ACT-SC8-P1-Q1', 'Q vs the nearest other curve at 800 cycles', px1(Math.min(...others)))
  check('ACT-SC8-P1-Q1', nearestNumeric(byId['ACT-SC8-P1-Q1'], v), `Design Q at ${CYC[i]} cycles reads ${v.toFixed(2)}`)
}
// --- P1 Q2: which design rises from 10 to 40 degC
{
  const up = AK.filter(k => fig2[k][T40] > fig2[k][T10])
  if (up.length !== 1) fail(`ACT-SC8-P1-Q2: ${up.length} designs rise from ${T10} to ${T40} (${up.join('/')}) - no unique answer`)
  else {
    rec('ACT-SC8-P1-Q2', `${up[0]}'s own pair`, px2(Math.abs(fig2[up[0]][T40] - fig2[up[0]][T10])))
    rec('ACT-SC8-P1-Q2', 'the nearest falling pair', px2(Math.min(...AK.filter(k => k !== up[0]).map(k => Math.abs(fig2[k][T40] - fig2[k][T10])))))
    check('ACT-SC8-P1-Q2', named(byId['ACT-SC8-P1-Q2'], new RegExp(`Design ${up[0]}\\b`)), `${up[0]}: ${fig2[up[0]][T10].toFixed(2)} -> ${fig2[up[0]][T40].toFixed(2)}`)
  }
}
// --- P1 Q3: shape of P and of Q
{
  const shape = k => { const s = fig1[k], d = []
    for (let i = 1; i < s.length; i++) { const x = s[i] - s[i - 1]; if (Math.abs(x) > 0.02) d.push(Math.sign(x)) }
    const runs = d.filter((x, i) => i === 0 || x !== d[i - 1])
    if (runs.length === 1) return runs[0] > 0 ? 'increased only' : 'decreased only'
    if (runs.length === 2) return runs[0] > 0 ? 'increased and then decreased' : 'decreased and then increased'
    return `changed direction ${runs.length - 1} times` }
  const want = `${shape('P')}, and ${shape('Q')}.`
  let minStep = Infinity
  for (const k of ['P', 'Q']) for (let i = 1; i < fig1[k].length; i++) minStep = Math.min(minStep, Math.abs(fig1[k][i] - fig1[k][i - 1]))
  rec('ACT-SC8-P1-Q3', 'the smallest step of the P and Q curves', px1(minStep))
  check('ACT-SC8-P1-Q3', byId['ACT-SC8-P1-Q3'].choices.find(c => c === want), `P ${shape('P')}; Q ${shape('Q')}`)
}
// --- P1 Q4: biggest fall in Fig2, then read Fig1 at the 2nd cycle count
{
  const drop = k => fig2[k][T10] - fig2[k][T40]
  const ranked = AK.map(k => [k, drop(k)]).sort((a, b) => b[1] - a[1])
  rec('ACT-SC8-P1-Q4', 'largest fall vs runner-up fall', px2(ranked[0][1] - ranked[1][1]))
  const k = ranked[0][0], v = fig1[k][1]
  const others = AK.filter(o => o !== k).map(o => Math.abs(fig1[o][1] - v))
  rec('ACT-SC8-P1-Q4', `${k} vs the nearest other curve at ${CYC[1]} cycles`, px1(Math.min(...others)))
  check('ACT-SC8-P1-Q4', nearestNumeric(byId['ACT-SC8-P1-Q4'], v), `largest fall is ${k} (${ranked[0][1].toFixed(2)}, next ${ranked[1][0]} ${ranked[1][1].toFixed(2)}); ${k} at ${CYC[1]} cycles reads ${v.toFixed(2)}`)
}
// --- P1 Q5: how many designs clear a level, at Experiment 2's cycle count
{
  const it = byId['ACT-SC8-P1-Q5']
  /* The level comes out of the STEM, not out of any authored table, and
     Experiment 2's cycle count is the one the passage fixes. Both are
     things a student is handed; neither is a datum this checker may hold. */
  const m = /greater than ([\d.]+) N/.exec(it.prompt)
  if (!m) fail('ACT-SC8-P1-Q5: the stem names no level to count against')
  else {
    const lvl = Number(m[1]), i = CYC.indexOf(400)
    if (i < 0) fail('ACT-SC8-P1-Q5: 400 cycles is not one of the plotted cycle counts')
    else {
      const hit = AK.filter(k => fig1[k][i] > lvl)
      rec('ACT-SC8-P1-Q5', `the closest curve to the ${lvl} N level at 400 cycles`, px1(Math.min(...AK.map(k => Math.abs(fig1[k][i] - lvl)))))
      check('ACT-SC8-P1-Q5', it.choices.find(c => c.trim() === String(hit.length)), `at 400 cycles ${hit.join('/') || 'no design'} exceeds ${lvl} (${AK.map(k => `${k} ${fig1[k][i].toFixed(2)}`).join(', ')})`)
    }
  }
}
// --- P1 Q6: extrapolate R one step past the last cycle count
{
  const s = fig1['S'], ext = 2 * s[s.length - 1] - s[s.length - 2]
  const holds = (c, v) => { let m = /less than ([\d.]+)/.exec(c); if (m) return v < Number(m[1])
    m = /greater than ([\d.]+)/.exec(c); if (m) return v > Number(m[1])
    m = /between ([\d.]+) N and ([\d.]+)/.exec(c); if (m) return v > Number(m[1]) && v < Number(m[2]); return false }
  const hits = byId['ACT-SC8-P1-Q6'].choices.filter(c => holds(c, ext))
  const edge = Math.min(...byId['ACT-SC8-P1-Q6'].choices.flatMap(c => [...String(c).matchAll(/([\d.]+) N/g)].map(m => Math.abs(ext - Number(m[1])))))
  rec('ACT-SC8-P1-Q6', 'extrapolated value vs the nearest band edge', px1(edge))
  if (hits.length !== 1) fail(`ACT-SC8-P1-Q6: extrapolated ${ext.toFixed(2)} falls in ${hits.length} of the offered bands`)
  else check('ACT-SC8-P1-Q6', hits[0], `S ${s[s.length - 2].toFixed(2)} -> ${s[s.length - 1].toFixed(2)} extrapolates to ${ext.toFixed(2)}`)
}
// --- P2 Q1: Coating 1 at the longest lighting time
{
  const LIT = Object.values(fillToLit).sort((a, b) => parseInt(a) - parseInt(b))
  const v = figB['Coating 1'][LIT[2]]
  rec('ACT-SC8-P2-Q1', `Coating 1's ${LIT[2]} bar vs the nearest other coating's ${LIT[2]} bar`, pxB(Math.min(...BK.filter(k => k !== 'Coating 1').map(k => Math.abs(figB[k][LIT[2]] - v)))))
  check('ACT-SC8-P2-Q1', nearestNumeric(byId['ACT-SC8-P2-Q1'], v), `Coating 1 at ${LIT[2]} reads ${v.toFixed(2)}`)
}
// --- P2 Q2: which coating is greater on black card
{
  const up = BK.filter(k => table[k][BLACK] > table[k][WHITE])
  if (up.length !== 1) fail(`ACT-SC8-P2-Q2: ${up.length} coatings are greater on black card - no unique answer`)
  else check('ACT-SC8-P2-Q2', named(byId['ACT-SC8-P2-Q2'], new RegExp(`^${up[0]}$`)), `${up[0]}: ${table[up[0]][WHITE]} on white, ${table[up[0]][BLACK]} on black`)
}
// --- P2 Q3: how many coatings rise from the shortest to the middle lighting time
{
  const LIT = Object.values(fillToLit).sort((a, b) => parseInt(a) - parseInt(b))
  const hit = BK.filter(k => figB[k][LIT[1]] > figB[k][LIT[0]])
  rec('ACT-SC8-P2-Q3', 'the smallest of the four within-coating changes counted', pxB(Math.min(...BK.map(k => Math.abs(figB[k][LIT[1]] - figB[k][LIT[0]])))))
  check('ACT-SC8-P2-Q3', byId['ACT-SC8-P2-Q3'].choices.find(c => c.trim() === String(hit.length)), `${LIT[0]} -> ${LIT[1]} rises for ${hit.join('/') || 'none'} = ${hit.length}`)
}
// --- P2 Q4: longest black-card glow, then read Figure 1 at the shortest lighting time
{
  const ranked = BK.map(k => [k, table[k][BLACK]]).sort((a, b) => b[1] - a[1])
  const k = ranked[0][0], LIT = Object.values(fillToLit).sort((a, b) => parseInt(a) - parseInt(b))
  const v = figB[k][LIT[0]]
  rec('ACT-SC8-P2-Q4', `${k} vs the nearest other coating's ${LIT[0]} bar`, pxB(Math.min(...BK.filter(o => o !== k).map(o => Math.abs(figB[o][LIT[0]] - v)))))
  check('ACT-SC8-P2-Q4', nearestNumeric(byId['ACT-SC8-P2-Q4'], v), `longest on black card is ${k} (${ranked[0][1]}, next ${ranked[1][0]} ${ranked[1][1]}); ${k} at ${LIT[0]} reads ${v.toFixed(2)}`)
}
// --- P2 Q5: the one pair whose order reverses between the two columns
{
  const inv = []
  for (let i = 0; i < BK.length; i++) for (let j = i + 1; j < BK.length; j++) {
    const a = BK[i], b = BK[j]
    if (Math.sign(table[a][WHITE] - table[b][WHITE]) !== Math.sign(table[a][BLACK] - table[b][BLACK])) inv.push([a, b])
  }
  console.log(`    (pairs whose order reverses between ${WHITE} and ${BLACK}: ${inv.map(p => p.join('+')).join(', ') || 'none'})`)
  if (inv.length !== 1) fail(`ACT-SC8-P2-Q5: ${inv.length} pairs reverse - the item has no unique answer`)
  else {
    const [a, b] = inv[0]
    const opt = byId['ACT-SC8-P2-Q5'].choices.find(c => c.includes(a) && c.includes(b))
    check('ACT-SC8-P2-Q5', opt, `${a}/${b}: ${table[a][WHITE]} vs ${table[b][WHITE]} on white, ${table[a][BLACK]} vs ${table[b][BLACK]} on black`)
  }
}
// --- P2 Q6: interpolate each coating to Experiment 2's lighting time
{
  const it = byId['ACT-SC8-P2-Q6']
  const LIT = Object.values(fillToLit).sort((a, b) => parseInt(a) - parseInt(b))
  /* The target lighting time is read off Table 1's own caption in the
     drawing ("lit for 8 min"), not supplied to this checker. */
  const cap = /lit for (\d+)\s*min/.exec(S2.of('text').map(t => String(t.text ?? '')).join(' '))
  if (!cap) { fail('ACT-SC8-P2-Q6: nothing in the drawing names Experiment 2\'s lighting time') }
  else {
    const t = Number(cap[1]), a = parseInt(LIT[1]), b = parseInt(LIT[2])
    if (!(t > a && t < b)) fail(`ACT-SC8-P2-Q6: ${t} min does not lie between the ${a} and ${b} min lightings`)
    const f = (t - a) / (b - a)
    const interp = Object.fromEntries(BK.map(k => [k, figB[k][LIT[1]] + f * (figB[k][LIT[2]] - figB[k][LIT[1]])]))
    const ranked = BK.map(k => [k, interp[k]]).sort((x, y) => x[1] - y[1])
    console.log(`    (interpolated to ${t} min: ${ranked.map(r => `${r[0]} ${r[1].toFixed(2)}`).join(', ')})`)
    rec('ACT-SC8-P2-Q6', 'shortest interpolated value vs runner-up', pxB(ranked[1][1] - ranked[0][1]))
    check('ACT-SC8-P2-Q6', it.choices.find(c => c.trim() === ranked[0][0]), `${ranked[0][0]} interpolates to ${ranked[0][1].toFixed(2)} at ${t} min, next ${ranked[1][0]} at ${ranked[1][1].toFixed(2)}`)
  }
}

/* ---------- 9. margin ledger and verdict ---------- */
console.log(`\ndecisive comparisons, in served pixels at ${SERVED_W}px wide (threshold ${MIN_MARGIN}px):`)
for (const m of margins.sort((a, b) => a.px - b.px)) console.log(`  ${m.px.toFixed(1).padStart(6)} px  ${m.id}  ${m.what}`)
console.log(`\nchecked: 3 figures, 1 table, 4 axes, ${curves.length} curves, ${markers.length} markers, ${bars2.length + barsB.length} bars, ${body.length}x${COLS.length} table cells, 12 items re-answered`)
if (fails.length) { console.error(`\nVERIFY FAILED - ${fails.length} problem(s):\n  ` + fails.join('\n  ')); process.exit(1) }
console.log('\nVERIFY OK - every value re-read from the drawing agrees with the keys, and every decisive comparison clears the margin threshold')
