/** @jest-environment node */
/**
 * Every question type the bank can serve must survive a full submit, with
 * the null/empty fields real cached payloads carry (sanitizeQuestion
 * normalises absent optionals to null; free-response keys are '' or null).
 *
 * 2026-10-04: 'essay'/'essay_choice' were servable but missing from the
 * submit schema, so every SSAT/ISEE essay submit 400'd. The type list here
 * is read from assemble.ts's QUESTION_TYPES, so a type added there without
 * a fixture below fails loudly instead of being silently untested.
 *
 * Both paths are covered: the cache row (authoritative, parsed with the
 * same schema — a parse failure there is a 500 the student cannot fix) and
 * the client body.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { POST } from '@/app/api/study/test/submit/route'
import { dbAdmin } from '@/lib/supabase-admin'
import { requireStudyUser } from '@/lib/study/auth'
import { enforceRateLimit } from '@/lib/rate-limit'
import { tableRouter, makeRequest } from '@/tests/study-route-helpers'
import { raiseAlert } from '@/lib/ops/alert'

jest.mock('@/lib/supabase-admin', () => {
  const client = { from: jest.fn(), rpc: jest.fn(), auth: { getUser: jest.fn() } }
  return { dbAdmin: client }
})
jest.mock('@/lib/rate-limit', () => ({ enforceRateLimit: jest.fn(() => null) }))
jest.mock('@/lib/study/auth', () => ({ requireStudyUser: jest.fn() }))
jest.mock('@/lib/study-mastery-assess', () => ({ assessSessionMastery: jest.fn(async () => undefined) }))
jest.mock('@/lib/study/xp', () => ({ awardXp: jest.fn(async () => undefined), XP_VALUES: { session_complete: 50 } }))
jest.mock('@/lib/study/srs-seed', () => ({ seedSrsFromWrongAnswer: jest.fn(async () => undefined) }))
jest.mock('@/lib/ops/alert', () => ({ raiseAlert: jest.fn(async () => undefined) }))
jest.mock('@/lib/study/analytics', () => ({ trackEvent: jest.fn(async () => undefined) }))

const fromMock = dbAdmin.from as unknown as jest.Mock

const assemble = readFileSync(join(process.cwd(), 'src/lib/study/assemble.ts'), 'utf8')
const QUESTION_TYPES = assemble
  .slice(assemble.indexOf('const QUESTION_TYPES'), assemble.indexOf('] as const'))
  .match(/'([a-z_]+)'/g)!.map(s => s.slice(1, -1))

/** Every optional field present and null — the sanitizeQuestion shape. */
const NULLS = {
  passage: null, passageGroupId: null, choices: null, correct_answer: null,
  correct_answers: null, acceptable_answers: null, blanks: null, scored: null,
  bankItemId: null, distractor_rationales: null, graphic: null,
}
const base = (type: string, extra: Record<string, unknown>) => ({
  ...NULLS, prompt: `A ${type} prompt`, type, difficulty: 'medium', explanation: '', ...extra,
})

/** [question, a realistic answer, a blank-ish answer] per type. */
const FIXTURES: Record<string, { q: Record<string, unknown>; answer: string | null; blank: string | null }> = {
  multiple_choice: { q: base('multiple_choice', { choices: ['a', 'b', 'c', 'd'], correct_answer: 'b' }), answer: 'b', blank: null },
  numeric_entry: { q: base('numeric_entry', { acceptable_answers: ['12', '12.0'] }), answer: '12.00', blank: '' },
  multi_select: { q: base('multi_select', { choices: ['a', 'b', 'c'], correct_answers: ['a', 'c'] }), answer: '["c","a"]', blank: '[]' },
  three_choice: { q: base('three_choice', { choices: ['x', 'y', 'z'], correct_answer: 'z' }), answer: 'z', blank: null },
  quant_comparison: { q: base('quant_comparison', { choices: ['A', 'B', 'C', 'D'], correct_answer: 'C' }), answer: 'C', blank: '   ' },
  fill_in_blanks: {
    // Live CtW rows carry an EMPTY correct_answer; the key is the blanks.
    q: base('fill_in_blanks', {
      correct_answer: '', passage: 'Th[1] cat s[2] on the mat.',
      blanks: [{ id: 1, answer: 'e', alternates: null }, { id: 2, answer: 'at', alternates: ['its'] }],
    }),
    answer: '{"1":"e","2":"its"}', blank: '{}',
  },
  arrange_words: { q: base('arrange_words', { choices: ['the', 'cat', 'sat'], correct_answer: 'the | cat | sat' }), answer: 'the | cat | sat', blank: null },
  speaking_repeat: { q: base('speaking_repeat', { correct_answer: 'The library opens at nine.' }), answer: 'the library opens at nine', blank: '' },
  speaking_interview: { q: base('speaking_interview', { correct_answer: '' }), answer: 'I think remote work suits people who plan their own day.', blank: null },
  writing_email: { q: base('writing_email', { correct_answer: '', passage: 'Write to your manager.' }), answer: 'Dear Ms Lee, I am writing to ask about the schedule change next week.', blank: '' },
  writing_discussion: { q: base('writing_discussion', { correct_answer: null }), answer: 'I agree with Kelly because a shorter week would let students rest and come back focused.', blank: null },
  essay: { q: base('essay', { correct_answer: '' }), answer: 'Many students and educators debate this question.', blank: '' },
  essay_choice: { q: base('essay_choice', { correct_answer: null, passage: '[Essay] ...\n\n[Story Starter] ...' }), answer: 'Story\n\nI had practised the apology for a week.', blank: null },
}

