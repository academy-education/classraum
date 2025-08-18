import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host')
  const url = request.nextUrl.clone()

  // For development - handle localhost subdomains
  if (hostname?.includes('localhost') || hostname?.includes('127.0.0.1')) {
    // In development, allow all routes to pass through
    return NextResponse.next()
  }

  // For production - handle actual subdomains
  if (hostname?.startsWith('app.')) {
    // App subdomain logic
    if (url.pathname.startsWith('/auth') || 
        url.pathname.startsWith('/mobile') || 
        url.pathname.startsWith('/dashboard') ||
        url.pathname.startsWith('/students') ||
        url.pathname.startsWith('/classrooms') ||
        url.pathname.startsWith('/sessions') ||
        url.pathname.startsWith('/assignments') ||
        url.pathname.startsWith('/attendance') ||
        url.pathname.startsWith('/payments') ||
        url.pathname.startsWith('/reports') ||
        url.pathname.startsWith('/settings') ||
        url.pathname.startsWith('/teachers') ||
        url.pathname.startsWith('/families') ||
        url.pathname.startsWith('/parents') ||
        url.pathname.startsWith('/notifications') ||
        url.pathname.startsWith('/upgrade')) {
      return NextResponse.next()
    }
    
    if (url.pathname === '/') {
      url.pathname = '/auth'
      return NextResponse.redirect(url)
    }
    
    url.pathname = '/auth'
    return NextResponse.redirect(url)
  } else {
    // Main domain logic
    if (url.pathname.startsWith('/auth') || 
        url.pathname.startsWith('/mobile') || 
        url.pathname.startsWith('/dashboard') ||
        url.pathname.startsWith('/students') ||
        url.pathname.startsWith('/classrooms') ||
        url.pathname.startsWith('/sessions') ||
        url.pathname.startsWith('/assignments') ||
        url.pathname.startsWith('/attendance') ||
        url.pathname.startsWith('/payments') ||
        url.pathname.startsWith('/reports') ||
        url.pathname.startsWith('/settings') ||
        url.pathname.startsWith('/teachers') ||
        url.pathname.startsWith('/families') ||
        url.pathname.startsWith('/parents') ||
        url.pathname.startsWith('/notifications') ||
        url.pathname.startsWith('/upgrade')) {
      // Redirect to app subdomain
      const appUrl = new URL(url)
      appUrl.hostname = `app.${hostname}`
      return NextResponse.redirect(appUrl)
    }
    
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg|.*\\.ico).*)',
  ],
}