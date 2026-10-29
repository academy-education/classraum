import json, sys
out = []
NC = "No Change"
def para_of(passage, sent):
    import re
    for m in re.finditer(r'\[(\d+)\] ([^\[]*)', passage):
        if sent in m.group(2): return int(m.group(1))
    raise SystemExit(f"sentence not found: {sent!r}")

def mk(P, title, passage, items):
    for n, it in enumerate(items, 1):
        kind = it['kind']
        if kind == 'edit':
            sent, span = it['sent'], it['span']
            assert sent in passage, sent
            assert span in sent, (span, sent)
            pn = para_of(passage, sent)
            prompt = f'In paragraph {pn}, in the sentence "{sent}" {it["ask"]} in place of "{span}"?'
            if it.get('nc', True): choices = [NC] + it['opts']
            else: choices = it['opts']
        else:
            prompt = it['prompt']; choices = it['opts']
            for q in it.get('must', []): assert q in passage, q
        key = it['key']
        assert key in choices, (key, choices)
        assert len(set(choices)) == 4, choices
        out.append(dict(id=f"ACT-EN10-P{P}-Q{n:02d}", passage_id=f"P{P}", passage_title=title, passage=passage,
                        prompt=prompt, choices=choices, correct_answer=key, explanation=it['exp'],
                        domain=it['domain'], subskill=it['sub'], difficulty=it['diff']))

CSE, PoW, KoL = "Conventions of Standard English", "Production of Writing", "Knowledge of Language"

