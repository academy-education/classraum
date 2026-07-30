/**
 * Reconcile the audio bucket against study_response_audio.
 *
 * WHY THIS EXISTS, GIVEN THE LEDGER ALREADY EXISTS. The transcribe route
 * inserts a ledger row right after the upload, and that insert is
 * deliberately NON-FATAL: the audio is already stored and the student is
 * mid-test waiting on a transcript, so failing their turn over a
 * bookkeeping row would trade a recoverable gap for a lost answer.
 *
 * The cost of that choice is that a broken insert is INVISIBLE. It logs
 * and moves on. Nobody watches the logs, so the first symptom would be
 * another pile of unreferenced recordings months later — which is the
 * exact failure the ledger was built to end.
 *
 * So the ledger is not trusted to be complete; it is reconciled. Every
 * object in the bucket must have a row, and this puts one there if it
 * does not. Storage is the source of truth for what EXISTS; the ledger
 * is the source of truth for what is REFERENCED and therefore
 * deletable.
 *
 * The bucket path carries everything needed:
 *     <student_id>/<session_id>/<epoch>.<ext>
 * which is what makes reconstruction possible at all.
 *
 *   npx tsx scripts/reconcile-response-audio.ts          # report only
 *   npx tsx scripts/reconcile-response-audio.ts --write  # insert rows
 *
 * Safe to run repeatedly: storage_path is UNIQUE, and rows are inserted
 * only for paths that have none.
 */
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const BUCKET = 'study-response-audio'
const WRITE = process.argv.includes('--write')

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

;(async () => {
  // Walk the bucket. list() is per-prefix and paginated, so recurse
  // student -> session -> file rather than assuming a flat listing.
  const page = async (prefix: string): Promise<string[]> => {
    const out: string[] = []
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await db.storage.from(BUCKET).list(prefix, { limit: 100, offset })
      if (error) throw new Error(`list ${prefix || '/'}: ${error.message}`)
      if (!data?.length) break
      out.push(...data.map(d => d.name))
      if (data.length < 100) break
    }
    return out
  }

  type Obj = { path: string; student: string; session: string }
  const objects: Obj[] = []
  for (const student of await page('')) {
    for (const session of await page(student)) {
      for (const file of await page(`${student}/${session}`)) {
        objects.push({ path: `${student}/${session}/${file}`, student, session })
      }
    }
  }

  const { data: rows, error } = await db
    .from('study_response_audio').select('storage_path')
  if (error) throw new Error(error.message)
  const known = new Set((rows ?? []).map(r => r.storage_path as string))

  const missing = objects.filter(o => !known.has(o.path))
  // A path whose segments are not UUIDs cannot be attributed, and a
  // session that no longer exists cannot be referenced — the FK would
  // reject it. Both are reported rather than silently skipped: an
  // unattributable recording is exactly the thing this is meant to
  // surface, and quietly ignoring one recreates the original problem.
  const wellFormed = missing.filter(o => UUID.test(o.student) && UUID.test(o.session))
  const malformed = missing.filter(o => !UUID.test(o.student) || !UUID.test(o.session))

  const sessionIds = [...new Set(wellFormed.map(o => o.session))]
  const live = new Set<string>()
  for (let i = 0; i < sessionIds.length; i += 200) {
    const { data } = await db.from('study_sessions')
      .select('id').in('id', sessionIds.slice(i, i + 200))
    for (const r of data ?? []) live.add(r.id as string)
  }
  const insertable = wellFormed.filter(o => live.has(o.session))
  const orphanSession = wellFormed.filter(o => !live.has(o.session))

  console.log(`objects in bucket   : ${objects.length}`)
  console.log(`already referenced  : ${objects.length - missing.length}`)
  console.log(`missing a row       : ${missing.length}`)
  console.log(`  -> insertable     : ${insertable.length}`)
  console.log(`  -> session gone   : ${orphanSession.length}  (unreferenceable; candidates for deletion)`)
  console.log(`  -> malformed path : ${malformed.length}`)
  for (const o of malformed.slice(0, 5)) console.log(`       ${o.path}`)

  if (!WRITE) {
    if (insertable.length) console.log(`\nReport only — re-run with --write to insert ${insertable.length} row(s).`)
    return
  }
  if (!insertable.length) { console.log('\nNothing to insert.'); return }

  let done = 0
  for (let i = 0; i < insertable.length; i += 100) {
    const batch = insertable.slice(i, i + 100).map(o => ({
      session_id: o.session,
      student_id: o.student,
      storage_path: o.path,
      // Unknown for reconstructed rows — the bucket listing does not
      // reliably carry them, and guessing a mime type is worse than a
      // null that says "we did not observe this".
      mime_type: null as string | null,
      bytes: null as number | null,
    }))
    const { error: insErr } = await db.from('study_response_audio').insert(batch)
    if (insErr) throw new Error(`insert at ${i}: ${insErr.message}`)
    done += batch.length
    console.log(`  inserted ${done}/${insertable.length}`)
  }

  const { count } = await db
    .from('study_response_audio').select('*', { count: 'exact', head: true })
  console.log(`\nledger now holds ${count} row(s) for ${objects.length} object(s)`)
})().catch(e => { console.error(e); process.exit(1) })
