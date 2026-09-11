#!/usr/bin/env node
/**
 * verify-act-science-v7.mjs — reconstruct the act-science-v7 Data
 * Representation figure FROM ITS DRAWN GEOMETRY and re-answer every item
 * of that passage from the reconstruction.
 *
 * The point of this script is that it never reads an authored data table.
 * There is no table of warp values in this file and none in the batch
 * JSON: the only numbers it has are pixel coordinates and axis tick
 * LABELS scraped out of the SVG, exactly what a student has. It
 *
 *   - pairs each y-axis tick label with the nearest drawn tick line and
 *     fits value = a*y + b by least squares, per figure, then refuses the
 *     file if any label is off its own fit (a mis-typed axis is the defect
 *     the v6 verifier caught in its own first draft),
 *   - does the same for the x axis,
 *   - identifies the four series the way a student does: by matching each
 *     bold end-of-curve letter to the nearest curve endpoint, refusing if
 *     the nearest is ambiguous, and cross-checking that each series has
 *     its own dash pattern and its own marker shape,
 *   - checks every plotted marker against a vertex of its own polyline,
 *   - checks every bar of Figure 2 against the plot floor and reads its
 *     value off the fitted Figure 2 axis,
 *   - and only then answers the six questions and compares with the keys.
 *
 * INPUT IDENTITY. It asserts the exact item count and the exact ids and
 * exits 2 if either is wrong. A check that cannot name the bytes it read
 * must not return a number.
 *
 *   node verify-act-science-v7.mjs [batch.json]
 *   exit 0 = every reconstruction and every key agrees
 *   exit 1 = a verification failure (named)
 *   exit 2 = the input is not the file this checker is about
 */
import { readFileSync } from 'node:fs'

const FILE = process.argv[2] ?? new URL('./act-science-v7.batch.json', import.meta.url).pathname
const EXPECT_IDS = [
  'ACT-SC7-P1-Q1', 'ACT-SC7-P1-Q2', 'ACT-SC7-P1-Q3', 'ACT-SC7-P1-Q4',
  'ACT-SC7-P1-Q5', 'ACT-SC7-P1-Q6', 'ACT-SC7-P1-Q7',
  'ACT-SC7-P2-Q1', 'ACT-SC7-P2-Q2', 'ACT-SC7-P2-Q3',
  'ACT-SC7-P2-Q4', 'ACT-SC7-P2-Q5', 'ACT-SC7-P2-Q6',
]
const DR_IDS = EXPECT_IDS.filter(i => i.includes('-P2-'))

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
if (batch.length !== EXPECT_IDS.length) die2(`${batch.length} items, this checker is only about the ${EXPECT_IDS.length}-item v7 batch`)
const gotIds = batch.map(i => i.id)
if (gotIds.join(',') !== EXPECT_IDS.join(',')) die2(`ids are not the v7 ids, in order.\n  got:  ${gotIds.join(' ')}\n  want: ${EXPECT_IDS.join(' ')}`)
const byId = Object.fromEntries(batch.map(i => [i.id, i]))
const drItems = DR_IDS.map(id => byId[id])
const svgs = new Set(drItems.map(i => i.graphic?.svg ?? null))
if (svgs.size !== 1 || [...svgs][0] == null) die2(`the ${DR_IDS.length} data_representation items do not share one graphic.svg (${svgs.size} distinct)`)
const SVG = [...svgs][0]
console.log(`data_representation items: ${drItems.length}, sharing 1 identical SVG of ${SVG.length} bytes`)

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

/* ---------- 2. the two plot frames, from the drawn axes ---------- */
// A frame is the black L: "M<x0>,<top> V<bottom> H<x1>"
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
const lsq = pts => {                       // value = a*coord + b
  const n = pts.length, sx = pts.reduce((s, p) => s + p[0], 0), sy = pts.reduce((s, p) => s + p[1], 0)
  const sxx = pts.reduce((s, p) => s + p[0] * p[0], 0), sxy = pts.reduce((s, p) => s + p[0] * p[1], 0)
  const a = (n * sxy - sx * sy) / (n * sxx - sx * sx)
  return { a, b: (sy - a * sx) / n }
}
/* MAJOR ticks only: the figure also draws shorter unlabelled minor ticks
   between them, and a calibration that pairs 6 labels with 11 tick lines
   would silently drop half its evidence. They are told apart by LENGTH,
   which is on the page, not by a colour or a class name. */
