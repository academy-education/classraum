# MAP Science batch 3 pilot: stage 0b duplicate review (2026-10-31, before any packet)

Inputs: `scratchpad/map-science-b3/sci-check-batch.txt` (in-batch XDUP: 72 cross-cell same-area pairs, 0 refused,
0 REVIEW) and `scratchpad/map-science-b3/probe-live.txt` (24 items x 245 live/staged rows + 224 batch-2 items, 3752
same-area pairs: **0 refused, 21 REVIEW**). Every REVIEW line is the stem route (same NGSS PE, >= 4 shared stem words),
which the prereg says is printed, never a pass. Each is answered below.

## Refusals resolved by rewriting BEFORE packets (stage 0, recorded so the history is visible)

The first probe run refused 9 items and printed 35 REVIEW lines. Each refusal, and each REVIEW line judged a real
duplicate, was resolved by writing a different system and question (never by rewording until the score dropped):

| item | first draft | collided with | rewritten to |
|---|---|---|---|
| L6-02 | strawberry runners vs seeds | live MSB1-L8-11 (runners vs seeds, key route); then aphids hit live MSB1-L7-03; potatoes hit b2 L8-13 | coral budding vs spawning |
| L7-02 | predator bird on an island, striped snails | staged MSB1-L8-16 (predator reaches island at gen 0, trait percent) | clover bitterness after a deer fence |
| L8-01 | algae oxygen vs light (plateau) | b2 L7-15 (same key "It rose, then leveled off.", words route) and in-batch L6-01 (photosynthesis twice) | moth response vs scent drops |
| L8-02 | UV time vs mutant yeast colonies | b2 L8-03 (UV time vs mutant ferns) and live MSP-L-07 (radiation dose vs mutants) | salt-pump mutation, survival vs salt |
| P5-02 | dark room, red ball | live MSB1-P5-14 (dark room, red apple); then pebble-and-leaf hit live MSB1-P5-20 | flashlight on a mirror at a slant |
| P6-02 | metal blocks on a hot plate; then wrapped hot cups; then lunch boxes | live MSB1-P6-17 / P8-17; live MSB1-P8-08 (wraps, words route); b2 P6-11 (lunch box) | ice in model houses with wall linings |
| P7-01 | kinetic energy of four carts | b2 P8-10 (kinetic energy of four rovers) | potential energy of a ball on four ledges (MS-PS3-2) |
| P7-02 | Powder + vinegar gas vs light | b2 P7-02 (Powder + vinegar gas) | two solutions turning blue vs light |
| P8-01 | rope amplitude; then guitar frequency | live MSP-P-05 (key "wave amplitude"); b2 P5-17 (key "wave frequency") | echo time gives the speed of sound |
| E5-01 | stream builds a fan by deposition | live MSB1-E5-12 (same, key "deposition of sediment") | tree roots split a boulder |
| E5-02 | coastal vs inland temperature range | b2 E5-16 (distance from ocean vs temperature range) | fire removes plants, rain carries more mud |
| E6-01 | fan distance vs evaporation | live MSP-E-08 (wind and evaporation), b2 E6-01 (evaporation covers) | balloon temperature vs height |
| E7-01 | ground cover in runoff trays | live MSB1-E7-11 (sloped runoff trays) | toy trees in a dust wind box |
| E7-02 | Moon phase a week after full | live MSP-E-05 (key route: Moon phases) | shortest day in the Southern Hemisphere |
| L6-01 | name "pondweed line H-4" | live MSB1-L6-07 key "Pondweed H" | renamed "pondweed line K-4" (question unchanged; see below) |

## The 21 remaining REVIEW lines

| b3 item | other row | judgement |
|---|---|---|
| L6-01 (pondweed bubbles, which quantity answers a photosynthesis-rate question) | live MSB1-L6-07 (four pondweed lines, which took in most CO2) | **not a duplicate**: different ask (dependent variable vs a conditions read), different measurement, different system design. Renamed to avoid the "H" echo |
| L7-02 (bitter clover after a deer fence, trend) | live MSB1-L7-01 (striped grasshoppers in cages, least change) | **not a duplicate**: different organism, trait, cause and ask |
| L7-02 | staged MSB1-L8-16 (lizard reaches island, long-legged grasshoppers, trend) | **not a duplicate after the rewrite**: no predator arrival, a plant trait, a removed (not added) selective agent. Same PE and same trend format, which the PE cannot avoid |
| L7-02 | b2 L7-03 (crabs and snail shells, NOT supported) | **not a duplicate**: different system and format |
| L7-02 | b2 L8-06 (pesticide resistance ratio) | **not a duplicate**: different system and format |
| L7-02 | b2 L8-07 (spotted beetles read) | **not a duplicate**: different system and format |
| L8-02 (salt-pump mutation, survival vs salt, interpolate) | live MSP-L-07 (radiation dose vs mutant seedlings, ratio) | **not a duplicate**: different cause (salt, not radiation), different ask |
| L8-02 | live MSB1-L7-17 (mutant enzyme activity vs temperature, trend) | **not a duplicate**: different protein and variable |
| L8-02 | live MSB1-L8-01 (mutant beetle pigment, best estimate of a percent) | **closest pair; judged not a duplicate**: both interpolate a percent for a mutant strain, but the protein (salt pump vs pigment), the organism and the varied factor differ, and the key is computed from different rows. Recorded for the graders' `b2_duplicate` (which only sees the packet) and for the audit |
| L8-02 | live MSB1-L6-09 (pigment protein vs day, trend) | **not a duplicate** |
| L8-02 | live MSB1-L8-17 (enzyme mutants, colonies vs activity, trend) | **not a duplicate** |
| L8-02 | b2 L6-03, L6-09, L7-07, L8-01, L8-03, L8-10, L8-16 (seven mutation items: worm muscle, bacteria and base, hamster hair, moth wing copies, UV ferns, algae light protein, copper bacteria) | **not duplicates**: none uses a salt-pumping protein or salt tolerance; b2 L8-03 (UV ferns) was the collision the first draft had, and it is gone |
| P6-02 (ice melted in model houses, bar read) | live MSB1-P7-01 (solar cookers warming, difference) | **not a duplicate**: heat in vs heat kept out, different device, different ask |
| P6-02 | b2 P6-11 (lunch box design meets two goals) | **not a duplicate after the rewrite**: the lunch-box draft was withdrawn; model houses with wall linings is a different device and a value read, not a criterion choice |
| P8-02 (equal pushes, loaded skateboard speeds up less) | b2 P7-05 (kicked ball slows from friction) | **not a duplicate**: mass vs acceleration, not friction |

Result: 21 of 21 answered; 0 judged duplicates remain. Stage 0b passes.
