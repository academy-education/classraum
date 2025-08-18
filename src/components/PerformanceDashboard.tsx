"use client"

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  performanceMonitor, 
  performanceUtils,
  usePerformanceTracking 
} from '@/lib/performance'
import { 
  Activity, 
  Clock, 
  Zap, 
  TrendingUp, 
  AlertTriangle,
  Download,
  RotateCcw,
  BarChart3
} from 'lucide-react'

interface PerformanceDashboardProps {
  className?: string
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ 
  className = "" 
}) => {
  usePerformanceTracking('PerformanceDashboard')
  
  const [summary, setSummary] = useState(performanceMonitor.getSummary())
  const [componentMetrics, setComponentMetrics] = useState(performanceMonitor.getComponentMetrics())
  const [pageMetrics, setPageMetrics] = useState(performanceMonitor.getPageMetrics())
  const [warnings, setWarnings] = useState<string[]>([])
  const [isAutoRefresh, setIsAutoRefresh] = useState(true)
  
  const refreshData = () => {
    setSummary(performanceMonitor.getSummary())
    setComponentMetrics(performanceMonitor.getComponentMetrics())
    setPageMetrics(performanceMonitor.getPageMetrics())
    setWarnings(performanceUtils.checkPerformance())
  }
  
  useEffect(() => {
    refreshData()
    
    if (isAutoRefresh) {
      const interval = setInterval(refreshData, 5000) // Refresh every 5 seconds
      return () => clearInterval(interval)
    }
  }, [isAutoRefresh])
  
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
    refreshData()
  }
  
  const formatMs = (ms: number) => `${ms.toFixed(2)}ms`
  const formatMB = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)}MB`
  
  // Top 10 slowest components
  const slowestComponents = componentMetrics
    .sort((a, b) => b.renderTime - a.renderTime)
    .slice(0, 10)
  
  // Recent performance trends
  const recentMetrics = summary.recentMetrics || []
  const avgRecentRenderTime = recentMetrics
    .filter(m => m.name.includes('render'))
    .reduce((sum, m, _, arr) => arr.length ? sum + m.value / arr.length : 0, 0)
  
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Activity className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Performance Dashboard</h2>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => setIsAutoRefresh(!isAutoRefresh)}
            variant={isAutoRefresh ? "default" : "outline"}
            size="sm"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Auto Refresh: {isAutoRefresh ? "ON" : "OFF"}
          </Button>
          
          <Button onClick={refreshData} size="sm" variant="outline">
            <RotateCcw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          
          <Button onClick={exportData} size="sm" variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          
          <Button onClick={clearData} size="sm" variant="outline">
            Clear Data
          </Button>
        </div>
      </div>
      
      {/* Performance Warnings */}
      {warnings.length > 0 && (
        <Card className="p-4 border-orange-200 bg-orange-50">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <h3 className="font-semibold text-orange-900">Performance Warnings</h3>
          </div>
          <ul className="space-y-1">
            {warnings.map((warning, index) => (
              <li key={index} className="text-sm text-orange-800">
                • {warning}
              </li>
            ))}
          </ul>
        </Card>
      )}
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center space-x-3">
            <Clock className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Avg Render Time</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatMs(summary.averageRenderTime)}
              </p>
              <p className="text-xs text-gray-500">
                Recent: {formatMs(avgRecentRenderTime)}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center space-x-3">
            <BarChart3 className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Components Tracked</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary.componentCount}
              </p>
              <p className="text-xs text-gray-500">
                {summary.totalMetrics} total metrics
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center space-x-3">
            <TrendingUp className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-sm text-gray-600">Memory Usage</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary.memoryUsage ? formatMB(summary.memoryUsage.usedJSHeapSize) : 'N/A'}
              </p>
              <p className="text-xs text-gray-500">
                {summary.memoryUsage ? `Limit: ${formatMB(summary.memoryUsage.jsHeapSizeLimit)}` : 'Not available'}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center space-x-3">
            <Zap className="w-8 h-8 text-orange-600" />
            <div>
              <p className="text-sm text-gray-600">Pages Monitored</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary.pageCount}
              </p>
              <p className="text-xs text-gray-500">
                Performance tracked
              </p>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Component Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Slowest Components
          </h3>
          <div className="space-y-3">
            {slowestComponents.length > 0 ? (
              slowestComponents.map((component, index) => (
                <div key={component.component} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-600">
                      #{index + 1}
                    </span>
                    <span className="text-sm text-gray-900 truncate max-w-xs">
                      {component.component}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="text-gray-600">
                      {formatMs(component.renderTime)}
                    </span>
                    <span className="text-gray-500">
                      ({component.renderCount} renders)
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                No component metrics available yet
              </p>
            )}
          </div>
        </Card>
        
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Page Performance
          </h3>
          <div className="space-y-3">
            {pageMetrics.length > 0 ? (
              pageMetrics.map((page, index) => (
                <div key={page.page} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {page.page}
                    </span>
                    <span className="text-sm text-gray-600">
                      {formatMs(page.loadTime)}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                    <span>FCP: {formatMs(page.firstContentfulPaint)}</span>
                    <span>LCP: {formatMs(page.largestContentfulPaint)}</span>
                    <span>TTI: {formatMs(page.timeToInteractive)}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                No page metrics available yet
              </p>
            )}
          </div>
        </Card>
      </div>
      
      {/* Recent Metrics */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Performance Metrics
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3 text-gray-600">Metric</th>
                <th className="text-left py-2 px-3 text-gray-600">Value</th>
                <th className="text-left py-2 px-3 text-gray-600">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {recentMetrics.length > 0 ? (
                recentMetrics.slice(-10).map((metric, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-2 px-3 text-gray-900">{metric.name}</td>
                    <td className="py-2 px-3 text-gray-600">{formatMs(metric.value)}</td>
                    <td className="py-2 px-3 text-gray-500">
                      {new Date(metric.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-gray-500">
                    No recent metrics available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}