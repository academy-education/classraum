// LIVE edit (owner-approved 2026-10-22): contractions + two consistency rewrites on the 6 released v6 conversations in toefl-conv-draft-1 (co-founder note,
// run 2: v6 transcripts have no contractions and sound scripted). Passage + explanation + rationale
// reasons only (options are not speech). Sentence-final "it is"/"that is" are left alone. Live rows only.
// row that has a review. Snapshot first. Dry run by default; --write to apply.
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const W = process.argv.includes('--write')
const env = Object.fromEntries(readFileSync(new URL('../../../.env.local', import.meta.url), 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const refuse = m => { console.error('REFUSING: ' + m); process.exit(2) }
const RULES = [
  [/\b(do|does|did|is|are|was|were|would|could|should|has|have|had) not\b/gi, (m, v) => v + "n't"],
  [/\bwill not\b/gi, m => (m[0] === 'W' ? 'Won' : 'won') + "'t"], [/\bcannot\b/gi, m => (m[0] === 'C' ? 'Can' : 'can') + "'t"],
  [/\bI am\b(?=\s+\w)/g, "I'm"], [/\bI will\b(?=\s+\w)/g, "I'll"], [/\bI would\b(?=\s+\w)/g, "I'd"], [/\bI have (?=been|done|seen|heard|got|had|never|written|told|checked)/g, "I've "],
  [/\b(you|we|they) (are|will|would)\b(?=\s+\w)/gi, (m, p, v) => p + ({ are: "'re", will: "'ll", would: "'d" })[v.toLowerCase()]],
  [/(?<!\bin )\b(it|that|there|what|he|she) is\b(?=\s+[a-z])/gi, (m, p) => p + "'s"], [/\b[Ll]et us\b/g, m => (m[0] === 'L' ? 'Let' : 'let') + "'s"],
]
const contract = s => RULES.reduce((t, [re, rep]) => t.replace(re, rep), s)
const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const stripStem = t => norm(String(t || '').replace(/^\s*\[[^\]]*\]\s*/, '').replace(/^\s*(according to|based on)\s+the\s+passage\s*,?\s*/i, ''))
const hashListening = it => createHash('md5').update([norm(it.passage), stripStem(it.prompt), (it.choices || []).map(norm).sort().join('|')].join('~~')).digest('hex')
const { data: rows, error } = await db.from('study_item_bank').select('id,item,verified,archived,verify_meta,content_hash').eq('cohort', 'toefl-conv-draft-1').eq('verified', true).eq('archived', false)
if (error) refuse(error.message)
const LIVE = ['v6-03', 'v6-04', 'v6-06', 'v6-11', 'v6-12', 'v6-13']
const v6 = rows.filter(r => LIVE.some(s => (r.verify_meta?.draft?.origin || '').endsWith(s)))
if (v6.length !== 12) refuse(`expected 12 live rows, got ${v6.length}`)
// these rows WERE reviewed: the edit makes their reviews stale under 076 by design; recorded in verify_meta
const plan = []
for (const r of v6) {
  const it = r.item
  const o = r.verify_meta.draft.origin
  let passage = it.passage, explanation = it.explanation || '', choices = it.choices, key = it.correct_answer
  const sub = (s, a, b) => { if (!s.includes(a)) refuse(`${o} ${it.id}: expected text not found: ${a.slice(0, 50)}`); return s.split(a).join(b) }
  if (o.endsWith('v6-04')) {
    passage = sub(passage, 'We match on language first and treat the subject as a preference, and this semester', 'We hold a request until we can meet both parts, and this semester')
    if (it.id === 'CONV6-04-1') explanation = sub(explanation, 'Language is the criterion the lab matches on first, and she offers a partner this week, so speakers were available.', 'She is offered a partner this week, so Spanish speakers were available.')
    if (it.id === 'CONV6-04-2') explanation = sub(explanation, 'A separate wait list for native speakers does not exist, since language is the first thing the lab matches on.', 'No wait list for native speakers is mentioned; Spanish speakers are free this week.')
  }
  if (o.endsWith('v6-12')) {
    passage = sub(passage, 'The winter order closes in September and those gowns come from another supplier.', 'The winter order closes in November, and the hoods come from another supplier.')
    explanation = explanation.split('September').join('November').split('The winter gowns come from another supplier').join('The winter hoods come from another supplier')
    if (it.id === 'CONV6-12-1') choices = choices.map(c => c === 'It was placed after the September deadline' ? 'It was placed after the November deadline' : c)
    if (key !== it.correct_answer || !choices.includes(key)) refuse(`${it.id} key changed`)
  }
  const next = { ...it, passage: contract(passage), explanation: contract(explanation), choices, distractor_rationales: (it.distractor_rationales || []).map(d => ({ ...d, reason: contract(d.reason) })) }
  if (JSON.stringify(next) === JSON.stringify(it)) continue
  plan.push({ id: r.id, origin: r.verify_meta.draft.origin, before: it, after: next, hash: hashListening(next) })
}
const shown = new Set()
for (const p of plan) if (!shown.has(p.origin)) { shown.add(p.origin); console.log(`\n${p.origin}\n  - ${p.before.passage}\n  + ${p.after.passage}`) }
console.log(`\n${plan.length} rows would change (${shown.size} conversations)`)
if (!W) process.exit(0)
writeFileSync(new URL('./snapshot-live-edit-toefl-conv-draft1-v6-2026-10-22.json', import.meta.url), JSON.stringify(plan.map(p => ({ id: p.id, item: p.before })), null, 1))
for (const p of plan) {
  const meta = { ...(v6.find(r => r.id === p.id).verify_meta), live_edit: '2026-10-22 owner-approved: contractions; v6-04 and v6-12 consistency rewrites (co-founder run-2 notes); reviews from toefl-conv1-release1/2 are stale by design; fixes/live-edit-toefl-conv-draft1-v6-2026-10-22.mjs' }
  const { error: e } = await db.from('study_item_bank').update({ item: p.after, content_hash: p.hash, verify_meta: meta }).eq('id', p.id).eq('verified', true)
  if (e) refuse(`${p.id}: ${e.message}`)
}
console.log(`written ${plan.length}`)
