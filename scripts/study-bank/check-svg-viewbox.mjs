#!/usr/bin/env node
/**
 * check-svg-viewbox.mjs — find (and optionally fix) rendered SVGs whose
 * content falls outside their own viewBox.
 *
 * Found 2026-08-05 while an agent read the SVGs for the geometry stem
 * repair: one item's x-axis was drawn at y=305.1 with its tick labels at
 * y=318.1, inside a viewBox of "0 0 300 300". The axis and every label
 * were clipped away, so the student saw a y-axis and a floating line.
 *
 * The sweep found 12 of 86 live rawsvg items in that state, all
 * overflowing at the bottom. That is a silent failure: the figure still
 * renders, it is just missing the part that carries the numbers.
 *
 * `--fix` extends the viewBox height to cover the content plus padding.
 * Safe because these SVGs set `width` but no `height`, so the rendered
 * box scales with the viewBox rather than squashing. The old viewBox is
 * printed for every change so the edit is reversible by hand.
 *
 * usage:
 *   check-svg-viewbox.mjs <batch.json> [...]   report on THOSE files
 *   check-svg-viewbox.mjs --live [--fix]       the whole live bank
 *   check-svg-viewbox.mjs --selftest           fixtures, no DB
 *
 * A22 (2026-10-02), three input defects fixed together:
 *   - a batch path was IGNORED and "live rawsvg items: 86" printed for any
 *     file — byte-identical output for two different batches;
 *   - it read only graphic.type 'rawsvg' (the SAT Math helper's shape) and
 *     never the ACT inserter's graphic.type 'svg', so 51 live figures were
 *     outside its denominator and no act-bank-helper batch could ever have
 *     been measured;
 *   - `--fix` referenced an undefined `h` and would have thrown on the first
 *     fixable item. --fix stays live-only and rawsvg-only (the type whose
 *     sizing rule — width set, no height — is described above).
 * Exit 0 clean, 1 overflowing figures, 2 cannot process the input.
 */
import { isMain, parseCheckerArgs, loadBatchFile, loadLive, printDenominator, populationHeader, refuse } from './checker-input.mjs'

const USAGE = 'usage: check-svg-viewbox.mjs <batch.json> [...] | --live [--fix] | --selftest'

/** The SVG markup an item renders, from any of the three shapes in use. */
export function svgOf(item) {
  const g = item?.graphic
  if (g && (g.type === 'rawsvg' || g.type === 'svg') && typeof g.svg === 'string') return { type: g.type, svg: g.svg }
  // A math batch carries `svg` at top level; math-bank-helper turns it into rawsvg on insert.
  if (typeof item?.svg === 'string') return { type: 'rawsvg', svg: item.svg }
  return null
}

/** Check one SVG string. Returns null when clean, else a defect record. */
export function checkSvg(s) {
  const vb = s.match(/viewBox="([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)"/)
  if (!vb) return { why: 'no viewBox' }
  const [, x0, y0, w, h] = vb.map(Number)
  /*
   * Only TEXT and AXIS geometry count. A polyline or path point outside
   * the box is normal — a parabola legitimately runs off the top of its
   * plot, and SAT figures clip curves at the plot boundary all the time.
   *
   * The first version of this check counted polyline points too. It
   * flagged item 038b0287, whose parabola starts at y=-16.6, and the
   * --fix pass then "corrected" a 300-tall viewBox to 284 — SHRINKING
   * it and cropping real content, because the overflow was at the top
   * and the fix only ever extends the bottom. Caught and reverted.
   *
   * A clipped <text> is information loss: the tick labels carry the
   * numbers. A clipped curve is a drawing convention.
   *
   * TEXT ONLY. <line> was in here too and produced a second round of
   * false positives: it cannot distinguish an AXIS from the plotted
   * function, and a steep line legitimately exits the top of its plot
   * (item 1fff8d96 runs from y=341.5 to y=-51.5 by design).
   *
   * Clipping a <text> loses the numbers. Clipping a drawn line or curve
   * is how graphs have always worked. Three iterations of this checker
   * flagged drawings before it settled on labels; the two earlier rules
   * are described above so nobody re-adds them.
   */
  const allY = [...s.matchAll(/<text\b[^>]*\by="([-\d.]+)"/g)].map(m => +m[1])
  const allX = [...s.matchAll(/<text\b[^>]*\bx="([-\d.]+)"/g)].map(m => +m[1])
  if (!allX.length && !allY.length) return null
  const outX = allX.filter(v => v < x0 - 1 || v > x0 + w + 1).length
  const outY = allY.filter(v => v < y0 - 1 || v > y0 + h + 1).length
  const above = allY.filter(v => v < y0 - 1).length
  if (outX + outY > 0) return {
    viewBox: `${x0} ${y0} ${w} ${h}`, outX, outY, above,
    maxY: Math.max(...allY).toFixed(1), maxX: Math.max(...allX).toFixed(1),
  }
  return null
}

/** Scan rows; returns {svgs, bad}. Pure, so --selftest can drive it. */
export function scanSvgs(rows) {
  const svgs = []
  for (const r of rows) { const g = svgOf(r.item); if (g) svgs.push({ ...r, svgType: g.type, svgText: g.svg }) }
  const bad = []
  for (const r of svgs) { const d = checkSvg(r.svgText); if (d) bad.push({ id: String(r.id), domain: r.domain, svgType: r.svgType, ...d }) }
  return { svgs, bad }
}

