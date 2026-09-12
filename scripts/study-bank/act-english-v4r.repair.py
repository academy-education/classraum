import json, sys, collections

SRC = '/Users/andylee/Downloads/saas/classraum/scripts/study-bank/act-english-v4.batch.json'
DST = '/Users/andylee/Downloads/saas/classraum/scripts/study-bank/act-english-v4r.batch.json'

items = json.load(open(SRC))
assert len(items) == 50, f"input identity: expected 50 items, got {len(items)}"
byid = {i['id']: i for i in items}
assert len(byid) == 50

CONV = [i['id'] for i in items if i['domain'] == 'Conventions of Standard English']
assert len(CONV) == 27, len(CONV)

# id -> (new_choices, new_key, new_explanation, new_subskill or None)
R = {}

R['ACT-EN4-P1-Q01'] = (
  ["No Change",
   "until we ran out of breath",
   "until he ran out of breath",
   "until you ran out of breath"],
  "until we ran out of breath",
  'The people blowing bubbles are "each of us," putting in "our faces," so the pronoun in the final clause has to stay first-person plural: "until we ran out of breath." "They" has no plural antecedent but "faces"; "he" points back to Mr. Osei, who is the one giving the instruction rather than the one holding his breath; and "you" shifts out of the first person partway through the sentence.',
  None)

R['ACT-EN4-P1-Q03'] = (
  ["No Change",
   "having its face covered",
   "having their face covered",
   "having his face covered"],
  "having its face covered",
  'The possessive has to match "the body," which is singular and is not a person: "having its face covered." "It\'s" is the contraction of "it is"; "their" is plural, and the only plural noun nearby is "us," which is not what has a face covered here; "his" would assign a gender to "the body," which the sentence treats as a thing.',
  "possessive pronoun agreement with a singular antecedent (its vs. it's)")

R['ACT-EN4-P1-Q05'] = (
  ["No Change",
   "were not used to",
   "are not used to",
   "has not been used to"],
  "were not used to",
  'Two things have to be right at once. The subject is "arms," which is plural, so "was not used to" and "has not been used to" are out; and the sentence is part of a past-tense narrative that ends "something that gave way," so the present-tense "are not used to" is out even though it agrees in number. That leaves the plural past "were not used to."',
  None)

R['ACT-EN4-P1-Q07'] = (
  ["No Change",
   "Mr. Osei wrote something on his clipboard while I hung there, breathing hard",
   "Mr. Osei, breathing hard, wrote something on his clipboard while I hung there",
   "Mr. Osei wrote something on his clipboard, breathing hard, while I hung there"],
  "Mr. Osei wrote something on his clipboard while I hung there, breathing hard",
  'The narrator has just swum a length of the deep end, so "breathing hard" describes the narrator and has to sit next to "I": "while I hung there, breathing hard." Opening the sentence with the phrase attaches it to the subject that follows it, Mr. Osei; setting it between "Mr. Osei" and "wrote" attaches it to Mr. Osei outright; and placing it after "clipboard" leaves the nearest available subject still Mr. Osei.',
  None)

R['ACT-EN4-P1-Q09'] = (
  ["No Change",
   "that: it was never trying to hurt me; it was only waiting",
   "that: it was never trying to hurt me, it was only waiting",
   "that; it was never trying to hurt me; it was only waiting"],
  "that: it was never trying to hurt me; it was only waiting",
  '"The pool taught me that" is complete, and "that" points forward to the two clauses that follow, so a colon introduces them; those two clauses are themselves independent and need a semicolon between them: "that: it was never trying to hurt me; it was only waiting." The original joins all three with commas. Getting the colon right and then leaving a comma before "it was only waiting" still leaves a splice. A semicolon after "that" is the wrong mark in the other direction: it closes off the clause instead of handing it forward to its own explanation, so "that" is left pointing at nothing.',
  None)

R['ACT-EN4-P2-Q01'] = (
  ["No Change",
   "moved onto them",
   "moved onto those",
   "moved onto that"],
  "No Change",
  'What the crews move onto is the ice, a singular noun, so the singular "it" is right. "Them" and "those" are plural, and the only plural noun in reach is "inches." "That" is a demonstrative pointing across a distance at something being introduced, which is not how a noun named earlier in the same sentence is normally picked up.',
  None)

