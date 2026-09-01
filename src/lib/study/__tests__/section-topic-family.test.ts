/** @jest-environment node */
/**
 * SECTION_TOPIC maps a blueprint block key to a topic UUID, and the
 * intended slug lives in a trailing comment. The durable result screen
 * reads `session.topic.slug` and routes scoring through
 * familyFromTopicSlug — so a UUID filed under the wrong family scores
 * the test as the wrong exam. For SSAT that silently drops the -1/4
 * wrong-answer penalty: the student sees a higher score than they got.
 *
 * admission-wiring.test.ts already asserts each value MATCHES A UUID
 * REGEX. That is necessary and nowhere near sufficient — a well-formed
 * UUID pointing at toefl-reading passes it. This file checks the thing
 * that actually matters: the slug each entry claims must belong to the
 * family it is filed under.
 *
 * It reads the SOURCE rather than importing the map, because the slug
 * only exists in the comment. That is a real limitation: this cannot
 * prove the UUID resolves to that slug in the database.
 * scripts/study-bank/verify-section-topics.mjs does that against the
 * live DB, and passed on all 16 entries on 2026-09-01.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { familyFromTopicSlug } from '../test-result'
import { SECTION_TOPIC } from '../section-topics'

const src = readFileSync(join(process.cwd(), 'src/lib/study/section-topics.ts'), 'utf8')

/** Entries as the file declares them: family block -> [key, uuid, slug]. */
function entries(): Array<{ family: string; key: string; id: string; slug: string }> {
  const out: Array<{ family: string; key: string; id: string; slug: string }> = []
  let family = ''
  for (const line of src.split('\n')) {
    const fam = line.match(/^\s{2}(\w+):\s*\{/)
    if (fam) { family = fam[1]; continue }
    const m = line.match(/^\s+(\w+):\s*'([0-9a-f-]{36})',\s*\/\/\s*([a-z0-9-]+)/)
    if (m && family) out.push({ family, key: m[1], id: m[2], slug: m[3] })
  }
  return out
}

describe('every SECTION_TOPIC entry is filed under the family its slug belongs to', () => {
  const rows = entries()

  it('parsed every entry in the map', () => {
    // If the parse silently found nothing, every test below would pass
    // vacuously. Count against the imported map.
    const declared = Object.values(SECTION_TOPIC).reduce((n, o) => n + Object.keys(o).length, 0)
    expect(rows.length).toBe(declared)
    expect(rows.length).toBeGreaterThan(10)
  })

  it('routes each slug to the family block it sits in', () => {
    for (const r of rows) {
      expect(`${r.family}/${r.key} -> ${familyFromTopicSlug(r.slug)}`)
        .toBe(`${r.family}/${r.key} -> ${r.family}`)
    }
  })

  it('gives every entry a distinct uuid', () => {
    // Two blocks sharing a topic is the failure the SSAT quant comment
    // warns about: both sittings would attach to one topic.
    const ids = rows.map(r => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('keeps ssat and sat apart despite the shared suffix', () => {
    // The ordering hazard familyFromTopicSlug documents: 'ssat-reading'
    // must not be read as SAT, and a careless startsWith would do it.
    expect(familyFromTopicSlug('ssat-reading')).toBe('ssat')
    expect(familyFromTopicSlug('sat-math')).toBe('sat')
    expect(familyFromTopicSlug('isee-reading')).toBe('isee')
  })

  it('would notice a block misfiled into another family', () => {
    // Guard on the guard: prove the check discriminates.
    expect(familyFromTopicSlug('toefl-reading')).not.toBe('ssat')
  })
})
