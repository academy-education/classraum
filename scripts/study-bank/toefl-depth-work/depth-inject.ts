/**
 * toefl-form-depth.ts — how many TOEFL sittings can one student take before
 * a question repeats, per task type, on EACH adaptive path?
 *
 * READ ONLY. Never writes to the bank or to study_item_exposures.
 *
 *   npx tsx scripts/study-bank/toefl-form-depth.ts             # live bank
 *   npx tsx scripts/study-bank/toefl-form-depth.ts --selftest  # fixture, known answers
 *   TRIALS=5 MAX_SITTINGS=60 npx tsx scripts/study-bank/toefl-form-depth.ts
 *
 * ── Why form-capacity.mjs is not the answer ──────────────────────────
 * That script prints TOEFL Reading 28 / Listening 29 forms and labels the
 * domain split "inferred from current shape — circular". It is worse than
 * circular: a TOEFL section is not domain-quota'd at all. It is drawn by
 * TASK, per ADAPTIVE PATH, in WHOLE SETS:
 *
 *   - Stage 2 is one of two modules with different task mixes. The lower
 *     path reads notices/emails (Daily Life 10 + 10 per sitting) and hears
 *     Announcements (6 + 6) and extra Choose a Response (11 + 9); the upper
 *     path takes Academic Passage (8 + 10) and Academic Talk (4 + 12).
 *     Each path burns a different task twice as fast.
 *   - Multi-question tasks (MULTI_QUESTION_TASKS) draw whole sets only,
 *     with `strict` packing — a set that does not fit the remaining quota
 *     is skipped, so set sizes decide what is reachable, not item counts.
 *   - Speaking's Listen-and-Repeat draws a fixed difficulty RAMP (3/3/1);
 *     a band that runs dry repeats from ITSELF rather than borrowing.
 *
 * None of that is visible to items / form-size. So this script does not
 * reason about it at all: it calls the REAL `assembleToeflFromBank`, with
 * `globalThis.fetch` replaced by an in-memory PostgREST stand-in that
 * serves the live bank rows and keeps a simulated exposure ledger. The
 * assembler's own unseen-first ranking, band preference, orphan filter,
 * set packing and ramp all run unmodified; only the network is faked.
 *
 * The fake answers exactly three requests (bank read, ledger read, ledger
 * upsert) and THROWS on anything else, so the assembler can never reach
 * the real database from here — in particular it can never write a
 * simulated student's exposures into the live ledger.
 *
 * It emulates PostgREST's 1000-row cap on the bank read, because the
 * assembler's bank query is UNPAGED: a TOEFL section that grows past 1000
 * verified rows is silently truncated in production. Listening sits at
 * ~840. The script warns when a section is within 15% of the cap.
 *
 * ── What it reports ──────────────────────────────────────────────────
 * Per task × path × routed band: sittings until first repeat, i.e. the
 * number of complete sittings in which every item of that task was new to
 * the student. A sitting = Reading (M1 + M2) + Listening (M1 + M2) +
 * Writing + Speaking, in that order, against one ledger. Also: sittings
 * that came up SHORT of the blueprint (a quieter defect than a repeat),
 * and every violation of the set rules found in the delivered draws.
 */
import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'

type Section = 'reading' | 'listening' | 'writing' | 'speaking'
type Path = 'lower' | 'upper'
type Band = 'easy' | 'medium' | 'hard'

/** A bank row as the fake serves it, plus the columns this script needs
 *  for reporting (cohort, created_at) that the assembler never sees. */
export interface BankRow {
  id: string
  item_type: string
  difficulty: string | null
  created_at: string
  cohort: string | null
  item: Record<string, unknown> & { passageGroupId?: string | null; listeningTask?: string | null; readingTask?: string | null }
}

const SECTIONS: Section[] = ['reading', 'listening', 'writing', 'speaking']
const ADAPTIVE: Section[] = ['reading', 'listening']
const MAX_ROWS = 1000 // PostgREST db-max-rows on this project

/* Kept in step with assemble.ts by the check in main(): if assemble.ts's
 * list changes, this script refuses rather than checking the wrong rule. */
const MULTI_QUESTION_TASKS = new Set(['conversation', 'announcement', 'academic_talk', 'daily_life', 'academic_passage'])

const taskKey = (section: Section, r: BankRow): string => {
  if (r.item_type === 'multiple_choice' && (section === 'listening' || section === 'reading')) {
    return `${section === 'listening' ? r.item.listeningTask ?? 'unclassified' : r.item.readingTask ?? 'unclassified'}`
  }
  return r.item_type
}
const gidOf = (r: BankRow): string => (r.item.passageGroupId as string | null | undefined) ?? `__solo:${r.id}`

// ── The in-memory PostgREST stand-in ───────────────────────────────────

