import fs from 'fs'
import path from 'path'

/**
 * The KakaoTalk delivery control is a PLACEHOLDER. It renders, and it
 * sends nothing.
 *
 * The failure this guards against is specific: someone deletes
 * `disabled` to "turn it on" without implementing
 * queueCampReportDelivery, and every teacher who ticks it believes the
 * parent was messaged. A control that appears to send and silently does
 * not is worse than no control — the teacher stops chasing the parent.
 *
 * So the two are pinned to each other. Enabling the checkbox while the
 * seam is still a no-op fails this suite, and implementing the seam
 * while the checkbox stays disabled fails it too — that direction
 * matters as well, because a finished feature nobody can reach is its
 * own kind of waste.
 */

const repo = path.resolve(__dirname, '../..')
const read = (p: string) => fs.readFileSync(path.join(repo, p), 'utf8')

const DELIVERY_UI = 'src/components/ui/camp/CampReportDelivery.tsx'
const SEAM = 'src/lib/camp/reports.ts'

/** True while queueCampReportDelivery still does nothing.
 *
 *  Takes the body from the `{` that opens it — NOT from the first
 *  `\n}` after the declaration, which is the closing brace of the
 *  PARAMETER TYPE. That first version sliced away the entire body, so
 *  implementing the seam left this returning true and the guard passed
 *  while doing nothing. Found by breaking it on purpose; it never
 *  failed on its own. */
function seamIsStillANoOp(source: string): boolean {
  const start = source.indexOf('export async function queueCampReportDelivery')
  expect(start).toBeGreaterThan(-1)
  const bodyStart = source.indexOf('): Promise<void> {', start)
  expect(bodyStart).toBeGreaterThan(start)
  const body = source.slice(bodyStart, source.indexOf('\n}', bodyStart))
  // A real implementation has to talk to something. If none of these
  // appear, nothing is being sent.
  return !/\b(fetch|sendAlimTalk|sendSMS|insert|upsert|dbAdmin)\b/.test(body)
}

describe('camp report delivery placeholder', () => {
  const ui = read(DELIVERY_UI)
  const seam = read(SEAM)

  it('the seam is still a no-op, so the control must stay inert', () => {
    // If this flips, the assertions below are the ones to update — in
    // the same commit that implements sending, not before it.
    expect(seamIsStillANoOp(seam)).toBe(true)
  })

  it('the checkbox is disabled', () => {
    const box = ui.slice(ui.indexOf('<Checkbox'), ui.indexOf('/>', ui.indexOf('<Checkbox')))
    expect(box).toMatch(/\bdisabled\b/)
    expect(box).toMatch(/checked=\{false\}/)
  })

  it('says on its face that it is not connected', () => {
    expect(ui).toContain('delivery.notReady')
  })

  it('sends nothing: no network call anywhere in the component', () => {
    // The whole point. Any of these appearing means it stopped being a
    // placeholder without the seam being implemented.
    for (const forbidden of ['fetch(', 'authHeaders', 'supabase', '/api/']) {
      expect(ui).not.toContain(forbidden)
    }
  })

  it('tells the reader what has to exist before it can be enabled', () => {
    // Three procurement steps, not code: channel, template, sender
    // number. Without them "just enable it" is not a small change.
    // Rendered from a mapped array, so assert the array and the lookup
    // rather than three literals that do not appear in the source.
    expect(ui).toContain("['step1', 'step2', 'step3']")
    expect(ui).toContain('camp.reports.delivery.${step}')
  })

  it('does not imply parents are cut off — they can already read in-app', () => {
    expect(ui).toContain('delivery.parentsCanRead')
  })
})
