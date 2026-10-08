# ACT English v9 authoring brief (enhanced ACT, four choices)

Repo: /Users/andylee/Downloads/saas/classraum. Read FIRST, fully:
- CLAUDE.md sections "a batch built to one brief develops a cross-item tell" and "The one predictor that has held"
- scripts/study-bank/AUTHORING-BRIEF.md sections 0, 1, 2, 2b, 2c, 3, 3c-bis, 4, 5, 11, 12
- .claude/skills/bank-act-english/SKILL.md
- scripts/study-bank/act-english-v4.batch.json (the shape and the edit-in-place convention to copy)

## Why this batch exists

ACT English holds 7 forms (39 passages, all drawn). The next forms come from the passages you write. Each passage is one of two mixes, fixed per passage in the table below:
**type X = exactly 5 Conventions of Standard English, 3 Production of Writing, 2 Knowledge of Language**;
**type Y = exactly 6 Conventions of Standard English, 3 Production of Writing, 1 Knowledge of Language**.
Every author writes two type-X passages and one type-Y passage. That mix is load-bearing — do not change it.

## Shape (act-bank-helper refuses otherwise)

- One JSON array, 30 items (your 3 passages x 10). Fields exactly as v4:
  `id, passage_id, passage_title, passage, prompt, choices, correct_answer, explanation, domain, subskill, difficulty`.
- ids `ACT-EN9-P<k>-Q<nn>` (k = the passage number you are assigned, nn = 01..10); `passage_id` = `"P<k>"`.
- Passage: an original essay of 300-380 words, paragraphs marked `[1]`, `[2]`, ...; text byte-identical across its 10 items.
  Placement markers `[A]` `[B]` `[C]` `[D]` appear ONLY in a passage that has a placement item, all four in the one paragraph that item names.
- Items run in passage order (a whole-essay item may sit last).
- Edit-in-place (bank convention): the span stays in the passage as written (with the error, if any); the stem names the
  paragraph, quotes the full sentence, and quotes the span: `In paragraph 3, in the sentence "...," which choice makes the sentence most grammatically acceptable in place of "span"?`
  Vary the closing wording naturally ("most grammatically acceptable", "is correctly punctuated", "most clearly", "most precise", etc.), never a line number.
- "No Change" is `choices[0]` on every Conventions, Knowledge, and transition item. Placement items use `Point [A].`..`Point [D].`.
- domain spelled exactly: `Conventions of Standard English`, `Production of Writing`, `Knowledge of Language`.
- difficulty easy|medium|hard — aim per passage roughly 3 easy / 5 medium / 2 hard, honestly.
- explanation: why the key is right and each wrong option fails by a NAMED rule; never "option B", "the first choice".
- never refer to a question NUMBER anywhere ("Question 10 asks..." is wrong once passages are drawn in any order); a whole-essay item reads "This question asks about the preceding passage as a whole." or "Suppose the writer's primary purpose had been to ..."

## Measured tells this bank has already shipped — do not reproduce any

1. Key-length: the key is not systematically the longest or shortest. Across your 30, the key may be the unique longest at most 6 times and the unique shortest at most 6 times.
2. Concision/redundancy: the key is not automatically the shortest option (a shorter option must sometimes lose needed meaning or break grammar).
3. Twin pair: no two options may be equally correct or mean the same thing (e.g. `had put` / `put`, homophones that both fit). If two options cannot be distinguished, neither can be the unique key.
4. Strike-on-sight junk: no misspelled words, no nonsense punctuation (`its'`), no option that is wrong in isolation regardless of the sentence. Every distractor must be a real student error that looks plausible until the sentence is read.
5. Subject-verb: the key verb's number must NOT be the only singular (or only plural) in the set; vary tense across options so number alone does not decide it.
6. Boundary punctuation: do not let the semicolon be the key more than twice in your 30. Use period, comma + FANBOYS, colon, dash, subordination, and No Change as keys too.
7. "No Change" is the key on exactly 6 of your Conventions/Knowledge/transition items, two per passage, on DIFFERENT subskills.
8. Production Kept/Deleted and Yes/No items: each option's reason must be as specific (passage-anchored) as the key's. The key is NOT the only option naming the paragraph's job; do not make the key the hedged/qualified option among flat absolutes, nor the plain short option among over-committed ones. Vary the key's shape item to item.
9. "Goal" items (stem states a goal: introduce, conclude, emphasize, illustrate): the key must not be the only option echoing the stem's words.
10. Every option must address the stem's axis (a redundancy item's options all vary redundancy, not punctuation).
11. No cross-item leak inside a passage: one item's options must not reveal another item's answer (e.g. a tense shown in one item's options settling another's).
12. Distractors that are rhetoric (Production) should be TRUE of the passage where possible, wrong only for the asked purpose.

