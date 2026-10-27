/**
 * SSAT Writing Sample (`essay_choice`): the prompt sections, and the ONE
 * encoding that records which of them the student chose.
 *
 * The bank stores both prompts in one `passage`, sectioned by header lines:
 *
 *     [Essay]
 *     When a school team or club has more people ... Support your position ...
 *
 *     [Story Starter]
 *     Write a story that begins with the following sentence: "..."
 *
 * Until 2026-10-27 the student had to TYPE which prompt they chose into the
 * essay itself, and nothing downstream knew. The screen now shows the
 * sections as option cards, and the choice travels inside the answer string
 * as a leading marker line:
 *
 *     [[prompt: Story Starter]]
 *     The vending machine gave back more money than I had put in, ...
 *
 * Why inside the answer rather than a new field: the answer string is the
 * one thing that already survives every hop — localStorage resume, the
 * submit payload, study_attempts.student_answer, the grade batch, and the
 * review screen — so a marker needs no schema change anywhere and cannot be
 * dropped by a hop that forgot a new field. The cost is that every reader
 * must decode it, which is why encode/decode live HERE and nowhere else.
 * Never parse the marker by hand at a call site.
 *
 * No runtime imports: the client (TestSession, TestResultView) and the
 * server (grade-batch) both use this, and jest reaches it without `ai`/`zod`.
 */

export interface EssayPromptSection {
  /** The header text without brackets, e.g. "Essay", "Story Starter". */
  label: string
  /** The section body, trimmed. Never empty — empty sections are dropped. */
  text: string
}

/** A header line: `[Label]` alone on its line. Label: no brackets, no
 *  newline, at most 60 chars, so a bracketed phrase INSIDE a prompt
 *  sentence ("... the word [sic] ...") is never mistaken for a header. */
const HEADER_LINE = /^\s*\[([^\[\]\n]{1,60})\]\s*$/

/**
 * Split an essay_choice passage into its prompt sections, in order.
 *
 * Generic over the labels and the count (1..n). Text before the first
 * header is not a prompt and is ignored. A passage with no header lines
 * returns [] — callers treat that as "no choice to offer" and fall back to
 * showing the passage as one block, which is what the screen did before.
 */
export function parseEssayChoicePassage(passage: string | null | undefined): EssayPromptSection[] {
  if (!passage) return []
  const lines = passage.replace(/\r\n?/g, '\n').split('\n')
  const sections: EssayPromptSection[] = []
  let current: { label: string; body: string[] } | null = null
  const flush = () => {
    if (!current) return
    const text = current.body.join('\n').trim()
    if (text) sections.push({ label: current.label.trim(), text })
  }
  for (const line of lines) {
    const m = HEADER_LINE.exec(line)
    if (m) {
      flush()
      current = { label: m[1]!, body: [] }
    } else if (current) {
      current.body.push(line)
    }
  }
  flush()
  return sections
}

// ---------------------------------------------------------------------------
// The choice encoding
// ---------------------------------------------------------------------------

const MARKER = /^\[\[prompt:[ \t]*([^\[\]\n]{1,60}?)[ \t]*\]\][ \t]*(?:\r?\n|$)/

export interface DecodedEssayAnswer {
  /** The chosen section's label, or null when the answer carries no choice
   *  (ISEE essays, answers written before 2026-10-27, or nothing picked). */
  label: string | null
  /** What the student wrote, without the marker. */
  body: string
}

/** Record `label` as the chosen prompt in front of `body`. A null label
 *  returns the body unchanged, so the ISEE essay (one prompt) is untouched. */
export function encodeEssayAnswer(label: string | null, body: string): string {
  if (!label) return body
  const clean = label.replace(/[\[\]\n]/g, '').trim()
  if (!clean) return body
  return `[[prompt: ${clean}]]\n${body}`
}

export function decodeEssayAnswer(raw: string | null | undefined): DecodedEssayAnswer {
  if (raw == null) return { label: null, body: '' }
  const m = MARKER.exec(raw)
  if (!m) return { label: null, body: raw }
  return { label: m[1]!.trim(), body: raw.slice(m[0].length) }
}

/** True when nothing has been WRITTEN, whether or not a prompt was picked.
 *  A picked prompt with no text is not an answer: it must not count as
 *  answered, be submitted, or be sent to the grader. */
export function isEssayAnswerBlank(raw: string | null | undefined): boolean {
  return decodeEssayAnswer(raw).body.trim() === ''
}

