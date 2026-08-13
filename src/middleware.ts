import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host')
  const url = request.nextUrl.clone()

  // Define routes that require authentication
  const protectedRoutes = [
    '/dashboard', '/students', '/classrooms', '/sessions', '/assignments',
    '/attendance', '/announcements', '/payments', '/reports', '/settings', '/teachers',
    '/families', '/parents', '/notifications', '/upgrade', '/mobile',
    '/archive', '/test-payment', '/order-summary', '/billing', '/messages', '/bank',
    // /exams-and-scores is the new URL; /level-tests stays in the protected
    // list so the redirect below (308) doesn't get short-circuited as
    // "unknown route → /auth" before the rename catches it.
    '/exams-and-scores', '/level-tests',
    '/admin', '/admin/academies', '/admin/users', '/admin/subscriptions',
    '/admin/analytics', '/admin/communications', '/admin/support', '/admin/system', '/admin/settings'
  ]

  // Permanent redirect from the old /level-tests/* URL to the new
  // /exams-and-scores/* URL. The route was renamed so the URL matches
  // the user-facing label ("Exams and Scores"). 308 preserves the
  // method + body for any unusual clients (most users hit this with GET
  // from a bookmark).
  if (url.pathname === '/level-tests' || url.pathname.startsWith('/level-tests/')) {
    const newPath = url.pathname.replace(/^\/level-tests/, '/exams-and-scores')
    const redirectUrl = new URL(newPath + url.search, url)
    return NextResponse.redirect(redirectUrl, 308)
  }

  // The seven legacy feature pages were consolidated into /features (the
  // smart-linking concept lives on as the homepage's unified-platform
  // section). 308 keeps old links and indexed URLs working.
  const FEATURE_REDIRECTS: Record<string, string> = {
    '/features/ai-report-cards': '/features#reports',
    '/features/customized-dashboard': '/features#dashboard',
    '/features/lesson-assignment-planner': '/features#sessions',
    '/features/attendance-recording': '/features#attendance',
    '/features/real-time-notifications': '/features#communication',
    '/features/smart-linking-system': '/#platform',
    '/features/privacy-by-design': '/features#privacy',
  }
  if (FEATURE_REDIRECTS[url.pathname]) {
    return NextResponse.redirect(new URL(FEATURE_REDIRECTS[url.pathname], url), 308)
  }

  // Public test-taker pages (no auth required; shareable link)
  // Match /test/{shareToken} but NOT /test-payment (which is protected)
  const isPublicTestRoute = url.pathname.startsWith('/test/') && !url.pathname.startsWith('/test-payment')

  // Public onboarding pages — admin-issued invite links for a new academy's
  // manager to sign up. Token in the URL gates access; the API validates it.
  const isOnboardingRoute = url.pathname.startsWith('/onboarding/')

  // Public friend-invite landing (/invite/CODE). MUST be listed: without it
  // the app-subdomain branch falls through to "redirect unknown routes to
  // /auth", which drops the path — and with it the referral code — so every
  // invite would arrive unattributed. The page reveals nothing about the
  // code (no lookup, by design); redemption still happens behind auth.
  const isInviteRoute = url.pathname.startsWith('/invite/')

  // Public account-deletion instructions (/account-deletion). MUST be listed
  // for the same reason /invite/ is: the app-subdomain branch below falls
  // through to "redirect unknown routes to /auth", and this page's entire
  // purpose is to be reachable WITHOUT an account. Google Play requires the
  // URL entered in Play Console to load for a reviewer who has never signed
  // in; a 307 to /auth fails that review. The native app loads
  // app.classraum.com, so the app-subdomain branch is the one that matters.
  // Exact match (not startsWith) — it is a single leaf page, and a prefix
  // match would silently open up any future /account-deletion-* route.
  const isAccountDeletionRoute = url.pathname === '/account-deletion'

  // Deletion aftermath pages (/account/goodbye, /account/reactivate). These
  // were unreachable on the app subdomain: neither is in protectedRoutes nor
  // any allowlist, so both fell through to the unknown-route redirect and
  // 307'd to /auth. Verified before fixing — the control path 307s too, so
  // the fallthrough is live.
  //
  // That broke the UNDO for a destructive, time-limited action. Requesting
  // deletion bans the auth identity and schedules a hard delete 30 days out;
  // /account/reactivate (email + password, no session — it cannot use one,
  // the account is banned) is the only way back, and /account/goodbye's
  // button pushes straight at it. From inside the native app, which loads
  // app.classraum.com, both bounced to a login the student can no longer
  // pass. They had 30 days to change their mind and no reachable way to.
  //
  // Neither page needs a session by design, so allowing them removes nothing.
  const isAccountRecoveryRoute =
    url.pathname === '/account/goodbye' || url.pathname === '/account/reactivate'

  // Checkout hand-off + PG return (/pay/*). MUST be listed, for the same
  // reason /invite/ and /account-deletion are: the app-subdomain branch
  // below falls through to "redirect unknown routes to /auth", and a 307
  // here destroys a payment.
  //
  // These paths exist precisely BECAUSE they are outside the app's
  // Universal Link claim (/invite/*, /mobile/*, /dashboard/*, /auth/*) —
  // see /pay/return/page.tsx. Being unclaimed is what keeps the buyer in
  // the browser that started the purchase; it also means nothing else in
  // this file had ever heard of them.
  //
  // Verified against production, not assumed: /pay/return and
  // /pay/subscribe both answered 307 -> /auth on the first deploy. The
  // return leg carries the issued billingKey in its query string, and the
  // redirect drops it — so the card would be registered at Inicis and the
  // key thrown away on the doorstep, which is the exact failure the /pay
  // move was made to end.
  //
  // No auth check here on purpose: /pay/subscribe sends a signed-out buyer
  // to /auth itself with ?next= back into /pay/*, and /pay/return must run
  // for whoever the PG hands back before it can know who that is.
  const isPayRoute = url.pathname.startsWith('/pay/')

  // Internal preview routes (sandbox; remove with the route files when done)
  const isDesignPreviewRoute =
    url.pathname.startsWith('/design-preview') ||
    url.pathname.startsWith('/mobile-preview')

  // Print pages are auth-required but use a different route that bypasses the app layout
  const isPrintRoute = url.pathname.startsWith('/print/')

  // Define marketing routes that should only be accessible on main domain
  const marketingRoutes = [
    '/', '/about', '/pricing', '/faqs', '/features',
    '/study', '/terms', '/privacy-policy', '/refund-policy'
  ]

  const isProtectedRoute = protectedRoutes.some(route => url.pathname.startsWith(route))
  const isMarketingRoute = marketingRoutes.some(route => 
    url.pathname === route || url.pathname.startsWith(route + '/')
  )
  const isAuthRoute = url.pathname.startsWith('/auth')
  const isApiRoute = url.pathname.startsWith('/api')

  // Handle app subdomain (app.domain.com or app.localhost)
  if (hostname?.startsWith('app.')) {
    // Special handling for root path on app subdomain
    if (url.pathname === '/') {
      // Redirect to dashboard (which will then redirect based on auth/role)
      const dashboardUrl = new URL('/dashboard', url)
      return NextResponse.redirect(dashboardUrl)
    }

    // Redirect marketing routes to main domain (except root which we handle above)
    if (isMarketingRoute) {
      const mainUrl = new URL(url)
      mainUrl.hostname = hostname.replace('app.', '')
      return NextResponse.redirect(mainUrl)
    }

    // Allow API routes to pass through on any domain
    if (isApiRoute) {
      return NextResponse.next()
    }

    // Allow public test-taker pages (anonymous, no auth)
    if (isPublicTestRoute) {
      return NextResponse.next()
    }

    // Allow public onboarding pages (token-gated, no auth)
    if (isOnboardingRoute) {
      return NextResponse.next()
    }

    // Allow the public friend-invite landing (no auth; hands off to /auth)
    if (isInviteRoute) {
      return NextResponse.next()
    }

    // Allow the public account-deletion instructions (no auth; Play Console)
    if (isAccountDeletionRoute) {
      return NextResponse.next()
    }

    // Allow the deletion aftermath pages (no auth by design — the account is
    // banned, so a session is impossible; see isAccountRecoveryRoute above)
    if (isAccountRecoveryRoute) {
      return NextResponse.next()
    }

    // Allow the checkout hand-off and the PG return (see isPayRoute above —
    // a 307 here drops the issued billingKey off the query string)
    if (isPayRoute) {
      return NextResponse.next()
    }

    // Allow internal design-preview sandbox
    if (isDesignPreviewRoute) {
      return NextResponse.next()
    }

    // Allow all app routes and auth routes to pass through
    // Authentication and role-based routing will be handled by AuthWrapper components
    if (isProtectedRoute || isAuthRoute || isPrintRoute) {
      return NextResponse.next()
    }

    // Redirect unknown routes to auth
    const authUrl = new URL('/auth', url)
    return NextResponse.redirect(authUrl)
  } else {
    // Main domain (domain.com or localhost)
    
    // Allow API routes to pass through on any domain
    if (isApiRoute) {
      return NextResponse.next()
    }

    // Allow public test-taker pages (anonymous, no auth)
    if (isPublicTestRoute) {
      return NextResponse.next()
    }

    // Allow public onboarding pages (token-gated, no auth)
    if (isOnboardingRoute) {
      return NextResponse.next()
    }

    // Allow the public friend-invite landing (no auth; hands off to /auth)
    if (isInviteRoute) {
      return NextResponse.next()
    }

    // Allow the public account-deletion instructions (no auth; Play Console).
    // Today the main-domain branch already falls through to next() for
    // unrecognised paths, so this is belt-and-braces — but it means the page
    // stays public if /account* is ever added to protectedRoutes, which is
    // the kind of change that would silently break a store listing.
    if (isAccountDeletionRoute) {
      return NextResponse.next()
    }

    // Print routes are app-authenticated; redirect to app subdomain
    if (isPrintRoute) {
      const isDev = hostname?.includes('localhost')
      if (!isDev) {
        const appUrl = new URL(url)
        const baseHostname = hostname?.replace('www.', '') || hostname
        appUrl.hostname = `app.${baseHostname}`
        return NextResponse.redirect(appUrl)
      }
      return NextResponse.next()
    }

    // Redirect app routes and auth to app subdomain
    // In development (localhost), allow all routes on main domain to avoid redirect loops
    // This is necessary for Capacitor/iOS simulator testing which can't resolve subdomains
    const isDevelopment = hostname?.includes('localhost')
    if (isDevelopment) {
      // Allow all routes on localhost for development/testing
      return NextResponse.next()
    }
    if (isProtectedRoute || isAuthRoute) {
      const appUrl = new URL(url)
      // Strip www. from hostname before adding app. subdomain to prevent app.www.classraum.com
      const baseHostname = hostname?.replace('www.', '') || hostname
      const subdomain = hostname?.includes('localhost') ? 'app.localhost' : `app.${baseHostname}`
      appUrl.hostname = subdomain

      // Add language parameter to preserve language context during subdomain redirects
      // This handles both localhost (where cookies don't work across subdomains) and production edge cases
      if (isAuthRoute) {
        // Enhanced cookie parsing for production environments
        const cookieHeader = request.headers.get('cookie') || ''
        const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
          const [name, value] = cookie.trim().split('=')
          if (name && value) {
            try {
              acc[name] = decodeURIComponent(value)
            } catch {
              // Fallback for malformed cookie values
              acc[name] = value
            }
          }
          return acc
        }, {} as Record<string, string>)

        // Get language preference from cookies
        const language = cookies['classraum_language']

        // Validate and add language parameter for all environments
        if (language && (language === 'english' || language === 'korean')) {
          appUrl.searchParams.set('lang', language)

        }

        // Additional fallback for production environments
        // Check for Accept-Language header if no cookie is set
        if (!language) {
          const acceptLanguage = request.headers.get('accept-language')
          if (acceptLanguage) {
            const preferredLang = acceptLanguage.toLowerCase()
            let detectedLanguage: string | null = null

            if (preferredLang.includes('en')) {
              detectedLanguage = 'english'
            } else if (preferredLang.includes('ko')) {
              detectedLanguage = 'korean'
            }

            if (detectedLanguage) {
              appUrl.searchParams.set('lang', detectedLanguage)
            }
          }
        }
      }

      return NextResponse.redirect(appUrl)
    }
    
    // Allow marketing routes
    if (isMarketingRoute) {
      return NextResponse.next()
    }
    
    // Allow other routes (static files, etc.)
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sw\\.js|\\.well-known|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg|.*\\.ico).*)',
  ],
}