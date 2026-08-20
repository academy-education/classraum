/**
 * Tests for src/lib/name.ts — the 성/이름 split helper.
 *
 * The pins here are chosen so that each one FAILS if the specific mechanism
 * it covers is removed. A test that stays green after you delete the rule it
 * describes is not evidence of anything. Mutation results are recorded in the
 * change description; if you edit name.ts, re-break each pin.
 *
 * Fixtures are real shapes from the 444-row production table, including the
 * ones the rule gets wrong.
 */
import {
  detectScript,
  hasSplitName,
  joinName,
  displayName,
  sortKey,
  initials,
  initialsFromName,
  greetingName,
  honorific,
  splitName,
  needsNamePrompt,
  guardianDisplayName,
  validateFamilyName,
  validateGivenName,
  buildNameUpdate,
} from '../name'

describe('detectScript', () => {
  it('detects Hangul syllables', () => {
    expect(detectScript('김영희')).toBe('hangul')
    expect(detectScript('김')).toBe('hangul')
  })
  it('treats Latin as latin', () => {
    expect(detectScript('Andy Lee')).toBe('latin')
  })
  it('treats a mixed string with any Hangul as hangul', () => {
    expect(detectScript('김Andy')).toBe('hangul')
  })
  it('handles null/empty', () => {
    expect(detectScript(null)).toBe('latin')
    expect(detectScript('')).toBe('latin')
  })
})

describe('joinName — script decides the separator', () => {
  it('joins Korean with no separator', () => {
    expect(joinName('김', '영희')).toBe('김영희')
  })
  it('joins Latin given-first with a space', () => {
    expect(joinName('Lee', 'Andy')).toBe('Andy Lee')
  })
  it('handles a 2-character 성 (남궁) with no special casing', () => {
    expect(joinName('남궁', '민수')).toBe('남궁민수')
  })
  it('degrades to whichever half exists', () => {
    expect(joinName('김', '')).toBe('김')
    expect(joinName('', '영희')).toBe('영희')
  })
})

describe('displayName — the NULL fallback is the common path', () => {
  it('uses the split columns when both are present (Korean)', () => {
    expect(displayName({ family_name: '김', given_name: '영희', name: '김영희' })).toBe('김영희')
  })
  it('uses the split columns when both are present (Latin)', () => {
    expect(displayName({ family_name: 'Lee', given_name: 'Andy', name: 'Andy Lee' })).toBe('Andy Lee')
  })
  it('falls back to users.name when both columns are NULL', () => {
    expect(displayName({ family_name: null, given_name: null, name: 'Sung Eun Kim' })).toBe('Sung Eun Kim')
  })
  it('falls back when only ONE column is set — a half-split is not usable', () => {
    expect(displayName({ family_name: '김', given_name: null, name: '김구' })).toBe('김구')
    expect(displayName({ family_name: null, given_name: '영희', name: '김영희' })).toBe('김영희')
  })
  it('falls back for a masked legacy label row (one of the 150)', () => {
    expect(displayName({ family_name: null, given_name: null, name: '최**' })).toBe('최**')
  })
  it('never throws on null/undefined/missing name', () => {
    expect(displayName(null)).toBe('')
    expect(displayName(undefined)).toBe('')
    expect(displayName({ family_name: null, given_name: null, name: null })).toBe('')
    expect(displayName({})).toBe('')
  })
  it('trims whitespace (3 production rows have trailing spaces)', () => {
    expect(displayName({ name: 'Eunice ' })).toBe('Eunice')
  })
})

