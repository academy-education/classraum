/**
 * Recurrence arithmetic for `recurring_payment_templates`.
 *
 * This used to live privately inside
 * `src/app/api/payments/recurring/generate/route.ts`. It is extracted
 * because it is the single source of truth for WHEN A PARENT IS BILLED,
 * and anything else that needs to move a template forward (the
 * roll-forward before enabling the cron, an admin tool, a backfill) must
 * use THIS function rather than a second implementation that can drift
 * from it by a day and nobody notices until an invoice goes out wrong.
 *
 * Two behaviours differ from the private original, both deliberate:
 *
 * 1. `semesterly` is implemented. The original handled `monthly` and
 *    `weekly` and then fell through to `return template.next_due_date` —
 *    the value it was asked to advance PAST. Under a live daily cron a
 *    semesterly template would therefore be invoiced once, keep its old
 *    due date, and match the "due today" query again the next day,
 *    forever. `semester_months` was in the schema the whole time and the
 *    function ignored it.
 *
 * 2. All arithmetic is on calendar parts (Y/M/D), not on `Date` objects
 *    whose local-vs-UTC split changes the answer. The original built a
 *    local `new Date()` and emitted `toISOString().slice(0,10)`, so in
 *    KST (UTC+9) every date before 09:00 local rendered as the previous
 *    day. Vercel runs UTC so production was unaffected; a script run on
 *    Andy's machine was not, which is exactly the divergence this module
 *    exists to prevent.
 */

export interface RecurrenceTemplate {
  start_date: string
  end_date: string | null
  recurrence_type: string
  day_of_month: number | null
  day_of_week: number | null
  /** Months between occurrences for `semesterly`. Real data: 6. */
  semester_months?: number | null
  next_due_date: string
}

/** `YYYY-MM-DD` -> [year, month (1-12), day]. Tolerates a timestamp suffix. */
function parts(iso: string): [number, number, number] {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return [y, m, d]
}

function iso(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

/**
 * Add `n` months, clamping the day to the target month's length.
 * Jan 31 + 1 month is Feb 28/29, not Mar 3 — which is what `setMonth`
 * would have given.
 */
function addMonths(y: number, m: number, d: number, n: number): [number, number, number] {
  const total = (y * 12 + (m - 1)) + n
  const ny = Math.floor(total / 12)
  const nm = (total % 12) + 1
  return [ny, nm, Math.min(d, daysInMonth(ny, nm))]
}

/** 0 = Sunday, matching `day_of_week` and `Date#getDay`. */
function dayOfWeek(y: number, m: number, d: number): number {
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

/** Today in UTC as `YYYY-MM-DD`. Vercel crons run in UTC. */
export function todayISO(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10)
}

/**
 * The next due date for `template`, as of `today` (`YYYY-MM-DD`).
 *
 * Every branch returns a date STRICTLY AFTER `today` except the two
 * boundary cases the original defined and that callers depend on:
 * a template that has not started yet returns its `start_date`, and a
 * template past its `end_date` returns that `end_date`. Both are
 * terminal — neither is an instruction to bill.
 */
export function calculateNextDueDate(
  template: RecurrenceTemplate,
  today: string = todayISO(),
): string {
  const t = today.slice(0, 10)

  // Not started yet — the first occurrence is the start date itself.
  if (template.start_date.slice(0, 10) > t) {
    return template.start_date.slice(0, 10)
  }

  // Ended — pin at the end date. The caller must not bill past this.
  if (template.end_date && template.end_date.slice(0, 10) <= t) {
    return template.end_date.slice(0, 10)
  }

  const [ty, tm, td] = parts(t)

  if (template.recurrence_type === 'monthly' && template.day_of_month) {
    // The target day this month, clamped for short months (the DB CHECK
    // caps day_of_month at 28 so real rows never clamp, but a template
    // read from anywhere else might).
    const dom = template.day_of_month
    let [y, m] = [ty, tm]
    let d = Math.min(dom, daysInMonth(y, m))
    if (d <= td) {
      ;[y, m, d] = addMonths(y, m, dom, 1)
    }
    return iso(y, m, d)
  }

  if (template.recurrence_type === 'weekly' && template.day_of_week !== null) {
    const target = template.day_of_week ?? 0
    let delta = target - dayOfWeek(ty, tm, td)
    if (delta <= 0) delta += 7
    const next = new Date(Date.UTC(ty, tm - 1, td + delta))
    return next.toISOString().slice(0, 10)
  }

  if (template.recurrence_type === 'semesterly' && template.semester_months) {
    // Occurrences sit on a fixed grid anchored at `start_date`:
    // start, start + n months, start + 2n months, ...
    //
    // Anchoring on start_date rather than on next_due_date is what makes
    // this idempotent: calling it twice, or calling it from the
    // roll-forward and then again from the cron, lands on the same grid
    // instead of drifting by however far the stored value had wandered.
    // It also mirrors `monthly`, which derives from `day_of_month`
    // rather than from the stored due date.
    const [sy, sm, sd] = parts(template.start_date)
    const n = template.semester_months
    // Whole periods elapsed since the anchor, then step forward until
    // strictly future. Clamping means k is not always exact, so finish
    // with a loop rather than trusting the arithmetic.
    const monthsElapsed = (ty * 12 + (tm - 1)) - (sy * 12 + (sm - 1))
    let k = Math.max(0, Math.floor(monthsElapsed / n))
    let [y, m, d] = addMonths(sy, sm, sd, k * n)
    while (iso(y, m, d) <= t) {
      k += 1
      ;[y, m, d] = addMonths(sy, sm, sd, k * n)
    }
    return iso(y, m, d)
  }

  // Unknown recurrence type, or a row missing the field its type needs
  // (`monthly` with no day_of_month, `semesterly` with no
  // semester_months). There is no defensible next date to invent, so
  // return the stored one unchanged — and note that this is NOT a
  // roll-forward: a caller that treats every return value as "advanced"
  // will loop on such a row. Callers must assert the result is in the
  // future; `scripts/roll-forward-recurring-templates.ts` does.
  return template.next_due_date.slice(0, 10)
}
