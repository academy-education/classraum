# SSAT Upper Level Reading, brief v2: author one 36-item batch (6 passages x 6 items)

Version v2, cut 2026-10-31 from v1 (`SSAT-READING-AGENT-BRIEF.md`, md5 350d3265). Frozen when the first v2 batch is
written; the reason for the cut and the lessons it absorbed are in `briefs/ssat-reading.pending.md` and REGISTER §5.

You are writing questions for Classraum, a test-prep app. Real students preparing for the SSAT will take these as
practice tests. Three independent reviewers grade every item, then two more read every item with the key shown, and
**a whole passage is thrown out if any one of its six items is judged to have a second defensible answer, an
unsupported key, a key a student could pick without reading the passage, a false fact, a language error, or an
explanation that argues the wrong way.** One weak item costs five good ones. Quality over speed.

Your draft number is N (given in your task). Work ONLY inside `scratchpad/ssat-draftN-work/` under the repo root
`/Users/andylee/Downloads/saas/classraum`. Do not touch the database, git, or any other file. Do not run npm, jest or
anything that writes outside your directory. No network.

## 0. The one principle behind every shape rule here

**Reviewers read all the items of a batch together.** If any property of the options (length, breadth, number of
parts, intensity of a word, whether a word sense is "other", abstract or concrete wording, a hedge, a gloss) is
ALWAYS or NEVER true of the key, a student who has seen a few items can pick keys without reading. Reviewers of
earlier batches named three such patterns that the previous brief itself produced:

- main idea: the key was always the broadest option (and often the only two-part one);
- attitude: the key was always the one moderate word among extreme or off-tone words;
- vocabulary in context: the four distractors were always unrelated dictionary senses, so the key was the only sense
  that could fit any sentence.

So this brief never requires or forbids a property of the key. Your plan file gives **each item its own shape**,
drawn at random so every property lands on the key at about its natural rate. **Follow the per-item shape in your
plan exactly**, even when it feels unusual.

## 1. Read first
1. `scratchpad/ssat-v2-work/plans/dN.json` — YOUR plan: the six passages' genres and subject areas, and for every item
   its kind, difficulty and shape. Read only your own plan.
