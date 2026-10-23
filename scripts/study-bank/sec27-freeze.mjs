#!/usr/bin/env node
/**
 * sec27-freeze.mjs [--work <dir>] [--out <batch.json>] [--probe-out <prefix>] [--slots <SLOTS.json>] [--force-rewrite-before-commit]
 *
 * The freeze of PREREG-SEC27-2026-10-23.md (Pipeline step 4). It merges the four authors'
 * items into the frozen batch and prints its sha256, and it REFUSES (exit 2) unless the
 * pre-freeze steering probe's one revision round is complete:
 *   - each of <work>/{A,B,C,D}/items.json holds exactly ids SEC27<X>-01..10;
 *   - `node sec27-sprobe.mjs verify` (same --work / --probe-out) exits 0, i.e. every
 *     must-revise item actually changed, no key letter moved, nothing vanished or appeared;
 *   - NEW (v26) `node sec27-tellsim.mjs --work <work>` exits 0: the cross-item tell check passes on
 *     the option structure the authors actually built (SEC25: the table's tells reached the frozen
 *     file and the template cover held 20 of 29);
 *   - the output file does not exist yet (--force-rewrite-before-commit overrides, for a
 *     freeze that was never committed).
 * The author-only fields `template` (and any `declarations`) are stripped. Nothing else is
 * touched: choice order, keys and text go through byte-for-byte.
 * COPIED from sec26-freeze.mjs (sec25's + the v26 tell gate); NEW (v27): the SEMANTIC-TEMPLATE gate:
 *   `node sec27-semcheck.mjs --work <work>` must exit 0 as well (SEC26: the tellsim passed every bar
 *   while the readers named five semantic templates it could not see).
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
  if (['--work', '--out', '--probe-out', '--slots'].includes(args[i])) { if (!args[i + 1]) die(`${args[i]} needs a value`); i++ }
  else if (args[i] !== '--force-rewrite-before-commit') die(`unknown argument ${args[i]}`)
}
const D = 'scripts/study-bank'
const W = argOf('--work') ?? `${D}/sat-sec-v27-work`
const OUT = argOf('--out') ?? `${D}/sat-sec-hard-v27.batch.json`
const PRE = argOf('--probe-out')
if (existsSync(OUT) && !args.includes('--force-rewrite-before-commit')) die(`${OUT} exists (a frozen batch is never rewritten; --force-rewrite-before-commit only if it was never committed)`)
const items = []
for (const a of ['A', 'B', 'C', 'D']) {
  const f = `${W}/${a}/items.json`
  if (!existsSync(f)) die(`${f} missing`)
  let arr; try { arr = JSON.parse(readFileSync(f, 'utf8')) } catch (e) { die(`${f}: ${e.message}`) }
  if (!Array.isArray(arr) || !arr.length) die(`${f} holds no items`)
  const want = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => `SEC27${a}-${String(i).padStart(2, '0')}`)
  const got = arr.map(it => it?.id).sort()
  if (got.length !== 10 || got.some((x, i) => x !== want[i])) die(`${f} must hold exactly ${want[0]}..${want[9]} (got ${got.join(' ')})`)
  for (const it of arr) if (!Array.isArray(it.choices) || it.choices.length !== 4 || !it.choices.includes(it.correct_answer)) die(`${it.id}: not a four-choice item whose key is among its choices`)
  items.push(...arr.slice().sort((x, y) => (x.id < y.id ? -1 : 1)))
}
const here = dirname(fileURLToPath(import.meta.url))
const v = spawnSync(process.execPath, [join(here, 'sec27-sprobe.mjs'), 'verify', '--work', W, ...(PRE ? ['--out', PRE] : [])], { encoding: 'utf8' })
process.stdout.write(v.stdout ?? ''); process.stderr.write(v.stderr ?? '')
if (v.status !== 0) die(`sec27-sprobe.mjs verify exited ${v.status}: the probe's revision round is not complete, so nothing is frozen`)
// NEW (v26): the cross-item tell check on what the authors built
const tsArgs = [join(here, 'sec27-tellsim.mjs'), '--work', W, ...(argOf('--slots') ? ['--slots', argOf('--slots')] : [])]
const ts = spawnSync(process.execPath, tsArgs, { encoding: 'utf8' })
process.stdout.write((ts.stdout ?? '').split('\n').filter(l => /MISSED|RESULT|REFUSING/.test(l)).join('\n') + '\n'); process.stderr.write(ts.stderr ?? '')
if (ts.status !== 0) die(`sec27-tellsim.mjs --work exited ${ts.status}: a cross-item tell bar is missed on the authored files, so nothing is frozen`)
// NEW (v27): the semantic-template check on the authors' declarations and text
const scArgs = [join(here, 'sec27-semcheck.mjs'), '--work', W, ...(argOf('--slots') ? ['--slots', argOf('--slots')] : [])]
const sc = spawnSync(process.execPath, scArgs, { encoding: 'utf8' })
process.stdout.write((sc.stdout ?? '').split('\n').filter(l => /MISSED|RESULT|REFUSING/.test(l)).join('\n') + '\n'); process.stderr.write(sc.stderr ?? '')
if (sc.status !== 0) die(`sec27-semcheck.mjs --work exited ${sc.status}: a semantic-template bar is missed on the authored files, so nothing is frozen`)
const batch = items.map(({ template, declarations, ...rest }) => rest)
const text = JSON.stringify(batch, null, 1) + '\n'
writeFileSync(OUT, text)
console.log(`frozen ${batch.length} items -> ${OUT}\nsha256 ${createHash('sha256').update(text).digest('hex')}`)
