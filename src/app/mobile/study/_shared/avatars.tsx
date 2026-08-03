import type { ReactNode } from 'react'
import { STUDY_AVATAR_IDS, isStudyAvatarId, type StudyAvatarId } from '@/lib/study/avatars'

/**
 * The pickable study avatars: PRESET PEOPLE, head-and-shoulders.
 *
 * These replaced a set of ten Raumi-robot colourways in 2026-08. Raumi is
 * still the mascot (PathMascot.tsx) — he is the app talking to you, not
 * you. An avatar is the student, and a student picking a face wants to
 * find one that looks like them.
 *
 * ── Style ────────────────────────────────────────────────────────────
 * Same "soft-flat" discipline as the mascot so the two sit together:
 * flat colour blocking, a hairline tonal ring one step darker than the
 * shape it edges (never a cartoon outline), no gradients-as-shading.
 * There are NO <defs> at all — no filters, no clipPaths, no gradients —
 * hence no per-instance ids to collide when a leaderboard renders
 * twenty of these on one screen. The circular crop is an inline
 * border-radius on the wrapper.
 *
 * ── The crop is the hard constraint ──────────────────────────────────
 * The bust deliberately overruns the 64×64 box so it fills the disc,
 * which means the VIEWBOX IS NOT THE SAFE AREA: everything that must be
 * seen sits inside a radius-31 circle about (32,32). The previous set
 * shipped three defects that only rendering caught — an antenna ball and
 * a beanie pom sliced off at the top, and one colourway with no
 * silhouette against its own backdrop. Hence, here: every hair mass and
 * every accessory is placed against the radius, and every shape that
 * defines the silhouette (head, hair, garment) carries its own hairline
 * stroke so it reads even if a future backdrop lands close to its fill.
 *
 * ── Range is the point ───────────────────────────────────────────────
 * Eighteen presets. The axes are independent and are all load-bearing:
 * SKIN_RAMP (8 documented tones, evenly spaced in lightness), hair
 * TEXTURE (9 families — not one silhouette recoloured), hair COLOUR (11,
 * including grey, white and two fashion colours), FACE_SHAPES (6) and
 * separate eye / brow / mouth / facial-hair sets. A preset is not "a
 * face with a hat on": change the skin tone alone and you get a
 * different person, change the hair alone and you get a different
 * person. Accessories appear on 6 of 18 and are never the only thing
 * separating two presets.
 *
 * The primary audience is Korean middle- and high-schoolers plus
 * international SAT/TOEFL students, so monolid and almond eye shapes with
 * straight black hair are well represented — across four different skin
 * tones and five different silhouettes, so that representation does not
 * collapse into one repeated face either.
 */

// ── Colour helpers ───────────────────────────────────────────────────
// Derived tones (a hairline stroke, a garment fold, a faded undercut)
// are computed, not hand-listed, so they cannot drift out of step with
// the base colour they belong to. Pure functions, no runtime state.

function mix(hex: string, target: string, t: number): string {
  const a = parseInt(hex.slice(1), 16)
  const b = parseInt(target.slice(1), 16)
  const at = (shift: number) => Math.round((((a >> shift) & 255) * (1 - t)) + (((b >> shift) & 255) * t))
  return '#' + [16, 8, 0].map(s => at(s).toString(16).padStart(2, '0')).join('')
}
const darken = (hex: string, t = 0.22) => mix(hex, '#000000', t)
const lighten = (hex: string, t = 0.2) => mix(hex, '#FFFFFF', t)

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
 * Texture and front live HERE and not on the preset, so a preset cannot
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

/**
 * Six head silhouettes. `hairScale` squeezes the (shared) hair geometry
 * horizontally about x=32 so a wide crop does not float off a narrow
 * face; `ear` is the half-width at ear height. Presentation variety has
 * to come from the FACE as well as the hair, or the set reads as
 * gendered pairs of one face.
 */
const FACE_SHAPES: Record<FaceShape, { path: string; hairScale: number; ear: number }> = {
  oval: {
    path: 'M 32 10 C 40.5 10 46.2 16.5 46.2 25.5 C 46.2 36.5 40 45 32 45 C 24 45 17.8 36.5 17.8 25.5 C 17.8 16.5 23.5 10 32 10 Z',
    hairScale: 1, ear: 14,
  },
  round: {
    path: 'M 32 10.2 C 41 10.2 47.2 16.6 47.2 26 C 47.2 36.4 40.6 44.4 32 44.4 C 23.4 44.4 16.8 36.4 16.8 26 C 16.8 16.6 23 10.2 32 10.2 Z',
    hairScale: 1.05, ear: 15,
  },
  square: {
    path: 'M 32 9.8 C 41.6 9.8 46.6 14.6 46.6 22.4 L 46.6 34 C 46.6 40.8 41.4 45 32 45 C 22.6 45 17.4 40.8 17.4 34 L 17.4 22.4 C 17.4 14.6 22.4 9.8 32 9.8 Z',
    hairScale: 1.04, ear: 14.6,
  },
  heart: {
    path: 'M 32 9.6 C 41.6 9.6 46.8 15.2 46.8 23.8 C 46.8 34.6 39.4 45.6 32 45.6 C 24.6 45.6 17.2 34.6 17.2 23.8 C 17.2 15.2 22.4 9.6 32 9.6 Z',
    hairScale: 1.02, ear: 14.4,
  },
  long: {
    path: 'M 32 9 C 39.6 9 44.8 15.2 44.8 24.4 C 44.8 36.6 39.2 46 32 46 C 24.8 46 19.2 36.6 19.2 24.4 C 19.2 15.2 24.4 9 32 9 Z',
    hairScale: 0.93, ear: 12.8,
  },
  diamond: {
    path: 'M 32 10.4 C 38.6 10.4 43 14.4 44.8 21.6 C 46.6 28.4 41.2 45.2 32 45.2 C 22.8 45.2 17.4 28.4 19.2 21.6 C 21 14.4 25.4 10.4 32 10.4 Z',
    hairScale: 0.99, ear: 13.4,
  },
}

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
 * A separate axis from `clothes` rather than three more `clothes` hex
 * values, because a uniform is layered: `clothes` stays the outer
 * garment (the blazer, or the shirt itself when there is no blazer) and
 * this adds the white collar, the placket and the ribbon or necktie on
 * top. Kept optional so the other twenty-four presets are untouched.
 */
export type Uniform = 'blazer-ribbon' | 'blazer-tie' | 'shirt-collar'

/** Iris colours. Deliberately small and mostly dark — an eye is ~2px at
 *  leaderboard size, so this axis is decoration, never the difference
 *  between two presets. */
const IRIS = {
  dark: '#2B2028', brown: '#5A3620', hazel: '#8A6134',
  green: '#3F6B4B', blue: '#3F6690', grey: '#5F6C77',
} as const
export type Iris = keyof typeof IRIS

export interface StudyAvatarSpec {
  id: StudyAvatarId
  skin: SkinTone
  face: FaceShape
  hair: HairStyle
  /** Also the brow and facial-hair colour. Unused as *hair* by 'bald'
   *  and 'hijab', which still need brows. */
  hairColour: HairColour
  /** Headscarf fabric. Required by 'hijab'; ignored otherwise. */
  coverColour?: string
  eyes: EyeShape
  iris: Iris
  brow: BrowShape
  mouth: MouthShape
  facialHair: FacialHair
  accessory: Accessory
  /** School uniform layered over `clothes`. Omit for plain clothes. */
  uniform?: Uniform
  /** Ribbon / necktie colour. Required in practice by 'blazer-ribbon'
   *  and 'blazer-tie'; ignored otherwise. */
  tieColour?: string
  /** Garment. The second-largest block after the face, so it is the
   *  other thing carrying identity at 32px. For a uniform preset this is
   *  the OUTER layer — the blazer, or the shirt when there is none. */
  clothes: string
  /** Disc behind the bust. Chosen to sit clear of BOTH the skin tone and
   *  the hair colour — a pale backdrop under white hair, or a peach one
   *  under tone-1, erases the silhouette. Pinned by a contrast test. */
  bg: string
  /** i18n key for the accessible name (en.json + ko.json). */
  nameKey: string
}

/**
 * The registry. Keyed by the ids in @/lib/study/avatars — `satisfies`
 * makes a missing or misspelled key a compile error, so the id list and
 * the drawings cannot drift apart silently.
 */
