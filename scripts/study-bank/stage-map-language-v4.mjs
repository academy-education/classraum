#!/usr/bin/env node
/**
 * Stage MAP Language v4 (verified=false) as three cohorts, one per area
 * (grammar, writing, mechanics). Copy of stage-map-language-v3.mjs: Grammar and
 * Writing are a second batch under the frozen MAP-LANGUAGE-V3-BRIEF.md; Mechanics
 * applies the v3 shapes to Punctuation, Capitalization and Spelling (new method).
 * Rows are standalone (passage_group_id null).
 *
 *   node stage-map-language-v4.mjs [items.json ...] [--apply]
 *
 * Default input: every file in map-v2-work/language-v4/items. Dry run by
 * default. Refuses unless lu4-check.mjs passes, and refuses a duplicate content
 * hash, an unknown strand, or a cohort without its method entry; re-reads after
 * writing and checks the counts that landed.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

const WORK = new URL('./map-v2-work/language-v4/', import.meta.url)
const APPLY = process.argv.includes('--apply')
const die = m => { console.error(m); process.exit(1) }
let files = process.argv.slice(2).filter(a => !a.startsWith('--'))
if (!files.length) files = readdirSync(new URL('items/', WORK)).filter(f => f.endsWith('.json')).map(f => new URL(`items/${f}`, WORK).pathname)

const check = spawnSync('node', [new URL('lu4-check.mjs', WORK).pathname, ...files], { encoding: 'utf8' })
if (check.status !== 0) die(`lu4-check.mjs failed:\n${check.stdout}${check.stderr}`)

const METHOD = {
  'map-language-v4-grammar': 'map-lu-v3-insession-rewrite+cfg-v2',
  'map-language-v4-writing': 'map-lu-v3-insession-rewrite+cfg-v2',
  'map-language-v4-mechanics': 'map-lu-v4-mech-insession+cfg-v2',
}
const STRAND = {
  PoS: ['Language: Understand, Edit for Grammar, Usage', 'Parts of Speech', 'map-language-v4-grammar'],
  PCAS: ['Language: Understand, Edit for Grammar, Usage', 'Phrases, Clauses, Agreement, Sentences', 'map-language-v4-grammar'],
  Org: ['Writing: Write, Revise Texts for Purpose and Audience', 'Plan, Organize; Create Cohesion, Use Transitions', 'map-language-v4-writing'],
  Style: ['Writing: Write, Revise Texts for Purpose and Audience', 'Establish and Maintain Style; Use Precise Language', 'map-language-v4-writing'],
  Punc: ['Language: Understand, Edit for Mechanics', 'Punctuation', 'map-language-v4-mechanics'],
  Cap: ['Language: Understand, Edit for Mechanics', 'Capitalization', 'map-language-v4-mechanics'],
  Spell: ['Language: Understand, Edit for Mechanics', 'Spelling', 'map-language-v4-mechanics'],
}

const methods = JSON.parse(readFileSync(new URL('./autonomy-methods.json', import.meta.url), 'utf8')).cohorts
for (const c of new Set(Object.values(STRAND).map(s => s[2]))) {
  if (methods[c]?.method_id !== METHOD[c]) die(`autonomy-methods.json has no ${c} entry with method_id ${METHOD[c]}`)
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
      method_id: METHOD[cohort],
      map: { area, strand, grade_target: it.grade, ccss: it.ccss, format: it.format },
      draft: {
        status: 'awaiting_edit', qid: it.id,
        qc: { note: 'map-language v4: in-session batch (Grammar/Writing under the frozen MAP-LANGUAGE-V3-BRIEF.md; Mechanics with the v3 non-grid shapes); lu4-check.mjs pre-flight; gate = agent review, not yet run.' },
        authored: { student_error, option_class: it.option_class ?? null, relation: it.relation ?? null, misspelled: it.misspelled ?? null, correct_spelling: it.correct_spelling ?? null },
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
const clash = []
for (let i = 0; i < hashes.length; i += 50) {
  const { data, error: e1 } = await db.from('study_item_bank').select('id,cohort').in('content_hash', hashes.slice(i, i + 50))
  if (e1) die(e1.message)
  clash.push(...data)
}
console.log(`hash clash check: ${hashes.length} batch hashes against the bank, ${clash.length} clashes`)
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
