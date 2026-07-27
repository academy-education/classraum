/**
 * Compile-time proof that the typed client catches the 2026-07-27 bugs.
 *
 * There is no test runner here on purpose — `tsc` IS the assertion.
 * Each `@ts-expect-error` below fails the build if the line it guards
 * ever STOPS being an error, so this file breaks loudly if someone
 * loosens the client's typing or regenerates database.types.ts against
 * a schema where these columns exist.
 *
 * Every one of these shipped to production and was found by hand:
 *
 *   academy_subscriptions.plan_name  admin Recent Activity, 500 on load
 *   users.academy_id                 every subscription endpoint denied
 *   teachers.id                      sessions teacher picker always empty
 *   assignments.status               mobile assignment list always empty
 *   student_payments (table)         academy revenue always ₩0
 *
 * PostgREST answers an unknown column with an error and no rows, and the
 * callers fell back to [] or 0 — so each one rendered a plausible empty
 * state instead of failing. Under the typed client they are build
 * errors, which is the entire point of the migration this file anchors.
 */
import { dbAdmin } from '../supabase-admin'

export async function schemaMistakesMustNotCompile() {
  // NOTE ON PLACEMENT: `.select('bogus')` itself compiles. supabase-js
  // resolves it to
  //   SelectQueryError<"column 'plan_name' does not exist on 'academy_subscriptions'.">
  // and the error only lands when the row is READ. So these assertions
  // sit on the read, which is also how real code fails — the query is
  // written once and the data is used somewhere else entirely.

  const subs = await dbAdmin.from('academy_subscriptions').select('id, plan_name')
  // @ts-expect-error - the column is plan_tier
  subs.data?.[0]?.plan_name

  // users.role is only a default-surface pointer; the academy lives in
  // the managers/teachers/students join tables.
  const user = await dbAdmin.from('users').select('academy_id')
  // @ts-expect-error - users has no academy_id
  user.data?.[0]?.academy_id

  // teachers is keyed by user_id; it has no surrogate id.
  const teacher = await dbAdmin.from('teachers').select('id')
  // @ts-expect-error - teachers has no id
  teacher.data?.[0]?.id

  // Per-student status lives on assignment_grades.status.
  const asg = await dbAdmin.from('assignments').select('status')
  // @ts-expect-error - assignments has no status
  asg.data?.[0]?.status

  // Never created. Academy revenue comes from `invoices`.
  // @ts-expect-error - table does not exist
  await dbAdmin.from('student_payments').select('amount')

  // Also caught: reading a column that exists but was NOT selected —
  // the other half of today's fake numbers.
  const partial = await dbAdmin.from('academy_subscriptions').select('id')
  // @ts-expect-error - plan_tier was not in the select list
  partial.data?.[0]?.plan_tier
}

export async function correctQueriesStillCompile() {
  // The same intents, spelled correctly — these must NOT error, so the
  // file also proves the typing is usable and not merely strict.
  await dbAdmin.from('academy_subscriptions').select('id, plan_tier')
  await dbAdmin.from('users').select('id, role')
  await dbAdmin.from('teachers').select('user_id, academy_id')
  await dbAdmin.from('assignments').select('id, title, classroom_session_id')
  await dbAdmin.from('invoices').select('id, academy_id, final_amount, status')
}
