# SSAT Reading, counterfactual slots: author brief

You are writing ONE SSAT (Upper Level) reading passage with six five-choice questions, using a
method in which **nobody, including you, knows which answer will be correct.**

## The method

The passage has fixed text with six **slots** in it, one per question. Each slot is a sentence or
short span. For each question you write:

- **one fixed set of five choices** (c0..c4), and
- **five versions of that question's slot** (v0..v4). In version k, choice k is the only correct
  answer, and the other four choices are clearly ruled out by that version's text.

After every passage is frozen, a seeded random draw picks one version per slot, **independently
per question**. The six drawn versions are spliced into the fixed text, and that becomes the
passage students read. You never learn the draw. So:

- **No version is "the real one."** Every version must be equally natural, equally complete and
  equally well written. A version you write carelessly has a 1-in-5 chance of being what students
  see, and an item whose drawn version is weak is thrown away.
- **No choice is "the interesting one."** All five choices are the same KIND of thing (five
  causes, five people, five senses of a word, five feelings of similar strength). They share one
  grammatical frame, have similar length (the longest at most 1.6x the shortest) and the same
  specificity, and each makes one claim. Avoid compound choices ("X, but also Y"), hedged or
  nuanced choices, and stance-about-a-claim choices. Earlier batches failed because the correct
  answer was visibly a different kind of answer from the wrong ones. Here every choice must be a
  full, genuine answer in its own version.
- **Fixed text must be compatible with every version of every slot.** Any combination of the
  six slots (5^6 of them) must read as one coherent passage. Keep slots about different matters,
  in different sentences (ideally different paragraphs), and never let one slot's text mention or
  presuppose another slot's content.
- **Fixed text must not tilt.** Nothing outside a slot may make one choice likelier than another.
  Fixed text must NOT list the five choices as candidates ("Five explanations were offered: …").
  That device makes passages read as constructed, and it is banned here.

## Ruling the others out naturally (this is the hard part)

Each version's text must make its own choice TRUE and make each of the four others FALSE. Not
just unmentioned: absence of support is not refutation. Do this by **incompatibility, not by a
list of denials.** Write the questions so the choices are mutually exclusive by nature, using
stems with "chiefly", "first", or a single object, and have the version positively assert one
thing that leaves no room for the others.

- Good: Q "According to the passage, the mill's old stones ended up" … v3: "In 1931 the stones
  were laid as the floor of the parish church porch, where they lie today." That excludes "sold
  to a museum", "broken up for road gravel" and so on, because the stones are in one place, now.
- Bad: "The stones did not go to a museum, nor to the road crew, nor …"

**Limit: at most ONE negation word per version** (not, no, never, nothing, nor, none, neither,
n't, nobody, nowhere). The checker refuses more.

For every version you must supply:
- `why`: a span copied verbatim from that version's text that makes choice k correct;
- `kills`: for each of the other four choices, a `quote` (verbatim from that version's text; the
  same quote may serve several kills) and a one-line `reason` saying why that choice is now FALSE.

## The six questions (one each), and how each slot works

Use these stem shapes (live-bank conventions); adapt the nouns:

1. **main-idea**: "The passage is chiefly concerned with". The slot is the passage's pivotal span
   (it may be a paragraph-length span of up to ~70 words). The choices name the chief concern and
   differ only on what that slot decides, e.g. five things a family did with an inherited
   workshop. The fixed text sets up the subject without deciding it.
2. **detail**: "According to the passage, …". The version states or plainly describes the fact.
3. **inference**: "It can most reasonably be inferred that …" or "The passage suggests that …".
   The version IMPLIES its answer without stating it in the choice's words.
4. **vocabulary-in-context**: 'As it is used in the [Nth] paragraph, the word "X" most nearly
   means'. The slot is the sentence containing X, and X appears in the same form in all five
   versions. Each version uses X in a different sense, and the five choices are five senses of X
   in the same part of speech, written as short glosses ("to manage", "to flow", "to extend" …).
   The context, not a definition, decides it.
5. **attitude**: "The narrator's/author's attitude toward … is best described as". Put the slot
   LATE in the passage (final paragraph). Use five attitudes of similar intensity and the same kind
   (for example, all toward one object). Each version conveys its attitude through what is said or
   done, and must NOT contain the choice's own key word.
6. **purpose**: "The mention of … chiefly serves to" or "The [Nth] paragraph chiefly serves to".
   The choices are concrete functions tied to passage content (e.g. "to explain why the ferry
   stopped running"), not abstract rhetorical labels. The slot supplies the context that settles
   which function the mention performs.

Rules for stems: a stem may not contain a word that appears in only one choice of a DIFFERENT
question (the checker refuses this). Stems are identical across versions, so a stem must make
sense with every version.

Label each question `difficulty`: easy, medium or hard. Aim for mostly medium, with one or two
hard and at most one easy.

## Passage shape

- Assembled length 300–360 words (the checker refuses outside 270–380 for the shortest and longest
  combinations). Keep the five versions of a slot within a 1.35 word-count ratio.
- 4–5 paragraphs. Varied, real-sounding prose at the level of a published SSAT Upper Level passage.
  Invented names and places are fine. Avoid famous real facts a reader could answer from world
  knowledge: every version must be equally possible in the world.
- Paragraphs are separated by "\n\n" inside the segment strings.

## File format (`*.cf.json`)

```json
{
  "passage_id": "CF1-P01",
  "genre": "narrative fiction",
  "segments": [
    "First fixed text … ",
    {"slot": "CF1-P01-2"},
    " more fixed text …\n\nNext paragraph … ",
    {"slot": "CF1-P01-1"},
    " …"
  ],
  "questions": [
    {
      "qid": "CF1-P01-1", "kind": "main-idea", "difficulty": "medium",
      "prompt": "The passage is chiefly concerned with",
      "choices": ["c0", "c1", "c2", "c3", "c4"],
      "versions": [
        { "text": "slot text that makes c0 the answer",
          "why": "verbatim span of this text",
          "kills": {
            "1": {"quote": "verbatim span of this text", "reason": "why c1 is false here"},
            "2": {"quote": "…", "reason": "…"},
            "3": {"quote": "…", "reason": "…"},
            "4": {"quote": "…", "reason": "…"}
          } },
        "… versions 1-4, version k keys choice k, kills keyed by the OTHER choice indexes …"
      ]
    }
  ]
}
```

Mind the spaces at segment and slot boundaries so that splicing produces clean prose. qids are
`<passage_id>-1` … `-6`. The question order in the file is the order students see.

## Self-check (required)

    node scripts/study-bank/ssat-cf.mjs verify <your file>

Fix until it prints `verify OK`. Then reread several random combinations of versions as one
passage. Check that each reads as natural prose and that, in every version, exactly one choice
survives. Do NOT run any other subcommand of that script, and do not open other files in
`scripts/study-bank/` besides this brief and your own file.
