#!/usr/bin/env node
/**
 * assign.mjs — the fixed per-author assignment for iTEP SLATE Grammar v3, the top-up
 * (ITEP-SLATE-GRAMMAR-V3.prereg.md §1). Written and run BEFORE any author is spawned. Deterministic;
 * re-running reproduces the same files.
 *
 *   node scripts/study-bank/itep-grammar-v3-work/assign.mjs           # writes ASSIGNED.json + authors/<X>.md
 *   node scripts/study-bank/itep-grammar-v3-work/assign.mjs --check   # exits 1 if the files on disk differ
 *
 * 7 authors (A..G): A-F write 3 Part 1 + 10 Part 2, G writes 2 + 10 = 20 Part 1 + 70 Part 2,
 * ids ITG3-C001..C020 / ITG3-E001..E070. The category and sub-point menu is v2's (copied below, unchanged);
 * v3 changes only WHICH entries are handed out:
 *   - Part 2 never gets "modifier placement" (pending lesson 8: its errors live between segments) and never
 *     gets a sub-point excluded below (lessons 8-10 and the v2 item-ground drops); Part 1 gets one modifier item.
 *   - Each sub-point is held by at most one item in the whole batch, and sub-points that test the SAME rule
 *     under two category labels share a conflict group, of which the batch holds at most one (lesson 10).
 *   - Within an author, the 13 items use 13 different categories (no category in both parts).
 *   - Part 2 key slot: overall A18 B18 C17 D17, per author 3/3/2/2. Length rank likewise. Packets are
 *     balanced again at the deal (build-packets.mjs), which is where v2 failed.
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { rng, shuffleWith } from '../seeded-shuffle.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const seedOf = s => parseInt(createHash('sha256').update(s).digest('hex').slice(0, 8), 16)
const AUTHORS = 'ABCDEFG'.split('')
const P1 = 'Part 1: Sentence Completion', P2 = 'Part 2: Error Identification'

// ---- v2 menu, copied verbatim from itep-grammar-v2-work/assign.mjs ----
const CATS = [
  'verb tense and aspect', 'subject-verb agreement', 'pronoun case and reference', 'relative pronouns and clauses',
  'comparatives and superlatives', 'gerund vs infinitive', 'conditionals', 'passive voice', 'modals',
  'count/non-count and quantifiers', 'adjective vs adverb', 'prepositions after a head word',
  'conjunctions and connectors', 'parallel structure', 'word form', 'reported speech', 'modifier placement',
]
const NO_EASY = new Set(['conditionals', 'reported speech', 'parallel structure', 'modifier placement'])
const SUB = {
  'verb tense and aspect': ['past simple vs present perfect, decided by a time marker (yesterday / ever / just / already / so far)', 'past continuous vs past simple for an interrupted action (when / while)', 'past perfect vs past simple for an earlier past event (before / after / by the time)', 'present continuous vs present simple (now / these days vs habit), including a stative verb', 'will vs be going to vs present continuous for a fixed arrangement', 'present perfect continuous vs present perfect (duration vs completed result)', 'present tense in a future time clause (when / as soon as / until + present, not will)', 'used to vs past simple vs be used to + -ing', 'future perfect and future continuous (by next June / this time tomorrow)', 'irregular past and past-participle forms of common verbs in simple and perfect tenses'],
  'subject-verb agreement': ['third-person -s with a singular subject (a name, each / every + noun)', 'agreement across a prepositional phrase (the box of pencils is)', 'there is / there are with the noun that follows', 'compound subject with "and" vs a subject followed by "as well as / along with"', 'indefinite pronouns as subjects (everyone, nobody, something + singular verb); verb only, never a later pronoun', 'gerund or noun-clause subjects (Swimming every day keeps ...; What she needs is ...)', 'agreement in questions and in inverted order (Where are ...? Here comes ...)', 'singular nouns ending in -s and amounts (news, physics, ten dollars is)', '"the number of" (singular) vs "a number of" (plural)', 'a long subject separated from its verb by a relative clause'],
  'pronoun case and reference': ['subject vs object pronoun after verbs and prepositions (for him, with us)', 'possessive adjective vs possessive pronoun (their / theirs, your / yours)', 'reflexive pronouns (himself, themselves, by herself; never "hisself")', 'pronouns inside a compound subject or object (my sister and I / my sister and me)', 'demonstratives agreeing with noun number (this / these, that / those)', 'one / ones and another / other / others', 'each other vs themselves (reciprocal vs reflexive)', 'object pronoun position with a separable phrasal verb (pick it up, not pick up it)', 'some- / any- / no- compounds in negatives and questions (anything vs nothing; no double negative)', 'mine / yours / hers and the "a friend of mine" pattern'],
  'relative pronouns and clauses': ['who vs which (people vs things)', 'whose for possession', 'where and when as relative adverbs', 'an extra pronoun repeated inside the relative clause, or a relative pronoun wrongly dropped as a subject', '"which" after a comma (non-restrictive) vs "that"', 'preposition + which (the box in which ...)', 'reduced relative clauses with -ing or -ed participles', '"what" vs "that / which" (the thing that = what)', '"some of which / many of which / most of which" for things', 'a which-clause that comments on a whole clause (..., which made everyone laugh)'],
  'comparatives and superlatives': ['-er / -est vs more / most by syllable count', 'irregular forms (better, worse, farther, best, worst)', 'as ... as vs comparative + than; the same as', 'double comparatives (more taller) and much / far + comparative', 'the + superlative + in / of (the tallest in the class)', '"the more ..., the more ..." correlative comparatives', 'comparing like with like (than that of / than those of)', 'comparative forms of adverbs (more quickly, faster, harder)', '"one of the + superlative + plural noun"', 'not as / so ... as and twice / three times as ... as'],
  'gerund vs infinitive': ['verbs followed by a gerund (enjoy, finish, avoid, mind, keep)', 'verbs followed by an infinitive (decide, hope, plan, refuse, agree)', 'preposition + gerund (interested in, good at, before, without)', 'stop / remember / forget / try with a gerund vs an infinitive (meaning changes)', '"to" as a preposition + -ing (look forward to, be used to, object to)', 'adjective + infinitive and too / enough + infinitive', 'verb + object + infinitive (want / ask / tell someone to) vs make / let + bare infinitive', 'purpose infinitive (to / in order to) vs "for + -ing"', 'gerund subject vs "It is ... to + infinitive"', 'perception verbs + object + bare infinitive or -ing (saw her leave / leaving)'],
  'conditionals': ['zero conditional for general truths', 'first conditional (if + present, will)', 'second conditional (if + past, would)', 'third conditional (if + past perfect, would have)', 'mixed conditional (past condition, present result)', 'unless / as long as / provided that', 'wish + past perfect, and wish ... would (never "I wish I was / were")', 'inverted conditionals (Had I known ..., Should you need ...)', '"in case" vs "if", and "otherwise"', 'conditionals with modals (if ..., you can / might; could have)'],
  'passive voice': ['present simple passive (is made, are sold)', 'past simple passive (was built, were invented), including "was born"', 'present perfect passive (has been repaired)', 'passive with a modal (must be returned, can be seen)', 'continuous passive (is being painted, was being repaired)', 'active form wrongly used where the subject receives the action (the letter wrote -> was written)', 'passive of verbs with two objects (was given a prize, was sent a letter)', '"It is said that ..." / "is believed to ..."', 'causative have / get something done', 'passive infinitive and passive gerund (wants to be chosen, enjoys being asked)'],
  'modals': ['can / could for ability (present vs past)', 'must vs have to; mustn\'t vs don\'t have to', 'should / ought to / had better for advice', 'might / may / could for possibility', 'must have / can\'t have for deduction about the past', 'could have / might have for an unrealised past possibility', 'would for polite requests and would rather', 'need to / don\'t need to / needn\'t', 'be able to where "can" has no form (will be able to, has been able to)', 'modal + bare infinitive form (can swim, never "can to swim" / "can swims")'],
  'count/non-count and quantifiers': ['much vs many', 'a few / a little / few / little', 'some vs any in statements, questions and negatives', 'a lot of / plenty of / a great deal of with count and non-count nouns', 'each / every + singular vs all + plural', 'non-count nouns that take no plural (advice, furniture, equipment, luggage) and "a piece of"', 'both / either as quantifiers with "of" (form only; no neither, no agreement question)', 'no / none / not any', 'enough / too much / too many', '"a number of" vs "an amount of", and "several"'],
  'adjective vs adverb': ['-ly adverb after an action verb', 'adjective after a linking verb (seems, smells, feels, looks)', 'good vs well', 'hard / hardly, late / lately, near / nearly', '-ed vs -ing adjectives (bored / boring)', 'adverb modifying an adjective (surprisingly easy, really quiet)', 'order of adjectives before a noun', 'adjectives that end in -ly (friendly, lovely, lonely) vs adverbs', 'position of frequency adverbs (always, never, usually)', 'so vs such, and the position of "enough"'],
  'prepositions after a head word': ['adjective + preposition (afraid of, proud of, good at)', 'verb + preposition (depend on, listen to, belong to)', 'noun + preposition (reason for, interest in, solution to)', 'prepositions of time with dates, days and clock times (in / on / at)', 'prepositions of place (in / on / at with buildings, streets, vehicles)', 'a preposition wrongly added after a verb that takes none (discuss, reach, enter, marry)', 'phrasal verb particles (look after, give up, find out)', 'by vs until; for vs since vs during', 'adjectives of feeling + preposition (excited about, tired of, worried about, responsible for)', 'fixed expressions (on purpose, by accident, in time vs on time, at least)'],
  'conjunctions and connectors': ['and / but / or / so', 'because vs because of; although vs despite', 'unless / until / while / whereas', 'however / therefore / moreover as sentence connectors', 'both ... and / not only ... but also (form only, no agreement question)', 'so that (purpose) vs so (result)', 'even though vs even if vs though', 'as soon as / once / by the time', 'whether vs if (whether or not; whether after a preposition)', 'instead of / rather than / except'],
  'parallel structure': ['a list of infinitives', 'a list of gerunds', 'a list of adjectives with one noun intruder', 'parallel halves of a correlative pair', 'prefer X to Y with matching forms', 'parallel that-clauses', 'matching tenses in a compound predicate', 'parallel noun phrases in a list', 'parallel forms after than / as', 'a list of imperative steps'],
  'word form': ['noun vs adjective of one root (danger / dangerous)', 'verb vs noun of one root (decide / decision)', 'noun suffix choice (-tion / -ment / -ness)', 'negative prefixes (un- / im- / dis- / in-)', '-ful vs -less adjectives (the root "care" is excluded)', 'verbs formed with -en / -ize / -ify (widen, realize, simplify)', 'person nouns (-er / -or / -ist / -ian)', 'adjective suffixes (-able / -ive / -ous)', 'compound adjectives with numbers (a ten-year-old boy, a two-hour trip)', 'noun / verb pairs that differ in spelling (advice / advise, choice / choose, loss / lose, proof / prove)'],
  'reported speech': ['tense backshift in reported statements', 'word order in reported wh-questions', 'reported commands and requests (told us to / not to)', 'say vs tell', 'modal backshift (will -> would, can -> could, may -> might)', 'reported yes/no questions with if / whether', 'reporting verbs with their patterns (suggested that we go, advised us to, apologized for)', 'reporting verb + object + that (promised / warned / reminded someone that)', 'pronoun and possessive shifts', 'past perfect for a reported past simple or present perfect'],
  'modifier placement': ['a dangling -ing opening phrase', 'a misplaced prepositional phrase that attaches to the wrong noun', 'a dangling infinitive opener (To win ..., ...)', 'a relative clause placed far from its noun', 'a dangling -ed participle opener (Built in 1900, ...)', 'a reduced "while / when + -ing" opener', 'an "after / before + -ing" opener whose subject is wrong', 'an appositive opener (A talented painter, Mia ...)', 'a participial phrase at the end that attaches to the wrong noun', 'an "As a + noun" opener whose subject does not match'],
}
// ---- end of v2 menu ----

// Eligible sub-point indices per category for v3, and why the rest are out.
const ELIGIBLE = {
  'verb tense and aspect': [0, 1, 6, 8, 9],          // out: 2 past perfect optional after before/after (C035), 3 stative nuance, 4 will/going to nuance, 5 aspect nuance (E066), 7 = gerund 4 rule
  'subject-verb agreement': [0, 1, 2, 3, 4, 5, 6, 7, 9],  // out: 8 "the number of" (same rule as quantifiers 9)
  'pronoun case and reference': [0, 1, 2, 3, 4, 5, 6, 8, 9], // out: 7 forces a dead option (v2 C103)
  'relative pronouns and clauses': [0, 1, 2, 3, 5, 7, 8, 9], // out: 4 restrictive which/that is disputed, 6 reduced relatives attach ambiguously
  'comparatives and superlatives': [0, 1, 2, 3, 4, 5, 7, 8, 9], // out: 6 like-with-like is a logic error between segments
  'gerund vs infinitive': [0, 1, 2, 4, 5, 6, 8, 9],  // out: 3 meaning changes (two readings), 7 purpose "for -ing" (E094, lesson 10)
  'conditionals': [1, 2, 3, 4, 5, 7, 9],             // out: 0 zero/first both acceptable, 6 wish (banned-point neighbour), 8 in case nuance
  'passive voice': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  'modals': [0, 1, 4, 6, 8, 9],                     // out: 2 and 3 near-synonyms, 5 nuance, 7 needn't logic clash (E086)
  'count/non-count and quantifiers': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  'adjective vs adverb': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  'prepositions after a head word': [0, 1, 2, 3, 4, 5, 6, 7, 8], // out: 9 in time / on time nuance
  'conjunctions and connectors': [0, 1, 2, 3, 4, 5, 7, 8, 9],    // out: 6 even though / even if nuance
  'parallel structure': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  'word form': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  'reported speech': [1, 2, 3, 4, 5, 6, 7, 8, 9],   // out: 0 backshift is optional for still-true facts
  'modifier placement': [4, 1, 7],                   // Part 1 only
}
// Same rule under two labels: at most one member of a group in the batch.
const GROUPS = [
  ['count/non-count and quantifiers', 9, 'number-of'], ['subject-verb agreement', 8, 'number-of'],
  ['conjunctions and connectors', 4, 'correlative'], ['parallel structure', 3, 'correlative'],
  ['conjunctions and connectors', 8, 'whether'], ['reported speech', 5, 'whether'],
  ['gerund vs infinitive', 5, 'enough'], ['adjective vs adverb', 9, 'enough'], ['count/non-count and quantifiers', 8, 'enough'],
  ['subject-verb agreement', 5, 'gerund-subject'], ['gerund vs infinitive', 8, 'gerund-subject'],
  ['comparatives and superlatives', 7, 'adverb-form'], ['adjective vs adverb', 0, 'adverb-form'],
  ['reported speech', 2, 'verb-obj-inf'], ['reported speech', 6, 'verb-obj-inf'], ['gerund vs infinitive', 6, 'verb-obj-inf'],
  ['verb tense and aspect', 6, 'future-clause'], ['conditionals', 1, 'future-clause'], ['conjunctions and connectors', 7, 'future-clause'],
  ['prepositions after a head word', 7, 'for-since'], ['verb tense and aspect', 0, 'for-since'],
  ['gerund vs infinitive', 2, 'prep-gerund'], ['gerund vs infinitive', 4, 'prep-gerund'],
  ['passive voice', 9, 'passive-nonfinite'], ['gerund vs infinitive', 9, 'perception'],
]
const groupOf = (cat, i) => (GROUPS.find(g => g[0] === cat && g[1] === i) || [])[2]

// Part 2: 70 tokens over the 16 categories other than modifier placement; six get 5, ten get 4.
const P2_FIVE = new Set(['subject-verb agreement', 'passive voice', 'pronoun case and reference', 'comparatives and superlatives', 'prepositions after a head word', 'word form'])
const TOPICS = [
  'books, libraries and writing: the school library, book clubs, the school newspaper, poems, letters to pen pals',
  'health and the body: sleep, exercise habits, the school nurse, healthy snacks, a visit to the dentist',
  'zoos, aquariums and wildlife centres: keepers, feeding times, animal facts, rescue centres, visitor rules',
  'money, saving and small business: pocket money, saving for something, a class fundraiser stall, prices, a second-hand market',
  'space and the night sky: planets, the planetarium, stargazing, telescopes, astronauts',
  'jobs and careers: careers day, job shadowing, a part-time job, interviews for a club role, what adults do at work',
  'celebrations and holidays: birthdays, New Year, cultural festivals, gifts, decorations, a family tradition',
]
const FRAMES = [
  ["a librarian's notice", 'a student reviewing a book', 'an email to a pen pal'],
  ["advice from the school nurse", 'a fitness diary entry', 'a poster about healthy habits'],
  ["a keeper's talk to visitors", "a visitor's question and the answer", 'a fact sheet about one animal'],
  ['a plan for a class fundraiser stall', 'a conversation about pocket money', 'a receipt or price list being explained'],
  ['a planetarium guide speaking', 'a stargazing club newsletter', "a student's report on a planet"],
  ['a careers-day speaker', 'a job-shadowing diary entry', 'instructions from a supervisor at a part-time job'],
  ['an invitation', 'a description of a family tradition', 'a plan for a school celebration'],
]
// Disjoint lists; none appears in the 199 banked items or in any v1/v2 name list.
const NAMES = [
  ['Adaeze', 'Henrik', 'Mariko', 'Santiago', 'Noor', 'Joon-ho', 'Esther', 'Kalani', 'Dmitri', 'Tamsin', 'Ms. Achebe', 'Mr. Lindgren'],
  ['Obinna', 'Saoirse', 'Takumi', 'Valentina', 'Idris', 'Ha-eun', 'Magnus', 'Zainab', 'Ciaran', 'Leilani', 'Ms. Fontaine', 'Dr. Okoye'],
  ['Chiara', 'Kenta', 'Amina', 'Lars', 'Soo-ah', 'Gabriel', 'Thandiwe', 'Rustam', 'Pia', 'Mateus', 'Mr. Halvorsen', 'Ms. Quispe'],
  ['Yaw', 'Ottilie', 'Daichi', 'Esperanza', 'Hamza', 'Ji-woo', 'Annika', 'Lwazi', 'Nikolai', 'Ximena', 'Mrs. Abara', 'Mr. Dubois'],
  ['Akosua', 'Benedikt', 'Fumiko', 'Rodrigo', 'Samira', 'Do-yun', 'Liesel', 'Jabari', 'Oksana', 'Tevita', 'Ms. Ishikawa', 'Mr. Gruber'],
  ['Efua', 'Casimir', 'Ayaka', 'Emilio', 'Rania', 'Seung-min', 'Maren', 'Kwesi', 'Yelena', 'Mosese', 'Ms. Delacroix', 'Mr. Bakshi'],
  ['Ngozi', 'Florian', 'Misaki', 'Joaquin', 'Farah', 'Eun-ji', 'Solveig', 'Tendai', 'Anouk', 'Ilias', 'Mrs. Mbeki', 'Mr. Szabo'],
]
const BANNED_FRAMES = [
  '"should have (been) + participle ..., but nobody remembered" (an earlier batch)',
  '"If <name> had followed the rules / studied harder, <name> would have ..." (an earlier batch)',
  '"By the time we arrived, the movie / train had already started / left"',
  '"<name> told me that her brother had left ..." (an earlier batch)',
  '"The book that I borrowed from the library ..."',
  '"Each of the students has ..."',
  '"a toolbox for fixing ...", "needn\'t have brought ... left them at home" (an earlier batch)',
  'a microscope, an onion skin, a science fair, a school play, a bake sale, a football match (heavily used in earlier batches)',
]

function build() {
  const rand = rng(seedOf('itep-grammar-v3:assign'))
  // Part 2 categories: tokens grouped by category, dealt cyclically, so no author holds a category twice.
  const p2cats = CATS.filter(c => c !== 'modifier placement')
  const tokens = p2cats.flatMap(c => Array(P2_FIVE.has(c) ? 5 : 4).fill(c))
  if (tokens.length !== 70) throw new Error('p2 tokens ' + tokens.length)
  const p2 = AUTHORS.map(() => [])
  tokens.forEach((c, i) => p2[i % 7].push(c))
  // Part 1: 20 items; each author's categories must avoid its Part 2 categories. Seeded search.
  const p1n = [3, 3, 3, 3, 3, 3, 2]
  let p1 = null
  for (let t = 0; t < 5000 && !p1; t++) {
    const r = rng(seedOf('itep-grammar-v3:p1#' + t))
    const use = Object.fromEntries(CATS.map(c => [c, 0]))
    use['modifier placement'] = -1 // exactly one modifier item, placed first
    const out = AUTHORS.map(() => [])
    let ok = true
    const order = shuffleWith(AUTHORS.map((_, i) => i), r)
    const modAuthor = order.find(i => !p2[i].includes('modifier placement'))
    out[modAuthor].push('modifier placement'); use['modifier placement'] = 1
    for (const i of order) {
      while (out[i].length < p1n[i]) {
        const free = shuffleWith(CATS.filter(c => !p2[i].includes(c) && !out[i].includes(c) && c !== 'modifier placement' && use[c] < Math.min(2, ELIGIBLE[c].length - tokens.filter(x => x === c).length)), r)
        free.sort((a, b) => use[a] - use[b])
        if (!free.length) { ok = false; break }
        out[i].push(free[0]); use[free[0]]++
      }
      if (!ok) break
    }
    if (ok) p1 = out
  }
  if (!p1) throw new Error('no Part 1 assignment')
  // Sub-points: per category, next eligible index not yet used, skipping a used conflict group.
  const usedIdx = Object.fromEntries(CATS.map(c => [c, new Set()])), usedGroup = new Set()
  const pick = cat => {
    const el = [...ELIGIBLE[cat]].sort((a, b) => (groupOf(cat, a) ? 1 : 0) - (groupOf(cat, b) ? 1 : 0))
    for (const i of el) {
      const g = groupOf(cat, i)
      if (usedIdx[cat].has(i) || (g && usedGroup.has(g))) continue
      usedIdx[cat].add(i); if (g) usedGroup.add(g); return i
    }
    throw new Error('ran out of sub-points for ' + cat)
  }
  const items = []
  let cN = 0, eN = 0
  const slotPair = i => (i % 2 === 0 ? ['A', 'B'] : ['C', 'D'])
  const rankPair = i => (i % 2 === 0 ? [1, 2] : [3, 4])
  AUTHORS.forEach((A, ai) => {
    // Part 1 (slots and ranks only satisfy the pre-flight; Part 1 is reshuffled at the deal and at draw)
    const n1 = p1[ai].length
    const l1 = shuffleWith(['A', 'B', 'C', 'D'], rand).slice(0, n1), r1 = shuffleWith([1, 2, 3, 4], rand).slice(0, n1)
    const d1 = shuffleWith(['easy', 'medium', 'hard'], rand).slice(0, n1)
    p1[ai].forEach((cat, k) => {
      let diff = d1[k]
      if (diff === 'easy' && NO_EASY.has(cat)) diff = 'medium'
      items.push({ id: `ITG3-C${String(++cN).padStart(3, '0')}`, author: A, part: P1, slot: l1[k], len: r1[k], difficulty: diff, category: cat, sub_point: null })
    })
    // Part 2
    const letters = shuffleWith(['A', 'B', 'C', 'D', 'A', 'B', 'C', 'D', ...slotPair(ai)], rand)
    const ranks = shuffleWith([1, 2, 3, 4, 1, 2, 3, 4, ...rankPair(ai + 1)], rand)
    const dc = [{ easy: 3, medium: 4, hard: 3 }, { easy: 3, medium: 3, hard: 4 }, { easy: 4, medium: 3, hard: 3 }][ai % 3]
    const cats = shuffleWith([...p2[ai]], rand)
    const diff = {}
    const easyOK = cats.filter(c => !NO_EASY.has(c))
    easyOK.slice(0, dc.easy).forEach(c => { diff[c] = 'easy' })
    shuffleWith(cats.filter(c => !diff[c]), rand).forEach((c, k) => { diff[c] = k < dc.medium ? 'medium' : 'hard' })
    cats.forEach((cat, k) => {
      items.push({ id: `ITG3-E${String(++eN).padStart(3, '0')}`, author: A, part: P2, slot: letters[k], len: ranks[k], difficulty: diff[cat], category: cat, sub_point: null })
    })
  })
  // Scarcest categories (fewest spare eligible sub-points) choose first; ungrouped sub-points before grouped ones.
  const need = c => items.filter(i => i.category === c).length
  const order = [...CATS].sort((a, b) => (ELIGIBLE[a].length - need(a)) - (ELIGIBLE[b].length - need(b)) || CATS.indexOf(a) - CATS.indexOf(b))
  for (const c of order) for (const it of items.filter(i => i.category === c)) it.sub_point = SUB[c][pick(c)]
  return items
}

function authorMd(A, ai, items) {
  const mine = items.filter(i => i.author === A)
  const n1 = mine.filter(i => i.part === P1).length, n2 = mine.length - n1
  const row = i => `| ${i.id} | ${i.slot} | ${i.len} | ${i.difficulty} | ${i.category} | ${i.sub_point} |`
  const head = '| id | slot | len | difficulty | category | your owned grammar point for this category |\n|---|---|---|---|---|---|'
  return `# Assignment for author ${A} (iTEP SLATE Grammar v3 batch, brief itep-slate-grammar-v1, frozen)

This file and the brief are the only two files you read. Your assignment below REPLACES the brief's "24 items"
count, its id list and its "Assigned per item" table. Every other rule in the brief applies unchanged.

- **Items:** ${n1} Part 1 + ${n2} Part 2 = ${mine.length} items, the ids below.
- **Topic pool (only these settings):** ${TOPICS[ai]}.
- **Names (only these; each name in at most ONE of your items; you may also write sentences with no name):**
  ${NAMES[ai].join(', ')}.
- **Your discourse frames.** Write at least 6 of your ${mine.length} sentences as one of these, and spread them:
  ${FRAMES[ai].map(f => `"${f}"`).join('; ')}.
- **Owned grammar points.** Each row names the one grammar point you must test in that row's category. Other
  authors are writing other points; keep to yours.
- **No two of your items** may share a key word root (careful / carefully count as one root), a named person, or a
  clause frame (the same skeleton with different nouns). Start no more than two items with the same word.
- **Do not use any of these frames or contents:**
${BANNED_FRAMES.map(b => `  - ${b}`).join('\n')}

## Part 1: Sentence Completion

${head}
${mine.filter(i => i.part === P1).map(row).join('\n')}

## Part 2: Error Identification

${head}
${mine.filter(i => i.part === P2).map(row).join('\n')}
`
}

const items = build()
const files = { 'ASSIGNED.json': JSON.stringify(items, null, 1) + '\n' }
AUTHORS.forEach((A, ai) => { files[`authors/${A}.md`] = authorMd(A, ai, items) })
if (process.argv.includes('--check')) {
  const bad = Object.entries(files).filter(([f, t]) => !existsSync(join(HERE, f)) || readFileSync(join(HERE, f), 'utf8') !== t)
  if (bad.length) { console.error(`assign --check: differs: ${bad.map(b => b[0]).join(', ')}`); process.exit(1) }
  console.log('assign --check: files match'); process.exit(0)
}
// Self-checks before writing.
const die = m => { console.error('assign: ' + m); process.exit(1) }
if (items.some(i => i.part === P2 && i.category === 'modifier placement')) die('modifier placement in Part 2')
if (items.some(i => i.difficulty === 'easy' && NO_EASY.has(i.category))) die('easy item on a no-easy category')
const subKey = items.map(i => i.category + '|' + i.sub_point)
if (new Set(subKey).size !== subKey.length) die('a sub-point is held twice')
for (const A of AUTHORS) { const c = items.filter(i => i.author === A).map(i => i.category); if (new Set(c).size !== c.length) die(`author ${A} repeats a category`) }
mkdirSync(join(HERE, 'authors'), { recursive: true })
for (const [f, t] of Object.entries(files)) writeFileSync(join(HERE, f), t)
for (const part of [P1, P2]) {
  const it = items.filter(i => i.part === part)
  const tally = k => it.reduce((m, i) => ({ ...m, [i[k]]: (m[i[k]] || 0) + 1 }), {})
  console.log(`${part}: n=${it.length} slot ${JSON.stringify(tally('slot'))} len ${JSON.stringify(tally('len'))} difficulty ${JSON.stringify(tally('difficulty'))}`)
  console.log('  per category', JSON.stringify(tally('category')))
}
console.log(`wrote ASSIGNED.json (${items.length}) and ${AUTHORS.length} author files`)
