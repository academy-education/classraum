/**
 * hardening-candidates.ts — live items graded JUST BELOW hard, for the
 * co-founder hardening pass (/admin/bank-qc?tab=hardening).
 *
 *   npx tsx scripts/study-bank/hardening-candidates.ts            # report (read-only)
 *   npx tsx scripts/study-bank/hardening-candidates.ts --json out.json
 *   npx tsx scripts/study-bank/hardening-candidates.ts --write    # upsert study_item_hardening_candidates (migration 124)
 *   npx tsx scripts/study-bank/hardening-candidates.ts --selftest
 *
 * ── Where the votes come from (derived, not guessed) ─────────────────
 * The bank row carries ONE difficulty: the column (source of truth since
 * REGISTER 2026-10-06) and verify_meta.grader_difficulty, the panel MEDIAN.
 * A median of medium hides whether the panel was medium/medium/medium or
 * hard/medium/hard-minus. The per-grader votes and their notes only exist in
 * the QC files in this directory:
 *
 *   <base>.grader-{a,b,c}.json   with-source graders: { id: { difficulty, note, ... } }
 *   <base>.solver-{a,b,c}.json   the older with-source solver files that also graded
 *   <base>.qc-reasons.json       { id: { grades: "easy/medium/hard" } } when no grader files
 *
 * keyed by the batch's LOCAL id. A local id maps to content through the
 * sibling files of the same base (<base>.batch.json, .kept.batch.json,
 * .items.json, .grade.json) or straight to a bank id through <base>.key.json
 * (`_item_id` / `itemId` / `bank_id`).
 *
 * ── Matching a vote to a live row ────────────────────────────────────
 * By CONTENT: normalised prompt + the SORTED normalised options (graders saw
 * shuffled renders), and the passage too whenever the source file has one.
 * Never by prompt alone (CLAUDE.md: positional C&S stems gave 8 of 18 rows
 * one prompt). A vote whose content no longer matches the live row was cast
 * on text that has since been repaired and is DROPPED, not carried over —
 * the same rule study_item_reviews_fresh applies to human reviews.
 *
 * ── Candidate rule ───────────────────────────────────────────────────
 *   live (verified, not archived), labelled MEDIUM, plain text options, and
 *   >= 1 grader called it hard, OR a grader note says it is nearly hard.
 * "The author called it hard" alone is printed but NOT a candidate: authors
 * over-label hard on every batch on record (REGISTER: 13 consecutive
 * demotions); that is not a grader signal.
 *
 * Priority: the SAT domains that bind the module-2 hard route first
 * (fewest hard forms, from blueprint-quotas.mjs exactly as form-capacity.mjs
 * computes them), then the rest of SAT, then ACT/SSAT/ISEE; within a domain,
 * more hard votes first.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { QUOTAS } from './blueprint-quotas.mjs'

const DIR = 'scripts/study-bank'
const FAMILIES = ['sat', 'act', 'ssat', 'isee']

export interface Vote { source: string; grader: string; difficulty: string; note: string | null }

const norm = (s: unknown) => String(s ?? '').normalize('NFKC').toLowerCase()
  .replace(/^[a-e][.)]\s+/, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
const choiceSig = (choices: unknown) =>
  Array.isArray(choices) ? choices.map(c => norm(typeof c === 'string' ? c : JSON.stringify(c))).sort().join('|') : ''
export const sigOf = (it: { prompt?: unknown; choices?: unknown }) => `${norm(it.prompt)}\u0001${choiceSig(it.choices)}`

export const NEAR_HARD = /\b(?:almost|nearly|borderline|close to|bordering on|verg(?:es|ing) on|near(?:ly)?)[- ]hard\b|\bmedium[-/ ]?(?:to[- ])?hard\b|\bhard[-/]medium\b|\bupper[- ]medium\b|\blow(?:er)?[- ](?:end )?hard\b|\bcould (?:be|pass as|count as) hard\b|\bhard-?ish\b|\btop of medium\b|\bjust (?:short of|below|under) hard\b/i

/** A grader who graded medium and SAID what keeps it from hard ("medium
 *  rather than hard: the stem hands over the legs in order", "downgraded from
 *  the author's hard: one standard technique"). Not a vote for hard — a
 *  ready-made brief for the one twist. A secondary tier, counted apart. */
