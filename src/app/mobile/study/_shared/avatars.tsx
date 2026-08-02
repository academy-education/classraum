import type { ReactNode } from 'react'
import { STUDY_AVATAR_IDS, isStudyAvatarId, type StudyAvatarId } from '@/lib/study/avatars'

/**
 * Raumi's family — the pickable study avatars.
 *
 * These are NOT a second illustration style. Every one is built from the
 * same parts as the mascot in PathMascot.tsx, at the same proportions:
 *
 *   rounded head shell (rx ≈ half the height) + hairline tonal ring at
 *   0.8–0.9 stroke · recessed bezel one step darker than the shell ·
 *   near-black flat visor · glowing eyes as the only saturated shape
 *   inside it · seated ear pods · charcoal mechanical neck · shoulder
 *   capsule carrying the chest "C".
 *
 * The differences from PathMascot are deliberate and are about SIZE, not
 * style: these render at 32–56px in lists, where Gaussian shading turns
 * to mush. So the soft-flat two-tone shading collapses to a single
 * highlight sweep, and there are no <defs> at all — no filters, no
 * clipPaths, hence no per-instance ids to collide (the circular crop is
 * an inline border-radius on the wrapper). A hookless module also means
 * it imports cleanly anywhere.
 *
 * Everything is laid out to survive that crop: the bust deliberately
 * overruns the 64×64 box so it fills the disc, which means anything near
 * a corner is thrown away. Accessories therefore sit inside a radius-32
 * circle about (32,32), not merely inside the viewBox — an antenna ball
 * at y≈0 renders in a square preview and is sliced off in the product.
 *
 * VARIATION IS ON THREE AXES AT ONCE, never one. Each avatar has its own
 * colourway AND its own expression AND its own accessory — ten of each,
 * no repeats. Ten hues of the same face would read as one avatar with a
 * filter applied, which is the "picked a costume" feeling we want to
 * avoid; it is also how a set becomes describable by a single rule.
 */

// ── Colourways ───────────────────────────────────────────────────────
// Same roles as PathMascot's BASE / SH / HI / RING / BEZEL / EYE /
// ACCENT / NECK / STEEL, re-toned per avatar. `bg` is the disc behind
// the bust — always the palest member of its own family, so the bust
// keeps its edge without an outline.
interface Colourway {
  bg: string
  shell: string
  shellHi: string
  ring: string
  bezel: string
  visor: string
  eye: string
  accent: string
  neck: string
  chest: string
}

/** Expression, drawn inside the visor. One per avatar. */
type Expression =
  | 'round' | 'squint' | 'arc' | 'wink' | 'star'
  | 'curious' | 'sleepy' | 'scan' | 'determined' | 'wide'

/** A single small hardware detail. One per avatar. */
type Accessory =
  | 'antenna' | 'grad-cap' | 'star-clip' | 'crest' | 'headphones'
  | 'halo' | 'moon-pin' | 'signal' | 'beanie' | 'bolt-pin'

export interface StudyAvatarSpec {
  id: StudyAvatarId
  colours: Colourway
  expression: Expression
  accessory: Accessory
  /** i18n key for the accessible name. Locale entries listed in the PR. */
  nameKey: string
}

