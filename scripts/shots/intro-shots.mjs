// Full-resolution study-surface captures for the introduction document.
//
//   node scripts/shots/intro-shots.mjs <outdir>          # both languages
//   LANGS=english node scripts/shots/intro-shots.mjs <outdir>
//
// Why a separate script from desktop.mjs: the document needs the ORIGINAL
// 2880px PNGs kept per language, because every previous edition cropped
// from 1280px JPEGs and printed soft. This writes <outdir>/src-en/*.png and
// <outdir>/src-ko/*.png at deviceScaleFactor 2 and never downsamples.
//
// Same magic-link sign-in as desktop.mjs (no password is ever typed), same
// demo student (이수아). Language is the account's user_preferences row, so
// it is set per pass and RESTORED TO ENGLISH at the end whatever happens.
import puppeteer from 'puppeteer'
import { createClient } from '@supabase/supabase-js'
import { readFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = '/Users/andylee/Downloads/saas/classraum'
const OUT = process.argv[2]
if (!OUT) { console.error('usage: intro-shots.mjs <outdir>'); process.exit(2) }
const BASE = process.env.BASE ?? 'http://localhost:3000'
const LANGS = (process.env.LANGS ?? 'english,korean').split(',')
const ONLY = (process.env.ONLY ?? '').split(',').filter(Boolean)
const SETTLE = Number(process.env.SETTLE ?? 9000)

const env = Object.fromEntries(readFileSync(join(ROOT, '.env.local'), 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const ref = env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)[1]
const STORAGE_KEY = `sb-${ref}-auth-token`
const ACCOUNT = 'student42@demo.classraum.com'
const USER_ID = '4fab6aed-b8b9-45cb-adfc-1235c98460e5'

// Sessions are language-specific: an English UI over a Korean test reads as
// a bug in a document, so each language gets its own session ids.
const SESS = {
  english: { test: '36d4ee42-abf4-49d9-b10d-ac9de231cd26', result: '91303218-c961-4929-837d-3f147d53c9a0' },
  korean:  { test: 'ff4cb5b1-7895-4407-bcc6-23bf5f470bb2', result: '75336910-e2d1-4070-a037-8098676ea873' },
}
const SHOTS = (lang) => [
  ['home',    '/mobile/study'],
  ['tests',   '/mobile/study/tests'],
  ['sat',     `/mobile/study/topic/${process.env.SAT_SLUG ?? 'sat-reading-writing'}`],
  ['review',  '/mobile/study/review'],
  ['review2', '/mobile/study/review', 500],   // scrolled to the second card, for the per-question figure
  ['stats',   '/mobile/study/stats'],
  ['subscription', '/mobile/study/subscription'],
  ['test',    `/mobile/study/session/${SESS[lang].test}`],
  ['result',  `/mobile/study/session/${SESS[lang].result}/summary`],
]

async function setLanguage(lang) {
  const { error } = await admin.from('user_preferences').upsert({ user_id: USER_ID, language: lang }, { onConflict: 'user_id' })
  if (error) throw new Error(`user_preferences: ${error.message}`)
}

async function main() {
  const { data: link, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email: ACCOUNT })
  if (error) throw new Error(`generateLink: ${error.message}`)
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: s, error: e2 } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: link.properties.hashed_token })
  if (e2) throw new Error(`verifyOtp: ${e2.message}`)

  const browser = await puppeteer.launch({ headless: 'new' })
  let failures = 0
  try {
    for (const lang of LANGS) {
      await setLanguage(lang)
      const dir = join(OUT, lang === 'korean' ? 'src-ko' : 'src-en'); mkdirSync(dir, { recursive: true })
      const page = await browser.newPage()
      await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })
      await page.evaluateOnNewDocument((k, v) => { localStorage.setItem(k, v) }, STORAGE_KEY, JSON.stringify(s.session))
      for (const [name, path, scroll] of SHOTS(lang)) {
        if (ONLY.length && !ONLY.includes(name)) continue
        let navErr = null
        await page.goto(BASE + path, { waitUntil: 'load', timeout: 120000 }).catch(e => { navErr = String(e.message || e).slice(0, 80) })
        await new Promise(r => setTimeout(r, SETTLE))
        if (scroll) { await page.evaluate(px => { const el = [...document.querySelectorAll('*')].find(e => /auto|scroll/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight + 200); (el || document.scrollingElement).scrollTop = px }, scroll); await new Promise(r => setTimeout(r, 1200)) }
        const state = await page.evaluate(() => {
          const t = document.body.innerText || ''
          if (/ERR_|refused to connect|This site can.t be reached/i.test(t)) return 'ERROR'
          if (/^\s*$/.test(t) || t.length < 120) return 'THIN'
          return document.querySelector('nav, aside, [data-study-shell]') ? 'ok' : 'THIN'
        }).catch(() => 'ERROR')
        const verdict = navErr ? 'ERROR' : state
        // A failed capture must never replace a good original. It happened once:
        // the server was down and every source PNG became an error page.
        const file = join(dir, verdict === 'ok' ? `${name}.png` : `${name}.FAILED.png`)
        await page.screenshot({ path: file, fullPage: false })
        console.log(`${verdict.padEnd(5)} ${lang.padEnd(7)} ${name.padEnd(7)} ${path}${navErr ? '   nav: ' + navErr : ''}`)
        if (verdict !== 'ok') failures++
      }
      await page.close()
    }
  } finally {
    await browser.close()
    // Whatever happened above, the demo account goes back to English: other
    // work captures the English product from the same account.
    await setLanguage('english')
    const { data } = await admin.from('user_preferences').select('language').eq('user_id', USER_ID).maybeSingle()
    console.log(`\ndemo account language restored: ${data?.language}`)
  }
  if (failures) { console.error(`${failures} capture(s) did not render — treat those PNGs as invalid`); process.exitCode = 2 }
}
main().catch(e => { console.error(e); process.exitCode = 1 })