R['ACT-EN4-P2-Q02'] = (
  ["No Change",
   "the town's crop",
   "the towns' crop",
   "the town crop"],
  "the town's crop",
  'The crop belongs to one town, Millbrook, so the singular possessive "the town\'s crop" is needed. "Towns" with no apostrophe is a plain plural doing no possessive work; "towns\'" is the possessive of more than one town, and the essay has one; and "the town crop" makes "town" a describing word, naming a kind of crop rather than saying whose crop it is.',
  None)

R['ACT-EN4-P2-Q03'] = (
  ["No Change",
   "and a price",
   "and priced",
   "and it had a price"],
  "and a price",
  'The list names three things the crop has, and the first two are noun phrases: "a season, a market, and a price." "It was priced" and "it had a price" each start a new clause with its own subject and verb, which a list of nouns cannot absorb, and "priced" is a past participle rather than a noun, so it does not match "a season" and "a market" either.',
  None)

R['ACT-EN4-P2-Q04'] = (
  ["No Change",
   "were floated",
   "are floated",
   "has been floated"],
  "were floated",
  'The subject is "blocks," plural, so "was floated" and "has been floated" are out; "weighing more than two hundred pounds apiece" describes the blocks and is not itself the subject. "Are floated" agrees in number but is present tense, while the paragraph is telling what men did with saws in a past January. The plural past is "were floated."',
  None)

R['ACT-EN4-P2-Q10'] = (
  ["No Change",
   "ice; within a decade",
   "ice: within a decade",
   "ice within a decade"],
  "ice; within a decade",
  '"Mechanical refrigeration had become cheap enough for a hotel to make its own ice" and "within a decade the market for the natural kind had melted away" are both independent clauses. A comma alone splices them and no punctuation at all runs them together. A colon would announce that the second clause explains or specifies the first, but it does not: it reports what happened next. A semicolon joins two related independent clauses without claiming either relation, which is what this sentence needs.',
  None)

R['ACT-EN4-P3-Q01'] = (
  ["No Change",
   "most people cannot say what they are looking at",
   "what they are looking at is a question that stumps most people",
   "the answer is one that most people cannot give"],
  "most people cannot say what they are looking at",
  'The opening phrase "having driven for hours to look at leaves" describes people, so the subject of the main clause has to be the people who did the driving: "most people cannot say what they are looking at." "The question," "what they are looking at" and "the answer" did no driving, so each of the other three leaves the opening phrase attached to something that cannot perform it.',
  None)

R['ACT-EN4-P3-Q02'] = (
  ["No Change",
   "is simply",
   "was simply",
   "have been simply"],
  "is simply",
  'The subject of the second clause is "chlorophyll," a singular noun; "the green one" renames it and does not make it plural, so "are" and "have been" are out. "Was" agrees in number but puts the clause in the past, while the paragraph states what a leaf contains as a standing fact and the neighboring verbs ("contains," "sit") are present. That leaves "is simply."',
  None)

R['ACT-EN4-P3-Q08'] = (
  ["No Change",
   "the leaf's machinery",
   "the leaves' machinery",
   "its machinery"],
  "the leaf's machinery",
  'The machinery belongs to one leaf, the same leaf the sentence goes on to call "it" when it "dismantles itself," so the singular possessive "the leaf\'s machinery" is needed. "Leafs" carries no apostrophe and so is not a possessive at all; "the leaves\' machinery" is plural and clashes with the singular "it dismantles itself"; and "its machinery" would have to reach back to "the anthocyanins," which are plural and are the sunscreen rather than the thing being shielded.',
  None)

R['ACT-EN4-P3-Q09'] = (
  ["No Change",
   "lay their eggs",
   "lay her eggs",
   "lay our eggs"],
  "lay their eggs",
  'The eggs belong to the "insects" looking for a place, a plural noun, so the possessive is "their." "Its" and "her" are singular, and "her" additionally picks out one female insect the sentence has not introduced; "our" is first person, and no one is speaking in this sentence.',
  None)

