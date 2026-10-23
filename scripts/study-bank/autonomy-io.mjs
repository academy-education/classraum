/**
 * autonomy-io.mjs — the DB half shared by autonomy-state.mjs, draw-next.mjs (level-aware mode) and
 * release-by-shape.mjs. Read-only. Every read is paged by id AND checked against the server's count:'exact'
 * (autonomy-core assertComplete), so a 1,000-row cap, an RLS gap or a row landing mid-read refuses instead of
 * returning a smaller, cleaner-looking population.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { assertComplete, RefusalError } from './autonomy-core.mjs'

export const here = new URL('.', import.meta.url).pathname

export function client() {
  const env = Object.fromEntries(readFileSync(here + '../../.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
}

/** Every row matching `tune`, paged by id, refused unless the total equals count:'exact' for the same filter. */
export async function pageExact(db, table, select, tune = q => q, what = table) {
  const head = await tune(db.from(table).select('id', { count: 'exact', head: true }))
  if (head.error) throw new RefusalError(`${what}: count failed: ${head.error.message}`)
  const out = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await tune(db.from(table).select(select)).order('id', { ascending: true }).range(from, from + 999)
    if (error) throw new RefusalError(`${what}: ${error.message}`)
    out.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  assertComplete(what, head.count, out.length)
  return out
}

/** Rows by id list, chunked; the union must hold every distinct id asked for. */
export async function rowsByIds(db, table, select, ids, what = table) {
  const want = [...new Set(ids)]
  const out = []
  for (let i = 0; i < want.length; i += 150) {
    const chunk = want.slice(i, i + 150)
    out.push(...await pageExact(db, table, select, q => q.in('id', chunk), `${what} [${i}..${i + chunk.length}]`))
  }
  const got = new Set(out.map(r => r.id))
  const missing = want.filter(id => !got.has(id))
  if (missing.length) throw new RefusalError(`${what}: ${missing.length} of ${want.length} ids have no row (empty join), e.g. ${missing[0]}`)
  return out
}

export function refuseAndExit(e) {
  if (e instanceof RefusalError) { console.error('REFUSING: ' + e.message); process.exit(2) }
  throw e
}
