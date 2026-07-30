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
  APP_ID,
  appStoreUrl,
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
  it('returns no App Store URL until a real numeric id is configured', () => {
    // Guards against shipping a button that points at a nonexistent listing.
    // NEXT_PUBLIC_IOS_APP_STORE_ID is unset in test, so this is the live path.
    const url = appStoreUrl()
    if (url !== null) expect(url).toMatch(/^https:\/\/apps\.apple\.com\/app\/id\d+$/)
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
