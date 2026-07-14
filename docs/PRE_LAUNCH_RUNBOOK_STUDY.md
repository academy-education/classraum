# Pre-Launch Runbook — Study System Addendum

The main [`PRE_LAUNCH_RUNBOOK.md`](./PRE_LAUNCH_RUNBOOK.md) was written on
2026-05-25 and **predates the entire study product** (the B2C SAT / test-prep
learning system under `/mobile/study/*`, its AI test generation, the study
credit + subscription system, and the study crons). Follow the main runbook
first, then this addendum, before flipping `app.classraum.com` to public
traffic with the study system enabled.

Everything here is *additive* to the main runbook. Where a variable or step is
already covered there, it's cross-referenced, not repeated.

---

## 1. Environment variables (study-specific)

### Required — the study system does not function without these

| Variable | Notes |
|---|---|
| `OPENAI_API_KEY` | **The single most important study var.** Powers *all* AI study surfaces: full-test generation (`/api/study/test/generate`), practice/lesson/flashcard generation, the chat tutor, snap-to-solve, on-demand answer explanations, and written/spoken response grading. Without it every AI mode returns an error. Note: a **SAT full test is the exception** — it assembles from the pre-verified hand-authored bank (`/api/study/test/assemble`) and needs no OpenAI call. Everything else does. |
| `SUPABASE_SERVICE_ROLE_KEY` | Already required by the main runbook. The study system leans on it heavily — every `/api/study/*` route uses `supabaseAdmin` for cross-RLS reads/writes (sessions, mastery, credits, leagues). Re-confirm it's set. |

### Required for study billing + credits

| Variable | Notes |
|---|---|
| `PORTONE_WEBHOOK_SECRET` | Already in the main runbook. The study subscription cron (`study-billing`) charges stored PortOne billing keys; the same webhook path confirms those charges. Prod rejects unsigned webhooks. |
| `CRON_SECRET_KEY` | Already in the main runbook. **All study crons require it** (see §4). |

### Optional — degrade gracefully if unset

| Variable | Notes |
|---|---|
| `OPENAI_AUDIO_GRADE_MODEL` | Overrides the model used for spoken-response grading. Defaults to `gpt-4o`. Leave unset unless you're deliberately tuning cost/quality. |
| `FCM_PROJECT_ID` | Firebase project id for study push notifications (streak reminders, test-ready, league roll). Without it, `study-push-reminders` logs instead of sending. |
| `FCM_SERVICE_ACCOUNT_JSON` | Firebase service-account JSON (stringified) for the push sender. Same fallback as above. |
| `POSTMARK_SERVER_TOKEN` | Already in the main runbook. Also used by `study-weekly-recap` (Monday recap email). Without it the recap cron no-ops. |

> **Model reference (informational — no config needed):** generation uses
> `gpt-4.1`; easy/medium item batches use `gpt-4o-mini`; grading + AI mastery
> assessment use `gpt-4o`; transcription uses `whisper-1`; speaking audio (TTS)
> uses `tts-1`. All are hard-coded defaults; only `OPENAI_AUDIO_GRADE_MODEL` is
> env-overridable.

---

## 2. Database migrations (study-specific)

The main runbook stops at migration **034**. The study system adds
**035 – 041**. All are additive and idempotent.

| Migration | Purpose |
|---|---|
| `035_xp_response_graded_dedupe.sql` | Idempotent XP award for graded responses |
| `036_study_attempts_position_unique.sql` | Unique constraint on attempt position |
| `037_study_credit_system.sql` | **Credit ledger + `use_study_credit` / `refund_study_credit` RPCs.** Test generation reserves a credit here before spending model tokens. |
| `038_study_item_bank.sql` | `study_item_bank` — the hand-authored SAT/verified item pool the free bank path draws from |
| `039_study_hardening_batch.sql` | Batched hardening fixes |
| `040_study_quest_claims.sql` | Weekly-quest idempotent claim ledger |
| `041_study_goal_score.sql` | `study_user_prefs.goal_score` + `test_date` (feeds the predicted-score / study-plan engine) |

