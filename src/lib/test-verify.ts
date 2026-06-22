/**
 * Post-generation quality pass for full mock tests. Three goals:
 *
 *   1. CORRECTNESS — recompute each question's answer with a fresh
 *      model call that doesn't see the original "correct_answer".
 *      Drop or correct any question where the verifier disagrees in
 *      a way that suggests the original key was wrong.
 *
 *   2. ANTI-BIAS — shuffle the choices array so the correct answer
 *      doesn't sit in position A every time. Without this, generated
 *      tests cluster correct answers in position A and a student who
 *      always picks A scores ~95%, defeating the test.
 *
 *   3. SANITIZE — strip LaTeX-style \( \) wrappers (the UI doesn't
 *      render them) and convert common math symbols to Unicode.
 *
 * Verification adds one gpt-4o-mini call per ~10 questions (batched)
 * so it's cheap (~$0.005 per test) and fast.
 */

import { generateObject } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { z } from 'zod'

export interface Question {
  prompt: string
  type: 'multiple_choice'
  choices: string[]
  correct_answer: string
  difficulty: 'easy' | 'medium' | 'hard'
  explanation: string
}

const VerifierItemSchema = z.object({
  index: z.number().int(),
  /** Chain-of-thought solve. Forces the model to actually work the problem
   *  step-by-step instead of pattern-matching against the explanation. */
  work: z.string().describe('Step-by-step solution from scratch, showing every arithmetic step. Do NOT shortcut.'),
  verified_answer: z.string().describe('After completing "work", the answer text — must match one of the choices verbatim, or "NONE" if your work produced a value not in any choice.'),
  confidence: z.enum(['high', 'medium', 'low']),
})

const VerifierBatchSchema = z.object({
  items: z.array(VerifierItemSchema),
})

/**
 * Independent re-solve of each question. The verifier sees the prompt
 * + choices but NOT the original correct_answer or explanation, so it
 * has to compute from scratch.
 */
export async function verifyAndCorrect(
  questions: Question[],
  apiKey: string,
  opts: { mathHeavy?: boolean } = {}
): Promise<{ kept: Question[]; dropped: number; corrected: number }> {
  const openai = createOpenAI({ apiKey })
  // gpt-4o-mini's arithmetic is unreliable enough to MISS bad answer keys
  // on SAT-Math-style items. Pay for gpt-4o on math-heavy sections.
  const model = opts.mathHeavy ? openai('gpt-4o') : openai('gpt-4o-mini')
  // Smaller batch when using gpt-4o — gives each item more attention
  // and avoids hitting output-token caps with the chain-of-thought field.
  const BATCH = opts.mathHeavy ? 6 : 10
  const verified: Question[] = []
  let corrected = 0
  let dropped = 0

  for (let i = 0; i < questions.length; i += BATCH) {
    const batch = questions.slice(i, i + BATCH)
    const prompt = buildVerifierPrompt(batch)

    try {
      const result = await generateObject({
        model,
        schema: VerifierBatchSchema,
        prompt,
        temperature: 0.1,
      })
      const verdictByIndex = new Map(result.object.items.map(it => [it.index, it]))

      for (let j = 0; j < batch.length; j++) {
        const q = batch[j]
        const verdict = verdictByIndex.get(j)
        if (!verdict) { verified.push(q); continue }

        if (verdict.verified_answer === 'NONE') {
          // Verifier says no choice is correct → drop the question.
          dropped++
          continue
        }

        const matchedChoice = q.choices.find(c => normalize(c) === normalize(verdict.verified_answer))
        if (!matchedChoice) {
          // Verifier returned an answer not literally in the choices.
          // Low-confidence → keep original. High-confidence + no match
          // means the question itself is broken — drop it.
          if (verdict.confidence === 'high') dropped++
          else verified.push(q)
          continue
        }

        if (matchedChoice !== q.correct_answer) {
          if (verdict.confidence === 'high') {
            // Trust the verifier — original key was wrong.
            verified.push({ ...q, correct_answer: matchedChoice })
            corrected++
          } else {
            // Low/medium confidence disagreement — keep original.
            verified.push(q)
          }
        } else {
          verified.push(q)
        }
      }
    } catch (err) {
      console.error('[test-verify] batch failed; keeping originals', err)
      verified.push(...batch)
    }
  }

  return { kept: verified, dropped, corrected }
}

