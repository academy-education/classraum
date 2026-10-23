/** @jest-environment node */
/**
 * Trust levels (Amendment 3 of scripts/study-bank/COFOUNDER-GRADER-2026-10-22.PREREG.md): the pure rules of
 * scripts/study-bank/autonomy-core.mjs and review-deal.mjs.
 *
 * BREAK-TESTED 2026-10-23, one mechanism at a time (each revert made the named block fail; restored after):
 *   bridge reset     replayMethod starting with bridge = 'clean'              -> "bridge reset"
 *   half weight      effective() with w = 1 instead of priorWeight             -> "half weight"
 *   demotion         dropping `if (m > 0) level = max(0, level - 1)`           -> "demotion on a miss"
 *   notes as misses  isMiss() reading the verdict only                         -> "notes count as misses"
 *   L2 cap           `level = Math.min(level, cap)` removed                    -> "the L2 cap"
 *   truncation       assertComplete() made a no-op                             -> "truncation refusal"
 */
import {
  PARAMS, cpUpper, itemsNeeded, replayMethod, stratumState, shapeFor, effective, isMiss, joinLedger, buildEvidence,
  assertComplete, RefusalError, capFor, stratumOf, pooledQuotas, pickGroups, planBatchRelease, simulateQueue,
  oldRuleItems, methodKeyOf, shapeOfRun, sectionDepth, floorRank,
} from '../../../../scripts/study-bank/autonomy-core.mjs'
import { dealSlots, dealSegments, parseDrawCohort } from '../../../../scripts/study-bank/review-deal.mjs'
import { readFileSync } from 'node:fs'

type Item = { miss: boolean }
const clean = (k: number): Item[] => Array.from({ length: k }, () => ({ miss: false }))
const withMiss = (k: number, at = 0): Item[] => clean(k).map((it, i) => (i === at ? { miss: true } : it))
const unit = (key: string, items: Item[]) => ({ key, items })

describe('Clopper-Pearson one-sided 90%', () => {
  it('reproduces the design table (minimum n for a bound)', () => {
    // x = 0: 11 for < 20%, 45 for < 5%; x = 1: 77 for < 5%
    expect(cpUpper(0, 11)).toBeLessThan(0.20)
    expect(cpUpper(0, 10)).toBeGreaterThanOrEqual(0.20)
    expect(cpUpper(0, 45)).toBeLessThan(0.05)
    expect(cpUpper(0, 44)).toBeGreaterThanOrEqual(0.05)
    expect(cpUpper(1, 77)).toBeLessThan(0.05)
    expect(cpUpper(1, 76)).toBeGreaterThanOrEqual(0.05)
    expect(cpUpper(0, 11)).toBeCloseTo(1 - Math.pow(0.1, 1 / 11), 6)
  })
  it('is not a measurement at n = 0, and never promotes there', () => {
    expect(cpUpper(0, 0)).toBe(1)
    expect(cpUpper(3, 3)).toBe(1)
  })
  it('counts the clean items needed', () => {
    expect(itemsNeeded(0, 0, 0.20)).toBe(11)
    expect(itemsNeeded(0, 12, 0.05)).toBe(33)
  })
})

describe('bridge reset', () => {
  it('a method change sends the next batch to a bridge spot and carries nothing until the bridge is clean', () => {
    const st = stratumState('toefl/listening/academic_talk', [
      { method: 'old', units: [unit('r1', clean(40)), unit('r2', clean(40))] },
      { method: 'new', units: [] },
    ])
    expect(st.methods[0].level).toBe(2)
    expect(st.current.method).toBe('new')
    expect(st.current.bridge).toBe('pending')
    expect(st.current.level).toBe(0)
    expect(st.current.n).toBe(0)
    expect(shapeFor(st.current)).toBe('bridge')
  })
  it('promotion waits for the full bridge even when 11 clean items alone would clear 20%', () => {
    const r = replayMethod([unit('a', clean(11))])
    expect(cpUpper(0, 11)).toBeLessThan(0.20)
    expect(r.bridge).toBe('pending')
    expect(r.level).toBe(0)
  })
  it('a bridge with a miss is dirty and the prior is never carried', () => {
    const r = replayMethod([unit('a', withMiss(12, 3))], { prior: { n: 200, x: 0 } })
    expect(r.bridge).toBe('dirty')
    expect(r.n).toBe(12)
    expect(r.level).toBe(0)
  })
  it("the stratum's first-ever method starts with an L0 full sitting, not a bridge", () => {
    const st = stratumState('toefl/listening/academic_talk', [{ method: 'only', units: [] }])
    expect(shapeFor(st.current)).toBe('full')
  })
})

