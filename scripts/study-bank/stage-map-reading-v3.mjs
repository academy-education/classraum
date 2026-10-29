#!/usr/bin/env node
/**
 * Stage map-v2 Reading batch 2 (MRV3, verified=false) as two cohorts, the draft
 * route: rows are invisible to students until release-by-shape.mjs releases a
 * cohort after the co-founder's spot (Amendment 3, MAP comprehension capped at
 * L1). Row shape copies the ISEE/MAP reading drafts (passage_group_id per
 * passage, verify_meta.draft.original_item kept for the edit screen).
 *
 *   node stage-map-reading-v3.mjs <batch2.merged.json> [--apply]
 *
 * Dry run by default. Refuses a duplicate content hash, a passage whose items
 * disagree on map_area, or a cohort without its method entry; re-reads after
 * writing and checks the counts that landed.
 */
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const [file] = process.argv.slice(2)
const APPLY = process.argv.includes('--apply')
const die = m => { console.error(m); process.exit(1) }
if (!file) die('usage: stage-map-reading-v3.mjs <batch2.merged.json> [--apply]')

const METHOD_ID = 'map-rd-v3-insession+cfg-v2'
// P01-P05 of both authors -> c1, P06-P10 -> c2 (15 Literary + 15 Informational each)
const cohortOf = pid => (+pid.split('-P')[1] <= 5 ? 1 : 2)
const cohortName = n => `map-reading-v3-c${n}`

const methods = JSON.parse(readFileSync(new URL('./autonomy-methods.json', import.meta.url), 'utf8')).cohorts
for (const n of [1, 2]) {
  const m = methods[cohortName(n)]
  if (!m || m.method_id !== METHOD_ID) die(`autonomy-methods.json has no ${cohortName(n)} entry with method_id ${METHOD_ID}`)
}

const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const hashOf = ({ passage, prompt, choices }) => createHash('md5')
  .update([norm(passage), norm(prompt), (choices || []).map(norm).join('|')].join('~~')).digest('hex')
const words = s => (s.match(/\S+/g) || []).length

const { items } = JSON.parse(readFileSync(file, 'utf8'))
if (!Array.isArray(items) || items.length !== 60) die(`expected 60 items, read ${items?.length}`)

const area = {}
const rows = items.map(it => {
  if (!/^MRV3-R[12]-P(0[1-9]|10)$/.test(it.passage_id)) die(`unexpected passage id ${it.passage_id}`)
  if (!['Literary Text', 'Informational Text'].includes(it.map_area)) die(`bad map_area on ${it.qid}: ${it.map_area}`)
  if ((area[it.passage_id] ??= it.map_area) !== it.map_area) die(`${it.passage_id}: items disagree on map_area`)
  if (!it.choices.includes(it.correct_answer)) die(`${it.qid}: key not among choices`)
  const group = `mapv3-${it.passage_id}`
  const item = {
    type: 'multiple_choice', blanks: null, prompt: it.prompt, choices: it.choices, graphic: null,
    passage: it.passage, difficulty: it.difficulty, explanation: it.explanation, correct_answer: it.correct_answer,
    passageGroupId: group, correct_answers: null, acceptable_answers: null,
    distractor_rationales: it.distractor_rationales,
  }
  return {
    family: 'map', section: 'reading', domain: it.map_area, subskill: it.kind, difficulty: it.difficulty,
    topic_tag: it.kind, item_type: 'multiple_choice', task: 'multiple_choice', passage_group_id: group, item,
    content_hash: hashOf(item), word_count: words(it.passage), verified: false, archived: false, source: 'hand',
    cohort: cohortName(cohortOf(it.passage_id)),
    verify_meta: {
      method_id: METHOD_ID,
      map: { area: it.map_area, grade_target: it.grade_target, genre: it.genre, title: it.title },
      draft: {
        status: 'awaiting_edit', qid: it.qid,
        qc: { note: 'map-v2 Reading batch 2 (MRV3): one in-session Claude author to map-v2-work/reading/BRIEF.md (adapted, map-v2-work/reading-b2); merge.mjs 0 problems, quote and location checks clean; grader v2 pre-screen x2 (see REGISTER). Blind options-only attack not run: invalid for MAP comprehension (model 84.3% vs human 20.8% on draft-1).' },
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

const per = {}
for (const r of rows) per[r.cohort] = (per[r.cohort] || 0) + 1
console.log('rows', rows.length, per, 'passages', Object.keys(area).length)
if (!APPLY) { console.log('dry run; pass --apply to insert'); process.exit(0) }

const { error: e2 } = await db.from('study_item_bank').insert(rows)
if (e2) die(e2.message)
for (const [c, n] of Object.entries(per)) {
  const { count, error } = await db.from('study_item_bank').select('id', { count: 'exact', head: true })
    .eq('cohort', c).eq('verified', false)
  if (error) die(error.message)
  if (count !== n) die(`${c}: expected ${n} staged rows, found ${count}`)
  console.log(`${c}: ${count} staged`)
}
