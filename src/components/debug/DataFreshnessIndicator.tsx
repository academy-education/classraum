"use client"

import { useState, useEffect } from 'react'
import { DataFreshnessDebugger } from '@/utils/debugDataFreshness'

interface DataFreshnessIndicatorProps {
  enabled?: boolean
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}

export function DataFreshnessIndicator({
  enabled = process.env.NODE_ENV === 'development',
  position = 'bottom-right'
}: DataFreshnessIndicatorProps) {
  const [freshnessData, setFreshnessData] = useState<Record<string, any>>({})
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (!enabled) return

    const interval = setInterval(() => {
      const data = DataFreshnessDebugger.getAllInfo()
      setFreshnessData(data)
    }, 1000) // Update every second

    return () => clearInterval(interval)
  }, [enabled])

  if (!enabled || typeof window === 'undefined') return null

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  }

  const dataEntries = Object.entries(freshnessData)
  const staleCount = dataEntries.filter(([, info]) => info.isStale).length

  return (
    <div className={`fixed ${positionClasses[position]} z-[9999]`}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className={`px-3 py-2 text-xs font-mono rounded-lg shadow-lg transition-colors ${
          staleCount > 0
            ? 'bg-red-500 text-white hover:bg-red-600'
            : 'bg-green-500 text-white hover:bg-green-600'
        }`}
        title="Click to toggle data freshness info"
      >
        Data: {staleCount > 0 ? `${staleCount} STALE` : 'FRESH'}
      </button>

      {/* Info Panel */}
      {isVisible && (
        <div className="mt-2 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-w-sm max-h-96 overflow-y-auto">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Data Freshness ({dataEntries.length})
            </h3>
            <button
              onClick={() => DataFreshnessDebugger.printReport()}
              className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              title="Print detailed report to console"
            >
              Log
            </button>
          </div>

          {dataEntries.length === 0 ? (
            <p className="text-xs text-gray-500">No data tracked</p>
          ) : (
            <div className="space-y-2">
              {dataEntries.map(([key, info]) => {
                const ageSeconds = Math.round(info.age / 1000)
                const staleTimeSeconds = Math.round(info.staleTime / 1000)

                return (
                  <div
                    key={key}
                    className={`p-2 rounded text-xs border ${
                      info.isStale
                        ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                        : 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-mono text-xs truncate max-w-[200px]" title={key}>
                        {key.replace('mobile-', '')}
                      </span>
                      <span
                        className={`px-1 py-0.5 rounded text-xs font-bold ${
                          info.isStale
                            ? 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200'
                            : 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200'
                        }`}
                      >
                        {info.isStale ? 'STALE' : 'FRESH'}
                      </span>
                    </div>
                    <div className="mt-1 text-gray-600 dark:text-gray-400">
                      Age: {ageSeconds}s / {staleTimeSeconds}s
                    </div>
                    {info.lastFetched && (
                      <div className="mt-1 text-gray-500 dark:text-gray-500 text-xs">
                        Last: {new Date(info.lastFetched).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                DataFreshnessDebugger.clear()
                setFreshnessData({})
              }}
              className="text-xs px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 w-full"
            >
              Clear All
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DataFreshnessIndicator