describe('half weight', () => {
  it('after a clean bridge the previous method counts at 0.5 (n floored, x ceiled)', () => {
    const r = replayMethod([unit('b', clean(12))], { prior: { n: 41, x: 3 } })
    expect(r.bridge).toBe('clean')
    expect(r.n).toBe(12 + 20) // floor(12 + 20.5)
    expect(r.x).toBe(2) // ceil(1.5)
    expect(effective({ n: 12, x: 0 }, { n: 41, x: 3 }, 'clean').w).toBe(PARAMS.priorWeight)
  })
})

describe('demotion on a miss', () => {
  it('any miss drops one level', () => {
    const r = replayMethod([unit('a', clean(12)), unit('b', clean(12)), unit('c', withMiss(12, 5))])
    expect(r.history[0].to).toBe(1) // clean bridge of 12 -> U 17.5% -> L1
    expect(r.history[2].from).toBe(1)
    expect(r.level).toBe(0)
  })
  it('from L2 a miss lands on L1, not L0', () => {
    const r = replayMethod([unit('a', clean(12)), unit('b', clean(40)), unit('c', withMiss(12))])
    expect(r.history[1].to).toBe(2)
    expect(r.level).toBe(1)
  })
})

describe('notes count as misses', () => {
  const rv = { id: 'r1', item_id: 'i1', run_id: 'run', verdict: 'unique', note: 'passage contradicts itself', item_sha: 's', reviewer_kind: 'human', blind_at: '2026-10-22T10:00:00Z', reviewed_at: null }
  it('a would_block note on an "only defensible" item is a miss', () => {
    expect(isMiss(rv, [{ would_block: true }])).toBe(true)
    expect(isMiss(rv, [{ would_block: false }])).toBe(false)
    expect(isMiss({ ...rv, verdict: 'alternative' }, [{ would_block: false }])).toBe(true)
  })
  it('flows through buildEvidence, including a REGISTER entry linked to the review', () => {
    const items = new Map([['i1', { family: 'ssat', section: 'reading', task: 'multiple_choice', cohort: 'c', content_sha: 's' }], ['i2', { family: 'ssat', section: 'reading', task: 'multiple_choice', cohort: 'c', content_sha: 's' }]])
    const rv2 = { ...rv, id: 'r2', item_id: 'i2', note: 'goldfish', blind_at: '2026-10-22T10:01:00Z' }
    const { byReview, errors } = joinLedger([rv, rv2], [
      { review_id: 'r1', defect_type: 'self_contradiction', would_block: true },
      { review_id: 'r2', defect_type: 'praise/none', would_block: false },
      { review_id: null, register_id: 'REG-x', item_id: 'i2', defect_type: 'factual_error', would_block: true, linked_review_ids: ['r2'] },
    ])
    expect(errors).toEqual([])
    const ev = buildEvidence({ reviews: [rv, rv2], items, ledger: byReview, methodOf: () => 'm' })
    expect(ev.counts.note_misses).toBe(2)
    expect(ev.counts.verdict_misses).toBe(0)
    expect(ev.units.get('ssat/reading/multiple_choice').get('m')[0].items.map((i: Item) => i.miss)).toEqual([true, true])
  })
  it('refuses an unclassified note and never falls back to verdicts', () => {
    expect(joinLedger([rv], []).errors.join()).toMatch(/unclassified note/)
    expect(joinLedger([rv], [{ review_id: 'r1', defect_type: '', would_block: true }]).errors.join()).toMatch(/no defect_type/)
    expect(joinLedger([rv], [{ review_id: 'r1', defect_type: 'x', would_block: 'yes' }]).errors.join()).toMatch(/would_block/)
    expect(joinLedger([rv], [{ review_id: 'r1', defect_type: 'x', would_block: true }, { review_id: 'ghost', defect_type: 'x', would_block: true }]).errors.join()).toMatch(/empty join/)
    expect(joinLedger([rv], [{ review_id: 'r1', defect_type: 'x', would_block: true, note: 'a different note' }]).errors.join()).toMatch(/note text differs/)
  })
})

