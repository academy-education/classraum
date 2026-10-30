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

/* ===================== batch-1 rules (MAP-SCIENCE-B1.prereg.md) =====================
 * The B1 suite: the pilot fixtures rebuilt to pass the B1 rules (opaque condition labels, option_roles on variable
 * items, no lone qualifier, no lone absolute, prior_free on invented trend/values items), one new fixture
 * (an outcome-ask variable item), and mutations that each break exactly one B1 rule. Run with rules 'b1'. */
const B1 = structuredClone(FIXTURES)
const get = id => B1.find(x => x.id === id)
export const FIXTURE_SLOTS_B1 = structuredClone(FIXTURE_SLOTS)
FIXTURE_SLOTS_B1['FX-L-02'].rank = 2
FIXTURE_SLOTS_B1['FX-L-04'] = slot('FX-L-04', 'Life Science', 6, 'mid', 'LS1', 'investigation', 'procedure', 'variable', 'dependent', 'C', 4)

get('FX-L-01').prior_free = 'The standard says populations differ between habitats, not which pond holds more snails or by how much.'
get('FX-E-01').prior_free = 'The standard says water deposits sediment, not the depth this invented basin reached at a given hour.'
// FX-P-01: the pilot's bar labels named the surfaces themselves (settings); B1 labels are opaque track codes.
Object.assign(get('FX-P-01'), {
  passage: 'Students let cart K-2 roll off the same ramp onto four tracks, each covered with a different material.',
  graphic: { type: 'bar', bars: [{ label: 'Track T-2', value: 35 }, { label: 'Track QX-40', value: 20 }, { label: 'Track B', value: 80 }, { label: 'Track RVW-118', value: 50 }], xLabel: 'Track', yLabel: 'Distance rolled (cm)', caption: 'Figure 1. How far cart K-2 rolled on four tracks' },
  prompt: 'Based on Figure 1, on which track did cart K-2 roll the farthest?',
  choices: ['Track T-2', 'Track QX-40', 'Track B', 'Track RVW-118'], correct_answer: 'Track B',
  key_evidence: { refs: ['Track B'] },
  explanation: 'The tallest bar in Figure 1 belongs to Track B, at 80 cm.',
  distractor_rationales: [R('Track T-2', 'its bar is only 35 cm tall'), R('Track QX-40', 'its bar is the shortest of all'), R('Track RVW-118', 'second tallest bar, not the tallest')],
})
// FX-E-02: opaque tray codes; the settings live in table columns, never in the labels. "Lark Valley" carried a landform word (NAMEPROP).
Object.assign(get('FX-E-02'), {
  names_used: ['Lark Wenn trays'], passage: get('FX-E-02').passage.replace('Lark Valley trays', 'Lark Wenn trays'),
  graphic: { type: 'table', rowLabels: ['Tray K', 'Tray M-4', 'Tray QR-17', 'Tray ZWX-208'], colLabels: ['Soil', 'Moss', 'Slope (degrees)', 'Soil washed away (g)'], cells: [['clay', 'yes', 10, 8], ['clay', 'no', 10, 25], ['sand', 'no', 10, 40], ['sand', 'yes', 20, 15]], caption: 'Table 1. Soil washed from four trays' },
  prompt: 'To test only whether moss changes how much soil washes away, Tray K should be compared with which tray?',
  choices: ['Tray QR-17', 'Tray ZWX-208', 'Tray K', 'Tray M-4'], correct_answer: 'Tray M-4',
  key_evidence: { refs: [[0, 0], [1, 0], [0, 2], [1, 2]] },
  explanation: 'Tray M-4 has the same clay soil and the same 10-degree slope as Tray K and differs only in having no moss.',
  distractor_rationales: [R('Tray QR-17', 'differs in soil type as well as moss'), R('Tray ZWX-208', 'differs in soil type and slope, with moss on both'), R('Tray K', 'is the tray being tested, not a comparison')],
})
// FX-L-02: no qualifier on any option (the pilot key carried the only "steadily").
Object.assign(get('FX-L-02'), {
  choices: ['It dropped as the weeks went by.', 'It stayed the same.', 'It increased as the drought went on.', 'It rose at first and then stayed level.'],
  correct_answer: 'It dropped as the weeks went by.',
  distractor_rationales: [R('It stayed the same.', 'the points fall by about 25 hundred overall'), R('It increased as the drought went on.', 'reverses the direction of the points'), R('It rose at first and then stayed level.', 'no point is higher than the one before it')],
  prior_free: 'An invented beetle could gain or lose under drought; only these points show which, for this line.',
})
// FX-L-03: "all four dishes" was the lone absolute among the claims.
Object.assign(get('FX-L-03'), {
  choices: ['Warm dishes made more gas than cool dishes.', 'Living yeast cells were seen in each of the four dishes.', 'Cool-dish yeast died within the hour.', 'The two warm dishes gave about the same results.'],
  distractor_rationales: [R('Warm dishes made more gas than cool dishes.', 'the warm dishes made three times as many bubbles'), R('Living yeast cells were seen in each of the four dishes.', 'the microscope check states exactly this'), R('The two warm dishes gave about the same results.', 'both warm dishes are reported together as similar')],
})
// FX-P-02: a controlled ask takes setting options only ("final water temperature" was a free kill).
Object.assign(get('FX-P-02'), {
  passage: get('FX-P-02').passage + ' The stirring spoon that was used differed for each cup, picked at random from a drawer.',
  choices: ['mass of Substance M', 'starting temperature of the water', 'stirring spoon that was used', 'time of day'],
  option_roles: ['setting', 'setting', 'setting', 'setting'],
  distractor_rationales: [R('mass of Substance M', 'it was changed on purpose from 5 g to 20 g'), R('stirring spoon that was used', 'a different spoon was used for each cup'), R('time of day', 'the passage says trials ran at different times')],
})
B1.push({
  ...head(FIXTURE_SLOTS_B1['FX-L-04']), ngss_pe: 'MS-LS1-5', names_used: ['bean line V-9'],
  passage: 'Students grew bean line V-9 under four lamps, changing the lamp position above the tray for each one. Every tray got the same soil, the same seeds and the same amount of water given each morning. After ten days the students measured the height the stems grew in each tray. They also noted the number of leaves on each plant, but they did not record it because the leaves were still curled.',
  graphic: null,
  prompt: 'Which quantity was recorded as the result of this investigation?',
  choices: ['lamp position above the tray', 'number of leaves on each plant', 'the height the stems grew in each tray', 'amount of water given each morning'],
  correct_answer: 'the height the stems grew in each tray',
  option_roles: ['setting', 'result', 'result', 'setting'],
  key_evidence: { refs: [{ quote: 'measured the height the stems grew in each tray' }] },
  explanation: 'The students changed the lamp height and measured stem growth, so stem growth was the recorded result.',
  distractor_rationales: [R('lamp position above the tray', 'the lamp position was the setting they changed'), R('number of leaves on each plant', 'it was noted but not recorded'), R('amount of water given each morning', 'it was kept the same for every tray')],
  real_world_check: 'In an investigation the dependent variable is the quantity measured to see the effect of a change.',
})
export const FIXTURES_B1 = B1
const CARRIED_ON = new Set(['FX-L-01', 'FX-E-01', 'FX-P-03', 'FX-E-03'])
/** Pilot mutations on fixtures the B1 rebuild left untouched: every pilot check must still fire under B1 rules. */
export const MUTATIONS_B1_CARRIED = MUTATIONS.filter(m => CARRIED_ON.has(m.on))
export const MUTATIONS_B1 = [
  // QUAL
  { name: 'B1 trend key carries the lone qualifier', on: 'FX-L-02', expect: 'QUAL', mutate: it => setChoice(it, 'It dropped as the weeks went by.', 'It dropped steadily as the weeks went by.') },
  { name: 'B1 three of four trend options qualified', on: 'FX-L-02', expect: 'QUAL', mutate: it => { setChoice(it, 'It stayed the same.', 'It stayed about the same.'); setChoice(it, 'It increased as the drought went on.', 'It increased slightly as the drought went on.'); setChoice(it, 'It dropped as the weeks went by.', 'It dropped each week.') } },
  // ROLE
  { name: 'B1 outcome ask with the key the lone measured result', on: 'FX-L-04', expect: 'ROLE', mutate: it => { setChoice(it, 'number of leaves on each plant', 'kind of soil in the trays'); it.option_roles = ['setting', 'setting', 'result', 'setting'] } },
  { name: 'B1 controlled ask offers a measured result', on: 'FX-P-02', expect: 'ROLE', mutate: it => { it.passage += ' They recorded the final water temperature.'; setChoice(it, 'stirring spoon that was used', 'final water temperature'); it.option_roles = ['setting', 'setting', 'result', 'setting'] } },
  { name: 'B1 result-worded option tagged setting', on: 'FX-L-04', expect: 'ROLE "the height the stems grew in each tray" is worded as a measured result', mutate: it => { it.option_roles = ['result', 'result', 'setting', 'setting'] } },
  { name: 'B1 variable item without option_roles', on: 'FX-P-02', expect: 'ROLE', mutate: it => { delete it.option_roles } },
  // LABEL
  { name: 'B1 label lists several settings (E-04 shape)', on: 'FX-E-02', expect: 'LABEL', mutate: it => { it.graphic.rowLabels[2] = 'Sand, 10°'; setChoice(it, 'Tray QR-17', 'Sand, 10°') } },
  { name: 'B1 label with a lowercase descriptive word (L-03 shape)', on: 'FX-P-01', expect: 'LABEL', mutate: it => { it.graphic.bars[0].label = 'Track T-2 rough'; setChoice(it, 'Track T-2', 'Track T-2 rough'); it.distractor_rationales[0].choice = 'Track T-2 rough' } },
  { name: 'B1 label repeats a setting printed in the table', on: 'FX-E-02', expect: 'LABEL', mutate: it => { it.graphic.rowLabels[2] = 'Sand Tray'; setChoice(it, 'Tray QR-17', 'Sand Tray') } },
  { name: 'B1 label carries a number with a unit', on: 'FX-P-01', expect: 'LABEL', mutate: it => { it.graphic.bars[1].label = 'Track 40 cm'; setChoice(it, 'Track QX-40', 'Track 40 cm') } },
  { name: 'B1 label with no code token and not an invented name', on: 'FX-P-01', expect: 'LABEL', mutate: it => { it.graphic.bars[2].label = 'Tile'; setChoice(it, 'Track B', 'Tile'); it.key_evidence.refs = ['Tile'] } },
  // NAMEPROP
  { name: 'B1 invented name carries a property word (E-11 shape)', on: 'FX-E-01', expect: 'NAMEPROP', mutate: it => { it.names_used = ['Basin Orrin Low'] } },
  // ABS
  { name: 'B1 claim with a lone absolute distractor', on: 'FX-E-03', expect: 'ABS', mutate: it => setChoice(it, 'The Sun gives off more energy in June each year.', 'The Sun always gives off more energy in June.') },
  { name: 'B1 claim with a lone absolute-free key', on: 'FX-E-03', expect: 'ABS', mutate: it => { setChoice(it, 'Earth is closer to the Sun in June.', 'Earth is always closest to the Sun in June.'); setChoice(it, 'The Sun gives off more energy in June each year.', 'The Sun gives off more energy in every June.'); setChoice(it, 'Clouds block more sunlight over southern oceans in June.', 'Clouds block all extra sunlight over southern oceans in June.') } },
  // LAW
  { name: 'B1 invented trend item without prior_free', on: 'FX-L-02', expect: 'LAW', mutate: it => { delete it.prior_free } },
]
export const BATCH_MUTATIONS_B1 = [
  { name: 'B1 absolutes only on claim distractors', expect: 'absolutes appear on', mutate: b => {
    const e = byId(b, 'FX-E-03'); setChoice(e, 'Earth is closer to the Sun in June.', 'Earth is always closer to the Sun in June.'); setChoice(e, 'The Sun gives off more energy in June each year.', 'The Sun never gives off the same energy in June.')
    const l = byId(b, 'FX-L-03'); setChoice(l, 'Warm dishes made more gas than cool dishes.', 'Warm dishes always made more gas than cool dishes.'); setChoice(l, 'The two warm dishes gave about the same results.', 'The two warm dishes gave only the same results.')
  } },
]

