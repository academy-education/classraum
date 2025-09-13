# Universal Cache System Documentation

## Overview

The Universal Cache System is a comprehensive caching solution designed for the Classraum application. It provides advanced features including performance monitoring, intelligent cache management, memory optimization, and development tools.

## Features

### Core Features
- **Smart Caching**: Automatic cache invalidation with TTL and versioning
- **Performance Monitoring**: Real-time metrics and historical tracking
- **Memory Management**: Automatic cleanup and size optimization
- **Category-based Organization**: Organized cache management by data types
- **Academy Isolation**: Separate cache spaces for different academies
- **Development Tools**: Visual dashboard for monitoring and debugging

### Advanced Features
- **Background Refresh**: Automatic cache warming and maintenance
- **Priority-based Cleanup**: Smart removal of low-priority cache entries
- **Global Cache Invalidation**: Coordinated cache management across the app
- **Real-time Metrics**: Live performance monitoring and statistics

## Architecture

### Components

1. **Universal Cache Manager** (`src/lib/universal-cache.ts`)
   - Central cache management system
   - Global cache operations and cleanup
   - Memory management and optimization
   - Cache warming and background refresh

2. **Universal Performance Hook** (`src/hooks/performance/useUniversalPerformance.ts`)
   - Standardized performance monitoring
   - Unified caching interface
   - Automatic cache synchronization
   - Performance metrics collection

3. **Smart Cache Hook** (`src/hooks/performance/useSmartCache.ts`)
   - Low-level caching implementation
   - TTL and versioning support
   - Cache hit/miss tracking
   - Error handling and fallbacks

4. **Cache Management Dashboard** (`src/components/dev/CacheManagementDashboard.tsx`)
   - Visual cache monitoring
   - Cache operations interface
   - Real-time metrics display
   - Development debugging tools

## Usage Examples

### Basic Usage with Universal Performance Hook

```typescript
import { useUniversalPerformance, CacheCategory } from '@/hooks/performance/useUniversalPerformance'

function StudentsPage({ academyId }: { academyId: string }) {
  const {
    data: students,
    loading,
    error,
    refresh,
    invalidateCache,
    performanceMetrics
  } = useUniversalPerformance({
    category: CacheCategory.STUDENTS,
    academyId,
    fetchFn: () => fetchStudentsData(academyId),
    ttl: 2 * 60 * 1000, // 2 minutes
    dependencies: [academyId]
  })

  return (
    <div>
      {loading && <div>Loading...</div>}
      {error && <div>Error: {error.message}</div>}
      {students && <StudentsList students={students} />}
    </div>
  )
}
```

### Cache Invalidation

```typescript
import { CacheUtils, CacheCategory } from '@/lib/universal-cache'

// Invalidate specific category when data is modified
const handleStudentUpdate = async (studentData) => {
  await updateStudent(studentData)
  CacheUtils.onDataModified(CacheCategory.STUDENTS, academyId)
}

// Invalidate all caches for an academy
const handleAcademyChange = (newAcademyId) => {
  CacheUtils.onUserChanged(academyId) // Old academy
  setAcademyId(newAcademyId)
}

// Warm critical caches for better UX
useEffect(() => {
  CacheUtils.warmCriticalCaches(academyId)
}, [academyId])
```

### Manual Cache Management

```typescript
import { universalCache, CacheCategory } from '@/lib/universal-cache'

// Get comprehensive cache metrics
const metrics = universalCache.getMetrics()
console.log(`Cache hit rate: ${metrics.hitRate}%`)
console.log(`Memory usage: ${metrics.memoryUsage}%`)

// Invalidate specific category
universalCache.invalidateCategory(CacheCategory.ASSIGNMENTS, academyId)

// Clear all caches for an academy
universalCache.invalidateAcademy(academyId)

// Nuclear options (use with caution)
universalCache.invalidateAll() // Invalidate all caches globally
universalCache.clearAll() // Clear all cache data
```

## Cache Categories

The system organizes caches into the following categories:

- `STUDENTS`: Student data and related information
- `TEACHERS`: Teacher data and assignments
- `CLASSROOMS`: Classroom information and enrollments
- `ASSIGNMENTS`: Assignment data and submissions
- `ATTENDANCE`: Attendance records and statistics
- `SUBJECTS`: Subject/course information
- `FAMILIES`: Family relationships and data
- `SESSIONS`: Session schedules and data

## Performance Optimization

### Current Optimizations Applied

#### Students Page (`src/hooks/useStudentData.ts`)
- **Queries Reduced**: From 3+ sequential to 3 parallel queries
- **Performance Monitoring**: Full request lifecycle tracking
- **Smart Caching**: 2-minute TTL with automatic invalidation
- **Memory Optimization**: Efficient data structures and cleanup

#### Teachers Page (`src/components/ui/teachers-page.tsx`)
- **Queries Optimized**: 2-3 parallel queries with RPC aggregation
- **Performance Monitoring**: Detailed query performance tracking  
- **Smart Caching**: Academy-specific cache invalidation
- **Background Refresh**: Automatic cache warming

#### Classrooms Page (`src/components/ui/classrooms-page.tsx`)
- **Batch Processing**: 5 parallel queries instead of N+1
- **Data Association**: Efficient Map-based lookups
- **Hybrid Caching**: Combined smart cache + legacy cache support
- **Memory Management**: Priority-based cleanup

### Performance Metrics

