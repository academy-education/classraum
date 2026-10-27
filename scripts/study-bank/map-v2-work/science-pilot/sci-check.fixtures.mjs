/**
 * sci-check.fixtures.mjs: known-answer fixtures for `sci-check.mjs --selftest`. These are NOT bank items and are
 * never staged. They are written to exercise the checker: nine clean items, one per (kind, stimulus, format) shape the
 * pilot uses, each of which must PASS; and mutations, each of which must be REFUSED with the named check. A checker
 * that passes a mutation is broken, and a checker that refuses a clean fixture is too strict. Both are reported.
 */
const slot = (id, area, g, tier, dci, kind, stimulus, format, ask, key, rank) => ({
  id, area, g, tier, dci, kind, stimulus, format, ask, key, rank, invent: kind !== 'model', author: id.split('-')[1],
})
const RIT = { 5: { low: 'RIT 186-195', mid: 'RIT 196-205', high: 'RIT 206-215' }, 6: { low: 'RIT 189-198', mid: 'RIT 199-208', high: 'RIT 209-218' }, 7: { low: 'RIT 192-201', mid: 'RIT 202-211', high: 'RIT 212-221' }, 8: { low: 'RIT 195-204', mid: 'RIT 205-214', high: 'RIT 215-224' } }
const DIFF = { low: 'easy', mid: 'medium', high: 'hard' }
const S = [
  slot('FX-L-01', 'Life Science', 7, 'mid', 'LS2', 'data', 'table', 'values', 'difference', 'B', 2),
  slot('FX-P-01', 'Physical Science', 5, 'low', 'PS2', 'data', 'bar', 'conditions', 'greatest', 'C', 1),
  slot('FX-E-01', 'Earth and Space Science', 6, 'high', 'ESS2', 'data', 'line', 'values', 'read', 'D', 4),
  slot('FX-L-02', 'Life Science', 8, 'low', 'LS2', 'data', 'scatter', 'trend', 'decrease', 'A', 3),
  slot('FX-P-02', 'Physical Science', 7, 'high', 'PS3', 'investigation', 'procedure', 'variable', 'controlled', 'B', 4),
  slot('FX-E-02', 'Earth and Space Science', 5, 'mid', 'ESS2', 'investigation', 'procedure+table', 'conditions', 'controlled-pair', 'D', 2),
  slot('FX-L-03', 'Life Science', 6, 'high', 'LS1', 'investigation', 'procedure', 'claim', 'not-supported', 'C', 1),
  slot('FX-P-03', 'Physical Science', 8, 'mid', 'PS1', 'model', 'scenario', 'term', 'process', 'A', 2),
  slot('FX-E-03', 'Earth and Space Science', 7, 'low', 'ESS1', 'model', 'scenario', 'claim', 'explains', 'B', 3),
]
export const FIXTURE_SLOTS = Object.fromEntries(S.map(s => [s.id, s]))
const head = s => ({
  id: s.id, map_area: s.area, grade_target: s.g, tier: s.tier, difficulty: DIFF[s.tier], rit_band_target: RIT[s.g][s.tier],
  dci: s.dci, kind: s.kind, stimulus: s.stimulus, format: s.format, ask: s.ask, invented: s.invent,
})
const R = (choice, fault) => ({ choice, fault })

