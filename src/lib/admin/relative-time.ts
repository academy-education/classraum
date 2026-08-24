/**
 * relativeTimeParts — pick the right UNIT for an elapsed interval.
 *
 * The admin academy detail card used to render its "Last active" figure as
 *
 *     Math.floor((Date.now() - lastActive) / (1000 * 60 * 60)) + 'h ago'
 *
 * with no rollup at all, so an academy last seen seven and a half months ago
 * read "5427h ago". That is technically true and operationally useless — no
 * reader converts 5427 hours into "about seven months" at a glance, and the
 * number is wide enough that it reads as an id rather than a duration.
 *
 * This returns a locale KEY plus its interpolation params rather than a
 * finished string, so the same ladder serves English and Korean and can be
 * unit-tested without a translation table. The caller does
 *
 *     const { key, params } = relativeTimeParts(when)
 *     t(`admin.academies.${key}`, params)
 *
 * Every branch boundary is pinned in relative-time.test.ts.
 */

export type RelativeTimeKey =
  | 'justNow'
  | 'minutesAgo'
  | 'hoursAgo'
  | 'daysAgo'
  | 'monthsAgo'
  | 'yearsAgo'

export interface RelativeTimeParts {
  key: RelativeTimeKey
  /**
   * Exactly one entry, named after the unit — `{ hours: 3 }` for
   * `hoursAgo`, `{}` for `justNow`. Named per-unit rather than a generic
   * `count` because the existing `admin.academies.hoursAgo` string already
   * interpolates `{hours}`, and renaming a shipped key to suit a helper is
   * churn for no reader benefit.
   */
  params: Record<string, number>
}

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * Calendar-ish approximations. A month is 30 days and a year 365; both are
 * wrong in the small and right in the way that matters for a card that says
 * "about this long ago". Anything that needs exactness should print the
 * timestamp, which the same modal already does elsewhere.
 */
const MONTH = 30 * DAY
const YEAR = 365 * DAY

export function relativeTimeParts(
  at: Date | string | number,
  now: Date | number = Date.now()
): RelativeTimeParts {
  const thenMs = at instanceof Date ? at.getTime() : typeof at === 'number' ? at : Date.parse(at)
  const nowMs = now instanceof Date ? now.getTime() : now

  // An unparseable timestamp must not render as "NaNh ago". Callers that can
  // receive junk should check first; this is the backstop.
  if (!Number.isFinite(thenMs)) return { key: 'justNow', params: {} }

  // Clock skew, or a row stamped in the future, yields a negative interval.
  // Clamping to zero is honest here — "just now" — where a negative unit
  // ("-3h ago") is not.
  const elapsed = Math.max(0, nowMs - thenMs)

  if (elapsed < MINUTE) return { key: 'justNow', params: {} }
  if (elapsed < HOUR) return { key: 'minutesAgo', params: { minutes: Math.floor(elapsed / MINUTE) } }
  if (elapsed < DAY) return { key: 'hoursAgo', params: { hours: Math.floor(elapsed / HOUR) } }
  if (elapsed < MONTH) return { key: 'daysAgo', params: { days: Math.floor(elapsed / DAY) } }
  if (elapsed < YEAR) return { key: 'monthsAgo', params: { months: Math.floor(elapsed / MONTH) } }
  return { key: 'yearsAgo', params: { years: Math.floor(elapsed / YEAR) } }
}
