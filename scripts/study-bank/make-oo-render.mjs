#!/usr/bin/env node
/**
 * make-oo-render.mjs <batch.json> [--tag NAME]
 *
 * Build the OPTIONS-ONLY attack render for a batch: every item reduced to its
 * option strings, with the stem, any passage, any figure and every authored
 * field removed. This is the gate stage that decides a batch (CLAUDE.md: "the
 * attack is the gate, the structural checks are pre-flight").
 *
 * Written as a committed script because every prior version of this lived in a
 * session scratchpad and was rebuilt by hand each time -- which is how a blind
 * file once got rebuilt IN PLACE while a solver was reading it, and how a
 * render once shipped carrying `distractor_steps` and leaked 24 keys.
 *
 * THREE THINGS IT DOES THAT A HAND-ROLLED VERSION KEEPS FORGETTING:
 *
 * 1. KEYS DEALT FLAT. The key is moved to a slot chosen round-robin, so the
 *    best fixed-letter score equals chance. A free shuffle once produced a
 *    56.3% control, at which a solver's score means nothing. The realised
 *    control is COMPUTED from the deal and printed -- never assumed.
 * 2. WIDTH IS READ, NOT ASSUMED. A five-choice batch scored against a 25.0%
 *    literal is five free points, always flattering. Mixed widths are refused
 *    outright: one control cannot describe two populations.
 * 3. NOTHING BUT OPTIONS CROSSES. Only the option strings are emitted. The
 *    blind file carries no id that maps back to the batch -- ids are renumbered
 *    L01.. so a solver cannot look the item up, and the mapping lives only in
 *    the key file.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'

const args = process.argv.slice(2)
const path = args.find(a => !a.startsWith('--'))
if (!path) { console.error('usage: make-oo-render.mjs <batch.json> [--tag NAME]'); process.exit(2) }
if (!existsSync(path)) { console.error(`REFUSING: ${path} does not exist.`); process.exit(2) }
const ti = args.indexOf('--tag')
const tag = (ti >= 0 ? args[ti + 1] : undefined) ?? path.replace(/^.*\//, '').replace(/\.batch\.json$/, '')

const batch = JSON.parse(readFileSync(path, 'utf8'))
if (!Array.isArray(batch) || !batch.length) { console.error(`REFUSING: ${path} holds no items.`); process.exit(2) }

const widths = [...new Set(batch.map(it => (it.choices ?? []).length))]
if (widths.length !== 1) { console.error(`REFUSING: mixed option widths ${widths.join('/')} — one control cannot describe two populations.`); process.exit(2) }
const W = widths[0]
if (W < 2 || W > 8) { console.error(`REFUSING: option width ${W} is not a real item.`); process.exit(2) }
const SLOT = ['A','B','C','D','E','F','G','H'].slice(0, W)

let seed = 20260912 >>> 0
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32)
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }

const blind = {}, key = {}
batch.forEach((it, i) => {
  const ch = (it.choices ?? []).map(String)
  const ci = ch.findIndex(c => c === String(it.correct_answer))
  if (ci < 0) { console.error(`REFUSING: ${it.id} — correct_answer is not among its choices.`); process.exit(2) }
  const want = SLOT[i % W]                      // round-robin => flat deal
  const rest = shuffle(ch.filter((_, j) => j !== ci))
  let r = 0
  const out = SLOT.map(sl => (sl === want ? ch[ci] : rest[r++]))
  const bid = `L${String(i + 1).padStart(2, '0')}`
  blind[bid] = { options: Object.fromEntries(SLOT.map((sl, j) => [sl, out[j]])) }
  key[bid] = { letter: want, localId: it.id, domain: it.domain ?? null, difficulty: it.difficulty ?? null }
})

const dealt = {}; for (const k of Object.values(key)) dealt[k.letter] = (dealt[k.letter] ?? 0) + 1
const realised = 100 * Math.max(...Object.values(dealt)) / batch.length
const chance = 100 / W

const bf = `scripts/study-bank/${tag}-oo.blind.json`
const kf = `scripts/study-bank/${tag}-oo.key.json`
writeFileSync(bf, JSON.stringify(blind, null, 1) + '\n')
writeFileSync(kf, JSON.stringify(key, null, 1) + '\n')

console.log(`${tag}: ${batch.length} items, ${W}-choice`)
console.log(`  keys dealt ${JSON.stringify(dealt)}`)
console.log(`  chance ${chance.toFixed(1)}%   best-fixed-letter (the REAL control) ${realised.toFixed(1)}%`)
if (realised - chance > 2) console.log(`  NOTE: deal is uneven — score against ${realised.toFixed(1)}%, not ${chance.toFixed(1)}%.`)
console.log(`  blind sha ${createHash('sha256').update(readFileSync(bf)).digest('hex').slice(0,16)}`)
console.log(`  wrote ${bf}`)
console.log(`  wrote ${kf}`)
