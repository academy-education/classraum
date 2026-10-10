#!/usr/bin/env node
/**
 * mf30-kw.mjs <dump-dir> "<query>" [--full] — the HAND keyword duplicate search for
 * sat-math-v30-full (PREREG-MF30-2026-10-10.md; algf27-kw.mjs over the widened prior set). Query: terms separated by '&' must all match (case-insensitive
 * regex each); within a term, '|' is alternation. Searches live-maths.json (every family)
 * and prior-math.json. Prints every hit (up to 60; --full = no limit, untruncated) with
 * id, family/cohort or file, prompt, options and key, so a hit is READ, not judged from a
 * cut. Exits 2 on a missing dump or a dump under 3,000 live rows.
 */
import { readFileSync } from 'node:fs'
const [dir, q] = process.argv.slice(2)
const full = process.argv.includes('--full')
let live, prior
try { live = JSON.parse(readFileSync(`${dir}/live-maths.json`, 'utf8')); prior = JSON.parse(readFileSync(`${dir}/prior-math.json`, 'utf8')) } catch { console.error('REFUSING: dump missing; run mf30-dump.mjs'); process.exit(2) }
if (!q || live.length < 3000) { console.error(`REFUSING: ${!q ? 'no query' : 'dump holds ' + live.length + ' rows'}`); process.exit(2) }
const terms = q.split('&').map(t => new RegExp(t.trim(), 'i'))
const hit = r => { const s = `${r.passage ?? ''} ${r.prompt} ${(r.choices ?? []).join(' ')}`; return terms.every(t => t.test(s)) }
const H = [...live.filter(hit).map(r => ({ src: `live ${r.family}/${r.cohort} ${r.domain} ${r.difficulty}`, ...r })), ...prior.filter(hit).map(r => ({ src: `prior ${r.file}`, ...r }))]
console.log(`query "${q}": ${H.length} hits over ${live.length} live + ${prior.length} prior`)
for (const r of (full ? H : H.slice(0, 60))) console.log(`--- ${String(r.id).slice(0, 12)} [${r.src}]\n${full ? r.prompt : String(r.prompt).slice(0, 700)}\n   options ${JSON.stringify(r.choices)} key ${r.correct_answer}`)
if (!full && H.length > 60) console.log(`(${H.length - 60} more; --full prints all)`)
