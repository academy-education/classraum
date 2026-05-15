/**
 * Locale-aware date/time formatting for notification messages.
 *
 * Triggers run server-side and cannot know the recipient's preferred
 * language, so they store raw ISO/HH:mm fields in `message_params`.
 * Rendering is locale-specific: this helper builds {when}, {oldWhen},
 * {newWhen} strings from those raw fields at display time.
 *
 * English: "May 7, 2026, 9 AM – 5:30 PM"
 * Korean : "2026년 5월 7일 오전 9시 – 오후 5시 30분"
 */

export type NotifLang = 'english' | 'korean'

export function formatLocalizedDate(dateISO: string | undefined | null, lang: NotifLang): string {
  if (!dateISO) return ''
  const [yStr, mStr, dStr] = dateISO.split('-')
  const y = parseInt(yStr, 10)
  const m = parseInt(mStr, 10)
  const d = parseInt(dStr, 10)
  if (!y || !m || !d) return dateISO
  if (lang === 'korean') return `${y}년 ${m}월 ${d}일`
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[m - 1]} ${d}, ${y}`
}

export function formatLocalizedClock(time: string | undefined | null, lang: NotifLang): string {
  if (!time) return ''
  const [hStr, mStr] = time.split(':')
  const h = parseInt(hStr, 10)
  const m = parseInt(mStr || '0', 10)
  if (Number.isNaN(h)) return time
  const h12 = h % 12 === 0 ? 12 : h % 12
  if (lang === 'korean') {
    const ampm = h < 12 ? '오전' : '오후'
    return m === 0 ? `${ampm} ${h12}시` : `${ampm} ${h12}시 ${m}분`
  }
  const ampm = h < 12 ? 'AM' : 'PM'
  return m === 0 ? `${h12} ${ampm}` : `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

export function formatLocalizedTimeRange(
  start: string | undefined | null,
  end: string | undefined | null,
  lang: NotifLang,
): string {
  if (!start) return ''
  if (!end) return formatLocalizedClock(start, lang)
  return `${formatLocalizedClock(start, lang)} – ${formatLocalizedClock(end, lang)}`
}

export function formatLocalizedWhen(
  dateISO: string | undefined | null,
  startTime: string | undefined | null,
  endTime: string | undefined | null,
  lang: NotifLang,
): string {
  const date = formatLocalizedDate(dateISO, lang)
  const time = formatLocalizedTimeRange(startTime, endTime, lang)
  if (!date) return time
  if (!time) return date
  // Korean: spaces only ("2026년 5월 7일 오전 9시")
  // English: comma + space ("May 7, 2026, 9 AM")
  return lang === 'korean' ? `${date} ${time}` : `${date}, ${time}`
}

/**
 * Auto-detect and localize a single param value. Returns the input
 * unchanged when nothing matches — names, statuses, amounts, etc. pass
 * through untouched.
 */
function localizeValue(raw: string, lang: NotifLang): string {
  if (!raw || typeof raw !== 'string') return raw
  // ISO date only — "2026-05-07"
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return formatLocalizedDate(raw, lang)
  }
  // Legacy datetime + range — "2026-05-06 09:00 – 17:30" (from older rows)
  const dtRange = raw.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})\s*$/)
  if (dtRange) {
    return formatLocalizedWhen(dtRange[1], dtRange[2], dtRange[3], lang)
  }
  // ISO datetime — "2026-05-07T13:19:03.384+00:00" or "2026-05-07 09:00"
  const dt = raw.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{1,2}:\d{2})(?::\d{2})?/)
  if (dt) {
    return formatLocalizedWhen(dt[1], dt[2], undefined, lang)
  }
  // Time range — "09:00 - 10:00" or "09:00–10:00"
  const range = raw.match(/^\s*(\d{1,2}:\d{2})(?::\d{2})?\s*[-–]\s*(\d{1,2}:\d{2})(?::\d{2})?\s*$/)
  if (range) {
    return formatLocalizedTimeRange(range[1], range[2], lang)
  }
  // Single clock time — "09:00" or "09:00:00"
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(raw)) {
    return formatLocalizedClock(raw, lang)
  }
  return raw
}

/**
 * Given message_params from the DB, fill in {when} / {oldWhen} / {newWhen}
 * locale-formatted from the raw ISO fields if present. Returns a NEW object;
 * does not mutate input. Falls back to legacy fields ({date}+{time},
 * {oldTime}/{newTime}) when ISO fields are missing — keeps older rows
 * rendering correctly without forcing a backfill.
 */
export function augmentLocalizedTimeParams(
  params: Record<string, unknown> | null | undefined,
  lang: NotifLang,
): Record<string, string | number> {
  const out: Record<string, string | number> = {}
  // Keys whose meaning depends on raw structure (see {when}/{oldWhen}/{newWhen}
  // logic below). Skip auto-localization for them so we don't double-format.
  const skipAutoLocalize = new Set([
    'dateISO', 'startTime', 'endTime',
    'oldDateISO', 'oldStartTime', 'oldEndTime',
    'newDateISO', 'newStartTime', 'newEndTime',
    'when', 'oldWhen', 'newWhen',
  ])
  if (params && typeof params === 'object') {
    for (const [k, v] of Object.entries(params)) {
      if (typeof v === 'string') {
        out[k] = skipAutoLocalize.has(k) ? v : localizeValue(v, lang)
      } else if (typeof v === 'number') {
        out[k] = v
      }
    }
  }

  const get = (k: string) => (typeof out[k] === 'string' ? (out[k] as string) : undefined)

  // Cancelled-style: dateISO + startTime + endTime → {when}
  const dateISO = get('dateISO') ?? get('date')
  const startTime = get('startTime')
  const endTime = get('endTime')
  if (out.when === undefined) {
    if (dateISO && startTime) {
      out.when = formatLocalizedWhen(dateISO, startTime, endTime, lang)
    } else if (get('date') || get('time')) {
      // Legacy fallback: pre-formatted strings.
      out.when = `${get('date') ?? ''} ${get('time') ?? ''}`.trim()
    }
  }

  // Rescheduled-style: oldDateISO/oldStartTime/oldEndTime → {oldWhen}
  const oldDateISO = get('oldDateISO')
  const oldStartTime = get('oldStartTime')
  const oldEndTime = get('oldEndTime')
  if (out.oldWhen === undefined) {
    if (oldDateISO && oldStartTime) {
      out.oldWhen = formatLocalizedWhen(oldDateISO, oldStartTime, oldEndTime, lang)
    } else if (get('oldTime')) {
      out.oldWhen = get('oldTime') as string
    }
  }
  const newDateISO = get('newDateISO')
  const newStartTime = get('newStartTime')
  const newEndTime = get('newEndTime')
  if (out.newWhen === undefined) {
    if (newDateISO && newStartTime) {
      out.newWhen = formatLocalizedWhen(newDateISO, newStartTime, newEndTime, lang)
    } else if (get('newTime')) {
      out.newWhen = get('newTime') as string
    }
  }

  return out
}
