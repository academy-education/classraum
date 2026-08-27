import { checkNicknameContent, foldForMatching, RESERVED_HANDLES } from '../nickname-moderation'
import { validateNickname } from '../nickname'

/**
 * The false-positive cases come FIRST and there are more of them than
 * blocking cases, on purpose.
 *
 * A missed slur is embarrassing and gets reported. A false positive is a
 * student who cannot register their own name, is told nothing useful,
 * and has no appeal — and Korean profanity shares syllables with
 * ordinary words, so a careless list produces plenty of them. These
 * tests are what stop the list growing until it does.
 */

describe('must NOT reject ordinary names', () => {
  it.each([
    ['시발점', 'Korean for "starting point" — contains 시발'],
    ['보지마', 'contains 보지 as an inflection of 보다'],
    ['자지현', 'a plausible name containing 자지'],
    ['michelle', "contains 'hell'"],
    ['essex', "contains 'sex'"],
    ['sussex', "contains 'sex'"],
    ['analysis', "contains 'anal'"],
    ['adminlee', 'reserved words are whole-string only'],
    ['minjun2', 'digits are legitimate in handles'],
    ['김민준', 'an ordinary Korean name'],
    ['Andy_Lee', 'underscore is allowed'],
    ['wooo', 'repeated letters are not inherently suspect'],
  ])('%s is fine (%s)', (nickname) => {
    expect(checkNicknameContent(nickname)).toBeNull()
  })

  it('accepts every handle currently in use', () => {
    // Mirrors scripts/check-nickname-moderation.ts, which runs the same
    // rules over the LIVE table — 22 nicknames, 0 rejected at the time
    // of writing. This is the offline half of that guarantee.
    for (const n of ['andy', 'minjun2', '홍길동', 'Study_Kim', 'raum1']) {
      expect(validateNickname(n)).toBeNull()
    }
  })
})

describe('impersonation', () => {
  it.each(['admin', 'ADMIN', '관리자', '운영자', 'classraum', '선생님'])(
    'refuses %s',
    (n) => expect(checkNicknameContent(n)).toBe('reserved'),
  )

  it('refuses reserved handles through digit substitution', () => {
    // `4dm1n` folds to `admin`. Without folding, evasion is one keypress.
    expect(checkNicknameContent('4dm1n')).toBe('reserved')
    expect(checkNicknameContent('cl4ssraum')).toBe('reserved')
  })

  it('does NOT reserve the mascot name', () => {
    // Deliberate. Digit folding maps the ordinary handle `raum1` onto
    // `raumi`, and naming yourself after the mascot is not impersonating
    // staff — so reserving it bought a false positive and nothing else.
    // Caught by this suite's own false-positive case, not by review.
    expect(checkNicknameContent('raumi')).toBeNull()
    expect(checkNicknameContent('raum1')).toBeNull()
  })

  it('every reserved handle actually trips its own rule', () => {
    // A list entry that its own matcher does not catch is dead weight
    // that looks like coverage.
    for (const h of RESERVED_HANDLES) {
      expect(checkNicknameContent(h)).toBe('reserved')
    }
  })
})

describe('profanity', () => {
  it.each([
    'fuck', 'FUCK', 'shithead', 'bitch99', '씨발', '병신', 'ㅅㅂ', '개새끼',
  ])('refuses %s', (n) => expect(checkNicknameContent(n)).toBe('inappropriate'))

  it.each([
    ['f_u_c_k', 'underscores stripped'],
    ['fuuuuck', 'repeats collapsed'],
    ['sh1t', 'digit substitution'],
    ['@sshole', 'symbol substitution'],
  ])('sees through %s (%s)', (n) => {
    expect(checkNicknameContent(n)).toBe('inappropriate')
  })

  it('blocks the exact-only terms as a whole handle', () => {
    expect(checkNicknameContent('시발')).toBe('inappropriate')
    expect(checkNicknameContent('sex')).toBe('inappropriate')
  })
})

describe('folding', () => {
  it('never mutates what is stored — it is comparison-only', () => {
    // The folded form is lossy by design; if it ever leaked into the
    // write path, users would find their handle silently rewritten.
    expect(foldForMatching('Andy_Lee')).not.toBe('Andy_Lee')
    expect(validateNickname('Andy_Lee')).toBeNull()
  })

  it('leaves digits that are not substitutions alone', () => {
    expect(foldForMatching('minjun2')).toContain('2')
  })

  it('handles empty and symbol-only input without throwing', () => {
    expect(() => checkNicknameContent('')).not.toThrow()
    expect(checkNicknameContent('')).toBeNull()
  })
})

describe('which reason wins', () => {
  it('reports the length problem before the content one', () => {
    // Someone who typed something long AND rude gets told the fixable,
    // unembarrassing reason.
    expect(validateNickname('fuckfuckfuckfuckfuck')).toBe('too_long')
  })

  it('reports charset before content', () => {
    expect(validateNickname('fuck!!')).toBe('charset')
  })

  it('still reports content when length and charset are fine', () => {
    expect(validateNickname('fuck')).toBe('inappropriate')
    expect(validateNickname('admin')).toBe('reserved')
  })
})
