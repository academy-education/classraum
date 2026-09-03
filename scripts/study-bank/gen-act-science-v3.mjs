#!/usr/bin/env node
/**
 * gen-act-science-v3.mjs — builds act-science-v3.batch.json.
 *
 * One ACT Science form in the 25MC5 shape:
 *   p1 DR 5 | p2 CV 6 | p3 RS 6 | p4 RS 6 | p5 CV 6 | p6 RS 6 | p7 DR 5  = 40
 *
 * Every figure is COMPUTED from the same arrays the explanations quote, so a
 * table cell, an svg y-coordinate and the number in an explanation cannot
 * drift apart. Seven inventions, none of them from v1 or v2:
 *   pendulum damping, meromictic lake origin (CV), coral bleaching thresholds,
 *   groundwater tracer dye, bridge cable corrosion (CV), battery
 *   self-discharge, wind dispersal of winged seeds.
 *
 * Key placement: numeric option sets stay in ascending order (ACT's
 * convention), so their key slot is fixed by the distractor values chosen
 * here. Prose items carry `rotate: true` and the balancer at the bottom
 * places their keys to bring the form to 10/10/10/10.
 */
import { writeFileSync } from 'node:fs'

const items = []
const Q = o => { items.push(o); return o }

/* ─────────────────────── svg helpers ─────────────────────── */
const r1 = n => String(Math.round(n * 10) / 10)
const DASH = ['', ' stroke-dasharray="6,3"', ' stroke-dasharray="1.5,2.5"']

/** One framed panel with gridlines, ticks, and polyline series. */
function panel({ L, R, T, B, x0, x1, y0, y1, xt, yt, series, title, xLabel, yLabel }) {
  const X = v => L + ((v - x0) / (x1 - x0)) * (R - L)
  const Y = v => B - ((v - y0) / (y1 - y0)) * (B - T)
  let grid = '', lab = ''
  for (const x of xt) {
    grid += `M${r1(X(x))},${T}V${B}`
    lab += `<text x="${r1(X(x))}" y="${B + 11}" text-anchor="middle">${x}</text>`
  }
  for (const y of yt) {
    grid += `M${L},${r1(Y(y))}H${R}`
    lab += `<text x="${L - 3}" y="${r1(Y(y) + 3)}" text-anchor="end">${y}</text>`
  }
  let s = `<path d="${grid}" stroke="#e6e6e6" stroke-width=".5" fill="none"/>`
    + `<g font-size="8">${lab}</g>`
    + `<path d="M${L},${T}V${B}H${R}" stroke="#000" fill="none"/>`
  s += '<g fill="none" stroke="#000" stroke-width="1.2">'
  series.forEach((se, i) => {
    s += `<polyline${DASH[i % 3]} points="` + se.pts.map(([x, y]) => `${r1(X(x))},${r1(Y(y))}`).join(' ') + '"/>'
  })
  s += '</g><g fill="#000">'
  for (const se of series) for (const [x, y] of se.pts) s += `<circle cx="${r1(X(x))}" cy="${r1(Y(y))}" r="1.8"/>`
  s += '</g>'
  if (title) s += `<text x="${r1((L + R) / 2)}" y="${T - 8}" font-size="9" font-weight="bold" text-anchor="middle">${title}</text>`
  if (xLabel) s += `<text x="${r1((L + R) / 2)}" y="${B + 24}" font-size="8" text-anchor="middle">${xLabel}</text>`
  if (yLabel) s += `<text x="${L - 26}" y="${r1((T + B) / 2)}" font-size="8" text-anchor="middle" transform="rotate(-90 ${L - 26} ${r1((T + B) / 2)})">${yLabel}</text>`
  return s
}

function legend(x, y, entries, gap = 11) {
  let s = ''
  entries.forEach((e, i) => {
    const yy = y + i * gap
    s += `<line x1="${x}" y1="${yy}" x2="${x + 18}" y2="${yy}" stroke="#000" stroke-width="1.2"${DASH[i % 3]}/>`
      + `<circle cx="${x + 9}" cy="${yy}" r="1.8" fill="#000"/>`
      + `<text x="${x + 23}" y="${yy + 3}" font-size="8">${e}</text>`
  })
  return s
}

/* ═════════════ P1 — Data Representation: pendulum damping ═════════════ */

const P1_CYCLES = [0, 20, 40, 60, 80, 100]
const P1 = {
  A: [12.0, 11.1, 10.3, 9.5, 8.8, 8.1],
  B: [12.0, 8.4, 5.9, 4.1, 2.9, 2.0],
  C: [12.0, 10.6, 9.4, 8.3, 7.3, 6.5],
}
const P1_PERIOD = 2.01

const p1Passage = `A simple pendulum was made by hanging a bob from a light rod 1.00 m long. When such a pendulum is pulled aside and released, the angular amplitude of successive swings decreases as energy is lost to air resistance and to friction at the pivot.

Three bobs were compared. Bob A was a smooth steel sphere 4.0 cm in diameter. Bob B was that same sphere with a square of stiff cardboard, 10.0 cm on a side, fixed to it so that the flat face of the cardboard met the air as the bob moved. Bob C was the same sphere with an identical square of cardboard fixed edge-on, so that only the thin edge of the cardboard met the air as the bob moved. Lead was removed from inside each sphere so that every bob, with its attachment, had a total mass of 200 g.

Each bob was released from an angular amplitude of 12.0° in still air at 20 °C and allowed to swing freely. The period of the swing was measured as 2.01 s for all three bobs. The angular amplitude was recorded after every 20 complete cycles. The results are shown in Table 1.`

const p1Graphic = {
  type: 'table',
  rowLabels: P1_CYCLES.map(c => `${c} cycles`),
  colLabels: ['Bob A amplitude (°)', 'Bob B amplitude (°)', 'Bob C amplitude (°)'],
  cells: P1_CYCLES.map((_, i) => [P1.A[i].toFixed(1), P1.B[i].toFixed(1), P1.C[i].toFixed(1)]),
  caption: 'Table 1. Angular amplitude, in degrees, of each bob after the number of complete cycles shown.',
}
const p1 = (n, o) => Q({
  id: `ACT-SC3-P1-Q${n}`, passage_id: 'sc3-p1', passage_title: 'Damping of a Pendulum',
  format: 'data_representation', passage: p1Passage, graphic: p1Graphic, ...o,
})

p1(1, {
  prompt: 'According to Table 1, the amplitude of Bob B after 40 cycles was:',
  choices: ['2.0°', '4.1°', '5.9°', '8.4°'],
  correct_answer: '5.9°',
  explanation: 'The Bob B column of Table 1 gives 5.9° in the row for 40 cycles, so "5.9°" is correct. "8.4°" and "4.1°" are Bob B\'s amplitudes after 20 and 60 cycles, and "2.0°" is its amplitude after 100 cycles.',
  domain: 'Interpretation of Data', subskill: 'read a value from a table', difficulty: 'easy',
})

p1(2, {
  prompt: 'Consider the amount by which the amplitude of Bob A exceeded the amplitude of Bob B at the end of each 20-cycle interval shown in Table 1. From one interval to the next, that excess:',
  rotate: true,
  choices: [
    'grew, but by a smaller amount in each successive interval.',
    'grew, and by a larger amount in each successive interval.',
    'shrank, and by a larger amount in each successive interval.',
    'stayed the same throughout the 100 cycles.',
  ],
  correct_answer: 'grew, but by a smaller amount in each successive interval.',
  explanation: 'Subtracting the Bob B column from the Bob A column of Table 1 gives 0.0°, 2.7°, 4.4°, 5.4°, 5.9°, and 6.1°. The excess therefore "grew, but by a smaller amount in each successive interval." It grows at every step, so it neither "shrank" nor "stayed the same throughout the 100 cycles"; but the growth from step to step is 2.7°, 1.7°, 1.0°, 0.5°, and 0.2°, which gets smaller rather than "larger in each successive interval."',
  domain: 'Interpretation of Data', subskill: 'compare two columns across a range', difficulty: 'hard',
})

