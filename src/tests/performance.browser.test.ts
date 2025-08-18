// Browser-based performance tests for real performance measurement

/**
 * Browser Performance Tests
 * 
 * These tests should be run in a real browser environment using tools like:
 * - Playwright
 * - Puppeteer
 * - Cypress
 * 
 * They measure real performance metrics including:
 * - Page load times
 * - Component render performance
 * - Memory usage
 * - Bundle sizes
 */

import { test, expect } from '@playwright/test'

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  pageLoad: 3000,        // 3 seconds
  firstContentfulPaint: 1800, // 1.8 seconds
  largestContentfulPaint: 2500, // 2.5 seconds
  firstInputDelay: 100,   // 100ms
  cumulativeLayoutShift: 0.1,  // 0.1
  memoryUsage: 50 * 1024 * 1024, // 50MB
  bundleSize: 1024 * 1024, // 1MB
  renderTime: 16          // 16ms for 60fps
}

test.describe('Dashboard Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Enable performance monitoring
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
  })

  test('should load dashboard within performance budget', async ({ page }) => {
    // Measure page load performance
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      const paint = performance.getEntriesByType('paint')
      
      return {
        loadTime: navigation.loadEventEnd - navigation.loadEventStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        firstContentfulPaint: paint.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
        ttfb: navigation.responseStart - navigation.requestStart
      }
    })
    
    expect(performanceMetrics.loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoad)
    expect(performanceMetrics.firstContentfulPaint).toBeLessThan(PERFORMANCE_THRESHOLDS.firstContentfulPaint)
  })

  test('should have acceptable bundle size', async ({ page }) => {
    const resourceSizes = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
      const jsResources = resources.filter(r => r.name.includes('.js') && !r.name.includes('node_modules'))
      
      return {
        totalSize: jsResources.reduce((total, r) => total + (r.transferSize || 0), 0),
        resourceCount: jsResources.length,
        resources: jsResources.map(r => ({
          name: r.name.split('/').pop(),
          size: r.transferSize
        }))
      }
    })
    
    expect(resourceSizes.totalSize).toBeLessThan(PERFORMANCE_THRESHOLDS.bundleSize)
    console.log(`Total bundle size: ${(resourceSizes.totalSize / 1024).toFixed(2)}KB`)
    console.log(`Resource count: ${resourceSizes.resourceCount}`)
  })

  test('should maintain good memory usage', async ({ page }) => {
    // Trigger some interactions to load components
    await page.click('[data-testid="nav-classrooms"]')
    await page.waitForTimeout(1000)
    await page.click('[data-testid="nav-sessions"]')
    await page.waitForTimeout(1000)
    await page.click('[data-testid="nav-dashboard"]')
    await page.waitForTimeout(1000)
    
    const memoryUsage = await page.evaluate(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        return {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit
        }
      }
      return null
    })
    
    if (memoryUsage) {
      expect(memoryUsage.used).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryUsage)
      console.log(`Memory usage: ${(memoryUsage.used / 1024 / 1024).toFixed(2)}MB`)
    }
  })

  test('should have fast component render times', async ({ page }) => {
    // Enable performance monitoring
    await page.evaluate(() => {
      window.performanceTestResults = []
    })
    
    // Navigate between different sections to trigger renders
    const sections = ['classrooms', 'sessions', 'assignments', 'payments']
    
    for (const section of sections) {
      const startTime = await page.evaluate(() => performance.now())
      
      await page.click(`[data-testid="nav-${section}"]`)
      await page.waitForSelector(`[data-testid="${section}-page"]`, { timeout: 5000 })
      
      const endTime = await page.evaluate(() => performance.now())
      const renderTime = endTime - startTime
      
      expect(renderTime).toBeLessThan(1000) // Should render within 1 second
      console.log(`${section} render time: ${renderTime.toFixed(2)}ms`)
    }
  })

  test('should handle rapid navigation without performance degradation', async ({ page }) => {
    const navigationTimes = []
    
    // Rapidly navigate between sections
    for (let i = 0; i < 5; i++) {
      const sections = ['dashboard', 'classrooms', 'sessions', 'assignments']
      
      for (const section of sections) {
        const startTime = await page.evaluate(() => performance.now())
        
        await page.click(`[data-testid="nav-${section}"]`)
        await page.waitForTimeout(100) // Brief wait for transition
        
        const endTime = await page.evaluate(() => performance.now())
        navigationTimes.push(endTime - startTime)
      }
    }
    
    const averageTime = navigationTimes.reduce((a, b) => a + b, 0) / navigationTimes.length
    const maxTime = Math.max(...navigationTimes)
    
    expect(averageTime).toBeLessThan(500) // Average should be under 500ms
    expect(maxTime).toBeLessThan(1000)    // Max should be under 1s
    
    console.log(`Average navigation time: ${averageTime.toFixed(2)}ms`)
    console.log(`Max navigation time: ${maxTime.toFixed(2)}ms`)
  })

  test('should maintain performance with data loading', async ({ page }) => {
    // Mock API responses to simulate data loading
    await page.route('**/api/**', async route => {
      // Add artificial delay to simulate network
      await new Promise(resolve => setTimeout(resolve, 100))
      route.continue()
    })
    
    const startTime = await page.evaluate(() => performance.now())
    
    // Navigate to data-heavy section
    await page.click('[data-testid="nav-sessions"]')
    await page.waitForSelector('[data-testid="sessions-page"]')
    
    // Wait for data to load
    await page.waitForSelector('[data-testid="session-item"]', { timeout: 10000 })
    
    const endTime = await page.evaluate(() => performance.now())
    const totalTime = endTime - startTime
    
    expect(totalTime).toBeLessThan(5000) // Should load within 5 seconds
    console.log(`Data loading time: ${totalTime.toFixed(2)}ms`)
  })

  test('should have good Core Web Vitals', async ({ page }) => {
    // Measure Core Web Vitals
    const webVitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals = {
          lcp: 0,
          fid: 0,
          cls: 0
        }
        
        // Largest Contentful Paint
        if ('PerformanceObserver' in window) {
          new PerformanceObserver((list) => {
            const entries = list.getEntries()
            const lastEntry = entries[entries.length - 1]
            vitals.lcp = lastEntry.startTime
          }).observe({ entryTypes: ['largest-contentful-paint'] })
          
          // First Input Delay
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              vitals.fid = (entry as any).processingStart - entry.startTime
            }
          }).observe({ entryTypes: ['first-input'] })
          
          // Cumulative Layout Shift
          new PerformanceObserver((list) => {
            let cls = 0
            for (const entry of list.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                cls += (entry as any).value
              }
            }
            vitals.cls = cls
          }).observe({ entryTypes: ['layout-shift'] })
        }
        
        setTimeout(() => resolve(vitals), 3000) // Wait 3 seconds for measurements
      })
    })
    
    const vitals = await webVitals as any
    
    if (vitals.lcp > 0) {
      expect(vitals.lcp).toBeLessThan(PERFORMANCE_THRESHOLDS.largestContentfulPaint)
      console.log(`LCP: ${vitals.lcp.toFixed(2)}ms`)
    }
    
    if (vitals.fid > 0) {
      expect(vitals.fid).toBeLessThan(PERFORMANCE_THRESHOLDS.firstInputDelay)
      console.log(`FID: ${vitals.fid.toFixed(2)}ms`)
    }
    
    expect(vitals.cls).toBeLessThan(PERFORMANCE_THRESHOLDS.cumulativeLayoutShift)
    console.log(`CLS: ${vitals.cls}`)
  })
})