/* ===================== batch-2 rules (MAP-SCIENCE-B2.prereg.md) =====================
 * The B2 suite: the B1 fixtures, with FX-E-01's line rebuilt so every x sits on a renderer tick (TICK), plus two
 * fixtures from a second author so the cross-author batch checks (XDUP) have pairs to compare. Run with rules 'b2'. */
const B2 = structuredClone(FIXTURES_B1)
const get2 = id => B2.find(x => x.id === id)
export const FIXTURE_SLOTS_B2 = structuredClone(FIXTURE_SLOTS_B1)
// ticks for x 0..8 are 0, 2, 4, 6, 8: every point is on one (the pilot fixture's 0..6 put 2 and 4 between ticks).
Object.assign(get2('FX-E-01'), {
  graphic: { type: 'line', series: [{ points: [[0, 2], [2, 6], [4, 10], [6, 14], [8, 18]] }], xLabel: 'Time (hours)', yLabel: 'Sediment depth (mm)', caption: 'Figure 1. Sediment depth in Basin Orrin during a flood' },
})
// b2 LSHAPE: condition labels share one shape (four invented names), never a padded code ladder.
Object.assign(get2('FX-P-01'), {
  names_used: ['cart K-2', 'Track Telford', 'Track Quill', 'Track Bo', 'Track Renwickton'],
  graphic: { type: 'bar', bars: [{ label: 'Track Telford', value: 35 }, { label: 'Track Quill', value: 20 }, { label: 'Track Bo', value: 80 }, { label: 'Track Renwickton', value: 50 }], xLabel: 'Track', yLabel: 'Distance rolled (cm)', caption: 'Figure 1. How far cart K-2 rolled on four tracks' },
  choices: ['Track Telford', 'Track Quill', 'Track Bo', 'Track Renwickton'], correct_answer: 'Track Bo',
  key_evidence: { refs: ['Track Bo'] },
  explanation: 'The tallest bar in Figure 1 belongs to Track Bo, at 80 cm.',
  distractor_rationales: [R('Track Telford', 'its bar is only 35 cm tall'), R('Track Quill', 'its bar is the shortest of all'), R('Track Renwickton', 'second tallest bar, not the tallest')],
})
Object.assign(get2('FX-E-02'), {
  names_used: ['Lark Wenn trays', 'Tray Kell', 'Tray Morrow', 'Tray Quillane', 'Tray Zennabrook'],
  graphic: { ...get2('FX-E-02').graphic, rowLabels: ['Tray Kell', 'Tray Morrow', 'Tray Quillane', 'Tray Zennabrook'] },
  prompt: 'To test only whether moss changes how much soil washes away, Tray Kell should be compared with which tray?',
  choices: ['Tray Quillane', 'Tray Zennabrook', 'Tray Kell', 'Tray Morrow'], correct_answer: 'Tray Morrow',
  explanation: 'Tray Morrow has the same clay soil and the same 10-degree slope as Tray Kell and differs only in having no moss.',
  distractor_rationales: [R('Tray Quillane', 'differs in soil type as well as moss'), R('Tray Zennabrook', 'differs in soil type and slope, with moss on both'), R('Tray Kell', 'is the tray being tested, not a comparison')],
})
FIXTURE_SLOTS_B2['FX-Q-01'] = slot('FX-Q-01', 'Life Science', 5, 'mid', 'LS4', 'model', 'scenario', 'claim', 'explains', 'D', 4)
FIXTURE_SLOTS_B2['FX-Q-02'] = slot('FX-Q-02', 'Earth and Space Science', 6, 'low', 'ESS3', 'model', 'scenario', 'term', 'process', 'A', 1)
B2.push({
  ...head(FIXTURE_SLOTS_B2['FX-Q-01']), ngss_pe: '3-LS4-2', passage: null, graphic: null,
  prompt: 'In a dry valley, cactus plants with thicker stems store more water and survive long droughts better than thin-stemmed ones. Stem thickness is inherited. Over many droughts, what most likely happens, and why?',
  choices: ['Thin stems grow thicker as each plant drinks a lot more.', 'Stems stay the same, since rain falls on each one.', 'Seeds from thin stems sprout fast after rain.', 'More cacti have thick stems, as thick-stemmed parents leave more young.'],
  correct_answer: 'More cacti have thick stems, as thick-stemmed parents leave more young.',
  explanation: 'Thick-stemmed plants survive droughts and reproduce more, so the inherited trait becomes more common.',
  distractor_rationales: [R('Thin stems grow thicker as each plant drinks a lot more.', 'misconception: traits acquired by effort are passed on'), R('Stems stay the same, since rain falls on each one.', 'misconception: variation does not affect survival'), R('Seeds from thin stems sprout fast after rain.', 'misconception: an unrelated advantage decides the trait')],
  real_world_check: 'Inherited traits that improve survival become more common in a population over generations.',
})
B2.push({
  ...head(FIXTURE_SLOTS_B2['FX-Q-02']), ngss_pe: 'MS-ESS3-1', passage: null, graphic: null,
  prompt: 'Over millions of years, layers of dead ocean plankton were buried under mud, heated and squeezed. Which process formed the oil now pumped from those rocks?',
  choices: ['fossilization', 'weathering of granite', 'evaporation of seawater', 'cooling of hot lava flows'],
  correct_answer: 'fossilization',
  explanation: 'Buried organic remains are slowly changed by heat and pressure into oil, a fossil fuel.',
  distractor_rationales: [R('weathering of granite', 'misconception: oil comes from broken-down rock'), R('evaporation of seawater', 'misconception: oil is left behind like salt'), R('cooling of hot lava flows', 'misconception: oil is a volcanic product')],
  real_world_check: 'Petroleum forms from buried marine organisms altered by heat and pressure over geologic time.',
})
export const FIXTURES_B2 = B2
/** Every B1 mutation except those on the three fixtures rebuilt for b2 still fires under b2. */
export const REBUILT_B2 = new Set(['FX-E-01', 'FX-P-01', 'FX-E-02'])
export const MUTATIONS_B2_CARRIED = [...MUTATIONS_B1_CARRIED, ...MUTATIONS_B1].filter(m => !REBUILT_B2.has(m.on))
export const MUTATIONS_B2 = [
  // the B1 LABEL mutations, re-aimed at the rebuilt name labels
  { name: 'B1 label lists several settings, b2 labels', on: 'FX-E-02', expect: 'LABEL', mutate: it => { it.graphic.rowLabels[2] = 'Sand, 10°'; setChoice(it, 'Tray Quillane', 'Sand, 10°') } },
  { name: 'B1 label with a lowercase descriptive word, b2 labels', on: 'FX-P-01', expect: 'LABEL', mutate: it => { it.graphic.bars[0].label = 'Track Telford rough'; setChoice(it, 'Track Telford', 'Track Telford rough') } },
  { name: 'B1 label repeats a table setting, b2 labels', on: 'FX-E-02', expect: 'LABEL', mutate: it => { it.graphic.rowLabels[2] = 'Sand Tray'; setChoice(it, 'Tray Quillane', 'Sand Tray') } },
  { name: 'B1 label carries a number with a unit, b2 labels', on: 'FX-P-01', expect: 'LABEL', mutate: it => { it.graphic.bars[1].label = 'Track 40 cm'; setChoice(it, 'Track Quill', 'Track 40 cm') } },
  { name: 'B1 label with no code and not a name, b2 labels', on: 'FX-P-01', expect: 'LABEL', mutate: it => { it.graphic.bars[2].label = 'Tile'; setChoice(it, 'Track Bo', 'Tile'); it.key_evidence.refs = ['Tile'] } },
  { name: 'B1 invented name carries a property word, on a b2 fixture', on: 'FX-L-01', expect: 'NAMEPROP', mutate: it => { it.names_used = ['snail line Marsh T-3'] } },
  { name: 'B2 "invented" in a student-facing passage (E6-07 shape)', on: 'FX-L-03', expect: 'INVENTED', mutate: it => { it.passage = it.passage.replace('yeast strain Y-12', 'an invented yeast, strain Y-12') } },
  { name: 'B2 "invented" in a table caption', on: 'FX-L-01', expect: 'INVENTED', mutate: it => { it.graphic.caption = 'Table 1. Counts of the invented snail line T-3' } },
  { name: 'B2 key is the lone label shape (E6 LHG-207 shape)', on: 'FX-E-02', expect: 'LSHAPE', mutate: it => {
    it.graphic.rowLabels = ['Tray K', 'Tray LHG-207', 'Tray Q-1', 'Tray ZW-28']; it.choices = ['Tray Q-1', 'Tray ZW-28', 'Tray K', 'Tray LHG-207']; it.correct_answer = 'Tray LHG-207'
    it.prompt = it.prompt.replace('Tray Kell', 'Tray K'); it.distractor_rationales = [R('Tray Q-1', 'differs in soil type as well as moss'), R('Tray ZW-28', 'differs in soil type and slope'), R('Tray K', 'is the tray being tested')] } },
  { name: 'B2 line point between x ticks (L8-16 kink shape)', on: 'FX-E-01', expect: 'TICK', mutate: it => { it.graphic.series[0].points = [[0, 2], [10, 6], [20, 10], [30, 14], [40, 18], [50, 18]]; it.key_evidence.refs = [[20, 10]] } },
]
export const BATCH_MUTATIONS_B2 = [
  { name: 'B2 cross-author duplicate topic (B1-A2 shape)', expect: 'XDUP ', mutate: b => { const q = byId(b, 'FX-Q-01'), l = byId(b, 'FX-L-03'); q.prompt = l.passage.slice(0, 300) + ' ' + l.prompt; q.choices = [...l.choices.slice(0, 3), q.correct_answer] } },
  { name: 'B2 two items key the same claim in one area', expect: 'KEYDUP ', mutate: b => { const q = byId(b, 'FX-Q-01'), l = byId(b, 'FX-L-03'); q.choices[3] = l.correct_answer; q.correct_answer = l.correct_answer } },
  { name: 'B2 one author uses a stock misconception twice', expect: 'MISC ', mutate: b => { const q = byId(b, 'FX-Q-01'); q.choices[0] = 'Thin stems grew thicker during their lives.'; q.distractor_rationales[0].choice = q.choices[0]; const q2 = byId(b, 'FX-Q-02'); q2.choices[2] = 'oil changed during its life' } },
]

