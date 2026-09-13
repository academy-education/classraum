import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { enforceRateLimit } from '@/lib/rate-limit'
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

const MODE_INSTRUCTION: Record<Mode, { en: string; ko: string }> = {
  steps: {
    /* "Where relevant, name why the tempting wrong choice fails" / "필요하면
     * ... 짚어주세요" were BOTH hedged, and the Korean side dropped the
     * distractors far more often — a student reported that the Korean
     * step-by-step never told her why the other options were wrong while the
     * English one did. The instruction is now unconditional and says EVERY
     * option, in both languages, so the two are the same promise. */
    en: 'Give a numbered, step-by-step walkthrough that shows exactly how to arrive at the correct answer. Start from what the question is actually asking, then one concrete action per step, showing the reasoning that moves you forward. When the question has options, you MUST account for every wrong one — name each and say in a few words why it fails, quoting the passage or transcript where there is one. End with a one-line statement of the final answer. No preamble — start at step 1.',
    ko: '정답에 도달하는 방법을 번호를 매겨 단계별로 정확히 보여주세요. 문제가 실제로 무엇을 묻는지에서 시작해, 각 단계마다 구체적인 행동 하나와 그 근거를 제시하세요. 선택지가 있으면 오답을 하나도 빠짐없이 다뤄야 합니다. 각 오답을 언급하고 왜 틀렸는지 몇 마디로 설명하되, 지문이나 대본이 있으면 해당 부분을 인용하세요. 마지막 줄에 최종 정답을 한 줄로 정리하세요. 서론 없이 1단계부터 시작하세요.',
  },
  followup: {
    en: "Answer the student's follow-up question about this specific item directly and briefly. Answer the question they actually asked -- do not restate the whole solution unless that IS the question.",
    ko: '이 문항에 대한 학생의 추가 질문에 직접적이고 간결하게 답하세요. 학생이 실제로 물어본 것에 답하고, 그것이 질문이 아닌 이상 풀이 전체를 다시 설명하지 마세요.',
  },
  simpler: {
    en: 'Explain why the correct answer is right in the plainest language possible — as if to a younger student who just got it wrong and feels stuck. No jargon (or define it in plain words the moment you must use it). Use one short, concrete everyday analogy that maps cleanly onto the idea. Get to the "aha" in 2–4 short sentences; do not restate the whole question.',
    ko: '정답이 맞는 이유를 가능한 한 가장 쉬운 말로 설명하세요. 방금 틀려서 막막해하는 어린 학생에게 말하듯이요. 전문 용어는 쓰지 말고(꼭 써야 하면 바로 쉬운 말로 풀어주세요), 개념에 딱 들어맞는 짧고 구체적인 일상 비유 하나를 사용하세요. 문제 전체를 다시 말하지 말고, 2~4개의 짧은 문장으로 "아하" 하고 이해되게 하세요.',
  },
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

  /* THE PASSAGE WAS NEVER SENT, AND THAT IS THE BUG A STUDENT REPORTED.
   * She asked why the other choices were wrong and got nothing useful — the
   * model had never seen the text the question is about. Clamped generously
   * but below the prompt's own 4000 so a long academic passage cannot crowd
   * out the question itself. Listening transcripts arrive with the
   * `Transcript:` prefix already stripped by the caller. */
  const passage = (body.passage ?? '').trim().slice(0, 6000)

  const context = [
    passage ? `PASSAGE / TRANSCRIPT (the text this question is about):\n${passage}` : '',
    `QUESTION:\n${prompt}`,
    body.choices?.length ? `CHOICES:\n${body.choices.map((c, i) => `${String.fromCharCode(65 + i)}. ${c}`).join('\n')}` : '',
    body.correctAnswer ? `CORRECT ANSWER: ${body.correctAnswer}` : '',
    body.studentAnswer ? `STUDENT ANSWERED: ${body.studentAnswer}` : '',
    body.priorExplanation ? `EXPLANATION ALREADY SHOWN:\n${body.priorExplanation.slice(0, 1200)}` : '',
    mode === 'followup' ? `STUDENT'S FOLLOW-UP QUESTION: ${followup}` : '',
  ].filter(Boolean).join('\n\n')

  const system = [
    'You are a warm, concise study tutor helping a student understand one question they just worked on.',
    ko
      ? '반드시 한국어로 답하세요.'
      : 'Answer in English.',
    MODE_INSTRUCTION[mode][ko ? 'ko' : 'en'],
    /* The cap was ~150 words for every mode. Accounting for three or four
     * distractors AND the key does not fit in 150 words, so the model obeyed
     * the cap and silently dropped the distractors — the cap was half the
     * reason the instruction above was not being followed. `steps` gets room;
     * `simpler` deliberately keeps the tight cap, because its whole point is
     * brevity and it is not asked to enumerate options. */
    mode === 'steps'
      ? 'Do not restate the whole question. Keep it under ~250 words. Plain text only — no markdown headers or asterisks.'
      : 'Do not restate the whole question. Keep it under ~150 words. Plain text only — no markdown headers or asterisks.',
  ].join(' ')

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
            mode === 'steps'   ? { steps: clean,   steps_lang: ko ? 'ko' : 'en' } :
            mode === 'simpler' ? { simpler: clean, simpler_lang: ko ? 'ko' : 'en' } :
            // The question is stored beside the answer. Without it the saved
            // follow-up is a reply to nothing when the notebook reloads.
            { followup: clean, followup_lang: ko ? 'ko' : 'en', followup_question: followup }
          const { error: saveErr } = await dbAdmin
            .from('study_attempt_explanations')
            .upsert(
              {
                student_id: user.id, attempt_id: attemptId,
                ...columns,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'student_id,attempt_id' },
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
