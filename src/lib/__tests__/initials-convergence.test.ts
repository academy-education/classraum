import fs from 'fs'
import path from 'path'
import { initialsFromName } from '@/lib/name'

/** The two implementations that were in the tree at HEAD, verbatim. */
const OLD_LEAGUE = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
const OLD_FRIENDS = (name: string): string => (name.trim()[0] ?? '?').toUpperCase()
const OLD_ROSTER = (name: string): string => name.split(' ').map(n => n[0]).join('').toUpperCase()
const OLD_SIDEBAR = (name: string): string => name.charAt(0).toUpperCase()

const PEOPLE = ['김범준', '김영희', 'Andy Lee', 'Hyewon Song', 'Sung Eun Kim', '강하준 아버지', 'Andy']

it('HEAD really did disagree (the check must be able to fail)', () => {
  const disagreements = PEOPLE.filter(n =>
    new Set([OLD_LEAGUE(n), OLD_FRIENDS(n), OLD_ROSTER(n), OLD_SIDEBAR(n)]).size > 1)
  expect(disagreements).toEqual(PEOPLE)          // every fixture, all four sites
  expect(OLD_LEAGUE('김범준')).toBe('김범')
  expect(OLD_FRIENDS('김범준')).toBe('김')
})

it('all four sites now produce one initial per person', () => {
  const table = PEOPLE.map(n => [n, initialsFromName(n)])
  console.log(JSON.stringify(table, null, 0))
  expect(table).toEqual([
    ['김범준', '김'], ['김영희', '김'], ['Andy Lee', 'A'], ['Hyewon Song', 'H'],
    ['Sung Eun Kim', 'S'], ['강하준 아버지', '강'], ['Andy', 'A'],
  ])
})

/**
 * The pins above only cover the helper. This one covers the TREE: the way
 * this defect returns is somebody typing the four-token initials idiom into
 * the next avatar. `initials`/`initialsFromName` exist so they don't have to.
 *
 * Scoped to the exact `.split(' ').map(n => n[0])` shape, which in this
 * codebase only ever appeared on a person name — the many surviving
 * `charAt(0)` hits are sentence-case helpers (status labels, difficulty
 * tiers) and are deliberately NOT matched.
 */
it('no source file re-inlines the initials idiom', () => {
  const SRC = path.resolve(__dirname, '../..')
  const SELF = __filename
  const IDIOM = /\.split\(['"] ['"]\)\s*\.?\s*\n?\s*\.map\(\(?\w+(: string)?\)?\s*=>\s*\w+\[0\]\)/
  const offenders: string[] = []
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue
      const p = path.join(dir, e.name)
      if (e.isDirectory()) walk(p)
      else if (/\.tsx?$/.test(e.name) && p !== SELF && IDIOM.test(fs.readFileSync(p, 'utf8'))) offenders.push(p)
    }
  }
  walk(SRC)
  expect(offenders).toEqual([])
})
