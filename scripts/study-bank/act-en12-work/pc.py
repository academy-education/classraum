from common import *

# ---------------- P5  history / the Delta Works (Y 6/3/1) ----------------
p5 = ("[1] On the night of January 31, 1953, a storm drove the North Sea against the southwestern coast of the Netherlands. "
"The wind arrived together with a spring tide, and the water rose higher than anyone living had seen. "
"Before dawn, the sea had broken through the dikes in dozens of places. "
"By the time it retreated, 1,836 people had drowned, and tens of thousands had lost their homes.\n\n"
"[2] The disaster did not come as a complete surprise. "
"For years an engineer named Johan van Veen had warned that many dikes were to low and too weak. "
"He had even sketched a solution: instead of raising hundreds of miles of dikes, the country could close off the sea arms of the southwestern delta with a few enormous dams, shortening the coastline that had to be defended. "
"Before 1953, his plan seemed too expensive, within three weeks of the flood, the government had formed a commission to carry it out.\n\n"
"[3] The work, called the Delta Works, took more than forty years. "
"The most famous structure, the Eastern Scheldt barrier, was originally meant to be a solid dam. "
"But fishermen and environmentalists objected. "
"A solid dam would turn the estuary behind it into a still lake and destroy the oyster and mussel beds that depended from the tides. "
"After years of debate, engineers designed something new: a barrier of sixty-two steel gates, left open in normal weather and lowered only when a storm threatens. "
"Finished in 1986, it cost far more than a dam but allowed the tides to keep flowing.\n\n"
"[4] The last major piece, a barrier on the waterway leading to Rotterdam was completed in 1997. "
"Its two hinged arms, each nearly as long as the Eiffel Tower is tall, rests in dry docks on the banks. "
"They swing out to close the channel only when the water is forecast to rise dangerously.\n\n"
"[5] Today engineers from other low-lying countries visit the delta to study these structures.")
mk(5, "Closing the Sea Arms", 'Y', p5, [
 dict(kind='edit', sent="On the night of January 31, 1953, a storm drove the North Sea against the southwestern coast of the Netherlands.",
      span="January 31, 1953, a storm", ask="which choice is correctly punctuated",
      opts=["January 31 1953, a storm", "January, 31, 1953 a storm", "January 31, 1953 a storm"], key=NC,
      exp='In a full date in the middle of a sentence, the year is set off by a comma on each side: "January 31, 1953," followed by the rest of the sentence. Dropping the comma before or after the year leaves it half set off, and no comma belongs between the month and the day.',
      domain=CSE, sub="commas in dates", diff="easy"),
 dict(kind='edit', sent="For years an engineer named Johan van Veen had warned that many dikes were to low and too weak.",
      span="to low and too weak", ask="which choice makes the sentence most grammatically acceptable",
      opts=["too low and too weak", "to low and to weak", "too low and to weak"], key="too low and too weak",
      exp='Both words mean "excessively," so both must be "too": "too low and too weak." "To" is a preposition or part of an infinitive and cannot modify an adjective.',
      domain=CSE, sub="to vs too", diff="easy"),
 dict(kind='edit', sent="He had even sketched a solution: instead of raising hundreds of miles of dikes, the country could close off the sea arms of the southwestern delta with a few enormous dams, shortening the coastline that had to be defended.",
      span="solution: instead of raising", ask="which choice is correctly punctuated",
      opts=["solution, instead of raising", "solution instead of, raising", "solution; and instead of raising"], key=NC,
      exp='What follows "solution" is an independent clause that spells the solution out, and a colon introduces such an explanation. A comma would splice the two clauses, a comma inside "instead of raising" splits the phrase, and a semicolon is not followed by "and" when joining two clauses like these.',
      domain=CSE, sub="colon before explanation", diff="medium"),
 dict(kind='edit', sent="Before 1953, his plan seemed too expensive, within three weeks of the flood, the government had formed a commission to carry it out.",
      span="expensive, within", ask="which choice makes the sentence most grammatically acceptable",
      opts=["expensive; within", "expensive, so within", "expensive within"], key="expensive; within",
      exp='"Before 1953, his plan seemed too expensive" and "within three weeks of the flood, the government had formed a commission" are independent clauses joined only by a comma, a comma splice. A semicolon joins them. "So" makes the high cost the reason for forming the commission, which is backward, and no punctuation fuses the clauses.',
      domain=CSE, sub="comma splice", diff="medium"),
 dict(kind='edit', sent="But fishermen and environmentalists objected.",
      span="But", ask="which choice provides the most logical transition",
      opts=["Thus,", "Similarly,", "For example,"], key=NC,
      exp='The preceding sentence says the barrier was meant to be a solid dam; this sentence introduces opposition to that plan, and the paragraph goes on to say the plan changed. "But" marks that turn. The objection is not a result of the plan, not similar to it, and not an example of it.',
      domain=PoW, sub="transition", diff="easy"),
 dict(kind='edit', sent="A solid dam would turn the estuary behind it into a still lake and destroy the oyster and mussel beds that depended from the tides.",
      span="depended from", ask="which choice is most idiomatic in context",
      opts=["depended on", "depended with", "depended to"], key="depended on",
      exp='Standard English says something "depends on" what it needs. "Depended from" means hung from, and "depended with" and "depended to" are not idiomatic.',
      domain=KoL, sub="idiom", diff="easy"),
 dict(kind='edit', sent="The last major piece, a barrier on the waterway leading to Rotterdam was completed in 1997.",
      span="Rotterdam was", ask="which choice is correctly punctuated",
      opts=["Rotterdam, was", "Rotterdam; was", "Rotterdam—was"], key="Rotterdam, was",
      exp='"A barrier on the waterway leading to Rotterdam" is an appositive opened with a comma after "piece," so it must close with a comma before the verb. A semicolon would cut the subject off from "was completed," and a dash cannot close an appositive that a comma opened.',
      domain=CSE, sub="appositive commas", diff="medium"),
 dict(kind='other', prompt='The writer is considering adding the following sentence after the first sentence of paragraph 4: "A fixed dam there would have blocked the ships that use Europe\'s busiest port." Should the writer make this addition?',
      opts=["Yes, because it explains why the barrier's arms wait on the banks instead of staying closed.",
            "Yes, because it explains why the Rotterdam barrier was the last major piece to be finished.",
            "No, because paragraph 3 has already explained that the barriers were left open for shipping.",
            "No, because it contradicts paragraph 4's statement that the arms close the channel."],
      key="Yes, because it explains why the barrier's arms wait on the banks instead of staying closed.",
      exp='The rest of paragraph 4 says the arms rest on the banks and swing out only when a dangerous rise is forecast, without saying why. The sentence supplies the reason: a permanent closure would block shipping. The essay never connects shipping to the finishing date, paragraph 3 says the Eastern Scheldt gates stay open for the tides and the shellfish, not for ships, and the arms do close the channel, but only when needed.',
      domain=PoW, sub="add sentence", diff="hard"),
 dict(kind='edit', sent="Its two hinged arms, each nearly as long as the Eiffel Tower is tall, rests in dry docks on the banks.",
      span="rests", ask="which choice makes the sentence most grammatically acceptable",
      opts=["rest", "is resting", "has rested"], key="rest",
      exp='The subject is "arms," which is plural; the phrase beginning "each nearly as long" only describes them. The verb must be plural and present: "rest." "Rests," "is resting," and "has rested" are singular.',
      domain=CSE, sub="subject-verb agreement", diff="hard"),
 dict(kind='other', prompt='The writer wants to add a sentence after the last sentence of the essay that returns to an idea from paragraph 2. Which choice best accomplishes this goal?',
      opts=["What they see is the plan van Veen sketched years before the water came.",
            "What they see is the plan van Veen drew up in the three weeks after the flood.",
            "What they see is the hundreds of miles of raised dikes that van Veen called for.",
            "What they see is the solid dam that van Veen persuaded the fishermen to accept."],
      key="What they see is the plan van Veen sketched years before the water came.",
      exp='Paragraph 2 says van Veen had warned "for years" and had "even sketched a solution" before 1953, so the finished works are his earlier plan. Paragraph 2 says the government formed a commission within three weeks of the flood, not that van Veen drew up his plan then; his plan was to close the sea arms "instead of raising" the dikes; and paragraph 3 says the fishermen opposed a solid dam, which was never built.',
      domain=PoW, sub="conclusion", diff="medium"),
])

