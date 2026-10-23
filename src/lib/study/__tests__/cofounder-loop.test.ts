/** @jest-environment node */
/**
 * The co-founder feedback loop's pure logic (scripts/study-bank/cofounder-loop-lib.mjs):
 * which review rows are his notes, which items become fixtures, and how a grade file
 * is scored against the pre-registered ship bar.
 *
 * The scoring rules pinned here are the ones CLAUDE.md says a check must obey:
 * a missing grade file returns no numbers, an unmapped item is never a pass, an
 * unscored item invalidates the run, and the bar is tested at its edges (80.0% and
 * +10.0 points), not with a blowout.
 *
 * BREAK-TESTS run 2026-10-23: (1) making scoreGrades `continue` on an unmapped id
 * instead of counting it flagged fails "an unmapped item is counted flagged";
 * (2) changing shipBar's `>= recall` to `> recall` fails "exactly 80% passes";
 * (3) dropping the stale filter in pickFixtures fails "stale reviews never become
 * positives".
 */
import * as lib from '../../../../scripts/study-bank/cofounder-loop-lib.mjs'

// The lib is untyped JS; these are the shapes the tests read.
type Bucket = { x: number; n: number }
type Side = { all: Bucket; byType: Record<string, Bucket>; byFam: Record<string, Bucket> }
type Score = { valid: boolean; measured: boolean; errors: string[]; unmapped: number; unscored: number; scorable: number; pos: Side; neg: Side }
type Row = Record<string, unknown> & { id: string; item_id: string; label?: string; match?: string; matched_type?: string; n?: number }
type Bar = { pass: boolean; reasons: string[]; types: Record<string, { status: string }> }
type Plan = { count: number; nextVersion: string; fixtures: (Row & { skipped?: string })[]; briefLines: (Row & { kind: string })[] }
const COFOUNDER_REVIEWER_ID = lib.COFOUNDER_REVIEWER_ID as string
const selectNoteRows = lib.selectNoteRows as unknown as (r: unknown[]) => { selected: Row[]; modelAssisted: Row[]; human: Row[] }
const mergeClassifications = lib.mergeClassifications as unknown as (s: unknown[], c: unknown[], m: Map<string, unknown>) => { ok: boolean; entries: Row[]; errors: Record<string, string[]> }
const pickFixtures = lib.pickFixtures as unknown as (a: unknown) => { positives: Row[]; negatives: Row[]; excluded: Record<string, string[]>; poolSize: number }
const buildPacket = lib.buildPacket as unknown as (f: unknown[], o: unknown) => { packet: Row[]; index: Row[]; parts: { items: Row[] }[] }
const scoreGrades = lib.scoreGrades as unknown as (a: unknown) => Score
const shipBar = lib.shipBar as unknown as (a: unknown, b: unknown) => Bar
const planApply = lib.planApply as unknown as (a: unknown) => Plan
const shuffle = lib.shuffle as unknown as <T>(a: T[], s: string) => T[]
const fixtureId = lib.fixtureId as unknown as (i: string, s: string) => string

const R = COFOUNDER_REVIEWER_ID
const rev = (id: string, item_id: string, o: Record<string, unknown> = {}) => ({
  id, item_id, reviewer_id: R, reviewer_kind: 'human', verdict: 'unique', note: null, item_sha: 'sha-' + item_id, run_id: 'run', reviewed_at: '2026-10-01', ...o,
})
const item = (id: string, o: Record<string, unknown> = {}) => ({
  id, family: 'toefl', section: 'listening', task: 'choose_response', cohort: 'c', content_sha: 'sha-' + id, archived: false, ...o,
})

describe('selectNoteRows', () => {
  it('keeps human rows with a note or a non-unique verdict and never model_assisted ones', () => {
    const revs = [
      rev('a', 'i1', { note: 'C is also a good answer.', verdict: 'alternative' }),
      rev('b', 'i2', { note: '   ' }),
      rev('c', 'i3', { verdict: 'broken' }),
      rev('d', 'i4', { reviewer_kind: 'model_assisted', note: 'model note', verdict: 'alternative' }),
      rev('e', 'i5', { reviewer_id: 'someone-else', note: 'x' }),
    ]
    const s = selectNoteRows(revs)
    expect(s.selected.map(r => r.id)).toEqual(['a', 'c'])
    expect(s.modelAssisted).toHaveLength(1)
    expect(s.human).toHaveLength(3)
  })
})

