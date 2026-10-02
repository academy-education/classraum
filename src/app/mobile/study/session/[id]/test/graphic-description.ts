import type { QuestionGraphic } from './types'

/**
 * Text alternative for QuestionGraphicView, built from the same data spec
 * the renderer draws from.
 *
 * THE RULE: the description carries what a sighted student can read off
 * the figure, and nothing more. The spec often holds more than the figure
 * shows — a best-fit line's m and b, an inscribed triangle's vertex angles,
 * a chord's distance from the centre — and those are frequently the very
 * thing the item asks for. So:
 *
 *   • values the figure prints (tick labels, point labels, side labels,
 *     dot-plot stacks, table cells) are stated exactly;
 *   • values the figure only ENCODES by position (bar heights, scatter
 *     points, a line's course) are stated at the precision the axis
 *     allows — rounded to ~1/40 of the axis range and marked "about"
 *     when the rounding changed them;
 *   • parameters the figure never shows (m, b, angles, d, r) are never
 *     stated. A best-fit line is described by where it visibly runs, not
 *     by its equation; a drawn line by grid points it visibly crosses.
 *
 * Two-way tables are real <table>s already and get no description.
 */

export type GraphicTranslate = (key: string, params?: Record<string, string | number | undefined>) => string

const fmt = (v: number): string => {
  if (Number.isInteger(v)) return String(v)
  return String(Number(v.toFixed(2)))
}

/** 1/2/5 x 10^k step nearest above `raw`. */
export function niceStep(raw: number): number {
  if (!(raw > 0) || !Number.isFinite(raw)) return 1
  const p = Math.pow(10, Math.floor(Math.log10(raw)))
  const m = raw / p
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p
}

/** Round to the axis's readable resolution; say "about" only if that moved it. */
function readable(v: number, res: number, t: GraphicTranslate): string {
  const r = Math.round(v / res) * res
  const clean = Number(r.toFixed(6))
  if (Math.abs(clean - v) < 1e-9) return fmt(v)
  return t('study.a11y.graphic.approx', { value: fmt(clean) })
}

const resolutionFor = (min: number, max: number) => niceStep(((max - min) || 1) / 40)

function axisLines(g: QuestionGraphic, t: GraphicTranslate, withY = true): string[] {
  const out: string[] = []
  if (g.xLabel) out.push(t('study.a11y.graphic.xAxis', { label: g.xLabel }))
  if (withY && g.yLabel) out.push(t('study.a11y.graphic.yAxis', { label: g.yLabel }))
  return out
}

