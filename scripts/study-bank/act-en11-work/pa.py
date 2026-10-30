from common import *

# ---------------- P1  humanities / publishing history (X 5/3/2) ----------------
p1 = ("[1] In 1934 the publisher Allen Lane spent a weekend in Devon with the novelist Agatha Christie. "
"Waiting at Exeter station for the train back to London, he searched the bookstall for something to read and found only glossy magazines and reprints of forgettable novels. "
"Good books existed, of course, but in Britain a new hardback cost about seven shillings. "
"That was well beyond what most travelers would invest on a few hours of reading.\n\n"
"[2] Lane's answer was simple. He would sell good books, novels and biographies that had already succeeded in hardback, for sixpence each, roughly the price of a pack of cigarettes. "
"Other publishers thought the plan was generous. "
"If serious books cost so little, they argued, readers would stop buying the expensive editions, and authors would earn almost nothing.\n\n"
"[3] Lane went ahead anyway. "
"The first ten Penguins appeared in the summer of 1935 their covers divided into three horizontal bands: orange for fiction, green for crime, and blue for biography. "
"The design was plain, it was also easy to recognize from across a shop. "
"Lane did not wait for bookshops to come around. "
"Instead, he persuaded the chain store Woolworths to place a large order, and the books were soon stacked beside the kitchenware and the sweets.\n\n"
"[4] The gamble paid off. "
"Sales of the first ten titles was strong enough that Penguin sold three million books within a year, and rival publishers who had predicted ruin began launching cheap series of their own. "
"During the Second World War, special editions went to the armed forces. "
"Printed in special editions small enough for a uniform pocket, soldiers carried paperbacks from camp to camp and passed them along until the pages came loose.\n\n"
"[5] Penguin's success did more than make a fortune for one publisher. It changed who could own a library. "
"Clerks and factory workers could now buy a novel every week out of their spare change and keep it on a shelf at home. "
"Ninety years later, the bookstall that disappointed Lane is long gone, but the idea he had there is on sale in stations around the world.")
mk(1, "Sixpence a Book", 'X', p1, [
 dict(kind='edit', sent="Good books existed, of course, but in Britain a new hardback cost about seven shillings.",
      span="existed, of course, but", ask="which choice is correctly punctuated",
      opts=["existed of course, but", "existed, of course but", "existed; of course, but"], key=NC,
      exp='"Of course" is an interrupting phrase, so it takes a comma on each side, and the comma before "but" still belongs to the pair. Dropping either comma leaves the interrupter half set off, and a semicolon cannot stand before a phrase that is not followed by an independent clause on its own.',
      domain=CSE, sub="parenthetical commas", diff="easy"),
 dict(kind='edit', sent="That was well beyond what most travelers would invest on a few hours of reading.",
      span="invest on", ask="which choice is most idiomatic in context",
      opts=["spend on", "devote on", "pay on"], key="spend on",
      exp='People "spend" money "on" something; "spend on" is the idiomatic pairing. "Invest" pairs with "in," "devote" with "to," and "afford" takes a direct object without "on," so each of those leaves a broken idiom.',
      domain=KoL, sub="idiom / word choice", diff="medium"),
 dict(kind='edit', sent="Other publishers thought the plan was generous.",
      span="generous", ask="which choice best fits the context of the paragraph",
      opts=["reckless", "modest", "charitable"], key="reckless",
      exp='The next sentence gives the publishers\' reasoning: cheap books would ruin sales of expensive editions and leave authors with almost nothing. That is a charge of recklessness. "Generous" and "charitable" praise the plan as kind, and "modest" calls it small, but the publishers are warning that it is dangerous.',
      domain=KoL, sub="word choice in context", diff="medium"),
 dict(kind='edit', sent="The first ten Penguins appeared in the summer of 1935 their covers divided into three horizontal bands: orange for fiction, green for crime, and blue for biography.",
      span="1935 their", ask="which choice makes the sentence most grammatically acceptable",
      opts=["1935, their", "1935. Their", "1935; their"], key="1935, their",
      exp='"Their covers divided into three horizontal bands" has no main verb (only the participle "divided"), so it is a modifying phrase, not a sentence. It attaches to the main clause with a comma. A period or a semicolon would leave the phrase standing alone as a fragment, and no punctuation at all runs it into "1935."',
      domain=CSE, sub="phrase vs clause punctuation", diff="hard"),
 dict(kind='edit', sent="The design was plain, it was also easy to recognize from across a shop.",
      span="plain, it was", ask="which choice makes the sentence most grammatically acceptable",
      opts=["plain, but it was", "plain, however, it was", "plain; and it was"], key="plain, but it was",
      exp='Two independent clauses are joined by a comma alone. A comma with the conjunction "but" joins them and also marks the contrast between a plain design and an easily recognized one. With no punctuation the clauses run together, and a semicolon is not used before a coordinating conjunction joining two short clauses like these.',
      domain=CSE, sub="comma splice", diff="medium"),
 dict(kind='edit', sent="Instead, he persuaded the chain store Woolworths to place a large order, and the books were soon stacked beside the kitchenware and the sweets.",
      span="Instead,", ask="which choice provides the most logical transition",
      opts=["Likewise,", "Even so,", "Otherwise,"], key=NC,
      exp='The preceding sentence says Lane did not wait for bookshops; this sentence says what he did in place of waiting. "Instead," marks that replacement. "Likewise" would claim the order resembled the waiting, "Even so" would set the order against something it does not contradict, and "Otherwise" would describe what happens if he does not act.',
      domain=PoW, sub="transition", diff="medium"),
 dict(kind='edit', sent="Sales of the first ten titles was strong enough that Penguin sold three million books within a year, and rival publishers who had predicted ruin began launching cheap series of their own.",
      span="was strong", ask="which choice makes the sentence most grammatically acceptable",
      opts=["were strong", "is strong", "has been strong"], key="were strong",
      exp='The subject is "sales," which is plural; "of the first ten titles" only describes it. The verb must be plural and in the past tense, like the rest of the paragraph: "were strong." "Is" and "has been" are singular and break the past-tense account.',
      domain=CSE, sub="subject-verb agreement", diff="medium"),
 dict(kind='other', prompt='The writer is considering adding the following sentence after the first sentence of paragraph 4 ("The gamble paid off."): "Christie herself would later become one of Penguin\'s best-selling authors." Should the writer make this addition?',
      must=["The gamble paid off."],
      opts=["Yes, because it connects the weekend in Devon described in paragraph 1 to Penguin's later success.",
            "Yes, because it explains why rivals copied Penguin.",
            "No, because it shifts from Penguin's sales to one author's later career.",
            "No, because paragraph 1 has already said that Christie's novels were among the first ten Penguins."],
      key="No, because it shifts from Penguin's sales to one author's later career.",
      exp='Paragraph 4 moves from "The gamble paid off" straight to sales figures and rival series; a remark about one author\'s later career breaks that line. The sentence does not explain the rival series, and paragraph 1 mentions Christie only as Lane\'s host, never as a Penguin author.',
      domain=PoW, sub="add sentence", diff="medium"),
 dict(kind='edit', sent="Printed in special editions small enough for a uniform pocket, soldiers carried paperbacks from camp to camp and passed them along until the pages came loose.",
      span="Printed in special editions small enough for a uniform pocket, soldiers carried paperbacks", ask="which choice makes the sentence most grammatically acceptable",
      opts=["Printed in special editions small enough for a uniform pocket, paperbacks were carried by soldiers",
            "Soldiers, printed in special editions small enough for a uniform pocket, carried paperbacks",
            "Printed in special editions small enough for a uniform pocket, the soldiers' paperbacks were carried"],
      key="Printed in special editions small enough for a uniform pocket, paperbacks were carried by soldiers",
      exp='The opening phrase describes the books, so the word right after the comma must be "paperbacks." The original makes the soldiers the things printed in special editions; moving the phrase after "Soldiers" says the same thing; and "the soldiers\' paperbacks" puts the possessive "soldiers\'" first, so the phrase still attaches to the soldiers.',
      domain=CSE, sub="dangling modifier", diff="hard"),
 dict(kind='other', prompt='The writer is considering deleting the phrase "roughly the price of a pack of cigarettes" from the second sentence of paragraph 2. Should the phrase be kept or deleted?',
      must=["roughly the price of a pack of cigarettes"],
      opts=["Kept, because it gives a familiar comparison that shows how little sixpence was.",
            "Kept, because it explains why other publishers objected to Lane's plan.",
            "Deleted, because paragraph 1 has already given the price of a new hardback.",
            "Deleted, because it shifts the paragraph's focus from books to the habits of travelers."],
      key="Kept, because it gives a familiar comparison that shows how little sixpence was.",
      exp='A reader today has no feel for "sixpence"; comparing it to a pack of cigarettes makes the low price concrete. The publishers\' objection is given in the next sentences and concerns lost sales, not cigarettes. The hardback price in paragraph 1 is a different figure, and the phrase does not discuss travelers\' habits.',
      domain=PoW, sub="delete phrase", diff="medium"),
])