describe('mergeClassifications', () => {
  const items = new Map([['i1', item('i1')], ['i2', item('i2')]])
  const sel = [rev('a', 'i1', { note: 'n' }), rev('b', 'i2', { verdict: 'alternative' })]
  const ok = (id: string) => ({ review_id: id, defect_type: 'second_defensible', would_block: true, scope: 'item', rationale: 'r' })

  it('joins every row when every row is classified', () => {
    const m = mergeClassifications(sel, [ok('a'), ok('b')], items)
    expect(m.ok).toBe(true)
    expect(m.entries).toHaveLength(2)
    expect(m.entries[0].fresh).toBe(true)
  })
  it('reports an unclassified row, a classification with no row, and a malformed one', () => {
    expect(mergeClassifications(sel, [ok('a')], items).errors.unclassified).toEqual(['b'])
    expect(mergeClassifications(sel, [ok('a'), ok('b'), ok('zzz')], items).errors.missing).toEqual(['zzz'])
    const bad = mergeClassifications(sel, [ok('a'), { ...ok('b'), defect_type: 'vibes' }], items)
    expect(bad.ok).toBe(false)
    expect(bad.errors.invalid[0]).toMatch(/unknown defect_type/)
    expect(mergeClassifications(sel, [ok('a'), { ...ok('b'), rationale: ' ' }], items).ok).toBe(false)
  })
})

describe('pickFixtures', () => {
  const items = new Map<string, ReturnType<typeof item>>()
  const human: ReturnType<typeof rev>[] = []
  const ledger: Record<string, unknown>[] = []
  // 3 blocking fresh positives, 1 stale, 1 batch-scope
  for (const k of ['p1', 'p2', 'p3', 'pStale', 'pBatch']) {
    items.set(k, item(k, k === 'pStale' ? { content_sha: 'edited' } : {}))
    human.push(rev('r-' + k, k, { verdict: 'alternative', note: 'x' }))
    ledger.push({ source: 'review', review_id: 'r-' + k, item_id: k, would_block: true, defect_type: 'second_defensible',
      scope: k === 'pBatch' ? 'batch' : 'item', fresh: k !== 'pStale' })
  }
  // clean pool: 4 matching stratum, 1 archived, 1 stale, 1 with a second (noted) review, 2 other family
  for (const k of ['n1', 'n2', 'n3', 'n4', 'nArch', 'nStale', 'nDirty', 'o1', 'o2']) {
    items.set(k, item(k, { ...(k === 'nArch' ? { archived: true } : {}), ...(k === 'nStale' ? { content_sha: 'x' } : {}), ...(k[0] === 'o' ? { family: 'ssat', section: 'reading', task: 'mc' } : {}) }))
    human.push(rev('r-' + k, k))
  }
  human.push(rev('r-nDirty-2', 'nDirty', { note: 'distractors easy' }))

  const run = (seed = 's') => pickFixtures({ ledger, humanReviews: human, itemsById: items, seed })

  it('stale reviews never become positives; batch-scope defects are not item fixtures', () => {
    const f = run()
    expect(f.positives.map(p => p.item_id).sort()).toEqual(['p1', 'p2', 'p3'])
    expect(f.excluded.stale).toEqual(['r-pStale'])
    expect(f.excluded.notItemScope).toEqual(['r-pBatch'])
  })
  it('negatives: equal size, stratum-matched, never archived, stale, noted or positive', () => {
    const f = run()
    expect(f.negatives).toHaveLength(3)
    for (const n of f.negatives) {
      expect(['n1', 'n2', 'n3', 'n4']).toContain(n.item_id)
      expect(n.match).toBe('stratum')
      expect(n.matched_type).toBe('second_defensible')
    }
    expect(f.poolSize).toBe(6) // n1-n4, o1, o2
  })
  it('is deterministic for a seed', () => {
    expect(run('s').negatives.map(n => n.item_id)).toEqual(run('s').negatives.map(n => n.item_id))
  })
})

describe('buildPacket', () => {
  it('keeps mkpacket shape and global n across parts, and hides the label', () => {
    const fx = ['a', 'b', 'c', 'd', 'e'].map(k => ({ id: fixtureId(k, 's'), label: k < 'c' ? 'positive' : 'negative', family: 'toefl', section: 'listening',
      item: { passage: 'T', prompt: 'P' + k, choices: ['x', 'y'], correct_answer: 'x' } }))
    const p = buildPacket(fx, { seed: 's', parts: 2 })
    expect(p.packet.map(x => x.n)).toEqual([1, 2, 3, 4, 5])
    expect(Object.keys(p.packet[0]).sort()).toEqual(['choices', 'correct_answer', 'family', 'n', 'passage', 'prompt', 'section'])
    expect(JSON.stringify(p.packet) + JSON.stringify(p.index)).not.toMatch(/positive|negative/)
    expect(p.parts.flatMap(x => x.items.map(i => i.n))).toEqual([1, 2, 3, 4, 5])
  })
})

