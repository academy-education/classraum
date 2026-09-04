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
- 20 cron jobs in `vercel.json`. They are enumerated in `JOB_REGISTRY`
  (`src/lib/ops/jobs.ts`) and a test fails if the two disagree, so that
  list is the source of truth — not this file.
- **Recurring student invoicing was scheduled on 2026-08-20**
  (`/api/cron/recurring-payments`, `35 0 * * *` = 09:35 KST) after being
  dark since "Remove cron jobs from vercel.json - may require paid plan".
  Two things had to be fixed first, and both are the interesting part:

  1. **You cannot just switch it on.** The generate route invoices ONE
     period per run and then advances `next_due_date`. All 19 active
     templates were overdue — the oldest since 2025-01-13 — so a daily
     cron would have emitted a back-dated invoice per template per day
     for weeks, to real parents at HERALD and Daniel Kim's Hagwon. Every
     template was rolled forward to its next FUTURE occurrence first
     (`scripts/roll-forward-recurring-templates.ts`, snapshot table
     `recurring_template_next_due_snapshot_20260820`). **Any future
     re-enable of a period-advancing job must do the same audit: query
     how far behind the state is before trusting the schedule.**
  2. **`semesterly` was never implemented.** `calculateNextDueDate`
     handled `monthly` and `weekly` and then fell through to
     `return template.next_due_date` — the value it was asked to advance
     past. `semester_months` had been in the schema the whole time and
     was ignored. Under a live cron that template would have stayed
     permanently due and re-invoiced every single day.

  The function now lives in `src/lib/payments/recurrence.ts`, not
  privately in the route, precisely so the roll-forward could call the
  same code rather than a reimplementation that drifts by a day.
  `src/lib/__tests__/recurrence.test.ts` covers all three types plus the
  boundary cases; every branch was mutation-tested.

  The generate route's insert was also broken from Sept 2025 until
  2026-07-27 (it omitted the NOT NULL `academy_id` and `invoice_name`),
  so restoring the schedule before that fix would have produced nothing.

### Development Auth Flow
The AuthWrapper component includes dev auth detection - ensure dev auth is disabled in production environments.

### State Management
- **Zustand** stores in `src/stores/` for client state
- **React Query** for server state management
- Context providers for language and command palette functionality

## Before stating any bank fact, run bank-state.mjs

    node scripts/study-bank/bank-state.mjs [counts|sittings|open|held|all]

On 2026-09-04 the same class of error happened three times in one session,
each time from a fresh ad-hoc query against `study_item_bank` /
`study_item_reviews` with a plausible-looking column picked by name:

- "SAT R&W has never had a human blind sitting" — false, and sourced to
  nothing but my own earlier sentence. `b2-all-cohorts-2026-08-15` is
  `reviewer_kind='human'`, 80 SAT items at 26.3%.
- "the co-founder has six open runs blocking the draw" — false; I counted
  null `blind_pick`, the guard uses `blind_at`. He had one.
- a 20/20 read as a person scoring full marks — it is `model_assisted`.

The columns do not mean what their names suggest, so read them from the
one script rather than re-deriving them:

    verified=false  row exists, assembler IGNORES it (staged)
    blind_at        reviewer SAW it - this is what "open run" means
    blind_pick      their letter; can be null while blind_at is set
    key_slot        score blind_pick against THIS, not the item
    reviewer_kind   'human' | 'model_assisted' - a model run is NOT a sitting

Three states are distinct and are printed separately: **staged** (in the
bank, assembler ignores), **drawable** (assembler serves), and
**reachable** (the subtopic is not hidden and the topic is not locked —
ACT Science is 120 drawable items no student can open). And never map a
bank row by `prompt`: making C&S stems positional gave 8 of 18 rows in one
cohort the identical prompt, and a prompt-keyed lookup silently returned a
sibling's row the same day. Key on prompt+passage.

## Form capacity is not total / form size

    node scripts/study-bank/form-capacity.mjs

