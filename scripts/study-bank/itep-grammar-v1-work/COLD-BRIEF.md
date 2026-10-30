# Cold solve: grammar items (phase 1 of 2)

You are solving four-option English grammar questions written for middle- and high-school learners of English.
No answer key is given. Solve each item yourself, the way a careful, fluent reader would, using standard US edited
English.

Two item kinds:
- **Sentence Completion:** one sentence with a blank (`________`). Choose the option that correctly completes it.
- **Error Identification:** one sentence with four marked segments `[A: ...]` .. `[D: ...]`. The choices are those
  segments in sentence order. Choose the ONE segment that is NOT correct in this sentence.

For every item:
- `pick`: the text of the option you choose (copy it exactly).
- `also_correct`: the text of any OTHER option that you think is also a correct answer for a careful student: for
  completion, another option that also makes the sentence correct and natural; for error identification, another
  segment that is also wrong, or a reading under which your pick is actually correct. Use `[]` if none. Be honest:
  list an option if you hesitated between it and your pick for a grammatical reason.
- `note`: one short line, optional.

Write one JSON object to the output file named in your task, keyed by item number:

```
{
  "1": {"pick": "<option text>", "also_correct": [], "note": "..."},
  "2": {"pick": "<option text>", "also_correct": ["<option text>"], "note": "..."}
}
```

Solve every item. Do not look for or open any answer key, index, author file or other grader output.
