/**
 * Run the breakdown over every real completed test and print it.
 *
 * Unit tests use hand-written items; this is the check that the grouping
 * survives the actual bank, where labels are inconsistent and some
 * prompts have none. Read the output and ask: would a student learn
 * anything true from these rows?
 *
 *   npx tsx scripts/verify-section-breakdown.ts
 */
import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '.env.local') })
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } })

async function main() {
  const { buildSectionBreakdown } = await import('../src/lib/study/section-breakdown')
  const { scoreListenRepeat } = await import('../src/lib/study/listen-repeat-accuracy')

  const { data: sessions } = await db
    .from('study_sessions')
    .select('id, created_at, topic:study_topics(slug)')
    .eq('mode', 'full_test').eq('status', 'completed')
    .order('created_at', { ascending: false })

  let empty = 0, single = 0, ok = 0, bad = 0
  for (const s of sessions ?? []) {
    const t = s.topic as { slug: string } | { slug: string }[] | null
    const slug = (Array.isArray(t) ? t[0]?.slug : t?.slug) ?? '?'

    const { data: attempts } = await db.from('study_attempts')
      .select('question, student_answer, is_correct').eq('session_id', s.id)
    const { data: subs } = await db.from('study_response_submissions')
      .select('prompt_text, study_response_grades(overall_band)').eq('session_id', s.id)

    const band = new Map<string, number>()
    for (const g of subs ?? []) {
      const gr = Array.isArray(g.study_response_grades) ? g.study_response_grades[0] : g.study_response_grades
      if (gr) band.set(g.prompt_text as string, Number(gr.overall_band))
    }

    // Scored items only — pilots are delivered but never counted, and a
    // breakdown that includes them totals more than the score above it.
    const scoredAttempts = (attempts ?? []).filter(a => {
      const q = a.question as Record<string, unknown> | null
      return q?.scored !== false
    })

    const items = scoredAttempts.map(a => {
      const q = a.question as Record<string, unknown> | null
      return {
        type: String(q?.type ?? ''),
        prompt: typeof q?.prompt === 'string' ? q.prompt : null,
        expectedText: typeof q?.correct_answer === 'string' ? q.correct_answer : null,
        studentAnswer: a.student_answer as string | null,
        correct: a.is_correct === true,
        rubricBand: band.get(String(q?.prompt ?? '')) ?? null,
      }
    })

    const b = buildSectionBreakdown(items, scoreListenRepeat)

    // THE reconciliation check. Rows that sum past the section's own
    // points are the failure this whole module is written to avoid, and
    // it already happened once: a Listening test showed 17 across four
    // sections under a hero reading 14 of 35.
    const rowPoints = b.groups.reduce((n, g) => n + g.earned, 0)
    const rowMax = b.groups.reduce((n, g) => n + g.max, 0)
    if (b.omitted === 0 && rowMax > items.length * 5) {
      console.log(`   !! rows claim ${rowMax} points from ${items.length} items`)
      bad++
    }
    if (b.groups.length === 0) empty++
    else if (b.groups.length === 1) single++
    else ok++

    console.log(`\n${slug.padEnd(20)} ${String(s.created_at).slice(0, 10)}  ${items.length} items` +
      `  → ${b.groups.length} groups, ${b.omitted} omitted`)
    for (const g of b.groups) {
      const pct = Math.round(g.proportion * 100)
      const bar = '█'.repeat(Math.round(pct / 5)).padEnd(20, '·')
      console.log(`   ${g.label.padEnd(22)} ${bar} ${String(pct).padStart(3)}%  ${g.earned}/${g.max} (${g.items} items)`)
    }
  }

  console.log(`\n${ok} sessions with a real breakdown, ${single} with one group, ${empty} empty.`)
  if (bad > 0) { console.error(`${bad} sessions FAILED reconciliation.`); process.exit(1) }
  if (empty > 0) console.log('EMPTY sessions produce no card at all — check they are the SAT / tiny ones.')
}
main().catch(e => { console.error(e); process.exit(1) })
