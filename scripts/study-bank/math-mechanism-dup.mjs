#!/usr/bin/env node
/**
 * math-mechanism-dup.mjs <expectedCount> <batch.json...> [--exclude-cohort <c>]... [--top N]
 *
 * Mechanism-keyword duplicate check for a maths candidate batch, against EVERY
 * live maths row in EVERY family (sat, act, ssat, isee) and within the batch.
 * A standing pre-insert step NEXT TO the stem-similarity scan
 * (act-math-v16-dupscan.mjs), not instead of it.
 *
 * Why it exists. act-math-v20 shipped three candidates that were the same
 * mechanism as a live row in different words, all below the Jaccard scan's
 * 0.45 floor: "fit a quadratic through three values, evaluate a fourth"
 * (AM20A-05 ~ act e8f17f52), "the same two lines with a third boundary"
 * (AM20G-03 ~ isee da512959), "two travellers, one with a head start, meet"
 * (AM20I-03 ~ sat 7c27e30c). Word overlap cannot see a reworded mechanism; a
 * per-mechanism keyword search did.
 *
 * What it does, per candidate:
 *   1. mechanism keywords — tags from a fixed maths-mechanism lexicon matched
 *      over prompt + subskill + explanation, structural signatures read from
 *      the prompt (three function values given, two or more lines, two clock
 *      times, two movers, ...), PLUS any author-declared `mechanism` array on
 *      the item (each string is searched as a phrase in every live row);
 *   2. shared numeric setup — parsed line equations (slope, intercept), other
 *      equation literals, and the prompt's numbers;
 *   3. a score per (candidate, live row) = IDF-weighted sum of co-occurring
 *      mechanism terms + signatures + setup literals + shared numbers, IDF taken
 *      over the live corpus so "triangle" is cheap and "head start" is not;
 *   4. ranked candidates printed for a HAND READ. A flag is not a verdict: a
 *      same-mechanism pair is the drop, decided by the reader.
 *
 * Refuses (exit 2) rather than print a number when it cannot read its input:
 * item count != expected, an item without a prompt, a live read that does not
 * match the table's exact count, duplicate ids from paging, or < 2000 rows.
 * Exit 1 when any FLAG is printed (read them), 0 when quiet.
 *
 * Break-test (2026-10-08, REGISTER §5). Weights and tiers were SET on
 * act-math-v20 (the break-test file), so the held-out runs are the evidence:
 *   v20 (--exclude-cohort act-math-v20): all 3 pairs FLAG at rank 1 of 2,729
 *     (20.8 / 32.8 / 48.9); 41 of the 42 other items quiet — the one that
 *     flags, AM20F-01, is the recorded inner-argument twin of 991f721f.
 *   HELD OUT, positive: AM18F-05 ~ sat 9b4c06b0 (dropped by hand in v18)
 *     FLAGs, 17.8, its partner at rank 4 (inside the top 5 printed).
 *   HELD OUT, clean: v16 kept 45, v17 kept 6, v19 kept 9 and the other 45 of
 *     the v18 batch: 0 FLAG on 105 items.
 *   Ablation: MMD_ABLATE=sig drops AM20A-05 to 7.2 (quiet); sig,lit drops
 *     AM20G-03 to 9.8 (quiet) — each pair is found by a named channel.
 *   The Jaccard scan returns none of the three pairs.
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

// ---------- args ----------
const argv = process.argv.slice(2)
const excludeCohorts = new Set(); let TOP = 5; const pos = [], PAIRS = []
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--exclude-cohort') excludeCohorts.add(argv[++i])
  else if (argv[i] === '--top') TOP = Number(argv[++i])
  else if (argv[i] === '--pair') PAIRS.push(argv[++i].split(':'))
  else pos.push(argv[i])
}
const [expected, ...paths] = pos
if (!expected || !paths.length) {
  console.error('usage: math-mechanism-dup.mjs <expectedCount> <batch.json...> [--exclude-cohort <c>]... [--top N]'); process.exit(2)
}
const batch = paths.flatMap(p => JSON.parse(readFileSync(p, 'utf8')))
if (batch.length !== Number(expected)) { console.error(`REFUSING: read ${batch.length} items, expected ${expected}`); process.exit(2) }
for (const it of batch) if (!it?.id || !String(it.prompt ?? '').trim()) { console.error(`REFUSING: item ${it?.id ?? '?'} has no id or prompt`); process.exit(2) }

// ---------- text ----------
const norm = s => String(s ?? '').toLowerCase()
  .replace(/[−–—]/g, '-').replace(/²/g, '^2').replace(/³/g, '^3').replace(/×|·/g, '*')
  .replace(/\u00a0/g, ' ').replace(/[\u2080-\u2089]/g, d => String(d.charCodeAt(0) - 0x2080))

// Mechanism lexicon. Each tag is a MECHANISM-bearing phrase family, written
// for maths in general (all four families), not for the three v20 pairs.
const LEX = {
  quadratic: /\bquadratic|parabola|\bx\^2\b/,
  vertex_form: /\bvertex\b|axis of symmetry|maximum value|minimum value/,
  discriminant: /discriminant|exactly one (real )?solution|no real solutions?|two (distinct )?real (solutions|roots)/,
  vieta: /sum of the (roots|solutions|zeros)|product of the (roots|solutions|zeros)/,
  complete_square: /completing the square|complete the square/,
  system: /system of (linear )?equations|\bsystem\b|simultaneous/,
  nsolutions_param: /no solutions?\b|infinitely many solutions/,
  slope: /\bslope\b|rate of change/,
  perpendicular: /perpendicular/,
  parallel: /\bparallel\b/,
  intercepts: /x-intercept|y-intercept|crosses the [xy]-axis|intercepts?\b/,
  distance_pts: /distance between (the )?points|distance from the point|distance formula/,
  midpoint: /midpoint/,
  circle_eq: /\(x\s*[-+]\s*\d+\)\^2\s*\+\s*\(y|equation of (a|the) circle|x\^2\s*\+\s*y\^2/,
  circle: /\bcircle|radius|diameter|circumference/,
  arc_sector: /\barc\b|\bsector\b|central angle/,
  inscribed: /inscribed|circumscribed/,
  tangent_geom: /tangent (line|to (a|the) circle)|tangent at/,
  trig: /\b(sin|cos|tan)\b|\bsine\b|cosine|tangent of/,
  unit_circle: /radians?\b|unit circle/,
  law_sin_cos: /law of (sines|cosines)/,
  right_triangle: /right triangle|hypotenuse|pythag/,
  special_triangle: /30-60-90|45-45-90|isosceles right|equilateral/,
  similar: /\bsimilar\b|scale factor|dilat/,
  triangle_area: /area of (the |a |this )?triangle|triangle[^.?]{0,60}\barea\b|\barea\b[^.?]{0,60}triangle/,
  enclosed_by_lines: /(lines|graphs)[^.?]{0,80}(enclose|form|bound)|(enclose|bound)[^.?]{0,40}(lines|axis)|formed by[^.?]{0,60}(lines|axis)/,
  polygon_angles: /interior angles?|exterior angles?|regular (polygon|pentagon|hexagon|octagon|decagon)/,
  angle_chase: /supplementary|complementary|vertical angles|transversal|alternate interior/,
  volume: /\bvolume\b/,
  surface_area: /surface area/,
  cylinder: /cylind/, cone: /\bcone\b|conical/, sphere: /sphere|hemispher/, prism_box: /prism|rectangular box|\bcube\b/,
  pyramid: /pyramid|tetrahedr/,
  perimeter: /perimeter/,
  shaded: /shaded/,
  tether: /tether|leash|rope|grazing|goat/,
  movers: /\b(car|truck|train|bus|cyclist|bicyclist|runner|jogger|walker|hiker|boat|airplane|jet|swimmer|traveler|traveller)s?\b/,
  toward_each_other: /toward(s)? each other|toward(s)? [a-z]+[^.?]{0,40}toward(s)?|approach(ing)? each other|opposite directions/,
  apart: /\b\d[\d,.]*\s*(miles|kilometers|km|meters|feet)\s+apart\b|\bapart\b/,
  meet: /\bmeet\b|\bmeets\b|\bpass each other\b/,
  catch_up: /catch up|overtake|catches up|same direction/,
  head_start: /head start|later\b|leaves? [^.?]{0,40}(after|before)|an hour after|minutes after/,
  speed: /miles per hour|kilometers per hour|km\/h|\bmph\b|meters per second|\bspeed\b/,
  work_rate: /working together|work together|together[^.?]{0,60}(job|task|fill|paint|mow|complete)|alone[^.?]{0,60}hours|\bpipes?\b|\bdrain/,
  mixture: /mixture|concentration|alloy|\bsolution\b[^.?]{0,40}percent|percent (salt|acid|alcohol|sugar)/,
  percent_change: /percent (increase|decrease)|increased by \d|decreased by \d|\bdiscount|markup|sale price|marked down|marked up/,
  percent_of: /\bpercent\b|%/,
  interest: /interest|compounded|annually|principal/,
  exp_growth: /doubles|double every|half-life|halves|decays?\b|grows? by|exponential|depreciat/,
  logarithm: /\blog\b|\blog_|\blogarithm|\bln\b/,
  arith_seq: /arithmetic sequence|common difference/,
  geom_seq: /geometric sequence|common ratio/,
  sequence: /\bsequence\b|\bnth term|\bterm\b/,
  fn_composition: /\b[fgh]\(\s*[fgh]\(|composit/,
  inverse_fn: /\binverse\b/,
  transformation: /shifted|translated|reflected|stretched|compressed|translation of/,
  abs_value: /absolute value|\|[^|]+\|/,
  inequality: /inequalit|at least|at most|no more than|no less than|greater than or equal|less than or equal/,
  greatest_integer: /greatest (possible )?integer|least (possible )?integer|smallest (possible )?integer|largest (possible )?integer/,
  remainder_thm: /remainder when [^.?]{0,30}divided by \(?x|remainder theorem|divided by \(?x\s*[-+]/,
  int_remainder: /remainder when \d|leaves a remainder|divisible by/,
  polynomial: /polynomial|cubic (function|polynomial|equation|expression)|degree \d/,
  coeffs_from_values: /ax\^2\s*\+\s*bx\s*\+\s*c|(determine|find|determining|finding) (the )?(constants|coefficients|values of a, b)|through (the )?(three )?points|model from (three|the) (points|values)/,
  factor: /\bfactor/,
  rational_fn: /asymptote|rational (function|expression)|undefined/,
  radicals_exps: /√|sqrt|square root|cube root|\^\(?-?\d+\/\d+|rational exponent/,
  complex_num: /complex number|imaginary|\bi\^2|\bi = √-1/,
  matrix: /matri(x|ces)|determinant/,
  vector: /\bvector/,
  mean: /\bmean\b|\baverage\b/,
  median: /\bmedian\b/,
  mode_range: /\bmode\b|\brange of the (data|scores|values)/,
  std_dev: /standard deviation|spread|variance/,
  add_remove_mean: /(added|removed|dropped|new score)[^.?]{0,80}(mean|average)|(mean|average)[^.?]{0,80}(added|removed|new)/,
  weighted_avg: /weighted|combined (mean|average)|(mean|average) of (all|both|the two) (groups|classes)/,
  probability: /probability|\bchance\b|at random|randomly/,
  conditional: /given that|of those who|of the [a-z]+ who|if [^.?]{0,40}is (selected|chosen)[^.?]{0,40}probability/,
  without_replacement: /without replacement|with replacement/,
  counting: /how many (different )?(ways|arrangements|combinations|codes|outfits|committees|passwords|orders)|permutation|combination|\bchoose\b/,
  venn: /\bboth\b[^.?]{0,80}\bneither\b|\bneither\b|exactly one of|venn/,
  two_way_table: /two-way|table[^.?]{0,60}(row|column)/,
  ratio: /\bratio\b/,
  proportion_var: /proportional|varies (directly|inversely)|direct variation|inverse variation/,
  unit_convert: /convert|inches[^.?]{0,40}(feet|foot)|feet[^.?]{0,40}(yards|inches)|\bcups?\b|gallons?|liters?|quarts?|ounces?/,
  scale_map: /scale (drawing|model|of)|map[^.?]{0,40}represents|inch(es)? represents?/,
  consecutive: /consecutive (even |odd )?(integers|numbers)/,
  digits: /\bdigits?\b/,
  ages: /years old|\bage\b|\bages\b|years ago|years from now/,
  coins: /\bcoins?\b|nickels|dimes|quarters/,
  linear_cost: /flat fee|per (hour|month|mile|minute|day|person|ticket)[^.?]{0,40}plus|plus \$?\d[^.?]{0,20}per|fixed (fee|cost)|charges? \$/,
  tickets: /\btickets?\b|admission/,
  lcm_gcd: /least common multiple|greatest common (factor|divisor)|\blcm\b|\bgcd\b|\bgcf\b/,
  prime: /\bprimes?\b/,
  sci_notation: /scientific notation|\* ?10\^/,
  scatter_fit: /line of best fit|scatterplot|scatter plot|regression/,
  sampling: /sample|survey|margin of error|population/,
  speed_dt: /distance[^.?]{0,40}time|travel(s|ed|led)? [^.?]{0,40}(hours|minutes)/,
  clock_time: /\d{1,2}:\d{2}\s*[ap]\.?\s*m/,
  domain_range: /\bdomain\b|\brange\s*-?\d|\brange (of (the function|[fgh]\b)|is -?\d)|defined only for/,
  extreme_value: /(greatest|least|largest|smallest|maximum|minimum) (possible )?value/,
  inner_argument: /\b[fgh]\(\s*-?\d*\s*x\s*[-+]\s*\d+\s*\)/,
  circular_seating: /circular table|round table|around a (circle|table)|rotation of the other/,
  adjacency: /next to each other|adjacent|side by side|not seated next/,
  arrangement: /\bseat(ed|ing|ings)?\b|arrange(d|ment|ments)?\b|in a row|line up/,
  grid_count: /\bgrid\b|unit squares|lattice/,
  wages: /overtime|time and a half|double time|hourly (rate|wage|pay)|paid \$?\d[^.?]{0,20}per hour|\bwages?\b|commission/,
  rotation_reflection: /rotated|reflected (over|across|in)|rotation of \d|reflection/,
  tiles_cover: /\btiles?\b|cover(ed|s)? (the|a) (floor|wall|region)/,
  taxes_tips: /\btax\b|\btip\b|gratuity|sales tax/,
}

// structural signatures, read from the PROMPT
const fvalRe = /\b[a-z]\(\s*-?\d+(?:\.\d+)?\s*\)\s*=\s*-?\d/g
const lineRe = /\by\s*=\s*(-?\s*\d*(?:\.\d+)?(?:\/\d+)?)\s*x\b\s*(?:([+-])\s*(\d+(?:\.\d+)?(?:\/\d+)?))?/g
const clockRe = /\b\d{1,2}:\d{2}\s*[ap]\.?\s*m/g
const num = t => { t = t.replace(/\s/g, ''); if (t === '' || t === '+') return 1; if (t === '-') return -1; if (t.includes('/')) { const [a, b] = t.split('/').map(Number); return a / b } return Number(t) }
function features(it) {
  const p = norm(it.prompt), all = norm([it.prompt, it.subskill, it.topic_tag, it.explanation].filter(Boolean).join(' \n '))
  const tags = new Set()
  for (const [k, re] of Object.entries(LEX)) if (re.test(all)) tags.add('T:' + k)
  const sig = new Set()
  const fv = new Set((p.match(fvalRe) ?? []).map(s => s.replace(/\s/g, '')))
  if (fv.size >= 3) sig.add('S:three_function_values'); else if (fv.size === 2) sig.add('S:two_function_values')
  const lines = new Set()
  for (const m of p.matchAll(lineRe)) {
    const mm = num(m[1]); const b = m[2] ? (m[2] === '-' ? -1 : 1) * num(m[3]) : 0
    if (Number.isFinite(mm) && Number.isFinite(b)) lines.add(`line(${+mm.toFixed(4)},${+b.toFixed(4)})`)
  }
  if (lines.size >= 2) sig.add('S:two_plus_lines')
  const moverHits = new Set((p.match(new RegExp(LEX.movers.source, 'g')) ?? []).map(w => w.replace(/s$/, '')))
  if (moverHits.size >= 2 || /\b(another|second|other) (car|truck|train|bus|cyclist|runner|hiker|boat|airplane|swimmer)\b/.test(p) || /\btwo (cars|trucks|trains|buses|cyclists|runners|hikers|boats|planes|swimmers)\b/.test(p)) {
    sig.add('S:two_movers')
    // staggered start: two movers AND (two clock times OR a head-start / later phrase)
    if (new Set(p.match(clockRe) ?? []).size >= 2 || LEX.head_start.test(p)) sig.add('S:staggered_movers')
  }
  // a function defined from a transformed f: g(x) = 3 - 2f(x + 4), y = f(3x - 6)
  for (const m of p.matchAll(/\b(?:[gh]\(x\)|y)\s*=\s*([-\d\s.+*/]*)(?<![a-z])f\(([^()]*)\)\s*([-+]\s*\d+)?/g)) {
    // only a TRANSFORMED f counts: an outer coefficient/constant or an inner argument other than x
    if (/\d|-/.test(m[1]) || m[2].replace(/\s/g, '') !== 'x' || m[3]) { sig.add('S:g_from_f'); break }
  }
  // equation literals (other than lines): any "lhs = rhs" containing x with >= 6 chars, whitespace removed
  const lits = new Set([...lines])
  // a literal is the maximal run of MATH tokens around an '=' (a token with a digit, operator,
  // bracket or root, or a lone letter); any English word ends the run
  const toks = p.replace(/([=<>≤≥])/g, ' $1 ').split(/\s+/).filter(Boolean)
  const isMath = w => /[0-9=+\-*/^()√]/.test(w) || /^[a-z][,.]?$/.test(w)
  for (let i = 0; i < toks.length; i++) if (toks[i] === '=') {
    let a = i, b = i
    while (a > 0 && isMath(toks[a - 1])) a--
    while (b < toks.length - 1 && isMath(toks[b + 1])) b++
    const s = toks.slice(a, b + 1).join('').replace(/[,.?;:]+$/, '')
    if (/[a-z]/.test(s) && s.length >= 7 && !/^[a-z]\(-?\d+(\.\d+)?\)=-?\d+(\.\d+)?$/.test(s)) lits.add('E:' + s)
  }
  const nums = new Set((p.replace(/,(?=\d{3})/g, '').match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number).filter(n => Math.abs(n) > 2).map(String))
  const declared = (Array.isArray(it.mechanism) ? it.mechanism : []).map(s => String(s).toLowerCase().trim()).filter(Boolean)
  return { tags, sig, lits, nums, all, declared }
}

