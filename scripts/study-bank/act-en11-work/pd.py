from common import *

# ---------------- P7  natural science (Y 6/3/1) ----------------
p7 = ("[1] In the spring of certain years, the ground beneath the forests of the eastern United States begins to open. "
"Small holes appear by the thousands, and one warm evening, as if on a signal, millions of insects crawl out of it at once. "
"They are periodical cicadas, and they have spent the last thirteen or seventeen years underground.\n\n"
"[2] For nearly all of that time, a young cicada, called a nymph, lives in the dark, sucking sap from the roots of trees. "
"It grows slowly, molting several times. "
"How the nymphs keep count of the years are still not fully understood; some researchers think they track the yearly rise and fall of sap in the roots. "
"When the time comes, the nymphs wait for the soil about eight inches down to warm to roughly 64 degrees Fahrenheit and then emerge.\n\n"
"[3] [A] Above ground, the adults have only a few weeks to live. [B] "
"The males gather in the treetops and sing, producing a chorus loud enough to drown out conversation. [C] "
"The females lie their eggs in slits that they cut into thin branches. [D] "
"When the eggs hatch, the tiny nymphs drop to the ground and burrow down to begin the long wait again.\n\n"
"[4] Emerging all at once is itself an ambush. "
"Birds, squirrels, and even dogs feast on the cicadas, but there are far more insects than predators can eat, so most survive long enough to breed. "
"By contrast, an insect that emerged a week early or a year late would face the predators alone.\n\n"
"[5] The length of the cycle may matter too. "
"Thirteen and seventeen are prime numbers, divisible only by themselves and one. "
"Some biologists argue that a prime-numbered cycle makes it unlikely that cicadas will emerge in the same year as a predator whose numbers rise and fall on a shorter cycle. "
"A brood on a twelve-year cycle would meet predators on two-, three-, four-, or six-year cycles every time it emerged, a thirteen-year brood would rarely meet any of them.")
mk(7, "The Long Wait", 'Y', p7, [
 dict(kind='edit', sent="Small holes appear by the thousands, and one warm evening, as if on a signal, millions of insects crawl out of it at once.",
      span="out of it", ask="which choice makes the sentence most grammatically acceptable",
      opts=["out of them", "out of its", "out of those ones"], key="out of them",
      exp='The insects crawl out of the holes, and "holes" is plural, so the pronoun is "them." "It" is singular, "its" is a possessive with no noun after it, and "those ones" is not standard written English.',
      domain=CSE, sub="pronoun agreement", diff="easy"),
 dict(kind='edit', sent="It grows slowly, molting several times.",
      span="slowly, molting", ask="which choice is correctly punctuated",
      opts=["slowly molting", "slowly; molting", "slowly. Molting"], key=NC,
      exp='"Molting several times" is a participial phrase describing how the nymph grows, and a comma correctly attaches it to the clause. A semicolon or a period would leave the phrase standing alone as a fragment, and with no comma "slowly molting" reads as if the molting were slow.',
      domain=CSE, sub="participial phrase comma", diff="medium"),
 dict(kind='edit', sent="How the nymphs keep count of the years are still not fully understood; some researchers think they track the yearly rise and fall of sap in the roots.",
      span="are still", ask="which choice makes the sentence most grammatically acceptable",
      opts=["is still", "were still", "have still been"], key="is still",
      exp='The subject is the whole clause "How the nymphs keep count of the years," and a clause used as a subject is singular. The verb must be singular and present: "is still not fully understood." "Are," "were," and "have been" are plural, drawn by the nearby "years."',
      domain=CSE, sub="subject-verb agreement", diff="hard"),
 dict(kind='other', prompt='The writer wants to add the following sentence to paragraph 3: "Their song comes from a pair of drumlike plates on the abdomen that buckle and snap back hundreds of times a second." The sentence would most logically be placed at:',
      opts=["Point [A].", "Point [B].", "Point [C].", "Point [D]."], key="Point [C].",
      exp='"Their song" needs a singer already named, and the males are introduced singing in the sentence just before Point [C]. At Point [D] the nearest plural is "the females," who do not sing in the essay, and at Points [A] and [B] no song has yet been mentioned.',
      domain=PoW, sub="sentence placement", diff="easy"),
 dict(kind='edit', sent="The females lie their eggs in slits that they cut into thin branches.",
      span="lie", ask="which choice makes the sentence most grammatically acceptable",
      opts=["lay", "laid", "lain"], key="lay",
      exp='"Lay" means to put something down and takes an object, here "their eggs"; "lie" means to recline and takes none. The paragraph is in the present tense, so the verb is "lay." "Laid" shifts to the past, and "lain" is the past participle of "lie."',
      domain=CSE, sub="verb form (lie/lay)", diff="medium"),
 dict(kind='edit', sent="Emerging all at once is itself an ambush.",
      span="an ambush", ask="which choice best fits the context of the paragraph",
      opts=["a defense", "a disguise", "an attack"], key="a defense",
      exp='The paragraph explains that emerging in overwhelming numbers lets most cicadas survive their predators, so the mass emergence protects them: it is "a defense." An ambush and an attack are offensive, and a disguise hides an animal, but the cicadas are in plain sight.',
      domain=KoL, sub="word choice in context", diff="medium"),
 dict(kind='edit', sent="By contrast, an insect that emerged a week early or a year late would face the predators alone.",
      span="By contrast,", ask="which choice provides the most logical transition",
      opts=["For instance,", "Even so,", "Likewise,"], key=NC,
      exp='The preceding sentence explains that most cicadas survive because there are too many to eat; this sentence describes the opposite case, a lone cicada. "By contrast," marks that difference. "For instance" and "Likewise" would present the lone insect as an example or a parallel of the mass emergence, and "Even so" would set it against a point it actually supports.',
      domain=PoW, sub="transition", diff="medium"),
 dict(kind='other', prompt="Which choice most effectively introduces paragraph 5?",
      opts=["The length of the cycle may matter too.",
            "The timing of the emergence also depends on the soil temperature.",
            "Cicadas are hardly the only insects that spend years underground.",
            "Predators also hunt the nymphs."],
      key="The length of the cycle may matter too.",
      exp='Paragraph 4 explains one survival advantage (emerging all at once), and paragraph 5 explains why thirteen- and seventeen-year cycles may be another; "the length of the cycle may matter too" bridges the two. Soil temperature is paragraph 2\'s topic, other underground insects are never discussed, and the paragraph says nothing about nymphs being hunted.',
      domain=PoW, sub="introduction", diff="medium"),
 dict(kind='edit', sent="Thirteen and seventeen are prime numbers, divisible only by themselves and one.",
      span="themselves", ask="which choice makes the sentence most grammatically acceptable",
      opts=["itself", "theirselves", "them"], key=NC,
      exp='The pronoun refers back to "Thirteen and seventeen," the plural subject, so the reflexive "themselves" is correct. "Itself" is singular, "theirselves" is not standard English, and "them" would not point back to the subject.',
      domain=CSE, sub="reflexive pronoun", diff="easy"),
 dict(kind='edit', sent="A brood on a twelve-year cycle would meet predators on two-, three-, four-, or six-year cycles every time it emerged, a thirteen-year brood would rarely meet any of them.",
      span="emerged, a thirteen-year", ask="which choice makes the sentence most grammatically acceptable",
      opts=["emerged, whereas a thirteen-year", "emerged; whereas a thirteen-year", "emerged, because a thirteen-year"], key="emerged, whereas a thirteen-year",
      exp='Two independent clauses are joined by only a comma. "Whereas" turns the second into a dependent clause and marks the contrast between the twelve-year and thirteen-year broods. With no punctuation the clauses fuse, and "because" makes the thirteen-year brood\'s luck the cause of the twelve-year brood\'s bad luck.',
      domain=CSE, sub="comma splice", diff="medium"),
])

