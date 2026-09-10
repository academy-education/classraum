import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * The manager/teacher surface sizes type with the NAMED Tailwind scale.
 *
 * This is the opposite convention to study mode, deliberately. Study mode
 * uses explicit pixels (see src/app/mobile/study/__tests__/type-scale.test.ts)
 * because its steps — 11, 13, 15, 17 — do not line up with Tailwind's. The
 * manager pages already used the named scale for 2,261 of 2,501 sizes, so the
 * cheaper and less disruptive fix was to finish the job rather than convert
 * it.
 *
 * Two arbitrary sizes survive, and only these two: Tailwind has no step below
 * `text-xs` (12px), and the manager surface leans on 10px and 11px for
 * uppercase micro-labels — 213 uses between them. Everything else that was
 * arbitrary (32 uses across nine sizes: 9, 10.5, 11.5, 12, 12.5, 13, 14, 15
 * and 17) collapsed onto the named steps on 2026-09-10.
 */
const ALLOWED_ARBITRARY = new Set(['10px', '11px'])

const ROOTS = [
  join(__dirname, '..', '..', 'components', 'ui'),
  join(__dirname, '..', '..', 'app', '(app)'),
]

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    if (e === '__tests__' || e === 'node_modules') continue
    const p = join(dir, e)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.tsx?$/.test(e)) out.push(p)
  }
  return out
}

describe('manager surface type scale', () => {
  const files = ROOTS.flatMap(r => walk(r))

  it('has files to check', () => {
    // A scan that reads nothing passes every assertion below it.
    expect(files.length).toBeGreaterThan(100)
  })

  it('uses arbitrary pixel sizes only where Tailwind has no step', () => {
    const offenders: string[] = []
    for (const f of files) {
      const src = readFileSync(f, 'utf8')
      for (const m of src.matchAll(/text-\[([0-9.]+px)\]/g)) {
        if (!ALLOWED_ARBITRARY.has(m[1])) {
          offenders.push(`${f.split('/src/')[1]} — text-[${m[1]}]`)
        }
      }
    }
    expect([...new Set(offenders)]).toEqual([])
  })
})
