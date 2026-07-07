import { createHash } from 'node:crypto'

// Local structural types (kept in sync with the Question/QuestionGraphic
// shapes in @/lib/test-verify). Defined locally rather than imported so
// this module is self-contained and runnable outside the Next path-alias
// context (batch bank-fill scripts). The bank stores `item` as jsonb, so
// structural compatibility — not nominal identity — is what matters.
type QuestionGraphic = {
  type?: string | null
  rowLabels?: string[] | null; colLabels?: string[] | null; cells?: unknown[][] | null
  spec?: unknown; labels?: unknown; caption?: string | null
  [k: string]: unknown
}
type Question = {
  passage: string | null; passageGroupId: string | null; prompt: string
  type: 'multiple_choice'; choices: string[]; correct_answer: string
  correct_answers: string[] | null; acceptable_answers: string[] | null
  difficulty: 'easy' | 'medium' | 'hard'; explanation: string
  distractor_rationales: { choice: string; reason: string }[]
  blanks: { id: number; answer: string; alternates?: string[] | null }[] | null
  graphic: QuestionGraphic | null
  domain: string | null; subskill: string | null; topic_tag: string | null; word_count: number | null
}

/**
 * Parametrized hard-SAT-Math item templates.
 *
 * Each template BUILDS the problem and COMPUTES the exact answer key in
 * code, so every emitted item is correct by construction — no LLM math,
 * no impossible items, no mis-keyed distractors. This is the primary
 * verification for hard math: the code is the proof (measured 100%
 * correct vs ~41% from the live generator). Distractors encode the
 * specific error each archetype invites.
 *
 * A template returns a fully-formed bank item, or null when a random
 * draw violates its constraints (non-integer answer, degenerate
 * system, can't form 3 distinct distractors) — the caller just retries.
 *
 * To grow the bank: add templates here and/or raise variants-per-
 * template. `topic_tag` groups variants so the assembler never serves
 * two variants of one archetype in the same test.
 */

export interface BankItem {
  section: 'math'
  domain: string
  subskill: string
  difficulty: 'hard'
  topic_tag: string
  item_type: 'multiple_choice'
  item: Question
  content_hash: string
  word_count: number | null
  verified: true
  verify_meta: { method: string; single_defensible: true; at: string }
  source: 'hand'
}

// ── small helpers ──────────────────────────────────────────────────
const rnd = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1))
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]!
const igcd = (a: number, b: number): number => { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b] } return a }
const frac = (n: number, d: number): string => {
  const g = igcd(n, d) || 1; n /= g; d /= g; if (d < 0) { n = -n; d = -d }
  return d === 1 ? `${n}` : `${n}/${d}`
}
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const hashOf = (prompt: string, choices: string[], passage = '') =>
  createHash('md5').update([norm(passage), norm(prompt), choices.map(norm).join('|')].join('~~')).digest('hex')

interface McInput {
  domain: string; subskill: string; topic_tag: string; prompt: string
  correct: number | string; distractors: Array<number | string>; explanation: string
  graphic?: QuestionGraphic | null
}

/** Build + self-check a 4-choice item (exactly one correct, all distinct). */
function mc(inp: McInput): BankItem | null {
  const correct = String(inp.correct)
  const seen = new Set([correct])
  const ds: string[] = []
  for (const d of inp.distractors) {
    const s = String(d)
    if (!seen.has(s)) { seen.add(s); ds.push(s) }
  }
  if (ds.length < 3) return null
  const choices = [correct, ...ds.slice(0, 3)]
  for (let i = choices.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[choices[i], choices[j]] = [choices[j]!, choices[i]!] }
  if (choices.filter(c => c === correct).length !== 1) return null
  const item: Question = {
    passage: null, passageGroupId: null, prompt: inp.prompt, type: 'multiple_choice',
    choices, correct_answer: correct, correct_answers: null, acceptable_answers: null,
    difficulty: 'hard', explanation: inp.explanation, distractor_rationales: [], blanks: null,
    graphic: inp.graphic ?? null, domain: inp.domain, subskill: inp.subskill,
    topic_tag: inp.topic_tag, word_count: null,
  }
  return {
    section: 'math', domain: inp.domain, subskill: inp.subskill, difficulty: 'hard',
    topic_tag: inp.topic_tag, item_type: 'multiple_choice', item,
    content_hash: hashOf(inp.prompt, choices), word_count: null, verified: true,
    verify_meta: { method: 'template-computed', single_defensible: true, at: 'template-v1' },
    source: 'hand',
  }
}