describe('scoreGrades', () => {
  // 4 positives (2 second_defensible, 2 source_underspecified), 4 negatives
  const fixtures = [
    { id: 'P1', label: 'positive', defect_type: 'second_defensible', family: 'toefl' },
    { id: 'P2', label: 'positive', defect_type: 'second_defensible', family: 'sat' },
    { id: 'P3', label: 'positive', defect_type: 'source_underspecified', family: 'toefl' },
    { id: 'P4', label: 'positive', defect_type: 'source_underspecified', family: 'toefl' },
    { id: 'N1', label: 'negative', matched_type: 'second_defensible', family: 'toefl' },
    { id: 'N2', label: 'negative', matched_type: 'second_defensible', family: 'sat' },
    { id: 'N3', label: 'negative', matched_type: 'source_underspecified', family: 'toefl' },
    { id: 'N4', label: 'negative', matched_type: 'source_underspecified', family: 'toefl' },
  ]
  const fixturesById = new Map(fixtures.map(f => [f.id, f]))
  const index = fixtures.map((f, i) => ({ n: i + 1, file: 'f', id: f.id }))
  const verdicts = ['alternative', 'unique', 'broken', 'hold', 'unique', 'alternative', 'unique', 'unique']
  const grades = () => ({
    'g1.json': Object.fromEntries(verdicts.slice(0, 4).map((v, i) => [String(i + 1), { verdict: v }])),
    'g2.json': Object.fromEntries(verdicts.slice(4).map((v, i) => [String(i + 5), { verdict: v }])),
  })
  const expected = ['g1.json', 'g2.json']

  it('counts recall per type and family and false flags on matched negatives', () => {
    const r = scoreGrades({ index, fixturesById, gradeFiles: grades(), expected })
    expect(r.valid).toBe(true)
    expect(r.pos.all).toEqual({ x: 3, n: 4 })
    expect(r.pos.byType.second_defensible).toEqual({ x: 1, n: 2 })
    expect(r.pos.byType.source_underspecified).toEqual({ x: 2, n: 2 }) // broken and hold both count as flags
    expect(r.neg.all).toEqual({ x: 1, n: 4 })
    expect(r.neg.byType.second_defensible).toEqual({ x: 1, n: 2 })
    expect(r.neg.byFam.sat).toEqual({ x: 1, n: 1 })
    expect(r.scorable).toBe(8)
  })
  it('a missing grade file returns no numbers', () => {
    const g = grades(); delete (g as Record<string, unknown>)['g2.json']
    const r = scoreGrades({ index, fixturesById, gradeFiles: g, expected })
    expect(r.measured).toBe(false)
    expect(r.valid).toBe(false)
    expect(r).not.toHaveProperty('pos')
  })
  it('an unmapped item is counted flagged and invalidates the run', () => {
    const idx = index.map(e => (e.n === 5 ? { ...e, id: 'GHOST' } : e))
    const r = scoreGrades({ index: idx, fixturesById, gradeFiles: grades(), expected })
    expect(r.valid).toBe(false)
    expect(r.unmapped).toBe(1)
    expect(r.neg.byFam.UNMAPPED).toEqual({ x: 1, n: 1 })
    expect(r.neg.all).toEqual({ x: 2, n: 4 }) // N1 (graded unique) replaced by a flagged ghost
    expect(r.errors.join('\n')).toMatch(/fixture N1 is not in the packet/)
  })
  it('an all-pass grader moves recall to zero; an all-flag grader moves false flags to 100%', () => {
    const all = (v: string) => ({ 'g1.json': Object.fromEntries([1, 2, 3, 4].map(n => [String(n), { verdict: v }])), 'g2.json': Object.fromEntries([5, 6, 7, 8].map(n => [String(n), { verdict: v }])) })
    const pass = scoreGrades({ index, fixturesById, gradeFiles: all('unique'), expected })
    const flag = scoreGrades({ index, fixturesById, gradeFiles: all('alternative'), expected })
    expect(pass.pos.all.x).toBe(0); expect(pass.neg.all.x).toBe(0)
    expect(flag.pos.all.x).toBe(4); expect(flag.neg.all.x).toBe(4)
  })
  it('missing, unknown-verdict, out-of-index and doubly graded items invalidate the run', () => {
    const g1 = grades(); delete (g1['g1.json'] as Record<string, unknown>)['2']
    expect(scoreGrades({ index, fixturesById, gradeFiles: g1, expected }).unscored).toBe(1)
    const g2 = grades(); (g2['g1.json'] as Record<string, unknown>)['2'] = { verdict: 'maybe' }
    expect(scoreGrades({ index, fixturesById, gradeFiles: g2, expected }).valid).toBe(false)
    const g3 = grades(); (g3['g2.json'] as Record<string, unknown>)['99'] = { verdict: 'unique' }
    expect(scoreGrades({ index, fixturesById, gradeFiles: g3, expected }).errors.join()).toMatch(/not in index/)
    const g4 = grades(); (g4['g2.json'] as Record<string, unknown>)['1'] = { verdict: 'unique' }
    expect(scoreGrades({ index, fixturesById, gradeFiles: g4, expected }).errors.join()).toMatch(/graded in both/)
  })
  it('requires batch_patterns only when the brief does', () => {
    expect(scoreGrades({ index, fixturesById, gradeFiles: grades(), expected, requireBatchPatterns: true }).valid).toBe(false)
    const g = grades() as Record<string, Record<string, unknown>>
    g['g1.json'].batch_patterns = []; g['g2.json'].batch_patterns = [{ pattern: 'key_position' }]
    expect(scoreGrades({ index, fixturesById, gradeFiles: g, expected, requireBatchPatterns: true }).valid).toBe(true)
  })
})

