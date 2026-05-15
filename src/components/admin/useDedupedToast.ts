'use client'

import { useCallback, useRef } from 'react'
import { useToast, type ToastProps } from '@/hooks/use-toast'

/**
 * useDedupedToast — wraps `useToast` so identical toasts fired in rapid
 * succession only render once.
 *
 *   const { toast } = useDedupedToast()
 *   toast({ title: 'Saved', variant: 'success' })  // shows
 *   toast({ title: 'Saved', variant: 'success' })  // suppressed
 *   // …after `windowMs`…
 *   toast({ title: 'Saved', variant: 'success' })  // shows again
 *
 * Why: admin pages often kick off the same operation from multiple places
 * (a row action and a bulk action; a polling refresh and a manual refresh)
 * and a toast burst is annoying / drowns out other feedback. Dedup is keyed
 * by (variant, title, description) so genuinely-different events still pass.
 *
 * @param windowMs Suppression window in ms. Defaults to 1500 — long enough
 *                 to absorb double-click style bursts, short enough that a
 *                 deliberate retry still surfaces.
 */
export function useDedupedToast(windowMs = 1500) {
  const { toast: rawToast } = useToast()
  const lastByKey = useRef<Map<string, number>>(new Map())

  const toast = useCallback((props: ToastProps) => {
    const key = `${props.variant ?? 'default'}|${props.title ?? ''}|${props.description ?? ''}`
    const now = Date.now()
    const previous = lastByKey.current.get(key) ?? 0
    if (now - previous < windowMs) return  // suppressed
    lastByKey.current.set(key, now)
    rawToast(props)
  }, [rawToast, windowMs])

  return { toast }
}
