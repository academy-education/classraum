/**
 * Quick test harness for the SAT Math test generator.
 *
 * Runs the exact prompt the /api/study/test/generate route would build
 * for a full_test session on the SAT Math topic, against gpt-4o with
 * the spec library injected. Dumps the generated test to stdout +
 * a JSON file so you can spot-check format accuracy without spinning
 * up a real session.
 *
 * Usage: npx tsx scripts/test-sat-generation.ts [sat-math|sat-reading-writing|ksat-math|...]
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { writeFileSync } from 'fs'

config({ path: resolve(process.cwd(), '.env.local') })

import { generateObject } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { z } from 'zod'
import { loadStudyPromptContext } from '../src/lib/study-prompt-context'
import { renderTestSpecCached, defaultsForTestSectionCached } from '../src/lib/test-spec-cache'
import {
  verifyAndCorrect,
  sanitizeQuestion,
  shuffleChoices,
  dedupeByPrompt,
  type Question,
} from '../src/lib/test-verify'

const QuestionSchema = z.object({
  prompt: z.string(),
  type: z.literal('multiple_choice'),
  choices: z.array(z.string()).min(4).max(5),
  correct_answer: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  explanation: z.string(),
})

const TestSchema = z.object({
  title: z.string(),
  timeLimitMinutes: z.number().int(),
  section: z.string().nullable(),
  questions: z.array(QuestionSchema),
})

const TOPIC_SLUGS: Record<string, string> = {
  'sat-math': '6cf0bc6a-a430-4fe5-b03c-db031df8a691',
  'sat-reading-writing': 'fc784bfb-e3bd-48ea-a794-7da1fe219ba4',
  'ksat-math': '46779dba-3523-454b-8496-a5a0cd8f6389',
  'ksat-english': '7ad110c9-9bbd-451b-bbef-a29a57ae33e8',
}

async function main() {
  const slug = process.argv[2] ?? 'sat-math'
  const topicId = TOPIC_SLUGS[slug]
  if (!topicId) {
    console.error(`unknown slug ${slug}. options: ${Object.keys(TOPIC_SLUGS).join(', ')}`)
    process.exit(1)
  }

  console.log(`Generating full mock test for: ${slug}\n`)

  const ctx = await loadStudyPromptContext(topicId, 'en')
  if (!ctx) { console.error('no context loaded'); process.exit(1) }
  console.log(`Topic: ${ctx.topicName}`)
  console.log(`Family: ${ctx.testFamily}, Section: ${ctx.testSection}\n`)

  const testPrepBlock = await renderTestSpecCached(ctx.testFamily, ctx.testSection, 'en')
  const { count, minutes } = await defaultsForTestSectionCached(ctx.testFamily, ctx.testSection)
  console.log(`Spec target: ${count} questions in ${minutes} minutes\n`)
  console.log(`--- spec block injected ---\n${testPrepBlock}\n--- end spec ---\n`)

  const topicName = `${ctx.testFamily?.toUpperCase()} — ${ctx.testSection}`
  const buffer = Math.max(3, Math.ceil(count * 0.25))
  const generationCount = Math.min(70, count + buffer)

  // Inline anchor copy from route (test script can't import the local
  // const without exporting). Keep in sync if the route's anchor changes.
  const satMathAnchor = ctx.testFamily === 'sat' && ctx.testSection?.toLowerCase().includes('math')
    ? `\n\nExample of a real SAT Math HARD item (do NOT copy verbatim — match the style):\n  Prompt: "A farmer plants apple and pear trees. Each apple yields 80 kg/yr, each pear 60 kg/yr. The farmer needs at least 5,000 kg total and has space for at most 80 trees. If pears sell for $3/kg and apples for $2/kg, what is the minimum apple-tree count that still maximizes revenue?"\n  Choices: ["10", "20", "30", "40"]\n  Correct: "10"\n  Why hard: requires translating two constraints, realizing all-pears maximizes revenue, then finding minimum apples consistent with constraints.\n`
    : ''

  const prompt = `
Build a ${minutes}-minute timed mock test with exactly ${generationCount} questions for: ${topicName}.

${testPrepBlock}${satMathAnchor}

Rules:
- Match the test's REAL format exactly. Choice count per the format block above.
- Difficulty distribution MUST include roughly 20% HARD items — multi-step reasoning, not bare arithmetic.
- Distribute correct answers roughly evenly across A/B/C/D — don't cluster on A.
- For math: SHOW WORK in explanation. Compute the answer twice independently before committing.
- Plain text only. NO LaTeX \\( \\), markdown, or HTML. Use Unicode: x², √(2), π, ½, ±, ×, ÷.
- Each question is independent (no shared passage unless test format requires).
- Title should be specific.
- timeLimitMinutes = ${minutes}; section = section label.
- Explanations: 1-2 sentences. Mention the trap when relevant.
`.trim()

  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const t0 = Date.now()
  const result = await generateObject({
    model: openai('gpt-4o'),
    schema: TestSchema,
    prompt,
    temperature: 0.2,
  })
  const dt = ((Date.now() - t0) / 1000).toFixed(1)

  let questions = result.object.questions as Question[]
  const rawCount = questions.length
  questions = questions.map(sanitizeQuestion)
  questions = dedupeByPrompt(questions)
  const afterDedupe = questions.length
  console.log(`Raw: ${rawCount} → after sanitize+dedupe: ${afterDedupe}`)
  console.log(`Running verifier...`)
  const tv0 = Date.now()
  const mathHeavy = ctx.testSection?.toLowerCase().includes('math') ?? false
  const v = await verifyAndCorrect(questions, process.env.OPENAI_API_KEY!, { mathHeavy })
  questions = v.kept.map((q, i) => shuffleChoices(q, i + 1))
  if (questions.length > count) questions = questions.slice(0, count)
  console.log(`Verify: dropped=${v.dropped}, corrected=${v.corrected}, final=${questions.length} in ${((Date.now() - tv0)/1000).toFixed(1)}s`)

  const test = { ...result.object, questions }
  console.log(`\n=== GENERATED in ${dt}s ===`)
  console.log(`Title: ${test.title}`)
  console.log(`Time: ${test.timeLimitMinutes} min`)
  console.log(`Section: ${test.section}`)
  console.log(`Questions: ${test.questions.length}`)
  console.log(`Choice counts: ${[...new Set(test.questions.map(q => q.choices.length))].join(', ')}`)
  console.log(`Difficulty mix: ${JSON.stringify(test.questions.reduce((acc, q) => ({ ...acc, [q.difficulty]: (acc[q.difficulty] ?? 0) + 1 }), {} as Record<string, number>))}`)
  console.log(`Tokens: in=${result.usage?.inputTokens} out=${result.usage?.outputTokens}\n`)

  console.log('=== SAMPLE QUESTIONS (first 3) ===\n')
  for (const [i, q] of test.questions.slice(0, 3).entries()) {
    console.log(`${i + 1}. [${q.difficulty}] ${q.prompt}`)
    q.choices.forEach((c, j) => {
      const marker = c === q.correct_answer ? '✓' : ' '
      console.log(`   ${marker} ${String.fromCharCode(65 + j)}) ${c}`)
    })
    console.log(`   Explanation: ${q.explanation}\n`)
  }

  const outPath = resolve(process.cwd(), `tmp-test-${slug}-${Date.now()}.json`)
  writeFileSync(outPath, JSON.stringify(test, null, 2))
  console.log(`Full test JSON written to: ${outPath}`)
}

main().catch(err => { console.error(err); process.exit(1) })
