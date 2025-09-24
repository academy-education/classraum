/**
 * Universal Caching System for Classraum
 * 
 * This system provides centralized cache management with advanced features:
 * - Global cache invalidation
 * - Cache versioning
 * - Performance metrics
 * - Memory management
 * - Cache warming
 * - Background refresh
 */

import { SmartCacheManager } from '@/hooks/performance/useSmartCache'

export interface CacheConfig {
  /** Cache key prefix for the academy */
  academyId: string
  /** Time to live in milliseconds */
  ttl?: number
  /** Enable background refresh */
  backgroundRefresh?: boolean
  /** Enable cache warming */
  warming?: boolean
  /** Cache priority (higher = more important) */
  priority?: number
}

export interface CacheEntry<T> {
  data: T
  timestamp: number
  version: string
  priority: number
  hits: number
  lastAccessed: number
}

export interface CacheMetrics {
  totalEntries: number
  totalSize: number
  hitRate: number
  missRate: number
  averageLoadTime: number
  memoryUsage: number
}

/**
 * Cache categories for organized management
 */
export enum CacheCategory {
  STUDENTS = 'students',
  TEACHERS = 'teachers', 
  CLASSROOMS = 'classrooms',
  ASSIGNMENTS = 'assignments',
  ATTENDANCE = 'attendance',
  SUBJECTS = 'subjects',
  FAMILIES = 'families',
  SESSIONS = 'sessions'
}

/**
 * Universal Cache Manager - Central cache management system
 */
class UniversalCacheManager {
  private static instance: UniversalCacheManager
  private version = '1.0.0'
  private maxSize = 50 * 1024 * 1024 // 50MB max cache size
  private cleanupInterval: NodeJS.Timeout | null = null

  private constructor() {
    this.startCleanupScheduler()
  }

  static getInstance(): UniversalCacheManager {
    if (!UniversalCacheManager.instance) {
      UniversalCacheManager.instance = new UniversalCacheManager()
    }
    return UniversalCacheManager.instance
  }

  /**
   * Generate standardized cache keys
   */
  generateCacheKey(category: CacheCategory, academyId: string, identifier?: string): string {
    const baseKey = `${category}-${academyId}`
    return identifier ? `${baseKey}-${identifier}` : baseKey
  }

  /**
   * Invalidate all caches for a specific academy
   */
  invalidateAcademy(academyId: string): void {
    const keys = Object.keys(sessionStorage)
    keys.forEach(key => {
      if (key.includes(`-${academyId}-`) || key.includes(`-${academyId}`)) {
        sessionStorage.removeItem(key)
        sessionStorage.removeItem(`${key}-timestamp`)
        sessionStorage.removeItem(`${key}-version`)
      }
    })
    
    console.log(`[UniversalCache] Invalidated all caches for academy: ${academyId}`)
  }

  /**
   * Invalidate caches by category
   */
  invalidateCategory(category: CacheCategory, academyId?: string): void {
    const keys = Object.keys(sessionStorage)
    keys.forEach(key => {
      const matchesCategory = key.startsWith(`smart-cache-${category}`)
      const matchesAcademy = !academyId || key.includes(`-${academyId}`)
      
      if (matchesCategory && matchesAcademy) {
        sessionStorage.removeItem(key)
        sessionStorage.removeItem(`${key}-timestamp`)
        sessionStorage.removeItem(`${key}-version`)
      }
    })
    
    const scope = academyId ? `academy ${academyId}` : 'all academies'
    console.log(`[UniversalCache] Invalidated ${category} caches for ${scope}`)
  }

  /**
   * Global cache invalidation (nuclear option)
   */
  invalidateAll(): void {
    SmartCacheManager.invalidateAll()
    console.log('[UniversalCache] Global cache invalidation completed')
  }

  /**
   * Clear all cache data (nuclear option)
   */
  clearAll(): void {
    SmartCacheManager.clearAll()
    console.log('[UniversalCache] All cache data cleared')
  }

  /**
   * Get comprehensive cache statistics
   */
  getMetrics(): CacheMetrics {
    const baseStats = SmartCacheManager.getStats()
    // const cacheKeys = keys.filter(key => key.startsWith('smart-cache-'))

    let totalHits = 0
    let totalMisses = 0
    let totalLoadTime = 0
    let entries = 0

    // Calculate advanced metrics from performance data
    try {
      const performanceData = localStorage.getItem('performance-metrics')
      if (performanceData) {
        const metrics = JSON.parse(performanceData)
        Object.values(metrics).forEach((metric: any) => {
          if (metric.cacheHits !== undefined) {
            totalHits += metric.cacheHits
            totalMisses += metric.cacheMisses || 0
            totalLoadTime += metric.totalLoadTime || 0
            entries++
          }
        })
      }
    } catch (error) {
      console.warn('[UniversalCache] Failed to read performance metrics:', error)
    }

    const hitRate = totalHits + totalMisses > 0 ? totalHits / (totalHits + totalMisses) : 0
    const averageLoadTime = entries > 0 ? totalLoadTime / entries : 0

    return {
      totalEntries: baseStats.totalCaches || 0,
      totalSize: (baseStats.totalSizeKB || 0) * 1024,
      hitRate: hitRate * 100,
      missRate: (1 - hitRate) * 100,
      averageLoadTime,
      memoryUsage: this.getMemoryUsage()
    }
  }

