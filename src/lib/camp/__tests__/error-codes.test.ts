/** @jest-environment node */
/**
 * Camp error codes → translated text (2026-10-23). The dashboard used to
 * show the server's raw English `json.error` in a Korean UI.
 */
import en from '@/locales/en.json'
import ko from '@/locales/ko.json'
import { CAMP_ERROR_CODES, campErrorKey, campErrorMessage } from '@/lib/camp/error-codes'
import { reviewDeckTitle } from '@/lib/camp/review-deck'

const lookup = (dict: unknown, key: string): unknown =>
  key.split('.').reduce<unknown>((node, k) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[k] : undefined), dict)

/** A tiny t(): resolves against en.json, interpolates {x}, returns the path on a miss (as the real one does). */
const t = (key: string, params: Record<string, string | number> = {}) => {
  const v = lookup(en, key)
  if (typeof v !== 'string') return key
  return v.replace(/\{\{?(\w+)\}?\}/g, (_, k) => String(params[k] ?? `{${k}}`))
}

it('every code has a non-empty string in both locales', () => {
  for (const code of CAMP_ERROR_CODES) {
    for (const dict of [en, ko]) {
      const v = lookup(dict, campErrorKey(code))
      expect(typeof v === 'string' && v.trim().length > 0 ? code : `${code}: missing`).toBe(code)
    }
  }
})

it('maps a known code with its numbers, never the raw English error', () => {
  const msg = campErrorMessage(t, { code: 'quota_exceeded', error: 'question quota exceeded', required: 10, remaining: 8 }, 'fallback')
  expect(msg).toContain('10')
  expect(msg).toContain('8')
  expect(msg).not.toContain('question quota exceeded')
})

it('falls back for a missing or unknown code instead of showing json.error', () => {
  expect(campErrorMessage(t, { error: 'Forbidden' }, 'fallback')).toBe('fallback')
  expect(campErrorMessage(t, { error: 'x', code: 'made_up' }, 'fallback')).toBe('fallback')
  expect(campErrorMessage(t, null, 'fallback')).toBe('fallback')
})

describe('reviewDeckTitle', () => {
  const fmt = (iso: string) => `D(${iso.slice(0, 10)})`
  it('shows a typed title as is', () => {
    expect(reviewDeckTitle({ title: 'Algebra recap', created_at: '2026-10-22T01:00:00Z' }, t, fmt)).toBe('Algebra recap')
  })
  it('names an untitled deck from its Korean creation date', () => {
    // 2026-10-21T20:00Z is already 10-22 in Korea.
    expect(reviewDeckTitle({ title: '', created_at: '2026-10-21T20:00:00Z' }, t, fmt)).toBe('Class review · D(2026-10-22)')
  })
  it('renders the old English default the same translated way', () => {
    expect(reviewDeckTitle({ title: 'Class review — 2026-10-20', created_at: '2026-10-21T00:00:00Z' }, t, fmt))
      .toBe('Class review · D(2026-10-20)')
  })
})
