#!/usr/bin/env node
/**
 * form-capacity.mjs — how many complete, NON-REPEATING forms can each test
 * serve one student from the current bank?
 *
 * Why this is not `total / questions-per-form`: a form is drawn to per-domain
 * quotas, so the binding constraint is the THINNEST domain, not the total.
 * SAT R&W holds ~1,000 items and 54 per form, which divides to 18 — but the
 * hard route wants about 7 Standard English Conventions hard items per form
 * against 20 in the bank, so a strong student gets 2 hard forms, not 18. The
 * gap between those two numbers is the entire point of this script.
 *
 * What it models:
 *   - per-domain quotas, from the same BLUEPRINT the assembler uses
 *   - the SAT module-2 HARD route, which is the real cap for a strong student
 *   - "reachable": staged (verified=false) and hidden/locked rows do not count
 *
 * What it does NOT model, and would overstate if you forget:
 *   - passage cohesion (ACT/TOEFL draw whole passages; a passage half-used is
 *     not half a form)
 *   - the easy/medium route, which is far less constrained than the hard one
 *   - any per-student exposure already recorded
 *
 *   node scripts/study-bank/form-capacity.mjs
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync(process.cwd() + '/.env.local', 'utf8')
  .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } })

/* Read the gates out of the UI source so this cannot drift from the page that
 * enforces them — a hidden subtopic is drawable and unreachable. */
const topicPage = readFileSync('src/app/mobile/study/topic/[slug]/page.tsx', 'utf8')
const grab = re => (topicPage.match(re)?.[1] ?? '').match(/'([^']+)'/g)?.map(x => x.slice(1, -1)) ?? []
const HIDDEN = new Set(grab(/HIDDEN_SUBTOPIC_SLUGS = new Set\(\[([^\]]*)\]/))

/* Section sizes, from the specs the runner uses. */
const SECTIONS = [
  // family, section, label, questions per form, hidden?
  ['sat', 'reading_writing', 'SAT Reading & Writing', 54],       // 27 x 2 modules
  ['sat', 'math', 'SAT Math', 44],                                // 22 x 2 modules
  ['act', 'english', 'ACT English', 50],
  ['act', 'math', 'ACT Math', 45],
  ['act', 'reading', 'ACT Reading', 36],
  ['act', 'science', 'ACT Science', 40, HIDDEN.has('act-science')],
  ['toefl', 'reading', 'TOEFL Reading', 28],
  ['toefl', 'listening', 'TOEFL Listening', 28],
  ['ssat', 'math', 'SSAT Math', 50],
  ['ssat', 'verbal', 'SSAT Verbal', 60],
  ['ssat', 'reading', 'SSAT Reading', 40],
  ['isee', 'math', 'ISEE Math', 47],
  ['isee', 'verbal', 'ISEE Verbal', 40],
  ['isee', 'reading', 'ISEE Reading', 36],
]

/* SAT per-domain share, copied from assemble.ts BLUEPRINT. Kept in step by
 * the assertion below rather than by hope. */
const SAT_BLUEPRINT = {
  reading_writing: {
    'Information and Ideas': 0.26, 'Craft and Structure': 0.28,
    'Expression of Ideas': 0.20, 'Standard English Conventions': 0.26,
  },
  math: {
    'Algebra': 0.35, 'Advanced Math': 0.35,
    'Problem-Solving and Data Analysis': 0.15, 'Geometry and Trigonometry': 0.15,
  },
}
const src = readFileSync('src/lib/study/assemble.ts', 'utf8')
for (const dom of Object.keys(SAT_BLUEPRINT.reading_writing)) {
  if (!src.includes(`'${dom}'`)) {
    console.error(`BLUEPRINT drift: assemble.ts no longer mentions ${dom}. Fix this script before trusting it.`)
    process.exit(2)
  }
}

const pageAll = async () => {
  const out = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('study_item_bank')
      .select('family,section,domain,difficulty')
      .eq('verified', true).eq('archived', false).range(from, from + 999)
    if (error) throw new Error(error.message)
    out.push(...(data ?? [])); if (!data || data.length < 1000) break
  }
  return out
}

