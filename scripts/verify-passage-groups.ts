/**
 * READ-ONLY verification of passage-group integrity in study_item_bank,
 * plus a simulation of what a student is actually served for a TOEFL
 * Reading adaptive test.
 *
 * Usage:
 *   npx tsx scripts/verify-passage-groups.ts
 *
 * Guarantees:
 *   - Never writes. Only SELECTs against study_item_bank, and the
 *     assembly simulation is run WITHOUT a studentId, which is the code
 *     path in assembleToeflFromBank that skips recordExposures().
 *   - Never calls an HTTP endpoint, so it consumes no credits and no money.
 *
 * Exit code is 0 when every passageGroupId maps to exactly one passage
 * text in the simulated student test, 1 otherwise.
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(2)
}
const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** Stable short fingerprint of a passage text, so we can count DISTINCT
 *  texts without holding megabytes of prose or printing it. */
function fingerprint(s: string): string {
  let h1 = 0x811c9dc5, h2 = 0x01000193
  for (let i = 0; i < s.length; i++) {
    h1 = Math.imul(h1 ^ s.charCodeAt(i), 16777619) >>> 0
    h2 = Math.imul(h2 + s.charCodeAt(i), 2654435761) >>> 0
  }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0')
}

/** Normalise a passage before fingerprinting: whitespace only. Anything
 *  more aggressive would hide real differences. */
function normPassage(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.replace(/\s+/g, ' ').trim()
  return t.length ? t : null
}

function pct(n: number, d: number): string {
  return d === 0 ? 'n/a' : `${((100 * n) / d).toFixed(1)}%`
}

function histogram(sizes: number[]): string {
  const buckets: Array<[string, (n: number) => boolean]> = [
    ['1', n => n === 1],
    ['2-5', n => n >= 2 && n <= 5],
    ['6-10', n => n >= 6 && n <= 10],
    ['11-20', n => n >= 11 && n <= 20],
    ['21-50', n => n >= 21 && n <= 50],
    ['51+', n => n >= 51],
  ]
  return buckets
    .map(([label, f]) => `${label}:${sizes.filter(f).length}`)
    .join('  ')
}

type BankRow = {
  id: string
  family: string | null
  section: string | null
  item_type: string | null
  item: unknown
}

async function fetchBank(): Promise<BankRow[]> {
  const out: BankRow[] = []
  const page = 1000
  for (let from = 0; ; from += page) {
    const { data, error } = await db
      .from('study_item_bank')
      .select('id, family, section, item_type, item')
      .eq('verified', true)
      .eq('archived', false)
      .order('id', { ascending: true })
      .range(from, from + page - 1)
    if (error) throw new Error(`bank query failed: ${error.message}`)
    const rows = (data ?? []) as BankRow[]
    out.push(...rows)
    if (rows.length < page) break
  }
  return out
}

function itemField(item: unknown, key: string): unknown {
  if (item === null || typeof item !== 'object' || Array.isArray(item)) return undefined
  return (Object.entries(item).find(([k]) => k === key) ?? [])[1]
}

// ---------------------------------------------------------------------------
// Part 1 — bank-wide passage-group integrity
// ---------------------------------------------------------------------------

type GroupStat = {
  groupId: string
  items: number
  passages: Set<string>
  nullPassages: number
  itemTypes: Set<string>
}

