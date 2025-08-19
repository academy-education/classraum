import { useEffect, useCallback, useRef } from 'react'
import { useAnalytics } from './useAnalytics'

interface PerformanceMetrics {
  pageLoadTime?: number
  firstContentfulPaint?: number
  largestContentfulPaint?: number
  firstInputDelay?: number
  cumulativeLayoutShift?: number
  timeToInteractive?: number
}

export function usePerformanceMonitoring() {
  const { trackPerformance, trackError } = useAnalytics()
  const metricsRef = useRef<PerformanceMetrics>({})

  // Measure and track Core Web Vitals
  const trackWebVitals = useCallback(() => {
    if (typeof window === 'undefined' || !window.performance) return

    // First Contentful Paint (FCP)
    try {
      const paintEntries = performance.getEntriesByType('paint')
      const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint')
      if (fcpEntry) {
        metricsRef.current.firstContentfulPaint = fcpEntry.startTime
        trackPerformance('first_contentful_paint', fcpEntry.startTime)
      }
    } catch (error) {
      trackError(error as Error, 'fcp_measurement')
    }

    // Largest Contentful Paint (LCP)
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        if (lastEntry) {
          metricsRef.current.largestContentfulPaint = lastEntry.startTime
          trackPerformance('largest_contentful_paint', lastEntry.startTime)
        }
      })
      observer.observe({ entryTypes: ['largest-contentful-paint'] })
    } catch (error) {
      trackError(error as Error, 'lcp_measurement')
    }

    // First Input Delay (FID)
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry: PerformanceEntry & { processingStart?: number }) => {
          if (entry.processingStart && entry.startTime) {
            const fid = entry.processingStart - entry.startTime
            metricsRef.current.firstInputDelay = fid
            trackPerformance('first_input_delay', fid)
          }
        })
      })
      observer.observe({ entryTypes: ['first-input'] })
    } catch (error) {
      trackError(error as Error, 'fid_measurement')
    }

    // Cumulative Layout Shift (CLS)
    try {
      let clsValue = 0
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry: PerformanceEntry & { value?: number; hadRecentInput?: boolean }) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value || 0
          }
        })
        metricsRef.current.cumulativeLayoutShift = clsValue
        trackPerformance('cumulative_layout_shift', clsValue)
      })
      observer.observe({ entryTypes: ['layout-shift'] })
    } catch (error) {
      trackError(error as Error, 'cls_measurement')
    }
  }, [trackPerformance, trackError])

  // Track page load time
  const trackPageLoadTime = useCallback(() => {
    if (typeof window === 'undefined') return

    window.addEventListener('load', () => {
      try {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        if (navigation) {
          const loadTime = navigation.loadEventEnd - (navigation as PerformanceNavigationTiming & { navigationStart: number }).navigationStart
          metricsRef.current.pageLoadTime = loadTime
          trackPerformance('page_load_time', loadTime)

          // Track other navigation timing metrics
          const dnsLookup = navigation.domainLookupEnd - navigation.domainLookupStart
          const tcpConnect = navigation.connectEnd - navigation.connectStart
          const requestResponse = navigation.responseEnd - navigation.requestStart
          const domProcessing = navigation.domContentLoadedEventEnd - (navigation as PerformanceNavigationTiming & { domLoading: number }).domLoading

          trackPerformance('dns_lookup_time', dnsLookup)
          trackPerformance('tcp_connect_time', tcpConnect)
          trackPerformance('request_response_time', requestResponse)
          trackPerformance('dom_processing_time', domProcessing)
        }
      } catch (error) {
        trackError(error as Error, 'page_load_measurement')
      }
    })
  }, [trackPerformance, trackError])

  // Track resource loading performance
  const trackResourcePerformance = useCallback(() => {
    if (typeof window === 'undefined') return

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry) => {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming
            const loadTime = resourceEntry.responseEnd - resourceEntry.startTime

            // Track slow resources
            if (loadTime > 1000) { // Resources taking more than 1 second
              trackPerformance('slow_resource_load', loadTime, {
                resourceName: resourceEntry.name,
                resourceType: getResourceType(resourceEntry.name),
                transferSize: resourceEntry.transferSize
              })
            }
          }
        })
      })
      observer.observe({ entryTypes: ['resource'] })
    } catch (error) {
      trackError(error as Error, 'resource_performance_measurement')
    }
  }, [trackPerformance, trackError])

  // Track memory usage
  const trackMemoryUsage = useCallback(() => {
    if (typeof window === 'undefined' || !('memory' in window.performance)) return

    try {
      const memory = (window.performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory
      if (!memory) return
      
      const memoryUsage = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      }

      trackPerformance('memory_usage', memory.usedJSHeapSize, memoryUsage)
    } catch (error) {
      trackError(error as Error, 'memory_usage_measurement')
    }
  }, [trackPerformance, trackError])

  // Track bundle size and loading
  const trackBundleMetrics = useCallback(() => {
    if (typeof window === 'undefined') return

    try {
      // Track JavaScript bundle sizes
      const scripts = document.querySelectorAll('script[src]')
      let totalBundleSize = 0

      scripts.forEach(async (script) => {
        const src = (script as HTMLScriptElement).src
        if (src && src.includes('/_next/')) { // Next.js bundles
          try {
            const response = await fetch(src, { method: 'HEAD' })
            const size = parseInt(response.headers.get('content-length') || '0')
            totalBundleSize += size

            trackPerformance('bundle_size', size, {
              bundleName: src.split('/').pop() || 'unknown',
              bundleUrl: src
            })
          } catch (fetchError) {
            // Ignore fetch errors for bundle size tracking
          }
        }
      })

      if (totalBundleSize > 0) {
        trackPerformance('total_bundle_size', totalBundleSize)
      }
    } catch (error) {
      trackError(error as Error, 'bundle_metrics_measurement')
    }
  }, [trackPerformance, trackError])

  // Initialize all performance tracking
  useEffect(() => {
    if (typeof window === 'undefined') return

    trackWebVitals()
    trackPageLoadTime()
    trackResourcePerformance()
    trackBundleMetrics()

    // Track memory usage periodically
    const memoryInterval = setInterval(trackMemoryUsage, 30000) // Every 30 seconds

    return () => {
      clearInterval(memoryInterval)
    }
  }, [trackWebVitals, trackPageLoadTime, trackResourcePerformance, trackBundleMetrics, trackMemoryUsage])

  // Get current metrics
  const getMetrics = useCallback(() => {
    return { ...metricsRef.current }
  }, [])

  return {
    getMetrics,
    trackWebVitals,
    trackPageLoadTime,
    trackResourcePerformance,
    trackMemoryUsage,
    trackBundleMetrics
  }
}

