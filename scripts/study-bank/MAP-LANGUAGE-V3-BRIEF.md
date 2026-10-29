# MAP Language v3 — author brief (Grammar and Usage + Writing, grades 5-8, rewrite of the held v2 cohorts)

Written 2026-10-29, before any v3 item. Method id `map-lu-v3-insession-rewrite+cfg-v2`. Author: one Claude session,
in separated sub-batches (one file per grade for Grammar, one file per format group for Writing). No GPT, no web, no
published test items, nothing from any file with "herald" in its name or from NWEA material.

## Why v3 exists

The agent review (`AGENT-REVIEW-SSAT-MAP.prereg.md`, three graders per packet on COFOUNDER-BRIEF-v2) held two
cohorts on patterns that two graders named on three or more shared items:

- `map-language-v2-grammar` (88): `one_template` and `key_form`
- `map-language-v2-writing` (88): `one_template`

These are re-authored from nothing, not repaired. A repair made in response to the round that caught it is fitting
to the instrument (CLAUDE.md). No v2 sentence, paragraph or key is reused. `map-language-v2-mechanics` was not held
and is untouched.

**Count.** MAP Language draws 13 items per area per form (`MAP_AREA_QUOTAS`), so 5 forms need 65 per area.
`bank-state.mjs counts` on 2026-10-29: Grammar 88 staged (all held), Writing 88 staged (all held), Mechanics 77
staged. v3 writes **78 Grammar and Usage + 78 Writing** (65 + 20% margin) — about 19-20 per grade per area.

## The named tells, each banned (from the graders' batch_patterns)

### Grammar and Usage (v2)

| tell the graders named | ban in v3 |
|---|---|
| **2x2 crossed grid**: every "Which sentence is written correctly?" item was one sentence in four variants (neither / first / second / both errors); the key was always the both-fixed cell, findable by majority vote at each site without knowing the rule | **No grid format at all.** No item whose four options are one sentence with sites toggled. |
| **Redundant-word errors**: the error was an inserted extra word, so "drop the extra word" found the key and the key was the shortest option | **No error may consist of an added word.** When options differ in length, a wrong option must be the shortest at least as often as the key. |
| **Odd-category connector key**: "so" among conjunctive adverbs, "Although" among prepositions — the key was the only member of its grammatical class | **Every connector option set is one grammatical class** (four subordinators, or four coordinators, or four conjunctive adverbs, or four prepositions). The class may differ across items, never within one. |
| **Near-duplicate templates**: several "Despite / Even though / Although" items keyed "Despite" | **No two items share a stem frame plus an option set.** Each concessive or contrast relation is tested at most twice in the area, never with the same option set, never with the same key word. |

### Writing (v2)

| tell the graders named | ban in v3 |
|---|---|
| **Register items**: the key was the only option without slang, an intensifier or "!" | **No slang, no "!", no intensifier (super, totally, really, so, very) in ANY option of a style item.** All four options are standard written English; they differ in fit to the stated audience and purpose (which reason, which detail, how precise), not in casualness. |
| **Transition pool**: distractors Instead / Later / Similarly / In the same way recurred and were never keyed; keys were always cause-effect | **The key relation varies** across items: contrast, addition, example, time order, concession, result, clarification — no relation keys more than 3 of the 14 transition items. **No transition word appears as a distractor in more than 2 items**, and every word used as a distractor somewhere is keyed in at least one other item where possible. |
| **Remove-sentence key**: always an off-topic history or trivia aside, often the last sentence | **The sentence to remove uses the paragraph's own topic vocabulary** and drifts from the paragraph's POINT (a different claim about the same subject), never a date, origin story or "fun fact" aside. **It is the final sentence in at most 2 of 10 items.** At least half the paragraphs contain a supporting sentence that LOOKS like an aside (a number, a name, a past event) and does support the point. |
| **Combine / concision distractors**: all fragments, splices, danglers or redundant, so the key was the only grammatical option | **All four options are grammatical, complete sentences.** Wrong options fail on meaning: the wrong relation (because for although), a changed or dropped fact, a shifted emphasis, a modifier attached to the wrong noun only where that changes the meaning not the grammar. |
| **Key longest** in 17 of 44 | **Key length rank dealt to chance** across each area's text-option items: the key is uniquely longest in no more than 30%, uniquely shortest in no more than 30%; the checker prints the distribution and refuses outside it. |

