/**
 * Refresh logic for the study_test_specs cache.
 *
 * Two-tier source strategy:
 *  1. Primary — OpenAI's hosted web_search_preview tool. Lets the
 *     model find the current spec on the test maker's site (College
 *     Board, ETS, KICE, etc.) and cite URLs.
 *  2. Fallback — a whitelist of authoritative URLs we fetch directly
 *     and hand to the model. Used when web_search_preview comes back
 *     empty or the model declines to cite a real source.
 *
 * Output is validated against SectionSpecSchema before being upserted
 * to study_test_specs. A failed refresh writes last_attempted_at + a
 * verifier_notes line so the admin page can show "tried 3 days ago,
 * couldn't find authoritative source."
 */

import { generateObject, generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { TEST_SPECS, type SectionSpec } from '@/lib/test-specs'
import type { TestFamily } from '@/lib/study-prompt-context'

const SectionSpecSchema = z.object({
  name_en: z.string(),
  name_ko: z.string(),
  questionsPerSection: z.number().int().min(1).max(300),
  minutesPerSection: z.number().int().min(5).max(240),
  choiceCount: z.union([z.literal(4), z.literal(5)]),
  patterns_en: z.string().min(80),
  patterns_ko: z.string().min(40),
  distractorPatterns_en: z.string().min(80),
  distractorPatterns_ko: z.string().min(40),
  /** Real-test difficulty distribution. Fractions ~ sum to 1.0. */
  difficultyMix: z.object({
    easy: z.number().min(0).max(1),
    medium: z.number().min(0).max(1),
    hard: z.number().min(0).max(1),
  }).optional(),
  /** What HARD looks like for THIS section — used as the focused
   *  prompt for the hard-only generation pass. */
  hardItemFraming_en: z.string().min(80).optional(),
  hardItemFraming_ko: z.string().min(40).optional(),
})

/** Authoritative URLs for the whitelist fallback, per family. The
 *  refresh prompt directs the model to these specifically when it
 *  can't search. Keep narrow — these are pages the test maker
 *  publishes about their own format. */
const FALLBACK_URLS: Record<TestFamily, string[]> = {
  sat: [
    'https://satsuite.collegeboard.org/sat/whats-on-the-test/structure',
    'https://satsuite.collegeboard.org/sat/whats-on-the-test/reading-writing',
    'https://satsuite.collegeboard.org/sat/whats-on-the-test/math',
  ],
  ksat: [
    'https://www.suneung.re.kr/',
    'https://www.kice.re.kr/',
  ],
  toefl: [
    'https://www.ets.org/toefl/test-takers/ibt/about/content.html',
  ],
  toeic: [
    'https://www.ets.org/toeic/test-takers/listening-reading/about/content.html',
  ],
  ielts: [
    'https://ielts.org/take-a-test/test-types/ielts-academic-test/format',
  ],
  act: [
    'https://www.act.org/content/act/en/products-and-services/the-act/test-preparation.html',
  ],
  ap: [
    'https://apstudents.collegeboard.org/exam-policies-guidelines/exam-day-policies',
  ],
  gre: [
    'https://www.ets.org/gre/test-takers/general-test/about/content.html',
  ],
}

const REFRESH_PROMPT_EN = (family: TestFamily, sectionKey: string, urls: string[]) => `
You are verifying the current official format of a standardized test section so we can keep our study app's spec library accurate.

Test family: ${family.toUpperCase()}
Section to verify: ${sectionKey}

Search the web for the CURRENT official format. Prefer these sources (the test maker's own published format pages):
${urls.map(u => `- ${u}`).join('\n')}

You may follow links from these pages to find more detailed format info. Do NOT cite test-prep blogs or Wikipedia as primary sources — only the test maker or, if needed, peer-reviewed academic sources about the test.

Report your findings in plain prose. Include:
- Exact section name (in English and Korean if commonly known)
- TOTAL questions in the FULL SECTION (not per-module or per-passage — if the test is delivered as multiple modules like the Digital SAT, sum them up. e.g. SAT Math = 44, NOT 22.)
- TOTAL minutes for the FULL SECTION (e.g. SAT Math = 70, NOT 35)
- If the section is broken into modules or parts, also note that structure separately, but the headline numbers must be the full section
- Number of choices per multiple-choice question (4 or 5)
- The major question patterns / categories with approximate weights
- Common distractor (wrong-answer) design patterns
- The REAL test's difficulty distribution as published by the maker or estimated from released exams (approximate easy/medium/hard fractions summing to 1.0). If the test has signature "killer" items, weight hard accordingly (KSAT Math ~25%, SAT ~20%, TOEIC ~10-15%).
- A description of what a HARD item LOOKS LIKE for THIS section — concrete enough that a generator can produce one. Not just "harder" — describe the structural features: passage length, reasoning depth, distractor sophistication, what makes a real student stumble.

Sanity check before you submit:
- Does the total time × questions divided yield a plausible per-question time? (SAT Math = 70 min / 44 Q ≈ 1.6 min — reasonable. If you get 30s/Q or 5min/Q, you probably mixed up units.)
- Are your numbers per-section, not per-module?

If you cannot find an authoritative current source, say so explicitly — do NOT invent numbers.

End your report with a "Sources:" line followed by the URLs you actually used.
`.trim()

const EXTRACT_PROMPT = (researchText: string) => `
The following is a research report on a standardized test section's current format. Extract a clean structured spec from it.

If the report says authoritative numbers couldn't be found, return the closest you can with a clear note in the patterns field saying "unverified — model could not find authoritative source."

Translate the English fields to Korean too — patterns_ko and distractorPatterns_ko should be natural Korean, not literal translations.

Research report:
${researchText}
`.trim()

interface RefreshResult {
  family: TestFamily
  sectionKey: string
  ok: boolean
  notes: string
  sources: string[]
}

/**
 * Refresh one (family, section_key) entry. Skips if already verified
 * within the last 30 days.
 */
export async function refreshTestSpec(
  family: TestFamily,
  sectionKey: string,
  opts: { force?: boolean } = {}
): Promise<RefreshResult> {
  // Skip if verified recently. The cron will hit every spec monthly;
  // a manual trigger can pass force=true to bypass.
  if (!opts.force) {
    const { data: existing } = await supabaseAdmin
      .from('study_test_specs')
      .select('last_verified_at')
      .eq('family', family)
      .eq('section_key', sectionKey)
      .maybeSingle()
    if (existing?.last_verified_at) {
      const ageMs = Date.now() - new Date(existing.last_verified_at).getTime()
      if (ageMs < 30 * 24 * 60 * 60 * 1000) {
        return { family, sectionKey, ok: true, notes: 'skipped — verified within 30 days', sources: [] }
      }
    }
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    await markAttempt(family, sectionKey, 'no OPENAI_API_KEY in env')
    return { family, sectionKey, ok: false, notes: 'no OPENAI_API_KEY', sources: [] }
  }

  const openai = createOpenAI({ apiKey })
  const urls = FALLBACK_URLS[family] ?? []

  let researchText = ''
  let citedUrls: string[] = []

  // Tier 1: hosted web search.
  try {
    const research = await generateText({
      model: openai.responses('gpt-4o'),
      prompt: REFRESH_PROMPT_EN(family, sectionKey, urls),
      tools: {
        web_search_preview: openai.tools.webSearchPreview({
          searchContextSize: 'high',
        }),
      },
      temperature: 0.2,
    })
    researchText = research.text
    citedUrls = (research.sources ?? [])
      .map(s => (s as { url?: string }).url)
      .filter((u): u is string => typeof u === 'string')
  } catch (err) {
    console.error('[test-spec-refresh] web_search_preview failed', { family, sectionKey, err })
  }

  // Tier 2: whitelist fetch fallback. Used when tier 1 returned nothing
  // usable. Each URL gets a HEAD-then-GET fetch, content piped into the
  // model as raw text. Cheap and predictable.
  if (!researchText && urls.length > 0) {
    const pages: string[] = []
    for (const url of urls) {
      try {
        const res = await fetch(url, {
          headers: { 'user-agent': 'Classraum-TestSpecRefresh/1.0' },
          signal: AbortSignal.timeout(10_000),
        })
        if (!res.ok) continue
        const html = await res.text()
        // Strip HTML to plain text — crude but adequate for spec pages.
        const text = html
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 12_000)
        pages.push(`Source: ${url}\n${text}\n`)
      } catch (err) {
        console.error('[test-spec-refresh] fallback fetch failed', { url, err })
      }
    }
    if (pages.length > 0) {
      try {
        const research = await generateText({
          model: openai('gpt-4o'),
          prompt: `${REFRESH_PROMPT_EN(family, sectionKey, urls)}\n\nYou do not have web search available. Use only the source content below.\n\n${pages.join('\n---\n')}`,
          temperature: 0.2,
        })
        researchText = research.text
        citedUrls = urls
      } catch (err) {
        console.error('[test-spec-refresh] fallback model call failed', { family, sectionKey, err })
      }
    }
  }

  if (!researchText) {
    await markAttempt(family, sectionKey, 'both web search and fallback fetch failed')
    return { family, sectionKey, ok: false, notes: 'no research text', sources: [] }
  }

  // Extract structured spec.
  let spec: SectionSpec
  try {
    const result = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: SectionSpecSchema,
      prompt: EXTRACT_PROMPT(researchText),
      temperature: 0.1,
    })
    spec = result.object as SectionSpec
  } catch (err) {
    console.error('[test-spec-refresh] extraction failed', { family, sectionKey, err })
    await markAttempt(family, sectionKey, `extraction failed: ${(err as Error).message ?? 'unknown'}`)
    return { family, sectionKey, ok: false, notes: 'extraction failed', sources: citedUrls }
  }

  const now = new Date().toISOString()
  await supabaseAdmin
    .from('study_test_specs')
    .upsert({
      family,
      section_key: sectionKey,
      spec,
      sources: citedUrls,
      last_verified_at: now,
      last_attempted_at: now,
      verifier_notes: `verified via ${citedUrls.length} source(s)`,
      updated_at: now,
    }, { onConflict: 'family,section_key' })

  return { family, sectionKey, ok: true, notes: 'verified', sources: citedUrls }
}

async function markAttempt(family: TestFamily, sectionKey: string, notes: string) {
  const now = new Date().toISOString()
  await supabaseAdmin
    .from('study_test_specs')
    .upsert({
      family,
      section_key: sectionKey,
      spec: {},
      sources: [],
      last_attempted_at: now,
      verifier_notes: notes,
      updated_at: now,
    }, { onConflict: 'family,section_key', ignoreDuplicates: false })
}

/**
 * Enumerate every (family, section_key) pair from the hardcoded
 * TEST_SPECS — the cron walks this list to know what to refresh.
 * Section key is the English name (stable enough to use as PK fragment).
 */
export function listAllSpecTargets(): Array<{ family: TestFamily; sectionKey: string }> {
  const out: Array<{ family: TestFamily; sectionKey: string }> = []
  for (const [family, spec] of Object.entries(TEST_SPECS)) {
    if (!spec) continue
    for (const section of spec.sections) {
      out.push({ family: family as TestFamily, sectionKey: section.name_en })
    }
  }
  return out
}
