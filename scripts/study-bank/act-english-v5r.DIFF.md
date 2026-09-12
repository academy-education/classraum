# `act-english-v5r` — repair of the 27 Conventions of Standard English items

Source: `act-english-v5.batch.json` (50 items, never overwritten, never gated,
no ledger entry).
Output: `act-english-v5r.batch.json` (50 items, same 5 passage groups, same
27/15/8 domain split).

**This is the second run of a repair that was already measured.** On
`act-english-v4` the same procedure moved the Conventions stratum from
27/27 = 100.0% on a sibling-free options-only attack to 18/27 = 66.7%:
Fisher p = 1.0000 against the shipped live bank (17/25 = 68.0%, so
indistinguishable) and p = 0.0018 against its own pre-repair self. **68% is
the target, not 0%** — an editing-in-place grammar item's option string
carries its own grammaticality, and that is inherent to what the ACT tests.
What is not inherent is a free elimination.

**The 15 Production of Writing and 8 Knowledge of Language items are
byte-identical to the original**, asserted in `act-english-v5r.repair.py` and
break-tested (`V5R_BREAKTEST=heldout` aborts the build with
`AssertionError: ACT-EN5-P1-Q03 was modified and must not be`). On v4 both of
those strata measured indistinguishable from the shipped bank (p = 1.0 each);
repairing them would remove what the ACT actually tests.

## The governing rule

An options-only solver never sees the prompt or the passage, so `No Change` is
an **opaque token** carrying no orthography. The whole leak therefore lives in
the three *named* alternates:

> **More than one named alternate must be flawless English in isolation** —
> a string a reader with the sentence covered cannot fault — wrong only
> against this sentence's number, tense, antecedent, list or logic.

No key text was changed anywhere. No letters were shuffled (unreachable per
AUTHORING-BRIEF §2b — `shuffleDrawnChoices` re-deals every draw). No passage,
prompt, id, domain, difficulty or grouping was touched.

## Mechanical before/after

    python3 scripts/study-bank/act-english-v5r.check-tells.py \
        scripts/study-bank/act-english-v5.batch.json 50      # and v5r

The checker refuses (exit 1) on a wrong item count, a wrong Conventions count,
a `No Change` span table that does not cover exactly the 27 ids, a span that
does not occur verbatim in its own passage, a wrong subject-verb count, or a
verb form it cannot map. It never falls back to a default input.

                                                          v5        v5r
    M1  binary axis among the NAMED alternates that
          excludes the key (a bracket)                   4 / 27    6 / 27
        (contrast: items with a CLOSED 3+-way axis,
          the safe shape)                                2 / 27    4 / 27
    M2  mechanically reduced to ONE surviving option     2 / 27    0 / 27
          — and that survivor is the key                 2         0
    M3  items with >=1 strike-on-sight option            6 / 27    0 / 27
          (total such options)                           7         0
    M4  alternates ladder >= 2.0x in length              3 / 27    1 / 27
        (support: doubled joiner / comma-wrapped conj)   9 / 27    0 / 27
    M5  subject-verb items where the key is the ONLY
          option of its number                           2 / 2     0 / 2

**M1 went UP and that is the honest number, not a regression.** Read §"M1 rose"
below before treating it as one.

### The checker was attacked before it was believed

- The **first** version returned `M2 = 0/27` on the pre-repair file. That was a
  confident number over something it could not read: its only eliminators were
  a misspelling blacklist and a `; and` regex, so it saw nothing in
  `a bow; and an adult / a bow, an adult / a bow an adult`. Fixed by giving it
  the `No Change` span text (hand table, **validated against the item's own
  passage on every run**, so it cannot drift) and a decidable weak-mark rule:
  inside a family of options carrying the same words, if any member uses `; : —`
  the juncture is clause-sized and the comma/no-mark members are eliminable
  without the sentence. M2 then reported 2/27 before, 0/27 after.
