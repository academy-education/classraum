/**
 * "Block short tests" (owner decision, 2026-10-04).
 *
 * When the bank cannot fill a paid full-test section to its blueprint
 * count, the section is NOT started and nothing is charged. Before this,
 * every assembler warned "SHORT — wanted 54, drew 49" to a log nobody
 * reads and the route charged full price for the short form: a score out
 * of a denominator the student never agreed to, at the price of the real
 * one.
 *
 * The shape of the rule:
 *   - Each assembler takes `requireFull`. With it set, a draw that comes up
 *     short THROWS `SectionShortError` instead of returning — and it throws
 *     before the exposure write, so a refused start leaves no trace in the
 *     student's seen-ledger (a refused draw marking 49 unseen items "seen"
 *     would later trip the exhaustion gate on questions they never met).
 *   - The assemble route draws BEFORE it reserves credits, so a short
 *     section is refused with no debit at all, not a debit and a refund.
 *   - Learning-path stops are exempt: they are free and have their own
 *     length (a 3-item drill is not a short 54-item test).
 *   - The blueprint counts themselves are never touched (CLAUDE memory:
 *     "never change question counts" — fix the bank, not the form).
 *
 * Pure module: no DB, safe to import from tests and from the client for
 * the code constant.
 */

/** The typed error code every surface keys its message off. */
export const SECTION_UNAVAILABLE = 'section_unavailable' as const

export interface SectionShortDetail {
  /** e.g. 'sat/math', 'toefl/listening', 'act/science'. */
  scope: string
  /** What the blueprint asks for (bank rows). */
  want: number
  /** What the bank could actually supply. */
  got: number
  /** 1 / 2 for an adaptive module draw; omitted for a whole section. */
  module?: 1 | 2
  /** TOEFL Stage-2 path, when the short draw was a module 2. */
  path?: string
}

export class SectionShortError extends Error {
  readonly code = SECTION_UNAVAILABLE
  readonly detail: SectionShortDetail
  constructor(detail: SectionShortDetail) {
    super(
      `${detail.scope}${detail.module ? ` module ${detail.module}` : ''}${detail.path ? ` (${detail.path})` : ''} ` +
      `short: blueprint wants ${detail.want}, bank supplied ${detail.got}`,
    )
    this.name = 'SectionShortError'
    this.detail = detail
  }
}

export function isSectionShortError(e: unknown): e is SectionShortError {
  return e instanceof SectionShortError
    || (typeof e === 'object' && e !== null && (e as { code?: unknown }).code === SECTION_UNAVAILABLE
        && typeof (e as { detail?: unknown }).detail === 'object')
}

/**
 * Throw when `requireFull` is set and the draw came up short. A no-op
 * otherwise, so callers that tolerate a short draw (practice, camp,
 * free path stops) behave exactly as before.
 */
export function assertFullDraw(requireFull: boolean | undefined, detail: SectionShortDetail): void {
  if (!requireFull) return
  if (detail.got < detail.want) throw new SectionShortError(detail)
}

/** The JSON body of the 409 every start path returns. */
export function sectionUnavailableBody(detail: SectionShortDetail) {
  return {
    error: 'this section is not available right now',
    code: SECTION_UNAVAILABLE,
    reason: SECTION_UNAVAILABLE,
    scope: detail.scope,
    want: detail.want,
    got: detail.got,
    ...(detail.module ? { module: detail.module } : {}),
  }
}

/** Client-side test for the 409 body above. */
export function isSectionUnavailableBody(json: unknown): boolean {
  if (typeof json !== 'object' || json === null) return false
  const j = json as { code?: unknown; reason?: unknown }
  return j.code === SECTION_UNAVAILABLE || j.reason === SECTION_UNAVAILABLE
}
