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
// MODE=manager shoots the academy (manager) surface as the demo manager 김관리,
// for the academy edition of the introduction (2026-10-07). Same magic-link
// sign-in; the manager's language preference is restored to English at the end.
const MANAGER = process.env.MODE === 'manager'
const ACCOUNT = MANAGER ? 'manager@demo.classraum.com' : 'student42@demo.classraum.com'
const USER_ID = MANAGER ? '813954a2-7405-478a-9c93-62bdc42c08ec' : '4fab6aed-b8b9-45cb-adfc-1235c98460e5'

// Sessions are language-specific: an English UI over a Korean test reads as
// a bug in a document, so each language gets its own session ids.
//
// RESULT_SESSION overrides the result session for every language pass. The
// English result session above is a 1-of-54 attempt (2%, "53 left blank"),
// which is unusable in a document for students and parents; the split Study
// introduction (2026-10-07) shot the English result screen from the 89% SAT
// Reading and Writing session instead. The result SUMMARY shows no Korean
// content, so the language caveat above does not apply to it.
const SESS = {
  english: { test: '36d4ee42-abf4-49d9-b10d-ac9de231cd26', result: process.env.RESULT_SESSION ?? '91303218-c961-4929-837d-3f147d53c9a0' },
  korean:  { test: 'ff4cb5b1-7895-4407-bcc6-23bf5f470bb2', result: process.env.RESULT_SESSION ?? '75336910-e2d1-4070-a037-8098676ea873' },
}
const MANAGER_SHOTS = [
  ['m-dashboard', '/dashboard'],
  ['m-students',  '/students'],
  ['m-classrooms','/classrooms'],
  ['m-payments',  '/payments'],
  ['m-reports',   '/reports'],
  ['m-exams',     '/exams-and-scores'],
  ['m-camp',      '/camp-program'],
  ['m-camp-review','/camp-program', -640],
  ['m-camp-students','/camp-program', 0, ['학생', 'Students']],
  ['m-camp-answers', '/camp-program', 0, [['학생', 'Students'], 'ROW', ['과제', 'Assignments'], ['title:학생 답안 보기', "title:Review this student's answers"], 'WRONG']],
]
const SHOTS = (lang) => MANAGER ? MANAGER_SHOTS : [
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
      await page.evaluateOnNewDocument((k, v) => { localStorage.setItem(k, v); localStorage.setItem('classraum:getting_started_dismissed:813954a2-7405-478a-9c93-62bdc42c08ec', '1'); localStorage.setItem('classraum:welcome_seen:813954a2-7405-478a-9c93-62bdc42c08ec', '1'); const hide = () => { const st = document.createElement('style'); st.textContent = 'nextjs-portal{display:none!important}'; document.documentElement.appendChild(st) }; document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', hide) : hide() }, STORAGE_KEY, JSON.stringify(s.session))
      for (const [name, path, scroll, click] of SHOTS(lang)) {
        if (ONLY.length && !ONLY.includes(name)) continue
        let navErr = null
        await page.goto(BASE + path, { waitUntil: 'load', timeout: 120000 }).catch(e => { navErr = String(e.message || e).slice(0, 80) })
        await new Promise(r => setTimeout(r, SETTLE))
        // click: a list of steps run in order before the shot. A step is
        // [koText, enText] (press the LAST button/tab with that text, so a
        // content tab wins over a same-named sidebar entry), 'ROW' (open the
        // first clickable table row), or ['title:ko', 'title:en'] (press the
        // first element with that title attribute).
        if (click) {
          const steps = Array.isArray(click[0]) || click[0] === 'ROW' || click[0] === 'WRONG' ? click : [click]
          for (const step of steps) {
            // Poll up to 40s: camp panels load after the click, and a step run
            // against a skeleton presses nothing (or the sidebar). Text steps
            // look inside an open dialog first.
            let ok = false
            for (let tries = 0; tries < 80 && !ok; tries++) {
              ok = await page.evaluate((st, ko) => {
                const scope = [...document.querySelectorAll('[role=dialog]')].pop() || document
                if (st === 'WRONG') { const d = [...document.querySelectorAll('[role=dialog]')].pop(); const w = d && [...d.querySelectorAll('[class*="rose"]')].find(e => e.getBoundingClientRect().height > 0); if (!w) return false; let p = w.parentElement; while (p && p !== d && !(p.scrollHeight > p.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(p).overflowY))) p = p.parentElement; const row = w.closest('li, [class*="rounded"]') || w; if (p && p !== d) p.scrollTop += row.getBoundingClientRect().top - p.getBoundingClientRect().top - 12; return true }
                if (st === 'ROW') { const r = [...document.querySelectorAll('main tbody tr, tbody tr')].find(e => getComputedStyle(e).cursor === 'pointer'); if (r) { r.click(); return true } return false }
                const t = ko ? st[0] : st[1]
                if (t.startsWith('title:')) { const el = [...scope.querySelectorAll('[title]')].find(e => e.getAttribute('title') === t.slice(6)); if (el) { el.click(); return true } return false }
                const els = [...scope.querySelectorAll('button, [role=tab]')].filter(e => (e.textContent || '').trim() === t && !e.closest('aside'))
                if (els.length) { els[els.length - 1].click(); return true } return false
              }, step, lang === 'korean')
              if (!ok) await new Promise(r => setTimeout(r, 500))
            }
            if (!ok) console.log(`     step not found: ${JSON.stringify(step)}`)
            await new Promise(r => setTimeout(r, 5000))
          }
        }
        // a negative scroll means: scroll every scrollable container (and the window) by that many px
        if (scroll < 0) { await page.evaluate(px => { window.scrollTo(0, px); for (const e of document.querySelectorAll('*')) { if (/auto|scroll/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight + 4) e.scrollTop = px } }, -scroll); await new Promise(r => setTimeout(r, 1500)) }
        else if (scroll) { await page.evaluate(px => { const el = [...document.querySelectorAll('*')].find(e => /auto|scroll/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight + 200); (el || document.scrollingElement).scrollTop = px }, scroll); await new Promise(r => setTimeout(r, 1200)) }
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