function buildVerifierPrompt(batch: Question[]): string {
  const items = batch.map((q, i) => {
    const choices = q.choices.map((c, j) => `${String.fromCharCode(65 + j)}. ${c}`).join('\n')
    return `[${i}] ${q.prompt}\n${choices}`
  }).join('\n\n---\n\n')

  return `
You are verifying answer keys for a standardized-test mock exam. For each question, solve it INDEPENDENTLY from scratch — do NOT assume the test-writer was correct. There is no explanation provided; you must do the work yourself.

For each question, output:
  - index: 0-based number matching the [N] tag
  - work: STEP-BY-STEP solution. For math, write out every algebra step. For reading, identify what the passage actually says. Do not skip steps. Do not pattern-match — actually compute.
  - verified_answer: the EXACT TEXT of the correct choice (copy it verbatim, no letter prefix). If after your full re-solve you cannot find a choice that is correct, output "NONE".
  - confidence: high (your work is rigorous and matches a choice), medium (you're confident but the problem has some ambiguity), low (you're guessing)

Critical: many questions you'll see have WRONG answer keys baked in by the original generator. Common errors to catch:
- Algebra: 2x - 3y = 6, x + y = 5 → solve y = 5 - x, substitute: 2x - 3(5-x) = 6 → 2x - 15 + 3x = 6 → 5x = 21 → x = 4.2 (NOT 3, NOT 5)
- Arithmetic: 4($1.50) + 3($2.50) = $6.00 + $7.50 = $13.50 (NOT $12.50)
- Substitution: f(x) = 3x² - 5x + 2, f(2) = 12 - 10 + 2 = 4 (NOT 8)
- Answer not in choices: if your computed value isn't among the choices, output NONE — do NOT pick the closest one.

Questions to verify:

${items}
`.trim()
}

/** Strip LaTeX \( \) wrappers and convert common math to Unicode. The
 *  UI renders plain strings; \( \) shows up literally. */
function sanitize(s: string): string {
  return s
    .replace(/\\\(\s*/g, '')
    .replace(/\s*\\\)/g, '')
    .replace(/\\\[\s*/g, '')
    .replace(/\s*\\\]/g, '')
    .replace(/\\pi\b/g, 'π')
    .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
    .replace(/\\times\b/g, '×')
    .replace(/\\div\b/g, '÷')
    .replace(/\\pm\b/g, '±')
    .replace(/\\cdot\b/g, '·')
    .replace(/\\degree\b|\^\\circ\b/g, '°')
    .replace(/\^(\d)/g, (_m, n) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[parseInt(n)])
    .replace(/_(\d)/g, (_m, n) => '₀₁₂₃₄₅₆₇₈₉'[parseInt(n)])
    .replace(/\s+/g, ' ')
    .trim()
}

export function sanitizeQuestion(q: Question): Question {
  return {
    ...q,
    prompt: sanitize(q.prompt),
    choices: q.choices.map(sanitize),
    correct_answer: sanitize(q.correct_answer),
    explanation: sanitize(q.explanation),
  }
}

/**
 * Fisher-Yates shuffle of choices, preserving correct_answer pointer.
 * Uses a seeded pseudo-random so the same question always shuffles
 * the same way (deterministic for caching).
 */
export function shuffleChoices(q: Question, seed: number): Question {
  const choices = [...q.choices]
  let s = seed
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x100000000
  }
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[choices[i], choices[j]] = [choices[j], choices[i]]
  }
  return { ...q, choices }
}

/**
 * Drop duplicate prompts (the model occasionally repeats itself in
 * large batches). Keeps the first occurrence.
 */
export function dedupeByPrompt(questions: Question[]): Question[] {
  const seen = new Set<string>()
  const out: Question[] = []
  for (const q of questions) {
    const key = q.prompt.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 100)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(q)
  }
  return out
}

/**
 * String-string normalization for choice comparison: handles whitespace,
 * trailing punctuation, common spaces vs no-spaces in math.
 */
function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '').replace(/[.,;:]+$/, '').trim()
}
