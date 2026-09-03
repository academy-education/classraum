---
name: bank-act-reading
description: Author and land an ACT Reading form (4 passages x 9 items, one genre each, one paired set) through act-bank-helper, the split blind attack, a key grade and insert. Use to add Reading forms.
---

# ACT Reading (36 questions / 40 minutes, four choices)

Shape and checker: `act-bank-helper.mjs check reading`. Blueprint:
`src/lib/study/act-test.ts` (genres in delivered order literary_narrative,
social_science, humanities, natural_science; exactly one paired passage per
form; domains Key Ideas and Details 44-52%, Craft and Structure 26-33%,
Integration of Knowledge and Ideas 19-26%). Evidence: `ACT-ATTACK-RESULT.md`.

## 1. Author

Batch shape: `act-reading-v1a.batch.json` (`genre`, `paired`,
`passage_title`). Original passages 700-850 words (paired: two of ~350
with "Passage A" / "Passage B" headers - the checker cross-checks `paired`
against those headers). ids `ACT-RD<n>-P<k>-Q<m>`; rotate which genre is
paired across forms.

Checker rules: 9 items per passage, identical passage text, one genre per
passage, no line numbers in stems ("cite the paragraph or quote the
phrase"), vocabulary stems ("most nearly means") quote a target that occurs
ONCE or a unique 4+-word phrase containing it (the B5 finding), domain
spelled as the quotas spell it.

Brief rules the checker cannot see: distractors are passage-anchored
misreadings (right detail wrong relation; the other passage's claim; one
inference too far); vary the key's shape - the two measured tells are in
the English skill and apply here.

```bash
node scripts/study-bank/act-bank-helper.mjs check reading <batch.json>
```

## 2. Gate, insert, verify

Same as `/bank-act-english`: `SPLIT=4` attack (one item per passage per
file), with-source key grader, ledger entry, then

```bash
node scripts/study-bank/act-bank-helper.mjs insert reading <batch.json> act-reading-v<n> --apply
npx tsx scripts/study-bank/verify-act-draw.ts
```

`task` carries the genre; the assembler draws one full passage per genre
in published order and reports SHORT rather than back-filling a genre.

## 3. Record

`REGISTER.md` §5 (A21).
