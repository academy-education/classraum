/**
 * Print the exact prompts our pipeline sends, so you can paste them
 * into ChatGPT (with Search on) or OpenAI Playground to spot-check
 * behavior without burning API credits on the full pipeline.
 *
 * Usage:
 *   npx tsx scripts/print-prompts.ts [sat-math | sat-reading-writing | ksat-math | ksat-english]
 *
 * The script doesn't call any APIs. It rebuilds the strings exactly
 * as the refresh + generator would. Outputs three blocks separated
 * by markers so you can copy each one.
 */

import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { TEST_SPECS } from '../src/lib/test-specs'
import type { TestFamily } from '../src/lib/study-prompt-context'

// Map slug → (family, sectionKey)
const TARGETS: Record<string, { family: TestFamily; sectionKey: string; displayName: string }> = {
  'sat-math':            { family: 'sat',  sectionKey: 'Math',            displayName: 'Digital SAT — Math' },
  'sat-reading-writing': { family: 'sat',  sectionKey: 'Reading & Writing', displayName: 'Digital SAT — Reading & Writing' },
  'ksat-math':           { family: 'ksat', sectionKey: 'Mathematics (수학)', displayName: 'KSAT (수능) — Mathematics (수학)' },
  'ksat-english':        { family: 'ksat', sectionKey: 'English (영어)',    displayName: 'KSAT (수능) — English (영어)' },
  'ksat-korean':         { family: 'ksat', sectionKey: 'Korean (국어)',     displayName: 'KSAT (수능) — Korean (국어)' },
}

function divider(label: string) {
  const bar = '═'.repeat(78)
  return `\n${bar}\n  ${label}\n${bar}\n`
}

function main() {
  const slug = process.argv[2] ?? 'sat-math'
  const target = TARGETS[slug]
  if (!target) {
    console.error(`unknown slug ${slug}. options: ${Object.keys(TARGETS).join(', ')}`)
    process.exit(1)
  }

  const spec = TEST_SPECS[target.family]
  const section = spec?.sections.find(s => s.name_en === target.sectionKey)
  if (!spec || !section) {
    console.error(`no hardcoded spec for ${target.family} / ${target.sectionKey}`)
    process.exit(1)
  }

  // 1. FORMAT RESEARCH PROMPT — what the refresh sends to find current format.
  // Paste into ChatGPT with Search on.
  const formatPrompt = `
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

  // 2. SAMPLE-PULL PROMPT — what gathers released items per section.
  // Paste into ChatGPT with Search on. Compare quality of items it returns.
  const samplesPrompt = `
You are gathering representative HARD practice items for a standardized test section. These will be used as in-prompt exemplars (few-shot anchors) for a question generator. They will NOT be shown to students directly.

Test: ${target.displayName}
Section: ${target.sectionKey}

Goal: find 8-13 concrete published practice items from authoritative sources, focusing on items the test maker rates as harder difficulty. Prefer the test maker's own released items (College Board's released SAT/AP practice tests, ETS sample questions, KICE 평가원 모의평가 released PDFs, ACT released items, British Council IELTS sample questions, etc.). Skip items that depend on copyrighted figures, audio, or images that can't be reproduced in plain text.

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

Do not invent items. If you cannot find 8 hard items from authoritative sources, return what you found and explicitly note the shortfall at the end.

