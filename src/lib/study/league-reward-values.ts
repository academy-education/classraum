/**
 * League reward PAYOUT TABLES — the numbers, and nothing else.
 *
 * Split out of `league-rewards.ts` (which imports `dbAdmin` and is
 * therefore server-only) so the league page can render the real
 * amounts instead of a hand-copied duplicate. The league page used to
 * carry its own literal list under a "keep in sync with
 * lib/study/league-rewards.ts" comment — i.e. a second source of truth
 * that could silently drift from what the cron actually pays.
 *
 * This module must stay free of imports so it is safe in a client
 * bundle. Grant logic stays in `league-rewards.ts`.
 */

/** Podium (top-3 finish in your cohort) → credits by final rank. */
export const PODIUM_CREDITS: Record<number, number> = { 1: 3, 2: 2, 3: 1 }

/** Any promotion (top-third finisher) → flat credits. Granted on the
 *  'promoted' event itself, so it also pays at Diamond, where the tier
 *  cannot actually go any higher. */
export const PROMOTION_CREDITS = 1

/** First-ever time reaching a tier → one-time milestone credits. The
 *  entry tiers (bronze/silver) pay nothing — a missing key here means
 *  "no milestone for this tier", which the UI renders as unavailable. */
export const MILESTONE_CREDITS: Record<string, number> = {
  gold: 2, sapphire: 2, ruby: 3, emerald: 3,
  amethyst: 4, pearl: 4, obsidian: 5, diamond: 8,
}
