#!/usr/bin/env node
/**
 * ssat-verbal-s21-tools.mjs — authoring pre-flight for ssat-verbal-s21-ana (25 analogies).
 * Rules are fixed in ssat-verbal-s21.prereg.md; this file implements them. A copy of
 * ssat-verbal-s20-tools.mjs (same words(), roots(), pairKey(), checkItem rules, tempting and
 * author_rating). What changed: N 25, mix 0/8/17, seed 20261130, the held-pair list covers
 * s18 AND s19 AND s20 (their single words are reusable, their pairs are not), and the design's
 * family balance is restated for 25 (see design()).
 *
 *   node ssat-verbal-s21-tools.mjs livewords             # dump every SSAT verbal row's words + the held s18/s19/s20 pairs
 *   node ssat-verbal-s21-tools.mjs design [--write]      # seeded slot table (seed 20261130)
 *   node ssat-verbal-s21-tools.mjs slots <id ...>        # print the design for given slot ids (author brief)
 *   node ssat-verbal-s21-tools.mjs check-item <item.json>          # one item vs design, live words, every other item file
 *   node ssat-verbal-s21-tools.mjs check-all [<dir>|<file.json>]   # the whole cohort (default: the work items dir)
 *   node ssat-verbal-s21-tools.mjs probe <word ...>                # is a word free (live, other item files)?
 *   node ssat-verbal-s21-tools.mjs merge <out.json>                # items dir -> one batch file, in id order
 *
 * READ ONLY against the bank. Checks exit 1 on a rule violation and 2 on unreadable / empty
 * input — never a PASS over nothing.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, basename } from 'node:path'
import { rng, shuffleWith } from './seeded-shuffle.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const LIVE = join(HERE, 'ssat-verbal-s21.live-words.json')
const DESIGN = join(HERE, 'ssat-verbal-s21.design.json')
const ITEMS = join(HERE, 'ssat-verbal-s21-work', 'items')
const HELD = [[join(HERE, 'ssat-verbal-s18-ana.batch.json'), 80], [join(HERE, 'ssat-verbal-s19-ana.batch.json'), 75], [join(HERE, 'ssat-verbal-s20-ana.batch.json'), 75]]

export const N = 25
export const MIX = { easy: 0, medium: 8, hard: 17 }
export const SEED = 20261130
/* s18+s19 held pairs were 930 distinct; s20 adds up to 450. The checker refuses below this. */
const HELD_PAIRS_MIN = 1200
/* 15 families in four clusters of related relations. young/adult, instrument/what it
 * measures, expert/field of study, early stage/later stage and animal/characteristic
 * are dropped: s18 finding 4, their free word pools are nearly exhausted. */
export const CLUSTERS = {
  person: ['worker/tool', 'worker/workplace', 'creator/creation'],
  thing: ['part/whole', 'container/contents', 'object/material', 'category/instance'],
  process: ['cause/effect', 'tool/function', 'preparation/act'],
  sense: ['degree', 'synonyms', 'antonyms', 'lack', 'symbol/symbolized'],
}
export const FAMILIES = Object.values(CLUSTERS).flat()
const clusterOf = f => Object.keys(CLUSTERS).find(c => CLUSTERS[c].includes(f))
const SLOTS = ['A', 'B', 'C', 'D', 'E']

/* ---------- words (identical to s18) ---------- */
const STOP = new Set(['is', 'to', 'as', 'a', 'an', 'the', 'of', 'and', 'or', 'in', 'on', 'for', 'with', 'by', 'at',
  'from', 'its', 'it', 'be', 'not', 'one', 'into', 'up', 'out', 'off', 'over', 'make', 'become', 'something', 'someone'])
export const words = s => String(s ?? '').replace(/\[[^\]]*\]/g, ' ').toLowerCase().split(/[^a-z]+/).filter(w => w.length > 1 && !STOP.has(w))
export function roots(w) {
  const out = new Set([w])
  const add = b => { if (b.length >= 3) out.add(b) }
  const strip = (suf, rep = '') => { if (w.endsWith(suf)) { const b = w.slice(0, -suf.length) + rep; add(b); return b } return null }
  strip('ies', 'y'); strip('ied', 'y'); strip('ier', 'y'); strip('iest', 'y'); strip('ily', 'y')
  strip('es'); strip('s'); strip('ly'); strip('er'); strip('est'); strip('r'); strip('st')
  for (const suf of ['ed', 'ing', 'er', 'est']) {
    const b = strip(suf)
    if (b) { add(b + 'e'); if (b.length >= 4 && b.at(-1) === b.at(-2)) add(b.slice(0, -1)) }
  }
  strip('d')
  return out
}

