# sat-sec-hard-v22 author brief (Digital SAT Standard English Conventions, HARD)

You are author **X**, where X is A, B or C; your run prompt says which. You write **8**
Digital SAT Reading & Writing **Standard English Conventions** items, all **subject-verb
agreement**, all aimed at **hard**. Each item is one of your 8 slots in the table below. The
pre-registration is `scripts/study-bank/PREREG-SEC22-2026-10-23.md`. You do not need to read
it: everything you must follow is in this file. Read the whole file before writing anything.

Repo root: `/Users/andylee/Downloads/saas/classraum`. Write ONLY these two files:
- `scripts/study-bank/sat-sec-v22-work/<X>/items.json`
- `scripts/study-bank/sat-sec-v22-work/<X>/declarations.json`

## What a hard item here looks like
A short academic passage (50-90 words, 2-4 sentences) with one blank written as six
underscores, `______`. Four verb-form options. Exactly one is correct, and only once the
reader has found the true subject AND applied a second rule (voice, aspect, tense, progressive,
or auxiliary type) using information elsewhere in the passage. Every distractor must be a
grammatical verb form that would be correct in SOME sentence. It is wrong only in THIS context.

Panel graders call an item hard when a strong student must do both of these:
- track the subject past a real misleader;
- read another clause or sentence to settle the second rule.

They call it medium when either decision is visible next to the blank.

## Why the rules below exist
The last batch (v17) was 12/14 hard on agreement. But three independent graders found
**cross-item tells**: patterns that let a test-taker answer many items without reading them.
Each rule below breaks one. Do not reproduce any of these:
1. **"A plural noun near the blank means a singular key."** Two thirds of v17's keys were
   singular, and an earlier or later plural always sat "near" the blank.
2. **"since" / "to the present day" means present perfect.** The time adverbial was planted
   conspicuously and decided aspect by itself.
3. **"An object after the interrupter means active voice."** Every active key had the same
   device: blank, comma interrupter, then the object.
4. **"An option with an extra adverb or an odd auxiliary never wins."** Options like "was once"
   or "is now" next to plain forms were always wrong.

Also: v17 put an interrupter right after the blank so often that the placement itself became
recognisable. And two items that shared a misleader, a frame or an option grid were named as
one template, and one of them was thrown away. **The more rigid the pattern across your 8, the
more the answer becomes predictable from the pattern rather than from the passage.**

## The construction table (all 24 slots; write ONLY your own 8)
Column meanings:
- **Key** is the key's number (pl/sg).
- **Near** is the number of the noun immediately before the blank:
  - in an inversion, the last noun of the fronted phrase;
  - in A3, the -s subject itself;
  - in B6, the noun closing the short phrase that ends at the blank;
  - in A7, the subject of the second half.
- **Pos** is where the misleader sits: `adj` = immediately before the blank; `early` = earlier in
  the sentence; `self` = the subject word itself.
- **After** is the first noun within 8 words after the blank:
  - `opp` = it has the WRONG number (a second attractor, never within 4 words if it would
    resolve the item);
  - `agr` = it has the key's number;
  - `free` = your choice.
- **Letter** is where the key must sit in `choices` (A = first).

**Grid** column codes. Each grid is a complete 2x2 = 4 options: two numbers x two forms.

| code | sg / pl | code | sg / pl |
|---|---|---|---|
| a | V-s / V | i | was / were |
| b | is / are V-ing | j | is / are |
| c | is / are V-en (passive) | k | is / are being V-en |
| d | has / have V-en | l | was / were being V-en |
| e | has / have been V-en | m | does / do |
| f | has / have been V-ing | n | has / have |
| g | was / were V-ing | r | has / have been + complement |
| h | was / were V-en (passive) | | |

Example: grid `g|h` with the verb "steer" gives {was steering, were steering, was steered,
were steered}. One lexical verb per item, and the same verb in all four options.

