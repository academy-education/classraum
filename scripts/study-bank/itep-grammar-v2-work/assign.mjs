#!/usr/bin/env node
/**
 * assign.mjs — the fixed per-author assignment for iTEP SLATE Grammar v2 (ITEP-SLATE-GRAMMAR-V2.prereg.md §1).
 * Written and run BEFORE any author is spawned. Deterministic (seeded); re-running reproduces the same files.
 *
 *   node scripts/study-bank/itep-grammar-v2-work/assign.mjs           # writes ASSIGNED.json + authors/<X>.md
 *   node scripts/study-bank/itep-grammar-v2-work/assign.mjs --check   # exits 1 if the files on disk differ
 *
 * 10 authors (A..J) x (13 Part 1 + 12 Part 2) = 130 + 120 = 250 items, ids ITG2-C001..C130 / ITG2-E001..E120.
 * Per author: a disjoint topic pool, a disjoint name list (pilot names excluded), three disjoint discourse
 * frames, and per category ONE owned grammar sub-point that no other author holds. Categories come from a
 * cyclic window over the brief's 17, so an author uses each category at most once per part (the brief's
 * "no two items test the same grammar point within a part" holds per author). Key slot and key length rank are
 * balanced per author per part; difficulty is drawn so that categories with no A1-A2 form are never "easy".
 */
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { rng, shuffleWith } from '../seeded-shuffle.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const seedOf = s => parseInt(createHash('sha256').update(s).digest('hex').slice(0, 8), 16)
const AUTHORS = 'ABCDEFGHIJ'.split('')
const P1 = 'Part 1: Sentence Completion', P2 = 'Part 2: Error Identification'

// The brief's 17 categories, in the brief's order. NO_EASY: no natural A1-A2 version.
const CATS = [
  'verb tense and aspect', 'subject-verb agreement', 'pronoun case and reference', 'relative pronouns and clauses',
  'comparatives and superlatives', 'gerund vs infinitive', 'conditionals', 'passive voice', 'modals',
  'count/non-count and quantifiers', 'adjective vs adverb', 'prepositions after a head word',
  'conjunctions and connectors', 'parallel structure', 'word form', 'reported speech', 'modifier placement',
]
const NO_EASY = new Set(['conditionals', 'reported speech', 'parallel structure', 'modifier placement'])

// Owned sub-points: SUB[category][authorIndex]. No two authors share one. Disputed usages (brief rule 4) were
// left out on purpose (collective-noun number, either/or and neither agreement, "one of the ... who", only-placement,
// no-backshift for general truths, singular they).
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

