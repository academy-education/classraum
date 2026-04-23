import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer'
export type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert'
export type Language = 'english' | 'korean'

export interface GenerateTestParams {
  subject: string
  grade?: string
  difficulty: Difficulty
  language: Language
  questionTypes: QuestionType[]
  questionCount: number
  mcChoiceCount: number
}

export interface GeneratedQuestion {
  type: QuestionType
  question: string
  choices?: string[]
  correct_answer: string
  explanation?: string
}

export interface GeneratedTest {
  title: string
  questions: GeneratedQuestion[]
}

const LANGUAGE_INSTRUCTION = {
  english: 'All questions, choices, answers, and explanations must be in English.',
  korean: 'All questions, choices, answers, and explanations must be in Korean (한국어).',
}

const DIFFICULTY_DESCRIPTIONS = {
  beginner: 'introductory level, basic concepts, simple vocabulary',
  intermediate: 'moderate difficulty, requires some prior knowledge',
  advanced: 'challenging, requires deep understanding',
  expert: 'expert level, complex problems requiring expert reasoning',
}

function buildPrompt(params: GenerateTestParams): string {
  const { subject, grade, difficulty, language, questionTypes, questionCount, mcChoiceCount } = params

  const gradeText = grade ? ` for ${grade} students` : ''
  const typesText = questionTypes.join(', ')

  return `You are an expert test creator. Generate a level test for the subject "${subject}"${gradeText} at ${difficulty} difficulty (${DIFFICULTY_DESCRIPTIONS[difficulty]}).

${LANGUAGE_INSTRUCTION[language]}

Requirements:
- Generate exactly ${questionCount} questions
- Question types to include: ${typesText}
- For multiple_choice questions: provide exactly ${mcChoiceCount} answer choices
- For true_false questions: correct_answer must be either "true" or "false"
- For short_answer questions: provide a concise model answer
- Distribute question types evenly if multiple types are requested
- Each question should test a distinct concept; avoid repetition
- Include a brief explanation for each correct answer

Return ONLY valid JSON matching this exact schema (no markdown, no commentary):
{
  "title": "Brief descriptive title for the test",
  "questions": [
    {
      "type": "multiple_choice" | "true_false" | "short_answer",
      "question": "The question text",
      "choices": ["A", "B", "C", "D"],  // ONLY for multiple_choice; omit for other types
      "correct_answer": "The exact text of the correct answer (for MC, must match one choice exactly; for true_false, 'true' or 'false'; for short_answer, the model answer)",
      "explanation": "Brief explanation of why this is correct"
    }
  ]
}`
}

export type AnalysisFocus = 'overall' | 'strengths' | 'weaknesses' | 'study_plan' | 'misconceptions'
export type AnalysisLength = 'short' | 'medium' | 'detailed'
export type AnalysisTone = 'encouraging' | 'direct' | 'formal'

export interface AnalyzeAttemptParams {
  testTitle: string
  subject: string
  difficulty: Difficulty
  language: Language
  extraComments?: string | null
  takerName: string
  questions: Array<{
    question: string
    type: QuestionType
    correct_answer: string
    student_answer: string
    is_correct: boolean | null
  }>
  totalScore: number | null
  // Optional analysis customization
  analysisLanguage?: Language
  focus?: AnalysisFocus
  length?: AnalysisLength
  tone?: AnalysisTone
}

const FOCUS_INSTRUCTIONS: Record<AnalysisFocus, string> = {
  overall: 'Provide a balanced overall analysis covering performance summary, strengths, areas needing improvement, and 2-3 concrete next-step recommendations.',
  strengths: 'Focus primarily on the student\'s strengths. Identify what they did well, the concepts they have mastered, and the skills they demonstrated. Briefly mention improvement areas only if critical.',
  weaknesses: 'Focus on areas needing improvement. Identify specific concepts or skills that are weak, explain why the student struggled, and provide detailed guidance on how to address each weakness.',
  study_plan: 'Produce an actionable study plan. Prioritize topics the student should study, suggest specific practice activities, and recommend a realistic timeline. Keep the tone practical and concrete.',
  misconceptions: 'Analyze wrong answers to identify underlying misconceptions. For each incorrect response, explain what the student likely misunderstood and how to correct that misconception.',
}

const LENGTH_INSTRUCTIONS: Record<AnalysisLength, string> = {
  short: 'Keep the analysis concise: 2 short paragraphs (~4-6 sentences total).',
  medium: 'Keep the analysis moderate: 3-5 short paragraphs.',
  detailed: 'Provide a thorough analysis: 5-8 paragraphs with specific examples from the student\'s responses.',
}

const TONE_INSTRUCTIONS: Record<AnalysisTone, string> = {
  encouraging: 'Use an encouraging, supportive tone. Celebrate effort and progress while being constructive about improvements.',
  direct: 'Use a direct, straightforward tone. Be clear and honest about both strengths and weaknesses without softening language.',
  formal: 'Use a formal, professional tone suitable for a written evaluation report.',
}

