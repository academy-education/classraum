/**
 * Is the Apple Sign in with Apple client secret about to expire?
 *
 * WHY THIS EXISTS
 *
 * Apple caps the client secret JWT at six months, and Supabase stores a
 * pre-generated one rather than minting it from the `.p8`. When it
 * lapses, Apple web sign-in stops working with **no deploy, no code
 * change and no error anywhere in our logs** — the failure is entirely
 * on Apple's side of the token exchange. That is the same silent shape
 * that has bitten this codebase repeatedly, and the only defence is to
 * notice the date before it passes.
 *
 * WHAT IT DOES NOT DO
 *
 * It does not verify the signature. We do not hold the `.p8` here and
 * should not: the point is to read the expiry Apple will enforce, not to
 * re-derive trust. A tampered `exp` would make this lie, but anyone able
 * to write our environment has already won.
 *
 * THE DUPLICATION, STATED PLAINLY
 *
 * The authoritative secret lives in the Supabase dashboard. This reads a
 * COPY from `APPLE_OAUTH_SECRET`. Rotating one without the other makes
 * this alert wrong — early or, worse, silent. Every message it produces
 * therefore names the env var it read, so nobody debugs the wrong copy.
 * `secretsAgree()` exists so a rotation script can assert they match.
 */

import { APPLE_TEAM_ID } from '@/lib/deeplinks'
import { parseEnabledProviders } from '@/lib/auth/oauth-providers'

/** Apple's hard ceiling on client-secret lifetime: 6 months, in seconds. */
export const APPLE_MAX_SECRET_LIFETIME_S = 15_777_000

const DAY_MS = 24 * 60 * 60 * 1000

/** Warn once the secret has this many days left. */
export const WARN_DAYS = 30
/** Escalate to critical at this many days — a working week plus slack. */
export const CRITICAL_DAYS = 7

export type AppleSecretStatus =
  /** `apple` is not in the provider allow-list; nothing to guard yet. */
  | { kind: 'not_enabled' }
  /** Apple IS enabled but no secret was recorded for us to check. */
  | { kind: 'missing' }
  /** Present but not a usable JWT, or carrying values Apple will reject. */
  | { kind: 'malformed'; reason: string }
  | { kind: 'expired'; expiresAt: Date; daysAgo: number }
  | { kind: 'expiring'; expiresAt: Date; daysLeft: number }
  | { kind: 'ok'; expiresAt: Date; daysLeft: number }

interface JwtPayload {
  iss?: unknown
  sub?: unknown
  aud?: unknown
  iat?: unknown
  exp?: unknown
}

/** Decode one base64url segment. Returns null rather than throwing. */
function decodeSegment(seg: string): JwtPayload | null {
  try {
    const b64 = seg.replace(/-/g, '+').replace(/_/g, '/')
    const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4))
    const json = Buffer.from(b64 + pad, 'base64').toString('utf8')
    const parsed = JSON.parse(json)
    return parsed && typeof parsed === 'object' ? (parsed as JwtPayload) : null
  } catch {
    return null
  }
}

export interface ClassifyInput {
  /** Raw NEXT_PUBLIC_OAUTH_PROVIDERS. */
  providersRaw: string | undefined | null
  /** Raw APPLE_OAUTH_SECRET — the JWT, not the .p8. */
  secret: string | undefined | null
  now: Date
  /** Override for tests; defaults to the real team id. */
  expectedTeamId?: string
}

/**
 * Pure. No env reads, no clock reads, no network — so the boundaries
 * (exactly 30 days, exactly expired) are testable rather than hopeful.
 */
