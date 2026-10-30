from common import *

# ---------------- P3  personal narrative / a summer in a print shop (X 5/3/2) ----------------
p3 = ("[1] The summer I turned sixteen, my cousin Ifeoma found me a job at Benedek Press, a print shop two blocks from our apartment. "
"I pictured myself running a copier and answering the phone. "
"Likewise, Mr. Benedek led me past the copiers to a back room. "
"There, a black iron press, older than my grandmother stood under a single lamp.\n\n"
"[2] He handed me a wooden tray divided in dozens of small compartments, each holding metal letters of one kind. "
"\"Every word you have ever read,\" he said, \"was once built like this.\" "
"For the first week I did nothing but set type I picked letters out of the tray one at a time and lined them up, upside down and backward, in a small metal holder. "
"A single wedding invitation took me most of a morning.\n\n"
"[3] [A] My first proofs were a mess. "
"[B] I had confused the lowercase b and d, which look identical when reversed, and a few letters printed so faint they were barely visible. "
"[C] Mr. Benedek never corrected me himself. "
"[D] He would circle each error in pencil, hand the proof back, and returning to his own work.\n\n"
"[4] By August I could set a line nearly as fast as I could write it, and my proofs came back with fewer circles. "
"The work had changed how I read, too. "
"On cereal boxes and street signs I started to notice the spaces between letters, and the way a heavy letter could crowd a light one. "
"Mr. Benedek called this \"seeing the white.\"\n\n"
"[5] On my last day he printed a card for me on the iron press. "
"He did not say much when he handed it to me. "
"It said only my name, in letters I had set myself. "
"I still keep it in my desk drawer, the ink pressed so deep I can feel each letter with my thumb.")
mk(3, "Seeing the White", 'X', p3, [
 dict(kind='edit', sent="Likewise, Mr. Benedek led me past the copiers to a back room.",
      span="Likewise,", ask="which choice provides the most logical transition",
      opts=["Instead,", "Meanwhile,", "Also,"], key="Instead,",
      exp='The narrator expected to run a copier; Mr. Benedek took the narrator past the copiers to something else. "Instead" marks that replacement of the expectation. "Likewise" and "Also" treat the sentence as adding a similar point, and "Meanwhile" places two separate events side by side in time.',
      domain=PoW, sub="transition", diff="easy"),
 dict(kind='edit', sent="There, a black iron press, older than my grandmother stood under a single lamp.",
      span="grandmother stood", ask="which choice is correctly punctuated",
      opts=["grandmother, stood", "grandmother; stood", "grandmother—stood"], key="grandmother, stood",
      exp='"Older than my grandmother" interrupts the subject and verb and is opened with a comma, so it must close with one. A semicolon would separate the subject "press" from its verb "stood," and a dash cannot close an interruption that a comma opened.',
      domain=CSE, sub="nonessential phrase commas", diff="easy"),
 dict(kind='edit', sent="He handed me a wooden tray divided in dozens of small compartments, each holding metal letters of one kind.",
      span="divided in", ask="which choice is most idiomatic in context",
      opts=["divided into", "divided by", "divided onto"], key="divided into",
      exp='A container is "divided into" compartments; "into" names the parts that result. "Divided in" and "divided onto" are not idiomatic here, and "divided by" would name what does the dividing, not the compartments produced.',
      domain=KoL, sub="idiom", diff="easy"),
 dict(kind='edit', sent="For the first week I did nothing but set type I picked letters out of the tray one at a time and lined them up, upside down and backward, in a small metal holder.",
      span="type I picked", ask="which choice makes the sentence most grammatically acceptable",
      opts=["type: I picked", "type, I picked", "type, so I picked"], key="type: I picked",
      exp='Two independent clauses run together with no punctuation. The second clause explains what setting type meant, so a colon joins them correctly. A comma alone is a comma splice, and "so" presents picking letters as a result of setting type, when it is the setting of type itself.',
      domain=CSE, sub="fused sentence", diff="medium"),
 dict(kind='other', prompt='The writer is considering adding the following sentence after the last sentence of paragraph 2 ("A single wedding invitation took me most of a morning."): "Every letter had to go in upside down and backward." Should the writer make this addition?',
      must=["A single wedding invitation took me most of a morning."],
      opts=["Yes, because it explains why the invitation described in the preceding sentence took so long to set.",
            "Yes, because it explains how the narrator came to confuse the b and the d in paragraph 3.",
            "No, because paragraph 2 has already said that the letters were lined up upside down and backward.",
            "No, because it contradicts paragraph 2's description of how the narrator lined up the letters."],
      key="No, because paragraph 2 has already said that the letters were lined up upside down and backward.",
      exp='The third sentence of paragraph 2 already says the narrator lined the letters up "upside down and backward," so the new sentence only repeats it. Because that detail is already present, the addition explains nothing new about the slow invitation or the b and d, which paragraph 3 explains on its own, and it agrees with paragraph 2 rather than contradicting it.',
      domain=PoW, sub="add sentence", diff="hard"),
 dict(kind='edit', sent="I had confused the lowercase b and d, which look identical when reversed, and a few letters printed so faint they were barely visible.",
      span="faint", ask="which choice makes the sentence most grammatically acceptable",
      opts=["faintly", "fainter", "faintness"], key="faintly",
      exp='The word describes how the letters printed, so it modifies the verb "printed" and must be the adverb "faintly." "Faint" and "fainter" are adjectives, and "faintness" is a noun.',
      domain=CSE, sub="adjective vs adverb", diff="medium"),
 dict(kind='edit', sent="He would circle each error in pencil, hand the proof back, and returning to his own work.",
      span="and returning", ask="which choice makes the sentence most grammatically acceptable",
      opts=["and return", "and had returned", "and would be returning"], key="and return",
      exp='The three actions all follow "would": "would circle," "[would] hand," and "[would] return." Only the base form "return" keeps the series parallel. "Returning" breaks the pattern, "had returned" shifts tense, and "would be returning" repeats "would" in a different form.',
      domain=CSE, sub="parallelism", diff="medium"),
 dict(kind='other', prompt='The writer wants to add the following sentence to paragraph 3: "The faint letters, he explained later, had been worn down by a century of use." The sentence would most logically be placed at:',
      opts=["Point [A].", "Point [B].", "Point [C].", "Point [D]."], key="Point [C].",
      exp='"The faint letters" must come after the sentence that first mentions letters printing faintly, which ends at Point [C]. Placing the sentence at Point [D] would split "Mr. Benedek never corrected me himself" from the sentence explaining what he did instead, and at Points [A] and [B] the faint letters have not been mentioned yet.',
      domain=PoW, sub="sentence placement", diff="medium"),
 dict(kind='edit', sent="On cereal boxes and street signs I started to notice the spaces between letters, and the way a heavy letter could crowd a light one.",
      span="crowd", ask="which choice is most precise in context",
      opts=["echo", "follow", "outlast"], key=NC,
      exp='The sentence is about spacing: the narrator now notices the gaps between letters, and how a heavy letter can press too close to a light one. "Crowd" names that effect on the space between them. A letter that echoes, follows, or outlasts another says nothing about the space between them.',
      domain=KoL, sub="word choice / precision", diff="medium"),
 dict(kind='edit', sent="I still keep it in my desk drawer, the ink pressed so deep I can feel each letter with my thumb.",
      span="drawer, the ink", ask="which choice is correctly punctuated",
      opts=["drawer; the ink", "drawer. The ink", "drawer the ink"], key=NC,
      exp='"The ink pressed so deep I can feel each letter with my thumb" has no main verb ("pressed" is a participle here), so it is an absolute phrase that attaches to the clause with a comma. A semicolon or a period would leave it as a fragment, and no punctuation runs it into "drawer."',
      domain=CSE, sub="phrase vs clause punctuation", diff="hard"),
])

