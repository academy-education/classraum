// Mobile-unchanged fingerprint for /mobile/study.
//
// A viewport screenshot at 390 only covers the FIRST screen, and the study
// landing scrolls inside an overflow container, so `fullPage` would not help
// either. The only gap the column split can move is between the last main
// band and the first aside band, which sits ~1400px down — invisible to the
// screenshot. So this measures GEOMETRY of every rendered band in the scroll
// container: full document order, offsets, sizes, and the total scroll height.
//
//   node scripts/shots/mobile-fingerprint.mjs before.json    # on the old code
//   node scripts/shots/mobile-fingerprint.mjs after.json     # on the new code
//   diff before.json after.json                              # must be empty
//
// BREAK-TEST IT before believing an empty diff. Making StudyColumns space={6}
// on the landing moves exactly one gap by 8px, ~1400px down the page; this
// catches it (scrollHeight 1900 -> 1892) and the 390px screenshot does not.
//
// A DIFFERING run is not automatically a regression: bands whose data loads
// late (WeekPlanCard) can be missing if the settle window loses a race, which
// shows up as one band shrinking and everything below it moving. Re-run before
// concluding anything — a real layout change reproduces, a flake does not.
//
// PAGE=/mobile/study/stats to point it at another surface.
import puppeteer from 'puppeteer'
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = new URL('../..', import.meta.url).pathname
const OUT = process.argv[2]
const PATH = process.env.PAGE ?? '/mobile/study'
if (!OUT) { console.error('usage: fingerprint.mjs <out.json>'); process.exit(1) }
const env = Object.fromEntries(readFileSync(join(ROOT, '.env.local'), 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const ref = env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)[1]
const STORAGE_KEY = `sb-${ref}-auth-token`
const ACCOUNT = 'student42@demo.classraum.com'

const { data: link, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email: ACCOUNT })
if (error) throw new Error(error.message)
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const { data: s, error: e2 } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: link.properties.hashed_token })
if (e2) throw new Error(e2.message)

const browser = await puppeteer.launch({ headless: 'new' })
const page = await browser.newPage()
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 })
await page.emulateTimezone('Asia/Seoul')
await page.evaluateOnNewDocument((k, v) => { try { localStorage.setItem(k, v) } catch {} }, STORAGE_KEY, JSON.stringify(s.session))
await page.goto('http://localhost:3000' + PATH, { waitUntil: 'networkidle0', timeout: 60000 })
await new Promise(r => setTimeout(r, 12000))

const fp = await page.evaluate(() => {
  // The landing content container: the max-w wrapper inside the scroller.
  const el = document.querySelector('main [class*="max-w-3xl"][class*="pb-14"]')
    || document.querySelector('[class*="max-w-3xl"][class*="pb-14"]')
  if (!el) return { error: 'container not found' }
  const scroller = el.closest('[class*="overflow-y-auto"]')
  // Walk BAND-LEVEL nodes: the leaves of the wrapper chain. StudyMain /
  // StudyAside are transparent wrappers, so descend through any div that is
  // only a layout wrapper (no ring/bg/rounded of its own) to reach the real
  // bands. That is what makes this comparable across the two structures.
  const isWrapper = (n) => n.tagName === 'DIV'
    && /space-y-|lg:grid|col-span/.test(n.className || '')
    && !/rounded|ring-1|bg-white|bg-gradient/.test(n.className || '')
  // Descend through LAYOUT-ONLY wrappers (StudyMain / StudyAside / StudyColumns
  // are transparent divs) so the band list is comparable across a flat stack and
  // a two-column split. Offsets are relative to the container, so a stray scroll
  // position cannot leak into the numbers.
  const base = el.getBoundingClientRect().top
  const all = []
  const walk2 = (node) => {
    for (const c of node.children) {
      if (isWrapper(c)) { walk2(c); continue }
      const r = c.getBoundingClientRect()
      const cs = getComputedStyle(c)
      all.push({ tag: c.tagName, y: Math.round(r.top - base), h: Math.round(r.height), w: Math.round(r.width),
        mt: cs.marginTop, text: (c.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 50) })
    }
  }
  walk2(el)
  return {
    containerClass: el.className,
    containerHeight: Math.round(el.getBoundingClientRect().height),
    scrollHeight: scroller ? scroller.scrollHeight : null,
    bands: all,
  }
})
// A checker that could not read its input must not return a number.
if (fp.error || !fp.bands || fp.bands.length === 0) {
  console.error(`could not measure ${PATH}: ${fp.error ?? 'no bands found'} — NOT writing ${OUT}`)
  await browser.close()
  process.exit(2)
}
writeFileSync(OUT, JSON.stringify(fp, null, 2))
console.log(OUT, 'bands:', fp.bands ? fp.bands.length : fp.error, 'scrollHeight:', fp.scrollHeight)
await browser.close()
