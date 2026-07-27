import { config } from 'dotenv'; import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
config({ path: resolve(process.cwd(), '.env.local') })
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const OUT = process.argv[2]!
;(async () => {
  const { data } = await db.from('study_item_bank').select('id, section, item')
    .eq('family','toefl').in('section',['reading','listening']).eq('verified',true).eq('archived',false)
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