const allYTicks = of('line').filter(t => num(t.attrs.y1) === num(t.attrs.y2) && num(t.attrs.x2) <= F1.x0 + 0.01 && num(t.attrs.x2) > num(t.attrs.x1))
const tickLen = t => num(t.attrs.x2) - num(t.attrs.x1)
const yTickLines = allYTicks.filter(t => tickLen(t) >= 3.5)
console.log(`y-axis tick marks: ${allYTicks.length} drawn, ${yTickLines.length} major (>=3.5px long), ${allYTicks.length - yTickLines.length} minor`)
const endLabels = of('text').filter(t => t.attrs['text-anchor'] === 'end' && /^-?[\d.]+$/.test(String(t.text).trim()))

function calibrateY(frame, tag) {
  const ticks = yTickLines.filter(t => num(t.attrs.y1) >= frame.top - 1 && num(t.attrs.y1) <= frame.bottom + 1)
  const labs = endLabels.filter(t => num(t.attrs.y) >= frame.top - 8 && num(t.attrs.y) <= frame.bottom + 8)
  const pairs = []
  for (const l of labs) {
    const ly = num(l.attrs.y)
    const sorted = ticks.map(t => ({ y: num(t.attrs.y1), d: Math.abs(num(t.attrs.y1) - ly) })).sort((p, q) => p.d - q.d)
    if (!sorted.length) { fail(`${tag}: axis label "${l.text}" has no tick line`); continue }
    if (sorted.length > 1 && sorted[1].d - sorted[0].d < 4) { fail(`${tag}: axis label "${l.text}" is equidistant between two ticks — cannot be calibrated`); continue }
    if (sorted[0].d > 8) { fail(`${tag}: axis label "${l.text}" is ${sorted[0].d.toFixed(1)}px from the nearest tick`); continue }
    pairs.push([sorted[0].y, Number(l.text)])
  }
  if (pairs.length !== ticks.length) fail(`${tag}: ${ticks.length} tick lines but ${pairs.length} usable labels`)
  if (pairs.length < 3) { fail(`${tag}: only ${pairs.length} calibration points`); return null }
  const fit = lsq(pairs)
  const resid = pairs.map(([y, v]) => Math.abs(fit.a * y + fit.b - v))
  const worst = Math.max(...resid)
  console.log(`  ${tag}: ${pairs.length} ticks ${pairs.map(p => p[1]).join('/')} -> value = ${fit.a.toFixed(5)}*y + ${fit.b.toFixed(4)}, worst residual ${worst.toFixed(4)}`)
  // a tick mis-typed by one step on a 0.4 grid shows up here as ~0.1+
  if (worst > 0.012) fail(`${tag}: axis labels do not lie on one straight line — worst residual ${worst.toFixed(4)} (a mislabelled or misplaced tick)`)
  else pass(`${tag} axis is linear to ${worst.toFixed(4)}`)
  if (Math.abs(fit.a * frame.bottom + fit.b) > 0.012) fail(`${tag}: the plot floor reads ${(fit.a * frame.bottom + fit.b).toFixed(4)}, not 0`)
  return v => fit.a * v + fit.b
}
console.log('axis calibration:')
const val1 = calibrateY(F1, 'Fig1 y')
const val2 = calibrateY(F2, 'Fig2 y')
if (!val1 || !val2) { console.error(`\nVERIFY FAILED — the axes could not be calibrated, so no value is reconstructible:\n  ` + fails.join('\n  ')); process.exit(1) }

const xTickLines = of('line').filter(t => num(t.attrs.x1) === num(t.attrs.x2) && num(t.attrs.y1) >= F1.bottom - 0.01 && num(t.attrs.y1) <= F1.bottom + 1)
const midLabels = of('text').filter(t => t.attrs['text-anchor'] === 'middle' && /^\d+$/.test(String(t.text).trim()) && num(t.attrs.y) > F1.bottom && num(t.attrs.y) < F1.bottom + 20)
const xPairs = []
for (const l of midLabels) {
  const lx = num(l.attrs.x)
  const s = xTickLines.map(t => ({ x: num(t.attrs.x1), d: Math.abs(num(t.attrs.x1) - lx) })).sort((p, q) => p.d - q.d)
  if (s.length && s[0].d < 3) xPairs.push([s[0].x, Number(l.text)])
}
if (xPairs.length !== xTickLines.length || xPairs.length < 3) fail(`Fig1 x: ${xTickLines.length} ticks, ${xPairs.length} labels paired`)
const xfit = lsq(xPairs)
const xworst = Math.max(...xPairs.map(([x, v]) => Math.abs(xfit.a * x + xfit.b - v)))
console.log(`  Fig1 x: ${xPairs.length} ticks ${xPairs.map(p => p[1]).join('/')} -> degC = ${xfit.a.toFixed(5)}*x + ${xfit.b.toFixed(4)}, worst residual ${xworst.toFixed(4)}`)
if (xworst > 0.2) fail(`Fig1 x axis labels are not linear in x — worst residual ${xworst.toFixed(3)}`)
else pass(`Fig1 x axis is linear to ${xworst.toFixed(4)}`)
const tempAt = x => xfit.a * x + xfit.b

