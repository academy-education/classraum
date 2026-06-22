/**
 * Refresh logic for the study_test_specs cache.
 *
 * The whole pipeline is test-agnostic — it accepts any (family,
 * sectionKey, displayName) triple, no hardcoded URL whitelist. The
 * model uses web_search_preview to find the test maker's own
 * format/sample pages dynamically. Adding a new test = adding a row
 * to study_topics; no code change required.
 *
 * Two refresh modes:
 *  - format only (cheap, monthly): pull format spec from the maker's
 *    docs. Section counts, time, choice count, patterns, distractor
 *    design, difficulty mix, hard-item framing.
 *  - samples (expensive, quarterly): additionally pull released
 *    representative items per section and store the verified-hard
 *    ones as hardItemExamples on the spec. Used as few-shot anchors
 *    in the generator's hard-only pass.
 *
 * Samples are stored as in-prompt exemplars only — never reach the
 * student. Each example carries an inline source URL for attribution.
 */

import { generateObject, generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { TEST_SPECS, type SectionSpec } from '@/lib/test-specs'
import { verifyAndCorrect, type Question } from '@/lib/test-verify'

/** Refresh target — uses arbitrary strings so any test works, not
 *  limited to the 8 hardcoded TestFamily values. */
export interface RefreshTarget {
  family: string         // slug fragment, e.g. 'sat', 'ksat', 'aleks', 'duolingo'
  sectionKey: string     // section's name_en — used as PK fragment
  displayName: string    // human label for prompts, e.g. "SAT Math", "TOEFL Reading"
  displayNameKo?: string
}

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
  difficultyMix: z.object({
    easy: z.number().min(0).max(1),
    medium: z.number().min(0).max(1),
    hard: z.number().min(0).max(1),
  }).optional(),
  hardItemFraming_en: z.string().min(80).optional(),
  hardItemFraming_ko: z.string().min(40).optional(),
})

interface RefreshResult {
  family: string
  sectionKey: string
  ok: boolean
  notes: string
  sources: string[]
}

interface SamplesResult extends RefreshResult {
  examplesAdded: number
}

const FORMAT_PROMPT = (target: RefreshTarget) => `
You are verifying the current official format of a standardized test section so a study app can generate accurate mock tests.

Test: ${target.displayName}
Section to verify: ${target.sectionKey}

Use web search to find the CURRENT official format. STRONGLY prefer the test maker's own published format page (College Board for SAT/AP, ETS for TOEFL/TOEIC/GRE, British Council/IDP/Cambridge for IELTS, ACT Inc. for ACT, KICE/한국교육과정평가원 for KSAT, the relevant national board or accreditation body for newer/regional tests). Do NOT cite test-prep blogs, Kaplan/Princeton Review summaries, or Wikipedia as primary sources unless absolutely no maker source exists.

Report your findings in plain prose. Include:
- Exact section name (in English and Korean if commonly known — for non-Korean tests, transliterate or descriptively translate)
- TOTAL questions in the FULL SECTION. NOT per-module or per-passage. If the test is delivered as multiple modules (Digital SAT) or parts, sum them. e.g. SAT Math = 44 (NOT 22).
- TOTAL minutes for the FULL SECTION
- If the section is modular, separately note that structure
- Number of choices per MCQ (4 or 5; if free-response only, pick 4 as default)
- Major question patterns / categories with approximate weights
- Common distractor (wrong-answer) design patterns
- Difficulty distribution as published OR estimated (easy/medium/hard fractions summing to 1.0)
- What a HARD item LOOKS LIKE for this section, concrete enough that a generator can produce one — passage length, reasoning depth, distractor sophistication, what makes real students stumble

Sanity check: time/questions ratio should yield plausible per-question time (1-3 min usually). If you get 30s/Q or 5min/Q, you probably mixed up units.

If you cannot find an authoritative current source, say so explicitly. Do NOT invent numbers.

End with a "Sources:" line listing the URLs you used.
`.trim()

const EXTRACT_PROMPT = (researchText: string) => `
The following is a research report on a standardized test section's current format. Extract a clean structured spec from it.

If the report says authoritative numbers couldn't be found, return the closest you can with a clear note in the patterns field saying "unverified — model could not find authoritative source."

Translate the English fields to Korean too — patterns_ko, distractorPatterns_ko, hardItemFraming_ko should be natural Korean, not literal translations.

Research report:
${researchText}
`.trim()

/**
 * Refresh format spec for one (family, sectionKey) entry. Skips if
 * already verified within the last 30 days.
 */