p1(3, {
  prompt: 'Based on Table 1, the amplitude of Bob C first fell below 7.0° during which of the following intervals?',
  choices: ['Between 20 and 40 cycles', 'Between 40 and 60 cycles', 'Between 60 and 80 cycles', 'Between 80 and 100 cycles'],
  correct_answer: 'Between 80 and 100 cycles',
  explanation: 'Bob C was still at 7.3° after 80 cycles and had fallen to 6.5° after 100, so the crossing happened "Between 80 and 100 cycles." At every earlier interval named, Bob C was still above 7.3°.',
  domain: 'Interpretation of Data', subskill: 'locate a threshold crossing between rows', difficulty: 'medium',
})

p1(4, {
  prompt: 'Based on Table 1 and the passage, Bob B had been swinging for approximately how many seconds when its amplitude first fell to one-third of its initial value?',
  choices: ['20 s', '62 s', '125 s', '240 s'],
  correct_answer: '125 s',
  explanation: 'One-third of the 12.0° release amplitude is 4.0°. Table 1 shows Bob B at 4.1° after 60 cycles and 2.9° after 80, so 4.0° was reached just past 60 cycles. At the stated period of 2.01 s per cycle, roughly 62 cycles is about "125 s." The figure "62 s" is the cycle count read as if it were a time, and "240 s" is the time for the full 100 cycles.',
  domain: 'Interpretation of Data', subskill: 'convert cycles to elapsed time', difficulty: 'hard',
})

p1(5, {
  prompt: 'Suppose a fourth bob had been tested that was identical to Bob B and Bob C except that its cardboard square was fixed at 45° to the direction of motion, so that the area meeting the air was between that of Bob B and that of Bob C. Based on Table 1, the amplitude of this fourth bob after 60 cycles would most likely have been:',
  choices: ['3.0°', '6.2°', '8.9°', '10.4°'],
  correct_answer: '6.2°',
  explanation: 'After 60 cycles Table 1 gives 4.1° for Bob B, whose cardboard meets the air face-on, and 8.3° for Bob C, whose cardboard meets it edge-on. A bob whose exposed area falls between those two should lose amplitude at a rate between them, so its amplitude should fall between 4.1° and 8.3°. Only "6.2°" does; "3.0°" is below Bob B, and "8.9°" and "10.4°" are above Bob C and above Bob A\'s 9.5°.',
  domain: 'Evaluation of Models, Inferences, and Experimental Results', subskill: 'interpolate between two treatments', difficulty: 'hard',
})

/* ═════════ P2 — Conflicting Viewpoints: origin of a lake's deep salt ═════════ */

const p2Passage = `Lake Serevan fills a steep-sided basin 71 m deep. In most lakes the entire water column mixes from top to bottom at least once a year. In Lake Serevan the water below 45 m has not mixed with the water above it for as long as records have been kept: it holds no dissolved oxygen and it stays at 5.2 °C all year. Surface water holds 0.3 g of dissolved salt per liter; water at 60 m holds 4.1 g/L. A hot spring 3 km away discharges water holding 21 g/L.

Chemists identify a body of salty water by the ratios of the ions dissolved in it. The chloride-to-bromide (Cl/Br) mass ratio is 292 in the lake's deep water, 290 in seawater, and 620 in the hot spring. The chloride-to-sulfate (Cl/SO4) mass ratio is 3.8 in the deep water and 3.9 in the hot spring. Two scientists explain where the deep water's salt came from.

Scientist 1

Salty water is entering the lake now, through the lake floor. Brine rises along a fault that also feeds the hot spring, and because that brine is far denser than lake water it spreads out across the bottom of the basin, where no wind can lift it. The salt is what holds the deep water down and keeps it from mixing. The Cl/SO4 ratio of the deep water, 3.8, is almost exactly the hot spring's 3.9, which is what a common source produces. Salt is still arriving, so the deep water is getting saltier: a measurement made decades from now will find more than 4.1 g/L at 60 m. Gas dissolved in the hot spring is rich in helium-3, which comes from the mantle and reaches the surface only along deep faults.

Scientist 2

No salt is entering the lake. About 9,000 years ago the basin was an arm of the sea, and uplift cut it off. Fresh water has been diluting the trapped seawater ever since, from the top down, and the salt still left below 45 m is what keeps that water dense enough to resist mixing. The Cl/Br ratio settles the source: 292 in the deep water is seawater's 290, and no amount of the hot spring's water, at 620, can produce it. Salt diffuses slowly upward across the boundary and nothing replaces it, so the deep water is getting fresher: a measurement made decades from now will find less than 4.1 g/L at 60 m. The agreement in Cl/SO4 is a coincidence. The deep water has no oxygen, and bacteria living in oxygen-free water consume sulfate, which raises the Cl/SO4 ratio of any water they live in, whatever its origin.`

const p2 = (n, o) => Q({
  id: `ACT-SC3-P2-Q${n}`, passage_id: 'sc3-p2', passage_title: 'Why a Lake Never Mixes',
  format: 'conflicting_viewpoints', passage: p2Passage, ...o,
})

p2(1, {
  prompt: 'Scientist 1 and Scientist 2 would most likely agree with which of the following statements?',
  rotate: true,
  choices: [
    'The salt dissolved in the water below 45 m is what prevents that water from mixing with the water above it.',
    'The salt dissolved in the water below 45 m arrived along a fault that also feeds the hot spring.',
    'The salt dissolved in the water below 45 m entered the basin at a time when it was connected to the sea.',
    'The salt dissolved in the water below 45 m is being consumed by bacteria living in oxygen-free water.',
  ],
  correct_answer: 'The salt dissolved in the water below 45 m is what prevents that water from mixing with the water above it.',
  explanation: 'Scientist 1 says the brine "is what holds the deep water down and keeps it from mixing," and Scientist 2 says the salt left below 45 m "keeps that water dense enough to resist mixing," so both hold that the salt "prevents that water from mixing with the water above it." Arrival "along a fault that also feeds the hot spring" is Scientist 1 alone, entry "at a time when it was connected to the sea" is Scientist 2 alone, and Scientist 2 has bacteria consuming sulfate, not the salt as a whole.',
  domain: 'Evaluation of Models, Inferences, and Experimental Results', subskill: 'point of agreement', difficulty: 'medium',
})

p2(2, {
  prompt: 'Scientist 2 answers Scientist 1\'s argument from the Cl/SO4 ratios by claiming that the deep water\'s ratio of 3.8:',
  rotate: true,
  choices: [
    'would be raised by the bacteria living there no matter where the salt had come from.',
    'was measured in water too cold for the comparison with the hot spring to be meaningful.',
    'is too far from the hot spring\'s 3.9 for the two waters to share a source.',
    'is the ratio expected of seawater that has been diluted for 9,000 years.',
  ],
  correct_answer: 'would be raised by the bacteria living there no matter where the salt had come from.',
  explanation: 'Scientist 2 calls the Cl/SO4 agreement a coincidence because bacteria in oxygen-free water consume sulfate, so the measured 3.8 "would be raised by the bacteria living there no matter where the salt had come from." Scientist 2 never disputes that 3.8 is close to 3.9, never appeals to temperature, and reserves the seawater comparison for the Cl/Br ratio.',
  domain: 'Interpretation of Data', subskill: 'identify a stated rebuttal', difficulty: 'medium',
})

