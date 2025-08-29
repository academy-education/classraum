// Performance monitoring and analytics utilities

interface PerformanceMetric {
  name: string
  value: number
  timestamp: number
  meta?: Record<string, unknown>
}

export interface PerformanceSummary {
  totalMetrics: number
  componentCount: number
  pageCount: number
  averageRenderTime: number
  memoryUsage: {
    usedJSHeapSize: number
    totalJSHeapSize: number
    jsHeapSizeLimit: number
  } | null
  recentMetrics: PerformanceMetric[]
}

interface ComponentPerformance {
  component: string
  renderTime: number
  renderCount: number
  lastRender: number
}

interface PagePerformance {
  page: string
  loadTime: number
  firstContentfulPaint: number
  largestContentfulPaint: number
  cumulativeLayoutShift: number
  firstInputDelay: number
  timeToInteractive: number
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private componentMetrics: Map<string, ComponentPerformance> = new Map()
  private pageMetrics: Map<string, PagePerformance> = new Map()
  private renderStartTimes: Map<string, number> = new Map()
  
  // Core performance measurement
  measure(name: string, startTime?: number): number {
    const endTime = performance.now()
    const duration = startTime ? endTime - startTime : 0
    
    this.addMetric({
      name,
      value: duration,
      timestamp: Date.now()
    })
    
    return duration
  }
  
  // Start a performance measurement
  start(name: string): number {
    const startTime = performance.now()
    this.renderStartTimes.set(name, startTime)
    return startTime
  }
  
  // End a performance measurement
  end(name: string, meta?: Record<string, unknown>): number {
    const startTime = this.renderStartTimes.get(name)
    if (!startTime) {
      console.warn(`No start time found for measurement: ${name}`)
      return 0
    }
    
    const duration = performance.now() - startTime
    this.renderStartTimes.delete(name)
    
    this.addMetric({
      name,
      value: duration,
      timestamp: Date.now(),
      meta
    })
    
    return duration
  }
  
  // Component render performance tracking
  trackComponentRender(componentName: string, renderTime: number) {
    const existing = this.componentMetrics.get(componentName)
    
    if (existing) {
      existing.renderCount++
      existing.renderTime = (existing.renderTime + renderTime) / 2 // Moving average
      existing.lastRender = Date.now()
    } else {
      this.componentMetrics.set(componentName, {
        component: componentName,
        renderTime,
        renderCount: 1,
        lastRender: Date.now()
      })
    }
  }
  
  // Page load performance tracking
  trackPageLoad(page: string) {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    const paint = performance.getEntriesByType('paint')
    
    const fcp = paint.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0
    const loadTime = navigation.loadEventEnd - navigation.loadEventStart
    
    // Get Web Vitals
    this.measureWebVitals(page)
    
    const pagePerf: PagePerformance = {
      page,
      loadTime,
      firstContentfulPaint: fcp,
      largestContentfulPaint: 0, // Will be updated by observer
      cumulativeLayoutShift: 0,   // Will be updated by observer
      firstInputDelay: 0,         // Will be updated by observer
      timeToInteractive: this.estimateTimeToInteractive()
    }
    
    this.pageMetrics.set(page, pagePerf)
  }
  
  // Measure Web Vitals
  private measureWebVitals(page: string) {
    // Largest Contentful Paint
    if ('PerformanceObserver' in window) {
      new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        
        const pagePerf = this.pageMetrics.get(page)
        if (pagePerf) {
          pagePerf.largestContentfulPaint = lastEntry.startTime
        }
      }).observe({ entryTypes: ['largest-contentful-paint'] })
      
