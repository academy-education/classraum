#!/usr/bin/env node
/**
 * map-pilot-posthoc.mjs <batch.json...>: two checks added AFTER the
 * pre-registration and labelled that way. Neither one gates the pilot. Both
 * are reported in MAP-PILOT-2026-10-02.md.
 *
 * P1 Pooled readability. E1 could not score Mechanics: every unit there is
 *    under 15 words, so it printed no number. This pools every distinct
 *    sentence in a file into one text, with capitalization options deduped
 *    case-insensitively, and reports its FK. One pooled number per file is
 *    a description, not a gate.
 *
 * P2 Centroid tell, which is decidable and so measured exactly. For
 *    Capitalization: at each character position take the majority case
 *    across the four options. The CENTROID is the option that deviates from
 *    that majority least. For Spelling (polarity "correct"): the option with
 *    the smallest summed edit distance to the other three. When every
 *    distractor is one edit away from the key, the key IS the centroid, and
 *    "pick the option the others agree on" solves the item with no
 *    knowledge at all.
 *    Reported: how many items the centroid key decides uniquely.
 *    Break-test: a rigged centroid item must be detected, and an item with
 *    the key off-centre must not be.
 */
import { readFileSync } from 'node:fs'
import { readability, sentences, dl } from './map-pilot-checks.mjs'

export function centroid(it) {
  const ch = it.choices.map(String)
  let score
  if (it.map_strand === 'Capitalization') {
    const L = Math.max(...ch.map(c => c.length))
    score = ch.map(() => 0)
    for (let p = 0; p < L; p++) {
      const cs = ch.map(c => c[p] ?? '')
      const cnt = {}; for (const c of cs) cnt[c] = (cnt[c] ?? 0) + 1
      const maj = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0][0]
      cs.forEach((c, i) => { if (c !== maj) score[i]++ })
    }
  } else if (it.map_strand === 'Spelling' && it.spelling_polarity === 'correct') {
    score = ch.map((a, i) => ch.reduce((s, b, j) => s + (i === j ? 0 : dl(a.toLowerCase(), b.toLowerCase())), 0))
  } else return null
  const min = Math.min(...score)
  const winners = score.map((s, i) => (s === min ? i : -1)).filter(i => i >= 0)
  const k = ch.indexOf(String(it.correct_answer))
  return { score, unique: winners.length === 1, keyIsCentroid: winners.length === 1 && winners[0] === k }
}

const isMain = import.meta.url === `file://${process.argv[1]}`
if (isMain) {
  const files = process.argv.slice(2)
  if (!files.length) { console.error('usage: map-pilot-posthoc.mjs <batch.json...>'); process.exit(2) }
  // break-test
  const rig = centroid({ map_strand: 'Spelling', spelling_polarity: 'correct', choices: ['necessary', 'neccessary', 'necesary', 'necessery'], correct_answer: 'necessary' })
  const off = centroid({ map_strand: 'Spelling', spelling_polarity: 'correct', choices: ['necessary', 'neccesary', 'neccesery', 'nesesery'], correct_answer: 'necessary' })
  if (!rig?.keyIsCentroid || off?.keyIsCentroid) { console.error('REFUSING: centroid break-test failed', rig, off); process.exit(2) }
  console.log('P2 break-test ok (rigged centroid caught, off-centre key not flagged)')
  for (const f of files) {
    const items = JSON.parse(readFileSync(f, 'utf8'))
    if (!items.length) { console.error(`REFUSING: ${f} empty`); process.exit(2) }
    const seen = new Set(), sents = []
    for (const it of items) {
      const opts = it.map_strand === 'Capitalization' ? [it.choices[0]] : it.map_strand === 'Spelling' ? [] : it.choices
      for (const t of [it.passage, it.prompt, ...opts]) for (const s of sentences(t ?? '')) { const k = s.toLowerCase(); if (!seen.has(k)) { seen.add(k); sents.push(s) } }
    }
    const r = readability(sents.join(' '))
    console.log(`\n== ${f.split('/').pop()}`)
    console.log(`P1 pooled: ${r.words} words / ${r.sentences} sentences -> FK ${r.fk.toFixed(1)}, CL ${r.cl.toFixed(1)}`)
    let n = 0, hit = 0
    for (const it of items) {
      const c = centroid(it); if (!c) continue
      n++; if (c.keyIsCentroid) hit++
      console.log(`  ${it.id} ${it.map_strand.padEnd(14)} scores ${JSON.stringify(c.score)} key-is-unique-centroid=${c.keyIsCentroid}`)
    }
    if (n) console.log(`P2 centroid decides ${hit} of ${n} scorable items (chance-level expectation ~${(n / 4).toFixed(1)})`)
    else console.log('P2 no centroid-scorable items in this file')
  }
}