async function auditBank(): Promise<void> {
  console.log('='.repeat(78))
  console.log('PART 1 — live study_item_bank passage-group audit (verified, not archived)')
  console.log('='.repeat(78))

  const rows = await fetchBank()
  console.log(`rows scanned: ${rows.length}\n`)

  // key = family|section  ->  groupId -> GroupStat
  const bySection = new Map<string, Map<string, GroupStat>>()
  const ungrouped = new Map<string, number>()

  for (const r of rows) {
    const secKey = `${r.family ?? '?'}|${r.section ?? '?'}`
    const gid = itemField(r.item, 'passageGroupId')
    if (typeof gid !== 'string' || !gid) {
      ungrouped.set(secKey, (ungrouped.get(secKey) ?? 0) + 1)
      continue
    }
    const groups = bySection.get(secKey) ?? new Map<string, GroupStat>()
    bySection.set(secKey, groups)
    const g = groups.get(gid) ?? {
      groupId: gid, items: 0, passages: new Set<string>(), nullPassages: 0, itemTypes: new Set<string>(),
    }
    g.items++
    if (r.item_type) g.itemTypes.add(r.item_type)
    const p = normPassage(itemField(r.item, 'passage'))
    if (p === null) g.nullPassages++
    else g.passages.add(fingerprint(p))
    groups.set(gid, g)
  }

  const worst: Array<GroupStat & { section: string }> = []

  const keys = [...new Set([...bySection.keys(), ...ungrouped.keys()])].sort()
  for (const secKey of keys) {
    const groups = bySection.get(secKey) ?? new Map<string, GroupStat>()
    const all = [...groups.values()]
    const broken = all.filter(g => g.passages.size > 1)
    const sizes = all.map(g => g.items)
    const avg = sizes.length ? sizes.reduce((a, b) => a + b, 0) / sizes.length : 0
    console.log(`── ${secKey}`)
    console.log(`   grouped items ${sizes.reduce((a, b) => a + b, 0)}   ungrouped items ${ungrouped.get(secKey) ?? 0}`)
    console.log(`   groups ${all.length}   spanning >1 passage: ${broken.length} (${pct(broken.length, all.length)})`)
    console.log(`   group size: avg ${avg.toFixed(1)}  max ${sizes.length ? Math.max(...sizes) : 0}  dist ${histogram(sizes)}`)
    for (const g of broken) worst.push({ ...g, section: secKey })
    console.log()
  }

  worst.sort((a, b) => b.passages.size - a.passages.size || b.items - a.items)
  console.log('── worst offending groups (by distinct passage texts)')
  if (worst.length === 0) {
    console.log('   NONE — every passageGroupId maps to exactly one passage text.')
  } else {
    console.log(`   ${worst.length} broken groups total; top 15:`)
    for (const g of worst.slice(0, 15)) {
      console.log(
        `   ${g.section}  ${g.groupId}  items=${g.items}  distinctPassages=${g.passages.size}` +
        `  nullPassage=${g.nullPassages}  types=[${[...g.itemTypes].join(',')}]`,
      )
    }
  }
  console.log()
}

// ---------------------------------------------------------------------------
// Part 2 — simulate the student-facing TOEFL Reading adaptive test
// ---------------------------------------------------------------------------

