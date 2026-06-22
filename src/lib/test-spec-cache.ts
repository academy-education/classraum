/**
 * Read-through cache for test specs. Used by the test generator.
 *
 * Lookup order:
 *   1. study_test_specs row (verified by web search, refreshed monthly)
 *   2. Hardcoded TEST_SPECS in lib/test-specs.ts (the seed / safety net)
 *
 * Keeping renderTestSpec/defaultsForTestSection in test-specs.ts as
 * sync fallbacks means generation never blocks on a DB lookup that
 * can fail. The async variants below are what the route actually
 * calls — they prefer DB and degrade cleanly.
 */

import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  TEST_SPECS,
  renderTestSpec as renderTestSpecSync,
  defaultsForTestSection as defaultsForTestSectionSync,
  type SectionSpec,
} from '@/lib/test-specs'
import type { TestFamily } from '@/lib/study-prompt-context'

/** Find the cached section by exact-or-contains match on either
 *  language label, like the sync version. */
function matchSection(sections: SectionSpec[], sectionLabel: string | null): SectionSpec | undefined {
  if (!sectionLabel) return sections[0]
  return sections.find(s =>
    s.name_en === sectionLabel ||
    s.name_ko === sectionLabel ||
    sectionLabel.includes(s.name_en) ||
    sectionLabel.includes(s.name_ko)
  ) ?? sections[0]
}

async function loadCachedSpec(family: TestFamily, sectionLabel: string | null): Promise<SectionSpec | null> {
  // Pull every row for the family — there are at most ~5 per family,
  // and we need to match by label which lives inside the jsonb.
  const { data: rows } = await supabaseAdmin
    .from('study_test_specs')
    .select('section_key, spec, last_verified_at')
    .eq('family', family)
  if (!rows || rows.length === 0) return null

  // Materialize the SectionSpec[] from rows that have a real spec
  // (skip rows that only have last_attempted_at — failed refreshes).
  const cached: SectionSpec[] = []
  for (const r of rows) {
    if (!r.last_verified_at) continue
    const s = r.spec as SectionSpec | Record<string, never>
    if (s && typeof s === 'object' && 'name_en' in s) cached.push(s as SectionSpec)
  }
  if (cached.length === 0) return null
  return matchSection(cached, sectionLabel) ?? null
}

export async function renderTestSpecCached(
  family: TestFamily | null,
  sectionLabel: string | null,
  language: 'en' | 'ko'
): Promise<string> {
  if (!family) return ''
  try {
    const cached = await loadCachedSpec(family, sectionLabel)
    if (cached) return formatBlock(family, cached, language)
  } catch (err) {
    console.error('[test-spec-cache] DB lookup failed; falling back to hardcoded', err)
  }
  return renderTestSpecSync(family, sectionLabel, language)
}

export async function defaultsForTestSectionCached(
  family: TestFamily | null,
  sectionLabel: string | null
): Promise<{ count: number; minutes: number; choiceCount: 4 | 5 }> {
  if (!family) return defaultsForTestSectionSync(null, sectionLabel)
  try {
    const cached = await loadCachedSpec(family, sectionLabel)
    if (cached) {
      const count = cached.questionsPerSection > 30
        ? Math.ceil(cached.questionsPerSection / 2)
        : cached.questionsPerSection
      const minutes = cached.questionsPerSection > 30
        ? Math.ceil(cached.minutesPerSection / 2)
        : cached.minutesPerSection
      return { count, minutes, choiceCount: cached.choiceCount }
    }
  } catch (err) {
    console.error('[test-spec-cache] defaults lookup failed; falling back', err)
  }
  return defaultsForTestSectionSync(family, sectionLabel)
}

function formatBlock(family: TestFamily, section: SectionSpec, language: 'en' | 'ko'): string {
  // Use the hardcoded TEST_SPECS for the family-level framing — that
  // doesn't change as often and isn't worth re-fetching per section.
  const familySpec = TEST_SPECS[family]
  const display = familySpec?.display ?? family.toUpperCase()
  const framing = language === 'ko'
    ? (familySpec?.framing_ko ?? '')
    : (familySpec?.framing_en ?? '')

  if (language === 'ko') {
    return [
      `시험: ${display}.`,
      framing,
      `영역: ${section.name_ko}. 총 ${section.questionsPerSection}문항, ${section.minutesPerSection}분, ${section.choiceCount}지선다.`,
      `출제 패턴: ${section.patterns_ko}`,
      `오답 설계: ${section.distractorPatterns_ko}`,
    ].filter(Boolean).join('\n\n')
  }
  return [
    `Test: ${display}.`,
    framing,
    `Section: ${section.name_en}. ${section.questionsPerSection} questions, ${section.minutesPerSection} minutes, ${section.choiceCount}-choice multiple choice.`,
    `Question patterns: ${section.patterns_en}`,
    `Distractor design: ${section.distractorPatterns_en}`,
  ].filter(Boolean).join('\n\n')
}
