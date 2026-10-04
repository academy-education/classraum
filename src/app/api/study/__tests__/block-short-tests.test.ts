/** @jest-environment node */
/**
 * "Block short tests" (owner decision, 2026-10-04), at the routes.
 *
 * A paid full-test section the bank cannot fill to its blueprint count is
 * not started and costs nothing; the student gets a typed 409
 * { code: 'section_unavailable' } that every client surface turns into a
 * polite sheet. Learning-path stops (free, own length) are exempt. Module 2
 * of an adaptive section is never delivered short: TOEFL falls back to the
 * other Stage-2 path, and if nothing fills, the session is refunded.
 *
 * The assemblers are mocked here — their own short detection is pinned in
 * src/lib/__tests__/assemble-require-full.test.ts. What this file pins is
 * what the ROUTES do with it: order (draw before charge), the typed body,
 * the alert, the exemption, and the module-2 fallback.
 */
import { POST as assemblePOST } from '@/app/api/study/test/assemble/route'
import { POST as routePOST } from '@/app/api/study/test/route/route'
import { dbAdmin } from '@/lib/supabase-admin'
import { reserveTestCredits, refundTestCredits } from '@/lib/study/credits'
import {
  assembleFromBank, assembleToeflFromBank, assembleAdmissionSection, assembleActSection, recordTestExposures,
} from '@/lib/study/assemble'
import { raiseAlert } from '@/lib/ops/alert'
import { SectionShortError, SECTION_UNAVAILABLE } from '@/lib/study/section-availability'
import { creditCostForTest } from '@/lib/study/plans'
import { tableRouter, makeRequest, type ChainMock } from '@/tests/study-route-helpers'

jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: { from: jest.fn(), rpc: jest.fn() } }))
jest.mock('@/lib/study/auth', () => ({ requireStudyUser: jest.fn(async () => ({ user: { id: 'stu-1' } })) }))
jest.mock('@/lib/rate-limit', () => ({ enforceRateLimit: jest.fn(() => null) }))
jest.mock('@/lib/study/analytics', () => ({ trackEvent: jest.fn(async () => {}) }))
jest.mock('@/lib/study/entitlements', () => ({ canAccessTest: jest.fn(async () => true) }))
jest.mock('@/lib/study/shipped-tests', () => ({ isShippedTestFamily: jest.fn(() => true) }))
jest.mock('@/lib/ops/alert', () => ({ raiseAlert: jest.fn(async () => {}) }))
jest.mock('@/lib/study/credits', () => ({
  reserveTestCredits: jest.fn(async () => ({ ok: true })),
  refundTestCredits: jest.fn(async () => ({ refunded: 1, already: 0, noDebit: 0, failed: 0, refundedSources: [] })),
}))
jest.mock('@/lib/study/assemble', () => ({
  assembleFromBank: jest.fn(),
  assembleToeflFromBank: jest.fn(),
  assembleAdmissionSection: jest.fn(),
  assembleActSection: jest.fn(),
  recordTestExposures: jest.fn(async () => {}),
}))

const from = dbAdmin.from as unknown as jest.Mock
const reserve = reserveTestCredits as jest.Mock
const refund = refundTestCredits as jest.Mock
const sat = assembleFromBank as jest.Mock
const toefl = assembleToeflFromBank as jest.Mock
const admission = assembleAdmissionSection as jest.Mock
const act = assembleActSection as jest.Mock
const recordExp = recordTestExposures as jest.Mock
const alert = raiseAlert as jest.Mock

const q = () => ({ prompt: 'p', type: 'multiple_choice', choices: ['A', 'B', 'C', 'D'], correct_answer: 'A' })
const full = (n: number, extra: Record<string, unknown> = {}) =>
  ({ title: 'T', timeLimitMinutes: 10, section: 'S', family: 'x', questions: Array.from({ length: n }, q), composition: {}, itemIds: Array.from({ length: n }, (_, i) => `id-${i}`), ...extra })
const short = (scope: string, want: number, extra: Record<string, unknown> = {}) =>
  new SectionShortError({ scope, want, got: want - 1, ...extra })

/** DB queue for a non-path assemble: coverage counts → session insert → cache write. */
function assembleDb(): { sessions: ChainMock[]; messages: ChainMock } {
  const enqueue = tableRouter(from)
  enqueue('study_item_bank', { count: 1000 })
  enqueue('study_item_exposures', { count: 0 })
  const insert = enqueue('study_sessions', { data: { id: 'sess-1' } })
  const second = enqueue('study_sessions', {})   // delete (refusal) or title update (success)
  const messages = enqueue('study_messages', { error: null })
  return { sessions: [insert, second], messages }
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'warn').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => jest.restoreAllMocks())

