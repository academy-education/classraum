/**
 * The TOEFL warmup cap, in its own leaf module.
 *
 * Lives here rather than in assemble.ts for one reason: assemble.ts
 * pulls in ESM-only dependencies that Jest cannot parse, so a test
 * importing it collects ZERO tests and still exits noisily enough to
 * be mistaken for a config problem. Putting the rule in a dependency-
 * free file means the test can call the REAL function.
 *
 * That matters more than it sounds. The first version of this cap was
 * tested against a local reimplementation of the same rule, and stayed
 * green while the production cap was switched off.
 */
export type ToeflWarmupSection = 'reading' | 'listening' | 'writing' | 'speaking'

/**
 * Shorten a TOEFL draw for a warmup stop.
 *
 * SPEAKING AND WRITING ONLY. Their tasks stand alone, so a prefix is a
 * valid short run. Reading and Listening arrive as whole passage sets —
 * slicing mid-set would show a student a passage and then hide half of
 * its questions, which is a worse defect than a long warmup.
 */
export function capWarmupItems<T>(
  items: T[],
  section: ToeflWarmupSection,
  maxItems?: number,
): T[] {
  if (maxItems == null) return items
  if (section !== 'speaking' && section !== 'writing') return items
  return items.slice(0, maxItems)
}
