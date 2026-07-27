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

/** Scored questions, ETS Table 1 convention: a Complete-the-Words paragraph
 *  is TEN questions, not one. Getting this wrong is how a 48-question
 *  Reading section silently becomes a 30-question one. */
const scored = (qs: Array<{ type: string; blanks?: unknown[] | null }>) =>
  qs.reduce((n, q) => n + (q.type === 'fill_in_blanks' ? (q.blanks?.length ?? 1) : 1), 0)

const MULTI = ['conversation', 'announcement', 'academic_talk', 'academic_passage']

async function main() {
  const { assembleToeflFromBank } = await import('../src/lib/study/assemble')
  let bad = 0

  for (const section of ['reading', 'listening'] as const) {
    for (const path of ['lower', 'upper'] as const) {
      const stages = [
        await assembleToeflFromBank({ section, module: 1 }, `v-${section}-1`),
        await assembleToeflFromBank({ section, module: 2, path }, `v-${section}-2-${path}`),
      ]
      const total = stages.reduce((n, t) => n + scored(t.questions), 0)
      const cards = stages.reduce((n, t) => n + t.questions.length, 0)
      console.log(`\n=== ${section} / ${path} path — ${total} questions, ${cards} cards ===`)
      stages.forEach((t, i) => {
        console.log(`  stage ${i + 1} (${scored(t.questions)} q / ${t.questions.length} cards)`)
        for (const [k, v] of Object.entries(t.composition)) console.log(`    ${k.padEnd(34)} ${v}`)
      })
      if (total !== 48) { console.error(`  FAIL expected 48 questions, got ${total}`); bad++ }

      for (const t of stages) {
        const byGroup = new Map<string, { task: string | null; n: number; idx: number[] }>()
        t.questions.forEach((q, i) => {
          if (!q.passageGroupId) return
          const task = q.listeningTask ?? q.readingTask ?? null
          const g = byGroup.get(q.passageGroupId) ?? { task, n: 0, idx: [] }
          g.n++; g.idx.push(i)
          byGroup.set(q.passageGroupId, g)
        })
        for (const [gid, g] of byGroup) {
          if (g.task && MULTI.includes(g.task) && g.n < 2) {
            console.error(`  FAIL single-question ${g.task}: ${gid}`); bad++
          }
          if (g.idx[g.idx.length - 1]! - g.idx[0]! !== g.n - 1) {
            console.error(`  FAIL non-contiguous set: ${gid}`); bad++
          }
        }
      }
    }
  }
  console.log(bad === 0 ? '\nOK — task shape correct for both sections on both paths.' : `\n${bad} problem(s).`)
  process.exit(bad === 0 ? 0 : 1)
}

main().catch(e => { console.error(e); process.exit(1) })
