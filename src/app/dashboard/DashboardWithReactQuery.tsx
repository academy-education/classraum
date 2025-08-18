"use client"

import React from 'react'
import { 
  useAcademy, 
  useAcademyStats, 
  useDashboardMetrics, 
  useUpcomingSessions,
  useRefreshDashboard 
} from '@/hooks/api'
import { useUserStore, useUIStore, showSuccessToast, showErrorToast } from '@/stores'
import { Card } from '@/components/patterns'
import { PageLayout } from '@/components/patterns'
import { Button } from '@/components/ui/button'
import { Users, BookOpen, Calendar, DollarSign, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

interface DashboardWithReactQueryProps {
  academyId: string
}

export const DashboardWithReactQuery: React.FC<DashboardWithReactQueryProps> = ({ academyId }) => {
  const { t } = useTranslation()
  
  // User state from Zustand (client state)
  const { user } = useUserStore()
  const { setGlobalLoading } = useUIStore()
  
  // Server state from React Query
  const { data: academy, isLoading: academyLoading } = useAcademy(academyId)
  const { data: academyStats, isLoading: statsLoading } = useAcademyStats(academyId)
  const { 
    data: metrics, 
    isLoading: metricsLoading, 
    refetch: refetchMetrics 
  } = useDashboardMetrics(academyId, { dateRange: 'month' })
  const { 
    data: upcomingSessions, 
    isLoading: sessionsLoading 
  } = useUpcomingSessions(academyId, 7)
  
  // Refresh utilities
  const { refreshAll } = useRefreshDashboard(academyId)

  // Handle global refresh
  const handleRefresh = async () => {
    try {
      setGlobalLoading(true, 'Refreshing dashboard data...')
      
      // Refresh all data
      await Promise.all([
        refetchMetrics(),
        refreshAll()
      ])
      
      showSuccessToast(t('dashboard.refreshSuccess'), 'Dashboard data has been updated.')
    } catch (error) {
      showErrorToast(t('dashboard.refreshError'), 'Failed to refresh data. Please try again.')
    } finally {
      setGlobalLoading(false)
    }
  }

  // Loading state
  const isLoading = academyLoading || statsLoading || metricsLoading

  if (isLoading) {
    return (
      <PageLayout>
        <PageLayout.Content>
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-gray-200 rounded-lg" />
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 bg-gray-200 rounded-lg" />
              ))}
            </div>
          </div>
        </PageLayout.Content>
      </PageLayout>
    )
  }

  // Error state
  if (!academy && !academyLoading) {
    return (
      <PageLayout>
        <PageLayout.Content>
          <Card>
            <Card.Content>
              <div className="text-center py-8">
                <p className="text-red-600">Failed to load academy data</p>
                <Button onClick={handleRefresh} className="mt-4">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              </div>
            </Card.Content>
          </Card>
        </PageLayout.Content>
      </PageLayout>
    )
  }

  // Stat cards data
  const statCards = [
    {
      title: t('dashboard.totalStudents'),
      value: academyStats?.totalStudents || 0,
      change: metrics?.userGrowth.percentageChange,
      isPositive: metrics?.userGrowth.isPositive,
      icon: <Users className="w-6 h-6" />,
      color: 'text-blue-600'
    },
    {
      title: t('dashboard.totalClassrooms'),
      value: academyStats?.totalClassrooms || 0,
      change: metrics?.classroomGrowth.percentageChange,
      isPositive: metrics?.classroomGrowth.isPositive,
      icon: <BookOpen className="w-6 h-6" />,
      color: 'text-green-600'
    },
    {
      title: t('dashboard.upcomingSessions'),
      value: upcomingSessions?.length || 0,
      icon: <Calendar className="w-6 h-6" />,
      color: 'text-purple-600'
    },
    {
      title: t('dashboard.totalRevenue'),
      value: `₩${(academyStats?.totalRevenue || 0).toLocaleString()}`,
      change: metrics?.revenueStats.percentageChange,
      isPositive: metrics?.revenueStats.isPositive,
      icon: <DollarSign className="w-6 h-6" />,
      color: 'text-orange-600'
    }
  ]

  return (
    <PageLayout>
      <PageLayout.Header
        actions={
          <div className="flex items-center gap-2">
            {/* Refresh button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {t('dashboard.refresh')}
            </Button>
          </div>
        }
      >
        <PageLayout.Title>
          {t('dashboard.welcome', { name: user?.name || 'User' })}
        </PageLayout.Title>
        <PageLayout.Description>
          {academy?.name} - {t('dashboard.overview')}
        </PageLayout.Description>
      </PageLayout.Header>

      <PageLayout.Content>
        {/* Stats Grid */}
        <PageLayout.Grid columns={4}>
          {statCards.map((stat, index) => (
            <Card key={index} hoverable>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  {stat.change !== undefined && (
                    <div className={`flex items-center gap-1 text-sm ${
                      stat.isPositive ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {stat.isPositive ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      <span>{stat.change.toFixed(1)}%</span>
                      <span className="text-gray-500">vs last period</span>
                    </div>
                  )}
                </div>
                <div className={stat.color}>
                  {stat.icon}
                </div>
              </div>
            </Card>
          ))}
        </PageLayout.Grid>

        {/* Upcoming Sessions */}
        <PageLayout.Section
          title={t('dashboard.upcomingSessions')}
          description={t('dashboard.upcomingSessionsDescription')}
        >
          <PageLayout.Grid columns={2}>
            {sessionsLoading ? (
              <div className="col-span-2 animate-pulse">
                <div className="h-32 bg-gray-200 rounded-lg" />
              </div>
            ) : upcomingSessions && upcomingSessions.length > 0 ? (
              upcomingSessions.slice(0, 4).map((session) => (
                <Card key={session.id} hoverable>
                  <Card.Content>
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium text-sm">{session.title}</h4>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          session.status === 'scheduled' 
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {session.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p>{session.classroom.name}</p>
                        <p>{session.teacher.name}</p>
                        <p>{new Date(session.start_time).toLocaleString()}</p>
                        <p>{session.enrolled_count}/{session.classroom.capacity} enrolled</p>
                      </div>
                    </div>
                  </Card.Content>
                </Card>
              ))
            ) : (
              <div className="col-span-2 text-center py-8 text-gray-500">
                No upcoming sessions
              </div>
            )}
          </PageLayout.Grid>
        </PageLayout.Section>

        {/* Performance Metrics */}
        {metrics && (
          <PageLayout.Section
            title={t('dashboard.performanceMetrics')}
            description={t('dashboard.performanceDescription')}
          >
            <PageLayout.Grid columns={3}>
              <Card>
                <Card.Header>
                  <Card.Title>Sessions</Card.Title>
                </Card.Header>
                <Card.Content>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Completed</span>
                      <span className="font-medium">{metrics.sessionStats.completed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Upcoming</span>
                      <span className="font-medium">{metrics.sessionStats.upcoming}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Avg. Attendance</span>
                      <span className="font-medium">{metrics.sessionStats.averageAttendance.toFixed(1)}%</span>
                    </div>
                  </div>
                </Card.Content>
              </Card>

              <Card>
                <Card.Header>
                  <Card.Title>Payments</Card.Title>
                </Card.Header>
                <Card.Content>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Completed</span>
                      <span className="font-medium text-green-600">{metrics.paymentStats.completed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Pending</span>
                      <span className="font-medium text-yellow-600">{metrics.paymentStats.pending}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Overdue</span>
                      <span className="font-medium text-red-600">{metrics.paymentStats.overdue}</span>
                    </div>
                  </div>
                </Card.Content>
              </Card>

              <Card>
                <Card.Header>
                  <Card.Title>Revenue Target</Card.Title>
                </Card.Header>
                <Card.Content>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Current</span>
                      <span className="font-medium">₩{metrics.revenueStats.current.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Target</span>
                      <span className="font-medium">₩{metrics.revenueStats.target.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(metrics.revenueStats.targetPercentage, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-600 text-center">
                      {metrics.revenueStats.targetPercentage.toFixed(1)}% of target
                    </p>
                  </div>
                </Card.Content>
              </Card>
            </PageLayout.Grid>
          </PageLayout.Section>
        )}
      </PageLayout.Content>
    </PageLayout>
  )
}