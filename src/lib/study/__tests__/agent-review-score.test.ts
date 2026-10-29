/** @jest-environment node */
/**
 * Pins the SSAT/MAP agent-review decision rules (AGENT-REVIEW-SSAT-MAP.prereg.md §3):
 * any grader's non-unique verdict drops an item, a dropped item takes its passage,
 * a batch pattern named by two graders on >= 3 shared items holds the cohort, and a
 * missing or malformed grader file is refused rather than scored.
 */
import {
  planPackets, dealPacket, validateGrades, scorePacket, scoreCohorts, samePattern, isPositionOnly, ReviewError, auditPlan, decideRelease, AUDIT_CAP,
} from '../../../../scripts/study-bank/agent-review-core.mjs'

type CohortOut = { hold: boolean; cleared: string[]; dropped: Record<string, string> }
const score = (packets: unknown[]) => scoreCohorts(packets) as Record<string, CohortOut>
type Decision = { release: boolean; defects: string[]; ids: string[] }
const decide = (args: { sample: unknown; cleared: unknown; reviews: unknown[]; ledger: unknown[] }) => decideRelease(args) as Record<string, Decision>

type Row = { id: string; family: string; section: string; cohort: string; passage_group_id: string | null; item: Record<string, unknown> }
const mk = (id: string, cohort: string, group: string | null): Row => ({
  id, family: 'ssat', section: 'reading', cohort, passage_group_id: group,
  item: { prompt: `Q ${id}?`, passage: group ? `Passage ${group}` : undefined, choices: ['w', 'x', 'y', 'z'], correct_answer: 'y' },
})

const uniq = (n: number, over: Record<string, unknown> = {}) => {
  const g: Record<string, unknown> = { batch_patterns: [] }
  for (let i = 1; i <= n; i++) g[String(i)] = { verdict: 'unique' }
  return { ...g, ...over }
}

describe('planPackets / dealPacket', () => {
  const rows = [
    ...Array.from({ length: 12 }, (_, i) => mk(`r${String(i).padStart(2, '0')}`, 'c1', `g${Math.floor(i / 3)}`)),
    ...Array.from({ length: 120 }, (_, i) => mk(`v${String(i).padStart(3, '0')}`, 'c2', null)),
  ]
  it('keeps passages whole, respects the item cap, and never mixes cohorts', () => {
    const packets = planPackets(rows, { maxItems: 55, maxGroups: 10 })
    for (const p of packets) {
      expect(p.items).toBeLessThanOrEqual(55)
      expect(new Set(p.units.flatMap((u: { items: Row[] }) => u.items.map(r => r.cohort))).size).toBe(1)
    }
    const c1 = packets.filter((p: { cohort: string }) => p.cohort === 'c1')
    expect(c1).toHaveLength(1)
    expect(c1[0].groups).toBe(4)
    expect(packets.filter((p: { cohort: string }) => p.cohort === 'c2')).toHaveLength(3)
  })
  it('deals the key into a choice slot, keeps a passage contiguous, and refuses a key that is not a choice', () => {
    const [p] = planPackets(rows.slice(0, 12))
    const { items, index } = dealPacket(p)
    expect(items).toHaveLength(12)
    for (const it of items) expect(it.choices).toContain(it.correct_answer)
    const groups = index.map((r: { group: string }) => r.group)
    groups.forEach((g: string, i: number) => { if (i && g !== groups[i - 1]) expect(groups.slice(0, i)).not.toContain(g) })
    const bad = { ...p, units: [{ id: 'g0', items: [{ ...rows[0], item: { ...rows[0].item, correct_answer: 'nope' } }] }] }
    expect(() => dealPacket(bad)).toThrow(ReviewError)
  })
})

describe('validateGrades', () => {
  it('refuses a missing item, a bad verdict, a non-unique verdict without defect_type, and missing batch_patterns', () => {
    expect(() => validateGrades(uniq(3), 3)).not.toThrow()
    const missing = uniq(3); delete (missing as Record<string, unknown>)['2']
    expect(() => validateGrades(missing, 3)).toThrow(/item 2 missing/)
    expect(() => validateGrades(uniq(3, { 2: { verdict: 'maybe' } }), 3)).toThrow(/verdict/)
    expect(() => validateGrades(uniq(3, { 2: { verdict: 'alternative' } }), 3)).toThrow(/defect_type/)
    const noBp = uniq(3); delete (noBp as Record<string, unknown>).batch_patterns
    expect(() => validateGrades(noBp, 3)).toThrow(/batch_patterns/)
    expect(() => validateGrades(null, 3)).toThrow(ReviewError)
  })
})