describe('initials — must stay behaviour-identical to today name[0]', () => {
  // This is the pin that catches the plan's literal `family_name?.[0]` spec.
  it('returns the Korean surname character', () => {
    expect(initials({ family_name: '김', given_name: '영희', name: '김영희' })).toBe('김')
  })
  it('returns the GIVEN initial for Latin, matching current UI output', () => {
    expect(initials({ family_name: 'Lee', given_name: 'Andy', name: 'Andy Lee' })).toBe('A')
    // family_name[0] would be 'L' — that would silently flip every avatar.
    expect(initials({ family_name: 'Lee', given_name: 'Andy', name: 'Andy Lee' })).not.toBe('L')
  })
  it('matches the raw name[0] for every NULL row', () => {
    const rows = ['Sung Eun Kim', 'Andy', '최**', '다니엘', '서율']
    for (const name of rows) {
      expect(initials({ family_name: null, given_name: null, name })).toBe(
        detectScript(name) === 'hangul' ? name[0] : name[0].toUpperCase()
      )
    }
  })
  it('is empty, not a crash, for an empty row', () => {
    expect(initials(null)).toBe('')
    expect(initials({ name: '' })).toBe('')
  })
})

describe('initialsFromName — the one rule the ~20 string-only sites share', () => {
  it('agrees with initials() on the joined string', () => {
    expect(initialsFromName('김영희')).toBe(initials({ name: '김영희' }))
    expect(initialsFromName('Andy Lee')).toBe(initials({ name: 'Andy Lee' }))
  })
  it('ends the league/friends disagreement — ONE syllable, not two', () => {
    // league/page.tsx did `parts[0].slice(0,2)` for a single-token name and
    // rendered 김범; friends/page.tsx did `name[0]` and rendered 김.
    expect(initialsFromName('김범준')).toBe('김')
    expect(initialsFromName('김범준')).not.toBe('김범')
  })
  it('ends the AL/A disagreement — the GIVEN initial only', () => {
    expect(initialsFromName('Andy Lee')).toBe('A')
    expect(initialsFromName('Andy Lee')).not.toBe('AL')
  })
  it('returns empty (not a crash, not a literal) for missing input, so the call sites keep their own || fallback char', () => {
    expect(initialsFromName('')).toBe('')
    expect(initialsFromName(null)).toBe('')
    expect(initialsFromName(undefined)).toBe('')
    expect(initialsFromName('   ')).toBe('')
  })
})

describe('greetingName — 님 attaches to the whole name', () => {
  it('returns the WHOLE Korean name, so honorific reads 김영희님', () => {
    expect(greetingName({ name: '김영희' }, 'korean')).toBe('김영희')
    expect(greetingName({ family_name: '김', given_name: '영희', name: '김영희' }, 'korean')).toBe('김영희')
  })
  it('does not slice a relationship-label row down to the child given name', () => {
    // `.split(' ')[0]` gave '강하준' -> greeting '강하준님', addressing the
    // parent by the CHILD's name. The whole label is at least not a lie.
    expect(greetingName({ name: '강하준 아버지' }, 'korean')).toBe('강하준 아버지')
    expect(greetingName({ name: '강하준 아버지' }, 'korean')).not.toBe('강하준')
  })
  it('keeps the English given-name convention for Latin names', () => {
    expect(greetingName({ name: 'Andy Lee' }, 'english')).toBe('Andy')
    expect(greetingName({ family_name: 'Lee', given_name: 'Andy', name: 'Andy Lee' }, 'english')).toBe('Andy')
  })
  it('never slices a Hangul name even under the English locale', () => {
    expect(greetingName({ name: '김영희' }, 'english')).toBe('김영희')
  })
  it('is empty for an empty row', () => {
    expect(greetingName(null, 'korean')).toBe('')
    expect(greetingName({ name: '' }, 'english')).toBe('')
  })
})

describe('honorific', () => {
  it('appends 님 in Korean', () => {
    expect(honorific({ family_name: '김', given_name: '영희', name: '김영희' }, 'korean')).toBe('김영희님')
    expect(honorific({ name: '김영희' }, 'ko')).toBe('김영희님')
  })
  it('does not invent an English affix', () => {
    expect(honorific({ family_name: 'Lee', given_name: 'Andy', name: 'Andy Lee' }, 'english')).toBe('Andy Lee')
  })
  it('does not append 님 to an empty name', () => {
    expect(honorific({ name: '' }, 'korean')).toBe('')
  })
})