describe('assemble: a section one item short is refused, free', () => {
  it('SAT: 409 section_unavailable, nothing reserved/refunded/exposed, session deleted, alert raised', async () => {
    const { sessions } = assembleDb()
    sat.mockRejectedValueOnce(short('sat/math', 22))
    const res = await assemblePOST(makeRequest({ section: 'math' }))
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ code: SECTION_UNAVAILABLE, want: 22, got: 21, scope: 'sat/math' })
    expect(reserve).not.toHaveBeenCalled()
    expect(refund).not.toHaveBeenCalled()
    expect(recordExp).not.toHaveBeenCalled()
    expect(sessions[1].delete).toHaveBeenCalled()
    expect(alert).toHaveBeenCalledWith(expect.objectContaining({
      severity: 'warning', dedupeKey: 'study-section-unavailable:sat/math',
    }))
    // Asked for the full draw, and for the ledger to wait for the charge.
    expect(sat).toHaveBeenCalledWith(expect.objectContaining({ count: 22, requireFull: true, deferExposures: true }), 'sess-1')
  })

  it.each([
    ['ssat', 'math', admission, 'ssat/math', 50],
    ['act', 'science', act, 'act/science', 40],
  ] as const)('%s %s: refused the same way', async (family, section, fn, scope, want) => {
    assembleDb()
    fn.mockRejectedValueOnce(short(scope, want))
    const res = await assemblePOST(makeRequest({ family, section }))
    expect(res.status).toBe(409)
    expect((await res.json()).code).toBe(SECTION_UNAVAILABLE)
    expect(fn).toHaveBeenCalledWith(expect.objectContaining({ requireFull: true }), 'sess-1')
    expect(reserve).not.toHaveBeenCalled()
  })
})

describe('assemble: a full bank is unchanged', () => {
  it('SAT: 200, charged, exposures recorded AFTER the charge, ids kept out of the payload', async () => {
    const { messages } = assembleDb()
    sat.mockResolvedValueOnce(full(22))
    const res = await assemblePOST(makeRequest({ section: 'math' }))
    expect(res.status).toBe(200)
    expect((await res.json()).questionCount).toBe(22)
    expect(reserve).toHaveBeenCalledWith('stu-1', 'sess-1', expect.any(Number), 'sat', expect.anything())
    expect(recordExp).toHaveBeenCalledWith('stu-1', expect.arrayContaining(['id-0', 'id-21']), 'sess-1')
    expect(reserve.mock.invocationCallOrder[0]).toBeLessThan(recordExp.mock.invocationCallOrder[0])
    const cached = String(messages.insert.mock.calls[0][0].content)
    expect(cached).not.toContain('itemIds')
    expect(alert).not.toHaveBeenCalled()
  })

  it('out of credits: 402 and NO exposure write (the student never got the test)', async () => {
    assembleDb()
    sat.mockResolvedValueOnce(full(22))
    reserve.mockResolvedValueOnce({ ok: false, reason: 'no_credits' })
    const res = await assemblePOST(makeRequest({ section: 'math' }))
    expect(res.status).toBe(402)
    expect(recordExp).not.toHaveBeenCalled()
  })

  it('a free path stop is exempt: drawn without requireFull', async () => {
    const enqueue = tableRouter(from)
    enqueue('study_sessions', { data: [] })
    enqueue('study_item_bank', { count: 1000 })
    enqueue('study_item_exposures', { count: 0 })
    enqueue('study_sessions', { data: { id: 'sess-1' } })
    sat.mockResolvedValueOnce(full(5))
    const res = await assemblePOST(makeRequest({ section: 'math', pathNode: 'sat-math-section' }))
    expect(res.status).toBe(200)
    expect(sat).toHaveBeenCalledWith(expect.objectContaining({ requireFull: false }), 'sess-1')
  })
})

describe('assemble: TOEFL adaptive pre-checks Module 2 before charging', () => {
  /** Module 1 draws full; module 2 per path as given. */
  function toeflBank(lowerOk: boolean, upperOk: boolean) {
    toefl.mockImplementation(async (p: { module?: number; path?: string }) => {
      if (p.module !== 2) return full(27, { moduleBreakIdx: 27 })
      const ok = p.path === 'lower' ? lowerOk : upperOk
      if (!ok) throw short('toefl/listening', 21, { module: 2, path: p.path })
      return full(21)
    })
  }

  it('neither Stage-2 path fills → 409 before any charge', async () => {
    assembleDb()
    toeflBank(false, false)
    const res = await assemblePOST(makeRequest({ family: 'toefl', section: 'listening' }))
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ code: SECTION_UNAVAILABLE, module: 2 })
    expect(reserve).not.toHaveBeenCalled()
    expect(recordExp).not.toHaveBeenCalled()
    // The precheck is a dry draw: no student, so no exposure read or write.
    const m2Calls = toefl.mock.calls.filter(c => c[0].module === 2)
    expect(m2Calls).toHaveLength(2)
    for (const c of m2Calls) expect(c[0].studentId).toBeUndefined()
  })

  it('one path fills → starts and charges (/route will fall back to it)', async () => {
    assembleDb()
    toeflBank(true, false)
    const res = await assemblePOST(makeRequest({ family: 'toefl', section: 'listening' }))
    expect(res.status).toBe(200)
    expect(reserve).toHaveBeenCalled()
  })
})