- The **first** version also `REFUSE`d mid-run on the pre-repair file —
  `unmapped verb form in ACT-EN5-P5-Q06` — because `had been` marks no number.
  That is the check working: it exited non-zero rather than scoring 1 of 2
  items and printing a ratio. `had been` is now mapped `unmarked`.
- **M1 was measured over the wrong population first.** Computed over all four
  options it read 8 → 15; computed over the *resolved* option strings it read
  3 → 9. Both are wrong: a solver cannot read a bracket off `No Change`, whose
  text it never sees. Over the named alternates only it is 4 → 6.
- The `; and` detector was **loosened** for this batch (a semicolon *series*
  legitimately ends `; and`), which is the shape of "fixing a loud failure by
  making it quiet". It carries a self-test asserting it still fires on
  `laugh; and he simply` and on `ice; but within a decade`, and does not fire
  on `Whitefish steaks; small potatoes; and onions`.
- `V5R_BREAKTEST=heldout` and `V5R_BREAKTEST=desync` each abort the build with
  the specific assertion, so neither identity assertion is decorative.

### M1 rose: what the number is and is not

The proxy fires on any two named alternates differing at exactly one token when
the key is neither. That is **necessary, not sufficient**. A bracket only buys
the solver anything when a rule available *without the sentence* eliminates
**both** members. Of the six:

| item | pair | does a rule kill both? |
|---|---|---|
| P1-Q07 | `a bow, an adult` / `a bow: an adult` | no — only the comma falls |
| **P3-Q01** | `nine seasons and in that time` / `nine seasons, in that time` | **yes** — "two clauses joined by *and* take a comma" says the answer has both, so both fall. Survivors: `, so in that time` and the opaque token. **Live.** |
| P4-Q03 | `the work, it seasons` / `the work, which seasons` | no |
| P4-Q06 | `, therefore,` / `; therefore,` | no — only the comma one falls |
| P5-Q02 | `his riders'` / `their riders'` | no — knowing the owner is a company needs the sentence |
| P5-Q06 | `there has been` / `there have been` | no — the plural rule kills only `has been` |

So **one** live bracket, at P3-Q01, and its survivors include `No Change`, so it
narrows the field to two rather than naming an answer. The rise itself is
produced by the repair: replacing strike-on-sight junk with same-shape
alternates (three prepositions at P5-Q07, four marks at P1-Q07) creates minimal
pairs by construction, which is why the closed-axis contrast line rose from
2/27 to 4/27 alongside it. AUTHORING-BRIEF §2b calls the closed set the safe
shape; this proxy cannot tell it from the unsafe one, and says so in its own
output.

---

## Item-by-item

26 of the 27 had their option set changed. `*` marks the key (unchanged
throughout). One item, **ACT-EN5-P2-Q03**, was deliberately left alone: its
four options are already the complete comma-placement quartet over one word
string — `{both, left only, right only, none}` — with no strikeable member and
a 1.05x length spread. It is AUTHORING-BRIEF §2b's closed symmetric set, and
every edit available to me would have made it worse.

### en5-p1 "The Late Beginner"

**ACT-EN5-P1-Q01** — comma splice. **Mechanisms 2, 3.**
`laugh he simply` is visibly two clauses jammed together and `laugh; and he
simply` is a doubled joiner: both fall unread, and the key was the only clean
named option left. Replaced with **`laugh; he had simply`** (punctuation
correct, past perfect wrong — it places the handing-over before the owner's
question, when it follows it) and **`laugh, so he simply`** (a comma with a
coordinating conjunction, faultless as a string, asserting a consequence the
sentence does not assert). Two options now carry a semicolon, so the mark no
longer names the key. Explanation rewritten.

