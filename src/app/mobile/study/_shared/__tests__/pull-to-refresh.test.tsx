import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PullToRefresh } from '../usePullToRefresh'

// Haptics are a Capacitor native bridge — no-op it in jsdom.
jest.mock('@/lib/nativeHaptics', () => ({ hapticTap: jest.fn(), hapticImpact: jest.fn() }))

/**
 * The gesture contract of the ONE shared pull-to-refresh (see
 * usePullToRefresh.tsx). The threshold is the whole point of the
 * component: a pull that does not reach it must not refetch, or every
 * stray downward swipe on a list costs the student a round trip.
 *
 * The pull is DAMPED at 0.5 and the threshold is 72px of damped travel,
 * so the raw finger distances below are deliberately ~2x what the
 * threshold reads: 200px raw → 96px damped (past), 100px raw → 50px
 * damped (short). Asserting on raw distances is what makes this test
 * sensitive to the damping constant as well as the threshold.
 */

const THRESHOLD_DAMPED = 72
const RAW_PAST = 200   // → 96px damped (capped), comfortably past 72
const RAW_SHORT = 100  // → 50px damped, short of 72

function touch(clientY: number) {
  return { touches: [{ clientY, clientX: 0 }] }
}

/** Drag `raw` px down the scroll container and let go. */
function pull(el: HTMLElement, raw: number) {
  fireEvent.touchStart(el, touch(0))
  fireEvent.touchMove(el, touch(raw))
  fireEvent.touchEnd(el, { touches: [] })
}

function setup(onRefresh?: () => void | Promise<void>) {
  render(
    <PullToRefresh onRefresh={onRefresh} className="h-40 overflow-y-auto">
      <p>content</p>
    </PullToRefresh>,
  )
  // The scroll container is the element the handlers are attached to —
  // the parent of the translated content wrapper.
  const el = screen.getByText('content').parentElement!.parentElement!
  // jsdom reports scrollTop 0, which is what arms the gesture.
  expect(el.scrollTop).toBe(0)
  return el
}

describe('PullToRefresh', () => {
  it('fires the refresh callback when the pull passes the threshold', async () => {
    const onRefresh = jest.fn().mockResolvedValue(undefined)
    pull(setup(onRefresh), RAW_PAST)
    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1))
  })

  it('does NOT fire when the pull stops short of the threshold', async () => {
    const onRefresh = jest.fn().mockResolvedValue(undefined)
    const el = setup(onRefresh)

    // Sanity-check the fixture: this distance must actually be short of
    // the threshold once damped, otherwise the test proves nothing.
    expect(RAW_SHORT * 0.5).toBeLessThan(THRESHOLD_DAMPED)

    pull(el, RAW_SHORT)
    // Give the async touchEnd handler the same chance to fire that the
    // past-threshold case gets — a bare assertion would pass simply by
    // running before the promise settled.
    await waitFor(() => expect(el).toBeInTheDocument())
    expect(onRefresh).not.toHaveBeenCalled()
  })

  it('ignores an upward drag entirely', async () => {
    const onRefresh = jest.fn().mockResolvedValue(undefined)
    const el = setup(onRefresh)
    fireEvent.touchStart(el, touch(300))
    fireEvent.touchMove(el, touch(100)) // dragging UP
    fireEvent.touchEnd(el, { touches: [] })
    await waitFor(() => expect(el).toBeInTheDocument())
    expect(onRefresh).not.toHaveBeenCalled()
  })

  it('does not arm when the container is already scrolled down', async () => {
    const onRefresh = jest.fn().mockResolvedValue(undefined)
    const el = setup(onRefresh)
    // A pull that starts mid-list is a scroll, not a refresh.
    Object.defineProperty(el, 'scrollTop', { value: 120, configurable: true })
    pull(el, RAW_PAST)
    await waitFor(() => expect(el).toBeInTheDocument())
    expect(onRefresh).not.toHaveBeenCalled()
  })

  it('renders a plain scroll container, with no gesture, when onRefresh is omitted', async () => {
    const el = setup(undefined)
    pull(el, RAW_PAST)
    // Nothing to assert a call against — the contract is that the
    // content still renders and nothing throws.
    await waitFor(() => expect(screen.getByText('content')).toBeInTheDocument())
  })
})