export const STUDY_AVATARS = {
  'person-aster': {
    id: 'person-aster', skin: 'tone-2', face: 'oval',
    hair: 'straight-long', hairColour: 'black',
    eyes: 'mono', iris: 'dark', brow: 'straight', mouth: 'soft-smile',
    facialHair: 'none', accessory: 'none',
    clothes: '#5B7FD4', bg: '#EDE7F6', nameKey: 'study.prefs.avatarName.aster',
  },
  'person-ember': {
    id: 'person-ember', skin: 'tone-7', face: 'round',
    hair: 'coily-afro', hairColour: 'soft-black',
    eyes: 'wide', iris: 'brown', brow: 'soft', mouth: 'grin',
    facialHair: 'none', accessory: 'none',
    clothes: '#E9B04A', bg: '#DFF0F4', nameKey: 'study.prefs.avatarName.ember',
  },
  'person-quartz': {
    id: 'person-quartz', skin: 'tone-3', face: 'round',
    hair: 'straight-bob', hairColour: 'teal',
    eyes: 'mono', iris: 'dark', brow: 'straight', mouth: 'smile',
    facialHair: 'none', accessory: 'none',
    clothes: '#E2A03C', bg: '#F0EAF8', nameKey: 'study.prefs.avatarName.quartz',
  },
  'person-onyx': {
    id: 'person-onyx', skin: 'tone-5', face: 'long',
    hair: 'bald', hairColour: 'soft-black',
    eyes: 'almond', iris: 'dark', brow: 'thick', mouth: 'neutral',
    facialHair: 'short-beard', accessory: 'none',
    clothes: '#4C5A73', bg: '#F3EFE2', nameKey: 'study.prefs.avatarName.onyx',
  },
  'person-birch': {
    id: 'person-birch', skin: 'tone-1', face: 'round',
    hair: 'wavy-mid', hairColour: 'light-brown',
    eyes: 'round', iris: 'green', brow: 'soft', mouth: 'smile',
    facialHair: 'none', accessory: 'freckles',
    clothes: '#E0764F', bg: '#C4DCCB', nameKey: 'study.prefs.avatarName.birch',
  },
  'person-garnet': {
    id: 'person-garnet', skin: 'tone-8', face: 'long',
    hair: 'locs-long', hairColour: 'black',
    eyes: 'almond', iris: 'brown', brow: 'straight', mouth: 'soft-smile',
    facialHair: 'none', accessory: 'none',
    clothes: '#C9603F', bg: '#E7EDF6', nameKey: 'study.prefs.avatarName.garnet',
  },
  'person-maple': {
    id: 'person-maple', skin: 'tone-4', face: 'heart',
    hair: 'ponytail-high', hairColour: 'auburn',
    eyes: 'almond', iris: 'hazel', brow: 'arched', mouth: 'smile',
    facialHair: 'none', accessory: 'headband',
    clothes: '#2E8F86', bg: '#F6E9E2', nameKey: 'study.prefs.avatarName.maple',
  },
  'person-cedar': {
    id: 'person-cedar', skin: 'tone-6', face: 'square',
    hair: 'buzz', hairColour: 'black',
    eyes: 'almond', iris: 'dark', brow: 'thick', mouth: 'neutral',
    facialHair: 'stubble', accessory: 'none',
    clothes: '#3F7A63', bg: '#F2E9DC', nameKey: 'study.prefs.avatarName.cedar',
  },
  'person-harbor': {
    id: 'person-harbor', skin: 'tone-2', face: 'long',
    hair: 'crop-side', hairColour: 'blonde',
    eyes: 'narrow', iris: 'blue', brow: 'thin', mouth: 'smirk',
    facialHair: 'none', accessory: 'glasses',
    clothes: '#4A6E96', bg: '#F7E6EC', nameKey: 'study.prefs.avatarName.harbor',
  },
  'person-nova': {
    id: 'person-nova', skin: 'tone-7', face: 'oval',
    hair: 'coily-puff', hairColour: 'black',
    eyes: 'wide', iris: 'dark', brow: 'thick', mouth: 'soft-smile',
    facialHair: 'none', accessory: 'none',
    clothes: '#D9564F', bg: '#E4EDFA', nameKey: 'study.prefs.avatarName.nova',
  },
  'person-dune': {
    id: 'person-dune', skin: 'tone-3', face: 'heart',
    hair: 'bun-top', hairColour: 'dark-brown',
    eyes: 'almond', iris: 'brown', brow: 'arched', mouth: 'smile',
    facialHair: 'none', accessory: 'earrings',
    clothes: '#D2688F', bg: '#EAF1E6', nameKey: 'study.prefs.avatarName.dune',
  },
  'person-juniper': {
    id: 'person-juniper', skin: 'tone-5', face: 'long',
    hair: 'hijab', hairColour: 'dark-brown', coverColour: '#6C7FC4',
    eyes: 'almond', iris: 'dark', brow: 'soft', mouth: 'smile',
    facialHair: 'none', accessory: 'none',
    clothes: '#AEB6D2', bg: '#FAEDDC', nameKey: 'study.prefs.avatarName.juniper',
  },
  'person-indigo': {
    id: 'person-indigo', skin: 'tone-1', face: 'diamond',
    hair: 'pixie', hairColour: 'lavender',
    eyes: 'round', iris: 'grey', brow: 'thin', mouth: 'smirk',
    facialHair: 'none', accessory: 'none',
    clothes: '#3A3F52', bg: '#C8D6E8', nameKey: 'study.prefs.avatarName.indigo',
  },
  'person-rowan': {
    id: 'person-rowan', skin: 'tone-8', face: 'diamond',
    hair: 'waves-short', hairColour: 'grey',
    eyes: 'almond', iris: 'dark', brow: 'thick', mouth: 'soft-smile',
    facialHair: 'moustache', accessory: 'glasses',
    clothes: '#3E8C6A', bg: '#F7EEDD', nameKey: 'study.prefs.avatarName.rowan',
  },
  'person-fern': {
    id: 'person-fern', skin: 'tone-4', face: 'oval',
    hair: 'curly-shoulder', hairColour: 'brown',
    eyes: 'almond', iris: 'brown', brow: 'soft', mouth: 'soft-smile',
    facialHair: 'none', accessory: 'round-glasses',
    clothes: '#6C63C4', bg: '#E4F1E9', nameKey: 'study.prefs.avatarName.fern',
  },
  'person-lumen': {
    id: 'person-lumen', skin: 'tone-6', face: 'heart',
    hair: 'braids-twin', hairColour: 'dark-brown',
    eyes: 'smiling', iris: 'brown', brow: 'soft', mouth: 'grin',
    facialHair: 'none', accessory: 'none',
    clothes: '#7A5AC0', bg: '#EAF3E4', nameKey: 'study.prefs.avatarName.lumen',
  },
  'person-pearl': {
    id: 'person-pearl', skin: 'tone-2', face: 'oval',
    hair: 'updo-low', hairColour: 'white',
    eyes: 'narrow', iris: 'grey', brow: 'thin', mouth: 'soft-smile',
    facialHair: 'none', accessory: 'none',
    clothes: '#7C89A6', bg: '#AEBDD0', nameKey: 'study.prefs.avatarName.pearl',
  },
  'person-kestrel': {
    id: 'person-kestrel', skin: 'tone-3', face: 'square',
    hair: 'undercut-fade', hairColour: 'soft-black',
    eyes: 'mono', iris: 'dark', brow: 'straight', mouth: 'smirk',
    facialHair: 'none', accessory: 'none',
    clothes: '#2F6E8E', bg: '#F8EFDE', nameKey: 'study.prefs.avatarName.kestrel',
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
    hair: 'fringe-long', hairColour: 'black',
    eyes: 'mono', iris: 'dark', brow: 'straight', mouth: 'soft-smile',
    facialHair: 'none', accessory: 'none',
    uniform: 'blazer-ribbon', tieColour: '#B0384A',
    clothes: '#2E3C63', bg: '#DDE9F4', nameKey: 'study.prefs.avatarName.willow',
  },
  'person-flint': {
    id: 'person-flint', skin: 'tone-6', face: 'square',
    hair: 'two-block', hairColour: 'black',
    eyes: 'narrow', iris: 'dark', brow: 'thick', mouth: 'smirk',
    facialHair: 'none', accessory: 'slim-glasses',
    uniform: 'blazer-tie', tieColour: '#2F4B7C',
    clothes: '#2B2B34', bg: '#E7EFE4', nameKey: 'study.prefs.avatarName.flint',
  },
  'person-linden': {
    id: 'person-linden', skin: 'tone-1', face: 'heart',
    hair: 'wispy-long', hairColour: 'black',
    eyes: 'almond', iris: 'brown', brow: 'soft', mouth: 'smile',
    facialHair: 'none', accessory: 'slim-glasses',
    clothes: '#C2557A', bg: '#BFD6E4', nameKey: 'study.prefs.avatarName.linden',
  },
  'person-sorrel': {
    id: 'person-sorrel', skin: 'tone-6', face: 'round',
    hair: 'low-ponytail', hairColour: 'soft-black',
    eyes: 'almond', iris: 'brown', brow: 'soft', mouth: 'soft-smile',
    facialHair: 'none', accessory: 'none',
    clothes: '#3F7F9E', bg: '#F6ECDC', nameKey: 'study.prefs.avatarName.sorrel',
  },
  'person-jasper': {
    id: 'person-jasper', skin: 'tone-5', face: 'square',
    hair: 'crop-neat', hairColour: 'soft-black',
    eyes: 'almond', iris: 'dark', brow: 'straight', mouth: 'soft-smile',
    facialHair: 'none', accessory: 'glasses',
    uniform: 'shirt-collar',
    clothes: '#DCE5F2', bg: '#96AEC9', nameKey: 'study.prefs.avatarName.jasper',
  },
  'person-clover': {
    id: 'person-clover', skin: 'tone-4', face: 'round',
    hair: 'bob-bangs', hairColour: 'black',
    eyes: 'round', iris: 'dark', brow: 'thin', mouth: 'smile',
    facialHair: 'none', accessory: 'round-glasses',
    clothes: '#E07A4F', bg: '#DCE9DA', nameKey: 'study.prefs.avatarName.clover',
  },
  'person-thistle': {
    id: 'person-thistle', skin: 'tone-2', face: 'heart',
    hair: 'half-up', hairColour: 'light-brown',
    eyes: 'mono', iris: 'brown', brow: 'arched', mouth: 'soft-smile',
    facialHair: 'none', accessory: 'none',
    clothes: '#58A08C', bg: '#F5EFE1', nameKey: 'study.prefs.avatarName.thistle',
  },
  'person-mica': {
    id: 'person-mica', skin: 'tone-3', face: 'long',
    hair: 'middle-part-mid', hairColour: 'brown',
    eyes: 'smiling', iris: 'dark', brow: 'arched', mouth: 'grin',
    facialHair: 'none', accessory: 'none',
    clothes: '#C86A8E', bg: '#E1EDF1', nameKey: 'study.prefs.avatarName.mica',
  },
  'person-opal': {
    id: 'person-opal', skin: 'tone-1', face: 'diamond',
    hair: 'layered-bob', hairColour: 'dark-brown',
    eyes: 'mono', iris: 'brown', brow: 'straight', mouth: 'smile',
    facialHair: 'none', accessory: 'none',
    clothes: '#6E76B8', bg: '#BEDACC', nameKey: 'study.prefs.avatarName.opal',
  },
} satisfies Record<StudyAvatarId, StudyAvatarSpec>