**ACT-EN5-P1-Q04** — irregular plural possessive. **Mechanisms 2, 3.**
`childrens` and `childrens's` are both built on a plural of "child" that does
not exist — two free strikes, and `children's` was the only real word on offer.
Replaced with **`child's`** (a faultless possessive, wrong because Ms. Okonkwo
teaches a studio full of children) and **`children`** (a real plural doing no
possessive work). Two options now carry `'s`, so the apostrophe does not decide.

**ACT-EN5-P1-Q07** — semicolon between clauses, key = `No Change`. **Mechanism 2,
the exemplar.** All three named alternates were ungrammatical — comma splice,
run-on, `; and` — so the opaque token won unread. Replaced `a bow; and an adult`
with **`a bow: an adult`**, completing the four-mark set
`{comma, nothing, colon, semicolon}` over identical words. The colon is wrong
because it announces an explanation and the second half contrasts instead.
Residue after mechanical elimination: 2, not 1.

**ACT-EN5-P1-Q08** — verb tense. **Mechanism 4.**
`had been quitting` was 4.25x the length of the key. Replaced with **`is
quitting`**; `has quit` kept. Both alternates are now present-anchored, so the
axis is "what tense does this paragraph use", which needs the paragraph.
*Residual:* the ladder is still 2.75x and is the one remaining M4 hit — the key
is the four-character `quit`, so **any** pair of real alternates ladders past
2.0x. Same class as v4r's P4-Q01 residual, and left for the same reason.

**ACT-EN5-P1-Q09** — dangling modifier. **Mechanism 4 / paraphrase family.**
`my elbow was dropping` was a second minimal re-tensing of the same non-fix.
Replaced with **`My elbow dropped whenever I stopped paying attention, watching
my bow arm in the studio mirror.`** — the phrase moved to the end, a genuinely
different wrong path, and ordinary English as a string. **PARTIAL — see below.**

### en5-p2 "Where the Water Comes From"

**ACT-EN5-P2-Q01** — appositive punctuation, key = `No Change`. **Mechanism 2.**
`the hill; a white cylinder` is a semicolon in front of a fragment and
`the hill a white cylinder` jams two noun phrases: two free strikes. Replaced
with **`the hill, being a white cylinder`** (flawless as a string; wrong because
"being" makes the renaming read as a reason) and **`the hill, it is a white
cylinder`** (a comma splice, and ordinary English as a string). `the hill and a
white cylinder` kept.

**ACT-EN5-P2-Q03** — **NOT REPAIRED.** See above.

**ACT-EN5-P2-Q04** — parallel structure. **Mechanism 4.**
`and then it is tested by them` was 2.45x the key and the third of three options
containing `they/them`, so "take the short one with no pronoun" solved it.
Replaced with **`and testing`** — same length class as the key, wrong because a
present participle does not match `filtered, disinfected`. Ladder 2.9x → 1.6x.

**ACT-EN5-P2-Q07** — subject-verb agreement. **Mechanisms 3, 5.**
`demand were low` is a mass-noun subject with a plural past verb, strikeable on
sight, and the key was the only singular option (1 sg / 3 pl). Replaced with
**`demand was low`** — flawless English, wrong on tense, the sentence describing
what happens on an ordinary night. Now 2 sg / 2 pl; number no longer decides.

**ACT-EN5-P2-Q09** — then vs. than. **Mechanisms 2, 3.**
`is more larger than …` is a doubled comparative and `is larger then the entire
annual budget of the town` repeats the original's error inside an inflated
paraphrase — two strikes, and the rule was over. Replaced with **`is larger than
the towns' entire annual budget`** (a legal plural possessive; Halvard is one
town) and **`are larger than the towns' entire annual budgets`**. The then/than
rule is still tested, through `No Change`. The second distractor deliberately
differs from the key at *three* positions so the option set has no plurality
intersection: the component-wise majority (`is`, `towns'`, `budget`) names a
distractor, not the key.

### en5-p3 "The Person in the Dark"