# ---------------- P1  editorial "we"  (X 5/3/2) ----------------
p1 = ("[1] Walk the length of Main Street on a Saturday afternoon and count the places where a person can sit down without buying something. "
"We counted two: the steps of the post office and the low wall around the war memorial. "
"Ten years ago there were fourteen benches on the same stretch, the city removed them one by one, mostly after complaints that people lingered on them too long.\n\n"
"[2] We think that lingering is exactly the point. A bench gives an older resident a place to rest halfway to the pharmacy. "
"It gives a parent somewhere to retie a child's shoe and a teenager somewhere to wait for a ride. "
"Shop owners on Main Street told us, almost without exception, that customers who have room to rest stays longer and spends more.\n\n"
"[3] The objections deserve a fair hearing. Some merchants worry that benches will summon groups who block the sidewalk. "
"Others point to the cost, a well-made bench with a back and armrests costs roughly what the city spends to repave a single parking space. "
"For instance, neither concern outweighs the benefit, and both can be met. "
"Benches can be set against building walls, where they leave the walkway clear, and a local foundation has offered to pay for the first ten.\n\n"
"[4] Benches also do something harder to measure. A person sitting on Main Street is a person watching Main Street, and a street with watchers tends to feel safer to everyone walking along it. "
"The city's own planning office made this argument in a 2019 report on downtown safety, yet the benches never came back.\n\n"
"[5] We are not asking for a fountain or some ridiculously expensive plaza thing. "
"We are asking the council to return a few places to sit, so that Main Street can again be a place to stay and not only a place to pass through.")
mk(1, "Room to Sit", p1, [
 dict(kind='edit', sent="Ten years ago there were fourteen benches on the same stretch, the city removed them one by one, mostly after complaints that people lingered on them too long.",
      span="stretch, the city", ask="which choice makes the sentence most grammatically acceptable",
      opts=["stretch; the city", "stretch the city", "stretch, because the city"], key="stretch; the city",
      exp='The original joins two independent clauses with only a comma (a comma splice). "stretch; the city" correctly joins them with a semicolon. "stretch the city" fuses the clauses with no punctuation, and "stretch, because the city" fixes the grammar but states a false cause: the benches did not exist because the city removed them.',
      domain=CSE, sub="comma splice", diff="medium"),
 dict(kind='edit', sent="A bench gives an older resident a place to rest halfway to the pharmacy.",
      span="resident a place", ask="which choice is correctly punctuated",
      opts=["resident, a place", "resident; a place", "resident: a place"], key=NC,
      exp='"An older resident" is the indirect object and "a place to rest" is the direct object of "gives"; no punctuation belongs between them. A comma, a semicolon, or a colon would each separate a verb from one of its own objects.',
      domain=CSE, sub="unnecessary comma", diff="easy"),
 dict(kind='edit', sent="Shop owners on Main Street told us, almost without exception, that customers who have room to rest stays longer and spends more.",
      span="stays longer and spends more", ask="which choice makes the sentence most grammatically acceptable",
      opts=["stay longer and spend more", "stays longer and spend more", "staying longer and spending more"], key="stay longer and spend more",
      exp='The subject of the clause is the plural "customers," so both verbs must be plural: "stay longer and spend more." The original uses singular verbs; "stays ... spend" mixes the two numbers; and "staying ... spending" leaves the clause with no main verb.',
      domain=CSE, sub="subject-verb agreement", diff="medium"),
 dict(kind='edit', sent="Some merchants worry that benches will summon groups who block the sidewalk.",
      span="summon", ask="which choice is most precise in context",
      opts=["attract", "convene", "enlist"], key="attract",
      exp='The merchants fear that benches will draw people to them; "attract" says exactly that. "Summon" and "enlist" suggest that the benches deliberately call or recruit people, and "convene" means to formally call a meeting together; none fits an object that simply draws people in.',
      domain=KoL, sub="word choice", diff="medium"),
 dict(kind='edit', sent="Others point to the cost, a well-made bench with a back and armrests costs roughly what the city spends to repave a single parking space.",
      span="cost, a well-made", ask="which choice makes the sentence most grammatically acceptable",
      opts=["cost: a well-made", "cost, which a well-made", "cost and a well-made"], key="cost: a well-made",
      exp='The second clause explains what the "cost" objection amounts to, and it is an independent clause, so a colon is the right link: "cost: a well-made bench ... costs." The original is a comma splice; "cost, which a well-made bench ... costs" garbles the clause; and "cost and a well-made" runs the clauses together without a comma before the conjunction and loses the explanatory relation.',
      domain=CSE, sub="colon before explanation", diff="hard"),
 dict(kind='edit', sent="For instance, neither concern outweighs the benefit, and both can be met.",
      span="For instance,", ask="which choice provides the most logical transition",
      opts=["Still,", "Next,", "As a result,"], key="Still,",
      exp='The paragraph has just granted that the objections deserve a hearing and laid out two of them; this sentence turns against them. "Still," marks that concession-then-reply. "For instance" would make the sentence an example of the cost objection, "Next" would add one more item to the list of objections, and "As a result" would claim that the objections cause the writers to dismiss them.',
      domain=PoW, sub="transition", diff="medium"),
 dict(kind='other', prompt='The writer is considering deleting the sentence "Benches can be set against building walls, where they leave the walkway clear, and a local foundation has offered to pay for the first ten" from paragraph 3. Should the sentence be kept or deleted?',
      must=["Benches can be set against building walls, where they leave the walkway clear, and a local foundation has offered to pay for the first ten."],
      opts=["Kept, because it gives the specific ways the sidewalk and cost concerns would be handled.",
            "Kept, because it explains why the merchants on Main Street first asked the city to take the benches away.",
            "Deleted, because the sentence before it already states that both concerns can be met.",
            "Deleted, because it introduces a new objection that the editorial never answers."],
      key="Kept, because it gives the specific ways the sidewalk and cost concerns would be handled.",
      exp='The preceding sentence only claims that both concerns "can be met"; this sentence shows how: wall placement answers the worry about blocked sidewalks, and the foundation\'s offer answers the cost. Without it the claim is unsupported. The sentence says nothing about why benches were removed and raises no new objection.',
      domain=PoW, sub="delete sentence", diff="medium"),
 dict(kind='edit', sent="A person sitting on Main Street is a person watching Main Street, and a street with watchers tends to feel safer to everyone walking along it.",
      span="along it", ask="which choice makes the sentence most grammatically acceptable",
      opts=["along them", "along those", "along their"], key=NC,
      exp='The pronoun refers to "a street," which is singular, so "it" is correct. "Them" and "those" are plural, and "their" is a possessive that leaves the preposition without an object.',
      domain=CSE, sub="pronoun agreement", diff="easy"),
 dict(kind='edit', sent="We are not asking for a fountain or some ridiculously expensive plaza thing.",
      span="some ridiculously expensive plaza thing", ask="which choice best maintains the tone of the essay",
      opts=["an elaborate, expensive new plaza", "a super fancy plaza or whatever", "a plaza so lavish it would make a king blush"], key="an elaborate, expensive new plaza",
      exp='The editorial is direct but measured throughout. "An elaborate, expensive new plaza" keeps that register. The original and "a super fancy plaza or whatever" are slangy, and "so lavish it would make a king blush" is an exaggeration out of keeping with the writers\' practical argument.',
      domain=KoL, sub="tone", diff="easy"),
 dict(kind='other', prompt="This question asks about the essay as a whole. The writer wants to conclude the essay with a sentence that returns to the specific situation described in paragraph 1. Which choice best accomplishes this goal?",
      opts=["On some Saturday afternoon next year, we hope to count far more than two places to sit.",
            "Ten benches paid for by the foundation would be a fine place for the city to begin.",
            "Merchants who once complained about benches may find that their customers linger longer and spend more.",
            "Even the planning office has agreed that people watching a street help make it safer."],
      key="On some Saturday afternoon next year, we hope to count far more than two places to sit.",
      exp='Paragraph 1 describes walking Main Street on a Saturday afternoon and counting only two places to sit; this choice returns to that count. The other choices recall details from paragraphs 3, 2, and 4 respectively, not the opening.',
      domain=PoW, sub="conclusion", diff="medium"),
])