describe('sortKey', () => {
  it('keys split rows on family name first', () => {
    expect(sortKey({ family_name: 'Lee', given_name: 'Andy', name: 'Andy Lee' })).toBe('lee andy')
  })
  it('falls back to the whole string for NULL rows', () => {
    expect(sortKey({ family_name: null, given_name: null, name: 'Sung Eun Kim' })).toBe('sung eun kim')
  })
  it('preserves Korean ordering — 성 already leads the string', () => {
    const split = sortKey({ family_name: '김', given_name: '영희', name: '김영희' })
    expect(split.startsWith('김')).toBe(true)
  })
})

describe('splitName — the owner rule, and everything it must refuse', () => {
  it('splits a 3-syllable Korean name (the 202-row happy path)', () => {
    expect(splitName('김영희')).toEqual({ family_name: '김', given_name: '영희', needsConfirmation: false })
  })
  it('splits a 2-syllable Korean name but flags it', () => {
    // 김구 is a real shape; 서율 is a 2-char given name with no surname.
    // Nothing can tell them apart, so both are split AND flagged.
    expect(splitName('김구')).toEqual({ family_name: '김', given_name: '구', needsConfirmation: true })
    expect(splitName('서율')?.needsConfirmation).toBe(true)
  })
  it('splits a 2-token Latin name given-first, flagged', () => {
    expect(splitName('Andy Lee')).toEqual({ family_name: 'Lee', given_name: 'Andy', needsConfirmation: true })
  })
  it('REFUSES relationship labels — the 150-row WRONG bucket', () => {
    expect(splitName('강하준 아버지')).toBeNull()
    expect(splitName('오하윤 어머니')).toBeNull()
    // The rule would otherwise produce family_name=강, given_name='하준 아버지':
    // plausible-looking and entirely wrong. The first character is the
    // CHILD's surname, and a Korean mother keeps her own 성.
  })
  it('REFUSES an UNSPACED relationship label', () => {
    // These pin RELATION_LABEL itself. The spaced labels above are already
    // rejected by the "no internal whitespace" rule, so deleting
    // RELATION_LABEL left the whole suite green — a guard nothing tested.
    // An unspaced 3-syllable label is the case only RELATION_LABEL catches:
    // without it, 김아빠 splits happily into 김 / 아빠.
    expect(splitName('김아빠')).toBeNull()
    expect(splitName('이엄마')).toBeNull()
    expect(splitName('박보호자')).toBeNull()
  })
  it('REFUSES 다니엘 — a transliterated given name with no surname', () => {
    expect(splitName('다니엘')).toBeNull()
  })
  it('REFUSES a bare 1-syllable Korean name (empty 이름)', () => {
    expect(splitName('김')).toBeNull()
  })
  it('REFUSES 4+ syllable Korean (복성 vs 3-char given name is ambiguous)', () => {
    expect(splitName('김빛나리')).toBeNull()
    expect(splitName('남궁민수')).toBeNull()
  })
  it('REFUSES single-token Latin — no surname exists', () => {
    expect(splitName('Andy')).toBeNull()
    expect(splitName('Eunice')).toBeNull()
  })
  it('REFUSES 3+ token Latin — genuinely ambiguous boundary', () => {
    expect(splitName('Sung Eun Kim')).toBeNull()
    expect(splitName('Hara Yoo T')).toBeNull()
  })
  it('REFUSES emails and empties', () => {
    expect(splitName('andy@gmail.com')).toBeNull()
    expect(splitName('')).toBeNull()
    expect(splitName(null)).toBeNull()
    expect(splitName('   ')).toBeNull()
  })
  it('trims before splitting, so the split does not silently shift', () => {
    expect(splitName('  김영희  ')).toEqual({ family_name: '김', given_name: '영희', needsConfirmation: false })
  })
  it('round-trips: joinName(splitName(x)) === x for every accepted input', () => {
    for (const n of ['김영희', '김구', 'Andy Lee', 'Hyewon Song', '서율']) {
      const s = splitName(n)
      expect(s).not.toBeNull()
      expect(joinName(s!.family_name, s!.given_name)).toBe(n)
    }
  })
})

