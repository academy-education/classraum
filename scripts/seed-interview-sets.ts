/**
 * Seed the hand-authored TOEFL "Take an Interview" sets into
 * study_item_bank, then retire the standalone items they replace.
 *
 * Usage:
 *   npx tsx scripts/seed-interview-sets.ts            # dry run, prints the plan
 *   npx tsx scripts/seed-interview-sets.ts --apply    # writes
 *
 * WHY THIS EXISTS. The bank held 83 interview questions with a NULL
 * passage_group_id. assemble.ts draws this task through drawGrouped, so
 * four ungrouped singletons came back — four unrelated questions with no
 * scenario and no escalation, and repeatedly two on the same subject in
 * one test. Grouping is the fix; the code already supports it.
 *
 * ORDERING MATTERS. Sets are inserted BEFORE the legacy items are
 * archived, and the archive step refuses to run unless the expected
 * number of grouped items is already present. Archiving first would
 * leave TOEFL Speaking unable to fill its blueprint.
 *
 * Re-runnable: rows are keyed by content_hash, so a second run inserts
 * nothing new. Archiving is idempotent for the same reason.
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createHash } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { INTERVIEW_SETS } from '../src/lib/study/toefl-interview-sets'

config({ path: resolve(process.cwd(), '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(2)
}
const db = createClient(url, key, { auth: { persistSession: false } })

const APPLY = process.argv.includes('--apply')
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/** Matches the bank's existing hashing convention: passage, then prompt,
 *  then choices (empty for an open response). */
const hashOf = (passage: string, prompt: string) =>
  createHash('md5').update([norm(passage), norm(prompt), ''].join('~~')).digest('hex')

/** Fixed epoch for the authored order. assemble.ts orders the bank by
 *  created_at and relies on it to carry the 1→N escalation — "nothing
 *  else in the row carries that sequence", as its own comment says. A
 *  single-statement insert stamps every row with the SAME now(), which
 *  makes that ORDER BY non-total and leaves intra-set order to the
 *  planner: the first run of this script produced one rotated set in
 *  twelve draws (2,3,4,1), and the escalation was silently lost. So the
 *  timestamps are assigned explicitly, one second apart, rung by rung. */
const ORDER_EPOCH = Date.parse('2026-07-28T00:00:00Z')

const rows = INTERVIEW_SETS.flatMap((set, setIdx) => {
  const groupId = `interview-${set.id}`
  return set.questions.map(q => {
    // The "[Interview] " tag is what the session UI and the task-type
    // inference both key on — see inferSpeakingTaskType.
    const prompt = `[Interview] ${q.text}`
    return {
      family: 'toefl',
      section: 'speaking',
      domain: 'Interview',
      subskill: `rung-${q.rung}`,
      difficulty: 'hard',
      topic_tag: set.id,
      item_type: 'speaking_interview',
      passage_group_id: groupId,
      item: {
        type: 'speaking_interview',
        prompt,
        // Identical on all four items: ETS delivers the scenario once per
        // task, both aurally and in print.
        passage: set.premise,
        passageGroupId: groupId,
        choices: [],
        correct_answer: '',
        correct_answers: null,
        acceptable_answers: null,
        difficulty: 'hard',
        explanation: q.explanation,
        distractor_rationales: [],
        blanks: null,
        graphic: null,
      },
      content_hash: hashOf(set.premise, prompt),
      word_count: null,
      verified: true,
      verify_meta: {
        method: 'hand-authored-set',
        rung: q.rung,
        frame: q.frame,
        interviewer: set.interviewer,
      },
      source: 'hand',
      archived: false,
      // 10s between sets, 1s between rungs — distinct for every row.
      created_at: new Date(ORDER_EPOCH + (setIdx + 1) * 10_000 + q.rung * 1_000).toISOString(),
    }
  })
})

async function main() {
  console.log(`Sets: ${INTERVIEW_SETS.length}   Items: ${rows.length}`)
  for (const s of INTERVIEW_SETS) console.log(`  interview-${s.id.padEnd(16)} ${s.subject}`)

  const { count: legacyCount } = await db
    .from('study_item_bank')
    .select('id', { count: 'exact', head: true })
    .eq('family', 'toefl').eq('item_type', 'speaking_interview')
    .is('passage_group_id', null).eq('archived', false)
  console.log(`\nLegacy ungrouped interview items to archive: ${legacyCount ?? 0}`)

  if (!APPLY) {
    console.log('\nDry run. Re-run with --apply to write.')
    return
  }

  // The unique index on content_hash is PARTIAL (WHERE content_hash IS
  // NOT NULL), which PostgREST's ON CONFLICT cannot target — it reports
  // 42P10. So the dedupe is done explicitly here instead: read the hashes
  // that already exist and insert only what is missing. Same idempotence,
  // no dependence on upsert resolving the right index.
  const hashes = rows.map(r => r.content_hash)
  const { data: existing, error: exErr } = await db
    .from('study_item_bank').select('content_hash').in('content_hash', hashes)
  if (exErr) { console.error('existence check failed', exErr); process.exit(1) }
  const have = new Set((existing ?? []).map(r => r.content_hash))
  const fresh = rows.filter(r => !have.has(r.content_hash))
  console.log(`\nAlready present: ${have.size}   To insert: ${fresh.length}`)

  if (fresh.length > 0) {
    const { error: insErr } = await db.from('study_item_bank').insert(fresh)
    if (insErr) { console.error('insert failed', insErr); process.exit(1) }
  }

  // Refuse to archive until the replacements are actually present and
  // grouped. Without this guard a failed insert plus a successful archive
  // empties the task entirely.
  const { count: grouped } = await db
    .from('study_item_bank')
    .select('id', { count: 'exact', head: true })
    .eq('family', 'toefl').eq('item_type', 'speaking_interview')
    .not('passage_group_id', 'is', null).eq('archived', false)
  if ((grouped ?? 0) < rows.length) {
    console.error(`Refusing to archive: expected >= ${rows.length} grouped items, found ${grouped ?? 0}`)
    process.exit(1)
  }
  console.log(`Grouped interview items now in bank: ${grouped}`)

  const { error: arcErr } = await db
    .from('study_item_bank')
    .update({ archived: true })
    .eq('family', 'toefl').eq('item_type', 'speaking_interview')
    .is('passage_group_id', null).eq('archived', false)
  if (arcErr) { console.error('archive failed', arcErr); process.exit(1) }

  console.log('Done. Run scripts/verify-interview-sets.ts to confirm what a student would be served.')
}

main().catch(e => { console.error(e); process.exit(1) })
