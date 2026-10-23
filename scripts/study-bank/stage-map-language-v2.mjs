#!/usr/bin/env node
/**
 * Stage map-v2 Language batch 1 (verified=false) as three cohorts, one per MAP
 * Language area, so each gets its own co-founder spot (Amendment 3; options-only
 * is invalid for Mechanics/Grammar, so the human spot is the gate). Rows are
 * standalone (passage_group_id null): paragraph items keep their paragraph in
 * item.passage, and the assembler draws Language with passages: false.
 *
 *   node stage-map-language-v2.mjs <items.json ...> [--apply]
 *
 * Dry run by default. Refuses a duplicate content hash, an unknown area, a key
 * not among the choices, or a cohort without its method entry; re-reads after
 * writing and checks the counts that landed.
 */
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const files = process.argv.slice(2).filter(a => !a.startsWith('--'))
const APPLY = process.argv.includes('--apply')
const die = m => { console.error(m); process.exit(1) }
if (!files.length) die('usage: stage-map-language-v2.mjs <items.json ...> [--apply]')

const METHOD_ID = 'map-lu-v2-agents+cfg-v2'
const COHORT_OF = {
  'Writing: Write, Revise Texts for Purpose and Audience': 'map-language-v2-writing',
  'Language: Understand, Edit for Grammar, Usage': 'map-language-v2-grammar',
  'Language: Understand, Edit for Mechanics': 'map-language-v2-mechanics',
}

const methods = JSON.parse(readFileSync(new URL('./autonomy-methods.json', import.meta.url), 'utf8')).cohorts
for (const c of Object.values(COHORT_OF)) {
  if (methods[c]?.method_id !== METHOD_ID) die(`autonomy-methods.json has no ${c} entry with method_id ${METHOD_ID}`)
}

const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const hashOf = ({ passage, prompt, choices }) => createHash('md5')
  .update([norm(passage), norm(prompt), (choices || []).map(norm).join('|')].join('~~')).digest('hex')

const raw = files.flatMap(f => JSON.parse(readFileSync(f, 'utf8')))
const rows = raw.map(it => {
  const cohort = COHORT_OF[it.map_area]
  if (!cohort) die(`${it.id}: unknown map_area ${it.map_area}`)
  if (!it.choices.includes(it.correct_answer)) die(`${it.id}: key not among choices`)
  const item = {
    type: 'multiple_choice', blanks: null, prompt: it.prompt, choices: it.choices, graphic: null,
    passage: it.passage ?? null, difficulty: it.difficulty ?? 'medium', explanation: it.explanation,
    correct_answer: it.correct_answer, correct_answers: null, acceptable_answers: null,
  }
  return {
    family: 'map', section: 'language', domain: it.map_area, subskill: it.map_strand, difficulty: item.difficulty,
    topic_tag: it.map_strand, item_type: 'multiple_choice', task: 'multiple_choice', passage_group_id: null, item,
    content_hash: hashOf(item), word_count: (it.passage || it.correct_answer).split(/\s+/).filter(Boolean).length,
    verified: false, archived: false, source: 'hand', cohort,
    verify_meta: {
      method_id: METHOD_ID,
      map: { area: it.map_area, strand: it.map_strand, grade_target: it.grade_target, ccss: it.ccss, format: it.format },
      draft: {
        status: 'awaiting_edit', qid: it.id,
        qc: { note: 'map-v2 Language batch 1: 10 Claude agent authors (map-v2-work/language/BRIEF.md), lu-check.mjs per item; grader v2 pre-screen x2 over all 216, one return (26 items rebuilt) and a re-grade of the rebuilt items. Options-only attack not run: invalid for Mechanics/Grammar (the construct is in the options).' },
        authored: { rule: it.rule, student_error: it.student_error, error_sites: it.error_sites },
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
console.log('rows', rows.length, per)
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