End with a "Sources:" line listing the URLs you used.
`.trim()

  // 3. HARD-ITEM GENERATION PROMPT — what the route sends after format is cached.
  // This is the prompt that's failing to produce truly hard items. Paste into
  // ChatGPT (no search needed) and see what hard items it actually writes.
  const formatBlock = [
    `Test: ${spec.display}.`,
    spec.framing_en,
    `Section: ${section.name_en}. ${section.questionsPerSection} questions, ${section.minutesPerSection} minutes, ${section.choiceCount}-choice multiple choice.`,
    `Question patterns: ${section.patterns_en}`,
    `Distractor design: ${section.distractorPatterns_en}`,
  ].join('\n\n')
  const hardFraming = section.hardItemFraming_en
    ?? 'A HARD item requires 3+ reasoning steps, OR requires translating prose into a formal statement before solving, OR turns on a subtle distinction.'
  const examples = section.hardItemExamples_en ?? []
  const examplesBlock = examples.length > 0
    ? `\n\nHere are VERIFIED hard items for this section. Do NOT copy them — but match this depth and structure when you create new items:\n\n${examples.join('\n\n')}\n`
    : ''
  const targetHard = Math.round(section.questionsPerSection * (section.difficultyMix?.hard ?? 0.20))
  const hardBuffer = Math.max(4, targetHard)

  const hardGenPrompt = `
Generate ${targetHard + hardBuffer} HARD discriminating items for the ${target.displayName} test. ALL difficulty = "hard".

${formatBlock}

What a HARD item looks like for THIS section:
${hardFraming}${examplesBlock}

Rules:
- Every item's difficulty field is "hard". NO easy or medium — they are generated in a separate pass.
- Each item must meet the framing above — multi-step reasoning, subtle distinctions, non-obvious setup.
- ABSOLUTELY NO trivial items like "solve 2x+3=11" or "what is the area of a rectangle".
- Wrong answers reflect the sophisticated traps real students fall into on items of THIS specific hard type — not generic traps.
- Distribute correct answers across A/B/C/D.
- For math: SHOW WORK in explanation. Compute the answer twice independently before committing.
- Plain text only. NO LaTeX, markdown, or HTML. Use Unicode: x², √(2), π, ½, ±, ×, ÷.
- Choice text contains ONLY the answer content. Do NOT prefix with "A)", "B.", "(1)" etc.
- Explanations: 1-2 sentences. Mention what makes this step hard.
- timeLimitMinutes = ${section.minutesPerSection}; section = ${target.sectionKey}.
`.trim()

  console.log(divider(`TARGET: ${slug} (${target.displayName})`))
  console.log(`Family: ${target.family}, Section: ${target.sectionKey}`)
  console.log(`Spec: ${section.questionsPerSection} Q / ${section.minutesPerSection} min / ${section.choiceCount}-choice`)
  console.log(`Difficulty mix: ${JSON.stringify(section.difficultyMix ?? { easy: 0.3, medium: 0.5, hard: 0.2 })}`)
  console.log(`Existing hardItemExamples in spec: ${(section.hardItemExamples_en ?? []).length}`)

  console.log(divider('PROMPT 1 of 3 — FORMAT RESEARCH (paste into ChatGPT with Search ON)'))
  console.log(formatPrompt)

  console.log(divider('PROMPT 2 of 3 — SAMPLE-PULL (paste into ChatGPT with Search ON)'))
  console.log(samplesPrompt)

  console.log(divider('PROMPT 3 of 3 — HARD-ITEM GENERATION (paste into ChatGPT, Search OFF)'))
  console.log(hardGenPrompt)

  console.log(divider('HOW TO COMPARE'))
  console.log(`
1. Open chatgpt.com (or platform.openai.com/playground for closer-to-API behavior)
2. Make sure the model is gpt-4o (Plus tier)
3. For prompts 1 and 2: click the Search/Tools toggle so it can browse
4. For prompt 3: leave Search off — this is pure generation

What to look for:
  - Prompt 1: does it find College Board / KICE / etc. as the source? Or test-prep blogs?
  - Prompt 2: does it return real items, or invented ones? Check the source URLs.
  - Prompt 3: does it produce GENUINELY hard items, or middle-school drills?

If Prompt 3 produces good hards in ChatGPT but bad hards via our API, the
difference is likely temperature (ChatGPT runs hotter ~0.7, API uses 0.2).
If Prompt 3 produces bad hards in both, the prompt itself is the issue.
`.trim())
}

main()