// ---------- live read ----------
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const base = () => db.from('study_item_bank').select('id,family,domain,cohort,subskill,topic_tag,item', { count: 'exact' })
  .eq('section', 'math').eq('verified', true).eq('archived', false)
const live = []; let exact = null
for (let f = 0; ; f += 1000) {
  const { data, error, count } = await base().order('id').range(f, f + 999)
  if (error) { console.error('REFUSING: ' + error.message); process.exit(2) }
  if (exact === null) exact = count
  live.push(...data); if (data.length < 1000) break
}
if (new Set(live.map(r => r.id)).size !== live.length) { console.error('REFUSING: paging slipped (duplicate ids)'); process.exit(2) }
if (live.length !== exact) { console.error(`REFUSING: read ${live.length} live rows, table count says ${exact}`); process.exit(2) }
if (live.length < 2000) { console.error('REFUSING: fewer than 2000 live math rows — the read is incomplete'); process.exit(2) }
const fam = {}; for (const r of live) fam[r.family] = (fam[r.family] ?? 0) + 1

const L = []; let excluded = 0
for (const r of live) {
  if (excludeCohorts.has(r.cohort)) { excluded++; continue }
  const it = { prompt: r.item?.prompt, subskill: r.subskill ?? r.item?.subskill, topic_tag: r.topic_tag, explanation: r.item?.explanation }
  if (!String(it.prompt ?? '').trim()) continue
  L.push({ id: r.id, family: r.family, domain: r.domain, cohort: r.cohort, prompt: r.item.prompt, f: features(it) })
}
const C = batch.map(it => ({ id: it.id, domain: it.domain, prompt: it.prompt, f: features(it) }))
// self-matches (a live batch run as a control): identical prompt = the row itself
const selfSkip = new Set(); for (const c of C) for (const r of L) if (norm(r.prompt).trim() === norm(c.prompt).trim()) selfSkip.add(c.id + '|' + r.id)

