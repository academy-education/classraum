# Performance Testing Suite

Comprehensive performance testing setup for the Classraum dashboard application.

## 🎯 Overview

This testing suite provides multiple layers of performance validation:

1. **Unit Performance Tests** - Jest-based micro-benchmarks
2. **Browser Performance Tests** - Playwright-based real-world testing
3. **CI/CD Integration** - Automated performance monitoring
4. **Lighthouse Audits** - Core Web Vitals and best practices
5. **Bundle Analysis** - JavaScript bundle size monitoring

## 📊 Test Types

### 1. Unit Performance Tests (`performance.test.ts`)

**Purpose**: Test individual performance utilities and monitoring functions

**Technologies**: Jest, Node.js mocks

**Coverage**:
- Performance measurement accuracy
- Component tracking functionality
- Memory monitoring utilities
- Data management and limits
- Warning threshold detection

**Run Command**:
```bash
npm test src/tests/performance.test.ts
```

### 2. Browser Performance Tests (`performance.browser.test.ts`)

**Purpose**: Test real browser performance with user interactions

**Technologies**: Playwright, Chromium/Firefox/Safari

**Coverage**:
- Page load performance
- Component render times
- Memory usage in browser
- Navigation responsiveness
- Mobile device performance
- Core Web Vitals measurement

**Run Commands**:
```bash
# All browsers
npx playwright test src/tests/performance.browser.test.ts

# Specific browser
npx playwright test src/tests/performance.browser.test.ts --project=chromium

# With UI
npx playwright test src/tests/performance.browser.test.ts --ui
```

### 3. CI/CD Performance Tests (`scripts/performance-ci.js`)

**Purpose**: Automated performance testing in CI/CD pipelines

**Technologies**: Node.js, Lighthouse CI, bundle analysis

**Coverage**:
- Build size analysis
- Lighthouse audit automation
- Performance regression detection
- Automated reporting
- Performance budget enforcement

**Run Command**:
```bash
node scripts/performance-ci.js
```

## 🎯 Performance Budgets

Our performance targets and budgets:

### Page Performance
- **Page Load Time**: < 3 seconds
- **First Contentful Paint**: < 1.8 seconds
- **Largest Contentful Paint**: < 2.5 seconds
- **Time to Interactive**: < 3.5 seconds
- **First Input Delay**: < 100ms
- **Cumulative Layout Shift**: < 0.1

### Bundle Size
- **Total Bundle**: < 1MB
- **Initial Bundle**: < 512KB
- **Individual chunks**: < 250KB

### Memory Usage
- **Baseline**: < 50MB
- **Peak Usage**: < 100MB
- **Memory Leaks**: 0 tolerance

### Lighthouse Scores
- **Performance**: ≥ 90/100
- **Accessibility**: ≥ 95/100
- **Best Practices**: ≥ 90/100
- **SEO**: ≥ 95/100

## 🚀 Running Tests

### Local Development

1. **Run all performance tests**:
```bash
npm run test:performance
```

2. **Run unit tests only**:
```bash
npm test -- src/tests/performance.test.ts
```

3. **Run browser tests only**:
```bash
npx playwright test src/tests/performance.browser.test.ts
```

4. **Run Lighthouse audit**:
```bash
npm start &
npx lhci autorun
```

### CI/CD Environment

Performance tests run automatically on:
- Every push to `main` and `develop` branches
- Every pull request
- Daily scheduled runs at 2 AM UTC

**GitHub Actions Workflow**: `.github/workflows/performance.yml`

## 📈 Performance Monitoring

### Real-time Monitoring

The application includes built-in performance monitoring:

```typescript
import { PerformanceProvider } from '@/providers/PerformanceProvider'

// Wrap your app with performance monitoring
<PerformanceProvider enableAutoTracking={true}>
  <App />
</PerformanceProvider>
```

### Development Debug Panel

In development mode, access the performance debug panel:
- Look for the 📊 icon in the bottom-right corner
- Click to view real-time performance metrics
- Monitor render times, memory usage, and component performance

### Performance Dashboard

Access detailed performance analytics at `/performance`:
- Component render time rankings
- Memory usage trends
- Page load analytics
- Performance warnings and recommendations

## 🔧 Configuration

### Jest Configuration

