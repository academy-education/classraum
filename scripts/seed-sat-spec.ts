/**
 * One-off seed: refresh format + samples for SAT only.
 *
 * Usage:
 *   DOTENV_CONFIG_PATH=.env.local npx tsx -r dotenv/config scripts/seed-sat-spec.ts
 *
 * Hits the live Supabase DB and OpenAI API. Estimated cost ~$0.40.
 * Skips Essay Practice (not MC-suitable).
 */

import {
  refreshTestSpec,
  refreshTestSpecExamples,
  listAllSpecTargetsFromDB,
} from '../src/lib/test-spec-refresh'

async function main() {
  console.log('Loading targets from DB...')
  const all = await listAllSpecTargetsFromDB()
  const satTargets = all.filter(t =>
    t.family === 'sat' &&
    !t.sectionKey.toLowerCase().includes('essay') // skip Essay Practice (open-ended)
  )

  if (satTargets.length === 0) {
    console.error('No SAT targets found in DB. Did you mean to seed?')
    process.exit(1)
  }

  console.log(`\nSeeding ${satTargets.length} SAT sections:`)
  for (const t of satTargets) console.log(`  - ${t.displayName}`)
  console.log()

  for (const target of satTargets) {
    console.log(`━━━ ${target.displayName} ━━━`)

    console.log('Step 1: format refresh...')
    const t1 = Date.now()
    const formatResult = await refreshTestSpec(target, { force: true })
    console.log(`  → ${formatResult.ok ? 'OK' : 'FAIL'} in ${((Date.now() - t1) / 1000).toFixed(1)}s — ${formatResult.notes}`)
    console.log(`  Sources cited (${formatResult.sources.length}):`)
    for (const s of formatResult.sources.slice(0, 5)) console.log(`    - ${s}`)
    if (formatResult.sources.length > 5) console.log(`    ... and ${formatResult.sources.length - 5} more`)

    console.log('Step 2: samples refresh...')
    const t2 = Date.now()
    const samplesResult = await refreshTestSpecExamples(target, { force: true, targetCount: 8 })
    console.log(`  → ${samplesResult.ok ? 'OK' : 'FAIL'} in ${((Date.now() - t2) / 1000).toFixed(1)}s — ${samplesResult.notes}`)
    console.log(`  Examples added: ${samplesResult.examplesAdded}`)
    console.log(`  Sources cited (${samplesResult.sources.length}):`)
    for (const s of samplesResult.sources.slice(0, 5)) console.log(`    - ${s}`)
    if (samplesResult.sources.length > 5) console.log(`    ... and ${samplesResult.sources.length - 5} more`)

    console.log()
  }

  console.log('Done. Inspect the rows in study_test_specs to see the cached output.')
}

main().catch(err => { console.error(err); process.exit(1) })