const TOPICS = [
  'school subjects and classroom life: maths, the science lab, art class, homework, exams',
  'sports and PE: team practice, tournaments, swimming, running, coaches',
  'family and home: chores, relatives, meals at home, moving house, pets at home',
  'travel and transport: trains, buses, airports, maps, holidays abroad',
  'food and cooking: recipes, markets, restaurants, baking, school lunch',
  'nature and weather: animals, parks, gardens, seasons, camping outdoors',
  'music, theatre and art: concerts, school plays, festivals, museums of art, dance',
  'technology: computers, apps, coding club, robots, inventions, video calls',
  'simple history and geography facts: old buildings, rivers, maps of countries, explorers, a town museum',
  'community and clubs: volunteering, the neighbourhood, shops, the post office, a youth centre',
]
const FRAMES = [
  ['a teacher\'s instruction in class', 'a student describing a test or a lesson', 'a note about a school timetable'],
  ['a match report', 'a coach\'s advice to a player', 'a training plan for the week'],
  ['a parent asking a child to do something', 'a story about a family visit', 'a description of a daily routine at home'],
  ['an announcement at a station or airport', 'a postcard or message from a trip', 'directions to a place'],
  ['steps in a recipe', 'a review of a meal or a cafe', 'a conversation at a market stall'],
  ['a field-trip observation', 'a weather report or forecast', 'a description of how an animal or plant lives'],
  ['a programme note or poster for a show', 'a performer describing a rehearsal', 'a reaction to a performance'],
  ['instructions for using a device or app', 'a description of how something was built or fixed', 'a message in a group chat about a project'],
  ['a museum label or guide speaking', 'a fact about a place or a past event', 'a student\'s summary of a history lesson'],
  ['a notice on a community board', 'a volunteer describing a task', 'a conversation with a neighbour or shopkeeper'],
]
// Disjoint name lists. Pilot names (Okafor, Priya, Diaz, Omar, Diego, Kenji, Mei, Daniela, Hana) are excluded.
const NAMES = [
  ['Amara', 'Lucas', 'Yuna', 'Tomas', 'Leila', 'Kwame', 'Ingrid', 'Ravi', 'Sofia', 'Jun', 'Ms. Haddad', 'Mr. Petrov'],
  ['Mateo', 'Aisha', 'Noah', 'Sakura', 'Emeka', 'Freya', 'Arjun', 'Lina', 'Tariq', 'Bella', 'Coach Nakamura', 'Ms. Ferreira'],
  ['Zara', 'Felix', 'Nia', 'Hiro', 'Elena', 'Malik', 'Astrid', 'Dev', 'Rosa', 'Kai', 'Aunt Lucia', 'Uncle Bao'],
  ['Ines', 'Samuel', 'Aiko', 'Pablo', 'Fatima', 'Erik', 'Meera', 'Chidi', 'Clara', 'Min-jun', 'Mr. Kowalski', 'Ms. Osei'],
  ['Layla', 'Marco', 'Rin', 'Ahmed', 'Greta', 'Sunil', 'Ana', 'Tobi', 'Nora', 'Wei', 'Chef Moreau', 'Mrs. Adeyemi'],
  ['Maya', 'Oscar', 'Keiko', 'Yusuf', 'Hanna', 'Rohan', 'Lucia', 'Ade', 'Elsa', 'Tae-yang', 'Ranger Silva', 'Dr. Lindqvist'],
  ['Chloe', 'Javier', 'Emi', 'Karim', 'Lotte', 'Vikram', 'Paula', 'Femi', 'Iris', 'Seo-yeon', 'Mr. Okonkwo', 'Ms. Varga'],
  ['Elif', 'Bruno', 'Natsuki', 'Hassan', 'Mia', 'Nikhil', 'Carmen', 'Kofi', 'Linnea', 'Jae', 'Mr. Andersson', 'Ms. Rahman'],
  ['Selin', 'Rafael', 'Haruka', 'Omari', 'Vera', 'Anil', 'Beatriz', 'Sipho', 'Alma', 'Ji-ho', 'Professor Mensah', 'Ms. Novak'],
  ['Talia', 'Andre', 'Yui', 'Bilal', 'Johanna', 'Kiran', 'Lupe', 'Nnamdi', 'Ebba', 'Hyun-woo', 'Mr. Castillo', 'Mrs. Yamamoto'],
]

// Stock frames no author may use (the pilot's own frames, plus frames model authors converge on).
const BANNED_FRAMES = [
  '"should have (been) + participle ..., but nobody remembered" (a pilot frame)',
  '"If <name> had followed the rules / studied harder, <name> would have ..." (a pilot frame)',
  '"By the time we arrived, the movie / train had already started / left"',
  '"<name> told me that her brother had left ..." (a pilot frame)',
  '"famous for its old maps", "information about volcanoes", "a tent behind our house" (pilot content)',
  '"The book that I borrowed from the library ..."',
  '"Each of the students has ..."',
  '"Since his knee injury / Since her laptop broke ..." openers (pilot content)',
]

