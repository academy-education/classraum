import { decideRestoredClock, RESTORE_AWAY_MS } from '../test-clock-restore'

const NOW = 1_700_000_000_000
const base = { storedPaused: null, storedAliveAt: String(NOW - 2_000), hasStoredElapsed: true, now: NOW, visible: true }

describe('decideRestoredClock', () => {
  it('a stored pause wins over everything, even a fresh heartbeat', () => {
    expect(decideRestoredClock({ ...base, storedPaused: '1' })).toEqual({ paused: true, running: false })
  })
  it('quick refresh of a running, visible test keeps running', () => {
    expect(decideRestoredClock(base)).toEqual({ paused: false, running: true })
  })
  it('quick refresh while hidden stays frozen but unpaused', () => {
    expect(decideRestoredClock({ ...base, visible: false })).toEqual({ paused: false, running: false })
  })
  it('heartbeat at exactly the away threshold counts as away', () => {
    expect(decideRestoredClock({ ...base, storedAliveAt: String(NOW - RESTORE_AWAY_MS) }).paused).toBe(true)
    expect(decideRestoredClock({ ...base, storedAliveAt: String(NOW - RESTORE_AWAY_MS + 1) }).paused).toBe(false)
  })
  it('elapsed with no heartbeat (older build) comes back paused, never charged', () => {
    expect(decideRestoredClock({ ...base, storedAliveAt: null })).toEqual({ paused: true, running: false })
    expect(decideRestoredClock({ ...base, storedAliveAt: 'garbage' }).paused).toBe(true)
  })
  it('a brand-new test (no elapsed yet) starts running, not paused', () => {
    expect(decideRestoredClock({ ...base, hasStoredElapsed: false, storedAliveAt: null })).toEqual({ paused: false, running: true })
  })
})
