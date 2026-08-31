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
  // SSAT and ISEE each serve TWO full forms as of 2026-08-31 (A17).
  // The tightest sections, measured by verify-admission-forms.mjs:
  //
  //     SSAT reading   83 drawable / 40 needed = 2.08 forms
  //     ISEE math     174 drawable / 84 needed = 2.07
  //     SSAT verbal   124 drawable / 60 needed = 2.07
  //
  // Reading counts are AFTER the 3-items-per-passage cap (SSAT reading
  // holds 138 items but only 83 are drawable in one form), so do not
  // read repeatability off the raw bank count.
  //
  // This block previously said "EXACTLY ONE full form each"; that was
  // true on 2026-08-29 and stopped being true two days later. Re-run the
  // script rather than trusting this comment, and re-run it after any
  // archive — archiving items is what would silently take it back to one.
  'test-ssat',
  'test-isee',
])

export const SHIPPED_TEST_FAMILIES: ReadonlySet<string> = new Set([
  'sat',
  'toefl',
  'ssat',
  'isee',
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
