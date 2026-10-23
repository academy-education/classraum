#!/usr/bin/env node
/**
 * alg32-grade-stage.mjs <setup|snap|collect> <d|e|f> — the grader folder protocol for sat-math-v32-alg
 * (PREREG-MATH-ALG32-2026-10-23.md; mf30-grade-stage.mjs with ONE render of all 24 items instead of
 * thirds, folders under PRIV outside the repo), built from A90 process lesson 2: the first algf27
 * F-h2 grader edited its stage-1 file after opening the key, and E-h2 ran a same-named scratch
 * script of F's. Renders: `make-grade-render.mjs sat-math-v32-alg.batch.json --out alg32` writes
 * alg32.grade.json (cold) and alg32.gradekey.json; the keyed batch is the frozen file itself. So here:
 *
 *   setup    makes the grader's PRIVATE folder <PRIV>/grade/<g>/ holding ONLY the cold render
 *            (grade.json). The keyed files are NOT in the folder, so stage 2 cannot be opened early
 *            from it.
 *   snap     after the grader's run ends with <PRIV>/grade/<g>/stage1.json on disk: refuses unless
 *            it parses, carries a row for every id in the render and the render's sha; then copies it
 *            to alg32.ws-<g>.stage1.json, chmods BOTH copies 444, records its sha256 and the time
 *            in alg32.coldshas.json, and only THEN copies the keyed files (gradekey.json,
 *            keyed.batch.json) into the folder and records the release time.
 *   collect  copies <PRIV>/grade/<g>/stage2.json to alg32.ws-<g>.json (refuses if missing).
 *
 * alg32-coldcheck.mjs then proves, per grader: the grader's own stage1.json still hashes to the
 * snapshot; every stage-2 row carries every snapshot field unchanged; the snapshot predates the release.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, chmodSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { PRIV, COHORT } from './alg32-slots.mjs'
const D = new URL('.', import.meta.url).pathname
const [cmd, g] = process.argv.slice(2)
if (!['setup', 'snap', 'collect'].includes(cmd) || !/^[def]$/.test(g ?? '')) { console.error('usage: alg32-grade-stage.mjs <setup|snap|collect> <d|e|f>'); process.exit(2) }
const F = `${PRIV}/grade/${g}`
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex')
const CS = `${D}alg32.coldshas.json`
const cs = existsSync(CS) ? JSON.parse(readFileSync(CS, 'utf8')) : {}
const render = `${D}alg32.grade.json`
if (!existsSync(render)) { console.error(`REFUSING: ${render} missing (make-grade-render.mjs ${COHORT}.batch.json --out alg32)`); process.exit(2) }
if (cmd === 'snap' && !existsSync(`${D}${COHORT}.batch.json`)) { console.error(`REFUSING: ${COHORT}.batch.json (the keyed file) missing`); process.exit(2) }
if (cmd === 'setup') {
  if (existsSync(F) && readdirSync(F).length) { console.error(`REFUSING: ${F} already exists and is not empty`); process.exit(2) }
  mkdirSync(F, { recursive: true }); copyFileSync(render, `${F}/grade.json`)
  console.log(`${F}/ holds grade.json only (render sha ${sha(render).slice(0, 16)})`)
} else if (cmd === 'snap') {
  const p = `${F}/stage1.json`
  if (cs[g]) { console.error(`REFUSING: ${g} already snapped at ${cs[g].at}`); process.exit(2) }
  let s1; try { s1 = JSON.parse(readFileSync(p, 'utf8')) } catch (e) { console.error(`REFUSING: ${p}: ${e.message}`); process.exit(2) }
  const r = JSON.parse(readFileSync(render, 'utf8'))
  const need = Array.isArray(r) ? r.map(x => x.id).filter(Boolean) : []
  const miss = need.filter(id => !s1[id])
  if (!need.length) { console.error('REFUSING: could not read the render ids'); process.exit(2) }
  if (miss.length) { console.error(`REFUSING: stage1 lacks ${miss.length} of ${need.length} rows (${miss.join(' ')})`); process.exit(2) }
  if (String(s1._render_sha ?? '').slice(0, 16) !== sha(render).slice(0, 16)) { console.error(`REFUSING: _render_sha ${s1._render_sha} != ${sha(render).slice(0, 16)}`); process.exit(2) }
  const snap = `${D}alg32.ws-${g}.stage1.json`
  copyFileSync(p, snap); chmodSync(snap, 0o444); chmodSync(p, 0o444)
  const at = new Date().toISOString(); const s = sha(p)
  copyFileSync(`${D}alg32.gradekey.json`, `${F}/gradekey.json`); copyFileSync(`${D}${COHORT}.batch.json`, `${F}/keyed.batch.json`)
  cs[g] = { sha: s, rows: need.length, at, released: new Date().toISOString() }
  writeFileSync(CS, JSON.stringify(cs, null, 1) + '\n')
  console.log(`snapped ${g}: ${need.length} cold rows, sha ${s.slice(0, 16)}, read-only; keyed files released into ${F}/`)
} else {
  const p = `${F}/stage2.json`
  if (!existsSync(p)) { console.error(`REFUSING: ${p} missing`); process.exit(2) }
  try { JSON.parse(readFileSync(p, 'utf8')) } catch (e) { console.error(`REFUSING: ${p}: ${e.message}`); process.exit(2) }
  copyFileSync(p, `${D}alg32.ws-${g}.json`)
  console.log(`collected ${g} -> alg32.ws-${g}.json`)
}
