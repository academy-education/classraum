// Appends (or replaces) the announcement-v6 ledger entry; re-reads ledger.json at write time.
import { readFileSync, writeFileSync } from 'node:fs'
const SHA = 'c7c9d36aed40e041ece94fdd07de60c421fef26730ac7ed8dd115e9402998819'
const FROZEN = 'bda8a6b742b360eecbd92870657605f429f886ac0268120a17323d34215c73b1'
const note = process.argv[2] ?? ''
const entry = {
  id: 'announcement-v6-2026-10-09', createdAt: '2026-10-09', targetTest: 'toefl', section: 'listening', task: 'announcement', family: 'mc_hidden_source',
  spec: { n: 30, sets: 15, kept: 28, keptSets: 14, authors: 5,
    method: 'announcement-v5 method and briefs unchanged (conv-hard-v2 transplanted to single-speaker announcements: dl-fresh flat prior + form symmetry + authored atypical/revised facts + disjoint name pools + R1-R5), fresh settings/names, v5 atypical facts on a do-not-reuse list; G2 = conv-hard-v2 distractor-only elimination rule (PREREG-ANNOUNCEMENT-V6-2026-10-09.md, dd7f1cfa); Opus authors; difficulty = median of 3 graders' },
  contentSha: SHA, frozenSha: FROZEN, status: 'staged', cohort: 'announcement-v6',
  note: 'STAGED (BANK_VERIFIED=false) for the co-founder sitting; releases at <= 8/20, archives at >= 12/20. Frozen batch announcement-v6.batch.json (sha ' + FROZEN.slice(0, 8) + ', 101736c2); inserted file announcement-v6.graded.json = frozen + grader-median difficulty only (all other fields byte-identical, checked). Keep list announcement-v6.keep.json (28 of 30; AN6-06 dropped at G2). ' + note,
  stages: {
    shape: { passed: true, contentSha: SHA, verdict: 'ann6-preflight.mjs (v5 checker, self-test 6 plants; relabelled-v5 break fires): 30 items / 15 sets, 90-170 words, keys on commissioned length ranks, ratio <= 1.4, key uniquely longest 7/30 and shortest 8/30 (kept 6/28, 7/28), Jaccard < 0.5 vs 121 live + 30 v5 Announcement passages, no name reused; check-batch-joins clean over 30; gate question-number and stem-duplicate checks clean.' },
    nosource: { passed: true, contentSha: SHA, n: 30, mean: 35.6, control: 26.7, margin: 8.9, unanimousRate: 43.3,
      liveControl: { n: 14, mean: 71.4, unanimousRate: 64.3, note: '7 live Announcement two-sets, fresh render ann6ctrl, fresh Haiku samples; reported only' },
      verdict: 'SPLIT=2 make-attack, three Claude Haiku samples per file, v5 solver brief verbatim: 32/90 picks vs best-fixed-letter 26.7%, +8.9 <= +15 PASS. Kept 28: 32/84 = 38.1% (reported). Solved 3/3: AN6-02-2, -03-1, -04-1, -08-2, -11-1, -15-1.' },
    elimination: { passed: true, contentSha: SHA, verdict: 'conv-hard-v2 rule (ann6-score.mjs, break-tested on v5 files: reproduces AN5-09/AN5-10 only; planted 2-sample distractor drops, 1-sample and 3-sample KEY rejects do not; bad input exits 2): distractor certain-rejected by >= 2 of 3 samples drops the set -> AN6-06 (AN6-06-2, a "before six" option against an "evening" stem, rejected by 3). Key certain-rejects reported, not dropped: 9 items (AN6-07-1 by 2, AN6-12-1 by 3, seven by 1).' },
    withsource: { passed: true, contentSha: SHA, verdict: '3 fresh Claude graders (Opus, Sonnet, Sonnet), transcript + unmarked options (flat key deal): 90/90 picks on key. Second-defensible: AN6-11-2 option on reassurance by 2 graders, refuted by "So on Tuesday we\'ll try three impromptu rounds" (the line is the reason for the early hard format; no nerves are mentioned) - kept. passage_needed=false on AN6-04-2, -09-1, -10-2, -14-2, none solved 3/3 blind -> no corroborated drop. G3 drops 0. G2+G3 drop 1 of 15 <= 6, G4 PASS. Grader-median difficulty kept: easy 6 / medium 17 / hard 5.' },
    tells: { passed: true, contentSha: SHA, verdict: 'Cross-item hunters: grader-a none above 3/30; grader-b "superseded value is a distractor" 12/30; grader-c "key is the post-change arrangement" 24/30 and "why-items key the rationale given next" 8/8. Both of grader-c\'s rules need the transcript to know which option is the change / the next sentence (grader-a: "without the transcript you cannot tell which option is the default"), so neither is a no-source rule; their no-source measure is the blind attack (35.6% vs 26.7%). Recorded as the conv-hard-v2 precedent was (17/17 last-mentioned): makes items easier for a listener who tracks only the final change; grid direction was dealt 4 latest / 4 earlier. Key uniquely longest 6/28, shortest 7/28 kept.' },
  },
}
const p = new URL('../ledger.json', import.meta.url)
const l = JSON.parse(readFileSync(p, 'utf8'))
l.batches = l.batches.filter(b => b.id !== entry.id); l.batches.push(entry)
writeFileSync(p, JSON.stringify(l, null, 2) + '\n')
console.log('ledger batches', l.batches.length)
