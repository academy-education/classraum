/**
 * The avatar registry is a DATABASE CONTRACT, not just artwork: the ids
 * in STUDY_AVATAR_IDS are written into study_user_prefs.avatar_id and
 * read back forever. These tests pin the things that would be silent and
 * expensive to get wrong:
 *
 *   1. ids are unique, stable, non-positional, and legal for the column
 *      (migration 071's format CHECK);
 *   2. an id this build cannot draw — retired, misspelled, hand-edited
 *      into the DB, or simply absent — renders the INITIALS fallback,
 *      never an empty disc;
 *   3. the RANGE holds: the skin ramp really spans the range it claims,
 *      the hair is not one silhouette recoloured, and no single face,
 *      tone or texture dominates the set.
 *
 * What these tests DO NOT and CANNOT check is in the block at the
 * bottom of the file. Read it before trusting a green run.
 */
import { render, screen } from '@testing-library/react'
import {
  STUDY_AVATARS, STUDY_AVATAR_LIST, StudyAvatar, getStudyAvatar,
  SKIN_RAMP, HAIR_COLOURS, HAIR_STYLES, skinLightness,
  type SkinTone,
} from '@/app/mobile/study/_shared/avatars'
import {
  STUDY_AVATAR_IDS, STUDY_AVATAR_ID_PATTERN, isStudyAvatarId,
} from '@/lib/study/avatars'
import { languages } from '@/locales'

const en = languages.english
const ko = languages.korean

/** Stand-in for a call site's own initials avatar. */
const Initials = <span data-testid="initials-fallback">AB</span>

const ANY = STUDY_AVATAR_IDS[0]

describe('study avatar ids', () => {
  it('are unique', () => {
    expect(new Set(STUDY_AVATAR_IDS).size).toBe(STUDY_AVATAR_IDS.length)
  })

  it('are non-empty strings that satisfy the column constraint in migration 071', () => {
    for (const id of STUDY_AVATAR_IDS) {
      expect(typeof id).toBe('string')
      // The DB CHECK is `avatar_id ~ '^[a-z][a-z0-9-]{1,31}$'`. An id that
      // fails here is one the picker offers and the database rejects.
      expect(id).toMatch(STUDY_AVATAR_ID_PATTERN)
      expect(id.length).toBeLessThanOrEqual(32)
    }
  })

  it('are semantic, never positional — a positional id invites renumbering', () => {
    for (const id of STUDY_AVATAR_IDS) expect(id).not.toMatch(/\d/)
  })

  it('never name a skin tone, ethnicity or gender', () => {
    // An id is permanent, greppable and visible in the network tab. A
    // label like `person-asian` or `person-dark` would be a claim about
    // the student stored against their row forever, and the drawing
    // could never be re-styled without the id becoming a lie.
    const FORBIDDEN = /\b(asian|black|white|brown|tan|dark|light|fair|pale|deep|african|latino|latina|hispanic|caucasian|european|arab|indian|korean|japanese|chinese|boy|girl|man|woman|male|female|guy|lady)\b/
    for (const id of STUDY_AVATAR_IDS) {
      expect(id.replace(/-/g, ' ')).not.toMatch(FORBIDDEN)
    }
  })

  it('has an entry drawn for exactly the canonical id list', () => {
    // Guards both directions: an id with no drawing (picker renders
    // nothing) and a drawing with no id (unreachable art).
    expect(Object.keys(STUDY_AVATARS).sort()).toEqual([...STUDY_AVATAR_IDS].sort())
    expect(STUDY_AVATAR_LIST.map(s => s.id)).toEqual([...STUDY_AVATAR_IDS])
  })

  it('gives every entry a self-consistent id', () => {
    for (const id of STUDY_AVATAR_IDS) expect(STUDY_AVATARS[id].id).toBe(id)
  })
})

