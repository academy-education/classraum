/**
 * Export LIVE (verified, unarchived) TOEFL reading items for a
 * passage-question MATCH audit.
 *
 * WHY
 * ---
 * Found 2026-07-28 while repairing single-question Daily Life sets: bank item
 * c073da09 asks "What should students do if they need library resources on
 * March 12th?" while its stored passage is a Campus Clean-Up notice. The item
 * is verified, unarchived and servable, and it has no derivable answer. Its
 * four siblings that DO match the passage are archived — so the group's only
 * live member is the broken one.
 *
 * That defect is invisible to every structural check we have: the item has 4
 * choices, a key that appears in them, a task tag and a group id. Only reading
 * the passage against the prompt catches it, so this export feeds a grader.
 *
 * Usage:
 *   npx tsx scripts/export-reading-for-audit.ts <out.json> [daily_life|academic_passage]
 */
import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
config({ path: resolve(process.cwd(), '.env.local') })

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

/** PostgREST caps a response at 1000 rows and reports no error when it
 *  truncates. An unpaginated select here would silently audit a subset and
 *  report the rest clean. */
async function selectAll(build: () => { range: (a: number, b: number) => Promise<{ data: unknown[] | null; error: { message: string } | null }> }) {
  const PAGE = 1000
  const rows: unknown[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build().range(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE) break
  }
  return rows as { id: string; item: Record<string, unknown> }[]
}

;(async () => {
  const out = process.argv[2]
  const task = process.argv[3] ?? 'daily_life'
  if (!out) { console.error('usage: <out.json> [task]'); process.exit(1) }

  const rows = await selectAll(() => db.from('study_item_bank')
    .select('id, item')
    .eq('family', 'toefl').eq('section', 'reading')
    .eq('verified', true).eq('archived', false) as never)

  const live = rows.filter(r => r.item?.readingTask === task)
  writeFileSync(out, JSON.stringify(live.map(r => ({
    id: r.id,
    groupId: r.item.passageGroupId,
    passage: r.item.passage,
    prompt: r.item.prompt,
    key: r.item.correct_answer,
  })), null, 1))
  console.log(`${live.length} live ${task} items (of ${rows.length} live reading) -> ${out}`)
})()
