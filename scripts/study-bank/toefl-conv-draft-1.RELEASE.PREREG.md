# TOEFL Listening conversation draft 1: co-founder RELEASE sittings, pre-registered (2026-10-21)

**Committed with the staged insert, before any run is drawn.** Nothing here changes after a draw.

## Why
Real-student exposure, 2026-10-21: the two heaviest TOEFL students have completed 9 Listening
sittings each, mostly on the hard route. `toefl-form-depth.ts` (live): upper/hard is bound at **11
clean sittings by Listening Conversation**, lower/easy at 11 and lower/medium at 12 by Choose a
Response. So those students have about two Listening sittings before conversations repeat. On TOEFL
listening the model options-only attack saturates while people score near chance (CLAUDE.md
2026-09-21; memory toefl-mc-bank-guessable), so a human sitting decides. Owner, 2026-10-21: "keep
making questions".

## The batch
`toefl-conv-draft-1`: **64 items = 32 two-question conversations**, authored in September 2026 as
`toefl-conv-v5.batch.json` / `toefl-conv-v6.batch.json`, which were never gated, never banked and
carry no ledger entry (REGISTER 2026-10-02 noted them). Not in the bank under any cohort (transcript
match, 0/64). `conversation-gate.ts` shape check: 0 violations on 32 transcripts.

**One defect found and fixed before insert: speaker gender.** The player voices the first speaker
`nova` (female) and the second `onyx` (male) (`ListeningAudioPlayer.tsx` DIALOGUE_VOICE_ROTATION).
50 of 64 items referred to speakers as "the man/woman" or he/she, and in 20 of 32 sets the genders
contradicted the audio. Fixed per set by reading each one (`scratchpad/toefl-conv-draft1-work/
fix-gender.mjs`, diff `gender-diff.txt`): 18 sets flipped whole, 2 sets (v6-03, v6-08) only the
student's references, v6-04 only the staff reference, v6-13 one pronoun; v6-05's "her" is a third
party and stays. The live bank does not use "the man/woman" (0 items) but 110 live dialogue items
use pronouns, unaudited against voice order: recorded in REGISTER as a follow-up.

Labels are the September authors' (easy 21 / medium 34 / hard 9 items). **Not run:** AI options-only,
AI graders, an independent with-source read, the conv-hard-v2 brief's tell checks (these sets predate
that brief). Key uniquely longest 14/64, shortest 17/64 (chance ~16 each).

## The runs (12 items = 6 conversations each, about 45 minutes)
Reviewer `support@classraum.com` (`6ca6edaf…`). Drawn one at a time, each only when no other run is
open. Queue position: **after the three SSAT draft-2 runs, before ISEE draft 1.**
First the 14 sets with both items medium or hard (the hard-route shortage):
v5-01 v5-09 v5-10 v5-13 v5-16 v6-01 v6-03 v6-04 v6-06 v6-11 v6-12 v6-13 v6-14 v6-15;
then the other 18. Whole conversations are drawn together (both items in one run). Same panel: blind
pick on options only, then transcript + key: Only defensible / Another is also defensible / No unique
answer.

## Release rule (fixed now)
1. **Batch guard, per run and pooled.** A run blind >= 50% of its items, or pooled blind >= 50% of all
   answered items, holds everything not yet released.
2. **Per conversation**: both items "Only defensible" -> both `verified=true`. If EITHER item is
   flagged, BOTH are archived (the assembler serves conversations whole; a one-question conversation
   cannot be drawn).
3. Released set by set as each run closes, so the hard-route sets can reach students before the rest.
4. After each release: `toefl-form-depth.ts`; report upper/hard and lower/easy depth.

## Known limits, stated before the number exists
- One reader; ~12 items per run, about +/-28 points per run. The pooled guard is the real one.
- Release per run (rule 3) means early runs ship before the pooled number exists; the per-run guard is
  the protection there, and it is coarse.
