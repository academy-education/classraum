#!/usr/bin/env node
/**
 * check-duplicate-option-sets.mjs <family/section> [batch.json ...]
 *
 * Do two items share a numerically identical OPTION SET?
 *
 * WHY. On 2026-09-24 two blind solvers independently noticed, in a control
 * drawn from the SHIPPED bank, that two live SAT Algebra items offered the
 * same four values -- 6, -6, 8, and six-eighths written once as "3/4" and once
 * as "0.75". A third pair shared the integer trio {6, 8, 4} and differed only
 * in a lone non-integer. Neither solver was looking for it; both flagged it as
 * a defect independent of whether their picks were right.
 *
 * It matters because the bank draws items into forms independently: a student
 * who meets one has seen the other's option set, and the pair also advertises
 * a fixed distractor pool with a varying key, which is exactly the shape a
 * blind solver exploits.
 *
 * This is arithmetic, not semantics, so per CLAUDE.md it is checked EXACTLY
 * over the whole population rather than sampled -- and the fraction-vs-decimal
 * rendering is why it needs the shared value parser rather than string
 * comparison: "3/4" and "0.75" are the same option and look nothing alike.
 *
 * MEASURED 2026-09-24 over the whole live sat/math bank (1,313 items):
 *
 *     40 duplicated option sets in total
 *       ~16  four small consecutive or evenly spaced integers -- coincidence
 *       ~7   standard trig ratios (0.6 / 0.8 / 1.25 / 1.333 are the sin, cos
 *            and tan of a 3-4-5 triangle) -- NATURAL for their domain, and the
 *            first version of this note wrongly counted them as defects
 *       ~17  genuine collisions, covering roughly 40 items
 *
 * So READ THE CLASS, NOT THE COUNT. A repeated set of four consecutive small
 * integers means nothing; a repeated set carrying a negative, an odd fraction
 * or an irregular large value means two items were built from one distractor
 * pool. The clearest live example is {-6, 0.75, 6, 8} on two Algebra items,
 * where 0.75 appears as "3/4" in one and "0.75" in the other -- which is why
 * a string comparison would have missed it and two blind solvers did not.
 *
 * NOT ACTIONED. This is a write against live data and is recorded for a
 * go-ahead rather than done.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { val } from './check-key-magnitude.mjs'

export function sig(choices) {
  const v = (choices || []).map(val)
  if (!v.length || v.some(x => x === null)) return null
  return v.slice().sort((a, b) => a - b).map(x => x.toFixed(6)).join('|')
}

export function findDuplicates(items) {
  const seen = new Map()
  for (const x of items) {
    const s = sig(x.choices); if (!s) continue
    if (!seen.has(s)) seen.set(s, [])
    seen.get(s).push(x.id)
  }
  return [...seen.entries()].filter(([, v]) => v.length > 1).map(([s, ids]) => ({ sig: s, ids }))
}

const RUN_AS_CLI = process.argv[1] && process.argv[1].endsWith('check-duplicate-option-sets.mjs')
if (RUN_AS_CLI) {
  const fail = m => { console.error('SELF-TEST FAILED: ' + m); process.exit(2) }
  const d1 = findDuplicates([
    { id: 'a', choices: ['6', '-6', '3/4', '8'] },
    { id: 'b', choices: ['6', '-6', '8', '0.75'] },
    { id: 'c', choices: ['1', '2', '3', '4'] },
  ])
  if (d1.length !== 1 || d1[0].ids.length !== 2) fail('the real 3/4-vs-0.75 pair must be caught across renderings')
  const d2 = findDuplicates([{ id: 'a', choices: ['1', '2', '3', '4'] }, { id: 'b', choices: ['1', '2', '3', '5'] }])
  if (d2.length) fail('sets differing in one value must not be flagged')
  console.log('self-test: catches 3/4 == 0.75 across renderings, ignores a one-value difference\n')

  const [fam, ...files] = process.argv.slice(2)
  if (!fam) { console.error('usage: check-duplicate-option-sets.mjs <family/section> [batch.json ...]'); process.exit(2) }
  const [family, section] = fam.split('/')
  const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const rows = []
  for (let f = 0; ; f += 1000) {
    const { data, error } = await db.from('study_item_bank').select('id,domain,item')
      .eq('family', family).eq('section', section).eq('verified', true).eq('archived', false)
      .order('id', { ascending: true }).range(f, f + 999)
    if (error) throw new Error(error.message); rows.push(...data); if (data.length < 1000) break
  }
  const live = rows.map(r => ({ id: r.id.slice(0, 8), domain: r.domain, choices: r.item?.choices })).filter(x => x.choices)
  const byDom = {}
  for (const x of live) (byDom[x.domain] ??= []).push(x)
  console.log(`LIVE ${fam}: ${live.length} items with options`)
  let total = 0
  for (const [dom, items] of Object.entries(byDom)) {
    const d = findDuplicates(items)
    total += d.length
    console.log(`  ${dom.padEnd(32)}${items.length} items, ${d.length} duplicated option set(s)`)
    for (const g of d.slice(0, 4)) console.log(`      ${g.ids.join(' == ')}   values ${g.sig.split('|').map(Number).join(', ')}`)
  }
  console.log(`\n  ${total} duplicated option sets across the live ${fam} bank`)
  for (const f of files) {
    const a = JSON.parse(readFileSync(f, 'utf8'))
    const d = findDuplicates(a)
    console.log(`  ${f.replace(/^.*\//, '')}: ${d.length} internal duplicate(s)`)
  }
  console.log('')
}
