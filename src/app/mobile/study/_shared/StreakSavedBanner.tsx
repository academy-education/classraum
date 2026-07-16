"use client"

import { useEffect, useState } from 'react'
import { Snowflake } from '@/app/mobile/study/_shared/icons'
import { useTranslation } from '@/hooks/useTranslation'
import { useLandingData } from '../LandingDataProvider'
import { StudyTodayCard } from './primitives'
import { emitUndoable } from './UndoToast'

/**
 * StreakSavedBanner — the positive counterpart to StreakAtRiskBanner.
 * Shows when a streak freeze is currently holding the streak: the student
 * missed a day, but a freeze auto-protected it, so the chain is intact.
 *
 * Reads streakSaved off the bundled landing payload (evaluated + persisted
 * server-side by evaluateStreak). Channels into "study today to keep it" so
 * the freeze buys a real second chance rather than a free skip.
 *
 * Self-dismissable for the session.
 */

const DISMISS_KEY = 'streak-saved-dismissed'

export function StreakSavedBanner() {
  const { language } = useTranslation()
  const ko = language === 'korean'
  const landingData = useLandingData()
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1')
  }, [])

  if (dismissed || !landingData?.streakSaved) return null
  const streak = landingData.streak ?? 0
  if (streak < 1) return null

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
    emitUndoable(
      ko ? '알림 숨김' : 'Notice dismissed',
      () => {
        sessionStorage.removeItem(DISMISS_KEY)
        setDismissed(false)
      },
    )
  }

  return (
    <StudyTodayCard
      href="/mobile/study/review"
      icon={Snowflake}
      iconColorClass="bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-[0_4px_10px_-2px_rgba(56,189,248,0.35)]"
      eyebrow={ko ? '스트릭 프리즈 사용' : 'Streak freeze used'}
      title={ko
        ? `${streak}일 연속 기록을 지켰어요`
        : `Your ${streak}-day streak is safe`}
      subtitle={ko
        ? '어제 학습을 놓쳤지만 프리즈가 막아줬어요. 오늘 한 문제로 이어가세요!'
        : 'You missed a day, but a freeze caught it. Do one card today to keep going!'}
      onDismiss={dismiss}
    />
  )
}
