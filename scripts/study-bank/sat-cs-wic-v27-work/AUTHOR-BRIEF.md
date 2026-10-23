# sat-cs-wic-v27 author brief: Digital SAT Words in Context, all hard, FOUR-WORLD method

You write Digital SAT Reading & Writing **Words in Context** items with the four-world method. Read this whole
brief before you write anything. The pre-registration is `scripts/study-bank/PREREG-WIC27-2026-10-23.md`.

## The method
For each item you write:
- ONE set of four words;
- FOUR versions of the passage ("worlds").

In world k, word k is the only correct answer and the passage's logic rules out the other three. After every file
is frozen, a seeded random draw picks one world per item to serve. The other three worlds are never shown to anyone.
Every word is the answer in one of its worlds, so the four words alone say nothing about which world was served.

**Each of the four worlds must be a real, hard, single-answer SAT item.** Any world might be the one served.
Three graders see only the served world and judge it as an ordinary item. An item reaches students as HARD only if
the graders' median rating is hard.

## What the graders rewarded, and what they did not
The last round (v26) served 40 items. The three graders kept **4 as hard**, kept 18 as medium, and dropped 18:
- **11 dropped as panel-median easy.**
- **4 dropped as "free-strikable"**: two of the three wrong words could be struck on a surface read, without the
  passage's logic. The graders' wording for this, which is the question you are now being judged on:

  > `n_struck`: how many of the three wrong options can be struck WITHOUT the passage's logic (from the blank's
  > local grammar/collocation, an opposite pair, or a quick surface reading)

- 2 dropped for an opposite pair, 1 for a second defensible answer.

Reading the graders' own notes on all 40, the hard, medium and easy items differ in a consistent way:

| Panel result | What the graders wrote about the wrong words |
|---|---|
| **hard** (4) | two named near-misses each: "prototype and outpost are near-misses"; "checkpoint and custodian are near-misses"; "sponge is the strong near-miss, refuted by the clay floor". `n_struck` 1 from every grader. |
| **medium** (18) | ONE near-miss, the other two "unsupported" or "lack support": "pivot/prism/pawn lack support"; "springboard/showpiece unsupported"; "others unsupported". |
| **easy** (11) | "distractors are thin metaphors"; "other options weak"; "struck quickly"; or one sentence that defines the key outright. |

Two more patterns, across v25 and v26 together (72 items):
- **Adjective sets almost never come out hard**: 1 panel-hard of 20, and 10 of the 20 were dropped. Nouns gave 4 hard
  of 27 and verbs 5 of 25. All 4 v26 hard items were nouns or verbs.
- **Sets of words for a person's role never came out hard**: 0 of 6 (apprentice, confidant, envoy, understudy,
  mentor, middleman sets). What the person does maps one-to-one onto a role word, so one sentence gives it away. The
  hard nouns name what a THING, PLACE or INSTITUTION does: proxy, spillway, counterweight, clearinghouse.

## THE CENTRAL RULE: every wrong word survives a surface read
In every world, each of the three wrong words must:
1. **fit the blank's sentence**: grammatical, idiomatic, and a natural thing to say in that sentence; AND
2. **fit the passage's topic**: a word someone writing about THIS subject could plausibly use. Four words about a
   flood (emptied, gouged, flattened, dammed). Four words for a marsh beside a river (spillway, seedbed, sieve,
   sponge). Not one marsh word and three words from other subjects.

And it must **fail only on the passage's logic**: on what the passage's facts, put together, imply.

A wrong word that dies because "the passage doesn't say so" has not survived a surface read; a careful student
strikes it at a glance because nothing in the passage is about it. That is exactly how v26's medium items lost
their hard rating. If a word can only be killed by absence, **replace the word**. Do not add a sentence to kill
it: a clause whose only job is to contradict one wrong word is a planted kill (rule A), and graders spot it.

### The author self-test (do it BEFORE you write each world, and record it in the file)
For each of the three wrong words in a world, write down:
- **`surface_fit`**: why this word fits the blank's sentence AND this passage's topic on a first read. If you
  cannot say why a student would be tempted, the word is weak; replace it.
