/**
 * checker-input.mjs — the ONE way a study-bank checker decides what it is
 * measuring. Shared by the six checkers fixed under register item A22.
 *
 * ── Why ──────────────────────────────────────────────────────────────
 * On 2026-09-04 six checkers were found that, handed a batch path,
 * IGNORED it and printed a whole-live-bank report — byte-identical for two
 * different files. Every one of those outputs read as a verdict on the
 * file. CLAUDE.md, "a check that cannot read its input must not return a
 * number":
 *
 *   1. A check that cannot process its input exits non-zero. It never
 *      returns a number, and never falls back to a default input.
 *   2. Read the denominator before the verdict.
 *
 * So the contract every checker using this module follows:
 *
 *   <checker> <batch.json> [...]   reads THOSE files, reports on each
 *   <checker> --live               the whole live bank — ONLY when asked,
 *                                  and the header says so
 *   <checker> --selftest           fixtures, no DB
 *   <checker>                      usage, exit 2 (no silent default)
 *
 * Exit codes: 0 clean, 1 defects found, 2 cannot process the input
 * (missing file, unparseable JSON, unknown shape, zero items, zero
 * scorable items, unknown flag).
 */
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

export const EXIT_CANNOT_PROCESS = 2

/** Print to stderr and exit 2. Never returns. */
export function refuse(msg) {
  console.error(`REFUSING: ${msg}`)
  process.exit(EXIT_CANNOT_PROCESS)
}

/** True when `metaUrl` is the module node was asked to run, not an import. */
export function isMain(metaUrl) {
  const a = process.argv[1]
  if (!a) return false
  try { return metaUrl === pathToFileURL(realpathSync(a)).href } catch { return false }
}

/**
 * Parse argv into { mode, paths, flags }.
 *   extraFlags  flags this checker accepts beyond --live / --selftest
 *               (e.g. ['--fix']); anything else starting with -- exits 2.
 *   liveOnly    flags that only make sense with --live (e.g. --fix).
 */
export function parseCheckerArgs(argv, { name, usage, extraFlags = [], liveOnly = [] }) {
  const args = argv.slice(2)
  const flags = new Set(args.filter(a => a.startsWith('--')))
  const paths = args.filter(a => !a.startsWith('--'))
  const known = new Set(['--live', '--selftest', ...extraFlags])
  // A value flag is declared as '--domain' and passed as '--domain=x'.
  for (const f of flags) if (!known.has(f.split('=')[0])) refuse(`${name}: unknown flag ${f}\n${usage}`)
  if (flags.has('--selftest')) return { mode: 'selftest', paths, flags }
  if (flags.has('--live') && paths.length) {
    refuse(`${name}: --live and a batch path are exclusive — pick one population.\n${usage}`)
  }
  if (flags.has('--live')) return { mode: 'live', paths, flags }
  for (const f of liveOnly) if ([...flags].some(x => x.split('=')[0] === f)) refuse(`${name}: ${f} only applies to --live.\n${usage}`)
  if (!paths.length) {
    refuse(`${name}: no input. This checker no longer defaults to the live bank — pass a batch file, or --live to measure the whole live bank on purpose.\n${usage}`)
  }
  return { mode: 'batch', paths, flags }
}

/** Value of a '--name=value' flag, or null. */
export function flagValue(flags, name) {
  const f = [...flags].find(x => x.startsWith(name + '='))
  return f ? f.slice(name.length + 1) : null
}

/**
 * Read one batch file into rows shaped like live rows: { id, family,
 * domain, cohort, item }. Every batch file in this directory is a flat JSON
 * array of item objects; anything else is an unknown shape and exits 2.
 */