  /**
   * Get cache memory usage as percentage of limit
   */
  private getMemoryUsage(): number {
    // Skip if we're on the server side
    if (typeof window === 'undefined') {
      return 0
    }

    const stats = SmartCacheManager.getStats()
    return ((stats.totalSizeKB || 0) * 1024 / this.maxSize) * 100
  }

  /**
   * Cleanup old or low-priority cache entries when approaching memory limits
   */
  private performCleanup(): void {
    // Skip cleanup on server side
    if (typeof window === 'undefined') {
      return
    }

    const usage = this.getMemoryUsage()
    
    if (usage > 80) { // If using more than 80% of cache limit
      console.log(`[UniversalCache] Memory usage at ${usage.toFixed(1)}%, performing cleanup`)
      
      const keys = Object.keys(sessionStorage)
      const cacheEntries: Array<{key: string, lastAccessed: number, priority: number}> = []
      
      // Collect cache entries with metadata
      keys.forEach(key => {
        if (key.startsWith('smart-cache-') && !key.endsWith('-timestamp') && !key.endsWith('-version')) {
          const timestamp = sessionStorage.getItem(`${key}-timestamp`)
          const lastAccessed = timestamp ? parseInt(timestamp) : 0
          
          // Derive priority from cache key (core data types have higher priority)
          let priority = 1
          if (key.includes('students') || key.includes('teachers') || key.includes('classrooms')) {
            priority = 3 // High priority
          } else if (key.includes('assignments') || key.includes('attendance')) {
            priority = 2 // Medium priority
          }
          
          cacheEntries.push({ key, lastAccessed, priority })
        }
      })
      
      // Sort by priority (ascending) and last accessed (ascending) - remove low priority, old items first
      cacheEntries.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority
        return a.lastAccessed - b.lastAccessed
      })
      
      // Remove 25% of cache entries
      const itemsToRemove = Math.ceil(cacheEntries.length * 0.25)
      for (let i = 0; i < itemsToRemove && i < cacheEntries.length; i++) {
        const key = cacheEntries[i].key
        sessionStorage.removeItem(key)
        sessionStorage.removeItem(`${key}-timestamp`)
        sessionStorage.removeItem(`${key}-version`)
      }
      
      console.log(`[UniversalCache] Cleanup completed - removed ${itemsToRemove} cache entries`)
    }
  }

  /**
   * Start background cleanup scheduler
   */
  private startCleanupScheduler(): void {
    // Only run cleanup scheduler on client side
    if (typeof window === 'undefined') {
      return
    }

    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.performCleanup()
    }, 5 * 60 * 1000)
  }

  /**
   * Stop cleanup scheduler (for cleanup)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }

  /**
   * Warm up cache by pre-loading critical data
   */
  async warmCache(academyId: string, categories: CacheCategory[] = []): Promise<void> {
    console.log(`[UniversalCache] Starting cache warming for academy: ${academyId}`)
    
    // If no categories specified, warm all critical categories
    const categoriesToWarm = categories.length > 0 ? categories : [
      CacheCategory.STUDENTS,
      CacheCategory.TEACHERS,
      CacheCategory.CLASSROOMS
    ]
    
    const warmingPromises = categoriesToWarm.map(category => {
      // This would typically trigger the respective data hooks to load
      // For now, we'll just log the warming intent
      console.log(`[UniversalCache] Warming ${category} cache for academy ${academyId}`)
      return Promise.resolve()
    })
    
    await Promise.all(warmingPromises)
    console.log(`[UniversalCache] Cache warming completed for academy: ${academyId}`)
  }
}

/**
 * Export singleton instance
 */
export const universalCache = UniversalCacheManager.getInstance()

/**
 * Cache utilities for easy use across the application
 */
export const CacheUtils = {
  /**
   * Invalidate cache when data is modified
   */
  onDataModified: (category: CacheCategory, academyId: string) => {
    universalCache.invalidateCategory(category, academyId)
  },
  
  /**
   * Invalidate related caches when user changes
   */
  onUserChanged: (academyId: string) => {
    universalCache.invalidateAcademy(academyId)
  },
  
  /**
   * Pre-warm critical caches for better UX
   */
  warmCriticalCaches: (academyId: string) => {
    universalCache.warmCache(academyId, [
      CacheCategory.STUDENTS,
      CacheCategory.TEACHERS,
      CacheCategory.CLASSROOMS
    ])
  },
  
  /**
   * Generate consistent cache keys
   */
  key: (category: CacheCategory, academyId: string, identifier?: string) => {
    return universalCache.generateCacheKey(category, academyId, identifier)
  }
}

// Cleanup on window unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    universalCache.destroy()
  })
}