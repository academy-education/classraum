#!/usr/bin/env node
/**
 * wic25-select.mjs — FREEZE the four-world author files, then SELECT one world per
 * item with the pre-committed seed, and write the served batch.
 *
 *   node scripts/study-bank/wic25-select.mjs
 *     [--work <dir> --out <prefix> --per-author N --live <path> --base-seed S]   (break-tests only)
 *     [--simulate K [--reroll-quota]]   diagnostic: selection over K base seeds, world-index / rarity-rank balance; writes nothing
 *
 * PREREG-WIC25-2026-10-23.md, fixed before any item existed:
 *   1. Refuse (exit 2) unless wic25-selfcheck.mjs --final is green and every author
 *      has exactly N files (N = 8).
 *   2. Write <prefix>.worlds.json: every item with ALL FOUR worlds, ids sorted. This is
 *      the frozen text; its sha256 is printed and recorded. Nothing is edited after it.
 *   3. Selection seed = (BASE + first 8 hex digits of that sha256, as an integer) mod 2^32,
 *      BASE = 20262590. So the rule and base are fixed now, but WHICH world serves is
 *      unknowable until the text is frozen: nobody can put effort into the served world.
 *      mulberry32 (seeded-shuffle.mjs) draws one world index 0-3 per item, in id order.
 *   4. NO re-roll. crv7 re-rolled on stimulus-kind quotas; the analogue here (re-roll when the
 *      served key is the rarest / commonest / longest / shortest option on > 35% of items) was
 *      break-tested on 2026-10-23 and REJECTED: over 4,000 base seeds it tilted the served key
 *      toward the middle rarity and length ranks (on the 8-item throwaway: served rarity rank 1..4 = 5401/9308/11516/5775, chi2 3222; without the re-roll 8054/7992/7972/7982, chi2 0.5),
 *      i.e. it rebuilt a "pick the middle word" tell. Any acceptance rule that reads the served
 *      key's features conditions the key on them. The realised rarity/length ranks are REPORTED;
 *      the stage-5 tells decide on the kept set. `--simulate K --reroll-quota` reproduces the
 *      rejected rule for the record; --reroll-quota is refused outside --simulate.
 *   5. Letters: a balanced deck (N*4/4 keys per letter) from rng(seed + 7919), distinct from
 *      the selection stream; distractor order shuffled from the same stream.
 *   6. Write <prefix>.batch.json (served world only: id, domain, subskill, difficulty,
 *      topic_tag, passage, prompt, choices, correct_answer, explanation; no world index,
 *      no unserved world) and <prefix>.selection.json (worlds sha, base, seed,
 *      world index per item). Graders, solvers and readers never see the
 *      selection or worlds files.
 *   NO post-selection edits. A served world that fails a gate drops its item WHOLE; the
 *   item is never re-served from another of its worlds (that would be selection by quality).
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { rng, shuffleWith } from './seeded-shuffle.mjs'
const args = process.argv.slice(2)
const argOf = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null }
const D = 'scripts/study-bank'
const W = argOf('--work') ?? `${D}/sat-cs-wic-v25-work`
const PRE = argOf('--out') ?? `${D}/sat-cs-wic-v25`
const PER = Number(argOf('--per-author') ?? 8)
const BASE = Number(argOf('--base-seed') ?? 20262590)
const OUTS = { worlds: `${PRE}.worlds.json`, batch: `${PRE}.batch.json`, sel: `${PRE}.selection.json` }
if (!args.includes('--simulate') && Object.values(OUTS).some(existsSync) && !args.includes('--force-rewrite-before-commit')) { console.error(`REFUSING: ${Object.values(OUTS).filter(existsSync).join(', ')} exists (frozen)`); process.exit(2) }
const sc = ['--final', '--per-author', String(PER), '--work', W]
if (argOf('--live')) sc.push('--live', argOf('--live'))
try { execFileSync('node', [`${D}/wic25-selfcheck.mjs`, ...sc], { stdio: 'inherit' }) } catch { console.error('REFUSING: wic25-selfcheck --final not green'); process.exit(2) }

const items = []
for (const a of ['A', 'B', 'C', 'D']) {
  const dir = `${W}/${a}`
  const fs = existsSync(dir) ? readdirSync(dir).filter(f => /^WIC25[A-D]-\d\d\.json$/.test(f)).sort() : []
  if (fs.length !== PER) { console.error(`REFUSING: author ${a} has ${fs.length} files, not ${PER}`); process.exit(2) }
  for (const f of fs) items.push(JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')))
}
items.sort((x, y) => x.id.localeCompare(y.id))
if (!items.length || items.some(it => !Array.isArray(it.worlds) || it.worlds.length !== 4)) { console.error('REFUSING: every item needs four worlds'); process.exit(2) }
const worldsText = JSON.stringify(items, null, 2) + '\n'
const worldsSha = createHash('sha256').update(worldsText).digest('hex')

const n = items.length, cap = Math.floor(n * 0.35)  // reported against, never selected on
const quota = picks => {
  const keys = picks.map((k, i) => items[i].worlds[k].key)
  const c = {
    rarest: keys.filter((key, i) => items[i].rarity_order.at(-1) === key).length,
    commonest: keys.filter((key, i) => items[i].rarity_order[0] === key).length,
    longest: keys.filter((key, i) => items[i].choices.every(c => c === key || c.length < key.length)).length,
    shortest: keys.filter((key, i) => items[i].choices.every(c => c === key || c.length > key.length)).length,
  }
  return { c, ok: Object.values(c).every(x => x <= cap) }
}
const REROLL = args.includes('--reroll-quota')
if (REROLL && !args.includes('--simulate')) { console.error('REFUSING: --reroll-quota is a simulate-only diagnostic of the rejected rule'); process.exit(2) }
const select = base => {
  const seed0 = (base + parseInt(worldsSha.slice(0, 8), 16)) >>> 0
  let seed = seed0, rolls = 0
  const log = []
  for (; rolls < (REROLL ? 50 : 1); rolls++) {
    const rand = rng(seed)
    const p = items.map(() => Math.floor(rand() * 4))
    const q = quota(p)
    if (q.ok || !REROLL) return { seed0, seed, rolls, log, picks: p, q }
    log.push(`re-roll ${rolls + 1}: seed ${seed} broke a quota (cap ${cap}/${n}) ${JSON.stringify(q.c)}`)
    seed = (seed + 1) >>> 0
  }
  return { seed0, seed, rolls, log, picks: null }
}
/* --simulate K (diagnostic, writes nothing): run the selection for K consecutive base seeds
 * on this frozen text and report how often each world index and each declared rarity rank is
 * served. Both should be flat; the re-roll rule must not tilt them. */
