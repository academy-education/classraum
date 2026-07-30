/** @jest-environment node */
/**
 * Guards en/ko key parity.
 *
 * There is NO English fallback. `getNestedValue` returns the dotted PATH
 * when a key is missing, and `t()` hands that straight to JSX — so a key
 * present in only one locale renders literally as
 * "families.errorAddingFamily" on screen for users of the other language.
 * Nobody measured this until 2026-07-30, by which point the two files had
 * drifted apart by 306 leaf paths.
 *
 * Arrays are compared index by index on purpose. A five-bullet list in one
 * locale and a six-bullet list in the other is a real divergence — the
 * policy pages render `getArray(...).map(...)`, so the short locale simply
 * shows fewer bullets, silently. Comparing arrays as opaque leaves would
 * have hidden 143 of the original 306.
 */
import { languages } from '@/locales'

/**
 * Paths that are legitimately one-sided. Each entry needs a reason, and the
 * list is asserted to be MINIMAL below — an allowlisted prefix that no
 * longer matches any divergence fails the suite, so this cannot rot into a
 * dumping ground for whatever happens to be broken today.
 */
const INTENTIONALLY_ONE_SIDED: ReadonlyArray<{ prefix: string; reason: string }> = [
  {
    prefix: 'termsOfService.business.sections.',
    reason:
      'The English and Korean business terms are SEPARATE legal documents, ' +
      'not translations of each other: 29 articles in English, 22 in Korean, ' +
      'with different article bodies. src/app/terms/page.tsx renders them ' +
      'from a hardcoded per-language section list for exactly this reason. ' +
      'The consumer terms ARE a translation pair and are NOT exempt.',
  },
]

type Json = string | number | boolean | null | Json[] | { [k: string]: Json }

/** Flattens to leaf paths, expanding arrays index-wise (see header). */
const leafPaths = (value: Json, prefix = ''): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap((v, i) => leafPaths(v, prefix ? `${prefix}.${i}` : `${i}`))
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) =>
      leafPaths(v, prefix ? `${prefix}.${k}` : k),
    )
  }
  return [prefix]
}

const en = leafPaths(languages.english as unknown as Json)
const ko = leafPaths(languages.korean as unknown as Json)
const enSet = new Set(en)
const koSet = new Set(ko)

const rawEnOnly = en.filter((k) => !koSet.has(k))
const rawKoOnly = ko.filter((k) => !enSet.has(k))

const isExempt = (key: string) =>
  INTENTIONALLY_ONE_SIDED.some(({ prefix }) => key.startsWith(prefix))

describe('en/ko translation key parity', () => {
  it('every English key exists in Korean', () => {
    // toEqual on the array, not a count: a failure names the offending keys.
    expect(rawEnOnly.filter((k) => !isExempt(k))).toEqual([])
  })

  it('every Korean key exists in English', () => {
    expect(rawKoOnly.filter((k) => !isExempt(k))).toEqual([])
  })

  it('the two locales agree on array lengths', () => {
    // Redundant with the two tests above by construction, but it fails with
    // a far more readable message when a bullet list grows in one locale.
    const lengths = (value: Json, prefix = '', out: Record<string, number> = {}) => {
      if (Array.isArray(value)) {
        out[prefix] = value.length
        value.forEach((v, i) => lengths(v, `${prefix}.${i}`, out))
      } else if (value && typeof value === 'object') {
        for (const [k, v] of Object.entries(value)) {
          lengths(v, prefix ? `${prefix}.${k}` : k, out)
        }
      }
      return out
    }
    const a = lengths(languages.english as unknown as Json)
    const b = lengths(languages.korean as unknown as Json)
    const mismatched = Object.keys(a)
      .filter((k) => k in b && a[k] !== b[k] && !isExempt(k))
      .map((k) => `${k}: en=${a[k]} ko=${b[k]}`)
    expect(mismatched).toEqual([])
  })

  it('every allowlist entry still earns its place', () => {
    // The point of the allowlist is that it stays a short, deliberate list.
    // If a prefix stops matching any real divergence, delete it rather than
    // leaving a standing exemption that would mask a future regression.
    const unused = INTENTIONALLY_ONE_SIDED.filter(
      ({ prefix }) =>
        ![...rawEnOnly, ...rawKoOnly].some((k) => k.startsWith(prefix)),
    ).map(({ prefix }) => prefix)
    expect(unused).toEqual([])
  })

  it('the allowlist is short and each entry is justified', () => {
    expect(INTENTIONALLY_ONE_SIDED.length).toBeLessThanOrEqual(3)
    for (const { prefix, reason } of INTENTIONALLY_ONE_SIDED) {
      expect(prefix.length).toBeGreaterThan(0)
      expect(reason.length).toBeGreaterThan(40)
    }
  })
})