Performance tests use standard Jest configuration with additional mocks for browser APIs:

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
  ],
}
```

### Playwright Configuration

Browser tests are configured in `playwright.config.ts`:

```typescript
export default defineConfig({
  testDir: './src/tests',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
  ],
})
```

### Lighthouse Configuration

Lighthouse audits are configured in `lighthouserc.js`:

```javascript
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000', 'http://localhost:3000/dashboard'],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['error', {minScore: 0.9}],
        'first-contentful-paint': ['error', {maxNumericValue: 1800}],
        'largest-contentful-paint': ['error', {maxNumericValue: 2500}],
      },
    },
  },
}
```

## 📊 Performance Metrics

### Tracked Metrics

1. **Component Performance**
   - Render time per component
   - Render frequency
   - Re-render triggers

2. **Page Performance**
   - Load times
   - Navigation speed
   - Route transition performance

3. **Memory Metrics**
   - JavaScript heap usage
   - Memory leaks detection
   - Garbage collection impact

4. **Bundle Metrics**
   - Total bundle size
   - Code splitting effectiveness
   - Unused code detection

5. **User Experience Metrics**
   - Core Web Vitals
   - Interaction responsiveness
   - Visual stability

### Data Collection

Performance data is collected through:

- **Browser Performance API**: Native timing measurements
- **React DevTools Profiler**: Component performance
- **Custom Performance Monitor**: Application-specific metrics
- **Lighthouse**: Automated auditing
- **Bundle Analyzer**: Build analysis

## 🐛 Debugging Performance Issues

### Common Performance Problems

1. **Slow Component Renders**
   ```typescript
   // Use performance tracking to identify slow components
   const MyComponent = withPerformanceTracking(BaseComponent)
   
   // Or use the hook
   const { measure } = usePerformanceTracking('MyComponent')
   const result = measure('expensive-operation', () => {
     // Your expensive operation
   })
   ```

2. **Memory Leaks**
   ```typescript
   // Monitor memory usage
   const memory = performanceMonitor.getMemoryUsage()
   if (memory && memory.usedJSHeapSize > threshold) {
     console.warn('Memory usage is high', memory)
   }
   ```

3. **Large Bundle Sizes**
   ```bash
   # Analyze bundle composition
   npm run build
   node scripts/performance-ci.js
   ```

### Performance Debugging Tools

1. **Browser DevTools**
   - Performance tab for profiling
   - Memory tab for leak detection
   - Network tab for loading analysis

2. **React DevTools Profiler**
   - Component render timing
   - Props change analysis
   - Render cause identification

3. **Performance Dashboard**
   - Real-time metrics
   - Historical trends
   - Component rankings

4. **Lighthouse**
   - Comprehensive auditing
   - Best practice recommendations
   - Optimization suggestions

## 📋 Best Practices

### Writing Performance Tests

1. **Use Realistic Data**
   ```typescript
   test('should handle large datasets efficiently', async () => {
     const largeDataset = generateTestData(10000)
     const time = await measureAsync('data-processing', () => {
       return processLargeDataset(largeDataset)
     })
     expect(time).toBeLessThan(1000) // 1 second
   })
   ```

2. **Test Critical User Journeys**
   ```typescript
   test('should navigate dashboard quickly', async ({ page }) => {
     await page.goto('/dashboard')
     const startTime = Date.now()
     await page.click('[data-testid="nav-sessions"]')
     await page.waitForSelector('[data-testid="sessions-loaded"]')
     const endTime = Date.now()
     expect(endTime - startTime).toBeLessThan(2000)
   })
   ```

3. **Monitor Regression**
   ```typescript
   test('should not regress from baseline', () => {
     const currentMetrics = performanceMonitor.getSummary()
     expect(currentMetrics.averageRenderTime).toBeLessThan(BASELINE.renderTime * 1.2)
   })
   ```

### Performance Optimization Workflow

1. **Measure First**: Use performance monitoring to identify issues
2. **Set Budgets**: Define acceptable performance thresholds
3. **Optimize Incrementally**: Make small, measurable improvements
4. **Test Continuously**: Run performance tests in CI/CD
5. **Monitor Production**: Track real-world performance

## 🔮 Advanced Testing

### Load Testing

```typescript
test('should handle concurrent users', async ({ page }) => {
  const promises = Array.from({ length: 10 }, () => 
    page.goto('/dashboard')
  )
  
  const results = await Promise.all(promises)
  // All requests should complete successfully
  results.forEach(response => {
    expect(response.status()).toBe(200)
  })
})
```

### Memory Stress Testing

```typescript
test('should handle memory stress', () => {
  // Create many components
  for (let i = 0; i < 1000; i++) {
    performanceMonitor.trackComponentRender(`Component${i}`, Math.random() * 20)
  }
  
  const memory = performanceMonitor.getMemoryUsage()
  if (memory) {
    expect(memory.usedJSHeapSize).toBeLessThan(memory.jsHeapSizeLimit * 0.8)
  }
})
```

### Bundle Size Monitoring

```typescript
test('should maintain bundle size budget', () => {
  const analysis = analyzeBundleSize('./build')
  expect(analysis.totalSize).toBeLessThan(1024 * 1024) // 1MB
  expect(analysis.jsSize).toBeLessThan(800 * 1024)    // 800KB
})
```

## 📚 Resources

- [Web Performance Fundamentals](https://web.dev/performance/)
- [React Performance](https://react.dev/learn/render-and-commit)
- [Playwright Testing](https://playwright.dev/docs/intro)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [Core Web Vitals](https://web.dev/vitals/)

---

This comprehensive performance testing suite ensures your application maintains optimal performance throughout development and production deployment.