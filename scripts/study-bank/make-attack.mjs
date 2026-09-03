#!/usr/bin/env node
// Build a NO-PASSAGE attack file from authored batch files (pre-insert).
//   make-attack.mjs <tag> <batch.json...>
// Writes <tag>.blind.json (id, question, options A-D; NO transcript) and
// <tag>.key.json (letter + localId + prompt). Items are shuffled and
// renumbered, choices dealt by a seeded shuffle, so the solver sees neither
// authored order nor authored slot. Same shape as crv7-pilot.blind.json.
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
// SPLIT=3 deals items so that no two items sharing a passageGroupId land in
// the same file (<tag>-f1..fN); siblings answer each other otherwise
// (ACT-ATTACK-RESULT.md: interleaved 90% -> split 76%). Solve each file with a
// DIFFERENT solver.
const SPLIT = Number(process.env.SPLIT ?? 0)
const [tag, ...files] = process.argv.slice(2)
if (!tag || !files.length) { console.error('usage: [SPLIT=n] make-attack.mjs <tag> <batch.json...>'); process.exit(1) }
const rnd = s => { let h = parseInt(createHash('md5').update(s).digest('hex').slice(0, 8), 16); return () => (h = (h * 1664525 + 1013904223) >>> 0) / 2 ** 32 }
const shuffle = (a, r) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }
const items = files.flatMap(f => JSON.parse(readFileSync(f, 'utf8')))
if (SPLIT > 1) {
  const groups = {}
  for (const it of items) (groups[it.passageGroupId ?? it.passage_id ?? it.id] ??= []).push(it)
  const parts = Array.from({ length: SPLIT }, () => [])
  const gr = rnd(tag + ':split')
  for (const g of Object.values(groups)) {
    if (g.length > SPLIT) throw new Error(`group of ${g.length} cannot split ${SPLIT} ways`)
    const slots = shuffle([...Array(SPLIT).keys()], gr)
    g.forEach((it, k) => parts[slots[k]].push(it))
  }
  const { writeFileSync: w } = await import('node:fs')
  parts.forEach((p, i) => w(`scripts/study-bank/${tag}-f${i + 1}.part.json`, JSON.stringify(p)))
  const { execFileSync } = await import('node:child_process')
  parts.forEach((_, i) => execFileSync('node', ['scripts/study-bank/make-attack.mjs', `${tag}-f${i + 1}`, `scripts/study-bank/${tag}-f${i + 1}.part.json`], { stdio: 'inherit', env: { ...process.env, SPLIT: '0' } }))
  process.exit(0)
}
const order = shuffle(items, rnd(tag + ':order'))
const blind = [], key = {}
// Deal key slots FLAT (10/10/10/10 for 40) so a constant-letter solver scores
// exactly chance; the other three choices fall randomly around the key.
const deck = shuffle(Array.from({ length: order.length }, (_, i) => 'ABCD'[i % 4]), rnd(tag + ':deck'))
order.forEach((it, i) => {
  const id = String(i + 1)
  const letters = 'ABCD'
  const r = rnd(tag + ':' + it.id)
  const rest = shuffle(it.choices.filter(c => c !== it.correct_answer), r)
  const slot = letters.indexOf(deck[i])
  const choices = []; let k = 0
  for (let j = 0; j < 4; j++) choices.push(j === slot ? it.correct_answer : rest[k++])
  blind.push({ id, question: it.prompt.replace(/^\s*\[[^\]]*\]\s*/, ''), options: Object.fromEntries(choices.map((c, k) => [letters[k], c])) })
  key[id] = { letter: letters[choices.indexOf(it.correct_answer)], localId: it.id, group: it.passageGroupId ?? it.passage_id ?? null }
})
writeFileSync(`scripts/study-bank/${tag}.blind.json`, JSON.stringify(blind, null, 2))
writeFileSync(`scripts/study-bank/${tag}.key.json`, JSON.stringify(key, null, 2))
const spread = {}; for (const k of Object.values(key)) spread[k.letter] = (spread[k.letter] ?? 0) + 1
console.log(`${tag}: ${blind.length} items, key slots`, spread)
