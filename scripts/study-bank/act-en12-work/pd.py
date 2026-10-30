from common import *

# ---------------- P7  biography / Benjamin Banneker (Y 6/3/1) ----------------
p7 = ("[1] In the early 1750s, a young tobacco farmer in Maryland borrowed a pocket watch and took it apart. "
"Benjamin Banneker had never seen a clock up close, but he studied the watch's gears until he understood how they worked. "
"Then, using a pocketknife, larger versions of each gear were carved out of wood. "
"The striking clock he built kept time for the rest of his life.\n\n"
"[2] Banneker's clock made him famous throughout Maryland. "
"His grandmother taught him to read from a Bible, and he attended a small country school for a few winters. "
"In contrast, he taught himself, borrowing books whenever he could. "
"He was especially drawn to mathematics, and he liked to solve the puzzles that travelers brought him.\n\n"
"[3] When Banneker was nearly sixty, a neighbor named George Ellicott lent him several books on astronomy and a telescope. "
"Banneker sat up nights in an orchard watching the stars within a year he could predict eclipses. "
"In 1791 George's cousin Andrew Ellicott, a surveyor hired him to help lay out the boundaries of the new federal capital. "
"For three months Banneker kept the expedition's astronomical clock and recorded the positions of stars, from which the surveyors fixed their location.\n\n"
"[4] That same year Banneker completed an almanac, a yearly book of: tide tables, weather predictions, and the times of sunrise and sunset. "
"He mailed the handwritten pages to Thomas Jefferson, then the secretary of state, with a long letter. "
"Jefferson had written that Black people were less capable than white people. "
"Banneker's letter politely reminded him of the words he had written in the Declaration of Independence, that all men are created equal, and offered the almanac as evidence against his opinion.\n\n"
"[5] Jefferson replied within weeks and forwarded the almanac to a scientific academy in Paris. "
"Banneker published his almanacs every year until 1797, and it sold in several states.")
mk(7, "A Clock Carved from Wood", 'Y', p7, [
 dict(kind='edit', sent="Benjamin Banneker had never seen a clock up close, but he studied the watch's gears until he understood how they worked.",
      span="watch's", ask="which choice is correctly punctuated",
      opts=["watches", "watches'", "watchs'"], key=NC,
      exp='The gears belong to one watch, the one Banneker borrowed, so the singular possessive "watch\'s" is correct. "Watches" is a plain plural with no possession, "watches\'" is the plural possessive, and "watchs\'" is not a form of the word.',
      domain=CSE, sub="possessive", diff="easy"),
 dict(kind='edit', sent="Then, using a pocketknife, larger versions of each gear were carved out of wood.",
      span="larger versions of each gear were carved", ask="which choice makes the sentence most grammatically acceptable",
      opts=["he carved larger versions of each gear", "larger versions of each gear had been carved", "carving larger versions of each gear"], key="he carved larger versions of each gear",
      exp='"Using a pocketknife" must describe the person holding the knife, so the subject right after it must be "he." In the original and in the "had been carved" version, the subject is "larger versions," which could not use a knife. "Carving larger versions of each gear" leaves the sentence with no subject or main verb.',
      domain=CSE, sub="dangling modifier", diff="medium"),
 dict(kind='other', prompt='In paragraph 2, which choice for the first sentence most effectively introduces the paragraph?',
      must=["Banneker's clock made him famous throughout Maryland."],
      opts=["No Change",
            "Banneker was born free in 1731, when most Black Marylanders were enslaved.",
            "Banneker did not learn astronomy until he was nearly sixty.",
            "Banneker's most public act came late in his life, in a letter to a powerful man."],
      key="Banneker was born free in 1731, when most Black Marylanders were enslaved.",
      exp='Paragraph 2 goes back to Banneker\'s beginnings: who taught him to read, his few winters of school, and how he taught himself. A sentence about his birth introduces that. The paragraph says nothing about the clock making him famous; astronomy is the subject of paragraph 3, and the letter is the subject of paragraph 4.',
      domain=PoW, sub="introduction", diff="medium"),
 dict(kind='edit', sent="In contrast, he taught himself, borrowing books whenever he could.",
      span="In contrast,", ask="which choice provides the most logical transition",
      opts=["After that,", "For instance,", "Similarly,"], key="After that,",
      exp='The preceding sentence describes Banneker\'s brief schooling; this one describes what he did once it ended. "After that" marks the sequence. Teaching himself is not opposed to his schooling, not an instance of it, and not similar to being taught by others.',
      domain=PoW, sub="transition", diff="medium"),
 dict(kind='edit', sent="When Banneker was nearly sixty, a neighbor named George Ellicott lent him several books on astronomy and a telescope.",
      span="lent", ask="which choice is most precise in context",
      opts=["borrowed", "owed", "charged"], key=NC,
      exp='Ellicott let Banneker use his books for a time, so Ellicott "lent" them. "Borrowed" would mean Ellicott took them from Banneker, "owed" would mean he was in Banneker\'s debt for them, and "charged" would mean he made Banneker pay.',
      domain=KoL, sub="word choice / usage", diff="easy"),
 dict(kind='other', prompt='The writer is considering deleting the phrase "and a telescope" from the first sentence of paragraph 3. Should the phrase be kept or deleted?',
      must=["and a telescope"],
      opts=["Kept, because it names the instrument Banneker would have needed for the nights described in the next sentence.",
            "Kept, because it names the instrument Banneker used to build the clock described in paragraph 1.",
            "Deleted, because paragraph 1 has already said that Banneker borrowed a telescope.",
            "Deleted, because it is the surveyors' instrument, which the paragraph later says Banneker kept for the expedition."],
      key="Kept, because it names the instrument Banneker would have needed for the nights described in the next sentence.",
      exp='The next sentence has Banneker sitting up nights watching the stars until he could predict eclipses, which is what the telescope was for. The clock in paragraph 1 was built from a borrowed pocket watch, not a telescope; what paragraph 1 says Banneker borrowed is that watch; and what he kept for the surveyors was an astronomical clock.',
      domain=PoW, sub="delete phrase", diff="medium"),
 dict(kind='edit', sent="Banneker sat up nights in an orchard watching the stars within a year he could predict eclipses.",
      span="stars within", ask="which choice makes the sentence most grammatically acceptable",
      opts=["stars, and within", "stars, within", "stars; and, within"], key="stars, and within",
      exp='Two independent clauses run together with no punctuation. A comma with "and" joins them. A comma alone is a comma splice, and a semicolon followed by "and," with a comma after it, misplaces the pause.',
      domain=CSE, sub="fused sentence", diff="medium"),
 dict(kind='edit', sent="In 1791 George's cousin Andrew Ellicott, a surveyor hired him to help lay out the boundaries of the new federal capital.",
      span="Ellicott, a surveyor hired", ask="which choice is correctly punctuated",
      opts=["Ellicott, a surveyor, hired", "Ellicott a surveyor, hired", "Ellicott; a surveyor, hired"], key="Ellicott, a surveyor, hired",
      exp='"A surveyor" is an appositive renaming Andrew Ellicott, so it takes a comma on each side. With only the opening comma, the appositive runs into the verb; with only the closing one, it is half set off; and a semicolon would separate the subject from its verb "hired."',
      domain=CSE, sub="appositive commas", diff="easy"),
 dict(kind='edit', sent="That same year Banneker completed an almanac, a yearly book of: tide tables, weather predictions, and the times of sunrise and sunset.",
      span="book of: tide", ask="which choice is correctly punctuated",
      opts=["book of tide", "book of—tide", "book of; tide"], key="book of tide",
      exp='The list is the object of the preposition "of," and nothing separates a preposition from its object. A colon, a dash, or a semicolon there splits the phrase; a colon may introduce a list only after a complete clause.',
      domain=CSE, sub="colon misuse", diff="medium"),
 dict(kind='edit', sent="Banneker published his almanacs every year until 1797, and it sold in several states.",
      span="it sold", ask="which choice makes the sentence most grammatically acceptable",
      opts=["they sold", "this sold", "which sold"], key="they sold",
      exp='The pronoun refers to "almanacs," which is plural, so it must be "they." "It" and "this" are singular, and "which" after "and" leaves a relative clause with nothing to attach to.',
      domain=CSE, sub="pronoun agreement", diff="easy"),
])

