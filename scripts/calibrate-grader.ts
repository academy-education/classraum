/**
 * Grade ETS's own published sample responses and compare to the scores
 * ETS gave them.
 *
 * Usage:
 *   npx tsx scripts/calibrate-grader.ts
 *
 * Every other check on this pipeline so far has measured it against
 * itself: unit tests assert the rules we chose, and re-grading real
 * student answers only tells us what the grader thinks, never whether it
 * is right. This is the only check with an external answer key.
 *
 * It grades through `openAiStages()` — the exact callbacks
 * gradeAndPersistResponse uses — so a drift between production and this
 * harness is impossible. It never writes to the database.
 *
 * Costs a few gpt-4o / gpt-4o-mini calls per sample. Exit 1 if any
 * sample is off by more than one band, which is the threshold at which
 * the grader is telling a student something materially untrue.
 */

import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

if (!process.env.OPENAI_API_KEY) {
  console.error('Missing OPENAI_API_KEY in .env.local')
  process.exit(2)
}

/** One band of disagreement is normal between trained human raters.
 *  Two is the grader and ETS describing different responses. */
const TOLERANCE = 1

async function main() {
  const { runStagedGrade } = await import('../src/lib/study/gradePipeline')
  const { openAiStages } = await import('../src/lib/study/gradeResponse')
  const { ETS_SCORED_SAMPLES } = await import('../src/lib/study/__fixtures__/ets-scored-samples')

  const stages = openAiStages()
  const rows: Array<{ id: string; official: number; ours: number; delta: number }> = []

  for (const s of ETS_SCORED_SAMPLES) {
    const wordCount = s.responseText.trim().split(/\s+/).filter(Boolean).length
    const staged = await runStagedGrade({
      family: 'toefl',
      skill: 'writing',
      taskType: s.task,
      promptText: s.promptText,
      responseText: s.responseText,
      durationSeconds: null,
      wordCount,
      language: 'en',
      speechSignals: null,
    }, stages)

    const ours = staged.grade.overallBand
    const delta = ours - s.officialScore
    rows.push({ id: s.id, official: s.officialScore, ours, delta })

    const flag = Math.abs(delta) > TOLERANCE ? 'FAIL' : Math.abs(delta) === 0 ? 'exact' : 'within 1'
    console.log(`\n── ${s.id}  [${flag}]`)
    console.log(`   ETS said     ${s.officialScore}`)
    console.log(`   we said      ${ours}${delta === 0 ? '' : delta > 0 ? `  (+${delta}, lenient)` : `  (${delta}, harsh)`}`)
    console.log(`   relevance    ${staged.relevance?.level ?? '(no ladder)'}  → ceiling ${staged.relevanceCeiling ?? '—'}`)
    console.log(`   language     ${staged.languageScore ?? '—'}${staged.ceilingApplied ? '  (ceiling applied)' : ''}`)
    if (staged.zeroReasons.length) console.log(`   ZERO GATE    ${staged.zeroReasons.join(', ')}`)
    for (const c of staged.grade.criteria) console.log(`   · ${c.key}: ${c.score}`)
    console.log(`   ETS rationale: ${s.officialRationale}`)
    console.log(`   our summary:   ${(staged.grade.summary ?? '').slice(0, 160)}`)
  }

  console.log('\n════ summary ════')
  for (const r of rows) {
    console.log(`  ${r.id.padEnd(20)} ETS ${r.official}   ours ${r.ours}   delta ${r.delta > 0 ? '+' : ''}${r.delta}`)
  }
  const mean = rows.reduce((a, r) => a + r.delta, 0) / (rows.length || 1)
  // A consistent sign across samples is more informative than the size:
  // it says the grader is biased, not noisy.
  console.log(`  mean delta ${mean > 0 ? '+' : ''}${mean.toFixed(2)}` +
    (rows.every(r => r.delta < 0) ? '  — harsh on every sample'
     : rows.every(r => r.delta > 0) ? '  — lenient on every sample'
     : ''))
  console.log('\n  NOTE: 2 samples, both strong responses. This can catch gross')
  console.log('  miscalibration. It cannot establish an agreement rate, and it')
  console.log('  says nothing about the bottom of the scale.')

  const bad = rows.filter(r => Math.abs(r.delta) > TOLERANCE)
  console.log(bad.length === 0 ? '\nPASS' : `\nFAIL — ${bad.length} sample(s) off by more than ${TOLERANCE} band`)
  process.exit(bad.length === 0 ? 0 : 1)
}

main().catch(e => { console.error(e); process.exit(1) })
