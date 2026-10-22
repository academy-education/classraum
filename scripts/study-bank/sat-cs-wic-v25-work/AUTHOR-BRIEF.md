# sat-cs-wic-v25 author brief: Digital SAT Words in Context, all hard, FOUR-WORLD method

You write Digital SAT Reading & Writing **Words in Context** items. This round uses a new method. Read this whole
brief before you write anything. The pre-registration is `scripts/study-bank/PREREG-WIC25-2026-10-23.md`.

## Why the method changed
The last two batches (v23, v24) were held. Readers who saw only the four option words, with no passage, picked the
key well above chance. They used three tricks:
- the most natural or most precise word;
- one side of an opposite pair;
- the odd one out.

Rules about the words did not fix this, because the author always knew which word was the answer and the other
three were chosen around it.

So this round, **no word is "the answer" while you write.** For each item you write:
- ONE set of four words;
- FOUR versions of the passage ("worlds").

In world k, word k is the only correct answer and the passage's logic rules out the other three. After every file
is frozen, a seeded random draw picks one world per item to serve. The other three worlds are never shown to anyone.
Every word is the answer in one of its worlds, so the four words alone say nothing about which world was served.

What this needs from you: **each of the four worlds must be a real, hard, single-answer SAT item.** Any world might
be the one served. A weak world is a weak item a quarter of the time. Graders see only the served world and judge
it as an ordinary item.

## How to build one item
1. **Frame.** Write the parts all four worlds share:
   - an opening sentence or two that sets the topic;
   - the **blank sentence**, which contains `______`.

   The blank sentence must be **word-for-word identical in all four worlds.** On its own, all four words must fit
   it grammatically and sensibly.
2. **Four words.** Choose four words with these properties:
   - the same part of speech, and the same shape (all one word, or all two words);
   - each fits the blank sentence;
   - each could be the precise answer if the surrounding sentences said the right thing.

   No two may be opposites or near-opposites. No two may be near-synonyms that differ only in degree or scope
   ("stretch" vs "shift"). Those pairs cannot be separated cleanly, and graders will name a second answer.
3. **Deciding sentences.** For each word, write the one or two sentences that make it the unique answer in its
   world. These sentences are what changes between worlds. Everything else stays the same where you can.
   - Each wrong word must be killed by a fact the reader has to combine with the blank sentence: a timeline, a
     cause, a scope, a before-and-after, a purpose.
   - At most ONE wrong word per world may be killed by a single phrase that contradicts it outright (`explicit`).
     The others are killed by `logic`.
   - Never write a sentence whose only job is to contradict one wrong word.
4. **Cross-check all sixteen pairs.** For every world, read each of the three wrong words into the blank. Ask:
   could a careful strong student defend this word here? If yes, even with a stretch, rewrite that world until the
   answer is no. Exactly one word may be defensible in each world.
5. **Symmetry.** Do not write one "native" world and then bend the passage three times to fit the other words.
   - Every world must read as naturally as the others.
   - World lengths must stay within 1.3x of each other (checked).
   - Every pair of worlds must share at least 40% of its content words (checked). In practice: keep the opening and
     the blank sentence fixed and change one or two deciding sentences.

   A contorted world is a with-source tell, and contorted worlds are the ones graders drop. Dropping them would
   tilt the kept keys back toward the "natural" word. The pipeline measures that tilt at stage 5 and will hold the
   whole batch if it finds it.

## Worked example (its four words are spent: the self-check refuses them)
Option set: **outstayed / reflected / parceled / rerouted** (verb; the word after the blank is "the").

Shared opening:
> In 1612 the town council issued a charter regulating the weavers who sold cloth in its market.

Shared blank sentence:
> Writing two centuries later, one historian concluded that the charter had ______ the trade it was drafted to govern.

The deciding sentence of each world:

| World | Key | Deciding sentence | How it kills the other three |
|---|---|---|---|
| 0 | outstayed | "Its rules were new, and they applied alike to every weaver, but within a generation cheap imported cloth had driven every local weaver out of business, while the council kept renewing the charter each year until 1790." | "rules were new" kills reflected (explicit). "applied alike to every weaver" kills parceled. "out of business" kills rerouted: the trade died, it did not move. |
| 1 | reflected | "Its clauses on prices, apprenticeships, and market days wrote down arrangements the weavers had followed for decades, and the trade carried on exactly as before until it collapsed in the 1650s, when the charter lapsed with it." | "the charter lapsed with it" kills outstayed. "carried on exactly as before" kills parceled and rerouted. |
| 2 | parceled | "Before it, any weaver could sell any cloth; afterward, wool weavers held the north side of the market and linen weavers the south, and neither could sell the other's goods, an arrangement that ended along with the charter in the 1650s." | "any weaver could sell any cloth" kills reflected. "ended along with the charter" kills outstayed. "north side of the market" kills rerouted: the trade stayed put. |
| 3 | rerouted | "Because it taxed cloth sold in the market square but not cloth sold at the river docks, within a decade nearly all weavers had moved their stalls to the docks, and the charter was repealed in the 1650s." | "the charter was repealed" kills outstayed: the trade went on at the docks. "moved their stalls to the docks" kills reflected. "nearly all weavers had moved" kills parceled: they moved as a whole. |

The blank sentence alone cannot decide this item, because the same sentence has a different answer in each world.
So the key always needs the blank sentence plus another sentence. That is exactly what "hard" requires, and here
it holds by construction.

