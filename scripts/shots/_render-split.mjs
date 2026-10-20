// Build + render the two split introduction documents (2026-10-07):
//   academy-ko / academy-en   학원 운영 소개서 / Classraum for Academies
//   study-ko   / study-en     Classraum Study 소개서 / Classraum Study
//
//   node scripts/shots/_render-split.mjs <builddir> <doc> [outdir]
//
//   SIZE=b5   JIS B5 (182x257mm): the A4 layout zoomed by 0.86667, as in _render-intro.mjs
//   BLEED=1   3mm bleed on every side. The page box grows by the bleed and stays
//             border-box, so the content area is identical to the trim build. (Until
//             2026-10-16 bleed switched to content-box: every page was laid out taller by
//             its padding and the cover, padding-bottom 0, showed ~22mm of white at the foot.)
//             The cover screenshot runs on into the bottom bleed, so a low trim never
//             shows a navy line under it.
//   PRINT=1   print booklet: inserts the pages authored in <template id="print-pages">
//             (<!--AFTER-COVER--> after the front cover, <!--BEFORE-BACK--> ahead of the
//             back cover). The result MUST be a multiple of 4 pages or the build fails.
//             PRINT16=1 is accepted as an alias.
//   PNG=1     also rasterise every page of the written PDF with pdftoppm into
//             <builddir>/_png/<pdf name>/p-NN.png, so variants can be LOOKED at, not
//             only measured.
//
// Reads  <builddir>/classraum-<doc>.src.html and the image sidecars in
//        <builddir>/img2-ko or img2-en, or the doc's own img folder if DOCS sets one
//        (__IMG_name__ tokens -> base64 data URIs).
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
  // Rebuilt 2026-10-12 from the co-founder's final PDF; its screenshots are the ones
  // embedded in that PDF, so they live in their own sidecar folder.
  'sat-camps-en': { lang: 'en', name: 'Classraum SAT Camps - EN', img: 'img2-camps-en' },
  // 2026-10-20: the two halves of the combined Study + SAT Camps booklet, written by
  // _render-combo.mjs and merged there. Each keeps its own stylesheet (the two diverge).
  // 2026-10-20: SAT Camps KO made editable (sources/build-sat-camps-ko.py: the EN source with the
  // co-founder's 2026-10-16 Korean text); same screenshots as EN.
  'sat-camps-ko': { lang: 'ko', name: 'Classraum SAT Camps - KO', img: 'img2-camps-en' },
  'combo-study-en': { lang: 'en', name: '_combo-part1-study-EN', img: 'img2-combo-en' },
  'combo-camps-en': { lang: 'en', name: '_combo-part2-camps-EN', img: 'img2-camps-en' },
  'combo-study-ko': { lang: 'ko', name: '_combo-part1-study-KO', img: 'img2-combo-ko' },
  'combo-camps-ko': { lang: 'ko', name: '_combo-part2-camps-KO', img: 'img2-camps-en' },
}
if (!SP || !DOCS[DOC]) { console.error(`usage: _render-split.mjs <builddir> <${Object.keys(DOCS).join('|')}> [outdir]`); process.exit(2) }
const OUT = OUT_ARG ?? SP
mkdirSync(OUT, { recursive: true })
const { lang, name } = DOCS[DOC]
const IMG_DIR = DOCS[DOC].img ?? `img2-${lang}`
const BLEED = !!process.env.BLEED
const PRINT = !!(process.env.PRINT || process.env.PRINT16)
const B5 = process.env.SIZE === 'b5'
// Combined-booklet parts (all default off): number this part's pages from FOLIO_OFFSET + 1 out of
// FOLIO_TOTAL, and fill contents entries whose data-ref is in TP_MAP (a JSON {ref: page}) from the
// map, so a contents page can list sections that live in the other part.
const FOLIO_OFFSET = Number(process.env.FOLIO_OFFSET ?? 0), FOLIO_TOTAL = Number(process.env.FOLIO_TOTAL ?? 0)
const TP_MAP = process.env.TP_MAP ? JSON.parse(process.env.TP_MAP) : {}

