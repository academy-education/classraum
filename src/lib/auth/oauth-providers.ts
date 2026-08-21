/**
 * Which social providers are live, and in what order they are shown.
 *
 * THE FLAG IS THE SAFETY PROPERTY. `NEXT_PUBLIC_OAUTH_PROVIDERS` is a
 * comma-separated allow-list; unset or empty means NOTHING renders and the
 * auth page is byte-for-byte the page that shipped before this feature.
 * That is what lets the whole thing merge while the Google/Kakao/Apple
 * consoles are still being set up — a button that leads to a provider with
 * no client id is a dead end that looks like a broken product.
 *
 * Unknown names are DROPPED rather than passed through. A typo
 * ("kakaotalk", "google ") must not reach `signInWithOAuth`, where it
 * becomes a 400 from Supabase on click.
 */

/**
 * ─────────────────────────────────────────────────────────────────────
 * WHAT THE OWNER MUST CONFIGURE BEFORE ENABLING A PROVIDER
 * ─────────────────────────────────────────────────────────────────────
 *
 * Nothing here works until the console work is done, which is why the
 * flag defaults to empty. Enable ONE provider at a time and confirm it
 * end to end before adding the next.
 *
 * SUPABASE (all providers)
 *   Authentication > URL Configuration > Redirect URLs must contain, verbatim:
 *       https://app.classraum.com/auth/callback
 *       http://localhost:3000/auth/callback      (development)
 *       classraum://auth/callback                (native shells)
 *   Supabase rejects any redirectTo not on that list, and the failure
 *   looks like a provider misconfiguration rather than a missing entry.
 *   The provider's own Client ID / Secret go in Authentication > Providers.
 *
 * GOOGLE  (console.cloud.google.com)
 *   OAuth consent screen, then Credentials > OAuth client ID > Web application.
 *   Authorised redirect URI is SUPABASE's callback, not ours:
 *       https://<project-ref>.supabase.co/auth/v1/callback
 *   Google refuses to authenticate inside an embedded WebView
 *   ("disallowed_useragent"), which is why the native path hands the URL
 *   to the OS browser — see startOAuthSignIn.
 *
 * KAKAO  (developers.kakao.com)
 *   1. My Application > Kakao Login > ON.
 *   2. Redirect URI: https://<project-ref>.supabase.co/auth/v1/callback
 *   3. Kakao Login > Consent Items > **카카오계정(이메일)** set to
 *      "필수 동의" (required) — or at minimum "선택 동의".
 *   4. THE EMAIL ITEM REQUIRES BUSINESS VERIFICATION (비즈니스 채널
 *      / 사업자 정보 등록). Until that is granted, Kakao returns a user
 *      with NO email address.
 *
 *      That is not a cosmetic gap here: public.users.email is NOT NULL,
 *      so handle_new_user()'s INSERT raises, and that trigger swallows
 *      every exception — the signup "succeeds" and leaves an
 *      authenticated user with no profile row and a blank app.
 *      classifyOAuthOutcome catches it at the door and shows
 *      auth.social.errors.kakaoNoEmail instead, but the only real fix is
 *      completing the verification. Do NOT enable kakao in the flag
 *      before that is granted and confirmed with a live test account.
 *   5. App Keys: the REST API key is the Client ID; a Client Secret must
 *      be generated under Security and set to "사용함" (enabled).
 *
 * APPLE  (developer.apple.com)
 *   Certificates, Identifiers & Profiles:
 *     - a Services ID (this is the OAuth Client ID; the app's bundle id
 *       com.classraum.app is NOT it),
 *     - Return URL https://<project-ref>.supabase.co/auth/v1/callback,
 *     - a Sign in with Apple KEY (.p8) + Key ID + Team ID (7DU778LJL3,
 *       see src/lib/deeplinks.ts), which Supabase turns into the secret.
 *   App Store review guideline 4.8 requires Sign in with Apple in the iOS
 *   app once any other social login is offered there, so if kakao or
 *   google ships in the native build, apple must ship with it.
 *   Apple returns the user's name ONLY on the very first authorisation —
 *   never on later sign-ins — so a name that is missed is missed for
 *   good. That is acceptable here: the name re-prompt already asks.
 */

export type OAuthProvider = 'kakao' | 'google' | 'apple'

/**
 * Display order, deliberately not alphabetical.
 *
 * Kakao first: this is a Korean product, KakaoTalk is the default identity
 * for the parents and students who use it, and the first button in a stack
 * is the one that gets pressed. Google second (the international default,
 * and what teachers on desktop expect). Apple last — required by App Store
 * review guideline 4.8 once any other social login exists in the iOS app,
 * but chosen by comparatively few users here.
 */
export const PROVIDER_ORDER: readonly OAuthProvider[] = ['kakao', 'google', 'apple']

/**
 * Parse the env allow-list into an ordered, de-duplicated provider list.
 *
 * Pure. `undefined`, `''`, whitespace, junk and unknown names all collapse
 * to `[]`, which the button strip treats as "render nothing".
 *
 * ONE mechanism does the filtering, deliberately: intersecting with
 * PROVIDER_ORDER both drops unknown names and imposes the display order.
 * An earlier draft also pre-filtered against a Set of known names, which
 * looked like belt-and-braces and was really a mechanism no test could
 * distinguish — deleting it changed no result, so it told you nothing
 * about which line mattered.
 */
export function parseEnabledProviders(raw: string | undefined | null): OAuthProvider[] {
  if (!raw) return []
  const requested = new Set(raw.split(',').map((s) => s.trim().toLowerCase()))
  return PROVIDER_ORDER.filter((p) => requested.has(p))
}

/** The providers enabled in THIS build. Read once; NEXT_PUBLIC_* is inlined. */
export function enabledProviders(): OAuthProvider[] {
  return parseEnabledProviders(process.env.NEXT_PUBLIC_OAUTH_PROVIDERS)
}

/**
 * Scopes we ask for, per provider.
 *
 * Kakao: `account_email` is the consent item that makes an email address
 * available at all. Requesting it does NOT guarantee one arrives — see
 * `kakao-email.ts` — but omitting it guarantees one does not.
 * Google and Apple return an email by default; Apple's is often a private
 * relay address, which is fine, it is still a deliverable mailbox.
 */
export const PROVIDER_SCOPES: Record<OAuthProvider, string | undefined> = {
  kakao: 'account_email profile_nickname',
  google: 'email profile',
  apple: 'email name',
}

/** Brand label. Not translated — these are proper nouns in both locales. */
export const PROVIDER_LABEL: Record<OAuthProvider, string> = {
  kakao: 'Kakao',
  google: 'Google',
  apple: 'Apple',
}
