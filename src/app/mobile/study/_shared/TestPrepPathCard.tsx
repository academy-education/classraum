"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Sparkles, Target, ArrowRight } from '@/app/mobile/study/_shared/icons'
import { authHeaders } from '@/lib/auth-headers'
import { useTranslation } from '@/hooks/useTranslation'
import { getPathTemplate } from '@/lib/study-path'
import { PathMascot } from '../_shared/PathMascot'
import { StudyButton } from './StudyButton'

/**
 * Surfaces the mascot-led StudyPath on a test-prep topic page.
 *
 * Two states, gated on whether this test is the student's current goal
 * (target_test):
 *   • it IS their goal   → a "continue your path" card → /mobile/study/path
 *   • it is NOT their goal → a "make this your goal?" card that sets
 *     target_test, then drops them into the path.
 *
 * Self-hides for tests without a hand-crafted path template (only SAT /
 * TOEFL today) so it never promotes an empty path.
 */
export function TestPrepPathCard({ test }: { test: string }) {
  const { language } = useTranslation()
  const ko = language === 'korean'
  const router = useRouter()
  const template = getPathTemplate(test)
  const [target, setTarget] = useState<string | null | undefined>(undefined)
  const [setting, setSetting] = useState(false)

  useEffect(() => {
    if (!template) return
    let cancelled = false
    void (async () => {
      try {
        const headers = await authHeaders()
        const res = await fetch('/api/study/prefs', { headers })
        const json = res.ok ? await res.json() : null
        if (!cancelled) setTarget((json?.prefs?.target_test as string | null) ?? null)
      } catch {
        if (!cancelled) setTarget(null)
      }
    })()
    return () => { cancelled = true }
  }, [template])

  if (!template) return null
  if (target === undefined) return null // loading — avoid a flash

  const isGoal = (target ?? '').toUpperCase() === test.toUpperCase()
  const title = ko ? template.titleKo : template.titleEn

  // Already their goal → continue the path.
  if (isGoal) {
    return (
      <Link
        href="/mobile/study/path"
        className="relative overflow-hidden block rounded-2xl bg-gradient-to-br from-primary via-primary to-indigo-700 text-white shadow-[0_8px_24px_-12px_rgba(40,133,232,0.55)] hover:shadow-[0_12px_32px_-12px_rgba(40,133,232,0.65)] active:scale-[0.99] transition-all"
      >
        <div aria-hidden className="pointer-events-none absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/15 blur-2xl" />
        <div className="relative flex items-center gap-3 p-4">
          <div className="flex-shrink-0"><PathMascot state="idle" size={56} /></div>
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-1 rounded-full bg-white/20 backdrop-blur-sm px-2 py-0.5 mb-1.5">
              <Sparkles className="w-3 h-3" />
              <span className="text-[10px] font-bold tracking-[0.12em] uppercase">{ko ? '학습 경로' : 'Your path'}</span>
            </div>
            <div className="text-[15px] font-bold leading-tight">{title}</div>
            <div className="text-[12px] text-white/85 leading-snug mt-0.5">
              {ko ? '라우미가 오늘 할 일을 골라줘요 — 한 걸음씩.' : "Raumi picks today's next step — one at a time."}
            </div>
          </div>
          <div className="flex-shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/25">
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </Link>
    )
  }

  // Not their goal → offer to make it one.
  const makeGoal = async () => {
    if (setting) return
    setSetting(true)
    try {
      const headers = await authHeaders()
      await fetch('/api/study/prefs', {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_test: test.toLowerCase() }),
      })
      router.push('/mobile/study/path')
    } catch {
      setSetting(false)
    }
  }

  return (
    <div className="rounded-2xl bg-white ring-1 ring-gray-200/70 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-4">
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <Target className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-gray-900">
            {ko ? `${title.replace(' 학습 경로', '')}를 목표로 설정할까요?` : `Make this your goal?`}
          </p>
          <p className="text-[12.5px] text-gray-500 leading-snug mt-0.5">
            {ko
              ? '목표로 설정하면 라우미가 단계별 학습 경로를 안내하고, 예상 점수도 추적해 드려요.'
              : 'Set it as your goal and Raumi guides a step-by-step path — with your predicted score tracked along the way.'}
          </p>
        </div>
      </div>
      <StudyButton
        type="button"
        fullWidth
        loading={setting}
        onClick={() => void makeGoal()}
        leftIcon={<Target className="w-4 h-4" />}
        className="mt-3"
      >
        {ko ? '목표로 설정하고 시작하기' : 'Set as my goal & start the path'}
      </StudyButton>
    </div>
  )
}
