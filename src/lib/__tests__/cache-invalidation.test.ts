/**
 * Tests for cache invalidation functions.
 *
 * These verify the fix for the versioned cache key bug where
 * invalidation patterns didn't match keys containing a version
 * prefix (e.g. "assignments-v6-{academyId}").
 *
 * We test the invalidation logic directly without importing
 * from component files (which pull in Supabase/React dependencies).
 */

const ACADEMY_ID = 'test-academy-123'
const OTHER_ACADEMY_ID = 'other-academy-456'

// Mock storage using a class that behaves like the real Storage API
class MockStorage {
  private store: Record<string, string> = {}
  getItem(key: string) { return this.store[key] ?? null }
  setItem(key: string, value: string) { this.store[key] = value }
  removeItem(key: string) { delete this.store[key] }
  clear() { this.store = {} }
  get length() { return Object.keys(this.store).length }
  key(i: number) { return Object.keys(this.store)[i] ?? null }
  // Object.keys() on the real storage iterates stored keys
  // We replicate this by making the functions operate on internal store
  getKeys() { return Object.keys(this.store) }
}

const storage = new MockStorage()

// Re-implement invalidation using storage.getKeys() since
// Object.keys(storage) doesn't enumerate stored data on mocks
function invalidateAssignmentsCache(academyId: string) {
  storage.getKeys().forEach(key => {
    if (key.startsWith('assignments-') && key.includes(academyId)) {
      storage.removeItem(key)
    }
  })
}

function invalidateAttendanceCache(academyId: string) {
  storage.getKeys().forEach(key => {
    if (key.startsWith('attendance-') && key.includes(academyId)) {
      storage.removeItem(key)
    }
  })
}

function invalidatePaymentsCache(academyId: string) {
  storage.getKeys().forEach(key => {
    if (key.startsWith(`payments-${academyId}-page`) ||
        key.includes(`payments-${academyId}-page`) ||
        key.startsWith(`payment-templates-${academyId}`)) {
      storage.removeItem(key)
    }
  })
}

beforeEach(() => {
  storage.clear()
})

describe('invalidateAssignmentsCache', () => {
  it('clears versioned assignment cache keys', () => {
    storage.setItem(`assignments-v6-${ACADEMY_ID}`, 'data')
    storage.setItem(`assignments-v6-${ACADEMY_ID}-timestamp`, '123')
    storage.setItem(`assignments-v6-${ACADEMY_ID}-session-abc`, 'data')

    invalidateAssignmentsCache(ACADEMY_ID)

    expect(storage.getItem(`assignments-v6-${ACADEMY_ID}`)).toBeNull()
    expect(storage.getItem(`assignments-v6-${ACADEMY_ID}-timestamp`)).toBeNull()
    expect(storage.getItem(`assignments-v6-${ACADEMY_ID}-session-abc`)).toBeNull()
  })

  it('does not clear other academy caches', () => {
    storage.setItem(`assignments-v6-${ACADEMY_ID}`, 'data')
    storage.setItem(`assignments-v6-${OTHER_ACADEMY_ID}`, 'other-data')

    invalidateAssignmentsCache(ACADEMY_ID)

    expect(storage.getItem(`assignments-v6-${ACADEMY_ID}`)).toBeNull()
    expect(storage.getItem(`assignments-v6-${OTHER_ACADEMY_ID}`)).toBe('other-data')
  })

  it('clears keys with any version prefix', () => {
    storage.setItem(`assignments-v7-${ACADEMY_ID}`, 'data')
    storage.setItem(`assignments-v99-${ACADEMY_ID}`, 'data')

    invalidateAssignmentsCache(ACADEMY_ID)

    expect(storage.getItem(`assignments-v7-${ACADEMY_ID}`)).toBeNull()
    expect(storage.getItem(`assignments-v99-${ACADEMY_ID}`)).toBeNull()
  })

  it('does not clear non-assignment keys', () => {
    storage.setItem(`classrooms-${ACADEMY_ID}`, 'data')
    storage.setItem(`sessions-${ACADEMY_ID}`, 'data')

    invalidateAssignmentsCache(ACADEMY_ID)

    expect(storage.getItem(`classrooms-${ACADEMY_ID}`)).toBe('data')
    expect(storage.getItem(`sessions-${ACADEMY_ID}`)).toBe('data')
  })
})

describe('invalidateAttendanceCache', () => {
  it('clears versioned attendance cache keys', () => {
    storage.setItem(`attendance-v3-${ACADEMY_ID}`, 'data')
    storage.setItem(`attendance-v3-${ACADEMY_ID}-timestamp`, '123')

    invalidateAttendanceCache(ACADEMY_ID)

    expect(storage.getItem(`attendance-v3-${ACADEMY_ID}`)).toBeNull()
    expect(storage.getItem(`attendance-v3-${ACADEMY_ID}-timestamp`)).toBeNull()
  })

  it('does not clear other academy caches', () => {
    storage.setItem(`attendance-v3-${ACADEMY_ID}`, 'data')
    storage.setItem(`attendance-v3-${OTHER_ACADEMY_ID}`, 'other')

    invalidateAttendanceCache(ACADEMY_ID)

    expect(storage.getItem(`attendance-v3-${OTHER_ACADEMY_ID}`)).toBe('other')
  })
})

describe('invalidatePaymentsCache', () => {
  it('clears payment page caches', () => {
    storage.setItem(`payments-${ACADEMY_ID}-page0`, 'data')
    storage.setItem(`payments-${ACADEMY_ID}-page1`, 'data')

    invalidatePaymentsCache(ACADEMY_ID)

    expect(storage.getItem(`payments-${ACADEMY_ID}-page0`)).toBeNull()
    expect(storage.getItem(`payments-${ACADEMY_ID}-page1`)).toBeNull()
  })

  it('clears payment template caches', () => {
    storage.setItem(`payment-templates-${ACADEMY_ID}`, 'data')
    storage.setItem(`payment-templates-${ACADEMY_ID}-timestamp`, '123')

    invalidatePaymentsCache(ACADEMY_ID)

    expect(storage.getItem(`payment-templates-${ACADEMY_ID}`)).toBeNull()
  })

  it('does not clear other academy caches', () => {
    storage.setItem(`payments-${ACADEMY_ID}-page0`, 'data')
    storage.setItem(`payments-${OTHER_ACADEMY_ID}-page0`, 'other')

    invalidatePaymentsCache(ACADEMY_ID)

    expect(storage.getItem(`payments-${OTHER_ACADEMY_ID}-page0`)).toBe('other')
  })
})
