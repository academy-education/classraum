from common import *

# ---------------- P11  humanities / art history (X 5/3/2) ----------------
p11 = ("[1] The Bayeux Tapestry is not, strictly speaking, a tapestry. "
"A true tapestry is woven, with the design built into the fabric thread by thread. "
"The Bayeux work was embroidered, its scenes were stitched in colored wool onto long strips of plain linen. "
"The name stuck anyway, and after more than nine centuries no one seems inclined to change it.\n\n"
"[2] The embroidery is about half a meter tall and nearly seventy meters long. "
"Scholars have counted more than six hundred human figures in its scenes, along with nearly two hundred horses and dozens of ships. "
"It tells the story of the Norman conquest of England in 1066, from an oath that the English nobleman Harold supposedly swore to William, Duke of Normandy, to the Battle of Hastings, where Harold was killed. "
"Short Latin captions names the people and places.\n\n"
"[3] Historians believe that the work was commissioned by William's half-brother, Bishop Odo, and it being probably made by English embroiderers within a few years of the battle. "
"That origin makes it an ordinary document: a celebration of the Norman victory, stitched by people of the defeated nation.\n\n"
"[4] The main scenes are infested with detail. "
"For instance, ships are loaded with wine barrels and horses, and soldiers wear shirts of chain mail. "
"Above and below the story run two narrow borders filled with lions, birds, and scenes from fables. "
"In one panel a comet streaks across the sky, a sight that observers in 1066 took as an omen, it is now thought to have been Halley's comet.\n\n"
"[5] The final section of the embroidery is missing, and no one knows how the story originally ended. "
"Perhaps the last panels showed William's coronation. "
"What survives, however, is remarkable enough. "
"For anyone who wants to know how people in the eleventh century fought, dressed, and sailed, few sources are as vivid.")
mk(11, "Stitched History", 'X', p11, [
 dict(kind='other', prompt="Which choice most effectively introduces the essay in paragraph 1?",
      opts=["The Bayeux Tapestry is not, strictly speaking, a tapestry.",
            "The town of Bayeux lies in Normandy, in northern France.",
            "Embroidery was a common craft in eleventh-century England.",
            "Halley's comet returns to the night sky roughly every seventy-six years."],
      key="The Bayeux Tapestry is not, strictly speaking, a tapestry.",
      exp='The rest of paragraph 1 explains the difference between weaving and embroidery and says "the name stuck anyway"; only an opening that raises the question of the name prepares for that. The town\'s location, embroidery as a common craft, and the comet\'s return are not what the paragraph goes on to discuss.',
      domain=PoW, sub="introduction", diff="medium"),
 dict(kind='edit', sent="The Bayeux work was embroidered, its scenes were stitched in colored wool onto long strips of plain linen.",
      span="embroidered, its scenes", ask="which choice makes the sentence most grammatically acceptable",
      opts=["embroidered: its scenes", "embroidered its scenes", "embroidered; but its scenes"], key="embroidered: its scenes",
      exp='The second clause explains what "embroidered" means for this work, and a colon joins an independent clause to one that explains it. The original is a comma splice, no punctuation fuses the clauses, and a semicolon followed by "but" sets the stitching against the embroidering as if the two were in contrast.',
      domain=CSE, sub="comma splice", diff="medium"),
 dict(kind='edit', sent="Short Latin captions names the people and places.",
      span="names", ask="which choice makes the sentence most grammatically acceptable",
      opts=["name", "naming", "has named"], key="name",
      exp='The subject, "captions," is plural, so the verb is "name." "Names" and "has named" are singular, and "naming" leaves the sentence without a main verb.',
      domain=CSE, sub="subject-verb agreement", diff="easy"),
 dict(kind='edit', sent="Historians believe that the work was commissioned by William's half-brother, Bishop Odo, and it being probably made by English embroiderers within a few years of the battle.",
      span="and it being probably made", ask="which choice makes the sentence most grammatically acceptable",
      opts=["and that it was probably made", "and to have probably been made", "and probably making it"], key="and that it was probably made",
      exp='"Historians believe" takes two parallel "that" clauses: "that the work was commissioned ..." and "that it was probably made ...". The original uses a participle, "to have been made" switches to an infinitive, and "probably making it" turns the historians into the makers.',
      domain=CSE, sub="parallelism", diff="medium"),
 dict(kind='edit', sent="That origin makes it an ordinary document: a celebration of the Norman victory, stitched by people of the defeated nation.",
      span="an ordinary", ask="which choice best fits the context of the sentence",
      opts=["an unusual", "a typical", "an insignificant"], key="an unusual",
      exp='The explanation after the colon describes a paradox, a victory celebration made by the losing side, which is what makes the work "unusual." "Ordinary" and "typical" say the opposite, and "minor" judges the work\'s importance, which the explanation does not address.',
      domain=KoL, sub="word choice in context", diff="easy"),
 dict(kind='edit', sent="The main scenes are infested with detail.",
      span="infested", ask="which choice is most precise in context",
      opts=["crowded", "plagued", "overrun"], key="crowded",
      exp='The paragraph admires the many details, from wine barrels to chain mail; "crowded" describes a scene full of them without judging. "Infested," "plagued," and "overrun" all suggest something harmful or unwanted, which conflicts with the writer\'s admiring description.',
      domain=KoL, sub="word choice", diff="easy"),
 dict(kind='edit', sent="For instance, ships are loaded with wine barrels and horses, and soldiers wear shirts of chain mail.",
      span="For instance,", ask="which choice provides the most logical transition",
      opts=["However,", "Consequently,", "In contrast,"], key=NC,
      exp='The preceding sentence says the scenes are full of detail, and this sentence gives two of those details. "For instance," marks them as examples. "However" and "In contrast" would set the details against the claim they illustrate, and "Consequently" would make them a result of it.',
      domain=PoW, sub="transition", diff="easy"),
 dict(kind='edit', sent="In one panel a comet streaks across the sky, a sight that observers in 1066 took as an omen, it is now thought to have been Halley's comet.",
      span="omen, it is", ask="which choice makes the sentence most grammatically acceptable",
      opts=["omen. It is", "omen, therefore it is", "omen, which it is"], key="omen. It is",
      exp='The sentence joins two independent clauses with only a comma. A period separates them. With no punctuation they fuse, and "which it is now thought" leaves the clause with both "which" and "it" as its subject.',
      domain=CSE, sub="comma splice", diff="medium"),
 dict(kind='other', prompt='The writer is considering deleting the sentence "Perhaps the last panels showed William\'s coronation." from paragraph 5. Should the sentence be kept or deleted?',
      must=["Perhaps the last panels showed William's coronation."],
      opts=["Kept, because it offers one possible answer to the question of how the story ended.",
            "Kept, because it explains why the final section of the embroidery went missing.",
            "Deleted, because it contradicts the statement in paragraph 2 that the story ends with the Battle of Hastings.",
            "Deleted, because paragraph 3 has already said that the work celebrates the Norman victory."],
      key="Kept, because it offers one possible answer to the question of how the story ended.",
      exp='The preceding sentence says no one knows how the story originally ended, and "Perhaps" offers a guess. The sentence gives no reason for the loss; paragraph 2 describes the surviving story, which reaches Hastings, so a lost later scene does not contradict it; and a general remark about celebrating the victory does not make a specific guess redundant.',
      domain=PoW, sub="delete sentence", diff="medium"),
 dict(kind='edit', sent="For anyone who wants to know how people in the eleventh century fought, dressed, and sailed, few sources are as vivid.",
      span="fought, dressed, and sailed,", ask="which choice is correctly punctuated",
      opts=["fought, dressed and, sailed,", "fought dressed, and sailed,", "fought, dressed, and, sailed,"], key=NC,
      exp='Three verbs in a series are separated by commas, with "and" before the last one, and a comma closes the long introductory phrase. Each other choice moves or adds a comma inside the series so that it splits "and" from "sailed" or runs two of the verbs together.',
      domain=CSE, sub="series commas", diff="easy"),
])