R['ACT-EN4-P3-Q10'] = (
  ["No Change",
   "forest; it is",
   "forest, which is",
   "forest it is"],
  "forest; it is",
  '"A dull year is not a sick forest" and "it is usually a mild, wet October" are two independent clauses that correct one another, so a semicolon joins them. A comma alone is a splice and no punctuation is a run-on. "Forest, which is" is perfectly good grammar but says something the paragraph does not mean: the relative clause would attach to "a sick forest," making the forest the mild, wet October, when it is the dull year that is being explained.',
  None)

R['ACT-EN4-P4-Q01'] = (
  ["No Change",
   "have stood",
   "stand",
   "has been standing"],
  "have stood",
  'The subject is "walls," plural — "of this kind" describes the walls and is not the subject — so the singular "has stood" and "has been standing" are out. "Stand" is plural but simple present, which cannot carry "for two centuries"; a stretch of time running up to now takes the present perfect. That leaves "have stood."',
  None)

R['ACT-EN4-P4-Q03'] = (
  ["No Change",
   "a long stone, the through, is laid",
   "a long stone, and the through, is laid",
   "a long stone, the through is laid"],
  "a long stone, the through, is laid",
  '"The through" is another name for the same long stone, and a renaming phrase dropped into the middle of a sentence takes a comma on each side: "a long stone, the through, is laid." With no commas the two nouns run together into one name. A single comma before it separates the subject from its verb and leaves the renaming unclosed. Adding "and" turns the renaming into a second, separate thing being laid, which the singular verb "is laid" then fails to match and which the paragraph contradicts — the through is the long stone.',
  None)

R['ACT-EN4-P4-Q05'] = (
  ["No Change",
   "and sets it",
   "and set it",
   "and it is set"],
  "and sets it",
  'The series names three things Delgado does: she "picks it up, turns it, and sets it." The third verb has to match the first two in form and in agreement with "she." "Setting" is a participle, not a finite verb; "set" is either the plain form or the past, and neither agrees with "she" in a present-tense sentence; and "it is set" swaps in a new subject and the passive voice partway through the list.',
  None)

R['ACT-EN4-P4-Q07'] = (
  ["No Change",
   "job; the old stone",
   "job the old stone",
   "job, the old stones"],
  "job; the old stone",
  '"She rarely brings new stone to a job" and "the old stone is already the right color" are both complete clauses, so a comma alone is a splice and no punctuation at all is a run-on. Making the noun plural does not repair the join and breaks the sentence a second way, since the verb that follows is the singular "is." The semicolon joins the two clauses and leaves the rest of the sentence intact.',
  None)

R['ACT-EN4-P4-Q08'] = (
  ["No Change",
   "by whoever built",
   "by whomever had built",
   "by whichever built"],
  "by whoever built",
  'The pronoun is the subject of "built," so it takes the subject form "whoever," and the preposition "by" does not change that: what follows "by" is the whole clause "whoever built the wall the first time," not the pronoun by itself. "Whomever" is the object form, and adding "had" does not make it any more subject-like. "Whichever" is a subject form but selects among things rather than people, and the wall was built by a person.',
  None)

R['ACT-EN4-P4-Q09'] = (
  ["No Change",
   "are hers",
   "are theirs",
   "are his"],
  "are hers",
  'The sections belong to Delgado, so the possessive pronoun standing alone is "hers" — possessive pronouns take no apostrophe, which is why "her\'s" is wrong. "Theirs" is plural and would hand the sections to the farmers, and "his" gives them to someone else again; the whole sentence is about whether anyone will know which sections this one woman built.',
  None)

R['ACT-EN4-P5-Q01'] = (
  ["No Change",
   "exists in some form",
   "has existed in some form",
   "have existed in some form"],
  "exists in some form",
  'The subject is "the night market," singular; the long phrase between the commas describes it and happens to end in the plural nouns "stalls and vendors," but they are not the subject, so "exist" and "have existed" are out. "Has existed" agrees in number but puts a standing fact into the present perfect, which sits badly with a list of places rather than a stretch of time, and with the simple present the rest of the paragraph uses ("It is easy to mistake it"). That leaves "exists in some form."',
  None)

