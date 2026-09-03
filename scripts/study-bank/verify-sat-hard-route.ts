/**
 * verify-sat-hard-route.ts — draw THREE consecutive SAT module-2 hard-route
 * forms for a throwaway student and report, per form, the domain
 * composition, how many items are repeats of an earlier form, and how many
 * fell back from the hard band. Cleans up the exposures it wrote.
 *   npx tsx scripts/study-bank/verify-sat-hard-route.ts [reading_writing|math]
 */
import { assembleFromBank } from '@/lib/study/assemble'
import { dbAdmin } from '@/lib/supabase-admin'
import { SAT_MODULE_CONFIG } from '@/lib/study/sat-adaptive'
import { randomUUID } from 'node:crypto'

async function main() {
  const section = (process.argv[2] ?? 'reading_writing') as 'reading_writing' | 'math'
  // A real test account (FK on study_item_exposures.student_id). Only the
  // rows written under this run's session ids are deleted afterwards.
  // The hardcoded default here was an id no longer present in `users`, so
  // every exposure write failed with a foreign-key error, unseen-first saw
  // an empty history, and the run reported repeats that were an artefact of
  // the broken id rather than a property of the draw. A verifier whose own
  // write fails must not go on to report a number. Resolve a real student
  // and abort if the id does not exist.
  const studentId = process.env.VERIFY_STUDENT_ID
    ?? (await dbAdmin.from('students').select('user_id').limit(1).single()).data?.user_id
  if (!studentId) throw new Error('no student id: set VERIFY_STUDENT_ID')
  const { data: whoami } = await dbAdmin.from('users').select('id').eq('id', studentId).maybeSingle()
  if (!whoami) throw new Error(`student ${studentId} is not in users; exposures would fail and the result would be meaningless`)
  const sessions: string[] = []
  const n = SAT_MODULE_CONFIG[section].moduleSize
  const seenIds = new Set<string>()
  const { data: bank } = await dbAdmin.from('study_item_bank').select('id, difficulty').eq('family', 'sat').eq('section', section).eq('verified', true).eq('archived', false).range(0, 2999)
  const diff = new Map((bank ?? []).map(r => [r.id, r.difficulty as string]))
  // The assembler returns questions, not ids; map back through prompt+choices.
  const { data: full } = await dbAdmin.from('study_item_bank').select('id, item').eq('family', 'sat').eq('section', section).eq('verified', true).eq('archived', false).range(0, 2999)
  // SEC items share one stem, so the key is stem + passage + choices, not the stem alone.
  const keyOf = (q: { prompt: string; passage?: string | null; choices?: unknown[] }) => `${q.prompt}|${q.passage ?? ''}|${[...(q.choices ?? [])].map(String).sort().join('|')}`
  const idByKey = new Map((full ?? []).map(r => [keyOf(r.item as { prompt: string; passage?: string | null; choices?: unknown[] }), r.id]))
  try {
    for (let form = 1; form <= 3; form++) {
      const sid = randomUUID(); sessions.push(sid)
      const t = await assembleFromBank({ section, count: n, difficulties: ['hard'], studentId, family: 'sat' }, sid)
      const ids = t.questions.map(q => idByKey.get(keyOf(q as { prompt: string; passage?: string | null; choices?: unknown[] })) ?? '?')
      const repeats = ids.filter(id => seenIds.has(id)).length
      const bands: Record<string, number> = {}
      const byDom: Record<string, Record<string, number>> = {}
      for (let i = 0; i < ids.length; i++) { const id = ids[i]!; const d = diff.get(id) ?? '?'; bands[d] = (bands[d] ?? 0) + 1; const dom = (t.questions[i] as { domain?: string | null }).domain ?? '?'; (byDom[dom] ??= {})[d] = (byDom[dom][d] ?? 0) + 1 }
      console.log('   per domain', JSON.stringify(byDom))
      console.log(`form ${form}: ${t.questions.length} items  composition ${JSON.stringify(t.composition)}  bands ${JSON.stringify(bands)}  repeats ${repeats}`)
      ids.forEach(id => seenIds.add(id))
    }
  } finally {
    const { error } = await dbAdmin.from('study_item_exposures').delete().eq('student_id', studentId).in('session_id', sessions)
    console.log('cleanup', error ? error.message : 'ok')
  }
}
main().catch(e => { console.error(e); process.exit(1) })
