/*
 * The TOEFL Speaking/Writing warmup cap.
 *
 * These stops exist so a student's first Speaking activity is not the
 * full section. They carry questionCount: 2 — and for a while that
 * number went nowhere: the assemble route forwarded `count` only on the
 * SAT branch, and assembleToeflFromBank had no equivalent parameter. A
 * "2-task warmup" assembled the entire section, silently, and the path
 * test that was supposed to cover this only asserted the LAUNCH MODE.
 *
 * A value that looks configured but is dropped on the floor is the
 * failure mode this file exists to prevent, so the test is about the
 * COUNT, not about the plumbing.
 */
import { PATHS } from '@/lib/study-path'
/*
 * The REAL function, not a copy of the rule. The first version of this
 * file reimplemented the cap locally and stayed green with the
 * production cap switched off — which is the whole failure this suite
 * is supposed to catch.
 */
import { capWarmupItems as applyCap } from '@/lib/study/toefl-warmup'

const full = Array.from({ length: 20 }, (_, i) => i)

describe('TOEFL warmup cap', () => {
  it('shortens a Speaking or Writing run to the requested count', () => {
    expect(applyCap(full, 'speaking', 2)).toHaveLength(2)
    expect(applyCap(full, 'writing', 2)).toHaveLength(2)
  })

  it('REFUSES to cap Reading or Listening', () => {
    /*
     * Those sections draw whole passage sets. Truncating mid-set shows
     * a student a passage and then hides half its questions, which is a
     * worse defect than a long warmup.
     */
    expect(applyCap(full, 'reading', 2)).toHaveLength(20)
    expect(applyCap(full, 'listening', 2)).toHaveLength(20)
  })

  it('leaves a full section alone when no cap is asked for', () => {
    expect(applyCap(full, 'speaking')).toHaveLength(20)
  })

  it('every Speaking/Writing drill actually carries a count', () => {
    /*
     * The node-side half of the contract. Without questionCount the
     * route sends no `count`, no cap is applied, and the warmup
     * silently becomes the full section again — which is exactly the
     * bug, reintroduced.
     */
    const warmups = PATHS
      .filter(p => p.id === 'toefl-speaking' || p.id === 'toefl-writing')
      .flatMap(p => p.nodes.filter(n => n.kind === 'practice'))

    // One drill per question type — 2 Speaking, 3 Writing today. The
    // assertion is that EVERY one is capped, not that there are N.
    expect(warmups.length).toBeGreaterThanOrEqual(2)
    for (const n of warmups) {
      expect(n.questionCount).toBeGreaterThan(0)
      // ...and it must be genuinely shorter than the section it warms
      // up for, or it is not a warmup.
      expect(n.questionCount!).toBeLessThan(6)
    }
  })
})