p2(3, {
  prompt: 'Suppose that the salinity at a depth of 60 m in Lake Serevan is measured again 50 years from now and is found to be 4.6 g/L. This result would:',
  rotate: true,
  choices: [
    'support Scientist 1\'s account and weaken Scientist 2\'s.',
    'support Scientist 2\'s account and weaken Scientist 1\'s.',
    'support both scientists\' accounts.',
    'weaken both scientists\' accounts.',
  ],
  correct_answer: 'support Scientist 1\'s account and weaken Scientist 2\'s.',
  explanation: 'Scientist 1 predicts a later measurement will find "more than 4.1 g/L at 60 m" because salt is still arriving; Scientist 2 predicts "less than 4.1 g/L" because salt is diffusing upward and nothing replaces it. A reading of 4.6 g/L is above 4.1, so it would "support Scientist 1\'s account and weaken Scientist 2\'s."',
  domain: 'Evaluation of Models, Inferences, and Experimental Results', subskill: 'test a prediction against a viewpoint', difficulty: 'medium',
})

p2(4, {
  prompt: 'Which of the following measurements would be most useful in deciding between the two scientists\' accounts?',
  rotate: true,
  choices: [
    'The helium-3 content of gas dissolved in the water at 60 m, compared with that of gas dissolved in the hot spring',
    'The temperature of the water at 60 m in summer, compared with its temperature in winter',
    'The depth in the lake at which dissolved oxygen first disappears',
    'The salt content of the water in the stream that flows out of the lake',
  ],
  correct_answer: 'The helium-3 content of gas dissolved in the water at 60 m, compared with that of gas dissolved in the hot spring',
  explanation: 'Scientist 1 alone offers a marker that can be looked for in the lake: the hot spring\'s gas "is rich in helium-3, which comes from the mantle and reaches the surface only along deep faults." Deep water fed by that fault should carry the same helium-3 excess and 9,000-year-old trapped seawater should not, so the "helium-3 content of gas dissolved in the water at 60 m" is what decides between them. Both scientists already accept that the deep water is cold, oxygen-free and salty, so none of the other measurements would separate them.',
  domain: 'Scientific Investigation', subskill: 'design a discriminating measurement', difficulty: 'hard',
})

p2(5, {
  prompt: 'Which of the following pieces of evidence given in the passage is LEAST consistent with the hot spring being the source of the salt in the lake\'s deep water?',
  rotate: true,
  choices: [
    'The deep water\'s Cl/Br ratio of 292, compared with the hot spring\'s 620',
    'The deep water\'s Cl/SO4 ratio of 3.8, compared with the hot spring\'s 3.9',
    'The deep water\'s salinity of 4.1 g/L, compared with the hot spring\'s 21 g/L',
    'The deep water\'s temperature of 5.2 °C, held all year',
  ],
  correct_answer: 'The deep water\'s Cl/Br ratio of 292, compared with the hot spring\'s 620',
  explanation: 'Water carrying the spring\'s salt should carry the spring\'s ion ratios, and the "Cl/Br ratio of 292, compared with the hot spring\'s 620" is nowhere close, which is why Scientist 2 says no amount of spring water can produce it. The Cl/SO4 comparison of "3.8, compared with the hot spring\'s 3.9" points the other way; a lower salinity than the spring\'s is expected of brine mixed into lake water; and the year-round temperature is a consequence of not mixing, not of a source.',
  domain: 'Interpretation of Data', subskill: 'weigh reported values against a claim', difficulty: 'hard',
})

p2(6, {
  prompt: 'A sediment core taken from the deepest part of the basin shows that the basin has held fresh water continuously for the past 40,000 years and contains no marine shells at any depth. This finding would:',
  rotate: true,
  choices: [
    'weaken Scientist 2\'s account but not Scientist 1\'s.',
    'weaken Scientist 1\'s account but not Scientist 2\'s.',
    'weaken both accounts equally.',
    'have no bearing on either account.',
  ],
  correct_answer: 'weaken Scientist 2\'s account but not Scientist 1\'s.',
  explanation: 'Scientist 2\'s entire account rests on the basin having been "an arm of the sea" about 9,000 years ago; a core showing fresh water continuously for 40,000 years leaves that trapped seawater with no way to have entered, so the finding would "weaken Scientist 2\'s account but not Scientist 1\'s." Scientist 1 needs no marine past at all, since the brine arrives through the lake floor, so the finding does not "weaken both accounts equally" and is plainly not without bearing.',
  domain: 'Evaluation of Models, Inferences, and Experimental Results', subskill: 'effect of new evidence', difficulty: 'medium',
})

/* ═══════ P3 — Research Summaries: coral bleaching thresholds ═══════ */

const P3_T = [26, 28, 30, 31, 32]
const P3_L = [50, 100, 200, 400, 800]
const P3_E1 = { A: [3, 6, 14, 38, 72], B: [2, 4, 7, 12, 31] }
const P3_E2 = { A: [5, 9, 15, 31, 58], B: [3, 5, 8, 14, 29] }

const p3Passage = `Reef-building corals hold single-celled algae, called symbionts, inside their tissue. A stressed coral expels symbionts and pales; this is called bleaching. Researchers studied two coral species growing side by side on one reef flat.

Twenty fragments, each about 4 cm across, were broken from a single large colony of Species A, and twenty more from a single large colony of Species B. All forty fragments were held in flowing seawater at 26 °C, under light of 200 micromoles of photons per square meter per second (µmol), for 10 days before any trial began. Each fragment's symbionts were counted at the start and again at the end of its 14-day trial, and the percent of symbionts lost was calculated from those two counts.

Experiment 1

Fragments were held for 14 days at one of five water temperatures. Light was kept at 200 µmol throughout.

Experiment 2

Fragments were held for 14 days under one of five light levels. Water temperature was kept at 30 °C throughout.

Two fragments of each species were used at each condition, and the results reported are the means of those two fragments. All results are given in Table 1.`

const p3Graphic = {
  type: 'table',
  rowLabels: [...P3_T.map(t => `Experiment 1, ${t} °C`), ...P3_L.map(l => `Experiment 2, ${l} µmol`)],
  colLabels: ['Species A symbionts lost (%)', 'Species B symbionts lost (%)'],
  cells: [...P3_T.map((_, i) => [P3_E1.A[i], P3_E1.B[i]]), ...P3_L.map((_, i) => [P3_E2.A[i], P3_E2.B[i]])],
  caption: 'Table 1. Mean percent of symbionts lost over 14 days at each condition of Experiment 1 (temperature varied, light 200 µmol) and Experiment 2 (light varied, temperature 30 °C).',
}
const p3 = (n, o) => Q({
  id: `ACT-SC3-P3-Q${n}`, passage_id: 'sc3-p3', passage_title: 'Heat, Light, and Coral Bleaching',
  format: 'research_summaries', passage: p3Passage, graphic: p3Graphic, ...o,
})

p3(1, {
  prompt: 'According to Table 1, the mean percent of symbionts lost by Species B at 32 °C in Experiment 1 was:',
  choices: ['12%', '29%', '31%', '72%'],
  correct_answer: '31%',
  explanation: 'The Species B column of Table 1 gives "31%" in the row for Experiment 1 at 32 °C. "12%" is Species B at 31 °C, "29%" is Species B at 800 µmol in Experiment 2, and "72%" is Species A at 32 °C.',
  domain: 'Interpretation of Data', subskill: 'read a value from a table', difficulty: 'easy',
})

p3(2, {
  prompt: 'In Experiment 2, the light level at which Species A lost most nearly the same percent of its symbionts as it lost at 31 °C in Experiment 1 was:',
  choices: ['50 µmol', '100 µmol', '400 µmol', '800 µmol'],
  correct_answer: '400 µmol',
  explanation: 'Species A lost 38% at 31 °C in Experiment 1. In Experiment 2 its losses were 5%, 9%, 15%, 31%, and 58%, and 31% at "400 µmol" is the closest of these to 38%. The next nearest, 58% at 800 µmol, is twenty points away.',
  domain: 'Interpretation of Data', subskill: 'match a value across two experiments', difficulty: 'hard',
})

