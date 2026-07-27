/** @jest-environment node */
/**
 * Guards for the two drift bugs that cost the most this cycle.
 *
 * Neither was a logic error — both were bookkeeping that nothing checked:
 *
 *   1. Two migration files claimed number 052. The database versions by
 *      timestamp so nothing was mis-applied, but duplicate numbering is
 *      exactly how the notifications CHECK-constraint history ended up
 *      existing only in the live DB — which in turn silently rejected
 *      four notification kinds for months.
 *
 *   2. Environment variables were read in code but never documented, and
 *      the same concept was spelled two ways (CRON_SECRET vs
 *      CRON_SECRET_KEY). Vercel only sends its cron Authorization header
 *      for the former, so every scheduled job could 401 with no signal.
 *
 * These are cheap to check and impossible to notice by eye.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const MIGRATIONS = join(ROOT, 'database', 'migrations')

describe('migration files', () => {
  const files = readdirSync(MIGRATIONS).filter(f => f.endsWith('.sql'))

  it('has no duplicate numeric prefixes', () => {
    const byNumber = new Map<string, string[]>()
    for (const f of files) {
      const m = /^(\d+)_/.exec(f)
      if (!m) continue
      const n = m[1]!
      byNumber.set(n, [...(byNumber.get(n) ?? []), f])
    }
    const dupes = [...byNumber.entries()]
      .filter(([, fs]) => fs.length > 1)
      .map(([n, fs]) => `${n}: ${fs.join(', ')}`)
    expect(dupes).toEqual([])
  })

  it('every migration is prefixed with a number', () => {
    // An unnumbered file has no defined position in the sequence, so
    // its ordering relative to the others is unknowable.
    expect(files.filter(f => !/^\d+_/.test(f))).toEqual([])
  })
})

describe('environment variables', () => {
  /** Every process.env.X read across src/ and scripts/. */
  const readVars = (): Set<string> => {
    const found = new Set<string>()
    const walk = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (e.name === 'node_modules' || e.name === '.next') continue
        const p = join(dir, e.name)
        if (e.isDirectory()) { walk(p); continue }
        if (!/\.(ts|tsx|js|mjs)$/.test(e.name)) continue
        // Skip tests: they set fake vars to exercise branches.
        if (/__tests__|\.test\./.test(p)) continue
        const src = readFileSync(p, 'utf8')
        for (const m of src.matchAll(/process\.env\.([A-Z0-9_]+)/g)) found.add(m[1]!)
      }
    }
    walk(join(ROOT, 'src'))
    walk(join(ROOT, 'scripts'))
    return found
  }

  const documented = (): Set<string> => {
    const txt = readFileSync(join(ROOT, '.env.example'), 'utf8')
    const out = new Set<string>()
    for (const line of txt.split('\n')) {
      const m = /^\s*([A-Z0-9_]+)\s*=/.exec(line)
      if (m) out.add(m[1]!)
    }
    return out
  }

  /**
   * Vars the runtime injects (Vercel, Node) or that are build-tool-only.
   * These are legitimately absent from .env.example.
   */
  const RUNTIME_PROVIDED = new Set([
    'NODE_ENV', 'VERCEL_ENV', 'VERCEL_URL', 'VERCEL_REGION', 'CI',
    'npm_package_version', 'ANALYZE', 'PORT',
    // Injected by Next.js and by GitHub Actions respectively — never
    // set by hand, so documenting them would be misleading.
    'NEXT_RUNTIME', 'GITHUB_REF_NAME', 'GITHUB_SHA',
  ])

  it('every env var read in src/ or scripts/ is documented in .env.example', () => {
    const missing = [...readVars()]
      .filter(v => !RUNTIME_PROVIDED.has(v))
      .filter(v => !documented().has(v))
      .sort()
    // Undocumented vars are invisible to onboarding and to review — the
    // SUPABASE_SERVICE_ROLE_KEY was read in 30 places while absent here.
    expect(missing).toEqual([])
  })

  it('does not reintroduce a second spelling of the cron secret', () => {
    // CRON_SECRET is the name Vercel Cron requires in order to attach
    // its Authorization header; CRON_SECRET_KEY is the legacy alias.
    // Any NEW reader must accept both, which in this codebase means
    // going through verifyCronAuth rather than reading env directly.
    const offenders: string[] = []
    const walk = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (e.name === 'node_modules' || e.name === '.next') continue
        const p = join(dir, e.name)
        if (e.isDirectory()) { walk(p); continue }
        if (!/\.(ts|tsx)$/.test(e.name)) continue
        if (/__tests__|\.test\./.test(p)) continue
        const src = readFileSync(p, 'utf8')
        // Strip comments so documentation mentioning the legacy name
        // doesn't register as a read.
        const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
        if (!code.includes('process.env.CRON_SECRET_KEY')) continue
        // Accepting both names is the correct pattern.
        if (/CRON_SECRET\s*\|\|\s*process\.env\.CRON_SECRET_KEY/.test(code)) continue
        offenders.push(p.replace(ROOT + '/', ''))
      }
    }
    walk(join(ROOT, 'src'))
    expect(offenders).toEqual([])
  })
})