# ---------------- P2  impersonal science explainer (Y 6/3/1) ----------------
p2 = ("[1] Pour hot coffee into an ordinary mug and it will be lukewarm within half an hour. "
"Pour the same coffee into a vacuum flask and it can still be hot enough to steam the next morning. "
"The flask adds no heat of its own. It simply slows the three ways heat escapes, conduction, convection, and radiation.\n\n"
"[2] A flask is really two bottles, one inside the other, joined only at the neck. Most of the air between the two walls have been pumped out. "
"Conduction needs matter to carry heat from one molecule to the next, so the near-vacuum leaves the heat almost nothing to travel through. "
"Convection, the movement of warm air or liquid, is blocked for the same reason, there is too little air in the gap to circulate.\n\n"
"[3] [A] Radiation is different. [B] Every warm object gives off infrared light, and infrared can cross a vacuum as easily as sunlight crosses space. "
"[C] To slow this last escape route, the walls facing the gap are coated with a thin, mirrorlike layer of metal that reflects most of the infrared back toward the coffee. "
"[D] With all three routes narrowed, the coffee can lose its heat only very slowly.\n\n"
"[4] No flask is perfect. Some heat still leaks through the neck, where the inner and outer bottles meet, and through the stopper which must be made of a material that conducts heat poorly and does not pass it along well, such as cork or plastic foam. "
"In contrast, a flask filled only halfway cools faster then a full one: the same heat leaks out through the neck and stopper, but there is less coffee to lose it from.\n\n"
"[5] The same design works in reverse. Fill the flask with ice water, and the vacuum, together with the mirrored walls, keeps the warmth of the surrounding air from getting in. "
"The flask, in other words, does not know hot from cold; it only slows the traffic between inside and out.")
mk(2, "Slowing the Escape", p2, [
 dict(kind='edit', sent="It simply slows the three ways heat escapes, conduction, convection, and radiation.",
      span="escapes, conduction", ask="which choice is correctly punctuated",
      opts=["escapes: conduction", "escapes; conduction", "escapes conduction"], key="escapes: conduction",
      exp='The list names the "three ways" just announced, and a colon introduces a list after a complete clause: "escapes: conduction, convection, and radiation." The comma makes "conduction" look like another item in a series; a semicolon must join two independent clauses, and the list is not one; with no punctuation, "heat escapes conduction" reads as if heat escapes from conduction.',
      domain=CSE, sub="colon before list", diff="medium"),
 dict(kind='edit', sent="Most of the air between the two walls have been pumped out.",
      span="have been", ask="which choice makes the sentence most grammatically acceptable",
      opts=["has been", "were", "are being"], key="has been",
      exp='"Most of" takes its number from the noun that follows; "air" is a mass noun, so the verb is singular: "has been pumped out." "Have been," "were," and "are being" are all plural.',
      domain=CSE, sub="subject-verb agreement", diff="hard"),
 dict(kind='other', prompt='The writer is considering adding the following sentence after the second sentence of paragraph 2: "Glass flasks were common for decades before steel versions became popular." Should the writer make this addition?',
      opts=["Yes, because it tells the reader what the two bottles described in the paragraph are made of.",
            "Yes, because it helps the reader picture a flask before the paragraph explains how one works.",
            "No, because it interrupts the paragraph's explanation of how removing the air slows conduction and convection.",
            "No, because paragraph 4 has already named the materials, cork and plastic foam, that the parts of a flask are made of."],
      key="No, because it interrupts the paragraph's explanation of how removing the air slows conduction and convection.",
      exp='Paragraph 2 moves from the empty gap between the walls straight into why that gap blocks conduction and convection; a remark on the history of flask materials breaks that chain. The sentence does not say what these particular bottles are made of, and paragraph 4 names cork and foam only for the stopper, not for the flask.',
      domain=PoW, sub="add sentence", diff="medium"),
 dict(kind='edit', sent="Convection, the movement of warm air or liquid, is blocked for the same reason, there is too little air in the gap to circulate.",
      span="reason, there", ask="which choice makes the sentence most grammatically acceptable",
      opts=["reason. There", "reason there", "reason, and, there"], key="reason. There",
      exp='Two independent clauses are joined only by a comma, a comma splice. A period separates them correctly. "Reason there" fuses the clauses, and "reason, and, there" puts a stray comma after the conjunction.',
      domain=CSE, sub="comma splice", diff="easy"),
 dict(kind='other', prompt='The writer wants to add the following sentence to paragraph 3: "This coating is the silvery shine visible inside a broken flask." The sentence would most logically be placed at:',
      opts=["Point [A].", "Point [B].", "Point [C].", "Point [D]."], key="Point [D].",
      exp='"This coating" must follow the sentence that introduces the mirrorlike metal layer, which comes just before Point [D], and it should come before the summary sentence that begins at Point [D]. At Points [A], [B], or [C], "this coating" would refer to a coating that has not yet been mentioned.',
      domain=PoW, sub="sentence placement", diff="medium"),
 dict(kind='edit', sent="Some heat still leaks through the neck, where the inner and outer bottles meet, and through the stopper which must be made of a material that conducts heat poorly and does not pass it along well, such as cork or plastic foam.",
      span="stopper which", ask="which choice is correctly punctuated",
      opts=["stopper, which", "stopper; which", "stopper, that"], key="stopper, which",
      exp='The clause beginning "which must be made of" adds information about the one stopper already identified, so it is nonessential and is set off with a comma: "stopper, which." A semicolon cannot introduce a dependent clause, and "that" is not used after a comma to introduce a nonessential clause.',
      domain=CSE, sub="nonessential clause commas", diff="medium"),
 dict(kind='edit', sent="Some heat still leaks through the neck, where the inner and outer bottles meet, and through the stopper which must be made of a material that conducts heat poorly and does not pass it along well, such as cork or plastic foam.",
      span="conducts heat poorly and does not pass it along well", ask="which choice is the most concise version that keeps the meaning of the sentence",
      opts=["conducts heat poorly", "conducts", "conducts heat poorly, transferring it only badly"], key="conducts heat poorly",
      exp='"Does not pass it along well" repeats "conducts heat poorly." "Conducts heat poorly" keeps the meaning without the repetition. "Conducts" alone is shorter but reverses the point, since the stopper must resist heat, and "transferring it only badly" adds a new repetition.',
      domain=KoL, sub="concision", diff="medium"),
 dict(kind='edit', sent="In contrast, a flask filled only halfway cools faster then a full one: the same heat leaks out through the neck and stopper, but there is less coffee to lose it from.",
      span="In contrast,", ask="which choice provides the most logical transition",
      opts=["For this reason,", "Even so,", "At the same time,"], key="For this reason,",
      exp='The sentence draws a consequence from the leaks just described: because heat escapes through the neck and stopper at the same rate, a half-full flask cools faster. "For this reason," marks that cause and result. "In contrast" and "Even so" signal opposition the sentence does not contain, and "At the same time" pairs it with a separate, simultaneous point that is not there.',
      domain=PoW, sub="transition", diff="hard"),
 dict(kind='edit', sent="In contrast, a flask filled only halfway cools faster then a full one: the same heat leaks out through the neck and stopper, but there is less coffee to lose it from.",
      span="then", ask="which choice makes the sentence most grammatically acceptable",
      opts=["than", "then does", "as"], key="than",
      exp='A comparison with "faster" requires "than." "Then" refers to time, "then does" keeps the error, and "faster as" is not idiomatic.',
      domain=CSE, sub="than/then usage", diff="easy"),
 dict(kind='edit', sent="The flask, in other words, does not know hot from cold; it only slows the traffic between inside and out.",
      span="cold; it only", ask="which choice is correctly punctuated",
      opts=["cold, it only", "cold it only", "cold: and it only"], key=NC,
      exp='The semicolon correctly joins two closely related independent clauses. "Cold, it only" is a comma splice, "cold it only" fuses the clauses, and a colon followed by "and" is not a correct way to join them.',
      domain=CSE, sub="semicolon", diff="medium"),
])

