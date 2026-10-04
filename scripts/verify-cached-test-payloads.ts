/**
 * READ-ONLY: every cached full-test payload must still be submittable.
 *
 * The client submits the `[full-test-v1]` payload it was served, verbatim,
 * and /api/study/test/submit grades against that same cached row. Both pass
 * through SubmitSchema / QuestionSchema (src/lib/study/test-submit-schema.ts).
 * A schema change that rejects a shape already sitting in a cache row breaks
 * every in-flight or resumable test of that shape — that is exactly how every
 * SSAT/ISEE essay submit 400'd with "bad payload" until 2026-10-04.
 *
 * For each row in the window it checks, with the CURRENT production schema:
 *   1. the cache parses as the route parses it (z.array(QuestionSchema)), and
 *   2. a client body built from it (all answers null) passes SubmitSchema.
 *
 * Usage: npx tsx scripts/verify-cached-test-payloads.ts [--days 30]
 * Exit 1 on any failure, and on reading zero rows (a check that read nothing
 * must not report a pass).
 */
import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { QuestionSchema, SubmitSchema } from '../src/lib/study/test-submit-schema'
config({ path: resolve(process.cwd(), '.env.local') })

const MARKER = '[full-test-v1]'
const di = process.argv.indexOf('--days')
const days = di >= 0 ? Number(process.argv[di + 1]) : 30
if (!Number.isFinite(days) || days <= 0) { console.error('bad --days'); process.exit(2) }

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) { console.error('missing Supabase env'); process.exit(2) }
  const db = createClient(url, key)
  const since = new Date(Date.now() - days * 86_400_000).toISOString()

  // Paged: PostgREST truncates at 1000 rows and a truncated read reports clean.
  const rows: { session_id: string; created_at: string; content: string }[] = []
  for (let from = 0; ; from += 200) {
    const { data, error } = await db
      .from('study_messages')
      .select('session_id, created_at, content')
      .like('content', `${MARKER}%`)
      .gte('created_at', since)
      .order('created_at', { ascending: true })
      .range(from, from + 199)
    if (error) { console.error('read failed:', error.message); process.exit(2) }
    rows.push(...(data ?? []))
    if (!data || data.length < 200) break
  }
  const { count: expected, error: countErr } = await db
    .from('study_messages')
    .select('id', { count: 'exact', head: true })
    .like('content', `${MARKER}%`)
    .gte('created_at', since)
  if (countErr) { console.error('count failed:', countErr.message); process.exit(2) }

  let questions = 0
  const types = new Map<string, number>()
  const failures: string[] = []
  for (const row of rows) {
    let payload: { questions?: unknown }
    try { payload = JSON.parse(row.content.slice(MARKER.length)) } catch {
      failures.push(`${row.session_id} ${row.created_at}  JSON unparseable`); continue
    }
    if (!Array.isArray(payload.questions)) {
      failures.push(`${row.session_id} ${row.created_at}  no questions array`); continue
    }
    questions += payload.questions.length
    for (const q of payload.questions as { type?: string }[]) {
      types.set(String(q?.type ?? 'null'), (types.get(String(q?.type ?? 'null')) ?? 0) + 1)
    }
    const cached = z.array(QuestionSchema).safeParse(payload.questions)
    if (!cached.success) {
      const issue = cached.error.issues[0]!
      failures.push(`${row.session_id} ${row.created_at}  cache parse: ${issue.path.join('.')} ${issue.message}`)
      continue
    }
    const body = SubmitSchema.safeParse({
      sessionId: row.session_id,
      questions: payload.questions,
      answers: payload.questions.map(() => null),
      elapsedSeconds: 0,
      questionSeconds: payload.questions.map(() => 0),
    })
    if (!body.success) {
      const issue = body.error.issues[0]!
      failures.push(`${row.session_id} ${row.created_at}  submit body: ${issue.path.join('.')} ${issue.message}`)
    }
  }

  console.log(`read ${rows.length} of ${expected} cached payloads (last ${days} days), ${questions} questions`)
  console.log('types: ' + [...types].map(([t, n]) => `${t}=${n}`).join(' '))
  if (rows.length === 0 || rows.length !== expected) {
    console.error('FAIL: read count does not match the table — nothing is verified')
    process.exit(1)
  }
  if (failures.length) {
    console.error(`FAIL: ${failures.length} payload(s) would not submit:`)
    for (const f of failures) console.error('  ' + f)
    process.exit(1)
  }
  console.log(`ok: all ${rows.length} parse with the current submit schema`)
}

void main()
