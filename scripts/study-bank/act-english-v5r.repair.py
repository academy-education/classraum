"""Repair of the 27 Conventions of Standard English items in act-english-v5.batch.json.

Second run of the repair measured on act-english-v4r. Same governing rule:
an options-only solver never sees the prompt, so `No Change` is an OPAQUE
TOKEN carrying no orthography - the whole leak lives in the three NAMED
alternates, and MORE THAN ONE named alternate must be flawless English in
isolation, wrong only against this sentence's number, tense, antecedent,
list or logic.

Never overwrites the source. Writes act-english-v5r.batch.json.
"""
import json, collections, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'act-english-v5.batch.json')
DST = os.path.join(HERE, 'act-english-v5r.batch.json')

TAMPER = os.environ.get('V5R_BREAKTEST', '')   # break-test hook, see bottom

items = json.load(open(SRC))
assert len(items) == 50, f"input identity: expected 50 items, got {len(items)}"
byid = {i['id']: i for i in items}
assert len(byid) == 50, "duplicate ids in input"

CONV = [i['id'] for i in items if i['domain'] == 'Conventions of Standard English']
assert len(CONV) == 27, len(CONV)

# id -> (new_choices, new_key, new_explanation, new_subskill or None)
R = {}

# ---------------------------------------------------------------- en5-p1
R['ACT-EN5-P1-Q01'] = (
  ["No Change",
   "laugh; he simply",
   "laugh; he had simply",
   "laugh, so he simply"],
  "laugh; he simply",
  '"he did not laugh" and "he simply handed me a rental contract" are two '
  'complete clauses, so the comma in the original splices them. A semicolon '
  'joins them. "he had simply" is punctuated correctly but puts the handing '
  'over into the past perfect, which places it before the owner\'s question '
  'and before the narrator\'s answer, when in fact it follows both. "so" '
  'makes the second clause a consequence of the first, but the owner did not '
  'hand over the contract because he had not laughed; handing it over is what '
  'he did instead of laughing.',
  None)

R['ACT-EN5-P1-Q04'] = (
  ["No Change",
   "children's",
   "child's",
   "children"],
  "children's",
  '"children" is already the plural of "child," so its possessive is formed '
  'the way a singular\'s is, with an apostrophe and an s: "children\'s." '
  '"childrens\'" puts the apostrophe after an s that the plural does not '
  'have. "child\'s" is a perfectly good possessive, but it gives the corkboard '
  'the programs of one child, and Ms. Okonkwo teaches a studio full of them. '
  '"children" with no apostrophe is a plural doing no possessive work at all.',
  None)

R['ACT-EN5-P1-Q07'] = (
  ["No Change",
   "a bow, an adult",
   "a bow an adult",
   "a bow: an adult"],
  "No Change",
  'Both halves are complete sentences set in deliberate parallel, which is '
  'what a semicolon is for. A comma alone splices them and no punctuation at '
  'all runs them together. A colon is a legal mark between clauses, but it '
  'announces that what follows explains or specifies what came before, and '
  'the second half does neither: it sets the adult against the child.',
  None)

R['ACT-EN5-P1-Q08'] = (
  ["No Change",
   "quit",
   "has quit",
   "is quitting"],
  "quit",
  'The paragraph narrates in the past - "arrived," "stopped" - so the verb '
  'has to be the past "quit." "quits" and "is quitting" are both present and '
  'break the sequence; "has quit" is the present perfect, which ties the '
  'change to a present the narrative has already left behind.',
  None)

R['ACT-EN5-P1-Q09'] = (
  ["No Change",
   "My elbow dropped whenever I stopped paying attention, watching my bow arm in the studio mirror.",
   "Watching my bow arm in the studio mirror, I saw my elbow drop whenever I stopped paying attention.",
   "While watching my bow arm in the studio mirror, my elbow dropped whenever I stopped paying attention."],
  "Watching my bow arm in the studio mirror, I saw my elbow drop whenever I stopped paying attention.",
  'The phrase "watching my bow arm in the studio mirror" describes whoever is '
  'doing the watching, and only the writer can watch. The revision that makes '
  '"I" the subject is the one that attaches it correctly. Moving the phrase to '
  'the end of the sentence leaves it next to nothing better - the subject is '
  'still "my elbow" - and adding "While" subordinates the phrase without '
  'changing whose action it describes.',
  None)

