/** @jest-environment node */
/**
 * Tests for the shared one-time-purchase grant path
 * (src/lib/study/grant-purchase.ts), called by BOTH the client purchase
 * routes and the webhook backstop.
 *
 * The invariant that matters: the study_payments insert is the idempotency
 * guard, and ONLY a Postgres unique violation (23505) means "already
 * granted". supabase-js resolves `{ error }` instead of throwing, so every
 * other error — RLS, connection reset, timeout — used to be read as a
 * duplicate: the card was charged, no credits were granted, no row was
 * written, and both the client path and the webhook reported
 * `already_processed`, which made the charge unrecoverable.
 *
 * A non-23505 error must therefore surface as a real failure (so the caller
 * retries and the webhook backstop can still land the grant) and page a
 * human, never as `already_processed`.
 */
import { grantCreditPack, grantExamPass } from '@/lib/study/grant-purchase'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { raiseAlert } from '@/lib/ops/alert'
import { CREDIT_PACK, resolvePass } from '@/lib/study/plans'
import { tableRouter } from '@/tests/study-route-helpers'

jest.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: jest.fn(), rpc: jest.fn(), auth: { getUser: jest.fn() } },
}))
jest.mock('@/lib/ops/alert', () => ({ raiseAlert: jest.fn(async () => {}) }))
jest.mock('@/lib/study/analytics', () => ({ trackEvent: jest.fn(async () => {}) }))

const fromMock = supabaseAdmin.from as unknown as jest.Mock
const rpcMock = supabaseAdmin.rpc as unknown as jest.Mock
const alertMock = raiseAlert as unknown as jest.Mock

const UNIQUE_VIOLATION = { code: '23505', message: 'duplicate key value violates unique constraint' }
/** What a dropped connection / RLS denial actually looks like: NOT 23505. */
const TRANSIENT = { code: '08006', message: 'connection failure' }

const SAT_PASS = resolvePass('sat_pass_v1')!

describe('grant-purchase idempotency record', () => {
  let enqueue: ReturnType<typeof tableRouter>

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {})
    rpcMock.mockResolvedValue({ data: null, error: null })
    enqueue = tableRouter(fromMock)
  })

  afterEach(() => {
    ;(console.error as jest.Mock).mockRestore()
  })

  // ── 23505 is the ONLY duplicate ──────────────────────────────────────
  it('treats a 23505 on the payments insert as already_processed (no re-grant)', async () => {
    enqueue('study_payments', { error: UNIQUE_VIOLATION })

    const outcome = await grantCreditPack({
      studentId: 'student-1', packId: CREDIT_PACK.id, paymentId: 'pay-dup',
    })

    expect(outcome).toEqual({ status: 'already_processed' })
    // Nothing was granted a second time.
    expect(rpcMock).not.toHaveBeenCalled()
    expect(alertMock).not.toHaveBeenCalled()
  })

  it('does NOT report already_processed when the payments insert fails for any other reason', async () => {
    enqueue('study_payments', { error: TRANSIENT })

    const outcome = await grantCreditPack({
      studentId: 'student-1', packId: CREDIT_PACK.id, paymentId: 'pay-transient',
    })

    // The old bug: this returned { status: 'already_processed' } and the
    // charge was silently lost.
    expect(outcome).toMatchObject({ status: 'error', httpStatus: 500 })
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('pages a human (critical) when the payments insert fails non-uniquely', async () => {
    enqueue('study_payments', { error: TRANSIENT })

    await grantCreditPack({ studentId: 'student-1', packId: CREDIT_PACK.id, paymentId: 'pay-transient' })

    expect(alertMock).toHaveBeenCalledTimes(1)
    expect(alertMock).toHaveBeenCalledWith(expect.objectContaining({
      severity: 'critical',
      dedupeKey: 'study-payment-record-failed:pay-transient',
      context: expect.objectContaining({ paymentId: 'pay-transient', studentId: 'student-1' }),
    }))
  })

  it('applies the same rule to exam passes', async () => {
    enqueue('study_payments', { error: TRANSIENT })
    const bad = await grantExamPass({ studentId: 'student-1', passId: SAT_PASS.id, paymentId: 'pay-x' })
    expect(bad).toMatchObject({ status: 'error', httpStatus: 500 })

    jest.clearAllMocks()
    enqueue = tableRouter(fromMock)
    enqueue('study_payments', { error: UNIQUE_VIOLATION })
    const dup = await grantExamPass({ studentId: 'student-1', passId: SAT_PASS.id, paymentId: 'pay-x' })
    expect(dup).toEqual({ status: 'already_processed' })
    expect(alertMock).not.toHaveBeenCalled()
  })

  // ── The happy path still grants exactly once ─────────────────────────
  it('grants the pack when the payments row is newly inserted', async () => {
    enqueue('study_payments', { error: null })
    enqueue('study_subscriptions', { data: { portone_subscription_id: 'card' } })
    enqueue('study_credit_ledger', { error: null })

    const outcome = await grantCreditPack({
      studentId: 'student-1', packId: CREDIT_PACK.id, paymentId: 'pay-new',
    })

    expect(outcome).toEqual({ status: 'granted', creditsAdded: CREDIT_PACK.credits })
    expect(rpcMock).toHaveBeenCalledWith('increment_study_purchased_credits', {
      p_student_id: 'student-1', p_delta: CREDIT_PACK.credits,
    })
    expect(alertMock).not.toHaveBeenCalled()
  })
})

