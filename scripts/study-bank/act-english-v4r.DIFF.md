# `act-english-v4r` — repair of the 27 Conventions of Standard English items

Source: `act-english-v4.batch.json` (50 items, STAGED, never overwritten).
Output: `act-english-v4r.batch.json` (50 items, same 5 passage groups, same
27/15/8 domain split).

**What was repaired against.** REGISTER §5, 2026-09-12: a matched live control
(60 shipped ACT English items, four passage-disjoint files, four independent
options-only solvers, control derived at 26.7%) put

    Conventions of Standard English   LIVE 17/25 = 68.0%   v4 27/27 = 100.0%   p = 0.0014
    Knowledge of Language             LIVE 13/14 = 92.9%   v4  8/8  = 100.0%   p = 1.0
    Production of Writing             LIVE 14/21 = 66.7%   v4 10/15 =  66.7%   p = 1.0

Only the Conventions stratum carries a real deviation. **The 15 Production of
Writing and 8 Knowledge of Language items are byte-identical to the original**
— asserted in `act-english-v4r.repair.py`, and the assertion was break-tested (tampering one
Production item aborts the build with
`AssertionError: ACT-EN4-P1-Q04 was modified and must not be`).

**Target is 68%, not 0%.** The live Conventions bank sits at 68.0% against a
26.7% control and that is inherent to editing-in-place grammar: the option
string of a grammar item carries its own grammaticality. What is *not* inherent
is a free elimination, and that is what was removed.

## The four mechanisms, as named by the solvers

1. **Elimination-to-the-residue on NO CHANGE items** — all three named alternates
   independently ungrammatical, so the opaque `No Change` token wins unread.
2. **The alternatives bracket the error** — two options carry the same error in
   opposite directions, so the option set names the rule and the clean form is
   the unique survivor on that axis.
3. **Known-wrong orthography** — `its'`, `her's`, `hers'`, `there eggs`, `leafs'`
   are strikeable on sight, removing a quarter of the field for free.
4. **The redundancy ladder / register sandwich** — options that are the same
   phrase at increasing lengths, or one colloquial + one inflated + one plain.

## The governing repair rule

An options-only solver never sees the prompt or the passage, so `No Change` is an
**opaque token** carrying no orthography. The whole leak therefore lives in the
three *named* alternates. One rule covers all four mechanisms:

> **More than one named alternate must be perfectly grammatical and idiomatic in
> isolation.** Every replacement distractor is a string that a reader with the
> sentence covered cannot fault — it is wrong only against this sentence's
> number, tense, antecedent, list or logic.

No key text was changed, no letters were shuffled (unreachable per
AUTHORING-BRIEF §2b — `shuffleDrawnChoices` re-deals every draw), no passage,
prompt, domain, id or grouping was touched.

## Mechanical before/after

    python3 scripts/study-bank/act-english-v4r.check-tells.py \
        scripts/study-bank/act-english-v4.batch.json 50      # and v4r

The checker refuses (exit 1) on a wrong item count, a wrong Conventions count,
a wrong subject-verb count, or a verb form it cannot map — it never falls back
to a default and never returns a number over input it could not read.

                                                    v4        v4r
    items with >=1 strike-on-sight option          7 / 27    0 / 27
    (total such options)                              10         0
    items whose alternates ladder >= 2.0x           4 / 27    1 / 27
    doubled joiner (`; and`) or comma-wrapped conj   3 / 27    0 / 27
    subject-verb items where the key is the ONLY
      number-marked option of its number            5 / 5     0 / 5

The checker was attacked before being believed: re-inserting a single `its'`
into the repaired file makes it report `1/27` (it fires), and a wrong expected
count makes it `REFUSE` and exit non-zero rather than return a number.

## The single biggest win: the subject-verb family

