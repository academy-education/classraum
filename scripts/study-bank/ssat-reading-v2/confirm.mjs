#!/usr/bin/env node
// SSAT Reading v2: read staged cohorts back (verified / archived / groups / kinds). --drafts 23-28. Run from the repo root.
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const i = process.argv.indexOf('--drafts'); if (i < 0) { console.error('REFUSING: --drafts A-B'); process.exit(2) }
const [lo, hi] = process.argv[i + 1].split('-').map(Number)
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
let total = 0, falseN = 0
for (let n = lo; n <= hi; n++) {
  const c = `ssat-reading-draft-${n}`
  const { data, error } = await db.from('study_item_bank').select('id,verified,archived,family,section,passage_group_id,subskill').eq('cohort', c)
  if (error) throw error
  const v = {}, a = {}, k = {}
  for (const r of data) { v[r.verified] = (v[r.verified] || 0) + 1; a[r.archived] = (a[r.archived] || 0) + 1; k[r.subskill] = (k[r.subskill] || 0) + 1 }
  total += data.length; falseN += data.filter(r => r.verified === false).length
  console.log(c, 'rows', data.length, 'groups', new Set(data.map(r => r.passage_group_id)).size, 'verified', JSON.stringify(v), 'archived', JSON.stringify(a), [...new Set(data.map(r => r.family + '/' + r.section))].join(), JSON.stringify(k))
}
console.log(`total ${total}, verified=false ${falseN}`)
