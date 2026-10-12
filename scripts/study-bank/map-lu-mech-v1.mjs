#!/usr/bin/env node
/**
 * map-lu-mech-v1.mjs — the whole toolchain for the map-lu-mech-v1 batch
 * (grades 5-8 Language Usage: Capitalization, Punctuation, Grammar/Usage,
 * every item a 2x2 grid). Bars: MAP-LU-MECH-V1.prereg.md, committed before
 * any item existed. Refuses (exit 2) on input it cannot read; exits 1 on a
 * failed bar. Denominators print before verdicts.
 *
 *   select-control            pick the 24-item matched live control (read-only DB), write W/control.json
 *   checks <batch.json>       exact checks: E1 E3 E5 E6 (map-pilot-checks), E7 medoid, E9, G (2x2 grid), T1 (count axis)
 *   teacher-input <batch>     W/teacher.input.json (key marked, 3 distractors per item)
 *   teacher-merge             union of teacher-a/-b NO ratings -> W/revise.input.json
 *   rerate-input              W/rerate.input.json (only the rewritten options of W/revised.json)
 *   freeze                    apply revisions, drop still-NO items, take first 8 per strand -> map-lu-mech-v1.batch.json
 *   render                    W/oo.blind.json + oo.key.json (24 candidates + 24 control), W/ws.md, ws.keyed.md, ws.key.json
 *   score                     all stages + bars + W/stages.json
 *   --selftest                break-test every bar and structural check at its margin
 *
 * W = scripts/study-bank/map-lu-mech-v1/
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { checkItem, dl } from './map-pilot-checks.mjs'
import { periodicity } from './map-pilot-2-checks.mjs'

const D = 'scripts/study-bank/', W = D + 'map-lu-mech-v1/', FROZEN = D + 'map-lu-mech-v1.batch.json'
const SL = ['A', 'B', 'C', 'D']
const STRANDS = { Capitalization: 'cap', Punctuation: 'punct', 'Parts of Speech': 'gram', 'Phrases, Clauses, Agreement, Sentences': 'gram' }
const die = m => { console.error(`REFUSING: ${m}`); process.exit(2) }
const rd = p => { if (!existsSync(p)) die(`missing ${p}`); try { return JSON.parse(readFileSync(p, 'utf8')) } catch (e) { die(`${p} is not JSON: ${e.message}`) } }
const wr = (p, o) => { mkdirSync(W, { recursive: true }); writeFileSync(p, JSON.stringify(o, null, 1) + '\n') }
const strandOf = it => STRANDS[it.map_strand] ?? null

// ---------- seeded rng ----------
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
const shuffleWith = (a, r) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }

// ---------- structural checks ----------
const MARKS = /[.,;:!?'"‘’“”()\-–—…]/g
const capCount = s => (String(s).match(/[A-Z]/g) ?? []).length
const markCount = s => (String(s).match(MARKS) ?? []).length
const tok = s => String(s).trim().split(/\s+/)

/** Key-token indices touched when turning key tokens into option tokens (LCS alignment). */
export function touched(keyS, optS) {
  const a = tok(keyS), b = tok(optS), n = a.length, m = b.length
  const L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1])
  const out = new Set(); let i = 0, j = 0
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) { i++; j++ }
    else if (j < m && (i === n || L[i][j + 1] >= L[i + 1][j])) { out.add(`ins@${i}`); j++ }
    else { out.add(`tok${i}`); i++ }
  }
  return out
}
/** G: the four options form a 2x2 grid around the key. */
export function grid(it) {
  const ch = it.choices.map(String), k = ch.indexOf(String(it.correct_answer))
  if (k < 0 || new Set(ch).size !== 4) return { ok: false, why: 'key missing or duplicate options' }
  const sets = ch.map((c, i) => (i === k ? null : touched(ch[k], c)))
  const others = sets.map((s, i) => [i, s]).filter(([, s]) => s)
  // the "both" option is the one whose touched set is the largest; the two singles must be disjoint and union to it
  others.sort((x, y) => y[1].size - x[1].size)
  const [[, both], [, s1], [, s2]] = others
  if (!s1.size || !s2.size) return { ok: false, why: 'a single-error option equals the key' }
  const inter = [...s1].filter(x => s2.has(x))
  if (inter.length) return { ok: false, why: `the two single-error options overlap at ${inter.join(',')}` }
  const uni = new Set([...s1, ...s2])
  const same = uni.size === both.size && [...uni].every(x => both.has(x))
  if (!same) return { ok: false, why: `the both-errors option is not the union of the two singles (${[...both].join(',')} vs ${[...uni].join(',')})` }
  return { ok: true }
}
/** T1: is the key the UNIQUE max or min on the strand's count axis? */
export function countAxis(it) {
  const s = strandOf(it)
  const f = s === 'cap' ? capCount : s === 'punct' ? markCount : (x => String(x).length)
  const v = it.choices.map(f), kv = f(it.correct_answer)
  const mx = Math.max(...v), mn = Math.min(...v)
  return { uniqueMax: kv === mx && v.filter(x => x === mx).length === 1, uniqueMin: kv === mn && v.filter(x => x === mn).length === 1 }
}
/** E7: no option is the unique medoid (summed Damerau-Levenshtein to the other three). */
export function medoid(it) {
  const ch = it.choices.map(String)
  const sums = ch.map((a, i) => ch.reduce((s, b, j) => s + (i === j ? 0 : dl(a, b)), 0))
  const min = Math.min(...sums), at = sums.map((x, i) => (x === min ? i : -1)).filter(i => i >= 0)
  return { unique: at.length === 1, uniqueIsKey: at.length === 1 && at[0] === ch.indexOf(String(it.correct_answer)) }
}
const stripP = s => String(s).replace(MARKS, '').replace(/\s+/g, ' ').trim()
export function structural(it) {
  const errs = []
  const s = strandOf(it)
  if (!s) errs.push(`unknown map_strand ${it.map_strand}`)
  const base = checkItem({ ...it, map_strand: it.map_strand === 'Capitalization' ? 'Capitalization' : 'x' })
  errs.push(...base.errs)
  if (s === 'punct') {
    if (new Set(it.choices.map(stripP)).size !== 1) errs.push('E9 options differ beyond punctuation')
    if (!it.punct_rule) errs.push('E9 punct_rule missing')
  }
  if (s === 'gram' && !it.varied_dimension) errs.push('varied_dimension missing')
  if (![5, 6, 7, 8].includes(it.grade_target)) errs.push(`grade_target ${it.grade_target} not 5-8`)
  if (!new RegExp(`^L\\.${it.grade_target}\\.`).test(String(it.ccss ?? ''))) errs.push(`ccss ${it.ccss} is not a grade-${it.grade_target} code`)
  const g = grid(it); if (!g.ok) errs.push(`G ${g.why}`)
  const m = medoid(it); if (m.unique) errs.push(`E7 option is the unique medoid${m.uniqueIsKey ? ' (the KEY)' : ''}`)
  return { errs, e1: base.e1 }
}
export function batchChecks(items) {
  const errs = []
  const per = {}
  let longest = 0, shortest = 0
  for (const it of items) {
    const L = it.choices.map(c => String(c).length), kl = String(it.correct_answer).length
    if (kl === Math.max(...L) && L.filter(x => x === kl).length === 1) longest++
    if (kl === Math.min(...L) && L.filter(x => x === kl).length === 1) shortest++
    const s = strandOf(it), c = countAxis(it), p = (per[s] ??= { n: 0, ext: 0 })
    p.n++; if (c.uniqueMax || c.uniqueMin) p.ext++
  }
  const n = items.length
  if (longest / n > 0.25) errs.push(`E3 key uniquely longest ${longest}/${n}`)
  if (shortest / n > 0.25) errs.push(`E3 key uniquely shortest ${shortest}/${n}`)
  for (const [s, p] of Object.entries(per)) if (p.ext / p.n > 0.25) errs.push(`T1 ${s}: key the unique extreme on its count axis ${p.ext}/${p.n} (> 25%)`)
  for (const [f, lab] of [['cap_rule', 'cap'], ['punct_rule', 'punct'], ['varied_dimension', 'gram']]) {
    const v = items.filter(i => strandOf(i) === lab).map(i => String(i[f] ?? '').toLowerCase().trim())
    if (new Set(v).size !== v.length) errs.push(`${f} repeats within ${lab}`)
  }
  return { errs, longest, shortest, n, per }
}

