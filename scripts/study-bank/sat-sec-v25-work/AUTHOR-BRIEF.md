# sat-sec-hard-v25 author brief (Digital SAT Standard English Conventions, HARD)

You are author **X**, where X is A, B, C or D; your run prompt says which. You write **8** Digital SAT
Reading & Writing **Standard English Conventions** items, every one aimed at **hard**. Each item is one
of your 8 slots in the tables below. The pre-registration is
`scripts/study-bank/PREREG-SEC25-2026-10-23.md`. You do not need to read it: everything you must follow
is in this file. Read the whole file before writing anything.

Repo root: `/Users/andylee/Downloads/saas/classraum`. Write ONLY these two files:
- `scripts/study-bank/sat-sec-v25-work/<X>/items.json`
- `scripts/study-bank/sat-sec-v25-work/<X>/declarations.json`

## What the grader panel actually rewards (read this first)
Three independent graders grade every item. An item counts only if the MEDIAN grader calls it hard.
Across the last three batches (SEC22-24, 72 items) the panel called 22 items hard and 49 medium. Their
per-item notes on the two groups differ in eight concrete ways. These are the rules of this brief; the
tables below exist to make room for them.

**H1. Every wrong option is strong on its own.** 18 of the 22 panel-hard items had
`distractor_quality: strong` from ALL THREE graders. **0 of the 49 medium items did.** "Strong" in the
notes always meant the wrong option has its own reason to be picked, beyond agreeing with a nearby noun:
- "'does' is the strongest distractor because 'X does too' is the default ellipsis in speech"
- "'were forfeit' is doubly attractive: it matches 'shelves' and looks like a subjunctive"
- "'are not' tempts as a generic negative"; "'are' tempts because comparisons often end in a form of be"
- "'them' is attractive because plural pastures / plural verb invite a plural pronoun, and 'grass'
  pulls toward 'is'"

Medium notes say instead: "'are sealed' is right on number but wrong on tense" — a wrong option whose
only role is to fill the grid. **For each of your three wrong options, write in `distractor_pulls`
the reason a strong student would choose it. If the only reason is "it fills the 2x2", change the
item.**