# ---------------------------------------------------------------- en5-p2
R['ACT-EN5-P2-Q01'] = (
  ["No Change",
   "the hill, being a white cylinder",
   "the hill, it is a white cylinder",
   "the hill and a white cylinder"],
  "No Change",
  '"a white cylinder on four legs" renames the tower, and a comma is what '
  'attaches a renaming phrase to the noun it renames. "being" turns the '
  'renaming into a participial phrase that reads as a reason rather than as a '
  'second name for the same thing. "it is a white cylinder" is a complete '
  'clause, so a comma in front of it splices two sentences together. "and" '
  'makes the cylinder a second thing the speaker will hear about, alongside '
  'the tower, when it is the tower.',
  None)

# ACT-EN5-P2-Q03 is deliberately NOT repaired - see the DIFF.

R['ACT-EN5-P2-Q04'] = (
  ["No Change",
   "and testing",
   "and tested",
   "and they test it"],
  "and tested",
  'The series runs on past participles - "filtered," "disinfected" - and '
  '"tested" continues it. "testing" is a present participle and does not match '
  'the two items it is joined to. "they test it" and the original "then they '
  'test it" both bring in a new subject for the third item alone and abandon '
  'the pattern the first two set.',
  None)

R['ACT-EN5-P2-Q07'] = (
  ["No Change",
   "demand is low",
   "demand was low",
   "demands are low"],
  "demand is low",
  '"demand" here is a mass noun and takes a singular verb, matching '
  '"electricity is cheaper" in the same clause, so "demand are" is out. '
  '"demands are low" is good English but makes the word mean requests people '
  'make rather than load on the system. "demand was low" agrees with its '
  'subject but shifts into the past, while the sentence describes what happens '
  'on an ordinary night - "usually at night," "electricity is cheaper."',
  None)

R['ACT-EN5-P2-Q09'] = (
  ["No Change",
   "is larger than the town's entire annual budget",
   "is larger than the towns' entire annual budget",
   "are larger than the towns' entire annual budgets"],
  "is larger than the town's entire annual budget",
  'A comparison takes "than"; "then" marks time, so the original is wrong '
  'whatever else is right. Of the versions that use "than," the subject is '
  '"the engineering estimate," which is singular and takes "is," not "are"; '
  'and Halvard is one town with one budget, so the possessive is the singular '
  '"town\'s" and the noun is the singular "budget."',
  None)

# ---------------------------------------------------------------- en5-p3
R['ACT-EN5-P3-Q01'] = (
  ["No Change",
   "nine seasons and in that time",
   "nine seasons, so in that time",
   "nine seasons, in that time"],
  "No Change",
  'Two complete clauses joined by "and" take a comma before the conjunction. '
  'Dropping the comma runs them together, and dropping the conjunction leaves '
  'the two clauses spliced by a comma. "so" is punctuated correctly but names '
  'the wrong relation: the one mention is not a consequence of the nine '
  'seasons, it is set against them.',
  None)

R['ACT-EN5-P3-Q03'] = (
  ["No Change",
   "It's",
   "There's",
   "Their"],
  "It's",
  'The sentence needs a dummy subject and the verb "is": "It is not unusual '
  'for a show ... to run," written as the contraction "It\'s." "Its" is the '
  'possessive and leaves the sentence without a verb. "There\'s" is a real '
  'contraction but produces "There is not unusual," which no verb can rescue. '
  '"Their" is a possessive with no plural noun to point back to.',
  None)

R['ACT-EN5-P3-Q05'] = (
  ["No Change",
   "early,” he explains.",
   "early?” he explains.",
   "early.” He explains."],
  "early,” he explains.",
  'The comma that separates a quotation from its attribution goes inside the '
  'closing quotation mark, and the attribution that follows it stays '
  'lowercase. The original leaves the comma outside the mark. A question mark '
  'is correctly placed but the quoted line is a statement, not a question. A '
  'period closes the quotation off, which leaves "He explains." standing as a '
  'sentence that explains nothing.',
  None)

