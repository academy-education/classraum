#!/usr/bin/env node
/**
 * misread.mjs — misreading-derived distractors (MAP pilot 8, SSAT Reading pilot 5), 2026-10-07.
 * Pre-registrations: MAP-MISREAD-PILOT-2026-10-07.prereg.md, SSAT-READING-MISREAD-PREREGISTERED.md.
 * Prompts and the misreading taxonomy: misread/prompts.md.
 *
 *   fk       <fam>            words / paragraphs / FK of every passage in misread/<fam>/passages.json
 *   verbatim <fam>            V: each passage is a contiguous excerpt of its saved source (sha256 checked)
 *   panel    <fam>            writes panel/<set>/input.json (passage + stems only)
 *   tally    <fam>            T1-T3 over assembly.json, eligibility, simulated difficulty, habit counts;
 *                             writes batch.candidate.json (first 6 eligible stems per set, writer order)
 *   checks   <fam> [file]     stage 0 exact checks (default batch.candidate.json, or batch.json once frozen)
 *   render   <fam> verify|ws|oo|nat
 *   score    <fam> verify|ws|oo|nat|q
 *   --selftest               break every check and bar at its margin
 *
 * fam = map | ssat. Every reader refuses (exit 2) on a missing file or a short population, and prints
 * its denominators before its verdict.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { rng, shuffleWith } from './seeded-shuffle.mjs'
import { periodicity } from './map-pilot-2-checks.mjs'
import { readability, checkItem } from './map-pilot-checks.mjs'
import { wsItem } from './map-pilot-3-score.mjs'
import { wsBars6 } from './map-adapt6-score.mjs'
import { barA } from './map-adapt-score.mjs'
import { scoreNat } from './map-wv.mjs'
import { content, stemW, distinctive, present } from './ssat-wv.mjs'

const D = 'scripts/study-bank/'
export const CFG = {
  map: { k: 3, width: 4, sets: { M6: { grade: 6, band: 'RIT 190-199' }, M8: { grade: 8, band: 'RIT 210-219' } }, stems: 9, items: 6, words: [200, 350], paras: [3, 6] },
  ssat: { k: 4, width: 5, sets: { U1: {}, U2: {} }, stems: 10, items: 6, words: [350, 700], paras: [3, 9] },
}
export const HABITS = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7', 'H8', 'H9', 'H10']
export const READERS = [...HABITS, 'S1', 'S2', 'S3']
const INELIGIBLE = ['absent', 'not-refutable', 'defensible', 'non-answer', 'duplicate-of-key', 'single-sentence-kill']
const L = 'ABCDE'
const die = m => { console.error('REFUSING: ' + m); process.exit(2) }
const rdAbs = p => { if (!existsSync(p)) die(`missing ${p}`); return JSON.parse(readFileSync(p, 'utf8')) }
const dir = fam => { if (!CFG[fam]) die(`family must be map|ssat, got ${fam}`); return D + `misread/${fam}/` }
const rd = (fam, f) => rdAbs(dir(fam) + f)
const lab = j => j.labels ?? j
const fold = s => String(s ?? '').toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim()
export const vnorm = s => String(s).replace(/[_*]/g, '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/—|–|--/g, '-').replace(/\s+/g, ' ').trim()
const wc = s => String(s ?? '').split(/\s+/).filter(w => /[a-z]/i.test(w)).length
const paras = s => String(s ?? '').split(/\n\s*\n/).filter(p => p.trim()).length
const NEG = /\b(not|no|never|nothing|nor|none|neither|nobody|nowhere|without)\b|n't\b/i
const toks = s => String(s).toLowerCase().replace(/[‘’]/g, "'").match(/[a-z']+/g) ?? []

// ---------- pure checks (exported for the selftest) ----------
export function verbatimOk(text, source) { return vnorm(source).includes(vnorm(text)) }
export function longestRun(a, b) {
  const x = toks(a), y = toks(b); let best = 0
  for (let i = 0; i < x.length; i++) for (let j = 0; j < y.length; j++) { let n = 0; while (i + n < x.length && j + n < y.length && x[i + n] === y[j + n]) n++; if (n > best) best = n }
  return best
}
export function absentChoices(item) {
  if (item.subskill === 'vocabulary-in-context') return []
  const tw = content(item.passage).map(stemW), out = []
  item.choices.forEach((c, j) => { const d = distinctive(item.choices, j); if (d.length && d.filter(w => present(w, tw)).length < Math.ceil(d.length / 2)) out.push(L[j]) })
  return out
}
export function singleSentenceKill(item, d) {
  const j = item.choices.indexOf(d.text), dw = distinctive(item.choices, j)
  const sw = content(d.refutation_sentence).map(stemW)
  const hit = dw.filter(w => present(w, sw)).length
  return NEG.test(d.refutation_sentence) && hit >= Math.max(2, Math.ceil(0.6 * dw.length))
}
export function checkOneItem(it, fam) {
  const c = CFG[fam], e = []
  const ch = (it.choices ?? []).map(String)
  if (ch.length !== c.width || new Set(ch.map(fold)).size !== c.width) e.push(`X2 need ${c.width} distinct choices (got ${ch.length})`)
  if (!ch.includes(String(it.correct_answer))) e.push('X2 key not among choices')
  const w = wc(it.passage), p = paras(it.passage)
  if (w < c.words[0] || w > c.words[1]) e.push(`X3 passage ${w} words (${c.words.join('-')})`)
  if (p < c.paras[0] || p > c.paras[1]) e.push(`X3 passage ${p} paragraphs (${c.paras.join('-')})`)
  if (fam === 'map') e.push(...checkItem(it).errs.filter(x => x.startsWith('E1')))
  for (const L0 of absentChoices(it)) e.push(`A0 option ${L0} ("${ch[L.indexOf(L0)].slice(0, 50)}") names content absent from the passage`)
  const run = longestRun(it.correct_answer, it.passage)
  if (run >= 5) e.push(`L1 key repeats a ${run}-word run of the passage verbatim`)
  const ds = it.distractors ?? []
  if (ds.length !== c.k) e.push(`P1 ${ds.length} distractor records (need ${c.k})`)
  for (const d of ds) {
    if (!ch.includes(String(d.text))) { e.push(`P1 distractor record "${String(d.text).slice(0, 40)}" is not a choice`); continue }
    const Ld = L[ch.indexOf(String(d.text))]
    if (!HABITS.includes(d.habit)) e.push(`P1 option ${Ld} habit ${d.habit} not in H1-H10`)
    if (!Array.isArray(d.readers) || !d.readers.length || d.readers.some(r => !READERS.includes(r))) e.push(`P1 option ${Ld} readers invalid`)
    if (!Array.isArray(d.quotes) || d.quotes.length !== (d.readers ?? []).length) e.push(`P1 option ${Ld} needs one panel quote per reader`)
    if (!d.refutation_sentence || !verbatimOk(d.refutation_sentence, it.passage)) e.push(`R1 option ${Ld} refutation sentence is not verbatim in the passage`)
    else if (singleSentenceKill(it, d)) e.push(`L3 option ${Ld} dies to one negating sentence that repeats its own words`)
  }
  if (ch.includes(String(it.correct_answer)) && ds.some(d => d.text === it.correct_answer)) e.push('P1 key has a distractor record')
  return e
}
export function lengthTell(items) {
  let longest = 0
  for (const it of items) { const Ls = it.choices.map(x => String(x).length), k = Ls[it.choices.indexOf(it.correct_answer)], mx = Math.max(...Ls); if (k === mx && Ls.filter(x => x === mx).length === 1) longest++ }
  return { longest, n: items.length, ok: longest <= 0.25 * items.length }
}
export function overlapTell(items) {   // report-only: key uniquely has the highest share of passage content words
  let n = 0
  for (const it of items) { const tw = content(it.passage).map(stemW); const sh = it.choices.map(c => { const w = content(c).map(stemW); return w.length ? w.filter(x => present(x, tw)).length / w.length : 0 }); const k = sh[it.choices.indexOf(it.correct_answer)], mx = Math.max(...sh); if (k === mx && sh.filter(x => x === mx).length === 1) n++ }
  return n
}

// T1-T3: the assembler followed the frequency rule
export function tallyStem(st, k) {
  const e = [], seen = {}
  for (const c of st.clusters ?? []) for (const r of c.readers ?? []) seen[r] = (seen[r] ?? 0) + 1
  for (const r of READERS) if (seen[r] !== 1) e.push(`T1 reader ${r} appears ${seen[r] ?? 0} times (need exactly 1)`)
  for (const r of Object.keys(seen)) if (!READERS.includes(r)) e.push(`T1 unknown reader ${r}`)
  const keys = (st.clusters ?? []).filter(c => c.status === 'key')
  if (keys.length !== 1) e.push(`T2 ${keys.length} key clusters (need 1)`)
  const key = keys[0], skilled = key ? key.readers.filter(r => /^S/.test(r)).length : 0
  for (const c of st.clusters ?? []) if (c.status === 'ineligible' && !INELIGIBLE.includes(c.reason)) e.push(`T3 cluster ${c.cid} ineligible without a listed reason (${c.reason})`)
  for (const c of st.clusters ?? []) if (!['key', 'wrong', 'ineligible', 'other-correct'].includes(c.status)) e.push(`T3 cluster ${c.cid} status ${c.status}`)
  // other-correct = a non-skilled answer judged equivalent to the key; it must be merged, so it is an error
  if ((st.clusters ?? []).some(c => c.status === 'other-correct')) e.push('T3 an answer equivalent to the key must be in the key cluster')
  const wrong = (st.clusters ?? []).map((c, i) => ({ ...c, i })).filter(c => c.status === 'wrong').sort((a, b) => b.readers.length - a.readers.length || a.i - b.i)
  const eligible = !!key && skilled >= 2 && wrong.length >= k
  const chosen = wrong.slice(0, k).map(c => c.cid)
  // every ineligible cluster must not be larger than the smallest chosen one unless it carries a reason (already enforced) — recorded
  return { e, eligible, skilled, chosen, key, wrongN: wrong.length }
}
export function chosenMatch(item, chosen) {
  const got = (item?.distractors ?? []).map(d => d.cid)
  return got.length === chosen.length && chosen.every(c => got.includes(c))
}
export function qBar(rows) {   // rows: [{labels:{A:..}, pick, distractorLetters:[..]}] per grader-item
  let good = 0, n = 0
  for (const r of rows) for (const d of r.distractorLetters) { n++; const q = r.pick === d ? 'strong' : r.labels?.[d]; if (q === 'plausible' || q === 'strong') good++ }
  return { good, n, rate: n ? 100 * good / n : NaN, pass: n > 0 && good >= 0.75 * n }
}

// ---------- commands ----------
function cmdFk(fam) {
  const ps = rd(fam, 'passages.json')
  for (const p of ps) { const r = readability(p.text); console.log(`${p.set_id}: ${wc(p.text)} words, ${paras(p.text)} paragraphs, FK ${r.fk.toFixed(1)} (CL ${r.cl.toFixed(1)}) — ${p.author}, ${p.title} (${p.year})`) }
}
function cmdVerbatim(fam) {
  const ps = rd(fam, 'passages.json'); let bad = 0
  if (ps.length !== Object.keys(CFG[fam].sets).length) die(`${ps.length} passages, need ${Object.keys(CFG[fam].sets).length}`)
  for (const p of ps) {
    if (!existsSync(p.local_path)) die(`missing source ${p.local_path}`)
    const buf = readFileSync(p.local_path), sha = createHash('sha256').update(buf).digest('hex')
    const ok = sha === p.sha256 && verbatimOk(p.text, buf.toString('utf8'))
    if (!ok) bad++
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${p.set_id}: sha ${sha === p.sha256 ? 'matches' : 'DIFFERS'}, excerpt ${verbatimOk(p.text, buf.toString('utf8')) ? 'verbatim' : 'NOT FOUND'} (${p.url})`)
  }
  console.log(bad ? `V FAILS on ${bad}` : `V passes ${ps.length}/${ps.length}`); process.exit(bad ? 1 : 0)
}
function cmdPanel(fam) {   // panel/<set>/input.json: passage + stems ONLY (prompts §4)
  const ps = rd(fam, 'passages.json'), stems = rd(fam, 'stems.json')
  for (const sid of Object.keys(CFG[fam].sets)) {
    const st = stems.find(s => s.set_id === sid), p = ps.find(x => x.set_id === sid)
    if (!st || !p || st.stems.length !== CFG[fam].stems) die(`${sid}: need passage and ${CFG[fam].stems} stems`)
    const out = dir(fam) + `panel/${sid}/`; mkdirSync(out, { recursive: true })
    writeFileSync(out + 'input.json', JSON.stringify({ passage: p.text, questions: st.stems.map(s => ({ id: s.sid, question: s.prompt })) }, null, 1) + '\n')
    console.log(`${out}input.json: ${st.stems.length} questions`)
  }
}
function cmdTally(fam) {
  const c = CFG[fam], asm = rd(fam, 'assembly.json'), stems = rd(fam, 'stems.json'), ps = rd(fam, 'passages.json')
  const out = [], habitCount = {}, yields = {}
  let errs = 0
  for (const sid of Object.keys(c.sets)) {
    const sset = stems.find(s => s.set_id === sid); if (!sset) die(`stems.json has no set ${sid}`)
    if (sset.stems.length !== c.stems) die(`${sid}: ${sset.stems.length} stems, prereg fixes ${c.stems}`)
    const passage = ps.find(p => p.set_id === sid)?.text; if (!passage) die(`no passage for ${sid}`)
    let taken = 0, elig = 0
    console.log(`\n${sid}: ${c.stems} stems x ${READERS.length} readers`)
    for (const s of sset.stems) {
      const a = asm.find(x => x.sid === s.sid); if (!a) die(`assembly has no stem ${s.sid}`)
      const t = tallyStem(a, c.k)
      // T4: every distractor quote is the reader's panel answer, verbatim (provenance is mechanical, not trusted)
      for (const d of a.item?.distractors ?? []) (d.readers ?? []).forEach((r, i) => {
        const f = dir(fam) + `panel/${sid}/${r}.json`; if (!existsSync(f)) { t.e.push(`T4 missing panel file ${r}`); return }
        const ans = lab(rdAbs(f)).answers?.[s.sid]
        if (vnorm(ans ?? '') !== vnorm(d.quotes?.[i] ?? '')) t.e.push(`T4 ${s.sid} option "${String(d.text).slice(0, 30)}" quote for ${r} is not that reader's answer`)
      })
      const match = !t.eligible || chosenMatch(a.item, t.chosen)
      if (t.e.length || !match) { errs++; console.log(`  ERROR ${s.sid}: ${[...t.e, ...(match ? [] : [`T3 chosen distractors ${(a.item?.distractors ?? []).map(d => d.cid)} != top-${c.k} wrong clusters ${t.chosen}`])].join(' | ')}`) }
      const n = READERS.length, kr = t.key?.readers ?? []
      const p = { all: kr.length / n, mis: kr.filter(r => /^H/.test(r)).length / HABITS.length, skilled: t.skilled / 3 }
      if (t.eligible && !t.e.length) elig++
      const take = t.eligible && !t.e.length && match && taken < c.items
      console.log(`  ${take ? 'TAKE' : t.eligible ? 'elig' : 'skip'} ${s.sid} [${s.kind}] skilled ${t.skilled}/3, wrong clusters ${t.wrongN} (need ${c.k}); simulated p: all ${(100 * p.all).toFixed(0)}%, misreaders ${(100 * p.mis).toFixed(0)}%`)
      if (take) {
        taken++
        for (const d of a.item.distractors) habitCount[d.habit] = (habitCount[d.habit] ?? 0) + 1
        out.push({ id: `${fam === 'map' ? 'MAPM' : 'SSATM'}-${s.sid}`, set_id: sid, sid: s.sid, passage, prompt: a.item.prompt ?? s.prompt, choices: a.item.choices, correct_answer: a.item.correct_answer, distractors: a.item.distractors, key_support: a.item.key_support ?? null, subskill: s.kind, simulated_p: p,
          ...(fam === 'map' ? { map_area: s.map_area, map_strand: s.map_strand, stratum: 'comprehension', grade_target: c.sets[sid].grade, target_band: c.sets[sid].band } : {}) })
      }
    }
    yields[sid] = { taken, elig }
    console.log(`  ${sid} yield: ${elig} eligible of ${c.stems}; taken ${taken} (bar P >= ${c.items})`)
  }
  const total = Object.values(habitCount).reduce((a, b) => a + b, 0)
  console.log(`\ndistractor sources (${total} distractors): ${HABITS.map(h => `${h} ${habitCount[h] ?? 0}`).join(', ')}`)
  const P = Object.values(yields).every(y => y.taken >= c.items) && !errs
  writeFileSync(dir(fam) + 'batch.candidate.json', JSON.stringify(out, null, 1) + '\n')
  console.log(`wrote batch.candidate.json (${out.length}); assembly errors ${errs}\nSTAGE P ${P ? 'PASSES' : 'DOES NOT PASS'}`)
  process.exit(P ? 0 : 1)
}
function cmdChecks(fam, file) {
  const items = rd(fam, file ?? 'batch.candidate.json'), c = CFG[fam]
  const n = Object.keys(c.sets).length * c.items
  if (items.length > n) die(`${items.length} items > ${n}`)
  let fail = 0
  for (const sid of Object.keys(c.sets)) { const ps = new Set(items.filter(x => x.set_id === sid).map(x => x.passage)); if (ps.size > 1) { console.log(`FAIL ${sid}: passage differs across items`); fail++ } }
  for (const it of items) { const e = checkOneItem(it, fam); if (e.length) fail++; console.log(`${e.length ? 'FAIL' : 'ok  '} ${it.id}${e.length ? ': ' + e.join(' | ') : ''}`) }
  const lt = lengthTell(items)
  console.log(`\nE3 key uniquely longest ${lt.longest}/${lt.n} (bar <= 25%) -> ${lt.ok ? 'pass' : 'FAIL'}`)
  console.log(`L2 (report-only) key uniquely highest passage-word share ${overlapTell(items)}/${items.length}`)
  console.log(`denominator: ${items.length} items of ${n}; ${fail} item(s) failing`)
  process.exit(fail || !lt.ok ? 1 : 0)
}
function place(choices, key, letter, r, width) {
  const LL = L.slice(0, width).split(''), ch = choices.map(String), k = ch.indexOf(String(key))
  if (ch.length !== width || k < 0) die(`malformed item (key "${String(key).slice(0, 40)}")`)
  const rest = shuffleWith(ch.filter((_, j) => j !== k), r); let q = 0
  return Object.fromEntries(LL.map(s => [s, s === letter ? ch[k] : rest[q++]]))
}
const flat = (n, r, width = 4) => { const LL = L.slice(0, width).split(''), off = Math.floor(r() * width); return shuffleWith(Array.from({ length: n }, (_, i) => LL[(i + off) % width]), r) }
function mapControls() {
  const R = rdAbs(D + 'map-pilot-2-control-r.batch.json'), V = rdAbs(D + 'map-pilot-control.batch.json')
  if (R.length !== 8 || V.length !== 12) die('controls must be batch 2\'s 8 R and 12 V')
  return [...R.map(x => ({ uid: x.id, arm: 'controlR', choices: x.choices, key: x.correct_answer })), ...V.map(x => ({ uid: x.id, arm: 'controlV', choices: x.choices, key: x.correct_answer }))]
}
function ooFile(fam, items, seed0, name) {
  let seed = seed0, tries = 0, order, letters, r
  const grp = x => (x.arm.startsWith('control') ? x.arm : 'cand')
  for (;;) {
    tries++; r = rng(seed++); order = shuffleWith(items.slice(), r)
    const q = {}; for (const g of new Set(items.map(grp))) q[g] = flat(items.filter(x => grp(x) === g).length, r)
    letters = order.map(x => q[grp(x)].pop())
    if (!periodicity(letters.join('')).fail) break
    if (tries > 500) die('no E8-clean deal in 500 seeds')
  }
  const blind = {}, key = {}
  order.forEach((x, i) => { const b = `L${String(i + 1).padStart(2, '0')}`; blind[b] = { options: place(x.choices, x.key, letters[i], r, 4) }; key[b] = { letter: letters[i], width: 4, localId: x.uid, arm: x.arm, set: x.set ?? null, subskill: x.subskill ?? null } })
  writeFileSync(dir(fam) + `${name}.blind.json`, JSON.stringify(blind, null, 1) + '\n')
  writeFileSync(dir(fam) + `${name}.key.json`, JSON.stringify(key, null, 1) + '\n')
  console.log(`${name}: ${order.length} items, seeds tried ${tries}; candidate keys ${Object.values(key).filter(k => k.arm === 'comprehension').map(k => k.letter).join('')}`)
}
function cmdRender(fam, what) {
  const c = CFG[fam]
  if (what === 'verify') {
    const items = rd(fam, existsSync(dir(fam) + 'batch.repaired.json') && process.argv.includes('--repaired') ? 'batch.repaired.json' : 'batch.candidate.json')
    writeFileSync(dir(fam) + 'verify.input.json', JSON.stringify(items.map(it => ({ id: it.id, passage: it.passage, question: it.prompt, choices: it.choices, key: it.correct_answer, key_support: it.key_support, distractors: it.distractors.map(d => ({ text: d.text, misreading: d.habit, panel_answers: d.quotes, refutation_sentence: d.refutation_sentence, why_not_single_sentence: d.why_not_single_sentence })) })), null, 1) + '\n')
    console.log(`verify input: ${items.length} items`); return
  }
  if (fam === 'ssat') die('SSAT ws/oo/nat renders are ssat-wv.mjs build (pilot 4 instrument, unchanged); see the prereg')
  const batch = rd(fam, 'batch.json')
  if (what === 'ws') {
    let seed = 20261107, tries = 0, order, letters, r
    for (;;) { tries++; r = rng(seed++); order = shuffleWith(batch.slice(), r); letters = flat(order.length, r); if (!periodicity(letters.join('')).fail) break; if (tries > 500) die('no E8-clean deal') }
    const key = {}, md = [`# Items for review (${order.length})\n\nEach item: strand, stated grade target and target band, passage, question, four options. The correct answer is NOT marked.\n`]
    order.forEach((it, i) => {
      const n = i + 1, opts = place(it.choices, it.correct_answer, letters[i], r, 4)
      key[n] = { letter: letters[i], localId: it.id, stratum: it.stratum, target_band: it.target_band, distractorLetters: 'ABCD'.split('').filter(s => s !== letters[i]) }
      md.push(`---\n\n## Item ${n}\n\nStrand: ${it.map_area} - ${it.map_strand} | Grade target: ${it.grade_target} | Target band: ${it.target_band}\n\nPassage:\n\n${it.passage}\n\nQuestion: ${it.prompt}\n\n${'ABCD'.split('').map(s => `${s}. ${opts[s]}`).join('\n')}\n`)
    })
    writeFileSync(dir(fam) + 'ws.md', md.join('\n')); writeFileSync(dir(fam) + 'ws.key.json', JSON.stringify(key, null, 1) + '\n')
    console.log(`ws render: ${order.length} items, seeds tried ${tries}; key sequence ${letters.join('')}`)
  } else if (what === 'oo') {
    // leakage-free: file f holds exactly one item of each set (attack-split rule), all 20 controls in every file
    const sets = Object.keys(c.sets).map(s => shuffleWith(batch.filter(x => x.set_id === s).map(x => x.id).sort(), rng(20261108 + s.length)))
    const K = Math.max(...sets.map(s => s.length))
    for (let f = 0; f < K; f++) {
      const mine = new Set(sets.map(s => s[f]).filter(Boolean))
      ooFile(fam, [...batch.filter(x => mine.has(x.id)).map(it => ({ uid: it.id, arm: 'comprehension', set: it.set_id, subskill: it.subskill, choices: it.choices, key: it.correct_answer })), ...mapControls()], 20261109 + 100 * f, `oo-f${f + 1}`)
    }
  } else if (what === 'nat') {
    const ctl = rdAbs(D + 'map-pilot-2-rlu.batch.json').filter(x => x.stratum === 'comprehension' && x.passage)
    if (ctl.length !== 6) die(`naturalness control: expected batch 2's 6 comprehension passages, got ${ctl.length}`)
    const cand = Object.keys(c.sets).map(s => ({ src: s, passage: batch.find(x => x.set_id === s)?.passage })).filter(x => x.passage)
    const all = shuffleWith([...cand, ...ctl.map(x => ({ src: `ctl:${x.id}`, passage: x.passage }))], rng(20261110))
    const nkey = {}
    writeFileSync(dir(fam) + 'naturalness.json', JSON.stringify(all.map((x, i) => { nkey[`N${i + 1}`] = x.src; return { id: `N${i + 1}`, passage: x.passage } }), null, 1) + '\n')
    writeFileSync(dir(fam) + 'naturalness.key.json', JSON.stringify(nkey, null, 1) + '\n')
    console.log(`naturalness: ${all.length} passages (${cand.length} candidate, 6 control)`)
  } else die('render verify|ws|oo|nat')
}
const bandLo = b => { const m = String(b ?? '').match(/(\d{3})\s*-\s*(\d{3})/); return m ? +m[1] : null }
function cmdScore(fam, what) {
  const c = CFG[fam], N = Object.keys(c.sets).length * c.items
  if (what === 'verify') {
    const f = process.argv.includes('--repaired') ? 'verify-2.json' : 'verify.json'
    const v = lab(rd(fam, f)), inp = rd(fam, 'verify.input.json')
    let ok = 0
    for (const it of inp) { const r = v[it.id]; if (!r) die(`${f} missing ${it.id}`); const pass = r.key_correct === true && r.key_unique === true && r.refutations_valid === true && r.provenance_faithful === true; if (pass) ok++; console.log(`${pass ? 'ok  ' : 'FAIL'} ${it.id}${pass ? '' : ': ' + (r.note ?? '')}`) }
    console.log(`verifier: ${ok}/${inp.length} pass`); return
  }
  if (what === 'q' || what === 'ws') {
    let rows = [], graders
    if (fam === 'map') {
      const key = rd(fam, 'ws.key.json'), ids = Object.keys(key)
      graders = ['a', 'b'].map(t => [t, lab(rd(fam, `ws.grader-${t}.json`))])
      for (const [t, g] of graders) { const miss = ids.filter(i => !/^[A-D]$/.test(g[i]?.pick ?? '') || bandLo(g[i]?.band_assigned) == null || !['fits', 'too_easy', 'too_hard'].includes(g[i]?.grade_fit) || !['plausible', 'easier', 'harder'].includes(g[i]?.band) || typeof g[i]?.option_quality !== 'object'); if (miss.length) die(`grader ${t} missing fields on ${miss.join(',')}`) }
      if (ids.length < 11) die(`${ids.length} items; stage 0 requires >= 11`)
      for (const id of ids) for (const [, g] of graders) rows.push({ labels: g[id].option_quality, pick: g[id].pick, distractorLetters: key[id].distractorLetters })
      const drops = N - ids.length
      for (let i = 0; i < drops * 2; i++) rows.push({ labels: {}, pick: null, distractorLetters: Array(c.k).fill('X') })
      if (what === 'ws') {
        console.log(`denominators: ${ids.length} rendered x 2 graders; C, S1-b, G count out of ${N} (${drops} drop(s) count as failures)\n`)
        const s = { excl: 0, pass: 0, easier: 0, harder: 0, deadBoth: drops, diffs: { a: [], b: [] } }
        for (const id of ids) {
          const k = key[id], r = wsItem(graders.map(([t, g]) => [t, g[id]]), k)
          if (r.excl) s.excl++; if (r.c3 && r.c4) s.pass++; if (!r.c4) { s.deadBoth++; r.why.push(`dead by both: ${r.deadBoth.join(',')}`) }
          for (const [t, g] of graders) { if (g[id].band === 'easier') s.easier++; if (g[id].band === 'harder') s.harder++; s.diffs[t].push((bandLo(g[id].band_assigned) - bandLo(k.target_band)) / 10) }
          console.log(`${r.c3 && r.c4 ? 'PASS' : 'HOLD'} ${String(id).padStart(2)} ${k.localId} [${k.target_band}] ${graders.map(([t, g]) => `${t}:${g[id].band_assigned}(${g[id].band}) q=${k.distractorLetters.map(d => (g[id].pick === d ? 'PICKED' : g[id].option_quality?.[d] ?? '-')).join('/')}`).join(' ')} ${r.why.join(' | ')}`)
        }
        const B = wsBars6(s), Q = qBar(rows)
        console.log(`\nBAR C    exclusivity ${s.excl}/${N} (bar >= 10) -> ${B.C ? 'PASS' : 'FAIL'}`)
        console.log(`BAR S1-b pilot-pass ${s.pass}/${N} (bar >= 10) -> ${B.b ? 'PASS' : 'FAIL'}`)
        console.log(`BAR S1-c easier ${s.easier}/${2 * ids.length} (bar <= 4), harder ${s.harder}/${2 * ids.length} (bar < 6) -> ${B.c ? 'PASS' : 'FAIL'}`)
        console.log(`BAR S1-d band offset a ${B.ma.toFixed(2)}, b ${B.mb.toFixed(2)} (bar +-0.5) -> ${B.d ? 'PASS' : 'FAIL'}`)
        console.log(`BAR G    option dead by both on ${s.deadBoth}/${N} items (bar <= 2; drops count) -> ${B.G ? 'PASS' : 'FAIL'}`)
        console.log(`BAR Q    distractor labels plausible-or-better ${Q.good}/${Q.n} = ${Q.rate.toFixed(1)}% (bar >= 75%; picked counts strong; drops count as not plausible) -> ${Q.pass ? 'PASS' : 'FAIL'}`)
        for (const [t] of graders) { const q = qBar(rows.filter((_, i) => i < ids.length * 2 && i % 2 === (t === 'a' ? 0 : 1))); console.log(`         grader ${t}: ${q.good}/${q.n} = ${q.rate.toFixed(1)}%`) }
        console.log(`\nSTAGE 2 ${B.C && B.b && B.c && B.d && B.G && Q.pass ? 'PASSES' : 'DOES NOT PASS'}`); return
      }
    } else {
      const key = rd(fam, 'attack.key.json'), items = Object.entries(key).filter(([, k]) => k.pop === 'withsource')
      if (!items.length) die('no with-source items in attack.key.json')
      graders = ['a', 'b'].map(t => [t, lab(rd(fam, `ws-${t}.json`))])
      for (const [t, g] of graders) { const miss = items.filter(([q]) => !/^[A-E]$/.test(g[q]?.pick ?? '') || typeof g[q]?.option_quality !== 'object').map(([q]) => q); if (miss.length) die(`grader ${t} missing pick/option_quality on ${miss.join(',')}`) }
      for (const [q, k] of items) for (const [, g] of graders) rows.push({ labels: g[q].option_quality, pick: g[q].pick, distractorLetters: L.split('').filter(s => s !== k.fKey) })
      const drops = N - items.length
      for (let i = 0; i < drops * 2; i++) rows.push({ labels: {}, pick: null, distractorLetters: Array(c.k).fill('X') })
      console.log(`denominators: ${items.length} rendered items x 2 graders x ${c.k} distractors (+ ${drops} drop(s) counted as not plausible)`)
    }
    const Q = qBar(rows)
    console.log(`BAR Q distractor labels plausible-or-better ${Q.good}/${Q.n} = ${Q.rate.toFixed(1)}% (bar >= 75%) -> ${Q.pass ? 'PASS' : 'FAIL'}`)
    process.exit(Q.pass ? 0 : 1)
  }
  if (fam === 'ssat') die('SSAT A/B/C/E/F are ssat-wv.mjs score (pilot 4 scorer, unchanged); Q is `score ssat q`')
  if (what === 'oo') {
    const files = []; for (let f = 1; existsSync(dir(fam) + `oo-f${f}.key.json`); f++) files.push(`oo-f${f}`)
    if (files.length !== c.items) die(`${files.length} oo files, the split fixes ${c.items}`)
    const rows = files.flatMap(nm => {
      const key = rd(fam, `${nm}.key.json`), ids = Object.keys(key)
      const S = ['a', 'b', 'c'].map(s => [`${nm}.solver-${s}.json`, lab(rd(fam, `${nm}.solver-${s}.json`))])
      for (const [p, s] of S) { const miss = ids.filter(i => !/^[A-D]$/.test(s[i]?.pick ?? '')); if (miss.length) die(`${p} missing picks on ${miss.length} ids`) }
      return ids.map(id => { const k = key[id], picks = S.map(([, s]) => s[id].pick); return { ...k, picks, h: picks.filter(x => x === k.letter).length } })
    })
    const rate = rs => 100 * rs.reduce((a, r) => a + r.h, 0) / (3 * rs.length)
    const cand = rows.filter(r => r.arm === 'comprehension'), R = rows.filter(r => r.arm === 'controlR'), V = rows.filter(r => r.arm === 'controlV')
    if (cand.length < 11) die(`${cand.length} candidate items in the oo files`)
    const un = rs => rs.filter(r => new Set(r.picks).size === 1).length, unK = cand.filter(r => r.h === 3).length, cR = rate(R)
    console.log(`denominators: ${cand.length} candidate items x 3 samples in ${files.length} split files (one item per passage per file); control R ${R.length / files.length} x ${3 * files.length}, V ${V.length / files.length} x ${3 * files.length}`)
    console.log(`  candidate ${rate(cand).toFixed(1)}% | unanimous on some letter ${un(cand)}/${cand.length} (${(100 * un(cand) / cand.length).toFixed(1)}%), on key ${unK}/${cand.length}`)
    console.log(`  control R ${cR.toFixed(1)}% (valid 10-45) | unanimous ${(100 * un(R) / R.length).toFixed(1)}%   control V ${rate(V).toFixed(1)}% | unanimous ${(100 * un(V) / V.length).toFixed(1)}%`)
    for (const s of Object.keys(c.sets)) console.log(`  ${s}: ${rate(cand.filter(r => r.set === s)).toFixed(1)}%  per item ${cand.filter(r => r.set === s).map(r => `${r.localId.replace(/^MAPM-/, '')}:${r.h}/3`).join(' ')}`)
    const A = barA(rate(cand), unK, cand.length, cR)
    console.log(`\nBAR A (n=${cand.length}): ${rate(cand).toFixed(1)}% (bar <= 50), unanimous on key ${unK} (bar <= ${Math.floor(0.3 * cand.length)}) -> ${A}`)
    console.log(`\nSTAGE 1 ${A === 'PASS' ? 'PASSES' : A === 'INVALID' ? 'INVALID (re-run once with fresh samples)' : 'DOES NOT PASS'}`); return
  }
  if (what === 'nat') {
    const r = scoreNat(rd(fam, 'naturalness.key.json'), ['nat-1.json', 'nat-2.json'].map(f => lab(rd(fam, f))))
    if (r.error) die(r.error)
    r.log.forEach(x => console.log(`  judge: ${x}`)); if (r.per) console.log(`  pooled medians: candidate ${r.cm} (n=${r.cr.length}), control ${r.lm} (n=${r.lr.length})`)
    console.log(`BAR E: ${r.verdict}\n\nSTAGE 3 ${r.verdict === 'PASS' ? 'PASSES' : 'DOES NOT PASS'}`); return
  }
  die('score verify|ws|oo|nat|q')
}

function selftest() {
  let fail = 0
  const expect = (cond, m) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${m}`); if (!cond) fail++ }
  const src = 'It was a _dark_ and stormy night;\nthe rain fell in torrents -- except at occasional intervals.'
  expect(verbatimOk('the rain fell in torrents - except', src) && !verbatimOk('the rain fell in buckets', src), 'V: verbatim excerpt found across a line break and -- ; an altered excerpt is not')
  expect(longestRun('she wanted to keep the old boat', 'Grandfather said she wanted to keep the old boat afloat') === 7 && longestRun('a b c', 'x y z') === 0, 'L1: longest shared word run')
  const passage = 'Martha planted beans along the fence. The beans failed because the hens scratched them up. She did not blame the weather. Next spring she built a wire cage around the rows and the beans grew tall.'
  const base = { passage, prompt: 'Why did the beans fail?', subskill: 'inference', choices: ['The hens scratched the seeds up', 'The weather was too cold for beans', 'The fence shaded the rows', 'The soil was too dry and stony'], correct_answer: 'The hens scratched the seeds up' }
  expect(absentChoices(base).includes('D') && !absentChoices(base).includes('A'), 'A0: an option about dry stony soil is absent; the hens option is present')
  const kill = { text: 'The weather was too cold for beans', refutation_sentence: 'She did not blame the weather.' }
  expect(!singleSentenceKill(base, kill), 'L3: one shared word (weather) is not a single-sentence kill')
  const kill2 = { ...base, choices: ['The hens scratched the seeds up', 'She blamed the cold weather', 'The fence shaded the rows', 'The soil was too dry and stony'] }
  expect(singleSentenceKill(kill2, { text: 'She blamed the cold weather', refutation_sentence: 'She did not blame the weather.' }), 'L3: a negating sentence repeating the option\'s words is a kill')
  const st = { clusters: [{ cid: 'k', status: 'key', readers: ['S1', 'S2', 'H1', 'H2'] }, { cid: 'w1', status: 'wrong', readers: ['H3', 'H4', 'H5'] }, { cid: 'w2', status: 'wrong', readers: ['S3', 'H6'] }, { cid: 'w3', status: 'wrong', readers: ['H7'] }, { cid: 'w4', status: 'wrong', readers: ['H8'] }, { cid: 'x', status: 'ineligible', reason: 'absent', readers: ['H9', 'H10'] }] }
  const t = tallyStem(st, 3)
  expect(!t.e.length && t.eligible && t.chosen.join() === 'w1,w2,w3', 'T: complete clustering, top-3 by size with order tie-break (w3 before w4)')
  expect(tallyStem({ clusters: st.clusters.slice(0, 5) }, 3).e.some(x => x.startsWith('T1')), 'T1: a missing reader is an error')
  expect(!tallyStem({ clusters: [{ ...st.clusters[0], readers: ['S1', 'H1', 'H2'] }, ...st.clusters.slice(1), { cid: 'y', status: 'wrong', readers: ['S2'] }] }, 3).eligible, 'T2: one skilled reader in the key cluster is not eligible')
  expect(tallyStem({ clusters: [...st.clusters.slice(0, 5), { ...st.clusters[5], reason: 'boring' }] }, 3).e.some(x => x.startsWith('T3')), 'T3: ineligible without a listed reason is an error')
  expect(!tallyStem({ clusters: [st.clusters[0], st.clusters[1], st.clusters[2], { cid: 'x', status: 'ineligible', reason: 'absent', readers: ['H7', 'H8', 'H9', 'H10'] }] }, 3).eligible, 'T: two wrong clusters cannot supply three distractors')
  expect(!chosenMatch({ distractors: [{ cid: 'w1' }, { cid: 'w2' }, { cid: 'w4' }] }, t.chosen), 'T3: an assembler that picks w4 over w3 is caught')
  const row = (labels, pick = 'A') => ({ labels, pick, distractorLetters: ['B', 'C', 'D'] })
  const q75 = qBar([row({ B: 'plausible', C: 'strong', D: 'weak' }), row({ B: 'plausible', C: 'plausible', D: 'plausible' }), row({ B: 'strong', C: 'plausible', D: 'plausible' }), row({ B: 'dead', C: 'weak', D: 'plausible' })])
  expect(q75.good === 9 && q75.n === 12 && q75.pass, 'Q: 9/12 = 75% passes exactly at the margin')
  expect(!qBar([row({ B: 'plausible', C: 'strong', D: 'weak' }), row({ B: 'plausible', C: 'plausible', D: 'weak' }), row({ B: 'strong', C: 'plausible', D: 'plausible' }), row({ B: 'dead', C: 'weak', D: 'plausible' })]).pass, 'Q: 8/12 fails')
  expect(qBar([row({ C: 'plausible', D: 'plausible', A: 'dead' }, 'B')]).good === 3, 'Q: a distractor the grader picked counts as strong')
  expect(qBar([row({ B: 'plausible' })]).good === 1, 'Q: a missing label counts as not plausible')
  expect(Number.isNaN(qBar([]).rate) && !qBar([]).pass, 'Q: an empty population returns no number and does not pass')
  const four = it => ({ ...it, choices: it.choices.slice(0, 4) })
  expect(lengthTell([four({ choices: ['aaaa', 'b', 'c', 'd'], correct_answer: 'aaaa' }), four({ choices: ['a', 'bbbb', 'c', 'd'], correct_answer: 'a' }), four({ choices: ['a', 'bbbb', 'c', 'd'], correct_answer: 'a' }), four({ choices: ['a', 'bbbb', 'c', 'd'], correct_answer: 'a' })]).ok, 'E3: 1/4 uniquely longest passes (25%)')
  expect(!lengthTell([four({ choices: ['aaaa', 'b', 'c', 'd'], correct_answer: 'aaaa' }), four({ choices: ['aaaa', 'b', 'c', 'd'], correct_answer: 'aaaa' }), four({ choices: ['a', 'bbbb', 'c', 'd'], correct_answer: 'a' })]).ok, 'E3: 2/3 fails')
  expect(barA(50, 3, 12, 25) === 'PASS' && barA(50, 4, 12, 25) === 'FAIL' && barA(50.1, 0, 12, 25) === 'FAIL' && barA(30, 0, 12, 9) === 'INVALID', 'A (imported): 50% and unanimous 3/12 is the margin; control R 9% invalid')
  const z = (n, v) => Array(n).fill(v), s0 = { excl: 10, pass: 10, easier: 4, harder: 5, deadBoth: 2, diffs: { a: z(12, 0), b: z(12, 0) } }
  expect(Object.values(wsBars6(s0)).slice(0, 5).every(Boolean) && !wsBars6({ ...s0, excl: 9 }).C && !wsBars6({ ...s0, deadBoth: 3 }).G, 'ws (imported wsBars6): margins pass, 9/12 C and 3/12 G fail')
  console.log(fail ? `SELFTEST FAILED (${fail})` : 'selftest passed: every check and bar can fail at its margin')
  process.exit(fail ? 1 : 0)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, fam, arg] = process.argv.slice(2)
  if (cmd === '--selftest') selftest()
  else if (cmd === 'fk') cmdFk(fam)
  else if (cmd === 'verbatim') cmdVerbatim(fam)
  else if (cmd === 'panel') cmdPanel(fam)
  else if (cmd === 'tally') cmdTally(fam)
  else if (cmd === 'checks') cmdChecks(fam, arg)
  else if (cmd === 'render') cmdRender(fam, arg)
  else if (cmd === 'score') cmdScore(fam, arg)
  else die('usage: misread.mjs fk|verbatim|tally|checks|render|score <map|ssat> ... | --selftest')
}
