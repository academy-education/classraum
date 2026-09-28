import { createHmac } from 'node:crypto'
import { appOriginFor, buildAuthEmail, confirmLink, detectLanguage, nextPathFor, verifyStandardWebhook } from '../email-hook'

const secretBytes = Buffer.from('0123456789abcdef0123456789abcdef')
const secret = `v1,whsec_${secretBytes.toString('base64')}`
const sign = (id: string, ts: string, body: string, key = secretBytes) =>
  'v1,' + createHmac('sha256', key).update(`${id}.${ts}.${body}`).digest('base64')

describe('verifyStandardWebhook', () => {
  const body = '{"user":{"id":"u1"},"email_data":{"email_action_type":"signup"}}'
  const now = 1_700_000_000_000
  const ts = String(Math.floor(now / 1000))

  it('accepts a correctly signed request inside the tolerance', () => {
    expect(verifyStandardWebhook({ id: 'msg_1', timestamp: ts, signature: sign('msg_1', ts, body) }, body, secret, now)).toBeNull()
  })
  it('accepts when the valid signature is one of several space-separated ones', () => {
    const sig = `v1,notthisone ${sign('msg_1', ts, body)}`
    expect(verifyStandardWebhook({ id: 'msg_1', timestamp: ts, signature: sig }, body, secret, now)).toBeNull()
  })
  it('rejects a tampered body, a wrong key, a stale timestamp, and missing headers', () => {
    expect(verifyStandardWebhook({ id: 'msg_1', timestamp: ts, signature: sign('msg_1', ts, body) }, body + ' ', secret, now)).toBe('signature mismatch')
    expect(verifyStandardWebhook({ id: 'msg_1', timestamp: ts, signature: sign('msg_1', ts, body, Buffer.from('x'.repeat(32))) }, body, secret, now)).toBe('signature mismatch')
    const old = String(Math.floor(now / 1000) - 600)
    expect(verifyStandardWebhook({ id: 'msg_1', timestamp: old, signature: sign('msg_1', old, body) }, body, secret, now)).toBe('timestamp outside tolerance')
    expect(verifyStandardWebhook({ id: null, timestamp: ts, signature: 'x' }, body, secret, now)).toBe('missing webhook headers')
  })
})

describe('language detection', () => {
  it('prefers signup metadata, then preferences, then Korean', () => {
    expect(detectLanguage({ id: 'u', user_metadata: { lang: 'english' } }, 'korean')).toBe('en')
    expect(detectLanguage({ id: 'u', user_metadata: {} }, 'english')).toBe('en')
    expect(detectLanguage({ id: 'u' }, null)).toBe('ko')
  })
})

describe('links', () => {
  it('uses the redirect_to origin only when it is ours', () => {
    expect(appOriginFor('https://app.classraum.com/mobile?invite=abc', 'https://app.classraum.com')).toBe('https://app.classraum.com')
    expect(appOriginFor('http://app.localhost:3000/auth', 'https://app.classraum.com')).toBe('http://app.localhost:3000')
    expect(appOriginFor('https://evil.example/auth', 'https://app.classraum.com')).toBe('https://app.classraum.com')
    expect(appOriginFor(undefined, 'https://app.classraum.com')).toBe('https://app.classraum.com')
  })
  it('keeps only a same-host relative next path', () => {
    expect(nextPathFor('https://app.classraum.com/mobile?invite=abc')).toBe('/mobile?invite=abc')
    expect(nextPathFor('https://evil.example/x')).toBeNull()
    expect(nextPathFor(undefined)).toBeNull()
  })
  it('builds the confirm link on our route with the token_hash, type and next', () => {
    const u = new URL(confirmLink('https://app.classraum.com', 'th_123', 'signup', '/mobile?invite=abc'))
    expect(u.pathname).toBe('/auth/confirm')
    expect(u.searchParams.get('token_hash')).toBe('th_123')
    expect(u.searchParams.get('type')).toBe('signup')
    expect(u.searchParams.get('next')).toBe('/mobile?invite=abc')
  })
})

describe('templates', () => {
  it('renders every link type in both languages with the link and escaped email', () => {
    for (const type of ['signup', 'recovery', 'magiclink', 'invite', 'email_change', 'email_change_new']) {
      for (const lang of ['ko', 'en'] as const) {
        const m = buildAuthEmail({ type, lang, link: 'https://app.classraum.com/auth/confirm?token_hash=x&type=' + type, toEmail: 'a<b>@x.com' })
        expect(m).not.toBeNull()
        expect(m!.html).toContain('href="https://app.classraum.com/auth/confirm?token_hash=x&amp;type=')
        expect(m!.html).toContain('a&lt;b&gt;@x.com')
        expect(m!.text).toContain('https://app.classraum.com/auth/confirm')
        expect(m!.subject.length).toBeGreaterThan(5)
      }
    }
  })
  it('renders the verify-email variant used by the in-app banner', () => {
    const m = buildAuthEmail({ type: 'verify', lang: 'en', link: 'https://app.classraum.com/auth/confirm?token_hash=x&type=magiclink', toEmail: 'a@x.com' })
    expect(m!.subject).toMatch(/verify your classraum email/i)
    expect(m!.html).toContain('Verify email')
  })
  it('renders the reauthentication code without a link, and refuses unknown types or a missing link', () => {
    const m = buildAuthEmail({ type: 'reauthentication', lang: 'en', link: null, token: '482913', toEmail: 'a@x.com' })
    expect(m!.html).toContain('482913')
    expect(buildAuthEmail({ type: 'nonsense', lang: 'en', link: 'https://x', toEmail: 'a@x.com' })).toBeNull()
    expect(buildAuthEmail({ type: 'signup', lang: 'en', link: null, toEmail: 'a@x.com' })).toBeNull()
  })
})
