from common import *

# ---------------- P9  editorial, "we" (X 5/3/2) ----------------
p9 = ("[1] Our public library lends more than books. "
"Since last spring, card holders have been able to borrow a pressure washer, a sewing machine, a telescope, or any of about two hundred other objects from the new \"library of things\" in the basement. "
"The collection began with donations and a small grant, and it has been popular from the first week, the waiting list for the carpet cleaner is currently eleven names long.\n\n"
"[2] The county board will decide next month whether to give the program permanent funding. "
"The vote is scheduled for the board's public meeting on the fourteenth. We urge it to say yes.\n\n"
"[3] The case is partly about money. "
"Most households use a drill for a few minutes a year, and an infrequently used tool costs far more to own than to borrow. "
"A family that borrows a tent for one camping trip save the cost of buying one and the space of storing it. "
"Multiply those savings across a county of 90,000 people, and the program's extravagant budget looks like a bargain.\n\n"
"[4] The case is also about what a library is for. "
"Libraries began as a way to share things that were too expensive for most people to own alone; in the nineteenth century, that meant books. "
"Today a book is cheap, but a ladder long enough to reach a second-story gutter is not. "
"Nevertheless, lending one fits the library's original purpose as well as lending a novel does.\n\n"
"[5] Critics argue that borrowed tools will come back broken. "
"The library's records insinuate otherwise. "
"Of more than 1,400 loans so far, staff have recorded less than twenty items returned damaged, and every one was repaired for less than the cost of a single new tool. "
"The board should fund the program and let the waiting list for the carpet cleaner get shorter.")
mk(9, "Borrowing a Ladder", 'X', p9, [
 dict(kind='other', prompt='The writer is considering adding the following sentence after the second sentence of paragraph 1: "The basement once held the library\'s collection of old newspapers on microfilm." Should the writer make this addition?',
      opts=["Yes, because it explains where the two hundred objects in the collection are kept.",
            "Yes, because it shows that the library has always lent more than books, even in its basement.",
            "No, because the room's earlier use has no bearing on the program the editorial supports.",
            "No, because the editorial later argues that books have become cheap."],
      key="No, because the room's earlier use has no bearing on the program the editorial supports.",
      exp='The editorial argues for funding the lending program; what the basement used to store does not advance that case. The preceding sentence already says the objects are in the basement, microfilm kept on site is not lending, and the later point about cheap books gives no reason to leave the sentence out.',
      domain=PoW, sub="add sentence", diff="medium"),
 dict(kind='edit', sent="The collection began with donations and a small grant, and it has been popular from the first week, the waiting list for the carpet cleaner is currently eleven names long.",
      span="week, the waiting", ask="which choice makes the sentence most grammatically acceptable",
      opts=["week: the waiting", "week the waiting", "week, being that the waiting"], key="week: the waiting",
      exp='The last clause is independent and offers evidence for the claim that the program has been popular, and a colon introduces such an explanation. The original is a comma splice, no punctuation fuses the clauses, and "which" leaves the final clause with no role in the sentence.',
      domain=CSE, sub="comma splice", diff="medium"),
 dict(kind='edit', sent="Most households use a drill for a few minutes a year, and an infrequently used tool costs far more to own than to borrow.",
      span="than to borrow", ask="which choice makes the sentence most grammatically acceptable",
      opts=["then to borrow", "than borrowing", "as to borrow"], key=NC,
      exp='The comparison sets "to own" against "to borrow," so both sides take the same form, and "more" requires "than." "Then" refers to time, "than borrowing" breaks the parallel with "to own," and "more ... as" is not idiomatic.',
      domain=CSE, sub="comparison", diff="medium"),
 dict(kind='edit', sent="A family that borrows a tent for one camping trip save the cost of buying one and the space of storing it.",
      span="save", ask="which choice makes the sentence most grammatically acceptable",
      opts=["saves", "saving", "have saved"], key="saves",
      exp='The subject is "a family," which is singular; "that borrows a tent for one camping trip" only describes it. The verb must be singular: "saves." "Save" and "have saved" are plural, and "saving" leaves the sentence with no main verb.',
      domain=CSE, sub="subject-verb agreement", diff="easy"),
 dict(kind='edit', sent="Multiply those savings across a county of 90,000 people, and the program's extravagant budget looks like a bargain.",
      span="extravagant", ask="which choice best fits the context of the sentence",
      opts=["modest", "lavish", "bloated"], key="modest",
      exp='The editorial wants the budget funded and says it "looks like a bargain" next to the county\'s savings, so it describes the budget as small: "modest." "Extravagant," "lavish," and "bloated" all call the budget excessive, which would undercut the writers\' own argument.',
      domain=KoL, sub="word choice in context", diff="easy"),
 dict(kind='edit', sent="Libraries began as a way to share things that were too expensive for most people to own alone; in the nineteenth century, that meant books.",
      span="alone; in the", ask="which choice is correctly punctuated",
      opts=["alone, in the", "alone in the", "alone, and, in the"], key=NC,
      exp='Both halves are independent clauses, and the semicolon joins them correctly. A comma alone makes a comma splice, no punctuation runs "alone" into the next clause, and the comma after "and" separates the conjunction from its clause.',
      domain=CSE, sub="semicolon", diff="medium"),
 dict(kind='edit', sent="Nevertheless, lending one fits the library's original purpose as well as lending a novel does.",
      span="Nevertheless,", ask="which choice provides the most logical transition",
      opts=["Thus,", "For instance,", "Next,"], key="Thus,",
      exp='The paragraph has argued that libraries exist to share what is too costly to own and that a long ladder is now such a thing; this sentence draws the conclusion. "Thus," marks it. "Nevertheless" would set the conclusion against the argument that supports it, "For instance" would present it as an example, and "Meanwhile" would make it a separate event happening at the same time.',
      domain=PoW, sub="transition", diff="medium"),
 dict(kind='edit', sent="The library's records insinuate otherwise.",
      span="insinuate", ask="which choice is most precise in context",
      opts=["suggest", "allege", "proclaim"], key="suggest",
      exp='Records that point to a conclusion "suggest" it, and the next sentence supplies the numbers. "Insinuate" implies a sly hint, "allege" implies an unproven accusation, and "rumor" is not used as a verb this way; none fits plain figures.',
      domain=KoL, sub="word choice", diff="medium"),
 dict(kind='edit', sent="Of more than 1,400 loans so far, staff have recorded less than twenty items returned damaged, and every one was repaired for less than the cost of a single new tool.",
      span="less than twenty items", ask="which choice makes the sentence most grammatically acceptable",
      opts=["fewer than twenty items", "lesser than twenty items", "few than twenty items"], key="fewer than twenty items",
      exp='Items can be counted, so the comparison takes "fewer." "Less" is for amounts that are not counted one by one (as in "less than the cost," later in the sentence), "lesser" is an adjective meaning "smaller in importance," and "few than" is not idiomatic.',
      domain=CSE, sub="fewer/less", diff="easy"),
 dict(kind='other', prompt="The writer wants the last sentence of paragraph 5 to restate the editorial's recommendation and name a result the funding would bring about. Which choice best accomplishes this goal?",
      opts=["The board should fund the program and let the waiting list for the carpet cleaner get shorter.",
            "The board should fund the program and thank the donors who began the collection.",
            "The board should fund the program and remind critics that most tools come back intact.",
            "The board should fund the program, just as it did when it awarded the collection's first small grant."],
      key="The board should fund the program and let the waiting list for the carpet cleaner get shorter.",
      exp='Permanent funding would let the library buy more of what is in demand, and a shorter waiting list for the carpet cleaner from paragraph 1 is that result. Thanking donors and reminding critics are actions, not results of funding, and the editorial never says the board awarded the first grant.',
      domain=PoW, sub="conclusion", diff="hard"),
])

