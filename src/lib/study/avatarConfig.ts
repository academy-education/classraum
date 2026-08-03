import { STUDY_AVATAR_IDS, type StudyAvatarId } from '@/lib/study/avatars'

/**
 * The AVATAR PART VOCABULARY and the config shape built from it.
 *
 * ── Why this is a separate module from _shared/avatars.tsx ───────────
 * Everything here is DATA — no JSX, no React. `PUT /api/study/prefs`
 * has to validate a submitted `avatar_config` server-side, and importing
 * the drawing module to do it would pull the whole SVG registry (and
 * React) into a server bundle. Same reason `@/lib/study/avatars` holds
 * the id list. The GEOMETRY (head paths, hair paths, the components)
 * stays in _shared/avatars.tsx and imports these types, so `tsc` fails
 * if a part key is added here and never drawn.
 *
 * ── The config, and its relationship to a preset ─────────────────────
 * Migration 072 stores `avatar_config jsonb` beside 071's `avatar_id`,
 * and the two answer different questions:
 *
 *   avatar_config  what the avatar LOOKS LIKE. The source of truth for
 *                  rendering.
 *   avatar_id      which preset the student STARTED from, or null if
 *                  they built from scratch. Never read by the renderer.
 *
 * A preset is therefore not a separate system from the builder — a
 * preset IS a config (see STUDY_AVATAR_PRESETS below), and choosing one
 * seeds the builder rather than replacing it.
 *
 * ── Degradation, in one place ────────────────────────────────────────
 * `normaliseAvatarConfig` is the ONLY door into rendering. Its two
 * outcomes are deliberately different, and the difference is the whole
 * fallback contract:
 *
 *   null in / not an object in  →  null out  →  the CALL SITE's own
 *       initials avatar. That is what a student who never opened the
 *       builder already sees, and it is what an unreadable value must
 *       degrade to — never a blank disc.
 *   an object in                →  a complete config out. Unknown or
 *       retired part values degrade PER CATEGORY to that category's
 *       default; unknown keys are dropped. A config written by a future
 *       build with parts this one has retired still draws a person.
 */

// ── Colour helpers ───────────────────────────────────────────────────
// Derived tones (a hairline stroke, a garment fold, a faded undercut)
// are computed, not hand-listed, so they cannot drift out of step with
// the base colour they belong to. Pure functions, no runtime state.

export function mix(hex: string, target: string, t: number): string {
  const a = parseInt(hex.slice(1), 16)
  const b = parseInt(target.slice(1), 16)
  const at = (shift: number) => Math.round((((a >> shift) & 255) * (1 - t)) + (((b >> shift) & 255) * t))
  return '#' + [16, 8, 0].map(s => at(s).toString(16).padStart(2, '0')).join('')
}
export const darken = (hex: string, t = 0.22) => mix(hex, '#000000', t)
export const lighten = (hex: string, t = 0.2) => mix(hex, '#FFFFFF', t)

// ── The skin ramp ────────────────────────────────────────────────────
/**
 * EIGHT tones, spaced across the whole range rather than clustered at
 * the light end. The spacing is inspectable on purpose: `base` steps
 * down in mean channel value by roughly 22–31 per rung across
 * 230 → 41, i.e. no two neighbours are a re-tint of each other and no
 * gap is twice another. `avatars.test.tsx` asserts both the count and
 * the monotonic descent, so "add one more fair tone" cannot happen by
 * accident.
 *
 *   base   the face and neck fill
 *   shade  jaw / neck / ear shadow AND the head's hairline stroke — one
 *          step darker than base, never a black outline
 *   line   nose and lid lines; the darkest member of the tone's family,
 *          because a fixed grey reads as dirt on fair skin and vanishes
 *          on deep skin
 *   lip    mouth; the tone's family pushed toward rose, same reason
 */
export const SKIN_RAMP = {
  'tone-1': { base: '#FBE3D3', shade: '#EFCAB4', line: '#B9866B', lip: '#C97D77' },
  'tone-2': { base: '#F1CDB2', shade: '#E0B393', line: '#A97551', lip: '#BF6F64' },
  'tone-3': { base: '#E0AC8B', shade: '#CB9070', line: '#96603F', lip: '#AC5F53' },
  'tone-4': { base: '#CB8F66', shade: '#B4744C', line: '#7C4A2B', lip: '#954C40' },
  'tone-5': { base: '#AE6E45', shade: '#95582F', line: '#63361B', lip: '#7C3D33' },
  'tone-6': { base: '#8F5330', shade: '#76401F', line: '#4C2711', lip: '#66301F' },
  'tone-7': { base: '#6B3A1F', shade: '#552C13', line: '#361A0A', lip: '#4E2416' },
  'tone-8': { base: '#47250F', shade: '#361B09', line: '#1F0F05', lip: '#351A0E' },
} as const
export type SkinTone = keyof typeof SKIN_RAMP

/** Mean channel value per rung — the ramp's spacing, made checkable. */
export function skinLightness(tone: SkinTone): number {
  const n = parseInt(SKIN_RAMP[tone].base.slice(1), 16)
  return (((n >> 16) & 255) + ((n >> 8) & 255) + (n & 255)) / 3
}

// ── Hair colour ──────────────────────────────────────────────────────
/** Eleven colours. `hi` is the sheen stroke; the hairline stroke is
 *  derived with darken() so it always belongs to its own family. */