// ---------- IDF over the live corpus ----------
const N = L.length, df = new Map()
const bump = k => df.set(k, (df.get(k) ?? 0) + 1)
for (const r of L) { for (const k of r.f.tags) bump(k); for (const k of r.f.sig) bump(k); for (const k of r.f.lits) bump(k); for (const k of r.f.nums) bump('N:' + k) }
const idf = k => Math.log((N + 1) / ((df.get(k) ?? 0) + 1))
const declDf = new Map()
for (const c of C) for (const d of c.f.declared) if (!declDf.has(d)) declDf.set(d, L.filter(r => r.f.all.includes(d)).length)

// weights: mechanism tags x1, signatures x1.5, literal setups x2, numbers x0.5 (capped)
// MMD_ABLATE=sig,lit,lex,num,decl switches a channel off — for break-testing which channel finds what
const ABL = new Set(String(process.env.MMD_ABLATE ?? '').split(',').filter(Boolean))
function score(a, b) {
  const why = []; let s = 0, strong = false, ndecl = 0
  if (!ABL.has('lex')) for (const k of a.f.tags) if (b.f.tags.has(k)) { const w = idf(k); s += w; why.push([k.slice(2), w]) }
  if (!ABL.has('sig')) for (const k of a.f.sig) if (b.f.sig.has(k)) { const w = 2 * idf(k); s += w; why.push([k.slice(2).toUpperCase(), w]); strong = true }
  // a shared equation is a SETUP only when it is rare (df <= 2); one shared equation is
  // a coincidence-level overlap, two or more (e.g. the same two lines) is a shared setup
  let nlit = 0
  if (!ABL.has('lit')) for (const k of a.f.lits) if (b.f.lits.has(k) && (df.get(k) ?? 0) <= 2) { const w = idf(k); s += w; why.push(['SAME ' + k, w]); nlit++ }
  if (nlit >= 2) strong = true
  let ns = 0; const sharedN = []
  for (const k of a.f.nums) if (b.f.nums.has(k)) { ns += 0.5 * idf('N:' + k); sharedN.push(k) }
  if (sharedN.length >= 2 && !ABL.has('num')) { const w = Math.min(ns, 6); s += w; why.push([`numbers{${sharedN.join(',')}}`, w]) }
  if (!ABL.has('decl')) for (const d of a.f.declared) if (b.f.all.includes(d)) { const w = Math.log((N + 1) / ((declDf.get(d) ?? 0) + 1)); s += w; why.push([`declared "${d}"`, w]); ndecl++ }
  if (ndecl >= 2) strong = true // two author-declared mechanism terms CO-OCCURRING is structure; one is a topic
  return { s, why, strong }
}
// coverage: the share of the candidate's OWN mechanism weight (tags + signatures) the other row carries
const ownW = c => [...c.f.tags].reduce((t, k) => t + idf(k), 0) + [...c.f.sig].reduce((t, k) => t + 2 * idf(k), 0)
const sharedW = (a, b) => [...a.f.tags].filter(k => b.f.tags.has(k)).reduce((t, k) => t + idf(k), 0) + [...a.f.sig].filter(k => b.f.sig.has(k)).reduce((t, k) => t + 2 * idf(k), 0)

