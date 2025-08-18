# Bundle Size Optimization Guide

Comprehensive guide for optimizing bundle size and improving application performance through better imports and code splitting.

## 🎯 Overview

This guide provides tools and techniques to minimize JavaScript bundle size, optimize imports, and implement effective code splitting strategies.

### Key Optimization Areas

1. **Tree Shaking**: Eliminate unused code
2. **Import Optimization**: Use efficient import patterns
3. **Code Splitting**: Break bundles into manageable chunks
4. **Library Selection**: Choose bundle-optimized alternatives
5. **Dynamic Loading**: Load code on demand

## 📦 Bundle Analysis Tools

### 1. Bundle Analyzer (`scripts/bundle-analyzer.js`)

Analyzes your Next.js build to identify optimization opportunities:

```bash
# Run analysis
node scripts/bundle-analyzer.js

# With webpack bundle analyzer
ANALYZE=true npm run build
```

**Features**:
- Bundle size breakdown by chunks
- Large file identification
- Unused export detection
- Duplicate dependency analysis
- Optimization recommendations

### 2. Import Optimizer (`scripts/import-optimizer.js`)

Analyzes and optimizes import statements:

```bash
# Analyze imports
node scripts/import-optimizer.js

# Auto-fix common issues
node scripts/import-optimizer.js --fix
```

**Features**:
- Anti-pattern detection
- Library-specific optimizations
- Auto-fix for common issues
- Tree-shaking recommendations

## 🌳 Tree Shaking Optimization

### Good Import Patterns

```typescript
// ✅ Good: Specific imports
import { debounce } from 'lodash/debounce'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'

// ✅ Good: Named imports
import { useState, useEffect } from 'react'
import { LineChart, XAxis, YAxis } from 'recharts'
```

### Bad Import Patterns

```typescript
// ❌ Bad: Namespace imports
import * as lodash from 'lodash'
import * as React from 'react'

// ❌ Bad: Default imports of large libraries
import _ from 'lodash'
import moment from 'moment'

// ❌ Bad: Barrel imports
import { everything } from '@/components'
```

### Library-Specific Optimizations

#### Lodash
```typescript
// ❌ Bad (imports entire library)
import _ from 'lodash'
import { debounce, throttle } from 'lodash'

// ✅ Good (tree-shakable)
import debounce from 'lodash/debounce'
import throttle from 'lodash/throttle'
```

#### Date Libraries
```typescript
// ❌ Bad (large bundle)
import moment from 'moment'

// ✅ Good (tree-shakable)
import { format, parseISO, addDays } from 'date-fns'
```

#### Icons
```typescript
// ❌ Bad (large icon bundle)
import { FiHome, FiUser } from 'react-icons/fi'

// ✅ Good (optimized icons)
import { Home, User } from 'lucide-react'
```

## 🔀 Code Splitting Strategies

### 1. Route-Based Splitting

```typescript
// Automatic with Next.js pages
// Each page is automatically code-split

// Manual route splitting
const DashboardPage = React.lazy(() => import('@/pages/dashboard'))
const SettingsPage = React.lazy(() => import('@/pages/settings'))
```

### 2. Component-Based Splitting

```typescript
// Large components
const HeavyChart = React.lazy(() => import('@/components/HeavyChart'))
const DataTable = React.lazy(() => import('@/components/DataTable'))

// Usage with Suspense
<Suspense fallback={<Loading />}>
  <HeavyChart data={data} />
</Suspense>
```

### 3. Feature-Based Splitting

```typescript
// Feature modules
const loadReportingModule = () => import('@/features/reporting')
const loadAnalyticsModule = () => import('@/features/analytics')

// Conditional loading
if (userHasAccess('reporting')) {
  const reporting = await loadReportingModule()
  reporting.initializeReporting()
}
```

### 4. Library-Based Splitting

```typescript
// Heavy libraries
const loadChartLibrary = () => import('recharts')
const loadDateLibrary = () => import('date-fns')

// Dynamic usage
const handleShowChart = async () => {
  const { LineChart } = await loadChartLibrary()
  setChartComponent(() => LineChart)
}
```

## 📊 Bundle Size Budgets

### Recommended Limits

```javascript
// Performance budgets
const BUNDLE_BUDGETS = {
  // Total bundle size
  total: 1024 * 1024,        // 1MB
  
  // Individual chunks
  chunk: 250 * 1024,         // 250KB
  initial: 512 * 1024,       // 512KB
  
  // Asset types
  javascript: 800 * 1024,    // 800KB
  css: 100 * 1024,           // 100KB
  images: 500 * 1024,        // 500KB
}
```

### Bundle Composition

```javascript
// Ideal bundle breakdown
const IDEAL_COMPOSITION = {
  framework: '30%',    // React, Next.js
  vendor: '25%',       // Third-party libraries
  application: '35%',  // Your code
  polyfills: '10%',    // Browser compatibility
}
```

## 🛠 Configuration Files

### Next.js Configuration (`next.config.js`)

```javascript
module.exports = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Bundle splitting
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
          },
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            name: 'react',
            priority: 20,
          },
        },
      }
      
      // Tree shaking
      config.optimization.usedExports = true
      config.optimization.sideEffects = false
    }
    
    return config
  },
}
```

