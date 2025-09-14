"use client"

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

interface PerformanceMetric {
  loadTime: number
  cacheHit: boolean
  queryCount: number
  lastUpdated: string
}

interface PerformanceDashboardProps {
  enabled?: boolean
}

export function PerformanceDashboard({ enabled = process.env.NODE_ENV === 'development' }: PerformanceDashboardProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [assignmentsMetrics, setAssignmentsMetrics] = useState<PerformanceMetric[]>([])
  const [attendanceMetrics, setAttendanceMetrics] = useState<PerformanceMetric[]>([])

  const loadMetrics = () => {
    try {
      const assignmentsData = localStorage.getItem('perf-assignments-react-query')
      const attendanceData = localStorage.getItem('perf-attendance-react-query')
      
      if (assignmentsData) {
        setAssignmentsMetrics(JSON.parse(assignmentsData))
      }
      
      if (attendanceData) {
        setAttendanceMetrics(JSON.parse(attendanceData))
      }
    } catch (error) {
      console.error('Failed to load performance metrics:', error)
    }
  }

  const clearMetrics = () => {
    localStorage.removeItem('perf-assignments-react-query')
    localStorage.removeItem('perf-attendance-react-query')
    localStorage.removeItem('perf-assignments')
    localStorage.removeItem('perf-attendance')
    setAssignmentsMetrics([])
    setAttendanceMetrics([])
  }

  const getAverageLoadTime = (metrics: PerformanceMetric[]) => {
    if (metrics.length === 0) return 0
    const total = metrics.reduce((sum, metric) => sum + metric.loadTime, 0)
    return Math.round(total / metrics.length)
  }

  const getCacheHitRate = (metrics: PerformanceMetric[]) => {
    if (metrics.length === 0) return 0
    const hits = metrics.filter(metric => metric.cacheHit).length
    return Math.round((hits / metrics.length) * 100)
  }

  const getQueryReduction = (metrics: PerformanceMetric[]) => {
    if (metrics.length === 0) return 0
    const avgQueries = metrics.reduce((sum, metric) => sum + metric.queryCount, 0) / metrics.length
    const originalQueries = 7 // Original number of queries before optimization
    return Math.round(Math.max(0, ((originalQueries - avgQueries) / originalQueries) * 100))
  }

  const formatChartData = (metrics: PerformanceMetric[]) => {
    return metrics.slice(-10).map((metric, index) => ({
      name: `Load ${index + 1}`,
      loadTime: metric.loadTime,
      queryCount: metric.queryCount,
      cacheHit: metric.cacheHit ? 1 : 0
    }))
  }

  useEffect(() => {
    if (enabled && isOpen) {
      loadMetrics()
      const interval = setInterval(loadMetrics, 5000) // Refresh every 5 seconds
      return () => clearInterval(interval)
    }
  }, [enabled, isOpen])

  if (!enabled) return null

  return (
    <>
      {/* Floating Performance Button */}
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          variant="outline"
          size="sm"
          className="bg-white shadow-lg border-2 border-blue-500 text-blue-600 hover:bg-blue-50"
        >
          📊 Perf
        </Button>
      </div>

      {/* Performance Dashboard Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Performance Dashboard</h2>
                <div className="flex gap-2">
                  <Button onClick={loadMetrics} variant="outline" size="sm">
                    🔄 Refresh
                  </Button>
                  <Button onClick={clearMetrics} variant="outline" size="sm">
                    🗑️ Clear
                  </Button>
                  <Button onClick={() => setIsOpen(false)} variant="outline" size="sm">
                    ✕ Close
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Assignments Performance */}
                <Card className="p-4">
                  <h3 className="text-lg font-semibold mb-4 text-blue-600">📝 Assignments Page</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Average Load Time:</span>
                      <span className="font-mono">{getAverageLoadTime(assignmentsMetrics)}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cache Hit Rate:</span>
                      <span className="font-mono">{getCacheHitRate(assignmentsMetrics)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Query Reduction:</span>
                      <span className="font-mono">{getQueryReduction(assignmentsMetrics)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Loads:</span>
                      <span className="font-mono">{assignmentsMetrics.length}</span>
                    </div>
                  </div>
                </Card>

                {/* Attendance Performance */}
                <Card className="p-4">
                  <h3 className="text-lg font-semibold mb-4 text-green-600">👥 Attendance Page</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Average Load Time:</span>
                      <span className="font-mono">{getAverageLoadTime(attendanceMetrics)}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cache Hit Rate:</span>
                      <span className="font-mono">{getCacheHitRate(attendanceMetrics)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Query Reduction:</span>
                      <span className="font-mono">{getQueryReduction(attendanceMetrics)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Loads:</span>
                      <span className="font-mono">{attendanceMetrics.length}</span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Charts */}
              {(assignmentsMetrics.length > 0 || attendanceMetrics.length > 0) && (
                <div className="space-y-6">
                  {/* Load Time Chart */}
                  {assignmentsMetrics.length > 0 && (
                    <Card className="p-4">
                      <h4 className="text-md font-semibold mb-4">📝 Assignments Load Time Trend</h4>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={formatChartData(assignmentsMetrics)}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip formatter={(value, name) => [
                              name === 'loadTime' ? `${value}ms` : value,
                              name === 'loadTime' ? 'Load Time' : 'Query Count'
                            ]} />
                            <Line type="monotone" dataKey="loadTime" stroke="#3B82F6" strokeWidth={2} />
                            <Line type="monotone" dataKey="queryCount" stroke="#EF4444" strokeWidth={2} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>
                  )}

                  {attendanceMetrics.length > 0 && (
                    <Card className="p-4">
                      <h4 className="text-md font-semibold mb-4">👥 Attendance Load Time Trend</h4>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={formatChartData(attendanceMetrics)}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip formatter={(value, name) => [
                              name === 'loadTime' ? `${value}ms` : value,
                              name === 'loadTime' ? 'Load Time' : 'Query Count'
                            ]} />
                            <Line type="monotone" dataKey="loadTime" stroke="#10B981" strokeWidth={2} />
                            <Line type="monotone" dataKey="queryCount" stroke="#F59E0B" strokeWidth={2} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>
                  )}
                </div>
              )}

              {assignmentsMetrics.length === 0 && attendanceMetrics.length === 0 && (
                <Card className="p-8 text-center">
                  <div className="text-gray-500">
                    <h3 className="text-lg font-semibold mb-2">No performance data yet</h3>
                    <p>Visit the Assignments or Attendance pages to start collecting performance metrics.</p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}