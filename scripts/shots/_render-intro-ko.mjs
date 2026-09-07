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
await p.pdf({ path: SP + '/classraum-introduction-ko' + (BLEED ? '-bleed' : '') + '.pdf', format: 'A4', printBackground: true, preferCSSPageSize: true })

// One look per page at 900px wide, screen media (what the artifact viewer shows).
await p.emulateMediaType('screen'); await p.setViewport({ width: 900, height: 1300, deviceScaleFactor: 1 })
const pages = BLEED ? [] : await p.$$('.page')
for (let i = 0; i < pages.length; i++) await pages[i].screenshot({ path: `${SP}/_intro-ko-p${i + 1}.png` })
await b.close()
const bad = report.filter(r => r.over > 0 || r.fill > 100).length
const words = html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/data:image[^"']+/g, '').split(/\s+/).filter(Boolean).length
console.log(`\n${pages.length} pages · ~${words} words · html ${(html.length / 1024).toFixed(0)}KB`)
console.log(bad ? `${bad} page(s) CLIPPED — fix before publishing` : 'no page clipped')
process.exitCode = bad ? 2 : 0