describe('grant-purchase entitlement write', () => {
  let enqueue: ReturnType<typeof tableRouter>

  /** Queue everything grantExamPass touches before the entitlement write. */
  function queueUpToEntitlement() {
    enqueue('study_payments', { error: null })
    enqueue('study_subscriptions', { data: { portone_subscription_id: null, grant_credits_remaining: 3 } })
    enqueue('study_subscriptions', { error: null }) // upsert
    enqueue('study_credit_ledger', { error: null })
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {})
    rpcMock.mockResolvedValue({ data: null, error: null })
    enqueue = tableRouter(fromMock)
  })

  afterEach(() => {
    ;(console.error as jest.Mock).mockRestore()
  })

  it('alerts critical when the entitlement upsert fails (paid pass, test still locked)', async () => {
    queueUpToEntitlement()
    enqueue('study_entitlements', { data: null })            // existing lookup
    enqueue('study_entitlements', { error: { message: 'rls denied' } }) // upsert fails

    const outcome = await grantExamPass({
      studentId: 'student-1', passId: SAT_PASS.id, paymentId: 'pay-pass-1',
    })

    // The purchase itself completed — it must NOT be re-charged...
    expect(outcome).toMatchObject({ status: 'granted', creditsAdded: SAT_PASS.credits })
    // ...but the locked test has to reach a human. Previously the caller's
    // try/catch could never fire, so this failure was invisible.
    expect(alertMock).toHaveBeenCalledWith(expect.objectContaining({
      severity: 'critical',
      dedupeKey: 'study-entitlement-write-failed:pay-pass-1',
      context: expect.objectContaining({ studentId: 'student-1', test: 'sat' }),
    }))
  })

  it('stays quiet when the entitlement write succeeds', async () => {
    queueUpToEntitlement()
    enqueue('study_entitlements', { data: null })
    enqueue('study_entitlements', { error: null })
    enqueue('study_user_prefs', { data: { target_tests: [] } })
    enqueue('study_user_prefs', { error: null })

    const outcome = await grantExamPass({
      studentId: 'student-1', passId: SAT_PASS.id, paymentId: 'pay-pass-2',
    })

    expect(outcome).toMatchObject({ status: 'granted' })
    expect(alertMock).not.toHaveBeenCalled()
  })
})
