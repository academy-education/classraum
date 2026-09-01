#!/usr/bin/env node
/**
 * A18 — repair the two latent reading-worlds-s5 defects.
 *
 * Both were found by the RW5 blind attack and both are LATENT on the
 * form as shipped, which is exactly why they were easy to leave.
 *
 * 1. 4c5cef70 (I07-3). Its options name three things in common nouns
 *    and one by a proper noun — "losing the Rochefort sheets" beside
 *    "the measuring wheels", "the kite and camera", "the herring
 *    fleet's soundings". On the shipped variant that option is a
 *    DISTRACTOR, so the register slip points AWAY from the key and
 *    nothing leaks. But under symmetric worlds the shown variant is
 *    chosen by seeded RNG AFTER text freeze, so the French-survey
 *    variant will be drawn eventually, and on that draw the only
 *    proper-noun option IS the key. A time bomb, not a curiosity.
 *    Fix: name it as the passage names the account — "the old French
 *    survey" — which is the same referent in the same register.
 *
 * 2. 63401816 (I01-5) vs 225419f0 (I02-5). Their option sets are 92%
 *    identical, differing only in one noun ("case" / "finding"). Not
 *    exploitable — the shown variants and keys differ — but a candidate
 *    meeting both meets the same four sentences twice, and the register
 *    already carries a rule that the two must never share a form.
 *    Fix: re-author I01's options in a different construction, meaning
 *    for meaning, so the pair is no longer a near-clone. Nothing about
 *    which option is correct changes.
 *
 * MEANING IS PRESERVED EXACTLY. These are symmetric-worlds items: each
 * option is some variant's genuine answer, so rewording an option
 * rewords that variant's answer. A paraphrase that drifted would make a
 * sibling variant's answer wrong for its own passage.
 *
 *   node repair-rw5-latent.mjs [--apply]
 */
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
const env=Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1).trim()]))
const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
const APPLY=process.argv.includes('--apply')
const norm=s=>String(s).trim().replace(/\s+/g,' ').toLowerCase()
const hashOf=it=>createHash('md5').update([norm(it.prompt),(it.choices||[]).map(norm).join('|')].join('~~')).digest('hex')

/* old -> new, meaning for meaning. */
const REPAIRS = {
  '4c5cef70': {
    'losing the Rochefort sheets': 'losing the old French survey',
  },
  '63401816': {
    'that the method behind the case is open to doubt': 'that he doubts the method by which it was reached',
    'that the case is proved, and he says so flatly':   'that he takes it as settled and says so plainly',
    'that the case is likely, and no more than likely': 'that he allows it is probable and goes no further',
    'that the case is proved but of small consequence': 'that he grants it but thinks little follows from it',
  },
}

const { data } = await db.from('study_item_bank').select('id,item,content_hash').eq('cohort','isee-reading-worlds-s5')
let changed=0
for (const [prefix, map] of Object.entries(REPAIRS)) {
  const r = (data??[]).find(x => x.id.startsWith(prefix))
  if (!r) { console.error('MISSING', prefix); process.exit(1) }
  const before = r.item.correct_answer
  const choices = r.item.choices.map(c => map[c] ?? c)
  const correct_answer = map[before] ?? before

  /* Guards. Each would have caught a real way to get this wrong. */
  const untouched = Object.keys(map).filter(k => !r.item.choices.includes(k))
  if (untouched.length) { console.error(`${prefix}: option not present, wording drifted: ${untouched.join(' | ')}`); process.exit(1) }
  if (new Set(choices).size !== choices.length) { console.error(`${prefix}: repair collapsed two options into one`); process.exit(1) }
  if (!choices.includes(correct_answer)) { console.error(`${prefix}: key is no longer among the options`); process.exit(1) }
  if (choices.length !== r.item.choices.length) { console.error(`${prefix}: option count changed`); process.exit(1) }
  const keyMoved = r.item.choices.indexOf(before) !== choices.indexOf(correct_answer)
  if (keyMoved) { console.error(`${prefix}: the key changed POSITION — repair must not re-order`); process.exit(1) }

  console.log(`\n${prefix}: ${Object.keys(map).length} option(s) reworded; key stays at index ${choices.indexOf(correct_answer)}`)
  r.item.choices.forEach((c,i)=>{ if(c!==choices[i]) console.log(`   ${i}  ${c}\n   -> ${choices[i]}`) })

  if (APPLY) {
    const item = { ...r.item, choices, correct_answer }
    const { error } = await db.from('study_item_bank').update({ item, content_hash: hashOf(item) }).eq('id', r.id)
    if (error) { console.error('ERR', r.id, error.message); process.exit(1) }
    changed++
  }
}
if (!APPLY) { console.log('\nDRY RUN — pass --apply to write'); process.exit(0) }

/* Re-read and CHECK, rather than trusting the update. */
const { data: after } = await db.from('study_item_bank').select('id,item').eq('cohort','isee-reading-worlds-s5')
const stillProper = (after??[]).filter(r => r.item.choices.some(c => /Rochefort/.test(c))).length
const bags = (after??[]).map(r => new Set(r.item.choices.flatMap(c => String(c).toLowerCase().replace(/[^a-z0-9 ]/g,'').split(/\s+/).filter(Boolean))))
let worst = 0
for (let i=0;i<bags.length;i++) for (let j=i+1;j<bags.length;j++) {
  const inter=[...bags[i]].filter(w=>bags[j].has(w)).length
  const uni=new Set([...bags[i],...bags[j]]).size
  worst = Math.max(worst, inter/uni)
}
console.log(`\nupdated ${changed}`)
console.log(`verified: proper-noun options remaining = ${stillProper}; highest option-set similarity in cohort = ${(100*worst).toFixed(0)}% (was 92%)`)
