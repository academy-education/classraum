import json, collections

SRC = '/Users/andylee/Downloads/saas/classraum/scripts/study-bank/act-english-v6.batch.json'
DST = '/Users/andylee/Downloads/saas/classraum/scripts/study-bank/act-english-v6r.batch.json'

items = json.load(open(SRC))
assert len(items) == 50, f"input identity: expected 50 items, got {len(items)}"
byid = {i['id']: i for i in items}
assert len(byid) == 50
CONV = [i['id'] for i in items if i['domain'] == 'Conventions of Standard English']
assert len(CONV) == 27, len(CONV)

# id -> (new_choices, new_key, new_explanation, new_subskill or None)
R = {}

# ---------------- en6-p1 "The Night Shift" ----------------

R['ACT-EN6-P1-Q01'] = (
  ["No Change",
   "loosely, then let them proof",
   "loosely, then lets them proof",
   "loosely, then had let them proof"],
  "loosely, then let them proof",
  'The sentence lists actions in sequence, so it needs the time adverb "then"; "than" introduces a comparison, and nothing here is being compared. Of the three sequence versions, only the plain past "let" matches "shaped" and agrees with "I": "lets" is the third-person singular present and has neither the right person nor the right tense, and "had let" is a past perfect that would place the proofing before the shaping the word "then" has just said it followed.',
  'then vs. than, with verb form in a compound predicate')

R['ACT-EN6-P1-Q02'] = (
  ["No Change",
   "behind its shutter",
   "behind their shutter",
   "behind that shutter"],
  "behind its shutter",
  'What owns the shutter is "the retail counter," which is singular, so the possessive is "its." "It\'s" is the contraction of "it is," which would read "behind it is shutter." "Their" is plural and the only plural nouns in the paragraph are the mixers and the sacks. "That shutter" is a demonstrative pointing at a shutter the essay has not introduced, and it says nothing about whose shutter it is, which is the work the sentence needs done.',
  "possessive pronoun agreement and reference (its vs. it's)")

R['ACT-EN6-P1-Q03'] = (
  ["No Change",
   "I walked home past the first cars of the morning, carrying a loaf I had shaped myself.",
   "Walking home past the first cars of the morning, a loaf I had shaped myself was under my arm.",
   "I walk home past the first cars of the morning, carrying a loaf I had shaped myself."],
  "I walked home past the first cars of the morning, carrying a loaf I had shaped myself.",
  'The opening participle has to describe the subject of the main clause, and the person walking home is the narrator, not the loaf; making the loaf the subject leaves the participle dangling however the rest of the clause is arranged. Two versions do put the narrator in the subject slot, and the tense decides between them: the whole essay is a past-tense account of one shift, ending "the racks went out" and "the sky turned," so the present "I walk home" breaks the sequence.',
  'dangling modifier and narrative tense')

R['ACT-EN6-P1-Q04'] = (
  ["No Change",
   "asked if I could lift fifty pounds and whether I minded being awake when nobody else was",
   "asked whether I could lift fifty pounds and whether I mind being awake when nobody else was",
   "asked whether I could lift fifty pounds and whether I had minded being awake when nobody else was"],
  "No Change",
  'The two indirect questions are already parallel: each is introduced by "whether" and each is in the same tense as the reporting verb "asked." Swapping the first "whether" for "if" leaves two questions in the same compound introduced two different ways. "I mind" is present and clashes with "asked." "I had minded" is a past perfect, which would ask about an attitude finished before the interview, when what Marisol wants to know is how the narrator feels about the shift she is offering.',
  'parallelism and tense in compound indirect questions')

R['ACT-EN6-P1-Q05'] = (
  ["No Change",
   "rise; a warm one meant",
   "rise: a warm one meant",
   "rise; a warm one means"],
  "rise; a warm one meant",
  '"A cold kitchen meant a slow rise" and "a warm one meant I had thirty minutes less" are two complete statements, so the comma in the original is a splice and a semicolon is the mark that joins them. A colon would announce that the second statement explains or specifies the first, and it does not: it gives the matching case. "Means" is present tense in a sentence reporting what Marisol said on one night, alongside "meant" in the first half.',
  None)