// ---------- bars ----------
export function wsItem(cold, keyed, letter) {
  const why = []
  for (const [t, g] of cold) {
    if (g.pick !== letter) why.push(`${t} picked ${g.pick}!=${letter}`)
    if (g.second_defensible && g.second_defensible !== 'none') why.push(`${t} 2nd ${g.second_defensible}`)
    if (g.grade_fit !== 'fits') why.push(`${t} ${g.grade_fit}`)
  }
  const dd = cold.map(([, g]) => new Set([].concat(g.dead_distractors ?? []).map(String).filter(x => /^[A-D]$/.test(x))))
  const deadBoth = [...dd[0]].filter(x => dd[1].has(x))
  if (deadBoth.length) why.push(`dead by both ${deadBoth.join(',')}`)
  for (const [t, k] of keyed) {
    if (k.key_verdict !== 'correct') why.push(`${t} keyed: key ${k.key_verdict}`)
    if (k.accepted_alternative && k.accepted_alternative !== 'none') why.push(`${t} keyed: alternative ${k.accepted_alternative}`)
  }
  return { pass: why.length === 0, why, deadBoth }
}
export function bars(r) {
  const mean = d => d.reduce((a, b) => a + b, 0) / d.length
  const ma = mean(r.diffs.a), mb = mean(r.diffs.b)
  const ooValid = r.ctlPct >= 25
  return {
    b: r.pass >= 20,
    c: r.easier <= 8 && r.harder < 12,
    d: Math.abs(ma) <= 0.5 && Math.abs(mb) <= 0.5,
    oo: ooValid && r.candPct >= r.ctlPct - 10,
    ooValid, ma, mb,
  }
}