# ---------------- P10  biography (Y 6/3/1) ----------------
p10 = ("[1] The cliffs near Lyme Regis, on the southern coast of England, are made of soft gray rock and clay that crumble in winter storms. "
"Each landslide exposes the remains of animals that lived in the sea some 200 million years ago. "
"In the early 1800s, few people searched those cliffs as carefully, or as successfully, as Mary Anning.\n\n"
"[2] [A] Anning was born in 1799 into a poor family. [B] "
"Her father, a cabinetmaker, collected fossils from the beach and sold them to tourists, and he often took his children along. [C] "
"When he died in 1810, he left the family in debt, and fossil hunting became one of the ways the Anning's paid their bills. [D]\n\n"
"[3] Around 1811, Mary's brother Joseph found a strange skull in the cliffs. "
"Over the following months, Mary, then about twelve, uncovered the rest of the skeleton; a creature with a long snout and paddle-like limbs that scientists later named Ichthyosaurus, or \"fish lizard.\" "
"In 1823 she found the first complete skeleton of a plesiosaur, a marine reptile with a tiny head on an extraordinarily long neck. "
"The find was so unusual as a leading French anatomist at first suspected it was a fake.\n\n"
"[4] Anning also noticed that certain stones found inside skeletons contains fish bones and scales, and she suggested that the stones were fossilized droppings. "
"Scientists bought her specimens and drew on her observations, but they rarely named her when they published. "
"As a woman, she was banished from the Geological Society of London; she could not even attend its meetings.\n\n"
"[5] Recognition came slowly. "
"When she died in 1847, the society's president delivered a tribute to her, an unusual honor for someone who had never been allowed to join. "
"Today several of her finds stand in the Natural History Museum in London, and the labels beside them carry her name.")
mk(10, "The Fossil Hunter", 'Y', p10, [
 dict(kind='edit', sent="In the early 1800s, few people searched those cliffs as carefully, or as successfully, as Mary Anning.",
      span="carefully, or as successfully, as", ask="which choice is correctly punctuated",
      opts=["carefully or as successfully, as", "carefully, or as successfully as", "carefully; or as successfully, as"], key=NC,
      exp='"Or as successfully" interrupts the comparison "as carefully ... as Mary Anning," so it takes a comma on each side. Dropping either comma leaves the interruption half set off, and a semicolon cannot separate parts of one clause.',
      domain=CSE, sub="parenthetical commas", diff="medium"),
 dict(kind='other', prompt='The writer wants to add the following sentence to paragraph 2: "On these trips, Mary and Joseph learned to tell a valuable fossil from a worthless stone." The sentence would most logically be placed at:',
      opts=["Point [A].", "Point [B].", "Point [C].", "Point [D]."], key="Point [C].",
      exp='"These trips" must refer to outings already described, and the sentence before Point [C] says the father took his children along when he collected fossils on the beach. At Points [A] and [B] no trips have been mentioned, and at Point [D] the nearest sentence describes the father\'s death and the family\'s debts, not trips.',
      domain=PoW, sub="sentence placement", diff="easy"),
 dict(kind='edit', sent="When he died in 1810, he left the family in debt, and fossil hunting became one of the ways the Anning's paid their bills.",
      span="the Anning's paid", ask="which choice makes the sentence most grammatically acceptable",
      opts=["the Annings paid", "the Annings' paid", "the Anning paid"], key="the Annings paid",
      exp='The family members are the subject of "paid," so the name takes a plain plural with no apostrophe: "the Annings." "Anning\'s" and "Annings\'" are possessives with nothing possessed, and "the Anning" is singular.',
      domain=CSE, sub="plural vs possessive", diff="medium"),
 dict(kind='edit', sent="Over the following months, Mary, then about twelve, uncovered the rest of the skeleton; a creature with a long snout and paddle-like limbs that scientists later named Ichthyosaurus, or \"fish lizard.\"",
      span="skeleton; a creature", ask="which choice is correctly punctuated",
      opts=["skeleton: a creature", "skeleton. A creature", "skeleton a creature"], key="skeleton: a creature",
      exp='What follows describes the skeleton, and it is a noun phrase, not a clause, so a colon after the complete clause introduces it. A semicolon or a period would leave "a creature with a long snout ..." standing as a fragment, and with no punctuation the description runs into "skeleton."',
      domain=CSE, sub="colon", diff="medium"),
 dict(kind='edit', sent="The find was so unusual as a leading French anatomist at first suspected it was a fake.",
      span="so unusual as", ask="which choice makes the sentence most grammatically acceptable",
      opts=["so unusual that", "so unusual than", "so unusual which"], key="so unusual that",
      exp='"So" followed by an adjective introduces a result with "that": the find was so unusual that an expert suspected a fake. "So ... as," "so ... than," and "so ... which" are not standard ways to complete the construction.',
      domain=CSE, sub="idiom (so ... that)", diff="medium"),
 dict(kind='edit', sent="Anning also noticed that certain stones found inside skeletons contains fish bones and scales, and she suggested that the stones were fossilized droppings.",
      span="contains", ask="which choice makes the sentence most grammatically acceptable",
      opts=["contained", "has contained", "containing"], key="contained",
      exp='The subject of the clause is "stones," which is plural, and the paragraph narrates past events, so the verb is "contained." "Contains" and "has contained" are singular, and "containing" leaves the clause with no verb.',
      domain=CSE, sub="subject-verb agreement", diff="medium"),
 dict(kind='edit', sent="As a woman, she was banished from the Geological Society of London; she could not even attend its meetings.",
      span="banished", ask="which choice is most precise in context",
      opts=["barred", "evicted", "exiled"], key="barred",
      exp='Anning was never a member; she was kept out from the start. "Barred" says exactly that. "Banished," "evicted," and "exiled" each mean being forced out of a place one already belonged to.',
      domain=KoL, sub="word choice", diff="medium"),
 dict(kind='edit', sent="Scientists bought her specimens and drew on her observations, but they rarely named her when they published.",
      span="observations, but they", ask="which choice is correctly punctuated",
      opts=["observations but, they", "observations; but, they", "observations, but, they"], key=NC,
      exp='Two independent clauses are joined by "but," and the comma belongs before the conjunction: "observations, but they." Each other choice puts a comma after "but," separating the conjunction from its clause.',
      domain=CSE, sub="comma with conjunction", diff="easy"),
 dict(kind='other', prompt='The writer is considering adding the following sentence after the second sentence of paragraph 5: "For many years, museum labels had credited her fossils to the collectors who bought them." Should the writer make this addition?',
      opts=["Yes, because it supports the claim that recognition came slowly and sets up the final sentence.",
            "Yes, because it explains why Anning was not allowed to join the Geological Society of London.",
            "No, because it contradicts the paragraph's report that the society's president delivered a tribute to her.",
            "No, because paragraph 4 has already said that scientists sold her fossils to museums."],
      key="Yes, because it supports the claim that recognition came slowly and sets up the final sentence.",
      exp='"Recognition came slowly" is supported by a detail about who used to get the credit, and the essay\'s final clause, "the labels beside them carry her name," gains its force from that contrast. The sentence says nothing about the society\'s rules, it does not deny the tribute, and paragraph 4 says scientists bought her fossils, not that they sold them.',
      domain=PoW, sub="add sentence", diff="medium"),
 dict(kind='other', prompt="This question asks about the essay as a whole. Suppose the writer's primary purpose had been to show how a person without formal standing contributed to a science. Would this essay accomplish that purpose?",
      opts=["Yes, because it pairs Anning's discoveries with her exclusion from the Geological Society.",
            "Yes, because it explains how the cliffs at Lyme Regis came to hold fossils from 200 million years ago.",
            "No, because it focuses on the debts that Anning's family faced after her father's death.",
            "No, because it reports that a leading anatomist believed one of her finds was a fake."],
      key="Yes, because it pairs Anning's discoveries with her exclusion from the Geological Society.",
      exp='The essay describes the ichthyosaur, the plesiosaur, and Anning\'s idea about fossil droppings, and it stresses that she could not join or even attend the society. The cliffs\' geology and the family\'s debts are background, and the anatomist\'s doubt is presented as a sign of how unusual her find was, not as proof that it was false.',
      domain=PoW, sub="essay purpose", diff="medium"),
])