# ---------------- en6-p2 "Reading a Tide Pool" ----------------

R['ACT-EN6-P2-Q01'] = (
  ["No Change",
   "so their salt content can rise",
   "so its salt content can rise",
   "so our salt content can rise"],
  "so their salt content can rise",
  'The word before "salt content" has to be a possessive, and what owns the salt content is "the high pools," which is plural: "their." "There" is an adverb of place and owns nothing. "Its" is a possessive but singular, and the clause is about the whole band of high pools. "Our" is first person, and nobody is speaking in this sentence.',
  None)

R['ACT-EN6-P2-Q02'] = (
  ["No Change",
   "by chance; it marks",
   "by chance; it marked",
   "by chance, this marks"],
  "by chance; it marks",
  'A comma cannot join two independent statements, and a semicolon can, so the original and the version with "this" are both splices no matter which pronoun stands in the second half. Between the two semicolon versions the tense decides: the paragraph states a standing fact in the present ("Mussels get on every surface," "Sea stars eat mussels"), so the past "marked" puts the band of clean rock into a history the passage is not telling.',
  None)

R['ACT-EN6-P2-Q03'] = (
  ["No Change",
   "tides, stay cold",
   "tides stay cold",
   "tides, stayed cold"],
  "tides, stay cold",
  'The subject is "The low pools," which is plural, so the verb is "stay" and not "stays"; and the phrase "uncovered only on the strongest tides" interrupts subject and verb, so it has to be closed with a comma as well as opened with one. Dropping the closing comma leaves the interrupter half-punctuated. "Stayed" is punctuated correctly but is past tense, while the whole paragraph describes what the bands do now.',
  None)

R['ACT-EN6-P2-Q04'] = (
  ["No Change",
   "find it, a sea star pried loose usually cannot reattach.",
   "find it and a sea star pried loose usually cannot reattach.",
   "find it; a sea star pried loose usually could not reattach."],
  "No Change",
  'Two complete statements stand on either side of the semicolon, which is exactly what a semicolon joins. A comma alone makes a splice. Joining them with "and" turns the warning into a second instruction, as though the reader should both leave the creature alone and do something about reattaching it. The last version punctuates the join correctly but shifts to "could not," a past form inside a paragraph of present-tense advice to a visitor.',
  None)

R['ACT-EN6-P2-Q05'] = (
  ["No Change",
   "sea star, a common resident",
   "sea star, and a common resident",
   "sea star; a common resident"],
  "sea star, a common resident",
  '"A common resident of the low pools" renames the ochre sea star, and a renaming phrase at the end of a sentence is set off with a comma. Without one the sentence reads as though two things are being considered. Adding "and" makes that reading explicit, turning one animal into two. A semicolon needs a complete statement on the far side of it, and "a common resident of the low pools" has no verb.',
  None)

# ---------------- en6-p3 "A Beat Behind, Then Even" ----------------

R['ACT-EN6-P3-Q01'] = (
  ["No Change",
   "is not like interpreting a lecture.",
   "is not like a lecture in a classroom.",
   "is not like interpreting lectures."],
  "is not like interpreting a lecture.",
  'The sentence begins "Interpreting a concert," so what follows "like" has to be another act of interpreting, not a thing: a lecture, or a lecture in a classroom, cannot be compared with an activity. The two terms also have to match in number and definiteness — one concert against one lecture — so "interpreting lectures" compares a single evening\'s work with a general practice.',
  'illogical comparison')