/* ---------- 4. series: read the legend letters off the curve ends ---------- */
const polylines = of('polyline').map(p => ({
  dash: p.attrs['stroke-dasharray'] ?? 'solid',
  pts: String(p.attrs.points).trim().split(/\s+/).map(s => s.split(',').map(Number)),
}))
console.log(`curves: ${polylines.length}, vertices ${polylines.map(p => p.pts.length).join('/')}`)
if (new Set(polylines.map(p => p.dash)).size !== polylines.length) fail('two curves share a dash pattern — they cannot be told apart')
else pass(`${polylines.length} distinct dash patterns: ${polylines.map(p => p.dash).join(' | ')}`)

const letterLabels = of('text').filter(t => t.attrs['font-weight'] === 'bold' && /^[A-Z]$/.test(String(t.text).trim()) && num(t.attrs.x) > F1.x1 && num(t.attrs.y) < F1.bottom + 10)
/* A student reads the four letters printed at the right-hand end of the
   curves and matches each to the curve it sits against. The letters are
   TEXT BASELINES, which sit a few px below the point they label, so
   nearest-neighbour on raw y is biased. Instead: score every assignment of
   letters to curve ends, allowing one common baseline offset shared by all
   four labels, and take the best. This both removes the bias and catches a
   SWAPPED legend, which nearest-neighbour-with-a-tolerance would not. The
   best assignment has to beat the runner-up by a clear margin or the
   legend is unreadable and the figure is refused. */
const series = {}
{
  const labs = letterLabels.map(l => ({ k: String(l.text).trim(), y: num(l.attrs.y) }))
  const ends = polylines.map(p => ({ p, y: p.pts[p.pts.length - 1][1] }))
  if (labs.length !== ends.length) fail(`${labs.length} legend letters for ${ends.length} curves`)
  else {
    const perms = []
    const permute = (rest, acc) => { if (!rest.length) return perms.push(acc)
      rest.forEach((e, i) => permute(rest.filter((_, j) => j !== i), acc.concat([e]))) }
    permute(ends, [])
    const scored = perms.map(pm => {
      const r = labs.map((l, i) => l.y - pm[i].y)
      const c = r.reduce((a, b) => a + b, 0) / r.length
      return { pm, c, cost: r.reduce((a, b) => a + (b - c) ** 2, 0) }
    }).sort((a, b) => a.cost - b.cost)
    const best = scored[0], next = scored[1]
    console.log(`legend fit: baseline offset ${best.c.toFixed(2)}px, residual ${Math.sqrt(best.cost / labs.length).toFixed(2)}px (runner-up ${Math.sqrt(next.cost / labs.length).toFixed(2)}px)`)
    if (Math.sqrt(best.cost / labs.length) > 1.5) fail(`the legend letters do not line up with the curve ends (rms ${Math.sqrt(best.cost / labs.length).toFixed(2)}px) — a student cannot tell which curve is which`)
    else if (Math.sqrt(next.cost / labs.length) - Math.sqrt(best.cost / labs.length) < 2) fail(`two legend letters are interchangeable within ${(Math.sqrt(next.cost / labs.length) - Math.sqrt(best.cost / labs.length)).toFixed(2)}px — the labelling is ambiguous`)
    else labs.forEach((l, i) => { series[l.k] = best.pm[i].p })
  }
}
const KEYS = Object.keys(series).sort()
console.log(`series identified from end labels: ${KEYS.join(', ')} (${KEYS.length} of ${polylines.length} curves)`)
if (KEYS.length !== polylines.length) fail(`${KEYS.length} labelled curves for ${polylines.length} drawn curves`)
if (new Set(Object.values(series)).size !== KEYS.length) fail('two legend letters point at the same curve')

