import { z } from 'zod'

/**
 * Request schema for POST /api/study/test/submit. Lives here rather than
 * in the route file because a route file may export only handlers and
 * route config, and both the route test and
 * scripts/verify-cached-test-payloads.ts must parse with exactly the
 * schema production uses.
 */

// Permissive — the cached test payload comes from sanitizeQuestion
// which normalizes optional fields to `null`. Zod's `.optional()` only
// accepts undefined, so without .nullable() Zod rejects every submit
// with "expected array, received null" — client swallows the 400 and
// the user sees the Submit button do nothing.
export const QuestionSchema = z.object({
  passage: z.string().nullable().optional(),
  passageGroupId: z.string().nullable().optional(),
  prompt: z.string(),
  type: z.enum([
    'multiple_choice', 'numeric_entry', 'multi_select', 'three_choice', 'quant_comparison',
    'fill_in_blanks', 'arrange_words', 'speaking_repeat', 'speaking_interview',
    'writing_email', 'writing_discussion',
    // SSAT Writing Sample / ISEE Essay. Missing from this list until
    // 2026-10-04, so every essay submit 400'd with "bad payload".
    'essay', 'essay_choice',
  ]).nullable().optional(),
  choices: z.array(z.string()).nullable().optional(),
  correct_answer: z.string().nullable().optional(),
  correct_answers: z.array(z.string()).nullable().optional(),
  acceptable_answers: z.array(z.string()).nullable().optional(),
  blanks: z.array(z.object({
    id: z.number().int(),
    answer: z.string(),
    alternates: z.array(z.string()).nullable().optional(),
  })).nullable().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  explanation: z.string(),
  /** false = unscored ETS pilot item. Absent/true = scored. */
  scored: z.boolean().nullable().optional(),
  /** study_item_bank.id when the question came from the bank. Persisted so
   *  per-item accuracy is computable; see migration 063. */
  bankItemId: z.string().uuid().nullable().optional(),
  distractor_rationales: z
    .array(z.object({ choice: z.string(), reason: z.string() }))
    .nullable()
    .optional(),
  // graphic is passthrough — we don't need to validate its shape for
  // grading (it's UI-only), but we need to accept it so submit
  // doesn't reject the questions array.
  graphic: z.unknown().nullable().optional(),
})

export const SubmitSchema = z.object({
  sessionId: z.string(),
  /** Question payloads as originally generated — passed back from
   *  the client so we don't have to re-deserialise the cache row.
   *  Cap matches the generator schema (200) so full-section tests
   *  (SAT R&W 54, TOEIC 100, ACT English 50) submit successfully. */
  questions: z.array(QuestionSchema).min(1).max(200),
  /** Indexed by question position; null = unanswered. */
  answers: z.array(z.string().nullable()),
  /** Total seconds the student actually spent. */
  elapsedSeconds: z.number().int().min(0),
  /** Active seconds each question was on screen, carved from the same
   *  clock as elapsedSeconds (see lib/study/question-time). Optional:
   *  older clients omit it, and an inconsistent array is ignored in
   *  favour of the even split by reconcileQuestionSeconds. */
  questionSeconds: z.array(z.number().int().min(0).nullable()).max(200).optional(),
  /** Why the test ended, when it wasn't the student pressing Submit.
   *  'app_exited' = the native app was backgrounded mid-test and the
   *  exit guard auto-submitted whatever had been answered. Persisted
   *  so the reason survives the screen that reported it. */
  endReason: z.literal('app_exited').nullable().optional(),
})

export type SubmitQuestion = z.infer<typeof QuestionSchema>