R['ACT-EN6-P3-Q02'] = (
  ["No Change",
   "deciding whether a name should be fingerspelled or given a sign",
   "and deciding whether a name should be fingerspelled or given a sign",
   "having decided whether a name should be fingerspelled or given a sign"],
  "deciding whether a name should be fingerspelled or given a sign",
  'The series names three things Ruiz does in advance: "reading interviews," "___," and "choosing where in the space in front of her each character will stand." The middle item has to be a plain gerund phrase like its neighbors. An infinitive breaks the pattern; putting "and" before the second of three items leaves the series with two conjunctions; and "having decided" is a perfect participle, which names something finished before the preparation rather than part of it.',
  None)

R['ACT-EN6-P3-Q03'] = (
  ["No Change",
   "the floor's vibration",
   "the floors' vibration",
   "its vibration"],
  "the floor's vibration",
  'One floor is doing the vibrating, so the singular possessive "the floor\'s vibration" is what the sentence needs. Without an apostrophe "floors" is a plain plural and cannot own anything. The plural possessive "floors\'" invents a set of floors the passage never mentions. "Its" is a legal possessive but has no antecedent here: the nearest singular nouns are the interpreter and the band, and neither is what the shoes are resting on.',
  None)

# P3-Q04 (consistent verb tense) deliberately UNCHANGED - see the DIFF.
# P3-Q05 below.

R['ACT-EN6-P3-Q05'] = (
  ["No Change",
   "She is not a performer because she will spend the next three hours in front of several thousand people.",
   "She is not a performer, and she will spend the next three hours in front of several thousand people.",
   "She is not a performer, so she will spend the next three hours in front of several thousand people."],
  "No Change",
  'The two halves stand in tension — she is not a performer, yet she will be in front of thousands — and only the subordinating conjunction "although" names that relation. "Because" and "so" both claim a cause, in opposite directions, and neither is true: standing in front of thousands is not why she is not a performer, and not being a performer is not why she will stand there. "And" simply adds the second fact to the first and leaves the tension unmarked.',
  'subordination and the logical relation between clauses')

# ---------------- en6-p4 "Eight of Eleven" ----------------

R['ACT-EN6-P4-Q01'] = (
  ["No Change",
   "amended licenses; they put the total in the thousands of dollars",
   "amended licenses; they had put the total in the thousands of dollars",
   "amended licenses, the total came to thousands of dollars"],
  "amended licenses; they put the total in the thousands of dollars",
  'A three-item series ends and a whole new statement begins, so the break between them has to be stronger than the commas separating the series items; a semicolon supplies it, and rewriting the second half as "the total came to thousands of dollars" leaves it joined by a comma all the same. Between the two semicolon versions the tense decides: the owners counted and then totaled, so the past perfect "had put" reverses the order the sentence has just set out.',
  None)

R['ACT-EN6-P4-Q02'] = (
  ["No Change",
   "The historical society, which had opposed the change, agreed",
   "The historical society, who had opposed the change, agreed",
   "The historical society which had opposed the change agreed"],
  "The historical society, which had opposed the change, agreed",
  'The relative pronoun is the subject of "had opposed," so it cannot be the object form "whom"; and its antecedent is an organization rather than a person, so "which" is right and "who" is not. Fairhaven has one historical society, already fully identified, so the clause adds information rather than picking out which society is meant and must be set off with commas at both ends.',
  'relative pronoun choice and nonessential-clause commas')

R['ACT-EN6-P4-Q03'] = (
  ["No Change",
   "Eight of the eleven were renamed for residents of the neighborhood the land company had subdivided.",
   "Eight of the eleven are renamed for residents of the neighborhood the land company had subdivided.",
   "Eight of the eleven had been renamed for residents of the neighborhood the land company had subdivided."],
  "Eight of the eleven were renamed for residents of the neighborhood the land company had subdivided.",
  'As written, "renamed" is a past participle modifying "Eight," so the group of words has a subject and no finite verb at all. Each of the three revisions supplies one, and the tense decides among them: the council voted in 2019 and the paragraph reports what it approved, so the simple past "were renamed" is right. "Are renamed" puts a finished vote into the present, and "had been renamed" would mean the streets already carried the new names before the council acted.',
  'sentence fragment and verb tense')