export const WHY_NOT_HARD = /\b(?:medium|mid-form),? (?:rather than|not|instead of) hard\b|\b(?:downgraded|graded down|demoted) from (?:the author'?s )?'?hard|\bwhat keeps (?:this|it) (?:at )?medium\b|\bnot hard\b[^.]{0,80}\bbecause\b/i

/** One grader record -> a normalised band, or null when it carries none. */
export function bandOfRecord(v: Record<string, unknown>): string | null {
  const d = v.difficulty
  if (typeof d === 'string') {
    const s = d.toLowerCase().trim()
    if (/^(easy|medium|hard)$/.test(s)) return s
    if (/medium.*hard|hard.*medium/.test(s)) return 'medium-hard'
    return null
  }
  if (typeof v.hard === 'boolean') return v.hard ? 'hard' : 'not-hard'
  return null
}

const noteOf = (v: Record<string, unknown>) => {
  const n = [v.note, v.grader_note, v.difficulty_note, v.why, v.notes].find(x => typeof x === 'string' && x.trim())
  return n ? String(n).slice(0, 500) : null
}

export const isHardVote = (b: string) => b === 'hard' || b === 'medium-hard'

interface ItemRef { prompt?: unknown; passage?: unknown; choices?: unknown; bankId?: string; localId?: string }

/** Pull { id -> content | bankId } out of any sibling file shape. */
export function refsFromFile(parsed: unknown): Map<string, ItemRef> {
  const out = new Map<string, ItemRef>()
  const put = (id: unknown, ref: ItemRef) => {
    if (id == null) return
    const k = String(id)
    out.set(k, { ...(out.get(k) ?? {}), ...ref })
  }
  const visit = (v: unknown, ctxPassage: unknown, keyHint: string | null, top = false) => {
    if (Array.isArray(v)) { v.forEach(x => visit(x, ctxPassage, null)); return }
    if (!v || typeof v !== 'object') return
    const o = v as Record<string, unknown>
    const passage = o.passage ?? o.passage_text ?? ctxPassage
    const bankId = [o._item_id, o.itemId, o.bank_id, o.item_id].find(x => typeof x === 'string' && /^[0-9a-f-]{36}$/.test(x as string)) as string | undefined
    // At the top of a keyed file the KEY is the label graders used ("1"),
    // and o.localId is where it points — not the other way round.
    const id = top && keyHint != null ? keyHint : (o.id ?? o.localId ?? keyHint)
    const localId = typeof o.localId === 'string' && o.localId !== id ? o.localId : undefined
    if (typeof o.prompt === 'string') put(id, { prompt: o.prompt, passage, choices: o.choices, ...(bankId ? { bankId } : {}) })
    else if (bankId) put(id, { bankId })
    else if (localId) put(id, { localId })
    for (const [k, x] of Object.entries(o)) if (x && typeof x === 'object') visit(x, passage, Array.isArray(o) ? null : k)
  }
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    // keyed shape: { "<id>": {...} }
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) visit(v, null, k, true)
  } else visit(parsed, null, null)
  return out
}

/** All grader votes in the directory, grouped by file base. */
function collectVotes(files: string[]): Map<string, Map<string, Vote[]>> {
  const byBase = new Map<string, Map<string, Vote[]>>()
  const graderBases = new Set(files.filter(f => /\.grader-[a-z]\.json$/.test(f)).map(f => f.replace(/\.grader-[a-z]\.json$/, '')))
  for (const f of files) {
    let m = f.match(/^(.*)\.(grader|solver)-([a-z])\.json$/)
    let kind: 'grader' | 'panel' = 'grader'
    let base: string, grader: string
    if (m) { base = m[1]; grader = `${m[2]}-${m[3]}` }
    else if ((m = f.match(/^(.*)\.qc-reasons\.json$/))) { base = m[1]; grader = 'panel'; kind = 'panel'; if (graderBases.has(base)) continue }
    else continue
    let j: unknown
    try { j = JSON.parse(readFileSync(join(DIR, f), 'utf8')) } catch { continue }
    if (j && typeof j === 'object' && !Array.isArray(j) && (j as Record<string, unknown>).items && typeof (j as Record<string, unknown>).items === 'object') j = (j as Record<string, unknown>).items
    if (!j || typeof j !== 'object' || Array.isArray(j)) continue
    for (const [id, rec] of Object.entries(j as Record<string, unknown>)) {
      if (!rec || typeof rec !== 'object') continue
      const r = rec as Record<string, unknown>
      const votes: Vote[] = []
      if (kind === 'panel') {
        if (typeof r.grades !== 'string') continue
        r.grades.split('/').forEach((g, i) => {
          const b = bandOfRecord({ difficulty: g })
          if (b) votes.push({ source: f, grader: `panel-${'abc'[i] ?? i}`, difficulty: b, note: null })
        })
        const why = Array.isArray(r.why) && r.why.length ? r.why.join('; ') : null
        if (why && votes[0]) votes[0].note = why
      } else {
        const b = bandOfRecord(r)
        if (!b) continue
        votes.push({ source: f, grader, difficulty: b, note: noteOf(r) })
      }
      if (!votes.length) continue
      const g = byBase.get(base) ?? byBase.set(base, new Map()).get(base)!
      g.set(id, [...(g.get(id) ?? []), ...votes])
    }
  }
  return byBase
}

