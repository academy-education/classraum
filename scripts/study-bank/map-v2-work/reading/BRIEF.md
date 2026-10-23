# map-v2 Reading, batch 1 — author brief (grades 5-8: 8 passage authors x 6 passages x 3 items, 2 vocabulary authors x 32 items)

You are writing questions for Classraum, a test-prep app. Real students preparing for MAP Growth Reading (grades
5-8) will take these as practice tests. A human reviewer (the co-founder) sits a sample of every batch blind
before any of it goes live; if he finds one item with more than one defensible answer, the whole batch goes back
for a full sitting. Quality over speed.

Your task message names your **author code**: R1-R8 (passages) or V1, V2 (standalone vocabulary). Write ONLY your
own assignment (tables at the end).

**Hard bans.** Never run `pkill`, `killall`, `kill` or any other process-killing command. Do not run git. No web.
Use only your own (Claude) writing; no external model calls, no GPT. **Never open, search for, quote or imitate any
NWEA/MAP item, any file with "herald" in its name, or any PDF.** Do not touch the database. Do not open another
author's folder. Do not run insert scripts, npm or jest.

`WORK` = `/Users/andylee/Downloads/saas/classraum/scratchpad/map-v2-read-work/<your code>/` (git-excluded; create it).
Files you may open: this brief; `scripts/study-bank/map-v2-work/reading/` (`assignments.json`,
`EXCLUSIONS-reading-passages.txt`, `EXCLUSIONS-vocab-words.txt`, `merge.mjs`, `vocab-check.mjs`); and, as the
format and quality model for passage authors, `scratchpad/isee-draft16-work/authored/d16.py` (an agent-written
ISEE batch the co-founder's process accepted; MAP differs: three items per passage, grades 5-8, no attitude-word
table). Nothing else.

## Why this batch, in four lines

MAP Reading draws 13 Literary Text items (by passage, 3 per passage), 13 Informational Text items (by passage) and
13 Vocabulary items (one at a time) per form. Five forms need 19 more passages in each text area and 53 more
vocabulary items. The 24 draft-1 items the co-founder sat were 24/24 "only defensible" and he scored 5/24 blind
(the AI options-only attack had read the same cohort at 84.3%: for this family the model's guessability number
does not reach a person, so it is not used; his sitting and the with-source checks decide).

## PASSAGE AUTHORS (R1-R8)

### Your six passages

Your table (end of this file) fixes each passage's id, area (Literary or Informational Text), grade, genre and
**subject field**. Inside the field, choose ONE specific, fresh subject. Before choosing each subject, grep
`EXCLUSIONS-reading-passages.txt` (730 passage openings across MAP, SSAT, ISEE, ACT and TOEFL, live and staged)
for its key nouns; if any line shares its subject, central object or situation, choose another. Also avoid every
topic in this list (earlier MAP drafts): bread, baking, bake sales, cookies; beavers, creeks drying up, meadows;
time zones, railway time, clocks, tower clocks, bells; Dutch flood control, dikes; telescopes, shop windows,
saving up for something in a shop; skate parks, town council votes; science fairs; bean seeds, plant growth
experiments; garage surprises; libraries, borrowing; honeybees, bees; community gardens; rescue dogs; sloths;
compost; ice-melting experiments; cabins; chores lists; creek clean-ups; book reports; rafts, ferries, river
crossings; chess; orienteering; buses; ponds freezing; theatre tech; family road trips; repair cafes; telephone
switchboards; ice harvesting; lichens; ants; lighthouses, boat building, carousels, pianos, beetles, stone walls,
surveyors, film archives, attics, street signs, chimney swifts, narrow-gauge railways, swimming pools,
footbridges, bicycle races, typewriters, markets, cricket, reservoirs, rain gauges, orchards, pollination, sewing,
moths, choirs, ballet, accordions, printers, plant nurseries, dictionaries, hawks, raccoons, millstones, mayflies,
canal tolls, penalty kicks, spelling bees, barbershops, tardigrades.

Grade sizing (hard limits; merge.mjs checks them):

| grade | words (prose) | reading level |
|---|---|---|
| 5 | 170-260 | grade-5 vocabulary, mostly simple and compound sentences |
| 6 | 200-300 | grade 6 |
| 7 | 240-340 | grade 7 |
| 8 | 280-380 | grade 8 |

