'use client'

/**
 * The three audiences this one URL has to serve, and why each branch exists.
 *
 *  1. INSIDE THE NATIVE APP. Android's manifest intent-filter has no path
 *     restriction, so it claims every app.classraum.com URL — this page WILL
 *     render inside the app there, and on iOS once /invite/* is claimed via
 *     the AASA. Showing "download the app" to someone already in the app is
 *     the obvious failure, so native redirects straight to /auth and never
 *     paints the store UI.
 *  2. MOBILE WEB, no app. The actual gap this page was built for: offer the
 *     store, and a way to continue in the browser.
 *  3. DESKTOP. No app to install, so the store buttons are noise — go
 *     straight through, same as today's behaviour.
 *
 * The code is stashed via savePendingReferral on mount in every case, so it
 * survives the wander through /auth, email confirmation and onboarding
 * before there is an account to attach it to.
 *
 * NOT SOLVED HERE, deliberately: a code cannot survive a STORE install.
 * localStorage does not cross that boundary, and real deferred deep-linking
 * needs an attribution SDK (Branch/AppsFlyer) — a new vendor and a new
 * privacy disclosure on both stores. So the code is shown large with a copy
 * button, and /auth accepts it by hand. If that conversion step proves too
 * lossy, an SDK is the fix; pretending otherwise would just lose the
 * attribution silently.
 */

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Capacitor } from '@capacitor/core'
import { Check, Copy } from '@/app/mobile/study/_shared/icons'
import { useTranslation } from '@/hooks/useTranslation'
import { savePendingReferral } from '@/lib/study/pending-referral'
import { appStoreUrl, detectPlatform, PLAY_STORE_URL, type DevicePlatform } from '@/lib/deeplinks'
import { REFERRAL_PREMIUM_CREDITS, REFERRAL_SIGNUP_CREDITS } from '@/lib/study/referral'
import { StudyButton, studyButtonClass } from '@/app/mobile/study/_shared/StudyButton'

