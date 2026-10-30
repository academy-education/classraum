from common import *

# ---------------- P9  editorial / later school start times (X 5/3/2) ----------------
p9 = ("[1] Every school morning, thousands of teenagers in our district stand at bus stops in the dark, many of them half asleep. "
"The first bell at our high school rings at 7:25, which means many students wake before six. "
"Most of them are not getting enough sleep, and the reason is not, as adults like to assume that they stay up too late on their phones.\n\n"
"[2] Around puberty, the body's internal clock shifts. "
"The hormone that makes people drowsy begin to be released about two hours later in the evening than it was in childhood, so a typical sixteen-year-old cannot easily fall asleep before eleven. "
"Teenagers need between eight and ten hours of sleep a night. "
"A student who falls asleep at eleven and wakes at six gets seven at most. "
"No amount of discipline at bedtime can close that gap.\n\n"
"[3] When schools have moved their start times later, the results have been striking. "
"However, in 2016 Seattle pushed its high schools' first bell from 7:50 to 8:45. "
"Researchers whom tracked students there found that they slept about half an hour longer on school nights, and their grades in one biology course rose. "
"Attendance improved as well. "
"The American Academy of Pediatrics has recommended since 2014 that middle and high schools start no earlier than 8:30.\n\n"
"[4] Critics raise absurd concerns. "
"Buses would have to be rescheduled, and practices for sports teams would run later into the evening. "
"Both changes would cost money and require planning. "
"These problems are real, but other districts have solved them, often by flipping the schedules so that elementary schools, whose younger students wake early anyway, start first.\n\n"
"[5] The evidence is clear, and every year of delay costs another class of students its sleep. "
"Our school board will vote on a new schedule next month, it should approve an 8:30 start for the high school.")
mk(9, "Let Them Sleep", 'X', p9, [
 dict(kind='edit', sent="The first bell at our high school rings at 7:25, which means many students wake before six.",
      span="7:25, which means", ask="which choice is correctly punctuated",
      opts=["7:25 which means", "7:25; which means", "7:25. Which means"], key=NC,
      exp='The clause beginning "which means" comments on the whole first clause, so it is nonessential and follows a comma. Without the comma it runs into "7:25," a semicolon cannot introduce a dependent clause, and a period leaves "Which means many students wake before six" as a fragment.',
      domain=CSE, sub="nonessential clause comma", diff="easy"),
 dict(kind='edit', sent="Most of them are not getting enough sleep, and the reason is not, as adults like to assume that they stay up too late on their phones.",
      span="assume that", ask="which choice is correctly punctuated",
      opts=["assume, that", "assume; that", "assume—that"], key="assume, that",
      exp='"As adults like to assume" interrupts "the reason is not ... that they stay up too late" and is opened with a comma, so it must close with a comma. A semicolon would cut the clause in two, and a dash cannot close an interruption that a comma opened.',
      domain=CSE, sub="parenthetical commas", diff="medium"),
 dict(kind='edit', sent="Around puberty, the body's internal clock shifts.",
      span="shifts", ask="which choice best fits the context of the paragraph",
      opts=["stops", "speeds up", "reverses"], key=NC,
      exp='The next sentence explains what happens: the drowsiness hormone arrives about two hours later than in childhood, so the whole cycle moves later. "Shifts" describes that move. A clock that stopped would keep no schedule, one that sped up would make teenagers sleepy earlier, and one that reversed would turn night into day rather than move bedtime about two hours.',
      domain=KoL, sub="word choice in context", diff="medium"),
 dict(kind='edit', sent="The hormone that makes people drowsy begin to be released about two hours later in the evening than it was in childhood, so a typical sixteen-year-old cannot easily fall asleep before eleven.",
      span="begin", ask="which choice makes the sentence most grammatically acceptable",
      opts=["begins", "are beginning", "begun"], key="begins",
      exp='The subject is "hormone," which is singular; "people" belongs to the clause that describes it. The verb must be singular and present, like "makes" and "cannot": "begins." "Begin" and "are beginning" are plural, and "begun" is a participle that cannot stand as the verb without a helping verb.',
      domain=CSE, sub="subject-verb agreement", diff="medium"),
 dict(kind='edit', sent="However, in 2016 Seattle pushed its high schools' first bell from 7:50 to 8:45.",
      span="However,", ask="which choice provides the most logical transition",
      opts=["For example,", "In other words,", "As a result,"], key="For example,",
      exp='The preceding sentence says that later start times have produced striking results; Seattle is a case of a district that moved its start time later. "For example" introduces it as an instance. "However" sets it against the claim it supports, "In other words" treats one city as a restatement of a general claim, and "As a result" makes Seattle\'s change an effect of the results.',
      domain=PoW, sub="transition", diff="medium"),
 dict(kind='edit', sent="Researchers whom tracked students there found that they slept about half an hour longer on school nights, and their grades in one biology course rose.",
      span="whom tracked", ask="which choice makes the sentence most grammatically acceptable",
      opts=["who tracked", "which tracked", "whose tracked"], key="who tracked",
      exp='The pronoun is the subject of "tracked," and it refers to people, so it must be the subject form "who." "Whom" is an object form, "which" is not used for people, and "whose" is a possessive that would need a noun after it.',
      domain=CSE, sub="who vs whom", diff="medium"),
 dict(kind='other', prompt='The writer is considering deleting the following sentence from paragraph 3: "The American Academy of Pediatrics has recommended since 2014 that middle and high schools start no earlier than 8:30." Should the sentence be kept or deleted?',
      must=["The American Academy of Pediatrics has recommended since 2014 that middle and high schools start no earlier than 8:30."],
      opts=["Kept, because it gives expert support for the start time the writer urges in the final paragraph.",
            "Kept, because it explains why Seattle chose 8:45 rather than an earlier time.",
            "Deleted, because it repeats a recommendation the writer has already made in paragraph 2.",
            "Deleted, because it contradicts the start time that the paragraph reports for Seattle."],
      key="Kept, because it gives expert support for the start time the writer urges in the final paragraph.",
      exp='Paragraph 5 asks the board to approve "an 8:30 start," the very time the Academy recommends, so the sentence backs the writer\'s proposal with an expert source. The essay never says why Seattle chose 8:45, paragraph 2 makes no recommendation, and 8:45 is "no earlier than 8:30," so there is no contradiction.',
      domain=PoW, sub="delete sentence", diff="hard"),
 dict(kind='edit', sent="Critics raise absurd concerns.",
      span="absurd", ask="which choice best fits the context of the paragraph",
      opts=["fair", "few", "identical"], key="fair",
      exp='The writer goes on to grant that the critics\' problems "are real" before answering them, so the concerns are "fair." Calling them absurd contradicts "These problems are real," and the paragraph names two different concerns, so they are neither few nor identical.',
      domain=KoL, sub="word choice in context", diff="easy"),
 dict(kind='edit', sent="Our school board will vote on a new schedule next month, it should approve an 8:30 start for the high school.",
      span="month, it should", ask="which choice makes the sentence most grammatically acceptable",
      opts=["month; it should", "month, it, should", "month it should"], key="month; it should",
      exp='"Our school board will vote on a new schedule next month" and "it should approve an 8:30 start" are independent clauses joined by a comma alone, a comma splice. A semicolon joins them. A second comma after "it" splits the subject from its verb and leaves the splice, and no punctuation fuses the clauses.',
      domain=CSE, sub="comma splice", diff="easy"),
 dict(kind='other', prompt='The writer wants to add a sentence after the last sentence of the essay that returns to an image from paragraph 1. Which choice best accomplishes this goal?',
      opts=["Then the students at our bus stops could wait for the bus in daylight.",
            "Then the students who stay up late on their phones would finally put them down.",
            "Then our first bell at 7:50 would be a thing of the past.",
            "Then the students who now wake before five could sleep until six."],
      key="Then the students at our bus stops could wait for the bus in daylight.",
      exp='Paragraph 1 opens with teenagers standing at bus stops in the dark, and a later start would put them there in daylight. Paragraph 1 says late-night phones are not the reason students lack sleep; the district\'s first bell is at 7:25, while 7:50 was Seattle\'s; and paragraph 1 says students wake before six, not five.',
      domain=PoW, sub="conclusion", diff="medium"),
])

