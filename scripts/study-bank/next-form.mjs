#!/usr/bin/env node
/**
 * next-form.mjs [family/section ...]
 *
 * "What is the CHEAPEST set of items that buys one more complete form?"
 *
 * WHY THIS EXISTS. `form-capacity.mjs` correctly names the BINDING domain --
 * the thinnest one -- and that is what every authoring brief has been written
 * against. It does not say how far ahead the SECOND-thinnest domain is, and on
 * 2026-09-12 that cost a whole batch: ACT Math was capped at 7 forms by Algebra
 * with 60 items, so 28 Algebra items were commissioned, gated and inserted.
 * Algebra went 60 -> 88 and the form count stayed at 7, because Geometry sat at
 * 59 -- thinner by one item. Twenty-eight items bought zero forms. Six items
 * (5 Geometry, 1 Number and Quantity) buy one.
 *
 * The binding domain is the right answer to "what is short". It is the WRONG
 * answer to "what should we author", whenever the margin to the next domain is
 * smaller than the batch. Ask this script instead, and read the TOTAL, not the
 * first row.
 *
 * SECOND DEFECT, 2026-09-15. This script printed
 *
 *     act/science — 2 complete forms now
 *     CHEAPEST NEXT FORM: 2 items  ->  Interpretation of Data +2
 *
 * as the cheapest buy on the board by a factor of six, and it is worth nothing.
 * `act-science` is in HIDDEN_SUBTOPIC_SLUGS: its 120 items are drawable by the
 * assembler and no student can open the topic. A form bought there is a form
 * nobody can sit. `bank-state.mjs` has printed that gate since it was written;
 * this tool, the one an author actually asks "what should I write next", did
 * not read it -- so the cheapest-looking row in its output was the one row that
 * could not pay. The same arithmetic over a population the product does not
 * serve is not a smaller number, it is not a number: an UNREACHABLE section is
 * now excluded from the ranking and printed separately under its own heading.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

/* Quotas come from `blueprint-quotas.mjs`, the single shared table. They used
 * to be typed here from memory and were wrong three times in one day -- see
 * that file's header for all three and what each one cost. Two tools deriving
 * one fact from two tables was the defect; this import is the fix. */
import { QUOTAS, perForm, assertShares } from './blueprint-quotas.mjs'

const shareErrors = assertShares()
if (shareErrors.length) { for (const e of shareErrors) console.error('REFUSING: ' + e); process.exit(2) }
const PER_FORM = Object.fromEntries(Object.keys(QUOTAS).map(k => [k, perForm(k)]))

/* Reachability, read from the page that enforces it -- never repeated here,
 * for the same reason the quotas are parsed rather than typed. */
const PAGE = readFileSync('src/app/mobile/study/topic/[slug]/page.tsx', 'utf8')
const grab = re => (PAGE.match(re)?.[1] ?? '').match(/'([^']+)'/g)?.map(x => x.slice(1, -1)) ?? []
const HIDDEN = new Set(grab(/HIDDEN_SUBTOPIC_SLUGS = new Set\(\[([^\]]*)\]/))
const LOCKED = new Set(grab(/LOCKED_TOPIC_SLUGS = new Set\(\[([\s\S]*?)\]\)/))
if (!HIDDEN.size && !LOCKED.size) { console.error('REFUSING: parsed zero hidden subtopics AND zero locked topics from page.tsx — the gate moved or the regex did'); process.exit(2) }
const unreachable = key => {
  const [fam, sec] = key.split('/')
  if (LOCKED.has(`test-${fam}`)) return `topic test-${fam} is LOCKED`
  if (HIDDEN.has(`${fam}-${sec}`)) return `subtopic ${fam}-${sec} is HIDDEN from students`
  return null
}

const want = process.argv.slice(2)
const rows = []
for (let f = 0; ; f += 1000) {
  const { data, error } = await db.from('study_item_bank')
    .select('id,family,section,domain')
    .eq('verified', true).eq('archived', false)
    .order('id', { ascending: true }).range(f, f + 999)
  if (error) throw new Error(error.message)
  rows.push(...data)
  if (data.length < 1000) break
}
const ids = new Set(rows.map(r => r.id))
if (ids.size !== rows.length) { console.error('REFUSING: paging slipped (' + ids.size + ' distinct of ' + rows.length + ')'); process.exit(2) }

const deferred = []
for (const [key, quotas] of Object.entries(PER_FORM)) {
  if (want.length && !want.includes(key)) continue
  const why = unreachable(key)
  if (why && !want.includes(key)) { deferred.push([key, why]); continue }
  const [fam, sec] = key.split('/')
  const live = {}
  for (const r of rows) if (r.family === fam && r.section === sec) live[r.domain] = (live[r.domain] ?? 0) + 1

  const forms = Math.min(...Object.entries(quotas).map(([d, q]) => Math.floor((live[d] ?? 0) / q)))
  const target = forms + 1
  console.log('')
  console.log(key + ' — ' + forms + ' complete forms now')
  console.log('  domain                              live   /form   for form ' + target + '   deficit')
  console.log('  ' + '-'.repeat(70))
  let total = 0
  const plan = []
  for (const [d, q] of Object.entries(quotas).sort((a, b) => ((live[a[0]] ?? 0) / a[1]) - ((live[b[0]] ?? 0) / b[1]))) {
    const n = live[d] ?? 0
    const need = target * q
    const deficit = Math.max(0, need - n)
    total += deficit
    if (deficit) plan.push(d + ' +' + deficit)
    console.log('  ' + d.padEnd(36) + String(n).padStart(4) + String(q).padStart(8) + String(need).padStart(11) + String(deficit || '-').padStart(10))
  }
  console.log('  ' + '-'.repeat(70))
  console.log('  CHEAPEST NEXT FORM: ' + total + ' items' + (plan.length ? '  ->  ' + plan.join(', ') : ''))
  if (why) console.log('  UNREACHABLE: ' + why + ' — these items buy a form no student can sit.')
  if (plan.length > 1) console.log('  NOTE: more than one domain is short. Authoring only the thinnest buys NOTHING.')
}
if (deferred.length) {
  console.log('')
  console.log('NOT RANKED — unreachable in the student UI, so a cheap deficit here is not a cheap form:')
  for (const [k, why] of deferred) console.log('  ' + k.padEnd(16) + why)
  console.log('  (pass the key explicitly to cost one anyway)')
}
console.log('')
