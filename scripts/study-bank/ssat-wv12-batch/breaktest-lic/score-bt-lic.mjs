import { readFileSync } from 'node:fs'
import { licSupportProblems } from '/Users/andylee/Downloads/saas/classraum/scripts/study-bank/ssat-wv12-rules.mjs'
import { norm } from '/Users/andylee/Downloads/saas/classraum/scripts/study-bank/ssat-wv.mjs'
const B='/Users/andylee/Downloads/saas/classraum/scratchpad/ssat-wv12-work/breaktest-lic'
const key=JSON.parse(readFileSync('/Users/andylee/Downloads/saas/classraum/scripts/study-bank/ssat-wv9-batch/preflight/lic-round1/lic-key.json','utf8'))
for (const k of [1,2]) { const R=JSON.parse(readFileSync(`${B}/v${k}a/lic-v${k}.json`,'utf8')); const txt=Object.fromEntries(R.map(p=>[p.passage_id,p.passage]))
  for (const t of ['a','b']) { const L=JSON.parse(readFileSync(`${B}/v${k}${t}/lic-v${k}.${t}.json`,'utf8')).labels
    for (const [qid,v] of Object.entries(L)) { const [pid,qn]=qid.split('.'); const lid=`${pid}.v${k}.${qn}`, ke=key[lid]; const T=txt[pid]
      const probs=[]; if (v.pick!==ke.keyLetter) probs.push(`pick ${v.pick}=${ke.choices[ke.order['ABCDE'.indexOf(v.pick)]]} not key ${ke.keyLetter}=${ke.choices[k]}`)
      if (v.second_defensible && v.second_defensible!=='none' && v.second_defensible!==v.pick) probs.push(`second ${ke.choices[ke.order['ABCDE'.indexOf(v.second_defensible)]]}`)
      for (const x of 'ABCDE') { if (x===ke.keyLetter) continue; const q=v.exclusions?.[x]; if (!q||String(q).trim().split(/\s+/).length<3||!norm(T).includes(norm(q))) probs.push(`no excl ${x}`) }
      if (ke.kind==='attitude') licSupportProblems(v,T).forEach(x=>probs.push('R5 '+x))
      console.log(`v${k} judge ${t} ${lid} (${ke.kind}, key ${ke.choices[k]}): ${probs.length?'FIRES: '+probs.join('; '):'clean'}`) } } }