export const HAIR_COLOURS = {
  black: { base: '#1C1A22', hi: '#3A3746' },
  'soft-black': { base: '#2A2230', hi: '#494056' },
  'dark-brown': { base: '#3D2A1E', hi: '#5D432F' },
  brown: { base: '#5C3D28', hi: '#805740' },
  'light-brown': { base: '#8C6039', hi: '#AE8054' },
  auburn: { base: '#8E3F26', hi: '#B7603C' },
  blonde: { base: '#D3A44C', hi: '#EFCE84' },
  grey: { base: '#8E8F9A', hi: '#B6B7C1' },
  white: { base: '#D8D9E1', hi: '#F3F4F9' },
  lavender: { base: '#8E6FCB', hi: '#B49AE6' },
  teal: { base: '#25837F', hi: '#4FB3AC' },
} as const
export type HairColour = keyof typeof HAIR_COLOURS

// ── Hair ─────────────────────────────────────────────────────────────
export type HairTexture =
  | 'straight' | 'wavy' | 'curly' | 'coily'
  | 'braided' | 'locs' | 'cropped' | 'none' | 'covered'

export type HairStyle =
  | 'straight-long' | 'straight-bob' | 'crop-side' | 'updo-low' | 'ponytail-high'
  | 'fringe-long' | 'wispy-long' | 'low-ponytail' | 'bob-bangs' | 'half-up'
  | 'wavy-mid' | 'waves-short' | 'middle-part-mid' | 'layered-bob'
  | 'curly-shoulder' | 'bun-top'
  | 'coily-afro' | 'coily-puff'
  | 'braids-twin' | 'locs-long'
  | 'buzz' | 'undercut-fade' | 'pixie' | 'two-block' | 'crop-neat'
  | 'bald' | 'hijab'

/**
 * How the hair meets the FACE — the hairline, parting or fringe.
 *
 * This axis exists because texture alone stopped discriminating once the
 * set gained a block of styles aimed at Korean students, whose hair is
 * overwhelmingly straight: a blunt fringe (일자 앞머리), see-through
 * bangs (시스루뱅), a middle part and a swept-back ponytail are four
 * completely different heads that all answer "straight" to the texture
 * question. `avatars.test.tsx` asserts that the DOMINANT texture family
 * spans several fronts, which is the check that "eighteen straight cuts"
 * was really reaching for — a texture histogram never was.
 */
export type HairFront =
  | 'cap' | 'side-part' | 'middle-part' | 'swept-back'
  | 'full-fringe' | 'blunt-fringe' | 'wispy-fringe'
  | 'none' | 'covered'

/**
 * Every style, its texture family, its hairline, and whether the ears
 * show through it.
 *
 * Texture and front live HERE and not on the config, so a config cannot
 * claim a texture its silhouette does not draw. Twenty-seven distinct
 * silhouettes across nine texture families and nine fronts: the set
 * cannot be described as "one head of hair in eleven colours", which is
 * the failure mode CLAUDE.md's "a batch built to one brief develops a
 * cross-item tell" warns about.
 */
export const HAIR_STYLES: Record<HairStyle, { texture: HairTexture; front: HairFront; ears: boolean }> = {
  'straight-long': { texture: 'straight', front: 'middle-part', ears: false },
  'straight-bob': { texture: 'straight', front: 'full-fringe', ears: false },
  'crop-side': { texture: 'straight', front: 'side-part', ears: true },
  'updo-low': { texture: 'straight', front: 'swept-back', ears: true },
  'ponytail-high': { texture: 'straight', front: 'swept-back', ears: true },
  // ── added 2026-08 for Korean middle/high-school students ──────────
  'fringe-long': { texture: 'straight', front: 'blunt-fringe', ears: false },
  'wispy-long': { texture: 'straight', front: 'wispy-fringe', ears: false },
  'low-ponytail': { texture: 'straight', front: 'swept-back', ears: true },
  'bob-bangs': { texture: 'straight', front: 'full-fringe', ears: false },
  'half-up': { texture: 'straight', front: 'middle-part', ears: true },
  'wavy-mid': { texture: 'wavy', front: 'side-part', ears: false },
  'waves-short': { texture: 'wavy', front: 'side-part', ears: true },
  // C컬 단발 / 레이어드컷 — a soft perm, which is what most "straight"
  // Korean school hair actually is once it is past the shoulder.
  'middle-part-mid': { texture: 'wavy', front: 'middle-part', ears: false },
  'layered-bob': { texture: 'wavy', front: 'side-part', ears: true },
  'curly-shoulder': { texture: 'curly', front: 'cap', ears: false },
  'bun-top': { texture: 'curly', front: 'cap', ears: true },
  'coily-afro': { texture: 'coily', front: 'cap', ears: false },
  'coily-puff': { texture: 'coily', front: 'cap', ears: true },
  'braids-twin': { texture: 'braided', front: 'cap', ears: false },
  'locs-long': { texture: 'locs', front: 'cap', ears: false },
  buzz: { texture: 'cropped', front: 'cap', ears: true },
  'undercut-fade': { texture: 'cropped', front: 'swept-back', ears: true },
  pixie: { texture: 'cropped', front: 'cap', ears: true },
  'two-block': { texture: 'cropped', front: 'full-fringe', ears: true },
  'crop-neat': { texture: 'cropped', front: 'full-fringe', ears: true },
  bald: { texture: 'none', front: 'none', ears: true },
  hijab: { texture: 'covered', front: 'covered', ears: false },
}