# ---------------- P10  humanities / technology: the first emoji (Y 6/3/1) ----------------
p10 = ("[1] In 1999 a Japanese mobile phone company asked a young employee named Shigetaka Kurita to solve a problem. "
"The company's new service let customers send short e-mails from their phones but each message was limited to 250 characters. "
"Kurita worried that such brief notes would be easy to forge. "
"A plain \"Fine\" could sound cheerful or cold, and the screen offered no way to tell which.\n\n"
"[2] His solution was a set of 176 tiny pictures; each drawn on a grid only twelve pixels wide and twelve pixels tall. "
"He took ideas from weather forecasts, which used a sun or a cloud to sum up a day, from the symbols in comic books, and he also borrowed from the Chinese characters used in written Japanese. "
"He called them emoji, from the Japanese words for \"picture\" and \"character.\" "
"Despite the resemblance, the word has nothing to do with the English word \"emotion.\"\n\n"
"[3] The pictures were an instant hit, and rival companies in Japan soon created their own sets. "
"That success, for instance, caused a new problem. "
"A heart sent from one company's phone might arrive on another's as a blank box or a string of nonsense, because each company coded their pictures differently.\n\n"
"[4] The fix came from the Unicode Consortium, a group that assigns a standard number to every letter and symbol in the world's writing systems so that a letter typed on one computer appears correctly on all the others. "
"In 2010, after several years of debate, the consortium added hundreds of emoji to its standard. "
"Within a few years, phones around the world included an emoji keyboard.\n\n"
"[5] In 2016 the Museum of Modern Art in New York acquired Kurita's original 176 designs for its permanent collection. "
"Next to today's detailed, full-color emoji, they look crude, but every one of the thousands that followed descend from them.")
mk(10, "Twelve Pixels Square", 'Y', p10, [
 dict(kind='edit', sent="In 1999 a Japanese mobile phone company asked a young employee named Shigetaka Kurita to solve a problem.",
      span="employee named Shigetaka Kurita to", ask="which choice is correctly punctuated",
      opts=["employee, named Shigetaka Kurita, to", "employee named, Shigetaka Kurita, to", "employee named Shigetaka Kurita, to"], key=NC,
      exp='"Named Shigetaka Kurita" identifies which employee is meant, so it is essential and takes no commas. Setting it off treats the name as an aside, a comma after "named" separates the verb from the name, and a comma after "Kurita" splits "asked ... employee" from "to solve."',
      domain=CSE, sub="unnecessary commas (restrictive phrase)", diff="medium"),
 dict(kind='edit', sent="The company's new service let customers send short e-mails from their phones but each message was limited to 250 characters.",
      span="phones but each", ask="which choice is correctly punctuated",
      opts=["phones, but each", "phones, but, each", "phones; but each"], key="phones, but each",
      exp='Two independent clauses joined by the coordinating conjunction "but" take a comma before the conjunction. A comma after "but" as well separates the conjunction from its clause, and a semicolon is not used before "but" when it joins two clauses like these.',
      domain=CSE, sub="comma before coordinating conjunction", diff="easy"),
 dict(kind='edit', sent="Kurita worried that such brief notes would be easy to forge.",
      span="forge", ask="which choice best fits the context of the paragraph",
      opts=["misread", "decipher", "ignore"], key="misread",
      exp='The next sentence gives the worry: a plain "Fine" could sound cheerful or cold, and the reader could not tell which. That is a fear that notes would be "misread." Easy to decipher is the opposite of the worry, and nothing in the paragraph concerns forged or ignored messages.',
      domain=KoL, sub="word choice in context", diff="medium"),
 dict(kind='edit', sent="His solution was a set of 176 tiny pictures; each drawn on a grid only twelve pixels wide and twelve pixels tall.",
      span="pictures; each drawn", ask="which choice is correctly punctuated",
      opts=["pictures, each drawn", "pictures. Each drawn", "pictures each, drawn"], key="pictures, each drawn",
      exp='"Each drawn on a grid only twelve pixels wide and twelve pixels tall" has no main verb ("drawn" is a participle), so it is a phrase that attaches to the clause with a comma. A semicolon or a period would leave it as a fragment, and the comma after "each" splits the phrase.',
      domain=CSE, sub="phrase vs clause punctuation", diff="medium"),
 dict(kind='edit', sent="He took ideas from weather forecasts, which used a sun or a cloud to sum up a day, from the symbols in comic books, and he also borrowed from the Chinese characters used in written Japanese.",
      span="and he also borrowed from the Chinese characters", ask="which choice makes the sentence most grammatically acceptable",
      opts=["and from the Chinese characters", "and borrowing from the Chinese characters", "and, from the Chinese characters"], key="and from the Chinese characters",
      exp='The sentence lists three sources, each introduced by "from": "from weather forecasts," "from the symbols in comic books," and "from the Chinese characters." The original switches the third item to a new clause, "borrowing" switches it to a participle, and the comma after "and" separates the conjunction from the item it joins.',
      domain=CSE, sub="parallelism", diff="medium"),
 dict(kind='edit', sent="That success, for instance, caused a new problem.",
      span="for instance,", ask="which choice provides the most logical transition",
      opts=["though,", "in other words,", "too,"], key="though,",
      exp='The preceding sentence describes success, the pictures\' instant popularity; this one says that success caused a problem. "Though" marks the turn from good news to bad. The problem is not an instance of the success, not a restatement of it, and not a further success, as "too" would claim.',
      domain=PoW, sub="transition", diff="medium"),
 dict(kind='edit', sent="A heart sent from one company's phone might arrive on another's as a blank box or a string of nonsense, because each company coded their pictures differently.",
      span="their pictures", ask="which choice makes the sentence most grammatically acceptable",
      opts=["its pictures", "it's pictures", "they're pictures"], key="its pictures",
      exp='The pronoun refers to "each company," which is singular, so it must be the singular possessive "its." "Their" is plural, "it\'s" means "it is," and "they\'re" means "they are."',
      domain=CSE, sub="pronoun agreement", diff="medium"),
 dict(kind='other', prompt='The writer is considering adding the following sentence after the first sentence of paragraph 4: "Kurita\'s original pictures were each twelve pixels square." Should the writer make this addition?',
      opts=["Yes, because it explains why the pictures appeared as blank boxes on other companies' phones.",
            "Yes, because it shows why the consortium needed several years of debate before adding emoji.",
            "No, because paragraph 2 has already given the size of the grid on which the pictures were drawn.",
            "No, because it contradicts paragraph 2's description of the grid on which the pictures were drawn."],
      key="No, because paragraph 2 has already given the size of the grid on which the pictures were drawn.",
      exp='Paragraph 2 says each picture was drawn on a grid "twelve pixels wide and twelve pixels tall," so the sentence only repeats that, and it interrupts paragraph 4\'s account of the Unicode fix. The size of the pictures is not what made them appear as blank boxes, which paragraph 3 blames on different coding, and it does not explain the debate; it also agrees with paragraph 2 rather than contradicting it.',
      domain=PoW, sub="add sentence", diff="hard"),
 dict(kind='edit', sent="Next to today's detailed, full-color emoji, they look crude, but every one of the thousands that followed descend from them.",
      span="descend from", ask="which choice makes the sentence most grammatically acceptable",
      opts=["descends from", "are descending from", "have descended from"], key="descends from",
      exp='The subject is "every one," which is singular; "of the thousands that followed" only describes it. The verb must be singular and present, like "look": "descends." "Descend," "are descending," and "have descended" are plural.',
      domain=CSE, sub="subject-verb agreement", diff="hard"),
 dict(kind='other', prompt="This question asks about the essay as a whole. Suppose the writer's primary purpose had been to show how the solution to one technical problem created another problem that needed its own solution. Would this essay accomplish that purpose?",
      opts=["Yes, because it shows how emoji meant to clarify short messages led to clashing sets that a shared standard fixed.",
            "Yes, because it shows how the twelve-pixel grid forced Kurita to redraw his pictures once phone screens improved.",
            "No, because it presents the clash between companies' sets as the problem Kurita was first asked to solve.",
            "No, because it reports that the consortium's standard never fixed the blank boxes."],
      key="Yes, because it shows how emoji meant to clarify short messages led to clashing sets that a shared standard fixed.",
      exp='Paragraphs 1 and 2 give the first problem and its solution, emoji for easily misread messages; paragraph 3 says their success produced incompatible sets; and paragraph 4 gives the Unicode fix. The essay never says Kurita redrew his pictures, paragraph 1 says his problem was that a plain "Fine" could read as cheerful or cold, and paragraph 4 says the standard worked, with emoji keyboards on phones worldwide.',
      domain=PoW, sub="essay purpose", diff="medium"),
])