/** Registry order = picker order. Derived from the canonical id list so
 *  the two can never disagree about membership. */
export const STUDY_AVATAR_LIST: StudyAvatarSpec[] = STUDY_AVATAR_IDS.map(id => STUDY_AVATARS[id])

/** Spec for an id, or null for null / unknown / retired ids. */
export function getStudyAvatar(id: string | null | undefined): StudyAvatarSpec | null {
  return isStudyAvatarId(id) ? STUDY_AVATARS[id] : null
}

// ── Drawing ──────────────────────────────────────────────────────────

/**
 * One avatar, cropped to a circle by the wrapper (not by an SVG clip —
 * see the module note). `label` is the accessible name; pass null to
 * mark it decorative when an adjacent element already names the person.
 */
export function PersonAvatar({ spec: s, size = 36, label, className = '' }: {
  spec: StudyAvatarSpec
  size?: number
  label?: string | null
  className?: string
}) {
  const skin = SKIN_RAMP[s.skin]
  const hair = HAIR_COLOURS[s.hairColour]
  const face = FACE_SHAPES[s.face]
  const style = HAIR_STYLES[s.hair]
  const hairEdge = darken(hair.base, 0.28)
  const clothesEdge = darken(s.clothes, 0.2)
  // Squeeze the shared hair geometry onto this head's width.
  const hairTransform = `translate(${32 * (1 - face.hairScale)} 0) scale(${face.hairScale} 1)`

  return (
    <div
      className={`flex-shrink-0 ${className}`}
      // The circular crop is INLINE, not a Tailwind class: it is the only
      // thing keeping the shoulders (which run past the viewBox edge by
      // design, so the bust fills the disc) inside a circle. As a class it
      // would depend on the consumer's stylesheet being present and on
      // `rounded-full` surviving purge — and the failure mode is a square
      // avatar, silently, only on some surface.
      style={{
        width: size, height: size, backgroundColor: s.bg,
        borderRadius: '50%', overflow: 'hidden',
      }}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      <svg viewBox="0 0 64 64" width={size} height={size} focusable="false">
        {/* 1 · hair mass behind the head */}
        <g transform={hairTransform}>
          <HairBack style={s.hair} hair={hair} edge={hairEdge} />
        </g>

        {/* 2 · neck, then the garment over it */}
        <path d="M 26.4 34 h 11.2 v 11 q 0 3.4 -5.6 3.4 q -5.6 0 -5.6 -3.4 z" fill={skin.base} />
        <path d="M 26.4 34 h 11.2 v 3.4 q -5.6 3.6 -11.2 0 z" fill={skin.shade} />
        <path
          d="M 32 45.4 C 20.4 45.4 10.2 52.4 7 65 L 57 65 C 53.8 52.4 43.6 45.4 32 45.4 Z"
          fill={s.clothes} stroke={clothesEdge} strokeWidth="0.9"
        />
        {/* Plain neckline, OR the uniform that replaces it. Both sit
            under the head (drawn at step 4), so a long chin overlaps the
            collar the way a real one does. */}
        {s.uniform
          ? <UniformMark kind={s.uniform} accent={s.tieColour ?? '#B0384A'} />
          : <path d="M 25.8 46.6 Q 32 53.4 38.2 46.6" fill="none" stroke={clothesEdge} strokeWidth="1.3" strokeLinecap="round" />}

        {/* 3 · ears (behind the head, so only the outer edge shows) */}
        {style.ears && (
          <>
            <ellipse cx={32 - face.ear} cy="28.6" rx="2.7" ry="3.6" fill={skin.base} stroke={skin.shade} strokeWidth="0.7" />
            <ellipse cx={32 + face.ear} cy="28.6" rx="2.7" ry="3.6" fill={skin.base} stroke={skin.shade} strokeWidth="0.7" />
          </>
        )}

        {/* 4 · head */}
        <path d={face.path} fill={skin.base} stroke={skin.shade} strokeWidth="0.85" />

        {/* 5 · face */}
        <Brows shape={s.brow} colour={hair.base} />
        <Eyes shape={s.eyes} iris={IRIS[s.iris]} line={skin.line} />
        <path d="M 32 28.6 v 3.6 q 0 1.5 1.9 1.7" fill="none" stroke={skin.line} strokeWidth="0.85" strokeLinecap="round" opacity="0.75" />
        <ellipse cx="23.4" cy="33" rx="3" ry="1.9" fill={skin.shade} opacity="0.55" />
        <ellipse cx="40.6" cy="33" rx="3" ry="1.9" fill={skin.shade} opacity="0.55" />
        <Mouth shape={s.mouth} lip={skin.lip} skin={skin.base} />
        <FacialHairMark kind={s.facialHair} colour={hair.base} />

        {/* 6 · hair over the head */}
        <g transform={hairTransform}>
          <HairFront style={s.hair} hair={hair} edge={hairEdge} skin={skin.base} cover={s.coverColour ?? '#6C7FC4'} />
        </g>

        {/* 7 · accessory — last, and never the only difference between
               two presets. Everything here is inside radius 31. */}
        <AccessoryMark kind={s.accessory} skin={skin} ear={face.ear} />
      </svg>
    </div>
  )
}

/** One rung of the ramps above, as handed to a part renderer. */
type SkinSwatch = (typeof SKIN_RAMP)[SkinTone]
type HairSwatch = (typeof HAIR_COLOURS)[HairColour]

// ── Face parts ───────────────────────────────────────────────────────
// Eyes sit on y = 27.6, centred at x = 32 ± 6.3. Brows on y ≈ 22.
const EYE_L = 25.7
const EYE_R = 38.3

function Eyes({ shape, iris, line }: { shape: EyeShape; iris: string; line: string }) {
  const one = (cx: number) => {
    switch (shape) {
      case 'almond':
        return (
          <g key={cx}>
            <path d={`M ${cx - 4.3} 27.7 Q ${cx} 24.1 ${cx + 4.3} 27.7 Q ${cx} 30.7 ${cx - 4.3} 27.7 Z`} fill="#FBFCFE" />
            <circle cx={cx} cy="27.7" r="2.2" fill={iris} />
            <circle cx={cx + 0.75} cy="26.9" r="0.7" fill="#FFFFFF" opacity="0.85" />
            <path d={`M ${cx - 4.4} 27.4 Q ${cx} 23.5 ${cx + 4.4} 27.4`} fill="none" stroke={line} strokeWidth="0.9" strokeLinecap="round" />
          </g>
        )
      case 'mono':
        // Monolid: a flatter lens with the lid crease sitting high and
        // close, rather than a second arc away from the lash line.
        return (
          <g key={cx}>
            <path d={`M ${cx - 4.4} 27.9 Q ${cx} 25.1 ${cx + 4.4} 27.9 Q ${cx} 30.2 ${cx - 4.4} 27.9 Z`} fill="#FBFCFE" />
            <circle cx={cx} cy="27.9" r="2.05" fill={iris} />
            <circle cx={cx + 0.7} cy="27.2" r="0.65" fill="#FFFFFF" opacity="0.85" />
            <path d={`M ${cx - 4.5} 27.7 Q ${cx} 24.6 ${cx + 4.5} 27.7`} fill="none" stroke={line} strokeWidth="1" strokeLinecap="round" />
            <path d={`M ${cx - 3.4} 24.5 Q ${cx} 23.3 ${cx + 3.6} 24.6`} fill="none" stroke={line} strokeWidth="0.6" opacity="0.5" strokeLinecap="round" />
          </g>
        )
      case 'round':
        return (
          <g key={cx}>
            {/* The iris must nearly FILL the sclera. At r=3.3/2.15 there was
                a thick white ring all the way round the iris, which reads as
                startled rather than round-eyed — it made ember and indigo
                look bug-eyed next to the almond-eyed presets. Every other
                eye shape here shows white only at the CORNERS, so matching
                that ratio is what makes this one belong. Caught by looking
                at a render; no assertion in the suite covers proportion. */}
            <circle cx={cx} cy="27.7" r="2.95" fill="#FBFCFE" stroke={line} strokeWidth="0.75" />
            <circle cx={cx} cy="27.9" r="2.45" fill={iris} />
            <circle cx={cx + 0.75} cy="27" r="0.7" fill="#FFFFFF" opacity="0.9" />
          </g>
        )
      case 'narrow':
        return (
          <g key={cx}>
            {/* Slightly less pinched than it was (25.6/29.8, iris 1.85). That
                lens was flat enough that its two sharp corners plus the lid
                stroke read as arrowheads rather than eyes — clearest on
                rowan, where the glasses frame sits right on them. Widening
                the opening a little and letting the iris carry more of it
                keeps "narrow" narrow without the chevron artefact. */}
            <path d={`M ${cx - 4.2} 27.8 Q ${cx} 25.15 ${cx + 4.2} 27.8 Q ${cx} 30.05 ${cx - 4.2} 27.8 Z`} fill="#FBFCFE" />
            <circle cx={cx} cy="27.8" r="2.05" fill={iris} />
            <path d={`M ${cx - 4.3} 27.6 Q ${cx} 24.7 ${cx + 4.3} 27.6`} fill="none" stroke={line} strokeWidth="0.95" strokeLinecap="round" />
          </g>
        )
      case 'wide':
        return (
          <g key={cx}>
            <ellipse cx={cx} cy="27.6" rx="4.5" ry="3.9" fill="#FBFCFE" stroke={line} strokeWidth="0.75" />
            <circle cx={cx} cy="27.8" r="2.7" fill={iris} />
            <circle cx={cx + 1} cy="26.7" r="1" fill="#FFFFFF" opacity="0.9" />
          </g>
        )
      case 'smiling':
        // Drawn in the IRIS colour, not `line`. `line` is a per-tone
        // shade meant for the nose and lid — as the whole eye it is a
        // pale tan arc on tone-1 and near-black-on-black at tone-8, so
        // the eyes disappear at both ends of the ramp. The iris palette
        // is dark on purpose and reads on every tone.
        return (
          <path
            key={cx}
            d={`M ${cx - 4.1} 29 Q ${cx} 24.4 ${cx + 4.1} 29`}
            fill="none" stroke={iris} strokeWidth="1.8" strokeLinecap="round"
          />
        )
    }
  }
  return <>{[one(EYE_L), one(EYE_R)]}</>
}