const BANK = new Map<Section, BankRow[]>()
const LEDGER = new Map<string, Map<string, string>>()
let clock = 0
let lastUpsert: string[] | null = null
let noLedger = false // break-test switch: the ledger read returns nothing
const capWarnings = new Set<string>()
const malformed = new Set<string>()
const warnCounts = new Map<string, number>()

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
const eqParam = (q: URLSearchParams, k: string): string | null => {
  const v = q.get(k)
  return v && v.startsWith('eq.') ? v.slice(3) : null
}

let installed = false
function installFakeFetch() {
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const url = new URL(href)
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
    const table = url.pathname.split('/rest/v1/')[1] ?? ''
    const q = url.searchParams
    if (table === 'study_item_bank' && method === 'GET') {
      const section = eqParam(q, 'section') as Section | null
      if (eqParam(q, 'family') !== 'toefl' || eqParam(q, 'verified') !== 'true' || eqParam(q, 'archived') !== 'false' || !section) {
        throw new Error(`fake fetch: unexpected bank filter ${url.search}`)
      }
      if (q.has('domain')) throw new Error('fake fetch: domain drills are not modelled')
      /* The assembler pages since 2026-10-02 (created_at, id; offset/limit;
       * exact count on the first page). The stand-in honours all three and
       * still caps each response at MAX_ROWS, so an unpaged read would
       * still be truncated here exactly as in production. Rows are served
       * in (created_at, id) order to match. */
      const ord = q.get('order')
      if (ord !== 'created_at.asc,id.asc' && ord !== 'created_at.asc') throw new Error(`fake fetch: assembler order changed to ${ord}; re-check the stand-in`)
      const all = [...(BANK.get(section) ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at) || (ord.endsWith('id.asc') ? a.id.localeCompare(b.id) : 0))
      const offset = Number(q.get('offset') ?? 0)
      const limit = Math.min(MAX_ROWS, Number(q.get('limit') ?? MAX_ROWS))
      if (!q.has('offset') && all.length > MAX_ROWS) capWarnings.add(`${section}: ${all.length} rows, assembler sees the first ${MAX_ROWS} (unpaged read)`)
      const slice = all.slice(offset, offset + limit)
      const headers: Record<string, string> = { 'content-type': 'application/json' }
      const prefer = (init?.headers ? new Headers(init.headers).get('prefer') : null) ?? ''
      if (prefer.includes('count=exact')) headers['content-range'] = `${offset}-${offset + slice.length - 1}/${all.length}`
      return new Response(JSON.stringify(slice.map(r => ({ id: r.id, item_type: r.item_type, item: r.item, difficulty: r.difficulty }))), { status: 200, headers })
    }
    if (table === 'study_item_exposures' && method === 'GET') {
      const student = eqParam(q, 'student_id')
      if (!student) throw new Error('fake fetch: ledger read without student_id')
      const led = noLedger ? new Map<string, string>() : LEDGER.get(student) ?? new Map<string, string>()
      /* PostgREST's cap applies here too (2026-10-02): no range → the first
       * MAX_ROWS rows, and no page larger than MAX_ROWS. Before this the
       * fake served the whole ledger, so it could not see that the real
       * loadExposures was unpaged and lost every exposure past 1000. */
      let all = [...led].map(([item_id, seen_at]) => ({ item_id, seen_at, session_id: null }))
      if (q.get('order') === 'item_id.asc') all = all.sort((a, b) => a.item_id.localeCompare(b.item_id))
      const offset = Number(q.get('offset') ?? 0)
      const limit = Math.min(MAX_ROWS, Number(q.get('limit') ?? MAX_ROWS))
      if (!q.has('offset') && all.length > MAX_ROWS) capWarnings.add(`exposure ledger for ${student}: ${all.length} rows, an unpaged read sees ${MAX_ROWS}`)
      return json(all.slice(offset, offset + limit))
    }
    if (table === 'study_item_exposures' && method === 'POST') {
      const body = JSON.parse(String(init?.body ?? '[]')) as Array<{ student_id: string; item_id: string }>
      /* One timestamp per call, monotonic. The real code stamps new Date()
       * per call too; a fake clock just removes same-millisecond ties
       * between module 1 and module 2. */
      const t = new Date(Date.UTC(2026, 0, 1) + ++clock * 1000).toISOString()
      for (const b of body) {
        if (!LEDGER.has(b.student_id)) LEDGER.set(b.student_id, new Map())
        LEDGER.get(b.student_id)!.set(b.item_id, t)
      }
      lastUpsert = body.map(b => b.item_id)
      return new Response('', { status: 201 })
    }
    throw new Error(`fake fetch: unmodelled request ${method} ${url.pathname}${url.search} — refusing so the real database is never touched`)
  }) as typeof fetch
  installed = true
}

// ── Simulation ─────────────────────────────────────────────────────────

