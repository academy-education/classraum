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
}

export async function analyzeAttempt(params: AnalyzeAttemptParams): Promise<string> {
  const langInstr = params.language === 'korean'
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

Provide a concise analysis (3-5 short paragraphs) covering:
- Overall performance summary
- Specific strengths
- Areas needing improvement
- 2-3 concrete next-step recommendations

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
