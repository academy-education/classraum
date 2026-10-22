// ssat-verbal-draft-1: 48 analogies + 18 synonyms written in-session by Claude under the owner's 2026-10-22 rule
// "allow live words in new pairs" (every stem, key and distractor PAIR is absent from all 665 SSAT verbal rows;
// synonym headwords are unused as headwords in SSAT+ISEE). Staged verified=false for the co-founder's sitting.
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
const die = m => { console.error('REFUSING: ' + m); process.exit(2) }
const commit = process.argv.includes('--commit')
const COHORT = 'ssat-verbal-draft-1'
const norm = s => String(s ?? '').toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim()
const hashOf = ({ passage, prompt, choices }) => createHash('md5').update([norm(passage), norm(prompt), (choices || []).map(norm).join('|')].join('~~')).digest('hex')
const items = JSON.parse(readFileSync('items.json', 'utf8'))
if (items.length !== 66) die('expected 66')
const rows = items.map(x => {
  const it = x.item
  if (it.choices.length !== 5 || new Set(it.choices).size !== 5 || !it.choices.includes(it.correct_answer)) die(`${x.localId} shape`)
  if (Object.keys(it.distractor_rationales).length !== 4) die(`${x.localId} rationales`)
  return { family: 'ssat', section: 'verbal', domain: 'Verbal', subskill: x.subskill, task: 'multiple_choice', topic_tag: x.subskill, item_type: 'multiple_choice',
    difficulty: x.difficulty, passage_group_id: null, item: it, content_hash: hashOf(it), word_count: null, verified: false, archived: false, source: 'hand', cohort: COHORT,
    verify_meta: { draft: { status: 'awaiting_sitting', localId: x.localId, note: 'Written in-session by Claude 2026-10-22 under the owner rule "allow live words in new pairs". No AI attack or grader (no agents). Release only by the co-founder sitting (ssat-verbal-draft-1.RELEASE.PREREG.md).' } } }
})
if (new Set(rows.map(r => r.content_hash)).size !== rows.length) die('dup hash')
const txt = JSON.stringify({ cohort: COHORT, created: '2026-10-22', rows }, null, 1) + '\n'
writeFileSync('../../scripts/study-bank/ssat-verbal-draft-1.batch.json', txt)
console.log('batch sha256', createHash('sha256').update(txt).digest('hex'))
const env = Object.fromEntries(readFileSync('../../.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data: same } = await db.from('study_item_bank').select('id').eq('cohort', COHORT); if (same?.length) die(`cohort has ${same.length} rows`)
const { data: dup } = await db.from('study_item_bank').select('id').in('content_hash', rows.map(r => r.content_hash)); if (dup?.length) die(`${dup.length} hashes already in bank`)
if (!commit) { console.log('DRY RUN ok:', rows.length, 'rows'); process.exit(0) }
const { data, error } = await db.from('study_item_bank').insert(rows).select('id,verified'); if (error) die(error.message)
console.log(`INSERTED ${data.length}, verified=${[...new Set(data.map(r => r.verified))]}`)
