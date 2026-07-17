"use client"

import { BookOpen, Calculator, PenLine, Mic, Volume2, FileText } from '@/app/mobile/study/_shared/icons'

/**
 * Per-section icon + tint, keyed by topic slug — the single source of
 * the section identity system (topic-page dropdown, week-plan focus
 * rows, anywhere a section needs to read at a glance). Unknown slugs
 * fall back to a neutral doc tile.
 */
export const SECTION_VISUALS: Record<string, { icon: React.ComponentType<{ className?: string }>; tile: string }> = {
  'sat-reading-writing': { icon: BookOpen, tile: 'bg-sky-500/12 text-sky-600' },
  'sat-math': { icon: Calculator, tile: 'bg-violet-500/12 text-violet-600' },
  'toefl-reading': { icon: BookOpen, tile: 'bg-sky-500/12 text-sky-600' },
  'toefl-writing': { icon: PenLine, tile: 'bg-amber-500/12 text-amber-600' },
  'toefl-speaking': { icon: Mic, tile: 'bg-rose-500/12 text-rose-600' },
  'toefl-listening': { icon: Volume2, tile: 'bg-emerald-500/12 text-emerald-600' },
}

export function sectionVisual(slug: string) {
  return SECTION_VISUALS[slug] ?? { icon: FileText, tile: 'bg-gray-100 text-gray-500' }
}