Poems 120-260 words, lines separated by `\n`, stanzas by a blank line. Paragraphs are separated by `\n\n`.
Drama: speaker names in capitals followed by a colon, stage directions in square brackets.

- **Original prose or verse only.** Invented people and places are usually better. History and biography of REAL
  people: only well-documented facts, hedged where uncertain ("about", "roughly"); never attach an invented event to
  a real named place or person. Science: real science, stated carefully; if you are not certain a fact is true,
  leave it out. A false passage is worse than a dull one (AUTHORING-RULES 4).
- **Naturalness matters most.** Earlier agent passages were rated "assembled rather than written". Banned:
  filler negations (at most ONE negation word per paragraph: not, no, never, nothing, nor, none, neither, n't,
  nobody, nowhere, cannot; merge.mjs counts them); endings that list feelings or announce the moral; template
  rhythm; the same key noun hammered in every paragraph; a sentence that exists only so a question can be asked.
- Write the way a good children's magazine or grade-level anthology piece reads: concrete, specific, a real voice.
- Check the story's internal logic line by line: who knows what when, objects that appear without explanation,
  names and numbers, the timeline (AUTHORING-RULES 5; a reviewer caught a notebook entry under the wrong person).
- No answer may be reachable from general knowledge (earlier drafts leaked through US time zones and Dutch flood
  control).

### Three items per passage, all in the passage's own area

