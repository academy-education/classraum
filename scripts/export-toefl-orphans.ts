import { config } from 'dotenv'; import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
config({ path: resolve(process.cwd(), '.env.local') })
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const OUT = process.argv[2]!
/**
 * PostgREST caps a response at 1000 rows. A plain .select() over
 * study_item_bank therefore returns a TRUNCATED bank with no error and no
 * warning — and every group whose members fall past the cut looks like it
 * has fewer questions than it does.
 *
 * That is not hypothetical: the first orphan export ran unpaginated against
 * 1307 rows, so 9 reading passages that already had 2-5 questions were
 * classified as single-question orphans and had siblings authored for them.
 * The bug is silent in both directions — it invents orphans AND hides them.
 */
async function selectAll(build: () => any): Promise<any[]> {
  const PAGE = 1000
  const rows = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build().range(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE) break
  }
  return rows
}

;(async () => {
  const data = await selectAll(() => db.from('study_item_bank').select('id, section, item')
    .eq('family','toefl').in('section',['reading','listening']).eq('verified',true).eq('archived',false))
  const groups = new Map<string, any[]>()
  for (const r of data ?? []) {
    const it: any = r.item; if (!it?.passageGroupId) continue
    const k = `${r.section}|${it.passageGroupId}`
    groups.set(k, [...(groups.get(k) ?? []), { id: r.id, section: r.section, it }])
  }
  const orphans = [...groups.values()].filter(g => g.length === 1).map(g => g[0])
    .filter(o => ['conversation','announcement','academic_talk','academic_passage']
      .includes(o.it.listeningTask ?? o.it.readingTask))
  const out = orphans.map(o => ({
    groupId: o.it.passageGroupId, section: o.section,
    task: o.it.listeningTask ?? o.it.readingTask,
    passage: o.it.passage,
    existingPrompt: o.it.prompt, existingAnswer: o.it.correct_answer,
  }))
  writeFileSync(OUT, JSON.stringify(out, null, 1))
  console.log(`${out.length} orphans ->`, OUT)
})()