/* ── Module 2 (/api/study/test/route) ─────────────────────────────── */

const SID = '33333333-3333-3333-3333-333333333333'
const MARKER = '[full-test-v1]'
function routeDb(cache: Record<string, unknown>, config: Record<string, unknown>): { cacheWrite: ChainMock; release: ChainMock } {
  const enqueue = tableRouter(from)
  enqueue('study_sessions', { data: { id: SID, student_id: 'stu-1', module2_route: null, config } })
  enqueue('study_messages', { data: [{ content: MARKER + JSON.stringify(cache) }] })
  enqueue('study_sessions', { data: [{ id: SID }] })           // claim won
  const release = enqueue('study_sessions', {})                // release (refusal path)
  const cacheWrite = enqueue('study_messages', { error: null })
  return { cacheWrite, release }
}
const m1 = (n: number) => Array.from({ length: n }, () => ({ correct_answer: 'A' }))
const answers = (n: number) => Array.from({ length: n }, (_, index) => ({ index, answer: 'A' }))

describe('route: Module 2 is never delivered short', () => {
  it('TOEFL: routed path short → the other path is served whole, nothing refunded', async () => {
    const { cacheWrite } = routeDb(
      { adaptive: true, family: 'toefl', sectionKey: 'reading', moduleBreakIdx: 5, questions: m1(5) },
      { family: 'toefl', section: 'reading' },
    )
    // 5/5 → upper; upper short, lower whole.
    toefl.mockImplementation(async (p: { path?: string }) => {
      if (p.path === 'upper') throw short('toefl/reading', 20, { module: 2, path: 'upper' })
      return full(20)
    })
    const res = await routePOST(makeRequest({ sessionId: SID, sectionName: 'Reading', answers: answers(5) }))
    expect(res.status).toBe(200)
    expect((await res.json()).module2Questions).toHaveLength(20)
    expect(toefl.mock.calls.map(c => c[0].path)).toEqual(['upper', 'lower'])
    expect(toefl.mock.calls.every(c => c[0].requireFull === true)).toBe(true)
    expect(cacheWrite.update).toHaveBeenCalled()
    expect(refund).not.toHaveBeenCalled()
    expect(alert).toHaveBeenCalledWith(expect.objectContaining({ dedupeKey: 'study-section-unavailable:toefl/reading:m2:upper' }))
  })

  it('TOEFL: both paths short → refund, claim released, 409 section_unavailable', async () => {
    const { cacheWrite, release } = routeDb(
      { adaptive: true, family: 'toefl', sectionKey: 'reading', moduleBreakIdx: 5, questions: m1(5) },
      { family: 'toefl', section: 'reading' },
    )
    toefl.mockImplementation(async (p: { path?: string }) => {
      throw short('toefl/reading', 20, { module: 2, path: p.path })
    })
    const res = await routePOST(makeRequest({ sessionId: SID, sectionName: 'Reading', answers: answers(5) }))
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ code: SECTION_UNAVAILABLE, refunded: true })
    expect(refund).toHaveBeenCalledWith('stu-1', SID, creditCostForTest('toefl', 'reading'))
    expect(release.update).toHaveBeenCalledWith(expect.objectContaining({ module2_route: null }))
    expect(cacheWrite.update).not.toHaveBeenCalled()
  })

  it('SAT: short Module 2 → refund (SAT price), 409, no cache append', async () => {
    const { cacheWrite } = routeDb(
      { adaptive: true, sectionKey: 'math', moduleBreakIdx: 3, questions: m1(3) },
      { family: 'sat', section: 'math' },
    )
    sat.mockRejectedValueOnce(short('sat/math', 22))
    const res = await routePOST(makeRequest({ sessionId: SID, sectionName: 'Math', answers: answers(3) }))
    expect(res.status).toBe(409)
    expect((await res.json()).code).toBe(SECTION_UNAVAILABLE)
    expect(sat).toHaveBeenCalledWith(expect.objectContaining({ requireFull: true }), SID)
    expect(refund).toHaveBeenCalledWith('stu-1', SID, expect.any(Number))
    expect(refund.mock.calls[0][2]).toBeGreaterThan(0)
    expect(cacheWrite.update).not.toHaveBeenCalled()
  })

  it('SAT: a full Module 2 is unchanged — appended, nothing refunded', async () => {
    const { cacheWrite } = routeDb(
      { adaptive: true, sectionKey: 'math', moduleBreakIdx: 3, questions: m1(3) },
      { family: 'sat', section: 'math' },
    )
    sat.mockResolvedValueOnce(full(22))
    const res = await routePOST(makeRequest({ sessionId: SID, sectionName: 'Math', answers: answers(3) }))
    expect(res.status).toBe(200)
    expect(cacheWrite.update).toHaveBeenCalled()
    expect(refund).not.toHaveBeenCalled()
  })
})
