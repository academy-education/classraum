/**
 * listening-item.ts — is this delivered question a LISTENING item? Pure.
 *
 * Decided per ITEM, never by family name. Until 2026-10-31 the runner asked
 * `test.family === 'toefl' && /listening/.test(section)`, so an iTEP SLATE
 * listening item fell through to the plain passage box and printed its
 * transcript — every answer — as text before submission.
 *
 * The bank convention is the signal: every listening row stores its spoken
 * script in `passage` prefixed "Transcript:" (TOEFL 1,943 rows, iTEP 49, and
 * no non-listening row carries the prefix — measured 2026-10-31). Speaking
 * items ("Audio script:" / speaking_* types) have their own audio branch.
 */
export const TRANSCRIPT_PREFIX = /^\s*transcript\s*:/i

export function isListeningItem(q: { type?: string | null; passage?: string | null } | null | undefined): boolean {
  if (!q || !q.passage) return false
  if (q.type === 'speaking_repeat' || q.type === 'speaking_interview') return false
  return TRANSCRIPT_PREFIX.test(q.passage)
}
