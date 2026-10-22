import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('/Users/andylee/Downloads/saas/classraum/.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const items = JSON.parse(readFileSync(process.argv[2] || 'items.json', 'utf8'))
if (!items.length) { console.error('REFUSING: no items'); process.exit(2) }
const { data, error } = await db.from('study_item_bank').select('item->>correct_answer').eq('family', 'toefl').eq('item_type', 'arrange_words').eq('archived', false) // item_type, not task: bas-v2 rows carry task='build_a_sentence' (2026-10-22: the task filter read 165 of 201 keys)
if (error || !data?.length) { console.error('REFUSING: cannot read live keys'); process.exit(2) }
const live = data.map(r => r.correct_answer)
const toks = s => new Set(String(s).toLowerCase().replace(/\|/g, ' ').replace(/[^a-z' ]/g, ' ').split(/\s+/).filter(Boolean))
const jac = (a, b) => { const A = toks(a), B = toks(b); let i = 0; for (const x of A) if (B.has(x)) i++; return i / (A.size + B.size - i) }
const probs = []; let maxLive = 0, maxIn = 0
for (const it of items) {
  const key = it.correct_answer.split(' | ')
  if (it.choices.length < 5 || it.choices.length > 7) probs.push(`${it.id} chips ${it.choices.length}`)
  if ([...it.choices].sort().join('\u0001') !== [...key].sort().join('\u0001')) probs.push(`${it.id} key not a permutation`)
  if (it.choices.join('|') === key.join('|')) probs.push(`${it.id} choices not scrambled`)
  for (const c of it.choices) { const w = c.trim().split(/\s+/).length; if (w < 1 || w > 4) probs.push(`${it.id} chip "${c}" ${w} words`); if (/[.,;:!?]$/.test(c)) probs.push(`${it.id} punctuation "${c}"`) }
  if (new Set(it.choices.map(c => c.toLowerCase())).size !== it.choices.length) probs.push(`${it.id} duplicate chip`)
  for (const l of live) { const j = jac(it.correct_answer, l); if (j > maxLive) maxLive = j; if (j >= 0.5) probs.push(`${it.id} Jaccard ${j.toFixed(2)} vs live "${l}"`) }
  for (const o of items) if (o.id < it.id) { const j = jac(it.correct_answer, o.correct_answer); if (j > maxIn) maxIn = j; if (j >= 0.5) probs.push(`${it.id} Jaccard ${j.toFixed(2)} vs ${o.id}`) }
}
const passive = items.filter(it => /\bby\b/.test(it.correct_answer) && /\b(was|were|is|are|been|be)\b/.test(it.correct_answer)).length
const fam = {}; items.forEach(it => fam[it.structure_family] = (fam[it.structure_family] || 0) + 1)
const diff = {}; items.forEach(it => diff[it.difficulty] = (diff[it.difficulty] || 0) + 1)
console.log(`items ${items.length}; live keys read ${live.length}; problems ${probs.length}`); probs.forEach(p => console.log('  ' + p))
console.log(`max Jaccard vs live ${maxLive.toFixed(2)}, within batch ${maxIn.toFixed(2)}; passive-with-agent ${passive}/${items.length}; families ${Object.keys(fam).length}; difficulty ${JSON.stringify(diff)}`)
if (probs.length) process.exit(1)
