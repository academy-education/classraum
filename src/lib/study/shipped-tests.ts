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
  // ACT Composite (English, Math, Reading) as of 2026-09-03 (A21/B7).
  // The bank holds three Composite forms: English 150 (15 full passages),
  // Math 134, Reading 108 (3 full passages per genre). Math is
  // sandbox-verified; English and Reading FAILED the AI blind attack at
  // 76% / 79% and were decided by the pre-registered human sitting (B7):
  // the co-founder scored 4/40 = 10.0% blind against a 27.5% control
  // (PoW 2/20, Reading 2/20), below the ~40% "clean" bar fixed before
  // the number existed. Science is optional, out of the Composite, and
  // has NO items yet - the topic page must not offer it until it does.
  'test-act',
])

export const SHIPPED_TEST_FAMILIES: ReadonlySet<string> = new Set([
  'sat',
  'toefl',
  'ssat',
  'isee',
  'act',
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

/**
 * The coming-soon strip on the study landing page is what we are willing
 * to ADVERTISE, which is a product decision rather than a bank fact, so it
 * is edited here and not in study_topics:
 *
 *  - HIDDEN: families that have a topic row but that we are not announcing
 *    (2026-09-07: IELTS, TOEIC and GRE came off the strip).
 *  - EXTRA: families announced before any topic row exists. They render as
 *    locked chips only; nothing links to them and the API gate above still
 *    refuses them, so adding one here creates no generate path.
 */
export const COMING_SOON_HIDDEN_SLUGS: ReadonlySet<string> = new Set([
  'test-ielts',
  'test-toeic',
  'test-gre',
])

export const COMING_SOON_EXTRA: ReadonlyArray<{ slug: string; name_en: string; name_ko: string }> = [
  { slug: 'test-map',   name_en: 'MAP Test', name_ko: 'MAP 테스트' },
  { slug: 'test-ib',    name_en: 'IB',       name_ko: 'IB' },
  { slug: 'test-igcse', name_en: 'IGCSE',    name_ko: 'IGCSE' },
  { slug: 'test-ged',   name_en: 'GED',      name_ko: 'GED' },
]
