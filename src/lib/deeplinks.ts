/**
 * Single source of truth for native app identity, store links, and the
 * Apple App Site Association document.
 *
 * These values were previously duplicated (or, in the AASA's case,
 * placeholdered) across the iOS project, the Android manifest and a static
 * file in public/. Keeping them in one typed module is what lets a test
 * assert that the served AASA matches the app it is supposed to describe.
 */

/** Apple Developer team. Source: DEVELOPMENT_TEAM in ios/App/App.xcodeproj/project.pbxproj. */
export const APPLE_TEAM_ID = '7DU778LJL3'

/** Shared by both platforms: iOS bundle identifier and Android package name. */
export const APP_ID = 'com.classraum.app'

/** `TEAM.BUNDLE`, the form Apple's applinks/webcredentials entries require. */
export const APPLE_APP_ID = `${APPLE_TEAM_ID}.${APP_ID}`

/**
 * Paths the installed iOS app claims. `/invite/*` is the share link; the
 * rest predate it.
 *
 * NOTE the trailing `/*` semantics — a pattern like `/auth/*` requires a
 * segment after `/auth`, so it does NOT match a bare `/auth?ref=CODE`. The
 * old invite link was exactly that shape, which is one reason it never
 * opened the app even before the Content-Type and TEAM_ID bugs are counted.
 */
export const APPLE_APP_LINK_PATHS = [
  '/invite/*',
  '/mobile/*',
  '/dashboard/*',
  '/auth/*',
] as const

export const APPLE_APP_SITE_ASSOCIATION = {
  applinks: {
    apps: [] as string[],
    details: [{ appID: APPLE_APP_ID, paths: [...APPLE_APP_LINK_PATHS] }],
  },
  webcredentials: { apps: [APPLE_APP_ID] },
} as const

/** Play listing is derivable from the package name; the App Store's is not. */
export const PLAY_STORE_URL =
  `https://play.google.com/store/apps/details?id=${APP_ID}`

/**
 * Numeric App Store ID — the `id` in apps.apple.com/app/id6757461159.
 *
 * Hardcoded, not env-only, because it is a public constant that never
 * changes for the life of the listing. Behind an env var it would be one
 * more thing to set per environment, and forgetting it fails SILENTLY —
 * `appStoreUrl()` returns null and the download button just vanishes. The
 * override stays for staging builds pointing at a different listing.
 *
 * Confirmed live 2026-07-31 via https://itunes.apple.com/lookup?bundleId=com.classraum.app
 * (trackId 6757461159, bundleId com.classraum.app, seller "Classraum Co., Ltd").
 */
const IOS_APP_STORE_ID =
  process.env.NEXT_PUBLIC_IOS_APP_STORE_ID?.trim() || '6757461159'

export function appStoreUrl(): string | null {
  if (!/^\d+$/.test(IOS_APP_STORE_ID)) return null
  return `https://apps.apple.com/app/id${IOS_APP_STORE_ID}`
}

/** Canonical share link for a referral code. Must sit under /invite/ to be claimed by both apps. */
export function inviteUrl(code: string, origin: string): string {
  return `${origin.replace(/\/$/, '')}/invite/${encodeURIComponent(code.trim().toUpperCase())}`
}

export type DevicePlatform = 'ios' | 'android' | 'desktop' | 'unknown'

/**
 * Which store, if any, to offer this visitor.
 *
 * Lives here rather than inside the invite component so it can be tested
 * against real UA strings — the branch cannot be exercised by browsing,
 * because the browser's UA is whatever it is, and "looks right in source"
 * is how you ship an Android user to the App Store.
 *
 * `maxTouchPoints` is load-bearing: iPadOS 13+ reports itself as
 * "Macintosh" in the UA, so string matching alone classifies every iPad as
 * a desktop and hides the App Store link from it.
 *
 * A mobile browser we cannot place returns 'unknown' rather than a guess;
 * the caller shows both stores.
 */
export function detectPlatform(ua: string, maxTouchPoints = 0): DevicePlatform {
  if (/iPhone|iPod/.test(ua)) return 'ios'
  if (/iPad/.test(ua)) return 'ios'
  if (/Macintosh/.test(ua) && maxTouchPoints > 1) return 'ios'
  // Android must be checked before the generic Mobi catch-all, and note
  // that Android UAs also contain "Linux" — order matters here.
  if (/Android/.test(ua)) return 'android'
  if (/Mobi/.test(ua)) return 'unknown'
  return 'desktop'
}
