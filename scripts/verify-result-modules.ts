/**
 * Run the result screen's NEW arithmetic over every real completed full
 * test and print what each session would render.
 *
 * The unit tests use fixtures shaped from these sessions; this is the
 * check that the same code survives the actual rows — including the
 * legacy ones with no `position`, the partial-credit Complete-the-Words
 * sessions whose rows cannot reproduce the recorded score, and the one
 * session whose module-1 routing grade disagrees with its final grade.
 *
 * It also RE-CHECKS the reconciliations independently of the library, so
 * a bug that made both the library and its tests agree on a wrong number
 * still shows up here as a printed contradiction.
 *
 *   npx tsx scripts/verify-result-modules.ts
 */
import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '.env.local') })
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } })

async function main() {
  const {
    buildResultModel, familyFromTopicSlug, tallyRows, moduleSplit, passageSetBreakdown,
  } = await import('../src/lib/study/test-result')

  const { data: sessions } = await db
    .from('study_sessions')
    .select('id, correct_count, total_count, score, module1_correct, module1_total, module2_route, topic:study_topics(slug)')
    .eq('mode', 'full_test')
    .not('correct_count', 'is', null)
    .order('created_at', { ascending: false })
    .limit(200)

  let shownModules = 0, shownSets = 0, contradictions = 0
  for (const s of (sessions ?? []) as unknown as {
    id: string; correct_count: number; total_count: number; score: number | null
    module1_correct: number | null; module1_total: number | null; module2_route: string | null
    topic: { slug: string } | null
  }[]) {
    const { data: atts } = await db
      .from('study_attempts')
      .select('is_correct, position, question, student_answer')
      .eq('session_id', s.id)
      .order('position', { ascending: true, nullsFirst: false })
      .order('id', { ascending: true })
    if (!atts || atts.length === 0) continue

    const model = buildResultModel({
      family: familyFromTopicSlug(s.topic?.slug),
      correctCount: s.correct_count,
      totalScored: s.total_count,
      scorePercent: Math.round(s.score ?? 0),
      cards: (atts as unknown as { is_correct: boolean | null; position: number | null; question: never; student_answer: string }[]).map(a => ({
        question: a.question ?? { prompt: '', type: 'multiple_choice' },
        studentAnswer: a.student_answer ?? null,
        correct: a.is_correct === true,
        ungraded: a.is_correct === null,
        position: a.position,
      })),
    })
    const tally = tallyRows(model.rows)
    const ms = moduleSplit({
      rows: model.rows,
      breakIdx: s.module2_route !== null ? s.module1_total : null,
      totalScored: model.totalScored,
      correctCount: model.correctCount,
      module1CorrectCards: s.module1_correct,
    })
    const sets = passageSetBreakdown(model.rows)

    const line = [
      s.id.slice(0, 8), (s.topic?.slug ?? '-').padEnd(20),
      `cards=${String(model.rows.length).padStart(2)}`,
      `delivered=${String(model.deliveredTotal).padStart(2)}`,
      `scored=${String(model.totalScored).padStart(2)}`,
      `hero=${s.correct_count}/${s.total_count}`,
      `tally(counted/pilot/rubric)=${tally.counted}/${tally.pilot}/${tally.rubric}`,
    ]
    // The accounting card's claim, re-derived here rather than trusted.
    if (tally.counted + tally.pilot + tally.rubric !== model.deliveredTotal) {
      line.push('!! TALLY DOES NOT PARTITION DELIVERED'); contradictions++
    }
    if (tally.counted !== model.totalScored) {
      line.push('!! counted != score denominator'); contradictions++
    }
    if (ms) {
      shownModules++
      line.push(`M1=${ms.module1.correct}/${ms.module1.total} M2=${ms.module2.correct}/${ms.module2.total}`)
      if (ms.module1.total + ms.module2.total !== s.total_count
          || ms.module1.correct + ms.module2.correct !== s.correct_count) {
        line.push('!! MODULES DO NOT SUM TO THE HEADLINE'); contradictions++
      }
    } else if (s.module2_route) {
      line.push('modules: refused')
    }
    if (sets) {
      shownSets++
      line.push(`sets=${sets.sets.map(x => `P${x.ordinal}:${x.correct}/${x.total}`).join(',')}`)
      line.push(`(${sets.sets.length}/${sets.setsInTest} sets, ${sets.coveredScored}/${sets.totalScored} scored q)`)
      if (sets.coveredScored > sets.totalScored) { line.push('!! COVERAGE > TOTAL'); contradictions++ }
      if (sets.totalScored !== tally.counted) { line.push('!! set denominator != counted'); contradictions++ }
    }
    console.log(line.join(' '))
  }
  console.log(`\nmodule card rendered on ${shownModules} sessions, passage-set card on ${shownSets}`)
  console.log(contradictions === 0 ? 'no contradictions' : `${contradictions} CONTRADICTIONS`)
}

void main()
