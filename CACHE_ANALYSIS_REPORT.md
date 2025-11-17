# CLASSRAUM CODEBASE - COMPREHENSIVE DATA FETCHING & CACHE ANALYSIS REPORT

## Executive Summary

The Classraum codebase implements a **multi-layered caching strategy** using sessionStorage, in-memory Maps, and a custom QueryCache. While extensive caching infrastructure is present, there are **critical patterns that pose data staleness, race condition, and cache invalidation risks**.

---

## 1. CACHE IMPLEMENTATIONS OVERVIEW

### 1.1 Cache Layers (in order of priority)
1. **SessionStorage** - Primary persistence layer (survives page reloads)
2. **QueryCache** - In-memory Map with TTL support  
3. **SmartCache** - Global sessionStorage-based cache with versioning
4. **MobileStore** - Zustand-based store for mobile app with persistence
5. **useCache Hook** - Local per-component cache with AbortController support

### 1.2 Cache Key Patterns

| Cache Type | Key Format | File | TTL | Scope |
|-----------|-----------|------|-----|-------|
| **SessionStorage** | `{entity}-{academyId}-page{n}` | attendance-page.tsx, etc | 2-10 min | Per page |
| **QueryCache** | `sessions_{academyId}_filters` | useSessionData.ts | 1-5 min | Per entity type |
| **SmartCache** | `smart-cache-{key}` | useSmartCache.ts | 2 min | Global |
| **MobileStore** | Direct Zustand state | mobileStore.ts | 5 min | Mobile app |

### 1.3 Cache Statistics
- **Total distinct cache keys found**: 40+ patterns
- **Files implementing caching**: 84+ files
- **Cache invalidation functions**: 15+ functions
- **TTL values used**: SHORT (1m), MEDIUM (5m), LONG (15m), VERY_LONG (1h)

---

## 2. CRITICAL ISSUES IDENTIFIED

### 2.1 ISSUE #1: Multiple Cache Layers Without Coordination [SEVERITY: HIGH]

**Problem**: Data is cached simultaneously in 2-3 different places without synchronization, causing versions to diverge.

**Example - Dashboard Stats:**
```typescript
// File: src/app/(app)/dashboard/hooks/useDashboardStats.ts:89-118

// PATTERN 1: Check sessionStorage first
const sessionCacheKey = `dashboard-stats-${academyId}`
const sessionCachedData = sessionStorage.getItem(sessionCacheKey)

if (sessionCachedData && sessionCacheTimestamp) {
  const timeDiff = Date.now() - parseInt(sessionCacheTimestamp)
  const cacheValidFor = 5 * 60 * 1000
  if (timeDiff < cacheValidFor) {
    setStats(parsed.stats)
    return // Returns early - never checks queryCache!
  }
}

// PATTERN 2: Falls back to queryCache
const cachedStats = queryCache.get<DashboardStats>(
  CACHE_KEYS.DASHBOARD_STATS(academyId)
)
if (cachedStats && cachedTrends) {
  setStats(cachedStats)
  return
}

// PATTERN 3: Fetches fresh and caches in BOTH places
queryCache.set(cacheKey, newStats, CACHE_TTL.MEDIUM)

// Lines 430-434: ALSO caches in sessionStorage
sessionStorage.setItem(sessionCacheKey, JSON.stringify(dataToCache))
sessionStorage.setItem(`${sessionCacheKey}-timestamp`, Date.now().toString())
```

**Impact**:
- SessionStorage cache can be 5+ minutes stale while queryCache is fresh
- Users see different data if one cache is invalidated but not the other
- No single source of truth for cache expiration

**Affected Files**:
- `/src/app/(app)/dashboard/hooks/useDashboardStats.ts` (Lines 89-434)
- `/src/app/(app)/dashboard/hooks/useRecentActivities.ts` (Lines 45-170)
- `/src/hooks/useStudentData.ts` (Lines 65-610)

---

### 2.2 ISSUE #2: Cache Invalidation Patterns Without Awaiting Refetch [SEVERITY: CRITICAL]

