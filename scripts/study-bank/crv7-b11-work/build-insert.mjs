// crv7-b11 (cohort cr-v15): 35 Choose a Response items (40 authored by 2 agents, 5 dropped by the co-founder-standard grader), crv7 four-world method, seeded post-hoc selection
// (render-crv7.mjs, seed offset 1100). Staged verified=false for the co-founder's sitting.
// Row shape copied from the live cr-v7 rows; content_hash = toefl-bank-helper hashListening.
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
const die = m => { console.error('REFUSING: ' + m); process.exit(2) }
const commit = process.argv.includes('--commit')
const COHORT = 'cr-v15'
const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const stripStem = t => norm(String(t || '').replace(/^\s*\[[^\]]*\]\s*/, '').replace(/^\s*(according to|based on)\s+the\s+passage\s*,?\s*/i, ''))
const hashListening = it => createHash('md5').update([norm(it.passage), stripStem(it.prompt), (it.choices || []).map(norm).sort().join('|')].join('~~')).digest('hex')
// Author's grade, not the renderer's blanket 'hard': easy = the reply follows directly from the line;
// medium = the line implies a problem or condition the reply must address.
// medium = the line creates a problem or condition the reply must address (realised kind); easy otherwise
const MEDIUM_KINDS = new Set(['bad news', 'correction', 'neutral info', 'request'])
const items = JSON.parse(readFileSync('../../scripts/study-bank/crv7-b11.items.json', 'utf8'))
const DROP = new Set(['cr15-b15', 'cr15-a11', 'cr15-b02', 'cr15-a16', 'cr15-b17'])
const rows = items.filter(x => !DROP.has(x._crv7.localId)).map(x => {
  const localId = x._crv7.localId
  const difficulty = MEDIUM_KINDS.has(x._crv7.kind) ? 'medium' : 'easy'
  const it = { type: 'multiple_choice', prompt: x.prompt, choices: x.choices, passage: x.passage, difficulty, explanation: x.explanation,
    listeningTask: 'choose_response', correct_answer: x.correct_answer, passageGroupId: null, distractor_rationales: x.distractor_rationales }
  if (!it.choices.includes(it.correct_answer) || it.choices.length !== 4) die(`${localId} shape`)
  if (Object.keys(it.distractor_rationales).length !== 3) die(`${localId} rationales`)
  return { family: 'toefl', section: 'listening', domain: 'Choose a Response', subskill: null, task: 'choose_response', item_type: 'multiple_choice',
    difficulty, topic_tag: 'choose_response', passage_group_id: null, item: it, content_hash: hashListening(it),
    word_count: x.passage.replace(/^\s*transcript:\s*/i, '').replace(/"/g, '').split(/\s+/).filter(Boolean).length,
    verified: false, archived: false, source: 'hand', cohort: COHORT,
    verify_meta: { method: 'crv7-symmetric-worlds+seeded-key', source: 'crv7', localId, ...x._crv7, passage_needed: true,
      draft: { status: 'awaiting_sitting', note: 'Written in-session by Claude 2026-10-22 (crv7 batch 9, seed offset 1100). No AI attack run (no agents). Release only by the co-founder sitting (crv7-b9.RELEASE.PREREG.md).' } } }
})
if (rows.length !== 35 || new Set(rows.map(r => r.content_hash)).size !== 35) die('expected 35 distinct')
const txt = JSON.stringify({ cohort: COHORT, created: '2026-10-22', rows }, null, 1) + '\n'
writeFileSync('../../scripts/study-bank/crv7-b11.batch.json', txt)
console.log('batch sha256', createHash('sha256').update(txt).digest('hex'))
const env = Object.fromEntries(readFileSync('../../.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data: same } = await db.from('study_item_bank').select('id').eq('cohort', COHORT); if (same?.length) die(`cohort has ${same.length} rows`)
const { data: dup } = await db.from('study_item_bank').select('id').eq('family', 'toefl').in('content_hash', rows.map(r => r.content_hash)); if (dup?.length) die(`${dup.length} hashes already in bank`)
// Same spoken line as a live item = a near-duplicate stimulus.
const { data: live } = await db.from('study_item_bank').select('item').eq('task', 'choose_response').eq('archived', false)
const livePass = new Set((live || []).map(r => norm(r.item?.passage)))
const clash = rows.filter(r => livePass.has(norm(r.item.passage))); if (clash.length) die(`${clash.length} spoken lines already live`)
const d = {}; rows.forEach(r => d[r.difficulty] = (d[r.difficulty] || 0) + 1)
if (!commit) { console.log('DRY RUN ok:', rows.length, 'rows', JSON.stringify(d), 'checked against', livePass.size, 'live lines'); process.exit(0) }
const { data, error } = await db.from('study_item_bank').insert(rows).select('id,verified'); if (error) die(error.message)
console.log(`INSERTED ${data.length}, verified=${[...new Set(data.map(r => r.verified))]}`)
