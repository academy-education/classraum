# sat-sec-hard-v26 author brief (Digital SAT Standard English Conventions, HARD)

You are author **X**, where X is A, B, C or D; your run prompt says which. You write **10** Digital SAT
Reading & Writing **Standard English Conventions** items, every one aimed at **hard**. Each item is one
of your 10 slots in the tables below. The pre-registration is
`scripts/study-bank/PREREG-SEC26-2026-10-23.md`. You do not need to read it: everything you must follow
is in this file. Read the whole file before writing anything.

Repo root: `/Users/andylee/Downloads/saas/classraum`. Write ONLY these two files:
- `scripts/study-bank/sat-sec-v26-work/<X>/items.json`
- `scripts/study-bank/sat-sec-v26-work/<X>/declarations.json`

The slot table is also in `scripts/study-bank/sat-sec-v26-work/SLOTS.json` (read-only for you). The
checking scripts read that file, so the table below and the scripts cannot disagree.

## Why this batch is built the way it is (read this first)
The last batch (SEC25) passed every gate and still kept only 9 of 32 items, 5 of them hard. All three
graders found the same two rules, independently, and both came from the TABLE the authors were given,
not from the authors:
- **In every verb + pronoun item the key paired OPPOSITE numbers** (plural verb + "its", singular verb +
  "them"), 10 of 10. A student who solved the verb could pick the mismatched pronoun without finding the
  antecedent. Grader f: "a test-taker who solves only the verb (or only the pronoun) gets the item free".
- **A present perfect ("has been ...") was never the key**, 5 of 5. Grader e: "Eliminating the perfect
  pair is free."
- Graders also noted that the noun just before the blank almost always disagreed with the key.

So in this batch: **half the pronoun items key a MATCHED pair** (both numbers the same, on DIFFERENT
nouns); **half the aspect items key a PERFECT**, decided by a "since" clause or phrase; **the noun just
before the blank agrees with the key in about half the agreement items**; and several items have no
number trap before the blank at all, so their difficulty must come from the second rule. A script plays
a test-wise student across the table and found no rule over these features that beats chance by more
than ten points. Your job is to keep it that way in the words: do not re-introduce a pattern the table
removed.

## What the grader panel rewards (carried from SEC25, updated with SEC25's panel)
An item counts only if the MEDIAN of three graders calls it hard. In SEC25 the panel called 5 of 32 hard:
2 of the 3 boundary items, the one auxiliary-by-distant-participle item, 1 of 4 ellipsis items, 1 of 7
tense items, 0 of 10 pronoun items, 0 of 5 aspect items, 0 of 2 noun-form items.

**H1. Every wrong option is strong on its own.** All three graders called the distractors strong on 3 of
SEC25's 5 hard items and on 1 of its 27 medium items (SEC22-24: 18 of 22 hard, 0 of 49 medium). Strong
means each wrong option has its OWN reason to be picked. **For each wrong option, write in
`distractor_pulls` the reason a strong student would choose it. If the only reason is "it fills the
grid", change the item.**

