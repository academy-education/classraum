export interface Question {
  passage?: string | null
  passageGroupId?: string | null
  prompt: string
  /** See generator route schema for full type docs. */
  type: 'multiple_choice' | 'numeric_entry' | 'multi_select' | 'three_choice' | 'quant_comparison'
    | 'fill_in_blanks' | 'arrange_words' | 'speaking_repeat' | 'speaking_interview'
    | 'writing_email' | 'writing_discussion'
  choices: string[]
  correct_answer: string
  correct_answers?: string[]
  acceptable_answers?: string[]
  /** TOEFL Complete-the-Words: per-blank correct fragment, ordered by id. */
  blanks?: { id: number; answer: string; alternates?: string[] }[]
  difficulty: 'easy' | 'medium' | 'hard'
  explanation: string
  distractor_rationales?: { choice: string; reason: string }[]
  graphic?: QuestionGraphic | null
}

export interface QuestionGraphic {
  type?: string | null
  xLabel?: string | null
  yLabel?: string | null
  points?: unknown[] | null
  series?: unknown[] | null
  bestFit?: unknown
  bars?: unknown[] | null
  values?: unknown[] | null
  rowLabels?: string[] | null
  colLabels?: string[] | null
  cells?: unknown[][] | null
  shape?: string | null
  spec?: unknown
  labels?: unknown
  svg?: string | null
  caption?: string | null
}

export interface TestPayload {
  title: string
  timeLimitMinutes: number
  section: string | null
  /** Test family used to pick label style for choice buttons —
   *  KSAT renders ①②③④⑤; everything else renders A B C D (E). */
  family?: string | null
  questions: Question[]
  /** TOEFL adaptive-module boundary. Index of the FIRST question in
   *  Module 2. Undefined for non-modular sections; server computes this
   *  post-pipeline so the UI knows exactly where M2 starts (Module 1
   *  and Module 2 may be different sizes — e.g. Listening ships 8 CaR
   *  in M1 and 3 in M2, so the boundary is NOT the midpoint). */
  moduleBreakIdx?: number
  /** SAT bank two-module adaptive test. Module 1 is served first; the
   *  routed Module 2 is appended by /api/study/test/route after the
   *  student finishes Module 1. */
  adaptive?: boolean
  sectionKey?: 'reading_writing' | 'math'
  totalModules?: number
  /** Adaptive tests are timed PER MODULE, not across the whole test.
   *  Each module gets its own countdown of this many minutes. */
  perModuleMinutes?: number
}

export interface SubmitResult {
  totalQuestions: number
  correctCount: number
  scorePercent: number
  /** Path-weighted SAT section score (adaptive sessions only). */
  sat?: { score: number; route: 'easy' | 'hard'; capped: boolean } | null
  /** ungraded = open-response item (interview / email / discussion):
   *  rubric-graded in review, excluded from the auto-score. */
  verdicts: { index: number; correct: boolean; correctAnswer: string; ungraded?: boolean }[]
}

/** Speech signals extracted from the audio by Whisper's verbose_json
 *  output. Used to inform the "delivery" criterion in the speaking
 *  rubric grade — a fluent 45-sec response with normal WPM and low
 *  pause count scores higher than a halting one, without needing an
 *  audio-native LLM. */
export type SpeechSignals = {
  audioPath?: string
  durationSec?: number | null
  wpm?: number | null
  pauseCount?: number | null
  clarity?: number | null
}

export type RubricGrade = {
  overallBand: number
  summary: string
  modelRewrite: string
  criteria: Array<{ key: string; score: number; evidence: string }>
}
export type GradeResponse = { grade: RubricGrade; scaleMax: number }
