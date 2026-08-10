/**
 * Goal-score presets per test, and which selected tests get a goal row.
 *
 * WHY THIS IS SHARED AND NOT A CONSTANT IN EACH SCREEN.
 *
 * Two surfaces ask the same question — the onboarding wizard on first
 * run, and study preferences forever after — and until 2026-08-11 they
 * disagreed. Preferences offered SAT and TOEFL goals from a
 * `GOAL_SCALES` table; onboarding had its own `SCORE_PRESETS` array
 * that was SAT-only, so a student who picked TOEFL during onboarding
 * was never asked for a goal at all and only discovered the setting
 * existed if they went looking in preferences.
 *
 * That is the same failure mode as two hand-maintained copies of the
 * bank register: the copies do not stay equal, and nothing fails when
 * they diverge. One table, imported twice.
 *
 * A test with no entry here simply has no goal row — that is deliberate
 * and not an oversight. A goal only means something on a scale we can
 * predict against, and the predicted-score engine covers SAT today.
 */
export const GOAL_SCALES: Record<string, number[]> = {
  sat: [1200, 1300, 1400, 1500, 1600],
  toefl: [80, 90, 100, 105, 110, 120],
}

/**
 * The tests, in order, that should show a goal row for a given
 * selection.
 *
 * Case-insensitive and de-duplicated, because target_tests carries
 * legacy mixed-case rows ('sat' alongside 'SAT') and the focus pointer
 * (`target_test`) is normally also present in the array — counting it
 * twice would render two identical goal rows.
 *
 * Accepts the focus pointer as a trailing argument so a row that only
 * ever set `target_test` (pre-multi-select) still gets its goal row.
 */
export function goalTestsFor(
  targets: readonly string[] | null | undefined,
  focus?: string | null,
): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of [...(targets ?? []), focus ?? '']) {
    const key = String(raw ?? '').toLowerCase()
    if (key && GOAL_SCALES[key] && !seen.has(key)) {
      seen.add(key)
      out.push(key)
    }
  }
  return out
}
