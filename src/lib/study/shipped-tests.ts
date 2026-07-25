/**
 * Which test families are actually shipped.
 *
 * A family is "shipped" when it has a verified Claude-authored item bank
 * behind it, so /api/study/test/assemble can serve it with no model call
 * at request time. Everything else renders as "coming soon".
 *
 * This lived as a client-only constant in the study landing page, which
 * meant the gate was cosmetic: the card was untappable, but a direct
 * topic URL still created a full_test session, and TestSession then
 * called /api/study/test/generate — the legacy live-GPT generator. That
 * path reserves credits and bills a model run for a family we don't
 * actually support, which is exactly the "some buttons still generate
 * with GPT" problem. Keeping the list here lets the API enforce it too,
 * so the lock is real rather than a UI suggestion.
 *
 * Slugs are the topic slugs ('test-sat'); families are the bare names
 * ('sat') used by the credit/spec code.
 */

export const SHIPPED_TEST_SLUGS: ReadonlySet<string> = new Set([
  'test-sat',
  'test-toefl',
])

export const SHIPPED_TEST_FAMILIES: ReadonlySet<string> = new Set([
  'sat',
  'toefl',
])

export function isShippedTestSlug(slug: string | null | undefined): boolean {
  return !!slug && SHIPPED_TEST_SLUGS.has(slug)
}

/**
 * True when a family is servable from the bank. Callers that cannot
 * resolve a family (null/empty) should fail OPEN — non-test topics have
 * no family and must not be blocked by this gate.
 */
export function isShippedTestFamily(family: string | null | undefined): boolean {
  if (!family) return true
  return SHIPPED_TEST_FAMILIES.has(family.toLowerCase())
}