**Literary Text** passages: exactly one `theme` item ("Which statement best expresses a theme of the story/poem?";
vary the stem) plus two DIFFERENT kinds from: `inference` (a character's motive, change, relationship),
`character`, `point-of-view` (narrator or speaker), `structure` (how a part fits the whole: a stanza, a scene, the
ending), `figurative` (what an image or figure of speech conveys), `purpose` (why the author includes a detail).

**Informational Text** passages: exactly one `central-idea` item (or "best summary") plus two DIFFERENT kinds from:
`detail` ("According to the passage..."), `inference`, `structure` (how the text is organized; how a paragraph
relates to the one before), `purpose` (why the author includes a paragraph or detail), `point-of-view` (the
author's view or claim), `evidence` ("Which sentence from the passage best supports...": options are four real
passage sentences, quoted exactly).

Do not write vocabulary items for your passages: Vocabulary is drawn one item at a time and is written by V1/V2.

Difficulty: spread easy / medium / hard across your 18 items (about 5 / 8 / 5). `hard` means a student must put
two parts of the passage together, never that the wording is obscure.

**The co-founder's rules (from his notes on earlier batches; they are why ISEE and SSAT drafts now pass him):**
1. **Central-idea and theme distractors are on-topic.** Each is a real part of the passage but not the whole,
   central but too narrow, or a misreading of the centre. Never an obviously unrelated topic. He: "All four are
   easy to eliminate."
2. **Inference, purpose and structure keys never restate one sentence.** If the answer is stated nearly verbatim,
   it is a detail item: relabel it or make it a real inference that needs two pieces of the passage.
3. **Exactly one defensible answer.** For every wrong option write a `fault` and a `reason` that points at the
   passage: `contradicts` (the passage says otherwise, quote it), `not in passage`, `too narrow`, `too broad`,
   `overstates` (a hedged claim made absolute), `wrong part` (true of a different character, time or paragraph),
   `different question`. "Not as good as the key" is not a fault; if you cannot point at text that kills it, it is
   a second answer: rewrite it.
4. **The key uses the passage's own sense**, no narrower synonym, no detail the passage does not give, and states
   only what the passage states about the right person.
5. **No length tell.** Distractors as specific and as long as the key. Length ratio inside an item at most 1.5;
   across your 18, key uniquely longest about a quarter of the time and never more than a third (merge.mjs counts
   both ends). Fix by lengthening a distractor, never by trimming the key into vagueness. (When Claude writes MC
   items the key comes out uniquely longest about half the time unless checked.)
6. **No cross-item pattern.** Across your 18 items vary key wording and claim type; no two keys open with the same
   five words (merge.mjs checks); no recurring option cast.
7. Explanations and rationales quote their choice in double quotes, and every other quotation in them is verbatim
   passage text (the quote check enforces it). Never name a letter.
8. A stem that points at "paragraph 3", "the second stanza" or "the final paragraph" must point at the block that
   really holds it: count blank-line-separated blocks; paragraph breaks must survive in the passage string.

### Format (one JSON array of six passage sets in `WORK/<code>.json`)

```json
{
  "passage_id": "MRV2-R1-P01", "title": "...", "map_area": "Literary Text", "genre": "realistic fiction",
  "grade_target": 5, "rit_band": "RIT 190-199 | 200-209 | 210-219 | 220-229 (your estimate)", "subject": "the specific subject you chose",
  "exclusion_greps": ["the terms you grepped in EXCLUSIONS-reading-passages.txt, and the closest line you found"],
  "passage": "...\n\n...",
  "items": [
    {"qid": "MRV2-R1-P01-1", "kind": "theme", "difficulty": "medium", "prompt": "...",
     "choices": ["...", "...", "...", "..."], "correct_answer": "...",
     "why": "<verbatim passage substring that supports the key>",
     "explanation": "\"<key>\" is correct: ...",
     "distractor_rationales": [{"choice": "...", "fault": "too narrow", "reason": "\"<choice>\" ... (points at the passage)"}, ... 3]}
  ]
}
```

Check, from the repo root, until all three report zero problems:

    node scripts/study-bank/map-v2-work/reading/merge.mjs <WORK>/<code>.json
    node scripts/study-bank/check-explanation-quotes.mjs <WORK>/<code>.merged.json
    node -e 'import("./scripts/study-bank/check-location-refs.mjs").then(({checkItem})=>{const m=require(process.argv[1]);for(const it of m.items){const r=checkItem(it);if(r.status==="mismatch")console.log(it.qid,r)}})' <WORK>/<code>.merged.json

(merge prints "mechanical problems: 0"; the quote check prints "not in passage or options 0"; the location check
prints nothing.)

## VOCABULARY AUTHORS (V1: grades 5-6, target words a-m; V2: grades 7-8, target words n-z)

32 standalone items each: ids `MRV2-V1-01`..`32` (01-16 the lower grade, 17-32 the higher), same for V2. Each item
is a short context of 1-4 sentences (`context`, at most 80 words, on any everyday or school subject) and one
question. The starting-letter split makes it impossible for the two of you to test the same word. Never test a
word in `EXCLUSIONS-vocab-words.txt` (256 words already tested in the bank). Mix, per author:

| subtype | n | what it asks | the wrong options |
|---|---|---|---|
| `multiple-meaning` | 9 | a common word used in a less common sense: "What does the word *strike* mean in this sentence?" | OTHER real senses of the same word that clearly do not fit this context (the rule the co-founder accepted in ISEE and SSAT drafts) |
| `context-clue` | 9 | a word a grade-level student may not know, with a definition, synonym, antonym or example clue in the context | meanings that fit the sentence's grammar and general topic but miss the clue: what a student who skims would choose; never a dictionary gloss beside three off-topic words |
| `word-parts` | 6 | a Greek or Latin root or affix: "Based on the prefix, what does *misjudge* mean?" (with a short context) | meanings built from a wrong reading of the part (the other common meaning of the prefix; the root read as a look-alike) |
| `figurative` | 4 | an idiom, simile or metaphor in context: "What does the phrase ... suggest about Leo?" | literal readings, and readings that fit a different character or moment |
| `connotation` | 4 | shades of meaning: "Which word best replaces *walked* to show that Mia was tired?" | real words close in meaning whose connotation is wrong for THIS context |

Rules:
- One defensible answer; every wrong option gets a `fault` (`other sense`, `misses the clue`, `wrong part`,
  `literal`, `wrong connotation`) and a `reason`.
- All four options in the same grammatical form and about the same length (ratio at most 1.5); key uniquely
  longest about a quarter of the time, never more than a third (vocab-check.mjs counts).
- The key is never the only option that "sounds like a definition", and never the only one that fits the
  sentence's grammar (pilot 4 leaked at 88.9% that way). It is never the only option that fits the sentence's
  surface while the others are senses that could not appear there at all (pilot 3's dead options).
- Grade: choose words that grade-level texts use and grade-level students are still learning; say why in
  `grade_rationale`. US spelling.

Format (one JSON array in `WORK/<code>.json`):

```json
{"id": "MRV2-V1-01", "family": "map", "map_area": "Vocabulary", "grade_target": 5, "subtype": "multiple-meaning",
 "difficulty": "easy|medium|hard", "target_word": "strike", "context": "...", "prompt": "...",
 "choices": ["...", "...", "...", "..."], "correct_answer": "...",
 "explanation": "\"<key>\" is correct: ...", "grade_rationale": "...",
 "distractor_rationales": [{"choice": "...", "fault": "other sense", "reason": "..."}, ... 3]}
```

Check until it prints `problems: 0`:

    node scripts/study-bank/map-v2-work/reading/vocab-check.mjs <WORK>/<code>.json

## When done (everyone)

Reply with: your titles and subjects (passage authors) or your 32 target words (vocabulary authors); the check
summary lines (problems, key slots, key uniquely longest and shortest, difficulty); and the items you are least
sure have exactly one defensible answer, with why. Do not claim zero problems unless you ran the commands and saw it.

## What happens next

The coordinator runs merge.mjs over all eight passage files at once (it flags two passages on one subject), then
the co-founder-standard grader (v2) reads every item; its flags come back to you once. Then the co-founder sits a
spot sample of each batch (MAP comprehension is capped at spot level: he always sees a sample).

---

## Pasted: AUTHORING-RULES-FROM-NOTES.md (binding)

# Authoring rules from the co-founder's notes

<!-- AUTHORING-RULES-FROM-NOTES v1 -->

**Every author brief for the question bank must include this file** (paste it, or link it and copy the version
marker above into the brief so `node scripts/study-bank/apply-notes.mjs --check-brief <brief>` passes). The rules
come from `cofounder-notes.json` (his human reviews; ids in brackets are the first 8 characters of `review_id`, or a
`REG-` id for a REGISTER catch). Rules are appended by `apply-notes.mjs`, never rewritten; a superseded rule is
struck through with the reason, not deleted.

He judges; he never writes. These rules record what he caught so the next batch does not need him to catch it again.
Their effect is measured only as his flag and note rate on fresh batches, never on items he has seen.

## A. Release-blocking (an item that breaks one of these does not ship)

1. **Exactly one defensible answer** (`second_defensible`, 42 notes, 41 blocking). For every distractor, write the fault that
   kills it: it contradicts the source, answers a different question, mistakes the register, or refers to something
   the source rules out. "It is not as good as the key" is not a fault. He flags an option that is "not completely
   wrong", "sort of correct", "also plausible". [2c7311fb, 9dc86ebd, 87fede75, a82a66d4, …]
2. **The source must decide on its own** (`source_underspecified`, 5). A Choose a Response line, or any short
   source, must contain the facts the key relies on. If the key works only by assuming a setting the line does not
   state, rewrite the line until the other replies are contradicted, not merely unmentioned. [25cbdd60, eacf3e55,
   a4674f2b, 6a5163ed, 9d0f956a]
3. **The key states only what the source states, about the right person** (`key_wrong`, 2). Check who does what to
   whom in every key; a key that adds an inference the speakers never make is wrong, even if it is the closest
   option. [4cec146d, 80a73085]
4. **Check every real-world claim** (`factual_error`, 1 + REG-offside). A passage about a real sport, game, law,
   procedure, place or named science gets its rule checked against an authoritative source before staging, not
   just its story logic. Fiction may invent people; it may not get a real rule wrong. [8dd87249, REG-offside]
5. **The source must not contradict itself** (`self_contradiction`, 3 + REG-goldfish, REG-v6-04, REG-v6-12). Before
   staging, read each passage or transcript line by line for dates, names, numbers, who-knows-what-when and
   explanations, and confirm the ending does not assert something an earlier line denies ("origin is a mystery" vs.
   "invented to justify"). [237a4f2f, 2f3a84af, 2dca0772]
6. **Transcripts sound like speech** (`unnatural_speech`, 4 + REG-v6-contractions). Use contractions throughout
   ("I don't", "it's", "won't"); no "Let us do that"; every line follows from the previous turn, none exists only to
   set up a question; establish a speaker's gender in the transcript before any option says "he"/"she"; keep
   speaker labels consistent across the set (student = A). [c1307ad6, 2dca0772, eb494e08, d2cfedbb, 4eca5525]
7. **No cross-item key pattern** (`batch_pattern`, 2 + REG-abcd-deal). Across a batch, vary key position (never a
   repeating A-B-C-D run), key form (a dash, semicolon or hedge must not appear only in keys), key prose (the same
   wording or claim type must not key many items), and construction (let different parties be the committed one).
   [4d2b87e1, 120b33a2, REG-abcd-deal]

## B. Quality (he accepts the item but asks for better; these make his next sitting shorter)

8. **Closer distractors on main-idea, purpose and attitude items** (`distractor_too_easy`, 14). At least two
   distractors should be tempting: a real part of the passage that is not the whole, a central point stated too
   narrowly, an overstatement of a hedged claim. He: "All four are easy to eliminate." [f7cacf39, e46b72a0, …]
9. **Tailor attitude option sets to the passage** (`option_set_reused`, 1 + REG-attitude-sets). Do not reuse
   amused / critical / uneasy / admiring / regretful; include near-neighbours of the key (nostalgic, resigned,
   indifferent, skeptical, detached). [7c8aab32, 26ae474d]
10. **The key uses the passage's own sense** (`key_imprecise`, 12). No narrower or regional synonym ("stall" for
    fail, "queue" for loose lines), no detail the passage does not give ("village pond"), no "settings" where the
    passage means what is controlled. [b3cf68ab, b30f004e, f7330481, 32985a85]
11. **The skill label matches the item** (`skill_mislabel`, 2). A purpose or inference item whose answer is stated
    almost word for word is a detail item: relabel it or make it a real inference. [7163deb4, 56bf4092]
12. **The key must not stand out** (`key_stands_out`, 46). Not uniquely longest, not the only option outside a shared
    category, wording or polarity. (Bank-side caps already enforce length.)
13. **Options are grammatical and do not copy the passage** (`option_wording`, 5). [cf2d90b9, 1544b368, d9e34532]
14. **Display**: paragraph and stanza breaks must survive into the item; a stem that says "the final paragraph" is
    unanswerable without them (`formatting`). [d3fd0c01, 45af4dc8]

---

## Passage assignments (also in assignments.json; 6 passages per grade in each area across R1-R8)

### Author R1

| passage_id | area | grade | genre | subject field (choose ONE specific fresh topic inside it) |
|---|---|---|---|---|
| MRV2-R1-P01 | Literary Text | 5 | realistic fiction | a team or group practising for one event (not chess, not a choir, not a race) |
| MRV2-R1-P02 | Literary Text | 6 | poem | a city street at one hour of the day |
| MRV2-R1-P03 | Literary Text | 7 | folktale | an invented trickster tale from an invented village |
| MRV2-R1-P04 | Informational Text | 6 | science article | earth science: rocks, minerals, caves, volcanoes or soil |
| MRV2-R1-P05 | Informational Text | 7 | history article | an ancient or medieval invention or trade (before 1500) |
| MRV2-R1-P06 | Informational Text | 8 | how-it-works | how one musical instrument or sound device works |

### Author R2

| passage_id | area | grade | genre | subject field (choose ONE specific fresh topic inside it) |
|---|---|---|---|---|
| MRV2-R2-P01 | Literary Text | 6 | historical fiction | a child in an invented town in a plausible past (no real named events) |
| MRV2-R2-P02 | Literary Text | 7 | drama | a short scene: two or three speakers, stage directions |
| MRV2-R2-P03 | Literary Text | 8 | poem | one animal observed closely |
| MRV2-R2-P04 | Informational Text | 5 | science article | animal behaviour on land (not wolves, beavers, sloths, raccoons, ants, bees) |
| MRV2-R2-P05 | Informational Text | 7 | biography | an inventor or engineer, real, well documented |
| MRV2-R2-P06 | Informational Text | 8 | opinion essay | a food or farming choice (argued, with a counterclaim) |

### Author R3

| passage_id | area | grade | genre | subject field (choose ONE specific fresh topic inside it) |
|---|---|---|---|---|
| MRV2-R3-P01 | Literary Text | 5 | science fiction | a near-future household or school device |
| MRV2-R3-P02 | Literary Text | 7 | realistic fiction | a family disagreement resolved by a discovery |
| MRV2-R3-P03 | Literary Text | 8 | fable | an invented fable with animal characters and a stated or implied lesson |
| MRV2-R3-P04 | Informational Text | 5 | history article | daily life in a past century (1500-1900), any country |
| MRV2-R3-P05 | Informational Text | 6 | science article | plants or fungi (not lichens, aspen clones, starwort, orchards) |
| MRV2-R3-P06 | Informational Text | 8 | how-it-works | the human body during sport or exercise |

### Author R4

| passage_id | area | grade | genre | subject field (choose ONE specific fresh topic inside it) |
|---|---|---|---|---|
| MRV2-R4-P01 | Literary Text | 5 | mystery | a small puzzle solved by noticing a clue |
| MRV2-R4-P02 | Literary Text | 6 | personal narrative | a first attempt at a skill, told in first person |
| MRV2-R4-P03 | Literary Text | 8 | poem | a season or weather change (not storms in valleys, not frost on orchards) |
| MRV2-R4-P04 | Informational Text | 5 | biography | a painter, sculptor, composer or dancer, real, well documented |
| MRV2-R4-P05 | Informational Text | 6 | science article | weather and climate processes |
| MRV2-R4-P06 | Informational Text | 7 | how-it-works | an everyday digital or electric technology |

### Author R5

| passage_id | area | grade | genre | subject field (choose ONE specific fresh topic inside it) |
|---|---|---|---|---|
| MRV2-R5-P01 | Literary Text | 5 | humorous story | a plan that goes comically wrong |
| MRV2-R5-P02 | Literary Text | 6 | myth-style tale | an invented origin tale (why something in nature is as it is), invented culture |
| MRV2-R5-P03 | Literary Text | 7 | poem | an ordinary household object |
| MRV2-R5-P04 | Informational Text | 6 | science article | astronomy and space (not telescopes, not Mars gullies) |
| MRV2-R5-P05 | Informational Text | 7 | history article | maps, navigation or exploration before 1800 |
| MRV2-R5-P06 | Informational Text | 8 | opinion essay | a school or community question (argued, with a counterclaim; not skate parks, not council votes, not start times) |

### Author R6

| passage_id | area | grade | genre | subject field (choose ONE specific fresh topic inside it) |
|---|---|---|---|---|
| MRV2-R6-P01 | Literary Text | 6 | realistic fiction | moving to a new place and one new friend |
| MRV2-R6-P02 | Literary Text | 7 | drama | a short scene set at work or in a shop (not a bakery, not a market) |
| MRV2-R6-P03 | Literary Text | 8 | historical fiction | an invented family during a plausible past hardship (no real named events) |
| MRV2-R6-P04 | Informational Text | 5 | science article | ocean or freshwater animals (not cleaner wrasse, mayflies, octopus colour) |
| MRV2-R6-P05 | Informational Text | 7 | history article | archaeology: how one kind of evidence about the past is found and read |
| MRV2-R6-P06 | Informational Text | 8 | how-it-works | chemistry in the kitchen or house (not bread, not ice-melting) |

### Author R7

| passage_id | area | grade | genre | subject field (choose ONE specific fresh topic inside it) |
|---|---|---|---|---|
| MRV2-R7-P01 | Literary Text | 5 | fantasy | an ordinary child meets one magical rule with a cost |
| MRV2-R7-P02 | Literary Text | 7 | personal narrative | a memory of a grandparent or older neighbour teaching something |
| MRV2-R7-P03 | Literary Text | 8 | realistic fiction | a first job or a responsibility at work |
| MRV2-R7-P04 | Informational Text | 5 | how-it-works | simple machines or forces in a playground or toy |
| MRV2-R7-P05 | Informational Text | 6 | history article | the history of one form of communication or transport (not telephone switchboards, not buses, not narrow-gauge railways) |
| MRV2-R7-P06 | Informational Text | 8 | opinion essay | an environmental choice people disagree about (argued, with a counterclaim; not invasive species) |

### Author R8

| passage_id | area | grade | genre | subject field (choose ONE specific fresh topic inside it) |
|---|---|---|---|---|
| MRV2-R8-P01 | Literary Text | 5 | adventure story | getting lost or stuck outdoors and getting back |
| MRV2-R8-P02 | Literary Text | 6 | fable | an invented fable with a twist ending |
| MRV2-R8-P03 | Literary Text | 8 | poem | the sea, the sky or a night outdoors |
| MRV2-R8-P04 | Informational Text | 5 | science article | birds, insects or other small animals (not bees, moths, ants, beetles, warblers, weaver birds, hawks, chimney swifts) |
| MRV2-R8-P05 | Informational Text | 6 | biography | a scientist or explorer, real, well documented |
| MRV2-R8-P06 | Informational Text | 7 | how-it-works | how one building or structure stays up (not lighthouses, footbridges, stone walls) |

### Vocabulary authors

| author | ids | grades | target words start with |
|---|---|---|---|
| V1 | MRV2-V1-01..16 grade 5, 17..32 grade 6 | 5, 6 | a-m |
| V2 | MRV2-V2-01..16 grade 7, 17..32 grade 8 | 7, 8 | n-z |
