"use client"

import Link from 'next/link'
import { Coins, Loader2 } from '@/app/mobile/study/_shared/icons'

/**
 * Credit-spend confirmation — shown before any one-tap test start that
 * consumes credits (bank SAT full tests, the baseline diagnostic). The
 * customization sheet has its own inline cost line, so it doesn't use
 * this. Keeps the charge honest: students always see the cost and
 * confirm before a credit leaves their balance.
 */
export function CreditConfirmSheet({ open, cost, busy, ko, onConfirm, onCancel }: {
  open: boolean
  cost: number
  busy: boolean
  ko: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-6">
      {/* Whole-screen blur, matching the logout dialog treatment. */}
      <button
        type="button"
        aria-label={ko ? '닫기' : 'Close'}
        onClick={busy ? undefined : onCancel}
        className="absolute inset-0 bg-gray-900/30 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-[320px] rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex flex-col items-center text-center gap-2.5">
          <span className="w-11 h-11 rounded-full bg-amber-500/15 text-amber-600 flex items-center justify-center">
            <Coins className="w-5 h-5" />
          </span>
          <p className="text-[16px] font-bold text-gray-900">
            {ko ? `크레딧 ${cost}개를 사용할까요?` : `Use ${cost} credit${cost === 1 ? '' : 's'} to start?`}
          </p>
          <p className="text-[12.5px] text-gray-500 leading-relaxed">
            {ko
              ? `이 테스트를 시작하면 테스트 크레딧 ${cost}개가 사용돼요. 테스트 생성에 실패하면 자동으로 환불돼요.`
              : `Starting this test uses ${cost} test credit${cost === 1 ? '' : 's'}. If the test fails to generate, they're refunded automatically.`}
          </p>
        </div>
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
            {ko ? '시작하기' : 'Start'}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Out-of-credits popup — shown when a test start comes back 402. The
 * old behavior silently redirected to the subscription page; this makes
 * the situation explicit and gives the student the choice: cancel, or
 * go buy credits (the store's top-up grid).
 */
export function NoCreditsSheet({ open, cost, ko, onCancel }: {
  open: boolean
  cost: number
  ko: boolean
  onCancel: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-6">
      <button
        type="button"
        aria-label={ko ? '닫기' : 'Close'}
        onClick={onCancel}
        className="absolute inset-0 bg-gray-900/30 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-[320px] rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex flex-col items-center text-center gap-2.5">
          <span className="w-11 h-11 rounded-full bg-amber-500/15 text-amber-600 flex items-center justify-center">
            <Coins className="w-5 h-5" />
          </span>
          <p className="text-[16px] font-bold text-gray-900">
            {ko ? '크레딧이 부족해요' : 'Not enough credits'}
          </p>
          <p className="text-[12.5px] text-gray-500 leading-relaxed">
            {ko
              ? `이 테스트에는 크레딧 ${cost}개가 필요해요. 크레딧을 구매하면 바로 시작할 수 있어요.`
              : `This test needs ${cost} credit${cost === 1 ? '' : 's'}. Top up and you can start right away.`}
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
  )
}
