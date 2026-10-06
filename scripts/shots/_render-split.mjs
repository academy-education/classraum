// Build + render the two split introduction documents (2026-10-07):
//   academy-ko / academy-en   학원 운영 소개서 / Classraum for Academies
//   study-ko   / study-en     Classraum Study 소개서 / Classraum Study
//
//   node scripts/shots/_render-split.mjs <builddir> <doc> [outdir]
//
//   SIZE=b5   JIS B5 (182x257mm): the A4 layout zoomed by 0.86667, as in _render-intro.mjs
//   BLEED=1   3mm bleed on every side
//   PRINT=1   print booklet: inserts the pages authored in <template id="print-pages">
//             (<!--AFTER-COVER--> after the front cover, <!--BEFORE-BACK--> ahead of the
//             back cover). The result MUST be a multiple of 4 pages or the build fails.
//             PRINT16=1 is accepted as an alias.
//   PNG=1     also rasterise every page of the written PDF with pdftoppm into
//             <builddir>/_png/<pdf name>/p-NN.png, so variants can be LOOKED at, not
//             only measured.
//
// Reads  <builddir>/classraum-<doc>.src.html and the image sidecars in
//        <builddir>/img2-ko or img2-en (__IMG_name__ tokens -> base64 data URIs).
// Writes <outdir>/<clear file name>.pdf, and for the plain A4 screen build also
//        <builddir>/classraum-<doc>.html (images inlined) and _split-<doc>-pN.png.
//
// Differences from _render-intro*.mjs, both on purpose:
//  1. Folios and contents page numbers are COMPUTED from page position after the
//     print pages are inserted (rh ".r" spans reading "NN / NN", and ".tp[data-ref]"
//     pointing at a section id). The old script shifted hard-coded numbers by one,
//     which only works for one fixed imposition.
//  2. The page count is read from the DOM AND from pdfinfo on the written PDF, and
//     the build fails if they disagree. The old script printed "0 pages" for every
//     B5/BLEED variant because it counted screenshots, not pages.
import puppeteer from 'puppeteer'
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

const [SP, DOC, OUT_ARG] = process.argv.slice(2)
const DOCS = {
  'academy-ko': { lang: 'ko', name: '클래스라움 학원 운영 소개서 - KO' },
  'academy-en': { lang: 'en', name: 'Classraum for Academies - EN' },
  'study-ko':   { lang: 'ko', name: 'Classraum Study 소개서 - KO' },
  'study-en':   { lang: 'en', name: 'Classraum Study - EN' },
}
if (!SP || !DOCS[DOC]) { console.error(`usage: _render-split.mjs <builddir> <${Object.keys(DOCS).join('|')}> [outdir]`); process.exit(2) }
const OUT = OUT_ARG ?? SP
mkdirSync(OUT, { recursive: true })
const { lang, name } = DOCS[DOC]
const BLEED = !!process.env.BLEED
const PRINT = !!(process.env.PRINT || process.env.PRINT16)
const B5 = process.env.SIZE === 'b5'

let html = readFileSync(`${SP}/classraum-${DOC}.src.html`, 'utf8')
html = html.replace(/__IMG_([\w-]+)__/g, (_, n) => {
  const f = `${SP}/img2-${lang}/${n}.b64`
  if (!existsSync(f)) { console.error(`missing image sidecar: ${n}`); process.exitCode = 2; return '' }
  return 'data:image/jpeg;base64,' + readFileSync(f, 'utf8').replace(/\s+/g, '')
})
if (process.exitCode) process.exit(process.exitCode)

const tm = html.match(/<template id="print-pages">([\s\S]*?)<\/template>/)
if (PRINT) {
  const part = (tag) => { const m = (tm?.[1] ?? '').split(/<!--(AFTER-COVER|BEFORE-BACK)-->/); const i = m.indexOf(tag); return i < 0 ? '' : m[i + 1] }
  if (tm) html = html.replace(tm[0], '')
  const afterCover = part('AFTER-COVER'), beforeBack = part('BEFORE-BACK')
  if (afterCover) html = html.replace(/(<\/section>\n)/, '$1' + afterCover)
  if (beforeBack) { const back = html.lastIndexOf('<section class="page back-page">'); html = html.slice(0, back) + beforeBack + '\n' + html.slice(back) }
} else if (tm) html = html.replace(tm[0], '')

if (BLEED) html = html.replace('</style>', '@page{ size:216mm 303mm; margin:0 } @media print{ .page{ box-sizing:content-box; border:3mm solid transparent; } }</style>')
if (B5) html = html.replace('</style>', '.micro,.bk-micro{ font-size:8pt; } .lp-add p,.lp-anchor,th{ font-size:7.8pt; }</style>')
const B5_PRINT = `@page{ size:${BLEED ? '188mm 263mm' : '182mm 257mm'}; margin:0 } @media print{ .page{ width:210mm; height:296.5mm; zoom:0.86667; ${BLEED ? 'box-sizing:content-box; border:3.4615mm solid transparent;' : ''} } }`
const SCREEN = !BLEED && !B5 && !PRINT
if (SCREEN) writeFileSync(`${SP}/classraum-${DOC}.html`, html)
const wrapped = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0">${html}</body></html>`
const WRAP = `${SP}/_split-${DOC}-wrapped.html`
writeFileSync(WRAP, wrapped)

