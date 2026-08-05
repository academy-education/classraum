#!/usr/bin/env node
/**
 * check-option-balance.mjs — the batch-level check that crv3 said was
 * needed, and the first one here that produces a PREDICTED BLIND SCORE
 * rather than a warning.
 *
 *   node check-option-balance.mjs <labels.json> <key.json>
 *
 * labels.json : { "1": {"A":"hedged-acceptance","B":"refusal",...}, ... }
 * key.json    : { "1": {"letter":"C"}, ... }
 *
 * ── What it measures, and why this one and not another regex ─────────
 * Every structural guard in this directory checks a SURFACE property —
 * letter, length rank, punctuation, a lexical pivot. Three consecutive
 * repairs passed all of them and were still solved without the audio,
 * because the tell was which KIND of reply the key was:
 *
 *   crv3 blind accuracy, by the speech act of the key
 *     conditional acceptance  100%      question asked back  25%
 *     fix offered              92%      plain agreement      42%
 *     polite refusal           92%      counter-proposal     42%
 *
 * A family that appears only as the key is a free rule. A family that
 * appears as key and as distractor at similar rates is not. In crv3
 * exactly one family managed it — "go ask Priya/Marco/Nadia" was the
 * key 3 times and a distractor 3 times, and both with-source readers
 * independently called it the only unlearnable shape in the batch.
 *
 * So this reads a per-option FAMILY labelling (produced by an agent
 * that cannot see the key — see make-label-input.mjs) and asks: does
 * knowing the family tell you the answer?
 *
 * ── The headline number ──────────────────────────────────────────────
 * BEST FAMILY RULE simulates the cheapest possible attacker: "always
 * pick the option of family F; if this item has none, guess among the
 * four." Its accuracy is directly comparable to a blind solver's, and
 * to the 25% control. It needs no model and no stimulus — only labels.
 *
 * TVD is the distance between the key's family distribution and the
 * option pool's. 0 = perfectly balanced, and a batch at 0 cannot be
 * attacked this way at all.
 *
 * ── Validation ───────────────────────────────────────────────────────
 * A gate that cannot discriminate is worse than none — check-batch-
 * variety.mjs was first written with thresholds guessed against no
 * control and scored a clean corpus and a broken one within a few
 * points of each other. So this is run against three batches whose
 * measured blind margins are already known:
 *
 *   repair-v1  +40.4      crv2  +14.6      crv3  +39.6
 *
 * If BEST FAMILY RULE does not separate crv2 from the other two, the
 * check is measuring nothing and should not be used.
 */
import { readFileSync } from 'node:fs'

const [labelPath, keyPath] = process.argv.slice(2)
if (!labelPath || !keyPath) {
  console.error('usage: check-option-balance.mjs <labels.json> <key.json>')
  process.exit(2)
}
const LETTERS = ['A', 'B', 'C', 'D']
const labels = JSON.parse(readFileSync(labelPath, 'utf8'))
const key = JSON.parse(readFileSync(keyPath, 'utf8'))

const ids = Object.keys(key)
const missing = ids.filter(id => !labels[id] || LETTERS.some(L => !labels[id][L]))
if (missing.length) {
  // Same refusal as score-blind.mjs: a partial labelling understates
  // imbalance, which is the direction that manufactures a pass.
  console.error(`REFUSED — ${missing.length} item(s) unlabelled or partly labelled: ${missing.slice(0, 8).join(',')}`)
  process.exit(2)
}

const N = ids.length
const norm = s => String(s).trim().toLowerCase()
const famsOf = id => LETTERS.map(L => norm(labels[id][L]))
const keyFamOf = id => norm(labels[id][key[id].letter])

const families = [...new Set(ids.flatMap(famsOf))].sort()
const poolTotal = 4 * N

const rows = families.map(f => {
  const inPool = ids.reduce((n, id) => n + famsOf(id).filter(x => x === f).length, 0)
  const asKey = ids.filter(id => keyFamOf(id) === f).length
  const share = inPool / poolTotal
  const keyRate = asKey / N
  return { f, inPool, asKey, share, keyRate, lift: share ? keyRate / share : 0 }
})

/** Accuracy of "always pick family F, else guess among four". */
const ruleAcc = f => ids.reduce((acc, id) => {
  const fams = famsOf(id)
  const n = fams.filter(x => x === f).length
  if (n === 0) return acc + 0.25
  return acc + (keyFamOf(id) === f ? 1 / n : 0)
}, 0) / N

/** Accuracy of "never pick family F; guess among the rest". */
const avoidAcc = f => ids.reduce((acc, id) => {
  const fams = famsOf(id)
  const survivors = fams.filter(x => x !== f).length
  if (survivors === 0) return acc + 0.25
  return acc + (keyFamOf(id) !== f ? 1 / survivors : 0)
}, 0) / N

const tvd = rows.reduce((s, r) => s + Math.abs(r.keyRate - r.share), 0) / 2

console.log(`items ${N}   options ${poolTotal}   families ${families.length}   control 25.0%\n`)
console.log('family                     in pool   as key   share   key-rate   lift')
for (const r of [...rows].sort((a, b) => b.lift - a.lift)) {
  console.log(
    `  ${r.f.padEnd(24)} ${String(r.inPool).padStart(5)}  ${String(r.asKey).padStart(6)}` +
    `   ${(100 * r.share).toFixed(1).padStart(5)}%  ${(100 * r.keyRate).toFixed(1).padStart(6)}%` +
    `   ${r.lift.toFixed(2).padStart(5)}`)
}

const picks = families.map(f => ({ f, acc: ruleAcc(f) })).sort((a, b) => b.acc - a.acc)
const avoids = families.map(f => ({ f, acc: avoidAcc(f) })).sort((a, b) => b.acc - a.acc)

console.log(`\nBEST FAMILY RULE   "always pick ${picks[0].f}"  ->  ${(100 * picks[0].acc).toFixed(1)}%`)
console.log(`BEST AVOID RULE    "never pick ${avoids[0].f}"   ->  ${(100 * avoids[0].acc).toFixed(1)}%`)
console.log(`TVD(key families vs pool) = ${tvd.toFixed(3)}   (0 = balanced)`)

const best = Math.max(picks[0].acc, avoids[0].acc)
console.log(`\nA label-only attacker scores ${(100 * best).toFixed(1)}% against a 25.0% control` +
  `  =  ${(100 * (best - 0.25)).toFixed(1)}pts.`)
console.log('That is a FLOOR on this batch\'s blind margin, not an estimate: a real')
console.log('solver has the option text as well as the family, and can combine rules.')
