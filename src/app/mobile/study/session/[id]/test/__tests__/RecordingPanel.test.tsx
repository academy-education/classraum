import { render, screen } from '@testing-library/react'
import { RecordingPanel } from '../RecordingPanel'

/**
 * The recorder only reveals this panel after a successful getUserMedia,
 * and device capture is blocked in the environment this was built in, so
 * the live path could not be exercised end to end. Extracting the panel
 * as a pure component is what makes the part that CAN be checked —
 * countdown arithmetic, the urgency threshold, the no-input warning —
 * checkable at all.
 *
 * What is NOT covered here, and should be confirmed on a real device:
 * that the analyser actually drives the bar heights, and that the mic
 * stream shared across questions survives this component unmounting.
 */
describe('RecordingPanel', () => {
  const base = { barCount: 4, silent: false, ko: false }

  it('counts down rather than up', () => {
    const { rerender } = render(<RecordingPanel {...base} totalSec={45} elapsedSec={0} />)
    expect(screen.getByText('45s left')).toBeInTheDocument()
    rerender(<RecordingPanel {...base} totalSec={45} elapsedSec={30} />)
    expect(screen.getByText('15s left')).toBeInTheDocument()
  })

  it('never shows negative time when the tick overruns the cap', () => {
    // elapsedSec is sampled on a 250ms interval and the auto-stop is a
    // separate effect, so elapsed CAN exceed the ceiling for a frame.
    render(<RecordingPanel {...base} totalSec={15} elapsedSec={19} />)
    expect(screen.getByText('0s left')).toBeInTheDocument()
  })

  it('drains the progress bar toward zero', () => {
    const { rerender } = render(<RecordingPanel {...base} totalSec={40} elapsedSec={10} />)
    expect(screen.getByTestId('time-left-bar')).toHaveStyle({ width: '75%' })
    rerender(<RecordingPanel {...base} totalSec={40} elapsedSec={30} />)
    expect(screen.getByTestId('time-left-bar')).toHaveStyle({ width: '25%' })
  })

  it('turns urgent only in the last five seconds', () => {
    const { container, rerender } = render(
      <RecordingPanel {...base} totalSec={45} elapsedSec={39} />,
    )
    expect(container.querySelector('.bg-rose-50')).toBeNull()
    rerender(<RecordingPanel {...base} totalSec={45} elapsedSec={40} />)
    expect(container.querySelector('.bg-rose-50')).not.toBeNull()
  })

  it('warns when no sound is reaching the mic', () => {
    const { rerender } = render(<RecordingPanel {...base} totalSec={45} elapsedSec={5} />)
    expect(screen.queryByText(/not picking up any sound/i)).toBeNull()
    rerender(<RecordingPanel {...base} totalSec={45} elapsedSec={5} silent />)
    expect(screen.getByText(/not picking up any sound/i)).toBeInTheDocument()
  })

  it('renders one meter bar per requested bar', () => {
    render(<RecordingPanel {...base} barCount={28} totalSec={45} elapsedSec={1} />)
    expect(screen.getByTestId('mic-level').children).toHaveLength(28)
  })

  it('omits the countdown entirely when recording is open-ended', () => {
    render(<RecordingPanel {...base} totalSec={null} elapsedSec={12} />)
    expect(screen.queryByText(/left/)).toBeNull()
    expect(screen.queryByTestId('time-left-bar')).toBeNull()
  })

  it('announces the remaining time to screen readers', () => {
    render(<RecordingPanel {...base} totalSec={45} elapsedSec={30} />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Recording, 15 seconds left')
  })

  it('localises the countdown', () => {
    render(<RecordingPanel {...base} ko totalSec={45} elapsedSec={30} />)
    expect(screen.getByText('15초 남음')).toBeInTheDocument()
  })
})
