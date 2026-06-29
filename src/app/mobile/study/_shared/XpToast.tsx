"use client"

import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'

/**
 * XpToast — global floating chip that pops up whenever the user
 * earns XP. Listens for `study:xp` CustomEvent dispatched from API
 * call sites; renders a stack of fading "+N XP" chips bottom-right.
 *
 * Usage from anywhere in the app:
 *   window.dispatchEvent(new CustomEvent('study:xp', { detail: { xp: 10, label: 'Correct!' } }))
 *
 * Mount once at the study layout level — fire-and-forget callers.
 */

interface XpEvent {
  id: number
  xp: number
  label?: string
}

let nextId = 1

export function XpToast() {
  const [stack, setStack] = useState<XpEvent[]>([])

  useEffect(() => {
    const onAward = (e: Event) => {
      const detail = (e as CustomEvent).detail as { xp?: number; label?: string } | undefined
      if (!detail || typeof detail.xp !== 'number' || detail.xp <= 0) return
      const id = nextId++
      setStack(prev => [...prev, { id, xp: detail.xp!, label: detail.label }])
      // Auto-remove after the chip's exit animation finishes.
      setTimeout(() => {
        setStack(prev => prev.filter(e => e.id !== id))
      }, 2400)
    }
    window.addEventListener('study:xp', onAward)
    return () => window.removeEventListener('study:xp', onAward)
  }, [])

  if (stack.length === 0) return null

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed bottom-[88px] right-4 z-[80] flex flex-col-reverse gap-2"
    >
      {stack.map(evt => (
        <div
          key={evt.id}
          className="animate-xp-pop inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white text-[13px] font-bold tabular-nums shadow-[0_4px_12px_-2px_rgba(245,158,11,0.45)]"
        >
          <Sparkles className="w-3.5 h-3.5" />
          +{evt.xp} XP
          {evt.label && <span className="opacity-90 font-medium">· {evt.label}</span>}
        </div>
      ))}
    </div>
  )
}

/** Helper for caller sites — saves the boilerplate. */
export function emitXp(xp: number, label?: string): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('study:xp', { detail: { xp, label } }))
}
