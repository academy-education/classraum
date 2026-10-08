#!/usr/bin/env node
/**
 * ssat-verbal-s18-tools.mjs — authoring pre-flight for ssat-verbal-s18
 * (synonym arm `ssat-verbal-s18-syn`, analogy arm `ssat-verbal-s18-ana`).
 * Rules are fixed in ssat-verbal-s18.prereg.md; this file implements them.
 *
 *   node ssat-verbal-s18-tools.mjs livewords            # (re)dump every SSAT verbal row's words
 *   node ssat-verbal-s18-tools.mjs design               # print / write the seeded slot tables
 *   node ssat-verbal-s18-tools.mjs check <A|B|C|D> <file.json> [--also other.json ...]
 *   node ssat-verbal-s18-tools.mjs probe <word ...> [--also f ...]   # is a candidate word free?
 *   node ssat-verbal-s18-tools.mjs merge <syn|ana> <out.json> <file1> <file2>
 *
 * READ ONLY against the bank. `check` exits 1 on any rule violation and 2 on
 * unreadable / empty input — it never prints a pass over nothing.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { rng, shuffleWith } from './seeded-shuffle.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const LIVE = join(HERE, 'ssat-verbal-s18.live-words.json')
const DESIGN = join(HERE, 'ssat-verbal-s18.design.json')

/* ---------- authors: type, size, stem letter range, difficulty mix ---------- */
export const AUTHORS = {
  A: { type: 'syn', n: 36, range: 'A-L', mix: { easy: 7, medium: 19, hard: 10 }, idPrefix: 'SVS18A' },
  B: { type: 'syn', n: 36, range: 'M-Z', mix: { easy: 7, medium: 19, hard: 10 }, idPrefix: 'SVS18B' },
  C: { type: 'ana', n: 40, range: 'A-L', mix: { easy: 8, medium: 20, hard: 12 }, idPrefix: 'SVA18C',
       families: ['part/whole', 'worker/tool', 'container/contents', 'object/material', 'young/adult',
                  'category/instance', 'worker/workplace', 'tool/function', 'preparation/act', 'creator/creation'] },
  D: { type: 'ana', n: 40, range: 'M-Z', mix: { easy: 8, medium: 20, hard: 12 }, idPrefix: 'SVA18D',
       families: ['cause/effect', 'degree', 'lack', 'symbol/symbolized', 'animal/characteristic',
                  'early stage/later stage', 'synonyms', 'antonyms', 'instrument/what it measures', 'expert/field of study'] },
}
const SLOTS = ['A', 'B', 'C', 'D', 'E']

/* ---------- words ---------- */
const STOP = new Set(['is', 'to', 'as', 'a', 'an', 'the', 'of', 'and', 'or', 'in', 'on', 'for', 'with', 'by', 'at',
  'from', 'its', 'it', 'be', 'not', 'one', 'into', 'up', 'out', 'off', 'over', 'make', 'become', 'something', 'someone'])
export const words = s => String(s ?? '').replace(/\[[^\]]*\]/g, ' ').toLowerCase().split(/[^a-z]+/).filter(w => w.length > 1 && !STOP.has(w))
/** Every base an inflected or -ly form could come from. Over-matching is the safe direction. */
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
const rootKey = w => [...roots(w)]

