import crypto from 'crypto'
import { type StudentPerformanceData, type FeedbackTemplate, type FeedbackLanguage } from './ai-service'

// In-memory cache for AI responses
const aiCache = new Map<string, {
  feedback: string
  timestamp: number
  expiresAt: number
}>()

// Cache configuration
const CACHE_CONFIG = {
  TTL: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  MAX_ENTRIES: 100, // Maximum number of cached entries
  CLEANUP_INTERVAL: 60 * 60 * 1000, // Cleanup every hour
}

// Generate a cache key based on the input parameters
function generateCacheKey(
  data: StudentPerformanceData,
  template: FeedbackTemplate,
  language: FeedbackLanguage
): string {
  // Create a stable hash of the relevant data
  const cacheableData = {
    student: data.student,
    period: data.period,
    metrics: {
      overall: data.metrics.overall,
      attendance: data.metrics.attendance,
      byType: data.metrics.byType,
      // Include category and classroom data if present
      byCategory: data.metrics.byCategory ? Object.keys(data.metrics.byCategory).sort() : undefined,
      classroomPercentiles: data.metrics.classroomPercentiles ? Object.keys(data.metrics.classroomPercentiles).sort() : undefined
    },
    filters: data.selectedFilters,
    template,
    language
  }

  const serialized = JSON.stringify(cacheableData)
  return crypto.createHash('sha256').update(serialized).digest('hex')
}

// Get cached feedback if it exists and is not expired
export function getCachedFeedback(
  data: StudentPerformanceData,
  template: FeedbackTemplate,
  language: FeedbackLanguage
): string | null {
  const key = generateCacheKey(data, template, language)
  const cached = aiCache.get(key)

  if (!cached) {
    return null
  }

  // Check if the cached entry has expired
  if (Date.now() > cached.expiresAt) {
    aiCache.delete(key)
    return null
  }

  return cached.feedback
}

// Store feedback in cache
export function setCachedFeedback(
  data: StudentPerformanceData,
  template: FeedbackTemplate,
  language: FeedbackLanguage,
  feedback: string
): void {
  const key = generateCacheKey(data, template, language)
  const now = Date.now()

  // If cache is at max capacity, remove oldest entries
  if (aiCache.size >= CACHE_CONFIG.MAX_ENTRIES) {
    cleanupExpiredEntries()
    
    // If still at capacity after cleanup, remove oldest entry
    if (aiCache.size >= CACHE_CONFIG.MAX_ENTRIES) {
      const oldestKey = Array.from(aiCache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0]?.[0]
      
      if (oldestKey) {
        aiCache.delete(oldestKey)
      }
    }
  }

  aiCache.set(key, {
    feedback,
    timestamp: now,
    expiresAt: now + CACHE_CONFIG.TTL
  })
}

// Clean up expired entries
function cleanupExpiredEntries(): void {
  const now = Date.now()
  const keysToDelete: string[] = []

  for (const [key, entry] of aiCache.entries()) {
    if (now > entry.expiresAt) {
      keysToDelete.push(key)
    }
  }

  keysToDelete.forEach(key => aiCache.delete(key))
}

// Clear all cached entries
export function clearAICache(): void {
  aiCache.clear()
}

// Get cache statistics
export function getCacheStats() {
  const now = Date.now()
  let validEntries = 0
  let expiredEntries = 0

  for (const entry of aiCache.values()) {
    if (now > entry.expiresAt) {
      expiredEntries++
    } else {
      validEntries++
    }
  }

  return {
    totalEntries: aiCache.size,
    validEntries,
    expiredEntries,
    maxEntries: CACHE_CONFIG.MAX_ENTRIES,
    ttl: CACHE_CONFIG.TTL
  }
}

// Set up periodic cleanup
let cleanupInterval: NodeJS.Timeout | null = null

export function startCacheCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval)
  }

  cleanupInterval = setInterval(cleanupExpiredEntries, CACHE_CONFIG.CLEANUP_INTERVAL)
}

export function stopCacheCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval)
    cleanupInterval = null
  }
}

// Initialize cleanup on module load
if (typeof window === 'undefined') { // Only on server side
  startCacheCleanup()
}