// ── Face ─────────────────────────────────────────────────────────────
export type FaceShape = 'oval' | 'round' | 'square' | 'heart' | 'long' | 'diamond'
export type EyeShape = 'almond' | 'mono' | 'round' | 'narrow' | 'wide' | 'smiling'
export type BrowShape = 'soft' | 'straight' | 'arched' | 'thick' | 'thin'
export type MouthShape = 'smile' | 'soft-smile' | 'neutral' | 'grin' | 'smirk'
export type FacialHair = 'none' | 'stubble' | 'short-beard' | 'moustache'
export type Accessory =
  | 'none' | 'glasses' | 'round-glasses' | 'slim-glasses'
  | 'earrings' | 'headband' | 'freckles'

/**
 * School-uniform garments, drawn OVER the plain garment block.
 *
 * A separate axis from `top` rather than three more `top` hex values,
 * because a uniform is layered: `top` stays the outer garment (the
 * blazer, or the shirt itself when there is no blazer) and this adds the
 * white collar, the placket and the ribbon or necktie on top.
 */
export type Uniform = 'blazer-ribbon' | 'blazer-tie' | 'shirt-collar'

/** Iris colours. Deliberately small and mostly dark — an eye is ~2px at
 *  leaderboard size, so this axis is decoration, never the difference
 *  between two people. */
export const IRIS = {
  dark: '#2B2028', brown: '#5A3620', hazel: '#8A6134',
  green: '#3F6B4B', blue: '#3F6690', grey: '#5F6C77',
} as const
export type Iris = keyof typeof IRIS

/**
 * The stored avatar.
 *
 * The seven keys migration 072 names — skin, face, eyes, hair,
 * hairColor, accessory, top — are the ones the builder's six tabs are
 * organised around. The rest are the remaining axes the 27 presets
 * already vary on (brow, mouth, iris, facial hair, uniform, backdrop);
 * they are here because WITHOUT THEM A PRESET IS NOT EXPRESSIBLE AS A
 * CONFIG, and "a preset is a config" is the property the whole design
 * rests on. They are reachable in the builder too — under the face,
 * accessory and clothing tabs — because a part nobody can change is a
 * part that makes every built avatar look the same.
 *
 * `top`, `bg`, `tieColor` and `coverColor` are #rrggbb strings rather
 * than registry keys. A colour is always drawable, so a key would buy
 * nothing at the API boundary; what stops "any colour at all" is the
 * builder offering PALETTES (see below), which is a UI decision and can
 * change without a migration.
 */
export interface AvatarConfig {
  skin: SkinTone
  face: FaceShape
  eyes: EyeShape
  iris: Iris
  brow: BrowShape
  mouth: MouthShape
  facialHair: FacialHair
  hair: HairStyle
  hairColor: HairColour
  accessory: Accessory
  /** Outer garment. #rrggbb. */
  top: string
  /** Disc behind the bust. #rrggbb. Chosen to sit clear of BOTH the skin
   *  tone and the hair colour — a pale backdrop under white hair, or a
   *  peach one under tone-1, erases the silhouette. */
  bg: string
  /** School uniform layered over `top`. Omitted for plain clothes. */
  uniform?: Uniform
  /** Ribbon / necktie colour, used by the two blazer uniforms. */
  tieColor?: string
  /** Headscarf fabric. Used by the 'hijab' hair style. */
  coverColor?: string
}

/** A preset: a config, plus the two fields only a preset has. */
export interface StudyAvatarSpec extends AvatarConfig {
  id: StudyAvatarId
  /** i18n key for the accessible name (en.json + ko.json). */
  nameKey: string
}

/**
 * The 27 presets, AS CONFIGS. `satisfies` makes a missing or misspelled
 * key a compile error, so the id list and the configs cannot drift apart
 * silently — and because a preset is exactly `AvatarConfig + id +
 * nameKey`, adding a part category to AvatarConfig forces every preset
 * to answer for it here.
 */
