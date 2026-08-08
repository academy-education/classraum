/**
 * A13 — explanations that name an option by POSITION where that position
 * holds the key, i.e. the explanation calls the right answer a wrong one.
 *
 * The ordinals were written against the order the author drafted the
 * options in; the stored order differs and nothing recorded the
 * permutation (078 is about dedup_key, not option order). So there is no
 * mechanical remap — each replacement below was read against the item's
 * own options and the description matched to the option it actually
 * describes. Replacements name the option by its content, which cannot go
 * stale under a future reshuffle. That is the house style already used by
 * the correct half of the 2026-08-06 register repairs.
 *
 * SCOPE. The detector first reported 63. Hand review found most were
 * ordinals counting CONTENT — "the second equation", "the first two
 * infinitives", "the third element must also be a gerund", "in the first
 * place". After a noun test, sentence-scoped ellipsis and a
 * worked-arithmetic exclusion it reports 22, and two of those are still
 * false ("the second only counts as justification once the first has
 * ruled out" = two claims; "only the second concerns boundaries" = the
 * second trio of terms). Both are listed in KNOWN_FALSE below rather than
 * chased with another regex. 20 real. An unvalidated detector tripled its
 * own finding — the SAT Math hub lesson, repeated by the script written
 * to honour it.
 */
import fs from 'fs'
import { optionOrdinals } from './check-explanation-ordinals.mjs'

const env = fs.readFileSync('.env.local', 'utf8')
const g = k => env.match(new RegExp('^' + k + '=(.*)$', 'm'))[1].trim()
const U = g('NEXT_PUBLIC_SUPABASE_URL'), K = g('SUPABASE_SERVICE_ROLE_KEY')
const APPLY = process.argv.includes('--apply')

/** Flagged by the detector, confirmed by reading as NOT option references. */
const KNOWN_FALSE = {
  'a4138d04': '"the second"/"the first" are the two claims being combined; the same explanation labels options A/B/D explicitly',
  '5459cc93': '"only the second" is the second trio of terms (the boundary list), not an option',
}

