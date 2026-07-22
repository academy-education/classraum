# TOEFL bank — authoring runbook

How to make more TOEFL questions in the future. All Claude-authored + Claude-QC'd
(no GPT in the question loop); OpenAI is used only for the audio (TTS). Mirrors
the SAT pipeline in RUNBOOK.md. Four stages: **author → QC → insert → pre-warm.**

Reference: [toefl-authoring-spec.md](./toefl-authoring-spec.md) — the exact JSON
shape for every item type. Helper: [toefl-bank-helper.mjs](./toefl-bank-helper.mjs).
Audio: [prewarm-toefl-audio.mjs](./prewarm-toefl-audio.mjs).

Bank columns: `family='toefl'`, `section` ∈ reading|listening|writing|speaking,
`item_type`, `item` (jsonb, the renderer shape), `content_hash` (dedup),
`verified`, `archived`, `cohort` (`v3-claude` for Claude-authored batches),
`source` (`hand` = Claude-authored, `generated` = older GPT-harvested).

Serving draws per section (assemble.ts `TOEFL_META`): Reading 2 CTW + 48 MC;
Listening 47 MC; Speaking 7 repeat + 4 interview; Writing 10 build + 1 email +
1 discussion. ~47–50 items per section = one full test; divide the bank by that
to estimate unique no-repeat tests per student (the recycler serves indefinitely
past that).

## 1. Author (parallel Claude subagents)

Spawn N general-purpose agents. Each: reads `toefl-authoring-spec.md`, authors a
batch of one item type to its own file, writes ONLY a JSON array. Give each agent
DISTINCT topics (avoid dup transcripts) and, for Listening, a unique
`passageGroupId` prefix (e.g. `M7-1..7`) so groups never collide across batches.
Over-draft ~10–15% so QC can trim. Files → a scratch dir, e.g. `listening-13.json`.

## 2. QC

**Listening / Reading MC (keyed):** two independent blind-solve passes.
- Round 1 (per file): agent reads each item with `correct_answer` stripped, solves
  from the passage/transcript alone, keeps only if its answer == key AND the item
  needs the passage AND 4 clean distinct choices. Writes `{"keep":[ids...]}`.
- Round 2 (per file): a HOSTILE reviewer ("assume flawed, prove clean") repeats the
  blind solve. Writes `{"keep":[ids...]}`.
- Survivors = round1 ∩ round2. Item id convention: `"<basename>#<0-based index>"`.

**Writing free-response (no key):** one reviewer pass flags off-format/incoherent/
non-opposing/duplicate → `{"archive":[ids...]}`. (Speaking free-response similar;
speaking_repeat is deterministic — verify the sentence is 8–12 words and keep.)

Merge per-file keep/archive JSONs into one `keep-*.json` / `flag-*.json`.

## 3. Insert (from repo root, uses .env.local service key)

```bash
# Listening (keep.json = {"keep":[survivor ids]})
node scripts/study-bank/toefl-bank-helper.mjs insert-listening <keep.json> <file...>
# Writing (flag.json = {"archive":[ids]})
node scripts/study-bank/toefl-bank-helper.mjs insert-writing <flag.json> <file...>
```

Dedups on `content_hash` against the live TOEFL bank (re-runs are idempotent).
Inserts as `verified=true`, `source='hand'`, `cohort` from `BANK_COHORT`
(default `v3-claude`). For Reading MC / Speaking / arrange_words, extend the
helper with an analogous `insert-<type>` (same pattern: shape-check + hash + insert).

## 4. Pre-warm audio (Listening + Speaking only)

```bash
node scripts/study-bank/prewarm-toefl-audio.mjs plan   # count + est. cost, no spend
node scripts/study-bank/prewarm-toefl-audio.mjs run     # generate the missing clips
```

Replicates the client's exact text→segment transform + the server's cache hash,
so the MP3s land at the keys the player looks up (guaranteed cache hit). Idempotent
— only generates clips not already in storage. ~$0.005/clip. Run after every new
Listening/Speaking insert so no student triggers on-the-spot TTS.

## Verify

```sql
select section, item_type, count(*) filter (where verified and not archived) ready
from study_item_bank where family='toefl' group by 1,2 order by 1,2;
```
Then start a bank test from the TOEFL topic page (or POST /api/study/test/assemble
with `{family:'toefl', section}`) and confirm it renders + audio plays.
