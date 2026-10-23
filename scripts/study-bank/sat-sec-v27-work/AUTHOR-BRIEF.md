# sat-sec-hard-v27 author brief (Digital SAT Standard English Conventions, HARD)

You are author **X**, where X is A, B, C or D; your run prompt says which. You write **10** Digital SAT
Reading & Writing **Standard English Conventions** items, every one aimed at **hard**. Each item is one
of YOUR 10 slots below. The pre-registration is `scripts/study-bank/PREREG-SEC27-2026-10-23.md`. You do
not need to read it: everything you must follow is in this file. Read the whole file before writing.

Repo root: `/Users/andylee/Downloads/saas/classraum`. Write ONLY these two files:
- `scripts/study-bank/sat-sec-v27-work/<X>/items.json`
- `scripts/study-bank/sat-sec-v27-work/<X>/declarations.json`

The slot table is also in `scripts/study-bank/sat-sec-v27-work/SLOTS.json` (read-only for you). The
checking scripts read that file, so the tables below and the scripts cannot disagree.

## Why this batch is built the way it is (read this first)
The last batch (SEC26) wrote 40 items and kept 14, only 5 of them hard. A script had checked the table
for patterns over ROLES (which number wins, which letter, whether the pronoun matches the verb) and found
none. The two probe readers still rated only about 11 of 80 reads hard, and they named patterns that live
in the WORDS, which no role check can see:
- **"The time word settles the tense alone."** Every tense item had one visible cue ("since", a dated
  past phrase, a when-clause with a past verb) and the cue was always right.
- **"since" always meant the present perfect** (4 of 4), and without "since" the perfect always lost.
- **"The deciding count sits in the sentence before."** Seven punctuation and noun items handed the
  number or the restrictiveness over in a count in the previous sentence ("exactly one clerk", "a lone
  geologist", "Seven ... growers").
- **The verb-number by pronoun-number grid** (8 items): solvable as two independent checks, and the wrong
  pronoun's referent was always the nearest noun of the wrong number.
- **Option shapes that always lose:** the trailing comma ("word the,") lost 4 of 5; the no-punctuation
  option lost 9 of 10; the dash was never keyed; a semicolon after an opening clause always lost.

The graders' template cover then held 19 items, including 7 of the 8 grid items and 4 of the 5 "since"
items. **In the revision round two authors converged on ONE rule**: both killed the colon by "a sentence
takes only one colon", and the cover held one of the pair.

So this batch is built differently, and you must keep it that way in the words:
- **You own whole rule families.** No other author writes a family you write (see your tables). Do not
  borrow another author's mechanism or distractor-kill reasoning.
- **Only ONE perfect is decided by "since"** (C3). The other perfects are decided by a duration phrase
  (A5) or by a present-result clause (B3, B8). One row (C7) puts "since" in the sentence and keys the
  SIMPLE PAST, because the "since" belongs to another verb.
- **Most time frames must be inferred**: a phrase naming a finished era, institution or state of the
  world ("in the age of hand-cranked seismographs", "under the abolished poll tax"), or a present-tense
  clause describing a current state. Only five of the fourteen tense and aspect items carry an explicit
  time word (A5, C2, C3, C6, D7), and that is on purpose.
- **No deciding count in the sentence just before the blank's sentence**, in any item. Only two items
  are decided by a count at all (B10: two sentences back; D10: a later sentence), and even there the
  count is a fact that must be read, not a numeral.
- **Four pronoun items, not eight**, one per author, with the antecedent at four different distances
  (same clause, same sentence, previous sentence, two sentences back), and the wrong pronoun's referent
  is the noun just before the blank in only two of them.
- **Marked options are keyed:** the trailing-comma shape is keyed in C9; the no-mark option in A8, B1
  and D5; the dash in B10; the colon in D1 and D9.

A script (`sec27-semcheck.mjs`) counts these rules on your declarations AND on your text and refuses the
freeze if any one covers more items than its bar. Your declarations must therefore be accurate: the
script takes the LARGER of what you declare and what it reads in the text.

## What the grader panel rewards (SEC22-SEC26 panels)
An item counts only if the MEDIAN of three graders calls it hard. SEC26's panel called 8 of 40 hard:
6 of the 10 punctuation items (all three restrictiveness items, both garden paths, one delayed-verb
boundary), the one cataphoric-ellipsis item, and one aspect item. Tense 0/7, pronoun 0/8, auxiliary 0/2,
noun form 0/4. Cataphoric ellipsis has been rated hard in every batch since SEC22.

**H1. Every wrong option is strong on its own.** For each wrong option write in `distractor_pulls` the
reason a strong student would choose it. If the only reason is "it fills the grid", change the item.

**H2. Two rules that interact.** In pronoun items the verb and the pronoun take DIFFERENT nouns, and a
wrong pronoun must be wrong by a RULE, never by meaning.

**H3. The number is not found by "skip the modifier, find the head".**

**H4. The second rule's evidence is five or more words from the blank and needs parsing.**

**H5. Nothing strikable at a glance; nothing resolving within four words after the blank.**

**H6. Wrong only by rule.** Every wrong option is an error a copy editor would mark under one named
convention, never a reading that is merely less likely.

**H7. A punctuation or noun-form item is hard only when another sentence, or a word 6+ words away,
decides it** (or, new here, a fact that must be INFERRED inside the sentence).

**H8. No template across the batch.** When two or more graders call items one template, the batch keeps
ONE and holds the rest. Keep your passages from sharing a sentence skeleton, an opening, or a blank
position with each other and with the examples below.

**H9 (NEW). No item is solvable by a cue word.** Before writing a time frame, ask: could a student who
has seen a dozen SAT items pick the tense from one word in the sentence without parsing? If yes, and
your row is not one of the five explicit-cue rows, rewrite the decider so the time frame must be inferred.

### Items the SEC26 panel kept as hard (now LIVE: learn the feature, never the frame or wording)
- **SEC26A-03** (h/h/m): sentence-final restrictive participial phrase, key no mark ("tray kept"),
  decided by a fact in another sentence.
- **SEC26A-07** (h/e/h): sentence boundary before a delayed-verb noun phrase, key period ("catgut. The").
- **SEC26B-05** (h/h/h): cataphoric ellipsis, options do / was / does / were, key "do".
- **SEC26B-07** (h/h/h): garden path after an opening clause, key the LATE comma ("blasted the ridge,").
- **SEC26C-02** (h/h/m): present perfect "have been invisible" decided by a since-clause.

### Why SEC26's medium items were medium (the readers' own words)
- tense: "plain subject-verb number with a past-time clause handing over tense";
- aspect: "'since' clause forces present perfect";
- pronoun: "verb number crossed with pronoun number in a 2x2 grid ... the pronoun distractor is always
  the nearest noun of the wrong number";
- noun form: "noun count given in prior sentence decides possessive or plural form".

## Before each item: the self-test (write it into the declarations)
1. Name the deciding word(s) for each rule and count the words from the blank (H4).
2. For each wrong option, write the reason a strong student picks it (`distractor_pulls`, H1).
3. Cover the passage: can you strike any option from its form alone (H5)?
4. Write the sentence in which each wrong option WOULD be correct, and the convention that rules it out
   here (H6).
5. Cover everything except the blank's sentence and look for a single word that names the time (H9),
   or a count word in the sentence before (never allowed). Then fix it.

The declarations are wording discipline. They prove nothing about difficulty.

## Grid codes (agreement items)
Each grid is a complete 2x2 = 4 options, one lexical verb in all four.

| code | sg / pl | code | sg / pl |
|---|---|---|---|
| i | was / were | b | is / are V-ing |
| j | is / are | g | was / were V-ing |
| c | is / are V-en (passive) | k | is / are being V-en |
| h | was / were V-en (passive) | l | was / were being V-en |
| e | has / have been V-en | f | has / have been V-ing |
| r | has / have been + complement | m | does / do |
| n | has / have | a | V-s / V |
| d | has / have V-en (active) | | |

Pronoun grids cross the verb's number with the pronoun's number, one verb form: `a+p` {visits it, visit
it, visits them, visit them}; `c+p` {is kept by it, are kept by it, is kept by them, are kept by them};
`d+p` possessive {has filled its, have filled its, has filled their, have filled their}; `g+p` {was
wrapping it, were wrapping it, was wrapping them, were wrapping them}.

Auxiliary grids carry a SHARED adverb or word, fixed by the row, so that no option set equals one already
in the bank (checked by `sec27-exclusion.mjs`):
- A3 `m|n` + "rarely", adverb FIRST: {rarely does, rarely do, rarely has, rarely have}
- A9 `j|m` + "usually", adverb FIRST: {usually is, usually are, usually does, usually do}
- B4 `j|n` + "always", adverb SECOND: {has always, have always, is always, are always}
- B9 `i|n` + "also", adverb SECOND: {was also, were also, has also, have also}
- C8 `j|m` + "seldom", adverb FIRST: {seldom is, seldom are, seldom does, seldom do}
- D4 `j|n` + "too", word LAST: {has too, have too, is too, are too}
- D8 `i|m` + "often", adverb FIRST: {often was, often were, often does, often do}

Voice is the same in all four options of every grid. Progressive is the same in all four. Never mix.

**Length (the 1.6 ratio bar).** In A5 (`f|b`), B3 (`e|h`), C3 (`e|c`) and C7 (`e|h`), "have been V-en /
V-ing" sits beside a two-word form; use a participle or -ing form of 9 or more letters ("documented",
"monitoring") or the ratio crosses 1.6. **Shared complement words** (C2, D2: `i|j` + word; D7: `r|i` +
word) are an adjective or noun not ending in -ed or -en and not an -ly word, different from every other
author's.

