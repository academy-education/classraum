# The answerability gate

How to find out whether a verbal multiple-choice cohort measures anything.
Run this before any new or repaired cohort reaches the bank.

Written 2026-08-01 after every existing check passed a bank that was
92.7-100% solvable with the audio and passages hidden.

## Why the existing scripts are not enough

`verify-answer-key-spread.ts` and `verify-option-tells.ts` are green across
the whole bank and always would have been. On the 70 Choose-a-Response items
that three blind solvers scored 94.3% on, key position was 17/15/16/22,
key-is-longest 22.9%, key-is-shortest 22.9%, and key/distractor first-word
splits were flat. Every structural measure sat at chance.

`verify-answerability.ts` measures one named sub-symptom (absolute-wording
asymmetry) and says in its own header not to use it as a gate. An earlier
version of it tried to reproduce the solvers mechanically and scored 27-33%
where they scored 92.7-100% — it PASSED a section measured at 99.2%
guessable. Regexes cannot see this. Do not build a gate out of them.

## Stage 1 — the elimination gate (cheap, run during authoring)

The tell is **negative marking on distractors**, not positive marking on
keys. Ablation: rebuilding items as one real key plus three distractors from
UNRELATED questions still scored 81.4% vs a 31.4% control, so 80% of the
signal survives detaching an option from its item. And asking for
elimination order, the first elimination hit the key **0 times in 70**, with
53 marked "certain" and none wrong.

So measure the input to the tell, not its output.

Give an independent reader the options only — no transcript, no passage —
and ask, per item:

    - which option would you reject FIRST, and why (max 8 words)
    - are you certain it is wrong
    - which is the strongest distractor

**PASS = no option is confidently rejectable without the source.**

Better than the full attack for authoring: it fires long before guessability
reaches 94%, and it names WHICH option is defective so the fix is local.

## Stage 2 — the full no-source attack (acceptance test on a finished cohort)

1. **Render blind.** Strip the transcript/passage. KEEP the question stem —
   the threat model is "can you answer without the source", not "without the
   question". Shuffle options. Preserve set grouping where items share an
   audio or passage: a solver seeing four questions from one recording can
   reconstruct it from the distractors, and a standalone render cannot detect
   that.

2. **Three independent solvers.** Force an answer on every item; no skips.
   Ask each to record confident vs guess.

3. **Score against that cohort's OWN best fixed-letter control**, never
   against 25%. Key distributions are not uniform — one real file sat at 40%
   on C, so "always C" scored 40% without reading a word.

**PASS requires BOTH:**
- mean accuracy at or below the cohort's own fixed-letter control, and
- solver pick-spreads that DIFFER from one another.

The second condition is the one that matters. On every failing verbal task
type the three solvers produced *identical* pick spreads — same option, every
item, independently. On sound maths they differed. Deterministic agreement
across independent solvers is the signature of a tell.

## Attack the scorer before believing it

Feed it a synthetic perfectly-guessable batch — it must FAIL. Feed it a
synthetic always-best-letter batch — it must PASS. Do this in an isolated
directory: writing synthetic files to the real solver output paths means a
solver that dies silently gets scored as your fake 100%.

## Ask the solvers what they noticed about the FILE

Both ablation builds had construction bugs, and the solvers found both, not
me:

- distractors sampled with replacement made 54 strings repeat, and none was
  ever a key — "pick the unique string" was a free tell I introduced
- options from related scenarios clustered across assembled items, letting a
  solver use cross-item arithmetic

A solver's *score* is evidence. A solver's *explanation of why* is a
hypothesis — check it by counting before repeating it. The "stilted legalese
distractor" three solvers described as ubiquitous turned out to be 9 of 284
options.

## Query the field the DRAW reads

Select on `item->>'listeningTask'` / `item->>'readingTask'`, never the
`domain` column. They disagree, and one served item escaped the first attack
because of it. Speaking, Writing and Complete-the-Words rows have no task
field at all and are selected by `item->>'type'` — that is correct, not a
defect.

Check returned counts against expected totals. PostgREST truncates at 1000
rows silently.

## The authoring constraint this gate enforces

See `VERBAL-DISTRACTOR-CONSTRAINT.md`. In one line: a distractor must be
wrong only because of what it says about the situation, never because of how
it is said.
