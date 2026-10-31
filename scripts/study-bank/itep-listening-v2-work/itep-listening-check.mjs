#!/usr/bin/env node
/**
 * itep-listening-check.mjs — STRUCTURAL pre-flight for iTEP SLATE Listening v2 (frozen briefs/itep-slate-listening-v1.md,
 * ITEP-SLATE-LISTENING-V2.prereg.md §3; v1 check, id pattern ITL2-[A-I] only). Reading v2's item rules plus the listening ones. Not the gate: a clean run
 * means the file is well-formed and free of the mechanical tells we know how to count.
 *
 *   node itep-listening-check.mjs <items-X.json> [more...] --expect <n-items>
 *        [--plan authors/X.plan.json ... | --assigned ASSIGNED.json] [--existing-names existing-names.json] [--batch]
 *
 * Exits 2 (never a verdict) on unreadable/empty input or an item count other than --expect.
 * Exits 1 on any problem; prints "PROBLEMS 0" and exits 0 otherwise.
 *
 * Transcript (the audio is synthesised from it):
 *   dialogues: every line "W: " or "M: ", alternating, the planned speaker first; the player's own turn regex
 *   (src/lib/study/conversation-gate.ts parseTurns, replicated byte for byte below) splits the stored form
 *   ("Transcript: " + transcript) into exactly those lines, so no stray "<capital>: " hides inside a turn;
 *   Part 1 2-3 turns 20-55 words, Part 2 10-20 turns 300-420 words.
 *   lecture: 480-580 words, <= 3,900 characters (the TTS route refuses a segment over 4,000; a monologue is one
 *   segment), and the turn regex finds ZERO turns.
 *   no symbols (% & / # + = [ ] ( ) * _ ~ < > |), no stage directions.
 * Per item: 4 distinct choices incl. the key; why (and why2 for inference) verbatim inside ONE turn; 3 rationales
 * quoting their choices; explanation quotes the key; no letter names; length ratio <= 1.5; quotations verbatim from
 * the script, an option or the prompt; kinds, order and difficulty as planned; the planned key-length rank; the
 * planned script-words rank (share of the option's content words that occur in the script); a Part 1/2 prompt names
 * the planned speaker first; a lecture option never uses he/she/him/her/his, a dialogue option only when the script
 * does.
 * Per author (and with --batch over all files): key uniquely longest / shortest caps; prompt-opening caps; key
 * 4-gram shared by two keys; option text repeated; lone surface features (the key must not carry a feature carried
 * by exactly one option in >= 75% of >= 3 such items, nor in 0 of >= 4).
 */
import { readFileSync, existsSync } from 'node:fs'

const argv = process.argv.slice(2)
const VAL = new Set(['--expect', '--plan', '--assigned', '--existing-names'])
const flag = k => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null }
const flags = k => argv.flatMap((a, i) => a === k ? [argv[i + 1]] : [])
const files = argv.filter((a, i) => !a.startsWith('--') && !VAL.has(argv[i - 1]))
const expect = Number(flag('--expect'))
const BATCH = argv.includes('--batch')
const die = (m, c = 2) => { console.error(`itep-listening-check: ${m}`); process.exit(c) }
if (!files.length) die('no input files')
if (!Number.isInteger(expect) || expect < 1) die('--expect <n> is required')
const readJson = p => { if (!existsSync(p)) die(`missing ${p}`); try { return JSON.parse(readFileSync(p, 'utf8')) } catch (e) { die(`${p}: ${e.message}`) } }
const plans = {}
if (flag('--assigned')) Object.assign(plans, readJson(flag('--assigned')).authors)
for (const p of flags('--plan')) { const d = readJson(p); if (!d.author) die(`${p}: no author`); plans[d.author] = d }
const HAVE_PLAN = Object.keys(plans).length > 0
const existingNames = flag('--existing-names') ? new Set(Object.keys(readJson(flag('--existing-names')))) : null

const docs = files.map(f => ({ f, d: readJson(f) }))
const sets = docs.flatMap(({ f, d }) => (Array.isArray(d?.sets) ? d.sets : []).map(s => ({ ...s, _file: f, _author: d.author })))
const items = sets.flatMap(s => (s.items || []).map(it => ({ ...it, _set: s })))
if (!items.length) die('read 0 items')
if (items.length !== expect) die(`read ${items.length} items from ${files.length} file(s), --expect ${expect}`)

