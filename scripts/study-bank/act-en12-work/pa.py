from common import *

# ---------------- P1  history of science / the Wardian case (X 5/3/2) ----------------
p1 = ("[1] In 1829 a London doctor named Nathaniel Ward buried the chrysalis of a moth in damp soil at the bottom of a glass jar, and sealed the lid. "
"He wanted to watch the adult insect emerge. "
"The moth did hatch, but by then Ward had noticed something more interesting: a small fern and a few blades of grass had sprouted from the soil.\n\n"
"[2] Ward had tried for years to grow ferns in his garden, and every attempt had failed. "
"The air in his part of London was thick with coal smoke, which choked delicate plants. "
"Inside the jar, however, the fern thrived. "
"Water evaporated from the soil, condensed on the glass, and trickles back down, so the plant never needed watering. "
"The seal also kept the smoke out. "
"Ward left the jar on a windowsill for nearly four years without opening it, and the fern stayed green the entire time.\n\n"
"[3] [A] Ward soon had a carpenter build larger versions: wooden boxes with glass walls and tight lids. "
"[B] He then wondered whether the cases could protect plants on long sea voyages. "
"[C] In 1833 he packed two cases with ferns and grasses and shipped them to Sydney, where nearly every plant arrived alive after months on deck. "
"[D] The return trip went just as well.\n\n"
"[4] The invention reshaped the plant trade. "
"Before Wards' cases, nurseries that ordered plants from abroad had expected to lose nearly all of them; afterward, most survived. "
"Around 1850 the botanist Robert Fortune used the cases to carry thousands of tea plants from China to India, there they became the start of a vast tea industry. "
"Rubber and banana plants later traveled the same way.\n\n"
"[5] At home, the cases had a gentler effect. "
"Victorian families set glass cases of ferns in their parlors, and a craze of collecting ferns swept the country. "
"Ward himself kept a case on his desk for the rest of his life.")
mk(1, "The Fern in the Jar", 'X', p1, [
 dict(kind='edit', sent="In 1829 a London doctor named Nathaniel Ward buried the chrysalis of a moth in damp soil at the bottom of a glass jar, and sealed the lid.",
      span="jar, and sealed", ask="which choice is correctly punctuated",
      opts=["jar and sealed", "jar; and sealed", "jar, and, sealed"], key="jar and sealed",
      exp='"Buried" and "sealed" share one subject, Ward, so "and sealed the lid" is the second half of a compound predicate, not a new clause. No comma separates the two verbs. A semicolon would need a full clause after it, and commas around "and" set off nothing.',
      domain=CSE, sub="compound predicate comma", diff="medium"),
 dict(kind='edit', sent="Ward had tried for years to grow ferns in his garden, and every attempt had failed.",
      span="garden, and every", ask="which choice is correctly punctuated",
      opts=["garden, every", "garden and, every", "garden every"], key=NC,
      exp='Two independent clauses ("Ward had tried..." and "every attempt had failed") are joined by a comma and the conjunction "and," which is correct. A comma alone makes a comma splice, no punctuation at all fuses the clauses, and a comma after "and" puts the pause on the wrong side of the conjunction.',
      domain=CSE, sub="comma before coordinating conjunction", diff="easy"),
 dict(kind='edit', sent="Inside the jar, however, the fern thrived.",
      span="however,", ask="which choice provides the most logical transition",
      opts=["therefore,", "for example,", "in addition,"], key=NC,
      exp='The preceding sentences say Ward\'s garden ferns always died in the smoky London air; this sentence says the fern in the jar thrived. "However" marks that contrast. "Therefore" would make the smoke the cause of the thriving, "for example" would make the jar an instance of the failures, and "in addition" would add a similar point.',
      domain=PoW, sub="transition", diff="easy"),
 dict(kind='edit', sent="Water evaporated from the soil, condensed on the glass, and trickles back down, so the plant never needed watering.",
      span="trickles", ask="which choice makes the sentence most grammatically acceptable",
      opts=["trickled", "trickle", "has trickled"], key="trickled",
      exp='The three verbs share the subject "water" and describe a past sequence: "evaporated," "condensed," and "trickled." The present "trickles" and the present perfect "has trickled" break the past-tense series, and the plural "trickle" does not agree with "water" and also leaves the past tense.',
      domain=CSE, sub="verb tense (parallel series)", diff="easy"),
 dict(kind='other', prompt='The writer wants to add the following sentence to paragraph 3: "The cases were then refilled with Australian ferns for the voyage home." The sentence would most logically be placed at:',
      opts=["Point [A].", "Point [B].", "Point [C].", "Point [D]."], key="Point [D].",
      exp='The cases can be refilled only after they have reached Sydney, and the new sentence sets up "The return trip went just as well." Point [D] is the only place that follows the arrival in Sydney and precedes the return trip. At each earlier point the cases have not yet been built, filled, or shipped.',
      domain=PoW, sub="sentence placement", diff="medium"),
 dict(kind='edit', sent="The invention reshaped the plant trade.",
      span="reshaped", ask="which choice best fits the context of the paragraph",
      opts=["slowed", "complicated", "regulated"], key=NC,
      exp='The rest of paragraph 4 describes a large change: nurseries that once expected to lose nearly every plant now saw most survive, and whole crops such as tea were moved to new continents. "Reshaped" names that change. Nothing in the paragraph suggests the trade slowed, grew more complicated, or came under rules.',
      domain=KoL, sub="word choice in context", diff="medium"),
 dict(kind='edit', sent="Before Wards' cases, nurseries that ordered plants from abroad had expected to lose nearly all of them; afterward, most survived.",
      span="Wards'", ask="which choice is correctly punctuated",
      opts=["Ward's", "Wards", "Wards's"], key="Ward's",
      exp='The cases belong to one man, Ward, so the singular possessive is "Ward\'s." "Wards\'" is the plural possessive of a name that is not plural, "Wards" has no apostrophe at all, and "Wards\'s" adds an "s" that the name does not have.',
      domain=CSE, sub="possessive", diff="easy"),
 dict(kind='edit', sent="Around 1850 the botanist Robert Fortune used the cases to carry thousands of tea plants from China to India, there they became the start of a vast tea industry.",
      span="India, there they", ask="which choice makes the sentence most grammatically acceptable",
      opts=["India, where they", "India where, they", "India; where they"], key="India, where they",
      exp='"There they became the start of a vast tea industry" is an independent clause, so joining it to the first clause with a comma alone is a comma splice. "Where" turns it into a relative clause describing India, which a comma can attach. A semicolon cannot introduce a dependent "where" clause, and the comma after "where" splits the clause from its own subject.',
      domain=CSE, sub="comma splice", diff="medium"),
 dict(kind='edit', sent="Victorian families set glass cases of ferns in their parlors, and a craze of collecting ferns swept the country.",
      span="craze of", ask="which choice is most idiomatic in context",
      opts=["craze for", "craze in", "craze toward"], key="craze for",
      exp='Standard English speaks of a "craze for" something, as of an appetite or enthusiasm for it. "Craze of," "craze in," and "craze toward" are not the idiomatic pairings.',
      domain=KoL, sub="idiom", diff="medium"),
 dict(kind='other', prompt='The writer wants to add a sentence after the last sentence of paragraph 5 ("Ward himself kept a case on his desk for the rest of his life."). Which choice most effectively concludes the essay?',
      must=["Ward himself kept a case on his desk for the rest of his life."],
      opts=["Like the jar on his windowsill, it kept its ferns green without a drop of added water.",
            "In it lay the moth's chrysalis, which had never hatched.",
            "It held a single tea plant, the only one of Fortune's thousands to survive the voyage to India.",
            "Unlike the jar on his windowsill, its lid had to be lifted every morning to let the coal smoke out."],
      key="Like the jar on his windowsill, it kept its ferns green without a drop of added water.",
      exp='Paragraph 2 says the sealed jar recycled its own water and kept the smoke out, so a case that kept ferns green without added water closes the essay on its opening discovery. Paragraph 1 says the moth did hatch; paragraph 4 says most shipped plants survived and Fortune\'s tea plants started an industry; and paragraph 2 says the seal kept the smoke out, so there was none to let out.',
      domain=PoW, sub="conclusion", diff="medium"),
])

