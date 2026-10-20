// Combined Classraum Study + SAT Camps booklet, 16 pages, B5, 3mm bleed (2026-10-20).
//
//   node scripts/shots/_render-combo.mjs "<Introduction PDFs>/sources" "<Introduction PDFs>/Study + Camps" [en|ko]
//
// Page plan (16 = a saddle-stitch multiple of 4, no filler pages):
//    1      NEW cover: combined copy; Study and SAT Camps each shown whole (browser window + phone),
//           one row per product
//    2      NEW "two ways" page: a card per product (who it is for, two sentences, three facts, a
//           screenshot, where it is in the booklet), then the COMBINED contents (Part 1 / Part 2).
//           Replaces the Study overview page.
//    3-7    Study p3-7
//    8      Camps p2 (overview); its contents block becomes a short Part 2 bridge
//    9-15   Camps p3-9
//   16      Camps back-cover layout with merged copy and the Camps fine print
//
// The two sources' stylesheets diverge, so the halves are NOT merged into one HTML file: each is
// rendered by _render-split.mjs with its own CSS (SIZE=b5 BLEED=1), numbered as part of 16
// (FOLIO_OFFSET / FOLIO_TOTAL), and joined with pdfunite. The Camps half renders first so its real
// section pages (REFDUMP) fill the Part 2 column of the contents. Source documents are not modified.
//
// KO: Study from classraum-study-ko.src.html; SAT Camps from classraum-sat-camps-ko.src.html (the EN
// source with the co-founder's 2026-10-16 Korean text, built 2026-10-20). The new pages' Korean copy
// below was written for this booklet and has not been reviewed by the co-founder.
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, readdirSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

const [SP, OUT, LANG = 'en'] = process.argv.slice(2)
if (!SP || !OUT || !['en', 'ko'].includes(LANG)) { console.error('usage: _render-combo.mjs <sources dir> <output dir> [en|ko]'); process.exit(2) }
const die = m => { console.error('REFUSING: ' + m); process.exit(2) }
const read = f => { if (!existsSync(f)) die('missing ' + f); return readFileSync(f, 'utf8') }
mkdirSync(OUT, { recursive: true })

