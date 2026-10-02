/** @jest-environment node */
/**
 * loadExposures must read a student's WHOLE exposure ledger. It was one
 * unpaged read, and PostgREST caps a response at 1000 rows: every exposure
 * past the cap went missing, and a missing exposure ranks as UNSEEN, so a
 * heavy student was re-served items as fresh. REGISTER §5, 2026-10-02.
 *
 * The fake below enforces the server's cap the way PostgREST does — no
 * range means the first 1000 rows, and no page is ever larger than 1000 —
 * so an unpaged read FAILS here rather than passing on an uncapped mock.
 */
import { loadExposures } from '@/lib/study/assemble'
import { dbAdmin } from '@/lib/supabase-admin'

jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: { from: jest.fn() } }))
const fromMock = dbAdmin.from as unknown as jest.Mock

const CAP = 1000
type Ex = { item_id: string; seen_at: string; session_id: string | null; student_id: string }

function cappedLedger(rows: Ex[]) {
  const calls: Array<{ range: [number, number] | null; order: string | null }> = []
  fromMock.mockImplementation((table: string) => {
    if (table !== 'study_item_exposures') throw new Error(`unexpected table ${table}`)
    let student: string | null = null
    let order: string | null = null
    let range: [number, number] | null = null
    const b = {
      select: () => b,
      eq: (col: string, v: string) => { if (col === 'student_id') student = v; return b },
      order: (col: string) => { order = col; return b },
      range: (f: number, t: number) => { range = [f, t]; return b },
      then: (ok: (v: unknown) => unknown, bad?: (e: unknown) => unknown) => {
        calls.push({ range, order })
        let mine = rows.filter(r => r.student_id === student)
        if (order) mine = [...mine].sort((a, c) => (a as Record<string, string | null>)[order!]!.localeCompare((c as Record<string, string | null>)[order!]!))
        const [f, t] = range ?? [0, CAP - 1]
        const page = mine.slice(f, Math.min(t + 1, f + CAP))
        return Promise.resolve({ data: page, error: null }).then(ok, bad)
      },
    }
    return b
  })
  return calls
}

const ledger = (n: number, student = 's1', session: (i: number) => string | null = () => null): Ex[] =>
  Array.from({ length: n }, (_, i) => ({
    item_id: `item-${String(i).padStart(5, '0')}`,
    seen_at: new Date(Date.UTC(2026, 0, 1) + i * 1000).toISOString(),
    session_id: session(i),
    student_id: student,
  }))

describe('loadExposures', () => {
  it('reads a history of more than 1000 rows in full', async () => {
    const calls = cappedLedger([...ledger(2345), ...ledger(50, 'other')])
    const m = await loadExposures('s1')
    expect(m.size).toBe(2345)
    expect(m.get('item-02344')).toBe(new Date(Date.UTC(2026, 0, 1) + 2344 * 1000).toISOString())
    expect(calls).toHaveLength(3)
    expect(calls.every(c => c.order === 'item_id')).toBe(true)
  })

  it('reads exactly 1000 rows and stops on the empty page', async () => {
    cappedLedger(ledger(1000))
    expect((await loadExposures('s1')).size).toBe(1000)
  })

  it('still excludes the re-drawing session across pages', async () => {
    cappedLedger(ledger(1500, 's1', i => (i >= 1200 ? 'sess-x' : null)))
    expect((await loadExposures('s1', 'sess-x')).size).toBe(1200)
  })
})
