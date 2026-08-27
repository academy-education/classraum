# math-v3 Stage 1 — pre-registered, before any item exists (2026-08-28)

Goal: deepen SAT Math's two binding domains — Advanced Math (191) and
Algebra (199), together 30 of every 44-question form — toward ~16
forms. Cohort `math-v3`, MC only, no graphics (practice draws filter
graphic-backed items out), contextualized word problems per test-specs
(the live bank leans bare-symbol; this batch corrects toward the spec).

## Rules learned from the bank's own history

- Every distractor is the honest output of a NAMED wrong step in the
  solution, recorded per item — never a transform of the key. No option
  may be -key, 2·key, key/2, key², √key, 1/key, key±1, 10·key, key/10,
  90−key, 180−key unless that value is also a specific mis-step's
  output, and never more than one option in such a relation (the
  derivational-hub lesson, MATH-HUB-RESULT.md).
- Each item ships a `solve` JS function body that recomputes the key
  from the stem's numbers — synchronous, closed-form, returns the exact
  option string. The sandbox gate rejects anything it cannot recompute.
- Difficulty medium/hard only (grader-easy is barred at insert);
  target the hard-item spec: ≥3 reasoning steps, translate → technique
  → execute → check.
- Subskills from the de-facto vocabulary (Vieta, tangency via
  discriminant, remainder theorem, exponential models, systems with
  parameter, mixture systems, function composition, …); topic_tag
  kebab-case; topics varied — no two items in the batch share a
  template or a real-world setup.

## Gates (stated before authoring)

1. sandbox recompute on every item (deterministic; a mismatch is a
   dead item, not a fixable one — mis-keyed math is mis-authored math).
2. Difficulty grader (anchored, Haiku): easy → dropped.
3. Options-only nosource attack on the pilot 12 (stems stripped, four
   options shown, 3 independent solvers, best-fixed-letter control).
   Numeric options should carry nothing: pass ≤ +15 margin (the live
   Advanced Math cohort sits at +16.6 and this batch must beat it),
   dead ≥ +30, between → author 12 more, re-attack the union. Identical
   pick-strings = no verdict.
4. Stage 2 (on pilot pass): scale to 60 total (30+30), sandbox + grader
   on all, fresh 12-item options-only attack, insert under
   BANK_COHORT=math-v3, then the DB-backed checkers scoped to the new
   cohort: check-math-hub.mjs, check-distractor-derivability.mjs,
   check-duplicate-items.mjs — archive on any failure.

Items failing any gate are dropped, never edited.