**H2. Two rules that interact, not two rules side by side.** The one hard pronoun item (SEC24A-02
below) puts the verb's number and the pronoun's number on DIFFERENT nouns in DIFFERENT clauses, and
each of its three wrong options has its own pull: the noun next to the blank pulls the verb, the verb's
own plural subject pulls the pronoun, and the true antecedent sits in the previous clause. Three pronoun
items came out medium because the pronoun simply copied the verb's subject ("a compound joined by 'and'
takes 'have' and the plural 'their'"; "plural 'pigments' takes 'match', and the comparison needs plural
'those'"). **Splitting alone was not enough:** three split items also came out medium, where the wrong
pronoun had no believable referent ("'their' tempts by echoing 'tablets', but no plural antecedent owns
the record") or the split was visible next to the blank. In every pronoun slot here the pronoun and the
verb take different nouns (the table says which), AND each wrong pronoun must point at a real noun of
its number that a hurried reader would accept.

**H3. The number is not found by "skip the modifier, find the head".** Of v24's eight agreement items
whose subject was a plain head plus an attracting phrase, six came out medium, and most of their notes
opened the same way: "Head noun 'Samples' is plural", "Head noun 'practice' is singular", "Plural head
'measurements'". The two exceptions each had a second source of difficulty: SEC24A-02's split pronoun
(H2), and SEC24A-03's attractor "the esophagus and stomach", a compound that reads as a compound
subject, with a conditional deciding the tense (H4). The other hard subjects were ones whose number
follows a rule the student must know ("Harvest after harvest", "Many a", "Everything", "The latter",
"All that survives") or a subject displaced from where the verb expects it (inverted, fronted, elided).
Where your row gives a plain head, the difficulty must come from H2 or H4, never from the attractor
alone.

**H4. The second rule's evidence is five or more words from the blank and needs parsing.** Hard notes:
"the deciding time phrase sits well past the blank"; "is/are fail only once the solver finds 'stop',
seven words on"; "do/does only fail once 'grown' is reached". In v24, items whose tense was read off a
when/until/as/before clause went 0 hard of 5; first-conditional and habitual if/unless clauses went 2
of 3; the definite-past "ago" phrase 1 of 1; the auxiliary forced by an elided verb 3 of 3 across
v23-v24.

**H5. Nothing is strikable at a glance and nothing resolves next to the blank.** 20 of the 22 hard items
had `n_struck` 0 from every grader. Items with two at-a-glance strikes are DROPPED by the gate.

**H6. Wrong only by rule.** Every item the gate dropped for a second defensible answer was decided by
MEANING: active vs passive, simple vs progressive, a "that" that could attach to two nouns. Each wrong
option must be an error a copy editor would mark, under one named convention.

**H7. A punctuation or noun-form item is hard only when another sentence decides it.** The two
panel-hard boundary items (SEC24C-08 below, and SEC23C-08, dropped for its option set) both needed a
count from a different sentence ("three translators", "three engravers"), and their lures (comma pair,
dash pair) are correct punctuation in some other sentence. Boundary items decided inside their own
clause (indirect question, two clauses, compound predicate, participial phrase, introductory phrase)
went 0 hard of 10.

**H8. No template across the batch.** When two or more graders call items "one template", the batch
keeps ONE of them and holds the rest. In v24 the graders named all pronoun grids as one template and
four "head of an of-phrase + tense set by a later clause" items as another; 9 items were held. The table
gives every slot a different construction, option shape and decider; you must also keep your passages
from sharing a sentence skeleton, an opening, or a blank position.

### Four items the panel kept as hard (frames are now spent; learn the features, never the frame)
**SEC24A-02** (all three: hard, strong, n_struck 0)
> Mixed meadows attract the field vole; pastures thick with a single coarse grass ______ almost
> entirely, because such a uniform sward offers poor cover and little food. Small-mammal surveys on dairy
> farms find the same contrast again and again. Farmers who want to keep voles away from stored hay
> sometimes sow that grass along field margins for exactly this reason.

Options: are avoided by it / is avoided by them / is avoided by it / are avoided by them. Key: are
avoided by it. Grader e: "Two decisions: verb agrees with plural 'pastures' (are), pronoun refers to
singular 'the field vole' (it). 'grass' sits right before the blank and pulls to 'is'; 'them' tempts by
matching pastures." (H1, H2: three pulls, two clauses.)

**SEC24A-04** (hard x3)
> Harvest after harvest ______ on the steep, eroded terraces of one mountain valley some sixty years ago.
> Agronomists who study soil loss often cite the valley as a warning. ...

Options: has been meager / was meager / have been meager / were meager. Key: was meager. Grader d:
"'Harvest after harvest' takes a singular verb, and 'some sixty years ago' rules out the present
perfect ... the deciding time phrase sits well past the blank." (H3 rule-number subject, H4.)

**SEC24B-01** (hard x3)
> ... Basalt resists the pressure of the expanding ice in such trials, whereas several kinds of quarried
> sandstone ______.

Options: is not / do not / does not / are not. Key: do not. Grader f: "Ellipsis of 'resist' needs
do-support, and the head 'kinds' is plural: 'do not'. 'does not' attracts via 'sandstone' and the
parallel singular 'Basalt resists'; 'is/are not' fail because the antecedent is a lexical verb." (H1:
every wrong option has its own pull; H4: the decider is the other clause's verb.)

**SEC24C-08** (hard x3, n_struck 1)
> Three translators shared the work on the first English edition of a long nineteenth-century novel,
> dividing its chapters roughly into thirds. Reviewers were divided about the result, but they agreed
> in praising the chapters by the ______ for their ease and wit. ...

Options: translator, Ruiz, / translator—Ruiz— / translator, Ruiz— / translator Ruiz. Key: translator
Ruiz. Grader e: "With three translators, 'Ruiz' is restrictive (identifies which one), so no
punctuation. Commas and paired dashes would imply a single translator." (H7.)

### Three items the panel called medium, and why
- **SEC24B-04**: "Samples of the deepest core ______ in insulated canisters until a supply ship reached
  the drilling camp" (were sealed). All three: "Head noun 'Samples' is plural; 'until ... reached'
  requires the past. 'core' adjacent draws 'was sealed'." One attractor, one clause, a filler distractor.
- **SEC24C-04**: "The pigments of the smallest copy ______ of the two larger copies" (match those).
  "Plural 'pigments' takes 'match', and the comparison needs the plural 'those'." The pronoun copies
  the verb's subject (fails H2).
- **SEC24A-07** (boundary): "...whether the stored vaccines had warmed past eight degrees ______ answer
  came..." (Celsius. Their). "An indirect question inside a statement ends with a period." Decided
  inside its own sentence (fails H7).

## Before each item: the self-test (write it into the declarations)
1. Name the deciding word(s) for each rule and count the words from the blank (H4).
2. For each wrong option, write the reason a strong student picks it (`distractor_pulls`, H1). It must
   be its OWN reason. "It agrees with the noun before the blank" may be the reason for at most one of
   the three.
3. Cover the passage: can you strike any option from its form alone (H5)? Is any option ungrammatical
   in isolation? Then change the option set within the row.
4. Write the sentence in which each wrong option WOULD be correct, and the convention that rules it out
   here (H6).
5. Would a grader call this "head noun X is plural, tense from the clause"? Then you have written a
   medium item. Move evidence, not the count on paper.

The declarations are wording discipline. They prove nothing about difficulty: an author declares what
it already believes. A probe reader and then the panel decide.

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

Pronoun grids cross the verb's number with the pronoun's number, one verb form:
- `d+p` possessive: {has filled its, have filled its, has filled their, have filled their}
- `d+p` object: {has kept it, have kept it, has kept them, have kept them}
- `a+p` object: {visits it, visit it, visits them, visit them}; `a+p` possessive: {guards its, guard its, guards their, guard their}
- `b+p` possessive / object: {is tending its, are tending its, ...} / {is checking it, are checking it, ...}
- `g+p` possessive / object: {was posting its, were posting its, ...} / {was wrapping it, were wrapping it, ...}
- `i+p` possessive: {was its, were its, was their, were their}
- `h+p` object (passive + by): {was abandoned by it, were abandoned by it, was abandoned by them, were abandoned by them}

Ellipsis grids carry a shared "not" in all four options: `m|n + not` {does not, do not, has not, have
not}; `i|m + not` {was not, were not, does not, do not}; `i|n + not` {was not, were not, has not, have
not}; `j|n + not` {is not, are not, has not, have not}. The bare grids `i|n`, `m|n`, `j|m` and `i|j`, and
`j|m + not`, are identical to items already in the bank, so they are never used here.

Voice is the same in all four options of every grid. Progressive is the same in all four. Never mix.

**Shared complement word (A1, B6, C3, D5).** These grids carry one word shared by all four options after
the verb. It is an adjective or noun that does not end in -ed or -en and is not an -ly word, and it must
differ from every other author's. Never repeat it in the passage next to the blank.

## Agreement slots (write ONLY your own)
Column meanings:
- **Key**: the verb's number. **Pron**: the key pronoun's number (pronoun slots).
- **Near**: the number of the noun immediately before the blank (one of the 4 words before it).
- **Pos**: where the misleader sits: `adj` immediately before the blank; `early` earlier in the
  sentence; `self` the subject word itself; `after` after the blank.
- **First**: the first noun of the blank's SENTENCE against the key: `agr` same number, `opp` other.
- **After**: the first noun within 8 words after the blank: `opp` the wrong number (never within 4
  words if it would resolve the item), `agr`, `free`.
- **Decider type** goes in `decider_type`: time-clause, time-phrase, conditional, pronoun-antecedent,
  aux-form or parallel-verb (the last only for an auxiliary copied from another clause).
- **Letter**: where the key sits in `choices` (A = first).
- **Lever**: which of H1-H7 must carry the difficulty in this slot. It is not optional.

| Slot | Frame (the number construction) | Misleader | Pos | Key | Near | First | 2nd dim: key | Decider (inside the blank's sentence) | Decider type | Grid | Key form | Letter | After | Lever |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A1 | "cattle" as the subject (a plural noun with no -s; never livestock, poultry, people, police) + a prepositional phrase ending on a plural noun | no -s: reads as a mass noun | self | pl | pl | agr | tense: present | a "provided that" clause with a present verb, 5+ words after the blank | conditional | i\|j + word | are + word | C | opp | H3, H4; the past option needs its own pull |
| A2 | "Each [sg] and [sg]" + a phrase ending on a plural noun ("Each graft and cutting in the glasshouse beds"): singular verb | "and" reads plural; the adjacent plural | self | sg | pl | agr | tense: past | a before-clause with a past verb, 5+ words after | time-clause | b\|g | was V-ing | A | opp | H3 |
| A3 | A singular head with a NUMERAL compound modifier + of + plural ("A three-week trial of the two vaccines"); the head is never a quantity or container word (number, total, sack, crate, sample, set, series, pair, group) | the numeral and the adjacent plural | adj | sg | pl | agr | aspect: past | a definite-past time PHRASE 5+ words after the blank, not "ago", no year ("during the first winter of the trial") | time-phrase | e\|h | was V-en | D | free | H4 |
| A4 | Ellipsis in a sentence-final "though"-clause. Clause 1 has a SINGULAR subject and a present perfect ("One hedge variety has resisted the blight"); the though-clause has a plural subject and ends with the blank | clause 1's singular subject and its "has" | early | pl | pl | opp | aux: have | clause 1's perfect auxiliary (a lexical verb would need "do") | parallel-verb | m\|n + not | have not | B | free | H1 ("do not" is the speech default), H4 |
| A5 | Possessive split. An opening because-clause names the SINGULAR owner; the plural main subject is a head + phrase ending on a singular noun; the blank holds verb + its/their | the adjacent singular pulls the verb; the plural verb pulls "their" | adj | pl | sg | opp | pronoun: sg | the because-clause's singular noun is the only possible owner | pronoun-antecedent | d+p possessive | have V-en its | A | free | H2 |
| A6 | Object pronoun. Clause 1, before a semicolon, has the SINGULAR noun the pronoun refers to; clause 2's plural subject + a phrase ending on a singular noun + the blank | the adjacent singular; the plural verb pulls "them" | adj | pl | sg | opp | pronoun: sg | clause 1's singular noun is the only possible referent | pronoun-antecedent | a+p object | V it | D | free | H2 |
| A7 | A singular head + a comma-set appositive (never "or") ending on a plural noun, then the blank, then a commaless adverbial of 3+ words and the past participle of a verb that can be neither passive nor adjectival (recurred, vanished, arrived, occurred, existed): "The lesion, a cluster of tiny blisters, ___ in all likelihood never recurred" | the adjacent plural | adj | sg | pl | agr | aux: have | the participle 5+ words after the blank ("is ... recurred" is ungrammatical) | aux-form | j\|n | has | B | free | H4 |
| B1 | A singular noun whose singular simply ends in -s (lens, atlas, census, iris, canvas, corpus; never an -ics word, a disease name, an invariant noun such as series, species or means, or a plural-form noun such as news) + a phrase ending on a plural noun | the -s ending and the adjacent plural | self | sg | pl | agr | tense: present | a first-conditional "if"-clause with a present verb, 5+ words after | conditional | c\|h | is V-en | B | free | H3, H4 |
| B2 | A PLURAL head + a "from [X] to [singular Y]" range phrase ("The pipelines from the offshore field to the terminal") | the adjacent singular | adj | pl | sg | agr | aspect: past | a definite-past time phrase 5+ words after (not "ago", no year) | time-phrase | f\|g | were V-ing | D | opp | H4 |
| B3 | A singular head + a subject relative clause whose OBJECT is plural ("The probe that sampled the comet's dust jets"); the relative clause has no subject of its own | the adjacent plural | adj | sg | pl | agr | tense: present | a while-clause with a present verb, 5+ words after | time-clause | k\|l | is being V-en | A | free | H1 (the past option needs its own pull) |
| B4 | Possessive split. Clause 1, then ", and" clause 2. Clause 1's SINGULAR subject owns; clause 2's plural subject + a phrase ending on a plural noun + the blank | clause 1's singular subject pulls the verb; the plural verb pulls "their" | early | pl | pl | opp | pronoun: sg | clause 1's subject is the only possible owner | pronoun-antecedent | b+p possessive | are V-ing its | C | agr | H2 |
| B5 | Cataphoric ellipsis. An OPENING although-clause, "Although the [singular NP] ___," whose elided verb is the LATER main clause's lexical verb; the main clause has a plural subject ("Although the eastern quarry ___, the western quarries supply most of the city's marble.") | the plural main subject and its verb after the blank | after | sg | sg | agr | aux: do | the main clause's lexical verb, 5+ words after the blank | parallel-verb | i\|m + not | does not | D | opp | H1, H4 (a reader must hold the blank open until the verb arrives) |
| B6 | A singular head + a phrase ending on a plural noun ("The signal from the twin gauges") | the adjacent plural | adj | sg | pl | agr | tense: past | a habitual "each time"-clause with a past verb, 5+ words after | time-clause | i\|j + word | was + word | A | free | H1, H4 |
| B7 | Object pronoun. An opening infinitive phrase of purpose holds the SINGULAR antecedent ("To protect the dome, ..."); a plural subject + the blank | the singular object of the infinitive pulls the verb; the plural subject pulls "them" | early | pl | pl | opp | pronoun: sg | the infinitive's singular object is the only possible referent | pronoun-antecedent | g+p object | were V-ing it | C | free | H2 |
| C1 | A compound subject "the [sg] and the [sg]" (two determiners, two things) + a phrase ending on a singular noun ("The organ and the choir screen of the chapel") | the adjacent singular; the singular first noun | adj | pl | sg | opp | tense: present | a first-conditional "unless"-clause with a present verb, 5+ words after | conditional | b\|g | are V-ing | D | free | H3 (first and nearest noun both singular), H4 |
| C2 | A singular head + an "among" phrase ending on a plural noun ("The rivalry among the city's guilds") | the adjacent plural | adj | sg | pl | agr | tense: present | an after-clause with a present (habitual) verb, 5+ words after | time-clause | c\|h | is V-en | C | opp | H1 |
| C3 | A singular head + a "by" phrase naming plural makers ("The altarpiece by the two brothers") | the adjacent plural | adj | sg | pl | agr | aspect: past | a definite-past time phrase 5+ words after (not "ago", no year) | time-phrase | i\|r + word | was + word | B | free | H4 |
| C4 | Possessive split. An OPENING prepositional phrase names the SINGULAR owner ("At the abbey of [place], ..."); a plural subject + the blank | the singular owner pulls the verb; the plural subject pulls "their" | early | pl | pl | opp | pronoun: sg | the opening phrase's singular noun is the only possible owner | pronoun-antecedent | i+p possessive | were its | A | free | H2 |
| C5 | Object pronoun. An opening because-clause holds the PLURAL antecedent; a singular subject + the blank | the plural antecedent pulls the verb | early | sg | sg | opp | pronoun: pl | the because-clause's plural noun is the only possible referent | pronoun-antecedent | d+p object | has V-en them | B | free | H2 |
| C6 | Be-ellipsis, sentence-final, the two clauses joined by a SEMICOLON. Clause 1 has a SINGULAR subject + past "was [adjective]"; clause 2 a plural head + a phrase ending on a singular noun + the blank ("The nave was intact; the timber roofs of the chapter house ___.") | clause 1's singular; the adjacent singular | adj | pl | sg | opp | aux: be | clause 1's "was" + adjective ("have not" would need a participle) | parallel-verb | i\|n + not | were not | D | free | H1, H4 |
| C7 | By-agent object pronoun. Clause 1, before ", but", has a PLURAL agent; clause 2's singular subject + a phrase ending on a plural noun + the blank (a passive + by it/them) ("Swallows nest under the eaves each spring, but the bell tower beside the abbey fields ___ entirely.") | the adjacent plural pulls the verb; the singular subject pulls "it" | adj | sg | pl | opp | pronoun: pl | clause 1's plural agent is the only possible "by"-agent | pronoun-antecedent | h+p object | was V-en by them | A | free | H2 (the mechanism of SEC24A-02; the frame must differ) |
| D1 | Be-ellipsis with a "the + adjective" plural subject, after ", but": "Younger residents are eligible at the start, but the elderly in the coastal towns ___." | "the elderly" has no -s | self | pl | pl | agr | aux: be | clause 1's "are" + adjective | parallel-verb | j\|n + not | are not | A | free | H3, H4 |
| D2 | Possessive split. The opening clause, before a semicolon, ends with the PLURAL owner; a singular subject + the blank | the plural owner pulls the verb | early | sg | sg | opp | pronoun: pl | clause 1's plural noun is the only possible owner | pronoun-antecedent | a+p possessive | V-s their | C | free | H2 |
| D4 | A PLURAL head + a phrase ending on a singular noun ("Applications from the county's largest employer") | the adjacent singular | adj | pl | sg | agr | aspect: past | a habitual-past "if"-clause with a past verb, 5+ words after | conditional | e\|h | were V-en | D | free | H1, H4 |
| D5 | An opening prepositional phrase with a singular noun ("For the harbor commission, ..."), then a plural subject + a phrase ending on a plural noun + the blank | the opening singular | early | pl | pl | opp | aspect: past | a habitual-past "unless"-clause with a past verb, 5+ words after | conditional | i\|r + word | were + word | A | opp | H4 |
| D6 | Object pronoun. Clause 1, then ", so" clause 2. Clause 1's OBJECT is the PLURAL antecedent; clause 2's singular subject + the blank ("The district bought two buses, so the mechanic at the depot ___ daily.") | the plural antecedent pulls the verb | early | sg | sg | opp | pronoun: pl | clause 1's plural object is the only possible referent | pronoun-antecedent | b+p object | is V-ing them | B | free | H2 |
| D7 | Possessive split. Clause 1, before ", but", has the PLURAL owner; a singular subject + the blank | the plural owner pulls the verb | early | sg | sg | opp | pronoun: pl | clause 1's plural noun is the only possible owner | pronoun-antecedent | g+p possessive | was V-ing their | D | free | H2 |

## Non-agreement slots (write ONLY your own)
For the boundary slots the four options contain the SAME words in the SAME order and differ only in
punctuation (capitalization may follow a period or question mark). The blank includes the word before
the mark and the word after it, so the passage never repeats either. Offer exactly the row's four
marks. "One word later" means the same mark misplaced by one word; it is the row's one at-a-glance
option.

| Slot | Shape | Key | The four options | Lures that must tempt | At a glance (max 1) | Letter | Decider (`decider_quote`) |
|---|---|---|---|---|---|---|---|
| A8 | A sentence-final RESTRICTIVE participial phrase. ANOTHER sentence establishes that there are several sets of the noun, so the phrase is needed to say which one ("Three sets of soil cores came back from the survey. ... The lab retested only the ___ near the outfall" with "cores collected") | no mark | no mark, comma, dash, comma one word later | the comma; the dash (both nonrestrictive) | the misplaced comma | C | the other sentence's fact (must sit OUTSIDE the blank's sentence) |
| B8 | Two independent clauses. The second opens with a NOUN PHRASE that reads as an appositive of the first clause's last noun until its verb arrives 6+ words later ("cooled into a hard ___ thin film of green algae from the crater rim spread across it within a decade" with "crust; a"). The second clause is a later event, not an explanation, so a colon is wrong | semicolon | semicolon, comma, no mark, colon | the comma (appositive reading) | none | B | the second clause's verb (6+ words after the blank) |
| C8 | A PLURAL POSSESSIVE noun. ANOTHER sentence establishes that there are several owners ("Two cartographers mapped the coast"); the noun after the blank can also be read as a verb ("notes", "records", "plans", "surveys"), so the plain plural reads at first as subject + verb | Xs' | X, X's, Xs, Xs' (one regular noun) | the plain plural (garden path); the singular possessive | at most one | C | the other sentence's fact (OUTSIDE the blank's sentence) |
| D3 | A DIRECT question reported after a colon, ending mid-passage; the next sentence follows ("...one blunt question: where would the new school ___ answer took a decade" with "go? The"). The question must be direct (an inverted auxiliary). The next sentence's first word must be plausible in lower case mid-sentence (the, their, its, most) | question mark + capital | question mark + capital, period + capital, comma + lower case, no mark + lower case | the period (reads as a reported question); the comma | none | B | the inverted auxiliary that makes it direct |
| D8 | A SINGULAR POSSESSIVE noun. ANOTHER sentence establishes that there is exactly one owner ("Only one mapmaker charted the delta"); the noun after the blank can also be read as a verb | X's | X, X's, Xs, Xs' (one regular noun; never C8's noun) | the plural possessive; the plain singular (garden path) | at most one | C | the other sentence's fact (OUTSIDE the blank's sentence) |

