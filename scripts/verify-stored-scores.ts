/**
 * Recompute every stored full-test score from its attempt rows with the
 * CURRENT grading code and list the sessions whose stored numbers differ.
 *
 * READ-ONLY. Nothing is written.
 *
 *   npx tsx scripts/verify-stored-scores.ts [days=30]
 *
 * What it compares, per completed full_test session in the window:
 *   - correct_count / total_count / score   against weightedScore() over
 *     the rows (lib/study/test-grading — the code submit runs)
 *   - for TOEFL Speaking/Writing, score     against scoreToeflSection()
 *     with the stored rubric bands (what persist-session-score writes and
 *     TestResultView shows), and whether any open response is SKIPPED
 *   - for SAT adaptive sessions, the 200-800 estimate is printed so the
 *     post-submit and /summary inputs can be eyeballed (both derive it
 *     from correct_count/total_count/module2_route).
 *
 * Denominators are printed first. Attempts are fetched per session so the
 * PostgREST 1000-row cap cannot silently truncate a session; a session
 * whose row count does not match what was loaded exits non-zero.
 */
import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '.env.local') })
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } })

const OPEN = new Set(['speaking_interview', 'writing_email', 'writing_discussion'])

async function main() {
  const days = Number(process.argv[2] ?? 30)
  if (!Number.isFinite(days) || days <= 0) { console.error('bad days'); process.exit(2) }
  const { weightedScore } = await import('../src/lib/study/test-grading')
  const { scoreToeflSection, detectToeflSection, WEIGHTS_FOR } = await import('../src/lib/study/toefl-section-score')
  const { decideRubricSessionScore } = await import('../src/lib/study/session-score-decision')
  const { scoreListenRepeat } = await import('../src/lib/study/listen-repeat-accuracy')
  const { estimateSectionScore } = await import('../src/lib/study/sat-adaptive')
  const { satSectionFromTopicSlug } = await import('../src/lib/study/test-result')

  const since = new Date(Date.now() - days * 86400_000).toISOString()
  const { data: sessions, error } = await db
    .from('study_sessions')
    .select('id, score, correct_count, total_count, module2_route, completed_at, topic:study_topics(slug)')
    .eq('mode', 'full_test').eq('status', 'completed')
    .gte('completed_at', since)
    .order('completed_at', { ascending: false })
    .limit(1000)
  if (error) { console.error(error.message); process.exit(2) }
  const rows = (sessions ?? []) as unknown as Array<{
    id: string; score: string | number | null; correct_count: number | null; total_count: number | null
    module2_route: string | null; completed_at: string; topic: { slug: string } | null
  }>
  console.log(`sessions in window (${days}d): ${rows.length}`)
  if (rows.length === 0) { console.error('no sessions read — refusing to report'); process.exit(1) }

  let checked = 0, noAttempts = 0
  const mismatches: string[] = []
  const notes: string[] = []
  for (const s of rows) {
    const slug = s.topic?.slug ?? ''
    const { data: atts, count } = await db
      .from('study_attempts')
      .select('question, student_answer, is_correct', { count: 'exact' })
      .eq('session_id', s.id)
      .order('position', { ascending: true, nullsFirst: false })
      .limit(1000)
    if (!atts || atts.length === 0) { noAttempts++; continue }
    if (count !== null && count !== atts.length) { console.error(`truncated ${s.id}: ${atts.length}/${count}`); process.exit(1) }
    checked++

    let wT = 0, wC = 0
    for (const a of atts) {
      const q = (a.question ?? {}) as Parameters<typeof weightedScore>[0]
      const w = weightedScore(q, (a.student_answer as string | null) ?? null)
      wT += w.total; wC += w.correct
    }
    const pct = wT > 0 ? Math.round((10000 * wC) / wT) / 100 : 0
    const stored = s.score === null ? null : Number(s.score)
    const tag = `${s.id.slice(0, 8)} ${slug.padEnd(22)} ${s.completed_at.slice(0, 10)}`

    if (s.correct_count !== wC || s.total_count !== wT) {
      mismatches.push(`${tag} counts stored ${s.correct_count}/${s.total_count} recomputed ${wC}/${wT}`)
    }

    const questions = atts.map(a => (a.question ?? {}) as Record<string, unknown>)
    const section = slug.startsWith('toefl-') ? detectToeflSection(questions.map(q => ({ type: String(q.type ?? '') }))) : null
    if (section) {
      const { data: subs } = await db
        .from('study_response_submissions')
        .select('prompt_text, study_response_grades ( overall_band )')
        .eq('session_id', s.id)
      const band = new Map<string, number>()
      for (const r of subs ?? []) {
        const g = Array.isArray(r.study_response_grades) ? r.study_response_grades[0] : r.study_response_grades
        if (g && g.overall_band != null) band.set(String(r.prompt_text), Number(g.overall_band))
      }
      const items = atts.map((a, i) => ({
        type: String(questions[i]!.type ?? ''),
        expectedText: (questions[i]!.correct_answer as string | null) ?? null,
        studentAnswer: (a.student_answer as string | null) ?? null,
        correct: !!a.is_correct,
        rubricBand: band.get(String(questions[i]!.prompt ?? '')) ?? null,
      }))
      const open = items.filter(it => OPEN.has(it.type))
      const skipped = open.filter(it => it.rubricBand === null && !(it.studentAnswer ?? '').trim()).length
      const pending = open.filter(it => it.rubricBand === null && (it.studentAnswer ?? '').trim()).length
      const ss = scoreToeflSection(items, WEIGHTS_FOR[section], scoreListenRepeat)
      const shown = Math.round(10000 * ss.proportion) / 100
      // What persist-session-score would store now (null = it refuses).
      const decision = decideRubricSessionScore(items, section, scoreListenRepeat)
      if (decision.score !== null && stored !== decision.score) {
        mismatches.push(`${tag} ${section}: stored ${stored} vs recompute ${decision.score} (open ${open.length}, skipped ${skipped})`)
      } else if (decision.score === null && stored !== null && stored !== shown) {
        mismatches.push(`${tag} ${section}: stored ${stored}, persist refuses (${decision.reason}), result screen shows ${shown} (open ${open.length}, skipped ${skipped}, pending ${pending})`)
      }
      if (skipped > 0) notes.push(`${tag} ${section}: ${skipped} of ${open.length} open responses SKIPPED - dropped from the points model, not scored 0`)
    } else if (stored !== pct) {
      mismatches.push(`${tag} score stored ${stored} recomputed ${pct}`)
    }

    if (slug.startsWith('sat-') && (s.module2_route === 'hard' || s.module2_route === 'easy') && s.total_count) {
      const est = estimateSectionScore(s.correct_count ?? 0, s.total_count, s.module2_route, satSectionFromTopicSlug(slug))
      notes.push(`${tag} SAT est ${est.score} (${s.correct_count}/${s.total_count}, ${s.module2_route})`)
    }
  }

  console.log(`checked ${checked} of ${rows.length} (no attempt rows: ${noAttempts})`)
  console.log(`\nMISMATCHES: ${mismatches.length}`)
  for (const m of mismatches) console.log('  ' + m)
  console.log(`\nNOTES: ${notes.length}`)
  for (const n of notes) console.log('  ' + n)
}

main().catch(e => { console.error(e); process.exit(1) })