/** a pair's identity: its two content words' first roots, order-free. */
const pairKey = s => words(s).map(w => [...roots(w)].sort()[0]).sort().join('|')

async function dumpLive() {
  const { createClient } = await import('@supabase/supabase-js')
  const env = Object.fromEntries(readFileSync(join(HERE, '../../.env.local'), 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const rows = []
  for (let f = 0; ; f += 1000) {
    const { data, error } = await db.from('study_item_bank').select('id,item').eq('family', 'ssat').eq('section', 'verbal')
      .order('id', { ascending: true }).range(f, f + 999)
    if (error) throw new Error(error.message)
    rows.push(...data); if (data.length < 1000) break
  }
  if (!rows.length || new Set(rows.map(r => r.id)).size !== rows.length) { console.error('REFUSING: zero rows or paging slipped'); process.exit(2) }
  const w = new Set()
  for (const r of rows) for (const s of [r.item?.prompt, ...(r.item?.choices ?? []), r.item?.correct_answer]) for (const x of words(s)) w.add(x)
  const bankWords = w.size
  // The held s18, s19 and s20 analogies (s20's 23 inserted ones are also bank rows) are not in the bank, so their single words are free
  // (prereg rule 5: reusable in a NEW pair); their PAIRS are not: no stem or option pair of
  // s18, s19 or s20 recurs, order-free, by root.
  const heldPairs = new Set(), heldWords = new Set()
  for (const [p, n] of HELD) {
    const held = JSON.parse(readFileSync(p, 'utf8'))
    if (!Array.isArray(held) || held.length !== n) { console.error(`REFUSING: held file ${p} is not the ${n} frozen items`); process.exit(2) }
    for (const it of held) for (const s of [it.prompt, ...it.choices]) { heldPairs.add(pairKey(s)); for (const x of words(s)) heldWords.add(x) }
  }
  const reusable = [...heldWords].filter(x => !w.has(x)).length
  writeFileSync(LIVE, JSON.stringify({ fetchedAt: new Date().toISOString(), rows: rows.length, heldPairs: [...heldPairs].sort(), words: [...w].sort() }, null, 0) + '\n')
  console.log(`live-words: ${rows.length} SSAT verbal rows (all states) -> ${w.size} excluded words; held s18+s19+s20: ${heldPairs.size} pairs excluded as pairs, ${heldWords.size} single words (${reusable} not live, reusable in new pairs) -> ${LIVE}`)
}

/* ---------- design ----------
 * s20's construction (per slot: key letter, difficulty, key family, four distractor families in
 * a 2+2+1 cluster layout, three different clusters per item, pairs same-cluster) restated for
 * N = 25. s20's exact balance (every family present 25, 20 pair / 5 singleton, keyed 4 / 1)
 * needs N = 75k. At 25 there are 100 pair positions and 25 singleton positions over 15
 * families, so equal presence is impossible; what is kept EXACT is the key rate: every family
 * is keyed in exactly 1/5 of its appearances, in each role.
 *   - 5 SINGLETON families (seeded: one each from person, thing, process, two from sense) appear
 *     only as the singleton: 5 times each, keyed once (20.0%).
 *   - the other 10 PAIR families appear only in pairs: 10 times each, keyed twice (20.0%).
 *   - so an option in a pair is the key 20/100 = 20.0% of the time and the singleton 5/25 =
 *     20.0%; nothing about which family or which role an option has says it is the key.
 * The key's same-cluster SIBLING distractor is present in the 20 pair-keyed items. */
export function design() {
  const rand = rng(SEED)
  const letters = shuffleWith(Array.from({ length: N }, (_, i) => SLOTS[i % 5]), rand)
  const diffs = shuffleWith(Object.entries(MIX).flatMap(([d, k]) => Array(k).fill(d)), rand)
  if (diffs.length !== N) throw new Error('mix does not sum to N')
  const CL = Object.keys(CLUSTERS)
  const SINGLE_PER_CLUSTER = { person: 1, thing: 1, process: 1, sense: 2 }
  const singles = CL.flatMap(c => shuffleWith(CLUSTERS[c].slice(), rand).slice(0, SINGLE_PER_CLUSTER[c]))
  const pairFams = c => CLUSTERS[c].filter(f => !singles.includes(f))
  const singleFams = c => CLUSTERS[c].filter(f => singles.includes(f))
  const keyRole = shuffleWith(FAMILIES.flatMap(f => singles.includes(f) ? [[f, 'single']] : [[f, 'pair'], [f, 'pair']]), rand)
  if (keyRole.length !== N) throw new Error('key roles do not sum to N')
  const pickN = (arr, n, ex = []) => shuffleWith(arr.filter(f => !ex.includes(f)), rand).slice(0, n)
  const propose = (k, role) => {
    const kc = clusterOf(k)
    const [c2, c3] = shuffleWith(CL.filter(c => c !== kc), rand)
    if (role === 'pair') {
      const [sib] = pickN(pairFams(kc), 1, [k])
      return { pairs: [[k, sib], pickN(pairFams(c2), 2)], singleton: pickN(singleFams(c3), 1)[0] }
    }
    return { pairs: [pickN(pairFams(c2), 2), pickN(pairFams(c3), 2)], singleton: k }
  }
  const target = f => singles.includes(f) ? [0, 5] : [10, 0]
  const cost = items => {
    const pp = Object.fromEntries(FAMILIES.map(f => [f, 0])), ss = { ...pp }
    for (const it of items) { it.pairs.flat().forEach(f => pp[f]++); ss[it.singleton]++ }
    return FAMILIES.reduce((s, f) => s + Math.abs(pp[f] - target(f)[0]) + Math.abs(ss[f] - target(f)[1]), 0)
  }
  let items, c = Infinity
  for (let restart = 0; restart < 50 && c > 0; restart++) {
    items = keyRole.map(([k, role]) => ({ k, role, ...propose(k, role) }))
    c = cost(items)
    for (let step = 0; step < 200000 && c > 0; step++) {
      const T = 1.5 * (1 - step / 200000) + 0.05
      const i = Math.floor(rand() * N)
      const old = items[i]
      items[i] = { k: old.k, role: old.role, ...propose(old.k, old.role) }
      const c2 = cost(items)
      if (c2 <= c || rand() < Math.exp((c - c2) / T)) c = c2; else items[i] = old
    }
  }
  if (c > 0) throw new Error(`no balanced design (residual ${c})`)
  return {
    seed: SEED, n: N, clusters: CLUSTERS, singleton_families: singles.slice().sort(),
    slots: items.map((it, i) => ({
      id: `SVA21-${String(i + 1).padStart(2, '0')}`, key_slot: letters[i], difficulty: diffs[i],
      key_family: it.k, key_role: it.role, sibling: it.role === 'pair' ? it.pairs[0][1] : null,
      pairs: it.pairs.map(p => [...p].sort()), singleton: it.singleton,
      distractor_families: [...it.pairs.flat(), it.singleton].filter(f => f !== it.k).sort(),
    })),
  }
}

/* ---------- check ---------- */
function loadJson(p) {
  if (!existsSync(p)) { console.error(`REFUSING: ${p} does not exist`); process.exit(2) }
  try { return JSON.parse(readFileSync(p, 'utf8')) } catch (e) { console.error(`REFUSING: ${p}: ${e.message}`); process.exit(2) }
}
const itemWords = it => [it.prompt, ...(it.choices ?? [])].flatMap(words)
function loadDir(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir).filter(f => /^SVA21-\d\d\.json$/.test(f)).sort().map(f => {
    const it = loadJson(join(dir, f))
    if (it.id !== basename(f, '.json')) { console.error(`REFUSING: ${f} carries id ${it.id}`); process.exit(2) }
    return it
  })
}
function liveWords() {
  if (!existsSync(LIVE)) { console.error(`REFUSING: ${LIVE} missing; run livewords first`); process.exit(2) }
  const live = JSON.parse(readFileSync(LIVE, 'utf8')).words
  if (!live?.length) { console.error('REFUSING: live word list is empty'); process.exit(2) }
  const m = new Map(); for (const w of live) for (const r of roots(w)) if (!m.has(r)) m.set(r, w)
  return m
}
function designSlots() {
  if (!existsSync(DESIGN)) { console.error(`REFUSING: ${DESIGN} missing; run design --write`); process.exit(2) }
  return Object.fromEntries(JSON.parse(readFileSync(DESIGN, 'utf8')).slots.map(s => [s.id, s]))
}

/** item-level rules; `others` are every other item in the cohort (word collisions). */
export function checkItem(it, { slot, liveRoots, others }) {
  const errs = []
  const id = it.id ?? '?'
  const ch = it.choices ?? []
  if (!slot) { errs.push(`${id}: no design slot`); return errs }
  if (ch.length !== 5 || new Set(ch.map(c => String(c).trim().toLowerCase())).size !== 5) errs.push(`${id}: needs 5 distinct choices`)
  const ki = ch.indexOf(it.correct_answer)
  if (ki < 0) errs.push(`${id}: correct_answer not among choices`)
  else if (SLOTS[ki] !== slot.key_slot) errs.push(`${id}: key must sit in slot ${slot.key_slot} (is ${SLOTS[ki]})`)
  if (it.difficulty !== slot.difficulty) errs.push(`${id}: difficulty must be '${slot.difficulty}' (design)`)
  if (it.family !== 'ssat' || it.section !== 'verbal' || it.domain !== 'Verbal') errs.push(`${id}: family/section/domain must be ssat/verbal/Verbal`)
  if (it.kind !== 'analogy' || it.subskill !== 'analogy') errs.push(`${id}: kind/subskill must be analogy`)
  if (!String(it.explanation ?? '').trim()) errs.push(`${id}: no explanation`)
  if (!/^\[Analogy\] [a-z]+(?: [a-z]+)? is to [a-z]+(?: [a-z]+)? as$/.test(String(it.prompt ?? ''))) errs.push(`${id}: prompt must be '[Analogy] x is to y as' (lower case)`)
  for (const c of ch) if (!/^[a-z]+(?: [a-z]+)? is to [a-z]+(?: [a-z]+)?$/.test(String(c))) errs.push(`${id}: choice '${c}' must be 'c is to d'`)
  const rel = it.option_relations
  if (!Array.isArray(rel) || rel.length !== 5) errs.push(`${id}: option_relations must list 5 families aligned to choices`)
  else {
    if (new Set(rel).size !== 5) errs.push(`${id}: option_relations repeat a family`)
    for (const r of rel) if (!FAMILIES.includes(r)) errs.push(`${id}: relation '${r}' is not one of the 15 families`)
    if (it.stem_relation !== slot.key_family) errs.push(`${id}: stem_relation must be design key_family '${slot.key_family}'`)
    if (ki >= 0 && rel[ki] !== it.stem_relation) errs.push(`${id}: the key's relation must equal stem_relation`)
    const d = rel.filter((_, j) => j !== ki).sort()
    if (JSON.stringify(d) !== JSON.stringify(slot.distractor_families)) errs.push(`${id}: distractor relations must be exactly ${slot.distractor_families.join(', ')}`)
  }
  // prereg rule 7: every item declares the distractor built to tempt, the loose reading of the
  // stem it and the key both satisfy, and the precise reading only the key satisfies.
  const tm = it.tempting
  if (!tm || typeof tm !== 'object') errs.push(`${id}: tempting { option, loose_reading, why_wrong } is required`)
  else {
    if (!ch.includes(tm.option) || tm.option === it.correct_answer) errs.push(`${id}: tempting.option must be one of the four distractors`)
    if (String(tm.loose_reading ?? '').trim().length < 15) errs.push(`${id}: tempting.loose_reading missing (the loose statement of the stem relation the tempting option and the key both satisfy)`)
    if (String(tm.why_wrong ?? '').trim().length < 15) errs.push(`${id}: tempting.why_wrong missing (the precise relation only the key satisfies)`)
  }
  if ('near_miss' in it) errs.push(`${id}: near_miss is the s19 field; s20/s21 use tempting`)
  // prereg rule 8: the author's own rating; an item it rates easy is rewritten before it is written
  if (!['medium', 'hard'].includes(it.author_rating)) errs.push(`${id}: author_rating must be medium|hard (an item you rate easy must be rewritten)`)
  const held = new Set(JSON.parse(readFileSync(LIVE, 'utf8')).heldPairs ?? [])
  if (held.size < HELD_PAIRS_MIN) errs.push(`${id}: held s18+s19+s20 pair list has ${held.size} pairs (expected >= ${HELD_PAIRS_MIN}); re-run livewords`)
  for (const s of [it.prompt, ...ch]) if (held.has(pairKey(s))) errs.push(`${id}: '${s}' re-uses a held s18/s19/s20 analogy pair`)
  const dr = it.distractor_rationales
  if (!dr || ch.filter(c => c !== it.correct_answer).some(c => !String(dr[c] ?? '').trim())) errs.push(`${id}: distractor_rationales must cover all four distractors`)
  const otherRoots = new Map()
  for (const o of others) if (o.id !== it.id) for (const w of itemWords(o)) for (const r of roots(w)) if (!otherRoots.has(r)) otherRoots.set(r, `${w} (${o.id})`)
  const seen = new Map()
  for (const w of itemWords(it)) {
    const rs = [...roots(w)]
    const l = rs.find(r => liveRoots.has(r)); if (l) errs.push(`${id}: '${w}' is a live SSAT verbal word or inflection (~ '${liveRoots.get(l)}')`)
    const o = rs.find(r => otherRoots.has(r)); if (o) errs.push(`${id}: '${w}' collides with '${otherRoots.get(o)}'`)
    const s = rs.find(r => seen.has(r) && seen.get(r) !== w); if (s || [...seen.values()].filter(x => x === w).length) errs.push(`${id}: '${w}' used twice in the item`)
    for (const r of rs) seen.set(r, w)
  }
  return errs
}

function checkCohort(items) {
  const slots = designSlots(), liveRoots = liveWords()
  const errs = [], notes = []
  const ids = items.map(i => i.id)
  if (new Set(ids).size !== ids.length) errs.push('duplicate ids')
  for (const it of items) errs.push(...checkItem(it, { slot: slots[it.id], liveRoots, others: items }))
  const n = items.length
  const slotCount = {}; let longest = 0, shortest = 0
  const famKey = {}, famSeen = {}
  for (const it of items) {
    const ch = it.choices ?? [], ki = ch.indexOf(it.correct_answer); if (ki < 0) continue
    slotCount[SLOTS[ki]] = (slotCount[SLOTS[ki]] ?? 0) + 1
    const lens = ch.map(c => String(c).length), kl = lens[ki]
    if (lens.filter(l => l >= kl).length === 1) longest++
    if (lens.filter(l => l <= kl).length === 1) shortest++
    ;(it.option_relations ?? []).forEach((r, j) => { famSeen[r] = (famSeen[r] ?? 0) + 1; if (j === ki) famKey[r] = (famKey[r] ?? 0) + 1 })
  }
  if (n >= 20) {
    for (const L of SLOTS) if ((slotCount[L] ?? 0) / n > 0.3) errs.push(`key slot ${L} holds ${slotCount[L]}/${n} > 30%`)
    if (longest / n > 0.3) errs.push(`key strictly longest ${longest}/${n} > 30%`)
    if (shortest / n > 0.3) errs.push(`key strictly shortest ${shortest}/${n} > 30%`)
  }
  const strs = items.flatMap(i => i.choices ?? []); const dupStr = strs.length - new Set(strs).size
  if (dupStr) errs.push(`${dupStr} option string(s) repeated across items`)
  notes.push(`n=${n} of ${Object.keys(slots).length} design slots; key slots ${JSON.stringify(slotCount)}; key strictly longest ${longest}/${n}, shortest ${shortest}/${n}; ${new Set(strs).size} distinct option strings`)
  notes.push(`family key rate: ${Object.keys(famSeen).sort().map(f => `${f} ${famKey[f] ?? 0}/${famSeen[f]}`).join('; ')}`)
  return { errs, notes }
}

/* ---------- main ---------- */
const [cmd, ...rest] = process.argv.slice(2)
if (import.meta.url === `file://${process.argv[1]}`) {
  if (cmd === 'livewords') await dumpLive()
  else if (cmd === 'design') {
    const d = design()
    if (rest.includes('--write')) { writeFileSync(DESIGN, JSON.stringify(d, null, 1) + '\n'); console.log(`wrote ${DESIGN}`) }
    const c = {}, df = {}, k = {}, seen = {}, kp = {}, pp = {}, ks = {}, ss = {}
    for (const s of d.slots) {
      c[s.key_slot] = (c[s.key_slot] ?? 0) + 1; df[s.difficulty] = (df[s.difficulty] ?? 0) + 1
      k[s.key_family] = (k[s.key_family] ?? 0) + 1
      for (const f of s.pairs.flat()) { pp[f] = (pp[f] ?? 0) + 1; seen[f] = (seen[f] ?? 0) + 1 }
      ss[s.singleton] = (ss[s.singleton] ?? 0) + 1; seen[s.singleton] = (seen[s.singleton] ?? 0) + 1
      if (s.key_role === 'pair') kp[s.key_family] = (kp[s.key_family] ?? 0) + 1; else ks[s.key_family] = (ks[s.key_family] ?? 0) + 1
    }
    console.log(`n=${d.slots.length} slots ${JSON.stringify(c)} difficulty ${JSON.stringify(df)}; key in a pair ${d.slots.filter(s => s.key_role === 'pair').length}, singleton ${d.slots.filter(s => s.key_role === 'single').length}`)
    for (const f of FAMILIES) console.log(`  ${f.padEnd(20)} present ${seen[f]} (pair ${pp[f] ?? 0}, single ${ss[f] ?? 0})  keyed ${k[f]} (pair ${kp[f] ?? 0}/${pp[f] ?? 0}, single ${ks[f] ?? 0}/${ss[f] ?? 0}) = ${(100 * k[f] / seen[f]).toFixed(1)}%`)
  } else if (cmd === 'slots') {
    const slots = designSlots()
    for (const id of rest) { const s = slots[id]; if (!s) { console.error(`no slot ${id}`); process.exit(2) } console.log(JSON.stringify(s)) }
  } else if (cmd === 'check-item') {
    const [file] = rest; if (!file) { console.error('usage: check-item <item.json>'); process.exit(2) }
    const it = loadJson(file)
    const others = loadDir(ITEMS).filter(o => o.id !== it.id)
    const errs = checkItem(it, { slot: designSlots()[it.id], liveRoots: liveWords(), others })
    console.log(`check-item ${it.id}: against ${liveWords().size} live-word roots and ${others.length} other item file(s)`)
    for (const e of errs) console.log('  FAIL ' + e)
    console.log(errs.length ? `  => ${errs.length} problem(s)` : '  => PASS')
    process.exit(errs.length ? 1 : 0)
  } else if (cmd === 'check-all') {
    const src = rest[0] ?? ITEMS
    const items = src.endsWith('.json') ? loadJson(src) : loadDir(src)
    if (!Array.isArray(items) || !items.length) { console.error(`REFUSING: ${src} holds no items`); process.exit(2) }
    const { errs, notes } = checkCohort(items)
    console.log(`check-all ${src}:`); for (const x of notes) console.log('  ' + x); for (const e of errs) console.log('  FAIL ' + e)
    console.log(errs.length ? `  => ${errs.length} problem(s)` : '  => PASS')
    process.exit(errs.length ? 1 : 0)
  } else if (cmd === 'probe') {
    if (!rest.length) { console.error('usage: probe <word ...>'); process.exit(2) }
    const liveRoots = liveWords(); const other = new Map(), heldRoots = new Map()
    for (const [p] of HELD) for (const it of JSON.parse(readFileSync(p, 'utf8'))) for (const w of itemWords(it)) for (const r of roots(w)) if (!heldRoots.has(r)) heldRoots.set(r, w)
    for (const it of loadDir(ITEMS)) for (const w of itemWords(it)) for (const r of roots(w)) other.set(r, `${w} (${it.id})`)
    for (const w0 of rest) { const w = w0.toLowerCase(); const rs = [...roots(w)]; const l = rs.find(r => liveRoots.has(r)), o = rs.find(r => other.has(r))
      const h = !l && !o ? rs.find(r => heldRoots.has(r)) : null
      console.log(`${w.padEnd(18)} ${l ? `LIVE ~ ${liveRoots.get(l)}` : o ? `TAKEN ~ ${other.get(o)}` : h ? `free (held s18/s19/s20 word ~ ${heldRoots.get(h)}: allowed only in a NEW pair; check-item refuses a held pair)` : 'free'}`) }
  } else if (cmd === 'merge') {
    const [out] = rest; if (!out) { console.error('usage: merge <out.json>'); process.exit(2) }
    const items = loadDir(ITEMS); if (!items.length) { console.error('REFUSING: no item files'); process.exit(2) }
    const clean = items
    writeFileSync(out, JSON.stringify(clean, null, 1) + '\n'); console.log(`merged ${items.length} -> ${out}`)
  } else { console.error('usage: livewords | design [--write] | slots <id..> | check-item <f> | check-all [dir|file] | probe <w..> | merge <out>'); process.exit(2) }
}
