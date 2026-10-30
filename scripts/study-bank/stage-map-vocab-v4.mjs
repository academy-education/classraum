#!/usr/bin/env node
/**
 * Stage map-v2 batch 3 (MRV4) standalone Vocabulary (verified=false) as one cohort, the draft
 * route: invisible to students until release-by-shape.mjs releases it after the
 * co-founder's spot (Amendment 3). Each item is one context sentence + one
 * question; the sentence goes in item.passage (as single-passage SAT R&W items
 * do) and passage_group_id stays null, because the assembler draws MAP
 * Vocabulary with passages: false.
 *
 *   node stage-map-vocab-v4.mjs <V.merged.json> [--apply]
 *
 * Dry run by default. Refuses a duplicate content hash, a non-Vocabulary item,
 * a key not among the choices, or a cohort without its method entry; re-reads
 * after writing and checks the count that landed.
 */
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const files = process.argv.slice(2).filter(a => !a.startsWith('--'))
const APPLY = process.argv.includes('--apply')
const die = m => { console.error(m); process.exit(1) }
if (!files.length) die('usage: stage-map-vocab-v4.mjs <V.merged.json> [--apply]')

const COHORT = 'map-vocab-v4'
const METHOD_ID = 'map-vocab-v4-agents+cfg-v2'
const methods = JSON.parse(readFileSync(new URL('./autonomy-methods.json', import.meta.url), 'utf8')).cohorts
if (methods[COHORT]?.method_id !== METHOD_ID) die(`autonomy-methods.json has no ${COHORT} entry with method_id ${METHOD_ID}`)

const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const hashOf = ({ passage, prompt, choices }) => createHash('md5')
  .update([norm(passage), norm(prompt), (choices || []).map(norm).join('|')].join('~~')).digest('hex')

const raw = files.flatMap(f => JSON.parse(readFileSync(f, 'utf8')))
if (raw.length !== 80) die(`expected 80 items, read ${raw.length}`)
if (raw.some(it => !/^MRV4-V[12]-\d{2}$/.test(it.id) || !it.key_slot)) die('every row must be a dealt MRV4 vocabulary item (V.merged.json)')
const rows = raw.map(it => {
  if (it.map_area !== 'Vocabulary') die(`${it.id}: map_area is ${it.map_area}, not Vocabulary`)
  if (!it.context) die(`${it.id}: no context sentence`)
  if (!it.choices.includes(it.correct_answer)) die(`${it.id}: key not among choices`)
  const item = {
    type: 'multiple_choice', blanks: null, prompt: it.prompt, choices: it.choices, graphic: null,
    passage: it.context, difficulty: it.difficulty, explanation: it.explanation, correct_answer: it.correct_answer,
    correct_answers: null, acceptable_answers: null, distractor_rationales: it.distractor_rationales,
  }
  return {
    family: 'map', section: 'reading', domain: 'Vocabulary', subskill: it.subtype, difficulty: it.difficulty,
    topic_tag: it.subtype, item_type: 'multiple_choice', task: 'multiple_choice', passage_group_id: null, item,
    content_hash: hashOf(item), word_count: it.context.split(/\s+/).filter(Boolean).length,
    verified: false, archived: false, source: 'hand', cohort: COHORT,
    verify_meta: {
      method_id: METHOD_ID,
      map: { area: 'Vocabulary', grade_target: it.grade_target, subtype: it.subtype, target_word: it.target_word },
      draft: {
        status: 'awaiting_edit', qid: it.id,
        qc: { note: 'map-v2 batch 3 (MRV4) standalone Vocabulary: two Claude agent authors to map-v2-work/reading-b3/BRIEF-B3.md, vocab-check.mjs 0 problems, key slots dealt flat (deal-vocab.mjs); grader v2 pre-screen x2 pending (see REGISTER). Blind options-only attack not run (invalid for MAP comprehension).' },
        original_item: item,
      },
    },
  }
})

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const hashes = rows.map(r => r.content_hash)
if (new Set(hashes).size !== hashes.length) die('duplicate content hash inside the batch')
const { data: clash, error: e1 } = await db.from('study_item_bank').select('id,cohort').in('content_hash', hashes)
if (e1) die(e1.message)
if (clash.length) die(`${clash.length} rows already in the bank with these hashes (e.g. cohort ${clash[0].cohort})`)

console.log('rows', rows.length, 'cohort', COHORT)
if (!APPLY) { console.log('dry run; pass --apply to insert'); process.exit(0) }

const { error: e2 } = await db.from('study_item_bank').insert(rows)
if (e2) die(e2.message)
const { count, error } = await db.from('study_item_bank').select('id', { count: 'exact', head: true })
  .eq('cohort', COHORT).eq('verified', false)
if (error) die(error.message)
if (count !== rows.length) die(`${COHORT}: expected ${rows.length} staged rows, found ${count}`)
console.log(`${COHORT}: ${count} staged`)
