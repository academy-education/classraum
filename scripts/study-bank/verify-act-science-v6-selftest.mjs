#!/usr/bin/env node
/**
 * verify-act-science-v6-selftest.mjs — attack verify-act-science-v6.mjs.
 *
 * A passing check is evidence only if it would have failed. This harness
 * builds rigged copies of the batch and asserts the verifier's exit code on
 * each: nine that MUST fail (one per mechanism it claims to guard), three
 * benign edits that MUST still pass, and the untouched file as a control.
 *
 * A harness where everything fails proves nothing, which is why the benign
 * rigs are here: they are real edits — every SVG number reformatted, the
 * drawing order of the curves and bars reversed, the prose rewritten — and
 * a verifier that failed on any of them would be reading the file rather
 * than the figure.
 *
 * The thin-margin rigs are MARGINAL by construction, not blowouts: the key
 * comparison is cut from 5 min to 3 min (11.0 px -> 6.6 px against an 8 px
 * floor), because a rig at 1 min would fire under a broken gate and a
 * correct one alike.
 *
 *   node verify-act-science-v6-selftest.mjs
 *   exit 0 = every rig behaved as specified
 *   exit 1 = a rig did not (named), i.e. the verifier does not check what
 *            it says it checks
 */
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const HERE = new URL('./', import.meta.url).pathname
const BATCH = join(HERE, 'act-science-v6.batch.json')
const VERIFY = join(HERE, 'verify-act-science-v6.mjs')
const DIR = mkdtempSync(join(tmpdir(), 'sc6-selftest-'))
const SRC = JSON.parse(readFileSync(BATCH, 'utf8'))

