/** @jest-environment node */
import { oauthDeepLinkTarget } from '../oauth-deeplink'
import { isOAuthFlow } from '../oauth-callback'

describe('oauthDeepLinkTarget', () => {
  it('turns a native code return into the auth route that handles it', () => {
    expect(oauthDeepLinkTarget('classraum://auth/callback?flow=oauth&code=abc123')).toBe(
      '/auth?flow=oauth&code=abc123'
    )
  })

  it('carries a denied consent through instead of dropping it', () => {
    expect(
      oauthDeepLinkTarget(
        'classraum://auth/callback?error=access_denied&error_description=User%20denied'
      )
    ).toBe('/auth?flow=oauth&error=access_denied&error_description=User+denied')
  })

  it('keeps implicit tokens in the FRAGMENT, out of history and server logs', () => {
    const target = oauthDeepLinkTarget('classraum://auth/callback#access_token=AAA&refresh_token=BBB')
    expect(target).toBe('/auth?flow=oauth#access_token=AAA&refresh_token=BBB')
    expect(target!.split('#')[0]).not.toContain('AAA')
  })

  it('produces a URL the auth page recognises as an OAuth return', () => {
    const target = oauthDeepLinkTarget('classraum://auth/callback?code=abc')!
    expect(isOAuthFlow(target.split('?')[1].split('#')[0])).toBe(true)
  })

  it.each([
    ['a referral share link', 'classraum://invite/ABCD'],
    ['a session deep link that happens to carry a code param', 'classraum://mobile/session/9?code=Z'],
    ['a push-notification tap', 'classraum://mobile/notifications'],
    ['a universal link', 'https://app.classraum.com/mobile/study'],
    ['garbage', 'nonsense'],
  ])('ignores %s', (_l, url) => {
    expect(oauthDeepLinkTarget(url)).toBeNull()
  })
})
