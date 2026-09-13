/**
 * RENDER test for the review card — what the student actually sees.
 *
 * The companion source-assertion suite pins that the fields are referenced.
 * This one mounts the card and asserts the passage text, the transcript, and
 * every option are on screen, with the student's pick and the key visually
 * distinct. The live page is behind a login, so this is the strongest
 * verification available without credentials.
 */
import { render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom'

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (k: string) => k, language: 'en' }),
}))
jest.mock('@/lib/auth-headers', () => ({ authHeaders: async () => ({}) }))
jest.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }))
/* The Select primitive pulls in nativeHaptics, which calls
 * Capacitor.registerPlugin at module scope and throws under jsdom. Without
 * this the suite dies AT IMPORT and reports `Tests: 0 total` while the other
 * suites still print their passes — the failure mode CLAUDE.md names. */
jest.mock('@/lib/nativeHaptics', () => ({
  hapticSelection: jest.fn(), hapticImpact: jest.fn(), hapticSuccess: jest.fn(),
  hapticWarning: jest.fn(), hapticError: jest.fn(),
}))
jest.mock('../_shared/ExplainMore', () => ({
  // Echo the passage prop so the test can prove the AI is handed the text.
  ExplainMore: ({ passage }: { passage?: string }) => (
    <div data-testid="explain-more" data-passage={passage ?? ''} />
  ),
}))

import { NotebookEntryCard } from '../_shared/WrongNotebookView'

const base = {
  attempt_id: 'a1', student_answer: 'Wait for an email from the department',
  ai_explanation: null, attempted_at: '2026-09-13T00:00:00Z',
  topic: null, topic_freeform: 'TOEFL Reading', note: '', note_updated_at: null,
  reviewed_at: null, difficulty: 'hard',
  saved_steps: null, saved_simpler: null, saved_steps_lang: null,
  saved_simpler_lang: null, saved_followup: null, saved_followup_lang: null,
  saved_followup_question: null,
}

const READING = {
  ...base,
  question: {
    prompt: '[Daily Life — Course-registration page] What should students do if they have questions about registration?',
    type: 'multiple_choice',
    passage: 'Course registration for the spring term opens on January 4. Registration closes at 5:00 PM on January 15th. Students with questions about registration should contact the registrar’s office.',
    choices: [
      'Contact the registrar’s office',
      'Wait for an email from the department',
      'Visit the library help desk',
      'Submit a form to their advisor',
    ],
    correct_answer: 'Contact the registrar’s office',
    distractor_rationales: [
      { choice: 'Wait for an email from the department', reason: 'The notice does not mention any email being sent.' },
      { choice: 'Visit the library help desk', reason: '' },
    ],
  },
}

const LISTENING = {
  ...base,
  attempt_id: 'a2',
  student_answer: 'At 5:00 PM on January 20',
  question: {
    prompt: 'When does registration close?',
    type: 'multiple_choice',
    passage: 'Transcript: "Registration closes at 5:00 PM on January 15th, so don’t leave it late."',
    choices: ['At 5:00 PM on January 20', 'At 5:00 PM on January 15', 'On January 8', 'On January 4'],
    correct_answer: 'At 5:00 PM on January 15',
  },
}

const noop = () => {}

/** The ringed option row that owns a given option label. */
const row = (el: HTMLElement) => el.closest('[class*="ring-1"]') as HTMLElement

describe('reading item', () => {
  beforeEach(() => render(
    <NotebookEntryCard entry={READING as never} index={0} ko={false} onToggleReviewed={noop} />,
  ))

  it('shows the passage without the student tapping anything', () => {
    expect(screen.getByText(/Registration closes at 5:00 PM on January 15th/)).toBeInTheDocument()
    expect(screen.getByText('study.wrongNotebook.passage')).toBeInTheDocument()
  })

  it('shows every option, not only the pick and the key', () => {
    for (const c of READING.question.choices) {
      expect(screen.getByText(c)).toBeInTheDocument()
    }
  })

  it('marks the key green and the student pick red', () => {
    // The OPTION ROW, not the inner text wrapper: the option text sits inside
    // a `flex-1 min-w-0` div that holds the label and its rationale, so
    // `closest('div')` lands one level too low. The row is the ringed element.
    const key = screen.getByText('Contact the registrar’s office')
    const picked = screen.getByText('Wait for an email from the department')
    expect(row(key).className).toMatch(/emerald/)
    expect(row(picked).className).toMatch(/rose/)
    expect(picked.className).toMatch(/line-through/)
  })

  it('prints the author-written reason a distractor is wrong, and skips empty ones', () => {
    expect(screen.getByText(/does not mention any email/)).toBeInTheDocument()
    // 'Visit the library help desk' has reason '' — no label may render for it.
    const empty = screen.getByText('Visit the library help desk').closest('div')!
    expect(within(empty).queryByText(/whyWrong/)).toBeNull()
  })

  it('hands the passage to the AI panel', () => {
    expect(screen.getByTestId('explain-more').getAttribute('data-passage'))
      .toMatch(/Registration closes at 5:00 PM/)
  })
})

describe('listening item', () => {
  beforeEach(() => render(
    <NotebookEntryCard entry={LISTENING as never} index={1} ko={false} onToggleReviewed={noop} />,
  ))

  it('shows the script, labelled as a transcript', () => {
    expect(screen.getByText('study.wrongNotebook.transcript')).toBeInTheDocument()
    expect(screen.queryByText('study.wrongNotebook.passage')).toBeNull()
  })

  it('strips the `Transcript:` prefix from the body the student reads', () => {
    const body = screen.getByText(/Registration closes at 5:00 PM on January 15th/)
    expect(body.textContent!.startsWith('Transcript:')).toBe(false)
    expect(body.textContent).toMatch(/^"Registration closes/)
  })

  it('marks the wrong pick red and the right answer green', () => {
    expect(row(screen.getByText('At 5:00 PM on January 20')).className).toMatch(/rose/)
    expect(row(screen.getByText('At 5:00 PM on January 15')).className).toMatch(/emerald/)
  })

  it('hands the transcript to the AI panel, prefix already stripped', () => {
    const p = screen.getByTestId('explain-more').getAttribute('data-passage')!
    expect(p).toMatch(/Registration closes/)
    expect(p.startsWith('Transcript:')).toBe(false)
  })
})

describe('an item that stores no choices', () => {
  it('falls back to the two-line form instead of an empty list', () => {
    const speaking = {
      ...base, attempt_id: 'a3', student_answer: 'I would say yes',
      question: { prompt: 'Describe a place you like.', type: 'speaking_interview', correct_answer: '—' },
    }
    render(<NotebookEntryCard entry={speaking as never} index={2} ko={false} onToggleReviewed={noop} />)
    expect(screen.getByText('I would say yes')).toBeInTheDocument()
    expect(screen.queryByText('study.wrongNotebook.passage')).toBeNull()
  })
})
