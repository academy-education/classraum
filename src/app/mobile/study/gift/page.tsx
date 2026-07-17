"use client"

import { useCallback, useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import {
  Gift, Ticket, Loader2, Copy, Check, AlertCircle, CheckCircle2,
  ExternalLink, Sparkles,
} from '@/app/mobile/study/_shared/icons'
import { useTranslation } from '@/hooks/useTranslation'
import { StudyPageHeader, StudyScrollShell } from '../_shared/primitives'
import { StudyButton } from '../_shared/StudyButton'
import { authHeaders } from '@/lib/auth-headers'
import { GIFT } from '@/lib/study/gifts'
import { PortOne } from '@/lib/portone-browser'
import { billingCustomer, missingPhoneMessage } from '@/lib/study/purchase-credits'
import { useAuth } from '@/contexts/AuthContext'

/**
 * /mobile/study/gift — buy a Premium gift for someone, or redeem a code.
 *
 * (a) Buy: issue a PortOne billing key via the overlay, POST it to
 *     /purchase, then show the generated redemption code with a copy
 *     button. Web only — native Capacitor clients hide the buy CTA
 *     (Apple anti-steering) and link out to the web instead.
 * (b) Redeem: enter a code, POST it to /redeem, and on success the
 *     student's account flips to Premium.
 */
export default function GiftPage() {
  const { t, language } = useTranslation()
  const { user } = useAuth()
  const ko = language === 'korean'

  const [isNative, setIsNative] = useState(false)
  useEffect(() => { setIsNative(Capacitor.isNativePlatform()) }, [])

  // Buy state
  const [buying, setBuying] = useState(false)
  const [buyError, setBuyError] = useState<string | null>(null)
  const [issuedCode, setIssuedCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Redeem state
  const [codeInput, setCodeInput] = useState('')
  const [redeeming, setRedeeming] = useState(false)
  const [redeemError, setRedeemError] = useState<string | null>(null)
  const [redeemSuccess, setRedeemSuccess] = useState<string | null>(null)

  const won = `₩${GIFT.priceWon.toLocaleString()}`

  const buy = useCallback(async () => {
    if (buying) return
    setBuying(true)
    setBuyError(null)
    setIssuedCode(null)
    setCopied(false)
    try {
      const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID
      const channelKey = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY_BILLING_LIVE
      if (!storeId || !channelKey) throw new Error('PortOne not configured')

      const customer = await billingCustomer(user)
      if (!customer.phoneNumber) { setBuyError(missingPhoneMessage(ko)); return }
      const issued = await PortOne.requestIssueBillingKey({
        storeId,
        channelKey,
        billingKeyMethod: 'CARD',
        issueId: `study-gift-issue-${user?.id ?? 'anon'}-${Date.now()}`,
        issueName: ko ? GIFT.name_ko : GIFT.name_en,
        customer,
        customData: { kind: 'study_gift', gift: GIFT.id },
      })
      if (!issued?.billingKey) {
        // No billingKey: a code means a PortOne error, none means the
        // user closed the overlay (silent no-op).
        if (issued?.code) setBuyError(issued.message ?? (ko ? '결제에 실패했어요.' : 'Payment failed.'))
        return
      }

      const headers = await authHeaders()
      const res = await fetch('/api/study/gift/purchase', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ billingKey: issued.billingKey }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.code) {
        throw new Error(typeof data.message === 'string' ? data.message : (ko ? '선물 구매에 실패했어요.' : 'Gift purchase failed.'))
      }
      setIssuedCode(String(data.code))
    } catch (e) {
      setBuyError((e instanceof Error && e.message) || (ko ? '선물 구매에 실패했어요.' : 'Gift purchase failed.'))
    } finally {
      setBuying(false)
    }
  }, [buying, ko, user])

  const copyCode = useCallback(async () => {
    if (!issuedCode) return
    try {
      await navigator.clipboard.writeText(issuedCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked — the code is still visible to copy manually.
    }
  }, [issuedCode])

  const redeem = useCallback(async () => {
    if (redeeming) return
    const code = codeInput.trim()
    if (!code) return
    setRedeeming(true)
    setRedeemError(null)
    setRedeemSuccess(null)
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/study/gift/redeem', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        // Map the route's error codes to friendly bilingual messages.
        const map: Record<string, string> = ko ? {
          not_found: '유효하지 않은 코드예요. 다시 확인해 주세요.',
          already_redeemed: '이미 사용된 코드예요.',
          self_gift: '직접 구매한 선물은 사용할 수 없어요.',
          already_subscribed: '이미 이용 중인 구독이 있어요.',
        } : {
          not_found: "That code isn't valid. Please check and try again.",
          already_redeemed: 'This code has already been redeemed.',
          self_gift: "You can't redeem a gift you bought yourself.",
          already_subscribed: 'You already have an active subscription.',
        }
        const msg = (typeof data.code === 'string' && map[data.code])
          || (ko ? '코드 사용에 실패했어요.' : 'Could not redeem that code.')
        throw new Error(msg)
      }
      const months = Number(data.months) || GIFT.months
      const added = Number(data.creditsAdded) || 0
      setRedeemSuccess(ko
        ? `${months}개월 프리미엄이 활성화되었어요! 크레딧 ${added}개가 추가됐어요.`
        : `${months} months of Premium unlocked! ${added} credits added.`)
      setCodeInput('')
    } catch (e) {
      setRedeemError((e instanceof Error && e.message) || (ko ? '코드 사용에 실패했어요.' : 'Could not redeem that code.'))
    } finally {
      setRedeeming(false)
    }
  }, [codeInput, ko, redeeming])

  return (
    <StudyScrollShell
      header={
        <StudyPageHeader
          backHref="/mobile/study"
          backLabel={String(t('study.topic.backToStudy'))}
          icon={Gift}
          eyebrow={ko ? '학습' : 'Study'}
          title={ko ? '프리미엄 선물' : 'Premium Gift'}
          subtitle={ko ? '선물하거나 받은 코드를 사용하세요' : 'Give a gift or redeem a code'}
        />
      }
    >
      {/* ── (a) Buy a gift ─────────────────────────────────────────── */}
      <section>
        <div className="rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 p-5 text-white shadow-[0_8px_24px_-12px_rgba(124,58,237,0.55)]">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-100">
            <Sparkles className="w-4 h-4" />
            {ko ? GIFT.name_ko : GIFT.name_en}
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight">{won}</div>
          <p className="text-[13px] text-violet-50 mt-1.5 leading-relaxed">
            {ko
              ? `${GIFT.months}개월 프리미엄 전 기능 + 테스트 크레딧 ${GIFT.credits}개. 결제 후 받은 코드를 학생에게 전달하면, 학생이 코드를 입력해 프리미엄을 사용할 수 있어요.`
              : `${GIFT.months} months of full Premium + ${GIFT.credits} test credits. After payment, hand the code to your student — they redeem it to unlock Premium.`}
          </p>

          {buyError && (
            <div className="mt-3 rounded-xl bg-white/15 ring-1 ring-white/25 px-3.5 py-2.5 text-[13px] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="leading-relaxed">{buyError}</span>
            </div>
          )}

          {issuedCode ? (
            <div className="mt-3.5 rounded-xl bg-white p-4 text-gray-900">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                {ko ? '선물 코드' : 'Gift code'}
              </p>
              <div className="mt-1.5 flex items-center justify-between gap-3">
                <code className="text-[18px] font-bold tracking-wider tabular-nums text-gray-900 select-all break-all">
                  {issuedCode}
                </code>
                <button
                  type="button"
                  onClick={() => void copyCode()}
                  className="flex-shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-violet-500/10 text-violet-700 ring-1 ring-violet-200 text-[12.5px] font-semibold hover:bg-violet-500/15 active:scale-[0.98] transition-all"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? (ko ? '복사됨' : 'Copied') : (ko ? '복사' : 'Copy')}
                </button>
              </div>
              <p className="text-[12px] text-gray-500 mt-2.5 leading-relaxed">
                {ko
                  ? '이 코드를 학생에게 전달하세요. 학생은 이 페이지의 아래쪽에서 코드를 입력해 사용할 수 있어요.'
                  : 'Share this code with your student. They can redeem it in the "Redeem a code" section below.'}
              </p>
            </div>
          ) : isNative ? (
            // Native app: hide the money button, link out to web (IAP rules).
            <a
              href="https://app.classraum.com/mobile/study/gift"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3.5 w-full h-11 rounded-full bg-white text-violet-600 text-[13.5px] font-bold inline-flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              {ko ? '웹에서 구매하기' : 'Buy on the web'}
            </a>
          ) : (
            <button
              type="button"
              onClick={() => void buy()}
              disabled={buying}
              className="mt-3.5 w-full h-11 rounded-full bg-white text-violet-600 text-[13.5px] font-bold inline-flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-70 transition-all"
            >
              {buying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
              {ko ? '선물 구매하기' : 'Buy this gift'}
            </button>
          )}
        </div>
      </section>

      {/* ── (b) Redeem a code ──────────────────────────────────────── */}
      <section>
        <div className="rounded-2xl bg-white ring-1 ring-gray-200/60 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <Ticket className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-[15px] font-semibold text-gray-900">
                {ko ? '코드 사용하기' : 'Redeem a code'}
              </h2>
              <p className="text-[12.5px] text-gray-500">
                {ko ? '선물 코드를 입력하세요' : 'Enter your gift code'}
              </p>
            </div>
          </div>

          {redeemError && (
            <div className="mt-3.5 rounded-xl bg-rose-50/80 ring-1 ring-rose-200/60 text-rose-700 px-3.5 py-2.5 text-[13px] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="leading-relaxed">{redeemError}</span>
            </div>
          )}
          {redeemSuccess && (
            <div className="mt-3.5 rounded-xl bg-emerald-50/80 ring-1 ring-emerald-200/60 text-emerald-700 px-3.5 py-2.5 text-[13px] flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="leading-relaxed">{redeemSuccess}</span>
            </div>
          )}

          <div className="mt-3.5 flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === 'Enter') void redeem() }}
              placeholder="GIFT-XXXX-XXXX"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              disabled={redeeming}
              className="flex-1 h-11 px-4 rounded-full bg-gray-50 ring-1 ring-gray-200/70 text-[14px] font-semibold tracking-wider text-gray-900 placeholder:text-gray-400 placeholder:font-normal placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
            />
            <StudyButton
              type="button"
              variant="primary"
              onClick={() => void redeem()}
              disabled={redeeming || !codeInput.trim()}
              loading={redeeming}
              leftIcon={<Ticket className="w-4 h-4" />}
            >
              {ko ? '사용하기' : 'Redeem'}
            </StudyButton>
          </div>
        </div>
      </section>
    </StudyScrollShell>
  )
}
