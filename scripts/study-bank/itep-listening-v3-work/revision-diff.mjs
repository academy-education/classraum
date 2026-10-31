#!/usr/bin/env node
// revision-diff.mjs — ITEP-SLATE-LISTENING-V3.prereg.md §1 item 4 (pending lesson 9 + owner): the revision round may
// change NO key. Compares each revised author file against its pre-revision copy and prints every changed field.
//   node scripts/study-bank/itep-listening-v3-work/revision-diff.mjs [--before-dir probe] [--after-dir items] [--authors ABCDEFGH]
// Files: <before-dir>/<X>.r1.json vs <after-dir>/<X>.json (dirs relative to itep-listening-v3-work).
// Exit 2: a file missing/unreadable, or sets/qids differ between the two copies (never a verdict over a mismatch).
// Exit 1: any key changed (correct_answer text differs, or the key's string is not byte-identical in choices), or a
//         transcript changed (a transcript edit can change what the unchanged key means). Lists those sets as DROP.
// Exit 0: no key and no transcript changed; every other changed field is listed for the coordinator to read.
import { readFileSync, existsSync } from 'node:fs'
const argv = process.argv.slice(2)
const flag = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d }
const W = 'scripts/study-bank/itep-listening-v3-work'
const BEFORE = `${W}/${flag('--before-dir', 'probe')}`, AFTER = `${W}/${flag('--after-dir', 'items')}`
const XS = flag('--authors', 'ABCDEFGH')
const die = m => { console.error(`revision-diff: ${m}`); process.exit(2) }
const read = p => { if (!existsSync(p)) die(`missing ${p}`); try { return JSON.parse(readFileSync(p, 'utf8')) } catch (e) { die(`${p}: ${e.message}`) } }
const drop = new Set(); let changed = 0, items = 0
for (const x of XS) {
  const b = read(`${BEFORE}/${x}.r1.json`), a = read(`${AFTER}/${x}.json`)
  const bs = b.sets || [], as = a.sets || []
  if (bs.map(s => s.set_id).join() !== as.map(s => s.set_id).join()) die(`${x}: set ids differ`)
  bs.forEach((sb, si) => {
    const sa = as[si]
    if (sb.transcript !== sa.transcript) { drop.add(sb.set_id); console.log(`${sb.set_id}: TRANSCRIPT CHANGED`) }
    if ((sb.items || []).map(i => i.qid).join() !== (sa.items || []).map(i => i.qid).join()) die(`${sb.set_id}: qids differ`)
    sb.items.forEach((ib, ii) => {
      const ia = sa.items[ii]; items++
      const keyOk = ib.correct_answer === ia.correct_answer && ia.choices.includes(ib.correct_answer)
      if (!keyOk) { drop.add(sb.set_id); console.log(`${ib.qid}: KEY CHANGED\n    before: ${ib.correct_answer}\n    after:  ${ia.correct_answer}`) }
      for (const f of new Set([...Object.keys(ib), ...Object.keys(ia)])) {
        if (f === 'correct_answer') continue
        if (JSON.stringify(ib[f]) === JSON.stringify(ia[f])) continue
        changed++
        if (f === 'choices') {
          const gone = ib.choices.filter(c => !ia.choices.includes(c)), added = ia.choices.filter(c => !ib.choices.includes(c))
          console.log(`${ib.qid}: choices  - ${JSON.stringify(gone)}  + ${JSON.stringify(added)}`)
        } else console.log(`${ib.qid}: ${f}${['prompt', 'why', 'why2'].includes(f) ? `\n    before: ${ib[f]}\n    after:  ${ia[f]}` : ''}`)
      }
    })
  })
}
console.log(`read ${items} items in ${XS.length} file pairs; ${changed} non-key field change(s); key/transcript changes in ${drop.size} set(s)${drop.size ? ': DROP ' + [...drop].join(' ') : ''}`)
process.exit(drop.size ? 1 : 0)
