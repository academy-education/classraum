#!/usr/bin/env node
/**
 * probe13.mjs — the mandatory BEFORE-GENERATION duplicate probe for MAP Math b13 (MAP-MATH-V2-B13.prereg.md §A2).
 *   node probe13.mjs <spec.json> <out.json>
 * spec: { "<mech>": { "stem": "<a draft stem in the item's own words>", "live": ["q", ...], "map": ["q", ...] } }
 * A query is one or more CONJUNCTIONS joined by " || "; inside a conjunction, terms are joined by "&" and each term is
 * a case-insensitive regex (so '|' inside a term is alternation WITHIN that term only). b12's probe wrote
 * "ladder&slides?|ladder&slips?", meaning (ladder AND slides) OR (ladder AND slips); it ran as ladder AND
 * (slides|ladder) AND slips and missed live SSAT 659d8c09 (a sliding ladder). Write that as
 * "ladder&slides? || ladder&slips?".
 * Refuses (exit 2) when a mechanism:
 *   - has no live query made of ONE term (the broad context probe), or no query at all on either side;
 *   - has a query that does not match its own draft stem (a probe that cannot find its own item cannot find a copy);
 *   - or when mf30-kw / mapgrep13 cannot read their corpus.
 * Live = every unarchived maths row, verified or staged, in every family (dump-b13) + the SAT prior files; map =
 * every earlier MAP maths item (mapgrep13). Every hit is written to <out.json> for the author to READ and disposition.
 */
import { readFileSync, writeFileSync } from 'node:fs'
const ROOT = '/Users/andylee/Downloads/saas/classraum', SP = ROOT + '/scratchpad/'
const die = m => { console.error('REFUSING: ' + m); process.exit(2) }
const [specP, outP] = process.argv.slice(2); if (!specP || !outP) die('usage: probe13.mjs <spec.json> <out.json>')
const spec = JSON.parse(readFileSync(specP, 'utf8'))
const live = JSON.parse(readFileSync(SP + 'map-v2-math-work/dump-b13/live-maths.json', 'utf8')), prior = JSON.parse(readFileSync(SP + 'map-v2-math-work/dump-b13/prior-math.json', 'utf8'))
if (live.length < 4000 || prior.length < 2600) die(`dump-b13 short: ${live.length} live, ${prior.length} prior`)
const { CORPUS: mapc } = await import(ROOT + '/scripts/study-bank/map-v2-work/math-b13/mapgrep13.mjs')
export const compile = q => q.split(/\s+\|\|\s+/).map(c => c.split('&').map(t => new RegExp(t.trim(), 'i')))
export const matches = (q, s) => compile(q).some(c => c.every(t => t.test(s)))
const text = r => `${r.passage ?? ''} ${r.prompt} ${(r.choices ?? []).join(' ')}`.replace(/\s+/g, ' ')
const out = {}; let bad = 0
for (const [m, s] of Object.entries(spec)) {
  const errs = []
  if (!s.stem) errs.push('no draft stem')
  if (!s.live?.length || !s.map?.length) errs.push('needs >= 1 live and >= 1 map query')
  if (!(s.live ?? []).some(q => !/\|\||&/.test(q))) errs.push('no one-term live query (broad context probe)')
  for (const q of [...(s.live ?? []), ...(s.map ?? [])]) if (s.stem && !matches(q, s.stem)) errs.push(`query does not match its own draft stem: "${q}"`)
  if (errs.length) { bad++; console.error(`${m}: ${errs.join('; ')}`); continue }
  out[m] = { stem: s.stem, live: [], map: [] }
  for (const q of s.live) { const H = [...live.filter(r => matches(q, text(r))).map(r => ({ id: r.id, src: `${r.verified ? 'live' : 'STAGED'} ${r.family}/${r.cohort}`, prompt: r.prompt, choices: r.choices, key: r.correct_answer })), ...prior.filter(r => matches(q, text(r))).map(r => ({ id: r.id, src: 'prior ' + r.file, prompt: r.prompt, choices: r.choices, key: r.correct_answer }))]; out[m].live.push({ query: q, n: H.length, hits: H.slice(0, 80) }) }
  for (const q of s.map) { const seen = new Set(), H = []; for (const x of mapc) { const p = String(x.prompt).replace(/\s+/g, ' '); if (!matches(q, p) || seen.has(p)) continue; seen.add(p); H.push({ id: x.id, src: x.src ?? x.file, prompt: p, key: x.correct_answer }) } out[m].map.push({ query: q, n: H.length, hits: H.slice(0, 80) }) }
  console.log(`${m}: live ${out[m].live.map(x => x.n).join('/')} | map ${out[m].map.map(x => x.n).join('/')}`)
}
if (bad) die(`${bad} mechanism spec(s) refused; nothing written`)
writeFileSync(outP, JSON.stringify(out, null, 1)); console.log(`-> ${outP} (${Object.keys(out).length} mechanisms); READ every hit and disposition it in PROBE-READ.md`)
