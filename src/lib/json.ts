import type { Json } from '@/lib/database.types'

/**
 * Helpers for the boundary between application types and `jsonb` columns.
 *
 * The generated database types give every `jsonb` column the `Json` type:
 *
 *   type Json = string | number | boolean | null
 *             | { [key: string]: Json | undefined }
 *             | Json[]
 *
 * Most application payloads are NOT assignable to it — `unknown`-typed
 * escape-hatch fields (`QuestionGraphic.spec`, a cron's arbitrary return
 * value, a parsed request body) and `interface` declarations, which
 * TypeScript deliberately withholds an implicit index signature from.
 *
 * The two functions here close that gap by actually looking at the value
 * instead of asserting a shape, so a value the column cannot represent is
 * normalised at the write boundary rather than silently mangled by Postgres.
 */

export type JsonObject = { [key: string]: Json | undefined }

/**
 * Narrow an arbitrary value to the `Json` shape a `jsonb` column can store.
 *
 * Mirrors what `JSON.stringify` would do on the wire (undefined properties
 * dropped, `Date` → ISO string) but keeps a real type instead of `any`.
 * Values with no JSON representation at all (functions, symbols) become
 * `null` rather than vanishing, so their presence is still visible in the row.
 */
export function toJson(value: unknown): Json {
  if (value === null) return null
  const t = typeof value
  if (t === 'string' || t === 'number' || t === 'boolean') return value as Json
  if (Array.isArray(value)) return value.map(toJson)
  if (value instanceof Date) return value.toISOString()
  if (t === 'object') {
    const out: JsonObject = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) out[k] = toJson(v)
    }
    return out
  }
  // function / symbol / undefined — no jsonb representation.
  return null
}

/**
 * Narrow a value read back out of a `jsonb` column to its object case.
 *
 * `Json` includes scalars and arrays, so a column value cannot be spread or
 * key-indexed without this. Anything that is not a JSON object (including
 * a NULL column) reads as `{}` — the same thing the callers' previous
 * `?? {}` fallbacks meant.
 */
export function jsonObject(value: Json | null | undefined): JsonObject {
  return value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value)
    ? value
    : {}
}
