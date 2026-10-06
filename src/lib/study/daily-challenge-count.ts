/**
 * Questions in a daily-challenge session. Single source of truth for
 * the session `config` written by /api/study/daily-challenge/start, the
 * push nudge, and the marketing copy that describes the challenge.
 *
 * It is 3. The push nudge used to say "5 questions · 5 minutes · 50 XP"
 * in both languages, and until 2026-10-07 the marketing pages said "5"
 * too — the count was wrong everywhere it was typed by hand.
 *
 * Lives in its own module (not daily-challenge.ts) because that file
 * imports the service-role client and cannot be bundled into a client
 * component such as the /study marketing page.
 */
export const DAILY_CHALLENGE_QUESTION_COUNT = 3
