/** @jest-environment node */
/**
 * The topic slug -> blueprint mapping, checked against the SHAPE of the
 * blueprint rather than a second copy of the same table — a test that
 * restates the map would pass no matter how wrong the map was.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  ADMISSION_BLUEPRINT, ADMISSION_TOPIC_SLUGS,
  admissionSectionForSlug, admissionFormTotals,
} from '../admission-tests'
import { creditCostForTest } from '../plans'

describe('every startable admission section has exactly one topic slug', () => {
  it('maps every blueprint section, none missing', () => {
    for (const [family, sections] of Object.entries(ADMISSION_BLUEPRINT)) {
      for (const s of sections) {
        const slugs = Object.entries(ADMISSION_TOPIC_SLUGS)
          .filter(([, v]) => v.family === family && v.key === s.key)
          .map(([k]) => k)
        expect(slugs).toHaveLength(1)   // exactly one, so no section is unreachable or double-mapped
      }
    }
  })

  it('maps no key the blueprint does not define', () => {
    for (const [slug, { family, key }] of Object.entries(ADMISSION_TOPIC_SLUGS)) {
      const found = ADMISSION_BLUEPRINT[family].some(s => s.key === key)
      expect(found ? '' : `${slug} -> ${family}/${key}`).toBe('')
    }
  })

  it('resolves a slug to the section carrying the right counts', () => {
    const r = admissionSectionForSlug('ssat-math')
    expect(r?.family).toBe('ssat')
    expect(r?.section.key).toBe('math')
    expect(r?.section.questions).toBe(50)
    expect(r?.section.bankSection).toBe('math')
  })

  it('no longer resolves the two retired quantitative slugs', () => {
    // ssat-quant-1 was RENAMED to ssat-math and ssat-quant-2 deleted on
    // 2026-09-02; a stale deep link must not open the AI sheet or a
    // half-length block.
    expect(admissionSectionForSlug('ssat-quant-1')).toBeNull()
    expect(admissionSectionForSlug('ssat-quant-2')).toBeNull()
  })

  it('refuses ssat-experimental, which has no blueprint section (and, since 2026-09-02, no topic row)', () => {
    // Unscored on the real exam and deliberately excluded. A student who
    // deep-links here must not be given 15 minutes of questions that do
    // not count.
    expect(admissionSectionForSlug('ssat-experimental')).toBeNull()
    expect(ADMISSION_BLUEPRINT.ssat.some(s => s.key === 'experimental')).toBe(false)
  })

  it('refuses the parent slugs and anything unknown', () => {
    expect(admissionSectionForSlug('test-ssat')).toBeNull()
    expect(admissionSectionForSlug('test-isee')).toBeNull()
    expect(admissionSectionForSlug('sat-math')).toBeNull()
    expect(admissionSectionForSlug('')).toBeNull()
  })
})

describe('form totals are derived, not typed', () => {
  it('matches the blueprint sum', () => {
    for (const [family, sections] of Object.entries(ADMISSION_BLUEPRINT)) {
      const t = admissionFormTotals(family as 'ssat' | 'isee')
      expect(t.questions).toBe(sections.reduce((n, s) => n + s.questions, 0))
      expect(t.minutes).toBe(sections.reduce((n, s) => n + s.minutes, 0))
    }
  })

  it('reports the real figures, not the ones I guessed', () => {
    // I said "150 Q / 2h 35m" and "160 Q / 2h 20m" from memory before
    // computing them. Both were wrong. Pinned so the card cannot inherit
    // a guess.
    expect(admissionFormTotals('ssat')).toEqual({ questions: 151, minutes: 155 })
    expect(admissionFormTotals('isee')).toEqual({ questions: 161, minutes: 160 })
  })
})

describe('the client cannot choose which pool a block draws from', () => {
  /*
   * The assemble route derives bankSection from ADMISSION_BLUEPRINT by
   * block key and ignores any bankSection in the request body. If it
   * ever started trusting the client, a caller could draw reading items
   * into a maths block — a scored section filled from the wrong pool.
   * Pinned at the source because it is a property of the route's shape,
   * not of any one response.
   */
  const route = readFileSync(
    join(process.cwd(), 'src/app/api/study/test/assemble/route.ts'), 'utf8')

  it('never reads bankSection off the request body', () => {
    expect(route).not.toMatch(/body\.bankSection/)
  })

  it('looks the block up in the blueprint by key', () => {
    // The cast on `family` is allowed: the invariant is "looked up in the
    // blueprint by key", and a widened family union (ACT joined it on
    // 2026-09-02) needs the narrowing without changing the lookup.
    expect(route).toMatch(/ADMISSION_BLUEPRINT\[family(?: as [^\]]+)?\]\.find\(b => b\.key === body\.section/)
  })

  it('refuses a block that draws from no bank pool', () => {
    // `b.bankSection !== null` in the same find: an essay block has no
    // pool, so it must not resolve to a drawable section.
    expect(route).toMatch(/b\.bankSection !== null/)
  })
})

