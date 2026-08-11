#!/usr/bin/env node
/**
 * Draw a human-review run FOR a reviewer, server-side.
 *
 * Why this exists: the panel's cohort dropdown is ordered by item count,
 * so a small cohort sits near the bottom of a long list. Three sittings
 * in a row landed on the wrong cohort because of it. The panel's resume
 * behaviour, on the other hand, is completely reliable — it drops the
 * reviewer straight into any run with unanswered rows.
 *
 * So instead of re-instructing the human around a UI problem, we use
 * the reliable path: pre-draw the run they should do, and let resume
 * deliver it. No dropdown involved.
 *
 * Mirrors the POST handler in app/api/admin/bank-qc/review/route.ts —
 * same usability filter, same FLAT key-slot deal (a free shuffle once
 * produced a 56.3% control, at which a reviewer's score means nothing).
 *
 * usage: draw-review-run.mjs <domain[,domain2,...]> <size> <reviewerId> [runId]
 *
 * MULTIPLE DOMAINS IN ONE RUN, added 2026-08-11. `size` is then PER
 * DOMAIN, so "A,B,C" with size 20 draws 60 items into one run.
 *
 * Why: the reviewer can only have one run open at a time (see the
 * REFUSING guard below, which exists so two half-finished samples cannot
 * both be "the sitting"). With one domain per run that guard forced one
 * cohort per ask — and five separate 20-minute asks is exactly the drip
 * that spent four sittings and produced one usable number. One run over
 * several cohorts is one sitting, and scoring splits by domain
 * afterwards because every row carries it.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const [domainArg, sizeArg, reviewerId, runIdArg] = process.argv.slice(2)
/* Cohorts are drawn in the order given, and that order IS the sitting's
 * order — front-load the cohort whose answer matters most, so a reviewer
 * who stops halfway has still answered the question worth asking. */
const domains = (domainArg || '').split(',').map(d => d.trim()).filter(Boolean)
if (!domains.length || !sizeArg || !reviewerId) {
  console.error('usage: draw-review-run.mjs <domain[,domain2,...]> <size> <reviewerId> [runId]'); process.exit(1)
}
const size = Number(sizeArg)
const L = ['A', 'B', 'C', 'D']

const env = Object.fromEntries(readFileSync(process.cwd() + '/.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

// Refuse if the reviewer already has an unfinished run — same rule the
// API enforces, so we cannot strand a half-done sample.
const { data: open } = await db.from('study_item_reviews')
  .select('run_id').eq('reviewer_id', reviewerId).is('blind_at', null).limit(1).maybeSingle()
if (open) { console.error(`REFUSING: "${open.run_id}" is still open for this reviewer.`); process.exit(1) }

const rand = Math.random
const sh = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }

/* Sample each cohort independently, then CONCATENATE in the order the
 * cohorts were given. Deliberately not interleaved: the sitting should
 * finish a cohort before starting the next, so a reviewer who stops
 * partway leaves complete cohorts behind rather than four fragments,
 * none of which can be scored. */
const sample = []
for (const domain of domains) {
  const pool = []
  for (let f = 0; ; f += 1000) {
    const { data, error } = await db.from('study_item_bank').select('id, item')
      .eq('domain', domain).neq('archived', true).order('id', { ascending: true }).range(f, f + 999)
    if (error) throw new Error(error.message)
    pool.push(...data); if (data.length < 1000) break
  }
  const usable = pool.filter(r => {
    const it = r.item
    return Array.isArray(it?.choices) && it.choices.length === 4
      && typeof it.correct_answer === 'string' && it.choices.indexOf(it.correct_answer) >= 0
      && new Set(it.choices.map(c => String(c).trim())).size === 4
  })
  console.log(`${domain}: ${pool.length} live, ${usable.length} reviewable`)
  if (usable.length < size) { console.error(`only ${usable.length} reviewable in "${domain}", need ${size}`); process.exit(1) }
  sample.push(...sh(usable).slice(0, size))
}

/* Key letters flat WITHIN EACH COHORT, not merely across the run.
 *
 * The first version shuffled one flat sequence over the whole sample and
 * the comment here claimed that made each cohort flat too. It does not,
 * and the 2026-08-11 TOEFL sweep proved it: 60 items came out flat
 * run-wide while Daily Life landed 3/7/3/2 and Conversation 6/2/4/3.
 * Since scoring takes each cohort's control from its OWN spread, those
 * became 46.7% and 40.0% controls instead of 25%.
 *
 * A high control makes a cohort look CLEANER than it is — margin is
 * score minus control, so the bar for "leaks" rose from 50% to 71.7% on
 * Daily Life. That sweep's verdicts survived a recheck at a flat 25%,
 * but only by luck of the scores; the instrument was quietly less
 * sensitive than the procedure claims.
 *
 * Per-cohort flatness is the fix, and the comment that asserted it is
 * exactly the kind this repo keeps catching: a claimed invariant nobody
 * had measured. */
const slots = []
for (const [ci] of domains.entries()) {
  const seg = sample.slice(ci * size, (ci + 1) * size)
  slots.push(...sh(seg.map((_, i) => L[i % 4])))
}

const runId = runIdArg || `${domains[0].toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}`
const rows = sample.map((r, i) => {
  const ki = r.item.choices.indexOf(r.item.correct_answer)
  const others = sh([0, 1, 2, 3].filter(x => x !== ki))
  const keyAt = L.indexOf(slots[i])
  const shown = []
  for (let s = 0; s < 4; s++) shown.push(s === keyAt ? ki : others.pop())
  if (new Set(shown).size !== 4) throw new Error(`item ${r.id}: duplicate slot`)
  if (shown[keyAt] !== ki) throw new Error(`item ${r.id}: key misplaced`)
  return { item_id: r.id, run_id: runId, reviewer_id: reviewerId, shown_order: shown, key_slot: slots[i] }
})

const { error } = await db.from('study_item_reviews').insert(rows)
if (error) { console.error('insert failed:', error.message, error.code ?? ''); process.exit(1) }

domains.forEach((d, ci) => {
  const seg = rows.slice(ci * size, (ci + 1) * size)
  const c = L.map(x => seg.filter(r => r.key_slot === x).length)
  const ctrl = (100 * Math.max(...c)) / seg.length
  console.log(`  ${d}: keys ${c.join('/')} -> control ${ctrl.toFixed(1)}%`)
})
const counts = L.map(x => rows.filter(r => r.key_slot === x).length)
console.log(`drawn ${rows.length} into run "${runId}" across ${domains.length} cohort(s), in this order:`)
domains.forEach((d, i) => console.log(`  ${i + 1}. ${d}  (${size} items)`))
console.log(`key letters ${L.map((x, i) => `${x}:${counts[i]}`).join(' ')}  ->  control ${(100 * Math.max(...counts) / rows.length).toFixed(1)}%`)
