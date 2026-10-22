# sat-sec-hard-v24 author brief (Digital SAT Standard English Conventions, HARD)

You are author **X**, where X is A, B or C; your run prompt says which. You write **8** Digital SAT Reading &
Writing **Standard English Conventions** items aimed at **hard**: **6 agreement items** (slots X1-X6) and **2
boundary (punctuation) items** (slots X7-X8). Each item is one of your 8 slots in the tables below. The
pre-registration is `scripts/study-bank/PREREG-SEC24-2026-10-23.md`. You do not need to read it: everything you
must follow is in this file. Read the whole file before writing anything.

Repo root: `/Users/andylee/Downloads/saas/classraum`. Write ONLY these two files:
- `scripts/study-bank/sat-sec-v24-work/<X>/items.json`
- `scripts/study-bank/sat-sec-v24-work/<X>/declarations.json`

## What a hard item here looks like
A short academic passage (50-90 words, 2-4 sentences) with one blank written as six underscores, `______`.
Four options. Exactly one is correct.

- **Agreement item.** The reader must find the true subject past a real misleader AND apply a second rule
  (tense or aspect, auxiliary type, or which noun a pronoun refers to). **Both decisions are settled inside the
  sentence that contains the blank.**
- **Boundary item.** The four options contain the same words in the same order and differ only in
  punctuation. The reader must parse the sentence's structure to see which mark is right.

Every distractor is something that would be correct in SOME sentence. It is wrong only in THIS one.

Panel graders call an item hard when a strong student must work for both decisions. They call it medium when
either decision is visible next to the blank.

## Why the rules below exist
The last batch (v23) kept 14 of 24 and banked 6 hard. Three independent graders still named one cross-item tell,
and the gate and the template cover found three more. Each rule below breaks one. Do not reproduce any of them:
1. **"Number x tense, and the tense is always settled by a when/while/until clause."** In v23, 13 of 18 agreement
   items were tense or aspect grids, and almost every one was settled by a time clause. A test-taker who learns
   "find the when-clause" halves every item. **Here only 6 of 18 agreement items are settled by a time
   expression.** The rest are settled by a pronoun's antecedent (5), by auxiliary type be / do / have (4), or by
   a conditional (3). **No tense is settled by a modal or a parallel verb**: those do not make the wrong tense
   ungrammatical, and v22 lost four items to a second defensible option.
2. **Grids paired by shape.** Graders paired items whose OPTIONS looked alike: three "being" grids, two past
   passives after a when-clause, two past progressives after a when-clause, two verb x possessive grids. **Here
   no two agreement items share an option shape and a decider type**, and the five pronoun items use five
   different option shapes.
3. **The inversion triple.** v23's three inversions were named as one template by all three graders, and the
   cover held two hard items for it. **Here there is ONE inversion** (C6, a direct question).
4. **Boundary items with two at-a-glance strikes.** v23 lost C-07 and C-08 because two of their three wrong
   options could be struck without parsing (a mismatched dash/comma pair, a lone comma, a garbled list).
   Graders also named "a semicolon before and/for/but is never the key". **Here each boundary row lists its four
   marks exactly, and at most one of them is the strikable kind.**

**The more rigid the pattern across your 8, the more the answer becomes predictable from the pattern rather
than from the passage.** Vary what follows the blank, where the blank sits, and how each item opens.

## Grid codes (agreement items)
Each grid is a complete 2x2: 4 options = two numbers x two forms, one lexical verb in all four.

| code | sg / pl | code | sg / pl |
|---|---|---|---|
| i | was / were | b | is / are V-ing |
| j | is / are | g | was / were V-ing |
| c | is / are V-en (passive) | k | is / are being V-en |
| h | was / were V-en (passive) | l | was / were being V-en |
| e | has / have been V-en | f | has / have been V-ing |
| r | has / have been + complement | m | does / do |
| n | has / have | a | V-s / V |

Pronoun grids cross the verb's number with the pronoun's number, one verb form:
- `n+p` (A5): {has its own, have their own, has their own, have its own}
- `a+p` object (B5): {V-s it, V it, V-s them, V them}
- `a+p` demonstrative (C4): {V-s that, V that, V-s those, V those}
- `j+p` (C5): {is its, are its, is their, are their}
- `c+p` object (A2): {is V-en by it, are V-en by it, is V-en by them, are V-en by them}

