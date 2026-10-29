# map-v2 Math batch 8: candidates dropped by the duplicate probe before feasibility (2026-10-30)

50 drafted in `candidates.json`. These 14 were dropped for a collision the probe found; 36 went on to `gen8.mjs`.
"kw" = `mf30-kw.mjs` over `dump-b6` (3,986 live ISEE/SSAT/SAT/ACT rows + 2,517 prior maths rows; 138 queries, every
hit read in `probe-out.json`). "earlier" = `earlier-N-chains.json` (374 entries: every earlier MAP Number Systems item,
plus batch 7's 2 items, 40 checked mechanisms and 38 probe-dropped drafts, so re-proposals collide).

| draft | g | idea | dropped because |
|---|---|---|---|
| Q08 | 5 | digit cards: the sum 0.ab + 0.cd closest to 1 | earlier **B7-D08** (b7 mechanism, checker NEW: pair of fraction sums closest to 1). Same benchmark-distance step (b7 family B: D08/D15/D25); a re-proposal of that family |
| Q09 | 5 | two groups share pizzas, then pool everything and share among all | kw **MMG-D04** (MAP Measurement/Data, prior; also DB 6400f8f2): "All the water is poured together and then shared equally among all of the beakers". Same pool-then-share chain. SSAT 7dbe7cd9 (live) also shares pooled loaves |
| Q38 | 5 | tiered price: first T kg at one rate, each additional kg at another; cost of W kg | kw **ACT 05ec1073** (live: first hour $5, each additional hour $3, the charge after the first hour), **ACT 1d281acd** (live taxi, first 1/5 mile then each additional) |
| Q53 | 6 | tiered price backward: amount paid -> quantity | kw **SAT 2ca82d13** (live: $6 for the first 2 hours, $2.50 each additional half hour, paid $28.50), **ACT 743310f5** (live: $8 first 3 lb, $1.25 each additional, charge $19.25), ACT 830d6f4a (live, overtime) |
| Q12 | 6 | taxicab (grid-line) distance between points in different quadrants | kw **MMG-G04**, **MM3-G03** (DB 81b3b35d) and **MV2-G56-10**: MAP Geometry items that walk along grid lines right then up and add the legs. Signs only add the across-axis step (MV2-N7-03). ISEE fdebedce (live) uses the same grid distance |
| Q52 | 6 | grid-line path that must touch the x-axis | same family as Q12 (MMG-G04, MM3-G03, MV2-G56-10); the axis constraint only adds \|y\| legs |
| Q49 | 6 | climber gains u by day, slips v by night: height after d days and one more climb | kw **ISEE 01199b13** (live: beetle climbs 12, slides back 9, which day it reaches the top). Same cycle-grouping chain; the changed ask needs no new operation |
| Q19 | 7 | repeated signed cycle (+u, -v) k times plus one more +u from a signed start | same cycle-grouping chain as ISEE 01199b13 (live); signed mixed numbers are number type |
| Q28 | 7 | signed UTC offsets, flight time, local arrival time with a 24-hour wrap | kw **ISEE 1150b4e2** (live: leaves Seoul 10:30, 13 h 20 min flight, New York 14 hours behind, local landing time); ACT 6cf5c7c4 (live) |
| Q32 | 8 | x^2 + c = d, x negative | earlier **MB5-N8-01** (LIVE): x^2 = 25 -> negative square root -> evaluate. Isolating the square replaces the reciprocal step; same family as slotted batch-5 R18 |
| Q43 | 8 | (x - p)^2 = q, the lesser solution | kw **SAT 34ca9c91** (live: every x with (x - 5)^2 = 36, added together); SAT 04cb2917 (live). Same two-roots-then-shift chain; picking the lesser root needs no new operation |
| Q33 | 8 | cube root of a product of two cube fractions | kw **MV2-N8-19** (prior MAP, dropped by graders: ∛(2^12 x 5^6) by splitting the product), MV2-N8-09 (withdrawn: √225 x ∛64); batch-5 C24 family |
| Q15 | 6 | a decimal and its digit reversal: their difference | kw **ISEE 39f67f4e** (live: reversed number subtracted from the original = 396), **SSAT e92f6fea**, SSAT f49d5766, SAT 1a8df508 (live digit-reversal differences). Number type ignored |
| Q36 | 8 | box with fractional edges has the same volume as a cube: the cube's edge | kw **MB3-G6-02** (MAP Geometry, LIVE: clay prism reshaped into a cube with the same volume, then surface area). Q36 is its prefix with no step of its own |

Probe noise read and set aside (not collisions): Q31's 72 polynomial hits (only MMG-N15 and MM4-N39, which solve
x^3 = p directly with no isolation step, are near); Q47/Q26's "crease" query matched "increase/decrease" (189 hits, none
a fold); Q16/Q29/Q40's "greatest possible value" hits (107: list-statistics and GCF items, none an optimisation over a
printed set of signed numbers); Q34's 22/7 hits (π used once, no comparison of two approximations); Q10's hits
(rational equations, ACT bc773760 a telescoping sum, none a continued fraction); Q18's hits (products of equation roots).
