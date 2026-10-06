#!/usr/bin/env node
/**
 * check-math-near-dup.mjs <batch.json> [--family sat] [--threshold 0.6]
 * check-math-near-dup.mjs --selftest
 *
 * Near-duplicate check for a MATH batch against every live row of the same
 * family's maths section, PAGED (PostgREST stops at 1000; sat/math is 1,364).
 * `stem-duplicates.mjs` catches the exact same stem; this catches the same
 * item re-skinned with different numbers, which the exact key cannot see.
 *
 * Two signals, per candidate:
 *   - prompt token-Jaccard with every digit run folded to '#', so "costs 45
 *     dollars" and "costs 60 dollars" are the same template. >= threshold FLAGS.
 *   - the same option MULTISET as a live row in the same domain. FLAGS.
 * Also within the batch (two candidates that are one template).
 *
 * A22/A55: refuses an empty batch, refuses an empty live read, prints its
 * denominators. --selftest proves it fires on a re-skinned live-shaped row and
 * stays quiet on an unrelated one, without the DB.
 */
import { readFileSync, existsSync } from 'node:fs'

const args = process.argv.slice(2)
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const THRESH = Number(flag('--threshold', '0.6'))

const norm = s => String(s ?? '').toLowerCase().replace(/−/g, '-').replace(/\d+(\.\d+)?/g, ' # ')
  .replace(/[^a-z#]+/g, ' ').trim()
const bag = s => new Set(norm(s).split(/\s+/).filter(w => w === '#' || w.length > 2))
export const jac = (a, b) => { if (!a.size || !b.size) return 0; let i = 0; for (const x of a) if (b.has(x)) i++; return i / (a.size + b.size - i) }
const optKey = ch => (ch ?? []).map(c => String(c).replace(/−/g, '-').replace(/\s+/g, '')).sort().join('|')

export function compare(cands, live) {
  const hits = []
  const L = live.map(r => ({ id: r.id, cohort: r.cohort, domain: r.domain, b: bag(r.item?.prompt), o: optKey(r.item?.choices), p: r.item?.prompt }))
  for (const c of cands) {
    const cb = bag(c.prompt), co = optKey(c.choices)
    let best = { j: 0 }
    for (const r of L) {
      const j = jac(cb, r.b)
      if (j > best.j) best = { j, r }
      if (co && co === r.o && (!c.domain || c.domain === r.domain)) hits.push({ id: c.id, kind: 'same-option-set', with: r.id, cohort: r.cohort })
    }
    if (best.j >= THRESH) hits.push({ id: c.id, kind: 'prompt-jaccard', j: best.j, with: best.r.id, cohort: best.r.cohort, livePrompt: best.r.p })
    c._best = best
  }
  for (let i = 0; i < cands.length; i++) for (let k = i + 1; k < cands.length; k++) {
    const j = jac(bag(cands[i].prompt), bag(cands[k].prompt))
    if (j >= THRESH) hits.push({ id: cands[i].id, kind: 'within-batch', j, with: cands[k].id })
  }
  return hits
}

if (args.includes('--selftest')) {
  const live = [{ id: 'L1', cohort: 'x', domain: 'Algebra', item: { prompt: 'Renting a machine costs 180 dollars plus 45 dollars for each day of the rental. A customer has 2,300 dollars to spend and must rent the machine for a whole number of weeks. What is the greatest number of days?', choices: ['6', '42', '47', '49'] } }]
  const reskin = { id: 'C1', domain: 'Algebra', prompt: 'Renting a machine costs 220 dollars plus 60 dollars for each day of the rental. A customer has 3,100 dollars to spend and must rent the machine for a whole number of weeks. What is the greatest number of days?', choices: ['7', '35', '48', '49'] }
  const other = { id: 'C2', domain: 'Algebra', prompt: 'In the system of equations above, k is a constant. If the system has no solution, what is the value of k?', choices: ['-4', '-1', '5', '8'] }
  const sameOpts = { id: 'C3', domain: 'Algebra', prompt: 'A totally unrelated story about bicycles and lanterns.', choices: ['49', '6', '47', '42'] }
  const h = compare([reskin, other, sameOpts], live)
  const fired = id => h.some(x => x.id === id)
  const ok = fired('C1') && !fired('C2') && h.some(x => x.id === 'C3' && x.kind === 'same-option-set')
  console.log(`selftest: reskin ${fired('C1') ? 'FIRES' : 'silent'} (j=${reskin._best.j.toFixed(2)}), unrelated ${fired('C2') ? 'FIRES' : 'silent'} (j=${other._best.j.toFixed(2)}), same option set ${fired('C3') ? 'FIRES' : 'silent'}`)
  if (!ok) { console.error('SELFTEST FAILED'); process.exit(1) }
  console.log('selftest PASS'); process.exit(0)
}

const path = args.find(a => !a.startsWith('--') && a !== flag('--family') && a !== flag('--threshold'))
if (!path || !existsSync(path)) { console.error('usage: check-math-near-dup.mjs <batch.json> [--family sat] | --selftest'); process.exit(2) }
const batch = JSON.parse(readFileSync(path, 'utf8'))
if (!Array.isArray(batch) || !batch.length) { console.error(`REFUSING: ${path} holds no items.`); process.exit(2) }
const fam = flag('--family', 'sat')
const { createClient } = await import('@supabase/supabase-js')
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const live = []
for (let f = 0; ; f += 1000) {
  const { data, error } = await db.from('study_item_bank').select('id,cohort,domain,item').eq('family', fam).eq('section', 'math')
    .eq('archived', false).order('id').range(f, f + 999)
  if (error) throw new Error(error.message)
  live.push(...data); if (data.length < 1000) break
}
const { count } = await db.from('study_item_bank').select('id', { count: 'exact', head: true }).eq('family', fam).eq('section', 'math').eq('archived', false)
if (!live.length) { console.error('REFUSING: live read returned 0 rows.'); process.exit(2) }
if (live.length !== count || new Set(live.map(r => r.id)).size !== live.length) { console.error(`REFUSING: paged ${live.length}, count ${count} — read is incomplete.`); process.exit(2) }
const hits = compare(batch, live)
console.log(`near-dup: ${batch.length} candidates vs ${live.length} live ${fam}/math rows (count ${count}), threshold ${THRESH}`)
for (const c of batch) console.log(`  ${c.id.padEnd(12)} best j=${c._best.j.toFixed(3)} vs ${c._best.r?.id?.slice(0, 8)} (${c._best.r?.cohort})`)
if (!hits.length) console.log('  0 flagged')
for (const h of hits) console.log(`  FLAG ${h.id} ${h.kind} ${h.j ? 'j=' + h.j.toFixed(3) : ''} with ${h.with} ${h.cohort ?? ''}`)
process.exit(hits.length ? 1 : 0)
