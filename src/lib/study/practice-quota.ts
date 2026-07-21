import { supabaseAdmin } from '@/lib/supabase-admin'
import { isPassPlan } from '@/lib/study/plans'

/**
 * Practice "energy" — the resource spent to start a topic-page practice
 * questions or flashcards set (the two share one pool).
 *
 * Policy (2026-07) — TIME-BASED REGEN:
 *   - FREE users:  cap 3, +1 energy every 8 hours.
 *   - PAID users:  cap 8, +1 energy every 3 hours.
 *   - Starting a fresh practice/flashcards set spends 1 energy. Path-stop
 *     sessions (`config.pathNode`) and the daily challenge are exempt and
 *     don't spend.
 *
 * Storage: `study_energy(student_id, energy, updated_at)`. `energy` is the
 * last-settled balance and `updated_at` anchors the regen clock. Regen is
 * applied VIRTUALLY on read (no write) and PERSISTED on spend. A student
 * with no row is treated as full — everyone starts with a full pool.
 */

export const FREE_ENERGY_CAP = 3
export const PAID_ENERGY_CAP = 8
/** Hours to regenerate 1 energy. */
export const FREE_REFILL_HOURS = 8
export const PAID_REFILL_HOURS = 3

const HOUR_MS = 3_600_000

export interface EnergyState {
  paid: boolean
  /** Current spendable energy after applying regen. */
  energy: number
  /** Max energy for this plan. */
  cap: number
  /** Seconds until the next +1 (0 when already full). */
  nextRefillSeconds: number
  /** Hours between each +1 for this plan (for copy). */
  refillHours: number
}

/** Back-compat shape consumed by the topic page + quota route. */
export interface PracticeQuota {
  paid: boolean
  limit: number
  used: number
  remaining: number
  energy: number
  cap: number
  nextRefillSeconds: number
  refillHours: number
}

/** True when the student has a live recurring Premium plan or any live
 *  exam-pass entitlement — i.e. they've paid, so the paid cap/cadence apply. */
async function isPaidStudent(studentId: string): Promise<boolean> {
  const { data: sub } = await supabaseAdmin
    .from('study_subscriptions')
    .select('status, plan')
    .eq('student_id', studentId)
    .maybeSingle()
  const status = sub?.status as string | null
  const plan = sub?.plan as string | null
  const recurringPremium =
    (status === 'active' || status === 'trial') && !!plan && plan !== 'free_v1' && !isPassPlan(plan)
  if (recurringPremium) return true

  const { data: ent } = await supabaseAdmin
    .from('study_entitlements')
    .select('test, expires_at')
    .eq('student_id', studentId)
  const now = Date.now()
  return (ent ?? []).some(e => {
    const exp = e.expires_at as string | null
    return exp === null || Date.parse(exp) > now
  })
}

interface PlanEnergy { paid: boolean; cap: number; intervalMs: number; refillHours: number }
async function planEnergy(studentId: string): Promise<PlanEnergy> {
  const paid = await isPaidStudent(studentId)
  return paid
    ? { paid, cap: PAID_ENERGY_CAP, intervalMs: PAID_REFILL_HOURS * HOUR_MS, refillHours: PAID_REFILL_HOURS }
    : { paid, cap: FREE_ENERGY_CAP, intervalMs: FREE_REFILL_HOURS * HOUR_MS, refillHours: FREE_REFILL_HOURS }
}

/** Apply time-based regen to a stored (energy, updatedAt) against a plan,
 *  as of `now`. Returns the settled balance + the advanced clock anchor +
 *  ms until the next +1. Pure — no I/O. */
function applyRegen(stored: number, updatedAtMs: number, plan: PlanEnergy, now: number) {
  let energy = Math.min(stored, plan.cap)      // clamp (cap can shrink paid→free)
  let anchor = updatedAtMs
  if (energy >= plan.cap) {
    // Already full: no regen owed; the clock is idle until the next spend.
    return { energy: plan.cap, anchor: now, msToNext: 0 }
  }
  const elapsed = Math.max(0, now - updatedAtMs)
  const steps = Math.floor(elapsed / plan.intervalMs)
  if (steps > 0) {
    energy = Math.min(plan.cap, energy + steps)
    anchor = updatedAtMs + steps * plan.intervalMs
  }
  if (energy >= plan.cap) return { energy: plan.cap, anchor: now, msToNext: 0 }
  const remainder = now - anchor                // 0..intervalMs
  return { energy, anchor, msToNext: plan.intervalMs - remainder }
}

