/**
 * What just happened on an OAuth return, decided from facts rather than
 * from hope.
 *
 * ─────────────────────────────────────────────────────────────────────
 * THE TAKEOVER THIS PREVENTS
 * ─────────────────────────────────────────────────────────────────────
 *
 * Email confirmation is OFF on this project today: 430 of 435 accounts
 * are auto-confirmed, so `email_confirmed_at` proves nothing about who
 * owns the mailbox. An attacker can therefore register
 * `victim@example.com` with a password of their choosing.
 *
 * Supabase links a social identity into an existing account whenever the
 * PROVIDER says the email is verified. Google and Kakao do say that. So
 * the victim signing in with Google would be dropped straight into the
 * attacker's account — grades, invoices, family links and all — and the
 * attacker, who still knows the password, would be inside it with them.
 *
 * We cannot switch that linking off from application code. What we CAN do
 * is refuse to hand over the session:
 *
 *   INVARIANT: an OAuth sign-in never grants access to an account that
 *   existed before the identity was attached, unless the user asked for
 *   the link while already signed in with that account's password.
 *
 * When `classify` returns `link_required`, the caller unlinks the
 * just-attached identity and signs out BEFORE any app surface renders,
 * then offers the prove-then-link path: sign in with the password once,
 * and the link is performed deliberately (`deliberateLink: true` below,
 * which is the ONLY way past this check).
 *
 * WHAT CHANGES ONCE EMAIL VERIFICATION IS ON: the premise fails — a
 * password account whose address is confirmed by a link we sent is owned
 * by whoever reads that mailbox, which is the same person the provider
 * just vouched for. At that point auto-linking is safe and this check may
 * be relaxed to "only block when the existing account is unconfirmed"
 * (`emailConfirmedAt` on the identity's user, compared against whether
 * confirmations were required at the time it was created). Do not relax
 * it merely because it is inconvenient; relax it when that premise holds.
 *
 * ─────────────────────────────────────────────────────────────────────
 * THE OTHER TWO OUTCOMES
 * ─────────────────────────────────────────────────────────────────────
 *
 * `missing_email` — Kakao returns no email address unless the app has
 * business verification AND the user consents to the `account_email`
 * item. `public.users.email` is NOT NULL, so the `handle_new_user`
 * trigger's INSERT raises — and that trigger swallows every exception
 * (migration 094, design note 5). The result is an authenticated session
 * with NO profile row: every screen in the app queries `users` by id and
 * gets nothing. Blank dashboard, no error, nothing in the logs but a
 * RAISE WARNING. This must be caught at the door.
 *
 * `no_profile` — the same end state reached any other way. Kept separate
 * because the remedy differs: missing_email is explainable to the user
 * ("Kakao didn't share your email"), while no_profile is ours to fix.
 */

export interface OAuthIdentityFact {
  /** 'email' for a password identity; 'google' | 'kakao' | 'apple' otherwise. */
  provider: string
  /** ISO timestamp, as returned by the admin API. */
  createdAt: string | null
}

export interface OAuthOutcomeInput {
  /** Email on the auth user after the return. Null is the Kakao case. */
  email: string | null | undefined
  /** ISO timestamp the auth user was created. */
  userCreatedAt: string | null
  identities: OAuthIdentityFact[]
  /** Provider the user just signed in with. */
  provider: string
  /** Does a public.users row exist for this id? */
  profileExists: boolean
  /**
   * True only when THIS app initiated a link from an
   * already-password-authenticated session. The single bypass of the
   * takeover check, and the reason the pending-link marker exists.
   */
  deliberateLink?: boolean
  /** Epoch ms. Injected so the time-based branches are testable. */
  now: number
}

export type OAuthOutcome =
  | { kind: 'ok' }
  | { kind: 'missing_email' }
  | { kind: 'no_profile' }
  | { kind: 'link_required'; email: string; provider: string }

/**
 * How recent an identity must be to count as "attached during this
 * sign-in". Generous, because the round trip includes a consent screen.
 */
export const IDENTITY_RECENT_MS = 5 * 60 * 1000

/**
 * How much later than the account an identity must be created before we
 * treat the account as pre-existing. On a genuine OAuth SIGNUP both are
 * created inside one request; a second or two of clock jitter must not
 * read as a takeover.
 */
export const IDENTITY_GRACE_MS = 60 * 1000

const ts = (v: string | null | undefined): number | null => {
  if (!v) return null
  const n = Date.parse(v)
  return Number.isFinite(n) ? n : null
}

export function classifyOAuthOutcome(input: OAuthOutcomeInput): OAuthOutcome {
  // Order matters. A missing email is checked first because it is the
  // reason the profile row is absent, and reporting "no_profile" for it
  // would send the owner looking in the wrong place.
  if (!input.email || !String(input.email).trim()) return { kind: 'missing_email' }

  const hasPassword = input.identities.some((i) => i.provider === 'email')
  const mine = input.identities.filter((i) => i.provider === input.provider)
  const userAt = ts(input.userCreatedAt)

  if (hasPassword && !input.deliberateLink && userAt !== null) {
    // The just-attached identity, if any: created recently AND materially
    // later than the account itself.
    const autoLinked = mine.some((i) => {
      const at = ts(i.createdAt)
      if (at === null) return false
      const recent = input.now - at <= IDENTITY_RECENT_MS && at <= input.now + IDENTITY_GRACE_MS
      const accountPredates = at - userAt > IDENTITY_GRACE_MS
      return recent && accountPredates
    })
    if (autoLinked) {
      return { kind: 'link_required', email: String(input.email), provider: input.provider }
    }
  }

  // Only after the session is established as safe to hand over does a
  // missing profile row become the interesting fact.
  if (!input.profileExists) return { kind: 'no_profile' }

  return { kind: 'ok' }
}

/**
 * Translation key for the message shown for a non-ok outcome. Kept beside
 * the classifier so a new outcome cannot be added without one.
 */
export function outcomeMessageKey(outcome: OAuthOutcome, provider: string): string | null {
  switch (outcome.kind) {
    case 'ok':
      return null
    case 'missing_email':
      return provider === 'kakao'
        ? 'auth.social.errors.kakaoNoEmail'
        : 'auth.social.errors.noEmail'
    case 'no_profile':
      return 'auth.social.errors.noProfile'
    case 'link_required':
      return 'auth.social.link.required'
  }
}