Five items, one mechanism, mechanism 2 in its purest form. In v4 the four options
were number-marked and **exactly one carried the needed number**, so "count the
options that are singular; pick the odd one" solved all five of them — with the
sentence entirely covered. (I first wrote "six" here from memory; the batch holds
five, counted from the file.)

    item      v4 option set (number)                       v4r option set (number)
    P1-Q05    was/is/were*/has been   = 3 sg, 1 pl         was/were*/are/has been   = 2/2
    P2-Q04    was/were*/floats/has been = 3 sg, 1 pl       was/were*/are/has been   = 2/2
    P3-Q02    are/is*/were/have been  = 3 pl, 1 sg         are/is*/was/have been    = 2/2
    P4-Q01    has stood/stands/has been standing/have*     has stood/have*/stand/has been standing = 2/2
    P5-Q01    exist/are existing/exists*/have existed      exist/exists*/has existed/have existed  = 2/2

Number no longer decides. The second axis — tense, and it is a real, nameable
rule — now requires the sentence. Every substituted distractor (`are not used
to`, `are floated`, `was simply`, `stand`, `has existed`) is flawless English in
isolation.

---

## Item-by-item

Every one of the 27 had its option set changed. `*` marks the key (unchanged
throughout).

### en4-p1 "The Deep End" (past-tense narrative)

**ACT-EN4-P1-Q01** — pronoun consistency. **Mechanism 4.**
`until one ran out of breath` (stilted) + `until you ran out of breath`
(colloquial) beside the plain `we`* is a register sandwich; the plain member
wins unread. Replaced `until one …` with **`until he ran out of breath`** — a
plain monosyllabic pronoun, grammatical in isolation, wrong only because "he"
would be Mr. Osei, who is giving the instruction rather than holding his breath.
All three alternates are now the same register and length class. Explanation
rewritten.

