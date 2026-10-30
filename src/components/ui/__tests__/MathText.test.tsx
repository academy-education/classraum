/** @jest-environment node */
import { renderToStaticMarkup } from 'react-dom/server'
import { MathText } from '../MathText'

describe('MathText renders real typography, never the raw notation', () => {
  it('superscripts, radicals and symbols from a live SAT stem', () => {
    const html = renderToStaticMarkup(<MathText text="If x^(3/2) = 27 and sqrt(2x + 8) <= 3*y, what is 2^-3?" />)
    expect(html).toContain('<sup')
    expect(html).toContain('>3/2</sup>')
    expect(html).toContain('>-3</sup>')
    expect(html).toContain('√<span')
    expect(html).toContain('≤')
    expect(html).toContain('×')
    expect(html).not.toMatch(/\^|sqrt|<=|\*/)
  })
  it('subscripts', () => {
    expect(renderToStaticMarkup(<MathText text="t_d and y_{i+1}" />)).toContain('<sub')
  })
})