describe('stale and screened rows', () => {
  const items = new Map([['i1', { family: 'toefl', section: 'listening', task: 'choose_response', cohort: 'c', content_sha: 'NEW' }]])
  const base = { id: 'r1', item_id: 'i1', run_id: 'run', note: null, item_sha: 'OLD', reviewer_kind: 'human', blind_at: '2026-10-22T10:00:00Z', reviewed_at: null }
  it('a stale clean review is excluded and counted, never a pass', () => {
    const ev = buildEvidence({ reviews: [{ ...base, verdict: 'unique' }], items, ledger: new Map(), methodOf: () => 'm' })
    expect(ev.counts.stale_excluded).toBe(1)
    expect(ev.counts.evidence).toBe(0)
  })
  it('a stale review that carries a miss still counts (flag, then the author edits)', () => {
    const ev = buildEvidence({ reviews: [{ ...base, verdict: 'alternative' }], items, ledger: new Map(), methodOf: () => 'm' })
    expect(ev.counts.stale_miss_counted).toBe(1)
    expect(ev.counts.misses).toBe(1)
  })
  it('disagreement with study_item_reviews_fresh refuses', () => {
    const ev = buildEvidence({ reviews: [{ ...base, verdict: 'unique' }], items, ledger: new Map(), methodOf: () => 'm', freshIds: new Set(['r1']) })
    expect(ev.errors.join()).toMatch(/study_item_reviews_fresh/)
  })
  it('model_assisted rows and screen-flagged-kept items are excluded', () => {
    const fresh = { ...base, item_sha: 'NEW', verdict: 'alternative' }
    const ev = buildEvidence({ reviews: [{ ...fresh, reviewer_kind: 'model_assisted' }, { ...fresh, id: 'r2' }], items, ledger: new Map(), methodOf: () => 'm', screenFlaggedKept: new Set(['i1']) })
    expect(ev.counts.model_assisted).toBe(1)
    expect(ev.counts.screen_kept_excluded).toBe(1)
    expect(ev.counts.evidence).toBe(0)
  })
  it('a missing item is an empty join', () => {
    const ev = buildEvidence({ reviews: [{ ...base, item_id: 'nope', verdict: 'unique' }], items, ledger: new Map(), methodOf: () => 'm' })
    expect(ev.errors.join()).toMatch(/empty join/)
  })
})

describe('the L2 cap', () => {
  it('no stratum goes past L2 however clean (the 2% L3 bar exists only so this cap is testable)', () => {
    const units = [unit('a', clean(12)), unit('b', clean(60)), unit('c', clean(200)), unit('d', clean(200))]
    expect(cpUpper(0, 472)).toBeLessThan(PARAMS.promote[2])
    expect(replayMethod(units).level).toBe(2)
  })
  it('never-autonomous strata stop at L1', () => {
    for (const s of ['toefl/listening/choose_response', 'toefl/listening/conversation', 'ssat/reading/multiple_choice', 'isee/reading/multiple_choice', 'map/reading/multiple_choice', 'act/science/*']) {
      expect(capFor(s)).toBe(1)
      expect(stratumState(s, [{ method: 'm', units: [unit('a', clean(12)), unit('b', clean(200))] }]).current.level).toBe(1)
    }
    expect(capFor('act/reading/*')).toBe(2)
    expect(capFor('ssat/verbal/multiple_choice')).toBe(2)
  })
})

