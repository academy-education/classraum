// Combined Classraum Study + SAT Camps booklet (EN), 16 pages, B5, 3mm bleed (2026-10-20).
//
//   node scripts/shots/_render-combo.mjs "<Introduction PDFs>/sources" "<Introduction PDFs>/Study + Camps"
//
// Page plan (16 = a saddle-stitch multiple of 4, no filler pages):
//    1      NEW cover: combined copy, Study and Camp screenshots side by side
//    2      Study p2 (overview) with a COMBINED contents: Part 1 Study, Part 2 SAT Camps
//    3-7    Study p3-7
//    8      Camps p2 (overview); its contents block becomes a short Part 2 bridge
//    9-15   Camps p3-9
//   16      Camps back-cover layout with merged copy and the Camps fine print
//
// The two sources' stylesheets diverge, so the halves are NOT merged into one HTML file:
// each is rendered by _render-split.mjs with its own CSS (SIZE=b5 BLEED=1), numbered as part
// of 16 (FOLIO_OFFSET / FOLIO_TOTAL), and the two PDFs are joined with pdfunite. The Camps half
// renders first so its real section pages (REFDUMP) fill the Part 2 column of the contents.
// The source documents are not modified; the two part sources are written next to them.
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, readdirSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

const [SP, OUT] = process.argv.slice(2)
if (!SP || !OUT) { console.error('usage: _render-combo.mjs <sources dir> <output dir>'); process.exit(2) }
const die = m => { console.error('REFUSING: ' + m); process.exit(2) }
const read = f => { if (!existsSync(f)) die('missing ' + f); return readFileSync(f, 'utf8') }
mkdirSync(OUT, { recursive: true })

