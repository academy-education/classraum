/** Are the unscored (pilot) items actually the HARDER ones?
 *  Read-only: draws without a studentId, so no exposure rows. */
import { config } from 'dotenv'; import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })
import { assembleToeflFromBank } from '@/lib/study/assemble'
;(async () => {
  for (const section of ['reading', 'listening'] as const) {
    const t = await assembleToeflFromBank({ section, module: 1 }, `pilotcheck-${section}`)
    const tally: Record<string, Record<string, number>> = { scored: {}, pilot: {} }
    for (const q of t.questions) {
      const bucket = q.scored === false ? 'pilot' : 'scored'
      const d = q.difficulty ?? 'unknown'
      tally[bucket]![d] = (tally[bucket]![d] ?? 0) + 1
    }
    console.log(`\n${section}:`)
    console.log('  scored :', JSON.stringify(tally.scored))
    console.log('  pilot  :', JSON.stringify(tally.pilot))
  }
})()