## YOUR SLOTS
Column meanings (agreement):
- **Key**: the verb's number. **2nd dim: key**: the second rule's answer.
- **Near**: the number of the noun immediately before the blank (one of the 4 words before it).
- **Pos**: where the misleader sits: `adj` just before the blank; `early` earlier in the sentence;
  `after` after the blank.
- **First**: the first noun of the blank's SENTENCE against the key: `agr` same number, `opp` other.
- **After**: the first noun within 8 words after the blank: `opp` the wrong number (never within 4 words
  if it would resolve the item), `agr`, `free`.
- **decider_kind** goes in your declaration (the semantic check reads it).
- **Letter**: where the key sits in `choices` (A = first).

### Author A (life sciences, medicine, agriculture; names A-F)
| Slot | Family (yours alone) | Frame | Misleader | Pos | Key | Near | First | After | 2nd dim: key | Decider (`decider_quote`) | `decider_type` / `decider_kind` | Grid | Key form | Shared word | Letter | Lever |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A2 | T-conditional-passive | A singular head whose number has to be found past a modifier; 'is V-en' against 'was V-en'; a present 'unless' or 'provided that' clause 5+ words after the blank fixes the present | a plural noun in the subject; 'was V-en' pulls because the passage narrates a past study | early | sg | sg | opp | free | tense: present | a present-tense 'unless' / 'provided that' clause, 5+ words after the blank | conditional / conditional | c\|h | is V-en | - | C | H4: the conditional is the only tense evidence; no time word anywhere in the blank's sentence |
| A3 | E-cataphoric-ellipsis | An opening 'Whereas/Although the [PLURAL NP] rarely ___,' whose elided verb is the main clause's lexical PRESENT verb (not 'have' + participle); the main clause's subject is singular | the singular main-clause subject after the blank pulls 'does'; 'have' pulls because the main verb sounds like a completed result | after | pl | pl | opp | opp | aux: do | the main clause's lexical present verb, 5+ words after the blank | parallel-verb / cataphoric-ellipsis | m\|n | do (with "rarely") | "rarely" | D | H1, H4 (cataphoric ellipsis has been panel-hard in every batch since v22: SEC22B-05, SEC23B-06, SEC24A-06, SEC24B-01, SEC25B-05, SEC26B-05) |
| A5 | S-duration | Perfect progressive KEYED by a DURATION phrase ('for nine seasons', 'for three winters'), 5+ words after the blank, running up to the present; the lure is the PRESENT progressive ('are V-ing'), not a past form. No 'since' anywhere | 'are V-ing' pulls as the plain description of an ongoing activity; a singular noun near the blank pulls the verb | early | pl | pl | opp | agr | aspect: perfect (duration) | a duration phrase ('for N [units]'), 5+ words after the blank, inside the blank's sentence | time-phrase / duration | f\|b | have been V-ing | - | A | H4; the perfect is decided without 'since' (SEC26: 'since' keyed the perfect 4/4 and both readers named it) |
| A6 | P-previous-sentence | Possessive pronoun, MATCHED (plural verb + 'their'), the plural owner named in the PREVIOUS sentence; a singular noun in the blank's sentence gives 'its' a believable but grammatically excluded owner (it is inside a phrase that cannot own the object) | the singular noun pulls 'its'; the matched key looks like 'copy the subject' | early | pl | pl | opp | free | pronoun: pl (MATCHED); antecedent previous-sentence; the wrong pronoun's referent is NOT the noun just before the blank | the previous sentence's plural owner | pronoun-antecedent / pronoun-antecedent | d+p | have V-en their | - | A | H2 (matched numbers on different nouns); antecedent one sentence back |
| A7 | T-conditional-progressive | A plural subject whose number must be KNOWN (a plural that reads singular, or a compound joined by 'and' whose second member is long); 'are V-ing' against 'were V-ing'; a present 'as long as' or 'provided that' clause 5+ words after | the subject reads singular; 'were V-ing' pulls because the passage reports past fieldwork | adj | pl | sg | agr | agr | tense: present | a present-tense conditional clause, 5+ words after the blank | conditional / conditional | b\|g | are V-ing | - | D | H3, H4 |
| A9 | E-cataphoric-be | An opening 'Although the [SINGULAR NP] usually ___,' whose elided predicate is the main clause's be + ADJECTIVE (so be, not do); the main clause's subject is plural | the plural main-clause subject after the blank pulls 'are'; 'does' pulls because 'usually' reads as a habitual action | after | sg | sg | opp | opp | aux: be | the main clause's predicate adjective, 5+ words after the blank | parallel-verb / cataphoric-ellipsis | j\|m | is (with "usually") | "usually" | B | H1, H4 (be-ellipsis: the elided predicate is an adjective, 5+ words after the blank) |

