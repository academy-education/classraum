/**
 * Turns the plain-text maths notation the bank is written in into what a
 * student should see. Bank rows are stored as typed text ("x^2 + 3*x",
 * "sqrt(41)", "x <= 5", "pi*r^2") and reach the screen untouched, so before
 * 2026-10-30 980 live items showed a raw caret. The rows are NOT rewritten:
 * every review is bound to the item's content hash, so editing the stored text
 * would make every past review stale. Formatting happens at display time.
 *
 *   symbols     *  ->  ×   (between operands)      <=  ->  ≤    >=  ->  ≥
 *               != ->  ≠   +/- -> ±                 pi  ->  π
 *   segments    a^2, a^-3, a^(t/2), a^{n+1}   -> superscript
 *               x_i, y_{i+1}                  -> subscript
 *               sqrt(2x + 8)                  -> radical over its argument
 *
 * `mathSegments` is pure and returns segments a renderer maps to elements;
 * `mathPlain` gives a single string for places that cannot hold markup
 * (titles, aria labels, search), using Unicode super/subscripts where every
 * character has one.
 */

export type MathSegment =
  | { kind: 'text'; text: string }
  | { kind: 'sup'; text: string }
  | { kind: 'sub'; text: string }
  | { kind: 'sqrt'; text: string }

/** Symbol replacements that need no markup. */
export function mathSymbols(s: string): string {
  return s
    // Markdown emphasis pairs first, so "*word*" is never read as a product.
    // Same rule as normalizeDisplayText: a star touching a word character on
    // its outer side ("AE*EC") is not emphasis.
    .replace(/\*\*([^*\n]+?)\*\*/g, '$1')
    .replace(/(?<![*\w])\*([^*\n]+?)\*(?![*\w])/g, '$1')
    .replace(/\+\/-/g, '±')
    .replace(/<=/g, '≤')
    .replace(/>=/g, '≥')
    .replace(/!=/g, '≠')
    // "*" between two operands (digits, letters, closing/opening brackets,
    // π) is multiplication. A lone star or markdown emphasis is left alone;
    // emphasis pairs are stripped before this runs.
    .replace(/([0-9A-Za-z)\]π]) ?\* ?(?=[0-9A-Za-z(\[π√])/g, '$1 × ')
    // "pi" as a whole word is always the constant in this bank ("Using 3.14
    // for pi", "pi(5)(13)", "2*pi*r").
    .replace(/(^|[^A-Za-z])pi(?![A-Za-z])/g, '$1π')
}

/** Reads a balanced (...) or {...} group starting at s[i]; returns the inner
 *  text and the index after the closing bracket, or null if unbalanced. */
function readGroup(s: string, i: number): { inner: string; end: number } | null {
  const open = s[i]
  const close = open === '(' ? ')' : open === '{' ? '}' : null
  if (!close) return null
  let depth = 0
  for (let j = i; j < s.length; j++) {
    if (s[j] === open) depth++
    else if (s[j] === close) {
      depth--
      if (depth === 0) return { inner: s.slice(i + 1, j), end: j + 1 }
    }
  }
  return null
}

/** An exponent or subscript written without brackets: an optional sign, then a
 *  run of digits (with one decimal point) or a run of letters. "x^2y" reads as
 *  x² · y only for a digit exponent; a letter exponent takes one letter so
 *  "e^xy" is not swallowed. */
function readBare(s: string, i: number): { inner: string; end: number } | null {
  const m = /^[-−+]?(\d+(?:\.\d+)?|[A-Za-zπ])/.exec(s.slice(i))
  return m ? { inner: m[0], end: i + m[0].length } : null
}

export function mathSegments(input: string | null | undefined): MathSegment[] {
  // A radical's or exponent's own contents can hold notation too
  // ("sqrt(x^2 + 1)"); nested notation is flattened to plain text with
  // Unicode where possible, which reads correctly inside the outer element.
  return parse(String(input ?? '')).map(seg => seg.kind === 'text' ? seg : { ...seg, text: mathPlain(seg.text) })
}

