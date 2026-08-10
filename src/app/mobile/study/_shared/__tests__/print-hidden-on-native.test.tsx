/**
 * The print/PDF entry point on the 오답노트 is WEB-ONLY.
 *
 * Why: a Capacitor WebView has no print dialog and no file system the
 * student can reach, so the button leads nowhere on iOS and Android. It
 * is HIDDEN there rather than disabled — a greyed-out control still
 * advertises a feature and reports it broken.
 *
 * The route at /mobile/study/wrong-notebook/print is deliberately NOT
 * gated (see the header comment in that file); only the affordance is.
 * So these tests assert on the LINK, not on route reachability.
 *
 * BREAK-TEST: invert the gate in WrongNotebookView.tsx (`isNative ?` →
 * `!isNative ?`) and the two native cases plus the web case fail — 3 of
 * 4 red. Restoring makes all 4 green again.
 */
import { act, render, screen, waitFor } from '@testing-library/react'
import { WrongNotebookInner } from '../WrongNotebookView'

let mockPlatform = 'ios'
// isNativePlatform follows mockPlatform rather than a hardcoded true:
// the web case exists to prove the gate does not leak into the browser,
// and a hardcoded true would make that unprovable.
jest.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => mockPlatform !== 'web',
    getPlatform: () => mockPlatform,
  },
  // The shared primitives pull in haptics, which calls registerPlugin at
  // import time. Mocking core without it dies at import — and a suite
  // that dies at import collects ZERO tests while still printing green
  // for every other suite in the run.
  registerPlugin: () => ({}),
}))
jest.mock('@capacitor/haptics', () => ({
  Haptics: { impact: jest.fn(), notification: jest.fn(), vibrate: jest.fn() },
  ImpactStyle: { Light: 'LIGHT', Medium: 'MEDIUM', Heavy: 'HEAVY' },
  NotificationType: { Success: 'SUCCESS', Warning: 'WARNING', Error: 'ERROR' },
}))
jest.mock('@/hooks/useTranslation', () => {
  const t = (k: string) => k
  return { useTranslation: () => ({ t, tList: () => [], language: 'english', setLanguage: () => {} }) }
})
jest.mock('@/lib/auth-headers', () => ({ authHeaders: async () => ({}) }))

/**
 * One wrong answer on file. The header (and therefore the print button)
 * renders regardless, but a populated notebook is the realistic case and
 * keeps the empty state from being what we are really testing.
 */
const PAYLOAD = {
  entries: [{
    attempt_id: 'a-1',
    question: { prompt: '2 + 2 = ?', correct_answer: '4' },
    student_answer: '5',
    ai_explanation: null,
    attempted_at: '2026-08-01T00:00:00.000Z',
    topic: null,
    topic_freeform: null,
    note: '',
    note_updated_at: null,
    reviewed_at: null,
    difficulty: 'easy',
    saved_steps: null,
    saved_simpler: null,
    saved_steps_lang: null,
    saved_simpler_lang: null,
  }],
  topics: [],
  bookmarkedSnaps: [],
}

beforeEach(() => {
  window.scrollTo = jest.fn()
  global.fetch = jest.fn(async () => ({
    ok: true, json: async () => PAYLOAD,
  })) as unknown as typeof fetch
})
afterEach(() => { jest.restoreAllMocks() })

/**
 * `asTab` is how the SHIPPED surface renders it (/mobile/study/review is
 * a bottom-nav root). Default it, so these tests exercise the real one.
 */
const mount = async (asTab = true) => {
  render(<WrongNotebookInner asTab={asTab} />)
  // Wait for the load to settle so the header is in its final state.
  await waitFor(() => expect(screen.getByText('2 + 2 = ?')).toBeInTheDocument())
  await act(async () => { await Promise.resolve() })
}

/** The print entry point, identified by its href — not by its label. */
const printLink = () =>
  screen.queryAllByRole('link').find(a =>
    (a.getAttribute('href') ?? '').includes('/wrong-notebook/print'))

describe('print/PDF entry point by platform', () => {
  it.each(['ios', 'android'])('%s hides the print link entirely', async (platform) => {
    mockPlatform = platform
    await mount()
    expect(printLink()).toBeUndefined()
    // Hidden, not disabled: no leftover print affordance of any kind.
    expect(screen.queryByText('study.wrongNotebook.print')).not.toBeInTheDocument()
  })

  // Both mount modes, because the standalone page and the Review tab
  // pass the same rightSlot and either could have been gated by accident.
  it.each([true, false])('the web keeps the print link (asTab=%s)', async (asTab) => {
    mockPlatform = 'web'
    await mount(asTab)
    const link = printLink()
    expect(link).toBeDefined()
    expect(link).toHaveAttribute('href', '/mobile/study/wrong-notebook/print')
    expect(screen.getByText('study.wrongNotebook.print')).toBeInTheDocument()
  })

  it('the notebook itself renders on native — only the print button goes', async () => {
    // The regression this guards is the one the subscription page hit:
    // a platform gate that deleted the surrounding surface, not just the
    // one control it was aimed at.
    mockPlatform = 'ios'
    await mount()
    expect(screen.getByText('2 + 2 = ?')).toBeInTheDocument()
  })
})
