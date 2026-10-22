// ssat-reading-draft-3: the two passages held at release (release-ssat-reading-draft3-2026-10-22.mjs) for factual
// errors the co-founder named in his sitting notes, fixed with his own suggested wording and released.
// Owner approval, 2026-10-22: "1. Approve it."
//   D3-P01 (soccer): offside was called on the forward's own kick; offside is judged when a teammate passes.
//                    Passage sentence + item 2's key and explanation change.
//   D3-P06 (goldfish): last sentence said the myth "was invented to justify" round bowls after "its origin is a mystery".
// His "Only defensible" verdicts were given on the earlier text, so these 12 reviews become stale (migration 076) and are
// not scored; the release basis is recorded as the owner-approved fix, as with the v6 conversations (c2bc613c).
//   node scripts/study-bank/fixes/ssat-draft3-held-passages-2026-10-22.mjs [--apply]
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
const APPLY = process.argv.includes('--apply')
const refuse = m => { console.error('REFUSING: ' + m); process.exit(2) }
const S1_OLD = "a Hornets forward kicked the ball past the Rockets' goalkeeper while standing well past the last defender."
const S1_NEW = 'a Hornets forward took a pass from a teammate while standing between the last Rockets defender and the goal, and kicked the ball past the goalkeeper.'
const K_OLD = 'was past the last defender when he kicked'
const K_NEW = 'was past the last defender when a teammate passed to him'
const E_NEW = `"${K_NEW}" is correct: he "took a pass from a teammate while standing between the last Rockets defender and the goal," and the narrator "raised my arm for offside."`
const S6_OLD = 'along with the round bowl it was invented to justify.'
const S6_NEW = 'along with the round bowl it has so often been used to justify.'
const GROUPS = { 'draft3-D3-P01': [S1_OLD, S1_NEW], 'draft3-D3-P06': [S6_OLD, S6_NEW] }
const norm = s => String(s ?? '').toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim()
const hashOf = it => createHash('md5').update([norm(it.passage), norm(it.prompt), (it.choices || []).map(norm).join('|')].join('~~')).digest('hex')
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const { data: rows, error } = await db.from('study_item_bank').select('id,cohort,verified,archived,passage_group_id,verify_meta,item').in('passage_group_id', Object.keys(GROUPS))
if (error) refuse(error.message)
if (rows.length !== 12) refuse(`expected 12 rows, got ${rows.length}`)
if (rows.some(r => r.cohort !== 'ssat-reading-draft-3' || r.verified || r.archived)) refuse('a row is not a staged draft-3 row')
const { data: rv } = await db.from('study_item_reviews').select('item_id,verdict').eq('run_id', 'ssat-draft3-release-cofounder-2026-10-22').in('item_id', rows.map(r => r.id))
if (rv.length !== 12 || rv.some(r => r.verdict !== 'unique')) refuse('every held row must carry an "Only defensible" verdict from the sitting')

const bp = 'scripts/study-bank/ssat-reading-draft-3.batch.json'
const batch = JSON.parse(readFileSync(bp, 'utf8'))
const plan = []
for (const r of rows) {
  const [oldS, newS] = GROUPS[r.passage_group_id]
  if (!r.item.passage.includes(oldS)) refuse(`${r.id}: passage sentence not found`)
  const item = { ...r.item, passage: r.item.passage.replace(oldS, newS) }
  if (r.item.correct_answer === K_OLD) {
    item.choices = r.item.choices.map(c => (c === K_OLD ? K_NEW : c))
    item.correct_answer = K_NEW
    item.explanation = E_NEW
  }
  const br = batch.rows.find(b => b.item.passage === r.item.passage && b.item.prompt === r.item.prompt)
  if (!br) refuse(`${r.id}: batch row not found`)
  plan.push({ r, item, br })
}
if (plan.filter(p => p.item.correct_answer === K_NEW).length !== 1) refuse('expected exactly one key change')
for (const p of plan) console.log(`${p.r.verify_meta?.draft?.qid}  ${p.r.content_hash ?? ''} -> ${hashOf(p.item)}${p.item.correct_answer === K_NEW ? '  (key changed)' : ''}`)
if (!APPLY) { console.log('DRY RUN ok: 12 rows'); process.exit(0) }

for (const { r, item, br } of plan) {
  const meta = { ...r.verify_meta, human_sitting: 'ssat-draft3-release-cofounder-2026-10-22', sitting_verdict: 'unique', released_at: '2026-10-22',
    release_basis: 'held at release for a factual error named in the co-founder notes; fixed with his suggested wording; owner approved 2026-10-22 ("Approve it"). Review is on the earlier text (stale).',
    owner_fix: { at: '2026-10-22', before: { passage_sentence: GROUPS[r.passage_group_id][0], ...(item.correct_answer === K_NEW ? { key: K_OLD } : {}) } } }
  const { error: e } = await db.from('study_item_bank').update({ item, content_hash: hashOf(item), verified: true, verify_meta: meta }).eq('id', r.id).eq('verified', false).eq('archived', false)
  if (e) refuse(`write failed on ${r.id}: ${e.message}`)
  br.item = item; br.content_hash = hashOf(item)
}
const txt = JSON.stringify(batch, null, 1) + '\n'; writeFileSync(bp, txt)
console.log('applied: 12 fixed and released; new batch sha256', createHash('sha256').update(txt).digest('hex'))
