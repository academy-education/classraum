/**
 * agent-review-build.mjs — builds the SSAT/MAP agent-review packets and the
 * grader manifest (AGENT-REVIEW-SSAT-MAP.prereg.md). Read-only on the DB.
 *
 *   node scripts/study-bank/agent-review-build.mjs            # dry: print the plan
 *   node scripts/study-bank/agent-review-build.mjs --write    # write packets + MANIFEST.json
 *   node scripts/study-bank/agent-review-build.mjs --wave2 [--write]
 *        # wave 2 (AGENT-REVIEW-WAVE2.prereg.md): ISEE/ACT Reading, ACT English,
 *        # TOEFL; writes MANIFEST-wave2.json and never touches MANIFEST.json
 *   node scripts/study-bank/agent-review-build.mjs --wave2 --cohorts a,b --manifest MANIFEST-x.json [--write]
 *        # the wave-2 layout and prompts for ONLY the listed cohorts (each must be staged), written to the
 *        # named manifest; MANIFEST-wave2.json and every other packet dir are left alone (2026-10-31, ISEE d17-21)
 *
 * Population: every STAGED (verified=false, not archived) row of the strata
 * below. MAP Science is excluded — every staged MAP Science cohort already has a
 * with-source agent grade in science-release.json and waits only on its
 * blind-only run. Refuses if a page read comes back short of the exact count.
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { planPackets, dealPacket, GRADERS } from './agent-review-core.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '../..')
const OUT = 'scratchpad/agent-review'
const BRIEF = 'scripts/study-bank/cofounder-grader/COFOUNDER-BRIEF-v2.md'
const WAVES = {
  1: {
    prereg: 'scripts/study-bank/AGENT-REVIEW-SSAT-MAP.prereg.md', manifest: 'MANIFEST.json', skip: [],
    strata: [
      { family: 'ssat', section: 'reading' },
      { family: 'ssat', section: 'verbal' },
      { family: 'map', section: 'language' },
      { family: 'map', section: 'reading' },
    ],
  },
  // Order is the prereg's. Skipped cohorts have a co-founder run drawn under
  // their current method (act-english-v9, cr-v14) or are not a listed task.
  2: {
    prereg: 'scripts/study-bank/AGENT-REVIEW-WAVE2.prereg.md', manifest: 'MANIFEST-wave2.json',
    skip: ['act-english-v9', 'cr-v14', 'harvest-v1'],
    strata: [
      { family: 'isee', section: 'reading' },
      { family: 'act', section: 'reading' },
      { family: 'act', section: 'english' },
      { family: 'toefl', section: 'listening', tasks: ['academic_talk', 'choose_response', 'conversation'] },
      { family: 'toefl', section: 'reading', tasks: ['academic_passage'] },
    ],
  },
}
const WAVE = WAVES[process.argv.includes('--wave2') ? 2 : 1]
const die = m => { console.error(`agent-review-build: ${m}`); process.exit(2) }
const argv = k => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : null }
const ONLY = argv('--cohorts') ? argv('--cohorts').split(',').map(s => s.trim()).filter(Boolean) : null
if (ONLY) {
  const name = argv('--manifest')
  if (!name || !/^MANIFEST-[\w.-]+\.json$/.test(name) || name === WAVE.manifest || name === 'MANIFEST.json') die('--cohorts needs --manifest MANIFEST-<name>.json (not an existing wave manifest)')
  WAVE.manifest = name
}

async function db() {
  const { createClient } = await import('@supabase/supabase-js')
  const env = Object.fromEntries(readFileSync(join(ROOT, '.env.local'), 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
}

async function loadStratum(client, { family, section, tasks }) {
  const scope = q => {
    q = q.eq('family', family).eq('section', section).eq('verified', false).or('archived.is.null,archived.eq.false')
    if (tasks) q = q.in('task', tasks)
    for (const c of WAVE.skip) q = q.neq('cohort', c)
    if (ONLY) q = q.in('cohort', ONLY)
    return q
  }
  const { count, error: cErr } = await scope(client.from('study_item_bank').select('id', { count: 'exact', head: true }))
  if (cErr) die(`${family}/${section} count: ${cErr.message}`)
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await scope(client.from('study_item_bank').select('id,family,section,cohort,passage_group_id,item'))
      .order('id').range(from, from + 999)
    if (error) die(`${family}/${section} page ${from}: ${error.message}`)
    rows.push(...data)
    if (data.length < 1000) break
  }
  if (rows.length !== count) die(`${family}/${section}: read ${rows.length} rows but the exact count is ${count} — refusing a truncated population`)
  return rows
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
  for (const s of WAVE.strata) {
    const r = await loadStratum(client, s)
    console.log(`${s.family}/${s.section}: ${r.length} staged rows in ${new Set(r.map(x => x.cohort)).size} cohorts`)
    rows.push(...r)
  }
  if (ONLY) for (const c of ONLY) if (!rows.some(r => r.cohort === c)) die(`--cohorts: ${c} has no staged rows in these strata`)
  if (!rows.length) die('no rows')
  const rank = r => WAVE.strata.findIndex(s => s.family === r.family && s.section === r.section)
  const packets = planPackets(rows).sort((x, y) => rank(x.units[0].items[0]) - rank(y.units[0].items[0]))
  const briefSha = createHash('sha256').update(readFileSync(join(ROOT, BRIEF))).digest('hex')
  const manifest = { prereg: WAVE.prereg, brief: BRIEF, brief_sha256: briefSha, graders: GRADERS, packets: [] }
  for (const p of packets) {
    const stratum = `${p.units[0].items[0].family}-${p.units[0].items[0].section}`
    const dir = `${OUT}/${stratum}/${p.id}`
    const { items, index } = dealPacket(p)
    manifest.packets.push({ id: p.id, stratum, cohort: p.cohort, dir, items: items.length, groups: p.groups, outputs: GRADERS.map(k => `${dir}/grades-${k}.json`), prompts: prompts(dir) })
    if (write) {
      mkdirSync(join(ROOT, dir), { recursive: true })
      writeFileSync(join(ROOT, dir, 'packet.json'), JSON.stringify(items, null, 1) + '\n')
      writeFileSync(join(ROOT, dir, 'index.json'), JSON.stringify(index, null, 1) + '\n')
      copyFileSync(join(ROOT, BRIEF), join(ROOT, dir, 'COFOUNDER-BRIEF-v2.md'))
      writeFileSync(join(ROOT, dir, 'brief.json'), JSON.stringify({ brief_version: 'v2', brief_files: ['COFOUNDER-BRIEF-v2.md'], brief_sha256: { 'COFOUNDER-BRIEF-v2.md': briefSha } }, null, 1) + '\n')
    }
  }
  const by = {}
  for (const p of manifest.packets) { by[p.stratum] ??= { packets: 0, items: 0 }; by[p.stratum].packets++; by[p.stratum].items += p.items }
  console.log(JSON.stringify(by, null, 1))
  console.log(`packets ${manifest.packets.length}, items ${manifest.packets.reduce((s, p) => s + p.items, 0)}, grader spawns ${manifest.packets.length * GRADERS.length}`)
  if (write) {
    writeFileSync(join(ROOT, OUT, WAVE.manifest), JSON.stringify(manifest, null, 1) + '\n')
    console.log(`wrote ${OUT}/${WAVE.manifest}`)
  } else console.log(`dry run; pass --write to write packets and ${WAVE.manifest}`)
}

main().catch(e => die(e.message))
