#!/usr/bin/env node
/**
 * draw-toefl-conv-runs.mjs <cohort> <runId> [--commit]
 *
 * Draw ONE co-founder run of WHOLE sets, 12 items: 6 conversations x 2, or 3 lectures x 4 (toefl-talk-*), from a staged TOEFL conversation draft,
 * per toefl-conv-draft-1.RELEASE.PREREG.md: the listed in-band sets first, in the listed order, then the
 * rest; both questions of a conversation in the same run, adjacent. draw-review-run.mjs is item-level and
 * cannot keep a conversation whole, so this reuses its row shape (shown_order, flat per-run key deal).
 * Refuses if the reviewer has an open run or a chosen conversation was already drawn. Dry run by default.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const [COHORT, RUN] = process.argv.slice(2).filter(a => !a.startsWith('--'))
const COMMIT = process.argv.includes('--commit')
const REVIEWER = '6ca6edaf-4044-4eed-84e0-137ebd79a81d'
// sets per run and items per set: conversations 6 x 2, lectures (toefl-talk-*) 3 x 4 = 12 items either way
const SHAPE = { 'toefl-talk-draft-1': { sets: 3, size: 4 } }
const ORDER = { 'toefl-conv-draft-1': ['v5-01', 'v5-09', 'v5-10', 'v5-13', 'v5-16', 'v6-01', 'v6-03', 'v6-04', 'v6-06', 'v6-11', 'v6-12', 'v6-13', 'v6-14', 'v6-15'] }
const refuse = m => { console.error('REFUSING: ' + m); process.exit(2) }
if (!COHORT || !RUN) refuse('usage: draw-toefl-conv-runs.mjs <cohort> <runId> [--commit]')
const env = Object.fromEntries(readFileSync(new URL('../../.env.local', import.meta.url), 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data: open } = await db.from('study_item_reviews').select('run_id').eq('reviewer_id', REVIEWER).is('blind_at', null).limit(1).maybeSingle()
if (open) refuse(`"${open.run_id}" is still open for this reviewer`)
const { data: items, error } = await db.from('study_item_bank').select('id,item,verify_meta,verified,archived,created_at').eq('cohort', COHORT).eq('verified', false).eq('archived', false).order('created_at').order('id')
if (error || !items?.length) refuse(`no staged rows in ${COHORT}`)
const { data: drawn } = await db.from('study_item_reviews').select('item_id').in('item_id', items.map(i => i.id))
const seen = new Set((drawn ?? []).map(r => r.item_id))
const groups = new Map()
for (const it of items) { const g = it.item.passageGroupId; if (!groups.has(g)) groups.set(g, []); groups.get(g).push(it) }
const label = g => (groups.get(g)[0].verify_meta?.draft?.origin ?? g).replace('toefl-conv-', '').replace(/^cd2-/, '')
const pref = ORDER[COHORT] ?? []
const ranked = [...groups.keys()].filter(g => groups.get(g).every(i => !seen.has(i.id)))
  .sort((a, b) => { const ia = pref.indexOf(label(a)), ib = pref.indexOf(label(b)); return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib) || label(a).localeCompare(label(b)) })
const { sets: NSETS, size: SIZE } = SHAPE[COHORT] ?? { sets: 6, size: 2 }
const chosen = ranked.slice(0, NSETS)
// the LAST run of a cohort may be short (e.g. 5 lectures = 3 + 2); never pad from another cohort
if (!chosen.length) refuse('no undrawn sets left')
if (chosen.length < NSETS) console.log(`note: final short run, ${chosen.length} of ${NSETS} sets`)
if (chosen.some(g => groups.get(g).length !== SIZE)) refuse(`a chosen set is not exactly ${SIZE} items`)
const sample = chosen.flatMap(g => groups.get(g).sort((a, b) => a.item.id.localeCompare(b.item.id)))
// seeded flat deal over 4-wide rows: A,B,C,D x3
let s = parseInt(createHash('sha256').update(RUN).digest('hex').slice(0, 8), 16)
const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296 }
const sh = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }
const L = ['A', 'B', 'C', 'D']
if (sample.some(r => r.item.choices.length !== 4)) refuse('non-4-wide row')
const slots = sh(sample.map((_, i) => L[i % 4])) // flat over the rows drawn (a short run of 8 is 2/2/2/2)
const rows = sample.map((r, i) => {
  const ki = r.item.choices.indexOf(r.item.correct_answer); if (ki < 0) refuse(`${r.id} key not in choices`)
  const others = sh([0, 1, 2, 3].filter(x => x !== ki)); const keyAt = L.indexOf(slots[i]); const shown = []
  for (let k = 0; k < 4; k++) shown.push(k === keyAt ? ki : others.pop())
  return { item_id: r.id, run_id: RUN, reviewer_id: REVIEWER, shown_order: shown, key_slot: slots[i] }
})
console.log(`${COHORT}: ${ranked.length} undrawn conversations; this run: ${chosen.map(label).join(' ')}`)
console.log(`key slots ${JSON.stringify(Object.fromEntries(L.map(x => [x, rows.filter(r => r.key_slot === x).length])))} -> control 25.0%`)
if (!COMMIT) { console.log('DRY RUN'); process.exit(0) }
const { error: e2 } = await db.from('study_item_reviews').insert(rows); if (e2) refuse(e2.message)
console.log(`drawn ${rows.length} into ${RUN}`)
