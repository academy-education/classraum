#!/usr/bin/env node
/**
 * insert-ssat-wv.mjs — insert a WV batch that passed every pre-registered stage, STAGED (verified=false).
 * READING-BATCH-WV6-2026-10-07.prereg.md §"If every stage passes". Nothing here verifies anything: a staged row
 * is ignored by the assembler until a person releases it (human read first; bank-gate §5).
 *
 *   node insert-ssat-wv.mjs <batch dir> <cohort> <stages.json> [--commit]     (dry run without --commit)
 *
 * Rows take the choice ORDER the stage-1 graders saw (withsource.json), so the stored content is the measured
 * content (content_sha binds choice order). Serving reshuffles per session anyway (assemble.ts shuffleChoices).
 * Difficulty = the two stage-1 graders' mean rank (<= 1.5 easy, >= 2.5 hard, else medium), the F definition.
 * Refuses on: a missing file, an item without both grader labels, a key not among choices, a duplicate
 * content_hash already in the bank, or any stage in stages.json that is not PASS.
 */
import { readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'

const die = m => { console.error(`REFUSING: ${m}`); process.exit(2) }
const rd = p => { if (!existsSync(p)) die(`missing ${p}`); return JSON.parse(readFileSync(p, 'utf8')) }
const norm = s => String(s ?? '').toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim()
const hashOf = ({ passage, prompt, choices }) => createHash('md5').update([norm(passage), norm(prompt), (choices || []).map(norm).join('|')].join('~~')).digest('hex')
const RANK = { easy: 1, medium: 2, hard: 3 }

const [dir, cohort, stagesFile] = process.argv.slice(2), commit = process.argv.includes('--commit')
if (!dir || !cohort || !stagesFile) die('usage: insert-ssat-wv.mjs <batch dir> <cohort> <stages.json> [--commit]')
const stages = rd(stagesFile)
const notPass = Object.entries(stages.verdicts ?? {}).filter(([, v]) => v !== 'PASS')
if (!Object.keys(stages.verdicts ?? {}).length || notPass.length) die(`stages not all PASS: ${JSON.stringify(stages.verdicts)}`)
const batch = rd(join(dir, 'batch.json')), draw = rd(join(dir, 'draw.json')), key = rd(join(dir, 'attack.key.json')), ws = rd(join(dir, 'withsource.json'))
const ga = rd(join(dir, 'ws-a.json')).labels, gb = rd(join(dir, 'ws-b.json')).labels
const wsQ = Object.fromEntries(ws.flatMap(p => p.questions.map(q => [q.qid, q])))
const rows = batch.map(it => {
  const qid = Object.keys(key).find(q => key[q].pop === 'withsource' && key[q].src === it.id)
  if (!qid) die(`${it.id}: not in the with-source render`)
  const q = wsQ[qid], choices = 'ABCDE'.split('').map(L => q.options[L])
  if (!choices.includes(it.correct_answer) || new Set(choices).size !== 5) die(`${it.id}: rendered choices do not hold the key`)
  if (!ga[qid] || !gb[qid]) die(`${it.id}: missing a grader label`)
  const mean = (RANK[ga[qid].difficulty] + RANK[gb[qid].difficulty]) / 2
  const difficulty = mean <= 1.5 ? 'easy' : mean >= 2.5 ? 'hard' : 'medium'
  const item = {
    type: 'multiple_choice', blanks: null, prompt: it.prompt, choices, graphic: null, passage: it.passage, difficulty,
    explanation: it.explanation, correct_answer: it.correct_answer, passageGroupId: it.passageGroupId,
    correct_answers: null, acceptable_answers: null,
    distractor_rationales: choices.filter(c => c !== it.correct_answer).map(c => ({ choice: c, reason: it.kills?.[c] ? `The passage: "${it.kills[c]}"` : '' })),
  }
  return {
    family: 'ssat', section: 'reading', domain: 'Reading Comprehension', subskill: it.subskill, difficulty, topic_tag: it.subskill,
    item_type: 'multiple_choice', task: 'multiple_choice', passage_group_id: it.passageGroupId, item, content_hash: hashOf(item),
    word_count: it.passage.split(/\s+/).filter(Boolean).length, verified: false, source: 'hand', cohort,
    verify_meta: {
      method: 'whole-passage five-version (WV6) + NAEP lure brief; claude-authored; claude graders', staged: true,
      release: 'NOT released. Human read required before release; the human sitting is the verdict for a verbal cohort (bank-gate section 5).',
      unit: it.set_id, version_drawn: it.version, frozenSha: draw.frozenSha, seed: draw.seed,
      stage1_grader_labels: { a: ga[qid], b: gb[qid] }, grader_mean_rank: mean,
      stages, prereg: 'scripts/study-bank/READING-BATCH-WV6-2026-10-07.prereg.md',
    },
  }
})
console.log(`${rows.length} rows, cohort ${cohort}; difficulty ${['easy', 'medium', 'hard'].map(d => `${d} ${rows.filter(r => r.difficulty === d).length}`).join(' / ')}; key slots ${rows.map(r => 'ABCDE'[r.item.choices.indexOf(r.item.correct_answer)]).join('')}`)
const { createClient } = await import('@supabase/supabase-js')
const env = Object.fromEntries(readFileSync(process.cwd() + '/.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data: dup, error: e1 } = await db.from('study_item_bank').select('id,content_hash,cohort').in('content_hash', rows.map(r => r.content_hash))
if (e1) die(e1.message)
if (dup.length) die(`${dup.length} content_hash already in the bank (${dup.map(d => d.cohort).join(',')})`)
const { data: same, error: e2 } = await db.from('study_item_bank').select('id').eq('cohort', cohort)
if (e2) die(e2.message)
if (same.length) die(`cohort ${cohort} already has ${same.length} rows`)
if (!commit) { console.log('DRY RUN: nothing inserted (pass --commit)'); process.exit(0) }
const { data: ins, error: e3 } = await db.from('study_item_bank').insert(rows).select('id,verified,cohort,difficulty')
if (e3) die(e3.message)
console.log(`INSERTED ${ins.length} rows, verified=${[...new Set(ins.map(r => r.verified))].join(',')}: ${ins.map(r => r.id.slice(0, 8)).join(' ')}`)
