/**
 * check-shared-headword.mjs — do two live Words-in-Context items reuse the
 * same target word or the same little world?
 *
 * WHY NOT PASSAGE OVERLAP. The first version of this scored pairs by content
 * word Jaccard and returned ZERO pairs over the whole subskill. That was a
 * clean-looking green over the wrong axis: the known duplicate pair — two
 * items both glossing "temperate", both opening "The committee's report was
 * praised for its temperate ..." — scores 0.109, because two authors wrote
 * different sentences around the same headword. Bulk overlap measures prose
 * similarity; these items duplicate at the TARGET.
 *
 * WHAT IT MEASURES. For each pair of live items, the words of
 * document-frequency <= 2 that both passages (plus their option text) use.
 * A word almost nothing else in the subskill says, said by two items, is a
 * shared target or a shared setting.
 *
 * ANCHORED. The run exits non-zero unless it fires on the temperate pair.
 * A detector that cannot reproduce a known answer on known data has no
 * business being pointed at unknown data.
 *
 * WHAT IT MISSES. It cannot see two items that gloss the same sense with
 * different headwords (grave/sober), and it says nothing about whether an
 * item is GOOD — a topic collision is a draw problem, not a defect. x1 hits
 * are noise ("period", "household"); read the count, not the presence.
 *
 * Usage:  set -a; source .env.local; set +a; node scripts/study-bank/check-shared-headword.mjs
 */
import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const rows = []
for (let from = 0; ; from += 1000) {
  const { data, error } = await db.from('study_item_bank').select('id,item,verified,archived').range(from, from + 999)
  if (error) throw error; rows.push(...data); if (data.length < 1000) break
}
const live = rows.filter(r => !r.archived && r.verified && /words? in context/i.test(r.item?.subskill || ''))
if (live.length < 5) { console.error('REFUSING: only ' + live.length + ' items'); process.exit(1) }
const norm = s => (s||'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim()
const words = r => new Set(norm(r.item.passage + ' ' + (r.item.choices||[]).join(' ')).split(' ').filter(w => w.length > 5))
const sets = live.map(r => ({ r, w: words(r) }))
const df = new Map()
for (const s of sets) for (const w of s.w) df.set(w, (df.get(w)||0) + 1)
const out = []
for (let i = 0; i < sets.length; i++) for (let j = i+1; j < sets.length; j++) {
  const shared = [...sets[i].w].filter(w => sets[j].w.has(w) && df.get(w) <= 2)
  if (shared.length) out.push([shared.length, shared, sets[i].r, sets[j].r])
}
out.sort((a,b) => b[0]-a[0])
console.log(`live Words-in-Context: ${live.length}; pairs sharing a word of document-frequency <= 2: ${out.length}\n`)
for (const [n, sh, a, b] of out) {
  console.log(`x${n}  ${sh.join(', ')}`)
  console.log(`     ${a.id.slice(0,8)} key=${JSON.stringify(a.item.correct_answer)}  |  ${b.id.slice(0,8)} key=${JSON.stringify(b.item.correct_answer)}`)
}
const anchor = out.find(([,sh]) => sh.includes('temperate'))
console.log(`\nANCHOR (known duplicate must appear): ${anchor ? 'FIRES — ' + anchor[1].join(', ') : 'MISSED — this check is not evidence'}`)
process.exit(anchor ? 0 : 1)
