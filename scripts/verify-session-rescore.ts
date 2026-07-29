/**
 * Recompute stored session scores from graded rubric data.
 *
 * study_sessions.score is written at submit, before any rubric band
 * exists, and until 2026-07-29 nothing revised it — so Speaking and
 * Writing sessions carried a number computed from inputs that had not
 * arrived. Writing showed 60 in history against 83 on the summary
 * screen; Speaking 43 against 54.
 *
 * The grading routes now call recomputeAndPersistSessionScore when the
 * last band lands. This script is the backfill for sessions graded
 * BEFORE that shipped, and the audit for whether stored and displayed
 * scores agree.
 *
 * Read-only by default: prints stored vs recomputed and exits.
 *
 *   npx tsx scripts/verify-session-rescore.ts              # audit all
 *   npx tsx scripts/verify-session-rescore.ts --write      # fix drifted
 *   npx tsx scripts/verify-session-rescore.ts <id> [<id>]  # specific
 */
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

// Dynamic import, deliberately. `import` statements are HOISTED above the
// config() call above, so a static import of the helper would evaluate
// supabase-admin — which throws at module scope on a missing service-role
// key — before dotenv had loaded anything. Same shape as the build-time
// failure fixed in level-test-generator.ts: a module-scope client that
// runs earlier than whoever was supposed to give it credentials.
// (moved inside the async IIFE — tsx compiles to CJS, which has no
// top-level await.)

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const WRITE = process.argv.includes('--write')
const ids = process.argv.slice(2).filter(a => !a.startsWith('--'))

;(async () => {
  const { recomputeAndPersistSessionScore } =
    await import('@/lib/study/persist-session-score')

  let targets = ids
  if (targets.length === 0) {
    const { data } = await db
      .from('study_sessions')
      .select('id')
      .eq('mode', 'full_test')
      .eq('status', 'completed')
    targets = (data ?? []).map(r => r.id as string)
  }

  console.log(`${targets.length} completed full_test session(s)${WRITE ? '  [WRITING]' : '  [audit only]'}\n`)
  console.log('session   section   graded   stored   recomputed   note')
  console.log('─'.repeat(74))

  let drifted = 0, fixed = 0, incomplete = 0
  for (const id of targets) {
    const { data: before } = await db
      .from('study_sessions').select('score').eq('id', id).maybeSingle()
    const stored = before?.score == null ? null : Number(before.score)

    // The helper writes. In audit mode, restore the original afterwards
    // so a read-only run stays read-only — the recomputation itself is
    // the thing being inspected, not its side effect.
    const r = await recomputeAndPersistSessionScore(id)
    if (!WRITE && r.updated) {
      await db.from('study_sessions').update({ score: stored }).eq('id', id)
    }

    if (!r.section) continue
    if (r.reason === 'nothing answered') {
      console.log(`${id.slice(0, 8)}  ${r.section.padEnd(9)}  -/-` +
        `       ${String(stored ?? '-').padStart(6)}   ${'null'.padStart(10)}   ` +
        `${stored === null ? 'ok (never attempted)' : 'STORED SCORE IS WRONG — session never attempted'}`)
      continue
    }
    if (r.reason === 'grading incomplete') {
      incomplete++
      console.log(`${id.slice(0, 8)}  ${r.section.padEnd(9)} ${String(r.graded).padStart(2)}/${r.graded + r.ungraded}` +
        `     ${String(stored ?? '-').padStart(6)}   ${'-'.padStart(10)}   grading incomplete`)
      continue
    }
    // null recomputed == null stored is agreement, not drift: a session
    // nobody answered correctly has no score, and the helper declining to
    // invent one is the desired outcome.
    const changed = r.score === null
      ? stored !== null
      : stored === null || Math.abs(r.score - stored) > 0.01
    if (changed) drifted++
    if (changed && WRITE) fixed++
    console.log(`${id.slice(0, 8)}  ${r.section.padEnd(9)} ${String(r.graded).padStart(2)}/${r.graded}` +
      `     ${String(stored ?? '-').padStart(6)}   ${String(r.score).padStart(10)}   ` +
      `${changed ? (WRITE ? 'FIXED' : 'DRIFT') : 'ok'}`)
  }

  console.log('─'.repeat(74))
  console.log(`${drifted} drifted, ${incomplete} still grading${WRITE ? `, ${fixed} written` : ''}`)
  if (!WRITE && drifted > 0) console.log('\nAudit only — nothing changed. Re-run with --write to fix.')
})().catch(e => { console.error(e); process.exit(1) })
