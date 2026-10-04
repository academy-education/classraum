/**
 * npx tsx scripts/study-bank/fixes/apply-2026-10-04-scores.ts [--write | --rollback]
 *
 * Re-scores every completed TOEFL Speaking/Writing full test whose stored
 * study_sessions.score disagrees with the CURRENT scorer (owner decisions
 * 2026-10-04):
 *   - full tests whose score was overwritten by ONE task's band through the
 *     per-item grade route (stored 60 = 3/5), or never got a final score
 *     after concurrent grades;
 *   - sections with a BLANK open response, which now counts 0 (it used to
 *     hold the write forever, leaving history on the submit-time percent).
 *
 * DRY RUN by default: computes the new value with the same recompute the
 * graders run, through a store that captures the write instead of making
 * it, prints before -> after, and writes the snapshot of every row it would
 * touch (score, correct_count, total_count, status, completed_at).
 *
 * --write     refuses without the snapshot; for each row refuses if the live
 *             score no longer matches the snapshot; then calls
 *             recomputeAndPersistSessionScore — the deployed logic, with its
 *             compare-and-set — so run it only AFTER the code is deployed.
 * --rollback  restores `score` from the snapshot (compare-and-set on the
 *             current value). Only `score` is ever written.
 */
import { config } from 'dotenv'
import { resolve } from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '.env.local') })
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } })

const SNAP = resolve(process.cwd(), 'scripts/study-bank/fixes/snapshot-2026-10-04-scores.json')
const WRITE = process.argv.includes('--write')
const ROLLBACK = process.argv.includes('--rollback')

interface SnapRow {
  id: string; slug: string; status: string; completed_at: string | null
  correct_count: number | null; total_count: number | null
  score_before: number | null; score_after_dry: number | null; reason: string
}

async function main() {
  if (WRITE && ROLLBACK) throw new Error('pick one of --write / --rollback')

  if (ROLLBACK) {
    if (!existsSync(SNAP)) throw new Error('no snapshot - nothing to roll back')
    const snap = JSON.parse(readFileSync(SNAP, 'utf8')) as { rows: SnapRow[] }
    for (const r of snap.rows) {
      const { data: cur } = await db.from('study_sessions').select('score').eq('id', r.id).single()
      const now = cur?.score === null || cur?.score === undefined ? null : Number(cur.score)
      if (now === r.score_before) { console.log(`${r.id.slice(0, 8)} already ${now}`); continue }
      let q = db.from('study_sessions').update({ score: r.score_before }).eq('id', r.id)
      q = now === null ? q.is('score', null) : q.eq('score', now)
      const { data, error } = await q.select('id')
      console.log(`${r.id.slice(0, 8)} ${now} -> ${r.score_before} ${error ? 'ERROR ' + error.message : data?.length ? 'restored' : 'SKIPPED (changed underneath)'}`)
    }
    return
  }

  const { recomputeSessionScoreWith } = await import('../../../src/lib/study/session-score-recompute')
  const { dbSessionScoreStore, recomputeAndPersistSessionScore } = await import('../../../src/lib/study/persist-session-score')
  const { scoreListenRepeat } = await import('../../../src/lib/study/listen-repeat-accuracy')

  if (WRITE) {
    if (!existsSync(SNAP)) throw new Error('snapshot missing - run the dry run first')
    const snap = JSON.parse(readFileSync(SNAP, 'utf8')) as { rows: SnapRow[] }
    let ok = 0
    for (const r of snap.rows) {
      const { data: cur } = await db.from('study_sessions').select('score').eq('id', r.id).single()
      const now = cur?.score === null || cur?.score === undefined ? null : Number(cur.score)
      if (now !== r.score_before) { console.log(`${r.id.slice(0, 8)} REFUSED: live ${now} != snapshot ${r.score_before}`); continue }
      const res = await recomputeAndPersistSessionScore(r.id)
      console.log(`${r.id.slice(0, 8)} ${r.score_before} -> ${res.score} ${res.updated ? 'written' : `NOT written (${res.reason})`}`)
      if (res.updated) ok++
    }
    console.log(`written ${ok} of ${snap.rows.length}`)
    return
  }

  // ── dry run ──
  const { data: sessions, error } = await db
    .from('study_sessions')
    .select('id, status, completed_at, score, correct_count, total_count, topic:study_topics!inner(slug)')
    .eq('mode', 'full_test').eq('status', 'completed')
    .in('topic.slug', ['toefl-speaking', 'toefl-writing'])
    .limit(1000)
  if (error) throw new Error(error.message)
  const list = (sessions ?? []) as unknown as Array<{
    id: string; status: string; completed_at: string | null; score: string | number | null
    correct_count: number | null; total_count: number | null; topic: { slug: string }
  }>
  console.log(`TOEFL Speaking/Writing completed full tests read: ${list.length}`)
  if (list.length === 0) { console.error('read nothing - refusing to report'); process.exit(1) }

  const rows: SnapRow[] = []
  for (const s of list) {
    let captured: number | null = null
    const capture = { ...dbSessionScoreStore, compareAndSetScore: async (_id: string, _e: number | null, next: number) => { captured = next; return { applied: true } } }
    const res = await recomputeSessionScoreWith(capture, s.id, scoreListenRepeat)
    if (captured === null) continue
    const before = s.score === null ? null : Number(s.score)
    rows.push({
      id: s.id, slug: s.topic.slug, status: s.status, completed_at: s.completed_at,
      correct_count: s.correct_count, total_count: s.total_count,
      score_before: before, score_after_dry: captured, reason: res.reason ?? 'rescored',
    })
  }
  rows.sort((a, b) => String(b.completed_at).localeCompare(String(a.completed_at)))
  console.log(`\nwould change: ${rows.length}\n`)
  console.log('session   section         completed    before -> after')
  for (const r of rows) {
    console.log(`${r.id.slice(0, 8)}  ${r.slug.padEnd(14)}  ${String(r.completed_at).slice(0, 10)}  ${String(r.score_before).padStart(6)} -> ${r.score_after_dry}`)
  }
  if (existsSync(SNAP)) {
    console.log(`\nsnapshot exists, left untouched: ${SNAP}`)
  } else {
    writeFileSync(SNAP, JSON.stringify({ taken_at: new Date().toISOString(), rows }, null, 2) + '\n')
    console.log(`\nsnapshot written: ${SNAP}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
