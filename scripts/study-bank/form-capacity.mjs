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
import { refuseUnknownArgs } from './checker-input.mjs'
// A22: live-only, no file mode — refuse a batch path rather than ignore it.
refuseUnknownArgs('form-capacity.mjs')

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
/* THE QUOTA TABLES USED TO LIVE HERE, and a second copy lived in
 * next-form.mjs. They are now ONE module that parses act-test.ts and
 * assemble.ts directly -- see blueprint-quotas.mjs, whose header lists the
 * five wrong numbers the copies produced on 2026-09-12, two of them inside
 * the file written to end the first three.
 *
 * The drift guard that used to sit below is GONE ON PURPOSE, not lost: it
 * checked this file's hand-typed copy against act-test.ts, and there is no
 * longer a copy to check. blueprint-quotas.mjs reads act-test.ts as its only
 * source and throws if a parse finds nothing.
 *
 * `minimums` still matters here: ACT shares are published range MINIMUMS and
 * SAT shares are an exact partition, which changes the rounding. perForm()
 * holds that distinction so neither caller has to remember it.
 */
import { QUOTAS, assertShares } from './blueprint-quotas.mjs'

const shareErrors = assertShares()
if (shareErrors.length) { for (const e of shareErrors) console.error('REFUSING: ' + e); process.exit(2) }

const shares = key => QUOTAS[key]?.domains ?? null
const SAT_BLUEPRINT = { reading_writing: shares('sat/reading_writing'), math: shares('sat/math') }
const ACT_QUOTAS = {
  english: shares('act/english'), math: shares('act/math'),
  reading: shares('act/reading'), science: shares('act/science'),
}
for (const [k, v] of [...Object.entries(SAT_BLUEPRINT), ...Object.entries(ACT_QUOTAS)]) {
  if (!v || !Object.keys(v).length) { console.error(`REFUSING: no shares for ${k}; blueprint-quotas.mjs did not supply them`); process.exit(2) }
}

const src = readFileSync('src/lib/study/assemble.ts', 'utf8')
for (const dom of Object.keys(SAT_BLUEPRINT.reading_writing)) {
  if (!src.includes(`'${dom}'`)) {
    console.error(`BLUEPRINT drift: assemble.ts no longer mentions ${dom}. Fix this script before trusting it.`)
    process.exit(2)
  }
}

/* PROJECT_COHORT=<cohort> counts that cohort's STAGED rows as if verified,
 * to answer "what does this cohort buy once a sitting clears it". Every line
 * of output is then a projection and the header says so -- a staged cohort is
 * not servable, and a capacity number that silently included one would read
 * exactly like a real one. */
const PROJECT_COHORT = process.env.PROJECT_COHORT ?? ''
if (PROJECT_COHORT && !/^[a-z0-9-]+$/.test(PROJECT_COHORT)) { console.error('REFUSING: PROJECT_COHORT must be a cohort slug'); process.exit(2) }

const pageAll = async () => {
  const out = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('study_item_bank')
      .select('id,family,section,domain,difficulty,passage_group_id,cohort')
      /* .order() is LOAD-BEARING, not tidiness. Without a total order
       * PostgREST may return rows in a different order per page, so
       * .range() windows overlap or skip and pageAll silently returns a
       * DIFFERENT SUBSET each run. Measured 2026-09-12: three consecutive
       * runs reported ACT Math as 401, 428 and 152 items, and the 152 run
       * named the binding domain as Number and Quantity instead of
       * Algebra. Every form count, every "binding domain" and every
       * capacity figure taken from this script before this fix is
       * unreliable -- including a 100-form authoring plan sized off it. */
      .eq('archived', false)
      .or(PROJECT_COHORT ? `verified.eq.true,cohort.eq.${PROJECT_COHORT}` : 'verified.eq.true')
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
  if (r.passage_group_id) {
    const gd = ((bank[k].groupDomains ??= {})[r.passage_group_id] ??= {})
    gd[d] = (gd[d] ?? 0) + 1
  }
  bank[k].byDomain[d] = (bank[k].byDomain[d] ?? 0) + 1
  if (r.difficulty === 'hard') bank[k].hardByDomain[d] = (bank[k].hardByDomain[d] ?? 0) + 1
}

const pad = (s, n) => String(s).padEnd(n)
const num = (s, n) => String(s).padStart(n)

