import { useCallback, useEffect, useRef } from 'react'
import { useGlobalStore } from '@/stores/useGlobalStore'

// Global declarations for external analytics libraries
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    posthog?: {
      capture: (event: string, properties?: Record<string, unknown>) => void
    }
  }
}

interface AnalyticsEvent {
  event: string
  category?: string
  action?: string
  label?: string
  value?: number
  userId?: string
  sessionId?: string
  timestamp?: number
  properties?: Record<string, string | number | boolean>
}

interface PageViewEvent {
  page: string
  title?: string
  url?: string
  referrer?: string
  userId?: string
  sessionId?: string
  timestamp?: number
  properties?: Record<string, string | number | boolean>
}

export function useAnalytics() {
  const { currentUser } = useGlobalStore()
  const sessionId = useRef(generateSessionId())
  
  // Track page views
  const trackPageView = useCallback((event: Omit<PageViewEvent, 'userId' | 'sessionId' | 'timestamp'>) => {
    const pageViewEvent: PageViewEvent = {
      ...event,
      userId: currentUser?.id,
      sessionId: sessionId.current,
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      referrer: typeof document !== 'undefined' ? document.referrer : undefined
    }

    sendEvent('page_view', pageViewEvent)
  }, [currentUser])

  // Track custom events
  const trackEvent = useCallback((event: Omit<AnalyticsEvent, 'userId' | 'sessionId' | 'timestamp'>) => {
    const analyticsEvent: AnalyticsEvent = {
      ...event,
      userId: currentUser?.id,
      sessionId: sessionId.current,
      timestamp: Date.now()
    }

    sendEvent('custom_event', analyticsEvent)
  }, [currentUser])

  // Track user interactions
  const trackInteraction = useCallback((
    element: string,
    action: string,
    properties?: Record<string, string | number | boolean>
  ) => {
    trackEvent({
      event: 'user_interaction',
      category: 'ui',
      action,
      label: element,
      properties
    })
  }, [trackEvent])

  // Track form submissions
  const trackFormSubmission = useCallback((
    formName: string,
    success: boolean,
    errors?: string[],
    properties?: Record<string, string | number | boolean>
  ) => {
    trackEvent({
      event: 'form_submission',
      category: 'forms',
      action: success ? 'submit_success' : 'submit_error',
      label: formName,
      properties: {
        success,
        errors: errors ? errors.join(', ') : '',
        ...properties
      }
    })
  }, [trackEvent])

  // Track feature usage
  const trackFeatureUsage = useCallback((
    feature: string,
    action: string,
    properties?: Record<string, string | number | boolean>
  ) => {
    trackEvent({
      event: 'feature_usage',
      category: 'features',
      action,
      label: feature,
      properties
    })
  }, [trackEvent])

  // Track performance metrics
  const trackPerformance = useCallback((
    metric: string,
    value: number,
    properties?: Record<string, string | number | boolean>
  ) => {
    trackEvent({
      event: 'performance_metric',
      category: 'performance',
      action: metric,
      value,
      properties
    })
  }, [trackEvent])

  // Track errors
  const trackError = useCallback((
    error: Error | string,
    context?: string,
    properties?: Record<string, string | number | boolean>
  ) => {
    const errorMessage = error instanceof Error ? error.message : error
    const errorStack = error instanceof Error ? error.stack : undefined

    trackEvent({
      event: 'error',
      category: 'errors',
      action: context || 'unknown',
      label: errorMessage,
      properties: {
        errorMessage: errorMessage || '',
        errorStack: errorStack || '',
        ...properties
      }
    })
  }, [trackEvent])

  return {
    trackPageView,
    trackEvent,
    trackInteraction,
    trackFormSubmission,
    trackFeatureUsage,
    trackPerformance,
    trackError,
    sessionId: sessionId.current
  }
}

// Send event to analytics service
function sendEvent(type: string, data: AnalyticsEvent | PageViewEvent) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`Analytics Event [${type}]:`, data)
    return
  }

  // Send to multiple analytics services
  Promise.all([
    sendToGoogleAnalytics(type, data),
    sendToCustomAnalytics(type, data),
    sendToPostHog(type, data)
  ]).catch(error => {
    console.error('Analytics error:', error)
  })
}

// Google Analytics 4
async function sendToGoogleAnalytics(type: string, data: AnalyticsEvent | PageViewEvent) {
  if (typeof window === 'undefined' || !window.gtag) return

  try {
    if (type === 'page_view') {
      const pageData = data as PageViewEvent
      window.gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '', {
        page_title: pageData.title,
        page_location: pageData.url,
        user_id: pageData.userId
      })
    } else {
      const eventData = data as AnalyticsEvent
      window.gtag('event', eventData.event, {
        event_category: eventData.category,
        event_label: eventData.label,
        value: eventData.value,
        user_id: eventData.userId,
        custom_parameters: eventData.properties
      })
    }
  } catch (error) {
    console.error('Google Analytics error:', error)
  }
}

// Custom analytics service
async function sendToCustomAnalytics(type: string, data: AnalyticsEvent | PageViewEvent) {
  const endpoint = process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT
  if (!endpoint) return

  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type,
        data,
        timestamp: Date.now()
      })
    })
  } catch (error) {
    console.error('Custom analytics error:', error)
  }
}

// PostHog
async function sendToPostHog(type: string, data: AnalyticsEvent | PageViewEvent) {
  if (typeof window === 'undefined' || !window.posthog) return

  try {
    if (type === 'page_view') {
      const pageData = data as PageViewEvent
      window.posthog.capture('$pageview', {
        $current_url: pageData.url,
        $title: pageData.title,
        ...pageData.properties
      })
    } else {
      const eventData = data as AnalyticsEvent
      window.posthog.capture(eventData.event, {
        category: eventData.category,
        action: eventData.action,
        label: eventData.label,
        value: eventData.value,
        ...eventData.properties
      })
    }
  } catch (error) {
    console.error('PostHog error:', error)
  }
}

// Generate unique session ID
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Auto-track page views
export function useAutoPageTracking() {
  const { trackPageView } = useAnalytics()
  
  useEffect(() => {
    // Track initial page view
    trackPageView({
      page: window.location.pathname,
      title: document.title
    })

    // Track route changes (for SPAs)
    const handleRouteChange = () => {
      trackPageView({
        page: window.location.pathname,
        title: document.title
      })
    }

    // Listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', handleRouteChange)

    // For Next.js router, you might want to listen to router events instead
    // if (typeof window !== 'undefined' && window.next?.router) {
    //   window.next.router.events.on('routeChangeComplete', handleRouteChange)
    // }

    return () => {
      window.removeEventListener('popstate', handleRouteChange)
    }
  }, [trackPageView])
}