#!/usr/bin/env node
/**
 * mf30-kept.mjs [--write] — stage 4 of sat-math-v30-full (PREREG-MF30-2026-10-10.md): the kept-set
 * extremity gate, run SEPARATELY per domain on sat-math-v30-full.gate-{alg,adv,geo,psda}.batch.json (written by
 * mf30-verdict.mjs --write). A domain whose kept set fails the gate - or has fewer than MIN_N (10)
 * scorable items, which is no measurement and is NOT a pass - is HELD whole (nothing in it inserted,
 * nothing dropped, moved or edited to pass). With --write, the passing domains' items go to
 * sat-math-v30-full.kept.batch.json (the one insert file, author-only fields stripped by allow-list) and mf30.qc.json; held domains go to
 * sat-math-v30-full.held-<tag>.batch.json. Exit 1 if any domain is held, 2 on unreadable input.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { keyExtremityVerdict } from './key-extremity-gate.mjs'
import { DOMAINS, DTAG } from './mf30-slots.mjs'
const D = new URL('.', import.meta.url).pathname
const V = JSON.parse(readFileSync(`${D}mf30.verdict.json`, 'utf8'))
const kept = [], qc = {}; let held = 0
for (const [dom, tag] of DOMAINS.map(d => [d, DTAG[d]])) {
  let items; try { items = JSON.parse(readFileSync(`${D}sat-math-v30-full.gate-${tag}.batch.json`, 'utf8')) } catch (e) { console.error(`REFUSING: gate-${tag}: ${e.message}`); process.exit(2) }
  if (items.some(i => i.domain !== dom)) { console.error(`REFUSING: gate-${tag} holds a non-${dom} item`); process.exit(2) }
  const v = keyExtremityVerdict(items)
  const pass = v.status === 'pass'
  console.log(`${dom}: ${items.length} kept -> ${v.status.toUpperCase()} (${v.reason})`)
  if (pass) { kept.push(...items); for (const it of items) qc[it.id] = { difficulty: V[it.id].difficulty, key_votes: V[it.id].key_votes, n_struck_median: V[it.id].n_struck_median } }
  else { held++; if (process.argv.includes('--write')) writeFileSync(`${D}sat-math-v30-full.held-${tag}.batch.json`, JSON.stringify(items.map(it => ({ ...it, _held: `kept-set extremity gate ${v.status}: ${v.reason}` })), null, 1) + '\n') }
}
if (process.argv.includes('--write')) {
  // A91 process note 4: the inserter refused author-only fields ("question above" in self_audit), so the
  // insert file carries only mf30-strip.mjs's allow-list; the gate files keep the full frozen items.
  const KEEP = ['id', 'domain', 'subskill', 'difficulty', 'prompt', 'graphic', 'choices', 'correct_answer', 'explanation', 'solve', 'distractor_solve']
  writeFileSync(`${D}sat-math-v30-full.kept.batch.json`, JSON.stringify(kept.map(x => Object.fromEntries(KEEP.filter(k => k in x).map(k => [k, x[k]]))), null, 1) + '\n')
  writeFileSync(`${D}mf30.qc.json`, JSON.stringify(qc, null, 1) + '\n')
  console.log(`written: kept ${kept.length} (insert file), qc ${Object.keys(qc).length}${held ? `, ${held} domain(s) held` : ''}`)
}
process.exit(held ? 1 : 0)
