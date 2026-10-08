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
 *
 * DOMAIN = THE ROW COLUMN (2026-10-09). The per-domain line used to come
 * from each served question's jsonb `item.domain`. The assembler groups by
 * the ROW `domain`, and on 120 live v2 R&W rows the two disagree (the
 * 2026-09-12 refiling moved the column and left the jsonb), so the printout
 * misreported 8 of 10 hard-route forms — "form 9 is short in I&I" was this.
 * Ids now come from the stamp `q.bankItemId` (or `t.itemIds`), the domain
 * from the row, and each form's tally must equal the assembler's own
 * `t.composition`; any mismatch exits non-zero.
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

  const bank = await readBankPaged<{ id: string; domain: string | null; difficulty: string }>(
    (withCount) => dbAdmin.from('study_item_bank')
      .select('id, domain, difficulty', withCount ? { count: 'exact' } : undefined)
      .eq('family', 'sat').eq('section', section).eq('verified', true).eq('archived', false),
    `sat/${section}`,
  )
  const hardInBank = bank.filter(r => r.difficulty === 'hard').length
  console.log(`bank sat/${section}: ${bank.length} live rows, ${hardInBank} hard  (assembler: ${mod})`)
  const diff = new Map(bank.map(r => [r.id, r.difficulty]))
  const rowDomain = new Map(bank.map(r => [r.id, r.domain ?? '?']))

  const seenIds = new Set<string>()
  let unmapped = 0
  let cleanForms = 0
  let compositionMismatches = 0
  for (let form = 1; form <= forms; form++) {
    const sid = randomUUID()
    const t = await assembleFromBank({ section, count: n, difficulties: ['hard'], studentId, family: 'sat' }, sid)
    // The served id: the assembler's stamp on the question, else the parallel
    // itemIds list (same order — both come from the one shuffled draw). If
    // both exist they must agree, or the id itself is not trustworthy.
    const ids = t.questions.map((q, i) => {
      const stamped = (q as { bankItemId?: string | null }).bankItemId ?? null
      const listed = t.itemIds?.[i] ?? null
      if (stamped && listed && stamped !== listed) {
        console.error(`REFUSING: form ${form} item ${i}: bankItemId ${stamped} != itemIds[${i}] ${listed}`)
        process.exit(1)
      }
      const id = stamped ?? listed
      return id && rowDomain.has(id) ? id : '?'
    })
    unmapped += ids.filter(id => id === '?').length
    const repeats = ids.filter(id => seenIds.has(id)).length
    const bands: Record<string, number> = {}
    const byDom: Record<string, Record<string, number>> = {}
    const domTotals: Record<string, number> = {}
    for (const id of ids) {
      const d = diff.get(id) ?? '?'
      bands[d] = (bands[d] ?? 0) + 1
      const dom = rowDomain.get(id) ?? '?'
      ;(byDom[dom] ??= {})[d] = (byDom[dom][d] ?? 0) + 1
      domTotals[dom] = (domTotals[dom] ?? 0) + 1
    }
    const allHard = (bands.hard ?? 0) === ids.length
    if (allHard && repeats === 0 && ids.length === n) cleanForms++
    console.log(`form ${form}: ${t.questions.length}/${n} items  bands ${JSON.stringify(bands)}  repeats ${repeats}${allHard && repeats === 0 ? '  ALL-HARD' : ''}`)
    console.log('   per domain', JSON.stringify(byDom))
    // The tally must equal the assembler's own composition, domain by domain,
    // in both directions — a printout that drifts from the draw is the defect.
    const comp = t.composition ?? {}
    const doms = new Set([...Object.keys(comp), ...Object.keys(domTotals)])
    const diffs = [...doms].filter(d => (comp[d] ?? 0) !== (domTotals[d] ?? 0))
      .map(d => `${d}: tally ${domTotals[d] ?? 0} vs composition ${comp[d] ?? 0}`)
    if (Object.keys(comp).length === 0 || diffs.length > 0) {
      compositionMismatches++
      console.error(`   MISMATCH vs t.composition ${JSON.stringify(comp)}: ${diffs.join('; ') || 'composition is empty'}`)
    }
    ids.forEach(id => seenIds.add(id))
  }
  console.log(`all-hard, repeat-free, full forms: ${cleanForms} of ${forms}   distinct items served ${seenIds.size}   ledger ${ledger.size}`)
  console.log(`per-domain tally equals t.composition: ${forms - compositionMismatches} of ${forms} forms`)
  if (unmapped > 0) {
    console.error(`REFUSING: ${unmapped} served items did not map back to a bank row — the band/repeat counts above are not measurements`)
    process.exit(1)
  }
  if (compositionMismatches > 0) {
    console.error(`FAIL: ${compositionMismatches} of ${forms} forms printed a per-domain tally that differs from the assembler's composition`)
    process.exit(1)
  }
}
main().catch(e => { console.error(e); process.exit(1) })