A form is drawn to per-domain quotas, so the binding constraint is the
THINNEST domain, not the total. SAT R&W holds 1,009 items at 54 per form
— 18 by division, 15 once domains are respected, and **2** for a strong
student, because module 2 on the hard route wants ~7 Standard English
Conventions hard items and the bank holds 20. Quote the route-aware
number when the question is "how many tests can a student take".

The script deliberately does NOT model passage cohesion (ACT and TOEFL
draw whole passages), the easy/medium route, or exposure already
recorded, and it says so — all three would push the number up.

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

### The bank register is the one list

`scripts/study-bank/REGISTER.md` holds every outstanding item on the
question bank: cohort-by-cohort state, open work split by who is
blocked, and what is already settled so it does not get redone.

**When a fix uncovers something new, append it to §5 of that file in the
SAME commit as the fix.** A finding recorded only in a commit message is
a finding nobody reads — this session generated a dozen of them faster
than they could be absorbed, which is how "three small data defects"
turned out to be one 36-item problem, one disagreement with the
reviewer, and one non-issue that nobody had reconciled.

### Corollary: measure the population before believing the backlog

A task read "SAT Math derivational hub CONFIRMED bank-wide (64.4%)" and
sat there long enough to be treated as settled. On 2026-08-06 it was
measured for the first time:

    the 90 already repaired, BEFORE   98.3%   control 25.0%
    the other 730, untouched           8.0%   control  6.3%

The defect was catastrophic in one authoring cohort and essentially
absent everywhere else. "Bank-wide" described a sample drawn from the
affected cohort. Acting on the backlog entry would have rewritten ~690
sound items — an expensive, plausible, entirely wasted programme, and
the rewrite itself would have been the risk, since every touched item is
a chance to introduce a new tell.

The measurement cost one script and no model calls, because this
particular defect is arithmetic and therefore decidable. That is the
tell to look for: **when a defect can be checked exactly, check the
whole population rather than sampling it, and do that before believing
any number attached to it — including your own from last week.**

Two errors were made while building that checker and both pushed the
same way, toward condemning more of the bank:

- a `+1` between consecutive integers counted as a derivational
  relation, so `12, 13, 17, 19` read as a hub. Caught by a self-test
  fixture, not by the bank.
- a conditional rate (68.2%, over items that still had structure) was
  compared against a population rate (23.6%) and reported as a
  validation failure. Different denominators, not a contradiction.

Both were caught because the checker was run against data whose answer
was already known. A detector that cannot reproduce a known number on
known data has no business being pointed at unknown data.

### Corollary: every structural proxy has been too coarse

Five have now been built to catch "the answer is guessable without the
source", each aimed at the tell that had just been found:

    key letter spread          the key sat in slot A 73% of the time
    key length rank            the key was longest in 74.3%
    punctuation asymmetry      semicolons appeared only in keys
    concessive-pivot rate      94.4% of stimuli shared one shape
    option-family balance      the key's speech act was unique in its set

Every one caught its own tell. Not one caught the next. The fifth was
measured against three batches with known blind margins spanning +14.6
to +40.4 and predicted a 2.7-point spread — it does not work, and the
negative is recorded in `scripts/study-bank/OPTION-BALANCE-RESULT.md`
so nobody builds a sixth.

The reason is consistent: the tells that decide these batches are
SEMANTIC and item-specific, and a cheap proxy for them does not exist.
The blind attack — three solvers reading the actual option text — is
the only instrument that has ranked batches correctly, and it costs a
handful of agents per batch.

So: **the attack is the gate. The structural checks are pre-flight.**
Keep them, because each is nearly free and `render-crv3.mjs` did catch a
real typographic tell an author had spotted by hand. Never let one stand
in for the attack, and never report a batch as clean because the cheap
checks passed.

One exception, and it proves the rule: where a defect is arithmetic
rather than semantic (the SAT Math hub), an exact checker over the whole
population beats any sampling attack. Ask which kind you have before
choosing an instrument.