export function classifyAppleSecret(input: ClassifyInput): AppleSecretStatus {
  const enabled = parseEnabledProviders(input.providersRaw)
  if (!enabled.includes('apple')) return { kind: 'not_enabled' }

  const raw = (input.secret ?? '').trim()
  if (!raw) return { kind: 'missing' }

  const parts = raw.split('.')
  if (parts.length !== 3) {
    return { kind: 'malformed', reason: 'not a three-part JWT' }
  }
  const payload = decodeSegment(parts[1])
  if (!payload) return { kind: 'malformed', reason: 'payload is not decodable JSON' }

  const exp = payload.exp
  if (typeof exp !== 'number' || !Number.isFinite(exp)) {
    return { kind: 'malformed', reason: 'no numeric `exp` claim' }
  }

  // Apple rejects a secret whose lifetime exceeds six months. A generator
  // asked for "1 year" produces a JWT that looks fine here and fails at
  // Apple, so catch it as a config error rather than reporting 12 months
  // of comfortable headroom.
  const iat = payload.iat
  if (typeof iat === 'number' && Number.isFinite(iat)) {
    if (exp - iat > APPLE_MAX_SECRET_LIFETIME_S) {
      return {
        kind: 'malformed',
        reason: `lifetime ${Math.round((exp - iat) / 86400)}d exceeds Apple's 6-month maximum; Apple will reject it`,
      }
    }
  }

  // `iss` is the Team ID. Generated against the wrong team, the secret is
  // well-formed and simply never authenticates.
  const expectedTeam = input.expectedTeamId ?? APPLE_TEAM_ID
  if (typeof payload.iss === 'string' && payload.iss !== expectedTeam) {
    return {
      kind: 'malformed',
      reason: `issued for team ${payload.iss}, expected ${expectedTeam}`,
    }
  }

  const expiresAt = new Date(exp * 1000)
  const msLeft = expiresAt.getTime() - input.now.getTime()

  if (msLeft <= 0) {
    return { kind: 'expired', expiresAt, daysAgo: Math.floor(-msLeft / DAY_MS) }
  }
  // Floor, so "29.4 days left" reports 29 and crosses the threshold early
  // rather than late. Erring late is the whole failure being guarded.
  const daysLeft = Math.floor(msLeft / DAY_MS)
  if (daysLeft <= WARN_DAYS) return { kind: 'expiring', expiresAt, daysLeft }
  return { kind: 'ok', expiresAt, daysLeft }
}

/** Severity for a status, or null when there is nothing to say. */
export function severityFor(status: AppleSecretStatus): 'warning' | 'critical' | null {
  switch (status.kind) {
    case 'not_enabled':
    case 'ok':
      return null
    case 'expiring':
      return status.daysLeft <= CRITICAL_DAYS ? 'critical' : 'warning'
    case 'expired':
    case 'missing':
    case 'malformed':
      // Apple sign-in is either already broken or unverifiable. Both are
      // user-facing right now, not eventually.
      return 'critical'
  }
}

/** Alert copy. Always names the env var, so nobody edits the wrong copy. */
export function messageFor(status: AppleSecretStatus): string | null {
  const tail =
    ' Regenerate from the .p8 in the Apple Developer Console, then update BOTH the' +
    ' Supabase Apple provider and APPLE_OAUTH_SECRET — updating one alone leaves' +
    ' this alert reporting the other.'
  switch (status.kind) {
    case 'not_enabled':
    case 'ok':
      return null
    case 'missing':
      return (
        'Apple sign-in is enabled in NEXT_PUBLIC_OAUTH_PROVIDERS but APPLE_OAUTH_SECRET' +
        ' is unset, so its expiry cannot be checked and nothing will warn before' +
        ' Apple web sign-in stops working.'
      )
    case 'malformed':
      return `APPLE_OAUTH_SECRET is not a usable Apple client secret: ${status.reason}.${tail}`
    case 'expired':
      return (
        `The Apple client secret expired ${status.daysAgo} day(s) ago` +
        ` (${status.expiresAt.toISOString().slice(0, 10)}). Sign in with Apple on the web` +
        ` is failing now.${tail}`
      )
    case 'expiring':
      return (
        `The Apple client secret expires in ${status.daysLeft} day(s)` +
        ` (${status.expiresAt.toISOString().slice(0, 10)}). When it lapses, Apple web` +
        ` sign-in stops with no deploy and no error in our logs.${tail}`
      )
  }
}

/**
 * Do the Supabase copy and the env copy match? For a rotation script to
 * assert after pasting, so the two cannot drift silently.
 */
export function secretsAgree(a: string | null | undefined, b: string | null | undefined): boolean {
  return Boolean(a && b && a.trim() === b.trim())
}
