"use client"

import Link from 'next/link'
import { Sparkles, Target, ArrowRight } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { useLandingData } from './LandingDataProvider'
import { getPathTemplate } from '@/lib/study-path'
import { PathMascot } from './_shared/PathMascot'

/**
 * Compact promo card that surfaces the new /mobile/study/path route
 * to students whose target_test has a hand-crafted path template.
 * Only shows for SAT / TOEFL until we add more templates — otherwise
 * it'd promote a page that shows an empty state.
 *
 * Deliberately sits inside the Today band, not a full-width banner,
 * so it doesn't add another top-of-fold surface — it's the "one
 * primary CTA" the research recommended, discoverable without
 * demanding attention.
 */

export function StudyPathPromo() {
  const { t, language } = useTranslation()
  const ko = language === 'korean'
  const landingData = useLandingData()
  const target = landingData?.prefs?.target_test ?? null
  const template = getPathTemplate(target)
  if (!template) return null

  return (
    <Link
      href="/mobile/study/path"
      className="relative overflow-hidden block rounded-2xl bg-gradient-to-br from-primary via-primary to-indigo-700 text-white shadow-[0_8px_24px_-12px_rgba(40,133,232,0.55)] hover:shadow-[0_12px_32px_-12px_rgba(40,133,232,0.65)] active:scale-[0.99] transition-all"
    >
      <div aria-hidden className="pointer-events-none absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/15 blur-2xl" />
      <div className="relative flex items-center gap-3 p-4">
        <div className="flex-shrink-0">
          <PathMascot state="idle" size={56} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="inline-flex items-center gap-1 rounded-full bg-white/20 backdrop-blur-sm px-2 py-0.5 mb-1.5">
            <Sparkles className="w-3 h-3" />
            <span className="text-[10px] font-bold tracking-[0.12em] uppercase">
              {ko ? '신규' : 'New'}
            </span>
          </div>
          <div className="text-[15px] font-bold leading-tight">
            {ko ? template.titleKo : template.titleEn}
          </div>
          <div className="text-[12px] text-white/85 leading-snug mt-0.5">
            {ko
              ? '한 걸음씩 목표에 다가가요 — 오늘 할 일이 정해져 있어요.'
              : 'One step at a time — today\'s next node is picked for you.'}
          </div>
        </div>
        <div className="flex-shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/25">
          <ArrowRight className="w-4 h-4" />
        </div>
      </div>
    </Link>
  )
}
