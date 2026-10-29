// builds MECHANISMS.md from candidates.json + the hand-written selection below; read-only over the data files
import { readFileSync, writeFileSync } from 'node:fs'
const W = '/Users/andylee/Downloads/saas/classraum/scripts/study-bank/map-v2-work/math-b7/'
const C = Object.fromEntries(JSON.parse(readFileSync(W + 'candidates.json', 'utf8')).map(c => [c.id, c]))
const E = JSON.parse(readFileSync(W + 'earlier-N-chains.json', 'utf8'))
const L = JSON.parse(readFileSync('/Users/andylee/Downloads/saas/classraum/scratchpad/map-v2-math-work/dump-b6/live-maths.json', 'utf8'))
const P = JSON.parse(readFileSync('/Users/andylee/Downloads/saas/classraum/scratchpad/map-v2-math-work/dump-b6/prior-math.json', 'utf8'))
// [draft id, rating, closest-by-reading ids (earlier-N ids or live id prefixes), note]
const SEL = [
 ['K01','medium',['MM2-N06','MMG-N02','MM3-N04'],'MM2-N06 carries a decimal division past the remainder to hundredths (a quotient); no item asks for the leftover AMOUNT of a decimal division. HUB risk: count x portion and total - count x portion are linked; distractors should come from the count, not from multiples of the portion.'],
 ['K03','weak',['MMG-N03','MM4-N09','MV2-N56-17'],'MMG-N03 ends with a division by a unit fraction after a product; MM4-N09 is unit fraction ÷ whole. Whole ÷ unit fraction feeding a second division is not found, but each step is.'],
 ['K14','strong',['MMG-N03'],'No MAP, ISEE, SSAT, SAT or ACT item decomposes a fraction into unit fractions ("unit fraction" kw: 0 live hits). FORM: the answer is a whole number (sum of denominators); natural errors are other decompositions that repeat a unit fraction or are not unit fractions.'],
 ['K29','medium',['MM5-N03','MM4-N03'],'MM5-N03 (LIVE) counts numbers by rounding to tenths; this counts decimals above a FRACTION converted to a decimal (no rounding). The answer is a count.'],
 ['K34','medium',['MM3-N26','MMG-N07'],'No item counts scale factors greater than 1 without multiplying (5.NF.B.5a). FORM: answer is a count 0-4; K4 needs the distractor counts to come from real errors (counting factors equal to 1, counting a mixed number below 1).'],
 ['K38','medium',['MM4-N04','MM3-N05','MM5-N04'],'The arithmetic is fraction add/subtract (saturated), but no item computes the add-across misconception value (a+c)/(b+d) and measures it against the true sum. "mistake|error" kw: 0 live hits for fraction sums.'],
 ['M01','medium',['MM3-N02','MV2-N56-15'],'MM3-N02 is ONE sharing stage (14 ÷ 5 as whole pounds and fifths). Two stages, giving a ÷ (tables x people), are not found.'],
 ['M03','medium',['MM4-N03','MV2-N56-06'],'No item benchmarks fraction SUMS against 1; "closest to 1" kw: 0 hits. The near items are single sums.'],
 ['M04','medium',['MV2-N56-04','MM3-N05'],'No expanded-form item with unit-fraction place values (kw "expanded form": 0 hits). HUB RISK: placeholder errors are x10 / x0.1 siblings of the key (the batch-4 place-value block); the author must show a FORM-safe option set before writing.'],
 ['M13','medium',['MM5-N18','MM5P-N03'],'No item compares the four operations on the same decimals. The near items each do one decimal operation.'],
 ['M25','weak',['MM3-N03','MM3-N13','MMG-N03'],'MM3-N03 reports a remainder from long division; MM3-N13 adds leftovers after rounding up. Whole ÷ unit fraction then a remainder is the only new combination.'],
 ['M29','weak',['MM4-N13','MM2-N06','MM5P-N04'],'MM4-N13 multiplies a weight by a price per pound (then subtracts). The new step is converting ounces to a decimal part of a pound first.'],
 ['K04','medium',['MMG-N05','MB2-N56-16'],'LIVE ACT d802c785 asks the leftover CUPS after whole batches (5/6 cup per batch, 4 cups); LIVE ISEE 46c2321e is limiting supplies. This asks the leftover as a FRACTION OF A BATCH, where the leftover in cups is the natural distractor. The checker should decide whether the changed ask is a changed chain.'],
 ['K11','medium',['MM3-N24','MV2-N8-06'],'MM3-N24 reads one exponent from each of two single powers (2^a = 1/128, 3^b = 81). This reads three exponents out of the prime factorization of one composite number. LIVE SSAT c4f4813b (2^x = 3, 3^y = 4) is a different chain.'],
 ['K15','medium',['MM4-N31','MM4-N03'],'"closest to 1/2" kw: 0 hits. MM4-N31 compares squares with a target (roots); this compares |f - 1/2| across fractions on both sides of the benchmark.'],
 ['K41','medium',['MM4-N10','MM5P-N02','MM2-N02'],'MM4-N10 / MM5P-N02 multiply sides for an area. This divides an area by a side (fraction division) and feeds a perimeter with unlike denominators.'],
 ['M05','weak',['MV2-N56-04'],'LIVE SSAT 88303912 and ISEE a7a5db44 COUNT three-digit numbers divisible by 9 under a digit condition; this recovers one missing digit from the digit-sum rule. Same rule, different ask. Not a CCSS grade 6 standard by name; MAP places divisibility in Number Systems.'],
 ['M06','medium',[],'No hit for "prime numbers between" in any bank. Answer is a sum; natural errors include 1, an odd composite such as 51 or 57, or a missed prime.'],
 ['M16','medium',['MV2-N56-22','MM4-N19'],'No item counts true inequality/absolute-value statements about labeled points. FORM: answer is a count 0-4.'],
 ['P04','medium',['MMG-N12'],'No hit. May read as Operations and Algebraic Thinking rather than Number Systems; the checker should say which area it belongs to.'],
 ['P14','medium',['MM2-N09','MV2-N56-13'],'MM2-N09 uses "no common factor other than 1" inside a GCF-distributive chain; MV2-N56-13 (withdrawn) counts common factors. Counting relatively prime PAIRS is not found.'],
 ['K31','weak',['MMG-N02','MM3-N03'],'MMG-N02 applies dividend = divisor x quotient + remainder FORWARD (compute the dividend). This uses the identity to recover one missing dividend digit. The identity step is shared.'],
 ['K07','medium',['MMG-N08','MM2-N13','MV2-N7-19'],'Every earlier signed-rate item multiplies a rate by a time (MMG-N08, MM2-N13, MV2-N7-19 LIVE). This computes the rate from two signed readings, the inverse chain.'],
 ['K24','weak',['MV2-N56-02','MM3-N10'],'MV2-N56-02 (LIVE) has one distance defined as a fraction of another, then subtracts (positive values). This puts the relative move inside a signed net-position sum, the saturated signed-sum family.'],
 ['M09','medium',['MM4-N19'],'Batch 5 picked C06 (rank by absolute value from 0). This measures distance from a NONZERO signed reference, so values on both sides of the reference compete. Same family by the checker\'s "rank" rule? The checker should decide.'],
 ['M10','medium',['MM2-N14'],'No item takes consecutive differences of a signed sequence and compares their sizes.'],
 ['M15','weak',['MM3-N17'],'MM3-N17 sums signed changes then scales a share. A mean of signed fractions may be classed as Statistics, not Number Systems.'],
 ['M19','medium',[],'No hit. Thin: the insight is a hidden zero factor (3.5 - 7/2). FORM risk: a distractor set must come from not seeing the zero.'],
 ['M21','medium',['MM4-N24'],'No hit. Additive identity reasoning to pick one list element; not a missing-addend computation (the answer is a member of the list).'],
 ['M24','weak',['MM5P-N09','MM3-N17'],'MM5P-N09 adds a fraction of an amount to a negative balance; MM3-N17 finds one share of a signed total. This divides a signed debt, then takes a fraction of the share and subtracts. Close to both.'],
 ['M28','medium',['MM2-N14','MM3-N14'],'No item asks for the first time a signed running total crosses a value. LIVE SAT "first drop below" items are exponential decay, a different chain.'],
 ['M32','weak',[],'No hit. Thin (sign placement in a quotient); likely rated too easy for a grade 7 mid/high slot.'],
 ['P05','medium',[],'No hit. Iterating a signed multiply-then-add rule three times.'],
 ['K09','weak',['MM2-N17','MM2-N19','MM4-N36'],'Each power is evaluated in earlier items (MM2-N17, MM2-N19, MM4-N36). Ranking four such values and taking the range is the new ask; the batch-5 checker treated "evaluate two power terms and combine" as REPEAT (C24).'],
 ['K10','strong',[],'No hit for "perfect square/cube & smallest" in any bank. Prime factorization completed to a perfect power; natural errors are the full number, the square of the odd-exponent prime, and the product of all primes.'],
 ['M11','medium',['MM3-N09','MMG-N13'],'MM3-N09 reads "how many times as long" as division of two lengths. This takes the square root of an AREA ratio (a perfect-square fraction); the area ratio itself is the natural distractor.'],
 ['M12','weak',['MM4-N38','MM5-N40','MM2-N20'],'MM4-N38 / MM5-N40 rewrite bases as powers of 2 and combine exponents (batch-5 R13 BORDERLINE). This rewrites to compare, then picks the greatest.'],
 ['M22','medium',['MM4-N35'],'No item counts small cubes in a large cube via the cube of a fractional edge ratio. HUB RISK: the edge ratio, its square and its cube are derivationally linked options.'],
 ['M30','weak',['MM2-N20','MM4-N36','MM3-N23'],'Exponent-law family (saturated). The reciprocal-pairing collapse ((a/b)^n x (b/a)^(n-1) = a/b) is the only new step.'],
 ['P09','medium',['MM2-N16'],'No hit for trailing zeros in any bank. Answer is the smaller exponent of 2 and 5.']
]
const norm = s => String(s ?? '').replace(/\s+/g, ' ').trim()
const toks = s => new Set(norm(s).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(' ').filter(w => w.length > 2 && !['the','and','then','each','with','from','that','this','for','one','two','are','its','into'].includes(w)))
const jac = (a, b) => { let i = 0; for (const x of a) if (b.has(x)) i++; return i / (a.size + b.size - i || 1) }
const byId = id => E.filter(e => e.id === id)
const liveBy = pre => L.find(r => String(r.id).startsWith(pre)) ?? P.find(r => String(r.id).startsWith(pre))
let n = 0
const rating = {}
const blocks = SEL.map(([k, r, near, note]) => {
  const c = C[k]; if (!c) throw new Error('no candidate ' + k)
  n++; const id = 'D' + String(n).padStart(2, '0'); rating[r] = (rating[r] ?? 0) + 1
  const ct = toks(c.chain + ' ' + c.ask)
  const mech = E.map(e => ({ id: e.id, j: jac(ct, toks(e.chain + ' ' + e.prompt)) })).sort((a, b) => b.j - a.j)
  const top = []; for (const m of mech) { if (!top.find(t => t.id === m.id)) top.push(m); if (top.length === 3) break }
  const near3 = near.map(x => { const e = byId(x).sort((a, b) => jac(ct, toks(b.chain + ' ' + b.prompt)) - jac(ct, toks(a.chain + ' ' + a.prompt)))[0]; if (e) return `    ${e.id} | ${e.batch} | ${e.status} | g${e.grade ?? '?'}\n        chain: ${norm(e.chain)}\n        prompt: ${norm(e.prompt).slice(0, 170)}${norm(e.prompt).length > 170 ? ' ...' : ''}`
    const l = liveBy(x); return l ? `    ${x} | ${l.family ?? l.file} ${l.cohort ?? ''} | live/prior row\n        prompt: ${norm(l.prompt).slice(0, 170)} ...` : `    ${x} | (not found)` }).join('\n\n')
  return `## ${id} — grade ${c.g}, ${c.ccss} — rating: ${r}\n\n**Ask:** ${c.ask}\n\n**Chain:** ${c.chain}\n\n**Twist (what makes it non-routine):** ${c.twist}\n\n**Closest earlier MAP items by my reading:**\n\n${near3 || '    (none found by reading or by the probes)'}\n\n**Mechanical top 3:** ${top.map(t => `${t.id} (${t.j.toFixed(2)})`).join(', ')}\n\n**Probe (mf30-kw over dump-b6, live ISEE/SSAT/SAT/ACT + prior):** ${c.q.map(q => '`' + q + '`').join(' ; ')}\n\n**Note:** ${note}\n\n<!-- draft id ${k} -->\n`
})
const head = `# map-v2 Math batch 7 (Number Systems only) — candidate mechanisms for an independent chain check

Step 1 of 2, 2026-10-29. **No slot, brief or prereg exists yet; nothing here is approved.** MAP Math is capped at 5
forms by Real and Complex Number Systems (51 live, quota 10 per form). Batch 6 wrote no Number Systems item: its author
followed the batch-5 lesson that an independent checker must vet each MECHANISM before any item is written. This file
is that step 1, built for someone else to check, in the batch-5 format (\`../math-b5/MECHANISMS.md\`).

**The earlier list** is \`earlier-N-chains.json\`: 294 entries. It is batch 5's 285-entry list (every MAP Number
Systems item in the v1-v5p batch files and work-folder versions, batches 1, 2 and 4, and every DB row) plus batch 5's
own Number Systems items (12 item versions read, first-written and post-return), with every status refreshed from the
DB. Generated by \`collect.mjs\`, a read-only script; the DB holds 51 Number Systems rows, all live, none staged, and
none unmatched by a file entry. Batch 6 has no Number Systems items.

**What was dropped before this list, and why.** 78 candidates were drafted (\`candidates.json\`). Each went through
\`probe.mjs\`: every probe query through \`mf30-kw.mjs\` over \`dump-b6\` (3,986 live ISEE/SSAT/SAT/ACT rows + 2,517 prior
MAP and maths rows, every hit printed and read) and a regex over the 294 earlier chains. **38 were dropped for a
collision found by the probe** — for example divisor counts (SSAT 76f0c5df), distinct primes (ISEE 8422aa76, SSAT
4579a5ee), "of the way from" (ACT f25d6138, MV2-N7-07), midpoint backward (ISEE 7f018ffc, ACT 9513dc73), absolute-value
equations (64 live hits), -a^2 vs (-a)^2 (ISEE 1b31caad), counting irrationals (MM4-N35), halfway between fractions
(SSAT d9d17101), golf par (MV2-N7-04), product of roots (MM4-N33), tiling (MM3-N06), servings (MM2-N07), concatenated
digits (ISEE 48d506cf), alternating (-1)^n (ISEE b5a7e6e8), axis-parallel triangle perimeter (SSAT 2c808247), plus the
batch-5 families (R30 equal products, R24 additive inverse, the rank-and-combine family C06/R05/R17, number-line
reflections C08). The full drop list with reasons is \`DROPPED.md\`.

**How "closest" was chosen, and why it is not to be trusted on its own.** "Closest by my reading" is my judgment
from the probe output and the earlier list; "mechanical top 3" is a token-overlap score over chain + prompt text, which
misses chains described in different words (that is how batch 4's repeats got through). **The checker must search
\`earlier-N-chains.json\` and \`dump-b6\` itself.**

**Clusters excluded before drafting** (batch-4 and batch-5 briefs and checker rounds): a single quotient as the answer,
rounded-value asks, scientific-notation operations, a single root or power as an end key, .5 x .5 decimal products,
the signed add/subtract chains already live, place-value shifts (x10 / x0.1 siblings, refused by HUB), GCF/LCM
counts (HUB), decimal roots (FORM), repeating-decimal conversions and nth-digit items (batch-5 C09/C10/C17/C18/R11/R25),
root bracketing (C19/C20/R23), exponent-law evaluation (C14-C16/C23/C24/R28), and the eight mechanisms batch 5 already
slotted (C06, C11, C25, R06, R08, R18, R27, R30).

**My rating** is how likely the chain is new to MAP: strong / medium / weak. Of ${n}: ${['strong','medium','weak'].map(r => `${rating[r] ?? 0} ${r}`).join(', ')}.
Grade spread: g5 ${SEL.filter(s => C[s[0]].g === 5).length}, g6 ${SEL.filter(s => C[s[0]].g === 6).length}, g7 ${SEL.filter(s => C[s[0]].g === 7).length}, g8 ${SEL.filter(s => C[s[0]].g === 8).length}. Several
candidates are COUNT answers (${SEL.map((s, i) => ['K29','K34','M16','P14','P09'].includes(s[0]) ? 'D' + String(i + 1).padStart(2, '0') : null).filter(Boolean).join(', ')}); FORM and K4 decide whether a count can carry four
real-error options, which is not judged here. The HUB risks I can see are noted per row.

**Not checked here:** FORM, K4, HUB and the bracket constraints (they decide whether a NEW chain can be written, not
whether it is new), and the MAP area of ${['P04','M15'].map(k => 'D' + String(SEL.findIndex(s => s[0] === k) + 1).padStart(2, '0') + ' (' + k + ')').join(' and ')}, which may belong to Operations or Statistics.

`
writeFileSync(W + 'MECHANISMS.md', head + '\n' + blocks.join('\n'))
// mapping file for the checker and the brief-writer
writeFileSync(W + 'mechanism-ids.json', JSON.stringify(SEL.map(([k, r], i) => ({ id: 'D' + String(i + 1).padStart(2, '0'), draft: k, grade: C[k].g, ccss: C[k].ccss, rating: r })), null, 1) + '\n')
console.log('written', n, rating)