Never offer a semicolon or a colon directly before and, for, but, or, nor, yet or so. Never offer both
a semicolon and a period, or both a colon and a single dash.

## Rules for every item
**Number (agreement items)**
- Key, Near, First, misleader position and After exactly as your row says. Where Near agrees with the
  key, the misleader must still tempt from its own position.

**The second rule stays inside the blank's sentence (agreement items)**
- The decider is in the blank's own sentence and is of the row's decider type. Quote it in
  `decider_quote`, name the type in `decider_type`, quote it in the explanation.
- Only rows whose decider type is time-clause or time-phrase may contain a time word in the blank's
  sentence (when, whenever, while, until, till, before, after, once, ago, "each time", "every time",
  "as" meaning while).
- **Deletion test.** Delete the decider. The item must become undecidable on the second rule: no other
  sentence may settle it. Write the result in `deletion_test`.
- **Every tense decider makes the wrong tense an ERROR.** Tense and aspect are settled only by a time
  clause, a time phrase or a conditional. Never a modal ("will", "would") or a second finite verb.
- Banned ANYWHERE in your passages: "since" in any sense (write "because"); "to this day", "to the
  present", "until now", "so far", "thus far", "to date", "up to now"; "for the past/last N", "in recent
  years/decades", "lately", "recently", "nowadays", "at present", "currently"; duration anchors ("for
  more than a century", "for decades", "over the past ...", "throughout", "across those decades"); "on
  its own", "on their own", "by itself", "by themselves".
