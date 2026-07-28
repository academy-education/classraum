import {
  INTERVIEW_SETS, type InterviewFrame, type InterviewSet,
} from '@/lib/study/toefl-interview-sets'

/** The frames legitimately available at each opinion rung. A rung-4 frame
 *  appearing at rung 3 is a structural error, not a style choice. */
const RUNG3_FRAMES: InterviewFrame[] = [
  'agree_with_claim', 'is_criticism_fair', 'rank_two_goods',
  'answer_an_objector', 'worth_the_cost', 'name_the_problem',
]
const RUNG4_FRAMES: InterviewFrame[] = [
  'policy_decision', 'predict_change', 'one_recommendation', 'forced_tradeoff',
]

/**
 * Largest number of sets one frame may carry at a rung.
 *
 * An even spread over F frames puts ceil(n/F) sets on each; +1 leaves room
 * to add a set without immediately tripping the check. The point is not to
 * police small imbalances — it is to fail on CONVERGENCE, which is what
 * actually shipped: 7 of 12 delivered interview questions used a single
 * "Some people believe X, while others think Y" frame.
 */
const cap = (n: number, frames: number) => Math.ceil(n / frames) + 1

function frameCounts(sets: InterviewSet[], rung: 3 | 4): Map<string, number> {
  const counts = new Map<string, number>()
  for (const s of sets) {
    const f = s.questions.find(q => q.rung === rung)?.frame
    if (f) counts.set(f, (counts.get(f) ?? 0) + 1)
  }
  return counts
}

const words = (s: string) =>
  new Set(s.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(w => w.length > 3))

/** Jaccard overlap on content words — near-duplicates, not exact matches,
 *  are what a student actually notices. */
function overlap(a: string, b: string): number {
  const A = words(a), B = words(b)
  const inter = [...A].filter(w => B.has(w)).length
  const union = new Set([...A, ...B]).size
  return union === 0 ? 0 : inter / union
}

describe('TOEFL interview sets', () => {
  it('has enough sets that a student is unlikely to repeat one', () => {
    expect(INTERVIEW_SETS.length).toBeGreaterThanOrEqual(10)
  })

  it.each(INTERVIEW_SETS.map(s => [s.id, s] as const))(
    '%s escalates through all four rungs in order', (_id, set) => {
      expect(set.questions.map(q => q.rung)).toEqual([1, 2, 3, 4])
      // Rungs 1-2 report experience and preference; they are not opinion
      // turns and must not claim a frame.
      expect(set.questions[0].frame).toBeNull()
      expect(set.questions[1].frame).toBeNull()
      expect(RUNG3_FRAMES).toContain(set.questions[2].frame)
      expect(RUNG4_FRAMES).toContain(set.questions[3].frame)
    })

  it.each(INTERVIEW_SETS.map(s => [s.id, s] as const))(
    '%s carries a usable scenario premise', (_id, set) => {
      // ETS delivers the scenario aurally and in print. A one-clause stub
      // gives the student nothing to anchor four answers to.
      expect(set.premise.length).toBeGreaterThan(80)
      expect(set.questions.every(q => q.text.trim().length > 30)).toBe(true)
      // The spec bans yes/no PHRASING, meaning a question a student can
      // discharge with one word. Opening on an auxiliary is fine — "Some
      // students say X. Do you agree?" is a standard ETS stem — provided
      // the question also demands elaboration somewhere.
      const bareYesNo = set.questions.filter(q =>
        /^(is|are|do|does|did|have|has|can|will|would|should)\b/i.test(q.text.trim())
        && !/\b(why|what|how|which|explain|describe|reason|support|defend)\b/i.test(q.text))
      expect(bareYesNo.map(q => q.text)).toEqual([])
    })

  it('uses unique slugs — a reused id would collide passage_group_id', () => {
    const ids = INTERVIEW_SETS.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('never repeats a question across sets', () => {
    const all = INTERVIEW_SETS.flatMap(s => s.questions.map(q => q.text))
    expect(new Set(all).size).toBe(all.length)
  })

  it('keeps different sets on genuinely different subjects', () => {
    // This is the check that the shipped bank would have failed: it held
    // several near-identical "group projects" and "banning devices" items.
    const worst: Array<[string, string, number]> = []
    for (let i = 0; i < INTERVIEW_SETS.length; i++) {
      for (let j = i + 1; j < INTERVIEW_SETS.length; j++) {
        for (const a of INTERVIEW_SETS[i]!.questions) {
          for (const b of INTERVIEW_SETS[j]!.questions) {
            const o = overlap(a.text, b.text)
            if (o > 0.4) worst.push([a.text, b.text, o])
          }
        }
      }
    }
    expect(worst).toEqual([])
  })

  it.each([[3], [4]] as const)('spreads rung-%i phrasing across frames', (rung) => {
    const frames = rung === 3 ? RUNG3_FRAMES.length : RUNG4_FRAMES.length
    const limit = cap(INTERVIEW_SETS.length, frames)
    for (const [frame, n] of frameCounts(INTERVIEW_SETS, rung)) {
      expect({ frame, n }).toEqual({ frame, n: expect.any(Number) })
      expect(n).toBeLessThanOrEqual(limit)
    }
  })

  it('would reject the distribution that actually shipped', () => {
    // Guards the guard. A spread check that cannot fail on the real
    // historical data is decoration — 7 of 12 items on one frame is the
    // convergence this is meant to catch.
    const shipped = new Map<string, number>([['agree_with_claim', 7], ['rank_two_goods', 5]])
    const limit = cap(12, RUNG3_FRAMES.length)
    const offenders = [...shipped].filter(([, n]) => n > limit).map(([f]) => f)
    expect(offenders).toEqual(['agree_with_claim', 'rank_two_goods'])
  })
})
