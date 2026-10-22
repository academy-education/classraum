# SSAT Upper Level Reading: author one 36-item batch (6 passages x 6 items)

You are writing questions for Classraum, a test-prep app. Real students preparing for the SSAT will take these
as practice tests. A human reviewer (the co-founder) will sit every item blind before any goes live, and a
whole passage is thrown out if 2 of its 6 items are judged to have more than one defensible answer. Quality
over speed.

Your batch number is N (given in your task). Work ONLY inside `scratchpad/ssat-draftN-work/` under the repo
root `/Users/andylee/Downloads/saas/classraum`. Do not touch the database, git, or any other file. Do not run
`insert.mjs`, `build-rows.mjs`, npm, or jest. No network.

## Read first
1. `scratchpad/ssat-draft4-work/authored/d4.py` — **the exact format and the quality bar.** Copy its helper
   functions (`R`, `I`) and structure. Read all six passages and all 36 items before writing anything.
2. `scratchpad/ssat-reading-existing-passages.txt` — the opening of every live or staged reading passage
   (122). Your topics must not overlap any of them (same subject, same central object, or same situation).
3. `scratchpad/ssat-draft4-work/merge.mjs` — the mechanical checks your file must pass.

## What to produce
`scratchpad/ssat-draftN-work/authored/dN.py`, which writes `authored/dN.json` when run, with passage ids
`DN-P01` … `DN-P06` and qids `DN-P01-1` … `DN-P06-6`. Then iterate until

    cd scratchpad/ssat-draftN-work && python3 authored/dN.py && LIVE_ATT=live-att.json node merge.mjs
    node ../../scripts/study-bank/check-explanation-quotes.mjs merged.json
    cd ../.. && node -e 'import("./scripts/study-bank/check-location-refs.mjs").then(({checkItem})=>{const m=require("./scratchpad/ssat-draftN-work/merged.json");for(const it of m.items){const r=checkItem(it);if(r.status==="mismatch")console.log(it.qid,r)}})'

all report zero problems. (The merge prints "mechanical problems: 0". The quote check prints "not in passage
or options 0". The location check prints nothing.)

## Passages
- Six passages, one per genre, in this order: fiction, poetry, memoir, essay, history, science.
- Use YOUR assigned subject areas (in your task). Choose a specific, fresh subject inside each one.
- Prose 300-600 words (aim 380-450). Poem 220-400 words, stanzas separated by blank lines.
- Grade 8-11 reading level, like a real SSAT Upper Level passage: concrete, literate, with an idea worth asking
  about. Avoid sentimentality and avoid lecturing the reader.
- History: use invented towns and people in a plausible past, as d4 does ("Pell County", "Walter Briggs"). Never
  attach invented events to a real named place or person.
- Science: real science only, stated carefully. Hedge numbers ("roughly", "about"). If you are not certain a
  fact is true, leave it out. A false science passage is worse than a dull one.
- Fiction and memoir: check the story's internal logic line by line — who knows what when, objects that appear
  without explanation, timeline. A reviewer flagged a notebook entry that recorded the wrong person's details.
- **Mechanical constraints (merge enforces):** at most ONE negation word per paragraph or stanza (not, no, never,
  nothing, nor, none, neither, nobody, nowhere, cannot, n't). No attitude word from merge.mjs's DIR table
  anywhere in a passage (e.g. proud, pride, respect, fond, angry, worried, fear, sad, regret, humor, curious,
  playful, skeptical, detached…). Scan for them while writing.

## Items: six per passage, exactly these kinds
main-idea (easy), detail (medium), vocabulary-in-context (medium), inference (hard), purpose (hard),
attitude (medium or hard). Five choices each. `why` must be a verbatim passage substring that supports the key;
attitude items also need `why2`, a second verbatim substring.

**The co-founder's rules (from his notes on earlier batches — these are why d4 exists):**
1. **Main-idea distractors are on-topic.** Each is a real part of the passage but not the whole, central but too
   narrow, or a central misreading. Never an obviously unrelated topic.
2. **Attitude option sets are tailored to each passage.** Five words from five different DIR directions, chosen
   so the neighbours are plausible for THIS passage (e.g. a lure that fits a different character, or a passing
   moment rather than the overall view). Within your batch, no two attitude sets may share more than one word.
   Do not default to the overused set admiring/amused/critical/uneasy/wistful.
3. **Vary attitude keys across the batch.** Not all warm/positive. d4 used curious, warm x3, doubtful, critical.
   You may ask about a character's attitude, not only the author's.
4. **Inference and purpose keys never restate one sentence.** If the answer is stated nearly verbatim, it is a
   detail item. An inference needs two pieces of the passage put together.
5. **Exactly one defensible answer.** For every distractor, write the rationale that kills it by pointing at the
   passage. If you cannot point at text that kills it, it is a second answer — rewrite it. Vocabulary items: the
   four distractors are OTHER real senses of the word that clearly do not fit the context.
6. **No length tell.** Distractors as specific and as long as the key. After merge, "key uniquely longest" must
   be at most 8/36, and key uniquely shortest at most 9/36. Fix by lengthening a distractor, never by trimming
   the key into vagueness. Length ratio within an item <= 1.5 (merge enforces).
7. Explanations and rationales quote their choice in double quotes, and any other quotation in them must be
   verbatim passage text (the quote check enforces this). Never name a letter ("choice B").
8. Location references ("in the third paragraph", "the second stanza") must point to the block that really
   holds the quoted word. Count blank-line-separated blocks.

## When done
Reply with: the six titles and subjects, the merge summary lines (problems, key slots, key uniquely longest,
attitude key directions, difficulty), the quote-check line, and any item you are least sure is uniquely
answerable, with why. Do not claim zero problems unless you ran the commands and saw it.
