/** @jest-environment node */
/**
 * A verbal section must carry the published question types, in the
 * published order.
 *
 * FOUND 2026-09-21 while costing a ten-test bank. Three drawn SSAT verbal
 * sections came out 36/24, 37/23 and 37/23 synonym/analogy, interleaved at
 * random. The published format is thirty synonyms as items 1-30 and thirty
 * analogies as items 31-60 — it is in this repo, in test-specs.ts, and has
 * been the whole time.
 *
 * Nothing failed. The section was 60 questions in 30 minutes, every item
 * was sound, and the count and the clock — the two things anyone checks —
 * were both right. It is the ISEE-reading defect again in a new place: the
 * shape of the section was never the thing being measured.
 *
 * assembleAdmissionSection's own comment said a blueprint here would be
 * "fabricating a spec". That is true of CONTENT domains, which neither
 * test publishes, and false of question types, which both publish exactly.
 */
import { VERBAL_TYPES, verbalKind, drawByPassage } from '../admission-tests'

describe('verbal type mix', () => {
  it('publishes an exact SSAT split and a roughly-even ISEE one', () => {
    expect(VERBAL_TYPES.ssat).toEqual([
      { kind: 'synonym', count: 30 }, { kind: 'analogy', count: 30 },
    ])
    expect(VERBAL_TYPES.isee).toEqual([
      { kind: 'synonym', count: 20 }, { kind: 'sentence completion', count: 20 },
    ])
    // The blocks must sum to the delivered section length.
    expect(VERBAL_TYPES.ssat.reduce((n, b) => n + b.count, 0)).toBe(60)
    expect(VERBAL_TYPES.isee.reduce((n, b) => n + b.count, 0)).toBe(40)
  })

  describe('classifying an item', () => {
    it('reads the published tag', () => {
      expect(verbalKind({ prompt: '[Synonym] FRAGILE' })).toBe('synonym')
      expect(verbalKind({ prompt: '[Analogy] hinge is to door as' })).toBe('analogy')
    })
    it('reads a bare capitalised stem as a synonym', () => {
      // Two live cohorts predate the tags: 52 of 180 SSAT verbal rows.
      expect(verbalKind({ prompt: 'ADEQUATE' })).toBe('synonym')
      expect(verbalKind({ prompt: 'DIGRESS' }, 'synonym')).toBe('synonym')
    })
    it('reads a HYPHEN blank as a sentence completion', () => {
      // Underscores were the first guess and left 35 live ISEE rows
      // unclassified — every one of them a sentence completion.
      expect(verbalKind({ prompt: 'Dr. Alvarez stayed -------, working through her checklist.' }))
        .toBe('sentence completion')
    })
    it('falls back to the task column', () => {
      expect(verbalKind({ prompt: 'something untagged.' }, 'analogy')).toBe('analogy')
      expect(verbalKind({ prompt: 'something untagged.' }, 'sentence_completion'))
        .toBe('sentence completion')
    })
    it('returns null rather than guessing', () => {
      // A caller must be able to COUNT what it cannot classify; silently
      // calling everything a synonym is how the mix drifts back.
      expect(verbalKind({ prompt: 'an ordinary sentence with no cue.' })).toBeNull()
      expect(verbalKind({ prompt: '' })).toBeNull()
    })
  })

  it('draws each type to its published count from a mixed pool', () => {
    // Shaped like the live SSAT bank: more synonyms than analogies, so a
    // single undifferentiated draw over-serves synonyms — which is
    // precisely what was happening.
    const pool = [
      ...Array.from({ length: 104 }, (_, i) => ({ id: `s${i}`, passageGroupId: null, prompt: `[Synonym] WORD${i}` })),
      ...Array.from({ length: 76 }, (_, i) => ({ id: `a${i}`, passageGroupId: null, prompt: `[Analogy] x${i} is to y as` })),
    ]
    const out: typeof pool = []
    for (const { kind, count } of VERBAL_TYPES.ssat) {
      const sub = pool.filter(r => verbalKind(r) === kind)
      out.push(...drawByPassage(sub, count, 1))
    }
    expect(out).toHaveLength(60)
    const kinds = out.map(r => verbalKind(r))
    expect(kinds.filter(k => k === 'synonym')).toHaveLength(30)
    expect(kinds.filter(k => k === 'analogy')).toHaveLength(30)
    // Published ORDER: every synonym precedes every analogy.
    expect(kinds.indexOf('analogy')).toBe(30)
    expect(kinds.lastIndexOf('synonym')).toBe(29)
  })

  it('is wired into the draw, and shuffles within blocks not across them', () => {
    const src = require('node:fs').readFileSync(
      require('node:path').join(process.cwd(), 'src/lib/study/assemble.ts'), 'utf8')
    // The split draw exists...
    expect(src).toMatch(/VERBAL_TYPES\[p\.family\]/)
    expect(src).toMatch(/verbalKind\(r\.item, r\.task\)/)
    // ...the task column is actually selected, without which 52 SSAT rows
    // classify as nothing...
    expect(src).toMatch(/passage_group_id, task/)
    // ...and the final shuffle no longer runs across the whole section.
    expect(src).toMatch(/orderedBlocks\s*\n?\s*\?\s*orderedBlocks\.flatMap/)
  })
})
