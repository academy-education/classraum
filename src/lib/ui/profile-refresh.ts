/**
 * "The signed-in user's own profile just changed — re-read it."
 *
 * WHY THIS EXISTS
 *
 * `users.name` and `users.phone` are written from more than one place,
 * and the writers are not in the same React tree as the readers. The
 * social-onboarding step is mounted by AuthWrapper; the profile page
 * holds its own copy in useMobileProfile, fetched once. So a user could
 * finish onboarding — typing their name and phone — and land on a
 * profile page still showing the provider's nickname and an empty phone,
 * with no way to reconcile short of a hard reload.
 *
 * This is the nudge between them: a monotonically increasing counter
 * that readers subscribe to and refetch on.
 *
 * A COUNTER, NOT THE DATA. Deliberately. Publishing the new values would
 * make this a second source of truth that can disagree with the
 * database — the exact failure mode of caching a write locally and
 * trusting it. Subscribers re-read from the server, so what they render
 * is what was actually stored, including any normalisation the write
 * path applied (normalizePhone canonicalises; buildNameUpdate composes
 * `name` from the two halves).
 *
 * Deliberately not a context provider, for the same reason as
 * first-run-overlays next door: the writer and the readers sit on
 * opposite sides of the layout tree, and threading a provider through
 * AuthWrapper for one integer is not worth it.
 */

let version = 0
const listeners = new Set<() => void>()

/**
 * Announce that the current user's profile row was written.
 *
 * Call AFTER the write succeeds, never optimistically before — the point
 * is to make readers agree with the database, and a bump issued for a
 * write that then failed would propagate a value nobody stored.
 */
export function bumpProfileRefresh(): void {
  version += 1
  for (const l of listeners) {
    /* Isolated: one throwing subscriber must not stop the rest from
       being told. Otherwise an unrelated component's bug shows up as
       "the profile page stopped refreshing", with nothing linking the
       two — a cross-component failure with no visible cause. */
    try { l() } catch (e) { console.error('[profile-refresh] subscriber threw:', e) }
  }
}

/** Current version. Changes identity on every bump, so it can be a dep. */
export function getProfileRefreshSnapshot(): number {
  return version
}

export function subscribeProfileRefresh(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/** Server snapshot for useSyncExternalStore — stable across SSR. */
export function getProfileRefreshServerSnapshot(): number {
  return 0
}

/** Test seam: reset module state between cases. */
export function __resetProfileRefreshForTests(): void {
  version = 0
  listeners.clear()
}