export const STUDY_AVATARS = {
  'person-aster': {
    id: 'person-aster', skin: 'tone-2', face: 'oval',
    hair: 'straight-long', hairColor: 'black',
    eyes: 'mono', iris: 'dark', brow: 'straight', mouth: 'soft-smile',
    facialHair: 'none', accessory: 'none',
    top: '#5B7FD4', bg: '#EDE7F6', nameKey: 'study.prefs.avatarName.aster',
  },
  'person-ember': {
    id: 'person-ember', skin: 'tone-7', face: 'round',
    hair: 'coily-afro', hairColor: 'soft-black',
    eyes: 'wide', iris: 'brown', brow: 'soft', mouth: 'grin',
    facialHair: 'none', accessory: 'none',
    top: '#E9B04A', bg: '#DFF0F4', nameKey: 'study.prefs.avatarName.ember',
  },
  'person-quartz': {
    id: 'person-quartz', skin: 'tone-3', face: 'round',
    hair: 'straight-bob', hairColor: 'teal',
    eyes: 'mono', iris: 'dark', brow: 'straight', mouth: 'smile',
    facialHair: 'none', accessory: 'none',
    top: '#E2A03C', bg: '#F0EAF8', nameKey: 'study.prefs.avatarName.quartz',
  },
  'person-onyx': {
    id: 'person-onyx', skin: 'tone-5', face: 'long',
    hair: 'bald', hairColor: 'soft-black',
    eyes: 'almond', iris: 'dark', brow: 'thick', mouth: 'neutral',
    facialHair: 'short-beard', accessory: 'none',
    top: '#4C5A73', bg: '#F3EFE2', nameKey: 'study.prefs.avatarName.onyx',
  },
  'person-birch': {
    id: 'person-birch', skin: 'tone-1', face: 'round',
    hair: 'wavy-mid', hairColor: 'light-brown',
    eyes: 'round', iris: 'green', brow: 'soft', mouth: 'smile',
    facialHair: 'none', accessory: 'freckles',
    top: '#E0764F', bg: '#C4DCCB', nameKey: 'study.prefs.avatarName.birch',
  },
  'person-garnet': {
    id: 'person-garnet', skin: 'tone-8', face: 'long',
    hair: 'locs-long', hairColor: 'black',
    eyes: 'almond', iris: 'brown', brow: 'straight', mouth: 'soft-smile',
    facialHair: 'none', accessory: 'none',
    top: '#C9603F', bg: '#E7EDF6', nameKey: 'study.prefs.avatarName.garnet',
  },
  'person-maple': {
    id: 'person-maple', skin: 'tone-4', face: 'heart',
    hair: 'ponytail-high', hairColor: 'auburn',
    eyes: 'almond', iris: 'hazel', brow: 'arched', mouth: 'smile',
    facialHair: 'none', accessory: 'headband',
    top: '#2E8F86', bg: '#F6E9E2', nameKey: 'study.prefs.avatarName.maple',
  },
  'person-cedar': {
    id: 'person-cedar', skin: 'tone-6', face: 'square',
    hair: 'buzz', hairColor: 'black',
    eyes: 'almond', iris: 'dark', brow: 'thick', mouth: 'neutral',
    facialHair: 'stubble', accessory: 'none',
    top: '#3F7A63', bg: '#F2E9DC', nameKey: 'study.prefs.avatarName.cedar',
  },
  'person-harbor': {
    id: 'person-harbor', skin: 'tone-2', face: 'long',
    hair: 'crop-side', hairColor: 'blonde',
    eyes: 'narrow', iris: 'blue', brow: 'thin', mouth: 'smirk',
    facialHair: 'none', accessory: 'glasses',
    top: '#4A6E96', bg: '#F7E6EC', nameKey: 'study.prefs.avatarName.harbor',
  },
  'person-nova': {
    id: 'person-nova', skin: 'tone-7', face: 'oval',
    hair: 'coily-puff', hairColor: 'black',
    eyes: 'wide', iris: 'dark', brow: 'thick', mouth: 'soft-smile',
    facialHair: 'none', accessory: 'none',
    top: '#D9564F', bg: '#E4EDFA', nameKey: 'study.prefs.avatarName.nova',
  },
  'person-dune': {
    id: 'person-dune', skin: 'tone-3', face: 'heart',
    hair: 'bun-top', hairColor: 'dark-brown',
    eyes: 'almond', iris: 'brown', brow: 'arched', mouth: 'smile',
    facialHair: 'none', accessory: 'earrings',
    top: '#D2688F', bg: '#EAF1E6', nameKey: 'study.prefs.avatarName.dune',
  },
  'person-juniper': {
    id: 'person-juniper', skin: 'tone-5', face: 'long',
    hair: 'hijab', hairColor: 'dark-brown', coverColor: '#6C7FC4',
    eyes: 'almond', iris: 'dark', brow: 'soft', mouth: 'smile',
    facialHair: 'none', accessory: 'none',
    top: '#AEB6D2', bg: '#FAEDDC', nameKey: 'study.prefs.avatarName.juniper',
  },
  'person-indigo': {
    id: 'person-indigo', skin: 'tone-1', face: 'diamond',
    hair: 'pixie', hairColor: 'lavender',
    eyes: 'round', iris: 'grey', brow: 'thin', mouth: 'smirk',
    facialHair: 'none', accessory: 'none',
    top: '#3A3F52', bg: '#C8D6E8', nameKey: 'study.prefs.avatarName.indigo',
  },
  'person-rowan': {
    id: 'person-rowan', skin: 'tone-8', face: 'diamond',
    hair: 'waves-short', hairColor: 'grey',
    eyes: 'almond', iris: 'dark', brow: 'thick', mouth: 'soft-smile',
    facialHair: 'moustache', accessory: 'glasses',
    top: '#3E8C6A', bg: '#F7EEDD', nameKey: 'study.prefs.avatarName.rowan',
  },
  'person-fern': {
    id: 'person-fern', skin: 'tone-4', face: 'oval',
    hair: 'curly-shoulder', hairColor: 'brown',
    eyes: 'almond', iris: 'brown', brow: 'soft', mouth: 'soft-smile',
    facialHair: 'none', accessory: 'round-glasses',
    top: '#6C63C4', bg: '#E4F1E9', nameKey: 'study.prefs.avatarName.fern',
  },
  'person-lumen': {
    id: 'person-lumen', skin: 'tone-6', face: 'heart',
    hair: 'braids-twin', hairColor: 'dark-brown',
    eyes: 'smiling', iris: 'brown', brow: 'soft', mouth: 'grin',
    facialHair: 'none', accessory: 'none',
    top: '#7A5AC0', bg: '#EAF3E4', nameKey: 'study.prefs.avatarName.lumen',
  },
  'person-pearl': {
    id: 'person-pearl', skin: 'tone-2', face: 'oval',
    hair: 'updo-low', hairColor: 'white',
    eyes: 'narrow', iris: 'grey', brow: 'thin', mouth: 'soft-smile',
    facialHair: 'none', accessory: 'none',
    top: '#7C89A6', bg: '#AEBDD0', nameKey: 'study.prefs.avatarName.pearl',
  },
  'person-kestrel': {
    id: 'person-kestrel', skin: 'tone-3', face: 'square',
    hair: 'undercut-fade', hairColor: 'soft-black',
    eyes: 'mono', iris: 'dark', brow: 'straight', mouth: 'smirk',
    facialHair: 'none', accessory: 'none',
    top: '#2F6E8E', bg: '#F8EFDE', nameKey: 'study.prefs.avatarName.kestrel',
  },

  // ── Added 2026-08 ──────────────────────────────────────────────────
  // Nine presets aimed at the primary audience: Korean middle- and
  // high-schoolers. They are a block of REALISM, not a block of one
  // face: the hair is predominantly black or dark brown with two dyed
  // browns (which is what a classroom actually looks like), but the
  // skin runs across six of the eight rungs and every one of the nine
  // has its own face shape, eye shape, brow, mouth and hairline.
  //
  // The ids stay botanical/mineral like the first eighteen — nothing
  // here encodes a nationality, and none of these presets is "the
  // Korean one". A student anywhere can pick a 단발 and a blazer.
  'person-willow': {
    id: 'person-willow', skin: 'tone-2', face: 'oval',
    hair: 'fringe-long', hairColor: 'black',
    eyes: 'mono', iris: 'dark', brow: 'straight', mouth: 'soft-smile',
    facialHair: 'none', accessory: 'none',
    uniform: 'blazer-ribbon', tieColor: '#B0384A',
    top: '#2E3C63', bg: '#DDE9F4', nameKey: 'study.prefs.avatarName.willow',
  },
  'person-flint': {
    id: 'person-flint', skin: 'tone-6', face: 'square',
    hair: 'two-block', hairColor: 'black',
    eyes: 'narrow', iris: 'dark', brow: 'thick', mouth: 'smirk',
    facialHair: 'none', accessory: 'slim-glasses',
    uniform: 'blazer-tie', tieColor: '#2F4B7C',
    top: '#2B2B34', bg: '#E7EFE4', nameKey: 'study.prefs.avatarName.flint',
  },
  'person-linden': {
    id: 'person-linden', skin: 'tone-1', face: 'heart',
    hair: 'wispy-long', hairColor: 'black',
    eyes: 'almond', iris: 'brown', brow: 'soft', mouth: 'smile',
    facialHair: 'none', accessory: 'slim-glasses',
    top: '#C2557A', bg: '#BFD6E4', nameKey: 'study.prefs.avatarName.linden',
  },
  'person-sorrel': {
    id: 'person-sorrel', skin: 'tone-6', face: 'round',
    hair: 'low-ponytail', hairColor: 'soft-black',
    eyes: 'almond', iris: 'brown', brow: 'soft', mouth: 'soft-smile',
    facialHair: 'none', accessory: 'none',
    top: '#3F7F9E', bg: '#F6ECDC', nameKey: 'study.prefs.avatarName.sorrel',
  },
  'person-jasper': {
    id: 'person-jasper', skin: 'tone-5', face: 'square',
    hair: 'crop-neat', hairColor: 'soft-black',
    eyes: 'almond', iris: 'dark', brow: 'straight', mouth: 'soft-smile',
    facialHair: 'none', accessory: 'glasses',
    uniform: 'shirt-collar',
    top: '#DCE5F2', bg: '#96AEC9', nameKey: 'study.prefs.avatarName.jasper',
  },
  'person-clover': {
    id: 'person-clover', skin: 'tone-4', face: 'round',
    hair: 'bob-bangs', hairColor: 'black',
    eyes: 'round', iris: 'dark', brow: 'thin', mouth: 'smile',
    facialHair: 'none', accessory: 'round-glasses',
    top: '#E07A4F', bg: '#DCE9DA', nameKey: 'study.prefs.avatarName.clover',
  },
  'person-thistle': {
    id: 'person-thistle', skin: 'tone-2', face: 'heart',
    hair: 'half-up', hairColor: 'light-brown',
    eyes: 'mono', iris: 'brown', brow: 'arched', mouth: 'soft-smile',
    facialHair: 'none', accessory: 'none',
    top: '#58A08C', bg: '#F5EFE1', nameKey: 'study.prefs.avatarName.thistle',
  },
  'person-mica': {
    id: 'person-mica', skin: 'tone-3', face: 'long',
    hair: 'middle-part-mid', hairColor: 'brown',
    eyes: 'smiling', iris: 'dark', brow: 'arched', mouth: 'grin',
    facialHair: 'none', accessory: 'none',
    top: '#C86A8E', bg: '#E1EDF1', nameKey: 'study.prefs.avatarName.mica',
  },
  'person-opal': {
    id: 'person-opal', skin: 'tone-1', face: 'diamond',
    hair: 'layered-bob', hairColor: 'dark-brown',
    eyes: 'mono', iris: 'brown', brow: 'straight', mouth: 'smile',
    facialHair: 'none', accessory: 'none',
    top: '#6E76B8', bg: '#BEDACC', nameKey: 'study.prefs.avatarName.opal',
  },
} satisfies Record<StudyAvatarId, StudyAvatarSpec>