/* ---------- SVG surgery, on the same tag scan the verifier uses ---------- */
const TAG = /<([a-zA-Z]+)((?:\s+[a-zA-Z0-9:_-]+\s*=\s*"[^"]*")*)\s*\/?>(?:([^<]*)<\/\1>)?/g
const scan = svg => [...svg.matchAll(TAG)].map(m => {
  const attrs = {}
  for (const a of m[2].matchAll(/([a-zA-Z0-9:_-]+)\s*=\s*"([^"]*)"/g)) attrs[a[1]] = a[2]
  return { name: m[1], attrs, text: m[3] ?? null, start: m.index, end: m.index + m[0].length, raw: m[0] }
})
/* Rewrite matching tags (fn -> replacement string, '' deletes). Applied
   back-to-front so earlier offsets stay valid. */
const editTags = (svg, pred, fn) => {
  const hits = scan(svg).filter(pred)
  if (!hits.length) throw new Error('rig matched no tags — the rig is broken, not the verifier')
  let out = svg
  for (const t of hits.reverse()) out = out.slice(0, t.start) + fn(t) + out.slice(t.end)
  return out
}
const setSvg = (b, f) => { const c = JSON.parse(JSON.stringify(b)); const s = f(c[0].graphic.svg); for (const it of c) it.graphic.svg = s; return c }
const FIG2 = t => Number(t.attrs.y ?? t.attrs.y1 ?? -1) > 150   // Figure 2 sits below y=150

const RIGS = [
  /* ---------- the control ---------- */
  { name: 'control (untouched)', expect: 0, mut: b => b },

  /* ---------- must FAIL ---------- */
  {
    name: 'thin-key: Q3 key margin cut 5 min -> 3 min', expect: 1, want: 'thinnest separation',
    /* The held defect, reconstructed marginally. K's stirred bar is the
       only one taller than its unstirred partner; shrink it until the
       difference is 3 min (6.6 px). The ANSWER is unchanged, so only the
       resolution gate can catch this. */
    mut: b => setSvg(b, s => {
      const bars = scan(s).filter(t => t.name === 'rect' && Number(t.attrs.width) > 12 && FIG2(t))
      const k = bars.filter(t => t.attrs.fill === '#fff')[1]   // K's stirred bar, 2nd group
      const nh = Number(k.attrs.height) - 2 * 2.2, ny = Number(k.attrs.y) + 2 * 2.2
      return s.slice(0, k.start) + k.raw.replace(`y="${k.attrs.y}"`, `y="${ny}"`).replace(`height="${k.attrs.height}"`, `height="${nh}"`) + s.slice(k.end)
    }),
  },
  {
    name: 'asymmetric stroke: filled bars lose their stroke', expect: 1, want: 'different stroke widths',
    mut: b => setSvg(b, s => editTags(s, t => t.name === 'rect' && Number(t.attrs.width) > 12 && FIG2(t) && t.attrs.fill === '#000',
      t => t.raw.replace(' stroke="#000"', '').replace(' stroke-width="1"', ''))),
  },
  {
    name: 'Figure 2 loses its minor ticks', expect: 1, want: 'no minor ticks at all',
    mut: b => setSvg(b, s => editTags(s, t => t.name === 'line' && t.attrs['stroke-width'] === '.6' && FIG2(t), () => '')),
  },
  {
    name: 'Figure 2 labelled only every 20 min', expect: 1, want: 'no ruler finer than that',
    /* Delete the 10 and 30 labels and their major ticks, leaving 0/20/40/50
       — still calibratable, but with a 20 min coarsest interval. */
    mut: b => setSvg(b, s => {
      const dropY = scan(s).filter(t => t.name === 'text' && t.attrs['text-anchor'] === 'end' && FIG2(t) && ['10', '30'].includes(String(t.text).trim()))
        .map(t => Number(t.attrs.y) - 3)
      return editTags(s, t => (t.name === 'text' && t.attrs['text-anchor'] === 'end' && FIG2(t) && ['10', '30'].includes(String(t.text).trim()))
        || (t.name === 'line' && t.attrs['stroke-width'] === '.75' && dropY.some(y => Math.abs(Number(t.attrs.y1) - y) < 0.01)), () => '')
    }),
  },
  {
    name: 'axis mislabel: Figure 1 "30" printed as "32"', expect: 1, want: 'do not lie on one straight line',
    mut: b => setSvg(b, s => editTags(s, t => t.name === 'text' && t.attrs['text-anchor'] === 'end' && !FIG2(t) && String(t.text).trim() === '30',
      t => t.raw.replace('>30<', '>32<'))),
  },
  {
    name: 'legend swap: the K and L end letters exchanged', expect: 1, want: 'but the key is',
    mut: b => setSvg(b, s => editTags(s, t => t.name === 'text' && t.attrs['font-weight'] === 'bold' && ['K', 'L'].includes(String(t.text).trim()),
      t => t.raw.replace(/>([KL])</, (_, c) => `>${c === 'K' ? 'L' : 'K'}<`))),
  },
  {
    name: 'cross-figure invariant broken: M unstirred 40 -> 37', expect: 1, want: 'match no Figure 1 column',
    mut: b => setSvg(b, s => {
      const bars = scan(s).filter(t => t.name === 'rect' && Number(t.attrs.width) > 12 && FIG2(t))
      const m = bars.filter(t => t.attrs.fill === '#000')[3]
      const nh = Number(m.attrs.height) - 3 * 2.2, ny = Number(m.attrs.y) + 3 * 2.2
      return s.slice(0, m.start) + m.raw.replace(`y="${m.attrs.y}"`, `y="${ny}"`).replace(`height="${m.attrs.height}"`, `height="${nh}"`) + s.slice(m.end)
    }),
  },
  { name: 'wrong input: an id renamed', expect: 2, want: 'ids are not the v6 ids', mut: b => { const c = JSON.parse(JSON.stringify(b)); c[3].id = 'ACT-SC6-P1-Q9'; return c } },
  { name: 'wrong input: 5 items', expect: 2, want: 'this checker is only about', mut: b => b.slice(0, 5) },

  /* ---------- must PASS ---------- */
  {
    name: 'benign: every numeric attribute reformatted to 3 decimals', expect: 0,
    /* The first version of this rig was `s.replace(/(\d)"/g, '$1.0"')`,
       which also rewrites stroke="#000" as stroke="#0000" and broke the
       figure. It was the RIG that was wrong, not the verifier — recorded
       because a benign rig that is quietly destructive turns this harness
       into one where everything fails, which proves nothing. */
    mut: b => setSvg(b, s => s
      .replace(/\b(x|y|x1|y1|x2|y2|cx|cy|r|width|height|font-size|stroke-width)="(-?[\d.]+)"/g, (_, a, v) => `${a}="${Number(v).toFixed(3)}"`)
      .replace(/\bpoints="([^"]+)"/g, (_, p) => `points="${p.trim().split(/\s+/).map(q => q.split(',').map(n => Number(n).toFixed(3)).join(',')).join(' ')}"`)),
  },
  {
    name: 'benign: curve and bar drawing order reversed', expect: 0,
    /* Series identity comes from the end letters and bar identity from the
       labels underneath, so document order must not matter. */
    mut: b => setSvg(b, s => {
      const polys = scan(s).filter(t => t.name === 'polyline')
      const raws = polys.map(t => t.raw).reverse()
      let out = s
      polys.slice().reverse().forEach((t, i) => { out = out.slice(0, t.start) + raws[polys.length - 1 - i] + out.slice(t.end) })
      const bars = scan(out).filter(t => t.name === 'rect' && Number(t.attrs.width) > 12 && FIG2(t))
      const braws = bars.map(t => t.raw).reverse()
      bars.slice().reverse().forEach((t, i) => { out = out.slice(0, t.start) + braws[bars.length - 1 - i] + out.slice(t.end) })
      return out
    }),
  },
  {
    name: 'benign: prose rewritten (explanations, difficulty, subskill)', expect: 0,
    mut: b => { const c = JSON.parse(JSON.stringify(b)); for (const it of c) { it.explanation = 'rewritten prose that says nothing about the figure'; it.difficulty = 'medium'; it.subskill = 'x' } return c },
  },
]

let bad = 0
console.log(`attacking ${VERIFY}\n${RIGS.length} rigs (${RIGS.filter(r => r.expect === 0).length} must pass, ${RIGS.filter(r => r.expect !== 0).length} must not)\n`)
for (const r of RIGS) {
  const f = join(DIR, r.name.replace(/[^a-z0-9]+/gi, '-') + '.json')
  let mutated
  try { mutated = r.mut(SRC) } catch (e) { console.log(`  RIG BROKEN  ${r.name}: ${e.message}`); bad++; continue }
  writeFileSync(f, JSON.stringify(mutated, null, 2))
  let code = 0, out = ''
  try { out = execFileSync('node', [VERIFY, f], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }
  catch (e) { code = e.status; out = (e.stdout ?? '') + (e.stderr ?? '') }
  const okCode = code === r.expect
  const okWant = !r.want || out.includes(r.want)
  if (okCode && okWant) console.log(`  ok    exit ${code}  ${r.name}${r.want ? `  ["${r.want}"]` : ''}`)
  else {
    bad++
    console.log(`  FAIL  exit ${code} (wanted ${r.expect})  ${r.name}`)
    if (okCode && !okWant) console.log(`        exited right but never said "${r.want}" — it may be failing for an unrelated reason`)
    console.log(out.split('\n').filter(l => /FAIL|REFUSED|VERIFY/.test(l)).slice(0, 6).map(l => '        ' + l).join('\n'))
  }
}
console.log(`\n${RIGS.length - bad} of ${RIGS.length} rigs behaved as specified`)
if (bad) { console.error(`SELFTEST FAILED — ${bad} rig(s) did not`); process.exit(1) }
console.log('SELFTEST OK — the verifier fails on each mechanism it claims to guard, and on nothing benign')
