#!/usr/bin/env node
/**
 * ledger-blocked.mjs — what is actually blocking each held batch, and what
 * kind of work would unblock it.
 *
 * WHY. `stages.<name>.passed` is a boolean, and it is carrying at least three
 * different meanings:
 *
 *   MEASURED-FAILED   the check ran and the batch lost
 *                     "FAILS the stated bar. 16 of 24 items carry at least
 *                      one CONFIDENTLY rejectable option"
 *   NOT-PROBED        the check never ran at all
 *                     "Not probed separately."
 *   REMEDIATED        the check found things and they were acted on
 *                     "Six items dropped: five named by the attacker..."
 *
 * The insert gate refuses on any of the three, and that is CORRECT -- "not
 * measured is not a pass" is the rule. The problem is not the gate, it is that
 * the ledger cannot tell you which kind you have, and the kind decides the
 * work: a NOT-PROBED stage is one cheap run away, a MEASURED-FAILED stage
 * needs a repair or an archive decision, and a REMEDIATED stage may be stale
 * bookkeeping that a re-read would clear.
 *
 * This classifies by reading the verdict text, which is a heuristic and says
 * so: anything it cannot place comes back UNCLASSIFIED rather than being
 * guessed into a bucket. Read the verdict for those.
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const L = JSON.parse(readFileSync('scripts/study-bank/ledger.json', 'utf8'))
if (!Array.isArray(L.batches) || !L.batches.length) { console.error('REFUSING: ledger holds no batches'); process.exit(2) }

/** Order matters: a verdict saying both "not probed" and "fails" is a failure.
 *
 * THE THIRD RULE WAS ADDED AFTER THE FIRST RUN LEFT FIVE ENTRIES UNCLASSIFIED,
 * and reading them showed why: a verdict can report a MEASUREMENT without ever
 * using the word "fail" -- "Nine passage-disjoint files, nine solvers: 33/36",
 * "Six passage-disjoint files, six solvers: 28/40", "mean 48.0% vs 20.0%
 * control". Those ran. A stage that carries a score IS measured, and since
 * `passed` is false the batch lost; the absence of the word is a house style,
 * not an absence of evidence. The rule looks for a score fraction (n/m) or a
 * percentage, which is what a run always leaves behind.
 *
 * It is placed AFTER the explicit-failure rule and BEFORE not-probed, so
 * "Not probed; the solver reports already name..." stays NOT-PROBED while
 * "33/36" becomes MEASURED-FAILED. */
const RULES = [
  [/\bFAILS?\b(?!\s+(?:to|the run))|falls short|above the bar|did not clear|\bDEAD\b/i, 'MEASURED-FAILED'],
  [/\bdropped\b|\brepaired\b|\bremoved\b|\brewritten\b/i, 'REMEDIATED'],
  [/\b\d+\s*\/\s*\d+\b|\b\d+(?:\.\d+)?%/, 'MEASURED-FAILED'],
  [/not probed|NOT RUN|not measured|never (?:run|probed|measured)|not separately/i, 'NOT-PROBED'],
]
const classify = v => {
  const t = String(v ?? '')
  if (!t.trim()) return 'NOT-PROBED'          // an empty verdict is an absent measurement
  for (const [re, k] of RULES) if (re.test(t)) return k
  return 'UNCLASSIFIED'
}

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const rows = []
for (let f = 0; ; f += 1000) {
  const { data, error } = await db.from('study_item_bank').select('cohort,verified,archived')
    .order('id', { ascending: true }).range(f, f + 999)
  if (error) throw new Error(error.message)
  rows.push(...data)
  if (data.length < 1000) break
}
const state = c => {
  const v = rows.filter(r => r.cohort === c)
  return { live: v.filter(r => r.verified && !r.archived).length,
           staged: v.filter(r => !r.verified && !r.archived).length,
           archived: v.filter(r => r.archived).length }
}

const failing = L.batches.filter(b => Object.values(b.stages ?? {}).some(s => !s.passed))
console.log(`ledger entries ${L.batches.length}   carrying at least one non-passing stage: ${failing.length}\n`)

const buckets = { 'MEASURED-FAILED': [], 'NOT-PROBED': [], 'REMEDIATED': [], 'UNCLASSIFIED': [] }
for (const b of failing) {
  const c = b.cohort ?? b.id
  const st = state(c)
  const bad = Object.entries(b.stages).filter(([, s]) => !s.passed)
  const kinds = bad.map(([k, s]) => [k, classify(s.verdict)])
  /* The batch's worst stage decides its bucket: one real failure outranks any
   * number of unprobed ones, because it is the thing that needs a decision. */
  const worst = kinds.some(([, k]) => k === 'MEASURED-FAILED') ? 'MEASURED-FAILED'
    : kinds.some(([, k]) => k === 'UNCLASSIFIED') ? 'UNCLASSIFIED'
    : kinds.some(([, k]) => k === 'NOT-PROBED') ? 'NOT-PROBED' : 'REMEDIATED'
  buckets[worst].push({ c, st, kinds })
}
const WHAT = {
  'MEASURED-FAILED': 'a check RAN and the batch lost -> needs a repair, or an archive decision',
  'NOT-PROBED': 'a check NEVER RAN -> one run away, cheapest work on the board',
  'REMEDIATED': 'the check found things and they were acted on -> may be stale bookkeeping; re-read before spending anything',
  'UNCLASSIFIED': 'the verdict text does not say which -> READ IT, do not guess',
}
for (const k of ['MEASURED-FAILED', 'NOT-PROBED', 'UNCLASSIFIED', 'REMEDIATED']) {
  const v = buckets[k]
  console.log(`${k}  (${v.length})  — ${WHAT[k]}`)
  if (!v.length) { console.log('   none\n'); continue }
  for (const { c, st, kinds } of v) {
    const where = st.staged ? `${st.staged} STAGED` : st.live ? `${st.live} live` : st.archived ? `${st.archived} archived` : 'no items'
    console.log(`   ${c.padEnd(26)} ${where.padEnd(12)} ${kinds.map(([s, kk]) => `${s}=${kk}`).join('  ')}`)
  }
  console.log()
}
const shipped = failing.filter(b => state(b.cohort ?? b.id).live > 0)
if (shipped.length) {
  console.log(`NOTE: ${shipped.length} of these have items ALREADY LIVE — ${shipped.reduce((a, b) => a + state(b.cohort ?? b.id).live, 0)} items.`)
  console.log('A non-passing stage on a shipped cohort is a record of what was known at insert,')
  console.log('not a reason to pull items. It is listed so the record is visible, not to act on.')
}
