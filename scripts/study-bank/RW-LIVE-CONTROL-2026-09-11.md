# Matched live controls for three R&W candidate batches

**Read the second section first.** These are MODEL numbers on cohorts where a
human has already sat the same material and scored 55 points lower. The
register records an over-call made on exactly this evidence on 2026-09-05 and
retracted the next day; nothing here reopens it.

Three matched live controls, run on 2026-09-11 with the SAME protocol, the
SAME render path and the SAME three-solver budget as the candidate batches
they were drawn to compare against. Sampled by
`attack-cohort.mjs prepare --domain <d> --limit 24 --drawable`, so every item
is one the assembler actually serves (`verified=true`). Options only; the
passage, figure and table are withheld. Chance = 25.0%.

## The three controls, against the three candidates

| domain | LIVE bank (control) | candidate batch | unanimous items |
|---|---|---|---|
| Information and Ideas | **100.0%** | `sat-ii-v1` 69.4% | live 24/24, cand 16/24 |
| Craft and Structure | **93.1%** | `sat-cs-v5` 40.3% | live 21/24, cand 8/24 |
| Expression of Ideas | 45.8% cohort | `sat-eoi-v7` 37.5% | live 7/24, cand 8/24 |
| — its transition items | 27.8% | 25.6% | 1/18 vs 3/13 |
| — everything else | **100.0%** | 51.5% | 6/6 vs 5/11 |

**Every candidate batch scores lower than the live bank in its own domain on
this instrument** — Information and Ideas by 31 points, Craft and Structure by
53. Since both sides were measured the same way on the same day, that
comparison holds whatever the model/human gap turns out to be, and it is the
only claim here that does. It says the candidates are not unusually leaky for
this bank. It does NOT say they are clean: `sat-ii-v1` at 69.4% with 16 of 24
items unanimous is a batch whose attackers all named the same mechanism, and
it should not ship as authored.

## The Information and Ideas result is different in kind

Three solvers, run separately, with no sight of each other's files, returned
the **identical 24-character pick string** and scored 24/24:

    ADBCBBADCDBACABCCACBABAD

A model ceiling does not look like this. Saturation produces high scores with
solver disagreement — three SSAT solvers agreed on 8 of 30 earlier this week,
and three C&S solvers returned 2/5/20 rejection counts on one render. Perfect
agreement on every item means the option sets are deterministic: they select
their own key, and three different readers walk the same path to it.

## The finding that changes the instrument: `legal` is not a proxy for solvability

On the I&I control, **`legal==1` was reported ZERO times across all 72 votes**
— and the score was 100%. Not one item could be shown to have a single legal
option, and every item was answered correctly by everyone.

This retires an idea that was about to be used as a gate. The elimination
check asks "can you prove the other three illegal?" The leak here answers a
different question: *which option is the author's key?* All three solvers
named the same mechanism independently — in 20 of 24 sets exactly one option
is hedged or two-sided ("a mix of...", "qualified support... limiting its
scope", "accurate for simple filaments but not for complex feathers") and the
rest are absolutes (*entirely, proves, no role at all, every category,
permanently*). None of the absolutes is illegal. They are simply not how a
careful author writes a key, and that is enough.

So the `mc_hidden_source` gate rule — "zero items with any confidently
rejectable option" — is necessary and nowhere near sufficient. A batch can
pass it with a perfect score against it and still be fully solvable. **Score
the attack; do not gate on `legal`.** This is the sixth structural proxy to
fail (OPTION-BALANCE-RESULT.md records the fifth), and it failed the same way
all of them do: it measured a mechanism rather than the outcome.

Two further channels the solvers found in the live items, both invisible to
every checker in the repo:

- **Numeric self-corroboration across options.** On the data items (control
  2, 19, 20) two options quote the same cell, which pins it, and any option
  contradicting the pinned value dies — with the graph fully hidden. The same
  channel was independently found in `sat-ii-v1` by all three of its
  attackers. It comes from building distractors by perturbing single cells of
  a real table: perturb a cell a sibling option also quotes and the table is
  partly reconstructible from the option set.
- **Stem-option axis mismatch.** On support/undermine stems, an option
  reporting the mechanism working as predicted cannot undermine it. Free.

## What these numbers are NOT evidence of

They are not evidence that the live bank is broken for students, and they are
the third and fourth model measurement of a question a human has already
answered differently:

    cohort                  model 2026-09-04   model TODAY   human (B2)
    Craft and Structure     97.5%  (n=54)      93.1% (n=24)  40.0%  (n=20)
    Information & Ideas     91.9%  (n=86)      100.0% (n=24) 40.0%  (n=20)

Today's controls REPRODUCE the model numbers and say nothing new about
people. The same gap is on record twice more: the co-founder scored 10.0%
blind on ACT where the model scored 76-79%, and seven TOEFL cohorts where the
attack said 83-100% and a person scored 13-27%. The standing rule is that the
blind attack is a SCREEN and a human sitting is the VERDICT, and 40.0% sits
inside the pre-registered 36-59% dead zone, so it neither condemns nor clears.

**So: still no rewrite programme.** The unblocking step is unchanged — B6,
`calibration-andy-2026-09-02`, 20 of 20 unseen, ~20 minutes.

What DOES survive the model/human gap is everything measured relative to the
same instrument, which is why the controls were run at all:

- the candidate-vs-control comparison, since both sides were solved by the
  same solvers under the same protocol on the same day;
- the `legal` finding below, which is a fact about the checker, not about the
  bank;
- the identical pick strings, which are a fact about the option sets.

## Expression of Ideas: the cohort number was hiding the split

Items were stratified by their own STEM TEXT (`/transition/i`), so the same
rule cuts the control and the candidate. The live cohort's 45.8% is a blend
of 27.8% and 100.0% in an 18:6 ratio and describes neither stratum. On the
synthesis half, 16 of 18 votes were `legal==1` and all three solvers named
the same mechanism before scoring: the stem enumerates what the answer must
contain (two studies, both figures, the self-report AND the measurement) and
the distractors are built by DROPPING one of those parts. That is a
completeness test on the option text; it needs no notes.

`REGISTER.md` carried "SAT | Expression of Ideas | 244 | 100%" — right about
the synthesis stratum, wrong as a cohort fact. Corrected in the same commit.

## Tool changes this run required, and how each was broken first

`attack-cohort.mjs` was paging both `study_item_bank` and
`study_item_attacks_fresh` with `.range()` and **no `.order()`** — the trap
CLAUDE.md records twice. An unordered paged read can repeat rows on one page
and never return others, so the sampler could silently omit part of the
population while marking the rest "considered and passed over". Both reads
now `.order()`.

`--drawable` was added, restricting the sample to `verified=true`. A control
that mixes in staged items the assembler never serves is not a measurement of
the shipped bank. Checked against live counts rather than asserted: Craft and
Structure 288 -> 277 (11 staged excluded); Expression of Ideas and
Information and Ideas unchanged at 244 and 250. The flag does something where
there is something to do and nothing where there is not.

The EoI control deal was re-seeded before solving. The first seed dealt the
key to B on 13 of 24, and a letter-biased solver would have scored high on
the control — inflating it, which is the direction that flatters the
candidate. The seed used deals 7/6/6/5. The sampler re-letters every item, so
letters carry nothing and choosing a seed for a flat deal costs no validity.
