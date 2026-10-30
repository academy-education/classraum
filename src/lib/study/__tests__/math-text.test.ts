import { mathSegments, mathPlain, mathSymbols, hasRawMathNotation, type MathSegment } from '../math-text'

/** Compact form of the segments, so expectations read like the screen:
 *  sup as ^{..}, sub as _{..}, radical as √[..]. */
const show = (s: string) => mathSegments(s).map((g: MathSegment) =>
  g.kind === 'text' ? g.text : g.kind === 'sup' ? `^{${g.text}}` : g.kind === 'sub' ? `_{${g.text}}` : `√[${g.text}]`).join('')

describe('math-text: strings copied from live bank rows', () => {
  it.each([
    ['g(x) = x^2', 'g(x) = x^{2}'],
    ['x^4 - 13x^2 + 36 = 0', 'x^{4} - 13x^{2} + 36 = 0'],
    ['4^x - 9(2^x) + 8 = 0', '4^{x} - 9(2^{x}) + 8 = 0'],
    ['(2x - 3)^4', '(2x - 3)^{4}'],
    ['f(t) = 340(1.44)^(t/2)', 'f(t) = 340(1.44)^{t/2}'],
    ['x^(2/3) − 5x^(1/3) + 6 = 0', 'x^{2/3} − 5x^{1/3} + 6 = 0'],
    ['2^(2x + 3) = 2^(2x) * 2^3', '2^{2x + 3} = 2^{2x} × 2^{3}'],
    ['10^-3', '10^{-3}'],
    ['y_{i+1}', 'y_{i+1}'],
    ['t_d for the 47 kΩ', 't_{d} for the 47 kΩ'],
    ['"2 sqrt(26)"', '"2 √[26]"'],
    ['sqrt(2x + 8) - sqrt(x + 2) = 2', '√[2x + 8] - √[x + 2] = 2'],
    ['(sqrt(4))^3 = 8', '(√[4])^{3} = 8'],
    ['i = sqrt(-1)', 'i = √[-1]'],
    ['k = 6 * 9 = 54', 'k = 6 × 9 = 54'],
    ['AE*EC = BE*ED', 'AE × EC = BE × ED'],
    ['pi*r^2*(2r) = 2*pi*r^3', 'π × r^{2} × (2r) = 2 × π × r^{3}'],
    ['Using 3.14 for pi, what is', 'Using 3.14 for π, what is'],
    ['x <= 5 and y >= 2, x != 3, +/- 4', 'x ≤ 5 and y ≥ 2, x ≠ 3, ± 4'],
  ])('%s', (input, expected) => {
    expect(show(input)).toBe(expected)
  })
})

describe('math-text: leaves ordinary prose alone', () => {
  it.each([
    ['The pizza costs $12.50 and the spinach is fresh.', 'The pizza costs $12.50 and the spinach is fresh.'],
    ['Pick the best answer.', 'Pick the best answer.'],
    ['A *bold* claim', 'A bold claim'],
    ['A **strong** claim', 'A strong claim'],
    ['sqrtx is not a call', 'sqrtx is not a call'],
    ['a_ lone underscore', 'a_ lone underscore'],
    ['snake_case_name', 'snake_case_name'],
  ])('%s', (input, expected) => {
    expect(show(input)).toBe(expected)
  })
  it('does not turn a word containing "pi" into π', () => {
    expect(mathSymbols('spinach and pine and Pi')).toBe('spinach and pine and Pi')
  })
  it('a caret at the very start (no base) is not an exponent', () => {
    expect(show('^ marks')).toBe('^ marks')
  })
})

describe('math-text: plain-string fallback', () => {
  it('uses Unicode where every character has a form', () => {
    expect(mathPlain('x^2 + y^-3')).toBe('x² + y⁻³')
    expect(mathPlain('a_1 + a_n')).toBe('a₁ + aₙ')
    expect(mathPlain('sqrt(41)')).toBe('√(41)')
  })
  it('keeps a readable bracketed form when Unicode cannot express it', () => {
    expect(mathPlain('2^(t/12)')).toBe('2^(t/12)')
  })
})

describe('hasRawMathNotation', () => {
  it('is false once everything is renderable', () => {
    expect(hasRawMathNotation('x^2 + 3*x <= sqrt(41)')).toBe(false)
  })
  it('flags notation the formatter cannot place', () => {
    expect(hasRawMathNotation('^ alone')).toBe(true)
    expect(hasRawMathNotation('sqrt (no closing')).toBe(true)
  })
})