      // Cumulative Layout Shift
      new PerformanceObserver((list) => {
        let cls = 0
        for (const entry of list.getEntries()) {
          const layoutShiftEntry = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number }
          if (!layoutShiftEntry.hadRecentInput) {
            cls += layoutShiftEntry.value || 0
          }
        }
        
        const pagePerf = this.pageMetrics.get(page)
        if (pagePerf) {
          pagePerf.cumulativeLayoutShift = cls
        }
      }).observe({ entryTypes: ['layout-shift'] })
      
      // First Input Delay
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const pagePerf = this.pageMetrics.get(page)
          if (pagePerf) {
            const firstInputEntry = entry as PerformanceEntry & { processingStart?: number }
            pagePerf.firstInputDelay = (firstInputEntry.processingStart || 0) - entry.startTime
          }
        }
      }).observe({ entryTypes: ['first-input'] })
    }
  }
  
  // Estimate Time to Interactive
  private estimateTimeToInteractive(): number {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    return navigation.domContentLoadedEventEnd - navigation.fetchStart
  }
  
  // Memory usage tracking
  getMemoryUsage(): { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number; } | null {
    if ('memory' in performance) {
      const performanceWithMemory = performance as Performance & {
        memory?: {
          usedJSHeapSize: number
          totalJSHeapSize: number
          jsHeapSizeLimit: number
        }
      }
      const memory = performanceWithMemory.memory
      if (memory) {
        return {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit
        }
      }
    }
    return null
  }
  
  // Bundle size tracking
  trackBundleSize() {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
    const jsResources = resources.filter(resource => 
      resource.name.includes('.js') && !resource.name.includes('node_modules')
    )
    
    const totalSize = jsResources.reduce((total, resource) => {
      return total + (resource.transferSize || 0)
    }, 0)
    
    this.addMetric({
      name: 'bundle-size',
      value: totalSize,
      timestamp: Date.now(),
      meta: {
        resourceCount: jsResources.length,
        resources: jsResources.map(r => ({
          name: r.name,
          size: r.transferSize
        }))
      }
    })
    
    return totalSize
  }
  
  // Add metric to collection
  private addMetric(metric: PerformanceMetric) {
    this.metrics.push(metric)
    
    // Keep only last 1000 metrics to prevent memory leaks
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000)
    }
  }
  
  // Get all metrics
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics]
  }
  
  // Get component performance data
  getComponentMetrics(): ComponentPerformance[] {
    return Array.from(this.componentMetrics.values())
  }
  
  // Get page performance data
  getPageMetrics(): PagePerformance[] {
    return Array.from(this.pageMetrics.values())
  }
  
  // Get performance summary
  getSummary(): PerformanceSummary {
    const memory = this.getMemoryUsage()
    const recentMetrics = this.metrics.slice(-100)
    const avgRenderTime = recentMetrics
      .filter(m => m.name.includes('render'))
      .reduce((sum, m, _, arr) => sum + m.value / arr.length, 0)
    
    return {
      totalMetrics: this.metrics.length,
      componentCount: this.componentMetrics.size,
      pageCount: this.pageMetrics.size,
      averageRenderTime: avgRenderTime,
      memoryUsage: memory,
      recentMetrics: recentMetrics.slice(-10)
    }
  }
  
  // Export data for analysis
  exportData() {
    return {
      metrics: this.getMetrics(),
      components: this.getComponentMetrics(),
      pages: this.getPageMetrics(),
      summary: this.getSummary(),
      timestamp: Date.now()
    }
  }
  
  // Clear all metrics
  clear() {
    this.metrics = []
    this.componentMetrics.clear()
    this.pageMetrics.clear()
    this.renderStartTimes.clear()
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor()

// React hook for component performance tracking
export const usePerformanceTracking = (componentName: string) => {
  const trackRender = React.useCallback(() => {
    const startTime = performance.now()
    
    return () => {
      const renderTime = performance.now() - startTime
      performanceMonitor.trackComponentRender(componentName, renderTime)
    }
  }, [componentName])
  
  React.useEffect(() => {
    const endTracking = trackRender()
    return endTracking
  })
  
  return {
    startMeasurement: (name: string) => performanceMonitor.start(`${componentName}-${name}`),
    endMeasurement: (name: string) => performanceMonitor.end(`${componentName}-${name}`),
    measure: <T,>(name: string, fn: () => T) => {
      const __startTime = performanceMonitor.start(`${componentName}-${name}`) /* eslint-disable-line @typescript-eslint/no-unused-vars */
      const result = fn()
      performanceMonitor.end(`${componentName}-${name}`)
      return result
    }
  }
}

// Higher-order component for automatic performance tracking
export function withPerformanceTracking<P extends object,>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  const WrappedComponent: React.ComponentType<P> = (props: P) => {
    const name = componentName || Component.displayName || Component.name
    usePerformanceTracking(name)
    
    return <Component {...props} />
  }
  
  WrappedComponent.displayName = `withPerformanceTracking(${Component.displayName || Component.name})`
  return WrappedComponent
}

// Performance monitoring utilities
export const performanceUtils = {
  // Measure async operations
  async measureAsync<T,>(name: string, operation: () => Promise<T>): Promise<T> {
    const __startTime = performanceMonitor.start(name) /* eslint-disable-line @typescript-eslint/no-unused-vars */
    try {
      const result = await operation()
      performanceMonitor.end(name)
      return result
    } catch (error) {
      performanceMonitor.end(name, { error: true })
      throw error
    }
  },
  
  // Measure sync operations
  measureSync<T,>(name: string, operation: () => T): T {
    const __startTime = performanceMonitor.start(name) /* eslint-disable-line @typescript-eslint/no-unused-vars */
    try {
      const result = operation()
      performanceMonitor.end(name)
      return result
    } catch (error) {
      performanceMonitor.end(name, { error: true })
      throw error
    }
  },
  
  // Throttled performance logging
  throttledLog: (() => {
    let lastLog = 0
    return (interval = 10000) => { // 10 seconds default
      const now = Date.now()
      if (now - lastLog > interval) {
        console.log('Performance Summary:', performanceMonitor.getSummary())
        lastLog = now
      }
    }
  })(),
  
  // Performance warning system
  checkPerformance: () => {
    const summary = performanceMonitor.getSummary()
    const warnings: string[] = []
    
    if (summary.averageRenderTime > 16) { // 60fps threshold
      warnings.push(`Average render time (${summary.averageRenderTime.toFixed(2)}ms) exceeds 16ms`)
    }
    
    const memory = summary.memoryUsage
    if (memory && memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.8) {
      warnings.push(`Memory usage (${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB) approaching limit`)
    }
    
    if (warnings.length > 0) {
      console.warn('Performance warnings:', warnings)
    }
    
    return warnings
  }
}

// Auto-initialize performance monitoring
if (typeof window !== 'undefined') {
  // Track initial page load
  window.addEventListener('load', () => {
    setTimeout(() => {
      performanceMonitor.trackPageLoad(window.location.pathname)
      performanceMonitor.trackBundleSize()
    }, 100)
  })
  
  // Periodic performance checks
  setInterval(() => {
    performanceUtils.throttledLog()
    performanceUtils.checkPerformance()
  }, 30000) // Every 30 seconds
}

import React from 'react'