#!/usr/bin/env node
/**
 * insert-map-lu.mjs — insert the map-lu-mech-v1 pilot-pass items STAGED (verified=false).
 * MAP-LU-MECH-V1.prereg.md §"If the batch passes". Nothing here verifies anything: MAP is not a
 * shipped family, and a staged row is ignored by the assembler until a person releases it.
 *
 *   node scripts/study-bank/insert-map-lu.mjs build            write map-lu-mech-v1.inserted.batch.json, print its sha256
 *   node scripts/study-bank/insert-map-lu.mjs insert [--commit] gateBatch (ledger + stem duplicates), then insert (dry run without --commit)
 *
 * Rows take the choice ORDER the with-source graders saw (ws.key.json), so stored content is measured
 * content. Difficulty = mean of the two cold graders' (grade_assigned - grade_target): <= -1 easy,
 * >= +1 hard, else medium. Refuses on: stages.json not PASS, an item without both grader labels, a
 * key not among choices, a content_hash already in the bank, or rows already in the cohort.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { gateBatch, explain } from './gate.mjs'

const D = 'scripts/study-bank/', W = D + 'map-lu-mech-v1/', OUT = D + 'map-lu-mech-v1.inserted.batch.json', COHORT = 'map-lu-mech-v1'
const die = m => { console.error(`REFUSING: ${m}`); process.exit(2) }
const rd = p => { if (!existsSync(p)) die(`missing ${p}`); return JSON.parse(readFileSync(p, 'utf8')) }
const norm = s => String(s ?? '').toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim()
const hashOf = ({ passage, prompt, choices }) => createHash('md5').update([norm(passage), norm(prompt), (choices || []).map(norm).join('|')].join('~~')).digest('hex')

const mode = process.argv[2]
if (mode === 'build') {
  const st = rd(W + 'stages.json')
  if (st.verdict !== 'PASS') die(`stages.json verdict ${st.verdict}`)
  const frozen = Object.fromEntries(rd(D + 'map-lu-mech-v1.batch.json').map(i => [i.id, i]))
  const wkey = rd(W + 'ws.key.json'), ga = rd(W + 'ws.grader-a.json'), gb = rd(W + 'ws.grader-b.json')
  const items = []
  for (const [n, k] of Object.entries(wkey)) {
    if (!st.passIds.includes(k.localId)) continue
    const it = frozen[k.localId]
    if (!ga[n] || !gb[n]) die(`${k.localId}: missing a grader label`)
    if (!k.choices.includes(it.correct_answer) || new Set(k.choices).size !== 4) die(`${k.localId}: rendered choices do not hold the key`)
    const off = ((+ga[n].grade_assigned - it.grade_target) + (+gb[n].grade_assigned - it.grade_target)) / 2
    items.push({
      id: it.id, type: 'multiple_choice', blanks: null, stem_is_instruction: true, prompt: it.prompt, choices: k.choices, graphic: null, passage: null,
      difficulty: off <= -1 ? 'easy' : off >= 1 ? 'hard' : 'medium', explanation: it.explanation, correct_answer: it.correct_answer,
      passageGroupId: null, correct_answers: null, acceptable_answers: null,
      distractor_rationales: k.choices.filter(c => c !== it.correct_answer).map(c => ({ choice: c, reason: it.student_error?.[c] ?? '' })),
      map: { area: it.map_area, strand: it.map_strand, grade_target: it.grade_target, ccss: it.ccss, error_sites: it.error_sites, rule: it.cap_rule ?? it.punct_rule ?? it.varied_dimension, grade_assigned: { a: +ga[n].grade_assigned, b: +gb[n].grade_assigned } },
    })
  }
  if (items.length !== st.passIds.length) die(`built ${items.length} of ${st.passIds.length} pass items`)
  writeFileSync(OUT, JSON.stringify(items, null, 1) + '\n')
  console.log(`${items.length} items -> ${OUT}; sha256 ${createHash('sha256').update(readFileSync(OUT)).digest('hex')}`)
  console.log(`difficulty ${['easy', 'medium', 'hard'].map(d => `${d} ${items.filter(i => i.difficulty === d).length}`).join(' / ')}; key slots ${items.map(i => 'ABCD'[i.choices.indexOf(i.correct_answer)]).join('')}`)
} else if (mode === 'insert') {
  const commit = process.argv.includes('--commit')
  const g = gateBatch({ task: 'multiple_choice', family: 'map', section: 'language', itemFiles: [OUT] })
  console.log(`gate (${g.family}, ledger ${g.batch ?? 'none'}): ${g.canInsert ? 'PASS' : 'REFUSED'} - ${g.reason}`)
  if (!g.canInsert) process.exit(2)
  const items = rd(OUT)
  const rows = items.map(({ id, map, ...item }) => ({
    family: 'map', section: 'language', domain: map.area, subskill: map.strand, difficulty: item.difficulty, topic_tag: map.strand,
    item_type: 'multiple_choice', task: 'multiple_choice', passage_group_id: null, item, content_hash: hashOf(item),
    word_count: item.correct_answer.split(/\s+/).filter(Boolean).length, verified: false, source: 'hand', cohort: COHORT,
    verify_meta: {
      method: 'map-lu-mech-v1: claude-authored 2x2 grid; two teacher-voice raters + one rewrite; exact checks E1/E3/E5-E7/E9/G/T1; options-only vs matched live control; two Claude graders cold then keyed',
      staged: true, release: 'NOT released. MAP is not a shipped family; a person releases (human sitting, decision rule fixed before the draw). Never verified=true from a script.',
      localId: id, map, prereg: 'scripts/study-bank/MAP-LU-MECH-V1.prereg.md', result: 'scripts/study-bank/MAP-LU-MECH-V1-RESULT.md', contentSha: g.sha,
    },
  }))
  const { createClient } = await import('@supabase/supabase-js')
  const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const { data: dup, error: e1 } = await db.from('study_item_bank').select('id,cohort').in('content_hash', rows.map(r => r.content_hash))
  if (e1) die(e1.message)
  if (dup.length) die(`${dup.length} content_hash already in the bank (${dup.map(d => d.cohort).join(',')})`)
  const { data: same, error: e2 } = await db.from('study_item_bank').select('id').eq('cohort', COHORT)
  if (e2) die(e2.message)
  if (same.length) die(`cohort ${COHORT} already has ${same.length} rows`)
  console.log(`${rows.length} rows ready: family map, section language, verified=false, cohort ${COHORT}`)
  if (!commit) { console.log('DRY RUN: nothing inserted (pass --commit)'); process.exit(0) }
  const { data: ins, error: e3 } = await db.from('study_item_bank').insert(rows).select('id,verified,cohort,difficulty')
  if (e3) die(e3.message)
  console.log(`INSERTED ${ins.length} rows, verified=${[...new Set(ins.map(r => r.verified))].join(',')}`)
  void explain
} else die('usage: insert-map-lu.mjs build | insert [--commit]')