const SUP: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '+': '⁺', '-': '⁻', '−': '⁻', '=': '⁼', '(': '⁽', ')': '⁾', n: 'ⁿ', i: 'ⁱ', x: 'ˣ', y: 'ʸ', a: 'ᵃ', b: 'ᵇ', c: 'ᶜ', d: 'ᵈ', e: 'ᵉ', k: 'ᵏ', m: 'ᵐ', t: 'ᵗ' }
const SUB: Record<string, string> = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉', '+': '₊', '-': '₋', '(': '₍', ')': '₎', a: 'ₐ', e: 'ₑ', i: 'ᵢ', n: 'ₙ', x: 'ₓ', t: 'ₜ', k: 'ₖ', m: 'ₘ', d: 'd' }

function mapAll(t: string, table: Record<string, string>): string | null {
  let r = ''
  for (const ch of t.replace(/ /g, '')) { const m = table[ch]; if (m === undefined) return null; r += m }
  return r
}

/** One string, no markup. Superscripts and subscripts use Unicode when every
 *  character has a form; otherwise the bracketed form is kept readable
 *  ("2^(t/12)" -> "2^(t/12)" stays, which only happens in non-visual text). */
export function mathPlain(input: string | null | undefined): string {
  const segs = parse(String(input ?? ''))
  return segs.map(seg => {
    if (seg.kind === 'text') return seg.text
    if (seg.kind === 'sqrt') return `√(${mathPlain(seg.text)})`
    const table = seg.kind === 'sup' ? SUP : SUB
    const u = mapAll(seg.text, table)
    if (u !== null) return u
    return (seg.kind === 'sup' ? '^' : '_') + `(${seg.text})`
  }).join('')
}

/** The one tokenizer: symbols first, then ^ _ sqrt into segments. */
function parse(input: string): MathSegment[] {
  const s = mathSymbols(input)
  const out: MathSegment[] = []
  let buf = ''
  const flush = () => { if (buf) { out.push({ kind: 'text', text: buf }); buf = '' } }
  let i = 0
  while (i < s.length) {
    const c = s[i]
    if (c === '^' && i > 0) {
      const g = readGroup(s, i + 1) ?? readBare(s, i + 1)
      if (g) { flush(); out.push({ kind: 'sup', text: g.inner }); i = g.end; continue }
    }
    // A subscript needs a one-letter base ("x_i", "t_d", "y_{i+1}"), so
    // snake_case words and file names are left alone.
    if (c === '_' && /[A-Za-z]/.test(s[i - 1] ?? '') && !/[A-Za-z0-9]/.test(s[i - 2] ?? '')) {
      const g = readGroup(s, i + 1) ?? readBare(s, i + 1)
      if (g) { flush(); out.push({ kind: 'sub', text: g.inner }); i = g.end; continue }
    }
    if (s.startsWith('sqrt', i) && !/[A-Za-z]/.test(s[i - 1] ?? '')) {
      let j = i + 4
      while (s[j] === ' ') j++
      const g = readGroup(s, j)
      if (g) { flush(); out.push({ kind: 'sqrt', text: g.inner }); i = g.end; continue }
    }
    buf += c
    i++
  }
  flush()
  return out
}

/** True when text still carries computer notation after formatting: used by
 *  the bank guard test and by inserters to refuse new rows the formatter
 *  cannot render. */
export function hasRawMathNotation(input: string | null | undefined): boolean {
  const plainSegs = parse(String(input ?? '')).filter(s => s.kind === 'text').map(s => s.text).join(' ')
  return /\^|sqrt\s*\(|<=|>=|!=|\+\/-/.test(plainSegs) || /[0-9A-Za-z)]\s?\*\s?[0-9A-Za-z(]/.test(plainSegs)
}
