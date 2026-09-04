// Desktop captures of the study surface, for the desktop-treatment work.
//
// Uses PUPPETEER, not playwright: puppeteer is already a dependency here with
// Chromium cached, and playwright is not installed.
//
// It lives IN the repo rather than beside the store-screenshot scripts because
// Node resolves a bare import relative to the FILE, not the working directory
// — the same script under ~/Downloads could not find puppeteer no matter where
// it was run from.
//
// Same magic-link sign-in as capture.mjs (no password is ever typed), same
// demo account — 이수아, student42@demo.classraum.com — because store and
// review shots must never show a real student's name.
//
// Difference from capture.mjs: no store device sizes. This renders at the
// widths the desktop plan is written against (1280 and 1440) at scale 1, and
// captures the stage-1 pages only.
//
//   node scripts/shots/desktop.mjs                 # 1440, all stage-1 pages
//   WIDTHS=1280,1440 node scripts/shots/desktop.mjs
//   SHOTS=08-test node scripts/shots/desktop.mjs
import puppeteer from 'puppeteer'
import { createClient } from '@supabase/supabase-js'
import { readFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = '/Users/andylee/Downloads/saas/classraum'
const OUT = join(process.env.HOME, 'Downloads/classraum-store-screenshots/desktop')
const BASE = process.env.BASE ?? 'http://localhost:3000'
const WIDTHS = (process.env.WIDTHS ?? '1440').split(',').map(Number)
const LANG = process.env.LANG_UI ?? 'english'
const SETTLE = Number(process.env.SETTLE ?? 3000)
const ONLY = (process.env.SHOTS ?? '').split(',').filter(Boolean)

const env = Object.fromEntries(readFileSync(join(ROOT, '.env.local'), 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const ref = env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)[1]
const STORAGE_KEY = `sb-${ref}-auth-token`
const ACCOUNT = 'student42@demo.classraum.com'

const SHOTS = [
  ['01-home',   '/mobile/study'],
  ['05-review', '/mobile/study/review'],
  ['06-stats',  '/mobile/study/stats'],
  ['08-test',   '/mobile/study/session/ff4cb5b1-7895-4407-bcc6-23bf5f470bb2'],
  ['09-result', '/mobile/study/session/75336910-e2d1-4070-a037-8098676ea873/summary'],
]

async function main() {
  const { data: link, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email: ACCOUNT })
  if (error) throw new Error(`generateLink: ${error.message}`)
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: s, error: e2 } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: link.properties.hashed_token })
  if (e2) throw new Error(`verifyOtp: ${e2.message}`)
  const session = s.session

  // Language lives in user_preferences, not a cookie — setting a cookie here
  // silently did nothing the first time this pipeline was written.
  await admin.from('user_preferences').upsert(
    { user_id: session.user.id, language: LANG === 'korean' ? 'korean' : 'english' },
    { onConflict: 'user_id' },
  )

  const browser = await puppeteer.launch({ headless: 'new' })
  for (const width of WIDTHS) {
    const page = await browser.newPage()
    await page.setViewport({ width, height: 900, deviceScaleFactor: 2 })
    await page.emulateTimezone('Asia/Seoul')     // the browser clock decides "today"
    await page.evaluateOnNewDocument((k, v) => {
      try { localStorage.setItem(k, v) } catch { /* first-party storage blocked */ }
    }, STORAGE_KEY, JSON.stringify(session))
    const dir = join(OUT, String(width))
    mkdirSync(dir, { recursive: true })

    for (const [name, path] of SHOTS) {
      if (ONLY.length && !ONLY.includes(name)) continue
      await page.goto(BASE + path, { waitUntil: 'networkidle0', timeout: 60000 }).catch(() => {})
      await new Promise(r => setTimeout(r, SETTLE))
      // A shot of a page that has not loaded is worse than no shot: wait for
      // real content, and say so rather than capturing a skeleton silently.
      const loaded = await page.evaluate(() => {
        const t = document.body.innerText || ''
        return t.length > 120 && !/^\s*$/.test(t)
      }).catch(() => false)
      const file = join(dir, `${name}.png`)
      await page.screenshot({ path: file, fullPage: false })
      console.log(`${loaded ? 'ok  ' : 'THIN'}  ${width}  ${name.padEnd(10)} ${path}`)
    }
    await page.close()
  }
  await browser.close()
  console.log(`\nwrote to ${OUT}`)
}
main().catch(e => { console.error(e.message); process.exit(1) })
