#!/usr/bin/env node
/**
 * absent-check.mjs — A1, the replacement for the lexical absent-option rule A0
 * (ssat-wv.mjs WV4 rule A / misread.mjs absentChoices). READING-BAR-CALIBRATION-2026-10-07 Stage A step 3.
 *
 * WHY. A0 counts an option's distinctive content words found (5-letter stem match) in the passage and
 * flags the option when fewer than half are present. It was break-tested only on its own fixture. Run on
 * sound items it flags correct KEYS written in paraphrase: 9/10 of MAP batch 2's passage items, 5/12 of
 * MAP pilot 7's, 16/138 live SSAT keys (MAP-MISREAD-PILOT-2026-10-07.md, Stage 0). A lexical rule cannot
 * tell "smooth out uneven spending" (a paraphrase of "the timing of their spending") from "museum".
 *
 * A1 = A0 as a cheap PREFILTER, then a presence judgement on what A0 flags:
 *   1. exempt: vocabulary-in-context (the options are senses of a word that IS in the passage) and
 *      attitude/tone (the attitude word is, by design, never named: WV4 brief rule E);
 *   2. A0 flags the option (unchanged lexical rule);
 *   3. two fresh, key-blind Claude judges each say whether the passage DISCUSSES what the option is about,
 *      in any words, truth irrelevant, with a verbatim passage quote. An option is ABSENT under A1 only if
 *      A0 flags it AND no judge establishes presence (discussed=true with a quote of >= 3 words that is
 *      verbatim in the passage). A judge's "discussed" without a verifiable quote does not count.
 * A1 inherits A0's false negatives (an absent option A0 does not flag is never judged). That is stated,
 * not hidden: pilot 3's "follow their food" passes A0 on an incidental "following".
 *
 *   build                writes reading-cal/a1/judge-N.json (key-blind) + a1/key.json
 *   score                reads a1/judge-N.{a,b}.json; keys flagged A0 vs A1 per known-good set; bad cases fired
 *   --selftest
 * Exported for Stage B (ssat-wv.mjs WV5): exempt, lexicalFlags, a1Absent, judgeOk.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { content, stemW, distinctive, present } from './ssat-wv.mjs'
import { rng, shuffleWith } from './seeded-shuffle.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const O = join(HERE, 'reading-cal', 'a1')
const L = 'ABCDE'
const die = m => { console.error(`REFUSING: ${m}`); process.exit(2) }
const sha = s => createHash('sha256').update(s).digest('hex')
const rd = p => { if (!existsSync(p)) die(`missing ${p}`); return JSON.parse(readFileSync(p, 'utf8')) }
const vnorm = s => String(s ?? '').toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/—|–|--/g, '-').replace(/[^a-z0-9' -]/g, ' ').replace(/\s+/g, ' ').trim()

export const exempt = it => /vocab/i.test(`${it.subskill ?? ''} ${it.map_strand ?? ''}`) || /most nearly mean/i.test(it.prompt ?? '') || /attitude|tone/i.test(`${it.subskill ?? ''} ${it.prompt ?? ''}`)
/** A0, unchanged: letters whose distinctive words are < half present in the passage */
export function lexicalFlags(it) {
  if (exempt(it)) return []
  const tw = content(it.passage).map(stemW), out = []
  it.choices.forEach((c, j) => { const d = distinctive(it.choices, j); if (d.length && d.filter(w => present(w, tw)).length < Math.ceil(d.length / 2)) out.push(L[j]) })
  return out
}
/** a judge establishes presence only with discussed=true and a >= 3-word quote verbatim in the passage */
export const judgeOk = (v, passage) => v?.discussed === true && String(v.quote ?? '').trim().split(/\s+/).length >= 3 && vnorm(passage).includes(vnorm(v.quote))
/** A1: absent iff A0 flags it and no judge establishes presence */
export const a1Absent = (lexFlag, verdicts, passage) => lexFlag && !verdicts.some(v => judgeOk(v, passage))

