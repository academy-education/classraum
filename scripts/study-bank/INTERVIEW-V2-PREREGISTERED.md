# interview-v2 — pre-registered (2026-08-28, gates stated before any QC ran)

Goal: Interview is the second-thinnest TOEFL task after Daily Life —
12 live four-rung sets, one set per Speaking section, so 12
repeat-free sittings. 8 new sets (32 rungs) → 20 sittings. Cohort
`interview-v2`, insert via insert-interview (frozen path;
checkSpeakingInterview + gateBatch family `production`).

## Shape (mirrors the 12 live sets exactly)

- passageGroupId "interview-<topic>"; situation passage 1-2 sentences
  ("The <campus body> is interviewing students about <topic>...").
- 4 rungs, fixed ladder: personal experience (with a built-in
  alternative so every student can answer) → preference/contrast →
  evaluate a quoted claim → future/abstract. All difficulty hard
  (cohort convention). Prompts prefixed "[Interview] ".
- correct_answer EMPTY (free response); explanation = examiner-voice
  coaching per rung.

## Gates (family production: shape / withsource / tells)

1. shape: checkSpeakingInterview per rung (enforced at insert) plus a
   local check: 4 rungs per group, prompt tag present, empty key,
   ladder order preserved (created_at ordering is what the assembler
   plays back).
2. withsource (the substantive gate for a free-response task):
   3 independent reviewers per set judge — (a) ANSWERABILITY: can
   every student, including one with no relevant experience and no
   spending money, produce a 30-second answer to every rung; (b)
   LADDER: each rung genuinely escalates in abstraction and no rung
   depends on another rung's answer; (c) NEUTRALITY: no cultural,
   financial, or regional assumption; (d) DISTINCTNESS: no rung
   substantively duplicates any rung of the 12 live sets. A set
   failing any reviewer on (a) is dropped; other flags need 2/3.
3. tells: topic-level Jaccard vs the 12 live sets and within batch;
   no two new sets sharing a rung template beyond the fixed ladder
   (the ladder itself is the deliberate, serving-visible structure —
   not a tell, because nothing is hidden from the student and there
   is no key to leak).
4. Ledger entry at the rows-file sha, insert-interview under
   BANK_COHORT=interview-v2, live count verified 48 → 80 rungs
   (12 → 20 sets) by count query.

No nosource attack exists for this family: the task is free-response
with no key — the answerability review is the gate that matches the
task's actual failure mode (a rung a real student cannot answer).
