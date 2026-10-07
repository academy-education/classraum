/** @jest-environment node */
import {
  DIMENSIONS_BY_TASK,
  validateLadders,
  spearman,
  kendallTauB,
  ranks,
  ordering,
  findInversions,
  spreads,
  bandHits,
  bestConstantHitRate,
  ladderOffset,
  edges,
  sensitivityByDimension,
  shuffleIntended,
  tokenEditCount,
  type GradedStep,
  type LadderPrompt,
} from '@/lib/study/grader-ladder'
import { GRADER_LADDERS } from '@/lib/study/__fixtures__/grader-ladder'
import { ETS_SCORED_SAMPLES } from '@/lib/study/__fixtures__/ets-scored-samples'
import { RESPONSE_SKILL_BY_TYPE } from '@/lib/study/openResponse'

const ETS_TEXTS = ETS_SCORED_SAMPLES.flatMap(s => [s.promptText, s.responseText])
const clone = (): LadderPrompt[] => JSON.parse(JSON.stringify(GRADER_LADDERS))

/** Oracle-graded steps: each repeat returns the intended band. */
function oracle(repeats = 3): GradedStep[] {
  return GRADER_LADDERS.flatMap(p => p.steps.map(s => ({
    promptId: p.id, taskType: p.taskType, stepId: s.id, parent: s.parent,
    changed: s.changed, intendedBand: s.intendedBand,
    given: Array.from({ length: repeats }, () => s.intendedBand),
  })))
}

describe('the shipped ladder fixtures', () => {
  it('validate clean', () => {
    expect(validateLadders(GRADER_LADDERS, ETS_TEXTS)).toEqual([])
  })

  it('cover every task type the rubric grader scores, and only those', () => {
    // RESPONSE_SKILL_BY_TYPE is what grade-batch sends to the grader.
    const graded = Object.keys(RESPONSE_SKILL_BY_TYPE).sort()
    expect(graded).toEqual(['speaking_interview', 'writing_discussion', 'writing_email'])
    const types = new Set(GRADER_LADDERS.map(p => p.taskType))
    expect([...types].sort()).toEqual(['academic_discussion', 'email', 'take_interview'])
    for (const t of types) expect(GRADER_LADDERS.filter(p => p.taskType === t).length).toBeGreaterThanOrEqual(1)
  })

  it('never uses a dimension from the other skill\'s guide', () => {
    // The timed-conditions allowance is Writing's; delivery is untestable.
    expect(DIMENSIONS_BY_TASK.take_interview).not.toContain('errors_timed')
    expect(DIMENSIONS_BY_TASK.take_interview).not.toContain('delivery')
    expect(DIMENSIONS_BY_TASK.academic_discussion).not.toContain('social_conventions')
  })
})

describe('validateLadders refuses', () => {
  it('a Writing-only dimension on a Speaking ladder', () => {
    const p = clone()
    const sp = p.find(x => x.taskType === 'take_interview')!
    sp.steps[1]!.changed = 'errors_timed'
    expect(validateLadders(p).join('\n')).toMatch(/not in the take_interview guide/)
  })

  it('a degradation that raises the intended band', () => {
    const p = clone()
    p[0]!.steps[5]!.intendedBand = 4.5 // F (parent C=4) raised above its parent
    expect(validateLadders(p).join('\n')).toMatch(/cannot raise|must lower/)
  })

  it('a typo step that rewrote the answer', () => {
    const p = clone()
    const b = p[0]!.steps.find(s => s.changed === 'errors_timed')!
    b.response = p[0]!.steps.find(s => s.id.endsWith('-C'))!.response
    expect(validateLadders(p).join('\n')).toMatch(/a typo step must leave the answer otherwise identical/)
  })

  it('a typo step whose replacements silently missed (identical to parent)', () => {
    const p = clone()
    const b = p[0]!.steps.find(s => s.changed === 'errors_timed')!
    b.response = p[0]!.steps[0]!.response
    expect(validateLadders(p).join('\n')).toMatch(/identical to its parent/)
  })

  it('a prompt lifted from the ETS samples', () => {
    const p = clone()
    p[0]!.passage = ETS_SCORED_SAMPLES[0]!.promptText
    expect(validateLadders(p, ETS_TEXTS).join('\n')).toMatch(/ETS sample text/)
  })

  it('two anchors, or a missing parent', () => {
    const p = clone()
    p[0]!.steps[1]!.parent = null
    p[1]!.steps[3]!.parent = 'nope'
    const out = validateLadders(p).join('\n')
    expect(out).toMatch(/exactly one anchor/)
    expect(out).toMatch(/parent nope not in this prompt/)
  })

  it('a non-anchor step that does not name its dimension', () => {
    const p = clone()
    p[2]!.steps[3]!.changed = null
    expect(validateLadders(p).join('\n')).toMatch(/must name the ONE dimension/)
  })
})