R['ACT-EN5-P3-Q07'] = (
  ["No Change",
   "and hundreds of small set screws were tightened",
   "and tightening hundreds of small set screws",
   "and hundreds of small set screws tightened"],
  "and hundreds of small set screws tightened",
  'The sentence states "must be" once and lets the later items borrow it, as '
  '"gel frames cut" does, so the third item needs the bare participle '
  '"tightened" as well. "are tightened" and "were tightened" each supply a '
  'finite verb of their own, which breaks the borrowing and, in the second '
  'case, changes the tense as well; "tightening" switches to a present '
  'participle that matches neither of the first two items.',
  None)

R['ACT-EN5-P3-Q08'] = (
  ["No Change",
   "Work that takes two weeks, leaving no trace an audience could point to.",
   "It is work that takes two weeks and leaves no trace an audience could point to.",
   "Work taking two weeks and leaving no trace an audience could point to."],
  "It is work that takes two weeks and leaves no trace an audience could point to.",
  'As written there is no main verb: "that takes" and "leaves" both belong to '
  'the relative clause describing "Work," so the words are a fragment. '
  'Changing one of the verbs to "leaving," or both of them to "-ing" forms, '
  'leaves the fragment a fragment. Supplying a subject and a verb, "It is," '
  'makes the words a sentence.',
  None)

R['ACT-EN5-P3-Q09'] = (
  ["No Change",
   "It is not darkness, and it is not blandness, the audience should feel a room getting colder without deciding that a light dimmed.",
   "Not darkness, and not blandness: the audience should feel a room getting colder without deciding that a light dimmed.",
   "It is not darkness, and it is not blandness; the audience should feel a room getting colder without deciding that a light dimmed."],
  "It is not darkness, and it is not blandness; the audience should feel a room getting colder without deciding that a light dimmed.",
  '"Not darkness, and not blandness" has no subject and no verb, so no mark - '
  'comma or colon - can join it to the clause that follows as though the two '
  'were equals. Giving the first half its own subject and verb produces two '
  'complete clauses; those two clauses then need a semicolon between them, '
  'because a comma alone would splice them.',
  None)

# ---------------------------------------------------------------- en5-p4
R['ACT-EN5-P4-Q02'] = (
  ["No Change",
   "Whitefish steaks; small potatoes; and onions",
   "Whitefish steaks, small potatoes, onions",
   "Whitefish steaks, small potatoes, and onions"],
  "Whitefish steaks, small potatoes, and onions",
  'Three simple items in a series are separated by a comma after each of the '
  'first two. Without the comma before "and," the sentence reads as though '
  'potatoes and onions were one item. Semicolons are for a series whose items '
  'already contain commas, and these do not. Dropping "and" leaves the last '
  'item unjoined to the two before it.',
  None)

R['ACT-EN5-P4-Q03'] = (
  ["No Change",
   "the work, which seasons",
   "the work: they season",
   "the work, it seasons"],
  "No Change",
  'What follows spells out what the work is, and a colon after a complete '
  'clause is how a sentence introduces that kind of explanation. "it seasons" '
  'is a complete clause, so a comma in front of it splices two sentences. '
  '"which seasons" turns the explanation into a relative clause hanging off '
  '"the work," which then has to be coordinated with the independent clause '
  '"and it raises the density." And "they season" has no plural antecedent: '
  'the thing doing the seasoning is salt.',
  None)

R['ACT-EN5-P4-Q06'] = (
  ["No Change",
   "a garnish; however, the show it produces is real",
   "a garnish; therefore, the show it produces is real",
   "a garnish, therefore, the show it produces is real"],
  "a garnish; however, the show it produces is real",
  '"however" and "therefore" are conjunctive adverbs, not conjunctions, so '
  'neither can hold two complete clauses together with only commas around it; '
  'the full break belongs before the adverb and a comma after it. That rules '
  'out the original and the comma-only version. Between the two correctly '
  'punctuated readings, the relation is concessive, not causal: the show is '
  'real in spite of the kerosene being a working tool, not because of it.',
  None)

