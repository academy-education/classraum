/**
 * The client `submit_failed` event. The server drops any event not in
 * CLIENT_TRACKABLE without a word, so the allowlist entry is as load-bearing
 * as the call site.
 */
import fs from 'fs'
import path from 'path'

jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: {} }))
import { CLIENT_TRACKABLE } from '@/lib/study/analytics'
import { submitFailedProps } from '@/lib/study/submit-failure'

const ctx = { sessionId: 's-1', questionCount: 5, answeredCount: 3 }

describe('submit_failed', () => {
  it('is accepted from the client', () => {
    expect(CLIENT_TRACKABLE.has('submit_failed')).toBe(true)
  })

  it('carries the server label and status, never the zod details', () => {
    const p = submitFailedProps({ stage: 'http', status: 400, error: 'bad payload' }, ctx)
    expect(p).toEqual({ sessionId: 's-1', stage: 'http', status: 400, error: 'bad payload', questionCount: 5, answeredCount: 3 })
  })

  it('labels network and client failures', () => {
    expect(submitFailedProps({ stage: 'network', status: null, error: 'network' }, ctx)).toMatchObject({ stage: 'network', status: null })
    expect(submitFailedProps(null, ctx)).toMatchObject({ stage: 'client', error: 'client exception' })
  })

  it('TestSession fires it from the submit catch', () => {
    const src = fs.readFileSync(path.join(process.cwd(), 'src/app/mobile/study/session/[id]/TestSession.tsx'), 'utf8')
    const catchAt = src.indexOf("console.error('[TestSession] submit failed', err)")
    expect(catchAt).toBeGreaterThan(0)
    expect(src.slice(catchAt, catchAt + 400)).toContain("track('submit_failed', submitFailedProps(failure")
  })
})