/* ===================== batch-3 rules (MAP-SCIENCE-B3.prereg.md) =====================
 * The B3 suite: the B2 fixtures with the four that a b3 check would refuse rebuilt (FX-L-02 trend options in one
 * frame; FX-P-02 and FX-L-04 procedures that describe what was done without stating any role; FX-Q-01 claims with no
 * lone reason or degree word; FX-E-03's key no longer echoing "Northern"), plus five new fixtures so every b3 check
 * has a shape to fire on: an interpolation (FX-L-05), a bar read (FX-P-05), a definition-in-stem term (FX-E-05) and a
 * second Life variable item (FX-L-06, so VARTPL has a same-area pair). Each b3 mutation reproduces the batch-2 item its
 * graders named. Run with rules 'b3'. */
const B3 = structuredClone(FIXTURES_B2)
const get3 = id => B3.find(x => x.id === id)
export const FIXTURE_SLOTS_B3 = structuredClone(FIXTURE_SLOTS_B2)
Object.assign(get3('FX-L-02'), {
  choices: ['It decreased.', 'It rose.', 'It stayed the same.', 'It rose, then leveled off.'],
  correct_answer: 'It decreased.',
  distractor_rationales: [R('It rose.', 'reverses the direction of the points'), R('It stayed the same.', 'the points fall by about 25 hundred overall'), R('It rose, then leveled off.', 'no point is higher than the one before it')],
})
Object.assign(get3('FX-P-02'), {
  passage: 'Students tested how dissolving Substance M affects the temperature of water. They set out four foam cups and poured 200 mL of water into each one. A thermometer read a starting temperature of the water of 20 °C in all four cups. The mass of Substance M stirred into the cups was 5 g, 10 g, 15 g or 20 g. The stirring spoon that was used came from a drawer at random for each cup. One cup was tested in the morning and three after lunch, whenever the time of day suited the class. They read the thermometer two minutes after stirring.',
  key_evidence: { refs: [{ quote: 'a starting temperature of the water of 20 °C in all four cups' }] },
  explanation: 'The thermometer read 20 °C in all four cups before stirring, so the starting temperature was held at one value.',
  distractor_rationales: [R('mass of Substance M', 'it ran from 5 g to 20 g across the cups'), R('stirring spoon that was used', 'a spoon was picked at random for each cup'), R('time of day', 'one cup was tested in the morning and three after lunch')],
})
Object.assign(get3('FX-L-04'), {
  passage: 'Students grew bean line V-9 in four trays under four lamps. The lamp position above the tray was 10 cm, 20 cm, 30 cm or 40 cm. A helper poured the amount of water given each morning, 50 mL, into all four trays. The trays sat in one row on a shelf by the classroom door. After ten days the students measured the height the stems grew in each tray with a ruler, and they wrote down the number of leaves on each plant.',
  prompt: 'The students wanted to know whether the lamp position affects how tall the bean stems get. Which quantity answers their question?',
  key_evidence: { refs: [{ quote: 'measured the height the stems grew in each tray' }] },
  explanation: 'The question is about how tall the stems get, so the stem height measured in each tray answers it.',
  distractor_rationales: [R('lamp position above the tray', 'this is what the students set for each tray'), R('number of leaves on each plant', 'it was measured but it does not tell how tall the stems got'), R('amount of water given each morning', 'it was 50 mL for all four trays')],
})
FIXTURE_SLOTS_B3['FX-Q-01'] = FIXTURE_SLOTS_B2['FX-Q-01']
Object.assign(get3('FX-Q-01'), {
  prompt: 'In a dry valley, cactus plants with thicker stems store more water and survive long droughts better than thin-stemmed ones. Stem thickness is inherited. Over many droughts, what most likely happens to the cactus population?',
  choices: ['Each thin stem grows thicker to hold water.', 'Stem thickness stays as it was.', 'Thin-stemmed cacti start to make bigger seeds.', 'More of the cacti across the area have thick stems.'],
  correct_answer: 'More of the cacti across the area have thick stems.',
  distractor_rationales: [R('Each thin stem grows thicker to hold water.', 'misconception: traits acquired during a lifetime are inherited'), R('Stem thickness stays as it was.', 'misconception: variation does not affect survival'), R('Thin-stemmed cacti start to make bigger seeds.', 'misconception: an unrelated advantage decides the trait')],
})
setChoice(get3('FX-E-03'), "Earth's tilt aims the north more directly at the Sun.", "Earth's tilt aims the top half more toward the Sun.")
get3('FX-E-03').explanation = 'The tilted axis makes sunlight strike the top half of Earth more directly in June, and the bottom half less directly.'
FIXTURE_SLOTS_B3['FX-L-05'] = slot('FX-L-05', 'Life Science', 6, 'mid', 'LS1', 'investigation', 'procedure+table', 'values', 'interpolate', 'C', 2)
FIXTURE_SLOTS_B3['FX-P-05'] = slot('FX-P-05', 'Physical Science', 5, 'low', 'PS2', 'data', 'bar', 'values', 'read', 'B', 3)
FIXTURE_SLOTS_B3['FX-E-05'] = slot('FX-E-05', 'Earth and Space Science', 7, 'mid', 'ESS2', 'model', 'scenario', 'term', 'example', 'A', 3)
FIXTURE_SLOTS_B3['FX-L-06'] = slot('FX-L-06', 'Life Science', 8, 'high', 'LS1', 'investigation', 'procedure', 'variable', 'independent', 'D', 1)
B3.push({
  ...head(FIXTURE_SLOTS_B3['FX-L-05']), ngss_pe: 'MS-LS1-6', names_used: ['bean line G-3', 'Tray Gill', 'Tray Hask', 'Tray Jory', 'Tray Kemp'],
  passage: 'Students grew seedlings of bean line G-3 in four trays under grow lamps. Each tray got a different number of hours of lamp light per day, and the students watered every tray the same way. After 14 days they measured the height of the tallest seedling in each tray. Table 1 shows their results. The class then wanted to predict the height for a number of hours they had not tested.',
  graphic: { type: 'table', rowLabels: ['Tray Gill', 'Tray Hask', 'Tray Jory', 'Tray Kemp'], colLabels: ['Light per day (hours)', 'Height after 14 days (cm)'], cells: [[3, 6], [7, 14], [11, 18], [15, 19]], caption: 'Table 1. Seedling height of bean line G-3' },
  prompt: 'Based on Table 1, about how tall would the tallest seedling most likely be after 14 days with 9 hours of light per day?',
  choices: ['18 cm', '22 cm', '16 cm', '11 cm'], correct_answer: '16 cm',
  key_evidence: { refs: [[1, 1], [2, 1]], expr: '(v0 + v1) / 2' },
  explanation: '9 hours sits halfway between 7 hours (14 cm) and 11 hours (18 cm), so the height is about 16 cm.',
  distractor_rationales: [R('18 cm', 'reads the 11-hour row instead of estimating between rows'), R('22 cm', 'continues the early rise past the table values'), R('11 cm', 'estimates between the 3-hour and 7-hour rows')],
  real_world_check: 'Plants use light energy to make food, so more light usually means more growth up to a limit.',
  prior_free: 'The standard says plants need light, not how tall this bean line grows at 9 hours of light.',
})
B3.push({
  ...head(FIXTURE_SLOTS_B3['FX-P-05']), ngss_pe: '3-PS2-1', names_used: ['Spring Abel', 'Spring Brede', 'Spring Cole', 'Spring Dunmore'],
  passage: 'Students hung the same toy weight from four springs and measured how far each spring stretched.',
  graphic: { type: 'bar', bars: [{ label: 'Spring Abel', value: 12 }, { label: 'Spring Brede', value: 28 }, { label: 'Spring Cole', value: 40 }, { label: 'Spring Dunmore', value: 20 }], xLabel: 'Spring', yLabel: 'Stretch (cm)', caption: 'Figure 1. Stretch of four springs under one weight' },
  prompt: 'Based on Figure 1, about how far did Spring Brede stretch?',
  choices: ['14 cm', '28 cm', '40 cm', '21 cm'], correct_answer: '28 cm',
  key_evidence: { refs: ['Spring Brede'], expr: 'v0' },
  explanation: 'The Spring Brede bar ends a little below the 30 cm tick, at about 28 cm.',
  distractor_rationales: [R('14 cm', 'reads the bar for Spring Abel'), R('40 cm', 'reads the tallest bar, Spring Cole'), R('21 cm', 'reads the bar for Spring Dunmore')],
  real_world_check: 'A force stretches a spring, and different springs stretch different amounts under the same force.',
  prior_free: 'Nothing in the standard says how far this invented spring stretches; only the bar shows it.',
})
B3.push({
  ...head(FIXTURE_SLOTS_B3['FX-E-05']), ngss_pe: 'MS-ESS2-1', passage: null, graphic: null,
  prompt: 'Weathering is the breaking of rock into smaller pieces where the rock sits. Which of these is an example of weathering?',
  choices: ['ice splitting a boulder', 'lava hardening', 'wind lifting dust', 'mud settling on a lakebed'], correct_answer: 'ice splitting a boulder',
  explanation: 'Water freezes in cracks and expands, splitting the boulder in place, which is weathering.',
  distractor_rationales: [R('lava hardening', 'misconception: any rock change is weathering; this forms new rock'), R('wind lifting dust', 'misconception: moving pieces away is weathering; it is erosion'), R('mud settling on a lakebed', 'misconception: laying down sediment is weathering; it is deposition')],
  real_world_check: 'Frost wedging breaks rock apart in place, a form of mechanical weathering.',
})
B3.push({
  ...head(FIXTURE_SLOTS_B3['FX-L-06']), ngss_pe: 'MS-LS1-7', names_used: ['yeast strain Z-4'],
  passage: 'A class studied how yeast strain Z-4 makes bread dough rise. Four groups made dough. The flour mixed into each bowl was 300 g, and the warm water poured into each bowl was 200 mL, with one spoon of yeast strain Z-4. The mass of sugar added was 0 g for Group 1, 5 g for Group 2, 10 g for Group 3 and 15 g for Group 4. Overnight, the shelf where the four bowls sat was beside the window. After one hour, each group marked the height of the dough on the side of its bowl.',
  graphic: null,
  prompt: 'Which variable did the class change on purpose?',
  choices: ['flour mixed into each bowl', 'warm water poured into each bowl', 'shelf where the four bowls sat', 'mass of sugar added'], correct_answer: 'mass of sugar added',
  option_roles: ['setting', 'setting', 'setting', 'setting'],
  key_evidence: { refs: [{ quote: 'The mass of sugar added was 0 g for Group 1' }] },
  explanation: 'Only the sugar mass is listed as 0, 5, 10 and 15 g across the four groups.',
  distractor_rationales: [R('flour mixed into each bowl', 'each bowl got 300 g of flour'), R('warm water poured into each bowl', 'each bowl got 200 mL'), R('shelf where the four bowls sat', 'all four bowls sat on one shelf')],
  real_world_check: 'An independent variable is the one an investigator sets to different values on purpose.',
})
FIXTURE_SLOTS_B3['FX-L-07'] = slot('FX-L-07', 'Life Science', 5, 'low', 'LS2', 'data', 'table', 'values', 'read', 'A', 4)
B3.push({
  ...head(FIXTURE_SLOTS_B3['FX-L-07']), ngss_pe: '5-LS2-1', names_used: ['plant line D-6', 'Pot Abra', 'Pot Bexley', 'Pot Corra', 'Pot Dunn'],
  passage: null,
  graphic: { type: 'table', rowLabels: ['Pot Abra', 'Pot Bexley', 'Pot Corra', 'Pot Dunn'], colLabels: ['Seeds sprouted'], cells: [[12], [25], [31], [18]], caption: 'Table 1. Sprouting of plant line D-6 in four pots' },
  prompt: 'According to Table 1, how many seeds of plant line D-6 sprouted in Pot Corra?',
  choices: ['31 seeds', '12 seeds', '25 seeds', '18 seeds'], correct_answer: '31 seeds',
  key_evidence: { refs: [[2, 0]], expr: 'v0' },
  explanation: 'The Pot Corra row of Table 1 reads 31.',
  distractor_rationales: [R('12 seeds', 'reads the Pot Abra row'), R('25 seeds', 'reads the Pot Bexley row'), R('18 seeds', 'reads the Pot Dunn row')],
  real_world_check: 'Seeds sprout when they get water, air and warmth, so counts differ from pot to pot.',
  prior_free: 'No standard says how many seeds of this plant line sprouted in one pot; only the table does.',
})
export const FIXTURES_B3 = B3
/** QUAL's two mutations named FX-L-02's old option strings; they are re-aimed below. Everything else carries. */
export const MUTATIONS_B3_CARRIED = [...MUTATIONS_B2_CARRIED, ...MUTATIONS_B2].filter(m => !(m.on === 'FX-L-02' && m.expect === 'QUAL'))
export const MUTATIONS_B3 = [
  { name: 'B1 trend key carries the lone qualifier, b3 options', on: 'FX-L-02', expect: 'QUAL', mutate: it => setChoice(it, 'It decreased.', 'It decreased steadily.') },
  { name: 'B1 three of four trend options qualified, b3 options', on: 'FX-L-02', expect: 'QUAL', mutate: it => { setChoice(it, 'It rose.', 'It rose slightly.'); setChoice(it, 'It stayed the same.', 'It stayed about the same.'); setChoice(it, 'It decreased.', 'It decreased each week.') } },
  { name: 'B3 trend key alone carries "as ..." (L5-14 shape)', on: 'FX-L-02', expect: 'TRENDPAR', mutate: it => setChoice(it, 'It decreased.', 'It decreased as the drought went on.') },
  { name: 'B3 compound trend option alone carries a time phrase (E-area "rose, then leveled" shape)', on: 'FX-L-02', expect: 'TRENDPAR', mutate: it => setChoice(it, 'It rose, then leveled off.', 'It rose, then leveled off after week 3.') },
  { name: 'B3 controlled variable stated outright (P5-03 shape)', on: 'FX-P-02', expect: 'ROLESTATE', mutate: it => { it.passage = it.passage.replace('A thermometer read a starting temperature of the water of 20 °C in all four cups.', 'The starting temperature of the water was 20 °C for every cup.'); it.key_evidence.refs = [{ quote: 'The starting temperature of the water was 20 °C for every cup' }] } },
  { name: 'B3 independent variable named as the one changed (L7-02 shape)', on: 'FX-L-06', expect: 'ROLESTATE', mutate: it => { it.passage = it.passage.replace('The mass of sugar added was', 'The mass of sugar added was the variable they changed:') } },
  { name: 'B3 key alone repeats the stem\'s defining word (L6-17 shape)', on: 'FX-E-05', expect: 'ECHO', mutate: it => setChoice(it, 'ice splitting a boulder', 'ice breaking a boulder') },
  { name: 'B3 interpolation key the lone unprinted value (L7-06 shape)', on: 'FX-L-05', expect: 'INTERP the key 16 cm is the only option not printed', mutate: it => { setChoice(it, '22 cm', '19 cm'); setChoice(it, '11 cm', '14 cm') } },
  { name: 'B3 interpolation key the lone mean of two options (P8-01 shape)', on: 'FX-L-05', expect: 'INTERP the key 16 cm is the only option that is the mean', mutate: it => { setChoice(it, '18 cm', '20 cm'); setChoice(it, '11 cm', '12 cm') } },
  { name: 'B3 asked bar is the tallest, on the top tick (P5-07 shape)', on: 'FX-P-05', expect: 'BARTOP the asked bar is the tallest', mutate: it => { it.graphic.bars[2].value = 24 } },
  { name: 'B3 key the only option on a tick label', on: 'FX-P-05', expect: 'BARTOP the key 28 cm is the only option on a tick', mutate: it => { it.graphic.bars[2].value = 112 } },
  { name: 'B3 misconception distractors carry reasons, key plain (E5-06 shape)', on: 'FX-E-03', expect: 'CLAIMRAT 3 of 4 claim options give a reason', mutate: it => { setChoice(it, 'Earth is closer to the Sun in June.', 'Earth is closer to the Sun, because of its orbit.'); setChoice(it, 'The Sun gives off more energy in June each year.', 'The Sun gives off more energy, since it is June.'); setChoice(it, 'Clouds block more sunlight over southern oceans in June.', 'Clouds block more sunlight in the south, because oceans are wide.') } },
  { name: 'B3 a lone degree word on one claim option (E5-06 "much hotter")', on: 'FX-E-03', expect: 'CLAIMRAT 1 of 4 claim options carry a degree word', mutate: it => setChoice(it, 'Earth is closer to the Sun in June.', 'Earth is much closer to the Sun in June.') },
]
export const BATCH_MUTATIONS_B3_CARRIED = [...BATCH_MUTATIONS, ...BATCH_MUTATIONS_B1, ...BATCH_MUTATIONS_B2]
export const BATCH_MUTATIONS_B3 = [
  { name: 'B3 two variable passages state roles with one template (P5-03 / P8-03 shape)', expect: 'VARTPL ', mutate: b => { for (const id of ['FX-L-04', 'FX-L-06']) byId(b, id).passage += ' The room temperature was the same for every group.' } },
  { name: 'B3 reasons on claim distractors only, two per item (E7-20 / E8-14 shape)', expect: 'CLAIMBAL ', mutate: b => {
    const q = byId(b, 'FX-Q-01'); setChoice(q, 'Each thin stem grows thicker to hold water.', 'Each thin stem grows thicker, because it holds water.'); setChoice(q, 'Stem thickness stays as it was.', 'Stem thickness stays as it was, since rain still falls.')
    const l = byId(b, 'FX-L-03'); setChoice(l, 'Warm dishes made more gas than cool dishes.', 'Warm dishes made more gas, because warmth speeds yeast.'); setChoice(l, 'The two warm dishes gave about the same results.', 'The two warm dishes matched, since they were kept warm.') } },
  { name: 'B3 one invented name core in two items (E8 "Sy" shape)', expect: 'NAMEREUSE ', mutate: b => { byId(b, 'FX-L-01').names_used = ['snail line T-3', 'Pond Orrin'] } },
  { name: 'B3 numeric distractors kept in ascending order (Earth g1 shape)', expect: 'ORDER ', mutate: b => { byId(b, 'FX-L-05').choices = ['11 cm', '18 cm', '16 cm', '22 cm']; byId(b, 'FX-L-07').choices = ['31 seeds', '12 seeds', '18 seeds', '25 seeds'] } },
]
