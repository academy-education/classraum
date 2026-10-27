/**
 * @jest-environment jsdom
 *
 * The review card for an SSAT Writing Sample (2026-10-27): it shows the
 * prompt the student CHOSE (not both), the essay without the choice marker,
 * the practice band with criteria and comments under the owner's practice
 * label — and, with no stored grade, "feedback unavailable / retry", never a
 * band. Retry re-runs the one whole-test batch; the card never grades.
 */
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { SSAT_WRITING_SERVED_2026_10_11 } from '@/lib/study/__fixtures__/ssat-writing-served'
import { encodeEssayAnswer } from '@/lib/study/essayChoice'
import { buildResultModel } from '@/lib/study/test-result'
import { PRACTICE_CRITERIA } from '@/lib/study/practiceEssay'

jest.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ t: (k: string) => k, language: 'en' }) }))
jest.mock('@/lib/auth-headers', () => ({ authHeaders: async () => ({}) }))
jest.mock('@/lib/supabase', () => ({ db: {} }))
jest.mock('@/app/mobile/study/_shared/ReportQuestion', () => ({ ReportQuestion: () => null }))
jest.mock('@/app/mobile/study/_shared/PathMascot', () => ({ PathMascot: () => null }))

import { TestResultView } from '../TestResultView'
import { PRACTICE_FEEDBACK_NOTE } from '../PracticeEssayFeedback'

const Q = SSAT_WRITING_SERVED_2026_10_11.questions[0]! as never as Parameters<typeof buildResultModel>[0]['cards'][number]['question']
const STORY = 'The vending machine gave back more money than I had put in, and the next day it did it again.'
const ESSAY_HEAD = 'When a school team or club has more people'
const BODY = `${STORY} I told the office.`
const ANSWER = encodeEssayAnswer('Story Starter', BODY)

const model = buildResultModel({
  family: 'ssat', correctCount: 0, totalScored: 0, scorePercent: 0,
  cards: [{ question: Q, studentAnswer: ANSWER, correct: false, ungraded: true, position: 0, timeSpentSeconds: null }],
})

const practiceGrade = {
  band: 3.5, scaleMax: 5, summary: 'A clear turn; develop the middle.', skill: 'writing', practice: true,
  criteria: PRACTICE_CRITERIA.map((k, i) => ({ key: k, evidence: `evidence-${k}`, score: [4, 3, 3, 4, 3.5][i] })),
  comments: [
    { kind: 'strength', quote: 'I told the office', comment: 'Decisive ending.', quoteVerified: true },
    { kind: 'improve', quote: 'invented words', issue: 'Thin middle.', suggestion: 'Add a scene.', quoteVerified: false },
  ],
}

let gradeCalls: string[] = []
const mockFetch = (grades: Record<string, unknown>) => {
  gradeCalls = []
  global.fetch = jest.fn(async (url: RequestInfo | URL) => {
    const u = String(url)
    gradeCalls.push(u)
    if (u.includes('/api/study/response/grades')) return { ok: true, status: 200, json: async () => ({ grades }) } as unknown as Response
    return { ok: true, status: 200, json: async () => ({}) } as unknown as Response
  }) as unknown as typeof fetch
}

afterEach(() => { jest.restoreAllMocks() })

const openCard = async () => {
  render(<TestResultView model={model} sessionId="s1" ko={false} />)
  fireEvent.click(await screen.findByRole('button', { name: /study\.test\.reviewTitle/ }))
  const toggle = await screen.findByRole('button', { expanded: false, name: /Choose ONE of the two prompts/ })
  fireEvent.click(toggle)
}

it('shows the chosen prompt only, the essay without its marker, and the practice feedback', async () => {
  mockFetch({ [Q.prompt]: practiceGrade })
  await openCard()
  const fb = await screen.findByTestId('practice-feedback')
  expect(fb.textContent).toContain('3.5')
  expect(fb.textContent).toContain(PRACTICE_FEEDBACK_NOTE.en)
  expect(fb.textContent).toContain('Builds from the given sentence') // story wording of the criterion
  expect(fb.textContent).toContain('Narrative development')
  expect(fb.textContent).toContain('evidence-conventions')
  expect(fb.textContent).toContain('Decisive ending.')
  expect(fb.textContent).toContain('Add a scene.')
  // An unverified quote is not presented as the student's words.
  expect(fb.textContent).not.toContain('invented words')

  const page = document.body.textContent ?? ''
  expect(page).toContain('Prompt chosen · Story Starter')
  expect(page).not.toContain(ESSAY_HEAD)
  expect(page).toContain(BODY)
  expect(page).not.toContain('[[prompt:')
  // No "Correct answer" box for an essay.
  expect(page).not.toContain('Correct answer')
})

it('with no grade: feedback unavailable and a retry that re-runs the batch — never a band', async () => {
  mockFetch({})
  await openCard()
  const box = await screen.findByTestId('practice-feedback-unavailable')
  expect(box.textContent).toContain(PRACTICE_FEEDBACK_NOTE.en)
  expect(screen.queryByTestId('practice-feedback')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Retry feedback' }))
  await waitFor(() => expect(gradeCalls.filter(u => u.includes('/api/study/response/grade-batch'))).toHaveLength(1))
  // And grades are re-read afterwards.
  await waitFor(() => expect(gradeCalls.filter(u => u.includes('/api/study/response/grades')).length).toBeGreaterThanOrEqual(2))
  // The card never grades through the per-item route.
  expect(gradeCalls.some(u => /\/api\/study\/response\/grade(\?|$)/.test(u))).toBe(false)
})
