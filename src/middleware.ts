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
    '/archive',
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
    if (isProtectedRoute || isAuthRoute) {
      const appUrl = new URL(url)
      const subdomain = hostname?.includes('localhost') ? 'app.localhost' : `app.${hostname}`
      appUrl.hostname = subdomain

      // Only add language parameter when redirecting to auth route
      if (isAuthRoute) {
        // Preserve language from cookies by adding as URL parameter
        const cookieHeader = request.headers.get('cookie') || ''
        const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
          const [name, value] = cookie.trim().split('=')
          if (name && value) {
            acc[name] = decodeURIComponent(value)
          }
          return acc
        }, {} as Record<string, string>)

        const language = cookies['classraum_language']
        if (language && (language === 'english' || language === 'korean')) {
          appUrl.searchParams.set('lang', language)
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