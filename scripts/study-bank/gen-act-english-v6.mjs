#!/usr/bin/env node
/**
 * gen-act-english-v6.mjs - build scripts/study-bank/act-english-v6.batch.json
 *
 * One ACT English form: 5 original essays x 10 items. The passage string is
 * written ONCE per passage here and spread into that passage's ten items, so
 * the ten copies are byte-identical by construction (act-bank-helper compares
 * them raw, and a hand-edited batch is exactly what that check exists to
 * catch).
 *
 * Every essay is original to this repository. Nothing is adapted from ACT or
 * from any prep publisher.
 *
 *   node scripts/study-bank/gen-act-english-v6.mjs
 */
import { writeFileSync } from 'node:fs'

/* ------------------------------------------------------------------ *
 * Passages
 * ------------------------------------------------------------------ */

const P1 = `[1] The interview lasted four minutes. Marisol, who ran the overnight side of Kestrel Bread, asked whether I could lift fifty pounds and whether I minded being awake when nobody else was. I said yes to both, although I had only ever been awake at that hour by accident. She told me to arrive at ten on Sunday and to wear shoes I wasn't gonna cry over.

[2] The bakery at night is not the bakery at noon. [A] The retail counter sits dark behind it's shutter, and the building narrows to one long room where the mixers stand in a row. [B] Flour drifts in the light above the bench. [C] The ovens still hold residual heat left over from the shift before, so the room is already warm when the first bag is opened. [D] For an hour I did nothing but move sacks from the pallet to the bin, and by eleven o'clock my forearms shook.

[3] Marisol worked at a pace that never looked fast. She weighed the water instead of measuring it in cups, and she kept a thermometer clipped to her apron. On a strip of masking tape she recorded the temperature of every dough. When I asked why the numbers mattered, she said that dough cannot read a clock. A cold kitchen meant a slow rise, a warm one meant I had thirty minutes less than the schedule promised.

[4] My first solo batch failed in the ordinary way. I shaped the loaves too loosely, than let them proof while I swept, and when I came back the dough had spread into pale puddles. Marisol looked at the tray, then at me. "Bake them anyway," she said. We sold them as focaccia, and they sold out by nine.

[5] At half past five the delivery van backed up to the door, and the racks went out one at a time. The sky over the parking lot turned the color of weak tea. Walking home past the first cars of the morning, a loaf I had shaped myself was carried under my arm.`

const P2 = `[1] Twice a day the sea leaves part of itself behind. Along the rocky shelf below the lighthouse, water that cannot drain away collects in shallow basins, and for a few hours each basin becomes a small ocean of its own. A visitor who arrives at the right hour can look straight down into a system that spends most of its life under six feet of surf.

[2] The pools lie in bands, and the bands are not accidental. [A] Nearest the land is the splash zone, which the tide reaches only as spray. [B] Below it, the high pools warm quickly and lose water through the process of evaporation caused by the sun, so there salt content can rise well above that of open seawater. [C] The low pools, uncovered only on the strongest tides, stays cold and steady. [D] An animal that thrives in one band will often die in the band above it.

[3] Consider the ochre sea star a common resident of the low pools. It holds the rock with hundreds of tube feet, each of which works on water pressure rather than on muscle. Given enough time, the sea star can pull a mussel open by a fraction of a millimeter, which is all the room it needs; it then turns its stomach out through the gap and digests the mussel where it sits.

[4] Because conditions change so sharply across a few vertical feet, the shelf is one of the best places on the coast to watch competition happen. Mussels get on every surface they can reach. Sea stars eat mussels. The clean band of rock below the mussel bed is not empty by chance, it marks the lower edge of the mussel's range and the upper edge of the sea star's hunting.

[5] There are things to think about. Walk on bare rock and on sand rather than on barnacles, which are animals and are easily crushed. Leave every creature where you find it; a sea star pried loose usually cannot reattach. Finally, keep one eye on the water, because the tide that uncovered the shelf will cover it again within the hour.`

const P3 = `[1] Twenty minutes before the opening act, Dana Ruiz stands at the lip of the stage with a music stand, a highlighter, and a set list she has studied for a week. She is not a performer, although she will spend the next three hours in front of several thousand people. Ruiz is an American Sign Language interpreter, and her audience is the fourteen people on the accessible platform to her left.

[2] Interpreting a concert is not like a lecture. [A] A lecture has one speaker and one subject. [B] A song has a rhyme scheme, a rhythm, a narrator who may not be the singer, and a chorus that means something slightly different the fourth time it arrives. [C] Ruiz prepares by learning the lyrics and then by throwing most of them away. [D] "English word order will not carry the feeling," she says. "I am interpreting what the song is doing, not only what it says."

[3] Most of the work happens before the doors open. For a two-hour set, Ruiz may spend twenty hours on advance preparation beforehand: reading interviews to find out what a song is about, to decide whether a name should be fingerspelled or given a sign, and choosing where in the space in front of her each character in a lyric will stand. An instrumental break is its own problem. Ruiz solves it by showing the shape of the sound rather than by miming an instrument.

[4] Her audience is not one audience. Some deaf and hard-of-hearing concertgoers read the interpreter closely; others watch the band and take the floors vibration through their shoes, glancing over only for the words. Ruiz adjusts. If the platform is watching her hands, she gives them more detail. If they are watching the drummer, she gets out of the way.

[5] The night I watched, the band busted out a cover that wasn't on the list. Ruiz caught the first line, recognized the song, and is a beat behind for eight bars before she caught up. Afterward a woman on the platform leaned over the rail and signed thank you. Ruiz, whose hands were finally still, signed it back.`

