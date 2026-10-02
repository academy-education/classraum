#!/usr/bin/env node
/**
 * map-pilot-checks.mjs <batch.json...>      exact checks E1-E6 for the MAP pilot
 * map-pilot-checks.mjs --selftest           break-test every check first
 *
 * Bars are fixed in MAP-PILOT-2026-10-02.prereg.md. This script refuses
 * (exit 2) rather than print a verdict over input it could not read, and
 * exits 1 if any item fails a bar.
 *
 *   E1  Flesch-Kincaid grade in [4.0, 9.0) for every passage and every
 *       stem/option sentence of >= 15 words; shorter units are UNSCORABLE
 *       (counted, neither pass nor fail). Coleman-Liau printed alongside.
 *   E3  key uniquely longest <= 25%, uniquely shortest <= 25% (whole + per file)
 *   E4  spelling: NSSpellChecker + /usr/share/dict/words; exactly one
 *       correct (or one incorrect, by polarity); misspellings DL 1-2 from the
 *       intended word, same first letter, length +-2
 *   E5  capitalization: four options identical when lowercased; cap_rule distinct
 *   E6  four options each
 */
import { readFileSync, existsSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// ---------- readability ----------
export function syllables(word) {
  let w = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!w) return 0
  if (w.length <= 3) return 1
  w = w.replace(/(?:[^laeiouy]es|[^laeiouy]ed|[^laeiouy]e)$/, '').replace(/^y/, '')
  const m = w.match(/[aeiouy]{1,2}/g)
  return Math.max(1, m ? m.length : 1)
}
const clean = t => String(t ?? '').replace(/_{2,}/g, ' blank ').replace(/\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim()
export function sentences(t) {
  return clean(t).split(/(?<=[.!?]["”’)]?)\s+(?=["“‘(]?[A-Z0-9])/).map(s => s.trim()).filter(s => /[a-z]/i.test(s))
}
const words = t => clean(t).split(/\s+/).filter(w => /[a-z]/i.test(w))
export function readability(text) {
  const sents = sentences(text), ws = words(text)
  if (!sents.length || !ws.length) return null
  const syl = ws.reduce((a, w) => a + syllables(w), 0)
  const letters = ws.join('').replace(/[^a-z]/gi, '').length
  const fk = 0.39 * (ws.length / sents.length) + 11.8 * (syl / ws.length) - 15.59
  const cl = 0.0588 * (100 * letters / ws.length) - 0.296 * (100 * sents.length / ws.length) - 15.8
  return { fk, cl, words: ws.length, sentences: sents.length }
}

// ---------- spelling ----------
let WEB2 = null
const web2 = () => (WEB2 ??= new Set(readFileSync('/usr/share/dict/words', 'utf8').split('\n')))
export function nsspell(list) {
  const f = join(tmpdir(), `mapspell-${process.pid}.js`)
  writeFileSync(f, `ObjC.import('AppKit');function run(a){const sc=$.NSSpellChecker.sharedSpellChecker;return JSON.stringify(a.map(w=>{const r=sc.checkSpellingOfStringStartingAt(w,0);return r.location>w.length}))}`)
  const out = JSON.parse(execFileSync('osascript', ['-l', 'JavaScript', f, ...list], { encoding: 'utf8' }).trim())
  if (out.length !== list.length) throw new Error('NSSpellChecker returned the wrong count')
  return out
}
export function dl(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 0; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    const c = a[i - 1] === b[j - 1] ? 0 : 1
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c)
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
  }
  return d[a.length][b.length]
}
export function checkSpelling(it) {
  const errs = [], notes = []
  const opts = it.choices.map(String)
  if (opts.some(o => /\s/.test(o.trim()))) errs.push('spelling options must be single words')
  const ok = nsspell(opts.map(o => o.trim()))
  const inW = opts.map(o => web2().has(o.trim()) || web2().has(o.trim().toLowerCase()))
  const pol = it.spelling_polarity
  if (pol !== 'correct' && pol !== 'incorrect') { errs.push(`spelling_polarity missing/invalid (${pol})`); return { errs, notes } }
  const keyIdx = opts.indexOf(String(it.correct_answer))
  if (pol === 'correct') {
    const good = ok.map((v, i) => v).filter(Boolean).length
    if (good !== 1) errs.push(`${good} options pass NSSpellChecker (need exactly 1)`)
    if (!ok[keyIdx]) errs.push('key fails NSSpellChecker')
    if (!inW[keyIdx]) notes.push(`key "${opts[keyIdx]}" not in web2 (inflected?) — flagged, not failed`)
    opts.forEach((o, i) => {
      if (i === keyIdx) return
      if (inW[i]) errs.push(`distractor "${o}" is in web2 (a real word)`)
      const k = opts[keyIdx].toLowerCase(), x = o.toLowerCase()
      const d = dl(k, x)
      if (d < 1 || d > 2) errs.push(`distractor "${o}" is DL ${d} from key (need 1-2)`)
      if (k[0] !== x[0]) errs.push(`distractor "${o}" changes the first letter`)
      if (Math.abs(k.length - x.length) > 2) errs.push(`distractor "${o}" length differs by >2`)
    })
  } else {
    const bad = ok.filter(v => !v).length
    if (bad !== 1) errs.push(`${bad} options fail NSSpellChecker (need exactly 1 misspelled)`)
    if (ok[keyIdx]) errs.push('key (the misspelled word) passes NSSpellChecker')
    if (inW[keyIdx]) errs.push('key (the misspelled word) is in web2')
    if (!it.intended_word) notes.push('no intended_word given; plausibility of the misspelling not scripted — grader judges')
    else {
      const k = String(it.intended_word).toLowerCase(), x = opts[keyIdx].toLowerCase(), d = dl(k, x)
      if (d < 1 || d > 2 || k[0] !== x[0] || Math.abs(k.length - x.length) > 2) errs.push(`misspelling "${x}" implausible vs "${k}" (DL ${d})`)
    }
  }
  return { errs, notes }
}