# ---------------- P3  third-person history (X 5/3/2) ----------------
p3 = ("[1] For most of history, a lighthouse was little more than a fire on a tower, and ships still ran aground within sight of shore on clear nights. "
"By the late 1700s the fires had given way to oil lamps backed by polished metal reflectors, but even the best of these sent much of their light up into the sky or down into the sea, where no sailor at sea would ever see it.\n\n"
"[2] The solution came from a French engineer named Augustin Fresnel, who had been studying how light bends as it passes through glass. "
"A single lens large enough to gather a lighthouse's beam would have been impossibly thick and heavy. "
"Fresnel saw that most of a lens's bending happens at its curved surface, the glass behind that surface mostly just adds weight. "
"He therefore proposed a lens built from rings of glass prisms, each ring angled to bend the light toward the horizon. The result was far thinner and lighter than a solid lens, yet it gathered nearly all of the lamp's light into a single beam.\n\n"
"[3] The first of these lenses was installed in 1823. It was installed at a lighthouse at the mouth of the Gironde River in France. "
"Fresnel himself was often ill and spent part of his career supervising the construction of roads. "
"Within a few decades, lighthouses from Scotland to the United States have been fitted with the new lenses. "
"They were sorted into orders by size, the largest, a first-order lens, stood taller than a grown man. Smaller orders served harbors and rivers, where a light needed to carry only a few miles.\n\n"
"[4] For example, electric lamps replaced the oil flames, and in many places the keeper's job disappeared altogether. "
"Many of the old lenses, however, is still in place, turning slowly above the water as they did two centuries ago. Visitors who climb a lighthouse today can often stand beside one and see the rings of glass that a single idea set in motion.")
mk(3, "Rings of Glass", p3, [
 dict(kind='edit', sent="By the late 1700s the fires had given way to oil lamps backed by polished metal reflectors, but even the best of these sent much of their light up into the sky or down into the sea, where no sailor at sea would ever see it.",
      span="no sailor at sea", ask="which choice is the most concise version that keeps the meaning of the sentence",
      opts=["no sailor", "no sailor out on the water at sea", "no seagoing sailor at sea"], key="no sailor",
      exp='"At sea" repeats what "sailor" and "down into the sea" already establish. "No sailor" keeps the meaning. The other two choices add further repetition.',
      domain=KoL, sub="concision", diff="easy"),
 dict(kind='edit', sent="Fresnel saw that most of a lens's bending happens at its curved surface, the glass behind that surface mostly just adds weight.",
      span="surface, the glass", ask="which choice makes the sentence most grammatically acceptable",
      opts=["surface; the glass", "surface the glass", "surface, because the glass"], key="surface; the glass",
      exp='Two independent clauses are joined by only a comma, a comma splice. A semicolon joins them correctly. "Surface the glass" fuses them; "surface, because the glass" is grammatical but reverses the logic: the bending does not happen at the surface because the glass behind it adds weight.',
      domain=CSE, sub="comma splice", diff="medium"),
 dict(kind='edit', sent="He therefore proposed a lens built from rings of glass prisms, each ring angled to bend the light toward the horizon.",
      span="prisms, each ring", ask="which choice is correctly punctuated",
      opts=["prisms; each ring", "prisms. Each ring", "prisms each ring"], key=NC,
      exp='"Each ring angled to bend the light" is a phrase modifying the prisms, not a clause; it has no main verb, so it is correctly attached with a comma. A semicolon or a period would leave it as a fragment, and with no comma the phrase runs into "prisms."',
      domain=CSE, sub="comma with modifying phrase", diff="hard"),
 dict(kind='other', prompt='In paragraph 3, which choice most effectively combines the sentences "The first of these lenses was installed in 1823. It was installed at a lighthouse at the mouth of the Gironde River in France."?',
      must=["The first of these lenses was installed in 1823. It was installed at a lighthouse at the mouth of the Gironde River in France."],
      opts=["The first of these lenses was installed in 1823 at a lighthouse at the mouth of the Gironde River in France.",
            "The first of these lenses was installed in 1823, and it was installed at a lighthouse at the mouth of the Gironde River in France.",
            "Installed in 1823, the first of these lenses, it was at a lighthouse at the mouth of the Gironde River in France.",
            "The first of these lenses having been installed in 1823 at a lighthouse at the mouth of the Gironde River in France."],
      key="The first of these lenses was installed in 1823 at a lighthouse at the mouth of the Gironde River in France.",
      exp='Placing "in 1823 at a lighthouse" in one clause joins the two facts without repeating "was installed." The version with ", and it was installed" repeats the verb, the version beginning "Installed in 1823" adds a stray "it" that leaves "the first of these lenses" with no verb, and the version with "having been installed" has no main verb at all.',
      domain=KoL, sub="sentence combining", diff="medium"),
 dict(kind='other', prompt='The writer is considering deleting the sentence "Fresnel himself was often ill and spent part of his career supervising the construction of roads" from paragraph 3. Should the sentence be kept or deleted?',
      must=["Fresnel himself was often ill and spent part of his career supervising the construction of roads."],
      opts=["Kept, because it explains why Fresnel was able to design a lens lighter than earlier ones.",
            "Kept, because it shows that Fresnel's engineering work on roads prepared him to oversee the installation of the first lens.",
            "Deleted, because it interrupts the paragraph's account of how the new lenses spread after 1823.",
            "Deleted, because paragraph 2 has already described Fresnel's work studying how light bends."],
      key="Deleted, because it interrupts the paragraph's account of how the new lenses spread after 1823.",
      exp='Paragraph 3 traces the lens from its first installation to its spread "within a few decades"; a remark about Fresnel\'s health and road work breaks that sequence. The sentence explains nothing about the lens\'s weight or its installation, and it does not repeat paragraph 2, which concerns his optics, so that is not the reason to cut it.',
      domain=PoW, sub="delete sentence", diff="medium"),
 dict(kind='edit', sent="Within a few decades, lighthouses from Scotland to the United States have been fitted with the new lenses.",
      span="have been", ask="which choice makes the sentence most grammatically acceptable",
      opts=["had been", "are being", "was"], key="had been",
      exp='The essay narrates the 1800s in the past tense, and the fitting was completed before a past point ("within a few decades" of 1823), so the past perfect "had been" is correct. "Have been" and "are being" place the action in the present, and "was" is singular, though its subject, "lighthouses," is plural.',
      domain=CSE, sub="verb tense", diff="medium"),
 dict(kind='edit', sent="They were sorted into orders by size, the largest, a first-order lens, stood taller than a grown man.",
      span="size, the largest", ask="which choice makes the sentence most grammatically acceptable",
      opts=["size. The largest", "size the largest", "size, so the largest"], key="size. The largest",
      exp='Two independent clauses are joined by a comma alone. A period separates them correctly. "Size the largest" fuses them, and "size, so the largest" is grammatical but claims that sorting by size made the largest lens tall, which is not the relation.',
      domain=CSE, sub="comma splice", diff="easy"),
 dict(kind='edit', sent="For example, electric lamps replaced the oil flames, and in many places the keeper's job disappeared altogether.",
      span="For example,", ask="which choice provides the most logical transition",
      opts=["Eventually,", "Instead,", "In other words,"], key="Eventually,",
      exp='The essay moves forward in time from the 1800s to a later change, so "Eventually," fits. Electric lamps are not an example of the lens orders just described, "Instead" would set the lamps up as an alternative to the lenses, which kept being used, and "In other words" would claim the sentence restates the one before.',
      domain=PoW, sub="transition", diff="medium"),
 dict(kind='edit', sent="Many of the old lenses, however, is still in place, turning slowly above the water as they did two centuries ago.",
      span="is", ask="which choice makes the sentence most grammatically acceptable",
      opts=["are", "were", "was"], key="are",
      exp='The subject is "many of the old lenses," which is plural, and the sentence describes the present ("still in place"), so the verb is "are." "Is" and "was" are singular, and "were" is past tense, which clashes with "still."',
      domain=CSE, sub="subject-verb agreement", diff="easy"),
 dict(kind='other', prompt="This question asks about the preceding passage as a whole. Suppose the writer's primary purpose had been to explain how a single invention changed the way lighthouses sent out their light. Would this essay accomplish that purpose?",
      opts=["Yes, because it traces the Fresnel lens from the problem it solved through its adoption by lighthouses in several countries.",
            "Yes, because it compares the oil lamps of the 1700s with the electric lamps that later replaced them.",
            "No, because it spends as much time on Fresnel's illnesses and road work as on the lens itself.",
            "No, because it describes several inventions, from metal reflectors to electric lamps, without making any one of them its focus."],
      key="Yes, because it traces the Fresnel lens from the problem it solved through its adoption by lighthouses in several countries.",
      exp='The essay is built around one invention: paragraph 1 states the wasted-light problem, paragraph 2 the lens design, paragraph 3 its installation and spread, and paragraph 4 its survival. It does not compare oil and electric lamps at any length, it mentions Fresnel\'s illness in a single sentence, and reflectors and electric lamps appear only as the before and after of the lens.',
      domain=PoW, sub="essay purpose", diff="medium"),
])

