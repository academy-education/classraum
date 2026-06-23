/**
 * One-off seed for a single (family, sectionKey?) — run refresh +
 * samples and report results. Use to validate the pipeline on a
 * specific test before triggering the full cron sweep.
 *
 * Usage:
 *   DOTENV_CONFIG_PATH=.env.local npx tsx -r dotenv/config scripts/seed-test-spec.ts <family> [sectionKey]
 *
 * Examples:
 *   scripts/seed-test-spec.ts toefl Reading
 *   scripts/seed-test-spec.ts ielts            # all IELTS sections
 *   scripts/seed-test-spec.ts act Math
 */

import {
  refreshTestSpec,
  refreshTestSpecExamples,
  listAllSpecTargetsFromDB,
} from '../src/lib/test-spec-refresh'

async function main() {
  const family = process.argv[2]
  const sectionKey = process.argv[3]
  if (!family) {
    console.error('usage: seed-test-spec.ts <family> [sectionKey]')
    process.exit(1)
  }

  const all = await listAllSpecTargetsFromDB({ includeSkipped: true })
  const targets = all
    .filter(t => t.family === family)
    .filter(t => !sectionKey || t.sectionKey === sectionKey)
  if (targets.length === 0) {
    console.error(`no targets for family=${family}${sectionKey ? ` section=${sectionKey}` : ''}`)
    console.error(`available families: ${[...new Set(all.map(t => t.family))].join(', ')}`)
    process.exit(1)
  }

  console.log(`\nSeeding ${targets.length} section(s):`)
  for (const t of targets) console.log(`  - ${t.displayName}`)
  console.log()

  for (const target of targets) {
    console.log(`━━━ ${target.displayName} ━━━`)

    console.log('Step 1: format refresh...')
    const t1 = Date.now()
    const formatResult = await refreshTestSpec(target, { force: true })
    console.log(`  → ${formatResult.ok ? 'OK' : 'FAIL'} in ${((Date.now() - t1) / 1000).toFixed(1)}s — ${formatResult.notes}`)
    console.log(`  Sources cited (${formatResult.sources.length}):`)
    for (const s of formatResult.sources.slice(0, 5)) console.log(`    - ${s}`)

    if (!formatResult.ok) {
      console.log('  (skipping samples since format failed)\n')
      continue
    }

    console.log('Step 2: samples refresh...')
    const t2 = Date.now()
    const samplesResult = await refreshTestSpecExamples(target, { force: true, targetCount: 8 })
    console.log(`  → ${samplesResult.ok ? 'OK' : 'FAIL'} in ${((Date.now() - t2) / 1000).toFixed(1)}s — ${samplesResult.notes}`)
    console.log(`  Examples added: ${samplesResult.examplesAdded}`)
    console.log(`  Sources cited (${samplesResult.sources.length}):`)
    for (const s of samplesResult.sources.slice(0, 5)) console.log(`    - ${s}`)
    console.log()
  }

  console.log('Done. Inspect rows in study_test_specs to see the cached output.')
}

main().catch(err => { console.error(err); process.exit(1) })
