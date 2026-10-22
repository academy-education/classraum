/**
 * Camp dates are Korean calendar dates.
 *
 * Every camp window check used `new Date().toISOString().slice(0, 10)`, which is the UTC date. Between 00:00 and
 * 09:00 KST that is still yesterday, so on a camp's first morning students got "Couldn't start" and teachers an
 * English "camp program is not active today" until 09:00, and trend points for work done before 09:00 landed on
 * the previous day (camp-dashboard-ux-audit, 2026-10-22). `starts_on` / `ends_on` are entered as Korean dates.
 */
const KST = 'Asia/Seoul'

/** YYYY-MM-DD for the given instant in Korea (default: now). */
export function kstDate(at: Date | string | number = new Date()): string {
  const d = at instanceof Date ? at : new Date(at)
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: KST, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}
