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
 * Order here is PICKER order. Two rules govern it, and they pull in
 * opposite directions:
 *
 * 1. Lead with people this app's students look like. The users are
 *    Korean middle/high-schoolers, and the first row is what most of
 *    them will ever scroll — so it opens with young, East-Asian-reading
 *    presets, and the four that read OLDER (grey or white hair, or
 *    facial hair: cedar, onyx, rowan, pearl) sit at the end. A student
 *    picking an avatar should not have to scroll past a bearded adult
 *    and a grandmother to find someone their own age.
 *
 * 2. Never let the order read as a ranking. Sorted light-to-dark, a
 *    grid of presets IS a ranking, whatever was intended. So skin tone
 *    is interleaved WITHIN each group, not just across the list as a
 *    whole — including inside the leading group, which is the one most
 *    at risk of becoming a uniform block. `avatars.test.tsx` asserts
 *    the tones are not monotonic; see the test, not this comment, for
 *    what is actually enforced.
 *
 * Rule 1 is a product call about who is centred. Rule 2 is not
 * negotiable, and it constrains how rule 1 may be satisfied.
 */

export const STUDY_AVATAR_IDS = [
  // Young, East-Asian reading. `mono` (monolid) is the marker this set
  // draws with; linden and clover are here on hair and face rather than
  // eye shape.
  'person-willow',   // blazer + ribbon — a school student, and the clearest "this is you"
  'person-kestrel',
  'person-aster',
  'person-opal',
  'person-linden',
  'person-clover',
  'person-thistle',
  'person-quartz',   // dyed teal — young, and signals the builder can do more than realism
  // Other young presets: the rest of the school-uniform cohort first,
  // then the non-uniform ones.
  'person-flint',
  'person-jasper',
  'person-sorrel',
  'person-mica',
  'person-lumen',
  'person-birch',
  'person-nova',
  'person-dune',
  'person-juniper',
  'person-garnet',
  'person-maple',
  'person-harbor',
  'person-indigo',
  'person-fern',
  'person-ember',
  // Read older. Last on purpose — see rule 1 above. Kept, not cut: a
  // picker with no adults in it tells a student the product has decided
  // what they are allowed to look like.
  'person-cedar',
  'person-onyx',
  'person-rowan',
  'person-pearl',
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
