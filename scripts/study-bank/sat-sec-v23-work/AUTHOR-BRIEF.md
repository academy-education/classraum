# sat-sec-hard-v23 author brief (Digital SAT Standard English Conventions, HARD)

You are author **X**, where X is A, B or C; your run prompt says which. You write **8** Digital SAT Reading &
Writing **Standard English Conventions** items aimed at **hard**: **6 agreement items** (slots X1-X6) and **2
boundary (punctuation) items** (slots X7-X8). Each item is one of your 8 slots in the tables below. The
pre-registration is `scripts/study-bank/PREREG-SEC23-2026-10-23.md`. You do not need to read it: everything you
must follow is in this file. Read the whole file before writing anything.

Repo root: `/Users/andylee/Downloads/saas/classraum`. Write ONLY these two files:
- `scripts/study-bank/sat-sec-v23-work/<X>/items.json`
- `scripts/study-bank/sat-sec-v23-work/<X>/declarations.json`

## What a hard item here looks like
A short academic passage (50-90 words, 2-4 sentences) with one blank written as six underscores, `______`.
Four options. Exactly one is correct.

- **Agreement item.** The reader must find the true subject past a real misleader AND apply a second rule
  (tense, aspect, auxiliary type, or which noun a pronoun refers to). **Both decisions are settled inside the
  sentence that contains the blank.**
- **Boundary item.** The four options contain the same words in the same order and differ only in
  punctuation. The reader must parse the sentence's structure to see which mark is right.

Every distractor is something that would be correct in SOME sentence. It is wrong only in THIS one.

Panel graders call an item hard when a strong student must work for both decisions. They call it medium when
either decision is visible next to the blank.

## Why the rules below exist
The last batch (v22) was 24 agreement items. Three independent graders found **cross-item tells**, patterns that
answer many items without reading them. Each rule below breaks one. Do not reproduce any of them:
1. **"Every item is the same 2x2: number crossed with one second axis."** Settle the second axis from the other
   verbs and every item halves. This batch mixes tense, aspect, auxiliary and pronoun grids with punctuation
   items.
2. **"Skip the noun right before the blank; agree with the first noun of the clause."** In v22 the noun before
   the blank was almost always the wrong number. Here it AGREES with the key in half the agreement slots, and in
   seven slots the subject is not the first noun of its clause.
3. **"The later sentence always holds the cue."** Six v22 items settled the second axis from a later sentence
   ("remains attached", "stopped accepting", "spread by itself"). Here the cue is inside the blank's sentence,
   and no other sentence may settle it.
4. **Voice decided only by meaning.** "are germinated" is a grammatical passive; "the seeds sprout on their own"
   did not make it wrong. Two items were lost. No item here varies voice, and none varies simple against
   progressive (v22 lost "is spreading" vs "spreads": both grammatical).

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
| m | does / do | n | has / have |
| a+p | V-s / V crossed with its / their | | |

Examples: `c|h` with "survey" = {is surveyed, are surveyed, was surveyed, were surveyed}. `a+p` with "draw ...
from" = {draws from its, draw from its, draws from their, draw from their}. `m|n` + "its" = {does its, do its,
has its, have its}.

Voice is the same in all four options of every grid (c/h, k/l, e/h are passive throughout). Progressive is the
same in all four (b/g, k/l, f/g are progressive throughout). Never mix them.

## Agreement slots (write ONLY your own)
Column meanings:
- **Key**: the verb's number. **Pron**: in A2/C3, the key pronoun's number.
- **Near**: the number of the noun immediately before the blank. In an inversion, the last noun of the fronted
  phrase. In B5, "which", counted as its antecedent's number.
- **Pos**: where the misleader sits. `adj` = immediately before the blank; `early` = earlier in the sentence;
  `self` = the subject word itself; `after` = after the blank.
- **First**: the first noun of the blank's clause, against the key: `agr` same number, `opp` other number.
- **After**: the first noun within 8 words after the blank: `opp` = the wrong number (never within 4 words if it
  would resolve the item), `agr`, `free`.
- **Letter**: where the key must sit in `choices` (A = first).

