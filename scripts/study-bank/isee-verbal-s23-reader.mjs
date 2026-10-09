#!/usr/bin/env node
/**
 * isee-verbal-s23-reader.mjs render <round> <reader>     e.g. render r1 a
 * isee-verbal-s23-reader.mjs score  <round>              (needs readers a and b)
 * isee-verbal-s23-reader.mjs selftest
 *
 * The pre-freeze WITH-SENTENCE read of isee-verbal-s23.prereg.md, new in s23.
 * Two fresh Claude readers each see every SC item of files a-d (prompt and four
 * options, key withheld, own seeded order) and return, per item:
 *   pick              the option word they would answer
 *   difficulty        easy | medium | hard for ISEE Upper Level test-takers
 *   collocation_tell  ARRAY of option words the words right around the blank rule
 *                     out on grammar or idiom alone (a preposition or article after
 *                     or before the blank, a verb form, a count/mass mismatch) -
 *                     without the sentence's meaning. [] when none.
 *   note              under 20 words
 *
 * Why. s22 lost 13 of 45 SC with-source, 12 as median EASY, and a with-sentence
 * reader labelling e/m/h before freeze would have caught them. And IS22B-02
 * ("had become ------- to the score") shipped with a stem-side tell - only
 * "disproportionate" takes "to" - that one grader named and no rule could act on.
 *
 * score (both readers):
 *   DROP before freeze  both readers flag the item AND name >= 1 option in common
 *   HAND READ           exactly one reader flags it (or both, on disjoint options):
 *                       isee-verbal-s23-reader-<round>.handread.json must hold
 *                       { "<id>": { "confirmed": bool, "note": "..." } } for every such
 *                       item, or score exits 3 listing them. confirmed -> r1: named
 *                       for the revision round; r2: DROP. not confirmed -> kept.
 *   NAMED (r1 only)     either reader labels it easy; either reader picks a non-key;
 *                       a hand-confirmed single flag. Written with reasons to
 *                       isee-verbal-s23-reader-r1.named.json. r2 names nothing: its
 *                       difficulty and picks are recorded at freeze whatever they say.
 *   reported            items with a function word next to the blank (structural,
 *                       decides nothing); calibration plants (below).
 * Calibration plants, interleaved, never named, never in any s23 file: four s22 SC
 * all three s22 graders called easy (IS22A-10, IS22B-01, IS22B-09, IS22C-12), two
 * s22 SC banked hard (IS22A-02, IS22C-07), and IS22B-02 (the "to" tell).
 * Refuses (exit 2) on a reader file missing an id or with an unreadable field.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { rng, shuffleWith } from './seeded-shuffle.mjs'
const D = 'scripts/study-bank'
const [mode, round, g] = process.argv.slice(2)
const SC_FILES = ['a', 'b', 'c', 'd'].map(l => `${D}/isee-verbal-s23${l}.batch.json`)
const PLANT_EASY = ['IS22A-10', 'IS22B-01', 'IS22B-09', 'IS22C-12'], PLANT_HARD = ['IS22A-02', 'IS22C-07'], PLANT_TELL = ['IS22B-02']
const PLANTS = [...PLANT_EASY, ...PLANT_HARD, ...PLANT_TELL]
const SEED = { r1a: 20261175, r1b: 20261176, r2a: 20261177, r2b: 20261178 }
const FUNC_AFTER = new Set(['to', 'of', 'for', 'with', 'from', 'on', 'in', 'at', 'about', 'by', 'as', 'than', 'into', 'upon', 'toward', 'towards'])
const FUNC_BEFORE = new Set(['a', 'an', 'more', 'most', 'less', 'so', 'too', 'very', 'been', 'being', 'be', 'is', 'was', 'were', 'are', 'had', 'has', 'have', 'to'])
const norm = s => String(s ?? '').trim().toLowerCase()
const load = fs => fs.flatMap(f => {
  if (!existsSync(f)) { console.error(`REFUSING: ${f} missing`); process.exit(2) }
  const b = JSON.parse(readFileSync(f, 'utf8'))
  if (!Array.isArray(b) || !b.length) { console.error(`REFUSING: ${f} holds no items`); process.exit(2) }
  return b
})
const tag = r => `${D}/isee-verbal-s23-reader-${r}`
export function neighbours(prompt) {
  const t = prompt.replace(/^\[Sentence Completion\]\s*/, '').toLowerCase()
  const i = t.indexOf('-------')
  const before = t.slice(0, i).trim().split(/\s+/).pop()?.replace(/[^a-z]/g, '') ?? ''
  const after = t.slice(i + 7).trim().split(/\s+/)[0]?.replace(/[^a-z]/g, '') ?? ''
  return { before, after }
}

