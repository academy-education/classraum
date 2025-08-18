# React Query API Hooks

This directory contains React Query hooks for efficient server state management in the Classraum application. These hooks provide caching, background refetching, optimistic updates, and comprehensive error handling for all API operations.

## 🏗 Architecture Overview

### React Query Benefits

1. **Automatic Caching**: Data is cached and shared across components
2. **Background Refetching**: Keeps data fresh automatically
3. **Optimistic Updates**: UI updates immediately while syncing in background
4. **Error Recovery**: Automatic retries with exponential backoff
5. **Loading States**: Built-in loading and error state management
6. **DevTools**: Excellent debugging experience

### Hook Organization

```
src/hooks/api/
├── useAcademyQueries.ts    # Academy data and statistics
├── useUserQueries.ts       # User profile and preferences
├── useDashboardQueries.ts  # Dashboard metrics and analytics
├── index.ts               # Centralized exports
└── README.md             # This file
```

## 📦 Query Keys

Each hook uses a consistent query key factory pattern for cache management:

```typescript
// Academy queries
academyKeys.academy(id)     // ['academy', 'detail', id]
academyKeys.stats(id)       // ['academy', 'stats', id]
academyKeys.users(id)       // ['academy', 'users', id]

// User queries  
userKeys.user(id)           // ['user', 'detail', id]
userKeys.preferences(id)    // ['user', 'preferences', id]
userKeys.notifications(id)  // ['user', 'notifications', id]

// Dashboard queries
dashboardKeys.metrics(id, filters)  // ['dashboard', 'metrics', id, filters]
dashboardKeys.trends(id, period)    // ['dashboard', 'trends', id, period]
```

## 🚀 Usage Examples

### 1. Basic Query Usage

```typescript
import { useAcademy, useAcademyStats } from '@/hooks/api'

function DashboardComponent({ academyId }: { academyId: string }) {
  const { 
    data: academy, 
    isLoading, 
    error,
    refetch 
  } = useAcademy(academyId)
  
  const { 
    data: stats, 
    isLoading: statsLoading 
  } = useAcademyStats(academyId)

  if (isLoading || statsLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />

  return (
    <div>
      <h1>{academy.name}</h1>
      <p>Students: {stats.totalStudents}</p>
      <button onClick={() => refetch()}>Refresh</button>
    </div>
  )
}
```

### 2. Mutations with Optimistic Updates

```typescript
import { useUpdateAcademy } from '@/hooks/api'

function AcademySettings({ academyId }: { academyId: string }) {
  const updateAcademy = useUpdateAcademy()

  const handleSave = (formData: AcademyFormData) => {
    updateAcademy.mutate({
      academyId,
      updates: formData
    }, {
      onSuccess: (data) => {
        console.log('Academy updated:', data)
        // Toast notification and cache update handled automatically
      },
      onError: (error) => {
        console.error('Update failed:', error)
        // Error toast handled automatically
      }
    })
  }

  return (
    <form onSubmit={handleSave}>
      {/* form fields */}
      <button 
        type="submit" 
        disabled={updateAcademy.isPending}
      >
        {updateAcademy.isPending ? 'Saving...' : 'Save'}
      </button>
    </form>
  )
}
```

### 3. Conditional Queries

```typescript
import { useUserNotifications } from '@/hooks/api'

function NotificationBell({ userId }: { userId: string }) {
  // Only fetch unread notifications
  const { data: unreadNotifications } = useUserNotifications(userId, true)
  
  return (
    <div className="relative">
      <BellIcon />
      {unreadNotifications && unreadNotifications.length > 0 && (
        <Badge count={unreadNotifications.length} />
      )}
    </div>
  )
}
```

### 4. Parallel Queries

```typescript
import { useAcademy, useAcademyStats, useDashboardMetrics } from '@/hooks/api'

function ComprehensiveDashboard({ academyId }: { academyId: string }) {
  // All queries run in parallel automatically
  const academyQuery = useAcademy(academyId)
  const statsQuery = useAcademyStats(academyId)
  const metricsQuery = useDashboardMetrics(academyId, { dateRange: 'month' })

  // Check if any query is still loading
  const isLoading = [academyQuery, statsQuery, metricsQuery]
    .some(query => query.isLoading)

  // Check if all data is available
  const allDataLoaded = [academyQuery, statsQuery, metricsQuery]
    .every(query => query.data)

  if (isLoading) return <LoadingState />
  if (!allDataLoaded) return <ErrorState />

  return (
    <Dashboard 
      academy={academyQuery.data}
      stats={statsQuery.data}
      metrics={metricsQuery.data}
    />
  )
}
```

