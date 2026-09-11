/* Attack the verifier. Every mutation is located by PATTERN, not by a
   pixel literal, so the rigs survive a redraw of the figure. */
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
const SRC = new URL('./act-science-v7.batch.json', import.meta.url).pathname
const VERIFY = new URL('./verify-act-science-v7.mjs', import.meta.url).pathname
const OUT = mkdtempSync(join(tmpdir(), 'sc7-rig-'))
const base = readFileSync(SRC, 'utf8')
const mapSvg = (b, f) => { for (const it of b) if (it.graphic) it.graphic.svg = f(it.graphic.svg) }
const once = (s, re, fn) => { const m = re.exec(s); if (!m) throw new Error(`rig target not found: ${re}`); return s.slice(0, m.index) + fn(m) + s.slice(m.index + m[0].length) }

const rigs = {
/* ---- SHOULD FAIL ---- */
  // one y-axis tick LABEL mis-typed by one step: the v6 defect
  'fail-axislabel': b => mapSvg(b, s => once(s, /(<text x="38" y="[\d.]+" font-size="8" text-anchor="end">)0\.8(<\/text>)/, m => `${m[1]}1.0${m[2]}`)),
  // one curve vertex moved, marker left where it was
  'fail-vertexmoved': b => mapSvg(b, s => once(s, /(<polyline stroke-dasharray="7,2,2,2" points="[^"]*?329,)([\d.]+)(")/, m => `${m[1]}${(Number(m[2]) - 30).toFixed(2)}${m[3]}`)),
  // legend letters W and X transposed
  'fail-legendswap': b => mapSvg(b, s => once(s, /(<text x="333" y="[\d.]+" font-size="8" font-weight="bold">)W(<\/text><text x="333" y="[\d.]+" font-size="8" font-weight="bold">)X(<\/text>)/, m => `${m[1]}X${m[2]}W${m[3]}`)),
  // Blend X's 8 mm bar cut from 0.90 to 0.40 mm. Until the blueprint trim
  // of 2026-09-11 this flipped ACT-SC7-P2-Q4 from 2 to 3; Q4 was the item
  // dropped to bring the passage to five, so the rig is kept and RE-AIMED:
  // the shrunken bar puts Blend X under its own 4 mm value as well, and Q5
  // then has two legal answers. Same mutation, different item catches it.
  'fail-barshrink': b => mapSvg(b, s => { const bars = [...s.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="24" height="([\d.]+)" fill="#fff"[^>]*>/g)]
    const t = bars[1]; const bot = Number(t[2]) + Number(t[3]); const h = Number(t[3]) - 22.5
    return s.replace(t[0], `<rect x="${t[1]}" y="${(bot - h).toFixed(2)}" width="24" height="${h.toFixed(2)}" fill="#fff" stroke="#000" stroke-width="1"/>`) }),
  // one marker nudged 4px off its own vertex
  'fail-markeroff': b => mapSvg(b, s => once(s, /(<circle cx="329" cy=")([\d.]+)(")/, m => `${m[1]}${(Number(m[2]) - 4).toFixed(2)}${m[3]}`)),
  // a bar that no longer stands on the plot floor
  'fail-barfloat': b => mapSvg(b, s => { const m = /<rect x="([\d.]+)" y="([\d.]+)" width="24" height="([\d.]+)" fill="#000"\/>/.exec(s)
    return s.replace(m[0], `<rect x="${m[1]}" y="${m[2]}" width="24" height="${(Number(m[3]) - 8).toFixed(2)}" fill="#000"/>`) }),
  // the data are right and a KEY is wrong
  'fail-key': b => { const it = b.find(i => i.id === 'ACT-SC7-P2-Q2'); it.correct_answer = it.choices[3] },
/* ---- SHOULD EXIT 2 (input identity) ---- */
  'ident-count': b => b.pop(),
  'ident-ids': b => { b[0].id = 'ACT-SC7-P1-Q0' },
  'ident-splitsvg': b => { b.find(i => i.id === 'ACT-SC7-P2-Q3').graphic.svg += ' ' },
/* ---- SHOULD PASS (benign redraw) ---- */
  'pass-cosmetic': b => mapSvg(b, s => s
    .replace('width="340" role="img"', 'role="img" width="300"')
    .replace('aria-label="Figure 1', 'aria-label="Two charts. Figure 1')
    .replace(/r="2" fill="#000"/g, 'fill="#111" r="2.4"')
    .replace(/stroke-width="1\.1"/g, 'stroke-width="1.3"')
    .replace(/height="320" fill="#fff"/, 'height="320" fill="#fdfdfd"')),
  'pass-regrid': b => mapSvg(b, s => s.replace(/stroke="#e6e6e6" stroke-width="\.5"/g, 'stroke="#cfcfcf" stroke-width=".7"')),
  'pass-explan': b => { b[3].explanation += ' ' },   // prose edit, no data touched
}
/* A harness where everything fails proves nothing, so it runs BOTH
   directions: seven mutations that must be caught (exit 1), three that must
   be refused as the wrong input (exit 2), and three benign redraws/edits
   that must still PASS (exit 0). The benign ones are the load-bearing half:
   without them a verifier that returned 1 unconditionally would score
   10/13 here and look like a good checker. */
const EXPECT = n => n.startsWith('fail-') ? 1 : n.startsWith('ident-') ? 2 : 0
let bad = 0
console.log(`rig harness for verify-act-science-v7 — ${Object.keys(rigs).length} rigs\n`)
console.log('rig                 want  got  verdict   first finding')
for (const name of Object.keys(rigs)) {
  const b = JSON.parse(base); rigs[name](b)
  const p = `${OUT}/rig-${name}.json`
  writeFileSync(p, JSON.stringify(b, null, 2))
  const r = spawnSync(process.execPath, [VERIFY, p], { encoding: 'utf8' })
  const want = EXPECT(name), got = r.status
  const first = (r.stdout + r.stderr).split('\n').find(l => /^(  FAIL|INPUT REFUSED)/.test(l)) ?? ''
  if (got !== want) bad++
  console.log(`${name.padEnd(18)}  ${want}     ${got}    ${got === want ? 'as designed' : '*** WRONG ***'}   ${first.trim().slice(0, 80)}`)
}
// and the unmutated file must pass
const r0 = spawnSync(process.execPath, [VERIFY, SRC], { encoding: 'utf8' })
console.log(`${'(unmutated)'.padEnd(18)}  0     ${r0.status}    ${r0.status === 0 ? 'as designed' : '*** WRONG ***'}`)
if (r0.status !== 0) bad++
console.log(`\nrigs run: ${Object.keys(rigs).length} + the unmutated file, ${bad} not as designed`)
process.exit(bad ? 1 : 0)
