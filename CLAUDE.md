# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Classraum is a comprehensive academy management platform for teachers, students, and parents built with Next.js 15 and the App Router. The application features role-based access control, multi-language support (English/Korean), and uses Supabase for backend services.

## Development Commands

### Core Commands
- `npm run dev` - Start development server (http://localhost:3000)
- `npm run build` - Production build (includes client manifest fix script)
- `npm run build:fix` - Alternative build command with dev server pre-warming
- `npm start` - Start production server
- `npm run lint` - Run ESLint

### Build System Notes
The build process includes a post-build script (`scripts/fix-client-manifest.js`) that generates missing client reference manifest files for the `(app)` route group. This resolves deployment issues with Next.js 15 and Vercel.

## Architecture Overview

### Domain/Subdomain Strategy
The application uses subdomain routing handled by middleware (`src/middleware.ts`):
- **Main domain**: Marketing pages (landing, pricing, about, etc.)
- **App subdomain** (`app.domain.com`): Protected application routes
- Root path on app subdomain redirects to `/dashboard` which handles role-based routing

### Authentication & Role-Based Routing
- **Supabase Auth** with role-based access control
- **AuthWrapper** component (`src/components/ui/auth-wrapper.tsx`) handles authentication state
- **Role-based redirection**:
  - Students/Parents → `/mobile` interface
  - Managers/Teachers → `/dashboard` interface
  - Unauthenticated → `/auth` page

### Next.js App Router Structure
```
src/app/
├── (app)/              # Route group for authenticated pages
│   ├── dashboard/      # Manager/Teacher interface
│   ├── mobile/         # Student/Parent interface  
│   ├── layout.tsx      # App layout with sidebar/navigation
│   └── page.tsx        # Auth check + role routing
├── auth/               # Authentication pages
├── api/                # API routes
└── page.tsx           # Landing page
```

### Key Technologies
- **Next.js 15** with App Router
- **Supabase** for authentication and database
- **Tailwind CSS 4** for styling
- **Radix UI** components
- **Zustand** for state management
- **React Query** for server state
- **GSAP** for animations
- **TypeScript** throughout

### Multi-language Support
- **LanguageProvider** context for i18n
- Translations stored in `src/locales/`
- Language switcher available on auth page

### Middleware Configuration
Protected routes are defined in `src/middleware.ts`:
- Handles subdomain routing logic
- Redirects based on authentication state
- Separates marketing and application domains

### Database Integration
- **Supabase client** configured in `src/lib/supabase.ts`
- User roles stored in `users` table
- Manager-specific data in `managers` table
- MCP server integration for database operations

## Development Considerations

### Client Component Manifests
The build process requires special handling for route groups with client components. If encountering build issues with missing `page_client-reference-manifest.js`, the post-build script should resolve this automatically.

### Environment Setup
- Node.js ≥18.17.0 required
- Supabase project configuration needed in environment variables
- Korean font (Noto Sans KR) loaded for internationalization

### Deployment (Vercel)
- Custom build command in `vercel.json`
- Function timeouts configured for API routes
- ICN1 region deployment
- 19 cron jobs in `vercel.json`. They are enumerated in `JOB_REGISTRY`
  (`src/lib/ops/jobs.ts`) and a test fails if the two disagree, so that
  list is the source of truth — not this file.
- **Recurring student invoicing is NOT scheduled.** `/api/cron/recurring-payments`
  and `/api/payments/recurring/generate` exist but neither is in
  `vercel.json`; the cron was dropped by "Remove cron jobs from
  vercel.json - may require paid plan" and never restored. This file
  claimed it was configured, which was wrong. Invoices are currently
  created through the payments UI instead. The generate route's insert
  was also broken from Sept 2025 until 2026-07-27 (it omitted the
  NOT NULL `academy_id` and `invoice_name`), so restoring the schedule
  before that fix would have produced nothing.

### Development Auth Flow
The AuthWrapper component includes dev auth detection - ensure dev auth is disabled in production environments.

### State Management
- **Zustand** stores in `src/stores/` for client state
- **React Query** for server state management
- Context providers for language and command palette functionality

## Verification standard: break the check

A passing check is evidence only if it would have failed. On 2026-07-28 three
checks reported success for reasons unrelated to what they tested:

- a submit test stayed green after the scoring rule it covered was deleted —
  the assertion never exercised that path
- a blind grade returned 175/175 "solved to key" because the key sat in slot
  A on 163 of 175 items; the graders were reading position, not content
- a verifier reported "0 problems" while reading a bank truncated at 1000
  rows by PostgREST, so the rows containing the defect were never loaded

None was caught by reading the green. Each was caught by attacking the check.

So, before treating a check as evidence:

1. **Revert the fix and confirm the check fails.** Not the whole feature —
   the specific mechanism. If several mechanisms combine, revert each
   separately; a test that only fails when all of them are gone does not tell
   you which one matters.
2. **Ask what the check would miss.** A green test over truncated input, a
   grader reading a formatting tell, an assertion on a value the code no
   longer produces — all pass loudly.
3. **Check the count, not just the colour.** A jest suite that dies at import
   collects zero tests and still prints the other suites' passes. `Tests: 7
   passed` next to `Suites: 1 failed` is a failure.
4. **Verify against real data before believing a unit test.** Twice in one day
   the unit tests passed while the live bank was wrong — quota arithmetic that
   could not be satisfied by real set sizes, and a draw that silently came up
   short. `scripts/verify-*.ts` exist for this; run them.

Applies to any check: tests, model graders, SQL audits, scripts.

### Corollary: a batch built to one brief develops a cross-item tell

Three distinct positional/structural tells have now reached the bank, each
invisible to the check that was watching for the previous one:

1. **Key in slot A** on 73% of a hand-authored cohort. Caught by a grader's
   remark. Fixed by shuffling; `verify-answer-key-spread.ts` now guards it.
2. **Every 4-question set a complete ABCD permutation** (78% of one cohort).
   The per-cohort histogram read as a perfect 25/25/25/25 while three
   confident answers forced the fourth. Guarded by the same script's
   per-group check.
3. **Identical key PROSE across lectures.** 32 items authored to a rigid
   brief put the same option wording — "the lecturer is committed; the named
   critic neither way" — as the key in all 8 lectures. Letters were rotated,
   so both letter checks passed. A candidate who solves one answers eight
   without listening.

The third has no automated guard, because the tell is semantic. The lesson
is about the brief, not the checker: **the more rigid the authoring spec,
the more the answer becomes predictable from the spec rather than the
content.** When commissioning a batch, require the load-bearing element to
VARY across items — let different parties be the committed one, let the
survivor sometimes be the critic's narrowed claim — and ask a grader
explicitly whether the answer is guessable from the pattern across items,
not only within one.

Related: `verify-answer-key-spread.ts` gates on a minimum cohort size. A
14-item cohort at 50%-on-one-slot passed that gate once. Small cohorts are
not safe cohorts.

### Corollary: a convention from one skill silently applies to the other

TOEFL Speaking and Writing have SEPARATE official ETS scoring guides that
do not agree with each other, and on 2026-07-29 we shipped three bugs of
one shape — a Writing convention applied to Speaking:

1. **Zero conditions.** Writing's 0 lists "rejects the topic" and
   "entirely copied from the prompt"; Speaking's lists neither, and its
   score-2 descriptor explicitly reads "consists mainly of language from
   the question". A copied spoken answer is a 2 on the real exam and was
   a 0 in ours.
2. **The band rule.** Writing bands 2 and 1 read "exhibits ONE OR MORE of
   the following"; Speaking uses "a typical response exhibits the
   following" at every band. Under the imported one-or-more reading a
   single weak feature dropped a response two bands.
3. **The timed-conditions allowance.** Writing band 5 forgives "errors
   expected from a competent writer writing under timed conditions". We
   had dropped the clause entirely — from both skills.

All three were invisible to the whole test suite and were found by
reading the published PDFs (`pdftotext -layout` handles them; WebFetch
does not). Before trusting any rubric text, diff it against the source
for THAT skill. `rubric-fidelity.test.ts` now pins the divergences.

### Corollary: fixing a loud failure by making it quiet is a regression

Twice in one session a visible error was "fixed" into a silent wrong
number:

- `generateObject` threw when the model omitted `topic_relevance`, so the
  key was made required. The model, told elsewhere not to judge
  relevance, complied with `score 0, evidence "N/A"` — and the ceiling
  min()'d that to 0. A 502 became an on-topic answer scored zero.
- The band came from a hand-written ladder while the 0-30 row came from
  `percent x 30`. Each was internally consistent; together they printed
  "band 3.0" beside "13 / 30".

When a schema error, a 502 or a crash is the symptom, check whether the
fix removes the CAUSE or just the message. A test asserting the old
behaviour would have passed in both cases, which is why neither was
caught by 594 green tests.

### The grader is not calibrated, and cannot be from public data

`scripts/calibrate-grader.ts` grades ETS's own published samples through
the production stage callbacks. As of 2026-07-29 it FAILS: a published 5
scores 3, a published 4 scores 3 — harsh on both, mean -1.5 bands.
Descriptor fidelity is no longer the explanation; all four rubrics now
match the official guides and the numbers did not move.

Only two scored samples for our task types are public (Academic
Discussion, Writing Practice Set 4). Do NOT tune prompts against them:
two items cannot support fitting, and few-shot anchoring on them means
the grader has seen the whole test set. Fixing this needs TPO/TestReady
exemplars or students self-reporting real TOEFL bands.

Until then, do not fold rubric marks into the section band — it would
push every Speaking and Writing score down by that same margin.

### Corollary: "idempotent" that is a read followed by a write is not

A live TOEFL Writing run on 2026-07-29 produced FOUR submission rows for
two essays, and the same discussion essay came back band 4 from one call
and band 3 from the other. The result screen read whichever row it
fetched first, so the reported score was a coin toss — and we paid for
both tosses.

Two callers fired on submit: `grade-batch`, and an older per-question
loop in TestSession that was never removed when the batch was added.
The loop's comment said "server-side idempotency (same session+prompt)
makes duplicates harmless". That dedupe is a SELECT followed by an
INSERT with nothing between them. Fired ~1.5s apart, both SELECTs miss
and both INSERT. The comment had never been tested with two callers,
because until the batch landed there was only ever one.

Two lessons, and the second is the load-bearing one:

1. When you add a batch path, delete the per-item path it replaces —
   or state why it must stay (here: audio-native Speaking grading, which
   the batch cannot do). One writer per item.
2. **A comment asserting an invariant is not evidence the invariant
   holds.** Grep for the claim, then construct the concurrent case. If
   the dedupe must survive real races it needs a unique index, not a
   prior read.

Same run, second finding, recorded because the OBVIOUS explanation was
wrong: the grader was being sent only `question.prompt` — 70 characters
of bare instruction — while the situation, the email being replied to,
and the bulleted requirements all live in `question.passage` and were
never sent. That looks exactly like the cause of the "harsh grader", and
it is not. Ten trials (5 with the passage, 5 without) moved the band by
zero. The harshness in that run came entirely from the duplicate call;
with one writer the same two essays scored 5 and 4, not 3 and 3. The
passage is now passed because a grader should see the task it scores —
not because it changed a number. Do not credit it with one.