function Brows({ shape, colour }: { shape: BrowShape; colour: string }) {
  const geom = (cx: number, sign: number) => {
    switch (shape) {
      case 'straight': return `M ${cx - 4.6} ${22.3 - sign * 0.2} L ${cx + 4.6} ${22.1 + sign * 0.2}`
      case 'arched': return `M ${cx - 4.6} 22.8 Q ${cx} 19.3 ${cx + 4.6} 22.4`
      case 'thin': return `M ${cx - 4.3} 22.4 Q ${cx} 20.7 ${cx + 4.3} 22.2`
      default: return `M ${cx - 4.5} 22.5 Q ${cx} 20.2 ${cx + 4.5} 22.2`
    }
  }
  const width = shape === 'thick' ? 2.3 : shape === 'thin' ? 1.05 : 1.7
  return (
    <>
      <path d={geom(EYE_L, -1)} fill="none" stroke={colour} strokeWidth={width} strokeLinecap="round" />
      <path d={geom(EYE_R, 1)} fill="none" stroke={colour} strokeWidth={width} strokeLinecap="round" />
    </>
  )
}

function Mouth({ shape, lip, skin }: { shape: MouthShape; lip: string; skin: string }) {
  switch (shape) {
    case 'smile':
      return <path d="M 28.1 36.6 Q 32 40.7 35.9 36.6" fill="none" stroke={lip} strokeWidth="1.7" strokeLinecap="round" />
    case 'soft-smile':
      return <path d="M 29 37.1 Q 32 39.3 35 37.1" fill="none" stroke={lip} strokeWidth="1.6" strokeLinecap="round" />
    case 'neutral':
      return <path d="M 29.3 37.6 L 34.7 37.6" fill="none" stroke={lip} strokeWidth="1.6" strokeLinecap="round" />
    case 'grin':
      return (
        <>
          <path d="M 28 36.3 Q 32 41.9 36 36.3 Z" fill={darken(lip, 0.3)} />
          <path d="M 28.6 36.7 L 35.4 36.7 Q 34 38 32 38 Q 30 38 28.6 36.7 Z" fill={lighten(skin, 0.72)} />
        </>
      )
    case 'smirk':
      return <path d="M 28.9 37.8 Q 32.4 39.4 35.4 36.8" fill="none" stroke={lip} strokeWidth="1.6" strokeLinecap="round" />
  }
}

function FacialHairMark({ kind, colour }: { kind: FacialHair; colour: string }) {
  switch (kind) {
    case 'none':
      return null
    case 'stubble':
      return (
        <path
          d="M 20.6 31.6 Q 21.4 45.4 32 45.4 Q 42.6 45.4 43.4 31.6 Q 41.6 40 32 40 Q 22.4 40 20.6 31.6 Z"
          fill={colour} opacity="0.26"
        />
      )
    case 'short-beard':
      return (
        <>
          <path
            d="M 20.4 30.4 Q 20 45.6 32 47.2 Q 44 45.6 43.6 30.4 Q 42.4 38.4 32 38.4 Q 21.6 38.4 20.4 30.4 Z"
            fill={colour}
          />
          <path d="M 28.4 34.4 Q 32 33.2 35.6 34.4" fill="none" stroke={colour} strokeWidth="1.9" strokeLinecap="round" />
        </>
      )
    case 'moustache':
      return <path d="M 27.4 35.2 Q 32 33.4 36.6 35.2 Q 32 36.6 27.4 35.2 Z" fill={colour} />
  }
}

// ── School uniform ───────────────────────────────────────────────────
// The collar and the ribbon/tie are the two most legible uniform cues at
// 32px — a blazer alone is just a dark garment. Everything here is
// placed against the radius-31 safe circle, which BITES on this part
// more than on any other: the garment sits low and wide, so a collar
// point at (21.2, 48.4) is already r = 19.6 and the ribbon's outer
// corner at (24.6, 55.8) is r = 24.9. Anything pushed out to the
// shoulder line would be sliced off by the crop.
const SHIRT = '#F7F9FD'
const SHIRT_EDGE = '#BFC9DA'

function UniformMark({ kind, accent }: { kind: Uniform; accent: string }) {
  const accentEdge = darken(accent, 0.3)
  return (
    <>
      {/* The wedge of shirt showing between the blazer fronts. Skipped
          for 'shirt-collar', where the garment already IS the shirt and
          this would outline a panel that is not there. */}
      {kind !== 'shirt-collar' && (
        <path
          d="M 25.6 45.6 Q 32 50.4 38.4 45.6 L 42.8 48.8 L 39.6 65 L 24.4 65 L 21.2 48.8 Z"
          fill={SHIRT} stroke={SHIRT_EDGE} strokeWidth="0.7"
        />
      )}
      <path d="M 32 53.8 L 32 64" fill="none" stroke={SHIRT_EDGE} strokeWidth="0.7" strokeLinecap="round" />
      <path
        d="M 25.9 45 L 32 51.4 L 26.6 54 L 21.2 48.4 Z"
        fill={SHIRT} stroke={SHIRT_EDGE} strokeWidth="0.7" strokeLinejoin="round"
      />
      <path
        d="M 38.1 45 L 32 51.4 L 37.4 54 L 42.8 48.4 Z"
        fill={SHIRT} stroke={SHIRT_EDGE} strokeWidth="0.7" strokeLinejoin="round"
      />
      {kind === 'blazer-ribbon' && (
        <>
          <path d="M 32 52.4 L 25.4 49.4 L 24.6 55.8 L 32 54 Z" fill={accent} stroke={accentEdge} strokeWidth="0.6" strokeLinejoin="round" />
          <path d="M 32 52.4 L 38.6 49.4 L 39.4 55.8 L 32 54 Z" fill={accent} stroke={accentEdge} strokeWidth="0.6" strokeLinejoin="round" />
          <circle cx="32" cy="52.6" r="1.75" fill={lighten(accent, 0.12)} stroke={accentEdge} strokeWidth="0.6" />
        </>
      )}
      {kind === 'blazer-tie' && (
        <>
          <path d="M 32 53.6 L 29.5 55.8 L 30.7 65 L 33.3 65 L 34.5 55.8 Z" fill={accent} stroke={accentEdge} strokeWidth="0.6" strokeLinejoin="round" />
          <path d="M 32 50.2 L 29.4 52.8 L 32 55.2 L 34.6 52.8 Z" fill={lighten(accent, 0.14)} stroke={accentEdge} strokeWidth="0.6" strokeLinejoin="round" />
        </>
      )}
      {kind === 'shirt-collar' && (
        <>
          <circle cx="32" cy="57" r="0.9" fill={SHIRT_EDGE} />
          <circle cx="32" cy="62" r="0.9" fill={SHIRT_EDGE} />
        </>
      )}
    </>
  )
}

