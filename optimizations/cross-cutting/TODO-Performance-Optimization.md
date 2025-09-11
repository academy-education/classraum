# Performance Optimization 🟡

## Overview
**Priority**: 🟡 Medium  
**Scope**: Application-wide performance improvements  
**Estimated Effort**: 1-2 weeks  
**Dependencies**: Component refactoring from Phases 1-2

This document covers React-specific performance optimizations, caching strategies, and bundle optimization across the entire application.

---

## React Performance Optimizations

### 🎯 Task 1: Component Memoization Strategy

#### Objective
Implement strategic React.memo usage to reduce unnecessary re-renders across the application.

#### Implementation Steps

##### Sub-task 1.1: Identify Memoization Candidates
- [ ] **Audit components for memoization opportunities**
  ```typescript
  // Stable components (props rarely change):
  // ✅ Good candidates:
  // - StatsCard (props change infrequently)
  // - NavigationItem (stable props)
  // - ErrorFallback (only error prop)
  // - LoadingSkeleton (no props or static props)
  // - NotificationItem (stable after load)
  
  // ❌ Poor candidates:
  // - Form components (props change frequently)
  // - Real-time data displays
  // - Components with callbacks as props (unless memoized)
  ```

##### Sub-task 1.2: Apply React.memo with Custom Comparisons
- [ ] **Implement React.memo for stable components**
  ```typescript
  // StatsCard with custom comparison
  const StatsCard = React.memo(({ 
    title, 
    value, 
    trend, 
    icon 
  }: StatsCardProps) => {
    return (
      <Card className="p-6 hover:shadow-md transition-shadow border-l-4 border-blue-500">
        <div className="space-y-3">
          <p className="text-sm font-medium text-blue-700">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-semibold text-gray-900">{value}</p>
            {trend && <TrendIndicator trend={trend} />}
          </div>
          {icon && <div className="mt-4">{icon}</div>}
        </div>
      </Card>
    )
  }, (prevProps, nextProps) => {
    // Custom comparison for complex props
    return (
      prevProps.title === nextProps.title &&
      prevProps.value === nextProps.value &&
      JSON.stringify(prevProps.trend) === JSON.stringify(nextProps.trend)
    )
  })
  ```

##### Sub-task 1.3: Optimize Callback Props
- [ ] **Memoize callback props to prevent unnecessary re-renders**
  ```typescript
  // In parent components
  const ParentComponent = () => {
    const [data, setData] = useState([])
    
    // ✅ Memoized callback
    const handleItemClick = useCallback((id: string) => {
      // Handle click logic
      router.push(`/item/${id}`)
    }, [router])
    
    // ✅ Memoized filter function
    const handleFilter = useCallback((filterValue: string) => {
      setData(prev => prev.filter(item => item.name.includes(filterValue)))
    }, [])
    
    return (
      <div>
        {data.map(item => (
          <MemoizedItemCard
            key={item.id}
            item={item}
            onClick={handleItemClick}
            onFilter={handleFilter}
          />
        ))}
      </div>
    )
  }
  ```

---

### 🎯 Task 2: Code Splitting & Lazy Loading

#### Objective
Reduce initial bundle size and implement progressive loading for better performance.

#### Implementation Steps

##### Sub-task 2.1: Route-Level Code Splitting
- [ ] **Implement dynamic imports for page components**
  ```typescript
  // In main routing file
  import { lazy, Suspense } from 'react'
  
  // Dynamic imports for major pages
  const DashboardPage = lazy(() => import('./dashboard/page'))
  const SessionsPage = lazy(() => import('./sessions/page'))
  const AssignmentsPage = lazy(() => import('./assignments/page'))
  const AttendancePage = lazy(() => import('./attendance/page'))
  const PaymentsPage = lazy(() => import('./payments/page'))
  
  // Usage with Suspense
  const AppRouter = () => (
    <Router>
      <Routes>
        <Route path="/dashboard" element={
          <Suspense fallback={<PageSkeleton />}>
            <DashboardPage />
          </Suspense>
        } />
        <Route path="/sessions" element={
          <Suspense fallback={<PageSkeleton />}>
            <SessionsPage />
          </Suspense>
        } />
        {/* More routes */}
      </Routes>
    </Router>
  )
  ```

##### Sub-task 2.2: Component-Level Code Splitting
- [ ] **Split large components and features**
  ```typescript
  // Dashboard chart components
  const RevenueChart = lazy(() => import('./components/RevenueChart'))
  const UserGrowthChart = lazy(() => import('./components/UserGrowthChart'))
  
  // Modal components (loaded on demand)
  const EditSessionModal = lazy(() => import('./modals/EditSessionModal'))
  const PaymentModal = lazy(() => import('./modals/PaymentModal'))
  
  // Usage
  const DashboardPage = () => {
    const [showEditModal, setShowEditModal] = useState(false)
    
    return (
      <div>
        <div className="grid grid-cols-2 gap-6">
          <Suspense fallback={<ChartSkeleton />}>
            <RevenueChart />
          </Suspense>
          <Suspense fallback={<ChartSkeleton />}>
            <UserGrowthChart />
          </Suspense>
        </div>
        
        {showEditModal && (
          <Suspense fallback={<ModalSkeleton />}>
            <EditSessionModal onClose={() => setShowEditModal(false)} />
          </Suspense>
        )}
      </div>
    )
  }
  ```

