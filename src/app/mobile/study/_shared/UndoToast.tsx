"use client"

import { useEffect, useState } from 'react'
import { RotateCcw } from '@/app/mobile/study/_shared/icons'

/**
 * UndoToast — global bottom-center toast with an inline Undo button.
 *
 * Usage from anywhere:
 *   emitUndoable('Dismissed', () => bringItBack())
 *
 * The toast auto-dismisses after 5s; if the student taps Undo before
 * then, the onUndo callback fires and the toast closes. Only one
 * toast is shown at a time — a new emit replaces the pending one.
 * Mount <UndoToast /> once at the study layout level.
 */

interface UndoState {
  id: number
  label: string
  onUndo: () => void
}

let nextId = 1
const HOLD_MS = 5000

export function UndoToast() {
  const [current, setCurrent] = useState<UndoState | null>(null)

  useEffect(() => {
    const onEmit = (e: Event) => {
      const detail = (e as CustomEvent).detail as { label?: string; onUndo?: () => void } | undefined
      if (!detail || typeof detail.label !== 'string' || typeof detail.onUndo !== 'function') return
      const id = nextId++
      setCurrent({ id, label: detail.label, onUndo: detail.onUndo })
      setTimeout(() => {
        setCurrent(prev => (prev && prev.id === id ? null : prev))
      }, HOLD_MS)
    }
    window.addEventListener('study:undo', onEmit)
    return () => window.removeEventListener('study:undo', onEmit)
  }, [])

  if (!current) return null

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed left-1/2 -translate-x-1/2 bottom-[92px] z-[80] inline-flex items-center gap-3 pl-4 pr-1.5 py-1.5 rounded-full bg-gray-900 text-white text-[13px] shadow-[0_8px_24px_-8px_rgba(15,23,42,0.35)] animate-slide-up"
    >
      <span className="font-medium truncate max-w-[200px]">{current.label}</span>
      <button
        type="button"
        onClick={() => {
          current.onUndo()
          setCurrent(null)
        }}
        className="inline-flex items-center gap-1 h-8 px-3 rounded-full bg-white/15 hover:bg-white/25 text-white text-[12.5px] font-semibold transition"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        Undo
      </button>
    </div>
  )
}

export function emitUndoable(label: string, onUndo: () => void): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('study:undo', { detail: { label, onUndo } }))
}