function selftest() {
  let fail = 0
  const expect = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fail++ }
  const z = (n, v) => Array(n).fill(v)
  const base = { pass: 24, easier: 0, harder: 0, diffs: { a: z(24, 0), b: z(24, 0) }, candPct: 90, ctlPct: 70 }
  expect(bars({ ...base, pass: 20 }).b && !bars({ ...base, pass: 19 }).b, 'S1-b: 20 passes, 19 fails')
  expect(bars({ ...base, easier: 8, harder: 11 }).c && !bars({ ...base, easier: 9 }).c && !bars({ ...base, harder: 12 }).c, 'S1-c: 8/11 passes; easier 9 fails; harder 12 fails')
  expect(bars({ ...base, diffs: { a: [...z(12, -1), ...z(12, 0)], b: z(24, 0) } }).d, 'S1-d: mean -0.5 passes')
  expect(!bars({ ...base, diffs: { a: z(24, 0), b: [...z(13, 1), ...z(11, 0)] } }).d, 'S1-d: grader b +0.54 fails')
  expect(bars({ ...base, candPct: 60, ctlPct: 70 }).oo && !bars({ ...base, candPct: 59.9, ctlPct: 70 }).oo, 'S2: candidate 60 vs control 70 passes, 59.9 fails')
  expect(!bars({ ...base, candPct: 100, ctlPct: 24.9 }).oo && !bars({ ...base, ctlPct: 24.9 }).ooValid, 'S2: control below 25% is INVALID and cannot pass')
  const g = (pick, x = {}) => ({ pick, second_defensible: null, grade_fit: 'fits', grade_assigned: 6, dead_distractors: [], ...x })
  const k = (x = {}) => ({ key_verdict: 'correct', accepted_alternative: null, ...x })
  expect(wsItem([['a', g('B')], ['b', g('B')]], [['a', k()], ['b', k()]], 'B').pass, 'pilot-pass: clean item passes')
  expect(!wsItem([['a', g('B', { dead_distractors: ['C'] })], ['b', g('B', { dead_distractors: ['C'] })]], [['a', k()], ['b', k()]], 'B').pass, 'c4: dead by both fails')
  expect(wsItem([['a', g('B', { dead_distractors: ['C'] })], ['b', g('B', { dead_distractors: ['D'] })]], [['a', k()], ['b', k()]], 'B').pass, 'c4: dead by one each passes')
  expect(!wsItem([['a', g('B')], ['b', g('B')]], [['a', k({ key_verdict: 'disputed' })], ['b', k()]], 'B').pass, 'c5: one keyed dispute fails')
  expect(!wsItem([['a', g('B')], ['b', g('B')]], [['a', k({ accepted_alternative: 'A' })], ['b', k()]], 'B').pass, 'c5: an accepted alternative fails')
  expect(!wsItem([['a', g('B', { grade_fit: 'too_easy' })], ['b', g('B')]], [['a', k()], ['b', k()]], 'B').pass, 'c3: too_easy fails')
  // structural
  const capOk = { map_strand: 'Capitalization', choices: ['We saw Lake Erie in the summer.', 'We saw Lake erie in the summer.', 'We saw Lake Erie in the Summer.', 'We saw Lake erie in the Summer.'], correct_answer: 'We saw Lake Erie in the summer.' }
  expect(grid(capOk).ok, 'G: a clean capitalization 2x2 passes')
  const capBad = { ...capOk, choices: ['We saw Lake Erie in the summer.', 'We saw Lake erie in the summer.', 'We saw Lake Erie in the Summer.', 'We saw lake Erie in the Summer.'] }
  expect(!grid(capBad).ok, `G: a both-option on the wrong site FAILS (${grid(capBad).why})`)
  const punctOk = { map_strand: 'Punctuation', choices: ['After the game, we ate, and Sam left.', 'After the game we ate, and Sam left.', 'After the game, we ate and Sam, left.', 'After the game we ate and Sam, left.'], correct_answer: 'After the game, we ate, and Sam left.' }
  expect(grid(punctOk).ok, `G: a clean punctuation 2x2 passes ${grid(punctOk).why ?? ''}`)
  const gramOk = { map_strand: 'Parts of Speech', choices: ['She and I have finished the mural.', 'Her and I have finished the mural.', 'She and I has finished the mural.', 'Her and I has finished the mural.'], correct_answer: 'She and I have finished the mural.' }
  expect(grid(gramOk).ok, 'G: a clean grammar 2x2 passes')
  expect(!grid({ ...gramOk, choices: ['She and I have finished the mural.', 'Her and I have finished the mural.', 'She and me have finished the mural.', 'Her and me has finished the mural.'] }).ok, 'G: overlapping single sites FAIL')
  const underUnder = { map_strand: 'Capitalization', choices: ['We met Aunt Rosa in Ohio.', 'We met aunt Rosa in Ohio.', 'We met Aunt Rosa in ohio.', 'We met aunt Rosa in ohio.'], correct_answer: 'We met Aunt Rosa in Ohio.' }
  expect(countAxis(underUnder).uniqueMax, 'T1: two under-capitalization sites make the key the unique max')
  expect(!countAxis(capOk).uniqueMax && !countAxis(capOk).uniqueMin, 'T1: one under + one over ties the key with both-errors')
  const tb = batchChecks([underUnder, underUnder, underUnder, capOk].map(x => ({ ...x, cap_rule: Math.random().toString() })))
  expect(tb.errs.some(e => e.startsWith('T1')), 'T1: 3/4 unique extremes in a strand FAILS the batch')
  expect(touched('a b c', 'a b, c').has('tok1'), 'touched: a changed token is recorded')
  console.log(fail ? `SELFTEST FAILED (${fail})` : 'selftest passed: every bar and structural check can fail at its margin')
  process.exit(fail ? 1 : 0)
}