| Slot | Family (yours alone) | Shape | Key | The four options | Lures that must tempt | Letter | Decider (`decider_quote`) | `decider_kind` | Lever |
|---|---|---|---|---|---|---|---|---|---|
| A1 | B-delay | Two independent clauses; the second opens with a determiner + noun phrase that reads as an appositive of the first clause's last noun until its verb arrives 6+ words later. The second clause reports a LATER, separate event, so it neither explains nor restates the first | semicolon | semicolon, comma, no mark, colon | the comma (appositive reading); the colon (a reader who takes the second clause as an explanation); no mark (run-on) | C | the second clause's verb, 6+ words after the blank | delayed-verb | H4. The colon must die on the RELATION (the second clause is a later event, not an explanation), never on a second colon elsewhere in the sentence (SEC26: two authors converged on 'one colon per sentence') |
| A4 | B-delay | Two sentences: the second opens with a long noun phrase that reads as an appositive of the first sentence's last noun until its verb arrives 6+ words later; it makes a separate claim (a contrast or a new finding), not an explanation | period + capital | period + capital, comma, no mark, colon | the comma (appositive reading); the colon (explanation reading); no mark | C | the second sentence's verb, 6+ words after the blank | delayed-verb | H4. As A1: the colon dies on the relation (a contrast or new claim is not an explanation) |
| A8 | B-delay | A verb of reporting or finding (showed, suggested, confirmed) whose object is a content clause with 'that' omitted; the clause's subject is a long noun phrase whose verb arrives 6+ words later, so it can be read as the start of a new sentence. No mark is correct | no mark | no mark, comma, semicolon, dash | the semicolon and the dash (new-clause reading); the comma (the reader pauses after the reporting verb) | B | the content clause's verb, 6+ words after the blank | delayed-verb | H4; the delayed-verb family keys a semicolon (A1), a period (A4) and NO MARK here |
| A10 | N-singular-possessive | SINGULAR POSSESSIVE. A fact INSIDE the blank's sentence implies exactly one owner (a title, a role, a superlative: 'the colony's founding queen', 'the ward's chief surgeon'), with no count word anywhere in the passage; the noun after the blank can be read as a verb | X's | X, X's, Xs, Xs' (one regular noun) | the plural possessive; the plain plural (garden path) | B | a fact inside the blank's sentence that implies one owner (no count word) | inference-unique | H7 by inference, not a count (SEC26: the four noun items were all decided by a count in another sentence and graders grouped them) |