type Assemble = typeof import('../../../src/lib/study/assemble')
type Adaptive = typeof import('../../../src/lib/toefl-adaptive')

interface TaskStat {
  section: Section
  wanted: number // per sitting on this path
  depth: number | null // null = no repeat within the sittings run
  firstShort: number | null
  shortSittings: number
  /** At the first repeat: the task's still-UNSEEN live items, by set size.
   *  Non-empty means the repeat was forced by packing or band preference,
   *  not by the bank running out. */
  unseenAtRepeat: Record<number, number> | null
}
interface RunResult { tasks: Map<string, TaskStat>; violations: string[]; ledgerAtSitting: number[] }

const ROUTE_FOR: Record<string, { path: Path; route: Band }> = {
  'lower/easy': { path: 'lower', route: 'easy' },
  'lower/medium': { path: 'lower', route: 'medium' },
  'upper/medium': { path: 'upper', route: 'medium' },
  'upper/hard': { path: 'upper', route: 'hard' },
}

export async function simulate(
  A: Assemble, D: Adaptive, combo: keyof typeof ROUTE_FOR, sittings: number, trial: number,
): Promise<RunResult> {
  if (!installed) throw new Error('refusing to call the assembler before the fake fetch is installed')
  const { path, route } = ROUTE_FOR[combo]!
  const student = `sim-${combo}-t${trial}`
  LEDGER.delete(student)
  const seen = new Set<string>()
  const tasks = new Map<string, TaskStat>()
  const violations: string[] = []
  const ledgerAtSitting: number[] = []

  // Per-section lookup: id -> row, and live set sizes per (task, gid) AFTER
  // the assembler's orphan filter (a multi-question set of 1 is never drawn).
  const byId = new Map<string, { section: Section; row: BankRow }>()
  const setSize = new Map<string, number>()
  for (const s of SECTIONS) {
    for (const r of BANK.get(s) ?? []) { // the assembler pages (2026-10-02); no cap
      byId.set(r.id, { section: s, row: r })
      const k = `${s}|${taskKey(s, r)}|${gidOf(r)}`
      setSize.set(k, (setSize.get(k) ?? 0) + 1)
    }
  }

  // Blueprint quotas per task for this path, from the real TOEFL_META.
  for (const s of SECTIONS) {
    for (const m of A.TOEFL_META[s].mix) {
      const key = m.task ?? m.type
      const wanted = s === 'reading' || s === 'listening' ? (m.m1 ?? 0) + ((path === 'lower' ? m.lower : m.upper) ?? 0) : m.n
      tasks.set(`${s}:${key}`, { section: s, wanted, depth: null, firstShort: null, shortSittings: 0, unseenAtRepeat: null })
    }
  }

  const draw = async (args: Parameters<Assemble['assembleToeflFromBank']>[0], seed: string) => {
    lastUpsert = null
    const t = await A.assembleToeflFromBank(args, seed)
    if (!lastUpsert) throw new Error('assembler did not record exposures — cannot attribute the draw')
    const ids: string[] = lastUpsert
    if (ids.length !== t.questions.length) throw new Error(`recorded ${ids.length} ids for ${t.questions.length} questions`)
    return ids
  }

  for (let s = 1; s <= sittings; s++) {
    const drawn = new Map<string, { ids: string[]; module: string }[]>() // task -> per-module id lists
    for (const section of SECTIONS) {
      const seed = `${student}-s${s}-${section}`
      const modules: Array<[string, string[]]> = ADAPTIVE.includes(section)
        ? [
            ['m1', await draw({ section, module: 1, studentId: student }, seed)],
            ['m2', await draw({ section, module: 2, path, difficulties: D.difficultiesForToeflModule2(route), studentId: student }, seed)],
          ]
        : [['all', await draw({ section, studentId: student }, seed)]]
      for (const [mod, ids] of modules) {
        const per = new Map<string, string[]>()
        for (const id of ids) {
          const hit = byId.get(id)
          if (!hit) throw new Error(`drawn id ${id} is not in the loaded bank`)
          const k = `${section}:${taskKey(section, hit.row)}`
          if (!per.has(k)) per.set(k, [])
          per.get(k)!.push(id)
        }
        for (const [k, list] of per) {
          if (!drawn.has(k)) drawn.set(k, [])
          drawn.get(k)!.push({ ids: list, module: mod })
        }
      }
    }

    // ── per-task accounting + set-rule checks ──
    for (const [k, stat] of tasks) {
      const mods = drawn.get(k) ?? []
      const all = mods.flatMap(m => m.ids)
      const fresh = new Set<string>()
      let repeat = false
      for (const id of all) {
        if (seen.has(id) || fresh.has(id)) repeat = true
        fresh.add(id)
      }
      if (repeat && stat.depth === null) {
        stat.depth = s - 1
        const task0 = k.split(':')[1]!
        const left = new Map<string, number>()
        for (const { section: sec, row } of byId.values()) {
          if (sec !== stat.section || taskKey(sec, row) !== task0 || seen.has(row.id)) continue
          left.set(gidOf(row), (left.get(gidOf(row)) ?? 0) + 1)
        }
        const bySize: Record<number, number> = {}
        for (const [g, n] of left) {
          const live = setSize.get(`${stat.section}|${task0}|${g}`) ?? 0
          if (MULTI_QUESTION_TASKS.has(task0) && live < 2) continue // orphan, never drawable
          bySize[n] = (bySize[n] ?? 0) + 1
        }
        stat.unseenAtRepeat = bySize
      }
      if (all.length < stat.wanted) {
        stat.shortSittings++
        if (stat.firstShort === null) stat.firstShort = s
      }
      const task = k.split(':')[1]!
      const grouped = MULTI_QUESTION_TASKS.has(task) || task === 'speaking_interview'
      const gidModule = new Map<string, string>()
      for (const m of mods) {
        const count = new Map<string, number>()
        for (const id of m.ids) {
          const g = gidOf(byId.get(id)!.row)
          count.set(g, (count.get(g) ?? 0) + 1)
        }
        for (const [g, n] of count) {
          const live = setSize.get(`${stat.section}|${task}|${g}`) ?? 0
          if (grouped) {
            if (MULTI_QUESTION_TASKS.has(task) && live < 2) violations.push(`s${s} ${k}: orphan set ${g} (live size ${live}) served`)
            if (n !== live) violations.push(`s${s} ${k} ${m.module}: set ${g} served ${n} of ${live} — fragment`)
          } else if (!g.startsWith('__solo:') && n > 1) {
            violations.push(`s${s} ${k} ${m.module}: ${n} items from one group ${g} in an item-wise draw`)
          }
          const prev = gidModule.get(g)
          if (prev && prev !== m.module && !g.startsWith('__solo:')) violations.push(`s${s} ${k}: set ${g} split across ${prev}/${m.module}`)
          gidModule.set(g, m.module)
        }
      }
    }
    for (const mods of drawn.values()) for (const m of mods) for (const id of m.ids) seen.add(id)
    ledgerAtSitting.push(LEDGER.get(student)?.size ?? 0)
  }
  return { tasks, violations, ledgerAtSitting }
}

