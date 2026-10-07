#!/usr/bin/env node
/**
 * Print migration 124 + its test wrapped in ONE rolled-back transaction, for
 * the Supabase SQL runner (no psql in this environment). Nothing it prints
 * can commit: the migration's own top-level begin;/commit; are stripped and
 * the whole batch ends in rollback.
 *
 *   node scripts/study-bank/hardening-migration-test.mjs > /tmp/x.sql
 *
 * Refuses if it cannot find exactly one top-level begin; and commit; to strip
 * — a migration whose commit survived would apply for real.
 */
import { readFileSync } from 'node:fs'
const mig = readFileSync('database/migrations/124_item_hardening.sql', 'utf8')
const test = readFileSync('database/tests/124_item_hardening.test.sql', 'utf8')
const lines = mig.split('\n')
const b = lines.filter(l => l.trim().toLowerCase() === 'begin;').length
const c = lines.filter(l => l.trim().toLowerCase() === 'commit;').length
if (b !== 1 || c !== 1) { console.error(`REFUSING: expected one top-level begin;/commit;, found ${b}/${c}`); process.exit(2) }
const body = lines.filter(l => !['begin;', 'commit;'].includes(l.trim().toLowerCase())).join('\n')
if (/^\s*commit\s*;/im.test(body)) { console.error('REFUSING: a commit survived the strip'); process.exit(2) }
process.stdout.write(`begin;\n${body}\n${test}\nrollback;\n`)
