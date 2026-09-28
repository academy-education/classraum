import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { EmailOtpType } from '@supabase/supabase-js'

/**
 * GET /auth/confirm?token_hash=…&type=…&next=…
 *
 * Where every auth-email link lands (built by src/app/api/auth/email-hook).
 * The token_hash is verified HERE, server-side, so the link works on any
 * subdomain and regardless of Supabase's Site URL — the old email-confirm
 * path bounced through the marketing origin, exchanged the code client-side
 * there, and pushed /dashboard, which is the wrong origin for the cookies
 * and the wrong destination for a student (see the recovery flow's history
 * in ../callback/route.ts).
 *
 * The browser client stores its session in localStorage, not cookies, so
 * we hand the tokens to /auth the same way the recovery flow does
 * (`?type=…&access_token&refresh_token`); the page calls setSession and
 * then its normal role/invite/?next redirect runs. Tokens in a query string
 * is the pattern the reset flow already relies on; they are single-use
 * session tokens for a session that was just created for this browser.
 */
const LINK_TYPES: ReadonlySet<string> = new Set(['signup', 'email', 'magiclink', 'invite', 'email_change', 'recovery'])

function normalizedOrigin(url: URL): string {
  if (url.hostname === 'app.www.classraum.com') return url.origin.replace('app.www.classraum.com', 'app.classraum.com')
  return url.origin
}

/** Only a same-origin relative path may be a `next`; anything else is dropped. */
function safeNext(raw: string | null): string | null {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return null
  return raw
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const origin = normalizedOrigin(url)
  const tokenHash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type') ?? ''
  const next = safeNext(url.searchParams.get('next'))
  // `link` carries the type so the auth page can offer the right remedy
  // (a new reset link vs. a new confirmation email).
  const fail = (reason: string) => NextResponse.redirect(`${origin}/auth?error=confirm_link_invalid&link=${encodeURIComponent(type || 'unknown')}&reason=${encodeURIComponent(reason)}`)

  if (!tokenHash || !LINK_TYPES.has(type)) return fail('missing')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  )
  const { data, error } = await supabase.auth.verifyOtp({ type: type as EmailOtpType, token_hash: tokenHash })
  if (error || !data.session) return fail(error?.message ?? 'no_session')

  const { access_token, refresh_token } = data.session
  if (type === 'recovery') {
    return NextResponse.redirect(`${origin}/auth?type=reset&access_token=${access_token}&refresh_token=${refresh_token}`)
  }

  // `next` is normally `/auth?<the signup's own query>` (invite, role, lang…)
  // so the page's existing redirect logic sees exactly what it would have
  // seen on an immediate sign-in. Any other path is carried as ?next.
  const dest = new URL(next && next.startsWith('/auth') ? `${origin}${next}` : `${origin}/auth`)
  if (next && !next.startsWith('/auth')) dest.searchParams.set('next', next)
  dest.searchParams.set('type', 'confirmed')
  dest.searchParams.set('access_token', access_token)
  dest.searchParams.set('refresh_token', refresh_token)
  return NextResponse.redirect(dest.toString())
}
