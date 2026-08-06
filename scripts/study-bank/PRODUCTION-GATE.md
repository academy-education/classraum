# A gate for the 541 items the blind attack cannot reach

Run: `node scripts/study-bank/check-production-items.mjs`
Self-test: `node scripts/study-bank/check-production-items.mjs --selftest`
READ ONLY — only SELECTs against `study_item_bank`. 2026-08-06.

Closes register item **A4**.

---

## 1. First, a correction to the premise

The register said these six cohorts "have never been checked by
anything". Two of them have been:

- `scripts/verify-listen-repeat.ts --bank` rule-checks all 97
  Listen-and-Repeat sentences against the spec band. It passes today:
  **97 items, 0 violations**, 8-12 words, easy 42 / medium 40 / hard 15.
- `scripts/verify-interview-sets.ts` simulates 12 draws and checks each
  delivers one coherent 4-question interview. **PASS.**

What had no item-level check of any kind is **arrange_words,
fill_in_blanks, writing_email and writing_discussion — 396 items.**
That is where the findings are.

## 2. What was built, and why it is not another structural proxy

CLAUDE.md's standing warning is that structural proxies for semantic
problems do not work: five have been built in this directory and each
caught the tell it was built for while missing the next one.

So no detector here guesses at quality. **Every one replays a real code
path** and reports where an item and the code that serves it disagree:

| detector | replays | a finding means |
|---|---|---|
| `bas/key-not-assemblable` | `gradeAnswer()` in submit/route.ts + the `chips.join(' \| ')` in TestSession | no tap order can be graded correct |
| `bas/duplicate-chip` | the chip pool `choices.filter(c => !placed.includes(c))` | placing one copy removes both; the item cannot be completed |
| `ctw/placeholder-mismatch`, `ctw/blank-count` | the `[N]`-split renderer + `{ total: blanks.length }` | an input with no key, or a key with no input |
| `ctw/broken-word` | `BlankLetterInput`'s `expectedLen` boxes | the passage plus the key spell a misspelling |
| `lr/script-key-mismatch` | `repeatSegment()` in prewarm-toefl-audio.mjs vs `gradeAnswer()` | the student hears one sentence, is graded on another |
| `ad/*` | `parseDiscussionSpeakers()` verbatim | the discussion renders as undivided prose, or classmates merge |
| `em/no-task-list` | the ETS-format branch of `WritingScenario()` | the student is told nothing to cover, while `task_fulfillment` grades coverage |
| `iv/*` | the `passageGroupId` grouping in assemble.ts | a set that cannot be played as one interview |
| `x/*` | nothing — cross-item counting | duplicates and shared openings |

A finding is therefore a fact about the product, not an opinion about
the writing.

## 3. Findings — 541 live items, 6 cohorts

```
FATAL bas/key-not-assemblable : 1
FATAL ctw/broken-word         : 11   (across 8 items)
HIGH  em/no-task-list         : 10
WARN  x/duplicate-item        : 1    (pair)
WARN  x/template-collision    : 12   (groups, 28 of 119 items)
```

Draw sufficiency against the blueprint in `assemble.ts` — every pool and
every difficulty rung is large enough. No shortfall.

### FATAL — one Build a Sentence item cannot be answered correctly

`ca3d0a1c-0680-4ddf-8531-4a2799d53c46`

    chips  : ["quietly","the library","students","were","studying","in"]
    key    : "Students | were | studying | quietly | in | the library."

The key's last segment carries a full stop the chip does not. Grading is
`norm(student) === norm(correct_answer)` and `norm` only folds case and
whitespace, so **no ordering of those six chips can equal that string**.
A student who assembles the sentence perfectly is marked wrong, and
nothing in the app would ever say so. (The UI does append a period, but
as a static visible token — it never enters the answer string.)

### FATAL — 8 Complete-the-Words paragraphs show a misspelled word

The renderer prints `prefix` + exactly `answer.length` empty boxes +
`suffix`. Where the key duplicates letters across that join, the student
is being asked to spell a word that is not a word:

| item | shown | key spells | should be |
|---|---|---|---|
| `1866b0f1` | `futu___` | futuure | future |
| `1a8f1f4c` | `diox____` | dioxxide | dioxide |
| `31e0a066` | `immedi____` | immediiate | immediate |
| `3b2a5722` | `cyc___` | cyccle | cycle |
| `442088c8` | `impa____` | impaacts | impacts |
| `7cf35d9c` | `act____` | acttion | action |
| `d9cf54b8` | `framew____` | framewwork | framework |
| `a1d20b7c` | `mome___s`, `composi_____s`, `traditi____al`, `genera_____s` | momentss, compositionss, traditionalal, generationss | moments, compositions, traditional, generations |

`a1d20b7c` is broken in four of its ten blanks and should be retired
rather than patched. The rest are single-blank edits.

Grading still accepts the key, so these are not ungradeable — they are
items that show the student a misspelling and give them the wrong number
of letter boxes.

### HIGH — 10 of 92 Email items state no task

82 of the 92 carry the ETS Jan-2026 shape: a situation, an
`"In your email …:"` line, and exactly 3 bullets. Ten do not. Those fall
through to the legacy renderer **and, more seriously, never tell the
student what to cover** — while `responseRubrics.toefl_writing_email`
scores `task_fulfillment` ("Task coverage") and the grader prompt says
the prompt "gives a scenario … plus the points to address". The grader
is being asked to score coverage of points that were never stated.

    019c50a6  09e8e9e8  13e0c10d  7100d22a  802ff650
    a0f721e5  a5a0948f  d6ef877e  f19757f8  fabf733a

### WARN — Build a Sentence has a template tell

