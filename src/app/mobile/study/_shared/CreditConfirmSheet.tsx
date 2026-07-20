"use client"

import Link from 'next/link'
import { Coins, Loader2 } from '@/app/mobile/study/_shared/icons'
import { ModalPortal } from '@/components/ui/modal-portal'

/**
 * Credit-spend confirmation — shown before any one-tap test start that
 * consumes credits (bank SAT full tests, the baseline diagnostic). The
 * customization sheet has its own inline cost line, so it doesn't use
 * this. Keeps the charge honest: students always see the cost and
 * confirm before a credit leaves their balance.
 *
 * Structure deliberately mirrors the profile page's logout dialog
 * EXACTLY (ModalPortal → full-screen bg-black/40 backdrop-blur overlay
 * at z-9998 + separate centered card layer at z-9999, no enter
 * animation): a fade-in here left the page's own frosted elements
 * (sticky header band, rounded pill chips) visible as a "partial
 * rounded blur" before the full-screen blur finished ramping in.
 */
export function CreditConfirmSheet({ open, cost, busy, ko, onConfirm, onCancel, title, description, confirmLabel, passCredits, passLabel, source, onSourceChange }: {
  open: boolean
  cost: number
  busy: boolean
  ko: boolean
  onConfirm: () => void
  onCancel: () => void
  /** Optional copy overrides — the defaults speak about "this test";
   *  surfaces spending on something else (e.g. the path repeat) pass
   *  their own bilingual strings. */
  title?: string
  description?: string
  confirmLabel?: string
  /** When the student holds test-scoped pass credits for this test, offer
   *  a choice between spending those or a regular credit. Omit to hide. */
  passCredits?: number
  passLabel?: string
  source?: 'pass' | 'regular'
  onSourceChange?: (s: 'pass' | 'regular') => void
}) {
  const showSource = !!onSourceChange && (passCredits ?? 0) > 0
  if (!open) return null
  return (
    <ModalPortal>
      <div
        className="fixed inset-0 backdrop-blur-sm bg-black/40 z-[9998]"
        onClick={busy ? undefined : onCancel}
      />
      <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
          <div className="flex flex-col items-center text-center gap-2.5">
            <span className="w-11 h-11 rounded-full bg-amber-500/15 text-amber-600 flex items-center justify-center">
              <Coins className="w-5 h-5" />
            </span>
            <p className="text-[16px] font-bold text-gray-900">
              {title ?? (ko ? `크레딧 ${cost}개를 사용할까요?` : `Use ${cost} credit${cost === 1 ? '' : 's'} to start?`)}
            </p>
            <p className="text-[12.5px] text-gray-500 leading-relaxed">
              {description ?? (ko
                ? `이 테스트를 시작하면 테스트 크레딧 ${cost}개가 사용돼요. 테스트 생성에 실패하면 자동으로 환불돼요.`
                : `Starting this test uses ${cost} test credit${cost === 1 ? '' : 's'}. If the test fails to generate, they're refunded automatically.`)}
            </p>
          </div>
          {showSource && (
            <div className="mt-4">
              <p className="text-[11.5px] font-medium text-gray-500 mb-1.5 px-0.5">
                {ko ? '어떤 크레딧을 사용할까요?' : 'Which credit should we use?'}
              </p>
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-gray-100">
                <button
                  type="button"
                  onClick={() => onSourceChange?.('pass')}
                  disabled={busy}
                  className={`h-10 rounded-lg text-[12.5px] font-semibold inline-flex items-center justify-center gap-1 transition-all ${
                    source === 'pass' ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-indigo-200' : 'text-gray-500'
                  }`}
                >
                  {passLabel ?? (ko ? '패스' : 'Pass')}
                  <span className="tabular-nums text-[11px] opacity-70">{passCredits}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSourceChange?.('regular')}
                  disabled={busy}
                  className={`h-10 rounded-lg text-[12.5px] font-semibold transition-all ${
                    source === 'regular' ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200' : 'text-gray-500'
                  }`}
                >
                  {ko ? '일반 크레딧' : 'Regular'}
                </button>
              </div>
            </div>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="h-11 rounded-full bg-gray-100 text-gray-700 text-[13.5px] font-semibold active:scale-[0.98] disabled:opacity-60 transition-all"
            >
              {ko ? '취소' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              className="h-11 rounded-full bg-primary text-white text-[13.5px] font-semibold shadow-[0_2px_8px_rgba(40,133,232,0.28)] inline-flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-60 transition-all"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {confirmLabel ?? (ko ? '시작하기' : 'Start')}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}

/**
 * Out-of-credits popup — shown when a test start comes back 402. The
 * old behavior silently redirected to the subscription page; this makes
 * the situation explicit and gives the student the choice: cancel, or
 * go buy credits (the store's top-up grid). Same logout-style structure
 * as CreditConfirmSheet above.
 */
export function NoCreditsSheet({ open, cost, ko, onCancel, description }: {
  open: boolean
  cost: number
  ko: boolean
  onCancel: () => void
  /** Optional copy override — default speaks about "this test". */
  description?: string
}) {
  if (!open) return null
  return (
    <ModalPortal>
      <div
        className="fixed inset-0 backdrop-blur-sm bg-black/40 z-[9998]"
        onClick={onCancel}
      />
      <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
          <div className="flex flex-col items-center text-center gap-2.5">
            <span className="w-11 h-11 rounded-full bg-amber-500/15 text-amber-600 flex items-center justify-center">
              <Coins className="w-5 h-5" />
            </span>
            <p className="text-[16px] font-bold text-gray-900">
              {ko ? '크레딧이 부족해요' : 'Not enough credits'}
            </p>
            <p className="text-[12.5px] text-gray-500 leading-relaxed">
              {description ?? (ko
                ? `이 테스트에는 크레딧 ${cost}개가 필요해요. 크레딧을 구매하면 바로 시작할 수 있어요.`
                : `This test needs ${cost} credit${cost === 1 ? '' : 's'}. Top up and you can start right away.`)}
            </p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="h-11 rounded-full bg-gray-100 text-gray-700 text-[13.5px] font-semibold active:scale-[0.98] transition-all"
            >
              {ko ? '취소' : 'Cancel'}
            </button>
            <Link
              href="/mobile/study/subscription"
              className="h-11 rounded-full bg-primary text-white text-[13.5px] font-semibold shadow-[0_2px_8px_rgba(40,133,232,0.28)] inline-flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
            >
              <Coins className="w-4 h-4" />
              {ko ? '크레딧 구매' : 'Buy credits'}
            </Link>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}