// ── Loading ────────────────────────────────────────────────────────────

function loadEnv() {
  if (!existsSync('.env.local')) return
  for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
    if (!l.includes('=') || l.startsWith('#')) continue
    const k = l.slice(0, l.indexOf('=')).trim()
    if (!(k in process.env)) process.env[k] = l.slice(l.indexOf('=') + 1).trim()
  }
}

async function loadLiveBank(): Promise<string[]> {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const notes: string[] = []
  for (const section of SECTIONS) {
    const rows: BankRow[] = []
    for (let f = 0; ; f += 1000) {
      const { data, error } = await db.from('study_item_bank')
        .select('id,item_type,item,difficulty,created_at,cohort,passage_group_id')
        .eq('family', 'toefl').eq('section', section).eq('verified', true).eq('archived', false)
        .order('created_at', { ascending: true }).order('id', { ascending: true })
        .range(f, f + 999)
      if (error) throw new Error(error.message)
      for (const r of data ?? []) {
        rows.push({
          id: r.id as string, item_type: r.item_type as string, difficulty: r.difficulty as string | null,
          created_at: r.created_at as string, cohort: r.cohort as string | null, item: r.item as BankRow['item'],
        })
        const col = (r.passage_group_id as string | null) ?? null
        const inner = ((r.item as BankRow['item']).passageGroupId as string | null | undefined) ?? null
        if (col !== inner) notes.push(`${section}/${r.id}: passage_group_id column ${col ?? 'null'} != item.passageGroupId ${inner ?? 'null'} (the assembler reads item.passageGroupId)`)
      }
      if (!data || data.length < 1000) break
    }
    /* PostgREST truncates at 1000; a short or slipped load reads exactly
     * like a real bank. Assert against an exact count, refuse otherwise. */
    const { count, error } = await db.from('study_item_bank').select('id', { count: 'exact', head: true })
      .eq('family', 'toefl').eq('section', section).eq('verified', true).eq('archived', false)
    if (error) throw new Error(error.message)
    const distinct = new Set(rows.map(r => r.id)).size
    if (count !== rows.length || distinct !== rows.length) {
      console.error(`REFUSING: toefl/${section} loaded ${rows.length} rows (${distinct} distinct), live count is ${count}`)
      process.exit(2)
    }
    if (rows.length > MAX_ROWS * 0.85) {
      capWarnings.add(`${section}: ${rows.length} verified rows — the assembler's bank query is UNPAGED and will silently truncate past ${MAX_ROWS}`)
    }
    BANK.set(section, rows)
  }
  return notes
}

