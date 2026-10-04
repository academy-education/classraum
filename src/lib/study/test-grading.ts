/**
 * Full-test grading: the per-item verdict and the WEIGHTED contribution
 * each item makes to the session score.
 *
 * Moved verbatim out of api/study/test/submit/route.ts on 2026-10-04 so
 * it can be tested and so audits can recompute stored scores with the
 * SAME code that wrote them (a route file may export only handlers, so
 * it could not be imported). submit is still the only caller that
 * writes study_sessions.correct_count / total_count / score.
 */
// NOT from @/lib/test-verify: that module pulls in `ai`, and a jest suite
// reaching this through it dies at import with zero tests collected.
import { OPEN_RESPONSE_TYPES } from './openResponse'

/** Structural shape of a served question, as far as grading needs it. */
export interface GradableQuestion {
  type?: string | null
  correct_answer?: string | null
  correct_answers?: string[] | null
  acceptable_answers?: string[] | null
  blanks?: { id: number; answer: string; alternates?: string[] | null }[] | null
  /** false = unscored ETS pilot item. Absent/true = scored. */
  scored?: boolean | null
}

/** Open-response types have no objective answer key — they're scored
 *  by the gpt-4o rubric grader in the review pane, not here. Counting
 *  them as "correct" on a length check inflated the auto-score (a
 *  long-enough gibberish paste scored 100% on Writing), so they're
 *  excluded from the score denominator entirely. */
export function isOpenResponse(q: GradableQuestion): boolean {
  // Set lives in lib/test-verify so the client's completed-session
  // rehydration marks exactly the same items ungraded. See OPEN_RESPONSE_TYPES.
  // `type` is nullable in QuestionSchema (sanitizeQuestion normalises
  // absent fields to null), so coalesce — a null type is not open-response.
  return OPEN_RESPONSE_TYPES.has(q.type ?? '')
}

/** Weighted (per-blank) contribution of one question to the score.
 *  fill_in_blanks: total = number of blanks, correct = number of
 *  blanks whose typed letters match (answer or any alternate).
 *  Open-response (interview / email / discussion): total = 0 — rubric-
 *  graded separately, see isOpenResponse. Every other type: total = 1,
 *  correct = gradeAnswer verdict. */
export function weightedScore(
  q: GradableQuestion,
  studentAnswer: string | null,
): { total: number; correct: number } {
  if (isOpenResponse(q)) return { total: 0, correct: 0 }
  // Unscored ETS pilot item. total = 0 removes it from the denominator,
  // exactly as open-response items already are — but unlike those it is
  // still GRADED above, so the student sees the verdict in review and a
  // wrong pilot still reaches the wrong-answer notebook. Only the score
  // ignores it.
  //
  // This is what lets a section deliver 48 questions and score 35: it is
  // the only arrangement where Complete the Words keeps ETS's 57% weight,
  // because a CtW paragraph is quantised at 10 questions and the ratio is
  // only reachable at a 35-question total.
  if (q.scored === false) return { total: 0, correct: 0 }
  if (q.type === 'fill_in_blanks') {
    const blanks = q.blanks ?? []
    if (blanks.length === 0) return { total: 1, correct: 0 }
    const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')
    let picked: Record<string, string> = {}
    if (studentAnswer) {
      try {
        const parsed = JSON.parse(studentAnswer)
        if (parsed && typeof parsed === 'object') picked = parsed as Record<string, string>
      } catch { /* unparseable → all blanks wrong */ }
    }
    let correct = 0
    for (const b of blanks) {
      const val = norm(picked[String(b.id)] ?? '')
      if (!val) continue
      const accepted = [b.answer, ...(b.alternates ?? [])].map(norm)
      if (accepted.includes(val)) correct++
    }
    return { total: blanks.length, correct }
  }
  return { total: 1, correct: gradeAnswer(q, studentAnswer) ? 1 : 0 }
}

/** Type-aware grader. Each question variant has its own correctness
 *  rule: MC = exact choice match (case-insensitive trim), numeric_entry
 *  = student input matches any acceptable_answer (after normalization),
 *  multi_select = parsed JSON array equals correct_answers (order-
 *  insensitive set match). */
