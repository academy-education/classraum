# map-v2 Math batch 9: candidates dropped by the duplicate probe before feasibility (2026-10-30)

51 drafted in `candidates.json` (g5 18, g6 13, g7 1, g8 19). These 15 were dropped for a collision the probe found, or
because they re-propose a mechanism an earlier checker round already ruled on (those rulings bind). 36 went on to
`gen9.mjs`. "kw" = `mf30-kw.mjs` over `dump-b6` (3,986 live ISEE/SSAT/SAT/ACT rows + 2,517 prior maths rows; 153
queries, 3 per draft, every hit read in `probe-out.json` / `probe-stdout.txt`). "earlier" = `earlier-N-chains.json`
(431 entries: every earlier MAP Number Systems item, plus batch 7's and batch 8's items, mechanisms and dropped drafts).

| draft | g | idea | dropped because |
|---|---|---|---|
| S01 | 5 | area of a fractional border around a board | kw **MM2-G09** (MAP Geometry, prior v2): a mat with a 2-inch border left and right and 3-inch top and bottom, area of the photo = (outer side minus twice the border) multiplied. S01 is that chain plus outer area minus inner area, and Geometry. **SAT 59607aa6** (live) runs a uniform border backward |
| S05 | 5 | how much more fills a container that is f full | earlier **MMG-N04** (file only): "find 2/7 of the whole, subtract to find the remaining" is S05's whole chain, so S05 is a prefix with no step of its own (batch-5 R29 ruling). kw ISEE 207e7440, ISEE 9dd66412 (live: tank fraction full, liters added, capacity) |
| S06 | 5 | jar full and f full, weight of the empty jar | kw **SSAT b205095c** (live): "A jar full of honey weighs 900 grams. After 40 percent of the honey is poured out ... 660 grams. How many grams does the empty jar weigh?" Same chain. SAT SM28F-C02 (prior) runs it with two fill levels |
| S11 | 5 | net weight (full minus empty jar) times a price per kg | earlier **MV2-N56-14** (LIVE): subtract a decimal (7 - 0.4), then multiply by a decimal (6.6 x 3.75). Same two operations in the same order on the same kind of givens; MM4-N13 (weight x price) |
| S12 | 5 | two strips across a unit square: area left unshaded | kw **SSAT e3f3f363** (live): a 20 x 30 lawn crossed by two 2-metre paths, area not covered. Same inclusion-exclusion chain; decimals vs whole numbers is number type. (Its twin S10, "shaded by exactly one", needs the overlap removed twice and went on to feasibility; the checker should weigh it against this row) |
| S17 | 6 | u/v used, then L more, R left: the original amount | kw **MB2-O7E-16** (prior MAP b2, LIVE): "spent 3/8 of her money ... Then she spent $3.65 ... she had $20.05 left. How much money did Lucia have at first?" Exact chain. ISEE aeaeba9d (live) is the two-fraction version |
| S19 | 6 | a diver descends a further fraction of her depth | kw **MM3-N20** (prior MAP v3): a submarine at -17.4 m rises 2/3 of the way to the surface, then dives 4.8 m. S19 is its first step with the direction reversed, a prefix (R29). MV2-N7-07 (withdrawn) climbs 1/4 of the way |
| S27 | 8 | 0.aaa... + 0.bbb... with carries in every column | re-proposes **batch-5 C17** (BORDERLINE, binding: convert two repeating decimals and add over 99, against SSAT a175b647). kw SSAT 0b87f4b6 (live: 0.abab... + 0.baba...), SSAT a175b647 (live). The carry twist is a way of doing the same addition |
| S28 | 8 | 0.abab... + 0.cdcd... with a wrap-around carry | C17 exactly (two two-digit repeats added over 99), plus the two live SSAT rows above |
| S29 | 8 | a one-digit repeat minus a two-digit repeat | re-proposes **batch-5 R25** (REPEAT, binding: repeating decimal to a fraction, then subtract; MM2-N19 as first written) and C17 |
| S34 | 8 | k x (a x 10^m) + (b x 10^n) in standard form | earlier **MM2-N18** (file only): multiply into a scientific-notation quantity, write both with the same place value, combine. Adding instead of subtracting is the batch-5 C04 ruling ("one extra subtraction changes nothing"). MV2-N8-11 (withdrawn) is the product alone; MM2-N16 |
| S35 | 8 | the coefficient of a scientific-notation sum | earlier **MM2-N16** (file only) and **MB2-N78-14** (withdrawn): same power of 10, then add or subtract. Reading the coefficient off the renormalised sum adds no operation |
| S36 | 8 | a difference of negative powers of 10 in standard form | **MM2-N16** with negative exponents (number type) |
| S37 | 8 | 0.abab... = p/11: the decimal with the block reversed | the natural route is to convert 0.baba... directly, a sub-chain of **MV2-N8-14** (LIVE) with no step of its own (R29); the 1 - p/11 shortcut is optional. kw ACT 7d39df0a (live conversion) |
| S40 | 5 | relay: sum of three mixed numbers against a planned total | re-proposes **batch-5 C04** (REPEAT, binding: rename to a common denominator, add and subtract in one line, regroup; MM3-N05 stage0) |

Probe noise read and set aside (not collisions): S04/S39's "pyramid" hits (solid-geometry pyramids in ACT/SAT/ISEE,
none a number pyramid); S18 and S42's hits (a SAT statistics item on margins of error); S30's "least possible value"
hits (ACT 14838ea8 and SAT SM26L-B6, Diophantine and systems items); S05's and S20's earlier-list hits (the words
"full" and "reciprocal" in unrelated chains); S27/S28's ISEE 9679fb76 (a repeating sequence of integers).
