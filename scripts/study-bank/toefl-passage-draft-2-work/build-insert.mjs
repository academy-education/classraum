// toefl-passage-draft-2: 6 medium/hard five-question Academic Passages for the upper/hard Reading band
// (Academic Passage binds it at 20). Staged verified=false for the co-founder's sitting.
// Row shape copied from live academic_passage rows; content_hash = toefl-bank-helper hashListening;
// stored choice order = what students see (TOEFL rows are not shuffled at draw), so keys are dealt flat here.
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
const die = m => { console.error('REFUSING: ' + m); process.exit(2) }
const commit = process.argv.includes('--commit')
const COHORT = 'toefl-passage-draft-2'
const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const stripStem = t => norm(String(t || '').replace(/^\s*\[[^\]]*\]\s*/, '').replace(/^\s*(according to|based on)\s+the\s+passage\s*,?\s*/i, ''))
const hashListening = it => createHash('md5').update([norm(it.passage), stripStem(it.prompt), (it.choices || []).map(norm).sort().join('|')].join('~~')).digest('hex')
let s = parseInt(createHash('sha256').update(COHORT).digest('hex').slice(0, 8), 16)
const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296 }
const sh = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }
const items = JSON.parse(readFileSync('items.json', 'utf8'))
if (items.length !== 30) die('expected 30')
const slots = sh(items.map((_, i) => i % 4))
const rows = items.map((x, n) => {
  const pg = 'pg-' + createHash('md5').update(String(x.passage).toLowerCase().replace(/\s+/g, ' ').trim()).digest('hex')
  const others = sh(x.choices.filter(c => c !== x.correct_answer)); const choices = []
  for (let k = 0; k < 4; k++) choices.push(k === slots[n] ? x.correct_answer : others.pop())
  const it = { id: x.id, type: 'multiple_choice', blanks: null, graphic: null, section: 'reading', passage: x.passage, passageGroupId: pg, prompt: x.prompt,
    choices, correct_answer: x.correct_answer, correct_answers: null, acceptable_answers: null, difficulty: x.difficulty,
    readingTask: 'academic_passage', explanation: x.explanation, distractor_rationales: x.distractor_rationales }
  if (new Set(it.choices).size !== 4 || !it.choices.includes(it.correct_answer)) die(`${x.id} shape`)
  if (/\b(option|choice) [A-D]\b/i.test(it.explanation)) die(`${x.id} explanation names a letter`)
  return { family: 'toefl', section: 'reading', domain: 'Academic Passage', subskill: null, task: 'academic_passage', item_type: 'multiple_choice',
    difficulty: x.difficulty, topic_tag: 'academic_passage', passage_group_id: pg, item: it, content_hash: hashListening(it),
    word_count: x.passage.split(/\s+/).filter(Boolean).length,
    verified: false, archived: false, source: 'hand', cohort: COHORT,
    verify_meta: { draft: { status: 'awaiting_sitting', origin: x.passageGroupId, note: 'Written by a Claude agent 2026-10-22 for the upper/hard Reading band (220-252 words); co-founder-standard grader before any sitting. Release by the option-2 spot route (toefl-passage-draft-2.RELEASE.PREREG.md).' } } }
})
const groups = new Map(); rows.forEach(r => groups.set(r.item.passageGroupId, (groups.get(r.item.passageGroupId) || 0) + 1))
if ([...groups.values()].some(n => n !== 5) || groups.size !== 6) die('groups must be 6 x 5')
if (new Set(rows.map(r => r.content_hash)).size !== 30) die('dup hash in batch')
const ks = [0, 0, 0, 0]; rows.forEach(r => ks[r.item.choices.indexOf(r.item.correct_answer)]++)
const txt = JSON.stringify({ cohort: COHORT, created: '2026-10-22', rows }, null, 1) + '\n'
writeFileSync('../../scripts/study-bank/toefl-passage-draft-2.batch.json', txt)
console.log('batch sha256', createHash('sha256').update(txt).digest('hex'), 'key slots', ks.join('/'))
const env = Object.fromEntries(readFileSync('../../.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data: same } = await db.from('study_item_bank').select('id').eq('cohort', COHORT); if (same?.length) die(`cohort has ${same.length} rows`)
const { data: dup } = await db.from('study_item_bank').select('id').eq('family', 'toefl').in('content_hash', rows.map(r => r.content_hash)); if (dup?.length) die(`${dup.length} hashes already in bank`)
if (!commit) { console.log('DRY RUN ok: 30 rows, 6 five-question passages'); process.exit(0) }
const { data, error } = await db.from('study_item_bank').insert(rows).select('id,verified'); if (error) die(error.message)
console.log(`INSERTED ${data.length}, verified=${[...new Set(data.map(r => r.verified))]}`)
