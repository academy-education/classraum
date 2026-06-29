"use client"

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Capacitor } from '@capacitor/core'
import { CheckCircle2, AlertCircle, Loader2, CreditCard, Calendar, RotateCcw, XCircle, ExternalLink } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { StudySubPageHeader } from '../_shared/primitives'
import { authHeaders } from '@/lib/auth-headers'
import { PortOne } from '@/lib/portone-browser'
import { useAuth } from '@/contexts/AuthContext'

interface Subscription {
  status: 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired'
  plan: string
  price_cents: number
  currency: string
  trial_ends_at: string | null
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
}

/**
 * /mobile/study/subscription — manage your study subscription.
 *
 * v1 fits everything on a single screen: status pill, period info,
 * primary CTA (changes by status), and a secondary action (cancel /
 * reactivate). Cancellation is "at period end" not immediate, so the
 * student keeps access through what they've already paid for.
 *
 * The actual checkout still calls a stub endpoint that fakes the
 * charge — Phase 4.5 replaces the stub with PortOne billing-key
 * issue + recurring charge. UI stays identical when that lands.
 */
export default function SubscriptionPage() {
  const { t, language } = useTranslation()
  const { user } = useAuth()
  const ko = language === 'korean'
  const [sub, setSub] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<'cancel' | 'reactivate' | 'checkout' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  // Native Capacitor clients (iOS especially) can't show a Subscribe
  // button or PortOne overlay without violating Apple's anti-steering
  // rules. The page detects the platform and hides the CTA, replacing
  // it with a "manage on classraum.com" link.
  const [isNative, setIsNative] = useState(false)
  useEffect(() => { setIsNative(Capacitor.isNativePlatform()) }, [])

  const load = useCallback(async () => {
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/study/subscription', { headers })
      if (!res.ok) throw new Error()
      const json = await res.json()
      setSub(json.subscription as Subscription | null)
    } catch {
      setError(t('study.subscription.loadFailed') as string)
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { void load() }, [load])

  const act = useCallback(async (kind: 'cancel' | 'reactivate') => {
    setActing(kind)
    setError(null)
    setSuccessMessage(null)
    try {
      const headers = await authHeaders()
      const res = await fetch(`/api/study/subscription/${kind}`, { method: 'POST', headers })
      if (!res.ok) throw new Error()
      await load()
      setSuccessMessage(t(`study.subscription.${kind}Success`) as string)
    } catch {
      setError(t(`study.subscription.${kind}Failed`) as string)
    } finally {
      setActing(null)
    }
  }, [load, t])

  /**
   * Web subscribe flow:
   *   1. Load PortOne browser SDK.
   *   2. requestIssueBillingKey → user enters card / picks easy-pay.
   *   3. POST returned billingKey to /api/study/subscription/billing-key.
   *   4. Server charges first month + flips row to active.
   *
   * Errors bubble up into the toast row at the bottom of the page.
   */
  const subscribe = useCallback(async () => {
    if (acting !== null) return
    setActing('checkout')
    setError(null)
    setSuccessMessage(null)
    try {
      const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID
      const channelKey = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY_BILLING_LIVE
      if (!storeId || !channelKey) {
        throw new Error('PortOne not configured')
      }

      const issueId = `study-issue-${user?.id ?? 'anon'}-${Date.now()}`
      const issued = await PortOne.requestIssueBillingKey({
        storeId,
        channelKey,
        billingKeyMethod: 'CARD',
        issueId,
        issueName: 'Classraum Study subscription',
        customer: {
          customerId: user?.id,
          email: user?.email ?? undefined,
        },
        customData: { kind: 'study_subscription' },
      })

      if (!issued?.billingKey) {
        // User cancelled the overlay or PortOne returned an error code.
        if (issued?.code) {
          setError(issued.message ?? t('study.subscription.checkoutFailed') as string)
        }
        // Silent cancel — no message, just bail out.
        return
      }

      const headers = await authHeaders()
      const res = await fetch('/api/study/subscription/billing-key', {
        method: 'POST',
        headers,
        body: JSON.stringify({ billingKey: issued.billingKey }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(typeof body.message === 'string' ? body.message : 'charge failed')
      }
      await load()
      setSuccessMessage(t('study.subscription.checkoutSuccess') as string)
    } catch (e) {
      setError((e instanceof Error && e.message) || (t('study.subscription.checkoutFailed') as string))
    } finally {
      setActing(null)
    }
  }, [acting, load, t, user])

  if (loading) {
    return (
      <div className="px-5 py-10 flex items-center justify-center text-sm text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        {t('study.subscription.loading')}
      </div>
    )
  }

  const priceLabel = sub
    ? formatPrice(sub.price_cents, sub.currency)
    : formatPrice(990000, 'KRW')

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-56 -z-10 bg-gradient-to-b from-primary/[0.04] via-violet-500/[0.02] to-transparent"
      />
      <div className="px-5 pt-6 pb-14 space-y-7">
        <StudySubPageHeader
          backHref="/mobile/study"
          backLabel={String(t('study.topic.backToStudy'))}
          icon={CreditCard}
          eyebrow={ko ? '학습' : 'Study'}
          title={String(t('study.subscription.title'))}
          subtitle={String(t('study.subscription.subtitle'))}
        />

        {/* Plan card — gradient surface with premium feel */}
        <div className="relative rounded-2xl bg-gradient-to-br from-white via-white to-primary/[0.025] ring-1 ring-gray-200/60 p-6 space-y-5 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_12px_28px_-16px_rgba(40,133,232,0.18)] overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/80 mb-1.5">
                {t('study.subscription.planEyebrow')}
              </div>
              <h2 className="text-xl font-semibold tracking-tight text-gray-900">
                {t('study.subscription.planMonthly')}
              </h2>
              <p className="text-[15px] text-gray-600 mt-1">
                <span className="font-medium text-gray-900">{priceLabel}</span>
                <span className="text-gray-400"> / {t('study.subscription.month')}</span>
              </p>
            </div>
            <StatusPill status={sub?.status ?? 'trial'} cancelling={sub?.cancel_at_period_end ?? false} />
          </div>

          {sub && (
            <div className="rounded-xl bg-gray-50/80 ring-1 ring-gray-200/50 px-4 py-3 text-[13.5px] text-gray-700 inline-flex items-start gap-2.5 w-full">
              <Calendar className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" />
              <div className="leading-relaxed">
                {sub.cancel_at_period_end
                  ? t('study.subscription.cancelsOn', { date: formatDate(sub.current_period_end, ko) })
                  : sub.status === 'trial'
                    ? t('study.subscription.trialEnds', { date: formatDate(sub.current_period_end, ko) })
                    : t('study.subscription.renewsOn', { date: formatDate(sub.current_period_end, ko) })}
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="space-y-2.5">
          {(!sub || sub.status === 'expired' || sub.status === 'cancelled' || sub.status === 'past_due') && (
            isNative ? (
              <a
                href="https://app.classraum.com/mobile/study/subscription"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-12 rounded-full bg-white ring-1 ring-gray-200/70 text-gray-700 text-sm font-medium inline-flex items-center justify-center gap-1.5 hover:ring-primary/40 hover:text-primary shadow-[0_1px_2px_rgba(0,0,0,0.03)] active:scale-[0.98] transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                {t('study.subscription.subscribeOnWeb')}
              </a>
            ) : (
              <button
                type="button"
                onClick={() => void subscribe()}
                disabled={acting !== null}
                className="w-full h-12 rounded-full bg-gradient-to-b from-primary to-primary/90 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_8px_rgba(40,133,232,0.28),0_8px_24px_-8px_rgba(40,133,232,0.4)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_4px_12px_rgba(40,133,232,0.35),0_12px_28px_-8px_rgba(40,133,232,0.5)] active:scale-[0.98] disabled:opacity-60 transition-all"
              >
                {acting === 'checkout'
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <CreditCard className="w-4 h-4" />}
                {t('study.subscription.subscribeNow')}
              </button>
            )
          )}

          {sub && (sub.status === 'trial' || sub.status === 'active') && !sub.cancel_at_period_end && (
            <button
              type="button"
              onClick={() => void act('cancel')}
              disabled={acting !== null}
              className="w-full h-12 rounded-full bg-white ring-1 ring-gray-200/70 text-rose-600 text-sm font-medium inline-flex items-center justify-center gap-1.5 hover:ring-rose-200 shadow-[0_1px_2px_rgba(0,0,0,0.03)] active:scale-[0.98] disabled:opacity-60 transition-all"
            >
              {acting === 'cancel' ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              {t('study.subscription.cancel')}
            </button>
          )}

          {sub?.cancel_at_period_end && (
            <button
              type="button"
              onClick={() => void act('reactivate')}
              disabled={acting !== null}
              className="w-full h-12 rounded-full bg-gradient-to-b from-primary to-primary/90 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_8px_rgba(40,133,232,0.28)] active:scale-[0.98] disabled:opacity-60 transition-all"
            >
              {acting === 'reactivate' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              {t('study.subscription.reactivate')}
            </button>
          )}
        </div>

        {(error || successMessage) && (
          <div className={`rounded-2xl px-4 py-3 text-[13.5px] flex items-start gap-2.5 ring-1 ${
            error ? 'bg-rose-50/80 ring-rose-200/60 text-rose-700' : 'bg-emerald-50/80 ring-emerald-200/60 text-emerald-700'
          }`}>
            {error ? <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />}
            <span className="leading-relaxed">{error ?? successMessage}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function StatusPill({ status, cancelling }: { status: Subscription['status']; cancelling: boolean }) {
  const { t } = useTranslation()
  if (cancelling) {
    return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200">{t('study.subscription.statusCancelling')}</span>
  }
  const map: Record<Subscription['status'], { cls: string; label: string }> = {
    trial:     { cls: 'bg-primary/10 text-primary ring-primary/30',     label: t('study.subscription.statusTrial') as string },
    active:    { cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', label: t('study.subscription.statusActive') as string },
    past_due:  { cls: 'bg-amber-50 text-amber-700 ring-amber-200',       label: t('study.subscription.statusPastDue') as string },
    cancelled: { cls: 'bg-gray-100 text-gray-700 ring-gray-200',         label: t('study.subscription.statusCancelled') as string },
    expired:   { cls: 'bg-rose-50 text-rose-700 ring-rose-200',           label: t('study.subscription.statusExpired') as string },
  }
  const m = map[status]
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ${m.cls}`}>{m.label}</span>
}

function formatPrice(cents: number, currency: string): string {
  if (currency === 'KRW') return `₩${Math.round(cents / 100).toLocaleString()}`
  return `${cents / 100} ${currency}`
}

function formatDate(iso: string, ko: boolean): string {
  return new Date(iso).toLocaleDateString(ko ? 'ko-KR' : 'en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}
