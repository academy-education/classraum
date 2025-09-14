/**
 * Cache Management Dashboard
 * 
 * A comprehensive dashboard for monitoring and controlling the universal caching system.
 * Only shown in development mode for debugging and optimization.
 */

"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Database, 
  Trash2, 
  RefreshCw, 
  Activity, 
  Clock,
  HardDrive,
  Zap,
  AlertTriangle,
  CheckCircle,
  TrendingUp
} from 'lucide-react'
import { universalCache, CacheCategory, CacheMetrics } from '@/lib/universal-cache'

interface CacheManagementDashboardProps {
  academyId?: string
}

export function CacheManagementDashboard({ academyId }: CacheManagementDashboardProps) {
  const [metrics, setMetrics] = useState<CacheMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Refresh metrics
  const refreshMetrics = useCallback(() => {
    setIsLoading(true)
    try {
      const currentMetrics = universalCache.getMetrics()
      setMetrics(currentMetrics)
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Failed to get cache metrics:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Auto-refresh metrics every 10 seconds
  useEffect(() => {
    refreshMetrics()
    const interval = setInterval(refreshMetrics, 10000)
    return () => clearInterval(interval)
  }, [refreshMetrics])

  // Format bytes to readable size
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Format percentage
  const formatPercent = (value: number): string => {
    return `${value.toFixed(1)}%`
  }

  // Get status color based on metrics
  const getStatusColor = (value: number, thresholds: { good: number; warning: number }): string => {
    if (value >= thresholds.good) return 'bg-green-500'
    if (value >= thresholds.warning) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  // Handle cache operations
  const handleInvalidateCategory = (category: CacheCategory) => {
    if (window.confirm(`Are you sure you want to invalidate all ${category} caches?`)) {
      universalCache.invalidateCategory(category, academyId)
      refreshMetrics()
    }
  }

  const handleInvalidateAcademy = () => {
    if (academyId && window.confirm(`Are you sure you want to invalidate all caches for academy ${academyId}?`)) {
      universalCache.invalidateAcademy(academyId)
      refreshMetrics()
    }
  }

  const handleInvalidateAll = () => {
    if (window.confirm('Are you sure you want to invalidate ALL caches? This will impact performance.')) {
      universalCache.invalidateAll()
      refreshMetrics()
    }
  }

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to CLEAR all cache data? This will significantly impact performance.')) {
      universalCache.clearAll()
      refreshMetrics()
    }
  }

  const handleWarmCache = async () => {
    if (academyId) {
      setIsLoading(true)
      try {
        await universalCache.warmCache(academyId)
        refreshMetrics()
      } finally {
        setIsLoading(false)
      }
    }
  }

  if (!metrics) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          <span>Loading cache metrics...</span>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Database className="h-6 w-6" />
          <h2 className="text-xl font-semibold">Cache Management Dashboard</h2>
          {lastUpdated && (
            <Badge variant="outline" className="text-xs">
              Updated {lastUpdated.toLocaleTimeString()}
            </Badge>
          )}
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={refreshMetrics}
            disabled={isLoading}
            size="sm"
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {academyId && (
            <Button
              onClick={handleWarmCache}
              disabled={isLoading}
              size="sm"
              variant="outline"
            >
              <Zap className="h-4 w-4 mr-1" />
              Warm Cache
            </Button>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Hit Rate</p>
              <p className="text-2xl font-bold text-green-600">
                {formatPercent(metrics.hitRate)}
              </p>
            </div>
            <div className={`w-3 h-3 rounded-full ${getStatusColor(metrics.hitRate, { good: 80, warning: 60 })}`} />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Memory Usage</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatPercent(metrics.memoryUsage)}
              </p>
            </div>
            <div className={`w-3 h-3 rounded-full ${getStatusColor(100 - metrics.memoryUsage, { good: 50, warning: 20 })}`} />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Load Time</p>
              <p className="text-2xl font-bold text-purple-600">
                {metrics.averageLoadTime.toFixed(0)}ms
              </p>
            </div>
            <Clock className="h-6 w-6 text-purple-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Cache Size</p>
              <p className="text-2xl font-bold text-orange-600">
                {formatBytes(metrics.totalSize)}
              </p>
            </div>
            <HardDrive className="h-6 w-6 text-orange-500" />
          </div>
        </Card>
      </div>

      {/* Performance Status */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Activity className="h-5 w-5 mr-2" />
          Performance Status
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              {metrics.hitRate >= 80 ? (
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
              )}
              <span>Cache Hit Rate</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-mono">{formatPercent(metrics.hitRate)}</span>
              <Badge variant={metrics.hitRate >= 80 ? "default" : "secondary"}>
                {metrics.hitRate >= 80 ? "Good" : "Needs Improvement"}
              </Badge>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              {metrics.memoryUsage <= 80 ? (
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              )}
              <span>Memory Usage</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-mono">{formatPercent(metrics.memoryUsage)}</span>
              <Badge variant={metrics.memoryUsage <= 80 ? "default" : "destructive"}>
                {metrics.memoryUsage <= 80 ? "Normal" : "High"}
              </Badge>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <TrendingUp className="h-5 w-5 text-blue-500 mr-2" />
              <span>Total Entries</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-mono">{metrics.totalEntries}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Cache Operations */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Cache Operations</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.values(CacheCategory).map(category => (
            <Button
              key={category}
              onClick={() => handleInvalidateCategory(category)}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              Clear {category}
            </Button>
          ))}
        </div>
        
        <div className="mt-4 pt-4 border-t flex justify-between">
          <div className="space-x-2">
            {academyId && (
              <Button
                onClick={handleInvalidateAcademy}
                variant="outline"
                size="sm"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear Academy
              </Button>
            )}
          </div>
          
          <div className="space-x-2">
            <Button
              onClick={handleInvalidateAll}
              variant="outline"
              size="sm"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Invalidate All
            </Button>
            <Button
              onClick={handleClearAll}
              variant="destructive"
              size="sm"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear All Data
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

/**
 * Compact version for smaller spaces
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function CompactCacheStatus({ academyId: _academyId }: { academyId?: string }) {
  const [metrics, setMetrics] = useState<CacheMetrics | null>(null)

  useEffect(() => {
    const refreshMetrics = () => {
      try {
        setMetrics(universalCache.getMetrics())
      } catch (error) {
        console.error('Failed to get cache metrics:', error)
      }
    }

    refreshMetrics()
    const interval = setInterval(refreshMetrics, 30000) // 30 seconds
    return () => clearInterval(interval)
  }, [])

  if (!metrics) return null

  return (
    <div className="flex items-center space-x-4 text-xs text-gray-500">
      <div className="flex items-center space-x-1">
        <Database className="h-3 w-3" />
        <span>Cache: {formatPercent(metrics.hitRate)} hit</span>
      </div>
      <div className="flex items-center space-x-1">
        <HardDrive className="h-3 w-3" />
        <span>{formatBytes(metrics.totalSize)}</span>
      </div>
      <div className="flex items-center space-x-1">
        <Clock className="h-3 w-3" />
        <span>{metrics.averageLoadTime.toFixed(0)}ms avg</span>
      </div>
    </div>
  )

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i]
  }

  function formatPercent(value: number): string {
    return `${value.toFixed(0)}%`
  }
}