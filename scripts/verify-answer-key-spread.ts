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
import {
  analyseSetTell, setTellFails, lengthMark, binomUpperTail,
  MIN_SET_SIZE, SET_TELL_ALPHA, PER_COHORT_MIN_EXPECTED, type KeySet,
} from '../src/lib/study/key-tells'
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

  // Per-cohort key LENGTH, which position cannot see.
  //
  // The TOEFL Choose-a-Response bank passed every check above — keys at
  // 26/16/25/33 across A/B/C/D, no permutation clustering — while the key
  // was the LONGEST of the four options in 70% of items (chance is 25%)
  // and the shortest in 5%. A candidate who never played the audio and
  // always picked the longest option scored ~70% on the task type.
  //
  // The cause is how a correct answer gets written: the key has to be
  // fully natural and complete, distractors get clipped once they are
  // wrong enough. That instinct is invisible to a position histogram and
  // survives any amount of shuffling, because it travels WITH the text.
  //
  // Fourth distinct tell to reach this bank, each one invisible to the
  // check watching for the last. Length is the cheapest to measure, so
  // it belongs here rather than in a grader's remark.
  const LEN_MIN_N = 12
  // GATE ON THE BINOMIAL TAIL, NOT A FLAT SHARE.
  //
  // This was `share > 0.40` for every cohort regardless of size, and a flat
  // share is the wrong instrument: at n=634 it is 8.7 sigma (so a real
  // defect can sit under it), and at n=18 it is 1.4 sigma (so chance alone
  // trips it). On 2026-07-30 it reported the same verdict for talk-c1
  // (15/24 longest, p=1e-4) and talk-c2 (8/18 shortest, p=0.06) — four
  // orders of magnitude apart in evidence, one a real exploit and one
  // noise. talk-c1 was repaired; talk-c2 would have sat FAIL forever, and
  // a permanent failure nobody can act on is how a guard gets ignored.
  //
  // ALPHA is Bonferroni-corrected across cohorts x 2 directions, because
  // testing 7 cohorts both ways at 0.05 expects 0.7 false alarms per run.
  // Note this makes the gate STRICTER on large cohorts than 40% ever was,
  // which is the direction that matters — the big cohorts are what get
  // served.
  const LEN_ALPHA = 0.01
  const byCohortLen = new Map<string, { longest: number; shortest: number; n: number }>()
  // Length marks bucketed by passage SET, for the per-set check below.
  const setMarks = new Map<string, KeySet>()
  for (const r of rows) {
    const it = r.item as Record<string, unknown> | null
    const choices = it?.choices as string[] | undefined
    const key = it?.correct_answer as string | undefined
    if (!Array.isArray(choices) || choices.length !== 4 || !key) continue
    if (!choices.includes(key)) continue
    const c = r.cohort ?? '(none)'
    const mark = lengthMark(key, choices)
    const acc = byCohortLen.get(c) ?? { longest: 0, shortest: 0, n: 0 }
    acc.n++
    // Ties count as NOT a tell: if two options share the max length the
    // longest-option heuristic does not single out the key.
    if (mark === 'longest') acc.longest++
    if (mark === 'shortest') acc.shortest++
    byCohortLen.set(c, acc)

    const g = it?.passageGroupId
    if (typeof g === 'string' && g) {
      const s = setMarks.get(g) ?? { key: g, cohort: c, marks: [] }
      s.marks.push(mark)
      setMarks.set(g, s)
    }
  }

  let bad = 0
  // `p` is the one-sided binomial tail P(X >= observed | n, 0.25) — how
  // often chance alone produces this much skew in a cohort THIS SIZE. It
  // does not gate anything; it is printed because the flat 40% share
  // cannot distinguish a real defect from a small sample. On 2026-07-30
  // talk-c1 (15/24 longest, p=1e-4) and talk-c2 (8/18 shortest, p=0.06)
  // both read as "FAIL over 40%" while being four orders of magnitude
  // apart in evidence. Read the share to size the exploit, read p to
  // decide whether there is one.
  console.log('key-LENGTH tell (uniquely longest / uniquely shortest; 25% each is chance):')
  for (const [cohort, a] of [...byCohortLen].sort()) {
    const longShare = a.longest / a.n
    const shortShare = a.shortest / a.n
    const p = Math.min(
      binomUpperTail(a.n, a.longest, 0.25),
      binomUpperTail(a.n, a.shortest, 0.25),
    )
    const alpha = LEN_ALPHA / Math.max(1, byCohortLen.size * 2)
    const flag = a.n >= LEN_MIN_N && p < alpha
    console.log(
      `${flag ? 'FAIL' : ' ok '} ${cohort.padEnd(14)} n=${String(a.n).padStart(5)}  ` +
      `longest ${(longShare * 100).toFixed(1)}%  shortest ${(shortShare * 100).toFixed(1)}%` +
      `   p=${p < 1e-4 ? p.toExponential(1) : p.toFixed(4)}`,
    )
    if (flag) bad++
  }
  console.log()

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

  // ── Per-SET key LENGTH ───────────────────────────────────────────────
  //
  // The gap this closes: the block above checks a 4-question set for
  // POSITION and the block further up checks a COHORT for length, and
  // nothing checked a set for length. assembleFromBank serves passage sets
  // whole (takeGroups in src/lib/study/assemble.ts operates on groups, not
  // items), so a student can meet four consecutive questions from one talk.
  // A set where "pick the longest option" answers all four is four free
  // marks even when the cohort histogram — and the section histogram — read
  // a flawless 25%.
  //
  // The threshold arithmetic lives in src/lib/study/key-tells.ts next to
  // its mutation tests; the short version is that a 4-item set is
  // exploitable 10.2% of the time BY CHANCE, so individual sets cannot be
  // condemned and the gate is a Poisson tail on how many there are.
  const sets = [...setMarks.values()]
  const tell = analyseSetTell(sets)
  console.log(`\nper-SET key length (sets of >=${MIN_SET_SIZE}; "pick longest"/"pick shortest" answering >=75%):`)
  console.log(`  ${tell.observed} of ${tell.eligible} eligible sets exploitable; ` +
    `chance predicts ${tell.expected.toFixed(1)}  (p=${tell.pValue.toFixed(3)})`)
  if (tell.swept.length) {
    console.log(`  ${tell.swept.length} set(s) where the heuristic answers EVERY item:`)
    for (const s of tell.swept.slice(0, 10)) {
      const e = tell.exploitable.find(x => x.key === s)!
      console.log(`     ${s}  (${e.cohort}, ${e.size} items, all ${e.mark})`)
    }
  }
  if (setTellFails(tell)) {
    console.error(`FAIL per-set length: ${tell.observed} exploitable sets against ${tell.expected.toFixed(1)} ` +
      `expected (p=${tell.pValue.toExponential(1)} < ${SET_TELL_ALPHA}) — talks are being authored ` +
      `with a per-set length habit, not just a per-cohort one`)
    bad++
  }
  // Per cohort as well as in aggregate, so a single badly-authored batch
  // cannot dilute itself in the other 200 sets. Only cohorts with enough
  // sets for the tail to mean anything: below E=5 even a 100%-exploitable
  // cohort cannot reach p<0.01, so gating there would be decoration.
  const byCohortSets = new Map<string, KeySet[]>()
  for (const s of sets) byCohortSets.set(s.cohort, [...(byCohortSets.get(s.cohort) ?? []), s])
  for (const [cohort, cs] of [...byCohortSets].sort()) {
    const t = analyseSetTell(cs)
    if (!t.eligible) continue
    const testable = t.expected >= PER_COHORT_MIN_EXPECTED
    console.log(`   ${cohort.padEnd(14)} ${t.observed}/${t.eligible} sets  ` +
      `expected ${t.expected.toFixed(1)}${testable ? `  p=${t.pValue.toFixed(3)}` : '  (too few sets to test)'}`)
    if (testable && setTellFails(t)) {
      console.error(`FAIL cohort ${cohort}: ${t.observed} exploitable sets vs ${t.expected.toFixed(1)} expected`)
      bad++
    }
  }


  // ── Option-shape tell ────────────────────────────────────────────────
  //
  // The third failure mode of this kind, after key-in-slot-A and
  // complete-ABCD-per-set. A grader on the C2 pilot: "the key is the ONLY
  // option carrying a qualifying/conceding second clause while all three
  // distractors are flat maximal statements. Over 30 items a solver learns
  // 'pick the option that concedes' and never listens."
  //
  // It is a property of a BRIEF that asks for narrowed/qualified answers:
  // the key inherits the hedging and the distractors do not. Measured on
  // 2026-07-28 the C2 cohort sat at 28.6% while every older cohort was
  // under 8% — i.e. roughly the base rate, since careful writing does hedge
  // true statements more often.
  //
  // Flagged, not failed, below a high threshold: some correlation here is
  // natural and unavoidable. It becomes a tell when it is the RULE.
  const HEDGE = /\b(unless|except|provided|only if|so long as|insofar|although|though|while|but not|rather than|holding|assuming)\b/i
  const byCohortHedge = new Map<string, { n: number; tell: number }>()
  for (const r of rows) {
    const it = r.item as Record<string, unknown> | null
    const choices = it?.choices as string[] | undefined
    const key = it?.correct_answer as string | undefined
    if (!Array.isArray(choices) || choices.length !== 4 || !key) continue
    const c = r.cohort ?? '(none)'
    const acc = byCohortHedge.get(c) ?? { n: 0, tell: 0 }
    acc.n++
    if (HEDGE.test(key) && !choices.some(ch => ch !== key && HEDGE.test(ch))) acc.tell++
    byCohortHedge.set(c, acc)
  }
  console.log('\noption-shape (key is the only hedged choice):')
  for (const [cohort, a] of [...byCohortHedge].sort()) {
    const pct = (100 * a.tell) / a.n
    const flag = a.n >= 12 && pct > 25
    console.log(`  ${flag ? 'WARN' : ' ok '} ${cohort.padEnd(14)} ${a.tell}/${a.n}  ${pct.toFixed(1)}%`)
    if (flag) {
      console.error(`       ^ a solver can learn "pick the option that concedes"`)
      bad++
    }
  }

  console.log(bad === 0 ? '\nOK — no cohort is answerable by position or option shape.' : `\n${bad} problem(s).`)
  process.exit(bad === 0 ? 0 : 1)
})()