function main() {
  const rand = rng(seedOf('itep-grammar-v2:assign'))
  const items = []
  let cN = 0, eN = 0
  AUTHORS.forEach((A, ai) => {
    // Category windows: Part 1 takes 13 consecutive categories from offset ai*7, Part 2 takes 12 from ai*7+5.
    const win = (start, n) => Array.from({ length: n }, (_, k) => CATS[(start + k) % CATS.length])
    for (const [part, n, start] of [[P1, 13, ai * 7], [P2, 12, ai * 7 + 5]]) {
      const cats = win(start, n)
      const letters = shuffleWith([...'ABCD'.repeat(3), ...(n === 13 ? ['ABCD'[ai % 4]] : [])], rand)
      const ranks = shuffleWith([1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4, ...(n === 13 ? [1 + ((ai + 2) % 4)] : [])], rand)
      // Difficulty: 13 -> 4/5/4 or 5/4/4 (rotating), 12 -> 4/4/4. "easy" only on easy-capable categories.
      const counts = n === 12 ? { easy: 4, medium: 4, hard: 4 } : [{ easy: 4, medium: 5, hard: 4 }, { easy: 5, medium: 4, hard: 4 }, { easy: 4, medium: 4, hard: 5 }][ai % 3]
      const order = shuffleWith(cats.map((c, i) => i), rand)
      const diff = new Array(n)
      const easyOK = order.filter(i => !NO_EASY.has(cats[i]))
      easyOK.slice(0, counts.easy).forEach(i => { diff[i] = 'easy' })
      const rest = shuffleWith(order.filter(i => !diff[i]), rand)
      rest.forEach((i, k) => { diff[i] = k < counts.medium ? 'medium' : 'hard' })
      const catOrder = shuffleWith(cats.map((c, i) => i), rand) // item order within the author's ids
      catOrder.forEach((ci, k) => {
        const id = part === P1 ? `ITG2-C${String(++cN).padStart(3, '0')}` : `ITG2-E${String(++eN).padStart(3, '0')}`
        items.push({ id, author: A, part, slot: letters[k], len: ranks[k], difficulty: diff[ci], category: cats[ci], sub_point: SUB[cats[ci]][ai] })
      })
    }
  })
  return items
}

function authorMd(A, ai, items) {
  const mine = items.filter(i => i.author === A)
  const row = i => `| ${i.id} | ${i.slot} | ${i.len} | ${i.difficulty} | ${i.category} | ${i.sub_point} |`
  const head = '| id | slot | len | difficulty | category | your owned grammar point for this category |\n|---|---|---|---|---|---|'
  return `# Assignment for author ${A} (iTEP SLATE Grammar v2 batch, brief itep-slate-grammar-v1, frozen)

This file and the brief are the only two files you read. Your assignment below REPLACES the brief's "24 items"
count, its id list and its "Assigned per item" table. Every other rule in the brief applies unchanged.

- **Items:** 13 Part 1 + 12 Part 2 = 25 items, the ids below.
- **Topic pool (only these settings):** ${TOPICS[ai]}.
- **Names (only these; each name in at most ONE of your items; you may also write sentences with no name):**
  ${NAMES[ai].join(', ')}.
- **Your discourse frames.** Write at least 12 of your 25 sentences as one of these, and spread them:
  ${FRAMES[ai].map(f => `"${f}"`).join('; ')}.
- **Owned grammar points.** Each row names the one grammar point you must test in that row's category. Nine other
  authors are writing the other points of every category; keep to yours.
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

const items = main()
const files = { 'ASSIGNED.json': JSON.stringify(items, null, 1) + '\n' }
AUTHORS.forEach((A, ai) => { files[`authors/${A}.md`] = authorMd(A, ai, items) })
if (process.argv.includes('--check')) {
  const bad = Object.entries(files).filter(([f, t]) => !existsSync(join(HERE, f)) || readFileSync(join(HERE, f), 'utf8') !== t)
  if (bad.length) { console.error(`assign --check: differs: ${bad.map(b => b[0]).join(', ')}`); process.exit(1) }
  console.log('assign --check: files match'); process.exit(0)
}
mkdirSync(join(HERE, 'authors'), { recursive: true })
for (const [f, t] of Object.entries(files)) writeFileSync(join(HERE, f), t)
// Self-report: balance per part.
for (const part of [P1, P2]) {
  const it = items.filter(i => i.part === part)
  const tally = k => it.reduce((m, i) => ({ ...m, [i[k]]: (m[i[k]] || 0) + 1 }), {})
  console.log(`${part}: n=${it.length} slot ${JSON.stringify(tally('slot'))} len ${JSON.stringify(tally('len'))} difficulty ${JSON.stringify(tally('difficulty'))} categories ${Object.keys(tally('category')).length}`)
  const per = tally('category'); console.log('  per category', JSON.stringify(per))
}
const bad = items.filter(i => i.difficulty === 'easy' && NO_EASY.has(i.category))
if (bad.length) { console.error('easy item on a no-easy category'); process.exit(1) }
console.log(`wrote ASSIGNED.json (${items.length}) and ${AUTHORS.length} author files`)
