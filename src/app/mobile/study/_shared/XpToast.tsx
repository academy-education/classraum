"use client"

import { useEffect, useState } from 'react'
import { Sparkles, Trophy } from 'lucide-react'
import { hapticImpact, hapticNotification, hapticTap } from '@/lib/nativeHaptics'
import { PathMascot } from './PathMascot'

/**
 * XpToast — global floating chip that pops up whenever the user
 * earns XP. Listens for `study:xp` CustomEvent dispatched from API
 * call sites; renders a stack of fading chips bottom-right.
 *
 * Now with tiered celebrations (Duolingo-inspired):
 *   'subtle' — single correct answer, quick +N chip, light haptic
 *   'mid'    — session/lesson complete, larger amber chip w/ short
 *              confetti burst, medium haptic
 *   'big'    — perfect session, streak milestone, level-up: gradient
 *              banner across the top of the toast area, mini confetti
 *              rain, success notification haptic
 *
 * Callers use `emitXp(xp, label, tier)`. Missing tier defaults to
 * 'subtle' so existing call sites keep working; add a tier when you
 * know the moment deserves more weight.
 *
 * Streak-milestone auto-tiering: emitXp caller sites don't need to
 * know the milestone list. `emitStreakXp(xp, streak)` picks the
 * right tier based on the streak count (2/3/7/14/30/50/100).
 *
 * Mount once at the study layout level — fire-and-forget callers.
 */

export type XpTier = 'subtle' | 'mid' | 'big'

interface XpEvent {
  id: number
  xp: number
  label?: string
  tier: XpTier
}

let nextId = 1

const STREAK_MILESTONES = new Set([2, 3, 7, 14, 30, 50, 100, 200, 365])

function tierFromEvent(detail: { xp: number; tier?: XpTier }): XpTier {
  if (detail.tier) return detail.tier
  // Backwards-compat: infer tier from XP magnitude if caller didn't
  // specify. Keeps every existing emitXp call working with sensible
  // defaults — 25+ XP is meaningful enough to justify a mid animation.
  if (detail.xp >= 50) return 'big'
  if (detail.xp >= 25) return 'mid'
  return 'subtle'
}

function fireHapticForTier(tier: XpTier): void {
  if (tier === 'big') hapticNotification('success')
  else if (tier === 'mid') hapticImpact('medium')
  else hapticTap()
}

export function XpToast() {
  const [stack, setStack] = useState<XpEvent[]>([])
  const [confettiKey, setConfettiKey] = useState(0)
  const [bigBanner, setBigBanner] = useState<XpEvent | null>(null)

  useEffect(() => {
    const onAward = (e: Event) => {
      const detail = (e as CustomEvent).detail as { xp?: number; label?: string; tier?: XpTier } | undefined
      if (!detail || typeof detail.xp !== 'number' || detail.xp <= 0) return
      const tier = tierFromEvent({ xp: detail.xp, tier: detail.tier })
      const id = nextId++
      const evt: XpEvent = { id, xp: detail.xp, label: detail.label, tier }
      setStack(prev => [...prev, evt])
      fireHapticForTier(tier)

      if (tier === 'big') {
        setBigBanner(evt)
        setConfettiKey(k => k + 1)
        setTimeout(() => setBigBanner(null), 3200)
      } else if (tier === 'mid') {
        setConfettiKey(k => k + 1)
      }

      const dwell = tier === 'big' ? 3200 : tier === 'mid' ? 2800 : 2400
      setTimeout(() => {
        setStack(prev => prev.filter(e => e.id !== id))
      }, dwell)
    }
    window.addEventListener('study:xp', onAward)
    return () => window.removeEventListener('study:xp', onAward)
  }, [])

  return (
    <>
      {stack.length > 0 && (
        <div
          aria-live="polite"
          aria-atomic="true"
          className="pointer-events-none fixed bottom-[88px] right-4 z-[80] flex flex-col-reverse gap-2"
        >
          {stack.map(evt => (
            <XpChip key={evt.id} evt={evt} />
          ))}
        </div>
      )}
      {bigBanner && <BigBanner evt={bigBanner} />}
      {confettiKey > 0 && (
        <ConfettiBurst
          key={confettiKey}
          intensity={bigBanner ? 'big' : 'mid'}
        />
      )}
    </>
  )
}

