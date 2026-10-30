from common import *

# ---------------- P5  history (Y 6/3/1) ----------------
p5 = ("[1] In the summer of 1858, London baked under some of the hottest weather anyone could remember, and the River Thames began to stink. "
"For centuries the city had emptied its waste into the river, and by the 1850s, when the city had more than two million residents, the Thames was little more than an open sewer. "
"As the water warmed, the smell grew so powerful that newspapers called it the Great Stink.\n\n"
"[2] The stench reached even the Houses of Parliament, which stand on the riverbank. "
"Workers hung curtains soaked in chemicals over the windows, but lawmakers still fled the committee rooms with handkerchiefs pressed to their faces. "
"Within weeks, Parliament approves a plan it has been putting off for years.\n\n"
"[3] The plan belonged to Joseph Bazalgette, chief engineer of the citys' Metropolitan Board of Works. "
"He proposed a network of large brick sewers running alongside the Thames that would catch the waste before it reached the river and carry it miles to the east, where it could be liberated on the outgoing tide. "
"Bazalgette, whom colleagues knew for his caution, worked out how wide each pipe needed to be and then doubled the figure, reasoning that the job would be done only once.\n\n"
"[4] Most Londoners of the time believed that diseases such as cholera spread through foul air, and Bazalgette's sewers were built to remove a smell. "
"For example, they had an effect that no one had planned. "
"Waste no longer flowed into the river where much of the city drew its drinking water from, and cholera, which had killed tens of thousands of Londoners in earlier outbreaks, largely disappeared. "
"The last major outbreak, in 1866, struck a district that had not yet been connected to the new system.\n\n"
"[5] Much of Bazalgette's network is still in use, in recent years London has built a new tunnel beneath the Thames to handle the overflow from a city far larger than the one he planned for.")
mk(5, "The Great Stink", 'Y', p5, [
 dict(kind='edit', sent="For centuries the city had emptied its waste into the river, and by the 1850s, when the city had more than two million residents, the Thames was little more than an open sewer.",
      span="1850s, when the city had more than two million residents, the Thames", ask="which choice is correctly punctuated",
      opts=["1850s when the city had more than two million residents, the Thames", "1850s, when the city had more than two million residents the Thames", "1850s; when the city had more than two million residents, the Thames"],
      key=NC,
      exp='The clause "when the city had more than two million residents" interrupts the main clause and adds information about "the 1850s," so it is set off by a comma on each side. Dropping either comma leaves it half enclosed, and a semicolon cannot come before a dependent clause.',
      domain=CSE, sub="nonessential clause commas", diff="medium"),
 dict(kind='edit', sent="Within weeks, Parliament approves a plan it has been putting off for years.",
      span="approves a plan it has been putting off", ask="which choice makes the sentence most grammatically acceptable",
      opts=["approved a plan it had been putting off", "approved a plan it has been putting off", "had approved a plan it is putting off"],
      key="approved a plan it had been putting off",
      exp='The essay narrates 1858 in the past tense, so the main verb is "approved," and the putting off happened before the approval, so it takes the past perfect "had been putting off." The original is in the present; pairing "approved" with "has been" places the delay in the present; and "had approved ... is putting off" reverses the order of events.',
      domain=CSE, sub="verb tense sequence", diff="hard"),
 dict(kind='edit', sent="The plan belonged to Joseph Bazalgette, chief engineer of the citys' Metropolitan Board of Works.",
      span="citys'", ask="which choice makes the sentence most grammatically acceptable",
      opts=["city's", "cities", "cities'"], key="city's",
      exp='The board belongs to one city, London, so the singular possessive "city\'s" is needed. "Citys\'" is not a word, "cities" is a plural with no possessive, and "cities\'" is the plural possessive.',
      domain=CSE, sub="possessive", diff="easy"),
 dict(kind='edit', sent="He proposed a network of large brick sewers running alongside the Thames that would catch the waste before it reached the river and carry it miles to the east, where it could be liberated on the outgoing tide.",
      span="liberated", ask="which choice is most precise in context",
      opts=["released", "emancipated", "saved"], key="released",
      exp='Waste let out into the river on the tide is simply "released." "Liberated" and "emancipated" mean freed from captivity or oppression, and "acquitted" means declared not guilty; each treats sewage as if it were a person.',
      domain=KoL, sub="word choice", diff="easy"),
 dict(kind='edit', sent="Bazalgette, whom colleagues knew for his caution, worked out how wide each pipe needed to be and then doubled the figure, reasoning that the job would be done only once.",
      span="whom", ask="which choice makes the sentence most grammatically acceptable",
      opts=["who", "whose", "which"], key=NC,
      exp='Within the clause, "colleagues" is the subject and the pronoun is the object of "knew" (colleagues knew him), so the object form "whom" is correct. "Who" is the subject form, "whose" is possessive, and "which" does not refer to people.',
      domain=CSE, sub="who/whom", diff="hard"),
 dict(kind='other', prompt='The writer is considering adding the following sentence after the first sentence of paragraph 4: "A few doctors disagreed; one had traced an 1854 outbreak to a single contaminated water pump." Should the writer make this addition?',
      opts=["Yes, because it introduces the idea, confirmed later in the paragraph, that cholera spread through water.",
            "Yes, because it explains why Parliament approved Bazalgette's plan within weeks of the Great Stink.",
            "No, because it contradicts the paragraph's statement that the sewers were built to remove a smell.",
            "No, because the paragraph is concerned only with the outbreak of 1866 and not with any of the earlier ones."],
      key="Yes, because it introduces the idea, confirmed later in the paragraph, that cholera spread through water.",
      exp='The paragraph goes on to show that cholera disappeared once waste stopped reaching the drinking water, which is what the dissenting doctors claimed; the sentence prepares that point. Parliament acted because of the smell, not a pump; the sentence does not deny that the sewers were built for the smell; and the paragraph mentions earlier outbreaks that killed tens of thousands.',
      domain=PoW, sub="add sentence", diff="hard"),
 dict(kind='edit', sent="For example, they had an effect that no one had planned.",
      span="For example,", ask="which choice provides the most logical transition",
      opts=["Nevertheless,", "Similarly,", "Specifically,"], key="Nevertheless,",
      exp='The sewers were built for one purpose, removing a smell, and this sentence says they achieved something else. "Nevertheless," marks that turn from intention to unexpected result. "For example" and "Specifically" would make the unplanned effect an instance or detail of removing the smell, and "Similarly" would make it a parallel case.',
      domain=PoW, sub="transition", diff="medium"),
 dict(kind='edit', sent="Waste no longer flowed into the river where much of the city drew its drinking water from, and cholera, which had killed tens of thousands of Londoners in earlier outbreaks, largely disappeared.",
      span="where much of the city drew its drinking water from", ask="which choice makes the sentence most grammatically acceptable",
      opts=["from which much of the city drew its drinking water", "which much of the city drew its drinking water from it", "of which much of the city drew its drinking water"],
      key="from which much of the city drew its drinking water",
      exp='The relative clause needs the preposition "from" attached to "which": the city drew water from the river. The original doubles up "where" and "from," the version ending "from it" repeats the river as "it," and "of which" uses the wrong preposition for drawing water.',
      domain=CSE, sub="relative clause with preposition", diff="hard"),
 dict(kind='edit', sent="Much of Bazalgette's network is still in use, in recent years London has built a new tunnel beneath the Thames to handle the overflow from a city far larger than the one he planned for.",
      span="use, in recent years", ask="which choice makes the sentence most grammatically acceptable",
      opts=["use. In recent years,", "use, nevertheless in recent years", "use, which in recent years"], key="use. In recent years,",
      exp='"Much of Bazalgette\'s network is still in use" and "London has built a new tunnel" are independent clauses joined by only a comma. A period separates them. With no punctuation they run together, and "which" turns the second half into a clause with two subjects and no clear link to "use."',
      domain=CSE, sub="comma splice", diff="medium"),
 dict(kind='other', prompt="The writer wants to add a sentence at the end of the essay that returns to a specific detail from paragraph 3. Which choice best accomplishes this goal?",
      opts=["Had he not doubled the width of every pipe, his sewers would have been overwhelmed long ago.",
            "The river that once drove lawmakers from their committee rooms has long since stopped smelling.",
            "The disease that his sewers drove from the city has not troubled London on that scale since.",
            "Summers in London still bring heat waves, but none has produced another Great Stink."],
      key="Had he not doubled the width of every pipe, his sewers would have been overwhelmed long ago.",
      exp='Paragraph 3 reports that Bazalgette doubled the figure he calculated for each pipe; this sentence connects that decision to the old network still coping with a far larger city. The other choices recall the lawmakers in paragraph 2, the cholera in paragraph 4, and the summer heat in paragraph 1.',
      domain=PoW, sub="conclusion", diff="medium"),
])

