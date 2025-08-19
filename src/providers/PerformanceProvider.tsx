"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { performanceMonitor, performanceUtils, PerformanceSummary } from '@/lib/performance'

interface PerformanceContextType {
  isMonitoring: boolean
  toggleMonitoring: () => void
  exportData: () => void
  clearData: () => void
  getSummary: () => PerformanceSummary
}

const PerformanceContext = createContext<PerformanceContextType | undefined>(undefined)

interface PerformanceProviderProps {
  children: React.ReactNode
  enableAutoTracking?: boolean
  enableWarnings?: boolean
  warningThresholds?: {
    renderTime?: number
    memoryUsage?: number
  }
}

export const PerformanceProvider: React.FC<PerformanceProviderProps> = ({
  children,
  enableAutoTracking = true,
  enableWarnings = true,
  warningThresholds = {
    renderTime: 16, // 60fps threshold
    memoryUsage: 0.8 // 80% of memory limit
  }
}) => {
  const [isMonitoring, setIsMonitoring] = useState(enableAutoTracking)
  
  useEffect(() => {
    if (!isMonitoring) return
    
    // Auto-track page navigation in Next.js
    const trackNavigation = () => {
      setTimeout(() => {
        performanceMonitor.trackPageLoad(window.location.pathname)
        performanceMonitor.trackBundleSize()
      }, 100)
    }
    
    // Track initial load
    if (document.readyState === 'complete') {
      trackNavigation()
    } else {
      window.addEventListener('load', trackNavigation)
    }
    
    // Track route changes (Next.js specific)
    const handleRouteChange = () => {
      setTimeout(trackNavigation, 100)
    }
    
    // Listen for History API changes (SPA navigation)
    const originalPushState = window.history.pushState
    const originalReplaceState = window.history.replaceState
    
    window.history.pushState = function(...args) {
      originalPushState.apply(window.history, args)
      handleRouteChange()
    }
    
    window.history.replaceState = function(...args) {
      originalReplaceState.apply(window.history, args)
      handleRouteChange()
    }
    
    window.addEventListener('popstate', handleRouteChange)
    
    // Performance monitoring interval
    let monitoringInterval: NodeJS.Timeout | undefined
    
    if (enableWarnings) {
      monitoringInterval = setInterval(() => {
        const warnings = performanceUtils.checkPerformance()
        
        // Custom warning thresholds
        const summary = performanceMonitor.getSummary()
        
        if (summary.averageRenderTime > warningThresholds.renderTime!) {
          console.warn(`Performance: Average render time (${summary.averageRenderTime.toFixed(2)}ms) exceeds threshold (${warningThresholds.renderTime}ms)`)
        }
        
        const memory = summary.memoryUsage
        if (memory && memory.usedJSHeapSize > memory.jsHeapSizeLimit * warningThresholds.memoryUsage!) {
          console.warn(`Performance: Memory usage approaching limit (${((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100).toFixed(1)}%)`)
        }
        
        // Log periodic performance summary in development
        if (process.env.NODE_ENV === 'development') {
          performanceUtils.throttledLog(30000) // Every 30 seconds
        }
      }, 15000) // Check every 15 seconds
    }
    
    return () => {
      window.removeEventListener('load', trackNavigation)
      window.removeEventListener('popstate', handleRouteChange)
      
      // Restore original methods
      window.history.pushState = originalPushState
      window.history.replaceState = originalReplaceState
      
      if (monitoringInterval) {
        clearInterval(monitoringInterval)
      }
    }
  }, [isMonitoring, enableWarnings, warningThresholds])
  
  const toggleMonitoring = () => {
    setIsMonitoring(!isMonitoring)
  }
  
  const exportData = () => {
    const data = performanceMonitor.exportData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `performance-data-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }
  
  const clearData = () => {
    performanceMonitor.clear()
  }
  
  const getSummary = () => {
    return performanceMonitor.getSummary()
  }
  
  const value: PerformanceContextType = {
    isMonitoring,
    toggleMonitoring,
    exportData,
    clearData,
    getSummary
  }
  
  return (
    <PerformanceContext.Provider value={value}>
      {children}
    </PerformanceContext.Provider>
  )
}

export const usePerformance = (): PerformanceContextType => {
  const context = useContext(PerformanceContext)
  if (context === undefined) {
    throw new Error('usePerformance must be used within a PerformanceProvider')
  }
  return context
}

// Performance monitoring debug panel (development only)
export const PerformanceDebugPanel: React.FC = () => {
  const { isMonitoring, toggleMonitoring, exportData, clearData, getSummary } = usePerformance()
  const [isVisible, setIsVisible] = useState(false)
  const [summary, setSummary] = useState(getSummary())
  
  useEffect(() => {
    const interval = setInterval(() => {
      setSummary(getSummary())
    }, 2000)
    
    return () => clearInterval(interval)
  }, [getSummary])
  
  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null
  }
  
  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 z-50"
        title="Performance Monitor"
      >
        📊
      </button>
    )
  }
  
  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-sm z-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Performance Monitor</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span>Status:</span>
          <span className={isMonitoring ? 'text-green-600' : 'text-red-600'}>
            {isMonitoring ? 'Monitoring' : 'Stopped'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Avg Render:</span>
          <span>{summary.averageRenderTime.toFixed(2)}ms</span>
        </div>
        
        <div className="flex justify-between">
          <span>Components:</span>
          <span>{summary.componentCount}</span>
        </div>
        
        <div className="flex justify-between">
          <span>Memory:</span>
          <span>
            {summary.memoryUsage 
              ? `${(summary.memoryUsage.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB`
              : 'N/A'
            }
          </span>
        </div>
      </div>
      
      <div className="mt-3 space-y-1">
        <button
          onClick={toggleMonitoring}
          className="w-full bg-blue-600 text-white py-1 px-2 rounded text-xs hover:bg-blue-700"
        >
          {isMonitoring ? 'Stop' : 'Start'} Monitoring
        </button>
        
        <div className="flex space-x-1">
          <button
            onClick={exportData}
            className="flex-1 bg-gray-600 text-white py-1 px-2 rounded text-xs hover:bg-gray-700"
          >
            Export
          </button>
          <button
            onClick={clearData}
            className="flex-1 bg-red-600 text-white py-1 px-2 rounded text-xs hover:bg-red-700"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  )
}