describe('isStudyAvatarId', () => {
  it('accepts every registered id', () => {
    for (const id of STUDY_AVATAR_IDS) expect(isStudyAvatarId(id)).toBe(true)
  })

  it.each([
    ['a retired robot id from the previous set', 'raumi-classic'],
    ['an unregistered but well-formed id', 'person-nonexistent'],
    ['an empty string', ''],
    ['null', null],
    ['undefined', undefined],
    ['a number', 7],
    ['an object', { id: 'person-aster' }],
    ['a near-miss with different case', 'Person-Aster'],
  ])('rejects %s', (_label, value) => {
    expect(isStudyAvatarId(value)).toBe(false)
  })
})

describe('StudyAvatar fallback', () => {
  it('draws the chosen avatar for a known id — and NOT the fallback', () => {
    const { container } = render(
      <StudyAvatar avatarId={ANY} label="A person" fallback={Initials} />,
    )
    expect(screen.queryByTestId('initials-fallback')).toBeNull()
    // Something was actually drawn: the fallback is gone, so a blank
    // render here would otherwise pass this test.
    expect(container.querySelector('svg')).not.toBeNull()
    expect(container.querySelectorAll('svg *').length).toBeGreaterThan(5)
    expect(screen.getByLabelText('A person')).toBeTruthy()
  })

  it.each([
    ['no avatar chosen (null)', null],
    ['the field absent (undefined)', undefined],
    ['an empty string', ''],
    ['a retired / unknown id', 'raumi-classic'],
    ['a malformed id', 'DROP TABLE study_user_prefs'],
  ])('renders the initials fallback — not a blank disc — for %s', (_label, avatarId) => {
    const { container } = render(<StudyAvatar avatarId={avatarId} fallback={Initials} />)
    expect(screen.getByTestId('initials-fallback')).toBeTruthy()
    // The blank-disc failure mode: fallback missing AND nothing drawn.
    expect(container.querySelector('svg')).toBeNull()
  })

  it('resolves unknown ids to null rather than throwing', () => {
    expect(getStudyAvatar('raumi-classic')).toBeNull()
    expect(getStudyAvatar(null)).toBeNull()
    expect(getStudyAvatar(undefined)).toBeNull()
    expect(getStudyAvatar(ANY)?.id).toBe(ANY)
  })
})

