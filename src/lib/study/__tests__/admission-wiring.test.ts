/** @jest-environment node */
/**
 * The three maps SSAT/ISEE assembly depends on, and the one distinction
 * that makes them tricky.
 *
 * SSAT delivers TWO quantitative blocks that both draw from bank section
 * 'math'; ISEE does the same with Quantitative Reasoning and Mathematics
 * Achievement. So a request's `section` is a BLOCK KEY, while the bank
 * query and the coverage gate need a BANK SECTION. Conflating them would
 * attribute both SSAT quant sittings to one topic, charge them once, and
 * size the exhaustion gate against the wrong pool.
 */
import { ADMISSION_BLUEPRINT, type AdmissionFamily } from '../admission-tests'
import { SECTION_TOPIC } from '../section-topics'
import { creditCostForTest } from '../plans'
import { SHIPPED_TEST_FAMILIES, SHIPPED_TEST_SLUGS, isShippedTestFamily } from '../shipped-tests'
import { readFileSync } from 'fs'
import { join } from 'path'

const FAMILIES: AdmissionFamily[] = ['ssat', 'isee']

describe('every blueprint block can be routed', () => {
  // Reversion: drop one key from SECTION_TOPIC.ssat. The session insert
  // would then write topic_id undefined and fail at the DB, but only for
  // the student who picked that section.
  it('has a topic id for every block, including unscored ones', () => {
    for (const fam of FAMILIES) {
      for (const b of ADMISSION_BLUEPRINT[fam]) {
        expect(SECTION_TOPIC[fam]?.[b.key]).toMatch(/^[0-9a-f-]{36}$/)
      }
    }
  })

  it('maps the two same-bank-section ISEE blocks to DIFFERENT topics', () => {
    // The whole reason these maps are keyed by block rather than section.
    // SSAT no longer has such a pair: its two quantitative sections are
    // served as ONE 50-question math block (co-founder, 2026-09-02).
    expect(SECTION_TOPIC.isee!.quant).not.toBe(SECTION_TOPIC.isee!.mathach)
    const isee = ADMISSION_BLUEPRINT.isee
    expect(isee.find(b => b.key === 'quant')!.bankSection)
      .toBe(isee.find(b => b.key === 'mathach')!.bankSection)
  })

  it('SSAT serves exactly one math block, of both quantitative sections combined', () => {
    const math = ADMISSION_BLUEPRINT.ssat.filter(b => b.bankSection === 'math')
    expect(math).toHaveLength(1)
    expect(math[0]!.key).toBe('math')
    expect(math[0]!.questions).toBe(50)   // 25 + 25
    expect(math[0]!.minutes).toBe(60)     // 30 + 30
  })

  it('gives every topic id a distinct row', () => {
    for (const fam of FAMILIES) {
      const ids = ADMISSION_BLUEPRINT[fam].map(b => SECTION_TOPIC[fam]![b.key])
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
})

describe('credits are priced per block', () => {
  /*
   * This assertion reads the SOURCE, not the function, and the first
   * version of it was worthless because of that distinction.
   *
   * creditCostForTest falls back to 1 for any unlisted key. Since the
   * short SSAT quant blocks are PRICED at 1, a map wrongly keyed by bank
   * section ('math' instead of 'quant1'/'quant2') returns exactly the
   * same numbers through the function. Break-testing caught it: keying
   * by bank section left all 11 tests green. Nothing observable through
   * the API distinguishes "priced 1" from "unlisted, defaulted to 1", so
   * the only way to pin it is to check the literal.
   */
  const plansSrc = readFileSync(join(process.cwd(), 'src/lib/study/plans.ts'), 'utf8')

  it('lists every scored block key explicitly in SECTION_CREDIT_COST', () => {
    const table = plansSrc.slice(plansSrc.indexOf('const SECTION_CREDIT_COST'))
    for (const fam of FAMILIES) {
      const row = table.slice(table.indexOf(`${fam}: {`))
      const literal = row.slice(0, row.indexOf('}'))
      for (const b of ADMISSION_BLUEPRINT[fam].filter(x => x.scored)) {
        expect(literal).toContain(`${b.key}:`)
      }
    }
  })

  it('returns a sane price for every scored block', () => {
    for (const fam of FAMILIES) {
      for (const b of ADMISSION_BLUEPRINT[fam].filter(x => x.scored)) {
        const cost = creditCostForTest(fam, b.key)
        // Lower bound is 2, not 1, since the 2026-09-04 reprice. That
        // matters: 1 is the FALLBACK, so a scored block priced 1 is
        // almost certainly a key that fell through rather than a price
        // anyone chose. This bound is what turns that silent
        // undercharge into a test failure.
        expect(cost).toBeGreaterThanOrEqual(2)
        expect(cost).toBeLessThanOrEqual(3)
      }
    }
  })

  it('prices as Andy set on 2026-09-04', () => {
    // The whole table, pinned to the instruction rather than to a rule,
    // because this reprice follows no rule: it is not the length rule
    // that priced SAT/TOEFL/ACT before, and it discards the co-founder's
    // 2026-09-02 SSAT/ISEE table. Only the literals can pin it.
    expect(creditCostForTest('sat', 'reading_writing')).toBe(3)
    expect(creditCostForTest('sat', 'math')).toBe(3)

    // TOEFL is the ONLY family that splits, so it is the only place a
    // "price the whole family alike" edit would silently pass.
    expect(creditCostForTest('toefl', 'reading')).toBe(2)
    expect(creditCostForTest('toefl', 'writing')).toBe(2)
    expect(creditCostForTest('toefl', 'speaking')).toBe(3)
    expect(creditCostForTest('toefl', 'listening')).toBe(3)

    for (const b of ADMISSION_BLUEPRINT.ssat) expect(creditCostForTest('ssat', b.key)).toBe(2)
    for (const b of ADMISSION_BLUEPRINT.isee) expect(creditCostForTest('isee', b.key)).toBe(2)
    for (const k of ['english', 'math', 'reading', 'science', 'writing']) {
      expect(creditCostForTest('act', k)).toBe(3)
    }
  })

  it('lists the unscored blocks explicitly too, so 1 is a price and not a fallback', () => {
    const table = plansSrc.slice(plansSrc.indexOf('const SECTION_CREDIT_COST'))
    expect(table.slice(table.indexOf('ssat: {'), table.indexOf('}', table.indexOf('ssat: {')))).toContain('writing:')
    expect(table.slice(table.indexOf('isee: {'), table.indexOf('}', table.indexOf('isee: {')))).toContain('essay:')
  })

  it('does not accidentally price a bank section that is not a block key', () => {
    // For ISEE, 'math' is a bank section, never a request section.
    // Since the reprice this is a sharper test than it was: every real
    // ISEE block costs 2, so the fallback value 1 can no longer be
    // confused with a genuine price.
    expect(creditCostForTest('isee', 'math')).toBe(1)  // falls back
    expect(ADMISSION_BLUEPRINT.isee.some(b => b.key === 'math')).toBe(false)
  })
})

describe('shipped gate', () => {
  it('lists both families and both slugs', () => {
    for (const fam of FAMILIES) {
      expect(SHIPPED_TEST_FAMILIES.has(fam)).toBe(true)
      expect(isShippedTestFamily(fam)).toBe(true)
      expect(SHIPPED_TEST_SLUGS.has(`test-${fam}`)).toBe(true)
    }
  })

  it('ships ACT (B7: human sitting 4/40 blind, gate flipped 2026-09-03)', () => {
    expect(isShippedTestFamily('act')).toBe(true)
    expect(SHIPPED_TEST_SLUGS.has('test-act')).toBe(true)
  })

  it('still fails closed for a family with no bank', () => {
    expect(isShippedTestFamily('gre')).toBe(false)
    expect(isShippedTestFamily('ielts')).toBe(false)
  })
})

describe('the route accepts block keys, not bank sections', () => {
  // Mirrors the validation in /api/study/test/assemble: a block key is
  // valid only when it exists AND draws from the bank. The essay blocks
  // are deliberately unroutable here — nothing backs them yet.
  const routable = (fam: AdmissionFamily, key: string) =>
    ADMISSION_BLUEPRINT[fam].some(b => b.key === key && b.bankSection !== null)

  it('accepts every bank-backed block', () => {
    expect(routable('ssat', 'math')).toBe(true)
    expect(routable('ssat', 'reading')).toBe(true)
    expect(routable('isee', 'mathach')).toBe(true)
  })

  /*
   * These WERE unroutable, deliberately: 16 prompts were authored and
   * nothing had inserted them, so routing to the block would have drawn
   * from an empty pool. essay-bank-helper.mjs banked them (4 SSAT pairs,
   * 8 ISEE), so the blocks are now backed and routable.
   *
   * Unscored is not the same as undelivered — both are sent to every
   * school the student applies to.
   */
  it('routes the free-response blocks now that prompts are banked', () => {
    expect(routable('ssat', 'writing')).toBe(true)
    expect(routable('isee', 'essay')).toBe(true)
  })

  it('refuses a bank section passed where a block key belongs', () => {
    expect(routable('isee', 'math')).toBe(false)     // ISEE's math blocks are quant / mathach
    expect(routable('ssat', 'math')).toBe(true)      // SSAT's block IS named math since 2026-09-02
    expect(routable('isee', 'verbal')).toBe(true)   // ISEE's block IS named verbal
    expect(routable('ssat', 'reading_writing')).toBe(false)
  })
})