| Slot | Frame | Misleader | Pos | Key | Near | First | 2nd dim: key | Decider (inside the blank's sentence) | Grid | Key form | Letter | After |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A1 | Negative-adverb inversion: "Seldom" or "Rarely" + a short PP, then the auxiliary, then a PLURAL postposed subject whose head noun is 5+ words after the blank. All four options share "its" (the subject's determiner, referring back to a singular noun named earlier) | the shared singular "its" and a singular noun early in the fronted phrase | early | pl | pl | opp | aux: have | the lexical verb's PARTICIPLE, 5+ words after the blank; pick a verb whose base and participle differ (show/shown, grow/grown, give/given, rise/risen, take/taken) | m\|n + "its" | have its | C | agr |
| A2 | A singular head + an of-PP whose noun is plural; the verb agrees with the head, and a possessive pronoun in the options refers to the PP noun ("The bark of these birches ___ trunks ..." -> "peels from their") | the PP noun, which really is the pronoun's antecedent | adj | sg | pl | agr | pronoun: pl | the pronoun's only possible antecedent in the sentence (the head cannot own the thing named) | a+p | V-s ... their | A | free |
| A3 | "Many a" + singular noun as the subject ("Many a beekeeper ...") | "many" reads plural | self | sg | sg | agr | tense: present | a present-tense finite verb in a subordinate clause of the same sentence | i\|j (bare, or with a shared complement word) | is | D | opp |
| A4 | Plural head + an absolute phrase (its own noun + participle) set off by commas, ending in a singular noun, between subject and verb ("The two hulls, their keel split, ___") | the noun inside the absolute phrase | adj | pl | sg | agr | tense: present | a present-tense finite verb in a while/as/when clause of the same sentence | b\|g | are V-ing | B | free |
| A5 | Comparative quantifier subject: "More [plural noun] than a single [singular noun] ..." | the "a single [noun]" comparand | adj | pl | sg | agr | tense: past | a past-tense finite verb in a subordinate clause of the same sentence | c\|h | were V-en | A | agr |
| A6 | A singular technical term + ", or [plural gloss]," an appositive gloss that ENDS on a singular noun ("Tephra, or the glassy fragments thrown out by an eruption, ___") | the plural noun early in the gloss; "or" read as a disjunction | early | sg | sg | agr | tense: present | a present-tense finite verb in the same sentence | k\|l | is being V-en | C | opp |
| B1 | Fronted PP complement + be + PLURAL postposed subject, head 5+ words after the blank: "Of greater concern to the [plural noun] ___ [shared word] ..." All four options share the subject's next word, which must be a NUMERAL ("two", "three"): never "the" or "its" | the singular head word of the fronted phrase ("concern", "interest") | early | pl | pl | opp | tense: past | a past-tense finite verb in a relative or subordinate clause of the same sentence | i\|j + shared word | were + word | D | agr |
| B2 | "All that survives/remains of the [plural noun] ___" as the subject | "all" reads plural; the plural of-noun is adjacent | adj | sg | pl | opp | aspect: past | a definite-past when/after clause with a finite verb in the same sentence (present perfect cannot take a definite past time, so "has been V-en" is wrong) | e\|h | was V-en | B | opp |
| B3 | "The former" resuming the SINGULAR first member of a mixed pair named in an earlier sentence ("a single X and two Ys"); a short interrupter after "The former" ends on a plural noun | the adjacent plural, and the question of which member is "former" | adj | sg | pl | agr | tense: present | a present-tense finite verb in a subordinate clause of the same sentence | c\|h | is V-en | A | opp |
| B4 | "Y, not X," the affirmed element FIRST, then a comma-set negated element of the other number right before the blank ("The tides, not the moon's pull alone, ___") | the negated element | adj | pl | sg | agr | tense: past | a past-tense finite verb in an as/when clause of the same sentence | b\|g | were V-ing | C | agr |
| B5 | Nonrestrictive partitive relative after a plural antecedent: ", the [superlative] of which ___" ("three basins, the largest of which ___") | the plural antecedent of "of which" | early | sg | pl | agr | tense: past | a past-tense finite verb in a subordinate clause of the same sentence | k\|l | was being V-en | B | free |
| B6 | The clause-final verb of a NON-inverted comparative: "[main clause] than the [plural noun] in the ... ___" (subject before the blank); its auxiliary copies the main verb's type: a lexical main verb takes "do", a be + adjective main clause takes "are" | the main clause's singular subject | early | pl | pl | agr | aux: do | the main clause's lexical finite verb ("drains", "absorbs") | j\|m | do | D | free |
| C1 | "So + adverb + PP" fronted ("So widely across the river towns and their markets ___"), auxiliary inversion, a SINGULAR postposed subject with its head 5+ words after the blank, then a result that-clause. All four options share the subject's next word, which must be an ADJECTIVE that is not a participle ("cheap", "single", never an -ed/-en word): never "the", "its" or a numeral | the plural noun that opens the fronted phrase, and the plural Near | early | sg | pl | opp | aux: be | the participle or -ing form after the subject ("copied", "circulating"); a base form would need "does" | j\|m + shared word | is + word | B | agr |
| C2 | Nonrestrictive ", which ___" after a correlative compound antecedent "both the [singular] and the [singular]" | the nearer singular conjunct | adj | pl | sg | opp | tense: present | a present-tense finite verb in a subordinate clause of the same sentence | k\|l | are being V-en | D | opp |
| C3 | A content clause inside the subject ("The claim that the guild's members forged the seal ___") + a possessive pronoun on the main verb; the verb and the pronoun both refer to the head noun | the content clause's plural subject, whose own verb shows plural | early | sg | sg | agr | pronoun: sg | the head noun, the only antecedent that fits ("owes its credibility") | a+p | V-s ... its | C | free |
| C4 | A compound subject naming ONE person with a single determiner ("The founder and first director of the collection ___"); the passage makes plain it is one person, but never within 4 words after the blank | "and" reads plural | self | sg | sg | agr | tense: past | a past-tense finite verb in a subordinate clause of the same sentence | b\|g | was V-ing | A | agr |
| C5 | A concessive clause "Adjective/Adverb + as + subject + ___," before the main clause ("Faded as the frescoes in the two side chapels ___, the restorer ...") | the main clause's singular subject right after the blank | after | pl | pl | agr | tense: present | the main clause's present-tense finite verb | i\|j bare | are | C | opp |
| C6 | A topicalized (fronted) object noun phrase before a full plural subject + verb ("This ledger the two archivists ___ line by line when ...") | the fronted singular object | early | pl | pl | opp | aspect: past | a definite-past when clause with a finite verb in the same sentence | f\|g | were V-ing | A | free |