async function simulate(): Promise<boolean> {
  console.log('='.repeat(78))
  console.log('PART 2 — simulated student TOEFL Reading adaptive test (no studentId => no writes)')
  console.log('='.repeat(78))

  let assembleToeflFromBank: typeof import('../src/lib/study/assemble')['assembleToeflFromBank']
  try {
    ;({ assembleToeflFromBank } = await import('../src/lib/study/assemble'))
  } catch (e) {
    console.error('COULD NOT IMPORT assembleToeflFromBank standalone:', e)
    return false
  }

  let allClean = true

  for (const module of [1, 2] as const) {
    // NO studentId: assembleToeflFromBank only writes (recordExposures)
    // when p.studentId is set, so this run is strictly read-only. The
    // consequence is that module 2 draws from the same unseen-first
    // ordering as module 1 (no exposure ledger to push module 1 items
    // back) — irrelevant for passage-consistency, which is what we
    // measure here.
    const t = await assembleToeflFromBank({
      section: 'reading',
      module,
      ...(module === 2 ? { difficulties: ['easy', 'medium'] as Array<'easy' | 'medium' | 'hard'> } : {}),
    })

    const typeMix: Record<string, number> = {}
    for (const q of t.questions) typeMix[q.type] = (typeMix[q.type] ?? 0) + 1

    console.log(`\n── module ${module}`)
    console.log(`   title: ${t.title}   timeLimit: ${t.timeLimitMinutes}m`)
    console.log(`   total items: ${t.questions.length}`)
    console.log(`   type mix: ${JSON.stringify(typeMix)}`)
    console.log(`   composition: ${JSON.stringify(t.composition)}`)
    console.log(`   moduleBreakIdx: ${t.moduleBreakIdx ?? '(none)'}`)

    // THE KEY CHECK: per passageGroupId present in the served test,
    // how many distinct passage texts does the student actually see?
    const groups = new Map<string, { n: number; passages: Set<string>; nulls: number; firstIdx: number }>()
    t.questions.forEach((q, i) => {
      const gid = typeof q.passageGroupId === 'string' && q.passageGroupId ? q.passageGroupId : `__solo:${i}`
      const g = groups.get(gid) ?? { n: 0, passages: new Set<string>(), nulls: 0, firstIdx: i }
      g.n++
      const p = normPassage(q.passage)
      if (p === null) g.nulls++
      else g.passages.add(fingerprint(p))
      groups.set(gid, g)
    })

    const entries = [...groups.entries()].sort((a, b) => a[1].firstIdx - b[1].firstIdx)
    const bad = entries.filter(([, g]) => g.passages.size > 1)
    console.log(`   passage groups present: ${entries.length}`)
    console.log(`   groups with >1 distinct passage text: ${bad.length}  <-- MUST BE 0`)
    for (const [gid, g] of entries) {
      const flag = g.passages.size > 1 ? '  *** BROKEN ***' : ''
      console.log(`     [${String(g.firstIdx).padStart(2)}] ${gid}  items=${g.n}  distinctPassages=${g.passages.size}  nullPassage=${g.nulls}${flag}`)
    }

    // Contiguity: a group's items must also be adjacent, or the "question
    // X of N in this passage" counter walks across other passages.
    let noncontiguous = 0
    const seenClosed = new Set<string>()
    let prev: string | null = null
    t.questions.forEach((q, i) => {
      const gid = typeof q.passageGroupId === 'string' && q.passageGroupId ? q.passageGroupId : `__solo:${i}`
      if (gid !== prev) {
        if (seenClosed.has(gid)) noncontiguous++
        if (prev !== null) seenClosed.add(prev)
        prev = gid
      }
    })
    console.log(`   non-contiguous group re-entries: ${noncontiguous}  <-- MUST BE 0`)

    if (bad.length > 0 || noncontiguous > 0) allClean = false

    // ── What the STUDENT actually reads on screen ────────────────────
    // The counter is produced by passageGroupInfo() in the test UI.
    // Import the real function and check that every claim it makes
    // ("Question Y of Z in this passage") describes questions that
    // genuinely share one passage text.
    let passageGroupInfo:
      | typeof import('../src/app/mobile/study/session/[id]/test/helpers')['passageGroupInfo']
      | null = null
    try {
      ;({ passageGroupInfo } = await import('../src/app/mobile/study/session/[id]/test/helpers'))
    } catch (e) {
      console.log(`   (could not import passageGroupInfo for the on-screen check: ${String(e)})`)
    }
    if (passageGroupInfo) {
      let claims = 0, lies = 0, suppressed = 0
      const claimSizes: number[] = []
      t.questions.forEach((_q, i) => {
        // Some builds of the helper take moduleBreakIdx, some don't;
        // extra args are harmless either way.
        const info = (passageGroupInfo as (
          qs: typeof t.questions, idx: number, mb?: number,
        ) => { groupIndex: number; totalGroups: number; indexInGroup: number; totalInGroup: number } | null)(
          t.questions, i, t.moduleBreakIdx,
        )
        if (!info) { suppressed++; return }
        claims++
        claimSizes.push(info.totalInGroup)
        const start = i - (info.indexInGroup - 1)
        const end = start + info.totalInGroup - 1
        const texts = new Set<string>()
        for (let j = start; j <= end; j++) {
          const p = normPassage(t.questions[j]?.passage)
          texts.add(p === null ? '__null__' : fingerprint(p))
        }
        if (texts.size > 1) {
          lies++
          console.log(`     LIE at q${i}: UI says "question ${info.indexInGroup} of ${info.totalInGroup} in this passage"` +
            ` but items ${start}..${end} hold ${texts.size} distinct passage texts`)
        }
      })
      const avgClaim = claimSizes.length ? (claimSizes.reduce((a, b) => a + b, 0) / claimSizes.length).toFixed(1) : 'n/a'
      console.log(`   on-screen counter: shown on ${claims}/${t.questions.length} questions (avg set size ${avgClaim}), suppressed on ${suppressed}`)
      console.log(`   counter claims contradicted by the passage on screen: ${lies}  <-- MUST BE 0`)
      if (lies > 0) allClean = false
    }
  }

  return allClean
}

async function main() {
  await auditBank()
  const clean = await simulate()
  console.log('\n' + '='.repeat(78))
  console.log(clean
    ? 'VERDICT: every passage group in the simulated student test maps to ONE passage text.'
    : 'VERDICT: BUG STILL PRESENT — a student would see the passage change mid-group.')
  console.log('='.repeat(78))
  process.exit(clean ? 0 : 1)
}

main().catch(e => { console.error(e); process.exit(2) })
