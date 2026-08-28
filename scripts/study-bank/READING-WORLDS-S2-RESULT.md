# reading-worlds-s2 — result (2026-08-28)

Scale-up of the symmetric-worlds reading method: 27 topics, 106 questions
(36 SSAT at 5 variants, 70 ISEE at 4 variants).

## Gates

    SSAT blind attack   n=36  mean 14.8%  ctl 30.6%  margin -15.7  PASS
    ISEE blind attack   n=70  mean 29.0%  ctl 34.3%  margin  -5.2  PASS
    pattern hunters     exploitable = false (both)
    cross-variant       106 judged, 17 FAIL
    with-passage QC     3 voters, full coverage: 17 unanimous, 29 at 2/3, 60 below 2

Shipped 38 (19 SSAT, 19 ISEE) — the intersection of cross-variant-clean and
>=2/3 key votes. Yield 36%.

## The finding: symmetric worlds trades guessability for ambiguity

The attack margins are the best this project has measured, and the QC vote is
the worst. Both are consequences of the same property.

Distractors in this design are OTHER VARIANTS' correct answers. The tighter
the shared skeleton, the less a blind solver can recover the key from option
text — and the more the sibling answers converge on near-synonyms that the
shown passage does not discriminate. RW-S12-3 is the clean example: the key
reads "came out the same on both slopes", a distractor reads "held steady
year after year while burrow numbers grew". Both describe flat chick weights.
They differ only in which axis the flatness runs on, and variant W3's passage
supports a reader landing on either.

This was invisible on the 23-item pilot (1 low-vote item) and appeared at
scale. It is not a bug in the renderer, the pairing, or the voters:
- QC passage pairing verified identical to the items file for all 106
- all 3 voters answered all 106 (no coverage artifact)
- the key appears verbatim in the choices

Two consequences for future runs:

1. **The with-passage vote is now a required gate for this method**, not a
   nicety. The blind attack cannot see this defect by construction — a
   converged distractor set is exactly what makes the attack pass.
2. **Variant answers must differ on a stated axis, not a degree.** The brief
   should require each variant's answer to turn on a different named quantity
   or relation, and the shown passage to make the other variants' quantities
   absent rather than merely unstated.

## Settled: items within a topic are NOT all-or-nothing

The pilot raised a worry that one shown variant answers all its topic's
questions, making them non-independent. Measured here across 22 topics with
3+ items: 2 all-or-nothing, 20 mixed. The earlier "at most one item per topic
per form" guidance was stronger than the evidence supports; 2-3 per topic with
slots spread is fine, which is what shipped.
