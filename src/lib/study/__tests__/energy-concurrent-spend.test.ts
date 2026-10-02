/** @jest-environment node */
/**
 * Two practice starts fired together (double-tap, two tabs) both read the
 * same energy row. The debit used to be an upsert of a value computed from
 * that read, so both wrote energy-1: two sets for one energy. The write is
 * now a compare-and-swap on the (energy, updated_at) pair read, so the
 * loser re-reads and debits again (or is refused at zero).
 */
import { spendEnergy, FREE_ENERGY_CAP } from '@/lib/study/practice-quota'
import { dbAdmin } from '@/lib/supabase-admin'

jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: { from: jest.fn() } }))
jest.mock('@/lib/ops/alert', () => ({ raiseAlert: jest.fn(async () => {}) }))

const from = dbAdmin.from as unknown as jest.Mock
const tick = () => new Promise(r => setTimeout(r, 0))

/** study_energy with real CAS semantics; study_subscriptions = free user. */
function fakeEnergy(initial: { energy: number; updated_at: string } | null) {
  const db = { row: initial ? { ...initial } : null as { energy: number; updated_at: string } | null }
  from.mockImplementation((table: string) => {
    const filters: Record<string, unknown> = {}
    let op = 'select'
    let payload: Record<string, unknown> = {}
    const b: Record<string, unknown> = {}
    for (const m of ['select', 'maybeSingle', 'single']) b[m] = jest.fn(() => b)
    b.eq = jest.fn((k: string, v: unknown) => { filters[k] = v; return b })
    for (const m of ['update', 'upsert', 'insert']) {
      b[m] = jest.fn((p: Record<string, unknown>) => { op = m; payload = p; return b })
    }
    b.then = async (ok: (v: unknown) => unknown) => {
      await tick()
      if (table !== 'study_energy') return ok({ data: null, error: null })
      if (op === 'select') return ok({ data: db.row ? { ...db.row } : null, error: null })
      if (op === 'upsert') { db.row = { energy: payload.energy as number, updated_at: payload.updated_at as string }; return ok({ data: null, error: null }) }
      if (op === 'insert') {
        if (db.row) return ok({ data: null, error: { code: '23505', message: 'dup' } })
        db.row = { energy: payload.energy as number, updated_at: payload.updated_at as string }
        return ok({ data: null, error: null })
      }
      // update: honour every eq filter except the key
      const match = db.row &&
        (!('energy' in filters) || filters.energy === db.row.energy) &&
        (!('updated_at' in filters) || filters.updated_at === db.row.updated_at)
      if (!match) return ok({ data: [], error: null })
      db.row = { energy: payload.energy as number, updated_at: payload.updated_at as string }
      return ok({ data: [{ student_id: 'stu' }], error: null })
    }
    return b
  })
  return db
}

describe('spendEnergy under concurrent starts', () => {
  beforeEach(() => jest.clearAllMocks())

  it('two simultaneous spends from an existing row debit two energy', async () => {
    const db = fakeEnergy({ energy: 2, updated_at: new Date().toISOString() })
    const [a, b] = await Promise.all([spendEnergy('stu'), spendEnergy('stu')])
    expect(a.ok && b.ok).toBe(true)
    expect(db.row!.energy).toBe(0)
  })

  it('with ONE energy left, only one of two simultaneous spends succeeds', async () => {
    const db = fakeEnergy({ energy: 1, updated_at: new Date().toISOString() })
    const results = await Promise.all([spendEnergy('stu'), spendEnergy('stu')])
    expect(results.filter(r => r.ok)).toHaveLength(1)
    expect(db.row!.energy).toBe(0)
  })

  it('two simultaneous FIRST spends (no row yet) debit two energy', async () => {
    const db = fakeEnergy(null)
    const [a, b] = await Promise.all([spendEnergy('stu'), spendEnergy('stu')])
    expect(a.ok && b.ok).toBe(true)
    expect(db.row!.energy).toBe(FREE_ENERGY_CAP - 2)
  })
})