##### Sub-task 2.3: Library Code Splitting
- [ ] **Split heavy dependencies**
  ```typescript
  // Date manipulation (heavy library)
  const formatDate = async (date: Date) => {
    const { format } = await import('date-fns')
    return format(date, 'PPP')
  }
  
  // Chart library (very heavy)
  const LazyChart = lazy(() => import('recharts').then(module => ({
    default: module.LineChart
  })))
  
  // PDF generation (heavy)
  const generatePDF = async (data: any) => {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    // PDF generation logic
    return doc
  }
  ```

---

### 🎯 Task 3: Bundle Size Optimization

#### Objective
Reduce overall bundle size and optimize loading performance.

#### Implementation Steps

##### Sub-task 3.1: Bundle Analysis
- [ ] **Set up bundle analysis tools**
  ```bash
  # Install bundle analyzer
  npm install --save-dev @next/bundle-analyzer
  
  # Add to next.config.js
  const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: process.env.ANALYZE === 'true',
  })
  
  module.exports = withBundleAnalyzer({
    // Your next.js config
  })
  
  # Analyze bundle
  ANALYZE=true npm run build
  ```

##### Sub-task 3.2: Tree Shaking Optimization
- [ ] **Optimize imports to enable tree shaking**
  ```typescript
  // ❌ Bad: Imports entire library
  import * as Icons from 'lucide-react'
  
  // ✅ Good: Import specific icons
  import { Calendar, Users, TrendingUp } from 'lucide-react'
  
  // ❌ Bad: Imports entire utility library
  import _ from 'lodash'
  
  // ✅ Good: Import specific functions
  import { debounce, throttle } from 'lodash'
  
  // Even better: Use specific packages
  import debounce from 'lodash.debounce'
  ```

##### Sub-task 3.3: Optimize Dependencies
- [ ] **Replace heavy dependencies with lighter alternatives**
  ```typescript
  // Replace moment.js with date-fns (smaller)
  // Before: import moment from 'moment' (~67kb)
  // After: import { format, parseISO } from 'date-fns' (~13kb)
  
  // Replace full Recharts with specific components
  // Before: import { LineChart, BarChart, PieChart } from 'recharts'
  // After: Dynamic imports only when needed
  
  // Use CDN for development-only libraries
  // Before: Including React DevTools in bundle
  // After: Load from CDN in development only
  ```

---

### 🎯 Task 4: Virtual Scrolling & List Optimization

#### Objective
Optimize rendering of large lists and tables for better performance.

#### Implementation Steps

##### Sub-task 4.1: Implement Virtual Scrolling
- [ ] **Add virtual scrolling for large lists**
  ```typescript
  import { FixedSizeList as List } from 'react-window'
  
  // Virtual list for large datasets
  const VirtualizedStudentList = ({ students }: { students: Student[] }) => {
    const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
      <div style={style}>
        <StudentCard student={students[index]} />
      </div>
    )
    
    return (
      <List
        height={600}        // Container height
        itemCount={students.length}
        itemSize={120}      // Height of each item
        width="100%"
      >
        {Row}
      </List>
    )
  }
  ```