export const FIXTURES = [
  {
    ...head(S[0]), ngss_pe: 'MS-LS2-1', names_used: ['snail line T-3'], passage: null,
    graphic: { type: 'table', rowLabels: ['Pond 1', 'Pond 2', 'Pond 3', 'Pond 4'], colLabels: ['Water temperature (°C)', 'Snails counted'], cells: [[12, 40], [16, 52], [20, 61], [24, 58]], caption: 'Table 1. Counts of snail line T-3 in four ponds' },
    prompt: 'According to Table 1, how many more snails were counted in Pond 3 than in Pond 1?',
    choices: ['12 snails', '21 snails', '52 snails', '61 snails'], correct_answer: '21 snails',
    key_evidence: { refs: [[2, 1], [0, 1]], expr: 'v0 - v1' },
    explanation: 'Pond 3 has 61 snails and Pond 1 has 40, so the difference is 61 - 40 = 21.',
    distractor_rationales: [R('12 snails', 'subtracts Pond 1 from Pond 2 instead of Pond 3'), R('52 snails', 'reads the Pond 2 count and stops'), R('61 snails', 'reads the Pond 3 count without subtracting')],
    real_world_check: 'Population size of a species can differ between habitats with different conditions.',
  },
  {
    ...head(S[1]), ngss_pe: '3-PS2-1', names_used: ['cart K-2'], passage: null,
    graphic: { type: 'bar', bars: [{ label: 'Carpet', value: 35 }, { label: 'Sandpaper', value: 20 }, { label: 'Tile', value: 80 }, { label: 'Rubber mat strip', value: 50 }], xLabel: 'Surface', yLabel: 'Distance rolled (cm)', caption: 'Figure 1. How far cart K-2 rolled on four surfaces' },
    prompt: 'Students let cart K-2 roll off the same ramp onto four surfaces. Based on Figure 1, on which surface did the cart roll the farthest?',
    choices: ['Carpet', 'Sandpaper', 'Tile', 'Rubber mat strip'], correct_answer: 'Tile',
    key_evidence: { refs: ['Tile'] },
    explanation: 'The tallest bar in Figure 1 is the tile surface, at 80 cm.',
    distractor_rationales: [R('Carpet', 'its bar is only 35 cm tall'), R('Sandpaper', 'its bar is the shortest of all'), R('Rubber mat strip', 'second tallest bar, not the tallest')],
    real_world_check: 'Rougher surfaces exert more friction, so a rolling cart stops sooner on them.',
  },
  {
    ...head(S[2]), ngss_pe: 'MS-ESS2-2', names_used: ['Basin Orrin'], passage: null,
    graphic: { type: 'line', series: [{ points: [[0, 2], [2, 6], [4, 10], [6, 14]] }], xLabel: 'Time (hours)', yLabel: 'Sediment depth (mm)', caption: 'Figure 1. Sediment depth in Basin Orrin during a flood' },
    prompt: 'Based on Figure 1, what was the sediment depth in Basin Orrin at 4 hours?',
    choices: ['1 mm', '4 mm', '7 mm', '10 mm'], correct_answer: '10 mm',
    key_evidence: { refs: [[4, 10]], expr: 'v0' },
    explanation: 'The point plotted at 4 hours sits at a depth of 10 mm.',
    distractor_rationales: [R('1 mm', 'reads a value below the first plotted point'), R('4 mm', 'reports the time, 4 hours, as the depth'), R('7 mm', 'estimates halfway between two earlier points')],
    real_world_check: 'Moving water carries sediment and deposits it where the water slows down.',
  },
  {
    ...head(S[3]), ngss_pe: 'MS-LS2-1', names_used: ['beetle line Q'], passage: null,
    graphic: { type: 'scatter', points: [[1, 40], [2, 35], [3, 31], [4, 24], [5, 20], [6, 15]], xLabel: 'Weeks of drought', yLabel: 'Beetles (hundreds)', caption: 'Figure 1. Population of beetle line Q during a drought' },
    prompt: 'Based on Figure 1, how did the population of beetle line Q change as the drought went on?',
    choices: ['It decreased steadily, week after week.', 'It stayed the same.', 'It increased steadily as the drought went on.', 'It rose at first, then stayed level.'],
    correct_answer: 'It decreased steadily, week after week.',
    key_evidence: { refs: [[1, 40], [6, 15]] },
    explanation: 'Each later week has a lower point, from 40 hundred at week 1 down to 15 hundred at week 6.',
    distractor_rationales: [R('It stayed the same.', 'the points fall by about 25 hundred overall'), R('It increased steadily as the drought went on.', 'reverses the direction of the points'), R('It rose at first, then stayed level.', 'no point is higher than the one before it')],
    real_world_check: 'Populations shrink when a resource they need, such as water, becomes scarce.',
  },
  {
    ...head(S[4]), ngss_pe: 'MS-PS3-4', names_used: ['Substance M'],
    passage: 'Students tested how the mass of Substance M dissolved in water affects the final water temperature. They set out four foam cups and poured 200 mL of water into each one. Before each trial they checked that every cup started at the same starting temperature of the water, 20 °C. They then stirred 5 g, 10 g, 15 g or 20 g of Substance M into a cup and recorded the final water temperature after two minutes. Because the room was busy, the trials were run at a different time of day for each cup, one in the morning and three in the afternoon.',
    graphic: null,
    prompt: 'Which quantity did the students keep the same in every trial?',
    choices: ['mass of Substance M', 'starting temperature of the water', 'final water temperature', 'time of day'],
    correct_answer: 'starting temperature of the water',
    key_evidence: { refs: [{ quote: 'every cup started at the same starting temperature of the water' }] },
    explanation: 'The procedure says every cup began at 20 °C, so the starting temperature was held constant.',
    distractor_rationales: [R('mass of Substance M', 'it was changed on purpose from 5 g to 20 g'), R('final water temperature', 'it was measured as the result of each trial'), R('time of day', 'the passage says trials ran at different times')],
    real_world_check: 'A controlled variable is held constant so only the independent variable can change the result.',
  },
  {
    ...head(S[5]), ngss_pe: '4-ESS2-1', names_used: ['Lark Valley trays'],
    passage: 'Students built the Lark Valley trays to study how water wears away land. Each tray held one kind of ground cover. They tilted each tray, poured the same amount of water down it, and caught the soil that washed off the bottom. Then they dried and weighed the soil. Table 1 lists the slope of each tray and the mass of soil that washed away.',
    graphic: { type: 'table', rowLabels: ['Sand', 'Clay soil', 'Sand with moss', 'Clay soil with moss'], colLabels: ['Slope (degrees)', 'Soil washed away (g)'], cells: [[10, 40], [10, 25], [20, 15], [10, 8]], caption: 'Table 1. Soil washed from four trays' },
    prompt: 'To test only whether moss changes how much clay soil washes away, the tray of clay soil with moss should be compared with which tray?',
    choices: ['Sand', 'Sand with moss', 'Clay soil with moss', 'Clay soil'], correct_answer: 'Clay soil',
    key_evidence: { refs: [[1, 0], [3, 0]] },
    explanation: 'The clay soil tray has the same soil and the same 10-degree slope, so moss is the only difference.',
    distractor_rationales: [R('Sand', 'differs in both soil type and moss'), R('Sand with moss', 'differs in soil type and has a steeper slope'), R('Clay soil with moss', 'is the tray being tested, not a comparison')],
    real_world_check: 'Plant cover slows the movement of water and reduces erosion of soil.',
  },
  {
    ...head(S[6]), ngss_pe: 'MS-LS1-1', names_used: ['yeast strain Y-12'],
    passage: 'Students placed equal amounts of yeast strain Y-12 in four dishes of sugar water. Dishes 1 and 2 were kept warm and Dishes 3 and 4 were kept cool. After one hour, they counted the gas bubbles that had formed in each dish. The warm dishes made about three times as many bubbles as the cool dishes. Under a microscope, every sample still showed living yeast cells.',
    graphic: null,
    prompt: 'Which statement is NOT supported by the results?',
    choices: ['Warm dishes made more gas than cool dishes.', 'Living yeast cells were seen in all four dishes.', 'Cool-dish yeast died within the hour.', 'The two warm dishes gave similar results to each other.'],
    correct_answer: 'Cool-dish yeast died within the hour.',
    key_evidence: { refs: [{ quote: 'every sample still showed living yeast cells' }] },
    explanation: 'The microscope check found living cells in every sample, so the cool-dish yeast had not died.',
    distractor_rationales: [R('Warm dishes made more gas than cool dishes.', 'the warm dishes made three times as many bubbles'), R('Living yeast cells were seen in all four dishes.', 'the microscope check states exactly this'), R('The two warm dishes gave similar results to each other.', 'both warm dishes are reported together as similar')],
    real_world_check: 'Yeast cells are living organisms whose activity slows at cooler temperatures without dying.',
  },
  {
    ...head(S[7]), ngss_pe: 'MS-PS1-4', passage: null, graphic: null,
    prompt: 'On a hot day, drops of water form on the outside of a glass of iced juice. The glass is sealed, and no juice leaks out. Which process forms the drops?',
    choices: ['condensation', 'melting', 'dissolving in air', 'a chemical reaction'], correct_answer: 'condensation',
    explanation: 'Water vapor in the warm air cools when it touches the cold glass and changes to liquid water.',
    distractor_rationales: [R('melting', 'misconception: the drops are melted ice leaking through the glass'), R('dissolving in air', 'misconception: water appears out of nowhere when air dissolves'), R('a chemical reaction', 'misconception: a change of state is a new substance forming')],
    real_world_check: 'Water vapor condenses into liquid when it is cooled below its dew point.',
  },
  {
    ...head(S[8]), ngss_pe: 'MS-ESS1-1', passage: null, graphic: null,
    prompt: 'In June, cities in the Northern Hemisphere have long, warm days while cities in the Southern Hemisphere have short, cool days. Which statement best explains this difference?',
    choices: ['Earth is closer to the Sun in June.', "Earth's tilt aims the north more directly at the Sun.", 'The Sun gives off more energy in June each year.', 'Clouds block more sunlight over southern oceans in June.'],
    correct_answer: "Earth's tilt aims the north more directly at the Sun.",
    explanation: 'The tilted axis makes sunlight strike the Northern Hemisphere more directly in June, and the Southern less directly.',
    distractor_rationales: [R('Earth is closer to the Sun in June.', 'misconception: seasons come from distance; both hemispheres would warm together'), R('The Sun gives off more energy in June each year.', 'misconception: the Sun varies by season; again both hemispheres would match'), R('Clouds block more sunlight over southern oceans in June.', 'misconception: weather explains seasons; clouds cannot reverse day length')],
    real_world_check: "Seasons are caused by the tilt of Earth's axis relative to its orbit around the Sun.",
  },
]