R['ACT-EN6-P4-Q04'] = (
  ["No Change",
   "the honor, which is a limited thing, is spent on someone else",
   "the honors, which are limited things, be spent on someone else",
   "the honor which is a limited thing be spent on someone else"],
  "No Change",
  'A demand introduced by "asked that" takes the subjunctive "be spent," so the indicative "is spent" reports a fact instead of making a request. The clause describing the honor adds information about something already identified and so needs a comma at each end, which the last version drops. And what supporters asked to be spent elsewhere is the single honor carried by one street name, not a plural set of honors.',
  None)

R['ACT-EN6-P4-Q05'] = (
  ["No Change",
   "what a city owes its own history",
   "what a city owes their own history",
   "what a city owes his own history"],
  "what a city owes its own history",
  'The possessive pronoun "its" has no apostrophe; "it\'s" expands to "it is," which makes no sense after "owes." The other two are real possessives but do not match the owner: "their" is plural and the owner is "a city," and "his" would make a city a man.',
  None)

R['ACT-EN6-P4-Q06'] = (
  ["No Change",
   "two years of hearings, a petition with four thousand signatures and an argument that has never quite ended",
   "two years of hearings; a petition with four thousand signatures; and an argument that has never quite ended",
   "two years of hearings, a petition with four thousand signatures, and arguing that has never quite ended"],
  "No Change",
  'Three noun phrases are separated by commas with the last introduced by "and," which is how a simple series is punctuated in edited American English. Dropping the comma before "and" lets the last two items read as a single item, a petition that came with both signatures and an argument. Semicolons are reserved for series whose own items already contain commas, and these do not. "Arguing" changes the third item from a noun to a gerund that no longer matches "two years" and "a petition."',
  None)

# ---------------- en6-p5 "Signal from the Old Creamery" ----------------

R['ACT-EN6-P5-Q01'] = (
  ["No Change",
   "model; it was an argument",
   "model; it was, however, an argument",
   "model, it was rather an argument"],
  "model; it was an argument",
  'Two independent statements joined by a comma need a semicolon instead, and inserting "rather" between the subject and the rest leaves the comma doing work it cannot do. Between the two semicolon versions the connective decides: "however" announces a contrast, and there is none — the second half does not oppose the first, it says what community radio was instead of a business model, which the sentence has already set up with "not."',
  None)

R['ACT-EN6-P5-Q02'] = (
  ["No Change",
   "its owner who wanted the taxes off his books sold",
   "their owner, who wanted the taxes off his books, sold",
   "its owner, who wanted the taxes off his books, sells"],
  "No Change",
  'The creamery has one owner, already identified by "its," so the clause about the taxes adds information rather than picking out which owner is meant and takes a comma at each end; without the commas it becomes restrictive and implies other owners who felt differently. "Their" is plural and the building is singular. "Sells" is present tense in a sentence anchored to the spring of 1974.',
  None)

R['ACT-EN6-P5-Q04'] = (
  ["No Change",
   "Afternoons belonged to whomever showed up.",
   "Afternoons belonged to whoever shows up.",
   "Afternoons belonged to whoever had shown up."],
  "No Change",
  'The pronoun is the subject of "showed up," and what follows the preposition "to" is the whole clause rather than the pronoun alone, so the subject form "whoever" is right and the object form "whomever" is wrong even after "to." Of the two "whoever" versions, the present "shows up" breaks a paragraph that is otherwise reporting KMRW\'s first season in the past, and "had shown up" places the arriving before the afternoons that were being given away.',
  None)