- "now", "still", "already", "yet", "once" may not appear in the blank's own sentence (not even "yet" as
  a conjunction: the counts script cannot tell them apart). No tense settled by a printed date or year.

**Options (agreement items)**
- `choices` is exactly your grid's 2x2, one lexical verb.
- No option contains a word the other three lack: no adverb, no "had", "would", "will" or other modal,
  no odd auxiliary. A shared word appears only where the grid names one (the shared complement, "not"
  in the four ellipsis rows A4/B5/C6/D1, "by" in C7, the pronoun).
- Pronoun slots: only the pronouns your grid names (its/their, it/them). Never a person pronoun, never
  singular "they".
- Key length divided by the shortest option's length is < 1.6. Across your 8, the key may be the
  uniquely longest option at most 2 times and the uniquely shortest at most 2 times.
- The key sits at your row's Letter. Order the other three so that no fixed pattern appears.
- The word immediately before the blank is NOT the first word of every option; the word immediately
  after the blank is NOT the last word of every option; no option repeats the word just before the
  blank.
- No mark immediately after the blank in any agreement item, except B5 (the comma that ends its
  opening clause).

**Distractors**
- Every distractor is grammatical in isolation and wrong only in context (H5, H6).
- No answer-resolving word within 4 words after the blank.
- At most 1 of the 3 distractors strikable without reading beyond the blank's clause. Aim for 0.

