/* Attack verify-act-science-v8. Every mutation is located by PATTERN and
   `once` throws if the pattern is absent, so a rig can never silently fail
   to apply and leave a green that means nothing. The harness runs BOTH
   directions: mutations that must be caught (exit 1), inputs that must be
   refused as the wrong file (exit 2), and benign redraws that must still
   PASS (exit 0). The benign rigs are the load-bearing half - without them
   a verifier that returned 1 unconditionally would score 13/17 here and
   look like a good checker. */
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
const SRC = new URL('./act-science-v8.batch.json', import.meta.url).pathname
const VERIFY = new URL('./verify-act-science-v8.mjs', import.meta.url).pathname
const OUT = mkdtempSync(join(tmpdir(), 'sc8-rig-'))
const base = readFileSync(SRC, 'utf8')
const P1 = i => i.id.includes('-P1-'), P2 = i => i.id.includes('-P2-')
const mapSvg = (b, which, f) => { for (const it of b) if (which(it)) it.graphic.svg = f(it.graphic.svg) }
const once = (s, re, fn) => { const m = re.exec(s); if (!m) throw new Error(`rig target not found: ${re}`); return s.slice(0, m.index) + fn(m) + s.slice(m.index + m[0].length) }

const rigs = {
/* ---- SHOULD FAIL (exit 1) ---- */
  // a y-axis tick LABEL mis-typed by one step: the defect v6's own verifier caught in its first draft
  'fail-axislabel': b => mapSvg(b, P1, s => once(s, /(<text x="32" y="67" font-size="8" text-anchor="end">)3(<\/text>)/, m => `${m[1]}2${m[2]}`)),
  // one curve vertex moved, its marker left where it was
  'fail-vertexmoved': b => mapSvg(b, P1, s => once(s, /(<polyline points="38,64 90,)42/, m => `${m[1]}31`)),
  // one marker nudged off its own vertex
  'fail-markeroff': b => mapSvg(b, P1, s => once(s, /(<circle cx="90" cy=")42(")/, m => `${m[1]}38${m[2]}`)),
  // two end letters transposed: the reconstruction is self-consistent and the KEYS are what catch it
  'fail-legendswap': b => mapSvg(b, P1, s => once(s, /(<text x="250" y="89" font-size="8" font-weight="bold">)P(<\/text><text x="250" y="45" font-size="8" font-weight="bold">)Q(<\/text>)/, m => `${m[1]}Q${m[2]}P${m[3]}`)),
  // an end letter parked between two curve ends: the labelling becomes ambiguous
  'fail-legendambig': b => mapSvg(b, P1, s => once(s, /(<text x="250" y=")45(" font-size="8" font-weight="bold">Q)/, m => `${m[1]}39.5${m[2]}`)),
  // THE v6 DEFECT: filled bars unstroked while open bars keep their 1px stroke
  'fail-strokebias': b => mapSvg(b, P1, s => { const r = /(<rect x="[\d.]+" y="[\d.]+" width="20" height="[\d.]+" fill="#000") stroke="#000" stroke-width="1"/g
    if (!r.test(s)) throw new Error('rig target not found: filled Fig2 bars'); return s.replace(r, '$1') }),
  // Design S's 40 degC bar cut below its 10 degC bar's twin, giving P1-Q2 two legal answers
  'fail-barshrink': b => mapSvg(b, P1, s => once(s, /<rect x="221" y="253" width="20" height="33" fill="#fff"/, () => `<rect x="221" y="209" width="20" height="77" fill="#fff"`)),
  // a bar that no longer stands on the plot floor
  'fail-barfloat': b => mapSvg(b, P2, s => once(s, /(<rect x="42" y="54" width="14" height=")120(")/, m => `${m[1]}112${m[2]}`)),
  // a table value changed so that no pair of rows reverses any more
  'fail-tablecell': b => mapSvg(b, P2, s => once(s, /(text-anchor="middle">)13(<\/text>)/, m => `${m[1]}7${m[2]}`)),
  // a stray number dropped into a table cell
  'fail-tabletext': b => mapSvg(b, P2, s => once(s, /(<text x="205" y="232\.5" font-size="8\.5" text-anchor="middle">9<\/text>)/, m => `${m[1]}<text x="200" y="230" font-size="6" text-anchor="middle">*</text>`)),
  // a bar top parked BETWEEN gridlines: the shape of the v6 defect, where a
  // value could only be got by resolving a gap rather than reading a line
  'fail-offgrid': b => mapSvg(b, P1, s => once(s, /<rect x="43" y="198" width="20" height="88"/, () => '<rect x="43" y="192.5" width="20" height="93.5"')),
  // a point and its marker moved together to a value BETWEEN gridlines. The
  // 0.5 N grid is 11px, so no legal (on-grid) value can be closer than the
  // margin threshold - a thin comparison in this figure IS an off-grid one.
  'fail-thinvalue': b => mapSvg(b, P1, s => once(s, /(<polyline points="38,64 90,)42/, m => `${m[1]}47.5`)
    .replace('<circle cx="90" cy="42"', '<circle cx="90" cy="47.5"')),
  // the data are right and a KEY is wrong
  'fail-key': b => { const it = b.find(i => i.id === 'ACT-SC8-P2-Q4'); it.correct_answer = it.choices[0] },
/* ---- SHOULD EXIT 2 (input identity) ---- */
  'ident-count': b => b.pop(),
  'ident-ids': b => { b[0].id = 'ACT-SC8-P1-Q0' },
  'ident-splitsvg': b => { b.find(i => i.id === 'ACT-SC8-P1-Q3').graphic.svg += ' ' },
/* ---- SHOULD PASS (benign redraw / prose edit) ---- */
  'pass-cosmetic': b => mapSvg(b, () => true, s => s
    .replace(/ width="260" role="img"/, ' role="img"')
    .replace(/aria-label="Figure 1/, 'aria-label="Two panels. Figure 1')
    .replace(/r="2" fill="#000"/g, 'fill="#111" r="2.3"')
    .replace(/stroke-width="1\.1"/g, 'stroke-width="1.25"')
    .replace(/fill="#fff"\/>/, 'fill="#fdfdfd"/>')),
  'pass-regrid': b => mapSvg(b, () => true, s => s.replace(/stroke="#e2e2e2" stroke-width="\.5"/g, 'stroke="#d4d4d4" stroke-width=".6"')),
  'pass-longerminor': b => mapSvg(b, () => true, s => s.replace(/x1="35\.5"/g, 'x1="35"')),   // still under the 3.5px major threshold
  'pass-explan': b => { b[4].explanation += ' ' },
}
const EXPECT = n => n.startsWith('fail-') ? 1 : n.startsWith('ident-') ? 2 : 0
let bad = 0
console.log(`rig harness for verify-act-science-v8 - ${Object.keys(rigs).length} rigs\n`)
console.log('rig                 want  got  verdict       first finding')
for (const name of Object.keys(rigs)) {
  const b = JSON.parse(base); rigs[name](b)
  const p = `${OUT}/rig-${name}.json`
  writeFileSync(p, JSON.stringify(b, null, 2))
  const r = spawnSync(process.execPath, [VERIFY, p], { encoding: 'utf8' })
  const want = EXPECT(name), got = r.status
  const first = (r.stdout + r.stderr).split('\n').find(l => /^(  FAIL|INPUT REFUSED)/.test(l)) ?? ''
  if (got !== want) bad++
  console.log(`${name.padEnd(18)}  ${want}     ${got}    ${got === want ? 'as designed  ' : '*** WRONG ***'} ${first.trim().slice(0, 88)}`)
}
/* The margin gate must be LIVE, not merely present: raise the threshold
   past the batch's own thinnest comparison and the clean file must fail.
   Without this, a gate that silently never fires would look identical. */
const rm = spawnSync(process.execPath, [VERIFY, SRC, '--min-margin', '12'], { encoding: 'utf8' })
const mFirst = (rm.stdout + rm.stderr).split('\n').find(l => /^  FAIL/.test(l)) ?? ''
console.log(`${'(margin gate @12px)'.padEnd(18)}  1     ${rm.status}    ${rm.status === 1 ? 'as designed  ' : '*** WRONG ***'} ${mFirst.trim().slice(0, 88)}`)
if (rm.status !== 1) bad++
const r0 = spawnSync(process.execPath, [VERIFY, SRC], { encoding: 'utf8' })
console.log(`${'(unmutated)'.padEnd(18)}  0     ${r0.status}    ${r0.status === 0 ? 'as designed' : '*** WRONG ***'}`)
if (r0.status !== 0) bad++
console.log(`\nrigs run: ${Object.keys(rigs).length} + the unmutated file, ${bad} not as designed`)
process.exit(bad ? 1 : 0)
