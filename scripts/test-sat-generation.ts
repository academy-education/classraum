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
import { renderTestSpecCached, defaultsForTestSectionCached, loadSectionSpec } from '../src/lib/test-spec-cache'
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
  'toefl-reading': '33af1b61-bd97-4bd3-9cbf-843f9bb8a2a9',
  'toefl-listening': '1ac8d73b-1e16-4a18-9e79-7fe2f012a202',
  'toefl-writing': 'b6712354-2de8-4b7d-8b74-64cc7a520bba',
  'toefl-speaking': '0c729add-5617-4fbe-8a35-2af9f521757d',
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
  const sectionSpec = await loadSectionSpec(ctx.testFamily, ctx.testSection)
  const mix = sectionSpec?.difficultyMix ?? { easy: 0.30, medium: 0.50, hard: 0.20 }
  const targetHard = Math.round(count * mix.hard)
  const targetEasyMed = count - targetHard
  console.log(`Difficulty mix: ${JSON.stringify(mix)} → target ${targetEasyMed} easy/med + ${targetHard} hard\n`)

  const buffer = Math.max(3, Math.ceil(count * 0.25))
  const hardBuffer = Math.max(4, targetHard)
  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const t0 = Date.now()

  // Pass 1: easy + medium
  console.log(`Pass 1: generating ${targetEasyMed + buffer} easy/medium items...`)
  const easyMedResult = await generateObject({
    model: openai('gpt-4o'),
    schema: TestSchema,
    prompt: `Generate ${targetEasyMed + buffer} multiple-choice questions for ${topicName}.\n\n${testPrepBlock}\n\nRules:\n- Difficulty: ONLY easy or medium. NO hard items (those come from a separate pass).\n- About 40% easy, 60% medium.\n- Match the test's real format.\n- Wrong answers reflect the test's actual trap patterns.\n- Distribute correct answers across A/B/C/D.\n- For math: SHOW WORK in explanation. Compute answer twice.\n- Plain text only. NO LaTeX, markdown. Use Unicode: x², √(2), π, ½, ±, ×, ÷.\n- timeLimitMinutes = ${minutes}; section = section label.`,
    temperature: 0.2,
  })

  // Pass 2: hard only
  const hardFraming = sectionSpec?.hardItemFraming_en ?? 'A HARD item requires 3+ reasoning steps, OR requires translating prose into a formal statement before solving, OR turns on a subtle distinction.'
  const hardExamples = sectionSpec?.hardItemExamples_en ?? []
  const examplesBlock = hardExamples.length > 0
    ? `\n\nHere are VERIFIED hard items for this section. Do NOT copy them — but match this depth and structure when you create new items:\n\n${hardExamples.join('\n\n')}\n`
    : ''
  console.log(`Pass 2: generating ${targetHard + hardBuffer} HARD-only items + ${hardExamples.length} few-shot examples...`)
  const hardResult = await generateObject({
    model: openai('gpt-4o'),
    schema: TestSchema,
    prompt: `Generate ${targetHard + hardBuffer} HARD discriminating items for the ${topicName} test. ALL difficulty = "hard".\n\n${testPrepBlock}\n\nWhat a HARD item looks like for THIS section:\n${hardFraming}${examplesBlock}\n\nRules:\n- Every item's difficulty field is "hard". NO easy or medium.\n- Each item must meet the framing/examples above — multi-step reasoning, subtle distinctions, non-obvious setup.\n- ABSOLUTELY NO trivial items like "solve 2x+3=11" or "what is the area of a rectangle".\n- Sophisticated traps for THIS specific hard type.\n- Distribute correct answers across A/B/C/D.\n- For math: SHOW WORK. Compute answer twice.\n- Plain text only. Unicode for math.\n- Choice text contains ONLY answer content, no "A)" prefix.\n- timeLimitMinutes = ${minutes}; section = section label.`,
    temperature: 0.3,
  })
  const dt = ((Date.now() - t0) / 1000).toFixed(1)

  let questions = [...easyMedResult.object.questions, ...hardResult.object.questions] as Question[]
  console.log(`Generated: ${easyMedResult.object.questions.length} easy/med + ${hardResult.object.questions.length} hard = ${questions.length} total`)
  questions = questions.map(sanitizeQuestion)
  questions = dedupeByPrompt(questions)
  console.log(`After dedupe: ${questions.length}`)

  console.log(`Running verifier...`)
  const tv0 = Date.now()
  const mathHeavy = ctx.testSection?.toLowerCase().includes('math') ?? false
  const v = await verifyAndCorrect(questions, process.env.OPENAI_API_KEY!, { mathHeavy })
  console.log(`Verify in ${((Date.now() - tv0)/1000).toFixed(1)}s: dropped=${v.dropped}, corrected=${v.corrected}, relabeled=${v.relabeled}`)

  const verifiedHard = v.kept.filter(q => q.difficulty === 'hard')
  const verifiedEasyMed = v.kept.filter(q => q.difficulty !== 'hard')
  console.log(`Verified buckets: ${verifiedEasyMed.length} easy/med, ${verifiedHard.length} hard`)

  const hardSlice = verifiedHard.slice(0, targetHard)
  const easyMedSlice = verifiedEasyMed.slice(0, count - hardSlice.length)
  questions = [...easyMedSlice, ...hardSlice].map((q, i) => shuffleChoices(q, (i + 1) * 31))

  const test = { ...easyMedResult.object, questions }
  console.log(`\n=== GENERATED in ${dt}s ===`)
  console.log(`Title: ${test.title}`)
  console.log(`Time: ${test.timeLimitMinutes} min`)
  console.log(`Section: ${test.section}`)
  console.log(`Questions: ${test.questions.length}`)
  console.log(`Choice counts: ${[...new Set(test.questions.map(q => q.choices.length))].join(', ')}`)
  console.log(`Difficulty mix: ${JSON.stringify(test.questions.reduce((acc, q) => ({ ...acc, [q.difficulty]: (acc[q.difficulty] ?? 0) + 1 }), {} as Record<string, number>))}`)
  const totalIn = (easyMedResult.usage?.inputTokens ?? 0) + (hardResult.usage?.inputTokens ?? 0)
  const totalOut = (easyMedResult.usage?.outputTokens ?? 0) + (hardResult.usage?.outputTokens ?? 0)
  console.log(`Tokens (gen only): in=${totalIn} out=${totalOut}\n`)

  console.log('=== HARD QUESTIONS ===\n')
  const hardQs = test.questions.filter((q: Question) => q.difficulty === 'hard')
  for (const [i, q] of hardQs.entries()) {
    console.log(`${i + 1}. ${q.prompt}`)
    q.choices.forEach((c: string, j: number) => {
      const marker = c === q.correct_answer ? '✓' : ' '
      console.log(`   ${marker} ${String.fromCharCode(65 + j)}) ${c}`)
    })
    console.log(`   Explanation: ${q.explanation}\n`)
  }

  console.log('=== SAMPLE EASY/MED (first 3) ===\n')
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
