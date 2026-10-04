/**
 * Pure, client-safe half of api-failure.ts: the grouping label for a failed
 * response. Shared by the server recorder and TestSession's `submit_failed`
 * event so both sides group a failure under the same string. No imports —
 * this file is bundled into the browser.
 */

const MAX_LABEL = 80

const UUID_G = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi
const EMAIL_G = /[^\s@"']+@[^\s@"']+\.[^\s@"']+/g
const LONG_NUM_G = /\d{5,}/g

/** A stable, PII-free grouping label from a response's `error` field. */
export function normaliseErrorLabel(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.trim()) return 'unlabelled'
  return raw
    .replace(EMAIL_G, '<email>')
    .replace(UUID_G, '<id>')
    .replace(LONG_NUM_G, '<n>')
    .trim()
    .slice(0, MAX_LABEL)
}