const byId = (b, id) => b.find(x => x.id === id)
const setChoice = (it, from, to) => {
  it.choices = it.choices.map(c => (c === from ? to : c))
  if (it.correct_answer === from) it.correct_answer = to
  for (const d of it.distractor_rationales ?? []) if (d.choice === from) d.choice = to
}
export const MUTATIONS = [
  { name: 'key moved off its slot letter', on: 'FX-L-01', expect: 'SHAPE', mutate: it => { it.choices = ['21 snails', '12 snails', '52 snails', '61 snails'] } },
  { name: 'key not among the choices', on: 'FX-P-01', expect: 'SHAPE', mutate: it => { it.correct_answer = 'Tile floor' } },
  { name: 'duplicate options', on: 'FX-P-03', expect: 'SHAPE', mutate: it => { it.choices[1] = 'Condensation' } },
  { name: 'model fault names no misconception', on: 'FX-P-03', expect: 'SHAPE', mutate: it => { it.distractor_rationales[0].fault = 'the glass is sealed so nothing melts out' } },
  { name: 'value rank moved', on: 'FX-L-01', expect: 'RANK', mutate: it => setChoice(it, '12 snails', '30 snails') },
  { name: 'option lengths within 2 characters', on: 'FX-P-01', expect: 'RANK', mutate: it => setChoice(it, 'Carpet', 'Sandpapers') },
  { name: 'values options mix units', on: 'FX-E-01', expect: 'RANK', mutate: it => setChoice(it, '4 mm', '4 cm') },
  { name: 'two numeric options sum to a third', on: 'FX-L-01', expect: 'LEAK', mutate: it => setChoice(it, '52 snails', '33 snails') },
  { name: 'line chart with two series (no legend)', on: 'FX-E-01', expect: 'STIM', mutate: it => { it.graphic.series.push({ points: [[0, 1], [2, 3], [4, 5]] }) } },
  { name: 'ragged table row', on: 'FX-L-01', expect: 'STIM', mutate: it => { it.graphic.cells[0].pop() } },
  { name: 'svg graphic (not allowed in the pilot)', on: 'FX-L-01', expect: 'STIM', mutate: it => { it.graphic = { type: 'svg', svg: '<svg></svg>', caption: 'x' } } },
  { name: 'scenario item carries a passage', on: 'FX-P-03', expect: 'STIM', mutate: it => { it.passage = 'A glass of iced juice sits on a table on a hot day.' } },
  { name: 'procedure passage too short', on: 'FX-P-02', expect: 'STIM', mutate: it => { it.passage = 'Students dissolved Substance M in water and kept the starting temperature of the water, the time of day, the final water temperature and the mass of Substance M recorded.' } },
  { name: 'table larger than 8 x 4', on: 'FX-L-01', expect: 'STIM', mutate: it => { it.graphic.colLabels.push('a', 'b', 'c'); it.graphic.cells.forEach(r => r.push(1, 2, 3)) } },
  { name: 'values options too close on a drawn axis', on: 'FX-E-01', expect: 'READ', mutate: it => setChoice(it, '7 mm', '9 mm') },
  { name: 'values expr does not give the key', on: 'FX-L-01', expect: 'EVID', mutate: it => { it.key_evidence.expr = 'v0 + v1' } },
  { name: 'evidence ref to a bar that does not exist', on: 'FX-P-01', expect: 'EVID', mutate: it => { it.key_evidence.refs = ['Marble'] } },
  { name: 'evidence quote not in the passage', on: 'FX-P-02', expect: 'EVID', mutate: it => { it.key_evidence.refs = [{ quote: 'the cups were all kept at room temperature overnight' }] } },
  { name: 'invented item without key_evidence', on: 'FX-L-02', expect: 'EVID', mutate: it => { delete it.key_evidence } },
  { name: 'invented item without names_used', on: 'FX-L-02', expect: 'EVID', mutate: it => { it.names_used = [] } },
  { name: 'trend key direction contradicts the ask', on: 'FX-L-02', expect: 'FORMAT', mutate: it => setChoice(it, 'It decreased steadily, week after week.', 'It increased steadily, week after week.') },
  { name: 'conditions option absent from the stimulus', on: 'FX-P-01', expect: 'FORMAT', mutate: it => setChoice(it, 'Sandpaper', 'Gravel path') },
  { name: 'variable option not named in the procedure', on: 'FX-P-02', expect: 'FORMAT', mutate: it => setChoice(it, 'time of day', 'type of cup') },
  { name: 'claim option under 6 words', on: 'FX-L-03', expect: 'FORMAT', mutate: it => setChoice(it, 'Living yeast cells were seen in all four dishes.', 'Yeast lived.') },
  { name: 'term option over 5 words', on: 'FX-P-03', expect: 'FORMAT', mutate: it => setChoice(it, 'a chemical reaction', 'a chemical reaction between glass and air') },
  { name: 'caption prints the key', on: 'FX-E-01', expect: 'LEAK', mutate: it => { it.graphic.caption = 'Figure 1. Depth reached 10 mm at 4 hours' } },
  { name: 'explanation names an option letter', on: 'FX-L-01', expect: 'LEAK', mutate: it => { it.explanation = 'Choice B is right because 61 - 40 = 21.' } },
  { name: 'stem cites a line number', on: 'FX-P-02', expect: 'LEAK', mutate: it => { it.prompt = 'In line 3, which quantity did the students keep the same?' } },
  { name: 'key copies a passage span no distractor shares', on: 'FX-L-03', expect: 'LEAK', mutate: it => setChoice(it, 'Cool-dish yeast died within the hour.', 'Dishes 3 and 4 were kept cool, so their yeast died.') },
  { name: 'NGSS PE from the wrong grade band', on: 'FX-P-01', expect: 'SLOT', mutate: it => { it.ngss_pe = 'MS-PS2-1' } },
  { name: 'NGSS PE outside the slot DCI', on: 'FX-P-01', expect: 'SLOT', mutate: it => { it.ngss_pe = '4-PS3-1' } },
  { name: 'tier changed from the slot', on: 'FX-E-03', expect: 'SLOT', mutate: it => { it.tier = 'high'; it.difficulty = 'hard' } },
  { name: 'unknown slot id', on: 'FX-E-03', expect: 'SLOT', mutate: it => { it.id = 'FX-E-99' } },
  { name: 'near-duplicate of an excluded ACT stimulus', on: 'FX-L-03', expect: 'DUP', mutate: it => { it.passage = 'Steel coupons were immersed in aerated sodium chloride salt solution for fourteen days. Students measured the mass lost by each coupon to corrosion, comparing zinc and epoxy coating, oxygen in the solution, and the temperature. Each coupon started at the same mass and was cleaned and dried before weighing, and every solution was fresh and open to the air for all fourteen days of the test.' } },
  { name: 'invented name already in the exclusions', on: 'FX-L-01', expect: 'DUP', mutate: it => { it.names_used = ['steel coupons'] } },
]
export const BATCH_MUTATIONS = [
  { name: 'three keys are science cliches', expect: 'key a science cliche', mutate: b => { for (const id of ['FX-L-03', 'FX-E-03', 'FX-P-02']) { const it = byId(b, id); setChoice(it, it.correct_answer, `${it.correct_answer} It was a fair test.`) } } },
  { name: 'three keys share one 4-word phrase', expect: 'keys share the phrase', mutate: b => { for (const id of ['FX-L-03', 'FX-E-03', 'FX-L-02']) { const it = byId(b, id); setChoice(it, it.correct_answer, `${it.correct_answer} because of the warm weather`) } } },
  { name: 'lone absolute-free option is the key on 4 of 4', expect: 'lone absolute-free', mutate: b => { for (const id of ['FX-L-03', 'FX-E-03', 'FX-P-03', 'FX-L-02']) { const it = byId(b, id); for (const c of it.choices.filter(c => c !== it.correct_answer)) setChoice(it, c, `${c} always`) } } },
  { name: 'two authors invent the same name', expect: 'invented name', mutate: b => { byId(b, 'FX-P-01').names_used = ['snail line T-3'] } },
  { name: 'near-duplicate pair inside the batch', expect: 'near-duplicate', mutate: b => { byId(b, 'FX-L-03').passage = byId(b, 'FX-P-02').passage; byId(b, 'FX-L-03').prompt = byId(b, 'FX-P-02').prompt } },
  { name: 'a slot neither written nor marked empty', expect: 'neither written', mutate: b => { b.splice(b.findIndex(x => x.id === 'FX-E-02'), 1) } },
  { name: 'duplicate item ids', expect: 'duplicate item ids', mutate: b => { b.push(structuredClone(b[0])) } },
]
