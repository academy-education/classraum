"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

/**
 * useStudyErrorToast — tiny transient error toast for the study module.
 *
 * Exists because every session-creator ("Start" buttons on the landing,
 * topic page, shelves, builder, snap) used to fail SILENTLY: the button
 * just re-enabled and looked dead. Render `errorToast` once at the page
 * root and call `showError(message)` from any failure branch.
 *
 * Positioning clears the bottom tab bar (bottom-24); auto-dismisses
 * after ~3s; re-showing resets the timer.
 */
export function useStudyErrorToast(): {
  errorToast: ReactNode
  showError: (message: string) => void
} {
  const [msg, setMsg] = useState<string | null>(null)
  const timer = useRef<number | null>(null)

  const showError = useCallback((message: string) => {
    setMsg(message)
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setMsg(null), 3200)
  }, [])

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current)
  }, [])

  const errorToast = msg ? (
    <div
      role="alert"
      className="fixed left-1/2 -translate-x-1/2 bottom-24 z-[70] flex items-center gap-2 max-w-[calc(100vw-40px)] px-4 py-2.5 rounded-2xl bg-gray-900 text-white text-[13px] font-medium shadow-[0_10px_30px_-8px_rgba(0,0,0,0.35)] animate-fade-in-up"
    >
      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
      <span className="truncate">{msg}</span>
    </div>
  ) : null

  return { errorToast, showError }
}

/** Standard bilingual "couldn't start" message for session creators. */
export function startFailedMessage(ko: boolean): string {
  return ko ? '시작하지 못했어요. 다시 시도해 주세요.' : "Couldn't start — please try again."
}

/** Standard bilingual "couldn't save" message for background writes. */
export function saveFailedMessage(ko: boolean): string {
  return ko ? '저장하지 못했어요. 네트워크를 확인해 주세요.' : "Couldn't save — check your connection."
}
