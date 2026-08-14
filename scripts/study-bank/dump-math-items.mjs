#!/usr/bin/env node
/* Dump live SAT Math items to JSON so the sympy checker can read them
 * without a Postgres driver in Python. Node owns the credentials; the
 * checker owns the algebra. */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'node:fs'
const out = process.argv[2]
if (!out) throw new Error('usage: dump-math-items.mjs <out.json>')
const env = Object.fromEntries(readFileSync(process.cwd()+'/.env.local','utf8').split('\n')
  .filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false}})
const MATH = ['Algebra','Advanced Math','Problem-Solving and Data Analysis','Geometry and Trigonometry']
const rows = []
for (let f = 0; ; f += 1000) {
  const { data, error } = await db.from('study_item_bank')
    .select('id, domain, item').eq('family','sat').eq('archived',false)
    .in('domain', MATH).range(f, f+999)
  if (error) throw new Error(`study_item_bank: ${error.message}`)
  rows.push(...(data ?? []))
  if (!data || data.length < 1000) break
}
if (!rows.length) throw new Error('no live SAT math items — refusing to write an empty dump')
writeFileSync(out, JSON.stringify(rows.map(r => ({
  id: r.id, domain: r.domain,
  prompt: r.item?.prompt ?? '',
  choices: Array.isArray(r.item?.choices) ? r.item.choices.map(c => typeof c === 'string' ? c : c?.text ?? '') : [],
  correct_answer: r.item?.correct_answer ?? null,
})), null, 1))
console.log(`dumped ${rows.length} SAT math items -> ${out}`)
for (const d of MATH) console.log(`  ${d.padEnd(36)} ${rows.filter(r=>r.domain===d).length}`)
