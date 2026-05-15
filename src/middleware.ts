import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host')
  const url = request.nextUrl.clone()

  // Define routes that require authentication
  const protectedRoutes = [
    '/dashboard', '/students', '/classrooms', '/sessions', '/assignments',
    '/attendance', '/announcements', '/payments', '/reports', '/settings', '/teachers',
    '/families', '/parents', '/notifications', '/upgrade', '/mobile', '/checkout',
    '/archive', '/test-payment', '/order-summary', '/billing', '/messages',
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

  // Public test-taker pages (no auth required; shareable link)
  // Match /test/{shareToken} but NOT /test-payment (which is protected)
  const isPublicTestRoute = url.pathname.startsWith('/test/') && !url.pathname.startsWith('/test-payment')

  // Public onboarding pages — admin-issued invite links for a new academy's
  // manager to sign up. Token in the URL gates access; the API validates it.
  const isOnboardingRoute = url.pathname.startsWith('/onboarding/')

  // Internal preview routes (sandbox; remove with the route files when done)
  const isDesignPreviewRoute =
    url.pathname.startsWith('/design-preview') ||
    url.pathname.startsWith('/mobile-preview')

  // Print pages are auth-required but use a different route that bypasses the app layout
  const isPrintRoute = url.pathname.startsWith('/print/')

  // Define marketing routes that should only be accessible on main domain
  const marketingRoutes = [
    '/', '/about', '/pricing', '/faqs', '/features', '/performance',
    '/terms', '/privacy-policy', '/refund-policy'
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

    // Allow internal design-preview sandbox
    if (isDesignPreviewRoute) {
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
    '/((?!api|_next/static|_next/image|favicon.ico|sw\\.js|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg|.*\\.ico).*)',
  ],
}