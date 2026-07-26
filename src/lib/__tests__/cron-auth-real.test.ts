/** @jest-environment node */
/**
 * Tests the REAL verifyCronAuth.
 *
 * The older cron-auth.test.ts re-implements the logic inline "to avoid
 * NextRequest import issues", and that copy has since drifted from
 * production: it still honours a `vercel-cron/1.0` User-Agent, which the
 * real implementation dropped precisely because it was trivially
 * spoofable. A test that asserts against a stale copy of the logic can
 * never catch a regression in the thing that ships, so this file
 * exercises the actual export.
 *
 * verifyCronAuth only ever calls `req.headers.get(...)`, so a minimal
 * stub satisfies it without constructing a NextRequest.
 */
import { verifyCronAuth } from '@/lib/cron-auth'

type HeaderBag = Record<string, string | undefined>
const reqWith = (headers: HeaderBag) =>
  ({
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
  }) as unknown as Parameters<typeof verifyCronAuth>[0]

const ORIGINAL = { ...process.env }
const setEnv = (patch: Record<string, string | undefined>) => {
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) delete (process.env as Record<string, string | undefined>)[k]
    else (process.env as Record<string, string | undefined>)[k] = v
  }
}

beforeEach(() => {
  for (const k of Object.keys(process.env)) {
    if (!(k in ORIGINAL)) delete (process.env as Record<string, string | undefined>)[k]
  }
  Object.assign(process.env, ORIGINAL)
  // Simulate a deployed environment; local dev is allowed through.
  setEnv({ VERCEL_ENV: 'production', CRON_SECRET: undefined, CRON_SECRET_KEY: undefined })
})

afterAll(() => {
  Object.assign(process.env, ORIGINAL)
})

describe('verifyCronAuth on a deployment', () => {
  it('accepts CRON_SECRET — the name Vercel Cron actually uses', () => {
    // This is the case that matters: Vercel only attaches the auth
    // header when a var named exactly CRON_SECRET exists.
    setEnv({ CRON_SECRET: 's3cret' })
    expect(verifyCronAuth(reqWith({ authorization: 'Bearer s3cret' }))).toBe(true)
  })

  it('still accepts the legacy CRON_SECRET_KEY name', () => {
    setEnv({ CRON_SECRET_KEY: 'legacy' })
    expect(verifyCronAuth(reqWith({ authorization: 'Bearer legacy' }))).toBe(true)
  })

  it('prefers CRON_SECRET when both are set', () => {
    setEnv({ CRON_SECRET: 'new', CRON_SECRET_KEY: 'old' })
    expect(verifyCronAuth(reqWith({ authorization: 'Bearer new' }))).toBe(true)
    expect(verifyCronAuth(reqWith({ authorization: 'Bearer old' }))).toBe(false)
  })

  it('rejects a wrong or missing token', () => {
    setEnv({ CRON_SECRET: 's3cret' })
    expect(verifyCronAuth(reqWith({ authorization: 'Bearer nope' }))).toBe(false)
    expect(verifyCronAuth(reqWith({}))).toBe(false)
  })

  it('rejects when no secret is configured at all — never fails open', () => {
    expect(verifyCronAuth(reqWith({ authorization: 'Bearer anything' }))).toBe(false)
  })

  it('does NOT honour the spoofable vercel-cron User-Agent', () => {
    // The old inline test copy still allows this. Production must not.
    setEnv({ CRON_SECRET: 's3cret' })
    expect(verifyCronAuth(reqWith({ 'user-agent': 'vercel-cron/1.0' }))).toBe(false)
  })
})