const P4 = `[1] In 2019 the city council of Fairhaven voted on a proposal to rename eleven streets. The vote followed two years of hearings, a petition with four thousand signatures, and an argument that has never quite ended. Ten of the streets had been named in the 1890s for officers of a single land company. The eleventh honored a man who never set foot in the state.

[2] The case for renaming was not, in the end, an argument about the past. [A] Supporters said that a street name is a sentence that the city goes ahead and repeats each and every day, on every envelope and every driver's license. [B] They did not ask that the land company be erased from the record. [C] They asked that the honor, which is a limited thing, be spent on someone else. [D]

[3] The case against renaming rested on cost and on memory, and the two were not equally easy to answer. Business owners on the affected blocks counted up new signs, reprinted stationery, and amended licenses, they put the total in the thousands of dollars. The city agreed to cover the fees it controlled. Memory was harder. A woman who had lived on Colvin Street since 1961 told the council that she was not defending the land company; she was defending the address on the envelopes her mother had sent her.

[4] What the council approved was narrower than either side wanted. Eight of the eleven renamed for residents of the neighborhood the land company had subdivided. Three kept their names and received small plaques explaining who the officers were and what the company did. The historical society, whom had opposed the change, agreed to write the plaques.

[5] Two years on, the mail arrives. The plaques are read mostly by people waiting for the bus. Nobody in Fairhaven would claim that renaming eight streets settled the question of what a city owes it's own history, but the hearings did something the plaques could not: for two years, the question was in front of everyone, and it had to be answered out loud.`

const P5 = `[1] The transmitter arrived in a horse trailer. In the spring of 1974 four people from Marrow County had a license, a donated tower section, and $2,100 raised at a chili supper; what they lacked was a building. The creamery on Route 9 was empty since 1968, and its owner, who wanted the taxes off his books, sold it to them for a dollar.

[2] KMRW went on the air that November with eleven hours of programming a day and a schedule written on butcher paper. [A] The morning show was farm reports and school closings. [B] Afternoons belonged to whoever showed up. [C] A high school Spanish teacher played records from her own personal collection that belonged to her on Thursdays. [D] The engineer, a retired lineman named Ossie Pratt, kept the transmitter running with parts he machined himself.

[3] Community radio in the 1970s was not a business model, it was an argument about who gets to speak. Commercial stations sold audiences to advertisers. KMRW sold nothing; it asked. Twice a year the station held a pledge drive, and twice a year the staff learned exactly how many people were listening, a number that was never large and never zero.

[4] The station nearly closed three times. The worst stretch came in 1991, when a lightning strike took out the transmitter Pratt had nursed for seventeen years and the insurance covered less than half the cost. The replacement was paid for by 600 listeners, a county arts grant, and they sold the creamery's original butter churn to a museum in Des Moines.

[5] KMRW still broadcasts from the creamery, though the butcher-paper schedule is now a spreadsheet and the afternoon block is streamed as often as it is tuned in. What has not changed is the arrangement. The station belongs to nobody in particular, which in practice has meant that it belongs to whoever is willing to show up on a Thursday afternoon and fill an hour.`

/* ------------------------------------------------------------------ *
 * Items. `k` is the index the key sits at; "No Change", when present,
 * is always index 0, so k = 0 means NO CHANGE is the answer.
 * ------------------------------------------------------------------ */