/* clipping: every vertex inside its frame */
let clipped = 0
for (const p of polylines) for (const [x, y] of p.pts) if (x < F1.x0 - 0.5 || x > F1.x1 + 0.5 || y < F1.top - 0.5 || y > F1.bottom + 0.5) clipped++
if (clipped) fail(`${clipped} curve vertices fall outside the Figure 1 frame`); else pass('no Figure 1 vertex is clipped by its frame')

/* ---------- 5. markers must sit on vertices ---------- */
const markers = []
for (const c of of('circle')) markers.push({ kind: 'circle', x: num(c.attrs.cx), y: num(c.attrs.cy) })
for (const r of of('rect')) {
  const w = num(r.attrs.width), h = num(r.attrs.height)
  if (w > 0 && w < 6 && Math.abs(w - h) < 0.01) markers.push({ kind: 'square', x: num(r.attrs.x) + w / 2, y: num(r.attrs.y) + h / 2 })
}
for (const g of of('polygon')) {
  const pts = String(g.attrs.points).trim().split(/\s+/).map(s => s.split(',').map(Number))
  if (pts.length === 3) markers.push({ kind: 'triangle', x: pts.reduce((s, p) => s + p[0], 0) / 3, y: pts.reduce((s, p) => s + p[1], 0) / 3 })
  else if (pts.length === 4) markers.push({ kind: 'diamond', x: pts.reduce((s, p) => s + p[0], 0) / 4, y: pts.reduce((s, p) => s + p[1], 0) / 4 })
}
console.log(`markers found: ${markers.length} (${['circle', 'square', 'triangle', 'diamond'].map(k => `${k} ${markers.filter(m => m.kind === k).length}`).join(', ')})`)
const used = new Set()
let orphanVertex = 0
for (const k of KEYS) {
  const shapes = new Set()
  for (const [vx, vy] of series[k].pts) {
    const hit = markers.map((m, i) => ({ m, i, d: Math.hypot(m.x - vx, m.y - vy) })).sort((a, b) => a.d - b.d)[0]
    if (!hit || hit.d > 0.9) { fail(`Blend ${k}: the vertex at (${vx}, ${vy}) carries no marker within 0.9px (nearest ${hit ? hit.d.toFixed(2) : 'none'})`); orphanVertex++; continue }
    used.add(hit.i); shapes.add(hit.m.kind)
  }
  if (shapes.size > 1) fail(`Blend ${k} is drawn with ${shapes.size} different marker shapes (${[...shapes].join(', ')})`)
}
const strayMarkers = markers.length - used.size
if (strayMarkers) fail(`${strayMarkers} marker(s) sit on no curve vertex`)
if (!orphanVertex && !strayMarkers) pass(`all ${used.size} markers sit on a vertex of their own curve, one shape per series`)

/* ---------- 6. read Figure 1 back off the geometry ---------- */
const round = v => Math.round(v * 20) / 20      // the figure is drawn on a 0.05 mm grid
const fig1 = {}, temps = []
for (const k of KEYS) {
  fig1[k] = series[k].pts.map(([x, y]) => round(val1(y)))
  const t = series[k].pts.map(([x]) => Math.round(tempAt(x)))
  if (!temps.length) temps.push(...t)
  else if (t.join() !== temps.join()) fail(`Blend ${k} is not plotted at the same temperatures as the others`)
}
console.log(`\nFIGURE 1 reconstructed at ${temps.join('/')} °C:`)
for (const k of KEYS) console.log(`  Blend ${k}: ${fig1[k].map(v => v.toFixed(2)).join('  ')}`)
// legibility: closest pair of plotted points on any vertical
let minSep = Infinity
for (let i = 0; i < temps.length; i++) {
  const ys = KEYS.map(k => series[k].pts[i][1]).sort((a, b) => a - b)
  for (let j = 1; j < ys.length; j++) minSep = Math.min(minSep, ys[j] - ys[j - 1])
}
console.log(`  closest two plotted points on any one vertical: ${minSep.toFixed(1)} px`)
if (minSep < 6) fail(`two series come within ${minSep.toFixed(1)}px — a student cannot tell the markers apart`)
else pass(`series stay ${minSep.toFixed(1)}px apart at every temperature`)

/* ---------- 7. read Figure 2 back off the bars ---------- */
const bars = of('rect').filter(r => num(r.attrs.width) > 12 && num(r.attrs.y) >= F2.top - 1 && num(r.attrs.y) + num(r.attrs.height) <= F2.bottom + 1)
  .map(r => ({ x: num(r.attrs.x) + num(r.attrs.width) / 2, top: num(r.attrs.y), h: num(r.attrs.height), fill: r.attrs.fill }))
  .sort((a, b) => a.x - b.x)