### 5. Manual Cache Updates

```typescript
import { useQueryClient } from '@tanstack/react-query'
import { academyKeys } from '@/hooks/api'

function useOptimisticUpdate() {
  const queryClient = useQueryClient()

  const updateAcademyOptimistically = (academyId: string, updates: Partial<Academy>) => {
    // Update cache immediately
    queryClient.setQueryData(
      academyKeys.academy(academyId),
      (old: Academy) => ({ ...old, ...updates })
    )

    // Invalidate related queries to refetch
    queryClient.invalidateQueries({ 
      queryKey: academyKeys.stats(academyId) 
    })
  }

  return { updateAcademyOptimistically }
}
```

## 🔧 Advanced Features

### 1. Error Handling

```typescript
import { useAcademy } from '@/hooks/api'

function AcademyComponent({ academyId }: { academyId: string }) {
  const { data, error, isError } = useAcademy(academyId)

  if (isError) {
    // Error is automatically typed based on your API
    if (error.status === 404) {
      return <NotFoundPage />
    }
    if (error.status === 403) {
      return <UnauthorizedPage />
    }
    return <GenericErrorPage error={error} />
  }

  return <AcademyDetails academy={data} />
}
```

### 2. Background Refetching

```typescript
// Queries automatically refetch in the background when:
// - Window regains focus
// - Network reconnects
// - At specified intervals

const { data } = useAcademyStats(academyId, {
  // Custom refetch interval (optional)
  refetchInterval: 5 * 60 * 1000, // 5 minutes
  
  // Refetch when user returns to tab
  refetchOnWindowFocus: true,
  
  // Refetch when network reconnects
  refetchOnReconnect: true,
})
```

### 3. Dependent Queries

```typescript
import { useUser, useAcademy } from '@/hooks/api'

function UserDashboard({ userId }: { userId: string }) {
  const { data: user } = useUser(userId)
  
  // Academy query depends on user data
  const { data: academy } = useAcademy(user?.academy_id!, {
    enabled: !!user?.academy_id // Only run when we have academy_id
  })

  return (
    <div>
      <h1>{user?.name}</h1>
      <h2>{academy?.name}</h2>
    </div>
  )
}
```

### 4. Infinite Queries (Pagination)

```typescript
import { useInfiniteQuery } from '@tanstack/react-query'

export const useInfiniteNotifications = (userId: string) => {
  return useInfiniteQuery({
    queryKey: ['notifications', userId, 'infinite'],
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .range(pageParam * 20, (pageParam + 1) * 20 - 1)
        .order('created_at', { ascending: false })

      if (error) throw error
      return { data, nextPage: pageParam + 1 }
    },
    getNextPageParam: (lastPage, pages) => 
      lastPage.data.length === 20 ? lastPage.nextPage : undefined,
    initialPageParam: 0,
  })
}

// Usage
function NotificationsList({ userId }: { userId: string }) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteNotifications(userId)

  return (
    <div>
      {data?.pages.map((page, i) => (
        <div key={i}>
          {page.data.map(notification => (
            <NotificationItem key={notification.id} notification={notification} />
          ))}
        </div>
      ))}
      
      {hasNextPage && (
        <button 
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  )
}
```

## 📊 Performance Optimizations

### 1. Selective Data Fetching

```typescript
// Only fetch specific fields
const { data: userProfile } = useQuery({
  queryKey: ['user', userId, 'profile-minimal'],
  queryFn: async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, name, avatar_url') // Only needed fields
      .eq('id', userId)
      .single()
    return data
  }
})
```

### 2. Stale-While-Revalidate

```typescript
// Show cached data immediately, fetch fresh data in background
const { data } = useAcademyStats(academyId, {
  staleTime: 5 * 60 * 1000,    // Consider data fresh for 5 minutes
  gcTime: 10 * 60 * 1000,      // Keep in cache for 10 minutes
})
```

### 3. Query Prefetching

