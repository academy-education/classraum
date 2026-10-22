# Writing hard SAT "Words in Context" questions: a guide for human authors

You are writing **15 hard Digital SAT Words in Context (WIC) questions** for Classraum. This guide is short on
purpose. Every rule in it comes from something that went wrong, or right, in our own question bank. It is not
general test-writing advice.

**Why we are asking a person.** Our last two machine-written batches (v23 and v24, October 2026) were both rejected
whole, for the same reason. A reader who saw **only the four answer choices, with the passage hidden**, picked the
right answer far more often than chance: 53% and 47% of the time, against 36% and 34% on our live questions. One
earlier batch did pass (v20). Its best items are shown below.

---

## 1. What makes an item "hard"

A hard item is hard because of the **passage's logic**, not because the answer is a fancy word.

- **To find the answer, the student has to combine two or more sentences**: a cause and its effect, two cases
  compared, a limit on a claim, a purpose. If the sentence with the blank decides the answer by itself, the item is
  easy, however hard the vocabulary is.
- **Every wrong answer (distractor) should fit the blank's own sentence** and sound right on a quick read. Each one
  should fail on one step of the passage's reasoning.
- **Exactly one answer is defensible.** Each distractor must be *wrong* in this passage, not just slightly less good.
  A near-synonym of the answer that differs only in degree or scope will be called a second correct answer. In v20,
  "stretch" next to the answer "shift" was dropped for exactly this reason.
- **Do not plant a clause just to kill one distractor.** For example, adding "within seconds" only so that
  "sluggish" is ruled out. Readers notice that the other options are untouched, and the item becomes easy. At most
  one distractor per item may be ruled out by a single explicit phrase.

**Deletion test (do it for every item):** delete every sentence except the one containing the blank. At least
**two** options, the answer among them, should still fit that sentence. If only the answer survives, move the deciding
fact into an earlier sentence.

## 2. The four tells to avoid

These are the four patterns readers used to pick the answer without seeing the passage.

| Tell | What it looks like | One-line example of the mistake |
|---|---|---|
| **Most natural collocation** | The answer is the word that most often goes with the words around the blank, in its usual academic sense. | "the evidence was largely ______": *anecdotal* is the stock phrase, so it wins without the passage. |
| **Rarest / most precise word** | The answer is the one "SAT-sounding" word among plainer ones. | *recondite* / big / plain / clear: the rare one gets picked. |
| **One side of an opposite pair** | Two options are opposites, and the answer is one of them. | *integral* / *optional* / blue / quick: readers ignore the two unpaired words. |
| **Odd one out by tone (polarity)** | Three options are positive (or negative, or neutral) and the answer is the only one that differs. | *praised* / *admired* / *applauded* / *doubted*: the answer is *doubted*. |

To counter these:
- Make a distractor the rarest word most of the time. Sometimes the answer should be the **most common** of the four
  words, used in a precise sense ("holding", "spending", "volume", "requires").
- Never put two opposites in one option set.
- Make sure at least one distractor shares the answer's tone (positive, negative or neutral) and its register
  (everyday, formal and so on).

## 3. The 30-second self-test

**Cover the passage. Look only at the four words.** Can you guess which one is the answer, because it is the stock
phrase, the fanciest word, half of an opposite pair, or the only one with a different tone? If you can, change a
distractor. Then uncover the passage and run the deletion test above.

## 4. Two items that passed (from the v20 batch, graded hard)

**Example A: answer is "decisive"**
> For decades, economists attributed one inland region's slow growth to its distance from the nearest port. Then a
> new rail line halved the cost of shipping goods to the coast, and growth barely changed: firms still could not find
> trained workers, and young people who trained locally soon left for the cities. The economists now grant that
> shipping costs were a genuine burden on the region's firms. Their earlier account, however, had made that burden
> seem ______.
>
> decisive / deliberate / illusory / growing

Why it works: the blank's sentence alone allows several words. Only by combining "halved the cost... growth barely
changed" with "a genuine burden" do you get *decisive*: the old account made it seem like the deciding factor.
*Illusory* fails because the old account treated the burden as real, *growing* because distance is fixed, and
*deliberate* because geography is nobody's choice.

**Example B: answer is "spending"**
> Many QR codes still scan correctly when part of the pattern is torn or covered. The code stores each piece of data
> more than once, spread across the square, so a scanner can rebuild what a damaged section held from the copies
> elsewhere. Designers who print a company logo over the center of a code are thus ______ that duplication, giving
> up some of the code's tolerance for damage in exchange for a branded look.
>
> spending / repeating / wasting / scrambling

Why it works: the answer is an everyday word used in a precise sense (using up a reserve in exchange for something).
*Wasting* is the tempting near-miss, but it fails because the designers get something in return.

A third passed item, on Latin word order, has the answer *unrestricted* against *random*, *unwieldy* and *unusual*.
*Random* is the trap, and it fails because writers chose word orders on purpose. That item is in
`scripts/study-bank/sat-cs-wic-v20.kept.batch.json` (WIC20D-03), along with the rest of the batch.

## 5. Format

- **Passage:** 50 to 110 words, academic register (science, history, social science, the arts). Use invented people or
  just a role ("one ecologist"). American punctuation, double quotes.
- **One blank,** written as `______` (six underscores).
- **Never put "a" or "an" right before the blank.** Write "the" or rephrase, because "an" gives away a vowel. The word
  right after the blank must read correctly with **all four** options. If "to" follows, every option must take "to".
- **Four options:** single words, lowercase, the same part of speech, about equally common. Nothing rarer than what
  a strong 11th-grader reads in a good newspaper (no GRE-only words). At least a few of your 15 answers should be
  nouns or verbs, not all adjectives.
- **Question line** (the same for every item): *Which choice completes the text with the most logical and precise
  word or phrase?*
- **Explanation:** 2 to 4 sentences. Say why the answer fits, and name **each** distractor by its word (not
  "choice B") with the reason it fails.
- **Mix the reasoning types** across your 15: cause and mechanism, comparing two cases, a limit on a claim, a method
  and its purpose, and so on. Use "the old view was overturned" no more than 2 or 3 times.

## 6. Words not to use

`scripts/study-bank/sat-cs-wic-v24.live-words.json` lists the words **already used** in our live questions and in
earlier batches, as answers or as distractors. **Do not reuse any of them,** in any position. Also do not repeat a
word across your own 15 items. If you cannot open the file, ask us for a copy.

## 7. How to send them

Send one Google Doc or spreadsheet with one row per item and these columns:

| # | Passage (with ______) | Option 1 | Option 2 | Option 3 | Option 4 | Answer | Explanation |
|---|---|---|---|---|---|---|---|

The order of the options does not matter, because we shuffle them. If you like, add a "Deletion test" column naming
the two or more options that fit the blank's sentence on its own.

## 8. What happens next

**Every item you write goes through the same automated checks as machine-written items before any student sees
it.** These are: a duplicate scan against the live bank, the hidden-passage attack described above, and three
graders who check that exactly one answer is defensible and rate the difficulty. Items that fail are
dropped or sent back. Only items that pass go live. Do not be discouraged if some are dropped: in the batch that
passed, 19 of 40 were kept and 5 of those were graded hard.
