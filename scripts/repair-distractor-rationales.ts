/**
 * Re-point distractor_rationales at the choice text that is actually stored.
 *
 * WHY THIS EXISTS. `distractor_rationales` is an array of
 * `{ choice, reason }`, and TestResultView looks the reason up by EXACT
 * TEXT: `.find(d => d.choice === choice)?.reason`. The option-length repair
 * on 2026-07-30 rewrote distractor text on 660 items and left the
 * rationales keyed to the old strings, so the lookup now misses and the
 * per-distractor "why this is wrong" hint silently vanishes from the review
 * screen. It fails soft — undefined, nothing rendered — which is why 761
 * broken items produced no error anywhere.
 *
 * The repair is exact, not a guess: the archived batch files hold `choices`
 * (pre-repair) and `repaired_choices` (post-repair) in the SAME ORDER, so
 * old[i] -> new[i] is a positional mapping with no matching heuristic.
 *
 * Items whose batch record was destroyed (an `mv` overwrote 149 of them
 * earlier that day) cannot be remapped and are reported, not guessed at.
 *
 *   npx tsx scripts/repair-distractor-rationales.ts          # dry run
 *   npx tsx scripts/repair-distractor-rationales.ts --write
 */
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync, statSync } from 'fs'

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const WRITE = process.argv.includes('--write')

/** id -> old choice text -> new choice text, from the archived batches. */
function loadMaps(): Map<string, Map<string, string>> {
  const out = new Map<string, Map<string, string>>()
  const walk = (dir: string) => {
    for (const f of readdirSync(dir)) {
      const p = `${dir}/${f}`
      if (statSync(p).isDirectory()) { walk(p); continue }
      if (!f.endsWith('.json')) continue
      let arr: any[]
      try { arr = JSON.parse(readFileSync(p, 'utf8')) } catch { continue }
      if (!Array.isArray(arr)) continue
      for (const it of arr) {
        if (!it?.id || !Array.isArray(it.choices) || !Array.isArray(it.repaired_choices)) continue
        if (it.choices.length !== it.repaired_choices.length) continue
        const m = out.get(it.id) ?? new Map<string, string>()
        // Later waves overwrite earlier ones, which is correct: a twice-
        // repaired item's rationale must land on its LATEST text.
        it.choices.forEach((oldC: string, i: number) => m.set(oldC, it.repaired_choices[i]))
        out.set(it.id, m)
      }
    }
  }
  walk('.bank-repair/done')
  return out
}

;(async () => {
  const maps = loadMaps()
  const rows: Array<{ id: string; item: any }> = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('study_item_bank')
      .select('id, item').eq('verified', true).eq('archived', false).eq('item_type', 'multiple_choice')
      .range(from, from + 999)
    if (error) throw new Error(error.message)
    rows.push(...(data as typeof rows ?? []))
    if (!data || data.length < 1000) break
  }

  let dangling = 0, fixable = 0, unrecoverable = 0, written = 0
  const updates: Array<{ id: string; item: any }> = []
  for (const r of rows) {
    const dr = r.item?.distractor_rationales
    const choices: string[] = r.item?.choices ?? []
    if (!Array.isArray(dr) || !dr.length || !choices.length) continue
    const bad = dr.filter((d: any) => d?.choice && !choices.includes(d.choice))
    if (!bad.length) continue
    dangling++
    const m = maps.get(r.id)
    // Only remap through a KNOWN old->new pair whose target is really in
    // the stored choices. A near-miss is left alone rather than guessed.
    const next = dr.map((d: any) => {
      if (!d?.choice || choices.includes(d.choice)) return d
      const mapped = m?.get(d.choice)
      return mapped && choices.includes(mapped) ? { ...d, choice: mapped } : d
    })
    const stillBad = next.filter((d: any) => d?.choice && !choices.includes(d.choice)).length
    if (stillBad === 0) { fixable++; updates.push({ id: r.id, item: { ...r.item, distractor_rationales: next } }) }
    else unrecoverable++
  }

  console.log(`items with a dangling rationale : ${dangling}`)
  console.log(`  fully remappable from batches : ${fixable}`)
  console.log(`  record lost, cannot remap     : ${unrecoverable}`)

  if (!WRITE) { console.log(`\nDry run — re-run with --write to apply ${fixable} item(s).`); return }
  for (const u of updates) {
    const { error } = await db.from('study_item_bank').update({ item: u.item }).eq('id', u.id)
    if (error) { console.error(`  ${u.id.slice(0,8)}: ${error.message}`); continue }
    written++
  }
  console.log(`\nwritten: ${written}`)
})().catch(e => { console.error(e); process.exit(1) })
