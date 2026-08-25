import { fetchAllRows } from '@/lib/fetch-all-rows'

/**
 * The bug this helper exists to stop is silent: PostgREST returns 1000
 * rows and a 200. So the tests care most about the boundaries where a
 * pager quietly drops or repeats data — an exact multiple of the page
 * size, an empty result, and an error mid-way.
 */

/** A fake table of `total` rows that honours .range() like PostgREST. */
const fakePage = (total: number, calls: number[][] = []) =>
  (from: number, to: number) => {
    calls.push([from, to])
    const rows = Array.from({ length: total }, (_, i) => ({ id: i }))
    return Promise.resolve({ data: rows.slice(from, to + 1), error: null })
  }

describe('fetchAllRows', () => {
  it('returns everything when the total is under one page', async () => {
    const res = await fetchAllRows(fakePage(7), 10)
    expect(res.error).toBeNull()
    expect(res.data).toHaveLength(7)
    expect(res.truncated).toBe(false)
  })

  it('pages past the cap and keeps every row exactly once', async () => {
    const res = await fetchAllRows(fakePage(2350), 1000)
    expect(res.data).toHaveLength(2350)
    expect(new Set(res.data!.map(r => r.id)).size).toBe(2350)
  })

  it('handles a total that is an EXACT multiple of the page size', async () => {
    // The classic off-by-one: "stop when the page is short" never fires
    // here, so a pager that does not ask for one more page either loops
    // forever or silently stops early.
    const calls: number[][] = []
    const res = await fetchAllRows(fakePage(2000, calls), 1000)
    expect(res.data).toHaveLength(2000)
    expect(new Set(res.data!.map(r => r.id)).size).toBe(2000)
    // three requests: 0-999, 1000-1999, and the empty 2000-2999
    expect(calls).toEqual([[0, 999], [1000, 1999], [2000, 2999]])
  })

  it('handles an empty table without a second request', async () => {
    const calls: number[][] = []
    const res = await fetchAllRows(fakePage(0, calls), 1000)
    expect(res.data).toEqual([])
    expect(calls).toHaveLength(1)
  })

  it('preserves the order the pages came back in', async () => {
    const res = await fetchAllRows(fakePage(2500), 1000)
    expect(res.data!.map(r => r.id).slice(0, 3)).toEqual([0, 1, 2])
    expect(res.data!.at(-1)!.id).toBe(2499)
  })

  it('surfaces an error instead of returning a partial list', async () => {
    // A half-filled array that looks successful is how a truncation bug
    // gets re-created inside the fix for a truncation bug.
    let n = 0
    const res = await fetchAllRows<{ id: number }>((from, to) => {
      n++
      if (n === 2) return Promise.resolve({ data: null, error: { message: 'boom' } })
      return Promise.resolve({
        data: Array.from({ length: to - from + 1 }, (_, i) => ({ id: from + i })),
        error: null,
      })
    }, 1000)
    expect(res.error).toEqual({ message: 'boom' })
    expect(res.data).toBeNull()
  })

  it('flags truncation rather than looping forever on a runaway source', async () => {
    // A source that always returns a full page: the backstop must fire
    // and SAY so, not return a plausible-looking list.
    const res = await fetchAllRows((from, to) =>
      Promise.resolve({
        data: Array.from({ length: to - from + 1 }, (_, i) => ({ id: from + i })),
        error: null,
      }), 1000)
    expect(res.truncated).toBe(true)
    expect(res.data).toHaveLength(100_000)
  })
})
