import {
  buildCriterionTrends, samplesUntilDirection,
  MIN_SAMPLES_FOR_DIRECTION, NOISE_FLOOR, type CriterionSample,
} from '@/lib/study/criterion-trend'

/** n samples of one criterion, oldest first, one day apart. */
const series = (key: string, scores: number[]): CriterionSample[] =>
  scores.map((score, i) => ({
    key, score,
    at: `2026-07-${String(10 + i).padStart(2, '0')}T00:00:00Z`,
  }))

describe('buildCriterionTrends', () => {
  it('refuses to call a direction from too few responses', () => {
    // THE load-bearing test. The grader returned band 4 and band 3 for
    // the SAME essay seconds apart, so a two-point "you improved" is
    // reporting grader noise as student progress.
    const [t] = buildCriterionTrends(series('delivery', [2, 5]))
    expect(t!.direction).toBeNull()
    expect(t!.delta).toBeNull()
    // ...but the scores are still available to plot.
    expect(t!.scores).toEqual([2, 5])
    expect(t!.latest).toBe(5)
  })

  it('needs the full sample count, not one less', () => {
    const short = buildCriterionTrends(series('delivery',
      Array.from({ length: MIN_SAMPLES_FOR_DIRECTION - 1 }, () => 3)))
    expect(short[0]!.direction).toBeNull()
    const enough = buildCriterionTrends(series('delivery',
      Array.from({ length: MIN_SAMPLES_FOR_DIRECTION }, () => 3)))
    expect(enough[0]!.direction).not.toBeNull()
  })

  it('calls a real rise once there is enough to compare', () => {
    const [t] = buildCriterionTrends(series('task_fulfillment', [2, 2, 2, 4, 4, 4]))
    expect(t!.earlyMedian).toBe(2)
    expect(t!.lateMedian).toBe(4)
    expect(t!.delta).toBe(2)
    expect(t!.direction).toBe('up')
  })

  it('reports flat rather than inventing movement inside the noise floor', () => {
    // 'flat' means we looked and it did not move; null means we did not
    // look. The UI says different things for each, so they must differ.
    const [t] = buildCriterionTrends(series('language_use', [3, 3, 4, 3, 4, 3]))
    expect(Math.abs(t!.delta!)).toBeLessThan(NOISE_FLOOR)
    expect(t!.direction).toBe('flat')
  })

  it('a single erratic grade cannot flip the label on its own', () => {
    // Five identical results and one outlier. Under a MEAN this shifted
    // the late window 0.67 and reported "improving"; the median is
    // unmoved. This test failed against the first implementation, which
    // is the only reason the mean was replaced.
    const [t] = buildCriterionTrends(series('delivery', [3, 3, 3, 3, 3, 5]))
    expect(t!.direction).toBe('flat')
  })

  it('still moves on a genuine one-band change', () => {
    // The median must not be SO robust that real progress is invisible.
    const [t] = buildCriterionTrends(series('delivery', [3, 3, 3, 4, 4, 4]))
    expect(t!.direction).toBe('up')
  })

  it('reports a decline as readily as a rise', () => {
    const [t] = buildCriterionTrends(series('delivery', [4, 4, 4, 2, 2, 2]))
    expect(t!.direction).toBe('down')
    expect(t!.delta).toBe(-2)
  })

  it('sorts by timestamp, not by arrival order', () => {
    // A batch grades every response at once, so query order is not time
    // order. Backwards input must not read as a decline.
    const reversed = [...series('contribution', [1, 1, 1, 5, 5, 5])].reverse()
    const [t] = buildCriterionTrends(reversed)
    expect(t!.scores).toEqual([1, 1, 1, 5, 5, 5])
    expect(t!.direction).toBe('up')
  })

  it('keeps task-specific criteria in separate series', () => {
    // An email is graded on social_conventions, a discussion on
    // contribution. Merging them would average two different constructs.
    const trends = buildCriterionTrends([
      ...series('social_conventions', [5, 5]),
      ...series('contribution', [2, 2]),
    ])
    expect(trends.map(t => t.key).sort()).toEqual(['contribution', 'social_conventions'])
    expect(trends.find(t => t.key === 'contribution')!.samples).toBe(2)
  })

  it('puts the weakest criterion first', () => {
    const trends = buildCriterionTrends([
      ...series('good', [5, 5]),
      ...series('weak', [2, 2]),
    ])
    expect(trends[0]!.key).toBe('weak')
  })

  it('humanises the key for display', () => {
    const [t] = buildCriterionTrends(series('task_fulfillment', [3, 3]))
    expect(t!.label).toBe('Task fulfillment')
  })

  it('drops a criterion with a single response', () => {
    expect(buildCriterionTrends(series('delivery', [4]))).toEqual([])
  })

  it('ignores junk scores rather than averaging them in', () => {
    const trends = buildCriterionTrends([
      { key: 'delivery', score: NaN, at: '2026-07-10T00:00:00Z' },
      ...series('delivery', [4, 4]),
    ])
    expect(trends[0]!.samples).toBe(2)
    expect(trends[0]!.average).toBe(4)
  })
})

describe('samplesUntilDirection', () => {
  it('counts down to the threshold', () => {
    const [t] = buildCriterionTrends(series('delivery', [3, 3]))
    expect(samplesUntilDirection(t!)).toBe(MIN_SAMPLES_FOR_DIRECTION - 2)
  })

  it('is zero once a direction exists', () => {
    const [t] = buildCriterionTrends(series('delivery',
      Array.from({ length: MIN_SAMPLES_FOR_DIRECTION + 2 }, () => 3)))
    expect(samplesUntilDirection(t!)).toBe(0)
  })
})
