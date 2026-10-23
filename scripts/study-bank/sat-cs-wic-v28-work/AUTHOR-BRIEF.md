# sat-cs-wic-v28 author brief: Digital SAT Words in Context, all hard, FOUR-WORLD method

You write Digital SAT Reading & Writing **Words in Context** items with the four-world method. Read this whole
brief before you write anything. The pre-registration is `scripts/study-bank/PREREG-WIC28-2026-10-23.md`.

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

## What the graders rewarded last round (v27), and what they dropped
v27 served 40 items. The graders kept **11 as hard** and 23 as medium, and dropped 6. The hard and medium items
differed in two ways the graders wrote down for every item:

| | kept hard (11) | kept medium (23) |
|---|---|---|
| all three graders rated the wrong words `strong` | **7** | **0** |
| at least one grader struck NO wrong word on a surface read (`n_struck` 0) | **10** | 3 |
| typical grader note | "manipulated is the strong textbook distractor"; "ledger is a near-miss (a record), but its layers record nothing except years" | "haven/gateway fit the strait setting but not the coal logic"; "insurance/inventory are plausible; loot weak"; "blackened, blistered, cracked each contradicted by a clause" |

So the medium items had ONE tempting wrong word and two that a careful student strikes at a glance. The hard ones
had three wrong words a strong student had to think about.

What got dropped:
- **4 of the 6 drops were the EXPLANATION, not the passage.** The key was right; the explanation rejected the
  strongest wrong word for the wrong reason:
  - "headquarters" vs "hub": the explanation rejected "hub" because the founders met after closing time, a thin
    detail; the files and the founders' meetings, which make it the seat of command, were the real reason.
  - "aqueduct" vs "artery": rejected "artery" because "two feet of water floats no barge", but "artery" also
    means a supply line; the real reason is that the canal carried drinking water to fountains.
  - "cistern" vs "cooler": rejected "cooler" because ferns stay green all winter, which shows a steady temperature
    and so SUPPORTS "cooler".
  - "repopulated" vs "reoriented": rejected "reoriented" with the old river landing, which does not refute it.
- 2 easy: one sentence named the key's function outright ("lit and stocked ... the square emptied whenever the
  sirens sounded" is a shelter; "uncut bones of adults and children, dusted with red ochre" is a burial place), and
  two of the wrong words came from other subjects (icebox, cesspool, arena).

Across v25-v27 (112 items): **verb sets 12 panel-hard of 44, noun sets 8 of 48, adjective sets 1 of 20.** Sets of
person-role nouns: 0 hard.

## THE CENTRAL RULE: every wrong word survives a surface read
In every world, each of the three wrong words must:
1. **fit the blank's sentence**: grammatical, idiomatic, and a natural thing to say in that sentence; AND
2. **fit the passage's topic**: a word someone writing about THIS subject could plausibly use. Four things a log in
   a salmon stream could be (highway, garden, hatchery, hostel). Four things a parasite can do to its host (milked,
   manipulated, neutered, immunized). Not one stream word and three from other subjects.

And it must **fail only on the passage's logic**: on what the passage's facts, put together, imply.

A wrong word that dies because "the passage doesn't say so" has not survived a surface read: a careful student
strikes it at a glance because nothing in the passage is about it. If a word can only be killed by absence,
**replace the word**. Do not add a sentence to kill it: a clause whose only job is to contradict one wrong word is
a planted kill (rule A), and graders spot it.

### The author self-test (do it BEFORE you write each world, and record it in the file)
For each of the three wrong words in a world, write down:
- **`surface_fit`**: why this word fits the blank's sentence AND this passage's topic on a first read. If you
  cannot say why a student would be tempted, the word is weak; replace it.