# ---------------- P4  natural science / sea otters and kelp (X 5/3/2) ----------------
p4 = ("[1] Off the coast of Alaska's Aleutian Islands, two kinds of seafloor lie within a short boat ride of each other. "
"Around some islands, forests of kelp rises from the rocks, their golden fronds reaching the surface and sheltering schools of fish. "
"Around others, the bottom is nearly bare, covered with spiny purple sea urchins and little else.\n\n"
"[2] In 1971 a young ecologist named James Estes set out to learn why. "
"He noticed that the islands with kelp forests had large numbers of sea otters, while the bare islands had almost none. "
"Otters eat sea urchins, and sea urchins eat kelp. "
"Where otters were plentiful, he reasoned they kept the urchins in check, and the kelp was free to grow. "
"Where otters were absent, for example, urchins multiplied and grazed the forests down to the rock.\n\n"
"[3] The otters' absence from some islands had a human cause. "
"For more than a century, fur traders had hunted the animals for their pelts, that carry the densest fur of any mammal, about a million hairs in a single square inch. "
"By 1911, when an international treaty finally banned the hunt, only a few small colonies survived. "
"Some islands had been recolonized by the time Estes arrived; others had not.\n\n"
"[4] Estes's idea (an animal at the top of a food chain can shape the plants at it's bottom) is now called a trophic cascade. "
"In the 1990s, it received a routine test. "
"Otter numbers across the Aleutians suddenly crashed, and within a few years urchins had stripped many forests bare. "
"Estes and his colleagues suspected killer whales, which may have begun hunting otters after their usual prey grew scarce.\n\n"
"[5] The story shows how much can depend on a single species. "
"An otter weighs about as much as a large dog, but by eating urchins it protects an entire forest and every creature that lives there.")
mk(4, "The Otter and the Forest", 'X', p4, [
 dict(kind='edit', sent="Around some islands, forests of kelp rises from the rocks, their golden fronds reaching the surface and sheltering schools of fish.",
      span="rises", ask="which choice makes the sentence most grammatically acceptable",
      opts=["rise", "rose", "is rising"], key="rise",
      exp='The subject is "forests," which is plural; "of kelp" only describes it. The verb must be plural and in the present tense, like "lie" and "is" elsewhere in the paragraph: "rise." "Rises" and "is rising" are singular, and "rose" shifts to the past.',
      domain=CSE, sub="subject-verb agreement", diff="medium"),
 dict(kind='other', prompt='The writer is considering deleting the phrase "and sheltering schools of fish" from the second sentence of paragraph 1. Should the phrase be kept or deleted?',
      must=["and sheltering schools of fish"],
      opts=["Kept, because it establishes that the forests support other animals, which the essay's final sentence depends on.",
            "Kept, because it establishes that the forests support other animals, which paragraph 4 depends on when it describes what the otter crash destroyed.",
            "Deleted, because it establishes that the forests support other animals, a point paragraph 2 has already made.",
            "Deleted, because it suggests that otters eat fish, which contradicts paragraph 2's statement that they eat urchins."],
      key="Kept, because it establishes that the forests support other animals, which the essay's final sentence depends on.",
      exp='The essay ends by saying an otter protects "an entire forest and every creature that lives there"; the fish in paragraph 1 are the only creatures besides otters and urchins that the forest is shown to shelter. Paragraph 4 says only that urchins stripped the forests, paragraph 2 never mentions other animals in the kelp, and the phrase says the fronds shelter fish, not that otters eat them.',
      domain=PoW, sub="delete phrase", diff="hard"),
 dict(kind='edit', sent="In 1971 a young ecologist named James Estes set out to learn why.",
      span="set out", ask="which choice is most idiomatic in context",
      opts=["set in", "set up", "set by"], key=NC,
      exp='To "set out" to do something is to begin an effort toward it, which is what Estes did. "Set in" describes something like weather beginning, "set up" means to arrange or establish, and "set by" means to put aside; none of them takes "to learn" this way.',
      domain=KoL, sub="idiom", diff="medium"),
 dict(kind='edit', sent="Where otters were plentiful, he reasoned they kept the urchins in check, and the kelp was free to grow.",
      span="plentiful, he reasoned they", ask="which choice is correctly punctuated",
      opts=["plentiful, he reasoned, they", "plentiful he reasoned, they", "plentiful; he reasoned, they"], key="plentiful, he reasoned, they",
      exp='"He reasoned" is an interrupting phrase between the introductory clause and the main clause, so it is set off by a comma on each side. With only one comma the phrase is half set off, and a semicolon would cut off the introductory "Where" clause, which cannot stand alone.',
      domain=CSE, sub="parenthetical commas", diff="medium"),
 dict(kind='edit', sent="Where otters were absent, for example, urchins multiplied and grazed the forests down to the rock.",
      span="for example,", ask="which choice provides the most logical transition",
      opts=["by contrast,", "as a result,", "in other words,"], key="by contrast,",
      exp='The preceding sentence describes islands where otters were plentiful and kelp grew; this one describes islands without otters, where kelp was destroyed. "By contrast" marks the opposite case. The bare islands are not an example of the kelp islands, not a result of them, and not a restatement of them.',
      domain=PoW, sub="transition", diff="medium"),
 dict(kind='other', prompt="Which choice most effectively introduces paragraph 3?",
      opts=["The otters' absence from some islands had a human cause.",
            "Sea otter fur is the densest of any mammal's.",
            "Urchins, too, had long been harvested around the islands.",
            "Killer whales had preyed on the otters for centuries."],
      key="The otters' absence from some islands had a human cause.",
      exp='Paragraph 3 explains why some islands lacked otters: fur traders hunted them nearly out of existence. A sentence naming a human cause introduces that. The fur\'s density is one detail within the paragraph, urchin harvesting is never mentioned, and paragraph 4 says killer whales may only have begun hunting otters recently.',
      domain=PoW, sub="introduction", diff="medium"),
 dict(kind='edit', sent="For more than a century, fur traders had hunted the animals for their pelts, that carry the densest fur of any mammal, about a million hairs in a single square inch.",
      span="pelts, that carry", ask="which choice makes the sentence most grammatically acceptable",
      opts=["pelts, which carry", "pelts which, carry", "pelts; which carry"], key="pelts, which carry",
      exp='The clause adds information about the pelts and is set off by a comma, so it is nonessential and takes "which," not "that." Moving the comma after "which" splits the pronoun from its verb, and a semicolon cannot introduce a dependent clause.',
      domain=CSE, sub="nonessential clause (which vs that)", diff="medium"),
 dict(kind='edit', sent="Some islands had been recolonized by the time Estes arrived; others had not.",
      span="arrived; others", ask="which choice is correctly punctuated",
      opts=["arrived, others", "arrived, but, others", "arrived others"], key=NC,
      exp='"Some islands had been recolonized by the time Estes arrived" and "others had not" are both independent clauses, and a semicolon joins two closely related independent clauses. A comma alone is a comma splice, no punctuation fuses them, and the comma after "but" separates the conjunction from its clause.',
      domain=CSE, sub="semicolon between clauses", diff="medium"),
 dict(kind='edit', sent="Estes's idea (an animal at the top of a food chain can shape the plants at it's bottom) is now called a trophic cascade.",
      span="it's", ask="which choice makes the sentence most grammatically acceptable",
      opts=["its", "its'", "their"], key="its",
      exp='The word shows that the bottom belongs to the food chain, so it is the possessive "its." "It\'s" means "it is," "its\'" is not a word, and "their" is plural, though "a food chain" is singular.',
      domain=CSE, sub="possessive pronoun", diff="easy"),
 dict(kind='edit', sent="In the 1990s, it received a routine test.",
      span="routine", ask="which choice best fits the context of the paragraph",
      opts=["unexpected", "deliberate", "expensive"], key="unexpected",
      exp='The test was no experiment that anyone planned: otter numbers "suddenly crashed," and the urchins and kelp responded as the idea predicted. "Unexpected" fits that. "Routine" and "deliberate" describe a planned test, and nothing in the paragraph concerns cost.',
      domain=KoL, sub="word choice in context", diff="medium"),
])
