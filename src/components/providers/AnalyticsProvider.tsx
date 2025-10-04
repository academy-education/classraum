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
  // DISABLED: These hooks were causing 144,000+ API requests per day
  // due to tracking every user interaction (scroll, click, mousemove)

  // Initialize auto page tracking
  // useAutoPageTracking()

  // Initialize performance monitoring
  // usePerformanceMonitoring()

  // Initialize user behavior tracking
  // useUserBehavior()

  // Suppress unused variable warnings for props used in useEffect dependencies
  void trackPerformance
  void trackUserBehavior
  void trackPageViews
  void enabled

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
    function gtag(...args: unknown[]) {
      window.dataLayer?.push(args)
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

    // Load PostHog using proper typing
    const initPostHog = () => {
      const posthogScript = document.createElement('script')
      posthogScript.type = 'text/javascript'
      posthogScript.async = true
      posthogScript.src = posthogHost + '/static/array.js'
      
      const firstScript = document.getElementsByTagName('script')[0]
      if (firstScript && firstScript.parentNode) {
        firstScript.parentNode.insertBefore(posthogScript, firstScript)
      }
      
      // Initialize PostHog with minimal typing
      if (typeof window !== 'undefined') {
        (window as { posthog?: { init?: (key: string, options: Record<string, unknown>) => void } }).posthog = 
          (window as { posthog?: unknown }).posthog || { init: () => {} }
      }
    }
    
    initPostHog()
    
    // Initialize PostHog with proper error handling
    try {
      const posthog = (window as { posthog?: { init?: (key: string, options: Record<string, unknown>) => void } }).posthog
      if (posthog && posthog.init) {
        posthog.init(posthogKey, {
          api_host: posthogHost,
          capture_pageview: trackPageViews,
          capture_pageleave: true
        })
      }
    } catch (error) {
      console.error('Failed to initialize PostHog:', error)
    }

  }, [enabled, trackPageViews])

  return <>{children}</>
}

// Analytics debugging component (only in development)
export function AnalyticsDebugger() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') {
      return
    }
    // Override console methods to capture analytics events in development
    const originalLog = console.log
    const originalError = console.error

    console.log = (...args: unknown[]) => {
      if (typeof args[0] === 'string' && args[0].includes('Analytics Event')) {
        // Style analytics logs differently
        originalLog('%c' + args[0], 'color: #2563eb; font-weight: bold;', ...args.slice(1))
      } else {
        originalLog(...args)
      }
    }

    console.error = (...args: unknown[]) => {
      if (typeof args[0] === 'string' && args[0].includes('Analytics')) {
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

  if (process.env.NODE_ENV !== 'development') {
    return null
  }

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
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}