# ---------------- P6  humanities / puzzle history (X 5/3/2) ----------------
p6 = ("[1] On December 21, 1913, readers of the New York World found something new in the paper's Sunday supplement: a diamond-shaped grid of empty squares with a list of numbered clues beneath it. "
"Its creator, a Liverpool-born journalist named Arthur Wynne, called it a \"Word-Cross.\" "
"Within a few weeks, a typesetting mix-up had reversed the name, and the puzzle has been a crossword ever since.\n\n"
"[2] For a decade, a period of ten years, the World was nearly the only paper to print one. "
"Then, in 1924, a young publishing firm called Simon & Schuster released a book of crosswords; its first title. "
"The book sold hundreds of thousands of copies, and a craze followed. "
"Bands recorded songs about crosswords, and one railroad reportedly placed dictionaries in its passenger cars for puzzling travelers. "
"Dictionaries flew off store shelves, and libraries complained that puzzle solvers were sharing their reference books.\n\n"
"[3] Not everyone was charmed. "
"For example, the New York Times dismissed the crossword as a \"sinful waste\" of time. "
"The paper eventually changed its mind, in 1942 it began running a Sunday puzzle, edited by a woman named Margaret Farrar. "
"She would hold the job for more than twenty-five years.\n\n"
"[4] Farrar shaped the crossword more than anyone since Wynne. "
"She required symmetrical grids, words of at least three letters, and for clues to be fair as well as clever. "
"Her rules, along with her habit of testing every clue on a second solver, is still followed by most American puzzle editors.\n\n"
"[5] A century after Wynne's diamond, the crossword appears in hundreds of newspapers and on millions of phones. "
"Its basic appeal has changed little since 1913. "
"A good clue misleads without lying: \"Bark,\" for instance, may point to a dog or to a tree. "
"The pleasure of solving lies in the moment when a clue that seemed impossible suddenly makes sense.")
mk(6, "Word-Cross", 'X', p6, [
 dict(kind='edit', sent="On December 21, 1913, readers of the New York World found something new in the paper's Sunday supplement: a diamond-shaped grid of empty squares with a list of numbered clues beneath it.",
      span="paper's", ask="which choice makes the sentence most grammatically acceptable",
      opts=["papers", "papers'", "paper is"], key=NC,
      exp='The supplement belongs to one paper, the World, so the singular possessive "paper\'s" is correct. "Papers" is a plural with no possessive, "papers\'" is the plural possessive, and "paper is" inserts a verb that breaks the sentence.',
      domain=CSE, sub="possessive", diff="easy"),
 dict(kind='edit', sent="For a decade, a period of ten years, the World was nearly the only paper to print one.",
      span="For a decade, a period of ten years,", ask="which choice is the most concise version that keeps the meaning of the sentence",
      opts=["For a decade,", "Decade-long,", "For a decade of ten years,"], key="For a decade,",
      exp='"A period of ten years" only defines "a decade," so it repeats it. "For a decade," keeps the exact length of time. "Decade-long" is an adjective with nothing to modify, and "a decade of ten years" keeps the repetition.',
      domain=KoL, sub="concision", diff="medium"),
 dict(kind='edit', sent="Then, in 1924, a young publishing firm called Simon & Schuster released a book of crosswords; its first title.",
      span="crosswords; its first title.", ask="which choice is correctly punctuated",
      opts=["crosswords, its first title.", "crosswords. Its first title.", "crosswords, it was its first title."], key="crosswords, its first title.",
      exp='"Its first title" is an appositive renaming the book, not an independent clause, so it follows a comma. A semicolon must join two independent clauses, a period leaves "Its first title." as a fragment, and "it was its first title" makes a comma splice.',
      domain=CSE, sub="appositive vs clause", diff="medium"),
 dict(kind='edit', sent="Dictionaries flew off store shelves, and libraries complained that puzzle solvers were sharing their reference books.",
      span="sharing", ask="which choice best fits the context of the sentence",
      opts=["monopolizing", "consulting", "recommending"], key="monopolizing",
      exp='Libraries "complained," so the solvers were doing something that kept the books from other readers: "monopolizing" them. Sharing, consulting, and borrowing reference books are what a library exists for, and none would give it cause to complain.',
      domain=KoL, sub="word choice in context", diff="medium"),
 dict(kind='edit', sent="For example, the New York Times dismissed the crossword as a \"sinful waste\" of time.",
      span="For example,", ask="which choice provides the most logical transition",
      opts=["Nevertheless,", "As a result,", "Similarly,"], key=NC,
      exp='The preceding sentence says not everyone was charmed; the Times\'s dismissal is one case of that. "For example," marks it as an instance. "Nevertheless" would set the dismissal against the lack of charm, "As a result" would make it a consequence of that lack, and "Similarly" would compare it with an earlier example that the paragraph does not give.',
      domain=PoW, sub="transition", diff="easy"),
 dict(kind='edit', sent="The paper eventually changed its mind, in 1942 it began running a Sunday puzzle, edited by a woman named Margaret Farrar.",
      span="mind, in 1942 it", ask="which choice makes the sentence most grammatically acceptable",
      opts=["mind; in 1942 it", "mind in 1942 it", "mind, in 1942, it"], key="mind; in 1942 it",
      exp='"The paper eventually changed its mind" and "in 1942 it began running a Sunday puzzle" are independent clauses. A semicolon joins them. The original is a comma splice, no punctuation fuses them, and adding a comma after "1942" leaves the comma splice in place.',
      domain=CSE, sub="comma splice", diff="medium"),
 dict(kind='other', prompt="Which choice most effectively introduces paragraph 4?",
      opts=["Farrar shaped the crossword more than anyone since Wynne.",
            "Farrar had already worked at the Times for years before it ran a puzzle.",
            "The Times later ran daily puzzles.",
            "Wynne's diamond-shaped grid was soon replaced by a square one."],
      key="Farrar shaped the crossword more than anyone since Wynne.",
      exp='Paragraph 4 lists the rules Farrar set and notes that most editors still follow them; a sentence claiming she shaped the crossword more than anyone since Wynne states exactly what those details support. Her earlier employment, the Times\'s weekday puzzles, and the shape of Wynne\'s grid are not discussed in the paragraph.',
      domain=PoW, sub="introduction", diff="medium"),
 dict(kind='edit', sent="She required symmetrical grids, words of at least three letters, and for clues to be fair as well as clever.",
      span="and for clues to be fair", ask="which choice makes the sentence most grammatically acceptable",
      opts=["and clues that were fair", "and that the clues were fair", "and having clues be fair"], key="and clues that were fair",
      exp='The verb "required" takes three objects in a series, and the first two are nouns ("grids," "words"); the third must also be a noun: "clues that were fair as well as clever." The original, "that the clues were fair," and "having clues be fair" each switch to a different structure.',
      domain=CSE, sub="parallelism", diff="medium"),
 dict(kind='edit', sent="Her rules, along with her habit of testing every clue on a second solver, is still followed by most American puzzle editors.",
      span="is still followed", ask="which choice makes the sentence most grammatically acceptable",
      opts=["are still followed", "was still followed", "has still been followed"], key="are still followed",
      exp='The subject is "rules," which is plural; a phrase beginning "along with" does not change the number of the subject. The verb must be plural and present, since editors follow the rules today: "are still followed." The other choices are singular.',
      domain=CSE, sub="subject-verb agreement", diff="medium"),
 dict(kind='other', prompt="The writer is considering deleting the words \"'Bark,' for instance, may point to a dog or to a tree\" from the third sentence of paragraph 5, ending the sentence with \"lying.\" Should the writer make this deletion?",
      must=["\"Bark,\" for instance, may point to a dog or to a tree."],
      opts=["No, because they give an example of a clue that misleads without lying.",
            "No, because they show how Farrar's rules made clues fair as well as clever.",
            "Yes, because the essay has already explained what makes a clue clever.",
            "Yes, because they shift the focus from the crossword's history to its readers."],
      key="No, because they give an example of a clue that misleads without lying.",
      exp='"A good clue misleads without lying" is abstract, and "Bark" shows what it means: the word honestly fits both a dog and a tree, so a solver can be misled without being told anything false. The example does not mention Farrar\'s rules, the essay never explains what makes a clue clever, and the words are about a clue, not about readers.',
      domain=PoW, sub="delete phrase", diff="medium"),
])
