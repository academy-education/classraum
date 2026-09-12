#!/usr/bin/env node
/**
 * check-ledger-binding.mjs
 *
 * Every ledger entry claims a verdict about a specific batch FILE, bound by
 * `contentSha`. If the file has moved since it was graded, the verdict
 * describes bytes nobody now has, and the entry is a claim about nothing.
 *
 * `act-reading-v7` drifted exactly that way and was caught by hand on
 * 2026-09-12 -- the file was edited in the same commit that staged it. This
 * script exists so the next one is not caught by hand.
 *
 * Reports FOUR states separately and never collapses them into a pass:
 *   bound     file found, sha matches the entry
 *   DRIFTED   file found, sha does NOT match -- the verdict is stale
 *   unbound   the entry carries no contentSha at all
 *   no file   nothing on disk to check (inserted-and-cleaned, or renamed)
 * "no file" is NOT MEASURED, not clean.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'

const D = 'scripts/study-bank'
const L = JSON.parse(readFileSync(`${D}/ledger.json`, 'utf8'))
if (!Array.isArray(L.batches) || !L.batches.length) { console.error('REFUSING: ledger holds no batches'); process.exit(2) }

const onDisk = new Set(readdirSync(D).filter(f => f.endsWith('.batch.json')))
const bound = [], drifted = [], unbound = [], nofile = []
for (const b of L.batches) {
  if (!b.contentSha) { unbound.push(b.id); continue }
  /* A cohort can have TWO files: the authored batch and the post-gate
   * survivors. An entry is bound to whichever it was sha'd against, so BOTH
   * are hashed and a match on either is a match.
   *
   * The first draft of this script tried `<cohort>.batch.json` first and
   * stopped there. Every `-kept-` entry was sha'd against
   * `<cohort>.kept.batch.json`, so the script hashed the wrong file and
   * reported THIRTEEN DRIFTED VERDICTS on its first run -- a confident,
   * entirely wrong number, from a checker written to catch exactly that class
   * of error. It reads as a result either way, which is the point of the
   * corollary: the tell was that all thirteen shared one naming pattern. */
  const cands = [`${b.cohort}.kept.batch.json`, `${b.cohort}.batch.json`].filter(f => onDisk.has(f))
  if (!cands.length) { nofile.push(b.id); continue }
  const hashes = cands.map(f => [f, createHash('sha256').update(readFileSync(`${D}/${f}`)).digest('hex')])
  const hit = hashes.find(([, sha]) => sha === b.contentSha)
  if (hit) bound.push({ id: b.id, file: hit[0] })
  else drifted.push({ id: b.id, file: hashes.map(([f, s]) => `${f} ${s.slice(0, 12)}`).join('  |  '), ledger: b.contentSha.slice(0, 12) })
}
console.log(`ledger entries ${L.batches.length}`)
console.log(`  scorable (has a sha AND a file on disk): ${bound.length + drifted.length}`)
console.log(`    bound   ${bound.length}`)
console.log(`    DRIFTED ${drifted.length}`)
console.log(`  unbound (entry carries no contentSha)  : ${unbound.length}`)
console.log(`  no file on disk — NOT MEASURED         : ${nofile.length}`)
for (const d of drifted) console.log(`\n  DRIFT  ${d.id}\n         ledger ${d.ledger}\n         on disk: ${d.file}`)
if (unbound.length) console.log(`\n  unbound entries: ${unbound.join(', ')}`)
process.exit(drifted.length ? 1 : 0)