const PASSAGES = [
  {
    pid: 'en6-p1', title: 'The Night Shift', text: P1,
    items: [
      { d: 'Conventions of Standard English', s: 'then vs. than', f: 'medium', k: 1,
        p: 'In paragraph 4, which choice is best for the underlined portion of "I shaped the loaves too loosely, than let them proof while I swept"?',
        c: ['No Change', 'loosely, then let them proof', 'loosely, than letting them proof', 'loosely, then, let them proof'],
        e: 'The sentence lists two actions in sequence, so it needs the time adverb "then"; "than" introduces a comparison, and nothing here is being compared. "than letting them proof" keeps the comparative word and breaks the parallel with "shaped." "then, let them proof" fixes the word but drops a comma between the compound verbs that separates them for no reason.' },

      { d: 'Conventions of Standard English', s: 'possessive vs. contraction', f: 'easy', k: 2,
        p: 'In paragraph 2, which choice is best for "The retail counter sits dark behind it\'s shutter"?',
        c: ['No Change', "behind its' shutter", 'behind its shutter', 'behind the shutter that is its own'],
        e: '"its" is the possessive pronoun the sentence needs. "it\'s" is the contraction of "it is," which would read "behind it is shutter." "its\'" is not a word in standard written English. "the shutter that is its own" is grammatical but says in six words what one possessive says.' },

      { d: 'Conventions of Standard English', s: 'dangling modifier', f: 'hard', k: 2,
        p: 'Which choice best revises the last sentence of paragraph 5, "Walking home past the first cars of the morning, a loaf I had shaped myself was carried under my arm."?',
        c: ['No Change',
          'Walking home past the first cars of the morning, a loaf I had shaped myself was under my arm.',
          'I walked home past the first cars of the morning, carrying a loaf I had shaped myself.',
          'Having walked home past the first cars of the morning, the loaf I had shaped myself was under my arm.'],
        e: 'The opening participle has to describe the subject of the main clause, and the person walking home is the narrator, not the loaf. Making the loaf the subject leaves the participle dangling, and "Having walked home" dangles in the same way while adding a perfect participle the sentence does not need.' },

      { d: 'Conventions of Standard English', s: 'parallel structure in a compound', f: 'medium', k: 0,
        p: 'In paragraph 1, which choice is best for "asked whether I could lift fifty pounds and whether I minded being awake when nobody else was"?',
        c: ['No Change',
          'asked whether I could lift fifty pounds and whether I minded to be awake when nobody else was',
          'asked whether I could lift fifty pounds and if I minded being awake when nobody else was, or not',
          'asked whether I could lift fifty pounds and whether being awake when nobody else was is something I minded'],
        e: 'The two indirect questions are already parallel, each introduced by "whether" and each followed by a clause. "minded to be awake" is not idiomatic; "mind" takes a gerund. Adding "or not" after "whether" repeats what "whether" already means, and the last rewrite turns the second question into a fourteen-word noun clause with no gain.' },

      { d: 'Conventions of Standard English', s: 'comma splice', f: 'medium', k: 3,
        p: 'In paragraph 3, which choice is best for "A cold kitchen meant a slow rise, a warm one meant I had thirty minutes less"?',
        c: ['No Change', 'rise, a warm one, meant', 'rise, and a warm one meaning', 'rise; a warm one meant'],
        e: 'Two complete statements are joined by a comma alone, so a semicolon is required. Setting off "a warm one" with commas cuts the subject away from its verb. "and a warm one meaning" replaces the second clause\'s verb with a participle, leaving the half-sentence without one.' },

      { d: 'Knowledge of Language', s: 'redundancy', f: 'medium', k: 3,
        p: 'In paragraph 2, which choice most concisely states the idea of "The ovens still hold residual heat left over from the shift before"?',
        c: ['No Change',
          'The ovens hold heat',
          'The ovens still hold heat that is left over from the shift before',
          'The ovens hold heat from the shift before'],
        e: '"still," "residual," and "left over" all say the same thing once each. "The ovens hold heat" cuts too far, deleting where the heat came from, which is the only part of the sentence the next clause depends on; "still hold heat that is left over" keeps one of the two redundancies.' },

      { d: 'Knowledge of Language', s: 'style and register', f: 'medium', k: 2,
        p: 'In paragraph 1, which choice best maintains the essay\'s style in place of "and to wear shoes I wasn\'t gonna cry over"?',
        c: ['No Change',
          'and to wear footwear of an inexpensive nature',
          'and to wear shoes I did not care about',
          'and to wear shoes that were bad'],
        e: 'The essay is plain but not slangy, and "gonna" is spoken shorthand that appears nowhere else in it. "footwear of an inexpensive nature" overcorrects into a register the narrator never uses, and "shoes that were bad" is vague about the quality that matters, which is that ruining them would not matter.' },

      { d: 'Production of Writing', s: 'sentence placement', f: 'medium', k: 1,
        p: 'The writer wants to add the sentence "Nothing about it feels like a store." to paragraph 2. It would most logically be placed at which point: Point A, Point B, Point C, or Point D?',
        c: ['Point A', 'Point B', 'Point C', 'Point D'],
        e: 'The added sentence draws a conclusion from the darkened retail counter and the room narrowing to the mixers, so it belongs immediately after that description. Placed before it, the sentence has nothing to conclude from; placed after the flour or the ovens, it interrupts a run of physical detail with a judgment about a counter two sentences back.' },

      { d: 'Production of Writing', s: 'relevance of a detail', f: 'hard', k: 0,
        p: 'The writer is considering deleting the sentence "On a strip of masking tape she recorded the temperature of every dough." from paragraph 3. Should it be kept or deleted?',
        c: ['Kept, because it gives a concrete instance of the attention to measurement that the rest of the paragraph explains.',
          'Kept, because it explains why the narrator\'s first solo batch spread into pale puddles.',
          'Deleted, because the paragraph has already established that Marisol relied on measurement rather than on habit, and a second instance adds nothing new to the essay.',
          'Deleted, because the essay is about the narrator\'s shift rather than about Marisol.'],
        e: 'The paragraph claims Marisol worked by numbers, and the taped temperatures are the second and most specific piece of evidence for that claim, which the following sentences then explain. The batch failed from loose shaping and a long proof, not from an unrecorded temperature; and the paragraph\'s point is exactly that one instance is not enough, since the water and the thermometer show the habit and the tape shows the record it produced.' },

      { d: 'Production of Writing', s: 'purpose of the essay', f: 'hard', k: 1,
        p: 'Considering the essay as a whole, suppose the writer\'s goal had been to show how a beginner learns a physical craft rather than to explain how a bakery is run. Would this essay accomplish that goal?',
        c: ['Yes, because the essay explains the schedule the overnight crew follows and lists the equipment the long room contains.',
          'Yes, because it follows the narrator from hauling sacks through a failed batch to shaping a loaf worth carrying home.',
          'No, because the essay devotes most of its attention to Marisol\'s habits and to the room itself rather than to anything the narrator learned to do.',
          'No, because the essay covers a single summer instead of the years such a craft would take.'],
        e: 'The essay is built as a progression: sacks in paragraph 2, a batch that spreads into puddles in paragraph 4, a loaf the narrator shaped in paragraph 5. Describing the schedule and equipment would serve the other goal, the one the question sets aside. Marisol\'s habits are the instruction the narrator receives rather than a substitute for the narrator\'s progress, and the length of the apprenticeship is not what the goal asks about.' },
    ],
  },

  {
    pid: 'en6-p2', title: 'Reading a Tide Pool', text: P2,
    items: [
      { d: 'Conventions of Standard English', s: 'their vs. there', f: 'easy', k: 1,
        p: 'In paragraph 2, which choice is best for "so there salt content can rise well above that of open seawater"?',
        c: ['No Change', 'so their salt content can rise', "so it's salt content can rise", "so they're salt content can rise"],
        e: 'The sentence needs a possessive modifying "salt content," and the pools are plural, so "their" is required. "there" is an adverb of place, "it\'s" means "it is," and "they\'re" means "they are"; none of the three can own anything.' },

      { d: 'Conventions of Standard English', s: 'comma splice', f: 'medium', k: 3,
        p: 'In paragraph 4, which choice is best for "The clean band of rock below the mussel bed is not empty by chance, it marks the lower edge of the mussel\'s range"?',
        c: ['No Change', 'by chance, this marks', 'by chance, and it marking', 'by chance; it marks'],
        e: 'A comma cannot join two independent statements, and a semicolon can. Substituting "this" for "it" leaves the same comma splice with a different pronoun, and "and it marking" gives the second half a participle where it needs a finite verb.' },

      { d: 'Conventions of Standard English', s: 'subject-verb agreement across an interrupter', f: 'medium', k: 2,
        p: 'In paragraph 2, which choice is best for "The low pools, uncovered only on the strongest tides, stays cold and steady"?',
        c: ['No Change', 'tides stay cold', 'tides, stay cold', 'tides, is cold'],
        e: 'The subject is "The low pools," which is plural, so the verb is "stay"; the interrupting phrase between the subject and the verb has to be closed with a comma as well as opened with one. Dropping that closing comma leaves the interrupter half-punctuated, and "is" repeats the original agreement error.' },

      { d: 'Conventions of Standard English', s: 'semicolon between clauses', f: 'medium', k: 0,
        p: 'In paragraph 5, which choice is best for "Leave every creature where you find it; a sea star pried loose usually cannot reattach."?',
        c: ['No Change',
          'find it, a sea star pried loose usually cannot reattach.',
          'find it; a sea star pried loose, usually cannot reattach.',
          'find it and a sea star pried loose usually cannot reattach.'],
        e: 'Two complete statements stand on either side of the semicolon, which is exactly what a semicolon joins. A comma alone makes a splice, a comma after "loose" cuts the subject from its verb, and joining the two with "and" and no comma implies the reader should do both things rather than that the second explains the first.' },

      { d: 'Conventions of Standard English', s: 'punctuating an appositive', f: 'medium', k: 2,
        p: 'In paragraph 3, which choice is best for "Consider the ochre sea star a common resident of the low pools."?',
        c: ['No Change', 'sea star; a common resident', 'sea star, a common resident', 'sea star (a common resident'],
        e: '"a common resident of the low pools" renames the sea star and must be set off with a comma. Without one the sentence reads as though two things are being considered. A semicolon requires a complete statement after it, and the opening parenthesis is never closed.' },

      { d: 'Knowledge of Language', s: 'wordiness', f: 'medium', k: 3,
        p: 'In paragraph 2, which choice most concisely states the idea of "lose water through the process of evaporation caused by the sun"?',
        c: ['No Change',
          'lose water by means of evaporating in the sun',
          'lose water',
          'lose water to evaporation in the sun'],
        e: '"through the process of" and "caused by" are filler around the only two facts, evaporation and the sun. "by means of evaporating" trades one piece of filler for another, and "lose water" alone drops both the mechanism and the cause that the next clause about salt depends on.' },

      { d: 'Knowledge of Language', s: 'precise word choice', f: 'easy', k: 1,
        p: 'In paragraph 4, which choice is best for "Mussels get on every surface they can reach"?',
        c: ['No Change', 'settle on', 'situate themselves upon', 'go onto'],
        e: '"settle on" names what a mussel actually does, attaching and staying, and it matches the plain scientific register of the paragraph. "get on" and "go onto" describe arrival without attachment, and "situate themselves upon" is stiff and implies a deliberate choice the animal does not make.' },

      { d: 'Production of Writing', s: 'sentence placement', f: 'medium', k: 0,
        p: 'The writer wants to add the sentence "How long a band stays dry decides what can live in it." to paragraph 2. It would most logically be placed at which point: Point A, Point B, Point C, or Point D?',
        c: ['Point A', 'Point B', 'Point C', 'Point D'],
        e: 'The added sentence states the principle that the rest of the paragraph then works through band by band, so it belongs directly after the claim that the bands are not accidental. Inserted after the splash zone or the high pools, it arrives in the middle of the sequence it was meant to introduce, and at the end it duplicates the point the paragraph has already made about an animal dying one band up.' },

      { d: 'Production of Writing', s: 'opening a paragraph', f: 'medium', k: 2,
        p: 'Which choice best opens paragraph 5 in place of "There are things to think about."?',
        c: ['No Change',
          'The tide pool is a fragile place, and we hope that you will enjoy your visit to it.',
          'We ask three things of every visitor, and each of them protects the animals you came to see.',
          'Rules are necessary for the protection of the natural environment.'],
        e: 'The paragraph gives exactly three instructions and this brochure is addressed to visitors, so an opening that counts them and says why they exist prepares the reader for what follows. "There are things to think about" forecasts nothing. The other two openings state a general sentiment about fragility or rules without connecting to the three specific requests underneath them.' },

      { d: 'Production of Writing', s: 'purpose of the essay', f: 'hard', k: 0,
        p: 'Considering the essay as a whole, suppose the park had asked the writer for a brochure that both tells visitors what to look for and tells them how to behave. Would this essay meet that request?',
        c: ['Yes, because it explains the bands, follows one animal, and closes with instructions.',
          'Yes, because it warns visitors that the tide will cover the shelf again within the hour.',
          'No, because it describes the pools and their bands without ever naming a single species that a visitor standing on the shelf could find.',
          'No, because the instructions in the last paragraph concern the visitor\'s safety rather than the animals.'],
        e: 'The first four paragraphs supply things to look for, the bands and the ochre sea star, and the last supplies conduct. A single warning about the returning tide is only one line of that. The essay names the ochre sea star, the mussels, and the barnacles, and the instructions are about crushing barnacles and prying loose sea stars, which is the animals\' welfare rather than the visitor\'s.' },
    ],
  },

  {
    pid: 'en6-p3', title: 'A Beat Behind, Then Even', text: P3,
    items: [
      { d: 'Conventions of Standard English', s: 'illogical comparison', f: 'medium', k: 2,
        p: 'In paragraph 2, which choice is best for "Interpreting a concert is not like a lecture."?',
        c: ['No Change', 'is not like a lecture in a classroom.', 'is not like interpreting a lecture.', 'is not like a lecture is.'],
        e: 'The sentence compares an activity to a thing, so an act of interpreting has to sit on both sides of "like." Naming the room the lecture is given in leaves the same mismatch, and adding "is" at the end makes the mismatch explicit rather than repairing it.' },

      { d: 'Conventions of Standard English', s: 'parallel structure in a series', f: 'hard', k: 3,
        p: 'In paragraph 3, which choice is best for "to decide whether a name should be fingerspelled or given a sign" in the series that begins "reading interviews"?',
        c: ['No Change',
          'and deciding whether a name should be fingerspelled or given a sign',
          'a decision about whether a name should be fingerspelled or given a sign',
          'deciding whether a name should be fingerspelled or given a sign'],
        e: 'The three items in the series are "reading," "___," and "choosing," so the middle item must be a gerund phrase too. An infinitive breaks the pattern; adding "and" before the second of three items leaves the series with two conjunctions; and a noun phrase beginning "a decision about" is a thing rather than an activity.' },

      { d: 'Conventions of Standard English', s: 'possessive apostrophe', f: 'easy', k: 1,
        p: 'In paragraph 4, which choice is best for "take the floors vibration through their shoes"?',
        c: ['No Change', "the floor's vibration", "the floors' vibration", 'the vibration of the floors'],
        e: 'One floor is doing the vibrating, so the singular possessive is needed. Without an apostrophe "floors" is a plain plural that cannot own the vibration, and the plural possessive invents floors the passage never mentions; the last version is grammatical but pluralizes the floor as well.' },

      { d: 'Conventions of Standard English', s: 'consistent verb tense', f: 'medium', k: 3,
        p: 'In paragraph 5, which choice is best for "Ruiz caught the first line, recognized the song, and is a beat behind for eight bars"?',
        c: ['No Change', 'and had been a beat behind for eight bars', 'and will be a beat behind for eight bars', 'and was a beat behind for eight bars'],
        e: 'The other two verbs in the series, "caught" and "recognized," are simple past, and the paragraph narrates one night the writer attended. The present tense breaks that sequence, the past perfect would place the lag before the first line she caught, and the future contradicts an event already described as finished.' },

      { d: 'Conventions of Standard English', s: 'subordination', f: 'medium', k: 0,
        p: 'In paragraph 1, which choice is best for "She is not a performer, although she will spend the next three hours in front of several thousand people."?',
        c: ['No Change',
          'She is not a performer, she will spend the next three hours in front of several thousand people.',
          'She is not a performer, although she will spend the next three hours in front of several thousand people, however.',
          'Not being a performer, the next three hours will be spent in front of several thousand people.'],
        e: 'The subordinating conjunction "although" is what marks the contrast between not performing and standing before thousands, and one comma is all the sentence needs. A comma with no conjunction produces a splice, adding "however" states the contrast a second time, and the last version leaves the participle attached to "the next three hours" rather than to Ruiz.' },

      { d: 'Knowledge of Language', s: 'redundancy', f: 'easy', k: 2,
        p: 'In paragraph 3, which choice most concisely states the idea of "Ruiz may spend twenty hours on advance preparation beforehand"?',
        c: ['No Change', 'on preparation done in advance beforehand', 'on preparation', 'on getting ready for it beforehand'],
        e: 'Preparation is by definition done in advance, so both "advance" and "beforehand" repeat the noun. Keeping either one leaves the repetition in place, and "getting ready for it" is looser than "preparation" while still carrying "beforehand."' },

      { d: 'Knowledge of Language', s: 'style and register', f: 'medium', k: 1,
        p: 'In paragraph 5, which choice best matches the profile\'s style in place of "the band busted out a cover that wasn\'t on the list"?',
        c: ['No Change',
          'the band played a cover that no one had listed',
          'the band performed a rendition of a song not present on the aforementioned list',
          'the band did a cover that wasn\'t on there'],
        e: 'The profile is written in unhurried standard prose, and "played a cover that no one had listed" states the surprise in that voice. "busted out" and "wasn\'t on there" are casual speech the rest of the piece avoids, and "a rendition of a song not present on the aforementioned list" is legal-sounding padding.' },

      { d: 'Production of Writing', s: 'sentence placement', f: 'hard', k: 2,
        p: 'The writer wants to add the sentence "The difference is not volume; it is the number of things happening at once." to paragraph 2. It would most logically be placed at which point: Point A, Point B, Point C, or Point D?',
        c: ['Point A', 'Point B', 'Point C', 'Point D'],
        e: 'The sentence sums up a comparison, so it has to follow both halves of that comparison: the lecture with one speaker and one subject, and the song with its rhyme, rhythm, narrator, and shifting chorus. Placed before either half, it names a difference the reader has not been shown, and placed at the end it separates Ruiz\'s preparation from the quotation that explains it.' },

      { d: 'Production of Writing', s: 'relevance of a detail', f: 'medium', k: 1,
        p: 'The writer is considering deleting the sentence "Ruiz, whose hands were finally still, signed it back." from paragraph 5. Should it be kept or deleted?',
        c: ['Kept, because it identifies the woman on the platform as one of the fourteen people mentioned in paragraph 1.',
          'Kept, because it ends the profile with a reply, making Ruiz a participant rather than equipment.',
          'Deleted, because the thank-you has already been described and repeating it slows the ending.',
          'Deleted, because the detail about Ruiz\'s hands contradicts the earlier claim that she is not a performer.'],
        e: 'For four paragraphs Ruiz transmits other people\'s words; the last line is the only moment she says something of her own, which is why the profile ends there. The sentence never identifies the woman, and it reports a reply rather than repeating the thank-you. Still hands at the end of a show do not conflict with anything the essay claims about performing.' },

      { d: 'Production of Writing', s: 'purpose of the essay', f: 'hard', k: 3,
        p: 'Considering the essay as a whole, suppose the writer had intended to show that concert interpreting demands preparation and judgment rather than fluency alone. Would the essay accomplish that purpose?',
        c: ['No, because the essay describes a single night and one unlisted cover instead of a season of work.',
          'No, because the essay reports how many hours Ruiz spends in preparation without ever saying what she actually does during them.',
          'Yes, because the essay states in its first sentence that Ruiz has studied the set list for a week.',
          'Yes, because it shows the twenty hours, the choices about spelling and space, and the reading of the platform.'],
        e: 'Three separate things carry that purpose: the hours before the doors open, the choices about fingerspelling and where a character stands, and the adjustment Ruiz makes to an audience that is not watching her. The set list in the opening sentence is one detail of the first of those. The essay does say what the twenty hours contain, and the single night is where the judgment is demonstrated rather than a gap in the account.' },
    ],
  },

  {
    pid: 'en6-p4', title: 'Eight of Eleven', text: P4,
    items: [
      { d: 'Conventions of Standard English', s: 'comma splice', f: 'medium', k: 3,
        p: 'In paragraph 3, which choice is best for "counted up new signs, reprinted stationery, and amended licenses, they put the total in the thousands of dollars"?',
        c: ['No Change',
          'amended licenses; and they put the total in the thousands of dollars',
          'amended licenses, the total they put in the thousands of dollars',
          'amended licenses; they put the total in the thousands of dollars'],
        e: 'A three-item series ends and a whole new statement begins, so the break between them has to be stronger than the commas separating the series items; a semicolon supplies it. A semicolon followed by "and" doubles the join, and rearranging into "the total they put" leaves the splice untouched.' },

      { d: 'Conventions of Standard English', s: 'relative pronoun', f: 'medium', k: 1,
        p: 'In paragraph 4, which choice is best for "The historical society, whom had opposed the change, agreed to write the plaques."?',
        c: ['No Change',
          'The historical society, which had opposed the change, agreed',
          'The historical society, whom opposed the change, agreed',
          'The historical society whom had opposed the change agreed'],
        e: 'The relative pronoun is the subject of "had opposed" and its antecedent is an organization, not a person, so "which" is correct. "whom" is an object form in every version offered, and the last one also strips the commas from a clause that adds information rather than identifying which society is meant.' },

      { d: 'Conventions of Standard English', s: 'sentence fragment', f: 'hard', k: 2,
        p: 'In paragraph 4, which choice is best for "Eight of the eleven renamed for residents of the neighborhood the land company had subdivided."?',
        c: ['No Change',
          'Eight of the eleven, renamed for residents of the neighborhood the land company had subdivided.',
          'Eight of the eleven were renamed for residents of the neighborhood the land company had subdivided.',
          'Eight of the eleven renamed for residents of the neighborhood, which the land company had subdivided.'],
        e: 'As written, "renamed" is a past participle modifying "Eight," so the group of words has a subject and no finite verb. Supplying "were" makes it a sentence. Adding a comma after "eleven" or after "neighborhood" changes the punctuation of a fragment without giving it a verb.' },

      { d: 'Conventions of Standard English', s: 'subjunctive after "ask that"', f: 'hard', k: 0,
        p: 'In paragraph 2, which choice is best for "They asked that the honor, which is a limited thing, be spent on someone else."?',
        c: ['No Change',
          'the honor, which is a limited thing, is spent on someone else',
          'the honor, which is a limited thing, was spent on someone else',
          'the honor which is a limited thing be spent on someone else'],
        e: 'A demand introduced by "asked that" takes the subjunctive "be spent," and the clause describing the honor is nonessential, so it needs commas on both sides. The indicative forms "is spent" and "was spent" report a fact rather than a request, and the last version drops the commas around the nonessential clause.' },

      { d: 'Conventions of Standard English', s: 'possessive vs. contraction', f: 'easy', k: 3,
        p: 'In paragraph 5, which choice is best for "the question of what a city owes it\'s own history"?',
        c: ['No Change', "what a city owes its' own history", 'what a city owes their own history', 'what a city owes its own history'],
        e: 'The possessive pronoun "its" has no apostrophe; "it\'s" expands to "it is," which makes no sense after "owes." "its\'" is not a standard form, and "their" disagrees in number with the singular "a city."' },

      { d: 'Conventions of Standard English', s: 'series punctuation', f: 'medium', k: 0,
        p: 'In paragraph 1, which choice is best for "two years of hearings, a petition with four thousand signatures, and an argument that has never quite ended"?',
        c: ['No Change',
          'two years of hearings, a petition with four thousand signatures and an argument, that has never quite ended',
          'two years of hearings; a petition with four thousand signatures; and an argument that has never quite ended',
          'two years of hearings, a petition with four thousand signatures, and arguing that has never quite ended'],
        e: 'Three noun phrases are separated by commas with the last introduced by "and," which is how a simple series is punctuated. Moving the comma so that it falls before "that" attaches the modifier to the wrong item and cuts an essential clause loose. Semicolons are reserved for series whose items already contain commas, and "arguing" changes the third item from a noun to a gerund the other two do not match.' },

      { d: 'Knowledge of Language', s: 'wordiness', f: 'medium', k: 2,
        p: 'In paragraph 2, which choice most concisely states the idea of "a sentence that the city goes ahead and repeats each and every day"?',
        c: ['No Change',
          'a sentence that the city, each and every day, repeats',
          'a sentence the city repeats every day',
          'a sentence repeated'],
        e: '"goes ahead and" adds nothing to "repeats," and "each and every" says once what "every" says. Merely moving the padding between the subject and the verb keeps it, and "a sentence repeated" deletes the city, which is the party the supporters are holding responsible.' },

      { d: 'Production of Writing', s: 'sentence placement', f: 'medium', k: 1,
        p: 'The writer wants to add the sentence "Names, in this view, are not history; they are advertising." to paragraph 2. It would most logically be placed at which point: Point A, Point B, Point C, or Point D?',
        c: ['Point A', 'Point B', 'Point C', 'Point D'],
        e: 'The sentence restates the supporters\' claim about a name being repeated daily on envelopes and licenses, so it follows that claim and sets up the concession that no one asked for erasure from the record. Before that claim it has no antecedent for "this view," and after the concession or at the end of the paragraph it interrupts the move from what supporters did not ask for to what they did.' },

      { d: 'Production of Writing', s: 'relevance of a detail', f: 'medium', k: 0,
        p: 'The writer is considering deleting the sentence "The city agreed to cover the fees it controlled." from paragraph 3. Should it be kept or deleted?',
        c: ['Kept, because it settles the cost objection, which is why the paragraph turns next to memory.',
          'Kept, because it shows that the council had decided to rename the streets before the hearings began.',
          'Deleted, because the essay is about names rather than about municipal budgets.',
          'Deleted, because paragraph 4 already reports what the council finally approved.'],
        e: 'The paragraph is organized around two objections, and the sentence disposes of the first so that "Memory was harder" has something to be harder than. It says nothing about when the council decided anything. The fee is not a digression but the answer to the businesses\' own complaint, and paragraph 4 concerns which streets changed, not who paid.' },

      { d: 'Production of Writing', s: 'effective conclusion', f: 'hard', k: 3,
        p: 'Which choice, considering the essay as a whole, most effectively concludes the essay by returning to the argument described in paragraph 1, in place of "and it had to be answered out loud"?',
        c: ['No Change',
          'and the plaques were installed the following spring, three of them on streets that kept their names',
          'and attendance at council meetings has declined since',
          'and the argument that never quite ended was, for two years, held in one room'],
        e: 'Paragraph 1 introduces "an argument that has never quite ended," and an ending that names that argument again closes the circle the essay opened. "answered out loud" is true but says nothing the sentence has not already said with "in front of everyone." The plaques and the attendance figures are later facts that drop the essay\'s subject at the last moment.' },
    ],
  },

  {
    pid: 'en6-p5', title: 'Signal from the Old Creamery', text: P5,
    items: [
      { d: 'Conventions of Standard English', s: 'comma splice', f: 'medium', k: 3,
        p: 'In paragraph 3, which choice is best for "Community radio in the 1970s was not a business model, it was an argument about who gets to speak."?',
        c: ['No Change', 'model, it was however an argument', 'model, being it was an argument', 'model; it was an argument'],
        e: 'Two independent statements joined by a comma need a semicolon instead. Inserting "however" leaves the comma doing work it cannot do, and "being it was" is not a standard connective in written English.' },

      { d: 'Conventions of Standard English', s: 'nonessential clause and possessive', f: 'medium', k: 0,
        p: 'In paragraph 1, which choice is best for "its owner, who wanted the taxes off his books, sold it to them for a dollar"?',
        c: ['No Change',
          "it's owner, who wanted the taxes off his books, sold",
          'its owner who wanted the taxes off his books sold',
          'its owner, whom wanted the taxes off his books, sold'],
        e: 'The possessive "its" takes no apostrophe, and the clause about the taxes adds information about an owner already identified by "its," so it is set off with commas on both sides. "it\'s" means "it is," dropping the commas turns a nonessential clause into a restrictive one that implies other owners, and "whom" cannot serve as the subject of "wanted."' },

      { d: 'Conventions of Standard English', s: 'parallel structure in a series', f: 'medium', k: 1,
        p: 'In paragraph 4, which choice is best for "paid for by 600 listeners, a county arts grant, and they sold the creamery\'s original butter churn to a museum in Des Moines"?',
        c: ['No Change',
          "and the sale of the creamery's original butter churn to a museum in Des Moines",
          "and selling the creamery's original butter churn to a museum in Des Moines",
          "and the creamery's original butter churn, which they sold to a museum in Des Moines"],
        e: 'Everything after "paid for by" must be a noun phrase naming a source of money, and "the sale of the churn" is one. A full clause with its own subject cannot be the object of "by." A gerund phrase names an activity rather than a source, and the last version makes the churn itself the payer.' },

      { d: 'Conventions of Standard English', s: 'who vs. whom', f: 'hard', k: 0,
        p: 'In paragraph 2, which choice is best for "Afternoons belonged to whoever showed up."?',
        c: ['No Change',
          'Afternoons belonged to whomever showed up.',
          'Afternoons belonged to whoever they showed up.',
          'Afternoons belonged to whom showed up.'],
        e: 'The pronoun is the subject of "showed up," and the whole clause is what follows "to," so the subject form "whoever" is right even after a preposition. "whomever" and "whom" are object forms, and adding "they" gives the clause two subjects.' },

      { d: 'Conventions of Standard English', s: 'comma before a coordinating conjunction', f: 'medium', k: 1,
        p: 'In paragraph 4, which choice is best for "took out the transmitter Pratt had nursed for seventeen years and the insurance covered less than half the cost"?',
        c: ['No Change',
          'for seventeen years, and the insurance covered less than half the cost',
          'for seventeen years, the insurance covered less than half the cost',
          'for seventeen years; and the insurance covered less than half the cost'],
        e: 'Two independent clauses joined by "and" take a comma before the conjunction; without it the reader first parses "the insurance" as a second thing the lightning took out. A comma with no conjunction is a splice, and a semicolon before "and" over-punctuates a join the conjunction already makes.' },

      { d: 'Conventions of Standard English', s: 'verb tense', f: 'medium', k: 3,
        p: 'In paragraph 1, which choice is best for "The creamery on Route 9 was empty since 1968"?',
        c: ['No Change',
          'The creamery on Route 9 is empty since 1968',
          'The creamery on Route 9 has been empty since 1968',
          'The creamery on Route 9 had been empty since 1968'],
        e: 'The narrative sits in the spring of 1974, and the emptiness began earlier and continued up to that point, which is what the past perfect expresses. The simple past does not reach back from 1974, the present tense contradicts a building sold and occupied decades ago, and the present perfect would run the emptiness up to today.' },

      { d: 'Knowledge of Language', s: 'redundancy', f: 'easy', k: 2,
        p: 'In paragraph 2, which choice most concisely states the idea of "played records from her own personal collection that belonged to her on Thursdays"?',
        c: ['No Change',
          'from her own personal collection on Thursdays',
          'from her own collection on Thursdays',
          'from a collection on Thursdays'],
        e: '"her own," "personal," and "that belonged to her" all establish ownership, and one of them is enough. Keeping "own personal" retains a doubled claim, and "a collection" drops the ownership entirely, which is the detail that makes the Thursday show hers.' },

      { d: 'Production of Writing', s: 'sentence placement', f: 'medium', k: 0,
        p: 'The writer wants to add the sentence "Almost none of it was rehearsed." to paragraph 2. It would most logically be placed at which point: Point A, Point B, Point C, or Point D?',
        c: ['Point A', 'Point B', 'Point C', 'Point D'],
        e: 'The sentence characterizes the whole schedule written on butcher paper, and the three examples that follow it, the farm reports, the open afternoons, and the teacher\'s records, are the evidence for it. Placed lower in the paragraph, it can only refer back to the one or two examples above it, and after the engineer it appears to describe his machining.' },

      { d: 'Production of Writing', s: 'relevance of a detail', f: 'medium', k: 0,
        p: 'The writer is considering deleting the sentence "Commercial stations sold audiences to advertisers." from paragraph 3. Should it be kept or deleted?',
        c: ['Kept, because it supplies the contrast that gives "KMRW sold nothing; it asked" its meaning.',
          'Kept, because it explains why the station was able to buy the creamery for a dollar.',
          'Deleted, because the paragraph is about KMRW and commercial stations are never mentioned again in the essay.',
          'Deleted, because the essay has already established in paragraph 1 that the founders had to raise money at a chili supper.'],
        e: 'The sentence about selling nothing depends on a preceding sentence about what other stations did sell; remove it and "sold nothing" has no term to negate. The dollar purchase is explained by the owner\'s taxes in paragraph 1. A contrast does not need to recur to do its work, and the chili supper shows how the founders raised money rather than how the station stayed on the air.' },

      { d: 'Production of Writing', s: 'purpose of the essay', f: 'hard', k: 3,
        p: 'Considering the essay as a whole, suppose the writer\'s goal had been to show how a small institution survives by depending on the people it serves. Would the essay accomplish that goal?',
        c: ['No, because the essay attributes the station\'s survival mainly to Ossie Pratt and the founders rather than to its listeners.',
          'No, because the essay is a chronology of events at one station and never states a general principle about institutions.',
          'Yes, because the essay reports that the creamery was sold to the founders for a single dollar.',
          'Yes, because the pledge drives, the replaced transmitter, and the closing line all tie survival to the audience.'],
        e: 'Three passages carry the goal: the twice-yearly drives that measured who was listening, the listeners who paid for the transmitter after the lightning strike, and the ending that hands the station to whoever shows up. The dollar came from an owner who wanted a tax write-off, not from the audience. Pratt\'s repairs are one thread among those three, and the closing sentence generalizes past the chronology.' },
    ],
  },
]