function report(label, rows) {
  const { svgs, bad } = scanSvgs(rows)
  console.log(`\nSVG TEXT vs VIEWBOX`)
  console.log(`  ${label}`)
  printDenominator('items carrying an SVG figure', svgs.length, rows.length)
  const byType = svgs.reduce((m, r) => ((m[r.svgType] = (m[r.svgType] ?? 0) + 1), m), {})
  console.log('  by graphic type:', JSON.stringify(byType))
  console.log('  items with text OUTSIDE the viewBox:', bad.length)
  for (const b of bad) console.log('   ', b.id.slice(0, 8), b.domain, b.svgType, b.why ?? `vb[${b.viewBox}] outX:${b.outX} outY:${b.outY} maxX:${b.maxX} maxY:${b.maxY}`)
  return { svgs, bad }
}

async function applyFix(db, svgs, bad) {
  const PAD = 8
  let fixed = 0
  for (const b of bad) {
    if (b.why) { console.log('SKIP', b.id.slice(0, 8), b.why); continue }
    if (b.svgType !== 'rawsvg') { console.log('SKIP', b.id.slice(0, 8), 'graphic.type svg — --fix only handles rawsvg'); continue }
    if (b.outX > 0) { console.log('SKIP', b.id.slice(0, 8), 'overflows horizontally — needs a human'); continue }
    if (b.above > 0) { console.log('SKIP', b.id.slice(0, 8), 'overflows ABOVE the box — extending the bottom would not help'); continue }
    const row = svgs.find(r => String(r.id) === b.id)
    if (!row.item?.graphic?.svg) { console.log('SKIP', b.id.slice(0, 8), 'svg is not under item.graphic'); continue }
    const [x0, y0, w, h] = b.viewBox.split(' ').map(Number)
    // NEVER shrink. A "fix" that reduces the viewBox crops content.
    const need = Math.max(y0 + h, Math.ceil(Number(b.maxY) + PAD))
    if (need === y0 + h) { console.log('SKIP', b.id.slice(0, 8), 'already tall enough'); continue }
    const before = row.item.graphic.svg.match(/viewBox="[^"]*"/)[0]
    const after = `viewBox="${x0} ${y0} ${w} ${need}"`
    const svg = row.item.graphic.svg.replace(/viewBox="[^"]*"/, after)
    const { error } = await db.from('study_item_bank')
      .update({ item: { ...row.item, graphic: { ...row.item.graphic, svg } }, updated_at: new Date().toISOString() })
      .eq('id', row.id)
    if (error) { console.error('FAILED', b.id.slice(0, 8), error.message); continue }
    console.log('fixed', b.id.slice(0, 8), before, '->', after)
    fixed++
  }
  console.log('\nfixed', fixed, 'of', bad.length)
}

export function selftest(verbose = false) {
  const cases = [
    ['label below the box fires', '<svg viewBox="0 0 300 300" width="300"><text x="10" y="318">4</text></svg>', true],
    ['label inside the box is clean', '<svg viewBox="0 0 300 300" width="300"><text x="10" y="290">4</text></svg>', false],
    ['curve leaving the box is clean (drawing convention)', '<svg viewBox="0 0 300 300"><polyline points="0,-20 50,50"/><text x="5" y="5">y</text></svg>', false],
    ['missing viewBox fires', '<svg width="300"><text x="10" y="10">a</text></svg>', true],
  ]
  let bad = 0
  for (const [n, svg, want] of cases) {
    const got = !!checkSvg(svg), ok = got === want
    if (!ok) bad++
    if (verbose || !ok) console.log(`${ok ? 'ok  ' : 'FAIL'}  ${n}  -> ${got ? 'flagged' : 'clean'}`)
  }
  // All three carriers must be read, so no figure falls outside the denominator.
  const shapes = [{ graphic: { type: 'rawsvg', svg: '<svg/>' } }, { graphic: { type: 'svg', svg: '<svg/>' } }, { svg: '<svg/>' }, { graphic: { type: 'bar' } }]
  const read = shapes.filter(svgOf).length
  if (read !== 3) { bad++; console.log(`FAIL  svgOf read ${read} of the 3 SVG carriers`) }
  else if (verbose) console.log('ok    svgOf reads rawsvg, svg and top-level svg; ignores bar')
  console.log(bad ? `${bad} self-test(s) FAILED` : `selftest ${cases.length + 1}/${cases.length + 1} pass`)
  return bad
}

if (isMain(import.meta.url)) {
  const { mode, paths, flags } = parseCheckerArgs(process.argv, { name: 'check-svg-viewbox.mjs', usage: USAGE, extraFlags: ['--fix'], liveOnly: ['--fix'] })
  const stBad = selftest(mode === 'selftest')
  if (mode === 'selftest') process.exit(stBad ? 1 : 0)
  if (stBad) refuse('detector self-test failed — not running')
  let defects = 0
  if (mode === 'live') {
    const { db, rows } = await loadLive({ select: 'id,domain,item', filter: q => q.neq('archived', true) })
    const { svgs, bad } = report(populationHeader('live'), rows)
    defects = bad.length
    if (flags.has('--fix')) await applyFix(db, svgs, bad)
  } else {
    for (const p of paths) defects += report(populationHeader('batch', p), loadBatchFile(p)).bad.length
  }
  process.exit(defects ? 1 : 0)
}
