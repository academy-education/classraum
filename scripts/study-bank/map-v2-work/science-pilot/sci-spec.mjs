/**
 * sci-spec.mjs: the one table of MAP Science pilot constants. make-slots.mjs, sci-check.mjs, sci-packet.mjs and
 * stage-map-science-pilot.mjs all import it, so a rule cannot drift between the slot table, the checker and the stager.
 *
 * Areas are NWEA's exact instructional-area strings (MAP Growth: Instructional Areas, NGSS, July 2023). They are the
 * `study_item_bank.domain` the MAP_AREA_QUOTAS.science draw will key on (MAP-SCIENCE-PLAN.md §2.1).
 * The NGSS performance-expectation codes are the public NGSS (2013) list, per grade band. They are NOT NWEA content.
 */
export const AREAS = {
  L: 'Life Science',
  P: 'Physical Science',
  E: 'Earth and Space Science',
}
/** DCIs per area (NWEA sub-areas = NGSS disciplinary core ideas). */
export const DCIS = {
  'Life Science': ['LS1', 'LS2', 'LS3', 'LS4'],
  'Physical Science': ['PS1', 'PS2', 'PS3', 'PS4'],
  'Earth and Space Science': ['ESS1', 'ESS2', 'ESS3'],
}
const range = (p, n) => Array.from({ length: n }, (_, i) => `${p}-${i + 1}`)
/** Grade 5 draws on the 3-5 band (the MAP 2-5 test spans it); grades 6-8 on the MS band. */
export const PES = {
  band35: [
    '3-LS1-1', '3-LS2-1', ...range('3-LS3', 2), ...range('3-LS4', 4), ...range('4-LS1', 2), '5-LS1-1', '5-LS2-1',
    ...range('3-PS2', 4), ...range('4-PS3', 4), ...range('4-PS4', 3), ...range('5-PS1', 4), '5-PS2-1', '5-PS3-1',
    ...range('3-ESS2', 2), '3-ESS3-1', '4-ESS1-1', ...range('4-ESS2', 2), ...range('4-ESS3', 2), ...range('5-ESS1', 2),
    ...range('5-ESS2', 2), '5-ESS3-1',
  ],
  bandMS: [
    ...range('MS-LS1', 8), ...range('MS-LS2', 5), ...range('MS-LS3', 2), ...range('MS-LS4', 6),
    ...range('MS-PS1', 6), ...range('MS-PS2', 5), ...range('MS-PS3', 5), ...range('MS-PS4', 3),
    ...range('MS-ESS1', 4), ...range('MS-ESS2', 6), ...range('MS-ESS3', 5),
  ],
}
export const peBand = g => (g === 5 ? 'band35' : 'bandMS')
/** "MS-LS2-3" -> "LS2"; "4-PS3-1" -> "PS3". */
export const dciOfPe = pe => (String(pe).match(/^(?:MS|\d)-([A-Z]+\d)-\d+$/) ?? [])[1] ?? null

export const TIERS = ['low', 'mid', 'high']
export const DIFF = { low: 'easy', mid: 'medium', high: 'hard' }
/** Bands of 10 around the 2025 fall general-science student mean (201/204/207/210; NWEA 2025 norms quick reference). */
export const RIT = {
  5: { low: 'RIT 186-195', mid: 'RIT 196-205', high: 'RIT 206-215' },
  6: { low: 'RIT 189-198', mid: 'RIT 199-208', high: 'RIT 209-218' },
  7: { low: 'RIT 192-201', mid: 'RIT 202-211', high: 'RIT 212-221' },
  8: { low: 'RIT 195-204', mid: 'RIT 205-214', high: 'RIT 215-224' },
}

/** Item kinds (MAP-SCIENCE-PLAN.md §2.3). */
export const KINDS = ['data', 'investigation', 'model']
/**
 * Stimulus types. The graphic JSON is the SAME shape ACT Science stores in item.graphic and the runner
 * (QuestionGraphicView.tsx) draws: table {rowLabels, colLabels, cells}, bar {bars:[{label,value}], xLabel, yLabel},
 * line {series:[{points:[[x,y]...]}], xLabel, yLabel}, scatter {points:[[x,y]...], xLabel, yLabel}, + caption.
 */
