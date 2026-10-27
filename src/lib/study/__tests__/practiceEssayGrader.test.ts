/** @jest-environment node */
/**
 * The practice-essay grader (2026-10-27). No real model: every call is a
 * fake. Pins that the grader reads the CHOSEN prompt only, that the band is
 * derived from the criteria (and capped by the prompt criterion, never
 * zeroed), that a failure throws instead of becoming a score, and that the
 * persistence path stores it under the practice family.
 */
import { SSAT_WRITING_SERVED_2026_10_11 } from '@/lib/study/__fixtures__/ssat-writing-served'
import { encodeEssayAnswer, practiceEssayTask } from '@/lib/study/essayChoice'
import { practiceOverallBand, PRACTICE_CRITERIA, quoteAppearsIn } from '@/lib/study/practiceEssay'
import {
  buildPracticeEssayPrompt, runPracticeEssayGrade, PRACTICE_RUBRIC_TEXT,
  type PracticeEssayCall, type PracticeEssayGradeObject,
} from '@/lib/study/practiceEssayGrader'
import { gradeAndPersistResponse, GradeGenerationError } from '@/lib/study/gradeResponse'
import { dbAdmin } from '@/lib/supabase-admin'
import { runStagedGrade } from '@/lib/study/gradePipeline'

jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: { from: jest.fn() } }))
jest.mock('@/lib/study/gradePipeline', () => ({ runStagedGrade: jest.fn() }))
jest.mock('@ai-sdk/openai', () => ({ createOpenAI: () => () => ({}) }))
jest.mock('ai', () => ({ generateObject: jest.fn(() => { throw new Error('real model must not be called') }) }))

const SERVED = SSAT_WRITING_SERVED_2026_10_11.questions[0]!
const STORY = 'The vending machine gave back more money than I had put in, and the next day it did it again.'
const ESSAY_HEAD = 'When a school team or club has more people'
const BODY = `${STORY} At first I told nobody. Then I told the office, and the owner laughed.`
const ANSWER = encodeEssayAnswer('Story Starter', BODY)

const object = (scores: Partial<Record<string, number>> = {}): PracticeEssayGradeObject => ({
  criteria: PRACTICE_CRITERIA.map(k => ({ key: k, evidence: `"${STORY.slice(0, 20)}" fine.`, score: scores[k] ?? 4 })),
  strengths: [{ quote: 'Then I told the office', comment: 'A clear turn.' }],
  improvements: [{ quote: 'I never wrote this sentence', issue: 'x', suggestion: 'y' }],
  summary: 'Good start.',
})

/** The task block of a grader prompt — NOT the response block, which for a
 *  story starter also contains the starter sentence and would satisfy a
 *  whole-prompt toContain() even if the task were wrong. */
const taskBlock = (prompt: string) =>
  prompt.split('----- THE PROMPT THE STUDENT CHOSE -----')[1]!.split('----- STUDENT RESPONSE -----')[0]!

const fakeCall = (o: PracticeEssayGradeObject) => {
  const prompts: string[] = []
  const call: PracticeEssayCall = async ({ prompt }) => { prompts.push(prompt); return { object: o } }
  return { call, prompts }
}

describe('runPracticeEssayGrade', () => {
  const task = practiceEssayTask(SERVED, ANSWER)

  it('the grader sees the chosen prompt and the unmarked response, not the other prompt', async () => {
    const { call, prompts } = fakeCall(object())
    await runPracticeEssayGrade({ family: 'ssat', task, language: 'en' }, call)
    expect(prompts).toHaveLength(1)
    expect(taskBlock(prompts[0]!)).toContain(STORY)
    expect(taskBlock(prompts[0]!)).toContain('[Story Starter]')
    expect(prompts[0]).not.toContain(ESSAY_HEAD)
    expect(prompts[0]).toContain(BODY)
    expect(prompts[0]).not.toContain('[[prompt:')
    expect(prompts[0]).toContain('STORY STARTER')
  })

  it('derives the band from the criteria and verifies quotes', async () => {
    const { call } = fakeCall(object({ addresses_prompt: 5, organization: 4, development: 4, language_style: 3, conventions: 4 }))
    const r = await runPracticeEssayGrade({ family: 'ssat', task, language: 'en' }, call)
    expect(r.overallBand).toBe(4)
    expect(r.scaleMax).toBe(5)
    expect(r.criteria.map(c => c.key)).toEqual([...PRACTICE_CRITERIA])
    const [strength, improve] = r.annotations
    expect(strength).toMatchObject({ kind: 'strength', quoteVerified: true })
    expect(improve).toMatchObject({ kind: 'improve', quoteVerified: false })
  })

  it('a failed model call throws; it never yields a score', async () => {
    const call: PracticeEssayCall = async () => { throw new Error('upstream 500') }
    await expect(runPracticeEssayGrade({ family: 'ssat', task, language: 'en' }, call)).rejects.toThrow('upstream 500')
  })

  it('a missing criterion throws rather than being invented', async () => {
    const o = object()
    o.criteria[4] = { ...o.criteria[0]! } // duplicate addresses_prompt, conventions missing
    const { call } = fakeCall(o)
    await expect(runPracticeEssayGrade({ family: 'ssat', task, language: 'en' }, call)).rejects.toThrow(/missing criterion conventions/)
  })

  it('refuses an empty response instead of grading it', async () => {
    const { call, prompts } = fakeCall(object())
    await expect(runPracticeEssayGrade({ family: 'ssat', task: { ...task, essayText: '  ' }, language: 'en' }, call)).rejects.toThrow()
    expect(prompts).toHaveLength(0)
  })

  it('the rubric says it is ours, not official', () => {
    expect(PRACTICE_RUBRIC_TEXT).toMatch(/PRACTICE rubric written by Classraum/)
    expect(PRACTICE_RUBRIC_TEXT).toMatch(/Never call these scores official/)
    expect(buildPracticeEssayPrompt({ family: 'isee', task, language: 'ko' })).toMatch(/Output language: Korean/)
  })
})