function XpChip({ evt }: { evt: XpEvent }) {
  const gradient =
    evt.tier === 'big' ? 'from-amber-300 via-orange-500 to-rose-500' :
    evt.tier === 'mid' ? 'from-amber-400 to-orange-500' :
    'from-amber-400 to-orange-500'
  const size =
    evt.tier === 'big' ? 'px-4 py-2 text-[15px]' :
    evt.tier === 'mid' ? 'px-3.5 py-1.5 text-[14px]' :
    'px-3 py-1.5 text-[13px]'
  const shadow =
    evt.tier === 'big' ? 'shadow-[0_10px_28px_-6px_rgba(245,158,11,0.55)] ring-1 ring-white/25' :
    'shadow-[0_4px_12px_-2px_rgba(245,158,11,0.45)]'
  const Icon = evt.tier === 'big' ? Trophy : Sparkles
  return (
    <div
      className={`animate-xp-pop inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br ${gradient} text-white font-bold tabular-nums ${size} ${shadow}`}
    >
      <Icon className={evt.tier === 'big' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
      +{evt.xp} XP
      {evt.label && <span className="opacity-90 font-medium">· {evt.label}</span>}
    </div>
  )
}

/** Full-width top banner for big-tier celebrations (streak milestones,
 *  perfect sessions, level-ups). Slides down, sits for ~2.5s, slides
 *  back up. Non-blocking — the app stays interactive. */
function BigBanner({ evt }: { evt: XpEvent }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-3 top-3 z-[81] mx-auto max-w-md"
    >
      <div className="animate-big-banner rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-white shadow-[0_18px_38px_-10px_rgba(0,0,0,0.35)] ring-1 ring-white/20 overflow-hidden">
        <div className="relative px-4 py-3 flex items-center gap-3">
          <div aria-hidden className="pointer-events-none absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/25 blur-2xl" />
          <div className="relative flex-shrink-0">
            <PathMascot state="celebrate" size={48} />
          </div>
          <div className="relative flex-1 min-w-0">
            <div className="text-[11px] font-bold tracking-[0.14em] uppercase opacity-90">
              +{evt.xp} XP
            </div>
            <div className="text-[15px] font-bold leading-tight truncate">
              {evt.label ?? 'Milestone!'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Lightweight confetti reused from DailyGoalCelebration but scaled
 *  by intensity so a lesson-complete doesn't feel like a birthday. */
function ConfettiBurst({ intensity }: { intensity: 'mid' | 'big' }) {
  const count = intensity === 'big' ? 32 : 14
  const dots = Array.from({ length: count }, (_, i) => i)
  const colors = ['#F59E0B', '#EF4444', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899']
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[79] overflow-hidden">
      {dots.map(i => {
        const left = (i * 137.5) % 100
        const delay = (i % 6) * 60
        const dur = 1200 + (i % 5) * 180
        return (
          <span
            key={i}
            style={{
              left: `${left}%`,
              top: '-20px',
              backgroundColor: colors[i % colors.length],
              animationDelay: `${delay}ms`,
              animationDuration: `${dur}ms`,
            }}
            className="absolute w-2 h-2 rounded-sm animate-confetti-fall"
          />
        )
      })}
    </div>
  )
}

/** Fire-and-forget XP award. Tier omitted → auto-inferred from XP magnitude. */
export function emitXp(xp: number, label?: string, tier?: XpTier): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('study:xp', { detail: { xp, label, tier } }))
}

/** Streak-milestone-aware helper — picks the tier based on the day
 *  count so caller sites don't have to duplicate the milestone list.
 *  Non-milestone streaks fall through to 'subtle'. */
export function emitStreakXp(xp: number, streakDays: number, label?: string): void {
  const tier: XpTier = STREAK_MILESTONES.has(streakDays) ? 'big' : 'subtle'
  emitXp(xp, label ?? `${streakDays}-day streak`, tier)
}