## Boundary slots (write ONLY your own)
The four options contain the SAME words in the SAME order and differ only in punctuation. The blank includes the
word before the punctuation (so the passage never repeats it). Exactly one option is correct.

| Slot | Shape | Key | The lure that must tempt | Never offer | Letter |
|---|---|---|---|---|---|
| A7 | Two independent clauses joined by a coordinating "for" (= because). Without a comma, "for" reads as a preposition attaching to the first clause: "Growers harvest the grapes before ___ fruit picked in the afternoon heat loses ..." with options "dawn, for", "dawn for", "dawn; for", "dawn: for" | comma | no mark (the garden path); the semicolon and colon are wrong before a coordinating conjunction | a period | D |
| A8 | No mark between the halves of a "both X and Y" correlative whose X is long (X carries a PP or a relative clause) | no mark | a comma before "and" after the long X | a dash pair | B |
| B7 | A semicolon before an independent clause whose subject is a bare quantifier pronoun (both / several / all / most) right after a plural noun: "The lab tested two alloys under ___ broke before ..." A comma makes the quantifier read as an appositive. The verb must not double as a participle: use broke, grew, froze, sank, rose | semicolon | the comma (appositive reading) | a period or a colon: both would also be correct | C |
| B8 | A colon before a sentence-final appositive LIST after a complete clause that itself ends a series ("The kiln fired pots, bowls, and three kinds of ___ tiles, floor tiles, and drain tiles."). A comma merges the two lists; a semicolon leaves a fragment | colon | comma (merged series) | a dash (would also be correct) | A |
| C7 | A dash pair, BOTH marks inside the option, around an appositive list that contains commas, between a noun and its verb: options like "grave goods—jars, bowls, and lamps—have" against the comma pair, a dash/comma mismatch, and no marks | dash pair | the comma pair (reads as a longer subject list, then a comma before the verb) | nothing may be printed in the passage that the key must match | B |
| C8 | A restrictive appositive (role + name) with no commas, in a passage that names several holders of the role ("The expedition had three surgeons. Only the ___ kept a daily journal." with "surgeon Ruiz", "surgeon, Ruiz,", "surgeon, Ruiz", "surgeon Ruiz,") | no mark | the comma pair (nonrestrictive) | none | D |