`j|m` + "not" (B1) = {does not, do not, is not, are not}.

Examples: `i|j` + shared word "dormant" = {was dormant, were dormant, is dormant, are dormant}. `i|r` + "fertile"
= {was fertile, were fertile, has been fertile, have been fertile}. `i|n` = {was, were, has, have}. `j|m` +
"the" = {is the, are the, does the, do the}.

Voice is the same in all four options of every grid. Progressive is the same in all four. Never mix them.

**Shared complement word (A1, A4, C1).** These grids MUST carry one word shared by all four options after the
verb (a bare {was, were, is, are} is identical to two live items and is held). It is an adjective or noun that
does not end in -ed or -en, is not an -ly word, and differs from the other authors' (A1 and A4 in author A;
C1). Pick something plain ("dormant", "brittle", "silent", "fertile", "scarce").

## Agreement slots (write ONLY your own)
Column meanings:
- **Key**: the verb's number. **Pron**: in pronoun slots, the key pronoun's number.
- **Near**: the number of the noun immediately before the blank (one of the 4 words before it).
- **Pos**: where the misleader sits. `adj` = immediately before the blank; `early` = earlier in the sentence;
  `self` = the subject word itself.
- **First**: the first noun of the blank's SENTENCE, against the key: `agr` same number, `opp` other number.
- **After**: the first noun within 8 words after the blank: `opp` = the wrong number (never within 4 words if it
  would resolve the item), `agr`, `free` (your choice).
- **Decider type**: one of time-clause, time-phrase, modal, parallel-verb, conditional, pronoun-antecedent,
  aux-form. It goes in `decider_type`.
- **Letter**: where the key must sit in `choices` (A = first).