```typescript
import { useQueryClient } from '@tanstack/react-query'

function useDataPrefetching() {
  const queryClient = useQueryClient()

  const prefetchAcademyData = (academyId: string) => {
    // Prefetch data that will likely be needed
    queryClient.prefetchQuery({
      queryKey: academyKeys.academy(academyId),
      queryFn: () => fetchAcademy(academyId),
      staleTime: 5 * 60 * 1000,
    })
  }

  return { prefetchAcademyData }
}

// Usage in route transitions
function AcademyLink({ academyId }: { academyId: string }) {
  const { prefetchAcademyData } = useDataPrefetching()

  return (
    <Link 
      href={`/academy/${academyId}`}
      onMouseEnter={() => prefetchAcademyData(academyId)}
    >
      View Academy
    </Link>
  )
}
```

## 🧪 Testing

### 1. Mock Queries in Tests

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
})

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={createTestQueryClient()}>
    {children}
  </QueryClientProvider>
)

test('academy component renders correctly', async () => {
  const queryClient = createTestQueryClient()
  
  // Pre-populate cache with test data
  queryClient.setQueryData(
    academyKeys.academy('test-id'),
    { id: 'test-id', name: 'Test Academy' }
  )

  render(
    <QueryClientProvider client={queryClient}>
      <AcademyComponent academyId="test-id" />
    </QueryClientProvider>
  )

  // Test component behavior...
})
```

### 2. Integration with MSW

```typescript
// Setup MSW handlers for API mocking
import { rest } from 'msw'

export const handlers = [
  rest.get('/api/academies/:id', (req, res, ctx) => {
    return res(ctx.json({
      id: req.params.id,
      name: 'Mock Academy',
      totalStudents: 150
    }))
  }),
]
```

## 🔧 Best Practices

### 1. Query Key Consistency

```typescript
// ✅ Good - Use query key factories
const academyQuery = useQuery({
  queryKey: academyKeys.academy(academyId),
  queryFn: () => fetchAcademy(academyId)
})

// ❌ Avoid - Hardcoded query keys
const academyQuery = useQuery({
  queryKey: ['academy', academyId],
  queryFn: () => fetchAcademy(academyId)
})
```

### 2. Error Boundaries

```typescript
import { ErrorBoundary } from 'react-error-boundary'

function ErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <div role="alert">
      <h2>Something went wrong:</h2>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <DashboardComponent />
    </ErrorBoundary>
  )
}
```

### 3. Loading States

```typescript
function ComponentWithLoading() {
  const { data, isLoading, isFetching, error } = useAcademy(academyId)

  // isLoading: true only on first load
  // isFetching: true during any fetch (including background)

  if (isLoading) return <FullPageLoader />
  if (error) return <ErrorPage />

  return (
    <div>
      {/* Show subtle loading indicator during background refetch */}
      {isFetching && <TopLoadingBar />}
      <Content data={data} />
    </div>
  )
}
```

### 4. Cache Invalidation Strategy

```typescript
// Invalidate specific queries
queryClient.invalidateQueries({ queryKey: academyKeys.all })

// Invalidate and refetch immediately
queryClient.refetchQueries({ queryKey: academyKeys.academy(academyId) })

// Remove from cache entirely
queryClient.removeQueries({ queryKey: academyKeys.academy(academyId) })

// Update cache directly
queryClient.setQueryData(academyKeys.academy(academyId), newData)
```

## 🚀 Migration Guide

### From Zustand to React Query

```typescript
// Before - Zustand store
const useAcademyStore = create((set) => ({
  academy: null,
  loading: false,
  fetchAcademy: async (id) => {
    set({ loading: true })
    const data = await api.getAcademy(id)
    set({ academy: data, loading: false })
  }
}))

// After - React Query hook
const useAcademy = (academyId: string) => {
  return useQuery({
    queryKey: academyKeys.academy(academyId),
    queryFn: () => api.getAcademy(academyId),
    enabled: !!academyId
  })
}
```

## 📋 Configuration

The query client is configured in `src/providers/QueryProvider.tsx` with optimized defaults:

- **Stale Time**: 5 minutes (data considered fresh)
- **Cache Time**: 10 minutes (data kept in memory)
- **Retry Logic**: 3 retries with exponential backoff
- **Refetch Policies**: On window focus and network reconnect
- **DevTools**: Enabled in development

---

This React Query implementation provides robust server state management with excellent performance characteristics and developer experience.