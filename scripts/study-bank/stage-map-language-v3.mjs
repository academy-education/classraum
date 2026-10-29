#!/usr/bin/env node
/**
 * Stage MAP Language v3 (verified=false) as two cohorts, one per area, under
 * MAP-LANGUAGE-V3.prereg.md: the in-session rewrite of the held
 * map-language-v2-grammar and -writing cohorts. Rows are standalone
 * (passage_group_id null), as in v2.
 *
 *   node stage-map-language-v3.mjs [items.json ...] [--apply]
 *
 * Default input: every file in map-v2-work/language-v3/items. Dry run by
 * default. Refuses unless lu3-check.mjs passes, and refuses a duplicate content
 * hash, an unknown strand, or a cohort without its method entry; re-reads after
 * writing and checks the counts that landed.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

const WORK = new URL('./map-v2-work/language-v3/', import.meta.url)
const APPLY = process.argv.includes('--apply')
const die = m => { console.error(m); process.exit(1) }
let files = process.argv.slice(2).filter(a => !a.startsWith('--'))
if (!files.length) files = readdirSync(new URL('items/', WORK)).filter(f => f.endsWith('.json')).map(f => new URL(`items/${f}`, WORK).pathname)

const check = spawnSync('node', [new URL('lu3-check.mjs', WORK).pathname, ...files], { encoding: 'utf8' })
if (check.status !== 0) die(`lu3-check.mjs failed:\n${check.stdout}${check.stderr}`)

const METHOD_ID = 'map-lu-v3-insession-rewrite+cfg-v2'
const STRAND = {
  PoS: ['Language: Understand, Edit for Grammar, Usage', 'Parts of Speech', 'map-language-v3-grammar'],
  PCAS: ['Language: Understand, Edit for Grammar, Usage', 'Phrases, Clauses, Agreement, Sentences', 'map-language-v3-grammar'],
  Org: ['Writing: Write, Revise Texts for Purpose and Audience', 'Plan, Organize; Create Cohesion, Use Transitions', 'map-language-v3-writing'],
  Style: ['Writing: Write, Revise Texts for Purpose and Audience', 'Establish and Maintain Style; Use Precise Language', 'map-language-v3-writing'],
}

const methods = JSON.parse(readFileSync(new URL('./autonomy-methods.json', import.meta.url), 'utf8')).cohorts
for (const c of new Set(Object.values(STRAND).map(s => s[2]))) {
  if (methods[c]?.method_id !== METHOD_ID) die(`autonomy-methods.json has no ${c} entry with method_id ${METHOD_ID}`)
}

const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const hashOf = ({ passage, prompt, choices }) => createHash('md5')
  .update([norm(passage), norm(prompt), (choices || []).map(norm).join('|')].join('~~')).digest('hex')

const raw = files.flatMap(f => JSON.parse(readFileSync(f, 'utf8')))
const rows = raw.map(it => {
  const s = STRAND[it.strand]
  if (!s) die(`${it.id}: unknown strand ${it.strand}`)
  const [area, strand, cohort] = s
  const correct = it.choices[it.key]
  const wrong = it.choices.filter((_, i) => i !== it.key)
  const student_error = Object.fromEntries(wrong.map((c, i) => [c, it.why_wrong[i]]))
  const item = {
    type: 'multiple_choice', blanks: null, prompt: it.prompt, choices: it.choices, graphic: null,
    passage: it.passage ?? null, difficulty: 'medium', explanation: it.explanation,
    correct_answer: correct, correct_answers: null, acceptable_answers: null,
  }
  return {
    family: 'map', section: 'language', domain: area, subskill: strand, difficulty: 'medium',
    topic_tag: strand, item_type: 'multiple_choice', task: 'multiple_choice', passage_group_id: null, item,
    content_hash: hashOf(item), word_count: (it.passage || correct).split(/\s+/).filter(Boolean).length,
    verified: false, archived: false, source: 'hand', cohort,
    verify_meta: {
      method_id: METHOD_ID,
      map: { area, strand, grade_target: it.grade, ccss: it.ccss, format: it.format },
      draft: {
        status: 'awaiting_edit', qid: it.id,
        qc: { note: 'map-language v3: in-session rewrite of the held v2 cohort under MAP-LANGUAGE-V3-BRIEF.md (each named v2 tell banned); lu3-check.mjs pre-flight; gate = agent review (MAP-LANGUAGE-V3.prereg.md).' },
        authored: { student_error, option_class: it.option_class ?? null, relation: it.relation ?? null },
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
