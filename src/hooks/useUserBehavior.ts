import { useEffect, useCallback, useRef } from 'react'
import { useAnalytics } from './useAnalytics'

interface ScrollMetrics {
  maxScrollDepth: number
  totalScrollTime: number
  scrollEvents: number
}

interface ClickHeatmapData {
  x: number
  y: number
  timestamp: number
  element: string
  page: string
}

export function useUserBehavior() {
  const { trackEvent, trackInteraction } = useAnalytics()
  const scrollMetrics = useRef<ScrollMetrics>({
    maxScrollDepth: 0,
    totalScrollTime: 0,
    scrollEvents: 0
  })
  const sessionStart = useRef(Date.now())
  const lastActiveTime = useRef(Date.now())
  const clickHeatmap = useRef<ClickHeatmapData[]>([])

  // Track scroll behavior
  const trackScrollBehavior = useCallback(() => {
    if (typeof window === 'undefined') return

    let scrollStartTime = Date.now()
    let isScrolling = false
    let scrollTimeout: NodeJS.Timeout | null = null

    const handleScroll = () => {
      if (!isScrolling) {
        scrollStartTime = Date.now()
        isScrolling = true
      }

      // Calculate scroll depth
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const docHeight = Math.max(
        document.body.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.clientHeight,
        document.documentElement.scrollHeight,
        document.documentElement.offsetHeight
      )
      const windowHeight = window.innerHeight
      const scrollDepth = Math.round((scrollTop / (docHeight - windowHeight)) * 100)

      // Update max scroll depth
      if (scrollDepth > scrollMetrics.current.maxScrollDepth) {
        scrollMetrics.current.maxScrollDepth = scrollDepth
      }

      scrollMetrics.current.scrollEvents++

      // Clear timeout for scroll end detection
      if (scrollTimeout) clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        if (isScrolling) {
          const scrollDuration = Date.now() - scrollStartTime
          scrollMetrics.current.totalScrollTime += scrollDuration
          isScrolling = false

          // Track significant scroll events
          if (scrollDepth > 0 && scrollDepth % 25 === 0) {
            trackInteraction('page_scroll', 'scroll_milestone', {
              scrollDepth,
              timeToReach: Date.now() - sessionStart.current
            })
          }
        }
      }, 150)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      
      // Send final scroll metrics
      trackEvent({
        event: 'scroll_session_complete',
        category: 'user_behavior',
        action: 'scroll_metrics',
        properties: scrollMetrics.current as unknown as Record<string, string | number | boolean>
      })
    }
  }, [trackEvent, trackInteraction])

  // Track click heatmap
  const trackClickHeatmap = useCallback(() => {
    if (typeof window === 'undefined') return

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      const __rect = document.documentElement.getBoundingClientRect() /* eslint-disable-line @typescript-eslint/no-unused-vars */
      
      const clickData: ClickHeatmapData = {
        x: Math.round((event.clientX / window.innerWidth) * 100), // Percentage
        y: Math.round((event.clientY / window.innerHeight) * 100), // Percentage
        timestamp: Date.now(),
        element: getElementSelector(target),
        page: window.location.pathname
      }

      clickHeatmap.current.push(clickData)
      
      // Limit stored clicks to prevent memory issues
      if (clickHeatmap.current.length > 100) {
        clickHeatmap.current = clickHeatmap.current.slice(-50)
      }

      trackInteraction('element_click', 'click', {
        elementType: target.tagName.toLowerCase(),
        elementClass: target.className,
        elementId: target.id,
        clickX: clickData.x,
        clickY: clickData.y,
        page: clickData.page
      })
    }

    document.addEventListener('click', handleClick, true)

    return () => {
      document.removeEventListener('click', handleClick, true)
      
      // Send heatmap data
      if (clickHeatmap.current.length > 0) {
        trackEvent({
          event: 'click_heatmap_session',
          category: 'user_behavior',
          action: 'heatmap_data',
          properties: {
            clicks: clickHeatmap.current as unknown as string | number | boolean,
            totalClicks: clickHeatmap.current.length
          }
        })
      }
    }
  }, [trackEvent, trackInteraction])

  // Track user engagement time
  const trackEngagementTime = useCallback(() => {
    if (typeof window === 'undefined') return

    let engagementTime = 0
    let lastActivity = Date.now()

    const updateEngagementTime = () => {
      const now = Date.now()
      const timeDiff = now - lastActivity
      
      // Only count as engagement if user was active within last 30 seconds
      if (timeDiff < 30000) {
        engagementTime += timeDiff
      }
      
      lastActivity = now
    }

    const trackActivity = () => {
      updateEngagementTime()
      lastActiveTime.current = Date.now()
    }

    // Track various user activities
    const events = ['click', 'scroll', 'keydown', 'mousemove', 'touchstart']
    events.forEach(event => {
      document.addEventListener(event, trackActivity, { passive: true })
    })

    // Track engagement periodically
    const engagementInterval = setInterval(() => {
      updateEngagementTime()
      
      trackEvent({
        event: 'engagement_time',
        category: 'user_behavior',
        action: 'time_on_page',
        value: Math.round(engagementTime / 1000), // Convert to seconds
        properties: {
          page: window.location.pathname,
          sessionDuration: Date.now() - sessionStart.current
        }
      })
    }, 15000) // Every 15 seconds

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, trackActivity)
      })
      clearInterval(engagementInterval)
      
      // Send final engagement time
      updateEngagementTime()
      trackEvent({
        event: 'session_complete',
        category: 'user_behavior',
        action: 'final_engagement_time',
        value: Math.round(engagementTime / 1000),
        properties: {
          totalSessionTime: Date.now() - sessionStart.current,
          page: window.location.pathname
        }
      })
    }
  }, [trackEvent])

  // Track rage clicks (multiple rapid clicks)
  const trackRageClicks = useCallback(() => {
    if (typeof window === 'undefined') return

    let clickCount = 0
    let clickTimer: NodeJS.Timeout

    const handleClick = (event: MouseEvent) => {
      clickCount++
      
      clearTimeout(clickTimer)
      clickTimer = setTimeout(() => {
        if (clickCount >= 3) {
          const target = event.target as HTMLElement
          trackEvent({
            event: 'rage_click',
            category: 'user_behavior',
            action: 'frustrated_interaction',
            label: getElementSelector(target),
            value: clickCount,
            properties: {
              element: target.tagName.toLowerCase(),
              clickCount,
              page: window.location.pathname
            }
          })
        }
        clickCount = 0
      }, 1000) // Reset after 1 second
    }

    document.addEventListener('click', handleClick)

    return () => {
      document.removeEventListener('click', handleClick)
      clearTimeout(clickTimer)
    }
  }, [trackEvent])

  // Track form interactions
  const trackFormInteractions = useCallback(() => {
    if (typeof window === 'undefined') return

    const formInteractions = new Map<string, {
      startTime: number;
      interactions: number;
      errors: number;
      fields: Set<string>;
    }>()

    const trackFormEvent = (event: Event, action: string) => {
      const target = event.target as HTMLFormElement | HTMLInputElement
      const formId = target.form?.id || target.id || 'unknown_form'
      
      if (!formInteractions.has(formId)) {
        formInteractions.set(formId, {
          startTime: Date.now(),
          interactions: 0,
          errors: 0,
          fields: new Set()
        })
      }

      const formData = formInteractions.get(formId)
      if (formData) {
        formData.interactions++
        
        if (target.name) {
          formData.fields.add(target.name)
        }

        trackInteraction('form_interaction', action, {
          formId,
          fieldName: target.name || 'unknown',
          fieldType: (target as HTMLInputElement).type || 'unknown',
          interactionCount: formData.interactions
        })
      }
    }

    // Track form field interactions
    document.addEventListener('focus', (e) => {
      if ((e.target as HTMLElement).matches('input, select, textarea')) {
        trackFormEvent(e, 'field_focus')
      }
    }, true)

    document.addEventListener('blur', (e) => {
      if ((e.target as HTMLElement).matches('input, select, textarea')) {
        trackFormEvent(e, 'field_blur')
      }
    }, true)

    // Track form submissions
    document.addEventListener('submit', (e) => {
      const form = e.target as HTMLFormElement
      const formId = form.id || 'unknown_form'
      const formData = formInteractions.get(formId)
      
      if (formData) {
        const completionTime = Date.now() - formData.startTime
        
        trackEvent({
          event: 'form_submission_attempt',
          category: 'forms',
          action: 'submit',
          label: formId,
          properties: {
            completionTime,
            totalInteractions: formData.interactions,
            fieldsInteracted: formData.fields.size,
            fields: Array.from(formData.fields) as unknown as string | number | boolean
          }
        })
      }
    })

    return () => {
      // Send form abandonment data for unsubmitted forms
      formInteractions.forEach((data, formId) => {
        if (data.interactions > 0) {
          trackEvent({
            event: 'form_abandonment',
            category: 'forms',
            action: 'abandon',
            label: formId,
            properties: {
              timeSpent: Date.now() - data.startTime,
              interactions: data.interactions,
              fieldsInteracted: data.fields.size
            }
          })
        }
      })
    }
  }, [trackEvent, trackInteraction])

  // Initialize all behavior tracking
  useEffect(() => {
    if (typeof window === 'undefined') return

    const cleanupFunctions = [
      trackScrollBehavior(),
      trackClickHeatmap(),
      trackEngagementTime(),
      trackRageClicks(),
      trackFormInteractions()
    ]

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup?.())
    }
  }, [trackScrollBehavior, trackClickHeatmap, trackEngagementTime, trackRageClicks, trackFormInteractions])

  // Get current behavior metrics
  const getBehaviorMetrics = useCallback(() => {
    return {
      scrollMetrics: scrollMetrics.current,
      sessionDuration: Date.now() - sessionStart.current,
      clickHeatmap: clickHeatmap.current,
      lastActiveTime: lastActiveTime.current
    }
  }, [])

  return {
    getBehaviorMetrics
  }
}

// Utility function to get element selector
function getElementSelector(element: HTMLElement): string {
  if (element.id) {
    return `#${element.id}`
  }
  
  if (element.className) {
    const classes = element.className.split(' ').filter(c => c.length > 0)
    if (classes.length > 0) {
      return `.${classes[0]}`
    }
  }
  
  let selector = element.tagName.toLowerCase()
  let parent = element.parentElement
  
  while (parent && selector.length < 50) {
    if (parent.id) {
      selector = `#${parent.id} > ${selector}`
      break
    }
    
    if (parent.className) {
      const classes = parent.className.split(' ').filter(c => c.length > 0)
      if (classes.length > 0) {
        selector = `.${classes[0]} > ${selector}`
        break
      }
    }
    
    selector = `${parent.tagName.toLowerCase()} > ${selector}`
    parent = parent.parentElement
  }
  
  return selector
}