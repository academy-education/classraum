/**
 * The em-dash tell: rules, plan arithmetic, and the per-item gate.
 *
 * WHAT THE TELL IS. `scripts/verify-option-tells.ts` measures "always pick
 * the option with property P" against 25% chance. On 2026-07-30 the em-dash
 * rule scored 75.0% on 20 usable SAT R&W items and 70.5% on 44 usable TOEFL
 * Listening items. Per option the skew is starker: 2.0% of SAT keys carry a
 * dash against 0.2% of distractors, and 6.2% of TOEFL Listening keys against
 * 1.4% of distractors — a key is 4-9x more likely to be dashed than any one
 * distractor.
 *
 * The cause is the length tell wearing different clothes. A correct answer
 * must be fully accurate, so it acquires a qualifying clause, and a
 * qualifying clause gets a dash. Two authors independently found a dash in
 * 85% and 72% of their own draft keys and removed it before submitting,
 * which is what prompted the measurement.
 *
 * WHY "STRIP THE DASHES FROM KEYS" IS THE WRONG REPAIR, TWICE.
 *   1. It degrades the writing. The qualification is what makes the key
 *      correct; deleting the clause that carries it makes the key wrong or
 *      vague. So the gate below refuses a key that lost length or content
 *      words rather than being rephrased.
 *   2. It inverts the tell into "never pick the option with a dash", which
 *      `verify-option-tells.ts` flags below 12% just as loudly as above 40%.
 *      So the plan repairs a FRACTION of the leaking items — the fraction
 *      that lands the section at 25% — and requires the dash to reappear on
 *      a distractor rather than vanishing.
 *
 * THE HARD CONSTRAINT. The same bank was just repaired so the key's
 * CHARACTER-LENGTH RANK is uniform (25% at each of ranks 1-4 across three
 * verbal sections; four waves of work). Repunctuating changes character
 * counts. Every edit must therefore land the key on the SAME rank it
 * already occupies, so the histograms cannot move. That is checked per item
 * here and asserted section-wide by the importer.
 */

/** Identical to the rule in scripts/verify-option-tells.ts. Pinned by test. */
export const DASH = /[—–]| - /
export const hasDash = (s: string) => DASH.test(s)

/** Where the key sits by length, 1 = longest. Requires 4 choices. */
export function lengthRank(key: string, choices: string[]): number {
  return choices.filter(c => c.length > key.length).length + 1
}

export function rankHistogram(items: Array<{ key: string; choices: string[] }>): number[] {
  const counts = [0, 0, 0, 0]
  for (const it of items) {
    const r = lengthRank(it.key, it.choices)
    if (r >= 1 && r <= 4) counts[r - 1]!++
  }
  return counts
}

// ── the tell rules, mirrored from the verifier ───────────────────────────
//
// DUPLICATED ON PURPOSE, AND PINNED BY A TEST. The importer has to project
// what the section becomes BEFORE anything is written, and the verifier
// reads the live database — so it cannot answer that question. Importing
// from a script with a top-level IIFE and a Supabase client is not an
// option either. `dash-repair-gate.test.ts` reads verify-option-tells.ts
// off disk and fails if any regex here drifts from the one there, so the
// projection cannot silently start measuring something else.

export const HEDGE = /\b(may|might|can|could|often|sometimes|generally|typically|tend|tends|tended|partly|largely|suggests?|likely|some|several|certain|relatively|somewhat)\b/i
export const ABSOLUTE = /\b(all|every|always|never|none|no one|only|entirely|completely|impossible|must|cannot|solely|exclusively|totally|invariably)\b/i

export type TellRule = { name: string; hit: (c: string) => boolean; source: RegExp | null }
export const TELL_RULES: TellRule[] = [
  { name: 'ends with a period', hit: c => /\.\s*$/.test(c), source: /\.\s*$/ },
  { name: 'contains a hedge word', hit: c => HEDGE.test(c), source: HEDGE },
  { name: 'contains an absolute', hit: c => ABSOLUTE.test(c), source: ABSOLUTE },
  { name: 'contains a comma', hit: c => c.includes(','), source: null },
  { name: 'contains an em dash', hit: c => DASH.test(c), source: DASH },
  { name: 'contains a semicolon', hit: c => c.includes(';'), source: null },
  { name: 'contains a quoted phrase', hit: c => /["“”]/.test(c), source: /["“”]/ },
  { name: 'has the most words', hit: () => false, source: null },
]

