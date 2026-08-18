#!/usr/bin/env node
/**
 * ATV2 pilot render pipeline. FILES ONLY — nothing touches the DB.
 *
 * Modes:
 *   select    seeded world selection + flat letter deal over the FROZEN
 *             atv2-quads.json. Records the quads sha256 so any later
 *             option-text edit is detected (freeze enforcement).
 *   assemble  build atv2-items.json in the exact live study_item_bank
 *             row shape from quads + selection + atv2-spoken.json
 *             (transcripts/explanations/kills authored AFTER selection).
 *             Refuses if the quads sha no longer matches the selection.
 *   blind     render atv2-pilot.blind.json / .key.json (stem+options
 *             only, seeded item-order shuffle; transcripts never cross).
 *
 * Seed: fixed literal 'atv2-20260818' (pre-registered in ATV2-DESIGN.md).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const DIR = '/Users/andylee/Downloads/saas/classraum/scripts/study-bank'
// --batch bN switches to Phase 2 batch mode: 8 lectures, per-batch seed
// (pre-registered literals atv2-b1-20260818 etc.), per-batch file names.
// Without --batch everything is byte-identical to the pilot pipeline.
const bArg = process.argv.indexOf('--batch')
const BATCH = bArg > -1 ? process.argv[bArg + 1] : null
if (bArg > -1 && !/^b[0-9]+$/.test(BATCH)) { console.error('FAIL: bad --batch'); process.exit(1) }
const PREFIX = BATCH ? `atv2-${BATCH}` : 'atv2'
const SEED = BATCH ? `atv2-${BATCH}-20260818` : 'atv2-20260818'
// b4 carries 9 lectures (the atv2-b1-p4 replacement folded in); letter deal
// stays flat (36/4 = 9 per letter), so control remains exactly 25.0%.
const NLECT = BATCH ? (BATCH === 'b4' ? 9 : 8) : 6
const NITEMS = NLECT * 4
const PER_LETTER = NITEMS / 4
const BLIND = BATCH ? `${PREFIX}-blind.json` : 'atv2-pilot.blind.json'
const KEYF = BATCH ? `${PREFIX}-key.json` : 'atv2-pilot.key.json'
const COHORT = BATCH ? `at-v2-${BATCH}` : 'at-v2-pilot'
const LETTERS = ['A', 'B', 'C', 'D']

function rng(seed) {
  let h = 2166136261
  for (const c of seed) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) }
  return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
const shuffle = (arr, rand) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex')

const quadsRaw = readFileSync(`${DIR}/${PREFIX}-quads.json`)
const quads = JSON.parse(quadsRaw)
const quadsSha = sha256(quadsRaw)

// ---- structural validation (always) ----
if (quads.seed !== SEED) fail(`quads seed ${quads.seed} != pre-registered ${SEED}`)
if (!Array.isArray(quads.lectures) || quads.lectures.length !== NLECT) fail(`need exactly ${NLECT} lectures`)
for (const lec of quads.lectures) {
  if (!lec.id || !lec.topic || !['easy', 'medium', 'hard'].includes(lec.difficulty)) fail(`${lec.id}: bad header`)
  if (!Array.isArray(lec.pivots) || lec.pivots.length !== 4) fail(`${lec.id}: need exactly 4 pivots`)
  for (const p of lec.pivots) {
    if (!p.id || !p.qtype || typeof p.stem !== 'string' || p.stem.length < 10) fail(`${lec.id}/${p.id}: bad stem`)
    if (!Array.isArray(p.settings) || p.settings.length !== 4) fail(`${lec.id}/${p.id}: need exactly 4 settings`)
    if (p.settings.some(s => typeof s !== 'string' || s.trim().length < 8)) fail(`${lec.id}/${p.id}: empty setting`)
    if (new Set(p.settings.map(s => s.trim().toLowerCase())).size !== 4) fail(`${lec.id}/${p.id}: duplicate settings`)
  }
}
function fail(msg) { console.error('FAIL: ' + msg); process.exit(1) }

const mode = process.argv[2]

if (mode === 'select') {
  // one independent stream per lecture-pivot: the pick depends only on the
  // pre-registered seed literal and the ids, never on the text.
  const picks = {}
  const items = [] // canonical order: lecture order x pivot order
  for (const lec of quads.lectures) {
    picks[lec.id] = {}
    for (const p of lec.pivots) {
      const r = rng(`${SEED}:${lec.id}:${p.id}`)
      const chosen = Math.floor(r() * 4)
      picks[lec.id][p.id] = { chosen }
      items.push({ lid: lec.id, pid: p.id })
    }
  }
  // flat letter deal: multiset of 6 of each key letter, seeded shuffle,
  // assigned in canonical item order -> control is exactly 25%.
  const deal = shuffle(LETTERS.flatMap(l => Array(PER_LETTER).fill(l)), rng(`${SEED}:letters`))
  items.forEach((it, i) => {
    const pick = picks[it.lid][it.pid]
    pick.key_letter = deal[i]
    // place the 3 non-chosen settings into the remaining letters, seeded
    const rest = LETTERS.filter(l => l !== pick.key_letter)
    const others = shuffle([0, 1, 2, 3].filter(s => s !== pick.chosen), rng(`${SEED}:place:${it.lid}:${it.pid}`))
    pick.letter_to_setting = { [pick.key_letter]: pick.chosen }
    rest.forEach((l, k) => { pick.letter_to_setting[l] = others[k] })
  })
  const spread = {}
  for (const it of items) { const l = picks[it.lid][it.pid].key_letter; spread[l] = (spread[l] ?? 0) + 1 }
  writeFileSync(`${DIR}/${PREFIX}-selection.json`, JSON.stringify({
    seed: SEED, quads_sha256: quadsSha, selected_at: '2026-08-18', picks,
  }, null, 1))
  console.log('selection written. key letter spread:', spread)
  for (const lec of quads.lectures) {
    console.log(lec.id, lec.pivots.map(p => `${p.id}=s${picks[lec.id][p.id].chosen}(${picks[lec.id][p.id].key_letter})`).join('  '))
  }
} else if (mode === 'assemble') {
  const sel = JSON.parse(readFileSync(`${DIR}/${PREFIX}-selection.json`, 'utf8'))
  if (sel.quads_sha256 !== quadsSha) fail(`FREEZE VIOLATION: quads sha ${quadsSha.slice(0, 12)} != selection's ${sel.quads_sha256.slice(0, 12)} — option text was edited after selection`)
  if (sel.seed !== SEED) fail('selection seed mismatch')
  const spoken = JSON.parse(readFileSync(`${DIR}/${PREFIX}-spoken.json`, 'utf8'))
  const rows = []
  for (const lec of quads.lectures) {
    const sp = spoken[lec.id]
    if (!sp || typeof sp.transcript !== 'string' || sp.transcript.split(/\s+/).length < 150) fail(`${lec.id}: missing/short transcript`)
    for (const p of lec.pivots) {
      const pick = sel.picks[lec.id][p.id]
      const key = p.settings[pick.chosen]
      const expl = sp.explanations?.[p.id]
      if (!expl) fail(`${lec.id}/${p.id}: missing explanation`)
      const kills = sp.kills?.[p.id]
      const choices = LETTERS.map(l => p.settings[pick.letter_to_setting[l]])
      const rationales = []
      for (let s = 0; s < 4; s++) {
        if (s === pick.chosen) continue
        const reason = kills?.[String(s)]
        if (!reason) fail(`${lec.id}/${p.id}: missing kill for setting ${s}`)
        rationales.push({ choice: p.settings[s], reason })
      }
      rows.push({
        passage_group_id: lec.id,
        cohort: COHORT,
        difficulty: lec.difficulty,
        item: {
          type: 'multiple_choice',
          blanks: null,
          prompt: `[Academic Talk — ${lec.topic}] ${p.stem}`,
          choices,
          graphic: null,
          passage: `Transcript: ${sp.transcript}`,
          difficulty: lec.difficulty,
          explanation: expl,
          listeningTask: 'academic_talk',
          correct_answer: key,
          passageGroupId: lec.id,
          correct_answers: null,
          acceptable_answers: null,
          distractor_rationales: rationales,
        },
        _meta: { lecture: lec.id, pivot: p.id, qtype: p.qtype, chosen: pick.chosen, key_letter: pick.key_letter },
      })
    }
  }
  if (rows.length !== NITEMS) fail(`expected ${NITEMS} rows, got ${rows.length}`)
  writeFileSync(`${DIR}/${PREFIX}-items.json`, JSON.stringify({ seed: SEED, quads_sha256: quadsSha, rows }, null, 1))
  console.log(`assembled ${rows.length} rows -> ${PREFIX}-items.json`)
} else if (mode === 'blind') {
  const bank = JSON.parse(readFileSync(`${DIR}/${PREFIX}-items.json`, 'utf8'))
  if (bank.rows.length !== NITEMS) fail(`items file must hold ${NITEMS} rows`)
  const order = shuffle(bank.rows, rng(`${SEED}:order`))
  const blind = {}, key = {}
  order.forEach((row, i) => {
    const n = String(i + 1)
    blind[n] = {
      stem: row.item.prompt,
      options: Object.fromEntries(LETTERS.map((l, k) => [l, row.item.choices[k]])),
    }
    key[n] = { letter: row._meta.key_letter, lecture: row._meta.lecture, pivot: row._meta.pivot, qtype: row._meta.qtype }
    if (row.item.choices[LETTERS.indexOf(row._meta.key_letter)] !== row.item.correct_answer) fail(`${n}: key letter does not point at correct_answer`)
  })
  writeFileSync(`${DIR}/${BLIND}`, JSON.stringify(blind, null, 1))
  writeFileSync(`${DIR}/${KEYF}`, JSON.stringify(key, null, 1))
  console.log(`blind + key written (${NITEMS} items)`)
} else {
  console.error('usage: atv2-render.mjs select|assemble|blind')
  process.exit(1)
}