/** The decision rule, pure, so selftest can attack it. */
export function decide(item, ra, rb, hand, rnd) {
  const ch = item.choices.map(norm), key = norm(item.correct_answer)
  const out = { drop: null, named: [], handNeeded: false, handConfirmed: null }
  const A = ra.collocation_tell, B = rb.collocation_tell
  const common = A.filter(x => B.includes(x))
  if (A.length && B.length && common.length) out.drop = `both readers name a collocation tell (${common.join(',')})`
  else if (A.length || B.length) {
    const h = hand?.[item.id]
    if (!h || typeof h.confirmed !== 'boolean') out.handNeeded = true
    else {
      out.handConfirmed = h.confirmed
      if (h.confirmed) { if (rnd === 'r1') out.named.push(`collocation tell (one reader: ${[...A, ...B].join(',')}), confirmed by hand: ${h.note ?? ''}`); else out.drop = `collocation tell (one reader: ${[...A, ...B].join(',')}), confirmed by hand at r2: ${h.note ?? ''}` }
    }
  }
  if (rnd === 'r1') {
    for (const [n, r] of [['a', ra], ['b', rb]]) {
      if (r.difficulty === 'easy') out.named.push(`reader ${n} reads it EASY`)
      if (r.pick !== key) out.named.push(`reader ${n} picked ${r.pick}`)
    }
  }
  void ch
  return out
}

function parseReader(file, items) {
  if (!existsSync(file)) { console.error(`REFUSING: ${file} missing`); process.exit(2) }
  const R = JSON.parse(readFileSync(file, 'utf8'))
  const out = {}
  for (const [rid, it] of Object.entries(items)) {
    const r = R[rid], ch = it.choices.map(norm)
    const bad = (f, v) => { console.error(`REFUSING: ${file} ${rid} (${it.id}) ${f} = ${JSON.stringify(v)} is not readable`); process.exit(2) }
    if (!r || typeof r !== 'object') bad('row', r)
    if (typeof r.pick !== 'string' || !ch.includes(norm(r.pick))) bad('pick', r.pick)
    if (!['easy', 'medium', 'hard'].includes(r.difficulty)) bad('difficulty', r.difficulty)
    const ct = r.collocation_tell
    const arr = ct === null || ct === undefined || ct === '' ? [] : typeof ct === 'string' ? [ct] : Array.isArray(ct) ? ct : bad('collocation_tell', ct)
    for (const x of arr) if (typeof x !== 'string' || !ch.includes(norm(x))) bad('collocation_tell', ct)
    out[it.id] = { pick: norm(r.pick), difficulty: r.difficulty, collocation_tell: [...new Set(arr.map(norm))], note: r.note ?? '' }
  }
  return out
}

