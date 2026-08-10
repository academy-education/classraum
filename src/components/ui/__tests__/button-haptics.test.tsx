/**
 * Every button presses back.
 *
 * Haptics used to be per-call-site: StudyButton had them, the base
 * Button behind auth / the dashboard / every dialog did not. Whether a
 * press felt like anything depended on which component the author
 * reached for, and the fix — dropping hapticTap() into each handler —
 * is the same decision made hundreds of times, which drifts on the
 * first one somebody forgets.
 *
 * So it lives in the component, and this pins it.
 *
 * BREAK-TEST: remove the hapticTap() call from Button and "fires a
 * haptic on press" fails.
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '../button'

jest.mock('@/lib/nativeHaptics', () => ({ hapticTap: jest.fn() }))
import { hapticTap } from '@/lib/nativeHaptics'
const tap = hapticTap as jest.Mock

beforeEach(() => jest.clearAllMocks())

describe('Button haptics', () => {
  it('fires a haptic on press', () => {
    render(<Button>Save</Button>)
    fireEvent.click(screen.getByText('Save'))
    expect(tap).toHaveBeenCalledTimes(1)
  })

  it('still calls the caller’s onClick, exactly once', () => {
    // The wrapper must not swallow or double-fire the real handler —
    // a double-fired onClick on a purchase button charges twice.
    const onClick = jest.fn()
    render(<Button onClick={onClick}>Pay</Button>)
    fireEvent.click(screen.getByText('Pay'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('stays silent when disabled', () => {
    const onClick = jest.fn()
    render(<Button disabled onClick={onClick}>Nope</Button>)
    fireEvent.click(screen.getByText('Nope'))
    expect(tap).not.toHaveBeenCalled()
    expect(onClick).not.toHaveBeenCalled()
  })

  it('can be opted out for repeat-fire controls', () => {
    // A buzz per repeat reads as a fault, not as feedback.
    render(<Button haptic={false}>Repeat</Button>)
    fireEvent.click(screen.getByText('Repeat'))
    expect(tap).not.toHaveBeenCalled()
  })

  it('works through asChild, where Slot forwards to the child', () => {
    // asChild renders someone else's element; the handler must still be
    // the one we attached, or every asChild button silently loses its
    // haptic.
    const onClick = jest.fn()
    render(<Button asChild><a href="#x" onClick={onClick}>Link</a></Button>)
    fireEvent.click(screen.getByText('Link'))
    expect(tap).toHaveBeenCalledTimes(1)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('does not leak the haptic prop onto the DOM node', () => {
    // React warns about unknown attributes, and `haptic="true"` in the
    // markup is how you find out a prop was never destructured.
    render(<Button haptic>Clean</Button>)
    expect(screen.getByText('Clean')).not.toHaveAttribute('haptic')
  })
})