| Slot | Frame (the number construction) | Misleader | Pos | Key | Near | First | 2nd dim: key | Decider (inside the blank's sentence) | Decider type | Grid | Key form | Letter | After |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A1 | A foreign (Latin/Greek) plural standing alone as the subject, with NO of-phrase: larvae, pupae, vertebrae, nuclei, strata, hyphae, fungi. Never data, media, bacteria or criteria | the -ae / -i ending reads singular | self | pl | pl | agr | tense: present | a present-tense verb in a habitual **whenever**-clause of the same sentence ("whenever the nights turn cold"), after the blank and 5+ words from it | time-clause | i\|j + shared word | are + word | C | opp |
| A2 | A plural head + a postposed ADJECTIVE phrase (not a participle) ending on a singular noun: "soils rich in a single trace mineral ___". The blank's clause is the SECOND independent clause after a semicolon; the first clause has a PLURAL subject (the first noun of the sentence) and names a SINGULAR animal or agent: "Wheat roots tolerate the root beetle in most fields; soils rich in a single trace mineral ___." The options are a passive + "by" + object pronoun | the singular noun closing the adjective phrase | adj | pl | sg | agr | pronoun: sg (split from the verb) | the singular agent in the first clause is the only possible referent of the pronoun; the plural subject of the first clause must be impossible as the agent ("avoided by them" = by the roots: nonsense) | pronoun-antecedent | c+p object (passive + by + it / them) | are V-en by it | A | free |
| A3 | A singular head + of-phrase whose object is a COMPOUND of two singular nouns: "The core of the rice and millet collection ___", "The lining of the stomach and gut ___" | the "X and Y" compound right before the blank reads plural | adj | sg | sg | agr | tense: present | a first-conditional **if**-clause with a present-tense verb in the same sentence ("if the power supply fails") | conditional | c\|h | is V-en | D | agr |
| A4 | "N after N" distributive subject ("Season after season ___", "Graft after graft ___"), read as singular | the repetition reads plural | self | sg | sg | agr | aspect: past | a definite-past **"... ago"** phrase in the same sentence, 5+ words after the blank: the present perfect cannot take it | time-phrase | i\|r + shared word | was + word | B | free |
| A5 | A compound subject "the X and its [singular Y]" (one singular noun, then "and its" + another singular noun), with a possessive in the options that refers to the whole compound: "The fungus and its host tree ___ own defenses" | "and its [singular]" reads like an add-on to a singular subject | adj | pl | sg | opp | pronoun: pl (shared with the verb) | the compound subject is the only owner the sentence allows | pronoun-antecedent | n+p + "own" | have their own | D | agr |
| A6 | A compound sentence: the first clause has a PLURAL subject and a PRESENT PERFECT verb ("Spruce seedlings have colonized the upper moraine"); the second clause, after ", and", has a SINGULAR subject and ends with the blank + "too" (verb-phrase ellipsis) | the first clause's plural subject and its "have" | early | sg | sg | opp | aux: have | the first clause's perfect auxiliary ("have colonized" -> "has too"; a lexical verb would need "does") | parallel-verb | m\|n | has | A | free |
| B1 | "Several kinds/types of [singular mass noun]" as the subject of a sentence-final **whereas**-clause with verb-phrase ellipsis: "Granite resists frost, whereas several kinds of sandstone ___." The main clause has a SINGULAR subject and a LEXICAL present verb. All four options end in "not" | the singular mass noun right before the blank | adj | pl | sg | opp | aux: do | the main clause's lexical verb ("resists" -> "do not"; a be + adjective main clause would need "are not") | parallel-verb | j\|m + "not" | do not | B | free |
| B2 | A singular head + a parenthetical in PARENTHESES listing its parts, ending on a plural noun: "The rotor (hub, shaft, and three blades) ___" | the plural noun closing the parenthesis | adj | sg | pl | agr | tense: present | a present-tense verb in an **as**-clause (simultaneous) of the same sentence, after the blank | time-clause | k\|l | is being V-en | D | opp |
| B3 | A deverbal noun head + an of-object + a by-agent: "The measurements of the glacier by both satellites ___". The of-object is SINGULAR; the by-agent is plural and sits right before the blank | the singular of-object earlier in the subject | early | pl | pl | agr | tense: present | a present-tense verb in an **unless**-clause of the same sentence (first conditional: a past main verb cannot take a present unless-clause) | conditional | b\|g | are V-ing | A | free |
| B4 | A PLURAL container or sample noun as head + of + a SINGULAR noun: "Samples of the deepest core ___", "Crates of the cracked tile ___" (never a quantity word: no "number", "total", "majority", "variety", "series", "pair") | the singular of-noun right before the blank | adj | pl | sg | agr | tense: past | a past-tense verb in an **until**-clause of the same sentence | time-clause | c\|h | were V-en | C | agr |
| B5 | A fronted place clause holding the pronoun's PLURAL antecedent, then a SINGULAR main-clause subject and the blank: "Wherever icicles hang from the girders, the steel housing ___ from the gusts" | the plural antecedent early in the sentence | early | sg | sg | opp | pronoun: pl (split from the verb) | the plural noun in the place clause is the only thing the object pronoun can refer to | pronoun-antecedent | a+p object (it / them) | V-s them | A | opp |
| B6 | A SINGULAR head + a non-of locative phrase ("from", "on", "beneath") ending on a plural noun, then the blank, then "not," + a short comment clause in commas + a PAST PARTICIPLE of an intransitive verb (one that cannot be passive: migrated, arrived, vanished, collapsed): "The shearwater from the northern islets ___ not, as the early surveys assumed, migrated south" | the plural noun right before the blank | adj | sg | pl | agr | aux: have | the intransitive participle 5+ words after the blank: "was not ... migrated" is ungrammatical | aux-form | i\|n | has | D | opp |
| C1 | An indefinite pronoun subject + a phrase ending on a plural noun: "Nothing in the weavers' workshops ___", "Everything on the merchants' shelves ___" | the plural noun right before the blank | adj | sg | pl | agr | tense: past | a past-tense verb in a habitual **if**-clause of the same sentence ("if the inspector asked to enter": a present main verb cannot take it) | conditional | i\|j + shared word | was + word | D | agr |
| C2 | A singular head + "of" + a GERUND phrase whose object is plural: "The practice of copying the gospels ___" | the gerund's plural object right before the blank | adj | sg | pl | agr | aspect: past | a past-tense verb in a **before**-clause of the same sentence: the present perfect progressive cannot take it | time-clause | f\|g | was V-ing | B | opp |
| C3 | An opening concessive clause with a SINGULAR subject ("Although the abbey kept a register,"), then a plain plural main-clause subject and the blank | the singular subject of the concessive clause | early | pl | pl | opp | aspect: past | a definite-past **when**-clause of the same sentence | time-clause | e\|h | were V-en | C | free |
| C4 | A comparison with "those of": a PLURAL head + of-phrase ending on a singular noun, then the blank, which holds the verb and the demonstrative: "The margins of the later copy ___ of the earlier copies" | the singular noun right before the blank | adj | pl | sg | agr | pronoun: pl (shared with the verb) | the demonstrative stands for the compared head ("margins"), never for the of-noun | pronoun-antecedent | a+p demonstrative (that / those) | V those | A | agr |
| C5 | A compound sentence joined by ", so": the first clause names a SINGULAR owner ("The guild left no charter,"); the second clause has a PLURAL subject and the blank + "only record of ..." | the singular owner early in the sentence | early | pl | pl | opp | pronoun: sg (split from the verb) | the first clause's singular noun is the only possible owner | pronoun-antecedent | j+p | are its | B | opp |
| C6 | **The one inversion.** A DIRECT QUESTION reported inside the passage after a colon: "...keep returning to one question: why ___ oldest and most carefully guarded pattern book run out of pages?" All four options share "the". The singular subject's head noun is 5+ words after the blank, and so is the base verb | the plural noun(s) earlier in the sentence ("Historians of the two rival workshops") | early | sg | sg | opp | aux: do | the BASE verb after the subject ("run"): "is the ... run" is ungrammatical; an -ing form would need "is" | aux-form | j\|m + "the" | does the | C | agr |

**Near for C6** is the last noun before the blank ("question"). **The blank in C6 is followed directly by the
subject's first modifier, never by "the"** (the options already contain it).

## Boundary slots (write ONLY your own)
The four options contain the SAME words in the SAME order and differ only in punctuation (capitalization may
differ after a period or question mark). The blank includes the word before the punctuation and the word after
it, so the passage never repeats either. **The four marks are fixed by the row; offer exactly these four.**
"Shifted" means the same mark one word later (a misplaced mark); it is the row's one at-a-glance option.

| Slot | Shape (not in the live bank) | Key | The four options (marks) | The lure that must tempt | Strikable at a glance (max 1) | Letter |
|---|---|---|---|---|---|---|
| A7 | A sentence that ends in an INDIRECT question ("Engineers wanted to know whether the basin had drained"), followed by a new sentence; the blank spans the last word of the question and the first word of the next sentence: "drained. Their" | period | period + capital, question mark + capital, comma + lower case, no mark + lower case | the question mark (it reads as a question); the comma (splice) | none | B |
| A8 | A complete clause followed by a sentence-final -ING participial phrase that describes the SUBJECT's action, where no mark would attach the participle to the object right before it: "The beetle chewed through the ___ a lace of veins behind it" with "leaf, leaving" | comma | comma, no mark, period + capital (fragment), colon | no mark (the object seems to do the leaving) | none | C |
| B7 | Two independent clauses; the second OPENS with a prepositional phrase that could attach backward to the first: "The colony collapsed in the ___ a decade the meadow had recovered" with "drought; within". The second clause must be a later event, NOT an explanation of the first, so a colon is wrong | semicolon | semicolon, comma (splice + backward attachment), no mark (run-on), colon | the comma | none | C |
| B8 | A compound PREDICATE (one subject, two verbs joined by "and"), the second verb with no subject of its own: "The crew drilled the ___ sealed it before noon" with "core and" | no mark | no mark, comma before "and", period + capital "And" (fragment), comma after "and" (shifted) | the comma before "and" | the comma after "and" | B |
| C7 | An opening INFINITIVE phrase of purpose whose last noun could be read as the start of the main clause: "To age the ___ team counted the layers by hand" with "cores, the". Never "to date" | comma | comma, no mark (garden path), period + capital (fragment), comma one word later ("cores the,") | no mark | the comma one word later | A |
| C8 | A restrictive appositive (role + name) with no commas, in a passage that names SEVERAL holders of the role, so the name is needed to say which one: "Three engravers cut the plates. Only the ___ signed his work" with "engraver Vidal" | no mark | no mark, comma pair (", Vidal,"), dash pair ("—Vidal—"), comma then dash (", Vidal—") | the comma pair; the dash pair | the comma-then-dash | D |

Notes on the boundary rows:
- A7: the next sentence's first word must be one whose lower-case form is plausible mid-sentence ("their",
  "most", "its"), so the comma and no-mark options are not struck by the capital letter alone.
