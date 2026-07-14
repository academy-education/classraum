import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { enforceRateLimit } from '@/lib/rate-limit'
import { requireStudyUser } from '@/lib/study/auth'

/**
 * POST /api/study/explain — on-demand, follow-up explanations for a
 * question the student just answered (or a wrong-notebook entry).
 *
 * This is the interactive layer on top of the static grader explanation:
 * the student can ask for a step-by-step walkthrough, a simpler
 * re-explanation, or type their own follow-up ("why isn't C right?").
 * One short model call per tap — no session, no persistence.
 *
 * Modes:
 *   steps    → numbered worked solution
 *   simpler  → plain-language re-explanation, no jargon
 *   followup → answer the student's typed question about this item
 */

type Mode = 'steps' | 'simpler' | 'followup'

interface Body {
  prompt?: string
  choices?: string[]
  correctAnswer?: string
  studentAnswer?: string
  priorExplanation?: string
  mode?: Mode
  followup?: string
  language?: 'en' | 'ko'
}

const MODE_INSTRUCTION: Record<Mode, { en: string; ko: string }> = {
  steps: {
    en: 'Give a clear, numbered step-by-step walkthrough of how to reach the correct answer. Show the reasoning at each step. Keep it tight — no preamble.',
    ko: '정답에 도달하는 과정을 번호를 매겨 단계별로 명확하게 설명하세요. 각 단계의 근거를 보여주세요. 군더더기 없이 간결하게.',
  },
  simpler: {
    en: 'Re-explain why the correct answer is right in plain, simple language a struggling student would understand. Avoid jargon. Use a short everyday analogy if it helps.',
    ko: '어려워하는 학생도 이해할 수 있도록 정답이 맞는 이유를 쉬운 말로 다시 설명하세요. 전문 용어는 피하고, 도움이 된다면 짧은 일상적 비유를 사용하세요.',
  },
  followup: {
    en: "Answer the student's follow-up question about this specific item directly and briefly.",
    ko: '이 문항에 대한 학생의 추가 질문에 직접적이고 간결하게 답하세요.',
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

  const mode: Mode = body.mode === 'simpler' || body.mode === 'followup' ? body.mode : 'steps'
  const ko = body.language === 'ko'
  const prompt = (body.prompt ?? '').slice(0, 4000)
  if (!prompt.trim()) {
    return NextResponse.json({ error: 'missing prompt' }, { status: 400 })
  }
  if (mode === 'followup' && !(body.followup ?? '').trim()) {
    return NextResponse.json({ error: 'missing followup' }, { status: 400 })
  }

  const context = [
    `QUESTION:\n${prompt}`,
    body.choices?.length ? `CHOICES:\n${body.choices.map((c, i) => `${String.fromCharCode(65 + i)}. ${c}`).join('\n')}` : '',
    body.correctAnswer ? `CORRECT ANSWER: ${body.correctAnswer}` : '',
    body.studentAnswer ? `STUDENT ANSWERED: ${body.studentAnswer}` : '',
    body.priorExplanation ? `EXPLANATION ALREADY SHOWN:\n${body.priorExplanation.slice(0, 1200)}` : '',
    mode === 'followup' ? `STUDENT'S FOLLOW-UP QUESTION: ${(body.followup ?? '').slice(0, 500)}` : '',
  ].filter(Boolean).join('\n\n')

  const system = [
    'You are a warm, concise study tutor helping a student understand one question they just worked on.',
    ko
      ? '반드시 한국어로 답하세요.'
      : 'Answer in English.',
    MODE_INSTRUCTION[mode][ko ? 'ko' : 'en'],
    'Do not restate the whole question. Keep it under ~150 words. Plain text only — no markdown headers or asterisks.',
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
    return NextResponse.json({ text: clean })
  } catch (e) {
    console.error('[study/explain] failed', e)
    return NextResponse.json({ error: 'explain failed' }, { status: 500 })
  }
}