// ---------- the test population ----------
async function loadLive() {
  const { createClient } = await import('@supabase/supabase-js')
  const env = Object.fromEntries(readFileSync(join(HERE, '../../.env.local'), 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('study_item_bank').select('id,family,subskill,item').in('family', ['ssat', 'isee']).eq('section', 'reading').eq('verified', true).eq('archived', false).order('id').range(from, from + 999)
    if (error) die(error.message); rows.push(...data); if (data.length < 1000) break
  }
  return rows.map(r => ({ set: `${r.family}-live`, id: r.id, subskill: r.subskill, passage: r.item.passage, prompt: r.item.prompt, choices: r.item.choices, correct_answer: r.item.correct_answer }))
}
const fromFile = (set, f, filt = () => true) => JSON.parse(readFileSync(join(HERE, f), 'utf8')).filter(filt).map(x => ({ set, id: x.id, subskill: x.subskill, map_strand: x.map_strand, passage: x.passage, prompt: x.prompt, choices: x.choices, correct_answer: x.correct_answer }))

async function cmdBuild() {
  const live = await loadLive()
  if (live.filter(x => x.set === 'ssat-live').length < 100 || live.filter(x => x.set === 'isee-live').length < 100) die('live population short')
  const good = [...live,
    ...fromFile('map-b2', 'map-pilot-2-rlu.batch.json', x => x.passage && x.passage.length > 200),
    ...fromFile('map-p7', 'map-adapt7/batch.json')]
  for (const x of good) if (!x.choices.includes(x.correct_answer)) die(`${x.id}: key not among choices`)
  // bad cases: pilot 3's three graded-absent items (drawn versions), and the constructed plants
  const p3 = fromFile('bad-pilot3', 'ssat-wv3-pilot/batch.json', x => ['WV3-P01-1', 'WV3-P02-1', 'WV3-P02-3'].includes(x.id))
  const P3BAD = { 'WV3-P01-1': ['museum'], 'WV3-P02-1': ['herons', 'food'], 'WV3-P02-3': ['herons', 'beetles'] }
  p3.forEach(x => { x.bad = x.choices.map((c, j) => P3BAD[x.id].some(w => c.includes(w)) ? L[j] : null).filter(Boolean) })
  if (p3.length !== 3 || p3.reduce((a, x) => a + x.bad.length, 0) !== 5) die('pilot 3 bad cases: expected 3 items / 5 absent options')
  const plants = rd(join(HERE, 'reading-cal', 'a1-constructed.json')).map(p => {
    const b = good.find(x => x.id === p.base); if (!b) die(`plant base ${p.base} not found`)
    const j = b.choices.indexOf(p.replace); if (j < 0) die(`plant ${p.base}: "${p.replace}" not a choice`)
    if (b.choices[j] === b.correct_answer) die(`plant ${p.base}: would replace the key`)
    if (lexicalFlags(b).length) die(`plant ${p.base}: base already carries an A0 flag (it would also sit in the known-good file)`)
    const choices = [...b.choices]; choices[j] = p.with
    return { ...b, set: 'bad-constructed', id: `${b.id}#plant`, choices, bad: [L[j]] }
  })
  const pop = [...good, ...p3, ...plants].map(x => ({ ...x, lex: lexicalFlags(x), exempt: exempt(x) }))
  // judged: every item A0 flags at least once, all options of it (so the flagged option is not singled out)
  const judged = pop.filter(x => x.lex.length || x.bad)
  const byPassage = {}; for (const x of judged) (byPassage[sha(x.set.startsWith('bad') ? x.set + x.passage : x.passage)] ??= []).push(x)
  const r = rng(parseInt(sha('a1-2026-10-07').slice(0, 8), 16))
  const groups = shuffleWith(Object.values(byPassage), r)
  const files = [[], [], [], []], words = [0, 0, 0, 0], key = {}
  groups.forEach(g => { const i = words.indexOf(Math.min(...words)); files[i].push(g); words[i] += g[0].passage.split(/\s+/).length + g.reduce((a, x) => a + x.choices.join(' ').split(/\s+/).length, 0) })
  mkdirSync(O, { recursive: true })
  files.forEach((fg, fi) => {
    const out = fg.map((g, gi) => {
      const pid = `F${fi + 1}P${gi + 1}`
      return { passage_id: pid, passage: g[0].passage, option_lists: g.map((x, qi) => ({ list_id: `${pid}-Q${qi + 1}`, options: Object.fromEntries(x.choices.map((c, j) => {
        const oid = `${pid}-Q${qi + 1}-${L[j]}`
        key[oid] = { file: fi + 1, set: x.set, item: x.id, letter: L[j], isKey: c === x.correct_answer, lex: x.lex.includes(L[j]), exempt: x.exempt, plantedBad: !!x.bad?.includes(L[j]) }
        return [oid, c]
      })) })) }
    })
    writeFileSync(join(O, `judge-${fi + 1}.json`), JSON.stringify(out, null, 1) + '\n')
  })
  writeFileSync(join(O, 'key.json'), JSON.stringify(key, null, 1) + '\n')
  writeFileSync(join(O, 'passages.json'), JSON.stringify(Object.fromEntries(files.flatMap((fg, fi) => fg.map((g, gi) => [`F${fi + 1}P${gi + 1}`, g[0].passage]))), null, 1) + '\n')
  // the population summary (A0 alone), printed before any judge runs
  console.log('A0 on the known-good population (before any judge):')
  for (const s of ['ssat-live', 'isee-live', 'map-b2', 'map-p7']) {
    const xs = pop.filter(x => x.set === s), keysF = xs.filter(x => x.lex.includes(L[x.choices.indexOf(x.correct_answer)])).length
    const opt = xs.reduce((a, x) => a + x.choices.length, 0), fl = xs.reduce((a, x) => a + x.lex.length, 0)
    console.log(`  ${s.padEnd(10)} items ${String(xs.length).padStart(3)} (exempt ${xs.filter(x => x.exempt).length}); keys flagged by A0 ${keysF}/${xs.length}; options flagged ${fl}/${opt}`)
  }
  for (const x of pop.filter(x => x.bad)) console.log(`  BAD ${x.set} ${x.id}: absent ${x.bad.join(',')}; A0 flags ${x.lex.join(',') || 'none'} -> ${x.bad.every(b => x.lex.includes(b)) ? 'all bad options reach the judges' : 'A0 MISSES ' + x.bad.filter(b => !x.lex.includes(b)).join(',') + ' (A1 cannot fire on it)'}`)
  console.log(`judge files: ${files.map((f, i) => `judge-${i + 1} ${f.length} passages / ${f.reduce((a, g) => a + g.length, 0)} lists / ~${words[i]} words`).join('; ')}; ${Object.keys(key).length} option ids`)
}

function cmdScore() {
  const key = rd(join(O, 'key.json')), passages = rd(join(O, 'passages.json')), ids = Object.keys(key)
  const nf = Math.max(...Object.values(key).map(k => k.file)), J = {}
  for (let f = 1; f <= nf; f++) for (const t of ['a', 'b']) {
    const j = rd(join(O, `judge-${f}.${t}.json`)), lab = j.labels ?? j
    const mine = ids.filter(i => key[i].file === f), miss = mine.filter(i => typeof lab[i]?.discussed !== 'boolean')
    if (miss.length) die(`judge-${f}.${t}: ${miss.length}/${mine.length} options without a boolean "discussed" (${miss.slice(0, 4).join(',')})`)
    for (const i of mine) (J[i] ??= []).push(lab[i])
  }
  const pid = i => i.split('-Q')[0]
  const res = Object.fromEntries(ids.map(i => [i, { ...key[i], a1: a1Absent(key[i].lex, J[i], passages[pid(i)]), anyJudgeAbsent: J[i].some(v => v.discussed === false), bothAbsent: J[i].every(v => v.discussed === false), badQuote: J[i].filter(v => v.discussed === true && !judgeOk(v, passages[pid(i)])).length }]))
  const R = Object.values(res)
  console.log(`A1 score: ${ids.length} judged option ids x 2 judges; ${R.filter(r => r.badQuote).length} "discussed" claims without a verifiable quote (they do not count)\n`)
  console.log('KNOWN-GOOD KEYS (requirement: A1 flags none). Keys outside the judged files carry no A0 flag, so A1 = A0 = not flagged for them.')
  let keyA1 = 0
  for (const s of ['ssat-live', 'isee-live', 'map-b2', 'map-p7']) {
    const ks = R.filter(r => r.set === s && r.isKey), a0 = ks.filter(r => r.lex).length, a1 = ks.filter(r => r.a1).length
    keyA1 += a1
    console.log(`  ${s.padEnd(10)} judged keys ${String(ks.length).padStart(3)}; A0 flags ${a0}; A1 flags ${a1}${a1 ? ' <- ' + ks.filter(r => r.a1).map(r => r.item.slice(0, 8)).join(',') : ''}`)
  }
  console.log('\nKNOWN-GOOD DISTRACTORS (reported: not all are guaranteed present; a live distractor A1 flags is a candidate defect OR a false positive)')
  for (const s of ['ssat-live', 'isee-live', 'map-b2', 'map-p7']) { const ds = R.filter(r => r.set === s && !r.isKey); console.log(`  ${s.padEnd(10)} A0 flags ${ds.filter(r => r.lex).length}; A1 flags ${ds.filter(r => r.a1).length}${ds.filter(r => r.a1).length ? ' <- ' + ds.filter(r => r.a1).map(r => `${r.item.slice(0, 8)}:${r.letter}`).join(',') : ''}`) }
  console.log('\nBAD CASES (requirement: A1 fires on every bad option A0 passes to it)')
  let badReach = 0, badFire = 0
  for (const r of R.filter(r => r.plantedBad)) { if (r.lex) badReach++; if (r.a1) badFire++; console.log(`  ${r.set.padEnd(15)} ${r.item.slice(0, 18).padEnd(18)} ${r.letter}: A0 ${r.lex ? 'flags' : 'MISSES'}; judges ${J[Object.keys(res).find(i => res[i] === r)].map(v => v.discussed === false ? 'absent' : 'present').join('/')}; A1 ${r.a1 ? 'FIRES' : 'silent'}`) }
  const clean = R.filter(r => r.set.startsWith('bad') && !r.plantedBad)
  console.log(`  other options of the bad items: A1 flags ${clean.filter(r => r.a1).length}/${clean.length} (keys ${clean.filter(r => r.isKey && r.a1).length}/${clean.filter(r => r.isKey).length})`)
  console.log(`\nREQUIREMENT 1 (no known-good key flagged): ${keyA1 === 0 ? 'MET' : `NOT MET (${keyA1})`}`)
  console.log(`REQUIREMENT 2 (fires on every bad option that reaches it): ${badFire === badReach && badReach > 0 ? `MET (${badFire}/${badReach})` : `NOT MET (${badFire}/${badReach})`}`)
  writeFileSync(join(O, 'score.json'), JSON.stringify(res, null, 1) + '\n')
}

function selftest() {
  let fail = 0
  const expect = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fail++ }
  const P = 'The hens laid in the hedge all spring, and Mara found the eggs by following the cackling along the lane.'
  const it = { subskill: 'inference', passage: P, choices: ['the hens laid in the hedge', 'the museum bought the eggs', 'Mara followed the cackling', 'the lane was muddy in spring', 'the eggs were hidden'] }
  expect(lexicalFlags(it).includes('B'), 'A0 flags the museum option')
  expect(lexicalFlags({ ...it, subskill: 'vocabulary-in-context' }).length === 0 && lexicalFlags({ ...it, subskill: 'attitude/tone' }).length === 0, 'vocabulary and attitude are exempt')
  expect(judgeOk({ discussed: true, quote: 'found the eggs by following' }, P), 'a verbatim >= 3-word quote establishes presence')
  expect(!judgeOk({ discussed: true, quote: 'the eggs' }, P), 'a 2-word quote does not')
  expect(!judgeOk({ discussed: true, quote: 'bought the eggs at market' }, P), 'a non-verbatim quote does not')
  expect(!judgeOk({ discussed: false, quote: 'found the eggs by following' }, P), 'discussed=false never establishes presence')
  expect(a1Absent(true, [{ discussed: false }, { discussed: false }], P), 'A1 fires: A0 flag and both judges absent')
  expect(!a1Absent(true, [{ discussed: false }, { discussed: true, quote: 'laid in the hedge' }], P), 'A1 silent: one judge establishes presence')
  expect(a1Absent(true, [{ discussed: true, quote: 'nowhere in it' }, { discussed: false }], P), 'A1 fires: a presence claim without a verifiable quote does not count')
  expect(!a1Absent(false, [{ discussed: false }, { discussed: false }], P), 'A1 never fires without the A0 flag (inherits A0 false negatives)')
  console.log(fail ? `SELFTEST FAILED (${fail})` : 'selftest passed'); process.exit(fail ? 1 : 0)
}

const [cmd] = process.argv.slice(2)
if (import.meta.url === `file://${process.argv[1]}`) {
  if (cmd === 'build') await cmdBuild()
  else if (cmd === 'score') cmdScore()
  else if (cmd === '--selftest') selftest()
  else die('usage: build | score | --selftest')
}
