/**
 * "Which parts of this test went well" — the per-section breakdown shown
 * under a result screen and aggregated on the topic page.
 *
 * WHAT WE CAN HONESTLY GROUP ON.
 *
 * There is no topic, domain or skill field to use. Every stored attempt
 * has `domain`, `category` and `skill` NULL — all 500 TOEFL rows — and
 * the question JSON carries no other taxonomy. What it does carry is a
 * bracketed prefix on the prompt, written by the generator:
 *
 *   [Academic Talk — Geology] What does the professor mainly discuss?
 *   [Conversation — Office hours] Why does the student visit …
 *   [Academic — Art History] According to the passage …
 *
 * The FIRST segment is a stable four-value taxonomy per section and is
 * what we group on. The second is not usable: across 111 live Listening
 * items it produced 26 distinct labels averaging four items each, with
 * "Residence Hall" / "residence hall" / "Residence Hall Staff" as three
 * separate groups and Earth Science split by an em dash versus a hyphen.
 * Reporting "0 / 1 on Psychology" from that is noise wearing the costume
 * of insight.
 *
 * SAT has no bracketed prompts at all (0 of 547 items), so it gets the
 * item-type fallback only — which for SAT means one group, i.e. nothing,
 * and the card self-hides.
 */

import { scoreItem, type ScorableItem } from './toefl-section-score'
import { OPEN_RESPONSE_TYPES } from './openResponse'

export interface SectionGroup {
  /** Display label, already normalised. */
  label: string
  earned: number
  max: number
  /** 0-1. */
  proportion: number
  /** How many delivered items are behind it — shown, because "100%"
   *  off two questions is not the same claim as "100%" off twelve. */
  items: number
}

export interface Breakdown {
  groups: SectionGroup[]
  /** Items that were scorable and landed in a group. */
  covered: number
  /** Scorable items dropped for sitting in a group below the minimum.
   *  Surfaced in the UI rather than silently swallowed. */
  omitted: number
}

/** Item types that are themselves a section of the test, for prompts
 *  with no bracketed label. These names match what the test UI calls
 *  each task, so the breakdown and the task header agree. */
const TYPE_LABEL: Record<string, string> = {
  speaking_repeat: 'Listen and Repeat',
  speaking_interview: 'Take an Interview',
  arrange_words: 'Build a Sentence',
  writing_email: 'Write an Email',
  writing_discussion: 'Academic Discussion',
  fill_in_blanks: 'Complete the Words',
  multiple_choice: 'Multiple choice',
}

const TYPE_LABEL_KO: Record<string, string> = {
  speaking_repeat: '듣고 따라 말하기',
  speaking_interview: '인터뷰 답변',
  arrange_words: '문장 만들기',
  writing_email: '이메일 쓰기',
  writing_discussion: '학술 토론',
  fill_in_blanks: '단어 완성',
  multiple_choice: '객관식',
}

const SMALL_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'for', 'to', 'in', 'on', 'at', 'with',
])

/**
 * Normalise a raw label so the same task does not split into several
 * groups. Live data needed every one of these:
 *   "Academic Talk - Earth Science"  → hyphen instead of em dash
 *   "Announcement — residence hall"  → lowercased second segment
 *   "Conversation — Student↔Student" → arbitrary punctuation
 */
