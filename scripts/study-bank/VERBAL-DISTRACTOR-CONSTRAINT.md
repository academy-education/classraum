# The one rule for verbal multiple-choice distractors

Supersedes the distractor guidance in `CHOOSE-A-RESPONSE-BRIEF.md` and
`toefl-authoring-spec.md`. Everything else in those files still stands.

**Scope: every verbal MC task, not just Choose a Response.** The same defect
was measured across Choose a Response, Conversation, Announcement, Academic
Passage and SAT Reading & Writing. Where this document says "the source",
read it as the audio for a listening task and the passage for a reading one;
"the utterance" in the worked examples is Choose a Response only because
that is where the mechanism was isolated. Nothing here is task-specific.

## Why this document is one rule and not a list

The previous brief listed banned distractor shapes by name — the stiff
bureaucratic option, the shrug, the over-reactor — with evidence and
worked examples. **Authors complied.** Only 9 legalese options exist in a
~2,700-item bank and none of them is a key.

The items were still 94.3% solvable with no audio.

Naming defect families moves the families. Authors avoid the named ones and
invent others, and defect DENSITY stays constant. So this document names no
families. It states the outcome and gives you a test you can run yourself.

## The measurement behind the rule

Three independent solvers, shown only the four options and never the
utterance, scored 94.3% on the live bank (chance 25%, best fixed-letter
28.6%). Two ablations located the cause:

- Rebuild each item as one real key plus three real distractors taken from
  three **unrelated** questions — no shared scenario at all — and solvers
  still score **81.4%**. Eighty per cent of the effect survives detaching an
  option from its item.
- Ask a solver which option it would reject **first**, without the source:
  it never once hit the key across 70 items, and marked 53 of those
  eliminations "certain" with zero errors.

A wrong option announces itself in isolation. That is the defect. The key
is not written to look right — the distractors are written to look wrong.

## The rule

> **A distractor must be wrong only because of what it says about the
> situation — never because of how it is said.**

A reader who cannot hear the utterance must find all four options equally
plausible as replies. Every option should be something a competent,
cooperative speaker could say in that setting. The utterance, and only the
utterance, decides which is right.

Corollary: the distractor's fault must be a *fact*, not a *manner*. Wrong
day, wrong quantity, wrong person, answers a question that was not asked,
assumes a condition the speaker denied. Not: too formal, too rude, too
casual, too eager, too passive.

**Second corollary — a distractor must be INTERNALLY COHERENT.** Its
wrongness has to live in the relationship between the option and the
utterance, never inside the option itself. Added after the first pilot,
where three independent solvers each caught the same thing:

> "I'm flying out this afternoon, so I'll come back for them tomorrow"

That contradicts itself no matter what was said, so it self-eliminates and
hands the candidate a free 1-in-3. Same for an option that is implausible in
any context at all ("I want to be sure I show up an hour early"). If you can
tell an option is wrong while the transcript is still covered, it does not
matter that its fault is factual rather than mannered — it is still a free
elimination.

Test: read each distractor completely alone, with no utterance and no
siblings. It must read as a perfectly sensible thing for someone to say.

## The self-test — run it before submitting

Cover the transcript. Read only the four options. Ask:

1. **Can I reject any option without the transcript?** If yes, that option
   is defective. Rewrite it — do not swap it for a different flavour of
   obviously-wrong.
2. **Would I bet on one option?** If a specific option feels like "the
   answer", the item is broken even if you cannot say why.
3. **Are all four the same kind of speech act?** If three make an offer and
   one complains, the complaint is free elimination.
4. **Are all four in the same register?** Same formality, same warmth, same
   level of specificity. If one is noticeably more clipped, more polite or
   more detailed than the rest, that is a tell.

An item passes when you genuinely cannot pick without the transcript.

## What this costs, and why it is correct anyway

Items built this way are harder to write and will feel "too close". That
closeness IS the task — the ETS task is discriminating between plausible
replies on the evidence of what was said. If three options are dismissible
on sight, the item measures whether a student can spot bad manners.

Expect lower yield than the old brief. Prefer 20 items that pass the
self-test over 50 that do not.

## Vary what is load-bearing

Do not make the correct answer the same *move* every time. If the key is
always uptake-plus-commitment, that shape becomes the answer key regardless
of register. Across a batch, let the correct reply sometimes be the blunt
one, sometimes the question, sometimes the refusal, sometimes the one that
changes the subject — because the utterance genuinely calls for it.

## What this brief still did NOT prevent

A 24-item pilot was authored against everything above and still failed four
of five gates. Read this section as seriously as the rule — following the
rule is necessary and is not sufficient.

| gate | result | what it means |
|---|---|---|
| no-source | **passed**, +25.0 vs a +25.5 published bar | the rule above works |
| elimination | failed — 3 of 24 had a rejectable option | the rule is hard to apply |
| with-source | failed — **0 hard items** against a 20% standard | closeness was bought by making items EASY |
| batch tells | failed — key at a length extreme on 83% (chance 50%), and slot A 6/6 in one sub-batch | the batch leaked what the items did not |
| shape | failed — a sub-batch omitted `listeningTask` | mechanical, but it would have made items undrawable |

Three additions follow directly from that.

**1. Closeness must not be bought with easiness.** The fastest way to make
four options equally plausible is to ask something trivial. That satisfies
the rule above and destroys the item. A batch must hit its difficulty mix —
roughly 20% hard — measured WITH the source in front of the reader. If your
items got closer and easier at the same time, you have moved the defect, not
removed it.

**2. Length is a tell, and it is measured.** The key sitting at the longest
or shortest option far more often than chance is a free signal that survives
every rule about register and speech acts. Across a batch, the key must land
at a length extreme no more often than chance. Do not fix this by padding —
write options that genuinely need similar space.

**3. The batch is a unit, and it is attacked as one.** Key position, key
length, and key SHAPE are batch properties. No item can be checked for them
alone. This project has now shipped three distinct cross-item tells, each
invisible to the check watching for the previous one — key-in-slot-A, the
complete-ABCD-permutation, and identical key PROSE across eight lectures with
letters correctly rotated. Rotate what varies, and assume the thing you did
not think to vary is the next tell.

## The gate

Before any item reaches the bank, an independent reader who has not seen the
source names, per item, the option they would reject first and whether they
are certain. **Any item with a confidently rejectable option fails.** This is
the cheap gate and it fires earliest — run it first, and note that it names
WHICH option is defective, which the attack cannot.

The no-source attack then runs on the surviving cohort as an acceptance test.

**The passing bar is calibrated, not absolute.** An earlier version of this
document required "mean accuracy at or below that cohort's own fixed-letter
control". That bar is unreachable and was wrong in both directions — it
failed a batch that matched published ETS quality, and it passed a healthy
SAT domain by accident. Measured against 183 official ETS and College Board
items, published questions themselves score well above their own controls:

| format | published margin over control |
|---|---|
| ETS Choose a Response | +25.5 |
| SAT Reading & Writing | +36.2 |
| ETS listening — lecture sets | +68.8 |
| ETS listening — short conversations | +13.0 |

So a batch passes when its margin is **at or below the published baseline for
its own format** (plus a 4-point tolerance for sample noise), with solver
pick-spreads that differ from each other. Use the format's OWN baseline:
lectures and short conversations are five times apart, and averaging them
into one "listening" number is meaningless for both. `ceilingFor()` in
`src/lib/study/bank-ledger.ts` is the implementation.

Every number above comes from AI solvers, not students. The comparison to
published items holds because both sides were measured the same way; an
absolute claim about human candidates does not follow, and re-measurement is
owed if real student data ever arrives.
