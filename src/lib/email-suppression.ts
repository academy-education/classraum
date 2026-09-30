/**
 * Addresses we never email (public.email_suppressions, migration 111).
 *
 * Checked inside sendResendEmail, so every product and auth mail obeys it
 * without each caller remembering to. Added 2026-09-30 when the owner asked
 * that nothing reach the "Manning" test accounts — a per-charge receipt hold
 * could not cover their next renewal, the renewal reminder or the recap.
 *
 * The admin client is imported lazily: a static import throws at module load
 * wherever the service key is absent (tests, scripts), and this module sits
 * under every sender.
 *
 * A failed lookup fails OPEN, with a console error. Failing closed would stop
 * ops alerts during exactly the database outage they exist to report.
 */
export const normalizeEmail = (e: string) => e.trim().toLowerCase()

export async function suppressedAmong(emails: string[]): Promise<Set<string>> {
  const list = [...new Set(emails.map(normalizeEmail).filter(Boolean))]
  if (list.length === 0) return new Set()
  try {
    const { dbAdmin } = await import('./supabase-admin')
    const { data, error } = await dbAdmin.from('email_suppressions').select('email').in('email', list)
    if (error) throw new Error(error.message)
    return new Set((data ?? []).map(r => r.email))
  } catch (e) {
    console.error('[email-suppression] lookup failed; sending unfiltered', e instanceof Error ? e.message : e)
    return new Set()
  }
}
