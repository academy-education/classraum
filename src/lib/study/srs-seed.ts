import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * Seed the spaced-repetition review queue from a missed question.
 *
 * A wrong answer is the strongest signal a concept needs review, so we
 * drop it straight into study_flashcard_reviews (the same queue the daily
 * SRS surface reads) as a card due NOW. The prompt becomes the front and
 * the correct answer + explanation the back.
 *
 * topic_id is a NOT-NULL part of the table's PK, so freeform sessions
 * (no topic) are skipped. On a repeat miss of the same card we reset the
 * SM-2 schedule (interval/reps → 0, due now) so it's relearned from
 * scratch; ease_factor is left alone.
 */
export async function seedSrsFromWrongAnswer(opts: {
  studentId: string
  topicId: string | null | undefined
  front: string
  back: string
}): Promise<void> {
  if (!opts.topicId) return
  const front = opts.front.trim().slice(0, 1000)
  const back = opts.back.trim().slice(0, 2000)
  if (!front || !back) return
  const nowIso = new Date().toISOString()
  try {
    await supabaseAdmin
      .from('study_flashcard_reviews')
      .upsert(
        {
          student_id: opts.studentId,
          topic_id: opts.topicId,
          card_front: front,
          card_back: back,
          due_at: nowIso,
          interval_days: 0,
          repetitions: 0,
          updated_at: nowIso,
        },
        { onConflict: 'student_id,topic_id,card_front' },
      )
  } catch (e) {
    // Best-effort — never fail the grade/submit response over a review seed.
    console.error('[srs-seed] failed', e)
  }
}