describe('practiceOverallBand', () => {
  it('is the half-rounded mean, capped at one band above the prompt criterion, never below 1', () => {
    expect(practiceOverallBand({ addresses_prompt: 4, organization: 4, development: 4, language_style: 4, conventions: 4 })).toBe(4)
    // Polished but off-prompt: mean 4.2 capped to 2.
    expect(practiceOverallBand({ addresses_prompt: 1, organization: 5, development: 5, language_style: 5, conventions: 5 })).toBe(2)
    expect(practiceOverallBand({ addresses_prompt: 1, organization: 1, development: 1, language_style: 1, conventions: 1 })).toBe(1)
    // Out-of-range model output is clamped into 1-5, never 0.
    expect(practiceOverallBand({ addresses_prompt: 0, organization: 0, development: 0, language_style: 0, conventions: 0 })).toBe(1)
  })
  it('quoteAppearsIn tolerates case, curly quotes and spacing but not invention', () => {
    expect(quoteAppearsIn('then I  told the OFFICE', BODY)).toBe(true)
    expect(quoteAppearsIn('told the police', BODY)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// The persistence path: gradeAndPersistResponse with a practice family.
// ---------------------------------------------------------------------------

const from = dbAdmin.from as unknown as jest.Mock
function fakeDb() {
  const inserts: Array<{ table: string; payload: Record<string, unknown> }> = []
  from.mockImplementation((table: string) => {
    let op = 'select'
    let payload: Record<string, unknown> = {}
    const b: Record<string, unknown> = {}
    for (const m of ['select', 'order', 'limit', 'maybeSingle', 'single', 'eq']) b[m] = jest.fn(() => b)
    b.insert = jest.fn((p: Record<string, unknown>) => { op = 'insert'; payload = p; return b })
    b.then = async (ok: (v: unknown) => unknown) => {
      if (op === 'insert') {
        inserts.push({ table, payload })
        return ok({ data: table === 'study_response_submissions' ? { id: 'sub-1' } : null, error: null })
      }
      return ok({ data: null, error: null })
    }
    return b
  })
  return inserts
}

describe('gradeAndPersistResponse — practice family', () => {
  beforeEach(() => { jest.clearAllMocks(); jest.spyOn(console, 'error').mockImplementation(() => {}) })
  afterEach(() => { (console.error as jest.Mock).mockRestore?.() })

  const base = {
    userId: 'u1', sessionId: 's1', sessionLanguage: 'en', testFamily: 'ssat' as const, skill: 'writing' as const,
    promptText: SERVED.prompt, responseText: ANSWER, practiceTask: practiceEssayTask(SERVED, ANSWER),
  }

  it('grades through the practice call, never the ETS pipeline, and stores the practice family', async () => {
    const inserts = fakeDb()
    const { call, prompts } = fakeCall(object())
    const r = await gradeAndPersistResponse({ ...base, practiceCall: call })
    expect(runStagedGrade).not.toHaveBeenCalled()
    expect(taskBlock(prompts[0]!)).toContain(STORY)
    expect(taskBlock(prompts[0]!)).toContain('[Story Starter]')
    expect(prompts[0]).not.toContain(ESSAY_HEAD)
    expect(r.scaleMax).toBe(5)
    expect(r.grade.overallBand).toBe(4)
    const sub = inserts.find(i => i.table === 'study_response_submissions')!.payload
    expect(sub).toMatchObject({ test_family: 'ssat', prompt_text: SERVED.prompt, response_text: ANSWER })
    // Words the student wrote, not the marker.
    expect(sub.word_count).toBe(BODY.split(/\s+/).length)
    const g = inserts.find(i => i.table === 'study_response_grades')!.payload
    expect(g).toMatchObject({ overall_band: 4, grader_model: 'gpt-4o+practice-essay-v1' })
  })

  it('a grading failure throws GradeGenerationError and writes nothing', async () => {
    const inserts = fakeDb()
    const call: PracticeEssayCall = async () => { throw new Error('boom') }
    await expect(gradeAndPersistResponse({ ...base, practiceCall: call })).rejects.toBeInstanceOf(GradeGenerationError)
    expect(inserts).toHaveLength(0)
  })

  it('refuses to grade a practice essay without its resolved task', async () => {
    const inserts = fakeDb()
    await expect(gradeAndPersistResponse({ ...base, practiceTask: undefined })).rejects.toBeInstanceOf(GradeGenerationError)
    expect(inserts).toHaveLength(0)
  })
})
