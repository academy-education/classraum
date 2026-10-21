// Add natural contractions to the UNREVIEWED v6 conversations in toefl-conv-draft-1 (co-founder note,
// run 2: v6 transcripts have no contractions and sound scripted). Passage + explanation + rationale
// reasons only (options are not speech). Sentence-final "it is"/"that is" are left alone. Refuses on any
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
  [/\bI am\b/g, "I'm"], [/\bI will\b/g, "I'll"], [/\bI would\b/g, "I'd"], [/\bI have (?=been|done|seen|heard|got|had|never|written|told|checked)/g, "I've "],
  [/\b(you|we|they) (are|will|would)\b(?=\s+\w)/gi, (m, p, v) => p + ({ are: "'re", will: "'ll", would: "'d" })[v.toLowerCase()]],
  [/(?<!\bin )\b(it|that|there|what|he|she) is\b(?=\s+[a-z])/gi, (m, p) => p + "'s"], [/\b[Ll]et us\b/g, m => (m[0] === 'L' ? 'Let' : 'let') + "'s"],
]
const contract = s => RULES.reduce((t, [re, rep]) => t.replace(re, rep), s)
const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const stripStem = t => norm(String(t || '').replace(/^\s*\[[^\]]*\]\s*/, '').replace(/^\s*(according to|based on)\s+the\s+passage\s*,?\s*/i, ''))
const hashListening = it => createHash('md5').update([norm(it.passage), stripStem(it.prompt), (it.choices || []).map(norm).sort().join('|')].join('~~')).digest('hex')
const { data: rows, error } = await db.from('study_item_bank').select('id,item,verified,archived,verify_meta,content_hash').eq('cohort', 'toefl-conv-draft-1').eq('verified', false).eq('archived', false)
if (error) refuse(error.message)
const v6 = rows.filter(r => /v6-/.test(r.verify_meta?.draft?.origin || ''))
const { data: rv } = await db.from('study_item_reviews').select('item_id').in('item_id', v6.map(r => r.id))
if (rv?.length) refuse(`${rv.length} of these rows have reviews`)
const plan = []
for (const r of v6) {
  const it = r.item
  const next = { ...it, passage: contract(it.passage), explanation: contract(it.explanation || ''), distractor_rationales: (it.distractor_rationales || []).map(d => ({ ...d, reason: contract(d.reason) })) }
  if (JSON.stringify(next) === JSON.stringify(it)) continue
  plan.push({ id: r.id, origin: r.verify_meta.draft.origin, before: it, after: next, hash: hashListening(next) })
}
const shown = new Set()
for (const p of plan) if (!shown.has(p.origin)) { shown.add(p.origin); console.log(`\n${p.origin}\n  - ${p.before.passage}\n  + ${p.after.passage}`) }
console.log(`\n${plan.length} rows would change (${shown.size} conversations)`)
if (!W) process.exit(0)
writeFileSync(new URL('./snapshot-contract-toefl-conv-draft1-v6-2026-10-21.json', import.meta.url), JSON.stringify(plan.map(p => ({ id: p.id, item: p.before })), null, 1))
for (const p of plan) {
  const meta = { ...(v6.find(r => r.id === p.id).verify_meta), pre_sitting_edit: '2026-10-21 contractions added (co-founder run-2 note); fixes/contract-toefl-conv-draft1-v6-2026-10-21.mjs' }
  const { error: e } = await db.from('study_item_bank').update({ item: p.after, content_hash: p.hash, verify_meta: meta }).eq('id', p.id).eq('verified', false)
  if (e) refuse(`${p.id}: ${e.message}`)
}
console.log(`written ${plan.length}`)
