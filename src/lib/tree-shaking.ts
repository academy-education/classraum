// Tree-shaking optimization utilities

/**
 * Tree-shaking optimized imports for common libraries
 * 
 * Instead of importing entire libraries, use specific imports
 * to reduce bundle size through tree-shaking.
 */

// ============================================
// Lodash - Tree-shakable imports
// ============================================

// ❌ Bad: Imports entire lodash library
// import _ from 'lodash'

// ✅ Good: Import specific functions
export { default as debounce } from 'lodash/debounce'
export { default as throttle } from 'lodash/throttle'
export { default as cloneDeep } from 'lodash/cloneDeep'
export { default as isEqual } from 'lodash/isEqual'
export { default as merge } from 'lodash/merge'
export { default as pick } from 'lodash/pick'
export { default as omit } from 'lodash/omit'
export { default as sortBy } from 'lodash/sortBy'
export { default as groupBy } from 'lodash/groupBy'
export { default as uniq } from 'lodash/uniq'
export { default as flatten } from 'lodash/flatten'

// ============================================
// Date utilities - Tree-shakable alternatives
// ============================================

// ❌ Bad: Moment.js (large bundle)
// import moment from 'moment'

// ✅ Good: date-fns with tree-shaking
export { 
  format,
  parseISO,
  isValid,
  startOfDay,
  endOfDay,
  addDays,
  subDays,
  differenceInDays,
  isSameDay,
  isToday,
  isYesterday,
  isTomorrow,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from 'date-fns'

// ============================================
// React Icons - Tree-shakable imports
// ============================================

// ❌ Bad: Import from react-icons
// import { FiHome, FiUser } from 'react-icons/fi'

// ✅ Good: Import from specific icon sets
export { 
  Home,
  User,
  Settings,
  Bell,
  Calendar,
  Clock,
  ChevronDown,
  ChevronRight,
  Plus,
  Minus,
  Edit,
  Trash2,
  Search,
  Filter,
  Download,
  Upload,
  Save,
  X,
  Check,
  AlertCircle,
  Info,
  HelpCircle,
  ExternalLink,
  Eye,
  EyeOff,
  Mail,
  Phone,
  MapPin,
  Star,
  Heart,
  Share2,
  Copy,
  RefreshCw,
  RotateCcw,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Rewind,
  FastForward,
} from 'lucide-react'

// ============================================
// Chart libraries - Tree-shakable components
// ============================================

// ❌ Bad: Import entire recharts library
// import { LineChart, BarChart, PieChart, ... } from 'recharts'

// ✅ Good: Import only needed components
export {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'

// ============================================
// Utility functions for tree-shaking
// ============================================

/**
 * Creates optimized re-exports for better tree-shaking
 */
export function createOptimizedExport<T>(module: T): T {
  return module
}

/**
 * Dynamic import wrapper for code splitting
 */
export async function dynamicImport<T>(
  importFn: () => Promise<{ default: T }>
): Promise<T> {
  const module = await importFn()
  return module.default
}

/**
 * Conditional import based on feature flags
 */
export async function conditionalImport<T>(
  condition: boolean,
  importFn: () => Promise<{ default: T }>
): Promise<T | null> {
  if (!condition) return null
  return dynamicImport(importFn)
}

// ============================================
// Bundle size optimization helpers
// ============================================

/**
 * Lazy loading wrapper for heavy components
 */
export function createLazyComponent<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return React.lazy(importFn)
}

/**
 * Preload function for better UX
 */
export function preloadComponent(importFn: () => Promise<any>): void {
  // Start loading the component but don't wait for it
  importFn().catch(() => {
    // Silently ignore preload errors
  })
}

/**
 * Bundle splitting helper for feature modules
 */
export async function loadFeatureModule<T>(
  featureName: string,
  importFn: () => Promise<{ default: T }>
): Promise<T> {
  console.log(`Loading feature: ${featureName}`)
  const startTime = performance.now()
  
  try {
    const module = await importFn()
    const loadTime = performance.now() - startTime
    console.log(`Feature ${featureName} loaded in ${loadTime.toFixed(2)}ms`)
    return module.default
  } catch (error) {
    console.error(`Failed to load feature ${featureName}:`, error)
    throw error
  }
}

// ============================================
// Import optimization guidelines
// ============================================

/**
 * ESLint rules for tree-shaking optimization:
 * 
 * 1. Prefer named imports over default imports
 * 2. Import from specific modules rather than index files
 * 3. Use dynamic imports for heavy dependencies
 * 4. Avoid importing entire libraries
 * 5. Use babel plugins for automatic optimization
 */

export const TREE_SHAKING_GUIDELINES = {
  // Good patterns
  GOOD_PATTERNS: [
    "import { specific } from 'library/specific'",
    "import { Component } from './Component'",
    "const Heavy = React.lazy(() => import('./Heavy'))",
    "import debounce from 'lodash/debounce'",
  ],
  
  // Bad patterns to avoid
  BAD_PATTERNS: [
    "import * as library from 'library'",
    "import library from 'library'",
    "import { everything } from 'library'",
    "import _ from 'lodash'",
  ],
  
  // Babel plugins for optimization
  BABEL_PLUGINS: [
    'babel-plugin-import',
    'babel-plugin-lodash',
    'babel-plugin-date-fns',
    'babel-plugin-recharts',
  ]
} as const

// ============================================
// Performance monitoring for imports
// ============================================

/**
 * Monitor import performance in development
 */
export function monitorImportPerformance<T>(
  importName: string,
  importFn: () => Promise<T>
): Promise<T> {
  if (process.env.NODE_ENV !== 'development') {
    return importFn()
  }
  
  const startTime = performance.now()
  
  return importFn().then(result => {
    const endTime = performance.now()
    const duration = endTime - startTime
    
    if (duration > 100) { // Log slow imports
      console.warn(`Slow import detected: ${importName} took ${duration.toFixed(2)}ms`)
    }
    
    return result
  })
}

/**
 * Webpack bundle analyzer integration
 */
export const WEBPACK_ANALYZER_CONFIG = {
  analyzerMode: 'static',
  reportFilename: 'bundle-report.html',
  openAnalyzer: false,
  generateStatsFile: true,
  statsFilename: 'bundle-stats.json',
}

import React from 'react'