function AccessoryMark({ kind, skin, ear }: { kind: Accessory; skin: SkinSwatch; ear: number }) {
  switch (kind) {
    case 'none':
      return null
    case 'glasses':
      return (
        <g fill="none" stroke="#3A3F4A" strokeWidth="1.15">
          <rect x="20.4" y="24.2" width="10.6" height="7.2" rx="2" />
          <rect x="33" y="24.2" width="10.6" height="7.2" rx="2" />
          <path d="M 31 27.2 L 33 27.2" />
          <path d="M 20.4 26.6 L 17.6 27.4" />
          <path d="M 43.6 26.6 L 46.4 27.4" />
        </g>
      )
    case 'round-glasses':
      return (
        <g fill="none" stroke="#4A4232" strokeWidth="1.15">
          <circle cx="25.7" cy="27.8" r="5.1" />
          <circle cx="38.3" cy="27.8" r="5.1" />
          <path d="M 30.8 27.4 L 33.2 27.4" />
          <path d="M 20.6 26.6 L 17.8 27.4" />
          <path d="M 43.4 26.6 L 46.2 27.4" />
        </g>
      )
    case 'slim-glasses':
      // Thin metal semi-rimless frames — the commonest school-glasses
      // shape in this cohort, and visibly NOT the two chunky frames
      // already in the set: shallower lenses, a thinner stroke and a
      // high bridge, so it does not collapse into `glasses` at 32px.
      return (
        <g fill="none" stroke="#5B5F6B" strokeWidth="0.85">
          <rect x="20.8" y="24.8" width="9.8" height="6" rx="2.6" />
          <rect x="33.4" y="24.8" width="9.8" height="6" rx="2.6" />
          <path d="M 30.6 26.4 Q 32 25.4 33.4 26.4" />
          <path d="M 20.8 26.4 L 18 27.2" />
          <path d="M 43.2 26.4 L 46 27.2" />
        </g>
      )
    case 'earrings':
      return (
        <>
          <circle cx={32 - ear - 0.4} cy="32.6" r="1.5" fill="#E6B54B" stroke={darken('#E6B54B', 0.3)} strokeWidth="0.5" />
          <circle cx={32 + ear + 0.4} cy="32.6" r="1.5" fill="#E6B54B" stroke={darken('#E6B54B', 0.3)} strokeWidth="0.5" />
        </>
      )
    case 'headband':
      return (
        <path
          d="M 18.2 21.4 Q 32 15.4 45.8 21.4 L 45.8 18.6 Q 32 12.6 18.2 18.6 Z"
          fill="#F2F4F8" stroke="#C9CEDA" strokeWidth="0.7"
        />
      )
    case 'freckles':
      return (
        <g fill={skin.line} opacity="0.5">
          <circle cx="22.6" cy="31.4" r="0.62" /><circle cx="25" cy="33.1" r="0.62" />
          <circle cx="21.4" cy="34" r="0.62" /><circle cx="39" cy="33.1" r="0.62" />
          <circle cx="41.4" cy="31.4" r="0.62" /><circle cx="42.6" cy="34" r="0.62" />
        </g>
      )
  }
}

// ── Hair ─────────────────────────────────────────────────────────────
// Two layers per style: BACK draws behind the head (long lengths, the
// afro's outer mass, a bun, a ponytail), FRONT draws over it (hairline,
// fringe, sheen). Split this way so the face is never buried and the
// silhouette is never a rectangle behind a head.
//
// Every coordinate below was placed against the radius-31 safe circle
// about (32,32), not against the viewBox: the highest point in the set
// is the top bun at y ≈ 3.8 (r = 28.2) and the widest is the coily puff
// at (19.8, 16.4) r 7.8 (r = 27.6).

const CURL_BUMPS: Array<[number, number, number]> = [
  [32, 10.6, 7.2], [23.2, 13, 6.4], [40.8, 13, 6.4],
  [18.4, 21.4, 6.2], [45.6, 21.4, 6.2],
  [19.6, 30.4, 5.9], [44.4, 30.4, 5.9],
  [22.2, 38.6, 5.4], [41.8, 38.6, 5.4],
]

