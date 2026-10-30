from common import *

# ---------------- P3  literary narrative, first person past (X 5/3/2) ----------------
p3 = ("[1] The summer I turned sixteen, I took a job at Delgado Hardware a narrow shop wedged between a laundromat and a shoe-repair stand. "
"On my first morning, Mr. Delgado handed me a canvas apron and pointed at the key-cutting machine in the back corner. "
"\"That,\" he said, \"is the most important machine in the store.\"\n\n"
"[2] I thought he was joking. "
"The machine looked like a greasy vise bolted to a grinding wheel, and it accomplished only one feat. "
"A customer handed me a key; I clamped it beside a blank, and a metal guide traced the old key's ridges while the wheel cut the same shape into the new one. "
"The whole process took about forty seconds.\n\n"
"[3] For the first week I cut keys badly. "
"Some came out with burrs so sharp they snagged the lining of a pocket, and others turned stiffly in the lock or not at all. "
"Mr. Delgado never scolds me. "
"Therefore, he would take each failed key, run his thumb along its edge, and hand it back without a word, and I would try again.\n\n"
"[4] By August I had cut hundreds of keys, and I had started to notice who needed them. "
"A woman whose husband had just moved out wanted three copies, one for each of her children. "
"A college student bought a key to his first apartment and held it up to the light as if it were a medal. "
"An elderly man asked for a spare because he kept locking himself out, and he laughed about it, but his hands shook as he paid.\n\n"
"[5] On my last day Mr. Delgado asked me whether I finally understood about the machine. "
"I told him I did. "
"A key, I had learned, rarely just a piece of metal. "
"It is usually a sign that something in someone's life is beginning, ending, or getting harder to manage, and for forty seconds at a time I had been part of it.")
mk(3, "Forty Seconds", 'X', p3, [
 dict(kind='edit', sent="The summer I turned sixteen, I took a job at Delgado Hardware a narrow shop wedged between a laundromat and a shoe-repair stand.",
      span="Hardware a narrow", ask="which choice is correctly punctuated",
      opts=["Hardware, a narrow", "Hardware; a narrow", "Hardware, that was a narrow"], key="Hardware, a narrow",
      exp='"A narrow shop wedged between a laundromat and a shoe-repair stand" is an appositive renaming Delgado Hardware, and it is set off from the clause with a comma. A semicolon would need an independent clause after it; "that" is not used after a comma to add information about a named place; and with no punctuation the store name runs into its description.',
      domain=CSE, sub="appositive comma", diff="easy"),
 dict(kind='edit', sent="The machine looked like a greasy vise bolted to a grinding wheel, and it accomplished only one feat.",
      span="accomplished only one feat", ask="which choice best fits the context of the paragraph",
      opts=["did only one thing", "achieved only one triumph", "did one wonder"], key="did only one thing",
      exp='The narrator has just said he thought Mr. Delgado was joking and describes the machine as a "greasy vise"; he finds it dull. "Did only one thing" carries that flat judgment. "Feat," "triumph," and "marvel" all present the machine\'s work as impressive, which is the opposite of what the narrator believed at the time.',
      domain=KoL, sub="word choice in context", diff="medium"),
 dict(kind='edit', sent="A customer handed me a key; I clamped it beside a blank, and a metal guide traced the old key's ridges while the wheel cut the same shape into the new one.",
      span="key; I clamped", ask="which choice is correctly punctuated",
      opts=["key, I clamped", "key I clamped", "key, and, I clamped"], key=NC,
      exp='"A customer handed me a key" and "I clamped it beside a blank" are independent clauses, and the semicolon joins them correctly. A comma alone makes a comma splice, no punctuation fuses them, and the comma after "and" separates the conjunction from its clause.',
      domain=CSE, sub="semicolon", diff="medium"),
 dict(kind='other', prompt='The writer is considering deleting the sentence "The whole process took about forty seconds." from the end of paragraph 2. Should the sentence be kept or deleted?',
      must=["The whole process took about forty seconds."],
      opts=["Kept, because it sets up the phrase \"for forty seconds at a time\" in paragraph 5.",
            "Kept, because it explains why the narrator's keys snagged pockets and stuck in locks during the first week.",
            "Deleted, because it repeats the description of the guide and the wheel given in the sentence before it.",
            "Deleted, because paragraph 3 shows that many keys took several tries."],
      key="Kept, because it sets up the phrase \"for forty seconds at a time\" in paragraph 5.",
      exp='The essay\'s last sentence says that "for forty seconds at a time" the narrator had been part of customers\' lives; that phrase depends on this sentence for its meaning. The time does not explain the badly cut keys, the sentence before describes the mechanism but not its duration, and the retries in paragraph 3 do not make the usual time irrelevant.',
      domain=PoW, sub="delete sentence", diff="medium"),
 dict(kind='edit', sent="Mr. Delgado never scolds me.",
      span="never scolds", ask="which choice makes the sentence most grammatically acceptable",
      opts=["never scolded", "will never scold", "never scold"], key="never scolded",
      exp='The narrative is told in the past tense ("For the first week I cut keys badly"), so the verb must be past: "never scolded." The present "scolds," the future "will never scold," and the progressive "never scold" all break that sequence.',
      domain=CSE, sub="verb tense", diff="easy"),
 dict(kind='edit', sent="Therefore, he would take each failed key, run his thumb along its edge, and hand it back without a word, and I would try again.",
      span="Therefore,", ask="which choice provides the most logical transition",
      opts=["Instead,", "Also,", "Moreover,"], key="Instead,",
      exp='The preceding sentence says what Mr. Delgado did not do (scold); this sentence says what he did in its place. "Instead," marks that substitution. "Therefore" makes the silent handing-back a result of not scolding, and "Likewise" and "Moreover" add the gesture as a further item of the same kind.',
      domain=PoW, sub="transition", diff="medium"),
 dict(kind='edit', sent="A woman whose husband had just moved out wanted three copies, one for each of her children.",
      span="whose", ask="which choice makes the sentence most grammatically acceptable",
      opts=["who's", "who", "whom"], key=NC,
      exp='The relative pronoun shows that the husband belongs to the woman, so the possessive "whose" is needed. "Who\'s" means "who is" or "who has"; "who" and "whom" are not possessive and leave "husband" without a link to the sentence.',
      domain=CSE, sub="relative pronoun", diff="easy"),
 dict(kind='other', prompt="This question asks about the essay as a whole. Suppose the writer's primary purpose had been to describe how a summer job changed a teenager's sense of the people it served. Would this essay accomplish that purpose?",
      opts=["Yes, because it shows the narrator coming to see what new keys meant to customers.",
            "Yes, because it explains in detail how a key-cutting machine copies the ridges of an old key.",
            "No, because it focuses on Mr. Delgado's silent teaching.",
            "No, because it describes only the narrator's mistakes during the first week on the job."],
      key="Yes, because it shows the narrator coming to see what new keys meant to customers.",
      exp='The narrator begins by thinking the machine trivial and ends by seeing each key as a sign of a change in a customer\'s life, which is exactly that purpose. The mechanism takes one sentence, Mr. Delgado\'s silence is one paragraph, and the first week\'s mistakes are followed by August\'s observations.',
      domain=PoW, sub="essay purpose", diff="easy"),
 dict(kind='edit', sent="A key, I had learned, rarely just a piece of metal.",
      span="rarely just", ask="which choice makes the sentence most grammatically acceptable",
      opts=["is rarely just", "being rarely just", "that is rarely just"], key="is rarely just",
      exp='As written, the sentence has a subject ("A key") but no main verb, so it is a fragment. "Is rarely just" supplies one. "Being" is a participle, not a main verb, and "that is" turns the rest into a clause modifying "key," so the sentence still lacks a main verb.',
      domain=CSE, sub="sentence fragment", diff="medium"),
 dict(kind='edit', sent="It is usually a sign that something in someone's life is beginning, ending, or getting harder to manage, and for forty seconds at a time I had been part of it.",
      span="sign", ask="which choice is most precise in context",
      opts=["symptom", "omen", "signal flare"], key=NC,
      exp='A new key indicates a change already under way in a customer\'s life; "sign" says that without adding anything. "Symptom" suggests an illness, "omen" suggests a warning about the future, and "signal flare" suggests a call for rescue; none fits a key cut for a new apartment or a newly separated family.',
      domain=KoL, sub="word choice", diff="medium"),
])

