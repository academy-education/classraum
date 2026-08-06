import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/*
 * scripts/study-bank/apply-a11-fix.mjs asserted that each passage it
 * wrote reaches the MODERN branch of WritingScenario. It did that with
 * a COPY of the component's intro regex, because the component is TSX
 * inside a Next route and the script is plain node.
 *
 * A copy that drifts turns that assertion into decoration: the script
 * would keep reporting "renders on the modern branch" against a regex
 * the app no longer uses. This pins the two together, so a change to
 * the component fails here rather than silently invalidating a repair
 * already written to 8 live items.
 *
 * If the component's regex legitimately changes, update the script's
 * copy in the same commit and re-run it against the bank.
 */
const root = join(__dirname, '../../../..')
const component = readFileSync(join(root, 'src/app/mobile/study/session/[id]/test/WritingPanels.tsx'), 'utf8')
const script = readFileSync(join(root, 'scripts/study-bank/apply-a11-fix.mjs'), 'utf8')

const introOf = (src: string) => /const introBroad = (\/.*\/i)\n/.exec(src)?.[1]
const bulletOf = (src: string) => /const bulletLead = (\/.*\/)\n/.exec(src)?.[1]

describe('A11 repair script matches the renderer it claims to match', () => {
  it('finds both regexes in both files', () => {
    expect(introOf(component)).toBeTruthy()
    expect(introOf(script)).toBeTruthy()
    expect(bulletOf(component)).toBeTruthy()
    expect(bulletOf(script)).toBeTruthy()
  })

  it('uses the same intro detector as WritingPanels', () => {
    expect(introOf(script)).toBe(introOf(component))
  })

  it('uses the same bullet detector as WritingPanels', () => {
    expect(bulletOf(script)).toBe(bulletOf(component))
  })
})
