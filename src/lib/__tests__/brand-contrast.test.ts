/**
 * Pins the brand blue to WCAG AA (4.5:1) for white-on-blue and blue-on-white.
 * The old #2885e8 was 3.74:1. Reads the real tokens from globals.css so a
 * future edit to --primary / --primary-hover / --primary-foreground is caught.
 */
import { readFileSync } from 'fs'
import { join } from 'path'

const css = readFileSync(join(__dirname, '../../app/globals.css'), 'utf8')

function lin(c: number) {
  const s = c / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map(i => lin(parseInt(hex.slice(i, i + 2), 16)))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}
/** Every hex value assigned to `name` anywhere in globals.css (light, .dark, dark media). */
function tokenValues(name: string) {
  const re = new RegExp(`${name}:\\s*([^;]+);`, 'g')
  const out: string[] = []
  for (const m of css.matchAll(re)) out.push(m[1].trim())
  return out
}

describe('brand blue contrast', () => {
  const primaries = tokenValues('--primary')
  const hovers = tokenValues('--primary-hover')
  const foregrounds = tokenValues('--primary-foreground')

  it('found the tokens (a check that read nothing must not pass)', () => {
    expect(primaries.length).toBeGreaterThanOrEqual(3)
    expect(hovers.length).toBeGreaterThanOrEqual(3)
    expect(foregrounds.length).toBeGreaterThanOrEqual(2)
    for (const v of [...primaries, ...hovers, ...foregrounds]) expect(v).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('primary and hover reach 4.5:1 against white and against the foreground token', () => {
    for (const bg of [...primaries, ...hovers]) {
      expect(contrast(bg, '#ffffff')).toBeGreaterThanOrEqual(4.5)
      for (const fg of foregrounds) expect(contrast(bg, fg)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('study-primary matches the brand primary', () => {
    expect(tokenValues('--study-primary').map(v => v.toLowerCase())).toEqual([primaries[0].toLowerCase()])
  })
})