##### Sub-task 4.2: Optimize Table Rendering
- [ ] **Implement table virtualization for large datasets**
  ```typescript
  import { useVirtual } from 'react-virtual'
  
  const VirtualTable = ({ data }: { data: any[] }) => {
    const parentRef = useRef<HTMLDivElement>(null)
    
    const rowVirtualizer = useVirtual({
      size: data.length,
      parentRef,
      estimateSize: useCallback(() => 50, []),
      overscan: 5, // Render 5 extra items for smooth scrolling
    })
    
    return (
      <div ref={parentRef} className="h-96 overflow-auto">
        <div
          style={{
            height: `${rowVirtualizer.totalSize}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.virtualItems.map((virtualRow) => (
            <div
              key={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <TableRow data={data[virtualRow.index]} />
            </div>
          ))}
        </div>
      </div>
    )
  }
  ```

---

### 🎯 Task 5: Caching & State Management Optimization

#### Objective
Implement efficient caching strategies and optimize state management.

#### Implementation Steps

##### Sub-task 5.1: React Query Optimization
- [ ] **Optimize React Query configuration**
  ```typescript
  import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
  
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,     // 5 minutes
        cacheTime: 10 * 60 * 1000,    // 10 minutes
        retry: (failureCount, error) => {
          // Custom retry logic
          if (error.status === 404) return false
          return failureCount < 3
        },
        refetchOnWindowFocus: false,   // Reduce unnecessary refetches
        refetchOnMount: 'always',      // Always refetch on mount
      },
    },
  })
  
  // Implement background refetching for critical data
  const useDashboardData = (academyId: string) => {
    return useQuery({
      queryKey: ['dashboard', academyId],
      queryFn: () => fetchDashboardData(academyId),
      staleTime: 2 * 60 * 1000,       // 2 minutes for dashboard
      refetchInterval: 5 * 60 * 1000, // Background refetch every 5 minutes
    })
  }
  ```

##### Sub-task 5.2: Local Storage Optimization
- [ ] **Implement efficient local storage caching**
  ```typescript
  // Custom hook for optimized local storage
  const useOptimizedLocalStorage = <T>(
    key: string, 
    defaultValue: T,
    ttl?: number // Time to live in milliseconds
  ) => {
    const [value, setValue] = useState<T>(() => {
      try {
        const item = localStorage.getItem(key)
        if (item) {
          const parsed = JSON.parse(item)
          
          // Check TTL if provided
          if (ttl && parsed.timestamp) {
            const now = Date.now()
            if (now - parsed.timestamp > ttl) {
              localStorage.removeItem(key)
              return defaultValue
            }
            return parsed.value
          }
          
          return parsed.value || defaultValue
        }
      } catch (error) {
        console.warn(`Error reading localStorage key "${key}":`, error)
      }
      return defaultValue
    })
    
    const setStoredValue = useCallback((newValue: T) => {
      try {
        setValue(newValue)
        const dataToStore = ttl 
          ? { value: newValue, timestamp: Date.now() }
          : { value: newValue }
        localStorage.setItem(key, JSON.stringify(dataToStore))
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error)
      }
    }, [key, ttl])
    
    return [value, setStoredValue] as const
  }
  ```

---

## Performance Monitoring

### 📊 Performance Metrics Setup

#### Task 6: Core Web Vitals Monitoring
- [ ] **Implement Web Vitals tracking**
  ```typescript
  import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'
  
  function sendToAnalytics(metric: Metric) {
    // Send to your analytics service
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', metric.name, {
        event_category: 'Web Vitals',
        event_label: metric.id,
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        non_interaction: true,
      })
    }
  }
  
  // Track all Core Web Vitals
  getCLS(sendToAnalytics)
  getFID(sendToAnalytics)
  getFCP(sendToAnalytics)
  getLCP(sendToAnalytics)
  getTTFB(sendToAnalytics)
  ```

#### Task 7: React Performance Monitoring
- [ ] **Add React-specific performance monitoring**
  ```typescript
  import { Profiler } from 'react'
  
  const onRenderCallback = (
    id: string,
    phase: 'mount' | 'update',
    actualDuration: number,
    baseDuration: number,
    startTime: number,
    commitTime: number
  ) => {
    // Log slow renders in development
    if (process.env.NODE_ENV === 'development' && actualDuration > 16) {
      console.warn(`Slow render detected in ${id}: ${actualDuration}ms`)
    }
    
    // Send to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      analytics.track('Component Render', {
        component: id,
        phase,
        duration: actualDuration,
        isSlowRender: actualDuration > 16,
      })
    }
  }
  
  // Wrap components that might have performance issues
  const Dashboard = () => (
    <Profiler id="Dashboard" onRender={onRenderCallback}>
      <DashboardContent />
    </Profiler>
  )
  ```

---

## Testing & Validation

### 🧪 Performance Testing Strategy

#### Task 8: Automated Performance Testing
- [ ] **Set up performance regression testing**
  ```typescript
  // performance.test.ts
  import { performance } from 'perf_hooks'
  
  describe('Performance Tests', () => {
    test('component renders within performance budget', async () => {
      const start = performance.now()
      
      render(<LargeComponentList items={generateMockData(1000)} />)
      
      const end = performance.now()
      const renderTime = end - start
      
      // Should render within 100ms
      expect(renderTime).toBeLessThan(100)
    })
    
    test('bundle size stays within budget', async () => {
      const bundleStats = await getBundleStats()
      
      expect(bundleStats.totalSize).toBeLessThan(500 * 1024) // 500KB
      expect(bundleStats.initialChunk).toBeLessThan(250 * 1024) // 250KB
    })
  })
  ```

---

## Success Metrics

### 📊 Performance Targets
- [ ] **Bundle size reduction: >30%**
- [ ] **First Contentful Paint: <1.5s**
- [ ] **Largest Contentful Paint: <2.5s**
- [ ] **Cumulative Layout Shift: <0.1**
- [ ] **First Input Delay: <100ms**
- [ ] **Component render time: <16ms (60fps)**

### 📊 Code Quality Targets
- [ ] **React.memo usage: Strategic implementation**
- [ ] **Code splitting: All major routes**
- [ ] **Tree shaking: >95% unused code eliminated**
- [ ] **Caching: Strategic implementation for all data**

### 📊 User Experience Targets
- [ ] **Page load time improvement: >40%**
- [ ] **Interaction responsiveness: Immediate feedback**
- [ ] **Memory usage: Stable during navigation**
- [ ] **Network usage: Optimized for mobile**

This performance optimization strategy will significantly improve the user experience and reduce operational costs through better resource utilization.