R['ACT-EN4-P5-Q02'] = (
  ["No Change",
   "tourism, and it answers",
   "tourism, but it answers",
   "tourism it answers"],
  "tourism, and it answers",
  'Two independent clauses need more than a comma, and running them together with none at all is worse. A comma with a coordinating conjunction is the repair, and the conjunction has to name the right relation: the second clause adds to the first — the market is old, and here is what it has always done — so "and" is right. "But" would announce a contrast, and there is none between the market being older than tourism and its answering an old need.',
  None)

R['ACT-EN4-P5-Q04'] = (
  ["No Change",
   "such a market is not a novelty but a sensible adaptation",
   "there is no novelty in such a market, only sensible adaptation",
   "the point of such a market is not novelty but sensible adaptation"],
  "such a market is not a novelty but a sensible adaptation",
  'The opening phrase "Opening at six in the evening" describes the market, so the market has to be the subject of the clause that follows: "such a market is not a novelty but a sensible adaptation." In the original the subject is "novelty," which does not open at any hour; "there" is an empty placeholder; and "the point" does not open at six either, even though the phrase "of such a market" appears inside it.',
  None)

R['ACT-EN4-P5-Q06'] = (
  ["No Change",
   "the smoke from the grill",
   "the smoke from their grills",
   "the smoke from a grill"],
  "No Change",
  'The list gathers the general impressions a crowd makes — "the noise," "the chance to eat standing up," "the sense of a whole neighborhood out of doors" — and a market of food stalls has many grills, so the plain definite plural "the grills" is right. "The grill" and "a grill" both single out one grill the essay has never mentioned, and "a grill" also breaks the run of definite phrases the list is built from. "Their" has no plural antecedent in the sentence; the nearest candidate, "the crowd," is not who owns the grills.',
  "number and reference in a parallel list")

R['ACT-EN4-P5-Q07'] = (
  ["No Change",
   "and where a person",
   "where a person",
   "and it is where a person"],
  "and where a person",
  'The sentence lists three "where" clauses hanging off "it is": "where families go," "where teenagers are first allowed out alone," and "where a person who lives alone can eat dinner." The last item needs both the "and" that closes a three-item list and the "where" that matches the other two. Dropping the "where" makes the last item a clause of a different shape; dropping the "and" leaves the list unjoined; and "and it is where" restarts the main clause instead of completing the series.',
  None)

R['ACT-EN4-P5-Q09'] = (
  ["No Change",
   "closes its doors",
   "closes his doors",
   "closes those doors"],
  "closes its doors",
  'Everything in the series is done by "a city" — it moves, gives, and closes — and the same sentence goes on to call the city "it," so the possessive is "its." "Their" is plural and would hand the doors to the vendors; "his" gives a city a gender it does not have; and "those doors" points at doors the sentence has not introduced.',
  None)

assert set(R) == set(CONV), (set(CONV) - set(R), set(R) - set(CONV))

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
    'en4-p1': 10, 'en4-p2': 10, 'en4-p3': 10, 'en4-p4': 10, 'en4-p5': 10}

orig = json.load(open(SRC))
origby = {i['id']: i for i in orig}
untouched = [i['id'] for i in orig if i['domain'] != 'Conventions of Standard English']
assert len(untouched) == 23
for iid in untouched:
    assert origby[iid] == byid[iid], f"{iid} was modified and must not be"
for i in items:
    assert i['correct_answer'] in i['choices'], i['id']
    assert len(i['choices']) == 4
    assert origby[i['id']]['passage'] == i['passage'], f"{i['id']} passage changed"
    assert origby[i['id']]['prompt'] == i['prompt'], f"{i['id']} prompt changed"
    assert origby[i['id']]['domain'] == i['domain']

json.dump(items, open(DST, 'w'), indent=2, ensure_ascii=False)
print("wrote", DST, len(items), "items;", len(R), "Conventions items rewritten; 23 others byte-identical")