export function normaliseSectionLabel(raw: string): string {
  const head = raw.split(/\s*[—–-]\s*/)[0] ?? raw
  const trimmed = head.replace(/\s+/g, ' ').trim()
  if (!trimmed) return ''
  // Title Case, so "residence hall" and "Residence Hall" are one group.
  // Articles and short prepositions stay lowercase unless they lead, so
  // a bracketed "[Listen and Repeat]" and the TYPE_LABEL fallback for
  // the same task produce the SAME string — capitalising every word gave
  // "Listen And Repeat" from one path and "Listen and Repeat" from the
  // other, which is two rows for one task the moment a set mixes them.
  return trimmed
    .toLowerCase()
    .split(' ')
    .map((w, i) => (i > 0 && SMALL_WORDS.has(w)) ? w : w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/** The bracketed prefix, if the prompt has one. */
export function bracketedLabel(prompt: string): string | null {
  const m = /^\s*\[([^\]]{2,60})\]/.exec(prompt)
  return m ? (m[1] ?? null) : null
}

export interface BreakdownItem extends ScorableItem {
  prompt?: string | null
}

/**
 * One point for a key-matched item. Returns null for an open response,
 * whose absence from scoreItem means "still awaiting a grade" rather
 * than "wrong" — scoring those 0 here would punish a student for our
 * grader being slow.
 */
function keyMatchedScore(it: BreakdownItem): { earned: number; max: number } | null {
  if (OPEN_RESPONSE_TYPES.has(it.type)) return null
  if (typeof it.correct !== 'boolean') return null
  return { earned: it.correct ? 1 : 0, max: 1 }
}

/**
 * Group the delivered items and score each group.
 *
 * A group survives if it has enough ITEMS or enough POINTS. Both, because
 * either alone gets a real case wrong — verified against the live bank
 * with scripts/verify-section-breakdown.ts:
 *
 * - items alone (>= 3) dropped BOTH Writing essays, one item each, which
 *   together carry 80% of the section score. The card then showed only
 *   Build a Sentence and called it the breakdown.
 * - points alone (>= 5) would drop Listening's Academic Talk at 4 items,
 *   which is a real four-question group with a real result.
 *
 * The type-name fallback applies only when NO item in the set carries a
 * bracketed label. Mixing the two produced "Multiple choice 33% (3
 * items)" sitting beside "Academic" and "Daily Life" on a Reading test —
 * where all three are multiple choice and the odd one out was simply
 * missing its prefix. An unlabelled item in a labelled set is not a
 * section, so it is omitted and counted rather than given a group of its
 * own.
 */
export function buildSectionBreakdown(
  items: BreakdownItem[],
  scoreRepeat: (expected: string, actual: string) => { score: number },
  opts: { ko?: boolean; minItems?: number; minPoints?: number } = {},
): Breakdown {
  const { ko = false, minItems = 3, minPoints = 5 } = opts
  const labels = ko ? TYPE_LABEL_KO : TYPE_LABEL
  const acc = new Map<string, { earned: number; max: number; items: number }>()

  // Does this set use bracketed labels at all? Decided over the whole
  // set before grouping, so one labelled item cannot change how a
  // different item is bucketed.
  const anyBracketed = items.some(it => it.prompt && bracketedLabel(it.prompt))
  let unlabelled = 0

  for (const it of items) {
    // Scored with the SAME function the section total uses, so the parts
    // cannot add up to something other than the whole.
    //
    // scoreItem only knows the weighted Speaking/Writing parts, so it
    // returns null for the key-matched types that make up ALL of Reading
    // and Listening. Those are one point per question — which is exactly
    // what their section total is — so they fall through to correct/1
    // here. Without this the breakdown was empty on the two sections
    // that have the most questions to break down.
    const scored = scoreItem(it, scoreRepeat) ?? keyMatchedScore(it)
    if (!scored) continue

    const bracket = it.prompt ? bracketedLabel(it.prompt) : null
    const label = bracket
      ? normaliseSectionLabel(bracket)
      : anyBracketed
        // Unlabelled item in a labelled set: not a section of its own.
        // Falls through to `omitted` below.
        ? ''
        : (labels[it.type] || TYPE_LABEL[it.type] || '')
    if (!label) { unlabelled++; continue }

    const cur = acc.get(label) ?? { earned: 0, max: 0, items: 0 }
    acc.set(label, {
      earned: cur.earned + scored.earned,
      max: cur.max + scored.max,
      items: cur.items + 1,
    })
  }

  const all = [...acc.entries()].map(([label, v]) => ({
    label,
    earned: v.earned,
    max: v.max,
    items: v.items,
    proportion: v.max > 0 ? v.earned / v.max : 0,
  }))

  const groups = all.filter(g => g.items >= minItems || g.max >= minPoints)
  // Weakest first: the point of the card is what to work on, and a
  // student who reads one row should read the useful one.
  groups.sort((a, b) => a.proportion - b.proportion || b.items - a.items)

  return {
    groups,
    covered: groups.reduce((n, g) => n + g.items, 0),
    omitted: unlabelled
      + all.reduce((n, g) => n + g.items, 0)
      - groups.reduce((n, g) => n + g.items, 0),
  }
}

/**
 * Split a scored breakdown into what went well and what did not.
 *
 * The cut is at 70% of the points available in that group, and a group
 * is only called a strength or a weakness when it is clearly one — the
 * middle is returned as neither, rather than forced into a side. A
 * student told "Conversation is a weakness" at 68% and "a strength" at
 * 71% learns nothing except that the label is arbitrary.
 */
export function splitStrengths(
  groups: SectionGroup[], strong = 0.7, weak = 0.5,
): { strengths: SectionGroup[]; weaknesses: SectionGroup[]; middle: SectionGroup[] } {
  return {
    strengths: groups.filter(g => g.proportion >= strong),
    weaknesses: groups.filter(g => g.proportion < weak),
    middle: groups.filter(g => g.proportion >= weak && g.proportion < strong),
  }
}