### Author B (earth, space and physical sciences, engineering; names G-L)
| Slot | Family (yours alone) | Frame | Misleader | Pos | Key | Near | First | After | 2nd dim: key | Decider (`decider_quote`) | `decider_type` / `decider_kind` | Grid | Key form | Shared word | Letter | Lever |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B2 | T-inferred-past-passive | 'were V-en' against 'are V-en'; the past is INFERRED, not announced: a phrase naming a finished era or a superseded instrument ('before the first satellites', 'in the age of hand-cranked seismographs', 'under the old survey datum') 5+ words after; no year, no 'ago', no 'last', no when/while clause with a past verb | 'are V-en' reads as a general statement about the instrument; a singular noun near the blank | adj | pl | sg | opp | free | tense: past | a phrase naming a finished era or superseded practice, 5+ words after the blank | time-phrase / closed-past-inferred | c\|h | were V-en | - | B | H4: the time frame needs inference (SEC26: 'a closed past phrase always means simple past', readers' named rule) |
| B3 | S-present-result-passive | Passive present perfect KEYED by a PRESENT-RESULT clause in the same sentence ('..., so the gauge now reads...' is banned: no 'now/still/already'; write '..., and the replacement gauge reads two degrees higher'), with NO since, NO duration phrase and NO time word in the blank's sentence. 'was V-en' must be wrong because the result clause is present and nothing places the action in a closed past | 'was V-en' pulls because the action sounds finished; a plural noun near the blank | adj | sg | pl | agr | free | aspect: perfect | a present-tense clause in the blank's sentence stating the current result | present-result / present-result | e\|h | has been V-en | - | A | H4; the perfect is decided without 'since' or a duration |
| B4 | X-distant-participle | The blank is the auxiliary + shared 'always'; a 3+ word adverbial and then the past participle of a verb that cannot be passive or adjectival here (an intransitive: 'drifted', 'subsided', 'erupted') settles have over be; a singular head | 'is always' reads as the plain present; a plural noun near the blank | early | sg | sg | agr | free | aux: have | the intransitive participle, 5+ words after the blank | aux-form / distant-participle | j\|n | has (with "always") | "always" | B | H4 (SEC25A-07's mechanism with a new shared adverb and a new option set) |
| B6 | P-two-back | By-agent pronoun, present passive, MISMATCHED (singular verb + 'by them'); the plural agent is named TWO sentences back (the passage's first sentence); the noun just before the blank is singular and is the believable referent for 'it' | the singular noun before the blank pulls 'it'; the plural agent pulls 'are' | early | sg | sg | agr | opp | pronoun: pl (MISMATCHED); antecedent two-back; the wrong pronoun's referent IS the noun just before the blank | the plural agent named two sentences back | pronoun-antecedent / pronoun-antecedent | c+p | is V-en by them | - | C | H2; the antecedent is far (two sentences back) |
| B7 | T-inferred-past-being | 'was being V-en' against 'is being V-en'; the past is INFERRED from a phrase naming a finished state of the world ('while the old causeway still carried traffic' is banned: 'still' and 'while + past'; write 'in the final months of the steam era', 'during the survey's first, unmapped decade'); no year, no ago | 'is being V-en' reads as the default description of work in progress; a plural noun near the blank | adj | sg | pl | agr | opp | tense: past | a phrase naming a finished era, 5+ words after the blank | time-phrase / closed-past-inferred | k\|l | was being V-en | - | D | H4 (the batch's only 'being' grid) |
| B8 | S-present-result-active | Active present perfect KEYED against the past progressive by a PRESENT-RESULT clause ('..., and the channel is now dry' is banned for 'now'; write '..., which is why the channel carries no water'), with no since, no duration and no time word in the blank's sentence | 'were V-ing' pulls because the activity sounds like background narration; a singular noun near the blank | adj | pl | sg | agr | free | aspect: perfect | a present-tense clause in the blank's sentence stating the current result | present-result / present-result | d\|g | have V-en | - | D | H4; the second present-result row; its result clause must differ in shape from B3's (a 'which is why' clause, a 'so' clause, a coordinated present clause) |
| B9 | X-distant-adjective | The blank is the auxiliary + shared 'also'; a 3+ word adverbial and then a predicate ADJECTIVE ('unstable', 'inaccessible') settles be over have ('have also ... unstable' needs 'been'); a plural head | 'have also' pulls as the default with an adverb; a singular noun near the blank | early | pl | pl | agr | agr | aux: be | the predicate adjective, 5+ words after the blank | aux-form / distant-adjective | i\|n | were (with "also") | "also" | C | H4 |

| Slot | Family (yours alone) | Shape | Key | The four options | Lures that must tempt | Letter | Decider (`decider_quote`) | `decider_kind` | Lever |
|---|---|---|---|---|---|---|---|---|---|
| B1 | B-restrict | Sentence-final RESTRICTIVE participial phrase; a LATER sentence contrasts another set of the noun ('The cores drilled in winter, by contrast, ...'), so the phrase is needed to say which. No count word anywhere in the passage | no mark | no mark, comma, dash, period + capital | the comma and the dash (nonrestrictive reading); the period (a reader who takes the phrase as a new sentence) | B | a contrast in a LATER sentence (OUTSIDE the blank's sentence) | contrast-later | H7; the contrast is in a later sentence, never a count in the sentence before (SEC26: 'the deciding count sits in the preceding sentence', 7 items) |
| B5 | B-restrict | Sentence-final NONRESTRICTIVE participial phrase; a fact INSIDE the blank's sentence makes the noun unique (a superlative, a proper name, a possessive with one possible referent: 'the observatory's largest mirror'), so the phrase adds information. No count word anywhere in the passage; no dash offered | comma | comma, no mark, period + capital, colon | no mark (restrictive reading); the period (fragment); the colon (a participial phrase that modifies the noun is not an explanation of the clause) | C | a fact inside the blank's sentence that makes the noun unique (inference, no count word) | inference-unique | H7 by inference |
| B10 | B-restrict | Sentence-final NONRESTRICTIVE appositive set off by a dash; the passage's FIRST sentence (two sentences before the blank's) establishes there is only one of the noun, IN A WORD THAT NEEDS READING (a role or a title, e.g. 'the station's sole seismometer' is banned as a count word; write 'the station's seismometer, installed when the station opened,'), never in the sentence just before; no comma offered | dash | dash, no mark, period + capital, comma one word off | no mark (restrictive reading); the period (fragment); the comma one word off | A | a fact two sentences before the blank's sentence (OUTSIDE the blank's sentence; never the sentence just before) (count_sentence: two-back) | count-other | H7 |

### Author C (history, the arts, humanities; names M-R)
| Slot | Family (yours alone) | Frame | Misleader | Pos | Key | Near | First | After | 2nd dim: key | Decider (`decider_quote`) | `decider_type` / `decider_kind` | Grid | Key form | Shared word | Letter | Lever |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| C2 | T-habitual | 'is + shared word' against 'was + shared word'; a habitual 'whenever' clause with a present verb, 5+ words after the blank; a singular subject after an opening phrase whose noun is plural | the opening plural; 'was' pulls because the passage reports an archive's history | early | sg | sg | agr | free | tense: present | a 'whenever' clause with a present verb, 5+ words after the blank | time-clause / habitual-clause | i\|j | is + word | a complement word (yours) | C | H4 (the batch's one habitual cue; explicit by design, counted in SC4) |
| C3 | S-since | Passive present perfect KEYED by 'since' + a past-tense clause, 5+ words after the blank; the lure is the PRESENT passive ('are V-en'), not a past form, so 'since' does not simply mean 'not the past' | 'are V-en' pulls as the plain description; a singular noun near the blank | adj | pl | sg | opp | agr | aspect: perfect (since) | 'since' + a past-tense clause, 5+ words after the blank | time-clause / since | e\|c | have been V-en | - | D | H4; the batch's ONE since-decided perfect (SEC26 had four, keyed 4/4) |
| C5 | P-same-clause | Object pronoun, MISMATCHED (plural verb + 'it'); the singular antecedent sits in the SAME clause, just before the blank, as the object of a preposition inside the subject (so the nearest noun IS the antecedent); a plural noun elsewhere in the sentence gives 'them' a believable referent | the singular noun just before the blank pulls the verb to singular; the plural noun pulls 'them' | adj | pl | sg | agr | agr | pronoun: sg (MISMATCHED); antecedent same-clause; the wrong pronoun's referent is NOT the noun just before the blank | the singular noun in the same clause | pronoun-antecedent / pronoun-antecedent | a+p | V it | - | B | H2; here the nearest noun is the antecedent (SEC26: the wrong pronoun was always the nearest noun) |
| C6 | T-past-clause | 'was V-ing' against 'is V-ing'; a 'when' clause with a past verb 5+ words after (an interrupted action); a singular head whose number must be found past a long modifier ending on a plural noun | the plural noun at the end of the modifier; 'is V-ing' as the default description | early | sg | sg | agr | agr | tense: past | a past 'when' clause, 5+ words after the blank | time-clause / past-time-clause | b\|g | was V-ing | - | A | H3, H4 (the batch's one explicit past clause; counted in SC3 and SC4) |
| C7 | S-since-lure | 'were V-en' KEYED against 'have been V-en' (the participle 9+ letters, for the length ratio). 'since' appears ONCE, in a relative or opening clause that belongs to ANOTHER verb ('The chapels, which have stood empty since the parishes merged, ___ crowded during ...'); the blank's own verb is fixed in a closed past by a phrase naming one finished event, 5+ words after | 'since' in the sentence pulls 'have been V-en' (the SEC26 rule 'since means perfect'); a singular noun near the blank | early | pl | pl | agr | opp | aspect: non-perfect (since in ANOTHER clause) | a phrase naming one finished event, 5+ words after the blank (NOT the since clause) | time-phrase / since-lure | e\|h | were V-en | - | C | H4; breaks 'since means perfect' on purpose |
| C8 | X-distant-ing | The blank is 'seldom' + the auxiliary ({seldom is, seldom are, seldom does, seldom do}); a 3+ word adverbial and then an -ING form ('copying', 'touring') settles be over do ('do ... copying' is ungrammatical; 'do ... copy' would need the bare verb); a plural head | 'seldom do' pulls as the idiomatic order with 'seldom'; a singular noun near the blank pulls 'is' | adj | pl | sg | agr | free | aux: be | the -ing form, 5+ words after the blank | aux-form / distant-ing | j\|m | are (with "seldom") | "seldom" | D | H4 |

| Slot | Family (yours alone) | Shape | Key | The four options | Lures that must tempt | Letter | Decider (`decider_quote`) | `decider_kind` | Lever |
|---|---|---|---|---|---|---|---|---|---|
| C1 | B-garden | Garden path after an opening subordinate clause: the noun phrase after the clause's verb could be its object or the main clause's subject; the main verb 6+ words later shows it is the SUBJECT, so the comma goes BEFORE it (the early position) | comma at the EARLY position | comma at the EARLY position, comma at the LATE position, no mark, colon at the early position | the comma after the noun phrase (object reading); no comma; the colon after the subordinate clause | A | the main clause's verb, 6+ words after the blank | garden-verb | H4; C9 keys the late position |
| C4 | B-then | A complete clause, then 'then' (or 'later', 'afterward') + a NOUN PHRASE with no verb ('...recorded one tremor, then a second, weaker one near the coast'); a reader who expects a clause after 'then' reaches for the semicolon. No verb ever arrives | comma | comma, no mark, semicolon, colon | the semicolon (new-clause reading); no mark; the colon | B | no finite verb arrives after 'then' (quote the noun phrase's last word, 6+ words after the blank) | no-verb-arrives | H4; graders must find that no verb comes |
| C9 | B-garden | Garden path after an opening subordinate clause: the noun phrase after the clause's verb IS its object; the main clause's own subject arrives after it, and its verb 6+ words later, so the comma goes AFTER the noun phrase (the late position: the keyed option ends in its comma) | comma at the LATE position | comma at the LATE position (the option ends in its comma), comma at the EARLY position, no mark, semicolon at the EARLY position | the comma before the noun phrase (subject reading); no comma; a semicolon at the early position | D | the main clause's subject and verb, 6+ words after the blank | garden-verb | H4; the trailing-comma shape is KEYED here (SEC26: 'trailing-comma options always lose', 4/5) |
| C10 | N-plain-plural | PLAIN PLURAL keyed. The word after the blank is a VERB that can also be read as a noun, and the plural is fixed by a fact in the blank's OWN sentence (an 'and'-joined pair of owners, or a plural verb later in the clause), never by a count in another sentence | Xs (plain plural) | X, X's, Xs, Xs' (one regular noun) | the plural possessive (the next word read as a noun); the singular possessive | A | the verb after the blank, plus the blank's own sentence | verb-after-blank | H7 without a count elsewhere |

### Author D (social sciences: economics, linguistics, psychology, education, urban studies, political science; names S-Z)
| Slot | Family (yours alone) | Frame | Misleader | Pos | Key | Near | First | After | 2nd dim: key | Decider (`decider_quote`) | `decider_type` / `decider_kind` | Grid | Key form | Shared word | Letter | Lever |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| D2 | T-present-inferred | 'are + shared word' against 'were + shared word'; the present is INFERRED from a present-tense clause in the same sentence describing a current state ('..., a gap the agency's handbook describes in its opening chapter'), with no time word (no now, currently, today) | 'were' pulls because the passage reports a past survey; a singular noun near the blank | adj | pl | sg | opp | opp | tense: present | a present-tense clause in the blank's sentence describing a current state | present-result / present-inferred | i\|j | are + word | a complement word (yours) | B | H4: the present must be inferred |
| D3 | S-inferred-past | 'were V-ing' KEYED against 'have been V-ing'; the closed past is INFERRED from a phrase naming a finished institution or period ('in the years of the old ration-book system', 'under the abolished poll tax'), 5+ words after; no year, no ago, no when + past verb | 'have been V-ing' pulls because the activity sounds ongoing; a singular noun near the blank | early | pl | pl | opp | agr | aspect: non-perfect | a phrase naming a finished period, 5+ words after the blank | time-phrase / closed-past-inferred | f\|g | were V-ing | - | C | H4 |
| D4 | E-anaphoric-have | Anaphoric ellipsis at the end of a sentence: '..., and the [PLURAL NP] ___ too' (shared 'too'), where the elided predicate is an earlier have + participle ('had/has risen', so 'have', not 'are'); the earlier clause's subject is singular | the earlier singular subject pulls 'has'; 'are' pulls because the antecedent clause reads as a state | adj | pl | sg | opp | free | aux: have | the earlier clause's participle, 5+ words before the blank | parallel-verb / anaphoric-ellipsis | j\|n | have + word | a complement word (yours) | A | H1, H4: the elided participle is 5+ words before the blank, in another clause |
| D6 | P-same-sentence | Object pronoun, MATCHED (singular verb + 'it'); the singular antecedent is in an OPENING clause of the same sentence; the noun just before the blank is plural and gives 'them' a believable but excluded referent | the plural noun before the blank pulls 'were' and 'them' | adj | sg | pl | opp | free | pronoun: sg (MATCHED); antecedent same-sentence; the wrong pronoun's referent IS the noun just before the blank | the opening clause's singular noun | pronoun-antecedent / pronoun-antecedent | g+p | was V-ing it | - | D | H2: matched numbers on different nouns |
| D7 | S-closed-past | 'was + shared word' KEYED against 'has been + shared word'; an explicit closed-past phrase ('in the spring of that year', 'during the 1990s census' is banned for the year: write 'during that census') 5+ words after; no since anywhere | 'has been' pulls because the state sounds lasting; a plural noun near the blank | adj | sg | pl | agr | opp | aspect: non-perfect | an explicit closed-past phrase, 5+ words after the blank | time-phrase / closed-past-explicit | r\|i | was + word | a complement word (yours) | B | H4 (the batch's one explicit closed-past phrase; counted in SC3 and SC4) |
| D8 | E-anaphoric-do | Anaphoric ellipsis in a comparison or contrast: '..., as the [SINGULAR NP] often ___' (shared 'often'), the elided verb a PRESENT lexical verb earlier in the sentence; 'was' pulls because a nearby clause is past | a plural noun before the blank pulls 'do'; 'was' pulls because a nearby clause narrates the past | adj | sg | pl | agr | agr | aux: do | the earlier lexical present verb, 5+ words before the blank | parallel-verb / anaphoric-ellipsis | i\|m | does (with "often") | "often" | A | H1, H4 |

| Slot | Family (yours alone) | Shape | Key | The four options | Lures that must tempt | Letter | Decider (`decider_quote`) | `decider_kind` | Lever |
|---|---|---|---|---|---|---|---|---|---|
| D1 | B-list-colon | A COMPLETE clause whose last words could still be taking an object ('The survey isolated two factors', '...measured only what it could count'), then a sentence-final list or appositive that explains it; the reader must decide whether the clause before the blank is complete. No dash offered | colon | colon, comma, no mark, semicolon | the comma (a series that starts too early); no mark (the list read as the verb's object); the semicolon (no clause follows) | D | whether the clause before the blank is complete, and what follows explains it | clause-completeness | H4; a colon key where the colon is not the lone strong mark |
| D5 | B-object | A verb (or a verb + particle: 'set out', 'laid out', 'ruled out') whose DELAYED OBJECT is a long noun phrase that reads as a new clause or an appositive; no verb follows, because the noun phrase is the object. No mark is correct | no mark | no mark, comma, dash, semicolon | the comma and the dash (appositive reading); the semicolon (new-clause reading) | A | the verb's need for an object: the long noun phrase after the blank is its object | verb-frame | H4 (the mechanism of 'no mark before a delayed object', with a particle verb and a new frame) |
| D9 | B-final-appositive | A complete clause, then a sentence-final noun phrase that EXPLAINS it ('One variable mattered more than the rest ___ the distance between home and the nearest clinic'); the noun phrase reads as the start of a clause until no verb arrives. No comma and no dash offered (either could be defensible) | colon | colon, no mark, semicolon, comma one word off | the semicolon (second-clause reading); no mark; the comma one word off | D | no finite verb ever arrives (quote the modifier word where a clause would need its verb, 6+ words after the blank) | no-verb-arrives | H4 (SEC26D-09 was non-exclusive 3/3 because a comma was keyed with a colon offered; here the colon is keyed and no comma is offered) |
| D10 | N-plural-possessive | PLURAL POSSESSIVE. A LATER sentence (never the sentence before) shows several owners by what they DO ('Each of the councils then ...' is banned; write 'The councils later disagreed about ...'); the noun after the blank can be read as a verb | Xs' | X, X's, Xs, Xs' (one regular noun) | the plain plural (garden path); the singular possessive | C | a fact in a LATER sentence (OUTSIDE the blank's sentence) (count_sentence: later) | count-other | H7 |

## YOUR settings (pick a different one for every item; never take another author's)
Concurrent authors converged twice (SEC26's colon rule; WIC28's roofing slate). So each author has its own
list. Use a different setting for every item, and in the revision round, if you must change a setting,
take an unused one FROM YOUR LIST.
- **A**: beekeeping; a dairy herd's mastitis trial; seed banks; vineyard irrigation; tuberculosis
  sanatoria; a malaria vaccine field trial; soil nematodes; poultry vaccination; hospital hand-hygiene
  audits; tree grafting; fish-farm parasites; wheat rust.
- **B**: seismometer networks; glacier boreholes; a radio telescope's dish; meteorite collections;
  bridge cable inspection; tide gauges; volcanic gas sampling; dam spillways; aurora photography;
  semiconductor clean rooms; lighthouse optics; ocean-floor cores.
- **C**: monastic scriptoria; Renaissance fresco restoration; a silent-film archive; Baroque organ
  building; Ottoman map-making; printing-house apprenticeships; Greek theater masks; a cathedral's stained
  glass; jazz recording sessions; medieval guild records; Mughal miniature painting; museum provenance.
- **D**: rural credit unions; bilingual classrooms; commuter rail ridership; municipal budgeting; child
  language acquisition; survey nonresponse; minimum-wage studies; housing cooperatives; voter turnout;
  memory experiments; school lunch programs; informal labor markets.

## YOUR distractor-kill rules (how YOUR wrong marks die; do not use another author's reasoning)
- **A (delayed-verb boundaries).** The colon in A1 and A4 dies on the RELATION: the second clause is a
  later event (A1) or a contrast / new claim (A4), not an explanation, list or restatement. The comma dies
  as a comma splice once the verb arrives. Never kill any mark by "a sentence may contain only one colon"
  or by any second mark elsewhere in the sentence, and do not put a colon anywhere else in the passage.
- **B (restrictiveness).** No mark vs comma/dash dies on WHICH set is meant (B1: a later contrast; B5: a
  unique referent inside the sentence; B10: a fact two sentences back). The period dies because the
  phrase cannot stand alone. The colon in B5 dies because a participial phrase that modifies a noun is not
  an explanation of the whole clause.
- **C (garden paths and "then").** The comma's position dies on the main verb's subject. The colon in
  C1 and C4 dies because what precedes it is not a complete clause (C1) or what follows is a sequence, not
  an explanation (C4). The semicolon in C4 dies because no verb ever arrives; in C9 because the opening
  clause is not independent.
- **D (clause completeness).** The semicolon in D1, D5 and D9 dies because no independent clause follows;
  no mark dies in D1 and D9 because the clause before the blank is already complete (a run-on into an
  explanation); the comma dies in D1 because it starts a false series.

## Non-agreement rules (boundary and noun-form items)
Boundary items: the four options contain the SAME words in the SAME order and differ only in punctuation
(capitalization may follow a period). The blank includes the word before the mark and the word after it,
so the passage never repeats either. Offer exactly the row's four marks. "One word off" means the same
mark placed after the next word. In the two garden-path rows the blank spans three words (verb,
determiner, noun), and the two comma positions are after the verb (EARLY) and after the noun (LATE).

Noun-form items: the four options are {X, X's, Xs, Xs'} of one regular noun. In A10 and D10 the word
after the blank can be read as a verb; in C10 it IS a verb that can also be read as a noun.

Never offer a semicolon or a colon directly before and, for, but, or, nor, yet or so. Never offer both a
semicolon and a period, or both a colon and a single dash. Never offer a dash where a comma would also be
correct, or a comma where a dash would also be correct. **No count word** (a numeral, two-twelve,
several, both, a dozen, exactly, only one, a single, a lone, the sole, the only, multiple, numerous) in
the sentence just before the blank's sentence of ANY boundary or noun-form item.

## Rules for every item
**Number (agreement items)**
- Key, Near, First, After, misleader position exactly as your row says.

**Pronoun items (A6, B6, C5, D6)**
- The pronoun's antecedent is never the verb's own subject.
- MATCHED or MISMATCHED exactly as the row says.
- The antecedent sits exactly where the row says: A6 in the PREVIOUS sentence; B6 in the passage's
  FIRST sentence, two sentences before the blank's; C5 in the same clause, as the noun just before the
  blank; D6 in an opening clause of the blank's sentence. For A6 and B6 your `decider_quote` comes from
  that other sentence (the counts script checks it is NOT in the blank's sentence).
- Only its/their, it/them. Never a person pronoun, never singular "they".

**The second rule's evidence (agreement items)**
- Except A6 and B6, the decider is in the blank's own sentence and of the row's decider type. Quote it in
  `decider_quote`, name `decider_type` AND `decider_kind`, quote it in the explanation.
- Only rows whose decider type is time-clause or time-phrase may contain a time word in the blank's
  sentence (when, whenever, while, until, till, before, after, once, ago, since, "each time", "every
  time", "as" meaning while).
- **Deletion test.** Delete the decider. The item must become undecidable on the second rule.
- **Every tense decider makes the wrong tense an ERROR**, settled by a time clause, a time phrase, a
  conditional or a present-result clause. Never a modal or a second finite verb.
- **"since".** Allowed ONLY in C3 (it decides: exactly once, 5+ words after the blank, inside
  `decider_quote`, followed by a past-tense clause) and in C7 (exactly once, in a clause that belongs to
  ANOTHER verb, and NOT in `decider_quote`). Never causal "since", never "ever since".
- **Duration phrases** ("for nine seasons", "for three winters", "for two decades") are allowed ONLY in
  A5: exactly once, 5+ words after the blank, inside `decider_quote`.
- **Inferred time frames** (B2, B7, D3: closed past inferred; D2: present inferred; B3, B8: present
  result): NO year, no "ago", no "last ...", no "that year/spring", no "at the time", no "in those days",
  no when/while/before/after clause with a past verb, no "now", "currently", "today", "usually". The
  semantic check reads your blank's sentence for these and counts them as explicit cues.
- Banned ANYWHERE: "to this day", "to the present", "until now", "so far", "thus far", "to date", "up to
  now"; "for the past/last N", "in recent years/decades", "lately", "recently", "nowadays", "at present",
  "currently"; "for more than a century" and every other duration anchor outside A5; "throughout"; "on
  its own", "on their own", "by itself", "by themselves".
- "now", "still", "already", "yet", "once" may not appear in the blank's own sentence. No tense settled
  by a printed date or year.

**Options (agreement items)**
- `choices` is exactly your grid's 2x2, one lexical verb.
- No option contains a word the other three lack. A shared word appears only where the row names one.
- Key length divided by the shortest option's length is < 1.6. Across your 10, the key may be the
  uniquely longest option at most 3 times and the uniquely shortest at most 3 times.
- The key sits at your row's Letter.
- The word immediately before the blank is NOT the first word of every option; the word immediately
  after the blank is NOT the last word of every option; no option repeats the word just before the
  blank.
- No mark immediately after the blank in any agreement item, except A3 and A9 (the comma that ends the
  opening clause).

**Distractors**
- Every distractor is grammatical in isolation and wrong only in context (H5, H6).
- No answer-resolving word within 4 words after the blank.
- At most 1 of the 3 distractors strikable without reading beyond the blank's clause. Aim for 0.

**Banned traps**: literary present; singular "they"; "one" as a noun; collective nouns as the subject of
the blank; data, media; subjunctive; who/whom or any pronoun case; contractions; dictionary variants;
"one of the ... that", "none of", "neither of", "the number of", "a series of", "a pair of".

## Templates that are already live, held or spent (do not reuse any of them as a frame)
A MECHANISM may recur; a FRAME may not: the sentence skeleton, the kind of noun, the option set, and
the example sentences in this brief.
- **Every SEC26 frame** (kept, held or dropped): "Each of the [pl]" distributive subjects; a singular
  -s noun + plural phrase; possessive and object pronoun splits with the owner in an earlier clause; the
  by-agent pronoun after ", but"; the "since + past event" perfect with an attractor; past progressive
  decided by a when/while/before clause; "Whereas the [pl] ___," over a singular main clause with {was,
  were, does, do}; the restrictive "tray kept" / nonrestrictive "book, filled" participial phrases and
  their count sentences; "newspaper—the" sentence-final appositive; "catgut. The", "sight: the" and the
  shelf/layer delayed-verb boundaries; the "spray the vines" and "blasted the ridge" garden paths; the
  internal-comma semicolon series; noun forms decided by "one person / many people" sentences; "has
  never" + an intransitive participle; "were seldom" + a predicate adjective.
- **Every SEC22-SEC25 frame**: as listed in `sat-sec-v26-work/AUTHOR-BRIEF.md` ("Templates that are
  already live, held or spent"), all of which still apply. Read that section before writing.
- Punctuation already live: no mark between a long subject and its verb; a semicolon or period before a
  clause opening with a participle, that-, whether- or whatever-; ", and" / ", but" before a subordinate
  clause; "however" after a semicolon; a dash after a fronted list; a comma before a sentence-final
  absolute; a comma after a long introductory clause; "so ... that" with no mark; a colon before "one
  thing".

## Exclusion against the bank and the last five batches
Your passages and option sets must not copy any live SEC item or any SEC22-SEC26 candidate. Check with:

    cd /Users/andylee/Downloads/saas/classraum && set -a && source .env.local && set +a && node scripts/study-bank/sec27-exclusion.mjs scripts/study-bank/sat-sec-v27-work/<X>/items.json

It must exit 0 on your file. If it refuses (exit 2), report that; do not treat it as clean.

**Passage, topic, names**
- 50-90 words, 2-4 sentences, academic register, American punctuation, double quotes, exactly one
  `______` (six underscores). The blank is not always in the last sentence. B6 needs 3+ sentences (the
  antecedent two sentences back); B10 needs 3+ sentences.
- Topic area and settings: yours only (above). `topic_tag` must not repeat any v10-v26 tag. List them:

      cd /Users/andylee/Downloads/saas/classraum/scripts/study-bank && python3 -c "import json,glob;fs=glob.glob('sat-sec-hard-v1*.batch.json')+['sat-sec-hard-v2%d.batch.json'%i for i in (2,3,4,5,6)];print(sorted({i.get('topic_tag') for f in fs for i in json.load(open(f)) if isinstance(i,dict) and i.get('topic_tag')}))"

- Prefer no proper nouns; any name starts with a letter in YOUR range. Never reuse a name.

**Explanation**: 3-6 sentences. Agreement: name the true subject and why the misleader is not it; quote
the deciding word(s) for the second rule; say why EACH distractor fails, quoting it by its text.
Boundary and noun-form items: name the structure or the deciding fact and why each wrong option fails.
Never write "option B" or "choice B".

## File format
**`<X>/items.json`** is a JSON array of 10 objects:

```json
{
  "id": "SEC27X-01",
  "domain": "Standard English Conventions",
  "subskill": "form: ... | boundaries: ...",
  "difficulty": "hard",
  "passage": "... ______ ...",
  "prompt": "Which choice completes the text so that it conforms to the conventions of Standard English?",
  "choices": ["...", "...", "...", "..."],
  "correct_answer": "...",
  "explanation": "...",
  "topic_tag": "field: specific topic",
  "template": "<construction> x <what misleads> x <option grid or mark set>"
}
```

Slot X1 is id SEC27X-01, and so on to X10 = SEC27X-10. `correct_answer` is character-identical to one
entry of `choices`, at your row's Letter. `subskill` begins "boundaries: " for the boundary rows (A1, A4,
A8, B1, B5, B10, C1, C4, C9, D1, D5, D9) and "form: " for every other slot. Never put a family name,
"since", "garden", "matched", "perfect" or "split" in `subskill` (the render assertion refuses it).

**`<X>/declarations.json`** is a JSON array of 10 objects. Agreement items:

```json
{
  "id": "SEC27X-02",
  "slot": "X2",
  "frame": "...",
  "true_subject_head": "word",
  "misleader_words": ["word(s) in the passage"],
  "misleader_position": "adj | early | after",
  "key_number": "sg | pl",
  "near_noun": {"word": "...", "number": "sg | pl"},
  "first_noun_of_sentence": {"word": "...", "number": "sg | pl"},
  "after_noun_within_8": {"word": "...", "number": "sg | pl"},
  "dimension": "tense | aspect | aux | pronoun",
  "dimension_key": "present | past | perfect | non-perfect | have | do | be | sg | pl",
  "decider_type": "time-clause | time-phrase | conditional | present-result | pronoun-antecedent | aux-form | parallel-verb",
  "decider_kind": "<exactly your row's decider_kind>",
  "decider_quote": "the exact words that settle the second rule (a string or an array)",
  "words_from_blank_to_decider": 7,
  "deletion_test": "what happens when the decider is deleted",
  "pronoun_antecedent": {"word": "...", "number": "sg | pl", "distance": "same-clause | same-sentence | previous-sentence | two-back", "is_nearest_noun": false},
  "pronoun_lure": {"word": "the noun the WRONG pronoun would refer to", "number": "sg | pl", "nearest_noun_before_blank": false},
  "grid": {"code": "i|j", "forms": ["was X", "were X", "is X", "are X"]},
  "key_letter": "A | B | C | D",
  "next_four_words_after_blank": "...",
  "length_ratio": 1.23,
  "distractor_pulls": {"<distractor text>": "why a strong student would pick it (its OWN reason)"},
  "distractor_kills": {"<distractor text>": "the convention and the passage words that rule it out"},
  "hostile_reader": {"options_only_pick": "...", "heuristics_that_give_key": ["..."], "changed": "what you changed, or none"}
}
```

`pronoun_antecedent` and `pronoun_lure` only in pronoun slots; `is_nearest_noun` is true only when the
antecedent IS the declared `near_noun` (C5); `nearest_noun_before_blank` is true only when the wrong
pronoun's referent IS the noun just before the blank. `after_noun_within_8` is null only where your row's
After is `free` and there is no noun within 8 words.

Boundary and noun-form items:

```json
{
  "id": "SEC27X-01",
  "slot": "X1",
  "frame": "...",
  "key_mark": "none | comma | semicolon | colon | period | dash",
  "key_class": "pl-poss | sg-poss | pl | sg",
  "key_letter": "A | B | C | D",
  "structure": "what stands on each side of the blank, or what decides the noun form",
  "decider_kind": "<exactly your row's decider_kind>",
  "count_sentence": "two-back | later   (B10 and D10 only)",
  "decider_quote": "the exact passage words that decide it",
  "glance_fail": ["the option text(s) a test-taker can strike without parsing; at most one"],
  "distractor_pulls": {"<distractor text>": "why a strong student would pick it"},
  "distractor_kills": {"<distractor text>": "why it fails here"},
  "hostile_reader": {"options_only_pick": "...", "heuristics_that_give_key": ["..."], "changed": "what you changed, or none"}
}
```

`key_mark` on boundary items only; `key_class` on noun-form items only. Where the Decider column says
OUTSIDE the blank's sentence, the quote must come from another sentence; where it says 6+ words after the
blank, the quote's first word must be at least the 6th word after the blank.

## Loop
1. Write items in slot order. After every 2 items, save both files: disk is the only record.
2. After all 10, run the counts on your own file (batch-level quotas will flag the other authors' slots
   as missing; read your own rows):

       cd /Users/andylee/Downloads/saas/classraum && node scripts/study-bank/sec27-brief-counts.mjs scripts/study-bank/sat-sec-v27-work/<X>/items.json --decl scripts/study-bank/sat-sec-v27-work/<X>/declarations.json

   Fix every flag on YOUR ids.
3. Run the exclusion check above; it must exit 0.
4. Run both cross-item checks on the files present (they read only the authors present):

       cd /Users/andylee/Downloads/saas/classraum && node scripts/study-bank/sec27-tellsim.mjs --work scripts/study-bank/sat-sec-v27-work
       cd /Users/andylee/Downloads/saas/classraum && node scripts/study-bank/sec27-semcheck.mjs --work scripts/study-bank/sat-sec-v27-work --verbose

   With one author's 10 items some batch bars cannot be met; read the semantic check's `--verbose`
   lines for YOUR ids: any explicit time cue it found in a row that should be inferred, any count word in
   a sentence before a blank, and the shape labels it read from your options. Fix what it found.
5. Run the hostile-reader check below and fix what it finds. Then report.

## Before you finish: hostile-reader check
Be a reader who wants points WITHOUT doing the grammar. Write the results into `hostile_reader`.
1. **Options only.** Cover the passage. Can you pick or strike an option: the odd one out, the only one
   with an extra word, the longest, the only strong mark, the only unmarked one?
2. **Blank's clause only.** Can you settle the number from the word right before the blank, or the second
   rule from a word right next to it? Then the item is medium; move the evidence (H4).
3. **One cue word (H9).** Is there a single word that names the time, a count word in the previous
   sentence, or a "since" outside C3/C7? Then rewrite.
4. **Across your items.** Lay your 10 side by side. Do two share a sentence skeleton, an opening word, an
   option wording, the same blank position, the same kind of thing after the blank, the same setting? If
   yes, change one.
5. **Exclusivity.** For each distractor, write the sentence in which it WOULD be correct, then confirm
   the passage rules it out by a convention, not by meaning (H6).
6. **Be the grader.** Would a strong grader write "head noun X is plural; tense from the clause"? Would
   any grader call a distractor "plausible" rather than "strong"? Then rewrite (H1, H3).

## What happens next: one probe round
After all four authors deliver, two fresh readers answer the graders' own questions on every item and
name templates across items. You then get `sat-sec-v27-work/<X>/PROBE-FEEDBACK.json` and ONE revision
round. Every item marked `must_revise` MUST change in its words (a punctuation or whitespace edit does not
count, except on a boundary item). Keep the slot's row: same key letter, grid, key number, matched or
mismatched pronoun, decider type and decider kind. A template partner named by both readers means the
LATER slot changes its skeleton, using an unused setting from YOUR list and YOUR distractor-kill rules,
never a fix you saw another author use. Re-run the counts, the exclusion check and both cross-item checks
after revising. The freeze refuses if either cross-item check fails on the revised files.

## Process rules
- Write only inside `scripts/study-bank/sat-sec-v27-work/<X>/`. Never touch another author's folder,
  SLOTS.json, or any other file. No database writes, no git.
- NEVER run pkill, killall, kill, or any command that kills processes.
- Do not call any model API, and never use GPT or any non-Claude model.
- When done, report: the 10 ids; per slot, the key and letter; the counts script's flags on your ids
  (should be none); the exclusion result line; the semantic check's verbose lines for your ids; and any
  row you could not meet exactly, with the reason. Do not bend a row silently.
