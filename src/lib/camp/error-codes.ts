/**
 * Error codes the camp routes return, and the translated text for them.
 *
 * Until 2026-10-23 the camp dashboard showed the server's raw English
 * `json.error` ("Forbidden", "camp program is not active today",
 * "classroom not found") inside a Korean UI (camp-dashboard-ux-audit,
 * i18n section). Every route this module covers now answers
 * `{ error, code, ...params }`: `error` stays English for logs and old
 * callers, `code` is what the UI translates. A code is the contract —
 * renaming one here without the locale key fails code-key-coverage.
 *
 * Client-safe: no server imports, so CampPage and the reports panel can
 * use `campErrorMessage` directly.
 */

export const CAMP_ERROR_CODES = [
  'unauthorized',
  'forbidden',
  'bad_request',
  'invalid_count',
  'invalid_due_date',
  'invalid_title',
  'invalid_filter',
  'classroom_not_found',
  'not_camp_classroom',
  'mixed_programs',
  'too_many_classrooms',
  'too_many_assignments',
  'session_not_found',
  'session_other_classroom',
  'session_single_classroom',
  'program_not_found',
  'camp_ended',
  'camp_not_started',
  'quota_exceeded',
  'not_enough_items',
  'assignment_not_found',
  'review_set_not_found',
  'review_set_empty',
  'report_not_found',
  'no_students',
  'nothing_to_update',
  'server_error',
] as const

export type CampErrorCode = (typeof CAMP_ERROR_CODES)[number]

/** Locale key for a code. Every code has one in en.json and ko.json. */
export const campErrorKey = (code: CampErrorCode) => `camp.errors.codes.${code}`

type Translate = (key: string, params?: Record<string, string | number>) => unknown

/**
 * The text to show for a failed camp response body. Falls back to the
 * caller's own translated message for a missing or unknown code — never
 * to `json.error`, which is English by design.
 */
export function campErrorMessage(t: Translate, json: unknown, fallback: string): string {
  const body = (json && typeof json === 'object' ? json : {}) as Record<string, unknown>
  const code = body.code
  if (typeof code !== 'string' || !(CAMP_ERROR_CODES as readonly string[]).includes(code)) return fallback
  const params: Record<string, string | number> = {}
  for (const k of ['remaining', 'required', 'available', 'startsOn', 'endsOn', 'max']) {
    const v = body[k]
    if (typeof v === 'string' || typeof v === 'number') params[k] = v
  }
  const key = campErrorKey(code as CampErrorCode)
  const text = String(t(key, params))
  // t() returns the dotted path on a miss; never put that on screen.
  return text && text !== key ? text : fallback
}
