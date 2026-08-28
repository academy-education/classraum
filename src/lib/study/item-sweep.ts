import { createHash } from 'crypto'

/**
 * The open item sweep — read every item with its key showing.
 *
 * This is the complement to item-review.ts, not a variant of it.
 * item-review.ts hides the key and measures guessability on a sample;
 * this shows the key and asks a person to judge the whole cohort. The
 * two answer different questions and share no state on purpose — see
 * the header of migration 102.
 */

export const VERDICTS = ['keep', 'flag', 'reject'] as const
export type SweepVerdict = (typeof VERDICTS)[number]

export interface SweepItemContent {
  passage?: string | null
  prompt?: string | null
  choices?: string[] | null
  correct_answer?: string | null
}

/**
 * Content hash for a verdict, so a verdict stops counting as evidence
 * once the item it describes is edited.
 *
 * Covers exactly what the reviewer was shown and judged: the passage,
 * the question, the options and which one is marked correct. It
 * deliberately does NOT cover the explanation or the difficulty label —
 * fixing a typo in a rationale should not silently void a sign-off on
 * the item itself.
 *
 * There is no SQL twin of this function. See migration 102 for why.
 */
export function sweepSha(item: SweepItemContent): string {
  return createHash('md5').update([
    item.passage ?? '',
    item.prompt ?? '',
    item.correct_answer ?? '',
    JSON.stringify(item.choices ?? []),
  ].join('~~')).digest('hex')
}

export interface SweepTotals {
  items: number
  reviewed: number
  keep: number
  flag: number
  reject: number
  stale: number
}

/**
 * Progress over a cohort.
 *
 * `reviewed` counts FRESH verdicts only. A stale verdict is reported
 * separately rather than folded into either side, because "signed off,
 * then edited" is neither reviewed nor unreviewed and collapsing it
 * into one of them is how a re-read gets skipped.
 */
export function sweepTotals(
  items: { sha: string }[],
  verdicts: { itemSha: string; verdict: SweepVerdict; itemId: string }[],
  shaById: Map<string, string>,
): SweepTotals {
  let keep = 0, flag = 0, reject = 0, stale = 0
  for (const v of verdicts) {
    if (shaById.get(v.itemId) !== v.itemSha) { stale++; continue }
    if (v.verdict === 'keep') keep++
    else if (v.verdict === 'flag') flag++
    else reject++
  }
  return { items: items.length, reviewed: keep + flag + reject, keep, flag, reject, stale }
}

/**
 * Whether a note is required for this verdict.
 *
 * A bare `reject` is the least useful thing a reviewer can produce: it
 * removes an item and leaves nobody able to tell whether the next
 * author should avoid the topic, the phrasing or the distractor. `keep`
 * needs no explanation — the item speaks for itself.
 */
export function noteRequired(verdict: SweepVerdict): boolean {
  return verdict === 'flag' || verdict === 'reject'
}
