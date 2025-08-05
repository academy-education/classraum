import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host')
  const url = request.nextUrl.clone()

  // For development - handle localhost subdomains
  if (hostname?.includes('localhost') || hostname?.includes('127.0.0.1')) {
    // Check if we're on app subdomain
    if (hostname.startsWith('app.')) {
      // This is the app subdomain - allow app routes
      if (url.pathname.startsWith('/auth') || 
          url.pathname.startsWith('/mobile') || 
          url.pathname.startsWith('/dashboard')) {
        return NextResponse.next()
      }
      
      // If on app subdomain but accessing root, redirect to auth
      if (url.pathname === '/') {
        url.pathname = '/auth'
        return NextResponse.redirect(url)
      }
      
      // Block other routes on app subdomain
      url.pathname = '/auth'
      return NextResponse.redirect(url)
    } else {
      // This is the main domain - block app routes
      if (url.pathname.startsWith('/auth') || 
          url.pathname.startsWith('/mobile') || 
          url.pathname.startsWith('/dashboard')) {
        // Redirect to app subdomain
        const appUrl = new URL(url)
        appUrl.hostname = `app.${hostname}`
        return NextResponse.redirect(appUrl)
      }
      
      // Allow main domain routes (landing page, etc.)
      return NextResponse.next()
    }
  }

  // For production - handle actual subdomains
  if (hostname?.startsWith('app.')) {
    // App subdomain logic
    if (url.pathname.startsWith('/auth') || 
        url.pathname.startsWith('/mobile') || 
        url.pathname.startsWith('/dashboard')) {
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
        url.pathname.startsWith('/dashboard')) {
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