export function describeGraphic(graphic: QuestionGraphic | null | undefined, t: GraphicTranslate): string[] {
  if (!graphic || !graphic.type) return []
  const g = graphic
  const type = g.type!.toLowerCase()
  const shape = (g.shape ?? '').toLowerCase()

  if (type === 'twowaytable' || type === 'table') return []

  // ─ Bar chart / histogram ─────────────────────────────────────────
  if (type === 'bar' || type === 'histogram') {
    const bars = ((g.bars ?? []) as Array<{ label?: string; value?: number }>).filter(b => b && typeof b.value === 'number')
    if (bars.length === 0) return []
    const maxVal = Math.max(...bars.map(b => b.value ?? 0), 1)
    const res = resolutionFor(0, maxVal)
    const out = [t(type === 'histogram' ? 'study.a11y.graphic.histogram' : 'study.a11y.graphic.bar', { n: bars.length })]
    out.push(...axisLines(g, t))
    out.push(t('study.a11y.graphic.yRange', { min: 0, max: fmt(Number(maxVal.toFixed(1))) }))
    bars.forEach((b, i) => out.push(t('study.a11y.graphic.barItem', {
      label: b.label || String(i + 1),
      value: readable(b.value as number, res, t),
    })))
    return out
  }

  // ─ Scatter / line graph ──────────────────────────────────────────
  if (type === 'scatter' || type === 'linegraph' || type === 'line') {
    const seriesList: Array<{ label?: string; points: Array<[number, number]> }> = []
    if (type === 'scatter') {
      const pts: Array<[number, number]> = []
      ;(g.points ?? []).forEach(p => {
        if (Array.isArray(p) && p.length >= 2) pts.push([Number(p[0]), Number(p[1])])
        else if (p && typeof p === 'object' && 'x' in p && 'y' in p) {
          const o = p as Record<string, unknown>
          pts.push([Number(o.x), Number(o.y)])
        }
      })
      seriesList.push({ points: pts })
    } else {
      ((g.series ?? []) as Array<{ label?: string; points?: Array<[number, number]> }>).forEach(s => {
        const pts: Array<[number, number]> = []
        ;(s?.points ?? []).forEach(p => { if (Array.isArray(p) && p.length >= 2) pts.push([Number(p[0]), Number(p[1])]) })
        seriesList.push({ label: s?.label, points: pts })
      })
    }
    const all = seriesList.flatMap(s => s.points)
    if (all.length === 0) return []
    const xs = all.map(p => p[0]), ys = all.map(p => p[1])
    const xMin = Math.min(...xs, 0), xMax = Math.max(...xs)
    const yMin = Math.min(...ys, 0), yMax = Math.max(...ys)
    const xRes = resolutionFor(xMin, xMax), yRes = resolutionFor(yMin, yMax)
    const pt = (p: [number, number]) => `(${readable(p[0], xRes, t)}, ${readable(p[1], yRes, t)})`
    const out = [type === 'scatter'
      ? t('study.a11y.graphic.scatter', { n: all.length })
      : t('study.a11y.graphic.line', { n: seriesList.length })]
    out.push(...axisLines(g, t))
    out.push(t('study.a11y.graphic.xRange', { min: fmt(xMin), max: fmt(xMax) }))
    out.push(t('study.a11y.graphic.yRange', { min: fmt(yMin), max: fmt(yMax) }))
    seriesList.forEach((s, i) => {
      if (s.points.length === 0) return
      const list = s.points.map(pt).join(', ')
      if (type === 'scatter') out.push(t('study.a11y.graphic.points', { list }))
      else out.push(t('study.a11y.graphic.seriesPoints', { name: s.label || String(i + 1), list }))
    })
    // Best fit: where the dashed line visibly runs — never its m and b.
    const bf = g.bestFit as { m?: number; b?: number } | undefined
    if (bf && typeof bf.m === 'number' && typeof bf.b === 'number') {
      out.push(t('study.a11y.graphic.bestFit', {
        from: `(${fmt(xMin)}, ${readable(bf.m * xMin + bf.b, yRes, t)})`,
        to: `(${fmt(xMax)}, ${readable(bf.m * xMax + bf.b, yRes, t)})`,
      }))
    }
    return out
  }

  // ─ Dot plot (every value is printed by its stack: exact) ─────────
  if (type === 'dotplot') {
    const values = ((g.values ?? []) as number[]).map(Number).filter(n => !isNaN(n))
    if (values.length === 0) return []
    const counts = new Map<number, number>()
    values.forEach(v => counts.set(v, (counts.get(v) ?? 0) + 1))
    const keys = [...counts.keys()].sort((a, b) => a - b)
    const out = [t('study.a11y.graphic.dotplot', { n: values.length })]
    out.push(...axisLines(g, t, false))
    out.push(keys.map(k => t('study.a11y.graphic.dotItem', { value: fmt(k), count: counts.get(k)! })).join(', '))
    return out
  }

  // ─ Coordinate plane ──────────────────────────────────────────────
  if (type === 'coordinateplane' || type === 'coordinate' || type === 'plane') {
    const pts = ((g.points ?? []) as Array<{ x: number; y: number; label?: string }>)
      .filter(p => p && typeof p.x === 'number' && typeof p.y === 'number')
    const lines = ((g.spec as { lines?: Array<{ m: number; b: number }> } | undefined)?.lines
      ?? (g as unknown as { lines?: Array<{ m: number; b: number }> }).lines ?? [])
      .filter(ln => ln && typeof ln.m === 'number' && typeof ln.b === 'number')
    // Same window + polygon rule as the renderer, so the text describes
    // the figure actually drawn.
    const xVals = pts.map(p => p.x), yVals = pts.map(p => p.y)
    const xMin = Math.floor(Math.min(-2, ...xVals) - 1.5)
    const xMax = Math.ceil(Math.max(2, ...xVals) + 1.5)
    const yMin = Math.floor(Math.min(-2, ...yVals) - 1.5)
    const yMax = Math.ceil(Math.max(2, ...yVals) + 1.5)
    const onLine = (ln: { m: number; b: number }, p: { x: number; y: number }) => Math.abs(ln.m * p.x + ln.b - p.y) < 1e-6
    const linesMatchPts = lines.length > 0 && lines.every(ln => pts.filter(p => onLine(ln, p)).length >= 2)
    const polygonMode = pts.length >= 3 && pts.length <= 8 && (linesMatchPts || lines.length >= pts.length)
    const freeLines = polygonMode ? [] : lines
    const res = 0.5
    const coord = (v: number) => readable(v, res, t)

    const out = [t('study.a11y.graphic.plane', { xMin, xMax, yMin, yMax })]
    pts.forEach(p => out.push(p.label
      ? t('study.a11y.graphic.planePoint', { label: p.label, x: coord(p.x), y: coord(p.y) })
      : t('study.a11y.graphic.planePointUnlabeled', { x: coord(p.x), y: coord(p.y) })))
    if (polygonMode) {
      const names = pts.map(p => p.label || `(${coord(p.x)}, ${coord(p.y)})`).join(', ')
      out.push(t('study.a11y.graphic.polygon', { list: names }))
    }
    freeLines.forEach(ln => {
      // Grid points the line visibly crosses inside the window.
      const lattice: Array<[number, number]> = []
      for (let x = xMin; x <= xMax && lattice.length < 2; x++) {
        const y = ln.m * x + ln.b
        if (Math.abs(y - Math.round(y)) < 1e-9 && y >= yMin && y <= yMax) lattice.push([x, Math.round(y)])
      }
      if (lattice.length === 2) {
        out.push(t('study.a11y.graphic.lineThrough', {
          p1: `(${lattice[0][0]}, ${lattice[0][1]})`, p2: `(${lattice[1][0]}, ${lattice[1][1]})`,
        }))
        return
      }
      const seg = clip(ln, xMin, xMax, yMin, yMax)
      if (!seg) return
      out.push(t('study.a11y.graphic.lineApprox', {
        p1: `(${coord(seg[0])}, ${coord(seg[1])})`, p2: `(${coord(seg[2])}, ${coord(seg[3])})`,
      }))
    })
    return out
  }

  // ─ Inscribed triangles (angles / sides are NOT drawn as numbers) ─
  if (type === 'inscribedtriangle' || shape === 'inscribedtriangle'
    || type === 'inscribedtrianglebyangles' || shape === 'inscribedtrianglebyangles'
    || type === 'inscribedtrianglebysides' || shape === 'inscribedtrianglebysides') {
    const byAngles = type === 'inscribedtrianglebyangles' || shape === 'inscribedtrianglebyangles'
    const bySides = type === 'inscribedtrianglebysides' || shape === 'inscribedtrianglebysides'
    const labels = (g.labels ?? {}) as { vertices?: string[]; sides?: string[] }
    if (byAngles) {
      const a = ((g.spec ?? {}) as { interiorAngles?: number[] }).interiorAngles ?? [60, 60, 60]
      const sum = (a[0] ?? 0) + (a[1] ?? 0) + (a[2] ?? 0)
      if (Math.abs(sum - 180) > 1 || a.some(v => !(v > 0))) return [] // renderer shows caption only
    }
    let sideLabels = labels.sides ?? []
    if (bySides) {
      const s = ((g.spec ?? {}) as { sides?: number[] }).sides ?? [5, 5, 5]
      const [a, b, c] = s
      if (a + b <= c || b + c <= a || a + c <= b || a <= 0 || b <= 0 || c <= 0) return []
      if (!labels.sides) sideLabels = [String(a), String(b), String(c)]
    }
    const v = (byAngles || bySides) ? (labels.vertices ?? ['A', 'B', 'C']) : (labels.vertices ?? [])
    const named = v.length >= 3 && v.slice(0, 3).every(Boolean)
    const out = [named
      ? t('study.a11y.graphic.inscribedTriangle', { name: v.slice(0, 3).join('') })
      : t('study.a11y.graphic.inscribedTriangleUnnamed')]
    ;[0, 1, 2].forEach(i => {
      const label = sideLabels[i]
      if (!label) return
      // bySides: side i is opposite vertex i. Otherwise side i runs
      // from vertex i to vertex i+1 (matches the renderer).
      const ends = bySides ? [(i + 1) % 3, (i + 2) % 3] : [i, (i + 1) % 3]
      out.push(named
        ? t('study.a11y.graphic.sideLabel', { side: `${v[ends[0]]}${v[ends[1]]}`, label })
        : t('study.a11y.graphic.sideLabelUnnamed', { label }))
    })
    return out
  }

  // ─ Chord at a distance (d and r are not drawn) ───────────────────
  if (type === 'chordatdistance' || shape === 'chordatdistance') {
    const spec = (g.spec ?? {}) as { r?: number; distanceFromCenter?: number }
    const mathR = spec.r ?? 1, mathD = spec.distanceFromCenter ?? 0
    if (mathD < 0 || mathD >= mathR || mathR <= 0) return []
    const labels = (g.labels ?? {}) as { chord?: string; center?: string; endpoints?: string[] }
    const [A, B] = labels.endpoints ?? ['A', 'B']
    const out = [A && B
      ? t('study.a11y.graphic.chord', { name: `${A}${B}` })
      : t('study.a11y.graphic.chordUnnamed')]
    out.push(labels.center
      ? t('study.a11y.graphic.chordCenter', { center: labels.center })
      : t('study.a11y.graphic.chordCenterUnlabeled'))
    if (labels.chord) out.push(t('study.a11y.graphic.chordLabel', { label: labels.chord }))
    return out
  }

  // ─ Right triangle ────────────────────────────────────────────────
  if (type === 'righttriangle' || shape === 'righttriangle') {
    const spec = (g.spec ?? {}) as { incircle?: boolean }
    const labels = (g.labels ?? {}) as { a?: string; b?: string; c?: string; vertices?: string[] }
    const v = labels.vertices ?? []
    // Renderer: v[0] top, v[1] right-angle corner, v[2] bottom-right.
    const named = v.length >= 3 && v.slice(0, 3).every(Boolean)
    const out = [named
      ? t('study.a11y.graphic.rightTriangle', { name: v.slice(0, 3).join(''), vertex: v[1] })
      : t('study.a11y.graphic.rightTriangleUnnamed')]
    if (labels.a) out.push(named
      ? t('study.a11y.graphic.sideLabel', { side: `${v[1]}${v[2]}`, label: labels.a })
      : t('study.a11y.graphic.legHorizontal', { label: labels.a }))
    if (labels.b) out.push(named
      ? t('study.a11y.graphic.sideLabel', { side: `${v[0]}${v[1]}`, label: labels.b })
      : t('study.a11y.graphic.legVertical', { label: labels.b }))
    if (labels.c) out.push(named
      ? t('study.a11y.graphic.sideLabel', { side: `${v[0]}${v[2]}`, label: labels.c })
      : t('study.a11y.graphic.hypotenuse', { label: labels.c }))
    if (spec.incircle) out.push(t('study.a11y.graphic.incircle'))
    return out
  }

  // ─ Circle with chords / points ───────────────────────────────────
  if (type === 'circlewithchord' || shape === 'circlewithchord') {
    const spec = (g.spec ?? {}) as { chords?: Array<{ angle1: number; angle2: number; label?: string }>; showCenter?: boolean; points?: Array<{ angle: number; label?: string }> }
    const chords = spec.chords ?? []
    // Same sanitising as the renderer.
    const chordLabels = new Set(chords.map(c => (c.label ?? '').trim().toLowerCase()).filter(Boolean))
    const points = (spec.points ?? [])
      .filter(p => { const l = (p.label ?? '').trim().toLowerCase(); return l !== 'center' && l !== '중심' })
      .map(p => chordLabels.has((p.label ?? '').trim().toLowerCase()) ? { ...p, label: undefined } : p)
    const norm = (a: number) => ((a % 360) + 360) % 360
    const labelAt = (angle: number) => points.find(p => p.label && Math.abs(norm(p.angle) - norm(angle)) < 0.5)?.label
    const out = [t('study.a11y.graphic.circle')]
    if (spec.showCenter) out.push(t('study.a11y.graphic.circleCenter'))
    const labelled = points.filter(p => p.label).sort((a, b) => norm(a.angle) - norm(b.angle))
    if (labelled.length) out.push(t('study.a11y.graphic.circlePoints', { list: labelled.map(p => p.label).join(', ') }))
    const unlabelled = points.length - labelled.length
    if (unlabelled > 0) out.push(t('study.a11y.graphic.circleUnlabeledPoints', { n: unlabelled }))
    chords.forEach(ch => {
      if (typeof ch?.angle1 !== 'number' || typeof ch?.angle2 !== 'number') return
      // "Diameter" only when the centre is drawn — otherwise the figure
      // does not show that the chord passes through it.
      const diameter = !!spec.showCenter && Math.abs(Math.abs(norm(ch.angle1) - norm(ch.angle2)) - 180) < 0.5
      const p1 = labelAt(ch.angle1), p2 = labelAt(ch.angle2)
      if (p1 && p2) out.push(t(diameter ? 'study.a11y.graphic.diameterBetween' : 'study.a11y.graphic.chordBetween', { p1, p2 }))
      else out.push(t(diameter ? 'study.a11y.graphic.diameterAnon' : 'study.a11y.graphic.chordAnon'))
      if (ch.label) out.push(t('study.a11y.graphic.chordLabel', { label: ch.label }))
    })
    return out
  }

  return []
}

function clip(ln: { m: number; b: number }, xMin: number, xMax: number, yMin: number, yMax: number): [number, number, number, number] | null {
  if (ln.m === 0) return ln.b < yMin || ln.b > yMax ? null : [xMin, ln.b, xMax, ln.b]
  const cand = ([
    [xMin, ln.m * xMin + ln.b],
    [xMax, ln.m * xMax + ln.b],
    [(yMin - ln.b) / ln.m, yMin],
    [(yMax - ln.b) / ln.m, yMax],
  ] as Array<[number, number]>).filter(([x, y]) => x >= xMin - 1e-9 && x <= xMax + 1e-9 && y >= yMin - 1e-9 && y <= yMax + 1e-9)
  if (cand.length < 2) return null
  cand.sort((a, b) => a[0] - b[0])
  const [x1, y1] = cand[0]!
  const [x2, y2] = cand[cand.length - 1]!
  return [x1, y1, x2, y2]
}
