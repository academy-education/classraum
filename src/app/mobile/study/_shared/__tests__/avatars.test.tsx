/**
 * The avatar registry is a DATABASE CONTRACT, not just artwork: the ids
 * in STUDY_AVATAR_IDS are written into study_user_prefs.avatar_id and
 * read back forever. These tests pin the three things that would be
 * silent and expensive to get wrong:
 *
 *   1. ids are unique, stable, non-positional, and legal for the column
 *      (migration 071's format CHECK);
 *   2. an id this build cannot draw — retired, misspelled, hand-edited
 *      into the DB, or simply absent — renders the INITIALS fallback,
 *      never an empty disc;
 *   3. the set varies on all three axes at once, so it can't degenerate
 *      into one face in ten hues.
 */
import { render, screen } from '@testing-library/react'
import {
  STUDY_AVATARS, STUDY_AVATAR_LIST, StudyAvatar, getStudyAvatar,
} from '@/app/mobile/study/_shared/avatars'
import {
  STUDY_AVATAR_IDS, STUDY_AVATAR_ID_PATTERN, isStudyAvatarId,
} from '@/lib/study/avatars'

/** Stand-in for a call site's own initials avatar. */
const Initials = <span data-testid="initials-fallback">AB</span>

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
    for (const id of STUDY_AVATAR_IDS) {
      expect(id).not.toMatch(/\d/)
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
    ['an unregistered but well-formed id', 'raumi-nonexistent'],
    ['an empty string', ''],
    ['null', null],
    ['undefined', undefined],
    ['a number', 7],
    ['an object', { id: 'raumi-classic' }],
    ['a near-miss with different case', 'Raumi-Classic'],
  ])('rejects %s', (_label, value) => {
    expect(isStudyAvatarId(value)).toBe(false)
  })
})

describe('StudyAvatar fallback', () => {
  it('draws the chosen avatar for a known id — and NOT the fallback', () => {
    const { container } = render(
      <StudyAvatar avatarId="raumi-classic" label="Raumi Classic" fallback={Initials} />,
    )
    expect(screen.queryByTestId('initials-fallback')).toBeNull()
    // Something was actually drawn: the fallback is gone, so a blank
    // render here would otherwise pass this test.
    expect(container.querySelector('svg')).not.toBeNull()
    expect(container.querySelectorAll('svg *').length).toBeGreaterThan(5)
    expect(screen.getByLabelText('Raumi Classic')).toBeTruthy()
  })

  it.each([
    ['no avatar chosen (null)', null],
    ['the field absent (undefined)', undefined],
    ['an empty string', ''],
    ['a retired / unknown id', 'raumi-retired-2024'],
    ['a malformed id', 'DROP TABLE study_user_prefs'],
  ])('renders the initials fallback — not a blank disc — for %s', (_label, avatarId) => {
    const { container } = render(<StudyAvatar avatarId={avatarId} fallback={Initials} />)
    expect(screen.getByTestId('initials-fallback')).toBeTruthy()
    // The blank-disc failure mode: fallback missing AND nothing drawn.
    expect(container.querySelector('svg')).toBeNull()
  })

  it('resolves unknown ids to null rather than throwing', () => {
    expect(getStudyAvatar('raumi-retired-2024')).toBeNull()
    expect(getStudyAvatar(null)).toBeNull()
    expect(getStudyAvatar(undefined)).toBeNull()
    expect(getStudyAvatar('raumi-classic')?.id).toBe('raumi-classic')
  })
})

describe('the set varies on more than one axis', () => {
  // CLAUDE.md, "a batch built to one brief develops a cross-item tell":
  // ten hues of one face is exactly that shape — the set becomes
  // describable by a single rule, and picking one says nothing.
  it('gives every avatar its own expression', () => {
    const values = STUDY_AVATAR_LIST.map(s => s.expression)
    expect(new Set(values).size).toBe(values.length)
  })

  it('gives every avatar its own accessory', () => {
    const values = STUDY_AVATAR_LIST.map(s => s.accessory)
    expect(new Set(values).size).toBe(values.length)
  })

  it('gives every avatar its own colourway', () => {
    const values = STUDY_AVATAR_LIST.map(s => JSON.stringify(s.colours))
    expect(new Set(values).size).toBe(values.length)
  })

  it('gives every avatar its own eye and accent colour', () => {
    // Weaker than the whole-colourway check above, and deliberately kept:
    // two colourways could differ only in a shade nobody can see, and the
    // eye + accent are the two shapes that actually read at 32px.
    expect(new Set(STUDY_AVATAR_LIST.map(s => s.colours.eye)).size).toBe(STUDY_AVATAR_LIST.length)
    expect(new Set(STUDY_AVATAR_LIST.map(s => s.colours.accent)).size).toBe(STUDY_AVATAR_LIST.length)
  })

  it('gives every avatar its own i18n name key', () => {
    const keys = STUDY_AVATAR_LIST.map(s => s.nameKey)
    expect(new Set(keys).size).toBe(keys.length)
    for (const k of keys) expect(k.startsWith('study.prefs.avatarName.')).toBe(true)
  })
})
