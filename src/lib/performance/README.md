# Performance Monitoring System

A comprehensive performance monitoring and analytics system for the Classraum dashboard application.

## 🎯 Overview

This system provides real-time performance monitoring, component render tracking, memory usage analysis, and page load metrics to help optimize the application's performance.

### Key Features

1. **Component Performance Tracking**: Monitor render times for individual React components
2. **Page Load Metrics**: Track Core Web Vitals and page load performance
3. **Memory Monitoring**: Real-time memory usage tracking and leak detection
4. **Bundle Size Analysis**: Monitor JavaScript bundle sizes and resource loading
5. **Automated Warnings**: Performance threshold alerts and recommendations
6. **Data Export**: Export performance data for analysis
7. **Development Tools**: Debug panel and performance insights

## 📊 Core Metrics

### Component Metrics
- **Render Time**: How long each component takes to render
- **Render Count**: Number of times a component has rendered
- **Average Render Time**: Moving average of render performance

### Page Metrics (Web Vitals)
- **First Contentful Paint (FCP)**: Time to first content
- **Largest Contentful Paint (LCP)**: Time to largest content element
- **Cumulative Layout Shift (CLS)**: Visual stability
- **First Input Delay (FID)**: Interactivity responsiveness
- **Time to Interactive (TTI)**: When page becomes fully interactive

### Memory Metrics
- **Used JS Heap Size**: Current memory usage
- **Total JS Heap Size**: Total allocated memory
- **JS Heap Size Limit**: Maximum memory limit

### Bundle Metrics
- **Total Bundle Size**: Size of all JavaScript resources
- **Resource Count**: Number of JS files loaded
- **Individual Resource Sizes**: Size breakdown by file

## 🚀 Usage

### Basic Setup

```typescript
import { PerformanceProvider } from '@/providers/PerformanceProvider'

function App() {
  return (
    <PerformanceProvider enableAutoTracking={true} enableWarnings={true}>
      <YourApp />
    </PerformanceProvider>
  )
}
```

### Component Performance Tracking

#### Using the Hook
```typescript
import { usePerformanceTracking } from '@/lib/performance'

const MyComponent = () => {
  const { startMeasurement, endMeasurement, measure } = usePerformanceTracking('MyComponent')
  
  const handleExpensiveOperation = () => {
    measure('expensive-operation', () => {
      // Your expensive operation here
    })
  }
  
  return <div>Component content</div>
}
```

#### Using the HOC
```typescript
import { withPerformanceTracking } from '@/lib/performance'

const MyComponent = () => {
  return <div>Component content</div>
}

export default withPerformanceTracking(MyComponent, 'MyComponent')
```

### Manual Performance Measurement

```typescript
import { performanceMonitor, performanceUtils } from '@/lib/performance'

// Measure synchronous operations
const result = performanceUtils.measureSync('data-processing', () => {
  return processData(data)
})

// Measure asynchronous operations
const asyncResult = await performanceUtils.measureAsync('api-call', async () => {
  return await fetchData()
})

// Manual start/end measurement
const startTime = performanceMonitor.start('custom-operation')
// ... your operation
performanceMonitor.end('custom-operation')
```

### Performance Dashboard

Access the performance dashboard at `/performance` to view:

- Real-time performance metrics
- Component performance rankings
- Memory usage trends
- Page load analytics
- Performance warnings and recommendations

## 🔧 Configuration

### Performance Thresholds

```typescript
<PerformanceProvider
  enableAutoTracking={true}
  enableWarnings={true}
  warningThresholds={{
    renderTime: 16, // 60fps threshold in ms
    memoryUsage: 0.8 // 80% of memory limit
  }}
>
```

### Custom Warning Logic

```typescript
import { performanceUtils } from '@/lib/performance'

// Check performance and get warnings
const warnings = performanceUtils.checkPerformance()

if (warnings.length > 0) {
  console.warn('Performance issues detected:', warnings)
}
```

## 📈 Performance Optimization Guidelines

### Component Optimization

1. **Use React.memo**: Prevent unnecessary re-renders
```typescript
const OptimizedComponent = React.memo(MyComponent)
```

2. **Optimize useCallback and useMemo**: Memoize expensive calculations
```typescript
const memoizedValue = useMemo(() => expensiveCalculation(data), [data])
const memoizedCallback = useCallback(() => doSomething(id), [id])
```

3. **Track Performance**: Use performance tracking on slow components
```typescript
const SlowComponent = withPerformanceTracking(MySlowComponent)
```

### Bundle Optimization

1. **Code Splitting**: Use lazy loading for large components
```typescript
const LazyComponent = React.lazy(() => import('./LazyComponent'))
```

