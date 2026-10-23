#!/usr/bin/env node
/**
 * wic27-wprobe.mjs — pre-freeze STEERING probe over EVERY world of sat-cs-wic-v27
 * (decides nothing at the gate). v26's wic26-wprobe.mjs, with the reader asked the
 * PANEL's questions (PREREG-WIC27-2026-10-23.md):
 *
 *   render [--work <dir>] [--out <prefix>]   four renders r0..r3; render r holds world
 *        (r + itemIndex) mod 4 of EVERY item, so each render shows each item exactly
 *        once and no reader ever sees two worlds of one item. Passage + options, no
 *        key; letters dealt flat within each render; ids P01..; seed 20262783.
 *        -> <prefix>-r<k>.blind.json / .key.json  (default sat-cs-wic-v27-wprobe)
 *        Also writes <prefix>.snapshot.json, the sha256 of every world's passage AT
 *        RENDER TIME, so `verify` can tell whether a named world was revised.
 *   score  [--work <dir>] [--out <prefix>]   reads <prefix>-r<k>.probe.json, k = 0..3 (one
 *        FRESH reader per render, WPROBE-BRIEF.md fields). Writes <work>/<L>/PROBE-FEEDBACK.json
 *        for every author: each NAMED world with the reader's fields and note verbatim.
 *        Refuses (exit 2) if a world rated EASY or with n_struck >= 2 has no note, if
 *        n_struck is not an integer 0-3, or if `struck` does not list exactly n_struck
 *        letters other than the reader's own pick.
 *   verify [--work <dir>] [--out <prefix>]   after the ONE revision round: compares every
 *        world's passage with the render-time snapshot. Exit 1 if any world the reader
 *        rated EASY, or NEW gave n_struck >= 2, is byte-identical to what the reader saw,
 *        if a world's key changed, or if an item or world vanished or appeared. Other named
 *        worlds left unchanged are listed, not failed. wic27-select.mjs runs this and
 *        refuses unless it is green.
 *
 * NEW in v27: the reader answers the GRADER-BRIEF questions with the grader's wording:
 * `n_struck` (wrong options strikable WITHOUT the passage's logic) and `difficulty` against
 * real module-2 hard-route WIC (hard = combine two or more sentences and reject near-misses
 * that fit most of the passage). In v26 the probe rated 16/160 worlds hard and the panel
 * kept 4 hard: the probe's hard served worlds went 1 hard / 1 medium / 2 dropped, and 3 of
 * the 4 panel-hard worlds were probe-medium. The probe was steering on a different
 * definition from the gate's. A world is now NAMED on the gate's two difficulty drops:
 *   - rated easy, or
 *   - n_struck >= 2 (the gate drops on panel-median n_struck >= 2),
 * and also, as in v26, if the pick misses the key, key_from_one_sentence, explicit_kills
 * >= 2, a second defensible option, literal_fit or presupposes_absent; and, mirroring the
 * other gate drops: exclusive false, distractor_quality weak, a resolving word after the
 * blank, an antonym pair of two options, or an option above ceiling.
 * One reader per world, so this is one sample where the gate takes a median of three.
 * Selection is not computable until freeze (the seed mixes the frozen sha), so revising
 * here cannot favour the served world.
 * Refuses (exit 2) on missing/unreadable input, zero worlds, or an id mismatch.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { rng, shuffleWith } from './seeded-shuffle.mjs'
const args = process.argv.slice(2)
const cmd = args[0]
const argOf = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null }
const D = 'scripts/study-bank'
const W = argOf('--work') ?? `${D}/sat-cs-wic-v27-work`
const PRE = argOf('--out') ?? `${D}/sat-cs-wic-v27-wprobe`
const AUTH = ['A', 'B', 'C', 'D', 'E']
const L4 = ['A', 'B', 'C', 'D']
const rd = p => { if (!existsSync(p)) { console.error(`REFUSING: ${p} missing`); process.exit(2) } try { return JSON.parse(readFileSync(p, 'utf8')) } catch (e) { console.error(`REFUSING: ${p}: ${e.message}`); process.exit(2) } }
const sha = s => createHash('sha256').update(String(s)).digest('hex')
const loadItems = () => {
  const items = []
  for (const a of AUTH) { const dir = `${W}/${a}`; if (!existsSync(dir)) continue
    for (const f of readdirSync(dir).filter(f => /^WIC27[A-E]-\d\d\.json$/.test(f)).sort()) items.push({ ...rd(`${dir}/${f}`), author: a }) }
  if (!items.length) { console.error('REFUSING: no candidate files'); process.exit(2) }
  if (items.some(it => !Array.isArray(it.worlds) || it.worlds.length !== 4)) { console.error('REFUSING: an item lacks four worlds (run wic27-selfcheck first)'); process.exit(2) }
  return items
}
if (cmd === 'render') {
  const items = loadItems()
  const rand = rng(20262783)
  for (let r = 0; r < 4; r++) {
    const list = items.map((it, i) => { const k = (r + i) % 4; return { id: it.id, author: it.author, world: k, passage: it.worlds[k].passage, choices: it.choices, key: it.worlds[k].key } })
    const order = shuffleWith(shuffleWith(list, rand).map((x, i) => ({ ...x, want: L4[i % 4] })), rand)
    const blind = {}, key = {}
    order.forEach((x, i) => {
      const pid = `P${String(i + 1).padStart(2, '0')}`
      const rest = shuffleWith(x.choices.filter(c => c !== x.key), rand); let q = 0
      blind[pid] = { passage: x.passage, question: 'Which choice completes the text with the most logical and precise word or phrase?', options: Object.fromEntries(L4.map(l => [l, l === x.want ? x.key : rest[q++]])) }
      key[pid] = { letter: x.want, id: x.id, author: x.author, world: x.world, options: blind[pid].options }
    })
    if (new Set(Object.values(key).map(k => k.id)).size !== items.length) { console.error('REFUSING: a render shows an item twice'); process.exit(2) }
    writeFileSync(`${PRE}-r${r}.blind.json`, JSON.stringify(blind, null, 1) + '\n')
    writeFileSync(`${PRE}-r${r}.key.json`, JSON.stringify(key, null, 1) + '\n')
    console.log(`render r${r}: ${order.length} worlds (one per item) -> ${PRE}-r${r}.blind.json`)
  }
  const snap = Object.fromEntries(items.map(it => [it.id, { author: it.author, worlds: it.worlds.map(w => ({ key: w.key, passage_sha256: sha(w.passage) })) }]))
  writeFileSync(`${PRE}.snapshot.json`, JSON.stringify(snap, null, 1) + '\n')
  console.log(`snapshot: ${items.length} items x 4 worlds -> ${PRE}.snapshot.json`)
} else if (cmd === 'score') {
  const rows = []
  for (let r = 0; r < 4; r++) {
    const key = rd(`${PRE}-r${r}.key.json`), pr = rd(`${PRE}-r${r}.probe.json`)
    const ids = Object.keys(key)
    if (!ids.length) { console.error(`REFUSING: render r${r} has zero worlds`); process.exit(2) }
    const miss = ids.filter(i => !pr[i] || !L4.includes(String(pr[i].pick).toUpperCase()))
    if (miss.length) { console.error(`REFUSING: probe r${r} lacks a pick for ${miss.slice(0, 5).join(', ')}`); process.exit(2) }
    const badDiff = ids.filter(i => !['easy', 'medium', 'hard'].includes(pr[i].difficulty))
    if (badDiff.length) { console.error(`REFUSING: probe r${r} difficulty not easy|medium|hard for ${badDiff.slice(0, 5).join(', ')}`); process.exit(2) }
    // an easy world goes back with the reader's reason; a bare "easy" is not feedback an author can act on
    const badStruck = ids.filter(i => !Number.isInteger(pr[i].n_struck) || pr[i].n_struck < 0 || pr[i].n_struck > 3)
    if (badStruck.length) { console.error(`REFUSING: probe r${r} n_struck not an integer 0-3 for ${badStruck.slice(0, 5).join(', ')}`); process.exit(2) }
    const badList = ids.filter(i => { const st = pr[i].struck; return !Array.isArray(st) || st.length !== pr[i].n_struck || new Set(st.map(x => String(x).toUpperCase())).size !== st.length || st.some(x => !L4.includes(String(x).toUpperCase()) || String(x).toUpperCase() === String(pr[i].pick).toUpperCase()) })
    if (badList.length) { console.error(`REFUSING: probe r${r} \`struck\` must list exactly n_struck distinct letters, none the reader's own pick, for ${badList.slice(0, 5).join(', ')}`); process.exit(2) }
    const bare = ids.filter(i => (pr[i].difficulty === 'easy' || pr[i].n_struck >= 2) && String(pr[i].note ?? '').trim().length < 10)
    if (bare.length) { console.error(`REFUSING: probe r${r} rates ${bare.join(', ')} easy or n_struck >= 2 without a note (the reader must say what gave it away)`); process.exit(2) }
    for (const i of ids) rows.push({ ...key[i], pid: i, r, p: pr[i] })
  }
  const named = [], by = {}, fb = {}
  const optWord = (x, l) => (l && x.options) ? x.options[String(l).toUpperCase()] ?? null : null
  for (const x of rows) {
    const why = []
    if (String(x.p.pick).toUpperCase() !== x.letter) why.push('key not recovered')
    if (x.p.difficulty === 'easy') why.push('easy')
    if (x.p.n_struck >= 2) why.push(`n_struck ${x.p.n_struck}`)
    if (x.p.exclusive === false) why.push('not exclusive')
    if (x.p.distractor_quality === 'weak') why.push('distractors weak')
    if (x.p.resolving_word_after_blank && String(x.p.resolving_word_after_blank).toLowerCase() !== 'null') why.push('resolving word after blank')
    const optSet = new Set(Object.values(x.options ?? {}).map(w => String(w).toLowerCase()))
    const apWords = (Array.isArray(x.p.antonym_pair) ? x.p.antonym_pair : []).map(w => String(w).toLowerCase())
    if (apWords.length === 2 && apWords.every(w => optSet.has(w))) why.push('antonym pair')
    const acWords = (Array.isArray(x.p.above_ceiling) ? x.p.above_ceiling : []).map(w => String(w).toLowerCase()).filter(w => optSet.has(w))
    if (acWords.length) why.push('above ceiling')
    if (x.p.key_from_one_sentence === true) why.push('one sentence')
    if (Number(x.p.explicit_kills) >= 2) why.push(`explicit kills ${x.p.explicit_kills}`)
    if (x.p.second_defensible) why.push('second defensible')
    if (x.p.literal_fit) why.push('distractor fits literally')
    if (x.p.presupposes_absent) why.push('presupposes absent')
    const b = (by[x.author] ??= { n: 0, ok: 0, hard: 0, easy: 0, struck2: 0 })
    b.n++; if (String(x.p.pick).toUpperCase() === x.letter) b.ok++; if (x.p.difficulty === 'hard') b.hard++; if (x.p.difficulty === 'easy') b.easy++; if (x.p.n_struck >= 2) b.struck2++
    if (!why.length) continue
    named.push(`${x.id} w${x.world}: ${why.join(', ')}`)
    const item = ((fb[x.author] ??= {})[x.id] ??= {})
    item[`world ${x.world} (key ${optWord(x, x.letter)})`] = {
      named_for: why,
      reader_pick_word: optWord(x, x.p.pick),
      reader_difficulty: x.p.difficulty,
      n_struck: x.p.n_struck,
      struck_words: (x.p.struck ?? []).map(l => optWord(x, l)),
      distractor_quality: x.p.distractor_quality ?? null,
      antonym_pair: apWords.length === 2 ? apWords : null,
      above_ceiling: acWords,
      key_from_one_sentence: x.p.key_from_one_sentence === true,
      explicit_kills: Number(x.p.explicit_kills) || 0,
      second_defensible_word: optWord(x, x.p.second_defensible),
      literal_fit_word: optWord(x, x.p.literal_fit),
      presupposes_absent: x.p.presupposes_absent || null,
      reader_note: String(x.p.note ?? ''),
    }
  }
  for (const a of AUTH) if (by[a]) {
    const b = by[a]
    console.log(`author ${a}: ${b.n} worlds, key recovered ${b.ok}/${b.n} (${(100 * b.ok / b.n).toFixed(1)}%), hard ${b.hard}, easy ${b.easy}, n_struck>=2 ${b.struck2}`)
    const dir = `${W}/${a}`
    if (!existsSync(dir)) { console.error(`REFUSING: ${dir} missing`); process.exit(2) }
    writeFileSync(`${dir}/PROBE-FEEDBACK.json`, JSON.stringify(fb[a] ?? {}, null, 1) + '\n')
    console.log(`  feedback -> ${dir}/PROBE-FEEDBACK.json (${Object.values(fb[a] ?? {}).reduce((s, o) => s + Object.keys(o).length, 0)} named worlds)`)
  }
  console.log(`named for revision: ${named.length} of ${rows.length} worlds`)
  for (const x of named) console.log('  ' + x)
} else if (cmd === 'verify') {
  const snap = rd(`${PRE}.snapshot.json`)
  const sids = Object.keys(snap)
  if (!sids.length) { console.error('REFUSING: empty snapshot'); process.exit(2) }
  const easy = new Set()
  for (let r = 0; r < 4; r++) {
    const key = rd(`${PRE}-r${r}.key.json`), pr = rd(`${PRE}-r${r}.probe.json`)
    if (!Object.keys(key).length) { console.error(`REFUSING: render r${r} key has zero worlds`); process.exit(2) }
    for (const [pid, k] of Object.entries(key)) {
      if (!pr[pid]) { console.error(`REFUSING: probe r${r} lacks ${pid}`); process.exit(2) }
      if (!['easy', 'medium', 'hard'].includes(pr[pid].difficulty) || !Number.isInteger(pr[pid].n_struck)) { console.error(`REFUSING: probe r${r} ${pid} lacks difficulty or integer n_struck`); process.exit(2) }
      // a world must be revised if its reader rated it easy OR could strike two or more wrong options on a surface read
      if (pr[pid].difficulty === 'easy' || pr[pid].n_struck >= 2) easy.add(`${k.id}|${k.world}`)
    }
  }
  const now = Object.fromEntries(loadItems().map(it => [it.id, it]))
  const fails = [], unchanged = []
  let changed = 0
  for (const id of sids) {
    if (!now[id]) { fails.push(`${id}: in the snapshot but no longer on disk`); continue }
    snap[id].worlds.forEach((w, k) => {
      const cur = now[id].worlds[k]
      if (!cur) { fails.push(`${id} w${k}: world vanished`); return }
      if (cur.key !== w.key) fails.push(`${id} w${k}: key changed ${w.key} -> ${cur.key} (a revision rewrites a world, it does not re-key it)`)
      const same = sha(cur.passage) === w.passage_sha256
      if (!same) changed++
      else if (easy.has(`${id}|${k}`)) fails.push(`${id} w${k}: rated EASY or n_struck >= 2 by its reader and left byte-identical (act on the note in PROBE-FEEDBACK.json)`)
      else unchanged.push(`${id} w${k}`)
    })
  }
  for (const id of Object.keys(now)) if (!snap[id]) fails.push(`${id}: on disk but not in the snapshot (never probed)`)
  console.log(`verify: ${sids.length} items, ${changed} worlds revised since render, ${easy.size} rated easy or n_struck >= 2, ${unchanged.length} other worlds unchanged`)
  for (const f of fails) console.log('  FAIL ' + f)
  console.log(fails.length ? `${fails.length} failure(s)` : 'verify: ok')
  process.exit(fails.length ? 1 : 0)
} else { console.error('usage: wic27-wprobe.mjs render|score|verify [--work dir] [--out prefix]'); process.exit(2) }
