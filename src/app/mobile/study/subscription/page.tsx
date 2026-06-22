"use client"

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, AlertCircle, Loader2, CreditCard, Calendar, RotateCcw, XCircle } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { authHeaders } from '@/lib/auth-headers'

interface Subscription {
  status: 'trial' | 'active' | 'cancelled' | 'expired'
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
  const ko = language === 'korean'
  const [sub, setSub] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<'cancel' | 'reactivate' | 'checkout' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

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

  const act = useCallback(async (kind: 'cancel' | 'reactivate' | 'checkout') => {
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
    <div className="px-5 pt-6 pb-12 space-y-6">
      <Link
        href="/mobile/study"
        className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-primary"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('study.topic.backToStudy')}
      </Link>

      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          {t('study.subscription.title')}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {t('study.subscription.subtitle')}
        </p>
      </header>

      {/* Plan card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary mb-1">
              {t('study.subscription.planEyebrow')}
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              {t('study.subscription.planMonthly')}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {priceLabel} <span className="text-gray-400">/ {t('study.subscription.month')}</span>
            </p>
          </div>
          <StatusPill status={sub?.status ?? 'trial'} cancelling={sub?.cancel_at_period_end ?? false} />
        </div>

        {sub && (
          <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700 inline-flex items-start gap-2 w-full">
            <Calendar className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" />
            <div>
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
      <div className="space-y-2">
        {(!sub || sub.status === 'expired' || sub.status === 'cancelled') && (
          <button
            type="button"
            onClick={() => void act('checkout')}
            disabled={acting !== null}
            className="w-full h-12 rounded-full bg-primary text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {acting === 'checkout'
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <CreditCard className="w-4 h-4" />}
            {t('study.subscription.subscribeNow')}
          </button>
        )}

        {sub && (sub.status === 'trial' || sub.status === 'active') && !sub.cancel_at_period_end && (
          <button
            type="button"
            onClick={() => void act('cancel')}
            disabled={acting !== null}
            className="w-full h-12 rounded-full bg-white border border-gray-200 text-rose-600 text-sm font-medium inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
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
            className="w-full h-12 rounded-full bg-primary text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {acting === 'reactivate' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            {t('study.subscription.reactivate')}
          </button>
        )}
      </div>

      {/* Toast-ish status row at the bottom — separate from the
          buttons so a stale message doesn't get hidden behind a
          newly-loading state. */}
      {(error || successMessage) && (
        <div className={`rounded-xl px-4 py-3 text-sm flex items-start gap-2 ${
          error ? 'bg-rose-50 border border-rose-200 text-rose-700' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
        }`}>
          {error ? <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />}
          <span>{error ?? successMessage}</span>
        </div>
      )}

      {/* TODO Phase 4.5: render PortOne payment-method card + invoice
          history pulled from study_subscriptions + a future invoice
          table. Hidden until that lands so we don't fake invoices. */}
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