export async function refreshTestSpec(
  target: RefreshTarget,
  opts: { force?: boolean } = {}
): Promise<RefreshResult> {
  const { family, sectionKey } = target

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
  let researchText = ''
  let citedUrls: string[] = []

  try {
    const research = await generateText({
      model: openai.responses('gpt-4o'),
      prompt: FORMAT_PROMPT(target),
      tools: {
        web_search_preview: openai.tools.webSearchPreview({ searchContextSize: 'high' }),
      },
      temperature: 0.2,
    })
    researchText = research.text
    citedUrls = (research.sources ?? [])
      .map(s => (s as { url?: string }).url)
      .filter((u): u is string => typeof u === 'string')
  } catch (err) {
    console.error('[test-spec-refresh] web search failed', { family, sectionKey, err })
  }

  if (!researchText) {
    await markAttempt(family, sectionKey, 'web search returned no usable text')
    return { family, sectionKey, ok: false, notes: 'no research text', sources: [] }
  }

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
    await markAttempt(family, sectionKey, `extraction failed: ${(err as Error).message ?? 'unknown'}`)
    return { family, sectionKey, ok: false, notes: 'extraction failed', sources: citedUrls }
  }

  // Preserve hardItemExamples from any prior refresh — they're a
  // separate (slower) pass and shouldn't be wiped on format refresh.
  const { data: priorRow } = await supabaseAdmin
    .from('study_test_specs')
    .select('spec')
    .eq('family', family)
    .eq('section_key', sectionKey)
    .maybeSingle()
  const priorSpec = (priorRow?.spec ?? {}) as Partial<SectionSpec>
  if (priorSpec.hardItemExamples_en) spec.hardItemExamples_en = priorSpec.hardItemExamples_en
  if (priorSpec.hardItemExamples_ko) spec.hardItemExamples_ko = priorSpec.hardItemExamples_ko

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
      verifier_notes: `format verified via ${citedUrls.length} source(s)`,
      updated_at: now,
    }, { onConflict: 'family,section_key' })

  return { family, sectionKey, ok: true, notes: 'format verified', sources: citedUrls }
}

const SAMPLES_PROMPT = (target: RefreshTarget, count: number) => `
You are gathering representative HARD practice items for a standardized test section. These will be used as in-prompt exemplars (few-shot anchors) for a question generator. They will NOT be shown to students directly.

Test: ${target.displayName}
Section: ${target.sectionKey}

Goal: find ${count}-${count + 5} concrete published practice items from authoritative sources, focusing on items the test maker rates as harder difficulty. Prefer the test maker's own released items (College Board's released SAT/AP practice tests, ETS sample questions, KICE 평가원 모의평가 released PDFs, ACT released items, British Council IELTS sample questions, etc.). Skip items that depend on copyrighted figures, audio, or images that can't be reproduced in plain text.

For each item, report:
- The full problem prompt as plain text (translate any LaTeX to Unicode: x², √(2), π, ½, etc.)
- All multiple-choice options (do NOT include letter prefixes — just the choice content)
- The correct answer as the exact choice text
- The test maker's stated difficulty label if available, otherwise your own honest estimate
- A brief "why hard" explanation pointing to the specific multi-step reasoning, distractor design, or subtle distinction
- The source URL the item came from

Format each item like this:

ITEM 1 (source: <url>):
Prompt: <text>
Choices: ["<a>", "<b>", "<c>", "<d>"]
Correct: "<exact text>"
Difficulty: <hard | medium | easy>
Why hard: <one or two sentences>

Do not invent items. If you cannot find ${count} hard items from authoritative sources, return what you found and explicitly note the shortfall at the end.

End with a "Sources:" line listing the URLs you used.
`.trim()

const SampleItemSchema = z.object({
  prompt: z.string(),
  choices: z.array(z.string()).min(4).max(5),
  correct_answer: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  why_hard: z.string(),
  source_url: z.string(),
})

const SampleBatchSchema = z.object({
  items: z.array(SampleItemSchema),
})

/**
 * Refresh hardItemExamples for one section. Searches the web for
 * released items, validates each via the existing answer-key verifier,
 * keeps the verified-hard ones, formats them as inline exemplars on
 * the cached spec.
 *
 * Cost ~$0.10-0.20 per section (web search + extraction + verifier).
 * Run quarterly, not monthly — released item sets are stable for years.
 */
