// builds MECHANISMS.md and mechanism-ids.json from candidates.json + feas-out.json + probe-out.json and the selection
// below (ONLY the writable, probe-clean mechanisms). Read-only over the data files. Refuses if a selected mechanism is
// missing from feas-out.json or has no reachable rank (it must not list an unwritable mechanism).
import { readFileSync, writeFileSync } from 'node:fs'
import { fmt } from '../math-b6/feas-lib.mjs'
const pj = o => JSON.stringify(o, (k, v) => typeof v === 'number' && !Number.isInteger(v) ? fmt(v) : v)
const W = '/Users/andylee/Downloads/saas/classraum/scripts/study-bank/map-v2-work/math-b8/'
const C = Object.fromEntries(JSON.parse(readFileSync(W + 'candidates.json', 'utf8')).map(c => [c.id, c]))
const F = JSON.parse(readFileSync(W + 'feas-out.json', 'utf8')), P = JSON.parse(readFileSync(W + 'probe-out.json', 'utf8'))
// [draft, generator id in gen8, family within batch 8, pointers for the checker (probe hits + items noticed; NOT a verdict), writing note]
const SEL = [
 ['Q01', 'Q01', 'none', 'B7-D09 (b7 mechanism, BORDERLINE: expanded form with fractional place values, next to MV2-N56-08 LIVE, which reads 10^3/10^2/10^1 and combines); MM3-N05, MM5-N01 (carry hundredths into tenths). kw: 0 hits.', 'Key is always the greatest option (rank 4 only).'],
 ['Q04', 'Q04', 'none', 'kw: 0 hits; earlier: no chain hit (regex matched only unrelated wording).', 'May be read as 6.RP (ratio of a set) rather than 5.NF; the checker should say.'],
 ['Q07', 'Q07', 'R (repair a total after an entry error): Q07, Q20', 'kw: 0 hits; earlier: 0 hits. Nearest by operation: MMG-N10 (undo a net change).', 'Rank 2 only.'],
 ['Q50', 'Q50', 'M (magic square): Q50, Q23', 'kw "magic square": 0 hits in 6,503 rows; earlier: 0. Each step is a missing addend (batch-5 R01 BORDERLINE, MM4-N24 stage0).', 'Area risk: a magic square may be read as Operations and Algebraic Thinking.'],
 ['Q14', 'Q14', 'I (interval overlap): Q14, Q22', 'kw: 0 hits; earlier: 0 chain hits. The final step is a distance across 0 (MV2-N7-03 LIVE, MM4-N16).', ''],
 ['Q47', 'Q47', 'F (number-line fold): Q47, Q26', 'kw: 0 fold hits. Near: MV2-N56-23 (halfway, then the opposite), b7 draft K35 (midpoint used backward, dropped: ISEE 7f018ffc, ACT 9513dc73), batch-5 C05 (distance to x = a), MAP Geometry MV2-G78-24 (reflections).', ''],
 ['Q16', 'Q16d', 'none', 'kw: 0 hits on "least product"; earlier: 0. Near: batch-5 C06 / MB5-N6-01 (rank by absolute value, add the two largest; slotted), C11 / MB5-N7-01 (sign by counting negatives).', 'Write with signed x.5 decimals (generator Q16d): every product ends in 25 or 75. The sevenths version passes only on mirrored sets with /49 mixed numbers. Rank 1 by definition.'],
 ['Q17', 'Q17', 'Z (closest to 0): Q17, Q27', 'kw: 0 hits on "closest to zero"; earlier: 0. Near: b7 D26 (REPEAT: greatest change between consecutive readings, SSAT 632f5043, ISEE f31d1f72), b7 family B (D08/D15/D25, distance from a benchmark).', 'Positives must end in 7 and negatives in 2 (or any fixed pair) so every adjacent sum shares its last digit.'],
 ['Q18', 'Q18', 'none', 'kw: 9 hits, all products of equation roots (ACT 2314a9de, ISEE 7d1c0baf, ...), none telescoping; earlier: 0. Near: batch-5 C11 / MB5-N7-01 (count negatives for the sign, pair factors into whole products).', ''],
 ['Q20', 'Q20', 'R: Q07, Q20', 'kw: 0 hits; earlier: 0. Near: batch-5 R08 / MB5-N7-02 (x - (-x) = 2x, slotted), MMG-N10 (undo a net change).', ''],
 ['Q22', 'Q22', 'I: Q14, Q22', 'as Q14.', ''],
 ['Q23', 'Q23', 'M: Q50, Q23', 'as Q50.', 'Area risk as Q50.'],
 ['Q24', 'Q24', 'none', 'kw: 0 hits ("when empty", "zero error", "scale & empty"); earlier: 0. The arithmetic is a signed sum (saturated family); the per-reading correction is the new step.', 'Offset must have no hundredths digit (e.g. -0.4, +0.3) so every error keeps the key\'s last digit.'],
 ['Q25', 'Q25', 'none', 'kw: 0 hits ("instead of multiplying/dividing"); earlier: 0. Near: batch-5 R19 (÷ n equals × 0.4), the missing-operand family M (R12/R16/R22/R30), MB5-N7-03.', 'f must not share a factor with R\'s denominator (f = -3/2 with R in sevenths works).'],
 ['Q26', 'Q26', 'F: Q47, Q26', 'as Q47.', ''],
 ['Q27', 'Q27', 'Z: Q17, Q27', 'kw: 0 hits; earlier regex hits (46) are the word "sign" in signed-sum chains, none a sign-choice optimisation.', 'Fix the first sign as + so the answer is unique.'],
 ['Q31', 'Q31', 'none', 'kw: MMG-N15 (prior MAP: x^3 = -0.216, then subtract a square root) and MM4-N39 solve x^3 = p directly with no isolation step; ACT c58b6e45 is a different cube-root equation. Near: MB5-N8-01 (LIVE, negative root after a reciprocal), batch-5 C21 (cube root then substitute).', 'Exactly three natural errors exist (adds c; drops the sign; both). In-area by precedent: MMG-N15 is a MAP Number Systems item.'],
]
const fams = {}
const blocks = SEL.map(([k, gid, fam, ptr, note], i) => {
  const c = C[k], f = F[gid]; if (!c) throw new Error('no candidate ' + k); if (!f || !f.ranks.length) { console.error(`REFUSING: ${k} (${gid}) is not writable in feas-out.json`); process.exit(2) }
  const id = 'E' + String(i + 1).padStart(2, '0'); if (fam !== 'none') { const f0 = fam[0]; fams[f0] ??= { label: null, ids: [] }; if (fam.includes('(')) fams[f0].label = fam.split(':')[0]; fams[f0].ids.push(id + ' (' + k + ')') }
  const ex = Object.values(f.examples).flat()[0]
  const pr = P[k]; if (!pr) { console.error(`REFUSING: ${k} has no probe output`); process.exit(2) }
  return `## ${id} — grade ${c.g}, ${c.ccss}

**Ask:** ${c.ask}

**Chain:** ${c.chain}

**Twist (what makes it non-routine):** ${c.twist}

**Pointers for the checker** (probe hits and items I noticed; not a novelty verdict): ${ptr}

**Probe** (mf30-kw over dump-b6, ${c.q.length} queries; earlier-N regex \`${c.e}\`): ${c.q.map(q => '`' + q.replace(/\|/g, '\\|') + '`').join(' ; ')}

**Feasibility** (\`gen8.mjs ${gid}\`, ${f.sets} parameter sets, key ranks reachable ${f.ranks.join(', ')}): ${ex.options[0]} (key); ${ex.options.slice(1).map((o, j) => `${o} (${ex.errors[j]})`).join('; ')}. Parameters ${pj(ex.params).replace(/\|/g, '/')}.

**Family within this batch:** ${fam}
${note ? `\n**Note:** ${note}\n` : ''}
<!-- draft id ${k} -->
`
})
const by = g => SEL.filter(s => C[s[0]].g === g).length
const head = `# map-v2 Math batch 8 (Number Systems only) — writable mechanisms for an independent chain check

Step 1 of 2, 2026-10-30. **No slot, brief or prereg exists yet; nothing here is approved.** MAP Math is capped at 5
forms by Real and Complex Number Systems (51 live, all live, 0 staged; ~10 per form, +9 needed for form 6). Batch 7
yielded one writable item (MB7-N7-01, D33) because 9 of its 10 NEW-or-least-shared chains failed the construction
rules. This round reverses the order: **feasibility was run before this list**, so every mechanism below has at least
one parameter set where the key and three natural errors pass FORM / LONE / HUB / RUN / PAIR / KEYPRINT / DPAIR / DSUM
(\`FEASIBILITY.md\`). Format follows \`../math-b7/MECHANISMS.md\`.

**The earlier list** is \`earlier-N-chains.json\`: **374 entries** = batch 7's 294 (every MAP Number Systems item in the
batch files and work folders, batches 1-5, and every DB row) + batch 7's two written items (MB7-N7-01, kept on disk;
MB7-N6-01, dropped as a near-duplicate of ISEE 5d6f2a16) + **batch 7's 40 checked mechanisms (D01-D40, each with the
checker's verdict)** + **batch 7's 38 probe-dropped drafts**, so a re-proposal collides in the probe. Built by
\`collect.mjs\` (read-only; it re-read the DB: 51 Number Systems rows, all live, none unmatched by a file entry).

**What was dropped before this list.** 50 drafted (\`candidates.json\`: g5 13, g6 12, g7 17, g8 8). \`probe.mjs\` ran
138 \`mf30-kw.mjs\` queries over \`dump-b6\` (3,986 live ISEE/SSAT/SAT/ACT + 2,517 prior rows; it refuses if the dump
header does not report those counts) plus a regex over the 374 earlier entries; every hit was read. **14 dropped for a
collision** (\`DROPPED.md\`): tiered pricing (ACT 05ec1073, SAT 2ca82d13, ACT 743310f5), grid-line paths (MAP Geometry
MMG-G04, MM3-G03, MV2-G56-10), climb-and-slip cycles (ISEE 01199b13), time zones (ISEE 1150b4e2), pooled sharing
(MMG-D04), (x - p)^2 = q (SAT 34ca9c91), x^2 + c = d negative root (MB5-N8-01), cube root of a product (MV2-N8-19),
digit reversal (ISEE 39f67f4e, SSAT e92f6fea), same volume as a cube (MB3-G6-02), and a b7 benchmark re-proposal
(B7-D08). **19 more were not writable** (\`FEASIBILITY.md\`, 13 of them FORM).

**This list holds only the 17 writable, probe-clean mechanisms.** Grade spread: g5 ${by(5)}, g6 ${by(6)}, g7 ${by(7)}, g8 ${by(8)}.

**Families within this batch** (pairs that share a chain or an ask; slot at most one of each):
${Object.values(fams).map(x => `- ${x.label}: ${x.ids.join(', ')}`).join('\n')}

Counting one per family, that is 12 distinct mechanisms (13 if Q17 and Q27 are judged different chains).

**No novelty rating is given.** Batch 7's ratings were the author's own check, which is what failed in batch 4. The
"pointers" in each block list what the probe surfaced and nearby items I noticed while drafting; they are not a
verdict, and the checker should search \`earlier-N-chains.json\` and \`dump-b6\` itself.

**Clusters fenced before drafting** (batch 4-7 briefs and checker rounds): single quotients, rounded-value asks,
scientific notation, single roots or powers as end keys, .5 x .5 products, the live signed add/subtract chains,
place-value x10 shifts (HUB), GCF/LCM counts (HUB), decimal roots (FORM), repeating decimals and nth digits, root
bracketing, exponent-law evaluation, the eight batch-5 slots (C06, C11, C25, R06, R08, R18, R27, R30), batch 7's
D01-D40, and count or whole-number keys under ~20 (\`../math-b7/FEASIBILITY.md\`).

**Area risks to check:** E04/E12 (magic squares may read as Operations and Algebraic Thinking), E02 (fraction of a set
may read as 6.RP), E17 (an equation, 8.EE.A.2; in-area by the MMG-N15 precedent).

`
writeFileSync(W + 'MECHANISMS.md', head + '\n' + blocks.join('\n'))
writeFileSync(W + 'mechanism-ids.json', JSON.stringify(SEL.map(([k, gid, fam], i) => ({ id: 'E' + String(i + 1).padStart(2, '0'), draft: k, generator: gid, grade: C[k].g, ccss: C[k].ccss, family: fam })), null, 1) + '\n')
console.log('written', SEL.length, 'g5', by(5), 'g6', by(6), 'g7', by(7), 'g8', by(8), 'families', JSON.stringify(Object.values(fams)))
