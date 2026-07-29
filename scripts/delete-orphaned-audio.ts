/**
 * Delete voice recordings in `study-response-audio` that no database row
 * references.
 *
 * WHY THIS EXISTS. On 2026-07-29 the bucket held 66 recordings from 3
 * students and NOT ONE was referenced: every study_response_submissions
 * row had audio_path NULL. 55 of them belonged to sessions with no
 * speaking submission row at all (6 of those sessions were abandoned
 * mid-test), so nothing in the product could ever surface them and no
 * account-deletion cascade could ever reach them — deletion walks
 * foreign keys, and an unreferenced file has none. They would have
 * survived a student deleting their account.
 *
 * The write path was fixed in 4cd8a88 (TestSession now sends audioPaths
 * to grade-batch, which persists them), so NEW recordings are
 * referenced. This script clears the pre-fix residue.
 *
 * SAFETY. The orphan set is RECOMPUTED here, never hardcoded: a file is
 * an orphan only if its session has zero speaking submission rows. Any
 * session that has rows is skipped whole — on 2026-07-29 that protected
 * 11 files under session 63667648-…, whose 3 rows are still a candidate
 * for backfill. Run without --yes first; it prints and exits.
 *
 *   npx tsx scripts/delete-orphaned-audio.ts          # dry run
 *   npx tsx scripts/delete-orphaned-audio.ts --yes    # actually delete
 *
 * Deletion is irreversible. There is no undo and no soft-delete here.
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const BUCKET = 'study-response-audio'
const db = createClient(URL, KEY, { auth: { persistSession: false } })
const commit = process.argv.includes('--yes')

async function main() {
  // 1. Every object in the bucket. Listing is per-prefix, so walk
  //    student folders then session folders rather than assuming a flat
  //    list — and page each level, because the storage list API caps a
  //    single call well below the sizes this will reach later.
  const paths: string[] = []
  const page = async (prefix: string) => {
    const out: string[] = []
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await db.storage.from(BUCKET)
        .list(prefix, { limit: 100, offset })
      if (error) throw new Error(`list ${prefix}: ${error.message}`)
      if (!data?.length) break
      out.push(...data.map(d => d.name))
      if (data.length < 100) break
    }
    return out
  }
  for (const student of await page('')) {
    for (const session of await page(student)) {
      for (const file of await page(`${student}/${session}`)) {
        paths.push(`${student}/${session}/${file}`)
      }
    }
  }

  // 2. Sessions that DO have a speaking submission row are protected
  //    whole — those recordings are still attributable.
  const { data: rows, error } = await db
    .from('study_response_submissions')
    .select('session_id')
    .eq('skill', 'speaking')
    .not('session_id', 'is', null)
  if (error) throw new Error(`submissions: ${error.message}`)
  const referenced = new Set((rows ?? []).map(r => String(r.session_id)))

  const orphans = paths.filter(p => !referenced.has(p.split('/')[1] ?? ''))
  const kept = paths.filter(p => referenced.has(p.split('/')[1] ?? ''))

  console.log(`bucket total     : ${paths.length}`)
  console.log(`protected (rows) : ${kept.length}  across ${new Set(kept.map(p => p.split('/')[1])).size} session(s)`)
  console.log(`orphans          : ${orphans.length}  across ${new Set(orphans.map(p => p.split('/')[1])).size} session(s)`)
  console.log(`students affected: ${new Set(orphans.map(p => p.split('/')[0])).size}`)

  if (!orphans.length) { console.log('\nNothing to delete.'); return }
  if (!commit) {
    console.log('\nDRY RUN — nothing deleted. First 10 orphan paths:')
    orphans.slice(0, 10).forEach(p => console.log(`  ${p}`))
    console.log('\nRe-run with --yes to delete. This cannot be undone.')
    return
  }

  // 3. Delete in batches. remove() takes an array; keep batches modest
  //    so one failure does not obscure which paths survived.
  let deleted = 0
  for (let i = 0; i < orphans.length; i += 50) {
    const batch = orphans.slice(i, i + 50)
    const { error: rmErr } = await db.storage.from(BUCKET).remove(batch)
    if (rmErr) throw new Error(`remove batch at ${i}: ${rmErr.message}`)
    deleted += batch.length
    console.log(`  deleted ${deleted}/${orphans.length}`)
  }

  // 4. Verify by re-listing rather than trusting the return value.
  const after: string[] = []
  for (const student of await page('')) {
    for (const session of await page(student)) {
      for (const file of await page(`${student}/${session}`)) {
        after.push(`${student}/${session}/${file}`)
      }
    }
  }
  console.log(`\nremaining in bucket: ${after.length}  (expected ${kept.length})`)
  if (after.length !== kept.length) {
    console.error('MISMATCH — re-run the dry run and inspect before doing anything else.')
    process.exit(1)
  }
  console.log('Verified: only referenced recordings remain.')
}

main().catch(e => { console.error(e); process.exit(1) })
