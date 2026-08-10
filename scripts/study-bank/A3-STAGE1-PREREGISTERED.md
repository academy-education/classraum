# A3 stage 1 — Choose a Response, pre-registered

**Status: DRAFT, awaiting approval. No authoring has begun.**

Written before any item exists, because three rounds have already failed
and the failure mode each time was discovering it after the batch.

---

## 1. Why rebuilding, and why not pulling

Pulling was the cheaper option and it is not available:

| Listening task | needed per test | pool | unseen-first sittings |
|---|---|---|---|
| **Choose a Response** | **14** | **71** | **5.1** |
| Conversation | 12 | 193 | 16.1 |
| Announcement | 6 | 121 | 20.2 |
| Academic Talk | 16 | 274 | 17.1 |

Removing the task drops Listening from 48 questions to 34 — 71% of the
ETS shape. The section stops being a TOEFL mock, which is the product's
whole claim. Pulling is only available if you also accept a documented
deviation from the real exam.

The table also shows what the register never stated plainly: this cohort
is **the most broken and the thinnest by 3×**. Replacing 72 items leaves
it the shallowest task in the section.

## 2. What is actually wrong

Not the individual items. The **brief**.

The cr-v1 authoring spec fixes a four-slot distractor roster: one
accept-and-act key, plus a parodic over-formal option, a rude/escalating
one, a dismissive minimiser, and a topic-shifting question. All three
solvers described that roster unprompted, without audio.

The consequence is structural: **the key is the option that is none of
the four types.** A solver never has to understand the spoken line — it
identifies the odd one out. Removing one slot leaves three and the
inference still works, which is exactly what the 2026-08-06 repair
measured: 74.4% blind after, against 75.6% on untouched items. A ~3
point move, and my prediction was wrong by 46 points.

Committed accuracy is the number that matters: **when a solver commits,
it is right ~92% of the time with no audio**, and that holds for repaired
items, untouched items, and both authoring cohorts.

## 3. The new brief's load-bearing property

> **Every option must be a natural, competent reply to *some* plausible
> prompt. The question is which one fits the line actually spoken.**

A distractor is not wrong because it is rude, over-formal, dismissive or
off-topic. It is wrong because it answers a *different* utterance.

Three constraints follow, and they are the point of the rebuild:

1. **No fixed roster of distractor types may be specified.** A fixed
   roster is what produced this tell. If the spec names the categories,
   the categories become the answer.
2. **No option may be identifiable as wrong without the prompt.** One of
   the 24 replacements written on 08-06 was internally self-contradictory
   and solvers cracked it on that alone. If a reader can reject an option
   by reading it in isolation, it is not a distractor.
3. **The load-bearing element must vary across items.** Let different
   parties be the committed one; let the qualifier sometimes sit in the
   first clause and sometimes the last; let the correct reply sometimes
   decline rather than accept. Per the CLAUDE.md corollary: the more
   rigid the spec, the more the answer is predictable from the spec
   rather than the content.

Key letters flat by construction, so the control is honest.

## 4. Stage 1 — the test

- **Author 12 items** under the new brief. Not 30, not 72.
- **Attack those 12 immediately**, before any further authoring: 3
  independent solvers, source withheld, no audio, no transcript.
- **Control = best single fixed letter** over the actual key
  distribution, never a flat 25%. (The 08-06 run's control was 29.2%.)

### Pass / fail, fixed now

| result | decision |
|---|---|
| margin **≤ 25 points** over control | **PASS** — proceed to stage 2 |
| margin **> 25** | **FAIL** — stop authoring, go to §6 |

25 is the threshold in SYSTEM.md, chosen because official ETS items sit
at **+25.5** on this same instrument. It is itself one small-sample
measurement and is not a law of nature; it is the best anchor available.

### What would make this test a lie

Stated in advance so it cannot be rationalised afterwards:

- **12 items is a small sample.** A margin near the line (say 20–30)
  should be treated as *inconclusive*, not as a pass. Only a clear
  result decides.
- **A failed slice is discarded, never banked, and never used to tune
  the next slice item-by-item.** If stage 1 fails, the *brief* is
  revised and a fresh 12 authored. Tuning against the attacked items is
  the calibration trap already recorded in CLAUDE.md — it would make
  the next number meaningless.
- **Two revisions maximum.** A third failure is §6, not a fourth brief.

## 5. Stage 2 — only if stage 1 passes

- Scale to **~200 items** (≈15 sittings, matching the other Listening
  tasks). Not 72 — replacing the count leaves the depth problem.
- Attack a **fresh held-out sample** from the scaled batch. Stage 1's
  result does not transfer: it measured 12 items, not a method at scale.
- Retire cr-v1 only once the replacement pool can fill a sitting.

## 6. If stage 1 fails — the fallback, agreed now

Do **not** author a fourth round.

Reduce Choose a Response in the Listening blueprint and redistribute to
Conversation and Academic Talk, which have 16× and 17× depth. Document
the deviation from the ETS shape in the spec, on the score report, and
wherever the product claims to mirror the real exam.

That is a worse product than a working task type. It is a better product
than 14 questions per sitting that a student can pass without listening.

## 7. What this does not decide

**B2 is not a dependency, but it is relevant.** On every cohort a human
has actually checked, the blind attack over-called: Announcement 100% →
15%, Daily Life 100% → 21.4%, Academic Passage 100% → 41.7%.

Choose a Response is the one cohort where a human agreed — 53.3% by the
better of two readers, against 76.9% blind — so the finding stands on
two instruments rather than one. But if Academic Talk clears by hand the
way Announcement did, that is evidence the attack over-calls on this
whole task family, and the +45.1 here deserves re-reading before ~200
items are authored against it.

Recommended: run B2 first. It costs 20 minutes and could change the size
of this job.