// ---------- copy (EN / KO) ----------
const T = {
  en: {
    studySrc: 'classraum-study-en.src.html', campsSrc: 'classraum-sat-camps-en.src.html', studyImg: 'img2-en',
    out: 'Classraum Study + SAT Camps - EN - B5 - PRINT (16 pages, 3mm bleed).pdf',
    meta: 'Classraum Study + SAT Camps · 2026',
    title: 'Practice Like It’s <b style="white-space:nowrap;font-weight:inherit">Test Day.</b> <span>At Home, or at Your School.</span>',
    lede: 'Classraum Study gives students real-format mock tests for the SAT, ACT, TOEFL, SSAT and ISEE, with every mistake turned into review. Classraum SAT Camps brings the same platform to your school as a complete program, ready to run.',
    rowStudy: ['Classraum Study', 'For students', 'Mock tests taken like the real exam, and every wrong answer turned into review. On the web, iOS and Android.'],
    rowCamps: ['SAT Camps', 'For schools', 'A complete SAT or TOEFL camp at your school: curriculum, mock tests, grading and score analysis, ready to run.'],
    p2meta: 'Classraum Study + SAT Camps · 2026', p2foot: 'Classraum Study + SAT Camps',
    p2title: 'Two Ways to Use Classraum',
    p2lede: 'One platform: students practice on their own, and schools run complete camps.',
    cardStudy: { k: 'Classraum Study · for students', t: 'One App for All Your Test Prep', p: 'Mock tests built like the real exam show where a student stands, and every wrong answer is explained and turned into a flashcard. Start on a computer and pick up on a phone, with one account.', f: [['5', 'tests: SAT, ACT, TOEFL, SSAT, ISEE'], ['₩0', 'to start'], ['3', 'platforms: web, iOS, Android']], go: 'Part 1 · pages 03–07' },
    cardCamps: { k: 'SAT Camps · for schools', t: 'An SAT Camp, Ready to Run', p: 'The school brings an SAT teacher, a room, a schedule and its students. Classraum brings everything else: lesson materials, mock tests, assignments, grading, per-question review and score analysis.', f: [['4', 'steps: teach, practice, analyze, improve'], ['8', 'SAT domains in every result'], ['6', 'program formats']], go: 'Part 2 · pages 08–15' },
    contents: 'Contents', part1: 'Part 1 · Classraum Study', part2: 'Part 2 · SAT Camps for Schools',
    bridge: ['Part 2 · SAT Camps for Schools', 'The same platform, run as a camp at your school. Everything in Part 1 is what your students use during the program; the pages that follow are what the school and the teacher get on top of it.'],
    backMid: `<p class="bk-tag">Practice Like It’s Test Day.<br><span>At Home, or at Your School.</span></p>
      <p class="bk-blurb"><b style="color:#fff">Classraum Study</b>: a study app for the SAT, ACT, TOEFL, SSAT and ISEE, on the web and on iOS and Android with one account.<br><b style="color:#fff">Classraum SAT Camps</b>: a complete SAT or TOEFL camp at your school. The school provides the facility and the teacher; Classraum provides the curriculum, mock tests, grading and analysis.</p>`,
    backSwaps: [
      ['<span>English edition</span>', '<span>English edition · Classraum Study + SAT Camps</span>'],
      ['Prepared from classraum.com/camp and Classraum’s published material.', 'Prepared from classraum.com, classraum.com/camp and Classraum’s published material. Prices, credits and test formats reflect the service as of October 2026.'],
      ['<b>classraum.com/camp</b> · app.classraum.com · support@classraum.com', '<b>app.classraum.com</b> · classraum.com/camp · support@classraum.com'],
    ],
  },
  ko: {
    studySrc: 'classraum-study-ko.src.html', campsSrc: 'classraum-sat-camps-ko.src.html', studyImg: 'img2-ko',
    out: 'Classraum Study + SAT 캠프 소개서 - KO - B5 - PRINT (16 pages, 3mm bleed).pdf',
    meta: 'Classraum Study + SAT 캠프 · 2026',
    title: '모의고사는 실전처럼, <span>집에서도 학교에서도.</span>',
    lede: 'Classraum Study로 학생은 SAT, ACT, TOEFL, SSAT, ISEE 모의고사를 실제 시험처럼 풀고, 틀린 문제는 끝까지 복습합니다. 클래스라움 SAT 캠프는 같은 플랫폼을 학교로 가져가, 바로 운영할 수 있는 완성된 캠프 프로그램을 제공합니다.',
    rowStudy: ['Classraum Study', '학생용', '실제 시험처럼 푸는 모의고사, 틀린 문제는 복습으로. 웹, iOS, Android에서 하나의 계정으로.'],
    rowCamps: ['SAT 캠프', '학교용', '학교에서 운영하는 완성된 SAT·TOEFL 캠프. 커리큘럼, 모의고사, 채점, 성취도 분석까지 모두 준비되어 있습니다.'],
    p2meta: 'Classraum Study + SAT 캠프 · 2026', p2foot: 'Classraum Study + SAT 캠프',
    p2title: '클래스라움을 쓰는 두 가지 방법',
    p2lede: '하나의 플랫폼으로, 학생은 혼자 연습하고 학교는 완성된 캠프를 운영합니다.',
    cardStudy: { k: 'Classraum Study · 학생용', t: '시험 준비를 앱 하나로', p: '실제 시험과 똑같은 모의고사로 지금 실력을 확인하고, 틀린 문제는 해설과 플래시카드로 정리됩니다. 컴퓨터에서 풀던 문제를 휴대폰에서 이어서, 하나의 계정으로.', f: [['5', '시험: SAT, ACT, TOEFL, SSAT, ISEE'], ['₩0', '무료로 시작'], ['3', '플랫폼: 웹, iOS, Android']], go: '1부 · 03–07쪽' },
    cardCamps: { k: 'SAT 캠프 · 학교용', t: '바로 시작하는 SAT 캠프', p: '학교는 SAT 선생님과 강의실, 캠프 일정, 학생만 준비하면 됩니다. 수업 자료, 모의고사, 과제, 채점, 문항별 리뷰, 성취도 분석은 클래스라움이 제공합니다.', f: [['4', '단계: 가르치기 · 연습 · 분석 · 개선'], ['8', 'SAT 영역별 결과 분석'], ['6', '가지 운영 형태']], go: '2부 · 08–15쪽' },
    contents: '목차', part1: '1부 · Classraum Study', part2: '2부 · 학교를 위한 SAT 캠프',
    bridge: ['2부 · 학교를 위한 SAT 캠프', '같은 플랫폼을 학교에서 캠프로 운영합니다. 1부의 내용은 캠프 동안 학생이 쓰는 화면이고, 이어지는 내용은 그 위에 학교와 선생님이 받는 것입니다.'],
    backMid: `<p class="bk-tag">모의고사는 실전처럼,<br><span>집에서도 학교에서도.</span></p>
      <p class="bk-blurb"><b style="color:#fff">Classraum Study</b>: SAT, ACT, TOEFL, SSAT, ISEE 학습 앱. 웹, iOS, Android에서 하나의 계정으로.<br><b style="color:#fff">클래스라움 SAT 캠프</b>: 학교에서 운영하는 완성된 SAT·TOEFL 캠프. 학교는 시설과 선생님을, 나머지는 클래스라움이 제공합니다.</p>`,
    backSwaps: [
      ['<span>한국어판</span>', '<span>한국어판 · Classraum Study + SAT 캠프</span>'],
      ['classraum.com/camp와 클래스라움이 공개한 자료를 바탕으로 작성했습니다.', 'classraum.com, classraum.com/camp와 클래스라움이 공개한 자료를 바탕으로 작성했습니다. 요금과 시험 구성은 2026년 10월 기준입니다.'],
      ['<b>classraum.com/camp</b> · app.classraum.com · support@classraum.com', '<b>app.classraum.com</b> · classraum.com/camp · support@classraum.com'],
    ],
  },
}[LANG]