/** Registry order = picker order. Derived from the canonical id list so
 *  the two can never disagree about membership. */
export const STUDY_AVATAR_LIST: StudyAvatarSpec[] = STUDY_AVATAR_IDS.map(id => STUDY_AVATARS[id])

/** Spec for an id, or null for null / unknown / retired ids. */
export function getStudyAvatar(id: string | null | undefined): StudyAvatarSpec | null {
  return (id !== null && id !== undefined && id in STUDY_AVATARS)
    ? STUDY_AVATARS[id as StudyAvatarId]
    : null
}

/** The config half of a preset — what the builder is seeded with. */
export function presetConfig(spec: StudyAvatarSpec): AvatarConfig {
  const { id: _id, nameKey: _nameKey, ...config } = spec
  void _id; void _nameKey
  return config
}

// ── Part vocabularies, as ordered lists ──────────────────────────────
// One list per builder category. Order here is the order the swatches
// appear in, so it is a design decision and not an accident of object
// literal order.

export const SKIN_TONES = Object.keys(SKIN_RAMP) as SkinTone[]
export const HAIR_COLOR_KEYS = Object.keys(HAIR_COLOURS) as HairColour[]
export const HAIR_STYLE_KEYS = Object.keys(HAIR_STYLES) as HairStyle[]
export const IRIS_KEYS = Object.keys(IRIS) as Iris[]
export const FACE_SHAPE_KEYS: FaceShape[] = ['oval', 'round', 'square', 'heart', 'long', 'diamond']
export const EYE_SHAPE_KEYS: EyeShape[] = ['almond', 'mono', 'round', 'narrow', 'wide', 'smiling']
export const BROW_SHAPE_KEYS: BrowShape[] = ['soft', 'straight', 'arched', 'thick', 'thin']
export const MOUTH_SHAPE_KEYS: MouthShape[] = ['smile', 'soft-smile', 'neutral', 'grin', 'smirk']
export const FACIAL_HAIR_KEYS: FacialHair[] = ['none', 'stubble', 'short-beard', 'moustache']
export const ACCESSORY_KEYS: Accessory[] = [
  'none', 'glasses', 'round-glasses', 'slim-glasses', 'earrings', 'headband', 'freckles',
]
/** 'none' is not a Uniform — it is the absence of the optional key. The
 *  builder needs a fourth tile for it, hence this shape. */
