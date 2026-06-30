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

export type QuestionType =
  | 'multiple_choice' | 'numeric_entry' | 'multi_select' | 'three_choice' | 'quant_comparison'
  // TOEFL Jan-2026 task-type variants. None of these go through the
  // re-solve verifier or the standard MC choice-count filter — see
  // sanitizeQuestion + verifyAndCorrect + dedupeByPrompt for the
  // type-aware handling.
  | 'fill_in_blanks' | 'arrange_words' | 'speaking_repeat' | 'speaking_interview'

/** Set of types whose grading + rendering bypass the standard MC
 *  pipeline. Verifier skips them (no comparable choices), choice-count
 *  filter skips them, and dedupe uses a richer key (prompt is often
 *  identical across items of the same type). */
export const NON_MC_TYPES: ReadonlySet<QuestionType> = new Set<QuestionType>([
  'numeric_entry', 'multi_select',
  'fill_in_blanks', 'arrange_words', 'speaking_repeat', 'speaking_interview',
])

/** Post-sanitize Question — all fields are concrete. Downstream code
 *  (verifier, choice filter, UI) reads these directly. */
export interface Question {
  passage: string | null
  passageGroupId: string | null
  prompt: string
  type: QuestionType
  choices: string[]
  correct_answer: string
  correct_answers: string[] | null
  acceptable_answers: string[] | null
  difficulty: 'easy' | 'medium' | 'hard'
  explanation: string
  /** Why each wrong choice is wrong, paired by choice text. Empty
   *  array for non-MC types or older items the model didn't produce
   *  rationales for. UI uses these to show trap explanations. */
  distractor_rationales: { choice: string; reason: string }[]
  /** TOEFL Complete-the-Words (fill_in_blanks): per-blank correct
   *  fragment keyed by [N] placeholder id. Null for all other types. */
  blanks: { id: number; answer: string; alternates?: string[] | null }[] | null
  /** Optional visual asset. Permissive shape — UI dispatches on
   *  `type` and falls back gracefully on unknown shapes. */
  graphic: QuestionGraphic | null
}

/** Discriminated by `type`. All sub-payloads are intentionally loose
 *  (typed as `unknown`/optional) — model output is best-effort and
 *  the UI renderer tolerates missing pieces. `rawSvg` is the escape
 *  hatch for irregular shapes. */
export interface QuestionGraphic {
  type?: string | null
  xLabel?: string | null
  yLabel?: string | null
  points?: unknown[] | null
  series?: unknown[] | null
  bestFit?: unknown
  bars?: unknown[] | null
  values?: unknown[] | null
  rowLabels?: string[] | null
  colLabels?: string[] | null
  cells?: unknown[][] | null
  shape?: string | null
  spec?: unknown
  labels?: unknown
  svg?: string | null
  caption?: string | null
}

/** Pre-sanitize shape — what the model emits, with optional/nullable
 *  fields. sanitizeQuestion normalizes this into the concrete Question
 *  shape above. Used by the AI SDK output cast in the route. */
export interface RawQuestion {
  passage?: string | null
  passageGroupId?: string | null
  prompt: string
  type?: QuestionType | null
  choices?: string[]
  correct_answer?: string
  correct_answers?: string[] | null
  acceptable_answers?: string[] | null
  difficulty: 'easy' | 'medium' | 'hard'
  explanation: string
  distractor_rationales?: Array<{ choice?: string | null; reason?: string | null }> | null
  /** TOEFL Complete-the-Words (fill_in_blanks): per-blank answers. */
  blanks?: Array<{ id: number; answer: string; alternates?: string[] | null }> | null
  graphic?: QuestionGraphic | null
}

