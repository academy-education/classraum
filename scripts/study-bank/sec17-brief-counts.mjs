#!/usr/bin/env node
/**
 * sec17-brief-counts.mjs <frozen batch.json>
 *
 * The decidable brief counts of PREREG-SEC17-2026-10-08.md (rules 3-6 and the
 * key spread), computed from the option TEXT of the frozen file rather than from
 * the authors' reports. Written before any v17 item existed.
 *
 *   voice     an item is VOICE-VARYING when its options include both a passive
 *             (be-form + participle) and a non-passive finite form; bar: passive
 *             key in >= 1/3 and <= 1/2 of them
 *   had       items offering a "had + participle" option; bar: had-form keyed in
 *             >= 1/3 and <= 1/2 of them
 *   modal     items offering both "would" and "will"; bar: "would" keyed in <= 1/2
 *             and at least one keyed "will"
 *   punct     items whose four options are identical once punctuation is removed;
 *             bar: comma key >= 1, strong-mark (; : dash) key in exactly 2 of 4
 *
 * The classifiers are regexes, so every classified option is PRINTED for a
 * human to read: a count is evidence only after that read. Refuses (exit 2) on
 * an unreadable or empty batch, or an item whose key is not one of its choices.
 */
import { readFileSync } from 'node:fs'

const file = process.argv[2]
if (!file) { console.error('usage: sec17-brief-counts.mjs <batch.json>'); process.exit(2) }
let items
try { items = JSON.parse(readFileSync(file, 'utf8')) } catch (e) { console.error(`cannot read ${file}: ${e.message}`); process.exit(2) }
if (!Array.isArray(items) || items.length === 0) { console.error('empty batch: refusing to print counts'); process.exit(2) }

