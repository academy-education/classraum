"use client"
import { useEffect, useState } from 'react'
import { MailCheck, X } from 'lucide-react'
import { db } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'

/**
 * "Verify your email" for accounts that never proved their mailbox.
 *
 * Every password account created before 2026-09-28 was auto-confirmed by
 * Supabase, so `email_confirmed_at` says nothing; `users.email_verified_at`
 * (migration 108) is the real record, and it is NULL for all of them. The
 * banner sends a magic link (the hook mails it as "Verify your email"),
 * and /auth/confirm stamps the column when the link is used. Provider
 * accounts were backfilled (Google/Apple vouch for the address), so the
 * banner never shows for them.
 *
 * Snoozed per device for a week on dismiss; disappears for good once
 * verified. Renders nothing while it does not yet know.
 */
const SNOOZE_KEY = 'classraum.verifyEmailBanner.snoozedUntil'
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000

export function VerifyEmailBanner({ className = '' }: { className?: string }) {
  const { language } = useTranslation()
  const ko = language === 'korean'
  const [show, setShow] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const until = Number(window.localStorage.getItem(SNOOZE_KEY) ?? 0)
        if (until > Date.now()) return
      } catch { /* no storage: show */ }
      const { data } = await db.auth.getUser()
      const u = data.user
      if (!u?.email) return
      // Only password accounts; a provider-vouched address is already verified (backfilled).
      const providers = (u.app_metadata?.providers as string[] | undefined) ?? [u.app_metadata?.provider as string]
      if (providers.some(p => p && p !== 'email')) return
      const { data: row } = await db.from('users').select('email_verified_at').eq('id', u.id).maybeSingle()
      if (cancelled) return
      if (row && (row as { email_verified_at: string | null }).email_verified_at) return
      setEmail(u.email)
      setShow(true)
    })()
    return () => { cancelled = true }
  }, [])

  if (!show || !email) return null

  const send = async () => {
    if (state === 'sending' || state === 'sent') return
    setState('sending')
    const { error } = await db.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth?verify=1`, shouldCreateUser: false },
    })
    setState(error ? 'error' : 'sent')
  }
  const dismiss = () => {
    try { window.localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS)) } catch { /* ignore */ }
    setShow(false)
  }

  return (
    <div className={`relative rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3.5 pr-10 ${className}`} data-testid="verify-email-banner">
      <button type="button" onClick={dismiss} aria-label={ko ? '닫기' : 'Dismiss'}
        className="absolute top-2.5 right-2.5 inline-flex h-7 w-7 items-center justify-center rounded-full text-sky-700 hover:bg-sky-100">
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-white ring-1 ring-sky-200">
          <MailCheck className="h-4 w-4 text-sky-600" />
        </div>
        <div className="min-w-0 text-[13px] leading-relaxed text-sky-900">
          <p className="font-semibold">{ko ? '이메일 주소를 인증해 주세요' : 'Verify your email address'}</p>
          {state === 'sent' ? (
            <p className="mt-0.5 text-sky-800">{ko ? `${email} 으로 인증 메일을 보냈어요. 메일의 버튼을 눌러 주세요.` : `We sent a verification email to ${email}. Press the button in it.`}</p>
          ) : (
            <>
              <p className="mt-0.5 text-sky-800">{ko ? `${email} 이(가) 본인 주소인지 확인하면 비밀번호 재설정과 알림을 안전하게 받을 수 있어요.` : `Confirming ${email} is yours keeps password resets and notices reaching you.`}</p>
              <button type="button" onClick={() => void send()} disabled={state === 'sending'}
                className="mt-2 rounded-lg bg-sky-600 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-sky-700 disabled:opacity-60">
                {state === 'sending' ? (ko ? '보내는 중…' : 'Sending…') : (ko ? '인증 메일 보내기' : 'Send verification email')}
              </button>
              {state === 'error' && <p className="mt-1 text-rose-600">{ko ? '보내지 못했어요. 잠시 후 다시 시도해 주세요.' : "Couldn't send. Please try again in a moment."}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