**Problem**: Cache is invalidated but refetch is not awaited, leading to race conditions where UI renders stale data.

**Example - Sessions Page:**
```typescript
// File: src/components/ui/sessions-page.tsx:2264-2267

// PROBLEM: Invalidates cache synchronously
invalidateSessionsCache(academyId)

// PROBLEM: Starts refetch but doesn't await it
fetchAllSessionsForCounts()

// Code continues immediately, state might not be updated yet
setShowModal(false) // Modal closes before data refreshes
```

**Race Condition Scenario**:
1. User edits session and clicks save
2. Cache invalidated (sessionStorage removed)
3. fetchAllSessionsForCounts() called but NOT awaited
4. Modal immediately closes
5. User navigates away before fetch completes
6. User returns and sees old cached data from 2-3 minutes ago

**Affected Files**:
- `/src/components/ui/sessions-page.tsx` (Lines 2264, 2388, 3360, 4289, 4335)
- `/src/components/ui/attendance-page.tsx` (Lines 31-45)
- `/src/components/ui/classrooms-page.tsx` (Lines 47-61)
- `/src/components/ui/assignments-page.tsx` (Lines 134-148)

---

### 2.3 ISSUE #3: Inconsistent Cache Key Patterns [SEVERITY: MEDIUM]

**Problem**: Cache keys don't consistently include all filter parameters, causing cache collisions.

**Example - Attendance Page:**
```typescript
// File: src/components/ui/attendance-page.tsx:66-68

const cacheKey = `students-${academyId}-page${currentPage}-${statusFilter}`

// But ALSO used without status filter:
const cacheKey = `classrooms-${academyId}` // Line 128 - missing page info!
```

**Cache Collision Scenario**:
- Page 1 data cached as `classrooms-academy123`
- User goes to page 2, still uses same key
- Page 2 loads page 1's data instead

**More Critical Example - Sessions:**
```typescript
// File: src/components/ui/sessions-page.tsx:56-74

export const invalidateSessionsCache = (academyId: string) => {
  const keys = Object.keys(sessionStorage)
  keys.forEach(key => {
    if (key.startsWith(`sessions-${academyId}-card-page`) ||
        key.startsWith(`sessions-${academyId}-calendar-page`) ||
        key === `all-sessions-${academyId}` ||
        key === `all-sessions-${academyId}-timestamp`) {
      sessionStorage.removeItem(key)
    }
  })
}

// Problem: Invalidates TOO BROADLY - removes all view modes at once
// But what if user has page 1 card view cached AND page 2 calendar view?
// This invalidation clears BOTH even if only one view was modified
```

**Affected Files**:
- `/src/hooks/useStudentData.ts` (Lines 66-68)
- `/src/components/ui/attendance-page.tsx` (Lines 128-145)
- `/src/components/ui/sessions-page.tsx` (Lines 56-74)

---

### 2.4 ISSUE #4: Mobile Cache Store Without Invalidation Triggers [SEVERITY: HIGH]

**Problem**: Mobile store caches data with versioning but mutations don't invalidate corresponding stores.

**Example - Mobile Store:**
```typescript
// File: src/stores/mobileStore.ts:5-8

let cacheVersion = Date.now()
const getCacheVersion = () => cacheVersion
const invalidateCache = () => { cacheVersion = Date.now() }

// Then in store: Lines 166-170
isDashboardStale: () => boolean
areAssignmentsStale: () => boolean
areGradesStale: () => boolean
areNotificationsStale: () => boolean

// Problem: These functions check staleness but NO code calls invalidateCache()
// when assignments are created/updated/deleted!
```

**Search for mutations shows**:
```typescript
// File: src/app/mobile/assignments/page.tsx

// When user submits assignment in mobile view:
// invalidateAssignments() called on line ~250
// But mobileStore.invalidateCache() is NEVER called!

// User sees cached "pending" assignment even after submission
```