# ---------------- P2  natural science explainer (Y 6/3/1) ----------------
p2 = ("[1] A common octopus resting on a reef can vanish in less than a second. "
"Its skin shifts from rusty red to the mottled gray-green of the rock beneath it, and small bumps rise on its surface to mock the texture of algae. "
"Few animals can change their appearance so completely or so quickly.\n\n"
"[2] The trick begins with cells called chromatophores. "
"Each one is a tiny elastic sac of pigment—yellow, red, brown, or black, ringed by muscles. "
"When the muscles contract, they stretch the sac wide, and the pigment spreads across a larger patch of skin. "
"When the muscles relax, the sac shrinks back to a dot that is almost invisible. "
"Because each of these muscles are wired to nerves from the brain, an octopus can open thousands of sacs at once.\n\n"
"[3] Beneath the chromatophores lies two other layers of cells. "
"Iridophores reflect light to produce shimmering blues and greens, and leucophores scatter all colors equally, giving the skin a bright white background. "
"Working together, the three layers allow an octopus to produce an enormous range of patterns, from stripes and spots to flickering bands of color.\n\n"
"[4] What puzzles biologists is that the octopus appears to be colorblind. "
"Its eyes contain only one type of light-sensitive pigment, which should let it see brightness but not hue. "
"Similarly, it matches the color of its surroundings with remarkable accuracy.\n\n"
"[5] Researchers have proposed two explanations, and they are not mutually exclusive. "
"One is that the skin itself can sense light: proteins similar to those in the eye have been found in octopus skin. "
"The other concerns the animal's oddly shaped pupil, which may bring different colors into focus at slightly different distances and so give the brain clues about hue. "
"Neither idea has yet been proven, the octopus's disappearing act remains, at least in part, a mystery.")
mk(2, "Now You See It", 'Y', p2, [
 dict(kind='edit', sent="Its skin shifts from rusty red to the mottled gray-green of the rock beneath it, and small bumps rise on its surface to mock the texture of algae.",
      span="mock", ask="which choice is most precise in context",
      opts=["mimic", "parody", "rehearse"], key="mimic",
      exp='The bumps make the skin look like algae, so they imitate its texture: "mimic." "Mock" and "parody" both mean imitating in order to ridicule, and "rehearse" means practicing for a later performance; none describes camouflage.',
      domain=KoL, sub="word choice", diff="easy"),
 dict(kind='edit', sent="Each one is a tiny elastic sac of pigment—yellow, red, brown, or black, ringed by muscles.",
      span="pigment—yellow, red, brown, or black, ringed", ask="which choice is correctly punctuated",
      opts=["pigment—yellow, red, brown, or black—ringed", "pigment: yellow, red, brown, or black: ringed", "pigment, yellow, red, brown, or black—ringed"],
      key="pigment—yellow, red, brown, or black—ringed",
      exp='The list of colors interrupts the sentence, and because it contains commas of its own it is set off with a matching pair of dashes. The original opens with a dash and closes with a comma; a pair of colons is never used to enclose an interruption; and the version that opens with a comma closes with a dash.',
      domain=CSE, sub="dashes around interrupter", diff="medium"),
 dict(kind='edit', sent="When the muscles contract, they stretch the sac wide, and the pigment spreads across a larger patch of skin.",
      span="they stretch", ask="which choice makes the sentence most grammatically acceptable",
      opts=["it stretches", "this stretches", "one stretches"], key=NC,
      exp='The pronoun refers to "the muscles," which is plural, so "they stretch" is correct. "It" and "this" are singular and would point to the sac or to the contraction, and "one stretches" refers to no noun in the sentence.',
      domain=CSE, sub="pronoun agreement", diff="easy"),
 dict(kind='edit', sent="Because each of these muscles are wired to nerves from the brain, an octopus can open thousands of sacs at once.",
      span="are wired", ask="which choice makes the sentence most grammatically acceptable",
      opts=["is wired", "were wired", "have been wired"], key="is wired",
      exp='The subject is "each," which is singular; "of these muscles" only describes it. The verb must be singular and present, like the rest of the paragraph: "is wired." "Are," "were," and "have been" are all plural forms.',
      domain=CSE, sub="subject-verb agreement", diff="medium"),
 dict(kind='edit', sent="Beneath the chromatophores lies two other layers of cells.",
      span="lies", ask="which choice makes the sentence most grammatically acceptable",
      opts=["lie", "lays", "lying"], key="lie",
      exp='The sentence is inverted: its subject, "two other layers," comes after the verb, and it is plural, so the verb is "lie." "Lies" is singular, "lays" is a different verb that needs an object, and "lying" leaves the sentence with no main verb.',
      domain=CSE, sub="subject-verb agreement (inverted)", diff="hard"),
 dict(kind='other', prompt='The writer is considering adding the following sentence at the end of paragraph 5\'s third sentence ("The other concerns the animal\'s oddly shaped pupil, which may bring different colors into focus at slightly different distances and so give the brain clues about hue."): "Octopuses can also taste with the suckers on their arms." Should the writer make this addition?',
      must=["The other concerns the animal's oddly shaped pupil, which may bring different colors into focus at slightly different distances and so give the brain clues about hue."],
      opts=["Yes, because it offers a third way the octopus senses things.",
            "Yes, because it shows that the octopus's skin, like its eyes, contains sensors.",
            "No, because tasting has no bearing on how the octopus could detect color.",
            "No, because paragraph 3 has already described what the octopus's arms can sense."],
      key="No, because tasting has no bearing on how the octopus could detect color.",
      exp='Paragraph 5 weighs two explanations for how a colorblind animal could match color. Taste in the suckers is unrelated to color, so it does not offer a third explanation or add to the skin hypothesis, which concerns light. Paragraph 3 describes skin layers, not the arms.',
      domain=PoW, sub="add sentence", diff="medium"),
 dict(kind='edit', sent="Its eyes contain only one type of light-sensitive pigment, which should let it see brightness but not hue.",
      span="pigment, which", ask="which choice is correctly punctuated",
      opts=["pigment which", "pigment, that", "pigment; which"], key=NC,
      exp='The clause beginning "which should let it see" adds information about the one pigment just named, so it is nonessential and follows a comma. "That" is not used after a comma for a nonessential clause, a semicolon cannot introduce a dependent clause, and with no comma the clause reads as if it picks out one pigment among several.',
      domain=CSE, sub="nonessential clause comma", diff="medium"),
 dict(kind='edit', sent="Similarly, it matches the color of its surroundings with remarkable accuracy.",
      span="Similarly,", ask="which choice provides the most logical transition",
      opts=["Even so,", "For this reason,", "Thus,"], key="Even so,",
      exp='The preceding sentences say the octopus should not be able to see hue; this sentence says it matches colors anyway. "Even so," marks that surprise. "Similarly" and "In other words" treat the sentence as agreeing with or restating the colorblindness, and "For this reason" makes the colorblindness the cause of the accurate matching.',
      domain=PoW, sub="transition", diff="medium"),
 dict(kind='other', prompt="This question asks about the essay as a whole. Suppose the writer's primary purpose had been to explain how an animal's body produces a change in its outward appearance. Would this essay accomplish that purpose?",
      opts=["Yes, because it explains how muscles, pigment sacs, and reflecting layers change the skin.",
            "Yes, because it shows how the octopus's eyes detect color.",
            "No, because it is mainly concerned with why the octopus may be colorblind rather than with its skin.",
            "No, because it compares the camouflage of several reef animals without explaining any one of them in detail."],
      key="Yes, because it explains how muscles, pigment sacs, and reflecting layers change the skin.",
      exp='Paragraphs 2 and 3 explain the mechanism in detail: muscles open and close the pigment sacs, and two reflecting layers sit beneath them. The essay says the eyes apparently cannot detect hue, so they do not supply the colors; colorblindness takes up only paragraphs 4 and 5; and no other reef animal is described.',
      domain=PoW, sub="essay purpose", diff="medium"),
 dict(kind='edit', sent="Neither idea has yet been proven, the octopus's disappearing act remains, at least in part, a mystery.",
      span="proven, the", ask="which choice makes the sentence most grammatically acceptable",
      opts=["proven; the", "proven, yet, the", "proven, although the"], key="proven; the",
      exp='Two independent clauses are joined by only a comma, a comma splice. A semicolon joins two closely related clauses correctly. With no punctuation they run together, and "although" makes the second clause contrast with the first when it actually follows from it.',
      domain=CSE, sub="comma splice", diff="medium"),
])
