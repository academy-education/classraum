#!/usr/bin/env node
/**
 * reading-cal.mjs — READING-BAR-CALIBRATION-2026-10-07 (Stage A): how does the LIVE SSAT / ISEE
 * reading bank score on the with-source graders whose ABSOLUTE bars the agent pilots failed?
 * Pre-registration: READING-BAR-CALIBRATION-2026-10-07.prereg.md. Measurement only; no authoring.
 *
 *   draw                 seeded, cohort-stratified, whole-passage-group draw of live verified rows
 *                        -> reading-cal/sample.json (frozen snapshot incl. content sha)
 *   render               ssat/withsource.json + ssat/ws.key.json (pilot 4 format, 5 choices)
 *                        isee/ws.md + isee/ws.key.json (MAP pilot 7 format, grade 8, RIT 210-219)
 *                        ssat/naturalness.json, isee/naturalness.json (+ .key.json)
 *   score ssat|isee      every rate with its n, Wilson 95% interval, and the pilot bar it is read against
 *   nat ssat|isee        naturalness medians (reported; the pilots' E bars were already relative)
 *   --selftest           break every rate and verdict at its margin; refuse on short/malformed input
 *
 * Every reader refuses (exit 2) on a missing file, a missing field, or a short population, and prints
 * denominators before verdicts (CLAUDE.md: a check that cannot read its input must not return a number).
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { rng, shuffleWith } from './seeded-shuffle.mjs'
import { wsItem } from './map-pilot-3-score.mjs'
import { qBar } from './misread.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const O = join(HERE, 'reading-cal')
const SEED = 'reading-cal-2026-10-07'
const TARGET = 24
const die = m => { console.error(`REFUSING: ${m}`); process.exit(2) }
const sha = s => createHash('sha256').update(s).digest('hex')
const rd = p => { if (!existsSync(p)) die(`missing ${p}`); return JSON.parse(readFileSync(p, 'utf8')) }
const lab = j => j.labels ?? j
const bandLo = b => { const m = String(b ?? '').match(/(\d{3})\s*-\s*(\d{3})/); return m ? +m[1] : null }
const RANK = { easy: 1, medium: 2, hard: 3 }
const QUAL = ['strong', 'plausible', 'weak', 'dead']

// ---------- pure functions (selftested) ----------
export function wilson(k, n, z = 1.96) {
  if (!n) return [NaN, NaN]
  const p = k / n, d = 1 + z * z / n, c = (p + z * z / (2 * n)) / d, h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
  return [100 * Math.max(0, c - h), 100 * Math.min(1, c + h)]
}
/** dir 'ge': the rate must be >= t to pass; 'le': <= t; 'lt': < t. Material = the whole Wilson interval is on one side. */
export function verdict(k, n, t, dir) {
  if (!n) return { rate: NaN, verdict: 'NO MEASUREMENT', material: false }
  const rate = 100 * k / n, [lo, hi] = wilson(k, n)
  const ok = dir === 'ge' ? rate >= t - 1e-9 : dir === 'le' ? rate <= t + 1e-9 : rate < t - 1e-9
  const matFail = dir === 'ge' ? hi < t - 1e-9 : dir === 'le' ? lo > t + 1e-9 : lo >= t - 1e-9
  const matPass = dir === 'ge' ? lo >= t - 1e-9 : dir === 'le' ? hi <= t + 1e-9 : hi < t - 1e-9
  return { rate, lo, hi, verdict: ok ? 'PASS' : 'FAIL', material: ok ? matPass : matFail }
}
/** largest-remainder allocation of `total` over counts */
export function allocate(counts, total) {
  const sum = Object.values(counts).reduce((a, b) => a + b, 0)
  const raw = Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, total * v / sum]))
  const out = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Math.floor(v)]))
  let left = total - Object.values(out).reduce((a, b) => a + b, 0)
  for (const [k] of Object.entries(raw).sort((a, b) => (b[1] % 1) - (a[1] % 1) || a[0].localeCompare(b[0]))) { if (left-- <= 0) break; out[k]++ }
  return out
}
/** SSAT item from two pilot-4(+option_quality) grader labels. key letter k, width 5. */
export function ssatItem(g, k, letters = 'ABCDE') {
  const sd = v => v.second_defensible && v.second_defensible !== 'none' && v.second_defensible !== v.pick
  const excl = g.every(v => v.pick === k && !sd(v))
  const mean = g.reduce((a, v) => a + RANK[v.difficulty], 0) / g.length
  const distractors = [...letters].filter(x => x !== k)
  const dead = g.map(v => new Set(distractors.filter(d => v.pick !== d && v.option_quality?.[d] === 'dead')))
  const deadBoth = [...dead[0]].filter(x => dead.slice(1).every(s => s.has(x)))
  const easy = mean <= 1.5, hard = mean >= 2.5
  return { excl, easy, hard, mean, deadBoth, pass: excl && !easy && deadBoth.length === 0, qrows: g.map(v => ({ labels: v.option_quality, pick: v.pick, distractorLetters: distractors })) }
}
export function validSsatLabel(v, letters = 'ABCDE') {
  if (!v || !letters.includes(v.pick ?? '') || !RANK[v.difficulty]) return false
  const oq = v.option_quality; if (!oq || typeof oq !== 'object') return false
  return [...letters].filter(x => x !== v.pick).every(x => QUAL.includes(oq[x]))
}
export function validMapLabel(v) {
  if (!v || !/^[A-D]$/.test(v.pick ?? '') || bandLo(v.band_assigned) == null) return false
  if (!['fits', 'too_easy', 'too_hard'].includes(v.grade_fit) || !['plausible', 'easier', 'harder'].includes(v.band)) return false
  const oq = v.option_quality; if (!oq || typeof oq !== 'object') return false
  return ['A', 'B', 'C', 'D'].filter(x => x !== v.pick).every(x => QUAL.includes(oq[x]))
}

