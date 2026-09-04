/**
 * @jest-environment jsdom
 *
 * The keyboard layer drives the SAME buttons the mouse does, so these tests
 * assert clicks land on the right element rather than that some state changed.
 * That is the point of the design: there is no second writer to test.
 */
import { render, screen } from "@testing-library/react"
import { useRunnerKeys } from "../useRunnerKeys"

type Harness = {
  enabled?: boolean
  onPick: (label: string) => void
  onPrev?: () => void
  onNext?: () => void
  onToggleHelp?: () => void
  withInput?: boolean
}

function Runner({ enabled = true, onPick, onPrev = () => {}, onNext = () => {}, onToggleHelp = () => {}, withInput = false }: Harness) {
  useRunnerKeys({ enabled, onPrev, onNext, onToggleHelp })
  return (
    <div>
      {["alpha", "bravo", "charlie", "delta"].map(c => (
        <button key={c} type="button" data-runner-option onClick={() => onPick(c)}>
          {c}
        </button>
      ))}
      {/* not tagged: must never be reachable by number key */}
      <button type="button" onClick={() => onPick("SUBMIT")}>submit</button>
      {withInput && <textarea aria-label="essay" />}
    </div>
  )
}

const press = (key: string, target: EventTarget = window) =>
  target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }))

describe("runner keyboard layer", () => {
  it("maps 1-4 to the option buttons in order", () => {
    const onPick = jest.fn()
    render(<Runner onPick={onPick} />)
    press("1"); press("3")
    expect(onPick.mock.calls.map(c => c[0])).toEqual(["alpha", "charlie"])
  })

  it("maps a-d to the same slots", () => {
    const onPick = jest.fn()
    render(<Runner onPick={onPick} />)
    press("b"); press("D")
    expect(onPick.mock.calls.map(c => c[0])).toEqual(["bravo", "delta"])
  })

  it("never reaches a button that is not tagged as an option", () => {
    const onPick = jest.fn()
    render(<Runner onPick={onPick} />)
    press("5")   // there is a 5th button on screen, but it is the submit
    expect(onPick).not.toHaveBeenCalled()
  })

  it("moves with the arrows and Enter", () => {
    const onPrev = jest.fn(), onNext = jest.fn()
    render(<Runner onPick={() => {}} onPrev={onPrev} onNext={onNext} />)
    press("ArrowLeft"); press("ArrowRight"); press("Enter")
    expect(onPrev).toHaveBeenCalledTimes(1)
    expect(onNext).toHaveBeenCalledTimes(2)   // ArrowRight and Enter
  })

  it("does nothing at all while disabled", () => {
    const onPick = jest.fn(), onNext = jest.fn()
    render(<Runner enabled={false} onPick={onPick} onNext={onNext} />)
    press("1"); press("Enter")
    expect(onPick).not.toHaveBeenCalled()
    expect(onNext).not.toHaveBeenCalled()
  })

  // The one that would actually bite a student: typing an essay must not be
  // read as shortcuts. "1" inside a textarea is a character, not an answer.
  it("ignores keys typed into a field", () => {
    const onPick = jest.fn(), onNext = jest.fn()
    render(<Runner onPick={onPick} onNext={onNext} withInput />)
    const box = screen.getByLabelText("essay")
    press("1", box); press("Enter", box)
    expect(onPick).not.toHaveBeenCalled()
    expect(onNext).not.toHaveBeenCalled()
  })

  it("leaves browser and OS chords alone", () => {
    const onNext = jest.fn()
    render(<Runner onPick={() => {}} onNext={onNext} />)
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", metaKey: true, bubbles: true }))
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", ctrlKey: true, bubbles: true }))
    expect(onNext).not.toHaveBeenCalled()
  })

  it("toggles the hint bar on ?", () => {
    const onToggleHelp = jest.fn()
    render(<Runner onPick={() => {}} onToggleHelp={onToggleHelp} />)
    press("?")
    expect(onToggleHelp).toHaveBeenCalledTimes(1)
  })

  it("unbinds on unmount", () => {
    const onNext = jest.fn()
    const { unmount } = render(<Runner onPick={() => {}} onNext={onNext} />)
    unmount()
    press("Enter")
    expect(onNext).not.toHaveBeenCalled()
  })
})
