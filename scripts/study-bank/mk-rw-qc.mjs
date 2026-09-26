#!/usr/bin/env node
/**
 * mk-rw-qc.mjs <tag> <kept.batch.json> — build the qc.json bank-helper.mjs
 * reads for an R&W insert, from three INDEPENDENT with-source grades.
 *
 *   key_votes          graders whose cold answer matched the key (0-3)
 *   difficulty         panel MEDIAN, never the author's label - every panel
 *                      this month has demoted the author, and the max would let
 *                      one generous grader set the band
 *   distractor_quality panel median on weak < plausible < strong
 *   passage_needed     true unless a majority marked a resolving word after
 *                      the blank (SEC is exempt from the passage lens in
 *                      accepts.mjs anyway; recorded for the ledger)
 *
 * accepts.mjs then applies its own rule: Conventions needs key_votes 3/3.
 * This script REFUSES on a partial panel and on an id mismatch.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
const D = 'scripts/study-bank'
const [tag, keptPath] = process.argv.slice(2)
if (!tag || !keptPath) { console.error('usage: mk-rw-qc.mjs <tag> <kept.batch.json>'); process.exit(2) }
const files = ['d','e','f'].map(n => `${D}/${tag}.ws-${n}.json`)
const missing = files.filter(f => !existsSync(f))
if (missing.length) { console.error(`REFUSING: missing grader file(s): ${missing.join(', ')}`); process.exit(2) }
/* GRADER FILES COME IN TWO SHAPES AND THE SCRIPT SAYS WHICH IT GOT. Two of the
 * three SEC graders wrapped their rows under `.items` beside a `summary` block;
 * one wrote a flat id-keyed object. Read flat, this script saw five top-level
 * keys and refused - correctly, but for the wrong reason. Unwrap EXPLICITLY and
 * print it, so a wrapper is never scored as five items. */
const unwrap = (g, name) => {
  if (g && g.items && typeof g.items === 'object' && !Array.isArray(g.items)) { console.log(`note: ${name} wrapped its rows under .items; unwrapped (${Object.keys(g.items).length} rows)`); return g.items }
  /* A third shape, wic7 grader D: `.items` is an ARRAY of rows each carrying its
   * own `id`. Index it by that id and say so; a wrapper must never be scored as
   * four items. */
  if (g && Array.isArray(g.items) && g.items.every(r => r && r.id)) { console.log(`note: ${name} wrote .items as an array; indexed by row id (${g.items.length} rows)`); return Object.fromEntries(g.items.map(r => [r.id, r])) }
  return g
}
const G = files.map(f => unwrap(JSON.parse(readFileSync(f,'utf8')), f.replace(/^.*\//, '')))
const kept = JSON.parse(readFileSync(keptPath,'utf8'))
const RANK = { easy:0, medium:1, hard:2 }, DNAME = ['easy','medium','hard']
const QR = { weak:0, plausible:1, strong:2 }, QNAME = ['weak','plausible','strong']
const med = xs => xs.slice().sort((a,b)=>a-b)[1]
const qc = {}, hist = {}
for (const it of kept) {
  const rows = G.map(g => g[it.id])
  if (rows.some(r => !r)) { console.error(`REFUSING: ${it.id} missing from a grader file`); process.exit(2) }
  const key_votes = rows.filter(r => r.key_ok === true).length
  const difficulty = DNAME[med(rows.map(r => RANK[r.difficulty] ?? 1))]
  const distractor_quality = QNAME[med(rows.map(r => QR[r.distractor_quality] ?? 1))]
  const resolving = rows.filter(r => r.resolving_word_after_blank && String(r.resolving_word_after_blank).toLowerCase() !== 'null').length
  qc[it.id] = { key_votes, difficulty, distractor_quality, passage_needed: resolving < 2 }
  hist[difficulty] = (hist[difficulty] ?? 0) + 1
  if (difficulty !== it.difficulty) console.log(`  ${it.id}: author ${it.difficulty} -> panel ${difficulty}`)
  if (key_votes < 3) console.log(`  ${it.id}: key_votes ${key_votes}/3 — accepts.mjs will refuse a Conventions item below 3`)
}
writeFileSync(`${D}/${tag}.qc.json`, JSON.stringify(qc, null, 1))
console.log(`${keptPath.replace(/^.*\//,'')}: ${kept.length} items -> ${D}/${tag}.qc.json   panel difficulty ${JSON.stringify(hist)}`)
