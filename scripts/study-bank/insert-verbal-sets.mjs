#!/usr/bin/env node
/**
 * Insert a bijective-set verbal batch.
 *
 * THE SET ID IS STORED IN passage_group_id, and that is load-bearing
 * rather than incidental. Assembly takes at most ONE item per group
 * outside reading, which is what stops two items of a set sharing a
 * form. Four items sharing one option pool leak each other — answer
 * three and the fourth follows by elimination — and a blind attack
 * scores that as clean because it is a property of the form, not the
 * item. Insert without the group id and the constraint silently has
 * nothing to hold on to.
 *
 *   node insert-verbal-sets.mjs <batch.json> <family> <cohort> [--apply]
 *
 * Dry run by default. Re-reads after writing and CHECKS what landed.
 */
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const [file, family, cohort] = process.argv.slice(2)
const APPLY = process.argv.includes('--apply')
if (!file || !family || !cohort) { console.error('usage: <batch.json> <family> <cohort> [--apply]'); process.exit(1) }

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const norm = s => String(s).trim().replace(/\s+/g, ' ').toLowerCase()
const hashOf = it => createHash('md5')
  .update([norm(it.prompt), (it.choices || []).map(norm).join('|')].join('~~')).digest('hex')

const batch = JSON.parse(readFileSync(file, 'utf8'))
const want = family === 'ssat' ? 5 : 4

/* Refuse the batch rather than the item: a set that is not bijective is
   not partially usable, because the property is what makes the options
   safe. */
const sets = {}
for (const it of batch) (sets[it.set_id] = sets[it.set_id] || []).push(it)
const problems = []
for (const [sid, g] of Object.entries(sets)) {
  const pool = [...g[0].choices].sort().join('|')
  if (g.some(i => [...i.choices].sort().join('|') !== pool)) problems.push(`${sid}: option pools differ`)
  if (g.some(i => i.choices.length !== want)) problems.push(`${sid}: not ${want} options`)
  if (new Set(g.map(i => i.correct_answer)).size !== g.length) problems.push(`${sid}: keys not distinct`)
  if (g.some(i => !i.choices.includes(i.correct_answer))) problems.push(`${sid}: a key is not among its options`)
}
if (problems.length) { console.error('REFUSED:\n  ' + problems.join('\n  ')); process.exit(1) }
console.log(`${batch.length} items in ${Object.keys(sets).length} sets — bijective structure OK`)

const { data: existing } = await db.from('study_item_bank')
  .select('content_hash').eq('family', family).eq('section', 'verbal')
const seen = new Set((existing ?? []).map(r => r.content_hash))

if (!APPLY) { console.log('DRY RUN — pass --apply to write'); process.exit(0) }

let inserted = 0, dup = 0
for (const it of batch) {
  const item = {
    type: 'multiple_choice', prompt: it.prompt, choices: it.choices,
    correct_answer: it.correct_answer, explanation: it.explanation,
    difficulty: it.difficulty,
  }
  const content_hash = hashOf(item)
  if (seen.has(content_hash)) { console.log(`DUP ${it.id}`); dup++; continue }
  const { error } = await db.from('study_item_bank').insert({
    family, section: 'verbal', domain: 'Verbal', subskill: it.subskill,
    task: it.subskill, item_type: 'multiple_choice', difficulty: it.difficulty,
    topic_tag: it.subskill, item, content_hash,
    passage_group_id: `${cohort}:${it.set_id}`,     // <- the constraint depends on this
    word_count: null, verified: true, archived: false, source: 'hand', cohort,
    verify_meta: {
      method: 'bijective set — every option is the key of exactly one stem in its set',
      localId: it.id, set_id: it.set_id,
      note: 'An options-only blind attack CANNOT fail on this construction (scores exactly chance by design) and was not treated as a clearance. Not yet read by a human reviewer.',
    },
  })
  if (error) { console.error(`ERR ${it.id}: ${error.message}`); process.exit(1) }
  seen.add(content_hash); inserted++
}
console.log(`inserted ${inserted}, dup-skipped ${dup}`)

/* CHECK the write, do not trust it. */
const { data: after } = await db.from('study_item_bank')
  .select('id,passage_group_id').eq('cohort', cohort)
const groups = new Set((after ?? []).map(r => r.passage_group_id))
const ungrouped = (after ?? []).filter(r => !r.passage_group_id).length
console.log(`verified in DB: ${after?.length ?? 0} rows, ${groups.size} distinct groups, ${ungrouped} ungrouped`)
if (ungrouped) { console.error('FAIL: rows without a group id cannot be protected by the form constraint'); process.exit(1) }
