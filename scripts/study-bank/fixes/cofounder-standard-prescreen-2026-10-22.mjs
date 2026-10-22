// Pre-sitting actions from the co-founder-standard grader pass over the queue (COFOUNDER-GRADER-2026-10-22.PREREG.md
// Amendment 1). 22 flags, each read by the author: 13 dropped (archived), 4 fixed (a distractor replaced), 5 left alone
// because they sit in the co-founder's open run (crv11-release1), where his verdicts will be compared with the grader's.
// Staged rows only; any row with a review is refused.  node scripts/study-bank/fixes/cofounder-standard-prescreen-2026-10-22.mjs [--apply]
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
const APPLY = process.argv.includes('--apply')
const refuse = m => { console.error('REFUSING: ' + m); process.exit(2) }
const DROP = {
  '31f5a4a1': 'analogy thrifty:stingy :: brave:reckless; distractor humble:meek also reads as a virtue carried to excess',
  '21f0b6d9': 'screen order: "Yes, go ahead and replace it." is also natural', '596292cc': 'discontinued brand: "Great, I\'ll pick them up right now." is also natural',
  '7df4ffeb': 'move-in form: "Great. When can I pick up the keys?" is also natural', 'e20d8b86': 'Saturday shift: "Sure, I could use the additional hours." is also natural',
  'fd94bca8': 'replacement bus: "Great, I\'ll go find my seat on it." is also natural', '15799db8': 'no reservation: "That\'s fine. We\'ll have a drink at the bar." is also natural',
  '2c851106': 'stain retry: "Okay, please go ahead anyway." is also natural', '817ec2cb': 'loaner car: "Great, I\'ll come for mine after work." is also natural',
  '8b68b798': 'vet total: "That\'s a relief. I\'ll get her carrier." is also natural', '8f4f27f3': 'permit: "Then we\'ll take the shorter loop." is also natural',
  '97249edc': 'student discount: "Great, one ticket for that, please." is also natural', 'fde9c45a': 'checked in: "Okay, I\'ll find somewhere to eat, then." is also natural',
}
const FIX = {
  '7e090feb': ['a young player who loses a close match because of an unlucky shot', 'a young player who loses a close match and decides to quit the club',
    '"a young player who loses a close match and decides to quit the club" contradicts the ending: Mr. Esposito asks "whether she would be there next Thursday," and she starts a list of what she could learn.'],
  'b454fd05': ['Cancel the booking for the ninth', 'Extend the room booking past closing time', 'Closing time is never mentioned; the librarian offers room six and a chair.'],
  '4c158ddf': ['capture', 'board', '"board" is the sense of catching a bus or a train; a bubble does not get on anything.'],
  '2ff9bda8': ['made room for', 'burst into', '"burst into" is the sense of giving way to tears or laughter; a city does not break into anything.'],
}
const norm = s => String(s ?? '').toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim()
const hashOf = it => createHash('md5').update([norm(it.passage), norm(it.prompt), (it.choices || []).map(norm).join('|')].join('~~')).digest('hex')
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const ids = JSON.parse(readFileSync(process.argv.find(a => a.endsWith('.json')) ?? refuse('pass the flag id list json'), 'utf8'))
const want = id => Object.keys({ ...DROP, ...FIX }).find(p => id.startsWith(p))
const targets = ids.filter(want)
if (targets.length !== 17) refuse(`expected 17 targets, got ${targets.length}`)
const { data: rows } = await db.from('study_item_bank').select('id,cohort,verified,archived,item,verify_meta').in('id', targets)
if (rows.length !== 17 || rows.some(r => r.verified || r.archived)) refuse('every target must be a staged row')
const { data: rv } = await db.from('study_item_reviews').select('item_id').in('item_id', targets)
if (rv.length) refuse(`${rv.length} target(s) have a review`)
const batchFiles = {}, plan = []
for (const r of rows) {
  const p = want(r.id)
  if (DROP[p]) { plan.push({ r, act: 'drop', why: DROP[p] }); continue }
  const [oldC, newC, reason] = FIX[p]
  if (!r.item.choices.includes(oldC) || r.item.correct_answer === oldC) refuse(`${p}: choice to replace not found or is the key`)
  const item = structuredClone(r.item)
  item.choices = item.choices.map(c => (c === oldC ? newC : c))
  if (Array.isArray(item.distractor_rationales)) item.distractor_rationales = item.distractor_rationales.map(d => (d.choice === oldC ? { choice: newC, reason } : d))
  else if (item.distractor_rationales && typeof item.distractor_rationales === 'object') { delete item.distractor_rationales[oldC]; item.distractor_rationales[newC] = reason }
  plan.push({ r, act: 'fix', item, oldC, newC })
}
for (const p of plan) console.log(`${p.act.padEnd(4)} ${p.r.cohort.padEnd(22)} ${p.r.id.slice(0, 8)}  ${p.act === 'fix' ? `"${p.oldC}" -> "${p.newC}"` : p.why}`)
if (!APPLY) { console.log('DRY RUN ok'); process.exit(0) }
for (const p of plan) {
  if (p.act === 'drop') {
    const { error } = await db.from('study_item_bank').update({ archived: true, verify_meta: { ...p.r.verify_meta, archived_at: '2026-10-22', archive_basis: `co-founder-standard grader flag, author agreed (pre-sitting): ${p.why}` } }).eq('id', p.r.id).eq('verified', false)
    if (error) refuse(error.message)
  } else {
    const meta = { ...p.r.verify_meta, author_fix: { at: '2026-10-22', what: 'co-founder-standard grader flag: distractor replaced before any sitting', before: p.oldC } }
    const { error } = await db.from('study_item_bank').update({ item: p.item, content_hash: hashOf(p.item), verify_meta: meta }).eq('id', p.r.id).eq('verified', false)
    if (error) refuse(error.message)
    const bf = `scripts/study-bank/${p.r.cohort}.batch.json`
    try {
      const b = batchFiles[bf] ??= JSON.parse(readFileSync(bf, 'utf8'))
      const list = b.rows ?? b.items ?? b
      const br = list.find(x => (x.item ?? x).prompt === p.r.item.prompt && JSON.stringify((x.item ?? x).choices) === JSON.stringify(p.r.item.choices))
      if (br) { if (br.item) { br.item = p.item; br.content_hash = hashOf(p.item) } else Object.assign(br, { choices: p.item.choices, distractor_rationales: p.item.distractor_rationales }) }
      else console.log(`  (batch row not found in ${bf}; DB updated)`)
    } catch { console.log(`  (no batch file ${bf}; DB updated)`) }
  }
}
for (const [f, b] of Object.entries(batchFiles)) writeFileSync(f, JSON.stringify(b, null, 1) + '\n')
console.log(`applied: ${plan.filter(p => p.act === 'drop').length} dropped, ${plan.filter(p => p.act === 'fix').length} fixed; batch files touched: ${Object.keys(batchFiles).join(', ') || 'none'}`)
