#!/usr/bin/env node
/**
 * sc-article-scan.mjs [--batch <file.batch.json>]
 *
 * MEASURE ONLY. Finds sentence completions with "a"/"an" immediately before a
 * blank whose options split on initial vowel SOUND, so the article rules some
 * out with no reading. Found by isee-verbal-s20's with-source graders (B-14 "an
 * -------" left only "ignominious"; C-22 "a -------" with key "untutored").
 * The options-only attack withholds the stem and cannot see this.
 * Default: every live verified ISEE/SSAT verbal SC row. --batch: one file.
 * Writes nothing.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
// sound-based vowel test; exceptions listed both ways
const vowelSound = w => { w = w.toLowerCase(); if (/^(hour|honest|honor|honour|heir)/.test(w)) return true; if (/^(uni|use|usu|ure|uti|eu|ewe|one|once|ubiq|uran|ukul|unanim)/.test(w)) return false; return /^[aeiou]/.test(w) }
const bi = process.argv.indexOf('--batch')
for (const fam of bi >= 0 ? ['batch'] : ['isee', 'ssat']) {
  const rows = []
  if (bi >= 0) rows.push(...JSON.parse(readFileSync(process.argv[bi + 1], 'utf8')).map(it => ({ id: it.id, cohort: 'batch', verified: true, item: it })))
  else for (let f = 0; ; f += 1000) {
    const { data, error } = await db.from('study_item_bank').select('id,cohort,verified,archived,item').eq('family', fam).eq('section', 'verbal').eq('archived', false).order('id').range(f, f + 999)
    if (error) throw new Error(error.message); rows.push(...data); if (data.length < 1000) break
  }
  const sc = rows.filter(r => r.verified && /-{3,}/.test(String(r.item?.prompt ?? '')) && !/\bis to\b/i.test(r.item.prompt))
  let art = 0, mixed = 0, onlyKey = 0, keyBad = 0, elim = 0, twoBlank = 0
  const ex = []
  for (const r of sc) {
    const p = String(r.item.prompt)
    const m = p.match(/\b(a|an)\s+-{3,}/i)
    if (!m) continue
    art++
    const before = p.slice(0, m.index + m[0].length), blankIdx = (before.match(/-{3,}/g) ?? []).length - 1
    const opt = c => { const parts = String(c).split(/\s*\.\.+\s*|\s*[,;/]\s*/).filter(Boolean); return parts[blankIdx] ?? parts[0] }
    if ((p.match(/-{3,}/g) ?? []).length > 1) twoBlank++
    const an = m[1].toLowerCase() === 'an'
    const ch = r.item.choices.map(String), key = String(r.item.correct_answer)
    const ok = ch.filter(c => vowelSound(opt(c)) === an)
    if (ok.length === ch.length) continue
    mixed++
    const keyOk = ok.includes(key)
    if (!keyOk) keyBad++
    else if (ok.length === 1) onlyKey++
    else elim++
    ex.push((!keyOk ? 'KEY UNGRAMMATICAL ' : ok.length === 1 ? 'ONLY KEY ' : `rules out ${ch.length - ok.length}: `) + `${r.cohort} ${r.id.slice(0, 8)} '${m[0]}' key ${key} | ${ch.join(', ')}`)
  }
  console.log(`${fam}: ${sc.length} live verified SC rows; '${'a/an'} + blank' in ${art}; options split on vowel sound in ${mixed}: ONLY THE KEY grammatical ${onlyKey}, KEY ungrammatical ${keyBad}, key grammatical + >=1 distractor ruled out ${elim} (two-blank among the article rows ${twoBlank})`)
  for (const e of ex) console.log('   ', e)
}