// Hook for tracking component performance
export function useComponentPerformance(componentName: string) {
  const { trackPerformance } = useAnalytics()
  const renderStartTime = useRef<number>(Date.now())
  const mountTime = useRef<number>(Date.now())

  useEffect(() => {
    // Track component mount time
    const mountDuration = Date.now() - mountTime.current
    trackPerformance('component_mount_time', mountDuration, {
      componentName,
      mountTimestamp: mountTime.current
    })

    return () => {
      // Track component lifetime
      const lifetime = Date.now() - mountTime.current
      trackPerformance('component_lifetime', lifetime, {
        componentName
      })
    }
  }, [componentName, trackPerformance])

  const trackRender = useCallback(() => {
    const renderDuration = Date.now() - renderStartTime.current
    trackPerformance('component_render_time', renderDuration, {
      componentName
    })
    renderStartTime.current = Date.now()
  }, [componentName, trackPerformance])

  return { trackRender }
}

// Utility function to determine resource type
function getResourceType(url: string): string {
  if (url.includes('.js')) return 'javascript'
  if (url.includes('.css')) return 'stylesheet'
  if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) return 'image'
  if (url.match(/\.(woff|woff2|ttf|otf)$/)) return 'font'
  if (url.includes('.json')) return 'json'
  return 'other'
}