- Author labels, not grader medians: some "medium" sets may play easy, which affects difficulty, not
  correctness.

## Run 1 drawn (2026-10-21)
`toefl-conv1-release1-cofounder-2026-10-21`: v5-01 v5-09 v5-10 v5-13 v5-16 v6-01 (the first six listed
in-band sets), 12 items, flat A3 B3 C3 D3 (control 25.0%), by `draw-toefl-conv-runs.mjs` (whole
conversations; draw-review-run.mjs is item-level). The panel serves rows in id order, so a
conversation's second question may follow its first after the transcript has been revealed: the blind
pick on the later sibling is then not blind, which can only raise the blind score (the conservative
direction for the guard). Same as every passage sitting so far.

## Run 1 answered and released (2026-10-21)
`toefl-conv1-release1`: blind 2/12 (16.7%, guard 50%), 12/12 Only defensible, 0 stale. Released 6
conversations (12 items, verified=true) by `release-toefl-conv-runs.mjs`; audio pre-warmed
(`prewarm-toefl-audio.mjs run`: 72 clips, 0 failed, all live clips cached). Realism 6/12 authentic.
Note: v5-01 "D is the only answer but the key line is slightly ambiguous." Depth (`toefl-form-depth.ts`):
upper/hard 11 -> 12 clean sittings (still bound by Conversation, 12[14]). Run 2 drawn:
`toefl-conv1-release2` (v6-03 v6-04 v6-06 v6-11 v6-12 v6-13).

## Run 2 answered and released (2026-10-21)
`toefl-conv1-release2`: blind 3/12 (pooled 5/24 = 20.8%), 12/12 Only defensible, 0 stale. Released 6
conversations; audio pre-warmed (54 clips, 0 failed). **His notes found three quality defects the rule
does not catch (all items still rated unique):** (1) the v6 transcripts have no contractions ("I do not
think I ever registered it", "Let us do that") and sound scripted; (2) v6-04's explanation is
self-contradictory (the subject is called a preference but acted on as a requirement); (3) v6-12
contradicts itself about winter gowns (ordered vs rented on the day; is the September deadline past?).
Also: "her" in options is not established by the transcript (the voice establishes it in audio).
**Live rows (v6-03 04 06 11 12 13): wording fixes need owner approval; not changed.**
**Unreviewed rows: pre-sitting edit made.** Contractions added to the 9 unseen v6 conversations
(18 rows; passage, explanation, rationale reasons) by `fixes/contract-toefl-conv-draft1-v6-2026-10-21.mjs`
(snapshot first; refuses on any reviewed row; sentence-final "it is" and "in there is" left alone). Read
for contradictions like v6-04/12: none found. Run 3 drawn: `toefl-conv1-release3` (v6-14 v6-15 v5-02
v5-03 v5-04 v5-05).

## Run 3 answered and released (2026-10-21)
`toefl-conv1-release3`: blind 3/12 (pooled 8/36 = 22.2%), 12/12 Only defensible. Released 6 (18 of 32
conversations live); audio pre-warmed (58 clips, 0 failed). Note: v5-02 "a logic gap gives B some pull"
(rated unique). Depth: **upper/hard 12 -> 14, now bound by Academic Talk (14); Conversation 16[17].**
Run 4 drawn: `toefl-conv1-release4`.

## Queue order amendment (2026-10-21, before any later run is drawn)
Because Academic Talk now binds the hard route, `toefl-talk-draft-1`'s three runs are drawn next, right
after run 4, ahead of the remaining conv-draft-1 runs and conv-draft-2. Order only; no rule changes.

## Run 4 answered and released (2026-10-22)
`toefl-conv1-release4`: pooled blind 9/48 = 18.8%, 12/12 Only defensible. Released 6 (24 of 32 live);
audio pre-warmed (62 clips, 0 failed). Note: v5-11 "the transcript is unclear about who signs what"
(rated unique). Next per the queue amendment: `toefl-talk1-release1` (T01 T02 T03), drawn.