describe('scoring', () => {
  const index = [
    { n: 1, id: 'r1', cohort: 'c1', group: 'gA' },
    { n: 2, id: 'r2', cohort: 'c1', group: 'gA' },
    { n: 3, id: 'r3', cohort: 'c1', group: 'gB' },
    { n: 4, id: 'r4', cohort: 'c1', group: 'gB' },
    { n: 5, id: 'r5', cohort: 'c1', group: 'item:r5' },
    { n: 6, id: 'r6', cohort: 'c1', group: 'item:r6' },
  ]
  it('drops an item one grader flags, takes its passage with it, and leaves standalone items alone', () => {
    const grades = { a: uniq(6), b: uniq(6, { 2: { verdict: 'hold', defect_type: 'factual_error' } }), c: uniq(6, { 5: { verdict: 'alternative', defect_type: 'second_defensible' } }) }
    const out = score([{ index, score: scorePacket(index, grades) }]).c1
    expect(out.hold).toBe(false)
    expect(Object.keys(out.dropped).sort()).toEqual(['r1', 'r2', 'r5'])
    expect(out.dropped.r1).toMatch(/passage/)
    expect(out.cleared).toEqual(['r3', 'r4', 'r6'])
  })
  it('holds the whole cohort when two graders name the same pattern on >= 3 items, not on 2', () => {
    const pat = (items: number[], pattern = 'key_form') => ({ pattern, items, evidence: 'x' })
    const held = { a: uniq(6, { batch_patterns: [pat([1, 3, 5])] }), b: uniq(6, { batch_patterns: [pat([1, 3, 5, 6])] }), c: uniq(6) }
    const out = score([{ index, score: scorePacket(index, held) }]).c1
    expect(out.hold).toBe(true)
    expect(out.cleared).toEqual([])
    const weak = { a: uniq(6, { batch_patterns: [pat([1, 3])] }), b: uniq(6, { batch_patterns: [pat([1, 3])] }), c: uniq(6) }
    expect(score([{ index, score: scorePacket(index, weak) }]).c1.hold).toBe(false)
    const lone = { a: uniq(6, { batch_patterns: [pat([1, 3, 5])] }), b: uniq(6), c: uniq(6) }
    expect(score([{ index, score: scorePacket(index, lone) }]).c1.hold).toBe(false)
  })
  it('matches patterns by type, or when either is a custom name', () => {
    expect(samePattern({ pattern: 'key_form', items: [1, 2, 3] }, { pattern: 'one_template', items: [1, 2, 3] })).toBe(false)
    expect(samePattern({ pattern: 'key_form', items: [1, 2, 3] }, { pattern: 'purpose_verb_tell', items: [1, 2, 3, 9] })).toBe(true)
  })
  it('A1.1: an answer-letter pattern never counts, even when both graders name it', () => {
    const pat = (items: number[], pattern: string) => ({ pattern, items, evidence: 'x' })
    expect(isPositionOnly('key_position')).toBe(true)
    expect(isPositionOnly('answer_letter_run')).toBe(true)
    expect(isPositionOnly('key_form')).toBe(false)
    const g = { a: uniq(6, { batch_patterns: [pat([1, 3, 5, 6], 'key_position')] }), b: uniq(6, { batch_patterns: [pat([1, 3, 5, 6], 'key_position')] }), c: uniq(6) }
    const out = score([{ index, score: scorePacket(index, g) }]).c1
    expect(out.hold).toBe(false)
    expect(out.cleared).toEqual(['r1', 'r2', 'r3', 'r4', 'r5', 'r6'])
    // a custom-named pattern must not match a position pattern either
    expect(samePattern({ pattern: 'key_position', items: [1, 2, 3] }, { pattern: 'purpose_verb_tell', items: [1, 2, 3] })).toBe(false)
  })
  it('A1.2: a pattern on under half the cohort drops only its items and their passages; half or more holds', () => {
    const big = Array.from({ length: 10 }, (_, i) => ({ n: i + 1, id: `s${i + 1}`, cohort: 'c2', group: i < 2 ? 'gP' : `item:s${i + 1}` }))
    const pat = (items: number[]) => ({ pattern: 'stem_gives_answer', items, evidence: 'x' })
    const subset = { a: uniq(10, { batch_patterns: [pat([1, 5, 6])] }), b: uniq(10, { batch_patterns: [pat([1, 5, 6])] }), c: uniq(10) }
    const out = score([{ index: big, score: scorePacket(big, subset) }]).c2
    expect(out.hold).toBe(false)
    expect(Object.keys(out.dropped).sort()).toEqual(['s1', 's2', 's5', 's6'])
    expect(out.dropped.s2).toMatch(/passage/)
    expect(out.dropped.s5).toMatch(/pattern/)
    expect(out.cleared).toEqual(['s10', 's3', 's4', 's7', 's8', 's9'])
    const wide = { a: uniq(10, { batch_patterns: [pat([1, 2, 3, 4, 5])] }), b: uniq(10, { batch_patterns: [pat([1, 2, 3, 4, 5])] }), c: uniq(10) }
    const held = score([{ index: big, score: scorePacket(big, wide) }]).c2
    expect(held.hold).toBe(true)
    expect(held.cleared).toEqual([])
  })
  it('refuses to score a packet with a missing or malformed grader file', () => {
    expect(() => scorePacket(index, { a: uniq(6), b: uniq(6) })).toThrow(/missing grader/)
    expect(() => scorePacket(index, { a: uniq(6), b: uniq(6), c: uniq(5) })).toThrow(/item 6 missing/)
  })
})

