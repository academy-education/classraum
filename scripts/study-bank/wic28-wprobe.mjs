#!/usr/bin/env node
/**
 * wic28-wprobe.mjs — pre-freeze STEERING probe over EVERY world of sat-cs-wic-v28
 * (decides nothing at the gate). wic27-wprobe.mjs with three changes, each tied to a v27
 * finding (PREREG-WIC28-2026-10-23.md):
 *
 *   render [--work <dir>] [--out <prefix>]   four renders r0..r3; render r holds world
 *        (r + itemIndex) mod 4 of EVERY item, so each render shows each item exactly
 *        once and no reader ever sees two worlds of one item. Passage + options, no
 *        key; letters dealt flat within each render; ids P01..; seed 20262883.
 *        -> <prefix>-r<k>.blind.json / .key.json  (default sat-cs-wic-v28-wprobe)
 *        Also writes <prefix>.snapshot.json: the sha256 of every world's passage AND
 *        explanation at render time, so `verify` can tell what was revised.
 *        Refuses if a snapshot already exists (a re-render would reset what verify compares).
 *   phase2 [--work <dir>] [--out <prefix>]   NEW. Only after all four cold probe files are
 *        written and valid: records their sha256 in <prefix>.phase1.sha256, then writes
 *        <prefix>-r<k>.phase2.json (per pid: the key letter and the world's explanation, as
 *        the render showed it). Refuses if the sha file or any phase-2 file already exists.
 *   score  [--work <dir>] [--out <prefix>]   reads <prefix>-r<k>.probe.json (cold, phase 1) and
 *        <prefix>-r<k>.probe2.json (key and explanation shown), k = 0..3. Refuses (exit 2) unless
 *        the phase-1 files still match <prefix>.phase1.sha256. Writes <work>/<L>/PROBE-FEEDBACK.json.
 *   verify [--work <dir>] [--out <prefix>]   after the ONE revision round. Exit 1 if a MUST-REVISE
 *        world is unchanged in the part that must change, if a key changed, or if an item or world
 *        vanished or appeared. wic28-select.mjs runs this and refuses unless it is green.
 *
 * What changed from v27, and why (the v27 record, served worlds, probe pre-revision vs panel):
 *  1. PHASE 2, the explanation. 4 of v27's 6 drops were explanation-path drops (A-04, D-03, D-07,
 *     and E-05 alongside free-strikable): the explanation rejected the strongest near-miss on a thin
 *     or wrong reason. The v27 probe never saw an explanation. Now each reader answers the graders'
 *     phase-2 questions (key_ok, path_coherent) for its own render, after its cold file is
 *     sha-recorded. path_coherent false -> MUST revise, and verify requires the explanation to change;
 *     key_ok false -> MUST revise, and verify requires the passage to change.
 *  2. distractor_quality below STRONG -> MUST revise (passage). v27 served worlds, probe rating
 *     before revision: strong 9 hard / 6 medium / 0 dropped; plausible 2 / 15 / 4; weak 0 / 2 / 2.
 *     The panel's own split: all three graders strong on 7 of 11 kept-hard, 0 of 23 kept-medium.
 *  3. explicit_kills >= 2 is LISTED, no longer a naming reason: it named most of v27's 147 of 160
 *     worlds and did not separate (served worlds with >= 2: 7 hard / 18 medium / 4 dropped; < 2:
 *     4 / 5 / 2).
 *  Plus: the reader answers the graders' batch question cold (`_batch.tells`: a pattern ACROSS
 *  items that predicts the key, or one template used repeatedly). Listed in every author's
 *  feedback; it names nothing and verify does not read it.
 * Kept from v27: MUST revise on easy, or n_struck >= 2 (the gate's two difficulty drops); named
 * (listed for the author, not verified) on a missed key, not exclusive, a second defensible option,
 * key_from_one_sentence, a resolving word, an antonym pair, an option above ceiling, literal_fit,
 * presupposes_absent.
 * One reader per world against the gate's median of three, all samples of one model. verify proves
 * an edit, not an improvement. Selection is not computable until freeze (the seed mixes the frozen
 * sha), so revising here cannot favour the served world.
 * Refuses (exit 2) on missing/unreadable input, zero worlds, or an id mismatch.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { rng, shuffleWith } from './seeded-shuffle.mjs'
const args = process.argv.slice(2)
const cmd = args[0]
const argOf = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null }
const D = 'scripts/study-bank'
const W = argOf('--work') ?? `${D}/sat-cs-wic-v28-work`
const PRE = argOf('--out') ?? `${D}/sat-cs-wic-v28-wprobe`
const AUTH = ['A', 'B', 'C', 'D', 'E']
const L4 = ['A', 'B', 'C', 'D']
const QUESTION = 'Which choice completes the text with the most logical and precise word or phrase?'
const die = m => { console.error(`REFUSING: ${m}`); process.exit(2) }
const rd = p => { if (!existsSync(p)) die(`${p} missing`); try { return JSON.parse(readFileSync(p, 'utf8')) } catch (e) { die(`${p}: ${e.message}`) } }
const sha = s => createHash('sha256').update(String(s)).digest('hex')
const fileSha = p => createHash('sha256').update(readFileSync(p)).digest('hex')
const loadItems = () => {
  const items = []
  for (const a of AUTH) { const dir = `${W}/${a}`; if (!existsSync(dir)) continue
    for (const f of readdirSync(dir).filter(f => /^WIC28[A-E]-\d\d\.json$/.test(f)).sort()) items.push({ ...rd(`${dir}/${f}`), author: a }) }
  if (!items.length) die('no candidate files')
  if (items.some(it => !Array.isArray(it.worlds) || it.worlds.length !== 4)) die('an item lacks four worlds (run wic28-selfcheck first)')
  if (new Set(items.map(it => it.id)).size !== items.length) die('duplicate item ids on disk')
  return items
}
const P1 = r => `${PRE}-r${r}.probe.json`, P2 = r => `${PRE}-r${r}.probe2.json`, KEY = r => `${PRE}-r${r}.key.json`
const SHAFILE = `${PRE}.phase1.sha256`
/* phase-1 validation, shared by phase2 and score: a cold file must be complete before its sha is taken */
const checkPhase1 = r => {
  const key = rd(KEY(r)), pr = rd(P1(r))
  const ids = Object.keys(key)
  if (!ids.length) die(`render r${r} has zero worlds`)
  const extra = Object.keys(pr).filter(i => i !== '_batch' && !key[i])
  if (extra.length) die(`probe r${r} answers ids the render does not hold: ${extra.slice(0, 5).join(', ')}`)
  const miss = ids.filter(i => !pr[i] || !L4.includes(String(pr[i].pick).toUpperCase()))
  if (miss.length) die(`probe r${r} lacks a pick for ${miss.slice(0, 5).join(', ')}`)
  const badDiff = ids.filter(i => !['easy', 'medium', 'hard'].includes(pr[i].difficulty))
  if (badDiff.length) die(`probe r${r} difficulty not easy|medium|hard for ${badDiff.slice(0, 5).join(', ')}`)
  const badDq = ids.filter(i => !['weak', 'plausible', 'strong'].includes(pr[i].distractor_quality))
  if (badDq.length) die(`probe r${r} distractor_quality not weak|plausible|strong for ${badDq.slice(0, 5).join(', ')}`)
  const badStruck = ids.filter(i => !Number.isInteger(pr[i].n_struck) || pr[i].n_struck < 0 || pr[i].n_struck > 3)
  if (badStruck.length) die(`probe r${r} n_struck not an integer 0-3 for ${badStruck.slice(0, 5).join(', ')}`)
  const badList = ids.filter(i => { const st = pr[i].struck; return !Array.isArray(st) || st.length !== pr[i].n_struck || new Set(st.map(x => String(x).toUpperCase())).size !== st.length || st.some(x => !L4.includes(String(x).toUpperCase()) || String(x).toUpperCase() === String(pr[i].pick).toUpperCase()) })
  if (badList.length) die(`probe r${r} \`struck\` must list exactly n_struck distinct letters, none the reader's own pick, for ${badList.slice(0, 5).join(', ')}`)
  // a world that must be revised goes back with the reader's reason; a bare rating is not feedback an author can act on
  const bare = ids.filter(i => (pr[i].difficulty === 'easy' || pr[i].n_struck >= 2 || pr[i].distractor_quality !== 'strong') && String(pr[i].note ?? '').trim().length < 10)
  if (bare.length) die(`probe r${r} rates ${bare.slice(0, 5).join(', ')} easy, n_struck >= 2 or distractors below strong without a note (the reader must say what gave it away)`)
  if (!pr._batch || !Array.isArray(pr._batch.tells)) die(`probe r${r} lacks _batch.tells (an array, empty if the reader found no cross-item pattern)`)
  return { key, pr, ids }
}
if (cmd === 'render') {
  if (existsSync(`${PRE}.snapshot.json`)) die(`${PRE}.snapshot.json exists: the probe was already rendered (a re-render would reset what verify compares)`)
  const items = loadItems()
  const rand = rng(20262883)
  for (let r = 0; r < 4; r++) {
    const list = items.map((it, i) => { const k = (r + i) % 4; return { id: it.id, author: it.author, world: k, passage: it.worlds[k].passage, explanation: it.worlds[k].explanation, choices: it.choices, key: it.worlds[k].key } })
    const order = shuffleWith(shuffleWith(list, rand).map((x, i) => ({ ...x, want: L4[i % 4] })), rand)
    const blind = {}, key = {}
    order.forEach((x, i) => {
      const pid = `P${String(i + 1).padStart(2, '0')}`
      const rest = shuffleWith(x.choices.filter(c => c !== x.key), rand); let q = 0
      blind[pid] = { passage: x.passage, question: QUESTION, options: Object.fromEntries(L4.map(l => [l, l === x.want ? x.key : rest[q++]])) }
      key[pid] = { letter: x.want, id: x.id, author: x.author, world: x.world, options: blind[pid].options, explanation: String(x.explanation ?? '') }
    })
    if (new Set(Object.values(key).map(k => k.id)).size !== items.length) die('a render shows an item twice')
    writeFileSync(`${PRE}-r${r}.blind.json`, JSON.stringify(blind, null, 1) + '\n')
    writeFileSync(KEY(r), JSON.stringify(key, null, 1) + '\n')
    console.log(`render r${r}: ${order.length} worlds (one per item) -> ${PRE}-r${r}.blind.json`)
  }
  const snap = Object.fromEntries(items.map(it => [it.id, { author: it.author, worlds: it.worlds.map(w => ({ key: w.key, passage_sha256: sha(w.passage), explanation_sha256: sha(w.explanation ?? '') })) }]))
  writeFileSync(`${PRE}.snapshot.json`, JSON.stringify(snap, null, 1) + '\n')
  console.log(`snapshot: ${items.length} items x 4 worlds -> ${PRE}.snapshot.json`)
} else if (cmd === 'phase2') {
  if (existsSync(SHAFILE)) die(`${SHAFILE} exists: phase 2 was already released`)
  for (let r = 0; r < 4; r++) if (existsSync(`${PRE}-r${r}.phase2.json`)) die(`${PRE}-r${r}.phase2.json exists`)
  const lines = []
  for (let r = 0; r < 4; r++) { checkPhase1(r); lines.push(`${fileSha(P1(r))}  ${P1(r).replace(/^.*\//, '')}`) }
  writeFileSync(SHAFILE, lines.join('\n') + '\n')
  for (let r = 0; r < 4; r++) {
    const key = rd(KEY(r))
    const out = Object.fromEntries(Object.entries(key).map(([pid, k]) => [pid, { key: k.letter, explanation: k.explanation }]))
    writeFileSync(`${PRE}-r${r}.phase2.json`, JSON.stringify(out, null, 1) + '\n')
    console.log(`phase 2 r${r}: ${Object.keys(out).length} keys + explanations -> ${PRE}-r${r}.phase2.json`)
  }
  console.log(`phase-1 sha256 recorded -> ${SHAFILE}`)
} else if (cmd === 'score') {
  // the cold files must be the ones whose sha was taken before any key was shown
  const rec = Object.fromEntries((existsSync(SHAFILE) ? readFileSync(SHAFILE, 'utf8') : die(`${SHAFILE} missing: run phase2 (it records the cold files) before scoring`)).trim().split('\n').filter(Boolean).map(l => { const [h, f] = l.trim().split(/\s+/); return [f, h] }))
  const rows = [], tells = []
  for (let r = 0; r < 4; r++) {
    const f = P1(r).replace(/^.*\//, '')
    if (!rec[f]) die(`${SHAFILE} does not list ${f}`)
    if (fileSha(P1(r)) !== rec[f]) die(`${f} sha256 ${fileSha(P1(r)).slice(0, 12)} != recorded ${rec[f].slice(0, 12)} (cold file edited after the key was shown?)`)
    const { key, pr, ids } = checkPhase1(r)
    const p2 = rd(P2(r))
    const miss2 = ids.filter(i => !p2[i] || typeof p2[i].key_ok !== 'boolean' || typeof p2[i].path_coherent !== 'boolean')
    if (miss2.length) die(`probe2 r${r} lacks boolean key_ok/path_coherent for ${miss2.slice(0, 5).join(', ')}`)
    const bare2 = ids.filter(i => (p2[i].key_ok === false || p2[i].path_coherent === false) && String(p2[i].note2 ?? '').trim().length < 10)
    if (bare2.length) die(`probe2 r${r} marks ${bare2.slice(0, 5).join(', ')} key or path wrong without a note2 (say which rejection is wrong and why)`)
    for (const t of pr._batch.tells) tells.push(`r${r}: ${typeof t === 'string' ? t : JSON.stringify(t)}`)
    for (const i of ids) rows.push({ ...key[i], pid: i, r, p: pr[i], p2: p2[i] })
  }
  const named = [], must = [], by = {}, fb = {}
  const optWord = (x, l) => (l && x.options) ? x.options[String(l).toUpperCase()] ?? null : null
  for (const x of rows) {
    const why = [], mustWhy = [], listed = []
    // MUST revise (verify reads these): the gate's two difficulty drops, distractors below strong, and phase 2
    if (x.p.difficulty === 'easy') mustWhy.push('easy')
    if (x.p.n_struck >= 2) mustWhy.push(`n_struck ${x.p.n_struck}`)
    if (x.p.distractor_quality !== 'strong') mustWhy.push(`distractors ${x.p.distractor_quality}`)
    if (x.p2.key_ok === false) mustWhy.push('key not ok (phase 2)')
    if (x.p2.path_coherent === false) mustWhy.push('explanation path wrong (phase 2)')
    // named for the author, not verified (v27's other reasons, minus explicit kills)
    if (String(x.p.pick).toUpperCase() !== x.letter) why.push('key not recovered')
    if (x.p.exclusive === false) why.push('not exclusive')
    if (x.p.resolving_word_after_blank && String(x.p.resolving_word_after_blank).toLowerCase() !== 'null') why.push('resolving word after blank')
    const optSet = new Set(Object.values(x.options ?? {}).map(w => String(w).toLowerCase()))
    const apWords = (Array.isArray(x.p.antonym_pair) ? x.p.antonym_pair : []).map(w => String(w).toLowerCase())
    if (apWords.length === 2 && apWords.every(w => optSet.has(w))) why.push('antonym pair')
    const acWords = (Array.isArray(x.p.above_ceiling) ? x.p.above_ceiling : []).map(w => String(w).toLowerCase()).filter(w => optSet.has(w))
    if (acWords.length) why.push('above ceiling')
    if (x.p.key_from_one_sentence === true) why.push('one sentence')
    if (x.p.second_defensible) why.push('second defensible')
    if (x.p.literal_fit) why.push('distractor fits literally')
    if (x.p.presupposes_absent) why.push('presupposes absent')
    // listed only (v27 finding 3: did not separate panel outcomes)
    if (Number(x.p.explicit_kills) >= 2) listed.push(`explicit kills ${x.p.explicit_kills}`)
    const b = (by[x.author] ??= { n: 0, ok: 0, hard: 0, easy: 0, struck2: 0, strong: 0, path: 0, must: 0 })
    b.n++; if (String(x.p.pick).toUpperCase() === x.letter) b.ok++; if (x.p.difficulty === 'hard') b.hard++; if (x.p.difficulty === 'easy') b.easy++; if (x.p.n_struck >= 2) b.struck2++
    if (x.p.distractor_quality === 'strong') b.strong++; if (x.p2.path_coherent === false) b.path++; if (mustWhy.length) b.must++
    if (!why.length && !mustWhy.length) continue
    if (mustWhy.length) must.push(`${x.id} w${x.world}: ${mustWhy.join(', ')}`)
    named.push(`${x.id} w${x.world}: ${[...mustWhy, ...why].join(', ')}`)
    const item = ((fb[x.author] ??= {})[x.id] ??= {})
    item[`world ${x.world} (key ${optWord(x, x.letter)})`] = {
      must_revise: mustWhy,
      also_named_for: why,
      listed_only: listed,
      reader_pick_word: optWord(x, x.p.pick),
      reader_difficulty: x.p.difficulty,
      n_struck: x.p.n_struck,
      struck_words: (x.p.struck ?? []).map(l => optWord(x, l)),
      distractor_quality: x.p.distractor_quality,
      antonym_pair: apWords.length === 2 ? apWords : null,
      above_ceiling: acWords,
      key_from_one_sentence: x.p.key_from_one_sentence === true,
      explicit_kills: Number(x.p.explicit_kills) || 0,
      second_defensible_word: optWord(x, x.p.second_defensible),
      literal_fit_word: optWord(x, x.p.literal_fit),
      presupposes_absent: x.p.presupposes_absent || null,
      reader_note: String(x.p.note ?? ''),
      phase2_key_ok: x.p2.key_ok,
      phase2_path_coherent: x.p2.path_coherent,
      phase2_note: String(x.p2.note2 ?? ''),
    }
  }
  for (const a of AUTH) if (by[a]) {
    const b = by[a]
    console.log(`author ${a}: ${b.n} worlds, key recovered ${b.ok}/${b.n}, hard ${b.hard}, easy ${b.easy}, n_struck>=2 ${b.struck2}, distractors strong ${b.strong}, path wrong ${b.path}; MUST revise ${b.must}`)
    const dir = `${W}/${a}`
    if (!existsSync(dir)) die(`${dir} missing`)
    writeFileSync(`${dir}/PROBE-FEEDBACK.json`, JSON.stringify({ _batch_tells_listed_only: tells, ...(fb[a] ?? {}) }, null, 1) + '\n')
    console.log(`  feedback -> ${dir}/PROBE-FEEDBACK.json (${Object.values(fb[a] ?? {}).reduce((s, o) => s + Object.keys(o).length, 0)} named worlds)`)
  }
  console.log(`MUST revise: ${must.length} of ${rows.length} worlds; named (incl. must): ${named.length}`)
  for (const x of named) console.log('  ' + x)
  console.log(`batch tells (listed, decide nothing): ${tells.length}`)
  for (const t of tells) console.log('  ' + t)
} else if (cmd === 'verify') {
  const snap = rd(`${PRE}.snapshot.json`)
  const sids = Object.keys(snap)
  if (!sids.length) die('empty snapshot')
  const needP = new Set(), needE = new Set()  // world must change its passage / its explanation
  for (let r = 0; r < 4; r++) {
    const key = rd(KEY(r)), pr = rd(P1(r)), p2 = rd(P2(r))
    if (!Object.keys(key).length) die(`render r${r} key has zero worlds`)
    for (const [pid, k] of Object.entries(key)) {
      if (!pr[pid]) die(`probe r${r} lacks ${pid}`)
      if (!p2[pid]) die(`probe2 r${r} lacks ${pid}`)
      if (!['easy', 'medium', 'hard'].includes(pr[pid].difficulty) || !Number.isInteger(pr[pid].n_struck) || !['weak', 'plausible', 'strong'].includes(pr[pid].distractor_quality)) die(`probe r${r} ${pid} lacks difficulty, integer n_struck or distractor_quality`)
      if (typeof p2[pid].key_ok !== 'boolean' || typeof p2[pid].path_coherent !== 'boolean') die(`probe2 r${r} ${pid} lacks boolean key_ok/path_coherent`)
      const w = `${k.id}|${k.world}`
      if (pr[pid].difficulty === 'easy' || pr[pid].n_struck >= 2 || pr[pid].distractor_quality !== 'strong' || p2[pid].key_ok === false) needP.add(w)
      if (p2[pid].path_coherent === false) needE.add(w)
    }
  }
  const now = Object.fromEntries(loadItems().map(it => [it.id, it]))
  const fails = [], unchanged = []
  let changed = 0
  for (const id of sids) {
    if (!now[id]) { fails.push(`${id}: in the snapshot but no longer on disk`); continue }
    if (now[id].worlds.length !== snap[id].worlds.length) fails.push(`${id}: ${snap[id].worlds.length} worlds at render, ${now[id].worlds.length} now`)
    snap[id].worlds.forEach((w, k) => {
      const cur = now[id].worlds[k]
      if (!cur) { fails.push(`${id} w${k}: world vanished`); return }
      if (cur.key !== w.key) fails.push(`${id} w${k}: key changed ${w.key} -> ${cur.key} (a revision rewrites a world, it does not re-key it)`)
      const sameP = sha(cur.passage) === w.passage_sha256, sameE = sha(cur.explanation ?? '') === w.explanation_sha256
      if (!sameP || !sameE) changed++
      if (sameP && needP.has(`${id}|${k}`)) fails.push(`${id} w${k}: MUST revise (easy, n_struck >= 2, distractors below strong, or key not ok) and its passage is byte-identical (act on PROBE-FEEDBACK.json)`)
      if (sameE && needE.has(`${id}|${k}`)) fails.push(`${id} w${k}: explanation path judged wrong in phase 2 and the explanation is byte-identical`)
      if (sameP && sameE && !needP.has(`${id}|${k}`) && !needE.has(`${id}|${k}`)) unchanged.push(`${id} w${k}`)
    })
  }
  for (const id of Object.keys(now)) if (!snap[id]) fails.push(`${id}: on disk but not in the snapshot (never probed)`)
  console.log(`verify: ${sids.length} items, ${changed} worlds revised since render; must change passage ${needP.size}, explanation ${needE.size}; ${unchanged.length} other worlds unchanged`)
  for (const f of fails) console.log('  FAIL ' + f)
  console.log(fails.length ? `${fails.length} failure(s)` : 'verify: ok')
  process.exit(fails.length ? 1 : 0)
} else { console.error('usage: wic28-wprobe.mjs render|phase2|score|verify [--work dir] [--out prefix]'); process.exit(2) }