const P = []
const prob = m => P.push(m)
const norm = s => String(s ?? '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim()
const words = s => norm(s).split(' ').filter(Boolean).length
const ITEMS_PER = { 1: 1, 2: 4, 3: 6 }
const KINDS = new Set(['main-idea', 'detail', 'inference', 'intent-next', 'purpose', 'relationship', 'attitude'])
const SUFFIX = /^ITL2-([A-I])-(D[1-4]|C|L)$/
const PART_OF = sfx => sfx[0] === 'D' ? 1 : sfx === 'C' ? 2 : 3

// The player's turn regex (conversation-gate.ts parseTurns / ListeningAudioPlayer.tsx), unchanged.
function parseTurns(passage) {
  const cleaned = passage.replace(/^\s*transcript:\s*/i, '').trim()
  const re = /(?:^|\s)([A-Z]):\s+([\s\S]*?)(?=(?:\s[A-Z]:\s+)|$)/g
  const turns = []
  let m
  while ((m = re.exec(cleaned)) != null) turns.push({ speaker: m[1], text: m[2].trim().replace(/^"|"$/g, '') })
  return turns
}
const SYMBOLS = /[%&/#+=[\]()*_~<>|@]/
const STOP = new Set('the a an and or but of to in on at for with by from as is are was were be been being it its this that these those there their they them he she his her him we our you your i me my not no do does did have has had will would can could should may might must so than then too very just also about into over after before what which who whom when where why how all any some more most other such only own same few each both one two three'.split(' '))
const stem = w => w.replace(/'s$/, '').replace(/ies$/, 'y').replace(/(?<=\w{3})(es|s)$/, '').replace(/(?<=\w{3})ing$/, '').replace(/(?<=\w{3})ed$/, '')
const content = s => new Set(norm(s).toLowerCase().replace(/[^a-z' ]/g, ' ').split(/\s+/).filter(w => w.length >= 3 && !STOP.has(w)).map(stem))
const share = (c, T) => { const cw = content(c); if (!cw.size) return 0; let k = 0; for (const w of cw) if (T.has(w)) k++; return k / cw.size }

// ---------- per set ----------
const nameOwner = new Map()
const byAuthor = new Map()
const turnsOf = new Map()
for (const s of sets) {
  const id = s.set_id || '(no set_id)'
  const a = s._author
  if (!byAuthor.has(a)) byAuthor.set(a, [])
  byAuthor.get(a).push(s)
  const m = SUFFIX.exec(id)
  if (!m) { prob(`${id}: set_id shape`); continue }
  if (m[1] !== a) prob(`${id}: set id author ${m[1]} in author ${a}'s file`)
  const sfx = m[2], part = PART_OF(sfx)
  if (s.part !== part) prob(`${id}: part ${s.part}, id says ${part}`)
  const T = String(s.transcript ?? '')
  if (!T.trim()) { prob(`${id}: empty transcript`); continue }
  const stored = `Transcript: ${T}`
  const raw = parseTurns(stored)
  if (SYMBOLS.test(T)) prob(`${id}: symbol in transcript (${T.match(SYMBOLS)[0]})`)
  const plan = plans[a]?.sets?.[sfx]
  if (part < 3) {
    const lines = T.split('\n')
    const bad = lines.filter(l => !/^(W|M): \S/.test(l))
    if (bad.length) prob(`${id}: ${bad.length} line(s) not starting "W: " or "M: " (e.g. "${bad[0].slice(0, 40)}")`)
    const turns = lines.map(l => ({ speaker: l[0], text: l.slice(3).trim().replace(/^"|"$/g, '') }))
    if (raw.length !== turns.length || raw.some((t, i) => t.speaker !== turns[i].speaker || norm(t.text) !== norm(turns[i].text))) prob(`${id}: the player's turn regex splits this transcript into ${raw.length} turns, not the ${turns.length} lines written (a stray "<capital>: " inside a turn?)`)
    for (let i = 1; i < turns.length; i++) if (turns[i].speaker === turns[i - 1].speaker) prob(`${id}: turn ${i + 1} repeats speaker ${turns[i].speaker}`)
    if (new Set(turns.map(t => t.speaker)).size !== 2) prob(`${id}: needs both W and M`)
    const [tlo, thi] = part === 1 ? [2, 3] : [10, 20]
    if (turns.length < tlo || turns.length > thi) prob(`${id}: ${turns.length} turns, part ${part} wants ${tlo}-${thi}`)
    const w = turns.reduce((n, t) => n + words(t.text), 0)
    const [lo, hi] = part === 1 ? [20, 55] : [300, 420]
    if (w < lo || w > hi) prob(`${id}: ${w} words, part ${part} wants ${lo}-${hi}`)
    if (plan && turns[0]?.speaker !== plan.opens) prob(`${id}: ${turns[0]?.speaker} speaks first, planned ${plan.opens}`)
    if (!s.speakers || !s.speakers.W || !s.speakers.M) prob(`${id}: speakers needs W and M roles`)
    turnsOf.set(s, turns.map(t => norm(t.text)))
  } else {
    if (raw.length) prob(`${id}: lecture contains a "<capital>: " pattern the player would read as a speaker change ("${raw[0].speaker}:")`)
    if (/^\s*[A-Z]: /m.test(T)) prob(`${id}: lecture has a speaker label`)
    const w = words(T)
    if (w < 480 || w > 580) prob(`${id}: ${w} words, part 3 wants 480-580`)
    const chars = T.replace(/\s+/g, ' ').trim().length
    if (chars > 3900) prob(`${id}: ${chars} characters, a lecture is one TTS segment and must be <= 3900`)
    if (!s.speakers?.S) prob(`${id}: speakers needs S`)
    turnsOf.set(s, [norm(T)])
  }
  if ((s.items || []).length !== ITEMS_PER[part]) prob(`${id}: ${(s.items || []).length} items, part ${part} wants ${ITEMS_PER[part]}`)
  // names and capitalised words, per turn (each turn starts a sentence)
  const names = Array.isArray(s.names) ? s.names : (prob(`${id}: names missing`), [])
  const other = new Set(Array.isArray(s.other_caps) ? s.other_caps : [])
  const declared = new Set([...names.flatMap(n => n.split(/\s+/)), ...other])
  for (const turn of turnsOf.get(s)) {
    for (const mm of turn.matchAll(/\b([A-Z][a-zA-Z'’-]+)\b/g)) {
      const before = turn.slice(Math.max(0, mm.index - 3), mm.index)
      if (mm.index === 0 || /[.!?:"“]\s*$/.test(before)) continue
      const wd = mm[1].replace(/['’]s$/, '')
      if (wd === 'I' || /^I'/.test(wd) || declared.has(wd)) continue
      prob(`${id}: capitalised "${wd}" not declared in names/other_caps`)
    }
  }
  for (const n of names) for (const w of n.split(/\s+/)) {
    if (plans[a]?.initials && !plans[a].initials.includes(w[0])) prob(`${id}: name "${w}" outside assigned initials ${plans[a].initials}`)
    if (existingNames?.has(w)) prob(`${id}: name "${w}" already used in the bank`)
    const prev = nameOwner.get(w)
    if (prev && prev !== id) prob(`${id}: name "${w}" also used in ${prev}`)
    nameOwner.set(w, id)
  }
  if (HAVE_PLAN) {
    if (!plan) prob(`${id}: not in the plan for author ${a}`)
    else {
      const kinds = (s.items || []).map(i => i.kind).join(',')
      if (kinds !== plan.kinds.join(',')) prob(`${id}: kinds ${kinds}, planned ${plan.kinds.join(',')}`)
      if (s.setting !== plan.setting) prob(`${id}: setting "${s.setting}", planned "${plan.setting}"`)
      for (const k of Object.keys(plan.speakers)) if (s.speakers?.[k] !== plan.speakers[k]) prob(`${id}: speaker ${k} "${s.speakers?.[k]}", planned "${plan.speakers[k]}"`)
    }
  }
}
for (const [a, ss] of byAuthor) {
  const ids = ss.map(s => String(s.set_id).split('-').pop()).join(',')
  const want = plans[a] ? Object.keys(plans[a].sets).join(',') : null
  if (want && ids !== want) prob(`author ${a}: sets ${ids}, want ${want}`)
  else if (HAVE_PLAN && !want) prob(`author ${a}: no plan`)
}
const planOf = it => plans[it._set._author]?.sets?.[String(it._set.set_id).split('-').pop()]?.items?.[Number(String(it.qid).split('-').pop()) - 1] ?? null

// ---------- per item ----------
const quotesOf = s => [...String(s).matchAll(/"([^"]+)"/g)].map(m => m[1])
const featureSets = []
for (const it of items) {
  const s = it._set, id = it.qid || '(no qid)'
  const turns = turnsOf.get(s) || []
  const script = turns.join(' ')
  const inOneTurn = q => turns.some(t => t.includes(norm(q)))
  if (!String(id).startsWith(`${s.set_id}-`)) prob(`${id}: qid does not start with ${s.set_id}-`)
  if (!KINDS.has(it.kind)) prob(`${id}: kind ${it.kind}`)
  if (s.part === 3 && ['relationship', 'intent-next'].includes(it.kind)) prob(`${id}: ${it.kind} is not a lecture kind`)
  const wantDiff = s.part === 1 ? 'easy' : s.part === 2 ? 'medium' : (['main-idea', 'detail'].includes(it.kind) ? 'medium' : 'hard')
  if (it.difficulty !== wantDiff) prob(`${id}: difficulty ${it.difficulty}, brief wants ${wantDiff}`)
  const ch = Array.isArray(it.choices) ? it.choices : []
  if (ch.length !== 4 || new Set(ch.map(c => norm(c).toLowerCase())).size !== 4) prob(`${id}: needs 4 distinct choices`)
  if (!ch.includes(it.correct_answer)) prob(`${id}: key is not one of the choices`)
  if (!it.why || !inOneTurn(it.why)) prob(`${id}: why is not verbatim text inside one turn`)
  if (it.kind === 'inference') {
    if (!it.why2 || !inOneTurn(it.why2)) prob(`${id}: inference needs a verbatim why2 inside one turn`)
    else if (norm(it.why).includes(norm(it.why2)) || norm(it.why2).includes(norm(it.why))) prob(`${id}: why2 must be a different place in the script`)
  }
  const L = ch.map(c => String(c).length)
  if (L.length === 4 && Math.max(...L) / Math.min(...L) > 1.5 + 1e-9) prob(`${id}: length ratio ${(Math.max(...L) / Math.min(...L)).toFixed(2)} > 1.5`)
  const texts = [it.explanation || '', ...(it.distractor_rationales || []).map(d => d.reason || '')]
  for (const t of texts) if (/\b(choice|option|answer) [A-D]\b|\([A-D]\)/.test(t)) prob(`${id}: names a letter`)
  if (!String(it.explanation || '').includes(`"${it.correct_answer}"`)) prob(`${id}: explanation does not quote the key`)
  const dr = it.distractor_rationales || []
  if (dr.length !== 3 || new Set(dr.map(d => d.choice)).size !== 3 || dr.some(d => !ch.includes(d.choice) || d.choice === it.correct_answer)) prob(`${id}: needs 3 rationales, one per distractor`)
  for (const d of dr) if (!String(d.reason || '').startsWith(`"${d.choice}"`)) prob(`${id}: rationale does not start with its choice quoted`)
  for (const t of texts) for (const q of quotesOf(t)) {
    const nq = norm(q).replace(/[.,;:!?]+$/, '')
    if (!script.includes(nq) && !ch.some(c => norm(c).includes(nq)) && !norm(it.prompt).includes(nq)) prob(`${id}: quotation not in script or options: "${q.slice(0, 60)}"`)
  }
  const plan = planOf(it)
  if (HAVE_PLAN && !plan) prob(`${id}: no planned shape`)
  if (plan && L.length === 4) {
    const want = plan.key_length, k = String(it.correct_answer).length, mx = Math.max(...L), mn = Math.min(...L)
    const uMax = k === mx && L.filter(x => x === mx).length === 1, uMin = k === mn && L.filter(x => x === mn).length === 1
    if (want === 'longest' && k !== mx) prob(`${id}: key length planned longest, key is not the longest option`)
    else if (want === 'shortest' && k !== mn) prob(`${id}: key length planned shortest, key is not the shortest option`)
    else if (want === 'middle' && (uMax || uMin)) prob(`${id}: key length planned middle, key is uniquely ${uMax ? 'longest' : 'shortest'}`)
    const TW = content(script), sh = ch.map(c => share(c, TW)), ks = sh[ch.indexOf(it.correct_answer)] ?? 0
    const fmt = () => sh.map(x => x.toFixed(2)).join('/')
    if (plan.script_words === 'key-most' && sh.some(x => x > ks + 1e-9)) prob(`${id}: script words planned key-most, a distractor repeats more of the script (shares ${fmt()}, key ${ks.toFixed(2)})`)
    if (plan.script_words === 'key-not-most' && !sh.some(x => x > ks + 1e-9)) prob(`${id}: script words planned key-not-most, no distractor repeats more of the script (shares ${fmt()}, key ${ks.toFixed(2)})`)
    if (plan.about) {
      const first = (String(it.prompt).match(/\b(woman|man)\b/i) || [])[1]?.toLowerCase()
      if (`the ${first}` !== plan.about) prob(`${id}: prompt should ask about ${plan.about} (first speaker named: ${first ?? 'none'})`)
    }
  }
  for (const c of ch) for (const pr of String(c).match(/\b(he|she|him|her|his|hers)\b/gi) || []) {
    if (s.part === 3) { prob(`${id}: lecture option uses "${pr}"; say "the speaker"`); continue }
    const fam = /^(he|him|his)$/i.test(pr) ? /\b(he|him|his)\b/i : /\b(she|her|hers)\b/i
    if (!fam.test(script)) prob(`${id}: option uses "${pr}" but the script never does`)
  }
  if (ch.length === 4) featureSets.push({ it, ch, script })
}

// ---------- cross-item (per author, and batch-wide with --batch) ----------
const HEDGE = /\b(may|might|some|partly|perhaps|could|somewhat|likely|probably|seem|seems|usually|often|maybe)\b/i
const ABS = /\b(all|every|always|never|only|entirely|completely|whole|any|none|nothing|must|alone)\b/i
const CONTRAST = /\b(but|although|though|while|however|yet|instead)\b/i
const firstWord = c => norm(c).toLowerCase().split(' ')[0]
const quotes4 = (c, script) => { const w = norm(c).toLowerCase().replace(/[^a-z0-9' ]/g, '').split(' '); const p = script.toLowerCase().replace(/[^a-z0-9' ]/g, ' ').replace(/\s+/g, ' '); for (let i = 0; i + 4 <= w.length; i++) if (p.includes(w.slice(i, i + 4).join(' '))) return true; return false }
const FEATURES = {
  hedge: c => HEDGE.test(c), absolute: c => ABS.test(c), contrast: c => CONTRAST.test(c),
  punct: c => /[;—–]|\s-\s/.test(c), two_part: c => /\band\b|,/i.test(c), number: c => /\d|\b(one|two|three|four|five|six|seven|eight|nine|ten|twenty|hundred|thousand)\b/i.test(c),
  negative: c => /\b(not|no|never|n't|without)\b|n't\b/i.test(c),
}
function crossChecks(group, label, isBatch) {
  const n = group.length
  let uLong = 0, uShort = 0
  for (const { it, ch } of group) {
    const L = ch.map(c => c.length), k = it.correct_answer.length
    if (k === Math.max(...L) && L.filter(x => x === k).length === 1) uLong++
    if (k === Math.min(...L) && L.filter(x => x === k).length === 1) uShort++
  }
  const cap = Math.max(4, Math.ceil(n / 3))
  if (uLong > cap) prob(`${label}: key uniquely longest ${uLong}/${n} (max ${cap})`)
  if (uShort > cap) prob(`${label}: key uniquely shortest ${uShort}/${n} (max ${cap})`)
  const stem = s => norm(s).toLowerCase().replace(/"[^"]*"/g, 'Q').split(' ').slice(0, 4).join(' ')
  const stems = {}; for (const { it } of group) stems[stem(it.prompt)] = (stems[stem(it.prompt)] || 0) + 1
  const sCap = isBatch ? Math.max(4, Math.ceil(n / 10)) : 3
  for (const [s, c] of Object.entries(stems)) if (c > sCap) prob(`${label}: prompt opening "${s}" x${c} (max ${sCap})`)
  const grams = new Map()
  for (const { it } of group) {
    const w = norm(it.correct_answer).toLowerCase().replace(/[^a-z0-9' ]/g, '').split(' ')
    const mine = new Set(); for (let i = 0; i + 4 <= w.length; i++) mine.add(w.slice(i, i + 4).join(' '))
    for (const g of mine) { if (grams.has(g) && grams.get(g) !== it.qid) prob(`${label}: keys ${grams.get(g)} and ${it.qid} share "${g}"`); grams.set(g, it.qid) }
  }
  const opt = new Map()
  for (const { it, ch } of group) for (const c of ch) { const k = norm(c).toLowerCase(); if (opt.has(k) && opt.get(k) !== it.qid) prob(`${label}: option "${c.slice(0, 50)}" in ${opt.get(k)} and ${it.qid}`); opt.set(k, it.qid) }
  const tally = {}
  const add = (f, keyHas) => { tally[f] ??= { lone: 0, key: 0 }; tally[f].lone++; if (keyHas) tally[f].key++ }
  for (const { it, ch, script } of group) {
    const fs = { ...FEATURES, quotes_script: c => quotes4(c, script) }
    for (const [f, test] of Object.entries(fs)) { const has = ch.map(test); if (has.filter(Boolean).length === 1) add(f, has[ch.indexOf(it.correct_answer)]) }
    const fw = ch.map(firstWord); for (const w of new Set(fw)) if (fw.filter(x => x === w).length === 1) add(`first word "${w}"`, firstWord(it.correct_answer) === w)
    const L = ch.map(c => c.length), k = it.correct_answer.length
    if (L.filter(x => x === Math.max(...L)).length === 1) add('uniquely longest', k === Math.max(...L))
    if (L.filter(x => x === Math.min(...L)).length === 1) add('uniquely shortest', k === Math.min(...L))
  }
  for (const [f, t] of Object.entries(tally)) {
    if (f.startsWith('first word') && t.lone < 3) continue
    if (t.lone >= 3 && t.key / t.lone >= 0.75) prob(`${label}: key carries the lone "${f}" in ${t.key}/${t.lone} items (>= 75%)`)
    if (t.lone >= 4 && t.key === 0 && !f.startsWith('first word') && !f.startsWith('uniquely')) prob(`${label}: lone "${f}" is never the key (0/${t.lone}): a free elimination`)
  }
  return { n, uLong, uShort }
}
const summaries = []
for (const [a] of byAuthor) summaries.push([`author ${a}`, crossChecks(featureSets.filter(x => x.it._set._author === a), `author ${a}`, false)])
if (BATCH) summaries.push(['batch', crossChecks(featureSets, 'batch', true)])

// ---------- report ----------
const perPart = {}; for (const s of sets) perPart[`part ${s.part}`] = (perPart[`part ${s.part}`] || 0) + (s.items || []).length
const kinds = {}; for (const it of items) kinds[it.kind] = (kinds[it.kind] || 0) + 1
console.log(`read ${files.length} file(s): ${sets.length} sets, ${items.length} items ${JSON.stringify(perPart)}`)
console.log(`kinds ${JSON.stringify(kinds)}`)
for (const s of sets) {
  const T = String(s.transcript ?? '')
  const extra = s.part < 3 ? `${T.split('\n').length} turns` : `${T.replace(/\s+/g, ' ').trim().length} chars`
  console.log(`  ${String(s.set_id).padEnd(10)} part ${s.part} ${String(words(T.replace(/^[WM]: /gm, ''))).padStart(3)} words ${extra.padStart(10)}  ${s.setting}: ${s.title}`)
}
for (const [label, r] of summaries) console.log(`${label}: key uniquely longest ${r.uLong}/${r.n}, uniquely shortest ${r.uShort}/${r.n}`)
console.log(`PROBLEMS ${P.length}`)
for (const p of P) console.log('  ' + p)
process.exit(P.length ? 1 : 0)
