"use client"

import { Button } from "@/components/ui/button"
import {
  enabledProviders,
  PROVIDER_LABEL,
  type OAuthProvider,
} from "@/lib/auth/oauth-providers"

/**
 * The social sign-in strip.
 *
 * RENDERS NOTHING when `NEXT_PUBLIC_OAUTH_PROVIDERS` is unset or empty —
 * not a disabled button, not a divider, nothing. That is the property
 * that lets this ship before the Google/Kakao/Apple consoles exist: with
 * the flag off the auth page is the page that shipped before, and a user
 * cannot reach a provider that has no client id.
 *
 * The strip is rendered by the caller only on the sign-in and sign-up
 * tabs; password reset has no social equivalent.
 */

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84a10.1 10.1 0 0 1-4.4 6.64v5.52h7.12c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.12-5.52c-1.97 1.32-4.49 2.1-7.44 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7A22 22 0 0 0 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18A13.2 13.2 0 0 1 11 24c0-1.45.25-2.86.69-4.18v-5.7H4.34A22 22 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  )
}

function KakaoMark() {
  // KakaoTalk's speech bubble, drawn in #191600 to sit on the #FEE500
  // brand background — the pairing Kakao's design guide requires.
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true" fill="#191600">
      <path d="M12 3C6.99 3 3 6.24 3 10.23c0 2.56 1.7 4.8 4.25 6.07-.19.68-.68 2.47-.78 2.85-.13.48.17.47.36.34.15-.1 2.37-1.61 3.33-2.26.6.09 1.21.14 1.84.14 5.01 0 9-3.24 9-7.14C21 6.24 17.01 3 12 3z" />
    </svg>
  )
}

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true" fill="currentColor">
      <path d="M16.36 12.78c-.02-2.2 1.8-3.26 1.88-3.31-1.02-1.5-2.61-1.7-3.18-1.73-1.35-.14-2.64.8-3.33.8-.69 0-1.75-.78-2.87-.76-1.48.02-2.84.86-3.6 2.18-1.53 2.66-.39 6.6 1.1 8.76.73 1.06 1.6 2.25 2.75 2.21 1.1-.05 1.52-.71 2.85-.71 1.33 0 1.71.71 2.87.69 1.19-.02 1.94-1.08 2.66-2.14.84-1.23 1.19-2.42 1.21-2.48-.03-.01-2.32-.89-2.34-3.51zM14.2 6.3c.61-.74 1.02-1.77.91-2.8-.88.04-1.94.59-2.57 1.32-.56.65-1.05 1.7-.92 2.7.98.08 1.98-.5 2.58-1.22z" />
    </svg>
  )
}

const MARKS: Record<OAuthProvider, () => React.JSX.Element> = {
  kakao: KakaoMark,
  google: GoogleMark,
  apple: AppleMark,
}

/**
 * Brand chrome. Kakao and Apple both publish button specs that a plain
 * outline button would violate; Google's permits a white button with the
 * coloured mark, which is what `outline` already is.
 */
const CHROME: Record<OAuthProvider, string> = {
  kakao: 'bg-[#FEE500] text-[#191600] ring-1 ring-black/5 hover:bg-[#F5DC00]',
  google: '',
  apple: 'bg-black text-white ring-1 ring-black hover:bg-black/90',
}

export interface SocialAuthButtonsProps {
  onSelect: (provider: OAuthProvider) => void
  /** Provider currently mid-redirect, if any. */
  busyProvider?: OAuthProvider | null
  /** Disable the whole strip (e.g. a password submit is in flight). */
  disabled?: boolean
  t: (key: string, params?: Record<string, string | number | undefined>) => string
  /** Providers to show. Defaults to the env flag; injected for tests. */
  providers?: OAuthProvider[]
}

export function SocialAuthButtons({
  onSelect,
  busyProvider,
  disabled,
  t,
  providers,
}: SocialAuthButtonsProps) {
  const list = providers ?? enabledProviders()
  if (list.length === 0) return null

  return (
    <div className="space-y-3 pointer-events-auto" data-testid="social-auth-buttons">
      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">{t('auth.social.divider')}</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="space-y-2">
        {list.map((provider) => {
          const Mark = MARKS[provider]
          const busy = busyProvider === provider
          return (
            <Button
              key={provider}
              type="button"
              variant="outline"
              // Any provider being busy disables the others: a second
              // redirect started mid-flight would overwrite the stored
              // signup context with a different provider's.
              disabled={disabled || Boolean(busyProvider)}
              onClick={() => onSelect(provider)}
              className={`w-full h-10 ${CHROME[provider]}`}
            >
              <Mark />
              {busy
                ? t('auth.social.signingIn', { provider: PROVIDER_LABEL[provider] })
                : t('auth.social.continueWith', { provider: PROVIDER_LABEL[provider] })}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
