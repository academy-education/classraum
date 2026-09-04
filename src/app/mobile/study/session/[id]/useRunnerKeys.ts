"use client"

import { useEffect } from "react"

/**
 * Keyboard control for the test runner.
 *
 * WHY IT CLICKS THE BUTTONS INSTEAD OF SETTING STATE.
 *
 * The obvious implementation is to call setAnswers from here. That would be a
 * SECOND writer for the same value, and every drift bug in this project has
 * that shape: two callers for one item produced four submission rows and two
 * different bands for one essay; a grade batch and a per-question loop both
 * fired; a repair script and a component each carried their own copy of the
 * chip-display rule and only one was tested. The runner's option buttons
 * already own selection — single-select, multi-select, and whatever is added
 * next — so this layer dispatches a click on the same element the mouse hits.
 * It cannot diverge, and it inherits every guard those handlers have.
 *
 * The cost is that the buttons must be findable, which is the
 * `data-runner-option` attribute. That is a deliberate, visible contract:
 * grep it and you see every element the keyboard can reach.
 *
 * Bindings (from the desktop plan, stage 1):
 *   1-9 / A-I   select the nth option
 *   Left/Right  previous / next question
 *   Enter       next question
 *   ?           toggle the shortcut hint bar
 *
 * Deliberately NOT bound: anything that submits or ends a section. A key that
 * ends a timed test by accident is worse than no keyboard at all.
 */

export type RunnerKeyOptions = {
  /** False while a modal, break screen or audio gate owns the screen. */
  enabled: boolean
  onPrev: () => void
  onNext: () => void
  onToggleHelp: () => void
}

/** Typing in a field must never be swallowed as a shortcut. */
function typingInAField(el: EventTarget | null): boolean {
  const node = el as HTMLElement | null
  if (!node || !node.tagName) return false
  const tag = node.tagName.toLowerCase()
  return tag === "input" || tag === "textarea" || tag === "select" || node.isContentEditable
}

export function useRunnerKeys({ enabled, onPrev, onNext, onToggleHelp }: RunnerKeyOptions) {
  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      // Never steal a browser or OS chord.
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (typingInAField(e.target)) return

      if (e.key === "?") { e.preventDefault(); onToggleHelp(); return }
      if (e.key === "ArrowLeft") { e.preventDefault(); onPrev(); return }
      if (e.key === "ArrowRight" || e.key === "Enter") { e.preventDefault(); onNext(); return }

      // 1-9, or a-i for the same slots. Options are read from the DOM at press
      // time, not captured, so a re-render between renders cannot stale them.
      const n = /^[1-9]$/.test(e.key)
        ? Number(e.key)
        : /^[a-i]$/i.test(e.key)
          ? e.key.toLowerCase().charCodeAt(0) - 96
          : 0
      if (!n) return
      const opts = document.querySelectorAll<HTMLButtonElement>("[data-runner-option]")
      const target = opts[n - 1]
      if (!target || target.disabled) return
      e.preventDefault()
      target.click()
      // Move focus with the selection so a screen reader follows, and so the
      // next Tab starts from where the student actually is.
      target.focus({ preventScroll: true })
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [enabled, onPrev, onNext, onToggleHelp])
}