# ---------------- P2  natural science / slime mold networks (Y 6/3/1) ----------------
p2 = ("[1] Physarum polycephalum has no brain, no nerves, and no eyes. "
"It is a slime mold, a single enormous cell that creeps across the forest floor as a bright yellow film, feeding on bacteria and fungal spores. "
"Yet in the past few decades this organism has solved problems that would challenge a team of engineers.\n\n"
"[2] In 2000 the Japanese researcher Toshiyuki Nakagaki placed pieces of a slime mold throughout a small plastic maze. "
"The pieces merged into a single cell who filled every corridor. "
"He then set an oat flake, one of the mold's favorite foods at the entrance and another at the exit. "
"Within hours, for example, the mold had withdrawn from the dead ends, leaving one thick tube along the shortest route between the two flakes.\n\n"
"[3] Ten years later, Nakagaki and his colleague Atsushi Tero tried something more ambitious. "
"On a wet dish shaped like the region around Tokyo, they placed oat flakes in positions, matching thirty-six cities and towns. "
"The mold started at the spot representing Tokyo itself. "
"Because it avoids bright light, the researchers lit the areas that stood for mountains and lakes, which kept the mold off ground where rail lines would be hard to build. "
"After about a day the mold had linked every flake with a web of tubes. "
"When the team compared that web with the real rail network around Tokyo, they found the two remarkably alike in their efficiency and in how well they would survive a broken link.\n\n"
"[4] The mold's method is simple. "
"It begins by spreading in all directions. "
"Tubes that carry a strong flow of nutrients between food sources thickens; tubes that carry little thin out and eventually vanish. "
"No part of the cell plans the network, it emerges from countless local adjustments.\n\n"
"[5] Engineers have taken note. "
"Researchers have since written computer programs that copy the mold's rules, and they hope such programs could help design road systems, power grids, and communication networks that keep working when one connection fails.")
mk(2, "The Mold That Drew a Railway", 'Y', p2, [
 dict(kind='edit', sent="Physarum polycephalum has no brain, no nerves, and no eyes.",
      span="no brain, no nerves, and no eyes", ask="which choice is correctly punctuated",
      opts=["no brain no nerves, and no eyes", "no brain, no nerves and, no eyes", "no brain, no nerves, and, no eyes"], key=NC,
      exp='Three items in a series are separated by commas, with the last comma before "and." Dropping the first comma runs two items together, and a comma after "and" separates the conjunction from the item it introduces.',
      domain=CSE, sub="series commas", diff="easy"),
 dict(kind='edit', sent="Yet in the past few decades this organism has solved problems that would challenge a team of engineers.",
      span="challenge", ask="which choice best fits the context of the paragraph",
      opts=["bore", "employ", "amuse"], key=NC,
      exp='Paragraph 1 stresses that the mold has no brain, nerves, or eyes, and "Yet" introduces a surprising achievement: problems hard enough to test trained engineers. "Challenge" says that. Problems that would bore, employ, or amuse engineers are not presented as difficult, so the surprise the paragraph builds toward disappears.',
      domain=KoL, sub="word choice in context", diff="medium"),
 dict(kind='edit', sent="The pieces merged into a single cell who filled every corridor.",
      span="who filled", ask="which choice makes the sentence most grammatically acceptable",
      opts=["that filled", "whom filled", "it filled"], key="that filled",
      exp='The relative pronoun refers to "a single cell," which is not a person, so "who" and "whom" are wrong; "whom" is also an object form used here as a subject. "It filled" adds a second independent clause with no conjunction. "That filled" is the restrictive relative clause.',
      domain=CSE, sub="relative pronoun", diff="easy"),
 dict(kind='edit', sent="He then set an oat flake, one of the mold's favorite foods at the entrance and another at the exit.",
      span="foods at", ask="which choice is correctly punctuated",
      opts=["foods, at", "foods; at", "foods—at"], key="foods, at",
      exp='"One of the mold\'s favorite foods" is an appositive renaming the oat flake, opened with a comma, so it must close with a comma. A semicolon would need a full clause on each side, and a dash cannot close an appositive that a comma opened.',
      domain=CSE, sub="appositive commas", diff="medium"),
 dict(kind='edit', sent="Within hours, for example, the mold had withdrawn from the dead ends, leaving one thick tube along the shortest route between the two flakes.",
      span="for example,", ask="which choice provides the most logical transition",
      opts=["however,", "in other words,", "too,"], key="however,",
      exp='Earlier in the paragraph the mold fills every corridor of the maze; here it pulls back to a single tube. "However" marks that reversal. The withdrawal is not an example of filling the corridors, does not restate it, and is not a further instance of it, as "too" would claim.',
      domain=PoW, sub="transition", diff="medium"),
 dict(kind='edit', sent="On a wet dish shaped like the region around Tokyo, they placed oat flakes in positions, matching thirty-six cities and towns.",
      span="positions, matching", ask="which choice is correctly punctuated",
      opts=["positions matching", "positions; matching", "positions: matching"], key="positions matching",
      exp='"Matching thirty-six cities and towns" tells which positions are meant, so it is essential and takes no comma. A semicolon would need an independent clause after it, and a colon would present the phrase as a list or explanation that the sentence does not set up.',
      domain=CSE, sub="unnecessary comma (restrictive phrase)", diff="medium"),
 dict(kind='other', prompt='The writer is considering deleting the following sentence from paragraph 3: "Because it avoids bright light, the researchers lit the areas that stood for mountains and lakes, which kept the mold off ground where rail lines would be hard to build." Should the sentence be kept or deleted?',
      must=["Because it avoids bright light, the researchers lit the areas that stood for mountains and lakes, which kept the mold off ground where rail lines would be hard to build."],
      opts=["Kept, because it shows how the researchers kept the mold where rail lines could actually be built, which matters for the comparison at the end of the paragraph.",
            "Kept, because it shows how the researchers kept the mold where rail lines could actually be built, which matters for paragraph 5's claim that engineers copied the mold's routes onto real maps.",
            "Deleted, because the light it describes is the same signal that paragraph 2 says guided the mold through the maze.",
            "Deleted, because paragraph 4 says that the mold spreads in all directions whatever the light."],
      key="Kept, because it shows how the researchers kept the mold where rail lines could actually be built, which matters for the comparison at the end of the paragraph.",
      exp='Paragraph 3 ends by comparing the mold\'s web with the real rail network, which was built around mountains and lakes; the lit areas made that comparison fair. Paragraph 5 says programs copy the mold\'s rules, not its routes; paragraph 2 says oat flakes, not light, guided the mold through the maze; and paragraph 4 says nothing about light.',
      domain=PoW, sub="delete sentence", diff="hard"),
 dict(kind='edit', sent="Tubes that carry a strong flow of nutrients between food sources thickens; tubes that carry little thin out and eventually vanish.",
      span="thickens", ask="which choice makes the sentence most grammatically acceptable",
      opts=["thicken", "has thickened", "is thickening"], key="thicken",
      exp='The subject is "tubes," which is plural; "food sources" belongs to the clause that describes them. The verb must be plural and in the present tense, matching "thin out" in the second clause: "thicken." "Thickens," "has thickened," and "is thickening" are all singular.',
      domain=CSE, sub="subject-verb agreement", diff="medium"),
 dict(kind='edit', sent="No part of the cell plans the network, it emerges from countless local adjustments.",
      span="network, it emerges", ask="which choice makes the sentence most grammatically acceptable",
      opts=["network; instead, it emerges", "network, instead it emerges", "network instead, it emerges"], key="network; instead, it emerges",
      exp='Two independent clauses are joined by a comma alone. A semicolon separates them correctly, and "instead" marks that the network arises in place of being planned. Putting "instead" after the comma leaves the splice in place, and moving it before the comma attaches it to the first clause and still leaves the splice.',
      domain=CSE, sub="comma splice", diff="medium"),
 dict(kind='other', prompt="This question asks about the essay as a whole. Suppose the writer's primary purpose had been to explain how a living thing with no brain can find efficient routes. Would this essay accomplish that purpose?",
      opts=["Yes, because it explains that the mold spreads everywhere and then keeps only the tubes carrying the most food.",
            "Yes, because it explains that the mold senses where all the food lies and grows straight toward the nearest flake.",
            "No, because it explains the mold's method only for the maze, not for the larger network around Tokyo.",
            "No, because it is mainly concerned with how the researchers lit the dish rather than with how the mold itself chooses routes."],
      key="Yes, because it explains that the mold spreads everywhere and then keeps only the tubes carrying the most food.",
      exp='Paragraph 4 gives the method in general terms: the mold spreads in all directions, busy tubes thicken, and idle ones vanish, and paragraphs 2 and 3 show that method finding efficient routes. The essay never says the mold grows straight toward the nearest food; paragraph 4 applies to both experiments; and the lighting takes up one sentence.',
      domain=PoW, sub="essay purpose", diff="medium"),
])
