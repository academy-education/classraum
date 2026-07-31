/**
 * The AASA document must describe the app it actually ships with.
 *
 * WHY THIS EXISTS. `appID` read "TEAM_ID.com.classraum.app" in production for
 * months — a literal placeholder no build step ever substituted. It was
 * invisible because everything around it looked healthy: the file returned
 * 200, the JSON parsed, the entitlement existed, and Android (which uses a
 * different file) worked. Nothing compares this document to the native
 * projects, so nothing noticed it described no app at all.
 *
 * These assertions therefore read project.pbxproj, App.entitlements and the
 * Android manifest and cross-check against them. A test that merely restated
 * the constant would have passed happily with TEAM_ID in it.
 */
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import {
  APPLE_APP_SITE_ASSOCIATION,
  APPLE_TEAM_ID,
  ANDROID_SHA256_FINGERPRINT,
  APP_ID,
  appStoreUrl,
  detectPlatform,
  inviteUrl,
  PLAY_STORE_URL,
} from '../deeplinks'

const ROOT = process.cwd()
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8')

describe('apple app site association', () => {
  it('carries no unsubstituted placeholder', () => {
    const json = JSON.stringify(APPLE_APP_SITE_ASSOCIATION)
    expect(json).not.toMatch(/TEAM_ID|YOUR_TEAM|XXXX|PLACEHOLDER/i)
  })

  it('uses the team the iOS project is actually signed with', () => {
    const pbx = read('ios/App/App.xcodeproj/project.pbxproj')
    const teams = new Set(
      [...pbx.matchAll(/DEVELOPMENT_TEAM\s*=\s*([A-Z0-9]+)\s*;/g)].map(m => m[1])
    )
    // If the project ever gains a second team, this must be revisited rather
    // than silently picking one.
    expect(teams.size).toBe(1)
    expect(APPLE_TEAM_ID).toBe([...teams][0])
  })

  it('uses the bundle id both native projects use', () => {
    expect(read('capacitor.config.ts')).toContain(`appId: '${APP_ID}'`)
    // Android's package name is the same string, asserted via the Play link
    // the invite landing page will send people to.
    expect(PLAY_STORE_URL).toContain(`id=${APP_ID}`)
  })

  it('claims the invite path, or invite links will not open the app', () => {
    const paths = APPLE_APP_SITE_ASSOCIATION.applinks.details[0].paths
    expect(paths).toContain('/invite/*')
    // appID must be TEAM.BUNDLE — Apple rejects any other shape.
    expect(APPLE_APP_SITE_ASSOCIATION.applinks.details[0].appID)
      .toBe(`${APPLE_TEAM_ID}.${APP_ID}`)
  })

  it('is claimed by the entitlement, for the domain it is served from', () => {
    const ent = read('ios/App/App/App.entitlements')
    expect(ent).toContain('applinks:app.classraum.com')
  })

  it('has no static copy left in public/ to shadow or drift from the route', () => {
    // The static file WAS the bug: no extension, so it is served as
    // application/octet-stream and Apple discards it. If one reappears it
    // takes precedence over the route handler and silently restores the bug.
    expect(existsSync(join(ROOT, 'public/.well-known/apple-app-site-association')))
      .toBe(false)
  })
})

describe('store links', () => {
  // The listing is live (verified 2026-07-31 via the iTunes lookup API:
  // trackId 6757461159 for bundleId com.classraum.app). If this ever returns
  // null the invite page silently drops its iOS download button, which is the
  // exact failure the hardcoded default exists to prevent — so assert a real
  // URL, not merely a well-formed one.
  it('produces a real App Store URL by default', () => {
    expect(appStoreUrl()).toBe('https://apps.apple.com/app/id6757461159')
  })

  it('rejects a non-numeric id rather than building a broken link', () => {
    const prev = process.env.NEXT_PUBLIC_IOS_APP_STORE_ID
    try {
      process.env.NEXT_PUBLIC_IOS_APP_STORE_ID = 'id6757461159' // a classic paste error
      jest.resetModules()
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      expect(require('../deeplinks').appStoreUrl()).toBeNull()
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_IOS_APP_STORE_ID
      else process.env.NEXT_PUBLIC_IOS_APP_STORE_ID = prev
      jest.resetModules()
    }
  })
})

