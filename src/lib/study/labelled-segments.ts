/**
 * Labelled sentence segments: the error-identification shape.
 *
 * An iTEP Grammar Part 2 item marks four segments IN the sentence and the
 * choices name them:
 *
 *   passage: "Yesterday, Dad [A: set] up a tent [B: behind] our house, and we [C: eat] ..."
 *   choices: ["set", "behind", "eat", "inside"]
 *
 * The letter printed in the sentence IS the choice's position, so these
 * choices must never be reordered at serve time (shuffleDrawnChoices) and
 * the renderer must show each segment underlined with its letter.
 *
 * Detection is structural, not a flag: an item is treated as labelled only
 * when its passage carries exactly one marker per choice, lettered A, B, C,
 * ... in order, each marker's text equal to the choice at that position.
 * Anything looser (a stray "[A: ...]", a marker that disagrees with its
 * choice) is NOT exempt from the shuffle, so a malformed item keeps the
 * default protection rather than leaking a fixed key slot.
 */

const MARKER = /\[([A-F]):\s*([^\]\n]+?)\s*\]/g

export type SegmentPart =
  | { kind: 'text'; text: string }
  | { kind: 'segment'; label: string; text: string }

/** Split text into plain runs and `[X: segment]` markers. */
export function parseLabelledSegments(text: string): SegmentPart[] {
  const out: SegmentPart[] = []
  let last = 0
  for (const m of text.matchAll(MARKER)) {
    const at = m.index ?? 0
    if (at > last) out.push({ kind: 'text', text: text.slice(last, at) })
    out.push({ kind: 'segment', label: m[1], text: m[2] })
    last = at + m[0].length
  }
  if (last < text.length) out.push({ kind: 'text', text: text.slice(last) })
  return out
}

function choiceText(c: unknown): string {
  if (typeof c === 'string') return c
  if (c && typeof c === 'object' && typeof (c as { text?: unknown }).text === 'string') return (c as { text: string }).text
  return ''
}

/** True when the choices are the passage's labelled segments, in order. */
export function hasLabelledSegments(item: { passage?: string | null; choices?: readonly unknown[] | null }): boolean {
  const choices = item.choices ?? []
  if (!item.passage || choices.length < 2) return false
  const segs = parseLabelledSegments(item.passage).filter(
    (p): p is Extract<SegmentPart, { kind: 'segment' }> => p.kind === 'segment')
  if (segs.length !== choices.length) return false
  return segs.every((s, i) => s.label === String.fromCharCode(65 + i) && s.text === choiceText(choices[i]).trim())
}