- **`inference`**: the specific inference step that kills it: which fact, combined with what, rules it out. For
  example, from WIC26B-04: "the marsh floor is hard clay, so it cannot soak water up and release it later; a sponge
  stores water, and this marsh only passes it on." If the only step you can name is "the passage doesn't say so",
  "nothing suggests it" or "there is no mention of it", the word fails the test: **replace the distractor** (or
  change the world's mechanism so the mechanism itself rules the word out).

The self-check refuses an `inference` worded as an absence claim. That catches the wording, not the thinking: an
absence claim rephrased as "the passage describes a survey, not a station" is still an absence claim. Be honest
with yourself here. The world probe and the graders read for it, and they decide.

## The rules derived from what the panel rewarded (P1-P5)
- **P1. At least two near-misses in every world.** Two of the three wrong words should be words a strong student
  seriously considers, and rejects only after combining two facts. The third may be weaker, but it must still
  survive a surface read (the central rule). Panel-hard items had `n_struck` 1; medium ones had one near-miss.
- **P2. No sentence paraphrases the key.** If any one sentence states the key's defining property, the world is
  easy however good the wrong words are. v26's easy items did exactly this:
  - "had her carry out the steps of his syntheses at his bench ... the university gave his laboratory to her"
    is the definition of "apprentice";
  - "every other clause stated each state's share as a fraction of the flow so measured", then the treaty collapsed
    when that clause fell, is the definition of "keystone";
  - "high ceiling, glass roof, no lamps needed" is the definition of "airy".

  In the hard items, NO sentence says what the key means. "Proxy" is never said: the reader gets it from three
  facts together (money to survey one district; every district's limit set from that one table; the table revised
  only when that valley was recounted).
- **P3. State the killing facts neutrally, one inference step from the word.** In hard items the facts that kill a
  word are concrete details that do not use the word's vocabulary or its opposite: "the marsh floor is hard clay"
  (kills "sponge" once you think about what a sponge does); "still rooted in soil the water had barely disturbed"
  (kills "gouged" and "emptied"). A fact that names the opposite of a wrong word ("nothing was saved", "it grew
  louder") is a direct contradiction, and it counts as `explicit` (at most one per world).
- **P4. Let the setting suggest a wrong word.** In each hard item, the setting makes one wrong word the natural
  first guess, and the mechanism then rules it out: a monastery on a mountain pass suggests "checkpoint"; a marsh
  that takes floodwater suggests "sponge"; a valley counted first suggests "prototype". In a four-world item each
  word is the key once, so rotate which wrong word the setting tempts toward in each world.
- **P5. Choose noun or verb sets, and nouns for what a thing does.** At least 6 of your 8 option sets must be nouns
  or verbs (checked). Prefer nouns naming the function of a thing, place or institution (proxy, spillway,
  counterweight) and verbs naming what a process did to something (flattened, channeled, sheltered). Avoid sets of
  person-role nouns (apprentice / ambassador / audience / accomplice) and character-trait adjectives (meticulous,
  jaded, rigorous): the evidence about a person maps straight onto one word.

## Rules kept from v26 (A-E)
- **A. One mechanism per world, told over two or more sentences.**
  - Each world describes ONE situation or process. The key follows from how its parts fit together.
  - The wrong words fail BECAUSE of that same mechanism, not because of separate facts added to rule them out.
  - **No kill-only clause.** If deleting a clause would leave the mechanism intact and only revive one wrong word,
    the clause is a planted kill.
  - **No pivot.** Do not open a sentence with "But", "Yet", "However", "Still" or "Even so", and do not use a
    ", but" / ", yet" / "; but" / "; yet" clause. The self-check refuses these. Rewording a pivot as "Even then" or
    "All the same" does not help: the readers read for the turn, not the word.
  - The test: can a strong student get the key from any ONE sentence? If yes, the world is not hard.
- **B. Every option is a word a strong 11th grader reads unglossed**: a front-page news story or a textbook chapter
  would use it without explaining it. ("Ancillary" and "lodestar" failed with all three graders.)
- **C. No two options that are near-opposites**, including the two ends of one scale. v26 lost two items this way:
  "crude" / "bureaucratic" and "haphazard" / "evenhanded".
- **D. No world in which a wrong word literally describes what the passage reports.** "Interlude" is literally true
  of a short scene in the middle of a play. If a wrong word is literally true, the item has two answers: change the
  world's facts. Note the tension with the central rule: a wrong word must be TEMPTING (it fits the topic), never
  TRUE (it fits the facts).
- **E. The blank sentence must not presuppose anything that some world lacks.** Every noun phrase it takes for
  granted must be set up in EVERY world, or cut from it.

## Examples: the four v26 worlds the graders rated hard (their words are spent: the self-check refuses them)
Each block is the served world exactly as students saw it.

**WIC26A-02** (graders: hard, hard, hard; `n_struck` 1, 1, 1). Options: outpost / proxy / prototype / reservoir.
Key: **proxy**.
> A state forestry service founded in 1911 managed the timber of a mountainous province, and one of its fourteen
> districts was a narrow valley. The service had money to survey only one district, and in 1912 its foresters
> counted and measured every tree on the valley's slopes. For the next thirty years each district's yearly cutting
> limit was set in proportion to its area from a single table of timber per acre, a table revised only when the
> valley was counted again. One historian argues that, from 1911 to 1940, the valley was above all the service's
> ______.

Why it works: all four words are things a forestry service's valley could be. The key needs three facts together,
and no sentence says "stood in for". "Prototype" is the setting's bait (the valley was first), and dies on one
step: nothing was built there and copied, only its figures were used. Graders: "prototype and outpost are
near-misses."

**WIC26B-04** (graders: hard, hard, hard; `n_struck` 1, 1, 1). Options: spillway / seedbed / sieve / sponge.
Key: **spillway**.
> Above a harbor town, a river crosses six miles of reedy marsh, and below the marsh the lower river runs past the
> town's quays to the bay. The marsh floor is hard clay laced with tidal creeks that empty into the bay a mile from
> town. When the river rises past a certain height, only the water above that level pours over a low bank into the
> marsh, and the creeks are back to their usual level by morning. In floods the lower river past the quays stays at
> its ordinary height. One hydrologist has concluded that the marsh serves the lower river as a kind of ______.

Why it works: "sponge" is what everyone says about marshes and floods, so it is the first guess. It dies on an
inference from a neutral fact: a hard clay floor absorbs nothing, and the creeks empty overnight, so the water is
passed on, not stored. "Spillway" needs "only the water above that level" plus "stays at its ordinary height".
The weak spot: "seedbed" was the one word graders could strike (nothing in the passage is about growth). In v27
that word would fail the self-test.

**WIC26C-01** (graders: medium, hard, hard; `n_struck` 1, 1, 1). Options: broker / custodian / checkpoint /
counterweight. Key: **counterweight**.
> For six centuries a small monastery stood at the top of the only pass between two mountain valleys, each ruled by
> its own lord. In time the eastern lord grew rich enough to want the western valley's pastures. The monks owned the
> high grazing land on the pass, chose each abbot from western families, and had the bishop's backing in every
> quarrel. Whenever the eastern lord gathered men to march west, the abbot gathered tenants and the bishop's
> letters, and for two centuries the lord never judged the march worth the cost. In a history of the pass, one
> scholar described the monastery as, above all, the region's ______.

Why it works: a monastery between two rival lords could be a broker, a custodian, a checkpoint or a
counterweight; every word survives a surface read. "Checkpoint" is the setting's bait (it sits on the only pass).
The key comes from the matched build-up on both sides and the march never judged "worth the cost": a balance, not a
gate. Graders: "checkpoint and custodian are near-misses."

**WIC26D-06** (graders: hard, hard, hard; `n_struck` 2, 1, 1). Options: emptied / gouged / flattened / dammed.
Key: **flattened**.
> In the spring of 1936 a flood swept the length of a narrow farming valley, where a river had run for centuries
> between orchards and cornfields to a rocky gorge at the valley's lower end. Driven by a gale, a wall of water a few
> feet high crossed the valley in less than an hour and was gone by evening. Surveyors later found every orchard tree
> and cornstalk still rooted in soil the water had barely disturbed, and photographs from the ridge show the valley
> floor striped in the direction the water had run. Revisiting the valley a decade later, one geographer wrote that
> the flood had ______ it.

Why it works: all four are things floods do to valleys. "Flattened" is never described: the reader has to combine
"still rooted" with "striped in the direction the water had run" to see the crops laid over. "Gouged" and "emptied"
die on the same neutral fact (rooted in barely disturbed soil). One grader still struck two words here, so it is
the weakest of the four.

## Counter-examples from v26 (words spent)
- **WIC26C-04, easy (all three graders), `n_struck` 2.** Options ambassador / audience / apprentice / accomplice for
  a laboratory technician. The passage says she did his syntheses at his bench step by step and inherited his lab:
  that is the definition of the key (P2). "Audience" and "accomplice" are not words anyone would use about a lab
  technician: they fail the surface read (central rule). Person-role set (P5).
- **WIC26A-08, easy, `n_struck` 2.** Options ritual / rudder / rampart / portal for a newspaper column read aloud
  each weekend. Graders: "distractors are thin metaphors." Nobody calls a newspaper column a rampart.
- **WIC26A-05, kept MEDIUM.** Options pivot / prism / puzzle / pawn for a gardener whose acts the narrator never
  explains. Graders: "pivot/prism/pawn lack support." Every wrong word died on absence, so the item could not be
  hard. It is the single most common way v26 lost a hard rating.

## How to build one item
1. **Pick a topic with a real mechanism**: a process, a system, a sequence with consequences. Then pick four words
   from that topic's own field, all of which a writer on this subject could use in the blank (central rule). Same
   part of speech, same shape (all one word, or all two words), each passes rule B, no near-opposites (rule C), no
   near-synonyms that differ only in degree or scope.
2. **Frame.** Write the shared opening and the **blank sentence**, which contains `______`. The blank sentence must
   be **word-for-word identical in all four worlds**, and all four words must fit it naturally. Check rule E.
3. **Self-test, then four mechanisms.** For each world, before writing it, fill in `surface_fit` and `inference`
   for its three wrong words. If any wrong word has no inference step beyond absence, change the word or the plan
   now. Then write the mechanism sentences over two or more sentences (rule A), with no sentence that paraphrases
   the key (P2), killing facts stated neutrally (P3), and the setting tempting toward one wrong word (P4).
   - At most ONE wrong word per world may be ruled out by a phrase that contradicts it outright (`explicit`). The
     others are ruled out by `logic`.
4. **Cross-check all sixteen pairs.** For every world, read each wrong word into the blank and ask:
   - Would a strong student strike this on a surface read? (If yes, it fails the central rule.)
   - Could a careful strong student defend it, even with a stretch? (If yes, two answers.)
   - Is it literally true of something the passage reports (rule D)?

   Rewrite until the answers are no, no, no for every wrong word in every world.
5. **Symmetry.** Do not write one "native" world and bend the passage three times for the others.
   - World lengths within 1.3x of each other (checked).
   - Every pair of worlds shares at least 40% of its content words (checked). Keep the opening and the blank
     sentence fixed and change the mechanism sentences.

   A contorted world is a with-source tell, and contorted worlds are the ones graders drop. Dropping them would tilt
   the kept keys back toward the "natural" word; the pipeline measures that and will hold the batch if it finds it.

## Rules (the self-check enforces the starred ones)
- \* **Four worlds, four different keys.** Each world names its `key`; the four keys are the four `choices`, each
  used once.
- \* **Identical blank sentence** in every world's passage; no two items share one.
- \* **Kills come from outside the blank sentence.** For every world, a kill for each of its three wrong words:
  - `type`: `logic` or `explicit` (at most one `explicit` per world);
  - `quote`: 2+ consecutive words of THAT world's passage, outside the blank sentence;
  - `why`: how the passage kills it;
  - **NEW `surface_fit`**: why the word survives a surface read (fits the blank's sentence and the topic);
  - **NEW `inference`**: the inference step that kills it. Absence claims ("the passage never says", "nothing
    suggests", "no evidence", "unsupported") are refused.

  The quote shows WHERE the reader finds the reason. It is not a license to plant a clause for it (rule A).
- \* **No pivot** (rule A).
- \* **Letters.** Every option word starts with a letter in YOUR range:

  | Author | Letters |
  |---|---|
  | A | d-h |
  | B | i-n |
  | C | s-z |
  | D | a-c |
  | E | o-r |

  The ranges are rotated again: no author works in letters it held in v26 or in v25.
- \* **Exclusion.** The self-check refuses any word that is:
  - a live WIC word;
  - any v17-v26 option word (key or distractor, kept or dropped, served or unserved), or a stem or inflection of
    one;
  - a word used twice in this batch (by stem);
  - a denylisted word, including every example word in this brief.
- \* **No opposites.** `antonym_pairs: []`, and mean it, including near-opposites (rule C).
- \* **Shape.**
  - Every item `difficulty: "hard"`; every world `key_from_one_sentence: false`.
  - Each world declares its `shape`: cause and mechanism, comparison of two cases, before and after, scope limit,
    method and purpose, process sequence, definition by example, ...
  - At least 4 distinct shapes across your 32 worlds; "received view overturned" in at most 25% of them.
- \* **Passages.** Each world 50-110 words, exactly one blank of six underscores, no "a"/"an" directly before it.
  `after_blank` names the word right after the blank and must read idiomatically with all four words. Invented or
  no proper names (prefer a role: "one historian"), never reused across items. American punctuation, double quotes.
- \* **Nouns and verbs: at least 6 of your 8 option sets** (v26 asked for 3). See P5.
- **Word level** (rule B): the four words about equally common. Declare `rarity_order` (most common first); it is
  used after grading to check that kept keys are not skewed toward common or rare words.
- \* **Explanation per world.** 2-4 sentences. Quote the key and say why each other word fails, naming each by its
  word. Never refer to an option by a letter.

## File format: ONE file per item
Path: `scripts/study-bank/sat-cs-wic-v27-work/<L>/WIC27<L>-NN.json`, with NN = 01..08.

```json
{
  "id": "WIC27A-01",
  "domain": "Craft and Structure",
  "subskill": "Words in Context",
  "difficulty": "hard",
  "topic_tag": "short topic",
  "prompt": "Which choice completes the text with the most logical and precise word or phrase?",
  "choices": ["w1", "w2", "w3", "w4"],
  "antonym_pairs": [],
  "rarity_order": ["most common", "...", "...", "rarest"],
  "pos": "noun",
  "after_blank": "",
  "blank_sentence": "<identical in all four worlds, contains ______>",
  "worlds": [
    {
      "key": "w1",
      "passage": "<opening> <mechanism sentences for w1> <blank_sentence>",
      "shape": "cause and mechanism",
      "key_from_one_sentence": false,
      "explanation": "... \"w1\" ... \"w2\" fails because ...; \"w3\" ...; \"w4\" ...",
      "kills": {
        "w2": {"type": "logic", "quote": "two or more words from this passage", "why": "...",
               "surface_fit": "why a student is tempted by w2 here", "inference": "fact X plus fact Y, so w2 cannot hold"},
        "w3": {"type": "logic", "quote": "...", "why": "...", "surface_fit": "...", "inference": "..."},
        "w4": {"type": "explicit", "quote": "...", "why": "...", "surface_fit": "...", "inference": "..."}
      }
    },
    {"key": "w2", "...": "..."},
    {"key": "w3", "...": "..."},
    {"key": "w4", "...": "..."}
  ]
}
```

The blank sentence does not have to come last. Choice order does not matter; it is re-dealt after selection.

## Loop
After EACH file, run:

    cd /Users/andylee/Downloads/saas/classraum && node scripts/study-bank/wic27-selfcheck.mjs <L>

Fix every PROBLEM on your own items. The per-author count rules fire once you have 8 files. A `warn` line means the
exact span that kills a word in one world also appears in the world where that word is the key: legitimate if the
kill depends on another sentence too, but look at it.

Then, reading each world as a student who has never seen the other three, do the sixteen-pair cross-check (step 4)
once more and check the central rule, P1-P5 and A-E.

## After all 8: the world probe and the ONE revision round
When every author has 8 green files, four fresh readers each read one world of every item and answer the graders'
own questions, including `n_struck` and the graders' difficulty definition. You then get
`sat-cs-wic-v27-work/<L>/PROBE-FEEDBACK.json`, listing each named world with the reader's difficulty, `n_struck`,
the words the reader struck, other flags and the note.
- **Every world rated easy, and every world where the reader struck two or more wrong words, must be rewritten.**
  The note says what gave it away. Such a world left byte-identical blocks the freeze for the whole batch.
- A struck word failed the surface read in that world. Rewrite the world so the setting or mechanism makes that
  word tempting, and so only an inference step kills it. A revision cannot change the four words (they are shared
  by all four worlds and are the four keys), so if a word is struck in several worlds, rethink the item's mechanism.
- Fix every named "second defensible", "distractor fits literally", "presupposes absent" and "antonym pair" world.
- A revision rewrites a world. It never changes the world's key, never changes the four words, and never removes a
  world.
- After the revision round the text is frozen, whatever the outcome. There is no second round.

## Process rules
- Write 4 items per run (the run brief says which numbers). Then stop and report:
  - the self-check line;
  - the three WORLDS (item id + key) you consider weakest, and why: name the wrong word most likely to be struck on
    a surface read.
- NEVER run `wic27-select.mjs`, `wic27-wprobe.mjs` or any render script, and never try to work out which world will
  be served. The seed depends on the frozen text. Make all four worlds equally good.
- Never touch another author's folder or any file outside your own folder.
- NEVER run pkill, killall, or any command that kills processes.
- No GPT or other non-Claude model. Do not call any model API.
