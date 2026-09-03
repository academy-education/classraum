---
name: bank-toefl-listening
description: Author and land TOEFL Listening items (Choose a Response, Conversation, Announcement, Academic Talk) through the blind-listening render, the no-source attack, the QC ledger, insert-listening and audio pre-warm. Use when a listening task needs items; read the held/killed history first.
---

# TOEFL Listening

Runbook: `scripts/study-bank/TOEFL-RUNBOOK.md` (author -> QC -> insert ->
pre-warm). Gate: `/bank-gate`. History that decides the method:
`CHOOSE-A-RESPONSE-BRIEF.md`, `CRV7-RESULT.md`, `CR-V10-RESULT.md`,
`DL-FRESH-PREREGISTERED.md`, `MC-ATTACK-2026-08-18.md`.

## 0. Is it short? Usually not

Every listening task has 10+ forms. The delivered counts are Andy's
standing rule and never change (`listening-blueprint.test.ts`). Author only
when a cohort is being replaced or a task is genuinely under 10 forms.

## 1. Method by task (this is the part that was learned the hard way)

**Choose a Response** - only ONE method has cleared the attack: cr-v7's
four symmetric worlds per item (each world has its own spoken line AND
reply, 4 x 4 kill-quotes machine-verified), with a seeded RNG picking the
spoken world AFTER text freeze so no author knows the key.
`render-crv7.mjs` does the validation, selection and assembly. A brief
alone (six of them) produced a new tell each time; cr-v10 authored to the
kill-quote standard without seeded selection measured +9.2 - inside the
calibrated bar, but every solver named "the reply to the canonical
complication for the setting". Prefer the method.

**Daily Life / Announcement / Conversation / Talk (multi-question
transcripts)** - the shipped daily-life cohorts cleared at or below control
with the flat-prior + form-symmetry brief and AUTHORED atypical-fact
passages (`DL-FRESH-PREREGISTERED.md`). Real-world priors and hedged
"imply" options are the leak; announcement-v4 authored without that method
measured +58 sibling-free and is held. Sibling leaks (an option in one item
restating a sibling's key) reach the bank unless the attack is split.

## 2. Author

Shapes: `scripts/study-bank/cr-v10-b1.batch.json` (CR),
`announcement-v4.batch.json` (sets: `passageGroupId`, identical passage per
set, `listeningTask`, `[Announcement - setting]` prompt tag). Run
`check-batch-variety.mjs` (pivot rate, BrE, opening-word variety, length CV).

```bash
cd /Users/andylee/Downloads/saas/classraum
node scripts/study-bank/toefl-bank-helper.mjs blind-listening <batch.json...>   # prints answer-blind blocks, ids <fileTag>#<idx>
```

## 3. Gate (all four steps of /bank-gate)

- No-source attack: `make-attack.mjs` (CR) or `SPLIT=n make-attack.mjs` (sets, one item per transcript per file), three solvers, `score-attack.mjs`.
- With-source exclusivity grader: line/transcript + 4 options, key unmarked; two acceptable replies = drop (do not repair twice).
- Elimination probe for CR: options only, 10-to-1 certain-reject standard; any certain reject is a defect.
- Ledger entry with `contentSha` over the files in the order passed to insert.

## 4. Insert, pre-warm, verify

```bash
BANK_COHORT=<cohort> node scripts/study-bank/toefl-bank-helper.mjs insert-listening <keep.json> <batch.json...>
node scripts/study-bank/prewarm-toefl-audio.mjs plan && node scripts/study-bank/prewarm-toefl-audio.mjs run   # OpenAI TTS only; ~$0.7 per 330 clips
```

`keep.json = {"keep": ["<fileTag>#<idx>", ...]}`; ids not in keep are
rejected. Choices are shuffled at INSERT for hand-authored TOEFL (seeded by
content hash) - the opposite of SAT; do not "fix" either.

## 5. Human sitting

A shipped CR cohort that no person has sat is a risk (cr-v10). Draw a
20-item sitting for the co-founder with `DRAW_COHORT=<cohort>` and apply
the fixed rule.

## 6. Record

`REGISTER.md` §5 and the ledger. If a brief fails, write the
`<COHORT>-RESULT.md` with solver reports verbatim so the next person does
not rebuild the same brief.