/**
 * The value submit should send for an essay slot: null when nothing was
 * written (so the server records a blank, exactly as for any skipped
 * question), otherwise the encoded answer untouched.
 */
export function essayAnswerForSubmit(raw: string | null | undefined): string | null {
  if (raw == null) return null
  return isEssayAnswerBlank(raw) ? null : raw
}

/** The section the answer chose, matched by label (case- and
 *  space-insensitive). Null when nothing was chosen or the label no longer
 *  names a section of this passage. */
export function chosenEssaySection(
  passage: string | null | undefined,
  raw: string | null | undefined,
): EssayPromptSection | null {
  const { label } = decodeEssayAnswer(raw)
  if (!label) return null
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()
  return parseEssayChoicePassage(passage).find(s => norm(s.label) === norm(label)) ?? null
}

// ---------------------------------------------------------------------------
// What the grader is told the task was
// ---------------------------------------------------------------------------

export type PracticeEssayKind = 'essay' | 'story'

export interface PracticeEssayTask {
  /** The task text the grader scores against: the CHOSEN prompt only. */
  taskText: string
  /** The student's writing, marker removed. */
  essayText: string
  /** Label of the chosen section, when there was a choice. */
  chosenLabel: string | null
  /** Story Starter vs. argumentative/expository essay. Decides one criterion. */
  kind: PracticeEssayKind
  /** For a story starter: the sentence the story must begin with. */
  starterSentence: string | null
  /** True only on the no-recorded-choice fallback: the grader must decide
   *  essay vs. story from the response itself. */
  kindUncertain: boolean
}

/** A section is a story starter when its label or body says so. */
export function isStorySection(section: Pick<EssayPromptSection, 'label' | 'text'>): boolean {
  return /story/i.test(section.label) || /^\s*write a story/i.test(section.text)
}

/** The quoted sentence in a story-starter prompt, if there is one. */
export function starterSentenceOf(text: string): string | null {
  const m = /["“]([^"”]{3,400})["”]/.exec(text)
  return m ? m[1]!.trim() : null
}

/**
 * Resolve what the practice grader should read for one essay item.
 *
 *  - `essay` (ISEE): one prompt, carried in `prompt`.
 *  - `essay_choice` (SSAT): the CHOSEN section only. Sending both would let
 *    the grader score a story against the essay prompt or vice versa.
 *    When no choice can be resolved — an answer written before the choice
 *    UI existed, or a label the passage no longer has — the grader gets
 *    every section and is told the student picked one of them. That is
 *    not a silent downgrade: it is exactly the information the student
 *    had, and it only applies to answers that never recorded a choice.
 */
export function practiceEssayTask(
  question: { type?: string | null; prompt?: string | null; passage?: string | null },
  rawAnswer: string,
): PracticeEssayTask {
  const { body } = decodeEssayAnswer(rawAnswer)
  const instruction = (question.prompt ?? '').trim()
  if (question.type !== 'essay_choice') {
    const passage = (question.passage ?? '').trim()
    const taskText = passage && !passage.includes(instruction)
      ? `${passage}\n\n${instruction}`.trim()
      : (passage || instruction)
    const story = /^\s*write a story/i.test(taskText)
    return {
      taskText,
      essayText: body,
      chosenLabel: null,
      kind: story ? 'story' : 'essay',
      starterSentence: story ? starterSentenceOf(taskText) : null,
      kindUncertain: false,
    }
  }
  const chosen = chosenEssaySection(question.passage, rawAnswer)
  if (chosen) {
    const story = isStorySection(chosen)
    return {
      taskText: `[${chosen.label}]\n${chosen.text}`,
      essayText: body,
      chosenLabel: chosen.label,
      kind: story ? 'story' : 'essay',
      starterSentence: story ? starterSentenceOf(chosen.text) : null,
      kindUncertain: false,
    }
  }
  const all = parseEssayChoicePassage(question.passage)
  const listed = all.length > 0
    ? all.map(s => `[${s.label}]\n${s.text}`).join('\n\n')
    : (question.passage ?? '').trim()
  return {
    taskText: `The student was offered the prompts below and chose ONE of them; decide from the response which one it answers, and score it against that prompt only.\n\n${listed}`,
    essayText: body,
    chosenLabel: null,
    kind: 'essay',
    starterSentence: null,
    kindUncertain: all.length > 1,
  }
}