p3(3, {
  prompt: 'One condition appears in both Experiment 1 and Experiment 2. For Species A, the two results obtained under that condition differed by:',
  choices: ['1 percentage point', '6 percentage points', '9 percentage points', '24 percentage points'],
  correct_answer: '1 percentage point',
  explanation: 'Experiment 1 varied temperature with light held at 200 µmol, and Experiment 2 varied light with temperature held at 30 °C, so 30 °C at 200 µmol was run in both. Table 1 gives Species A 14% there in Experiment 1 and 15% in Experiment 2, a difference of "1 percentage point."',
  domain: 'Scientific Investigation', subskill: 'identify the shared condition of two experiments', difficulty: 'hard',
})

p3(4, {
  prompt: 'The researchers broke all twenty fragments of a species from a single large colony rather than from twenty separate colonies. This choice most likely allowed them to:',
  rotate: true,
  choices: [
    'reduce the chance that inherited differences among fragments of one species affected the results.',
    'ensure that fragments of the two species were the same size at the start of the trials.',
    'ensure that each fragment began its trial with the same number of symbionts.',
    'shorten the 10 days of holding that the fragments needed before the trials.',
  ],
  correct_answer: 'reduce the chance that inherited differences among fragments of one species affected the results.',
  explanation: 'Fragments broken from one colony are pieces of a single individual, so they carry the same inherited makeup, which is how the design could "reduce the chance that inherited differences among fragments of one species affected the results." Fragment size was set separately, at about 4 cm across; starting symbiont counts were not made equal but were counted individually and used to compute each loss; and the 10-day holding period was the same for every fragment.',
  domain: 'Scientific Investigation', subskill: 'rationale for a design choice', difficulty: 'medium',
})

p3(5, {
  prompt: 'Based on Table 1, the loss of symbionts by Species A first exceeded 20% at a water temperature between:',
  choices: ['26 °C and 28 °C', '28 °C and 30 °C', '30 °C and 31 °C', '31 °C and 32 °C'],
  correct_answer: '30 °C and 31 °C',
  explanation: 'In Experiment 1, Species A lost 14% at 30 °C and 38% at 31 °C, so the 20% level was passed between "30 °C and 31 °C." At every lower temperature shown the loss was still under 15%.',
  domain: 'Interpretation of Data', subskill: 'locate a threshold crossing between rows', difficulty: 'medium',
})

p3(6, {
  prompt: 'Suppose fragments of Species A were held for 14 days at 31 °C under light of 800 µmol. Based on Table 1, the mean percent of symbionts lost would most likely be closest to:',
  choices: ['12%', '35%', '52%', '81%'],
  correct_answer: '81%',
  explanation: 'Each stress on its own already produces a large loss in Species A: 38% at 31 °C with light at 200 µmol, and 58% at 800 µmol with temperature at 30 °C. Raising both above their control values at once should cost more symbionts than either alone, so the result should exceed 58%, and only "81%" does. "12%," "35%," and "52%" are all at or below what one of the two stresses produced by itself.',
  domain: 'Evaluation of Models, Inferences, and Experimental Results', subskill: 'predict from two experiments combined', difficulty: 'hard',
})

/* ═══════ P4 — Research Summaries: groundwater tracer dye ═══════ */

const P4_E1 = {
  coarse: [[0, 0], [1, 10], [2, 36], [3, 20], [4, 8], [6, 2], [8, 0], [12, 0]],
  medium: [[0, 0], [1, 2], [2, 8], [3, 18], [4, 24], [6, 12], [8, 5], [12, 1]],
  fine: [[0, 0], [2, 0], [4, 3], [6, 8], [8, 12], [10, 10], [12, 6]],
}
const P4_E2 = {
  f20: [[0, 0], [1, 14], [2, 32], [3, 17], [4, 7], [6, 1], [8, 0], [12, 0]],
  f10: P4_E1.medium,
  f5: [[0, 0], [2, 1], [4, 5], [6, 11], [8, 16], [10, 13], [12, 8]],
}
const P4_TICKS_X = [0, 4, 8, 12], P4_TICKS_Y = [0, 10, 20, 30, 40]

const p4Svg = '<svg viewBox="0 0 350 250" width="320" role="img" font-family="sans-serif" '
  + 'aria-label="Dye in column outflow versus time: Experiment 1, three grain sizes; Experiment 2, three flow rates">'
  + '<rect width="350" height="250" fill="#fff"/>'
  + panel({
    L: 40, R: 165, T: 34, B: 150, x0: 0, x1: 12, y0: 0, y1: 40, xt: P4_TICKS_X, yt: P4_TICKS_Y,
    title: 'Experiment 1', xLabel: 'Time (h)', yLabel: 'Dye in outflow (mg/L)',
    series: [{ pts: P4_E1.coarse }, { pts: P4_E1.medium }, { pts: P4_E1.fine }],
  })
  + panel({
    L: 215, R: 340, T: 34, B: 150, x0: 0, x1: 12, y0: 0, y1: 40, xt: P4_TICKS_X, yt: P4_TICKS_Y,
    title: 'Experiment 2', xLabel: 'Time (h)',
    series: [{ pts: P4_E2.f20 }, { pts: P4_E2.f10 }, { pts: P4_E2.f5 }],
  })
  + '<text x="14" y="196" font-size="8" font-weight="bold">Experiment 1</text>'
  + legend(14, 208, ['1.5 mm sand', '0.6 mm sand', '0.2 mm sand'])
  + '<text x="190" y="196" font-size="8" font-weight="bold">Experiment 2</text>'
  + legend(190, 208, ['20 mL/min', '10 mL/min', '5 mL/min'])
  + '<text x="14" y="14" font-size="10" font-weight="bold">Figure 1</text>'
  + '</svg>'

const p4Graphic = {
  type: 'svg', svg: p4Svg,
  caption: 'Figure 1. Dye concentration measured in the outflow of each column over the 12 h following injection, for Experiment 1 (three grain sizes, flow 10 mL/min) and Experiment 2 (0.6 mm sand, three flow rates).',
}

const p4Passage = `Water moving through the ground carries dissolved substances with it. To study that movement, hydrologists inject a dye that does not stick to soil grains and does not break down, then measure the dye concentration in the water leaving the far end of the flow path over the hours that follow.

Three glass columns, each 60 cm long and 5 cm across, were packed with clean quartz sand. Column 1 was packed with sand of 1.5 mm grain size, column 2 with 0.6 mm sand, and column 3 with 0.2 mm sand. The same three columns were used in every trial reported below. Before each injection a column was flushed with dye-free water for 24 h, and the water leaving it was then tested to confirm that it contained no dye.

Experiment 1

Water was pumped through each of the three columns at 10 mL/min. A single 5 mL pulse of dye was injected at the inlet of each column at time 0, and the dye concentration in the outflow was measured every 15 min for 12 h.

Experiment 2

Column 2 alone was used. The procedure of Experiment 1 was repeated with the pump set to 5 mL/min, to 10 mL/min, and to 20 mL/min.

In every trial but one, between 96% and 99% of the injected dye was recovered in the outflow. In the 20 mL/min trial, which was run last, only 62% was recovered; a leak was found afterward at the joint between column 2 and its outflow tube. Results are shown in Figure 1.`

const p4 = (n, o) => Q({
  id: `ACT-SC3-P4-Q${n}`, passage_id: 'sc3-p4', passage_title: 'Tracing Water Through Sand',
  format: 'research_summaries', passage: p4Passage, graphic: p4Graphic, ...o,
})

p4(1, {
  prompt: 'In Experiment 1, the highest dye concentration measured in the outflow of the column packed with 1.5 mm sand was closest to:',
  choices: ['12 mg/L', '20 mg/L', '24 mg/L', '36 mg/L'],
  correct_answer: '36 mg/L',
  explanation: 'The 1.5 mm curve of Figure 1 rises to its highest point, "36 mg/L," 2 h after injection. "24 mg/L" is the highest point reached by the 0.6 mm column, "12 mg/L" the highest reached by the 0.2 mm column, and "20 mg/L" is the 1.5 mm value an hour after its peak.',
  domain: 'Interpretation of Data', subskill: 'read a peak from a graph', difficulty: 'easy',
})