## Rules for every item
**Number (agreement items)**
- Key, Near, First, misleader position and After exactly as your row says.
- Where Near agrees with the key, the misleader must still be genuinely tempting from its own position (early,
  self or after). A careful but hurried reader should pick the wrong-number option.

**The second dimension stays inside the blank's sentence**
- The decider is in the blank's own sentence: a finite verb (tense, aspect), or the grammar your row names (the
  later verb form for auxiliary type; the antecedent for a pronoun). Quote it in `decider_quote` and in the
  explanation.
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
- "now", "still", "already", "yet", "once" may not appear in the blank's own sentence.
- No tense settled by a printed date or year.

**Options (agreement items)**
- `choices` is exactly your grid's 2x2, one lexical verb.
- No option contains a word the other three lack: no adverb, no "had", "would", "will" or any modal, no odd
  auxiliary.
- A word shared by all four options only in A1 ("its"), B1 (a numeral) and C1 (an adjective); never an adverb.
  **A1 must not use "the"**: a live item's option set is exactly {does the, do the, has the, have the}, and an
  identical option set is held.
- Pronoun slots (A2, C3): only "its" and "their", never a person pronoun.
- Key length divided by the shortest option's length must be < 1.6. **C5's key is "are"** (never "were": "were"
  against "is" is 2.0). Across your 8, the key may be the uniquely longest option at most 2 times and the
  uniquely shortest at most 2 times; the table already uses that allowance for A and B, so do not add a shared
  word that changes it.
- The key sits at your row's Letter. Order the other three so that no fixed pattern appears.
- The word immediately before the blank must NOT be the first word of every option. The word immediately after
  the blank must NOT be the last word of every option. No option may repeat the word just before the blank.

**Options (boundary items)**
- Identical words, identical order; only punctuation differs.
- Exactly one option is correct under every convention of edited American English. Never offer both a semicolon
  and a period; never both a colon and a single dash.
- The key is never decided by a mark already printed in the sentence (closing a printed pair, or copying a mark
  used in a parallel slot).
- At most one distractor may be a misplaced mark that fails at a glance (the free-strike allowance).

**Distractors and difficulty**
- Every distractor is grammatical in isolation and wrong only in context.
- No answer-resolving word within 4 words after the blank.
- At most 1 of the 3 distractors may be strikable without reading beyond the blank's clause. Ideally 0.
- No interrupter mark immediately after the blank, except C5 (the concessive comma) and B6.
- A1, B1 and C1 are fronted by design. No other slot opens with a long fronted phrase that delays the decider.
- **Inversions (A1, B1, C1):** the subject's head noun is 5+ words after the blank. In A1 and C1 the deciding
  verb form is too.

**Banned traps**
- literary present, singular "they", "one" as a noun;
- collective nouns (team, committee, family, ...), data/media;
- subjunctive (no "insist/require that");
- who/whom or any pronoun case; contractions; dictionary variants;
- "one of the ... that", "none of", "neither of", "the number of", "a series of", "a pair of".

**Templates that are already live or held (do not reuse any of them)**
- inversions: "Only ...", "nor + does/has", "Not until ... do", So + ADJECTIVE + be, Such-inversion, fronted
  adjective complement ("Far more puzzling ... has been"), fronted -ing or -ed participle inversion, locative
  inversion, "here/there" inversion, "as + do/are", "than + do/are" inversion;
- "not X but Y"; "every X and every Y" and single-"every" compounds; "the X and the Y that";
- "the latter"; the comparative correlative "the more ... the more";
- pseudo-coordination interrupters: as well as, along with, together with, with, rather than, in addition to,
  like/unlike, including, such as;
- quantifier heads: "a number of", fractions, most/some/all of, a total of, a variety of, the majority of,
  "more than one";