console.log(`\nbars in Figure 2: ${bars.length}`)
for (const b of bars) {
  if (Math.abs(b.top + b.h - F2.bottom) > 0.51) fail(`a bar at x=${b.x} does not stand on the plot floor (bottom ${(b.top + b.h).toFixed(2)} vs ${F2.bottom})`)
  const byTop = val2(b.top), byHeight = b.h * Math.abs(val2(F2.bottom) - val2(F2.bottom - 1))
  if (Math.abs(byTop - byHeight) > 0.012) fail(`a bar at x=${b.x} reads ${byTop.toFixed(3)} from its top but ${byHeight.toFixed(3)} from its height`)
}
if (bars.length !== 8) fail(`expected 8 bars in Figure 2, found ${bars.length}`)
// legend: swatch fill -> thickness, read from the swatch nearest each legend caption
const swatches = of('rect').filter(r => num(r.attrs.width) > 6 && num(r.attrs.width) < 12 && num(r.attrs.y) < F2.top)
const captions = of('text').filter(t => /\d+\s*mm/.test(String(t.text ?? '')) && num(t.attrs.y) < F2.top)
const fillToThick = {}
for (const c of captions) {
  const s = swatches.map(w => ({ w, d: num(c.attrs.x) - (num(w.attrs.x) + num(w.attrs.width)) })).filter(o => o.d >= 0 && o.d <= 20).sort((a, b) => a.d - b.d)[0]
  if (s) fillToThick[s.w.attrs.fill] = /(\d+)\s*mm/.exec(String(c.text))[1] + ' mm'
}
console.log(`  legend: ${Object.entries(fillToThick).map(([f, t]) => `${f} = ${t}`).join(', ')}`)
if (Object.keys(fillToThick).length !== 2) fail('Figure 2 legend does not map exactly two fills to two thicknesses')
// group bars in pairs by x, label each group from the bold letter beneath it
const groups = []
for (let i = 0; i < bars.length; i += 2) groups.push(bars.slice(i, i + 2))
const groupLabels = of('text').filter(t => t.attrs['font-weight'] === 'bold' && /^[A-Z]$/.test(String(t.text).trim()) && num(t.attrs.y) > F2.bottom)
const fig2 = {}
for (const g of groups) {
  const cx = (g[0].x + g[1].x) / 2
  const l = groupLabels.map(t => ({ t, d: Math.abs(num(t.attrs.x) - cx) })).sort((a, b) => a.d - b.d)
  if (!l.length || l[0].d > 6 || (l.length > 1 && l[1].d - l[0].d < 6)) { fail(`the bar pair centred at x=${cx.toFixed(1)} has no unambiguous blend label`); continue }
  const k = String(l[0].t.text).trim()
  fig2[k] = {}
  for (const b of g) fig2[k][fillToThick[b.fill] ?? `fill ${b.fill}`] = round(val2(b.top))
}
console.log('FIGURE 2 reconstructed (warp at 80 °C):')
for (const k of Object.keys(fig2).sort()) console.log(`  Blend ${k}: ${Object.entries(fig2[k]).map(([t, v]) => `${t} ${v.toFixed(2)}`).join('   ')}`)
if (Object.keys(fig2).sort().join() !== KEYS.join()) fail(`Figure 2 blends ${Object.keys(fig2).sort().join('/')} do not match Figure 1 blends ${KEYS.join('/')}`)