// ── Fixture with known answers ─────────────────────────────────────────

function fixtureRow(i: number, item_type: string, extra: Partial<BankRow['item']>): BankRow {
  return {
    id: `fx-${String(i).padStart(4, '0')}`, item_type, difficulty: 'hard', cohort: 'fixture',
    created_at: new Date(Date.UTC(2026, 0, 1) + i * 1000).toISOString(),
    item: {
      prompt: `fixture prompt ${i}`, type: item_type, choices: ['A', 'B', 'C', 'D'],
      correct_answer: item_type.startsWith('speaking') || item_type.startsWith('writing') ? '' : 'A',
      difficulty: 'hard', passageGroupId: null, ...extra,
    },
  }
}

function buildFixture() {
  let i = 0
  const sets = (n: number, size: number, type: string, extra: Partial<BankRow['item']>, tag: string) => {
    const out: BankRow[] = []
    for (let g = 0; g < n; g++) for (let k = 0; k < size; k++) out.push(fixtureRow(i++, type, { ...extra, passageGroupId: size > 1 ? `${tag}-${g}` : null }))
    return out
  }
  BANK.set('listening', [
    ...sets(42, 1, 'multiple_choice', { listeningTask: 'choose_response' }, 'cr'),
    ...sets(18, 2, 'multiple_choice', { listeningTask: 'conversation' }, 'cv'),
    ...sets(1, 1, 'multiple_choice', { listeningTask: 'conversation' }, 'cv-orphan'), // must never be served
    ...sets(12, 2, 'multiple_choice', { listeningTask: 'announcement' }, 'an'),
    ...sets(8, 4, 'multiple_choice', { listeningTask: 'academic_talk' }, 'at'),
  ])
  BANK.set('reading', [
    ...sets(6, 1, 'fill_in_blanks', {}, 'ctw'),
    ...sets(30, 2, 'multiple_choice', { readingTask: 'daily_life' }, 'dl'),
    ...sets(18, 2, 'multiple_choice', { readingTask: 'academic_passage' }, 'ap'),
  ])
  BANK.set('writing', [
    ...sets(30, 1, 'arrange_words', {}, 'aw'),
    ...sets(4, 1, 'writing_email', {}, 'we'),
    ...sets(5, 1, 'writing_discussion', {}, 'wd'),
  ])
  const speaking: BankRow[] = []
  // ramp 3 easy / 3 medium / 1 hard: 9 easy -> 3 clean, 12 medium -> 4, 10 hard -> 10
  for (const [band, n] of [['easy', 9], ['medium', 12], ['hard', 10]] as const) {
    for (let k = 0; k < n; k++) { const r = fixtureRow(i++, 'speaking_repeat', { difficulty: band }); r.difficulty = band; speaking.push(r) }
  }
  speaking.push(...sets(5, 4, 'speaking_interview', {}, 'iv'))
  BANK.set('speaking', speaking)
}

/* Hand-derived: items (or sets) / per-sitting consumption on that path.
 * lower: CR 11+9=20, conv 6+6, ann 6+6, talk 4+0, CtW 1+1, DL 10+10, AP 8+0
 * upper: CR 11+3=14, conv 6+6, ann 6+0, talk 4+12, CtW 1+1, DL 10+0, AP 8+10 */
const FIXTURE_EXPECT: Record<Path, Record<string, number>> = {
  lower: {
    'listening:choose_response': 2, 'listening:conversation': 3, 'listening:announcement': 2, 'listening:academic_talk': 8,
    'reading:fill_in_blanks': 3, 'reading:daily_life': 3, 'reading:academic_passage': 4,
    'writing:arrange_words': 3, 'writing:writing_email': 4, 'writing:writing_discussion': 5,
    'speaking:speaking_repeat': 3, 'speaking:speaking_interview': 5,
  },
  upper: {
    'listening:choose_response': 3, 'listening:conversation': 3, 'listening:announcement': 4, 'listening:academic_talk': 2,
    'reading:fill_in_blanks': 3, 'reading:daily_life': 6, 'reading:academic_passage': 2,
    'writing:arrange_words': 3, 'writing:writing_email': 4, 'writing:writing_discussion': 5,
    'speaking:speaking_repeat': 3, 'speaking:speaking_interview': 5,
  },
}

// ── Main ───────────────────────────────────────────────────────────────

function quietConsole() {
  const origErr = console.error
  console.warn = (...args: unknown[]) => {
    const k = String(args[0])
    warnCounts.set(k, (warnCounts.get(k) ?? 0) + 1)
  }
  console.error = (...args: unknown[]) => {
    if (String(args[0]).includes('skipping malformed study_item_bank row')) { malformed.add(String(args[1])); return }
    origErr(...args)
  }
}

