/**
 * READ-ONLY audit for near-duplicate questions inside a single passage group.
 *
 * The harvest deduped on `content_hash`, which is a hash of the EXACT item
 * text. Two questions that differ only by a trailing period, an "According to
 * the passage," prefix, or a reordered choice list hash differently, so both
 * survive. The student then sees the same question twice on one passage —
 * a visible quality failure — and the bank looks bigger than it is.
 *
 * This script measures that. It never writes.
 *
 * Usage:
 *   npx tsx scripts/audit-duplicate-prompts.ts
 *
 * Exit code 0 when no group holds two items with the same (normalised or
 * near-identical) prompt, 1 otherwise.
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

/**
 * PostgREST caps a response at 1000 rows. A plain .select() over
 * study_item_bank therefore returns a TRUNCATED bank with no error and no
 * warning — and every group whose members fall past the cut looks like it
 * has fewer questions than it does.
 *
 * That is not hypothetical: the first orphan export ran unpaginated against
 * 1307 rows, so 9 reading passages that already had 2-5 questions were
 * classified as single-question orphans and had siblings authored for them.
 * The bug is silent in both directions — it invents orphans AND hides them.
 */
async function selectAll<T>(build: () => { range: (a: number, b: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }> }): Promise<T[]> {
  const PAGE = 1000
  const rows: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build().range(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE) break
  }
  return rows
}

// ---------------------------------------------------------------------------
// normalisation
// ---------------------------------------------------------------------------

/**
 * Collapse the trivial differences the content_hash dedup was blind to:
 * case, punctuation, whitespace, the "[Academic — X]" task tag some prompts
 * carry, and the interchangeable stem prefixes ("According to the passage,"
 * / "Based on the passage," / "In the passage,"). What survives is the
 * question actually being asked.
 */
export function normalisePrompt(raw: string): string {
  let s = raw.toLowerCase()
  // "[Academic — Biology]" / "[academic - biology]" style leading tag
  s = s.replace(/\[[^\]]*\]/g, ' ')
  // punctuation -> space (keep letters, digits, and whitespace only)
  s = s.replace(/[^\p{L}\p{N}\s]/gu, ' ')
  s = s.replace(/\s+/g, ' ').trim()
  // interchangeable stem prefixes, possibly stacked
  for (;;) {
    const before = s
    s = s.replace(/^(according to|based on|as stated in|as described in|in|from) (the |this )?(passage|lecture|talk|conversation|reading|text|audio|announcement)\s*/u, '')
    if (s === before) break
  }
  return s.trim()
}

/** Levenshtein distance, capped work via the usual two-row DP. */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = new Array<number>(b.length + 1)
  let cur = new Array<number>(b.length + 1)
  for (let j = 0; j <= b.length; j++) prev[j] = j
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i
    const ca = a.charCodeAt(i - 1)
    for (let j = 1; j <= b.length; j++) {
      const cost = ca === b.charCodeAt(j - 1) ? 0 : 1
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
    }
    const t = prev; prev = cur; cur = t
  }
  return prev[b.length]
}

/** 1.0 == identical. Two prompts above NEAR_THRESHOLD are treated as the
 *  same question written twice. */
export function similarity(a: string, b: string): number {
  const max = Math.max(a.length, b.length)
  if (max === 0) return 1
  return 1 - levenshtein(a, b) / max
}

const NEAR_THRESHOLD = 0.9

// ---------------------------------------------------------------------------

type BankRow = {
  id: string
  family: string | null
  section: string | null
  item: unknown
}

type Item = {
  id: string
  section: string
  groupId: string
  prompt: string
  norm: string
  explanationLen: number
}

function field(item: unknown, key: string): unknown {
  if (item === null || typeof item !== 'object' || Array.isArray(item)) return undefined
  return (item as Record<string, unknown>)[key]
}

/** A set of items in one group whose prompts are the same question. */
export type Cluster = {
  section: string
  groupId: string
  groupSize: number
  members: Item[]
  /** true when every pair in the cluster normalises to the SAME string;
   *  false when it took the Levenshtein pass to catch them. */
  exact: boolean
}

/** Group items into duplicate clusters: exact normalised matches first, then
 *  union any two remaining prompts within similarity NEAR_THRESHOLD. */
