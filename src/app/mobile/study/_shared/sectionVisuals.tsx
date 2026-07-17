"use client"

import { BookOpen, Calculator, PenLine, Mic, Volume2, FileText } from '@/app/mobile/study/_shared/icons'

/**
 * Per-section icon + tint, keyed by topic slug — the single source of
 * the section identity system (topic-page dropdown, week-plan focus
 * rows, anywhere a section needs to read at a glance). Unknown slugs
 * fall back to a neutral doc tile.
 */
export const SECTION_VISUALS: Record<string, { icon: React.ComponentType<{ className?: string }>; tile: string; gradientTile: string }> = {
  'sat-reading-writing': { icon: BookOpen, tile: 'bg-sky-500/12 text-sky-600', gradientTile: 'bg-gradient-to-br from-sky-400 to-blue-500 text-white shadow-[0_4px_10px_-2px_rgba(56,189,248,0.35)]' },
  'sat-math': { icon: Calculator, tile: 'bg-violet-500/12 text-violet-600', gradientTile: 'bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-[0_4px_10px_-2px_rgba(139,92,246,0.35)]' },
  'toefl-reading': { icon: BookOpen, tile: 'bg-sky-500/12 text-sky-600', gradientTile: 'bg-gradient-to-br from-sky-400 to-blue-500 text-white shadow-[0_4px_10px_-2px_rgba(56,189,248,0.35)]' },
  'toefl-writing': { icon: PenLine, tile: 'bg-amber-500/12 text-amber-600', gradientTile: 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-[0_4px_10px_-2px_rgba(251,146,60,0.35)]' },
  'toefl-speaking': { icon: Mic, tile: 'bg-rose-500/12 text-rose-600', gradientTile: 'bg-gradient-to-br from-rose-400 to-pink-600 text-white shadow-[0_4px_10px_-2px_rgba(244,63,94,0.35)]' },
  'toefl-listening': { icon: Volume2, tile: 'bg-emerald-500/12 text-emerald-600', gradientTile: 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-[0_4px_10px_-2px_rgba(16,185,129,0.35)]' },
}

export function sectionVisual(slug: string) {
  return SECTION_VISUALS[slug] ?? { icon: FileText, tile: 'bg-gray-100 text-gray-500', gradientTile: 'bg-gradient-to-br from-gray-400 to-gray-500 text-white shadow-[0_4px_10px_-2px_rgba(107,114,128,0.35)]' }
}