describe('pre-release audit (prereg "Release after A1")', () => {
  it('plans SSAT Reading first, then MAP Language, then the rest; 2 / 2 (1 under 20 cleared) / 1', () => {
    const plan = auditPlan([
      { cohort: 'v', cleared: 100, family: 'ssat', section: 'verbal' },
      { cohort: 'lu', cleared: 10, family: 'map', section: 'language' },
      { cohort: 'rd', cleared: 36, family: 'ssat', section: 'reading' },
      { cohort: 'lang', cleared: 40, family: 'map', section: 'language' },
      { cohort: 'none', cleared: 0, family: 'ssat', section: 'reading' },
    ])
    expect(plan.map((p: { cohort: string; n: number }) => `${p.cohort}:${p.n}`)).toEqual(['rd:2', 'lang:2', 'lu:1', 'v:1'])
    expect(AUDIT_CAP).toBe(24)
  })

  const sample = { c1: ['a1', 'a2'], c2: ['b1'] }
  const cleared = { c1: ['a1', 'a2', 'a3', 'a4'], c2: ['b1', 'b2'] }
  const row = (id: string, item_id: string, over: Record<string, unknown> = {}) =>
    ({ id, item_id, run_id: 'agentreview-audit-x', verdict: 'unique', note: null, blind_at: '2026-10-30', reviewer_kind: 'human', ...over })
  const clean = () => [row('r1', 'a1'), row('r2', 'a2'), row('r3', 'b1')]

  it('releases every cleared item of a clean cohort and holds a cohort with one flagged sample', () => {
    const out = decide({ sample, cleared, reviews: [row('r1', 'a1'), row('r2', 'a2', { verdict: 'alternative' }), row('r3', 'b1')], ledger: [
      { review_id: 'r2', defect_type: 'second_defensible', would_block: true },
    ] })
    expect(out.c1.release).toBe(false)
    expect(out.c1.defects[0]).toMatch(/a2: verdict alternative/)
    expect(out.c1.ids).toEqual(cleared.c1)
    expect(out.c2).toEqual({ release: true, defects: [], ids: cleared.c2 })
    expect(decide({ sample, cleared, reviews: clean(), ledger: [] }).c1.release).toBe(true)
  })
  it('holds on a unique verdict whose note is classified would_block, not on a harmless note', () => {
    const reviews = [row('r1', 'a1', { note: 'B is arguable' }), row('r2', 'a2'), row('r3', 'b1')]
    const block = decide({ sample, cleared, reviews, ledger: [{ review_id: 'r1', defect_type: 'rival_some_pull', would_block: true }] })
    expect(block.c1.release).toBe(false)
    expect(block.c1.defects[0]).toMatch(/would_block/)
    const fine = decide({ sample, cleared, reviews, ledger: [{ review_id: 'r1', defect_type: 'rival_some_pull', would_block: false }] })
    expect(fine.c1.release).toBe(true)
  })
  it('refuses while open, on an unclassified note, a stray row, a missing sampled row, or a non-human row', () => {
    expect(() => decideRelease({ sample, cleared, reviews: [row('r1', 'a1', { blind_at: null }), row('r2', 'a2'), row('r3', 'b1')], ledger: [] })).toThrow(/still open/)
    expect(() => decideRelease({ sample, cleared, reviews: [row('r1', 'a1', { verdict: null }), row('r2', 'a2'), row('r3', 'b1')], ledger: [] })).toThrow(/still open/)
    expect(() => decideRelease({ sample, cleared, reviews: [row('r1', 'a1', { note: 'hmm' }), row('r2', 'a2'), row('r3', 'b1')], ledger: [] })).toThrow(/unclassified/)
    expect(() => decideRelease({ sample, cleared, reviews: [...clean(), row('r9', 'zz')], ledger: [] })).toThrow(/not in the audit sample/)
    expect(() => decideRelease({ sample, cleared, reviews: [row('r1', 'a1'), row('r3', 'b1')], ledger: [] })).toThrow(/a2 has no row/)
    expect(() => decideRelease({ sample, cleared, reviews: [row('r1', 'a1', { reviewer_kind: 'model_assisted' }), row('r2', 'a2'), row('r3', 'b1')], ledger: [] })).toThrow(/not a human/)
    expect(() => decideRelease({ sample, cleared, reviews: [], ledger: [] })).toThrow(ReviewError)
  })
})