/* ---------- 8. re-answer the six items ---------- */
console.log('\nre-answering the 6 data_representation items from the reconstruction:')
const at = (k, t) => fig1[k][temps.indexOf(t)]
const blendOpt = (item, k) => item.choices.find(c => new RegExp(`Blend ${k}\\b`).test(c))
const check = (id, derived, why) => {
  const it = byId[id]
  if (derived == null) { fail(`${id}: could not derive an answer (${why})`); return }
  if (derived === it.correct_answer) pass(`${id}: geometry gives "${derived}" — matches the key   [${why}]`)
  else fail(`${id}: geometry gives "${derived}" but the key is "${it.correct_answer}"   [${why}]`)
}
const nearestNumeric = (item, v) => {
  const opts = item.choices.map(c => ({ c, n: Number(/(-?[\d.]+)/.exec(c)?.[1]) })).filter(o => Number.isFinite(o.n))
  return opts.sort((a, b) => Math.abs(a.n - v) - Math.abs(b.n - v))[0]?.c
}
// Q1: least warp at 40 °C
{
  const t = temps[0]
  const ranked = KEYS.map(k => [k, at(k, t)]).sort((a, b) => a[1] - b[1])
  const k = ranked[0][0]
  check('ACT-SC7-P2-Q1', blendOpt(byId['ACT-SC7-P2-Q1'], k), `lowest at ${t} °C is ${k} at ${ranked[0][1].toFixed(2)}, next ${ranked[1][0]} at ${ranked[1][1].toFixed(2)}`)
}
// Q2: Blend Y at 100 °C
{
  const v = at('Y', 100)
  check('ACT-SC7-P2-Q2', nearestNumeric(byId['ACT-SC7-P2-Q2'], v), `Y at 100 °C reads ${v.toFixed(2)}`)
}
// Q3: shape of X and of Z across the whole sweep
{
  const shape = k => {
    const s = fig1[k], d = []
    for (let i = 1; i < s.length; i++) { const x = s[i] - s[i - 1]; if (Math.abs(x) > 0.02) d.push(Math.sign(x)) }
    const runs = d.filter((x, i) => i === 0 || x !== d[i - 1])
    if (runs.length === 1) return runs[0] > 0 ? 'increased only' : 'decreased only'
    if (runs.length === 2) return runs[0] > 0 ? 'increased and then decreased' : 'decreased and then increased'
    return `changed direction ${runs.length - 1} times`
  }
  const want = `${shape('X')}, and ${shape('Z')}.`
  const opt = byId['ACT-SC7-P2-Q3'].choices.find(c => c === want)
  check('ACT-SC7-P2-Q3', opt, `X ${shape('X')}; Z ${shape('Z')}`)
}
// Q4: how many blends have the 8 mm bar below the 2 mm bar
{
  const n = KEYS.filter(k => fig2[k]['8 mm'] < fig2[k]['2 mm']).length
  check('ACT-SC7-P2-Q4', byId['ACT-SC7-P2-Q4'].choices.find(c => c.trim() === String(n)), `8 mm below 2 mm for ${KEYS.filter(k => fig2[k]['8 mm'] < fig2[k]['2 mm']).join('/') || 'none'} = ${n}`)
}
// Q5: 4 mm panel at 80 °C above BOTH bars
{
  const win = KEYS.filter(k => at(k, 80) > fig2[k]['2 mm'] && at(k, 80) > fig2[k]['8 mm'])
  if (win.length !== 1) fail(`ACT-SC7-P2-Q5: ${win.length} blends satisfy the stem (${win.join('/')}) — the item has no unique answer`)
  else check('ACT-SC7-P2-Q5', blendOpt(byId['ACT-SC7-P2-Q5'], win[0]), `${win[0]}: 4 mm ${at(win[0], 80).toFixed(2)} > ${fig2[win[0]]['2 mm'].toFixed(2)} and ${fig2[win[0]]['8 mm'].toFixed(2)}`)
}
// Q6: linear extrapolation of Z one step past the last temperature
{
  const s = fig1['Z'], step = temps[temps.length - 1] - temps[temps.length - 2]
  const ext = 2 * s[s.length - 1] - s[s.length - 2]
  const holds = (c, v) => {
    let m = /less than ([\d.]+)/.exec(c); if (m) return v < Number(m[1])
    m = /greater than ([\d.]+)/.exec(c); if (m) return v > Number(m[1])
    m = /between ([\d.]+) mm and ([\d.]+)/.exec(c); if (m) return v > Number(m[1]) && v < Number(m[2])
    return false
  }
  const hits = byId['ACT-SC7-P2-Q6'].choices.filter(c => holds(c, ext))
  if (hits.length !== 1) fail(`ACT-SC7-P2-Q6: extrapolated ${ext.toFixed(2)} falls in ${hits.length} of the offered ranges`)
  else check('ACT-SC7-P2-Q6', hits[0], `Z ${s[s.length - 2].toFixed(2)} -> ${s[s.length - 1].toFixed(2)} over ${step} °C extrapolates to ${ext.toFixed(2)}`)
}

/* ---------- 9. verdict ---------- */
console.log(`\nchecked: 1 figure, 2 axes, ${polylines.length} curves, ${markers.length} markers, ${bars.length} bars, ${drItems.length} items re-answered`)
if (fails.length) { console.error(`\nVERIFY FAILED — ${fails.length} problem(s):\n  ` + fails.join('\n  ')); process.exit(1) }
console.log('\nVERIFY OK — every value re-read from the drawing agrees with the keys')