# ---------------- P6  humanities / the carillon (X 5/3/2) ----------------
p6 = ("[1] High in the bell tower of St. Rumbold's Cathedral in Mechelen, Belgium, a musician sits at an instrument that looks like a cross between an organ and a loom. "
"Instead of keys, it has two rows of wooden handles called batons, and a set of pedals below. "
"The musician plays by striking the batons with loosely closed fists. "
"Each baton is connected by a wire to a clapper inside one of the bronze bells hanging overhead, and the sound carries across the whole city.\n\n"
"[2] This instrument is a carillon, and it must have at least twenty-three bells. "
"Carillons first appeared in the towns of Flanders and the Netherlands more than five hundred years ago. "
"In the end, town bells were used to mark the hours, and a few notes were played before the hour struck to warn people to listen. "
"Over time the tunes grew longer, and towns added more bells to play them.\n\n"
"[3] Bells are difficult to tune. "
"A bell sounds not one pitch but several at once, and if those pitches clash, a melody played on it will sound sour. "
"In the 1600s two brothers, François and Pieter Hemony, have learned to shave metal from the inside of a bell on a lathe until its pitches agreed. "
"Their bells were so fragile that many still hang in Dutch towers today.\n\n"
"[4] The carillon owes much of its modern revival to Mechelen. "
"Around 1900 the city's carillonneur, Jef Denyn, improved the mechanism so that a player could control how softly or loudly each bell sounded. "
"His evening concerts drew crowds of thousands into the square below the tower. "
"In 1922 he founded the world's first school for carillon players, and students still travel there from around the world.\n\n"
"[5] Playing a carillon has minor challenges. "
"Each baton, the player must remember, pulls a wire attached to a clapper. "
"The musician sits in a small cabin directly below the bells, where the sound is so loud, and so oddly balanced, that it is hard to judge what listeners on the ground are hearing. "
"And unlike a piano, a carillon has no way to silence a note. "
"Once struck, a large bell may ring for half a minute, every note a player strikes stays in the air long after the next has begun.")
mk(6, "Music from the Tower", 'X', p6, [
 dict(kind='edit', sent="High in the bell tower of St. Rumbold's Cathedral in Mechelen, Belgium, a musician sits at an instrument that looks like a cross between an organ and a loom.",
      span="Mechelen, Belgium, a musician", ask="which choice is correctly punctuated",
      opts=["Mechelen Belgium, a musician", "Mechelen, Belgium a musician", "Mechelen; Belgium, a musician"], key=NC,
      exp='When a city and country appear in the middle of a sentence, the country is set off by a comma on each side, and here the second comma also ends the long introductory phrase. Dropping either comma leaves "Belgium" half set off, and a semicolon cannot separate a city from its country.',
      domain=CSE, sub="commas with place names", diff="easy"),
 dict(kind='edit', sent="Instead of keys, it has two rows of wooden handles called batons, and a set of pedals below.",
      span="handles called batons, and", ask="which choice is correctly punctuated",
      opts=["handles, called batons, and", "handles, called batons and", "handles called, batons, and"], key="handles, called batons, and",
      exp='"Called batons" gives the handles\' name as an aside, so it is set off by a pair of commas, and the closing comma also separates it from "and a set of pedals." Without the opening comma, the comma before "and" splits two objects of "has"; with only the opening comma, the phrase runs into the next item; and a comma after "called" separates the verb from its complement.',
      domain=CSE, sub="nonessential phrase commas", diff="hard"),
 dict(kind='edit', sent="In the end, town bells were used to mark the hours, and a few notes were played before the hour struck to warn people to listen.",
      span="In the end,", ask="which choice provides the most logical transition",
      opts=["At first,", "As a result,", "Thus,"], key="At first,",
      exp='This sentence describes the earliest use of town bells, and the next sentence says that "over time" the tunes grew longer. "At first" marks the starting point of that development. "In the end" places it last, and "As a result" and "Thus" make it follow from the bells\' first appearance as a consequence.',
      domain=PoW, sub="transition", diff="medium"),
 dict(kind='edit', sent="In the 1600s two brothers, François and Pieter Hemony, have learned to shave metal from the inside of a bell on a lathe until its pitches agreed.",
      span="have learned", ask="which choice makes the sentence most grammatically acceptable",
      opts=["learned", "will learn", "learn"], key="learned",
      exp='"In the 1600s" fixes the action in the finished past, and "agreed" later in the sentence is past tense, so the verb is the simple past "learned." The present perfect "have learned" cannot go with a completed past date, and "will learn" and "learn" are future and present.',
      domain=CSE, sub="verb tense", diff="medium"),
 dict(kind='edit', sent="Their bells were so fragile that many still hang in Dutch towers today.",
      span="fragile", ask="which choice best fits the context of the paragraph",
      opts=["admired", "ordinary", "recent"], key="admired",
      exp='The paragraph explains that the Hemonys solved a hard problem and made bells whose pitches agreed; the sentence then says many of their bells are still in use. Bells "so admired" that towns kept them fits. Fragile bells would not have survived for centuries, ordinary ones would not be singled out, and bells from the 1600s are not recent.',
      domain=KoL, sub="word choice in context", diff="medium"),
 dict(kind='edit', sent="Playing a carillon has minor challenges.",
      span="minor", ask="which choice best fits the context of the paragraph",
      opts=["strange", "expensive", "few"], key="strange",
      exp='The paragraph goes on to describe unusual difficulties: a player who cannot hear the music the way listeners do, and notes that cannot be silenced, unlike a piano\'s. "Strange" fits those. They are not presented as minor or few, and the paragraph says nothing about cost.',
      domain=KoL, sub="word choice in context", diff="medium"),
 dict(kind='other', prompt='The writer is considering deleting the following sentence from paragraph 5: "Each baton, the player must remember, pulls a wire attached to a clapper." Should the sentence be kept or deleted?',
      must=["Each baton, the player must remember, pulls a wire attached to a clapper."],
      opts=["Kept, because it explains why the player cannot silence a note once it has been struck.",
            "Kept, because it explains why the player cannot hear the bells as listeners on the ground do.",
            "Deleted, because paragraph 1 has already explained how each baton is connected to a bell.",
            "Deleted, because it contradicts paragraph 1's account of how the batons are played."],
      key="Deleted, because paragraph 1 has already explained how each baton is connected to a bell.",
      exp='Paragraph 1 already says each baton "is connected by a wire to a clapper," so the sentence repeats it, and it is not one of the challenges paragraph 5 lists. A wire to a clapper does not explain why a ringing bell cannot be silenced or why the player hears the bells differently, and it agrees with paragraph 1 rather than contradicting it.',
      domain=PoW, sub="delete sentence", diff="medium"),
 dict(kind='edit', sent="The musician sits in a small cabin directly below the bells, where the sound is so loud, and so oddly balanced, that it is hard to judge what listeners on the ground are hearing.",
      span="loud, and so oddly balanced, that", ask="which choice is correctly punctuated",
      opts=["loud and so oddly balanced, that", "loud, and so oddly balanced that", "loud; and so oddly balanced, that"], key=NC,
      exp='"And so oddly balanced" is an added aside inside the "so ... that" construction, so it is set off by a comma on each side. Dropping either comma leaves it half set off, and a semicolon cannot come before a phrase that is not an independent clause.',
      domain=CSE, sub="parenthetical commas", diff="medium"),
 dict(kind='edit', sent="Once struck, a large bell may ring for half a minute, every note a player strikes stays in the air long after the next has begun.",
      span="minute, every", ask="which choice makes the sentence most grammatically acceptable",
      opts=["minute, so every", "minute so every", "minute, however every"], key="minute, so every",
      exp='Two independent clauses are joined by a comma alone, a comma splice. A comma with "so" joins them and states the relation: because a bell rings so long, every note lingers. Without the comma the clauses run together, and "however" with only a comma before it is still a splice.',
      domain=CSE, sub="comma splice", diff="medium"),
 dict(kind='other', prompt="This question asks about the essay as a whole. Suppose the writer's primary purpose had been to describe the career of a musician who made an old instrument popular again. Would this essay accomplish that purpose?",
      opts=["Yes, because it follows Denyn from his first lessons as a student to his concerts in the square.",
            "Yes, because it describes how Denyn improved the mechanism, drew crowds, and founded a school.",
            "No, because Denyn appears in only one paragraph of an essay mostly about the instrument itself.",
            "No, because it credits the instrument's revival to the Hemony brothers rather than to any one musician."],
      key="No, because Denyn appears in only one paragraph of an essay mostly about the instrument itself.",
      exp='Denyn is the subject of paragraph 4 only; the other four paragraphs describe the instrument, its history, bell tuning, and the experience of playing it, so his career is not the essay\'s main concern. The essay says nothing about Denyn\'s own lessons, and it places the Hemonys in the 1600s, centuries before the revival it credits to Mechelen.',
      domain=PoW, sub="essay purpose", diff="medium"),
])