- A8: choose a participle that the object noun could grammatically perform but plainly does not in context.
- B7: the opening phrase must be a time or place phrase that can end the first clause ("within a decade", "by
  the next spring", "across the valley").
- C8 replaces v23's C-08 option set {no mark, comma pair, comma only before, comma only after}, which had TWO
  strikable options. Here the comma pair and dash pair are both plausible nonrestrictive punctuation, and only the
  mixed pair is strikable.
- Never offer a semicolon or a colon directly before "and", "for", "but", "or", "nor", "yet" or "so".
- Never offer both a semicolon and a period, or both a colon and a single dash.

## Rules for every item
**Number (agreement items)**
- Key, Near, First, misleader position and After exactly as your row says.
- Where Near agrees with the key, the misleader must still be genuinely tempting from its own position (early or
  self). A careful but hurried reader should pick the wrong-number option.

**The second dimension stays inside the blank's sentence**
- The decider is in the blank's own sentence and is of the row's decider type. Quote it in `decider_quote`, name
  the type in `decider_type`, and quote it in the explanation.
- **Only the rows whose decider type is time-clause or time-phrase may contain a time conjunction in the
  blank's sentence** (when, whenever, while, until, till, before, after, once, "as" meaning while, "ago"). The
  other 12 agreement items use none of these anywhere in the blank's sentence, so the tense is never findable
  by scanning for a time clause.
- **Deletion test.** Delete the decider from the blank's sentence. The item must then become undecidable on the
  second dimension: no OTHER sentence may settle it on its own. If another sentence's tense would settle it,
  rewrite that sentence (a timeless present-tense framing sentence, or one whose verbs fit both readings). Write
  what happens in `deletion_test`.
- Banned ANYWHERE in your passages:
  - "since" in ANY sense, including causal; use "because";
  - "to this day", "to the present (day)", "until now", "so far", "thus far", "to date", "up to now";
  - "for the past/last N ...", "in recent years/decades", "lately", "recently", "nowadays", "at present",
    "currently";
  - duration anchors: "for more than a century", "for decades", "over the past ...", "throughout", "across those
    decades";
  - "on its own", "on their own", "by itself", "by themselves".
- "now", "still", "already", "yet", "once" may not appear in the blank's own sentence (A4's "ago" is the one
  time adverb allowed, and only there).
