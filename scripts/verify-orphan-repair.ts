/**
 * READ-ONLY pre-insert check for an orphan-repair batch.
 *
 * The graders check whether a question is ANSWERABLE. They cannot check
 * whether it will actually land on the audio it was written for — that
 * depends on `passageGroupId` and `passage` matching the surviving bank row
 * byte for byte. A near-miss there does not error: the sibling inserts as
 * its own single-question group, so a repair batch would quietly DOUBLE the
 * orphan count instead of fixing it. That failure is invisible in every
 * grader signal, so it gets its own check.
 *
 * Usage: npx tsx scripts/verify-orphan-repair.ts <file...>
 * Exit 1 on any mismatch.
 */
import { config } from 'dotenv'
import { resolve } from 'path'
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
config({ path: resolve(process.cwd(), '.env.local') })

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

;(async () => {
  const { data } = await db.from('study_item_bank').select('id, section, item')
    .eq('family', 'toefl').in('section', ['reading', 'listening'])
    .eq('verified', true).eq('archived', false)

  // groupId -> { section, passage, count } as the bank actually holds it
  const bank = new Map<string, { section: string; passage: string; n: number }>()
  for (const r of data ?? []) {
    const it = r.item as Record<string, unknown> | null
    const g = typeof it?.passageGroupId === 'string' ? it.passageGroupId : null
    if (!g) continue
    const prev = bank.get(g)
    bank.set(g, {
      section: r.section as string,
      passage: typeof it?.passage === 'string' ? it.passage : '',
      n: (prev?.n ?? 0) + 1,
    })
  }

  let bad = 0, ok = 0
  const touched = new Map<string, number>()
  for (const f of process.argv.slice(2)) {
    for (const [i, it] of (JSON.parse(readFileSync(f, 'utf8')) as Record<string, unknown>[]).entries()) {
      const id = `${f.split('/').pop()}#${i}`
      const g = it.passageGroupId as string
      const target = bank.get(g)
      if (!target) { console.error(`MISS  ${id} — passageGroupId not in bank: ${g}`); bad++; continue }
      if (it.passage !== target.passage) {
        console.error(`DRIFT ${id} — passage differs from the bank row for ${g}`); bad++; continue
      }
      const want = target.section
      const got = (it.section as string) ?? 'listening'
      if (got !== want) { console.error(`SECT  ${id} — section ${got}, bank says ${want}`); bad++; continue }
      const taskField = want === 'reading' ? 'readingTask' : 'listeningTask'
      if (!it[taskField]) { console.error(`TASK  ${id} — missing ${taskField}`); bad++; continue }
      touched.set(g, (touched.get(g) ?? 0) + 1)
      ok++
    }
  }

  console.log(`\n${ok} siblings verified, ${bad} problems`)
  console.log(`${touched.size} distinct groups targeted`)
  const stillOrphan = [...touched.entries()].filter(([g, n]) => (bank.get(g)!.n + n) < 2)
  if (stillOrphan.length) {
    console.error(`FAIL ${stillOrphan.length} group(s) would still hold <2 questions`); bad += stillOrphan.length
  }
  const sizes = [...touched.entries()].map(([g, n]) => bank.get(g)!.n + n)
  console.log(`resulting set sizes: min ${Math.min(...sizes)}, max ${Math.max(...sizes)}, avg ${(sizes.reduce((a, b) => a + b, 0) / sizes.length).toFixed(2)}`)
  process.exit(bad === 0 ? 0 : 1)
})()
