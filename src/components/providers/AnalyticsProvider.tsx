"use client"

import React, { useEffect } from 'react'
import { useAutoPageTracking } from '@/hooks/useAnalytics'
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring'
import { useUserBehavior } from '@/hooks/useUserBehavior'

interface AnalyticsProviderProps {
  children: React.ReactNode
  enabled?: boolean
  trackPageViews?: boolean
  trackPerformance?: boolean
  trackUserBehavior?: boolean
  trackErrors?: boolean
}

export function AnalyticsProvider({
  children,
  enabled = true,
  trackPageViews = true,
  trackPerformance = true,
  trackUserBehavior = true,
  trackErrors = true
}: AnalyticsProviderProps) {
  // Initialize auto page tracking
  useAutoPageTracking()
  
  // Initialize performance monitoring
  usePerformanceMonitoring()
  
  // Initialize user behavior tracking
  useUserBehavior()

  // Initialize error tracking
  useEffect(() => {
    if (!enabled || !trackErrors || typeof window === 'undefined') return

    const handleUnhandledError = (event: ErrorEvent) => {
      console.error('Unhandled error:', event.error)
      
      // Send to analytics
      if (window.gtag) {
        window.gtag('event', 'exception', {
          description: event.error?.message || event.message,
          fatal: false,
          custom_parameters: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            stack: event.error?.stack
          }
        })
      }
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason)
      
      // Send to analytics
      if (window.gtag) {
        window.gtag('event', 'exception', {
          description: event.reason?.message || 'Promise rejection',
          fatal: false,
          custom_parameters: {
            type: 'promise_rejection',
            reason: String(event.reason)
          }
        })
      }
    }

    window.addEventListener('error', handleUnhandledError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleUnhandledError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [enabled, trackErrors])

  // Initialize Google Analytics
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
    if (!gaId) return

    // Load Google Analytics script
    const script = document.createElement('script')
    script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`
    script.async = true
    document.head.appendChild(script)

    // Initialize gtag
    window.dataLayer = window.dataLayer || []
    function gtag(...args: any[]) {
      window.dataLayer.push(args)
    }
    window.gtag = gtag

    gtag('js', new Date())
    gtag('config', gaId, {
      page_title: document.title,
      page_location: window.location.href,
      send_page_view: trackPageViews
    })

    return () => {
      // Cleanup if needed
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }
  }, [enabled, trackPageViews])

  // Initialize PostHog
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
    const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com'
    
    if (!posthogKey) return

    // Load PostHog
    !(function(t: any, e: any) {
      var o, n, p, r
      e.__SV ||
        ((window as any).posthog = e),
        (e._i = []),
        (e.init = function(i: any, s: any, a: any) {
          function g(t: any, e: any) {
            var o = e.split('.')
            2 == o.length && ((t = t[o[0]]), (e = o[1]))
            t[e] = function() {
              t.push([e].concat(Array.prototype.slice.call(arguments, 0)))
            }
          }
          ;((p = t.createElement('script')).type = 'text/javascript'),
            (p.async = !0),
            (p.src = s.api_host + '/static/array.js'),
            (r = t.getElementsByTagName('script')[0]).parentNode.insertBefore(p, r)
          var u = e
          for (
            void 0 !== a ? (u = e[a] = []) : (a = 'posthog'),
              u.people = u.people || [],
              u.toString = function(t: any) {
                var e = 'posthog'
                return 'posthog' !== a && (e += '.' + a), t || (e += ' (stub)'), e
              },
              u.people.toString = function() {
                return u.toString(1) + '.people (stub)'
              },
              o =
                'capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags'.split(
                  ' '
                ),
              n = 0;
            n < o.length;
            n++
          )
            g(u, o[n])
          e._i.push([i, s, a])
        }),
        (e.__SV = 1)
    })(document, (window as any).posthog || [])
    
    ;(window as any).posthog.init(posthogKey, {
      api_host: posthogHost,
      capture_pageview: trackPageViews,
      capture_pageleave: true
    })

  }, [enabled, trackPageViews])

  return <>{children}</>
}

// Analytics debugging component (only in development)
export function AnalyticsDebugger() {
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  useEffect(() => {
    // Override console methods to capture analytics events in development
    const originalLog = console.log
    const originalError = console.error

    console.log = (...args) => {
      if (args[0]?.includes?.('Analytics Event')) {
        // Style analytics logs differently
        originalLog('%c' + args[0], 'color: #2563eb; font-weight: bold;', ...args.slice(1))
      } else {
        originalLog(...args)
      }
    }

    console.error = (...args) => {
      if (args[0]?.includes?.('Analytics')) {
        originalError('%c' + args[0], 'color: #dc2626; font-weight: bold;', ...args.slice(1))
      } else {
        originalError(...args)
      }
    }

    return () => {
      console.log = originalLog
      console.error = originalError
    }
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        background: '#1f2937',
        color: '#ffffff',
        padding: '8px 12px',
        borderRadius: '6px',
        fontSize: '12px',
        fontFamily: 'monospace',
        zIndex: 9999,
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}
    >
      📊 Analytics Debug Mode
    </div>
  )
}

declare global {
  interface Window {
    gtag: (...args: any[]) => void
    dataLayer: any[]
    posthog: any
  }
}