if (mode === 'render') {
  if (!['r1', 'r2'].includes(round) || !['a', 'b'].includes(g)) { console.error('usage: render r1|r2 a|b'); process.exit(2) }
  const rand = rng(SEED[round + g])
  let dropped = []
  if (round === 'r2') { const f = `${tag('r1')}.drops.json`; if (!existsSync(f)) { console.error(`REFUSING: ${f} missing (score r1 first)`); process.exit(2) } dropped = Object.keys(JSON.parse(readFileSync(f, 'utf8'))) }
  const s22 = load([`${D}/isee-verbal-s22-sc.batch.json`])
  const plants = PLANTS.map(id => { const it = s22.find(x => x.id === id); if (!it) { console.error(`REFUSING: plant ${id} not in s22 SC`); process.exit(2) } return { ...it, plant: true } })
  const all = shuffleWith([...load(SC_FILES).filter(it => !dropped.includes(it.id)), ...plants], rand)
  const blind = {}, key = {}
  all.forEach((it, i) => {
    const rid = `R${String(i + 1).padStart(2, '0')}`
    blind[rid] = { prompt: it.prompt, choices: shuffleWith(it.choices.slice(), rand) }
    key[rid] = { localId: it.id, ...(it.plant ? { plant: true } : {}) }
  })
  const bf = `${tag(round)}-${g}.blind.json`
  writeFileSync(bf, JSON.stringify(blind, null, 1) + '\n')
  writeFileSync(`${tag(round)}-${g}.key.json`, JSON.stringify(key, null, 1) + '\n')
  console.log(`${bf}: ${all.length} items (${all.length - plants.length} candidate + ${plants.length} plants${dropped.length ? `; ${dropped.length} r1 drops left out` : ''}), sha ${createHash('sha256').update(readFileSync(bf)).digest('hex').slice(0, 16)}`)
} else if (mode === 'score') {
  if (!['r1', 'r2'].includes(round)) { console.error('usage: score r1|r2'); process.exit(2) }
  const byId = Object.fromEntries([...load(SC_FILES), ...load([`${D}/isee-verbal-s22-sc.batch.json`])].map(it => [it.id, it]))
  const read = gg => {
    const key = JSON.parse(readFileSync(`${tag(round)}-${gg}.key.json`, 'utf8'))
    const blind = JSON.parse(readFileSync(`${tag(round)}-${gg}.blind.json`, 'utf8'))
    const items = Object.fromEntries(Object.entries(key).map(([rid, k]) => [rid, { ...byId[k.localId], choices: blind[rid].choices }]))
    return parseReader(`${tag(round)}-${gg}.reader.json`, items)
  }
  const RA = read('a'), RB = read('b')
  const hf = `${tag(round)}.handread.json`
  const hand = existsSync(hf) ? JSON.parse(readFileSync(hf, 'utf8')) : {}
  const cand = Object.keys(RA).filter(id => !PLANTS.includes(id)).sort((x, y) => x.localeCompare(y, 'en', { numeric: true }))
  if (cand.length !== Object.keys(RB).filter(id => !PLANTS.includes(id)).length) { console.error('REFUSING: readers a and b saw different item sets'); process.exit(2) }
  const drops = {}, named = {}, need = []
  const tally = { a: { easy: 0, medium: 0, hard: 0 }, b: { easy: 0, medium: 0, hard: 0 } }
  const byAuthor = {}
  for (const id of cand) {
    const it = byId[id], d = decide(it, RA[id], RB[id], hand, round)
    tally.a[RA[id].difficulty]++; tally.b[RB[id].difficulty]++
    const au = id.replace(/-\d+$/, ''); byAuthor[au] ??= { n: 0, easyEither: 0, offKey: 0 }; byAuthor[au].n++
    if (RA[id].difficulty === 'easy' || RB[id].difficulty === 'easy') byAuthor[au].easyEither++
    if (RA[id].pick !== norm(it.correct_answer) || RB[id].pick !== norm(it.correct_answer)) byAuthor[au].offKey++
    if (d.handNeeded) need.push(`${id} (a: ${RA[id].collocation_tell.join(',') || '-'}; b: ${RB[id].collocation_tell.join(',') || '-'})`)
    if (d.drop) drops[id] = d.drop
    else if (d.named.length) named[id] = d.named
  }
  console.log(`${round}: readers a, b x ${cand.length} candidate SC + ${PLANTS.length} plants`)
  console.log(`  difficulty a e/m/h ${Object.values(tally.a).join('/')}, b ${Object.values(tally.b).join('/')}; by author: ${Object.entries(byAuthor).map(([a, v]) => `${a} easy-by-either ${v.easyEither}/${v.n}, off-key ${v.offKey}/${v.n}`).join('; ')}`)
  const flagged = cand.filter(id => RA[id].collocation_tell.length || RB[id].collocation_tell.length)
  console.log(`  collocation tell flagged by a ${cand.filter(id => RA[id].collocation_tell.length).length}, by b ${cand.filter(id => RB[id].collocation_tell.length).length}, by both on a common option ${Object.values(drops).filter(x => x.startsWith('both')).length}: ${flagged.map(id => `${id} [a ${RA[id].collocation_tell.join(',') || '-'} | b ${RB[id].collocation_tell.join(',') || '-'}]`).join('; ') || '-'}`)
  const adj = cand.filter(id => { const { before, after } = neighbours(byId[id].prompt); return FUNC_AFTER.has(after) || FUNC_BEFORE.has(before) })
  console.log(`  structural (reported): function word next to the blank on ${adj.length}/${cand.length}: ${adj.map(id => { const { before, after } = neighbours(byId[id].prompt); return `${id} "${before} ___ ${after}"` }).join('; ') || '-'}`)
  const ok = (ids, want) => ids.map(id => `${id} a:${RA[id].difficulty} b:${RB[id].difficulty}${want && (RA[id].difficulty !== want || RB[id].difficulty !== want) ? ' (miss)' : ''}`).join('; ')
  console.log(`  PLANT known-easy (want easy): ${ok(PLANT_EASY, 'easy')}`)
  console.log(`  PLANT banked-hard: ${ok(PLANT_HARD)}`)
  console.log(`  PLANT tell IS22B-02 (want flagged): a [${RA['IS22B-02'].collocation_tell.join(',') || 'NOT FLAGGED'}] b [${RB['IS22B-02'].collocation_tell.join(',') || 'NOT FLAGGED'}]`)
  if (need.length) { console.log(`  HAND READ NEEDED (write ${hf}): ${need.join('; ')}`); process.exit(3) }
  writeFileSync(`${tag(round)}.drops.json`, JSON.stringify(drops, null, 1) + '\n')
  if (round === 'r1') writeFileSync(`${tag(round)}.named.json`, JSON.stringify(named, null, 1) + '\n')
  console.log(`  DROP before freeze ${Object.keys(drops).length}: ${Object.entries(drops).map(([k, v]) => `${k} (${v})`).join('; ') || '-'}`)
  if (round === 'r1') console.log(`  NAMED for the revision round ${Object.keys(named).length}: ${Object.entries(named).map(([k, v]) => `${k} (${v.join('; ')})`).join(' | ') || '-'}`)
} else if (mode === 'selftest') {
  const it = { id: 'X-01', choices: ['heartfelt', 'disproportionate', 'fragmentary', 'impromptu'], correct_answer: 'disproportionate' }
  const r = (pick, difficulty, ct) => ({ pick, difficulty, collocation_tell: ct })
  const cases = [
    ['both flag a common option -> drop', decide(it, r('disproportionate', 'medium', ['heartfelt']), r('disproportionate', 'medium', ['heartfelt', 'impromptu']), {}, 'r1'), d => !!d.drop],
    ['both flag, disjoint -> hand read', decide(it, r('disproportionate', 'medium', ['heartfelt']), r('disproportionate', 'medium', ['impromptu']), {}, 'r1'), d => !d.drop && d.handNeeded],
    ['one flags, no hand read -> needed', decide(it, r('disproportionate', 'medium', ['heartfelt']), r('disproportionate', 'medium', []), {}, 'r1'), d => d.handNeeded && !d.drop],
    ['one flags, confirmed r1 -> named', decide(it, r('disproportionate', 'medium', ['heartfelt']), r('disproportionate', 'medium', []), { 'X-01': { confirmed: true } }, 'r1'), d => !d.drop && d.named.length === 1],
    ['one flags, confirmed r2 -> drop', decide(it, r('disproportionate', 'medium', ['heartfelt']), r('disproportionate', 'medium', []), { 'X-01': { confirmed: true } }, 'r2'), d => !!d.drop],
    ['one flags, refuted -> kept clean', decide(it, r('disproportionate', 'medium', ['heartfelt']), r('disproportionate', 'medium', []), { 'X-01': { confirmed: false } }, 'r1'), d => !d.drop && !d.named.length],
    ['one reader easy r1 -> named', decide(it, r('disproportionate', 'easy', []), r('disproportionate', 'hard', []), {}, 'r1'), d => d.named.length === 1],
    ['one reader easy r2 -> recorded only', decide(it, r('disproportionate', 'easy', []), r('disproportionate', 'hard', []), {}, 'r2'), d => !d.named.length && !d.drop],
    ['non-key pick r1 -> named', decide(it, r('heartfelt', 'medium', []), r('disproportionate', 'medium', []), {}, 'r1'), d => d.named.length === 1],
    ['clean -> nothing', decide(it, r('disproportionate', 'medium', []), r('disproportionate', 'hard', []), {}, 'r1'), d => !d.drop && !d.named.length && !d.handNeeded],
  ]
  let bad = 0
  for (const [name, d, ok] of cases) { const pass = ok(d); if (!pass) bad++; console.log(`${pass ? 'ok  ' : 'FAIL'} ${name}`) }
  const nb = neighbours('[Sentence Completion] x had become ------- to the score')
  if (nb.before !== 'become' || nb.after !== 'to') { bad++; console.log(`FAIL neighbours ${JSON.stringify(nb)}`) } else console.log('ok   neighbours become ___ to')
  console.log(bad ? `${bad} selftest failure(s)` : 'selftest: all pass'); process.exit(bad ? 1 : 0)
} else { console.error('usage: render <r1|r2> <a|b> | score <r1|r2> | selftest'); process.exit(2) }
