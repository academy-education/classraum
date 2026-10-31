#!/usr/bin/env node
/**
 * build-packet.mjs — iTEP Listening v2 agent-review packet (ITEP-SLATE-LISTENING-V2.prereg.md §4), from the frozen
 * author files, through agent-review-core.mjs planPackets/dealPacket. Same format, brief copy and prompts as
 * Reading v2, plus one sentence telling graders the students hear the transcript once. No DB.
 *   node scripts/study-bank/itep-listening-v2-work/build-packet.mjs [--write]      (from the repo root)
 * Rows: id = qid, cohort itep-listening-v2, passage = "Transcript: " + transcript (the stored form),
 * passage_group_id itep-listening-v2-<set_id> for Parts 2-3, null for Part 1. Refuses unless 126 items in 54 sets
 * and the plan is the prereg's 40/40/40/6 (computed by planPackets on a mock when the prereg was written). Records every item file's sha256.
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { planPackets, dealPacket, GRADERS } from '../agent-review-core.mjs'

const W = 'scripts/study-bank/itep-listening-v2-work'
const OUT = 'scratchpad/agent-review/itep-listening-v2'
const MANIFEST = 'scratchpad/agent-review/MANIFEST-itep-listening-v2.json'
const BRIEF = 'scripts/study-bank/cofounder-grader/COFOUNDER-BRIEF-v2.md'
const COHORT = 'itep-listening-v2'
const die = m => { console.error(`build-packet: ${m}`); process.exit(2) }
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex')

const files = 'ABCDEFGHI'.split('').map(x => `${W}/items/${x}.json`)
const rows = []
for (const f of files) for (const s of JSON.parse(readFileSync(f, 'utf8')).sets) for (const it of s.items) rows.push({
  id: it.qid, family: 'itep', section: 'listening', cohort: COHORT,
  passage_group_id: s.part === 1 ? null : `${COHORT}-${s.set_id}`,
  item: { prompt: it.prompt, passage: `Transcript: ${s.transcript}`, choices: it.choices, correct_answer: it.correct_answer },
})
if (rows.length !== 126) die(`read ${rows.length} items, want 126`)
if (new Set(rows.map(r => r.item.passage)).size !== 54) die('want 54 distinct transcripts')
const packets = planPackets(rows)
if (packets.map(p => p.items).join('/') !== '40/40/40/6') die(`planned ${packets.map(p => p.items).join('/')}, want 40/40/40/6`)

function prompts(dir) {
  const read = `${dir}/COFOUNDER-BRIEF-v2.md and ${dir}/packet.json`
  const rules = 'Read nothing else in the repo: no index.json, no batch files, no key files, no other grader output, no other packet. Claude only, no database. Write only your own output file.'
  const listen = ' These are LISTENING items: students hear the transcript once (synthetic voices; W = a woman, M = a man; a lecture is one speaker) and never see it; they see the question and options. Judge each key against the transcript, and also judge whether the transcript sounds like natural speech.'
  const base = k => `You are an independent grader for a staged test-prep item batch. Work in /Users/andylee/Downloads/saas/classraum. Read ${read}. ${rules}${listen} Grade every item exactly as the brief instructs (verdict per item, defect_type and reason for any non-unique verdict, batch_patterns over the whole packet) and write ${dir}/grades-${k}.json in the brief's output format.`
  const adv = ' Assume each item has a defect: look hardest for a second defensible option, a distractor that is true of the source for the asked purpose, a key you can choose without the source, a false real-world claim or self-contradiction, unnatural speech, and any pattern across items that picks the key.'
  const tail = ' Reply with the number of items graded, every non-unique item with its reason, and your batch_patterns.'
  return { a: base('a') + tail, b: base('b') + tail, c: base('c') + adv + tail }
}

const write = process.argv.includes('--write')
const briefSha = sha(BRIEF)
const manifest = {
  prereg: 'scripts/study-bank/ITEP-SLATE-LISTENING-V2.prereg.md', instrument: 'AGENT-REVIEW-SSAT-MAP.prereg.md + A1',
  brief: BRIEF, brief_sha256: briefSha, graders: GRADERS,
  item_files_sha256: Object.fromEntries(files.map(f => [f, sha(f)])), packets: [],
}
for (const p of packets) {
  const dir = `${OUT}/${p.id}`
  const { items, index } = dealPacket(p)
  manifest.packets.push({ id: p.id, stratum: 'itep-listening', cohort: p.cohort, dir, items: items.length, groups: p.groups, outputs: GRADERS.map(k => `${dir}/grades-${k}.json`), prompts: prompts(dir) })
  console.log(`${p.id}: ${items.length} items, ${p.groups} groups, ${p.units.length} units`)
  if (write) {
    mkdirSync(dir, { recursive: true })
    writeFileSync(`${dir}/packet.json`, JSON.stringify(items, null, 1) + '\n')
    writeFileSync(`${dir}/index.json`, JSON.stringify(index, null, 1) + '\n')
    copyFileSync(BRIEF, `${dir}/COFOUNDER-BRIEF-v2.md`)
    writeFileSync(`${dir}/brief.json`, JSON.stringify({ brief_version: 'v2', brief_files: ['COFOUNDER-BRIEF-v2.md'], brief_sha256: { 'COFOUNDER-BRIEF-v2.md': briefSha } }, null, 1) + '\n')
  }
}
if (write) { writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + '\n'); console.log(`wrote ${MANIFEST}`) }
else console.log('dry run; --write to write the packet and manifest')