p4(2, {
  prompt: 'In Experiment 1, the outflow of the 0.2 mm column reached its highest dye concentration how long after the outflow of the 0.6 mm column reached its highest dye concentration?',
  choices: ['2 h', '4 h', '6 h', '8 h'],
  correct_answer: '4 h',
  explanation: 'In Figure 1 the 0.6 mm curve peaks at 4 h and the 0.2 mm curve peaks at 8 h, a gap of "4 h." "8 h" is the time of the later peak itself rather than the difference.',
  domain: 'Interpretation of Data', subskill: 'compare times to peak', difficulty: 'medium',
})

p4(3, {
  prompt: 'One trial in Experiment 2 produced a curve identical to a curve produced in Experiment 1. That trial was run at a pump setting of:',
  rotate: true,
  choices: [
    '10 mL/min, and the matching curve is that of the 0.6 mm column.',
    '20 mL/min, and the matching curve is that of the 1.5 mm column.',
    '5 mL/min, and the matching curve is that of the 0.2 mm column.',
    '20 mL/min, and the matching curve is that of the 0.6 mm column.',
  ],
  correct_answer: '10 mL/min, and the matching curve is that of the 0.6 mm column.',
  explanation: 'Experiment 1 pumped every column at 10 mL/min, and Experiment 2 reused column 2, the 0.6 mm column. The 10 mL/min curve in Figure 1 rises to 24 mg/L at 4 h and falls to 5 mg/L by 8 h, so for that trial "the matching curve is that of the 0.6 mm column." The 20 mL/min curve peaks at 32 mg/L at 2 h, close to but not the same as the 1.5 mm column\'s 36 mg/L, and the 5 mL/min curve peaks at 16 mg/L, above the 0.2 mm column\'s 12 mg/L.',
  domain: 'Interpretation of Data', subskill: 'match curves across two figures', difficulty: 'hard',
})

p4(4, {
  prompt: 'Testing the water leaving a column for dye before each injection served primarily to:',
  rotate: true,
  choices: [
    'establish that dye from an earlier trial in the same column would not be counted in the trial about to begin.',
    'establish that the sand in the column had been fully wetted so that flow through it would be steady.',
    'establish that the pump was delivering the flow rate that the trial called for.',
    'establish that the dye had not broken down during the 24 h of flushing.',
  ],
  correct_answer: 'establish that dye from an earlier trial in the same column would not be counted in the trial about to begin.',
  explanation: 'The same three columns were used in every trial, so dye left in a column would show up in the next run\'s outflow and be mistaken for newly injected dye. Measuring zero dye first establishes that "dye from an earlier trial in the same column would not be counted in the trial about to begin." Wetting the sand and setting the pump are done by the flushing itself rather than by testing the water for dye, and the passage states that this dye does not break down.',
  domain: 'Scientific Investigation', subskill: 'purpose of a control check', difficulty: 'medium',
})

p4(5, {
  prompt: 'Given that only 62% of the injected dye was recovered in the 20 mL/min trial, which of the following conclusions drawn from that trial is LEAST supported?',
  rotate: true,
  choices: [
    'No dye was still leaving column 2 by 8 h after injection.',
    'Dye first appeared in the outflow of column 2 within 1 h of injection.',
    'The outflow of column 2 peaked earlier than it did at 10 mL/min.',
    'The outflow of column 2 peaked at a higher concentration than it did at 5 mL/min.',
  ],
  correct_answer: 'No dye was still leaving column 2 by 8 h after injection.',
  explanation: 'A leak between the column and its outflow tube diverts dye away from the measuring point, so every concentration recorded in that trial is lower than the concentration actually leaving the sand. Readings that fell to zero late in the run are exactly the ones that under-measurement can manufacture, so a conclusion that "no dye was still leaving column 2 by 8 h" is the one the leak undermines. The other three survive it: dye that was detected really was there, and a peak that was measured too low still peaked earlier than the 10 mL/min curve and still stood above the 16 mg/L reached at 5 mL/min.',
  domain: 'Evaluation of Models, Inferences, and Experimental Results', subskill: 'trace a design flaw through the data', difficulty: 'hard',
})

p4(6, {
  prompt: 'Suppose a fourth column packed with 1.0 mm sand had been included in Experiment 1. The highest dye concentration in its outflow would most likely have been closest to:',
  choices: ['8 mg/L', '16 mg/L', '30 mg/L', '44 mg/L'],
  correct_answer: '30 mg/L',
  explanation: 'In Figure 1 the peak concentration rises with grain size: 12 mg/L at 0.2 mm, 24 mg/L at 0.6 mm, and 36 mg/L at 1.5 mm. A 1.0 mm column falls between the last two, so its peak should fall between 24 and 36 mg/L, and only "30 mg/L" does. "44 mg/L" is above every peak measured, and "8 mg/L" and "16 mg/L" are below the 0.6 mm column\'s.',
  domain: 'Evaluation of Models, Inferences, and Experimental Results', subskill: 'interpolate a new treatment', difficulty: 'medium',
})

/* ═════ P5 — Conflicting Viewpoints: corrosion in a bridge cable ═════ */

const p5Passage = `The main cable of a suspension bridge is a bundle of about 17,000 steel wires, each coated with zinc. Zinc corrodes in place of the steel beneath it, so a wire whose zinc coating is intact does not rust. The bundle is wrapped and covered by a sheath, and the inside of a cable is not seen again unless the sheath is opened.

During an inspection of a 40-year-old bridge, the sheath was opened at 14 places along the main cable. Broken wires were found at 9 of them, and 8 of those 9 were in the lower third of the cable within 60 m of a tower. Zinc was gone entirely from about 30% of the wires examined. The air inside the cable stood at 68% relative humidity (RH). Moisture wiped from the wires had a pH of 4.6 and carried chloride at 40 mg per kilogram of surface deposit. The bridge crosses a river 4 km inland, and its roadway is salted in winter. Two scientists explain the corrosion.

Scientist 1

Water is the cause. Steel and zinc corrode quickly only when the air touching them is above about 60% RH, and inside this cable it is 68%. Outside air enters the cable through gaps in the sheath and cools at night, so water condenses on the wires. Condensed water runs down through the bundle and collects in the lower third of the cable, and the cable is steepest near the towers, so water running along it gathers there. That is why the broken wires are where they are. The acidity has an ordinary source: sulfur dioxide in city air dissolves in the condensed water, and a pH of 4.6 is what that produces. Dry the inside of the cable below 40% RH and the corrosion will stop; nothing else need be done.

Scientist 2

Chloride is the cause. Salt spray thrown up by traffic enters the cable where it passes closest to the roadway, which is at the tower ends, and that is exactly where the broken wires are. Chloride destroys the film that protects zinc, and a wire whose film is destroyed keeps corroding in air far drier than 60% RH. Drying the cable will therefore slow the damage without stopping it. The acidity is a product of the corrosion rather than its cause: the iron chloride formed as a wire corrodes reacts with water and releases acid, which is why the moisture is acidic wherever chloride is found. The chloride must be washed out of the cable with fresh water.`

const p5 = (n, o) => Q({
  id: `ACT-SC3-P5-Q${n}`, passage_id: 'sc3-p5', passage_title: 'Why the Wires Broke',
  format: 'conflicting_viewpoints', passage: p5Passage, ...o,
})