const study = read(join(SP, 'classraum-study-en.src.html'))
const camps = read(join(SP, 'classraum-sat-camps-en.src.html'))
const sections = h => { const at = [...h.matchAll(/<section class="page[^"]*"/g)].map(m => m.index); return at.map((a, i) => [a, i + 1 < at.length ? at[i + 1] : h.indexOf('</main>')]) }
const cut = (h, [a, b]) => h.slice(a, b)
const S = sections(study), C = sections(camps)
if (S.length !== 8) die(`Study has ${S.length} pages, expected 8`)
if (C.length !== 10) die(`SAT Camps has ${C.length} pages, expected 10`)
const once = (h, from, to, what) => { const n = h.split(from).length - 1; if (n !== 1) die(`${what}: expected exactly one match, found ${n}`); return h.replace(from, to) }

// ---------- shared pieces ----------
const LOGO = (study.match(/<span class="logo">[\s\S]*?<\/span>/) ?? [])[0] ?? die('logo not found')
const TOC_ICON = (study.match(/<span class="mi"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 17 2 2 4-4"\/>[\s\S]*?<\/svg><\/span>/) ?? [])[0] ?? die('contents icon not found')

// ---------- page 1: the new cover ----------
const COVER = `<section class="page cover-page combo-cover">
  <div class="body">
    <div class="cov-top">${LOGO}<span class="cov-meta">Classraum Study + SAT Camps · 2026</span></div>
    <div class="cov-body">
      <h1 class="cov-title">Practice Like It’s <b style="white-space:nowrap;font-weight:inherit">Test Day.</b> <span>At Home, or at Your School.</span></h1>
      <p class="cov-lede">Classraum Study gives students real-format mock tests for the SAT, ACT, TOEFL, SSAT and ISEE, with every mistake turned into review. Classraum SAT Camps brings the same platform to your school as a complete program, ready to run.</p>
    </div>
    <div class="cov-split">
      <figure><div class="shot"><img src="__IMG_home__" alt="Classraum Study home on a desktop: today's study goal and the test-prep grid"></div><figcaption><b>Classraum Study</b> · for students</figcaption></figure>
      <figure><div class="shot"><img src="__IMG_camp-dashboard__" alt="The SAT camp dashboard: enrolment, completion, average score and skills to review"></div><figcaption><b>SAT Camps</b> · for schools</figcaption></figure>
    </div>
  </div>
</section>
`
const COVER_CSS = `
  /* combined booklet cover (2026-10-20): Study and Camp as two full-bleed halves, running off the
     side edges and into the bottom bleed, with a hairline between them */
  .combo-cover .cov-title{ font-size:44pt; max-width:16ch; }
  .combo-cover .cov-lede{ max-width:56ch; }
  .combo-cover .cov-split{ margin:auto -17mm 0; display:grid; grid-template-columns:1fr 1fr; gap:0; align-items:end; }
  .combo-cover .cov-split figure{ margin:0; display:flex; flex-direction:column; gap:2.6mm; min-width:0; }
  .combo-cover .cov-split figure + figure{ border-left:1px solid rgba(255,255,255,.22); }
  .combo-cover .cov-split .shot{ border:0; border-radius:0; overflow:hidden; aspect-ratio:3 / 3.55; background:#fff; }
  .combo-cover .cov-split .shot img{ width:100%; height:100%; object-fit:cover; object-position:left top; display:block; }
  .combo-cover .cov-split figcaption{ order:-1; font-size:9.4pt; color:#9FB3D1; letter-spacing:.02em; padding:0 6mm 0 17mm; }
  .combo-cover .cov-split figure + figure figcaption{ padding-left:6mm; }
  .combo-cover .cov-split figcaption b{ color:#fff; font-weight:700; }
  @media print{ .combo-cover .cov-split{ margin:auto -20.46153846mm -3.46153846mm; } .combo-cover .cov-split figcaption{ padding-left:20.46mm; } .combo-cover .cov-split figure + figure figcaption{ padding-left:6mm; } }
`

// ---------- page 2: the combined contents (Study overview page) ----------
const studyEntries = [...cut(study, S[1]).matchAll(/<div class="te"><span class="tn">(\d\d)<\/span><span class="tt">([^<]+)<span class="td">[^<]*<\/span><\/span><span class="tl"><\/span><span class="tp" data-ref="(s-\d\d)">00<\/span><\/div>/g)].map(m => ({ n: m[1], t: m[2], ref: m[3] }))
const campEntries = [...cut(camps, C[1]).matchAll(/<div class="te"><span class="tn">(\d\d)<\/span><span class="tt">([^<]+)<span class="td">[^<]*<\/span><\/span><span class="tl"><\/span><span class="tp" data-ref="(s-\d\d)">00<\/span><\/div>/g)].map(m => ({ n: m[1], t: m[2], ref: m[3] }))
if (studyEntries.length !== 5) die(`Study contents: ${studyEntries.length} chapters, expected 5`)
if (campEntries.length !== 7) die(`SAT Camps contents: ${campEntries.length} chapters, expected 7`)
const te = (e, ref) => `<div class="te"><span class="tn">${e.n}</span><span class="tt">${e.t}</span><span class="tl"></span><span class="tp" data-ref="${ref}">00</span></div>`
const COMBINED_TOC = `<div class="toc toc2 combo-toc"><div class="tcol"><div class="tpart">Part 1 · Classraum Study</div>${studyEntries.map(e => te(e, e.ref)).join('')}</div><div class="tcol"><div class="tpart">Part 2 · SAT Camps for Schools</div>${campEntries.map(e => te(e, 'camp-' + e.ref)).join('')}</div></div>`
const TOC_CSS = `
  .combo-toc .tpart{ font-size:8.4pt; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--blue); padding-bottom:1.6mm; margin-bottom:1.2mm; border-bottom:1px solid var(--line); }
`

// ---------- page 8: the Part 2 bridge (Camps overview page) ----------
const BRIDGE = `<div class="combo-bridge"><div class="eyebrow">${TOC_ICON}Part 2 · SAT Camps for Schools</div><p>The same platform, run as a camp at your school. Everything in Part 1 is what your students use during the program; the pages that follow are what the school and the teacher get on top of it.</p></div>`
const BRIDGE_CSS = `
  .combo-bridge p{ margin:var(--s2) 0 0; font-size:10.4pt; line-height:1.5; color:var(--ink-2); max-width:62ch; }
`

// ---------- page 16: the merged back cover (Camps layout and fine print) ----------
const BACK_MID = `<div class="bk-mid">
      <p class="bk-tag">Practice Like It’s Test Day.<br><span>At Home, or at Your School.</span></p>
      <p class="bk-blurb"><b style="color:#fff">Classraum Study</b>: a study app for the SAT, ACT, TOEFL, SSAT and ISEE, on the web and on iOS and Android with one account.<br><b style="color:#fff">Classraum SAT Camps</b>: a complete SAT or TOEFL camp at your school. The school provides the facility and the teacher; Classraum provides the curriculum, mock tests, grading and analysis.</p>
    </div>`

// ---------- part 1: cover + Study p2-7 ----------
let p1 = study.slice(0, S[0][0]) + COVER + S.slice(1, 7).map(r => cut(study, r)).join('') + study.slice(S[7][1])   // drops the Study back cover
const p1toc = (cut(study, S[1]).match(/<div class="toc toc2">[\s\S]*?<\/div><\/div><\/div>/) ?? [])[0] ?? die('Study contents block not found')
p1 = once(p1, p1toc, COMBINED_TOC, 'Study contents block')
p1 = p1.replace(/<template id="print-pages">[\s\S]*?<\/template>/, '')
p1 = once(p1, '</style>', COVER_CSS + TOC_CSS + '</style>', 'Study stylesheet end')

// ---------- part 2: Camps p2-9 + merged back ----------
let p2 = camps.slice(0, C[0][0]) + C.slice(1).map(r => cut(camps, r)).join('') + camps.slice(C[9][1])
const p2page = cut(camps, C[1])
const campToc = (p2page.match(/<div class="eyebrow"><span class="mi"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 17 2 2 4-4"\/>[\s\S]*?<\/svg><\/span>Contents<\/div>\s*<div class="toc toc2">[\s\S]*?<\/div><\/div><\/div>/) ?? [])[0] ?? die('Camps contents block not found')
p2 = once(p2, campToc, BRIDGE, 'Camps contents block')
const campBackMid = (cut(camps, C[9]).match(/<div class="bk-mid">[\s\S]*?<\/div>/) ?? [])[0] ?? die('Camps back-cover copy not found')
p2 = once(p2, campBackMid, BACK_MID, 'Camps back-cover copy')
p2 = once(p2, '<span>English edition</span>', '<span>English edition · Classraum Study + SAT Camps</span>', 'back-cover edition line')
p2 = once(p2, 'Prepared from classraum.com/camp and Classraum’s published material.', 'Prepared from classraum.com, classraum.com/camp and Classraum’s published material. Prices, credits and test formats reflect the service as of October 2026.', 'back-cover fine print')
p2 = once(p2, '<b>classraum.com/camp</b> · app.classraum.com · support@classraum.com', '<b>app.classraum.com</b> · classraum.com/camp · support@classraum.com', 'back-cover links')
p2 = once(p2, '</style>', BRIDGE_CSS + '</style>', 'Camps stylesheet end')

// ---------- image sidecars for part 1: Study's own plus the camp dashboard ----------
const IMG = join(SP, 'img2-combo-en'); rmSync(IMG, { recursive: true, force: true }); mkdirSync(IMG)
for (const f of readdirSync(join(SP, 'img2-en'))) copyFileSync(join(SP, 'img2-en', f), join(IMG, f))
copyFileSync(join(SP, 'img2-camps-en', 'camp-dashboard.b64'), join(IMG, 'camp-dashboard.b64'))

writeFileSync(join(SP, 'classraum-combo-study-en.src.html'), p1)
writeFileSync(join(SP, 'classraum-combo-camps-en.src.html'), p2)

// ---------- render: Camps first (its section pages fill the contents), then Study ----------
const RS = new URL('./_render-split.mjs', import.meta.url).pathname
const run = (doc, env) => execFileSync('node', [RS, SP, doc, OUT], { stdio: 'inherit', env: { ...process.env, SIZE: 'b5', BLEED: '1', FOLIO_TOTAL: '16', ...env } })
const refs = join(SP, '_combo-camps-refs.json')
run('combo-camps-en', { FOLIO_OFFSET: '7', REFDUMP: refs })
const ids = JSON.parse(read(refs))
const map = Object.fromEntries(campEntries.map(e => { if (!(e.ref in ids)) die(`Camps section ${e.ref} has no page`); return ['camp-' + e.ref, ids[e.ref]] }))
run('combo-study-en', { FOLIO_OFFSET: '0', TP_MAP: JSON.stringify(map) })

const part1 = join(OUT, '_combo-part1-study-EN - B5 - 3mm bleed.pdf'), part2 = join(OUT, '_combo-part2-camps-EN - B5 - 3mm bleed.pdf')
const final = join(OUT, 'Classraum Study + SAT Camps - EN - B5 - PRINT (16 pages, 3mm bleed).pdf')
execFileSync('pdfunite', [part1, part2, final])
rmSync(part1); rmSync(part2)
const pages = Number(execFileSync('pdfinfo', [final]).toString().match(/Pages:\s+(\d+)/)?.[1] ?? 0)
console.log(`\n${final}\npages ${pages}; Part 2 contents pages ${JSON.stringify(map)}`)
if (pages !== 16) die(`booklet is ${pages} pages, expected 16`)
