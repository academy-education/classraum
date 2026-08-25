/**
 * Camp seat/window arithmetic. Pure — NO supabase import.
 *
 * These lived in `useCampPrograms` at first, and the test suite for
 * them collected ZERO tests: importing the hook pulls in
 * `@/lib/supabase`, which throws under jest, so the suite died at
 * import and reported nothing while the other suites still printed
 * their passes. Keep the arithmetic reachable without the data layer.
 */

export interface CampWindow {
  starts_on: string | null
  ends_on: string | null
}

/** A program whose window has closed can still be READ — an ended camp
 *  keeps its dashboards — but a classroom should not be newly pointed at
 *  one: the API refuses to build assignments outside the window, so the
 *  classroom would be inert from the moment it was created.
 *
 *  Boundary days are INSIDE the window, matching the API's
 *  `today < starts_on` / `today > ends_on` gates. */
export function isProgramOpen(p: CampWindow, today = new Date()): boolean {
  const d = today.toISOString().slice(0, 10)
  if (p.starts_on && d < p.starts_on) return false
  if (p.ends_on && d > p.ends_on) return false
  return true
}

/**
 * Would this roster push the camp past the seats the school paid for?
 *
 * The union is the load-bearing part. A student already enrolled in
 * ANOTHER class of the same camp occupies one seat, not two — the cap
 * counts distinct people across the whole program, so adding the two
 * lists instead of unioning them would refuse a legal save.
 *
 * Returns null when the save is fine, or the numbers to report.
 */
export function campCapOverflow(
  existing: Iterable<string>,
  selected: Iterable<string>,
  cap: number,
): { total: number; over: number } | null {
  // cap 0 means "not metered": every camp_programs row defaults to 0 and
  // only a paid program gets a real number, so 0 must not block anything.
  if (!cap || cap <= 0) return null
  const total = new Set([...existing, ...selected]).size
  if (total <= cap) return null
  return { total, over: total - cap }
}
