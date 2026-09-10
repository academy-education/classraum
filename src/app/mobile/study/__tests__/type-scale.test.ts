import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Study mode has ONE type scale, and this is what keeps it that way.
 *
 * Before 2026-09-10 it had 26 distinct rendered font sizes, eight of them
 * inside a 3.5px band (10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5). That is not
 * a scale, it is drift: the same size was spelled two ways (`text-sm` and
 * `text-[14px]`, `text-xs` and `text-[12px]`), and 241 half-pixel sizes sat
 * directly beside their whole-pixel neighbour. The visible cost was that one
 * role rendered at seven sizes — "Topic" was 11px on /review and 12px on
 * /builder, and "Today's study" sat at 10px beside "Get started" at 11px on
 * the same screen.
 *
 * The steps are deliberately role-named rather than t-shirt sized, because
 * the argument that keeps recurring is "is this a label or a badge", not "is
 * this medium or large".
 */
const SCALE = {
  badge: 10, //  counters and pills inside fixed-size containers. A floor of
  //             11 breaks them: the notification counter lives in a w-4 h-4
  //             circle and the plan ribbons are absolutely positioned.
  micro: 11, //  uppercase letter-spaced labels — section eyebrows, field
  //             labels, stat captions. One role, one size.
  small: 13, //  secondary text, chips, helper copy
  body: 15, //   body copy
  title: 17, //  card titles
  head: 20, //   section heads
  page: 24, //   page titles
} as const

/** Big numerals (score, streak, XP). Display type is sized to its slot, not
 *  to a text scale, so these are listed rather than derived. */
const DISPLAY = [28, 32, 36, 40, 48, 62, 72]

const ALLOWED = new Set<number>([...Object.values(SCALE), ...DISPLAY])

const ROOT = join(__dirname, '..')

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    if (e === '__tests__' || e === 'node_modules') continue
    const p = join(dir, e)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.tsx?$/.test(e)) out.push(p)
  }
  return out
}

describe('study mode type scale', () => {
  const files = walk(ROOT)

  it('has files to check', () => {
    // A scan that reads nothing passes every assertion below it.
    expect(files.length).toBeGreaterThan(40)
  })

  it('uses only the sizes on the scale', () => {
    const offenders: string[] = []
    for (const f of files) {
      const src = readFileSync(f, 'utf8')
      for (const m of src.matchAll(/text-\[([0-9.]+)px\]/g)) {
        const px = Number(m[1])
        if (!ALLOWED.has(px)) {
          offenders.push(`${f.replace(ROOT + '/', '')} — text-[${m[1]}px]`)
        }
      }
    }
    expect([...new Set(offenders)]).toEqual([])
  })

  it('spells each size exactly one way — no named Tailwind sizes', () => {
    // `text-sm` and `text-[14px]` are the same pixel and read as different
    // decisions. Pick the explicit one so a grep for a size finds every use.
    const offenders: string[] = []
    for (const f of files) {
      const src = readFileSync(f, 'utf8')
      for (const m of src.matchAll(/(?<![\w-])text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl)(?![\w-])/g)) {
        offenders.push(`${f.replace(ROOT + '/', '')} — text-${m[1]}`)
      }
    }
    expect([...new Set(offenders)]).toEqual([])
  })
})
