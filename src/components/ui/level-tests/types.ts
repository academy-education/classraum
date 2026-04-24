export interface Question {
  id: string
  order_index: number
  type: string
  question: string
  choices: string[] | null
  correct_answer: string
  explanation?: string | null
}

export interface Test {
  id: string
  title: string
  grade: string | null
  difficulty: string
  language: string
  question_count: number
  time_limit_minutes: number | null
  share_enabled: boolean
  share_token: string | null
  subjects?: { id: string; name: string } | null
}

export interface Attempt {
  id: string
  taker_name: string
  taker_email: string | null
  score: number | null
  total_questions: number
  submitted_at: string
  started_at?: string | null
  student_id?: string | null
  status: string
  needs_manual_grading: boolean
}

export interface Student {
  user_id: string
  users: { name: string; email: string } | null
}

export interface AttemptAnswer {
  question_id: string
  answer: string
  is_correct: boolean | null
  manual_score?: number | null
  question?: string
  type?: string
  choices?: string[] | null
  correct_answer?: string
  explanation?: string | null
  order_index?: number
}

export type AnalysisFocus = 'overall' | 'strengths' | 'weaknesses' | 'study_plan' | 'misconceptions'
export type AnalysisLength = 'short' | 'medium' | 'detailed'
export type AnalysisTone = 'encouraging' | 'direct' | 'formal'
export type AnalysisLanguage = 'default' | 'english' | 'korean'
export type InPersonStage = 'name' | 'taking' | 'results'