The system tracks:
- **Cache Hit Rate**: Percentage of requests served from cache
- **Average Load Time**: Mean response time for data fetching
- **Memory Usage**: Cache size as percentage of limit
- **Query Reduction**: Number of database queries saved

### Expected Performance Improvements

- **Initial Load Time**: 40-60% faster for cached pages
- **Subsequent Loads**: 80-90% faster with warm cache
- **Database Load**: 50-70% reduction in query volume
- **User Experience**: Instant page transitions with cached data

## Development Tools

### Cache Management Dashboard

Access the full dashboard by navigating to `/cache-management` in development mode:

```typescript
import { CacheManagementDashboard } from '@/components/dev/CacheManagementDashboard'

// Full dashboard with all controls
<CacheManagementDashboard academyId={academyId} />
```

### Compact Cache Status

The compact status appears in the top-right corner in development mode:

- **Hit Rate**: Current cache effectiveness
- **Memory Usage**: Cache size and limits
- **Load Time**: Average response time

### Debug Logging

Enable detailed cache logging:

```javascript
// In browser console
localStorage.setItem('debug-cache', 'true')

// View cache contents
console.log('Cache contents:', sessionStorage)

// View performance metrics
console.log('Performance:', localStorage.getItem('performance-metrics'))
```

## Configuration

### Cache Settings

```typescript
// Default TTL settings
const CACHE_TTL = {
  SHORT: 1 * 60 * 1000,    // 1 minute
  MEDIUM: 2 * 60 * 1000,   // 2 minutes  
  LONG: 5 * 60 * 1000      // 5 minutes
}

// Memory limits
const MAX_CACHE_SIZE = 50 * 1024 * 1024  // 50MB
const CLEANUP_THRESHOLD = 0.8             // 80% usage
```

### Environment Variables

```env
# Enable performance monitoring
NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true

# Cache configuration
NEXT_PUBLIC_CACHE_TTL_DEFAULT=120000    # 2 minutes
NEXT_PUBLIC_CACHE_MAX_SIZE=52428800     # 50MB
```

## Best Practices

### When to Use Caching

✅ **Good candidates for caching:**
- Reference data (teachers, subjects, classrooms)
- User-specific data that changes infrequently
- Expensive database queries or API calls
- Data used across multiple components

❌ **Avoid caching for:**
- Real-time data (live chat, notifications)
- Sensitive data that must always be fresh
- One-time use data
- Data that changes frequently (every few seconds)

### Cache Key Naming

```typescript
// Good: Specific and organized
CacheUtils.key(CacheCategory.STUDENTS, academyId, 'active-only')

// Bad: Generic and unclear
useSmartCache({ key: 'data', ... })
```

### Error Handling

```typescript
const { data, error, loading } = useUniversalPerformance({
  // ... config
  onError: (error) => {
    console.error('Cache error:', error)
    // Fallback to fresh data
    // Show user-friendly message
    // Report to error monitoring service
  }
})
```

### Cache Invalidation Strategy

```typescript
// Invalidate immediately after mutations
const handleCreate = async (data) => {
  const result = await createRecord(data)
  if (result.success) {
    CacheUtils.onDataModified(category, academyId)
  }
  return result
}

// Batch invalidations for related data
const handleComplexUpdate = async (data) => {
  const result = await updateRecord(data)
  if (result.success) {
    // Invalidate multiple related caches
    universalCache.invalidateCategory(CacheCategory.STUDENTS, academyId)
    universalCache.invalidateCategory(CacheCategory.CLASSROOMS, academyId)
  }
  return result
}
```

## Troubleshooting

### Common Issues

1. **Cache not updating after data changes**
   - Check cache invalidation calls after mutations
   - Verify cache key consistency
   - Check TTL settings

2. **High memory usage**
   - Review cache TTL settings
   - Check for memory leaks in data structures
   - Use cache cleanup tools

3. **Poor cache hit rates**
   - Review cache key generation
   - Check for unnecessary cache busting
   - Analyze user navigation patterns

### Debug Commands

```javascript
// View cache statistics
console.log(universalCache.getMetrics())

// Force cache cleanup
universalCache.performCleanup()

// Check specific cache entries
console.log(sessionStorage.getItem('smart-cache-students-academy123'))

// Monitor cache operations
localStorage.setItem('debug-cache', 'true')
```

## Future Enhancements

### Planned Features
- **Offline Support**: Service worker integration for offline caching
- **Cache Preloading**: Predictive cache warming based on user patterns
- **Distributed Caching**: Multi-tab cache synchronization
- **Cache Analytics**: Advanced performance analytics and reporting
- **A/B Testing**: Cache strategy experimentation framework

### Integration Opportunities
- **Service Workers**: Offline-first caching strategy
- **CDN Integration**: Edge caching for static resources
- **Database Caching**: Redis integration for server-side caching
- **Real-time Updates**: WebSocket-based cache invalidation

## Performance Monitoring

The system provides comprehensive performance monitoring:

### Real-time Metrics
- Cache hit/miss rates
- Average response times
- Memory usage tracking
- Query count reduction

### Historical Data
- Performance trends over time
- Cache effectiveness analysis
- Memory usage patterns
- User experience metrics

### Alerts and Monitoring
- High memory usage warnings
- Low cache hit rate alerts
- Performance degradation detection
- Automatic cleanup triggers

## Conclusion

The Universal Cache System provides a robust foundation for application performance optimization. It combines intelligent caching, comprehensive monitoring, and developer-friendly tools to ensure optimal user experience while maintaining system efficiency.

Regular monitoring and maintenance using the provided tools will help maintain peak performance as the application scales.