'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

/**
 * useUrlState — small hook that mirrors a string state value to a URL
 * search param. The result behaves like `useState<string>` but persists
 * the value across page refreshes and back/forward navigation, and the
 * URL is shareable.
 *
 *   const [status, setStatus] = useUrlState('status', 'all')
 *
 * Behavior:
 * - Initial value comes from the URL if present, otherwise `defaultValue`.
 * - Setting to `defaultValue` removes the param from the URL (keeps URLs
 *   clean — `?status=all` is just noise).
 * - Uses `replace`, not `push` — filter changes shouldn't pollute history.
 * - Survives parent re-renders; identity-stable setter via useCallback.
 */
export function useUrlState(key: string, defaultValue: string = ''): [string, (next: string) => void] {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Hydrate from the URL on mount, fall back to defaultValue. We keep a
  // local state copy so React renders are driven by the value, not by a
  // searchParams subscription that might lag a frame.
  const [value, setValueState] = useState<string>(() => {
    const fromUrl = searchParams.get(key)
    return fromUrl ?? defaultValue
  })

  // Sync local state when the URL changes externally (e.g. back/forward).
  useEffect(() => {
    const fromUrl = searchParams.get(key)
    setValueState(fromUrl ?? defaultValue)
  }, [searchParams, key, defaultValue])

  const setValue = useCallback((next: string) => {
    setValueState(next)
    const params = new URLSearchParams(searchParams.toString())
    if (next === defaultValue || next === '') {
      params.delete(key)
    } else {
      params.set(key, next)
    }
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [router, pathname, searchParams, key, defaultValue])

  return [value, setValue]
}
