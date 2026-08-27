'use client'

/**
 * Moderation queue for reported study nicknames.
 *
 * The word list in src/lib/study/nickname-moderation.ts is deliberately
 * short — Korean profanity overlaps ordinary words, so a longer list
 * trades misses for false positives that stop real students registering
 * their own names. This screen is the other half of that trade: the
 * place a human resolves what the list could not.
 *
 * THE COUNT IS THE SIGNAL. One complaint is noise — a student annoyed at
 * losing a duel. Several from DIFFERENT reporters about the same handle
 * is the thing worth acting on, so it is surfaced on every row rather
 * than left for the moderator to notice by scrolling.
 *
 * Resolving does NOT change the nickname. Clearing someone's handle is a
 * heavier action with its own consequences, and making it a side effect
 * of triage would mean an irreversible change every time somebody
 * pressed the wrong button.
 */

import { useCallback, useEffect, useState } from 'react'
import { Flag, Check, X, Loader2, AlertTriangle } from 'lucide-react'
import { authHeaders } from '@/lib/auth-headers'
import { Button } from '@/components/ui/button'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'

interface Report {
  id: string
  reported_nickname: string
  reason: string | null
  status: 'pending' | 'actioned' | 'dismissed'
  created_at: string
  resolved_at: string | null
  resolution_note: string | null
  reported_student_id: string
  reporter_student_id: string
  openReportsAgainstTarget: number
}

type Tab = 'pending' | 'actioned' | 'dismissed'

export function NicknameReportsModeration() {
  const [tab, setTab] = useState<Tab>('pending')
  const [reports, setReports] = useState<Report[]>([])
  const [truncated, setTruncated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async (status: Tab) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/nickname-reports?status=${status}`, {
        headers: await authHeaders(),
      })
      if (!res.ok) {
        setError(res.status === 403 ? 'Admin access required.' : 'Could not load reports.')
        setReports([])
        return
      }
      const json = (await res.json()) as { reports: Report[]; truncated: boolean }
      setReports(json.reports ?? [])
      setTruncated(Boolean(json.truncated))
    } catch {
      setError('Could not load reports.')
      setReports([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load(tab) }, [tab, load])

  const resolve = async (id: string, status: 'actioned' | 'dismissed') => {
    if (busy) return
    setBusy(id)
    try {
      const res = await fetch('/api/admin/nickname-reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ id, status }),
      })
      // Re-read rather than splicing locally: another admin may have
      // resolved the same row, and the server refuses to overwrite a
      // decision that is already made.
      if (res.ok) await load(tab)
      else setError('Could not update that report.')
    } catch {
      setError('Could not update that report.')
    } finally {
      setBusy(null)
    }
  }

  const pending = reports.filter(r => r.status === 'pending').length

  return (
    /* space-y-6, AdminPageHeader, no bespoke <h1> — this page was built
       standalone and looked it: different heading size, different
       padding, different spacing rhythm from every other admin screen. */
    <div className="space-y-6">
      <AdminPageHeader
        kicker="Moderation"
        title="Nickname reports"
        description="Handles reported by students. The automatic word list is deliberately conservative; this is what it does not catch."
        actions={
          tab === 'pending' && pending > 0 ? (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 h-7 rounded-full bg-rose-50 ring-1 ring-rose-200/60 text-[11px] font-semibold text-rose-700">
              {pending} awaiting review
            </div>
          ) : null
        }
      />

      <div className="flex gap-1 mb-5 bg-gray-50 ring-1 ring-gray-100 rounded-full p-1 w-fit">
        {(['pending', 'actioned', 'dismissed'] as const).map(s => (
          <button
            key={s}
            onClick={() => setTab(s)}
            className={`min-h-[44px] px-4 rounded-full text-sm font-semibold capitalize transition-all ${
              tab === s ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}
      {truncated && (
        // Never let a capped list read as a complete one.
        <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          Showing the first 200 only — resolve some to see the rest.
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 py-10">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : reports.length === 0 ? (
        <div className="py-14 text-center text-gray-500">
          <Flag className="w-8 h-8 mx-auto mb-3 text-gray-300" />
          Nothing {tab}.
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(r => (
            <div key={r.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-base font-semibold text-gray-900 break-all">
                      {r.reported_nickname}
                    </span>
                    {r.openReportsAgainstTarget > 1 && (
                      /* The signal worth acting on: several different
                         students, not one annoyed one. */
                      <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-1.5 py-0.5 text-[11px] font-semibold text-rose-700">
                        <AlertTriangle className="w-3 h-3" />
                        {r.openReportsAgainstTarget} open reports
                      </span>
                    )}
                  </div>
                  {r.reason && (
                    <p className="mt-1.5 text-sm text-gray-600 break-words">{r.reason}</p>
                  )}
                  <p className="mt-1.5 text-xs text-gray-400 tabular-nums">
                    {new Date(r.created_at).toLocaleString()}
                    {r.resolved_at && ` · resolved ${new Date(r.resolved_at).toLocaleString()}`}
                  </p>
                  {r.resolution_note && (
                    <p className="mt-1 text-xs text-gray-500 italic">{r.resolution_note}</p>
                  )}
                </div>

                {r.status === 'pending' && (
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      size="sm" variant="outline" disabled={busy === r.id}
                      className="min-h-[44px]"
                      onClick={() => void resolve(r.id, 'dismissed')}
                    >
                      <X className="w-3.5 h-3.5 mr-1" /> Dismiss
                    </Button>
                    <Button
                      size="sm" disabled={busy === r.id}
                      className="min-h-[44px]"
                      onClick={() => void resolve(r.id, 'actioned')}
                    >
                      <Check className="w-3.5 h-3.5 mr-1" /> Actioned
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