export async function refreshTestSpecExamples(
  target: RefreshTarget,
  opts: { targetCount?: number; force?: boolean } = {}
): Promise<SamplesResult> {
  const { family, sectionKey } = target
  const targetCount = opts.targetCount ?? 8

  if (!opts.force) {
    const { data: existing } = await supabaseAdmin
      .from('study_test_specs')
      .select('spec, last_verified_at')
      .eq('family', family)
      .eq('section_key', sectionKey)
      .maybeSingle()
    const cachedExamples = ((existing?.spec ?? {}) as Partial<SectionSpec>).hardItemExamples_en ?? []
    // Quarterly skip — examples don't change as fast as format. If we
    // already have a healthy set, skip a refresh that happened recently.
    if (cachedExamples.length >= targetCount && existing?.last_verified_at) {
      const ageMs = Date.now() - new Date(existing.last_verified_at).getTime()
      if (ageMs < 90 * 24 * 60 * 60 * 1000) {
        return { family, sectionKey, ok: true, notes: 'skipped — examples fresh within 90 days', sources: [], examplesAdded: 0 }
      }
    }
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return { family, sectionKey, ok: false, notes: 'no OPENAI_API_KEY', sources: [], examplesAdded: 0 }
  const openai = createOpenAI({ apiKey })

  // Step 1: search for sample items via web search
  let researchText = ''
  let citedUrls: string[] = []
  try {
    const research = await generateText({
      model: openai.responses('gpt-4o'),
      prompt: SAMPLES_PROMPT(target, targetCount),
      tools: {
        web_search_preview: openai.tools.webSearchPreview({ searchContextSize: 'high' }),
      },
      temperature: 0.2,
    })
    researchText = research.text
    citedUrls = (research.sources ?? [])
      .map(s => (s as { url?: string }).url)
      .filter((u): u is string => typeof u === 'string')
  } catch (err) {
    console.error('[test-spec-refresh] samples web search failed', { family, sectionKey, err })
    return { family, sectionKey, ok: false, notes: 'samples search failed', sources: [], examplesAdded: 0 }
  }

  if (!researchText) {
    return { family, sectionKey, ok: false, notes: 'no samples returned', sources: citedUrls, examplesAdded: 0 }
  }

  // Step 2: extract to structured items
  let items: z.infer<typeof SampleItemSchema>[]
  try {
    const result = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: SampleBatchSchema,
      prompt: `Extract the practice items from this research report into the structured schema. Skip items that are incomplete or that depend on figures/audio. If a "difficulty" label was given by the test maker, preserve it; otherwise estimate honestly.\n\nReport:\n${researchText}`,
      temperature: 0.1,
    })
    items = result.object.items
  } catch (err) {
    console.error('[test-spec-refresh] sample extraction failed', { family, sectionKey, err })
    return { family, sectionKey, ok: false, notes: 'extraction failed', sources: citedUrls, examplesAdded: 0 }
  }

  if (items.length === 0) {
    return { family, sectionKey, ok: false, notes: 'no items extracted', sources: citedUrls, examplesAdded: 0 }
  }

  // Step 3: verify each item's answer key + actual difficulty via the
  // same verifier the generator uses. We only keep items the verifier
  // rates as hard with high confidence — same bar as we'd hold our own
  // generated items to.
  const asQuestions: Question[] = items.map(it => ({
    prompt: it.prompt,
    type: 'multiple_choice' as const,
    choices: it.choices,
    correct_answer: it.correct_answer,
    difficulty: it.difficulty,
    explanation: it.why_hard,
  }))
  const mathHeavy = /math|quant|수학/i.test(sectionKey)
  const verifyResult = await verifyAndCorrect(asQuestions, apiKey, { mathHeavy })
  const verifiedHard = verifyResult.kept.filter(q => q.difficulty === 'hard')

  if (verifiedHard.length === 0) {
    // Mark attempt so admin can see "tried but nothing survived"
    await markAttempt(family, sectionKey, `examples: 0 of ${items.length} extracted items verified as hard`)
    return { family, sectionKey, ok: false, notes: 'no items verified as hard', sources: citedUrls, examplesAdded: 0 }
  }

  // Step 4: format as inline exemplars (matches the hand-curated format
  // already in TEST_SPECS so the prompt template doesn't change)
  const exemplarsEn = verifiedHard.map((q, i) => {
    const item = items.find(it => it.prompt === q.prompt)
    const source = item?.source_url ? ` (source: ${item.source_url})` : ''
    return `EXAMPLE ${i + 1}${source}:
Prompt: "${q.prompt}"
Choices: ${JSON.stringify(q.choices)}
Correct: "${q.correct_answer}"
Why hard: ${q.explanation}`
  })

  // Translate to Korean in a single batch call (cheaper than per-item)
  let exemplarsKo: string[] = []
  try {
    const koResult = await generateText({
      model: openai('gpt-4o-mini'),
      prompt: `Translate these few-shot exemplars from English to Korean. Preserve the EXAMPLE N (source: ...) headers and JSON-formatted Choices arrays unchanged. Translate the Prompt, Correct, and Why-hard text content to natural Korean. Output the translated exemplars in the same format, separated by blank lines.\n\n${exemplarsEn.join('\n\n')}`,
      temperature: 0.1,
    })
    exemplarsKo = koResult.text.split(/\n\n+/).filter(s => s.trim().startsWith('EXAMPLE'))
    if (exemplarsKo.length !== exemplarsEn.length) {
      // If parsing went sideways, fall back to leaving Korean empty —
      // the generator will use the English exemplars for both languages
      // (better than no exemplars at all).
      exemplarsKo = []
    }
  } catch (err) {
    console.error('[test-spec-refresh] Korean translation failed; English-only', err)
  }

  // Step 5: merge into the cached spec
  const { data: priorRow } = await supabaseAdmin
    .from('study_test_specs')
    .select('spec')
    .eq('family', family)
    .eq('section_key', sectionKey)
    .maybeSingle()
  const priorSpec = (priorRow?.spec ?? {}) as Partial<SectionSpec>
  const mergedSpec: Partial<SectionSpec> = {
    ...priorSpec,
    hardItemExamples_en: exemplarsEn,
    ...(exemplarsKo.length > 0 ? { hardItemExamples_ko: exemplarsKo } : {}),
  }

  const now = new Date().toISOString()
  await supabaseAdmin
    .from('study_test_specs')
    .update({
      spec: mergedSpec,
      last_attempted_at: now,
      verifier_notes: `${exemplarsEn.length} hard examples refreshed`,
      updated_at: now,
    })
    .eq('family', family)
    .eq('section_key', sectionKey)

  return { family, sectionKey, ok: true, notes: `added ${exemplarsEn.length} hard examples`, sources: citedUrls, examplesAdded: exemplarsEn.length }
}

