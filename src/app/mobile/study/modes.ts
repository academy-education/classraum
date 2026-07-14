import { ListChecks, BookOpen, Layers, FileText, Mic } from 'lucide-react'

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
  {
    key: 'practice',
    icon: ListChecks,
    color: 'text-emerald-600 bg-emerald-50',
    cardBg: 'bg-gradient-to-br from-emerald-50/60 via-white to-white',
    iconBg: 'bg-gradient-to-br from-emerald-400 to-teal-600',
    hoverRing: 'hover:ring-emerald-200',
    hoverShadow: 'hover:shadow-[0_2px_8px_-2px_rgba(16,185,129,0.18),0_16px_32px_-12px_rgba(16,185,129,0.25)]',
    hoverText: 'group-hover:text-emerald-700',
  },
  {
    key: 'lesson',
    icon: BookOpen,
    color: 'text-amber-600 bg-amber-50',
    cardBg: 'bg-gradient-to-br from-amber-50/70 via-white to-white',
    iconBg: 'bg-gradient-to-br from-amber-400 to-orange-500',
    hoverRing: 'hover:ring-amber-200',
    hoverShadow: 'hover:shadow-[0_2px_8px_-2px_rgba(245,158,11,0.20),0_16px_32px_-12px_rgba(245,158,11,0.26)]',
    hoverText: 'group-hover:text-amber-700',
  },
  {
    key: 'flashcards',
    icon: Layers,
    color: 'text-violet-600 bg-violet-50',
    cardBg: 'bg-gradient-to-br from-violet-50/60 via-white to-white',
    iconBg: 'bg-gradient-to-br from-violet-400 to-purple-600',
    hoverRing: 'hover:ring-violet-200',
    hoverShadow: 'hover:shadow-[0_2px_8px_-2px_rgba(139,92,246,0.18),0_16px_32px_-12px_rgba(139,92,246,0.25)]',
    hoverText: 'group-hover:text-violet-700',
  },
  {
    key: 'response',
    icon: Mic,
    color: 'text-indigo-600 bg-indigo-50',
    cardBg: 'bg-gradient-to-br from-indigo-50/70 via-white to-white',
    iconBg: 'bg-gradient-to-br from-indigo-400 to-blue-600',
    hoverRing: 'hover:ring-indigo-200',
    hoverShadow: 'hover:shadow-[0_2px_8px_-2px_rgba(99,102,241,0.20),0_16px_32px_-12px_rgba(99,102,241,0.26)]',
    hoverText: 'group-hover:text-indigo-700',
  },
  {
    key: 'full_test',
    icon: FileText,
    color: 'text-rose-600 bg-rose-50',
    cardBg: 'bg-gradient-to-br from-rose-50/70 via-white to-white',
    iconBg: 'bg-gradient-to-br from-rose-500 to-red-600',
    hoverRing: 'hover:ring-rose-200',
    hoverShadow: 'hover:shadow-[0_2px_8px_-2px_rgba(244,63,94,0.20),0_16px_32px_-12px_rgba(244,63,94,0.26)]',
    hoverText: 'group-hover:text-rose-700',
  },
] as const

export type StudyMode = typeof STUDY_MODES[number]['key']
