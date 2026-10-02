/** @jest-environment node */
/**
 * CLAUDE.md, "'idempotent' that is a read followed by a write is not": two
 * callers graded the same essay ~1.5s apart, both missed the cache SELECT,
 * both INSERTed, and the result screen read whichever of two disagreeing
 * bands it fetched first.
 *
 * This models two concurrent gradeAndPersistResponse calls against a fake
 * table that enforces migration 115's unique indexes, with a grader that
 * returns a DIFFERENT band each call (it did: 4 then 3). The invariant: one
 * submission row, one grade row, and both callers report the same band.
 */
import { gradeAndPersistResponse } from '@/lib/study/gradeResponse'
import { dbAdmin } from '@/lib/supabase-admin'
import { runStagedGrade } from '@/lib/study/gradePipeline'

jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: { from: jest.fn() } }))
jest.mock('@/lib/study/gradePipeline', () => ({ runStagedGrade: jest.fn() }))
jest.mock('@ai-sdk/openai', () => ({ createOpenAI: () => () => ({}) }))
jest.mock('ai', () => ({ generateObject: jest.fn() }))

const from = dbAdmin.from as unknown as jest.Mock
const staged = runStagedGrade as unknown as jest.Mock
const tick = () => new Promise(r => setTimeout(r, 0))

type Sub = { id: string; session_id: string; student_id: string; prompt_text: string; response_text: string; grader_route: string; created_at: number }
type Grade = { submission_id: string; overall_band: number; rubric_scores: unknown; annotations: unknown; model_rewrite: null; summary: null }

function fakeTables(opts: { enforceUnique: boolean; slowFirstGrade?: boolean; gradeInsertDelays?: number[] }) {
  const subs: Sub[] = []
  const grades: Grade[] = []
  let seq = 0
  let slowDone = false
  let gradeInsertCall = 0
  from.mockImplementation((table: string) => {
    const filters: Record<string, unknown> = {}
    let op = 'select'
    let payload: Record<string, unknown> = {}
    const b: Record<string, unknown> = {}
    for (const m of ['select', 'order', 'limit', 'maybeSingle', 'single']) b[m] = jest.fn(() => b)
    b.eq = jest.fn((k: string, v: unknown) => { filters[k] = v; return b })
    b.insert = jest.fn((p: Record<string, unknown>) => { op = 'insert'; payload = p; return b })
    b.then = async (ok: (v: unknown) => unknown) => {
      await tick()
      if (table === 'study_attempts') return ok({ data: null, error: null })
      const withGrades = (s: Sub) => ({ ...s, study_response_grades: grades.filter(g => g.submission_id === s.id) })
      if (table === 'study_response_submissions' && op === 'select') {
        const rows = subs
          .filter(s => Object.entries(filters).every(([k, v]) => (s as Record<string, unknown>)[k] === v))
          .sort((a, b2) => b2.created_at - a.created_at)
          .map(withGrades)
        // the cache read uses .maybeSingle() after limit(1); the adopt read wants the list
        const single = (b.maybeSingle as jest.Mock).mock.calls.length > 0
        return ok({ data: single ? rows[0] ?? null : rows, error: null })
      }
      if (table === 'study_response_submissions' && op === 'insert') {
        const row = { grader_route: 'text', ...payload, id: `sub-${++seq}`, created_at: seq } as unknown as Sub
        if (opts.enforceUnique && subs.some(s => s.session_id === row.session_id && s.student_id === row.student_id &&
          s.prompt_text === row.prompt_text && s.response_text === row.response_text && s.grader_route === row.grader_route)) {
          return ok({ data: null, error: { code: '23505', message: 'duplicate key' } })
        }
        subs.push(row)
        return ok({ data: { id: row.id }, error: null })
      }
      if (table === 'study_response_grades' && op === 'insert') {
        const delay = opts.gradeInsertDelays?.[gradeInsertCall++] ?? 0
        for (let i = 0; i < delay; i++) await tick()
        if (opts.slowFirstGrade && grades.length === 0 && payload.submission_id === 'sub-1' && !slowDone) {
          slowDone = true
          for (let i = 0; i < 20; i++) await tick()
        }
        if (opts.enforceUnique && grades.some(g => g.submission_id === payload.submission_id)) {
          return ok({ data: null, error: { code: '23505', message: 'duplicate key' } })
        }
        grades.push(payload as unknown as Grade)
        return ok({ data: null, error: null })
      }
      return ok({ data: null, error: null })
    }
    return b
  })
  return { subs, grades }
}

const params = {
  userId: 'stu', sessionId: 'sess', sessionLanguage: 'en',
  testFamily: 'toefl' as const, skill: 'writing' as const, taskType: 'academic_discussion' as const,
  promptText: 'Discuss whether cities should ban cars from their centres.',
  responseText: 'I think cities should ban cars because it reduces pollution and noise for residents.',
}

describe('gradeAndPersistResponse — two concurrent callers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {})
    let band = 5
    staged.mockImplementation(async () => {
      await tick()
      band -= 1 // 4, then 3: the grader is not deterministic
      return {
        grade: { overallBand: band, criteria: {}, annotations: [], modelRewrite: null, summary: null },
        usage: { tokensIn: 1, tokensOut: 1 },
        relevance: null, relevanceCeiling: null, ceilingApplied: false, languageScore: band, zeroReasons: [],
      }
    })
  })

  it('persists one submission and one grade, and both callers report the same band', async () => {
    const t = fakeTables({ enforceUnique: true })
    const [a, b] = await Promise.all([gradeAndPersistResponse(params), gradeAndPersistResponse(params)])
    expect(t.subs).toHaveLength(1)
    expect(t.grades).toHaveLength(1)
    expect(a.grade.overallBand).toBe(b.grade.overallBand)
    expect(a.submissionId).toBe(b.submissionId)
  })

  it('when the winner\'s grade lands AFTER the loser adopts the row, only one grade is kept and both report it', async () => {
    const t = fakeTables({ enforceUnique: true, slowFirstGrade: true })
    const [a, b] = await Promise.all([gradeAndPersistResponse(params), gradeAndPersistResponse(params)])
    expect(t.subs).toHaveLength(1)
    expect(t.grades).toHaveLength(1)
    expect(a.grade.overallBand).toBe(b.grade.overallBand)
    expect(a.grade.overallBand).toBe(t.grades[0]!.overall_band)
  })

  it('when both grade inserts race after the loser adopted the row, the loser reads back the winner\'s grade', async () => {
    // winner's grade insert lands after the loser's adopt read; the loser's
    // attach lands after that and hits the one-grade-per-submission index.
    const t = fakeTables({ enforceUnique: true, gradeInsertDelays: [5, 20] })
    const [a, b] = await Promise.all([gradeAndPersistResponse(params), gradeAndPersistResponse(params)])
    expect(t.grades).toHaveLength(1)
    expect(a.grade.overallBand).toBe(b.grade.overallBand)
    expect(a.grade.overallBand).toBe(t.grades[0]!.overall_band)
  })

  it('without the unique index the same calls produce the duplicate (the instrument can fail)', async () => {
    const t = fakeTables({ enforceUnique: false })
    const [a, b] = await Promise.all([gradeAndPersistResponse(params), gradeAndPersistResponse(params)])
    expect(t.subs).toHaveLength(2)
    expect(a.grade.overallBand).not.toBe(b.grade.overallBand)
  })
})
