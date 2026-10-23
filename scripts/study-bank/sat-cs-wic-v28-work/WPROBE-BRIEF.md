# World probe (sat-cs-wic-v28, steering; one render per reader, two phases)

You are an expert Digital SAT Reading & Writing item reviewer. Each item is a Words in
Context question with its passage and four options. Judge each item by reading it; no
script or fixed rule. You work in two phases, like the graders who will judge the batch.

## Phase 1 (cold, no key): write it to disk BEFORE anything else
The key is NOT given. For EVERY item id give the same judgements a with-source grader
gives, in the grader's own words:
- `pick`: the letter you believe correct
- `exclusive`: true if exactly one option is defensible
- `second_defensible`: null or the letter of a second defensible option
- `n_struck`: how many of the three wrong options can be struck WITHOUT the
  passage's logic (from the blank's local grammar/collocation, an opposite pair,
  or a quick surface reading) - 0..3
- `struck`: the letters of exactly those `n_struck` options (an empty array when
  `n_struck` is 0). Never your own `pick`.
- `distractor_quality`: weak | plausible | strong
- `key_from_one_sentence`: true if one sentence alone decides the answer
- `resolving_word_after_blank`: null, or the word within four words after the
  blank that alone settles the item (e.g. a preposition only one option takes)
- `difficulty`: easy | medium | hard against REAL Digital SAT module-2 HARD-route
  Words in Context questions (hard = a strong student must combine two or more
  sentences and reject near-misses that fit most of the passage)
- `above_ceiling`: array of option words a strong 11th-grader would not know
  unglossed from a quality newspaper or textbook (empty if none)
- `antonym_pair`: null, or [word, word] if two options are opposites/near-opposites
- `explicit_kills`: how many of the three wrong options are each contradicted by
  one directly planted phrase (0-3)
- `literal_fit`: null, or the letter of a WRONG option that literally describes
  something the passage reports (for example, the passage describes a pause and a
  wrong option is "interlude"), even if the key is the better reading
- `presupposes_absent`: null, or the exact phrase of the passage that takes for
  granted something the passage never establishes (for example, "the surviving
  drafts" when no drafts are mentioned anywhere)
- `note`: one or two sentences. **If you rate an item easy, give `n_struck` of 2 or
  more, or rate `distractor_quality` weak or plausible, the note must say what gave
  it away**: the sentence or phrase that hands over the answer, or why each struck or
  weak option fails on a surface read (off the passage's topic, wrong collocation
  with the blank's sentence, one end of an opposite pair, nothing in the passage is
  about it). The author receives this note verbatim and must rewrite that world;
  "too easy" alone is not usable.

Then one question about the whole render, answered cold:
- `_batch.tells`: is there a pattern ACROSS items that predicts the key, or the same
  template used repeatedly? One string per pattern, concrete, naming the items it
  covers by their render ids (P01, P02, ...). An empty array if you find none.

Write ONLY this JSON object to the phase-1 output path you are given:
{"P01": {"pick":"C","exclusive":true,"second_defensible":null,"n_struck":1,"struck":["A"],"distractor_quality":"plausible","key_from_one_sentence":false,"resolving_word_after_blank":null,"difficulty":"hard","above_ceiling":[],"antonym_pair":null,"explicit_kills":0,"literal_fit":null,"presupposes_absent":null,"note":"..."}, ..., "_batch": {"tells": []}}
Every id must be present. Then STOP and report that phase 1 is written. Do not look
for or open any key, phase-2 or explanation file.

## Phase 2 (only when you are sent the phase-2 file path)
The phase-2 file gives, for each id of YOUR render, the keyed letter and the
explanation the author wrote. For EVERY id write:
- `key_ok`: true if the keyed answer is correct and the best answer
- `path_coherent`: true if the explanation's reasoning is correct and supports the
  key. Read each rejection of a wrong word on its own: false if any rejection rests
  on a thin or incidental detail while the decisive fact goes unused, reads the
  wrong word in only one narrow sense when its ordinary or figurative sense also fits
  (for example, rejecting "artery" because the channel floats no barge, when
  "artery" also means a supply line), or cites a fact that actually supports the
  word it claims to rule out
- `note2`: one sentence; **required when `key_ok` or `path_coherent` is false**:
  name the wrong word and what the rejection should rest on

Write ONLY {"P01": {"key_ok":true,"path_coherent":true,"note2":""}, ...} to the
phase-2 output path. Do NOT edit the phase-1 file: its sha256 was recorded before
the phase-2 file was released, and an edited phase-1 file is refused. Then stop.