## Your assignment

See the per-author table appended below. It fixes, per passage, which Production and Knowledge items you write (and for
placement/add/purpose items, what the key must be), and the Conventions subskill counts across your three passages.
Distribute the Conventions subskills so no passage repeats one subskill more than twice.

## Before you finish

1. `cd /Users/andylee/Downloads/saas/classraum && node scripts/study-bank/act-bank-helper.mjs check english scripts/study-bank/<your file>` — must print `structure OK` and the domain mix your table gives (every author: CSE 16 / PoW 9 / KoL 5).
2. Write a short self-census (in your final message, not a file): key-longest / key-shortest counts, No Change key count, semicolon key count, placement/Kept/Yes keys, and any item you think a solver could answer with the passage covered and why.
3. Do NOT run any attack, do not open other authors' files, do not insert anything, do not commit.

## Topic, voice and originality

The bank already holds 44 ACT English passages. Do NOT reuse any of their topics, titles, or character names:
The Pencil's Quiet History; The Slow Game (curling); The Cardboard Regatta; How a Swarm Chooses a Home (honeybees);
The Lantern That Runs on Waves (wave power); A Tool Library for Harlow Street; Centering (pottery wheel);
Dawn on the Salt Flat; An Atlas of the Overlooked (moss); Slow Down Linden Avenue (crosswalks); Why Some Dunes Sing;
Four in the Morning (grandmother's bakery); My Grandmother's Onggi; The Radio Drama Comes Back; How a River Moves Its Bends;
The Deep End (learning to swim); Subtraction and Addition (autumn leaves); When the Lake Was a Crop (ice harvesting);
A Wall Without Mortar (dry-stone walls); The Night Market; The Breath Inside the Pipes (pipe organs); Third Gear (manual truck);
Fairs on the Frozen Thames; Skin That Changes (octopus); The Long Clock of the Bamboo; Mouthing the Words (choir);
Profiles in Black Paper (silhouettes); Building the Grid (crosswords); The Sign Shop; Drawing in the Dark (cave surveyor);
Reading in the Dark (braille); The Moss-Green Bus (bookmobile);
Turn the Fountains Back On (public drinking fountains); Waiting Out the Drought (tardigrades); The Day the Railroads Set the Clocks (time zones);
Searching by Scent (avalanche dogs); The 7:14 Chorus (birdsong on a train platform); Wire by Wire (bridge cables);
Footsteps on Demand (Foley artists); Sold by Sunrise (fish auction); Tomorrow by Telegraph (first weather forecasts);
What the Basket Holds (consumer price index); The Air Beneath the Ice (ice cores); Plot Fourteen (community garden).
- No names already used there (Ilse, Ines, Teodor, Hana, Lorna, Dale Ferris, ...): invent fresh ones, and do not repeat a first name across your three passages.
- Do not open with "The summer I turned ..." or with a grandparent; three live passages already do.
- Write in the VOICE your table row names. Voices differ on purpose: an editorial "we", a second-person "you", a third-person present-tense profile,
  an adult (not teenage) first person, an impersonal explainer. Keep the voice consistent so tone items have something real to test.
- Real-world facts (dates, places, mechanisms) must be correct and conservative; when unsure, generalise ("in the 1850s") rather than invent a figure.
  People in profiles and memoirs are invented.

## Assignment table (write ONLY your own passages)

Every passage: its Conventions count + the 3 Production + its Knowledge item(s) listed. Put the Knowledge item(s) and the
Production items at DIFFERENT positions from passage to passage (not always the same Q numbers); items still run in passage order.

| P | author | type (CSE/PoW/KoL) | voice / topic (original essay, invent all people) | Production items (and required key) | Knowledge item(s) |
|---|---|---|---|---|---|
| 1 | A | X 5/3/2 | editorial, first-person plural ("we"): why a city should plant shade trees on its school playgrounds | transition (relation: concession); ADD-a-sentence, key = No (should not be added); goal item (best concluding sentence for the essay) | precise word choice; tone consistency |
| 2 | A | Y 6/3/1 | impersonal science explainer: how some fireflies synchronize their flashing | sentence placement, key = Point [B]; transition (relation: cause/result); goal item (detail that best illustrates a claim) | concision/redundancy where the shortest option LOSES needed meaning and is NOT the key |
| 3 | A | X 5/3/2 | third-person history: London's "Great Stink" of 1858 and the sewer system that followed | transition (relation: sequence/time); DELETE question (kept or deleted?), key = Deleted; WHOLE-ESSAY purpose (Yes/No), key = Yes | combining two sentences; concision/redundancy |
| 4 | B | X 5/3/2 | third-person present-tense profile: a farrier who shoes horses | sentence placement, key = Point [D]; goal item (choose the sentence that best introduces paragraph N); transition (relation: example) | precise word choice; combining two sentences |
| 5 | B | Y 6/3/1 | first-person ADULT reflection: learning to navigate with a paper map and compass on long hikes | transition (relation: contrast); ADD-a-sentence, key = Yes (should be added); WHOLE-ESSAY purpose (Yes/No), key = No | tone consistency |
| 6 | B | X 5/3/2 | engineering explainer: how a canal lock raises and lowers boats | sentence placement, key = Point [A]; transition (relation: addition); goal item (choice that best connects to the previous paragraph) | concision/redundancy; precise word choice |
| 7 | C | X 5/3/2 | arts/culture explainer: how stop-motion animators move puppets one frame at a time | DELETE question, key = Kept; goal item (choice that best emphasizes a contrast); transition (relation: emphasis/clarification) | combining two sentences; precise word choice |
| 8 | C | Y 6/3/1 | second-person place essay ("you"): a neighborhood laundromat late at night | transition (relation: sequence/time); goal item (best opening sentence of the essay); DELETE question, key = Deleted | concision/redundancy |
| 9 | C | X 5/3/2 | history of science: how Eratosthenes estimated the size of the Earth | sentence placement, key = Point [C]; WHOLE-ESSAY purpose (Yes/No), key = No; transition (relation: concession) | tone consistency; combining two sentences |
| 10 | D | Y 6/3/1 | social-science explainer: how pollsters choose a sample that can stand for a whole population | transition (relation: example); ADD-a-sentence, key = No; goal item (choice that best supports a claim with specific evidence) | precise word choice |
| 11 | D | X 5/3/2 | earth-science explainer: why a geyser erupts on a rough schedule | transition (relation: cause/result); ADD-a-sentence, key = Yes; goal item (best concluding sentence for paragraph N) | concision/redundancy; tone consistency |
| 12 | D | X 5/3/2 | first-person humorous memoir, older narrator: taking up ballroom dancing at sixty | transition (relation: contrast); goal item (detail that most vividly conveys the narrator's nervousness); WHOLE-ESSAY purpose (Yes/No), key = Yes | tone consistency; precise word choice |
| 13 | E | X 5/3/2 | biology explainer: how salmon find their way back to the stream where they hatched | sentence placement, key = Point [B]; DELETE question, key = Kept; transition (relation: addition) | precise word choice; concision/redundancy |
| 14 | E | Y 6/3/1 | third-person history: Britain's penny post of 1840 and how it changed letter writing | transition (relation: contrast); ADD-a-sentence, key = Yes; goal item (choose the sentence that best introduces paragraph N) | combining two sentences |
| 15 | E | X 5/3/2 | second-person process essay ("you"): your first morning learning to sail a small dinghy | DELETE question, key = Deleted; goal item (detail that best conveys the reader's uncertainty); transition (relation: cause/result) | tone consistency; concision/redundancy |

Transition items: the key is NOT No Change on more than one of an author's transition items, and the key's logical relation
follows the table (it differs across an author's three passages).

Conventions subskill counts for YOUR 16 Conventions items:

| author | sentence boundaries (splice/run-on/fragment) | commas (nonessential / unnecessary / introductory) | semicolon/colon/dash | apostrophe/possessive | subject-verb | pronoun (agreement/case/who-whom) | verb tense/form | modifier placement / parallelism | usage/idiom (comparatives, adj/adv, fewer/less) |
|---|---|---|---|---|---|---|---|---|---|
| A | 3 | 3 | 2 | 1 | 2 | 1 | 2 | 1 | 1 |
| B | 2 | 2 | 2 | 1 | 2 | 2 | 2 | 2 | 1 |
| C | 3 | 3 | 2 | 2 | 1 | 2 | 1 | 1 | 1 |
| D | 2 | 3 | 2 | 1 | 2 | 1 | 2 | 2 | 1 |
| E | 3 | 2 | 2 | 1 | 2 | 2 | 1 | 2 | 1 |

`subskill` field: a short taxonomy label (e.g. "comma splice", "nonessential clause commas", "colon before explanation",
"subject-verb agreement", "pronoun case", "verb tense consistency", "dangling modifier", "parallel structure", "idiom",
"transition", "sentence placement", "add sentence", "delete sentence", "essay purpose", "introduction", "conclusion",
"supporting detail", "concision", "word choice", "tone", "sentence combining") — not a sentence.
