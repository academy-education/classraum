/**
 * verify-itep-draw.ts — draw each iTEP section the way the assembler does,
 * WITH STAGED (verified=false) ROWS INCLUDED, and report the count per part.
 *
 *   npx tsx scripts/study-bank/verify-itep-draw.ts [--section grammar|listening|reading] [--seed <s>]
 *
 * Two halves:
 *  1. The live path: assembleAdmissionSection itself, which reads verified
 *     rows only. While iTEP is staged-only it must THROW (no verified items,
 *     or a short draw). A returned test here would mean staged items reached
 *     the serving path.
 *  2. The staged draw: the same rows the assembler would read, but with
 *     verified=false included, through the same drawItepParts and
 *     shuffleDrawnChoices. Prints drawn/wanted per part, the shortfall, and
 *     whether every Part 2 item kept its [A:]..[D:] order while Part 1 items
 *     were reordered.
 *
 * Exits 1 when any section is short (which it is, honestly, until the bank
 * holds a full form), 2 on an unreadable bank. Read-only; records no
 * exposures.
 */
import { config } from 'dotenv'
import { resolve } from 'node:path'

config({ path: resolve(process.cwd(), '.env.local'), quiet: true })

async function main() {
  // Dynamic: assemble.ts builds the admin client at import, so env first.
  const { assembleAdmissionSection, drawItepParts, passagesInSeededOrder, readBankItem, shuffleDrawnChoices } = await import('@/lib/study/assemble')
  const { ADMISSION_BLUEPRINT, ITEP_PART_QUOTAS } = await import('@/lib/study/admission-tests')
  const { hasLabelledSegments } = await import('@/lib/study/labelled-segments')
  const { dbAdmin } = await import('@/lib/supabase-admin')

  const args = process.argv.slice(2)
  const opt = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined }
  const only = opt('--section')
  const seed = opt('--seed') ?? `verify-itep-${Date.now()}`
  const blocks = ADMISSION_BLUEPRINT.itep.filter(b => !only || b.key === only)
  if (!blocks.length) { console.error(`no iTEP block '${only}'`); process.exit(2) }

  let short = 0
  for (const block of blocks) {
    const section = block.bankSection as keyof typeof ITEP_PART_QUOTAS
    console.log(`\n== itep/${block.key}: ${block.questions} questions, ${block.minutes} min`)

    // 1. live path
    try {
      const t = await assembleAdmissionSection({ family: 'itep', sectionKey: block.key }, seed)
      console.log(`  LIVE PATH RETURNED ${t.questions.length} questions - verified rows exist; check before trusting "hidden"`)
    } catch (e) {
      console.log(`  live path (verified only) refuses, as it should while staged: ${(e as Error).message}`)
    }

    // 2. staged draw
    const { data, error, count } = await dbAdmin.from('study_item_bank')
      .select('id, difficulty, item, passage_group_id, domain, verified', { count: 'exact' })
      .eq('family', 'itep').eq('section', section).eq('archived', false)
      .order('created_at').order('id').range(0, 999)
    if (error) { console.error(error.message); process.exit(2) }
    if ((count ?? 0) > (data?.length ?? 0)) { console.error(`read ${data?.length} of ${count} rows; page this read`); process.exit(2) }
    const rows = (data ?? []).flatMap(r => {
      const item = readBankItem(r.item, r.difficulty)
      return item ? [{ id: r.id as string, item, domain: r.domain as string | null, passageGroupId: r.passage_group_id as string | null }] : []
    })
    const staged = (data ?? []).filter(r => r.verified === false).length
    console.log(`  bank: ${data?.length ?? 0} rows (${staged} staged, ${(data?.length ?? 0) - staged} verified), ${rows.length} readable`)

    const parts = drawItepParts(rows, section)
    let got = 0
    ITEP_PART_QUOTAS[section].forEach(({ area, count: want }, i) => {
      const pool = rows.filter(r => r.domain === area).length
      got += parts[i].length
      console.log(`  ${parts[i].length >= want ? 'ok   ' : 'SHORT'} ${area}: drew ${parts[i].length} of ${want} (pool ${pool})`)
    })
    // Disjoint forms: how many full forms the pool holds with no item repeated (the thinnest part decides).
    const forms = Math.min(...ITEP_PART_QUOTAS[section].map(({ area, count: want }) => Math.floor(rows.filter(r => r.domain === area).length / want)))
    console.log(`  disjoint full forms (no repeats, staged included): ${forms}`)
    // Passage-set parts: every drawn group whole, one passage, questions in authored (created_at, id) order.
    ITEP_PART_QUOTAS[section].forEach(({ area, itemsPerGroup }, i) => {
      if (itemsPerGroup <= 1 || !parts[i].length) return
      const pos = new Map(rows.map((r, k) => [r.id, k]))
      const groups = new Map<string, typeof rows>()
      for (const r of parts[i]) groups.set(r.passageGroupId ?? `solo:${r.id}`, [...(groups.get(r.passageGroupId ?? `solo:${r.id}`) ?? []), r])
      const ordered = passagesInSeededOrder(parts[i], pos, seed)
      const bad = [...groups].filter(([, g]) => g.length !== itemsPerGroup || new Set(g.map(r => r.item.passage)).size !== 1)
      const inOrder = [...groups.keys()].every(k => {
        const seq = ordered.filter(r => (r.passageGroupId ?? `solo:${r.id}`) === k).map(r => pos.get(r.id)!)
        return seq.every((v, j) => j === 0 || v > seq[j - 1])
      })
      console.log(`  ${bad.length ? 'BROKEN' : 'ok   '} ${area}: ${groups.size} passage(s) drawn whole (${itemsPerGroup} each, one passage)${bad.length ? `; broken: ${bad.map(([k]) => k).join(', ')}` : ''}; in authored order: ${inOrder ? 'yes' : 'NO'}`)
      if (bad.length || !inOrder) short++
    })
    const ok = got === block.questions
    if (!ok) short++
    console.log(`  ${ok ? 'FULL ' : 'SHORT'} itep/${block.key}: ${got} of ${block.questions}${ok ? '' : `, short by ${block.questions - got}`}`)

    // Serve-time order: Part 2 keeps its labelled order, Part 1 is reordered.
    const served = shuffleDrawnChoices(parts.flat(), seed)
    const before = new Map(parts.flat().map(r => [r.id, r.item.choices.join('|')]))
    const labelled = served.filter(r => hasLabelledSegments(r.item))
    const kept = labelled.filter(r => before.get(r.id) === r.item.choices.join('|')).length
    const other = served.filter(r => !hasLabelledSegments(r.item))
    const moved = other.filter(r => before.get(r.id) !== r.item.choices.join('|')).length
    if (served.length) {
      console.log(`  labelled (error-ID) items served in authored order: ${kept} of ${labelled.length}`)
      console.log(`  other items reordered by the shuffle: ${moved} of ${other.length} (1 in 24 stays put by chance)`)
      const slots: Record<string, number> = {}
      for (const r of labelled) { const s = 'ABCD'[r.item.choices.indexOf(r.item.correct_answer)] ?? '?'; slots[s] = (slots[s] ?? 0) + 1 }
      if (labelled.length) console.log(`  error-ID key slots as served: ${JSON.stringify(slots)}`)
    }
  }
  process.exit(short ? 1 : 0)
}
main().catch(e => { console.error(e); process.exit(2) })