const b = await puppeteer.launch({ headless: 'new' })
const p = await b.newPage()
await p.goto('file://' + WRAP, { waitUntil: 'load', timeout: 120000 })
await p.evaluateHandle('document.fonts.ready')

// Folios and contents numbers from position. A ref that resolves to nothing is an error.
const folio = await p.evaluate(() => {
  const pages = [...document.querySelectorAll('.page')], pad = n => String(n).padStart(2, '0'), missing = []
  pages.forEach((pg, i) => pg.querySelectorAll('.rh .r').forEach(r => { if (/^\d\d \/ \d\d$/.test(r.textContent.trim())) r.textContent = `${pad(i + 1)} / ${pad(pages.length)}` }))
  document.querySelectorAll('.tp[data-ref]').forEach(tp => {
    const t = document.getElementById(tp.dataset.ref), pg = t && t.closest('.page')
    if (!pg) { missing.push(tp.dataset.ref); return }
    tp.textContent = pad(pages.indexOf(pg) + 1)
  })
  return { pages: pages.length, missing }
})
if (folio.missing.length) { console.error('contents refs with no target: ' + folio.missing.join(', ')); process.exitCode = 2 }

// OVERFLOW CHECK (same two signals as _render-intro.mjs): a page whose body is taller
// than the page is clipped silently by overflow:hidden.
await p.emulateMediaType('print')
const report = await p.evaluate(() => [...document.querySelectorAll('.page')].map((pg, i) => {
  const body = pg.querySelector('.body')
  const bb = body.getBoundingClientRect()
  let maxBottom = -Infinity, used = 0
  for (const el of body.children) {
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el)
    const mt = parseFloat(cs.marginTop) || 0, mb = parseFloat(cs.marginBottom) || 0
    maxBottom = Math.max(maxBottom, r.bottom + mb)
    const autoTop = (el.getAttribute('style') || '').includes('margin-top:auto')
    used += r.height + (autoTop ? 0 : mt) + mb
  }
  // A text box wider than its column (a long unbreakable word) is clipped too.
  let wide = 0
  for (const el of body.querySelectorAll('*')) if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow === 'hidden' && el.clientWidth > 0 && !el.closest('.shot,.dev-phone,svg')) wide++
  const over = Math.round(Math.max(maxBottom - bb.bottom, body.scrollHeight - body.clientHeight))
  return { page: i + 1, content: Math.round(used), client: Math.round(bb.height), over, wide, fill: bb.height ? Math.round(100 * used / bb.height) : 0 }
}))
for (const r of report) console.log(`page ${String(r.page).padStart(2)}: content ${r.content}/${r.client}px  ${r.fill}% full  ${(r.over > 0 || r.fill > 100) ? 'OVERFLOW +' + Math.max(r.over, r.content - r.client) + 'px  <-- CLIPPED' : 'ok'}${r.wide ? `  (${r.wide} box(es) wider than their column)` : ''}`)

if (B5) await p.evaluate(css => { const s = document.createElement('style'); s.textContent = css; document.body.appendChild(s) }, B5_PRINT)
const variant = [B5 ? 'B5' : 'A4', PRINT ? `PRINT (${folio.pages} pages${BLEED ? ', 3mm bleed' : ''})` : (BLEED ? '3mm bleed' : '')].filter(Boolean).join(' - ')
const pdf = join(OUT, `${name} - ${variant}.pdf`)
await p.pdf({ path: pdf, format: 'A4', printBackground: true, preferCSSPageSize: true })

if (SCREEN) {
  await p.emulateMediaType('screen'); await p.setViewport({ width: 900, height: 1300, deviceScaleFactor: 1 })
  const els = await p.$$('.page')
  for (let i = 0; i < els.length; i++) await els[i].screenshot({ path: `${SP}/_split-${DOC}-p${i + 1}.png` })
}
await b.close()

const pdfPages = Number(execFileSync('pdfinfo', [pdf]).toString().match(/Pages:\s+(\d+)/)?.[1] ?? 0)
const clipped = report.filter(r => r.over > 0 || r.fill > 100).length
console.log(`\n${pdf}\nDOM pages ${folio.pages} · PDF pages ${pdfPages}`)
if (pdfPages !== folio.pages) { console.error('PAGE COUNT MISMATCH between the DOM and the PDF'); process.exitCode = 2 }
if (PRINT && pdfPages % 4) { console.error(`print booklet is ${pdfPages} pages, not a multiple of 4`); process.exitCode = 2 }
console.log(clipped ? `${clipped} page(s) CLIPPED — fix before publishing` : 'no page clipped')
if (clipped) process.exitCode = 2

if (process.env.PNG) {
  const dir = join(SP, '_png', `${name} - ${variant}`); rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true })
  execFileSync('pdftoppm', ['-r', '80', '-png', pdf, join(dir, 'p')])
  console.log(`page PNGs: ${dir}`)
}