let html = readFileSync(`${SP}/classraum-${DOC}.src.html`, 'utf8')
html = html.replace(/__IMG_([\w-]+)__/g, (_, n) => {
  const f = `${SP}/${IMG_DIR}/${n}.b64`
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

if (BLEED) html = html.replace('</style>', '@page{ size:216mm 303mm; margin:0 } @media print{ .page{ box-sizing:border-box; width:216mm; height:303mm; border:3mm solid transparent; flex:none; } .cover-page{ overflow:visible; } .cover-page .cov-shot{ margin-bottom:-3mm !important; } .cover-page .cov-shot .shot{ padding-bottom:3mm; } }</style>')
if (B5) html = html.replace('</style>', '.micro,.bk-micro{ font-size:8pt; } .lp-add p,.lp-anchor,th{ font-size:7.8pt; }</style>')
const B5_PRINT = `@page{ size:${BLEED ? '188mm 263mm' : '182mm 257mm'}; margin:0 } @media print{ .page{ width:${BLEED ? 'calc(210mm + 6.9230769mm)' : '210mm'}; height:${BLEED ? 'calc(296.5mm + 6.9230769mm + 0.1mm)' : '296.5mm'}; zoom:0.86667; flex:none; ${BLEED ? 'box-sizing:border-box; border:3.46153846mm solid transparent;' : ''} }${BLEED ? ' .cover-page{ overflow:visible; } .cover-page .cov-shot{ margin-bottom:-3.46153846mm !important; } .cover-page .cov-shot .shot{ padding-bottom:3.46153846mm; }' : ''} }`
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
const folio = await p.evaluate(({ OFF, TOTAL, MAP }) => {
  const pages = [...document.querySelectorAll('.page')], pad = n => String(n).padStart(2, '0'), missing = []
  pages.forEach((pg, i) => pg.querySelectorAll('.rh .r').forEach(r => { if (/^\d\d \/ \d\d$/.test(r.textContent.trim())) r.textContent = `${pad(i + 1 + OFF)} / ${pad(TOTAL || pages.length)}` }))
  document.querySelectorAll('.tp[data-ref]').forEach(tp => {
    if (tp.dataset.ref in MAP) { tp.textContent = pad(MAP[tp.dataset.ref]); return }
    const t = document.getElementById(tp.dataset.ref), pg = t && t.closest('.page')
    if (!pg) { missing.push(tp.dataset.ref); return }
    tp.textContent = pad(pages.indexOf(pg) + 1 + OFF)
  })
  // every section id and the page it lands on (after the offset), for a builder that needs it
  const ids = Object.fromEntries([...document.querySelectorAll('.page [id]')].map(el => [el.id, pages.indexOf(el.closest('.page')) + 1 + OFF]))
  return { pages: pages.length, missing, ids }
}, { OFF: FOLIO_OFFSET, TOTAL: FOLIO_TOTAL, MAP: TP_MAP })
if (process.env.REFDUMP) writeFileSync(process.env.REFDUMP, JSON.stringify(folio.ids, null, 1))
if (folio.missing.length) { console.error('contents refs with no target: ' + folio.missing.join(', ')); process.exitCode = 2 }

// OVERFLOW CHECK (same two signals as _render-intro.mjs): a page whose body is taller
// than the page is clipped silently by overflow:hidden.
await p.emulateMediaType('print')
// In a bleed build the cover screenshot deliberately runs into the bottom bleed; allow exactly
// that much overrun on the cover (3mm, in the page's own unzoomed px) and nothing more.
const coverBleedPx = BLEED ? (B5 ? 3.46153846 : 3) * 96 / 25.4 : 0
const report = await p.evaluate((coverBleedPx) => [...document.querySelectorAll('.page')].map((pg, i) => {
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
  const allow = pg.classList.contains('cover-page') ? coverBleedPx : 0
  const over = Math.round(Math.max(maxBottom - bb.bottom, body.scrollHeight - body.clientHeight - allow))
  return { page: i + 1, content: Math.round(used), client: Math.round(bb.height), over, wide, fill: bb.height ? Math.round(100 * used / bb.height) : 0 }
}), coverBleedPx)
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
