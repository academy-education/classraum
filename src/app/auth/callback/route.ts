import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { type EmailOtpType } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

export async function GET(request: Request) {
  const { searchParams, origin, hostname } = new URL(request.url)

  // Normalize the origin to ensure we always use app.classraum.com in production
  let normalizedOrigin = origin
  if (!hostname.includes('localhost')) {
    // In production, ensure we use app.classraum.com (not app.www.classraum.com)
    if (hostname === 'app.www.classraum.com') {
      normalizedOrigin = origin.replace('app.www.classraum.com', 'app.classraum.com')
    }
  }
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const token = searchParams.get('token')
  const type = searchParams.get('type') as EmailOtpType | null
  const access_token = searchParams.get('access_token')
  const refresh_token = searchParams.get('refresh_token')

  // Handle different auth callback flows based on parameters

  const cookieStore = await cookies()

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )

  // Social sign-in returns here too, and its `code` is INDISTINGUISHABLE
  // from an email-confirmation `code` — same parameter, same route. The
  // `flow=oauth` marker is put on `redirectTo` by markOAuthFlow() purely
  // so this branch can exist without changing what any other flow does.
  //
  // Forwarded to /auth (not exchanged here) because the post-return
  // wiring — the takeover check, the stored invite context, the call to
  // /api/academy/join — needs the browser-side Supabase client that holds
  // the PKCE verifier. Every param is passed through, including the
  // `error`/`error_description` a denied consent arrives with.
  if (searchParams.get('flow') === 'oauth') {
    return NextResponse.redirect(`${normalizedOrigin}/auth?${searchParams.toString()}`)
  }

  // Handle password recovery flow - check for various formats
  if (type === 'recovery' || (access_token && refresh_token)) {
    // If we have access_token and refresh_token, redirect with tokens
    if (access_token && refresh_token) {
      return NextResponse.redirect(`${normalizedOrigin}/auth?type=reset&access_token=${access_token}&refresh_token=${refresh_token}`)
    }

    // If we have token_hash or token, verify OTP and create session
    if (token_hash || token) {
      let verifyParams: any
      if (token_hash) {
        verifyParams = { type: 'recovery' as EmailOtpType, token_hash }
      } else {
        verifyParams = { type: 'recovery' as EmailOtpType, token: token! }
      }

      try {
        const { data, error } = await supabase.auth.verifyOtp(verifyParams)

        if (!error && data.session) {
          const { access_token, refresh_token } = data.session
          return NextResponse.redirect(`${normalizedOrigin}/auth?type=reset&access_token=${access_token}&refresh_token=${refresh_token}`)
        } else {
          return NextResponse.redirect(`${normalizedOrigin}/auth?error=invalid_reset_link`)
        }
      } catch {
        return NextResponse.redirect(`${origin}/auth?error=invalid_reset_link`)
      }
    }

    // PKCE recovery: the link carries `code`, not token_hash/token.
    //
    // This case fell straight through to invalid_reset_link below, so
    // whether a reset worked depended on which link format the project
    // happened to emit. Supabase sends `code` whenever the PKCE flow is
    // in use, which is the default for the JS client that requested the
    // reset — so this was the LIKELY branch, not an exotic one.
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error && data.session) {
        const { access_token, refresh_token } = data.session
        return NextResponse.redirect(
          `${normalizedOrigin}/auth?type=reset&access_token=${access_token}&refresh_token=${refresh_token}`,
        )
      }
      return NextResponse.redirect(`${normalizedOrigin}/auth?error=invalid_reset_link`)
    }

    // No code, no token, no tokens — nothing to exchange.
    return NextResponse.redirect(`${normalizedOrigin}/auth?error=invalid_reset_link`)
  }

  // Handle email confirmation flow (existing flow)
  if (code && type === 'email') {
    return NextResponse.redirect(`${normalizedOrigin}/?${searchParams.toString()}`)
  }

  // For other flows, redirect to root page
  if (code) {
    return NextResponse.redirect(`${normalizedOrigin}/?${searchParams.toString()}`)
  }

  // Fallback
  return NextResponse.redirect(`${normalizedOrigin}/auth`)
}