#!/usr/bin/env node
/**
 * check-location-refs.mjs - does "the Nth paragraph / stanza" in a question point at the block that actually holds
 * the word it quotes?
 *
 *   node scripts/study-bank/check-location-refs.mjs            # every unarchived passage item (live + staged)
 *   node scripts/study-bank/check-location-refs.mjs --selftest
 *
 * Found 2026-10-22: a staged SSAT poem item asked about "lines" in the third stanza; the word is in the fourth. A
 * reader hunts the wrong stanza, and the co-founder's sitting archives the item (two flags archive the passage).
 *
 * Counting is the hard part, and the first scan got it wrong on 5 live ACT items:
 *   - ACT passages number paragraphs "[1] ..." and may sit under "Passage A" / "Passage B" headers, with a table
 *     block in between. When markers exist, they are the count; headers and unnumbered blocks are skipped.
 *   - "of Passage B" scopes the count to that passage.
 *   - a quote with an ellipsis (". . .") is matched on its first fragment.
 *   - "last" / "final" means the last counted block.
 * A reference that cannot be resolved (no quote, unknown structure) is skipped and COUNTED as skipped, so the
 * denominator is printed rather than implied. Read-only. Exits 1 on any mismatch.
 */
import { readFileSync, existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const ORD = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10, eleventh: 11, twelfth: 12, last: -1, final: -1 }
const norm = s => String(s).toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim()

/** Split a passage into the blocks a question would count, honouring [n] markers and Passage A/B headers. */
export function blocksOf(passage, which = null) {
  const raw = String(passage).replace(/^\s*Transcript:\s*/i, '').split(/\n\s*\n/).map(b => b.trim()).filter(Boolean)
  // passage scoping
  let scoped = raw
  const hdr = i => /^Passage [AB]\b/i.test(raw[i]) && raw[i].length < 40
  if (raw.some((_, i) => hdr(i))) {
    const parts = {}; let cur = null
    for (let i = 0; i < raw.length; i++) { if (hdr(i)) { cur = raw[i].match(/Passage ([AB])/i)[1].toUpperCase(); parts[cur] = []; continue } if (cur) parts[cur].push(raw[i]) }
    scoped = which ? (parts[which] ?? []) : raw.filter((_, i) => !hdr(i))
  }
  const numbered = scoped.filter(b => /^\[\d+\]/.test(b))
  return numbered.length >= 2 ? numbered : scoped
}

/** Returns { status: 'ok' | 'mismatch' | 'skip', ... } for one item. */
export function checkItem(item) {
  const p = String(item.prompt || '')
  const m = p.match(/\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|last|final) (paragraph|stanza)\b/i)
  if (!m) return { status: 'none' }
  const q = p.match(/["“]([^"”]{2,80})["”]/)
  if (!q) return { status: 'skip', why: 'no quoted word' }
  // the quote must be the one the location applies to: skip prompts that quote one place and name another
  // ("the narrator's closing claim ... differs from the grandmother's view in the seventh paragraph")
  const qPos = p.indexOf(q[0]), mPos = p.indexOf(m[0])
  if (/differs from|compared with|in contrast to/i.test(p) && qPos < mPos) return { status: 'skip', why: 'quote and location belong to different referents' }
  const which = (p.match(/\bof Passage ([AB])\b/i) || [])[1]?.toUpperCase() ?? null
  const blocks = blocksOf(item.passage, which)
  if (!blocks.length) return { status: 'skip', why: 'no blocks' }
  const n = ORD[m[1].toLowerCase()], idx = n === -1 ? blocks.length - 1 : n - 1
  const needle = norm(q[1].split(/\s*\.\s*\.\s*\./)[0])
  const where = blocks.map((b, i) => norm(b).includes(needle) ? i + 1 : null).filter(Boolean)
  if (blocks[idx] && norm(blocks[idx]).includes(needle)) return { status: 'ok' }
  return { status: 'mismatch', says: `${m[1]} ${m[2]}${which ? ' of Passage ' + which : ''}`, quote: q[1], actually: where, blocks: blocks.length }
}

function selftest() {
  const poem = 'One line here.\n\nTwo lines here.\n\nThree here.\n\nThe children cross in loose and wandering lines.'
  const act = 'Passage A\n\n[1] Alpha start.\n\n[2] Beta stays with me.\n\nPassage B\n\n[1] Gamma.\n\nTable | x | y\n\n[2] Delta.\n\n[3] Colleagues find this alarming.'
  const cases = [
    [{ prompt: 'As it is used in the fourth stanza, the word "wandering" most nearly means', passage: poem }, 'ok'],
    [{ prompt: 'As it is used in the third stanza, the word "wandering" most nearly means', passage: poem }, 'mismatch'],   // the defect that was found
    [{ prompt: 'In the final paragraph of Passage A, why does it "stays with" her?', passage: act }, 'ok'],
    [{ prompt: 'As it is used in the third paragraph of Passage B, the word "alarming" most nearly means', passage: act }, 'ok'],
    [{ prompt: 'As it is used in the second paragraph of Passage B, the word "alarming" most nearly means', passage: act }, 'mismatch'],
    [{ prompt: 'The main idea of the passage is', passage: poem }, 'none'],
  ]
  let fails = 0
  for (const [it, want] of cases) { const got = checkItem(it).status; if (got !== want) { fails++; console.error(`SELFTEST FAIL: wanted ${want}, got ${got}: ${it.prompt}`) } }
  console.log(`selftest: ${cases.length - fails}/${cases.length} correct`)
  return fails
}

const RUN_AS_CLI = process.argv[1] && process.argv[1].endsWith('check-location-refs.mjs')
if (RUN_AS_CLI) {
  if (selftest()) process.exit(2)
  if (!process.argv.includes('--selftest')) {
    if (!existsSync('.env.local')) { console.error('run from the repo root (.env.local not found)'); process.exit(2) }
    const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
    const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    const rows = []
    for (let f = 0; ; f += 1000) {
      const { data, error } = await db.from('study_item_bank').select('id,cohort,verified,item').eq('archived', false).not('item->>passage', 'is', null).order('id').range(f, f + 999)
      if (error) { console.error(error.message); process.exit(2) }
      rows.push(...data); if (data.length < 1000) break
    }
    const tally = { ok: 0, mismatch: 0, skip: 0, none: 0 }, bad = []
    for (const r of rows) { const res = checkItem(r.item); tally[res.status]++; if (res.status === 'mismatch') bad.push({ r, res }) }
    console.log(`passage items ${rows.length}; location references ${tally.ok + tally.mismatch + tally.skip} (checked ${tally.ok + tally.mismatch}, skipped ${tally.skip}); mismatches ${tally.mismatch}`)
    if (tally.ok + tally.mismatch === 0) { console.error('NOT MEASURED: no reference could be checked'); process.exit(2) }
    for (const { r, res } of bad) console.log(`  ${r.verified ? 'LIVE  ' : 'staged'} ${String(r.cohort).padEnd(24)} ${r.id.slice(0, 8)}  says ${res.says}; "${res.quote}" is in block ${res.actually.join(',') || 'none'} of ${res.blocks}`)
    process.exit(bad.length ? 1 : 0)
  }
}