const SESSION = { id: 'sess-all', student_id: 'student-1', mode: 'full_test', topic_id: 'topic-1', module2_route: null, topic: { slug: 'toefl-reading' } }

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'error').mockImplementation(() => {})
  ;(requireStudyUser as unknown as jest.Mock).mockResolvedValue({ user: { id: 'student-1' } })
  ;(enforceRateLimit as unknown as jest.Mock).mockReturnValue(null)
})
afterEach(() => { jest.restoreAllMocks() })

it('found the type list and has a fixture for every type', () => {
  expect(QUESTION_TYPES.length).toBeGreaterThanOrEqual(13)
  expect(QUESTION_TYPES.filter(t => !FIXTURES[t])).toEqual([])
})

describe.each([
  ['served from the cache row', true],
  ['legacy session, client body only', false],
])('one of every type, %s', (_label, cached) => {
  async function submit(answers: (string | null)[]) {
    const questions = QUESTION_TYPES.map(t => FIXTURES[t]!.q)
    const enqueue = tableRouter(fromMock)
    enqueue('study_sessions', { data: SESSION })
    enqueue('study_messages', {
      data: cached ? { content: '[full-test-v1]' + JSON.stringify({ title: 't', questions }) } : null,
    })
    enqueue('study_attempts', { data: [] })
    const insert = enqueue('study_attempts', { error: null })
    enqueue('study_sessions', { error: null })
    const res = await POST(makeRequest({
      sessionId: 'sess-all', questions, answers, elapsedSeconds: 600,
      questionSeconds: questions.map(() => null),
    }))
    return { res, insert }
  }

  it('realistic answers: 200, one stored row per item, objective items correct', async () => {
    const { res, insert } = await submit(QUESTION_TYPES.map(t => FIXTURES[t]!.answer))
    const body = await res.json()
    expect({ status: res.status, error: body.error }).toEqual({ status: 200, error: undefined })
    expect(body.verdicts).toHaveLength(QUESTION_TYPES.length)
    const rows = insert.insert.mock.calls[0][0] as { is_correct: boolean | null; question: { type: string } }[]
    expect(rows).toHaveLength(QUESTION_TYPES.length)
    const byType = Object.fromEntries(rows.map(r => [r.question.type, r.is_correct]))
    for (const t of ['speaking_interview', 'writing_email', 'writing_discussion', 'essay', 'essay_choice']) {
      expect([t, byType[t]]).toEqual([t, null])
    }
    for (const t of QUESTION_TYPES.filter(t => byType[t] !== null)) expect([t, byType[t]]).toEqual([t, true])
  })

  it('blank / empty answers: 200, nothing correct, no crash', async () => {
    const { res, insert } = await submit(QUESTION_TYPES.map(t => FIXTURES[t]!.blank))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.correctCount).toBe(0)
    const rows = insert.insert.mock.calls[0][0] as { is_correct: boolean | null }[]
    expect(rows.some(r => r.is_correct === true)).toBe(false)
  })
})

it('a type the schema does not know is a 400 AND an alert, not a silent rejection', async () => {
  // The essay outage ran for days because the 400 reached only the student.
  tableRouter(fromMock)
  const res = await POST(makeRequest({
    sessionId: 'sess-all', questions: [base('brand_new_type', {})], answers: ['x'], elapsedSeconds: 1,
  }))
  expect(res.status).toBe(400)
  expect(raiseAlert).toHaveBeenCalledWith(expect.objectContaining({
    dedupeKey: expect.stringMatching(/^test-submit-bad-payload:questions\.type:invalid_enum_value$/),
  }))
})

it('a cache row the schema cannot read is a 500 AND a critical alert', async () => {
  const enqueue = tableRouter(fromMock)
  const q = base('multiple_choice', { choices: ['a', 'b'], correct_answer: 'a' })
  enqueue('study_sessions', { data: SESSION })
  enqueue('study_messages', {
    data: { content: '[full-test-v1]' + JSON.stringify({ questions: [{ ...q, difficulty: 'extreme' }] }) },
  })
  const res = await POST(makeRequest({ sessionId: 'sess-all', questions: [q], answers: ['a'], elapsedSeconds: 1 }))
  expect(res.status).toBe(500)
  expect(raiseAlert).toHaveBeenCalledWith(expect.objectContaining({ severity: 'critical' }))
})
