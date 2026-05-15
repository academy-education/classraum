'use client'

/**
 * Next.js App Router error boundary for the entire `/admin` segment.
 * Catches render errors thrown from any admin page and shows a branded
 * fallback with a Try Again button (calls `reset` to re-render the segment)
 * and a "Back to dashboard" escape hatch.
 *
 * Lives at `src/app/admin/error.tsx` — Next.js wires it in automatically as
 * a boundary around every nested route. Replaces the default behavior of
 * silently blanking the page when something throws.
 */

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Admin] Render error:', error)
    // Best-effort: ship the crash to /api/admin/error-logs so it shows up
    // in the Error Logs dashboard and gets the same retention treatment as
    // server-side errors. Auth-gated on the server; we just attach the
    // current admin's bearer token. Failures here are silent — we don't
    // want to add a second crash on top of the first.
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) return
        await fetch('/api/admin/error-logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            message: 'Admin UI render error',
            errorMessage: error.message,
            stack: error.stack,
            digest: error.digest,
            level: 'error',
            context: {
              pathname: typeof window !== 'undefined' ? window.location.pathname : null,
              userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
            },
          }),
        })
      } catch {
        /* swallow — don't cascade */
      }
    })()
  }, [error])

  // Strip leading "Error: " from the message for cleaner display.
  const message = (error?.message || 'An unexpected error occurred')
    .replace(/^Error:\s*/, '')

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-xl ring-1 ring-rose-200/70 shadow-sm overflow-hidden">
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-gray-900">
                Something went wrong
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                This page hit an unexpected error. The team has been notified.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 ring-1 ring-gray-100">
            <p className="text-xs font-mono text-gray-700 break-words">
              {message}
            </p>
            {error.digest && (
              <p className="text-[10px] text-gray-500 mt-2">
                Reference: <span className="font-mono">{error.digest}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/30">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/dashboard">
              <Home className="w-4 h-4" />
              Dashboard
            </Link>
          </Button>
          <Button onClick={reset} size="sm">
            <RefreshCw className="w-4 h-4" />
            Try again
          </Button>
        </div>
      </div>
    </div>
  )
}
