/**
 * ONE state model for a study subscription's management surfaces.
 *
 * Server routes (change-plan, cancel) and the subscription page both
 * derive from here, so no surface can invent its own reading of the
 * row. The five UI states are mutually exclusive by construction:
 *
 *   free          — no live paid row (free / expired / cancelled / past_due)
 *   onPass        — a seasonal exam pass (cancel_at_period_end=true by
 *                   design; must never read as "Cancelling")
 *   cancelling    — a REAL scheduled cancellation (cancel_at_period_end
 *                   on a non-pass paid row). Exclusive: plan changes are
 *                   rejected server-side while in this state, and the
 *                   cancel action clears any pending switch (cancel wins).
 *   pendingSwitch — a scheduled plan change (pending_plan set, no
 *                   cancellation). Displays as "Switching to {plan} on
 *                   {date}", NEVER as "Cancelling".
 *   active        — a live paid row with nothing scheduled.
 *
 * Why this exists: change-plan used to accept a schedule-switch while
 * cancel_at_period_end was true, producing rows with BOTH flags set. The
 * cron finalizes the cancellation and silently ignores pending_plan, so
 * the student saw "Cancelling" after scheduling a switch — and the
 * switch would never have happened.
 */

import { isPassPlan, resolvePlan, STUDY_PLANS, type StudyPlan } from './plans'

export interface SubscriptionStateRow {
  status: string
  plan: string | null
  pending_plan?: string | null
  cancel_at_period_end: boolean
}

export type SubscriptionUiState = 'free' | 'onPass' | 'cancelling' | 'pendingSwitch' | 'active'

/** A live paid row — the only rows cancel/reactivate/change-plan act on. */
function isLivePaid(status: string): boolean {
  return status === 'active' || status === 'trial'
}

/**
 * True when cancel_at_period_end represents an actual user cancellation
 * (passes and other never-renewing rows carry the flag by design).
 */
export function isRealCancel(row: SubscriptionStateRow, onPass = false): boolean {
  return row.cancel_at_period_end && isLivePaid(row.status) && !onPass && !isPassPlan(row.plan)
}

export function deriveSubscriptionUiState(
  row: SubscriptionStateRow | null | undefined,
  onPass = false,
): SubscriptionUiState {
  if (!row || !isLivePaid(row.status)) return 'free'
  if (onPass || isPassPlan(row.plan)) return 'onPass'
  if (isRealCancel(row, onPass)) return 'cancelling'
  if (row.pending_plan) return 'pendingSwitch'
  return 'active'
}

// ── Server-side plan-change guard ───────────────────────────────────

export type PlanChangeDecision =
  | { ok: false; status: number; body: { error: string; code?: string } }
  | { ok: true; action: 'clear_pending' | 'schedule_downgrade' | 'upgrade'; target: StudyPlan; current: StudyPlan }

/**
 * Decide what a change-plan request may do, given the current row.
 * Pure so the guard can be unit-tested without a route harness.
 */
export function decidePlanChange(
  row: SubscriptionStateRow | null | undefined,
  targetPlanId: string | undefined,
): PlanChangeDecision {
  const target = targetPlanId ? STUDY_PLANS[targetPlanId] : undefined
  if (!target || isPassPlan(target.id)) {
    return { ok: false, status: 400, body: { error: 'unknown plan' } }
  }
  if (!row || row.status !== 'active') {
    return { ok: false, status: 403, body: { error: 'active subscription required' } }
  }
  // CANCELLED STATE IS EXCLUSIVE: while a cancellation (or a
  // never-renewing pass) is in force there is no renewal for a switch
  // to attach to. Accepting one here is how rows ended up with both
  // flags set — "Cancelling" in the UI over a switch the cron would
  // never apply. Reactivate first, then change plans.
  if (row.cancel_at_period_end || isPassPlan(row.plan)) {
    return {
      ok: false,
      status: 409,
      body: { error: 'subscription is scheduled to cancel — reactivate it first', code: 'cancelling' },
    }
  }
  const current = resolvePlan(row.plan)
  if (target.id === current.id) return { ok: true, action: 'clear_pending', target, current }
  if (target.priceWon < current.priceWon) return { ok: true, action: 'schedule_downgrade', target, current }
  return { ok: true, action: 'upgrade', target, current }
}

/**
 * The row update a cancellation writes. Cancel WINS over a scheduled
 * switch: a pending_plan left behind would sit unapplied (the cron
 * ignores it once cancel_at_period_end is set) and resurface as a
 * surprise switch if the student later reactivates.
 */
export function cancelUpdatePayload(nowIso: string): {
  cancel_at_period_end: true
  pending_plan: null
  updated_at: string
} {
  return { cancel_at_period_end: true, pending_plan: null, updated_at: nowIso }
}