export function loadBatchFile(p) {
  if (!existsSync(p)) refuse(`batch file not found: ${p}`)
  let raw
  try { raw = JSON.parse(readFileSync(p, 'utf8')) } catch (e) { refuse(`${p} is not valid JSON (${e.message})`) }
  if (!Array.isArray(raw)) {
    const keys = raw && typeof raw === 'object' ? Object.keys(raw).slice(0, 8).join(', ') : typeof raw
    refuse(`${p}: unknown shape — expected a JSON array of items, got an object with keys [${keys}]`)
  }
  if (!raw.length) refuse(`${p}: zero items — nothing to measure`)
  const bad = raw.findIndex(it => !it || typeof it !== 'object' || Array.isArray(it))
  if (bad >= 0) refuse(`${p}: entry ${bad} is not an item object`)
  const cohort = path.basename(p).replace(/(\.batch)?\.json$/, '')
  return raw.map((it, i) => ({
    id: String(it.id ?? it.bank_id ?? `${cohort}#${i + 1}`),
    family: it.family ?? null,
    domain: it.domain ?? it.subskill ?? null,
    cohort,
    item: it,
  }))
}

/** Supabase service client from process.env, falling back to ./.env.local. */
export async function liveClient() {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if ((!url || !key) && existsSync('.env.local')) {
    const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
      .filter(l => l.includes('=') && !l.startsWith('#'))
      .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
    url ||= env.NEXT_PUBLIC_SUPABASE_URL; key ||= env.SUPABASE_SERVICE_ROLE_KEY
  }
  if (!url || !key) refuse('--live needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (env or ./.env.local)')
  const { createClient } = await import('@supabase/supabase-js')
  return createClient(url, key, { auth: { persistSession: false } })
}

/**
 * Every live row matching `filter(q)`, paginated with .range() and a
 * stable order (PostgREST caps a response at 1000 rows; a verifier here
 * once reported "0 problems" over a truncated table). Zero rows exits 2.
 */
export async function loadLive({ select, filter = q => q, label = 'live bank', allowEmpty = false }) {
  const db = await liveClient()
  const rows = []
  for (let f = 0; ; f += 1000) {
    const { data, error } = await filter(db.from('study_item_bank').select(select)).order('id', { ascending: true }).range(f, f + 999)
    if (error) refuse(`study_item_bank read failed: ${error.message}`)
    rows.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  if (!rows.length && !allowEmpty) refuse(`${label}: zero rows read — refusing to report on nothing`)
  return { db, rows }
}

/**
 * Print `scorable N of M` FIRST, and exit 2 when N is zero: a rate or a
 * "0 defects" over zero scorable items is the absence of a measurement,
 * not a pass. Returns nothing; callers print their verdict after.
 */
export function printDenominator(label, scorable, total, what = 'items') {
  console.log(`  ${label}: scorable ${scorable} of ${total} ${what}`)
  if (!total) refuse(`${label}: zero ${what} — nothing to measure`)
  if (!scorable) refuse(`${label}: scorable 0 of ${total} — none of these ${what} is something this checker can measure. That is not a pass.`)
}

/** Header naming the population, so a live report can never pass for a file report. */
export function populationHeader(mode, source) {
  return mode === 'live'
    ? `POPULATION: WHOLE LIVE BANK (--live) — this describes the shipped bank, not any batch file`
    : `POPULATION: batch file ${source}`
}

/**
 * For a tool that ONLY measures the live bank and has no file mode: any
 * argument it does not know is refused with exit 2, so a batch path can
 * never be silently ignored while live numbers print as though they
 * described it. `accepted` lists flags the tool does take. (A22 sweep,
 * 2026-10-02: seven live-only checkers read no argv at all.)
 */
export function refuseUnknownArgs(name, accepted = []) {
  const extra = process.argv.slice(2).filter(a => !accepted.includes(a.split('=')[0]))
  if (!extra.length) return
  refuse(`${name} measures the WHOLE LIVE BANK and has no file mode; it does not take: ${extra.join(' ')}\n` +
    `  Nothing it prints would describe a batch file.` + (accepted.length ? ` Accepted flags: ${accepted.join(' ')}` : ''))
}
