import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Question } from '@/lib/test-verify'

/**
 * Assemble a test from the pre-verified item bank (study_item_bank),
 * as opposed to generating one live. Pulls only verified rows, spreads
 * selection across content domains (round-robin) so a section isn't
 * clustered in one domain, and shapes the result into the same
 * TestPayload the generator emits and the renderer consumes.
 *
 * v1 is a simple domain-balanced draw. The full blueprint enforcement
 * (exact per-domain quotas + difficulty mix + adaptive module-2
 * routing) layers on top of this once the bank is large enough to
 * satisfy every cell.
 */

export interface AssembleParams {
  family?: string
  section: 'reading_writing' | 'math'
  /** Target item count. Returns fewer if the bank can't satisfy it. */
  count: number
  /** Optional per-difficulty ceiling filter (e.g. only 'hard'). */
  difficulties?: Array<'easy' | 'medium' | 'hard'>
}

export interface AssembledTest {
  title: string
  timeLimitMinutes: number
  section: string | null
  family: string
  questions: Question[]
  /** Per-domain tally of what was actually drawn (for QA / logging). */
  composition: Record<string, number>
}

const SECTION_META: Record<string, { title: string; minutesPerQ: number; label: string }> = {
  reading_writing: { title: 'Digital SAT — Reading & Writing', minutesPerQ: 1.19, label: 'Reading & Writing' },
  math:            { title: 'Digital SAT — Math',              minutesPerQ: 1.59, label: 'Math' },
}

/** Deterministic-ish shuffle seeded by a string (stable per session id). */
function seededShuffle<T>(arr: T[], seed: string): T[] {
  let h = 2166136261
  for (const c of seed) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) }
  const rand = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000 }
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

export async function assembleFromBank(p: AssembleParams, seed = 'bank'): Promise<AssembledTest> {
  const family = p.family ?? 'sat'
  let query = supabaseAdmin
    .from('study_item_bank')
    .select('domain, difficulty, item')
    .eq('family', family)
    .eq('section', p.section)
    .eq('verified', true)
  if (p.difficulties?.length) query = query.in('difficulty', p.difficulties)

  const { data, error } = await query
  if (error) throw new Error(`assemble query failed: ${error.message}`)
  const rows = (data ?? []) as Array<{ domain: string; difficulty: string; item: Question }>
  if (rows.length === 0) throw new Error(`no verified items for ${family}/${p.section}`)

  // Bucket by domain, shuffle within each, then round-robin across
  // domains so the draw is balanced rather than clustered.
  const byDomain = new Map<string, Question[]>()
  for (const r of rows) {
    const list = byDomain.get(r.domain) ?? []
    list.push(r.item)
    byDomain.set(r.domain, list)
  }
  const domains = seededShuffle([...byDomain.keys()], seed)
  for (const d of domains) byDomain.set(d, seededShuffle(byDomain.get(d)!, seed + d))

  const picked: Question[] = []
  const composition: Record<string, number> = {}
  let exhausted = false
  while (picked.length < p.count && !exhausted) {
    exhausted = true
    for (const d of domains) {
      if (picked.length >= p.count) break
      const list = byDomain.get(d)!
      const q = list.shift()
      if (q) { picked.push(q); composition[d] = (composition[d] ?? 0) + 1; exhausted = false }
    }
  }

  const meta = SECTION_META[p.section]!
  const timeLimitMinutes = Math.max(5, Math.round(picked.length * meta.minutesPerQ))
  return {
    title: meta.title,
    timeLimitMinutes,
    section: meta.label,
    family,
    questions: picked,
    composition,
  }
}
