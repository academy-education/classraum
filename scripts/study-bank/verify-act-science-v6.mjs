#!/usr/bin/env node
/**
 * verify-act-science-v6.mjs — reconstruct BOTH act-science-v6 figures FROM
 * THEIR DRAWN GEOMETRY and re-answer all six items from the reconstruction.
 *
 * There is no table of clearing times in this file and the batch JSON is
 * never read for one: the only numbers this script has are pixel
 * coordinates and axis tick LABELS scraped out of the SVG, which is
 * exactly what a student has. It
 *
 *   - pairs each y-axis tick label with the nearest drawn MAJOR tick line
 *     and fits value = a*y + b by least squares, per figure, refusing the
 *     file if any label is off its own fit (the v6 predecessor caught a
 *     real 2.5-unit axis error in its own first draft exactly here),
 *   - does the same for the Figure 1 x axis,
 *   - identifies the four series the way a student does — by matching each
 *     bold end-of-curve letter to a curve endpoint under one shared
 *     baseline offset, refusing an ambiguous or swapped legend — and
 *     cross-checks that every series has its own dash pattern and its own
 *     marker shape,
 *   - checks every plotted marker against a vertex of its own polyline,
 *   - reads each Figure 2 bar off the fitted Figure 2 axis twice, from its
 *     top and from its height, and refuses a bar that does not stand on
 *     the plot floor,
 *   - re-derives Experiment 2's concentration by finding which Figure 1
 *     column the unstirred bars reproduce (the batch's own strongest
 *     internal evidence, checked rather than assumed),
 *   - converts every comparison an item turns on into RENDERED PIXELS at
 *     the narrowest width the app serves, and refuses the figure if the
 *     thinnest one is not resolvable — this is the defect the batch was
 *     held on,
 *   - and only then answers the six items and compares each with its key.
 *
 * INPUT IDENTITY. It asserts the exact item count and the exact ids and
 * exits 2 if either is wrong. A check that cannot name the bytes it read
 * must not return a number.
 *
 *   node verify-act-science-v6.mjs [batch.json]
 *   exit 0 = every reconstruction, every margin and every key agrees
 *   exit 1 = a verification failure (named)
 *   exit 2 = the input is not the file this checker is about
 */
import { readFileSync } from 'node:fs'

const FILE = process.argv[2] ?? new URL('./act-science-v6.batch.json', import.meta.url).pathname

const EXPECT_IDS = [
  'ACT-SC6-P1-Q1', 'ACT-SC6-P1-Q2', 'ACT-SC6-P1-Q3',
  'ACT-SC6-P1-Q4', 'ACT-SC6-P1-Q5', 'ACT-SC6-P1-Q6',
]

/* How the app actually serves this SVG (RawSvgFigure in
 * src/app/mobile/study/session/[id]/test/QuestionGraphicView.tsx):
 *   <div class="w-full [&_svg]:w-full [&_svg]:h-auto [&_svg]:max-h-[300px]">
 * inside a max-w-md card with p-4. So the drawing is scaled by
 *   min(servedWidth / viewBoxWidth, 300 / viewBoxHeight)
 * and the narrowest width a phone gives that card is about 260 CSS px.
 * Every margin below is reported in those pixels, not in viewBox units. */
const NARROWEST_SERVED_PX = 260
const MAX_RENDER_HEIGHT_PX = 300
/* TWO gates, because the items turn on two different things.
 *
 * SEPARATION — two drawn elements a reader must SEE as different: one bar
 * top against another, a marker against a neighbouring series, a point
 * against the additive-free level. This is the class the batch was held
 * on: its key comparison was 2 min = 2.4 px and the nearest distractor
 * pair 1 min = 1.2 px, about one stroke width. 8 px is a step a reader
 * sees at a glance; the repaired figure's thinnest is 4 min = 8.8 px, so
 * the gate has ~10% headroom and a 3 min version of any of them fails.
 *
 * OPTION RESOLUTION — how accurately a value must be READ off the ruler to
 * land on the right choice. Here the requirement is not a gap between two
 * inked things but that half the distance to the nearest other option
 * exceeds the reader's error in reading one point, taken as a quarter of
 * the MINOR gridline interval. That interval is itself measured off the
 * drawing, which is why Figure 2 having had no minor ticks at all was a
 * defect and not a style note. */
const MIN_SEPARATION_PX = 8.0
const READ_ERROR_OF_MINOR = 0.25
const MIN_MINOR_INTERVAL_PX = 8.0

const die2 = m => { console.error(`INPUT REFUSED: ${m}`); process.exit(2) }
const fails = []
const fail = m => { fails.push(m); console.log(`  FAIL  ${m}`) }
const pass = m => console.log(`  ok    ${m}`)