function HairBack({ style, hair, edge }: {
  style: HairStyle; hair: HairSwatch; edge: string
}) {
  const fill = { fill: hair.base, stroke: edge, strokeWidth: 0.8 }
  switch (style) {
    case 'straight-long':
      return (
        <path
          {...fill}
          d="M 32 8.4 C 20.4 8.4 15.4 16.4 15.4 26 L 15.4 48.4 Q 15.4 50.6 17.8 50.6 L 21.4 50.6 Q 23.2 50.6 23 48.6 L 21.6 30 L 42.4 30 L 41 48.6 Q 40.8 50.6 42.6 50.6 L 46.2 50.6 Q 48.6 50.6 48.6 48.4 L 48.6 26 C 48.6 16.4 43.6 8.4 32 8.4 Z"
        />
      )
    case 'straight-bob':
      return (
        <path
          {...fill}
          d="M 32 8.6 C 21 8.6 15.8 16.2 15.8 26 L 15.8 40.2 Q 15.8 43.2 18.6 43.2 Q 21.4 43.2 21.4 40.2 L 21.4 30 L 42.6 30 L 42.6 40.2 Q 42.6 43.2 45.4 43.2 Q 48.2 43.2 48.2 40.2 L 48.2 26 C 48.2 16.2 43 8.6 32 8.6 Z"
        />
      )
    case 'wavy-mid':
      return (
        <path
          {...fill}
          d="M 32 8.4 C 20.8 8.4 15.6 16.4 15.6 26 C 15.6 33.4 14.6 40.4 16.4 46.6 Q 18.4 43.4 20.6 46.4 Q 22.8 49.4 25.2 46 L 22.8 30 L 41.2 30 L 38.8 46 Q 41.2 49.4 43.4 46.4 Q 45.6 43.4 47.6 46.6 C 49.4 40.4 48.4 33.4 48.4 26 C 48.4 16.4 43.2 8.4 32 8.4 Z"
        />
      )
    case 'curly-shoulder':
      return (
        <>
          {CURL_BUMPS.map(([cx, cy, r], i) => (
            <circle key={i} cx={cx} cy={cy} r={r} fill={hair.base} stroke={edge} strokeWidth="0.7" />
          ))}
          <path d="M 20 20 L 44 20 L 44 34 L 20 34 Z" fill={hair.base} />
        </>
      )
    case 'coily-afro':
      return (
        <>
          <circle cx="32" cy="24" r="18.4" fill={hair.base} stroke={edge} strokeWidth="0.8" />
          {[
            [16.6, 13.4], [24, 7.4], [32, 5.6], [40, 7.4], [47.4, 13.4],
            [50.2, 22.4], [13.8, 22.4], [48.2, 32], [15.8, 32],
          ].map(([cx, cy], i) => (
            // No stroke on the texture bumps: an outline on each one
            // turns a coily edge into a ring of separate pom-poms.
            // They only need to break the circle's outline.
            <circle key={i} cx={cx} cy={cy} r="4.1" fill={hair.base} />
          ))}
        </>
      )
    case 'coily-puff':
      return (
        <>
          <circle cx="19.8" cy="16.4" r="7.8" fill={hair.base} stroke={edge} strokeWidth="0.8" />
          <circle cx="44.2" cy="16.4" r="7.8" fill={hair.base} stroke={edge} strokeWidth="0.8" />
          <circle cx="17.8" cy="13.4" r="3.4" fill={hair.hi} opacity="0.35" />
          <circle cx="42.2" cy="13.4" r="3.4" fill={hair.hi} opacity="0.35" />
        </>
      )
    case 'braids-twin':
      return (
        <>
          {[15.6, 48.4].flatMap(cx => (
            [30, 35.6, 41, 45.8].map((cy, i) => (
              <ellipse
                key={`${cx}-${cy}`} cx={cx} cy={cy} rx={4.3 - i * 0.45} ry={3.5 - i * 0.35}
                fill={hair.base} stroke={edge} strokeWidth="0.7"
              />
            ))
          ))}
          <path d="M 15.6 22 L 48.4 22 L 48.4 31 L 15.6 31 Z" fill={hair.base} />
        </>
      )
    case 'locs-long':
      return (
        <>
          <path d="M 32 8.8 C 21.2 8.8 16.2 16.4 16.2 27 L 47.8 27 C 47.8 16.4 42.8 8.8 32 8.8 Z" fill={hair.base} stroke={edge} strokeWidth="0.8" />
          {/* Mirrored about x=32: a rect [x, x+3.4] pairs with [60.6-x]. */}
          {[
            [15.6, 49.6], [19.2, 47.4], [22.8, 44.6],
            [37.8, 44.6], [41.4, 47.4], [45, 49.6],
          ].map(([x, y2], i) => (
            // Outlined in the hair's OWN highlight, not in `edge`: on
            // black hair a darker edge is invisible, and without a
            // separator the six locs render as one undifferentiated
            // mass that reads as plain long hair.
            <rect
              key={i} x={x} y="24" width="3.4" height={y2 - 24} rx="1.7"
              fill={hair.base} stroke={hair.hi} strokeWidth="0.7" strokeOpacity="0.6"
            />
          ))}
        </>
      )
    case 'bun-top':
      return (
        <>
          <circle cx="32" cy="10" r="6.2" fill={hair.base} stroke={edge} strokeWidth="0.8" />
          <path d="M 29.4 6.6 Q 33.6 5.2 35.6 8.6" fill="none" stroke={hair.hi} strokeWidth="1.3" strokeLinecap="round" opacity="0.8" />
        </>
      )
    case 'updo-low':
      return (
        <>
          <circle cx="46.4" cy="34.6" r="6.4" fill={hair.base} stroke={edge} strokeWidth="0.8" />
          <path d="M 43.6 31.6 Q 48 30.4 50 34.2" fill="none" stroke={hair.hi} strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
        </>
      )
    case 'ponytail-high':
      return (
        <>
          <path
            {...fill}
            d="M 43 14 C 51.6 12.2 56.6 19.6 55 27.4 C 54 32.6 50.4 36 46.4 36.2 C 50 31.6 51.4 26.2 50 21.4 C 48.8 17.2 46 15 43 14 Z"
          />
          <ellipse cx="44.4" cy="15.4" rx="3.1" ry="2.5" fill={darken(hair.base, 0.35)} />
        </>
      )
    // ── Added 2026-08 ────────────────────────────────────────────────
    case 'fringe-long':
      // Blunt-cut lengths: a FLAT hem, where 'straight-long' tapers to
      // rounded tips. Flat at y = 51.4 the hem is r = 24.2 from centre,
      // well inside the crop, and the garment covers everything from
      // x ≈ 16.4 inward — so what reads is the squared outer corner.
      return (
        <path
          {...fill}
          d="M 32 8.2 C 19.8 8.2 15 16.4 15 26.6 L 15 51.4 L 24.6 51.4 L 23 30 L 41 30 L 39.4 51.4 L 49 51.4 L 49 26.6 C 49 16.4 44.2 8.2 32 8.2 Z"
        />
      )
    case 'wispy-long':
      return (
        <path
          {...fill}
          d="M 32 8.6 C 21 8.6 16 16.2 16 26 L 16 47.6 Q 16 50.6 19 50.6 Q 22 50.6 22.2 47.8 L 22.8 30 L 41.2 30 L 41.8 47.8 Q 42 50.6 45 50.6 Q 48 50.6 48 47.6 L 48 26 C 48 16.2 43 8.6 32 8.6 Z"
        />
      )
    case 'middle-part-mid':
      // Shoulder length with the ends flicking OUT (C컬). The flick tips
      // at (14.8, 47.4) and (49.2, 47.4) are r = 23.1 — the widest point
      // of this style and the one to re-check if the lengths ever grow.
      return (
        <path
          {...fill}
          d="M 32 8.6 C 21 8.6 15.8 16.4 15.8 26.4 C 15.8 33 15.2 38.6 16.6 43.6 Q 13.6 44.6 14.8 47.4 Q 18.4 45.6 20.8 42 L 23 30 L 41 30 L 43.2 42 Q 45.6 45.6 49.2 47.4 Q 50.4 44.6 47.4 43.6 C 48.8 38.6 48.2 33 48.2 26.4 C 48.2 16.4 43 8.6 32 8.6 Z"
        />
      )
    case 'low-ponytail':
      // Gathered at the nape and swept to one side. A tail drawn CENTRED
      // at the back is invisible head-on — it would be a preset whose
      // whole point never renders — so it hangs to the right, where it
      // clears the garment down to y ≈ 47.
      return (
        <>
          <path
            {...fill}
            d="M 41.2 27.2 C 49.6 27.4 53.2 34 52.8 41.2 C 52.5 45.8 50.4 49 47.4 50.2 C 49.6 44.8 49.8 38.4 47.6 33.4 C 46.2 30.4 43.8 28.2 41.2 27.2 Z"
          />
          <ellipse cx="42.8" cy="28.8" rx="3.2" ry="2.4" fill={darken(hair.base, 0.35)} />
          <path d="M 49 32.8 Q 51.6 38 50.6 43.6" fill="none" stroke={hair.hi} strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />
        </>
      )
    case 'bob-bangs':
      // 단발. Chin length with the ends turning IN, which is what stops
      // it reading as a shorter 'straight-long'.
      return (
        <path
          {...fill}
          d="M 32 8.6 C 20.8 8.6 15.4 16 15.4 26 L 15.4 36.6 Q 15.4 41.4 19.4 42.6 Q 22.6 43.4 23.4 40.6 Q 21.2 38 21.4 30 L 42.6 30 Q 42.8 38 40.6 40.6 Q 41.4 43.4 44.6 42.6 Q 48.6 41.4 48.6 36.6 L 48.6 26 C 48.6 16 43.2 8.6 32 8.6 Z"
        />
      )
    case 'layered-bob':
      // Same length as 'bob-bangs', different CUT: notched, layered ends
      // rather than one blunt line, and one side tucked behind the ear.
      return (
        <path
          {...fill}
          d="M 32 8.8 C 21.4 8.8 16.2 16 16.2 26 C 16.2 32 15.4 37.4 17 41.4 Q 19.4 39.4 21.6 41.6 Q 23.6 43.6 25.4 40.4 L 23 30 L 41 30 L 38.6 40.4 Q 40.4 43.6 42.4 41.6 Q 44.6 39.4 47 41.4 C 48.6 37.4 47.8 32 47.8 26 C 47.8 16 42.6 8.8 32 8.8 Z"
        />
      )
    case 'half-up':
      // 반묶음: the top section gathered at the crown, the rest left
      // down. The gathered mound is deliberately WIDE and FLAT (top at
      // y = 5, r = 27) where 'bun-top' is a ball — at 32px a same-sized
      // ball would have made these two presets the same avatar.
      return (
        <>
          <path
            {...fill}
            d="M 32 8.6 C 21.2 8.6 16 16.2 16 26.2 C 16 33 15.6 40 17 45.6 Q 19.6 43.2 22 45.4 Q 24 47.2 25.6 44.4 L 23 30 L 41 30 L 38.4 44.4 Q 40 47.2 42 45.4 Q 44.4 43.2 47 45.6 C 48.4 40 48 33 48 26.2 C 48 16.2 42.8 8.6 32 8.6 Z"
          />
          <path
            {...fill}
            d="M 22 13.4 Q 22.6 3.2 32 3.2 Q 41.4 3.2 42 13.4 Q 36.6 9.6 32 11.4 Q 27.4 9.6 22 13.4 Z"
          />
          <path d="M 26.6 8.2 Q 31.6 6.2 36.2 7.6" fill="none" stroke={hair.hi} strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
        </>
      )
    case 'crop-side':
    case 'undercut-fade':
    case 'waves-short':
    case 'buzz':
    case 'pixie':
    case 'two-block':
    case 'crop-neat':
    case 'bald':
    case 'hijab':
      return null
  }
}