export const UNIFORM_KEYS: Array<Uniform | 'none'> = [
  'none', 'blazer-ribbon', 'blazer-tie', 'shirt-collar',
]

const HEX = /^#[0-9A-Fa-f]{6}$/

/** Unique values of one colour field across the presets, in registry
 *  order. Deriving the palettes rather than re-typing them means every
 *  colour a preset uses is offered by the builder — so seeding from a
 *  preset always leaves a swatch selected, and hand-typed hex can never
 *  drift from the art. */
function paletteFrom(pick: (s: StudyAvatarSpec) => string | undefined, extra: string[] = []): string[] {
  const out: string[] = []
  for (const value of [...STUDY_AVATAR_LIST.map(pick), ...extra]) {
    if (value && HEX.test(value) && !out.includes(value)) out.push(value)
  }
  return out
}

/** Garment colours offered by the clothing tab. */
export const GARMENT_PALETTE = paletteFrom(s => s.top, ['#2F3A46', '#8A8F99', '#F7F9FD'])
/** Backdrop discs offered by the clothing tab. */
export const BACKDROP_PALETTE = paletteFrom(s => s.bg, ['#E6E8EC', '#D6C7E8', '#F1DCDC'])
/** Ribbon / necktie colours. Small: it is a 4px shape at list size. */
export const TIE_PALETTE = paletteFrom(s => s.tieColor, ['#1F6F5C', '#7A3E86', '#C8892C', '#4A4A55'])
/** Headscarf fabrics. */
export const COVER_PALETTE = paletteFrom(s => s.coverColor, ['#A8577E', '#3F7A63', '#4C5A73', '#C0603F'])

/**
 * What an EMPTY config draws.
 *
 * Deliberately a plain, unremarkable person rather than a copy of any
 * preset: this is what every unknown part degrades to, and what a
 * `{}` config renders. Note the DB column has no DEFAULT and must never
 * get one — a student who has never opened the builder stores NULL and
 * keeps their initials avatar. This constant is the floor INSIDE the
 * builder, not a default identity handed to anybody.
 */
export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  skin: 'tone-3',
  face: 'oval',
  eyes: 'almond',
  iris: 'dark',
  brow: 'soft',
  mouth: 'soft-smile',
  facialHair: 'none',
  hair: 'crop-neat',
  hairColor: 'black',
  accessory: 'none',
  top: '#5B7FD4',
  bg: '#E7EDF6',
}

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return (typeof value === 'string' && (allowed as readonly string[]).includes(value))
    ? value as T
    : fallback
}

function pickHex(value: unknown, fallback: string): string {
  return (typeof value === 'string' && HEX.test(value)) ? value : fallback
}

