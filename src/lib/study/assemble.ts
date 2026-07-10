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

/**
 * College Board Digital SAT domain blueprint — target share of each
 * section's questions. Drives per-domain quotas at assembly so an
 * assembled test mirrors the real exam's weighting (Algebra + Advanced
 * Math dominate; Geometry/Trig is light) rather than an even split.
 * Domain keys must match study_item_bank.domain exactly.
 * Sources: College Board Digital SAT Assessment Framework.
 */
const BLUEPRINT: Record<string, Record<string, number>> = {
  math: {
    'Algebra': 0.35,
    'Advanced Math': 0.35,
    'Problem-Solving and Data Analysis': 0.15,
    'Geometry and Trigonometry': 0.15,
  },
  reading_writing: {
    'Craft and Structure': 0.28,
    'Information and Ideas': 0.26,
    'Standard English Conventions': 0.26,
    'Expression of Ideas': 0.20,
  },
}

/**
 * Largest-remainder apportionment: turn fractional blueprint weights
 * into whole per-domain quotas that sum to exactly `count`. Floors each
 * ideal share, then hands the leftover seats to the domains with the
 * biggest fractional remainders.
 */
function blueprintQuotas(weights: Record<string, number>, count: number): Record<string, number> {
  const rows = Object.entries(weights).map(([d, w]) => {
    const exact = w * count
    const floor = Math.floor(exact)
    return { d, n: floor, frac: exact - floor }
  })
  let leftover = count - rows.reduce((s, r) => s + r.n, 0)
  rows.sort((a, b) => b.frac - a.frac)
  for (let i = 0; leftover > 0 && rows.length > 0; i = (i + 1) % rows.length, leftover--) {
    rows[i]!.n++
  }
  const out: Record<string, number> = {}
  for (const r of rows) out[r.d] = r.n
  return out
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
    .eq('archived', false)
  if (p.difficulties?.length) query = query.in('difficulty', p.difficulties)

  const { data, error } = await query
  if (error) throw new Error(`assemble query failed: ${error.message}`)
  const rows = (data ?? []) as Array<{ domain: string; difficulty: string; item: Question }>
  if (rows.length === 0) throw new Error(`no verified items for ${family}/${p.section}`)

  // Bucket by domain, shuffle within each.
  const byDomain = new Map<string, Question[]>()
  for (const r of rows) {
    const list = byDomain.get(r.domain) ?? []
    list.push(r.item)
    byDomain.set(r.domain, list)
  }
  for (const d of byDomain.keys()) byDomain.set(d, seededShuffle(byDomain.get(d)!, seed + d))

  // Draw per-domain quotas from the College Board blueprint so the test
  // mirrors the real exam's weighting. Fall back to whatever domains
  // exist (even share) if the section has no blueprint entry.
  const weights = BLUEPRINT[p.section] ?? Object.fromEntries(
    [...byDomain.keys()].map(d => [d, 1 / byDomain.size]),
  )
  const quota = blueprintQuotas(weights, p.count)

  const picked: Question[] = []
  const composition: Record<string, number> = {}
  // Primary pass: take each domain's blueprint quota.
  for (const [d, q] of Object.entries(quota)) {
    const list = byDomain.get(d) ?? []
    const take = Math.min(q, list.length)
    for (let i = 0; i < take; i++) { picked.push(list.shift()!); composition[d] = (composition[d] ?? 0) + 1 }
  }
  // Shortfall fill: if a domain couldn't meet its quota (thin bank),
  // backfill from remaining items — heaviest blueprint domains first —
  // so the target count is still met without over-drawing a light
  // domain. Include any non-blueprint domains last so nothing strands.
  const fillOrder = [
    ...Object.keys(weights).sort((a, b) => (weights[b] ?? 0) - (weights[a] ?? 0)),
    ...[...byDomain.keys()].filter(d => !(d in weights)),
  ]
  while (picked.length < p.count) {
    let progressed = false
    for (const d of fillOrder) {
      if (picked.length >= p.count) break
      const list = byDomain.get(d)
      if (list && list.length) {
        picked.push(list.shift()!); composition[d] = (composition[d] ?? 0) + 1; progressed = true
      }
    }
    if (!progressed) break
  }

  // Mix domain order so the section isn't clustered by domain.
  const mixed = seededShuffle(picked, seed + ':order')
  picked.length = 0
  picked.push(...mixed)

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
