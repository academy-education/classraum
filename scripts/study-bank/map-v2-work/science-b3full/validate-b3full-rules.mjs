#!/usr/bin/env node
/**
 * validate-b3full-rules.mjs: fixtures and break-tests for the full batch 3's checker changes (MAP-SCIENCE-B3-FULL.prereg.md),
 * run BEFORE any full-batch item exists. Run from the repo root.
 *
 *   node scripts/study-bank/map-v2-work/science-b3full/validate-b3full-rules.mjs
 *
 * 1. RANKBAL and NAMETPL, RECALIBRATED (under both --rules b3p2 and b3f):
 *    - known-clean population: batch 2's 224 items, where no grader named a rank or name-ending pattern. The first forms
 *      refused 16 (RANKBAL) and 14 (NAMETPL) times there. Expectation: RANKBAL 0; NAMETPL only on endings that are rare
 *      among English given names (printed, so the over-reach is visible).
 *    - named items: pilot 1's "-sk" names (earth-g2) must still fire; pilot 1's two 2-of-3 rank cells are BELOW the new
 *      threshold by design (a pattern needs 3 items, rule 10a).
 *    - band edges and a random-name population (false-fire rate at the English base rate).
 * 2. New b3f checks, each on the pilot-2 item a grader named, and gone when disabled:
 *    FILLER "It remained constant." (L7-01 + L7-02, life-g1 + life-g2); TERMSHAPE L6-02 "fossilization" (life-g1/g2);
 *    CLAIMPOL L6-01 lone "No" (life-g2). Plus band edges.
 * 3. Pilot 2 still prints ok under the recalibrated b3p2 (per area and batch).
 * Exit 2 on unreadable input or a wrong count, 1 on any failed expectation, 0 otherwise.
 */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkItem, checkBatch, binomUpper, nameEndings } from '../science-pilot/sci-check.mjs'

const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = join(HERE, '../../../..')
const die = m => { console.error('REFUSING: ' + m); process.exit(2) }
function load(slotsRel, dir, cells, want) {
  const S = JSON.parse(readFileSync(join(HERE, slotsRel), 'utf8')), SLOT = {}
  for (const [c, v] of Object.entries(S)) if (!c.startsWith('_')) for (const r of v.rows) SLOT[r.id] = { ...r, area: v.area, author: c }
  const items = []
  for (const c of cells) { const f = join(ROOT, dir, c, 'items.json'); if (!existsSync(f)) die(`missing ${f}`); items.push(...JSON.parse(readFileSync(f, 'utf8')).filter(i => !i.empty)) }
  if (items.length !== want) die(`${dir}: read ${items.length} items, expected ${want}`)
  return { SLOT, items }
}
if (!nameEndings()) die('name-endings.json unreadable (science-pilot/make-name-endings.mjs)')
const b2 = load('../science-b2/slots.json', 'scratchpad/map-science-b2', ['L5', 'L6', 'L7', 'L8', 'P5', 'P6', 'P7', 'P8', 'E5', 'E6', 'E7', 'E8'], 224)
const p1 = load('../science-b3/slots.json', 'scratchpad/map-science-b3', ['L', 'P', 'E'], 24)
const p2 = load('../science-b3p2/slots.json', 'scratchpad/map-science-b3p2', ['L', 'P', 'E'], 24)
console.log(`read ${b2.items.length} batch-2, ${p1.items.length} pilot-1 and ${p2.items.length} pilot-2 items`)

let fail = 0
const ok = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fail++ }
const hits = (d, check, rules, needle = '', disabled = []) => checkBatch(d.items, d.SLOT, { rules, disabled: new Set(disabled) }).p.filter(p => p.includes(`${check} `) && p.includes(needle))
const itemHits = (d, check, rules, disabled = []) => d.items.filter(i => checkItem(i, d.SLOT[i.id], [], { rules, disabled: new Set(disabled) }).some(p => p.startsWith(check))).map(i => i.id.replace(/^MSB\w+-/, ''))

