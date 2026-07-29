import { CRITERION_GLOSSARY, glossFor } from '@/lib/study/criterionGlossary'
import { RUBRICS, RUBRIC_VARIANTS } from '@/lib/study/responseRubrics'

/**
 * Every criterion key any rubric can emit — from BOTH sources.
 *
 * RUBRICS holds the per-skill defaults; RUBRIC_VARIANTS holds the
 * per-task overrides (Write an Email, Listen and Repeat) and is where
 * task_fulfillment, social_conventions and the repetition criteria
 * actually live. Reading only RUBRICS made this suite pass while
 * covering half the criteria — the orphan check is what exposed it,
 * by flagging real keys as unused.
 */
const rubricKeys = new Set(
  [...Object.values(RUBRICS), ...Object.values(RUBRIC_VARIANTS)]
    .flatMap(r => r.criteria.map(c => c.key)),
)

describe('criterion glossary covers the rubrics', () => {
  it('explains every criterion a rubric can produce', () => {
    // A criterion with no gloss reaches the student as a bare
    // snake_case string with no explanation. This test is the reason
    // adding one to responseRubrics cannot silently do that.
    const missing = [...rubricKeys].filter(k => !CRITERION_GLOSSARY[k])
    expect(missing).toEqual([])
  })

  it('has no gloss for a criterion no rubric emits', () => {
    // Dead entries drift: they read as maintained and are not, and the
    // first person to reuse the key gets a stale explanation.
    const orphans = Object.keys(CRITERION_GLOSSARY).filter(k => !rubricKeys.has(k))
    expect(orphans).toEqual([])
  })

  it('says what it measures AND what raises it, for every entry', () => {
    // "Delivery: your delivery" is not an explanation. Both fields have
    // to carry content or the card is longer without being clearer.
    for (const [key, g] of Object.entries(CRITERION_GLOSSARY)) {
      expect(g.short.length).toBeGreaterThan(2)
      expect(g.what.length).toBeGreaterThan(25)
      expect(g.raise.length).toBeGreaterThan(25)
      // The advice must not merely restate what the criterion measures.
      // (`short` matching the key is fine and often correct — "Delivery"
      // is the right short name for `delivery`.)
      expect(g.raise.toLowerCase()).not.toBe(g.what.toLowerCase())
      expect(key).toBeTruthy()
    }
  })
})

describe('glossFor', () => {
  it('returns null for an unknown key rather than an empty shell', () => {
    expect(glossFor('not_a_criterion')).toBeNull()
  })

  it('finds a real one', () => {
    expect(glossFor('delivery')?.short).toBe('Delivery')
  })
})