**ACT-EN5-P3-Q01** — comma with a coordinating conjunction, key = `No Change`.
**Mechanism 3.** `nine seasons; and in that time` is a doubled joiner. Replaced
with **`nine seasons, so in that time`** — correctly punctuated, wrong relation.
**PARTIAL — this is the one live bracket; see below.**

**ACT-EN5-P3-Q03** — its vs. it's. **Mechanism 3.**
`Its'` is not a form of the word, and with it gone the set held exactly one
apostrophe. Replaced with **`There's`** — a real contraction, wrong because it
produces "There is not unusual". Two options now carry an apostrophe, so
counting apostrophes no longer works. `Their` kept.

**ACT-EN5-P3-Q05** — punctuating a quotation. **Mechanisms 2, 3.**
`early,”, he explains.` is a doubled comma and `early” he explains.` is a bare
omission — the key was the only well-formed pattern. Replaced with
**`early?” he explains.`** (a standard and correctly formed attribution; wrong
because the quoted line is a statement) and **`early.” He explains.`** (also
correctly formed; wrong because it closes the quotation off and leaves "He
explains." explaining nothing). All three named alternates are now punctuation
patterns a reader cannot fault on sight; only the content decides.

**ACT-EN5-P3-Q07** — parallel structure. **Mechanism 4.**
`and hundreds of small set screws must be tightened by someone` was the
agentless-passive inflation. Replaced with **`and hundreds of small set screws
were tightened`** — a finite verb of its own, which is the real error, without
the padding.

**ACT-EN5-P3-Q08** — sentence fragment. **Mechanism 3.**
`Work, that takes two weeks …` puts a comma before a restrictive `that`, which
is strikeable. Replaced with **`Work that takes two weeks, leaving no trace an
audience could point to.`** — ordinary English as a string, still a fragment.
**PARTIAL — see below.**

**ACT-EN5-P3-Q09** — run-on. **Mechanisms 1, 2.**
`Not darkness and not blandness the audience should feel …` had no punctuation
at all, and the key was the only option with a subject and a verb in the first
half, so "pick the only complete one" solved it. Replaced with **`It is not
darkness, and it is not blandness, the audience should feel …`** — the same
subject-supplying fix as the key but spliced with a comma — and **`Not darkness,
and not blandness: the audience should feel …`**. Two of three named alternates
now open with `It is`, so the completeness singleton is gone and the item turns
on the mark between two complete clauses.

### en5-p4 "The Boil-Over"

**ACT-EN5-P4-Q02** — series commas. **Mechanisms 2, 3.**
`Whitefish steaks, small potatoes, and, onions` wraps the conjunction in commas
and `Whitefish steaks small potatoes, and onions` jams the first two items:
two free strikes, key by residue. Replaced with **`Whitefish steaks; small
potatoes; and onions`** (a legal semicolon series; wrong because these items
contain no commas of their own) and **`Whitefish steaks, small potatoes,
onions`** (a legal asyndetic list; wrong because a series of three needs the
conjunction). Both are patterns a reader cannot fault without knowing what the
items look like.

**ACT-EN5-P4-Q03** — colon after an independent clause, key = `No Change`.
**Mechanism 2.** All three named alternates were wrong marks — splice, doubled
joiner, run-on — so the opaque token won unread. Replaced with **`the work,
which seasons`** (flawless as a string; wrong because it makes the explanation a
relative clause that then has to coordinate with the independent `and it raises
the density`) and **`the work: they season`** (wrong number — the thing seasoning
is salt). The second keeps a colon in the named field, so "pick the colon" no
longer works. `the work, it seasons` kept as the splice.

**ACT-EN5-P4-Q06** — conjunctive adverb. **Mechanisms 2, 3.**
`a garnish however the show …` had no punctuation and `a garnish, however; the
show …` attaches the adverb backwards — both fall unread. Replaced with
**`a garnish; therefore, the show it produces is real`** and **`a garnish,
therefore, the show it produces is real`**. This arrangement was chosen
deliberately over `;therefore` + `,however`: with the latter the component-wise
plurality (`;` and `however`) lands on the key. As built, the canonical pattern
— full break before the adverb, comma after — matches **two** options, so the
solver is thrown onto the choice of adverb, which is a question about the
sentence's logic.

**ACT-EN5-P4-Q07** — paired punctuation. **Mechanism 2.**
`a fleet coming in; cheaply and outdoors` closes a dash with a semicolon and is
visibly malformed; the key was then the only matched pair. Replaced with
**`a crew — lumber camps — church suppers, a fleet coming in, cheaply and
outdoors`** — a correctly formed pair of dashes around the *wrong span*. Two
options now carry a matched pair, so "find the matched pair" returns two
candidates and the solver has to know which span is the aside.

**ACT-EN5-P4-Q08** — past participle. **Mechanisms 3, 4.**
`had been did` is a non-form, and `done` was 4 characters against the others'
8-13 (ladder 3.0x). Replaced with **`have done`** (present perfect — correct
English, wrong sequence) and **`having done`** (no finite verb for the clause).
Ladder 3.0x → 1.38x, no strikes.

### en5-p5 "Eleven Riders, One Phone Line"

**ACT-EN5-P5-Q01** — sentence fragment. **Mechanism 2.**
`…fifty; which the woman …` is a semicolon in front of a relative clause,
strikeable. Replaced with **`…fifty, whom the woman who answered the radio would
not accept.`** — the right case for the object of "accept" but the wrong word,
because what she would not accept is the cut and not a person. This is the
v4r `whichever` move: break the "exactly one option is a legal relative
pronoun" singleton with a second legal one.

**ACT-EN5-P5-Q02** — possessive apostrophe, key = `No Change`. **Mechanism 3.**
`it's riders' commission` uses `it's` as a possessive and `its riders
commission` has no apostrophe at all — two free strikes. Replaced with
**`their riders' commission`** and **`his riders' commission`**: both legal
possessives, wrong only because the owner is a company, singular and not a
person. `its rider's commission` kept, so the apostrophe-placement rule
(rider's vs. riders') still has to be applied.

**ACT-EN5-P5-Q03** — idiomatic preposition. **Mechanism 2.**
The key was the only option without a phrasal preposition: "strike the ones with
a particle" solved it. Replaced `paid off a flat weekly fee` with **`were paid a
flat weekly fee`** — flawless English, wrong because it reverses who hands over
the money. Two options now have no particle.

**ACT-EN5-P5-Q06** — subject-verb agreement in a `there` sentence.
**Mechanisms 1, 5.** `there was … fund and a rule` differed from `No Change` only
by a serial comma, which is not a distractor at all, and `had been` marks no
number, so the key was the only plural option (2 sg / 1 pl / 1 unmarked).
Replaced with **`there has been …`** and **`there have been …`**. Now 2 sg / 2 pl:
the number rule leaves `were` and `have been` standing, and the choice between
them is "by 1999" against the present perfect, which needs the sentence.

**ACT-EN5-P5-Q07** — parallel structure. **Mechanisms 2, 4.**
`rather than it was comfortable …` and `rather than by it being comfortable …`
are both awkward enough to strike, and the key was the only `by being`.
Replaced with **`rather than for being comfortable to belong to`** and **`rather
than through being comfortable to belong to`**. The three named alternates are
now an identical frame varying only the preposition — a closed three-way axis in
which every member is flawless in isolation and **nothing in the option set
says which preposition the first half used**. This is the cleanest repair in the
batch: the discriminator is entirely invisible options-only.

**ACT-EN5-P5-Q08** — vague pronoun reference. **Mechanism 2.**
`with money in the account, its last members considered a decent result` is
missing its object and falls unread. Replaced with **`with money in the account,
its last members considering this a decent result`** — a well-formed absolute
phrase, wrong for the same reason as its neighbour: `this` has nothing to hold
on to. **PARTIAL — see below.**

---

## Not fully repairable, and why (stated rather than forced)

Each was attempted; the attempt is recorded.

1. **P1-Q09, P3-Q08, P5-Q08 — 1-vs-3 is a property of the item type.**
   A dangling-modifier item has exactly one legal subject for the phrase; a
   fragment item has exactly one complete sentence; a vague-reference item has
   exactly one option that names the referent. Every fourth option that fixes
   the fault *is itself correct*. `Watching my bow arm in the studio mirror, I
   could see that my elbow dropped`, `This is work that takes two weeks`, and
   `with money in the account, a result its last members considered decent`
   (comma for dash) are all good English, which is why none was used. What was
   removed is the length ladder and the twin-paraphrase family; the count
   asymmetry stands, and the shipped bank has it too.
   At P3-Q08 I also considered `Work takes two weeks and leaves no trace an
   audience could point to.` — a complete sentence, which would have broken the
   singleton — and rejected it: it is grammatical, and "best corrects the
   fragment" would then have two defensible answers.

2. **P3-Q01 — the one live bracket.** `nine seasons and in that time` and
   `nine seasons, in that time` each drop one of the two things the rule
   requires, and their union is the key. Killing it means deleting either the
   missing-comma error or the splice, which are the two errors the item exists
   to test. `nine seasons; in that time` and `nine seasons, but in that time`
   were both considered and rejected as *second correct answers*. The survivors
   after the bracket are `, so in that time` and the opaque `No Change`, so it
   narrows the field to two rather than naming an answer.

3. **P1-Q08 — a monosyllabic key cannot avoid a length ladder.** The key is
   `quit`; every real alternate form of the verb is eight characters or more,
   so the 2.0x threshold is unreachable. `did quit` is the only short option and
   it is *past tense*, i.e. a second correct answer on the axis the item tests.
   Reduced from 4.25x to 2.75x and left.

4. **P4-Q03, P1-Q07, P4-Q06 — a mark item's correct mark has near-neighbours.**
   For P4-Q03 a bare semicolon (`Salt does most of the work; it seasons …`) and
   a dash are both *grammatically correct*, so neither could be used as a
   distractor; only the comma splice, a wrong-number pronoun and a mis-attached
   relative clause were available. Same at P1-Q07 (a period is correct) and
   P1-Q01 (a period and `, and` are both correct). The distractor field in this
   family is therefore narrower than the rule would like.

5. **CROSS-ITEM — the semicolon is the key on 4 of the 9 clause-punctuation
   items** (P1-Q01, P1-Q07 via `No Change`, P3-Q09, P4-Q06). "Always take the
   option with a semicolon" scores 4 of 9 against a 25% control. This is a
   value-set property and therefore **reachable** by AUTHORING-BRIEF §2b — it is
   not a letter tell — but each key is fixed by its passage, and moving it
   means re-pointing the underlined span, which changes the key, or editing the
   passages, which would touch the 23 held-out items. **Recorded for a decision,
   not taken.** Identical to v4r finding 5; it has now appeared twice, which
   makes it a commissioning instruction rather than a repair note: *when
   authoring an ACT English form, fix the distribution of key MARKS before
   choosing the underlined spans.*

6. **CROSS-ITEM — `No Change` is the key on 5 of 27 Conventions items (18.5%).**
   This is the one place v5 is better than v4 (7.4%) and it is close enough to a
   real form's rate (~25%) that no repair was attempted. Recorded so the
   comparison is on the record.

## Verification

- `act-english-v5r.repair.py` asserts input identity (50 items, 27 Conventions,
  unique ids), that every rewritten set has four distinct options with
  `No Change` first, that every key is character-identical to one of its own
  choices, that all 23 held-out items **and** the one unrepaired Conventions
  item compare equal as objects to the original, and that no passage, prompt,
  id, domain, difficulty or grouping changed. Break-tested in both directions
  (`V5R_BREAKTEST=heldout`, `V5R_BREAKTEST=desync`); each aborts non-zero with
  the specific assertion, before anything is written.
- `act-english-v5r.check-tells.py` refuses on six distinct input-identity
  failures, validates its own `No Change` table against the passages on every
  run, and carries a self-test for the one detector that was loosened.
- **What these checks do not do:** they are structural pre-flight only. Per
  CLAUDE.md the attack is the gate, and `v5r` **has not been attacked**. The
  number that decides this batch is a fresh sibling-free options-only run on
  the 27 repaired items, scored against the same derived control and compared
  to the live 68.0% — not to zero. Nothing here licenses an insert, and there
  is still no ledger entry for this batch.

## Reported, not edited: what is wrong in the 23 held-out items

None was touched. All are **value-set** properties and therefore reachable by
AUTHORING-BRIEF §2b; none is an authored-order tell.

1. **All five essay-purpose items key to "Yes".** `P1-Q10`, `P2-Q10`, `P3-Q10`,
   `P4-Q10`, `P5-Q10` each ask *would this essay accomplish that goal?* and the
   answer is "Yes" 5 times out of 5. One rule solves five of the fifteen
   Production of Writing items with the passage covered. This is CLAUDE.md's
   "a batch built to one brief develops a cross-item tell" in its semantic form,
   it is the exact analogue of v4's "all four add/delete items key to No", and
   no existing checker looks for it. **This is the largest defect in the
   held-out set.**

   *Corroborated independently while this repair was in flight:* commit
   `81173286` measured the Kept/Deleted and Yes/No shape across every ACT
   English batch and the live bank — live 11/21 = 52.4% (a real ACT runs
   near 50%), **v5 8/9 = 88.9%, p = 0.027, SIGNIFICANT**. So this is a
   batch defect, not a format property, and **`v5r` is not shippable on
   the Conventions repair alone**: the stratum the brief protected carries
   a worse tell than the stratum it asked me to fix.

2. **Point D is never the key on a sentence-placement item.** `P1-Q03` → A,
   `P2-Q05` → C, `P3-Q04` → B, `P4-Q05` → C, `P5-Q04` → B. Five items, and the
   last insertion point in the paragraph is the answer on none of them, so a
   solver gets a free elimination on every one. Note that `shuffleDrawnChoices`
   does **not** dissolve this: it permutes the display order of the four
   `Point [X].` strings without changing which string is the key. (v5 does avoid
   v4's complete-ABCD-permutation version of the same tell.)

3. **Six of the eight Knowledge of Language items are solved by "pick the
   shortest option"**: `P1-Q02`, `P2-Q08`, `P3-Q06`, `P4-Q01`, `P4-Q04`,
   `P5-Q05` are all redundancy/wordiness/precision items whose key is the
   shortest choice; `P1-Q05` and `P2-Q06` are register sandwiches (two inflated
   or colloquial options around the plain key). `P2-Q08` even carries `a
   reservoir that the town gradually drinks down bit by bit over time`.
   **This is mechanism 4 firing on 8 of 8 — and it is not a v5 defect**: the
   shipped bank measured 92.9% on this stratum against v4's 100% (p = 1.0), and
   the control solvers said unprompted that the item type is solvable by
   construction because the stem's axis *is* word count or tone. Repairing them
   would make them stop testing what the ACT tests. Recorded so a future reader
   does not mistake a high score here for noise, or for a reason to rewrite.

4. **Smaller, and a genuine defect rather than a family property:**
   `ACT-EN5-P1-Q02` asks for the most effective replacement for "sat unused and
   unplayed in its case" and offers `sat, unused and unplayed, in its case` —
   which changes the punctuation rather than the redundancy and is the only
   option that does not address the stem's axis at all. It is an inert option in
   a four-option field, i.e. the item is effectively a three-way. Left alone
   under the hold-out rule, but worth a look if the Knowledge stratum is ever
   revisited.
