import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host')
  const url = request.nextUrl.clone()

  // Define app routes that should only be accessible on app subdomain
  const appRoutes = [
    '/auth', '/mobile', '/dashboard', '/students', '/classrooms', 
    '/sessions', '/assignments', '/attendance', '/payments', '/reports', 
    '/settings', '/teachers', '/families', '/parents', '/notifications', '/upgrade'
  ]

  // Define marketing routes that should only be accessible on main domain
  const marketingRoutes = [
    '/', '/about', '/pricing', '/faqs', '/features', '/performance'
  ]

  const isAppRoute = appRoutes.some(route => url.pathname.startsWith(route))
  const isMarketingRoute = marketingRoutes.some(route => 
    url.pathname === route || url.pathname.startsWith(route + '/')
  )

  // Handle app subdomain (app.domain.com or app.localhost)
  if (hostname?.startsWith('app.')) {
    if (isMarketingRoute && url.pathname !== '/') {
      // Redirect marketing routes to main domain
      const mainUrl = new URL(url)
      mainUrl.hostname = hostname.replace('app.', '')
      return NextResponse.redirect(mainUrl)
    }
    
    if (isAppRoute) {
      return NextResponse.next()
    }
    
    // Default: redirect root to auth
    if (url.pathname === '/') {
      url.pathname = '/auth'
      return NextResponse.redirect(url)
    }
    
    // Redirect unknown routes to auth
    url.pathname = '/auth'
    return NextResponse.redirect(url)
  } else {
    // Main domain (domain.com or localhost)
    if (isAppRoute) {
      // Redirect app routes to app subdomain
      const appUrl = new URL(url)
      const subdomain = hostname?.includes('localhost') ? 'app.localhost' : `app.${hostname}`
      appUrl.hostname = subdomain
      return NextResponse.redirect(appUrl)
    }
    
    if (isMarketingRoute) {
      return NextResponse.next()
    }
    
    // Allow other routes (like API routes, static files) to pass through
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg|.*\\.ico).*)',
  ],
}