| Slot | Frame | Misleader | Pos | Key | Near | 2nd dim: key | Decider / device | Grid | Key form | Letter | After |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A1 | "as well as" pseudo-coordination after a PLURAL head | added member of opposite number | adj | pl | sg | voice: active | D2 | a\|c | V (pl) | C | opp |
| A2 | "a number of" + plural noun | head word "number" reads singular | early | pl | pl | aspect: perfect | a present-tense verb in a later sentence states the current consequence | d\|g | have V-en | A | agr |
| A3 | plural-form singular noun (a condition or discipline name: rickets, genetics, ...) | -s morphology reads plural | self | sg | pl | tense: present | present-tense verbs of the frame | c\|h | is V-en | D | free |
| A4 | absolute phrase (its own noun + participle) between subject and verb | noun inside the absolute phrase | early | sg | sg | progressive: progressive | an overlapping action in a when/while clause with a simple verb | a\|b | is V-ing | B | opp |
| A5 | object relative clause "the Xs that the Y ___" | antecedent of opposite number | early | sg | sg | voice: active | D1 | g\|h | was V-ing | D | agr |
| A6 | plural head + reduced participial relative ending in a singular noun | noun closing the reduced relative | adj | pl | sg | voice: passive | D4 | d\|e | have been V-en | B | free |
| A7 | comparative correlative with fronted object, "the more Xs a single Y ___" | fronted object of opposite number | early | sg | sg | aspect: non-perfect | the parallel present verb in the first half of the correlative | a\|d | V-s | A | opp |
| A8 | nonrestrictive relative after a possessive NP, "[sg]'s [pl], which ___" | possessor of opposite number | early | pl | pl | aspect: perfect | a present-tense verb in another sentence shows the activity continuing | f\|g | have been V-ing | C | agr |
| B1 | restrictive relative clause with its OWN singular subject and verb inside a plural subject | subject/verb of the embedded relative clause | adj | pl | sg | tense: past | past-tense narrative verbs in the surrounding sentences | b\|g | were V-ing | C | agr |
| B2 | adverbial clause (when/because/although ...) between subject and verb | subject of the interrupting adverbial clause | adj | pl | sg | voice: passive | D3 | b\|k | are being V-en | A | opp |
| B3 | singular head + stacked prepositional phrases ending in a plural | noun closing the PP chain | adj | sg | pl | aspect: non-perfect | a present or present-progressive verb elsewhere fixes an ongoing present | b\|d | is V-ing | D | free |
| B4 | subject containing a "between X and Y" phrase (a compound INSIDE the modifier) | "and" inside the modifier reads as a compound subject | early | sg | sg | aspect: non-perfect | a past-tense verb in the next sentence closes the interval | e\|h | was V-en | B | opp |
| B5 | "..., nor ___" + auxiliary inversion; singular postposed subject, head noun 5+ words after the blank | the first clause's plural subject/auxiliary invites copying | early | sg | sg | aux: do-support | the lexical BASE verb, 5+ words after the blank | m\|n + shared determiner | does the | A | agr |
| B6 | "the latter" resuming a PLURAL from an earlier sentence | "latter" reads singular | self | pl | pl | aspect: non-perfect | past-tense verbs anchoring a finished interval | r\|i | were + C | D | opp |
| B7 | interpolated comment clause ("one survey suggests") between subject and verb | subject of the comment clause | adj | sg | pl | voice: active | D5 | f\|e | has been V-ing | C | free |
| B8 | noun + infinitive modifier with a singular noun EARLY inside it ("Attempts by a single X to V the Ys ___") | singular noun early in the modifier | early | pl | pl | progressive: simple | a later verb reports the completed result | c\|k | are V-en | B | agr |
| C1 | possessive attractor on the main verb, "the [pl]' [sg] ___" | possessor of opposite number | early | sg | sg | aspect: perfect | a present-tense verb in a later sentence states the continuing state | r\|j | has been + C | B | opp |
| C2 | second verb of a compound predicate, far from its subject ("The Xs V ... and ___") | object/noun of the first predicate | adj | pl | sg | progressive: simple | the first predicate's simple form + a later verb | d\|f | have V-en | D | agr |
| C3 | "whose" relative: singular antecedent, "whose + plural noun" as the clause subject | antecedent of opposite number | early | pl | pl | tense: past | past-tense verbs of the frame sentence | k\|l | were being V-en | A | free |
| C4 | nonrestrictive ", which ___" whose antecedent is the WHOLE preceding clause | plural noun ending that clause | adj | sg | pl | aspect: non-perfect | present-tense frame verbs (a general, current judgment) | e\|c | is V-en | C | opp |
| C5 | subject relative whose antecedent is the FAR plural across a PP, "the Xs in the Y that ___" | the nearer noun as a false antecedent | adj | pl | sg | voice: passive | D6 | b\|c | are V-en | B | free |
| C6 | "unlike/like those of ..." comparison phrase between subject and verb | the plural pronoun "those" and its noun | adj | sg | pl | aspect: perfect | a present-tense verb in another sentence shows it continuing | f\|b | has been V-ing | A | agr |
| C7 | noun-complement (content) clause inside the subject, "The claim that the Xs V ... ___" | subject/verb of the content clause | adj | sg | pl | voice: active | D7 | g\|l | was V-ing | D | opp |
| C8 | fronted -ing participial phrase + inversion ("Lining the ... ___ the ... Ys"); plural postposed head 5+ words after the blank | a singular noun EARLY in the fronted phrase (the phrase itself ends on a plural) | early | pl | pl | tense: present | present-tense frame verbs | i\|j + shared determiner | are the | C | agr |