**Banned traps**: literary present; singular "they"; "one" as a noun; collective nouns (team, committee,
family, crew, herd, flock as the subject of the blank); data, media; subjunctive ("insist/require that");
who/whom or any pronoun case; contractions; dictionary variants; "one of the ... that", "none of",
"neither of", "the number of", "a series of", "a pair of".

## Templates that are already live, held or spent (do not reuse any of them as a frame)
- **Every SEC24 frame**: foreign plural standing alone; plural head + postposed adjective phrase with a
  by-agent pronoun after a semicolon; singular head + of + a compound of two singulars; "N after N";
  "the X and its Y" + "own"; ", and [sg] ___ too"; indirect question + period; sentence-final -ing
  phrase + comma; "several kinds of [mass noun]" in a whereas-ellipsis; a parenthesis listing parts;
  deverbal head + of + by; container head + of; a fronted wherever-clause + object pronoun; a non-of
  locative phrase + "not, as ..., [participle]"; a semicolon before a clause opening with a
  prepositional phrase; a compound predicate with no comma; an indefinite pronoun + phrase; of + gerund;
  an opening concessive clause before a plural subject; "those of" comparison; ", so ... are its only
  record"; a direct question with do-support inversion after a colon; a comma after an opening
  infinitive of purpose; a restrictive appositive role + name.
