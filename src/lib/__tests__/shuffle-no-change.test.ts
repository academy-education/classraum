/** @jest-environment node
 *
 * "NO CHANGE" must stay the first option.
 *
 * The ACT prints it first on every edit-in-place item ever published — it is
 * the option meaning "leave the underlined text alone", and it only reads
 * correctly before the alternatives. `shuffleChoices` already carves out GRE
 * quantitative comparison for exactly this reason ("shuffling them reads as
 * broken to anyone who's seen a real GRE") and had no equivalent for this.
 *
 * Measured on 2026-09-12: 110 live ACT English items carry a No Change option,
 * ALL authored at index 0, and every one was dealt a random slot at draw time —
 * so roughly three students in four saw a shape the real exam never prints.
 *
 * The tests below are the ones that would have failed before the fix. The
 * third and fourth exist so the fix cannot be "achieved" by disabling the
 * shuffle: the alternates must still permute, and items without a No Change
 * option must still shuffle all four.
 */
import { shuffleChoices } from '@/lib/test-verify'

type Q = Parameters<typeof shuffleChoices>[0]
const mk = (choices: string[], type = 'multiple_choice'): Q =>
  ({ type, prompt: 'p', choices, correct_answer: choices[1] } as unknown as Q)

const NC = ['No Change', 'alpha', 'beta', 'gamma']

/* Production seeds this with `hashSeed(`${seed}:${r.id}`)` — an FNV hash — not
 * with small sequential integers. That distinction turned out to matter: fed
 * 1..500 the LCG reaches only 4 of the 6 orderings of three items, and my first
 * version of the permutation test below failed for that reason and not because
 * of the pin. Feeding the same shape of seed production does is testing the
 * real thing, not weakening the test — the pin itself holds 500/500 either way. */
const fnv = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }
const SEEDS = Array.from({ length: 500 }, (_, i) => fnv(`draw-seed:item-${i}`))

describe('shuffleChoices — NO CHANGE', () => {
  it('keeps No Change in the first slot across every seed', () => {
    for (const s of SEEDS) expect(shuffleChoices(mk(NC), s).choices[0]).toBe('No Change')
    // and with sequential seeds too, so the pin is not seed-shaped
    for (let s = 1; s <= 500; s++) expect(shuffleChoices(mk(NC), s).choices[0]).toBe('No Change')
  })

  it('still permutes the three alternates, so the anti-tell survives', () => {
    const seen = new Set<string>()
    for (const s of SEEDS) seen.add(shuffleChoices(mk(NC), s).choices.slice(1).join('|'))
    // 3 alternates => 6 orderings; anything less than all of them means the
    // pin was implemented by weakening the shuffle.
    expect(seen.size).toBe(6)
  })

  it('moves No Change to the front even when authored elsewhere', () => {
    const odd = ['alpha', 'beta', 'NO CHANGE', 'gamma']
    for (const s of SEEDS.slice(0, 100)) expect(shuffleChoices(mk(odd), s).choices[0]).toMatch(/^no change$/i)
  })

  it('leaves the key reachable by value', () => {
    for (const s of SEEDS.slice(0, 200)) {
      const q = mk(NC)
      expect(shuffleChoices(q, s).choices).toContain(q.correct_answer)
    }
  })

  it('an item with no No Change option still shuffles all four slots', () => {
    const seen = new Set<string>()
    for (const s of SEEDS) seen.add(shuffleChoices(mk(['w', 'x', 'y', 'z']), s).choices[0])
    expect(seen.size).toBe(4)
  })

  it('does not disturb the GRE quantitative-comparison carve-out', () => {
    const qc = mk(['Quantity A is greater.', 'Quantity B is greater.', 'equal', 'cannot'], 'quant_comparison')
    expect(shuffleChoices(qc, 99).choices).toEqual(qc.choices)
  })
})