## Positive instructions (these are the method)

1. **Vary item shapes.** No single stem template answers a whole area or strand. Grammar uses at least five
   shapes (below); no shape exceeds 30% of the area. Writing uses at least eight formats; none exceeds 20%.
2. **No template answers a strand.** Within each strand, at least three shapes appear, and the key's FORM differs by
   shape: in a find-the-error item the key is the faulty sentence; in a choose-the-correct item the key is the sound
   sentence; in a blank item the key is one word; in an identify item the key is a grammatical label. A solver who
   learns "pick the clean one" or "pick the shortest" fails the other shapes.
3. **Rule-plausible distractors.** Each wrong option is what a student who holds a SPECIFIC wrong rule would choose
   (named in `why_wrong`). A wrong option that is wrong by any general heuristic (odd class, extra word, typo, slang,
   obviously absurd meaning) is banned.
4. **Key form not predictable from the stem.** The stem never fixes the key's tense, class, length or relation by
   itself; the deciding fact is elsewhere in the sentence or paragraph (a time clause, an antecedent two clauses back,
   the sentence before the blank).
5. **No stem names the answer's feature.** Not "Which sentence uses the past perfect correctly?" (names the tense),
   not "Which transition shows contrast?", not "Which word is a gerund?" when only one option is an -ing word. Ask
   "Which word or phrase correctly completes the sentence?", "Which sentence contains an error?", "What is the
   function of the bracketed words?" and let the student find the feature.
6. **The options must not differ along the axis the stem names** unless the item is ABOUT that axis and all four
   values are plausible (CLAUDE.md, "the one predictor that has held"). For each item, cover the sentence or
   paragraph and ask: how many options remain legal? If one, rewrite.

## Formats

All items: four options, exactly one key, `why_wrong` (three strings, one per wrong option in the order they appear
in `choices`, each naming the student's mistake), `explanation` (why the key is right and each other option wrong;
never names a letter), `ccss` of the item's own grade. Plain US English; common first names (Maya, Leo, Sam, Ana,
Ben, Mia, Omar, Lily, Jack, Nora, Priya, Diego, Hana, Theo, Ivy, Max, Zoe, Eli, Ruby, Owen); invented titles.
Sentences up to about 24 words. All difficulty `medium` (MAP Language draws by area, not band).

### Grammar and Usage (78; `map_area` "Language: Understand, Edit for Grammar, Usage")

Strands: `"Parts of Speech"` and `"Phrases, Clauses, Agreement, Sentences"`, about half each.

- **blank** — "Which word or phrase correctly completes the sentence?" One `____`. Four members of one closed set
  (forms of one verb; pronoun cases; one connector class). Decided by context away from the blank.
- **revise** — a sentence with a part in square brackets. "Which revision of the bracketed part is correct?" or
  "Which choice correctly replaces the bracketed part?" Four alternatives; the original is wrong in some items and
  among the options — once as the key — in others. Alternatives differ by substitution, never by an added word.
- **find-error** — "Which sentence contains an error?" (or "...is NOT written correctly?"). Four sentences on
  DIFFERENT content; three are correct and each shows a construction that looks risky (a long subject, an inverted
  clause, a correct "whom"-free object pronoun in a compound, a correct past perfect); one has an error of the tested
  rule. The key is the faulty sentence.
- **choose-correct** — "Which sentence is written correctly?" Four sentences on DIFFERENT content; three each have a
  DIFFERENT error under the same standard; one is correct. Never one sentence in variants.
- **identify** — "What is the function of the bracketed phrase?", "Which word in the sentence is a verbal?" (only
  when all four options are words that could be verbals), "Which best describes the structure of the sentence?",
  "What is the mood of the verb in bold?" Options are labels or words from the sentence.
