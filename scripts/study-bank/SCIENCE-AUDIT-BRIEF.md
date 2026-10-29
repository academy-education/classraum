# Science audit brief (key visible)

You are checking science items that have already passed one grading and are about to go to students. Your job is
to find anything that would make a careful student's correct reasoning land on a non-key answer, or make the key
wrong, unreadable or free. The key and the author's explanation are shown on purpose. **Do not trust them.** Rebuild
every answer from the passage and figure first, then compare.

## How the figures reach you

Figures are printed as text, rendered exactly as the student's screen draws them:

- **Bar charts:** the student sees y-axis ticks at 0, 25%, 50%, 75% and 100% of the tallest bar, and NO value
  labels. The listed heights are hidden data; the student can only estimate them against the ticks.
- **Line and scatter graphs:** the student reads points against five ticks per axis. Several series are drawn
  identically, with no legend.
- **Tables:** shown as printed.
- **RENDER WARNING lines:** these describe real defects on the student's screen.

## For EVERY item answer five questions

1. **Key.** Recompute the answer from what the student can see.
   - Show the arithmetic or the reading in `detail` (a `note` issue is fine).
   - `key_verified: true` only if you reached the key yourself. If you reach a different option, or cannot reach
     any option, it is `false`.
2. **Uniqueness.** Is exactly one option defensible? If a careful student could defend another option from the
   passage, raise `second_defensible` and name the letter and why.
3. **Readability.** Is every value the key needs readable as rendered? Raise `unreadable` when:
   - the key turns on a bar height between ticks that is closer than the student can estimate;
   - the key depends on which unlabeled series is which;
   - a needed value is in the explanation but not on screen;
   - a render warning hides a needed cell.
4. **Facts.** Raise `fact_error` when:
   - the passage, an option or the explanation states something false about the real world (wrong units, an
     impossible value, a misnamed process);
   - the passage contradicts its own figure;
   - the explanation contradicts the key.
5. **Source.** Could a student who knows the science answer this without the passage or figure? If so, raise
   `no_source`.

`note` is for anything worth recording that does not meet one of those bars. It never flags. Do not use it to
soften a real problem.

## Output

Write ONLY your output file, as JSON, with one entry per item id in the packet and nothing else:

```
{
  "ASV12b-P3-Q2": { "key_verified": true,  "issues": [ { "type": "note", "detail": "Trial 4: 18.2 - 12.6 = 5.6 g, largest of the four; C." } ] },
  "MSB1-P6-03":   { "key_verified": false, "issues": [ { "type": "unreadable", "detail": "Key needs 42 vs 45 on a 0-60 axis with ticks every 15; not separable." } ] }
}
```

- `type` is one of: `second_defensible`, `unreadable`, `fact_error`, `no_source`, `note`.
- Every issue needs a non-empty `detail`.
- `issues` may be `[]`.
- A file with a missing id, an extra id or any other type is void and gets re-run.

Flag only what you can show. Flag every time you can show something; a flag holds a passage for the owner to
read, and it costs nothing else.