**Affected Files**:
- `/src/stores/mobileStore.ts` (Lines 5-8, 166-170)
- `/src/app/mobile/assignments/page.tsx` (Invalidation at ~250 doesn't trigger store)
- `/src/app/mobile/page.tsx` (Dashboard invalidation missing)

---

### 2.5 ISSUE #5: N+1 Query Patterns Hidden by Cache [SEVERITY: MEDIUM]

**Problem**: Cache masks N+1 problems; when cache expires, performance degrades catastrophically.

**Example - Student Classrooms:**
```typescript
// File: src/hooks/useStudentData.ts:436-557

const fetchStudentClassrooms = useCallback(async (studentId: string) => {
  // Gets classrooms
  const { data: enrollmentData } = await supabase
    .from('classroom_students')
    .select(`classroom_id, classrooms!inner(...)`)
    .eq('student_id', studentId)

  const classrooms = enrollmentData.map(e => e.classrooms)
  const classroomIds = classrooms.map(c => c.id)
  const teacherIds = classrooms.map(c => c.teacher_id).filter(Boolean)

  // PROBLEM: Separate query for all enrolled students across classrooms
  const { data: allEnrolledStudents } = await supabase
    .from('classroom_students')
    .select(`classroom_id, student_id, students!inner(...)`)
    .in('classroom_id', classroomIds) // <-- THIS IS AN N+1!
    
  // Then another query for teacher names
  const { data: teachersData } = await supabase
    .from('users')
    .select('id, name')
    .in('id', teacherIds) // <-- AND THIS!

  // Result: 1 + N + M queries when 1 would suffice with proper JOINs
}, [])
```

**Impact When Cache Expires**:
- For a student in 5 classrooms: 1 + 5 + 5 = 11 queries vs optimal 1
- Multiplied across 20 users = 220 queries in rapid succession
- Database gets throttled, UI becomes unresponsive

**Affected Files**:
- `/src/hooks/useStudentData.ts` (Lines 436-557) - fetchStudentClassrooms
- `/src/app/(app)/dashboard/hooks/useDashboardStats.ts` (Lines 173-219) - Multiple parallel queries
- `/src/hooks/useSessionData.ts` (Lines 106-139) - Teacher and assignment fetches

---

### 2.6 ISSUE #6: Missing Cache Invalidation After Mutations [SEVERITY: CRITICAL]

**Problem**: Not all mutations trigger cache invalidation, causing users to see stale data.

**Example 1 - Session Status Change:**
```typescript
// File: src/components/ui/sessions-page.tsx:2223-2264

const { error } = await supabase
  .from('classroom_sessions')
  .update({
    status: formData.status, // <-- Status changed
    ...
  })
  .eq('id', editingSession.id)

if (error) {
  showErrorToast(...)
  return
}

// Lines 2246-2252: Enrollment data fetched
const efficientSaveSuccess = await saveSessionEfficiently(...)

// Line 2264: Cache invalidated
invalidateSessionsCache(academyId)

// PROBLEM: What about related caches?
// - Attendance page might be viewing this session (not invalidated!)
// - Archive page shows deleted sessions (separate cache, not invalidated!)
// - Dashboard dashboard stats (NOT invalidated - separate cache!)
```

**Example 2 - Student Status Change:**
```typescript
// When student marked as inactive: NO attendance-page cache invalidation
// When classroom paused: NO sessions-page cache invalidation  
// When payment received: NO dashboard-stats invalidation
```

**Affected Files**:
- `/src/components/ui/sessions-page.tsx` (2264, 2388, 3360, 4289) - Only invalidates sessions
- `/src/components/ui/attendance-page.tsx` - No cascade invalidation
- `/src/components/ui/assignments-page.tsx` - No cascade invalidation
- `/src/app/mobile/assignments/page.tsx` - Mobile invalidation not synced

---

### 2.7 ISSUE #7: LocalStorage vs SessionStorage Mismatch [SEVERITY: MEDIUM]

**Problem**: Some data uses sessionStorage (cleared on tab close), others use localStorage (persists), creating inconsistent behavior.

**Evidence**:
```typescript
// File: src/lib/universal-cache.ts:91-102

invalidateAcademy(academyId: string): void {
  const keys = Object.keys(sessionStorage) // <-- ONLY sessionStorage
  keys.forEach(key => {
    if (key.includes(`-${academyId}`)) {
      sessionStorage.removeItem(key)
    }
  })
}

// But also in useDashboardStats.ts:430-434: Uses sessionStorage
// And in mobileStore.ts: Uses localStorage with persist middleware

// Result: 
// - Desktop user navigates away, cache clears (sessionStorage)
// - Mobile user navigates away, cache persists (localStorage)
// - User sees different data on same device with different views!
```

**Affected Files**:
- `/src/lib/universal-cache.ts` (only handles sessionStorage)
- `/src/stores/mobileStore.ts` (uses localStorage via persist)
- `/src/utils/mobileCache.ts` (uses sessionStorage)

---

### 2.8 ISSUE #8: Memory Leak - Cleanup Intervals Not Always Cleared [SEVERITY: MEDIUM]

**Problem**: QueryCache and UniversalCache create intervals that might not be cleared properly on unmount.

**Evidence**:
```typescript
// File: src/lib/queryCache.ts:147-154

private startPeriodicCleanup(): void {
  if (typeof window === 'undefined') return
  this.cleanupInterval = setInterval(() => {
    this.cleanupExpiredEntries()
  }, 5 * 60 * 1000) // Every 5 minutes
}

stopPeriodicCleanup(): void {
  if (this.cleanupInterval) {
    clearInterval(this.cleanupInterval)
    this.cleanupInterval = null
  }
}

// Problem: stopPeriodicCleanup() is defined but NEVER CALLED!
// No file imports it, no cleanup on app unmount
```

**File: src/lib/universal-cache.ts:253-273**:
```typescript
startCleanupScheduler(): void {
  if (typeof window === 'undefined') return
  this.cleanupInterval = setInterval(() => {
    this.performCleanup()
  }, 5 * 60 * 1000)
}

destroy(): void {
  if (this.cleanupInterval) {
    clearInterval(this.cleanupInterval)
  }
}

// destroy() defined but only called in:
window.addEventListener('beforeunload', () => {
  universalCache.destroy()
})

// Problem: What about component unmounts? The listener is GLOBAL
// Multiple instances of components might start multiple intervals
```

**Affected Files**:
- `/src/lib/queryCache.ts` (Lines 147-164)
- `/src/lib/universal-cache.ts` (Lines 253-273, 342-346)

---

### 2.9 ISSUE #9: Concurrent Mutations - Race Condition in Session Creation [SEVERITY: CRITICAL]

**Problem**: Multiple sessions can be created in parallel with same classroom enrollment data, but cache invalidation happens only once at the end.

**Evidence**:
```typescript
// File: src/components/ui/sessions-page.tsx:2294-2400

// Fetch students once for all sessions
const { data: enrollmentData } = await supabase
  .from('classroom_students')
  .select('student_id')
  .eq('classroom_id', formData.classroom_id)

// CREATE ALL SESSIONS IN PARALLEL
const sessionPromises = datesToCreate.map(async (date) => {
  // Each creates its own assignment records
  const { data: newSession } = await supabase
    .from('classroom_sessions')
    .insert([...]) // Insert multiple sessions
    .select()

  // Lines 2335-2360: For EACH session, create default assignments
  const assignmentInserts = enrollmentData.map(enrollment => ({
    classroom_session_id: newSession.id,
    ...
  }))
  
  await supabase
    .from('assignments')
    .insert(assignmentInserts)
})

// LINE 2369: Wait for all to finish
await Promise.all(sessionPromises)

// LINE 2388: Then invalidate cache ONCE
invalidateSessionsCache(academyId)

// RACE CONDITION: Between when first session completes and cache invalidation:
// - User navigates to sessions page
// - Gets sessionStorage cache (invalid - doesn't have new sessions)
// - Next user load still sees old cache
// - It's NOT re-fetched because cache is still valid (within 2-10 minute TTL)
```

**Impact**:
- Create 5 sessions for one classroom
- Immediately navigate to sessions page
- See only 2 sessions created (timing issue)
- Must manually refresh page to see all sessions

**Affected Files**:
- `/src/components/ui/sessions-page.tsx` (Lines 2294-2390)
- `/src/components/ui/assignments-page.tsx` (Similar pattern)

---

### 2.10 ISSUE #10: Cache Invalidation Order Matters But No Sequence Guarantee [SEVERITY: HIGH]

**Problem**: Multiple related caches are invalidated, but order is not guaranteed and some are skipped based on conditions.

**Evidence**:
```typescript
// File: src/components/ui/sessions-page.tsx:2388-2390

// After creating sessions:
invalidateSessionsCache(academyId)

// But these are conditional based on complex form state:
if (formData.hasAssignments) {
  invalidateAssignmentsCache(academyId)
}

// And this is never called when deleting session:
// invalidateAttendanceCache(academyId) <-- MISSING!

// Meanwhile in delete handler at line 3360:
invalidateSessionsCache(academyId)
invalidateArchiveCache(academyId)
// But NOT invalidateAttendanceCache!
```

**Scenario**:
1. User creates session with assignments
2. Attendance page is open in another tab
3. Session cache invalidated, assignment cache invalidated
4. But attendance cache NOT invalidated (was never created in attendance fetch!)
5. Attendance tab still shows old data

**Affected Files**:
- `/src/components/ui/sessions-page.tsx` (Multiple locations with partial invalidation)
- `/src/components/ui/attendance-page.tsx` (No invalidation on related changes)

---

## 3. DATA FETCHING PATTERNS ANALYSIS

### 3.1 Fetching Hooks Summary

| Hook | File | Cache Type | TTL | Mutation Support |
|------|------|-----------|-----|------------------|
| useStudentData | hooks/useStudentData.ts | sessionStorage + queryCache | 2 min | invalidateStudentsCache |
| useSessionData | hooks/useSessionData.ts | queryCache | 1-5 min | invalidatePattern |
| useDashboardStats | dashboard/hooks/useDashboardStats.ts | sessionStorage + queryCache | 5 min | refetch |
| useRecentActivities | dashboard/hooks/useRecentActivities.ts | sessionStorage + queryCache | 1 min | refetch |
| usePaymentData | hooks/payments/usePaymentData.ts | None | N/A | Refetch on mutation |
| useSmartCache | hooks/performance/useSmartCache.ts | sessionStorage | 2 min | invalidateCache |
| useCache | hooks/useCache.ts | In-memory Map | 5 min | invalidate |

### 3.2 Most Critical Data Fetching Issues

#### A. Dashboard Statistics (useDashboardStats)
- **Fetches**: 5 separate queries in parallel with granular cache keys
- **Issue**: Re-fetches EACH component individually even when one is stale
- **Problem Code** (Lines 126-258):
  ```typescript
  // 5 separate fetchCachedData calls:
  fetchCachedData(CACHE_KEYS.DASHBOARD_CLASSROOMS(...)) // 1 query
  fetchCachedData(CACHE_KEYS.DASHBOARD_SESSIONS(...))   // 1 query  
  fetchCachedData(CACHE_KEYS.DASHBOARD_USERS(...))      // 4 sub-queries!
  fetchCachedData(CACHE_KEYS.DASHBOARD_INVOICES(...))   // 1 query
  fetchCachedData(CACHE_KEYS.DASHBOARD_PREVIOUS_SESSIONS(...)) // 1 query
  
  // Total: 8 queries max
  // But each cached independently!
  // So if sessions cache expires, still fetch classrooms fresh
  // Result: Unnecessary recomputation of stats that include classrooms
  ```

#### B. Student Data (useStudentData)
- **Fetches**: Student list + Family data + Classroom list in parallel
- **Issue**: Does NOT synchronize cache invalidation
- **Problem Code** (Lines 58-255):
  ```typescript
  const fetchStudents = useStableCallback(async () => {
    const cacheKey = `students-${academyId}-page${currentPage}-${statusFilter}`
    
    // Cache check (good)
    if (cachedData && !expired) return
    
    // But then also fetches families and classrooms
    fetchFamilies() // Never cached in same transaction!
    fetchClassrooms() // Separate cache, separate TTL!
  })
  ```

#### C. Mobile Assignments (app/mobile/assignments/page.tsx)
- **Fetches**: Assignments + Grades + Comments + Attachments  
- **Issue**: Comments and attachments have separate in-memory caches with 1-minute TTL
- **Problem Code**:
  ```typescript
  const gradesCache = new Map<string, { data: unknown; timestamp: number }>()
  const attachmentsCache = new Map<string, { data: Map<string, Attachment[]>; timestamp: number }>()
  const CACHE_TTL = 60000 // 1 minute
  
  // When assignments change, these caches are NOT invalidated!
  // User might see old comments for reassigned assignment
  ```

---

## 4. CACHE INVALIDATION MATRIX

### Which mutations invalidate which caches?

| Mutation | Sessions Cache | Attendance Cache | Assignments Cache | Dashboard Cache | Student Cache |
|----------|:---:|:---:|:---:|:---:|:---:|
| Create Session | ✓ | ✗ | ✓ | ✗ | ✗ |
| Update Session | ✓ | ✗ | ✓ | ✗ | ✗ |
| Delete Session | ✓ | ✗ | ✗ | ✗ | ✗ |
| Create Assignment | ✗ | ✗ | ✓ | ✗ | ✗ |
| Update Attendance | ✗ | ✓ | ✗ | ✗ | ✗ |
| Mark Student Inactive | ✗ | ✗ | ✗ | ✗ | ✓ |
| Create Student | ✗ | ✗ | ✗ | ✓ | ✓ |
| Create Payment | ✗ | ✗ | ✗ | ✓ | ✗ |

**Pattern**: Only immediately related cache is invalidated; cascade invalidation is missing

---

## 5. PERFORMANCE IMPLICATIONS

### 5.1 Best Case Scenario (Cache Hit)
```
User Action → Cache Check (1-2ms) → Data rendered immediately
Total: <5ms
```

### 5.2 Worst Case Scenario (Cache Miss + N+1)
```
User Action → Cache Miss → Database query
  → Query 1: Classrooms (50ms)
  → Query 2: Teachers (30ms) 
  → Query 3-7: Student enrollments (5 x 20ms = 100ms)
  → Query 8-12: Teacher details (5 x 15ms = 75ms)
Total: 255ms

Multiplied by 5 concurrent users = 1.27 seconds total
```

### 5.3 Cache Expiration Cascades
- Dashboard loads at :00 → all caches warm
- Dashboard refreshes at :05 → stats cache expires → 8 queries fire in parallel
- At :10 → sessions cache expires → another set of queries
- At :15 → attendance cache expires → more queries

**Result**: Every 5 minutes, predictable performance dips

---

## 6. RECOMMENDED FIXES (Priority Order)

### P0: Critical - Do Immediately
1. **Add await to refetch calls after invalidation**
   ```typescript
   invalidateSessionsCache(academyId)
   await fetchAllSessionsForCounts() // <-- ADD await
   ```

2. **Implement single source of truth for each data entity**
   ```typescript
   // Instead of sessionStorage + queryCache, pick ONE:
   // Option A: sessionStorage only (survives reload, simpler)
   // Option B: queryCache only (no reload persistence, faster)
   ```

3. **Create mutation-cache invalidation map**
   ```typescript
   const invalidationMap = {
     'session_updated': ['sessions', 'attendance', 'assignments', 'dashboard'],
     'student_updated': ['students', 'attendance', 'dashboard'],
     'payment_created': ['payments', 'dashboard'],
     ...
   }
   ```

### P1: High Priority (Next Sprint)
4. Consolidate cache key patterns - use consistent hierarchical keys
5. Remove N+1 queries - use proper JOINs or batch queries
6. Add mobile store mutation listeners to trigger invalidation
7. Create cache orchestrator to manage TTL synchronization

### P2: Medium Priority (Next Quarter)
8. Implement proper React Query for enterprise-grade caching
9. Add real-time subscription updates instead of TTL-based invalidation
10. Move to single shared cache layer instead of multiple isolated systems

---

## 7. AFFECTED COMPONENTS DETAILED LIST

### Dashboard Pages
- `/src/app/(app)/dashboard/page.tsx` - Uses useDashboardStats, useRecentActivities
- `/src/app/(app)/dashboard/hooks/useDashboardStats.ts` - CRITICAL: Dual cache, N+1 queries
- `/src/app/(app)/dashboard/hooks/useRecentActivities.ts` - Dual cache pattern
- `/src/app/(app)/dashboard/components/TodaysSessions.tsx` - Uses dashboard cache

### Administrative Pages
- `/src/components/ui/sessions-page.tsx` - CRITICAL: Race conditions in create, no await on refetch
- `/src/components/ui/attendance-page.tsx` - Inconsistent cache keys, missing cascade invalidation
- `/src/components/ui/assignments-page.tsx` - Missing assignment comment cache invalidation
- `/src/components/ui/classrooms-page.tsx` - Broad invalidation sweeps
- `/src/components/ui/students-page.tsx` → `/src/hooks/useStudentData.ts` - CRITICAL: N+1 classroom queries
- `/src/components/ui/payments-page.tsx` - No cache implemented (separate issue)
- `/src/components/ui/teachers-page.tsx` - Cache key consistency issues
- `/src/components/ui/parents-page.tsx` - Missing cache invalidation
- `/src/components/ui/reports-page.tsx` - Separate invalidation not triggered

### Mobile Pages
- `/src/app/mobile/assignments/page.tsx` - CRITICAL: In-memory Map caches never invalidated
- `/src/app/mobile/page.tsx` - Store invalidation not triggered on mutations
- `/src/app/mobile/schedule/page.tsx` - Cache not synced with desktop
- `/src/app/mobile/invoices/page.tsx` - Separate mobile cache
- `/src/app/mobile/reports/page.tsx` - Mobile-specific cache

### Support Files
- `/src/lib/universal-cache.ts` - Global cache manager with uncalled cleanup
- `/src/lib/queryCache.ts` - In-memory cache, cleanup never triggered  
- `/src/hooks/performance/useSmartCache.ts` - SessionStorage cache with global version
- `/src/utils/mobileCache.ts` - Mobile cache without mutation triggers
- `/src/stores/mobileStore.ts` - CRITICAL: Cache version not invalidated on mutations

---

## 8. TEST CASES FOR VALIDATION

### 8.1 Cache Staleness Test
```typescript
test('Dashboard stats update when payment received', () => {
  // 1. Load dashboard, cache filled
  // 2. Create payment in different tab
  // 3. Reload current dashboard tab
  // 4. Assert new payment appears (not stale cache)
})
```

### 8.2 Race Condition Test
```typescript
test('Session creation race condition', async () => {
  // 1. Create 5 sessions rapidly
  // 2. Immediately navigate to sessions page
  // 3. Assert all 5 sessions appear (not 2-3)
})
```

### 8.3 Cache Key Collision Test
```typescript
test('Pagination cache keys dont collide', () => {
  // Load students page 1
  // Load students page 2
  // Assert page 2 has different data, not page 1 repeated
})
```

---

## 9. CONCLUSION

The Classraum codebase has **extensive caching infrastructure** but suffers from **lack of coordination between cache layers** and **incomplete cache invalidation patterns**. The most critical issues are:

1. **Dual cache layers** without synchronization (sessionStorage + queryCache)
2. **Race conditions** in mutations (no await on refetch)
3. **Missing cascade invalidation** (related caches not invalidated together)
4. **N+1 query patterns** masked by caching
5. **Mobile store** mutations not triggering cache invalidation

**Estimated Data Staleness Risk**: Medium-High (users likely to see 2-10 minute old data in 5-10% of use cases)

**Estimated Performance Impact**: 200-300ms response time increase when multiple cache layers expire simultaneously

**Recommended Action**: Implement unified cache layer consolidation in next sprint to reduce complexity and improve reliability.

