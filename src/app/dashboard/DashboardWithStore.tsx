"use client"

import React, { useEffect } from 'react'
import { useAcademyStore, useDashboardStore, useUserStore, showSuccessToast, showErrorToast } from '@/stores'
import { Card } from '@/components/patterns'
import { PageLayout } from '@/components/patterns'
import { Button } from '@/components/ui/button'
import { Users, BookOpen, Calendar, DollarSign, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

interface DashboardWithStoreProps {
  academyId: string
}

export const DashboardWithStore: React.FC<DashboardWithStoreProps> = ({ academyId }) => {
  const { t } = useTranslation()
  
  // Access global stores
  const { user, preferences } = useUserStore()
  const { academy, academyStats, statsLoading, refreshStats } = useAcademyStore()
  const { metrics, filters, loading, refreshing, fetchDashboardData, setFilters } = useDashboardStore()

  // Initialize dashboard data
  useEffect(() => {
    if (academyId) {
      fetchDashboardData(academyId)
    }
  }, [academyId, fetchDashboardData])

  // Handle refresh
  const handleRefresh = async () => {
    try {
      await Promise.all([
        refreshStats(),
        fetchDashboardData(academyId)
      ])
      showSuccessToast(t('dashboard.refreshSuccess'))
    } catch (error) {
      showErrorToast(t('dashboard.refreshError'))
    }
  }

  // Handle date range change
  const handleDateRangeChange = (range: typeof filters.dateRange) => {
    setFilters({ dateRange: range })
    fetchDashboardData(academyId)
  }

  // Loading state
  if (loading || statsLoading) {
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
      value: academyStats?.upcomingSessions || 0,
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
            {/* Date range selector */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {(['week', 'month', 'quarter', 'year'] as const).map((range) => (
                <Button
                  key={range}
                  variant={filters.dateRange === range ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleDateRangeChange(range)}
                >
                  {t(`dashboard.${range}`)}
                </Button>
              ))}
            </div>
            
            {/* Refresh button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
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

        {/* Quick Actions */}
        <PageLayout.Section
          title={t('dashboard.quickActions')}
          description={t('dashboard.quickActionsDescription')}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card.Clickable
              onClick={() => console.log('Add student')}
              hoverable
            >
              <Card.Content>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">{t('dashboard.addStudent')}</p>
                    <p className="text-sm text-gray-600">{t('dashboard.newEnrollment')}</p>
                  </div>
                </div>
              </Card.Content>
            </Card.Clickable>

            <Card.Clickable
              onClick={() => console.log('Create classroom')}
              hoverable
            >
              <Card.Content>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <BookOpen className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">{t('dashboard.createClassroom')}</p>
                    <p className="text-sm text-gray-600">{t('dashboard.newClass')}</p>
                  </div>
                </div>
              </Card.Content>
            </Card.Clickable>

            <Card.Clickable
              onClick={() => console.log('Schedule session')}
              hoverable
            >
              <Card.Content>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Calendar className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium">{t('dashboard.scheduleSession')}</p>
                    <p className="text-sm text-gray-600">{t('dashboard.planClass')}</p>
                  </div>
                </div>
              </Card.Content>
            </Card.Clickable>

            <Card.Clickable
              onClick={() => console.log('Manage payments')}
              hoverable
            >
              <Card.Content>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <DollarSign className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium">{t('dashboard.managePayments')}</p>
                    <p className="text-sm text-gray-600">{t('dashboard.billing')}</p>
                  </div>
                </div>
              </Card.Content>
            </Card.Clickable>
          </div>
        </PageLayout.Section>

        {/* Trends Section */}
        {metrics && (
          <PageLayout.Section
            title={t('dashboard.trends')}
            description={t('dashboard.trendsDescription')}
          >
            <PageLayout.Grid columns={2}>
              <Card>
                <Card.Header>
                  <Card.Title>{t('dashboard.userGrowth')}</Card.Title>
                </Card.Header>
                <Card.Content>
                  {/* Chart would go here */}
                  <div className="h-64 flex items-center justify-center text-gray-400">
                    {t('dashboard.chartPlaceholder')}
                  </div>
                </Card.Content>
              </Card>

              <Card>
                <Card.Header>
                  <Card.Title>{t('dashboard.revenueGrowth')}</Card.Title>
                </Card.Header>
                <Card.Content>
                  {/* Chart would go here */}
                  <div className="h-64 flex items-center justify-center text-gray-400">
                    {t('dashboard.chartPlaceholder')}
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