**ACT-EN4-P1-Q03** — its vs. it's. **Mechanism 3.**
`having its' face covered` is a non-word, strikeable on sight; with it gone the
item was a two-way that the frequency prior decides. Replaced with **`having his
face covered`** — a real possessive, faultless in isolation, wrong only because
the antecedent is "the body", singular and not a person. The rule is still the
possessive of *it* (`No Change` is `it's`); subskill relabelled "possessive
pronoun agreement with a singular antecedent (its vs. it's)" because the item now
also turns on the antecedent. Explanation rewritten.

**ACT-EN4-P1-Q05** — subject-verb agreement. **Mechanism 2.**
`is not used to` → **`are not used to`**. 3sg/1pl becomes 2sg/2pl; the key is no
longer the unique plural. `are` is wrong on tense (the sentence ends "that gave
way"), not on number.

**ACT-EN4-P1-Q07** — misplaced modifier. **Mechanisms 2 and 4.**
`While I hung there, Mr. Osei, who was breathing hard, wrote something on his
clipboard` was both a length outlier (the longest option by 20 characters) and a
second "who was" paraphrase of the same attachment. Replaced with **`Mr. Osei
wrote something on his clipboard, breathing hard, while I hung there`** — same
words, third legal position, no length tell. **PARTIAL — see "Not fully
repairable" below.**

**ACT-EN4-P1-Q09** — punctuation, three clauses. **Mechanisms 1 and 2.**
In v4 the key was the only option carrying a colon and the only one that
punctuated *both* junctures; the other three all ended `…me, it was only
waiting`, so a solver struck the shared residual comma splice and took the
residue. Replaced `that it was never trying to hurt me, it was only waiting` and
`that; it was never trying to hurt me, it was only waiting` with
**`that: it was never trying to hurt me, it was only waiting`** (colon right,
second juncture still spliced) and **`that; it was never trying to hurt me; it
was only waiting`** (both junctures marked, but the semicolon after "that" closes
off a clause that has to hand forward to its own explanation — the grammatical
argument the original explanation already made). The colon now appears in two
options and a semicolon-after-"that" in two, so **no mark is unique to the key**.

### en4-p2 "Millbrook Ice" (past-tense narrative)

**ACT-EN4-P2-Q01** — pronoun reference, key = `No Change`. **Mechanism 1.**
`moved onto this` and `moved onto one` are odd enough to strike unread, which
left a two-way and then the opaque token. Replaced with **`moved onto those`**
and **`moved onto that`** — both faultless in isolation; wrong here because
"those" is plural with no plural antecedent but "inches", and "that" points
across a distance at something being introduced rather than picking up a noun
named in the same clause.

**ACT-EN4-P2-Q02** — possessive apostrophe. **Mechanisms 3 and 4.**
`the crop of the towns` is the inflated paraphrase in a three-step register
ladder. Replaced with **`the town crop`** — an ordinary attributive compound,
unimpeachable in isolation, wrong because the sentence needs *whose* crop, not
*what kind*. `town's`* / `towns'` still bracket on number, which is the rule
being tested and is decided only by the passage (one town, Millbrook).

**ACT-EN4-P2-Q03** — parallel structure. **Mechanism 4.**
`and also had its own price` was the inflated member (2.6x the shortest
alternate). Replaced with **`and it had a price`** — same register and length as
its neighbours, and wrong for the same structural reason as `No Change` rather
than for being wordy. **PARTIAL — see below.**

**ACT-EN4-P2-Q04** — subject-verb agreement. **Mechanism 2.**
`floats` → **`are floated`**. 3sg/1pl becomes 2sg/2pl.

**ACT-EN4-P2-Q10** — punctuation between independent clauses. **Mechanisms 1, 2.**
`ice, within a decade,` (comma pair around a non-parenthetical) and `ice; and
within a decade,` (doubled joiner) are both eliminable on sight. Replaced with
the **complete four-mark set**: comma / semicolon* / colon / nothing, over the
identical four words. Nothing is strikeable; the colon is wrong because the
second clause reports what happened next rather than explaining the first. This
is AUTHORING-BRIEF §2b's "closed symmetric set where every option is the image of
another" applied to punctuation.

### en4-p3 "Why Leaves Turn" (present-tense exposition)

**ACT-EN4-P3-Q01** — dangling modifier. **Mechanism 4.**
`it stumps most people to say what they are looking at` was the clunky member.
Replaced with **`the answer is one that most people cannot give`** — plain, same
length class, still a subject that did no driving. **PARTIAL — see below.**

**ACT-EN4-P3-Q02** — subject-verb agreement. **Mechanism 2.**
`were simply` → **`was simply`**. 3pl/1sg becomes 2sg/2pl; `was` is wrong on
tense, the paragraph being in the present.

**ACT-EN4-P3-Q08** — possessive apostrophe. **Mechanism 3.**
`the leafs' machinery` is a non-word. Replaced with **`its machinery`** — a
faultless string, wrong only because the nearest plural, "the anthocyanins", is
the sunscreen rather than the thing shielded. `leaves'` still requires the
sentence's singular "it dismantles itself".

**ACT-EN4-P3-Q09** — pronoun-antecedent agreement. **Mechanisms 2 and 3.**
Worst case in the file: `lay it's eggs` and `lay there eggs` are both strikeable
on sight, and what remained (`its` / `their`) was a bare number bracket with the
plural obviously right. Replaced with **`lay her eggs`** (singular, real, wrong —
no one female insect has been introduced) and **`lay our eggs`** (plural, real,
absurd only in context — nobody is speaking). Number is now 2sg/2pl and cannot
decide; no option is misspelled. Deliberately did **not** use `lay eggs`, which
is idiomatic English and would have been a second defensible answer.

**ACT-EN4-P3-Q10** — punctuation between independent clauses. **Mechanisms 1, 2.**
`forest; but it is` is a doubled joiner, strikeable unread. Replaced with
**`forest, which is`** — impeccable grammar, and wrong for a reason only the
sentence supplies: the relative clause would attach to "a sick forest", making
the forest the mild wet October. The colon was *considered and rejected* here: "A
dull year is not a sick forest: it is usually…" is a defensible use of a colon
after a negative, and would have created a second correct answer.

### en4-p4 "A Wall Without Mortar" (present tense)

**ACT-EN4-P4-Q01** — subject-verb agreement. **Mechanism 2.**
`stands` → **`stand`**. 3sg/1pl becomes 2sg/2pl; `stand` is right on number and
wrong on aspect ("for two centuries" up to now needs the perfect).
*Residual:* `has been standing` is 3.4x the length of `stand`, the one remaining
ladder hit. It is a verb-form ladder rather than a register sandwich and the key
sits at the middle length rank, so it is left.

**ACT-EN4-P4-Q03** — punctuating an appositive. **Mechanism 2 (the "a general
rule picks one" form).**
The v4 set was the complete comma-placement quartet {none, both, left, right},
and "an appositive takes commas on both sides" names the symmetric member without
reading anything. Replaced the right-comma-only option with **`a long stone, and
the through, is laid`** — *also* symmetric, so the both-commas heuristic now
returns two candidates and the solver has to know that the through **is** the
long stone rather than a second stone. **PARTIAL — see below.**

**ACT-EN4-P4-Q05** — parallel structure. **Mechanism 4.**
`and then setting it down` was the inflated member of a ladder. Replaced with
**`and set it`** — a second finite verb, so the key is no longer the unique
finite-verb option; `set` is wrong because it does not agree with "she" in a
present-tense series.

**ACT-EN4-P4-Q07** — punctuation between independent clauses. **Mechanisms 1, 2.**
`job, and, the old stone` wraps a conjunction in commas and is eliminable on
sight. Replaced with **`job, the old stones`** — a perfectly ordinary noun phrase
in isolation; wrong because the verb that follows is the singular "is", so the
plural repairs nothing and breaks agreement as well. Colon and comma-plus-`for`
were *considered and rejected*: the second clause genuinely explains the first,
so both would have been defensible answers.

**ACT-EN4-P4-Q08** — whoever / whomever. **Mechanisms 1 and 3.**
`by whom built` and `by them who built` are both ungrammatical on sight, leaving
a two-way that the rule "the subject of the verb takes *whoever*" settles unread.
Replaced with **`by whomever had built`** (still the object form, but nothing to
strike) and **`by whichever built`** — which is a *subject*-form free relative, so
the option set no longer contains exactly one subject form. `whichever` is wrong
because it selects among things and the wall was built by a person. **PARTIAL —
see below.**

**ACT-EN4-P4-Q09** — possessive pronoun. **Mechanism 3.**
`are her's` (`No Change`), `are hers'` and `are her` gave two apostrophe
non-words and one object form — three free strikes and the item was over.
Replaced the two named ones with **`are theirs`** and **`are his`**: legal
possessive pronouns, no apostrophes, wrong only because the sections belong to
Delgado. The apostrophe rule is still tested, through `No Change`.

### en4-p5 "The Night Market" (present tense)

**ACT-EN4-P5-Q01** — subject-verb agreement. **Mechanism 2.**
`are existing in some form` (a marked progressive, half a strike on its own) →
**`has existed in some form`**. 3pl/1sg becomes 2sg/2pl; the perfect is wrong
against a list of places and against the paragraph's simple present.

**ACT-EN4-P5-Q02** — punctuation between independent clauses. **Mechanism 2.**
`tourism, it answering` is non-finite and eliminable on sight, and the key was
then the only option containing a coordinating conjunction — "pick the one that
adds a conjunction" solved it. Replaced with **`tourism, but it answers`**, so
two options carry a conjunction and the choice turns on which relation the
sentence actually asserts (the second clause supports the first; it does not
contrast with it). A bare semicolon was *considered and rejected*: it would have
been grammatically correct and therefore a second key.

**ACT-EN4-P5-Q04** — dangling modifier. **Mechanism 2.**
In v4 the key was the only option whose subject was the market. Replaced `it is
sensible adaptation rather than novelty that such a market shows` with **`the
point of such a market is not novelty but sensible adaptation`** — it carries the
same `not X but Y` frame as the key (so the frame stops naming the key) and opens
with "the point of such a market" (so scanning for the word *market* stops
isolating the key), while the subject, "the point", still did not open at six.
**PARTIAL — see below.**

**ACT-EN4-P5-Q06** — key = `No Change`. **Mechanism 1, the exemplar.**
`the smoke from the grill's` and `the smoke from the grills'` are possessives with
no following noun — visibly incomplete as strings — and `the grilles` is a
different word. Three strikes, residue = the opaque token, and the solver has
read nothing. Replaced all three with **`the smoke from the grill`**, **`the
smoke from their grills`**, **`the smoke from a grill`**: all flawless in
isolation, each wrong against this sentence (a specific grill never introduced;
"their" with no plural owner in the sentence; an indefinite phrase breaking a
list built from definite ones). **This is the one item where the tested rule
changed** — the apostrophe could not be kept without keeping the free strike, so
subskill moves from "plural vs. possessive" to **"number and reference in a
parallel list"**, which is a real and nameable rule of edited American English
and is still decided by exactly one option. Flagged explicitly because it is a
coverage loss for the batch: the plural-vs-possessive rule is now tested only at
P2-Q02, P3-Q08 and P4-Q09.

**ACT-EN4-P5-Q07** — parallel structure. **Mechanisms 2 and 4.**
`and also a person` was the inflated member, and the key was the only option
containing `where`. Replaced `and also a person` with **`where a person`** — the
same `where` the key has, missing the `and` that a three-item list needs before
its last member. Three of the four options now contain `where`, so the
discriminator is the connective and the solver has to have read the series.

**ACT-EN4-P5-Q09** — pronoun-antecedent agreement. **Mechanism 3.**
`closes it's doors` and `closes there doors` are both strikeable on sight.
Replaced with **`closes his doors`** and **`closes those doors`** — both legal,
wrong only because the closer is "a city", singular and genderless, and the doors
have not been introduced. `closes the doors` was *considered and rejected*: it is
idiomatic and would have been a second defensible answer.

---

## Not fully repairable, and why (stated rather than forced)

Five items keep a residual options-only signal that cannot be removed on the
distractor side without either creating a second correct answer or destroying the
rule the item tests. Each was attempted and the attempt is recorded.

1. **P1-Q07 and P3-Q01 and P5-Q04 — modifier attachment is inherently 1-vs-3.**
   A misplaced/dangling-modifier item has exactly one legal landing place for the
   phrase, so the option whose subject *can* perform the modifier is unique. Any
   fourth option that attaches the phrase correctly is itself correct: `Breathing
   hard, I hung there while Mr. Osei wrote` and `most people are stumped by the
   question of what they are looking at` are both good English, which is why
   neither was used. What was removed is the *length ladder* and the shared
   paraphrase family; the count asymmetry stands. It is a property of the item
   type, and the shipped bank has it too.

2. **P4-Q03 — "an appositive takes commas on both sides" is the answer.**
   Adding the `and` variant means the heuristic now returns two options instead of
   one, which is the best available. Dash, parenthesis and `or`-appositive
   versions were all rejected as second correct answers.

3. **P4-Q08 — the case axis has only two values and the key must be `whoever`.**
   Every option with `whoever` plus a legal verb form is also correct
   (`by whoever had built` is fine), so all three distractors have to sit on the
   other side of the case line — except `whichever`, which was introduced
   precisely to break the subject-form singleton. The residual signal is real.

4. **P2-Q03 and P4-Q05 and P5-Q07 — a parallelism item's key is in the same
   grammatical category as the list**, so the category-singleton reading survives.
   `and prices` was tried at P2-Q03 as a second noun phrase and rejected: "a
   season, a market, and prices" is acceptable English. Register ladders were
   removed; the category tell stands.

5. **CROSS-ITEM, and the one I could not reach at all: the punctuation family is
   7 items and the bare semicolon is the key in 4 of them** (P2-Q10, P3-Q10,
   P4-Q07; P1-Q09 is colon-plus-semicolon and P5-Q02 is comma-plus-`and`). "Always
   take the bare semicolon" scores 3–4 of 7 against a 25% control. This is a
   value-set property and therefore **reachable** by AUTHORING-BRIEF §2b — it is
   not a letter tell — but the keys are fixed by the passages, and the brief
   forbids rewriting them. Fixing it requires re-pointing some of these items at a
   different underlined span, which changes the key, or editing the passages,
   which would touch the 23 items held out. **Recorded for a decision, not taken.**

6. **CROSS-ITEM: `No Change` is the key on 2 of 27 Conventions items (7.4%).**
   Real ACT forms run nearer 25%. A solver who has seen a few items of this batch
   learns that `No Change` is almost never right and gets a free elimination on
   every remaining one. Same constraint as above: raising the rate means making
   underlined spans already correct, i.e. changing keys and passages. **Recorded,
   not taken.** It is the single largest remaining cross-item tell in the
   stratum and it is a commissioning decision rather than a repair.

## Verification

- `act-english-v4r.repair.py` asserts input identity (50 items, 27 Conventions), that every key
  is character-identical to one of exactly four choices, that no passage, prompt,
  id, domain or grouping changed, and that all 23 held-out items compare equal to
  the original object. Break-tested: tampering a Production item, and desyncing a
  key from its choices, each abort the build with the specific assertion.
- `act-english-v4r.check-tells.py` refuses (exit 1) if the file does not hold the expected item
  count, and was rigged with a re-inserted `its'` to confirm it fires rather than
  printing a clean number over data it never read.
- **What these checks do not do:** they are structural pre-flight only. Per
  CLAUDE.md, the attack is the gate — `v4r` has not been attacked. The number that
  decides this batch is a fresh options-only run on the 27 repaired items,
  scored against the same derived control and compared to the live 68.0%, not to
  zero. Nothing here licenses an insert.

## Reported, not edited: three things wrong in the 23 held-out items

None of these was touched. All three are **value-set** properties and therefore
reachable by AUTHORING-BRIEF §2b — none is an authored-order tell.

1. **All four add/delete-a-sentence items key to "No".** `ACT-EN4-P2-Q08` and
   `ACT-EN4-P4-Q06` ask *should the writer add this?* and `ACT-EN4-P3-Q06` and
   `ACT-EN4-P5-Q05` ask *should the writer delete this?* — and in both directions
   the answer is "leave the essay as it is", 4 of 4. One rule solves four of the
   fifteen Production of Writing items with the passage covered. This is the
   cross-item tell CLAUDE.md's "a batch built to one brief develops a cross-item
   tell" describes, in its semantic form, and no existing checker looks for it.

2. **The four sentence-placement items are a complete ABCD permutation.**
   `P1-Q04` → [D], `P2-Q05` → [C], `P3-Q05` → [B], `P4-Q02` → [A]: each point is
   the key exactly once across the batch. This is the second tell in that same
   CLAUDE.md list ("every 4-question set a complete ABCD permutation"), and it is
   **not** dissolved by `shuffleDrawnChoices`, because the shuffle permutes the
   display order of the four `Point [X].` strings without changing which string is
   the key. A solver who is confident on three of the four gets the fourth free.

3. **All eight Knowledge of Language items are solvable by a single stated rule
   with the passage covered**, which is why the stratum came in at 8/8. The
   redundancy and concision items (`P1-Q06`, `P3-Q03`, `P2-Q07`) are pure length
   ladders — the shortest option is always the key, and `P2-Q07` even carries the
   absurd `was used, for cooling purposes, to cool`. The tone items (`P1-Q02`,
   `P4-Q04`) are register sandwiches: two slang options plus one inflated one
   around the plain key. The precise-word-choice items (`P2-Q06`, `P3-Q04`,
   `P5-Q03`) are "pick the most specific word". **This is mechanism 4 firing on 8
   of 8 — but it is not a v4 defect**: the shipped bank measures 92.9% on the same
   stratum (p = 1.0), and three of the four control solvers said unprompted that
   these item types are *solvable by construction, because the stem's axis is word
   count or tone*. Repairing them would make them stop testing what ACT tests.
   Recorded so that a future reader does not mistake 8/8 for noise, or for a
   reason to rewrite them.
