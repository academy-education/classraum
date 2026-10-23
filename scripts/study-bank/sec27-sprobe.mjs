#!/usr/bin/env node
/**
 * sec27-sprobe.mjs — pre-freeze STEERING probe for sat-sec-hard-v27 (PREREG-SEC27-2026-10-23.md,
 * "Pre-freeze steering probe"). COPIED from sec26-sprobe.mjs (itself sec25's) with ids (SEC27X-01..10), paths and the
 * seed (20262783) changed and nothing else: the MUST rules are SEC25's. It decides nothing at the gate. Modeled on wic27-wprobe.mjs:
 * the reader is asked the PANEL's own phase-1 questions, in the grader brief's own words, so the
 * one revision round aims at what the gate measures (WIC v26 -> v27: panel-hard 4/40 -> 11/40
 * once the probe asked n_struck and the panel's difficulty definition).
 *
 *   render [--work <dir>] [--out <prefix>] [--readers N] [--force-rerender]
 *        N renders (default 2), r0..r(N-1). EVERY render holds all items, so each reader sees the
 *        whole batch, as a grader does, and can name cross-item templates. Ids P01.. in a seeded
 *        order per render (seed 20262783); options in the authored order (the order graders will
 *        see); no id, slot, author, key or topic_tag in a blind file.
 *        -> <prefix>-r<k>.blind.json / .key.json, and <prefix>.snapshot.json: per item the key
 *        LETTER and the sha256 of its word-token sequence (passage + options) AT RENDER TIME.
 *        Refuses if a snapshot already exists (one probe round only); --force-rerender is allowed
 *        only while no <prefix>-r<k>.probe.json exists (no reader has answered).
 *   score  [--work <dir>] [--out <prefix>]
 *        reads <prefix>-r<k>.probe.json (one FRESH reader per render, SPROBE-BRIEF.md). Refuses
 *        (exit 2) on any malformed answer (list below). Writes <work>/<X>/PROBE-FEEDBACK.json per
 *        author: every NAMED item with each reader's fields and notes verbatim, the struck option
 *        TEXTS, and any template partner.
 *   verify [--work <dir>] [--out <prefix>]
 *        after the ONE revision round. Recomputes the MUST set from the probe files and compares
 *        the items on disk with the snapshot. Exit 1 if a MUST item's word-token sequence is
 *        unchanged (whitespace or punctuation-only edits do not count as a change; boundary
 *        items excepted, see below), if any key LETTER moved (the table fixes letters), or if an
 *        item vanished or appeared. sec27-freeze.mjs refuses to freeze unless verify exits 0.
 *
 * MUST-REVISE (verify enforces) - the gate's drops, plus the panel's hard signature:
 *   any reader: my_answer != key | exclusive false or a second_defensible | n_struck >= 2 |
 *   difficulty easy | distractor_quality weak | a resolving word within four words after the
 *   blank | matches_open_mark | off_blueprint;
 *   NO reader rated it hard;
 *   any reader rated distractor_quality below strong (18 of 22 panel-hard SEC22-24 items had
 *   "strong" from all three graders, 0 of 49 panel-medium did);
 *   a template pair named by EVERY reader: the LATER slot in table order is named (the cover
 *   would hold one of the two).
 * LISTED (feedback only, not enforced): a template pair named by one reader; a summary tell that
 * names the item.
 *
 * MALFORMED (score/verify refuse, exit 2): a missing pid; my_answer not A-D; exclusive not
 * boolean; second_defensible not null/A-D or equal to my_answer; n_struck not an integer 0-3;
 * struck not exactly n_struck distinct letters excluding my_answer; resolving_word_after_blank
 * absent; matches_open_mark / doubled_word / off_blueprint not boolean; distractor_quality not
 * weak|plausible|strong; difficulty not easy|medium|hard; note under 10 characters;
 * not_hard_because under 15 characters on an item rated easy or medium; no summary.near_duplicates
 * array; a near_duplicates group naming fewer than 2 render ids, or an id-like string that is
 * not a render id.
 *
 * Boundary items (options identical once punctuation is removed) compare on a token sequence
 * that KEEPS punctuation, since a boundary revision may legitimately change only a mark.
 *
 * LIMITS, stated so nobody quotes them: two readers per item against the gate's median of three;
 * verify proves an EDIT, not an improvement. The probe is aligned with the gate, not a substitute.
 * Probe readers are never authors, solvers or graders of this batch.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { rng, shuffleWith } from './seeded-shuffle.mjs'

const args = process.argv.slice(2)
const cmd = args[0]
const argOf = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null }
const die = m => { console.error(`REFUSING: ${m}`); process.exit(2) }
const D = 'scripts/study-bank'
const W = argOf('--work') ?? `${D}/sat-sec-v27-work`
const PRE = argOf('--out') ?? `${D}/sat-sec-v27-sprobe`
const AUTH = ['A', 'B', 'C', 'D']
const L4 = ['A', 'B', 'C', 'D']
const SLOTS = AUTH.flatMap(a => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => `${a}${i}`))   // table order (v26: 10 per author)
const rd = p => { if (!existsSync(p)) die(`${p} missing`); try { return JSON.parse(readFileSync(p, 'utf8')) } catch (e) { die(`${p}: ${e.message}`) } }
const sha = s => createHash('sha256').update(String(s)).digest('hex')
const slotOf = id => { const m = /^SEC27([ABCD])-(0[1-9]|10)$/.exec(id); return m ? m[1] + Number(m[2]) : null }
const stripP = c => String(c).toLowerCase().replace(/[.,;:—–"'()?!-]/g, ' ').replace(/\s+/g, ' ').trim()
const isBoundary = it => new Set(it.choices.map(stripP)).size === 1
// word-token sequence: punctuation and whitespace edits do not count as a revision ...
const toks = s => String(s).toLowerCase().replace(/[’‘]/g, "'").match(/[a-z0-9']+/g) ?? []
// ... except on boundary items, whose revision may be a mark
const ptoks = s => String(s).toLowerCase().replace(/[’‘]/g, "'").replace(/[–]/g, '—').match(/[a-z0-9']+|[,;:—.?!()]/g) ?? []
const contentSha = it => { const f = isBoundary(it) ? ptoks : toks; return sha([f(it.passage).join(' '), ...it.choices.map(c => f(c).join(' '))].join(' || ')) }

function loadItems() {
  const items = []
  for (const a of AUTH) {
    const f = `${W}/${a}/items.json`
    if (!existsSync(f)) continue
    const arr = rd(f)
    if (!Array.isArray(arr)) die(`${f} is not an array`)
    for (const it of arr) {
      if (!it || typeof it.id !== 'string' || !slotOf(it.id) || slotOf(it.id)[0] !== a) die(`${f}: id ${it?.id} is not a SEC27${a}-NN id (01-10)`)
      if (typeof it.passage !== 'string' || (it.passage.match(/_{3,}/g) || []).length !== 1) die(`${it.id}: passage must hold exactly one blank`)
      if (!Array.isArray(it.choices) || it.choices.length !== 4 || it.choices.some(c => typeof c !== 'string')) die(`${it.id}: needs 4 string choices`)
      if (!it.choices.includes(it.correct_answer)) die(`${it.id}: key not among choices`)
      items.push({ ...it, author: a, slot: slotOf(it.id) })
    }
  }
  if (!items.length) die(`no items under ${W}/<A-D>/items.json`)
  const ids = items.map(i => i.id)
  if (new Set(ids).size !== ids.length) die('duplicate item ids')
  return items
}

function readProbes(snap) {
  const R = snap.__readers
  if (!Number.isInteger(R) || R < 1) die('snapshot lacks a reader count')
  const rows = []
  for (let r = 0; r < R; r++) {
    const key = rd(`${PRE}-r${r}.key.json`), pr = rd(`${PRE}-r${r}.probe.json`)
    const pids = Object.keys(key)
    if (!pids.length) die(`render r${r} key has zero items`)
    const items = pr?.items && typeof pr.items === 'object' ? pr.items : null
    if (!items) die(`probe r${r} has no "items" object`)
    const bad = []
    for (const pid of pids) {
      const p = items[pid]
      if (!p) { bad.push(`${pid}: missing`); continue }
      const my = String(p.my_answer ?? '').toUpperCase()
      if (!L4.includes(my)) bad.push(`${pid}: my_answer`)
      if (typeof p.exclusive !== 'boolean') bad.push(`${pid}: exclusive`)
      if (!(p.second_defensible === null || (L4.includes(String(p.second_defensible).toUpperCase()) && String(p.second_defensible).toUpperCase() !== my))) bad.push(`${pid}: second_defensible`)
      if (!Number.isInteger(p.n_struck) || p.n_struck < 0 || p.n_struck > 3) bad.push(`${pid}: n_struck`)
      const st = Array.isArray(p.struck) ? p.struck.map(x => String(x).toUpperCase()) : null
      if (!st || st.length !== p.n_struck || new Set(st).size !== st.length || st.some(x => !L4.includes(x) || x === my)) bad.push(`${pid}: struck must list exactly n_struck distinct letters, none your my_answer`)
      if (!('resolving_word_after_blank' in p)) bad.push(`${pid}: resolving_word_after_blank absent`)
      for (const b of ['matches_open_mark', 'doubled_word', 'off_blueprint']) if (typeof p[b] !== 'boolean') bad.push(`${pid}: ${b}`)
      if (!['weak', 'plausible', 'strong'].includes(p.distractor_quality)) bad.push(`${pid}: distractor_quality`)
      if (!['easy', 'medium', 'hard'].includes(p.difficulty)) bad.push(`${pid}: difficulty`)
      if (String(p.note ?? '').trim().length < 10) bad.push(`${pid}: note`)
      if (p.difficulty !== 'hard' && String(p.not_hard_because ?? '').trim().length < 15) bad.push(`${pid}: not_hard_because (required when easy or medium)`)
    }
    const extra = Object.keys(items).filter(x => !key[x])
    if (extra.length) bad.push(`ids not in the render: ${extra.slice(0, 5).join(', ')}`)
    const nd = pr?.summary?.near_duplicates
    if (!Array.isArray(nd)) bad.push('summary.near_duplicates is not an array')
    const groups = []
    if (Array.isArray(nd)) nd.forEach((g, gi) => {
      if (!Array.isArray(g)) { bad.push(`near_duplicates[${gi}] is not an array`); return }
      const got = []
      for (const s of g) {
        if (typeof s !== 'string') { bad.push(`near_duplicates[${gi}] has a non-string`); continue }
        if (key[s]) { if (!got.includes(s)) got.push(s) } else if (!/\s/.test(s.trim())) bad.push(`near_duplicates[${gi}] names "${s}", not a render id`)
      }
      if (got.length < 2) bad.push(`near_duplicates[${gi}] names ${got.length} render id(s)`)
      groups.push({ ids: got.map(x => key[x].id), why: g.filter(s => typeof s === 'string' && /\s/.test(s.trim())).join(' ') })
    })
    if (bad.length) die(`probe r${r} malformed: ${bad.slice(0, 8).join('; ')}${bad.length > 8 ? ` (+${bad.length - 8})` : ''}`)
    const tells = Array.isArray(pr?.summary?.tells) ? pr.summary.tells.map(String) : []
    for (const pid of pids) rows.push({ r, pid, ...key[pid], p: items[pid] })
    rows.push({ r, groups, tells, summary: true })
  }
  return rows
}

function name(snap, rows) {
  const R = snap.__readers
  const per = {}
  for (const x of rows.filter(x => !x.summary)) (per[x.id] ??= []).push(x)
  const must = {}, listed = {}
  const add = (o, id, why) => ((o[id] ??= []).push(why))
  for (const [id, xs] of Object.entries(per)) {
    if (xs.length !== R) die(`${id} was answered by ${xs.length} of ${R} readers`)
    const L = xs[0].letter
    if (xs.some(x => String(x.p.my_answer).toUpperCase() !== L)) add(must, id, 'key not recovered')
    if (xs.some(x => x.p.exclusive === false || x.p.second_defensible)) add(must, id, 'not exclusive')
    if (xs.some(x => x.p.n_struck >= 2)) add(must, id, `n_struck ${Math.max(...xs.map(x => x.p.n_struck))}`)
    if (xs.some(x => x.p.difficulty === 'easy')) add(must, id, 'easy')
    if (!xs.some(x => x.p.difficulty === 'hard')) add(must, id, 'no reader rated it hard')
    if (xs.some(x => x.p.distractor_quality === 'weak')) add(must, id, 'distractors weak')
    if (xs.some(x => x.p.distractor_quality !== 'strong')) add(must, id, 'distractors not strong for every reader')
    if (xs.some(x => x.p.resolving_word_after_blank && String(x.p.resolving_word_after_blank).toLowerCase() !== 'null')) add(must, id, 'resolving word after the blank')
    if (xs.some(x => x.p.matches_open_mark === true)) add(must, id, 'matches an open mark')
    if (xs.some(x => x.p.off_blueprint === true)) add(must, id, 'off blueprint')
  }
  // template pairs: count readers per unordered pair
  const pc = new Map()
  for (const s of rows.filter(x => x.summary)) {
    const seen = new Set()
    for (const g of s.groups) for (let i = 0; i < g.ids.length; i++) for (let j = i + 1; j < g.ids.length; j++) {
      const k = [g.ids[i], g.ids[j]].sort().join(' ~ ')
      if (seen.has(k)) continue
      seen.add(k); const e = pc.get(k) ?? { n: 0, why: [] }; e.n++; if (g.why) e.why.push(g.why); pc.set(k, e)
    }
  }
  const pairs = []
  for (const [k, e] of pc) {
    const [a, b] = k.split(' ~ ')
    const later = SLOTS.indexOf(slotOf(a)) > SLOTS.indexOf(slotOf(b)) ? a : b, earlier = later === a ? b : a
    pairs.push({ a, b, n: e.n, why: e.why })
    if (e.n >= R) { add(must, later, `template pair with ${earlier} (named by all ${R} readers)`); add(listed, earlier, `template partner of ${later} (the later slot revises)`) }
    else { add(listed, a, `template pair with ${b} named by ${e.n} of ${R}`); add(listed, b, `template pair with ${a} named by ${e.n} of ${R}`) }
  }
  for (const s of rows.filter(x => x.summary)) for (const t of s.tells) for (const id of Object.keys(per)) {
    const short = id.replace(/^SEC27/, '')
    // tells name render ids (P01..); map them back
    const pids = per[id].filter(x => x.r === s.r).map(x => x.pid)
    if (pids.some(p => new RegExp(`\\b${p}\\b`).test(t)) || t.includes(short)) add(listed, id, `named in reader r${s.r}'s tell: ${t.slice(0, 160)}`)
  }
  return { per, must, listed, pairs }
}

if (cmd === 'render') {
  const items = loadItems()
  const R = Number(argOf('--readers') ?? 2)
  if (!Number.isInteger(R) || R < 1 || R > 3) die('--readers must be 1-3')
  if (existsSync(`${PRE}.snapshot.json`)) {
    if (!args.includes('--force-rerender')) die(`${PRE}.snapshot.json exists: the probe runs ONE round (pass --force-rerender only if no reader has answered)`)
    for (let r = 0; r < 3; r++) if (existsSync(`${PRE}-r${r}.probe.json`)) die(`${PRE}-r${r}.probe.json exists: a reader has answered, so a rerender would start a second round`)
  }
  const rand = rng(20262783)
  for (let r = 0; r < R; r++) {
    const order = shuffleWith(items.slice(), rand)
    const blind = {}, key = {}
    order.forEach((it, i) => {
      const pid = `P${String(i + 1).padStart(2, '0')}`
      blind[pid] = { passage: it.passage, prompt: it.prompt ?? 'Which choice completes the text so that it conforms to the conventions of Standard English?', options: Object.fromEntries(L4.map((l, j) => [l, it.choices[j]])) }
      key[pid] = { id: it.id, author: it.author, slot: it.slot, letter: L4[it.choices.indexOf(it.correct_answer)] }
    })
    writeFileSync(`${PRE}-r${r}.blind.json`, JSON.stringify(blind, null, 1) + '\n')
    writeFileSync(`${PRE}-r${r}.key.json`, JSON.stringify(key, null, 1) + '\n')
    console.log(`render r${r}: ${order.length} items -> ${PRE}-r${r}.blind.json`)
  }
  const snap = { __readers: R, ...Object.fromEntries(items.map(it => [it.id, { author: it.author, letter: L4[it.choices.indexOf(it.correct_answer)], content_sha256: contentSha(it), boundary: isBoundary(it) }])) }
  writeFileSync(`${PRE}.snapshot.json`, JSON.stringify(snap, null, 1) + '\n')
  console.log(`snapshot: ${items.length} items, ${R} reader(s) -> ${PRE}.snapshot.json`)
} else if (cmd === 'score') {
  const snap = rd(`${PRE}.snapshot.json`)
  if (Object.keys(snap).filter(k => k !== '__readers').length === 0) die('empty snapshot')
  const rows = readProbes(snap)
  const { per, must, listed, pairs } = name(snap, rows)
  const fb = {}
  for (const [id, xs] of Object.entries(per)) {
    if (!must[id] && !listed[id]) continue
    const it0 = xs[0]
    const opt = (x, l) => (l ? x.p && rd(`${PRE}-r${x.r}.blind.json`)[x.pid]?.options?.[String(l).toUpperCase()] : null) ?? null
    ;(fb[it0.author] ??= {})[id] = {
      must_revise: !!must[id], named_for: must[id] ?? [], listed_for: listed[id] ?? [],
      readers: xs.map(x => ({
        reader: `r${x.r}`, my_answer_text: opt(x, x.p.my_answer), difficulty: x.p.difficulty, n_struck: x.p.n_struck,
        struck_options: (x.p.struck ?? []).map(l => opt(x, l)), distractor_quality: x.p.distractor_quality,
        exclusive: x.p.exclusive, second_defensible_text: opt(x, x.p.second_defensible), convention: x.p.convention ?? null,
        resolving_word_after_blank: x.p.resolving_word_after_blank, not_hard_because: x.p.not_hard_because ?? null, note: x.p.note,
      })),
      template_partners: pairs.filter(q => q.a === id || q.b === id).map(q => ({ with: q.a === id ? q.b : q.a, readers: q.n, why: q.why })),
    }
  }
  for (const a of AUTH) {
    const ids = Object.keys(per).filter(id => per[id][0].author === a)
    if (!ids.length) continue
    const xs = ids.flatMap(id => per[id])
    console.log(`author ${a}: ${ids.length} items; key recovered ${xs.filter(x => String(x.p.my_answer).toUpperCase() === x.letter).length}/${xs.length} reads; hard ${xs.filter(x => x.p.difficulty === 'hard').length}, easy ${xs.filter(x => x.p.difficulty === 'easy').length}, n_struck>=2 ${xs.filter(x => x.p.n_struck >= 2).length}, strong ${xs.filter(x => x.p.distractor_quality === 'strong').length}; MUST revise ${ids.filter(id => must[id]).length}`)
    const dir = `${W}/${a}`
    if (!existsSync(dir)) die(`${dir} missing`)
    writeFileSync(`${dir}/PROBE-FEEDBACK.json`, JSON.stringify(fb[a] ?? {}, null, 1) + '\n')
  }
  const mids = Object.keys(must).sort((x, y) => SLOTS.indexOf(slotOf(x)) - SLOTS.indexOf(slotOf(y)))
  console.log(`MUST revise: ${mids.length} of ${Object.keys(per).length}`)
  for (const id of mids) console.log(`  ${id}: ${must[id].join(', ')}`)
  console.log(`listed only: ${Object.keys(listed).filter(id => !must[id]).length}; template pairs named: ${pairs.length} (${pairs.filter(p => p.n >= snap.__readers).length} by every reader)`)
} else if (cmd === 'verify') {
  const snap = rd(`${PRE}.snapshot.json`)
  const sids = Object.keys(snap).filter(k => k !== '__readers')
  if (!sids.length) die('empty snapshot')
  const rows = readProbes(snap)
  const { must } = name(snap, rows)
  const now = Object.fromEntries(loadItems().map(it => [it.id, it]))
  const fails = [], unchanged = []
  let changed = 0
  for (const id of sids) {
    const cur = now[id]
    if (!cur) { fails.push(`${id}: in the snapshot but no longer on disk`); continue }
    const letter = L4[cur.choices.indexOf(cur.correct_answer)]
    if (letter !== snap[id].letter) fails.push(`${id}: key letter moved ${snap[id].letter} -> ${letter} (the table fixes letters)`)
    const same = contentSha(cur) === snap[id].content_sha256
    if (!same) changed++
    else if (must[id]) fails.push(`${id}: MUST revise (${must[id].join(', ')}) and its words are unchanged (act on PROBE-FEEDBACK.json)`)
    else unchanged.push(id)
  }
  for (const id of Object.keys(now)) if (!snap[id]) fails.push(`${id}: on disk but not in the snapshot (never probed)`)
  console.log(`verify: ${sids.length} items, ${changed} revised since render, ${Object.keys(must).length} must-revise, ${unchanged.length} others unchanged`)
  for (const f of fails) console.log('  FAIL ' + f)
  console.log(fails.length ? `${fails.length} failure(s)` : 'verify: ok')
  process.exit(fails.length ? 1 : 0)
} else { console.error('usage: sec27-sprobe.mjs render|score|verify [--work dir] [--out prefix] [--readers N] [--force-rerender]'); process.exit(2) }
