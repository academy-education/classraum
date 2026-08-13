/**
 * What /pay/subscribe is selling, resolved from its query string.
 *
 * Lives here rather than in the page so it can be tested: the bug it
 * guards was invisible in every automated check and surfaced only when
 * Andy tapped a credit pack and got "알 수 없는 플랜이에요".
 */
import { STUDY_PLANS, resolvePass, resolvePack, CREDIT_PACKS, isPassPlan } from '@/lib/study/plans'

export type Item = {
  kind: 'plan' | 'pass' | 'pack'
  id: string
  title: string
  priceWon: number
  /** Right-hand side of the price, e.g. "월" or "1회 결제". */
  period: string
  /** One labelled row under the header. */
  detailLabel: string
  detailValue: string
}

/**
 * Resolve whichever of ?plan= / ?pass= / ?pack= is present. Returns null
 * for an id that matches nothing, which renders the unknown-item card
 * rather than silently charging for the wrong thing.
 */
export function resolveItem(params: URLSearchParams, ko: boolean): Item | null {
  const planId = params.get('plan')
  if (planId) {
    // A PASS UNDER ?plan= IS NOT A PLAN. Every pass is mirrored into
    // STUDY_PLANS so tier and feature gates resolve (see the comment on
    // STUDY_PASSES), and isPassPlan is the guard that keeps those ids out
    // of the renewal paths. Without this check the mirror is a trap: the
    // old url builder emitted ?plan= for everything, so tapping the
    // 3-month SAT pass found sat_pass_v1 here and ran billing-key card
    // registration — a recurring charge for something that "finalizes at
    // expiry, never renews". Exactly what Andy reported: "the 3 month
    // passes are taking to subscription when its a one time payment."
    if (isPassPlan(planId)) return null
    const p = STUDY_PLANS[planId]
    if (!p) return null
    return {
      kind: 'plan', id: p.id, title: ko ? p.name_ko : p.name_en, priceWon: p.priceWon,
      period: p.intervalDays === 365 ? (ko ? '1년' : 'year')
        : p.intervalDays === 30 ? (ko ? '월' : 'month')
        : `${p.intervalDays}${ko ? '일' : ' days'}`,
      detailLabel: ko ? '매달 받는 크레딧' : 'Monthly credits',
      detailValue: String(p.monthlyCredits),
    }
  }

  const passId = params.get('pass')
  if (passId) {
    const p = resolvePass(passId)
    if (!p) return null
    return {
      kind: 'pass', id: p.id, title: ko ? p.name_ko : p.name_en, priceWon: p.priceWon,
      // Passes never renew. Saying so on the button screen matters: the
      // reported bug was a 3-month pass reading as a subscription.
      period: ko ? '1회 결제' : 'one-time',
      detailLabel: ko ? '포함된 크레딧' : 'Credits included',
      detailValue: String(p.credits),
    }
  }

  const packId = params.get('pack')
  if (packId) {
    // resolvePack falls back to a default rather than returning null, so
    // check membership explicitly — otherwise a typo'd id would quietly
    // charge for whatever the fallback happens to be.
    if (!CREDIT_PACKS.some(c => c.id === packId)) return null
    const p = resolvePack(packId)
    return {
      kind: 'pack', id: p.id, title: ko ? `크레딧 ${p.credits}개` : `${p.credits} credits`,
      priceWon: p.priceWon,
      period: ko ? '1회 결제' : 'one-time',
      detailLabel: ko ? '충전되는 크레딧' : 'Credits added',
      detailValue: String(p.credits),
    }
  }
  return null
}