async function loadModules(): Promise<{ A: Assemble; D: Adaptive }> {
  const A = await import('../../../src/lib/study/assemble')
  const D = await import('../../../src/lib/toefl-adaptive')
  const src = readFileSync('src/lib/study/assemble.ts', 'utf8')
  const block = src.match(/const MULTI_QUESTION_TASKS[^=]*= new Set\(\[([\s\S]*?)\]\)/)?.[1] ?? ''
  const live = new Set((block.replace(/\/\/.*$/gm, '').match(/'([^']+)'/g) ?? []).map(s => s.slice(1, -1)))
  if (live.size === 0 || [...live].some(t => !MULTI_QUESTION_TASKS.has(t)) || [...MULTI_QUESTION_TASKS].some(t => !live.has(t))) {
    console.error(`REFUSING: assemble.ts MULTI_QUESTION_TASKS is {${[...live].join(', ')}}, this script checks {${[...MULTI_QUESTION_TASKS].join(', ')}}`)
    process.exit(2)
  }
  return { A, D }
}

async function selftest() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://fixture.invalid'
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) process.env.SUPABASE_SERVICE_ROLE_KEY = 'fixture'
  buildFixture()
  installFakeFetch()
  quietConsole()
  const { A, D } = await loadModules()
  let bad = 0
  for (const combo of ['lower/easy', 'upper/hard'] as const) {
    const path = ROUTE_FOR[combo]!.path
    const res = await simulate(A, D, combo, 12, 0)
    for (const [k, want] of Object.entries(FIXTURE_EXPECT[path])) {
      const got = res.tasks.get(k)?.depth
      const ok = got === want
      if (!ok) bad++
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${combo.padEnd(12)} ${k.padEnd(28)} depth ${got} (expect ${want})`)
    }
    if (res.violations.length) { bad++; console.log(`FAIL ${combo}: ${res.violations.length} set-rule violations, first: ${res.violations[0]}`) }
    else console.log(`ok   ${combo}: zero set-rule violations (orphan conversation never served, no fragments)`)
  }
  /* Break-test: switch the ledger off. Without it module 2 re-draws module
   * 1 and every sitting starts from scratch, so depth must COLLAPSE. If it
   * does not, this instrument is not measuring the exposure mechanism. */
  noLedger = true
  const broken = await simulate(A, D, 'upper/hard', 4, 1)
  noLedger = false
  const cr = broken.tasks.get('listening:choose_response')?.depth
  const collapsed = cr !== null && cr !== undefined && cr < FIXTURE_EXPECT.upper['listening:choose_response']!
  if (!collapsed) bad++
  console.log(`${collapsed ? 'ok  ' : 'FAIL'} break-test: with the ledger read disabled, choose_response depth ${cr} (must fall below 3)`)
  /* Break-test the violation checker: zero violations above means nothing
   * unless the checker can fire. An interview set of 5 against a quota of
   * 4 is truncated by takeGroups' non-strict fallback — a real fragment. */
  const keep = BANK.get('speaking')!
  BANK.set('speaking', [...keep.filter(r => r.item_type === 'speaking_repeat'),
    ...[0, 1, 2, 3, 4].map(k => fixtureRow(9000 + k, 'speaking_interview', { passageGroupId: 'iv-five' }))])
  const frag = await simulate(A, D, 'upper/hard', 1, 2)
  BANK.set('speaking', keep)
  const fired = frag.violations.some(v => v.includes('iv-five') && v.includes('fragment'))
  if (!fired) bad++
  console.log(`${fired ? 'ok  ' : 'FAIL'} break-test: a 5-item interview set against a quota of 4 is reported as a fragment (${frag.violations.length} violation(s))`)
  console.log(bad ? `\n${bad} self-test failure(s)` : '\nself-test clean')
  process.exit(bad ? 1 : 0)
}

async function main() {
  loadEnv()
  if (process.argv.includes('--selftest')) return selftest()
  const sittings = Number(process.env.MAX_SITTINGS ?? 60)
  const trials = Number(process.env.TRIALS ?? 3)
  const gidNotes = await loadLiveBank()
  // SCRATCH: inject fake announcement sets, INJECT="count x size : band, ..."
  let inj = 0
  for (const spec of (process.env.INJECT ?? '').split(',').filter(Boolean)) {
    const m = spec.trim().match(/^(\d+)x(\d+):(easy|medium|hard)$/)
    if (!m) throw new Error('bad INJECT ' + spec)
    const [n, size, band] = [Number(m[1]), Number(m[2]), m[3]!]
    for (let g = 0; g < n; g++) for (let k = 0; k < size; k++) {
      const r = fixtureRow(900000 + inj++, 'multiple_choice', { listeningTask: 'announcement', passageGroupId: `inj-${spec}-${g}`, difficulty: band } as any)
      r.difficulty = band
      BANK.get('listening')!.push(r)
    }
  }
  console.log('  injected announcement items:', inj, process.env.INJECT ?? '')
  // STAGED_COHORT: load a staged (verified=false) listening cohort into the
  // replay as if released — the projected depth of a staged batch.
  if (process.env.STAGED_COHORT) {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
    const { data, error } = await db.from('study_item_bank')
      .select('id,item_type,item,difficulty,created_at,cohort')
      .eq('family', 'toefl').eq('section', 'listening').eq('verified', false).eq('archived', false)
      .eq('cohort', process.env.STAGED_COHORT).order('id', { ascending: true })
    if (error) throw new Error(error.message)
    const { count } = await db.from('study_item_bank').select('id', { count: 'exact', head: true })
      .eq('family', 'toefl').eq('section', 'listening').eq('verified', false).eq('archived', false).eq('cohort', process.env.STAGED_COHORT)
    if (!data?.length || count !== data.length) { console.error(`REFUSING: staged cohort ${process.env.STAGED_COHORT} loaded ${data?.length ?? 0}, count ${count}`); process.exit(2) }
    for (const r of data) BANK.get('listening')!.push({ id: r.id as string, item_type: r.item_type as string, difficulty: r.difficulty as string | null, created_at: r.created_at as string, cohort: r.cohort as string | null, item: r.item as BankRow['item'] })
    console.log(`  staged cohort ${process.env.STAGED_COHORT}: ${data.length} listening rows loaded as if released`)
  }
  installFakeFetch()
  quietConsole()
  const { A, D } = await loadModules()

  console.log('\nTOEFL — sittings until first repeat, per task, real assembler + simulated ledger')
  console.log(`(${trials} trials x ${sittings} sittings per path/band; MIN across trials shown, max in brackets if different)\n`)
  for (const s of SECTIONS) {
    const rows = BANK.get(s)!
    console.log(`  loaded toefl/${s}: ${rows.length} rows = live exact count`)
  }

  const combos = Object.keys(ROUTE_FOR) as Array<keyof typeof ROUTE_FOR>
  const results = new Map<string, RunResult[]>()
  for (const c of combos) {
    const runs: RunResult[] = []
    for (let t = 0; t < trials; t++) runs.push(await simulate(A, D, c, sittings, t))
    results.set(c, runs)
  }
  if (malformed.size) console.log(`\n  ${malformed.size} rows rejected by readBankItem (never drawable): ${[...malformed].slice(0, 5).join(', ')}`)

  const taskKeys = [...results.get('upper/hard')![0]!.tasks.keys()]
  const liveInfo = (k: string) => {
    const [section, task] = k.split(':') as [Section, string]
    const rows = BANK.get(section)!.filter(r => taskKey(section, r) === task)
    const sizes = new Map<string, number>()
    for (const r of rows) sizes.set(gidOf(r), (sizes.get(gidOf(r)) ?? 0) + 1)
    const multi = MULTI_QUESTION_TASKS.has(task)
    const drawable = multi ? [...sizes.values()].filter(n => n >= 2) : [...sizes.values()]
    return { items: rows.length, sets: drawable.length, drawableItems: drawable.reduce((a, b) => a + b, 0) }
  }
  const cell = (c: string, k: string) => {
    const runs = results.get(c)!
    const st = runs.map(r => r.tasks.get(k)!)
    if (st[0]!.wanted === 0) return '    —'
    const d = st.map(x => x.depth ?? Infinity)
    const lo = Math.min(...d), hi = Math.max(...d)
    const fmt = (n: number) => (n === Infinity ? `>${sittings}` : String(n))
    const short = st.some(x => x.firstShort !== null) ? '*' : ''
    return `${fmt(lo)}${lo !== hi ? `[${fmt(hi)}]` : ''}${short}`.padStart(9)
  }
  console.log('\n  task                          items  sets   per sitting L/U  ' + combos.map(c => c.padStart(9)).join(''))
  console.log('  ' + '-'.repeat(64 + 9 * combos.length))
  for (const k of taskKeys) {
    const info = liveInfo(k)
    const wl = results.get('lower/easy')![0]!.tasks.get(k)!.wanted
    const wu = results.get('upper/hard')![0]!.tasks.get(k)!.wanted
    console.log(`  ${k.padEnd(30)}${String(info.items).padStart(5)}${String(info.sets).padStart(6)}   ${`${wl}/${wu}`.padStart(13)}  ${combos.map(c => cell(c, k)).join('')}`)
  }
  console.log('  * = at least one sitting delivered FEWER items than the blueprint for this task')

  console.log('\n  repeats that came EARLY — unseen drawable sets were still in the bank (first trial):')
  let early = 0
  for (const c of combos) for (const [k, st] of results.get(c)![0]!.tasks) {
    if (st.depth === null || st.wanted === 0) continue
    const info = liveInfo(k)
    const floor = Math.floor(info.drawableItems / st.wanted)
    const left = Object.entries(st.unseenAtRepeat ?? {})
    const leftItems = left.reduce((a, [sz, n]) => a + Number(sz) * n, 0)
    if (st.depth < floor && leftItems > 0) {
      early++
      console.log(`    ${c.padEnd(13)} ${k.padEnd(30)} repeated after ${st.depth} (items/quota = ${floor}); unseen at repeat: ${leftItems} items in sets ${left.map(([sz, n]) => `${n}x${sz}`).join(' ')}`)
    }
  }
  if (!early) console.log('    none')

  console.log('\n  binding task per path/band (min over tasks; the whole sitting repeats from here):')
  for (const c of combos) {
    let worst = Infinity, which = ''
    for (const k of taskKeys) {
      const st = results.get(c)!.map(r => r.tasks.get(k)!)
      if (st[0]!.wanted === 0) continue
      const d = Math.min(...st.map(x => x.depth ?? Infinity))
      if (d < worst) { worst = d; which = k }
    }
    const ledger = results.get(c)![0]!.ledgerAtSitting[Math.max(0, Math.min(worst, sittings) - 1)]
    console.log(`    ${c.padEnd(13)} ${worst === Infinity ? `>${sittings}` : worst} clean sittings, bound by ${which}  (ledger ${ledger} rows at that point)`)
  }

  console.log('\n  shortfalls (sitting delivered fewer than the blueprint), first trial:')
  let anyShort = false
  for (const c of combos) for (const [k, st] of results.get(c)![0]!.tasks) {
    if (st.shortSittings) { anyShort = true; console.log(`    ${c.padEnd(13)} ${k.padEnd(30)} short on ${st.shortSittings} of ${sittings} sittings, first at sitting ${st.firstShort}`) }
  }
  if (!anyShort) console.log('    none')

  const allViol = new Set<string>()
  for (const runs of results.values()) for (const r of runs) for (const v of r.violations) allViol.add(v.replace(/^s\d+ /, ''))
  console.log(`\n  set-rule violations (MULTI_QUESTION_TASKS whole-set, no orphan, no M1/M2 split, one-per-group in item-wise draws): ${allViol.size}`)
  for (const v of [...allViol].slice(0, 10)) console.log(`    ${v}`)

  const cr = BANK.get('listening')!.filter(r => r.item.listeningTask === 'choose_response')
  const coh = new Map<string, number>()
  for (const r of cr) coh.set(r.cohort ?? 'null', (coh.get(r.cohort ?? 'null') ?? 0) + 1)
  console.log(`\n  choose_response cohorts (one ranked pool, no cohort preference): ${[...coh].map(([k, n]) => `${k} ${n}`).join(', ')}`)
  console.log(`  cr-v7 alone at 20/sitting (lower) = ${Math.floor((coh.get('cr-v7') ?? 0) / 20)}, at 14 (upper) = ${Math.floor((coh.get('cr-v7') ?? 0) / 14)} sittings`)

  const ignoredSets: string[] = []
  for (const k of taskKeys) {
    const [section, task] = k.split(':') as [Section, string]
    if (!MULTI_QUESTION_TASKS.has(task)) continue
    const sizes = new Map<string, number>()
    for (const r of BANK.get(section)!.filter(r => taskKey(section, r) === task)) sizes.set(gidOf(r), (sizes.get(gidOf(r)) ?? 0) + 1)
    const meta = A.TOEFL_META[section].mix.find(m => m.task === task)!
    const largestQuota = Math.max(meta.m1 ?? 0, meta.lower ?? 0, meta.upper ?? 0)
    for (const [g, n] of sizes) if (n > largestQuota) ignoredSets.push(`${k} set ${g} has ${n} items > largest module quota ${largestQuota} — strict packing can never draw it`)
  }
  if (ignoredSets.length) { console.log('\n  sets too large to ever be drawn:'); for (const s of ignoredSets) console.log(`    ${s}`) }
  if (gidNotes.length) console.log(`\n  ${gidNotes.length} rows where passage_group_id column != item.passageGroupId (assembler uses the item field); e.g. ${gidNotes[0]}`)
  for (const w of capWarnings) console.log(`\n  CAP WARNING ${w}`)
  console.log(`\n  assembler warnings seen: ${[...warnCounts].map(([k, n]) => `${k.replace('[assemble] ', '')} x${n}`).join('; ') || 'none'}`)
  console.log('')
}

const RUN_AS_CLI = !!process.argv[1] && process.argv[1].endsWith('depth-inject.ts')
if (RUN_AS_CLI) main().catch(e => { console.error(e); process.exit(1) })
