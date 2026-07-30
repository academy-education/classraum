# Plan: "How do you like the app?" prompt

Status: proposal, not implemented. Written 2026-07-30.

Surface: `/mobile/study/**` (Korean middle/high schoolers, TOEFL/SAT). Native iOS +
Android via Capacitor, plus web.

---

## 0. The two findings that change the design

**Read these before anything else. Both invalidate part of the brief as stated.**

### 0.1 Google forbids the sentiment question outright

From the [Play In-App Review docs](https://developer.android.com/guide/playcore/in-app-review),
verbatim:

> "Your app shouldn't ask the user any questions before or while presenting the
> rating button or card, including questions about their opinion (such as 'Do you
> like the app?') or predictive questions (such as 'Would you rate this app 5
> stars')."

That is the exact phrasing of the two-step pattern the brief asks for. Chaining
sentiment → `launchReviewFlow` in one interaction is a Play policy violation, not a
gray area. Apple's [Guideline 1.1.7](https://developer.apple.com/app-store/review/guidelines/)
is softer but points the same way — "we will disallow custom review prompts."

Google also explicitly rules out a "Rate us" button that calls the API:

> "You should not have a call-to-action option (such as a button) to trigger the
> API, as a user might have already hit their quota and the flow won't be shown,
> presenting a broken experience to the user. For this use case, redirect the user
> to the Play Store instead."

**Consequence.** We keep both halves of the brief but decouple them in time:

- The **sentiment card** is an in-app feedback instrument. It stands on its own —
  today the study surface has *zero* feedback capture (see §1.4), so this is worth
  building regardless of ratings.
- The **native review request** fires on its own trigger, in a *different session*,
  at least 14 days after any sentiment interaction, with no UI of ours attached.
- Sentiment is used as a **suppressor**, not a gate: if a student's most recent
  answer was negative, we never request the native review. We do not "route happy
  users to the store" inside one flow.

This is still gating in spirit and should be named as such — but it is not "asking
a question before or while presenting the card," and the store request is not
attached to any custom prompt. That is the defensible line. It is a judgement call;
see Open Question 7.

### 0.2 The web bundle ships instantly; the native plugin does not

`capacitor.config.ts` sets `server.url = 'https://app.classraum.com'`. The native
apps are thin shells around a **remotely hosted** web app. So:

- The sentiment card is a JS change → ships on the next Vercel deploy, no store review.
- The native review request needs a new Capacitor plugin → new binary, `versionCode`
  5 / `versionName 1.0.4` (currently 4 / 1.0.3 in `android/app/build.gradle:25-29`
  and `ios/App/App.xcodeproj/project.pbxproj:362`), through both store review queues.

This forces the phasing in §7 and is the single best argument for shipping the
sentiment card first: it gives us the sentiment distribution *before* we spend a
binary release on the store request.

---

## 1. What we already have

Reuse beats inventing. Everything below exists today.

### 1.1 Overlay / card primitives

| Need | Use | Path |
|---|---|---|
| Portal (mandatory — study pages sit in transformed containers) | `ModalPortal` | `src/components/ui/modal-portal.tsx` |
| Drag-to-dismiss bottom sheet | `useSheetDrag(onClose)` | `src/app/mobile/study/_shared/useSheetDrag.ts` |
| Canonical sheet to clone | `WeeklyQuestsButton` | `src/app/mobile/study/_shared/WeeklyQuestsButton.tsx` |
| Dismissible inline nudge card (has `onDismiss` + `dismissLabel`) | `StudyTodayCard` | `src/app/mobile/study/_shared/primitives.tsx` |
| Buttons | `StudyButton` | `src/app/mobile/study/_shared/StudyButton.tsx` |
| 5-second undo on dismiss | `emitUndoable(label, onUndo)` | `src/app/mobile/study/_shared/UndoToast.tsx` |
| Error toast in study flow | `useStudyErrorToast()` | `src/app/mobile/study/_shared/useStudyErrorToast.tsx` |
| Haptics (web-safe, already guarded) | `hapticTap()` | `src/lib/nativeHaptics.ts` |
| Native detection | `isNativeApp()`, `getPlatform()`, `openExternalUrl()` | `src/lib/nativeApp.ts` |

There is **no generic bottom-sheet component**. `TestCustomizationSheet.tsx` and
`CreditConfirmSheet.tsx` are bespoke. The de-facto primitive is
`ModalPortal + useSheetDrag` at `z-[120]` backdrop / `z-[121]` sheet.

Do **not** use `src/components/ui/modal.tsx` (desktop, and its `onClose` is never
wired to the backdrop) or `ToastProvider`/`useUIStore` (the study flow does not use
them).

### 1.2 The closest precedent: `NavTour`

`src/app/mobile/study/_shared/NavTour.tsx` is the pattern to copy wholesale:
`localStorage` fast-path cache + `study_user_prefs.nav_tour_seen_at` as the durable
source of truth, written through `PUT /api/study/prefs`, localStorage written first
so a failed PUT still suppresses locally. It is the **only** cross-device dismissal
in the study flow. Everything else (`ResumeBanner`, `StreakAtRiskBanner`,
`DailyGoalCelebration`) uses `sessionStorage` and is per-visit — wrong for this.

`DailyGoalCelebration.tsx` is the precedent for *where not to fire*: it explicitly
defers its overlay while `pathname.includes('/mobile/study/session/')` and releases
when the student leaves. Copy that.

Global one-shot components mount together in `src/app/mobile/layout.tsx:146-155`
(`XpToast`, `UndoToast`, `DailyGoalCelebration`, `NavTour`). Ours mounts there too.

### 1.3 The "Was this helpful?" widget

`ArticleFeedback` — `src/app/(app)/dashboard/help/ArticleFeedback.tsx`.
Props `{ slug, lang: 'en'|'ko', labels: Labels }`. Vote `'up' | 'down'`, then
reveals a textarea for free text. Writes **directly from the client** via the anon
Supabase client to `public.help_article_feedback`.

Reuse the **interaction shape** (vote lands immediately, comment is optional and
follows), not the implementation. Three things not to copy:

- It writes a **second row** when the comment is sent, so naive `COUNT(vote)`
  double-counts commented votes. Deliberate, per its comment, but it means the
  admin dashboard at `dashboard/help/admin/page.tsx` over-counts.
- Labels are a hardcoded inline `lang === 'ko' ? {...}` ternary at
  `dashboard/help/[slug]/page.tsx:99-123` — outside the locale system entirely.
- **`help_article_feedback` and `help_article_views` have no migration file.** They
  were applied directly against remote Supabase. Do not repeat that (see §4.2).

### 1.4 Analytics

- Client helper: `track(event, props)` — `src/lib/study/track-client.ts`. Fire-and-forget
  `POST /api/study/track`, `keepalive: true`, swallows errors.
- Route: `src/app/api/study/track/route.ts`. Bearer-gated via `requireStudyUser`,
  rate-limited 120/min, `student_id` always from the session (unspoofable).
- **Trap:** the route silently drops any event not in `CLIENT_TRACKABLE`
  (`src/lib/study/analytics.ts`) and still returns `200 { ok: true }`. A new
  client-fired event name that isn't added to both `StudyEvent` and
  `CLIENT_TRACKABLE` produces a green network call and no row. This is exactly the
  "fix a loud failure by making it quiet" shape in `CLAUDE.md`. **Mitigation: fire
  our events server-side** from the new route (§4.3), via `trackEvent()`, which
  bypasses `CLIENT_TRACKABLE` entirely.
- Table: `public.study_analytics_events` — `{ id, student_id, event, props jsonb, created_at }`.
  `event` is plain `text`; no CHECK constraint. Read by
  `admin_study_event_counts(p_start, p_end)` (migration 054) → `/api/admin/analytics`
  → `src/components/admin/analytics/AnalyticsDashboard.tsx`.
- `src/hooks/useAnalytics.ts` / `AnalyticsProvider` (GA4 + PostHog) are **inert** —
  auto page tracking is commented out after a 144k-requests/day incident. Ignore them.

### 1.5 Escalation path for unhappy users

`ChatWidget` (`src/components/ui/chat-widget.tsx`, opened via `?chat=open`, handled
in `src/app/(app)/layout.tsx:266-279`) exists — but **the study app is outside the
`(app)` route group, so it is not mounted there**. The only support affordance under
`/mobile/study/**` is a bare `support@classraum.com` string in `refund-policy/page.tsx:123`.

So there is nowhere to route an unhappy student today. That is why §4.2 adds a
feedback table rather than deep-linking to chat — it is the smaller build.

Adjacent: `study_question_reports` (migration 049) already captures "this question is
wrong" via `_shared/ReportQuestion.tsx`. Use it as a suppressor (§3).

### 1.6 i18n

The study surface does **not** use the locale files for body copy. 946 inline
`ko ? '…' : '…'` ternaries across 48 files vs 147 `t()` calls. The idiom is:

```ts
const { language } = useTranslation()   // src/hooks/useTranslation.ts
const ko = language === 'korean'        // Korean is the DEFAULT language
```

Leaf components take `ko: boolean` as a prop (`CreditConfirmSheet`,
`BankExhaustedSheet`). Match that. Do not add locale keys for this — it would be
the odd one out.

### 1.7 Capacitor

`capacitor.config.ts`: `appId: com.classraum.app`, remote `server.url`,
`allowNavigation: ['app.classraum.com', '*.classraum.com']`. `ios/` and `android/`
are both checked in, including `Pods/`.

**No in-app-review plugin is installed.** Twelve `@capacitor/*` plugins at `^6.x`,
zero `@capacitor-community/*`. Confirmed against `ios/App/Podfile` and
`android/capacitor.settings.gradle`, which list the same twelve.

No App Store or Play Store URL exists anywhere in the repo (grep for
`apps.apple.com`, `play.google.com`, `itms-apps`, `market://` → zero hits).

Plugin guard idiom (from `nativeHaptics.ts`): **static top-level import, runtime
`Capacitor.isNativePlatform()` branch, web fallback.** Never a dynamic import.

---

## 2. Platform review APIs — the real limits

Researched, not guessed.

### iOS

| Fact | Value |
|---|---|
| Frequency cap | **3 prompts per 365-day period, per user, per app.** Calls beyond that are silently ignored. |
| Callback | **None.** No way to know if the prompt appeared, whether the user rated, or what rating. |
| API today | `SKStoreReviewController.requestReview(in: scene)` — **deprecated in iOS 18**, replaced by `AppStore.requestReview(in:)` (iOS 18+) and SwiftUI's `@Environment(\.requestReview)` (iOS 16+). |
| Never shows | TestFlight builds. Also if the user has turned off in-app review requests in **Settings → App Store**. |
| Policy | Guideline 1.1.7: use the provided API; custom review prompts are disallowed. |

### Android

| Fact | Value |
|---|---|
| Frequency cap | Undisclosed. Docs: "a time-bound quota"; calling `launchReviewFlow` "more than once during a short period of time (for example, less than a month) might not always display a dialog"; "the specific value of the quota is an implementation detail, and it can be changed by Google Play without any notice." |
| Callback | The flow completes regardless of whether the card appeared or the user reviewed. No signal either way. |
| Policy | No pre-question (§0.1). No CTA button. Do not modify, overlay, or programmatically dismiss the card. |
| Requirement | Play Core ≥ 1.8.0. |

**The operative consequence:** we get roughly **2–3 real shots per user per year on
iOS and an unknown, roughly monthly-or-worse budget on Android, with zero feedback
on whether any of them landed.** Every trigger condition below exists to protect
those shots. Our own `store_review_requested` counter is a count of *attempts*, not
of *impressions* — never present it as the latter.

---

## 3. When to ask

Two independent triggers, deliberately never fired in the same session.

### 3.1 Where it fires

**On arrival at the `/mobile/study` landing**, after a qualifying event completed —
never mid-flow. Rationale: the study surface's own precedent
(`DailyGoalCelebration` defers while on `/mobile/study/session/`), and the result
screen is where students review their wrong answers, which is the worst possible
moment to interrupt.

A single global interruption budget: at most **one** of `{ NavTour,
DailyGoalCelebration, RatingPrompt }` per app launch, in that priority order. Ours
is last.

### 3.2 Sentiment card — eligibility (ALL must hold)

Signals, with where they come from:

| # | Condition | Source |
|---|---|---|
| 1 | `prefs.onboarded_at != null` | `study_user_prefs.onboarded_at`, already on `LandingData.prefs` |
| 2 | ≥ **7 days** since `study_user_prefs.created_at` | already in the `/api/study/landing` payload; `LandingDataProvider`'s `Prefs` interface just doesn't declare it — widen it, zero cost |
| 3 | ≥ **5** completed sessions lifetime | `count(study_sessions where student_id=… and status='completed' and archived=false)`. Client can query this directly with the anon client — `StudyStreakChip.tsx` and `session/[id]/summary/page.tsx` both already read `study_sessions` under RLS |
| 4 | `firstTestPending === false` (≥ 1 completed full test) | `LandingData.firstTestPending` |
| 5 | current `streak >= 3` **OR** daily goal met today (`progress.minutesToday >= progress.goalMinutes`) | `LandingData.streak`, `LandingData.progress` |
| 6 | `navTourSeenAt` older than 24h | `study_user_prefs.nav_tour_seen_at` |

Use the **server** streak (`LandingData.streak`, from `evaluateStreak` in
`src/lib/study/streak.ts`). Do not use `StudyStreakChip`'s number — that component
re-derives the streak client-side over a 60-day window and can disagree.

### 3.3 Sentiment card — suppressors (ANY blocks it)

| Suppressor | Signal | Window |
|---|---|---|
| Already answered | `rating_prompt_answer != null` | 180 days |
| Dismissed | `rating_prompt_last_shown_at` set with no answer | 30 days, and **stop permanently after 3 ignores** |
| Snoozed ("later") | `rating_prompt_snoozed_until` | until that date |
| Failed payment | `LandingData.subscriptionStatus === 'past_due'` | while true + 30 days |
| Ran out of credits | `out_of_credits` event / `NoCreditsSheet` shown | this session |
| Streak just lost | `priorLostStreak > 0` | 7 days |
| Bad recent test | most recent completed test `score < 60` | until a ≥60 test follows |
| Submit/network failure | `TestSession`'s `submitError` or `waitingForNetwork` | this session |
| Recent client error | new `localStorage['last-client-error-at']` (§4.5) | 24h |
| Reported a broken question | `study_question_reports` row for this student | 7 days |
| Not native | `!isNativeApp()` — see Open Question 6 | always |

`priorLostStreak` is computed by `evaluateStreak` and **returned by
`/api/study/landing`, but dropped by `LandingDataProvider`**. Widen the interface;
no route change needed. (Same for `readyTests` and `activeSession`, if useful later.)

`subscriptionStatus` gives us `'past_due'` but not the failure *reason* —
`study_subscriptions.last_payment_failure` exists on the table but the
`/api/study/subscription` GET does not select it. `'past_due'` alone is enough here.

### 3.4 Native store review — eligibility

Everything in §3.2 and §3.3, **plus**:

| # | Condition |
|---|---|
| 7 | `isNativeApp()` is true |
| 8 | Most recent `rating_prompt_answer === 'positive'` |
| 9 | ≥ **14 days** since `rating_prompt_answered_at` (the decoupling from §0.1) |
| 10 | ≥ **150 days** since `store_review_requested_at` |
| 11 | `store_review_request_count < 2` in the trailing 365 days (Apple allows 3; we spend 2 and keep one in reserve) |
| 12 | The qualifying event is a **good** one: most recent completed test at or above the emerald band, `scorePercent >= 80` |

Threshold 12 reuses an existing, already load-bearing number:
`TestResultView.tsx` bands at `>= 80` emerald + mascot `'celebrate'`, `>= 60` amber,
`< 60` rose. Reusing it beats inventing a new one — but it may be too rare in
practice. See Open Question 2.

Also: `TestResultView` exposes `scoreReady: boolean`, false while rubric grades are
still in flight. Any score-based decision must wait for `scoreReady === true`,
otherwise it reads a placeholder.

### 3.5 What is deliberately NOT a trigger

- **XP milestones** — there is no level system in this app. `study_xp_events` has a
  daily cap of 800 and `emitXp` tiers (`subtle`/`mid`/`big`), but no lifetime
  milestone concept. Streak milestones exist (`[2,3,7,14,30,50,100,200,365]` in
  `XpToast.tsx`) and already trigger their own celebration; stacking a rating prompt
  on top of a celebration doubles the interruption.
- **Days since install** — no install timestamp exists anywhere (no Capacitor
  install-date plugin). `study_user_prefs.created_at` is the honest proxy and is what
  §3.2 uses. Do not claim it measures install date.
- **Predicted-score improvement** — `/api/study/prediction` and `scoreTrend` exist,
  but `scoreTrend` is **Premium-gated** (`scoreTrendLocked`), so a trigger built on it
  would only fire for paying students. Skewed sample, bad idea.

---

## 4. What to build

### 4.1 Components

| File | What |
|---|---|
| `src/app/mobile/study/_shared/RatingPrompt.tsx` | Orchestrator. Mounted once in `src/app/mobile/layout.tsx` next to `<NavTour />`. Owns eligibility, suppression, the interruption budget, and both tiers. |
| — same file, tier 1 | Sentiment card. **A dismissible `StudyTodayCard`, not a modal.** A question is not a decision; a modal to ask "do you like us?" is exactly the annoyance we're avoiding. Uses `onDismiss` + `emitUndoable` per the house recipe. |
| — same file, tier 2 | Feedback sheet, shown only after tapping "별로예요". `ModalPortal` + `useSheetDrag`, `z-[120]/z-[121]`, `rounded-t-3xl`, cloned from `WeeklyQuestsButton.tsx`. A textarea + Send. Deliberate action, so a sheet is right. |
| — same file, tier 3 | `InAppReview.requestReview()`. **No UI of ours at all.** |
| `src/lib/study/rating-prompt.ts` | Pure eligibility predicate: `(state) => 'sentiment' \| 'store' \| null`. Pure so it can be unit-tested *and* replayed against production rows (§6.3). |

Tradeoff to accept consciously: a card can be scrolled past and never answered, so
it yields a weaker signal than a modal. That is the right trade — it costs us data,
not goodwill, and it cannot burn the OS quota. **Do not escalate to a modal after
N ignores.** Stop asking instead.

### 4.2 Storage — server-side, survives reinstall

**Decision: durable state lives in `study_user_prefs`, with a `localStorage` cache
as the fast path.** Exactly the `NavTour` pattern.

It must survive reinstall. Three reasons:
1. A student who reinstalls or moves phones should not be re-asked.
2. We cannot read the OS quota, so our own accounting is the only durable record of
   how many shots we have spent. A record that resets on reinstall is worse than none.
3. It lets us query server-side who said they were unhappy, and follow up.

`localStorage` alone is wrong: it resets on reinstall, and iOS evicts WebView storage
under pressure. It is a cache, not the truth.

**Migration `database/migrations/067_study_rating_prompt.sql`** (066 is the highest
today). Write the file — do not apply directly to remote, which is the mistake made
with `help_article_feedback`.

```
ALTER TABLE study_user_prefs
  ADD COLUMN rating_prompt_last_shown_at   timestamptz,
  ADD COLUMN rating_prompt_answer          text
    CHECK (rating_prompt_answer IN ('positive','negative')),
  ADD COLUMN rating_prompt_answered_at     timestamptz,
  ADD COLUMN rating_prompt_snoozed_until   timestamptz,
  ADD COLUMN rating_prompt_ignore_count    int NOT NULL DEFAULT 0,
  ADD COLUMN store_review_requested_at     timestamptz,
  ADD COLUMN store_review_request_count    int NOT NULL DEFAULT 0;

CREATE TABLE study_app_feedback (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  sentiment    text NOT NULL CHECK (sentiment IN ('positive','negative')),
  comment      text,
  platform     text,       -- 'ios' | 'android' | 'web'
  app_version  text,
  surface      text,       -- trigger that produced it
  created_at   timestamptz NOT NULL DEFAULT now()
);
-- RLS: insert own rows only; read restricted to service role.
```

Once the columns exist they reach the client **automatically** — both
`/api/study/prefs` (`select('*')`) and `/api/study/landing` (`select('*')`) already
select everything. The only client change is widening `LandingDataProvider`'s
narrowed `Prefs` interface.

`PUT /api/study/prefs` **strictly whitelists** keys in a `validators` map and
silently drops unknown ones. Adding the columns without adding validators produces a
200 with no write — another silent-wrong-number. Extend the map *and*
`src/app/api/study/__tests__/prefs-put.test.ts`.

### 4.3 API route

`POST /api/study/rating-prompt` — one route rather than reusing `prefs` PUT +
`track`, because we need the prefs write, the feedback row, and the analytics event
to be one call that cannot half-succeed.

```
body: { action: 'shown' | 'positive' | 'negative' | 'dismissed'
              | 'snoozed' | 'store_requested',
        comment?: string,          // ≤ 1000 chars, negative only
        trigger?: string,
        platform?: 'ios'|'android'|'web',
        app_version?: string }
```

Bearer-gated via `requireStudyUser` (`src/lib/study/auth.ts`). Rate-limit
`rating:user:<id>` at ~20/hour. Writes the prefs columns, inserts
`study_app_feedback` on `positive`/`negative`, and fires `trackEvent()` **server-side**
so `CLIENT_TRACKABLE` never applies.

`store_requested` increments `store_review_request_count` and stamps
`store_review_requested_at` — fired *before* calling the plugin, so a crash mid-call
still burns the budget rather than allowing an unbounded retry.

### 4.4 Capacitor plugin

`@capacitor-community/in-app-review`. Version matters:

| Plugin | peer `@capacitor/core` |
|---|---|
| **6.0.0** | `^6.0.0` ← **pin this** |
| 7.x | `>=7.0.0` |
| 8.0.0 (latest) | `>=8.0.0` |

The repo is on Capacitor `^6.2.1`, so **`@capacitor-community/in-app-review@6.0.0`**.
Installing `latest` would silently mismatch peers.

API is a single method: `requestReview() => Promise<void>`. Wrap it in
`src/lib/nativeApp.ts` (or a sibling `nativeReview.ts`) following the
`nativeHaptics.ts` idiom — static import, `isNativePlatform()` branch, no-op on web.

**The promise resolving is not evidence the sheet appeared.** It resolves either
way; TestFlight never shows it; the user may have disabled prompts in Settings.

Requires `npm run cap:sync` and a new store binary (§0.2).

### 4.5 Crash suppressor (small, new)

Nothing today tells the client a crash just happened. `MobileErrorBoundary`
(`src/app/mobile/layout.tsx:173`) reports to Sentry and keeps state locally;
`sentry.client.config.ts` no-ops without `NEXT_PUBLIC_SENTRY_DSN`.

Cheapest honest implementation: a side-effect in `sentry.client.config.ts`'s
`beforeSend` writing `localStorage['last-client-error-at'] = Date.now()`, plus the
same write in `reportBoundaryError`. Suppress the prompt for 24h after. Keep the
write outside Sentry's PII path — it stores a timestamp only.

### 4.6 Store fallback link (separate from the prompt)

For a passive "Rate Classraum" row in study preferences — permitted by both stores
(Google explicitly recommends a Play Store redirect instead of a CTA that calls the
API), and it must **not** call `requestReview()`.

- Android: `https://play.google.com/store/apps/details?id=com.classraum.app` — works today.
- iOS: needs the numeric App Store ID, which is **not in the repo**. See Open Question 1.

Use `openExternalUrl()` from `src/lib/nativeApp.ts` — its docblock warns that
`server.allowNavigation` makes plain hrefs to classraum domains load in place, and
Android discards `target="_blank"`.

---

## 5. Copy

`ko: boolean` prop, inline ternaries, polite `-요` (not 반말 — it is a school app and
students are addressed politely everywhere else in this codebase).

### Tier 1 — sentiment card

| | English | Korean |
|---|---|---|
| Title | How's Classraum going? | 클래스라움 어때요? |
| Body | One tap and we're done. We won't ask again. | 한 번만 눌러주면 끝이에요. 다시 안 물어볼게요. |
| Positive | Loving it | 좋아요 |
| Negative | Not great | 별로예요 |
| Dismiss (`dismissLabel`) | Later | 나중에 |

### Tier 2 — feedback sheet (negative only)

| | English | Korean |
|---|---|---|
| Title | What would make it better? | 뭐가 아쉬웠어요? |
| Body | Tell us what's not working — a real person reads these. | 불편했던 점 알려주면 바로 고칠게요. 사람이 직접 읽어요. |
| Placeholder | Anything at all — a bug, a wrong question, something confusing. | 버그, 이상한 문제, 헷갈렸던 거 아무거나요. |
| Send | Send | 보내기 |
| Sending | Sending… | 보내는 중… |
| Skip | Skip | 다음에 |
| Done | Got it — thanks. We'll take a look. | 고마워요. 확인하고 고칠게요. |
| Error | Couldn't send. Try again. | 전송 실패. 다시 시도해주세요. |

### Tier 1 — positive acknowledgement

Shown immediately on "좋아요". **No store request here** (§0.1).

| | English | Korean |
|---|---|---|
| Done | Nice — thanks. That's all we needed. | 고마워요! 그거면 충분해요. |

### Tier 3 — native review

No copy. Apple and Google own that surface; modifying or overlaying it is a policy
violation on Android.

Korean notes: `어때요?` / `좋아요` / `별로예요` are how a Korean teenager actually
answers this — `만족하십니까?` or `평가해 주세요` would read as a corporate survey.
`뭐가 아쉬웠어요?` is softer than `무엇이 문제였습니까?` and invites a real answer.
Avoid `앱스토어에 리뷰를 남겨주세요` anywhere — begging for a store review in our own
copy is the thing both stores prohibit.

---

## 6. Measurement

### 6.1 Events (all fired server-side from `/api/study/rating-prompt` via `trackEvent`)

| Event | Props |
|---|---|
| `rating_prompt_shown` | `trigger`, `sessions_completed`, `streak`, `days_since_signup`, `last_score`, `platform`, `app_version` |
| `rating_prompt_answered` | `sentiment`, plus the same context |
| `rating_prompt_dismissed` | `ignore_count` |
| `rating_prompt_snoozed` | `snooze_days` |
| `rating_feedback_submitted` | `comment_length` (never the comment body) |
| `store_review_requested` | `platform`, `app_version`, `request_count` |

Add each to the `StudyEvent` union in `src/lib/study/analytics.ts`. They do **not**
go in `CLIENT_TRACKABLE` — client calls should be rejected; these are server-only.

### 6.2 Does it help, or annoy?

Counting `rating_prompt_shown` tells us nothing about annoyance. The only honest
instrument is a **holdout**: 10% of eligible students, keyed off a stable hash of
`student_id`, become eligible and are never shown anything. Compare, prompted vs
holdout:

- next-session-within-48h rate
- 7-day and 28-day retention
- sessions in the following 7 days
- support / question-report rate

Store outcomes (rating average, review count) can only be read manually from App
Store Connect and Play Console. `store_review_requested` counts **attempts**, and
the ratio of attempts to actual reviews is unknowable from the client (§2). Do not
build a dashboard tile that implies otherwise.

### 6.3 Verification — how we would know the trigger logic is wrong

Per `CLAUDE.md`: a unit test over mock state passes whether or not the thresholds
are sane. Before shipping, write
`scripts/verify-rating-prompt-eligibility.ts` — run the pure predicate from
§4.1 against **real** `study_user_prefs` / `study_sessions` / `study_subscriptions`
rows and print:

- how many students are eligible today, and what fraction of active students that is
- the distribution of their streak, session count, days-since-signup, last score
- how many are blocked, by which suppressor

If it prints 0 eligible, or ~100% eligible, the thresholds are wrong and no unit
test would have said so. Beware PostgREST's 1000-row default cap — page explicitly.

Then attack the check: flip one suppressor off and confirm the count moves. A
suppressor that changes nothing when removed is not doing anything.

---

## 7. Phasing

1. **Phase 1 (web deploy only, no store release).** Migration 067, prefs validators,
   `/api/study/rating-prompt`, `RatingPrompt.tsx` tiers 1–2, the crash-timestamp
   write, events, holdout, `verify-rating-prompt-eligibility.ts`. Ships in a normal
   Vercel deploy because of `server.url` (§0.2).
2. **Phase 2 (after ≥2 weeks of sentiment data).** Only if the positive rate
   justifies it: add `@capacitor-community/in-app-review@6.0.0`, tier 3, bump to
   `versionCode 5` / `1.0.4`, ship both binaries. Verify on a real device — it will
   not appear in TestFlight.
3. **Phase 3.** Passive store link in study preferences (needs Open Question 1).

---

## 8. Risks, and what I would not do

1. **Would not chain sentiment → native sheet in one interaction.** Play policy,
   quoted verbatim in §0.1. This is the single biggest departure from the brief.
2. **Would not add a "Rate us" button that calls the API.** Google: it "presents a
   broken experience" once quota is hit; Apple gives no callback so we cannot even
   detect it. A plain store *link* is fine and is a different thing.
3. **Would not fire during a test, during grading (`scoreReady === false`), or on
   the result screen.** The result screen is for reviewing wrong answers.
4. **Would not incentivize with XP, credits, or streak freezes.** Both stores
   prohibit it, and it poisons the signal. This app has spendable currency, so the
   temptation is real and someone will propose it.
5. **Would not store state only in `localStorage`.** §4.2.
6. **Would not treat `requestReview()` resolving as evidence of anything.** §2, §4.4.
7. **Would not spend all 3 iOS prompts.** Cap at 2 per 365 days; keep one in reserve
   for a future moment we cannot foresee.
8. **Would not install the plugin at `latest`.** 8.0.0 peers `@capacitor/core >=8`;
   this repo is on 6. Pin `6.0.0`.
9. **Would not collect free text without thinking about minors.** The users are
   Korean middle/high schoolers. Do not ask for contact details in the textarea,
   cap it at 1000 chars, never log the body into analytics props (only
   `comment_length`), and follow the existing `sendDefaultPii: false` posture in
   `sentry.client.config.ts`. Korean PIPA treatment of under-14 data needs a real
   answer before launch — Open Question 4.
10. **Would not apply the schema directly to remote Supabase.** That is how
    `help_article_feedback` ended up with no migration file.
11. **Would not use `StudyStreakChip`'s client-derived streak** for eligibility;
    it can disagree with the server's `evaluateStreak`.
12. **Would not ship the sentiment card and the native request in the same release**
    even if the binary allowed it — the sentiment distribution is the input that
    decides whether tier 3 is worth a store cycle at all.

Residual risk worth naming: §0.1's decoupling is a *good-faith* reading of the Play
rule, not a certainty. If we want zero policy risk on Android, the strictly safe
design is to fire `requestReview()` on the §3.2/§3.3 conditions with **no sentiment
input at all**, and run the sentiment card purely as a product-feedback instrument
that never influences the store request. That option costs us nothing except a lower
expected star average. It is a real choice, not a formality — Open Question 7.

---

## 9. Open questions

1. **What is the numeric App Store ID for `com.classraum.app`?** Not in the repo.
   Needed for the iOS fallback link (§4.6). (Also: `public/.well-known/apple-app-site-association`
   still contains the literal placeholder `TEAM_ID.com.classraum.app`, so universal
   links are non-functional — unrelated, but someone should fix it.)
2. **Score threshold for the native trigger: `>= 80` or `>= 70`?** 80 reuses the
   existing emerald/celebrate band but may be rare enough to make the trigger never
   fire. `verify-rating-prompt-eligibility.ts` (§6.3) should decide this with real
   score distributions before we pick.
3. **Do we re-ask students who answered "별로예요"?** Proposed default: re-ask
   sentiment after 180 days, but never request the native review for anyone whose
   most recent answer was negative. Is 180 right?
4. **Minors and free-text feedback.** Do our current terms and PIPA posture permit
   collecting free-text feedback from under-14 students without guardian consent?
   Needs a real answer, not a guess.
5. **Do we accept a 10% never-prompted holdout?** Without it we cannot answer "does
   this annoy people," only "how many answered."
6. **Web:** should the sentiment card show on the web study surface too? It cannot
   lead anywhere store-wise, but it is our only feedback channel and the web surface
   has none. Proposed: yes for tier 1–2, never tier 3.
7. **Android policy stance:** decoupled gating (§0.1) or strictly ungated (§8
   residual risk)? This is a business-risk call, not an engineering one.
8. **Parents and teachers** use `/mobile` and `/dashboard` and are the people who
   actually pay. They are arguably better reviewers than students. Out of scope
   here, but should it be?
