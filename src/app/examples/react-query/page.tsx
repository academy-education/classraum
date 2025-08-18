"use client"

import React, { useState } from 'react'
import { 
  useAcademy, 
  useAcademyStats, 
  useUser,
  useUserNotifications,
  useDashboardMetrics,
  useUpcomingSessions,
  useUpdateAcademy,
  useMarkAllNotificationsRead,
  useRefreshDashboard
} from '@/hooks/api'
import { Card } from '@/components/patterns'
import { PageLayout } from '@/components/patterns'
import { Button } from '@/components/ui/button'
import { 
  RefreshCw, 
  Users, 
  BookOpen, 
  Calendar, 
  DollarSign,
  TrendingUp,
  TrendingDown,
  Bell,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react'

export default function ReactQueryExamplePage() {
  const [selectedAcademyId] = useState('sample-academy-id')
  const [selectedUserId] = useState('sample-user-id')

  // Server state queries
  const academyQuery = useAcademy(selectedAcademyId)
  const statsQuery = useAcademyStats(selectedAcademyId)
  const userQuery = useUser(selectedUserId)
  const notificationsQuery = useUserNotifications(selectedUserId)
  const metricsQuery = useDashboardMetrics(selectedAcademyId, { dateRange: 'month' })
  const sessionsQuery = useUpcomingSessions(selectedAcademyId, 7)

  // Mutations
  const updateAcademy = useUpdateAcademy()
  const markAllNotificationsRead = useMarkAllNotificationsRead()
  
  // Utilities
  const { refreshAll } = useRefreshDashboard(selectedAcademyId)

  // Handlers
  const handleRefreshAll = async () => {
    await Promise.all([
      refreshAll(),
      academyQuery.refetch(),
      statsQuery.refetch(),
      userQuery.refetch(),
      notificationsQuery.refetch()
    ])
  }

  const handleUpdateAcademy = () => {
    updateAcademy.mutate({
      academyId: selectedAcademyId,
      updates: {
        name: 'Updated Academy Name',
        description: 'Updated description via React Query'
      }
    })
  }

  const handleMarkNotificationsRead = () => {
    markAllNotificationsRead.mutate({ userId: selectedUserId })
  }

  return (
    <PageLayout>
      <PageLayout.Header
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshAll}
              disabled={academyQuery.isFetching}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${academyQuery.isFetching ? 'animate-spin' : ''}`} />
              Refresh All
            </Button>
          </div>
        }
      >
        <PageLayout.Title>React Query Example</PageLayout.Title>
        <PageLayout.Description>
          Demonstrating React Query hooks for server state management
        </PageLayout.Description>
      </PageLayout.Header>

      <PageLayout.Content>
        {/* Query Status Overview */}
        <PageLayout.Section title="Query Status Overview" description="Real-time status of all queries">
          <PageLayout.Grid columns={3}>
            <Card>
              <Card.Header>
                <Card.Title className="text-sm">Academy Query</Card.Title>
              </Card.Header>
              <Card.Content>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className={`${academyQuery.isLoading ? 'text-yellow-600' : academyQuery.error ? 'text-red-600' : 'text-green-600'}`}>
                      {academyQuery.isLoading ? 'Loading' : academyQuery.error ? 'Error' : 'Success'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fetching:</span>
                    <span>{academyQuery.isFetching ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Stale:</span>
                    <span>{academyQuery.isStale ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cache Status:</span>
                    <span className="text-xs">{academyQuery.fetchStatus}</span>
                  </div>
                </div>
              </Card.Content>
            </Card>

            <Card>
              <Card.Header>
                <Card.Title className="text-sm">Stats Query</Card.Title>
              </Card.Header>
              <Card.Content>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className={`${statsQuery.isLoading ? 'text-yellow-600' : statsQuery.error ? 'text-red-600' : 'text-green-600'}`}>
                      {statsQuery.isLoading ? 'Loading' : statsQuery.error ? 'Error' : 'Success'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fetching:</span>
                    <span>{statsQuery.isFetching ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Data Age:</span>
                    <span className="text-xs">
                      {statsQuery.dataUpdatedAt ? 
                        `${Math.round((Date.now() - statsQuery.dataUpdatedAt) / 1000)}s ago` : 
                        'Never'
                      }
                    </span>
                  </div>
                </div>
              </Card.Content>
            </Card>

            <Card>
              <Card.Header>
                <Card.Title className="text-sm">Notifications Query</Card.Title>
              </Card.Header>
              <Card.Content>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className={`${notificationsQuery.isLoading ? 'text-yellow-600' : notificationsQuery.error ? 'text-red-600' : 'text-green-600'}`}>
                      {notificationsQuery.isLoading ? 'Loading' : notificationsQuery.error ? 'Error' : 'Success'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Count:</span>
                    <span>{notificationsQuery.data?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Unread:</span>
                    <span className="font-medium">
                      {notificationsQuery.data?.filter(n => !n.read).length || 0}
                    </span>
                  </div>
                </div>
              </Card.Content>
            </Card>
          </PageLayout.Grid>
        </PageLayout.Section>

        {/* Data Display */}
        <PageLayout.Section title="Cached Data" description="Data fetched and cached by React Query">
          <PageLayout.Grid columns={2}>
            {/* Academy Data */}
            <Card>
              <Card.Header>
                <Card.Title>Academy Information</Card.Title>
              </Card.Header>
              <Card.Content>
                {academyQuery.isLoading ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                  </div>
                ) : academyQuery.error ? (
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">Failed to load academy data</span>
                  </div>
                ) : academyQuery.data ? (
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-gray-600">Name:</span>
                      <p className="font-medium">{academyQuery.data.name}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">ID:</span>
                      <p className="text-sm font-mono">{academyQuery.data.id}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Created:</span>
                      <p className="text-sm">{new Date(academyQuery.data.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm">No data</div>
                )}
              </Card.Content>
            </Card>

            {/* Statistics */}
            <Card>
              <Card.Header>
                <Card.Title>Academy Statistics</Card.Title>
              </Card.Header>
              <Card.Content>
                {statsQuery.isLoading ? (
                  <div className="animate-pulse space-y-3">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="flex justify-between">
                        <div className="h-3 bg-gray-200 rounded w-1/3" />
                        <div className="h-3 bg-gray-200 rounded w-1/4" />
                      </div>
                    ))}
                  </div>
                ) : statsQuery.error ? (
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">Failed to load statistics</span>
                  </div>
                ) : statsQuery.data ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Students
                      </span>
                      <span className="font-medium">{statsQuery.data.totalStudents}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        Classrooms
                      </span>
                      <span className="font-medium">{statsQuery.data.totalClassrooms}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Upcoming Sessions
                      </span>
                      <span className="font-medium">{statsQuery.data.upcomingSessions}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Revenue
                      </span>
                      <span className="font-medium">₩{statsQuery.data.totalRevenue.toLocaleString()}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm">No data</div>
                )}
              </Card.Content>
            </Card>
          </PageLayout.Grid>
        </PageLayout.Section>

        {/* Performance Metrics */}
        {metricsQuery.data && (
          <PageLayout.Section title="Performance Metrics" description="Dashboard metrics with trend indicators">
            <PageLayout.Grid columns={4}>
              <Card>
                <Card.Content>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">User Growth</p>
                      <p className="text-2xl font-bold">{metricsQuery.data.userGrowth.current}</p>
                      <div className={`flex items-center gap-1 text-sm ${
                        metricsQuery.data.userGrowth.isPositive ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {metricsQuery.data.userGrowth.isPositive ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        <span>{metricsQuery.data.userGrowth.percentageChange.toFixed(1)}%</span>
                      </div>
                    </div>
                    <Users className="w-8 h-8 text-blue-600" />
                  </div>
                </Card.Content>
              </Card>

              <Card>
                <Card.Content>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Revenue</p>
                      <p className="text-2xl font-bold">₩{metricsQuery.data.revenueStats.current.toLocaleString()}</p>
                      <div className={`flex items-center gap-1 text-sm ${
                        metricsQuery.data.revenueStats.isPositive ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {metricsQuery.data.revenueStats.isPositive ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        <span>{metricsQuery.data.revenueStats.percentageChange.toFixed(1)}%</span>
                      </div>
                    </div>
                    <DollarSign className="w-8 h-8 text-green-600" />
                  </div>
                </Card.Content>
              </Card>

              <Card>
                <Card.Content>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Sessions</p>
                      <p className="text-2xl font-bold">{metricsQuery.data.sessionStats.completed}</p>
                      <p className="text-sm text-gray-600">
                        {metricsQuery.data.sessionStats.upcoming} upcoming
                      </p>
                    </div>
                    <Calendar className="w-8 h-8 text-purple-600" />
                  </div>
                </Card.Content>
              </Card>

              <Card>
                <Card.Content>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Avg. Attendance</p>
                      <p className="text-2xl font-bold">{metricsQuery.data.sessionStats.averageAttendance.toFixed(1)}%</p>
                      <p className="text-sm text-gray-600">per session</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-orange-600" />
                  </div>
                </Card.Content>
              </Card>
            </PageLayout.Grid>
          </PageLayout.Section>
        )}

        {/* Notifications */}
        <PageLayout.Section 
          title="Recent Notifications" 
          description="User notifications with real-time updates"
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkNotificationsRead}
              disabled={markAllNotificationsRead.isPending}
            >
              <Bell className="w-4 h-4 mr-2" />
              Mark All Read
            </Button>
          }
        >
          <Card>
            <Card.Content>
              {notificationsQuery.isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse flex gap-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : notificationsQuery.data && notificationsQuery.data.length > 0 ? (
                <div className="space-y-4">
                  {notificationsQuery.data.slice(0, 5).map((notification) => (
                    <div 
                      key={notification.id} 
                      className={`flex gap-3 p-3 rounded-lg ${
                        notification.read ? 'bg-gray-50' : 'bg-blue-50 border border-blue-200'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        notification.type === 'error' ? 'bg-red-100 text-red-600' :
                        notification.type === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                        notification.type === 'success' ? 'bg-green-100 text-green-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        <Info className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{notification.title}</h4>
                        <p className="text-sm text-gray-600">{notification.message}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No notifications</p>
                </div>
              )}
            </Card.Content>
          </Card>
        </PageLayout.Section>

        {/* Mutation Examples */}
        <PageLayout.Section title="Mutation Examples" description="Demonstrate mutations and optimistic updates">
          <PageLayout.Grid columns={2}>
            <Card>
              <Card.Header>
                <Card.Title>Update Academy</Card.Title>
              </Card.Header>
              <Card.Content>
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    This mutation will update the academy name and description, 
                    automatically invalidating and refetching related queries.
                  </p>
                  <Button
                    onClick={handleUpdateAcademy}
                    disabled={updateAcademy.isPending}
                    className="w-full"
                  >
                    {updateAcademy.isPending ? 'Updating...' : 'Update Academy'}
                  </Button>
                  {updateAcademy.error && (
                    <div className="text-red-600 text-sm">
                      Error: {updateAcademy.error.message}
                    </div>
                  )}
                </div>
              </Card.Content>
            </Card>

            <Card>
              <Card.Header>
                <Card.Title>Cache Invalidation</Card.Title>
              </Card.Header>
              <Card.Content>
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Refresh all queries to demonstrate cache invalidation 
                    and background refetching capabilities.
                  </p>
                  <Button
                    onClick={handleRefreshAll}
                    disabled={academyQuery.isFetching}
                    variant="outline"
                    className="w-full"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${academyQuery.isFetching ? 'animate-spin' : ''}`} />
                    Refresh All Data
                  </Button>
                </div>
              </Card.Content>
            </Card>
          </PageLayout.Grid>
        </PageLayout.Section>
      </PageLayout.Content>
    </PageLayout>
  )
}