type Template = () => BankItem | null

export const TEMPLATES: Record<string, Template> = {
  // 1) Linear system, solve for x+y without isolating.
  system_expr() {
    const x = rnd(-5, 8), y = rnd(-5, 8)
    const a1 = rnd(2, 5), b1 = rnd(2, 5), a2 = rnd(2, 5), b2 = rnd(2, 5)
    if (a1 * b2 - a2 * b1 === 0) return null
    const c1 = a1 * x + b1 * y, c2 = a2 * x + b2 * y
    return mc({ domain: 'Algebra', subskill: 'Systems solved for an expression', topic_tag: 'system-sum',
      prompt: `If ${a1}x + ${b1}y = ${c1} and ${a2}x + ${b2}y = ${c2}, what is the value of x + y?`,
      correct: x + y, distractors: [x, y, x - y, 2 * (x + y)],
      explanation: `Solving the system gives x = ${x} and y = ${y}, so x + y = ${x + y}.` })
  },
  // 2) Vieta: r^2 + s^2 from x^2 + px + q = 0.
  vieta_sq() {
    let r = rnd(-6, 7), s = rnd(-6, 7); if (r === s) s += 1
    const p = -(r + s), q = r * s, ans = r * r + s * s
    const pp = p < 0 ? `- ${Math.abs(p)}` : `+ ${p}`, qq = q < 0 ? `- ${Math.abs(q)}` : `+ ${q}`
    return mc({ domain: 'Advanced Math', subskill: "Vieta's relations", topic_tag: 'vieta-sum-squares',
      prompt: `The solutions to x^2 ${pp}x ${qq} = 0 are r and s. What is the value of r^2 + s^2?`,
      correct: ans, distractors: [(r + s) * (r + s), ans - 2 * q, q, (r - s) * (r - s) + 1],
      explanation: `By Vieta's, r + s = ${r + s} and rs = ${q}. Then r^2 + s^2 = (r+s)^2 - 2rs = ${(r + s) ** 2} - ${2 * q} = ${ans}.` })
  },
  // 3) Exponential model: given f(1), f(3), find f(5).
  exp_model() {
    const A = rnd(2, 6), b = pick([2, 3])
    const f1 = A * b, f3 = A * b ** 3, f5 = A * b ** 5
    return mc({ domain: 'Advanced Math', subskill: 'Exponential models', topic_tag: 'exp-ratio',
      prompt: `An exponential function f is defined by f(x) = A·b^x for constants A and b > 0. If f(1) = ${f1} and f(3) = ${f3}, what is f(5)?`,
      correct: f5, distractors: [A * b ** 4, f3 * b, A * (b + 1) ** 5, f5 - f3],
      explanation: `f(3)/f(1) = b^2 = ${b * b}, so b = ${b} and A = ${A}; f(5) = ${A}·${b}^5 = ${f5}.` })
  },
  // 4) Similar solids: area ratio -> volume.
  similar_solids() {
    const [p, q] = pick([[2, 3], [3, 4], [3, 5], [4, 5], [2, 5]])
    const k = rnd(2, 6), Vs = k * p ** 3, Vl = k * q ** 3
    return mc({ domain: 'Geometry and Trigonometry', subskill: 'Similar solids scaling', topic_tag: 'similar-solids',
      prompt: `Two similar solids have surface areas in the ratio ${p * p}:${q * q}. If the smaller solid has volume ${Vs} cubic units, what is the volume of the larger solid?`,
      correct: Vl, distractors: [Math.round(Vs * (q * q) / (p * p)), Math.round(Vs * q / p), 2 * Vs, Vl + 1],
      explanation: `Linear ratio = sqrt(${p * p}/${q * q}) = ${p}/${q}; volume ratio = (${q}/${p})^3; ${Vs} × ${q ** 3}/${p ** 3} = ${Vl}.` })
  },
  // 5) Conditional probability from a two-way table (with figure).
  cond_prob() {
    const a = rnd(20, 50), b = rnd(20, 50), c = rnd(20, 50), d = rnd(20, 50)
    const graphic: QuestionGraphic = { type: 'twoWayTable', rowLabels: ['Group A', 'Group B'], colLabels: ['Yes', 'No'], cells: [[a, b], [c, d]], caption: 'Survey results' }
    return mc({ domain: 'Problem-Solving and Data Analysis', subskill: 'Conditional probability', topic_tag: 'cond-prob-table',
      prompt: `The two-way table shows survey results for ${a + b + c + d} people. If a person who answered "Yes" is selected at random, what is the probability the person is in Group A?`,
      correct: frac(a, a + c), distractors: [frac(a, a + b), frac(a, a + b + c + d), frac(c, a + c)],
      explanation: `Condition on "Yes": ${a + c} people, of whom ${a} are in Group A, so ${a}/${a + c} = ${frac(a, a + c)}.`, graphic })
  },
  // 6) Compound percent change: find the start.
  percent_change() {
    const [x, y] = pick([[25, -20], [20, -25], [50, -40], [10, 10], [-10, 20]])
    const factor = (1 + x / 100) * (1 + y / 100)
    const start = pick([50, 80, 100, 120, 150, 200])
    const end = Math.round(start * factor)
    if (Math.abs(start * factor - end) > 1e-9) return null
    const sgn = (v: number) => v < 0 ? `fell ${Math.abs(v)}%` : `rose ${v}%`
    return mc({ domain: 'Problem-Solving and Data Analysis', subskill: 'Compound percent change', topic_tag: 'percent-compound',
      prompt: `A quantity ${sgn(x)} in the first year and then ${sgn(y)} in the second year. If its value at the end of the second year was ${end}, what was its value at the start?`,
      correct: start, distractors: [Math.round(end / (1 + y / 100)), Math.round(end * (1 + x / 100)), Math.round(end * (1 + (x + y) / 100))],
      explanation: `Start × ${(1 + x / 100).toFixed(2)} × ${(1 + y / 100).toFixed(2)} = ${end}, so start = ${start}.` })
  },
  // 7) Right-triangle trig from a Pythagorean triple.
  triangle_trig() {
    const [o, adj, h] = pick([[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29], [9, 40, 41]])
    const ratio = pick(['sin', 'cos', 'tan'] as const)
    const val = ratio === 'sin' ? frac(o, h) : ratio === 'cos' ? frac(adj, h) : frac(o, adj)
    const distract = [frac(adj, h), frac(o, h), frac(adj, o), frac(o, adj)].filter(v => v !== val)
    return mc({ domain: 'Geometry and Trigonometry', subskill: 'Right-triangle trigonometry', topic_tag: 'triangle-trig',
      prompt: `In right triangle ABC, the right angle is at C. The side opposite angle A has length ${o}, the side adjacent to angle A (not the hypotenuse) has length ${adj}, and the hypotenuse has length ${h}. What is ${ratio} A?`,
      correct: val, distractors: distract,
      explanation: `${ratio} A = ${ratio === 'sin' ? `${o}/${h}` : ratio === 'cos' ? `${adj}/${h}` : `${o}/${adj}`} = ${val}.` })
  },
  // 8) Quadratic minimum value (completing the square).
  quadratic_vertex() {
    const a = pick([1, 2, 3]), h = rnd(-4, 5), k = rnd(-8, 8)
    const b = -2 * a * h, c = a * h * h + k    // f(x)=a(x-h)^2+k = ax^2+bx+c
    const bb = b < 0 ? `- ${Math.abs(b)}` : `+ ${b}`, cc = c < 0 ? `- ${Math.abs(c)}` : `+ ${c}`
    return mc({ domain: 'Advanced Math', subskill: 'Quadratic vertex / min-max', topic_tag: 'quadratic-min',
      prompt: `The function f is defined by f(x) = ${a}x^2 ${bb}x ${cc}. What is the minimum value of f(x)?`,
      correct: k, distractors: [c, h, -k, k + a],
      explanation: `Completing the square gives f(x) = ${a}(x - ${h})^2 + ${k}, so the minimum value is ${k} (at x = ${h}).` })
  },
  // 9) Horizontal line tangent to a circle in general form (guaranteed tangent).
  horizontal_tangent() {
    const cx = rnd(-3, 5), cy = rnd(-2, 6), r = rnd(2, 6)
    // x^2+y^2-2cx x-2cy y+(cx^2+cy^2-r^2)=0
    const A = -2 * cx, B = -2 * cy, C = cx * cx + cy * cy - r * r
    const aa = A < 0 ? `- ${Math.abs(A)}x` : `+ ${A}x`, bb = B < 0 ? `- ${Math.abs(B)}y` : `+ ${B}y`, cc = C < 0 ? `- ${Math.abs(C)}` : `+ ${C}`
    const top = cy + r
    return mc({ domain: 'Advanced Math', subskill: 'Circles in general form', topic_tag: 'horizontal-tangent',
      prompt: `In the xy-plane, the circle with equation x^2 + y^2 ${aa} ${bb} ${cc} = 0 has a horizontal tangent line at its highest point. What is the y-coordinate of that tangent line?`,
      correct: top, distractors: [cy - r, cy, r, top + 1],
      explanation: `Completing the square gives center (${cx}, ${cy}) and radius ${r}. The highest point is at y = ${cy} + ${r} = ${top}.` })
  },
  // 10) Remainder theorem: remainder mod (x-a)(x-b) is linear.
  remainder_theorem() {
    const a = rnd(1, 4), b = rnd(a + 1, 6)
    let m = rnd(1, 4); if (rnd(0, 1)) m = -m
    const n = rnd(-5, 6)
    const R1 = m * a + n, R2 = m * b + n     // r(x)=mx+n
    const key = `${m}x ${n < 0 ? '- ' + Math.abs(n) : '+ ' + n}`
    return mc({ domain: 'Advanced Math', subskill: 'Polynomial remainder theorem', topic_tag: 'remainder-linear',
      prompt: `A polynomial p(x) leaves a remainder of ${R1} when divided by (x - ${a}) and a remainder of ${R2} when divided by (x - ${b}). What is the remainder when p(x) is divided by (x - ${a})(x - ${b})?`,
      correct: key,
      distractors: [`${m}x ${n < 0 ? '+ ' + Math.abs(n) : '- ' + n}`, `${m + 1}x ${n < 0 ? '- ' + Math.abs(n) : '+ ' + n}`, `${R1}`, `${m}x`],
      explanation: `The remainder is linear, r(x) = mx + n, with r(${a}) = ${R1} and r(${b}) = ${R2}. Solving gives m = ${m}, n = ${n}.` })
  },
  // 11) Circle chord length from radius + distance (with figure).
  circle_chord() {
    const [d, half, r] = pick([[5, 12, 13], [8, 15, 17], [6, 8, 10], [7, 24, 25], [9, 12, 15], [16, 12, 20]])
    const graphic: QuestionGraphic = { type: 'chordAtDistance', spec: { r, distanceFromCenter: d } as unknown, labels: { center: 'O', endpoints: ['A', 'B'] } as unknown, caption: 'Circle O' }
    return mc({ domain: 'Geometry and Trigonometry', subskill: 'Circle chords', topic_tag: 'circle-chord',
      prompt: `In circle O with radius ${r}, chord AB is at a perpendicular distance of ${d} from the center. What is the length of chord AB?`,
      correct: 2 * half, distractors: [half, r, d + r, 2 * half + 2],
      explanation: `The perpendicular from the center bisects the chord, forming a right triangle with hypotenuse ${r} and one leg ${d}: half = sqrt(${r}^2 - ${d}^2) = ${half}, so AB = ${2 * half}.`, graphic })
  },
  // 12) Coordinate-plane distance (Pythagorean triple).
  coord_distance() {
    const [dx, dy, dist] = pick([[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [9, 12, 15]])
    const x1 = rnd(-4, 4), y1 = rnd(-4, 4)
    const x2 = x1 + dx, y2 = y1 + dy
    return mc({ domain: 'Geometry and Trigonometry', subskill: 'Distance in the plane', topic_tag: 'coord-distance',
      prompt: `In the xy-plane, what is the distance between the points (${x1}, ${y1}) and (${x2}, ${y2})?`,
      correct: dist, distractors: [dx + dy, dist + 1, Math.round(Math.sqrt(dx * dx)) + Math.round(Math.sqrt(dy * dy)) + 1, dist - 1],
      explanation: `Distance = sqrt((${dx})^2 + (${dy})^2) = sqrt(${dx * dx + dy * dy}) = ${dist}.` })
  },
  // 13) Arithmetic sequence: nth term.
  arithmetic_seq() {
    const a1 = rnd(-5, 8), diff = rnd(2, 7), n = rnd(8, 20)
    const an = a1 + (n - 1) * diff
    return mc({ domain: 'Algebra', subskill: 'Arithmetic sequences', topic_tag: 'arith-nth',
      prompt: `In an arithmetic sequence, the first term is ${a1} and the common difference is ${diff}. What is the ${n}th term?`,
      correct: an, distractors: [a1 + n * diff, a1 + (n - 1) * diff + diff, n * diff, an - diff],
      explanation: `The ${n}th term = a1 + (n - 1)d = ${a1} + ${n - 1}·${diff} = ${an}.` })
  },
  // 14) Mean with an unknown value.
  mean_unknown() {
    const k = rnd(3, 5)
    const known: number[] = Array.from({ length: k }, () => rnd(4, 40))
    const mean = rnd(10, 30)
    const total = mean * (k + 1)
    const x = total - known.reduce((s, v) => s + v, 0)
    if (x < 1 || x > 90) return null
    return mc({ domain: 'Problem-Solving and Data Analysis', subskill: 'Mean with an unknown', topic_tag: 'mean-unknown',
      prompt: `A list of ${k + 1} numbers has a mean of ${mean}. If ${k} of the numbers are ${known.join(', ')}, what is the remaining number?`,
      correct: x, distractors: [mean, total - x, x + mean, x - 1],
      explanation: `The total of all ${k + 1} numbers is ${mean}·${k + 1} = ${total}. Subtracting the known sum ${total - x} leaves ${x}.` })
  },
  // 15) Geometric sequence: nth term.
  geometric_seq() {
    const a1 = rnd(2, 5), r = pick([2, 3]), n = rnd(4, 7)
    const an = a1 * r ** (n - 1)
    return mc({ domain: 'Advanced Math', subskill: 'Geometric sequences', topic_tag: 'geom-nth',
      prompt: `In a geometric sequence, the first term is ${a1} and the common ratio is ${r}. What is the ${n}th term?`,
      correct: an, distractors: [a1 * r ** n, a1 * r * (n - 1), a1 + (n - 1) * r, an * r],
      explanation: `The ${n}th term = a1·r^(n-1) = ${a1}·${r}^${n - 1} = ${an}.` })
  },
  // 16) Linear cost model: solve for the number of units.
  linear_units() {
    const F = pick([10, 15, 20, 25, 30]), R = pick([3, 4, 5, 6, 8]), n = rnd(5, 15)
    const T = F + R * n
    return mc({ domain: 'Algebra', subskill: 'Linear models', topic_tag: 'linear-units',
      prompt: `A service charges a flat fee of $${F} plus $${R} for each unit used. If the total charge was $${T}, how many units were used?`,
      correct: n, distractors: [Math.round(T / R), T - F, n - 1, n + 1],
      explanation: `${F} + ${R}n = ${T}, so ${R}n = ${T - F} and n = ${n}.` })
  },
  // 17) Absolute value: sum of the two solutions.
  abs_value_sum() {
    const h = rnd(-6, 8), k = rnd(2, 9)
    const disp = h < 0 ? `+ ${Math.abs(h)}` : `- ${h}`
    return mc({ domain: 'Advanced Math', subskill: 'Absolute value equations', topic_tag: 'abs-sum',
      prompt: `The equation |x ${disp}| = ${k} has two solutions. What is the sum of the two solutions?`,
      correct: 2 * h, distractors: [2 * k, h, h + k, 2 * h + 1],
      explanation: `The solutions are ${h} + ${k} = ${h + k} and ${h} - ${k} = ${h - k}; their sum is ${2 * h}.` })
  },
  // 18) Markup then discount: final price.
  markup_discount() {
    const P = pick([80, 120, 150, 200, 250]), up = pick([20, 25, 50]), off = pick([10, 20, 40])
    const final = P * (1 + up / 100) * (1 - off / 100)
    if (!Number.isInteger(final)) return null
    return mc({ domain: 'Problem-Solving and Data Analysis', subskill: 'Percent markup and discount', topic_tag: 'markup-discount',
      prompt: `An item originally priced at $${P} is marked up ${up}% and then discounted ${off}%. What is the final price?`,
      correct: final, distractors: [Math.round(P * (1 + (up - off) / 100)), P, Math.round(P * (1 + up / 100)), Math.round(P * (1 - off / 100))],
      explanation: `Final = ${P} × ${(1 + up / 100).toFixed(2)} × ${(1 - off / 100).toFixed(2)} = ${final}.` })
  },
  // 19) Inverse variation.
  inverse_variation() {
    const k = pick([24, 36, 48, 60, 72, 120]), x0 = pick([2, 3, 4, 6]), x1 = pick([2, 3, 4, 6, 8, 12])
    if (k % x0 !== 0 || k % x1 !== 0 || x0 === x1) return null
    const y0 = k / x0, y1 = k / x1
    return mc({ domain: 'Algebra', subskill: 'Inverse variation', topic_tag: 'inverse-variation',
      prompt: `The variable y varies inversely with x. When x = ${x0}, y = ${y0}. What is y when x = ${x1}?`,
      correct: y1, distractors: [y1 + 1, y0, x1, Math.round(y0 * x1 / x0)],
      explanation: `Inverse variation: xy = k = ${x0}·${y0} = ${k}. When x = ${x1}, y = ${k}/${x1} = ${y1}.` })
  },
  // 20) Median of a data set.
  median_dataset() {
    const n = pick([5, 7])
    const sorted = Array.from({ length: n }, () => rnd(2, 40)).sort((a, b) => a - b)
    const med = sorted[(n - 1) / 2]!
    const mean = Math.round(sorted.reduce((s, v) => s + v, 0) / n)
    const disp = [...sorted]
    for (let i = disp.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[disp[i], disp[j]] = [disp[j]!, disp[i]!] }
    return mc({ domain: 'Problem-Solving and Data Analysis', subskill: 'Median', topic_tag: 'median',
      prompt: `What is the median of the data set ${disp.join(', ')}?`,
      correct: med, distractors: [mean, sorted[0]!, sorted[n - 1]!, med + 1],
      explanation: `Ordering the ${n} values, the middle value is ${med}.` })
  },
  // 21) Weighted average.
  weighted_average() {
    const n1 = pick([2, 3, 4, 5]), n2 = pick([2, 3, 4, 5]), a1 = rnd(60, 80), a2 = rnd(80, 100)
    const total = n1 * a1 + n2 * a2
    if (total % (n1 + n2) !== 0) return null
    const avg = total / (n1 + n2)
    return mc({ domain: 'Problem-Solving and Data Analysis', subskill: 'Weighted average', topic_tag: 'weighted-avg',
      prompt: `In a class, ${n1} students scored an average of ${a1} and ${n2} students scored an average of ${a2}. What is the average score of all ${n1 + n2} students?`,
      correct: avg, distractors: [Math.round((a1 + a2) / 2), a1, a2, avg + 1],
      explanation: `Total = ${n1}·${a1} + ${n2}·${a2} = ${total}; divided by ${n1 + n2} = ${avg}.` })
  },
  // 22) Cylinder volume in terms of pi.
  cylinder_volume() {
    const r = rnd(2, 7), h = rnd(3, 12)
    const v = r * r * h
    return mc({ domain: 'Geometry and Trigonometry', subskill: 'Volume of solids', topic_tag: 'cylinder-volume',
      prompt: `A right circular cylinder has a base radius of ${r} and a height of ${h}. What is its volume?`,
      correct: `${v}π`, distractors: [`${2 * r * (h + r)}π`, `${r * h}π`, `${2 * v}π`, `${r * r + h}π`],
      explanation: `V = πr²h = π·${r}²·${h} = ${v}π.` })
  },
  // 23) Slope from two points.
  slope_from_points() {
    const x1 = rnd(-5, 4), y1 = rnd(-5, 4)
    const dx = pick([1, 2, 3, 4]), dy = pick([-6, -4, -3, -2, 2, 3, 4, 6])
    const x2 = x1 + dx, y2 = y1 + dy
    return mc({ domain: 'Algebra', subskill: 'Slope of a line', topic_tag: 'slope-points',
      prompt: `What is the slope of the line that passes through the points (${x1}, ${y1}) and (${x2}, ${y2})?`,
      correct: frac(dy, dx), distractors: [frac(dx, dy), frac(-dy, dx), frac(dy + dx, 1), frac(dx - dy, 1)],
      explanation: `slope = (${y2} - ${y1})/(${x2} - ${x1}) = ${dy}/${dx} = ${frac(dy, dx)}.` })
  },
}

/**
 * Generate `perTemplate` variants of every template, deduped within the
 * run by content_hash. Callers dedupe against the bank via the DB's
 * unique content_hash index.
 */
export function generateMathItems(perTemplate = 6): BankItem[] {
  const out: BankItem[] = []
  const seen = new Set<string>()
  for (const fn of Object.values(TEMPLATES)) {
    let made = 0, tries = 0
    while (made < perTemplate && tries < perTemplate * 12) {
      tries++
      const r = fn()
      if (!r || seen.has(r.content_hash)) continue
      seen.add(r.content_hash); out.push(r); made++
    }
  }
  return out
}
