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

/** Same, but counting ONLY items that count toward the score. ETS delivers
 *  48 per path and scores 35; the gap is unscored pilot items. */
const scoredOnly = (qs: Array<{ type: string; blanks?: unknown[] | null; scored?: boolean | null }>) =>
  scored(qs.filter(q => q.scored !== false))

/** ETS Table 1, scored questions per path. */
const ETS = {
  reading: {
    lower: { fill_in_blanks: 20, daily_life: 10, academic_passage: 5 },
    upper: { fill_in_blanks: 20, daily_life: 5, academic_passage: 10 },
  },
  listening: {
    lower: { choose_response: 15, conversation: 8, announcement: 8, academic_talk: 4 },
    upper: { choose_response: 11, conversation: 8, announcement: 4, academic_talk: 12 },
  },
} as const

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
      if (total !== 48) { console.error(`  FAIL expected 48 delivered, got ${total}`); bad++ }

      // The scored subset must be ETS Table 1 EXACTLY — 35 questions in
      // ETS's own task proportions. This is the claim that makes our raw
      // score comparable to an official one, and the reason Complete the
      // Words can stay at 10 per paragraph AND 57% of the score.
      const all = stages.flatMap(t => t.questions)
      const sTotal = scoredOnly(all)
      const byTask: Record<string, number> = {}
      for (const q of all) {
        if (q.scored === false) continue
        const k = q.type === 'fill_in_blanks'
          ? 'fill_in_blanks'
          : (q.listeningTask ?? q.readingTask ?? 'untagged')
        byTask[k] = (byTask[k] ?? 0) + (q.type === 'fill_in_blanks' ? (q.blanks?.length ?? 1) : 1)
      }
      console.log(`  scored ${sTotal} / 35 —`,
        Object.entries(byTask).map(([k, v]) => `${k}:${v}`).join(' '))
      if (sTotal !== 35) { console.error(`  FAIL expected 35 scored, got ${sTotal}`); bad++ }
      const want = ETS[section][path] as Record<string, number>
      for (const [k, v] of Object.entries(want)) {
        if ((byTask[k] ?? 0) !== v) {
          console.error(`  FAIL scored ${k}: expected ${v}, got ${byTask[k] ?? 0}`); bad++
        }
      }

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
