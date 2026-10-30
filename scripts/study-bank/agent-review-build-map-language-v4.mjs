/**
 * agent-review-build-map-language-v4.mjs — packets and manifest for the MAP
 * Language v4 batch (grammar, writing, mechanics; copy of the v3 builder), on the unchanged agent-review
 * instrument (agent-review-core.mjs, COFOUNDER-BRIEF-v2, graders a/b/c).
 * Read-only on the DB. Same packet format and grader prompts as
 * agent-review-build.mjs; only the population and output paths differ.
 *
 *   node scripts/study-bank/agent-review-build-map-language-v4.mjs           # dry
 *   node scripts/study-bank/agent-review-build-map-language-v4.mjs --write
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { planPackets, dealPacket, GRADERS } from './agent-review-core.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '../..')
const OUT = 'scratchpad/agent-review/map-language-v4'
const MANIFEST = 'scratchpad/agent-review/MANIFEST-map-language-v4.json'
const BRIEF = 'scripts/study-bank/cofounder-grader/COFOUNDER-BRIEF-v2.md'
const COHORTS = ['map-language-v4-grammar', 'map-language-v4-writing', 'map-language-v4-mechanics']
const EXPECT = 80
const die = m => { console.error(`agent-review-build-map-language-v3: ${m}`); process.exit(2) }

async function db() {
  const { createClient } = await import('@supabase/supabase-js')
  const env = Object.fromEntries(readFileSync(join(ROOT, '.env.local'), 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
}

function prompts(dir) {
  const read = `${dir}/COFOUNDER-BRIEF-v2.md and ${dir}/packet.json`
  const rules = 'Read nothing else in the repo: no index.json, no batch files, no key files, no other grader output, no other packet. Claude only, no database. Write only your own output file.'
  const base = k => `You are an independent grader for a staged test-prep item batch. Work in /Users/andylee/Downloads/saas/classraum. Read ${read}. ${rules} Grade every item exactly as the brief instructs (verdict per item, defect_type and reason for any non-unique verdict, batch_patterns over the whole packet) and write ${dir}/grades-${k}.json in the brief's output format.`
  const adv = ' Assume each item has a defect: look hardest for a second defensible option, a distractor that is true of the source for the asked purpose, a key you can choose without reading the source, a false real-world claim or self-contradiction, and any pattern across items that picks the key.'
  const tail = ' Reply with the number of items graded, every non-unique item with its reason, and your batch_patterns.'
  return { a: base('a') + tail, b: base('b') + tail, c: base('c') + adv + tail }
}

async function main() {
  const write = process.argv.includes('--write')
  const client = await db()
  const rows = []
  for (const c of COHORTS) {
    const { data, error } = await client.from('study_item_bank').select('id,family,section,cohort,passage_group_id,item')
      .eq('cohort', c).eq('verified', false).or('archived.is.null,archived.eq.false').order('id')
    if (error) die(`${c}: ${error.message}`)
    if (data.length !== EXPECT) die(`${c}: read ${data.length} staged rows, expected ${EXPECT}`)
    rows.push(...data)
  }
  const packets = planPackets(rows)
  const briefSha = createHash('sha256').update(readFileSync(join(ROOT, BRIEF))).digest('hex')
  const manifest = { prereg: null, prereg_note: 'No v4 prereg exists yet; the gate rules to apply are those of MAP-LANGUAGE-V3.prereg.md (same instrument). Write and commit a v4 prereg before any grader runs.', instrument: 'scripts/study-bank/AGENT-REVIEW-SSAT-MAP.prereg.md (with Amendment A1)', brief: BRIEF, brief_sha256: briefSha, graders: GRADERS, packets: [] }
  for (const p of packets) {
    const dir = `${OUT}/${p.id}`
    const { items, index } = dealPacket(p)
    manifest.packets.push({ id: p.id, stratum: 'map-language', cohort: p.cohort, dir, items: items.length, groups: p.groups, outputs: GRADERS.map(k => `${dir}/grades-${k}.json`), prompts: prompts(dir) })
    if (write) {
      mkdirSync(join(ROOT, dir), { recursive: true })
      writeFileSync(join(ROOT, dir, 'packet.json'), JSON.stringify(items, null, 1) + '\n')
      writeFileSync(join(ROOT, dir, 'index.json'), JSON.stringify(index, null, 1) + '\n')
      copyFileSync(join(ROOT, BRIEF), join(ROOT, dir, 'COFOUNDER-BRIEF-v2.md'))
      writeFileSync(join(ROOT, dir, 'brief.json'), JSON.stringify({ brief_version: 'v2', brief_files: ['COFOUNDER-BRIEF-v2.md'], brief_sha256: { 'COFOUNDER-BRIEF-v2.md': briefSha } }, null, 1) + '\n')
    }
  }
  for (const p of manifest.packets) console.log(`${p.id}: ${p.items} items`)
  console.log(`packets ${manifest.packets.length}, items ${manifest.packets.reduce((s, p) => s + p.items, 0)}, grader spawns ${manifest.packets.length * GRADERS.length}`)
  if (write) {
    writeFileSync(join(ROOT, MANIFEST), JSON.stringify(manifest, null, 1) + '\n')
    console.log(`wrote ${MANIFEST}`)
  } else console.log('dry run; pass --write to write packets and the manifest')
}

main().catch(e => die(e.message))