- No tense settled by a printed date or year.

**Every tense decider must make the wrong tense an ERROR, not a style choice.** The tense rows are settled only
by a time clause, a time phrase ("... ago") or a conditional (A3 if, B3 unless, C1 habitual if). Write out the
sentence with each wrong-tense option and confirm a copy editor would reject it. Never add a modal ("will",
"would") or a second finite verb as the decider: the pre-registration's Amendment 1 removed every slot that used
one.

**Options (agreement items)**
- `choices` is exactly your grid's 2x2, one lexical verb.
- No option contains a word the other three lack: no adverb, no "had", "would", "will" or any modal, no odd
  auxiliary.
- A word shared by all four options appears only in A1, A4, C1 (the shared complement), A5 ("own"), A2 ("by"), B1
  ("not", the one shared adverb allowed), C6 ("the") and in the pronoun slots (the verb).
- Pronoun slots: only the pronouns your grid names (its/their, it/them, that/those). Never a person pronoun.
- **A2 and B5 both use it/them.** In A2 the antecedent is a singular agent in the first clause, and the
  pronoun follows "by". In B5 the antecedent is a plural noun in an opening place clause, and the pronoun is the
  object of an active verb. Keep them that different.
- Key length divided by the shortest option's length must be < 1.6. Across your 8, the key may be the uniquely
  longest option at most 2 times and the uniquely shortest at most 2 times (the table already uses this:
  A: shortest A3, A4, longest A5; B: shortest B2, B8, longest B4, B5; C: shortest C2, C8, longest C6). Do not add a word that changes it.
