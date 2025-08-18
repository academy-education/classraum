"use client"

import React, { useState } from 'react'
import { 
  useDashboardData, 
  useRefreshMaterializedViews, 
  useRefreshPaymentViews,
  useRefreshStatus,
  calculatePercentageChange,
  formatCurrency,
  formatPercentage
} from '@/hooks/api/useMaterializedViews'
import { useUserStore } from '@/stores'
import { Card } from '@/components/patterns'
import { PageLayout } from '@/components/patterns'
import { Button } from '@/components/ui/button'
import { 
  Users, 
  BookOpen, 
  Calendar, 
  DollarSign, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
  Target,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import type { TimePeriod } from '@/lib/types/materializedViews'

interface DashboardWithMaterializedViewsProps {
  academyId: string
}

export const DashboardWithMaterializedViews: React.FC<DashboardWithMaterializedViewsProps> = ({ 
  academyId 
}) => {
  const { t } = useTranslation()
  const { user } = useUserStore()
  
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('month')
  
  // Fetch all dashboard data using materialized views
  const { 
    data, 
    isLoading, 
    isError, 
    errors, 
    refetchAll,
    queries 
  } = useDashboardData(academyId, { 
    academyId, 
    dateRange: selectedPeriod 
  })
  
  // Refresh controls
  const refreshAllViews = useRefreshMaterializedViews()
  const refreshPaymentViews = useRefreshPaymentViews()
  const { data: refreshStatus } = useRefreshStatus()

  // Handle period change
  const handlePeriodChange = (period: TimePeriod) => {
    setSelectedPeriod(period)
  }

  // Handle refresh
  const handleRefreshAll = async () => {
    try {
      await refreshAllViews.mutateAsync()
      await refetchAll()
    } catch (error) {
      console.error('Refresh failed:', error)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <PageLayout>
        <PageLayout.Content>
          <div className="animate-pulse space-y-6">
            <div className="h-32 bg-gray-200 rounded-lg" />
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg" />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[1, 2].map(i => (
                <div key={i} className="h-64 bg-gray-200 rounded-lg" />
              ))}
            </div>
          </div>
        </PageLayout.Content>
      </PageLayout>
    )
  }

  // Error state
  if (isError) {
    return (
      <PageLayout>
        <PageLayout.Content>
          <Card>
            <Card.Content>
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-red-600 mb-2">Dashboard Error</h3>
                <p className="text-gray-600 mb-4">
                  Failed to load dashboard data. This might be due to materialized views needing refresh.
                </p>
                <div className="space-y-2 mb-4">
                  {errors.map((error: any, index) => (
                    <p key={index} className="text-sm text-red-500">
                      {error?.message || 'Unknown error'}
                    </p>
                  ))}
                </div>
                <Button onClick={handleRefreshAll} disabled={refreshAllViews.isPending}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${refreshAllViews.isPending ? 'animate-spin' : ''}`} />
                  Refresh Dashboard
                </Button>
              </div>
            </Card.Content>
          </Card>
        </PageLayout.Content>
      </PageLayout>
    )
  }

  // Calculate growth metrics from trends data
  const currentPeriodRevenue = data.revenueTrends[0]?.daily_revenue || 0
  const previousPeriodRevenue = data.revenueTrends[1]?.daily_revenue || 0
  const revenueGrowth = calculatePercentageChange(currentPeriodRevenue, previousPeriodRevenue)

  const currentPeriodUsers = data.userGrowthTrends.reduce((sum, day) => sum + day.total_new_users, 0)
  const avgAttendanceRate = data.sessionAnalytics.length > 0 
    ? data.sessionAnalytics.reduce((sum, session) => sum + session.attendance_rate, 0) / data.sessionAnalytics.length 
    : 0

  // Key metrics cards
  const keyMetrics = [
    {
      title: t('dashboard.totalStudents'),
      value: data.academyStats?.total_students || 0,
      change: currentPeriodUsers,
      isPositive: currentPeriodUsers >= 0,
      icon: <Users className="w-6 h-6" />,
      color: 'text-blue-600',
      subtitle: `${data.academyStats?.active_students || 0} active`
    },
    {
      title: t('dashboard.totalRevenue'),
      value: formatCurrency(data.paymentAnalytics.reduce((sum, payment) => sum + payment.total_revenue, 0)),
      change: revenueGrowth,
      isPositive: revenueGrowth >= 0,
      icon: <DollarSign className="w-6 h-6" />,
      color: 'text-green-600',
      subtitle: formatCurrency(data.paymentAnalytics.reduce((sum, payment) => sum + payment.pending_revenue, 0)) + ' pending'
    },
    {
      title: t('dashboard.totalClassrooms'),
      value: data.academyStats?.total_classrooms || 0,
      change: data.academyStats?.new_classrooms_30d || 0,
      isPositive: (data.academyStats?.new_classrooms_30d || 0) >= 0,
      icon: <BookOpen className="w-6 h-6" />,
      color: 'text-purple-600',
      subtitle: `${data.academyStats?.active_classrooms || 0} active`
    },
    {
      title: 'Attendance Rate',
      value: formatPercentage(avgAttendanceRate),
      icon: <Target className="w-6 h-6" />,
      color: 'text-orange-600',
      subtitle: 'Average across all sessions'
    }
  ]

  return (
    <PageLayout>
      <PageLayout.Header
        actions={
          <div className="flex items-center gap-2">
            {/* Period selector */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {(['day', 'week', 'month', 'quarter'] as TimePeriod[]).map((period) => (
                <Button
                  key={period}
                  variant={selectedPeriod === period ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handlePeriodChange(period)}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </Button>
              ))}
            </div>
            
            {/* Refresh controls */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshPaymentViews.mutate()}
              disabled={refreshPaymentViews.isPending}
              title="Refresh payment data only"
            >
              <DollarSign className={`w-4 h-4 mr-2 ${refreshPaymentViews.isPending ? 'animate-spin' : ''}`} />
              Payments
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshAll}
              disabled={refreshAllViews.isPending}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshAllViews.isPending ? 'animate-spin' : ''}`} />
              Refresh All
            </Button>
          </div>
        }
      >
        <PageLayout.Title>
          {t('dashboard.welcome', { name: user?.name || 'User' })}
        </PageLayout.Title>
        <PageLayout.Description>
          {data.academyStats?.academy_name} - Dashboard Analytics
          {refreshStatus && (
            <span className="ml-2 text-sm text-gray-500">
              (Last updated: {new Date(refreshStatus.lastSuccessfulRefresh).toLocaleTimeString()})
            </span>
          )}
        </PageLayout.Description>
      </PageLayout.Header>

      <PageLayout.Content>
        {/* Key Metrics Grid */}
        <PageLayout.Grid columns={4}>
          {keyMetrics.map((metric, index) => (
            <Card key={index} hoverable>
              <Card.Content>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600">{metric.title}</p>
                    <p className="text-2xl font-bold">{metric.value}</p>
                    {metric.change !== undefined && (
                      <div className={`flex items-center gap-1 text-sm ${
                        metric.isPositive ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {metric.isPositive ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        <span>
                          {typeof metric.change === 'number' 
                            ? (metric.change > 0 ? `+${metric.change.toFixed(1)}` : metric.change.toFixed(1))
                            : metric.change
                          }
                          {typeof metric.change === 'number' && '%'}
                        </span>
                      </div>
                    )}
                    {metric.subtitle && (
                      <p className="text-xs text-gray-500">{metric.subtitle}</p>
                    )}
                  </div>
                  <div className={metric.color}>
                    {metric.icon}
                  </div>
                </div>
              </Card.Content>
            </Card>
          ))}
        </PageLayout.Grid>

        {/* Session Analytics */}
        <PageLayout.Section 
          title="Session Performance" 
          description={`Session analytics for the last ${selectedPeriod}`}
        >
          <PageLayout.Grid columns={3}>
            <Card>
              <Card.Header>
                <Card.Title className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Sessions Overview
                </Card.Title>
              </Card.Header>
              <Card.Content>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Sessions</span>
                    <span className="font-medium">
                      {data.sessionAnalytics.reduce((sum, session) => sum + session.total_sessions, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Completed</span>
                    <span className="font-medium text-green-600">
                      {data.sessionAnalytics.reduce((sum, session) => sum + session.completed_sessions, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Scheduled</span>
                    <span className="font-medium text-blue-600">
                      {data.sessionAnalytics.reduce((sum, session) => sum + session.scheduled_sessions, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Cancelled</span>
                    <span className="font-medium text-red-600">
                      {data.sessionAnalytics.reduce((sum, session) => sum + session.cancelled_sessions, 0)}
                    </span>
                  </div>
                </div>
              </Card.Content>
            </Card>

            <Card>
              <Card.Header>
                <Card.Title className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Attendance Metrics
                </Card.Title>
              </Card.Header>
              <Card.Content>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Attendees</span>
                    <span className="font-medium">
                      {data.sessionAnalytics.reduce((sum, session) => sum + session.total_attendees, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Present</span>
                    <span className="font-medium text-green-600">
                      {data.sessionAnalytics.reduce((sum, session) => sum + session.present_count, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Absent</span>
                    <span className="font-medium text-red-600">
                      {data.sessionAnalytics.reduce((sum, session) => sum + session.absent_count, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Late</span>
                    <span className="font-medium text-yellow-600">
                      {data.sessionAnalytics.reduce((sum, session) => sum + session.late_count, 0)}
                    </span>
                  </div>
                </div>
              </Card.Content>
            </Card>

            <Card>
              <Card.Header>
                <Card.Title className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Engagement
                </Card.Title>
              </Card.Header>
              <Card.Content>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Avg Attendance</span>
                    <span className="font-medium">
                      {formatPercentage(avgAttendanceRate)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Active Classrooms</span>
                    <span className="font-medium">
                      {data.sessionAnalytics.reduce((max, session) => 
                        Math.max(max, session.classrooms_with_sessions), 0
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Active Teachers</span>
                    <span className="font-medium">
                      {data.sessionAnalytics.reduce((max, session) => 
                        Math.max(max, session.teachers_with_sessions), 0
                      )}
                    </span>
                  </div>
                </div>
              </Card.Content>
            </Card>
          </PageLayout.Grid>
        </PageLayout.Section>

        {/* Payment Analytics */}
        <PageLayout.Section 
          title="Financial Overview" 
          description="Revenue and payment analytics"
        >
          <PageLayout.Grid columns={2}>
            <Card>
              <Card.Header>
                <Card.Title className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Payment Status
                </Card.Title>
              </Card.Header>
              <Card.Content>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Invoices</span>
                    <span className="font-medium">
                      {data.paymentAnalytics.reduce((sum, payment) => sum + payment.total_invoices, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Paid</span>
                    <span className="font-medium text-green-600">
                      {data.paymentAnalytics.reduce((sum, payment) => sum + payment.paid_invoices, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Pending</span>
                    <span className="font-medium text-yellow-600">
                      {data.paymentAnalytics.reduce((sum, payment) => sum + payment.pending_invoices, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Overdue</span>
                    <span className="font-medium text-red-600">
                      {data.paymentAnalytics.reduce((sum, payment) => sum + payment.overdue_invoices, 0)}
                    </span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Collection Rate</span>
                      <span className="font-medium">
                        {formatPercentage(
                          data.paymentAnalytics.length > 0 
                            ? data.paymentAnalytics.reduce((sum, payment) => sum + payment.collection_rate, 0) / data.paymentAnalytics.length
                            : 0
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </Card.Content>
            </Card>

            <Card>
              <Card.Header>
                <Card.Title className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Revenue Breakdown
                </Card.Title>
              </Card.Header>
              <Card.Content>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Revenue</span>
                    <span className="font-medium">
                      {formatCurrency(data.paymentAnalytics.reduce((sum, payment) => sum + payment.total_revenue, 0))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Pending Revenue</span>
                    <span className="font-medium text-yellow-600">
                      {formatCurrency(data.paymentAnalytics.reduce((sum, payment) => sum + payment.pending_revenue, 0))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Overdue Revenue</span>
                    <span className="font-medium text-red-600">
                      {formatCurrency(data.paymentAnalytics.reduce((sum, payment) => sum + payment.overdue_revenue, 0))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Discounts</span>
                    <span className="font-medium">
                      {formatCurrency(data.paymentAnalytics.reduce((sum, payment) => sum + payment.total_discounts, 0))}
                    </span>
                  </div>
                </div>
              </Card.Content>
            </Card>
          </PageLayout.Grid>
        </PageLayout.Section>

        {/* Recurring Payment Templates */}
        {data.recurringTemplateAnalytics.length > 0 && (
          <PageLayout.Section 
            title="Recurring Payment Templates" 
            description="Active recurring payment templates"
          >
            <div className="grid gap-4">
              {data.recurringTemplateAnalytics.slice(0, 3).map((template) => (
                <Card key={template.template_id}>
                  <Card.Content>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h4 className="font-medium">{template.template_name}</h4>
                        <p className="text-sm text-gray-600">
                          {template.recurrence_type} • {template.enrolled_students} students
                        </p>
                        <div className="flex items-center gap-4 text-sm">
                          <span>Monthly Revenue: {formatCurrency(template.total_monthly_revenue)}</span>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            template.template_health === 'healthy' 
                              ? 'bg-green-100 text-green-800'
                              : template.template_health === 'inactive'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {template.template_health}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{formatCurrency(template.template_amount)}</p>
                        <p className="text-sm text-gray-600">per student</p>
                        <p className={`text-xs mt-1 ${
                          template.due_status === 'overdue' ? 'text-red-600' :
                          template.due_status === 'due_today' ? 'text-orange-600' :
                          template.due_status === 'due_soon' ? 'text-yellow-600' :
                          'text-gray-600'
                        }`}>
                          {template.due_status.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                  </Card.Content>
                </Card>
              ))}
            </div>
          </PageLayout.Section>
        )}

        {/* Data Freshness Indicator */}
        {refreshStatus && (
          <Card>
            <Card.Header>
              <Card.Title className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Data Freshness
              </Card.Title>
            </Card.Header>
            <Card.Content>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {refreshStatus.views.slice(0, 4).map((view) => (
                  <div key={view.viewName} className="space-y-1">
                    <div className="flex items-center gap-2">
                      {view.isStale ? (
                        <AlertCircle className="w-4 h-4 text-yellow-500" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                      <span className="font-medium">{view.viewName.replace('mv_', '')}</span>
                    </div>
                    <p className="text-gray-600">
                      {new Date(view.lastRefresh).toLocaleTimeString()}
                    </p>
                    <p className="text-gray-500">
                      {view.rowCount.toLocaleString()} rows
                    </p>
                  </div>
                ))}
              </div>
            </Card.Content>
          </Card>
        )}
      </PageLayout.Content>
    </PageLayout>
  )
}