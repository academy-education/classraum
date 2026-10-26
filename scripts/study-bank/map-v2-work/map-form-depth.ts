/**
 * map-form-depth.ts — how many COMPLETE, CLEAN MAP tests does each subject hold? READ ONLY.
 *
 *   npx tsx scripts/study-bank/map-v2-work/map-form-depth.ts                 # live rows only (verified=true)
 *   npx tsx scripts/study-bank/map-v2-work/map-form-depth.ts --staged        # also count staged rows as if released
 *   npx tsx scripts/study-bank/map-v2-work/map-form-depth.ts --staged --add '{"lit":19,"info":19,"vocab":53,"wri":65,"gram":65,"mech":28,"oa":25,"num":38,"geo":30,"stat":39,"life":65,"phys":65,"earth":65}'
 *
 * Why it exists: admission-form-depth.ts replays SSAT and ISEE only, with drawByPassage, and never calls the MAP
 * per-area draw; depth-snapshot.json has no MAP entry, so runout-monitor cannot see MAP at all.
 *
 * What it does: replays a student's first 7 forms per subject with the REAL drawByPassage, ITEMS_PER_PASSAGE and
 * MAP_AREA_QUOTAS (admission-tests.ts) and a copy of drawMapAreas (assemble.ts imports the DB client, so it is
 * copied here; if the assembler's MAP draw changes, change this copy deliberately). Unseen-first ranking with a
 * seeded order, three seeds, min reported. A form is CLEAN only if every area filled its full quota from unseen
 * items and the block is full: a backfilled or short area is not a complete MAP test.
 * --add appends synthetic rows: lit/info in 3-item passages, everything else one item per group.
 * Break-test (2026-10-24): the plan's projection gives 5/5/5; removing ONE item or passage from any area gives 4.
 * Science (2026-10-27): --add '{"life":65,"phys":65,"earth":65}' gives 5/5/5; 64 in any one area gives 4/4/4.
 * Exits 2 on a failed or truncated read.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { drawByPassage, ITEMS_PER_PASSAGE, MAP_AREA_QUOTAS, ADMISSION_BLUEPRINT } from '../../../src/lib/study/admission-tests'

type Row = { id: string; domain: string | null; passageGroupId: string | null }
type Sec = 'reading' | 'language' | 'math' | 'science'
function drawMapAreas(ranked: Row[], section: Sec, n: number, isFresh: (r: Row) => boolean) {
  const taken = new Set<string>(); const out: Row[] = []; const short: string[] = []
  for (const { area, count, passages } of MAP_AREA_QUOTAS[section]) {
    const pool = ranked.filter(r => r.domain === area)
    const got = passages ? drawByPassage(pool, count, ITEMS_PER_PASSAGE.map, isFresh) : drawByPassage(pool, count, 1, isFresh)
    const fr = got.filter(isFresh).length
    if (got.length < count || fr < count) short.push(`${area.slice(0, 18)} ${fr}/${count}`)
    for (const r of got) { out.push(r); taken.add(r.id) }
  }
  if (out.length < n) { const rest = ranked.filter(r => !taken.has(r.id)); out.push(...drawByPassage(rest, n - out.length, section === 'reading' ? ITEMS_PER_PASSAGE.map : 1, isFresh)) }
  return { picked: out.slice(0, n), short }
}
const h = (s: string) => { let x = 2166136261; for (const c of s) { x ^= c.charCodeAt(0); x = Math.imul(x, 16777619) >>> 0 } return x }
function replay(rows: Row[], section: Sec, forms: number, seed: string) {
  const n = ADMISSION_BLUEPRINT.map.find(b => b.key === section)!.questions
  const seen = new Map<string, number>(); const res: string[] = []; let clean = -1
  for (let f = 1; f <= forms; f++) {
    const unseen = rows.filter(r => !seen.has(r.id)).sort((a, b) => h(seed + f + a.id) - h(seed + f + b.id))
    const old = rows.filter(r => seen.has(r.id)).sort((a, b) => seen.get(a.id)! - seen.get(b.id)!)
    const fresh = (r: Row) => !seen.has(r.id)
    const { picked, short } = drawMapAreas([...unseen, ...old], section, n, fresh)
    const fr = picked.filter(fresh).length
    if (!(fr === n && picked.length === n && !short.length) && clean < 0) clean = f - 1
    res.push(`f${f} ${fr}/${picked.length}${short.length ? ' SHORT[' + short.join('; ') + ']' : ''}`)
    for (const r of picked) seen.set(r.id, f)
  }
  return { clean: clean < 0 ? forms : clean, res }
}
async function main() {
  const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const staged = process.argv.includes('--staged')
  const ai = process.argv.indexOf('--add'); const add = ai >= 0 ? JSON.parse(process.argv[ai + 1]) : {}
  let base = db.from('study_item_bank').select('id', { count: 'exact', head: true }).eq('family', 'map').eq('archived', false)
  if (!staged) base = base.eq('verified', true)
  const { count, error: ce } = await base; if (ce) { console.error(ce.message); process.exit(2) }
  const rows: Array<Row & { section: string }> = []
  for (let f = 0; ; f += 1000) {
    let q = db.from('study_item_bank').select('id,section,domain,passage_group_id').eq('family', 'map').eq('archived', false)
    if (!staged) q = q.eq('verified', true)
    const { data, error } = await q.order('id').range(f, f + 999)
    if (error) { console.error(error.message); process.exit(2) }
    rows.push(...data.map(r => ({ id: r.id, section: r.section, domain: r.domain, passageGroupId: r.passage_group_id })))
    if (data.length < 1000) break
  }
  if (rows.length !== count) { console.error(`REFUSING: read ${rows.length}, server count ${count}`); process.exit(2) }
  let k = 0
  const A = (section: string, domain: string, g: string | null) => rows.push({ id: `synthetic-${k++}`, section, domain, passageGroupId: g })
  for (let p = 0; p < (add.lit ?? 0); p++) for (let i = 0; i < 3; i++) A('reading', 'Literary Text', `syn-lit-${p}`)
  for (let p = 0; p < (add.info ?? 0); p++) for (let i = 0; i < 3; i++) A('reading', 'Informational Text', `syn-info-${p}`)
  const one: Record<string, [string, string]> = { vocab: ['reading', 'Vocabulary'], wri: ['language', 'Writing: Write, Revise Texts for Purpose and Audience'], gram: ['language', 'Language: Understand, Edit for Grammar, Usage'], mech: ['language', 'Language: Understand, Edit for Mechanics'], oa: ['math', 'Operations and Algebraic Thinking'], num: ['math', 'Real and Complex Number Systems'], geo: ['math', 'Geometry'], stat: ['math', 'Statistics and Probability'], life: ['science', 'Life Science'], phys: ['science', 'Physical Science'], earth: ['science', 'Earth and Space Science'] }
  for (const [key, [sec, dom]] of Object.entries(one)) for (let i = 0; i < (add[key] ?? 0); i++) A(sec, dom, null)
  console.log(`MAP rows read: ${count} (${staged ? 'live + staged' : 'live only'})${k ? `, plus ${k} synthetic` : ''}`)
  for (const sec of ['reading', 'language', 'math', 'science'] as Sec[]) {
    const rs = rows.filter(r => r.section === sec)
    const by: Record<string, number> = {}; for (const r of rs) by[r.domain ?? '?'] = (by[r.domain ?? '?'] || 0) + 1
    const runs = ['a', 'b', 'c'].map(s => replay(rs, sec, 7, s))
    console.log(`\n${sec}: ${rs.length} items ${JSON.stringify(by)}`)
    console.log(`  complete clean forms (3 seeds): ${runs.map(r => r.clean).join(' / ')}  => ${Math.min(...runs.map(r => r.clean))}`)
    console.log(`  seed a: ${runs[0].res.join(' | ')}`)
  }
}
main().catch(e => { console.error(e); process.exit(2) })