# ---------------- P4  present-tense profile (X 5/3/2) ----------------
p4 = ("[1] At nine o'clock each weekday morning, Delphine Sato sits down at a small machine in front of the judge's bench and does not stop typing until the court breaks for lunch. "
"She is a court reporter, and her job is to produce a word-for-word record of everything said in the room, every question, every answer, and every objection.\n\n"
"[2] Her machine looks nothing like a typewriter. It has only twenty-two keys, and Sato presses several of them at once, the way a pianist plays a chord, to spell out whole syllables or words in a single stroke. "
"Each of the keys stand for a sound rather than a letter. "
"Software turns the strokes into English as she goes, and a skilled reporter can write more than two hundred words a minute this way.\n\n"
"[3] The speed matters, but accuracy matters more. When two lawyers talk over each other, Sato must catch both, and when a witness mumbles, she will politely command the witness to repeat the answer. "
"Each evening she reviews the days transcript, correcting strokes the software misread and adding the spellings of unusual names. "
"It is slow, careful work, most people in the courtroom never see it.\n\n"
"[4] [A] Sato learned the job in a two-year program that only a fraction of its students finish. "
"[B] Even now, before each trial, she writes out a list of the names and technical terms she expects to hear. "
"[C] She calls the list her \"brief,\" borrowing the lawyers' word for their own preparation. "
"[D] The habit, she says, is the closest thing her work has to a rehearsal.\n\n"
"[5] Some courts have tried replacing reporters with audio recordings. In one county, therefore, a single week of recordings produced dozens of passages marked \"inaudible.\" "
"A microphone cannot ask a witness to speak up. It also cannot tell two voices apart when they overlap. "
"For now, many courts still want a person in Sato's chair.")
mk(4, "Every Word in the Room", p4, [
 dict(kind='edit', sent="She is a court reporter, and her job is to produce a word-for-word record of everything said in the room, every question, every answer, and every objection.",
      span="room, every question", ask="which choice is correctly punctuated",
      opts=["room: every question", "room every question", "room; every question"], key="room: every question",
      exp='The list spells out what "everything said in the room" includes, and a colon introduces such a list after a complete clause. A comma makes "every question" look like one more item in a series with "the room"; no punctuation runs the list into "room"; and a semicolon must join two independent clauses.',
      domain=CSE, sub="colon before list", diff="medium"),
 dict(kind='edit', sent="She is a court reporter, and her job is to produce a word-for-word record of everything said in the room, every question, every answer, and every objection.",
      span="every answer, and every objection", ask="which choice keeps the list in the sentence parallel",
      opts=["every answer, and objecting", "answers, and every objection", "every answer, and objections"], key=NC,
      exp='The three items share one form: "every question, every answer, and every objection." Each other choice breaks that pattern, with a verb form ("objecting"), a plural without "every" ("answers"), or a mixed final item ("objections").',
      domain=CSE, sub="parallel structure", diff="easy"),
 dict(kind='edit', sent="Each of the keys stand for a sound rather than a letter.",
      span="stand", ask="which choice makes the sentence most grammatically acceptable",
      opts=["stands", "stood", "are standing"], key="stands",
      exp='The subject is "each," which is singular, so the verb is "stands." "Stand" and "are standing" are plural, and "stood" is past tense in a profile written in the present.',
      domain=CSE, sub="subject-verb agreement", diff="medium"),
 dict(kind='edit', sent="When two lawyers talk over each other, Sato must catch both, and when a witness mumbles, she will politely command the witness to repeat the answer.",
      span="command", ask="which choice is most precise in context",
      opts=["ask", "force", "summon"], key="ask",
      exp='"Politely" describes a request, so "ask" is the precise verb. "Command" and "force" contradict "politely," and "summon" means to call someone to come, which does not describe getting a witness to repeat an answer.',
      domain=KoL, sub="word choice", diff="easy"),
 dict(kind='edit', sent="Each evening she reviews the days transcript, correcting strokes the software misread and adding the spellings of unusual names.",
      span="days transcript", ask="which choice makes the sentence most grammatically acceptable",
      opts=["day's transcript", "days' transcript", "day transcript"], key="day's transcript",
      exp='The transcript belongs to one day, so the singular possessive "day\'s" is correct. "Days" has no apostrophe, "days\'" is plural possessive (several days), and "day transcript" drops the possessive entirely.',
      domain=CSE, sub="possessive apostrophe", diff="easy"),
 dict(kind='edit', sent="It is slow, careful work, most people in the courtroom never see it.",
      span="work, most", ask="which choice makes the sentence most grammatically acceptable",
      opts=["work. Most", "work most", "work, and most of it"], key="work. Most",
      exp='Two independent clauses are joined by a comma alone. A period separates them. "Work most" fuses them, and "work, and most of it people ... never see it" garbles the second clause.',
      domain=CSE, sub="comma splice", diff="easy"),
 dict(kind='other', prompt='The writer wants to add the following sentence to paragraph 4: "Those names and terms then get shortcut strokes of their own, so that each can be written in a single motion." The sentence would most logically be placed at:',
      opts=["Point [A].", "Point [B].", "Point [C].", "Point [D]."], key="Point [C].",
      exp='"Those names and terms" must come right after the sentence that introduces the list of names and terms, which ends just before Point [C]. At Point [D] it would follow the sentence about calling the list a "brief," separating "those names and terms" from the list they belong to, and at Points [A] and [B] the list has not yet been mentioned.',
      domain=PoW, sub="sentence placement", diff="hard"),
 dict(kind='other', prompt="Which choice, added at the beginning of paragraph 5, would most effectively introduce the paragraph?",
      opts=["Recording machines have not yet made her job unnecessary, however.",
            "Sato's training program has grown more popular in recent years.",
            "Court reporters are among the fastest typists in any profession.",
            "Lawyers rely on court transcripts when they appeal a judge's decision."],
      key="Recording machines have not yet made her job unnecessary, however.",
      exp='Paragraph 5 is about courts trying to replace reporters with recordings and the limits of microphones, so a sentence about machines not replacing her introduces it. Her training belongs to paragraph 4, typing speed to paragraph 2, and appeals are never discussed.',
      domain=PoW, sub="introduction", diff="medium"),
 dict(kind='edit', sent="In one county, therefore, a single week of recordings produced dozens of passages marked \"inaudible.\"",
      span="therefore,", ask="which choice provides the most logical transition",
      opts=["for example,", "in contrast,", "meanwhile,"], key="for example,",
      exp='The county is one case of the courts that "have tried replacing reporters," so "for example" fits. Nothing in the previous sentence causes this result ("therefore"), opposes it ("in contrast"), or happens at the same time as a separate event ("meanwhile").',
      domain=PoW, sub="transition", diff="medium"),
 dict(kind='other', prompt='In paragraph 5, which choice most effectively combines the sentences "A microphone cannot ask a witness to speak up. It also cannot tell two voices apart when they overlap."?',
      must=["A microphone cannot ask a witness to speak up. It also cannot tell two voices apart when they overlap."],
      opts=["A microphone cannot ask a witness to speak up or tell two voices apart when they overlap.",
            "A microphone cannot ask a witness to speak up, and also it cannot tell two voices apart when they overlap, either.",
            "Unable to ask a witness to speak up, two voices cannot be told apart by a microphone when they overlap.",
            "A microphone, which cannot ask a witness to speak up, it also cannot tell two voices apart when they overlap."],
      key="A microphone cannot ask a witness to speak up or tell two voices apart when they overlap.",
      exp='"Cannot ask a witness to speak up or tell two voices apart" joins the two limits under one subject and verb without repetition. The version with "and also ... either" repeats itself, the version beginning "Unable to ask a witness" makes that phrase modify "two voices," and the version with "which cannot ask" adds a second subject "it" after the clause.',
      domain=KoL, sub="sentence combining", diff="medium"),
])

