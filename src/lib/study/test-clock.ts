/**
 * Is this sitting untimed?
 *
 * MAP Growth (2026-10-19) has no time limit on the real test, so its blueprint
 * sets 0 minutes. The runner then counts elapsed time UP and never warns; the
 * auto-submit already requires a limit above zero. Adaptive modules and TOEFL
 * Writing blocks always run their own clock, so they are never untimed, even
 * if a payload arrives with 0.
 */
export function isUntimedTest(t: { adaptive: boolean; writingBlocks: boolean; timeLimitMinutes: number | null | undefined }): boolean {
  return !t.adaptive && !t.writingBlocks && !((t.timeLimitMinutes ?? 0) > 0)
}
