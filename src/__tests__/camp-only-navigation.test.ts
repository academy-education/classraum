import fs from 'fs'
import path from 'path'

/**
 * A camp-only school's navigation is filtered in TWO files — the desktop
 * sidebar and the phone bottom nav — and they have disagreed before
 * ("Camp phone nav matches the sidebar", 2026-08-24). Nothing in the
 * type system connects them, so this pins them to each other.
 *
 * The allowlist is not arbitrary. A camp-only school gets Camp plus the
 * three screens a camp still needs to run a school day: classrooms (or
 * it cannot create a class or add a student at all), and sessions +
 * attendance (a camp meets in a room and somebody marks who turned up).
 */

const repo = path.resolve(__dirname, '../..')
const read = (p: string) => fs.readFileSync(path.join(repo, p), 'utf8')

/** The screens a camp-only school must be able to reach. */
const CAMP_ONLY_ALLOWLIST = ['camp-program', 'classrooms', 'sessions', 'attendance']

describe('camp-only navigation', () => {
  const sidebar = read('src/components/ui/sidebar.tsx')
  const bottomNav = read('src/components/ui/DashboardBottomNavigation.tsx')

  /** The `if (campOnly)` branch of the sidebar's item filter. */
  const sidebarBranch = (() => {
    const start = sidebar.indexOf('if (campOnly) {')
    expect(start).toBeGreaterThan(-1)
    return sidebar.slice(start, sidebar.indexOf('\n    }', start))
  })()

  /** The `if (campOnly)` return of the bottom nav's shelf builder. */
  const bottomBranch = (() => {
    const start = bottomNav.indexOf('if (campOnly) {')
    expect(start).toBeGreaterThan(-1)
    // ends at the closing of the returned array
    return bottomNav.slice(start, bottomNav.indexOf('\n    }', start))
  })()

  it.each(CAMP_ONLY_ALLOWLIST)('sidebar admits %s', id => {
    expect(sidebarBranch).toContain(`'${id}'`)
  })

  it.each(CAMP_ONLY_ALLOWLIST)('phone nav admits %s', id => {
    expect(bottomBranch).toContain(`'${id}'`)
  })

  it('neither surface admits a screen the other does not', () => {
    // Any id mentioned in one branch but not the other is a divergence.
    const ids = (src: string) =>
      new Set(Array.from(src.matchAll(/'([a-z-]+)'/g), m => m[1]).filter(
        id => /^(dashboard|classrooms|sessions|assignments|attendance|announcements|notifications|messages|exams-and-scores|reports|payments|camp-program)$/.test(id),
      ))
    const a = ids(sidebarBranch)
    const b = ids(bottomBranch)
    const onlyInSidebar = [...a].filter(x => !b.has(x))
    const onlyInPhone = [...b].filter(x => !a.has(x))
    expect({ onlyInSidebar, onlyInPhone }).toEqual({ onlyInSidebar: [], onlyInPhone: [] })
  })

  it('does not quietly hand a camp-only school the whole dashboard', () => {
    // The point of camp-only mode: a partner school never sees screens
    // for a curriculum it does not run. If these appear, the mode is
    // pointless and the demo stops looking purpose-built.
    for (const forbidden of ['payments', 'exams-and-scores', 'reports']) {
      expect(sidebarBranch).not.toContain(`'${forbidden}'`)
    }
  })
})
