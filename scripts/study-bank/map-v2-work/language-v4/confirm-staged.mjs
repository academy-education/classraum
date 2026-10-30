// Read-only: counts map-language-v4-* rows by cohort, verified, archived, domain, method_id.
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
const { data, error } = await db.from('study_item_bank').select('cohort,verified,archived,domain,subskill,family,section,verify_meta').like('cohort','map-language-v4-%')
if (error) { console.error(error.message); process.exit(2) }
const c = {}
for (const r of data) { const k=[r.cohort,r.family,r.section,'verified='+r.verified,'archived='+r.archived,r.subskill,r.verify_meta?.method_id].join(' | '); c[k]=(c[k]||0)+1 }
console.log('rows', data.length); for (const [k,v] of Object.entries(c).sort()) console.log(v, k)
const { count: live } = await db.from('study_item_bank').select('id',{count:'exact',head:true}).like('cohort','map-language-v4-%').eq('verified',true)
console.log('verified=true rows in v4 cohorts:', live)