- **`inference`**: the specific inference step that kills it: which fact, combined with what, rules it out. From
  WIC27B-05: "infected snails stayed in the shaded weed bases with the others, away from the tips where ducks feed,
  so the worm did not steer its host toward the predator." If the only step you can name is "the passage doesn't
  say so", "nothing suggests it" or "there is no mention of it", the word fails the test: **replace the
  distractor** (or change the world's mechanism so the mechanism itself rules the word out).

The self-check refuses an `inference` worded as an absence claim. That catches the wording, not the thinking. The
world probe and the graders read for it, and they decide.

## The rules derived from what the panel rewarded (P1-P6)
- **P1. Three near-misses in every world (raised from two).** All three wrong words should be words a strong
  student seriously considers and rejects only after combining facts. In v27, a world with one tempting word and
  two weak ones came out medium every time. Ask of each wrong word: would a strong student strike this in the first
  five seconds? If yes, replace it.
- **P2. No sentence paraphrases the key, or names its function.** If any one sentence states what the key does,
  the world is easy however good the wrong words are ("kept lit and stocked; the square emptied at the sirens" =
  shelter). In the hard items NO sentence says what the key means: "hostel" comes from salmon resting in the pool
  plus tagged fish turning up weeks later on gravel beds miles upstream.
- **P3. State the killing facts neutrally, one inference step from the word.** Concrete details that do not use
  the word's vocabulary or its opposite: "came to rest along the current, parallel to the banks" (kills "highway"
  once you think about what a highway joins); "laying eggs weekly" (kills "neutered"). A fact that names the
  opposite of a wrong word ("nothing was saved", "it grew louder") is a direct contradiction and counts as
  `explicit` (at most one per world).
- **P4. Let the setting suggest a wrong word.** In each hard item the setting makes one wrong word the natural first
  guess and the mechanism rules it out: a parasite suggests "manipulated" (the textbook case); layered lake mud
  suggests "ledger" (a record); a log in a salmon stream suggests "hatchery". Rotate which wrong word the setting
  tempts toward in each world.
- **P5. Choose verb or noun sets; prefer verbs.** At least 6 of your 8 option sets must be nouns or verbs (checked).
  Verbs naming what a process did to something (milked, pitted, honed, rinsed) have the best record; nouns should
  name the function of a thing, place or institution (hostel, metronome, coffer), never a person's role. No
  character-trait adjectives.
- **P6. NEW: the explanation rejects each wrong word on the decisive reason.** For each wrong word, the explanation
  gives the same fact chain as that kill's `inference`, reads the word in its broadest ordinary sense (including
  its usual figurative sense: "artery" = supply line, "hub" = center of traffic), and never cites a fact that
  could support the word. Reread every rejection asking: would a grader who knows the key agree that THIS is why
  the word fails? The world probe now checks the explanation in a second phase, and the graders drop an item whose
  explanation is wrong even when the key is right.

## Rules kept from v26-v27 (A-E)
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
  would use it without explaining it.
- **C. No two options that are near-opposites**, including the two ends of one scale.
- **D. No world in which a wrong word literally describes what the passage reports.** A wrong word must be
  TEMPTING (it fits the topic), never TRUE (it fits the facts).
- **E. The blank sentence must not presuppose anything that some world lacks.** Every noun phrase it takes for
  granted must be set up in EVERY world, or cut from it.

