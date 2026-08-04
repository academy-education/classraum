/**
 * Shape audit for TOEFL Listening conversations, read from the live bank.
 *
 * Deliberately reports on DISTINCT TRANSCRIPTS, not items: 193 items
 * share 62 transcripts, and counting per item triples every figure —
 * the first version of this analysis did exactly that and reported
 * 2,011 speaker turns where there are 670.
 *
 * Usage: node scripts/study-bank/check-conversations.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { register } from 'node:module'

const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]))

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// Paginated: PostgREST silently caps at 1000 rows, and a truncated read
// here would under-report violations — i.e. make the bank look cleaner
// than it is, the one direction this must never fail in.
const rows = []
for (let from = 0; ; from += 1000) {
  const { data, error } = await db.from('study_item_bank')
    .select('id, item')
    .eq('family', 'toefl').eq('domain', 'Conversation').eq('archived', false)
    .range(from, from + 999)
  if (error) throw new Error(error.message)
  rows.push(...(data ?? []))
  if (!data || data.length < 1000) break
}

const { checkConversation, shapeOf, blocking } = await import('../../src/lib/study/conversation-gate.ts')

const byTranscript = new Map()
for (const r of rows) {
  const p = r.item?.passage
  if (!p) continue
  const e = byTranscript.get(p) ?? { questions: 0, ids: [] }
  e.questions++; e.ids.push(r.id)
  byTranscript.set(p, e)
}

let failing = 0
const ruleCounts = {}
const detail = []
for (const [p, e] of byTranscript) {
  const all = checkConversation(p, e.questions)
  const hard = blocking(all)
  for (const v of all) ruleCounts[v.rule] = (ruleCounts[v.rule] ?? 0) + 1
  if (hard.length) {
    failing++
    detail.push({ shape: shapeOf(p), rules: hard.map(v => v.rule), first: e.ids[0] })
  }
}

console.log(`items ${rows.length}  distinct transcripts ${byTranscript.size}`)
console.log(`FAILING (blocking rules): ${failing} of ${byTranscript.size}`)
console.log('per-rule counts (incl. non-blocking):', ruleCounts)
console.log('\nworst by word count:')
for (const d of detail.sort((a, b) => b.shape.words - a.shape.words).slice(0, 8)) {
  console.log(`  ${d.shape.words}w ${d.shape.turns}turns rep=${d.shape.repeatedSpeakerTurns} [${d.rules}] ${d.first}`)
}
process.exit(failing > 0 ? 1 : 0)
