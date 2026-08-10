#!/usr/bin/env node
/**
 * The SAT R&W accept rule — PURE, no DB client, so it can be tested.
 *
 * It lived in bank-helper.mjs, which imports @supabase/supabase-js at the
 * top level; Jest cannot transform that, so the two carve-outs below went
 * unpinned by any test for their whole life. One of them had silently
 * widened past what its own comment claimed.
 */
export function accepts(qc, domain, subskill) {
  if (!qc) return { ok: false, why: 'no qc row' }
  const kv = Number(qc.key_votes)
  // Standard English Conventions carve-out: difficulty/distractor graders
  // systematically under-rate these (the options are punctuation marks, so
  // they always read as "easy/mechanical"), so those grades are not
  // meaningful here. A conventions item is sound iff it tests a real rule
  // with exactly one defensible answer — which UNANIMOUS blind agreement
  // (3/3) confirms. Author judgment guards against trivial rules upstream.
  if (domain === 'Standard English Conventions') {
    if (!(kv >= 3)) return { ok: false, why: `conventions needs unanimous key (got ${kv}/3)` }
    return { ok: true }
  }
  if (!(kv >= 2)) return { ok: false, why: `key_votes ${kv}<2 (contested/mis-keyed)` }
  if (!['hard', 'medium'].includes(qc.difficulty)) return { ok: false, why: `difficulty ${qc.difficulty}` }
  // Rhetorical Synthesis carve-out — NARROWED 2026-08-09 to the one lens
  // it actually argues for.
  //
  // The reasoning below is sound and unchanged: by design its distractors
  // are TRUE statements drawn from the notes that fail the stated
  // rhetorical goal, so graders score them "weak" even when they are good
  // traps. The distractor-quality lens does not fit this item type.
  //
  // But the carve-out `return { ok: true }`-ed BEFORE the passage check
  // too, which its comment never claimed and nothing justifies. That check
  // is the one asking whether the item needs its source at all — and
  // Expression of Ideas is 65/66 Rhetorical Synthesis and scores 100%
  // blind (12 of 12 attacked items solved with the source hidden, against
  // a ~25% control). The guard that was silently disabled is the guard
  // watching the dimension the cohort fails on. That is not proof the
  // carve-out caused it, but it removes the only mechanism that would
  // have caught it.
  //
  // So: skip the distractor lens, keep the passage requirement.
  const skipDistractorLens = domain === 'Expression of Ideas' && subskill === 'Rhetorical Synthesis'
  if (!skipDistractorLens && !['plausible', 'strong'].includes(qc.distractor_quality)) {
    return { ok: false, why: `distractors ${qc.distractor_quality}` }
  }
  if (qc.passage_needed !== true) return { ok: false, why: 'not passage-dependent' }
  return { ok: true }
}
