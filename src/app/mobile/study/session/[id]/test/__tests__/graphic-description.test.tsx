/**
 * Text alternative for question figures. Two things are pinned:
 *
 *   1. The description carries the figure's content (labels, values,
 *      points) so a screen-reader user can answer the item at all.
 *   2. It carries NOTHING the figure does not show. The spec holds the
 *      best-fit m/b, inscribed-triangle angles, a chord's distance —
 *      often the very quantity the item asks for. Each leak test below
 *      uses a distinctive value that would appear verbatim if leaked.
 */
import React from 'react'
import { render } from '@testing-library/react'
import en from '@/locales/en.json'
import ko from '@/locales/ko.json'
import { describeGraphic, type GraphicTranslate } from '../graphic-description'
import type { QuestionGraphic } from '../types'

const translator = (dict: unknown): GraphicTranslate => (key, params) => {
  let v = key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], dict)
  if (typeof v !== 'string') throw new Error(`missing key ${key}`)
  for (const [k, val] of Object.entries(params ?? {})) v = (v as string).split(`{${k}}`).join(String(val))
  return v as string
}
const tEn = translator(en)
const tKo = translator(ko)
const text = (g: QuestionGraphic, t = tEn) => describeGraphic(g, t).join(' ')

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      let v = key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], jest.requireActual('@/locales/en.json'))
      if (typeof v !== 'string') return key
      for (const [k, val] of Object.entries(params ?? {})) v = (v as string).split(`{${k}}`).join(String(val))
      return v
    },
  }),
}))

describe('describeGraphic — content', () => {
  it('bar chart: axes, every bar label and its (readable) value', () => {
    const s = text({ type: 'bar', xLabel: 'Month', yLabel: 'Sales', bars: [{ label: 'Jan', value: 20 }, { label: 'Feb', value: 40 }] })
    expect(s).toContain('Bar chart with 2 bars.')
    expect(s).toContain('Horizontal axis: Month.')
    expect(s).toContain('Vertical axis: Sales.')
    expect(s).toContain('Jan: 20.')
    expect(s).toContain('Feb: 40.')
  })

  it('dot plot: exact value counts (the stacks are countable)', () => {
    expect(text({ type: 'dotplot', values: [3, 1, 3, 2, 3] })).toContain('1: 1, 2: 1, 3: 3')
  })

  it('coordinate plane: labelled points and the polygon they form', () => {
    const s = text({ type: 'coordinateplane', points: [{ x: 0, y: 0, label: 'P' }, { x: 4, y: 0, label: 'Q' }, { x: 0, y: 3, label: 'R' }], spec: { lines: [{ m: 0, b: 0 }, { m: -0.75, b: 3 }, { m: 0, b: 0 }] } })
    expect(s).toContain('Point P at (0, 0).')
    expect(s).toContain('Point Q at (4, 0).')
    expect(s).toContain('The points P, Q, R are joined in order')
  })

  it('right triangle: right-angle vertex and side labels named by endpoints', () => {
    const s = text({ type: 'rightTriangle', spec: { legA: 3, legB: 4 }, labels: { a: '3', b: '4', c: 'x', vertices: ['A', 'B', 'C'] } })
    expect(s).toContain('Right triangle ABC with the right angle at B.')
    expect(s).toContain('Side BC is labeled 3.')
    expect(s).toContain('Side AB is labeled 4.')
    expect(s).toContain('Side AC is labeled x.')
  })

  it('Korean output is polite form and has no English template text', () => {
    const s = text({ type: 'bar', xLabel: '월', bars: [{ label: '1월', value: 5 }] }, tKo)
    expect(s).toContain('막대그래프입니다.')
    expect(s).not.toMatch(/Bar chart|axis/i)
  })

  it('two-way tables get no description (already a semantic table)', () => {
    expect(describeGraphic({ type: 'twoWayTable', rowLabels: ['a'], colLabels: ['b'], cells: [[1]] }, tEn)).toEqual([])
  })
})

