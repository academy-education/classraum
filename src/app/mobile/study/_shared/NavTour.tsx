"use client"

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { BookOpen, Camera, Shuffle, Trophy, X, ChevronRight, ChevronLeft } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { authHeaders } from '@/lib/auth-headers'

/**
 * First-visit walkthrough for the 5 study-mode bottom-nav tabs.
 *
 * Shows once per ACCOUNT: dismissal (X, "Don't show again", or
 * finishing) persists `nav_tour_seen_at` via /api/study/prefs, so it
 * never re-shows on a new device or origin. localStorage is kept as a
 * fast local cache so returning visitors don't pay a prefs round-trip
 * (and as the offline fallback if the PUT fails).
 *
 * Four steps — Snap / Review / League / Wrong-Answer Notebook (the
 * Study tab itself is the current screen so we skip introducing it).
 */

const STORAGE_KEY = 'study-nav-tour-seen-v1'

interface Step {
  icon: typeof BookOpen
  iconBg: string
  titleKo: string
  titleEn: string
  bodyKo: string
  bodyEn: string
}

const STEPS: Step[] = [
  {
    icon: Camera,
    iconBg: 'from-amber-400 to-orange-600',
    titleKo: '사진으로 풀기', titleEn: 'Snap to solve',
    bodyKo: '풀리지 않는 문제를 사진 한 장으로 — 단계별 풀이가 즉시 나옵니다.',
    bodyEn: 'Stuck? Snap a photo and get a step-by-step solution in seconds.',
  },
  {
    icon: Shuffle,
    iconBg: 'from-violet-400 to-purple-600',
    titleKo: '오늘의 복습', titleEn: 'Daily review',
    bodyKo: '간격 반복 일정에 따라 매일 복습할 카드를 자동으로 만들어드려요.',
    bodyEn: 'Spaced-repetition queue: fresh cards picked when forgetting is most likely.',
  },
  {
    icon: Trophy,
    iconBg: 'from-amber-500 to-orange-600',
    titleKo: '주간 리그', titleEn: 'Weekly league',
    bodyKo: '문제를 풀면 XP가 쌓이고, 매주 일요일에 순위가 정해집니다.',
    bodyEn: 'Earn XP as you study; cohorts reset every Sunday — promote up or drop down.',
  },
  {
    icon: BookOpen,
    iconBg: 'from-rose-500 to-red-600',
    titleKo: '오답노트', titleEn: 'Wrong-answer notebook',
    bodyKo: '틀린 문제와 사진 풀이를 한곳에 모아 복습하고 PDF로 인쇄하세요.',
    bodyEn: 'All your wrong answers + bookmarked snaps in one notebook — print as PDF.',
  },
]

export function NavTour() {
  const pathname = usePathname() ?? ''
  const { language } = useTranslation()
  const ko = language === 'korean'
  const [step, setStep] = useState(0)
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (pathname !== '/mobile/study') return
    if (typeof window === 'undefined') return
    // Fast path: this device already knows the tour was dismissed.
    if (localStorage.getItem(STORAGE_KEY) === '1') return

    // Slow path: ask the account. A student who dismissed on another
    // device (or before a storage wipe) should never see it again.
    let cancelled = false
    let timer: number | null = null
    void (async () => {
      try {
        const headers = await authHeaders()
        const res = await fetch('/api/study/prefs', { headers })
        if (cancelled) return
        if (res.ok) {
          const json = await res.json() as { prefs?: { nav_tour_seen_at?: string | null } }
          if (json.prefs?.nav_tour_seen_at) {
            // Backfill the local cache and stay hidden.
            localStorage.setItem(STORAGE_KEY, '1')
            return
          }
        }
        // Genuinely unseen (or prefs unreachable — first visit wins).
        timer = window.setTimeout(() => { if (!cancelled) setActive(true) }, 600)
      } catch {
        // Prefs unreachable: fall back to showing (worst case a repeat
        // view), matching the old localStorage-only behaviour.
        timer = window.setTimeout(() => { if (!cancelled) setActive(true) }, 600)
      }
    })()
    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  }, [pathname])

  if (!active) return null

  const s = STEPS[step]
  const Icon = s.icon
  const finish = () => {
    // Hide immediately; persist locally AND on the account so the
    // dismissal survives new devices, new origins, and cache wipes.
    localStorage.setItem(STORAGE_KEY, '1')
    setActive(false)
    void (async () => {
      try {
        const headers = await authHeaders()
        await fetch('/api/study/prefs', {
          method: 'PUT',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ nav_tour_seen_at: new Date().toISOString() }),
        })
      } catch { /* localStorage still suppresses on this device */ }
    })()
  }

  return (
    <>
      <div onClick={finish}
        className="fixed inset-0 z-[105] bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" />
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-x-4 bottom-[96px] z-[106] mx-auto max-w-sm rounded-2xl bg-white shadow-[0_24px_48px_-12px_rgba(0,0,0,0.45)] animate-in slide-in-from-bottom-4 fade-in duration-300 overflow-hidden"
      >
        <button type="button" onClick={finish}
          aria-label="close"
          className="absolute top-3 right-3 w-8 h-8 rounded-full text-gray-500 hover:bg-gray-100 inline-flex items-center justify-center transition">
          <X className="w-4 h-4" />
        </button>
        <div className="p-5">
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.iconBg} text-white flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_4px_8px_rgba(0,0,0,0.10)] mb-3`}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="text-[11px] font-bold tracking-[0.14em] uppercase text-gray-500 mb-1">
            {ko ? `${step + 1} / ${STEPS.length}` : `Step ${step + 1} of ${STEPS.length}`}
          </div>
          <h2 className="text-[18px] font-semibold tracking-tight text-gray-900">
            {ko ? s.titleKo : s.titleEn}
          </h2>
          <p className="text-[13px] text-gray-600 leading-relaxed mt-2">
            {ko ? s.bodyKo : s.bodyEn}
          </p>
          <div className="flex items-center justify-center gap-1.5 mt-4">
            {STEPS.map((_, i) => (
              <div key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? 'w-6 bg-primary' : 'w-1.5 bg-gray-300'
                }`}
              />
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            {step > 0 ? (
              <button type="button" onClick={() => setStep(step - 1)}
                className="flex-1 h-11 rounded-xl bg-white ring-1 ring-gray-200 text-gray-700 text-[13px] font-semibold inline-flex items-center justify-center gap-1 hover:bg-gray-50 transition">
                <ChevronLeft className="w-3.5 h-3.5" />{ko ? '이전' : 'Back'}
              </button>
            ) : (
              <button type="button" onClick={finish}
                className="flex-1 h-11 rounded-xl bg-white ring-1 ring-gray-200 text-gray-500 text-[13px] font-medium hover:bg-gray-50 transition">
                {/* Honest label: dismissal is permanent (account-level),
                    so say so — "Skip/later" implied it would come back. */}
                {ko ? '다시 보지 않기' : "Don't show again"}
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button type="button" onClick={() => setStep(step + 1)}
                className="flex-[1.4] h-11 rounded-xl bg-gradient-to-b from-primary to-primary/90 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_8px_rgba(40,133,232,0.28)] text-[13px] font-semibold inline-flex items-center justify-center gap-1 hover:opacity-95 transition">
                {ko ? '다음' : 'Next'}<ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button type="button" onClick={finish}
                className="flex-[1.4] h-11 rounded-xl bg-gradient-to-br from-primary to-indigo-600 text-white text-[13px] font-semibold hover:opacity-95 transition">
                {ko ? '시작하기' : "Let's go"}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
