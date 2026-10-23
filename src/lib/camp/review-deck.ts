import { kstDate } from '@/lib/camp/dates'

/**
 * The title to show for a review deck.
 *
 * A deck built without a title is stored with title '' (since
 * 2026-10-23) and named here, in the viewer's language, from its
 * creation date. Before that the server stored an English
 * "Class review — YYYY-MM-DD" built from the UTC date; those rows are
 * recognised and rendered the same translated way, so old and new decks
 * read alike in a Korean UI. A title the teacher typed is shown as is.
 *
 * Client-safe (kstDate is pure Intl).
 */
const LEGACY_DEFAULT = /^Class review — (\d{4}-\d{2}-\d{2})$/

type Translate = (key: string, params?: Record<string, string | number>) => unknown

export function reviewDeckTitle(
  deck: { title: string | null | undefined; created_at?: string | null; createdAt?: string | null },
  t: Translate,
  formatDate: (iso: string) => string,
): string {
  const raw = (deck.title ?? '').trim()
  const legacy = LEGACY_DEFAULT.exec(raw)
  if (raw && !legacy) return raw
  const created = deck.created_at ?? deck.createdAt ?? null
  const day = legacy?.[1] ?? (created ? kstDate(created) : null)
  // Noon, so formatting a bare date in any browser timezone cannot slip a day.
  const label = day ? formatDate(`${day}T12:00:00`) : ''
  return String(t('camp.reviewSets.defaultTitle', { date: label }))
}
