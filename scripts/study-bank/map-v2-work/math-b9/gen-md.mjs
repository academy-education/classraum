// builds MECHANISMS.md and mechanism-ids.json from candidates.json + feas-out.json + probe-out.json and the selection
// below (ONLY the writable, probe-clean mechanisms). Read-only over the data files. Refuses if a selected mechanism is
// missing from feas-out.json, has no reachable rank, or has no probe output (it must not list an unwritable or unprobed
// mechanism).
import { readFileSync, writeFileSync } from 'node:fs'
import { fmt } from '../math-b6/feas-lib.mjs'
const pj = o => JSON.stringify(o, (k, v) => typeof v === 'number' && !Number.isInteger(v) ? fmt(v) ?? v : v)
const W = '/Users/andylee/Downloads/saas/classraum/scripts/study-bank/map-v2-work/math-b9/'
const C = Object.fromEntries(JSON.parse(readFileSync(W + 'candidates.json', 'utf8')).map(c => [c.id, c]))
const F = JSON.parse(readFileSync(W + 'feas-out.json', 'utf8')), P = JSON.parse(readFileSync(W + 'probe-out.json', 'utf8'))
// [draft, family within batch 9, pointers for the checker (probe hits + items noticed; NOT a verdict), writing note]
const SEL = [
 ['S02', 'W (fraction of a whole made of parts with different fractions): S02, S47', 'kw: 0 hits; earlier: 0. Near: B8-E02 (fraction of a set after a change; b8 checker: wrong area, 6.RP), MMG-N04 / MM4-N05 (a fraction of a remainder).', 'Area risk: a weighted part-of-part fraction may read as 6.RP or 7.SP rather than 5.NF.B.6. The weighted-average range [min rate, max rate] was modelled as a bound.'],
 ['S47', 'W: S02, S47', 'kw: 0 hits; earlier: 0. As S02, with the third part found by subtraction first.', 'Area risk as S02.'],
 ['S10', 'none', 'kw: 0 hits; earlier regex hits are interval overlaps (B8-E05/E11, REPEAT; a different operation). Near: SSAT e3f3f363 (live: the lawn NOT covered by two crossing paths); its twin S12 ("not shaded") was dropped for it. S10 asks for "exactly one", which removes the overlap twice.', 'Writable only with fraction strips (ninths gave 81sts; thirds and ninths gave 27ths). Area: 5.NF.B.4b area model; inclusion-exclusion may read as 7.SP.'],
 ['S15', 'R (extreme of a running total): S15, S48, S21', 'kw: 0 hits ("lowest balance", "running balance", "least ... during"); earlier: B7-D31 (BORDERLINE: cumulative signed sums, first crossing), B8-E10.', 'Transactions carry no hundredths, so every running balance keeps the start\'s hundredths digit. Stem asks for the least: an error below the key is required (DIR), and "start minus all the withdrawals" supplies it.'],
 ['S48', 'R: S15, S48, S21', 'as S15.', 'Eighths (terminating, so options print as 3-place decimals or as mixed numbers in eighths).'],
 ['S43', 'none (shares only the "keep those meeting a test, then add" ask shape with S55)', 'kw: 0 hits; earlier: B7-D04 (BORDERLINE: count decimals above a fraction benchmark), B7-D08 / B7-D15 (distance from a benchmark), batch-5 family K / C06 (select, then add).', 'One listed fraction equals 1/2 (2/4, 3/6 or 6/12) and must be left out.'],
 ['S14', 'none (S13 and S41, the three-point versions, are not writable)', 'kw: 0 hits ("least total distance", "meeting point", "sum of distances"); earlier: B8-Q21 (not writable). Near: MV2-N7-03 (LIVE: distance across 0), MM4-N19.', 'Rank 2 only. Points in eighths; the key prints as a 2-place decimal.'],
 ['S16', 'P (walk around a rectangle on the coordinate plane): S16, S49', 'kw: 0 hits; earlier: 0. Near: MM5-N16 (LIVE: side lengths across the axes, then the perimeter), MV2-N56-18 (LIVE).', 'Rank 3 only. The range [yb, yt] was modelled as a bound ("goes up after the corner" is struck by it).'],
 ['S49', 'P: S16, S49', 'as S16.', 'Rank 2 only. The range [xl, xr] was modelled as a bound.'],
 ['S21', 'R: S15, S48, S21', 'kw: 0 hits; earlier: 0. Signed version of S15; signed running sums are the saturated grade-7 family (MV2-N7-03, MM3-N18), the intermediate maximum is the new step.', 'Every option negative (SIGN). Stem asks for the greatest: an error above the key is required (DIR).'],
 ['S33', 'C (classify rational / irrational, then compute with the rationals): S33, S51', 'kw: 0 hits; earlier: B7-K17 (convert, order, take the third; b7 probe-dropped), B7-D29. Near: MM4-N35 (prior MAP v4: classify eight numbers and COUNT the irrational ones; the count ask is fenced).', 'Ranks 3 and 4 (an extreme rank is reachable).'],
 ['S51', 'C: S33, S51', 'kw: 0 hits; earlier: 0. Near: MM4-N35 (classification front end), B7-D34 (BORDERLINE: evaluate, rank, greatest minus least: the back half).', 'Rank 4 only.'],
 ['S55', 'none (ask shape shared with S43 only)', 'kw: 0 hits; earlier regex hits are noise (MB2-N78-16/18). Near: MV2-N8-01 (LIVE: evaluates -2^4, 2^-2 and 7^0 and combines them), B7-D34 (BORDERLINE), batch-5 C16 (REPEAT, SSAT f2276aab).', 'Fragile: one list of five powers passed (2^-3, (1/4)^3, 2^0, (1/2)^-1, (1/2)^-2; key 9/64), rank 2 only. Area/cluster risk: zero and negative exponent evaluation (8.EE.A.1) was fenced as "exponent-law evaluation" in b8; the selection step is what is new.'],
]
const fams = {}
const blocks = SEL.map(([k, fam, ptr, note], i) => {
  const c = C[k], f = F[k]; if (!c) throw new Error('no candidate ' + k); if (!f || !f.ranks.length) { console.error(`REFUSING: ${k} is not writable in feas-out.json`); process.exit(2) }
  const pr = P[k]; if (!pr) { console.error(`REFUSING: ${k} has no probe output`); process.exit(2) }
  const id = 'F' + String(i + 1).padStart(2, '0'); const f0 = fam.match(/^([A-Z])[ :]/)?.[1]; if (f0) { fams[f0] ??= { label: null, ids: [] }; if (fam.includes('(')) fams[f0].label = fam.split(':')[0]; fams[f0].ids.push(id + ' (' + k + ')') }
  const ex = Object.values(f.examples).flat()[0]
  return `## ${id} — grade ${c.g}, ${c.ccss}

**Ask:** ${c.ask}

**Chain:** ${c.chain}

**Twist (what makes it non-routine):** ${c.twist}

**Pointers for the checker** (probe hits and items I noticed; not a novelty verdict): ${ptr}

**Probe** (mf30-kw over dump-b6, ${c.q.length} queries; earlier-N regex \`${c.e}\`): ${c.q.map(q => '`' + q.replace(/\|/g, '\\|') + '`').join(' ; ')}

**Feasibility** (\`gen9.mjs ${k}\`, ${f.sets} parameter sets, key ranks reachable ${f.ranks.join(', ')}): ${ex.options[0]} (key); ${ex.options.slice(1).map((o, j) => `${o} (${ex.errors[j]})`).join('; ')}. Parameters ${pj(ex.params).replace(/\|/g, '/')}.

**Family within this batch:** ${fam}
${note ? `\n**Note:** ${note}\n` : ''}
<!-- draft id ${k} -->
`
})
const by = g => SEL.filter(s => C[s[0]].g === g).length
const all = Object.values(C), drafted = g => all.filter(c => c.g === g).length
const head = `# map-v2 Math batch 9 (Number Systems only) — writable mechanisms for an independent chain check

Step 1 of 2, 2026-10-30. **No slot, brief or prereg exists yet; nothing here is approved.** MAP Math needs +9 Number
Systems items for a sixth form; the pool holds 6 (b8's five PART OK items, all grade 6-7, plus MB7-N7-01). Grades 5
and 8 are empty, so this round aimed there. As in batch 8, **feasibility was run before this list**, so every
mechanism below has at least one parameter set where the key and three natural errors pass FORM / LONE / HUB / RUN /
PAIR / KEYPRINT / DPAIR / DSUM **and the batch-9 refusals** (\`FEASIBILITY.md\`): SIGN (every option shares the key's
sign), KGAP (the key is not n x a key-option gap for a printed n), DIR (under a least/greatest stem the key is not the
extreme option), NEAR (closest-to-T stems; unused here) and RANGE (a bound readable off the stem strikes at most one
distractor; batch 8 did not model the bound screen and lost E09 and E17 to it). Format follows \`../math-b8/MECHANISMS.md\`.

**The earlier list** is \`earlier-N-chains.json\`: **431 entries** = batch 8's 374 (every earlier MAP Number Systems
item, batch 7's items, 40 mechanisms and 38 dropped drafts) + **batch 8's 7 written items** (MB8-N7-01/02/03/05 and
MB8-N6-01 kept; MB8-N7-04 and MB8-N8-01 dropped) + **batch 8's 17 checked mechanisms (B8-E01..E17, each with the
checker's verdict)** + **batch 8's 33 other drafts** (14 probe-dropped, 19 not writable), so a re-proposal collides in
the probe. Built by \`collect.mjs\` (read-only; it re-read the DB: 51 Number Systems rows, all live, none unmatched).

**What was dropped before this list.** ${all.length} drafted (\`candidates.json\`: g5 ${drafted(5)}, g6 ${drafted(6)}, g7 ${drafted(7)}, g8 ${drafted(8)}). \`probe.mjs\`
ran 153 \`mf30-kw.mjs\` queries (3 per draft) over \`dump-b6\` (3,986 live ISEE/SSAT/SAT/ACT + 2,517 prior rows; it refuses if the dump
header does not report those counts) plus a regex over the 431 earlier entries; every hit was read. **15 dropped for a
collision or a binding earlier verdict** (\`DROPPED.md\`). **${all.length - 15 - SEL.length} more were not writable** (\`FEASIBILITY.md\`).

**This list holds only the ${SEL.length} writable, probe-clean mechanisms.** Grade spread: g5 ${by(5)}, g6 ${by(6)}, g7 ${by(7)}, g8 ${by(8)}.

**Families within this batch** (share a chain; slot at most one of each):
${Object.values(fams).map(x => `- ${x.label}: ${x.ids.join(', ')}`).join('\n')}
- F06 (S43) and F13 (S55) share only an ask shape ("keep the ones that pass a test, then add"); their tests differ
  (benchmark comparison vs evaluating zero and negative powers).

Counting one per family, that is **8 distinct mechanisms**: g5 4 (W, F03, R, F06), g6 2 (F07, P), g8 2 (C, F13); R
also covers g7 through F10.

**No novelty rating is given.** The "pointers" in each block list what the probe surfaced and nearby items I noticed
while drafting; they are not a verdict, and the checker should search \`earlier-N-chains.json\` and \`dump-b6\` itself.

**Clusters fenced before drafting** (batch 4-8 briefs and checker rounds): single quotients, rounded-value asks,
scientific notation (all three b9 sci-notation drafts collided with MM2-N16 / MM2-N18 and were dropped), single roots or
powers as end keys, .5 x .5 products, the live signed add/subtract chains, place-value x10 shifts (HUB), GCF/LCM counts
(HUB), decimal roots (FORM), repeating-decimal conversion (four b9 drafts dropped as batch-5 C17 / R25 or MV2-N8-14
re-proposals), nth digits, root bracketing, exponent-law evaluation, the eight batch-5 slots, batch 7's D01-D40, batch
8's E01-E17 and its dropped drafts, and count or whole-number keys under ~20.

**Area risks to check:** F01/F02 (weighted fraction of a whole may read as 6.RP / 7.SP), F03 (inclusion-exclusion may
read as 7.SP), F13 (zero/negative exponent evaluation, a fenced cluster), F08/F09 (a walk on the coordinate plane is
6.NS.C.8 but may read as Geometry).

`
writeFileSync(W + 'MECHANISMS.md', head + '\n' + blocks.join('\n'))
writeFileSync(W + 'mechanism-ids.json', JSON.stringify(SEL.map(([k, fam], i) => ({ id: 'F' + String(i + 1).padStart(2, '0'), draft: k, generator: k, grade: C[k].g, ccss: C[k].ccss, family: fam })), null, 1) + '\n')
console.log('written', SEL.length, 'g5', by(5), 'g6', by(6), 'g7', by(7), 'g8', by(8), 'drafted', all.length, JSON.stringify({ g5: drafted(5), g6: drafted(6), g7: drafted(7), g8: drafted(8) }), 'families', JSON.stringify(Object.values(fams)))
