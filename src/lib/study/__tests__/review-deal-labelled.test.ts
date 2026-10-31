/**
 * draw-review-run.mjs keeps an error-identification item's options in authored order (its letters are printed in
 * the sentence) and leaves it out of the key-slot deal. isLabelledItem in review-deal.mjs mirrors
 * hasLabelledSegments; this pins the two together and pins the deal.
 */
import { dealSlots, dealSegments, isLabelledItem } from '../../../../scripts/study-bank/review-deal.mjs'
import { hasLabelledSegments } from '../labelled-segments'

const GOOD = {
  passage: 'Yesterday, Ji-woo [A: has bought] a used bicycle [B: from her neighbor] for thirty dollars, and she [C: is going to] paint it [D: herself].',
  choices: ['has bought', 'from her neighbor', 'is going to', 'herself'],
}
const CASES: Array<[string, { passage?: string | null; choices?: unknown[] }]> = [
  ['well formed', GOOD],
  ['choices reordered', { ...GOOD, choices: [GOOD.choices[1], GOOD.choices[0], GOOD.choices[2], GOOD.choices[3]] }],
  ['letters out of order', { ...GOOD, passage: GOOD.passage.replace('[A:', '[X:').replace('[B:', '[A:').replace('[X:', '[B:') }],
  ['marker text differs', { ...GOOD, passage: GOOD.passage.replace('[D: herself]', '[D: himself]') }],
  ['one marker missing', { ...GOOD, passage: GOOD.passage.replace('[D: herself]', 'herself') }],
  ['no passage', { choices: GOOD.choices }],
  ['plain completion item', { passage: 'Yesterday our class ________ a short video.', choices: ['watched', 'watches', 'has watched', 'will watch'] }],
  ['padded marker', { ...GOOD, passage: GOOD.passage.replace('[A: has bought]', '[A:   has bought  ]') }],
  ['object choices', { ...GOOD, choices: GOOD.choices.map(text => ({ text })) }],
]

describe('isLabelledItem mirrors hasLabelledSegments', () => {
  it.each(CASES)('%s', (_name, item) => {
    expect(isLabelledItem(item)).toBe(hasLabelledSegments(item as Parameters<typeof hasLabelledSegments>[0]))
  })
  it('the cases cover both answers', () => {
    const out = CASES.map(([, it]) => isLabelledItem(it))
    expect(out.filter(Boolean).length).toBeGreaterThanOrEqual(2)
    expect(out.filter(x => !x).length).toBeGreaterThanOrEqual(5)
  })
})

describe('dealSlots with fixed rows', () => {
  const rnd = (seed: number) => { let s = seed; return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648 } }
  const shuffle = (r: () => number) => <T,>(a: T[]): T[] => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]] } return b }
  it('fixed rows keep their slot; the other rows are still dealt flat', () => {
    // 12 rows: rows 1, 4, 7 are error-identification items whose authored keys are D, D, C
    const fixed: Array<string | null> = Array(12).fill(null)
    fixed[1] = 'D'; fixed[4] = 'D'; fixed[7] = 'C'
    for (let seed = 1; seed <= 20; seed++) {
      const slots = dealSlots(Array(12).fill(4), dealSegments([12], true), shuffle(rnd(seed)), fixed)
      expect([slots[1], slots[4], slots[7]]).toEqual(['D', 'D', 'C'])
      const rest = slots.filter((_: string, i: number) => !fixed[i])
      expect(rest.length).toBe(9)
      for (const L of ['A', 'B', 'C', 'D']) expect(rest.filter((s: string) => s === L).length).toBeGreaterThanOrEqual(2)
    }
  })
  it('with no fixed rows the deal is unchanged', () => {
    const a = dealSlots(Array(8).fill(4), dealSegments([8], true), shuffle(rnd(3)))
    const b = dealSlots(Array(8).fill(4), dealSegments([8], true), shuffle(rnd(3)), [])
    expect(a).toEqual(b)
  })
})
