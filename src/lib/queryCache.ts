/**
 * Simple query result cache with TTL support
 * Reduces redundant database queries for frequently accessed data
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
}

class QueryCache {
  private cache = new Map<string, CacheEntry<unknown>>()
  private maxCacheSize = 50 // Maximum number of cache entries
  private cleanupInterval: NodeJS.Timeout | null = null
  private lastCleanup = Date.now()

  constructor() {
    // Start periodic cleanup (every 5 minutes)
    this.startPeriodicCleanup()
  }

  /**
   * Get cached data if available and not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    console.log(`🎯 Cache hit for key: ${key}`)
    return entry.data as T
  }

  /**
   * Store data in cache with TTL
   */
  set<T>(key: string, data: T, ttlMs: number = 300000): void { // Default 5 minutes
    console.log(`💾 Caching data for key: ${key} (TTL: ${ttlMs}ms)`)

    // Check if we need to make room in the cache
    if (this.cache.size >= this.maxCacheSize) {
      this.evictOldestEntries(1)
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    })
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(key: string): void {
    console.log(`🗑️ Invalidating cache for key: ${key}`)
    this.cache.delete(key)
  }

  /**
   * Invalidate cache entries matching pattern
   */
  invalidatePattern(pattern: string): void {
    const keysToDelete = Array.from(this.cache.keys()).filter(key => 
      key.includes(pattern)
    )
    keysToDelete.forEach(key => {
      console.log(`🗑️ Invalidating cache for key: ${key}`)
      this.cache.delete(key)
    })
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    console.log('🧹 Clearing all cache entries')
    this.cache.clear()
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startPeriodicCleanup(): void {
    if (typeof window === 'undefined') return // Skip in SSR

    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries()
    }, 5 * 60 * 1000) // Every 5 minutes
  }

  /**
   * Stop periodic cleanup
   */
  stopPeriodicCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }

  /**
   * Remove expired entries from cache
   */
  cleanupExpiredEntries(): number {
    const now = Date.now()
    let removedCount = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
        removedCount++
      }
    }

    this.lastCleanup = now

    if (removedCount > 0) {
      console.log(`🧹 Cleaned up ${removedCount} expired cache entries`)
    }

    // Check for memory warnings
    this.checkMemoryUsage()

    return removedCount
  }

  /**
   * Evict oldest entries to make room for new ones
   */
  private evictOldestEntries(count: number): void {
    const entries = Array.from(this.cache.entries())
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp)

    for (let i = 0; i < count && i < entries.length; i++) {
      const [key] = entries[i]
      this.cache.delete(key)
      console.log(`🗑️ Evicted oldest cache entry: ${key}`)
    }
  }

  /**
   * Check memory usage and warn if too high
   */
  private checkMemoryUsage(): void {
    if (this.cache.size > this.maxCacheSize * 0.8) {
      console.warn(`⚠️ Cache approaching size limit: ${this.cache.size}/${this.maxCacheSize} entries`)
    }

    const memoryUsage = this.calculateMemoryUsage()
    const sizeInKB = parseFloat(memoryUsage.replace(' KB', ''))

    if (sizeInKB > 1024) { // Warn if over 1MB
      console.warn(`⚠️ Cache memory usage high: ${memoryUsage}`)
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      keys: Array.from(this.cache.keys()),
      totalMemoryUsage: this.calculateMemoryUsage(),
      lastCleanup: new Date(this.lastCleanup).toISOString(),
      expiredEntries: this.getExpiredEntryCount()
    }
  }

  /**
   * Get count of expired entries without removing them
   */
  private getExpiredEntryCount(): number {
    const now = Date.now()
    let expiredCount = 0

    for (const entry of this.cache.values()) {
      if (now - entry.timestamp > entry.ttl) {
        expiredCount++
      }
    }

    return expiredCount
  }

  private calculateMemoryUsage(): string {
    const cacheString = JSON.stringify(Array.from(this.cache.entries()))
    const sizeInBytes = new Blob([cacheString]).size
    return `${(sizeInBytes / 1024).toFixed(2)} KB`
  }
}

// Export singleton instance
export const queryCache = new QueryCache()

// Cache TTL constants
export const CACHE_TTL = {
  SHORT: 60000,     // 1 minute - for frequently changing data
  MEDIUM: 300000,   // 5 minutes - for moderately stable data
  LONG: 900000,     // 15 minutes - for relatively stable data
  VERY_LONG: 3600000 // 1 hour - for very stable data like user preferences
} as const

// Cache key generators
export const CACHE_KEYS = {
  USER_COUNTS: (academyId: string) => `user_counts_${academyId}`,
  CLASSROOMS: (academyId: string) => `classrooms_${academyId}`,
  SESSIONS: (academyId: string, filters?: string) => `sessions_${academyId}_${filters || 'all'}`,
  TEACHERS: (academyIds: string[]) => `teachers_${academyIds.sort().join(',')}`,
  STUDENTS: (classroomIds: string[]) => `students_${classroomIds.sort().join(',')}`,
  REVENUE_TRENDS: (academyId: string) => `revenue_trends_${academyId}`,
  USER_PREFERENCES: (userId: string) => `user_preferences_${userId}`,

  // Granular dashboard cache keys
  DASHBOARD_CLASSROOMS: (academyId: string) => `dashboard_classrooms_${academyId}`,
  DASHBOARD_SESSIONS: (academyId: string) => `dashboard_sessions_${academyId}`,
  DASHBOARD_USERS: (academyId: string) => `dashboard_users_${academyId}`,
  DASHBOARD_INVOICES: (academyId: string) => `dashboard_invoices_${academyId}`,
  DASHBOARD_PREVIOUS_SESSIONS: (academyId: string) => `dashboard_prev_sessions_${academyId}`,
  DASHBOARD_STATS: (academyId: string) => `dashboard_stats_${academyId}`,
  DASHBOARD_TRENDS: (academyId: string) => `dashboard_trends_${academyId}`
} as const