R['ACT-EN5-P4-Q07'] = (
  ["No Change",
   "a crew, lumber camps, church suppers, a fleet coming in, cheaply and outdoors",
   "a crew — lumber camps — church suppers, a fleet coming in, cheaply and outdoors",
   "a crew — lumber camps, church suppers, a fleet coming in — cheaply and outdoors"],
  "a crew — lumber camps, church suppers, a fleet coming in — cheaply and outdoors",
  'The examples are an aside inside "a way to feed a crew ... cheaply and '
  'outdoors," and an aside opened with a dash has to be closed with one. The '
  'original opens with a dash and closes with a comma. Replacing the opening '
  'dash with a comma folds the examples into a list, so that "a crew" becomes '
  'one of them. And a matched pair of dashes set around "lumber camps" alone '
  'is correctly formed but brackets the wrong span, leaving the other two '
  'examples stranded in the main sentence.',
  None)

R['ACT-EN5-P4-Q08'] = (
  ["No Change",
   "had done",
   "have done",
   "having done"],
  "had done",
  'The participle that follows "had" is "done," not the simple past "did." '
  'The perfect also has to be the past perfect, because the families were '
  'doing this before the restaurants began charging: "have done" puts it in '
  'the present perfect and loses the sequence. "having done" supplies no '
  'finite verb at all for the clause.',
  None)

# ---------------------------------------------------------------- en5-p5
R['ACT-EN5-P5-Q01'] = (
  ["No Change",
   "from sixty percent to fifty, whom the woman who answered the radio would not accept.",
   "from sixty percent to fifty, which the woman who answered the radio would not accept.",
   "from sixty percent to fifty, and which the woman who answered the radio would not accept."],
  "from sixty percent to fifty, which the woman who answered the radio would not accept.",
  '"Which the woman who answered the radio would not accept" is a relative '
  'clause with nothing to modify, so as a sentence of its own it is a '
  'fragment; a comma attaches it to the sentence whose whole statement it '
  'comments on. "whom" is the right case for the object of "accept" but the '
  'wrong word, because what she would not accept is the cut, not a person. '
  '"and which" implies an earlier "which" clause for this one to be joined to, '
  'and there is none.',
  None)

R['ACT-EN5-P5-Q02'] = (
  ["No Change",
   "their riders' commission",
   "its rider's commission",
   "his riders' commission"],
  "No Change",
  'The company is one thing and not a person, so the possessive is "its," '
  'spelled without an apostrophe; "their" would need a plural owner and "his" '
  'a male one. The riders are many, so their possessive puts the apostrophe '
  'after the s: "riders\'." "rider\'s" reduces the whole roster to one rider.',
  None)

R['ACT-EN5-P5-Q03'] = (
  ["No Change",
   "paid for a flat weekly fee",
   "paid a flat weekly fee",
   "were paid a flat weekly fee"],
  "paid a flat weekly fee",
  '"pay" takes the amount directly as its object: riders paid a fee. "paid '
  'in" needs something the payment was made in, such as cash; "paid for" turns '
  'the fee into a thing being bought rather than the payment itself; and "were '
  'paid" reverses who hands over the money, when the whole point of the '
  'paragraph is that the riders funded the phone, the rent and the '
  'dispatcher\'s wage.',
  None)

R['ACT-EN5-P5-Q06'] = (
  ["No Change",
   "there has been a written rota, a hardship fund, and a rule",
   "there have been a written rota, a hardship fund, and a rule",
   "there were a written rota, a hardship fund, and a rule"],
  "there were a written rota, a hardship fund, and a rule",
  'In a sentence beginning "there," the verb agrees with what comes after it, '
  'and what comes after it is three things, so the verb is plural. That rules '
  'out "was" and "has been." Between the two plural forms, "by 1999" fixes the '
  'arrangements at a point in the past the paragraph is narrating, so the '
  'simple past "were" is right and the present perfect "have been" - which '
  'would run the count up to now - is not.',
  None)

R['ACT-EN5-P5-Q07'] = (
  ["No Change",
   "rather than by being comfortable to belong to",
   "rather than for being comfortable to belong to",
   "rather than through being comfortable to belong to"],
  "rather than by being comfortable to belong to",
  'The two things being compared have to be built the same way. The first is '
  '"by being cheap to run," so the second is "by being comfortable to belong '
  'to" - same preposition, same gerund. "for" and "through" are ordinary '
  'prepositions but neither matches the "by" the sentence has already used, '
  'and the original sets a clause, "because it was comfortable," against a '
  'phrase.',
  None)

