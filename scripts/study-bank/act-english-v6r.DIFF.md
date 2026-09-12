# `act-english-v6r` — repair of the 27 Conventions of Standard English items

Source: `act-english-v6.batch.json` (50 items, never gated, no ledger entry,
**never overwritten**).
Output: `act-english-v6r.batch.json` (50 items, same 5 passage groups of 10,
same 27/15/8 domain split).

This is the third run of a repair whose first run was measured. It follows
`act-english-v4r.DIFF.md` as its template and changes nothing about the method.

## What is being repaired against, and what the target is

From the v4r record (REGISTER §5, 2026-09-12), a matched live control — 60
shipped ACT English items, four passage-disjoint files, four independent
options-only solvers, control derived at 26.7%:

    Conventions of Standard English   LIVE 17/25 = 68.0%   v4 27/27 = 100.0%   p = 0.0014
    Knowledge of Language             LIVE 13/14 = 92.9%   v4  8/8  = 100.0%   p = 1.0
    Production of Writing             LIVE 14/21 = 66.7%   v4 10/15 =  66.7%   p = 1.0

After the same repair, `act-english-v4r` scored 18/27 = 66.7%: Fisher p = 1.0000
against live (indistinguishable) and p = 0.0018 against its own pre-repair self.

**The target is 68%, not 0%.** An editing-in-place grammar item's option string
carries its own grammaticality; that is inherent and is what the ACT tests. What
is not inherent is a free elimination.

**Only the 27 Conventions items were touched.** The 15 Production of Writing and
8 Knowledge of Language items are byte-identical to the original — asserted in
`act-english-v6r.repair.py` and break-tested in both domains (tampering one
Production item aborts with `AssertionError: ACT-EN6-P1-Q08 was modified and
must not be`; tampering one Knowledge item aborts with the same assertion on
`ACT-EN6-P1-Q06`).

## The governing rule

An options-only solver never sees the prompt or the passage, so `No Change` is an
**opaque token** carrying no orthography. The whole leak lives in the three
*named* alternates.

> **More than one named alternate must be flawless English in isolation** —
> faultless as a bare string, wrong only against this sentence's number, tense,
> antecedent, list or logic.

No key text was changed. No letters were shuffled (unreachable per
AUTHORING-BRIEF §2b — `shuffleDrawnChoices` re-deals every draw). No passage,
prompt, id, domain, difficulty or grouping was touched.