const study = read(join(SP, T.studySrc))
const camps = read(join(SP, T.campsSrc))
const sections = h => { const at = [...h.matchAll(/<section class="page[^"]*"/g)].map(m => m.index); return at.map((a, i) => [a, i + 1 < at.length ? at[i + 1] : h.indexOf('</main>')]) }
const cut = (h, [a, b]) => h.slice(a, b)
const S = sections(study), C = sections(camps)
if (S.length !== 8) die(`Study has ${S.length} pages, expected 8`)
if (C.length !== 10) die(`SAT Camps has ${C.length} pages, expected 10`)
const once = (h, from, to, what) => { const n = h.split(from).length - 1; if (n !== 1) die(`${what}: expected exactly one match, found ${n}`); return h.replace(from, to) }
const grab = (h, re, what) => (h.match(re) ?? [])[0] ?? die(what + ' not found')

// ---------- shared pieces from the Study source ----------
const LOGO = grab(study, /<span class="logo">[\s\S]*?<\/span>/, 'logo')
const TOC_ICON = grab(study, /<span class="mi"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 17 2 2 4-4"\/>[\s\S]*?<\/svg><\/span>/, 'contents icon')
const p2src = cut(study, S[1])
const SB = (p2src.match(/<div class="dev-phone">(<svg[\s\S]*?<\/svg>)/) ?? [])[1] ?? die('phone status bar')
const RH = grab(p2src, /<div class="rh">[\s\S]*?<\/div>/, 'Study running head')
const RF = grab(p2src, /<div class="rf">[\s\S]*?<\/div>/, 'Study running foot')
const phone = img => `<div class="dev-phone">${SB}<img src="__IMG_${img}__" alt=""></div>`

// ---------- page 1: the new cover ----------
// One composition, nothing cropped: the Camps dashboard in a browser window, the Study app on a phone
// in front of its lower-left corner, a one-line caption for each. No boxes; the headline carries it.
const COVER = `<section class="page cover-page combo-cover">
  <div class="body">
    <div class="cov-top">${LOGO}<span class="cov-meta">${T.meta}</span></div>
    <div class="cov-body">
      <h1 class="cov-title">${T.title}</h1>
      <p class="cov-lede">${T.lede}</p>
    </div>
    <div class="cv-stage">
      <figure class="cv-phone"><figcaption><b>${T.rowStudy[0]}</b>${T.rowStudy[1]}</figcaption>${phone('pp-tests')}</figure>
      <figure class="cv-win"><figcaption><b>${T.rowCamps[0]}</b>${T.rowCamps[1]}</figcaption><div class="shot win"><img src="__IMG_camp-dashboard__" alt=""></div></figure>
    </div>
  </div>
</section>
`
const COVER_CSS = `
  /* combined booklet cover (2026-10-20, simplified): one composition, captions only */
  .combo-cover{ padding-bottom:16mm !important; }
  .combo-cover .cov-body{ margin-top:var(--s5); }
  .combo-cover .cov-title{ font-size:42pt; max-width:16ch; }
  .combo-cover .cov-lede{ font-size:11.2pt; max-width:58ch; margin-top:var(--s3); }
  .combo-cover .cv-stage{ margin-top:auto; display:grid; grid-template-columns:44mm 1fr; align-items:end; }
  .combo-cover .cv-stage figure{ margin:0; display:flex; flex-direction:column; gap:3mm; }
  .combo-cover .cv-phone{ position:relative; z-index:2; margin-right:-16mm; }
  .combo-cover .cv-phone .dev-phone{ width:40mm; box-shadow:0 0 0 1px #45484E, 0 14px 30px rgba(0,0,0,.45); }
  .combo-cover .cv-win figcaption{ align-self:flex-end; text-align:right; }
  .combo-cover .cv-stage figcaption{ display:flex; flex-direction:column; gap:.8mm; font-size:8.4pt; letter-spacing:.06em; text-transform:uppercase; color:#6AA6FF; font-weight:700; }
  .combo-cover .cv-stage figcaption b{ font-family:var(--display); font-size:12pt; letter-spacing:0; text-transform:none; color:#fff; font-weight:800; }
  .combo-cover .cv-win .shot.win{ border:0; border-radius:6px; overflow:hidden; box-shadow:0 12px 30px rgba(0,0,0,.4); }
  .combo-cover .cv-win .shot.win img{ display:block; width:100%; height:auto; }
  .combo-cover .cv-phone figcaption{ margin-bottom:1mm; }
`

// ---------- page 2: two ways + combined contents ----------
// each column: label, title, one browser window (both the same size), page range. No paragraph, no numbers.
const card = (c, pic) => `<div class="cc"><p class="cc-k">${c.k}</p><h2 class="cc-t">${c.t}</h2><div class="cc-g">${pic}</div><p class="cc-go">${c.go}</p></div>`
// one browser window per column, full column width, so more of each screen shows
const PIC_STUDY = `<div class="shot win"><img src="__IMG_stats__" alt=""></div>`
const PIC_CAMPS = `<div class="shot win"><img src="__IMG_classrooms__" alt=""></div>`
const tocEntries = (src, range) => [...cut(src, range).matchAll(/<div class="te"><span class="tn">(\d\d)<\/span><span class="tt">([^<]+)<span class="td">[^<]*<\/span><\/span><span class="tl"><\/span><span class="tp" data-ref="(s-\d\d)">00<\/span><\/div>/g)].map(m => ({ n: m[1], t: m[2].trim(), ref: m[3] }))
const studyEntries = tocEntries(study, S[1]), campEntries = tocEntries(camps, C[1])
if (studyEntries.length !== 5) die(`Study contents: ${studyEntries.length} chapters, expected 5`)
if (campEntries.length !== 7) die(`SAT Camps contents: ${campEntries.length} chapters, expected 7`)
const te = (e, ref) => `<div class="te"><span class="tn">${e.n}</span><span class="tt">${e.t}</span><span class="tl"></span><span class="tp" data-ref="${ref}">00</span></div>`
const P2 = `<section class="page combo-two">
  ${RH.replace(/<span class="r">[^<]*<\/span>/, `<span class="r">${T.p2meta}</span>`)}
  <div class="body">
    <div class="cc-head"><h1 class="h-title">${T.p2title}</h1><p class="lede">${T.p2lede}</p></div>
    <div class="cc-grid">${card(T.cardStudy, PIC_STUDY)}${card(T.cardCamps, PIC_CAMPS)}</div>
    <div class="cc-toc"><div class="eyebrow">${TOC_ICON}${T.contents}</div>
      <div class="toc toc2 combo-toc"><div class="tcol"><div class="tpart">${T.part1}</div>${studyEntries.map(e => te(e, e.ref)).join('')}</div><div class="tcol"><div class="tpart">${T.part2}</div>${campEntries.map(e => te(e, 'camp-' + e.ref)).join('')}</div></div></div>
  </div>
  ${RF.replace(/· [^<]*<\/span>/, `· ${T.p2foot}</span>`)}
</section>
`
const P2_CSS = `
  /* combined booklet page 2 (2026-10-20, simplified): two open columns, no boxes or screenshots, then the contents */
  .combo-two .body{ display:flex; flex-direction:column; gap:var(--s4); }
  .combo-two .cc-toc{ margin-top:9mm; }   /* more air between the two columns and the contents */
  .combo-two .cc-head .lede{ margin-top:var(--s2); max-width:none; }
  .combo-two .cc-grid{ display:grid; grid-template-columns:1fr 1fr; gap:0; border-top:1px solid var(--line); border-bottom:1px solid var(--line); }
  .combo-two .cc{ display:flex; flex-direction:column; padding:6mm 7mm 6mm 0; }
  .combo-two .cc + .cc{ padding:6mm 0 6mm 7mm; border-left:1px solid var(--line); }
  .combo-two .cc-k{ margin:0; font-size:8pt; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--blue); }
  .combo-two .cc-t{ margin:2mm 0 0; font-family:var(--display); font-weight:800; font-size:14pt; line-height:1.15; color:var(--ink); word-break:keep-all; }
  .combo-two .cc-g{ margin-top:4.5mm; }
  .combo-two .cc-g .shot.win{ border:1px solid var(--line-2); border-radius:6px; overflow:hidden; box-shadow:0 6px 16px rgba(15,23,42,.10); }
  /* both windows the same size: one 2:1 screen area, each screenshot anchored top-left (Study loses ~5% at the
     bottom, Classrooms ~9% at the right) */
  .combo-two .cc-g .shot.win img{ display:block; width:100%; aspect-ratio:2 / 1; object-fit:cover; object-position:left top; }
  .combo-two .cc-go{ margin:0; padding-top:4mm; font-size:8.2pt; font-weight:600; color:var(--blue); }
  .combo-toc .tpart{ font-size:8.4pt; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--blue); padding-bottom:1.6mm; margin-bottom:1.2mm; border-bottom:1px solid var(--line); }
`

// ---------- page 8: the Part 2 bridge (Camps overview page) ----------
const BRIDGE = `<div class="combo-bridge"><div class="eyebrow">${TOC_ICON}${T.bridge[0]}</div><p>${T.bridge[1]}</p></div>`
const BRIDGE_CSS = `
  .combo-bridge p{ margin:var(--s2) 0 0; font-size:10.4pt; line-height:1.5; color:var(--ink-2); max-width:62ch; word-break:keep-all; }
`

// ---------- part 1: cover + two-ways page + Study p3-7 ----------
let p1 = study.slice(0, S[0][0]) + COVER + P2 + S.slice(2, 7).map(r => cut(study, r)).join('') + study.slice(S[7][1])   // drops Study p2 and the back cover
p1 = p1.replace(/<template id="print-pages">[\s\S]*?<\/template>/, '')
p1 = once(p1, '</style>', COVER_CSS + P2_CSS + '</style>', 'Study stylesheet end')

// ---------- part 2: Camps p2-9 + merged back ----------
let p2 = camps.slice(0, C[0][0]) + C.slice(1).map(r => cut(camps, r)).join('') + camps.slice(C[9][1])
const campToc = grab(cut(camps, C[1]), /<div class="eyebrow"><span class="mi"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 17 2 2 4-4"\/>[\s\S]*?<\/svg><\/span>[^<]+<\/div>\s*<div class="toc toc2">[\s\S]*?<\/div><\/div><\/div>/, 'Camps contents block')
p2 = once(p2, campToc, BRIDGE, 'Camps contents block')
const back = cut(camps, C[9])
p2 = once(p2, grab(back, /<div class="bk-mid">[\s\S]*?<\/div>/, 'Camps back-cover copy'), `<div class="bk-mid">\n      ${T.backMid}\n    </div>`, 'Camps back-cover copy')
for (const [a, b] of T.backSwaps ?? []) p2 = once(p2, a, b, 'back-cover: ' + a.slice(0, 40))
p2 = once(p2, '</style>', BRIDGE_CSS + '</style>', 'Camps stylesheet end')

// ---------- image sidecars for part 1: Study's own plus three Camps screenshots ----------
const IMG = join(SP, `img2-combo-${LANG}`); rmSync(IMG, { recursive: true, force: true }); mkdirSync(IMG)
for (const f of readdirSync(join(SP, T.studyImg))) copyFileSync(join(SP, T.studyImg, f), join(IMG, f))
for (const n of ['camp-dashboard', 'classrooms', 'ph-assignments', 'answer-review']) copyFileSync(join(SP, 'img2-camps-en', n + '.b64'), join(IMG, n + '.b64'))

writeFileSync(join(SP, `classraum-combo-study-${LANG}.src.html`), p1)
writeFileSync(join(SP, `classraum-combo-camps-${LANG}.src.html`), p2)

// ---------- render: Camps first (its section pages fill the contents), then Study ----------
const RS = new URL('./_render-split.mjs', import.meta.url).pathname
const run = (doc, env) => execFileSync('node', [RS, SP, doc, OUT], { stdio: 'inherit', env: { ...process.env, SIZE: 'b5', BLEED: '1', FOLIO_TOTAL: '16', ...env } })
const refs = join(SP, `_combo-camps-refs-${LANG}.json`)
run(`combo-camps-${LANG}`, { FOLIO_OFFSET: '7', REFDUMP: refs })
const ids = JSON.parse(read(refs))
const map = Object.fromEntries(campEntries.map(e => { if (!(e.ref in ids)) die(`Camps section ${e.ref} has no page`); return ['camp-' + e.ref, ids[e.ref]] }))
run(`combo-study-${LANG}`, { FOLIO_OFFSET: '0', TP_MAP: JSON.stringify(map) })

const tag = LANG.toUpperCase()
const part1 = join(OUT, `_combo-part1-study-${tag} - B5 - 3mm bleed.pdf`), part2 = join(OUT, `_combo-part2-camps-${tag} - B5 - 3mm bleed.pdf`)
const final = join(OUT, T.out)
execFileSync('pdfunite', [part1, part2, final])
rmSync(part1); rmSync(part2)
const pages = Number(execFileSync('pdfinfo', [final]).toString().match(/Pages:\s+(\d+)/)?.[1] ?? 0)
console.log(`\n${final}\npages ${pages}; Part 2 contents pages ${JSON.stringify(map)}`)
if (pages !== 16) die(`booklet is ${pages} pages, expected 16`)