p5(1, {
  prompt: 'Both scientists would most likely agree with which of the following statements about the cable?',
  rotate: true,
  choices: [
    'Corrosion has damaged the wires near the towers more than the wires elsewhere in the cable.',
    'Water condensing inside the cable at night runs down and collects in its lower third.',
    'Salt spray thrown up by traffic has entered the cable at the tower ends.',
    'Drying the air inside the cable below 40% RH would be enough to stop the corrosion.',
  ],
  correct_answer: 'Corrosion has damaged the wires near the towers more than the wires elsewhere in the cable.',
  explanation: 'Both scientists take it as given that corrosion has "damaged the wires near the towers more than the wires elsewhere in the cable" and set out to explain that pattern, one by water running down to the steep part of the cable and the other by salt spray entering at the tower ends. Condensation is Scientist 1\'s mechanism, salt spray is Scientist 2\'s, and Scientist 2 says outright that drying "will therefore slow the damage without stopping it."',
  domain: 'Evaluation of Models, Inferences, and Experimental Results', subskill: 'point of agreement', difficulty: 'easy',
})

p5(2, {
  prompt: 'According to Scientist 2, the pH of 4.6 measured in moisture wiped from the wires is best explained as:',
  rotate: true,
  choices: [
    'acid released when a corrosion product of the wires reacts with water.',
    'acid formed when sulfur dioxide from city air dissolves in condensed water.',
    'acid carried into the cable dissolved in salt spray from the roadway.',
    'acid left behind as zinc is stripped from the surface of a wire.',
  ],
  correct_answer: 'acid released when a corrosion product of the wires reacts with water.',
  explanation: 'Scientist 2 traces the acidity to iron chloride formed as a wire corrodes, that is, to "acid released when a corrosion product of the wires reacts with water," making the low pH a product of corrosion rather than its cause. Sulfur dioxide dissolving in condensed water is Scientist 1\'s explanation, and neither scientist has acid arriving in the spray or released by the loss of zinc itself.',
  domain: 'Interpretation of Data', subskill: 'attribute a claim to a viewpoint', difficulty: 'medium',
})

p5(3, {
  prompt: 'A cable of the same design on a bridge 30 km inland, whose roadway has never been salted, is opened and found to have broken wires in the lower third of the cable near its towers. This finding would most weaken the account of:',
  rotate: true,
  choices: [
    'Scientist 2, because breaks appear in the same places without any road salt.',
    'Scientist 1, because breaks appear in the same places without any road salt.',
    'Scientist 2, because a bridge 30 km inland is drier than one 4 km inland.',
    'Scientist 1, because a cable of the same design should corrode the same way.',
  ],
  correct_answer: 'Scientist 2, because breaks appear in the same places without any road salt.',
  explanation: 'Scientist 2 needs chloride to produce the breaks and needs road salt to supply the chloride, so it is Scientist 2 who is weakened "because breaks appear in the same places without any road salt." Scientist 1 needs only humid air and condensation, both of which the second bridge also has, so nothing there weakens Scientist 1.',
  domain: 'Evaluation of Models, Inferences, and Experimental Results', subskill: 'effect of new evidence', difficulty: 'medium',
})

p5(4, {
  prompt: 'Which of the following investigations would be most useful in deciding between the two accounts?',
  rotate: true,
  choices: [
    'Comparing the chloride content of deposits taken from the cable near a tower with that of deposits taken from the cable at mid-span',
    'Comparing the relative humidity inside the cable in summer with the relative humidity inside it in winter',
    'Comparing the thickness of the zinc still on wires at the top of the cable with that on wires at the bottom',
    'Comparing the number of broken wires found at the 14 opened places with the number found at 14 more',
  ],
  correct_answer: 'Comparing the chloride content of deposits taken from the cable near a tower with that of deposits taken from the cable at mid-span',
  explanation: 'The two accounts differ on why the damage clusters at the towers: Scientist 2 has salt entering there from the roadway, which requires chloride to be concentrated at the tower ends, while Scientist 1 has water draining there, which gives no reason for chloride to vary along the cable. Comparing "deposits taken from the cable near a tower" with deposits from mid-span therefore separates the two accounts. Humidity readings, remaining zinc, and a larger count of broken wires are all consistent with either account.',
  domain: 'Scientific Investigation', subskill: 'design a discriminating measurement', difficulty: 'hard',
})

p5(5, {
  prompt: 'Suppose the inside of the cable were dried to 50% RH and held there for several years. Scientists 1 and 2, respectively, would most likely predict that corrosion of the wires would:',
  rotate: true,
  choices: [
    'nearly stop, and continue.',
    'continue, and nearly stop.',
    'nearly stop, and nearly stop.',
    'continue, and continue.',
  ],
  correct_answer: 'nearly stop, and continue.',
  explanation: 'Scientist 1 holds that steel and zinc corrode quickly only above about 60% RH, so 50% falls below the level that account requires. Scientist 2 holds that a wire whose protective film has been destroyed by chloride "keeps corroding in air far drier than 60% RH," so for Scientist 2 the drying slows the damage without stopping it. The two predictions are therefore that corrosion would "nearly stop, and continue."',
  domain: 'Evaluation of Models, Inferences, and Experimental Results', subskill: 'predict from both viewpoints', difficulty: 'hard',
})

p5(6, {
  prompt: 'Which of the following findings, if made, would most strongly support Scientist 2\'s account?',
  rotate: true,
  choices: [
    'Wires taken from a break contain six times as much chloride as unbroken wires taken from the same cable.',
    'Sulfur dioxide in the air over the bridge has fallen to half of what it was when the bridge was built.',
    'The relative humidity inside the cable is 71% in summer and 64% in winter.',
    'Broken wires are found at 2 of 5 newly opened places that are more than 60 m from a tower.',
  ],
  correct_answer: 'Wires taken from a break contain six times as much chloride as unbroken wires taken from the same cable.',
  explanation: 'Scientist 2\'s claim is that chloride is what breaks the wires, so wires from a break holding "six times as much chloride as unbroken wires taken from the same cable" ties the damage to the proposed cause. A fall in sulfur dioxide bears on Scientist 1\'s account of the acidity; a humidity that stays above 60% year-round suits Scientist 1; and breaks far from the towers work against the salt-spray account rather than for it.',
  domain: 'Evaluation of Models, Inferences, and Experimental Results', subskill: 'evidence that strengthens a viewpoint', difficulty: 'medium',
})

/* ═══════ P6 — Research Summaries: battery self-discharge ═══════ */

const P6_E1 = [{ t: 0, v: 99 }, { t: 15, v: 97 }, { t: 25, v: 94 }, { t: 40, v: 86 }, { t: 55, v: 68 }]
const P6_E2 = [{ s: 20, v: 99 }, { s: 50, v: 98 }, { s: 80, v: 96 }, { s: 100, v: 94 }]

const p6Passage = `A charged cell loses charge slowly even when nothing is connected to it, a process called self-discharge. Manufacturers need to know what conditions make that loss fast.

Forty-five lithium cells of one model were taken from a single production lot. Each cell was fully charged and discharged three times, and the charge it delivered on the third discharge was recorded as that cell's own starting capacity. The cells were then set to the state of charge (SOC) called for by their trial, sealed in individual containers, and stored without any connection for 90 days. At the end of the 90 days each cell was discharged once, and the charge it delivered was expressed as a percent of that same cell's starting capacity. Every result reported is the mean of 5 cells.

Experiment 1

Cells were set to 100% SOC and stored at one of five temperatures.

Experiment 2

Cells were stored at 25 °C, each set to one of four states of charge.

The results of both experiments are shown in Figure 1.`

const p6Graphic = {
  type: 'bar',
  xLabel: 'Storage condition',
  yLabel: 'Charge remaining after 90 days (% of starting capacity)',
  bars: [
    ...P6_E1.map(d => ({ label: `Exp 1: ${d.t} °C`, value: d.v })),
    ...P6_E2.map(d => ({ label: `Exp 2: ${d.s}% SOC`, value: d.v })),
  ],
  caption: 'Figure 1. Mean percent of starting capacity remaining after 90 days of storage, for each condition of Experiment 1 (100% SOC, temperature varied) and Experiment 2 (25 °C, state of charge varied).',
}
const p6 = (n, o) => Q({
  id: `ACT-SC3-P6-Q${n}`, passage_id: 'sc3-p6', passage_title: 'How Stored Cells Lose Charge',
  format: 'research_summaries', passage: p6Passage, graphic: p6Graphic, ...o,
})