- **Every SEC23 frame**: "many a"; a singular term + ", or [gloss],"; "All that survives/remains of";
  a clause-final "than the [pl] do"; "So + adverb" inversion; a topicalized fronted object; a split
  antecedent (singular head + plural of-phrase, the pronoun takes the of-noun); an absolute phrase
  between subject and verb; comma before coordinating "for"; no mark in "both X and Y"; "the former";
  a semicolon before a quantifier-pronoun clause; a colon before a final appositive list; "Adj as +
  subject + verb"; "Rarely/Seldom" inversion; "more Xs than a single Y"; "Of greater concern ... is";
  "Y, not X,"; ", the largest of which"; ", which" after "both the X and the Y"; a content clause in the
  subject + possessive; one-referent compounds ("the founder and first director"); a dash pair around a
  list between subject and verb.
- **SEC22 and earlier**: "as well as" and every pseudo-coordination interrupter (along with, together
  with, with, rather than, in addition to, like/unlike, including, such as, plus); "a number of";
  plural-form singular nouns (-ics, rickets) and titles; object relatives; "whose" relatives; "which"
  with a whole-clause antecedent; a relative clause with its own subject inside the subject; "between X
  and Y"; possessive attractors ("[pl]' [sg]"); comment clauses inside the subject; adverbial clauses
  between subject and verb; stacked prepositional phrases; infinitive modifiers; reduced participial
  relatives; the second verb of a compound predicate (as an agreement item); "nor" inversion; "the
  latter"; the comparative correlative; fronted participle inversion.