console.log('\nCOMPLETE NON-REPEATING FORMS PER STUDENT\n')
if (PROJECT_COHORT) {
  const n = rows.filter(r => r.cohort === PROJECT_COHORT).length
  console.log(`*** PROJECTION: ${n} STAGED rows of ${PROJECT_COHORT} counted as if verified. Not servable until a sitting flips them. ***\n`)
  if (!n) { console.error(`REFUSING: PROJECT_COHORT=${PROJECT_COHORT} matched zero rows -- a projection over nothing is not a projection.`); process.exit(2) }
}
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
   * UPDATED 2026-10-02: the english draw now DOES look at domain --
   * pickEnglishPassages picks five whole passages whose counts sit inside
   * ENGLISH_QUOTAS. Capacity is still whole complete passages; what domain
   * mix changes is how many of those forms are COMPLIANT, which the note
   * below now replays rather than inferring from bank-wide shares.
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
      /* A bank-wide share above every floor does NOT mean a form can be
       * drawn inside the ranges: passages are indivisible, and every range
       * has a CEILING too (PoW 32% is the one a 4/2/4 passage breaks). So
       * also replay the assembler's own rule -- pickEnglishPassages in
       * assemble.ts: five whole passages, every domain's count on the
       * 50-item form inside [ceil(min), floor(max)] -- as sequential draws
       * for one student, each removing what it used. */
      const n = pd.want * pd.per
      const doms = Object.keys(quota)
      const lo = doms.map(d => Math.ceil(quota[d] * n - 1e-9))
      const maxima = QUOTAS[`${family}/${section}`]?.max
      if (!maxima || doms.some(d => typeof maxima[d] !== 'number')) {
        console.error(`REFUSING: no range maxima for ${family}/${section} -- a compliance replay without ceilings would pass forms that break them`)
        process.exit(2)
      }
      const hi = doms.map(d => Math.floor(maxima[d] * n + 1e-9))
      let pool = Object.entries(b.groupDomains ?? {}).filter(([g]) => (b.groups[g] ?? 0) >= pd.per)
        .sort(([a], [c]) => a.localeCompare(c)).map(([g, dd]) => [g, doms.map(d => dd[d] ?? 0)])
      let compliant = 0
      for (;;) {
        const pick = []
        const tally = doms.map(() => 0)
        const dfs = start => {
          if (pick.length === pd.want) return tally.every((t, i) => t >= lo[i] && t <= hi[i])
          for (let i = start; i <= pool.length - (pd.want - pick.length); i++) {
            const c = pool[i][1]
            if (c.some((v, k) => tally[k] + v > hi[k])) continue
            c.forEach((v, k) => { tally[k] += v }); pick.push(i)
            if (dfs(i + 1)) return true
            pick.pop(); c.forEach((v, k) => { tally[k] -= v })
          }
          return false
        }
        if (!dfs(0)) break
        compliant++
        const used = new Set(pick)
        pool = pool.filter((_, i) => !used.has(i))
      }
      b.compliantForms = compliant
      // The verdict is the replay, not the bank-wide share: shares can clear
      // every floor while no five whole passages fit, and a share under a
      // floor can coexist with a few compliant forms.
      if (compliant === 0) {
        note = `  BLUEPRINT VIOLATION on every form: ${lines.length ? lines.join('; ') : 'bank-wide shares clear every floor, but NO five whole passages land inside every range'}`
      } else if (compliant < forms) {
        note = `  BLUEPRINT VIOLATION on ${forms - compliant} of ${forms} forms: only ${compliant} drawable inside every range (sequential draws, the assembler's rule)${lines.length ? '; ' + lines.join('; ') : ''}`
      } else {
        note = `  blueprint mix satisfied: all ${forms} forms drawable inside every range over ${doms.length} domains (sequential draws, the assembler's rule)`
      }
    }
    console.log(pad(label + (hidden ? ' (hidden)' : ''), 24) + num(b.total, 6) + num(naive, 7) + num(forms, 11)
      + `   ${complete} complete passages / ${pd.want} per form — drawn by passage, mix chosen to fit ENGLISH_QUOTAS (pickEnglishPassages)`)
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
    /* Say so -- but only where it is true. The circularity is in the DOMAIN
     * SPLIT: `need` above is derived from the bank's own current proportions,
     * so a "binding domain" printed from it restates the total. The SECTION
     * quota is not circular; it comes from ADMISSION_BLUEPRINT.
     *
     * So on a section with ONE domain there is no split to infer, and this
     * line used to say the number was therefore "exact" -- "SSAT Verbal is 180
     * items at a published 60 per form, which is 3 forms, full stop".
     *
     * THAT WAS WRONG, AND IT WAS WRONG IN THE FLATTERING DIRECTION. Corrected
     * 2026-09-21, prompted by students running out of SSAT tests while this
     * script said they had three or four. The division is exact; the CLAIM is
     * that items/form-size is the capacity, and that holds only if every item
     * is independently drawable. In this family it is not:
     *
     *   - Reading is drawn BY PASSAGE, so a passage that cannot supply a full
     *     set contributes less than its item count.
     *   - Verbal and Math take AT MOST ONE ITEM PER GROUP per form, because
     *     SSAT verbal is banked in bijective sets -- 180 verbal items sit in
     *     136 groups.
     *
     * Neither is a domain split, so neither is visible here. Measured against
     * the real draw, SSAT reading delivered ONE clean form where this line
     * promised three. `admission-form-depth.ts` replays the actual assembler
     * and is the number to quote for this family; this one is an upper bound.
     * A confident label on an upper bound is worse than no label. */
    binding = doms.length === 1
      ? `${binding}  [single domain — UPPER BOUND; passage and one-per-group rules are not modelled here, run admission-form-depth.ts]`
      : `${binding}  [DOMAIN SPLIT INFERRED FROM CURRENT SHAPE — circular, treat as the naive number]`
  }
  if (family === 'act' && (section === 'reading' || section === 'science')) {
    binding += '  [ALSO PASSAGE-DRAWN — the domain number is an upper bound]'
  }
  /* TOEFL IS NOT DOMAIN-QUOTA'D AT ALL — corrected 2026-10-02. The line
   * above used to call this number "circular" and leave it standing. It is
   * an UPPER BOUND, and a loose one: a TOEFL section is drawn by TASK, per
   * ADAPTIVE PATH (lower reads Daily Life + hears Announcements, upper reads
   * Academic Passages + hears Academic Talks), in WHOLE SETS with strict
   * packing. Replaying the real assembler against a simulated ledger gave
   * Reading/Listening 28/29 here vs 3 clean sittings on the lower path
   * (Announcement) and 4 on the upper (Conversation). Quote that script. */
  if (family === 'toefl') {
    binding = 'UPPER BOUND ONLY — drawn by task per adaptive path in whole sets; real depth: npx tsx scripts/study-bank/toefl-form-depth.ts'
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
