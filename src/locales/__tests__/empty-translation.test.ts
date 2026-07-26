/** @jest-environment node */
/**
 * Guards the "empty translation renders as the raw key" bug.
 *
 * `t()` used to do `getNestedValue(translations, key) || key`. Because ''
 * is falsy, any INTENTIONALLY EMPTY translation was replaced by the key
 * itself, so the admin settings page literally printed
 * "admin.settings.permissionsNotePrefix" on screen in Korean.
 *
 * Empty is a legitimate translation: Korean word order frequently needs
 * no leading fragment where English does ("What your ROLE grants" vs
 * "ROLE 역할에 부여된 권한입니다"). getNestedValue already returns the path
 * on a genuine miss, so the `|| key` was redundant as well as harmful.
 */
import { languages, getNestedValue } from '@/locales'

/** A key whose Korean value is deliberately blank — Korean needs no
 *  currency suffix where English does. */
const EMPTY_KEY = 'landing.home.calc.wonSuffix'

describe('getNestedValue', () => {
  it('returns an empty string for an intentionally empty translation', () => {
    const v = getNestedValue(
      languages.korean as unknown as Record<string, unknown>,
      EMPTY_KEY,
    )
    expect(v).toBe('')
  })

  it('still returns the path when a key is genuinely missing', () => {
    const key = 'admin.settings.thisKeyDoesNotExist'
    expect(
      getNestedValue(languages.korean as unknown as Record<string, unknown>, key),
    ).toBe(key)
  })

  it('an empty value is falsy, so `value || key` would resurface the bug', () => {
    // Documents precisely why the fallback must not use `||`.
    const empty = getNestedValue(
      languages.korean as unknown as Record<string, unknown>,
      EMPTY_KEY,
    )
    expect(empty || 'FELL_BACK').toBe('FELL_BACK')
    expect(empty ?? 'FELL_BACK').toBe('')
  })
})

describe('locale empty values are deliberate', () => {
  // If someone adds an empty translation, it must be because the target
  // language genuinely needs no text there — not because it was left
  // unfinished. Keep this list explicit so new blanks get reviewed.
  const ALLOWED_EMPTY: Record<string, string[]> = {
    english: ['landing.home.calc.unit'],
    korean: ['landing.home.calc.wonSuffix'],
  }

  const walk = (obj: Record<string, unknown>, prefix = ''): string[] => {
    const out: string[] = []
    for (const [k, v] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${k}` : k
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        out.push(...walk(v as Record<string, unknown>, path))
      } else if (typeof v === 'string' && v.trim() === '') {
        out.push(path)
      }
    }
    return out
  }

  for (const [lang, allowed] of Object.entries(ALLOWED_EMPTY)) {
    it(`${lang} has no unreviewed empty translations`, () => {
      const found = walk(
        languages[lang as keyof typeof languages] as unknown as Record<string, unknown>,
      )
      expect(found.sort()).toEqual([...allowed].sort())
    })
  }
})
