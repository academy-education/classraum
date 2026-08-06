#!/usr/bin/env node
/**
 * Write the repaired SAT Math option sets into study_item_bank.
 *
 * Replaces ONLY `item.choices`. The stem, key, explanation and `difficulty`
 * are untouched — the maths was never wrong, the distractors were. They had
 * been generated FROM the key by an invertible slip (negate, halve, square,
 * off-by-one), making the key the unique derivational centre of its own
 * option set: 64.4% hub-is-key against a 27.5% control. The repaired overlay
 * measures 23.6%, i.e. chance.
 *
 * Lives here rather than scripts/*.ts because the .ts scripts import through
 * the Next module graph and cannot run standalone; the bank helpers next to
 * this file already read .env.local directly, so this follows them.
 *
 * SAFETY, in order:
 *   1. Validate all 96 in memory. Any failure aborts before a single write —
 *      a repaired set missing its own key makes the item unanswerable, and
 *      that would stay invisible until a student hit it.
 *   2. Back the original choices into verify_meta->'legacy_choices' BEFORE
 *      overwriting, so a row is reversible from itself.
 *   3. Recompute content_hash — it is md5(normalised prompt + choices), so
 *      changing choices without it leaves a hash that no longer describes
 *      the row and the next harvest's dedup misses.
 *   4. Re-check the key against the LIVE row, not just the file.
 *
 * Re-runnable: an already-repaired row is skipped, and legacy_choices is
 * only written when absent, so a second run cannot overwrite the backup
 * with the repaired values.
 *
 * Usage:
 *   node apply-math-hub-repair.mjs --file <path> [--dry]
 *   node apply-math-hub-repair.mjs [--dry]     # the original four batches
 *
 * `--file` was added for round 2 (math-hub-r2-proposed.json, 41 items).
 * It also fixes a hazard the round-2 files created: this script used to
 * glob every `math-hub-*.json` in the directory, so the moment new files
 * were named `math-hub-r2-*.json` they were silently pulled into a run
 * that was never meant to include them. They carry a different schema so
 * validation aborted rather than writing anything — but a loader whose
 * input set is "whatever is in the folder" is one filename away from
 * doing real damage. The no-argument path now names its four files.
 *
 * Both schemas are accepted:
 *   legacy  { id, correct_answer, choices, repaired_choices }
 *   round 2 { id, key, before, after }
 */
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const DRY = process.argv.includes('--dry')
const DIR = 'scripts/study-bank'

function loadEnv() {
  const raw = readFileSync(process.cwd() + '/.env.local', 'utf8')
  return Object.fromEntries(raw.split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
}
const env = loadEnv()
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } })

const normHash = s => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const hashOf = (prompt, choices) => createHash('md5')
  .update([normHash(prompt), (choices || []).map(normHash).join('|')].join('~~'))
  .digest('hex')

/** Accept either schema, and normalise to the legacy field names. */
const normalise = e => ('repaired_choices' in e ? e : {
  id: e.id,
  prompt: e.prompt,
  correct_answer: e.key,
  choices: e.before,
  repaired_choices: e.after,
})

const fileArg = (() => {
  const i = process.argv.indexOf('--file')
  return i >= 0 ? process.argv[i + 1] : null
})()

/* The original four batches, named explicitly. See the header for why
 * this is no longer a directory glob. */
const LEGACY = [
  'math-hub-algebra.json', 'math-hub-advanced-math.json',
  'math-hub-geometry-and-trigonometry.json',
  'math-hub-problem-solving-and-data-analysis.json',
]

const sources = fileArg ? [fileArg] : LEGACY.map(f => `${DIR}/${f}`)
const rows = []
for (const path of sources) {
  const parsed = JSON.parse(readFileSync(path, 'utf8'))
  if (!Array.isArray(parsed)) throw new Error(`${path}: expected an array`)
  rows.push(...parsed.map(normalise))
}
console.log(`loaded ${rows.length} repaired item(s) from:`)
for (const s of sources) console.log('  ' + s)

const problems = []
const seen = new Set()
for (const r of rows) {
  const rc = r.repaired_choices
  if (seen.has(r.id)) problems.push(`${r.id}: appears twice across files`)
  seen.add(r.id)
  if (!Array.isArray(rc)) { problems.push(`${r.id}: no repaired_choices`); continue }
  if (rc.length !== 4) problems.push(`${r.id}: ${rc.length} options, expected 4`)
  if (new Set(rc.map(String)).size !== rc.length) problems.push(`${r.id}: duplicate options`)
  if (!rc.map(String).includes(String(r.correct_answer))) {
    problems.push(`${r.id}: KEY "${r.correct_answer}" is not in the repaired set`)
  }
  if (JSON.stringify(rc) === JSON.stringify(r.choices)) problems.push(`${r.id}: unchanged`)
}
if (problems.length) {
  console.error(`\nABORTED — ${problems.length} problem(s), nothing written:`)
  problems.slice(0, 20).forEach(p => console.error('  ' + p))
  process.exit(1)
}
console.log('validation: 0 problems')

let updated = 0, skipped = 0, missing = 0, failed = 0
for (const r of rows) {
  const { data: row, error: readErr } = await db
    .from('study_item_bank').select('id, item, verify_meta').eq('id', r.id).maybeSingle()
  if (readErr) { console.error(`ERR read ${r.id}: ${readErr.message}`); failed++; continue }
  if (!row) { console.error(`MISSING ${r.id}`); missing++; continue }

  const item = row.item ?? {}
  const current = item.choices ?? []
  if (JSON.stringify(current) === JSON.stringify(r.repaired_choices)) { skipped++; continue }

  if (String(item.correct_answer) !== String(r.correct_answer)) {
    console.error(`ERR ${r.id}: live key "${item.correct_answer}" != file key "${r.correct_answer}"`)
    failed++; continue
  }

  const meta = row.verify_meta ?? {}
  const nextMeta = 'legacy_choices' in meta
    ? meta
    : { ...meta, legacy_choices: current, hub_repaired_at: new Date().toISOString() }

  if (DRY) { updated++; continue }

  const { error } = await db.from('study_item_bank').update({
    item: { ...item, choices: r.repaired_choices },
    content_hash: hashOf(String(item.prompt ?? r.prompt), r.repaired_choices),
    verify_meta: nextMeta,
  }).eq('id', r.id)

  if (error) { console.error(`ERR write ${r.id}: ${error.message}`); failed++; continue }
  updated++
}

console.log(`\n${DRY ? 'DRY RUN — ' : ''}updated ${updated}, already-repaired ${skipped}, missing ${missing}, failed ${failed}`)
if (failed || missing) process.exit(1)