- **Every inversion family** (Only, nor, Not until, So/Such, fronted adjective or participle,
  locative, here/there, as/than + auxiliary, Had/Should/Were); quantifier heads (fractions, most/some/
  all of, a total of, a variety of, the majority of, more than one, the rest of); either/or,
  neither/nor and plain "or" proximity; clause, gerund or infinitive subjects; expletive "there";
  floating "each"; it-clefts; "the only one of"; "every X and every Y" and single-"every" compounds.
- Punctuation already live: no mark between a verb and its delayed object; no mark between a long
  subject and its verb; a semicolon or period before a clause opening with a participle, that-,
  whether- or whatever-; ", and" / ", but" before a subordinate clause; "however" after a semicolon; a
  dash after a fronted list; a comma before a sentence-final absolute; a comma after a long introductory
  clause; "so ... that" with no mark; a colon before "one thing".

## Exclusion against the bank and the last three batches
Your passages and option sets must not copy any live SEC item or any SEC22, SEC23 or SEC24 candidate
(kept, held or dropped). The rule (v22 Amendment 2): an item is changed before delivery, and HELD if
still flagged at freeze, when its passage word-trigram Jaccard is >= 0.20 with any of them, or its
option set is identical as strings to one of theirs. Check with:

    cd /Users/andylee/Downloads/saas/classraum && set -a && source .env.local && set +a && node scripts/study-bank/sec25-exclusion.mjs scripts/study-bank/sat-sec-v25-work/<X>/items.json

It must exit 0 on your file. If it refuses (exit 2), report that; do not treat it as clean.

**Passage, topic, names**
- 50-90 words, 2-4 sentences, academic register, American punctuation, double quotes, exactly one
  `______` (six underscores). The blank is not always in the last sentence.
- Topic area by author: A life sciences, medicine, agriculture; B earth, space and physical sciences,
  engineering; C history, the arts, humanities; D social sciences (economics, linguistics, psychology,
  education, urban studies, political science).
- `topic_tag` must not repeat any v10-v24 tag. List them with:

      cd /Users/andylee/Downloads/saas/classraum/scripts/study-bank && python3 -c "import json,glob;fs=glob.glob('sat-sec-hard-v1*.batch.json')+['sat-sec-hard-v22.batch.json','sat-sec-hard-v23.batch.json','sat-sec-hard-v24.batch.json'];print(sorted({i.get('topic_tag') for f in fs for i in json.load(open(f)) if isinstance(i,dict) and i.get('topic_tag')}))"

- Prefer no proper nouns; use a role ("one ecologist"). Any name you use starts with a letter in YOUR
  range: A: A-F, B: G-L, C: M-R, D: S-Z. Never reuse a name across your items.

**Explanation**: 3-6 sentences. Agreement: name the true subject and why the misleader is not it; quote
the deciding word(s) for the second rule; say why EACH distractor fails, quoting it by its text.
Boundary and noun-form items: name the structure or the deciding fact and why each wrong option fails.
Never write "option B" or "choice B".

## File format
**`<X>/items.json`** is a JSON array of 8 objects:

