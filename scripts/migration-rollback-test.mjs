#!/usr/bin/env node
/**
 * Print a migration + its test wrapped in ONE rolled-back transaction, for
 * the Supabase SQL runner (no psql in this environment). Generalises
 * scripts/study-bank/hardening-migration-test.mjs.
 *
 *   node scripts/migration-rollback-test.mjs 125_test_account_flags [more ...]
 *
 * Several names are applied in order inside the same transaction (so 126's
 * test can run on top of 125). Nothing printed can commit: each migration's
 * top-level begin;/commit; is stripped and the batch ends in rollback.
 * Refuses if a migration does not have exactly one of each to strip, or if
 * a test file is missing — a migration with no test is not "tested".
 */
import { readFileSync, existsSync } from 'node:fs'

const names = process.argv.slice(2)
if (names.length === 0) { console.error('usage: migration-rollback-test.mjs <name> [name ...]'); process.exit(2) }
const parts = []
for (const n of names) {
  const migPath = `database/migrations/${n}.sql`
  const testPath = `database/tests/${n}.test.sql`
  if (!existsSync(migPath) || !existsSync(testPath)) { console.error(`REFUSING: ${migPath} or ${testPath} missing`); process.exit(2) }
  const lines = readFileSync(migPath, 'utf8').split('\n')
  const b = lines.filter(l => l.trim().toLowerCase() === 'begin;').length
  const c = lines.filter(l => l.trim().toLowerCase() === 'commit;').length
  if (b !== 1 || c !== 1) { console.error(`REFUSING: ${n}: expected one top-level begin;/commit;, found ${b}/${c}`); process.exit(2) }
  const body = lines.filter(l => !['begin;', 'commit;'].includes(l.trim().toLowerCase())).join('\n')
  if (/^\s*commit\s*;/im.test(body)) { console.error(`REFUSING: ${n}: a commit survived the strip`); process.exit(2) }
  parts.push(`-- ==== ${n} ====\n${body}\n${readFileSync(testPath, 'utf8')}`)
}
process.stdout.write(`begin;\n${parts.join('\n')}\nrollback;\nselect 'rolled back: ${names.join(', ')}' as status;\n`)
