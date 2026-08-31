/** @jest-environment node */
/**
 * WHERE the sweep panel is mounted, which is a correctness property and
 * not a layout preference.
 *
 * It was originally rendered inside LiveBankState, AFTER that
 * component's `if (error)` and `if (!data)` early returns. So whenever
 * /api/admin/bank-qc/live was slow or failed, the review tool did not
 * render at all and the page simply looked empty — reported by a
 * reviewer on 2026-08-31 as "wasn't able to see anything".
 *
 * That live route pages the whole ~4,500-row bank plus attacks and
 * reviews, making it the most failure-prone fetch on the page. The
 * review tool has its own fetch and its own error state and must not be
 * behind it.
 */
import { readFileSync } from 'fs'
import { join } from 'path'

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')
const DASH = 'src/components/admin/bank-qc/BankQcDashboard.tsx'
const LIVE = 'src/components/admin/bank-qc/LiveBankState.tsx'

describe('the sweep panel does not depend on another component fetch', () => {
  it('is mounted by the dashboard', () => {
    const src = read(DASH)
    expect(src).toMatch(/import \{ ItemSweepPanel \}/)
    expect(src).toMatch(/<ItemSweepPanel \/>/)
  })

  // Reversion: move <ItemSweepPanel /> back into LiveBankState. This
  // fails, which is the point — that placement is what made the panel
  // invisible whenever the live route was unhappy.
  it('is NOT mounted inside LiveBankState', () => {
    const src = read(LIVE)
    expect(src).not.toMatch(/ItemSweepPanel/)
  })

  it('LiveBankState still early-returns, so the hazard is real not theoretical', () => {
    // If these guards ever disappear the test above stops being
    // load-bearing; this asserts the reason it exists still holds.
    const src = read(LIVE)
    expect(src).toMatch(/if \(error\) \{/)
    expect(src).toMatch(/if \(!data\) \{/)
  })
})

describe('the collapsed panel reads as a control', () => {
  // The list is lazy-loaded on purpose — 490 items with passages is not
  // something to fetch for every admin who opens the page — so an
  // unopened panel is genuinely empty. It therefore has to look
  // openable.
  it('labels the toggle in words, not just a chevron', () => {
    const src = read('src/components/admin/bank-qc/ItemSweepPanel.tsx')
    expect(src).toMatch(/Open the list/)
    expect(src).toMatch(/aria-expanded=\{open\}/)
  })
})

describe('free-response items render as themselves', () => {
  // SSAT Writing Sample and ISEE Essay have no options and no key. The
  // sweep pulls every ssat/isee item, so they appear in the list; before
  // this they rendered an empty <ol> and read as a broken MC item.
  it('branches on an empty choices array', () => {
    const src = read('src/components/admin/bank-qc/ItemSweepPanel.tsx')
    expect(src).toMatch(/it\.choices\.length === 0/)
    expect(src).toMatch(/Free response — no options and no answer key/)
  })
})