test.describe('Mobile Performance Tests', () => {
  test.use({ 
    viewport: { width: 375, height: 667 },
    deviceScaleFactor: 2
  })

  test('should maintain performance on mobile devices', async ({ page }) => {
    // Simulate mobile network conditions
    await page.route('**/*', async route => {
      await new Promise(resolve => setTimeout(resolve, 50)) // Add 50ms delay
      route.continue()
    })
    
    const startTime = await page.evaluate(() => performance.now())
    
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    
    const endTime = await page.evaluate(() => performance.now())
    const loadTime = endTime - startTime
    
    // Mobile should load within 5 seconds
    expect(loadTime).toBeLessThan(5000)
    console.log(`Mobile load time: ${loadTime.toFixed(2)}ms`)
  })

  test('should have responsive interactions on mobile', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    
    const interactionTimes = []
    
    // Test touch interactions
    const buttons = await page.locator('button').all()
    
    for (let i = 0; i < Math.min(5, buttons.length); i++) {
      const startTime = await page.evaluate(() => performance.now())
      
      await buttons[i].tap()
      await page.waitForTimeout(100)
      
      const endTime = await page.evaluate(() => performance.now())
      interactionTimes.push(endTime - startTime)
    }
    
    const averageInteractionTime = interactionTimes.reduce((a, b) => a + b, 0) / interactionTimes.length
    
    expect(averageInteractionTime).toBeLessThan(200) // Should respond within 200ms
    console.log(`Average mobile interaction time: ${averageInteractionTime.toFixed(2)}ms`)
  })
})

test.describe('Performance Regression Tests', () => {
  test('should not regress from baseline performance', async ({ page }) => {
    // This test would compare against stored baseline metrics
    // In a real implementation, you'd store these in a database or file
    
    const BASELINE_METRICS = {
      pageLoad: 2000,
      memoryUsage: 30 * 1024 * 1024,
      bundleSize: 800 * 1024
    }
    
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    
    const currentMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
      const jsSize = resources
        .filter(r => r.name.includes('.js'))
        .reduce((total, r) => total + (r.transferSize || 0), 0)
      
      const memory = 'memory' in performance ? (performance as any).memory : null
      
      return {
        pageLoad: navigation.loadEventEnd - navigation.loadEventStart,
        memoryUsage: memory ? memory.usedJSHeapSize : 0,
        bundleSize: jsSize
      }
    })
    
    // Allow 20% regression tolerance
    const tolerance = 1.2
    
    expect(currentMetrics.pageLoad).toBeLessThan(BASELINE_METRICS.pageLoad * tolerance)
    
    if (currentMetrics.memoryUsage > 0) {
      expect(currentMetrics.memoryUsage).toBeLessThan(BASELINE_METRICS.memoryUsage * tolerance)
    }
    
    expect(currentMetrics.bundleSize).toBeLessThan(BASELINE_METRICS.bundleSize * tolerance)
    
    console.log('Performance comparison:')
    console.log(`Page load: ${currentMetrics.pageLoad}ms (baseline: ${BASELINE_METRICS.pageLoad}ms)`)
    console.log(`Memory: ${(currentMetrics.memoryUsage / 1024 / 1024).toFixed(2)}MB (baseline: ${(BASELINE_METRICS.memoryUsage / 1024 / 1024).toFixed(2)}MB)`)
    console.log(`Bundle: ${(currentMetrics.bundleSize / 1024).toFixed(2)}KB (baseline: ${(BASELINE_METRICS.bundleSize / 1024).toFixed(2)}KB)`)
  })
})