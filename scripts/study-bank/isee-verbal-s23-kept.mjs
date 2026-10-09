#!/usr/bin/env node
/**
 * isee-verbal-s23-kept.mjs <syn|sc>
 *
 * Writes isee-verbal-s23-<type>.kept.batch.json: the items isee-verbal-s23-<type>.withsource.json
 * keeps, byte-exact objects of the frozen file in frozen order (s21/s22 did this inline). The
 * banked difficulty is NOT written here: verbal-bank-helper.mjs insert reads it from the qc
 * (withsource) row and keeps the author's label as author_difficulty. Refuses (exit 2) when the withsource file does not cover every
 * frozen id, or the frozen file's sha differs from the one passed with --sha (the freeze commit's).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const type = process.argv[2]
if (!['syn', 'sc'].includes(type)) { console.error('usage: <syn|sc> --sha <frozen sha256 prefix>'); process.exit(2) }
const D = 'scripts/study-bank'
const si = process.argv.indexOf('--sha')
const want = si >= 0 ? process.argv[si + 1] : null
if (!want) { console.error('REFUSING: --sha <frozen sha256 prefix> is required'); process.exit(2) }
const text = readFileSync(`${D}/isee-verbal-s23-${type}.batch.json`, 'utf8')
const sha = createHash('sha256').update(text).digest('hex')
if (!sha.startsWith(want)) { console.error(`REFUSING: frozen file sha ${sha.slice(0, 8)} != ${want}`); process.exit(2) }
const frozen = JSON.parse(text)
const ws = JSON.parse(readFileSync(`${D}/isee-verbal-s23-${type}.withsource.json`, 'utf8'))
for (const it of frozen) if (!ws[it.id]) { console.error(`REFUSING: ${it.id} missing from the withsource file`); process.exit(2) }
const kept = frozen.filter(it => ws[it.id].keep)
const out = JSON.stringify(kept, null, 1) + '\n'
writeFileSync(`${D}/isee-verbal-s23-${type}.kept.batch.json`, out)
const tally = ['easy', 'medium', 'hard'].map(d => kept.filter(k => ws[k.id].difficulty === d).length).join('/')
console.log(`${type}: kept ${kept.length} of ${frozen.length} (e/m/h ${tally}), sha256 ${createHash('sha256').update(out).digest('hex')}`)
