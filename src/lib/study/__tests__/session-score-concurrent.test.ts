/**
 * Concurrent graders against the final-score write.
 *
 * Simulates the real writers of one TOEFL Writing section — submit (plain
 * write of the key-matched percent, then a recompute), two graders each
 * committing a band then recomputing, and a REGRADE of one task — with a
 * seeded random yield around every store operation, so the operations of
 * all actors interleave differently on each seed. After everyone settles
 * the stored score must equal the score of the final data, every time.
 *
 * The random runs prove liveness (the final score is always written —
 * the 7bcdc97c/d2befc83 symptom). Staleness needs one specific schedule,
 * so it is pinned by a deterministic gated test below. Break-tested:
 * writing without the compare-and-set, or reading the current score
 * AFTER loading the inputs, fails the gated test.
 */
import {
  recomputeSessionScoreWith, type SessionScoreStore, type StoredAttempt,
} from '../session-score-recompute'
import { decideRubricSessionScore } from '../session-score-decision'
import type { ScorableItem } from '../toefl-section-score'

const repeat = (e: string, a: string) => ({ score: e === a ? 5 : 0 })

function rng(seed: number) {
  let x = seed >>> 0 || 1
  return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296 }
}

const ATTEMPTS: StoredAttempt[] = [
  ...Array.from({ length: 10 }, (_, i) => ({
    question: { type: 'arrange_words', prompt: `[Build] ${i}`, correct_answer: 'a | b' },
    student_answer: 'a | b', is_correct: i < 6,
  })),
  { question: { type: 'writing_email', prompt: 'email' }, student_answer: 'my reply', is_correct: null },
  { question: { type: 'writing_discussion', prompt: 'disc' }, student_answer: 'my post', is_correct: null },
]

function makeWorld(seed: number) {
  const rand = rng(seed)
  const db = { score: null as number | null, attempts: [] as StoredAttempt[], bands: new Map<string, number>() }
  const yieldSome = async () => { const n = Math.floor(rand() * 25); for (let i = 0; i < n; i++) await Promise.resolve() }
  const store: SessionScoreStore = {
    async readScore() { await yieldSome(); const s = db.score; await yieldSome(); return { found: true, score: s } },
    async loadAttempts() { await yieldSome(); const r = [...db.attempts]; await yieldSome(); return { rows: r } },
    async loadBands() { await yieldSome(); const b = new Map(db.bands); await yieldSome(); return b },
    async compareAndSetScore(_id, expected, next) {
      await yieldSome()
      // Atomic, like UPDATE ... WHERE score = expected.
      const ok = db.score === expected
      if (ok) db.score = next
      await yieldSome()
      return { applied: ok }
    },
  }
  const finalScore = () => {
    const items: ScorableItem[] = db.attempts.map(a => {
      const q = a.question as { type: string; prompt: string; correct_answer?: string }
      return { type: q.type, expectedText: q.correct_answer ?? null, studentAnswer: a.student_answer,
        correct: !!a.is_correct, rubricBand: db.bands.get(q.prompt) ?? null }
    })
    return decideRubricSessionScore(items, 'writing', repeat).score
  }
  return { db, store, yieldSome, finalScore }
}

async function runSeed(seed: number, regrade: boolean) {
  const w = makeWorld(seed)
  const recompute = () => recomputeSessionScoreWith(w.store, 's', repeat)
  const submit = async () => {
    await w.yieldSome()
    w.db.attempts = ATTEMPTS
    await w.yieldSome()
    w.db.score = 60 // submit's plain write of the key-matched percent (6/10)
    await recompute()
  }
  const grade = async (prompt: string, band: number) => {
    await w.yieldSome()
    w.db.bands.set(prompt, band) // the grade commits BEFORE its recompute
    await recompute()
  }
  const actors = [submit(), grade('email', 3), grade('disc', 3)]
  if (regrade) actors.push((async () => { for (let i = 0; i < 4; i++) await w.yieldSome(); await grade('email', 5) })())
  await Promise.all(actors)
  return { stored: w.db.score, expected: w.finalScore() }
}

describe('final-score write under concurrent graders', () => {
  it('two graders and submit, any interleaving: the final score is always written', async () => {
    for (let seed = 1; seed <= 1000; seed++) {
      const { stored, expected } = await runSeed(seed, false)
      expect(expected).not.toBeNull()
      if (stored !== expected) throw new Error(`seed ${seed}: stored ${stored}, expected ${expected}`)
    }
  })

  it('with a regrade racing them, the stored score reflects the latest grade', async () => {
    for (let seed = 1; seed <= 1000; seed++) {
      const { stored, expected } = await runSeed(seed, true)
      if (stored !== expected) throw new Error(`seed ${seed}: stored ${stored}, expected ${expected}`)
    }
  })

  it('a recompute that loaded its inputs before a regrade cannot publish them after it', async () => {
    const w = makeWorld(1)
    w.db.attempts = ATTEMPTS
    w.db.bands.set('email', 4)
    w.db.bands.set('disc', 3)
    w.db.score = 60 // submit's percent; R1 will want to replace it
    // R1 pauses at whatever store call follows its band load.
    let release!: () => void
    const gate = new Promise<void>(r => { release = r })
    let loaded = false, gated = false
    const pause = async () => { if (loaded && !gated) { gated = true; await gate } }
    const slow: SessionScoreStore = {
      readScore: async id => { await pause(); return w.store.readScore(id) },
      loadAttempts: async id => { await pause(); return w.store.loadAttempts(id) },
      loadBands: async id => { const b = await w.store.loadBands(id); loaded = true; return b },
      compareAndSetScore: async (id, e, n) => { await pause(); return w.store.compareAndSetScore(id, e, n) },
    }
    const r1 = recomputeSessionScoreWith(slow, 's', repeat)
    for (let i = 0; i < 10_000 && !gated; i++) await Promise.resolve()
    expect(gated).toBe(true)
    w.db.bands.set('email', 5) // regrade commits
    await recomputeSessionScoreWith(w.store, 's', repeat)
    const fresh = w.finalScore()
    expect(w.db.score).toBe(fresh)
    release()
    await r1
    expect(w.db.score).toBe(fresh)
  })

  it('a blank discussion counts 0 and does not hold the write', async () => {
    const w = makeWorld(7)
    w.db.attempts = ATTEMPTS.map(a =>
      (a.question as { type: string }).type === 'writing_discussion' ? { ...a, student_answer: '' } : a)
    w.db.score = 60
    w.db.bands.set('email', 5)
    const r = await recomputeSessionScoreWith(w.store, 's', repeat)
    // 6/10 x .20 + 5/5 x .35 + 0/5 x .45
    expect(r).toMatchObject({ updated: true, score: 47 })
    expect(w.db.score).toBe(47)
  })
})
