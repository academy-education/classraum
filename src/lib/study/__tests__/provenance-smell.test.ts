import { provenanceSmell, scoreRun, type ReviewRow, type Slot } from '../item-review'

/*
 * The check that would have caught 2026-08-06.
 *
 * Forty reviews were entered through the human UI with a model
 * answering. Nothing objected, the number reached the register, and SAT
 * Craft and Structure rendered "CONFIRMED BROKEN — both instruments
 * agree" — 211 items condemned on a model agreeing with itself.
 *
 * These fixtures are the REAL runs, reconstructed from their published
 * shape, so the test fails if the check stops recognising the actual
 * event rather than an idealised version of it.
 */
const row = (pick: Slot | null, key: Slot): ReviewRow => ({
  keySlot: key, blindPick: pick, answered: true, verdict: null, realism: null,
})

/** n items, `correct` of them right, `cantTell` abstentions. */
function run(n: number, correct: number, cantTell: number): ReviewRow[] {
  const out: ReviewRow[] = []
  for (let i = 0; i < n; i++) {
    if (i < correct) out.push(row('A', 'A'))
    else if (i < correct + cantTell) out.push(row(null, 'A'))
    else out.push(row('B', 'A'))
  }
  return out
}

describe('provenanceSmell — "who actually sat this?"', () => {
  it('fires on the real craft-and-structure run: 20/20, zero abstentions', () => {
    const s = provenanceSmell(scoreRun(run(20, 20, 0)))
    expect(s.suspicious).toBe(true)
    // BOTH tells present — the accuracy and the total absence of doubt.
    expect(s.reasons).toHaveLength(2)
    expect(s.reasons.join(' ')).toMatch(/100% correct on a BLIND sitting/)
    expect(s.reasons.join(' ')).toMatch(/can't tell/)
  })

  it('does NOT catch the 65% assisted run — a limitation, recorded not hidden', () => {
    /*
     * The other model-assisted run on 2026-08-06 scored 13/20. It slips
     * through, and that is deliberate: 65% is a plausible human score,
     * and the only way to catch it would be to fit a threshold to two
     * data points. Written as a test so the gap is a known property
     * rather than something discovered later as a surprise.
     */
    expect(provenanceSmell(scoreRun(run(20, 13, 0))).suspicious).toBe(false)
  })

  it('does NOT flag the highest genuine sitting — the bug that shipped once', () => {
    /*
     * The first version compared each run to the best of the others,
     * which fires on the maximum by construction. Wired up it flagged
     * choose-a-response (55%), the strongest real finding here. A check
     * that cries wolf on the best result is worse than no check.
     */
    expect(provenanceSmell(scoreRun(run(20, 11, 0))).suspicious).toBe(false)
    // ...and it stays quiet well above that, at 70%, where the old
    // relative rule would have shouted purely for being the highest.
    expect(provenanceSmell(scoreRun(run(20, 14, 0))).suspicious).toBe(false)
    // 85% blind with no doubt shown DOES trip it, and should: that is
    // an absolute claim about the score, not about its neighbours.
    expect(provenanceSmell(scoreRun(run(20, 17, 0))).suspicious).toBe(true)
  })

  it('stays QUIET on every genuine human sitting to date', () => {
    // announcement 15%, daily-life 25%, academic-passage 41.7%,
    // choose-a-response 55% — the last of which is the project's
    // strongest positive finding and must not be flagged.
    for (const [n, correct, cantTell] of [[20, 3, 0], [20, 5, 0], [12, 5, 1], [20, 11, 0]] as const) {
      expect(provenanceSmell(scoreRun(run(n, correct, cantTell))).suspicious).toBe(false)
    }
  })

  it('does not flag a small run, however it scores', () => {
    // Under 10 answered, a perfect score is luck, not evidence of
    // anything. Firing here would train people to ignore the warning.
    expect(provenanceSmell(scoreRun(run(8, 8, 0))).suspicious).toBe(false)
  })

  it('does not flag confidence alone — a decisive reader scoring at chance', () => {
    // 25% with no abstentions is a person who guessed rather than
    // abstained. Careless, not model-assisted.
    expect(provenanceSmell(scoreRun(run(20, 5, 0))).suspicious).toBe(false)
  })

  it('does not flag abstention alone — a cautious reader who scored well', () => {
    // 90% is caught by the accuracy rule, so use a score that only the
    // abstention rule could reach: high-ish, but with real doubt shown.
    const s = provenanceSmell(scoreRun(run(20, 13, 4)))
    expect(s.reasons.some(r => /can't tell/.test(r))).toBe(false)
  })

  it('is absolute — the same run scores the same regardless of its neighbours', () => {
    // No reference to other sittings at all. That is the fix.
    expect(provenanceSmell(scoreRun(run(20, 20, 0))).suspicious).toBe(true)
    expect(provenanceSmell(scoreRun(run(20, 13, 3))).suspicious).toBe(false)
  })
})
