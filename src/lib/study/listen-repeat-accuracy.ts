/**
 * Score a Listen-and-Repeat answer WITHOUT a model call.
 *
 * The student hears one sentence and repeats it. We know exactly what
 * they were asked to say, so "how close was that?" is arithmetic, not
 * judgement — and 7 of Speaking's 11 items are this task. Grading them
 * deterministically takes the majority of the section off an AI grader
 * that is currently 1-2 bands harsh, costs nothing, and cannot drift.
 *
 * The bands below are the official ETS Listen-and-Repeat descriptors
 * (Speaking Scoring Guide, 2025), which are unusually mechanical for a
 * rubric — they talk about function words, content words, transpositions
 * and fragments rather than about ideas:
 *
 *   5  Exact repetition, fully intelligible.
 *   4  Meaning captured, not exact: one or two function words missing or
 *      changed, a content word missing or replaced with a related word,
 *      tense/aspect/number markers off, or two words transposed.
 *   3  Essentially a full sentence, but the original meaning is NOT
 *      accurately captured. A majority of content words are present.
 *   2  A significant part is missing and/or the response is highly
 *      inaccurate; meaning is fragmentary.
 *   1  Very little of the prompt; a minimal response of a few words.
 *   0  No response, or nothing usable.
 *
 * WHAT THIS CANNOT SEE. Every band above also has an intelligibility
 * clause, and we score a Whisper transcript, not audio — a word Whisper
 * guessed correctly from unclear speech reads here as correct. So this
 * measures repetition accuracy only. Pronunciation lives in the speech
 * signals (clarity, wpm, pauses) captured separately, and a band 4 here
 * with a clarity of 0.3 is not the same performance as a band 4 with
 * 0.95. Do not present this as a full ETS Listen-and-Repeat score.
 */

/** Closed-class words. The ETS descriptors treat these as cheap to lose
 *  — "one or two function words may be missing or changed" still scores
 *  4 — while a missing content word costs more. */
const FUNCTION_WORDS = new Set([
  'a', 'an', 'the', 'and', 'but', 'or', 'nor', 'so', 'yet', 'for',
  'of', 'to', 'in', 'on', 'at', 'by', 'with', 'from', 'up', 'down',
  'out', 'off', 'over', 'under', 'into', 'onto', 'about', 'as', 'than',
  'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being',
  'do', 'does', 'did', 'have', 'has', 'had',
  'will', 'would', 'shall', 'should', 'can', 'could', 'may', 'might', 'must',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'its', 'our', 'their', 'this', 'that', 'these', 'those',
  'there', 'here', 'not', 'no', 'if', 'then', 'because', 'when', 'while',
])

export interface RepeatAccuracy {
  /** 0-5, the ETS band. */
  score: number
  /** Why, in one line — shown to the student in review. */
  reason: string
  /** Diagnostics, for the verify script and for tuning. */
  detail: {
    exact: boolean
    contentRecall: number
    lengthRatio: number
    contentMissing: string[]
    functionDiffs: number
    transposed: boolean
  }
}

const normalise = (s: string): string[] =>
  s.toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)

const isContent = (w: string) => !FUNCTION_WORDS.has(w)

/** Multiset difference: how many of `want` are absent from `have`. */
function missingFrom(want: string[], have: string[]): string[] {
  const pool = new Map<string, number>()
  for (const w of have) pool.set(w, (pool.get(w) ?? 0) + 1)
  const missing: string[] = []
  for (const w of want) {
    const n = pool.get(w) ?? 0
    if (n > 0) pool.set(w, n - 1)
    else missing.push(w)
  }
  return missing
}

/** True when the two sequences hold the same words but two adjacent ones
 *  swapped — the ETS band-4 example "the small red box" / "the red small
 *  box". Only a single adjacent swap counts. */
function isSingleTransposition(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const diffs: number[] = []
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diffs.push(i)
  if (diffs.length !== 2) return false
  const [i, j] = diffs as [number, number]
  return j === i + 1 && a[i] === b[j] && a[j] === b[i]
}

export function scoreListenRepeat(expected: string, actual: string): RepeatAccuracy {
  const want = normalise(expected)
  const have = normalise(actual)

  const wantContent = want.filter(isContent)
  const missingAll = missingFrom(want, have)
  const contentMissing = missingAll.filter(isContent)
  const functionDiffs = missingAll.length - contentMissing.length

  const contentRecall = wantContent.length === 0
    ? 1
    : (wantContent.length - contentMissing.length) / wantContent.length
  const lengthRatio = want.length === 0 ? 0 : have.length / want.length
  const transposed = isSingleTransposition(want, have)
  const exact = want.length === have.length && want.every((w, i) => w === have[i])

  const detail = { exact, contentRecall, lengthRatio, contentMissing, functionDiffs, transposed }
  const band = (score: number, reason: string): RepeatAccuracy => ({ score, reason, detail })

  if (have.length === 0) return band(0, 'No response was recorded.')
  if (exact) return band(5, 'Exact repetition.')

  // Band 4: "minor changes ... that do not substantially change the
  // meaning" — up to two function words, OR one content word, OR a
  // single transposition. Not several at once.
  const minorFunction = contentMissing.length === 0 && functionDiffs <= 2
  const oneContentWord = contentMissing.length === 1 && functionDiffs === 0
  if (transposed || minorFunction || oneContentWord) {
    return band(4, transposed
      ? 'Two words were swapped, but the meaning is intact.'
      : contentMissing.length === 1
        ? `Close — "${contentMissing[0]}" was missed.`
        : 'Only small connecting words differed.')
  }

  // Band 1 before 3/2: the descriptor is about how LITTLE was produced,
  // and a very short answer can still contain a high proportion of the
  // content words it happens to include.
  if (lengthRatio < 0.4) {
    return band(1, 'Only a few words of the sentence were repeated.')
  }

  // Band 3: "essentially full" and a majority of content words, but the
  // meaning is not accurately captured.
  if (lengthRatio >= 0.7 && contentRecall >= 0.5) {
    return band(3, `Most of the sentence came through, but ${contentMissing.length} key word(s) changed.`)
  }

  // Band 2: a significant part missing and/or highly inaccurate.
  return band(2, contentRecall < 0.5
    ? 'Much of the meaning was lost.'
    : 'A significant part of the sentence was missing.')
}
