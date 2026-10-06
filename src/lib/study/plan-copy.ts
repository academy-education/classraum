/**
 * Student-facing copy that quotes the Study catalog — which tests ship and
 * what a section costs — derived from the constants that actually gate and
 * charge, never typed by hand.
 *
 * Until 2026-10-07 the subscription page said "SAT · TOEFL 모의고사" and
 * "1 mock test = 1–2 credits" weeks after ACT, SSAT and ISEE shipped and
 * every section was repriced to 2–3 credits. Both strings were literals, so
 * nothing failed when the constants moved. Everything here reads
 * SHIPPED_TEST_FAMILIES (shipped-tests.ts) and the per-section price table
 * behind creditCostForTest (plans.ts); plan-copy-drift.test.ts fails if a
 * student-facing surface quotes a test list or credit range that disagrees.
 */
import { SHIPPED_TEST_FAMILIES } from './shipped-tests'
import { sectionCreditCostsFor } from './plans'

/** Display order and names for families. A newly shipped family that is
 *  missing here still appears (upper-cased, at the end) rather than being
 *  silently dropped from the copy. */
const FAMILY_ORDER = ['sat', 'act', 'toefl', 'ssat', 'isee'] as const
const FAMILY_NAME: Record<string, string> = {
  sat: 'SAT',
  act: 'ACT',
  toefl: 'TOEFL',
  ssat: 'SSAT',
  isee: 'ISEE',
}

/** Shipped families in display order (lower-case keys). */
export function shippedFamilies(): string[] {
  const shipped = [...SHIPPED_TEST_FAMILIES]
  const known = FAMILY_ORDER.filter(f => shipped.includes(f))
  const extra = shipped.filter(f => !(FAMILY_ORDER as readonly string[]).includes(f)).sort()
  return [...known, ...extra]
}

export function familyName(family: string): string {
  return FAMILY_NAME[family] ?? family.toUpperCase()
}

/** Display names of every shipped test, in order: ['SAT', 'ACT', ...]. */
export function shippedTestNames(): string[] {
  return shippedFamilies().map(familyName)
}

/** "SAT · ACT · TOEFL · SSAT · ISEE" (KO) / "SAT, ACT, TOEFL, SSAT & ISEE" (EN). */
export function shippedTestList(ko: boolean): string {
  const names = shippedTestNames()
  if (ko) return names.join(' · ')
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`
}

export interface CreditRange { min: number; max: number }

/** Cheapest and dearest section of one family. */
export function familyCreditRange(family: string): CreditRange {
  const costs = sectionCreditCostsFor(family)
  if (costs.length === 0) throw new Error(`plan-copy: no section prices for family "${family}"`)
  return { min: Math.min(...costs), max: Math.max(...costs) }
}

/** Cheapest and dearest section across every shipped family. */
export function sectionCreditRange(): CreditRange {
  const ranges = shippedFamilies().map(familyCreditRange)
  return {
    min: Math.min(...ranges.map(r => r.min)),
    max: Math.max(...ranges.map(r => r.max)),
  }
}

/** "2~3" (KO) / "2–3" (EN); a single number when min === max. */
export function formatCreditRange(r: CreditRange, ko: boolean): string {
  return r.min === r.max ? String(r.min) : `${r.min}${ko ? '~' : '–'}${r.max}`
}

/** Per-family cost key: [['SAT', '3'], ['ACT', '3'], ['TOEFL', '2–3'], ...]. */
export function familyCreditCosts(ko: boolean): [string, string][] {
  return shippedFamilies().map(f => [familyName(f), formatCreditRange(familyCreditRange(f), ko)])
}

/** "SAT 3 · ACT 3 · TOEFL 2~3 · SSAT 2 · ISEE 2" — for prose surfaces. */
export function familyCreditSummary(ko: boolean): string {
  return familyCreditCosts(ko).map(([name, cost]) => `${name} ${cost}`).join(' · ')
}