// ---------- draw ----------
async function cmdDraw() {
  const { createClient } = await import('@supabase/supabase-js')
  const env = Object.fromEntries(readFileSync(join(HERE, '../../.env.local'), 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('study_item_bank').select('id,family,cohort,passage_group_id,subskill,difficulty,item,content_sha').in('family', ['ssat', 'isee']).eq('section', 'reading').eq('verified', true).eq('archived', false).order('id').range(from, from + 999)
    if (error) die(error.message); rows.push(...data); if (data.length < 1000) break
  }
  const sample = []
  for (const fam of ['ssat', 'isee']) {
    const fr = rows.filter(r => r.family === fam)
    if (fr.length < 100) die(`${fam}: only ${fr.length} live rows loaded`)
    const byCoh = {}; for (const r of fr) (byCoh[r.cohort] ??= []).push(r)
    const tgt = allocate(Object.fromEntries(Object.entries(byCoh).map(([c, v]) => [c, v.length])), TARGET)
    for (const [coh, rs] of Object.entries(byCoh).sort()) {
      const groups = [...new Set(rs.map(r => r.passage_group_id))].sort((a, b) => sha(`${SEED}|${fam}|${a}`).localeCompare(sha(`${SEED}|${fam}|${b}`)))
      let got = 0
      for (const g of groups) {
        if (got >= tgt[coh]) break
        const gi = rs.filter(r => r.passage_group_id === g).sort((a, b) => a.id.localeCompare(b.id))
        if (new Set(gi.map(r => r.item.passage)).size !== 1) die(`${g}: group has more than one passage text`)
        for (const r of gi) sample.push({ id: r.id, family: fam, cohort: coh, group: g, subskill: r.subskill, difficulty: r.difficulty, passage: r.item.passage, prompt: r.item.prompt, choices: r.item.choices, correct_answer: r.item.correct_answer, content_sha: r.content_sha ?? sha(JSON.stringify(r.item)) })
        got += gi.length
      }
      console.log(`  ${fam} ${coh}: live ${rs.length} items / ${new Set(rs.map(r => r.passage_group_id)).size} groups; target ${tgt[coh]}; drawn ${got}`)
    }
    const s = sample.filter(x => x.family === fam)
    if (s.length < 20) die(`${fam}: drew ${s.length} < 20`)
    for (const x of s) if (!x.choices.includes(x.correct_answer)) die(`${x.id}: key not among choices`)
    console.log(`  ${fam}: ${s.length} items in ${new Set(s.map(x => x.group)).size} passage groups`)
  }
  mkdirSync(O, { recursive: true })
  writeFileSync(join(O, 'sample.json'), JSON.stringify(sample, null, 1) + '\n')
  console.log(`  wrote reading-cal/sample.json (${sample.length} items); sha ${sha(readFileSync(join(O, 'sample.json'))).slice(0, 12)}`)
}

// ---------- render ----------
// MAP strand by subskill (pre-registered table); area by passage group (recorded in sample before grading)
export const strandOf = s => /vocab/i.test(s) ? 'Vocabulary: Acquisition and Use'
  : /attitude|tone|purpose|technique|structure|function|emphasis|perspective|point of view/i.test(s) ? 'Analyze Point of View, Purpose, Features, and Structure'
  : /theme|character/i.test(s) ? 'Analyze Theme and Literary Elements; Summarize'
  : 'Analyze Central Idea, Concepts, and Events; Summarize'
function dealer(n, letters, r) { const d = []; while (d.length < n) d.push(...shuffleWith([...letters], r)); let i = 0; return () => d[i++] }
function place(choices, key, letter, letters, r) { const rest = shuffleWith(choices.filter(c => c !== key), r); rest.splice(letters.indexOf(letter), 0, key); return Object.fromEntries(rest.map((c, j) => [letters[j], c])) }
const seedInt = s => parseInt(sha(s).slice(0, 8), 16)

function cmdRender() {
  const sample = rd(join(O, 'sample.json')), areas = rd(join(O, 'areas.json'))
  // SSAT: pilot 4 withsource format
  const S = sample.filter(x => x.family === 'ssat'), I = sample.filter(x => x.family === 'isee')
  mkdirSync(join(O, 'ssat'), { recursive: true }); mkdirSync(join(O, 'isee'), { recursive: true })
  {
    const r = rng(seedInt(`${SEED}|ssat-ws`)), deal = dealer(S.length, 'ABCDE', r), key = {}
    const groups = [...new Set(S.map(x => x.group))]
    const ws = groups.map((g, gi) => ({ passage_id: `P${gi + 1}`, passage: S.find(x => x.group === g).passage, questions: S.filter(x => x.group === g).map((x, i) => {
      if (x.choices.length !== 5) die(`${x.id}: SSAT item has ${x.choices.length} choices`)
      const L0 = deal(), opts = place(x.choices, x.correct_answer, L0, 'ABCDE', r), qid = `W${gi + 1}-${i + 1}`
      key[qid] = { src: x.id, group: g, cohort: x.cohort, subskill: x.subskill, fKey: L0, bankDifficulty: x.difficulty }
      return { qid, prompt: x.prompt, options: opts }
    }) }))
    writeFileSync(join(O, 'ssat/withsource.json'), JSON.stringify(ws, null, 1) + '\n')
    writeFileSync(join(O, 'ssat/ws.key.json'), JSON.stringify(key, null, 1) + '\n')
    const nat = shuffleWith(groups.map(g => ({ src: g, passage: S.find(x => x.group === g).passage })), r), nk = {}
    writeFileSync(join(O, 'ssat/naturalness.json'), JSON.stringify(nat.map((x, i) => { nk[`N${i + 1}`] = x.src; return { id: `N${i + 1}`, passage: x.passage } }), null, 1) + '\n')
    writeFileSync(join(O, 'ssat/naturalness.key.json'), JSON.stringify(nk, null, 1) + '\n')
    console.log(`  ssat: ${S.length} items, ${groups.length} passages; key letters ${Object.values(key).map(k => k.fKey).join('')}`)
  }
  {
    const r = rng(seedInt(`${SEED}|isee-ws`)), deal = dealer(I.length, 'ABCD', r), key = {}, md = []
    const groups = [...new Set(I.map(x => x.group))]
    md.push(`# Items for review (${I.length})\n\nEach item: strand, stated grade target and target band, passage (if any), question, four options. Items that share a passage are listed together after it. The correct answer is NOT marked.\n`)
    let n = 0
    for (const g of groups) {
      const its = I.filter(x => x.group === g), area = areas[g]
      if (!['Informational Text', 'Literary Text'].includes(area)) die(`areas.json: no area for ${g}`)
      md.push(`---\n\n## Passage for items ${n + 1}-${n + its.length}\n\nStrand: ${area} | Grade target: 8 | Target band: RIT 210-219\n\n${its[0].passage}\n`)
      for (const x of its) {
        n++
        if (x.choices.length !== 4) die(`${x.id}: ISEE item has ${x.choices.length} choices`)
        const L0 = deal(), opts = place(x.choices, x.correct_answer, L0, 'ABCD', r)
        key[n] = { letter: L0, localId: x.id, group: g, cohort: x.cohort, subskill: x.subskill, target_band: 'RIT 210-219', bankDifficulty: x.difficulty }
        const strand = /Vocabulary/.test(strandOf(x.subskill)) ? `Vocabulary - ${strandOf(x.subskill)}` : `${area} - ${strandOf(x.subskill)}`
        md.push(`---\n\n## Item ${n}\n\nStrand: ${strand} | Grade target: 8 | Target band: RIT 210-219\n`)
        md.push(`Question: ${x.prompt}\n`)
        md.push(['A', 'B', 'C', 'D'].map(s => `${s}. ${opts[s]}`).join('\n') + '\n')
      }
    }
    writeFileSync(join(O, 'isee/ws.md'), md.join('\n'))
    writeFileSync(join(O, 'isee/ws.key.json'), JSON.stringify(key, null, 1) + '\n')
    const nat = shuffleWith(groups.map(g => ({ src: g, passage: I.find(x => x.group === g).passage })), r), nk = {}
    writeFileSync(join(O, 'isee/naturalness.json'), JSON.stringify(nat.map((x, i) => { nk[`N${i + 1}`] = x.src; return { id: `N${i + 1}`, passage: x.passage } }), null, 1) + '\n')
    writeFileSync(join(O, 'isee/naturalness.key.json'), JSON.stringify(nk, null, 1) + '\n')
    console.log(`  isee: ${I.length} items, ${groups.length} passages; key letters ${Object.values(key).map(k => k.letter).join('')}`)
  }
}

// ---------- score ----------
const pct = x => Number.isFinite(x) ? x.toFixed(1) + '%' : 'n/a'
function line(name, k, n, t, dir, barText) {
  const v = verdict(k, n, t, dir)
  console.log(`  ${name.padEnd(34)} ${String(k).padStart(3)}/${String(n).padEnd(3)} = ${pct(v.rate).padStart(6)}  [95% ${pct(v.lo)}-${pct(v.hi)}]  bar ${barText.padEnd(22)} -> live ${v.verdict}${v.material ? ' (material)' : ' (not material: bar inside interval)'}`)
  return { name, k, n, ...v, bar: barText }
}
function report(name, k, n) { const [lo, hi] = wilson(k, n); console.log(`  ${name.padEnd(34)} ${String(k).padStart(3)}/${String(n).padEnd(3)} = ${pct(100 * k / n).padStart(6)}  [95% ${pct(lo)}-${pct(hi)}]  (reported, no pilot bar)`); return { name, k, n, rate: 100 * k / n, lo, hi } }

export function scoreSsat(key, graders) {
  const ids = Object.keys(key)
  graders.forEach((g, i) => { const bad = ids.filter(q => !validSsatLabel(g[q])); if (bad.length) throw new Error(`grader ${i + 1}: missing/invalid fields on ${bad.length}/${ids.length}: ${bad.slice(0, 6).join(',')}`) })
  const res = ids.map(q => ({ q, ...ssatItem(graders.map(g => g[q]), key[q].fKey) }))
  const n = res.length
  return { n, excl: res.filter(r => r.excl).length, easy: res.filter(r => r.easy).length, hard: res.filter(r => r.hard).length, deadBoth: res.filter(r => r.deadBoth.length).length, pass: res.filter(r => r.pass).length, Q: qBar(res.flatMap(r => r.qrows)), res }
}
export function scoreIsee(key, graders) {
  const ids = Object.keys(key)
  graders.forEach((g, i) => { const bad = ids.filter(q => !validMapLabel(g[q])); if (bad.length) throw new Error(`grader ${i + 1}: missing/invalid fields on ${bad.length}/${ids.length}: ${bad.slice(0, 6).join(',')}`) })
  const s = { n: ids.length, excl: 0, pass: 0, passNoHard: 0, deadBoth: 0, easier: 0, harder: 0, labels: 0, tooEasy: 0, tooHard: 0, offs: graders.map(() => []), qrows: [], res: [] }
  for (const q of ids) {
    const k = key[q], gs = graders.map(g => g[q]), r = wsItem(gs.map((v, i) => [String.fromCharCode(97 + i), v]), k)
    if (r.excl) s.excl++
    if (r.c3 && r.c4) s.pass++
    const c3NoHard = gs.every(v => v.pick === k.letter && !(v.second_defensible && v.second_defensible !== 'none') && v.grade_fit !== 'too_easy')
    if (c3NoHard && r.c4) s.passNoHard++
    if (!r.c4) s.deadBoth++
    gs.forEach((v, i) => { s.labels++; if (v.band === 'easier') s.easier++; if (v.band === 'harder') s.harder++; if (v.grade_fit === 'too_easy') s.tooEasy++; if (v.grade_fit === 'too_hard') s.tooHard++; s.offs[i].push((bandLo(v.band_assigned) - bandLo(k.target_band)) / 10); s.qrows.push({ labels: v.option_quality, pick: v.pick, distractorLetters: ['A', 'B', 'C', 'D'].filter(x => x !== k.letter) }) })
    s.res.push({ q, ...r })
  }
  s.Q = qBar(s.qrows); s.meanOff = s.offs.map(o => o.reduce((a, b) => a + b, 0) / o.length)
  return s
}

function cmdScore(fam) {
  const dir = join(O, fam), key = rd(join(dir, 'ws.key.json'))
  const files = fam === 'ssat' ? ['ws-a.json', 'ws-b.json'] : ['ws.grader-a.json', 'ws.grader-b.json']
  const graders = files.map(f => lab(rd(join(dir, f))))
  const out = []
  try {
    if (fam === 'ssat') {
      const s = scoreSsat(key, graders)
      console.log(`SSAT live (pilot 4 C+F prompt + option_quality): ${s.n} items x 2 graders; Q over ${s.Q.n} (grader x distractor) labels\n`)
      out.push(line('C exclusivity', s.excl, s.n, 10 / 12 * 100, 'ge', '>= 10/12 (83.3%)'))
      out.push(line('F easy (grader-median)', s.easy, s.n, 50, 'le', '<= 6/12 (50.0%)'))
      out.push(line('Q distractor >= plausible', s.Q.good, s.Q.n, 75, 'ge', '>= 75%'))
      out.push(line('dead-by-both (MAP G bar)', s.deadBoth, s.n, 2 / 12 * 100, 'le', '<= 2/12 (16.7%)'))
      out.push(line('pilot-pass excl+!easy+!dead (S1-b)', s.pass, s.n, 10 / 12 * 100, 'ge', '>= 10/12 (83.3%)'))
      out.push(report('harder (grader-median hard)', s.hard, s.n))
      for (const r of s.res) if (!r.excl || r.easy || r.deadBoth.length) console.log(`    ${r.q} ${key[r.q].src.slice(0, 8)} ${key[r.q].subskill}: ${r.excl ? '' : 'NOT-EXCL '}${r.easy ? `EASY(${r.mean}) ` : ''}${r.deadBoth.length ? `dead-both ${r.deadBoth}` : ''}`)
      const byCoh = {}; for (const r of s.res) { const c = key[r.q].cohort; byCoh[c] ??= { n: 0, excl: 0, easy: 0 }; byCoh[c].n++; byCoh[c].excl += r.excl; byCoh[c].easy += r.easy }
      console.log(`  by cohort: ${Object.entries(byCoh).map(([c, v]) => `${c.replace('ssat-reading-worlds-', '')} excl ${v.excl}/${v.n} easy ${v.easy}/${v.n}`).join('; ')}`)
    } else {
      const s = scoreIsee(key, graders)
      console.log(`ISEE live on the MAP pilot 7 grader (+ option_quality), grade 8 / RIT 210-219: ${s.n} items x 2 graders; ${s.labels} grader labels; Q over ${s.Q.n}\n`)
      out.push(line('C exclusivity', s.excl, s.n, 10 / 12 * 100, 'ge', '>= 10/12 (83.3%)'))
      out.push(line('S1-b pilot-pass (c3 && c4)', s.pass, s.n, 10 / 12 * 100, 'ge', '>= 10/12 (83.3%)'))
      out.push(line('G dead-by-both', s.deadBoth, s.n, 2 / 12 * 100, 'le', '<= 2/12 (16.7%)'))
      out.push(line('S1-c easier (labels)', s.easier, s.labels, 4 / 24 * 100, 'le', '<= 4/24 (16.7%)'))
      out.push(line('S1-c harder (labels)', s.harder, s.labels, 6 / 24 * 100, 'lt', '< 6/24 (25.0%)'))
      out.push(line('Q distractor >= plausible', s.Q.good, s.Q.n, 75, 'ge', '>= 75%'))
      out.push(report('S1-b ignoring too_hard (secondary)', s.passNoHard, s.n))
      out.push(report('grade_fit too_easy (labels)', s.tooEasy, s.labels))
      out.push(report('grade_fit too_hard (labels)', s.tooHard, s.labels))
      console.log(`  S1-d mean band offset: ${s.meanOff.map(x => x.toFixed(2)).join(' / ')} (bar +-0.5) -> ${s.meanOff.every(x => Math.abs(x) <= 0.5) ? 'PASS' : 'FAIL'}`)
      for (const r of s.res) if (!(r.c3 && r.c4)) console.log(`    ${r.q} ${key[r.q].localId.slice(0, 8)} ${key[r.q].subskill}: ${r.why.join(' | ')}${r.c4 ? '' : ` | dead-both ${r.deadBoth}`}`)
    }
  } catch (e) { die(e.message) }
  writeFileSync(join(dir, 'score.json'), JSON.stringify(out, null, 1) + '\n')
}

function cmdNat(fam) {
  const dir = join(O, fam), nk = rd(join(dir, 'naturalness.key.json')), ids = Object.keys(nk)
  const js = ['nat-a.json', 'nat-b.json'].map(f => lab(rd(join(dir, f))))
  js.forEach((j, i) => { const bad = ids.filter(n => !Number.isInteger(j[n]?.rating) || j[n].rating < 1 || j[n].rating > 5); if (bad.length) die(`judge ${i + 1}: ${bad.length}/${ids.length} unrated`) })
  const all = js.flatMap(j => ids.map(n => j[n].rating)).sort((a, b) => a - b), m = all.length >> 1
  const med = all.length % 2 ? all[m] : (all[m - 1] + all[m]) / 2
  console.log(`${fam} naturalness: ${ids.length} live passages x 2 judges = ${all.length} ratings; pooled median ${med}; mean ${(all.reduce((a, b) => a + b, 0) / all.length).toFixed(2)}`)
  for (const n of ids) console.log(`  ${nk[n]}: ${js.map(j => j[n].rating).join('/')}`)
  writeFileSync(join(dir, 'nat-score.json'), JSON.stringify({ n: all.length, median: med, ratings: Object.fromEntries(ids.map(n => [nk[n], js.map(j => j[n].rating)])) }, null, 1) + '\n')
}

// ---------- Stage B relative bars (READING-BATCH-WV5 prereg) ----------
const lchoose = (n, k) => { let s = 0; for (let i = 1; i <= k; i++) s += Math.log(n - k + i) - Math.log(i); return s }
export const pmf = (n, p, k) => p <= 0 ? (k === 0 ? 1 : 0) : p >= 1 ? (k === n ? 1 : 0) : Math.exp(lchoose(n, k) + k * Math.log(p) + (n - k) * Math.log(1 - p))
export const cdfLe = (n, p, m) => { let s = 0; for (let k = 0; k <= m; k++) s += pmf(n, p, k); return Math.min(1, s) }
/**
 * The relative bar for one measure. Live k/nl is smoothed to p = (k+1)/(nl+2) (Laplace: a 33/33 control
 * is not a certainty). 'good' measures (higher is better): the bar is the LARGEST count g such that a
 * candidate whose true rate equals p reaches >= g with probability >= power. 'bad' measures: the SMALLEST
 * m such that P(<= m) >= power. Tolerance = live point rate minus bar rate (or bar minus live for bad).
 * DECIDABLE only if the bar can fail inside the candidate's attainable range (g >= 1; m <= nc - 1).
 */
export function relBar(k, nl, nc, dir, power = 0.8) {
  const p = (k + 1) / (nl + 2), live = 100 * k / nl
  if (dir === 'good') {
    let g = 0; for (let t = nc; t >= 0; t--) if (1 - cdfLe(nc, p, t - 1) >= power) { g = t; break }
    return { dir, live, p, bar: g, barRate: 100 * g / nc, tol: live - 100 * g / nc, decidable: g >= 1, passProbAtLive: 1 - cdfLe(nc, p, g - 1) }
  }
  let m = nc; for (let t = 0; t <= nc; t++) if (cdfLe(nc, p, t) >= power) { m = t; break }
  return { dir, live, p, bar: m, barRate: 100 * m / nc, tol: 100 * m / nc - live, decidable: m <= nc - 1, passProbAtLive: cdfLe(nc, p, m) }
}

/** Stage B bar A: options-only, candidate vs the in-run live control. INVALID unless control is 10-45%. */
export function barAMargin(cand, live, margin = 10) {
  if (!(live >= 10 && live <= 45)) return 'INVALID'
  return cand <= live + margin + 1e-9 ? 'PASS' : 'FAIL'
}
function cmdWv5(outdir, stage) {
  const key = rd(join(outdir, 'attack.key.json')), live = rd(join(O, 'ssat', 'score.json'))
  const get = n => live.find(x => x.name.startsWith(n)) ?? die(`reading-cal/ssat/score.json has no ${n}`)
  if (stage === 'ws') {
    const wk = Object.fromEntries(Object.entries(key).filter(([, k]) => k.pop === 'withsource').map(([q, k]) => [q, { fKey: k.fKey }]))
    const n = Object.keys(wk).length; if (n !== 12) die(`with-source key has ${n} items; the bars are computed for 12`)
    let s; try { s = scoreSsat(wk, ['ws-a.json', 'ws-b.json'].map(f => lab(rd(join(outdir, f))))) } catch (e) { die(e.message) }
    console.log(`STAGE 1 (C+F+Q): ${s.n} items x 2 graders; Q over ${s.Q.n} labels. Bars relative to Stage A live (reading-cal/ssat/score.json)\n`)
    let ok = true
    for (const [name, k, nc, dir, liveName] of [['C exclusivity', s.excl, s.n, 'good', 'C exclusivity'], ['Q distractor >= plausible', s.Q.good, s.Q.n, 'good', 'Q distractor'], ['dead-by-both', s.deadBoth, s.n, 'bad', 'dead-by-both'], ['F easy', s.easy, s.n, 'bad', 'F easy'], ['pilot-pass', s.pass, s.n, 'good', 'pilot-pass']]) {
      const L0 = get(liveName), b = relBar(L0.k, L0.n, nc, dir)
      const pass = dir === 'good' ? k >= b.bar : k <= b.bar
      if (b.decidable && !pass) ok = false
      console.log(`  ${name.padEnd(26)} candidate ${k}/${nc} = ${(100 * k / nc).toFixed(1)}%  live ${L0.k}/${L0.n} = ${L0.rate.toFixed(1)}%  bar ${dir === 'good' ? '>=' : '<='} ${b.bar}/${nc}  -> ${b.decidable ? (pass ? 'PASS' : 'FAIL') : `reported (not decidable; would ${pass ? 'pass' : 'fail'})`}`)
    }
    console.log(`  (for information, the pilots' absolute bars: C >= 10/12 ${s.excl >= 10 ? 'met' : 'not met'}; F <= 6/12 easy ${s.easy <= 6 ? 'met' : 'not met'}; Q >= 75% ${s.Q.rate >= 75 ? 'met' : 'not met'})`)
    for (const r of s.res) console.log(`    ${r.q} ${key[r.q].src}: ${r.excl ? 'excl' : 'NOT-EXCL'} mean-rank ${r.mean}${r.deadBoth.length ? ` dead-both ${r.deadBoth}` : ''}`)
    console.log(`\nSTAGE 1 ${ok ? 'PASSES' : 'FAILS'}`)
  } else if (stage === 'iso') {
    const files = ['iso-a.json', 'iso-b.json', 'iso-c.json'].map(f => lab(rd(join(outdir, f))))
    const c = [0, 0], l = [0, 0], nc = Object.values(key).filter(k => k.pop === 'candidate').length, nl = Object.values(key).filter(k => k.pop === 'live').length
    if (nl !== 48 || nc < 8) die(`iso key: candidate ${nc}, live ${nl}`)
    files.forEach((f, i) => { for (const [q, k] of Object.entries(key)) { if (k.pop !== 'candidate' && k.pop !== 'live') continue; const v = f[q]; if (!'ABCDE'.includes(v?.pick ?? '') || !v?.pick) die(`iso sample ${i + 1}: no pick for ${q}`); const a = k.pop === 'candidate' ? c : l; a[0]++; a[1] += v.pick === k.fKey ? 1 : 0 } })
    const cr = 100 * c[1] / c[0], lr = 100 * l[1] / l[0], v = barAMargin(cr, lr)
    console.log(`STAGE 3 (A, options-only, 3 samples of one solver): candidate ${c[1]}/${c[0]} = ${cr.toFixed(1)}%  live control ${l[1]}/${l[0]} = ${lr.toFixed(1)}%  margin ${(cr - lr >= 0 ? '+' : '') + (cr - lr).toFixed(1)}  bar: control 10-45% and margin <= +10 -> ${v}`)
  } else die('wv5 <outdir> ws|iso')
}

function selftest() {
  let fail = 0
  const expect = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fail++ }
  expect(verdict(10, 12, 100 * 10 / 12, 'ge').verdict === 'PASS' && verdict(9, 12, 100 * 10 / 12, 'ge').verdict === 'FAIL', 'C: 10/12 passes, 9/12 fails')
  expect(verdict(6, 12, 50, 'le').verdict === 'PASS' && verdict(7, 12, 50, 'le').verdict === 'FAIL', 'F: 6/12 passes, 7/12 fails')
  expect(verdict(5, 24, 25, 'lt').verdict === 'PASS' && verdict(6, 24, 25, 'lt').verdict === 'FAIL', 'harder: 5/24 passes, 6/24 fails (strict)')
  expect(verdict(0, 30, 83.3, 'ge').material && !verdict(23, 30, 83.3, 'ge').material, 'material: 0/30 fails materially, 23/30 (76.7%) does not')
  expect(verdict(30, 30, 83.3, 'ge').material && !verdict(26, 30, 83.3, 'ge').material, `material pass needs the whole interval above the bar: 30/30 (lower ${wilson(30, 30)[0].toFixed(1)}) yes, 26/30 (lower ${wilson(26, 30)[0].toFixed(1)}) no`)
  expect(verdict(0, 0, 50, 'le').verdict === 'NO MEASUREMENT', 'an empty population returns no verdict')
  const w = wilson(12, 24); expect(Math.abs(w[0] - 31.4) < 0.2 && Math.abs(w[1] - 68.6) < 0.2, `wilson 12/24 = 31.4-68.6 (got ${w.map(x => x.toFixed(1))})`)
  const a = allocate({ s2: 19, s3: 44, s4: 75 }, 24); expect(a.s2 + a.s3 + a.s4 === 24 && a.s4 === 13 && a.s3 === 8 && a.s2 === 3, `allocate 19/44/75 of 24 -> 3/8/13 (got ${JSON.stringify(a)})`)
  const oq = (o = {}) => ({ A: 'plausible', B: 'plausible', C: 'plausible', D: 'plausible', E: 'plausible', ...o })
  const g = (pick, x = {}) => ({ pick, second_defensible: 'none', difficulty: 'medium', option_quality: oq(), ...x })
  expect(ssatItem([g('B'), g('B')], 'B').pass, 'ssat: clean medium item passes')
  expect(ssatItem([g('B', { difficulty: 'easy' }), g('B')], 'B').easy, 'F: easy+medium (mean 1.5) is easy')
  expect(!ssatItem([g('B', { difficulty: 'easy' }), g('B', { difficulty: 'hard' })], 'B').easy, 'F: easy+hard (mean 2) is not easy')
  expect(!ssatItem([g('B', { second_defensible: 'C' }), g('B')], 'B').excl, 'C: a second defensible answer breaks exclusivity')
  expect(!ssatItem([g('C'), g('B')], 'B').excl, 'C: one grader off key breaks exclusivity')
  expect(ssatItem([g('B', { option_quality: oq({ D: 'dead' }) }), g('B', { option_quality: oq({ D: 'dead' }) })], 'B').deadBoth.join() === 'D', 'dead-by-both: D dead for both')
  expect(ssatItem([g('B', { option_quality: oq({ D: 'dead' }) }), g('B')], 'B').deadBoth.length === 0, 'dead by one grader is not dead-by-both')
  expect(!validSsatLabel({ pick: 'B', difficulty: 'medium', option_quality: { A: 'plausible' } }), 'a label missing option_quality entries is invalid')
  let threw = false; try { scoreSsat({ W1: { fKey: 'B' } }, [{ W1: g('B') }, {}]) } catch { threw = true }
  expect(threw, 'scoreSsat refuses when a grader is missing an item')
  expect(strandOf('vocabulary in context').startsWith('Vocabulary') && strandOf('attitude/tone').startsWith('Analyze Point') && strandOf('detail').startsWith('Analyze Central'), 'strand table')
  expect(Math.abs(cdfLe(12, 0.5, 6) - 0.6128) < 1e-3, `binomial cdf(12, .5, 6) = .613 (got ${cdfLe(12, 0.5, 6).toFixed(4)})`)
  const c = relBar(33, 33, 12, 'good'); expect(c.bar === 11 && c.decidable, `C at 33/33 live -> >= 11/12, decidable (got ${c.bar})`)
  const f = relBar(32, 33, 12, 'bad'); expect(f.bar === 12 && !f.decidable, `F at 32/33 live easy -> <= 12/12, NOT decidable (got ${f.bar})`)
  const z = relBar(1, 33, 12, 'good'); expect(z.bar === 0 && !z.decidable, 'pilot-pass at 1/33 live -> bar 0, NOT decidable')
  const h = relBar(6, 12, 12, 'bad'); expect(h.decidable && h.bar >= 6 && h.bar <= 8, `a mid-range live rate gives a decidable bar near it (got <= ${h.bar}/12)`)
  expect(barAMargin(36.4, 26.4) === 'PASS' && barAMargin(36.5, 26.4) === 'FAIL' && barAMargin(20, 50) === 'INVALID' && barAMargin(20, 9) === 'INVALID', 'A margin: +10.0 passes, +10.1 fails; control outside 10-45% is INVALID')
  console.log(fail ? `SELFTEST FAILED (${fail})` : 'selftest passed'); process.exit(fail ? 1 : 0)
}

