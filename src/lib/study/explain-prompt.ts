/**
 * Prompt construction for /api/study/explain ("More help" on review and
 * practice). Pure, so the route and a live check use the exact same text.
 */
export type ExplainMode = 'steps' | 'more' | 'followup'
type Mode = ExplainMode

export interface ExplainInput {
  prompt: string
  passage?: string
  choices?: string[]
  correctAnswer?: string
  studentAnswer?: string
  priorExplanation?: string
  mode: Mode
  followup?: string
  ko: boolean
}

export const MODE_INSTRUCTION: Record<Mode, { en: string; ko: string }> = {
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
  /* "Explain more" / "더 자세히 설명", stored in its own `more` column (see
   * lib/study/saved-explanations.ts). It was briefly keyed 'simpler', which made
   * the notebook serve old "Explain simply" texts under this label. It replaced the 2-4 sentence
   * plain-language version (2026-10-01): students wanted a fuller account that
   * ties the passage, the question and EACH choice together by letter. */
  more: {
    en: 'Explain this question more fully so the student understands it. In one sentence, say what the question is asking and point to the part of the passage or transcript that decides it, quoting it when there is one. Then explain why the correct choice is right, naming it by its letter, e.g. "(B)". Then go through every other choice by letter and say in a sentence why it is wrong. If the student chose a wrong letter, start that part with their choice and say what made it tempting. Refer to the choices by letter throughout. Use plain words and short paragraphs.',
    ko: '학생이 이 문제를 잘 이해할 수 있도록 더 자세히 설명해 주세요. 먼저 한 문장으로 문제가 무엇을 묻는지 말하고, 정답을 가르는 지문이나 대본의 부분을 짚어 주세요. 지문이 있으면 해당 부분을 인용해 주세요. 그다음 정답 선택지가 왜 맞는지 "(B)"처럼 알파벳으로 지칭하며 설명해 주세요. 이어서 나머지 선택지를 하나도 빠짐없이 알파벳으로 지칭하며 각각 왜 틀렸는지 한 문장씩 설명해 주세요. 학생이 오답을 골랐다면 그 선택지부터 다루고, 왜 헷갈리기 쉬웠는지도 말해 주세요. 쉬운 말과 짧은 문단을 사용해 주세요.',
  },
}

export function buildExplainPrompt(input: ExplainInput): { system: string; prompt: string } {
  const { prompt, mode, followup, ko } = input
  const body = input
  /* THE PASSAGE WAS NEVER SENT, AND THAT IS THE BUG A STUDENT REPORTED.
   * She asked why the other choices were wrong and got nothing useful — the
   * model had never seen the text the question is about. Clamped generously
   * but below the prompt's own 4000 so a long academic passage cannot crowd
   * out the question itself. Listening transcripts arrive with the
   * `Transcript:` prefix already stripped by the caller. */
  const passage = (input.passage ?? '').trim().slice(0, 6000)

  /* Answers arrive as the choice text (sometimes as a bare letter). Give the
   * model both, "B. text", so explanations can cite choices by letter and the
   * letters always match the CHOICES block. */
  const letterOf = (ans?: string) => {
    const a = (ans ?? '').trim()
    if (!a || !body.choices?.length) return a
    const i = body.choices.findIndex(c => c.trim() === a)
    if (i >= 0) return `${String.fromCharCode(65 + i)}. ${a}`
    const m = /^\(?([A-Ea-e])\)?\.?$/.exec(a)
    if (m) { const j = m[1].toUpperCase().charCodeAt(0) - 65; if (body.choices[j]) return `${m[1].toUpperCase()}. ${body.choices[j]}` }
    return a
  }

  const context = [
    passage ? `PASSAGE / TRANSCRIPT (the text this question is about):\n${passage}` : '',
    `QUESTION:\n${prompt}`,
    body.choices?.length ? `CHOICES:\n${body.choices.map((c, i) => `${String.fromCharCode(65 + i)}. ${c}`).join('\n')}` : '',
    body.correctAnswer ? `CORRECT ANSWER: ${letterOf(body.correctAnswer)}` : '',
    body.studentAnswer ? `STUDENT ANSWERED: ${letterOf(body.studentAnswer)}` : '',
    body.priorExplanation ? `EXPLANATION ALREADY SHOWN:\n${body.priorExplanation.slice(0, 1200)}` : '',
    mode === 'followup' ? `STUDENT'S FOLLOW-UP QUESTION: ${followup}` : '',
  ].filter(Boolean).join('\n\n')

  const system = [
    'You are a warm, concise study tutor helping a student understand one question they just worked on.',
    ko
      ? '반드시 한국어로 답하세요. 모든 문장을 존댓말(해요체 또는 합니다체)로 쓰고, 반말은 절대 쓰지 마세요.'
      : 'Answer in English.',
    MODE_INSTRUCTION[mode][ko ? 'ko' : 'en'],
    /* The cap was ~150 words for every mode. Accounting for three or four
     * distractors AND the key does not fit in 150 words, so the model obeyed
     * the cap and silently dropped the distractors — the cap was half the
     * reason the instruction above was not being followed. `steps` and
     * `more` ("Explain more", which walks every choice) get room. */
    mode === 'steps' || mode === 'more'
      ? 'Do not restate the whole question. Keep it under ~250 words. Plain text only — no markdown headers or asterisks.'
      : 'Do not restate the whole question. Keep it under ~150 words. Plain text only — no markdown headers or asterisks.',
  ].join(' ')
  return { system, prompt: context }
}
