'use client'

import { useEffect, useState } from 'react'
import { CreditCard, ExternalLink, FileText } from '@/app/mobile/study/_shared/icons'
import { useTranslation } from '@/hooks/useTranslation'
import { authHeaders } from '@/lib/auth-headers'
import { openExternalUrl } from '@/lib/nativeApp'
import { StudyPageHeader, StudyScrollShell, StudyPageTransition } from '../_shared/primitives'
import { SkeletonBlock } from '../skeletons'

/**
 * 결제 내역 / Billing history — every Classraum Study charge with its card
 * receipt. Exists because until 2026-09-30 a subscriber had no way to see
 * what they had been charged or to get the slip for any charge.
 */
interface Item {
  paymentId: string
  kind: 'study_subscription' | 'study_credit_pack' | 'study_exam_pass' | string
  amountWon: number
  paidAt: string
  refundedAt: string | null
  orderName: string | null
  receiptUrl: string | null
}

const KIND = {
  ko: { study_subscription: '구독', study_credit_pack: '크레딧', study_exam_pass: '시험 패스' },
  en: { study_subscription: 'Subscription', study_credit_pack: 'Credits', study_exam_pass: 'Exam pass' },
} as const

export default function BillingHistoryPage() {
  const { language } = useTranslation()
  const ko = language === 'korean'
  const [items, setItems] = useState<Item[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/study/billing', { headers: await authHeaders(), cache: 'no-store' })
        if (!res.ok) throw new Error(String(res.status))
        const body = (await res.json()) as { items: Item[] }
        if (!cancelled) setItems(body.items)
      } catch {
        if (!cancelled) setFailed(true)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const won = (n: number) => (ko ? `${n.toLocaleString('ko-KR')}원` : `₩${n.toLocaleString('en-US')}`)
  const date = (iso: string) => new Intl.DateTimeFormat(ko ? 'ko-KR' : 'en-US', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: ko ? 'long' : 'short', day: 'numeric',
  }).format(new Date(iso))
  const kindLabel = (k: string) => (KIND[ko ? 'ko' : 'en'] as Record<string, string>)[k] ?? k

  return (
    <StudyScrollShell
      header={
        <StudyPageHeader
          backHref="/mobile/study/subscription"
          backLabel={ko ? '구독으로 돌아가기' : 'Back to subscription'}
          icon={CreditCard}
          iconColorClass="text-primary bg-primary/10"
          eyebrow={ko ? '결제' : 'Payments'}
          title={ko ? '결제 내역' : 'Billing history'}
          subtitle={ko ? '모든 결제와 카드 영수증을 확인할 수 있어요.' : 'Every charge, with its card receipt.'}
        />
      }
    >
      <StudyPageTransition>
        <div className="max-w-3xl mx-auto px-5 lg:px-8 pt-4 pb-14">
          {failed && (
            <div role="alert" className="rounded-2xl bg-white ring-1 ring-gray-200/70 px-5 py-8 text-center text-[15px] text-gray-600">
              {ko ? '결제 내역을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.' : "Couldn't load your billing history. Please try again in a moment."}
            </div>
          )}
          {!failed && items === null && (
            <div className="space-y-3">{[0, 1, 2].map(i => <SkeletonBlock key={i} className="h-[76px] rounded-2xl" />)}</div>
          )}
          {items && items.length === 0 && (
            <div className="rounded-2xl bg-white ring-1 ring-gray-200/70 px-5 py-10 text-center space-y-2">
              <FileText className="w-6 h-6 mx-auto text-gray-400" />
              <p className="text-[15px] font-semibold text-gray-900">{ko ? '아직 결제 내역이 없어요' : 'No payments yet'}</p>
              <p className="text-[13px] text-gray-500">{ko ? '구독하거나 크레딧을 구매하면 여기에 표시돼요.' : 'Subscriptions and credit purchases will appear here.'}</p>
            </div>
          )}
          {items && items.length > 0 && (
            <ul className="rounded-2xl bg-white ring-1 ring-gray-200/70 divide-y divide-gray-100 overflow-hidden" data-testid="billing-list">
              {items.map(it => (
                <li key={it.paymentId} className="flex items-center gap-3 px-4 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-primary">{kindLabel(it.kind)}</span>
                      {it.refundedAt && (
                        <span className="text-[11px] font-semibold rounded-full bg-gray-100 text-gray-600 px-2 py-0.5">{ko ? '환불됨' : 'Refunded'}</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[15px] font-medium text-gray-900 truncate">{it.orderName ?? kindLabel(it.kind)}</p>
                    <p className="text-[13px] text-gray-500 tabular-nums">{date(it.paidAt)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-[15px] font-semibold tabular-nums ${it.refundedAt ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{won(it.amountWon)}</p>
                    {it.receiptUrl ? (
                      <button
                        type="button"
                        onClick={() => void openExternalUrl(it.receiptUrl as string)}
                        // Every row's button reads "Receipt"; name the charge so
                        // a screen-reader list of buttons is distinguishable.
                        aria-label={`${ko ? '영수증' : 'Receipt'} · ${date(it.paidAt)} · ${won(it.amountWon)}`}
                        className="tap-target mt-1 inline-flex items-center gap-1 text-[13px] font-semibold text-primary"
                      >
                        {ko ? '영수증' : 'Receipt'} <ExternalLink className="w-3.5 h-3.5" aria-hidden />
                      </button>
                    ) : (
                      <span className="mt-1 block text-[13px] text-gray-500">{ko ? '영수증 준비 중' : 'Receipt pending'}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 px-1 text-[13px] leading-relaxed text-gray-500">
            {ko
              ? '카드 영수증은 결제대행사(KG이니시스)가 발급하는 신용카드 매출전표예요. 문의: support@classraum.com'
              : 'Card receipts are credit-card sales slips issued by our payment processor, KG Inicis. Questions: support@classraum.com'}
          </p>
        </div>
      </StudyPageTransition>
    </StudyScrollShell>
  )
}
