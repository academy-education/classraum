/**
 * @jest-environment jsdom
 *
 * The pre-test customization sheet, rendered — the screen a student sees
 * after tapping a full test. Two behaviours are pinned here:
 *
 * 1. TOEFL Speaking is TEXT-GRADED and does not ask. The two-option
 *    chooser (텍스트 기반 / 실음성) must not render, and the config handed
 *    to onStart must not carry `speakingGradeMode`. Other sections must be
 *    unchanged — they never had the chooser and still must not get one.
 * 2. The time amount is translated. In the Korean UI it rendered "35m"
 *    (a hardcoded English unit) regardless of language.
 *
 * `t` here reads the REAL src/locales JSON through the same getNestedValue
 * the provider uses, so a key that exists in en.json but not ko.json fails
 * this file rather than silently rendering the raw path. Only the six-line
 * {param} interpolation is re-implemented (the provider needs AuthContext,
 * which this sheet does not).
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { languages, getNestedValue } from '@/locales'
import { TestCustomizationSheet, type TestConfig } from '@/app/mobile/study/TestCustomizationSheet'

let language: 'english' | 'korean' = 'korean'

function translate(key: string, params?: Record<string, string | number | undefined>): string {
  const raw = getNestedValue(languages[language], key)
  let out = Array.isArray(raw) ? raw.join(', ') : String(raw)
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) out = out.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
    }
  }
  return out
}

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: translate, language }),
}))

// Chainable no-op Supabase stub: every query this sheet fires resolves to
// "no rows", so mastery/credits never drive what we assert on.
jest.mock('@/lib/supabase', () => {
  const chain: Record<string, unknown> = {}
  const self = () => chain
  Object.assign(chain, {
    select: self, eq: self, in: () => Promise.resolve({ data: [] }),
    maybeSingle: () => Promise.resolve({ data: null }),
    then: (r: (v: unknown) => unknown) => Promise.resolve({ data: [] }).then(r),
  })
  return {
    db: {
      auth: { getUser: async () => ({ data: { user: { id: 'student-1' } } }) },
      from: () => chain,
    },
  }
})

function open(props: Partial<React.ComponentProps<typeof TestCustomizationSheet>> = {}) {
  const onStart = jest.fn<void, [TestConfig]>()
  render(
    <TestCustomizationSheet
      open
      defaults={{ count: 17, minutes: 35 }}
      topicId={null}
      family="toefl"
      section="Speaking"
      onClose={() => {}}
      onStart={onStart}
      {...props}
    />,
  )
  return onStart
}

/** The chooser, in whichever language is active. */
const chooserQuery = () => [
  ...screen.queryAllByText(/텍스트 기반/),
  ...screen.queryAllByText(/Text-based/),
  ...screen.queryAllByText(/실음성/),
  ...screen.queryAllByText(/Real audio/),
  ...screen.queryAllByText(/AI 채점 방식|AI grading mode/),
]

describe('TOEFL Speaking is text-based only', () => {
  afterEach(() => { language = 'korean' })

  it('does not offer the audio/text chooser (Korean UI)', () => {
    open()
    expect(chooserQuery()).toHaveLength(0)
  })

  it('does not offer the audio/text chooser (English UI)', () => {
    language = 'english'
    open()
    expect(chooserQuery()).toHaveLength(0)
  })

  it('starts the session with no speakingGradeMode — i.e. the text grader', async () => {
    const onStart = open()
    fireEvent.click(screen.getByText('시험 시작'))
    await waitFor(() => expect(onStart).toHaveBeenCalled())
    const config = onStart.mock.calls[0][0]
    // NOT toBe('text'): the generator treats an absent field as text, and
    // an explicit 'audio' is the only thing that switches graders.
    expect(config.speakingGradeMode).toBeUndefined()
  })

  it('leaves non-Speaking TOEFL sections alone (still no chooser)', () => {
    open({ section: 'Reading Writing' })
    expect(chooserQuery()).toHaveLength(0)
  })

  it('leaves other families alone (still no chooser)', () => {
    open({ family: 'sat', section: 'Reading Writing' })
    expect(chooserQuery()).toHaveLength(0)
  })
})

describe('the test-format chips are translated', () => {
  afterEach(() => { language = 'korean' })

  it('renders the time amount in Korean, not "35m"', () => {
    open()
    expect(screen.getByText('35분')).toBeInTheDocument()
    expect(screen.queryByText('35m')).not.toBeInTheDocument()
  })

  it('renders the time amount in English', () => {
    language = 'english'
    open()
    expect(screen.getByText('35m')).toBeInTheDocument()
  })

  it('labels both chips from the locale files', () => {
    open()
    expect(screen.getByText('제한 시간')).toBeInTheDocument()
    expect(screen.getByText('문항 수')).toBeInTheDocument()
    language = 'english'
    expect(translate('study.testConfig.timeLimit')).toBe('Time limit')
    expect(translate('study.testConfig.questionCount')).toBe('Questions')
  })

  it('has the unit key in BOTH locale files, with the right unit', () => {
    // A key present only in en.json renders as the raw dotted path in ko.
    expect(getNestedValue(languages.english, 'study.testConfig.timeLimitValue')).toBe('{minutes}m')
    expect(getNestedValue(languages.korean, 'study.testConfig.timeLimitValue')).toBe('{minutes}분')
  })
})