function HairFront({ style, hair, edge, skin, cover }: {
  style: HairStyle; hair: HairSwatch; edge: string; skin: string; cover: string
}) {
  const fill = { fill: hair.base, stroke: edge, strokeWidth: 0.8 }
  const sheen = (d: string, w = 1.5) => (
    <path d={d} fill="none" stroke={hair.hi} strokeWidth={w} strokeLinecap="round" opacity="0.8" />
  )
  switch (style) {
    case 'straight-long':
      return (
        <>
          <path
            {...fill}
            d="M 32 8.4 C 21.4 8.4 16.4 15.6 16.2 25 C 16 19.6 19.8 14.4 25.2 13.4 C 27.8 15.4 29.9 16.2 32 16.2 C 34.1 16.2 36.2 15.4 38.8 13.4 C 44.2 14.4 48 19.6 47.8 25 C 47.6 15.6 42.6 8.4 32 8.4 Z"
          />
          {sheen('M 24 12.4 Q 29.4 9.6 35.4 11')}
        </>
      )
    case 'straight-bob':
      return (
        <>
          <path
            {...fill}
            d="M 16.4 24.6 C 16.4 14 22.6 8.6 32 8.6 C 41.4 8.6 47.6 14 47.6 24.6 L 47.6 19 C 43.6 21.4 38.4 22.4 32 22.4 C 25.6 22.4 20.4 21.4 16.4 19 Z"
          />
          {sheen('M 22.6 13.4 Q 29 10 36 11.6')}
        </>
      )
    case 'wavy-mid':
      return (
        <>
          <path
            {...fill}
            d="M 32 8.4 C 21.4 8.4 16.4 15.4 16.2 25.6 Q 17.6 18.4 22.4 15.6 Q 28.8 20.6 36.4 18.4 Q 43.6 16.2 47.8 25.6 C 47.6 15.4 42.6 8.4 32 8.4 Z"
          />
          {sheen('M 21.4 15.6 Q 25.4 11.8 30.6 12.4')}
          {sheen('M 38.4 12.6 Q 43.2 14.4 45.6 19', 1.3)}
        </>
      )
    case 'curly-shoulder':
      return (
        <>
          {[[23.6, 14.6, 5.4], [32, 12.2, 6], [40.4, 14.6, 5.4], [18.8, 20.6, 4.8], [45.2, 20.6, 4.8]].map(([cx, cy, r], i) => (
            <circle key={i} cx={cx} cy={cy} r={r} fill={hair.base} stroke={edge} strokeWidth="0.6" />
          ))}
          <circle cx="28.4" cy="12.4" r="2.4" fill={hair.hi} opacity="0.4" />
        </>
      )
    case 'coily-afro':
      return (
        <>
          <path
            {...fill}
            d="M 17.6 25.4 C 17.6 13.8 24 8.6 32 8.6 C 40 8.6 46.4 13.8 46.4 25.4 C 43.8 18.4 38.6 15.4 32 15.4 C 25.4 15.4 20.2 18.4 17.6 25.4 Z"
          />
          {[[22.4, 17.6], [27.4, 14.6], [32, 13.4], [36.6, 14.6], [41.6, 17.6]].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="3.1" fill={hair.base} />
          ))}
          <circle cx="27" cy="13.6" r="2.2" fill={hair.hi} opacity="0.35" />
        </>
      )
    case 'coily-puff':
      return (
        <>
          <path
            {...fill}
            d="M 17.8 25.2 C 18.2 14.6 24.2 9.2 32 9.2 C 39.8 9.2 45.8 14.6 46.2 25.2 C 43.6 18 38.4 15.2 32 15.2 C 25.6 15.2 20.4 18 17.8 25.2 Z"
          />
          {[[21.6, 18.6], [26.4, 14.4], [32, 12.8], [37.6, 14.4], [42.4, 18.6]].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="3.2" fill={hair.base} />
          ))}
        </>
      )
    case 'braids-twin':
      return (
        <>
          <path
            {...fill}
            d="M 17.4 25.4 C 17.4 14.4 23.8 9 32 9 C 40.2 9 46.6 14.4 46.6 25.4 C 45.2 17.4 39.6 14 32 14 C 24.4 14 18.8 17.4 17.4 25.4 Z"
          />
          <path d="M 32 9.4 L 32 15" stroke={hair.hi} strokeWidth="0.9" strokeLinecap="round" opacity="0.8" />
          {[[23.6, 12.8], [27.6, 10.8], [36.4, 10.8], [40.4, 12.8]].map(([x, y], i) => (
            <path key={i} d={`M ${x} ${y} Q 32 ${y - 2.4} ${64 - x} ${y}`} fill="none" stroke={hair.hi} strokeWidth="0.7" opacity="0.45" />
          ))}
        </>
      )
    case 'locs-long':
      return (
        <>
          <path
            {...fill}
            d="M 17.6 26 C 17.6 14.6 24 9 32 9 C 40 9 46.4 14.6 46.4 26 C 46.4 19.8 40 16.6 32 16.6 C 24 16.6 17.6 19.8 17.6 26 Z"
          />
          {[20.4, 24.4, 28.4, 32.4, 36.4, 40.4].map((x, i) => (
            <path key={i} d={`M ${x} ${11.6 + Math.abs(30 - x) * 0.22} L ${x} 21.6`} stroke={hair.hi} strokeWidth="1.1" strokeLinecap="round" opacity="0.45" />
          ))}
        </>
      )
    case 'buzz':
      return (
        <path
          d="M 17.5 26.6 C 17.5 14.6 23.8 9.2 32 9.2 C 40.2 9.2 46.5 14.6 46.5 26.6 C 46.2 21.4 44.8 18.6 42.6 17.6 C 39.6 16.2 36.2 15.8 32 15.8 C 27.8 15.8 24.4 16.2 21.4 17.6 C 19.2 18.6 17.8 21.4 17.5 26.6 Z"
          fill={mix(hair.base, skin, 0.22)} stroke={darken(mix(hair.base, skin, 0.22), 0.22)} strokeWidth="0.7"
        />
      )
    case 'undercut-fade':
      // The faded sides are drawn HERE, over the head. Behind it (the
      // obvious place, next to the other back masses) they sit inside
      // the skull outline and never show at all — which turned the
      // longer top into what read as a headband.
      return (
        <>
          <path d="M 19 20.4 Q 17.6 26 18.2 31 L 22.4 31 Q 21.4 25.4 22.4 20.4 Z" fill={mix(hair.base, skin, 0.4)} />
          <path d="M 45 20.4 Q 46.4 26 45.8 31 L 41.6 31 Q 42.6 25.4 41.6 20.4 Z" fill={mix(hair.base, skin, 0.4)} />
          <path
            {...fill}
            d="M 18 23 C 18 12.2 24.4 8.2 32 8.2 C 39.6 8.2 46 12.2 46 23 C 43.4 16.6 38.4 14.4 32 14.4 C 25.6 14.4 20.6 16.6 18 23 Z"
          />
          {sheen('M 22.4 13.8 Q 28.6 9.4 35.6 10.6', 1.4)}
          {sheen('M 36.8 10.2 Q 41.4 11.6 43.6 15.4', 1.1)}
        </>
      )
    case 'crop-side':
      return (
        <>
          <path
            {...fill}
            d="M 17.6 26.4 C 17.6 14.4 24 9 32 9 C 40 9 46.4 14.4 46.4 26.4 C 46.2 19.6 44.4 16.4 40.8 15.8 C 36.6 15.1 31 18.6 25.6 18.6 C 22.4 18.6 19.4 20 17.6 26.4 Z"
          />
          {sheen('M 24.4 13.2 Q 31.6 9.8 38.4 11.8')}
        </>
      )
    case 'waves-short':
      return (
        <>
          <path
            {...fill}
            d="M 17.6 26.4 C 17.6 14.6 24 9 32 9 C 40 9 46.4 14.6 46.4 26.4 C 45.4 20.6 43.6 17.4 40.6 16.4 C 37.4 19 34 19.4 30 18.4 C 26.4 17.6 22.6 18 20.4 20 C 19 21.2 18.2 23.6 17.6 26.4 Z"
          />
          {sheen('M 21.6 18.4 Q 26.4 14.4 31.6 15.8', 1.2)}
          {sheen('M 33.6 12.6 Q 39.4 11.6 43 15.2', 1.2)}
        </>
      )
    case 'pixie':
      return (
        <>
          <path
            {...fill}
            d="M 17.4 27 C 16.7 15.2 23.4 8.8 32 8.8 C 40.6 8.8 47.3 15.2 46.6 27 L 44.8 20.4 L 43.2 24.2 L 41.6 18.6 C 38 20.8 27.4 22 22.6 18.2 L 21 23.6 L 19.4 19.8 Z"
          />
          {sheen('M 23.6 12.8 Q 30.4 9.4 37.6 11.4', 1.3)}
        </>
      )
    case 'ponytail-high':
      return (
        <>
          <path
            {...fill}
            d="M 17.6 25.4 C 17.6 13.8 24 8.8 32 8.8 C 40 8.8 46.4 13.8 46.4 25.4 C 45.6 18 40 14.6 32 14.6 C 24 14.6 18.4 18 17.6 25.4 Z"
          />
          {[[19.6, 22], [22.4, 17.4], [26.8, 13.6]].map(([x, y], i) => (
            <path key={i} d={`M ${x} ${y} Q ${x + 8} ${y - 4} ${x + 17} ${y - 3}`} fill="none" stroke={hair.hi} strokeWidth="0.85" opacity="0.5" />
          ))}
        </>
      )
    case 'updo-low':
      return (
        <>
          <path
            {...fill}
            d="M 17.2 25.8 C 17.2 14 23.6 8.8 32 8.8 C 40.4 8.8 46.8 14 46.8 25.8 C 46.2 18.8 41.6 15.4 34 15.4 C 27 15.4 20 17.6 17.2 25.8 Z"
          />
          {sheen('M 20.6 19.6 Q 26.6 12.6 35.4 12.4', 1.3)}
        </>
      )
    // ── Added 2026-08 ────────────────────────────────────────────────
    // The FRINGE is what separates these from each other and from the
    // five straight cuts that were already here. Every hem below stops
    // at or above y ≈ 20.6 on purpose: the brows sit at y ≈ 20.2–22.5
    // and a fringe drawn lower buries them, which costs the face its
    // whole expression. HairFront draws after Brows, so a low hem is
    // silent — nothing errors, the eyebrows are simply gone.
    case 'fringe-long':
      // 일자 앞머리 — a blunt, level fringe with the sides continuing
      // past the temples.
      return (
        <>
          <path
            {...fill}
            d="M 16.6 31 C 16 13.4 23.2 8.2 32 8.2 C 40.8 8.2 48 13.4 47.4 31 L 45.4 17.6 Q 32 18.4 18.6 17.6 Z"
          />
          {sheen('M 22.8 13.6 Q 29.4 10.2 36.4 11.8', 1.3)}
        </>
      )
    case 'wispy-long':
      // 시스루뱅 — the fringe is THIN, so the forehead shows between the
      // strands. Drawn as separate tapered pieces rather than as one
      // mass with a lighter fill, because a lighter fill just reads as
      // a second hair colour.
      return (
        <>
          <path
            {...fill}
            d="M 17 30.4 C 16.8 13.6 23.6 8.6 32 8.6 C 40.4 8.6 47.2 13.6 47 30.4 C 46.4 21 44 17.2 39 16.4 Q 32 15.4 25 16.4 C 20 17.2 17.6 21 17 30.4 Z"
          />
          {/* Five strands, not seven, and no two the same: even spacing
              at even length is a COMB, which is what the first pass drew.
              Each leans slightly toward the parting and stops short of
              the brow — a black strand crossing a black brow merges into
              it and the face loses its expression. */}
          {[
            [24.6, 17.4, 19.2, 1.3], [27.9, 16.3, 19.9, 1.5],
            [31.5, 15.9, 18.9, 1.4], [35.1, 16.3, 19.6, 1.5],
            [38.4, 17.4, 18.8, 1.2],
          ].map(([x, y1, y2, w], i) => (
            <path
              key={i}
              d={`M ${x} ${y1} Q ${x - 0.5} ${(y1 + y2) / 2} ${x - 1.1} ${y2}`}
              stroke={hair.base} strokeWidth={w} strokeLinecap="round" fill="none"
            />
          ))}
          {sheen('M 23.4 13.2 Q 30 10 36.8 11.6', 1.2)}
        </>
      )
    case 'middle-part-mid':
      // A true centre part: the forehead is open in the MIDDLE and the
      // hair frames it down both sides past the cheekbone.
      return (
        <>
          <path
            {...fill}
            d="M 17.2 30 C 17 13.4 23.8 8.6 32 8.6 C 40.2 8.6 47 13.4 46.8 30 C 45.4 22 40.6 16.4 32 14.6 C 23.4 16.4 18.6 22 17.2 30 Z"
          />
          <path d="M 32 9 L 32 14.8" fill="none" stroke={hair.hi} strokeWidth="0.9" strokeLinecap="round" opacity="0.7" />
          {sheen('M 21.8 19.4 Q 25.6 13.6 30.4 12', 1.2)}
          {sheen('M 33.6 12 Q 38.4 13.6 42.2 19.4', 1.2)}
        </>
      )
    case 'low-ponytail':
      // Pulled back and smooth. The sweep strokes run DOWN-RIGHT toward
      // the nape; 'ponytail-high' sweeps up-left toward the crown, which
      // is the only reason the two fronts do not look identical.
      return (
        <>
          <path
            {...fill}
            d="M 17.8 24.4 C 17.8 13.4 24 8.8 32 8.8 C 40 8.8 46.2 13.4 46.2 24.4 C 45.4 19.2 43 16.2 39.4 15 Q 32 13.2 24.6 15 C 21 16.2 18.6 19.2 17.8 24.4 Z"
          />
          {[[21, 20.4], [23.4, 17], [27, 14.8]].map(([x, y], i) => (
            <path key={i} d={`M ${x} ${y} Q ${x + 9} ${y - 2.4} ${x + 17.6} ${y + 2}`} fill="none" stroke={hair.hi} strokeWidth="0.85" opacity="0.5" />
          ))}
        </>
      )
    case 'bob-bangs':
      // 단발 + 앞머리. A softly rounded hem, longest in the middle.
      return (
        <>
          <path
            {...fill}
            d="M 16.8 27.4 C 16.4 13 23.2 8.6 32 8.6 C 40.8 8.6 47.6 13 47.2 27.4 L 46 15.6 Q 39 18.2 32 18.2 Q 25 18.2 18 15.6 Z"
          />
          {sheen('M 23 13 Q 29.6 9.6 36.6 11.4', 1.3)}
        </>
      )
    case 'layered-bob':
      // No fringe: a deep side part with the shorter side tucked behind
      // the ear, so this reads as a different CUT and not as
      // 'straight-bob' with the fringe deleted.
      return (
        <>
          <path
            {...fill}
            d="M 18 25.2 C 17.6 13.8 23.8 8.8 32 8.8 C 40.2 8.8 46.6 13.8 46.6 28.8 C 45.6 20 41.4 15.4 34.2 15.4 C 28 15.4 22.4 17.6 20 22.2 C 19.2 23.6 18.5 24.4 18 25.2 Z"
          />
          {sheen('M 24.6 12.4 Q 32.4 9.8 39.6 13', 1.4)}
          {sheen('M 40.2 15.4 Q 43.6 17.8 44.8 22.4', 1)}
        </>
      )
    case 'two-block':
      // 투블럭. The SIDES are clipper-short and the top overhangs them
      // with a visible step — that step is the whole style. The short
      // sides are drawn over the head for the same reason
      // 'undercut-fade' does it: behind the head they fall inside the
      // skull outline and never show at all.
      return (
        <>
          <path d="M 18.8 19.6 Q 17.5 25.4 18.4 32 L 23 31.2 Q 22 25.4 22.8 19.6 Z" fill={mix(hair.base, skin, 0.32)} />
          <path d="M 45.2 19.6 Q 46.5 25.4 45.6 32 L 41 31.2 Q 42 25.4 41.2 19.6 Z" fill={mix(hair.base, skin, 0.32)} />
          <path
            {...fill}
            d="M 17.4 22.4 C 17.4 11.4 23.8 8.2 32 8.2 C 40.2 8.2 46.6 11.4 46.6 22.4 L 45.8 17.4 Q 39.6 18.8 33 18.2 Q 25.4 17.4 18.4 13.8 Z"
          />
          {sheen('M 23 12.6 Q 30 9.2 37.2 11', 1.3)}
          {sheen('M 38 11.4 Q 42.4 12.8 44.6 16.6', 1)}
        </>
      )
    case 'crop-neat':
      // A short, even school crop — one length all round, tidy hem.
      // Where 'two-block' steps and 'crop-side' sweeps, this does
      // neither, and the flat hem is what says "cut last month".
      return (
        <>
          <path
            {...fill}
            d="M 17.8 25.4 C 17.8 14 24 8.8 32 8.8 C 40 8.8 46.2 14 46.2 25.4 C 45.9 20.4 45 18.2 43.4 17 Q 38 19.4 32 19.2 Q 26 19 20.6 16.6 C 19 17.8 18.1 20.4 17.8 25.4 Z"
          />
          {sheen('M 24 13 Q 31.4 10 38.6 12.2', 1.2)}
        </>
      )
    case 'half-up':
      // The front sections are taken back, so the temples show and the
      // parting notch at the centre is visible under the gathered mound
      // drawn in HairBack.
      return (
        <>
          <path
            {...fill}
            d="M 17.6 26.6 C 17.6 13.6 24 8.6 32 8.6 C 40 8.6 46.4 13.6 46.4 26.6 C 45.6 19.4 40.8 15.8 34.6 15.4 Q 32 15.2 32 12.6 Q 32 15.2 29.4 15.4 C 23.2 15.8 18.4 19.4 17.6 26.6 Z"
          />
          {sheen('M 21.6 20.4 Q 25.4 14.4 30.2 12.8', 1.2)}
          {sheen('M 33.8 12.8 Q 38.6 14.4 42.4 20.4', 1.2)}
        </>
      )
    case 'bald':
      return <path d="M 25.4 15 Q 29.8 12.2 35 13.8" fill="none" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.2" strokeLinecap="round" />
    case 'bun-top':
      return (
        <>
          <path
            {...fill}
            d="M 17.6 25.4 C 17.6 14.4 24 9.4 32 9.4 C 40 9.4 46.4 14.4 46.4 25.4 C 45.2 18.2 39.6 15 32 15 C 24.4 15 18.8 18.2 17.6 25.4 Z"
          />
          {[[22.4, 17.2], [27, 14], [32, 12.8], [37, 14], [41.6, 17.2]].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="2.7" fill={hair.base} />
          ))}
          <path d="M 20 24.4 Q 18.4 29.4 19.4 33.4" fill="none" stroke={hair.base} strokeWidth="2.2" strokeLinecap="round" />
        </>
      )
    case 'hijab':
      // One path, fill-rule evenodd: the outer drape minus the face
      // opening. Drawn LAST so it covers the neck and the garment's
      // shoulder line the way real fabric does, without needing a clip.
      return (
        <>
          <path
            fillRule="evenodd"
            fill={cover}
            stroke={darken(cover, 0.24)}
            strokeWidth="0.85"
            d="M 32 6.6 C 19.4 6.6 13.6 16.4 13.6 27.6 C 13.6 38 15.6 46 18.6 51.4 C 21.6 56.8 26 58.4 32 58.4 C 38 58.4 42.4 56.8 45.4 51.4 C 48.4 46 50.4 38 50.4 27.6 C 50.4 16.4 44.6 6.6 32 6.6 Z M 32 11.6 C 22.4 11.6 17.8 19.8 17.8 28.4 C 17.8 38.8 24.6 47.2 32 47.2 C 39.4 47.2 46.2 38.8 46.2 28.4 C 46.2 19.8 41.6 11.6 32 11.6 Z"
          />
          <path d="M 21.6 15.6 Q 27.4 9.8 35.8 10.6" fill="none" stroke={lighten(cover, 0.3)} strokeWidth="1.5" strokeLinecap="round" opacity="0.75" />
          <path d="M 44.8 40.4 Q 47.2 46.6 44 51.6" fill="none" stroke={darken(cover, 0.16)} strokeWidth="1.3" strokeLinecap="round" />
        </>
      )
  }
}

/**
 * Render a student's chosen avatar, or `fallback` when they have none.
 *
 * `fallback` is a NODE, not a flag, and that is the point: the initials
 * avatar is not identical across surfaces (friends uses an hsl() hue off
 * the display name at 36px; the league uses a Tailwind class off the
 * student id, at 32px and 56px). Re-implementing "the initials avatar"
 * here would have silently changed all of them for every student who
 * never picks an avatar — i.e. everyone, on day one. Each call site keeps
 * its own existing markup and passes it in untouched.
 *
 * Unknown / retired / malformed ids take the fallback too, so a value
 * this build cannot draw degrades to initials rather than a blank disc.
 */
export function StudyAvatar({ avatarId, size = 36, label, className = '', fallback }: {
  avatarId?: string | null
  size?: number
  label?: string | null
  className?: string
  fallback: ReactNode
}) {
  const found = getStudyAvatar(avatarId)
  if (!found) return <>{fallback}</>
  return <PersonAvatar spec={found} size={size} label={label} className={className} />
}
