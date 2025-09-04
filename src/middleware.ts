import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host')
  const url = request.nextUrl.clone()

  // Define routes that require authentication
  const protectedRoutes = [
    '/dashboard', '/students', '/classrooms', '/sessions', '/assignments', 
    '/attendance', '/payments', '/reports', '/settings', '/teachers', 
    '/families', '/parents', '/notifications', '/upgrade', '/mobile', '/checkout'
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

  // Handle app subdomain (app.domain.com or app.localhost)
  if (hostname?.startsWith('app.')) {
    // Redirect marketing routes to main domain
    if (isMarketingRoute && url.pathname !== '/') {
      const mainUrl = new URL(url)
      mainUrl.hostname = hostname.replace('app.', '')
      return NextResponse.redirect(mainUrl)
    }
    
    // Allow all app routes and auth routes to pass through
    // Authentication and role-based routing will be handled by AuthWrapper components
    if (isProtectedRoute || isAuthRoute || url.pathname === '/') {
      return NextResponse.next()
    }
    
    // Redirect unknown routes to auth
    const authUrl = new URL('/auth', url)
    return NextResponse.redirect(authUrl)
  } else {
    // Main domain (domain.com or localhost)
    // Redirect app routes to app subdomain
    if (isProtectedRoute || isAuthRoute) {
      const appUrl = new URL(url)
      const subdomain = hostname?.includes('localhost') ? 'app.localhost' : `app.${hostname}`
      appUrl.hostname = subdomain
      return NextResponse.redirect(appUrl)
    }
    
    // Allow marketing routes
    if (isMarketingRoute) {
      return NextResponse.next()
    }
    
    // Allow other routes (API routes, static files, etc.)
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg|.*\\.ico).*)',
  ],
}