- The key sits at your row's Letter. Order the other three so that no fixed pattern appears.
- The word immediately before the blank must NOT be the first word of every option. The word immediately after
  the blank must NOT be the last word of every option. No option may repeat the word just before the blank.

**Options (boundary items)**
- Identical words, identical order; only punctuation (and capitalization after a period or question mark)
  differs.
- Exactly the four marks in your row. Exactly one option correct under every convention of edited American
  English.
- The key is never decided by a mark already printed in the sentence (closing a printed pair, or copying a mark
  used in a parallel slot).

**Distractors and difficulty**
- Every distractor is grammatical in isolation and wrong only in context.
- No answer-resolving word within 4 words after the blank.
- At most 1 of the 3 distractors may be strikable without reading beyond the blank's clause. Ideally 0.
- No mark immediately after the blank in any agreement item (B6's comma comes after "not").
- C6 is the only fronted or inverted structure. B5 and C3 open with a short clause; no other slot opens with a
  phrase that delays the subject.
- **C6:** the subject's head noun and the base verb are both 5+ words after the blank.

**Banned traps**
- literary present, singular "they", "one" as a noun;
- collective nouns (team, committee, family, crew as a subject of the blank, ...), data/media;
- subjunctive (no "insist/require that");
- who/whom or any pronoun case; contractions; dictionary variants;
- "one of the ... that", "none of", "neither of", "the number of", "a series of", "a pair of".

**Templates that are already live or held (do not reuse any of them)**
- every frame in v23's live hard bank, including v23's six: "many a" + singular noun; a singular term + ", or
  [gloss]," appositive; "All that survives/remains of"; the clause-final auxiliary of a non-inverted comparative
  ("than the terraces do"); "So + adverb + PP" inversion; a topicalized (fronted) object;
- v23's eight kept-medium frames: split antecedent (singular head + plural of-phrase, the pronoun takes the
  of-noun); an absolute phrase between subject and verb; comma before coordinating "for"; no mark in "both X and
  Y"; "the former"; a semicolon before a quantifier pronoun clause; a colon before a final appositive list; the
  concessive "Adj as + subject + verb";
- v23's held and dropped frames: negative-adverb inversion ("Rarely/Seldom"); "more Xs than a single Y"; "Of
  greater concern ... is/were"; "Y, not X,"; ", the largest of which"; ", which" after "both the X and the Y";
  a content clause inside the subject + a possessive; one-referent compounds ("the founder and first director");
  a dash pair around a list between subject and verb;
- inversions of every kind except C6's direct question: "Only ...", "nor + does/has", "Not until ... do", So +
  adjective/adverb, Such-inversion, fronted adjective complement, fronted participle, locative, "here/there",
  "as + do/are", "than + do/are";
- "not X but Y"; "every X and every Y" and single-"every" compounds; "the X and the Y that"; "the latter";
  the comparative correlative;
- pseudo-coordination interrupters: as well as, along with, together with, with, rather than, in addition to,
  like/unlike, including, such as, plus;
- quantifier heads: "a number of", fractions, most/some/all of, a total of, a variety of, the majority of,
  "more than one";
- either/or, neither/nor, plain "or" proximity;
- clause, gerund or infinitive SUBJECTS (B6-style gerund phrases are fine only as the object of "of", as in C2);
- expletive "there"; floating "each"; it-cleft; "the only one of";
- "the [singular] of the [plural] that"; object relatives; "whose" relatives; "which" with a whole-clause
  antecedent; a relative clause with its own subject inside the subject; "between X and Y" modifiers; possessive
  attractors; comment clauses inside the SUBJECT; adverbial clauses between subject and verb; stacked PPs;
  infinitive modifiers; reduced participial relatives; a long participial modifier on the head;
- the second verb of a compound predicate (as an AGREEMENT item); two verbs in one option taking number from
  different nouns;