/**
 * The ONE door into rendering a stored config.
 *
 *   null / undefined / a non-object / an array  →  null
 *       …which every call site turns into ITS OWN initials avatar.
 *   any object                                  →  a complete config
 *       …with unknown, retired or malformed parts degraded per category
 *       and unknown keys dropped.
 *
 * The asymmetry is the point and is easy to get backwards. "Absent"
 * must reach the initials fallback, because that is what a student who
 * never opened the builder sees and it must not change under them.
 * "Present but partly unreadable" must still draw a person, because the
 * alternative — a student's avatar vanishing on the day a part is
 * retired — is the failure this whole layering exists to prevent.
 */
export function normaliseAvatarConfig(raw: unknown): AvatarConfig | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const r = raw as Record<string, unknown>
  const d = DEFAULT_AVATAR_CONFIG

  const config: AvatarConfig = {
    skin: pick(r.skin, SKIN_TONES, d.skin),
    face: pick(r.face, FACE_SHAPE_KEYS, d.face),
    eyes: pick(r.eyes, EYE_SHAPE_KEYS, d.eyes),
    iris: pick(r.iris, IRIS_KEYS, d.iris),
    brow: pick(r.brow, BROW_SHAPE_KEYS, d.brow),
    mouth: pick(r.mouth, MOUTH_SHAPE_KEYS, d.mouth),
    facialHair: pick(r.facialHair, FACIAL_HAIR_KEYS, d.facialHair),
    hair: pick(r.hair, HAIR_STYLE_KEYS, d.hair),
    hairColor: pick(r.hairColor, HAIR_COLOR_KEYS, d.hairColor),
    accessory: pick(r.accessory, ACCESSORY_KEYS, d.accessory),
    top: pickHex(r.top, d.top),
    bg: pickHex(r.bg, d.bg),
  }

  // Optional keys are only WRITTEN when they are meaningful, so a
  // round-trip through here does not grow the stored object — and so a
  // preset without a uniform stays byte-identical to one.
  if (r.uniform === 'blazer-ribbon' || r.uniform === 'blazer-tie' || r.uniform === 'shirt-collar') {
    config.uniform = r.uniform
  }
  if (typeof r.tieColor === 'string' && HEX.test(r.tieColor)) config.tieColor = r.tieColor
  if (typeof r.coverColor === 'string' && HEX.test(r.coverColor)) config.coverColor = r.coverColor

  return config
}

/**
 * True for anything `normaliseAvatarConfig` can turn into a drawable
 * config. Used by PUT /api/study/prefs to reject the shapes the DB's
 * own CHECK cannot see (an array is a valid jsonb object to Postgres in
 * neither case, but a scalar is, and `"hello"` would store fine and then
 * render as nothing).
 */
export function isAvatarConfigLike(value: unknown): boolean {
  return normaliseAvatarConfig(value) !== null
}

// ── Keeping the avatar visible against its own disc ───────────────────
/**
 * The previous avatar set shipped a colourway whose bust matched its
 * backdrop and vanished, and `avatars.test.tsx` pins floors for the 27
 * presets so it cannot happen again there. A BUILDER re-opens the hole
 * from the other side: a student can pick a pale backdrop, then white
 * hair, and erase themselves — and the presets' floors say nothing
 * about combinations no preset uses.
 *
 * So the same floors are enforced live. Deliberately NOT inside the
 * renderer: a check that silently rewrote a stored config at draw time
 * would make the same config render two different ways depending on
 * which build read it, and would break the preset byte-identity the
 * refactor rests on. It is a BUILDER rule — applied when the student
 * changes a part, visible to them as a disabled backdrop swatch.
 */
const CONTRAST_FLOORS = { skin: 1.14, hair: 1.3, garment: 1.2 } as const

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
}

