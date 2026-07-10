"use client"

import { ReactNode, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Lock, CreditCard } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from '@/hooks/useTranslation'

/**
 * Phase 0 subscription gate for the study system.
 *
 * Behaviour at this stage:
 * - First visit ever: auto-provision a 7-day trial row and continue.
 * - Trial / active row with `current_period_end > now`: render children.
 * - Cancelled / expired: render a placeholder paywall (Phase 4 will
 *   replace this with the real PortOne checkout button).
 *
 * The gate is intentionally generous in Phase 0 — we want every
 * authenticated student who lands on a study page to be inside the
 * funnel immediately so we can validate the experience. Billing-side
 * hardening (webhook reconciliation, grace periods, etc.) lands with
 * the PortOne integration in Phase 4.
 */

type State =
  | { kind: 'loading' }
  | { kind: 'allowed' }
  | { kind: 'paywall'; status: 'expired' | 'cancelled' }
  | { kind: 'unauthenticated' }
  | { kind: 'error' }

export function StudySubscriptionGate({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { t, language } = useTranslation()
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    if (!user?.id) {
      setState({ kind: 'unauthenticated' })
      return
    }
    let cancelled = false
    setState({ kind: 'loading' })
    void (async () => {
      try {
      // Look up existing subscription. RLS lets the student read their
      // own row; service-role isn't needed here.
      const { data: existing, error: readError } = await supabase
        .from('study_subscriptions')
        .select('status, current_period_end')
        .eq('student_id', user.id)
        .maybeSingle()

      if (cancelled) return

      // A FAILED read is not the same as "no subscription row": treating
      // it as a first visit would re-provision a trial (or paywall) for
      // an existing subscriber on a transient glitch. Surface a retry.
      if (readError) {
        setState({ kind: 'error' })
        return
      }

      // No row yet → first study visit. Provision a 7-day trial. The
      // default column values in the migration already do the right
      // thing (status='trial', period_end = now() + 7 days, plan =
      // monthly_v1) so we only need to write student_id + status.
      if (!existing) {
        const trialEnds = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        const { error: insertError } = await supabase
          .from('study_subscriptions')
          .insert({
            student_id: user.id,
            status: 'trial',
            trial_ends_at: trialEnds,
            current_period_end: trialEnds,
            // Trial allotment — enough to experience the full-test
            // flow a few times before choosing a plan. Keep in sync
            // with TRIAL_CREDITS in src/lib/study/plans.ts (client
            // component, so the constant isn't imported server-side).
            grant_credits_remaining: 3,
          })
        if (!cancelled) {
          // On insert success → allow through (the trial row is now valid
          // for the next 7 days). On insert failure → paywall as a safe
          // fallback so we don't ship study access without a record.
          if (insertError) {
            setState({ kind: 'paywall', status: 'expired' })
          } else {
            setState({ kind: 'allowed' })
          }
        }
        return
      }

      const now = Date.now()
      const periodEnd = new Date(existing.current_period_end).getTime()
      const stillInPeriod = periodEnd > now
      const statusOk = existing.status === 'trial' || existing.status === 'active'

      if (statusOk && stillInPeriod) {
        setState({ kind: 'allowed' })
        return
      }

      setState({
        kind: 'paywall',
        status: existing.status === 'cancelled' ? 'cancelled' : 'expired',
      })
      } catch {
        // Network/unexpected throw — without this the gate spins forever
        // and blocks the entire study module. Show a retry instead.
        if (!cancelled) setState({ kind: 'error' })
      }
    })()
    return () => { cancelled = true }
  }, [user?.id, retryKey])

  if (state.kind === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen text-sm text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        {t('study.gate.loading') ?? 'Loading...'}
      </div>
    )
  }

  if (state.kind === 'error') {
    const ko = language === 'korean'
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6 text-center gap-3">
        <p className="text-sm text-gray-600">
          {ko ? '연결에 문제가 있어요. 다시 시도해 주세요.' : "We couldn't check your access. Please try again."}
        </p>
        <button
          type="button"
          onClick={() => setRetryKey(k => k + 1)}
          className="inline-flex items-center justify-center h-10 px-5 rounded-xl bg-gray-900 text-white text-[13px] font-medium hover:bg-gray-800 active:scale-[0.98] transition-all"
        >
          {ko ? '다시 시도' : 'Retry'}
        </button>
      </div>
    )
  }

  if (state.kind === 'unauthenticated') {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6 text-center gap-3 text-sm text-gray-500">
        <p>{t('study.gate.signInRequired') ?? 'Please sign in to access Study.'}</p>
        {/* Escape hatch — this gate also wraps session routes where the
            bottom nav is hidden, so without a link a logged-out visitor
            is fully trapped on this screen. */}
        <Link href="/auth" className="text-primary font-medium underline underline-offset-2">
          {language === 'korean' ? '로그인' : 'Sign in'}
        </Link>
      </div>
    )
  }

  if (state.kind === 'paywall') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
          <Lock className="w-6 h-6" />
        </div>
        <h1 className="text-lg font-semibold text-gray-900 mb-1">
          {state.status === 'expired'
            ? (t('study.gate.expiredTitle') ?? 'Your study access has expired')
            : (t('study.gate.cancelledTitle') ?? 'Your study subscription was cancelled')}
        </h1>
        <p className="text-sm text-gray-500 max-w-sm mb-6">
          {t('study.gate.renewBody') ?? 'Renew to continue your sessions and keep your saved progress.'}
        </p>
        <Link
          href="/mobile/study/subscription"
          className="inline-flex items-center gap-1.5 px-5 h-11 rounded-full bg-primary text-white text-sm font-semibold"
        >
          <CreditCard className="w-4 h-4" />
          {t('study.gate.renewCta') ?? 'Manage subscription'}
        </Link>
      </div>
    )
  }

  return <>{children}</>
}