async function readRow(studentId: string): Promise<{ energy: number; updatedAtMs: number } | null> {
  const { data } = await supabaseAdmin
    .from('study_energy')
    .select('energy, updated_at')
    .eq('student_id', studentId)
    .maybeSingle()
  if (!data) return null
  return { energy: data.energy as number, updatedAtMs: Date.parse(data.updated_at as string) }
}

/** Current energy state (regen applied virtually; no write). */
export async function getEnergy(studentId: string): Promise<EnergyState> {
  const plan = await planEnergy(studentId)
  const now = Date.now()
  const row = await readRow(studentId)
  // No row → the student has never spent; treat as a full pool.
  const stored = row ? row.energy : plan.cap
  const updatedAtMs = row ? row.updatedAtMs : now
  const { energy, msToNext } = applyRegen(stored, updatedAtMs, plan, now)
  return {
    paid: plan.paid,
    energy,
    cap: plan.cap,
    nextRefillSeconds: Math.ceil(msToNext / 1000),
    refillHours: plan.refillHours,
  }
}

/** Spend 1 energy for a fresh practice/flashcards set. Settles regen first,
 *  then decrements and persists. Returns whether the spend succeeded (false
 *  = out of energy). Best-effort atomicity — a single student rarely double-
 *  fires, and the visible meter makes any drift self-correcting. */
export async function spendEnergy(studentId: string): Promise<{ ok: boolean; state: EnergyState }> {
  const plan = await planEnergy(studentId)
  const now = Date.now()
  const row = await readRow(studentId)
  const stored = row ? row.energy : plan.cap
  const updatedAtMs = row ? row.updatedAtMs : now
  const settled = applyRegen(stored, updatedAtMs, plan, now)

  if (settled.energy <= 0) {
    return {
      ok: false,
      state: { paid: plan.paid, energy: 0, cap: plan.cap, nextRefillSeconds: Math.ceil(settled.msToNext / 1000), refillHours: plan.refillHours },
    }
  }

  const wasFull = settled.energy >= plan.cap
  const newEnergy = settled.energy - 1
  // If we were full, start the regen clock now (dropping below cap). Else
  // keep the anchor advanced past already-consumed regen.
  const newAnchorMs = wasFull ? now : settled.anchor

  await supabaseAdmin
    .from('study_energy')
    .upsert(
      { student_id: studentId, energy: newEnergy, updated_at: new Date(newAnchorMs).toISOString() },
      { onConflict: 'student_id' },
    )

  const after = applyRegen(newEnergy, newAnchorMs, plan, now)
  return {
    ok: true,
    state: { paid: plan.paid, energy: after.energy, cap: plan.cap, nextRefillSeconds: Math.ceil(after.msToNext / 1000), refillHours: plan.refillHours },
  }
}

/** Back-compat resolver for the topic page + quota route. */
export async function getPracticeQuota(studentId: string): Promise<PracticeQuota> {
  const s = await getEnergy(studentId)
  return {
    paid: s.paid,
    limit: s.cap,
    used: s.cap - s.energy,
    remaining: s.energy,
    energy: s.energy,
    cap: s.cap,
    nextRefillSeconds: s.nextRefillSeconds,
    refillHours: s.refillHours,
  }
}

/** Delete the student's abandoned practice/flashcards sessions — active,
 *  no attempts, older than a grace window — so an unused set doesn't linger
 *  on the shelf or in history. Excludes the current session, daily
 *  challenges, and path stops. Best-effort; never throws. Energy is spent at
 *  START now, so this is purely housekeeping (it no longer affects the
 *  balance). */
export async function cleanupAbandonedPracticeSessions(studentId: string, exceptId: string): Promise<void> {
  try {
    const graceIso = new Date(Date.now() - 2 * 60_000).toISOString()
    const { data: sessions } = await supabaseAdmin
      .from('study_sessions')
      .select('id, config')
      .eq('student_id', studentId)
      .in('mode', ['practice', 'flashcards'])
      .eq('status', 'active')
      .eq('archived', false)
      .lt('created_at', graceIso)
    const candidateIds = (sessions ?? [])
      .filter(s => {
        const c = (s.config ?? {}) as { dailyChallenge?: string; pathNode?: string }
        return !c.dailyChallenge && !c.pathNode && s.id !== exceptId
      })
      .map(s => s.id as string)
    if (candidateIds.length === 0) return

    const { data: attempts } = await supabaseAdmin
      .from('study_attempts')
      .select('session_id')
      .in('session_id', candidateIds)
    const engaged = new Set((attempts ?? []).map(a => a.session_id as string))
    const empties = candidateIds.filter(id => !engaged.has(id))
    if (empties.length === 0) return
    await supabaseAdmin.from('study_sessions').delete().in('id', empties).eq('student_id', studentId)
  } catch (e) {
    console.error('[energy] cleanup failed', e)
  }
}