**Voice devices** (D1-D7). Use exactly the one your slot names:
- **D1** object-relative gap. The relative pronoun is the verb's object, so nothing after the
  blank is an object. The active key has no visible object.
- **D2** a spontaneous process: no agent exists anywhere in the passage, and another sentence
  makes that plain. The verb can be used without an object (e.g. accumulate, dissolve, migrate)
  and nothing after the blank is its object. The passive is wrong because nobody does it.
- **D3** passive key; the agent appears as a by-phrase **5 or more words** after the blank.
- **D4** passive key; the agent is named in an EARLIER sentence. After the blank comes a noun
  phrase or adverbial that is NOT an object (a duration, a measure, an "each year"), so
  something follows a passive key.
- **D5** active key whose object is delayed 5+ words by an interrupter. This is the old device,
  used only here, in B7.
- **D6** passive key followed by an as-phrase or to-infinitive complement ("are regarded as",
  "are thought to").
- **D7** active key, used without an object, followed by a prepositional phrase. Another
  sentence names the subject as the one doing it.

**Shared determiner (B5, C8).** The bare 2x2 fails the length rule (e.g. "is" vs "were"), so
all four options carry the next word, the subject's determiner, exactly as a live item did with
"does the / do the / ...". B5: {does the, do the, has the, have the}. C8: {is the, are the, was
the, were the} (or "is a" etc.). The subject's HEAD noun still comes 5+ words after the blank.

## Rules for every item
**Number (break tell 1)**
- Key number, Near, misleader position and After exactly as your row says. You have 4 plural and
  4 singular keys.
- The misleader must be genuinely tempting: a careful but hurried reader would pick the
  wrong-number option.

**Aspect and tense (break tell 2)**
- The second rule is settled by a FINITE VERB in another clause or sentence: its tense, or the
  logical order of events. Quote that verb in the explanation.