const rows = await pageAll()
const bank = {}
for (const r of rows) {
  const k = `${r.family}/${r.section}`
  ;(bank[k] ??= { total: 0, byDomain: {}, hardByDomain: {} })
  bank[k].total++
  const d = r.domain ?? '(none)'
  bank[k].byDomain[d] = (bank[k].byDomain[d] ?? 0) + 1
  if (r.difficulty === 'hard') bank[k].hardByDomain[d] = (bank[k].hardByDomain[d] ?? 0) + 1
}

const pad = (s, n) => String(s).padEnd(n)
const num = (s, n) => String(s).padStart(n)

console.log('\nCOMPLETE NON-REPEATING FORMS PER STUDENT\n')
console.log(pad('test', 24) + num('items', 6) + num('naive', 7) + num('by domain', 11) + '   binding domain')
console.log('-'.repeat(92))

const notes = []
for (const [family, section, label, perForm, hidden] of SECTIONS) {
  const b = bank[`${family}/${section}`]
  if (!b) { console.log(pad(label, 24) + num('—', 6) + '   no items'); continue }
  const naive = Math.floor(b.total / perForm)
  // Domain-aware: a form needs ceil(share x perForm) of each domain.
  const weights = SAT_BLUEPRINT[section] && family === 'sat' ? SAT_BLUEPRINT[section] : null
  let byDomain = naive, binding = 'even split assumed'
  if (weights) {
    let worst = Infinity
    for (const [dom, w] of Object.entries(weights)) {
      const need = Math.max(1, Math.round(w * perForm))
      const have = b.byDomain[dom] ?? 0
      const forms = Math.floor(have / need)
      if (forms < worst) { worst = forms; binding = `${dom} (${have} / ${need} per form)` }
    }
    byDomain = worst
  } else {
    // No published per-domain weights here: assume the bank's own domain mix
    // is the target, which is the most generous reading and is stated as such.
    const doms = Object.entries(b.byDomain)
    let worst = Infinity
    for (const [dom, have] of doms) {
      const need = Math.max(1, Math.round(perForm * have / b.total))
      const forms = Math.floor(have / need)
      if (forms < worst) { worst = forms; binding = `${dom} (${have} / ~${need} per form)` }
    }
    byDomain = Math.min(naive, worst)
  }
  console.log(pad(label + (hidden ? ' (hidden)' : ''), 24) + num(b.total, 6) + num(naive, 7) + num(byDomain, 11) + '   ' + binding)
  if (hidden) notes.push(`${label}: drawable but the subtopic is hidden — no student can open it.`)
}

/* The number that actually bites: SAT module 2 on the hard route. */
console.log('\nSAT MODULE-2 HARD ROUTE (what a strong student actually gets)\n')
for (const section of ['reading_writing', 'math']) {
  const b = bank[`sat/${section}`]
  const perModule = section === 'reading_writing' ? 27 : 22
  let worst = Infinity, binding = ''
  for (const [dom, w] of Object.entries(SAT_BLUEPRINT[section])) {
    const need = Math.max(1, Math.round(w * perModule))
    const have = b.hardByDomain[dom] ?? 0
    const forms = Math.floor(have / need)
    if (forms < worst) { worst = forms; binding = `${dom} — ${have} hard, needs ~${need} per form` }
  }
  console.log(`  ${pad(section === 'reading_writing' ? 'SAT R&W' : 'SAT Math', 12)} ${num(worst, 2)} hard forms   capped by ${binding}`)
}
/* Gap to a target, so "we want N forms" turns into an item count. */
const TARGET = Number(process.env.TARGET ?? 0)
if (TARGET > 0) {
  console.log(`\nITEMS NEEDED TO REACH ${TARGET} NON-REPEATING FORMS\n`)
  console.log(pad('test', 24) + num('have', 7) + num('need', 8) + num('to write', 10))
  console.log('-'.repeat(52))
  let total = 0
  for (const [family, section, label, perForm] of SECTIONS) {
    const b = bank[`${family}/${section}`]
    if (!b) continue
    const need = TARGET * perForm
    const gap = Math.max(0, need - b.total)
    total += gap
    console.log(pad(label, 24) + num(b.total, 7) + num(need, 8) + num(gap.toLocaleString(), 10))
  }
  console.log('-'.repeat(52))
  console.log(pad('TOTAL', 24) + num('', 7) + num('', 8) + num(total.toLocaleString(), 10))
}

for (const n of notes) console.log(`\nnote: ${n}`)
console.log()