One exact duplicate pair (`2fabd2bb` / `35511dbc` — same key, same chips,
different authored order) and **28 of 119 items share their opening three
chips with another item**:

    x4  the book | that was recommended | by my professor
    x3  the solution | proposed by the engineer | was implemented
    x3  the results | were analyzed | by the research team
    x2  the novel | which was published last year | was praised
    x2  the student | who had never traveled abroad before | was amazed
    x2  the prestigious prize | was awarded | to the scientist
    x2  the data | collected during the survey | were analyzed
    x2  the data | collected during the experiment | were analyzed
    x2  the proposal | that included several amendments | was approved
    x2  the city | where i grew up | has changed
    x2  the conference | attended by experts | from around the world
    x2  having completed | her degree | maria

This is CLAUDE.md's "a batch built to one brief develops a cross-item
tell", in its countable form: a Writing test draws 10 of these 119, and
a student who has met one of the four `The book | that was recommended |
by my professor` items gets the first three chips of the next three for
free. Not fatal, and not repaired here.

### Clean

- **Academic Discussion, 92/92.** The speaker parser resolves a
  professor and ≥2 named classmates on every passage. Its own docstring
  says this failure is silent, so it is worth having measured.
- **Listen and Repeat, 97/97** on script-vs-key. No prefixed passages,
  no near-duplicates, no TTS-hostile characters.
- **Interview, 12 sets of 4**, one premise per set, no repeated question.
- **Complete the Words**, placeholder/blank integrity: 93/93, all with
  exactly 10 blanks.
- No duplicate chips, no near-duplicate scenarios in any rubric cohort.

## 4. Attacking the check

`--selftest` runs 25 fixtures through the same `scanAll()` the live sweep
uses, and asserts each detector fires on a real defect **and stays quiet
on its sound twin** — a period-free key, a legitimate doubled join, a
discussion with two classmates, an email with three bullets, two
unrelated sentences. No database, no dictionary (the lexicon is
injected), so a missing `/usr/share/dict` cannot turn a red into a green.

Two of those fixtures are regressions from this build:

- **The first live run had 2 false positives.** It flagged `plan____` +
  `ning` = "planning" and proposed "planing". English doubles a final
  consonant before `-ing`, so that is grammar, not a defect. Fixed by
  exempting a single-consonant duplication before
  `-ing/-ed/-er/-est/-en/-y/-able` — and deliberately NOT before `-ion`,
  which is why `act` + `tion` still fires. Both cases are pinned.
- **The morphology nearly hid the suffix defect.** `momentss` was silent
  because stripping the final `s` yields "moments". The word-known test
  now uses the RAW headword set, and only the repair candidate is allowed
  the morphological expansion.

The `ctw/broken-word` detector's precision rests on requiring TWO
conditions: the reconstruction is unknown to the dictionary **and** it
becomes a known word when a duplicated join is deleted. The first
condition alone is worthless — 52 of 930 reconstructions are unknown to
`/usr/share/dict/web2`, because it is a 1913 headword list with no
"exoplanets", "biodiversity" or "microeconomics". The conjunction is what
takes 52 down to 11 true positives with 0 false ones.

## 5. What this does NOT cover

Stated plainly, because a green run from this script is weak evidence.

- **Build a Sentence: whether a second ordering is also grammatical.**
  That is *the* defining defect of the task, and it is what the brief
  asked for. It is not decidable — deciding it needs a parser with a
  grammaticality judgement, or a human. All this script proves is that
  the ONE ordering the item declares can be built and graded. 118 of 119
  items pass that bar and none of them has been checked for a second
  answer.
- **Complete the Words: whether a blank has a second defensible
  completion.** Attempted, measured, and rejected as a gate. Restricting
  candidates to same-prefix, same-length words that actually occur in
  this bank's own 16k-word corpus still flags **387 of 930 blanks
  (42%)** — `detec[5]` → detection/detective/detectors,
  `under[4]` → understanding/undergraduate. That is a base rate, not a
  defect list: context resolves nearly all of them and no rule can tell
  which. Publishing it as a gate would have been the sixth structural
  proxy. The number is recorded so nobody rebuilds it.
- **Email / Academic Discussion / Interview: whether the prompt can be
  answered well, and whether it invites the same response from every
  candidate.** This is the real risk in a 92-item rubric-graded cohort
  and it is semantic. What is checked is the countable proxy — exact and
  near-duplicate scenarios (0 pairs above 50% 4-gram overlap) and, for
  Email, whether the task is stated at all. Uniformity of *shape* is not
  measured beyond that. Note the contrast with Build a Sentence, where
  the same kind of counting DID find 28 items on 12 templates: the
  writing cohorts are lexically varied, which is not the same as being
  conceptually varied.
- **Listen and Repeat: register, clause depth, top-2000 vocabulary.**
  Owned by `verify-listen-repeat.ts`, not duplicated here. Pronunciation
  difficulty — the actual construct — is unmeasured anywhere.
- **Difficulty labels.** Taken on trust in all six cohorts.
- **Any student data.** There is none: `study_attempts` for these
  cohorts is internal testing (see memory note), so nothing here is
  validated against a real response.

## 6. Suggested order of repair

1. `ca3d0a1c` — delete the full stop from the key. One character; the
   item is currently unpassable.
2. The 7 single-blank `ctw/broken-word` fixes; retire `a1d20b7c`.
3. The 10 Email items — add the `"In your email …:"` line and three
   bullets, or archive them. Until then `task_fulfillment` on those
   items is scoring against nothing.
4. Build a Sentence duplicates and templates — a re-authoring decision,
   not a patch.

None of it was done here: this script never writes.
