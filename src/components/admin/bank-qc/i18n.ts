'use client'

import { useContext } from 'react'
import { LanguageContext } from '@/contexts/LanguageContext'
import en from '@/locales/en.json'

/**
 * Translations for the bank-QC page.
 *
 * Keys live under `admin.bankQc` in src/locales/{en,ko}.json and are passed
 * in full (`admin.bankQc.review.title`). This wrapper
 * exists because the page's panels are rendered bare in tests (no
 * LanguageProvider), and `useLanguage` throws without one. Outside a
 * provider it falls back to the English file, which is also what every
 * assertion in those tests reads.
 */
type Params = Record<string, string | number | undefined>

function lookup(fullKey: string, params?: Params): string {
  const key = fullKey.replace(/^admin\.bankQc\./, '')
  const parts = key.split('.')
  let node: unknown = (en as Record<string, unknown>).admin
  node = (node as Record<string, unknown>)?.bankQc
  for (const p of parts) node = (node as Record<string, unknown> | undefined)?.[p]
  let s = typeof node === 'string' ? node : `admin.bankQc.${key}`
  if (params) for (const [k, v] of Object.entries(params)) s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v ?? ''))
  return s
}

export type QcT = (key: string, params?: Params) => string

export function useQcT(): { t: QcT; language: 'english' | 'korean' } {
  // Read the context directly: useLanguage() throws outside a provider, and
  // these panels render bare in tests. Unconditional call keeps hook order.
  const ctx = useContext(LanguageContext)
  if (!ctx) return { t: lookup, language: 'english' }
  const { t, language } = ctx
  return {
    t: (key, params) => {
      // Call sites pass the FULL key (admin.bankQc.…) so the locale
      // coverage test can resolve every literal. t() returns the key itself
      // when a translation is missing; fall back to English then.
      const v = t(key, params)
      return v === key ? lookup(key, params) : String(v)
    },
    language,
  }
}
