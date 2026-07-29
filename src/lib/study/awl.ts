/**
 * Academic Word List headwords (Coxhead, 2000), sublists 1–3.
 *
 * WHY THIS EXISTS. "TOEFL-level vocabulary" is otherwise an assertion
 * nobody can check. The AWL is the standard corpus-derived list of words
 * that are frequent across academic texts but not in the general
 * high-frequency 2000 — which is exactly the register TOEFL Writing is
 * scored on. Gating the deck on it turns "these are the right words"
 * into a property a test can verify.
 *
 * Sublists 1–3 only, and deliberately so: they are the highest-frequency
 * 180 headwords, the ones a student will actually have occasion to USE
 * in a 150-word discussion post. Sublist 9's `nonetheless` is a fine
 * word and a bad flashcard.
 *
 * ⚠ TRANSCRIBED, NOT IMPORTED. This list was written from knowledge of
 * the published AWL, not parsed from Coxhead's file. It has not been
 * diffed against the source. Before treating it as authoritative — for
 * anything beyond gating our own deck — download the published list and
 * diff it. The ETS rubric work in this repo is the precedent: text that
 * "everyone knows" turned out to differ from the source in three
 * load-bearing places.
 *
 * No runtime imports, so the gate is reachable from jest.
 */

/** Sublist 1 — the most frequent academic headwords. */
export const AWL_SUBLIST_1 = [
  'analyse', 'approach', 'area', 'assess', 'assume', 'authority', 'available',
  'benefit', 'concept', 'consist', 'constitute', 'context', 'contract',
  'create', 'data', 'define', 'derive', 'distribute', 'economy', 'environment',
  'establish', 'estimate', 'evident', 'export', 'factor', 'finance', 'formula',
  'function', 'identify', 'income', 'indicate', 'individual', 'interpret',
  'involve', 'issue', 'labour', 'legal', 'legislate', 'major', 'method',
  'occur', 'percent', 'period', 'policy', 'principle', 'proceed', 'process',
  'require', 'research', 'respond', 'role', 'section', 'sector', 'significant',
  'similar', 'source', 'specific', 'structure', 'theory', 'vary',
] as const

/** Sublist 2. */
export const AWL_SUBLIST_2 = [
  'achieve', 'acquire', 'administrate', 'affect', 'appropriate', 'aspect',
  'assist', 'category', 'chapter', 'commission', 'community', 'complex',
  'compute', 'conclude', 'conduct', 'consequent', 'construct', 'consume',
  'credit', 'culture', 'design', 'distinct', 'element', 'equate', 'evaluate',
  'feature', 'final', 'focus', 'impact', 'injure', 'institute', 'invest',
  'item', 'journal', 'maintain', 'normal', 'obtain', 'participate', 'perceive',
  'positive', 'potential', 'previous', 'primary', 'purchase', 'range',
  'region', 'regulate', 'relevant', 'reside', 'resource', 'restrict', 'secure',
  'seek', 'select', 'site', 'strategy', 'survey', 'text', 'tradition',
  'transfer',
] as const

/** Sublist 3. */
export const AWL_SUBLIST_3 = [
  'alternative', 'circumstance', 'comment', 'compensate', 'component',
  'consent', 'considerable', 'constant', 'constrain', 'contribute', 'convene',
  'coordinate', 'core', 'corporate', 'correspond', 'criteria', 'deduce',
  'demonstrate', 'document', 'dominate', 'emphasis', 'ensure', 'exclude',
  'framework', 'fund', 'illustrate', 'immigrate', 'imply', 'initial',
  'instance', 'interact', 'justify', 'layer', 'link', 'locate', 'maximise',
  'minor', 'negate', 'outcome', 'partner', 'philosophy', 'physical',
  'proportion', 'publish', 'react', 'register', 'rely', 'remove', 'scheme',
  'sequence', 'shift', 'specify', 'sufficient', 'task', 'technical',
  'technique', 'technology', 'valid', 'volume',
] as const

export const AWL_SUBLISTS: Record<number, readonly string[]> = {
  1: AWL_SUBLIST_1,
  2: AWL_SUBLIST_2,
  3: AWL_SUBLIST_3,
}

const INDEX = new Map<string, number>()
for (const [n, words] of Object.entries(AWL_SUBLISTS)) {
  for (const w of words) INDEX.set(w, Number(n))
}

/** Which sublist a headword belongs to, or null if it is not on the
 *  list we cover. Null does NOT mean "not academic" — it may be
 *  sublist 4–10, which we deliberately exclude. */
export function awlSublist(headword: string): number | null {
  return INDEX.get(headword.trim().toLowerCase()) ?? null
}

export function isAwlHeadword(headword: string): boolean {
  return awlSublist(headword) !== null
}

/** Every headword we cover, for the seed script and the verifier. */
export const AWL_HEADWORDS: readonly string[] = [...INDEX.keys()]