const CLASSIC: Colourway = {
  bg: '#F3F0EA', shell: '#EDE9E2', shellHi: '#F8F5F0', ring: '#DAD3C7',
  bezel: '#E0DACF', visor: '#1A1E26', eye: '#83DAF5', accent: '#7FBFE0',
  neck: '#252932', chest: '#4E6E8E',
}
const SCHOLAR: Colourway = {
  bg: '#F4EFE3', shell: '#EFE6D2', shellHi: '#F9F3E6', ring: '#DCCEB0',
  bezel: '#E6DCC4', visor: '#1C1A18', eye: '#F2C879', accent: '#C79A4A',
  neck: '#2A2620', chest: '#8A6A34',
}
const SUNNY: Colourway = {
  bg: '#FDF3E0', shell: '#FBE7C6', shellHi: '#FEF5E6', ring: '#EBCF9F',
  bezel: '#F6DFB6', visor: '#221B12', eye: '#FFC24D', accent: '#F59E2B',
  neck: '#2E2419', chest: '#B4761C',
}
const MINT: Colourway = {
  bg: '#E9F7F0', shell: '#DDF0E4', shellHi: '#F1FAF5', ring: '#B7DCC6',
  bezel: '#CFE9D9', visor: '#12211A', eye: '#5FE0B0', accent: '#34B98A',
  neck: '#1E2B25', chest: '#2E7D62',
}
const BERRY: Colourway = {
  bg: '#FBECF1', shell: '#F7DDE6', shellHi: '#FDF1F5', ring: '#E7B9CA',
  bezel: '#F2CFDC', visor: '#24141B', eye: '#FF9EC4', accent: '#E4699A',
  neck: '#2C1C22', chest: '#A84C74',
}
const VIOLET: Colourway = {
  bg: '#F1ECFB', shell: '#E6DEF8', shellHi: '#F6F2FE', ring: '#C6B7EA',
  bezel: '#DCD2F2', visor: '#191428', eye: '#B79BFF', accent: '#8B6BE8',
  neck: '#241E36', chest: '#6247B0',
}
// The one dark shell in the set. Ring goes DARKER than the shell here
// (it is a tonal edge, not an outline) and the chest "C" goes lighter,
// so the same construction still reads on a night colourway.
const MIDNIGHT: Colourway = {
  bg: '#232833', shell: '#3A4152', shellHi: '#4B5366', ring: '#262B36',
  bezel: '#333A49', visor: '#12151C', eye: '#8FD6FF', accent: '#6EA8D8',
  neck: '#1A1E27', chest: '#9FC4E4',
}
const COBALT: Colourway = {
  bg: '#E5EFFB', shell: '#D5E4F7', shellHi: '#ECF4FD', ring: '#A9C6EA',
  bezel: '#C6DAF2', visor: '#0F1826', eye: '#6FC0FF', accent: '#2F7FD8',
  neck: '#1B2534', chest: '#205FA8',
}
const CORAL: Colourway = {
  bg: '#FDEEE8', shell: '#FBDCD0', shellHi: '#FEF2ED', ring: '#EFBCA8',
  bezel: '#F7CDBB', visor: '#241611', eye: '#FFAB8A', accent: '#EE7350',
  neck: '#2E1D17', chest: '#B44F2E',
}
const FROST: Colourway = {
  bg: '#E8F6F9', shell: '#DAEFF4', shellHi: '#F1FBFD', ring: '#AFD8E2',
  bezel: '#CBE7EE', visor: '#10202A', eye: '#7EE8F5', accent: '#3EB6CE',
  neck: '#17262E', chest: '#2A7F95',
}

/**
 * The registry. Keyed by the ids in @/lib/study/avatars — `satisfies`
 * makes a missing or misspelled key a compile error, so the id list and
 * the drawings cannot drift apart silently.
 */
