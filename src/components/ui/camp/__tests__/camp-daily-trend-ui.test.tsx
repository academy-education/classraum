/**
 * @jest-environment jsdom
 *
 * The overview's daily chart: three series on one 0-100 axis, null days left as gaps (never joined, never 0),
 * and a tooltip that shows the n behind every value.
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import type { CampDailyPoint } from '@/lib/camp/daily'

const lineProps: Array<Record<string, unknown>> = []
let tooltipContent: ((p: unknown) => React.ReactNode) | null = null
let chartData: unknown[] = []
jest.mock('recharts', () => {
  const Stub = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>
  return {
    ResponsiveContainer: Stub, XAxis: () => null, YAxis: () => null, Legend: () => null,
    LineChart: ({ children, data }: { children?: React.ReactNode; data: unknown[] }) => { chartData = data; return <div>{children}</div> },
    Line: (p: Record<string, unknown>) => { lineProps.push(p); return null },
    Tooltip: (p: { content?: (x: unknown) => React.ReactNode }) => { if (p.content) tooltipContent = p.content; return null },
  }
})

import { DailyTrendChart } from '../CampOverviewPanel'

const t = (k: string, p?: Record<string, string | number | undefined>) =>
  p ? `${k}(${Object.entries(p).map(([a, b]) => `${a}=${b}`).join(',')})` : k

const point = (date: string, over: Partial<CampDailyPoint>): CampDailyPoint => ({
  date, due: 0, completed: 0, completionPct: null, attendanceMarked: 0, attended: 0, attendancePct: null,
  scoreN: 0, avgScorePct: null, ...over,
})
const points = [
  point('2026-10-20', {}),
  point('2026-10-21', { due: 2, completed: 1, completionPct: 50, attendanceMarked: 3, attended: 2, attendancePct: 67 }),
  point('2026-10-22', { scoreN: 1, avgScorePct: 80 }),
]

beforeEach(() => { lineProps.length = 0; tooltipContent = null; chartData = [] })

it('plots completion, attendance and score from the daily points, with gaps kept as gaps', () => {
  render(<DailyTrendChart points={points} t={t} formatDate={d => d.slice(0, 10)} language="english" />)
  expect(lineProps.map(p => p.dataKey)).toEqual(['completionPct', 'attendancePct', 'avgScorePct'])
  for (const p of lineProps) expect(p.connectNulls).toBe(false)
  // nulls reach the chart as null (a gap), not 0
  expect((chartData as CampDailyPoint[])[0]!.completionPct).toBeNull()
  expect((chartData as CampDailyPoint[])[0]!.avgScorePct).toBeNull()
})

it('the tooltip shows each value with its n, and "No data" for a gap', () => {
  render(<DailyTrendChart points={points} t={t} formatDate={d => d.slice(0, 10)} language="english" />)
  expect(tooltipContent).not.toBeNull()
  render(<>{tooltipContent!({ active: true, label: '2026-10-21', payload: [{ payload: points[1] }] })}</>)
  expect(screen.getByText('50%')).toBeInTheDocument()
  expect(screen.getByText('(camp.daily.completionN(done=1,n=2))')).toBeInTheDocument()
  expect(screen.getByText('67%')).toBeInTheDocument()
  expect(screen.getByText('(camp.daily.attendanceN(done=2,n=3))')).toBeInTheDocument()
  expect(screen.getByText('camp.daily.noData')).toBeInTheDocument()   // no graded session that day
})

it('says when the camp has no days yet', () => {
  render(<DailyTrendChart points={[]} t={t} formatDate={d => d} language="english" />)
  expect(screen.getByText('camp.daily.empty')).toBeInTheDocument()
})
