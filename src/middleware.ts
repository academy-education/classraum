import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host')
  const url = request.nextUrl.clone()

  // Define routes that require authentication
  const protectedRoutes = [
    '/dashboard', '/students', '/classrooms', '/sessions', '/assignments',
    '/attendance', '/payments', '/reports', '/settings', '/teachers',
    '/families', '/parents', '/notifications', '/upgrade', '/mobile', '/checkout',
    '/archive', '/test-payment', '/order-summary', '/billing',
    '/admin', '/admin/academies', '/admin/users', '/admin/subscriptions',
    '/admin/analytics', '/admin/communications', '/admin/support', '/admin/system', '/admin/settings'
  ]

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

    // Allow all app routes and auth routes to pass through
    // Authentication and role-based routing will be handled by AuthWrapper components
    if (isProtectedRoute || isAuthRoute) {
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
    
    // Redirect app routes and auth to app subdomain
    // In development, allow auth on main domain to avoid redirect loops
    const isDevelopment = hostname?.includes('localhost')
    if (isProtectedRoute || (isAuthRoute && !isDevelopment)) {
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

          // Enhanced logging for production debugging
          const isProduction = process.env.NODE_ENV === 'production'
          const logLevel = isProduction ? 'info' : 'debug'

          console[logLevel]('[Middleware] Adding language parameter:', {
            language,
            hostname,
            isProduction,
            hasClassraumDomain: hostname?.includes('classraum.com'),
            cookieCount: Object.keys(cookies).length
          })
        } else {
          // Log missing or invalid language for debugging
          if (process.env.NODE_ENV === 'development' || hostname?.includes('localhost')) {
            console.debug('[Middleware] No valid language cookie found:', {
              foundLanguage: language,
              allCookies: Object.keys(cookies),
              hostname
            })
          }
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
              console.debug('[Middleware] Using Accept-Language fallback:', {
                acceptLanguage: preferredLang,
                detectedLanguage,
                hostname
              })
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
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg|.*\\.ico).*)',
  ],
}