export const STUDY_AVATARS = {
  'raumi-classic':  { id: 'raumi-classic',  colours: CLASSIC,  expression: 'round',      accessory: 'antenna',     nameKey: 'study.prefs.avatarName.classic' },
  'raumi-scholar':  { id: 'raumi-scholar',  colours: SCHOLAR,  expression: 'squint',     accessory: 'grad-cap',    nameKey: 'study.prefs.avatarName.scholar' },
  'raumi-sunny':    { id: 'raumi-sunny',    colours: SUNNY,    expression: 'arc',        accessory: 'star-clip',   nameKey: 'study.prefs.avatarName.sunny' },
  'raumi-mint':     { id: 'raumi-mint',     colours: MINT,     expression: 'wink',       accessory: 'crest',       nameKey: 'study.prefs.avatarName.mint' },
  'raumi-berry':    { id: 'raumi-berry',    colours: BERRY,    expression: 'star',       accessory: 'headphones',  nameKey: 'study.prefs.avatarName.berry' },
  'raumi-violet':   { id: 'raumi-violet',   colours: VIOLET,   expression: 'curious',    accessory: 'halo',        nameKey: 'study.prefs.avatarName.violet' },
  'raumi-midnight': { id: 'raumi-midnight', colours: MIDNIGHT, expression: 'sleepy',     accessory: 'moon-pin',    nameKey: 'study.prefs.avatarName.midnight' },
  'raumi-cobalt':   { id: 'raumi-cobalt',   colours: COBALT,   expression: 'scan',       accessory: 'signal',      nameKey: 'study.prefs.avatarName.cobalt' },
  'raumi-coral':    { id: 'raumi-coral',    colours: CORAL,    expression: 'determined', accessory: 'beanie',      nameKey: 'study.prefs.avatarName.coral' },
  'raumi-frost':    { id: 'raumi-frost',    colours: FROST,    expression: 'wide',       accessory: 'bolt-pin',    nameKey: 'study.prefs.avatarName.frost' },
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
export function RaumiAvatar({ spec, size = 36, label, className = '' }: {
  spec: StudyAvatarSpec
  size?: number
  label?: string | null
  className?: string
}) {
  const c = spec.colours
  return (
    <div
      className={`flex-shrink-0 ${className}`}
      // The circular crop is INLINE, not a Tailwind class: it is the only
      // thing keeping the shoulder capsule (which runs past the viewBox
      // edge by design, so the bust fills the disc) inside a circle. As a
      // class it would depend on the consumer's stylesheet being present
      // and on `rounded-full` surviving purge — and the failure mode is a
      // square avatar, silently, only on some surface.
      style={{
        width: size, height: size, backgroundColor: c.bg,
        borderRadius: '50%', overflow: 'hidden',
      }}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      <svg viewBox="0 0 64 64" width={size} height={size} focusable="false">
        {/* Shoulder capsule + chest "C" — drawn first so the head and
            neck overlap it, the same stacking as the mascot. */}
        <rect x="11" y="45" width="42" height="24" rx="12" fill={c.shell} stroke={c.ring} strokeWidth="0.9" />
        <path d="M 34 51.5 A 4.4 4.4 0 1 0 34 60.3" fill="none" stroke={c.chest} strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="35.6" cy="49.8" r="1.35" fill={c.accent} />

        {/* Neck joint */}
        <rect x="26" y="38" width="12" height="10" rx="4.5" fill={c.neck} />
        <rect x="28.4" y="39.6" width="1.7" height="7" rx="0.85" fill="#3B414B" />
        <rect x="33.9" y="39.6" width="1.7" height="7" rx="0.85" fill="#3B414B" />

        {/* Ear pods */}
        <circle cx="12.2" cy="26" r="4.3" fill={c.shell} stroke={c.ring} strokeWidth="0.9" />
        <circle cx="51.8" cy="26" r="4.3" fill={c.shell} stroke={c.ring} strokeWidth="0.9" />
        <circle cx="52.8" cy="26" r="1.6" fill={c.accent} />

        {/* Head shell + the single highlight sweep that replaces the
            mascot's two-tone soft shading at this size. */}
        <rect x="14" y="7" width="36" height="35" rx="17" fill={c.shell} stroke={c.ring} strokeWidth="0.9" />
        <path d="M 20 12.5 Q 27 8.4 35 9.2 Q 26 11.6 21.6 16.4 Z" fill={c.shellHi} />

        {/* Recessed bezel + flat visor */}
        <rect x="16.2" y="13.6" width="31.6" height="24" rx="11" fill={c.bezel} stroke={c.ring} strokeWidth="0.9" />
        <rect x="17.6" y="15" width="28.8" height="21.2" rx="9.8" fill={c.visor} />
        {/* Eyes softly lighting the lower screen — the one piece of the
            mascot's glass treatment that survives at 32px. */}
        <ellipse cx="32" cy="33.6" rx="10" ry="2.6" fill={c.eye} opacity="0.14" />

        <Eyes expression={spec.expression} eye={c.eye} />
        <Accessory kind={spec.accessory} c={c} />
      </svg>
    </div>
  )
}

/** Visor contents. Centre of the screen is (32, 25.6). */
function Eyes({ expression, eye }: { expression: Expression; eye: string }) {
  const GLINT = '#EEFCFF'
  switch (expression) {
    case 'round':
      return (
        <>
          <rect x="24" y="20.6" width="5" height="10" rx="2.5" fill={eye} />
          <rect x="35" y="20.6" width="5" height="10" rx="2.5" fill={eye} />
          <circle cx="25.5" cy="23.2" r="1.25" fill={GLINT} />
          <circle cx="36.5" cy="23.2" r="1.25" fill={GLINT} />
        </>
      )
    case 'squint':
      // The mascot's 'thinking' eyes — level, narrowed, working.
      return (
        <>
          <rect x="23.4" y="23.9" width="6.6" height="3.5" rx="1.75" fill={eye} />
          <rect x="34" y="23.9" width="6.6" height="3.5" rx="1.75" fill={eye} />
        </>
      )
    case 'arc':
      // The mascot's 'celebrate' smile-arcs.
      return (
        <>
          <path d="M 22.6 28.6 Q 26.5 22.2 30.4 28.6" stroke={eye} strokeWidth="2.9" fill="none" strokeLinecap="round" />
          <path d="M 33.6 28.6 Q 37.5 22.2 41.4 28.6" stroke={eye} strokeWidth="2.9" fill="none" strokeLinecap="round" />
        </>
      )
    case 'wink':
      return (
        <>
          <rect x="24" y="20.6" width="5" height="10" rx="2.5" fill={eye} />
          <circle cx="25.5" cy="23.2" r="1.25" fill={GLINT} />
          <path d="M 33.6 27.8 Q 37.5 22.4 41.4 27.8" stroke={eye} strokeWidth="2.8" fill="none" strokeLinecap="round" />
        </>
      )
    case 'star':
      return (
        <>
          <path d="M 26.4 20.2 l 1.7 3.7 3.7 1.7 -3.7 1.7 -1.7 3.7 -1.7 -3.7 -3.7 -1.7 3.7 -1.7 z" fill={eye} />
          <path d="M 37.6 20.2 l 1.7 3.7 3.7 1.7 -3.7 1.7 -1.7 3.7 -1.7 -3.7 -3.7 -1.7 3.7 -1.7 z" fill={eye} />
        </>
      )
    case 'curious':
      // Asymmetric on purpose — one eye wide open, the other narrowed.
      return (
        <>
          <circle cx="26.2" cy="25.6" r="4.5" fill={eye} />
          <circle cx="27.6" cy="24" r="1.6" fill={GLINT} />
          <rect x="34.4" y="23.9" width="6.6" height="3.4" rx="1.7" fill={eye} />
        </>
      )
    case 'sleepy':
      return (
        <>
          <path d="M 22.8 24 Q 26.6 29.6 30.4 24" stroke={eye} strokeWidth="2.7" fill="none" strokeLinecap="round" />
          <path d="M 33.6 24 Q 37.4 29.6 41.2 24" stroke={eye} strokeWidth="2.7" fill="none" strokeLinecap="round" />
        </>
      )
    case 'scan':
      // A single lit scan bar with two brighter blocks where the eyes sit —
      // the mascot's 'thinking' sweep, frozen.
      return (
        <>
          <rect x="21.4" y="23.9" width="21.2" height="3.4" rx="1.7" fill={eye} opacity="0.32" />
          <rect x="23.2" y="23.9" width="6.4" height="3.4" rx="1.7" fill={eye} />
          <rect x="34.4" y="23.9" width="6.4" height="3.4" rx="1.7" fill={eye} />
        </>
      )
    case 'determined':
      return (
        <>
          <path d="M 22.8 19.9 L 29.6 21.9" stroke={eye} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M 41.2 19.9 L 34.4 21.9" stroke={eye} strokeWidth="2" fill="none" strokeLinecap="round" />
          <rect x="24.2" y="23.2" width="5.2" height="7.6" rx="2.6" fill={eye} />
          <rect x="34.6" y="23.2" width="5.2" height="7.6" rx="2.6" fill={eye} />
        </>
      )
    case 'wide':
      return (
        <>
          <circle cx="26.2" cy="25.6" r="5.1" fill={eye} />
          <circle cx="37.8" cy="25.6" r="5.1" fill={eye} />
          <circle cx="27.8" cy="23.6" r="1.8" fill={GLINT} />
          <circle cx="39.4" cy="23.6" r="1.8" fill={GLINT} />
          <circle cx="24.8" cy="28" r="0.95" fill={GLINT} opacity="0.65" />
          <circle cx="36.4" cy="28" r="0.95" fill={GLINT} opacity="0.65" />
        </>
      )
  }
}

/** One small hardware detail, drawn over the head. */
function Accessory({ kind, c }: { kind: Accessory; c: Colourway }) {
  switch (kind) {
    case 'antenna':
      return (
        <>
          <rect x="31.2" y="4.4" width="1.7" height="4.4" rx="0.85" fill={c.ring} />
          <circle cx="32" cy="4.4" r="2.6" fill={c.accent} />
        </>
      )
    case 'grad-cap':
      return (
        <>
          <rect x="24.6" y="5.4" width="14.8" height="4.6" rx="1.6" fill={c.neck} />
          <path d="M 32 0.6 L 46.4 6 L 32 11.4 L 17.6 6 Z" fill={c.neck} />
          <path d="M 46.4 6 L 46.4 11.6" stroke={c.accent} strokeWidth="1.3" strokeLinecap="round" />
          <circle cx="46.4" cy="12.4" r="1.7" fill={c.accent} />
        </>
      )
    case 'star-clip':
      return <path d="M 45.6 4.6 l 1.6 3.3 3.3 1.6 -3.3 1.6 -1.6 3.3 -1.6 -3.3 -3.3 -1.6 3.3 -1.6 z" fill={c.accent} />
    case 'crest':
      // A three-spike fin along the crown.
      return <path d="M 23.6 9.4 L 26.6 3.2 L 29.6 8 L 32.6 1.4 L 35.6 8 L 38.6 3.2 L 41.6 9.4 Z" fill={c.accent} />
    case 'headphones':
      return (
        <>
          <path d="M 11 27 A 21 22 0 0 1 53 27" fill="none" stroke={c.ring} strokeWidth="4.4" strokeLinecap="round" />
          <path d="M 11 27 A 21 22 0 0 1 53 27" fill="none" stroke={c.accent} strokeWidth="2.6" strokeLinecap="round" />
          <rect x="6.8" y="21" width="9.4" height="13" rx="4.7" fill={c.accent} />
          <rect x="47.8" y="21" width="9.4" height="13" rx="4.7" fill={c.accent} />
        </>
      )
    case 'halo':
      return <ellipse cx="32" cy="3.6" rx="10.4" ry="3" fill="none" stroke={c.accent} strokeWidth="2.1" />
    case 'moon-pin':
      return <path d="M 47.6 4.4 a 4.4 4.4 0 1 0 0 8.4 a 3.3 3.3 0 1 1 0 -8.4 z" fill={c.accent} />
    case 'signal':
      return (
        <>
          <rect x="51.6" y="20.4" width="2.1" height="3.4" rx="1" fill={c.accent} />
          <rect x="54.8" y="17.8" width="2.1" height="6" rx="1" fill={c.accent} />
          <rect x="58" y="15.2" width="2.1" height="8.6" rx="1" fill={c.accent} opacity="0.55" />
        </>
      )
    case 'beanie':
      return (
        <>
          <path d="M 16.4 12.6 A 16 16 0 0 1 47.6 12.6 Z" fill={c.accent} />
          <rect x="15" y="10.6" width="34" height="4.4" rx="2.2" fill={c.accent} />
          <rect x="15" y="10.6" width="34" height="4.4" rx="2.2" fill="#FFFFFF" opacity="0.25" />
          {/* Pale bobble, not another accent circle: the dome's own arc
              crests at y≈0, so an accent-on-accent pom is invisible. */}
          <circle cx="32" cy="4.6" r="3.1" fill={c.shellHi} stroke={c.accent} strokeWidth="0.9" />
        </>
      )
    case 'bolt-pin':
      return <path d="M 56.4 35.6 L 51.4 43.4 L 54.8 43.4 L 53.2 49.4 L 58.6 41 L 55.2 41 Z" fill={c.accent} />
  }
}

/**
 * Render a student's chosen avatar, or `fallback` when they have none.
 *
 * `fallback` is a NODE, not a flag, and that is the point: the initials
 * avatar is not identical across surfaces (friends uses an hsl() hue off
 * the display name; the league uses a Tailwind class off the student id,
 * at three different sizes). Re-implementing "the initials avatar" here
 * would have silently changed all of them for every student who never
 * picks an avatar — i.e. everyone, on day one. Each call site keeps its
 * own existing markup and passes it in untouched.
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
  const spec = getStudyAvatar(avatarId)
  if (!spec) return <>{fallback}</>
  return <RaumiAvatar spec={spec} size={size} label={label} className={className} />
}