- **combine-grammar** (L.5.3a, L.6.3a, L.7.1b) — "Which sentence correctly combines the two sentences into one
  [complex / compound-complex] sentence?" may NOT be used (names the feature); instead "Which choice best combines
  the sentences without changing their meaning?" with all options grammatical, wrong ones changing the relation.

Standards by grade (from the v2 brief, unchanged): g5 L.5.1a-e, L.5.3a; g6 L.6.1a-d, L.6.3a; g7 L.7.1a-c; g8
L.8.1a-d. Never at grades 5-8: basic subject-verb agreement, its/it's, there/their, a/an, irregular pasts,
comparatives, double negatives; nothing disputable (who/whom, singular they, "everyone ... their", than I/me, split
infinitives, final prepositions, "data is", "I wish I was", "each of ... their", neither/nor with mixed number).

### Writing (78; `map_area` "Writing: Write, Revise Texts for Purpose and Audience")

Strands: `"Plan, Organize; Create Cohesion, Use Transitions"` (transition, placement, irrelevant, intro-conclusion)
and `"Establish and Maintain Style; Use Precise Language"` (precise-word, combine, audience-purpose,
concise-revision). Paragraphs are student drafts, 4-7 numbered sentences "(1) ... (2) ...", plausible and concrete.

- **transition** (14) — blank at the start of one sentence. Four connectors of the same grammatical type (all
  sentence adverbs or all prepositional phrases), different relations. Key relation varies (see ban table).
- **placement** (10) — a new sentence in the prompt; options "Before sentence 1", "After sentence 2" etc. The
  deciding cue varies (pronoun, time word, general-to-specific, cause before effect). Key positions spread.
- **irrelevant** (10) — "Which sentence should be removed because it does not support the main idea?" Options
  "Sentence N". The key sentence is on-topic in vocabulary and off-point in claim; not final in more than 2 items.
- **intro-conclusion** (10) — introduce / conclude / support a claim. All four options same subject, register and
  rough length; wrong ones fail only against the paragraph (wrong aspect, one detail, contradicts a sentence).
- **precise-word** (10) — a bracketed vague word; four real, grammatical, close-meaning replacements; the situation
  decides. The key is not always the rarest or most "advanced" word.
- **combine** (10) — two or three sentences; all four options grammatical; wrong ones change relation, drop a fact,
  or alter emphasis.
- **audience-purpose** (7) — "Which revision of sentence N best suits the writer's purpose of [persuading the
  principal / explaining to younger students]?" All four formal; they differ in which reason or detail they offer
  and whether it fits the stated reader. Replaces v2's style-audience format.
- **concise-revision** (7) — "Which revision is clearest and least wordy without changing the meaning?" All four
  grammatical; at least three items have a wrong option SHORTER than the key (it drops a needed idea).

## Exclusions

No sentence, key, or (rule, context) pair from `map-v2-work/language/EXCLUSIONS-map-language.txt` or from the 176
held v2 Grammar/Writing items. The checker compares keys and stems against both.

## Checks before staging (`map-v2-work/language-v3/lu3-check.mjs`)

Per item: schema, labels, grade-own CCSS, 4 distinct options, key among them, three `why_wrong`, explanation names
no letter, no format "grid", no option set repeated, macOS spellchecker on passages and keys, exclusion list.
Per area: shape and format caps, key-length-rank distribution (uniquely longest <= 30%, uniquely shortest <= 30%),
positional key spread (no position keys > 40% of a positional format; irrelevant final-sentence key <= 2),
transition key-relation cap (<= 3 each) and distractor reuse (<= 2 items per word), connector-class uniformity
declared per item (`option_class`), no slang/"!"/intensifier in audience-purpose options. The checker exits
non-zero on any failure and prints its denominators.

## Pasted rule set

The binding co-founder rules are `AUTHORING-RULES-FROM-NOTES.md` (linked, not pasted; rules 1, 4, 5, 7, 12, 13 apply
directly to Language items):

<!-- AUTHORING-RULES-FROM-NOTES v1 -->