export const ODD_RULES: Array<{ name: string; hit: (c: string) => boolean; source: RegExp }> = [
  { name: 'terminal period', hit: c => /\.\s*$/.test(c), source: /\.\s*$/ },
  { name: 'any terminal punctuation', hit: c => /[.!?;:,]\s*$/.test(c), source: /[.!?;:,]\s*$/ },
  { name: 'initial capital', hit: c => /^[A-Z]/.test(c.trim()), source: /^[A-Z]/ },
  { name: 'leading article (a/an/the)', hit: c => /^(a|an|the)\s/i.test(c.trim()), source: /^(a|an|the)\s/i },
]

export type ScoredItem = { key: string; choices: string[] }
export type RuleScore = { name: string; usable: number; correct: number }

/** "Pick the UNIQUE option with property P." Same arithmetic as the verifier. */
export function scoreRule(items: ScoredItem[], rule: TellRule): RuleScore {
  let usable = 0, correct = 0
  for (const it of items) {
    const hits = rule.name === 'has the most words'
      ? (() => {
          const w = it.choices.map(c => c.trim().split(/\s+/).length)
          const max = Math.max(...w)
          return it.choices.filter((_, i) => w[i] === max)
        })()
      : it.choices.filter(rule.hit)
    if (hits.length !== 1) continue
    usable++
    if (hits[0] === it.key) correct++
  }
  return { name: rule.name, usable, correct }
}

/** "Pick the option that DIFFERS from the other three on P." */
export function scoreOddRule(items: ScoredItem[], hit: (c: string) => boolean, name: string): RuleScore {
  let usable = 0, correct = 0
  for (const it of items) {
    const flags = it.choices.map(hit)
    const yes = flags.filter(Boolean).length
    if (yes !== 1 && yes !== 3) continue
    const oddValue = yes === 1
    const odd = it.choices[flags.findIndex(f => f === oddValue)]!
    usable++
    if (odd === it.key) correct++
  }
  return { name, usable, correct }
}

// ── the plan ─────────────────────────────────────────────────────────────

export type DashClass =
  | 'clean'        // no option carries a dash
  | 'key-only'     // key carries the only dash        -> exploitable, repairable
  | 'key-plus'     // key AND >=1 distractor carry one -> not "usable", still skews parity
  | 'distractor'   // key carries none, >=1 distractor does

export function classify(it: ScoredItem): DashClass {
  const keyDash = hasDash(it.key)
  const distDash = it.choices.filter(c => c !== it.key && hasDash(c)).length
  if (!keyDash) return distDash ? 'distractor' : 'clean'
  return distDash ? 'key-plus' : 'key-only'
}

export type Plan = {
  usableBefore: number
  keyBefore: number
  /** ids of key-plus items — ALL are repaired; each is a free parity win. */
  keyPlus: number
  /** how many key-only items to repair */
  move: number
  keyOnly: number
  usableAfter: number
  keyAfter: number
  rateBefore: number
  rateAfter: number
}

/**
 * How many items to repair, and why not all of them.
 *
 * Driving every leaking item to "key has no dash" would land the rule at
 * ~0%, which the verifier flags as `inverted, also a tell` — the same
 * exploit with the sign flipped. So this solves for the count that lands
 * the SECTION at 25%, exactly as the length repair solved for the section
 * histogram rather than zeroing each batch.
 *
 * Repairing a `key-plus` item is free: a distractor already carries a dash,
 * so removing the key's turns a non-usable item into a usable one whose
 * dash is on a distractor. That moves the denominator up and the numerator
 * down at once, so all of them are taken before any `key-only` item is.
 */