- plural-form singular nouns and titles; linking verb + complement of the other number;
- punctuation: no mark between a verb and its delayed object; no mark between a long subject and its verb (or
  inside it); a semicolon or period before a clause opening with a participle, that-, whether- or whatever-;
  ", and" / ", but" before a subordinate clause; "however" after a semicolon; a dash after a fronted list; a
  comma before a sentence-final absolute; a comma after a long introductory clause; "so ... that" with no mark; a
  colon before "one thing" or before a single NP with a relative clause.

**Passage, topic, names**
- 50-90 words, 2-4 sentences, academic register, American punctuation, double quotes, exactly one `______`. The
  blank is not always in the last sentence.
- Topic area by author: A life sciences, medicine, agriculture; B earth, space and physical sciences,
  engineering; C history, the arts, humanities, social sciences.
- `topic_tag` must not repeat any v10-v23 tag. List them with:

      cd /Users/andylee/Downloads/saas/classraum/scripts/study-bank && python3 -c "import json,glob;fs=glob.glob('sat-sec-hard-v1*.batch.json')+['sat-sec-hard-v22.batch.json','sat-sec-hard-v23.batch.json'];print(sorted({i.get('topic_tag') for f in fs for i in json.load(open(f)) if isinstance(i,dict) and i.get('topic_tag')}))"

- Prefer no proper nouns: use a role ("one ecologist"). Any name you use starts with a letter in YOUR range: A:
  A-H, B: I-P, C: Q-Z. Never reuse a name across your items. (C8 needs one name.)

**Explanation**
3-6 sentences. Agreement: name the true subject and why the misleader is not it; quote the deciding word(s) for
the second rule; say why EACH distractor fails, quoting it by its text. Boundary: name the structure on each side
of the blank, and why each wrong mark fails. Never write "option B" or "choice B".

## File format
**`<X>/items.json`** is a JSON array of 8 objects:

