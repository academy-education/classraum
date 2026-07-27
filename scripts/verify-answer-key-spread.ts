/**
 * READ-ONLY: fail if any cohort's answer keys cluster on one position.
 *
 * Nothing downstream reorders a banked item's choices — shuffleChoices() in
 * src/lib/test-verify.ts runs ONLY in the AI generation route, so
 * assembleFromBank / assembleToeflFromBank / drawBankPractice all serve
 * choices in stored order. A hand-authored cohort that puts the key first
 * every time is therefore answerable by position alone.
 *
 * This is not hypothetical: cohort cr-v1 shipped at 73% key-at-A on
 * 2026-07-28 and was caught by a blind grader remarking on it, not by any
 * check. The bank helpers now shuffle at insert; this is the backstop that
 * makes a regression loud.
 *
 * Usage: npx tsx scripts/verify-answer-key-spread.ts
 * Exit 1 if any cohort with >=20 four-choice items exceeds 45% on one slot
 * (uniform is 25%; 45% allows real sampling noise at n=20 without hiding a
 * systematic skew).
 */
import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
config({ path: resolve(process.cwd(), '.env.local') })

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
// 12, not 20. A 14-item cohort inserted on 2026-07-28 landed at 50% on one
// slot and PASSED, because the sample-size gate excused it — the check
// reported OK on a cohort a student could exploit. A small cohort is not a
// safe cohort; it is a cohort where one bad draw is a larger share of what
// gets served. Below 12 the binomial noise genuinely swamps the signal, so
// that is where the gate belongs.
const MIN_N = 12
const MAX_SHARE = 0.45

;(async () => {
  const rows: Array<{ cohort: string | null; item: unknown }> = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('study_item_bank')
      .select('cohort, item').eq('verified', true).eq('archived', false)
      .eq('item_type', 'multiple_choice').range(from, from + 999)
    if (error) throw new Error(error.message)
    rows.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }

  // Per-GROUP key structure, not just per-cohort distribution.
  //
  // A blind grader caught what the cohort histogram cannot see: the
  // talk-c1 batch was authored with each 4-question set holding a COMPLETE
  // permutation of A/B/C/D — one of each, every set. Overall that reads as
  // a perfect 8/8/8/8 spread, which looks ideal. It is not: inside a set,
  // three confident answers force the fourth by elimination.
  //
  // Any regularity a test-taker can exploit counts, and "uniform overall"
  // is not the same as "unpredictable locally".
  const byGroup = new Map<string, string[]>()

  const byCohort = new Map<string, number[]>()
  for (const r of rows) {
    const it = r.item as Record<string, unknown> | null
    const choices = it?.choices as string[] | undefined
    const key = it?.correct_answer as string | undefined
    if (!Array.isArray(choices) || choices.length !== 4 || !key) continue
    const pos = choices.indexOf(key)
    if (pos < 0) continue
    const c = r.cohort ?? '(none)'
    const arr = byCohort.get(c) ?? [0, 0, 0, 0]
    arr[pos]!++
    byCohort.set(c, arr)
    const g = (r.item as Record<string, unknown>)?.passageGroupId
    if (typeof g === 'string' && g) {
      byGroup.set(g, [...(byGroup.get(g) ?? []), 'ABCD'[pos]!])
    }
  }

  let bad = 0
  for (const [cohort, counts] of [...byCohort].sort()) {
    const n = counts.reduce((a, b) => a + b, 0)
    const worst = Math.max(...counts)
    const share = worst / n
    const flag = n >= MIN_N && share > MAX_SHARE
    console.log(
      `${flag ? 'FAIL' : ' ok '} ${cohort.padEnd(14)} n=${String(n).padStart(5)}  ` +
      `A/B/C/D ${counts.join('/')}  worst ${(share * 100).toFixed(1)}%`,
    )
    if (flag) bad++
  }
  // A 4-item set whose keys are a complete ABCD permutation is
  // elimination-solvable; so is one where all four share a slot.
  const quads = [...byGroup.entries()].filter(([, v]) => v.length === 4)
  const perms = quads.filter(([, v]) => [...v].sort().join('') === 'ABCD')
  const uniform = quads.filter(([, v]) => new Set(v).size === 1)
  console.log(`\n4-question sets: ${quads.length}  ` +
    `complete-ABCD permutations: ${perms.length}  all-same-slot: ${uniform.length}`)
  // Chance alone puts ~9.4% of random 4-key sets at a full permutation
  // (4!/4^4). Flag only a rate far above that.
  const rate = quads.length ? perms.length / quads.length : 0
  if (quads.length >= 8 && rate > 0.35) {
    console.error(`FAIL ${(rate * 100).toFixed(0)}% of 4-question sets are a complete ABCD permutation ` +
      `(chance is 9.4%) — the fourth answer is forced by elimination`)
    bad++
  }

  console.log(bad === 0 ? '\nOK — no cohort is answerable by position.' : `\n${bad} problem(s).`)
  process.exit(bad === 0 ? 0 : 1)
})()
