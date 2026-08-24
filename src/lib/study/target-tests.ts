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
export const AVAILABLE_TARGET_TESTS: readonly string[] = ['sat', 'toefl']

export function isAvailableTargetTest(test: string | null | undefined): boolean {
  return !!test && AVAILABLE_TARGET_TESTS.includes(String(test).toLowerCase())
}
