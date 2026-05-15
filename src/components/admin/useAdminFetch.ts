'use client'

import { useCallback } from 'react'
import { supabase } from '@/lib/supabase'

/**
 * useAdminFetch — small helper hook that wraps `fetch` with the
 * `Authorization: Bearer <admin token>` header.
 *
 * Replaces the boilerplate that was repeated in ~30 admin callsites:
 *
 *   const { data: { session } } = await supabase.auth.getSession()
 *   const response = await fetch('/api/admin/...', {
 *     headers: {
 *       'Authorization': `Bearer ${session?.access_token}`,
 *       'Content-Type': 'application/json',
 *     },
 *   })
 *
 * Becomes:
 *
 *   const adminFetch = useAdminFetch()
 *   const response = await adminFetch('/api/admin/...')
 *
 * Behavior:
 * - Always attaches `Content-Type: application/json` (even on GETs — harmless)
 * - Throws if there's no session, so the caller can `try/catch` once instead
 *   of having an early-return for `if (!session) ...`
 * - Caller-supplied headers / method / body are merged through
 */
export function useAdminFetch() {
  return useCallback(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('Not authenticated. Please reload and sign in again.')
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      ...((init.headers as Record<string, string>) || {}),
    }

    return fetch(input, { ...init, headers })
  }, [])
}
