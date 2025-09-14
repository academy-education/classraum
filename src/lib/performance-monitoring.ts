import { onCLS, onFCP, onLCP, onTTFB, onINP, Metric } from 'web-vitals'

/**
 * Performance monitoring configuration
 */
export interface PerformanceConfig {
  enabled?: boolean
  debug?: boolean
  reportToAnalytics?: (metric: Metric) => void
  thresholds?: {
    CLS?: number    // Cumulative Layout Shift
    FCP?: number    // First Contentful Paint (ms)
    LCP?: number    // Largest Contentful Paint (ms)
    TTFB?: number   // Time to First Byte (ms)
    INP?: number    // Interaction to Next Paint (ms)
  }
}

// Default thresholds based on Google's Core Web Vitals
const DEFAULT_THRESHOLDS = {
  CLS: 0.1,      // Good < 0.1, Needs Improvement < 0.25, Poor >= 0.25
  FCP: 1800,     // Good < 1.8s, Needs Improvement < 3s, Poor >= 3s
  LCP: 2500,     // Good < 2.5s, Needs Improvement < 4s, Poor >= 4s
  TTFB: 800,     // Good < 0.8s, Needs Improvement < 1.8s, Poor >= 1.8s
  INP: 200,      // Good < 200ms, Needs Improvement < 500ms, Poor >= 500ms
}

/**
 * Get performance rating based on value and thresholds
 */
function getPerformanceRating(
  value: number,
  goodThreshold: number,
  poorThreshold?: number
): 'good' | 'needs-improvement' | 'poor' {
  if (value <= goodThreshold) return 'good'
  if (poorThreshold && value >= poorThreshold) return 'poor'
  return 'needs-improvement'
}

/**
 * Format metric for logging
 */
function formatMetric(metric: Metric, threshold: number): string {
  const rating = getPerformanceRating(
    metric.value,
    threshold,
    threshold * 2.5
  )
  
  const emoji = rating === 'good' ? '✅' : rating === 'needs-improvement' ? '⚠️' : '❌'
  
  return `${emoji} ${metric.name}: ${metric.value.toFixed(2)}${
    metric.name === 'CLS' ? '' : 'ms'
  } (${rating})`
}

/**
 * Report metric to console in development
 */
function debugMetric(metric: Metric, threshold: number) {
  if (process.env.NODE_ENV === 'development') {
    console.log(formatMetric(metric, threshold))
    
    // Log additional details for poor performance
    if (metric.value > threshold * 2.5) {
      console.warn(`Performance issue detected for ${metric.name}:`, {
        value: metric.value,
        delta: metric.delta,
        entries: metric.entries,
        id: metric.id,
        navigationType: metric.navigationType,
      })
    }
  }
}

/**
 * Initialize performance monitoring
 */
export function initPerformanceMonitoring(config: PerformanceConfig = {}) {
  const {
    enabled = true,
    debug = process.env.NODE_ENV === 'development',
    reportToAnalytics,
    thresholds = DEFAULT_THRESHOLDS
  } = config

  if (!enabled) return

  // Create a unified handler for all metrics
  const handleMetric = (metric: Metric) => {
    // Get the appropriate threshold
    const threshold = thresholds[metric.name as keyof typeof thresholds] || 
                     DEFAULT_THRESHOLDS[metric.name as keyof typeof DEFAULT_THRESHOLDS]

    // Debug logging
    if (debug && threshold) {
      debugMetric(metric, threshold)
    }

    // Report to analytics
    if (reportToAnalytics) {
      reportToAnalytics(metric)
    }

    // Store in sessionStorage for debugging
    if (typeof window !== 'undefined') {
      const metrics = JSON.parse(
        sessionStorage.getItem('webVitalsMetrics') || '{}'
      )
      metrics[metric.name] = {
        value: metric.value,
        delta: metric.delta,
        rating: threshold ? getPerformanceRating(metric.value, threshold, threshold * 2.5) : 'unknown',
        timestamp: Date.now()
      }
      sessionStorage.setItem('webVitalsMetrics', JSON.stringify(metrics))
    }
  }

  // Register all Web Vitals observers
  onCLS(handleMetric)
  onFCP(handleMetric)
  onLCP(handleMetric)
  onTTFB(handleMetric)
  onINP(handleMetric)
}

/**
 * Get current performance metrics from sessionStorage
 */
export function getCurrentMetrics(): Record<string, unknown> {
  if (typeof window === 'undefined') return {}
  
  try {
    return JSON.parse(sessionStorage.getItem('webVitalsMetrics') || '{}')
  } catch {
    return {}
  }
}

/**
 * Performance monitoring React hook
 */
export function usePerformanceMonitoring(config?: PerformanceConfig) {
  if (typeof window !== 'undefined') {
    initPerformanceMonitoring(config)
  }
  
  return {
    getCurrentMetrics,
    clearMetrics: () => {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('webVitalsMetrics')
      }
    }
  }
}

/**
 * Performance observer for custom metrics
 */
export class PerformanceObserver {
  private marks: Map<string, number> = new Map()

  /**
   * Start timing a performance mark
   */
  startMark(name: string) {
    this.marks.set(name, performance.now())
  }

  /**
   * End timing and get duration
   */
  endMark(name: string): number | null {
    const startTime = this.marks.get(name)
    if (!startTime) return null
    
    const duration = performance.now() - startTime
    this.marks.delete(name)
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`)
    }
    
    return duration
  }

  /**
   * Measure async operation
   */
  async measureAsync<T>(name: string, operation: () => Promise<T>): Promise<T> {
    this.startMark(name)
    try {
      const result = await operation()
      this.endMark(name)
      return result
    } catch (error) {
      this.endMark(name)
      throw error
    }
  }
}

// Export singleton instance
export const performanceObserver = new PerformanceObserver()