/**
 * The option-length rule must reach the prompt on BOTH spec paths.
 *
 * This test exists because the first attempt at the fix was a no-op. The
 * rule was added to formatBlock() in test-spec-cache.ts, which reads
 * study_test_specs — a table with ZERO rows. loadCachedSpec therefore
 * always returns null, renderTestSpecCached always falls through to
 * renderTestSpec, and the "fix" never ran. It would have looked correct
 * in review, passed tsc, and changed nothing about a single generated
 * item.
 *
 * So the assertion is on the path that actually executes today
 * (renderTestSpec) AND on the one that takes over the moment the refresh
 * cron populates that table (formatBlock). A regression in either is a
 * silent return to 70%-longest keys, and the bank audit that would catch
 * it runs weeks later, after the items are already served.
 *
 * Both modules are pure — test-specs.ts has no runtime imports and
 * test-spec-cache.ts lazy-imports the admin client inside a function —
 * so jest can load them without dragging in the Supabase SDK.
 */
import {
  renderTestSpec,
  OPTION_LENGTH_RULE_EN,
  OPTION_LENGTH_RULE_KO,
  TEST_SPECS,
} from '../test-specs'
import { formatBlock } from '../test-spec-cache'

describe('option-length rule reaches the generator prompt', () => {
  const families = ['sat', 'toefl'] as const

  it.each(families)('renderTestSpec (LIVE path) carries it — %s / en', family => {
    const section = TEST_SPECS[family]!.sections[0]!
    const out = renderTestSpec(family, section.name_en, 'en')
    expect(out).toContain(OPTION_LENGTH_RULE_EN)
  })

  it.each(families)('renderTestSpec (LIVE path) carries it — %s / ko', family => {
    const section = TEST_SPECS[family]!.sections[0]!
    const out = renderTestSpec(family, section.name_ko, 'ko')
    expect(out).toContain(OPTION_LENGTH_RULE_KO)
  })

  it.each(families)('formatBlock (cached path) carries it — %s / en', family => {
    const section = TEST_SPECS[family]!.sections[0]!
    expect(formatBlock(family, section, 'en')).toContain(OPTION_LENGTH_RULE_EN)
  })

  it.each(families)('formatBlock (cached path) carries it — %s / ko', family => {
    const section = TEST_SPECS[family]!.sections[0]!
    expect(formatBlock(family, section, 'ko')).toContain(OPTION_LENGTH_RULE_KO)
  })

  // Every section, not just the first: the rule is appended once in each
  // language branch, so a section that somehow routed around it would be
  // invisible to a spot check on sections[0].
  it('every section of every family carries it', () => {
    const missing: string[] = []
    for (const [family, spec] of Object.entries(TEST_SPECS)) {
      for (const section of spec.sections) {
        const en = renderTestSpec(family as never, section.name_en, 'en')
        const ko = renderTestSpec(family as never, section.name_ko, 'ko')
        if (!en.includes(OPTION_LENGTH_RULE_EN)) missing.push(`${family}/${section.name_en}/en`)
        if (!ko.includes(OPTION_LENGTH_RULE_KO)) missing.push(`${family}/${section.name_en}/ko`)
      }
    }
    expect(missing).toEqual([])
  })

  // The rule is only worth anything if it states the target. A reworded
  // version that drops the quantity would satisfy a naive "is the text
  // present" check while telling the model nothing actionable.
  it('states the actual target, not just a vague instruction', () => {
    expect(OPTION_LENGTH_RULE_EN).toMatch(/quarter|25%/i)
    expect(OPTION_LENGTH_RULE_EN).toMatch(/expand the distractor|never on its brevity/i)
    expect(OPTION_LENGTH_RULE_KO).toMatch(/4분의 1/)
  })
})