R['ACT-EN6-P5-Q05'] = (
  ["No Change",
   "for seventeen years, and the insurance covered less than half the cost",
   "for seventeen years, but the insurance covered less than half the cost",
   "for seventeen years; the insurance covered less than half the cost"],
  "for seventeen years, and the insurance covered less than half the cost",
  'Two clauses are joined here, and with no punctuation at all the reader first parses "the insurance" as a second thing the lightning took out, so a comma before the conjunction is needed. The conjunction has to name the relation: both halves report the same disaster deepening, so "and" is right and "but" would announce a contrast the sentence does not make. A semicolon cannot be used, because both halves sit inside the "when" clause that began "when a lightning strike," and a semicolon would cut the second half loose from it.',
  None)

R['ACT-EN6-P5-Q06'] = (
  ["No Change",
   "The creamery on Route 9 had been empty since 1968",
   "The creamery on Route 9 has been empty since 1968",
   "The creamery on Route 9 was emptied in 1968"],
  "The creamery on Route 9 had been empty since 1968",
  'The narrative sits in the spring of 1974, and the emptiness began earlier and ran up to that point, which is what the past perfect expresses. The simple past "was empty since" cannot reach back from 1974 that way. The present perfect "has been empty since 1968" runs the emptiness up to today, and the building has been a radio station since 1974. "Was emptied in 1968" reports one act of clearing the place out rather than the state that made it available.',
  None)

# ---- items deliberately left alone, with the reason recorded in the DIFF ----
UNCHANGED_BY_DESIGN = {'ACT-EN6-P3-Q04', 'ACT-EN6-P5-Q03'}
assert set(R) | UNCHANGED_BY_DESIGN == set(CONV), (
    set(CONV) - set(R) - UNCHANGED_BY_DESIGN, set(R) - set(CONV))
assert not (set(R) & UNCHANGED_BY_DESIGN)

for iid, (choices, key, expl, subskill) in R.items():
    it = byid[iid]
    assert it['domain'] == 'Conventions of Standard English'
    assert len(choices) == 4, iid
    assert len(set(choices)) == 4, f"{iid}: duplicate options"
    assert key in choices, f"{iid}: key not among choices"
    assert choices[0] == 'No Change', iid
    it['choices'] = choices
    it['correct_answer'] = key
    it['explanation'] = expl
    if subskill:
        it['subskill'] = subskill

# --- identity / invariant assertions on the OUTPUT ---
assert len(items) == 50
assert collections.Counter(i['domain'] for i in items) == {
    'Conventions of Standard English': 27,
    'Production of Writing': 15,
    'Knowledge of Language': 8}
assert collections.Counter(i['passage_id'] for i in items) == {
    'en6-p1': 10, 'en6-p2': 10, 'en6-p3': 10, 'en6-p4': 10, 'en6-p5': 10}

orig = json.load(open(SRC))
origby = {i['id']: i for i in orig}
held = [i['id'] for i in orig if i['domain'] != 'Conventions of Standard English']
assert len(held) == 23
for iid in held:
    assert origby[iid] == byid[iid], f"{iid} was modified and must not be"
for iid in UNCHANGED_BY_DESIGN:
    assert origby[iid] == byid[iid], f"{iid} was modified and must not be"
for i in items:
    assert i['correct_answer'] in i['choices'], i['id']
    assert len(i['choices']) == 4
    assert len(set(i['choices'])) == 4, i['id']
    o = origby[i['id']]
    assert o['passage'] == i['passage'], f"{i['id']} passage changed"
    assert o['prompt'] == i['prompt'], f"{i['id']} prompt changed"
    assert o['domain'] == i['domain']
    assert o['passage_id'] == i['passage_id']
    assert o['difficulty'] == i['difficulty']
    assert o['passage_title'] == i['passage_title']

json.dump(items, open(DST, 'w'), indent=2, ensure_ascii=False)
print("wrote", DST, len(items), "items;", len(R),
      "Conventions items rewritten;", len(UNCHANGED_BY_DESIGN),
      "Conventions items unchanged by design; 23 non-Conventions items byte-identical")