describe('every preset actually renders', () => {
  it.each(STUDY_AVATAR_LIST.map(s => [s.id, s] as const))('%s draws a non-trivial figure', (_id, s) => {
    // A style whose switch fell through to `null` on both layers would
    // still render a head — this catches the emptier failure of a spec
    // pointing at geometry nobody wrote.
    const { container } = render(<StudyAvatar avatarId={s.id} fallback={Initials} />)
    expect(container.querySelectorAll('svg *').length).toBeGreaterThan(12)
  })

  it('emits no id/url() references, which would collide across instances', () => {
    // Twenty of these render on one leaderboard. A <defs> gradient or
    // filter id would be duplicated and the last one drawn would win,
    // silently restyling every earlier avatar on the page.
    const { container } = render(
      <>{STUDY_AVATAR_LIST.map(s => <StudyAvatar key={s.id} avatarId={s.id} fallback={Initials} />)}</>,
    )
    expect(container.innerHTML).not.toMatch(/url\(#/)
    expect(container.querySelector('defs')).toBeNull()
    expect(container.querySelector('[id]')).toBeNull()
  })
})

// ── Range ────────────────────────────────────────────────────────────
// CLAUDE.md, "a batch built to one brief develops a cross-item tell":
// eighteen recolours of one face is exactly that shape — the set becomes
// describable by a single rule, and picking one says nothing.

describe('the skin ramp', () => {
  const TONES = Object.keys(SKIN_RAMP) as SkinTone[]

  it('has the documented number of rungs', () => {
    expect(TONES).toHaveLength(8)
  })

  it('has 8 distinct base colours — no rung is a duplicate of another', () => {
    expect(new Set(TONES.map(t => SKIN_RAMP[t].base)).size).toBe(8)
  })

  it('descends monotonically from very fair to deep', () => {
    const ls = TONES.map(skinLightness)
    for (let i = 1; i < ls.length; i++) expect(ls[i]).toBeLessThan(ls[i - 1])
    // The range really is fair → deep, not "six creams and a tan".
    expect(ls[0]).toBeGreaterThan(200)
    expect(ls[ls.length - 1]).toBeLessThan(60)
  })

  it('is EVENLY spaced — no rung clustered against its neighbour', () => {
    // The specific defect the brief calls out: five light tones plus one
    // dark one passes a "6 distinct tones" count and fails the point.
    const ls = TONES.map(skinLightness)
    const gaps = ls.slice(1).map((v, i) => ls[i] - v)
    const min = Math.min(...gaps)
    const max = Math.max(...gaps)
    expect(min).toBeGreaterThan(15)
    expect(max / min).toBeLessThan(2)
  })

  it('gives each rung its own darker shade and a distinct line colour', () => {
    for (const tone of TONES) {
      const { base, shade, line, lip } = SKIN_RAMP[tone]
      expect(shade).not.toBe(base)
      // A shared grey for the nose/lid line reads as dirt on fair skin
      // and disappears on deep skin, so each rung carries its own.
      expect(new Set([base, shade, line, lip]).size).toBe(4)
    }
  })
})

describe('the set spans the range it claims', () => {
  const list = STUDY_AVATAR_LIST

  it('ships at least 16 presets', () => {
    expect(list.length).toBeGreaterThanOrEqual(16)
  })

  it('uses EVERY rung of the skin ramp, at least twice each', () => {
    const used = new Map<string, number>()
    for (const s of list) used.set(s.skin, (used.get(s.skin) ?? 0) + 1)
    expect([...used.keys()].sort()).toEqual(Object.keys(SKIN_RAMP).sort())
    // A tone represented once is a token, and a token is what a student
    // notices. Reported as a map so the failure names the thin rungs.
    expect(Object.fromEntries([...used].filter(([, n]) => n < 2))).toEqual({})
  })

  it('does not lean light — deep tones are a real share of the set', () => {
    // tone-6..8 are the deep end. A set that offers them once each while
    // spending twelve slots on tone-1..3 has a ramp and not a range.
    const deep = list.filter(s => ['tone-6', 'tone-7', 'tone-8'].includes(s.skin)).length
    expect(deep / list.length).toBeGreaterThanOrEqual(0.25)
  })

  it('is not one silhouette recoloured — every preset has its own hair style', () => {
    const styles = list.map(s => s.hair)
    expect(new Set(styles).size).toBe(styles.length)
  })

  it('covers at least 7 hair TEXTURE families, none of them dominant', () => {
    // Style count alone is satisfiable by eighteen straight cuts. The
    // texture family is the thing the brief is actually about.
    const textures = list.map(s => HAIR_STYLES[s.hair].texture)
    const counts = new Map<string, number>()
    for (const t of textures) counts.set(t, (counts.get(t) ?? 0) + 1)
    expect(counts.size).toBeGreaterThanOrEqual(7)
    expect(Math.max(...counts.values()) / list.length).toBeLessThanOrEqual(0.35)
  })

  it('includes coily, braided, locs, a covered head and a bald option', () => {
    const textures = new Set(list.map(s => HAIR_STYLES[s.hair].texture))
    for (const required of ['coily', 'braided', 'locs', 'covered', 'none', 'cropped'] as const) {
      expect(textures.has(required)).toBe(true)
    }
  })

  it('covers black, brown, blonde, grey/white and fashion hair colours', () => {
    const used = new Set<string>(list.map(s => s.hairColour))
    expect(used.size).toBeGreaterThanOrEqual(8)
    for (const required of ['black', 'dark-brown', 'light-brown', 'blonde', 'grey', 'white']) {
      expect(used.has(required)).toBe(true)
    }
    // At least one clearly non-natural colour.
    expect(['lavender', 'teal'].some(c => used.has(c))).toBe(true)
    for (const s of list) expect(HAIR_COLOURS[s.hairColour]).toBeDefined()
  })

  it('varies the FACE, not only the hair', () => {
    // "A mix that does not read as gendered pairs of the same face."
    const faces = new Set(list.map(s => s.face))
    expect(faces.size).toBeGreaterThanOrEqual(5)
    const eyes = new Set(list.map(s => s.eyes))
    expect(eyes.size).toBeGreaterThanOrEqual(5)
    expect(new Set(list.map(s => s.brow)).size).toBeGreaterThanOrEqual(4)
    expect(new Set(list.map(s => s.mouth)).size).toBeGreaterThanOrEqual(4)
  })

  it('does not achieve variety through accessories', () => {
    // Most presets wear nothing, and no two presets are separated by
    // their accessory alone.
    const withAcc = list.filter(s => s.accessory !== 'none')
    expect(withAcc.length / list.length).toBeLessThan(0.5)
    const withoutAccessory = list.map(s => JSON.stringify({
      ...s, accessory: null, id: null, nameKey: null,
    }))
    expect(new Set(withoutAccessory).size).toBe(list.length)
  })

  it('gives every preset a silhouette against its own backdrop', () => {
    // The exact defect the previous robot set shipped: one colourway
    // whose bust matched its disc and vanished. Checked for BOTH the
    // face and the hair, because white hair on a pale disc fails the
    // same way a fair face on a peach disc does.
    const tooClose = list.flatMap(s => [
      ['skin', s.id, contrast(s.bg, SKIN_RAMP[s.skin].base), 1.14] as const,
      ['hair', s.id, contrast(s.bg, HAIR_COLOURS[s.hairColour].base), 1.3] as const,
      ['garment', s.id, contrast(s.bg, s.clothes), 1.2] as const,
    ]).filter(([, , ratio, floor]) => ratio <= floor)
      .map(([part, id, ratio]) => `${id} ${part} ${ratio.toFixed(3)}`)
    expect(tooClose).toEqual([])
  })

  it('gives every preset its own i18n name key, defined in BOTH locales', () => {
    const keys = list.map(s => s.nameKey)
    expect(new Set(keys).size).toBe(keys.length)
    for (const k of keys) {
      expect(k.startsWith('study.prefs.avatarName.')).toBe(true)
      expect(typeof lookup(en, k)).toBe('string')
      expect(typeof lookup(ko, k)).toBe('string')
    }
  })

  it('leaves no orphaned avatarName keys behind in either locale', () => {
    const live = new Set(list.map(s => s.nameKey.split('.').pop()))
    for (const locale of [en, ko]) {
      const group = lookup(locale, 'study.prefs.avatarName') as Record<string, string>
      expect(Object.keys(group).sort()).toEqual([...live].sort())
    }
  })
})

/**
 * ── What these tests cannot check ───────────────────────────────────
 *
 * They CANNOT tell you the art looks good. Every assertion above is
 * about numbers in a table; not one of them opens a picture. In
 * particular they cannot see:
 *
 *   · whether a face reads as a PERSON at 32px, or as a smudge — the
 *     only way to know is to render it at 32/52/120 and look;
 *   · whether a hair path is clipped by the circular crop. The geometry
 *     is placed against a radius-31 circle by hand and a stray
 *     coordinate would pass everything here;
 *   · whether two presets look alike despite differing in the table
 *     (two "distinct" face shapes can be indistinguishable at size);
 *   · whether the hair silhouettes read as the textures they are
 *     labelled — HAIR_STYLES's texture field is an assertion by the
 *     author, not a measurement of the path data;
 *   · whether the set feels respectful or stereotyped. That is a
 *     judgement about art and it needs human eyes.
 */

// ── helpers ──────────────────────────────────────────────────────────

function lookup(obj: unknown, dotted: string): unknown {
  return dotted.split('.').reduce<unknown>(
    (acc, k) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[k] : undefined),
    obj,
  )
}

/** WCAG relative luminance, on #rrggbb. */
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
