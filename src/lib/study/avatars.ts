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
 *   * Ids are semantic, not positional ('person-aster', not 'avatar-2'),
 *     precisely so nobody is ever tempted to "renumber" them.
 *   * Ids are also DELIBERATELY FEATURE-NEUTRAL. The presets are people
 *     with a wide range of skin tones, hair textures and features, and an
 *     id is a permanent, greppable, user-visible-in-the-network-tab
 *     string. Naming one after a skin tone, an ethnicity or a gender
 *     would put that label in the database against a student's row
 *     forever. The words below are plants and minerals; they carry no
 *     claim about the person drawn, and the drawing can be re-styled
 *     without the id becoming a lie.
 *
 * The ten 'raumi-*' robot ids that lived here until 2026-08 were removed
 * outright rather than aliased: migration 071 (which adds the column) is
 * still unapplied, so no student has ever stored one. Anything that did
 * somehow carry one now takes the unknown-id path and renders initials.
 *
 * This module is deliberately DATA ONLY — no JSX — so the API route can
 * validate a submitted id without pulling the SVG registry (and React)
 * into a server bundle. The drawings live in
 * src/app/mobile/study/_shared/avatars.tsx, which is type-checked against
 * this list: adding an id here without drawing it fails `tsc`.
 *
 * Order here is PICKER order, and it is interleaved by skin tone on
 * purpose — sorted light-to-dark, a grid of presets reads as a ranking.
 */

export const STUDY_AVATAR_IDS = [
  'person-aster',
  'person-ember',
  'person-quartz',
  'person-onyx',
  'person-birch',
  'person-garnet',
  'person-maple',
  'person-cedar',
  'person-harbor',
  'person-nova',
  'person-dune',
  'person-juniper',
  'person-indigo',
  'person-rowan',
  'person-fern',
  'person-lumen',
  'person-pearl',
  'person-kestrel',
  // Added 2026-08. Nine presets drawn for Korean middle/high-school
  // students (see the block comment in _shared/avatars.tsx). Interleaved
  // by skin tone for the same reason the first eighteen are.
  'person-willow',
  'person-flint',
  'person-linden',
  'person-sorrel',
  'person-jasper',
  'person-clover',
  'person-thistle',
  'person-mica',
  'person-opal',
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