const [cmd, arg] = process.argv.slice(2)
if (import.meta.url === `file://${process.argv[1]}`) {
  if (cmd === 'draw') await cmdDraw()
  else if (cmd === 'render') cmdRender()
  else if (cmd === 'score') { if (!['ssat', 'isee'].includes(arg)) die('score ssat|isee'); cmdScore(arg) }
  else if (cmd === 'nat') { if (!['ssat', 'isee'].includes(arg)) die('nat ssat|isee'); cmdNat(arg) }
  else if (cmd === 'relbars') {
    const sc = rd(join(O, 'ssat', 'score.json')), get = n => sc.find(x => x.name.startsWith(n)) ?? die(`ssat/score.json has no ${n}`)
    const nc = Number(arg ?? 12), rows = [['C exclusivity', 'good', nc], ['F easy', 'bad', nc], ['Q distractor', 'good', nc * 8], ['dead-by-both', 'bad', nc], ['pilot-pass', 'good', nc]]
    console.log(`relative bars for a ${nc}-item SSAT candidate, from ssat/score.json (live control); power 0.8\n`)
    for (const [n, d, c] of rows) { const x = get(n), b = relBar(x.k, x.n, c, d); console.log(`  ${n.padEnd(14)} live ${x.k}/${x.n} = ${b.live.toFixed(1)}% -> candidate ${d === 'good' ? '>=' : '<='} ${b.bar}/${c} (${b.barRate.toFixed(1)}%), tolerance ${b.tol.toFixed(1)} pts, P(pass | candidate = live) ${b.passProbAtLive.toFixed(2)} -> ${b.decidable ? 'DECIDING' : 'NOT DECIDABLE (cannot fail inside the attainable range): reported only'}`) }
  }
  else if (cmd === 'wv5') cmdWv5(arg, process.argv[4])
  else if (cmd === '--selftest') selftest()
  else die('usage: draw | render | score ssat|isee | nat ssat|isee | --selftest')
}