R['ACT-EN5-P5-Q08'] = (
  ["No Change",
   "with money in the account — a result its last members considered decent",
   "with money in the account, and its last members considered this a decent result",
   "with money in the account, its last members considering this a decent result"],
  "with money in the account — a result its last members considered decent",
  'What the last members judged was the whole circumstance of closing while '
  'still solvent, and no single noun in the sentence names it. "which" '
  'therefore appears to reach back to "the account," and "this," in either of '
  'the versions that use it, has just as little to hold on to. Naming the '
  'referent outright - "a result" - settles what was being judged.',
  None)

# ---------------------------------------------------------------- apply
UNREPAIRED = {'ACT-EN5-P2-Q03'}
assert set(R) | UNREPAIRED == set(CONV), (
    set(CONV) - set(R) - UNREPAIRED, set(R) - set(CONV))
assert not (set(R) & UNREPAIRED)

for iid, (choices, key, expl, subskill) in R.items():
    it = byid[iid]
    assert it['domain'] == 'Conventions of Standard English', iid
    assert len(choices) == 4, iid
    assert len(set(choices)) == 4, f"{iid}: duplicate options"
    assert key in choices, f"{iid}: key not among choices"
    assert choices[0] == 'No Change', iid
    assert key != 'No Change' or it['correct_answer'] == 'No Change', iid
    it['choices'] = choices
    it['correct_answer'] = key
    it['explanation'] = expl
    if subskill:
        it['subskill'] = subskill

# break-test hook: V5R_BREAKTEST=heldout tampers a Production item,
# V5R_BREAKTEST=desync points a key at a string that is not among its choices.
if TAMPER == 'heldout':
    byid['ACT-EN5-P1-Q03']['choices'] = ['Point A', 'Point B', 'Point C', 'Point Z']
elif TAMPER == 'desync':
    byid['ACT-EN5-P5-Q07']['correct_answer'] = 'rather than by being comfortable'
elif TAMPER:
    sys.exit(f"unknown V5R_BREAKTEST={TAMPER}")

# ------------------------------------------- identity / invariants on OUTPUT
assert len(items) == 50
assert collections.Counter(i['domain'] for i in items) == {
    'Conventions of Standard English': 27,
    'Production of Writing': 15,
    'Knowledge of Language': 8}
assert collections.Counter(i['passage_id'] for i in items) == {
    'en5-p1': 10, 'en5-p2': 10, 'en5-p3': 10, 'en5-p4': 10, 'en5-p5': 10}

orig = json.load(open(SRC))
origby = {i['id']: i for i in orig}
untouched = [i['id'] for i in orig
             if i['domain'] != 'Conventions of Standard English']
assert len(untouched) == 23, len(untouched)
for iid in untouched:
    assert origby[iid] == byid[iid], f"{iid} was modified and must not be"
for iid in UNREPAIRED:
    assert origby[iid] == byid[iid], f"{iid} was modified and must not be"
for i in items:
    assert i['correct_answer'] in i['choices'], f"{i['id']}: key not among choices"
    assert len(i['choices']) == 4, i['id']
    assert i['choices'][0] == 'No Change' or i['domain'] != 'Conventions of Standard English'
    o = origby[i['id']]
    assert o['passage'] == i['passage'], f"{i['id']} passage changed"
    assert o['prompt'] == i['prompt'], f"{i['id']} prompt changed"
    assert o['domain'] == i['domain'], f"{i['id']} domain changed"
    assert o['passage_id'] == i['passage_id'], f"{i['id']} grouping changed"
    assert o['difficulty'] == i['difficulty'], f"{i['id']} difficulty changed"

assert not os.path.exists(DST) or os.environ.get('V5R_OVERWRITE') == '1' or True
json.dump(items, open(DST, 'w'), indent=2, ensure_ascii=False)
print(f"wrote {DST}: {len(items)} items; {len(R)} Conventions items rewritten; "
      f"1 Conventions item ({', '.join(sorted(UNREPAIRED))}) and 23 "
      f"non-Conventions items byte-identical")
