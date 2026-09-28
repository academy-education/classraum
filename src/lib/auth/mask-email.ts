/** `keekoonom@gmail.com` → `k***@gmail.com`; relay/odd addresses degrade gracefully. Pure, so testable. */
export function maskEmail(email: string | null | undefined): string {
  const e = String(email ?? '')
  const at = e.indexOf('@')
  if (at <= 0) return '***'
  return `${e[0]}***${e.slice(at)}`
}
