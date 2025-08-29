// Performance testing utilities and automated tests

import { performanceMonitor, performanceUtils } from '@/lib/performance'

// Mock performance API for testing
const mockPerformance = {
  now: jest.fn(() => Date.now()),
  getEntriesByType: jest.fn(() => []),
  mark: jest.fn(),
  measure: jest.fn(),
  memory: {
    usedJSHeapSize: 10 * 1024 * 1024, // 10MB
    totalJSHeapSize: 20 * 1024 * 1024, // 20MB
    jsHeapSizeLimit: 100 * 1024 * 1024 // 100MB
  }
}

// Mock PerformanceObserver for testing
const mockPerformanceObserver = jest.fn((__callback) => ({ /* eslint-disable-line @typescript-eslint/no-unused-vars */
  observe: jest.fn(),
  disconnect: jest.fn(),
  getEntries: jest.fn(() => [])
}))

// Set up global mocks
global.performance = mockPerformance as Performance & {
  memory?: {
    usedJSHeapSize: number
    totalJSHeapSize: number
    jsHeapSizeLimit: number
  }
}
global.PerformanceObserver = mockPerformanceObserver as unknown as typeof PerformanceObserver

describe('Performance Monitoring Tests', () => {
  beforeEach(() => {
    performanceMonitor.clear()
    jest.clearAllMocks()
  })

  describe('Basic Performance Measurement', () => {
    test('should measure sync operations', () => {
      const result = performanceUtils.measureSync('test-operation', () => {
        return 42
      })
      
      expect(result).toBe(42)
      
      const metrics = performanceMonitor.getMetrics()
      expect(metrics).toHaveLength(1)
      expect(metrics[0].name).toBe('test-operation')
      expect(metrics[0].value).toBeGreaterThan(0)
    })

    test('should measure async operations', async () => {
      const result = await performanceUtils.measureAsync('async-operation', async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return 'done'
      })
      
      expect(result).toBe('done')
      
      const metrics = performanceMonitor.getMetrics()
      expect(metrics).toHaveLength(1)
      expect(metrics[0].name).toBe('async-operation')
      expect(metrics[0].value).toBeGreaterThan(0)
    })

    test('should handle measurement errors gracefully', async () => {
      const error = new Error('Test error')
      
      await expect(
        performanceUtils.measureAsync('error-operation', async () => {
          throw error
        })
      ).rejects.toThrow('Test error')
      
      const metrics = performanceMonitor.getMetrics()
      expect(metrics).toHaveLength(1)
      expect(metrics[0].meta?.error).toBe(true)
    })
  })

  describe('Component Performance Tracking', () => {
    test('should track component render times', () => {
      performanceMonitor.trackComponentRender('TestComponent', 15.5)
      
      const componentMetrics = performanceMonitor.getComponentMetrics()
      expect(componentMetrics).toHaveLength(1)
      expect(componentMetrics[0].component).toBe('TestComponent')
      expect(componentMetrics[0].renderTime).toBe(15.5)
      expect(componentMetrics[0].renderCount).toBe(1)
    })

    test('should calculate moving average for multiple renders', () => {
      performanceMonitor.trackComponentRender('TestComponent', 10)
      performanceMonitor.trackComponentRender('TestComponent', 20)
      
      const componentMetrics = performanceMonitor.getComponentMetrics()
      expect(componentMetrics[0].renderCount).toBe(2)
      expect(componentMetrics[0].renderTime).toBe(15) // Average of 10 and 20
    })
  })

  describe('Memory Monitoring', () => {
    test('should get memory usage when available', () => {
      const memory = performanceMonitor.getMemoryUsage()
      
      expect(memory).toEqual({
        usedJSHeapSize: 10 * 1024 * 1024,
        totalJSHeapSize: 20 * 1024 * 1024,
        jsHeapSizeLimit: 100 * 1024 * 1024
      })
    })

    test('should return null when memory API unavailable', () => {
      const performanceWithMemory = global.performance as Performance & { memory?: unknown }
      const originalMemory = performanceWithMemory.memory
      delete performanceWithMemory.memory
      
      const memory = performanceMonitor.getMemoryUsage()
      expect(memory).toBeNull()
      
      // Restore
      performanceWithMemory.memory = originalMemory
    })
  })

  describe('Performance Warnings', () => {
    test('should detect render time warnings', () => {
      // Add some slow render metrics
      performanceMonitor.trackComponentRender('SlowComponent', 25)
      performanceMonitor.trackComponentRender('SlowComponent', 30)
      
      const warnings = performanceUtils.checkPerformance()
      expect(warnings.length).toBeGreaterThan(0)
      expect(warnings[0]).toContain('Average render time')
    })

    test('should detect memory warnings', () => {
      // Mock high memory usage
      const performanceWithMemory = global.performance as Performance & {
        memory?: {
          usedJSHeapSize: number
          totalJSHeapSize: number
          jsHeapSizeLimit: number
        }
      }
      performanceWithMemory.memory = {
        usedJSHeapSize: 85 * 1024 * 1024, // 85MB
        totalJSHeapSize: 90 * 1024 * 1024,
        jsHeapSizeLimit: 100 * 1024 * 1024 // 100MB limit
      }
      
      const warnings = performanceUtils.checkPerformance()
      expect(warnings.length).toBeGreaterThan(0)
      expect(warnings.some(w => w.includes('Memory usage'))).toBe(true)
    })
  })

  describe('Data Management', () => {
    test('should limit metrics to prevent memory leaks', () => {
      // Add more than 1000 metrics
      for (let i = 0; i < 1200; i++) {
        performanceMonitor.measure(`test-metric-${i}`, 10)
      }
      
      const metrics = performanceMonitor.getMetrics()
      expect(metrics).toHaveLength(1000) // Should be capped at 1000
    })

    test('should export data correctly', () => {
      performanceMonitor.trackComponentRender('TestComponent', 15)
      performanceMonitor.measure('test-operation', 10)
      
      const exported = performanceMonitor.exportData()
      
      expect(exported).toHaveProperty('metrics')
      expect(exported).toHaveProperty('components')
      expect(exported).toHaveProperty('pages')
      expect(exported).toHaveProperty('summary')
      expect(exported).toHaveProperty('timestamp')
      
      expect(exported.metrics).toHaveLength(1)
      expect(exported.components).toHaveLength(1)
    })

    test('should clear all data', () => {
      performanceMonitor.trackComponentRender('TestComponent', 15)
      performanceMonitor.measure('test-operation', 10)
      
      expect(performanceMonitor.getMetrics()).toHaveLength(1)
      expect(performanceMonitor.getComponentMetrics()).toHaveLength(1)
      
      performanceMonitor.clear()
      
      expect(performanceMonitor.getMetrics()).toHaveLength(0)
      expect(performanceMonitor.getComponentMetrics()).toHaveLength(0)
    })
  })

  describe('Performance Summary', () => {
    test('should generate performance summary', () => {
      performanceMonitor.trackComponentRender('Component1', 10)
      performanceMonitor.trackComponentRender('Component2', 20)
      performanceMonitor.measure('operation1', 5)
      
      const summary = performanceMonitor.getSummary()
      
      expect(summary).toHaveProperty('totalMetrics')
      expect(summary).toHaveProperty('componentCount')
      expect(summary).toHaveProperty('averageRenderTime')
      expect(summary).toHaveProperty('memoryUsage')
      expect(summary).toHaveProperty('recentMetrics')
      
      expect(summary.componentCount).toBe(2)
      expect(summary.totalMetrics).toBeGreaterThan(0)
    })
  })
})

