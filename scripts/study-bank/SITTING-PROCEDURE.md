# How a human sitting is run

**This exists because we circled.** Five sittings between 2026-08-04 and
2026-08-11 produced one usable number. Each failure had a different cause
and each was answered by improvising a fix, which produced the next
failure. This is the fixed procedure. Follow it or change it deliberately
— do not improvise inside it.

---

## 0. The one thing being measured

> Can a person pick the intended answer **without the passage or audio**,
> more often than chance?

That is the whole instrument. Everything below protects that question
from the four ways we have already broken it.

---

## 1. Before drawing — three checks, thirty seconds

| check | why it exists |
|---|---|
| **Who is sitting, said out loud** | The register named the wrong person twice and I then repeated the error in my own analysis. The database stores the login, and the login is exactly what keeps being wrong. |
| **On their own account, permanently** | Reviewer identity IS the account. Two humans on one login merge into one `reviewer_id` and every past sitting under it becomes ambiguous — retroactively. |
| **Cohorts chosen and written down now** | The cohort dropdown has misdirected three sittings. Draw the run, then tell the reviewer to press Resume and touch nothing. |

Current mapping, confirmed by Andy 2026-08-11:

- `support@classraum.com` — **the co-founder**. All real sittings.
- `andy.manager@gmail.com` — **Andy**. Holds the co-founder's B1 mirror
  by mistake; do not treat as Andy's history until that is repointed.
- Anyone new needs a **new account**, never a shared one.

## 2. Draw ONE run covering every cohort you need

Not one cohort at a time. Five separate 20-minute asks is how you spend
a colleague's goodwill and still learn nothing.

Order cohorts **most-valuable first**, so a reviewer who stops halfway
has still answered the question that mattered most.

## 3. What the reviewer is told

Short, and in your own words. The full text lives in
`CALIBRATION-MESSAGE.md`; the load-bearing part is:

> Pick one on every item, even when you are unsure. Being unsure is
> normal — the source is hidden, so you are *meant* to be unsure. If
> three look wrong, or one looks longer or more test-like, pick it: that
> hunch is exactly what we are measuring. If nothing points anywhere,
> choose at random and move on.

**There is no abstain button any more.** It was removed on 2026-08-11
after it destroyed four sittings. Do not add it back without reading §7.

Do NOT tell them a run is a calibration, or which items are which. A
reviewer who knows looks harder, and the run stops measuring what it is
for.

## 4. Validity BEFORE score — read in this order

A sitting can be invalid for reasons that have nothing to do with the
number, and the number is seductive. Check these first and stop if any
fails:

1. **Completion.** Every drawn item answered. A partial run is scored
   only over what was answered, never extrapolated.
2. **Timing.** 30–90 seconds per blind item is the observed band for an
   engaged reader. Under ~10s per item across the run means clicking.
3. **Cohort tags.** Items are from the cohorts you drew. This has been
   wrong once.
4. **Content freshness.** Zero stale `content_sha`. Reviews are bound to
   the content they judged (migration 076); an edited item invalidates
   its review rather than silently keeping it.

## 4b. Score it — one command

    node scripts/study-bank/score-sweep-run.mjs <runId>

Per cohort, never blended. `scoreRun()` in lib/study/item-review.ts
returns ONE verdict per RUN, which was fine when a run was one cohort and
became wrong the moment runs spanned four: a blended number can read
clean while one cohort inside it leaks.

It prints the §4 validity block first, refuses to read a cohort whose
abstention rate is over 20% (a score deflated by abstention looks like a
clean one — the confusion that nearly cleared 275 Academic Talk items),
and self-tests against six fixtures plus three completed runs whose
numbers are already in the register:

    node scripts/study-bank/score-sweep-run.mjs --selftest

## 5. The decision rule, fixed before the sitting

Per cohort, against **the best single fixed letter over that cohort's
actual key spread** — never a flat 25%:

| result | reading |
|---|---|
| within ~10 points of control | **clean** — a person cannot shortcut these |
| 10–25 over control | **inconclusive** at n=20; needs more items, not more argument |
| more than 25 over control | **leaks** — the options give it away |

25 is the threshold in SYSTEM.md because official ETS items sit at
**+25.5** on this same instrument. It is one small-sample measurement,
not a law, and it is the best anchor available.

**n=20 is coarse.** Margin of error is roughly ±11 points. "Clean" means
*a 20-item sample found nothing*, which is not the same as *verified*.
Say it that way in writing, every time.

## 6. What happens next, by outcome — decided now, not after

| outcome | action |
|---|---|
| **clean** | Record it. Do not re-sit for reassurance. |
| **inconclusive** | Draw MORE ITEMS from the same cohort. Do not reword anything. |
| **leaks** | Treat as confirmed only where the blind attack agrees. Where they disagree, **the human wins** — that finding is from 2026-08-06 and has held. |
| **invalid** | Fix the mechanism named in §4 and re-draw. Never re-word and hope. |

## 7. The rule that stops the circling

**If a sitting fails for the same reason twice, change the MECHANISM,
not the words.**

The abstain button is the case study. Abstention ran 0–8% before it was
emphasised, then 85%, 92.5%, 95%, 70%. Three rewordings — the brief
twice, then the button label — each produced another unusable run. What
finally worked was deleting the control.

The general form, and it is the same lesson CLAUDE.md records about
gates: *a documented instruction nobody follows is an instruction; a
mechanism that makes the failure impossible is a fix.* Wording is an
instruction. Removing the button is a mechanism.

Corollary, learned the expensive way on the item bank: **structural
pre-flight gates, it never authors.** Twice a real surface asymmetry was
"repaired" by hand and the repair introduced a worse semantic tell —
once costing 25 points. Report the pre-flight numbers, act on the
attack.

## 8. What this procedure cannot do

- It cannot make n=20 precise.
- It cannot calibrate the TOEFL Speaking/Writing **grader**, which is a
  separate open problem: our scoring runs about 1.5 bands harsh against
  ETS's own published samples, and only two such samples exist publicly,
  so it cannot be fixed by tuning without fitting to the whole test set.
- It cannot tell you whether the AI blind attack over-calls on a cohort
  no human has read. Only a sitting does that, which is the point.