export function clustersFor(section: string, groupId: string, items: Item[]): Cluster[] {
  const n = items.length
  const parent = items.map((_, i) => i)
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])))
  const union = (i: number, j: number) => { const a = find(i), b = find(j); if (a !== b) parent[a] = b }

  let anyNear = false
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (items[i].norm === items[j].norm) { union(i, j); continue }
      if (similarity(items[i].norm, items[j].norm) > NEAR_THRESHOLD) { union(i, j); anyNear = true }
    }
  }

  const byRoot = new Map<number, Item[]>()
  for (let i = 0; i < n; i++) {
    const r = find(i)
    byRoot.set(r, [...(byRoot.get(r) ?? []), items[i]])
  }
  return [...byRoot.values()]
    .filter(m => m.length > 1)
    .map(m => ({
      section,
      groupId,
      groupSize: n,
      members: m,
      exact: new Set(m.map(x => x.norm)).size === 1 && !anyNear,
    }))
}

export async function loadGroups(): Promise<Map<string, Item[]>> {
  const rows = await selectAll<BankRow>(() =>
    db.from('study_item_bank')
      .select('id, family, section, item')
      .eq('verified', true)
      .eq('archived', false)
      .order('id', { ascending: true }) as never,
  )

  const groups = new Map<string, Item[]>()
  for (const r of rows) {
    const gid = field(r.item, 'passageGroupId')
    const prompt = field(r.item, 'prompt')
    if (typeof gid !== 'string' || !gid) continue
    if (typeof prompt !== 'string' || !prompt) continue
    const expl = field(r.item, 'explanation')
    const key = `${r.section ?? '?'}|${gid}`
    groups.set(key, [...(groups.get(key) ?? []), {
      id: r.id,
      section: r.section ?? '?',
      groupId: gid,
      prompt,
      norm: normalisePrompt(prompt),
      explanationLen: typeof expl === 'string' ? expl.length : 0,
    }])
  }
  console.log(`rows scanned: ${rows.length}   grouped items: ${[...groups.values()].reduce((a, g) => a + g.length, 0)}   groups: ${groups.size}\n`)
  return groups
}

export function findClusters(groups: Map<string, Item[]>): Cluster[] {
  const out: Cluster[] = []
  for (const [key, items] of groups) {
    const [section, ...rest] = key.split('|')
    out.push(...clustersFor(section, rest.join('|'), items))
  }
  return out
}

async function main() {
  console.log('='.repeat(78))
  console.log('duplicate-prompt audit — study_item_bank (verified, not archived)')
  console.log('='.repeat(78))

  const groups = await loadGroups()
  const clusters = findClusters(groups)

  if (clusters.length === 0) {
    console.log('CLEAN — no passage group holds two items asking the same question.')
    process.exit(0)
  }

  // Report per affected group.
  const byGroup = new Map<string, Cluster[]>()
  for (const c of clusters) {
    const k = `${c.section}|${c.groupId}`
    byGroup.set(k, [...(byGroup.get(k) ?? []), c])
  }

  const bySection = new Map<string, { groups: number; redundant: number }>()
  let redundantTotal = 0

  const keys = [...byGroup.keys()].sort()
  for (const k of keys) {
    const cs = byGroup.get(k)!
    const section = cs[0].section
    const size = cs[0].groupSize
    const distinct = size - cs.reduce((a, c) => a + (c.members.length - 1), 0)
    const redundant = size - distinct
    redundantTotal += redundant
    const s = bySection.get(section) ?? { groups: 0, redundant: 0 }
    s.groups++; s.redundant += redundant
    bySection.set(section, s)

    console.log(`── ${section}  ${cs[0].groupId}`)
    console.log(`   items=${size}  distinct prompts=${distinct}  redundant=${redundant}`)
    for (const c of cs) {
      console.log(`   cluster (${c.members.length} items, ${c.exact ? 'exact after normalisation' : 'near-duplicate'}):`)
      for (const m of c.members) {
        console.log(`     ${m.id}  explLen=${m.explanationLen}`)
        console.log(`       "${m.prompt.replace(/\s+/g, ' ').trim()}"`)
      }
    }
    console.log()
  }

  console.log('='.repeat(78))
  for (const [section, s] of [...bySection.entries()].sort()) {
    console.log(`${section}: ${s.groups} affected group(s), ${s.redundant} redundant item(s)`)
  }
  console.log(`TOTAL: ${byGroup.size} affected group(s), ${redundantTotal} redundant item(s)`)
  console.log('='.repeat(78))
  process.exit(1)
}

if (process.argv[1] && resolve(process.argv[1]).endsWith('audit-duplicate-prompts.ts')) {
  main().catch(e => { console.error(e); process.exit(2) })
}