export async function analyzeAttempt(params: AnalyzeAttemptParams): Promise<string> {
  const focus: AnalysisFocus = params.focus || 'overall'
  const length: AnalysisLength = params.length || 'medium'
  const tone: AnalysisTone = params.tone || 'encouraging'
  const outputLang: Language = params.analysisLanguage || params.language

  const langInstr = outputLang === 'korean'
    ? 'Respond in Korean (한국어). Use natural professional Korean.'
    : 'Respond in English. Use clear professional language.'

  const questionsText = params.questions.map((q, i) => `Question ${i + 1} (${q.type}): ${q.question}
Correct: ${q.correct_answer}
Student answer: ${q.student_answer}
Auto-graded: ${q.is_correct === null ? 'Needs manual grading' : (q.is_correct ? 'Correct' : 'Incorrect')}`).join('\n\n')

  const prompt = `You are an experienced educator analyzing a student's test attempt.

Test: "${params.testTitle}"
Subject: ${params.subject}
Difficulty: ${params.difficulty}
Student: ${params.takerName}
Auto-graded score: ${params.totalScore !== null ? `${params.totalScore}%` : 'pending manual grading'}
${params.extraComments ? `\nManager's notes about the student:\n${params.extraComments}\n` : ''}
Student's responses:

${questionsText}

Analysis instructions:
- Focus: ${FOCUS_INSTRUCTIONS[focus]}
- Length: ${LENGTH_INSTRUCTIONS[length]}
- Tone: ${TONE_INSTRUCTIONS[tone]}

${langInstr} Do NOT use markdown headers or bullets - write in clean paragraphs.`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are an expert educator who provides clear, actionable feedback on student tests.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error('OpenAI returned empty response')
  }
  return content.trim()
}

export interface ShortAnswerToGrade {
  question_id: string
  question: string
  correct_answer: string
  student_answer: string
}

export interface GradedShortAnswer {
  question_id: string
  is_correct: boolean
  reasoning?: string
}

export async function aiGradeShortAnswers(
  items: ShortAnswerToGrade[],
  language: Language = 'english'
): Promise<GradedShortAnswer[]> {
  if (items.length === 0) return []

  const langInstr = language === 'korean'
    ? 'The reasoning should be written in Korean (한국어).'
    : 'The reasoning should be written in English.'

  const itemsText = items.map((it, i) =>
    `Item ${i + 1} (id=${it.question_id}):
Question: ${it.question}
Reference correct answer: ${it.correct_answer}
Student's answer: ${it.student_answer || '(blank)'}`
  ).join('\n\n')

  const prompt = `You are grading short-answer test questions. For each item, judge whether the student's answer is essentially correct compared to the reference answer.

Be lenient with surface form (capitalization, punctuation, minor spelling errors, equivalent phrasings, synonyms). Be strict on factual or mathematical correctness.

If the student's answer is blank, missing, or completely off-topic, mark it incorrect.

${langInstr}

${itemsText}

Return ONLY valid JSON with this exact shape (no markdown, no commentary):
{
  "results": [
    { "question_id": "...", "is_correct": true | false, "reasoning": "one short sentence" }
  ]
}`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are a precise grader. Return only valid JSON.' },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
  })

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error('OpenAI returned empty response')

  let parsed: { results?: GradedShortAnswer[] }
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new Error('OpenAI returned invalid JSON')
  }

  if (!Array.isArray(parsed.results)) {
    throw new Error('AI grading response missing results array')
  }

  // Validate each entry
  const validIds = new Set(items.map(i => i.question_id))
  return parsed.results
    .filter(r => r && typeof r.question_id === 'string' && validIds.has(r.question_id) && typeof r.is_correct === 'boolean')
    .map(r => ({
      question_id: r.question_id,
      is_correct: r.is_correct,
      reasoning: typeof r.reasoning === 'string' ? r.reasoning : undefined,
    }))
}

export async function generateLevelTest(params: GenerateTestParams): Promise<GeneratedTest> {
  const prompt = buildPrompt(params)

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are a test question generator. You always respond with valid JSON only, no markdown or commentary.' },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error('OpenAI returned empty response')
  }

  let parsed: GeneratedTest
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new Error(`OpenAI returned invalid JSON: ${content.slice(0, 200)}`)
  }

  // Validate structure
  if (!parsed.title || !Array.isArray(parsed.questions)) {
    throw new Error('Generated test missing title or questions array')
  }

  if (parsed.questions.length === 0) {
    throw new Error('Generated test has no questions')
  }

  // Validate each question
  for (let i = 0; i < parsed.questions.length; i++) {
    const q = parsed.questions[i]
    if (!q.type || !q.question || !q.correct_answer) {
      throw new Error(`Question ${i + 1} missing required fields`)
    }
    if (!params.questionTypes.includes(q.type)) {
      throw new Error(`Question ${i + 1} has invalid type: ${q.type}`)
    }
    if (q.type === 'multiple_choice') {
      if (!Array.isArray(q.choices) || q.choices.length < 2) {
        throw new Error(`Question ${i + 1} (multiple_choice) needs at least 2 choices`)
      }
      if (!q.choices.includes(q.correct_answer)) {
        throw new Error(`Question ${i + 1} correct_answer "${q.correct_answer}" not in choices`)
      }
    }
    if (q.type === 'true_false') {
      const ans = q.correct_answer.toLowerCase()
      if (ans !== 'true' && ans !== 'false') {
        throw new Error(`Question ${i + 1} (true_false) must have correct_answer "true" or "false"`)
      }
    }
  }

  return parsed
}