export const STIMULI = {
  table: { graphic: 'table', passage: 'optional' },
  bar: { graphic: 'bar', passage: 'optional' },
  line: { graphic: 'line', passage: 'optional' },
  scatter: { graphic: 'scatter', passage: 'optional' },
  procedure: { graphic: null, passage: 'required' },
  'procedure+table': { graphic: 'table', passage: 'required' },
  scenario: { graphic: null, passage: 'none' },
}
/**
 * Option formats. Every one but `claim` holds the four options in ONE frame varying only the element the stem names
 * (the CLAUDE.md axis rule: an item leaks when options differ along the axis the stem names in a way readable without
 * the source). `rank` means: values -> ascending numeric rank of the key; every other format -> key length rank.
 */
export const FORMATS = {
  values: 'four numbers, same unit, same decimal places; key rank = ascending VALUE rank',
  conditions: 'four trial / group / sample / location labels that each appear in the stimulus; key rank = LENGTH rank',
  trend: 'four descriptions of how a quantity changes (one direction word each); key rank = LENGTH rank',
  variable: 'four quantities named in the procedure; key rank = LENGTH rank',
  term: 'four science terms or named processes of one kind; key rank = LENGTH rank',
  claim: 'four full statements (the leaky shape; capped); key rank = LENGTH rank',
}
/** What the stem asks, per format. Assigned per slot so the load-bearing element varies across items. */
export const ASKS = {
  values: ['read', 'difference', 'interpolate', 'ratio'],
  conditions: ['greatest', 'least', 'meets-criterion', 'controlled-pair'],
  trend: ['increase', 'decrease', 'no-change', 'increase-then-level'],
  variable: ['independent', 'dependent', 'controlled', 'controlled'],
  term: ['process', 'structure', 'quantity', 'example'],
  claim: ['explains', 'predicts', 'supported', 'not-supported'],
}
/** Direction words, for `trend`. A trend option must contain exactly one family. */
export const TREND_WORDS = {
  increase: /\b(increase[sd]?|increasing|rise[sn]?|rising|rose|grew|grow[sn]?|higher)\b/i,
  decrease: /\b(decrease[sd]?|decreasing|fall[sn]?|falling|fell|drop(?:s|ped)?|lower|declin\w*)\b/i,
  same: /\b(stay(?:s|ed)?|remain(?:s|ed)?|unchanged|constant|same|level(?:s|ed)? off)\b/i,
}
/** Science clichés that may key at most 2 items per batch (MAP-SCIENCE-PLAN.md §4.3). */
export const CLICHES = [
  /\bfair test\b/i, /\brepeat(?:ed|ing)? the (?:trial|experiment|test)\b/i, /\bmore (?:data|trials|tests) (?:are|is) needed\b/i,
  /\bnot enough (?:data|information|evidence)\b/i, /\bthe variable that (?:was|is) changed\b/i, /\bcontrol group\b/i,
]
/** Absolutes / hedges for the batch-level absolutes rule. */
export const ABSOLUTE = /\b(always|never|only|all|none|every|entirely|completely|solely|cannot|must)\b/i
export const HEDGE = /\b(may|might|can|could|some|often|usually|tends? to|likely|probably|partly|most)\b/i

export const LETTERS = ['A', 'B', 'C', 'D']
export const norm = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9.%-]+/g, ' ').trim()
/** Parse "12.5 g" -> { v: 12.5, unit: 'g', places: 1 }; null if not a single number with an optional unit. */
export function numOf(s) {
  const m = String(s).trim().match(/^(-?\d+(?:\.(\d+))?)\s*([^\d\s].*)?$/)
  if (!m) return null
  return { v: Number(m[1]), places: (m[2] ?? '').length, unit: (m[3] ?? '').trim() }
}