async function dumpLive() {
  const { createClient } = await import('@supabase/supabase-js')
  const env = Object.fromEntries(readFileSync(join(HERE, '../../.env.local'), 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const rows = []
  for (let f = 0; ; f += 1000) {
    // ALL SSAT verbal rows, live, staged and archived: "new words only" means new to the bank.
    const { data, error } = await db.from('study_item_bank').select('id,item').eq('family', 'ssat').eq('section', 'verbal')
      .order('id', { ascending: true }).range(f, f + 999)
    if (error) throw new Error(error.message)
    rows.push(...data); if (data.length < 1000) break
  }
  if (!rows.length || new Set(rows.map(r => r.id)).size !== rows.length) { console.error('REFUSING: zero rows or paging slipped'); process.exit(2) }
  const w = new Set()
  for (const r of rows) for (const s of [r.item?.prompt, ...(r.item?.choices ?? []), r.item?.correct_answer]) for (const x of words(s)) w.add(x)
  writeFileSync(LIVE, JSON.stringify({ fetchedAt: new Date().toISOString(), rows: rows.length, words: [...w].sort() }, null, 0) + '\n')
  console.log(`live-words: ${rows.length} SSAT verbal rows (all states) -> ${w.size} distinct content words -> ${LIVE}`)
}

/* ---------- design: seeded per-slot key letter, difficulty, and (analogies) balanced relation incidence ---------- */
function design() {
  const rand = rng(20261031)
  const out = {}
  for (const [a, cfg] of Object.entries(AUTHORS)) {
    const letters = shuffleWith(Array.from({ length: cfg.n }, (_, i) => SLOTS[i % 5]), rand)
    const diffs = shuffleWith(Object.entries(cfg.mix).flatMap(([d, k]) => Array(k).fill(d)), rand)
    if (diffs.length !== cfg.n) throw new Error(`${a}: mix does not sum to n`)
    const slots = letters.map((L, i) => ({ id: `${cfg.idPrefix}-${String(i + 1).padStart(2, '0')}`, key_slot: L, difficulty: diffs[i] }))
    if (cfg.type === 'ana') {
      // Each family keyed n/10 times and present (key or distractor) in exactly n/2 items:
      // a family's key rate is then 20.0%, the 5-choice chance line, so WHICH relation an
      // option instantiates carries no information about whether it is the key (s10 design).
      const F = cfg.families, keyEach = cfg.n / F.length, distEach = cfg.n * 4 / F.length
      for (let attempt = 0; attempt < 5000; attempt++) {
        const keys = shuffleWith(F.flatMap(f => Array(keyEach).fill(f)), rand)
        const left = Object.fromEntries(F.map(f => [f, distEach]))
        let ok = true
        const rows = keys.map(k => {
          const cand = shuffleWith(F.filter(f => f !== k && left[f] > 0), rand).sort((x, y) => left[y] - left[x])
          if (cand.length < 4) { ok = false; return null }
          const d = cand.slice(0, 4); for (const f of d) left[f]--
          return { key_family: k, distractor_families: d.sort() }
        })
        if (ok && Object.values(left).every(v => v === 0)) { rows.forEach((r, i) => Object.assign(slots[i], r)); break }
        if (attempt === 4999) throw new Error(`${a}: no balanced design`)
      }
    }
    out[a] = { type: cfg.type, range: cfg.range, families: cfg.families ?? null, slots }
  }
  return out
}

/* ---------- check ---------- */
function loadJson(p) {
  if (!existsSync(p)) { console.error(`REFUSING: ${p} does not exist`); process.exit(2) }
  try { return JSON.parse(readFileSync(p, 'utf8')) } catch (e) { console.error(`REFUSING: ${p}: ${e.message}`); process.exit(2) }
}
function itemWords(it) { return [it.prompt, ...(it.choices ?? [])].flatMap(words) }
export function check(author, items, { also = [], live } = {}) {
  const cfg = AUTHORS[author]; if (!cfg) throw new Error(`unknown author ${author}`)
  const errs = [], notes = []
  const des = existsSync(DESIGN) ? JSON.parse(readFileSync(DESIGN, 'utf8'))[author] : null
  const liveRoots = new Map()
  for (const w of live) for (const r of roots(w)) if (!liveRoots.has(r)) liveRoots.set(r, w)
  const otherRoots = new Map()
  for (const it of also) for (const w of itemWords(it)) for (const r of roots(w)) if (!otherRoots.has(r)) otherRoots.set(r, `${w} (${it.id})`)
  const [lo, hi] = cfg.range.split('-')
  const used = new Map()
  const slotCount = {}, famKey = {}, famSeen = {}
  let longest = 0, shortest = 0
  items.forEach((it, i) => {
    const id = it.id ?? `#${i}`
    const ch = it.choices ?? []
    if (ch.length !== 5 || new Set(ch.map(c => String(c).trim().toLowerCase())).size !== 5) errs.push(`${id}: needs 5 distinct choices`)
    const ki = ch.indexOf(it.correct_answer)
    if (ki < 0) errs.push(`${id}: correct_answer not among choices`)
    else slotCount[SLOTS[ki]] = (slotCount[SLOTS[ki]] ?? 0) + 1
    if (des) {
      const s = des.slots[i]
      if (!s || s.id !== it.id) errs.push(`${id}: item ${i + 1} must carry design id ${s?.id}`)
      else {
        if (ki >= 0 && SLOTS[ki] !== s.key_slot) errs.push(`${id}: key must sit in slot ${s.key_slot} (is ${SLOTS[ki]})`)
        if (it.difficulty !== s.difficulty) errs.push(`${id}: difficulty must be '${s.difficulty}' (design)`)
      }
    }
    if (!String(it.explanation ?? '').trim()) errs.push(`${id}: no explanation`)
    const lens = ch.map(c => String(c).length); const kl = lens[ki]
    if (ki >= 0 && lens.filter(l => l >= kl).length === 1) longest++
    if (ki >= 0 && lens.filter(l => l <= kl).length === 1) shortest++
    if (cfg.type === 'syn') {
      const m = /^\[Synonym\] ([A-Z]+)$/.exec(String(it.prompt ?? ''))
      if (!m) errs.push(`${id}: prompt must be '[Synonym] HEADWORD' (one upper-case word)`)
      else if (m[1][0] < lo || m[1][0] > hi) errs.push(`${id}: headword ${m[1]} outside this author's range ${cfg.range}`)
      if (it.kind !== 'synonym' || it.subskill !== 'synonym') errs.push(`${id}: kind/subskill must be synonym`)
    } else {
      const m = /^\[Analogy\] ([a-z]+(?: [a-z]+)?) is to ([a-z]+(?: [a-z]+)?) as$/.exec(String(it.prompt ?? ''))
      if (!m) errs.push(`${id}: prompt must be '[Analogy] x is to y as' (lower case)`)
      else if (m[1][0].toUpperCase() < lo || m[1][0].toUpperCase() > hi) errs.push(`${id}: stem word '${m[1]}' outside this author's range ${cfg.range}`)
      for (const c of ch) if (!/^[a-z]+(?: [a-z]+)? is to [a-z]+(?: [a-z]+)?$/.test(String(c))) errs.push(`${id}: choice '${c}' must be 'c is to d'`)
      if (it.kind !== 'analogy' || it.subskill !== 'analogy') errs.push(`${id}: kind/subskill must be analogy`)
      const rel = it.option_relations
      if (!Array.isArray(rel) || rel.length !== 5) errs.push(`${id}: option_relations must list 5 families aligned to choices`)
      else {
        if (new Set(rel).size !== 5) errs.push(`${id}: option_relations repeat a family — every option must instantiate a DIFFERENT relation`)
        for (const r of rel) if (!cfg.families.includes(r)) errs.push(`${id}: relation '${r}' is not in this author's family list`)
        if (ki >= 0 && rel[ki] !== it.stem_relation) errs.push(`${id}: the key's relation must equal stem_relation`)
        if (des?.slots[i] && des.slots[i].id === it.id) {
          const s = des.slots[i]
          if (it.stem_relation !== s.key_family) errs.push(`${id}: stem_relation must be design key_family '${s.key_family}'`)
          const d = rel.filter((_, j) => j !== ki).sort()
          if (JSON.stringify(d) !== JSON.stringify(s.distractor_families)) errs.push(`${id}: distractor relations must be exactly ${s.distractor_families.join(', ')}`)
        }
        rel.forEach((r, j) => { famSeen[r] = (famSeen[r] ?? 0) + 1; if (j === ki) famKey[r] = (famKey[r] ?? 0) + 1 })
      }
    }
    for (const w of itemWords(it)) {
      const rs = roots(w)
      const hitLive = [...rs].find(r => liveRoots.has(r))
      if (hitLive) errs.push(`${id}: '${w}' is a live SSAT verbal word or inflection (~ '${liveRoots.get(hitLive)}')`)
      const hitOther = [...rs].find(r => otherRoots.has(r))
      if (hitOther) errs.push(`${id}: '${w}' collides with another author's '${otherRoots.get(hitOther)}'`)
      for (const r of rs) {
        const prev = used.get(r)
        if (prev && prev !== `${id}:${w}`) { errs.push(`${id}: '${w}' reuses a word already used in ${prev.split(':')[0]} ('${prev.split(':')[1]}') — every content word once per cohort`); break }
      }
      for (const r of rs) if (!used.has(r)) used.set(r, `${id}:${w}`)
    }
  })
  const n = items.length
  for (const L of SLOTS) if ((slotCount[L] ?? 0) / n > 0.3 && n >= 20) errs.push(`key slot ${L} holds ${slotCount[L]}/${n} > 30%`)
  if (n >= 20 && longest / n > 0.3) errs.push(`key strictly longest ${longest}/${n} > 30%`)
  if (n >= 20 && shortest / n > 0.3) errs.push(`key strictly shortest ${shortest}/${n} > 30%`)
  notes.push(`n=${n}; key slots ${JSON.stringify(slotCount)}; key strictly longest ${longest}/${n}, shortest ${shortest}/${n}`)
  if (cfg.type === 'ana') notes.push(`family key rate: ${Object.keys(famSeen).sort().map(f => `${f} ${famKey[f] ?? 0}/${famSeen[f]}`).join('; ')}`)
  return { errs, notes }
}

/* ---------- main ---------- */
const [cmd, ...rest] = process.argv.slice(2)
if (cmd === 'livewords') await dumpLive()
else if (cmd === 'design') {
  const d = design()
  if (rest.includes('--write')) { writeFileSync(DESIGN, JSON.stringify(d, null, 1) + '\n'); console.log(`wrote ${DESIGN}`) }
  for (const [a, x] of Object.entries(d)) {
    const c = {}; for (const s of x.slots) c[s.key_slot] = (c[s.key_slot] ?? 0) + 1
    const df = {}; for (const s of x.slots) df[s.difficulty] = (df[s.difficulty] ?? 0) + 1
    console.log(`${a} ${x.type} n=${x.slots.length} range ${x.range} slots ${JSON.stringify(c)} difficulty ${JSON.stringify(df)}`)
    if (x.type === 'ana') {
      const k = {}, seen = {}
      for (const s of x.slots) { k[s.key_family] = (k[s.key_family] ?? 0) + 1; for (const f of [s.key_family, ...s.distractor_families]) seen[f] = (seen[f] ?? 0) + 1 }
      console.log('   ' + Object.keys(seen).sort().map(f => `${f} key ${k[f]}/${seen[f]}`).join('; '))
    }
  }
} else if (cmd === 'check') {
  const [author, file] = rest
  if (!AUTHORS[author] || !file) { console.error('usage: check <A|B|C|D> <file.json> [--also f ...]'); process.exit(2) }
  if (!existsSync(LIVE)) { console.error(`REFUSING: ${LIVE} missing; run livewords first`); process.exit(2) }
  const live = JSON.parse(readFileSync(LIVE, 'utf8')).words
  if (!live?.length) { console.error('REFUSING: live word list is empty'); process.exit(2) }
  const items = loadJson(file)
  if (!Array.isArray(items) || !items.length) { console.error(`REFUSING: ${file} holds no items`); process.exit(2) }
  const also = []
  for (let i = rest.indexOf('--also'); i >= 0 && i + 1 < rest.length; i++) { if (i === rest.indexOf('--also')) continue; const a = loadJson(rest[i]); if (!Array.isArray(a) || !a.length) { console.error(`REFUSING: ${rest[i]} holds no items`); process.exit(2) } also.push(...a) }
  const { errs, notes } = check(author, items, { also, live })
  console.log(`check ${author} ${file}: live words ${live.length}, other-author items ${also.length}`)
  for (const n of notes) console.log('  ' + n)
  for (const e of errs) console.log('  FAIL ' + e)
  console.log(errs.length ? `  => ${errs.length} problem(s)` : '  => PASS')
  process.exit(errs.length ? 1 : 0)
} else if (cmd === 'probe') {
  // probe <word ...> [--also f ...]: which candidate words are live (any inflection) or used by another file
  const ai = rest.indexOf('--also')
  const ws = (ai >= 0 ? rest.slice(0, ai) : rest).map(w => w.toLowerCase())
  if (!ws.length) { console.error('usage: probe <word ...> [--also f ...]'); process.exit(2) }
  const live = JSON.parse(readFileSync(LIVE, 'utf8')).words
  const liveRoots = new Map(); for (const w of live) for (const r of roots(w)) if (!liveRoots.has(r)) liveRoots.set(r, w)
  const other = new Map()
  if (ai >= 0) for (const f of rest.slice(ai + 1)) for (const it of loadJson(f)) for (const w of itemWords(it)) for (const r of roots(w)) other.set(r, `${w} (${it.id})`)
  for (const w of ws) {
    const rs = [...roots(w)]
    const l = rs.find(r => liveRoots.has(r)), o = rs.find(r => other.has(r))
    console.log(`${w.padEnd(18)} ${l ? `LIVE ~ ${liveRoots.get(l)}` : o ? `TAKEN ~ ${other.get(o)}` : 'free'}`)
  }
} else if (cmd === 'merge') {
  const [type, out, ...files] = rest
  if (!['syn', 'ana'].includes(type) || !out || files.length !== 2) { console.error('usage: merge <syn|ana> <out.json> <f1> <f2>'); process.exit(2) }
  const merged = files.flatMap(f => { const a = loadJson(f); if (!Array.isArray(a) || !a.length) { console.error(`REFUSING: ${f} empty`); process.exit(2) } return a })
  writeFileSync(out, JSON.stringify(merged, null, 1) + '\n'); console.log(`merged ${merged.length} -> ${out}`)
} else { console.error('usage: livewords | design [--write] | check <A|B|C|D> <file> [--also f ...] | merge <syn|ana> <out> <f1> <f2>'); process.exit(2) }
