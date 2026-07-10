"use client"

import { ReactNode, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from '@/hooks/useTranslation'

/**
 * Study access gate — freemium model.
 *
 * - First visit ever: auto-provision a FREE plan row (one-time 3 AI
 *   credits) and continue.
 * - Any existing row (free / trial / active / lapsed): render children.
 *   There is no hard paywall — lapsed subscribers fall back to the
 *   free experience, and paid features (AI generation credits, premium
 *   capabilities) are enforced server-side per request.
 * - The gate's real jobs are provisioning, the signed-out escape
 *   hatch, and a retry surface for transient read failures.
 */

type State =
  | { kind: 'loading' }
  | { kind: 'allowed' }
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

      // No row yet → first study visit. Provision the FREE plan:
      // premade content is unlimited, plus a one-time 3-credit grant
      // for AI generation. Replaces the old auto 7-day trial (which
      // confusingly showed "Cancel subscription" to people who never
      // subscribed). Free rows never expire, so no period fields.
      if (!existing) {
        const { error: insertError } = await supabase
          .from('study_subscriptions')
          .insert({
            student_id: user.id,
            status: 'free',
            plan: 'free_v1',
            // Keep in sync with FREE_CREDITS in src/lib/study/plans.ts
            // (client component, so the constant isn't imported).
            grant_credits_remaining: 3,
          })
        if (!cancelled) {
          // On insert success → allow through. On insert failure show
          // the retry state — free access shouldn't dead-end on a
          // transient write error.
          if (insertError) {
            setState({ kind: 'error' })
          } else {
            setState({ kind: 'allowed' })
          }
        }
        return
      }

      // Everyone with a row gets in. Paid features are enforced
      // server-side (credits for AI generation, premium gates); a
      // lapsed subscriber simply falls back to the free experience —
      // there is no hard paywall anymore.
      setState({ kind: 'allowed' })
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

  return <>{children}</>
}
