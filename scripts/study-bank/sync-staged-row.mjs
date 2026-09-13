#!/usr/bin/env node
/**
 * sync-staged-row.mjs <batch.json> <cohort> <localId> [--apply]
 *
 * Push ONE repaired item from its batch file onto its STAGED bank row.
 *
 * WHY THIS EXISTS RATHER THAN `act-bank-helper update`. That command refuses
 * while any ledger stage fails, which is correct for promoting content. But a
 * batch can be repaired on an item WHILE a different stage legitimately stays
 * failed -- `act-reading-v7` had one item fixed on two graders' identical
 * advice while its `tells` stage still fails on subject recall, which is a
 * property of the topic and not of that item. Under the strict rule the file
 * moves ahead and the row stays behind, and the hazard is concrete: whoever
 * eventually flips `verified=true` flips the ROW, so the bank would ship the
 * unrepaired item and nobody would be looking.
 *
 * So this writes the repair through, and constrains itself hard:
 *   - the row must be verified=false. A servable row is never touched here;
 *     that is what the gated helper is for.
 *   - exactly one row may match, and it is addressed by verify_meta.localId
 *     within the cohort -- never by prompt. Making C&S stems positional once
 *     gave 8 of 18 rows in one cohort the identical prompt and a prompt-keyed
 *     lookup silently returned a sibling's row the same day.
 *   - only prompt / choices / correct_answer / explanation move. Passage,
 *     domain and difficulty are left alone.
 *   - dry run by default; --apply prints a before/after diff of the key.
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const [file, cohort, localId] = process.argv.slice(2)
const APPLY = process.argv.includes('--apply')
if (!file || !cohort || !localId) {
  console.error('usage: sync-staged-row.mjs <batch.json> <cohort> <localId> [--apply]')
  process.exit(2)
}
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const batch = JSON.parse(readFileSync(file, 'utf8'))
const item = batch.find(x => x.id === localId)
if (!item) { console.error(`REFUSING: ${localId} not in ${file}`); process.exit(2) }
if (!item.choices?.map(String).includes(String(item.correct_answer))) {
  console.error('REFUSING: the file\'s key is not among its own choices'); process.exit(2)
}

const { data: rows, error } = await db.from('study_item_bank')
  .select('id,verified,archived,item,verify_meta').eq('cohort', cohort)
if (error) throw new Error(error.message)
const match = (rows ?? []).filter(r => r.verify_meta?.localId === localId)
if (match.length !== 1) { console.error(`REFUSING: ${match.length} rows match localId ${localId}; expected exactly 1`); process.exit(2) }
const row = match[0]
if (row.verified !== false) { console.error(`REFUSING: row ${row.id} is verified=${row.verified}. This tool only syncs STAGED rows.`); process.exit(2) }

console.log(`row ${row.id}  verified=${row.verified} archived=${row.archived}`)
console.log(`  key on the ROW  : ${JSON.stringify(row.item?.correct_answer)}`)
console.log(`  key in the FILE : ${JSON.stringify(item.correct_answer)}`)
if (String(row.item?.correct_answer) === String(item.correct_answer)
    && JSON.stringify(row.item?.choices) === JSON.stringify(item.choices)) {
  console.log('  already in sync; nothing to do.')
  process.exit(0)
}
if (!APPLY) { console.log('\nDRY RUN. Re-run with --apply to write.'); process.exit(0) }

const next = { ...row.item, prompt: item.prompt, choices: item.choices, correct_answer: item.correct_answer, explanation: item.explanation }
const { data: updated, error: uerr } = await db.from('study_item_bank')
  .update({ item: next }).eq('id', row.id).eq('verified', false).select('id')
if (uerr) throw new Error(uerr.message)
if ((updated?.length ?? 0) !== 1) { console.error(`FAILED: matched ${updated?.length ?? 0} rows, expected 1`); process.exit(1) }
console.log(`  updated 1 row.`)
