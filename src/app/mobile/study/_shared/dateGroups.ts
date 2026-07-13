/**
 * Group rows by relative date buckets — Today / Yesterday / This week
 * / Earlier / By month. Shared by history, tests, and wrong-notebook.
 *
 * Keeps the input sort order within each bucket (callers pass rows
 * sorted DESC by last_active_at). Preserves the exact object shape
 * of the input via a generic — no reshaping.
 */

export type DateBucket =
  | { key: 'today'; label: (ko: boolean) => string }
  | { key: 'yesterday'; label: (ko: boolean) => string }
  | { key: 'thisWeek'; label: (ko: boolean) => string }
  | { key: 'earlier'; label: (ko: boolean) => string; monthKey: string }

export interface DateGroup<T> {
  bucket: DateBucket
  rows: T[]
}

export function groupByDate<T>(
  rows: T[],
  getDate: (row: T) => string | Date,
): DateGroup<T>[] {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfYesterday = startOfToday - 86400_000
  const startOfWeek = startOfToday - 7 * 86400_000

  const buckets = new Map<string, DateGroup<T>>()

  for (const row of rows) {
    const raw = getDate(row)
    const ts = (raw instanceof Date ? raw : new Date(raw)).getTime()
    let bucket: DateBucket
    if (ts >= startOfToday) {
      bucket = { key: 'today', label: (ko) => (ko ? '오늘' : 'Today') }
    } else if (ts >= startOfYesterday) {
      bucket = { key: 'yesterday', label: (ko) => (ko ? '어제' : 'Yesterday') }
    } else if (ts >= startOfWeek) {
      bucket = { key: 'thisWeek', label: (ko) => (ko ? '이번 주' : 'This week') }
    } else {
      const d = new Date(ts)
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      bucket = {
        key: 'earlier',
        monthKey,
        label: (ko) => d.toLocaleDateString(ko ? 'ko-KR' : 'en-US', { year: 'numeric', month: 'long' }),
      }
    }
    const groupKey = bucket.key === 'earlier' ? `earlier:${bucket.monthKey}` : bucket.key
    const existing = buckets.get(groupKey)
    if (existing) {
      existing.rows.push(row)
    } else {
      buckets.set(groupKey, { bucket, rows: [row] })
    }
  }

  // Order: today → yesterday → this week → earlier (newest month first).
  const ordered: DateGroup<T>[] = []
  for (const key of ['today', 'yesterday', 'thisWeek']) {
    const g = buckets.get(key)
    if (g) ordered.push(g)
  }
  const earlierKeys = Array.from(buckets.keys()).filter(k => k.startsWith('earlier:')).sort().reverse()
  for (const k of earlierKeys) {
    const g = buckets.get(k)
    if (g) ordered.push(g)
  }
  return ordered
}

/**
 * Relative "time ago" label shared by session lists and shelves.
 * Falls back to a short absolute date past 7 days.
 */
export function formatTimeAgo(iso: string, ko: boolean): string {
  const then = new Date(iso).getTime()
  const diff = Math.max(0, Date.now() - then)
  const min = Math.floor(diff / 60_000)
  const hr = Math.floor(diff / 3_600_000)
  const day = Math.floor(diff / 86_400_000)
  if (day >= 7) {
    return new Date(iso).toLocaleDateString(ko ? 'ko-KR' : 'en-US', {
      month: 'short', day: 'numeric',
    })
  }
  if (day >= 1) return ko ? `${day}일 전` : `${day}d ago`
  if (hr >= 1) return ko ? `${hr}시간 전` : `${hr}h ago`
  if (min >= 1) return ko ? `${min}분 전` : `${min}m ago`
  return ko ? '방금' : 'just now'
}
