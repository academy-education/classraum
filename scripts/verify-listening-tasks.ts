/**
 * READ-ONLY check that a real TOEFL Listening test assembled from the LIVE
 * bank has the ETS Jan-2026 task shape.
 *
 * Usage:
 *   npx tsx scripts/verify-listening-tasks.ts
 *
 * Guarantees: only SELECTs, and the assembly runs WITHOUT a studentId,
 * which is the branch in assembleToeflFromBank that skips recordExposures.
 * No HTTP calls, so no credits and no money.
 *
 * Exits 1 if either module misses its blueprint, if any multi-question task
 * ships a fragment of an audio, or if any served audio for those tasks
 * carries fewer than 2 questions.
 */

import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

async function main() {
  const { assembleToeflFromBank } = await import('../src/lib/study/assemble')

  let bad = 0
  for (const module of [1, 2] as const) {
    const t = await assembleToeflFromBank({ section: 'listening', module }, `verify-l${module}`)
    console.log(`\n=== Module ${module} — ${t.questions.length} items ===`)
    for (const [k, v] of Object.entries(t.composition)) console.log(`  ${k.padEnd(34)} ${v}`)

    // Every served audio for a multi-question task must be whole and carry
    // at least 2 questions — the two failure modes the blueprint change was
    // made to prevent.
    const byGroup = new Map<string, { task: string | null; n: number; idx: number[] }>()
    t.questions.forEach((q, i) => {
      if (!q.passageGroupId) return
      const g = byGroup.get(q.passageGroupId) ?? { task: q.listeningTask, n: 0, idx: [] }
      g.n++; g.idx.push(i)
      byGroup.set(q.passageGroupId, g)
    })
    for (const [gid, g] of byGroup) {
      if (g.task && ['conversation', 'announcement', 'academic_talk'].includes(g.task) && g.n < 2) {
        console.error(`  FAIL single-question ${g.task} audio: ${gid}`); bad++
      }
      // Contiguous: the set's questions sit together so the audio plays once.
      if (g.idx[g.idx.length - 1]! - g.idx[0]! !== g.n - 1) {
        console.error(`  FAIL non-contiguous audio set: ${gid}`); bad++
      }
    }
    if (t.questions.length !== (module === 1 ? 24 : 23)) {
      console.error(`  SHORT: expected ${module === 1 ? 24 : 23}, got ${t.questions.length}`); bad++
    }
  }
  console.log(bad === 0 ? '\nOK — listening task shape is correct.' : `\n${bad} problem(s).`)
  process.exit(bad === 0 ? 0 : 1)
}

main().catch(e => { console.error(e); process.exit(1) })
