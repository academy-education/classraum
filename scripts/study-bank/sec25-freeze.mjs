#!/usr/bin/env node
/**
 * sec25-freeze.mjs [--work <dir>] [--out <batch.json>] [--probe-out <prefix>] [--force-rewrite-before-commit]
 *
 * The freeze of PREREG-SEC25-2026-10-23.md (Pipeline step 4). It merges the four authors'
 * items into the frozen batch and prints its sha256, and it REFUSES (exit 2) unless the
 * pre-freeze steering probe's one revision round is complete:
 *   - each of <work>/{A,B,C,D}/items.json holds exactly ids SEC25<X>-01..08;
 *   - `node sec25-sprobe.mjs verify` (same --work / --probe-out) exits 0, i.e. every
 *     must-revise item actually changed, no key letter moved, nothing vanished or appeared;
 *   - the output file does not exist yet (--force-rewrite-before-commit overrides, for a
 *     freeze that was never committed).
 * The author-only fields `template` (and any `declarations`) are stripped. Nothing else is
 * touched: choice order, keys and text go through byte-for-byte.
 * Exit 0 written; 2 refused.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
const argOf = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null }
const die = m => { console.error(`REFUSING: ${m}`); process.exit(2) }
for (let i = 0; i < args.length; i++) {
  if (['--work', '--out', '--probe-out'].includes(args[i])) { if (!args[i + 1]) die(`${args[i]} needs a value`); i++ }
  else if (args[i] !== '--force-rewrite-before-commit') die(`unknown argument ${args[i]}`)
}
const D = 'scripts/study-bank'
const W = argOf('--work') ?? `${D}/sat-sec-v25-work`
const OUT = argOf('--out') ?? `${D}/sat-sec-hard-v25.batch.json`
const PRE = argOf('--probe-out')
if (existsSync(OUT) && !args.includes('--force-rewrite-before-commit')) die(`${OUT} exists (a frozen batch is never rewritten; --force-rewrite-before-commit only if it was never committed)`)
const items = []
for (const a of ['A', 'B', 'C', 'D']) {
  const f = `${W}/${a}/items.json`
  if (!existsSync(f)) die(`${f} missing`)
  let arr; try { arr = JSON.parse(readFileSync(f, 'utf8')) } catch (e) { die(`${f}: ${e.message}`) }
  if (!Array.isArray(arr) || !arr.length) die(`${f} holds no items`)
  const want = [1, 2, 3, 4, 5, 6, 7, 8].map(i => `SEC25${a}-0${i}`)
  const got = arr.map(it => it?.id).sort()
  if (got.length !== 8 || got.some((x, i) => x !== want[i])) die(`${f} must hold exactly ${want[0]}..${want[7]} (got ${got.join(' ')})`)
  for (const it of arr) if (!Array.isArray(it.choices) || it.choices.length !== 4 || !it.choices.includes(it.correct_answer)) die(`${it.id}: not a four-choice item whose key is among its choices`)
  items.push(...arr.slice().sort((x, y) => (x.id < y.id ? -1 : 1)))
}
const here = dirname(fileURLToPath(import.meta.url))
const v = spawnSync(process.execPath, [join(here, 'sec25-sprobe.mjs'), 'verify', '--work', W, ...(PRE ? ['--out', PRE] : [])], { encoding: 'utf8' })
process.stdout.write(v.stdout ?? ''); process.stderr.write(v.stderr ?? '')
if (v.status !== 0) die(`sec25-sprobe.mjs verify exited ${v.status}: the probe's revision round is not complete, so nothing is frozen`)
const batch = items.map(({ template, declarations, ...rest }) => rest)
const text = JSON.stringify(batch, null, 1) + '\n'
writeFileSync(OUT, text)
console.log(`frozen ${batch.length} items -> ${OUT}\nsha256 ${createHash('sha256').update(text).digest('hex')}`)
