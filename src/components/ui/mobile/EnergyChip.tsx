"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Zap } from '@/app/mobile/study/_shared/icons'
import { authHeaders } from '@/lib/auth-headers'
import { useTranslation } from '@/hooks/useTranslation'

/**
 * Top-bar practice energy chip. Shows the student's current energy / cap on
 * study routes. Energy regenerates over time (free +1/8h → 3, paid +1/3h →
 * 10); the chip refetches when a refill is due (so the count ticks up on
 * its own) and when a set is started (the `study:energy` event fired by the
 * session screens after spending).
 */
interface EnergyState { paid: boolean; energy: number; cap: number; nextRefillSeconds: number; refillHours: number }

export function EnergyChip() {
  const pathname = usePathname()
  const isStudy = pathname?.startsWith('/mobile/study') ?? false
  const { language } = useTranslation()
  const ko = language === 'korean'
  const [state, setState] = useState<EnergyState | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/study/energy', { headers })
      if (!res.ok) return
      setState((await res.json()) as EnergyState)
    } catch { /* chip self-hides */ }
  }, [])

  // Fetch on study routes + whenever a set is started (energy spent).
  useEffect(() => {
    if (!isStudy) return
    void load()
    const onEnergy = () => void load()
    window.addEventListener('study:energy', onEnergy)
    return () => window.removeEventListener('study:energy', onEnergy)
  }, [isStudy, pathname, load])

  // Auto-refetch the moment the next +1 lands so the count climbs live.
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!isStudy || !state || state.energy >= state.cap || state.nextRefillSeconds <= 0) return
    timerRef.current = setTimeout(() => void load(), (state.nextRefillSeconds + 1) * 1000)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [isStudy, state, load])

  if (!isStudy || !state) return null

  const full = state.energy >= state.cap
  const low = state.energy === 0
  const title = full
    ? (ko ? '에너지 가득' : 'Energy full')
    : (ko ? `${state.refillHours}시간마다 +1 충전` : `Refills +1 every ${state.refillHours}h`)

  return (
    <span
      title={title}
      aria-label={ko ? `에너지 ${state.energy}/${state.cap}` : `Energy ${state.energy} of ${state.cap}`}
      className={`inline-flex items-center gap-1 h-9 px-2.5 rounded-full tabular-nums ${
        low ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-700'
      }`}
    >
      <Zap className={`w-4 h-4 ${low ? 'text-rose-500' : 'text-amber-500'}`} weight="fill" />
      <span className="text-[13px] font-bold leading-none">{state.energy}</span>
      <span className="text-[12px] font-medium opacity-70 leading-none">/{state.cap}</span>
    </span>
  )
}
