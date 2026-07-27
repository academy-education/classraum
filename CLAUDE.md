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
