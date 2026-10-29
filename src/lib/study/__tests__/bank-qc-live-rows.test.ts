import { parseLiveBankRows } from '@/lib/study/bank-qc-live-rows'

const row = (id: string, cohort: string | null, mc: boolean, method: string | null = null, harvested: string | null = null) =>
  [id, 'sat', 'Algebra', 'claude', cohort, '2026-10-01T00:00:00+00:00', mc, method, harvested]

describe('parseLiveBankRows (bank_qc_live_rows RPC, migration 130)', () => {
  it('maps rows and the per-cohort verify_meta keys', () => {
    const r = parseLiveBankRows({
      count: 2,
      rows: [row('a', 'c1', true, 'm1'), row('b', null, false, null, 'src')],
      keys: { c1: ['method', 'qc'], '(none)': ['harvested_from'] },
    })
    expect(r.rows).toEqual([
      expect.objectContaining({ id: 'a', cohort: 'c1', multipleChoice: true, method: 'm1', harvestedFrom: null }),
      expect.objectContaining({ id: 'b', cohort: null, multipleChoice: false, method: null, harvestedFrom: 'src' }),
    ])
    expect(r.verifyMetaKeys.get('c1')).toEqual(['method', 'qc'])
    expect(r.verifyMetaKeys.get('(none)')).toEqual(['harvested_from'])
  })

  it('refuses a partial read: rows shorter than count throws', () => {
    expect(() => parseLiveBankRows({ count: 3, rows: [row('a', 'c', true)], keys: {} })).toThrow(/partial read/)
  })

  it('refuses an empty or malformed payload instead of returning a number', () => {
    expect(() => parseLiveBankRows(null)).toThrow()
    expect(() => parseLiveBankRows({ rows: [] })).toThrow(/count or rows/)
    expect(() => parseLiveBankRows({ count: 1, rows: [['only-id']] })).toThrow(/malformed/)
  })

  it('treats only a literal true as multiple choice', () => {
    const r = parseLiveBankRows({ count: 2, rows: [row('a', 'c', true), [...row('b', 'c', false).slice(0, 6), null, null, null]], keys: {} })
    expect(r.rows.map(x => x.multipleChoice)).toEqual([true, false])
  })
})
