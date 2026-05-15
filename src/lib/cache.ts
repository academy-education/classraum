/**
 * Shared sessionStorage cache invalidation helpers.
 *
 * Each page in the app caches its data per-academy in sessionStorage with a
 * `<page>-<academyId>-page<n>` key naming scheme. When the user changes
 * something that should bust the cache (language switch, role change, data
 * mutation), we want to wipe those keys.
 *
 * Previously each page module defined and exported its own
 * `invalidateXxxCache` function, and the settings page imported all 11 of
 * them — which transitively pulled the entire bundle for each page into
 * the settings chunk. That made `/settings` ~666 kB First Load JS for what
 * is otherwise a small page.
 *
 * Consolidating the helpers here lets the settings page (and any future
 * cross-page consumer) import only this tiny module. The original page
 * files re-export their respective helper from this module so existing
 * imports keep working without churn.
 */

function clearMatching(predicate: (key: string) => boolean): number {
  if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
    return 0
  }
  const keys = Object.keys(sessionStorage)
  let cleared = 0
  for (const key of keys) {
    if (predicate(key)) {
      sessionStorage.removeItem(key)
      cleared++
    }
  }
  return cleared
}

// ─── Sessions ────────────────────────────────────────────────────────────
// Sessions caches both the card view and the calendar view, plus an
// "all sessions" aggregate, all keyed by academyId.
export const invalidateSessionsCache = (academyId: string) => {
  clearMatching(key =>
    key.startsWith(`sessions-${academyId}-card-page`) ||
    key.startsWith(`sessions-${academyId}-calendar-page`) ||
    key.includes(`sessions-${academyId}-card-page`) ||
    key.includes(`sessions-${academyId}-calendar-page`) ||
    key === `all-sessions-${academyId}` ||
    key === `all-sessions-${academyId}-timestamp`
  )
}

// ─── Assignments ─────────────────────────────────────────────────────────
// Cache key version `v6` is part of the prefix; `assignments-` matches all
// versioned and unversioned forms, then includes() narrows to this academy.
export const invalidateAssignmentsCache = (academyId: string) => {
  clearMatching(key => key.startsWith(`assignments-`) && key.includes(academyId))
}

// ─── Attendance ──────────────────────────────────────────────────────────
export const invalidateAttendanceCache = (academyId: string) => {
  clearMatching(key => key.startsWith(`attendance-`) && key.includes(academyId))
}

// ─── Teachers ────────────────────────────────────────────────────────────
export const invalidateTeachersCache = (academyId: string) => {
  clearMatching(key =>
    key.startsWith(`teachers-${academyId}-page`) ||
    key.includes(`teachers-${academyId}-page`)
  )
}

// ─── Parents ─────────────────────────────────────────────────────────────
export const invalidateParentsCache = (academyId: string) => {
  clearMatching(key =>
    key.startsWith(`parents-${academyId}-page`) ||
    key.includes(`parents-${academyId}-page`)
  )
}

// ─── Families ────────────────────────────────────────────────────────────
export const invalidateFamiliesCache = (academyId: string) => {
  clearMatching(key =>
    key.startsWith(`families-${academyId}-page`) ||
    key.includes(`families-${academyId}-page`)
  )
}

// ─── Reports ─────────────────────────────────────────────────────────────
// Covers both manager and teacher role caches via the trailing `-page` match.
export const invalidateReportsCache = (academyId: string) => {
  clearMatching(key => key.startsWith(`reports-${academyId}-`) && key.includes('-page'))
}

// ─── Classrooms ──────────────────────────────────────────────────────────
export const invalidateClassroomsCache = (academyId: string) => {
  clearMatching(key =>
    key.startsWith(`classrooms-${academyId}-page`) ||
    key.includes(`classrooms-${academyId}-page`)
  )
}

// ─── Archive ─────────────────────────────────────────────────────────────
// Clears archive cache for all roles (teacher, manager, etc.).
export const invalidateArchiveCache = (academyId: string) => {
  clearMatching(key =>
    key.startsWith(`archive-${academyId}-page`) ||
    key.includes(`archive-${academyId}-page`)
  )
}

// ─── Payments ────────────────────────────────────────────────────────────
// Also clears the payment-templates cache that lives under a sibling key.
export const invalidatePaymentsCache = (academyId: string) => {
  clearMatching(key =>
    key.startsWith(`payments-${academyId}-page`) ||
    key.includes(`payments-${academyId}-page`) ||
    key.startsWith(`payment-templates-${academyId}`)
  )
}

// ─── Students ────────────────────────────────────────────────────────────
export const invalidateStudentsCache = (academyId: string) => {
  clearMatching(key =>
    key.startsWith(`students-${academyId}-page`) ||
    key.includes(`students-${academyId}-page`)
  )
}
