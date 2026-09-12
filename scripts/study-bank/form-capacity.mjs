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
/* ACT per-domain share, copied from act-test.ts. These are PUBLISHED percentage
 * ranges, so the per-form need is the range MINIMUM — a form may legally carry
 * more, but it may not carry fewer. English has no published per-domain split,
 * so it is deliberately absent and reported as unmodelled rather than guessed.
 *
 * These exist because the fallback below (assume the bank's own domain mix is
 * the target) is CIRCULAR: need = perForm x have/total makes floor(have/need)
 * collapse to floor(total/perForm) for every domain, so it reproduces the naive
 * number and names an essentially arbitrary "binding domain". On 2026-09-11 it
 * named ACT Math's binding domain as Geometry (47 items). Measured against the
 * real quotas the binding domains are Algebra (25) and Functions (24) at three
 * forms, and Geometry serves five. Authoring 20 Geometry items on the strength
 * of that column would have moved the number by zero.
 */
const ACT_QUOTAS = {
  // english was ABSENT here until 2026-09-11, which made the blueprint check
  // below iterate zero domains and print "satisfied" — a verdict over no
  // input, the defect CLAUDE.md names. Units are DECIMAL shares, matching the
  // rest of this map; act-test.ts states them as percentages and the drift
  // guard below reconciles the two.
  english: {
    'Conventions of Standard English': 0.51, 'Production of Writing': 0.29,
    'Knowledge of Language': 0.13,
  },
  math: {
    'Number and Quantity': 0.10, 'Algebra': 0.17, 'Functions': 0.17,
    'Geometry': 0.17, 'Statistics and Probability': 0.12,
    'Integrating Essential Skills': 0.20,
  },
  reading: {
    'Key Ideas and Details': 0.44, 'Craft and Structure': 0.26,
    'Integration of Knowledge and Ideas': 0.19,
  },
  science: {
    'Interpretation of Data': 0.38, 'Scientific Investigation': 0.18,
    'Evaluation of Models, Inferences, and Experimental Results': 0.24,
  },
}

const actSrc = readFileSync('src/lib/study/act-test.ts', 'utf8')
for (const [section, quotas] of Object.entries(ACT_QUOTAS)) {
  for (const [dom, share] of Object.entries(quotas)) {
    // The domain must still be spelled this way, AND the range minimum must
    // still be this number. Checking only the name would let a blueprint
    // reweighting pass silently.
    const m = actSrc.match(new RegExp(`'${dom.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}':\\s*\\[(\\d+),`))
    if (!m) {
      console.error(`ACT_QUOTAS drift: act-test.ts no longer lists ${section}/${dom}. Fix this script before trusting it.`)
      process.exit(2)
    }
    if (Number(m[1]) !== Math.round(share * 100)) {
      console.error(`ACT_QUOTAS drift: ${section}/${dom} minimum is ${m[1]}% in act-test.ts, ${Math.round(share * 100)}% here.`)
      process.exit(2)
    }
  }
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
      .select('id,family,section,domain,difficulty,passage_group_id')
      /* .order() is LOAD-BEARING, not tidiness. Without a total order
       * PostgREST may return rows in a different order per page, so
       * .range() windows overlap or skip and pageAll silently returns a
       * DIFFERENT SUBSET each run. Measured 2026-09-12: three consecutive
       * runs reported ACT Math as 401, 428 and 152 items, and the 152 run
       * named the binding domain as Number and Quantity instead of
       * Algebra. Every form count, every "binding domain" and every
       * capacity figure taken from this script before this fix is
       * unreliable -- including a 100-form authoring plan sized off it. */
      .eq('verified', true).eq('archived', false)
      .order('id', { ascending: true }).range(from, from + 999)
    if (error) throw new Error(error.message)
    out.push(...(data ?? [])); if (!data || data.length < 1000) break
  }
  /* A duplicate id proves the paging window slipped. Refuse rather than
   * report: a capacity number over a corrupted population reads exactly
   * like a real one. */
  const ids = new Set(out.map(r => r.id))
  if (ids.size !== out.length) {
    console.error(`REFUSING: paged ${out.length} rows but only ${ids.size} distinct ids — the range window slipped.`)
    process.exit(2)
  }
  return out
}