/** id prefix → [[find, replace], ...]. `find` must occur exactly once. */
const REPAIRS = {
  '0b280141': [
    ['The second echoes the sizes to argue the customer out of it, the third repeats the very error being corrected',
     'The reply arguing the large is better value talks the customer out of the correction, the offer to make the medium again repeats the very error being corrected'],
  ],
  'adeae657': [
    ['The second ignores what was just waived, the third argues the point already conceded, and the fourth is too dismissive to serve the tenant’s interest.',
     'Reading it as keeping the whole deposit ignores what was just waived, the appeal to the inventory photos argues the point already conceded, and “Fine, whatever” is too dismissive to serve the tenant’s interest.'],
    ['The second ignores what was just waived, the third argues the point already conceded, and the fourth is too dismissive to serve the tenant\'s interest.',
     'Reading it as keeping the whole deposit ignores what was just waived, the appeal to the inventory photos argues the point already conceded, and "Fine, whatever" is too dismissive to serve the tenant\'s interest.'],
  ],
  '6873b6be': [
    ['the second echoes the music as a shared interest, the third dismisses the complaint despite the neighbour’s careful hedging, and the fourth answers a question about the building that wasn’t asked',
     'treating the album as a shared interest echoes the music instead of answering, insisting two in the morning is not that late dismisses the complaint despite the neighbour’s careful hedging, and the remark about solid brick walls answers a question about the building that wasn’t asked'],
    ['the second echoes the music as a shared interest, the third dismisses the complaint despite the neighbour\'s careful hedging, and the fourth answers a question about the building that wasn\'t asked',
     'treating the album as a shared interest echoes the music instead of answering, insisting two in the morning is not that late dismisses the complaint despite the neighbour\'s careful hedging, and the remark about solid brick walls answers a question about the building that wasn\'t asked'],
  ],
  'be340c00': [['the third only commiserates', 'the remark that weekend shifts are the worst only commiserates']],
  'cfb5fa8a': [
    ['the second and third support the explanations she downplays, the fourth is irrelevant',
     'the taller-and-faster growth and the higher seed count support the explanations she downplays, and the similar water requirement is irrelevant'],
  ],
  '3dabde66': [
    ['the second echoes the loading bay with information instead of a remedy, the third ignores the qualifier that the room itself is fine and over-corrects with a refund, and the fourth is too casual for front-desk staff',
     'the answer about deliveries finishing by six echoes the loading bay with information instead of a remedy, the full refund ignores the qualifier that the room itself is fine and over-corrects, and agreeing that side is grim is too casual for front-desk staff'],
  ],
  '63109287': [
    ['the first overgeneralizes, the third confuses route-seeking with a grass preference, the fourth contradicts the split',
     'restricting desire paths to university campuses overgeneralizes, the claim that pedestrians prefer grass confuses route-seeking with a grass preference, and the claim that architects agree they damage lawns contradicts the split'],
  ],
  '438694b3': [
    ['the first contradicts the text, the others are a detail and a too-broad restatement',
     'the claim that octopuses use their eyes to coordinate the change contradicts the text, while the chromatophore description is a detail and the long-puzzled sentence a too-broad restatement'],
  ],
  'f328f6c4': [
    ['the second is a minor detail, the third overstates the microbe claim, the fourth overgeneralizes',
     'the sliver-of-coastline point is a minor detail, the claim that microbes cannot survive at all overstates it, and the claim that rainforests store less than any other forest overgeneralizes'],
  ],
  '17d5acca': [
    ['the second ignores the qualifier entirely, the third echoes', 'calling forty minutes plenty of time ignores the qualifier entirely, the reply about changing planes there last spring echoes'],
    ['and the fourth escalates against someone who is trying to help', 'and lodging a formal complaint escalates against someone who is trying to help'],
  ],
  '5499e327': [
    ['the second answers as if it were a general question about radiators, the third misreads an ongoing problem as resolved, and the fourth answers a question about the room that was never asked',
     'explaining that radiators make that noise answers as if it were a general question, being glad it is finally sorted misreads an ongoing problem as resolved, and the remark about the back bedroom’s size answers a question that was never asked'],
    ['the second answers as if it were a general question about radiators, the third misreads an ongoing problem as resolved, and the fourth answers a question about the room that was never asked.',
     'explaining that radiators make that noise answers as if it were a general question, being glad it is finally sorted misreads an ongoing problem as resolved, and the remark about the back bedroom\'s size answers a question that was never asked.'],
  ],
  '25eca95b': [
    ['the second drops the qualifier and hears an all-clear, the third echoes', 'hearing that there is nothing to follow up drops the qualifier and takes it as an all-clear, the reply about a father’s liver echoes'],
    ['and the fourth uses consent-form language no patient would speak aloud', 'and the blanket consent to further procedures uses form language no patient would speak aloud'],
  ],
  'b89e89c3': [
    ['the second ignores the qualifier about after seven, the third defends a ticket nobody challenged, and the fourth is disproportionate to a helpful warning',
     'staying on to Ashford ignores the qualifier, defending the machine-bought ticket answers a challenge nobody made, and demanding to speak to someone responsible is disproportionate to a helpful warning'],
  ],
  '1d1464fd': [
    ['the second echoes "sauce" and defends it, the third ignores the qualifier that this is a dairy issue rather than a preference, and the fourth is too casual for a server addressing a mistake',
     'praising how popular the sauce is defends it instead of fixing it, offering to scrape it off ignores the qualifier that this is a dairy issue rather than a preference, and “that one’s on me” is too casual for a server addressing a mistake'],
    ['the second echoes “sauce” and defends it, the third ignores the qualifier that this is a dairy issue rather than a preference, and the fourth is too casual for a server addressing a mistake',
     'praising how popular the sauce is defends it instead of fixing it, offering to scrape it off ignores the qualifier that this is a dairy issue rather than a preference, and “that one’s on me” is too casual for a server addressing a mistake'],
  ],
  '9aaca043': [
    ['the second ignores the condition and hears a granted raise, the third echoes the praise and changes the subject, and the fourth is contractual language in a manager’s office',
     'asking when the new amount reaches the payslip ignores the condition and hears a granted raise, crediting the northern accounts echoes the praise and changes the subject, and accepting the terms as settled is contractual language in a manager’s office'],
    ['the second ignores the condition and hears a granted raise, the third echoes the praise and changes the subject, and the fourth is contractual language in a manager\'s office',
     'asking when the new amount reaches the payslip ignores the condition and hears a granted raise, crediting the northern accounts echoes the praise and changes the subject, and accepting the terms as settled is contractual language in a manager\'s office'],
  ],
  'f04ee3f7': [
    ['The first distractor overstates by asserting coffee', 'The choice overstates by asserting coffee'],
  ],
  'a1a41923': [
    ['the third answers a question about the journey that wasn’t asked', 'the answer giving the hour-and-a-half journey time answers a question that wasn’t asked'],
    ['the third answers a question about the journey that wasn\'t asked', 'the answer giving the hour-and-a-half journey time answers a question that wasn\'t asked'],
  ],
  '8bcce6b3': [
    ['The second takes the permission and drops the condition, the third echoes', 'Taking the two together at breakfast keeps the permission and drops the condition, the reply about taking it since spring echoes'],
  ],
  '142fabb7': [
    ['The second ignores that qualifier and re-raises the objection already answered, the third treats an offer as a fact to verify',
     'Raising the hour-long drive re-opens the objection the qualifier already answered, asking “are you sure?” treats an offer as a fact to verify'],
  ],
  'a4ff61a6': [
    ['the second asks for exactly what was just ruled out, the third echoes', 'asking for it back on the card requests exactly what was just ruled out, the remark about the packaging echoes'],
  ],
}