const VerifierItemSchema = z.object({
  index: z.number().int(),
  /** Chain-of-thought solve. Forces the model to actually work the problem
   *  step-by-step instead of pattern-matching against the explanation. */
  work: z.string().describe('Step-by-step solution from scratch, showing every arithmetic step. Do NOT shortcut.'),
  verified_answer: z.string().describe('After completing "work", the answer text — must match one of the choices verbatim, or "NONE" if your work produced a value not in any choice.'),
  confidence: z.enum(['high', 'medium', 'low']),
  /** Independent re-rating of difficulty. Used to detect mislabeled hard
   *  items (the model claims a question is hard but the verifier solves
   *  it in one step). */
  actual_difficulty: z.enum(['easy', 'medium', 'hard']),
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
  opts: { mathHeavy?: boolean; verbalHeavy?: boolean } = {}
): Promise<{ kept: Question[]; dropped: number; corrected: number; relabeled: number }> {
  const openai = createOpenAI({ apiKey })
  // gpt-4o-mini's arithmetic is unreliable on SAT-Math-style items, and
  // its close-reading is unreliable on SAT R&W / KSAT 국어 / TOEFL
  // Reading style items (it "corrects" inference items by picking the
  // surface-vocabulary match, the very trap the real distractor uses).
  // Pay for gpt-4o on either kind of accuracy-critical section.
  const usePrecise = opts.mathHeavy || opts.verbalHeavy
  const model = usePrecise ? openai('gpt-4o') : openai('gpt-4o-mini')
  // Bumped batch sizes — fewer total API calls means lower wall-clock
  // even with the same parallelism. gpt-4o handles 10 items per batch
  // without hitting the 16k output cap (chain-of-thought work field
  // ≈ 150 tokens per item × 10 ≈ 1500 tokens, plus passages where
  // present, well under the cap).
  const BATCH = usePrecise ? 10 : 12
  const verified: Question[] = []
  let corrected = 0
  let dropped = 0
  let relabeled = 0

  // Split: only single-correct-answer choice-based types go through
  // the re-solve verifier. numeric_entry + multi_select require open-
  // ended grading the verifier prompt can't easily express; trust the
  // generator for those (acceptable — generation prompt already asks
  // the model to show work). Easy-labeled items also pass through
  // unchanged: the generator is highly reliable for easy MCs, and
  // verifying them is the slowest part of the pipeline. The verifier
  // earns its keep on medium + hard where the generator's answer keys
  // and difficulty labels are noisier.
  const verifiable: Question[] = []
  const passthrough: Question[] = []
  for (const q of questions) {
    // NON_MC_TYPES (numeric_entry + multi_select + the 4 TOEFL Jan-2026
    // task-type variants) all bypass the re-solve verifier — they
    // either grade open-endedly or don't have a comparable single
    // "verified_answer" the verifier prompt can output.
    const skipVerify = NON_MC_TYPES.has(q.type) || q.difficulty === 'easy'
    if (skipVerify) passthrough.push(q)
    else verifiable.push(q)
  }
  verified.push(...passthrough)

  // Process all batches IN PARALLEL — the verifier dominates wall-
  // clock for any test >30 items, and OpenAI's RPM limit (Tier 4+ =
  // 5000/min for gpt-4o) easily handles ~15 concurrent batches.
  // Sequential was 12 × 5-8s = 60-100s for SAT R&W; parallel is
  // max(batch latencies) = ~5-8s.
  const batches: Question[][] = []
  for (let i = 0; i < verifiable.length; i += BATCH) {
    batches.push(verifiable.slice(i, i + BATCH))
  }

  type BatchResult = { kept: Question[]; corrected: number; dropped: number; relabeled: number }

  const processBatch = async (batch: Question[], batchIdx: number): Promise<BatchResult> => {
    const local: BatchResult = { kept: [], corrected: 0, dropped: 0, relabeled: 0 }
    try {
      const result = await generateObject({
        model,
        schema: VerifierBatchSchema,
        prompt: buildVerifierPrompt(batch),
        temperature: 0.1,
      })
      const verdictByIndex = new Map(result.object.items.map(it => [it.index, it]))
      for (let j = 0; j < batch.length; j++) {
        const q = batch[j]
        const verdict = verdictByIndex.get(j)
        if (!verdict) { local.kept.push(q); continue }
        if (verdict.verified_answer === 'NONE') { local.dropped++; continue }
        const matchedChoice = q.choices.find(c => normalize(c) === normalize(verdict.verified_answer))
        if (!matchedChoice) {
          if (verdict.confidence === 'high') local.dropped++
          else local.kept.push(q)
          continue
        }
        const finalDifficulty = verdict.actual_difficulty
        if (finalDifficulty !== q.difficulty) local.relabeled++
        if (matchedChoice !== q.correct_answer) {
          if (verdict.confidence === 'high') {
            local.kept.push({ ...q, correct_answer: matchedChoice, difficulty: finalDifficulty })
            local.corrected++
          } else {
            local.kept.push({ ...q, difficulty: finalDifficulty })
          }
        } else {
          local.kept.push({ ...q, difficulty: finalDifficulty })
        }
      }
    } catch (err) {
      console.error(`[test-verify] batch ${batchIdx} failed; retrying per-item in parallel`, (err as Error).message)
      // Fall back to per-item retries — also in parallel — so a single
      // bad batch doesn't stall the whole verification phase.
      const perItemResults = await Promise.all(batch.map(async (q): Promise<BatchResult> => {
        const sub: BatchResult = { kept: [], corrected: 0, dropped: 0, relabeled: 0 }
        try {
          const single = await generateObject({
            model,
            schema: VerifierBatchSchema,
            prompt: buildVerifierPrompt([q]),
            temperature: 0.1,
          })
          const verdict = single.object.items[0]
          if (!verdict) { sub.dropped++; return sub }
          if (verdict.verified_answer === 'NONE') { sub.dropped++; return sub }
          const matchedChoice = q.choices.find(c => normalize(c) === normalize(verdict.verified_answer))
          const finalDifficulty = verdict.actual_difficulty
          if (finalDifficulty !== q.difficulty) sub.relabeled++
          if (!matchedChoice) {
            if (verdict.confidence === 'high') sub.dropped++
            else sub.kept.push({ ...q, difficulty: finalDifficulty })
            return sub
          }
          if (matchedChoice !== q.correct_answer && verdict.confidence === 'high') {
            sub.kept.push({ ...q, correct_answer: matchedChoice, difficulty: finalDifficulty })
            sub.corrected++
          } else {
            sub.kept.push({ ...q, difficulty: finalDifficulty })
          }
        } catch (innerErr) {
          console.error('[test-verify] per-item retry also failed; dropping', (innerErr as Error).message)
          sub.dropped++
        }
        return sub
      }))
      for (const r of perItemResults) {
        local.kept.push(...r.kept)
        local.corrected += r.corrected
        local.dropped += r.dropped
        local.relabeled += r.relabeled
      }
    }
    return local
  }

  const allResults = await Promise.all(batches.map(processBatch))
  for (const r of allResults) {
    verified.push(...r.kept)
    corrected += r.corrected
    dropped += r.dropped
    relabeled += r.relabeled
  }

  return { kept: verified, dropped, corrected, relabeled }
}

function buildVerifierPrompt(batch: Question[]): string {
  const items = batch.map((q, i) => {
    const choices = q.choices.map((c, j) => `${String.fromCharCode(65 + j)}. ${c}`).join('\n')
    const passageBlock = q.passage ? `PASSAGE:\n${q.passage}\n\n` : ''
    return `[${i}] ${passageBlock}${q.prompt}\n${choices}`
  }).join('\n\n---\n\n')

  return `
You are verifying answer keys AND difficulty labels for a standardized-test mock exam. For each question, solve it INDEPENDENTLY from scratch — do NOT assume the test-writer was correct. There is no explanation provided; you must do the work yourself.

For each question, output:
  - index: 0-based number matching the [N] tag
  - work: STEP-BY-STEP solution. For math, write out every algebra step. For reading, identify what the passage actually says. Do not skip steps. Do not pattern-match — actually compute.
  - verified_answer: the EXACT TEXT of the correct choice (copy it verbatim, no letter prefix). If after your full re-solve you cannot find a choice that is correct, output "NONE".
  - confidence: high (your work is rigorous and matches a choice), medium (you're confident but the problem has some ambiguity), low (you're guessing)
  - actual_difficulty: how hard was the question ACTUALLY? Independent of any label the writer used.
    * easy = one step, no genuine challenge — a prepared student gets it in <30s
    * medium = 2 steps, OR one step with a non-obvious technique choice; needs ~60s
    * hard = 3+ steps OR a word problem requiring prose-to-math translation OR a question with a substantial trap (test-prep difficulty, not olympiad). Real SAT/ACT/KSAT hard items are NOT "expert insight" — they're well-executed multi-step problems with sophisticated distractors. A multi-step word problem about revenue/cost modeling, a geometry problem requiring completing the square, or a system of equations with a careful sign distinction all qualify as hard.

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
 *  UI renders plain strings; \( \) shows up literally. Also strips
 *  leading "A) " / "1. " / "(A) " position labels that the model
 *  sometimes embeds in choice text — these collide with the shuffle. */
function sanitize(s: string): string {
  return s
    .replace(/^\s*\(?[A-Ea-e][\)\.\:]\s+/, '')  // strip leading "A) ", "(A) ", "a. ", etc.
    .replace(/^\s*[1-9][\)\.\:]\s+/, '')        // strip leading "1) ", "1. "
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

export function sanitizeQuestion(q: RawQuestion): Question {
  // Normalize all model-omitted fields to concrete defaults — the
  // schema accepts both `null` and missing-field, but the rest of
  // the pipeline expects concrete values. Fixes Zod-parsed items
  // arriving with undefined choices/correct_answer/type/etc.
  // Dedupe choices: occasionally the model emits two identical
  // strings (e.g. "5" and "5") which would make the question
  // unanswerable. Compare on trimmed-lowercase form; keep first.
  const rawChoices = (q.choices ?? []).map(sanitize)
  const seenChoiceKeys = new Set<string>()
  const choices = rawChoices.filter(c => {
    const key = c.trim().toLowerCase()
    if (!key || seenChoiceKeys.has(key)) return false
    seenChoiceKeys.add(key)
    return true
  })
  return {
    ...q,
    passage: q.passage ? sanitize(q.passage) : null,
    passageGroupId: q.passageGroupId ?? null,
    prompt: sanitize(q.prompt),
    type: q.type ?? 'multiple_choice',
    choices,
    correct_answer: sanitize(q.correct_answer ?? ''),
    correct_answers: q.correct_answers ?? null,
    acceptable_answers: q.acceptable_answers ?? null,
    explanation: sanitize(q.explanation),
    // Filter out malformed rationale entries (model occasionally
    // emits {choice: null, reason: "..."} or vice versa). Salvage
    // the well-formed ones, drop the rest — better than failing the
    // whole batch over a single bad entry.
    distractor_rationales: (q.distractor_rationales ?? [])
      .filter(d => d && typeof d.choice === 'string' && typeof d.reason === 'string' && d.choice && d.reason)
      .map(d => ({ choice: sanitize(d.choice as string), reason: sanitize(d.reason as string) })),
    // TOEFL fill_in_blanks payload — preserve verbatim. Filter out
    // malformed entries (model occasionally emits null answers).
    blanks: (q.blanks ?? null) && Array.isArray(q.blanks)
      ? q.blanks!
          .filter(b => b && typeof b.id === 'number' && typeof b.answer === 'string' && b.answer.length > 0)
          .map(b => ({ id: b.id, answer: sanitize(b.answer), alternates: b.alternates ?? null }))
      : null,
    // Pass graphic through unchanged — UI renderer handles shape
    // validation and falls back to nothing on malformed data.
    graphic: q.graphic ?? null,
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
  const compact = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()
  for (const q of questions) {
    // Include passage in the dedupe key so SAT R&W items aren't
    // collapsed when many questions share the same boilerplate stem
    // ("Which choice most logically completes the text?") but pair
    // with different passages.
    const passageKey = q.passage ? compact(q.passage).slice(0, 60) : ''
    const promptKey = compact(q.prompt).slice(0, 100)
    // Type-aware tail: TOEFL Jan-2026 task-type variants share the
    // SAME prompt across every item ("[Complete the Words] Read…",
    // "[Build a Sentence] Tap…"), so deduping on (passage, prompt)
    // alone would collapse the whole batch to one item. For these
    // types the discriminating field lives elsewhere:
    //   - fill_in_blanks: the paragraph (passage) — already keyed
    //   - arrange_words / speaking_repeat: correct_answer is unique
    //   - speaking_interview: the prompt IS unique (each Q stem differs)
    const tail = q.type === 'arrange_words' || q.type === 'speaking_repeat'
      ? compact(q.correct_answer).slice(0, 100)
      : ''
    const key = `${q.type ?? 'mc'}::${passageKey}::${promptKey}::${tail}`
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
