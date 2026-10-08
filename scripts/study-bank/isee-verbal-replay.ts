/**
 * isee-verbal-replay.ts — 10-form replay of the real ISEE verbal draw.
 *
 * READ ONLY. Never writes to the bank or to study_item_exposures.
 *
 *   npx tsx scripts/study-bank/isee-verbal-replay.ts [--forms 10]
 *        [--add-syn N] [--add-sc N]        synthetic solo items per type (sizing)
 *        [--with <kept.batch.json>]        a not-yet-inserted file's items, as solo rows
 *        [--need 9]                        smallest +syn / +SC that reaches N clean forms
 *
 * Why this exists: `admission-form-depth.ts` prints six forms (FORMS = 6), and
 * every ISEE verbal batch since s17 has been sized and reported against a
 * 10-form replay built by hand on a scratch copy. This is that replay, written
 * down: it imports the REAL `drawByPassage`, `VERBAL_TYPES` and `verbalKind`,
 * and its `unseenFirst` / per-form loop are a faithful copy of
 * admission-form-depth.ts's `replay` (which cannot be imported: that file runs
 * its main on import).
 *
 * Break-test: on the live bank of 2026-10-08 (302 rows) it must print 7 clean
 * forms with form 8 at 22/40 (syn 19/20, SC 3/20), the number s17 and s18
 * recorded; `--need 9` must print syn +21 / SC +37.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { drawByPassage, VERBAL_TYPES, verbalKind } from '../../src/lib/study/admission-tests'

type Row = { id: string; passageGroupId: string | null; item?: { prompt?: string | null }; task?: string | null }

function unseenFirst(rows: Row[], seen: Map<string, number>): Row[] {
  const unseen = rows.filter(r => !seen.has(r.id))
  const already = rows.filter(r => seen.has(r.id)).sort((a, b) => seen.get(a.id)! - seen.get(b.id)!)
  return [...unseen, ...already]
}

const QUESTIONS = 40
function replay(rows: Row[], forms: number) {
  const seen = new Map<string, number>()
  const out: { form: number; fresh: number; delivered: number; byKind: Record<string, string> }[] = []
  for (let f = 1; f <= forms; f++) {
    const fresh = (r: Row) => !seen.has(r.id)
    const picked: Row[] = []
    const taken = new Set<string>()
    const byKind: Record<string, string> = {}
    for (const { kind, count } of VERBAL_TYPES.isee) {
      const pool = unseenFirst(rows.filter(r => verbalKind(r.item ?? {}, r.task) === kind), seen)
      const got = drawByPassage(pool, count, 1, fresh)
      byKind[kind] = `${got.filter(fresh).length}/${count}`
      for (const r of got) { picked.push(r); taken.add(r.id) }
    }
    if (picked.length < QUESTIONS) picked.push(...drawByPassage(unseenFirst(rows.filter(r => !taken.has(r.id)), seen), QUESTIONS - picked.length, 1, fresh))
    const freshCount = picked.filter(fresh).length
    for (const r of picked) seen.set(r.id, f)
    out.push({ form: f, fresh: freshCount, delivered: picked.length, byKind })
  }
  return out
}
const cleanOf = (res: ReturnType<typeof replay>) => { const i = res.findIndex(r => r.fresh < r.delivered || r.delivered < QUESTIONS); return i === -1 ? res.length : i }

const arg = (k: string) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : undefined }
const FORMS = Number(arg('--forms') ?? 10)
const synth = (kind: 'syn' | 'sc', n: number): Row[] => Array.from({ length: n }, (_, i) => ({
  id: `synthetic-${kind}-${i}`, passageGroupId: null,
  item: { prompt: kind === 'syn' ? '[Synonym] WORD' : '[Sentence Completion] a -------.' },
}))

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

async function main() {
  const rows: Row[] = []
  for (let f = 0; ; f += 1000) {
    const { data, error } = await db.from('study_item_bank').select('id,passage_group_id,item,task')
      .eq('family', 'isee').eq('section', 'verbal').eq('verified', true).eq('archived', false)
      .order('id', { ascending: true }).range(f, f + 999)
    if (error) throw new Error(error.message)
    rows.push(...data.map(r => ({ id: r.id as string, passageGroupId: r.passage_group_id as string | null, item: r.item as { prompt?: string | null }, task: r.task as string | null })))
    if (data.length < 1000) break
  }
  if (new Set(rows.map(r => r.id)).size !== rows.length) { console.error('REFUSING: paging slipped'); process.exit(2) }
  if (!rows.length) { console.error('REFUSING: zero live ISEE verbal rows read'); process.exit(2) }
  const withPath = arg('--with')
  if (withPath) {
    const batch = JSON.parse(readFileSync(withPath, 'utf8')) as Array<{ id: string; prompt: string }>
    if (!batch.length) { console.error(`REFUSING: ${withPath} holds no items`); process.exit(2) }
    rows.push(...batch.map(it => ({ id: `batch-${it.id}`, passageGroupId: null, item: { prompt: it.prompt }, task: null })))
    console.log(`  + ${batch.length} rows from ${withPath} (solo, not yet inserted)`)
  }
  rows.push(...synth('syn', Number(arg('--add-syn') ?? 0)), ...synth('sc', Number(arg('--add-sc') ?? 0)))
  const count = (kind: string) => {
    const r = rows.filter(x => verbalKind(x.item ?? {}, x.task) === kind)
    return `${r.length} items / ${new Set(r.map(x => x.passageGroupId ?? `solo-${x.id}`)).size} groups`
  }
  const unk = rows.filter(x => !verbalKind(x.item ?? {}, x.task)).length
  console.log(`ISEE verbal rows ${rows.length}: synonym ${count('synonym')}, SC ${count('sentence completion')}, unclassified ${unk}`)
  const res = replay(rows, FORMS)
  for (const r of res) console.log(`  form ${String(r.form).padStart(2)}  ${r.fresh}/${r.delivered}  syn ${r.byKind.synonym}  SC ${r.byKind['sentence completion']}`)
  console.log(`  => ${cleanOf(res)} clean forms (of ${FORMS} replayed)`)

  const need = arg('--need')
  if (need) {
    const target = Number(need)
    const base = rows.filter(r => !r.id.startsWith('synthetic-'))
    // Each type is drawn from its own pool, so each need is found with the other type padded generously.
    const find = (kind: 'syn' | 'sc') => {
      for (let n = 0; n <= 400; n++) {
        const extra = kind === 'syn' ? [...synth('syn', n), ...synth('sc', 400)] : [...synth('syn', 400), ...synth('sc', n)]
        if (cleanOf(replay([...base, ...extra], target)) >= target) return n
      }
      return NaN
    }
    console.log(`  need for ${target} clean forms: synonyms +${find('syn')}, SC +${find('sc')}`)
  }
}
main().catch(e => { console.error(e); process.exit(1) })
