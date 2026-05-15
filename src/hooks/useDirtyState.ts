"use client"

import { useEffect, useRef } from 'react'

/**
 * Track whether a value has changed since a modal was opened.
 *
 * Snapshot strategy:
 *   - When `isOpen` flips false → true, snapshot `value` via JSON.stringify
 *     (handles deep equality for plain form-shaped objects).
 *   - While open, compare current `value` to the snapshot on every render.
 *   - When `isOpen` flips back to false, clear the snapshot so the next
 *     opening starts fresh.
 *
 * Returns `true` whenever the current value differs from the open-time
 * snapshot. Returns `false` when the modal is closed (no snapshot).
 *
 * Usage:
 *   const isOpen = ...
 *   const isDirty = useDirtyState(formData, isOpen)
 *   if (isDirty) await confirm({ ... })
 *
 * Caveats:
 *   - JSON.stringify can't capture function/Symbol/cyclic refs. Form data
 *     objects are pure JSON shapes in this codebase so this is fine; if
 *     you start tracking objects with non-serializable members, swap in a
 *     custom equality fn.
 *   - The snapshot is taken on the *first render where isOpen is true*,
 *     which is also when the parent has finished populating an edit
 *     record into formData. If your parent populates async after the
 *     modal mounts, gate isOpen on "data loaded" rather than letting the
 *     modal open with empty formData first.
 */
export function useDirtyState<T>(value: T, isOpen: boolean): boolean {
  const snapshotRef = useRef<string | null>(null)

  useEffect(() => {
    if (isOpen && snapshotRef.current === null) {
      try {
        snapshotRef.current = JSON.stringify(value)
      } catch {
        // Non-serializable input — bail out; isDirty will return false.
        snapshotRef.current = null
      }
    } else if (!isOpen && snapshotRef.current !== null) {
      snapshotRef.current = null
    }
    // We intentionally ignore `value` here — snapshot only on open transition.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  if (!isOpen || snapshotRef.current === null) return false
  try {
    return JSON.stringify(value) !== snapshotRef.current
  } catch {
    return false
  }
}