# ---------------- P12  social science / history of timekeeping (Y 6/3/1) ----------------
p12 = ("[1] Before 1883, nearly every town in the United States kept its own time. "
"Noon was the moment the sun stood loftiest in the sky, and because the sun appears to move westward, noon in Boston came several minutes before noon in a town to its west. "
"For most of history, this hardly mattered. "
"In contrast, a farmer or a shopkeeper rarely needed to know what time it was two hundred miles away.\n\n"
"[2] The railroads changed that. "
"A train leaving Chicago passed through dozens of local times on its way east, and each railroad kept their own schedule, usually set by the clock in its headquarters city. "
"Stations sometimes displayed several clocks, one for each railroad that stopped there, and all of them were different. "
"Travelers missed connections, and the risk of collisions on single-track lines were growing.\n\n"
"[3] The solution came not from the government but from the railroads themselves. "
"At a meeting in 1883, railroad managers agreed to divide the country into four time zones, each one hour apart. "
"Within each zone, every clock would show the same time.\n\n"
"[4] The change took effect at noon on November 18, 1883. "
"In cities across the country, jewelers and telegraph operators reset their clocks as the signal arrived. "
"Towns in the eastern part of each zone, set their clocks back and so experienced noon twice that day. "
"Newspapers called it \"the day of two noons.\"\n\n"
"[5] Not everyone was pleased. "
"Some towns refused to give up \"God's time,\" as they called solar time, and kept their old clocks for years. "
"Yet within a generation, standard time had become so ordinary that most people forgot it had ever been an invention. "
"Congress did not make the time zones law until 1918, by that time it was simply confirming what the country had been doing for thirty-five years.")
mk(12, "The Day of Two Noons", 'Y', p12, [
 dict(kind='edit', sent="Noon was the moment the sun stood loftiest in the sky, and because the sun appears to move westward, noon in Boston came several minutes before noon in a town to its west.",
      span="loftiest", ask="which choice is most precise in context",
      opts=["highest", "tallest", "steepest"], key="highest",
      exp='The sun\'s position at noon is its greatest height above the horizon: it stands "highest." "Loftiest" and "tallest" describe the size of things like buildings or ideals, not a position in the sky, and "steepest" describes a slope.',
      domain=KoL, sub="word choice", diff="easy"),
 dict(kind='edit', sent="In contrast, a farmer or a shopkeeper rarely needed to know what time it was two hundred miles away.",
      span="In contrast,", ask="which choice provides the most logical transition",
      opts=["After all,", "Still,", "As a result,"], key="After all,",
      exp='The preceding sentence says the differences in local time hardly mattered; this sentence gives the reason. "After all," introduces that explanation. "In contrast" and "Nevertheless" would set the sentence against the one before, and "As a result" would make the farmer\'s needs a consequence of the differences not mattering, which reverses the logic.',
      domain=PoW, sub="transition", diff="hard"),
 dict(kind='edit', sent="A train leaving Chicago passed through dozens of local times on its way east, and each railroad kept their own schedule, usually set by the clock in its headquarters city.",
      span="their own", ask="which choice makes the sentence most grammatically acceptable",
      opts=["its own", "it's own", "his own"], key="its own",
      exp='The pronoun refers to "each railroad," which is singular and not a person, so the possessive is "its." "Their" is plural, "it\'s" means "it is," and "his" refers to a person.',
      domain=CSE, sub="pronoun agreement", diff="easy"),
 dict(kind='other', prompt='The writer is considering deleting the sentence "Stations sometimes displayed several clocks, one for each railroad that stopped there, and all of them were different." from paragraph 2. Should the sentence be kept or deleted?',
      must=["Stations sometimes displayed several clocks, one for each railroad that stopped there, and all of them were different."],
      opts=["Kept, because it shows what the confusion described in the paragraph looked like to a traveler.",
            "Kept, because it explains why Congress waited until 1918 to make the time zones law.",
            "Deleted, because it repeats the earlier statement that a train passed through dozens of local times.",
            "Deleted, because paragraph 1 has already described the clocks that stood in Boston's station."],
      key="Kept, because it shows what the confusion described in the paragraph looked like to a traveler.",
      exp='A station wall with several clocks, all different, makes the general problem concrete before the paragraph turns to missed connections. The sentence says nothing about Congress; a train crossing many local times is a different point from a station showing several railroad times at once; and paragraph 1 mentions noon in Boston but no station clocks.',
      domain=PoW, sub="delete sentence", diff="medium"),
 dict(kind='edit', sent="Travelers missed connections, and the risk of collisions on single-track lines were growing.",
      span="were growing", ask="which choice makes the sentence most grammatically acceptable",
      opts=["grew", "have grown", "grow"], key="grew",
      exp='The subject is "risk," which is singular; "of collisions on single-track lines" only describes it. The verb must be singular and past, matching "missed": "grew." "Were growing" and "have grown" are plural, and "grow" is plural and present.',
      domain=CSE, sub="subject-verb agreement", diff="medium"),
 dict(kind='edit', sent="The solution came not from the government but from the railroads themselves.",
      span="not from the government but from", ask="which choice makes the sentence most grammatically acceptable",
      opts=["not from the government and from", "not from the government but", "neither from the government but from"], key=NC,
      exp='"Not ... but" pairs two parallel phrases, "from the government" and "from the railroads." Using "and" breaks the pairing, dropping the second "from" makes the halves unequal, and "neither" must pair with "nor."',
      domain=CSE, sub="correlative conjunctions", diff="medium"),
 dict(kind='edit', sent="Towns in the eastern part of each zone, set their clocks back and so experienced noon twice that day.",
      span="zone, set", ask="which choice is correctly punctuated",
      opts=["zone set", "zone; set", "zone: set"], key="zone set",
      exp='"Towns in the eastern part of each zone" is the subject and "set" is its verb; no punctuation belongs between them. A comma, a semicolon, or a colon would each cut the subject off from its verb.',
      domain=CSE, sub="unnecessary comma", diff="easy"),
 dict(kind='other', prompt='The writer is considering adding the following sentence after the second sentence of paragraph 5: "Detroit, for example, did not fully adopt standard time until 1905." Should the writer make this addition?',
      opts=["Yes, because it gives a specific case of a town that kept its old clocks for years.",
            "Yes, because it explains why Congress waited until 1918 to make the time zones law.",
            "No, because it contradicts the claim that standard time became ordinary within a generation.",
            "No, because Detroit was one of the cities where jewelers reset their clocks in 1883."],
      key="Yes, because it gives a specific case of a town that kept its old clocks for years.",
      exp='The preceding sentence says some towns held on to solar time for years; Detroit\'s delay until 1905 is an instance of that. Nothing in the sentence concerns Congress, 1905 is still within a generation of 1883, and the essay never says Detroit reset its clocks in 1883.',
      domain=PoW, sub="add sentence", diff="medium"),
 dict(kind='edit', sent="Yet within a generation, standard time had become so ordinary that most people forgot it had ever been an invention.",
      span="had become", ask="which choice makes the sentence most grammatically acceptable",
      opts=["has become", "becomes", "will have become"], key=NC,
      exp='The sentence looks back from the point when people had forgotten to the change that came before it, so the past perfect "had become" is correct. "Has become" and "becomes" shift into the present, and "will have become" shifts into the future.',
      domain=CSE, sub="verb tense", diff="medium"),
 dict(kind='edit', sent="Congress did not make the time zones law until 1918, by that time it was simply confirming what the country had been doing for thirty-five years.",
      span="1918, by that time it", ask="which choice makes the sentence most grammatically acceptable",
      opts=["1918, by which time it", "1918 by that time it", "1918, and by which time it"], key="1918, by which time it",
      exp='As written, two independent clauses are joined by only a comma. "By which time" turns the second into a relative clause attached to "1918." With no punctuation the clauses fuse, and "and by which time" adds a conjunction before a relative clause, which leaves the sentence garbled.',
      domain=CSE, sub="comma splice", diff="hard"),
])
