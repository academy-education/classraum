# reading-worlds-s3 — pattern hunter (2026-08-29)

**exploitable: false.** ~45 mechanical rules scored against the key;
nothing beat its control by more than ~5 points on any slice large
enough to believe. Threshold was 15.

The detector was self-tested against injected tells first (96.2% on a
planted key-word, 51.6% on a 40%-planted one), so a null result here is
a null from an instrument that fires.

## It refuted two claims the blind solver made

1. **"Assert one, deny three" did not leak into option text.** Negation
   rules score at chance (most-negation 21.7% vs 21.9%; no-negation
   22.2%). The denials live entirely in the passages; options across a
   set are uniformly affirmative parallel phrases. This was the risk all
   three authors independently flagged, and it did not materialise.

2. **The hedged-attitude ladder is not there — the authors wrote
   against it.** S03-6's key is the ABSOLUTE option ("certainty that the
   question is wholly closed") while the hedged one is a distractor;
   S02-6 and S04-6 do the same. The qualified-option rule lands at 32.7%
   on attitude items instead of the 60-70% it would score on a naive
   batch. Credit to the authors, not to the checkers.

## It corrected something I reported

I read the keyword-parity check's 160 INVERTED hits as paraphrase and
said option keywords tend to sit in sibling passages rather than their
own. Measured directly, the aggregate runs the OTHER way: an option
overlaps its own variant's passage MORE than its siblings' (0.430 vs
0.357), and the key overlaps the shown passage more than distractors do
(0.447 vs 0.366).

Both can hold at once — specific rare words absent while overall overlap
favours the home passage — but my characterisation was partial and the
direct measurement is the better one. It also means there IS a mild
ordinary keyword-matching path WITH the passage: 32.5% overall (ISEE
40.3%, SSAT 27.7%) against 21.9%. That is +10.6, below the bar, not a
blind tell at all, and worth watching rather than acting on.

## The number that looked like a hit, and why it is not

A leave-one-topic-out naive-Bayes key-word classifier hit 46.7% vs 25%
on ISEE, permutation p=0.020. The hunter attacked its own finding:

  - it is one of ~12 slices scored, so p=0.02 does not survive multiplicity
  - the carrying words are content-free noise from a 24-item training set
    ("later", "every", "plain", "keep")
  - ten train/test splits within ISEE ran 8% to 75%
  - it REVERSES SIGN on held-out authoring: train SSAT test ISEE 21.7%
    (control 25), train ISEE test SSAT 13.2% (control 20)

A rule that goes below chance on held-out data is overfit, not a tell.
This is the discipline the option-balance proxy lacked when it was
believed.

## The finding that changes how the attack is READ

Within every topic, all six keys come from the SAME variant — necessarily,
since there is one shown passage. So the six items in a topic are
perfectly correlated: identify the world once and six items follow.

    effective n is 13 TOPICS, not 78 items

That does not change the measured margins (SSAT −9.7, ISEE −6.7) but it
widens their error bars considerably, and it means per-item difficulty
statistics on these sets are not independent. **Score future reading
batches by topic.**

The lexical route to that correlation is closed: max-coherence assignment
over all option combinations scored 17.9%, BELOW chance, 0 of 13 topics
fully right, and letter shuffling is clean (22.6% same-variant letter
sharing vs 21.7% expected). But a SEMANTIC solver is a different
instrument, which is why a targeted set-as-puzzle attack is running.

## Also checked and clean, so nobody repeats them

All six historical tells re-run: letter spread (19/17/13/19/10, best
fixed letter 24.4%), length rank both directions, punctuation,
concessive/hedge markers, option-family balance, cross-topic key prose.
Plus prompt-overlap both directions, long-word and average-length rules,
odd-one-out frames, absolutes, per-position letter distributions,
distinct-keys-per-topic, adjacent-key repetition.

Per-question-KIND slices show apparent hits ("always A" on ISEE detail =
80%) but every such slice is n=5, and a random picker over the full 78
reaches 35.9% at max across 200 draws. The hunter declined to report
them as candidates, which is the right call and the one this project got
wrong with a 14-item cohort once before.
