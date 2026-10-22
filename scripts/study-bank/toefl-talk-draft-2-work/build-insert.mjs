// toefl-conv-draft-1: the Sept toefl-conv-v5/v6 two-question conversations (never gated, never banked),
// gender references fixed to the app's voice order, staged verified=false for the co-founder's sitting.
// Row shape and content_hash copied from toefl-bank-helper.mjs insert-listening (hashListening, pg-<md5> group id).
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
const die = m => { console.error('REFUSING: ' + m); process.exit(2) }
const commit = process.argv.includes('--commit')
const COHORT = 'toefl-talk-draft-2'
const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const stripStem = t => norm(String(t || '').replace(/^\s*\[[^\]]*\]\s*/, '').replace(/^\s*(according to|based on)\s+the\s+passage\s*,?\s*/i, ''))
const hashListening = it => createHash('md5').update([norm(it.passage), stripStem(it.prompt), (it.choices || []).map(norm).sort().join('|')].join('~~')).digest('hex')
const items = JSON.parse(readFileSync('items.json', 'utf8'))
if (items.length !== 48) die('expected 48')
const rows = items.map(x => {
  const pg = 'pg-' + createHash('md5').update(String(x.passage).toLowerCase().replace(/\s+/g, ' ').trim()).digest('hex')
  const it = { id: x.id, type: 'multiple_choice', blanks: null, graphic: null, passage: x.passage, passageGroupId: pg, prompt: x.prompt,
    choices: x.choices, correct_answer: x.correct_answer, correct_answers: null, acceptable_answers: null, difficulty: x.difficulty,
    listeningTask: 'academic_talk', explanation: x.explanation, distractor_rationales: x.distractor_rationales }
  if (!it.choices.includes(it.correct_answer) || it.choices.length !== 4) die(`${x.id} shape`)
  return { family: 'toefl', section: 'listening', domain: 'Academic Talk', subskill: null, task: 'academic_talk', item_type: 'multiple_choice',
    difficulty: x.difficulty, topic_tag: 'academic_talk', passage_group_id: null, item: it, content_hash: hashListening(it),
    word_count: x.passage.replace(/^\s*transcript:\s*/i, '').split(/\s+/).filter(Boolean).length,
    verified: false, archived: false, source: 'hand', cohort: COHORT,
    verify_meta: { draft: { status: 'awaiting_sitting', origin: x.passageGroupId, note: 'Written by Claude agents 2026-10-22 for the upper/hard band (medium/hard lectures); co-founder-standard grader before any sitting. Release by the option-2 spot route (toefl-talk-draft-2.RELEASE.PREREG.md).' } } }
})
const groups = new Map(); rows.forEach(r => groups.set(r.item.passageGroupId, (groups.get(r.item.passageGroupId) || 0) + 1))
if ([...groups.values()].some(n => n !== 4) || groups.size !== 12) die('groups must be 12 x 4')
if (new Set(rows.map(r => r.content_hash)).size !== 48) die('dup hash in batch')
const txt = JSON.stringify({ cohort: COHORT, created: '2026-10-22', rows }, null, 1) + '\n'
writeFileSync('../../scripts/study-bank/toefl-talk-draft-2.batch.json', txt)
console.log('batch sha256', createHash('sha256').update(txt).digest('hex'))
const env = Object.fromEntries(readFileSync('../../.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data: same } = await db.from('study_item_bank').select('id').eq('cohort', COHORT); if (same?.length) die(`cohort has ${same.length} rows`)
const { data: dup } = await db.from('study_item_bank').select('id').eq('family', 'toefl').in('content_hash', rows.map(r => r.content_hash)); if (dup?.length) die(`${dup.length} hashes already in bank`)
if (!commit) { console.log('DRY RUN ok: 20 rows, 5 four-question lectures'); process.exit(0) }
const { data, error } = await db.from('study_item_bank').insert(rows).select('id,verified'); if (error) die(error.message)
console.log(`INSERTED ${data.length}, verified=${[...new Set(data.map(r => r.verified))]}`)