const PART = String.raw`\w+(?:ed|en|wn|ne|lt|pt|ught|id|un|ung|ade|eld|ound|ost|ept|elt|ent)`
const passiveRe = new RegExp(String.raw`\b(?:is|are|was|were|be|been|being)\s+(?:(?:\w+ly|still|now|also|long|not|yet|already|never|once)\s+)*${PART}\b`, 'i')
const hadRe = /\bhad\b(?!\s+to\b)/i  // a bare "had" option (inversion auxiliary) counts: v16 A-02
const wouldRe = /\bwould\b/i
const willRe = /\bwill\b/i
const strip = s => s.toLowerCase().replace(/[.,;:—–"'()-]/g, ' ').replace(/\s+/g, ' ').trim()
const marks = s => (s.match(/[.,;:—]/g) || [])

const rows = []
for (const it of items) {
  const ch = it.choices
  const k = ch.indexOf(it.correct_answer)
  if (!Array.isArray(ch) || ch.length !== 4 || k < 0) { console.error(`${it.id}: key not among choices`); process.exit(2) }
  const pass = ch.map(c => passiveRe.test(c))
  const isPunct = new Set(ch.map(strip)).size === 1
  const r = { id: it.id, key: 'ABCD'[k], isPunct }
  if (isPunct) {
    // the key's mark = marks in the key not present in every option
    const common = ch.map(marks).reduce((a, m) => a.filter(x => { const i = m.indexOf(x); if (i < 0) return false; m = m.slice(0, i).concat(m.slice(i + 1)); return true }))
    let km = marks(ch[k]); for (const c of common) { const i = km.indexOf(c); if (i >= 0) km.splice(i, 1) }
    r.keyMark = km.length === 0 ? 'none' : km.some(m => ';:—.'.includes(m)) ? 'strong:' + km.join('') : km.join('')
    r.strongOffered = ch.filter(c => /[;:—]/.test(c)).length
  } else {
    r.voiceVarying = pass.some(Boolean) && pass.some(p => !p)
    r.passiveKey = pass[k]
    r.hadOffered = ch.some(c => hadRe.test(c)); r.hadKey = hadRe.test(ch[k])
    r.modalPair = ch.some(c => wouldRe.test(c)) && ch.some(c => willRe.test(c))
    r.wouldOffered = ch.some(c => wouldRe.test(c)); r.willOffered = ch.some(c => willRe.test(c))
    r.wouldKey = wouldRe.test(ch[k]); r.willKey = willRe.test(ch[k])
  }
  const len = ch.map(c => c.length), mx = Math.max(...len), mn = Math.min(...len)
  r.keyLongest = len[k] === mx && len.filter(l => l === mx).length === 1
  r.keyShortest = len[k] === mn && len.filter(l => l === mn).length === 1
  r.ratio = mx / mn
  rows.push(r)
  const tag = isPunct ? `PUNCT key mark ${r.keyMark}, strong-mark options ${r.strongOffered}`
    : `voice ${r.voiceVarying ? 'VARYING' : '-'}${r.voiceVarying ? (r.passiveKey ? ' key PASSIVE' : ' key active') : ''} | had ${r.hadOffered ? (r.hadKey ? 'KEY' : 'offered') : '-'} | would ${r.wouldOffered ? (r.wouldKey ? 'KEY' : 'offered') : '-'} will ${r.willOffered ? (r.willKey ? 'KEY' : 'offered') : '-'}`
  console.log(`${it.id}  key ${r.key}  ${tag}`)
  ch.forEach((c, i) => console.log(`     ${'ABCD'[i]}${i === k ? '*' : ' '} ${pass[i] ? '[pass] ' : '       '}${hadRe.test(c) ? '[had] ' : '      '}${c}`))
}

const n = rows.length
const frac = (a, b) => b ? `${a}/${b} = ${(100 * a / b).toFixed(1)}%` : `0/0 (none offered)`
const bar = ok => ok ? 'MET' : 'MISSED'
const V = rows.filter(r => r.voiceVarying), Vp = V.filter(r => r.passiveKey).length
const H = rows.filter(r => r.hadOffered), Hk = H.filter(r => r.hadKey).length
const W = rows.filter(r => r.modalPair), Ww = W.filter(r => r.wouldKey).length, Wl = W.filter(r => r.willKey).length
const P = rows.filter(r => r.isPunct)
const Pc = P.filter(r => r.keyMark === ','), Ps = P.filter(r => r.keyMark.startsWith('strong'))
const spread = Object.fromEntries('ABCD'.split('').map(L => [L, rows.filter(r => r.key === L).length]))
console.log(`\n${n} items read from ${file}`)
console.log(`key letters ${JSON.stringify(spread)}   key uniquely longest ${rows.filter(r => r.keyLongest).length}/${n}, uniquely shortest ${rows.filter(r => r.keyShortest).length}/${n}, max length ratio ${Math.max(...rows.map(r => r.ratio)).toFixed(2)}`)
console.log(`rule 3 voice      passive key ${frac(Vp, V.length)} of voice-varying items  [bar 1/3..1/2] ${bar(V.length > 0 && Vp / V.length >= 1 / 3 - 1e-9 && Vp / V.length <= 0.5)}   (${V.map(r => r.id + (r.passiveKey ? ':P' : ':a')).join(' ')})`)
console.log(`rule 4 punct      ${P.length} items; comma key ${Pc.length}, strong-mark key ${Ps.length} of ${P.length}  [bar comma>=1, strong exactly 2 of 4] ${bar(Pc.length >= 1 && Ps.length === 2 && P.length === 4)}   (${P.map(r => r.id + ':' + r.keyMark).join(' ')})`)
console.log(`rule 5 had        had key ${frac(Hk, H.length)} of items offering it  [bar 1/3..1/2] ${bar(H.length > 0 && Hk / H.length >= 1 / 3 - 1e-9 && Hk / H.length <= 0.5)}   (${H.map(r => r.id + (r.hadKey ? ':KEY' : '')).join(' ')})`)
console.log(`rule 6 would/will would key ${frac(Ww, W.length)}, will key ${Wl}  [bar would<=1/2, will>=1] ${bar(W.length > 0 && Ww / W.length <= 0.5 && Wl >= 1)}   (${W.map(r => r.id).join(' ')})`)
console.log('Regex classifications: read the printed options above before quoting any count.')