async function markAttempt(family: string, sectionKey: string, notes: string) {
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
 * Walks the study_topics catalog for every test_prep leaf and returns
 * a refresh target per (family, section). This means adding a new test
 * to the catalog auto-enrolls it in the refresh cron — no code change.
 *
 * Family is derived from the root test topic's slug ("test-sat" → "sat",
 * "test-aleks" → "aleks"). Section key is the leaf's English name.
 */
export async function listAllSpecTargetsFromDB(): Promise<RefreshTarget[]> {
  // Test-prep leaves are topics whose parent is a "test-*" root.
  const { data: leaves } = await supabaseAdmin
    .from('study_topics')
    .select('id, slug, name_en, name_ko, parent_id')
    .eq('category', 'test_prep')
    .not('parent_id', 'is', null)
  if (!leaves || leaves.length === 0) return []

  // Pull parents in one shot to derive family + display name.
  const parentIds = [...new Set(leaves.map(l => l.parent_id).filter((p): p is string => !!p))]
  const { data: parents } = await supabaseAdmin
    .from('study_topics')
    .select('id, slug, name_en, name_ko')
    .in('id', parentIds)
  const parentById = new Map((parents ?? []).map(p => [p.id, p]))

  const targets: RefreshTarget[] = []
  for (const leaf of leaves) {
    const parent = leaf.parent_id ? parentById.get(leaf.parent_id) : null
    if (!parent) continue
    // Only treat rows whose parent is a real test root (e.g. "test-sat")
    // as section leaves. Skip the "test-prep" UMBRELLA topic whose
    // children are themselves test roots (SAT, TOEFL, etc.) — refreshing
    // "SAT" as if it were a single section would waste API calls.
    if (!parent.slug.startsWith('test-') || parent.slug === 'test-prep') continue
    const family = parent.slug.replace(/^test-/, '')
    targets.push({
      family,
      sectionKey: leaf.name_en,
      displayName: `${parent.name_en} — ${leaf.name_en}`,
      displayNameKo: `${parent.name_ko} — ${leaf.name_ko}`,
    })
  }
  return targets
}

/**
 * Legacy enumerator for the hardcoded TEST_SPECS. Kept so callers that
 * want only the curated 8 (e.g. integration tests) still work.
 * Prefer listAllSpecTargetsFromDB() for production refresh.
 */
export function listAllSpecTargets(): RefreshTarget[] {
  const out: RefreshTarget[] = []
  for (const [family, spec] of Object.entries(TEST_SPECS)) {
    if (!spec) continue
    for (const section of spec.sections) {
      out.push({
        family,
        sectionKey: section.name_en,
        displayName: `${spec.display} — ${section.name_en}`,
        displayNameKo: `${spec.display} — ${section.name_ko}`,
      })
    }
  }
  return out
}
