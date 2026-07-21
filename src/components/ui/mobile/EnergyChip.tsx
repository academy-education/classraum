"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Zap } from '@/app/mobile/study/_shared/icons'
import { authHeaders } from '@/lib/auth-headers'
import { useTranslation } from '@/hooks/useTranslation'

/**
 * Top-bar practice energy chip. Shows the student's current energy / cap on
 * study routes. Energy regenerates over time (free +1/8h → 3, paid +1/3h →
 * 8); the chip refetches when a refill is due (so the count ticks up on its
 * own) and when a set is started (the `study:energy` event fired by the
 * session screens after spending). Tapping it opens a small popover with the
 * live countdown to the next +1.
 */
interface EnergyState { paid: boolean; energy: number; cap: number; nextRefillSeconds: number; refillHours: number }

function fmt(sec: number, ko: boolean): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return ko ? `${h}시간 ${m}분` : `${h}h ${m}m`
  if (m > 0) return ko ? `${m}분 ${s}초` : `${m}m ${s}s`
  return ko ? `${s}초` : `${s}s`
}

export function EnergyChip() {
  const pathname = usePathname()
  const isStudy = pathname?.startsWith('/mobile/study') ?? false
  const { language } = useTranslation()
  const ko = language === 'korean'
  const [state, setState] = useState<EnergyState | null>(null)
  const [open, setOpen] = useState(false)
  const [remaining, setRemaining] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/study/energy', { headers })
      if (!res.ok) return
      const json = (await res.json()) as EnergyState
      setState(json)
      setRemaining(json.nextRefillSeconds)
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

  // Tick the popover countdown once per second while it's open.
  useEffect(() => {
    if (!open || !state || state.energy >= state.cap) return
    const id = setInterval(() => setRemaining(r => Math.max(0, r - 1)), 1000)
    return () => clearInterval(id)
  }, [open, state])

  if (!isStudy || !state) return null

  const full = state.energy >= state.cap
  const low = state.energy === 0

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label={ko ? `에너지 ${state.energy}/${state.cap}` : `Energy ${state.energy} of ${state.cap}`}
        className={`inline-flex items-center gap-1 h-9 px-2.5 rounded-full transition-colors ${
          low ? 'bg-rose-50 active:bg-rose-100' : 'bg-amber-50 active:bg-amber-100'
        }`}
      >
        <Zap className={`w-4 h-4 ${low ? 'text-rose-500' : 'text-amber-500'}`} weight="fill" />
        <span className={`inline-flex items-baseline tabular-nums ${low ? 'text-rose-600' : 'text-amber-700'}`}>
          <span className="text-[13px] font-bold leading-none">{state.energy}</span>
          <span className="text-[12px] font-medium opacity-70 leading-none">/{state.cap}</span>
        </span>
      </button>

      {open && (
        <>
          {/* Outside-click catcher. */}
          <div className="fixed inset-0 z-[59]" onClick={() => setOpen(false)} aria-hidden />
          <div
            role="dialog"
            className="absolute right-0 top-[calc(100%+8px)] z-[60] w-56 rounded-2xl bg-white ring-1 ring-gray-200/80 shadow-[0_8px_24px_rgba(0,0,0,0.12)] p-3.5"
          >
            <div className="flex items-center gap-2">
              <span className={`w-8 h-8 rounded-xl flex items-center justify-center ${low ? 'bg-rose-50' : 'bg-amber-50'}`}>
                <Zap className={`w-4 h-4 ${low ? 'text-rose-500' : 'text-amber-500'}`} weight="fill" />
              </span>
              <div className="leading-tight">
                <div className="text-[14px] font-bold text-gray-900 tabular-nums">
                  {state.energy}<span className="text-gray-400 font-medium">/{state.cap}</span> {ko ? '에너지' : 'energy'}
                </div>
                <div className="text-[11.5px] text-gray-500">{ko ? '연습·플래시카드에 사용' : 'For practice & flashcards'}</div>
              </div>
            </div>
            <div className="mt-3 rounded-xl bg-gray-50 px-3 py-2.5">
              {full ? (
                <p className="text-[12.5px] font-medium text-emerald-600">{ko ? '에너지가 가득 찼어요' : 'Energy is full'}</p>
              ) : (
                <>
                  <p className="text-[11px] uppercase tracking-[0.08em] text-gray-400 font-semibold">{ko ? '다음 에너지까지' : 'Next energy in'}</p>
                  <p className="mt-0.5 text-[15px] font-bold text-gray-900 tabular-nums">{fmt(remaining, ko)}</p>
                  <p className="mt-0.5 text-[11.5px] text-gray-400">{ko ? `${state.refillHours}시간마다 +1` : `+1 every ${state.refillHours}h`}</p>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
