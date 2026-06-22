import { MessageCircle, ListChecks, BookOpen, Layers, FileText } from 'lucide-react'

/**
 * Study modes — single source of truth used by topic picker, session
 * router, history list, and recommended shelf.
 *
 * full_test is the most recent addition: a timed, no-mid-feedback
 * test-taking mode that's primarily useful for test_prep topics
 * (SAT, TOEFL, KSAT, etc.) but works on any topic with a generic
 * 30-min / 20-question fallback.
 */
export const STUDY_MODES = [
  { key: 'chat',       icon: MessageCircle, color: 'text-primary bg-primary/10' },
  { key: 'practice',   icon: ListChecks,    color: 'text-emerald-600 bg-emerald-50' },
  { key: 'lesson',     icon: BookOpen,      color: 'text-amber-600 bg-amber-50' },
  { key: 'flashcards', icon: Layers,        color: 'text-violet-600 bg-violet-50' },
  { key: 'full_test',  icon: FileText,      color: 'text-rose-600 bg-rose-50' },
] as const

export type StudyMode = typeof STUDY_MODES[number]['key']