const rows = await pageAll()
const bank = {}
for (const r of rows) {
  const k = `${r.family}/${r.section}`
  ;(bank[k] ??= { total: 0, byDomain: {}, hardByDomain: {}, groups: {} })
  bank[k].total++
  if (r.passage_group_id) bank[k].groups[r.passage_group_id] = (bank[k].groups[r.passage_group_id] ?? 0) + 1
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
  const weights =
    family === 'sat' ? (SAT_BLUEPRINT[section] ?? null)
    : family === 'act' ? (ACT_QUOTAS[section] ?? null)
    : null
  /*
   * PASSAGE-DRAWN SECTIONS ARE NOT DOMAIN-CONSTRAINED — fixed 2026-09-11.
   *
   * assembleActSection draws ACT english as takePassages(ranked, 5, 10) with
   * NO accept predicate, so domain never enters the draw at all. Applying a
   * per-domain quota model to it printed "binding domain: Conventions of
   * Standard English" — a constraint the assembler does not have — and on the
   * strength of that line a batch was commissioned weighted toward CSE to
   * "relieve capacity". It could not have: capacity here is whole COMPLETE
   * passages, floor(groups / passages-per-form), and no domain mix changes
   * that number. The same mistake had already been made once today in ACT
   * Math, where 20 Statistics items moved route-aware capacity by zero
   * because Statistics was not the binding domain.
   *
   * ACT reading and science are also passage-drawn, but their draw carries a
   * real accept predicate (one passage per genre; per-format counts), so a
   * domain reading of them is wrong in a different way and is flagged rather
   * than silently replaced.
   */
  const PASSAGE_DRAWN = { 'act/english': { per: 10, want: 5 } }
  const pd = PASSAGE_DRAWN[`${family}/${section}`]
  if (pd) {
    const complete = Object.values(b.groups).filter(n => n >= pd.per).length
    const forms = Math.floor(complete / pd.want)
    const quota = ACT_QUOTAS[section]
    let note
    if (!quota || !Object.keys(quota).length) {
      // A compliance verdict over zero domains is not a verdict. This exact
      // line printed "blueprint mix satisfied" for ACT English while the bank
      // sat 11 points under the published floor, because `english` was missing
      // from the map above and the loop ran zero times.
      note = `  NOT MEASURED — no published quota for ${section} in this script`
    } else {
      const lines = []
      for (const [dom, min] of Object.entries(quota)) {
        // min is a DECIMAL share, not a percentage. The first version of this
        // divided it by 100 and so compared 0.40 against 0.0051.
        const share = (b.byDomain[dom] ?? 0) / b.total
        if (share < min) lines.push(`${dom} ${(100 * share).toFixed(1)}% vs floor ${(100 * min).toFixed(0)}%`)
      }
      note = lines.length
        ? `  BLUEPRINT VIOLATION on every form: ${lines.join('; ')}`
        : `  blueprint mix satisfied over ${Object.keys(quota).length} domains`
    }
    console.log(pad(label + (hidden ? ' (hidden)' : ''), 24) + num(b.total, 6) + num(naive, 7) + num(forms, 11)
      + `   ${complete} complete passages / ${pd.want} per form — DRAWN BY PASSAGE, no domain filter`)
    notes.push(`${label}:${note}`)
    continue
  }

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
    // Say so. This branch cannot see a real constraint, and a "binding domain"
    // printed from it is a restatement of the total, not a measurement.
    binding = `${binding}  [NO PUBLISHED QUOTA — circular, treat as the naive number]`
  }
  if (family === 'act' && (section === 'reading' || section === 'science')) {
    binding += '  [ALSO PASSAGE-DRAWN — the domain number is an upper bound]'
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