p6(1, {
  prompt: 'According to Figure 1, the cells stored at 40 °C in Experiment 1 retained what percent of their starting capacity?',
  choices: ['68%', '86%', '94%', '99%'],
  correct_answer: '86%',
  explanation: 'The bar for Experiment 1 at 40 °C reaches "86%." "68%" is the bar for 55 °C, "94%" the bar for 25 °C, and "99%" the bar for 0 °C.',
  domain: 'Interpretation of Data', subskill: 'read a value from a bar graph', difficulty: 'easy',
})

p6(2, {
  prompt: 'One condition of Experiment 1 and one condition of Experiment 2 were the same as each other. The results obtained under those two conditions differed by:',
  choices: ['0 percentage points', '2 percentage points', '5 percentage points', '6 percentage points'],
  correct_answer: '0 percentage points',
  explanation: 'Experiment 1 stored cells at 100% SOC while varying temperature, and Experiment 2 stored them at 25 °C while varying SOC, so 25 °C at 100% SOC belongs to both. Figure 1 shows 94% for the 25 °C bar and 94% for the 100% SOC bar, a difference of "0 percentage points."',
  domain: 'Scientific Investigation', subskill: 'identify the shared condition of two experiments', difficulty: 'hard',
})

p6(3, {
  prompt: 'Based on Experiment 1, cells stored at 100% SOC at 48 °C for 90 days would most likely have retained closest to:',
  choices: ['62%', '76%', '88%', '96%'],
  correct_answer: '76%',
  explanation: 'Figure 1 gives 86% at 40 °C and 68% at 55 °C, and 48 °C lies about halfway between those temperatures, so the retention should fall near the middle of that range. "76%" does; "88%" and "96%" are above the 40 °C result and "62%" is below the 55 °C result, though 48 °C is cooler than 55 °C.',
  domain: 'Interpretation of Data', subskill: 'interpolate between non-adjacent conditions', difficulty: 'hard',
})

p6(4, {
  prompt: 'Recording each cell\'s own capacity on its third discharge, before storage, most likely allowed the researchers to:',
  rotate: true,
  choices: [
    'keep differences in capacity between one cell and another out of the reported percentages.',
    'confirm that all forty-five cells had come from a single production lot.',
    'set each cell to the state of charge that its trial called for.',
    'establish how much charge a cell loses during a single discharge.',
  ],
  correct_answer: 'keep differences in capacity between one cell and another out of the reported percentages.',
  explanation: 'Every result is a percent of that same cell\'s starting capacity, so a cell that happened to hold more charge than its neighbors is measured against itself, which is what it takes to "keep differences in capacity between one cell and another out of the reported percentages." The single production lot was a fact about how the cells were obtained rather than something the third discharge could confirm, and setting the state of charge is a separate step performed afterward.',
  domain: 'Scientific Investigation', subskill: 'rationale for a design choice', difficulty: 'medium',
})

p6(5, {
  prompt: 'Suppose cells had been stored at 55 °C and 50% SOC for 90 days. Based on Figure 1, the charge they retained would most likely have been closest to:',
  choices: ['52%', '74%', '89%', '99%'],
  correct_answer: '74%',
  explanation: 'Storage at 55 °C and 100% SOC left 68%, the lowest result of either experiment, while dropping from 100% to 50% SOC at 25 °C raised retention from 94% to 98%, a gain of 4 points. Combining a small gain from the lower state of charge with the large loss that 55 °C produces puts the result a little above 68%, which "74%" is. "89%" and "99%" would require the heat to cost almost nothing, and "52%" would require the lower state of charge to make matters worse.',
  domain: 'Evaluation of Models, Inferences, and Experimental Results', subskill: 'predict from two experiments combined', difficulty: 'hard',
})

p6(6, {
  prompt: 'A supplier advises customers to store these cells in a cool room and at a state of charge near 50% rather than fully charged. Do the results of the two experiments support that advice?',
  rotate: true,
  choices: [
    'Yes; retention rose as storage temperature fell and also rose as state of charge fell.',
    'Yes; retention at 50% SOC was higher than retention at any temperature tested.',
    'No; retention fell as state of charge fell, so a fully charged cell keeps more of its capacity.',
    'No; retention at 0 °C and at 20% SOC was the same, so cooling the room accomplishes nothing.',
  ],
  correct_answer: 'Yes; retention rose as storage temperature fell and also rose as state of charge fell.',
  explanation: 'Figure 1 runs from 68% at 55 °C up to 99% at 0 °C, and from 94% at 100% SOC up to 99% at 20% SOC, so "retention rose as storage temperature fell and also rose as state of charge fell" and both parts of the advice match the results. Retention at 50% SOC was 98%, below the 99% measured at 0 °C, so it was not "higher than retention at any temperature tested"; retention rose rather than fell as state of charge fell; and the 0 °C and 20% SOC bars agreeing at 99% is a coincidence of two separate experiments, not a reason that cooling accomplishes nothing.',
  domain: 'Evaluation of Models, Inferences, and Experimental Results', subskill: 'evaluate a recommendation against results', difficulty: 'hard',
})

/* ═══════ P7 — Data Representation: wind dispersal of seeds ═══════ */

const P7_MID = [2.5, 7.5, 12.5, 17.5, 22.5, 27.5, 32.5]
const P7 = {
  X3: [34, 30, 18, 10, 5, 2, 1],
  Y3: [8, 16, 24, 26, 15, 8, 3],
  X6: [12, 20, 24, 20, 12, 8, 4],
}
const p7Svg = '<svg viewBox="0 0 350 250" width="320" role="img" font-family="sans-serif" '
  + 'aria-label="Percent of released seeds landing in each five meter distance band, for Species X at 3 and 6 meters per second and Species Y at 3 meters per second">'
  + '<rect width="350" height="250" fill="#fff"/>'
  + panel({
    L: 44, R: 336, T: 32, B: 160, x0: 0, x1: 35, y0: 0, y1: 40,
    xt: [0, 5, 10, 15, 20, 25, 30, 35], yt: [0, 10, 20, 30, 40],
    xLabel: 'Distance from release point (m); points plotted at band centers',
    yLabel: 'Seeds landing in band (%)',
    series: [
      { pts: P7_MID.map((m, i) => [m, P7.X3[i]]) },
      { pts: P7_MID.map((m, i) => [m, P7.Y3[i]]) },
      { pts: P7_MID.map((m, i) => [m, P7.X6[i]]) },
    ],
  })
  + legend(60, 202, ['Species X, 3.0 m/s wind', 'Species Y, 3.0 m/s wind', 'Species X, 6.0 m/s wind'], 13)
  + '<text x="14" y="14" font-size="10" font-weight="bold">Figure 1</text>'
  + '</svg>'

const p7Graphic = {
  type: 'svg', svg: p7Svg,
  caption: 'Figure 1. Percent of the 500 seeds of each release that landed in each 5 m band, plotted at the center of the band.',
}

const p7Passage = `The seed of many trees carries a single stiff wing. As the seed falls the wing makes it spin, which slows the fall and gives wind time to carry the seed away from the parent tree.

Seeds of two species were released one at a time from a height of 8.0 m at one end of a wind tunnel 40 m long, into a steady horizontal wind. The floor of the tunnel was marked in bands 5 m wide, and each seed was recorded as landing in one band. A seed of Species X has a mass of 92 mg and a wing area of 1.4 cm²; a seed of Species Y has a mass of 38 mg and a wing area of 2.6 cm². Heavier seeds with smaller wings fall faster and so spend less time in the wind.

Five hundred seeds of Species X and 500 seeds of Species Y were released into a wind of 3.0 m/s, and a further 500 seeds of Species X were released into a wind of 6.0 m/s. No seed reached the far end of the tunnel. Figure 1 gives, for each release, the percent of the 500 seeds that landed in each band.`