describe('needsNamePrompt', () => {
  it('prompts a NULL row that has not confirmed', () => {
    expect(needsNamePrompt({ family_name: null, given_name: null, name: '최**' })).toBe(true)
  })
  it('does not prompt a split row', () => {
    expect(needsNamePrompt({ family_name: '김', given_name: '영희', name: '김영희' })).toBe(false)
  })
  it('does not prompt once the user has confirmed, even while still NULL', () => {
    expect(
      needsNamePrompt({ family_name: null, given_name: null, name: 'Andy', name_confirmed_at: '2026-08-20T00:00:00Z' })
    ).toBe(false)
  })
})

describe('guardianDisplayName — built from structured fields, never the frozen label', () => {
  it('renders the Korean guardian form', () => {
    expect(guardianDisplayName('강하준', 'father', 'korean')).toBe('강하준 학생 아버지')
    expect(guardianDisplayName('오하윤', 'mother', 'korean')).toBe('오하윤 학생 어머니')
  })
  it('renders an English guardian form', () => {
    expect(guardianDisplayName('DoYeon', 'mother', 'english')).toBe("DoYeon's mother")
  })
  it('degrades without a child name', () => {
    expect(guardianDisplayName(null, 'father', 'korean')).toBe('아버지')
    expect(guardianDisplayName('', null, 'korean')).toBe('보호자')
  })
})

describe('validateFamilyName — the nameTooShort rule must NOT apply here', () => {
  it('accepts a 1-character 성 (111 of 444 accounts are 김)', () => {
    expect(validateFamilyName('김')).toBeNull()
  })
  it('accepts a 2-character 복성 — this IS the compound-surname solution', () => {
    expect(validateFamilyName('남궁')).toBeNull()
    expect(validateFamilyName('황보')).toBeNull()
  })
  it('rejects 3+ Hangul characters', () => {
    expect(validateFamilyName('김영희')).toBe('validation.familyNameTooLongKo')
  })
  it('rejects empty', () => {
    expect(validateFamilyName('')).toBe('validation.familyNameRequired')
    expect(validateFamilyName('   ')).toBe('validation.familyNameRequired')
    expect(validateFamilyName(null)).toBe('validation.familyNameRequired')
  })
  it('accepts a short Latin surname', () => {
    expect(validateFamilyName('Lee')).toBeNull()
    expect(validateFamilyName('Ng')).toBeNull()
  })
  it('rejects an absurdly long Latin surname', () => {
    expect(validateFamilyName('a'.repeat(41))).toBe('validation.familyNameTooLong')
  })
})

describe('validateGivenName', () => {
  it('accepts a 1-character 이름', () => {
    expect(validateGivenName('구')).toBeNull()
  })
  it('rejects empty', () => {
    expect(validateGivenName('')).toBe('validation.givenNameRequired')
  })
  it('rejects over-long', () => {
    expect(validateGivenName('a'.repeat(41))).toBe('validation.givenNameTooLong')
  })
})

describe('buildNameUpdate — users.name is written in the same statement, always', () => {
  it('writes all three columns for Korean', () => {
    const u = buildNameUpdate('김', '영희')
    expect(u.family_name).toBe('김')
    expect(u.given_name).toBe('영희')
    expect(u.name).toBe('김영희')
    expect(typeof u.name_confirmed_at).toBe('string')
  })
  it('writes the spaced form for Latin', () => {
    expect(buildNameUpdate('Lee', 'Andy').name).toBe('Andy Lee')
  })
  it('never produces an empty users.name from non-empty input', () => {
    expect(buildNameUpdate('  김  ', '  영희  ').name).toBe('김영희')
  })
  it('keeps displayName consistent with what it wrote', () => {
    const u = buildNameUpdate('남궁', '민수')
    expect(displayName(u)).toBe(u.name)
  })
})

describe('hasSplitName', () => {
  it('requires BOTH columns', () => {
    expect(hasSplitName({ family_name: '김', given_name: '영희' })).toBe(true)
    expect(hasSplitName({ family_name: '김', given_name: null })).toBe(false)
    expect(hasSplitName({ family_name: '  ', given_name: '영희' })).toBe(false)
    expect(hasSplitName(null)).toBe(false)
  })
})
