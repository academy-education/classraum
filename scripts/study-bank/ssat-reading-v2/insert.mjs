#!/usr/bin/env node
// SSAT Reading v2: the d19-22 insert.mjs with --draft N; stages verified=false only. Dry run unless --commit. Run from the repo root.
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const die = m => { console.error('REFUSING: ' + m); process.exit(2) }
const commit = process.argv.includes('--commit')
const i = process.argv.indexOf('--draft'); const DRAFT = i >= 0 ? process.argv[i + 1] : die('--draft N required')
const COHORT = `ssat-reading-draft-${DRAFT}`
const { rows } = JSON.parse(readFileSync(`scripts/study-bank/ssat-reading-draft-${DRAFT}.batch.json`, 'utf8'))
if (rows.length !== 36 || rows.some(r => r.verified !== false || r.cohort !== COHORT || !r.verify_meta?.draft)) die('row contract')
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data: same, error: e0 } = await db.from('study_item_bank').select('id').eq('cohort', COHORT); if (e0) die(e0.message)
if (same.length) die(`cohort already has ${same.length} rows`)
const { data: dup, error: e1 } = await db.from('study_item_bank').select('id,cohort').in('content_hash', rows.map(r => r.content_hash)); if (e1) die(e1.message)
if (dup.length) die(`${dup.length} content_hash already present`)
if (!commit) { console.log(`DRY RUN ok: ${COHORT} ${rows.length} rows ready`); process.exit(0) }
const { data, error } = await db.from('study_item_bank').insert(rows).select('id,verified,cohort,passage_group_id')
if (error) die(error.message)
console.log(`INSERTED ${COHORT} ${data.length}, verified=${[...new Set(data.map(r => r.verified))]}`)
