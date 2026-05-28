/**
 * PII-scrubbing helpers shared by sentry.{client,server,edge}.config.ts.
 *
 * Defence in depth: Sentry's own "Default PII" toggle already drops some
 * fields, but most leaks in this codebase come from explicit
 * `console.error('failed for', user)` calls that bypass those defaults
 * and surface as breadcrumb messages or event extras. These scrubbers
 * pattern-match the leaked fields *after* the SDK has captured them,
 * regardless of where the original logging call lived.
 *
 * Pattern: pure functions that take a breadcrumb / event and return a
 * mutated copy. Return `null` to drop the breadcrumb entirely.
 */

/**
 * Field names treated as sensitive. Matching is case-insensitive on the
 * key. Add new ones here rather than in the configs — single source of
 * truth.
 */
const PII_KEYS = new Set([
  'email',
  'phone',
  'phone_number',
  'phonenumber',
  'name',
  'fullname',
  'first_name',
  'firstname',
  'last_name',
  'lastname',
  'address',
  'password',
  'token',
  'access_token',
  'refresh_token',
  'authorization',
  'cookie',
  'session',
  'ssn',
  'tax_id',
  'business_registration_number',
  'card_number',
  'cardnumber',
  'cvv',
  'card',
  'billing_key',
  'kg_subscription_id',
])

const PII_KEY_LOWER = (() => {
  const set = new Set<string>()
  for (const k of PII_KEYS) set.add(k.toLowerCase())
  return set
})()

/**
 * Recursively redact PII fields in any plain object/array. Walks into
 * nested structures but bails at primitives. Returns the same shape with
 * sensitive values replaced by '[redacted]'.
 *
 * Idempotent — calling twice produces the same result. Safe to apply
 * even to already-scrubbed payloads.
 *
 * Limits depth (default 5) to avoid stack overflows on cyclic objects.
 */
export function scrubPii(value: unknown, depth = 0, maxDepth = 5): unknown {
  if (value === null || value === undefined) return value
  if (depth > maxDepth) return '[max-depth]'
  if (typeof value !== 'object') return value

  if (Array.isArray(value)) {
    return value.map((item) => scrubPii(item, depth + 1, maxDepth))
  }

  const out: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (PII_KEY_LOWER.has(key.toLowerCase())) {
      out[key] = '[redacted]'
    } else {
      out[key] = scrubPii(val, depth + 1, maxDepth)
    }
  }
  return out
}

/**
 * Strip query strings from a URL — many breadcrumbs include the full URL
 * with auth tokens, search terms (student names), invoice IDs etc.
 */
export function stripQueryString(url: string): string {
  return url.split('?')[0] ?? url
}

/**
 * Best-effort regex scrub of free-text strings. Catches email addresses
 * and Korean phone numbers (010-XXXX-XXXX). Useful for breadcrumb
 * messages, which are often plain log strings rather than structured data.
 */
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g
const KR_PHONE_RE = /\b01[016789]-?\d{3,4}-?\d{4}\b/g
const CARD_RE = /\b(?:\d[ -]?){13,19}\b/g

export function scrubText(text: string): string {
  return text
    .replace(EMAIL_RE, '[email-redacted]')
    .replace(KR_PHONE_RE, '[phone-redacted]')
    .replace(CARD_RE, '[card-redacted]')
}

/**
 * Sentry beforeBreadcrumb hook for console-source breadcrumbs.
 * Console.log/error become breadcrumbs with `category: 'console'`,
 * `message: <stringified args>`, `data.arguments: [original args]`.
 * Both fields need scrubbing.
 */
interface BreadcrumbLike {
  category?: string
  message?: string
  data?: Record<string, unknown>
}

export function scrubConsoleBreadcrumb<T extends BreadcrumbLike>(breadcrumb: T): T {
  if (breadcrumb.category === 'console') {
    if (typeof breadcrumb.message === 'string') {
      breadcrumb.message = scrubText(breadcrumb.message)
    }
    if (breadcrumb.data && Array.isArray(breadcrumb.data.arguments)) {
      breadcrumb.data.arguments = breadcrumb.data.arguments.map((arg) => {
        if (typeof arg === 'string') return scrubText(arg)
        return scrubPii(arg)
      })
    }
  }
  return breadcrumb
}

/** Strip query strings from navigation + fetch breadcrumbs. */
export function scrubNavigationBreadcrumb<T extends BreadcrumbLike>(breadcrumb: T): T {
  if (breadcrumb.category === 'navigation' && breadcrumb.data?.to) {
    breadcrumb.data.to = stripQueryString(String(breadcrumb.data.to))
  }
  if (breadcrumb.category === 'fetch' && breadcrumb.data?.url) {
    breadcrumb.data.url = stripQueryString(String(breadcrumb.data.url))
  }
  return breadcrumb
}
