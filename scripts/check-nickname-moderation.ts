/**
 * Would the nickname content rules reject anybody who already has a
 * handle?
 *
 * A stricter list is not automatically a better one: adding a term that
 * invalidates a live user's nickname is a regression they experience and
 * cannot fix — the handle is already theirs, and it is changeable only
 * once. Run this after ANY edit to nickname-moderation.ts.
 *
 *   npx tsx scripts/check-nickname-moderation.ts
 *
 * Exits non-zero if any existing nickname would now be refused.
 */
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import { validateNickname } from '../src/lib/study/nickname'

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('='))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)

async function main() {
  const db = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  )

  const { data, error } = await db
    .from('study_user_prefs')
    .select('student_id, nickname')
    .not('nickname', 'is', null)

  if (error) { console.error('query failed:', error.message); process.exit(2) }

  const rows = data ?? []
  const rejected = rows
    .map(r => ({ nickname: r.nickname as string, reason: validateNickname(r.nickname as string) }))
    .flatMap(r => (r.reason === null ? [] : [{ nickname: r.nickname, reason: r.reason }]))

  console.log(`  existing nicknames: ${rows.length}`)
  console.log(`  would now be REJECTED: ${rejected.length}`)
  for (const r of rejected) console.log(`     ${r.reason.padEnd(15)} ${r.nickname}`)

  if (rejected.length > 0) {
    console.error('\n  ✗ The rules reject handles that already exist. Loosen the list.\n')
    process.exit(1)
  }
  console.log('  ✓ no existing nickname is affected\n')

}

main()