function contrast(a: string, b: string): number {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/** Does this backdrop keep the face, the hair AND the garment readable? */
export function backdropIsVisible(config: AvatarConfig, bg: string): boolean {
  return contrast(bg, SKIN_RAMP[config.skin].base) > CONTRAST_FLOORS.skin
    && contrast(bg, HAIR_COLOURS[config.hairColor].base) > CONTRAST_FLOORS.hair
    && contrast(bg, config.top) > CONTRAST_FLOORS.garment
}

/**
 * The config unchanged when its backdrop still works, otherwise the same
 * config on the palette backdrop with the most headroom. Never returns a
 * config whose subject has vanished, and never picks a backdrop the
 * builder would then show as disabled.
 */
export function ensureVisibleBackdrop(config: AvatarConfig): AvatarConfig {
  if (backdropIsVisible(config, config.bg)) return config
  let best = config.bg
  let bestScore = -Infinity
  for (const bg of BACKDROP_PALETTE) {
    // Score by the WEAKEST of the three ratios: a backdrop that is
    // brilliant against the hair and invisible against the skin is not a
    // good backdrop.
    const score = Math.min(
      contrast(bg, SKIN_RAMP[config.skin].base) / CONTRAST_FLOORS.skin,
      contrast(bg, HAIR_COLOURS[config.hairColor].base) / CONTRAST_FLOORS.hair,
      contrast(bg, config.top) / CONTRAST_FLOORS.garment,
    )
    if (score > bestScore) { bestScore = score; best = bg }
  }
  return { ...config, bg: best }
}

/**
 * WCAG contrast ratio between two #rrggbb colours. Exported because the
 * DRAWING module needs it too: a clipper-faded undercut is computed from
 * the hair and the skin, and on a pale hair colour over pale skin the
 * result lands ON the skin and the short sides vanish.
 */
export function contrastRatio(a: string, b: string): number {
  return contrast(a, b)
}

// ── Randomiser ───────────────────────────────────────────────────────

/**
 * Backdrops and garments the randomiser draws from — the same values the
 * 27 presets use, deduplicated. Inventing fresh hex here would mean
 * inventing a palette nobody art-directed; reusing these means every
 * random avatar is built from colours that already shipped.
 */
const RANDOM_BG = [
  '#EDE7F6', '#DFF0F4', '#F0EAF8', '#F3EFE2', '#C4DCCB', '#E7EDF6', '#F6E9E2',
  '#F2E9DC', '#F7E6EC', '#E4EDFA', '#EAF1E6', '#FAEDDC', '#C8D6E8', '#F7EEDD',
  '#E4F1E9', '#EAF3E4', '#AEBDD0', '#F8EFDE', '#DDE9F4', '#E7EFE4', '#BFD6E4',
  '#F6ECDC', '#96AEC9', '#DCE9DA', '#F5EFE1', '#E1EDF1', '#BEDACC',
] as const
const RANDOM_TOP = [
  '#5B7FD4', '#E9B04A', '#E2A03C', '#4C5A73', '#E0764F', '#C9603F', '#2E8F86',
  '#3F7A63', '#4A6E96', '#D9564F', '#D2688F', '#AEB6D2', '#3A3F52', '#3E8C6A',
  '#6C63C4', '#7A5AC0', '#7C89A6', '#2F6E8E', '#2E3C63', '#2B2B34', '#C2557A',
  '#3F7F9E', '#DCE5F2', '#E07A4F', '#58A08C', '#C86A8E', '#6E76B8',
] as const
const RANDOM_TIE = ['#B0384A', '#2F4B7C'] as const

/**
 * The two floors a random avatar has to clear, and why they exist.
 *
 * These are not invented for the randomiser — they are the thresholds
 * `avatars.test.tsx` already holds the 27 hand-authored presets to. A
 * randomiser is just a preset author who never gets tired, so it is held
 * to the same bar; otherwise "pick a random one" becomes the one path in
 * the product that can produce an avatar a human reviewer would have
 * rejected.
 */
const MIN_BG_VS_SKIN = 1.14   // a backdrop at skin luminance erases the silhouette
const MIN_HAIR_VS_SKIN = 1.3  // hair at skin luminance erases the hairline

/** A random avatar that would survive the checks the presets survive. */
export function randomAvatarConfig(rand: () => number = Math.random): AvatarConfig {
  const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length) % xs.length]

  const skin: SkinTone = pick(SKIN_TONES)
  const skinBase = SKIN_RAMP[skin].base
  const hair = pick(HAIR_STYLE_KEYS)

  /*
   * REJECTION SAMPLING, not "pick and hope".
   *
   * Both loops are bounded and both have a deterministic fallback,
   * because an unbounded retry on a constraint that happens to be
   * unsatisfiable is a frozen tab, and a fallback that is itself random
   * would reintroduce exactly the failure being guarded. The fallbacks
   * are the extreme ends of each ramp, which clear the thresholds
   * against every tone by construction.
   */
  let hairColor = pick(HAIR_COLOR_KEYS)
  if (HAIR_STYLES[hair].texture !== 'none' && HAIR_STYLES[hair].texture !== 'covered') {
    let tries = 0
    while (contrastRatio(skinBase, HAIR_COLOURS[hairColor].base) < MIN_HAIR_VS_SKIN && tries++ < 24) {
      hairColor = pick(HAIR_COLOR_KEYS)
    }
    if (contrastRatio(skinBase, HAIR_COLOURS[hairColor].base) < MIN_HAIR_VS_SKIN) {
      hairColor = skinLightness(skin) > 50 ? 'black' : 'white'
    }
  }

  let bg = pick(RANDOM_BG)
  let bgTries = 0
  while (contrastRatio(bg, skinBase) < MIN_BG_VS_SKIN && bgTries++ < 24) bg = pick(RANDOM_BG)
  if (contrastRatio(bg, skinBase) < MIN_BG_VS_SKIN) {
    bg = skinLightness(skin) > 50 ? '#96AEC9' : '#F3EFE2'
  }

  // A uniform is the common case for this audience, not an exotic one,
  // so it comes up roughly a third of the time rather than never.
  const uniform = rand() < 0.34 ? pick(['blazer-ribbon', 'blazer-tie', 'shirt-collar'] as const) : undefined

  return {
    skin,
    face: pick(FACE_SHAPE_KEYS),
    eyes: pick(EYE_SHAPE_KEYS),
    iris: pick(IRIS_KEYS),
    brow: pick(BROW_SHAPE_KEYS),
    mouth: pick(MOUTH_SHAPE_KEYS),
    // Facial hair on a middle-schooler is a joke that stops being funny
    // on the second roll, so it stays rare rather than 1-in-4.
    facialHair: rand() < 0.12 ? pick(FACIAL_HAIR_KEYS.filter(f => f !== 'none')) : 'none',
    hair,
    hairColor,
    accessory: pick(ACCESSORY_KEYS),
    top: pick(RANDOM_TOP),
    bg,
    ...(uniform ? { uniform, tieColor: pick(RANDOM_TIE) } : {}),
  }
}