export function planRepair(items: ScoredItem[]): Plan {
  const cls = items.map(classify)
  const keyOnly = cls.filter(c => c === 'key-only').length
  const distractorOnly = items.filter((it, i) => cls[i] === 'distractor'
    && it.choices.filter(c => hasDash(c)).length === 1).length
  // A key-plus item joins the usable set only if it is left with EXACTLY one
  // dash once the key's goes — i.e. it had exactly two.
  const keyPlus = cls.filter(c => c === 'key-plus').length
  const keyPlusBecomesUsable = items.filter((it, i) => cls[i] === 'key-plus'
    && it.choices.filter(c => hasDash(c)).length === 2).length

  const before = scoreRule(items, TELL_RULES.find(r => r.name === 'contains an em dash')!)
  const usableAfter = distractorOnly + keyOnly + keyPlusBecomesUsable

  let move = 0, best = Infinity
  for (let m = 0; m <= keyOnly; m++) {
    const rate = usableAfter ? (keyOnly - m) / usableAfter : 0
    const d = Math.abs(rate - 0.25)
    if (d < best - 1e-12) { best = d; move = m }
  }
  return {
    usableBefore: before.usable,
    keyBefore: before.correct,
    keyPlus,
    move,
    keyOnly,
    usableAfter,
    keyAfter: keyOnly - move,
    rateBefore: before.usable ? before.correct / before.usable : 0,
    rateAfter: usableAfter ? (keyOnly - move) / usableAfter : 0,
  }
}

// ── the per-item gate ────────────────────────────────────────────────────

export interface DashPayload {
  id: string
  prompt: string
  passage: string | null
  choices: string[]
  correct_answer: string
  explanation: string
  /** Stamped by export. Recomputed and cross-checked here — never trusted. */
  key_slot: number
  key_length_rank: number
  /** Distractors that must carry a dash after the repair. >=1 always. */
  target_distractor_dashes: number
  repaired_choices?: string[]
  repaired_correct_answer?: string
  /** Required only when the rewrite breaks a phrase the explanation quotes. */
  repaired_explanation?: string
}

const STOP = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'for', 'with', 'as',
  'by', 'at', 'from', 'that', 'this', 'it', 'is', 'are', 'was', 'were', 'be', 'been',
  'has', 'have', 'had', 'not', 'no', 'its', 'their', 'his', 'her', 'they', 'them',
])

function contentWords(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9\s']/g, ' ').split(/\s+/)
    .filter(w => w.length > 2 && !STOP.has(w))
}

/** Fraction of `before`'s content words (as a multiset) still present in `after`. */
export function retention(before: string, after: string): number {
  const want = contentWords(before)
  if (!want.length) return 1
  const pool = new Map<string, number>()
  for (const w of contentWords(after)) pool.set(w, (pool.get(w) ?? 0) + 1)
  let kept = 0
  for (const w of want) {
    const n = pool.get(w) ?? 0
    if (n > 0) { pool.set(w, n - 1); kept++ }
  }
  return kept / want.length
}

const QUOTE_RUN = 5

const flat = (s: string) => s.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()

/**
 * Word runs of `option` that the explanation reproduces.
 *
 * Compared PUNCTUATION-BLIND on both sides. An explanation quoting "in a
 * single, not-yet-replicated greenhouse trial" is quoting the option even
 * though the option's words with punctuation stripped read "in a single not
 * yet replicated greenhouse trial" — a raw substring test finds nothing
 * there, which is exactly the case this repair creates, since the whole
 * repair is punctuation.
 */
export function quotedRuns(option: string, explanation: string): string[] {
  const words = option.replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean)
  const hay = flat(explanation)
  const out: string[] = []
  for (let i = 0; i + QUOTE_RUN <= words.length; i++) {
    const run = words.slice(i, i + QUOTE_RUN).join(' ')
    if (hay.includes(flat(run))) out.push(run)
  }
  return out
}

/**
 * The load-bearing element has to VARY across the batch.
 *
 * CLAUDE.md records three tells that reached this bank because a cohort was
 * authored to one rigid brief: key-in-slot-A, complete-ABCD permutations,
 * and identical key PROSE across eight lectures. The dash repair has the
 * same shape — if every de-dashed key trades its dash for the same
 * substitute, "pick the option in parentheses" replaces "pick the option
 * with the dash" and the verifier says nothing, because it has no rule for
 * parentheses.
 *
 * So this counts typography the verifier does NOT measure and refuses a
 * batch that leans on any one of them. It cannot see a SEMANTIC monotony
 * (see the note in scripts/dash-repair-io.ts); it catches the mechanical
 * version, which is the one an author drifts into.
 */