console.log('\n== 1. recalibrated RANKBAL / NAMETPL')
for (const rules of ['b3p2', 'b3f']) {
  const r = hits(b2, 'RANKBAL', rules), n = hits(b2, 'NAMETPL', rules)
  ok(r.length === 0, `[${rules}] batch 2 (known-clean for ranks): RANKBAL ${r.length} refusals (first form: 16)`)
  ok(n.length <= 3, `[${rules}] batch 2: NAMETPL ${n.length} refusals (first form: 14); each on an ending rare among English given names:`)
  for (const l of n) console.log(`       ${l.replace('BATCH ', '')}`)
  const sk = hits(p1, 'NAMETPL', rules, '-sk')
  ok(sk.length === 1, `[${rules}] pilot 1 "-sk" (Hesk / Marsk / Tesk, earth-g2) still fires: ${sk[0] ?? 'NOT CAUGHT'}`)
  ok(!hits(p1, 'NAMETPL', rules, '-sk', ['NAMETPL']).length, `[${rules}] NAMETPL disabled -> the -sk hit disappears`)
  ok(!hits(p1, 'RANKBAL', rules).length, `[${rules}] pilot 1's 2-of-3 rank cells (Earth claims, Physical values) are below the 3-item threshold by design`)
}
// band edges (synthetic): one area, one format
const AR = 'Physical Science'
const mk = list => { const SLOT = {}, items = list.map((x, n) => { const id = `MSBZ-P5-${String(n + 1).padStart(2, '0')}`; SLOT[id] = { area: AR, format: x.format }; return { id, ...x } }); return { SLOT, items } }
const fires = (d, check, rules = 'b3f', disabled = []) => checkBatch(d.items, d.SLOT, { rules, disabled: new Set(disabled) }).p.some(p => p.includes(`${check} `))
const OPTS = ['aaaaaa bb cc dd ee ff', 'aaaaaa bb cc dd ee ffgg', 'aaaaaa bb cc dd ee ffgghh', 'aaaaaa bb cc dd ee ffgghhii']
const claim = r => ({ format: 'claim', choices: OPTS, correct_answer: OPTS[r - 1] })
const cl = ranks => mk(ranks.map(claim))
ok(!fires(cl([1, 1, 4]), 'RANKBAL'), 'RANKBAL n=3 ranks 1/1/4 pass (2 keys < 3)')
ok(fires(cl([1, 1, 1]), 'RANKBAL'), 'RANKBAL n=3 ranks 1/1/1 fire (every key of the cell)')
ok(!fires(cl([1, 1, 1, 3]), 'RANKBAL'), `RANKBAL n=4 three rank-1 pass (P=${binomUpper(4, 0.25, 3).toFixed(4)})`)
ok(fires(cl([1, 1, 1, 1]), 'RANKBAL'), `RANKBAL n=4 four rank-1 fire (P=${binomUpper(4, 0.25, 4).toFixed(4)})`)
ok(!fires(cl([1, 1, 1, 1, 2, 3, 4, 2]), 'RANKBAL'), `RANKBAL n=8 four rank-1 pass (P=${binomUpper(8, 0.25, 4).toFixed(4)})`)
// Weakness, stated: at alpha 0.01, 5 of 8 (P = 0.027) does not fire; alpha 0.03 would catch it but refuses one batch-2 cell
// no grader named. The full batch's slots deal ranks flat per area per format and RANK enforces each slot, so this edge
// cannot be reached by drift; it matters only for an undealt batch.
ok(!fires(cl([1, 1, 1, 1, 1, 3, 4, 2]), 'RANKBAL'), `RANKBAL n=8 five rank-1 pass (P=${binomUpper(8, 0.25, 5).toFixed(4)} >= 0.01; stated weakness)`)
ok(fires(cl([1, 1, 1, 1, 1, 1, 4, 2]), 'RANKBAL'), `RANKBAL n=8 six rank-1 fire (P=${binomUpper(8, 0.25, 6).toFixed(4)})`)
ok(!fires(cl([1, 1, 1, 1, 1, 1, 4, 2]), 'RANKBAL', 'b3f', ['RANKBAL']), 'RANKBAL disabled -> n=8 six rank-1 no longer fires')
// NAMETPL band edges and the random-name false-fire rate
const named = ns => mk(ns.map(n => ({ ...claim(2), names_used: [`Site ${n}`] })))
ok(!fires(named(['Hesk', 'Marsk', 'Orla']), 'NAMETPL'), 'NAMETPL 2 items ending -sk pass')
ok(fires(named(['Hesk', 'Marsk', 'Tesk']), 'NAMETPL'), 'NAMETPL 3 items ending -sk fire (rare ending)')
ok(!fires(named(['Dalton', 'Brandon', 'Gideon', 'Kerra', 'Pell', 'Arvid', 'Lumi', 'Tobin']), 'NAMETPL'), 'NAMETPL 3 of 8 items ending -on pass (common English ending)')
ok(fires(named(['Dalton', 'Brandon', 'Gideon', 'Marlon', 'Sutton', 'Halton', 'Weston', 'Tobin']), 'NAMETPL'), 'NAMETPL 7 of 8 items ending -on fire')
{
  const pool = readFileSync('/usr/share/dict/propernames', 'utf8').split('\n').filter(s => /^[A-Z][a-z]{2,}$/.test(s))
  if (pool.length < 1000) die('propernames short')
  let seed = 7; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648)
  let f = 0; const N = 300
  for (let t = 0; t < N; t++) { const d = mk(Array.from({ length: 60 }, () => ({ ...claim(2), names_used: [`Site ${pool[Math.floor(rnd() * pool.length)]}`, `Lake ${pool[Math.floor(rnd() * pool.length)]}`] }))); if (fires(d, 'NAMETPL')) f++ }
  ok(f / N <= 0.1, `NAMETPL false-fire rate on 60-item areas of random English given names (2 per item): ${f} of ${N} areas (${(100 * f / N).toFixed(1)}%; want <= 10%)`)
}

