import { generateObject } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * Post-session AI assessment that turns a list of attempt rows into
 * structured strengths + weaknesses, then merges them into the
 * student's study_mastery row for that topic.
 *
 * Called fire-and-forget from /api/study/test/submit and any other
 * mode that finishes a coherent block of work. Failure mode is
 * silent — mastery already has a numeric score; the strengths/
 * weaknesses are bonus signal for the recommended shelf.
 */

const StrengthSchema = z.object({
  label: z.string().describe('Short skill or sub-topic name (3-6 words).'),
  evidence: z.string().describe('1 sentence — how the attempts demonstrate this.'),
})

const WeaknessSchema = z.object({
  label: z.string().describe('Short skill or sub-topic name where the student struggled.'),
  evidence: z.string().describe('1 sentence pointing to the specific kind of mistake.'),
  suggestion: z.string().describe('1 sentence recommendation, e.g. "Drill more inference questions" or "Review the unit-conversion chapter."'),
})

const AssessmentSchema = z.object({
  strengths: z.array(StrengthSchema).max(5),
  weaknesses: z.array(WeaknessSchema).max(5),
})

interface AttemptRow {
  question: { prompt?: string; type?: string; difficulty?: string; correct_answer?: string }
  student_answer: string | null
  is_correct: boolean | null
  ai_explanation: string | null
}

interface AssessInput {
  studentId: string
  topicId: string
  topicName: string
  language: 'en' | 'ko'
  attempts: AttemptRow[]
}

const PROMPT_EN = (topic: string, attempts: AttemptRow[]) => `
A student just finished a study session on "${topic}". Below are their attempts. Analyze the wrong answers to identify what they struggled with, and the right answers to identify what they're solid on.

Output strengths (what they showed mastery of) and weaknesses (where they need more work). For each weakness, suggest ONE concrete next action.

Keep labels short (3-6 words). Evidence is 1 sentence each. Suggestions are 1 sentence each. Plain text, no markdown.

If the student got everything right, return 2-3 strengths and 0 weaknesses. If they got everything wrong, return 0 strengths and 2-3 weaknesses with patient suggestions.

Attempts:
${attempts.map((a, i) => `
${i + 1}. ${a.question.prompt ?? '(no prompt)'}
   Difficulty: ${a.question.difficulty ?? '?'}, Type: ${a.question.type ?? '?'}
   Correct: ${a.question.correct_answer ?? '?'}
   Student: ${a.student_answer ?? '(no answer)'} → ${a.is_correct ? 'RIGHT' : 'WRONG'}
`).join('')}
`.trim()

const PROMPT_KO = (topic: string, attempts: AttemptRow[]) => `
학생이 방금 "${topic}" 학습 세션을 마쳤습니다. 아래는 학생의 답안입니다. 틀린 답을 분석해 어디서 막혔는지 파악하고, 맞힌 답에서 어디가 단단한지 파악하세요.

강점(잘하는 부분)과 약점(보완이 필요한 부분)을 출력하세요. 각 약점마다 구체적인 다음 행동 한 가지를 제안하세요.

label은 짧게(한국어 6단어 이내). evidence는 각 1문장. suggestion은 각 1문장. 일반 텍스트, 마크다운 금지.

학생이 다 맞혔다면 강점 2-3개, 약점 0개. 다 틀렸다면 강점 0개, 약점 2-3개와 차분한 제안.

답안:
${attempts.map((a, i) => `
${i + 1}. ${a.question.prompt ?? '(문제 없음)'}
   난이도: ${a.question.difficulty ?? '?'}, 유형: ${a.question.type ?? '?'}
   정답: ${a.question.correct_answer ?? '?'}
   학생 답: ${a.student_answer ?? '(미답)'} → ${a.is_correct ? '정답' : '오답'}
`).join('')}
`.trim()

/**
 * Run the assessment and merge into study_mastery. Returns the new
 * strengths/weaknesses arrays on success, null on failure (caller
 * treats failure as a no-op).
 */
export async function assessAndPersistMastery(input: AssessInput): Promise<z.infer<typeof AssessmentSchema> | null> {
  if (input.attempts.length === 0) return null

  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
  try {
    const result = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: AssessmentSchema,
      prompt: input.language === 'ko'
        ? PROMPT_KO(input.topicName, input.attempts)
        : PROMPT_EN(input.topicName, input.attempts),
      temperature: 0.3,
    })
    const assessment = result.object

    // Merge with the existing row. The trigger
    // bump_study_mastery_from_attempt already created/updated the
    // numeric score; we're only filling the qualitative fields.
    await supabaseAdmin
      .from('study_mastery')
      .update({
        strengths: assessment.strengths,
        weaknesses: assessment.weaknesses,
        last_assessed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('student_id', input.studentId)
      .eq('topic_id', input.topicId)

    return assessment
  } catch (err) {
    console.error('[study-mastery-assess]', err)
    return null
  }
}

/**
 * Convenience: load the attempts for a session + look up topic, then
 * run the assessment. Used by the test/submit fire-and-forget path.
 */
export async function assessSessionMastery(sessionId: string): Promise<void> {
  const { data: session } = await supabaseAdmin
    .from('study_sessions')
    .select('student_id, topic_id, language')
    .eq('id', sessionId)
    .maybeSingle()
  if (!session?.topic_id) return

  const { data: topic } = await supabaseAdmin
    .from('study_topics')
    .select('name_en, name_ko')
    .eq('id', session.topic_id)
    .maybeSingle()
  if (!topic) return

  const { data: attempts } = await supabaseAdmin
    .from('study_attempts')
    .select('question, student_answer, is_correct, ai_explanation')
    .eq('session_id', sessionId)
  if (!attempts || attempts.length === 0) return

  const lang = session.language as 'en' | 'ko'
  await assessAndPersistMastery({
    studentId: session.student_id,
    topicId: session.topic_id,
    topicName: lang === 'ko' ? topic.name_ko : topic.name_en,
    language: lang,
    attempts: attempts as unknown as AttemptRow[],
  })
}
