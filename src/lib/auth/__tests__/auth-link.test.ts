import { authLinkTarget, isAuthLinkPath } from '../auth-link'

describe('authLinkTarget', () => {
  it('loads confirmation and callback links on our host', () => {
    const u = 'https://app.classraum.com/auth/confirm?token_hash=abc&type=recovery&next=%2Fauth'
    expect(authLinkTarget(u)).toBe(u)
    expect(authLinkTarget('https://app.classraum.com/auth/callback?code=x')).toContain('/auth/callback')
    expect(authLinkTarget('https://app.classraum.com/auth?type=reset&access_token=a&refresh_token=b')).toContain('type=reset')
  })
  it('ignores ordinary in-app links, foreign hosts, and custom schemes', () => {
    expect(authLinkTarget('https://app.classraum.com/mobile/session/123')).toBeNull()
    expect(authLinkTarget('https://app.classraum.com/auth?lang=english')).toBeNull()
    expect(authLinkTarget('https://evil.example/auth/confirm?token_hash=x')).toBeNull()
    expect(authLinkTarget('classraum://auth/callback?code=x')).toBeNull()
    expect(authLinkTarget('not a url')).toBeNull()
  })
  it('isAuthLinkPath matches the server routes and token-bearing /auth only', () => {
    expect(isAuthLinkPath('/auth/confirm')).toBe(true)
    expect(isAuthLinkPath('/auth', '?token_hash=x')).toBe(true)
    expect(isAuthLinkPath('/auth', '?lang=ko')).toBe(false)
    expect(isAuthLinkPath('/mobile')).toBe(false)
  })
})
