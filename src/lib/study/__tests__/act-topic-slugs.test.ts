/** @jest-environment node */
/**
 * The ACT topic-slug map, checked against the SHAPE of the blueprint
 * rather than a second copy of the same table — and the price the topic
 * page shows pinned to the key the route charges on.
 *
 * Both checks exist because of 2026-09-01: two ISEE sections displayed
 * "1 credit" while the route reserved 2, because the sheet derived its
 * key by title-casing the slug and the route used the blueprint key.
 * Five separate copies of that derivation had to be found by loading the
 * real page. This file makes the ACT version of that bug fail in jest.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ACT_BLUEPRINT, ACT_TOPIC_SLUGS, actSectionForSlug } from '../act-test'
import { creditCostForTest } from '../plans'
import { familyFromTopicSlug } from '../test-result'

describe('every ACT section has exactly one topic slug', () => {
  it('maps every blueprint section, none missing, none doubled', () => {
    for (const s of ACT_BLUEPRINT) {
      const slugs = Object.entries(ACT_TOPIC_SLUGS).filter(([, k]) => k === s.key).map(([slug]) => slug)
      expect(`${s.key}: ${slugs.join(',')}`).toBe(`${s.key}: act-${s.key}`)
    }
  })

  it('maps no key the blueprint does not define', () => {
    for (const [slug, key] of Object.entries(ACT_TOPIC_SLUGS)) {
      expect(ACT_BLUEPRINT.some(s => s.key === key) ? '' : `${slug} -> ${key}`).toBe('')
    }
  })

  it('resolves a slug to the section carrying the right counts', () => {
    const r = actSectionForSlug('act-reading')
    expect(r?.key).toBe('reading')
    expect(r?.questions).toBe(36)
    expect(r?.bankSection).toBe('reading')
  })

  it('refuses the parent slug and anything unknown', () => {
    expect(actSectionForSlug('test-act')).toBeNull()
    expect(actSectionForSlug('act')).toBeNull()
    expect(actSectionForSlug('sat-math')).toBeNull()
    expect(actSectionForSlug('')).toBeNull()
  })
})

describe('act- slugs route to the act family for scoring', () => {
  it.each(Object.keys(ACT_TOPIC_SLUGS))('%s -> act', slug => {
    expect(familyFromTopicSlug(slug)).toBe('act')
  })

  it('does not swallow sat- or ssat- and is not swallowed by them', () => {
    expect(familyFromTopicSlug('act-math')).toBe('act')
    expect(familyFromTopicSlug('sat-math')).toBe('sat')
    expect(familyFromTopicSlug('ssat-reading')).toBe('ssat')
    // NOT asserted: familyFromTopicSlug('test-act'). The parent slug is a
    // landing card, never a scored session, and no family routes its
    // parent - test-sat and test-ssat return 'other' too. The first draft
    // of this test asserted otherwise and failed on a clean tree.
  })
})

describe('the price shown is the price charged', () => {
  const sheet = readFileSync(
    join(process.cwd(), 'src/app/mobile/study/topic/[slug]/page.tsx'), 'utf8')

  it('the topic page prices ACT through the slug map, by blueprint key', () => {
    // The ONE helper, one more branch — not a sixth inline derivation.
    expect(sheet).toMatch(
      /const act = actSectionForSlug\(slugNow\)\s*\n\s*if \(act\) return creditCostForTest\('act', act\.key\)/)
  })

  it('still derives the price in exactly one place', () => {
    // Guard carried over from the ISEE fix: count real calls, not comments.
    const calls = sheet.split('\n')
      .filter(l => !l.trim().startsWith('*') && !l.trim().startsWith('//'))
      .filter(l => l.includes('creditCostForTest(')).length
    // admission branch, act branch, generic fallback — all inside bankCreditCost
    expect(calls).toBe(3)
  })

  it('prices every scored section above zero and consistently', () => {
    for (const s of ACT_BLUEPRINT.filter(b => b.scored)) {
      expect(creditCostForTest('act', s.key)).toBeGreaterThan(0)
    }
  })

  it('starts ACT on the bank path, not the AI customization sheet', () => {
    // The silent dead end from 2026-09-01: a family missing from this
    // gate got the sheet, which has no spec for it, so Start did nothing.
    expect(sheet).toMatch(/fam === 'sat' \|\| fam === 'ssat' \|\| fam === 'isee' \|\| fam === 'act'/)
  })

  it('sends only the block key over the wire, never a bank section', () => {
    // The route derives bankSection from the blueprint and ignores the
    // client; sending it would falsely imply the client picks the pool.
    const start = sheet.slice(sheet.indexOf('const startActSection'), sheet.indexOf('const startBankTest'))
    expect(start).toMatch(/family: 'act', section: section\.key, adaptive: false/)
    expect(start).not.toMatch(/bankSection/)
  })
})