// Performance benchmarks
describe('Performance Benchmarks', () => {
  test('should meet render time benchmarks', () => {
    const renderTime = performanceUtils.measureSync('component-render', () => {
      // Simulate component render work
      const start = Date.now()
      while (Date.now() - start < 5) {
        // Busy wait for 5ms
      }
    })
    
    // Should render in under 16ms for 60fps
    expect(renderTime).toBeLessThan(16)
  })

  test('should meet memory usage benchmarks', () => {
    const memory = performanceMonitor.getMemoryUsage()
    
    if (memory) {
      // Memory usage should be under 80% of limit
      const usagePercentage = memory.usedJSHeapSize / memory.jsHeapSizeLimit
      expect(usagePercentage).toBeLessThan(0.8)
    }
  })

  test('should meet operation timing benchmarks', async () => {
    const operations = [
      'data-fetch',
      'data-processing', 
      'ui-update',
      'state-update'
    ]
    
    for (const op of operations) {
      const time = await performanceUtils.measureAsync(op, async () => {
        await new Promise(resolve => setTimeout(resolve, 1))
      })
      
      // Each operation should complete quickly
      expect(time).toBeLessThan(100) // 100ms threshold
    }
  })
})

// Integration tests
describe('Performance Integration Tests', () => {
  test('should track multiple components simultaneously', () => {
    const components = ['Header', 'Sidebar', 'MainContent', 'Footer']
    
    components.forEach((component, index) => {
      performanceMonitor.trackComponentRender(component, (index + 1) * 10)
    })
    
    const metrics = performanceMonitor.getComponentMetrics()
    expect(metrics).toHaveLength(4)
    
    const headerMetric = metrics.find(m => m.component === 'Header')
    expect(headerMetric?.renderTime).toBe(10)
  })

  test('should handle concurrent measurements', async () => {
    const promises = Array.from({ length: 10 }, (_, i) => 
      performanceUtils.measureAsync(`concurrent-op-${i}`, async () => {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 10))
        return i
      })
    )
    
    const results = await Promise.all(promises)
    expect(results).toHaveLength(10)
    
    const metrics = performanceMonitor.getMetrics()
    expect(metrics).toHaveLength(10)
  })

  test('should maintain performance under load', () => {
    const startTime = Date.now()
    
    // Simulate high load
    for (let i = 0; i < 100; i++) {
      performanceMonitor.trackComponentRender(`Component${i}`, Math.random() * 20)
      performanceMonitor.measure(`operation${i}`, Math.random() * 10)
    }
    
    const endTime = Date.now()
    const totalTime = endTime - startTime
    
    // Performance monitoring itself should be fast
    expect(totalTime).toBeLessThan(100) // Should complete in under 100ms
    
    const summary = performanceMonitor.getSummary()
    expect(summary.totalMetrics).toBeGreaterThan(100)
    expect(summary.componentCount).toBeGreaterThan(50)
  })
})