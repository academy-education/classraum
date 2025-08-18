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
  private cache = new Map<string, CacheEntry<any>>()

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
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      totalMemoryUsage: this.calculateMemoryUsage()
    }
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
  USER_PREFERENCES: (userId: string) => `user_preferences_${userId}`
} as const