## NEW: vary the blank sentence's frame (checked)
In v27 every one of the 40 blank sentences was the passage's LAST sentence and an expert's verdict ("One historian
has argued that ... above all ... ______."), and 30 of 40 said "above all". The last brief's examples taught that
frame. It does not give away the key, but a batch where every item has the same frame is a template, and real SAT
items vary. Per author (checked over your 8 items):
- the blank sentence ends the passage in **at most 5 of 8 items** (it counts as ending the passage if it is last in
  ANY of the item's four worlds; to count as mid-passage it must be followed by at least one sentence in all four);
- **at most 2 of 8** blank sentences carry an intensifier: "above all", "more than anything", "in effect", "a kind
  of", "best understood as", "first and foremost", "in essence", "essentially", "chiefly", "at bottom", "at heart".
Vary who or what the blank sentence is about, too: a report, a measurement, a description in the passage's own
voice, not always one expert's conclusion.

## Examples: four v27 worlds the graders rated hard (their words are spent: the self-check refuses them)
Each block is the served world exactly as students saw it. All four had every grader rating the wrong words
`strong`. Note that all four close with an expert's verdict; that is the frame the new rule limits. Copy the
mechanism, not the frame.

**WIC27A-05** (graders: hard, hard, hard; `n_struck` 0, 1, 0). Options: highway / garden / hatchery / hostel.
Key: **hostel**.
> In 1980 a storm dropped a two-hundred-year-old fir into a mountain stream, and its trunk, four feet thick, has
> lain there ever since. It came to rest along the current, parallel to the banks, and floods sweeping around it
> have scoured a pool ten feet deep in its shade. Each summer the pool holds hundreds of adult salmon, and fish
> tagged there turn up weeks later on gravel beds miles upstream. Seedlings sprout on its top each spring and are
> gone by winter, when the flood that deepens the pool runs over the trunk. After a decade of watching it, one
> ecologist called the log, above all, the valley's ______.

Why it works: all four words are things a log in a salmon stream could be. "Hatchery" is the setting's bait and
dies on one step: the tagged fish spawn on gravel beds miles upstream, not here. No sentence says "resting place";
the key comes from the pool holding adults plus the tagged fish moving on. Graders: "hatchery fails (spawning is
elsewhere), garden fails (seedlings die), highway tempts from the log's orientation."

**WIC27B-05** (graders: hard, hard, hard; `n_struck` 0, 1, 0). Options: milked / manipulated / neutered /
immunized. Key: **milked**.
> A parasitic worm that matures inside ducks infects half the snails in one pond, and for three years a biologist
> kept infected and uninfected snails in tanks and in a pen where ducks fed at the weed tips. Infected snails
> reached half the others' size and crept half as fast, while laying eggs weekly and living as long. Both kinds kept
> to the shaded weed bases in the pen, and a bacterium that swept the tanks took infected and uninfected snails in
> proportion to their numbers. From these results, she concluded that the worm had, above all, ______ its host.

Why it works: "manipulated" is what everyone knows parasites do, so it is the first guess, and it dies on a neutral
fact (both kinds stayed at the shaded bases, away from the ducks). Each wrong word fails on a different measured
result, none of them naming the word's opposite. Graders: "'Manipulated' is the strong textbook distractor."

**WIC27B-06** (graders: hard, hard, hard; `n_struck` 0, 1, 0). Options: microcosm / ledger / museum / metronome.
Key: **metronome**.
> From 1950 to 1990, scientists studied one small, deep, cold lake in a northern forest more closely than any other
> lake in the region; its bottom mud reaches back to the last ice age. Its mud lies in yearly layers all the same
> thickness whatever the weather, one pale band each summer. Scientists at other lakes, whose own layers recorded
> rainfall but could not be counted reliably, dated those records by matching shared bands of volcanic ash against
> its exact count of years. In a history of that work, one scientist called the lake, for those four decades, above
> all the region's ______.

Why it works: "ledger" (a record) is the bait for layered mud, and dies on "all the same thickness whatever the
weather": these layers record only the passing of years. "Museum" tempts from "reaches back to the last ice age".
Graders: "ledger is a near-miss (a record), but its layers record nothing except years."

**WIC27E-06** (graders: hard, hard, hard; `n_struck` 0, 1, 1). Options: riddled / pitted / poisoned / razed.
Key: **pitted**.
> For eighty years after 1890, companies mined copper from a mountain above a valley town, until the last mine
> closed in 1972. The ore lay in a dozen scattered pockets near the surface, and for eighty years the company's
> miners worked them in daylight, each pocket becoming a crater, some a quarter mile across, the deepest now holding
> rainwater. Between them the slopes keep their old forest, and the mountain still keeps the morning sun off the
> town until nine. A trout hatchery below it still raises its fish in water piped from the mountain's streams.
> Surveying the mountain in 1980, one geologist wrote that mining had ______ it.

Why it works: all four are things mining does to a mountain. "Riddled" is the near-miss and needs "near the
surface ... worked them in daylight" to reject (riddled means holes throughout, tunnels). Weakest spot: two graders
could strike one word, because "razed" and "poisoned" each die on one sentence of their own. Under P1 those two
would need to be closer.

## Counter-examples from v27 (words spent)
- **WIC27D-05, easy (hhh easy; `n_struck` 2, 2, 1; distractors weak).** Options arena / cesspool / bunker / bazaar
  for an old chalk quarry. "Kept them lit and stocked with bedding and water, and the square emptied within minutes
  whenever the sirens sounded" names the key's function (P2). "Cesspool" and "arena" are not words anyone would use
  for this quarry (central rule).
- **WIC27B-03, easy.** Options icebox / lookout / mortuary / lodge for a cave. One sentence ("uncut bones of adults
  and children, dusted with red ochre") decides it; "icebox" fails the surface read.
- **WIC27D-03, dropped for the explanation.** Options border / artery / aqueduct / commons. The passage was fine;
  the explanation rejected "artery" because "two feet of water floats no barge", reading it only as a shipping
  route. A grader: "artery also works as a supply-line metaphor, so the stronger point is that aqueduct names the
  drinking-water function exactly." P6.
- **WIC27D-07, dropped for the explanation.** Options cistern / cooler / chimney / bellows. The explanation rejected
  "cooler" because ferns stay green inside the mouth all winter, a fact that shows a steady temperature and so
  supports "cooler". P6: never cite a fact that could support the word you are rejecting.
- **WIC27A-03, kept MEDIUM (all three: medium, `n_struck` 1, distractors plausible).** Options fortress / haven /
  depot / gateway for a coaling island. Graders: "haven/gateway fit the strait geography but not the coal detail."
  One mechanism (coal) decided everything; "fortress" was struck at a glance. P1.

## How to build one item
1. **Pick a topic with a real mechanism**: a process, a system, a sequence with consequences. Then pick four words
   from that topic's own field, all of which a writer on this subject could use in the blank (central rule). Same
   part of speech, same shape (all one word, or all two words), each passes rule B, no near-opposites (rule C), no
   near-synonyms that differ only in degree or scope.
2. **Frame.** Write the shared opening and the **blank sentence**, which contains `______`. The blank sentence must
   be **word-for-word identical in all four worlds**, and all four words must fit it naturally. Check rule E and
   the frame rule (vary its position and wording across your 8 items).
3. **Self-test, then four mechanisms.** For each world, before writing it, fill in `surface_fit` and `inference`
   for its three wrong words. If any wrong word has no inference step beyond absence, change the word or the plan
   now. Then write the mechanism sentences over two or more sentences (rule A), with no sentence that paraphrases
   the key (P2), killing facts stated neutrally (P3), and the setting tempting toward one wrong word (P4).
   - At most ONE wrong word per world may be ruled out by a phrase that contradicts it outright (`explicit`). The
     others are ruled out by `logic`.
4. **Cross-check all sixteen pairs.** For every world, read each wrong word into the blank and ask:
   - Would a strong student strike this on a surface read? (If yes, it fails the central rule and P1.)
   - Could a careful strong student defend it, even with a stretch? (If yes, two answers.)
   - Is it literally true of something the passage reports (rule D)?

   Rewrite until the answers are no, no, no for every wrong word in every world.
5. **Explanation (P6).** For each world: the key with the facts that combine to give it, then each wrong word with
   its decisive reason, in the word's broadest ordinary sense, never a fact that could support it.
6. **Symmetry.** Do not write one "native" world and bend the passage three times for the others.
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
  - `surface_fit`: why the word survives a surface read (fits the blank's sentence and the topic);
  - `inference`: the inference step that kills it. Absence claims ("the passage never says", "nothing suggests",
    "no evidence", "unsupported") are refused.

  The quote shows WHERE the reader finds the reason. It is not a license to plant a clause for it (rule A).
- \* **No pivot** (rule A).
- \* **Frame variety** (above): blank sentence ends the passage in at most 5 of your 8 items; an intensifier in at
  most 2 of 8.
- \* **Letters.** Every option word starts with a letter in YOUR range:

  | Author | Letters |
  |---|---|
  | A | a-c |
  | B | o-r |
  | C | d-h |
  | D | i-n |
  | E | s-z |

  The ranges are rotated again: no author works in letters it held in v27 or in v26.
- \* **Exclusion.** The self-check refuses any word that is:
  - a live WIC word (key or distractor; 187 live rows);
  - any v17-v27 option word (key or distractor, kept or dropped, served or unserved), or a stem or inflection of
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
- \* **Nouns and verbs: at least 6 of your 8 option sets.** See P5.
- **Word level** (rule B): the four words about equally common. Declare `rarity_order` (most common first); it is
  used after grading to check that kept keys are not skewed toward common or rare words.
- \* **Explanation per world.** 2-4 sentences. Quote the key and say why each other word fails, naming each by its
  word. Never refer to an option by a letter. P6 is not checked by the script; the probe's phase 2 and the graders
  check it.

## File format: ONE file per item
Path: `scripts/study-bank/sat-cs-wic-v28-work/<L>/WIC28<L>-NN.json`, with NN = 01..08.

```json
{
  "id": "WIC28A-01",
  "domain": "Craft and Structure",
  "subskill": "Words in Context",
  "difficulty": "hard",
  "topic_tag": "short topic",
  "prompt": "Which choice completes the text with the most logical and precise word or phrase?",
  "choices": ["w1", "w2", "w3", "w4"],
  "antonym_pairs": [],
  "rarity_order": ["most common", "...", "...", "rarest"],
  "pos": "verb",
  "after_blank": "",
  "blank_sentence": "<identical in all four worlds, contains ______>",
  "worlds": [
    {
      "key": "w1",
      "passage": "<sentences for w1, with the blank_sentence where it belongs>",
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

Choice order does not matter; it is re-dealt after selection.

## Loop
After EACH file, run:

    cd /Users/andylee/Downloads/saas/classraum && node scripts/study-bank/wic28-selfcheck.mjs <L>

Fix every PROBLEM on your own items. The per-author count rules (noun/verb share, shapes, frame variety) fire once
you have 8 files. A `warn` line means the exact span that kills a word in one world also appears in the world where
that word is the key: legitimate if the kill depends on another sentence too, but look at it.

Then, reading each world as a student who has never seen the other three, do the sixteen-pair cross-check (step 4)
once more and check the central rule, P1-P6 and A-E.

## After all 8: the world probe and the ONE revision round
When every author has 8 green files, four fresh readers each read one world of every item. In phase 1 they answer
the graders' own questions cold, including `n_struck`, `distractor_quality` and the graders' difficulty definition;
in phase 2 they see that world's key and your explanation and judge whether the explanation's reasoning holds. You
then get `sat-cs-wic-v28-work/<L>/PROBE-FEEDBACK.json`, listing each named world with the reader's fields, notes and
`must_revise` reasons, plus any cross-item patterns the readers noticed (`_batch_tells_listed_only`).
- **MUST revise** (a world left unchanged blocks the freeze for the whole batch):
  - rated easy, or two or more wrong words struck, or distractors rated weak or plausible, or the key judged not
    ok: rewrite the world's PASSAGE;
  - explanation path judged wrong: rewrite the world's EXPLANATION (and the passage too, if the note shows the
    passage leaves the rejection open).
- A struck or weak word failed the surface read in that world. Rewrite the world so the setting or mechanism makes
  that word tempting, and so only an inference step kills it. A revision cannot change the four words (they are
  shared by all four worlds and are the four keys), so if a word is struck in several worlds, rethink the item's
  mechanism.
- Fix every named "second defensible", "distractor fits literally", "presupposes absent" and "antonym pair" world.
- If the readers name a cross-item pattern that covers your items, break it in your revision where you can.
- A revision rewrites a world. It never changes the world's key, never changes the four words, and never removes a
  world. Re-run the self-check after revising.
- After the revision round the text is frozen, whatever the outcome. There is no second round.

## Process rules
- Write 4 items per run (the run brief says which numbers). Then stop and report:
  - the self-check line;
  - the three WORLDS (item id + key) you consider weakest, and why: name the wrong word most likely to be struck on
    a surface read.
- NEVER run `wic28-select.mjs`, `wic28-wprobe.mjs` or any render script, and never try to work out which world will
  be served. The seed depends on the frozen text. Make all four worlds equally good.
- Never touch another author's folder or any file outside your own folder.
- NEVER run pkill, killall, or any command that kills processes.
- No GPT or other non-Claude model. Do not call any model API.