const sim = Number(argOf('--simulate') ?? 0)
if (sim > 0) {
  const wi = [0, 0, 0, 0], rr = [0, 0, 0, 0]; let rolled = 0, failed = 0
  for (let b = 0; b < sim; b++) { const r = select(BASE + b); if (!r.picks) { failed++; continue } if (r.rolls) rolled++
    r.picks.forEach((k, i) => { wi[k]++; rr[items[i].rarity_order.indexOf(items[i].worlds[k].key)]++ }) }
  const chi = a => { const t = a.reduce((x, y) => x + y, 0), e = t / 4; return a.reduce((x, y) => x + (y - e) ** 2 / e, 0) }
  console.log(`simulate ${sim} base seeds on ${n} items: unsatisfiable ${failed}, needed a re-roll ${rolled}`)
  console.log(`  served world index 0/1/2/3 = ${wi.join('/')}  chi2 ${chi(wi).toFixed(2)} (3 df, p=.05 crit 7.81)`)
  console.log(`  served key rarity rank 1..4 = ${rr.join('/')}  chi2 ${chi(rr).toFixed(2)}`)
  process.exit(0)
}
const { seed0, seed, picks, q } = select(BASE)
writeFileSync(OUTS.worlds, worldsText)

const L = ['A', 'B', 'C', 'D']
const rand = rng((seed + 7919) >>> 0)
const deck = shuffleWith(items.map((_, i) => L[i % 4]), rand)
const batch = items.map((it, i) => {
  const w = it.worlds[picks[i]]
  const want = L.indexOf(deck[i])
  const rest = shuffleWith(it.choices.filter(c => c !== w.key), rand)
  const ch = []; let r = 0
  for (let j = 0; j < 4; j++) ch.push(j === want ? w.key : rest[r++])
  return { id: it.id, domain: it.domain, subskill: it.subskill, difficulty: it.difficulty, topic_tag: it.topic_tag, passage: w.passage, prompt: it.prompt, choices: ch, correct_answer: w.key, explanation: w.explanation }
})
writeFileSync(OUTS.batch, JSON.stringify(batch, null, 2) + '\n')
const batchSha = createHash('sha256').update(readFileSync(OUTS.batch)).digest('hex')
writeFileSync(OUTS.sel, JSON.stringify({ worlds_sha256: worldsSha, base_seed: BASE, seed: seed0, batch_sha256: batchSha, world: Object.fromEntries(items.map((it, i) => [it.id, picks[i]])) }, null, 1) + '\n')
const wd = [0, 1, 2, 3].map(k => picks.filter(x => x === k).length)
const ld = {}; for (const it of batch) { const l = L[it.choices.indexOf(it.correct_answer)]; ld[l] = (ld[l] ?? 0) + 1 }
console.log(`frozen ${n} items x 4 worlds -> ${OUTS.worlds}  sha256 ${worldsSha}`)
console.log(`selection: base ${BASE}, seed ${seed0} = base + sha[0:8] (no re-roll); served world index 0/1/2/3 = ${wd.join('/')};\n  realised key rarest/commonest/longest/shortest ${JSON.stringify(q.c)} (reported; stage-5 bar is 35% = ${cap} on the kept set)`)
console.log(`served -> ${OUTS.batch}  keys ${JSON.stringify(ld)}  sha256 ${batchSha}`)
console.log(`selection log -> ${OUTS.sel} (never shown to graders, solvers or readers)`)