export function gradeAnswer(q: GradableQuestion, studentAnswer: string | null): boolean {
  if (studentAnswer == null || studentAnswer.trim() === '') return false
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

  if (q.type === 'numeric_entry') {
    const accepted = q.acceptable_answers ?? []
    if (accepted.length === 0) return false
    // Normalize both sides — strip whitespace, accept "12", "12.0",
    // "12/1" as equivalent if they appear in acceptable_answers.
    const studentNum = normalizeNumeric(studentAnswer)
    return accepted.some(a => normalizeNumeric(a) === studentNum)
  }

  if (q.type === 'multi_select') {
    const expected = q.correct_answers ?? []
    if (expected.length === 0) return false
    let picked: string[]
    try { picked = JSON.parse(studentAnswer) } catch { return false }
    if (!Array.isArray(picked)) return false
    // Strict SET equality — dedupes the picks first so ["A","A"]
    // can't masquerade as two distinct correct selections.
    const pickedSet = new Set(picked.map(p => norm(String(p))))
    const expectedSet = new Set(expected.map(norm))
    if (pickedSet.size !== expectedSet.size) return false
    for (const p of pickedSet) if (!expectedSet.has(p)) return false
    return true
  }

  // TOEFL Complete-the-Words: passage has [1] [2] [3] placeholders; student
  // submits JSON {"1":"s","2":"to",...}. All blanks must match (each blank
  // accepts answer or any alternate, case-insensitive trim).
  if (q.type === 'fill_in_blanks') {
    const blanks = q.blanks ?? []
    if (blanks.length === 0) return false
    let picked: Record<string, string>
    try { picked = JSON.parse(studentAnswer) } catch { return false }
    if (!picked || typeof picked !== 'object') return false
    for (const b of blanks) {
      const studentVal = norm(picked[String(b.id)] ?? '')
      if (!studentVal) return false
      const accepted = [b.answer, ...(b.alternates ?? [])].map(norm)
      if (!accepted.includes(studentVal)) return false
    }
    return true
  }

  // TOEFL Build-a-Sentence: choices are the word/phrase chips; student
  // submits the chips joined in chosen order with " | ". Compare to
  // correct_answer (same delimiter).
  if (q.type === 'arrange_words') {
    return norm(studentAnswer) === norm(q.correct_answer ?? '')
  }

  // TOEFL Listen-and-Repeat: the answer is a Whisper TRANSCRIPT of
  // the student's speech, which routinely differs from the target in
  // punctuation style (curly quotes, ellipses), casing, and small
  // lexical drift. Grade with Unicode-wide punctuation stripping +
  // a token-overlap threshold instead of brittle exact equality —
  // saying the sentence correctly should pass even if Whisper writes
  // "twenty" for "20" in one spot.
  if (q.type === 'speaking_repeat') {
    const stripPunct = (s: string) => s
      .toLowerCase()
      // ASCII + Unicode punctuation Whisper emits: curly quotes,
      // ellipsis, en/em dashes, guillemets.
      .replace(/[.,!?;:'"\-—–…‘’“”«»()]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    const a = stripPunct(studentAnswer)
    const b = stripPunct(q.correct_answer ?? '')
    if (!b) return false
    if (a === b) return true
    // Token-overlap similarity: fraction of target tokens present in
    // the transcript (multiset). ≥85% counts as a correct repetition.
    const tokensA = a.split(' ').filter(Boolean)
    const tokensB = b.split(' ').filter(Boolean)
    if (tokensB.length === 0) return false
    const pool = new Map<string, number>()
    for (const t of tokensA) pool.set(t, (pool.get(t) ?? 0) + 1)
    let matched = 0
    for (const t of tokensB) {
      const n = pool.get(t) ?? 0
      if (n > 0) { matched++; pool.set(t, n - 1) }
    }
    return matched / tokensB.length >= 0.85
  }

  // TOEFL Take-an-Interview: open response — no auto-grading. Counted as
  // attempted (returns true if non-empty) since rubric-grading is handled
  // separately via /api/study/response/grade.
  if (q.type === 'speaking_interview') {
    return studentAnswer.trim().length > 20
  }

  // TOEFL Writing Email / Academic Discussion: open response, rubric-graded
  // via /api/study/response/grade. In the auto-grader we mark as attempted
  // if the student wrote a substantive response (>=50 chars for email,
  // >=80 chars for discussion — well below the 100+ word target but enough
  // to distinguish "tried" from "skipped").
  if (q.type === 'writing_email') {
    return studentAnswer.trim().length >= 50
  }
  if (q.type === 'writing_discussion') {
    return studentAnswer.trim().length >= 80
  }

  // multiple_choice / three_choice / quant_comparison — exact match.
  return norm(studentAnswer) === norm(q.correct_answer ?? '')
}

/** Normalize numeric input so "12", "12.0", "12.00", " 12 " all match.
 *  Fractions like "5/8" stay as-is for string compare. */
export function normalizeNumeric(s: string): string {
  const t = s.trim().replace(/\s+/g, '')
  if (/^-?\d+\.?\d*$/.test(t)) {
    const n = parseFloat(t)
    if (Number.isFinite(n)) return n.toString()
  }
  return t
}