# ---------------- P8  personal narrative / a glassblowing class (X 5/3/2) ----------------
p8 = ("[1] I signed up for the glassblowing class because the brochure showed a row of glowing vases and I doubted I would make one by the end of the first night. "
"Esperanza Ruelas, who ran the studio out of an old garage on the edge of town had other plans. "
"She handed each of us a steel pipe as long as a broom handle and told us we would spend the evening learning to turn it.\n\n"
"[2] Turning, it turned out, was everything. "
"Molten glass is about as thick as honey, and the moment you stop rotating the pipe, gravity starts pulling the gather toward the floor. "
"[A] For two hours we roll empty pipes back and forth along the arms of a metal bench. "
"[B] My wrists ached by nine o'clock. "
"[C] Esperanza walked behind us, saying nothing except, now and then, \"Slower.\" "
"[D] By the end I could keep a pipe spinning without thinking about it.\n\n"
"[3] The second week we finally worked with real glass. "
"Esperanza dipped the end of my pipe into the furnace and drew out a glowing ball no bigger than a plum. "
"I rolled it on a steel table to shape it, reheated it, and blew a short puff of air into the pipe. "
"The ball shrank slightly and wobbled. "
"Then it slid off the end onto the concrete floor, where it laid glowing like a dropped coal.\n\n"
"[4] I expected her to be annoyed. "
"Instead, she knelt, looked at the blob for a moment, and said that I had stopped turning to watch the bubble grow. "
"She was right, I had been so pleased with myself that I had forgotten the one thing I had practiced for two hours.\n\n"
"[5] By the end of the course I had made six lopsided cups and one small bowl that almost sat flat. "
"The bowl holds paper clips on my desk now. "
"Whenever I look at it, I can still feel the weight of the pipe turning in my hands.")
mk(8, "Keep It Turning", 'X', p8, [
 dict(kind='edit', sent="I signed up for the glassblowing class because the brochure showed a row of glowing vases and I doubted I would make one by the end of the first night.",
      span="doubted", ask="which choice best fits the context of the paragraph",
      opts=["assumed", "regretted", "forgot"], key="assumed",
      exp='The narrator signed up "because" of the brochure\'s vases, and the next sentence says the instructor "had other plans," so the narrator must have expected to make a vase quickly. "Assumed" says that. Doubting would not be a reason to sign up, and the narrator could not regret or forget making something that had not happened yet.',
      domain=KoL, sub="word choice in context", diff="medium"),
 dict(kind='edit', sent="Esperanza Ruelas, who ran the studio out of an old garage on the edge of town had other plans.",
      span="town had", ask="which choice is correctly punctuated",
      opts=["town, had", "town; had", "town—had"], key="town, had",
      exp='The clause beginning "who ran the studio" adds information about Esperanza Ruelas and is opened with a comma, so it must close with a comma before the verb "had." A semicolon would cut the subject off from its verb, and a dash cannot close a clause that a comma opened.',
      domain=CSE, sub="nonessential clause commas", diff="easy"),
 dict(kind='other', prompt='The writer is considering adding the following sentence after the first sentence of paragraph 2 ("Turning, it turned out, was everything."): "Glassblowers call the blob of molten glass on the end of the pipe a gather." Should the writer make this addition?',
      must=["Turning, it turned out, was everything."],
      opts=["Yes, because it defines a term that the next sentence uses without explanation.",
            "Yes, because it explains why the narrator's first ball of glass slid off the pipe in paragraph 3.",
            "No, because paragraph 1 has already explained what glassblowers call the glass on the pipe.",
            "No, because it interrupts the paragraph's explanation of why the pipe has to keep turning."],
      key="Yes, because it defines a term that the next sentence uses without explanation.",
      exp='The next sentence says gravity "starts pulling the gather toward the floor," and the essay never says what a gather is; the new sentence defines it just before it is used. It says nothing about why the narrator\'s ball fell, paragraph 1 never mentions the term, and placed before the explanation it prepares the reader for that explanation rather than interrupting it.',
      domain=PoW, sub="add sentence", diff="hard"),
 dict(kind='edit', sent="For two hours we roll empty pipes back and forth along the arms of a metal bench.",
      span="roll", ask="which choice makes the sentence most grammatically acceptable",
      opts=["rolled", "were rolled", "rolls"], key="rolled",
      exp='The narrative is in the past tense ("ached," "walked," "could keep"), so the verb is "rolled." "Roll" shifts to the present, "were rolled" makes the students the things rolled, and "rolls" is singular and present.',
      domain=CSE, sub="verb tense", diff="easy"),
 dict(kind='other', prompt='The writer wants to add the following sentence to paragraph 2: "It was the only correction she gave all night." The sentence would most logically be placed at:',
      opts=["Point [A].", "Point [B].", "Point [C].", "Point [D]."], key="Point [D].",
      exp='"It" must refer to a correction already given, and the only one in the paragraph is Esperanza\'s "Slower," which ends just before Point [D]. At Points [A], [B], and [C] no correction has yet been mentioned, so "It" would have nothing to refer to.',
      domain=PoW, sub="sentence placement", diff="medium"),
 dict(kind='edit', sent="The ball shrank slightly and wobbled.",
      span="shrank", ask="which choice best fits the context of the passage",
      opts=["swelled", "hardened", "darkened"], key="swelled",
      exp='The narrator has just blown air into the pipe, and in paragraph 4 Esperanza says the narrator stopped turning "to watch the bubble grow." The ball must have "swelled." Shrinking is the opposite of growing, and the ball is still "glowing" on the floor, so it had not hardened or darkened.',
      domain=KoL, sub="word choice in context", diff="medium"),
 dict(kind='edit', sent="Then it slid off the end onto the concrete floor, where it laid glowing like a dropped coal.",
      span="laid", ask="which choice makes the sentence most grammatically acceptable",
      opts=["lay", "lain", "has laid"], key="lay",
      exp='The ball rested on the floor; it did not put anything down. The past tense of "lie" (to rest) is "lay." "Laid" and "has laid" are forms of "lay," which takes an object, and "lain" is a participle that needs a helping verb.',
      domain=CSE, sub="lie vs lay", diff="hard"),
 dict(kind='edit', sent="Instead, she knelt, looked at the blob for a moment, and said that I had stopped turning to watch the bubble grow.",
      span="Instead,", ask="which choice provides the most logical transition",
      opts=["Likewise,", "Therefore,", "For example,"], key=NC,
      exp='The narrator expected Esperanza to be annoyed; she calmly knelt and explained the mistake. "Instead" marks that her reaction replaced the expected one. "Likewise" and "For example" treat the calm reaction as matching or illustrating annoyance, and "Therefore" makes it a result of the narrator\'s expectation.',
      domain=PoW, sub="transition", diff="easy"),
 dict(kind='edit', sent="She was right, I had been so pleased with myself that I had forgotten the one thing I had practiced for two hours.",
      span="right, I had", ask="which choice makes the sentence most grammatically acceptable",
      opts=["right. I had", "right I had", "right, but I had"], key="right. I had",
      exp='"She was right" and "I had been so pleased with myself..." are independent clauses joined by a comma alone, a comma splice. A period separates them. With no punctuation the clauses run together, and "but" signals a contrast, though the second clause confirms that she was right.',
      domain=CSE, sub="comma splice", diff="medium"),
 dict(kind='edit', sent="Whenever I look at it, I can still feel the weight of the pipe turning in my hands.",
      span="it, I can", ask="which choice is correctly punctuated",
      opts=["it; I can", "it. I can", "it I, can"], key=NC,
      exp='"Whenever I look at it" is an introductory dependent clause, and a comma separates it from the main clause. A semicolon or a period would leave the dependent clause standing alone as a fragment, and the comma after "I" splits the subject from its verb.',
      domain=CSE, sub="introductory clause comma", diff="easy"),
])
