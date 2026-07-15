/** @jest-environment node */
/**
 * Pure-logic guards for the 1v1 duel outcome. The DB flip (idempotent
 * active→completed) and the reward side effects are integration concerns;
 * these lock the two decision points that are easy to regress:
 *   - who wins (higher XP; equal = tie), and
 *   - whether a win pays credits (anti-farm floor + rewards-off switch).
 */
// challenges.ts imports the admin client + notify/analytics at load; stub
// them so this pure-logic suite doesn't require Supabase env or network.
jest.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: { from: jest.fn(), rpc: jest.fn() } }))
jest.mock('@/lib/study/notify', () => ({ notifyStudent: jest.fn() }))
jest.mock('@/lib/study/analytics', () => ({ trackEvent: jest.fn() }))

import {
  decideDuelWinner,
  duelCreditEligible,
  DUEL_MIN_XP_FOR_CREDIT,
  DUEL_WIN_CREDITS,
} from '@/lib/study/challenges'

describe('decideDuelWinner', () => {
  it('awards the higher-XP side', () => {
    expect(decideDuelWinner('c', 'o', 120, 80)).toBe('c')
    expect(decideDuelWinner('c', 'o', 80, 120)).toBe('o')
  })
  it('returns null on an exact tie (including 0–0)', () => {
    expect(decideDuelWinner('c', 'o', 100, 100)).toBeNull()
    expect(decideDuelWinner('c', 'o', 0, 0)).toBeNull()
  })
})

describe('duelCreditEligible', () => {
  it('pays only at or above the anti-farm floor', () => {
    expect(duelCreditEligible(DUEL_MIN_XP_FOR_CREDIT)).toBe(true)
    expect(duelCreditEligible(DUEL_MIN_XP_FOR_CREDIT + 1)).toBe(true)
    expect(duelCreditEligible(DUEL_MIN_XP_FOR_CREDIT - 1)).toBe(false)
    expect(duelCreditEligible(0)).toBe(false)
  })
  it('keeps the reward modest and the floor meaningful', () => {
    // Guardrails against an accidental "farming" config.
    expect(DUEL_WIN_CREDITS).toBeGreaterThanOrEqual(0)
    expect(DUEL_WIN_CREDITS).toBeLessThanOrEqual(2)
    expect(DUEL_MIN_XP_FOR_CREDIT).toBeGreaterThanOrEqual(50)
  })
})