describe('correlations', () => {
  it('ranks average ties', () => {
    expect(ranks([5, 3, 3, 1])).toEqual([4, 2.5, 2.5, 1])
  })

  it('perfect, reversed and known values', () => {
    expect(spearman([1, 2, 3, 4], [10, 20, 30, 40])).toBeCloseTo(1)
    expect(spearman([1, 2, 3, 4], [4, 3, 2, 1])).toBeCloseTo(-1)
    expect(kendallTauB([1, 2, 3, 4], [4, 3, 2, 1])).toBeCloseTo(-1)
    // One swapped adjacent pair among 4: tau = (5 - 1) / 6.
    expect(kendallTauB([1, 2, 3, 4], [1, 3, 2, 4])).toBeCloseTo(4 / 6)
    // rho = 1 - 6*2/(4*15) = 0.8
    expect(spearman([1, 2, 3, 4], [1, 3, 2, 4])).toBeCloseTo(0.8)
  })

  it('returns null — never 0 or NaN — when the grader is constant', () => {
    expect(spearman([5, 4, 3], [3, 3, 3])).toBeNull()
    expect(kendallTauB([5, 4, 3], [3, 3, 3])).toBeNull()
  })
})

describe('break-tests of the instrument', () => {
  it('an oracle grader reads as perfect', () => {
    const g = oracle()
    const o = ordering(g)
    expect(o.spearman).toBeCloseTo(1)
    expect(o.kendall).toBeCloseTo(1)
    expect(findInversions(g).inversions).toHaveLength(0)
    expect(bandHits(g)).toEqual({ hits: g.length * 3, n: g.length * 3 })
    expect(ladderOffset(g).offset).toBeCloseTo(0)
  })

  it('a SHUFFLED ladder shows broken ordering under the same oracle', () => {
    const g = oracle()
    const byPrompt = [...new Set(g.map(s => s.promptId))]
    const shuffled = byPrompt.flatMap((id, k) => shuffleIntended(g.filter(s => s.promptId === id), 11 + k))
    const o = ordering(shuffled)
    expect(o.spearman!).toBeLessThan(0.5)
    expect(findInversions(shuffled).inversions.length).toBeGreaterThan(10)
    // Labels permuted, answers not: the grader still matches its CONTENT.
    expect(shuffled.map(s => s.stepId)).toEqual(g.map(s => s.stepId))
  })

  it('a CONSTANT grader shows zero ordering information and zero spread', () => {
    const g = oracle().map(s => ({ ...s, given: [3, 3, 3] }))
    const o = ordering(g)
    expect(o.spearman).toBeNull()
    expect(o.kendall).toBeNull()
    expect(o.undefinedReason).toMatch(/same band/)
    expect(spreads(g).every(r => r.spread === 0)).toBe(true)
    expect(findInversions(g).inversions).toHaveLength(0)
    // Every non-invariance edge is flat; nothing is "lowered".
    const dims = sensitivityByDimension(edges(g))
    expect(dims.reduce((a, d) => a + d.lowered, 0)).toBe(0)
  })

  it('the constant control on hit rate is derived from the data and is not zero', () => {
    const g = oracle().map(s => ({ ...s, given: [3, 3, 3] }))
    const base = bestConstantHitRate(g)
    expect(base.hits).toBeGreaterThan(0)
    expect(bandHits(g).hits).toBeLessThanOrEqual(base.hits)
  })

  it('one swapped pair is reported as exactly that inversion', () => {
    const g = oracle()
    const a = g.find(s => s.stepId === 'disc-tuition-A')!
    const h = g.find(s => s.stepId === 'disc-tuition-H')!
    a.given = [1, 1, 1]; h.given = [5, 5, 5]
    const inv = findInversions(g).inversions.filter(f => f.higher === 'disc-tuition-A' && f.lower === 'disc-tuition-H')
    expect(inv).toHaveLength(1)
  })

  it('spread sees one unstable repeat', () => {
    const g = oracle()
    g[0]!.given = [5, 4, 5]
    expect(spreads(g)[0]!.spread).toBe(1)
  })

  it('a grader blind to one dimension shows that dimension flat and the others lowered', () => {
    const g = oracle()
    for (const s of g) {
      if (s.changed !== 'relevance') continue
      // Give the relevance-degraded child its parent's band.
      const parent = g.find(x => x.promptId === s.promptId && x.stepId === s.parent)!
      s.given = [...parent.given]
    }
    const rel = sensitivityByDimension(edges(g)).find(d => d.dimension === 'relevance')!
    const lang = sensitivityByDimension(edges(g)).find(d => d.dimension === 'language_range')!
    expect(rel.lowered).toBeLessThan(rel.n)
    expect(lang.lowered).toBe(lang.n)
  })

  it('invariance edges: held within half a band, moved beyond it', () => {
    const g = oracle()
    const b = g.find(s => s.stepId === 'disc-tuition-B')!
    b.given = [4.5, 4.5, 4.5]
    expect(edges(g).find(e => e.child === 'disc-tuition-B')!.verdict).toBe('held')
    b.given = [4, 4, 4]
    expect(edges(g).find(e => e.child === 'disc-tuition-B')!.verdict).toBe('moved')
  })

  it('offset is signed and per grade', () => {
    const g = oracle().map(s => ({ ...s, given: s.given.map(x => x - 1) }))
    expect(ladderOffset(g)).toEqual({ offset: -1, n: g.length * 3 })
  })
})

describe('tokenEditCount', () => {
  it('counts a substitution as two and ignores punctuation', () => {
    expect(tokenEditCount('their income.', 'there income')).toBe(2)
    expect(tokenEditCount('a b c', 'a b c')).toBe(0)
  })
})