**Verify in the Supabase Migrations tab that 035–041 all show applied.**
Also confirm the Phase 0 study schema tables exist (they predate this numbering
if the study system was branched in separately) — spot-check that these are all
present: `study_sessions`, `study_topics`, `study_mastery`, `study_user_prefs`,
`study_messages`, `study_item_bank`, `study_credits` (or the credit ledger from
037), `study_xp_events`, `study_leagues` / league-membership tables,
`study_quest_claims`, `study_snap_captures`, `study_attempt_notes`.

If 037 is missing, **every AI test generation 500s** (the credit-reserve RPC
won't exist). If 041 is missing, the predicted-score card and study-plan card
silently self-hide (the prefs columns they read don't exist).

---

## 3. Storage buckets

The study system uses two Supabase Storage buckets. Confirm both exist and
their access policy matches the intended visibility **before** launch:

| Bucket | Contents | Access |
|---|---|---|
| `study-snap-images` | Snap-to-solve photo uploads; also read back (signed URLs) in the wrong-notebook | Private — served via time-limited signed URLs (1h). Do **not** make public. |
| `study-listening-audio` | Generated TOEFL/listening TTS clips | Public-read is expected (the audio player fetches a public URL). Confirm this matches your privacy stance. |

If `study-snap-images` doesn't exist, snap-to-solve upload 500s. If
`study-listening-audio` doesn't exist or isn't readable, listening items fail
to play audio.

---

## 4. Cron schedule (study-specific)

`vercel.json` includes these study crons (Vercel auto-registers on deploy).
**All require the `CRON_SECRET_KEY` bearer header** — some inline the check,
others use the `verifyCronAuth` helper (`src/lib/cron-auth.ts`); both gate on
the same secret.

| Path | Schedule (UTC) | Purpose | Money at stake? |
|---|---|---|---|
| `/api/cron/study-billing` | `15 9 * * *` (daily) | Renew study subscriptions, reset monthly credit grant, finalize cancellations, retry past-due once then expire | **Yes** — charges billing keys |
| `/api/cron/study-league-roll` | `5 0 * * 1` (Mon) | League promotion/relegation + new-week reset | No |
| `/api/cron/study-weekly-recap` | `0 0 * * 1` (Mon) | Weekly study recap email (Postmark) | No |
| `/api/cron/study-push-reminders` | `0 9 * * *` (daily) | Streak / study reminders via FCM | No |
| `/api/cron/refresh-test-specs` | `30 4 1 * *` (monthly) | Web-search refresh of per-test format specs | No (spends model tokens) |
| `/api/cron/refresh-test-spec-examples` | `0 5 1 1,4,7,10 *` (quarterly) | Refresh hard-example anchors per test | No (spends model tokens) |

**`study-billing` is the one to watch on deploy day** — it's the study analogue
of `subscription-billing`. Idempotency: paymentId is namespaced
`study-sub-renew-{studentId}-{period_end_iso}` so two runs in the same period
can't double-charge (PortOne also dedups server-side). Verify a manual run
returns success JSON with a valid `CRON_SECRET_KEY` before trusting the
schedule.

---

## 5. Study credit + billing model (know before you launch)

- **1 credit = 1 AI-generated full test.** `study-billing` resets the monthly
  grant to the plan's allotment on each successful renewal; packs can be
  purchased on top.
- Generation **reserves** a credit *before* spending model tokens
  (`use_study_credit`) and **refunds** it on every failure path
  (`refund_study_credit`). If you see credits drained without tests, check the
  refund path is firing in logs (`[test/generate] credit refunded`).
- **SAT full tests are free** (bank-assembled, no credit, no subscription
  required) — this is intentional as the on-ramp/diagnostic. Non-SAT families
  (TOEFL, etc.) go through paid generation.
- Premium gates enforced in code: spoken-response *audio* grading, snap
  daily-cap, and score analytics. Confirm the free/paid tier split matches your
  pricing before launch.

---

## 6. Study-specific pre-deploy verification

Run alongside the main runbook's §5. On staging, signed in as a study user
with an active SAT target:

- [ ] **Free path works without spending:** start a **SAT** full test → it
      assembles from the bank (fast, no "generating" spinner), no credit
      decremented. Confirm the two-pane desktop reading layout renders (passage
      left, choices right) at ≥1024px and stacks on mobile.
- [ ] **Paid path reserves + refunds correctly:** with a test account holding
      ≥1 credit, generate a **non-SAT** test → credit decrements by exactly 1
      on success. Force a failure (e.g. invalid topic) → confirm the credit is
      refunded (balance returns to start; log shows the refund line).
- [ ] **Predicted-score / study-plan engine:** with at least one completed SAT
      R&W *and* one completed Math full test for the account, the landing shows
      a populated Predicted Score card (not the "Start with a diagnostic"
      cold-start) and the "This week's plan" card. Setting a `test_date` in
      preferences makes the "~N pts/wk" pace line appear.
- [ ] **AI grading:** submit a written response → grade returns with a rubric
      breakdown (verifies `OPENAI_API_KEY` reaches the grade route).
- [ ] **Snap-to-solve:** upload a photo → solution returns; confirm the image
      lands in `study-snap-images` and is retrievable via signed URL in the
      wrong-notebook.
- [ ] **study-billing dry run:** `GET /api/cron/study-billing` with
      `Authorization: Bearer $CRON_SECRET_KEY` → returns stats JSON, no
      unexpected charges on accounts not due for renewal.
- [ ] **RLS:** as study user A, attempt to read study user B's session id
      directly → returns empty (study RLS scopes `student_id = auth.uid()`).

---

## 7. Study-specific post-deploy checks

Within 30 minutes:
- [ ] A real study user completed a session (check `study_sessions` for a fresh
      `completed` row)
- [ ] No 500s in Vercel logs from `/api/study/test/generate` or
      `/api/study/*/grade`
- [ ] OpenAI dashboard shows successful calls (not 401s → wrong/missing key)

Within 24 hours:
- [ ] First `study-billing` run (09:15 UTC) returns success; spot-check no
      account was double-charged for the same period
- [ ] `study-push-reminders` (09:00 UTC) either sent via FCM or logged the
      no-op (if FCM vars unset)

Within 1 week:
- [ ] First `study-weekly-recap` (Mon 00:00 UTC) and `study-league-roll`
      (Mon 00:05 UTC) both complete; league standings rolled over

---

## 8. Known follow-ups / gaps specific to study

- **AI cost has no hard ceiling per user beyond credits.** Generation is
  credit-gated, but chat tutor, explanations, and grading are not
  per-request-metered — only the endpoint rate limits apply. Watch the OpenAI
  spend dashboard for the first week; add per-user AI budgets if abuse appears.
- **`study-billing` past-due handling** expires after one retry (3 days). This
  is stricter than the core `subscription-billing` state machine (which the
  main runbook notes "retries forever"). Confirm this is the intended study
  policy before launch.
- **Test-spec refresh crons spend model tokens on a schedule** (monthly +
  quarterly) via web search. If the OpenAI key is rotated/revoked, these fail
  silently and specs go stale — not user-facing but worth a Sentry alert.
- **The study system is not covered by the main runbook's Sentry/PII scrubbing
  audit.** Study routes log session/user context; confirm the breadcrumb
  scrubber (main runbook §4, commit d7beecc) covers `student_id` and any free-
  text prompt/answer content before enabling Sentry in prod.

---

## See also

- [`PRE_LAUNCH_RUNBOOK.md`](./PRE_LAUNCH_RUNBOOK.md) — the core deploy checklist (run first)
- [`recurring-payments-setup.md`](./recurring-payments-setup.md) — PortOne / billing-key mechanics (shared by study-billing)
- [`SENTRY_SETUP.md`](./SENTRY_SETUP.md) — error monitoring wiring
