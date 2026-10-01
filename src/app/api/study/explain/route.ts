import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { enforceRateLimit } from '@/lib/rate-limit'
import { buildExplainPrompt } from '@/lib/study/explain-prompt'
import { requireStudyUser } from '@/lib/study/auth'
import { dbAdmin } from '@/lib/supabase-admin'
import { loggers } from '@/lib/error-monitoring'

/**
 * POST /api/study/explain — on-demand, follow-up explanations for a
 * question the student just answered (or a wrong-notebook entry).
 *
 * This is the interactive layer on top of the static grader explanation:
 * the student can ask for a step-by-step walkthrough, a simpler
 * re-explanation, or ask their own question about it. One short model call
 * per tap.
 *
 * Modes:
 *   steps    → numbered worked solution
 *   simpler  → plain-language re-explanation, no jargon
 *   followup → answers the student's own typed question about this item
 *
 * The follow-up shipped on 2026-07-14, was hidden a week later in a3cbff44
 * ("hide the free-form follow-up for now"), and came back on 2026-09-10 with
 * the columns it always needed (migration 107). While it was hidden the
 * server half stayed and could not be reached from anywhere, which is how it
 * nearly earned a migration to store output nothing produced.
 */

type Mode = 'steps' | 'simpler' | 'followup'

interface Body {
  prompt?: string
  /** Reading prose, or the listening transcript. See the context builder. */
  passage?: string
  choices?: string[]
  correctAnswer?: string
  studentAnswer?: string
  priorExplanation?: string
  mode?: Mode
  /** The student's own question, for mode 'followup'. */
  followup?: string
  language?: 'en' | 'ko'
  /** When present, the generated steps/simpler text is persisted against
   *  this attempt so it survives a reload of the wrong-answer notebook. */
  attemptId?: string
}

export async function POST(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  // One tap per explanation; cap so a stuck client can't melt tokens.
  const blocked = enforceRateLimit(`study-explain:user:${user.id}`, {
    windowMs: 60 * 1000,
    max: 40,
  })
  if (blocked) return blocked

  let body: Body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 })
  }

  const mode: Mode =
    body.mode === 'simpler' || body.mode === 'followup' ? body.mode : 'steps'
  const ko = body.language === 'ko'
  const prompt = (body.prompt ?? '').slice(0, 4000)
  if (!prompt.trim()) {
    return NextResponse.json({ error: 'missing prompt' }, { status: 400 })
  }
  // Clamped here, and the same clamp is what gets stored, so the saved
  // question always matches the one the model was actually given.
  const followup = (body.followup ?? '').trim().slice(0, 500)
  if (mode === 'followup' && !followup) {
    return NextResponse.json({ error: 'missing followup' }, { status: 400 })
  }

  const { system, prompt: context } = buildExplainPrompt({
    prompt, passage: body.passage, choices: body.choices, correctAnswer: body.correctAnswer,
    studentAnswer: body.studentAnswer, priorExplanation: body.priorExplanation, mode, followup, ko,
  })

  try {
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      system,
      prompt: context,
      temperature: 0.3,
    })
    const clean = text.replace(/\*\*/g, '').replace(/^#+\s*/gm, '').trim()

    // Persist steps/simpler against the attempt so the wrong-answer
    // notebook can re-show them on reload (best-effort; a save failure
    // never blocks returning the explanation the student is waiting on).
    const attemptId = (body.attemptId ?? '').trim()
    if (attemptId && clean) {
      try {
        const { data: attempt } = await dbAdmin
          .from('study_attempts')
          .select('id, session:study_sessions!inner ( student_id )')
          .eq('id', attemptId)
          .maybeSingle()
        const session = attempt?.session as { student_id: string } | { student_id: string }[] | null
        const owner = Array.isArray(session) ? session[0]?.student_id : session?.student_id
        if (attempt && owner === user.id) {
          // The catch below can't see a rejected write (supabase-js
          // resolves with { error }), so a failed save silently cost the
          // student their explanation on the next notebook reload.
          //
          // Concrete keys, not [mode] / [`${mode}_lang`]. The computed form
          // widened to an index signature, so the compiler could not tell
          // that this table has columns for exactly the two modes above.
          // Written out, adding a third mode without a column for it is a
          // compile error rather than a runtime rejection nobody reads.
          const columns =
            mode === 'steps'   ? { steps: clean } :
            mode === 'simpler' ? { simpler: clean } :
            // The question is stored beside the answer. Without it the saved
            // follow-up is a reply to nothing when the notebook reloads.
            { followup: clean, followup_question: followup }
          /* LANGUAGE IS PART OF THE KEY (migration
           * study_attempt_explanations_per_language, 2026-09-13). It used to
           * live in per-mode `steps_lang` / `simpler_lang` / `followup_lang`
           * columns while the key was just (student_id, attempt_id), so
           * generating the Korean step-by-step overwrote the English one and
           * the student lost it on the next notebook reload — and switching
           * the toggle re-billed a call for text already paid for. One row per
           * language now, and those three columns are gone rather than left as
           * a second source of truth for what the key already says. */
          const { error: saveErr } = await dbAdmin
            .from('study_attempt_explanations')
            .upsert(
              {
                student_id: user.id, attempt_id: attemptId,
                language: ko ? 'ko' : 'en',
                ...columns,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'student_id,attempt_id,language' },
            )
          if (saveErr) console.error('[study/explain] save failed', { attemptId, mode, error: saveErr })
        }
      } catch (e) {
        loggers.study.error(
          'Explanation save threw',
          e instanceof Error ? e : new Error(String(e)),
          { attemptId, mode }
        )
      }
    }

    return NextResponse.json({ text: clean })
  } catch (e) {
    loggers.study.error(
      'Explain request failed',
      e instanceof Error ? e : new Error(String(e)),
      { mode }
    )
    return NextResponse.json({ error: 'explain failed' }, { status: 500 })
  }
}