# ---------------- P4  social science / urban planning (X 5/3/2) ----------------
p4 = ("[1] Walk across almost any college campus and you will find them: narrow strips of bare dirt cutting diagonally across the lawns. "
"Planners call these trails \"desire lines\" or \"desire paths.\" No one designs them. "
"They appear because hundreds of people, each acting alone, decide that the paved walkway takes too long and step onto the grass. "
"The next person sees the flattened strip and follows it.\n\n"
"[2] [A] For decades, the usual response was to fight them. "
"Groundskeepers put up fences, planted hedges, and posted signs asking people to stay on the walkways. [B] "
"As a result, these measures rarely worked for long. [C] "
"A fence would be stepped over and a hedge trampled. [D] "
"Within a season the dirt line would return, often in exactly the same place.\n\n"
"[3] Some planners have taken the identical approach. "
"Rather than deciding in advance where people should walk, they wait to see where people actually do. "
"At a few universities, new lawns have been left unpaved for a year after construction. "
"Once the desire paths have formed, workers pave them the result is a network of walkways that matches how the campus is really used.\n\n"
"[4] The idea has spread beyond campuses. "
"City officials in several countries has studied desire paths in parks and around transit stations, treating each worn trail as a kind of vote for a route that no one planned. "
"A path that cuts behind a bus shelter for instance, may reveal that the official crossing is too far from the stop.\n\n"
"[5] Desire paths are not always a sign of poor design. "
"Sometimes a shortcut damages tree roots or crossing a slope that erodes easily, and a barrier is the right answer. "
"But planners who read them carefully have learned something useful. "
"The people who use a space every day often know it better than the people who drew it.")
mk(4, "Paths Nobody Drew", 'X', p4, [
 dict(kind='edit', sent="Walk across almost any college campus and you will find them: narrow strips of bare dirt cutting diagonally across the lawns.",
      span="them: narrow", ask="which choice is correctly punctuated",
      opts=["them; narrow", "them. Narrow", "them narrow"], key=NC,
      exp='The colon follows a complete clause and introduces what "them" refers to. A semicolon or a period would leave "narrow strips of bare dirt cutting diagonally across the lawns," which has no main verb, standing as a fragment, and with no punctuation "them" runs into the phrase that explains it.',
      domain=CSE, sub="colon", diff="medium"),
 dict(kind='edit', sent="As a result, these measures rarely worked for long.",
      span="As a result,", ask="which choice provides the most logical transition",
      opts=["However,", "Similarly,", "Also,"], key="However,",
      exp='The preceding sentence lists the fences, hedges, and signs put up to stop the trails; this sentence says they failed. "However," marks that turn. "As a result" makes the measures cause their own failure, "Similarly" makes the failure one more measure of the same kind, and "In other words" treats the failure as a restatement of the list.',
      domain=PoW, sub="transition", diff="easy"),
 dict(kind='other', prompt='The writer wants to add the following sentence to paragraph 2: "The signs fared no better." The sentence would most logically be placed at:',
      opts=["Point [A].", "Point [B].", "Point [C].", "Point [D]."], key="Point [D].",
      exp='"Fared no better" needs something already shown to fail on its own, and the sentence just before Point [D] describes the fence stepped over and the hedge trampled; the signs then complete the three measures in the order the paragraph introduced them, before the last sentence describes the trail returning. At Points [A] and [B] nothing has yet failed, and at Point [C] the signs would be singled out right after a sentence that already covers all the measures together and before the fence and the hedge are described.',
      domain=PoW, sub="sentence placement", diff="medium"),
 dict(kind='edit', sent="Some planners have taken the identical approach.",
      span="identical", ask="which choice best fits the context of the essay",
      opts=["opposite", "customary", "stricter"], key="opposite",
      exp='Paragraph 2 describes fighting desire paths with fences and hedges; paragraph 3 describes waiting for the paths to form and then paving them. That is the "opposite" approach. "Identical" and "customary" would say these planners do what groundskeepers had always done, and "stricter" would make them fight the paths harder.',
      domain=KoL, sub="word choice in context", diff="easy"),
 dict(kind='edit', sent="Once the desire paths have formed, workers pave them the result is a network of walkways that matches how the campus is really used.",
      span="pave them the result is", ask="which choice makes the sentence most grammatically acceptable",
      opts=["pave them, and the result is", "pave them, the result is", "pave them; and, the result is"], key="pave them, and the result is",
      exp='"Workers pave them" and "the result is a network of walkways" are independent clauses fused with no punctuation. A comma with "and" joins them. A comma alone is a comma splice, and a semicolon followed by "and," with a comma after the conjunction, is not a standard way to join them.',
      domain=CSE, sub="fused sentence", diff="medium"),
 dict(kind='edit', sent="City officials in several countries has studied desire paths in parks and around transit stations, treating each worn trail as a kind of vote for a route that no one planned.",
      span="has studied", ask="which choice makes the sentence most grammatically acceptable",
      opts=["have studied", "has been studying", "studies"], key="have studied",
      exp='The subject is "officials," which is plural; "in several countries" only describes them. The verb must be plural: "have studied." "Has" and "has been" are singular, and "studies" leaves the sentence with no main verb.',
      domain=CSE, sub="subject-verb agreement", diff="easy"),
 dict(kind='edit', sent="A path that cuts behind a bus shelter for instance, may reveal that the official crossing is too far from the stop.",
      span="shelter for instance, may", ask="which choice is correctly punctuated",
      opts=["shelter, for instance, may", "shelter, for instance may", "shelter for instance may"], key="shelter, for instance, may",
      exp='"For instance" interrupts the sentence between its subject and verb, so it takes a comma on each side. The original and the next choice each supply only one comma of the pair, and with no commas the interrupter is not set off at all.',
      domain=CSE, sub="parenthetical commas", diff="medium"),
 dict(kind='edit', sent="Sometimes a shortcut damages tree roots or crossing a slope that erodes easily, and a barrier is the right answer.",
      span="crossing", ask="which choice makes the sentence most grammatically acceptable",
      opts=["crosses", "crossed", "having crossed"], key="crosses",
      exp='"Damages" and the second verb are joined by "or," so they must be in the same form: "damages tree roots or crosses a slope." "Crossing" and "having crossed" are participles, and "crossed" shifts out of the present tense the paragraph uses.',
      domain=CSE, sub="parallel verbs", diff="medium"),
 dict(kind='edit', sent="But planners who read them carefully have learned something useful.",
      span="read", ask="which choice is most precise in context",
      opts=["skim", "proofread", "browse"], key=NC,
      exp='The essay treats each worn trail as a message about where people walk, and planners who interpret that message "read" it. "Skim" and "browse" mean looking over something quickly, which contradicts "carefully," and "proofread" means checking a text for errors, which is not what the planners do.',
      domain=KoL, sub="word choice", diff="medium"),
 dict(kind='other', prompt="This question asks about the essay as a whole. Suppose the writer's primary purpose had been to argue that cities should stop building paved walkways until people have chosen their own routes. Would this essay accomplish that purpose?",
      opts=["Yes, because it reports that some universities leave new lawns unpaved for a year before paving the trails that form.",
            "Yes, because it presents worn trails as votes for routes that city officials failed to plan.",
            "No, because it presents waiting to pave as one practice and grants that barriers are sometimes right.",
            "No, because it argues that fences and hedges remain the most reliable way to protect a lawn."],
      key="No, because it presents waiting to pave as one practice and grants that barriers are sometimes right.",
      exp='The essay reports what some planners do and ends by granting that desire paths are not always a sign of poor design; it never calls for cities to stop paving. The year-long wait happens only "at a few universities," the vote image explains what officials learn, and the essay says fences and hedges rarely worked.',
      domain=PoW, sub="essay purpose", diff="hard"),
])