**H2. Two rules that interact.** The verb and the pronoun take DIFFERENT nouns in every pronoun item. In
a MATCHED row both nouns have the same number: the student cannot copy the verb's number onto the pronoun
and win, because in half the batch that fails, and cannot pick the mismatch and win, because in the other
half that fails. Each wrong pronoun must point at a real noun of its number that a hurried reader would
accept, AND it must be wrong by a RULE: SEC25A-05 was dropped because a wrong possessive ("their" =
the nurses' own) was defensible by meaning, and SEC25D-02 was dropped as easy because meaning ruled the
wrong owner out ("its eyes" could not be the tracker's). Pick antecedents where only grammar decides.

**H3. The number is not found by "skip the modifier, find the head".** Medium notes open with "Head noun
'rivalry' is singular". Where your row gives a plain head, the difficulty must come from H2 or H4.

**H4. The second rule's evidence is five or more words from the blank and needs parsing.** SEC25's hard
items: "'recurred' (participle, seven words later)"; "forward (cataphoric) ellipsis ... needs
do-support"; "'drew' strands the appositive reading". Time clauses right after the blank went medium.

**H5. Nothing strikable at a glance, nothing resolving next to the blank.** Two at-a-glance strikes drop
an item.

**H6. Wrong only by rule.** Every wrong option is an error a copy editor would mark under one named
convention, never a reading that is merely less likely.

**H7. A punctuation or noun-form item is hard only when another sentence, or a word 6+ words away,
decides it.**

**H8. No template across the batch.** When two or more graders call items one template, the batch keeps
ONE and holds the rest. SEC25 lost 20 items this way. Keep your passages from sharing a sentence
skeleton, an opening, or a blank position, with each other and with the examples below.

### Five SEC25 items the panel kept as hard (now LIVE: learn the feature, never the frame or wording)
**SEC25A-07** (m/h/h): "Contact dermatitis of this sort, usually a handful of scaly patches on the
wrists, ______ in the clinic's experience rarely if ever recurred in patients who switched to nitrile
gloves." Options is / has / have / are; key has. Grader e: "'is/are' fail only once the far participle
is found." (H4.)

**SEC25B-05** (h/h/h): "Although the basin's tallest geyser, a cone of silica sinter near its northern
edge, ______, the hot springs scattered along the southern terraces discharge water at a nearly constant
rate in wet and dry months alike." Options were not / do not / was not / does not; key does not. Grader
e: "'was not' is attractive because the last sentence narrates the geyser in past tense, but 'be' cannot
stand in for 'discharge'." (H1, H4.)

**SEC25B-08** (h/m/h): "...and left a jagged ______ crescent of bare rock rising above the debris field
drew climbers..." Options scar, a / scar; a / scar: a / scar a; key semicolon. Grader f: "the comma reads
as an appositive until 'drew' arrives, creating a splice." (H4, H7.)

**SEC25A-08** (h/h/m): restrictive participial phrase decided by "all four barns" in another sentence;
key no mark. (H7.)

**SEC25A-02** (m/h/h): "Each graft and cutting ... ______ small brown lesions ... before the growers
recognized the fungus"; key was developing. (H3: a rule-number subject.)

### Three SEC25 items the panel called medium, and why
- **SEC25B-07** (pronoun, m/m/m, distractors "plausible" x3): "Compound subject 'a technician and two
  engineers' -> were; the object is the dish -> 'it'." The two halves were each easy and the key was the
  mismatched pair, as in every SEC25 pronoun item.
- **SEC25D-05** (aspect, m/m/m): "perfect forms clash with 'voted'"; graders struck the perfect pair
  because the batch never keyed one.
- **SEC25C-02** (tense, m/m/m): "Singular 'rivalry' (not 'bands'); present tense from 'have read out'."
  One attractor next to the blank, one clause, a filler distractor.

## Before each item: the self-test (write it into the declarations)
1. Name the deciding word(s) for each rule and count the words from the blank (H4).
2. For each wrong option, write the reason a strong student picks it (`distractor_pulls`, H1). "It agrees
   with the noun before the blank" may be the reason for at most one of the three.
3. Cover the passage: can you strike any option from its form alone (H5)? Then change the option set
   within the row.
4. Write the sentence in which each wrong option WOULD be correct, and the convention that rules it out
   here (H6).
5. Would a grader write "head noun X is plural, tense from the clause"? Then you have written a medium
   item. Move evidence, not the count on paper.

The declarations are wording discipline. They prove nothing about difficulty: an author declares what it
already believes. A probe reader and then the panel decide.

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
- `a+p` object: {visits it, visit it, visits them, visit them}
- `b+p` object / possessive: {is checking it, are checking it, ...} / {is tending its, are tending its, ...}
- `c+p` object, present passive + by: {is kept by it, are kept by it, is kept by them, are kept by them}
- `d+p` object / possessive: {has kept it, have kept it, ...} / {has filled its, have filled its, ...}
- `g+p` object: {was wrapping it, were wrapping it, was wrapping them, were wrapping them}
- `h+p` object, past passive + by: {was abandoned by it, were abandoned by it, ...}

Auxiliary grids that carry no lexical verb (the only three left that match nothing in the bank or in
SEC22-25, checked by `sec26-exclusion.mjs`):
- `j|n + never` (D6): {has never, have never, is never, are never}
- `i|n + seldom` (A6): {was seldom, were seldom, has seldom, have seldom}
- `i|m` bare (B5): {was, were, does, do}
Every other bare or "+ not" auxiliary set (i|n, m|n, j|m, i|j, j|n, and each of them with "not") is
already in the bank or in a SEC22-25 batch and must not be used. The `i+p` possessive set {was its, were
its, was their, were their} is SEC25C-04's and is not used.

Voice is the same in all four options of every grid. Progressive is the same in all four. Never mix.

**Shared complement word (B2, C7: i|j; C2, D2: r|i).** One word shared by all four options after the
verb: an adjective or noun not ending in -ed or -en and not an -ly word, different from every other
author's, never repeated next to the blank. **In C2 it has 7 or more letters**: "have been X" against
"was X" crosses the 1.6 length-ratio bar with a shorter word (found by the dry run).

## Agreement slots (write ONLY your own)
Column meanings:
- **Key**: the verb's number. **2nd dim: key**: the second rule's answer; for pronoun rows, the key
  pronoun's number and whether it MATCHES the verb's number.
- **Near**: the number of the noun immediately before the blank (one of the 4 words before it).
- **Pos**: where the misleader sits: `adj` immediately before the blank; `early` earlier in the
  sentence; `self` the subject word itself; `after` after the blank.
- **First**: the first noun of the blank's SENTENCE against the key: `agr` same number, `opp` other.
- **After**: the first noun within 8 words after the blank: `opp` the wrong number (never within 4 words
  if it would resolve the item), `agr`, `free`.
- **Decider type** goes in `decider_type`.
- **Letter**: where the key sits in `choices` (A = first).
- **Lever**: which of H1-H8 must carry the difficulty. It is not optional.

| Slot | Frame (the number construction) | Misleader | Pos | Key | Near | First | After | 2nd dim: key | Decider (inside the blank's sentence) | Decider type | Grid | Key form | Letter | Lever |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A1 | Possessive split, matched: the sentence opens with a SINGULAR noun (an opening phrase); the plural owner is named in an earlier clause; a plural subject + 'are V-ing their'; the singular opening noun gives 'its' a believable owner | the singular noun pulls 'its'; the matched key looks like 'copy the subject' | early | pl | pl | opp | free | pronoun: pl (matched) | the earlier clause's plural owner | pronoun-antecedent | b+p possessive | are V-ing their | B | H2: matched numbers |
| A2 | A rule-number singular subject whose number must be KNOWN, not found: a distributive 'Each of the [pl]' + a phrase ending on a plural noun ('Each of the grafts in the cuttings beds'); never 'every one of', 'one of the', 'none of' | 'Each ... of the [pl]' reads plural; the plural of-noun | adj | sg | pl | opp | free | tense: past | a before/after/when clause with a past verb, 5+ words after the blank | time-clause | b\|g | was V-ing | C | H3 (a rule-number subject), H4 |
| A4 | Present perfect KEYED: a singular head whose sentence opens with a plural noun in an introductory phrase; the blank's passive perfect is required by a since-clause with a past verb 5+ words after the blank | the opening plural pulls the verb; 'was V-en' pulls because the clause names a past event | early | sg | sg | opp | free | aspect: perfect (since) | 'since' + a past-tense clause, 5+ words after the blank | time-clause | e\|h | has been V-en | A | H4; SEC25 never keyed a perfect (5/5) |
| A5 | By-agent pronoun, present passive: a PLURAL subject + a phrase ending on a singular noun + 'are V-en by them'; the plural agent is a different noun in the previous clause | the adjacent singular pulls 'is'; the singular noun pulls 'it' | adj | pl | sg | agr | free | pronoun: pl (matched) | the plural agent named in the previous clause | pronoun-antecedent | c+p object | are V-en by them | D | H2: matched numbers; the mechanism of SEC24A-02 with matched keys |
| A6 | A plural subject after an opening singular; the blank is the auxiliary + shared 'seldom'; a 3+ word adverbial and then a predicate ADJECTIVE settles be over have ('has seldom ... absent' needs 'been') | the opening singular; 'have seldom' pulls as the default with 'seldom' | early | pl | pl | opp | agr | aux: be | the predicate adjective, 5+ words after the blank | aux-form | i\|n + seldom | were seldom | B | H4 (be keyed; SEC25 keyed have in both aux-form slots) |
| A8 | A singular -s-ending noun that is not plural (an -ics word, disease name or invariant noun is banned; use a singular in -s such as 'chassis' or 'thesis' only if no live item uses it) + a phrase ending on a plural noun | the -s ending; the adjacent plural | adj | sg | pl | agr | free | tense: present | a present-tense 'unless' or 'provided that' clause, 5+ words after the blank | conditional | c\|h | is V-en | D | H3, H4 |
| B1 | Object pronoun, split, mismatched: an opening clause names the SINGULAR antecedent; the main clause has a plural subject + 'have V-en it' | the singular antecedent pulls the verb; the plural verb pulls 'them' | early | pl | pl | opp | free | pronoun: sg (mismatched) | the opening clause's singular noun | pronoun-antecedent | d+p object | have V-en it | D | H2 |
| B2 | A singular subject after an opening phrase whose noun is plural; 'is/are/was/were + shared word'; a habitual present 'whenever' clause 5+ words after decides the tense | the opening plural; 'was' pulls because the passage reports a study | early | sg | sg | opp | free | tense: present | a 'whenever' clause with a present verb, 5+ words after | time-clause | i\|j + word | is + word | C | H4 |
| B4 | Simple past KEYED against the passive perfect: a plural subject after an opening singular; a definite past time phrase (no year, not 'ago') 5+ words after | the opening singular; 'have been V-en' pulls because the effect continues | early | pl | pl | opp | free | aspect: non-perfect | a definite-past time phrase, 5+ words after | time-phrase | e\|h | were V-en | B | H4 |
| B5 | Cataphoric ellipsis: an opening 'Whereas the [PLURAL NP] ___,' whose elided verb is the main clause's lexical PRESENT verb; the main clause's subject is singular (keyed 'do': a 'does' key is 2.0 times the length of 'do', over the 1.6 bar) | the singular subject after the blank pulls 'does'; 'were' pulls because the opening clause reads as background | after | pl | pl | agr | opp | aux: do | the main clause's lexical verb, 5+ words after the blank | parallel-verb | i\|m | do | A | H1, H4 (SEC25B-05 was panel-hard; this is its only unspent option set) |
| B6 | Object pronoun, split, mismatched: a singular head + a phrase ending on a plural noun + 'is V-ing them'; the plural antecedent is a different noun in an earlier clause | the adjacent plural pulls 'are'; the singular subject pulls 'it' | adj | sg | pl | opp | free | pronoun: pl (mismatched) | the earlier clause's plural noun | pronoun-antecedent | b+p object | is V-ing them | A | H2 |
| B8 | A plural head + a phrase ending on a singular noun; 'were being V-en'; a past while-clause 5+ words after | the adjacent singular; 'are being V-en' pulls as the default description | adj | pl | sg | agr | agr | tense: past | a past 'while' clause, 5+ words after | time-clause | k\|l | were being V-en | B | H4 (the batch's only 'being' grid) |
| C1 | By-agent pronoun, past passive, mismatched: the sentence opens with a SINGULAR noun; clause 1 names the PLURAL agent; ', but' + a singular subject + 'was V-en by them', the noun before the blank singular | the plural agent pulls 'were'; the singular subject and the singular opening noun pull 'it' | early | sg | sg | agr | free | pronoun: pl (mismatched) | clause 1's plural agent | pronoun-antecedent | h+p object | was V-en by them | C | H2 |
| C2 | Present perfect KEYED with 'have been + shared word' (the shared word has 7+ letters, or 'have been X' is 1.6 times 'was X'): a plural subject that reads singular (a no-s plural other than cattle/people/police/livestock, or 'the + adjective'); a since-clause with a past verb 5+ words after | the no-s plural reads singular; 'were' pulls because the clause names a past event | self | pl | pl | agr | free | aspect: perfect (since) | 'since' + a past-tense clause, 5+ words after | time-clause | r\|i + word | have been + word | C | H3, H4 |
| C3 | A plural subject after an opening singular; 'were V-en'; a definite-past time phrase 5+ words after | the opening singular; 'are V-en' pulls as a general statement | early | pl | pl | opp | agr | tense: past | a definite-past time phrase, 5+ words after | time-phrase | c\|h | were V-en | A | H4 |
| C5 | Past progressive KEYED against the active perfect: a plural head + a phrase ending on a singular noun; a when-clause with a past verb 5+ words after (an interrupted action) | the adjacent singular; 'have V-en' pulls because the result is stated as lasting | adj | pl | sg | agr | free | aspect: non-perfect | a past 'when' clause, 5+ words after | time-clause | d\|g | were V-ing | D | H4 |
| C6 | Object pronoun, split, matched: a singular head + a phrase ending on a plural noun + 'was V-ing it'; the singular antecedent is a different noun in an earlier clause; the sentence opens with a plural | the adjacent plural pulls 'were' and 'them' | adj | sg | pl | opp | free | pronoun: sg (matched) | the earlier clause's singular noun | pronoun-antecedent | g+p object | was V-ing it | B | H2: matched numbers |
| C7 | No number trap before the blank: a singular subject that is the first noun of its sentence, the noun before the blank singular; a PLURAL noun follows the blank within 8 words (never within 4 if it would settle the item); 'was + shared word'; a definite-past time phrase 5+ words after. The difficulty is the tense, and the plural after the blank | the plural after the blank; 'is + word' as the default present description | after | sg | sg | agr | opp | tense: past | a definite-past time phrase, 5+ words after | time-phrase | i\|j + word | was + word | D | H4 |
| C8 | Past progressive KEYED against the perfect progressive: a singular head + a phrase ending on a plural noun, in a sentence that opens with a plural noun; a past before-clause 5+ words after | the adjacent and opening plurals; 'has been V-ing' pulls because the activity sounds ongoing | adj | sg | pl | opp | free | aspect: non-perfect | a past 'before' clause, 5+ words after | time-clause | f\|g | was V-ing | B | H3, H4 |
| D1 | Object pronoun, split, matched: a singular subject and verb; the SINGULAR antecedent of 'it' is a different noun, the object of an opening phrase (so the first noun is singular); the noun before the blank singular; a PLURAL noun in the sentence gives 'them' a believable referent | the plural noun that 'them' could take; the matched key looks like 'just copy the subject' | early | sg | sg | agr | free | pronoun: sg (matched) | the antecedent, outside the verb's clause | pronoun-antecedent | a+p object | V-s it | C | H2: matched numbers, different nouns (SEC25 keyed only mismatched pairs) |
| D2 | Simple past KEYED against 'has been + shared word': no number trap before the blank (a singular subject that is the first noun of its sentence, the noun before the blank singular); a PLURAL noun within 8 words after the blank; a definite-past phrase 5+ words after. The trap is the perfect | 'has been' pulls because the state sounds lasting; the plural after the blank pulls 'were' | after | sg | sg | agr | opp | aspect: non-perfect | a definite-past time phrase, 5+ words after | time-phrase | r\|i + word | was + word | D | H4 |
| D4 | No number trap before the blank: a plural subject that is the first noun of its sentence, the noun before the blank plural; a SINGULAR noun within 8 words after the blank; 'are V-ing'; a present 'as long as' or 'unless' conditional 5+ words after. The difficulty is the tense | the singular after the blank; 'were V-ing' pulls because the passage reports past fieldwork | after | pl | pl | agr | opp | tense: present | a present conditional, 5+ words after | conditional | b\|g | are V-ing | B | H4 |
| D5 | Perfect progressive KEYED: a singular head + a phrase ending on a plural noun; a since-PHRASE ('since the [event]') 5+ words after | the adjacent plural; 'was V-ing' pulls because the start is in the past | adj | sg | pl | agr | free | aspect: perfect (since) | 'since' + a noun phrase naming a past event, 5+ words after | time-phrase | f\|g | has been V-ing | C | H4 |
| D6 | A singular head + a phrase ending on a plural noun; the blank is the auxiliary + shared 'never'; a 3+ word adverbial and then the past participle of a verb that cannot be passive or adjectival (vanished, recurred, arrived) settles have over be | the adjacent plural; 'is never' reads as the plain present | adj | sg | pl | agr | agr | aux: have | the intransitive participle, 5+ words after the blank | aux-form | j\|n + never | has never | D | H4 (SEC25A-07's mechanism, now with a shared adverb; its bare grid is live) |
| D7 | Possessive split, mismatched: the sentence opens with a PLURAL noun; the singular owner is named in an earlier clause; then a plural head + a phrase ending on a singular noun + 'have V-en its' (the bare 'were its' set is SEC25C-04's). Nothing about MEANING may rule out the plural owner; the rule must | the adjacent singular pulls 'was'; the plural verb pulls 'their' | adj | pl | sg | agr | free | pronoun: sg (mismatched) | the earlier clause's singular owner | pronoun-antecedent | d+p possessive | have V-en its | A | H2, H6 (SEC25A-05 dropped: a wrong possessive was defensible by meaning) |
| D8 | Active present perfect KEYED: a plural head + a phrase ending on a singular noun, after an opening phrase whose noun is SINGULAR; a since-phrase 5+ words after | the adjacent singular; 'were V-ing' pulls because the start is in the past | adj | pl | sg | opp | free | aspect: perfect (since) | 'since' + a noun phrase naming a past event, 5+ words after | time-phrase | d\|g | have V-en | A | H4 |

## Non-agreement slots (write ONLY your own)
Boundary items: the four options contain the SAME words in the SAME order and differ only in punctuation
(capitalization may follow a period). The blank includes the word before the mark and the word after
it, so the passage never repeats either. Offer exactly the row's four marks. "One word off" means the
same mark placed one word away from its slot. In the two garden-path rows the blank spans three words
(verb, determiner, noun: "finished the bridge"), and the two comma positions are after the verb (EARLY)
and after the noun (LATE).

Noun-form items: the four options are {X, X's, Xs, Xs'} of one regular noun (never C10's or another
author's noun). In C10 and D10 the word after the blank is a VERB that can also be read as a noun (or,
in D10, as a plural noun), so a reader who takes it as a noun reaches for a possessive.

| Slot | Shape | Key | The four options | Lures that must tempt | Letter | Decider (`decider_quote`) | Lever |
|---|---|---|---|---|---|---|---|
| A3 | Sentence-final RESTRICTIVE participial phrase. ANOTHER sentence establishes several sets of the noun, so the phrase is needed to say which | no mark | no mark, comma, dash, comma one word off | the comma and the dash (both nonrestrictive) | A | the other sentence's count (OUTSIDE the blank's sentence) | H7 (SEC25A-08 was panel-hard) |
| A7 | Two sentences: the second opens with a noun phrase that reads as an appositive of the first sentence's last noun until its verb arrives 6+ words later; it is a separate claim (not an explanation of the first), so neither a colon nor a comma joins them | period + capital | period + capital, comma, no mark, colon | the comma (appositive reading); the colon | A | the second sentence's verb, 6+ words after the blank | H4; the delayed-verb family keys a period here, a semicolon in B3, a colon in C4 and a comma in D9 |
| A9 | PLURAL POSSESSIVE. Another sentence establishes several owners; the noun after the blank can be read as a verb | Xs' | X, X's, Xs, Xs' (one regular noun) | the plain plural (garden path); the singular possessive | D | the other sentence's count (OUTSIDE the blank's sentence) | H7 |
| A10 | Garden path after an opening subordinate clause: the noun phrase after the clause's verb could be its object or the main clause's subject; the main verb 6+ words later shows it is the SUBJECT, so the comma goes BEFORE it (the early position) | comma at the EARLY position | comma at the EARLY position, comma at the LATE position, no mark, semicolon at the early position | the comma after the noun phrase (object reading); no comma; a semicolon at the early position (after the subordinate clause) | C | the main clause's verb, 6+ words after the blank | H4; the key position varies (B7 keys the late position) |
| B3 | Two independent clauses; the second opens with a noun phrase that reads as an appositive of the first clause's last noun until its verb arrives 6+ words later; the second clause is a later event, so a colon is wrong | semicolon | semicolon, comma, no mark, colon | the comma (appositive reading); the colon | C | the second clause's verb, 6+ words after the blank | H4 (SEC25B-08 was panel-hard) |
| B7 | Garden path after an opening subordinate clause: the noun phrase after the clause's verb IS its object; the main clause's own subject arrives after it, and its verb 6+ words later, so the comma goes AFTER the noun phrase (the late position) | comma at the LATE position | comma at the EARLY position, comma at the LATE position, no mark, semicolon at the early position | the comma before the noun phrase (subject reading); no comma; a semicolon at the early position | D | the main clause's subject and verb, 6+ words after the blank | H4; A10 keys the early position |
| B9 | SINGULAR POSSESSIVE. Another sentence establishes exactly one owner; the noun after the blank can be read as a verb | X's | X, X's, Xs, Xs' (one regular noun) | the plural possessive; the plain singular (garden path) | C | the other sentence's fact (OUTSIDE the blank's sentence) | H7 |
| B10 | A series whose LATER item (6+ words after the blank) contains its own commas, so the items must be separated by semicolons; the blank sits between the first two items, which contain no comma | semicolon | semicolon, comma, colon, no mark | the comma (the first two items alone look like a plain series); the colon | B | the internal comma in a later item, 6+ words after the blank | H4/H7: the decider is far from the blank |
| C4 | A complete clause, then a second complete clause that EXPLAINS it; the second clause opens with a long noun phrase whose verb arrives 6+ words after the blank, so a comma (which reads it as an appositive) makes a comma splice; no semicolon, period or dash is offered, so the colon is the only correct mark | colon | colon, comma, no mark, comma one word off | the comma (appositive reading); no mark | C | the second clause's verb, 6+ words after the blank | H4; the batch's only colon key |
| C9 | Sentence-final NONRESTRICTIVE participial phrase. ANOTHER sentence establishes there is only one set of the noun, so the phrase adds information and takes a comma; no dash is offered | comma | comma, no mark, semicolon, comma one word off | no mark (the restrictive reading); the semicolon | A | the other sentence's count (OUTSIDE the blank's sentence) | H7; A3 keys no mark in the same structure |
| C10 | PLAIN PLURAL keyed. The word after the blank is a VERB (it can also be read as a noun), and another sentence establishes several of the noun; the possessives make the verb a noun and leave the sentence without a verb | Xs (plain plural) | X, X's, Xs, Xs' (one regular noun) | the plural possessive (the next word read as a noun); the singular | A | the verb after the blank, plus the other sentence's count | H7; SEC25 keyed only possessives |
| D3 | Sentence-final NONRESTRICTIVE appositive set off by a dash. ANOTHER sentence establishes there is only one of the noun, so the appositive does not say which; no comma is offered, so the dash is the only correct mark | dash | dash, no mark, semicolon, comma one word off | no mark (the restrictive reading); the semicolon | B | the other sentence's 'only one' fact (OUTSIDE the blank's sentence) | H7; the restrictiveness family keys none (A3), comma (C9) and dash (D3) |
| D9 | A clause followed by a long noun phrase that reads as the start of a second clause; no verb ever arrives (the later -ing or -ed word is a modifier), so the noun phrase is a sentence-final appositive and takes a comma | comma | comma, semicolon, colon, no mark | the semicolon and the colon (second-clause reading) | D | the -ing or -ed modifier where a second clause would need its finite verb, 6+ words after the blank (quote that word) | H4; B3/C9 key a semicolon and a period |
| D10 | PLAIN SINGULAR keyed. The word after the blank is a VERB ending in -s (it can also be read as a plural noun), and another sentence establishes exactly one of the noun | X (plain singular) | X, X's, Xs, Xs' (one regular noun) | the singular possessive (the next word read as a noun); the plain plural | B | the verb after the blank, plus the other sentence's fact | H7 |

Never offer a semicolon or a colon directly before and, for, but, or, nor, yet or so. Never offer both a
semicolon and a period, or both a colon and a single dash. Never offer a dash where a comma would also be
correct, or a comma where a dash would also be correct (C9 offers no dash; D3 offers no comma).

## Rules for every item
**Number (agreement items)**
- Key, Near, First, After, misleader position exactly as your row says. Where the row's Pos is `after`
  (B5, C7, D2, D4), there is NO number trap before the blank: the difficulty is the second rule and the
  noun after the blank. Do not invent a trap the row does not ask for.

**Pronoun items**
- The pronoun's antecedent is never the verb's own subject (`pronoun_antecedent.word` differs from
  `true_subject_head`; the counts script fails the item otherwise).
- The key is MATCHED or MISMATCHED exactly as the row says. Do not "fix" a matched row into a mismatch.
- Only the pronouns your grid names (its/their, it/them). Never a person pronoun, never singular "they".

**The second rule stays inside the blank's sentence (agreement items)**
- The decider is in the blank's own sentence and is of the row's decider type. Quote it in
  `decider_quote`, name the type in `decider_type`, quote it in the explanation.
- Only rows whose decider type is time-clause or time-phrase may contain a time word in the blank's
  sentence (when, whenever, while, until, till, before, after, once, ago, since, "each time", "every
  time", "as" meaning while).
- **Deletion test.** Delete the decider. The item must become undecidable on the second rule. Write the
  result in `deletion_test`.
- **Every tense decider makes the wrong tense an ERROR.** Tense and aspect are settled only by a time
  clause, a time phrase or a conditional. Never a modal or a second finite verb.
- **"since" (NEW).** Allowed ONLY in the four perfect-keyed rows A4, C2, D5 and D8, where it is the
  decider: exactly once in the passage, 5 or more words after the blank, inside `decider_quote`, followed
  by a past-tense clause ("since the levee failed") or a noun phrase naming a past event ("since the
  flood"). A simple past with "since" is an error, which is what makes the perfect the only key. Never
  causal "since" (write "because"), never "ever since".
- Banned ANYWHERE in your passages: "since" outside those four rows; "ever since"; "to this day", "to the
  present", "until now", "so far", "thus far", "to date", "up to now"; "for the past/last N", "in recent
  years/decades", "lately", "recently", "nowadays", "at present", "currently"; duration anchors ("for
  more than a century", "for decades", "over the past ...", "throughout", "across those decades"); "on
  its own", "on their own", "by itself", "by themselves".
- "now", "still", "already", "yet", "once" may not appear in the blank's own sentence. No tense settled
  by a printed date or year.

**Options (agreement items)**
- `choices` is exactly your grid's 2x2, one lexical verb.
- No option contains a word the other three lack. A shared word appears only where the grid names one
  (the shared complement in B2, C7, C2, D2; "never" in D6; "seldom" in A6; "by" in A5 and C1; the
  pronoun).
- Key length divided by the shortest option's length is < 1.6. Across your 10, the key may be the
  uniquely longest option at most 3 times and the uniquely shortest at most 3 times.
- The key sits at your row's Letter. Order the other three so that no fixed pattern appears.
- The word immediately before the blank is NOT the first word of every option; the word immediately
  after the blank is NOT the last word of every option; no option repeats the word just before the
  blank.
- No mark immediately after the blank in any agreement item, except B5 (the comma that ends its opening
  clause).

**Distractors**
- Every distractor is grammatical in isolation and wrong only in context (H5, H6).
- No answer-resolving word within 4 words after the blank.
- At most 1 of the 3 distractors strikable without reading beyond the blank's clause. Aim for 0.

**Banned traps**: literary present; singular "they"; "one" as a noun; collective nouns (team, committee,
family, crew, herd, flock as the subject of the blank); data, media; subjunctive ("insist/require that");
who/whom or any pronoun case; contractions; dictionary variants; "one of the ... that", "none of",
"neither of", "the number of", "a series of", "a pair of".

## Templates that are already live, held or spent (do not reuse any of them as a frame)
A MECHANISM may recur (the panel rewards several of them, and the table asks for some on purpose); a
FRAME may not: the sentence skeleton, the kind of noun, the option set, and the example sentences in this
brief. The exclusion script checks text and option sets; the probe and the panel check skeletons.

**Four SEC25 hard mechanisms are reused on purpose**, each with a different key or option set from its
SEC25 item: restrictiveness decided by a count in another sentence (A3 keys no mark, C9 a comma, D3 a
dash); a noun phrase that reads as an appositive until its verb arrives (B3 semicolon, A7 period, C4
colon, D9 comma, where no verb arrives); an auxiliary decided by a distant word (D6 "never" + a
participle, A6 "seldom" + an adjective); cataphoric ellipsis (B5, plural, keyed "do"). For these rows
the SEC25 item's nouns, setting, skeleton and option set are spent; the mechanism is not. The entries
below that describe those SEC25 items describe their FRAMES.
- **Every SEC25 frame** (kept, held or dropped): "cattle" + phrase; "Each [sg] and [sg]" + phrase; a
  numeral compound modifier on a singular head + of + plural; a sentence-final though-clause ellipsis
  after a present perfect; possessive and object pronoun splits with the owner in an opening
  because-clause, before a semicolon, in an opening infinitive of purpose, in an opening prepositional
  phrase, after ", and", ", but", ", so"; a by-agent pronoun after ", but" with a singular subject + phrase
  ending plural; SEC25A-07's frame: a singular condition + comma appositive ending plural + "in
  the clinic's experience" + an intransitive participle, with the bare {is, are, has, have}; SEC25A-08's frame: blood samples from several barns, "the samples drawn in
  the barn nearest the duck pond" (and the brief's "cores collected near the outfall"); a singular -s noun (lens, atlas, census) +
  phrase; a plural head + "from X to [sg]"; a singular head + subject relative clause with a plural
  object; SEC25B-05's frame: "Although the [singular], [appositive], ___," over a plural
  main clause, with {was not, were not, does not, do not}; a singular head + "each time"
  clause; SEC25B-08's frame: a landslide scar and "a crescent of bare rock ... drew
  climbers"; "the [sg] and the [sg]" + phrase; "among" phrase; "by" phrase naming plural makers; a
  be-ellipsis after a semicolon; a "the + adjective" subject ellipsis after ", but"; a direct question
  after a colon; plural and singular possessive nouns decided by a count in another sentence; an opening
  prepositional phrase with a singular noun before a plural subject.
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

## Exclusion against the bank and the last four batches
Your passages and option sets must not copy any live SEC item or any SEC22, SEC23, SEC24 or SEC25
candidate (kept, held or dropped). An item is changed before delivery, and HELD if still flagged at
freeze, when its passage word-trigram Jaccard is >= 0.20 with any of them, or its option set is
identical as strings to one of theirs. Check with:

    cd /Users/andylee/Downloads/saas/classraum && set -a && source .env.local && set +a && node scripts/study-bank/sec26-exclusion.mjs scripts/study-bank/sat-sec-v26-work/<X>/items.json

It must exit 0 on your file. If it refuses (exit 2), report that; do not treat it as clean.

**Passage, topic, names**
- 50-90 words, 2-4 sentences, academic register, American punctuation, double quotes, exactly one
  `______` (six underscores). The blank is not always in the last sentence.
- Topic area by author: A life sciences, medicine, agriculture; B earth, space and physical sciences,
  engineering; C history, the arts, humanities; D social sciences (economics, linguistics, psychology,
  education, urban studies, political science).
- `topic_tag` must not repeat any v10-v25 tag. List them with:

      cd /Users/andylee/Downloads/saas/classraum/scripts/study-bank && python3 -c "import json,glob;fs=glob.glob('sat-sec-hard-v1*.batch.json')+['sat-sec-hard-v22.batch.json','sat-sec-hard-v23.batch.json','sat-sec-hard-v24.batch.json','sat-sec-hard-v25.batch.json'];print(sorted({i.get('topic_tag') for f in fs for i in json.load(open(f)) if isinstance(i,dict) and i.get('topic_tag')}))"

- Prefer no proper nouns; use a role ("one ecologist"). Any name you use starts with a letter in YOUR
  range: A: A-F, B: G-L, C: M-R, D: S-Z. Never reuse a name across your items.

**Explanation**: 3-6 sentences. Agreement: name the true subject and why the misleader is not it; quote
the deciding word(s) for the second rule; say why EACH distractor fails, quoting it by its text.
Boundary and noun-form items: name the structure or the deciding fact and why each wrong option fails.
Never write "option B" or "choice B".

## File format
**`<X>/items.json`** is a JSON array of 10 objects:

```json
{
  "id": "SEC26X-01",
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

Slot X1 is id SEC26X-01, and so on to X10 = SEC26X-10. `correct_answer` is character-identical to one
entry of `choices`, at your row's Letter. `subskill` begins "boundaries: " for the boundary rows (A3, A7,
A10, B3, B7, B10, C4, C9, D3, D9) and "form: " for every other slot.

**`<X>/declarations.json`** is a JSON array of 10 objects. Agreement items:

```json
{
  "id": "SEC26X-01",
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
  "dimension_key": "present | past | perfect | non-perfect | have | do | be | sg | pl",
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
slots, and its word is never the `true_subject_head`. `first_noun_of_sentence` is the first noun of the
whole sentence that contains the blank. Write `after_noun_within_8` as null only where your row's After
is `free` and there is no noun within 8 words. Grid codes as in the tables ("b+p", "c+p", "d+p", "g+p",
"h+p", "a+p" for pronoun grids).

Boundary and noun-form items:

```json
{
  "id": "SEC26X-03",
  "slot": "X3",
  "frame": "...",
  "key_mark": "none | comma | semicolon | colon | period | dash",
  "key_class": "pl-poss | sg-poss | pl | sg",
  "key_letter": "A | B | C | D",
  "structure": "what stands on each side of the blank, or what decides the noun form",
  "decider_quote": "the exact passage words that decide it (see the table's Decider column)",
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

       cd /Users/andylee/Downloads/saas/classraum && node scripts/study-bank/sec26-brief-counts.mjs scripts/study-bank/sat-sec-v26-work/<X>/items.json --decl scripts/study-bank/sat-sec-v26-work/<X>/declarations.json

   Fix every flag on YOUR ids (table row, grid, pronoun class, letter, option marks, noun forms, decider
   type and placement, "since", the split, distractor_pulls, shared word, banned words, length).
3. Run the exclusion check above; it must exit 0.
4. Run the cross-item tell check on your own files (it reads only the authors present):

       cd /Users/andylee/Downloads/saas/classraum && node scripts/study-bank/sec26-tellsim.mjs --work scripts/study-bank/sat-sec-v26-work

   With one author's 10 items the strata are small and the letter bars cannot be met, so read it for
   anything your items changed against the table; the coordinator runs it on all 40.
5. Run the hostile-reader check below and fix what it finds. Then report.

## Before you finish: hostile-reader check
Be a reader who wants points WITHOUT doing the grammar. Write the results into `hostile_reader`.
1. **Options only.** Cover the passage. Can you pick or strike an option: the odd one out, the only one
   with an extra word, the longest, the only strong mark, the only unmarked one?
2. **Blank's clause only.** Can you settle the number from the word right before the blank, or the second
   rule from a word right next to it? Then the item is medium; move the evidence (H4).
3. **The named heuristics, across your agreement items.** Apply each blindly and count the keys it gets:
   (a) the number opposite the noun right before the blank; (b) agree with the first noun of the
   sentence; (c) find a time clause and copy its tense; (d) the option with an extra word loses; (e)
   "been" or "being" loses; (f) in pronoun items, pick the MISMATCHED pair; (g) in pronoun items, pick the
   MATCHED pair. Each should hit about half of the items it applies to. If one gets all but one of your
   items of a kind, change an item, not the count on paper.
4. **Across items.** Lay your 10 side by side. Do two share a sentence skeleton, an opening word, an
   option wording, the same blank position, the same kind of thing after the blank? If yes, change one.
5. **Exclusivity.** For each distractor, write the sentence in which it WOULD be correct, then confirm
   the passage rules it out by a convention, not by meaning (H6).
6. **Be the grader.** Would a strong grader write "head noun X is plural; tense from the clause"? Would
   any grader call a distractor "plausible" rather than "strong"? Then rewrite (H1, H3).

## What happens next: one probe round
After all four authors deliver, two fresh readers answer the graders' own questions on every item
(difficulty, n_struck, distractor quality, resolving word, exclusivity, template pairs). You then get
`sat-sec-v26-work/<X>/PROBE-FEEDBACK.json` and ONE revision round. Every item marked `must_revise` MUST
change in its words (a punctuation or whitespace edit does not count, except on a boundary item), and
the freeze refuses until it has. Keep the slot's row: same key letter, grid, key number, matched or
mismatched pronoun, decider type. Act on the readers' `not_hard_because` and `struck_options`; a template
partner named by both readers means the LATER slot changes its skeleton. Re-run the counts, the
exclusion check and the tell check after revising. The freeze also refuses if the tell check fails on
the revised files.

## Process rules
- Write only inside `scripts/study-bank/sat-sec-v26-work/<X>/`. Never touch another author's folder,
  SLOTS.json, or any other file. No database writes, no git.
- NEVER run pkill, killall, or any command that kills processes.
- Do not call any model API, and never use GPT or any non-Claude model.
- When done, report: the 10 ids; per slot, the key and letter; your heuristic counts from step 3; the
  counts script's flags on your ids (should be none); the exclusion result line; and any row you could
  not meet exactly, with the reason. Do not bend a row silently.
