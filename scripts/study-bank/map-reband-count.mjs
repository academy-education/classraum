#!/usr/bin/env node
/**
 * map-reband-count.mjs — READ ONLY. What would MAP-RESEARCH §13's "READY,
 * usable with re-banding" actually give, per MAP strand and grade band,
 * measured on the live bank rather than quoted from §12's 2026-09-12 numbers?
 *
 * Population: verified=true, archived=false rows (paged; PostgREST caps a
 * page at 1000). Only FOUR-choice items count as re-bandable: MAP MC is four
 * options (§9), and SSAT's five-choice rows would need a distractor removed,
 * which is an edit, not a re-band — they are reported separately.
 *
 * THE STRAND MAPPING IS A JUDGEMENT and is written out in classify() so it
 * can be argued with. The counts under it are exact. Where a row carries no
 * signal for a MAP strand (ISEE reading has no genre field, ACT "Integrating
 * Essential Skills" spans every area) it is counted as UNTAGGED, never
 * guessed into a strand.
 *
 * GRADE BAND. MAP-RESEARCH §13: every item we own was written for SAT, ACT,
 * ISEE Upper or SSAT Upper; "easy" means easy for an upper-level test-taker
 * and must never be relabelled as grade-5 material. So re-banded material is
 * assigned only to the TOP product band (grades 9-11). ISEE/SSAT Upper easy
 * items are reported as "grade-8 candidates" — a human must decide that, the
 * script does not. No RIT is assigned to anything (§10).
 *
 * Form capacity uses MAP's balanced blueprint: 13 items per instructional
 * area (§5), so one ~39-item form needs 13 from EACH area, and the binding
 * constraint is the thinnest area. Passage cohesion is not modelled
 * (Reading draws ~4 items per passage), which would push capacity DOWN.
 *
 *   node scripts/study-bank/map-reband-count.mjs [--json]
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const args = process.argv.slice(2)
const unknown = args.filter(a => a !== '--json' && a !== '--selftest')
if (unknown.length) { console.error(`map-reband-count: unknown argument(s) ${unknown.join(' ')}; this reads the live bank only`); process.exit(2) }

// CCSS puts fragments under L.1 (grammar: "Phrases, Clauses, Agreement,
// Sentences"), while choosing a mark between clauses (comma/semicolon/colon/
// dash, splices) is L.2 (mechanics). FRAGMENT is tested first so a fragment
// item never lands in Punctuation.
const FRAGMENT = /fragment|finite (main )?verb needed|main verb, not a modifier/i
const PUNCT = /punctuat|boundar|comma|semicolon|colon|dash|apostroph|possessive|splice|run-on|parenthe|quotation|end punctuation/i
const GRAMMAR = /agreement|tense|pronoun|modifier|parallel|form|structure|verb|adjective|adverb|case|idiom|comparative|superlative|voice|inversion|correlative|conditional|subjunctive|sense|finite|participle|determiner/i
const STATS = /probab|median|mean\b|average|data|statistic|frequency|percentile|standard deviation|scatter|survey|sampl|histogram|range of|mode\b|expected value|chance/i
const GEOM = /triangle|circle|area|volume|perimeter|angle|polygon|coordinate|distance between|slope|cone|cylinder|sphere|rectang|square|cube|surface|radius|diameter|arc|chord|similar|congruen|trig|sine|cosine|tangent|parallelogram|trapezoid|hexagon|pythag/i
const NUMSYS = /prime|factor|divisib|multiple|digit|fraction|decimal|exponent|radical|root|integer|irrational|complex|scientific notation|remainder|gcd|lcm|reciprocal|absolute value|number line|place value/i

export function classify(r) {
  const fam = `${r.family}/${r.section}`
  const sub = r.subskill ?? ''
  const genre = r.genre ?? null
  switch (fam) {
    case 'sat/reading_writing':
      if (r.domain === 'Information and Ideas') return ['reading', 'Informational Text']
      if (r.domain === 'Craft and Structure') return sub === 'Words in Context' ? ['reading', 'Vocabulary'] : ['reading', 'Informational Text']
      if (r.domain === 'Expression of Ideas') return ['language', 'Writing: Purpose and Audience']
      if (r.domain === 'Standard English Conventions') return (!FRAGMENT.test(sub) && PUNCT.test(sub)) ? ['language', 'Mechanics: Punctuation'] : ['language', 'Grammar and Usage']
      break
    case 'act/english':
      if (r.domain === 'Production of Writing' || r.domain === 'Knowledge of Language') return ['language', 'Writing: Purpose and Audience']
      if (r.domain === 'Conventions of Standard English') return (!FRAGMENT.test(sub) && PUNCT.test(sub)) ? ['language', 'Mechanics: Punctuation'] : ['language', 'Grammar and Usage']
      break
    case 'act/reading':
      if (/vocabulary/i.test(sub)) return ['reading', 'Vocabulary']
      if (genre === 'literary_narrative') return ['reading', 'Literary Text']
      if (genre) return ['reading', 'Informational Text']
      return ['reading', 'UNTAGGED (no genre)']
    case 'isee/reading':
      if (/vocabulary/i.test(sub)) return ['reading', 'Vocabulary']
      return ['reading', 'UNTAGGED (no genre)']
    case 'sat/math':
      if (r.domain === 'Algebra' || r.domain === 'Advanced Math') return ['math', 'Operations and Algebraic Thinking']
      if (r.domain === 'Geometry and Trigonometry') return ['math', 'Geometry']
      if (r.domain === 'Problem-Solving and Data Analysis') return ['math', 'Statistics and Probability']
      break
    case 'act/math':
      if (r.domain === 'Algebra' || r.domain === 'Functions') return ['math', 'Operations and Algebraic Thinking']
      if (r.domain === 'Geometry') return ['math', 'Geometry']
      if (r.domain === 'Statistics and Probability') return ['math', 'Statistics and Probability']
      if (r.domain === 'Number and Quantity') return ['math', 'Real and Complex Number Systems']
      return ['math', 'UNTAGGED (ACT IES)']
    case 'isee/math':
      if (STATS.test(sub)) return ['math', 'Statistics and Probability']
      if (GEOM.test(sub)) return ['math', 'Geometry']
      if (NUMSYS.test(sub)) return ['math', 'Real and Complex Number Systems']
      return ['math', 'Operations and Algebraic Thinking']
  }
  return null
}

const AREAS = {
  reading: ['Literary Text', 'Informational Text', 'Vocabulary'],
  language: ['Writing: Purpose and Audience', 'Grammar and Usage', 'Mechanics: Punctuation', 'Mechanics: Capitalization', 'Mechanics: Spelling'],
  math: ['Operations and Algebraic Thinking', 'Real and Complex Number Systems', 'Geometry', 'Statistics and Probability'],
}

if (args.includes('--selftest')) {
  const t = (r, want) => { const got = classify(r); if (JSON.stringify(got) !== JSON.stringify(want)) { console.error('FAIL', r, got, want); process.exit(1) } }
  t({ family: 'sat', section: 'reading_writing', domain: 'Standard English Conventions', subskill: 'Boundaries' }, ['language', 'Mechanics: Punctuation'])
  t({ family: 'sat', section: 'reading_writing', domain: 'Standard English Conventions', subskill: 'Subject-Verb Agreement' }, ['language', 'Grammar and Usage'])
  t({ family: 'act', section: 'english', domain: 'Conventions of Standard English', subskill: 'comma splice' }, ['language', 'Mechanics: Punctuation'])
  t({ family: 'act', section: 'reading', domain: 'Key Ideas and Details', subskill: 'detail', genre: 'literary_narrative' }, ['reading', 'Literary Text'])
  t({ family: 'act', section: 'reading', domain: 'Key Ideas and Details', subskill: 'detail', genre: null }, ['reading', 'UNTAGGED (no genre)'])
  t({ family: 'isee', section: 'reading', subskill: 'main-idea' }, ['reading', 'UNTAGGED (no genre)'])
  t({ family: 'ssat', section: 'verbal', subskill: 'synonym' }, null)
  t({ family: 'act', section: 'english', domain: 'Conventions of Standard English', subskill: 'sentence fragment' }, ['language', 'Grammar and Usage'])
  console.log('selftest ok 8/8'); process.exit(0)
}

const env = Object.fromEntries(readFileSync(process.cwd() + '/.env.local', 'utf8')
  .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const rows = []
for (let from = 0; ; from += 1000) {
  const { data, error } = await db.from('study_item_bank')
    .select('id,family,section,domain,subskill,difficulty,item->choices,verify_meta->>genre')
    .eq('archived', false).eq('verified', true).order('id').range(from, from + 999)
  if (error) { console.error(error.message); process.exit(2) }
  rows.push(...data); if (data.length < 1000) break
}
if (rows.length < 1000) { console.error(`map-reband-count: only ${rows.length} live rows read; refusing to report`); process.exit(2) }

const cell = {}     // subject|strand -> {top:{easy,medium,hard}, g8cand, src:{}}
let fiveChoice = 0, adjacent = 0, considered = 0
for (const r of rows) {
  const n = Array.isArray(r.choices) ? r.choices.length : 0
  const fam = `${r.family}/${r.section}`
  if (fam === 'isee/verbal' || fam === 'ssat/verbal') { adjacent++; continue }
  if (r.family === 'ssat' && ['reading', 'math'].includes(r.section)) { fiveChoice++; continue }
  const c = classify(r)
  if (!c) continue
  if (n !== 4) continue
  considered++
  const k = c.join('|')
  const e = (cell[k] ??= { easy: 0, medium: 0, hard: 0, g8cand: 0, src: {} })
  e[r.difficulty] = (e[r.difficulty] ?? 0) + 1
  e.src[fam] = (e.src[fam] ?? 0) + 1
  if (r.family === 'isee' && r.difficulty === 'easy') e.g8cand++
}

const out = { liveRows: rows.length, considered, fiveChoiceExcluded: fiveChoice, verbalAdjacentExcluded: adjacent, subjects: {} }
for (const [subj, areas] of Object.entries(AREAS)) {
  const strands = {}
  for (const k of Object.keys(cell).filter(k => k.startsWith(subj + '|'))) {
    const s = k.split('|')[1]; const e = cell[k]
    strands[s] = { total: e.easy + e.medium + e.hard, easy: e.easy, medium: e.medium, hard: e.hard, grade8Candidates: e.g8cand, sources: e.src }
  }
  for (const a of areas) strands[a] ??= { total: 0, easy: 0, medium: 0, hard: 0, grade8Candidates: 0, sources: {} }
  // MAP areas: 3 per subject except math (4). Mechanics is ONE area made of three sub-strands.
  let areaTotals
  if (subj === 'language') areaTotals = {
    'Writing: Purpose and Audience': strands['Writing: Purpose and Audience'].total,
    'Grammar and Usage': strands['Grammar and Usage'].total,
    'Mechanics (Punct+Cap+Spell)': strands['Mechanics: Punctuation'].total + strands['Mechanics: Capitalization'].total + strands['Mechanics: Spelling'].total,
  }
  else areaTotals = Object.fromEntries(areas.map(a => [a, strands[a].total]))
  const perArea = subj === 'math' ? 10 : 13
  const formsByDivision = Math.floor(Object.values(areaTotals).reduce((a, b) => a + b, 0) / (perArea * Object.keys(areaTotals).length))
  const formsByArea = Math.min(...Object.values(areaTotals).map(t => Math.floor(t / perArea)))
  out.subjects[subj] = { strands, areaTotals, perArea, formsByDivision, formsByThinnestArea: formsByArea }
}

if (args.includes('--json')) { console.log(JSON.stringify(out, null, 1)); process.exit(0) }
console.log(`live rows read ${out.liveRows}; four-choice rows mapped ${considered}; SSAT five-choice reading/math excluded ${fiveChoice}; ISEE/SSAT verbal (not a MAP format) excluded ${adjacent}`)
console.log('All counts land in the TOP product band (grades 9-11). No RIT is assigned.\n')
for (const [subj, s] of Object.entries(out.subjects)) {
  console.log(`== ${subj}  (${s.perArea} per area per form)`)
  for (const [k, v] of Object.entries(s.strands).sort((a, b) => b[1].total - a[1].total))
    console.log(`   ${k.padEnd(36)} ${String(v.total).padStart(5)}   easy ${String(v.easy).padStart(4)} med ${String(v.medium).padStart(4)} hard ${String(v.hard).padStart(4)}   g8-cand ${String(v.grade8Candidates).padStart(3)}   ${JSON.stringify(v.sources)}`)
  console.log(`   areas: ${JSON.stringify(s.areaTotals)}`)
  console.log(`   forms by division ${s.formsByDivision}; forms by thinnest area ${s.formsByThinnestArea}\n`)
}