describe('the price shown is the price charged', () => {
  /*
   * The assemble route charges creditCostForTest(family, block.key). The
   * topic sheet used to derive its own key by title-casing the slug and
   * lowercasing it back, which for two ISEE sections produced a string
   * that is not in SECTION_CREDIT_COST at all:
   *
   *     isee-quant-reasoning  -> "quant_reasoning"   route: "quant"
   *     isee-math-achievement -> "math_achievement"  route: "mathach"
   *
   * Both fell through to the `?? 1` default, so the sheet said 1 credit
   * and the route reserved 2. This test computes the sheet's key the way
   * the OLD code did and asserts it would disagree — so it fails if
   * anyone reintroduces slug-derived pricing — and asserts the new path
   * agrees with the route's.
   */
  const titleCased = (slug: string) => {
    const fam = slug.split('-')[0]
    return slug.slice(fam.length + 1).split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      .toLowerCase().replace(/\s+/g, '_')
  }

  /* My first version of this test computed both sides with the SAME
     expression and asserted they matched — it could not fail. The two
     sides live in two files, so the only honest check is that both files
     pass a blueprint block key. */
  it('derives the price in exactly ONE place on the topic page', () => {
    /*
     * There were FIVE. bankCreditCost() did it once for the balance
     * check — the copy I fixed first — while the card LABEL, the credit
     * confirmation sheet and the no-credits sheet each re-derived the
     * key inline from the slug. So the fix went in and the page still
     * displayed "1 credit" for an ISEE section the route charges 2 for.
     * Found only by loading the real page; the source pin below passed
     * throughout, because it checked the copy I had already fixed.
     */
    const sheet = readFileSync(
      join(process.cwd(), 'src/app/mobile/study/topic/[slug]/page.tsx'), 'utf8')
    // Count real calls only — a doc comment above bankCreditCost names
    // the function too, and counting that made this assertion wrong on
    // its first run (expected 2, file had 3).
    const calls = sheet.split('\n')
      .filter(l => !l.trim().startsWith('*') && !l.trim().startsWith('//'))
      .filter(l => l.includes('creditCostForTest(')).length
    // ALL inside bankCreditCost: the admission branch, the ACT branch and
    // the generic fallback. Adding a family adds one call HERE and nowhere
    // else - that is the invariant; the number is its current value, and
    // act-topic-slugs.test.ts pins the same 3 so the two cannot drift.
    expect(calls).toBe(3)
    expect(sheet).not.toMatch(/cost=\{\(\(\) => \{/)
  })

  it('has both sides passing a blueprint block key, not a derived string', () => {
    const sheet = readFileSync(
      join(process.cwd(), 'src/app/mobile/study/topic/[slug]/page.tsx'), 'utf8')
    const route = readFileSync(
      join(process.cwd(), 'src/app/api/study/test/assemble/route.ts'), 'utf8')

    // the sheet resolves the slug through the mapping before pricing
    expect(sheet).toMatch(
      /const admission = admissionSectionForSlug\(slugNow\)\s*\n\s*if \(admission\) return creditCostForTest\(admission\.family, admission\.section\.key\)/)
    // the route prices the same block key it validated
    expect(route).toMatch(/creditCostForTest\(family, section\)/)
    expect(route).toMatch(/\? \(block \? block\.key : null\)/)
  })

  it('the old derivation still produces the WRONG KEY for two ISEE slugs', () => {
    // The original bug: title-casing the slug as the section key. Since the
    // 2026-09-02 repricing every ISEE block costs 1, so the wrong key now
    // happens to PRICE the same as the right one - which is exactly how a
    // bug goes quiet. So this pins the key mismatch itself, not the price:
    // if someone reintroduces the derivation, these two slugs resolve to
    // keys the blueprint does not define, and the source-regex test above
    // is what keeps the derivation out of the page.
    const wrongKey = Object.keys(ADMISSION_TOPIC_SLUGS).filter(slug =>
      titleCased(slug) !== admissionSectionForSlug(slug)!.section.key)
    expect(wrongKey.sort()).toEqual(['isee-math-achievement', 'isee-quant-reasoning'])
    for (const slug of wrongKey) {
      const fam = admissionSectionForSlug(slug)!.family
      expect(ADMISSION_BLUEPRINT[fam].some(b => b.key === titleCased(slug))).toBe(false)
    }
  })

  it('prices every scored, drawable block above zero', () => {
    for (const slug of Object.keys(ADMISSION_TOPIC_SLUGS)) {
      const a = admissionSectionForSlug(slug)!
      expect(creditCostForTest(a.family, a.section.key)).toBeGreaterThan(0)
    }
  })
})