### Babel Configuration (`babel.config.js`)

```javascript
module.exports = {
  plugins: [
    // Lodash optimization
    ['lodash', { id: ['lodash'] }],
    
    // Import transformation
    ['transform-imports', {
      'lodash': {
        transform: 'lodash/${member}',
        preventFullImport: true,
      },
    }],
  ],
}
```

## 📈 Monitoring and Analysis

### Bundle Analysis Scripts

```json
{
  "scripts": {
    "analyze": "ANALYZE=true npm run build",
    "bundle:analyze": "node scripts/bundle-analyzer.js",
    "imports:analyze": "node scripts/import-optimizer.js",
    "imports:fix": "node scripts/import-optimizer.js --fix"
  }
}
```

### CI/CD Integration

```yaml
# GitHub Actions
- name: Analyze Bundle Size
  run: |
    npm run build
    node scripts/bundle-analyzer.js
    
- name: Check Import Optimization
  run: node scripts/import-optimizer.js
```

### Performance Monitoring

```typescript
// Monitor bundle loading
const bundleLoadTime = performance.measure('bundle-load')

// Track code splitting effectiveness
const trackComponentLoad = (componentName: string) => {
  const startTime = performance.now()
  return () => {
    const loadTime = performance.now() - startTime
    console.log(`${componentName} loaded in ${loadTime}ms`)
  }
}
```

## 🚀 Optimization Workflow

### 1. Analysis Phase

```bash
# Run bundle analysis
npm run build
node scripts/bundle-analyzer.js

# Analyze imports
node scripts/import-optimizer.js
```

### 2. Optimization Phase

```bash
# Auto-fix imports
node scripts/import-optimizer.js --fix

# Manual optimizations
# - Replace large libraries
# - Add code splitting
# - Optimize imports
```

### 3. Validation Phase

```bash
# Re-analyze
npm run build
node scripts/bundle-analyzer.js

# Performance testing
npm run test:performance
```

### 4. Monitoring Phase

```bash
# Continuous monitoring
npm run analyze

# Track metrics over time
# - Bundle size trends
# - Loading performance
# - User experience metrics
```

## 📋 Optimization Checklist

### Import Optimization
- [ ] Use specific imports instead of namespace imports
- [ ] Optimize lodash imports (`lodash/function` pattern)
- [ ] Replace moment.js with date-fns
- [ ] Use lucide-react instead of react-icons
- [ ] Avoid barrel imports from large modules

### Code Splitting
- [ ] Implement route-based splitting
- [ ] Add component-based splitting for heavy components
- [ ] Use dynamic imports for conditional features
- [ ] Split vendor dependencies appropriately

### Bundle Configuration
- [ ] Configure webpack for optimal splitting
- [ ] Enable tree shaking in build tools
- [ ] Set up bundle analyzer
- [ ] Configure performance budgets

### Library Selection
- [ ] Audit dependencies for bundle size
- [ ] Replace large libraries with smaller alternatives
- [ ] Remove unused dependencies
- [ ] Use ES modules where available

### Performance Monitoring
- [ ] Set up bundle size monitoring
- [ ] Track loading performance
- [ ] Monitor bundle composition
- [ ] Implement performance budgets

## 🔍 Common Issues and Solutions

### Large Initial Bundle

**Problem**: Initial bundle is too large (>500KB)

**Solutions**:
- Implement code splitting
- Move non-critical code to dynamic imports
- Audit and remove unused dependencies
- Use tree-shaking optimizations

### Poor Tree Shaking

**Problem**: Bundle includes unused code

**Solutions**:
- Use ES modules instead of CommonJS
- Avoid namespace imports
- Configure webpack for better tree shaking
- Use specific imports

### Duplicate Dependencies

**Problem**: Multiple versions of same library

**Solutions**:
- Audit package.json for duplicates
- Use yarn resolutions or npm overrides
- Choose consistent library versions
- Consider using a monorepo

### Slow Loading

**Problem**: Code chunks take too long to load

**Solutions**:
- Optimize chunk sizes
- Implement preloading strategies
- Use service workers for caching
- Optimize network requests

## 📚 Resources

### Tools
- [Webpack Bundle Analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer)
- [source-map-explorer](https://github.com/danvk/source-map-explorer)
- [bundlephobia](https://bundlephobia.com/)
- [Import Cost VS Code Extension](https://marketplace.visualstudio.com/items?itemName=wix.vscode-import-cost)

### Libraries
- [lodash-es](https://www.npmjs.com/package/lodash-es) - Tree-shakable lodash
- [date-fns](https://date-fns.org/) - Tree-shakable date library
- [lucide-react](https://lucide.dev/) - Optimized icons

### Documentation
- [Next.js Bundle Analysis](https://nextjs.org/docs/advanced-features/analyzing-bundles)
- [webpack Code Splitting](https://webpack.js.org/guides/code-splitting/)
- [React Code Splitting](https://reactjs.org/docs/code-splitting.html)

---

This optimization guide helps maintain optimal bundle sizes while ensuring excellent application performance and user experience.