# ---------------- P8  personal narrative, first person (X 5/3/2) ----------------
p8 = ("[1] I was thirty-four the first time I put my face in the water on purpose. "
"Growing up in a desert town, I had never learned to swim, and as an adult I had become expert at avoiding the subject. "
"I stayed on the beach towel, offered to watch everyones' bags, and laughed when friends asked whether I was coming in.\n\n"
"[2] The adult class at the community pool met on Tuesday nights. "
"There were six of us, a retired bus driver, two college students, a nurse, a man who had recently moved from Nepal, and me. "
"The nurse had nearly drowned as a child; the bus driver simply wanted to keep up with his grandchildren. "
"Our instructor, Paloma, was perhaps twenty years old and spoke to us with the urgency of someone talking a cat out of a tree.\n\n"
"[3] The first lesson had nothing to do with swimming. "
"Paloma asked us to stand in the shallow end, take a breath, and lower our faces into the water while blowing bubbles through our noses. "
"It sounds simple. "
"For me it was terrifying, my body was convinced that the water would rush in and never leave.\n\n"
"[4] By the fourth week, I could float on my back if Paloma kept a hand under my shoulders. "
"By the sixth, she took the hand away without telling me, and I floated on my own for nearly a minute before I noticed. "
"When I realized what had happened, I panicked, swallowed half the pool, and came up coughing and laughing.\n\n"
"[5] I am still not a mighty swimmer. "
"I swim slow, my kick is uneven, and I need to rest at the end of every length. "
"But last summer, for the first time, I left the towel on the sand and walked into the lake with everyone else. "
"Paloma would probably call that a passing grade.")
mk(8, "Face in the Water", 'X', p8, [
 dict(kind='edit', sent="I stayed on the beach towel, offered to watch everyones' bags, and laughed when friends asked whether I was coming in.",
      span="everyones'", ask="which choice makes the sentence most grammatically acceptable",
      opts=["everyone's", "everyones", "every ones'"], key="everyone's",
      exp='"Everyone" is a singular pronoun, so its possessive is "everyone\'s." "Everyones\'" treats it as a plural, "everyones" drops the apostrophe, and "every ones\'" splits the word and still uses a plural possessive.',
      domain=CSE, sub="possessive", diff="easy"),
 dict(kind='edit', sent="There were six of us, a retired bus driver, two college students, a nurse, a man who had recently moved from Nepal, and me.",
      span="us, a retired", ask="which choice is correctly punctuated",
      opts=["us: a retired", "us; a retired", "us a retired"], key="us: a retired",
      exp='The list names the "six of us," so a colon after the complete clause introduces it. With a comma, "six of us" reads as the first of seven items. A semicolon must be followed by an independent clause, and the list is not one; with no punctuation the list runs into "us."',
      domain=CSE, sub="colon before list", diff="medium"),
 dict(kind='edit', sent="Our instructor, Paloma, was perhaps twenty years old and spoke to us with the urgency of someone talking a cat out of a tree.",
      span="urgency", ask="which choice best fits the context of the essay",
      opts=["patience", "impatience", "haste"], key="patience",
      exp='Paloma coaxes frightened adults one small step at a time, keeping a hand under the narrator\'s shoulders for weeks; the comparison to coaxing a cat down from a tree describes "patience." Urgency, impatience, and authority each describe pressure, which is the opposite of how she teaches in paragraphs 3 and 4.',
      domain=KoL, sub="word choice in context", diff="medium"),
 dict(kind='other', prompt='The writer is considering deleting the sentence "It sounds simple." from paragraph 3. Should the sentence be kept or deleted?',
      must=["It sounds simple."],
      opts=["Kept, because it sets up the contrast with the narrator's terror described in the next sentence.",
            "Kept, because it shows that Paloma explained the exercise clearly to the class.",
            "Deleted, because it contradicts the claim that the first lesson had nothing to do with swimming.",
            "Deleted, because the paragraph has already said that the exercise was easy for the other students."],
      key="Kept, because it sets up the contrast with the narrator's terror described in the next sentence.",
      exp='"It sounds simple" is followed by "For me it was terrifying"; the short sentence makes the narrator\'s fear stand out against how easy the exercise appears. It says nothing about how Paloma explained it, it agrees with rather than contradicts the point that the lesson was not yet swimming, and the paragraph never describes the other students\' experience.',
      domain=PoW, sub="delete sentence", diff="easy"),
 dict(kind='edit', sent="For me it was terrifying, my body was convinced that the water would rush in and never leave.",
      span="terrifying, my body", ask="which choice makes the sentence most grammatically acceptable",
      opts=["terrifying: my body", "terrifying my body", "terrifying, so my body"], key="terrifying: my body",
      exp='The second clause explains why the exercise was terrifying, and a colon joins an independent clause to one that explains it. The original is a comma splice, no punctuation fuses the clauses, and "so" reverses the logic: the narrator was terrified because the body expected water to rush in, not the other way around.',
      domain=CSE, sub="comma splice", diff="medium"),
 dict(kind='edit', sent="When I realized what had happened, I panicked, swallowed half the pool, and came up coughing and laughing.",
      span="had happened", ask="which choice makes the sentence most grammatically acceptable",
      opts=["has happened", "happens", "would happen"], key=NC,
      exp='The floating happened before the narrator realized it, so the past perfect "had happened" is correct in this past-tense account. "Has happened" and "happens" shift into the present, and "would happen" points to something still to come.',
      domain=CSE, sub="verb tense", diff="medium"),
 dict(kind='edit', sent="I am still not a mighty swimmer.",
      span="mighty", ask="which choice is most precise in context",
      opts=["strong", "brawny", "forceful"], key="strong",
      exp='A "strong swimmer" is the standard way to describe someone who swims well and confidently, which the narrator says is not yet true, as the next sentence shows. "Mighty" and "forceful" describe power, and "muscular" describes a body, not a skill.',
      domain=KoL, sub="word choice", diff="medium"),
 dict(kind='edit', sent="I swim slow, my kick is uneven, and I need to rest at the end of every length.",
      span="swim slow", ask="which choice makes the sentence most grammatically acceptable",
      opts=["swim slowly", "swim slower", "swim slowest"], key="swim slowly",
      exp='The word modifies the verb "swim," so it must be the adverb "slowly." "Slow" is an adjective; "slower" and "slowest" are comparative and superlative forms with nothing to compare against.',
      domain=CSE, sub="adjective vs adverb", diff="easy"),
 dict(kind='edit', sent="But last summer, for the first time, I left the towel on the sand and walked into the lake with everyone else.",
      span="But", ask="which choice provides the most logical transition",
      opts=["Therefore,", "For example,", "Similarly,"], key=NC,
      exp='The paragraph has just listed the narrator\'s limits as a swimmer; this sentence turns to what the narrator managed despite them. "But" marks the turn. "Therefore" would make walking into the lake a result of swimming badly, "For example" would make it an instance of those limits, and "Similarly" would make it one more limit.',
      domain=PoW, sub="transition", diff="easy"),
 dict(kind='other', prompt="This question asks about the essay as a whole. Suppose the writer's primary purpose had been to give step-by-step instructions for teaching adults to swim. Would this essay accomplish that purpose?",
      opts=["Yes, because it describes Paloma's first exercise of blowing bubbles in the shallow end.",
            "Yes, because it shows how Paloma moved the narrator from floating with help to floating alone.",
            "No, because it tells one adult's story instead of setting out a method.",
            "No, because it says adults learn more slowly than children."],
      key="No, because it tells one adult's story instead of setting out a method.",
      exp='The essay is a personal story, from the narrator\'s avoidance of water to walking into the lake; Paloma\'s exercises appear only as moments in that story, not as a sequence of instructions. The essay never compares adults with children.',
      domain=PoW, sub="essay purpose", diff="easy"),
])