/* ------------------------------------------------------------------ */

const out = []
PASSAGES.forEach((P, pi) => {
  if (P.items.length !== 10) throw new Error(`${P.pid}: ${P.items.length} items`)
  P.items.forEach((it, ii) => {
    if (!Array.isArray(it.c) || it.c.length !== 4) throw new Error(`${P.pid} #${ii + 1}: not 4 choices`)
    if (it.k < 0 || it.k > 3) throw new Error(`${P.pid} #${ii + 1}: bad key index`)
    const ncAt = it.c.findIndex(c => /^no change$/i.test(c.trim()))
    if (ncAt > 0) throw new Error(`${P.pid} #${ii + 1}: "No Change" at index ${ncAt}`)
    out.push({
      id: `ACT-EN6-P${pi + 1}-Q${String(ii + 1).padStart(2, '0')}`,
      passage_id: P.pid,
      passage_title: P.title,
      passage: P.text,
      prompt: it.p,
      choices: it.c,
      correct_answer: it.c[it.k],
      explanation: it.e,
      domain: it.d,
      subskill: it.s,
      difficulty: it.f,
    })
  })
})

const path = 'scripts/study-bank/act-english-v6.batch.json'
writeFileSync(path, JSON.stringify(out, null, 2) + '\n')

/* ---- authoring report: the things the checker does NOT check ---- */
const slots = [0, 0, 0, 0]
let longest = 0, shortest = 0, noChangeKeys = 0
const dom = {}
for (const it of out) {
  const k = it.choices.indexOf(it.correct_answer)
  slots[k]++
  if (k === 0 && /^no change$/i.test(it.choices[0])) noChangeKeys++
  const lens = it.choices.map(c => c.length)
  const kl = it.correct_answer.length
  if (kl === Math.max(...lens)) longest++
  if (kl === Math.min(...lens)) shortest++
  dom[it.domain] = (dom[it.domain] ?? 0) + 1
}
const words = t => t.split(/\s+/).filter(Boolean).length
console.log(`wrote ${path} — ${out.length} items`)
console.log('domain mix   :', Object.entries(dom).map(([k, v]) => `${k} ${v}`).join(' | '))
console.log('key slots    :', slots.join(' / '), ` (No Change is the key in ${noChangeKeys})`)
console.log('key longest  :', longest, ' key shortest:', shortest, ' (cap 13 each)')
console.log('essay words  :', PASSAGES.map(p => `${p.pid} ${words(p.text)}`).join(' | '))
