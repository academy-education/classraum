"use client"

import { Sparkles, ListChecks } from '../../_shared/icons'

/**
 * "You've seen everything we have — more are being written."
 *
 * Shown when the assemble route refuses a draw (409). It is NOT an error
 * screen, and the difference matters: the request succeeded, no credit
 * was spent, and "try again" would fail identically every time. A
 * failure toast would invite exactly that.
 *
 * Two reasons, two messages. `no_bank_coverage` means we never wrote
 * questions for this section (TOEFL Speaking, Listening, Writing have
 * no practice bank); `pool_exhausted` means the student finished the
 * ones we did. Telling a Speaking student they had "seen every
 * question" would be false — there were none.
 */
export function BankExhaustedSheet({
  reason, unseen, ko, onClose,
}: {
  reason: 'pool_exhausted' | 'no_bank_coverage'
  unseen: number
  ko: boolean
  onClose: () => void
}) {
  const exhausted = reason === 'pool_exhausted'
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-[420px] bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary inline-flex items-center justify-center">
          {exhausted ? <Sparkles className="w-6 h-6" /> : <ListChecks className="w-6 h-6" />}
        </div>

        <h2 className="text-[19px] font-bold text-gray-900 mt-3 leading-tight">
          {exhausted
            ? (ko ? '새 문제를 만들고 있어요' : 'We are writing more questions')
            : (ko ? '아직 준비 중인 영역이에요' : 'This section is not ready yet')}
        </h2>

        <p className="text-[13.5px] text-gray-600 mt-2 leading-relaxed">
          {exhausted
            ? (ko
                ? '이 영역의 문제를 모두 풀었어요. 이미 본 문제로 시험을 만들면 실력이 아니라 기억을 재는 셈이라, 새 문제가 준비될 때까지 기다려 주세요.'
                : 'You have worked through every question we have for this section. Building a test out of ones you have already answered would measure memory rather than skill, so we would rather wait until there are new ones.')
            : (ko
                ? '이 영역은 아직 문제 은행이 없어요. 준비되면 알려드릴게요.'
                : 'We have not banked questions for this section yet. It will appear here once we have.')}
        </p>

        {exhausted && unseen > 0 && (
          <p className="text-[12px] text-gray-400 mt-2 tabular-nums">
            {ko ? `남은 새 문제 ${unseen}개 — 한 세트를 채우기엔 부족해요.`
                : `${unseen} unseen ${unseen === 1 ? 'question' : 'questions'} left — not enough for a full set.`}
          </p>
        )}

        <p className="text-[12px] text-gray-400 mt-3 leading-relaxed">
          {ko ? '크레딧은 차감되지 않았어요.' : 'You were not charged a credit.'}
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-full bg-primary text-white text-[14px] font-semibold py-3 transition-opacity hover:opacity-90 active:scale-[0.99]"
        >
          {ko ? '확인' : 'Got it'}
        </button>
      </div>
    </div>
  )
}