/* ---------- 0. input identity ---------- */
let batch
try { batch = JSON.parse(readFileSync(FILE, 'utf8')) } catch (e) { die2(`${FILE}: ${e.message}`) }
if (!Array.isArray(batch)) die2('batch is not an array')
console.log(`read ${FILE}`)
console.log(`items read: ${batch.length} (expected ${EXPECT_IDS.length})`)
if (batch.length !== EXPECT_IDS.length) die2(`${batch.length} items, this checker is only about the ${EXPECT_IDS.length}-item v6 batch`)
const gotIds = batch.map(i => i.id)
if (gotIds.join(',') !== EXPECT_IDS.join(',')) die2(`ids are not the v6 ids, in order.\n  got:  ${gotIds.join(' ')}\n  want: ${EXPECT_IDS.join(' ')}`)
const byId = Object.fromEntries(batch.map(i => [i.id, i]))
const svgs = new Set(batch.map(i => i.graphic?.svg ?? null))
if (svgs.size !== 1 || [...svgs][0] == null) die2(`the ${batch.length} items do not share one graphic.svg (${svgs.size} distinct)`)
const SVG = [...svgs][0]
console.log(`items sharing 1 identical SVG of ${SVG.length} bytes`)

/* ---------- 1. scan the SVG into tags ---------- */
const tags = []
const TAG = /<([a-zA-Z]+)((?:\s+[a-zA-Z0-9:_-]+\s*=\s*"[^"]*")*)\s*\/?>(?:([^<]*)<\/\1>)?/g
for (const m of SVG.matchAll(TAG)) {
  const attrs = {}
  for (const a of m[2].matchAll(/([a-zA-Z0-9:_-]+)\s*=\s*"([^"]*)"/g)) attrs[a[1]] = a[2]
  tags.push({ name: m[1], attrs, text: m[3] ?? null })
}
const of = n => tags.filter(t => t.name === n)
const num = v => Number(v)
console.log(`svg tags: ${tags.length} (text ${of('text').length}, line ${of('line').length}, rect ${of('rect').length}, polyline ${of('polyline').length}, polygon ${of('polygon').length}, circle ${of('circle').length})`)

/* ---------- 1b. the served scale, from the viewBox the file declares ---------- */
const vb = /viewBox="([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)"/.exec(SVG)
if (!vb) die2('the SVG has no viewBox, so nothing can be said about its rendered size')
const VBW = Number(vb[3]), VBH = Number(vb[4])
const SCALE = Math.min(NARROWEST_SERVED_PX / VBW, MAX_RENDER_HEIGHT_PX / VBH)
console.log(`viewBox ${VBW}x${VBH} -> at a ${NARROWEST_SERVED_PX}px card the drawing renders at scale ${SCALE.toFixed(4)} (${(VBW * SCALE).toFixed(0)}x${(VBH * SCALE).toFixed(0)} px)`)

/* ---------- 2. the two plot frames, from the drawn axes ---------- */
const frames = []
for (const p of of('path')) {
  const m = /^M([\d.]+),([\d.]+)\s*V([\d.]+)\s*H([\d.]+)$/.exec(String(p.attrs.d ?? '').trim())
  if (m && p.attrs.stroke === '#000') frames.push({ x0: num(m[1]), top: num(m[2]), bottom: num(m[3]), x1: num(m[4]) })
}
frames.sort((a, b) => a.top - b.top)
if (frames.length !== 2) { console.error(`expected 2 plot frames drawn as an L-shaped axis path, found ${frames.length}`); process.exit(1) }
const [F1, F2] = frames
console.log(`frames: Fig1 y ${F1.top}..${F1.bottom} x ${F1.x0}..${F1.x1} | Fig2 y ${F2.top}..${F2.bottom} x ${F2.x0}..${F2.x1}`)

/* ---------- 3. axis calibration by least squares ---------- */
const lsq = pts => {
  const n = pts.length, sx = pts.reduce((s, p) => s + p[0], 0), sy = pts.reduce((s, p) => s + p[1], 0)
  const sxx = pts.reduce((s, p) => s + p[0] * p[0], 0), sxy = pts.reduce((s, p) => s + p[0] * p[1], 0)
  const a = (n * sxy - sx * sy) / (n * sxx - sx * sx)
  return { a, b: (sy - a * sx) / n }
}
/* MAJOR ticks only. Both figures also draw shorter unlabelled minor ticks,
   and a calibration that paired 6 labels with 11 tick lines would silently
   drop half its evidence. They are told apart by LENGTH, which is on the
   page, not by a colour or a class name. */
const allYTicks = of('line').filter(t => num(t.attrs.y1) === num(t.attrs.y2) && Math.abs(num(t.attrs.x2) - F1.x0) < 0.01 && num(t.attrs.x2) > num(t.attrs.x1))
const tickLen = t => num(t.attrs.x2) - num(t.attrs.x1)
const yMajor = allYTicks.filter(t => tickLen(t) >= 3.5)
console.log(`y-axis tick marks: ${allYTicks.length} drawn, ${yMajor.length} major (>=3.5 long), ${allYTicks.length - yMajor.length} minor`)
const endLabels = of('text').filter(t => t.attrs['text-anchor'] === 'end' && /^-?[\d.]+$/.test(String(t.text).trim()))

function calibrateY(frame, tag) {
  const ticks = yMajor.filter(t => num(t.attrs.y1) >= frame.top - 1 && num(t.attrs.y1) <= frame.bottom + 1)
  const minors = allYTicks.filter(t => tickLen(t) < 3.5 && num(t.attrs.y1) >= frame.top - 1 && num(t.attrs.y1) <= frame.bottom + 1)
  const labs = endLabels.filter(t => num(t.attrs.y) >= frame.top - 8 && num(t.attrs.y) <= frame.bottom + 8)
  const pairs = []
  for (const l of labs) {
    const ly = num(l.attrs.y)
    const sorted = ticks.map(t => ({ y: num(t.attrs.y1), d: Math.abs(num(t.attrs.y1) - ly) })).sort((p, q) => p.d - q.d)
    if (!sorted.length) { fail(`${tag}: axis label "${l.text}" has no major tick line`); continue }
    if (sorted.length > 1 && sorted[1].d - sorted[0].d < 4) { fail(`${tag}: axis label "${l.text}" is equidistant between two ticks — cannot be calibrated`); continue }
    if (sorted[0].d > 8) { fail(`${tag}: axis label "${l.text}" is ${sorted[0].d.toFixed(1)} from the nearest tick`); continue }
    pairs.push([sorted[0].y, Number(l.text)])
  }
  if (pairs.length !== ticks.length) fail(`${tag}: ${ticks.length} major tick lines but ${pairs.length} usable labels`)
  if (pairs.length < 3) { fail(`${tag}: only ${pairs.length} calibration points`); return null }
  const fit = lsq(pairs)
  const worst = Math.max(...pairs.map(([y, v]) => Math.abs(fit.a * y + fit.b - v)))
  const vals = pairs.map(p => p[1]).sort((a, b) => a - b)
  const step = Math.max(...vals.slice(1).map((v, i) => v - vals[i]))
  console.log(`  ${tag}: ${pairs.length} labelled ticks ${vals.join('/')} -> min = ${fit.a.toFixed(5)}*y + ${fit.b.toFixed(4)}, worst residual ${worst.toFixed(4)}`)
  if (worst > 0.02) fail(`${tag}: axis labels do not lie on one straight line — worst residual ${worst.toFixed(4)} (a mislabelled or misplaced tick)`)
  else pass(`${tag} axis is linear to ${worst.toFixed(4)}`)
  if (Math.abs(fit.a * frame.bottom + fit.b) > 0.02) fail(`${tag}: the plot floor reads ${(fit.a * frame.bottom + fit.b).toFixed(4)}, not 0`)
  /* The hold: Figure 2 carried labels at 0/25/50 and nothing between, so a
     reader had no ruler finer than 25 min anywhere on the panel. */
  if (step > 10.001) fail(`${tag}: labelled ticks are ${step} min apart — a reader has no ruler finer than that`)
  else pass(`${tag} is labelled every ${step} min`)
  const minorStep = minors.length ? step / (minors.length / (pairs.length - 1) + 1) : null
  console.log(`  ${tag}: ${minors.length} minor ticks between them${minorStep ? ` (one every ${minorStep} min)` : ''}`)
  if (!minors.length) fail(`${tag}: no minor ticks at all — the finest ruler on the panel is ${step} min`)
  const perMin = Math.abs(1 / fit.a)
  if (minorStep != null && minorStep * perMin * SCALE < MIN_MINOR_INTERVAL_PX)
    fail(`${tag}: minor gridlines are ${(minorStep * perMin * SCALE).toFixed(1)} px apart — too close together to read against`)
  return { at: y => fit.a * y + fit.b, perMin, minorStep }
}
console.log('axis calibration:')
const A1 = calibrateY(F1, 'Fig1 y')
const A2 = calibrateY(F2, 'Fig2 y')
if (!A1 || !A2) { console.error(`\nVERIFY FAILED — the axes could not be calibrated, so no value is reconstructible:\n  ` + fails.join('\n  ')); process.exit(1) }
const px1 = A1.perMin * SCALE, px2 = A2.perMin * SCALE
console.log(`  rendered resolution at ${NARROWEST_SERVED_PX}px: Fig1 ${px1.toFixed(3)} px/min, Fig2 ${px2.toFixed(3)} px/min`)

const xTicks = of('line').filter(t => num(t.attrs.x1) === num(t.attrs.x2) && num(t.attrs.y1) >= F1.bottom - 0.01 && num(t.attrs.y1) <= F1.bottom + 1)
const midLabels = of('text').filter(t => t.attrs['text-anchor'] === 'middle' && /^\d+$/.test(String(t.text).trim()) && num(t.attrs.y) > F1.bottom && num(t.attrs.y) < F1.bottom + 20)
const xPairs = []
for (const l of midLabels) {
  const s = xTicks.map(t => ({ x: num(t.attrs.x1), d: Math.abs(num(t.attrs.x1) - num(l.attrs.x)) })).sort((p, q) => p.d - q.d)
  if (s.length && s[0].d < 3) xPairs.push([s[0].x, Number(l.text)])
}
if (xPairs.length !== xTicks.length || xPairs.length < 3) fail(`Fig1 x: ${xTicks.length} ticks, ${xPairs.length} labels paired`)
const xfit = lsq(xPairs)
const xworst = Math.max(...xPairs.map(([x, v]) => Math.abs(xfit.a * x + xfit.b - v)))
console.log(`  Fig1 x: ${xPairs.length} ticks ${xPairs.map(p => p[1]).join('/')} -> mg/L = ${xfit.a.toFixed(5)}*x + ${xfit.b.toFixed(4)}, worst residual ${xworst.toFixed(4)}`)
if (xworst > 0.05) fail(`Fig1 x axis labels are not linear in x — worst residual ${xworst.toFixed(3)}`)
else pass(`Fig1 x axis is linear to ${xworst.toFixed(4)}`)
const concAt = x => xfit.a * x + xfit.b

/* ---------- 4. series: read the letters off the curve ends ---------- */
const polylines = of('polyline').map(p => ({
  dash: p.attrs['stroke-dasharray'] ?? 'solid',
  pts: String(p.attrs.points).trim().split(/\s+/).map(s => s.split(',').map(Number)),
}))
console.log(`curves: ${polylines.length}, vertices ${polylines.map(p => p.pts.length).join('/')}`)
if (new Set(polylines.map(p => p.dash)).size !== polylines.length) fail('two curves share a dash pattern — they cannot be told apart')
else pass(`${polylines.length} distinct dash patterns: ${polylines.map(p => p.dash).join(' | ')}`)

const letterLabels = of('text').filter(t => t.attrs['font-weight'] === 'bold' && /^[A-Z]$/.test(String(t.text).trim()) && num(t.attrs.x) > F1.x1 && num(t.attrs.y) < F1.bottom + 10)
const series = {}
{
  const labs = letterLabels.map(l => ({ k: String(l.text).trim(), y: num(l.attrs.y) }))
  const ends = polylines.map(p => ({ p, y: p.pts[p.pts.length - 1][1] }))
  if (labs.length !== ends.length) fail(`${labs.length} legend letters for ${ends.length} curves`)
  else {
    const perms = []
    const permute = (rest, acc) => { if (!rest.length) return perms.push(acc); rest.forEach((e, i) => permute(rest.filter((_, j) => j !== i), acc.concat([e]))) }
    permute(ends, [])
    const scored = perms.map(pm => {
      const r = labs.map((l, i) => l.y - pm[i].y)
      const c = r.reduce((a, b) => a + b, 0) / r.length
      return { pm, c, rms: Math.sqrt(r.reduce((a, b) => a + (b - c) ** 2, 0) / r.length) }
    }).sort((a, b) => a.rms - b.rms)
    const best = scored[0], next = scored[1]
    console.log(`legend fit: baseline offset ${best.c.toFixed(2)}, residual ${best.rms.toFixed(2)} (runner-up ${next.rms.toFixed(2)})`)
    if (best.rms > 1.5) fail(`the end letters do not line up with the curve ends (rms ${best.rms.toFixed(2)}) — a student cannot tell which curve is which`)
    else if (next.rms - best.rms < 2) fail(`two end letters are interchangeable within ${(next.rms - best.rms).toFixed(2)} — the labelling is ambiguous`)
    else labs.forEach((l, i) => { series[l.k] = best.pm[i].p })
  }
}
const KEYS = Object.keys(series).sort()
console.log(`series identified from end labels: ${KEYS.join(', ')} (${KEYS.length} of ${polylines.length} curves)`)
if (KEYS.length !== polylines.length) fail(`${KEYS.length} labelled curves for ${polylines.length} drawn curves`)
if (new Set(Object.values(series)).size !== KEYS.length) fail('two end letters point at the same curve')
if (!KEYS.length) { console.error(`\nVERIFY FAILED — no series could be identified:\n  ` + fails.join('\n  ')); process.exit(1) }

let clipped = 0
for (const p of polylines) for (const [x, y] of p.pts) if (x < F1.x0 - 0.5 || x > F1.x1 + 0.5 || y < F1.top - 0.5 || y > F1.bottom + 0.5) clipped++
if (clipped) fail(`${clipped} curve vertices fall outside the Figure 1 frame`); else pass('no Figure 1 vertex is clipped by its frame')

/* ---------- 5. markers must sit on vertices ---------- */
const markers = []
for (const c of of('circle')) markers.push({ kind: 'circle', r: num(c.attrs.r), x: num(c.attrs.cx), y: num(c.attrs.cy) })
for (const r of of('rect')) {
  const w = num(r.attrs.width), h = num(r.attrs.height)
  if (w > 0 && w < 6 && Math.abs(w - h) < 0.01) markers.push({ kind: 'square', x: num(r.attrs.x) + w / 2, y: num(r.attrs.y) + h / 2 })
}
for (const g of of('polygon')) {
  const pts = String(g.attrs.points).trim().split(/\s+/).map(s => s.split(',').map(Number))
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length
  if (pts.length === 3) markers.push({ kind: 'triangle', x: cx, y: pts.reduce((s, p) => s + p[1], 0) / 3 })
  else if (pts.length === 4) markers.push({ kind: 'diamond', x: cx, y: pts.reduce((s, p) => s + p[1], 0) / 4 })
}
console.log(`markers found: ${markers.length} (${['circle', 'square', 'triangle', 'diamond'].map(k => `${k} ${markers.filter(m => m.kind === k).length}`).join(', ')})`)

/* All four curves meet at the additive-free point on the left edge, which
   carries ONE shared open circle rather than four markers. Treat that
   vertex as shared — but only after checking it really is shared, since a
   curve that quietly started somewhere else would otherwise be excused. */
const starts = polylines.map(p => p.pts[0])
const sharedStart = starts.every(s => Math.abs(s[0] - starts[0][0]) < 0.01 && Math.abs(s[1] - starts[0][1]) < 0.01)
if (!sharedStart) fail('the four curves do not start at one common point, so the additive-free reading is not single-valued')
else pass(`all ${polylines.length} curves start at the one additive-free point (${starts[0][0]}, ${starts[0][1]})`)
const refMarkers = markers.filter(m => Math.hypot(m.x - starts[0][0], m.y - starts[0][1]) < 0.9)
if (refMarkers.length !== 1) fail(`the additive-free point carries ${refMarkers.length} markers, expected exactly 1`)
const refIdx = markers.indexOf(refMarkers[0])

const used = new Set(refIdx >= 0 ? [refIdx] : [])
let orphan = 0
for (const k of KEYS) {
  const shapes = new Set()
  for (let i = 1; i < series[k].pts.length; i++) {
    const [vx, vy] = series[k].pts[i]
    const hit = markers.map((m, j) => ({ m, j, d: Math.hypot(m.x - vx, m.y - vy) })).filter(h => h.j !== refIdx).sort((a, b) => a.d - b.d)[0]
    if (!hit || hit.d > 0.9) { fail(`Additive ${k}: the vertex at (${vx}, ${vy}) carries no marker within 0.9 (nearest ${hit ? hit.d.toFixed(2) : 'none'})`); orphan++; continue }
    used.add(hit.j); shapes.add(hit.m.kind)
  }
  if (shapes.size > 1) fail(`Additive ${k} is drawn with ${shapes.size} different marker shapes (${[...shapes].join(', ')})`)
}
const stray = markers.length - used.size
if (stray) fail(`${stray} marker(s) sit on no curve vertex`)
if (!orphan && !stray) pass(`all ${used.size} markers sit on a vertex of their own curve, one shape per series`)
if (new Set(KEYS.map(k => {
  const [vx, vy] = series[k].pts[1]
  return markers.filter((m, j) => j !== refIdx).map(m => ({ m, d: Math.hypot(m.x - vx, m.y - vy) })).sort((a, b) => a.d - b.d)[0]?.m.kind
})).size !== KEYS.length) fail('two series share a marker shape')

/* ---------- 6. read Figure 1 back off the geometry ---------- */
const round = v => Math.round(v * 100) / 100
const fig1 = {}, concs = []
for (const k of KEYS) {
  fig1[k] = series[k].pts.map(([, y]) => round(A1.at(y)))
  const c = series[k].pts.map(([x]) => round(concAt(x)))
  if (!concs.length) concs.push(...c)
  else if (c.join() !== concs.join()) fail(`Additive ${k} is not plotted at the same concentrations as the others`)
}
console.log(`\nFIGURE 1 reconstructed at ${concs.join('/')} mg/L:`)
for (const k of KEYS) console.log(`  Additive ${k}: ${fig1[k].map(v => v.toFixed(2).padStart(6)).join(' ')}`)
let minSep = Infinity, minSepAt = null
for (let i = 1; i < concs.length; i++) {
  const ys = KEYS.map(k => series[k].pts[i][1]).sort((a, b) => a - b)
  for (let j = 1; j < ys.length; j++) if (ys[j] - ys[j - 1] < minSep) { minSep = ys[j] - ys[j - 1]; minSepAt = concs[i] }
}
console.log(`  closest two plotted points on any one vertical: ${(minSep * SCALE).toFixed(1)} px (at ${minSepAt} mg/L)`)
if (minSep * SCALE < MIN_SEPARATION_PX) fail(`two series come within ${(minSep * SCALE).toFixed(1)} px at ${minSepAt} mg/L — a student cannot tell the markers apart`)
else pass(`series stay ${(minSep * SCALE).toFixed(1)} px apart at every concentration`)

/* ---------- 7. read Figure 2 back off the bars ---------- */
const barTags = of('rect').filter(r => num(r.attrs.width) > 12 && num(r.attrs.y) >= F2.top - 1 && num(r.attrs.y) + num(r.attrs.height) <= F2.bottom + 1)
const bars = barTags.map(r => ({
  x: num(r.attrs.x) + num(r.attrs.width) / 2, top: num(r.attrs.y), h: num(r.attrs.height),
  fill: r.attrs.fill, stroke: r.attrs.stroke ?? 'none', sw: r.attrs['stroke-width'] ?? '0',
})).sort((a, b) => a.x - b.x)
console.log(`\nbars in Figure 2: ${bars.length}`)
if (bars.length !== 8) fail(`expected 8 bars in Figure 2, found ${bars.length}`)
for (const b of bars) {
  if (Math.abs(b.top + b.h - F2.bottom) > 0.51) fail(`a bar at x=${b.x} does not stand on the plot floor (bottom ${(b.top + b.h).toFixed(2)} vs ${F2.bottom})`)
  const byTop = A2.at(b.top), byHeight = b.h / A2.perMin
  if (Math.abs(byTop - byHeight) > 0.02) fail(`a bar at x=${b.x} reads ${byTop.toFixed(3)} from its top but ${byHeight.toFixed(3)} from its height`)
}
/* THE STROKE ASYMMETRY THE BATCH WAS HELD ON. The unstirred bars were pure
   fill with no stroke while the stirred bars carried stroke-width 1, so
   every open bar's apparent top sat ~0.5 high — always in the direction of
   Q3's key. Apparent top = geometric top - strokeWidth/2, so the bias is
   only zero when every bar carries the same stroke width. */
const widths = new Set(bars.map(b => String(Number(b.sw))))
const strokes = new Set(bars.map(b => b.stroke))
console.log(`  bar strokes: ${[...strokes].join('/')} at width ${[...widths].join('/')}`)
if (widths.size !== 1) {
  const worst = Math.max(...bars.map(b => Number(b.sw))) - Math.min(...bars.map(b => Number(b.sw)))
  fail(`the bars carry ${widths.size} different stroke widths (${[...widths].join(', ')}) — the apparent tops of the two fills are biased ${(worst / 2 * SCALE).toFixed(2)} px apart before any datum is read`)
} else if (strokes.size !== 1 || [...strokes][0] === 'none') {
  fail(`the bars do not all carry the same stroke (${[...strokes].join(', ')})`)
} else pass(`both fills carry the same ${[...strokes][0]} stroke at width ${[...widths][0]} — no apparent-top bias`)

const swatches = of('rect').filter(r => num(r.attrs.width) > 6 && num(r.attrs.width) < 12)
const captions = of('text').filter(t => /^(unstirred|stirred)$/.test(String(t.text ?? '').trim()))
const fillToCond = {}
for (const c of captions) {
  const s = swatches.map(w => ({ w, d: num(c.attrs.x) - (num(w.attrs.x) + num(w.attrs.width)) })).filter(o => o.d >= 0 && o.d <= 20).sort((a, b) => a.d - b.d)[0]
  if (s) fillToCond[s.w.attrs.fill] = String(c.text).trim()
}
console.log(`  legend: ${Object.entries(fillToCond).map(([f, t]) => `${f} = ${t}`).join(', ')}`)
if (Object.keys(fillToCond).length !== 2) fail('the Figure 2 legend does not map exactly two fills to two conditions')

const groupLabels = of('text').filter(t => /^Additive [A-Z]$/.test(String(t.text ?? '').trim()) && num(t.attrs.y) > F2.bottom)
const fig2 = {}
for (let i = 0; i < bars.length; i += 2) {
  const g = bars.slice(i, i + 2)
  const cx = (g[0].x + g[1].x) / 2
  const l = groupLabels.map(t => ({ t, d: Math.abs(num(t.attrs.x) - cx) })).sort((a, b) => a.d - b.d)
  if (!l.length || l[0].d > 6 || (l.length > 1 && l[1].d - l[0].d < 6)) { fail(`the bar pair centred at x=${cx.toFixed(1)} has no unambiguous additive label`); continue }
  const k = String(l[0].t.text).trim().split(' ')[1]
  fig2[k] = {}
  for (const b of g) fig2[k][fillToCond[b.fill] ?? `fill ${b.fill}`] = round(A2.at(b.top))
}
console.log('FIGURE 2 reconstructed:')
for (const k of Object.keys(fig2).sort()) console.log(`  Additive ${k}: ${Object.entries(fig2[k]).map(([t, v]) => `${t} ${v.toFixed(2)}`).join('   ')}`)
if (Object.keys(fig2).sort().join() !== KEYS.join()) fail(`Figure 2 additives ${Object.keys(fig2).sort().join('/')} do not match Figure 1 additives ${KEYS.join('/')}`)
const F2OK = KEYS.every(k => fig2[k] && 'unstirred' in fig2[k] && 'stirred' in fig2[k])
if (!F2OK) fail('a Figure 2 pair is missing one of its two conditions')

/* ---------- 8. which Figure 1 column do the unstirred bars reproduce? ---------- */
/* The batch's strongest internal evidence, and Q2 and Q4 both rest on it:
   Experiment 2 is run at one concentration, and the figure says which by
   making the unstirred bars equal Figure 1's column there. Derive it,
   never assume it. */
let expTwoConc = null
if (F2OK) {
  const hits = concs.map((c, i) => ({ c, err: Math.max(...KEYS.map(k => Math.abs(fig1[k][i] - fig2[k].unstirred))) }))
    .sort((a, b) => a.err - b.err)
  console.log(`\nunstirred bars vs each Figure 1 column: ${hits.map(h => `${h.c} mg/L off by ${h.err.toFixed(2)}`).join(', ')}`)
  if (hits[0].err > 0.02) fail(`the unstirred bars match no Figure 1 column (closest ${hits[0].c} mg/L, off by ${hits[0].err.toFixed(2)} min)`)
  else if (hits[1].err < 1) fail(`the unstirred bars match both ${hits[0].c} and ${hits[1].c} mg/L — Experiment 2's concentration is not identifiable from the figure`)
  else { expTwoConc = hits[0].c; pass(`the unstirred bars reproduce the Figure 1 column at ${expTwoConc} mg/L exactly (next-closest column off by ${hits[1].err.toFixed(1)} min)`) }
}

/* ---------- 9. every comparison an item turns on, in rendered pixels ---------- */
const margins = []
/* kind 'sep'  — two drawn things that must look different (gated in px)
   kind 'opt'  — the gap to the nearest other option, which a reader has to
                 out-resolve when reading a value off the ruler (gated in
                 minutes against the minor gridline interval) */
const margin = (item, kind, what, min, fig) => margins.push({ item, kind, what, min, px: min * (fig === 2 ? px2 : px1), fig })

/* ---------- 10. re-answer the six items ---------- */
console.log(`\nre-answering the ${batch.length} items from the reconstruction:`)
const iAt = c => concs.indexOf(c)
const at = (k, c) => fig1[k][iAt(c)]
const check = (id, derived, why) => {
  const it = byId[id]
  if (derived == null) { fail(`${id}: could not derive an answer (${why})`); return }
  if (derived === it.correct_answer) pass(`${id}: geometry gives "${derived}" — matches the key   [${why}]`)
  else fail(`${id}: geometry gives "${derived}" but the key is "${it.correct_answer}"   [${why}]`)
}
const nearestNumeric = (item, v) => {
  const opts = item.choices.map(c => ({ c, n: Number(/(-?[\d.]+)/.exec(c)?.[1]) })).filter(o => Number.isFinite(o.n)).sort((a, b) => Math.abs(a.n - v) - Math.abs(b.n - v))
  return opts[0]
}
const addOpt = (item, k) => item.choices.find(c => new RegExp(`Additive ${k}\\b`).test(c))
/* The stem, not this file, says which curve and which concentration. */
const stemLetter = id => /Additive ([A-Z])\b/.exec(byId[id].prompt)?.[1] ?? null
const stemConc = id => { const m = /([\d.]+)\s*mg\/L/.exec(byId[id].prompt); return m ? Number(m[1]) : null }

// Q1 — read one plotted value off one named curve
{
  const id = 'ACT-SC6-P1-Q1', k = stemLetter(id), c = stemConc(id)
  const v = at(k, c)
  const best = nearestNumeric(byId[id], v)
  const rest = byId[id].choices.map(o => Number(/(-?[\d.]+)/.exec(o)[1])).filter(n => n !== best.n)
  margin(id, 'opt', `the read (${k} at ${c} mg/L = ${v}) against the nearest other option`, Math.min(...rest.map(n => Math.abs(n - v))), 1)
  margin(id, 'sep', `${k}'s marker at ${c} mg/L against the nearest other series`, Math.min(...KEYS.filter(o => o !== k).map(o => Math.abs(at(o, c) - v))), 1)
  check(id, best.c, `${k} at ${c} mg/L reads ${v.toFixed(2)}`)
}
// Q2 — at Experiment 2's concentration, whose curve is at its own maximum?
{
  const id = 'ACT-SC6-P1-Q2'
  if (expTwoConc == null) fail(`${id}: Experiment 2's concentration is not recoverable from the figure`)
  else {
    const i = iAt(expTwoConc)
    const tested = concs.map((c, j) => j).filter(j => concs[j] > 0)
    const win = KEYS.filter(k => tested.every(j => fig1[k][j] <= fig1[k][i] + 1e-9))
    for (const k of KEYS) {
      const others = tested.filter(j => j !== i).map(j => fig1[k][j])
      margin(id, 'sep', k === win[0] ? `${k} at ${expTwoConc} above its own next-highest` : `${k}'s maximum above its value at ${expTwoConc}`,
        Math.abs(Math.max(...others) - fig1[k][i]), 1)
    }
    if (win.length !== 1) fail(`${id}: ${win.length} additives are at their maximum at ${expTwoConc} mg/L (${win.join('/')}) — no unique answer`)
    else check(id, addOpt(byId[id], win[0]), `at ${expTwoConc} mg/L only ${win[0]} is at its own greatest (${fig1[win[0]][i]})`)
  }
}
// Q3 — whose stirred bar is taller than its unstirred bar?
{
  const id = 'ACT-SC6-P1-Q3'
  if (!F2OK) fail(`${id}: Figure 2 did not reconstruct`)
  else {
    const win = KEYS.filter(k => fig2[k].stirred > fig2[k].unstirred)
    for (const k of KEYS) margin(id, 'sep', `${k}'s stirred bar against its unstirred bar`, Math.abs(fig2[k].stirred - fig2[k].unstirred), 2)
    if (win.length !== 1) fail(`${id}: ${win.length} additives have stirred above unstirred (${win.join('/')}) — no unique answer`)
    else check(id, addOpt(byId[id], win[0]), `only ${win[0]} rises, ${fig2[win[0]].unstirred} -> ${fig2[win[0]].stirred}`)
  }
}
// Q4 — the biggest fall in Figure 2, then that curve read in Figure 1
{
  const id = 'ACT-SC6-P1-Q4', c = stemConc(id)
  if (!F2OK) fail(`${id}: Figure 2 did not reconstruct`)
  else {
    const drops = KEYS.map(k => [k, fig2[k].unstirred - fig2[k].stirred]).sort((a, b) => b[1] - a[1])
    margin(id, 'sep', `the largest fall (${drops[0][0]}, ${drops[0][1]}) against the next-largest change`, drops[0][1] - Math.max(...drops.slice(1).map(d => Math.abs(d[1]))), 2)
    const k = drops[0][0], v = at(k, c)
    const best = nearestNumeric(byId[id], v)
    const rest = byId[id].choices.map(o => Number(/(-?[\d.]+)/.exec(o)[1])).filter(n => n !== best.n)
    margin(id, 'opt', `the read (${k} at ${c} mg/L = ${v}) against the nearest other option`, Math.min(...rest.map(n => Math.abs(n - v))), 1)
    check(id, best.c, `largest fall is ${k} (${drops[0][1]} min); ${k} at ${c} mg/L reads ${v.toFixed(2)}`)
  }
}
// Q5 — interpolate one curve between two plotted points
{
  const id = 'ACT-SC6-P1-Q5', k = stemLetter(id), c = stemConc(id)
  const lo = concs.filter(x => x < c).pop(), hi = concs.find(x => x > c)
  const v = at(k, lo) + (at(k, hi) - at(k, lo)) * (c - lo) / (hi - lo)
  margin(id, 'sep', `the span ${k} is interpolated across (${lo}->${hi} mg/L)`, Math.abs(at(k, hi) - at(k, lo)), 1)
  const best = nearestNumeric(byId[id], v)
  const rest = byId[id].choices.map(o => Number(/(-?[\d.]+)/.exec(o)[1])).filter(n => n !== best.n)
  margin(id, 'opt', `the interpolated value against the nearest other option`, Math.min(...rest.map(n => Math.abs(n - v))), 1)
  check(id, best.c, `${k} runs ${at(k, lo)} at ${lo} to ${at(k, hi)} at ${hi}; at ${c} that is ${v.toFixed(2)}`)
}
// Q6 — which curve falls below the additive-free level?
{
  const id = 'ACT-SC6-P1-Q6'
  const ref = round(A1.at(starts[0][1]))
  const tested = concs.map((x, j) => j).filter(j => concs[j] > 0)
  const win = KEYS.filter(k => tested.some(j => fig1[k][j] < ref))
  for (const k of KEYS) {
    const lo = Math.min(...tested.map(j => fig1[k][j]))
    margin(id, 'sep', win.includes(k) ? `${k}'s deepest point below the additive-free level (${ref})` : `${k}'s lowest point above the additive-free level (${ref})`, Math.abs(ref - lo), 1)
  }
  console.log(`  additive-free reference read off the shared left-hand point: ${ref} min`)
  if (win.length !== 1) fail(`${id}: ${win.length} additives fall below ${ref} min (${win.join('/')}) — no unique answer`)
  else check(id, addOpt(byId[id], win[0]), `only ${win[0]} goes below ${ref} (down to ${Math.min(...tested.map(j => fig1[win[0]][j]))})`)
}

/* ---------- 11. the resolution gates ---------- */
const readErr = Math.max(A1.minorStep ?? Infinity, A2.minorStep ?? Infinity) * READ_ERROR_OF_MINOR
console.log(`\nevery comparison an item turns on, at a ${NARROWEST_SERVED_PX}px card (minor gridlines ${A1.minorStep}/${A2.minorStep} min -> a point is readable to about +-${readErr} min):`)
margins.sort((a, b) => (a.kind === b.kind ? a.px - b.px : a.kind < b.kind ? -1 : 1))
const seps = margins.filter(m => m.kind === 'sep').sort((a, b) => a.px - b.px)
const opts = margins.filter(m => m.kind === 'opt').sort((a, b) => a.min - b.min)
console.log(`  SEPARATION — two drawn things a reader must see as different (floor ${MIN_SEPARATION_PX} px):`)
for (const m of seps) console.log(`    ${m.px < MIN_SEPARATION_PX ? 'THIN' : '    '}  ${m.px.toFixed(1).padStart(5)} px  ${String(m.min).padStart(5)} min  Fig${m.fig}   ${m.item}  ${m.what}`)
console.log(`  OPTION RESOLUTION — half this gap must beat the +-${readErr} min read error:`)
for (const m of opts) console.log(`    ${m.min / 2 < readErr ? 'THIN' : '    '}  ${(m.min / 2).toFixed(2).padStart(5)} min half-gap (${m.px.toFixed(1)} px)   ${m.item}  ${m.what}`)
if (!seps.length || !opts.length) fail(`no margins of one of the two kinds were measured (${seps.length} separation, ${opts.length} option) — the items were not re-answered, so these gates proved nothing`)
else {
  if (seps[0].px < MIN_SEPARATION_PX) fail(`the thinnest separation is ${seps[0].px.toFixed(1)} px (${seps[0].item}: ${seps[0].what}), under the ${MIN_SEPARATION_PX} px a reader sees without magnifying`)
  else pass(`the thinnest of ${seps.length} separations is ${seps[0].px.toFixed(1)} px (${seps[0].item}), above the ${MIN_SEPARATION_PX} px floor`)
  if (opts[0].min / 2 < readErr) fail(`${opts[0].item}: the nearest other option is only ${opts[0].min} min away, so a reader must read the figure to better than +-${(opts[0].min / 2).toFixed(2)} min against a +-${readErr} min ruler`)
  else pass(`the tightest of ${opts.length} option gaps leaves +-${(opts[0].min / 2).toFixed(2)} min of read tolerance, above the +-${readErr} min the ruler supports`)
}

/* ---------- 12. verdict ---------- */
console.log(`\nchecked: 2 figures, 3 axes, ${polylines.length} curves, ${markers.length} markers, ${bars.length} bars, ${seps.length} separations, ${opts.length} option gaps, ${batch.length} items re-answered`)
if (fails.length) { console.error(`\nVERIFY FAILED — ${fails.length} problem(s):\n  ` + fails.join('\n  ')); process.exit(1) }
console.log('\nVERIFY OK — every value re-read from the drawing agrees with the keys, and every comparison is resolvable')