describe('truncation refusal', () => {
  it('a read that stops at the 1,000-row cap refuses', () => {
    expect(() => assertComplete('reviews', 1085, 1000)).toThrow(RefusalError)
    expect(() => assertComplete('reviews', undefined as unknown as number, 0)).toThrow(RefusalError)
    expect(assertComplete('reviews', 1085, 1085)).toBe(1085)
  })
})

describe('strata, methods and shapes', () => {
  it('collapses ACT reading/science genre tasks, keeps the task elsewhere', () => {
    expect(stratumOf('act', 'reading', 'humanities')).toBe('act/reading/*')
    expect(stratumOf('toefl', 'listening', 'choose_response')).toBe('toefl/listening/choose_response')
    expect(() => stratumOf('ssat', 'verbal', null)).toThrow()
  })
  it('an unknown method is a new method per cohort; a missing entry refuses; a disagreeing declaration refuses', () => {
    expect(methodKeyOf('x', { x: { method_id: 'unknown' } })).toBe('unknown:x')
    expect(() => methodKeyOf('y', {})).toThrow(RefusalError)
    expect(() => methodKeyOf('x', { x: { method_id: 'a' } }, 'b')).toThrow(RefusalError)
    expect(methodKeyOf('z', {}, 'declared')).toBe('declared')
  })
  it('shapes follow the level', () => {
    expect(shapeFor({ bridge: 'clean', level: 0, firstShape: 'bridge' })).toBe('full')
    expect(shapeFor({ bridge: 'clean', level: 1, firstShape: 'bridge' })).toBe('spot')
    expect(shapeFor({ bridge: 'clean', level: 2, firstShape: 'bridge' })).toBe('pooled')
  })
  it('pooled quotas are 2-3 items per batch over 4-6 batches', () => {
    expect(pooledQuotas(6)).toEqual([2, 2, 2, 2, 2, 2])
    expect(pooledQuotas(5)).toEqual([3, 3, 2, 2, 2])
    expect(pooledQuotas(4)).toEqual([3, 3, 3, 3])
    expect(() => pooledQuotas(7)).toThrow()
  })
  it('spots take the fewest whole passages reaching 12; full sittings stay within 36', () => {
    const six = [1, 2, 3, 4, 5, 6].map(i => ({ id: `P${i}`, size: 6 }))
    expect(pickGroups(six, 'spot')).toEqual({ groups: ['P1', 'P2'], items: 12 })
    expect(pickGroups([{ id: 'a', size: 9 }, { id: 'b', size: 9 }, { id: 'c', size: 9 }], 'spot').items).toBe(18)
    expect(pickGroups([5, 6, 6, 5, 6, 6, 6].map((n, i) => ({ id: `p${i}`, size: n })), 'full').items).toBeLessThanOrEqual(36)
  })
  it('run shapes are read from run ids', () => {
    expect(shapeOfRun('act-v8a-spot-cofounder-2026-10-23')).toBe('spot')
    expect(shapeOfRun('crv14-spot1-cofounder-2026-10-23')).toBe('spot')
    expect(shapeOfRun('iseereadingdraft2-bridge1-cofounder-2026-10-24')).toBe('bridge')
    expect(shapeOfRun('toefllisteningacademictalk-pooled-cofounder-2026-10-30')).toBe('pooled')
    expect(shapeOfRun('ssat-draft7-release-cofounder-2026-10-24')).toBe('full')
    expect(shapeOfRun('mystery-run')).toBeNull()
  })
  it('floor rank puts sections under 5 tests first, fewest first', () => {
    const snap = { sections: { 'act/science': { value: 3 }, 'toefl/listening': { byPath: { a: 15, b: 11 } } } }
    expect(sectionDepth(snap, 'toefl/listening')).toBe(11)
    expect(sectionDepth(snap, 'nope/nope')).toBeNull()
    expect(floorRank(3)).toBeLessThan(floorRank(4))
    expect(floorRank(11)).toBe(Infinity)
    expect(floorRank(null)).toBe(Infinity)
  })
})