const p7 = (n, o) => Q({
  id: `ACT-SC3-P7-Q${n}`, passage_id: 'sc3-p7', passage_title: 'How Far a Winged Seed Travels',
  format: 'data_representation', passage: p7Passage, graphic: p7Graphic, ...o,
})

p7(1, {
  prompt: 'According to Figure 1, the greatest percent of Species Y seeds released into the 3.0 m/s wind landed in which band?',
  choices: ['5–10 m', '10–15 m', '15–20 m', '20–25 m'],
  correct_answer: '15–20 m',
  explanation: 'The Species Y curve at 3.0 m/s rises to its highest point, 26%, above the center of the "15–20 m" band. The neighboring "10–15 m" band holds 24% and "20–25 m" holds 15%.',
  domain: 'Interpretation of Data', subskill: 'read a maximum from a graph', difficulty: 'easy',
})

p7(2, {
  prompt: 'According to Figure 1, what percent of the Species X seeds released into the 3.0 m/s wind landed more than 15 m from the release point?',
  choices: ['8%', '18%', '34%', '66%'],
  correct_answer: '18%',
  explanation: 'For Species X at 3.0 m/s the bands beyond 15 m hold 10%, 5%, 2%, and 1%, which total "18%." "34%" is the single band closest to the release point, and "66%" is what lands within 10 m.',
  domain: 'Interpretation of Data', subskill: 'sum values across bands', difficulty: 'medium',
})

p7(3, {
  prompt: 'For Species X, doubling the wind speed from 3.0 m/s to 6.0 m/s moved the band holding the greatest percent of seeds:',
  rotate: true,
  choices: [
    'from 0–5 m to 10–15 m.',
    'from 0–5 m to 5–10 m.',
    'from 5–10 m to 15–20 m.',
    'from 10–15 m to 20–25 m.',
  ],
  correct_answer: 'from 0–5 m to 10–15 m.',
  explanation: 'The peak moved "from 0–5 m to 10–15 m": at 3.0 m/s the Species X curve is highest over the 0–5 m band, at 34%, and falls steadily after it. At 6.0 m/s the highest point of the Species X curve, 24%, stands over the 10–15 m band, and the 0–5 m band holds only 12%.',
  domain: 'Interpretation of Data', subskill: 'compare two curves on one figure', difficulty: 'medium',
})

p7(4, {
  prompt: 'For Species Y at 3.0 m/s, half of the seeds landed closer to the release point than some distance D, and half landed farther away. Based on Figure 1, D lies within which band?',
  choices: ['5–10 m', '10–15 m', '15–20 m', '20–25 m'],
  correct_answer: '15–20 m',
  explanation: 'Adding the Species Y values from the release point outward gives 8%, then 24%, then 48%, then 74%. The running total passes 50% while crossing the "15–20 m" band, so D lies there. At the far edge of "10–15 m" only 48% of the seeds have landed.',
  domain: 'Interpretation of Data', subskill: 'find a median from a distribution', difficulty: 'hard',
})

p7(5, {
  prompt: 'Suppose 500 seeds of a third species, whose seeds have a mass of 60 mg and a wing area of 2.0 cm², were released into a 3.0 m/s wind under the same conditions. Based on Figure 1 and the passage, the percent of those seeds landing within 10 m of the release point would most likely be closest to:',
  choices: ['18%', '44%', '70%', '88%'],
  correct_answer: '44%',
  explanation: 'A seed of 60 mg with a wing of 2.0 cm² is heavier and smaller-winged than Species Y and lighter and larger-winged than Species X, so it should fall at a rate between theirs and travel a distance between theirs. Figure 1 puts 34% and 30%, or 64%, of Species X within 10 m and 8% and 16%, or 24%, of Species Y within 10 m, so a value between them is expected, and only "44%" lies there.',
  domain: 'Evaluation of Models, Inferences, and Experimental Results', subskill: 'predict for an intermediate case', difficulty: 'hard',
})

/* ─────────────── key placement balancer ─────────────── */
/* Numeric option sets stay in the ascending order authored above; their key
   slots are whatever the distractor values make them. Prose items marked
   `rotate` have their key moved to whichever slot is furthest from its
   target of 10, so the finished form is 10/10/10/10. */
const counts = [0, 0, 0, 0]
for (const it of items) if (!it.rotate) counts[it.choices.indexOf(it.correct_answer)]++
for (const it of items) {
  if (!it.rotate) continue
  const target = counts.indexOf(Math.min(...counts))
  const rest = it.choices.filter(c => c !== it.correct_answer)
  it.choices = [...rest.slice(0, target), it.correct_answer, ...rest.slice(target)]
  counts[target]++
}
for (const it of items) delete it.rotate

/* ─────────────── self-checks the checker does not run ─────────────── */
const slot = it => it.choices.indexOf(it.correct_answer)
const len = s => String(s).length
const fail = []
if (items.length !== 40) fail.push(`${items.length} items`)
const slots = [0, 0, 0, 0]; for (const it of items) slots[slot(it)]++
if (slots.some(n => n !== 10)) fail.push(`key slots ${slots.join('/')}`)
let longest = 0, shortest = 0
for (const it of items) {
  const L = it.choices.map(len), k = len(it.correct_answer)
  if (L.filter(x => x >= k).length === 1) longest++
  if (L.filter(x => x <= k).length === 1) shortest++
}
if (longest > 10) fail.push(`key strictly longest in ${longest}`)
if (shortest > 10) fail.push(`key strictly shortest in ${shortest}`)
for (const it of items) {
  /* The explanation must quote the KEY's own wording — not merely contain a
     quotation mark. The first draft tested only for a quote character and
     passed eight explanations that quoted a distractor or nothing at all. */
  const key = String(it.correct_answer).toLowerCase()
  const spans = [...String(it.explanation).matchAll(/"([^"]{2,})"/g)].map(m => m[1].toLowerCase().replace(/[.,;:]+$/, ''))
  if (!spans.some(q => key.includes(q))) fail.push(`${it.id}: explanation quotes no text from the key`)
}
for (const g of ['sc3-p1', 'sc3-p3', 'sc3-p4', 'sc3-p6', 'sc3-p7']) {
  const gi = items.filter(i => i.passage_id === g)
  if (new Set(gi.map(i => JSON.stringify(i.graphic))).size !== 1) fail.push(`${g}: graphic not identical`)
}
for (const it of items) if (it.graphic?.type === 'svg' && Buffer.byteLength(it.graphic.svg) > 6000) fail.push(`${it.id}: svg ${Buffer.byteLength(it.graphic.svg)} bytes`)

const out = 'scripts/study-bank/act-science-v3.batch.json'
writeFileSync(out, JSON.stringify(items, null, 1) + '\n')
const dom = {}, diff = {}, fmtc = {}
for (const it of items) { dom[it.domain] = (dom[it.domain] ?? 0) + 1; diff[it.difficulty] = (diff[it.difficulty] ?? 0) + 1; fmtc[it.format] = (fmtc[it.format] ?? 0) + 1 }
console.log(`wrote ${out}: ${items.length} items`)
console.log('key slots:', slots.join(' / '), ' key strictly longest:', longest, ' strictly shortest:', shortest)
console.log('domains:', JSON.stringify(dom))
console.log('difficulty:', JSON.stringify(diff))
console.log('items by format:', JSON.stringify(fmtc))
console.log('svg bytes:', items.filter(i => i.graphic?.type === 'svg').map(i => `${i.passage_id}:${Buffer.byteLength(i.graphic.svg)}`).filter((v, i, a) => a.indexOf(v) === i).join(' '))
if (fail.length) { console.error('SELF-CHECK FAILED:\n  ' + fail.join('\n  ')); process.exit(1) }
console.log('self-checks OK')
