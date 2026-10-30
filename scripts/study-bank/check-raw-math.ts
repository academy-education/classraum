/**
 * check-raw-math.ts — every live bank field (prompt, passage, choices,
 * explanation) must render with no computer notation after the display
 * formatter (src/lib/study/math-text.ts). Owner, 2026-10-30: "We don't ever want
 * ^ or computer symbols."
 *
 *   npx tsx scripts/study-bank/check-raw-math.ts [--all]   (--all includes staged rows)
 *
 * Exits 1 when any field is still raw, and 2 when it could not read the bank, so
 * an empty read never prints a pass.
 */
import { createClient } from '@supabase/supabase-js'
import { hasRawMathNotation, mathPlain } from '../../src/lib/study/math-text'

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
const all = process.argv.includes('--all')

;(async () => {
  const rows: any[] = []
  for (let from = 0; ; from += 1000) {
    let q = db.from('study_item_bank').select('id,family,section,cohort,item').eq('archived', false)
    if (!all) q = q.eq('verified', true)
    const { data, error } = await q.range(from, from + 999)
    if (error) { console.error('REFUSING: ' + error.message); process.exit(2) }
    rows.push(...data!)
    if (data!.length < 1000) break
  }
  if (!rows.length) { console.error('REFUSING: read 0 rows'); process.exit(2) }
  let fields = 0, caret = 0
  const bad: string[] = []
  for (const r of rows) for (const t of [r.item?.prompt, r.item?.passage, r.item?.explanation, ...(r.item?.choices ?? [])]) {
    if (typeof t !== 'string') continue
    fields++
    if (t.includes('^')) caret++
    if (hasRawMathNotation(t)) {
      const p = mathPlain(t), k = Math.max(0, p.search(/\^|sqrt|<=|>=|!=|\*/))
      bad.push(`${r.family}/${r.section} ${r.cohort} ${r.id.slice(0, 8)}: …${p.slice(Math.max(0, k - 40), k + 40).replace(/\n/g, ' ')}…`)
    }
  }
  console.log(`${all ? 'all non-archived' : 'live'} rows ${rows.length}, fields ${fields}, fields with a caret before formatting ${caret}, still raw after ${bad.length}`)
  bad.slice(0, 40).forEach(b => console.log('  ' + b))
  process.exit(bad.length ? 1 : 0)
})()
