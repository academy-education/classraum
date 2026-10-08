#!/usr/bin/env node
/** Ledger entries for rw v17: I&I inserted, C&S (WIC) HELD whole on the blind bar. Bound to exact bytes. */
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const D = 'scripts/study-bank'
const sha = f => createHash('sha256').update(readFileSync(`${D}/${f}`)).digest('hex')
const ledger = JSON.parse(readFileSync(`${D}/ledger.json`, 'utf8'))
const pre = 'Pre-registered d467f28f (PREREG-RW17-II-CS-2026-10-07.md) before any item existed; four Claude authors, 6 each, one-frame brief; frozen b82daa9a; no audit/repair round, nothing repaired after freeze. All agents Claude.'
const iiSha = sha('sat-ii-hard-v17.batch.json'), wicSha = sha('sat-wic-hard-v17.batch.json')
const add = e => { if (ledger.batches.some(b => b.id === e.id)) { console.error('entry exists ' + e.id); process.exit(2) } ledger.batches.push(e) }
add({
  id: 'sat-ii-hard-v17-2026-10-08', createdAt: '2026-10-08', targetTest: 'sat', section: 'reading_writing',
  task: 'multiple_choice', family: 'mc_hidden_source', cohort: 'rw-v17-ii-hard', contentSha: iiSha, status: 'inserted',
  note: `${pre} 12 Information and Ideas items (6 Command of Textual Evidence "finding, if true", 6 quantitative with a table). All 12 kept: 7 hard / 5 medium by panel median; authors labelled all 12 hard.`,
  stages: {
    shape: { passed: true, contentSha: iiSha, verdict: 'bank-helper check OK 12/12. Keys A4/B2/C4/D2; key uniquely longest 0/12, uniquely shortest 0/12, max length ratio 1.13; passages 69-113 words. rw17-dupscan.mjs vs ALL 1153 live SAT R&W rows (paged = exact count): 0 flagged, max passage trigram Jaccard 0.024, max options shared 0/4; within-batch 0. Self-test: sat-wic-v7.kept finds its 15 inserted items at 1.000/4/4 and not the one never inserted; 0 with its cohort excluded. With-source render BLIND=bare, 0 subskill strings.' },
    withsource: { passed: true, contentSha: iiSha, verdict: 'Three graders (ws-d/e/f), phase 1 cold (sha-snapshotted, verified unchanged after phase 2), phase 2 key+explanation. 12/12 keys on all three cold, 0 cold misses, 0 disputes, 0 non-exclusive, 0 path errors, 0 recommend_drop, 0 off-blueprint, 0 world-knowledge, rule 8 key_from_one_sentence 0/12 by any grader. gate-verdict.mjs: 12/12 KEEP (max free-strike median 1, II17A-02 [0,2,1]). Panel median: hard II17A-01, A-03, A-04, A-06, B-02, B-03, B-06; medium A-02, A-05, B-01, B-04, B-05.' },
    nosource: { passed: true, contentSha: iiSha, n: 36, mean: 0.444, control: 0.639, margin: -0.194, verdict: 'rw17-oo-render.mjs ii: 12 candidates + 24 live CoE controls (12 hard textual of 26; quantitative 2 hard + 10 medium of 34), per-arm flat deal 3/3/3/3 and 6/6/6/6, interleaved; 3 Claude samples, 36/36 answered each. CANDIDATE 44.4% (16/36) vs CONTROL 63.9% (46/72), margin -19.4, bar +10; control inside the pre-registered measurable range (30%, 90%], so MEASURED. Strata: textual 50.0% (9/18) vs 69.4% (25/36); quantitative 38.9% (7/18) vs 58.3% (21/36). Pairwise agreement 88.9% vs 26.0% independent (one solver sampled 3 times). Unanimity rate candidate 5/12 = 41.7% vs control 13/24 = 54.2%.' },
    elimination: { passed: true, bar: 'paired-control-v1', candidateRate: 0, controlRate: 0.0417, margin: -0.0417, threshold: 0.2, n: 12, controlN: 24, samples: 3, contentSha: iiSha, verdict: 'elimination-paired.mjs --batch, --match subskill ratio 2 (Command of Textual Evidence 12, Command of Evidence 12; all v2), separate files, 3 Claude samples per arm: candidate 0.0% [0,0,0] vs control 4.2% [8.3, 4.2, 0.0], margin -4.2, PASS. No key ever confidently rejected.' },
    tells: { passed: true, contentSha: iiSha, verdict: 'Recorded, no pre-registered drop: graders d and e - the key sits in a reversed pair (same comparison stated both ways) in A-01, A-02, B-01, B-03, which halves those items without the passage; blind solvers were 3/3 on A-02, B-01, B-03 and 0/3 on A-01 (9/12 picks on the four vs 9/18 on the textual stratum). Grader f - the six "finding, if true" items share one template: the key uses the contrast introduced in the last sentence, beside a both-accounts-fit or both-factors-changed distractor; the direction still needs the passage. Grader d - II17A-06 well R (shallow, -1.3 m) sits close to deep well S (-1.1 m), a hesitation point the explanation does not name; key stands.' },
  },
})
add({
  id: 'sat-wic-hard-v17-2026-10-08', createdAt: '2026-10-08', targetTest: 'sat', section: 'reading_writing',
  task: 'multiple_choice', family: 'mc_hidden_source', cohort: 'rw-v17-wic-hard', contentSha: wicSha, status: 'held',
  note: `${pre} 12 Craft and Structure / Words in Context items. HELD WHOLE on the pre-registered blind bar (candidate minus control +20.8 > +10). Nothing inserted.`,
  stages: {
    shape: { passed: true, contentSha: wicSha, verdict: 'bank-helper check OK 12/12; keys A4/B4/C2/D2; uniquely shortest key 2/12, uniquely longest 0/12, max ratio 1.57. rw17-dupscan vs 1153 live rows: 0 flagged; WITHIN: WIC17A-04 and WIC17B-03 share the key "nominal" (pre-flight drop for B-03 had the batch passed).' },
    nosource: { passed: false, contentSha: wicSha, n: 36, mean: 0.583, control: 0.375, margin: 0.208, verdict: 'rw17-oo-render.mjs cs: 12 candidates + 24 live word-shaped WIC controls (all 12 hard + 12 of 27 medium), flat per arm; 3 Claude samples. CANDIDATE 58.3% (21/36) vs CONTROL 37.5% (27/72), margin +20.8 > +10 bar, control inside (30%, 90%] so MEASURED -> HELD WHOLE. 6 of the 21 candidate hits are the two "nominal" items (both unanimous; solvers a/b named "option repeated across items"); without them 15/30 = 50.0%, still +12.5. Agreement 77.8% vs 25.5% independent. Unanimity candidate 6/12 = 50.0% vs control 5/24 = 20.8%.' },
    withsource: { passed: true, contentSha: wicSha, verdict: 'Phase 1 only (phase 2 not run once the batch was held): 12/12 cold keys on all three graders, 0 non-exclusive. Panel median: hard 1 (WIC17B-01), medium 8, easy 3 (A-03, B-04, B-06). Every grader named the same tell: each distractor is contradicted by its own planted clause, so "pick the option the passage never contradicts" solves most items; the overturned opening view is always a distractor; "Ines Varga" appears in A-02 and B-01.' },
    elimination: { passed: true, bar: 'paired-control-v1', candidateRate: 0, controlRate: 0, margin: 0, threshold: 0.2, n: 12, controlN: 24, samples: 3, contentSha: wicSha, verdict: 'candidate 0.0% vs control 0.0%, PASS (information only; batch held on nosource).' },
  },
})
ledger.generatedAt = new Date().toISOString()
writeFileSync(`${D}/ledger.json`, JSON.stringify(ledger, null, 2))
console.log(`ledger: ii ${iiSha.slice(0, 16)}, wic ${wicSha.slice(0, 16)}`)
