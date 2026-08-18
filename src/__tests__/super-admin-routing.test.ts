import fs from 'fs'
import path from 'path'

/**
 * A super admin is a PLATFORM role, not academy staff. Two things went
 * wrong together on 2026-08-18 and this file pins both:
 *
 *  1. The middleware sent the app subdomain's root to /dashboard — the
 *     manager dashboard — with a comment claiming it "will then redirect
 *     based on auth/role". It does not; it is a page, not a router. The
 *     real role router lived at (app)/page.tsx, which resolves to "/" —
 *     the same path as the marketing landing page — so Next served the
 *     marketing page there and the router never ran at all.
 *
 *  2. The (app) layout listed admin/super_admin among its allowed roles,
 *     so nothing bounced a platform admin back out of academy pages.
 *
 * Both were invisible because our super admins also hold a managers row:
 * the manager dashboard rendered real data instead of failing.
 */

const repo = path.resolve(__dirname, '../..')
const read = (p: string) => fs.readFileSync(path.join(repo, p), 'utf8')

describe('super admin never lands on academy surfaces', () => {
  const middleware = read('src/middleware.ts')

  it('app-subdomain root goes to the role router, not the manager dashboard', () => {
    // The root branch must not hand out /dashboard.
    const rootBranch = middleware.slice(
      middleware.indexOf("if (url.pathname === '/')"),
      middleware.indexOf("if (url.pathname === '/')") + 240
    )
    expect(rootBranch).toContain("'/home'")
    expect(rootBranch).not.toContain("'/dashboard'")
  })

  it('/home is treated as a protected route', () => {
    // Missing from the list, the app-subdomain branch 307s unknown routes
    // to /auth — the fallthrough that already bit /camp-program.
    const list = middleware.slice(
      middleware.indexOf('const protectedRoutes = ['),
      middleware.indexOf(']', middleware.indexOf('const protectedRoutes = ['))
    )
    expect(list).toContain("'/home'")
  })

  it('the role router exists at a path that is actually reachable', () => {
    expect(fs.existsSync(path.join(repo, 'src/app/(app)/home/page.tsx'))).toBe(true)
    // (app)/page.tsx collides with the marketing page at "/" — if it comes
    // back, the router is dead again and this whole bug returns.
    expect(fs.existsSync(path.join(repo, 'src/app/(app)/page.tsx'))).toBe(false)
  })

  it('the role router sends platform admins to /admin', () => {
    const router = read('src/app/(app)/home/page.tsx')
    expect(router).toMatch(/userRole === 'admin' \|\| userRole === 'super_admin'/)
    expect(router).toContain("router.replace('/admin')")
  })

  it('academy pages do not admit platform admins', () => {
    const layout = read('src/app/(app)/layout.tsx')
    const allowed = layout.slice(layout.indexOf('allowedRoles={['), layout.indexOf('allowedRoles={[') + 120)
    expect(allowed).toContain("'manager'")
    expect(allowed).toContain("'teacher'")
    expect(allowed).not.toContain('super_admin')
    expect(allowed).not.toContain("'admin'")
  })
})