describe('inviteUrl', () => {
  it('builds a path under /invite/ so both platforms claim it', () => {
    expect(inviteUrl('abc123', 'https://app.classraum.com'))
      .toBe('https://app.classraum.com/invite/ABC123')
  })

  it('does not double the slash when the origin has a trailing one', () => {
    expect(inviteUrl('X1', 'https://app.classraum.com/'))
      .toBe('https://app.classraum.com/invite/X1')
  })

  it('escapes a code that would otherwise alter the path', () => {
    expect(inviteUrl('a/b', 'https://x.test')).toBe('https://x.test/invite/A%2FB')
  })
})

describe('detectPlatform', () => {
  // Real UA strings. The whole point of this branch is sending a person to
  // the store they can actually install from, and getting it wrong is
  // invisible on the developer's own machine.
  const UA = {
    iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    ipadOld: 'Mozilla/5.0 (iPad; CPU OS 12_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1 Mobile/15E148 Safari/604.1',
    ipadOS13: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
    android: 'Mozilla/5.0 (Linux; Android 14; SM-S911N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36',
    androidTablet: 'Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    kakaoAndroid: 'Mozilla/5.0 (Linux; Android 14; SM-S911N) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/125.0.0.0 Mobile Safari/537.36 KAKAOTALK 10.4.5',
    kakaoIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.4.5',
  }

  it.each([
    ['iphone', UA.iphone, 0, 'ios'],
    ['old iPad', UA.ipadOld, 0, 'ios'],
    ['android phone', UA.android, 0, 'android'],
    // A tablet UA with no "Mobi" token — must still be Android, not desktop.
    ['android tablet', UA.androidTablet, 0, 'android'],
    ['mac desktop', UA.mac, 0, 'desktop'],
    ['windows desktop', UA.windows, 0, 'desktop'],
    // Korea ships most invite links through KakaoTalk's in-app browser.
    ['kakaotalk on android', UA.kakaoAndroid, 0, 'android'],
    ['kakaotalk on ios', UA.kakaoIos, 0, 'ios'],
  ])('classifies %s', (_label, ua, touch, expected) => {
    expect(detectPlatform(ua as string, touch as number)).toBe(expected)
  })

  it('treats an iPadOS 13+ tablet as iOS, not desktop', () => {
    // iPadOS 13+ lies in its UA and claims to be a Mac. Without the
    // touch-points check every iPad is classified desktop and silently
    // redirected past the App Store link.
    expect(detectPlatform(UA.ipadOS13, 5)).toBe('ios')
  })

  it('still treats a real Mac as desktop', () => {
    // Same UA as above with no touch points — the pair is what makes the
    // check meaningful, so both directions are asserted.
    expect(detectPlatform(UA.ipadOS13, 0)).toBe('desktop')
  })

  it('never guesses a store for an unclassifiable mobile browser', () => {
    expect(detectPlatform('Mozilla/5.0 (Unknown; Mobi) SomeBrowser/1.0', 0)).toBe('unknown')
  })
})

describe('android asset links', () => {
  const assetlinks = () =>
    JSON.parse(read('public/.well-known/assetlinks.json')) as Array<{
      relation: string[]
      target: { namespace: string; package_name: string; sha256_cert_fingerprints: string[] }
    }>

  it('declares the Play APP SIGNING key, not some other certificate', () => {
    const fps = assetlinks().flatMap(s => s.target.sha256_cert_fingerprints)
    expect(fps).toContain(ANDROID_SHA256_FINGERPRINT)
  })

  it('does not carry the dead fingerprint that never verified', () => {
    // The file shipped with this value until 2026-07-31. It matches neither
    // certificate in Play Console, so App Links verified on no device — and
    // every structural check passed anyway, including Google's own Digital
    // Asset Links API, which validates shape rather than whether the key
    // signs anything. Pinned explicitly so a revert is loud.
    const raw = read('public/.well-known/assetlinks.json')
    expect(raw).not.toContain('D1:3D:6A:0E:82:AE:5B:E1')
  })

  it('targets the package both stores ship', () => {
    for (const s of assetlinks()) {
      expect(s.target.package_name).toBe(APP_ID)
      expect(s.target.namespace).toBe('android_app')
      expect(s.relation).toContain('delegate_permission/common.handle_all_urls')
    }
  })

  it('uses the uppercase colon-separated form Google requires', () => {
    for (const fp of assetlinks().flatMap(s => s.target.sha256_cert_fingerprints)) {
      // 32 bytes, uppercase hex, colon-separated. A lowercase or
      // colon-stripped fingerprint is silently rejected.
      expect(fp).toMatch(/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/)
    }
  })
})