The second axis introduced on most items is **tense or aspect**. That is a
deliberate, and slightly uncomfortable, choice: it is the axis that is most
nearly invisible in a bare option string while still naming exactly one answer.
It is also now the repair applied to **13 of the 25** items (P1-Q01, P1-Q03,
P1-Q04, P1-Q05, P2-Q02, P2-Q03, P2-Q04, P3-Q02, P4-Q01, P4-Q03, P5-Q02, P5-Q04,
P5-Q06 — counted from the file, not from memory), which per AUTHORING-BRIEF
§3 ("if you adopt a fix consistently across several items, that consistency is
itself readable") is the largest residual risk in this file. See
"Not fully repairable", item 6.

## Mechanical before/after

    python3 scripts/study-bank/act-english-v6r.check-tells.py \
        scripts/study-bank/act-english-v6.batch.json \
        --items 50 --conventions 27 --sv 1 \
        --nc '{"ACT-EN6-P2-Q03":"tides, stays cold"}'        # and v6r

                                                        v6        v6r
    items with >=1 strike-on-sight option (v4r list)   4 / 27    0 / 27
    (total such options)                                  4         0
    items with >=1 strike-on-sight option (extended)  10 / 27    0 / 27
    (total such options)                                 14         0
    items whose alternates ladder >= 2.0x              0 / 27    0 / 27
    doubled joiner / comma-wrapped conj (v4r metric)   3 / 27    1 / 27
      of which not a legal serial-semicolon list       2 / 27    0 / 27
    subject-verb items where the key is the ONLY
      number-marked option of its number               0 / 1     0 / 1

Length ladders and the subject-verb number singleton — the two defects that
dominated v4 — were **already absent from v6**. This file's leak is elsewhere:
elimination-to-the-residue and the alternates bracketing the error.

### About the checker's guard

`act-english-v4r.check-tells.py` hardcodes v4's shape and refuses on this file
("expected 5 subject-verb items"). **That refusal is correct behaviour.** The
expectation was generalised, not removed: `act-english-v6r.check-tells.py` takes
`--items`, `--conventions`, `--sv` and an explicit `--nc` map on the command
line, and exits non-zero if any of them disagrees with the file, if any
subject-verb item is missing from the `--nc` map, or if it meets a verb form it
cannot map. It never falls back to a default input and never returns a number
over input it could not read.

The BASE blacklist is v4r's verbatim, so the two files' numbers are the same
measure. `--extended` adds this file's own strike strings (`they're salt
content`, `being it was`, `whoever they`, `whom showed`, `whom had`, `minded to
be`, `is empty since`, an unclosed parenthesis) and is reported separately
rather than folded in.

One **false positive is left standing rather than tuned away**: v4r's
doubled-joiner regex `;\s*(and|but)` fires on `ACT-EN6-P4-Q06`'s serial-semicolon
option, `hearings; a petition …; and an argument`. A semicolon series legitimately
takes `; and` before its last item and is not strikeable on sight. The v4r metric
is printed unchanged for comparability with a second line, clearly labelled, that
excludes semicolon series; both are shown above. The v6 "before" number contains
the same false positive, so 3→1 and 2→0 are both honest.

### The checker was attacked before being believed

Every one of these was run and produced the stated result:

| break-test | result |
|---|---|
| re-insert a single `its'` into the **repaired** file | fires, `1/27` (does not print 0) |
| re-insert `; and` into the repaired file | fires on `dbl_strict`, `1/27` |
| `--items 49` | `REFUSE`, exit 1 |
| `--conventions 26` | `REFUSE`, exit 1 |
| `--sv 5` (v4's number) | `REFUSE`, exit 1 |
| `--nc '{}'` | `REFUSE: no No-Change text supplied for ['ACT-EN6-P2-Q03']`, exit 1 |
| unmappable verb form `tides, keep cold` | `REFUSE: unmapped verb form`, exit 1 |
| run the generalised checker on `act-english-v4.batch.json` | reproduces the v4r DIFF's published numbers exactly: ladder 4/27, doubled joiner 3/27, number singleton 5/5 — the measure did not drift |

And on the build script:

| break-test | result |
|---|---|
| tamper a Production of Writing item | `AssertionError: ACT-EN6-P1-Q08 was modified and must not be` |
| tamper a Knowledge of Language item | `AssertionError: ACT-EN6-P1-Q06 was modified and must not be` |
| desync a key from its choices | `AssertionError: ACT-EN6-P1-Q01: key not among choices` |
| duplicate an option | `AssertionError: ACT-EN6-P1-Q01: duplicate options` |
| append a space to a prompt | `AssertionError: ACT-EN6-P1-Q01 prompt changed` |
| drop one Conventions item from the repair map | `AssertionError: ({'ACT-EN6-P4-Q05'}, set())` |

---

## Item-by-item

**25 of the 27 had their option set changed.** `*` marks the key, unchanged
throughout. Two were left alone on purpose and are listed at the end.

### en6-p1 "The Night Shift"

**ACT-EN6-P1-Q01** — then vs. than. **Mechanism 1.**
The set was `than let` / `then let`* / `than letting` / `then, let`: the two
`than` members are faultable on sight and `then, let them proof` carries a comma
between compound verbs that no reader would write, so the key was the only clean
string. Replaced with **`then lets them proof`** and **`then had let them
proof`** — both flawless in isolation, wrong here on person/tense and on
sequence (a past perfect after the word `then` reverses the order `then`
announces). The `than` error is still tested, through `No Change`. Subskill
relabelled *"then vs. than, with verb form in a compound predicate"*.

**ACT-EN6-P1-Q02** — its vs. it's. **Mechanisms 3 and 4.**
`behind its' shutter` is a non-word and `behind the shutter that is its own` is
the inflated member of a register sandwich: two free strikes and the item is
over. Replaced with **`behind their shutter`** (real possessive, wrong number)
and **`behind that shutter`** (real demonstrative, pointing at a shutter the
essay has not introduced, and saying nothing about *whose*). Subskill relabelled
*"possessive pronoun agreement and reference (its vs. it's)"*.

**ACT-EN6-P1-Q03** — dangling modifier. **Mechanism 5, in its structural form.**
The key was the only option whose subject was the narrator, so "pick the option
whose subject can walk" solved it unread. Replaced `Having walked home …, the
loaf … was under my arm` with **`I walk home past the first cars of the morning,
carrying a loaf I had shaped myself.`** — flawless English in isolation, and
wrong only because the essay is a past-tense account of one shift. The
subject-can-walk heuristic now returns two options and the tense decides.
Subskill relabelled *"dangling modifier and narrative tense"*. This is the one
modifier item in the file where the 1-vs-3 asymmetry was reachable.

**ACT-EN6-P1-Q04** — parallelism, key = `No Change`. **Mechanism 2, exemplar.**
`minded to be awake` is not idiomatic, `and if I minded …, or not` is doubly
redundant, and the fourteen-word noun-clause rewrite is the inflated member —
three independent strikes and the opaque token wins unread. Replaced all three
with **`asked if I could lift fifty pounds and whether I minded`** (both
conjunctions legal on their own; wrong because parallel indirect questions in one
compound take the same one), **`whether I mind being awake`** (present against the
reporting verb `asked`), and **`whether I had minded being awake`** (a past
perfect, asking about an attitude finished before the interview). All three are
faultless as bare strings. Subskill relabelled *"parallelism and tense in
compound indirect questions"*.

**ACT-EN6-P1-Q05** — comma splice. **Mechanism 1.**
The key was the only option carrying a semicolon; the other three all kept the
comma, so "take the semicolon" solved it. Replaced with **`rise: a warm one
meant`** (colon legal in isolation; wrong because the second clause gives the
matching case rather than explaining the first) and **`rise; a warm one means`**
(a semicolon, correct punctuation, wrong tense). Two of three named alternates
now carry a semicolon, so no mark is unique to the key.

### en6-p2 "Reading a Tide Pool"

**ACT-EN6-P2-Q01** — their vs. there. **Mechanism 3.**
`it's salt content` and `they're salt content` are both strikeable on sight;
`their` was then the only possessive left. Replaced with **`so its salt content
can rise`** (a real possessive, singular against a plural band) and **`so our
salt content can rise`** (a real possessive, absurd only in context — nobody is
speaking). Both are flawless in isolation; number is now 1 sg / 2 pl among the
named alternates. The v4r `lay her eggs` / `lay our eggs` move, reused.

**ACT-EN6-P2-Q02** — comma splice. **Mechanisms 1 and 3.**
`and it marking` is a non-finite splice, eliminable unread, and the key was then
the only semicolon. Replaced with **`by chance; it marked`** — correct
punctuation, wrong tense against a paragraph of standing present-tense facts
("Mussels get on every surface," "Sea stars eat mussels"). `by chance, this
marks` stays; it is a clean string that is wrong for the same reason as
`No Change`.
*A colon was considered and rejected*: here the second clause genuinely does
explain the first, so `by chance: it marks` would have been a second defensible
answer.

**ACT-EN6-P2-Q03** — subject-verb agreement across an interrupter.
**Mechanism 1, the "a general rule picks one" form.**
The only difference between `tides stay cold` and the key `tides, stay cold` was
the closing comma, so "an interrupter takes commas at both ends" named the key
without reading anything. Replaced `tides, is cold` with **`tides, stayed
cold`** — also correctly punctuated, so the comma heuristic now returns two
candidates and the tense decides. Number among the named alternates is 2 pl,
1 neutral; the key was already not the number singleton and still is not.

**ACT-EN6-P2-Q04** — semicolon between clauses, key = `No Change`.
**Mechanism 2.**
`a sea star pried loose, usually cannot reattach` cuts subject from verb and is
faultable in isolation, which with the bare splice left the opaque token. Replaced
with **`find it; a sea star pried loose usually could not reattach.`** — correct
punctuation, wrong tense inside a paragraph of present-tense advice. All three
named alternates are now flawless as bare strings; this is the cleanest
elimination-to-the-residue repair in the file.

**ACT-EN6-P2-Q05** — punctuating an appositive. **Mechanisms 1 and 3.**
`sea star (a common resident` has an unclosed parenthesis — strikeable on sight
— and with the semicolon version faultable by rule, "take the comma" named the
key. Replaced the parenthesis with **`sea star, and a common resident`**, which
*also* carries the comma, so the comma heuristic now returns two and the solver
has to know the renaming phrase is the same animal rather than a second one. This
is the v4r P4-Q03 move.
*A dash and a colon were considered and rejected*: `Consider the ochre sea
star — a common resident of the low pools.` and the colon version are both
correct English after a complete imperative clause, and each would have been a
second key.

### en6-p3 "A Beat Behind, Then Even"

**ACT-EN6-P3-Q01** — illogical comparison. **Mechanism 5, kind-singleton form.**
Three noun phrases about a lecture plus one gerund; the key was the unique gerund
(AUTHORING-BRIEF §1: "the key must not be the kind-singleton"), and `is not like a
lecture is.` was faultable on its trailing `is`. Replaced that one with **`is not
like interpreting lectures.`** — a second gerund, flawless in isolation, wrong
because the compared terms have to match in number and definiteness: one concert
against one lecture, not against a general practice. The kind split is now 2–2.

**ACT-EN6-P3-Q02** — parallel structure in a series. **Mechanism 5.**
No strikeable option here; the tell was that the key was the unique bare gerund.
Replaced `a decision about whether …` with **`having decided whether …`** — a
second gerund form, flawless in isolation, wrong because a perfect participle
names something finished before the preparation rather than part of it.

**ACT-EN6-P3-Q03** — possessive apostrophe. **Mechanism 4.**
`the vibration of the floors` was the inflated member and also plural, so it
struck twice. Replaced with **`its vibration`** — a faultless string, wrong only
because it has no antecedent here: the nearest singulars are the interpreter and
the band, neither of which the shoes rest on. `floors'` still brackets number
against the key, which is the rule being tested and is decided only by the
passage.

**ACT-EN6-P3-Q05** — subordination, key = `No Change`. **Mechanism 2.**
A comma splice, a redundant `however`, and a dangling `Not being a performer`
were three independent strikes; the opaque token won unread. Replaced all three
with **`because`**, **`, and`** and **`, so`** versions of the same sentence —
every one of them flawless English in isolation, each wrong on the logical
relation (two claim a cause in opposite directions; one merely adds). Subskill
relabelled *"subordination and the logical relation between clauses"*.

### en6-p4 "Eight of Eleven"

**ACT-EN6-P4-Q01** — comma splice. **Mechanisms 1 and 3.**
`amended licenses; and they put` is a doubled joiner, strikeable unread, and the
key was then the only semicolon. Replaced with **`; they had put the total`** (a
past perfect reversing the order the sentence sets out) and **`amended licenses,
the total came to thousands of dollars`** (a clean string still joined by a
comma). Two of three named alternates carry a semicolon.
*Comma-plus-`and` was considered and rejected*: it is grammatically acceptable
between two independent clauses and would have been a second defensible answer.

**ACT-EN6-P4-Q02** — relative pronoun. **Mechanism 1, in its purest form.**
Three of four options contained `whom`; "pick the one that is not `whom`" named
the key instantly, and `whom opposed` / `whom had opposed` are case errors visible
on sight. Replaced with **`, who had opposed the change,`** (a legal relative
pronoun, wrong because the antecedent is an organization) and **`The historical
society which had opposed the change agreed`** (a flawless restrictive reading,
wrong because Fairhaven has one historical society and the clause is
nonessential). Subskill relabelled *"relative pronoun choice and
nonessential-clause commas"*.

**ACT-EN6-P4-Q03** — sentence fragment. **Mechanism 5.**
The key was the only option with a finite verb, so "pick the complete sentence"
solved it without reading. Replaced the two re-punctuated fragments with **`are
renamed`** and **`had been renamed`** — both complete sentences, both flawless in
isolation, wrong on tense against a 2019 vote the paragraph is reporting. The
fragment is still tested, through `No Change`; the item now also turns on tense.
Subskill relabelled *"sentence fragment and verb tense"*.

**ACT-EN6-P4-Q04** — subjunctive after "ask that", key = `No Change`.
**Mechanism 2, in a chain.**
`is spent` and `was spent` bracketed tense; the only remaining option with the
subjunctive `be spent` was the one missing its commas. A solver could therefore
infer that `be spent` is the wanted form and that the comma question is separate,
and take the opaque token. Replaced `was spent` with **`the honors, which are
limited things, be spent on someone else`** — a second correctly punctuated
subjunctive, flawless in isolation, wrong because what supporters asked to be
spent elsewhere is the single honor carried by one street name.

**ACT-EN6-P4-Q05** — its vs. it's. **Mechanism 3.**
`owes its' own history` is a non-word. Replaced with **`owes his own history`** —
a real possessive, wrong only because a city is not a man. `their` was already
clean and stays.
*`owes to its own history` was considered and rejected*: `owe X to Y` is correct
English and would have been a second key.

**ACT-EN6-P4-Q06** — series punctuation, key = `No Change`. **Mechanism 2.**
`an argument, that has never quite ended` puts a comma before a restrictive
`that` and is strikeable on sight; with it gone the residue argument weakens but
the item was still two-against-one. Replaced with **`a petition with four
thousand signatures and an argument that has never quite ended`** — legal
punctuation under a no-serial-comma house style, and wrong here because without
the serial comma the last two items read as one, a petition that came with both
signatures and an argument. All three named alternates are now flawless in
isolation.

### en6-p5 "Signal from the Old Creamery"

**ACT-EN6-P5-Q01** — comma splice. **Mechanisms 1 and 3.**
`model, being it was an argument` is not standard English at all, and the key was
the only semicolon. Replaced with **`model; it was, however, an argument`** (a
second correctly punctuated semicolon, wrong because `however` announces a
contrast the sentence does not make — the second half says what community radio
was *instead*, which `not` has already set up) and **`model, it was rather an
argument`** (a clean string still spliced).

**ACT-EN6-P5-Q02** — nonessential clause and possessive, key = `No Change`.
**Mechanism 2, exemplar.**
`it's owner` is strikeable on sight and `whom wanted` is a case error on sight;
the residue was the opaque token. Replaced with **`their owner, who wanted the
taxes off his books, sold`** (correct punctuation, wrong number — the building is
singular) and **`its owner, who wanted the taxes off his books, sells`**
(correct punctuation and possessive, wrong tense against the spring of 1974). The
no-commas restrictive version stays; it is a clean string. Two of the three named
alternates now carry the comma pair, so the comma heuristic no longer isolates
`No Change`.

**ACT-EN6-P5-Q04** — who vs. whom, key = `No Change`. **Mechanism 2, exemplar.**
`whoever they showed up` has two subjects and `whom showed up` is a case error —
two strikes, leaving `whomever` against the opaque token, and "the subject of the
verb takes the subject form" settled it unread. Replaced with **`whoever shows
up`** (present against a paragraph reporting KMRW's first season) and **`whoever
had shown up`** (a past perfect placing the arriving before the afternoons being
given away). Two options now carry the subject form `whoever`, so the case rule
returns two and the tense decides.
*`to anyone who showed up` was considered and rejected*: it is flawless and means
the same thing, so it would have been a second key.

**ACT-EN6-P5-Q05** — comma before a coordinating conjunction. **Mechanisms 1, 3.**
`for seventeen years; and the insurance` is a doubled joiner, strikeable unread,
and the key was then the only option with a conjunction. Replaced with **`,
but`** (a second comma-plus-conjunction, wrong because both halves report the
same disaster deepening rather than contrasting) and **`; the insurance covered
less than half the cost`** (impeccable punctuation on its own, wrong because both
halves sit inside the `when` clause that began "when a lightning strike," and a
semicolon would cut the second half loose from it). This is the v4r P5-Q02 move.

**ACT-EN6-P5-Q06** — verb tense. **Mechanism 3.**
`is empty since 1968` is ungrammatical on sight (a simple present cannot take
`since`). Replaced with **`was emptied in 1968`** — flawless in isolation, wrong
because it reports one act of clearing the place out rather than the state that
ran up to 1974 and made the building available.

### Left unchanged on purpose

**ACT-EN6-P3-Q04** — consistent verb tense: `is` / `had been` / `will be` /
`was`*. A closed symmetric tense set over identical surrounding words. Nothing is
strikeable, no option is a length or kind outlier, and an options-only solver
faces a flat four-way. It is already the shape this whole repair is trying to
produce.

**ACT-EN6-P5-Q03** — parallel structure in a series. All three named alternates
were already flawless in isolation (`the sale of the churn` / `selling the
churn` / `the churn, which they sold`), the ladder is 1.29x, and the key is not
the unique noun phrase. Nothing to remove without inventing a second key.

Leaving two alone is also deliberate under AUTHORING-BRIEF §3: a repair applied to
every single item is itself a uniform rule, and uniform rules are readable.

---

## Not fully repairable, and why (stated rather than forced)

1. **P3-Q01 — comparison items are inherently 1-vs-3.** Exactly one option makes
   both sides of `like` the same kind of thing. Any second option that parallels
   correctly is correct. The kind-singleton was dissolved (2 gerunds, 2 noun
   phrases) and the trailing-`is` tell removed, but a solver who knows the
   stem's first word is a gerund still has a 2-way rather than a 4-way. The
   discriminator left — singular against plural comparison terms — is real but
   thin. **This is the weakest repair in the file.**

2. **P4-Q03 — fragment items are inherently 1-vs-3 on the finite verb.** Solved
   by making all three alternates finite and moving the decision to tense, at the
   cost that the fragment rule is now tested only through `No Change`. If the
   attack shows tense is not carrying its share, this item reverts to a 1-vs-3.

3. **P2-Q03 — the interrupter comma rule still returns 2 of 3.** `tides stay
   cold` is the only alternate missing the closing comma, so half the field is
   still decidable by a general rule. Removing the no-comma option would delete
   the rule the item tests.

4. **CROSS-ITEM: the bare semicolon.** 8 of the 27 items offer a named
   semicolon option and the semicolon is the key on 4 of those 8 — unchanged by
   this repair, because the keys are fixed by the passages. What *did* change:
   **4 of those 8 items now offer more than one semicolon option (was 1)**, so
   "take the semicolon" no longer resolves an item even when it fires. Counting
   `No Change` on P2-Q04 (whose underlined text is a semicolon), the punctuation
   family keys to a semicolon 5 times. Fixing the rate itself requires
   re-pointing items at different underlined spans, which changes keys, or
   editing passages, which would touch the 23 held-out items. **Recorded for a
   decision, not taken** — same constraint as v4r §5.

5. **CROSS-ITEM, and this one is good news:** `No Change` is the key on **7 of 27
   = 25.9%**, which is where real ACT forms sit. v4's 7.4% was the single largest
   remaining cross-item tell in that stratum; v6 did not have it and the repair
   did not disturb it (7/27 before and after).

6. **CROSS-ITEM, and the one this repair created: tense or aspect is the second
   axis on 13 of the 25 repaired items.** It is the right axis — invisible in a bare option
   string, nameable, decidable only from the passage — and it is also now a
   pattern. A solver who has seen a few items of this batch and learns "when two
   options are both good English, the wrong one is the one in the wrong tense"
   gets no free elimination (tense is still unreadable without the passage), but
   it does narrow what to look for. AUTHORING-BRIEF §2c is the warning that
   applies: the cure for one leak must not itself be a uniform rule. The
   alternatives available on the distractor side — number, antecedent, logical
   relation — were used wherever they worked (P2-Q01, P4-Q05, P5-Q02, P3-Q05,
   P5-Q05, P2-Q05, P1-Q02, P3-Q03), and tense was used where they did not.
   **This is the specific thing the blind attack should be asked to look for.**

## Verification

- `act-english-v6r.repair.py` asserts input identity (50 items, 27 Conventions),
  that every key is character-identical to one of exactly four distinct choices,
  that `No Change` is first in every set, that no passage, prompt, id, domain,
  difficulty, passage_title or grouping changed, and that all 23 held-out items
  **and** the 2 Conventions items left unchanged compare equal as objects to the
  original. Six break-tests, tabulated above, each abort the build with its own
  specific assertion.
- `act-english-v6r.check-tells.py` refuses on eight distinct forms of input it
  cannot name, was rigged twice to confirm it fires rather than printing a clean
  number, and reproduces the v4r DIFF's published v4 numbers exactly.
- **What these checks do not do.** They are structural pre-flight only. Per
  CLAUDE.md, *the attack is the gate* — five structural proxies have now been
  built and not one caught the next tell. `v6r` **has not been attacked**. The
  number that decides this batch is a fresh sibling-free options-only run on the
  27 repaired items, scored against the same derived control and compared to the
  live 68.0%, **not to zero**. Nothing here licenses an insert, and v6 has no
  ledger entry.

## Reported, not edited: what is wrong in the 23 held-out items

None of these was touched. All are **value-set** properties and therefore
reachable by AUTHORING-BRIEF §2b — none is an authored-order tell.

1. **All four "relevance of a detail" items key to "Kept."** `P1-Q09`, `P3-Q09`,
   `P4-Q09`, `P5-Q09` each ask whether a sentence should be kept or deleted, and
   the answer is "kept" 4 of 4. One rule solves four Production of Writing items
   with the passage covered. This is v4's finding wearing a different costume:
   there it was four add/delete items all keying to "No".

2. **All four "purpose of the essay" items key to "Yes."** `P1-Q10`, `P2-Q10`,
   `P3-Q10`, `P5-Q10`. Another four free. Taken with (1), **8 of the 15
   Production of Writing items are solved by "Kept" / "Yes" without reading
   anything.** That is the largest single tell anywhere in this file, Conventions
   included, and no existing checker looks for it.

3. **"Point D" is never the key on any of the five sentence-placement items.**
   `P1-Q08` → B, `P2-Q08` → A, `P3-Q08` → C, `P4-Q08` → B, `P5-Q08` → A. Unlike
   v4's complete ABCD permutation this is not a permutation, which is better; but
   D is a free elimination on all five, and `shuffleDrawnChoices` does not
   dissolve it — the shuffle permutes where the string `Point D.` is displayed
   without changing that it is never the key.

4. **Knowledge of Language is 8 of 8 solvable by a stated rule, and this is not
   a defect.** Two register sandwiches (`P1-Q07`, `P3-Q07`: one inflated option
   and one slangy one around a plain key), one "pick the most specific word"
   (`P2-Q07`), and five length items. The live bank measures 92.9% on this
   stratum (p = 1.0 against v4's 8/8); repairing them would stop them testing
   what the ACT tests. **Worth noting as a genuine improvement over v4:** four of
   the five redundancy/wordiness items (`P1-Q06`, `P2-Q06`, `P4-Q07`, `P5-Q07`)
   carry an over-cut trap — an option shorter than the key that drops required
   information — so "always take the shortest" scores 1 of 5, not 5 of 5. v4's
   equivalents were pure ladders. Only `P3-Q06` keys to the shortest option.
