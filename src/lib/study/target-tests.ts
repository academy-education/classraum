/**
 * Which target tests are actually open for study.
 *
 * The onboarding wizard renders the closed ones dimmed with a "Soon"
 * chip, and the camp auto-answer (useOnboardingGate) must agree with
 * that list: writing `target_test: 'ksat'` because a camp says so would
 * point a student at a test with no content, which is exactly what the
 * wizard's lock exists to prevent.
 *
 * One table, imported twice — same reason as GOAL_SCALES in
 * ./goal-scales.ts, which had drifted from the wizard's private copy.
 */
import { SHIPPED_TEST_SLUGS } from './shipped-tests'

// Derived from the landing page's own shipped list ('test-sat' -> 'sat') so
// onboarding can never offer fewer tests than the app actually opens. Until
// 2026-10-24 this was a hand-kept ['sat', 'toefl'] while ACT, SSAT and ISEE
// were already open on the landing grid, and new students could not pick them.
export const AVAILABLE_TARGET_TESTS: readonly string[] = [...SHIPPED_TEST_SLUGS]
  .filter(slug => slug.startsWith('test-'))
  .map(slug => slug.slice('test-'.length))

export function isAvailableTargetTest(test: string | null | undefined): boolean {
  return !!test && AVAILABLE_TARGET_TESTS.includes(String(test).toLowerCase())
}