// tiers (SET ON act-math-v20, the break-test file, then checked on held-out
// pairs and controls — see REGISTER 2026-10-08; they are fitted, say so):
//   FLAG  score >= 16 with a shared STRUCTURE (signature, setup literal, declared term)
//   FLAG  score >= 24 on topic tags alone (topic overlap is not mechanism)
//   near  score >= 12   printed for the reader, not counted as a flag
const FLAG = 16, FLAG_TAGS_ONLY = 24, NEAR = 12
let flags = 0, nears = 0
// --pair CAND:livePrefix prints the score and rank of one named pair (break-tests)
for (const [cid, lp] of PAIRS) {
  const c = C.find(x => x.id === cid); const r = L.find(x => String(x.id).startsWith(lp))
  if (!c || !r) { console.error(`REFUSING: --pair ${cid}:${lp} not found (candidate ${!!c}, live ${!!r})`); process.exit(2) }
  const x = score(c, r); const all = L.filter(o => !selfSkip.has(c.id + '|' + o.id)).map(o => score(c, o).s).sort((a, b) => b - a)
  console.log(`PAIR ${cid} ~ ${r.family}/${r.cohort} ${lp}: score ${x.s.toFixed(1)}, rank ${all.indexOf(x.s) + 1} of ${all.length}, ${x.strong ? 'shared structure' : 'tags only'}, ${x.s >= (x.strong ? FLAG : FLAG_TAGS_ONLY) ? 'FLAG' : x.s >= NEAR ? 'near' : 'QUIET'}; terms: ${x.why.map(([k, w]) => `${k} ${w.toFixed(1)}`).join('; ')}`)
}
if (ABL.size) console.log(`ABLATED channels: ${[...ABL].join(', ')} (break-test mode)`)
console.log(`live math rows read: ${live.length} of table count ${exact} ${JSON.stringify(fam)}; excluded by cohort: ${excluded}; scored against ${L.length}`)
console.log(`candidates: ${C.length}; declared-mechanism items: ${C.filter(c => c.f.declared.length).length}; tiers FLAG >= ${FLAG} with shared structure / >= ${FLAG_TAGS_ONLY} tags only, near >= ${NEAR}`)
const tagless = C.filter(c => c.f.tags.size + c.f.sig.size === 0)
if (tagless.length) console.log(`WARNING: ${tagless.length} candidate(s) carry no mechanism term (unscorable by this check): ${tagless.map(c => c.id).join(', ')}`)
for (const c of C) {
  const hits = []
  for (const r of L) { if (selfSkip.has(c.id + '|' + r.id)) continue; const x = score(c, r); if (x.s >= NEAR) hits.push({ ...x, cov: sharedW(c, r) / (ownW(c) || 1), r }) }
  for (const c2 of C) if (c2.id > c.id) { const x = score(c, c2); if (x.s >= NEAR) hits.push({ ...x, cov: sharedW(c, c2) / (ownW(c) || 1), r: { id: c2.id, family: 'WITHIN', cohort: 'batch', domain: c2.domain, prompt: c2.prompt } }) }
  hits.sort((a, b) => b.s - a.s)
  for (const h of hits.slice(0, TOP)) {
    const flag = h.s >= (h.strong ? FLAG : FLAG_TAGS_ONLY); if (flag) flags++; else nears++
    console.log(`${flag ? 'FLAG' : 'near'} ${c.id} [${c.domain}] ~ ${h.r.family}/${h.r.cohort} ${String(h.r.id).slice(0, 8)} [${h.r.domain}] score ${h.s.toFixed(1)} coverage ${(100 * h.cov).toFixed(0)}%`)
    console.log(`      terms: ${h.why.sort((a, b) => b[1] - a[1]).map(([k, w]) => `${k} ${w.toFixed(1)}`).join('; ')}`)
    console.log(`      cand: ${String(c.prompt).slice(0, 150)}`)
    console.log(`      othr: ${String(h.r.prompt).slice(0, 150)}`)
  }
}
console.log(`\n${C.length} candidates x ${L.length} live rows + within-batch: ${flags} FLAG(s), ${nears} near (${NEAR}-${FLAG}), top ${TOP} per candidate. Flags are for a hand read; the reader decides mechanism.`)
process.exit(flags ? 1 : 0)
