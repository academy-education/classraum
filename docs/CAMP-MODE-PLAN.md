# Camp mode — plan + integration map

Decisions (Andy, 2026-08-15): same item set for the whole class per
assignment; quota counts PER ASSIGNMENT (not × students), student_cap
separate; students get teacher assignments + mock tests for the camp's
test family with no personal subscription; billing manual (we set quota
when the school pays, one-time).

Phases: P1 pipe (schema ✓ 081, builder, delivery) → P2 teacher
SAT/TOEFL dashboard → P3 in-class review mode → P4 camp reports to
parents (family link, then Kakao/email). Tasks #319–#324.

## Integration map (verified 2026-08-15)

- **Identity bridge**: `study_*.student_id` IS the auth uid IS
  `classroom_students.student_id`. No mapping needed.
- **Classrooms**: `classrooms` (single `teacher_id`, no teacher join
  table), `classroom_students` carries BOTH `student_id` (auth) and
  `student_record_id` (students.id) — write both. Create flow:
  `src/components/ui/classrooms-page.tsx:651+`; thin route wrapper
  pattern at `src/app/(app)/classrooms/page.tsx`.
- **Academy assignments** (for the sibling UI): `assignments` keys to
  `classroom_session_id`, fan-out `assignment_grades` per student —
  `src/components/ui/assignments-page.tsx:426-500`. Camp assignments
  deliberately do NOT reuse this; they key to classroom + program.
- **Study sessions from a fixed draw**: canonical creator
  `src/app/api/study/test/assemble/route.ts` — session row
  (`mode:'full_test'`, `config` free-form) + ONE `study_messages` row
  `content = '[full-test-v1]' + JSON payload` (cache is authoritative;
  submit reads it at `test/submit/route.ts:170-210`). Daily challenge
  tags `config` and queries `.contains('config', {...})` for
  idempotency — camp sessions tag `config.campAssignmentId` the same
  way. NO explicit-item_id assembler exists yet: add
  `assembleFromItemIds(itemIds, seed)` to `src/lib/study/assemble.ts`
  (`.in('id', itemIds)`, keep caller order, reuse
  `shuffleDrawnChoices` + exposure recording), plus a thin
  `POST /api/study/camp/start` modeled on assemble/route.ts, skipping
  the coverage gate and credit reserve (as pathNode sessions do at
  `assemble/route.ts:215`).
- **Student shelf**: study landing `src/app/mobile/study/page.tsx`
  shelf region :590-640; batched endpoint
  `src/app/api/study/landing/route.ts` (`Promise.all` :67-139, JSON
  :179); client `LandingDataProvider.tsx`. Shelf component templates:
  `MistakeBankShelf.tsx` / `ResumableShelf.tsx` (self-hides when empty).
- **Entitlements**: `src/lib/study/entitlements.ts` —
  `grantTestEntitlement({studentId, test, expiresAt, source:'camp'})`
  on enrollment gates mock tests via existing `canAccessTest`. CAUTION:
  zero entitlement rows = free user sees ALL tests; adding a camp row
  NARROWS them — if that matters, branch on `source` in
  `resolveAccess` (:93-105).
- **Auth**: study routes use `requireStudyUser(req)`
  (`src/lib/study/auth.ts`); academy client queries filter
  `.eq('academy_id', …)` and RLS mirrors it (pattern:
  `database/migrations/010_create_schedule_breaks.sql:27-60`).
- **Migrations**: live in `database/migrations` (NOT supabase/ — and
  `src/database/migrations` is a stale 4-file set, ignore). 081 applied
  2026-08-15 (file + remote in sync). `study_*` tables have no CREATE
  in this dir — `src/lib/database.types.ts` is their schema source of
  truth; regenerate types after 081.

## P5 additions (2026-08-17): multi-program, overview, drill-down

- `/api/camp/program` returns ALL active programs (`programs:
  [{program, classrooms}]`, created_at asc); legacy `program`/
  `classrooms` keys = the newest. CampPage shows underline tabs
  (payments idiom) only when >1 program.
- `GET /api/camp/overview?programId=` — 4-stat strip (enrolled vs cap,
  done/expected completion, avg session score, skills <70% with n>=5).
  Built on `loadClassroomCampData` per classroom, so it agrees with the
  dashboard/report numbers by construction and inherits the review-set
  exclusion.
- `GET /api/camp/student?classroomId=&studentId=` — LIVE per-student
  payload from the same `buildCampReportPayload` the report snapshot
  uses (one implementation, verified byte-equal modulo jsonb key order
  in camp-overview-verify V15), plus `lastActivity`. UI:
  `CampStudentDetail.tsx`, opened from the roster table.
- Verifier: `scripts/camp-overview-verify.mjs` (17 checks; seeds a
  second toefl program per run into the E2E academy).
