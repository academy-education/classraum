import {
  bumpProfileRefresh,
  getProfileRefreshSnapshot,
  getProfileRefreshServerSnapshot,
  subscribeProfileRefresh,
  __resetProfileRefreshForTests,
} from '../profile-refresh'

/**
 * The contract useSyncExternalStore depends on. Two properties matter
 * and both are easy to break by "simplifying" this file later:
 *
 *  1. the snapshot CHANGES on every bump — a store that returned a
 *     constant would never re-run a dependent effect, and the profile
 *     page would silently stop refreshing while every test that only
 *     checked "the listener fired" still passed;
 *  2. unsubscribing actually detaches — React subscribes on mount and
 *     detaches on unmount, and a leaked listener means setState on an
 *     unmounted component for every future write.
 */

beforeEach(() => __resetProfileRefreshForTests())

describe('profile refresh store', () => {
  it('changes its snapshot on every bump', () => {
    const before = getProfileRefreshSnapshot()
    bumpProfileRefresh()
    const after = getProfileRefreshSnapshot()
    expect(after).not.toBe(before)
    bumpProfileRefresh()
    expect(getProfileRefreshSnapshot()).not.toBe(after)
  })

  it('increases monotonically, so it can never collide with a prior value', () => {
    const seen = new Set<number>()
    for (let i = 0; i < 25; i++) {
      bumpProfileRefresh()
      seen.add(getProfileRefreshSnapshot())
    }
    expect(seen.size).toBe(25)
  })

  it('notifies every subscriber', () => {
    const a = jest.fn(), b = jest.fn()
    subscribeProfileRefresh(a)
    subscribeProfileRefresh(b)
    bumpProfileRefresh()
    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(1)
  })

  it('stops notifying after unsubscribe', () => {
    const fn = jest.fn()
    const off = subscribeProfileRefresh(fn)
    bumpProfileRefresh()
    off()
    bumpProfileRefresh()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('does not notify a subscriber that was never added', () => {
    const fn = jest.fn()
    bumpProfileRefresh()
    subscribeProfileRefresh(fn)
    expect(fn).not.toHaveBeenCalled()
  })

  it('has a stable server snapshot', () => {
    // React throws "server snapshot should be cached" if this varies.
    expect(getProfileRefreshServerSnapshot()).toBe(getProfileRefreshServerSnapshot())
  })

  it('a subscriber that throws does not stop the others', () => {
    // One bad reader must not silently prevent the profile page from
    // refreshing — that would be a cross-component failure with no
    // visible cause.
    const bad = jest.fn(() => { throw new Error('boom') })
    const good = jest.fn()
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    subscribeProfileRefresh(bad as unknown as () => void)
    subscribeProfileRefresh(good)
    expect(() => bumpProfileRefresh()).not.toThrow()
    expect(good).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalled()   // it is isolated, not swallowed
    spy.mockRestore()
  })
})