- Banned ANYWHERE in your passages:
  - "since" in ANY sense, including causal "since" (= because); use "because" instead;
  - "to this day", "to the present (day)", "until now";
  - "so far", "thus far", "to date", "up to now";
  - "for the past/last N ...", "in recent years/decades";
  - "lately", "recently", "nowadays", "at present", "currently";
  - duration anchors: "for more than a century", "for decades", "over the past ...", "throughout",
    "across those decades" (v17's B-03 settled aspect this way and the first list missed it).
- "now", "still", "already", "yet", "once" may not appear in the blank's own sentence.
- No tense settled by a printed date or year.

**Voice (break tell 3)**
- Use your assigned device.
- Never an agent or by-phrase within 4 words after a passive key.
- Never an object within 4 words after an active key.
- Put an interrupter immediately after the blank ONLY in B7. Vary what follows the blank across
  your 8: a PP, an adverbial, a clause, a comma-free continuation, the end of the sentence.

**Options (break tell 4)**
- `choices` is exactly your grid's 2x2, with one lexical verb.
- No option contains a word the other three lack: no adverb, no "had", "would", "will" or any
  modal, no odd auxiliary.
- A shared word present in all four is allowed only where your row says so (B5, C8), or to fix
  length. It is never an adverb.
- Key length divided by the shortest option's length must be < 1.6. Pick longer lexical verbs if
  needed: "accumulates / are accumulated" passes, "dissolves / are dissolved" may not.
- Across your 8, the key may be the uniquely longest option at most 2 times and the uniquely
  shortest at most 2 times.
- The key sits at your row's Letter. Order the other three so that no fixed pattern appears (do
  not always put the key's same-number partner next to it).
- The word immediately before the blank must NOT be the first word of every option. The word
  immediately after the blank must NOT be the last word of every option. No option may repeat the
  word just before the blank (`doubled_word`).

**Distractors and difficulty**
- Every distractor is grammatical in isolation and wrong only in context.
- No answer-resolving word within 4 words after the blank.
- At most 1 of the 3 distractors may be strikable without reading beyond the blank's clause.
  Ideally 0: each distractor should be wrong on exactly ONE of the two dimensions or on both, and
  the evidence against it should sit away from the blank.
- A7 and C8 are fronted by design. No other slot opens with a long fronted phrase that delays
  the decider. The batch allows 3 such items, and the spare is kept for a replacement.
- **Inversions (B5, C8):** the subject's head noun is 5+ words after the blank. In B5 the deciding
  base verb is too.

**Banned traps**
- literary present, singular "they", "one" as a noun;
- collective nouns (team, committee, family, ...), data/media;
- subjunctive (no "insist/require that");
- who/whom or any pronoun case; contractions; dictionary variants;
- "one of the ... that", "none of", "neither of", "the number of" ("a number of" in A2 is
  intended), "a series of", "a pair of".

**Templates that are already live or held (do not reuse)**
- either/or proximity;
- "Only ..." inversion;
- "the [sg] of the [pl] that" relative;
- expletive "there" with a delayed compound;
- "including" or "such as" interrupters;
- fraction + of;
- plural + floating "each";
- "not X but Y";
- "every X and every Y";
- a long fronted participial phrase + singular head;
- "the X and the Y that";
- So- or Such-inversion;
- "as + do/does";
- fronted adjective-complement inversion;
- fronted -ed participle inversion ("Bundled with ...");
- "the only one of";
- it-cleft;
- embedded that-clause after a long plural matrix subject;
- "more than one";
- "Not until ... do";
- locative inversion;
- whether-clause, gerund or infinitive subjects;
- linking verb + complement of opposite number;
- a compound subject with a singular part next to the blank;
- a who-clause on a singular antecedent;
- a singular head + appositive with a reduced relative.

**Passage, topic, names**
- 50-90 words, 2-4 sentences, academic register, American punctuation, double quotes, exactly
  one `______`. The blank is not always in the last sentence.
- Topic area by author:
  - A: life sciences, medicine, agriculture;
  - B: earth, space and physical sciences, engineering;
  - C: history, the arts, humanities, social sciences.
- `topic_tag` must not repeat any v10-v17 tag. List them with:

      cd /Users/andylee/Downloads/saas/classraum/scripts/study-bank && python3 -c "import json,glob;print(sorted({i.get('topic_tag') for f in glob.glob('sat-sec-hard-v1*.batch.json') for i in json.load(open(f))}))"

- Prefer no proper nouns: use a role ("one ecologist"). Any name you use starts with a letter in
  YOUR range: A: A-H, B: I-P, C: Q-Z. Never reuse a name across your items.

**Explanation**
3-6 sentences. Name the true subject and why the misleader is not it. Quote the deciding verb
for the second rule. Then say why EACH distractor fails, quoting it by its text, never "option
B" or "choice B". The path must be exactly the reasoning a student needs.

## File format
**`<X>/items.json`** is a JSON array of 8 objects in exactly the v17 author-file format: the ten
batch fields plus `template`. The merge strips `template`.

```json
{
  "id": "SEC22X-01",
  "domain": "Standard English Conventions",
  "subskill": "form: subject-verb agreement with ... crossed with ... decided by ...",
  "difficulty": "hard",
  "passage": "... ______ ...",
  "prompt": "Which choice completes the text so that it conforms to the conventions of Standard English?",
  "choices": ["...", "...", "...", "..."],
  "correct_answer": "...",
  "explanation": "...",
  "topic_tag": "field: specific topic",
  "template": "<subject construction> x <what misleads> x <option grid>"
}
```

Slot X1 is id SEC22X-01, X2 is SEC22X-02, and so on. `correct_answer` is character-identical to
one entry of `choices`, at your row's Letter. `subskill` is free text beginning "form: ".

**`<X>/declarations.json`** is a JSON array of 8 objects:

```json
{
  "id": "SEC22X-01",
  "slot": "X1",
  "frame": "...",
  "true_subject_head": "word",
  "misleader_words": ["word(s) in the passage"],
  "misleader_position": "adj | early | self",
  "key_number": "sg | pl",
  "near_noun": {"word": "...", "number": "sg | pl"},
  "after_noun_within_8": {"word": "...", "number": "sg | pl"},
  "dimension": "voice | aspect | tense | progressive | aux",
  "dimension_key": "active | passive | perfect | non-perfect | present | past | progressive | simple | do-support",
  "decider_quote": "the finite verb(s) that settle the second rule, quoted",
  "voice_device": "D1..D7 or null",
  "grid": {"code": "g|h", "forms": ["was V-ing", "were V-ing", "was V-en", "were V-en"]},
  "key_letter": "A | B | C | D",
  "next_four_words_after_blank": "...",
  "length_ratio": 1.23,
  "distractor_kills": {"<distractor text>": "the passage words that rule it out, and how far from the blank"},
  "hostile_reader": {"options_only_pick": "...", "heuristics_that_give_key": ["..."], "changed": "what you changed, or none"}
}
```

Write `after_noun_within_8` as null if there is no noun within 8 words after the blank.

## Loop
1. Write items in slot order. After every 2 items, save both files: disk is the only record of
   your progress.
2. After all 8, run the near-duplicate check against every live SEC row:

       cd /Users/andylee/Downloads/saas/classraum && set -a && source .env.local && set +a && node scripts/study-bank/sec-near-dup.mjs scripts/study-bank/sat-sec-v22-work/<X>/items.json

   Change any item flagged (passage trigram Jaccard >= 0.20 to a live row, or an option skeleton
   identical to a live HARD item). Re-run until clean. If the script refuses (exit 2), report
   that; do not treat it as clean.
3. Run the hostile-reader check below and fix what it finds. Then report.

## Before you finish: hostile-reader check
Do this as a reader who wants to score points WITHOUT doing the grammar. Write the results into
`hostile_reader` per item.

1. **Options only.** Cover the passage and look at the four options. Can you pick one, or strike
   one? The odd one out, the only one with an extra word, the longest? With a clean 2x2 the
   answer must be no. If you can strike anything, fix the grid.
2. **Blank's clause only.** Read only the clause containing the blank:
   - Can you settle the number from the word right before the blank, or the second rule from a
     word right next to it? Then the item is medium; move the evidence away.
   - For each distractor, is the passage evidence against it more than a few words from the
     blank? If two distractors die from words next to the blank, the item fails the free-strike
     rule.
3. **The named heuristics, across your 8.** Apply each one blindly to all 8 items and count how
   many keys it gets:
   - (a) pick the number opposite the noun right before the blank;
   - (b) if a plural noun is near the blank, pick singular;
   - (c) a time anchor means perfect;
   - (d) an object after the interrupter means active, none means passive;
   - (e) the option with an extra word loses;
   - (f) "been" or "being" wins;
   - (g) the key is in the same slot as last time.

   Each must get **at most 4 of 8** and should get about half where it applies. If one gets 5+,
   change an item, not the heuristic count on paper.
4. **Across items.** Lay your 8 side by side:
   - Do two items share a sentence skeleton, an option wording, the same blank position, the same
     kind of thing after the blank, or the same topic shape?
   - Would solving one teach you another?

   If yes, change one. Also make sure no item shares a frame or misleader with another author's
   rows in the table.
5. **Exclusivity.** For each distractor, write the sentence in which it WOULD be correct. Then
   confirm the passage rules it out without dispute. If you hesitate on any distractor, a grader
   will dispute the key, and the item is lost.
6. **Be the grader.** Would a strong grader call this medium because one decision is visible next
   to the blank? If so, push the evidence further from the blank or into another sentence.
   Authors' hard labels have been demoted in every batch so far; the panel decides.

## Process rules
- Write only inside `scripts/study-bank/sat-sec-v22-work/<X>/`. Never touch another author's
  folder or any other file. No database writes, no git.
- NEVER run pkill, killall, or any command that kills processes.
- Do not call any model API, and never use GPT or any non-Claude model.
- When done, report: the 8 ids; per slot, the key and letter; your heuristic counts from step 3;
  the near-dup result line; and any row you could not meet exactly, with the reason. Do not
  bend a row silently.