```json
{
  "id": "SEC24X-01",
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

Slot X1 is id SEC24X-01, and so on to X8 = SEC24X-08. `correct_answer` is character-identical to one entry of
`choices`, at your row's Letter. `subskill` begins "form: " for X1-X6 and "boundaries: " for X7-X8.

**`<X>/declarations.json`** is a JSON array of 8 objects. Agreement items:

```json
{
  "id": "SEC24X-01",
  "slot": "X1",
  "frame": "...",
  "true_subject_head": "word",
  "misleader_words": ["word(s) in the passage"],
  "misleader_position": "adj | early | self",
  "key_number": "sg | pl",
  "near_noun": {"word": "...", "number": "sg | pl"},
  "first_noun_of_sentence": {"word": "...", "number": "sg | pl"},
  "after_noun_within_8": {"word": "...", "number": "sg | pl"},
  "dimension": "tense | aspect | aux | pronoun",
  "dimension_key": "present | past | non-perfect | have | do | be | sg | pl",
  "decider_type": "time-clause | time-phrase | modal | parallel-verb | conditional | pronoun-antecedent | aux-form",
  "decider_quote": "the exact words in the blank's sentence that settle the second rule (a string or an array)",
  "deletion_test": "what happens when the decider is deleted: which options stay grammatical, and why no other sentence settles it",
  "pronoun_antecedent": {"word": "...", "number": "sg | pl"},
  "grid": {"code": "i|j", "forms": ["was X", "were X", "is X", "are X"]},
  "key_letter": "A | B | C | D",
  "next_four_words_after_blank": "...",
  "length_ratio": 1.23,
  "distractor_kills": {"<distractor text>": "the passage words that rule it out, and how far from the blank"},
  "hostile_reader": {"options_only_pick": "...", "heuristics_that_give_key": ["..."], "changed": "what you changed, or none"}
}
```

`near_noun.word` must be one of the 4 words just before the blank. `pronoun_antecedent` only in A2, A5, B5, C4, C5.
`first_noun_of_sentence` is the first noun of the whole sentence that contains the blank, even when it sits in an
opening clause. Write `after_noun_within_8` as null if there is no noun within 8 words after the blank. Grid
codes: write the A4 grid as "i|r", the pronoun grids as "n+p", "a+p", "j+p" or "c+p".

Boundary items:

```json
{
  "id": "SEC24X-07",
  "slot": "X7",
  "frame": "...",
  "key_mark": "period | comma | semicolon | none",
  "key_letter": "A | B | C | D",
  "structure": "what stands on each side of the blank",
  "glance_fail": ["the option text(s) a test-taker can strike without parsing; at most one"],
  "distractor_kills": {"<distractor text>": "why that mark fails here"},
  "hostile_reader": {"options_only_pick": "...", "heuristics_that_give_key": ["..."], "changed": "what you changed, or none"}
}
```

## Loop
1. Write items in slot order. After every 2 items, save both files: disk is the only record of your progress.
2. After all 8, run the counts on your own file (it will flag the other authors' slots as missing from the
   batch-level quotas; read your own rows):

       cd /Users/andylee/Downloads/saas/classraum && node scripts/study-bank/sec24-brief-counts.mjs scripts/study-bank/sat-sec-v24-work/<X>/items.json --decl scripts/study-bank/sat-sec-v24-work/<X>/declarations.json

   Fix every flag on YOUR ids (table row, grid, letter, option marks, decider type, decider not in sentence,
   shared word, banned words, length). The NOTES section is a hand read; it does not fail you.
3. Run the near-duplicate check against every live SEC row:

       cd /Users/andylee/Downloads/saas/classraum && set -a && source .env.local && set +a && node scripts/study-bank/sec-near-dup.mjs scripts/study-bank/sat-sec-v24-work/<X>/items.json

   Change any item whose passage trigram Jaccard is >= 0.20 with a live row, or whose option set is IDENTICAL
   as strings to a live item's. A skeleton-only match is expected for verb grids: record it in
   `hostile_reader.changed` and leave it. If the script refuses (exit 2), report that; do not treat it as clean.
4. Run the hostile-reader check below and fix what it finds. Then report.

## Before you finish: hostile-reader check
Do this as a reader who wants to score points WITHOUT doing the grammar. Write the results into
`hostile_reader` per item.

1. **Options only.** Cover the passage. Can you pick or strike an option: the odd one out, the only one with an
   extra word, the longest, the only strong mark, the only unmarked one? With a clean 2x2 or the row's mark set
   the answer must be no beyond what the row already accepts.
2. **Blank's clause only.** Read only the clause containing the blank. Can you settle the number from the word
   right before the blank, or the second rule from a word right next to it? Then the item is medium; move the
   evidence. For each distractor, is the evidence against it more than a few words from the blank?
3. **The named heuristics, across your 6 agreement items.** Apply each blindly and count the keys it gets:
   - (a) pick the number opposite the noun right before the blank (your rows: about half);
   - (b) agree with the first noun of the sentence;
   - (c) find a when/while/until/before clause and copy its tense (must only work on your time rows);
   - (d) the option with an extra word loses;
   - (e) "been" or "being" wins or loses;
   - (f) in pronoun items, the verb and pronoun share a number (your rows: half of the pronoun items).
   If one gets 5 or more of 6, change an item, not the count on paper.
4. **Across items.** Lay your 8 side by side. Do two share a sentence skeleton, an option wording, the same
   blank position, the same kind of thing after the blank, or the same topic shape? Would solving one teach you
   another? If yes, change one. Make sure none shares a frame or misleader with another author's rows.
5. **Exclusivity.** For each distractor, write the sentence in which it WOULD be correct, then confirm the
   passage rules it out without dispute. For every tense row, confirm each wrong tense is an error (rule above). If you
   hesitate on any distractor, a grader will dispute the key and the item is lost.
6. **Be the grader.** Would a strong grader call this medium because one decision is visible next to the blank?
   If so, push the evidence away from the blank, but keep it in the blank's sentence. Authors' hard labels have
   been demoted in every batch so far; the panel decides.

## Process rules
- Write only inside `scripts/study-bank/sat-sec-v24-work/<X>/`. Never touch another author's folder or any other
  file. No database writes, no git.
- NEVER run pkill, killall, or any command that kills processes.
- Do not call any model API, and never use GPT or any non-Claude model.
- When done, report: the 8 ids; per slot, the key and letter; your heuristic counts from step 3; the counts
  script's flags on your ids (should be none); the near-dup result line; and any row you could not meet exactly, with the reason. Do not bend a row silently.
