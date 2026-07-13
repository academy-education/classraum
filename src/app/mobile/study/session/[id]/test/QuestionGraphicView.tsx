"use client"

import type { QuestionGraphic } from './types'
import { fmtTick } from './helpers'

/** Visual asset renderer for math + data questions. Restyled to
 *  match the College Board's SAT PDF aesthetic: pure black strokes
 *  on white, thin axes, sans-serif labels, no color fills, no grid
 *  decoration. Dispatches on `graphic.type`; each branch tolerates
 *  missing fields and falls through to the rawSvg / caption-only
 *  fallback so a malformed graphic never blocks the question. */
export function QuestionGraphicView({ graphic }: { graphic: QuestionGraphic | null | undefined }) {
  if (!graphic || !graphic.type) {
    // Edge case — model emitted a graphic.svg but forgot to set type
    if (graphic?.svg) return <RawSvgFigure svg={graphic.svg} caption={graphic.caption ?? undefined} />
    return null
  }
  const t = graphic.type.toLowerCase()

  // ─ Two-way table (PSD: conditional probability items) ──────────
  if (t === 'twowaytable' || t === 'table') {
    const rows = (graphic.rowLabels ?? []).filter(Boolean)
    const cols = (graphic.colLabels ?? []).filter(Boolean)
    const cells = (graphic.cells ?? []) as (number | string)[][]
    if (rows.length === 0 && cells.length === 0) return null
    return (
      <figure className="my-3 mx-auto max-w-md">
        <table className="w-full text-[12px] text-black border border-black border-collapse">
          <thead>
            <tr>
              <th className="px-2 py-1.5 border border-black bg-white font-normal" />
              {cols.map((c, i) => (
                <th key={i} className="px-2 py-1.5 border border-black font-semibold text-center bg-white">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((rowLabel, r) => (
              <tr key={r}>
                <td className="px-2 py-1.5 border border-black font-semibold bg-white">{rowLabel}</td>
                {(cells[r] ?? []).map((v, c) => (
                  <td key={c} className="px-2 py-1.5 border border-black text-right tabular-nums bg-white">
                    {String(v ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {graphic.caption && <figcaption className="text-[11px] text-black text-center italic mt-2">{graphic.caption}</figcaption>}
      </figure>
    )
  }

  // ─ Bar chart / histogram ───────────────────────────────────────
  if (t === 'bar' || t === 'histogram') {
    const bars = ((graphic.bars ?? []) as Array<{ label?: string; value?: number }>).filter(b => b && typeof b.value === 'number')
    if (bars.length === 0) return null
    const maxVal = Math.max(...bars.map(b => b.value ?? 0), 1)
    const W = 300, H = 180
    const padL = 32, padB = 28, padT = 10, padR = 10
    const innerW = W - padL - padR
    const innerH = H - padT - padB
    const barW = innerW / bars.length
    // Build clean y-axis ticks at 0, max/4, max/2, 3max/4, max
    const ticks = [0, maxVal * 0.25, maxVal * 0.5, maxVal * 0.75, maxVal]
    return (
      <figure className="my-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-md mx-auto bg-white">
          {/* y-axis ticks + gridlines (light) */}
          {ticks.map((v, i) => {
            const y = padT + innerH - (v / maxVal) * innerH
            return (
              <g key={i}>
                <line x1={padL - 3} y1={y} x2={padL} y2={y} stroke="black" strokeWidth={0.75} />
                <text x={padL - 5} y={y + 3} fontSize="9" textAnchor="end" fill="black">
                  {Number.isInteger(v) ? v : v.toFixed(1)}
                </text>
              </g>
            )
          })}
          {/* axes */}
          <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="black" strokeWidth={1} />
          <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="black" strokeWidth={1} />
          {bars.map((b, i) => {
            const h = ((b.value ?? 0) / maxVal) * innerH
            const x = padL + i * barW + barW * 0.2
            const y = H - padB - h
            return (
              <g key={i}>
                <rect x={x} y={y} width={barW * 0.6} height={h} fill="black" />
                <text x={x + barW * 0.3} y={H - padB + 11} fontSize="9" textAnchor="middle" fill="black">
                  {b.label ?? ''}
                </text>
              </g>
            )
          })}
          {graphic.xLabel && (
            <text x={padL + innerW / 2} y={H - 2} fontSize="10" textAnchor="middle" fill="black" fontStyle="italic">{graphic.xLabel}</text>
          )}
          {graphic.yLabel && (
            <text x={10} y={padT + innerH / 2} fontSize="10" textAnchor="middle" fill="black" fontStyle="italic" transform={`rotate(-90 10 ${padT + innerH / 2})`}>{graphic.yLabel}</text>
          )}
        </svg>
        {graphic.caption && <figcaption className="text-[11px] text-black text-center italic mt-2">{graphic.caption}</figcaption>}
      </figure>
    )
  }

  // ─ Scatter plot / line graph ───────────────────────────────────
  if (t === 'scatter' || t === 'linegraph' || t === 'line') {
    const W = 300, H = 220
    const padL = 32, padB = 28, padT = 10, padR = 12
    const innerW = W - padL - padR
    const innerH = H - padT - padB
    const seriesList: Array<{ label?: string; points: Array<[number, number]> }> = []
    if (t === 'scatter') {
      const pts: Array<[number, number]> = []
      ;(graphic.points ?? []).forEach(p => {
        if (Array.isArray(p) && p.length >= 2) pts.push([Number(p[0]), Number(p[1])])
        else if (p && typeof p === 'object' && 'x' in p && 'y' in p) {
          const o = p as Record<string, unknown>
          pts.push([Number(o.x), Number(o.y)])
        }
      })
      seriesList.push({ points: pts })
    } else {
      ((graphic.series ?? []) as Array<{ label?: string; points?: Array<[number, number]> }>).forEach(s => {
        const pts: Array<[number, number]> = []
        ;(s.points ?? []).forEach(p => { if (Array.isArray(p) && p.length >= 2) pts.push([Number(p[0]), Number(p[1])]) })
        seriesList.push({ label: s.label, points: pts })
      })
    }
    const allPts = seriesList.flatMap(s => s.points)
    if (allPts.length === 0) return null
    const xs = allPts.map(p => p[0]); const ys = allPts.map(p => p[1])
    const xMin = Math.min(...xs, 0); const xMax = Math.max(...xs)
    const yMin = Math.min(...ys, 0); const yMax = Math.max(...ys)
    const xR = (xMax - xMin) || 1; const yR = (yMax - yMin) || 1
    const sx = (x: number) => padL + ((x - xMin) / xR) * innerW
    const sy = (y: number) => padT + innerH - ((y - yMin) / yR) * innerH
    // Build tick labels — 5 evenly-spaced on each axis
    const xTicks = Array.from({ length: 5 }, (_, i) => xMin + (xR * i) / 4)
    const yTicks = Array.from({ length: 5 }, (_, i) => yMin + (yR * i) / 4)
    // Best-fit line if provided
    const bestFit = graphic.bestFit as { m?: number; b?: number } | undefined
    return (
      <figure className="my-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-md mx-auto bg-white">
          {/* axes */}
          <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="black" strokeWidth={1} />
          <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="black" strokeWidth={1} />
          {/* x ticks */}
          {xTicks.map((v, i) => (
            <g key={i}>
              <line x1={sx(v)} y1={H - padB} x2={sx(v)} y2={H - padB + 3} stroke="black" strokeWidth={0.75} />
              <text x={sx(v)} y={H - padB + 12} fontSize="8" textAnchor="middle" fill="black">{fmtTick(v)}</text>
            </g>
          ))}
          {/* y ticks */}
          {yTicks.map((v, i) => (
            <g key={i}>
              <line x1={padL - 3} y1={sy(v)} x2={padL} y2={sy(v)} stroke="black" strokeWidth={0.75} />
              <text x={padL - 5} y={sy(v) + 3} fontSize="8" textAnchor="end" fill="black">{fmtTick(v)}</text>
            </g>
          ))}
          {/* best-fit line — drawn first so points sit on top */}
          {bestFit && typeof bestFit.m === 'number' && typeof bestFit.b === 'number' && (
            <line x1={sx(xMin)} y1={sy(bestFit.m * xMin + bestFit.b)} x2={sx(xMax)} y2={sy(bestFit.m * xMax + bestFit.b)} stroke="black" strokeWidth={0.75} strokeDasharray="3 2" />
          )}
          {/* points / line series */}
          {seriesList.map((s, si) => (
            <g key={si}>
              {t !== 'scatter' && s.points.length > 1 && (
                <polyline
                  points={s.points.map(p => `${sx(p[0])},${sy(p[1])}`).join(' ')}
                  fill="none" stroke="black" strokeWidth={1}
                />
              )}
              {s.points.map((p, i) => (
                <circle key={i} cx={sx(p[0])} cy={sy(p[1])} r={2.5} fill="black" />
              ))}
            </g>
          ))}
          {graphic.xLabel && <text x={padL + innerW / 2} y={H - 2} fontSize="10" textAnchor="middle" fill="black" fontStyle="italic">{graphic.xLabel}</text>}
          {graphic.yLabel && <text x={10} y={padT + innerH / 2} fontSize="10" textAnchor="middle" fill="black" fontStyle="italic" transform={`rotate(-90 10 ${padT + innerH / 2})`}>{graphic.yLabel}</text>}
        </svg>
        {graphic.caption && <figcaption className="text-[11px] text-black text-center italic mt-2">{graphic.caption}</figcaption>}
      </figure>
    )
  }

  // ─ Dot plot ────────────────────────────────────────────────────
  if (t === 'dotplot') {
    const values = ((graphic.values ?? []) as number[]).map(Number).filter(n => !isNaN(n))
    if (values.length === 0) return null
    // Stack dots by integer value
    const counts: Record<string, number> = {}
    values.forEach(v => { counts[String(v)] = (counts[String(v)] ?? 0) + 1 })
    const keys = Object.keys(counts).map(Number).sort((a, b) => a - b)
    const minK = keys[0], maxK = keys[keys.length - 1]
    const maxStack = Math.max(...Object.values(counts))
    const W = 300, H = 160
    const padL = 24, padB = 26, padT = 10, padR = 12
    const innerW = W - padL - padR
    const innerH = H - padT - padB
    const range = (maxK - minK) || 1
    const sx = (v: number) => padL + ((v - minK) / range) * innerW
    const dotR = Math.min(5, innerH / (maxStack + 1) / 2.4)
    return (
      <figure className="my-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-md mx-auto bg-white">
          {keys.map((k, i) => (
            <g key={i}>
              {Array.from({ length: counts[String(k)] }).map((_, j) => (
                <circle key={j} cx={sx(k)} cy={H - padB - dotR - j * (dotR * 2 + 1)} r={dotR} fill="black" />
              ))}
              <text x={sx(k)} y={H - padB + 12} fontSize="9" textAnchor="middle" fill="black">{k}</text>
            </g>
          ))}
          <line x1={padL - 6} y1={H - padB} x2={W - padR + 6} y2={H - padB} stroke="black" strokeWidth={1} />
          {graphic.xLabel && <text x={padL + innerW / 2} y={H - 2} fontSize="10" textAnchor="middle" fill="black" fontStyle="italic">{graphic.xLabel}</text>}
        </svg>
        {graphic.caption && <figcaption className="text-[11px] text-black text-center italic mt-2">{graphic.caption}</figcaption>}
      </figure>
    )
  }

  // ─ Coordinate plane (functions, points, lines) ─────────────────
  if (t === 'coordinateplane' || t === 'coordinate' || t === 'plane') {
    const W = 280, H = 280
    const padL = 30, padB = 30, padT = 14, padR = 14
    const innerW = W - padL - padR
    const innerH = H - padT - padB
    const pts = ((graphic.points ?? []) as Array<{ x: number; y: number; label?: string }>)
      .filter(p => p && typeof p.x === 'number' && typeof p.y === 'number')
    const lines = ((graphic.spec as { lines?: Array<{ m: number; b: number }> } | undefined)?.lines
      ?? (graphic as unknown as { lines?: Array<{ m: number; b: number }> }).lines ?? [])
      .filter(ln => ln && typeof ln.m === 'number' && typeof ln.b === 'number')
    const xVals = pts.map(p => p.x)
    const yVals = pts.map(p => p.y)
    // Fit the window to the DATA (pad 1.5 units) — the old fixed
    // [-5,5]-anchored window put e.g. R(6,11) at the extreme top edge
    // with tick labels that stopped at 4, so figures with points
    // beyond ±5 looked wrong/cut off.
    const xMin = Math.floor(Math.min(-2, ...xVals) - 1.5)
    const xMax = Math.ceil(Math.max(2, ...xVals) + 1.5)
    const yMin = Math.floor(Math.min(-2, ...yVals) - 1.5)
    const yMax = Math.ceil(Math.max(2, ...yVals) + 1.5)
    const xR = xMax - xMin; const yR = yMax - yMin
    const sx = (x: number) => padL + ((x - xMin) / xR) * innerW
    const sy = (y: number) => padT + innerH - ((y - yMin) / yR) * innerH
    const xOrigin = sx(0), yOrigin = sy(0)
    // Adaptive tick step → ~4-6 labels per axis at any range.
    const tickStep = (r: number) => r <= 12 ? 2 : r <= 30 ? 5 : 10
    const ticksIn = (min: number, max: number, step: number) => {
      const out: number[] = []
      for (let v = Math.ceil(min / step) * step; v <= max; v += step) if (v !== 0) out.push(v)
      return out
    }
    const xTicks = ticksIn(xMin, xMax, tickStep(xR))
    const yTicks = ticksIn(yMin, yMax, tickStep(yR))
    // If 3-8 labeled points form a figure and the lines are (or were
    // meant to be) its side lines, draw the closed polygon through
    // the POINTS and drop the lines. Two triggers:
    //   - every line passes through ≥2 of the points (exact sides), or
    //   - there are at least as many lines as points (the model
    //     clearly attempted one side-line per edge — prod data shows
    //     it often gets the m/b arithmetic WRONG, e.g. y=2x−9 for the
    //     side through (2,3)-(6,11), while the points themselves match
    //     the prompt; the points are the ground truth).
    // Drawing side lines as infinite lines is what turned triangles
    // into asterisks of crossing lines. Fewer lines than points =
    // genuine function graphs → keep them, clipped to the window.
    const onLine = (ln: { m: number; b: number }, p: { x: number; y: number }) =>
      Math.abs(ln.m * p.x + ln.b - p.y) < 1e-6
    const linesMatchPts = lines.length > 0
      && lines.every(ln => pts.filter(p => onLine(ln, p)).length >= 2)
    const polygonMode = pts.length >= 3 && pts.length <= 8
      && (linesMatchPts || lines.length >= pts.length)
    const freeLines = polygonMode ? [] : lines
    // Clip y = mx + b to the [xMin,xMax]×[yMin,yMax] window so steep
    // lines don't shoot across the whole figure.
    const clipLine = (ln: { m: number; b: number }): [number, number, number, number] | null => {
      if (ln.m === 0) {
        if (ln.b < yMin || ln.b > yMax) return null
        return [xMin, ln.b, xMax, ln.b]
      }
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
    return (
      <figure className="my-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-md mx-auto bg-white">
          {/* grid — at unit density for small ranges, tick density for large */}
          {ticksIn(xMin, xMax, xR <= 16 ? 1 : tickStep(xR)).concat(0).map((v, i) => (
            <line key={`vg${i}`} x1={sx(v)} y1={padT} x2={sx(v)} y2={H - padB} stroke="#d4d4d4" strokeWidth={0.4} />
          ))}
          {ticksIn(yMin, yMax, yR <= 16 ? 1 : tickStep(yR)).concat(0).map((v, i) => (
            <line key={`hg${i}`} x1={padL} y1={sy(v)} x2={W - padR} y2={sy(v)} stroke="#d4d4d4" strokeWidth={0.4} />
          ))}
          {/* axes (only when 0 is inside the window) */}
          {yMin <= 0 && yMax >= 0 && <line x1={padL} y1={yOrigin} x2={W - padR} y2={yOrigin} stroke="black" strokeWidth={1} />}
          {xMin <= 0 && xMax >= 0 && <line x1={xOrigin} y1={padT} x2={xOrigin} y2={H - padB} stroke="black" strokeWidth={1} />}
          {/* tick labels */}
          {xTicks.map(v => (
            <text key={`xt${v}`} x={sx(v)} y={(yMin <= 0 && yMax >= 0 ? yOrigin : H - padB) + 11} fontSize="8" textAnchor="middle" fill="black">{v}</text>
          ))}
          {yTicks.map(v => (
            <text key={`yt${v}`} x={(xMin <= 0 && xMax >= 0 ? xOrigin : padL) - 5} y={sy(v) + 3} fontSize="8" textAnchor="end" fill="black">{v}</text>
          ))}
          {/* polygon through the labeled points (side lines collapsed) */}
          {polygonMode && (
            <polygon
              points={pts.map(p => `${sx(p.x)},${sy(p.y)}`).join(' ')}
              fill="rgba(0,0,0,0.04)" stroke="black" strokeWidth={1.2} strokeLinejoin="round"
            />
          )}
          {/* free lines, clipped to the window */}
          {freeLines.map((ln, i) => {
            const seg = clipLine(ln)
            if (!seg) return null
            return <line key={i} x1={sx(seg[0])} y1={sy(seg[1])} x2={sx(seg[2])} y2={sy(seg[3])} stroke="black" strokeWidth={1} />
          })}
          {/* points */}
          {pts.map((p, i) => (
            <g key={i}>
              <circle cx={sx(p.x)} cy={sy(p.y)} r={2.5} fill="black" />
              {p.label && (
                <text
                  x={sx(p.x) + (sx(p.x) > W - padR - 20 ? -6 : 5)}
                  y={sy(p.y) < padT + 14 ? sy(p.y) + 12 : sy(p.y) - 4}
                  fontSize="9" fill="black" fontWeight="600"
                  textAnchor={sx(p.x) > W - padR - 20 ? 'end' : 'start'}
                >{p.label}</text>
              )}
            </g>
          ))}
        </svg>
        {graphic.caption && <figcaption className="text-[11px] text-black text-center italic mt-2">{graphic.caption}</figcaption>}
      </figure>
    )
  }

  // ─ Inscribed triangle in circle ────────────────────────────────
  // The model emits {type:"inscribedTriangle", r, vertexAngles:[a1,a2,a3], vertexLabels?, sideLabels?}.
  // We compute vertex positions exactly via cos/sin so they're
  // GUARANTEED to lie on the circle — eliminates "vertex floating
  // inside circle" errors from raw SVG attempts.
  if (t === 'inscribedtriangle' || (graphic.shape ?? '').toLowerCase() === 'inscribedtriangle') {
    const spec = (graphic.spec ?? {}) as { r?: number; vertexAngles?: number[] }
    const labels = (graphic.labels ?? {}) as { vertices?: string[]; sides?: string[] }
    // IMPORTANT: spec.r is the MATH radius (e.g. "13 units" in the
    // problem text) — do NOT use it as the SVG drawing size. Prior
    // version drew radius=13 pixels inside a 200×200 viewBox, making
    // a 6%-of-canvas circle with all three vertex labels clustered
    // unreadably on top of each other. The renderer always draws at
    // a fixed comfortable size; the numeric radius reaches the
    // student via the question text + caption.
    const DRAW_R = 72
    const angles = (spec.vertexAngles ?? [0, 120, 240]).slice(0, 3)
    const cx = 100, cy = 100
    const toRad = (deg: number) => (deg - 90) * Math.PI / 180 // 0° = top
    const pts = angles.map(a => [cx + DRAW_R * Math.cos(toRad(a)), cy + DRAW_R * Math.sin(toRad(a))] as [number, number])
    const path = `M ${pts[0][0]},${pts[0][1]} L ${pts[1][0]},${pts[1][1]} L ${pts[2][0]},${pts[2][1]} Z`
    const vL = labels.vertices ?? []
    const sL = labels.sides ?? []
    return (
      <figure className="my-3 flex flex-col items-center">
        <div className="max-w-md w-full bg-white rounded-lg ring-1 ring-gray-200 p-4">
          <svg viewBox="0 0 200 200" className="w-full h-auto max-h-[300px] overflow-visible">
            <circle cx={cx} cy={cy} r={DRAW_R} stroke="black" strokeWidth={1.5} fill="none" />
            <path d={path} stroke="black" strokeWidth={1.5} fill="none" />
            {pts.map((p, i) => {
              // Push vertex label OUTWARD from center by 14px so it
              // sits clearly outside the circle stroke. Prior 10px
              // offset put labels on top of the circle stroke on
              // small draws.
              const dx = p[0] - cx, dy = p[1] - cy
              const len = Math.hypot(dx, dy) || 1
              const lx = p[0] + (dx / len) * 14
              const ly = p[1] + (dy / len) * 14
              return vL[i] ? (
                <text key={i} x={lx} y={ly} fontSize={13} fontWeight={600} fill="black" textAnchor="middle" dominantBaseline="middle">{vL[i]}</text>
              ) : null
            })}
            {[0, 1, 2].map(i => {
              if (!sL[i]) return null
              const a = pts[i], b = pts[(i + 1) % 3]
              const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2
              // Side label pushed 12px outward from centroid, larger
              // font so the value is legible on phones.
              const dx = mx - cx, dy = my - cy
              const len = Math.hypot(dx, dy) || 1
              const lx = mx + (dx / len) * 12
              const ly = my + (dy / len) * 12
              return <text key={`s${i}`} x={lx} y={ly} fontSize={12} fill="black" textAnchor="middle" dominantBaseline="middle">{sL[i]}</text>
            })}
          </svg>
        </div>
        {graphic.caption && <figcaption className="text-[11px] text-black text-center italic mt-2">{graphic.caption}</figcaption>}
      </figure>
    )
  }

  // ─ Inscribed triangle by INTERIOR ANGLES ────────────────────────
  // Semantic-constraint variant of inscribedTriangle. Model provides
  // the INTERIOR angles from the item text (A + B + C = 180°); the
  // renderer applies the inscribed-angle theorem to place vertices so
  // the figure is guaranteed to actually SHOW those angles at those
  // vertices — impossible to render an item where "angle A = 60°" is
  // claimed in the prompt but the drawing shows something else.
  //
  // Model emits {type:"inscribedTriangleByAngles",
  //   spec:{ interiorAngles:[A,B,C] },
  //   labels?:{ vertices?:["A","B","C"], sides?:["a","b","c"] } }
  //
  // Geometry: by the inscribed-angle theorem, the arc opposite each
  // vertex has measure 2·(interior angle at that vertex). Walking the
  // circle counterclockwise, if we start vertex A at angle θ_A:
  //   θ_B = θ_A + 2·C (arc AB opposite C)
  //   θ_C = θ_B + 2·A (arc BC opposite A)
  // Sum check: 2A + 2B + 2C = 360°, always closes.
  if (t === 'inscribedtrianglebyangles' || (graphic.shape ?? '').toLowerCase() === 'inscribedtrianglebyangles') {
    const spec = (graphic.spec ?? {}) as { interiorAngles?: [number, number, number] }
    const labels = (graphic.labels ?? {}) as { vertices?: string[]; sides?: string[] }
    const angles = spec.interiorAngles ?? [60, 60, 60]
    const [A, B, C] = angles
    const angleSum = A + B + C
    // Sanity check: refuse to render obviously-broken input (won't
    // close a triangle). Show caption-only fallback instead of a
    // wrong figure.
    if (Math.abs(angleSum - 180) > 1 || A <= 0 || B <= 0 || C <= 0) {
      return graphic.caption ? (
        <figure className="my-3 flex flex-col items-center">
          <figcaption className="text-[11px] text-gray-500 text-center italic">{graphic.caption}</figcaption>
        </figure>
      ) : null
    }
    const DRAW_R = 72
    const cx = 100, cy = 100
    const toRad = (deg: number) => (deg - 90) * Math.PI / 180
    // Rotate so the triangle sits with vertex A near the top. Start
    // vertex A at position that puts the triangle centroid roughly
    // at the visual centre — angle -90° would put A at the top.
    const thA = -90 - C  // shift so triangle looks balanced
    const thB = thA + 2 * C
    const thC = thB + 2 * A
    const positions = [thA, thB, thC]
    const pts = positions.map(a => [cx + DRAW_R * Math.cos(toRad(a)), cy + DRAW_R * Math.sin(toRad(a))] as [number, number])
    const path = `M ${pts[0][0]},${pts[0][1]} L ${pts[1][0]},${pts[1][1]} L ${pts[2][0]},${pts[2][1]} Z`
    const vL = labels.vertices ?? ['A', 'B', 'C']
    const sL = labels.sides ?? []
    return (
      <figure className="my-3 flex flex-col items-center">
        <div className="max-w-md w-full bg-white rounded-lg ring-1 ring-gray-200 p-4">
          <svg viewBox="0 0 200 200" className="w-full h-auto max-h-[300px] overflow-visible">
            <circle cx={cx} cy={cy} r={DRAW_R} stroke="black" strokeWidth={1.5} fill="none" />
            <path d={path} stroke="black" strokeWidth={1.5} fill="none" />
            {pts.map((p, i) => {
              const dx = p[0] - cx, dy = p[1] - cy
              const len = Math.hypot(dx, dy) || 1
              const lx = p[0] + (dx / len) * 14
              const ly = p[1] + (dy / len) * 14
              return vL[i] ? (
                <text key={i} x={lx} y={ly} fontSize={13} fontWeight={600} fill="black" textAnchor="middle" dominantBaseline="middle">{vL[i]}</text>
              ) : null
            })}
            {[0, 1, 2].map(i => {
              if (!sL[i]) return null
              const a = pts[i], b = pts[(i + 1) % 3]
              const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2
              // Side labels: push toward center (inward) so they sit
              // clearly inside the triangle rather than overlapping
              // the circle stroke outside.
              const dx = cx - mx, dy = cy - my
              const len = Math.hypot(dx, dy) || 1
              const lx = mx + (dx / len) * 10
              const ly = my + (dy / len) * 10
              return <text key={`s${i}`} x={lx} y={ly} fontSize={12} fill="black" textAnchor="middle" dominantBaseline="middle">{sL[i]}</text>
            })}
          </svg>
        </div>
        {graphic.caption && <figcaption className="text-[11px] text-black text-center italic mt-2">{graphic.caption}</figcaption>}
      </figure>
    )
  }

  // ─ Inscribed triangle by SIDE LENGTHS ────────────────────────────
  // Model provides three side lengths (a, b, c opposite vertices A,
  // B, C); renderer applies the law of cosines to derive interior
  // angles, then uses the inscribed-angle theorem for placement.
  // Same guarantee as inscribedTriangleByAngles: the figure is
  // derived from the numerical claims in the prompt, so it cannot
  // disagree with them.
  //
  // Model emits {type:"inscribedTriangleBySides",
  //   spec:{ sides:[a,b,c] },
  //   labels?:{ vertices?:["A","B","C"], sides?:["a","b","c"] } }
  if (t === 'inscribedtrianglebysides' || (graphic.shape ?? '').toLowerCase() === 'inscribedtrianglebysides') {
    const spec = (graphic.spec ?? {}) as { sides?: [number, number, number] }
    const labels = (graphic.labels ?? {}) as { vertices?: string[]; sides?: string[] }
    const sides = spec.sides ?? [5, 5, 5]
    const [a, b, c] = sides
    // Triangle-inequality sanity — refuse impossible side triples.
    if (a + b <= c || b + c <= a || a + c <= b || a <= 0 || b <= 0 || c <= 0) {
      return graphic.caption ? (
        <figure className="my-3 flex flex-col items-center">
          <figcaption className="text-[11px] text-gray-500 text-center italic">{graphic.caption}</figcaption>
        </figure>
      ) : null
    }
    // Law of cosines → interior angles (degrees).
    const A = Math.acos((b * b + c * c - a * a) / (2 * b * c)) * 180 / Math.PI
    const B = Math.acos((a * a + c * c - b * b) / (2 * a * c)) * 180 / Math.PI
    const C = 180 - A - B
    const DRAW_R = 72
    const cx = 100, cy = 100
    const toRad = (deg: number) => (deg - 90) * Math.PI / 180
    const thA = -90 - C
    const thB = thA + 2 * C
    const thC = thB + 2 * A
    const pts = [thA, thB, thC].map(t => [cx + DRAW_R * Math.cos(toRad(t)), cy + DRAW_R * Math.sin(toRad(t))] as [number, number])
    const path = `M ${pts[0][0]},${pts[0][1]} L ${pts[1][0]},${pts[1][1]} L ${pts[2][0]},${pts[2][1]} Z`
    const vL = labels.vertices ?? ['A', 'B', 'C']
    const sL = labels.sides ?? [String(a), String(b), String(c)]
    return (
      <figure className="my-3 flex flex-col items-center">
        <div className="max-w-md w-full bg-white rounded-lg ring-1 ring-gray-200 p-4">
          <svg viewBox="0 0 200 200" className="w-full h-auto max-h-[300px] overflow-visible">
            <circle cx={cx} cy={cy} r={DRAW_R} stroke="black" strokeWidth={1.5} fill="none" />
            <path d={path} stroke="black" strokeWidth={1.5} fill="none" />
            {pts.map((p, i) => {
              const dx = p[0] - cx, dy = p[1] - cy
              const len = Math.hypot(dx, dy) || 1
              const lx = p[0] + (dx / len) * 14
              const ly = p[1] + (dy / len) * 14
              return vL[i] ? (
                <text key={i} x={lx} y={ly} fontSize={13} fontWeight={600} fill="black" textAnchor="middle" dominantBaseline="middle">{vL[i]}</text>
              ) : null
            })}
            {[0, 1, 2].map(i => {
              // Side i sits opposite vertex i (SAT convention: side a
              // opposite vertex A). The side runs between vertices
              // (i+1)%3 and (i+2)%3.
              if (!sL[i]) return null
              const p1 = pts[(i + 1) % 3], p2 = pts[(i + 2) % 3]
              const mx = (p1[0] + p2[0]) / 2, my = (p1[1] + p2[1]) / 2
              const dx = cx - mx, dy = cy - my
              const len = Math.hypot(dx, dy) || 1
              const lx = mx + (dx / len) * 10
              const ly = my + (dy / len) * 10
              return <text key={`s${i}`} x={lx} y={ly} fontSize={12} fill="black" textAnchor="middle" dominantBaseline="middle">{sL[i]}</text>
            })}
          </svg>
        </div>
        {graphic.caption && <figcaption className="text-[11px] text-black text-center italic mt-2">{graphic.caption}</figcaption>}
      </figure>
    )
  }

  // ─ Chord at perpendicular distance from center ─────────────────
  // Model emits {type:"chordAtDistance",
  //   spec:{ distanceFromCenter:d }, // r fixed by renderer; d ≤ r
  //   labels?:{ chord?:string, center?:string, endpoints?:["A","B"] } }
  //
  // Renderer places a horizontal chord d units below the center. If
  // d ≥ DRAW_R the spec is impossible; fall back to caption-only.
  if (t === 'chordatdistance' || (graphic.shape ?? '').toLowerCase() === 'chordatdistance') {
    const spec = (graphic.spec ?? {}) as { r?: number; distanceFromCenter?: number }
    const labels = (graphic.labels ?? {}) as { chord?: string; center?: string; endpoints?: string[] }
    const DRAW_R = 72
    // Interpret d as a fraction of the math radius if the model
    // provided one — otherwise assume d/r ratio matches the drawing.
    const mathR = spec.r ?? 1
    const mathD = spec.distanceFromCenter ?? 0
    if (mathD < 0 || mathD >= mathR || mathR <= 0) {
      return graphic.caption ? (
        <figure className="my-3 flex flex-col items-center">
          <figcaption className="text-[11px] text-gray-500 text-center italic">{graphic.caption}</figcaption>
        </figure>
      ) : null
    }
    const cx = 100, cy = 100
    const d = (mathD / mathR) * DRAW_R
    // Chord horizontal, offset d below the center. Half-length by
    // Pythagoras: sqrt(R² - d²) in drawing units.
    const half = Math.sqrt(DRAW_R * DRAW_R - d * d)
    const chordY = cy + d
    const x1 = cx - half, x2 = cx + half
    const [labA, labB] = labels.endpoints ?? ['A', 'B']
    return (
      <figure className="my-3 flex flex-col items-center">
        <div className="max-w-md w-full bg-white rounded-lg ring-1 ring-gray-200 p-4">
          <svg viewBox="0 0 200 200" className="w-full h-auto max-h-[300px] overflow-visible">
            <circle cx={cx} cy={cy} r={DRAW_R} stroke="black" strokeWidth={1.5} fill="none" />
            <line x1={x1} y1={chordY} x2={x2} y2={chordY} stroke="black" strokeWidth={1.5} />
            {/* Perpendicular from center to chord midpoint */}
            <line x1={cx} y1={cy} x2={cx} y2={chordY} stroke="black" strokeWidth={1} strokeDasharray="3,3" />
            {/* Center dot */}
            <circle cx={cx} cy={cy} r={2.5} fill="black" />
            {labels.center && <text x={cx + 6} y={cy - 4} fontSize={12} fill="black">{labels.center}</text>}
            {/* Endpoint dots + labels */}
            <circle cx={x1} cy={chordY} r={2.5} fill="black" />
            <circle cx={x2} cy={chordY} r={2.5} fill="black" />
            {labA && <text x={x1 - 10} y={chordY + 4} fontSize={13} fontWeight={600} fill="black" textAnchor="end">{labA}</text>}
            {labB && <text x={x2 + 10} y={chordY + 4} fontSize={13} fontWeight={600} fill="black" textAnchor="start">{labB}</text>}
            {labels.chord && <text x={cx} y={chordY + 14} fontSize={12} fill="black" textAnchor="middle">{labels.chord}</text>}
          </svg>
        </div>
        {graphic.caption && <figcaption className="text-[11px] text-black text-center italic mt-2">{graphic.caption}</figcaption>}
      </figure>
    )
  }

  // ─ Right triangle (with optional inscribed circle) ─────────────
  // Model emits {type:"rightTriangle", legA, legB, labels?:{a,b,c,vertices?:[A,B,C]}, incircle?:true}.
  // We compute incircle radius via the correct formula r = (a+b-c)/2.
  if (t === 'righttriangle' || (graphic.shape ?? '').toLowerCase() === 'righttriangle') {
    const spec = (graphic.spec ?? {}) as { legA?: number; legB?: number; incircle?: boolean }
    const labels = (graphic.labels ?? {}) as { a?: string; b?: string; c?: string; vertices?: string[] }
    const a = typeof spec.legA === 'number' ? spec.legA : 6
    const b = typeof spec.legB === 'number' ? spec.legB : 8
    const c = Math.hypot(a, b)
    // Scale to fit in 160×160 drawing area (20-unit margin).
    const scale = 140 / Math.max(a, b)
    const pxA = a * scale, pxB = b * scale
    // Right angle at bottom-left (30, 170); legs run +x and -y.
    const blX = 30, blY = 170
    const brX = blX + pxA, brY = blY
    const tlX = blX, tlY = blY - pxB
    return (
      <figure className="my-3 flex flex-col items-center">
        <div className="max-w-md w-full bg-white rounded-lg ring-1 ring-gray-200 p-4">
          <svg viewBox="0 0 200 200" className="w-full h-auto max-h-[300px] overflow-visible">
            <polygon points={`${blX},${blY} ${brX},${brY} ${tlX},${tlY}`} stroke="black" strokeWidth={1.5} fill="none" />
            {/* Right-angle square mark at the right-angle vertex */}
            <polyline points={`${blX + 8},${blY} ${blX + 8},${blY - 8} ${blX},${blY - 8}`} stroke="black" strokeWidth={1} fill="none" />
            {/* Optional inscribed circle (correct radius) */}
            {spec.incircle && (() => {
              const rScaled = ((a + b - c) / 2) * scale
              return <circle cx={blX + rScaled} cy={blY - rScaled} r={rScaled} stroke="black" strokeWidth={1.5} fill="none" />
            })()}
            {/* Leg labels at midpoints, offset outward */}
            {labels.a && <text x={(blX + brX) / 2} y={blY + 14} fontSize={11} fill="black" textAnchor="middle">{labels.a}</text>}
            {labels.b && <text x={blX - 6} y={(blY + tlY) / 2} fontSize={11} fill="black" textAnchor="end" dominantBaseline="middle">{labels.b}</text>}
            {labels.c && <text x={(brX + tlX) / 2 + 6} y={(brY + tlY) / 2 - 6} fontSize={11} fill="black" textAnchor="start">{labels.c}</text>}
            {labels.vertices && labels.vertices[0] && <text x={tlX - 6} y={tlY - 4} fontSize={11} fill="black" textAnchor="end" fontWeight="600">{labels.vertices[0]}</text>}
            {labels.vertices && labels.vertices[1] && <text x={blX - 6} y={blY + 12} fontSize={11} fill="black" textAnchor="end" fontWeight="600">{labels.vertices[1]}</text>}
            {labels.vertices && labels.vertices[2] && <text x={brX + 6} y={brY + 12} fontSize={11} fill="black" textAnchor="start" fontWeight="600">{labels.vertices[2]}</text>}
          </svg>
        </div>
        {graphic.caption && <figcaption className="text-[11px] text-black text-center italic mt-2">{graphic.caption}</figcaption>}
      </figure>
    )
  }

  // ─ Circle with chord / diameter / tangent / inscribed angle ────
  // Model emits {type:"circleWithChord", r, chords:[{angle1, angle2, label?}], showCenter?, points?:[{angle, label?}]}.
  if (t === 'circlewithchord' || (graphic.shape ?? '').toLowerCase() === 'circlewithchord') {
    const spec = (graphic.spec ?? {}) as { r?: number; chords?: Array<{ angle1: number; angle2: number; label?: string }>; showCenter?: boolean; points?: Array<{ angle: number; label?: string }> }
    // Same fix as inscribedTriangle: spec.r is the MATH radius, not
    // the drawing size. Draw at a fixed comfortable pixel radius so
    // the figure is legible regardless of the problem's stated
    // radius value.
    const DRAW_R = 72
    const cx = 100, cy = 100
    const toRad = (deg: number) => (deg - 90) * Math.PI / 180
    const pt = (deg: number) => [cx + DRAW_R * Math.cos(toRad(deg)), cy + DRAW_R * Math.sin(toRad(deg))] as [number, number]
    const chords = spec.chords ?? []
    // Two model-misuse patterns to sanitize (both seen in prod):
    //   - a circumference point labeled "Center"/"O" (the center is
    //     drawn separately via showCenter — a rim point with that
    //     label is contradictory), and
    //   - a point label duplicating a chord label ("Tangent" on both
    //     → the doubled "Tangent Tangent" render).
    const chordLabels = new Set(chords.map(c => (c.label ?? '').trim().toLowerCase()).filter(Boolean))
    const points = (spec.points ?? []).filter(p => {
      const l = (p.label ?? '').trim().toLowerCase()
      if (l === 'center' || l === '중심') return false
      return true
    }).map(p => chordLabels.has((p.label ?? '').trim().toLowerCase()) ? { ...p, label: undefined } : p)
    return (
      <figure className="my-3 flex flex-col items-center">
        <div className="max-w-md w-full bg-white rounded-lg ring-1 ring-gray-200 p-4">
          <svg viewBox="0 0 200 200" className="w-full h-auto max-h-[300px] overflow-visible">
            <circle cx={cx} cy={cy} r={DRAW_R} stroke="black" strokeWidth={1.5} fill="none" />
            {spec.showCenter && <circle cx={cx} cy={cy} r={2.5} fill="black" />}
            {chords.map((ch, i) => {
              const p1 = pt(ch.angle1), p2 = pt(ch.angle2)
              return (
                <g key={i}>
                  <line x1={p1[0]} y1={p1[1]} x2={p2[0]} y2={p2[1]} stroke="black" strokeWidth={1.5} />
                  {ch.label && (
                    <text x={(p1[0] + p2[0]) / 2 + 6} y={(p1[1] + p2[1]) / 2 - 6} fontSize={12} fill="black">{ch.label}</text>
                  )}
                </g>
              )
            })}
            {points.map((p, i) => {
              const [x, y] = pt(p.angle)
              const dx = x - cx, dy = y - cy
              const len = Math.hypot(dx, dy) || 1
              // Push point labels 14px outward (matches inscribedTriangle)
              const lx = x + (dx / len) * 14
              const ly = y + (dy / len) * 14
              return (
                <g key={i}>
                  <circle cx={x} cy={y} r={2.5} fill="black" />
                  {p.label && <text x={lx} y={ly} fontSize={13} fontWeight={600} fill="black" textAnchor="middle" dominantBaseline="middle">{p.label}</text>}
                </g>
              )
            })}
          </svg>
        </div>
        {graphic.caption && <figcaption className="text-[11px] text-black text-center italic mt-2">{graphic.caption}</figcaption>}
      </figure>
    )
  }

  // ─ Raw SVG escape hatch (geometry, irregular figures) ──────────
  if (t === 'rawsvg' || graphic.svg) {
    return <RawSvgFigure svg={graphic.svg ?? ''} caption={graphic.caption ?? undefined} />
  }

  // ─ Caption-only fallback ───────────────────────────────────────
  return graphic.caption ? (
    <div className="my-3 px-3 py-2 text-[11px] text-black text-center italic">
      [{graphic.caption}]
    </div>
  ) : null
}

function RawSvgFigure({ svg, caption }: { svg: string; caption?: string }) {
  if (!svg) return null
  return (
    <figure className="my-3 flex flex-col items-center">
      {/* Wrap the SVG in a padded white card with a light gray
       *  ring. Models frequently draw shapes flush against the
       *  viewBox edges (polygon vertices at (0,200), circles with
       *  r=95 in a 200x200 viewBox); without the padding the
       *  figure cuts at the card boundary and labels touch the
       *  surrounding prose. overflow-visible on the svg lets text
       *  labels positioned just outside the viewBox still render. */}
      <div className="max-w-md w-full bg-white rounded-lg ring-1 ring-gray-200 p-4">
        <div
          className="w-full [&_svg]:w-full [&_svg]:h-auto [&_svg]:max-h-[300px] [&_svg]:overflow-visible"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
      {caption && <figcaption className="text-[11px] text-black text-center italic mt-2">{caption}</figcaption>}
    </figure>
  )
}
