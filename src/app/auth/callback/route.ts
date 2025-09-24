import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { type EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const token = searchParams.get('token')
  const type = searchParams.get('type') as EmailOtpType | null
  const access_token = searchParams.get('access_token')
  const refresh_token = searchParams.get('refresh_token')

  // Handle different auth callback flows based on parameters

  const cookieStore = await cookies()

  const supabase = createServerClient(
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

  // Handle password recovery flow - check for various formats
  if (type === 'recovery' || (access_token && refresh_token)) {
    // If we have access_token and refresh_token, redirect with tokens
    if (access_token && refresh_token) {
      return NextResponse.redirect(`${origin}/auth?type=reset&access_token=${access_token}&refresh_token=${refresh_token}`)
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
          return NextResponse.redirect(`${origin}/auth?type=reset&access_token=${access_token}&refresh_token=${refresh_token}`)
        } else {
          return NextResponse.redirect(`${origin}/auth?error=invalid_reset_link`)
        }
      } catch {
        return NextResponse.redirect(`${origin}/auth?error=invalid_reset_link`)
      }
    }

    // If we reach here, something went wrong
    return NextResponse.redirect(`${origin}/auth?error=invalid_reset_link`)
  }

  // Handle email confirmation flow (existing flow)
  if (code && type === 'email') {
    return NextResponse.redirect(`${origin}/?${searchParams.toString()}`)
  }

  // For other flows, redirect to root page
  if (code) {
    return NextResponse.redirect(`${origin}/?${searchParams.toString()}`)
  }

  // Fallback
  return NextResponse.redirect(`${origin}/auth`)
}