describe('release by run shape', () => {
  const batch = { cohort: 'b', items: ['s1', 's2', 'u1', 'u2', 'k1'].map(id => ({ id, verified: false, archived: false, screenFlaggedKept: id === 'k1' })) }
  it('clean spot releases the sample and the unsampled grader-cleared items, not a screen-flagged one', () => {
    const p = planBatchRelease(batch, [{ item_id: 's1', verdict: 'unique', miss: false }, { item_id: 's2', verdict: 'unique', miss: false }], 'spot')
    expect(p.release.sort()).toEqual(['s1', 's2', 'u1', 'u2'])
    expect(p.stay).toEqual(['k1'])
    expect(p.toFullSitting).toBe(false)
  })
  it('a pooled-run flag archives the item and sends that batch to a full sitting', () => {
    const p = planBatchRelease(batch, [{ item_id: 's1', verdict: 'alternative', miss: true }, { item_id: 's2', verdict: 'unique', miss: false }], 'pooled')
    expect(p.archive).toEqual(['s1'])
    expect(p.release).toEqual([])
    expect(p.toFullSitting).toBe(true)
  })
  it('a would_block note holds (owner decides) instead of archiving, and still routes the batch to a full sitting', () => {
    const p = planBatchRelease(batch, [{ item_id: 's1', verdict: 'unique', miss: true }], 'bridge')
    expect(p.hold).toEqual(['s1'])
    expect(p.archive).toEqual([])
    expect(p.toFullSitting).toBe(true)
  })
  it('full sittings release per item; two misses send the rest to a full sitting', () => {
    const one = planBatchRelease(batch, [{ item_id: 's1', verdict: 'broken', miss: true }, { item_id: 's2', verdict: 'unique', miss: false }], 'full')
    expect(one.release).toEqual(['s2'])
    expect(one.toFullSitting).toBe(false)
    const two = planBatchRelease(batch, [{ item_id: 's1', verdict: 'broken', miss: true }, { item_id: 's2', verdict: 'alternative', miss: true }], 'full')
    expect(two.toFullSitting).toBe(true)
  })
  it('refuses a sampled item from another batch', () => {
    expect(() => planBatchRelease(batch, [{ item_id: 'zz', verdict: 'unique', miss: false }], 'spot')).toThrow(RefusalError)
  })
})

describe('pooled deal', () => {
  const rnd = (seed: number) => { let s = seed; return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648 } }
  const shuffle = (r: () => number) => <T,>(a: T[]): T[] => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]] } return b }
  it('a pooled run of 6 x 2 four-wide items is dealt flat across the run', () => {
    const slots = dealSlots(Array(12).fill(4), dealSegments([2, 2, 2, 2, 2, 2], true), shuffle(rnd(7)))
    for (const L of ['A', 'B', 'C', 'D']) expect(slots.filter((s: string) => s === L).length).toBe(3)
  })
  it('dealt per cohort, 2-item cohorts would never see C or D (why pooled runs are one segment)', () => {
    const slots = dealSlots(Array(12).fill(4), dealSegments([2, 2, 2, 2, 2, 2], false), shuffle(rnd(7)))
    expect(slots.filter((s: string) => s === 'C' || s === 'D').length).toBe(0)
  })
  it('parses pooled quotas and refuses a malformed or repeated cohort', () => {
    expect(parseDrawCohort('a:3,b:2')).toEqual({ pooled: true, cohort: null, quotas: [{ cohort: 'a', size: 3 }, { cohort: 'b', size: 2 }] })
    expect(parseDrawCohort('cr-v10')).toEqual({ pooled: false, cohort: 'cr-v10', quotas: [] })
    expect(() => parseDrawCohort('a:3,a:2')).toThrow()
    expect(() => parseDrawCohort('a:0')).toThrow()
  })
})

