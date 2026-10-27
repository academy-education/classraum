/**
 * Datadog RUM settings that protect students. Most users are minors and the
 * owner chose to record them, so these are the guarantees that make that
 * acceptable; each one fails here if someone loosens it.
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { rumConfig, logsConfig, rumEnabledFor, envFor } from '../rum'

describe('Datadog RUM privacy', () => {
  it('masks everything in session replay', () => {
    expect(rumConfig('app.classraum.com').defaultPrivacyLevel).toBe('mask')
  })

  it('never takes privacy settings from Datadog remote configuration', () => {
    const cfg = rumConfig('app.classraum.com') as unknown as Record<string, unknown>
    expect(cfg.remoteConfiguration).toBeUndefined()
    expect(cfg.remoteConfigurationId).toBeUndefined()
    const src = readFileSync(join(process.cwd(), 'src/instrumentation-client.ts'), 'utf8')
    expect(src).not.toMatch(/remoteConfiguration/)
    expect(src).not.toMatch(/defaultPrivacyLevel/)
  })

  it('attaches no user identity', () => {
    const src = readFileSync(join(process.cwd(), 'src/instrumentation-client.ts'), 'utf8')
      + readFileSync(join(process.cwd(), 'src/lib/datadog/rum.ts'), 'utf8')
    expect(src).not.toMatch(/setUser\s*\(/)
  })
})

describe('Datadog RUM scope', () => {
  it('reports only from the real deployment unless forced', () => {
    expect(rumEnabledFor('app.classraum.com', false)).toBe(true)
    expect(rumEnabledFor('classraum.com', false)).toBe(true)
    expect(rumEnabledFor('localhost', false)).toBe(false)
    expect(rumEnabledFor('classraum-git-x.vercel.app', false)).toBe(false)
    expect(rumEnabledFor('evilclassraum.com', false)).toBe(false)
    expect(rumEnabledFor('localhost', true)).toBe(true)
  })

  it('tags env by host and keeps the PoC sample rates', () => {
    expect(envFor('app.classraum.com')).toBe('prod')
    expect(envFor('localhost')).toBe('dev')
    const cfg = rumConfig('app.classraum.com')
    expect(cfg.sessionSampleRate).toBe(100)
    expect(cfg.sessionReplaySampleRate).toBe(100)
    expect(logsConfig('app.classraum.com').forwardErrorsToLogs).toBe(true)
  })
})