# ---------------- P5  second person (Y 6/3/1) ----------------
p5 = ("[1] You arrive at the boathouse at six, before the sun has cleared the trees on the far bank, and the river is so still that it looks painted. "
"Eight people you have never met are already at the dock, they are carrying a long, narrow boat down to the water on their shoulders. "
"Someone hands you an oar that is taller than you are.\n\n"
"[2] The coach, a retired teacher named Augusta Vey, explains that rowing is less about strength than about timing. "
"Every rower must drop the blade into the water at the same instant, push with the legs, and then swinging the body back. "
"If one person is early or late, the whole boat lurches, and everyone feels it.\n\n"
"[3] At first, you are always late. You watch the back of the rower in front of you and try to copy her, but by the time you see her move, the moment has passed. "
"Your oar catches the water a beat after everyone else's and splashes the rower behind you. "
"You apologize, and she laughed and tells you that everyone splashes the first week. "
"Neither she nor the coach seem bothered.\n\n"
"[4] Similarly, somewhere around the tenth stroke of the third practice piece, something changes. "
"You stop watching the back in front of you and start listening instead: to the knock of eight oars turning in their locks at once, to the hiss of the hull. "
"For a few strokes the boat runs smooth and level. "
"It feels less like work and more like the coolest thing ever.\n\n"
"[5] When the boat returns to the dock your hands are blistered and your legs are shaking. "
"Augusta tells you that rowers have a name for what you felt; they call it swing, and some of them chase it for years. "
"You are already counting the days until Saturday.")
mk(5, "Swing", p5, [
 dict(kind='edit', sent="Eight people you have never met are already at the dock, they are carrying a long, narrow boat down to the water on their shoulders.",
      span="dock, they are", ask="which choice makes the sentence most grammatically acceptable",
      opts=["dock; they are", "dock they are", "dock, they were"], key="dock; they are",
      exp='Two independent clauses are joined by a comma alone. A semicolon joins them correctly. "Dock they are" fuses them, and "dock, they were" leaves the comma splice in place and shifts out of the present tense.',
      domain=CSE, sub="comma splice", diff="medium"),
 dict(kind='edit', sent="The coach, a retired teacher named Augusta Vey, explains that rowing is less about strength than about timing.",
      span="The coach, a retired teacher named Augusta Vey, explains", ask="which choice is correctly punctuated",
      opts=["The coach a retired teacher named Augusta Vey, explains", "The coach, a retired teacher named Augusta Vey explains", "The coach a retired teacher, named Augusta Vey explains"], key=NC,
      exp='"A retired teacher named Augusta Vey" is a nonessential appositive renaming the coach, so it takes a comma on each side. Each other choice drops one of the pair or moves it inside the appositive.',
      domain=CSE, sub="nonessential appositive commas", diff="medium"),
 dict(kind='edit', sent="Every rower must drop the blade into the water at the same instant, push with the legs, and then swinging the body back.",
      span="swinging", ask="which choice makes the sentence most grammatically acceptable",
      opts=["swing", "swung", "to be swinging"], key="swing",
      exp='The three actions follow "must": "drop ..., push ..., and then swing." The base form "swing" keeps the series parallel. "Swinging," "swung," and "to be swinging" each break the pattern.',
      domain=CSE, sub="parallel structure", diff="easy"),
 dict(kind='edit', sent="You apologize, and she laughed and tells you that everyone splashes the first week.",
      span="laughed", ask="which choice makes the sentence most grammatically acceptable",
      opts=["laughs", "laugh", "will laugh"], key="laughs",
      exp='The essay is told in the present tense ("you apologize ... tells you"), so "laughs" keeps the verbs consistent. "Laughed" shifts to the past and "will laugh" to the future, and "laugh" does not agree with the singular "she."',
      domain=CSE, sub="verb tense consistency", diff="easy"),
 dict(kind='edit', sent="Neither she nor the coach seem bothered.",
      span="seem", ask="which choice makes the sentence most grammatically acceptable",
      opts=["seems", "have seemed", "were seeming"], key="seems",
      exp='With "neither ... nor," the verb agrees with the nearer subject, "the coach," which is singular, so the verb is "seems." "Seem," "have seemed," and "were seeming" are plural forms, and the last two also leave the present tense.',
      domain=CSE, sub="subject-verb agreement", diff="hard"),
 dict(kind='edit', sent="Similarly, somewhere around the tenth stroke of the third practice piece, something changes.",
      span="Similarly,", ask="which choice provides the most logical transition",
      opts=["Before long, though,", "For instance,", "In much the same way,"], key="Before long, though,",
      exp='Paragraph 3 ends with you still late and splashing; paragraph 4 describes a change later that morning. "Before long, though," marks both the passing of time and the contrast. "Similarly" and "In much the same way" would claim this moment resembles the struggle before it, and "For instance" would make it an example of that struggle.',
      domain=PoW, sub="transition", diff="medium"),
 dict(kind='other', prompt='The writer is considering adding the following sentence after the third sentence of paragraph 4: "The rower behind you, the one you splashed, stays dry." Should the writer make this addition?',
      opts=["Yes, because it shows the smooth stroke through a detail that recalls the splashing described in paragraph 3.",
            "Yes, because it explains why the rower behind you did not seem bothered when you apologized for splashing her.",
            "No, because it shifts the paragraph's focus from what you hear to what the coach notices.",
            "No, because paragraph 3 has already said that everyone splashes during the first week."],
      key="Yes, because it shows the smooth stroke through a detail that recalls the splashing described in paragraph 3.",
      exp='In paragraph 3 your late oar splashes the rower behind you; a dry rower now gives concrete evidence that your timing has finally matched the boat\'s, in the paragraph about the boat running smooth. The sentence does not explain the earlier reaction, it involves no coach, and it adds rather than repeats, since paragraph 3 makes the general point and this sentence gives the change.',
      domain=PoW, sub="add sentence", diff="medium"),
 dict(kind='edit', sent="It feels less like work and more like the coolest thing ever.",
      span="less like work and more like the coolest thing ever", ask="which choice best maintains the tone of the essay",
      opts=["less like work than like being carried", "like work just got canceled, basically", "like an experience of transcendent and unparalleled bliss"], key="less like work than like being carried",
      exp='The essay is quiet and concrete ("the river is so still that it looks painted"). "Less like work than like being carried" keeps that register with a physical image. The original and "work just got canceled, basically" are slangy, and "transcendent and unparalleled bliss" is inflated.',
      domain=KoL, sub="tone", diff="easy"),
 dict(kind='edit', sent="When the boat returns to the dock your hands are blistered and your legs are shaking.",
      span="dock your hands", ask="which choice is correctly punctuated",
      opts=["dock, your hands", "dock; your hands", "dock. Your hands"], key="dock, your hands",
      exp='"When the boat returns to the dock" is an introductory dependent clause, so a comma follows it. A semicolon or a period would leave that clause standing alone as a fragment.',
      domain=CSE, sub="introductory clause comma", diff="medium"),
 dict(kind='other', prompt="This question asks about the preceding passage as a whole. Suppose the writer's primary purpose had been to explain the techniques coaches use to train competitive rowers. Would this essay accomplish that purpose?",
      opts=["Yes, because it describes how Augusta Vey teaches rowers to time the catch, the push, and the swing.",
            "Yes, because it shows the coach correcting a new rower who is late on every stroke.",
            "No, because it follows one newcomer's first morning and the feeling of the boat moving together.",
            "No, because it compares the boathouse's rowers with crews from other clubs on the river."],
      key="No, because it follows one newcomer's first morning and the feeling of the boat moving together.",
      exp='The essay narrates a single first practice, from arrival to blistered hands, and centers on the moment of "swing"; coaching appears in one sentence about timing. Augusta Vey never corrects the narrator in the essay, and no other clubs are mentioned.',
      domain=PoW, sub="essay purpose", diff="medium"),
])

json.dump(out, open(sys.argv[1], 'w'), indent=1, ensure_ascii=False)
print(len(out), 'items')
