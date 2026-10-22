#!/usr/bin/env node
/**
 * check-explanation-quotes.mjs - every quoted fragment in an item's explanation or distractor rationale must be one
 * of its options or appear in its passage (normalised; "..." splits a quote into parts that must each appear).
 *
 *   node scripts/study-bank/check-explanation-quotes.mjs <batch.json | merged.json>
 *
 * Written 2026-10-22 for SSAT reading draft 4: the shape checks verified the `why` quotes but nothing checked the
 * quotes a student reads in the explanation. Word-sense examples ("tight spot") and quotes nested inside another
 * quote are reported too and are usually benign; read them. Exits 1 on any unmatched fragment, 2 if nothing was read.
 */
import { readFileSync } from 'node:fs'
const norm = s => String(s).toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').replace(/\s*\/\s*/g, ' ').trim()
const strip = x => norm(x).replace(/[.,;:!?]+$/, '')
const f = process.argv[2]; if (!f) { console.error('usage: check-explanation-quotes.mjs <batch.json|merged.json>'); process.exit(2) }
const j = JSON.parse(readFileSync(f, 'utf8'))
const items = (j.items ?? (j.rows ?? []).map(r => ({ qid: r.verify_meta?.draft?.qid ?? r.content_hash, ...r.item })))
let n = 0, bad = 0
for (const it of items) {
  if (!it.passage) continue
  const P = norm(it.passage)
  for (const t of [it.explanation ?? '', ...(it.distractor_rationales ?? []).map(d => d.reason)]) for (const q of t.matchAll(/"([^"]+)"/g)) {
    n++; const frag = strip(q[1])
    if (it.choices.some(c => strip(c) === frag)) continue
    if (frag.split(/\s*\.\s*\.\s*\.\s*/).every(part => !part || P.includes(part.replace(/[.,;:!?]+$/, '')))) continue
    bad++; console.log(`${it.qid}: "${q[1]}"`)
  }
}
console.log(`items ${items.length}; quoted fragments ${n}; not in passage or options ${bad}`)
if (!n) { console.error('NOT MEASURED: no quoted fragment found'); process.exit(2) }
process.exit(bad ? 1 : 0)