## Rules (the self-check enforces the starred ones)
- \* **Four worlds, four different keys.**
  - Each world names its `key`.
  - The four keys are the four `choices`, each used once.
  - A world that reuses another world's key is refused.
- \* **Identical blank sentence.**
  - `blank_sentence` must appear verbatim in every world's passage.
  - No two items may share a blank sentence.
- \* **Kills come from outside the blank sentence.**
  - For every world, list a kill for each of its three wrong words, with:
    - `type`: `logic` or `explicit`;
    - `quote`: 2+ consecutive words of THAT world's passage, lying outside the blank sentence;
    - `why`.
  - At most one `explicit` per world.
- \* **Letters.** Every option word starts with a letter in YOUR range:

  | Author | Letters |
  |---|---|
  | A | s-z |
  | B | a-f |
  | C | g-l |
  | D | m-r |

  The ranges are rotated from v24, and none is narrower than 6 letters.
- \* **Exclusion.** The self-check refuses any word that is:
  - a live WIC word;
  - any v17-v24 option word (key or distractor, kept or dropped), or a stem or inflection of one;
  - a word another author used;
  - a denylisted word.
- \* **No opposites.** `antonym_pairs: []`, and mean it.
- \* **Shape.**
  - Every item `difficulty: "hard"`.
  - Every world has `key_from_one_sentence: false`.
  - Each world declares its `shape`: cause and mechanism, comparison of two cases, before and after, scope limit,
    method and purpose, process sequence, definition by example, ...
  - Use at least 4 distinct shapes across your 32 worlds.
  - "Received view overturned" may appear in at most 25% of your worlds.
- \* **Passages.**
  - Each world is 50-110 words, with exactly one blank of six underscores.
  - No "a" or "an" directly before the blank.
  - `after_blank` names the word right after the blank. It must read idiomatically with all four words.
  - Use invented or no proper names (prefer a role: "one historian"), never reused across items.
  - American punctuation and double quotes.
- **Word level.** All four words are words a strong 11th-grader reads unglossed in a quality newspaper or textbook.
  Nothing rarer: no technical terms, no GRE-only words. The four words should be about equally common.
  - Declare `rarity_order` (most common first). It is not scored per author this round. It is used to check, after
    grading, that the kept keys are not skewed toward common or rare words.
- **Nouns and verbs.** At least 3 of your 8 option sets are nouns or verbs (checked). A common word used in a
  precise sense makes a good hard key.
- \* **Explanation per world.**
  - 2-4 sentences.
  - Quote the key, and say why each of the other three words fails, naming each by its word.
  - Never refer to an option by a letter or by "option B".

## File format: ONE file per item
Path: `scripts/study-bank/sat-cs-wic-v25-work/<L>/WIC25<L>-NN.json`, with NN = 01..08.

```json
{
  "id": "WIC25A-01",
  "domain": "Craft and Structure",
  "subskill": "Words in Context",
  "difficulty": "hard",
  "topic_tag": "short topic",
  "prompt": "Which choice completes the text with the most logical and precise word or phrase?",
  "choices": ["w1", "w2", "w3", "w4"],
  "antonym_pairs": [],
  "rarity_order": ["most common", "...", "...", "rarest"],
  "pos": "verb",
  "after_blank": "the",
  "blank_sentence": "<identical in all four worlds, contains ______>",
  "worlds": [
    {
      "key": "w1",
      "passage": "<opening> <deciding sentence(s) for w1> <blank_sentence>",
      "shape": "comparison of two cases",
      "key_from_one_sentence": false,
      "explanation": "... \"w1\" ... \"w2\" fails because ...; \"w3\" ...; \"w4\" ...",
      "kills": {
        "w2": {"type": "logic", "quote": "two or more words from this passage", "why": "..."},
        "w3": {"type": "logic", "quote": "...", "why": "..."},
        "w4": {"type": "explicit", "quote": "...", "why": "..."}
      }
    },
    {"key": "w2", "...": "..."},
    {"key": "w3", "...": "..."},
    {"key": "w4", "...": "..."}
  ]
}
```

The blank sentence does not have to come last. It may sit anywhere, as long as it is identical in all four worlds.
Choice order does not matter, because it is re-dealt after selection.

## Loop
After EACH file, run:

    cd /Users/andylee/Downloads/saas/classraum && node scripts/study-bank/wic25-selfcheck.mjs <L>

Fix every PROBLEM on your own items. The per-author count rules fire once you have 8 files. A `warn` line means
the exact span that kills a word in one world also appears in the world where that word is the key. That can be
legitimate, if the kill depends on another sentence too, but look at it.

Then do the sixteen-pair cross-check (step 4) once more, reading each world as a student who has never seen the
other three.

## Process rules
- Write 4 items per run (the run brief says which numbers). Then stop and report:
  - the self-check line;
  - the three WORLDS (item id + key) you consider weakest, and why.
- NEVER run `wic25-select.mjs`, `wic25-wprobe.mjs` or any render script, and never try to work out which world
  will be served. The seed depends on the frozen text, so you cannot know which world will be served. Make all
  four worlds equally good.
- Never touch another author's folder or any file outside your own folder.
- NEVER run pkill, killall, or any command that kills processes.
- No GPT or other non-Claude model. Do not call any model API.