export const SUBSTITUTES: Array<[string, RegExp]> = [
  // The cheapest rewrite of "X — Y" is "X. Y", and on short conversational
  // options it is almost always the most natural one. That is exactly why it
  // needs counting: an author reaching for it every time would replace "pick
  // the option with the dash" with "pick the option that is two sentences",
  // and no rule in verify-option-tells.ts looks for that.
  ['sentence break', /[.!?]\s+["'“A-Z0-9]/],
  ['parentheses', /[()]/],
  ['brackets', /[[\]]/],
  ['slash', /\//],
  ['ellipsis', /\.\.\.|…/],
  ['semicolon', /;/],
  ['colon', /:/],
]

export function substituteConcentration(
  pairs: Array<{ before: string; after: string }>,
): Array<{ name: string; n: number; share: number }> {
  return SUBSTITUTES.map(([name, re]) => {
    const n = pairs.filter(p => re.test(p.after) && !re.test(p.before)).length
    return { name, n, share: pairs.length ? n / pairs.length : 0 }
  })
}

/**
 * Every way of not doing the work that we could think of, each with its own
 * message. The batch-level projection in the importer catches the rest —
 * see `scripts/dash-repair-io.ts`.
 */
export function checkRepair(p: DashPayload): string[] {
  const e: string[] = []
  const next = p.repaired_choices
  const nextKey = p.repaired_correct_answer

  if (!Array.isArray(next)) { e.push('no repaired_choices'); return e }
  if (next.length !== 4) { e.push(`expected 4 repaired choices, got ${next.length}`); return e }
  if (typeof nextKey !== 'string' || !nextKey.trim()) { e.push('no repaired_correct_answer'); return e }
  if (p.choices.length !== 4) { e.push('source item does not have 4 choices'); return e }

  // The stamps are inputs to the gate, so the gate does not take their word
  // for it. A payload edited to relax its own target is the obvious attack.
  const slot = p.choices.indexOf(p.correct_answer)
  if (slot < 0) { e.push('source correct_answer is not among source choices'); return e }
  if (p.key_slot !== slot) e.push(`key_slot stamp ${p.key_slot} disagrees with the item (${slot})`)
  const srcRank = lengthRank(p.correct_answer, p.choices)
  if (p.key_length_rank !== srcRank) e.push(`key_length_rank stamp ${p.key_length_rank} disagrees with the item (${srcRank})`)

  // correct_answer byte-identical to a member of choices, AND in its old slot.
  if (next[slot] !== nextKey) {
    const at = next.indexOf(nextKey)
    e.push(at < 0
      ? 'repaired_correct_answer is not byte-identical to any repaired choice'
      : `key moved from slot ${slot} to ${at}`)
  }
  if (next.filter(c => c === nextKey).length > 1) e.push('key appears more than once')
  if (new Set(next.map(c => c.trim().toLowerCase())).size !== next.length) e.push('duplicate choices')
  if (next.some(c => !c || !c.trim())) e.push('empty choice')

  // Spread. The cap is 1.6x — but 2 of the 10 SAT items this repair touches
  // are ALREADY at 1.72x and 3.07x, from before that cap existed. Demanding
  // 1.6x of them would reject an author for a defect they did not introduce
  // and cannot fix inside a punctuation pass. So: obey the cap where the
  // item obeys it, and forbid making an existing violation worse where it
  // does not. (One item in the batch is repaired past 1.6x anyway, because
  // the distractor that gains the dash is the short one.)
  const srcLens = p.choices.map(c => c.length)
  const srcSpread = Math.max(...srcLens) / Math.min(...srcLens)
  const lens = next.map(c => c.length)
  const max = Math.max(...lens), min = Math.min(...lens)
  const spread = max / min
  const cap = Math.max(1.6, srcSpread)
  if (spread > cap + 1e-9) {
    e.push(srcSpread > 1.6
      ? `length spread ${spread.toFixed(2)}x worsens a pre-existing ${srcSpread.toFixed(2)}x`
      : `length spread ${spread.toFixed(2)}x exceeds 1.6x`)
  }

  // THE HARD CONSTRAINT. Four waves put the key's length rank at 25% on each
  // of 1-4. Repunctuating moves character counts, so an edit that lands the
  // key on a different rank silently un-does that work — and the section
  // histogram would only show it in aggregate, after the write.
  const gotRank = lengthRank(nextKey, next)
  if (gotRank !== srcRank) {
    e.push(`key length-rank moved ${srcRank} -> ${gotRank} (key ${p.correct_answer.length} -> ${nextKey.length} chars, others ${p.choices.filter((_, i) => i !== slot).map(c => c.length).join('/')})`)
  }

  // The repair itself.
  if (hasDash(nextKey)) e.push('key still carries a dash')
  const distDashes = next.filter((c, i) => i !== slot && hasDash(c)).length
  if (distDashes !== p.target_distractor_dashes) {
    e.push(`${distDashes} distractor(s) carry a dash, target ${p.target_distractor_dashes}`)
  }
  if (p.target_distractor_dashes < 1) e.push('target_distractor_dashes must be >= 1 — a dash that vanishes inverts the tell')

  // A dash tacked onto the end of a distractor is padding, not punctuation.
  //
  // Scoped to distractors this repair actually TOUCHED. Applied to all four
  // it rejected two key-plus items whose untouched distractor opens "Great —"
  // or "Thanks — ": real spoken punctuation, authored long ago, and nothing
  // the dash repair can or should change. A gate that fails an author for a
  // line they did not write teaches them to route around the gate.
  for (let i = 0; i < 4; i++) {
    if (i === slot || !hasDash(next[i]!) || next[i] === p.choices[i]) continue
    const parts = next[i]!.split(DASH)
    const thin = parts.filter(seg => seg.trim().split(/\s+/).filter(Boolean).length < 3)
    if (thin.length) e.push(`distractor ${i}: dash has fewer than 3 words on one side — tacked on, not integrated`)
  }

  // NOT DOING THE WORK, WAY 1: delete the qualifying clause instead of
  // rephrasing it. The key stops being fully accurate and the item breaks.
  if (nextKey.length < p.correct_answer.length * 0.92) {
    e.push(`key lost ${(100 * (1 - nextKey.length / p.correct_answer.length)).toFixed(0)}% of its length — the qualification was deleted, not rephrased`)
  }
  const keep = retention(p.correct_answer, nextKey)
  if (keep < 0.85) {
    e.push(`key retains only ${(100 * keep).toFixed(0)}% of its content words — rewritten past recognition or gutted`)
  }

  // NOT DOING THE WORK, WAY 2: swap the dash for a semicolon or colon and
  // call it repunctuated. Both are measured rules of their own, and SAT R&W
  // already reads 42.3% on the semicolon rule.
  for (const [mark, label] of [[';', 'semicolon'], [':', 'colon']] as const) {
    if (nextKey.includes(mark) && !p.correct_answer.includes(mark)) {
      e.push(`key traded its dash for a ${label} — one measured tell for another`)
    }
  }

  // NOT DOING THE WORK, WAY 3: leave everything alone.
  if (next.every((c, i) => c === p.choices[i]) && nextKey === p.correct_answer) {
    e.push('nothing changed')
  }

  // Distractor edits stay surgical. This is a typography repair, not a
  // re-authoring pass; a distractor that doubles in length is padding and
  // would also drag the key's rank around.
  for (let i = 0; i < 4; i++) {
    if (i === slot) continue
    const a = p.choices[i]!.length, b = next[i]!.length
    if (b < a * 0.8 || b > a * 1.25) {
      e.push(`distractor ${i} length ${a} -> ${b} is outside 0.8-1.25x — this pass repunctuates, it does not re-author`)
    }
  }

  // The explanation is prose about specific options. If the rewrite destroys
  // a phrase the explanation quotes, the explanation now describes an option
  // that no longer exists — the exact bug explanation-repair-io.ts was built
  // to fix, arriving through a different door.
  const broken: string[] = []
  for (let i = 0; i < 4; i++) {
    for (const run of quotedRuns(p.choices[i]!, p.explanation)) {
      if (!flat(next[i]!).includes(flat(run))) broken.push(run)
    }
  }
  if (broken.length) {
    const fixedExpl = p.repaired_explanation
    if (typeof fixedExpl !== 'string' || !fixedExpl.trim()) {
      e.push(`rewrite breaks ${broken.length} phrase(s) the explanation quotes (e.g. "${broken[0]}") — supply repaired_explanation`)
    } else {
      const still = broken.filter(r => flat(fixedExpl).includes(flat(r)))
      if (still.length) e.push(`repaired_explanation still quotes the removed phrase "${still[0]}"`)
      if (flat(fixedExpl).length < flat(p.explanation).length * 0.6) {
        e.push('repaired_explanation is far shorter than the original — the analysis was dropped, not rewritten')
      }
    }
  }

  return e
}
