import { MessageCircle, ListChecks, BookOpen, Layers } from 'lucide-react'

/**
 * The four study modes. Single source of truth — Phase 2's
 * mode-picker on the per-topic page consumes the same list.
 */
export const STUDY_MODES = [
  { key: 'chat',       icon: MessageCircle, color: 'text-primary bg-primary/10' },
  { key: 'practice',   icon: ListChecks,    color: 'text-emerald-600 bg-emerald-50' },
  { key: 'lesson',     icon: BookOpen,      color: 'text-amber-600 bg-amber-50' },
  { key: 'flashcards', icon: Layers,        color: 'text-violet-600 bg-violet-50' },
] as const

export type StudyMode = typeof STUDY_MODES[number]['key']