describe('shipBar (recall >= 80% per type with >= 10 positives; false flags <= old + 10 points)', () => {
  const run = (types: Record<string, [number, number]>, ff: [number, number]) => ({
    valid: true,
    pos: { byType: Object.fromEntries(Object.entries(types).map(([k, [x, n]]) => [k, { x, n }])) },
    neg: { all: { x: ff[0], n: ff[1] } },
  })
  const old = run({}, [2, 20]) // 10.0%

  it('exactly 80% passes and 79% fails, at the edge', () => {
    expect(shipBar(run({ a: [8, 10] }, [2, 20]), old).pass).toBe(true)
    expect(shipBar(run({ a: [7, 10] }, [2, 20]), old).pass).toBe(false)
    expect(shipBar(run({ a: [23, 28] }, [2, 20]), old).pass).toBe(true)   // 82.1%
    expect(shipBar(run({ a: [22, 28] }, [2, 20]), old).pass).toBe(false)  // 78.6%
  })
  it('a type under 10 positives is unvalidated and cannot fail or carry the bar', () => {
    const b = shipBar(run({ a: [10, 10], b: [0, 9] }, [2, 20]), old)
    expect(b.types.b.status).toBe('unvalidated'); expect(b.pass).toBe(true)
    expect(shipBar(run({ b: [9, 9] }, [2, 20]), old).pass).toBe(false) // nothing validated
  })
  it('false flags exactly +10 points pass; above fails', () => {
    expect(shipBar(run({ a: [10, 10] }, [4, 20]), old).pass).toBe(true)   // 20% vs 10%
    expect(shipBar(run({ a: [10, 10] }, [41, 200]), old).pass).toBe(false) // 20.5% vs 10%
  })
  it('an invalid run never passes', () => {
    expect(shipBar({ ...run({ a: [10, 10] }, [0, 20]), valid: false }, old).pass).toBe(false)
  })
})

describe('planApply', () => {
  it('adds only unapplied would-block notes and bumps the brief version', () => {
    const ledger = [
      { source: 'review', review_id: 'old', would_block: true, defect_type: 'second_defensible', scope: 'item', fresh: true, item_id: 'i0', note: 'x' },
      { source: 'review', review_id: 'new1', would_block: true, defect_type: 'factual_error', scope: 'item', fresh: true, item_id: 'i1', note: 'offside' },
      { source: 'review', review_id: 'new2', would_block: true, defect_type: 'second_defensible', scope: 'item', fresh: false, item_id: 'i2', note: 'y' },
      { source: 'review', review_id: 'q', would_block: false, defect_type: 'distractor_too_easy', scope: 'item', fresh: true, item_id: 'i3', note: 'easy' },
    ]
    const p = planApply({ ledger, applied: new Set(['old']), briefVersion: 'v2', briefTypesCovered: new Set(['second_defensible']) })
    expect(p.count).toBe(2)
    expect(p.nextVersion).toBe('v3')
    expect(p.fixtures.find(f => f.id === 'new1')).toMatchObject({ item_id: 'i1' })
    expect(p.fixtures.find(f => f.id === 'new2')?.skipped).toMatch(/stale/)
    expect(p.briefLines.find(b => b.id === 'new1')?.kind).toBe('new-check')
    expect(p.briefLines.find(b => b.id === 'new2')?.kind).toBe('example')
    expect(planApply({ ledger, applied: new Set(['old', 'new1', 'new2']), briefVersion: 'v2', briefTypesCovered: new Set() }).nextVersion).toBe('v2')
  })
})

it('shuffle is a seeded permutation', () => {
  const a = Array.from({ length: 20 }, (_, i) => i)
  expect(shuffle(a, 'x')).toEqual(shuffle(a, 'x'))
  expect([...shuffle(a, 'x')].sort((p, q) => p - q)).toEqual(a)
  expect(shuffle(a, 'x')).not.toEqual(shuffle(a, 'y'))
})
