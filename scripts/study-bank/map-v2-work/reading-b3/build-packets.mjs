#!/usr/bin/env node
/**
 * build-packets.mjs — COFOUNDER-BRIEF-v2 grader packets for MRV4 in the mapread4-grade layout:
 *   scratchpad/mapread5-grade/  (75 passage items)   scratchpad/mapvocab4-grade/  (80 vocabulary items)
 * each with packet.json (shuffled, seeded; no ids, no rationales), index.json (n -> file, id), brief.json and
 * a copy of the brief. Refuses (exit 2) if an input is missing, short, or the brief hash is not v2's.
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
const ROOT = new URL('../../../../', import.meta.url).pathname
const die = m => { console.error('REFUSING: ' + m); process.exit(2) }
const BRIEF = join(ROOT, 'scripts/study-bank/cofounder-grader/COFOUNDER-BRIEF-v2.md')
const SHA = '3d032066bcc86fc0a5c5c89d388cf400682f71ee51af45c27ebf246097fd2ad0'
const sha = createHash('sha256').update(readFileSync(BRIEF)).digest('hex')
if (sha !== SHA) die(`brief hash ${sha} is not COFOUNDER-BRIEF-v2`)
const W = 'scratchpad/map-v4-read-work'
const jobs = [
  { dir: 'scratchpad/mapread5-grade', file: `${W}/batch3.merged.json`, n: 75, rows: j => j.items.map(i => ({ id: i.qid, passage: i.passage, prompt: i.prompt, choices: i.choices, correct_answer: i.correct_answer })) },
  { dir: 'scratchpad/mapvocab4-grade', file: `${W}/V.merged.json`, n: 80, rows: j => j.map(i => ({ id: i.id, passage: i.context, prompt: i.prompt, choices: i.choices, correct_answer: i.correct_answer })) },
]
for (const job of jobs) {
  const p = join(ROOT, job.file); if (!existsSync(p)) die(`missing ${job.file}`)
  const rows = job.rows(JSON.parse(readFileSync(p, 'utf8')))
  if (rows.length !== job.n) die(`${job.file}: ${rows.length} items, expected ${job.n}`)
  for (const r of rows) if (!r.passage || !r.prompt || r.choices?.length !== 4 || !r.choices.includes(r.correct_answer)) die(`${r.id}: incomplete row`)
  let s0 = createHash('sha256').update('mrv4-packet:' + job.dir).digest().readUInt32BE(0) || 1
  const rnd = () => { s0 ^= s0 << 13; s0 >>>= 0; s0 ^= s0 >> 17; s0 ^= s0 << 5; s0 >>>= 0; return s0 / 4294967296 }
  for (let i = rows.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [rows[i], rows[j]] = [rows[j], rows[i]] }
  const dir = join(ROOT, job.dir); mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'packet.json'), JSON.stringify(rows.map((r, i) => ({ n: i + 1, family: 'map', section: 'reading', passage: r.passage, prompt: r.prompt, choices: r.choices, correct_answer: r.correct_answer })), null, 1))
  writeFileSync(join(dir, 'index.json'), JSON.stringify(rows.map((r, i) => ({ n: i + 1, file: job.file, id: r.id })), null, 1))
  copyFileSync(BRIEF, join(dir, 'COFOUNDER-BRIEF-v2.md'))
  writeFileSync(join(dir, 'brief.json'), JSON.stringify({ brief_version: 'v2', brief_files: ['COFOUNDER-BRIEF-v2.md'], brief_sha256: { 'COFOUNDER-BRIEF-v2.md': SHA }, pending_unvalidated_version: null }, null, 1))
  console.log(`${job.dir}: ${rows.length} items`)
}