interface BankRow {
  id: string; family: string; section: string; domain: string; subskill: string | null
  difficulty: string; cohort: string | null; content_sha: string
  item: { prompt?: string; passage?: string | null; choices?: unknown }
  verify_meta: Record<string, unknown> | null
}

function loadEnv(): Record<string, string> {
  const raw = readFileSync(process.cwd() + '/.env.local', 'utf8')
  return Object.fromEntries(raw.split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
}

function selftest() {
  let bad = 0
  const fail = (m: string) => { console.error(`SELF-TEST FAIL: ${m}`); bad++ }
  if (bandOfRecord({ difficulty: 'Hard' }) !== 'hard') fail('Hard')
  if (bandOfRecord({ difficulty: 'medium-hard' }) !== 'medium-hard') fail('medium-hard')
  if (bandOfRecord({ hard: true }) !== 'hard') fail('hard:true')
  if (bandOfRecord({ hard: false }) !== 'not-hard') fail('hard:false')
  if (bandOfRecord({ pick: 'A' }) !== null) fail('no band must be null, not medium')
  if (!NEAR_HARD.test('almost hard: the trap is flagged by the stem')) fail('almost hard')
  if (!NEAR_HARD.test('medium/hard boundary')) fail('medium/hard')
  if (NEAR_HARD.test('hard to say whether B is defensible')) fail('"hard to say" is not a difficulty note')
  if (NEAR_HARD.test('this is hard')) fail('plain "hard" note is a vote, not a near-hard note')
  if (NEAR_HARD.test('Two clean steps - medium, not hard.')) fail('"medium, not hard" is a firm medium, not near-hard')
  if (!WHY_NOT_HARD.test('Two clean steps - medium, not hard.')) fail('why-not-hard: "medium, not hard"')
  if (!WHY_NOT_HARD.test("Downgraded from the author's hard: rewriting to base 2 is one technique")) fail('why-not-hard: downgraded')
  if (WHY_NOT_HARD.test('graded hard by all three')) fail('why-not-hard must not fire on a hard grade')
  // shuffled options and a letter prefix match; a changed option does not
  const a = sigOf({ prompt: 'What is x?', choices: ['A. 1', 'B. 2', 'C. 3', 'D. 4'] })
  const b = sigOf({ prompt: 'What is  x ?', choices: ['3', '1', '4', '2'] })
  const c = sigOf({ prompt: 'What is x?', choices: ['1', '2', '3', '5'] })
  if (a !== b) fail('shuffled/prefixed options must match')
  if (a === c) fail('a changed option must not match')
  const refs = refsFromFile({ Q1: { letter: 'B', _item_id: '11111111-1111-1111-1111-111111111111' } })
  if (refs.get('Q1')?.bankId !== '11111111-1111-1111-1111-111111111111') fail('key.json bank id')
  const refs2 = refsFromFile([{ id: 'X1', prompt: 'p', choices: ['a', 'b'] }])
  if (refs2.get('X1')?.prompt !== 'p') fail('batch array id')
  if (bad) { console.error(`${bad} self-test failure(s)`); process.exit(1) }
  console.log('hardening-candidates self-test: bands, near-hard notes, content match, sibling refs — OK')
}

async function main() {
  const args = process.argv.slice(2)
  if (args.includes('--selftest')) { selftest(); return }
  if (!existsSync('.env.local')) { console.error('run from the repo root (.env.local not found)'); process.exit(1) }
  const env = loadEnv()
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  // ── live bank, paged on a total order, count asserted ──
  const { count, error: ce } = await db.from('study_item_bank').select('id', { count: 'exact', head: true })
    .eq('verified', true).eq('archived', false).in('family', FAMILIES)
  if (ce || typeof count !== 'number') throw new Error(`count failed: ${ce?.message ?? 'no count'}`)
  const rows: BankRow[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('study_item_bank')
      .select('id,family,section,domain,subskill,difficulty,cohort,content_sha,item,verify_meta')
      .eq('verified', true).eq('archived', false).in('family', FAMILIES)
      .order('id').range(from, from + 999)
    if (error) throw new Error(error.message)
    rows.push(...((data ?? []) as BankRow[]))
    if (!data || data.length < 1000) break
  }
  if (rows.length !== count || new Set(rows.map(r => r.id)).size !== count) {
    console.error(`REFUSING: read ${rows.length} rows, count says ${count}`); process.exit(2)
  }
  const byId = new Map(rows.map(r => [r.id, r]))
  const bySig = new Map<string, BankRow[]>()
  for (const r of rows) { const k = sigOf(r.item); (bySig.get(k) ?? bySig.set(k, []).get(k)!).push(r) }

  // ── votes from the QC files ──
  const files = readdirSync(DIR)
  const votesByBase = collectVotes(files)
  const sibRx = /\.(batch|kept\.batch|items|grade|key|gradekey|ws\.key|withsource-key)\.json$/
  // A render key (ws.key.json) often maps "1" -> a batch localId that lives in
  // a differently-named batch file. Index every batch item id once; an id that
  // appears with two different contents is dropped rather than guessed.
  const globalById = new Map<string, ItemRef | null>()
  for (const f of files.filter(g => /\.(batch|kept\.batch|items)\.json$/.test(g))) {
    try {
      for (const [k, v] of refsFromFile(JSON.parse(readFileSync(join(DIR, f), 'utf8')))) {
        if (v.prompt == null) continue
        const prev = globalById.get(k)
        if (prev === undefined) globalById.set(k, v)
        else if (prev && sigOf(prev) !== sigOf(v)) globalById.set(k, null)
      }
    } catch { /* unreadable batch file: its ids are simply not indexed */ }
  }
  const matched = new Map<string, Vote[]>()
  let voteItems = 0, unmappable = 0, ambiguous = 0, contentChanged = 0, notLive = 0
  const perBase = new Map<string, { n: number; matched: number; changed: number; unmappable: number }>()
  for (const [base, items] of votesByBase) {
    const pb = perBase.get(base) ?? perBase.set(base, { n: 0, matched: 0, changed: 0, unmappable: 0 }).get(base)!
    const refs = new Map<string, ItemRef>()
    const sibs = files.filter(g => (g.startsWith(base + '.') && sibRx.test(g)) || g === `${base}.json`
      || new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-?[a-z]\\.(batch|kept\\.batch)\\.json$`).test(g))
    for (const f of sibs) {
      try { for (const [k, v] of refsFromFile(JSON.parse(readFileSync(join(DIR, f), 'utf8')))) refs.set(k, { ...(refs.get(k) ?? {}), ...v }) } catch { /* unreadable sibling: counted below as unmappable */ }
    }
    for (const [id, votes] of items) {
      voteItems++
      pb.n++
      let ref = refs.get(id)
      if (ref && ref.prompt == null && !ref.bankId && ref.localId) ref = { ...ref, ...(globalById.get(ref.localId) ?? {}) }
      let row: BankRow | undefined
      if (ref?.bankId) {
        row = byId.get(ref.bankId)
        if (!row) { notLive++; continue }
        // A bank id only proves WHICH row; the vote still has to describe its current text.
        if (ref.prompt != null && sigOf(ref) !== sigOf(row.item)) { contentChanged++; pb.changed++; continue }
      } else if (ref?.prompt != null) {
        let hits = bySig.get(sigOf(ref)) ?? []
        if (ref.passage) hits = hits.filter(r => norm(r.item.passage) === norm(ref.passage))
        if (hits.length === 0) { contentChanged++; pb.changed++; continue }   // repaired since, archived, staged, or never inserted
        if (hits.length > 1) { ambiguous++; continue }
        row = hits[0]
      } else { unmappable++; pb.unmappable++; continue }
      pb.matched++
      matched.set(row.id, [...(matched.get(row.id) ?? []), ...votes])
    }
  }

  // ── SAT hard-route binding, exactly as form-capacity.mjs computes it ──
  const hardForms = new Map<string, number>()
  for (const section of ['reading_writing', 'math']) {
    const perModule = section === 'reading_writing' ? 27 : 22
    const shares = (QUOTAS as unknown as Record<string, { domains: Record<string, number> }>)[`sat/${section}`].domains
    for (const [dom, w] of Object.entries(shares)) {
      const need = Math.max(1, Math.round(w * perModule))
      const have = rows.filter(r => r.family === 'sat' && r.section === section && r.domain === dom && r.difficulty === 'hard').length
      hardForms.set(`sat/${section}/${dom}`, Math.floor(have / need))
    }
  }
  const satRank = [...hardForms.entries()].sort((a, b) => a[1] - b[1]).map(([k]) => k)
  const domainRank = (r: BankRow) => {
    const k = `${r.family}/${r.section}/${r.domain}`
    const i = satRank.indexOf(k)
    return i >= 0 ? i : satRank.length + FAMILIES.indexOf(r.family)
  }

  // ── candidates ──
  interface Cand { row: BankRow; votes: Vote[]; hard: number; signals: string[]; priority: number }
  const cands: Cand[] = []
  const stat = new Map<string, { medium: number; withVotes: number; hard2: number; hard1: number; noteOnly: number; whyNot: number; authorOnly: number; hardNow: number }>()
  const st = (r: BankRow) => {
    const k = `${r.family}/${r.section}/${r.domain}`
    return stat.get(k) ?? stat.set(k, { medium: 0, withVotes: 0, hard2: 0, hard1: 0, noteOnly: 0, whyNot: 0, authorOnly: 0, hardNow: 0 }).get(k)!
  }
  for (const r of rows) {
    const s = st(r)
    if (r.difficulty === 'hard') { s.hardNow++; continue }
    if (r.difficulty !== 'medium') continue
    const ch = r.item.choices
    if (!Array.isArray(ch) || !ch.every(c => typeof c === 'string')) continue
    s.medium++
    const votes = matched.get(r.id) ?? []
    const vm = r.verify_meta ?? {}
    const bankNote = typeof vm.difficulty_note === 'string' ? vm.difficulty_note : null
    if (votes.length) s.withVotes++
    const hard = votes.filter(v => isHardVote(v.difficulty)).length
    const nearNote = votes.some(v => v.note && NEAR_HARD.test(v.note)) || (bankNote != null && NEAR_HARD.test(bankNote))
    const whyNot = votes.some(v => v.note && WHY_NOT_HARD.test(v.note))
    const authorHard = vm.author_difficulty === 'hard' || vm.author_reported_difficulty === 'hard'
    const signals: string[] = []
    if (hard) signals.push(`hard_votes:${hard}`)
    if (nearNote) signals.push('near_hard_note')
    if (whyNot) signals.push('why_not_hard_note')
    if (authorHard) signals.push('author_said_hard')
    if (!hard && !nearNote && !whyNot) { if (authorHard) s.authorOnly++; continue }
    if (hard >= 2) s.hard2++; else if (hard === 1) s.hard1++; else if (nearNote) s.noteOnly++; else s.whyNot++
    const tier = hard >= 2 ? 0 : hard === 1 ? 1 : nearNote ? 2 : 3
    cands.push({ row: r, votes: bankNote ? [...votes, { source: 'verify_meta.difficulty_note', grader: 'bank', difficulty: 'note', note: bankNote }] : votes, hard, signals, priority: domainRank(r) * 10 + tier })
  }
  cands.sort((a, b) => a.priority - b.priority || b.hard - a.hard || a.row.id.localeCompare(b.row.id))

  // ── report ──
  console.log(`\nLIVE ROWS READ: ${rows.length} (count ${count}) in ${FAMILIES.join('/')}`)
  console.log(`GRADER VOTE RECORDS: ${voteItems} item-records across ${votesByBase.size} QC bases`)
  console.log(`  matched to a live row by content: ${[...matched.values()].length} rows`)
  console.log(`  dropped: content changed / not live ${contentChanged}, bank id not live ${notLive}, ambiguous ${ambiguous}, no content to match ${unmappable}`)
  if (args.includes('--diag')) {
    console.log('\nPER QC BASE   vote-items  matched  changed/not-in-bank  no-content')
    for (const [b, v] of [...perBase.entries()].sort()) console.log(`  ${b.padEnd(40)} ${String(v.n).padStart(5)} ${String(v.matched).padStart(8)} ${String(v.changed).padStart(8)} ${String(v.unmappable).padStart(8)}`)
  }
  console.log('\nSAT MODULE-2 HARD ROUTE (hard forms per domain, fewest first = highest priority)')
  for (const k of satRank) console.log(`  ${k.padEnd(48)} ${String(hardForms.get(k)).padStart(3)} hard forms`)
  console.log('\nCANDIDATES BY DOMAIN   (medium = live, labelled medium, text options; with votes = per-grader votes matched)')
  console.log(`  ${'domain'.padEnd(52)} ${'hard'.padStart(5)} ${'medium'.padStart(7)} ${'w/votes'.padStart(8)} ${'>=2 hard'.padStart(9)} ${'1 hard'.padStart(7)} ${'near'.padStart(5)} ${'CAND'.padStart(5)} ${'+why-not'.padStart(9)} ${'author-only'.padStart(12)}`)
  const keys = [...stat.keys()].sort((a, b) => {
    const ra = satRank.indexOf(a), rb = satRank.indexOf(b)
    return (ra < 0 ? 99 : ra) - (rb < 0 ? 99 : rb) || a.localeCompare(b)
  })
  let tot = 0, totWhy = 0
  for (const k of keys) {
    const s = stat.get(k)!
    const n = s.hard2 + s.hard1 + s.noteOnly
    tot += n; totWhy += s.whyNot
    console.log(`  ${k.padEnd(52)} ${String(s.hardNow).padStart(5)} ${String(s.medium).padStart(7)} ${String(s.withVotes).padStart(8)} ${String(s.hard2).padStart(9)} ${String(s.hard1).padStart(7)} ${String(s.noteOnly).padStart(5)} ${String(n).padStart(5)} ${String(s.whyNot).padStart(9)} ${String(s.authorOnly).padStart(12)}`)
  }
  console.log(`\n  TOTAL CANDIDATES: ${tot} (a grader voted hard or noted near-hard)`)
  console.log(`  PLUS ${totWhy} secondary (all graders medium, but one wrote what keeps it from hard) — queued after the primaries`)
  console.log('  "author-only" = the author called it hard and no grader did; NOT a candidate (authors over-label hard).')
  console.log('  A medium item with no matched votes is not a non-candidate by evidence — it is unmeasured at the per-grader level.\n')
  for (const c of cands.slice(0, 15)) {
    console.log(`  p${c.priority} ${c.row.id.slice(0, 8)} ${c.row.family}/${c.row.section}/${c.row.domain} [${c.signals.join(',')}] ${String(c.row.item.prompt ?? '').replace(/\s+/g, ' ').slice(0, 70)}`)
  }

  const jsonIdx = args.indexOf('--json')
  const out = cands.map(c => ({
    item_id: c.row.id, family: c.row.family, section: c.row.section, domain: c.row.domain, subskill: c.row.subskill,
    priority: c.priority, hard_votes: c.hard, total_votes: c.votes.filter(v => v.difficulty !== 'note').length,
    votes: c.votes, signals: c.signals, item_sha: c.row.content_sha,
  }))
  if (jsonIdx >= 0) { writeFileSync(args[jsonIdx + 1], JSON.stringify(out, null, 1)); console.log(`wrote ${out.length} candidates to ${args[jsonIdx + 1]}`) }

  if (args.includes('--write')) {
    // Replace the table's contents with this run. Upsert, then delete rows
    // this run no longer selects, so a repaired or promoted item drops out.
    for (let i = 0; i < out.length; i += 500) {
      const { error } = await db.from('study_item_hardening_candidates').upsert(out.slice(i, i + 500).map(o => ({ ...o, computed_at: new Date().toISOString() })))
      if (error) { console.error(`write failed: ${error.message ?? JSON.stringify(error)} (is migration 124 applied?)`); process.exit(2) }
    }
    const keep = new Set(out.map(o => o.item_id))
    const { data: existing, error: le } = await db.from('study_item_hardening_candidates').select('item_id')
    if (le) { console.error(le.message); process.exit(2) }
    const drop = (existing ?? []).map((r: { item_id: string }) => r.item_id).filter((id: string) => !keep.has(id))
    for (let i = 0; i < drop.length; i += 200) {
      const { error } = await db.from('study_item_hardening_candidates').delete().in('item_id', drop.slice(i, i + 200))
      if (error) { console.error(error.message); process.exit(2) }
    }
    console.log(`WROTE ${out.length} candidates, removed ${drop.length} stale`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
