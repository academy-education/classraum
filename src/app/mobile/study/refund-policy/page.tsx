"use client"

// TODO(legal): This copy is a sensible default, NOT legal-reviewed. Before
// launch, have the refund/billing wording reviewed for Korean e-commerce
// compliance (전자상거래법 / 콘텐츠 이용자 보호지침) — a mid-term cancellation of a
// continuous paid service may require a pro-rated refund and specific
// disclosures, so avoid asserting an absolute "no refund" policy.

import { useTranslation } from '@/hooks/useTranslation'
import { StudyPageHeader, StudyScrollShell } from '../_shared/primitives'
import { Shield, CreditCard, Calendar, Coins, Info } from '@/app/mobile/study/_shared/icons'

export default function RefundPolicyPage() {
  const { language } = useTranslation()
  const ko = language === 'korean'

  const header = (
    <StudyPageHeader
      backHref="/mobile/study/subscription"
      backLabel={ko ? '구독으로' : 'Back to subscription'}
      icon={Shield}
      eyebrow={ko ? '학습' : 'Study'}
      title={ko ? '결제 및 환불 정책' : 'Billing & Refund Policy'}
      subtitle={ko ? '구독 결제, 해지, 환불에 대한 안내' : 'How billing, cancellation, and refunds work'}
    />
  )

  const sections: { icon: typeof Shield; title: string; body: string[] }[] = ko
    ? [
        {
          icon: CreditCard,
          title: '구독 결제',
          body: [
            'Classraum 스터디 구독은 결제 시 등록한 카드로 매월(또는 선택한 플랜 주기마다) 자동으로 갱신·결제됩니다.',
            '다음 결제일은 구독 페이지 상단 카드에서 확인할 수 있어요.',
          ],
        },
        {
          icon: Calendar,
          title: '구독 해지',
          body: [
            '구독 페이지에서 언제든지 해지할 수 있습니다.',
            '해지해도 현재 결제 기간이 끝날 때까지는 모든 기능을 그대로 이용할 수 있고, 기간이 끝나면 자동으로 무료 플랜으로 전환됩니다. 이후에는 추가 결제가 이루어지지 않습니다.',
            '기간이 끝나기 전에는 언제든지 “구독 재개”를 눌러 결제를 다시 이어갈 수 있어요.',
          ],
        },
        {
          icon: Info,
          title: '환불',
          body: [
            '이미 결제가 완료된 현재 이용 기간에 대해서는, 해당 기간의 이용권이 정상적으로 제공되므로 원칙적으로 환불되지 않을 수 있습니다.',
            '결제 오류 등 문제가 있다고 생각되시면 아래 연락처로 문의해 주세요. 관련 소비자보호 법령에 따라 확인 후 안내해 드리겠습니다.',
          ],
        },
        {
          icon: Coins,
          title: '패스 · 크레딧',
          body: [
            '시험 패스는 구독과 별개로, 각 패스에 표시된 만료일까지 유효합니다.',
            '구매한 크레딧은 만료되지 않습니다. 패스·크레딧 등 일회성 구매도 위 환불 기준을 따릅니다.',
          ],
        },
      ]
    : [
        {
          icon: CreditCard,
          title: 'Billing',
          body: [
            'Classraum Study subscriptions renew and charge automatically each month (or at your plan’s interval) to the card you registered at checkout.',
            'Your next renewal date is shown on the card at the top of the Subscription page.',
          ],
        },
        {
          icon: Calendar,
          title: 'Cancellation',
          body: [
            'You can cancel anytime from the Subscription page.',
            'When you cancel, your plan stays active until the end of the current billing period — you keep full access until then — and then moves to the free plan. You won’t be charged again.',
            'Before the period ends you can tap “Reactivate” to resume billing.',
          ],
        },
        {
          icon: Info,
          title: 'Refunds',
          body: [
            'Charges already completed for the current period generally are not refundable, since access is provided for the full period you paid for.',
            'If you believe you were charged in error, contact us and we’ll review it in line with applicable consumer-protection law.',
          ],
        },
        {
          icon: Coins,
          title: 'Passes & credits',
          body: [
            'Exam passes are separate from subscriptions and remain valid until the expiry date shown on each pass.',
            'Purchased credits never expire. One-time purchases (passes, credit packs) follow the same refund terms above.',
          ],
        },
      ]

  return (
    <StudyScrollShell header={header}>
      <div className="space-y-3">
        {sections.map(s => {
          const Icon = s.icon
          return (
            <div key={s.title} className="rounded-2xl bg-white ring-1 ring-gray-200/60 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <div className="flex items-center gap-2.5 mb-2.5">
                <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4" />
                </span>
                <h2 className="text-[15px] font-semibold text-gray-900">{s.title}</h2>
              </div>
              <div className="space-y-2 text-[13.5px] text-gray-600 leading-relaxed">
                {s.body.map((p, i) => <p key={i}>{p}</p>)}
              </div>
            </div>
          )
        })}

        <p className="text-[12px] text-gray-400 leading-relaxed px-1">
          {ko
            ? '문의: support@classraum.com · 본 정책은 관련 법령 및 서비스 운영 방침에 따라 변경될 수 있습니다.'
            : 'Questions? support@classraum.com · This policy may change in line with applicable law and our service terms.'}
        </p>
      </div>
    </StudyScrollShell>
  )
}