// ---------- modes ----------
const [mode, arg] = process.argv.slice(2)
const isMain = import.meta.url === `file://${process.argv[1]}`
if (!isMain) { /* imported */ }
else if (mode === '--selftest') selftest()
else if (mode === 'select-control') {
  const { createClient } = await import('@supabase/supabase-js')
  const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const rows = []
  for (const [fam, sec, dom] of [['sat', 'reading_writing', 'Standard English Conventions'], ['act', 'english', 'Conventions of Standard English']]) {
    for (let from = 0; ; from += 1000) {
      const { data, error } = await db.from('study_item_bank').select('id,family,section,domain,subskill,difficulty,item').eq('family', fam).eq('section', sec).eq('domain', dom).eq('verified', true).eq('archived', false).in('difficulty', ['easy', 'medium']).order('id').range(from, from + 999)
      if (error) die(error.message)
      rows.push(...data); if (data.length < 1000) break
    }
  }
  if (rows.length < 200) die(`only ${rows.length} live conventions rows read`)
  const PUNCT = /punctuat|boundar|comma|semicolon|colon|dash|apostroph|possessive|splice|run-on|parenthe|quotation/i, FRAG = /fragment/i
  const four = rows.filter(r => Array.isArray(r.item?.choices) && r.item.choices.length === 4 && r.item.choices.includes(r.item.correct_answer))
  const h = r => createHash('sha256').update('map-lu-mech-v1-control:' + r.id).digest('hex')
  const punct = four.filter(r => !FRAG.test(r.subskill ?? '') && PUNCT.test(r.subskill ?? '')).sort((a, b) => h(a) < h(b) ? -1 : 1).slice(0, 12)
  const gram = four.filter(r => FRAG.test(r.subskill ?? '') || !PUNCT.test(r.subskill ?? '')).sort((a, b) => h(a) < h(b) ? -1 : 1).slice(0, 12)
  if (punct.length !== 12 || gram.length !== 12) die('could not fill 12 + 12')
  const ctl = [...punct.map(r => ({ ...r, ctl: 'punct' })), ...gram.map(r => ({ ...r, ctl: 'gram' }))].map(r => ({ id: r.id, family: r.family, domain: r.domain, subskill: r.subskill, difficulty: r.difficulty, ctl: r.ctl, choices: r.item.choices, correct_answer: r.item.correct_answer }))
  wr(W + 'control.json', ctl)
  const hist = {}; for (const c of ctl) { const k = `${c.family}/${c.ctl}/${c.difficulty}`; hist[k] = (hist[k] ?? 0) + 1 }
  console.log(`control: ${ctl.length} of ${four.length} eligible four-choice live conventions rows (easy+medium); ${JSON.stringify(hist)}`)
}
else if (mode === 'checks') {
  if (!arg) die('usage: checks <batch.json>')
  const items = rd(arg)
  if (!Array.isArray(items) || !items.length) die(`${arg} holds no items`)
  let bad = 0, scored = 0, unsc = 0
  for (const it of items) {
    const r = structural(it); scored += r.e1.scored.length; unsc += r.e1.unscorable
    console.log(`${r.errs.length ? 'FAIL' : 'ok  '} ${it.id} [${it.map_strand} g${it.grade_target} ${it.ccss}]${r.errs.length ? '\n       x ' + r.errs.join('\n       x ') : ''}`)
    if (r.errs.length) bad++
  }
  const b = batchChecks(items)
  console.log(`\nE1 denominator: ${scored} scored units (>= 15 words), ${unsc} unscorable`)
  console.log(`E3 key uniquely longest ${b.longest}/${b.n}, uniquely shortest ${b.shortest}/${b.n}; T1 per strand ${JSON.stringify(b.per)}`)
  for (const e of b.errs) console.log(`BATCH FAIL ${e}`)
  console.log(bad || b.errs.length ? `\n${bad} item(s) fail, ${b.errs.length} batch failure(s)` : `\nall ${items.length} items pass every exact check`)
  process.exit(bad || b.errs.length ? 1 : 0)
}
else if (mode === 'teacher-input') {
  const items = rd(arg ?? W + 'batch.authored.json')
  wr(W + 'teacher.input.json', items.map(it => ({ id: it.id, grade_target: it.grade_target, strand: it.map_strand, prompt: it.prompt, correct_answer: it.correct_answer, wrong_options: it.choices.filter(c => c !== it.correct_answer) })))
  console.log(`teacher input: ${items.length} items, ${items.length * 3} wrong options`)
}
else if (mode === 'teacher-merge') {
  const items = rd(W + 'batch.authored.json'), ta = rd(W + 'teacher-a.json'), tb = rd(W + 'teacher-b.json')
  const out = []
  let n = 0, noA = 0, noB = 0
  for (const it of items) {
    const ra = ta[it.id]?.distractors, rb = tb[it.id]?.distractors
    if (ra?.length !== 3 || rb?.length !== 3) die(`${it.id}: a teacher file lacks 3 ratings`)
    const no = []
    for (const opt of it.choices.filter(c => c !== it.correct_answer)) {
      n++
      const a = ra.find(d => d.option === opt), b = rb.find(d => d.option === opt)
      if (!a || !b) die(`${it.id}: rating missing for "${opt.slice(0, 40)}"`)
      if (a.would_pick !== 'yes') noA++
      if (b.would_pick !== 'yes') noB++
      if (a.would_pick !== 'yes' || b.would_pick !== 'yes') no.push({ option: opt, reasons: [a, b].filter(x => x.would_pick !== 'yes').map(x => x.reason) })
    }
    if (no.length) out.push({ item: it, rated_no: no })
  }
  wr(W + 'revise.input.json', out)
  console.log(`teacher round 1: ${n} wrong options; rater a NO ${noA}, rater b NO ${noB}; union NO ${out.reduce((s, x) => s + x.rated_no.length, 0)} on ${out.length} items -> revise.input.json`)
}
else if (mode === 'rerate-input') {
  const rev = rd(W + 'revised.json'), orig = Object.fromEntries(rd(W + 'batch.authored.json').map(i => [i.id, i]))
  const out = rev.map(it => ({ id: it.id, grade_target: it.grade_target, strand: it.map_strand, prompt: it.prompt, correct_answer: it.correct_answer, wrong_options: it.choices.filter(c => c !== it.correct_answer && !orig[it.id].choices.includes(c)) })).filter(x => x.wrong_options.length)
  wr(W + 'rerate.input.json', out)
  console.log(`re-rate input: ${out.length} items, ${out.reduce((s, x) => s + x.wrong_options.length, 0)} rewritten options`)
}
else if (mode === 'freeze') {
  const authored = rd(W + 'batch.authored.json')
  const rev = existsSync(W + 'revised.json') ? Object.fromEntries(rd(W + 'revised.json').map(i => [i.id, i])) : {}
  const dropped = []
  if (Object.keys(rev).length) {
    const ra = rd(W + 'rerate-a.json'), rb = rd(W + 'rerate-b.json')
    for (const id of Object.keys(rev)) {
      const orig = authored.find(i => i.id === id)
      const newOpts = rev[id].choices.filter(c => c !== rev[id].correct_answer && !orig.choices.includes(c))
      for (const opt of newOpts) {
        const a = ra[id]?.distractors?.find(d => d.option === opt), b = rb[id]?.distractors?.find(d => d.option === opt)
        if (!a || !b) die(`${id}: re-rate missing for "${opt.slice(0, 40)}"`)
        if (a.would_pick !== 'yes' || b.would_pick !== 'yes') { dropped.push(`${id} (rewrite still rated no: "${opt.slice(0, 50)}")`); break }
      }
    }
  }
  const after = authored.map(i => rev[i.id] ?? i).filter(i => !dropped.some(d => d.startsWith(i.id + ' ')))
  const repairs = existsSync(W + 'repairs.json') ? rd(W + 'repairs.json') : {}
  const fixed = after.map(i => repairs[i.id] ?? i)
  const exactFail = fixed.filter(i => structural(i).errs.length).map(i => `${i.id} (exact: ${structural(i).errs[0]})`)
  const survivors = fixed.filter(i => !structural(i).errs.length)
  const pick = []
  for (const s of ['Capitalization', 'Punctuation']) pick.push(...survivors.filter(i => i.map_strand === s).slice(0, 8))
  pick.push(...survivors.filter(i => strandOf(i) === 'gram').slice(0, 8))
  const counts = { cap: pick.filter(i => strandOf(i) === 'cap').length, punct: pick.filter(i => strandOf(i) === 'punct').length, gram: pick.filter(i => strandOf(i) === 'gram').length }
  console.log(`dropped at teacher re-rate: ${dropped.length ? dropped.join('; ') : 'none'}`)
  console.log(`failing exact checks after repairs: ${exactFail.length ? exactFail.join('; ') : 'none'}`)
  console.log(`survivors ${survivors.length}/28; frozen per strand ${JSON.stringify(counts)}; grades ${JSON.stringify(pick.reduce((o, i) => (o[i.grade_target] = (o[i.grade_target] ?? 0) + 1, o), {}))}`)
  if (counts.cap < 8 || counts.punct < 8 || counts.gram < 8) { console.log('STAGE 0 FAIL: fewer than 8 survivors in a strand. Nothing frozen.'); process.exit(1) }
  const b = batchChecks(pick)
  if (b.errs.length) { console.log(`STAGE 0 FAIL: frozen 24 fail batch checks: ${b.errs.join('; ')}. Nothing frozen.`); process.exit(1) }
  writeFileSync(FROZEN, JSON.stringify(pick, null, 1) + '\n')
  console.log(`FROZEN ${pick.length} items -> ${FROZEN}; sha256 ${createHash('sha256').update(readFileSync(FROZEN)).digest('hex')}`)
}
else if (mode === 'render') {
  const cand = rd(FROZEN), ctl = rd(W + 'control.json')
  if (cand.length !== 24 || ctl.length !== 24) die(`need 24 + 24, have ${cand.length} + ${ctl.length}`)
  const place = (choices, key, letter, r) => { const rest = shuffleWith(choices.filter(c => c !== key), r); let q = 0; return Object.fromEntries(SL.map(s => [s, s === letter ? key : rest[q++]])) }
  const flat = (n, r) => shuffleWith(Array.from({ length: n }, (_, i) => SL[i % 4]), r)
  // options-only: one file, candidates and control interleaved, keys flat per arm, E8-clean
  const all = [...cand.map(i => ({ ...i, arm: 'cand' })), ...ctl.map(i => ({ ...i, arm: 'ctl' }))]
  let seed = 20261012, tries = 0, order, letters, r
  for (;;) {
    tries++; r = rng(seed++); order = shuffleWith(all.slice(), r)
    const q = { cand: flat(24, r), ctl: flat(24, r) }
    letters = order.map(x => q[x.arm].pop())
    if (!periodicity(letters.join('')).fail) break
    if (tries > 500) die('no E8-clean oo deal')
  }
  const blind = {}, okey = {}
  order.forEach((it, i) => { const id = `Q${String(i + 1).padStart(2, '0')}`; blind[id] = { options: place(it.choices.map(String), String(it.correct_answer), letters[i], r) }; okey[id] = { letter: letters[i], arm: it.arm, localId: it.id, strand: it.arm === 'cand' ? strandOf(it) : it.ctl } })
  wr(W + 'oo.blind.json', blind); wr(W + 'oo.key.json', okey)
  console.log(`oo render: 48 items, seeds tried ${tries}, sequence ${letters.join('')}`)
  // with-source: candidates only, flat keys
  seed = 20261013; tries = 0
  for (;;) { tries++; r = rng(seed++); order = shuffleWith(cand.slice(), r); letters = flat(24, r); if (!periodicity(letters.join('')).fail) break; if (tries > 500) die('no E8-clean ws deal') }
  const md = ['# Items for review (24)\n\nEach item: strand, target grade, question, four options. The correct answer is NOT marked.\n'], mdk = ['# Items for review (24), KEYED\n\nThe same 24 items in the same order, now with the intended answer marked.\n'], wkey = {}
  order.forEach((it, i) => {
    const n = i + 1, opts = place(it.choices.map(String), String(it.correct_answer), letters[i], r)
    wkey[n] = { letter: letters[i], localId: it.id, strand: strandOf(it), grade_target: it.grade_target, choices: SL.map(s => opts[s]) }
    const head = `---\n\n## Item ${n}\n\nStrand: ${it.map_strand} | Target grade: ${it.grade_target}\n\nQuestion: ${it.prompt}\n\n${SL.map(s => `${s}. ${opts[s]}`).join('\n')}\n`
    md.push(head); mdk.push(head + `\nIntended answer: **${letters[i]}**\n`)
  })
  writeFileSync(W + 'ws.md', md.join('\n')); writeFileSync(W + 'ws.keyed.md', mdk.join('\n')); wr(W + 'ws.key.json', wkey)
  const slots = letters.reduce((o, l) => (o[l] = (o[l] ?? 0) + 1, o), {})
  console.log(`ws render: 24 items, seeds tried ${tries}, key slots ${JSON.stringify(slots)}, sequence ${letters.join('')}`)
}
else if (mode === 'score') {
  const okey = rd(W + 'oo.key.json'), ids = Object.keys(okey)
  const sol = ['a', 'b', 'c'].map(s => rd(W + `oo.solver-${s}.json`))
  for (const [i, s] of sol.entries()) { const miss = ids.filter(id => !/^[A-D]$/.test(s[id]?.pick ?? '')); if (miss.length) die(`solver ${'abc'[i]} missing ${miss.length} picks`) }
  const arm = {}
  const flags = []
  for (const id of ids) {
    const k = okey[id], picks = sol.map(s => s[id].pick), h = picks.filter(p => p === k.letter).length
    const a = (arm[k.arm] ??= { n: 0, hits: 0, unan: 0, unanKey: 0, byStrand: {} }); a.n++; a.hits += h
    if (new Set(picks).size === 1) { a.unan++; if (h === 3) a.unanKey++; else if (k.arm === 'cand') flags.push(`${k.localId} unanimous on ${picks[0]} (key ${k.letter})`) }
    const bs = (a.byStrand[k.strand] ??= { n: 0, hits: 0 }); bs.n++; bs.hits += h
  }
  if (arm.cand?.n !== 24 || arm.ctl?.n !== 24) die('oo arms are not 24 + 24')
  const pct = a => 100 * a.hits / (3 * a.n)
  console.log(`OPTIONS-ONLY (stems withheld), 3 samples of one Claude solver; denominators: candidates 24 x 3 = 72 picks, control 24 x 3 = 72 picks`)
  for (const [n, a] of Object.entries(arm)) console.log(`  ${n.padEnd(4)} ${pct(a).toFixed(1)}% on key; unanimous ${a.unan}/24 (on key ${a.unanKey}); by strand ${Object.entries(a.byStrand).map(([s, b]) => `${s} ${(100 * b.hits / (3 * b.n)).toFixed(1)}% (n=${b.n})`).join(', ')}`)
  console.log(`  candidate items unanimous on a NON-key letter: ${flags.length ? flags.join('; ') : 'none'}`)

  const wkey = rd(W + 'ws.key.json'), wids = Object.keys(wkey)
  const cold = ['a', 'b'].map(t => [t, rd(W + `ws.grader-${t}.json`)]), keyed = ['a', 'b'].map(t => [t, rd(W + `ws.keyed-${t}.json`)])
  for (const [t, g] of cold) { const miss = wids.filter(i => !/^[A-D]$/.test(g[i]?.pick ?? '') || !['fits', 'too_easy', 'too_hard'].includes(g[i]?.grade_fit) || !Number.isFinite(+g[i]?.grade_assigned)); if (miss.length) die(`cold grader ${t} incomplete on ${miss.join(',')}`) }
  for (const [t, g] of keyed) { const miss = wids.filter(i => !['correct', 'wrong', 'disputed'].includes(g[i]?.key_verdict)); if (miss.length) die(`keyed grader ${t} incomplete on ${miss.join(',')}`) }
  if (wids.length !== 24) die(`with-source has ${wids.length} items`)
  console.log(`\nWITH-SOURCE, two fresh Claude graders, cold then keyed; denominators: 24 items x 2 graders = 48 judgements per stage`)
  const S = { pass: 0, easier: 0, harder: 0, diffs: { a: [], b: [] }, byStrand: {}, byGrade: {}, deadBoth: 0, coldOnKey: 0, passIds: [], holds: [] }
  for (const id of wids) {
    const k = wkey[id]
    const r = wsItem(cold.map(([t, g]) => [t, g[id]]), keyed.map(([t, g]) => [t, g[id]]), k.letter)
    if (r.pass) { S.pass++; S.passIds.push(k.localId) } else S.holds.push(`${k.localId}: ${r.why.join('; ')}`)
    if (r.deadBoth.length) S.deadBoth++
    for (const [t, g] of cold) {
      if (g[id].pick === k.letter) S.coldOnKey++
      const d = +g[id].grade_assigned - k.grade_target
      S.diffs[t].push(d); if (d < 0) S.easier++; if (d > 0) S.harder++
    }
    const bs = (S.byStrand[k.strand] ??= { n: 0, pass: 0 }); bs.n++; if (r.pass) bs.pass++
    const bg = (S.byGrade[k.grade_target] ??= { n: 0, pass: 0 }); bg.n++; if (r.pass) bg.pass++
  }
  const B = bars({ pass: S.pass, easier: S.easier, harder: S.harder, diffs: S.diffs, candPct: pct(arm.cand), ctlPct: pct(arm.ctl) })
  for (const h of S.holds) console.log(`  HOLD ${h}`)
  console.log(`  cold picks on key ${S.coldOnKey}/48; items with an option dead by both ${S.deadBoth}/24`)
  console.log(`  by strand ${JSON.stringify(S.byStrand)}; by grade ${JSON.stringify(S.byGrade)}`)
  const ex = rd(FROZEN), b = batchChecks(ex), itemFails = ex.filter(i => structural(i).errs.length).length
  console.log(`\nBARS (MAP-LU-MECH-V1.prereg.md)`)
  console.log(`  S1-a exact checks on the frozen 24: ${itemFails === 0 && !b.errs.length ? 'PASS' : 'FAIL'} (${itemFails} item failures; ${b.errs.join('; ') || 'no batch failures'}); E3 longest ${b.longest}/24, shortest ${b.shortest}/24; T1 ${JSON.stringify(b.per)}`)
  console.log(`  S1-b pilot-pass c1-c5 ${S.pass}/24 (bar >= 20; range 0-24) -> ${B.b ? 'PASS' : 'FAIL'}`)
  console.log(`  S1-c easier ${S.easier}/48 (bar <= 8), harder ${S.harder}/48 (bar < 12) -> ${B.c ? 'PASS' : 'FAIL'}`)
  console.log(`  S1-d mean grade offset a ${B.ma.toFixed(2)}, b ${B.mb.toFixed(2)} (bar within +-0.5) -> ${B.d ? 'PASS' : 'FAIL'}`)
  console.log(`  S2 options-only key recoverability: candidates ${pct(arm.cand).toFixed(1)}% vs control ${pct(arm.ctl).toFixed(1)}% (bar: candidate >= control - 10; control must be >= 25% or the stage is INVALID) -> ${!B.ooValid ? 'INVALID' : B.oo ? 'PASS' : 'FAIL'}`)
  const wslots = Object.values(wkey).reduce((o, k) => (o[k.letter] = (o[k.letter] ?? 0) + 1, o), {})
  const slotOk = Math.max(...Object.values(wslots)) / 24 <= 0.35
  console.log(`  T key slots in the stored (with-source) order ${JSON.stringify(wslots)} (bar no slot > 35%) -> ${slotOk ? 'PASS' : 'FAIL'}`)
  const exactOk = itemFails === 0 && !b.errs.length
  const all = exactOk && B.b && B.c && B.d && B.oo && slotOk
  console.log(`\nVERDICT: ${all ? `PASS - insert the ${S.pass} pilot-pass items STAGED (verified=false)` : 'FAIL - nothing inserted'}`)
  wr(W + 'stages.json', { verdict: all ? 'PASS' : 'FAIL', passIds: S.passIds, holds: S.holds, oo: { cand: pct(arm.cand), ctl: pct(arm.ctl), unanCand: arm.cand.unan, unanCtl: arm.ctl.unan, unanKeyCand: arm.cand.unanKey, flags }, ws: { pass: S.pass, easier: S.easier, harder: S.harder, ma: B.ma, mb: B.mb, coldOnKey: S.coldOnKey, deadBoth: S.deadBoth, byStrand: S.byStrand, byGrade: S.byGrade }, exact: { ok: exactOk, longest: b.longest, shortest: b.shortest, t1: b.per }, slots: wslots, bars: { b: B.b, c: B.c, d: B.d, oo: B.oo, ooValid: B.ooValid, slot: slotOk } })
  process.exit(all ? 0 : 1)
}
else die('usage: map-lu-mech-v1.mjs select-control|checks|teacher-input|teacher-merge|rerate-input|freeze|render|score|--selftest')