2. `scratchpad/ssat-draft19-work/authored/d19.py` — **the file format and the passage quality bar** (copy its helper
   functions `R`, `I` and its structure; d19's passages cleared review). Its OPTION SHAPES are the old brief's and
   are not a model: your shapes come from your plan.
3. `scratchpad/ssat-v2-work/existing-passages.txt` — the opening of every SSAT and ISEE reading passage in the bank.
   Your topics must not overlap any of them (same subject, same central object, or same situation).
4. `scripts/study-bank/ssat-reading-v2/check.mjs` — the mechanical checks your file must pass.

## 2. What to produce
`scratchpad/ssat-draftN-work/authored/dN.py`, which writes `authored/dN.json` when run, passage ids `DN-P01` …
`DN-P06`, qids `DN-P01-1` … `DN-P06-6` in the order of your plan. Then iterate until all three report zero problems:

    cd /Users/andylee/Downloads/saas/classraum/scratchpad/ssat-draftN-work && python3 authored/dN.py \
      && node ../../scripts/study-bank/ssat-reading-v2/check.mjs --draft N
    node ../../scripts/study-bank/check-explanation-quotes.mjs merged.json
    node ../ssat-draft19-work/locrefs.mjs merged.json

(check prints "mechanical problems: 0"; the quote check prints "not in passage or options 0"; locrefs prints no
mismatch line and exits 0.)

## 3. Passages
- Six passages, one per genre, in the order and subject areas of your plan (fiction, poetry, memoir, essay,
  history, science). Choose a specific, fresh subject inside each area.
- Prose 300-600 words (aim 380-450). Poem 220-400 words, stanzas separated by blank lines.
- Grade 8-11 reading level, like a real SSAT Upper Level passage: concrete, literate, with an idea worth asking
  about. Avoid sentimentality and avoid lecturing the reader.
- History: invented towns and people in a plausible past ("Tessaly Township", "Walter Briggs"). Never attach invented
  events to a real named place or person.
- Science: real science only, stated carefully; hedge numbers ("roughly", "about"). If you are not certain a fact is
  true, leave it out. **Build the science passage around something a student cannot already know**: a particular
  study and its sequence of steps, a comparison between two cases, a surprising exception, a measurement and what it
  showed. A passage that restates a textbook mechanism (why coral bleaches, how glaciers carve valleys, what pillow
  lava is) produces questions general knowledge answers, and those passages were thrown out.
- Fiction and memoir: check the story's logic line by line: who knows what when, objects that appear without
  explanation, timeline, and every frequency word (each, every, daily, only on) against every schedule in the text.
- **Mechanical constraints (check enforces):** at most ONE negation word per paragraph or stanza (not, no, never,
  nothing, nor, none, neither, nobody, nowhere, cannot, n't). No attitude word from check.mjs's DIR table anywhere in
  a passage.

## 4. Items
Kinds per your plan (every passage has at least four kinds). Five choices each. Difficulty as your plan says.
`why` must be a verbatim passage substring that supports the key; attitude items also need `why2`, a second verbatim
substring.

**R1. The covered-passage test (every item).** Cover the passage and read only the stem and the five options. If
general knowledge, the topic's expected feeling, the stem's own wording, or real-world truth leaves only one option
standing, the item is broken however hard it is with the passage. **At least three options must stay believable
with the passage covered.** In particular:
- The stem never quotes the phrase that by itself yields the key. ("A bleached coral is not dead" in the stem, with
  "correct the idea that bleaching kills a coral" as the key, was answerable from the stem.) Point to the line by
  paragraph and a few neutral words, or quote a phrase that does not decide the answer.
- Science and history keys are facts about THIS passage (its people, numbers, comparison, sequence), never the one
  option that is true in the world. Distractors on science items are things that could be true of the subject; the
  passage, not the textbook, rules them out.
- Attitude stems name a relationship whose expected feeling does not decide the answer (an adult "looking back" on a
  grandmother, with one warm option, was answerable from the stem). If the topic suggests a feeling, at least one
  distractor must be equally suggested by the topic, and the passage decides between them.

**R2. Exactly one defensible answer.** For every distractor, write the rationale that kills it by pointing at the
passage. If you cannot point at text that kills it, it is a second answer: rewrite it. A rationale must read the
passage correctly (check what every "it", "this" and "they" you quote refers to).

**R3. Main idea: build the shape your plan gives.** Each main-idea item has a `breadth` and a `key_form`:
- `breadth: key-broadest` — the key is the widest of the five options; each distractor is narrower or equally wide
  but wrong (one paragraph's detail, a misreading, a minor point treated as the main one).
- `breadth: distractor-broader` — one distractor is wider than the key, and it must be **wrong, not just too
  general**: it claims something the passage contradicts, or a subject the passage does not cover. A wider option
  that fairly generalises the passage is a second answer. The key covers the whole passage at its own level.
- `breadth: all-level` — three or more options are whole-passage summaries at the same width, and all but the key
  get the passage's central change, result or claim wrong.
- `key_form: two-part` — the key is a two-part summary ("how X happened and what it cost"); `two_part_distractors`
  says how many distractors are two-part too. `one-part` — the key is not two-part.
- Tag the item: `"broadest": "<text of the widest option>"` and `"two_part": [<texts of every two-part option>]`.
- Distractors stay on topic: a real part of the passage, central but too narrow, or a central misreading.

**R4. Attitude: intensities as your plan draws them.** Five words from five different DIR directions (check.mjs),
chosen so the neighbours are plausible for THIS passage. Your plan gives `key_intensity` (`strong` or `moderate`)
and `strong_distractors` (how many of the four distractors are strong words); check.mjs classifies every DIR word as
strong or moderate (its STRONG list) and enforces the counts. A strong key needs a passage that earns it (two
separate lines in `why` and `why2`). Within your batch no attitude word is used twice; attitude keys point in
different directions. You may ask about a character's attitude, not only the author's. Stems with an opening
participle must give it the right subject ("Looking back as an adult, the narrator regards...", never "Looking back
as an adult, the narrator's attitude...").

**R5. Vocabulary in context: distractor types as your plan draws them.** The tested word or phrase appears in the
passage; quote it in the stem with its paragraph or stanza. Your plan gives each of the four distractors a type:
- `sense` — another real sense of the word that clearly does not fit this sentence;
- `context` — a meaning that fits the sentence's grammar and its subject (it would make sense in a similar sentence
  on this topic), but which the passage rules out. You must be able to quote the text that rules it out; if you
  cannot, it is a second answer.
Tag the item `"dtype": {"<distractor text>": "sense" | "context", ...}` for all four distractors. No option carries a
usage gloss ("as a pharmacist does", "in slang", "as a meal"). Keep options short (one to five words) and similar in
register; the key is never the only everyday or the only figurative option.

**R6. Purpose: abstract or concrete as your plan draws it.** A purpose item asks what a sentence, detail or paragraph
mainly does. Your plan gives `key_abstract` (true: the key names a thematic or rhetorical function, such as "suggest
a life no one discussed"; false: the key names a concrete function, such as "explain why the wagon was late") and
`abstract_distractors` (how many distractors are abstract). Tag `"abstract": [<texts of every abstract option>]`.
Name whose purpose (the author's or a character's) in the stem.

**R7. Inference and purpose keys never restate one sentence.** If the answer is stated nearly verbatim, it is a
detail item. An inference needs two pieces of the passage put together.

**R8. Key length as drawn.** Every item has `key_length` in your plan: `longest` (key is strictly the longest
option), `shortest` (strictly the shortest), or `middle` (neither). check.mjs enforces it. Length ratio within an item
<= 1.5. Adjust lengths by changing distractors or adding real content, never by making the key vague.

**R9. Options in one frame.** Within an item all five options have the same grammatical shape and talk about the same
kind of thing. No option is the only one with a hedge (may, might, some, partly, probably), an absolute (all, always,
only, never, completely), a contrast word (but, although, while), a semicolon or dash, or a number; if the key has
such a feature, give it to a distractor too.

**R10. No item answers another, and no pattern across your items.** No option of one item states or rules out the
answer to another item on the same passage. No two keys share a four-word run. Before you hand in, lay all 36 items
side by side and ask: if a student had seen my other items, could a pattern pick this key (the most positive? the
one with words copied from the passage? the one that starts like the stem?). If any property is true of nearly all
keys or of none, change items until it is mixed. Vary stem wording (check.mjs caps any four-word stem opening at 3).

**R11. Clean language.** Explanations and rationales are complete grammatical sentences. A quotation inside them is
grammatically integrated or set off with a colon; never splice a quote into a clause so the sentence stops parsing.
Explanations quote their choice in double quotes, any other quotation is verbatim passage text (the quote check
enforces this), and they never name a letter ("choice B"). Location references ("in the third paragraph", "the
second stanza") point to the block that really holds the quoted words; count blank-line-separated blocks.

## 5. When done
Reply with: the six titles and subjects, the check summary lines (problems, key length ranks, attitude key
directions, difficulty), the quote-check line, the locrefs line, and any item you are least sure is uniquely
answerable or passes R1, with why. Do not claim zero problems unless you ran the commands and saw it.