export function InviteLanding({ code }: { code: string }) {
  const router = useRouter()
  const { language } = useTranslation()
  const ko = language === 'korean'

  // 'pending' until the effect runs: rendering the store UI during SSR and
  // then yanking it away on hydration is a visible flash for the native and
  // desktop cases, both of which are leaving immediately anyway.
  const [platform, setPlatform] = useState<DevicePlatform | 'pending'>('pending')
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')

  const continueUrl = `/auth?intent=study&ref=${encodeURIComponent(code)}`

  useEffect(() => {
    // Stash first, unconditionally — before any redirect can unmount this.
    savePendingReferral(code)

    if (Capacitor.isNativePlatform()) {
      router.replace(continueUrl)
      return
    }
    const p = detectPlatform(navigator.userAgent, navigator.maxTouchPoints)
    if (p === 'desktop') {
      router.replace(continueUrl)
      return
    }
    setPlatform(p)
  }, [code, continueUrl, router])

  const copy = useCallback(async () => {
    try {
      if (!navigator.clipboard) throw new Error('no clipboard api')
      await navigator.clipboard.writeText(code)
      setCopyState('copied')
      setTimeout(() => setCopyState('idle'), 1800)
    } catch {
      // A SILENT failure here loses the referral. writeText throws
      // NotAllowedError in exactly the browser most of these links arrive in
      // — KakaoTalk's in-app webview — and the previous version swallowed it,
      // leaving the button reading "copy" while the clipboard stayed empty.
      // The student then walks to the store with nothing, which is the one
      // outcome this screen exists to prevent.
      //
      // The code is displayed large and `select-all`, so long-press works;
      // that is only a fallback if we SAY so.
      setCopyState('failed')
    }
  }, [code])

  // Native and desktop are mid-redirect; painting the invite would flash.
  if (platform === 'pending' || platform === 'desktop') {
    return <div className="min-h-dvh bg-gray-50" aria-hidden="true" />
  }

  const ios = appStoreUrl()

  return (
    <main className="min-h-dvh bg-gray-50 px-5 py-10 flex flex-col items-center justify-center">
      <div className="w-full max-w-sm space-y-5">
        <header className="text-center space-y-2">
          <h1 className="text-[22px] font-bold text-gray-900 leading-snug break-keep">
            {ko ? '친구가 Classraum에 초대했어요' : 'A friend invited you to Classraum'}
          </h1>
          <p className="text-[13.5px] text-gray-600 leading-relaxed break-keep">
            {ko
              ? 'AI가 만들어주는 SAT · TOEFL · 수능 모의고사로 친구와 함께 공부해요.'
              : 'AI-built SAT, TOEFL and Suneung (Korean CSAT) practice tests.'}
          </p>
        </header>

        <section className="rounded-2xl bg-white ring-1 ring-gray-200/70 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5 space-y-4">
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-2">
              {ko ? '초대 코드' : 'Invite code'}
            </p>
            <div className="inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-primary/5 ring-1 ring-primary/20">
              <span className="text-[32px] font-bold tracking-[0.18em] text-primary tabular-nums select-all">
                {code}
              </span>
            </div>
            <p className="text-[12.5px] text-gray-500 mt-3 leading-relaxed break-keep">
              {ko
                ? `가입하면 둘 다 크레딧 ${REFERRAL_SIGNUP_CREDITS}개, 프리미엄으로 업그레이드하면 각각 ${REFERRAL_PREMIUM_CREDITS}개를 더 받아요.`
                : `You both get ${REFERRAL_SIGNUP_CREDITS} credit when you sign up, and ${REFERRAL_PREMIUM_CREDITS} more each when you go Premium.`}
            </p>
          </div>

          {/* Copy sits above the store buttons on purpose: the code does NOT
              survive a store install, so it has to be in the clipboard
              BEFORE the user leaves for the store. */}
          {/* variant="primary": this is the most important control on the
              screen. It was secondary — white on a white card, the weakest
              element present — while the store link below was solid black,
              which argued the opposite of the comment above it. */}
          <StudyButton
            type="button"
            variant="primary"
            size="lg"
            fullWidth
            square
            onClick={() => void copy()}
            leftIcon={copyState === 'copied' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          >
            {copyState === 'copied'
              ? (ko ? '복사됐어요!' : 'Copied!')
              : (ko ? '코드 복사하기' : 'Copy invite code')}
          </StudyButton>

          {copyState === 'failed' && (
            <p role="status" className="text-[12px] text-amber-700 bg-amber-50 ring-1 ring-amber-200/70 rounded-xl px-3 py-2 text-center leading-relaxed break-keep">
              {ko
                ? '자동 복사가 안 됐어요. 위 코드를 길게 눌러 복사해 주세요.'
                : 'Automatic copying was blocked. Press and hold the code above to copy it.'}
            </p>
          )}

          <p className="text-[11.5px] text-gray-500 text-center leading-relaxed break-keep">
            {ko
              ? '앱을 설치하고 가입할 때 이 코드를 입력하면 돼요.'
              : 'Enter this code when you sign up in the app.'}
          </p>
        </section>

        <div className="space-y-2">
          {platform === 'ios' && ios && (
            <a
              href={ios}
              className={studyButtonClass({ variant: 'secondary', size: 'lg', fullWidth: true, square: true })}
            >
              {ko ? 'App Store에서 다운로드' : 'Download on the App Store'}
            </a>
          )}
          {platform === 'android' && (
            <a
              href={PLAY_STORE_URL}
              className={studyButtonClass({ variant: 'secondary', size: 'lg', fullWidth: true, square: true })}
            >
              {ko ? 'Google Play에서 받기' : 'Get it on Google Play'}
            </a>
          )}
          {/* 'unknown' is a mobile browser we could not classify. Showing both
              beats guessing wrong and sending an Android user to the App
              Store. Same when the iOS listing id is somehow unavailable. */}
          {(platform === 'unknown' || (platform === 'ios' && !ios)) && (
            <>
              {ios && (
                <a
                  href={ios}
                  className={studyButtonClass({ variant: 'secondary', size: 'lg', fullWidth: true, square: true })}
                >
                  {ko ? 'App Store에서 다운로드' : 'Download on the App Store'}
                </a>
              )}
              <a
                href={PLAY_STORE_URL}
                className={studyButtonClass({ variant: 'secondary', size: 'lg', fullWidth: true, square: true })}
              >
                {ko ? 'Google Play에서 받기' : 'Get it on Google Play'}
              </a>
            </>
          )}

          <button
            type="button"
            onClick={() => router.push(continueUrl)}
            className="w-full h-12 rounded-xl text-[14px] font-medium text-gray-600 hover:text-gray-900 transition"
          >
            {ko ? '앱 없이 계속하기' : 'Continue without the app'}
          </button>
        </div>
      </div>
    </main>
  )
}
