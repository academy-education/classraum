#!/usr/bin/env node
/**
 * check-packets.mjs — the mechanical letter check on the packets AS WRITTEN, run before any grader sees them
 * (ITEP-SLATE-GRAMMAR-V3.prereg.md §3). Reads packetN/packet-cold.json and keys/packetN.index.json from disk,
 * not the builder's memory. v2 lost 59 sound items because two packets drew Part 2 keys A 9/20 and A 3/23.
 *
 *   node scripts/study-bank/itep-grammar-v3-work/check-packets.mjs [--root scratchpad/itep-grammar-v3] [--packets 3]
 *
 * FAIL (exit 1), per packet:
 *   - Part 2 key letters (position of the key among the choices) not within 1 of each other (max - min > 1)
 *   - three consecutive Part 2 items (packet order) with one key letter
 *   - a Part 2 item whose choices are not its [A:]..[D:] segments in order (it would be served differently)
 *   - Part 1 key letters with max - min > 1 (reported as FAIL too: it is free to fix and noise for graders)
 *   - index and packet disagree (count, numbering, or the key is not among the choices)
 * Exits 2 on a missing/unreadable file or an empty packet (never a verdict over unread data).
 */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '../../..')
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d }
const PR = resolve(ROOT, arg('--root', 'scratchpad/itep-grammar-v3'))
const NP = Number(arg('--packets', '3'))
const die = m => { console.error(`check-packets: ${m}`); process.exit(2) }
const read = p => { if (!existsSync(p)) die(`missing ${p}`); try { return JSON.parse(readFileSync(p, 'utf8')) } catch (e) { die(`unreadable ${p}: ${e.message}`) } }
const L = ['A', 'B', 'C', 'D']
const fails = []
let total = 0
for (let p = 1; p <= NP; p++) {
  const cold = read(join(PR, `packet${p}`, 'packet-cold.json')), idx = read(join(PR, 'keys', `packet${p}.index.json`))
  if (!Array.isArray(cold) || !cold.length) die(`packet${p}: empty`)
  if (cold.length !== idx.length) { fails.push(`packet${p}: packet ${cold.length} rows, index ${idx.length}`); continue }
  const tally = { P1: {}, P2: {} }, seq = []
  cold.forEach((row, i) => {
    const ix = idx[i]
    if (row.n !== i + 1 || ix.n !== row.n) fails.push(`packet${p} row ${i + 1}: numbering disagrees`)
    const k = row.choices.indexOf(ix.key)
    if (k < 0) { fails.push(`packet${p} #${row.n}: key not among choices`); return }
    const part = ix.part.startsWith('Part 2') ? 'P2' : 'P1'
    if ((part === 'P2') !== (row.kind === 'Error Identification')) fails.push(`packet${p} #${row.n}: kind/part disagree`)
    tally[part][L[k]] = (tally[part][L[k]] || 0) + 1
    if (part === 'P2') {
      seq.push(L[k])
      const segs = [...row.passage.matchAll(/\[([A-D]):\s?([^\]]*)\]/g)]
      if (segs.length !== 4 || segs.some((s, j) => s[1] !== L[j] || s[2] !== row.choices[j])) fails.push(`packet${p} #${row.n}: Part 2 choices are not its labelled segments in order`)
    }
  })
  total += cold.length
  for (const part of ['P1', 'P2']) {
    const c = L.map(l => tally[part][l] || 0), n = c.reduce((a, b) => a + b, 0)
    console.log(`packet${p} ${part}: n=${n} key letters A${c[0]} B${c[1]} C${c[2]} D${c[3]}`)
    if (n && Math.max(...c) - Math.min(...c) > 1) fails.push(`packet${p} ${part}: key letters A${c[0]} B${c[1]} C${c[2]} D${c[3]} (max - min > 1)`)
  }
  for (let i = 2; i < seq.length; i++) if (seq[i] === seq[i - 1] && seq[i] === seq[i - 2]) fails.push(`packet${p} P2: three consecutive keys ${seq[i]} ending at Part 2 item ${i + 1}`)
  console.log(`packet${p} P2 key sequence: ${seq.join('')}`)
}
console.log(`checked ${NP} packets, ${total} items`)
if (fails.length) { console.log(`FAIL (${fails.length}):`); fails.forEach(f => console.log('  ' + f)); process.exit(1) }
console.log('PASS: Part 2 (and Part 1) key letters balanced within 1 in every packet; no 3-runs; segments in order')