describe('describeGraphic — never states what the figure does not show', () => {
  it('best-fit line: no slope or intercept, only where it visibly runs', () => {
    const s = text({ type: 'scatter', points: [[0, 0], [10, 20]], bestFit: { m: 1.937, b: 0.413 } })
    expect(s).toContain('line of best fit')
    expect(s).not.toMatch(/1\.937|0\.413|slope|intercept/)
  })

  it('scatter values that only position encodes are rounded to the axis resolution', () => {
    // y range 0-100 -> resolution 5 (niceStep(100/40)); 37.3 is not readable off the axis.
    const s = text({ type: 'scatter', points: [[1, 37.3], [2, 100]] })
    expect(s).not.toContain('37.3')
    expect(s).toContain('about 35')
  })

  it('inscribed triangle by angles: the angles are not drawn, so not stated', () => {
    const s = text({ type: 'inscribedTriangleByAngles', spec: { interiorAngles: [37, 61, 82] } })
    expect(s).toContain('Triangle ABC inscribed in a circle.')
    expect(s).not.toMatch(/37|61|82|°|degree/)
  })

  it('inscribed triangle by vertex angles: positions are not stated', () => {
    const s = text({ type: 'inscribedTriangle', spec: { r: 13, vertexAngles: [17, 143, 251] }, labels: { vertices: ['P', 'Q', 'R'] } })
    expect(s).not.toMatch(/13|17|143|251/)
  })

  it('chord at distance: neither d nor r is stated', () => {
    const s = text({ type: 'chordAtDistance', spec: { r: 13, distanceFromCenter: 5 }, labels: { center: 'O', endpoints: ['A', 'B'] } })
    expect(s).toContain('horizontal chord AB')
    expect(s).not.toMatch(/13|\b5\b|12/)
  })

  it('coordinate-plane line: grid points it crosses, never its equation', () => {
    const s = text({ type: 'coordinateplane', points: [], spec: { lines: [{ m: 2, b: -3 }] } })
    expect(s).toMatch(/A line passes through \(-?\d+, -?\d+\) and \(-?\d+, -?\d+\)\./)
    expect(s).not.toMatch(/y\s*=|slope|2x/)
  })

  it('circle chord is only called a diameter when the centre is drawn', () => {
    const chords = [{ angle1: 0, angle2: 180 }]
    expect(text({ type: 'circleWithChord', spec: { chords, showCenter: false } })).toContain('A chord is drawn.')
    expect(text({ type: 'circleWithChord', spec: { chords, showCenter: true } })).toContain('A diameter is drawn.')
  })

  it('specs the renderer refuses (caption-only fallback) get no description', () => {
    expect(describeGraphic({ type: 'inscribedTriangleByAngles', spec: { interiorAngles: [90, 90, 90] } }, tEn)).toEqual([])
    expect(describeGraphic({ type: 'inscribedTriangleBySides', spec: { sides: [1, 1, 5] } }, tEn)).toEqual([])
  })
})

describe('QuestionGraphicView wiring', () => {
  // Imported lazily so the useTranslation mock above is in place.
  const load = () => import('../QuestionGraphicView').then(m => m.QuestionGraphicView)

  it('hides the drawing from AT and exposes the description + caption', async () => {
    const View = await load()
    const { container } = render(<View graphic={{ type: 'bar', bars: [{ label: 'Jan', value: 20 }], caption: 'Monthly sales' }} />)
    const svg = container.querySelector('svg')!
    expect(svg.closest('[aria-hidden="true"]')).not.toBeNull()
    const desc = container.querySelector('.sr-only')!
    expect(desc.textContent).toContain('Jan: 20.')
    expect(desc.textContent).toContain('Monthly sales')
  })

  it('raw SVG is one labelled image', async () => {
    const View = await load()
    const { container } = render(<View graphic={{ type: 'rawSvg', svg: '<svg></svg>', caption: 'Quadrilateral ABCD' }} />)
    expect(container.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('Quadrilateral ABCD')
  })

  it('tables render unwrapped (no sr-only duplicate)', async () => {
    const View = await load()
    const { container } = render(<View graphic={{ type: 'table', rowLabels: ['a'], colLabels: ['b'], cells: [[1]] }} />)
    expect(container.querySelector('.sr-only')).toBeNull()
    expect(container.querySelector('table')).not.toBeNull()
  })
})