2. **Dynamic Imports**: Load modules on demand
```typescript
const loadModule = async () => {
  const module = await import('./heavy-module')
  return module.default
}
```

### Memory Optimization

1. **Cleanup Effects**: Remove event listeners and timers
```typescript
useEffect(() => {
  const timer = setInterval(doSomething, 1000)
  return () => clearInterval(timer)
}, [])
```

2. **Avoid Memory Leaks**: Be careful with closures and references

## 🛠 Performance Monitoring Best Practices

### 1. Regular Monitoring
- Monitor performance during development
- Set up automated performance testing
- Track performance over time

### 2. Set Realistic Thresholds
- 16ms render time for 60fps
- < 2.5s for LCP
- < 100ms for FID
- < 0.1 for CLS

### 3. Focus on Critical Path
- Optimize components in the critical rendering path
- Prioritize above-the-fold content
- Minimize main thread blocking

### 4. Use Performance Budget
- Set bundle size limits
- Monitor memory usage growth
- Track Core Web Vitals

## 🔍 Debugging Performance Issues

### Component Performance Issues

1. **Identify Slow Components**:
   - Check the Performance Dashboard
   - Look for components with high render times
   - Analyze render frequency

2. **Common Fixes**:
   - Add React.memo
   - Optimize props structure
   - Use useCallback/useMemo
   - Implement virtualization for long lists

### Memory Issues

1. **Monitor Memory Growth**:
   - Check memory usage in Performance Dashboard
   - Use browser DevTools memory tab
   - Look for memory leaks

2. **Common Fixes**:
   - Cleanup event listeners
   - Remove unused variables
   - Optimize data structures
   - Use WeakMap/WeakSet for caches

### Bundle Size Issues

1. **Analyze Bundle**:
   - Check bundle size metrics
   - Use webpack-bundle-analyzer
   - Identify large dependencies

2. **Common Fixes**:
   - Implement code splitting
   - Use tree shaking
   - Remove unused dependencies
   - Optimize imports

## 📊 Performance Dashboard Features

### Real-time Metrics
- Live performance data updates
- Component render time tracking
- Memory usage monitoring

### Historical Data
- Performance trends over time
- Component performance history
- Page load analytics

### Export & Analysis
- Export performance data as JSON
- Analyze performance in external tools
- Share performance reports

### Development Tools
- Debug panel for development
- Performance warnings
- Real-time monitoring

## 🚨 Performance Warnings

The system automatically detects performance issues:

### Render Performance
- **Warning**: Average render time > 16ms
- **Impact**: Affects 60fps smoothness
- **Fix**: Optimize component rendering

### Memory Usage
- **Warning**: Memory usage > 80% of limit
- **Impact**: Risk of out-of-memory errors
- **Fix**: Optimize memory usage, cleanup leaks

### Bundle Size
- **Warning**: Large bundle sizes
- **Impact**: Slower initial page loads
- **Fix**: Implement code splitting

## 🔮 Advanced Features

### Custom Metrics
```typescript
// Track custom performance metrics
performanceMonitor.addMetric({
  name: 'custom-metric',
  value: customValue,
  timestamp: Date.now(),
  meta: { additionalData: 'value' }
})
```

### Performance Profiling
```typescript
// Profile a specific operation
const profileResult = performanceUtils.measureSync('operation-name', () => {
  // Your operation
})
```

### Automated Reporting
```typescript
// Set up automated performance reporting
setInterval(() => {
  const summary = performanceMonitor.getSummary()
  if (summary.averageRenderTime > threshold) {
    sendPerformanceAlert(summary)
  }
}, 60000) // Check every minute
```

## 📋 Integration Checklist

- [ ] Install PerformanceProvider in root app
- [ ] Add performance tracking to key components
- [ ] Set up performance dashboard access
- [ ] Configure warning thresholds
- [ ] Enable development debug panel
- [ ] Set up performance monitoring in CI/CD
- [ ] Create performance budget guidelines
- [ ] Train team on performance monitoring tools

## 🎯 Performance Targets

### Target Metrics
- **Average Render Time**: < 16ms (60fps)
- **First Contentful Paint**: < 1.8s
- **Largest Contentful Paint**: < 2.5s
- **First Input Delay**: < 100ms
- **Cumulative Layout Shift**: < 0.1
- **Memory Usage**: < 50MB baseline
- **Bundle Size**: < 1MB initial bundle

### Monitoring Frequency
- **Development**: Real-time monitoring with debug panel
- **Staging**: Automated performance testing
- **Production**: Continuous monitoring with alerts

---

This performance monitoring system provides comprehensive insights into your application's performance, helping you maintain optimal user experience and identify optimization opportunities early in the development process.