// ---------- per-item ----------
function unitsOf(it) {
  const u = []
  if (it.passage) u.push({ where: 'passage', text: it.passage, whole: true })
  for (const s of sentences(it.prompt)) u.push({ where: 'stem', text: s })
  it.choices.forEach((c, i) => { for (const s of sentences(c)) u.push({ where: `opt${'ABCD'[i]}`, text: s }) })
  return u
}
export function checkItem(it) {
  const errs = [], notes = [], e1 = { scored: [], unscorable: 0 }
  if (!Array.isArray(it.choices) || it.choices.length !== 4) errs.push(`E6 width ${it.choices?.length}`)
  if (!it.choices?.map(String).includes(String(it.correct_answer))) errs.push('key not among choices')
  for (const u of unitsOf(it)) {
    const n = words(u.text).length
    if (n < 15) { e1.unscorable++; continue }
    const r = readability(u.text)
    if (!r) { e1.unscorable++; continue }
    e1.scored.push({ where: u.where, fk: +r.fk.toFixed(1), cl: +r.cl.toFixed(1), n })
    if (!(r.fk >= 4.0 && r.fk < 9.0)) errs.push(`E1 ${u.where} FK ${r.fk.toFixed(1)} (CL ${r.cl.toFixed(1)}, ${n} words)`)
  }
  if (it.map_strand === 'Spelling') { const s = checkSpelling(it); errs.push(...s.errs.map(e => 'E4 ' + e)); notes.push(...s.notes) }
  if (it.map_strand === 'Capitalization') {
    const low = new Set(it.choices.map(c => String(c).toLowerCase()))
    if (low.size !== 1) errs.push(`E5 options differ beyond case (${low.size} distinct lowercased)`)
    if (new Set(it.choices.map(String)).size !== 4) errs.push('E5 duplicate options')
    if (!it.cap_rule) errs.push('E5 cap_rule missing')
  }
  return { errs, notes, e1 }
}
function lengthTell(items) {
  let longest = 0, shortest = 0
  for (const it of items) {
    const L = it.choices.map(c => String(c).length), k = L[it.choices.map(String).indexOf(String(it.correct_answer))]
    const mx = Math.max(...L), mn = Math.min(...L)
    if (k === mx && L.filter(x => x === mx).length === 1) longest++
    if (k === mn && L.filter(x => x === mn).length === 1) shortest++
  }
  return { n: items.length, longest, shortest, pl: 100 * longest / items.length, ps: 100 * shortest / items.length }
}