const req = (path, init) => fetch(`${U}/rest/v1/${path}`, {
  ...init, headers: { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(init?.headers || {}) },
})

// PAGINATE. PostgREST caps a response at 1000 rows and says nothing about
// it; an unpaginated read reported "no live row" for 15 of the 20 targets,
// which looked exactly like the rows having been archived.
const rows = []
for (let from = 0; ; from += 1000) {
  const r = await req('study_item_bank?select=id,item&archived=is.false', { headers: { Range: `${from}-${from + 999}` } })
  const page = await r.json()
  if (!Array.isArray(page)) throw new Error(JSON.stringify(page))
  rows.push(...page)
  if (page.length < 1000) break
}
console.log(`read ${rows.length} live rows`)
let changed = 0, skipped = 0
for (const [prefix, pairs] of Object.entries(REPAIRS)) {
  const row = rows.find(r => r.id.startsWith(prefix))
  if (!row) { console.log(`MISS  ${prefix} — no live row`); skipped++; continue }
  const before = row.item.explanation
  let after = before
  let applied = 0
  for (const [find, repl] of pairs) {
    const n = after.split(find).length - 1
    if (n === 0) continue
    if (n > 1) { console.log(`SKIP  ${prefix} — fragment occurs ${n}x, not unique`); applied = -1; break }
    after = after.replace(find, repl); applied++
  }
  if (applied <= 0) { console.log(`SKIP  ${prefix} — no fragment matched (row already changed?)`); skipped++; continue }

  // G1 no option-ordinal may survive; G2 the text must actually change;
  // G3 never let a rewrite quote the KEY as though it were a distractor.
  const leftover = optionOrdinals(after)
  if (leftover.length) { console.log(`FAIL  ${prefix} — ordinal survives: ${leftover.map(o => o.word)}`); skipped++; continue }
  if (after === before) { console.log(`FAIL  ${prefix} — unchanged`); skipped++; continue }
  const key = row.item.correct_answer
  const keyTail = String(key).replace(/[^a-z ]/gi, '').toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6).join(' ')
  const addedText = after.replace(before.slice(0, 0), '')
  if (keyTail.length > 20 && addedText.toLowerCase().includes(keyTail) && !before.toLowerCase().includes(keyTail)) {
    console.log(`FAIL  ${prefix} — rewrite introduces the key's own wording`); skipped++; continue
  }

  console.log(`OK    ${prefix}  ${applied} fragment(s)`)
  if (APPLY) {
    const r = await req(`study_item_bank?id=eq.${row.id}`, {
      method: 'PATCH', body: JSON.stringify({ item: { ...row.item, explanation: after } }),
    })
    if (!r.ok) { console.log(`  WRITE FAILED ${r.status} ${await r.text()}`); skipped++; continue }
  }
  changed++
}
console.log(`\n${APPLY ? 'APPLIED' : 'DRY RUN'}: ${changed} repaired, ${skipped} skipped`)
console.log(`known-false (left alone): ${Object.keys(KNOWN_FALSE).join(', ')}`)
