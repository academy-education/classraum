#!/usr/bin/env node
/** Ledger entries for the two v17 kept files, bound to their exact bytes.
 *  A heredoc script file, never an inline `node -e` — a ledger write died on a
 *  quotation mark on 2026-09-21 after that rule had already been written down. */
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const D = 'scripts/study-bank'
const ledger = JSON.parse(readFileSync(`${D}/ledger.json`, 'utf8'))

const COMMON_NOSOURCE = 'Options-only attack, three solvers, candidates interleaved with a shape-matched live control drawn from the same domain with this session own four cohorts excluded (38 and 36 items) so the control is not self-referential. Key slots dealt flat by construction. THE FIRST MATHS BATCH IN FIVE ATTEMPTS TO CLEAR THE BAR, against v16 +16.7 and +25.0. Both arms ran hotter than the previous week (controls 42.9% and 40.0% against 35.7% and 16.7% on the same instrument), so the margin is the comparable quantity and the absolute rate is not. Solver independence measured and printed: pairwise agreement 71.4% and 76.7% against 27.6% and 29.5% under independence, so unanimity is reported as a batch rate against the control rate and carries no per-item drop.'

const entries = [
  {
    id: 'sat-math-v17-alg-kept-2026-09-26', cohort: 'sat-math-v17-alg', domain: 'Algebra',
    file: `${D}/sat-math-v17-alg.kept.batch.json`, authored: 14,
    nosource: `CANDIDATE 40.5% against its own 28.6% derived line; LIVE CONTROL 42.9%. Margin -2.4, inside the pre-registered +10 bar. ${COMMON_NOSOURCE}`,
    withsource: 'Three independent graders, each solving from the stem before reading any explanation. ALL THREE MATCHED THE KEY ON ALL 14 ITEMS and found no second defensible option anywhere; every distractor explanation describes the path that produces its printed value. Two items dropped on the pre-registered rule at a median 2 of 3 distractors free-strikable: B3 (90 and 100 lie outside a feasible range the stem gives away) and B7 (1800 and 2700 outside range, and the key is the only odd and only non-round value, an odd-one-out heuristic pointing straight at it). n_struck is the MEDIAN of three, not the max: the graders disagree about exactly this, one calling B5 overshoot argument free and another showing it needs the closing rate, which is the solve.',
    tells: 'Two conservative drops beyond the rule, both stated. A6 on grader F explicit recommendation, because the key is recoverable by echoing the printed -6 rather than by solving. A7 on evidence the rule has no field for: two blind solvers named the harmonic-mean relation unprompted, one calling it the strongest tell in the file, 2 of 3 solved it, and it had been rebuilt twice with each rebuild introducing a different relation (first a derivational hub, then this). A7 was also the only item all three graders called hard, so this drop costs the batch its entire hard contribution and is taken anyway.',
  },
  {
    id: 'sat-math-v17-adv-kept-2026-09-26', cohort: 'sat-math-v17-adv', domain: 'Advanced Math',
    file: `${D}/sat-math-v17-adv.kept.batch.json`, authored: 16,
    nosource: `CANDIDATE 42.2% against its own 26.7% derived line; LIVE CONTROL 40.0%. Margin +2.2, inside the pre-registered +10 bar. ${COMMON_NOSOURCE}`,
    withsource: 'Three independent graders, each solving from the stem before reading any explanation. ALL THREE MATCHED THE KEY ON ALL 15 ITEMS, all exclusive, all paths coherent, and correct_answer and solve agree in form throughout. Five dropped on the pre-registered rule: B3 at a unanimous 3 of 3 (subtracting the printed 7 from each option leaves exactly one perfect square, which the 3/2 exponent demands, and the item own note audits two dead channels while missing the live one), B1 and B4 and B6 and A7 at a median 2.',
    tells: 'A1 was dropped before the gate for duplicating B8 and carrying a degenerate parameter branch whose key survived by luck. A4 dropped beyond the rule on grader F explicit recommendation: the key is the product of the two leftover printed constants, immune to swapping a and b, and not repairable by changing distractors. FOUR EXPLANATIONS CARRIED REVIEWER-FACING TEXT INTO THE STUDENT-FACING FIELD, including one stating the gate verdict inside the artifact three graders were asked to judge cold; stripped after grading finished rather than mid-grade, and check-explanation-hygiene.mjs now fails a batch carrying it. Two shared key values remain among the kept items (18 and 41); two reviewers independently judged that unexploitable on letter-answer MCQs and it is recorded rather than fixed.',
  },
]

for (const e of entries) {
  const sha = createHash('sha256').update(readFileSync(e.file)).digest('hex')
  const kept = JSON.parse(readFileSync(e.file, 'utf8')).length
  ledger.batches.push({
    id: e.id, createdAt: '2026-09-26', targetTest: 'sat', section: 'math',
    task: 'math_mc', family: 'mc_stem_source', cohort: e.cohort, contentSha: sha, status: 'inserted',
    note: `${e.authored} authored, ${kept} kept for ${e.domain}. Authored in halves by two agents with disjoint assigned skills after single-author runs of this size were repeatedly killed by a no-progress watchdog; audited by an independent auditor BEFORE the gate, repaired once against that audit, then gated by three fresh blind solvers and three fresh with-source graders that had never seen the file.`,
    stages: {
      shape: { passed: true, contentSha: sha, verdict: `${kept} items, all 4-choice with the key present, every solve exact, zero key-is-unique-composite, magnitude within z=1.1 of live on all three columns, no option value shared across kept items more than twice, no reviewer-facing text in any explanation.` },
      withsource: { passed: true, contentSha: sha, verdict: e.withsource },
      nosource: { passed: true, contentSha: sha, verdict: e.nosource },
      tells: { passed: true, contentSha: sha, verdict: e.tells },
    },
  })
  console.log(`${e.id}  sha ${sha.slice(0, 16)}  ${kept} items`)
}
ledger.generatedAt = new Date().toISOString()
writeFileSync(`${D}/ledger.json`, JSON.stringify(ledger, null, 2))
console.log('ledger written')
