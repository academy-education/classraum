# Co-founder feedback loop

His notes catch defects his verdicts miss, and until 2026-10-23 none of them reached the grader brief (v1 A/B was
never changed). This loop turns every would-block note into a **fixture**, a **grader-brief line** and an
**authoring rule**. Design: `AUTONOMY-ALGORITHM-2026-10-23.md` §5. Audit and the level-2 cap:
`docs/research/autonomy-feasibility-2026-10-23.md`. He reviews; he never writes (memory `cofounder-reviews-only`).

## Files

| file | what |
|---|---|
| `cofounder-notes.classified.json` | hand classification of every note: `defect_type`, `would_block`, `scope`, `rationale`; plus REGISTER catches with line refs and anchors |
| `cofounder-notes.json` | the ledger, built from the database + the classification (`build-notes-ledger.mjs`) |
| `cofounder-fixtures.json` | positives (his would-block items, current content, fresh review) + an equal seeded, stratum-matched sample of items he passed with no note (`run-fixtures.mjs build`) |
| `cofounder-grader/COFOUNDER-BRIEF-vN.md` | grader brief versions; never edited in place. `.quotes.json` lists the reviews a version quotes |
| `AUTHORING-RULES-FROM-NOTES.md` | rules every author brief must include (version marker `AUTHORING-RULES-FROM-NOTES vK`) |
| `cofounder-loop-state.json` | current brief version, the VALIDATED version used in production, applied note ids |
| `cofounder-loop-lib.mjs` | the pure logic; tested by `src/lib/study/__tests__/cofounder-loop.test.ts` |

## When a sitting closes

1. **Ledger.** `node scripts/study-bank/build-notes-ledger.mjs`. It refuses (exit 2) while any new note is
   unclassified. Read each new note in full and add an entry to `cofounder-notes.classified.json`: one
   `defect_type` from the taxonomy (add a type only when no existing one fits, and say why in the rationale),
   `would_block` (does it stop release?), `scope` (`item` / `batch` / `display`), a one-line `rationale`. A
   REGISTER catch from his notes goes under `register` with its line and an anchor phrase. Re-run until it builds.
2. **Preview.** `node scripts/study-bank/apply-notes.mjs --dry` lists each new would-block note with the fixture it
   adds (or why it cannot: stale, batch scope, register-only), the brief line (a new check, or another example for
   an existing one) and the authoring rule.
3. **Apply.** `node scripts/study-bank/apply-notes.mjs --write` writes `COFOUNDER-BRIEF-v{N+1}.md` as a NEW file
   (refuses if it exists), appends the rules to `AUTHORING-RULES-FROM-NOTES.md` and bumps its marker, and marks the
   state `pending_fixture_run`. Then edit the new brief by hand only to place or word the added lines well; add any
   newly quoted review ids to its `.quotes.json`. Q notes (would_block false) go to the authoring rules by hand,
   section B.
4. **Fixtures.** `node scripts/study-bank/run-fixtures.mjs build` (read-only database).
5. **Fixture run before use.** A brief version change always triggers this:
   ```
   node scripts/study-bank/run-fixtures.mjs render scripts/study-bank/cofounder-grader/COFOUNDER-BRIEF-v{N+1}.md --out scratchpad/fixtures-v{N+1} --parts 2
   node scripts/study-bank/run-fixtures.mjs render scripts/study-bank/cofounder-grader/<validated brief> --out scratchpad/fixtures-v{N} --parts 2
   ```
   Grade each part with a fresh Claude agent using the prompts in `cofounder-grader/VALIDATE.md` (change the paths),
   then `run-fixtures.mjs compare scratchpad/fixtures-v{N+1} scratchpad/fixtures-v{N}`. Only on PASS set
   `validated_version` / `validated_files` in the state. `scratchpad/mkpacket.py` copies only the validated
   version, and writes `brief.json` (version + sha) into every grade packet.
6. **Authors.** Every author brief includes `AUTHORING-RULES-FROM-NOTES.md`;
   `apply-notes.mjs --check-brief <brief>` exits 1 if a brief carries no marker or a stale one.
7. **REGISTER §5.** Record what the sitting added and the compare result in the same commit.

## Rules that keep this honest

- **The ship bar** (v2 header): recall >= 80% on each defect type with >= 10 positives, and false flags no more than
  10 points above the validated brief on the same packet. Fewer than 10 positives = unvalidated; an unvalidated
  type cannot support promotion, and a brief with no validated type cannot pass.
- **Fixtures are a regression gate, not evidence.** The briefs are written from his notes. A brief is credited only
  through his verdicts on fresh batches graded with it.
- **Stale reviews never become fixtures.** If the item was edited after his note, the content he judged is gone.
  As of 2026-10-23 that removes every factual-error, contradiction, speech and key-wrong catch, so those checks are
  unvalidated. Prefer holding a defective item unedited until its fixture is snapshotted, or record the pre-edit text.
- **Graders never see the maintainer header** (stripped at render and in `mkpacket.py`), the index, or the labels.
- **One brief change per sitting;** brief writers and authors are different agents; authors may read grader flags,
  but no metric they are steered by stands in for his verdicts.
- **A score script that cannot read its input exits non-zero** and prints no number: missing grade file, unmapped
  id (counted flagged), unscored item.