// ---------- selftest (break each check) ----------
async function selftest() {
  let fail = 0
  const expect = (cond, msg) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${msg}`); if (!cond) fail++ }
  const simple = readability('The cat sat on the mat. The dog ran to the park. We had fun in the sun all day long with Mom and Dad.')
  expect(simple.fk < 4, `simple text FK ${simple.fk.toFixed(1)} < 4`)
  // A live SAT R&W passage, read from the bank, must score >= 10.
  const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
  const { createClient } = await import('@supabase/supabase-js')
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const { data, error } = await db.from('study_item_bank').select('id,item').eq('family', 'sat').eq('section', 'reading_writing').eq('domain', 'Information and Ideas').eq('difficulty', 'hard').eq('verified', true).eq('archived', false).limit(20)
  if (error || !data?.length) { console.error('REFUSING: could not load SAT passages for the break-test'); process.exit(2) }
  const fks = data.map(r => readability(r.item?.passage)).filter(r => r && r.words >= 60).map(r => r.fk)
  if (fks.length < 5) { console.error(`REFUSING: only ${fks.length} scorable SAT passages`); process.exit(2) }
  const med = fks.sort((a, b) => a - b)[Math.floor(fks.length / 2)]
  expect(med >= 10, `live SAT hard I&I passages: median FK ${med.toFixed(1)} >= 10 (n=${fks.length})`)
  const two = checkSpelling({ choices: ['receive', 'separate', 'recieve', 'reseive'], correct_answer: 'receive', spelling_polarity: 'correct' })
  expect(two.errs.length > 0, `two correct spellings FAILS: ${two.errs[0]}`)
  const nonword = checkSpelling({ choices: ['necessary', 'neccessary', 'necesary', 'xqzvbn'], correct_answer: 'necessary', spelling_polarity: 'correct' })
  expect(nonword.errs.some(e => /DL|first letter|length/.test(e)), `non-word distractor FAILS: ${nonword.errs.find(e => /DL|first letter|length/.test(e))}`)
  const good = checkSpelling({ choices: ['necessary', 'neccessary', 'necesary', 'necessery'], correct_answer: 'necessary', spelling_polarity: 'correct' })
  expect(good.errs.length === 0, `a sound spelling item PASSES (${good.errs.join('; ') || 'no errors'})`)
  const cap = checkItem({ map_strand: 'Capitalization', cap_rule: 'x', prompt: 'Which is right?', choices: ['We met Aunt Rosa.', 'We met aunt Rosa.', 'We met Aunt rosa.', 'We saw Aunt Rosa.'], correct_answer: 'We met Aunt Rosa.' })
  expect(cap.errs.some(e => e.startsWith('E5')), 'cap item with a changed word FAILS')
  const lt = lengthTell([{ choices: ['aaaa', 'b', 'c', 'd'], correct_answer: 'aaaa' }, { choices: ['a', 'bb', 'cc', 'dd'], correct_answer: 'a' }])
  expect(lt.longest === 1 && lt.shortest === 1, 'length tell counts unique longest/shortest')
  console.log(fail ? `SELFTEST FAILED (${fail})` : 'selftest passed — the checks can fail')
  process.exit(fail ? 1 : 0)
}

// ---------- main ----------
const args = process.argv.slice(2)
const isMain = import.meta.url === `file://${process.argv[1]}`
if (!isMain) { /* imported */ }
else if (args[0] === '--selftest') await selftest()
else {
  if (!args.length) { console.error('usage: map-pilot-checks.mjs <batch.json...> | --selftest'); process.exit(2) }
  let anyFail = 0, unmeasured = 0
  const all = []
  for (const f of args) {
    if (!existsSync(f)) { console.error(`REFUSING: ${f} does not exist`); process.exit(2) }
    const items = JSON.parse(readFileSync(f, 'utf8'))
    if (!Array.isArray(items) || !items.length) { console.error(`REFUSING: ${f} holds no items`); process.exit(2) }
    console.log(`\n== ${f.split('/').pop()}: ${items.length} items`)
    let scored = 0, unsc = 0
    for (const it of items) {
      const r = checkItem(it)
      scored += r.e1.scored.length; unsc += r.e1.unscorable
      const fk = r.e1.scored.map(s => `${s.where} FK ${s.fk}/CL ${s.cl}`).join(', ') || 'no scorable unit'
      console.log(`${r.errs.length ? 'FAIL' : 'ok  '} ${it.id} [${it.map_strand} | ${it.target_band} | g${it.grade_target}] ${fk}`)
      for (const e of r.errs) console.log(`       x ${e}`)
      for (const n of r.notes) console.log(`       ~ ${n}`)
      if (r.errs.length) anyFail++
    }
    console.log(`E1 denominator: ${scored} scored units, ${unsc} unscorable (<15 words)`)
    if (!scored) { console.log(`E1 NOT MEASURED for ${f.split('/').pop()}: zero units of >= 15 words. No readability number is reported for this file.`); unmeasured++ }
    const lt = lengthTell(items)
    const ltBad = lt.pl > 25 || lt.ps > 25
    console.log(`E3 key uniquely longest ${lt.longest}/${lt.n} (${lt.pl.toFixed(1)}%), uniquely shortest ${lt.shortest}/${lt.n} (${lt.ps.toFixed(1)}%) ${ltBad ? 'FAIL' : 'ok'}`)
    if (ltBad) anyFail++
    const slot = {}; for (const it of items) { const s = 'ABCD'[it.choices.map(String).indexOf(String(it.correct_answer))]; slot[s] = (slot[s] ?? 0) + 1 }
    console.log(`E2 authored key slots (reported only; renders reshuffle) ${JSON.stringify(slot)}`)
    const rules = items.filter(i => i.map_strand === 'Capitalization').map(i => i.cap_rule)
    if (rules.length && new Set(rules).size !== rules.length) { console.log(`E5 FAIL cap_rule repeats: ${rules.join(' | ')}`); anyFail++ }
    const pats = items.filter(i => i.map_strand === 'Spelling').map(i => i.spelling_pattern)
    if (pats.length && new Set(pats).size !== pats.length) { console.log(`E4 FAIL spelling_pattern repeats`); anyFail++ }
    all.push(...items)
  }
  if (args.length > 1) {
    const lt = lengthTell(all)
    const bad = lt.pl > 25 || lt.ps > 25
    console.log(`\nE3 all ${lt.n}: longest ${lt.pl.toFixed(1)}%, shortest ${lt.ps.toFixed(1)}% ${bad ? 'FAIL' : 'ok'}`)
    if (bad) anyFail++
  }
  console.log(anyFail ? `\n${anyFail} failure(s)` : `\nall exact checks pass${unmeasured ? ` — except E1, NOT MEASURED on ${unmeasured} file(s)` : ''}`)
  process.exit(anyFail ? 1 : unmeasured ? 2 : 0)
}
