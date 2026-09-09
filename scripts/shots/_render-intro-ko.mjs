// Build + render the KOREAN edition of the Classraum introduction (copy of _render-intro.mjs; reads -ko.src, img-ko/, writes -ko outputs).
//
//   node scripts/shots/_render-intro.mjs <scratchpad>
//
// Reads  classraum-introduction-ko.src.html  (authored, with __IMG_name__ tokens)
// Writes classraum-introduction.html      (tokens replaced by data URIs — this
//                                          is the file the Artifact tool publishes)
//        classraum-introduction.pdf
//        _intro-pN.png                     one screen look per page
//
// The screenshots are inlined at build rather than pasted into the source so
// the authored file stays readable and a re-shot image is a re-run, not an edit.
import puppeteer from 'puppeteer'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
const SP = process.argv[2]
let html = readFileSync(SP + '/classraum-introduction-ko.src.html', 'utf8')
html = html.replace(/__IMG_([\w-]+)__/g, (_, name) => {
  const f = `${SP}/img2-ko/${name}.b64`
  if (!existsSync(f)) { console.error(`missing image sidecar: ${name}`); process.exitCode = 2; return '' }
  return 'data:image/jpeg;base64,' + readFileSync(f, 'utf8').replace(/\s+/g, '')
})
// BLEED=1 builds a print-shop variant: 3mm bleed on every side (216x303mm), nothing else changes.
const BLEED = !!process.env.BLEED
if (BLEED) html = html.replace('</style>', '@page{ size:216mm 303mm; margin:0 } @media print{ .page{ box-sizing:content-box; border:3mm solid transparent; } }</style>')
else writeFileSync(SP + '/classraum-introduction-ko.html', html)
// SIZE=b5 exports JIS B5 (182x257mm): the A4 layout scaled by 0.86667, so every page
// keeps its composition and the overflow check above still applies. Only the smallest
// text classes are stepped up so they stay readable after the scale. With BLEED the
// sheet is 188x263 and the transparent border is 3mm AFTER scaling.
// PRINT16=1 builds the saddle-stitch layout: inside front cover, the eleven content
// pages, an FAQ page, a blank inside back cover, back cover = 16 pages. The extra pages
// are authored in <template id="print-pages"> so the 13-page screen build never sees them.
// Folios and the contents page shift by one because the inside front cover is page 2.
const PRINT16 = !!process.env.PRINT16
if (PRINT16) {
  const tm = html.match(/<template id="print-pages">([\s\S]*?)<\/template>/); if (!tm) { console.error('no print-pages template'); process.exit(2) }
  const [ifc, faq, ibc] = tm[1].split(/<!--(?:IFC|FAQ|IBC)-->/).slice(1)
  html = html.replace(tm[0], '')
  html = html.replace(/(<\/section>\n)/, '$1' + ifc)                       // after the front cover
  const back = html.lastIndexOf('<section class="page back-page">'); html = html.slice(0, back) + faq + ibc + html.slice(back)
  html = html.replace(/<span class="r">(\d\d) \/ 13<\/span>/g, (m, n) => `<span class="r">${String(Number(n) + 1).padStart(2, '0')} / 16</span>`)
  html = html.replace(/<span class="tp">(\d\d)<\/span>/g, (m, n) => `<span class="tp">${String(Number(n) + 1).padStart(2, '0')}</span>`)
} else html = html.replace(/<template id="print-pages">[\s\S]*?<\/template>/, '')
const B5 = process.env.SIZE === 'b5'
// The text bumps take part in the overflow check; the zoom does NOT (Chrome's zoom skews
// scrollHeight, so the check would lie). The zoom is added just before the PDF pass.
if (B5) html = html.replace('</style>', '.micro,.bk-micro{ font-size:8pt; } .lp-add p,.lp-anchor,th{ font-size:7.8pt; }</style>')
const B5_PRINT = `@page{ size:${BLEED ? '188mm 263mm' : '182mm 257mm'}; margin:0 } @media print{ .page{ width:210mm; height:296.5mm; zoom:0.86667; ${BLEED ? 'box-sizing:content-box; border:3.4615mm solid transparent;' : ''} } }`
const wrapped = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0">${html}</body></html>`
writeFileSync(SP + '/_intro-ko-wrapped.html', wrapped)

const b = await puppeteer.launch({ headless: 'new' })
const p = await b.newPage()
await p.goto('file://' + SP + '/_intro-ko-wrapped.html', { waitUntil: 'load', timeout: 120000 })
await p.evaluateHandle('document.fonts.ready')
// OVERFLOW CHECK: a page whose body content is taller than the page is clipped
// silently by overflow:hidden. That is a wrong document that looks fine.
await p.emulateMediaType('print')
const report = await p.evaluate(() => [...document.querySelectorAll('.page')].map((pg, i) => {
  const body = pg.querySelector('.body')
  const bb = body.getBoundingClientRect()
  const kids = [...body.children]
  // Measure real box extents, margins included. The previous version summed
  // child heights + the flex gap, which went blind the moment spacing moved
  // from gap into per-role margins: it would have reported a clipped page as ok.
  let maxBottom = -Infinity, used = 0
  for (const el of kids) {
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el)
    const mt = parseFloat(cs.marginTop) || 0, mb = parseFloat(cs.marginBottom) || 0
    maxBottom = Math.max(maxBottom, r.bottom + mb)
    // margin-top:auto resolves to the leftover slack; exclude it from "used"
    const autoTop = (el.getAttribute('style') || '').includes('margin-top:auto')
    used += r.height + (autoTop ? 0 : mt) + mb
  }
  // Two independent overflow signals. scrollHeight > clientHeight is the
  // browser's own verdict and cannot be fooled by margin arithmetic; the
  // extent test is the second opinion. A page is clipped if EITHER fires.
  const over = Math.round(Math.max(maxBottom - bb.bottom, body.scrollHeight - body.clientHeight))
  return { page: i + 1, content: Math.round(used), client: Math.round(bb.height), over,
           fill: Math.round(100 * used / bb.height) }
}))
for (const r of report) console.log(`page ${r.page}: content ${r.content}/${r.client}px  ${r.fill}% full  ${(r.over > 0 || r.fill > 100) ? 'OVERFLOW +' + Math.max(r.over, r.content - r.client) + 'px  <-- CLIPPED' : 'ok'}`)
if (B5) await p.evaluate(css => { const s = document.createElement("style"); s.textContent = css; document.body.appendChild(s) }, B5_PRINT)  // after the document style, so its @page wins
await p.pdf({ path: SP + '/classraum-introduction-ko' + (B5 ? '-b5' : '') + (PRINT16 ? '-print16' : '') + (BLEED ? '-bleed' : '') + '.pdf', format: 'A4', printBackground: true, preferCSSPageSize: true })

// One look per page at 900px wide, screen media (what the artifact viewer shows).
await p.emulateMediaType('screen'); await p.setViewport({ width: 900, height: 1300, deviceScaleFactor: 1 })
const pages = (BLEED || B5) ? [] : await p.$$('.page')
for (let i = 0; i < pages.length; i++) await pages[i].screenshot({ path: `${SP}/_intro-ko-p${i + 1}.png` })
await b.close()
const bad = report.filter(r => r.over > 0 || r.fill > 100).length
const words = html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/data:image[^"']+/g, '').split(/\s+/).filter(Boolean).length
console.log(`\n${pages.length} pages · ~${words} words · html ${(html.length / 1024).toFixed(0)}KB`)
console.log(bad ? `${bad} page(s) CLIPPED — fix before publishing` : 'no page clipped')
process.exitCode = bad ? 2 : 0
