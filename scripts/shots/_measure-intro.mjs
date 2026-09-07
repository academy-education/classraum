import puppeteer from 'puppeteer'
const SP = process.argv[2]
const b = await puppeteer.launch({ headless: 'new' }); const p = await b.newPage()
await p.goto('file://' + SP + '/_intro-wrapped.html', { waitUntil: 'networkidle0' })
await p.evaluateHandle('document.fonts.ready'); await p.emulateMediaType('print')
const out = await p.evaluate(() => {
  const pages = [...document.querySelectorAll('.page')]
  const room = pg => pg.querySelector('.body').clientHeight
  const h = el => el ? el.getBoundingClientRect().height : 0
  const kids = pg => [...pg.querySelector('.body').children].map(el => ({
    tag: el.className.split(' ')[0] || el.tagName.toLowerCase(),
    hint: (el.querySelector('.h1,.h3,.eyebrow')?.textContent || el.textContent).trim().slice(0, 34),
    h: Math.round(h(el)) }))
  return { p2: { room: room(pages[1]), kids: kids(pages[1]) }, p3: { room: room(pages[2]), kids: kids(pages[2]) },
           p4: { room: room(pages[3]), kids: kids(pages[3]) }, gap: parseFloat(getComputedStyle(pages[2].querySelector('.body')).rowGap) }
})
await b.close()
for (const k of ['p2','p3','p4']) {
  const s = out[k]; const sum = s.kids.reduce((a, x) => a + x.h, 0) + out.gap * (s.kids.length - 1)
  console.log(`\n${k}  room=${s.room}px  content=${Math.round(sum)}px  (gap ${out.gap}px x ${s.kids.length - 1})`)
  for (const x of s.kids) console.log(`   ${String(x.h).padStart(4)}px  ${x.tag.padEnd(9)} ${x.hint}`)
}
