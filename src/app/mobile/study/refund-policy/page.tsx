"use client"

// NOTE(legal): Good-faith default aligned with Korea's 전자상거래법 (7-day
// withdrawal for unused digital content + pro-rata refund on mid-term
// cancellation). Sensible to have counsel confirm the final wording, but it
// is a usable policy, not a placeholder. Update support@ if it changes.

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
            'Classraum 스터디 유료 구독은 결제 시 등록하신 카드로 매월(또는 선택하신 플랜 주기마다) 자동으로 갱신·결제됩니다. 표시되는 모든 금액은 부가가치세(VAT)가 포함된 금액입니다.',
            '다음 결제 예정일은 구독 페이지 상단 카드에서 확인하실 수 있습니다.',
          ],
        },
        {
          icon: Calendar,
          title: '구독 해지',
          body: [
            '구독 페이지에서 언제든지 해지하실 수 있습니다.',
            '해지하시더라도 현재 결제 기간이 끝날 때까지는 모든 기능을 그대로 이용하실 수 있으며, 기간이 끝나면 자동으로 무료 플랜으로 전환되고 추가 결제는 이루어지지 않습니다.',
            '기간이 끝나기 전에는 언제든지 “구독 재개”를 눌러 결제를 다시 이어가실 수 있습니다.',
          ],
        },
        {
          icon: Info,
          title: '환불',
          body: [
            '「전자상거래 등에서의 소비자보호에 관한 법률」에 따라, 결제일로부터 7일 이내이고 유료 콘텐츠(모의고사 생성 등)를 이용하지 않으신 경우 전액 환불을 요청하실 수 있습니다.',
            '이용을 시작하신 후 기간 중 해지·환불을 요청하시는 경우, 이미 이용하신 기간과 사용하신 크레딧에 해당하는 금액을 제외한 잔여분을 일할 계산하여 환불해 드립니다.',
            '결제 오류 등 문제가 있다고 생각되시면 아래 연락처로 문의해 주세요. 영업일 기준 3일 이내에 확인 후 안내해 드리겠습니다.',
          ],
        },
        {
          icon: Coins,
          title: '패스 · 크레딧',
          body: [
            '시험 패스와 크레딧은 일회성 상품입니다. 구매일로부터 7일 이내이고 사용하지 않으신 경우 전액 환불이 가능하며, 이미 사용하신 크레딧이나 패스 이용분은 환불되지 않습니다.',
            '구매하신 크레딧은 만료되지 않으며, 시험 패스는 각 패스에 표시된 만료일까지 유효합니다. 시험 패스는 구독과 별개로 유지됩니다.',
          ],
        },
      ]
    : [
        {
          icon: CreditCard,
          title: 'Billing',
          body: [
            'Paid Classraum Study subscriptions renew and charge automatically each month (or at your plan’s interval) to the card you registered at checkout. All prices shown include VAT.',
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
            'Under Korea’s Act on Consumer Protection in Electronic Commerce, you may request a full refund within 7 days of payment if you have not used the paid content (e.g. generating a mock test).',
            'If you cancel mid-period after you’ve started using the service, we refund the remaining amount on a pro-rata basis, less the portion of the period and the credits you’ve already used.',
            'If you believe you were charged in error, contact us — we’ll review and respond within 3 business days.',
          ],
        },
        {
          icon: Coins,
          title: 'Passes & credits',
          body: [
            'Exam passes and credits are one-time purchases. They’re fully refundable within 7 days of purchase if unused; credits or pass access you’ve already used are non-refundable.',
            'Purchased credits never expire, and each exam pass stays valid until the expiry date shown on it, independent of any subscription.',
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