describe('queue planning', () => {
  it('old rule mirrors draw-next: upTo runs, size per run, capped by what is waiting', () => {
    expect(oldRuleItems({ cohort: 'c', tool: 'item', size: 12, upTo: 2 }, { waiting: 159, runs: 0 })).toEqual({ runs: 2, items: 24 })
    expect(oldRuleItems({ cohort: 'c', tool: 'item', size: 36 }, { waiting: 36, runs: 0 })).toEqual({ runs: 1, items: 36 })
    expect(oldRuleItems({ cohort: 'cr-v14', tool: 'item', size: 12, upTo: 3 }, { waiting: 24, runs: 1 })).toEqual({ runs: 2, items: 24 })
    expect(oldRuleItems({ cohort: 'toefl-talk-draft-2', tool: 'sets', upTo: 1 }, { waiting: 48, runs: 0 })).toEqual({ runs: 1, items: 12 })
    expect(oldRuleItems({ cohort: 'c', tool: 'item', size: 6, upTo: 1 }, { waiting: 30, runs: 1 })).toEqual({ runs: 0, items: 0 })
  })
  it('a stratum walks bridge -> spot -> pooled as clean evidence accrues, and pools up to 6 batches', () => {
    const strata = new Map([['ssat/verbal/multiple_choice', [{ method: 'old', units: [{ key: 'u', k: 20, missIdx: [] }] }, { method: 'new', units: [] }]]])
    const batches = Array.from({ length: 10 }, (_, i) => ({ idx: i, cohort: `b${i}`, stratum: 'ssat/verbal/multiple_choice', method: 'new', tool: 'item', waiting: 150, groups: [], drawn: false, old: { runs: 1, items: 12 } }))
    const sim = simulateQueue({ strata, batches, depth: new Map([['ssat/verbal', 10]]) })
    expect(sim.runs[0].shape).toBe('bridge')
    expect(sim.runs.some((r: { shape: string }) => r.shape === 'pooled')).toBe(true)
    const pooled = sim.runs.filter((r: { shape: string }) => r.shape === 'pooled')
    expect(pooled.every((r: { batches: unknown[]; items: number }) => r.batches.length <= 6 && r.items === 12)).toBe(true)
    expect(sim.runs.flatMap((r: { batches: { cohort: string }[] }) => r.batches.map(b => b.cohort)).sort()).toEqual(batches.map(b => b.cohort).sort())
  })
  it('draws floor sections first, fewest live tests first', () => {
    const strata = new Map([['a/x/t', [{ method: 'm', units: [] }]], ['b/y/t', [{ method: 'm', units: [] }]], ['c/z/t', [{ method: 'm', units: [] }]]])
    const mk = (i: number, s: string) => ({ idx: i, cohort: `k${i}`, stratum: s, method: 'm', tool: 'item', waiting: 36, groups: [], drawn: false, old: { runs: 1, items: 36 } })
    const sim = simulateQueue({ strata, batches: [mk(0, 'a/x/t'), mk(1, 'b/y/t'), mk(2, 'c/z/t')], depth: new Map([['a/x', 10], ['b/y', 4], ['c/z', 3]]) })
    expect(sim.runs.map((r: { batches: { cohort: string }[] }) => r.batches[0].cohort)).toEqual(['k2', 'k1', 'k0'])
  })
})

describe('Amendment 3 is one text', () => {
  it('the prereg carries AMENDMENT-3-TRUST-LEVELS.md verbatim', () => {
    const dir = `${process.cwd()}/scripts/study-bank/`
    const amendment = readFileSync(dir + 'AMENDMENT-3-TRUST-LEVELS.md', 'utf8').trim()
    expect(readFileSync(dir + 'COFOUNDER-GRADER-2026-10-22.PREREG.md', 'utf8')).toContain(amendment)
  })
})
