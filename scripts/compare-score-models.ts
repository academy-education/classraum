/**
 * Old score model vs new, on every real completed Speaking/Writing test.
 *
 * Usage:
 *   npx tsx scripts/compare-score-models.ts
 *
 * Read-only. The new model pulls the rubric bands already stored in
 * study_response_grades — it does not call the grader, so this costs
 * nothing and reflects exactly what a student would see today.
 *
 * The two models move a section score in opposite directions and the net
 * is not predictable from either one alone:
 *   - repeats gain, because near-misses now earn partial credit instead
 *     of failing an exact match;
 *   - interviews and essays drag, because they now count at all, and the
 *     grader that produces them runs 1-2 bands harsh.
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(2)
}
const db = createClient(url, key, { auth: { persistSession: false } })

async function main() {
  const { scoreToeflSection, bandFromProportion, SPEAKING_WEIGHTS, WRITING_WEIGHTS } =
    await import('../src/lib/study/toefl-section-score')
  const { scoreListenRepeat } = await import('../src/lib/study/listen-repeat-accuracy')
  const { toeflScaledScore, toeflBandFromScaled } = await import('../src/lib/study/test-result')

  const { data: sessions } = await db
    .from('study_sessions')
    .select('id, correct_count, total_count, score, created_at, topic:study_topics(slug)')
    .eq('mode', 'full_test').eq('status', 'completed')
    .order('created_at', { ascending: false })

  const rows = (sessions ?? []).filter(s => {
    const t = s.topic as { slug: string } | { slug: string }[] | null
    const slug = (Array.isArray(t) ? t[0]?.slug : t?.slug) ?? ''
    return slug === 'toefl-speaking' || slug === 'toefl-writing'
  })

  if (rows.length === 0) { console.log('No completed TOEFL Speaking or Writing tests.'); return }

  console.log('section    date        OLD              NEW              change')
  console.log('─'.repeat(72))

  for (const s of rows) {
    const t = s.topic as { slug: string } | { slug: string }[] | null
    const slug = (Array.isArray(t) ? t[0]?.slug : t?.slug) ?? ''
    const speaking = slug === 'toefl-speaking'

    const { data: attempts } = await db
      .from('study_attempts')
      .select('question, student_answer, is_correct')
      .eq('session_id', s.id).order('position', { ascending: true })

    const { data: grades } = await db
      .from('study_response_submissions')
      .select('prompt_text, study_response_grades(overall_band)')
      .eq('session_id', s.id)

    const bandByPrompt = new Map<string, number>()
    for (const g of grades ?? []) {
      const gr = Array.isArray(g.study_response_grades) ? g.study_response_grades[0] : g.study_response_grades
      if (gr) bandByPrompt.set(g.prompt_text, Number(gr.overall_band))
    }

    const items = (attempts ?? []).map(a => {
      const q = a.question as Record<string, unknown> | null
      const type = String(q?.type ?? '')
      return {
        type,
        expectedText: typeof q?.correct_answer === 'string' ? q.correct_answer : null,
        studentAnswer: a.student_answer,
        correct: !!a.is_correct,
        rubricBand: bandByPrompt.get(String(q?.prompt ?? '')) ?? null,
      }
    })

    const next = scoreToeflSection(
      items, speaking ? SPEAKING_WEIGHTS : WRITING_WEIGHTS, scoreListenRepeat)

    const oldPct = Number(s.score ?? 0)
    const oldBand = toeflBandFromScaled(toeflScaledScore(oldPct))
    const newBand = bandFromProportion(next.proportion)
    const delta = newBand - oldBand

    const date = String(s.created_at).slice(0, 10)
    const oldCol = `${oldPct.toFixed(0).padStart(3)}%  band ${oldBand.toFixed(1)}`
    const newCol = `${(next.proportion * 100).toFixed(0).padStart(3)}%  band ${newBand.toFixed(1)}`
    const change = delta === 0 ? '  same' : `  ${delta > 0 ? '+' : ''}${delta.toFixed(1)}`
    console.log(`${(speaking ? 'speaking' : 'writing').padEnd(10)} ${date}  ${oldCol}   ${newCol} ${change}`)

    for (const p of next.parts) {
      const label = p.max === 0 ? 'not delivered / not graded' : `${p.earned}/${p.max} pts`
      console.log(`             ${p.key.padEnd(20)} ${label.padEnd(28)} weight ${(p.effectiveWeight * 100).toFixed(0)}%`)
    }
  }

  console.log('\nOld = correct answers / scored questions. Interview answers and')
  console.log('essays contribute nothing. New = weighted points, everything counts.')
}

main().catch(e => { console.error(e); process.exit(1) })
