/**
 * Seed the TOEFL Writing usage deck into study_flashcard_bank.
 *
 *   npx tsx scripts/seed-writing-usage-cards.ts [--dry]
 *
 * Idempotent by content_hash. The unique index on that column is
 * PARTIAL, so ON CONFLICT raises 42P10 — dedupe is done explicitly by
 * reading the existing hashes first, exactly as the item-bank seeders do.
 *
 * Card shape maps onto how FlashcardsSession renders:
 *   front  headword + part of speech        (the retrieval cue)
 *   hint   pattern + the error to avoid     (revealed on tap)
 *   back   sense + model sentence           (the flip)
 */
import { config } from 'dotenv'
import { resolve } from 'path'
import { createHash } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { WRITING_USAGE_CARDS } from '../src/lib/study/writing-usage-cards'
import { awlSublist } from '../src/lib/study/awl'

config({ path: resolve(process.cwd(), '.env.local') })
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error('Missing Supabase env'); process.exit(2) }
const db = createClient(url, key, { auth: { persistSession: false } })

const POS_LABEL: Record<string, string> = {
  v: 'verb', n: 'noun', adj: 'adjective', adv: 'adverb',
}

function main() {
  const dry = process.argv.includes('--dry')

  const rows = WRITING_USAGE_CARDS.map(c => {
    const sublist = awlSublist(c.headword)
    if (sublist == null) throw new Error(`not an AWL headword: ${c.headword}`)
    const front = `${c.headword}  (${POS_LABEL[c.pos] ?? c.pos})`
    const hint = `${c.pattern}\n${c.avoid}`
    const back = `${c.sense}\n\n"${c.example}"`
    return {
      family: 'toefl',
      section: 'writing',
      // Sublist doubles as the domain so a future draw can weight by it.
      domain: `awl_sublist_${sublist}`,
      front, back, hint,
      // Sublist 1 words are the ones a student most likely half-knows.
      difficulty: sublist === 1 ? 'easy' : sublist === 2 ? 'medium' : 'hard',
      content_hash: createHash('sha256')
        .update(`toefl|writing|usage|${c.headword}`).digest('hex').slice(0, 32),
      verified: true,
      archived: false,
      cohort: 'toefl-writing-usage-v1',
    }
  })

  void (async () => {
    const { data: existing } = await db
      .from('study_flashcard_bank')
      .select('content_hash')
      .eq('family', 'toefl').eq('section', 'writing')
    const have = new Set((existing ?? []).map(r => r.content_hash as string))
    const fresh = rows.filter(r => !have.has(r.content_hash))

    console.log(`${rows.length} cards authored, ${have.size} already banked, ${fresh.length} to insert.`)
    const bySub = new Map<string, number>()
    for (const r of rows) bySub.set(r.domain, (bySub.get(r.domain) ?? 0) + 1)
    console.log('sublist spread:', Object.fromEntries([...bySub].sort()))

    if (dry) { console.log('\n--dry: nothing written.'); return }
    if (fresh.length === 0) { console.log('Nothing to do.'); return }

    const { error } = await db.from('study_flashcard_bank').insert(fresh)
    if (error) { console.error('insert failed', error); process.exit(1) }
    console.log(`Inserted ${fresh.length}.`)
  })()
}
main()
