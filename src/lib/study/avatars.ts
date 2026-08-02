/**
 * Canonical study-avatar ids.
 *
 * These strings are WRITTEN TO THE DATABASE (study_user_prefs.avatar_id),
 * so they are a permanent contract:
 *
 *   * NEVER renumber, rename or reuse an id. Retiring an avatar means
 *     dropping it from STUDY_AVATAR_IDS and letting the picker stop
 *     offering it — every student still carrying the retired id then
 *     falls back to their initials avatar, which is the same thing a
 *     student who never picked one sees. No data migration needed.
 *   * Ids are semantic, not positional ('raumi-scholar', not 'avatar-2'),
 *     precisely so nobody is ever tempted to "renumber" them.
 *
 * This module is deliberately DATA ONLY — no JSX — so the API route can
 * validate a submitted id without pulling the SVG registry (and React)
 * into a server bundle. The drawings live in
 * src/app/mobile/study/_shared/avatars.tsx, which is type-checked against
 * this list: adding an id here without drawing it fails `tsc`.
 */

export const STUDY_AVATAR_IDS = [
  'raumi-classic',
  'raumi-scholar',
  'raumi-sunny',
  'raumi-mint',
  'raumi-berry',
  'raumi-violet',
  'raumi-midnight',
  'raumi-cobalt',
  'raumi-coral',
  'raumi-frost',
] as const

export type StudyAvatarId = (typeof STUDY_AVATAR_IDS)[number]

/**
 * Shape the DATABASE enforces (migration 071), deliberately looser than
 * the list above. The column constrains FORMAT only; which ids actually
 * render is the app registry's call.
 *
 * Why not a CHECK constraint listing every id: adding an avatar would
 * then need a migration, and — worse — a stored id that the app has since
 * retired would keep passing a DB check while rendering blank. Format in
 * the DB, membership in the app, initials as the floor: an id the client
 * doesn't recognise degrades to the initials avatar rather than to an
 * empty circle.
 */
export const STUDY_AVATAR_ID_PATTERN = /^[a-z][a-z0-9-]{1,31}$/

/** True only for an id this build can actually draw. */
export function isStudyAvatarId(value: unknown): value is StudyAvatarId {
  return typeof value === 'string' && (STUDY_AVATAR_IDS as readonly string[]).includes(value)
}