console.log('\n== 2. new b3f checks on the pilot-2 items the graders named')
{
  const f = hits(p2, 'FILLER', 'b3f', 'Life Science: "It remained constant."')
  ok(f.length === 1 && f[0].includes('L7-01') && f[0].includes('L7-02'), `FILLER Life "It remained constant." (life-g1 + life-g2): ${f[0] ?? 'NOT CAUGHT'}`)
  ok(!hits(p2, 'FILLER', 'b3f', '', ['FILLER']).length, 'FILLER disabled -> every FILLER hit disappears')
  ok(!hits(p2, 'FILLER', 'b3p2').length, 'FILLER is b3f-only (b3p2 output unchanged)')
  const t = itemHits(p2, 'TERMSHAPE', 'b3f')
  ok(t.includes('L6-02'), `TERMSHAPE L6-02 "fossilization" (life-g1 + life-g2): fired on ${t.join(', ') || 'none'} of ${p2.items.filter(i => i.format === 'term').length} term items`)
  ok(!itemHits(p2, 'TERMSHAPE', 'b3f', ['TERMSHAPE']).length, 'TERMSHAPE disabled -> no hit')
  const c = itemHits(p2, 'CLAIMPOL', 'b3f')
  ok(c.includes('L6-01'), `CLAIMPOL L6-01 lone "No" (life-g2): fired on ${c.join(', ') || 'none'} of ${p2.items.filter(i => i.format === 'claim').length} claim items`)
  ok(!itemHits(p2, 'CLAIMPOL', 'b3f', ['CLAIMPOL']).length, 'CLAIMPOL disabled -> no hit')
}
// band edges for the item checks
const S1 = (format, ask = 'x') => ({ id: 'X', area: AR, g: 6, tier: 'low', dci: 'PS1', kind: 'model', stimulus: 'scenario', format, ask, key: 'A', rank: 1, invent: false })
const ih = (format, ch, check) => checkItem({ id: 'X', choices: ch, correct_answer: ch[0] }, S1(format), [], { rules: 'b3f' }).some(p => p.startsWith(check))
ok(!ih('term', ['melting', 'freezing', 'boiling', 'condensing'], 'TERMSHAPE'), 'TERMSHAPE 1/1/1/1 words pass')
ok(!ih('term', ['cell wall', 'cell membrane', 'nucleus', 'cytoplasm'], 'TERMSHAPE'), 'TERMSHAPE 2/2/1/1 words pass')
ok(ih('term', ['nucleus', 'cell wall', 'cell membrane', 'outer cell layer'], 'TERMSHAPE'), 'TERMSHAPE 1/2/2/3 fire')
ok(!ih('claim', ['Yes, since it is warm today.', 'No, since it is cold out today.', 'Yes, since the sun is out now.', 'No, since the wind is strong.'], 'CLAIMPOL'), 'CLAIMPOL 2 Yes + 2 No pass')
ok(!ih('claim', ['The rock will crack in winter.', 'The rock will stay whole all year.', 'The rock will melt in summer.', 'The rock will float in the pond.'], 'CLAIMPOL'), 'CLAIMPOL no yes/no options pass')
ok(ih('claim', ['No, since it is warm today.', 'Yes, since it is cold out today.', 'Yes, since the sun is out now.', 'Yes, since the wind is strong.'], 'CLAIMPOL'), 'CLAIMPOL 3 Yes + 1 No fire')
{
  const T = (key, o) => ({ format: 'trend', choices: [key, ...o], correct_answer: key })
  ok(!fires(mk([T('The mass rose.', ['The mass fell.', 'The mass rose, then fell.', 'The mass fell, then rose.']), T('The count fell.', ['The count rose.', 'The count rose, then fell.', 'The count fell, then rose.'])]), 'FILLER'), 'FILLER item-own subjects: no shared option text passes')
  ok(fires(mk([T('The mass rose.', ['It stayed the same.', 'The mass rose, then fell.', 'The mass fell, then rose.']), T('The count fell.', ['It stayed the same.', 'The count rose, then fell.', 'The count fell, then rose.'])]), 'FILLER'), 'FILLER one distractor text in 2 items, never a key, fires')
  ok(!fires(mk([T('It stayed the same.', ['The mass fell.', 'The mass rose, then fell.', 'The mass fell, then rose.']), T('The count fell.', ['It stayed the same.', 'The count rose, then fell.', 'The count fell, then rose.'])]), 'FILLER'), 'FILLER a shared text that is also a key elsewhere passes')
}

console.log('\n== 3. pilot 2 under the recalibrated b3p2')
{
  const r = checkBatch(p2.items, p2.SLOT, { rules: 'b3p2' })
  const it = p2.items.filter(i => checkItem(i, p2.SLOT[i.id], [], { rules: 'b3p2' }).length).map(i => i.id)
  ok(!r.p.length && !it.length, `pilot 2: ${p2.items.length - it.length}/${p2.items.length} items ok, batch ${r.p.length ? r.p.join(' | ') : 'clean'} under b3p2`)
}
console.log(fail ? `\nVALIDATION FAILED: ${fail}` : '\nVALIDATION OK: recalibrated RANKBAL/NAMETPL stop over-firing on batch 2 and still catch what they must; FILLER, TERMSHAPE and CLAIMPOL each catch their named pilot-2 item and vanish when disabled')
process.exit(fail ? 1 : 0)
