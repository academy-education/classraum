/**
 * Every native purchase CTA hands off through ONE url builder, and it
 * used to emit `?plan=` for all three kinds. So tapping a credit pack
 * sent `pack5_v2` to be looked up in STUDY_PLANS, missed, and rendered
 * "알 수 없는 플랜이에요"; a 3-month exam pass did the same and read as a
 * subscription. Both reported by Andy minutes after the first deploy.
 *
 * The display bug was the harmless half. Passes and packs are ONE-TIME
 * payments — had the lookup succeeded, the page would have registered a
 * recurring card for something that never renews.
 *
 * So assert the kind survives the round trip, and that one-time items
 * are never described as recurring.
 */
import { resolveItem } from '../pay-item'
import { STUDY_PLANS, STUDY_PASSES, CREDIT_PACKS } from '../plans'

const q = (s: string) => new URLSearchParams(s)

describe('resolveItem', () => {
  it('resolves a plan as recurring', () => {
    const it_ = resolveItem(q('plan=premium_plus_v1'), true)
    expect(it_?.kind).toBe('plan')
    expect(it_?.priceWon).toBe(STUDY_PLANS.premium_plus_v1.priceWon)
    expect(it_?.period).not.toMatch(/1회/)
  })

  it('resolves EVERY real pass as one-time, never as a subscription', () => {
    for (const p of STUDY_PASSES) {
      const it_ = resolveItem(q(`pass=${p.id}`), true)
      expect(it_).not.toBeNull()
      expect(it_?.kind).toBe('pass')
      expect(it_?.priceWon).toBe(p.priceWon)
      expect(it_?.period).toBe('1회 결제')
    }
  })

  it('resolves EVERY real pack as one-time', () => {
    for (const c of CREDIT_PACKS) {
      const it_ = resolveItem(q(`pack=${c.id}`), true)
      expect(it_).not.toBeNull()
      expect(it_?.kind).toBe('pack')
      expect(it_?.priceWon).toBe(c.priceWon)
      expect(it_?.period).toBe('1회 결제')
    }
  })

  it('REGRESSION: a pack id under ?plan= resolves to nothing', () => {
    // The reported bug, in one line. Before the fix this was the ONLY
    // shape the url builder could produce for a pack.
    expect(resolveItem(q('plan=pack5_v2'), true)).toBeNull()
  })

  it('REGRESSION: a pass id under ?plan= resolves to nothing', () => {
    expect(resolveItem(q('plan=sat_pass_v1'), true)).toBeNull()
  })

  it('an unknown pack id does not fall back to a real pack', () => {
    // resolvePack() returns a DEFAULT rather than null, so without an
    // explicit membership check a typo would silently charge for it.
    expect(resolveItem(q('pack=not_a_pack'), true)).toBeNull()
  })

  it('no params at all resolves to nothing', () => {
    expect(resolveItem(q(''), true)).toBeNull()
  })
})