```json
{
  "id": "SEC25X-01",
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

Slot X1 is id SEC25X-01, and so on to X8 = SEC25X-08. `correct_answer` is character-identical to one
entry of `choices`, at your row's Letter. `subskill` begins "boundaries: " for A8, B8 and D3 and
"form: " for every other slot.

**`<X>/declarations.json`** is a JSON array of 8 objects. Agreement items:

```json
{
  "id": "SEC25X-01",
  "slot": "X1",
  "frame": "...",
  "true_subject_head": "word",
  "misleader_words": ["word(s) in the passage"],
  "misleader_position": "adj | early | self | after",
  "key_number": "sg | pl",
  "near_noun": {"word": "...", "number": "sg | pl"},
  "first_noun_of_sentence": {"word": "...", "number": "sg | pl"},
  "after_noun_within_8": {"word": "...", "number": "sg | pl"},
  "dimension": "tense | aspect | aux | pronoun",
  "dimension_key": "present | past | non-perfect | have | do | be | sg | pl",
  "decider_type": "time-clause | time-phrase | conditional | pronoun-antecedent | aux-form | parallel-verb",
  "decider_quote": "the exact words in the blank's sentence that settle the second rule (a string or an array)",
  "words_from_blank_to_decider": 7,
  "deletion_test": "what happens when the decider is deleted",
  "pronoun_antecedent": {"word": "...", "number": "sg | pl"},
  "grid": {"code": "i|j", "forms": ["was X", "were X", "is X", "are X"]},
  "key_letter": "A | B | C | D",
  "next_four_words_after_blank": "...",
  "length_ratio": 1.23,
  "distractor_pulls": {"<distractor text>": "why a strong student would pick it (its OWN reason)"},
  "distractor_kills": {"<distractor text>": "the convention and the passage words that rule it out"},
  "hostile_reader": {"options_only_pick": "...", "heuristics_that_give_key": ["..."], "changed": "what you changed, or none"}
}
```

`near_noun.word` is one of the 4 words just before the blank. `pronoun_antecedent` only in pronoun
slots. `first_noun_of_sentence` is the first noun of the whole sentence that contains the blank, even in
an opening clause. Write `after_noun_within_8` as null if there is none. Grid codes as in the tables
(the pronoun grids as "d+p", "a+p", "b+p", "g+p", "i+p", "h+p").

Boundary and noun-form items (A8, B8, C8, D3, D8):

```json
{
  "id": "SEC25X-08",
  "slot": "X8",
  "frame": "...",
  "key_mark": "none | semicolon | question",
  "key_class": "pl-poss | sg-poss",
  "key_letter": "A | B | C | D",
  "structure": "what stands on each side of the blank, or what decides the noun form",
  "decider_quote": "the exact passage words that decide it (see the table's last column)",
  "glance_fail": ["the option text(s) a test-taker can strike without parsing; at most one"],
  "distractor_pulls": {"<distractor text>": "why a strong student would pick it"},
  "distractor_kills": {"<distractor text>": "why it fails here"},
  "hostile_reader": {"options_only_pick": "...", "heuristics_that_give_key": ["..."], "changed": "what you changed, or none"}
}
```

`key_mark` on boundary items only; `key_class` on C8 and D8 only.

## Loop
1. Write items in slot order. After every 2 items, save both files: disk is the only record.
2. After all 8, run the counts on your own file (it will flag the other authors' slots as missing from
   batch-level quotas; read your own rows):

       cd /Users/andylee/Downloads/saas/classraum && node scripts/study-bank/sec25-brief-counts.mjs scripts/study-bank/sat-sec-v25-work/<X>/items.json --decl scripts/study-bank/sat-sec-v25-work/<X>/declarations.json

   Fix every flag on YOUR ids (table row, grid, pronoun class, letter, option marks, noun forms,
   decider type, decider not in its sentence, distractor_pulls, shared word, banned words, length).
3. Run the exclusion check above; it must exit 0.
4. Run the hostile-reader check below and fix what it finds. Then report.

## Before you finish: hostile-reader check
Be a reader who wants points WITHOUT doing the grammar. Write the results into `hostile_reader`.
1. **Options only.** Cover the passage. Can you pick or strike an option: the odd one out, the only one
   with an extra word, the longest, the only strong mark, the only unmarked one?
2. **Blank's clause only.** Read only the clause with the blank. Can you settle the number from the word
   right before the blank, or the second rule from a word right next to it? Then the item is medium;
   move the evidence (H4).
3. **The named heuristics, across your agreement items.** Apply each blindly and count the keys it gets:
   (a) the number opposite the noun right before the blank; (b) agree with the first noun of the
   sentence; (c) find a when/while/until/before clause and copy its tense (only your time rows may
   need it); (d) the option with an extra word loses; (e) "been" or "being" loses; (f) in pronoun items,
   the verb and pronoun share a number (they never do in this batch: every pronoun slot is split). If
   one gets all but one of your agreement items, change an item, not the count on paper.
4. **Across items.** Lay your 8 side by side. Do two share a sentence skeleton, an opening word, an
   option wording, the same blank position, the same kind of thing after the blank? If yes, change one.
5. **Exclusivity.** For each distractor, write the sentence in which it WOULD be correct, then confirm
   the passage rules it out by a convention, not by meaning (H6).
6. **Be the grader.** Would a strong grader write "head noun X is plural; tense from the clause"? Would
   any grader call a distractor "plausible" rather than "strong"? Then rewrite (H1, H3).

## What happens next: one probe round
After all four authors deliver, two fresh readers answer the graders' own questions on every item
(difficulty, n_struck, distractor quality, resolving word, exclusivity, template pairs). You then get
`sat-sec-v25-work/<X>/PROBE-FEEDBACK.json` and ONE revision round. Every item marked `must_revise`
MUST change in its words (a punctuation or whitespace edit does not count, except on a boundary item),
and the freeze refuses until it has. Keep the slot's row: same key letter, grid, key number, decider
type. Act on the readers' `not_hard_because` and `struck_options`; a template partner named by both
readers means the LATER slot changes its skeleton. Re-run the counts and the exclusion check after
revising.

## Process rules
- Write only inside `scripts/study-bank/sat-sec-v25-work/<X>/`. Never touch another author's folder or
  any other file. No database writes, no git.
- NEVER run pkill, killall, or any command that kills processes.
- Do not call any model API, and never use GPT or any non-Claude model.
- When done, report: the 8 ids; per slot, the key and letter; your heuristic counts from step 3; the
  counts script's flags on your ids (should be none); the exclusion result line; and any row you could
  not meet exactly, with the reason. Do not bend a row silently.
