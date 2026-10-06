/**
 * A tiny in-memory Supabase query builder that HONOURS its filters.
 *
 * The queue mocks in study-route-helpers return whatever was enqueued no
 * matter what the code filtered on, so they cannot see a dropped
 * `.is('receipt_sent_at', null)` or `.is('receipt_held_reason', null)` —
 * which is exactly the kind of guard the money/messaging paths rely on.
 * Here a query only touches rows its filters select, and an UPDATE is
 * applied synchronously at the terminal call, so a conditional UPDATE is
 * atomic the way it is in Postgres (two concurrent claims: one winner).
 *
 * Supported: select, insert, update, eq, neq, is, in, lt, not(col,'is',null),
 * or('a.neq.x,a.is.null'), order, limit, range, maybeSingle, single, and
 * awaiting the builder directly. A jsonb `config->key` path works in
 * not/neq/or. Anything else throws rather than silently matching all rows.
 *
 * NOTE: lives outside __tests__/ on purpose — jest's testMatch picks up
 * every file under __tests__/.
 */
type Row = Record<string, unknown>
type Filter = (r: Row) => boolean

/** Column value, following one jsonb `col->key` hop; missing reads as null
 *  (SQL semantics: a null never equals or not-equals anything). */
function get(r: Row, path: string): unknown {
  const [col, key] = path.split(/->>?/)
  const base = r[col] ?? null
  if (key === undefined) return base
  if (base === null || typeof base !== 'object') return null
  return (base as Row)[key] ?? null
}

export interface FakeDb {
  tables: Record<string, Row[]>
  from: (table: string) => unknown
  /** Every executed operation, in order: e.g. 'update study_payments'. */
  log: string[]
}

export function fakeDb(seed: Record<string, Row[]> = {}): FakeDb {
  const tables: Record<string, Row[]> = {}
  for (const [k, v] of Object.entries(seed)) tables[k] = v.map(r => ({ ...r }))
  const log: string[] = []

  function from(table: string) {
    tables[table] ??= []
    let op: 'select' | 'update' | 'insert' = 'select'
    let patch: Row | null = null
    let toInsert: Row[] = []
    let returning = false
    let limitN: number | null = null
    let rangeFrom = 0
    let orderBy: { col: string; asc: boolean } | null = null
    const filters: Filter[] = []

    const run = (): { data: Row[]; error: null } => {
      const rows = tables[table]
      log.push(`${op} ${table}`)
      if (op === 'insert') {
        for (const r of toInsert) rows.push({ ...r })
        return { data: returning ? toInsert.map(r => ({ ...r })) : [], error: null }
      }
      let hit = rows.filter(r => filters.every(f => f(r)))
      if (op === 'update') {
        for (const r of hit) Object.assign(r, patch)
        return { data: returning ? hit.map(r => ({ ...r })) : [], error: null }
      }
      if (orderBy) {
        const { col, asc } = orderBy
        hit = [...hit].sort((a, b) => (String(a[col]) < String(b[col]) ? -1 : 1) * (asc ? 1 : -1))
      }
      if (rangeFrom > 0) hit = hit.slice(rangeFrom)
      if (limitN !== null) hit = hit.slice(0, limitN)
      return { data: hit.map(r => ({ ...r })), error: null }
    }

    const b: Record<string, unknown> = {
      select: () => { if (op !== 'select') returning = true; return b },
      update: (p: Row) => { op = 'update'; patch = p; return b },
      insert: (r: Row | Row[]) => { op = 'insert'; toInsert = Array.isArray(r) ? r : [r]; return b },
      eq: (c: string, v: unknown) => { filters.push(r => r[c] === v); return b },
      is: (c: string, v: unknown) => { filters.push(r => (r[c] ?? null) === v); return b },
      in: (c: string, vs: unknown[]) => { filters.push(r => vs.includes(r[c])); return b },
      lt: (c: string, v: string) => { filters.push(r => String(r[c]) < v); return b },
      neq: (c: string, v: unknown) => { filters.push(r => { const x = get(r, c); return x !== null && x !== v }); return b },
      // Only the `.not(col, 'is', null)` shape, with a jsonb `a->b` path.
      not: (c: string, operator: string, v: unknown) => {
        if (operator !== 'is' || v !== null) throw new Error(`fakeDb: unsupported not(${c}, ${operator})`)
        filters.push(r => get(r, c) !== null)
        return b
      },
      // PostgREST or-list of `col.eq.x` / `col.neq.x` / `col.is.null`.
      or: (expr: string) => {
        const parts = expr.split(',').map(p => {
          const [col, operator, ...rest] = p.split('.')
          const val = rest.join('.')
          if (operator === 'is' && val === 'null') return (r: Row) => get(r, col) === null
          if (operator === 'eq') return (r: Row) => String(get(r, col)) === val
          if (operator === 'neq') return (r: Row) => { const x = get(r, col); return x !== null && String(x) !== val }
          throw new Error(`fakeDb: unsupported or(${p})`)
        })
        filters.push(r => parts.some(f => f(r)))
        return b
      },
      order: (col: string, o?: { ascending?: boolean }) => { orderBy = { col, asc: o?.ascending !== false }; return b },
      limit: (n: number) => { limitN = n; return b },
      range: (from: number, to: number) => { rangeFrom = from; limitN = to - from + 1; return b },
      maybeSingle: async () => {
        const { data } = run()
        if (op === 'update' && !returning) return { data: null, error: null }
        return { data: data[0] ?? null, error: null }
      },
      single: async () => {
        const { data } = run()
        return data[0] ? { data: data[0], error: null } : { data: null, error: { message: 'no rows' } }
      },
      then: (ok: (v: unknown) => unknown, bad?: (e: unknown) => unknown) =>
        Promise.resolve().then(() => {
          const res = run()
          return op === 'select' || returning ? res : { data: null, error: null }
        }).then(ok, bad),
    }
    return b
  }

  return { tables, from, log }
}
