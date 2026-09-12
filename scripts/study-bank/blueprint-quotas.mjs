/**
 * The per-domain blueprint shares, in ONE place.
 *
 * WHY THIS FILE EXISTS. `form-capacity.mjs` derived its per-domain need from
 * these shares and `next-form.mjs` carried its own copy, typed from memory.
 * The copy was wrong three separate times on 2026-09-12, and each wrong copy
 * produced a confident authoring brief:
 *
 *   1. SAT Math quotas invented outright -- Algebra 13 against a real 15, PSDA
 *      10 against 7, Geometry 6 against 7. Asked for the form-20 deficit it
 *      answered "Advanced Math +12" when the truth was "+12 and Algebra +3".
 *   2. ACT quotas applied at 8 per form for every domain when Number and
 *      Quantity is 5. Nine items were commissioned into a domain that already
 *      had twelve forms' worth, and bought nothing.
 *   3. `round()` used where ACT needs `ceil()`. ACT shares are published range
 *      MINIMUMS -- 17% of a 48-question form is 8.16 questions and a form
 *      carrying 8 does not meet the floor -- so the need is 9, not 8. This one
 *      made the two tools disagree about the binding domain immediately after
 *      an insert.
 *
 * Two tools deriving one fact from two tables is the defect; the fix is one
 * table. `minimums: true` marks a family whose shares are floors rather than a
 * partition, which changes BOTH the rounding and the sum assertion.
 *
 * This module must stay free of side effects -- no database, no CLI, nothing
 * that runs on import. `form-capacity.mjs` cannot currently be imported at all
 * because its CLI executes at module scope and hits the database; that is the
 * 2026-09-04 "13 checkers ran their CLI on import" defect, still live there,
 * and the reason the tables were moved out rather than exported in place.
 */

export const QUOTAS = {
  'sat/math': {
    form: 44,
    // An exact partition: these are the published domain shares of the section.
    domains: {
      'Algebra': 0.35,
      'Advanced Math': 0.35,
      'Problem-Solving and Data Analysis': 0.15,
      'Geometry and Trigonometry': 0.15,
    },
  },
  'sat/reading_writing': {
    form: 54,
    domains: {
      'Information and Ideas': 0.26,
      'Craft and Structure': 0.28,
      'Expression of Ideas': 0.20,
      'Standard English Conventions': 0.26,
    },
  },
  'act/math': {
    form: 48,
    // Published RANGE MINIMUMS, not a partition. They sum to 0.95 on purpose.
    minimums: true,
    domains: {
      'Number and Quantity': 0.10,
      'Algebra': 0.17,
      'Functions': 0.17,
      'Geometry': 0.17,
      'Statistics and Probability': 0.17,
      'Integrating Essential Skills': 0.17,
    },
  },
}

/** Items of each domain one form consumes. `ceil` for minimums, `round` for a
 *  partition — see defect 3 above. */
export function perForm(key) {
  const q = QUOTAS[key]
  if (!q) return null
  const r = q.minimums ? Math.ceil : Math.round
  return Object.fromEntries(Object.entries(q.domains).map(([d, sh]) => [d, Math.max(1, r(sh * q.form))]))
}

/** Shares must partition to 1, or — for minimums — never exceed it. Asserted
 *  rather than trusted, because every one of the three defects above would
 *  have survived a reading of this file and none would have survived a check. */
export function assertShares() {
  const bad = []
  for (const [k, q] of Object.entries(QUOTAS)) {
    const total = Object.values(q.domains).reduce((a, b) => a + b, 0)
    if (q.minimums ? total > 1.001 : Math.abs(total - 1) > 0.02) {
      bad.push(`${k} shares sum to ${total.toFixed(2)}${q.minimums ? ', which exceeds 1 for range minimums' : ', not 1'}`)
    }
  }
  return bad
}
