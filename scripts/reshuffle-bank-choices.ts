/**
 * One-off repair: re-shuffle stored choices for a skewed cohort.
 *
 * Nothing downstream reorders a banked item's choices — shuffleChoices() in
 * test-verify.ts runs only in the AI generation route — so a hand-authored
 * cohort that put the key first every time is guessable by position. The
 * TOEFL cr-v1 batch landed at 73% key-at-A.
 *
 * Deterministic (seeded by row id) so a re-run is a no-op in spirit and the
 * same row never shuffles two ways. correct_answer is matched by VALUE so it
 * needs no remapping; distractor_rationales are keyed by choice TEXT and are
 * carried through untouched.
 *
 * Usage: npx tsx scripts/reshuffle-bank-choices.ts <cohort> [--apply]
 */
import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import type { Database, Json } from '../src/lib/database.types'
config({ path: resolve(process.cwd(), '.env.local') })

const COHORT = process.argv[2]
const APPLY = process.argv.includes('--apply')
if (!COHORT) { console.error('usage: reshuffle-bank-choices.ts <cohort> [--apply]'); process.exit(2) }

const db = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

function shuffled(choices: string[], seed: string): string[] {
  let s = 0
  for (const ch of seed) s = (s * 31 + ch.charCodeAt(0)) >>> 0
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
  const out = choices.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

;(async () => {
  const { data, error } = await db.from('study_item_bank')
    .select('id, item').eq('cohort', COHORT).eq('item_type', 'multiple_choice')
  if (error) throw new Error(error.message)

  const before = [0, 0, 0, 0], after = [0, 0, 0, 0]
  const updates: Array<{ id: string; item: Json }> = []
  for (const r of data ?? []) {
    const it = r.item as Record<string, unknown>
    const choices = it.choices as string[] | undefined
    const key = it.correct_answer as string | undefined
    if (!Array.isArray(choices) || !key || !choices.includes(key)) continue
    before[choices.indexOf(key)]!++
    const next = shuffled(choices, r.id)
    after[next.indexOf(key)]!++
    updates.push({ id: r.id, item: { ...it, choices: next } as unknown as Json })
  }
  const pct = (a: number[]) => a.map(n => `${Math.round((100 * n) / updates.length)}%`).join('/')
  console.log(`${updates.length} items in cohort '${COHORT}'`)
  console.log(`  key position before  A/B/C/D = ${before.join('/')}  (${pct(before)})`)
  console.log(`  key position after   A/B/C/D = ${after.join('/')}  (${pct(after)})`)

  if (!APPLY) { console.log('\nDRY RUN — nothing written.'); return }
  let n = 0
  for (const u of updates) {
    const { error: e } = await db.from('study_item_bank').update({ item: u.item }).eq('id', u.id)
    if (e) console.error(`  ${u.id}: ${e.message}`); else n++
  }
  console.log(`re-shuffled ${n} rows`)
})()
