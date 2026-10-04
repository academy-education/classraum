/**
 * verify-sat-hard-route.ts — draw consecutive SAT module-2 hard-route forms
 * for one simulated student, through the REAL assembler against the LIVE
 * bank, and report per form the domain composition, repeats of an earlier
 * form, and fallbacks from the hard band.
 *   npx tsx scripts/study-bank/verify-sat-hard-route.ts [reading_writing|math] [forms=3]
 *
 * READ-ONLY (2026-10-04). It used to write exposures under a real student
 * and delete them by session id afterwards. recordExposures UPSERTS on
 * (student_id, item_id) and rewrites session_id, so any item the student
 * had genuinely seen before was overwritten and then DELETED by the
 * cleanup — the verifier erased real history. The exposure ledger is now
 * an in-memory shim over dbAdmin.from('study_item_exposures'); the bank is
 * read live, nothing is written.
 *
 * Its own bank reads were `.range(0, 2999)`, which PostgREST still caps at
 * 1000 — so ids past the cap mapped to '?'. They go through readBankPaged.
 *
 * ASSEMBLE_MODULE=<path> swaps in another assemble.ts (e.g. a copy of the
 * pre-fix file) for a before/after comparison under the same shim.
 */
import { dbAdmin } from '@/lib/supabase-admin'
import { readBankPaged } from '@/lib/study/bank-read'
import { SAT_MODULE_CONFIG } from '@/lib/study/sat-adaptive'
import { randomUUID } from 'node:crypto'

type Ex = { item_id: string; seen_at: string; session_id: string | null }
function shimExposures(): Map<string, Ex> {
  const ledger = new Map<string, Ex>()
  const realFrom = dbAdmin.from.bind(dbAdmin) as unknown as (t: string) => unknown
  ;(dbAdmin as unknown as { from: (t: string) => unknown }).from = (table: string) => {
    if (table !== 'study_item_exposures') return realFrom(table)
    let range: [number, number] = [0, 999]
    const b: Record<string, unknown> = {}
    b.select = () => b
    b.eq = () => b
    b.order = () => b
    b.range = (f: number, t: number) => { range = [f, t]; return b }
    b.upsert = (rows: Array<Ex & { student_id: string }>) => {
      for (const r of rows) ledger.set(r.item_id, { item_id: r.item_id, seen_at: r.seen_at, session_id: r.session_id })
      return Promise.resolve({ data: null, error: null })
    }
    b.then = (ok: (v: unknown) => unknown, bad?: (e: unknown) => unknown) => {
      const all = [...ledger.values()].sort((a, c) => a.item_id.localeCompare(c.item_id))
      return Promise.resolve({ data: all.slice(range[0], range[1] + 1), error: null }).then(ok, bad)
    }
    return b
  }
  return ledger
}

async function main() {
  const section = (process.argv[2] ?? 'reading_writing') as 'reading_writing' | 'math'
  // A22: refuse anything that is not a section rather than query an empty one.
  if (!['math', 'reading_writing'].includes(section)) {
    console.error(`REFUSING: section must be math or reading_writing (got ${section}). This verifier has no file mode.`)
    process.exit(2)
  }
  const forms = Number(process.argv[3] ?? 3)
  if (!Number.isInteger(forms) || forms < 1) { console.error(`REFUSING: forms must be a positive integer`); process.exit(2) }

  const ledger = shimExposures()
  const mod = process.env.ASSEMBLE_MODULE ?? '@/lib/study/assemble'
  const { assembleFromBank } = await import(mod) as typeof import('@/lib/study/assemble')
  const studentId = 'verify-sat-hard-route-simulated'
  const n = SAT_MODULE_CONFIG[section].moduleSize

  const bank = await readBankPaged<{ id: string; difficulty: string; item: { prompt: string; passage?: string | null; choices?: unknown[] } }>(
    (withCount) => dbAdmin.from('study_item_bank')
      .select('id, difficulty, item', withCount ? { count: 'exact' } : undefined)
      .eq('family', 'sat').eq('section', section).eq('verified', true).eq('archived', false),
    `sat/${section}`,
  )
  const hardInBank = bank.filter(r => r.difficulty === 'hard').length
  console.log(`bank sat/${section}: ${bank.length} live rows, ${hardInBank} hard  (assembler: ${mod})`)
  const diff = new Map(bank.map(r => [r.id, r.difficulty]))
  // SEC items share one stem, so the key is stem + passage + choices, not the stem alone.
  const keyOf = (q: { prompt: string; passage?: string | null; choices?: unknown[] }) => `${q.prompt}|${q.passage ?? ''}|${[...(q.choices ?? [])].map(String).sort().join('|')}`
  const idByKey = new Map(bank.map(r => [keyOf(r.item), r.id]))

  const seenIds = new Set<string>()
  let unmapped = 0
  let cleanForms = 0
  for (let form = 1; form <= forms; form++) {
    const sid = randomUUID()
    const t = await assembleFromBank({ section, count: n, difficulties: ['hard'], studentId, family: 'sat' }, sid)
    const ids = t.questions.map(q => idByKey.get(keyOf(q as { prompt: string; passage?: string | null; choices?: unknown[] })) ?? '?')
    unmapped += ids.filter(id => id === '?').length
    const repeats = ids.filter(id => seenIds.has(id)).length
    const bands: Record<string, number> = {}
    const byDom: Record<string, Record<string, number>> = {}
    for (let i = 0; i < ids.length; i++) { const id = ids[i]!; const d = diff.get(id) ?? '?'; bands[d] = (bands[d] ?? 0) + 1; const dom = (t.questions[i] as { domain?: string | null }).domain ?? '?'; (byDom[dom] ??= {})[d] = (byDom[dom][d] ?? 0) + 1 }
    const allHard = (bands.hard ?? 0) === ids.length
    if (allHard && repeats === 0 && ids.length === n) cleanForms++
    console.log(`form ${form}: ${t.questions.length}/${n} items  bands ${JSON.stringify(bands)}  repeats ${repeats}${allHard && repeats === 0 ? '  ALL-HARD' : ''}`)
    console.log('   per domain', JSON.stringify(byDom))
    ids.forEach(id => seenIds.add(id))
  }
  console.log(`all-hard, repeat-free, full forms: ${cleanForms} of ${forms}   distinct items served ${seenIds.size}   ledger ${ledger.size}`)
  if (unmapped > 0) {
    console.error(`REFUSING: ${unmapped} served items did not map back to a bank row — the band/repeat counts above are not measurements`)
    process.exit(1)
  }
}
main().catch(e => { console.error(e); process.exit(1) })