- either/or, neither/nor, plain "or" proximity;
- clause, gerund or infinitive subjects (whether-, that-, where-, what-clauses);
- expletive "there"; floating "each"; it-cleft; "the only one of";
- "the [singular] of the [plural] that"; object relatives "the Xs that the Y ___"; "whose" relatives; "which"
  with a whole-clause antecedent; a relative clause with its own subject inside the subject; "between X and Y"
  modifiers; possessive attractors "[plural]' [singular]"; comment clauses ("one survey suggests"); adverbial
  clauses between subject and verb; stacked PPs; infinitive modifiers; reduced participial relatives;
- the second verb of a compound predicate; two verbs in one option taking number from different nouns;
- plural-form singular nouns and titles; linking verb + complement of the other number;
- punctuation: no mark between a verb and its delayed object; no mark between a long subject and its verb; a
  semicolon or period before a clause opening with a participle, that-, whether- or whatever-; ", and" / ", but"
  before a subordinate clause; "however" after a semicolon; a dash after a fronted list; a comma before a
  sentence-final absolute; "so ... that" with no mark; a colon before "one thing" or before a single NP with a
  relative clause.

**Passage, topic, names**
- 50-90 words, 2-4 sentences, academic register, American punctuation, double quotes, exactly one `______`. The
  blank is not always in the last sentence.
- Topic area by author: A life sciences, medicine, agriculture; B earth, space and physical sciences,
  engineering; C history, the arts, humanities, social sciences.
- `topic_tag` must not repeat any v10-v22 tag. List them with:

      cd /Users/andylee/Downloads/saas/classraum/scripts/study-bank && python3 -c "import json,glob;fs=glob.glob('sat-sec-hard-v1*.batch.json')+['sat-sec-hard-v22.batch.json'];print(sorted({i.get('topic_tag') for f in fs for i in json.load(open(f)) if isinstance(i,dict) and i.get('topic_tag')}))"

- Prefer no proper nouns: use a role ("one ecologist"). Any name you use starts with a letter in YOUR range: A:
  A-H, B: I-P, C: Q-Z. Never reuse a name across your items.

**Explanation**
3-6 sentences. Agreement: name the true subject and why the misleader is not it; quote the deciding word(s) for
the second rule; say why EACH distractor fails, quoting it by its text. Boundary: name the structure on each side
of the blank, and why each wrong mark fails. Never write "option B" or "choice B".

## File format
**`<X>/items.json`** is a JSON array of 8 objects:

```json
{
  "id": "SEC23X-01",
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

Slot X1 is id SEC23X-01, and so on to X8 = SEC23X-08. `correct_answer` is character-identical to one entry of
`choices`, at your row's Letter. `subskill` begins "form: " for X1-X6 and "boundaries: " for X7-X8.

**`<X>/declarations.json`** is a JSON array of 8 objects. Agreement items:

```json
{
  "id": "SEC23X-01",
  "slot": "X1",
  "frame": "...",
  "true_subject_head": "word",
  "misleader_words": ["word(s) in the passage"],
  "misleader_position": "adj | early | self | after",
  "key_number": "sg | pl",
  "near_noun": {"word": "...", "number": "sg | pl"},
  "first_noun_of_clause": {"word": "...", "number": "sg | pl"},
  "after_noun_within_8": {"word": "...", "number": "sg | pl"},
  "dimension": "tense | aspect | aux | pronoun",
  "dimension_key": "present | past | non-perfect | have | do | be | sg | pl",
  "decider_quote": "the exact words in the blank's sentence that settle the second rule (a string or an array)",
  "deletion_test": "what happens when the decider is deleted: which options stay grammatical, and why no other sentence settles it",
  "pronoun_antecedent": {"word": "...", "number": "sg | pl"},
  "grid": {"code": "c|h", "forms": ["is V-en", "are V-en", "was V-en", "were V-en"]},
  "key_letter": "A | B | C | D",
  "next_four_words_after_blank": "...",
  "length_ratio": 1.23,
  "distractor_kills": {"<distractor text>": "the passage words that rule it out, and how far from the blank"},
  "hostile_reader": {"options_only_pick": "...", "heuristics_that_give_key": ["..."], "changed": "what you changed, or none"}
}
```

`near_noun.word` must be one of the 4 words just before the blank (in B5, "which"). `pronoun_antecedent` only in
A2/C3. Write `after_noun_within_8` as null if there is no noun within 8 words after the blank.

Boundary items:

```json
{
  "id": "SEC23X-07",
  "slot": "X7",
  "frame": "...",
  "key_mark": "comma | none | semicolon | colon | dash pair",
  "key_letter": "A | B | C | D",
  "structure": "what stands on each side of the blank",
  "distractor_kills": {"<distractor text>": "why that mark fails here"},
  "hostile_reader": {"options_only_pick": "...", "heuristics_that_give_key": ["..."], "changed": "what you changed, or none"}
}
```

## Loop
1. Write items in slot order. After every 2 items, save both files: disk is the only record of your progress.
2. After all 8, run the counts on your own file (it will flag the other authors' slots as missing from the
   batch-level quotas; read your own rows):

       cd /Users/andylee/Downloads/saas/classraum && node scripts/study-bank/sec23-brief-counts.mjs scripts/study-bank/sat-sec-v23-work/<X>/items.json --decl scripts/study-bank/sat-sec-v23-work/<X>/declarations.json

   Fix every flag on YOUR ids (table row, grid, letter, decider not in sentence, banned words, length).
3. Run the near-duplicate check against every live SEC row:

       cd /Users/andylee/Downloads/saas/classraum && set -a && source .env.local && set +a && node scripts/study-bank/sec-near-dup.mjs scripts/study-bank/sat-sec-v23-work/<X>/items.json

   Change any item whose passage trigram Jaccard is >= 0.20 with a live row, or whose option set is IDENTICAL
   as strings to a live item's. A skeleton-only match is expected for verb grids: record it in
   `hostile_reader.changed` and leave it. If the script refuses (exit 2), report that; do not treat it as clean.
4. Run the hostile-reader check below and fix what it finds. Then report.

## Before you finish: hostile-reader check
Do this as a reader who wants to score points WITHOUT doing the grammar. Write the results into
`hostile_reader` per item.

1. **Options only.** Cover the passage. Can you pick or strike an option: the odd one out, the only one with an
   extra word, the longest, the only strong mark? With a clean 2x2 or a clean mark set the answer must be no.
2. **Blank's clause only.** Read only the clause containing the blank. Can you settle the number from the word
   right before the blank, or the second rule from a word right next to it? Then the item is medium; move the
   evidence. For each distractor, is the evidence against it more than a few words from the blank?
3. **The named heuristics, across your 6 agreement items.** Apply each blindly and count the keys it gets:
   - (a) pick the number opposite the noun right before the blank (your rows: about half);
   - (b) agree with the first noun of the clause;
   - (c) the later sentence holds the tense cue (must get 0: run the deletion test);
   - (d) the option with an extra word loses;
   - (e) "been" or "being" wins or loses;
   - (f) in pronoun items, the verb and pronoun share a number.
   If one gets 5 or more of 6, change an item, not the count on paper.
4. **Across items.** Lay your 8 side by side. Do two share a sentence skeleton, an option wording, the same
   blank position, the same kind of thing after the blank, or the same topic shape? Would solving one teach you
   another? If yes, change one. Make sure none shares a frame or misleader with another author's rows.
5. **Exclusivity.** For each distractor, write the sentence in which it WOULD be correct, then confirm the
   passage rules it out without dispute. If you hesitate on any distractor, a grader will dispute the key and
   the item is lost. v22 lost 4 of 24 this way: a passive that was grammatical, "is spreading" vs "spreads", and
   a relative "that" that could attach to two nouns.
6. **Be the grader.** Would a strong grader call this medium because one decision is visible next to the blank?
   If so, push the evidence away from the blank, but keep it in the blank's sentence. Authors' hard labels have
   been demoted in every batch so far; the panel decides.

## Process rules
- Write only inside `scripts/study-bank/sat-sec-v23-work/<X>/`. Never touch another author's folder or any other
  file. No database writes, no git.
- NEVER run pkill, killall, or any command that kills processes.
- Do not call any model API, and never use GPT or any non-Claude model.
- When done, report: the 8 ids; per slot, the key and letter; your heuristic counts from step 3; the counts
  script's flags on your ids (should be none); the near-dup result line; and any row you could not meet exactly,
  with the reason. Do not bend a row silently.
