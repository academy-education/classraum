import json
# ISEE Upper Level Reading, draft 4 (2026-10-22). Four choices per item.
# Co-founder rules applied (from SSAT d4 / ISEE d1 notes):
#  1. main-idea distractors are on-topic: a real part but not the whole, too narrow, or a central misreading
#  2. attitude sets tailored per passage; no two sets in the batch share more than one word
#  3. inference / purpose keys combine two pieces of the passage, never restate one sentence
#  4. story logic checked line by line, not only the key
def R(c, lure, r): return {"choice": c, "lure": lure, "reason": '"' + c + '" ' + r}
def I(qid, kind, diff, prompt, choices, key, why, expl, rats, why2=None):
    d = {"qid": qid, "kind": kind, "difficulty": diff, "prompt": prompt, "choices": choices, "correct_answer": key,
         "why": why, "explanation": X(key, expl), "distractor_rationales": rats}
    if why2: d["why2"] = why2
    return d
def X(k, c): return f"\"{k}\" is correct: {c}"
sets = []

P01 = """Holding book, as far as Joon could tell, was the job Ms. Pruett gave to people who had auditioned badly. He had read for the part of the lighthouse keeper in The Long Night and lost it to Celia Marsh, a senior who could make the back row of the auditorium go quiet just by lowering her voice. When the cast list went up, his name was at the bottom, on a line by itself: Book, J. Han.

The job came with a black binder and a stool in the left wing. Joon was to follow every word of the script while the actors rehearsed, and when one of them stopped and called "Line," to read out the next few words, loud enough to be heard and no louder. He took the binder from Ms. Pruett without opening it.

For the first week he followed along with one finger and his mind elsewhere. In the second week he began to notice things. Celia always stopped at the same place in the second act, just after the storm, where the keeper tells her brother that the light must be lit even if no ship is coming. She would say "Even if" and then stand there, and Joon would read the rest, and she would go on. By the third week he had stopped reading the line from the page. He knew it the way he knew his own phone number.

Dress rehearsal was the one night the actors were told not to call for lines. "Whatever happens, keep going," Ms. Pruett said. "If somebody is stuck, Book will help, quietly. Then it's yours again."

The storm came, the thunder sheet rattled behind the curtain, and Celia said, "Even if," and stopped. Joon leaned toward the edge of the curtain and whispered the line. He saw her hear it. Then, instead of repeating his words, she turned to the boy playing her brother and said something close to them but not the same, something about a light being the one promise a keeper could still keep. The boy blinked, answered, and the scene went on.

Afterward Joon found the place in the binder and read the printed line again. It was better, he decided, than what she had said. It was also less like her.

In the hall, Celia stopped him. "That was you, at the storm?" He said he was sorry she had to make something up. "I didn't make it up because I was lost," she said. "I was lost every other time. Tonight I heard you, so I knew where I was, and then I could choose."

At home Joon opened the binder to the storm scene. In the margin, beside the printed line, he wrote down the words Celia had said, in case she wanted them again tomorrow."""

sets.append({"passage_id": "IR4-P01", "title": "Holding Book", "genre": "fiction", "passage": P01, "items": [
 I("IR4-P01-1", "main-idea", "easy", "The passage is mainly about",
   ["a student whose backstage job turns out to matter more than he expected",
    "a lead actor who forgets her lines and spoils the school's dress rehearsal",
    "a student who loses a lead role in a play to an older and better actor",
    "an actor who rewrites a weak line of the play during a dress rehearsal"],
   "a student whose backstage job turns out to matter more than he expected",
   "Tonight I heard you, so I knew where I was, and then I could choose.",
   "Joon first thinks holding book is a job for people \"who had auditioned badly,\" but his whisper lets Celia find her way, and he ends by writing her words in the margin for tomorrow.",
   [R("a lead actor who forgets her lines and spoils the school's dress rehearsal", "central misreading", "is wrong: Celia does stop, but she finds her way back and \"the scene went on.\""),
    R("a student who loses a lead role in a play to an older and better actor", "part not whole", "takes the first paragraph's background as the subject; the passage follows what Joon does with the job he got instead."),
    R("an actor who rewrites a weak line of the play during a dress rehearsal", "central misreading", "is wrong: Joon judges that the printed line \"was better\" than what Celia said, and the passage centers on his part in the moment, not on a rewrite.")]),
 I("IR4-P01-2", "detail", "medium", "According to the passage, at the dress rehearsal the actors were told to",
   ["keep going instead of calling out for their lines",
    "call out for a line loudly whenever they were stuck",
    "stop the scene and wait for Ms. Pruett to restart",
    "read any line they had forgotten from the binder"],
   "keep going instead of calling out for their lines",
   "Dress rehearsal was the one night the actors were told not to call for lines.",
   "the actors \"were told not to call for lines,\" and Ms. Pruett says, \"Whatever happens, keep going.\"",
   [R("call out for a line loudly whenever they were stuck", "wrong time", "describes the ordinary rehearsals; dress rehearsal was \"the one night\" they were told not to call for lines."),
    R("stop the scene and wait for Ms. Pruett to restart", "reversed", "reverses her instruction, \"Whatever happens, keep going.\""),
    R("read any line they had forgotten from the binder", "misplaced detail", "is wrong: the binder belongs to Joon in the wing; the actors never read from it.")]),
 I("IR4-P01-3", "vocabulary-in-context", "medium", "As it is used in the first paragraph, the word \"lowering\" most nearly means",
   ["making it quieter", "making it less refined", "reducing the price of", "letting it down on a rope"],
   "making it quieter",
   "a senior who could make the back row of the auditorium go quiet just by lowering her voice",
   "Celia makes the back row \"go quiet\" by lowering her voice, that is, by speaking more softly.",
   [R("making it less refined","other sense","is the sense of lowering standards or taste; quieting a room has nothing to do with refinement."),
    R("reducing the price of", "other sense", "is the sense used in shops; nothing is being sold."),
    R("letting it down on a rope", "other sense", "is the sense of lowering a bucket or a boat, which does not fit a voice.")]),
 I("IR4-P01-4", "inference", "hard", "Joon's action in the last paragraph suggests that he",
   ["now takes the job of holding book seriously",
    "thinks Celia's words should replace the printed line",
    "plans to ask Ms. Pruett for the part of the keeper",
    "means to report Celia's change to Ms. Pruett"],
   "now takes the job of holding book seriously",
   "he wrote down the words Celia had said, in case she wanted them again tomorrow",
   "the boy who took the binder \"without opening it\" now opens it at home and prepares for what Celia might need \"tomorrow.\"",
   [R("thinks Celia's words should replace the printed line", "contradicted", "is contradicted: he decides the printed line \"was better\" than hers, and he writes her words \"beside the printed line,\" not over it."),
    R("plans to ask Ms. Pruett for the part of the keeper", "invented", "has no support; after the first paragraph the lost part is never mentioned again."),
    R("means to report Celia's change to Ms. Pruett", "invented", "has no support; he writes the words down \"in case she wanted them,\" for Celia's use, not as a complaint.")]),
 I("IR4-P01-5", "purpose", "hard", "The author includes Joon's judgment that the printed line was better but \"less like her\" mainly to",
   ["show that he values Celia's words as her own, not as an improvement",
    "suggest that he thinks Celia should stop changing the play's script",
    "show that he still wishes he had won the part of the lighthouse keeper",
    "explain why Ms. Pruett told the actors to keep going whatever happened"],
   "show that he values Celia's words as her own, not as an improvement",
   "It was better, he decided, than what she had said. It was also less like her.",
   "he grants the printed line \"was better,\" yet he copies Celia's version into the margin \"in case she wanted them again,\" so what he keeps is the line that is like her.",
   [R("suggest that he thinks Celia should stop changing the play's script", "contradicted", "is contradicted by his last action: he saves her words for her to use again."),
    R("show that he still wishes he had won the part of the lighthouse keeper", "invented", "has no support; his judgment compares two lines, not himself and Celia."),
    R("explain why Ms. Pruett told the actors to keep going whatever happened", "misplaced detail", "is wrong: her instruction comes before the scene and is never explained by Joon's later judgment.")]),
 I("IR4-P01-6", "attitude", "medium", "At the beginning of the passage, Joon's attitude toward the job of holding book is best described as",
   ["dismissive", "apprehensive", "intrigued", "humorous"], "dismissive",
   "was the job Ms. Pruett gave to people who had auditioned badly",
   "he thinks of it as the job for people \"who had auditioned badly\" and takes the binder \"without opening it.\"",
   [R("apprehensive", "misattributed", "is wrong: nothing suggests he dreads the job; in the first week he follows along with \"his mind elsewhere.\""),
    R("intrigued", "wrong time", "fits the second week, when \"he began to notice things,\" not the beginning, when he will not even open the binder."),
    R("humorous", "invented", "has no support; he finds nothing funny in the job or the cast list.")],
   why2="He took the binder from Ms. Pruett without opening it.")]})

P02 = """They opened the new bridge on a Saturday,
a flat gray road laid over the river
on four concrete legs, wide enough
for two trucks to pass without slowing.

The mayor cut a ribbon. The band
played something brassy into the wind.
Then the cars went over, one by one,
and the old bridge stood beside it, empty:

green iron in a lattice of X's,
a deck of oak planks my grandfather
called the piano, because each one
gave a different note under the tires.

I crossed it every day for eleven years,
to school, to the store, to the field
where the river bends. I knew the plank
that rocked, the bolt that had lost its head,

the place in the middle where you could
stop and feel the whole span hum
when a truck came on at the far end,
as if the bridge were clearing its throat.

In March the crews came with torches.
They took it apart the way it was built,
a piece at a time, and lowered each X
onto a barge that rode low in the water.

I went to watch. A man in a hard hat
told me the iron would be melted down
and poured into something else: rails,
maybe, or the frame of a building in the city.

I like that. I like to think that somewhere
a girl is leaning on a railing
that used to be a bridge, and feels it hum
a little, when the traffic passes,

and does not know why she stops there,
only that it seems like a place to stand.
The new bridge is smooth. My tires
make one long note going over."""

sets.append({"passage_id": "IR4-P02", "title": "Truss", "genre": "poetry", "passage": P02, "items": [
 I("IR4-P02-1", "main-idea", "easy", "The poem is mainly about",
   ["a speaker's memories of an old bridge as it is replaced and taken apart",
    "a town's celebration on the day its new concrete bridge first opened",
    "the work crews who cut apart an old iron bridge and load it on a barge",
    "a grandfather who taught the speaker to listen to the planks of a bridge"],
   "a speaker's memories of an old bridge as it is replaced and taken apart",
   "I crossed it every day for eleven years,",
   "the poem moves from the opening of the new bridge through the speaker's memories of the old one to its dismantling and what it may become.",
   [R("a town's celebration on the day its new concrete bridge first opened", "part not whole", "takes the first two stanzas as the whole poem; the ribbon and the band give way to the old bridge."),
    R("the work crews who cut apart an old iron bridge and load it on a barge", "part not whole", "takes the sixth stanza as the subject; the crews matter only as the end of the bridge the speaker knew."),
    R("a grandfather who taught the speaker to listen to the planks of a bridge", "central misreading", "is wrong: the grandfather only gave the deck its name, \"the piano\"; nothing says he taught the speaker anything.")]),
 I("IR4-P02-2", "detail", "medium", "According to the poem, the grandfather called the old deck \"the piano\" because",
   ["each plank made a different sound under the tires",
    "the iron lattice looked like a long row of piano keys",
    "the whole span hummed when a truck came across",
    "a band once played music there on opening day"],
   "each plank made a different sound under the tires",
   "called the piano, because each one gave a different note under the tires",
   "each oak plank \"gave a different note under the tires.\"",
   [R("the iron lattice looked like a long row of piano keys", "misplaced detail", "is wrong: the lattice is described as \"X's,\" and the name is explained by sound, not looks."),
    R("the whole span hummed when a truck came across", "near miss", "is a real detail of the fifth stanza, but the poem gives the planks' different notes as the reason for the name."),
    R("a band once played music there on opening day", "misplaced detail", "borrows the band from the new bridge's opening.")]),
 I("IR4-P02-3", "vocabulary-in-context", "hard", "As it is used in the fifth stanza, the word \"span\" most nearly means",
   ["the length of a bridge between its ends",
    "a stretch of time from start to finish",
    "the width of a hand with fingers spread",
    "a pair of animals harnessed together"],
   "the length of a bridge between its ends",
   "stop and feel the whole span hum",
   "standing \"in the middle,\" the speaker feels the whole bridge hum when a truck comes on \"at the far end.\"",
   [R("a stretch of time from start to finish", "other sense", "is the sense of a span of years; the speaker feels something physical hum."),
    R("the width of a hand with fingers spread", "other sense", "is an old measure of length, far too small for a truck at the far end to matter."),
    R("a pair of animals harnessed together", "other sense", "is the sense of a span of oxen, which has nothing to do with the bridge.")]),
 I("IR4-P02-4", "inference", "hard", "The last two lines of the poem suggest that, compared with the old bridge, the new one",
   ["lacks the variety of sound that made the old one familiar",
    "is much noisier for all the drivers who cross it every day",
    "will soon need repairs to its smooth concrete surface",
    "is crossed by far fewer cars than the old one carried"],
   "lacks the variety of sound that made the old one familiar",
   "make one long note going over",
   "the old deck gave \"a different note\" with each plank, but the new bridge gives \"one long note,\" so the music the speaker knew is gone.",
   [R("is much noisier for all the drivers who cross it every day", "reversed", "is wrong: the new bridge is \"smooth,\" and one note is less varied, not louder."),
    R("will soon need repairs to its smooth concrete surface", "invented", "has no support; \"smooth\" describes it as sound and new."),
    R("is crossed by far fewer cars than the old one carried", "contradicted", "is contradicted: \"the cars went over, one by one,\" and it is wide enough for two trucks to pass.")]),
 I("IR4-P02-5", "purpose", "hard", "The speaker imagines a girl leaning on a railing (eighth and ninth stanzas) mainly to",
   ["suggest that something of the old bridge may live on in what it becomes",
    "recall how the speaker used to stand on the old bridge as a young child",
    "show that the speaker plans to move to the city where the iron is sent",
    "warn that the new bridge will one day be taken apart in the same way"],
   "suggest that something of the old bridge may live on in what it becomes",
   "that used to be a bridge, and feels it hum",
   "the iron is to be \"poured into something else,\" and the imagined railing still makes a girl stop and feel it hum, as the speaker once did on the old span.",
   [R("recall how the speaker used to stand on the old bridge as a young child", "near miss", "is wrong: the girl is imagined in the future, on a railing \"that used to be a bridge,\" not remembered from the past."),
    R("show that the speaker plans to move to the city where the iron is sent", "invented", "has no support; the city is only one guess about where the iron may go."),
    R("warn that the new bridge will one day be taken apart in the same way", "invented", "has no support; the new bridge appears in those stanzas only as \"smooth.\"")]),
 I("IR4-P02-6", "attitude", "medium", "The speaker's attitude toward the old bridge is best described as",
   ["nostalgic", "scornful", "enthusiastic", "impartial"], "nostalgic",
   "I knew the plank that rocked, the bolt that had lost its head,",
   "the speaker remembers its flaws as familiar friends, \"the plank / that rocked,\" and notices that the new bridge gives only \"one long note.\"",
   [R("scornful", "reversed", "is wrong: the rocking plank and the headless bolt are remembered as known and dear, not as faults to mock."),
    R("enthusiastic", "misattributed", "fits the ribbon and the brassy band for the new bridge, not the speaker's feeling for the old one."),
    R("impartial", "reversed", "is wrong: the speaker crossed it \"every day for eleven years\" and went to watch it taken apart.")],
   why2="The new bridge is smooth. My tires make one long note going over.")]})

P03 = """The winter I was twelve, my mother took a second shift at the hospital laundry, and my brother Ollie became my job from three-fifteen until she got home at seven. He was five. He had opinions about everything, and he walked as though each crack in the sidewalk were a separate country that had to be entered and inspected.

The walk from his kindergarten to our apartment was nine blocks. With an adult it took fifteen minutes. With Ollie it took most of an hour, and on the first day I spent the whole walk tugging his mittened hand and saying "come on" until the words lost their shape.

By Thursday I had a plan. I told him we were explorers and the walk was unmapped territory, and that explorers have to name what they find. Once he had named something, we could move on. It was a trick, and I am a little embarrassed by how well it worked.

Ollie named everything. The fire hydrant on Bell Street, which leaned, became the Old Man. A grate that breathed warm air in all weathers was the Dragon. The dry cleaner's window, with its rack of plastic-wrapped coats turning slowly on a chain, was the Ghost Parade. He made me write the names down, so I drew a map on a sheet of shirt cardboard, and every afternoon he added something: the Bridge of Ice where a puddle froze, the Tooth, which was a broken step.

Somewhere in February I noticed that I had stopped saying come on. The walk still took most of an hour. But I had begun, without meaning to, to look for things he might like, and to point them out before he saw them, and to feel a small private pleasure when he gave one a name I would never have thought of.

In April my mother's shifts changed and she picked him up herself. I went back to walking home with friends, at a normal speed, past the Dragon and the Old Man, which were a grate and a hydrant again.

Ollie is fifteen now and taller than I am. Last month I was home for a weekend, and he asked if I still had the map. I told him I thought it had been thrown out years ago. He went to his room and came back with it, soft as cloth at the folds, the Ghost Parade still marked in my handwriting and, beside the broken step, a crooked T he had insisted on drawing himself."""

sets.append({"passage_id": "IR4-P03", "title": "The Ghost Parade", "genre": "memoir", "passage": P03, "items": [
 I("IR4-P03-1", "main-idea", "easy", "The passage is mainly about",
   ["how a game meant to hurry a younger brother changed the author's walks with him",
    "a young boy's habit of giving playful names to the things he saw on his daily walk",
    "a mother who took a second shift at work during one long winter",
    "a teenage brother who has kept an old hand-drawn map for ten years"],
   "how a game meant to hurry a younger brother changed the author's walks with him",
   "Somewhere in February I noticed that I had stopped saying come on.",
   "the explorer game begins as \"a trick\" to keep Ollie moving, and by February the author is looking for things he might like.",
   [R("a young boy's habit of giving playful names to the things he saw on his daily walk", "too narrow", "describes Ollie's part of the game but leaves out the change in the author, which the passage is built around."),
    R("a mother who took a second shift at work during one long winter", "part not whole", "takes the first sentence's background as the subject; the mother only sets up the walks."),
    R("a teenage brother who has kept an old hand-drawn map for ten years", "part not whole", "takes the last paragraph as the whole passage.")]),
 I("IR4-P03-2", "detail", "medium", "According to the passage, the author first invented the explorer game in order to",
   ["get Ollie to keep walking instead of stopping",
    "teach Ollie to read the names of all the streets",
    "help Ollie learn the way home by himself",
    "keep Ollie warm on the coldest afternoons"],
   "get Ollie to keep walking instead of stopping",
   "Once he had named something, we could move on.",
   "the rule was that \"Once he had named something, we could move on,\" a way past the hour-long walks of the first days.",
   [R("teach Ollie to read the names of all the streets", "misplaced detail", "is wrong: Ollie makes up names; he is five, and the author writes them down for him."),
    R("help Ollie learn the way home by himself", "invented", "has no support; the author walks with him every day until the mother takes over."),
    R("keep Ollie warm on the coldest afternoons", "misplaced detail", "borrows the warm grate, the Dragon, which is one of the things he names.")]),
 I("IR4-P03-3", "vocabulary-in-context", "medium", "As it is used in the first paragraph, the word \"shift\" most nearly means",
   ["a set period of work", "a change in position", "a simple loose dress", "a clever trick or scheme"],
   "a set period of work",
   "my mother took a second shift at the hospital laundry",
   "the mother works a second shift \"at the hospital laundry\" and gets home at seven, so it is a period of work.",
   [R("a change in position", "other sense", "is the sense of a shift in the wind or in opinion, which does not fit taking a job at a laundry."),
    R("a simple loose dress", "other sense", "is the clothing sense; the mother does not take a dress."),
    R("a clever trick or scheme", "other sense", "is an older sense of the word; the trick in the passage is the author's game, not the mother's work.")]),
 I("IR4-P03-4", "inference", "hard", "The last paragraph suggests that Ollie",
   ["valued the walks and the map more than the author had realized",
    "had forgotten most of the names he made up as a young child",
    "blamed the author for throwing out the map they had made",
    "had redrawn the whole old map in his own handwriting as a teenager"],
   "valued the walks and the map more than the author had realized",
   "He went to his room and came back with it, soft as cloth at the folds,",
   "the author assumed the map \"had been thrown out years ago,\" but Ollie kept it and it is \"soft as cloth at the folds,\" worn from handling.",
   [R("had forgotten most of the names he made up as a young child", "contradicted", "is contradicted: he is the one who asks about the map, and he has kept it."),
    R("blamed the author for throwing out the map they had made", "contradicted", "is contradicted: the map was never thrown out; Ollie had it all along."),
    R("had redrawn the whole old map in his own handwriting as a teenager", "contradicted", "is contradicted: the names are \"still marked in my handwriting,\" apart from the T he drew at five.")]),
 I("IR4-P03-5", "purpose", "hard", "The author says the Dragon and the Old Man became \"a grate and a hydrant again\" mainly to",
   ["show that the names lost their life once the walks with Ollie ended",
    "suggest that the author had always found the naming game rather silly",
    "explain why the author began walking home from school with friends",
    "show that the city had repaired the grate and the hydrant by spring"],
   "show that the names lost their life once the walks with Ollie ended",
   "which were a grate and a hydrant again",
   "the names belonged to the afternoons with Ollie; once the mother \"picked him up herself,\" the author walks past the same things and they are ordinary.",
   [R("suggest that the author had always found the naming game rather silly", "contradicted", "is contradicted by the \"small private pleasure\" the author felt when Ollie named something."),
    R("explain why the author began walking home from school with friends", "wrong cause", "is wrong: the reason is that \"my mother's shifts changed.\""),
    R("show that the city had repaired the grate and the hydrant by spring", "invented", "has no support; nothing is said to be repaired.")]),
 I("IR4-P03-6", "attitude", "medium", "In the fifth paragraph, the author's feeling toward Ollie is best described as",
   ["affectionate", "exasperated", "apprehensive", "objective"], "affectionate",
   "to feel a small private pleasure when he gave one a name I would never have thought of",
   "the author looks for \"things he might like\" and takes \"a small private pleasure\" in his names.",
   [R("exasperated", "wrong time", "fits the first day of \"tugging his mittened hand,\" but by February the author has \"stopped saying come on.\""),
    R("apprehensive", "invented", "has no support; the author is in charge of Ollie, but nothing in the paragraph looks ahead to trouble."),
    R("objective", "reversed", "is wrong: the author describes private feelings, not a neutral account, and goes looking for things to show him.")],
   why2="I had begun, without meaning to, to look for things he might like")]})

P04 = """Listen to almost anyone practice the piano, and you will hear the same thing. They start at the beginning. They play until they make a mistake, stop, go back to the beginning, and try again. By the end of an hour the first page sounds wonderful. The difficult passage on page three, the one that sent them back each time, has been played perhaps four times.

This method feels like work, and it is. But it spends most of the effort where little is needed. The parts a player already knows get the most repetition; the part that needs it gets the least. It is a little like a runner who trains for a race by running the first mile over and over and hoping the last mile will take care of itself.

There is a second cost, and it is easier to miss. Every time the player reaches the hard passage at full speed and stumbles, the stumble is rehearsed too. Hands learn whatever they do, intended or otherwise. A mistake made twenty times is no longer a mistake. It is part of the piece.

The alternative is simple to describe and uncomfortable to do. Find the passage that breaks down. Play only that, slowly enough to get it right, then a little faster, then join it to the bar before it and the bar after. Treat each mistake as information about exactly where the trouble lies, rather than as a reason to start over. It is dull. It sounds terrible to anyone in the next room. And most teachers who have watched students try both ways will tell you which one works.

The habit of starting at the top is hard to break because it is pleasant. Playing what you can already play feels like progress, and the first page rewards you every time. Working on four bars for twenty minutes rewards you with almost nothing, until one day the passage that used to collapse simply holds.

The same is true well beyond music. The student who rereads the chapter she already understood, the pitcher who throws only the pitch he trusts, the speaker who rehearses the opening of a talk and makes up the ending as she goes: each is practicing the comfortable part. Getting better at something mostly means spending time where you are worst at it, on purpose, and letting the easy parts wait."""

sets.append({"passage_id": "IR4-P04", "title": "Start at Page Three", "genre": "essay", "passage": P04, "items": [
 I("IR4-P04-1", "main-idea", "easy", "Which of the following best states the main idea of the passage?",
   ["Practice should go to the hardest parts rather than always starting over.",
    "Mistakes repeated often enough in practice can become part of a piece.",
    "Playing a piece from the beginning is pleasant because it feels like progress.",
    "Music practice is a poor guide to getting better at other activities."],
   "Practice should go to the hardest parts rather than always starting over.",
   "Getting better at something mostly means spending time where you are worst at it, on purpose, and letting the easy parts wait.",
   "the author argues that starting from the top spends effort \"where little is needed\" and urges working on the passage \"that breaks down.\"",
   [R("Mistakes repeated often enough in practice can become part of a piece.", "too narrow", "is the \"second cost\" of the third paragraph, one reason in the argument rather than its point."),
    R("Playing a piece from the beginning is pleasant because it feels like progress.", "part not whole", "is the fifth paragraph's explanation of why the habit is hard to break, not the author's main claim."),
    R("Music practice is a poor guide to getting better at other activities.", "reversed", "reverses the last paragraph, which says \"The same is true well beyond music.\"")]),
 I("IR4-P04-2", "detail", "medium", "According to the author, a mistake that is made over and over at full speed",
   ["becomes part of the way the piece is played",
    "is the best reason to start the whole piece over",
    "disappears once the player slows down",
    "is easiest to correct on the first page"],
   "becomes part of the way the piece is played",
   "A mistake made twenty times is no longer a mistake. It is part of the piece.",
   "\"A mistake made twenty times is no longer a mistake. It is part of the piece.\"",
   [R("is the best reason to start the whole piece over", "reversed", "reverses the advice to treat a mistake as information \"rather than as a reason to start over.\""),
    R("disappears once the player slows down", "invented", "has no support; slowing down is how the author says to get a passage right, not how a learned stumble vanishes."),
    R("is easiest to correct on the first page", "misplaced detail", "misuses the first page, which is where the player makes the fewest mistakes.")]),
 I("IR4-P04-3", "vocabulary-in-context", "hard", "As it is used in the fifth paragraph, the word \"holds\" most nearly means",
   ["stays steady under strain", "grips something in the hand", "has enough room inside for", "keeps someone as a prisoner"],
   "stays steady under strain",
   "until one day the passage that used to collapse simply holds",
   "the passage \"that used to collapse\" now holds, that is, it no longer falls apart when played.",
   [R("grips something in the hand", "literal sense", "is the physical sense; a passage of music grips nothing."),
    R("has enough room inside for", "other sense", "is the sense of a jar that holds a quart, which does not fit a passage that once collapsed."),
    R("keeps someone as a prisoner", "other sense", "is the sense of holding a captive, which has no place in the sentence.")]),
 I("IR4-P04-4", "inference", "hard", "The author would most likely advise the pitcher mentioned in the last paragraph to",
   ["spend more practice time on the pitches he trusts least",
    "throw his most trusted pitch more often during games",
    "practice the first inning of each game again and again",
    "rest until he feels confident in all of his pitches"],
   "spend more practice time on the pitches he trusts least",
   "the pitcher who throws only the pitch he trusts",
   "the pitcher is \"practicing the comfortable part,\" and the author's rule is to spend time \"where you are worst at it, on purpose.\"",
   [R("throw his most trusted pitch more often during games", "reversed", "is the comfortable habit the author criticizes, carried into games."),
    R("practice the first inning of each game again and again", "misapplied analogy", "copies the start-at-the-top habit that the essay argues against."),
    R("rest until he feels confident in all of his pitches", "invented", "has no support; the author's remedy is deliberate work, not rest.")]),
 I("IR4-P04-5", "purpose", "hard", "The author mentions the runner in the second paragraph mainly to",
   ["illustrate how starting over puts effort where it is needed least",
    "show that running and music both depend on hours of daily work",
    "argue that the final part of any task is always the hardest one",
    "suggest that musicians would gain from training their bodies too"],
   "illustrate how starting over puts effort where it is needed least",
   "It is a little like a runner who trains for a race by running the first mile over and over",
   "the runner who repeats \"the first mile\" and hopes the last will take care of itself matches the player who polishes page one and neglects page three.",
   [R("show that running and music both depend on hours of daily work", "too general", "misses the point of the comparison, which is about where the work goes, not how much of it there is."),
    R("argue that the final part of any task is always the hardest one", "overreach", "goes beyond the essay: the hard passage is on page three, and the later examples are not about endings at all."),
    R("suggest that musicians would gain from training their bodies too", "invented", "has no support; the runner is a comparison, not advice to pianists.")]),
 I("IR4-P04-6", "attitude", "medium", "The author's attitude toward the idea that playing a piece from the beginning each time is good practice is best described as",
   ["skeptical", "whimsical", "appreciative", "indifferent"], "skeptical",
   "But it spends most of the effort where little is needed.",
   "the author grants that the method \"feels like work\" but doubts that it pays, since it spends effort \"where little is needed\" and rehearses mistakes.",
   [R("whimsical", "tone of one image", "fits the light runner comparison at most; the essay argues its case seriously."),
    R("appreciative", "concession misread", "mistakes the author's concession that the habit \"is pleasant\" for approval of it as practice."),
    R("indifferent", "reversed", "is wrong: the author argues against the idea at length and offers an alternative.")],
   why2="A mistake made twenty times is no longer a mistake.")]})

P05 = """In the 1830s the village of Brackett's Mill drew its water the way most villages of its size did, from backyard wells and from the river. Neither source was reliable. The wells on the low streets near the tannery gave water that smelled of bark and hides, and in a dry August the shallow ones on the hill went down to mud.

The answer, when it came, came from a schoolteacher. Abel Fenn taught arithmetic and surveying in the one-room academy above the general store, and in the spring of 1838 he carried a borrowed surveyor's level up Tanner's Knob, the hill east of the village, to a spring that had never been known to run dry. By his measurements the spring sat about ninety feet above the village green. Water, he told the council, would run down to the green on its own if it were given something to run through.

What he proposed was a main of wooden pipe. Pine logs, each about ten feet long, would be bored lengthwise with a long auger, shaped at one end to fit snugly into the next, and laid end to end in a trench deep enough to stay below the frost. It was an old method. Towns in several states had used it, and Fenn had read descriptions of it in an almanac.

The council was cautious. Wooden pipe meant more than a mile of logs, months of boring, and a trench across three farms whose owners would have to agree. Members asked what would happen when the logs rotted, and Fenn admitted that they would, in perhaps thirty years. The council voted to pay for the first half mile and to wait and see.

The first half mile was finished that fall, carrying water from the spring to a trough at the foot of the knob. Within a month, farmers from three miles around were bringing barrels to fill there. The council, which had planned to wait a year, voted that winter to pay for the rest of the line.

On a Saturday in July 1839, water reached a wooden post on the village green with a spout set in its side. Fenn had expected it within the hour; it took nearly two, while the pipe filled and the joints swelled tight. When it arrived it came out cold and clear.

The logs lasted about as long as Fenn had said they would. By the late 1860s the joints leaked so badly that the post on the green gave little more than a trickle, and in 1871 the village replaced the line with iron pipe. Some of the old logs were dug up decades later, still lying in their trench, with the auger marks visible along the inside."""

sets.append({"passage_id": "IR4-P05", "title": "The Log Main", "genre": "history", "passage": P05, "items": [
 I("IR4-P05-1", "main-idea", "easy", "The passage is mainly about",
   ["how a village came to build a wooden water main from a hillside spring",
    "a schoolteacher's survey of a spring on the hill east of his village",
    "the trouble that a tannery's waste caused for a village's wells",
    "why a village replaced its old wooden water pipes with iron ones"],
   "how a village came to build a wooden water main from a hillside spring",
   "What he proposed was a main of wooden pipe.",
   "the passage follows the wooden main from the village's poor wells through Fenn's proposal and the council's votes to the water arriving on the green and the line's eventual replacement.",
   [R("a schoolteacher's survey of a spring on the hill east of his village", "part not whole", "takes the second paragraph as the whole; the survey is only the first step toward the main."),
    R("the trouble that a tannery's waste caused for a village's wells", "part not whole", "takes one detail of the first paragraph, the wells that \"smelled of bark and hides,\" as the subject."),
    R("why a village replaced its old wooden water pipes with iron ones", "part not whole", "takes the last paragraph as the subject; the iron pipe ends the story of the wooden main.")]),
 I("IR4-P05-2", "detail", "medium", "According to the passage, the council voted to pay for the rest of the line after",
   ["farmers began filling barrels at the trough below the knob",
    "Fenn measured how far the spring sat above the village green",
    "the shallow wells on the hill went dry during a hot August",
    "water first came out of the spout on the post on the green"],
   "farmers began filling barrels at the trough below the knob",
   "Within a month, farmers from three miles around were bringing barrels to fill there.",
   "once the first half mile reached the trough, \"farmers from three miles around were bringing barrels,\" and \"that winter\" the council voted for the rest.",
   [R("Fenn measured how far the spring sat above the village green", "wrong time", "comes before the first vote, which paid for only half a mile."),
    R("the shallow wells on the hill went dry during a hot August", "misplaced detail", "is the background problem in the first paragraph, not the event that led to the second vote."),
    R("water first came out of the spout on the post on the green", "wrong time", "reverses the order: the water could reach the green only after the rest of the line was paid for and laid.")]),
 I("IR4-P05-3", "vocabulary-in-context", "medium", "As it is used in the third paragraph, the word \"main\" most nearly means",
   ["a principal pipe that carries water", "the open sea far from any shore", "great physical strength or force", "the chief or largest part of a thing"],
   "a principal pipe that carries water",
   "What he proposed was a main of wooden pipe.",
   "a main \"of wooden pipe\" laid in a trench is a large pipe carrying water from the spring to the village.",
   [R("the open sea far from any shore", "other sense", "is the old poetic sense of the main; nothing in the paragraph is at sea."),
    R("great physical strength or force", "other sense", "is the sense in the old phrase might and main, which does not fit a thing made of logs."),
    R("the chief or largest part of a thing", "other sense", "is the sense of the phrase in the main; the sentence names an object Fenn proposed, made \"of wooden pipe.\"")]),
 I("IR4-P05-4", "inference", "hard", "It can be inferred that Fenn chose the spring on Tanner's Knob as the source because it",
   ["was dependable in dry weather and higher than the village",
    "was the only spring on land that the village already owned",
    "gave water with the taste of bark that villagers preferred",
    "lay closer to the village green than the river or the wells"],
   "was dependable in dry weather and higher than the village",
   "a spring that had never been known to run dry",
   "the wells failed \"in a dry August,\" while this spring \"had never been known to run dry,\" and it sat \"about ninety feet above the village green,\" so water would run down \"on its own.\"",
   [R("was the only spring on land that the village already owned", "invented", "has no support; in fact the trench had to cross \"three farms whose owners would have to agree.\""),
    R("gave water with the taste of bark that villagers preferred", "reversed", "reverses the first paragraph, where water that \"smelled of bark and hides\" is a problem."),
    R("lay closer to the village green than the river or the wells", "contradicted", "is contradicted: the backyard wells were in the village itself, and the spring needed more than a mile of pipe.")]),
 I("IR4-P05-5", "purpose", "hard", "The author mentions that Fenn \"admitted that they would\" rot mainly to",
   ["show that he was frank about a weakness that later proved real",
    "explain why the council refused to pay for any of the pipeline",
    "suggest that Fenn had begun to doubt his own measurements",
    "show that iron pipe had already replaced wood in other towns"],
   "show that he was frank about a weakness that later proved real",
   "Fenn admitted that they would, in perhaps thirty years",
   "Fenn tells the council the logs will rot \"in perhaps thirty years,\" and by the late 1860s they leak, lasting \"about as long as Fenn had said they would.\"",
   [R("explain why the council refused to pay for any of the pipeline", "contradicted", "is contradicted: the council \"voted to pay for the first half mile.\""),
    R("suggest that Fenn had begun to doubt his own measurements", "invented", "has no support; the rot concerns the logs, not his survey of the spring's height."),
    R("show that iron pipe had already replaced wood in other towns", "invented", "has no support; iron pipe appears only in 1871, in Brackett's Mill.")]),
 I("IR4-P05-6", "attitude", "medium", "The council's attitude toward Fenn's proposal when he first made it is best described as",
   ["apprehensive", "enthusiastic", "resentful", "indifferent"], "apprehensive",
   "The council was cautious.",
   "the council worries over the cost, the farms, and the rot, then pays only for \"the first half mile\" and decides \"to wait and see.\"",
   [R("enthusiastic", "wrong time", "fits the later vote, after farmers crowded the trough, not the first response."),
    R("resentful", "invented", "has no support; the members ask questions but show no grudge against Fenn."),
    R("indifferent", "reversed", "is wrong: the council questions him closely and votes money for a trial.")],
   why2="The council voted to pay for the first half mile and to wait and see.")]})

P06 = """Every autumn, millions of small songbirds leave North America for the tropics, and most of them make the trip at night. The indigo bunting, a sparrow-sized bird whose males are a deep blue in summer, breeds across much of the eastern United States and spends the winter in Mexico, Central America, and the Caribbean. Young buntings typically make their first migration on their own. How a bird that has never made the journey knows which way to fly is a question that has occupied biologists for decades.

In the 1960s the biologist Stephen Emlen found a way to ask the birds directly. He placed a bunting in a funnel of paper with an ink pad at the bottom. A restless bird in migration season hops again and again up the sloping walls, and each hop leaves a smudge of ink. By morning, the pattern of footprints shows which direction the bird has been trying to go.

Outdoors, with the top of the funnel open to the night sky, caged buntings in autumn hopped mostly toward the south. Under heavy cloud, their footprints scattered. Emlen then moved the funnels into a planetarium, where he could control the stars. When the projected sky matched the real one, the birds oriented much as they did outdoors. When he turned the projection so that its north lay in a different direction, the birds shifted their hopping to match the false sky.

The most striking result came from birds raised by hand. Emlen kept young buntings in a planetarium where the projected sky turned, night after night, around Betelgeuse, a bright star in the constellation Orion, instead of around the North Star. In autumn, these birds behaved as though Betelgeuse marked north. They had learned, it seems, that the fixed point around which the sky wheels is north, and they had learned it by watching the sky move rather than by memorizing any particular pattern of stars.

In Emlen's experiments, birds raised without ever seeing the night sky hopped in no consistent direction. The turning itself seemed to be the lesson.

None of this means the stars are the whole story. Many migratory songbirds can also sense Earth's magnetic field, and some appear to use the setting sun, among other cues, to check one compass against another. Researchers are still working out how these systems are combined, and the answer may differ from one species to the next. But the planetarium results showed something remarkable about a bird that weighs roughly as much as a few coins: before it ever flies south, it has spent the nights of its first summer learning how to read the sky."""

sets.append({"passage_id": "IR4-P06", "title": "A Sky That Turns", "genre": "science", "passage": P06, "items": [
 I("IR4-P06-1", "main-idea", "easy", "The passage is mainly about",
   ["experiments showing that young buntings learn direction from the night sky",
    "the long autumn journey of the indigo bunting to its winter range",
    "a paper funnel that records the direction a caged bird tries to move",
    "evidence that migrating songbirds steer by Earth's magnetic field"],
   "experiments showing that young buntings learn direction from the night sky",
   "they had learned it by watching the sky move rather than by memorizing any particular pattern of stars",
   "most of the passage reports Emlen's funnel and planetarium experiments, ending with the finding that a bunting spends its first summer \"learning how to read the sky.\"",
   [R("the long autumn journey of the indigo bunting to its winter range", "part not whole", "takes the first paragraph's background as the subject; the journey itself is never followed."),
    R("a paper funnel that records the direction a caged bird tries to move", "too narrow", "takes the tool for the finding; the funnel is how Emlen asked the question, not what he learned."),
    R("evidence that migrating songbirds steer by Earth's magnetic field", "central misreading", "is wrong: the magnetic field is mentioned only in the last paragraph, as another cue beside the stars.")]),
 I("IR4-P06-2", "detail", "medium", "According to the passage, the ink pad in Emlen's funnel was used to",
   ["record which way the bird kept hopping",
    "mark which birds had been raised by hand",
    "measure how far each bird flew in a night",
    "keep the bird from climbing out of the top"],
   "record which way the bird kept hopping",
   "each hop leaves a smudge of ink",
   "each hop \"leaves a smudge of ink,\" and by morning the footprints show \"which direction the bird has been trying to go.\"",
   [R("mark which birds had been raised by hand", "misplaced detail", "borrows the hand-raised birds from the fourth paragraph; the ink marks hops, not birds."),
    R("measure how far each bird flew in a night", "invented", "is wrong: the bird is caged in the funnel and only hops; the ink shows direction, not distance."),
    R("keep the bird from climbing out of the top", "invented", "has no support; the top is described as \"open to the night sky\" so the bird can see out.")]),
 I("IR4-P06-3", "vocabulary-in-context", "medium", "As it is used in the fourth paragraph, the word \"fixed\" most nearly means",
   ["staying in one place", "repaired after damage", "prepared, as a meal is", "dishonestly arranged"],
   "staying in one place",
   "the fixed point around which the sky wheels is north",
   "the sky \"wheels\" around this point, so it is the one point that does not move.",
   [R("repaired after damage", "other sense", "is the sense of a fixed bicycle; nothing in the sky has been mended."),
    R("prepared, as a meal is", "other sense", "is the informal sense of fixing dinner, which does not fit a point in the sky."),
    R("dishonestly arranged", "other sense", "is the sense of a fixed contest; the sentence describes the sky's motion.")]),
 I("IR4-P06-4", "inference", "hard", "It can be inferred that the caged buntings' footprints scattered under heavy cloud because the birds",
   ["could no longer see the stars they used to choose a direction",
    "could no longer sense Earth's magnetic field through the clouds",
    "were too cold under the clouds to hop up the funnel's sloping walls",
    "had been raised by hand without ever seeing a turning night sky"],
   "could no longer see the stars they used to choose a direction",
   "Under heavy cloud, their footprints scattered.",
   "with an open sky they hopped \"mostly toward the south,\" and in the planetarium they followed the projected stars, so hiding the stars removed the cue they steered by.",
   [R("could no longer sense Earth's magnetic field through the clouds", "misapplied fact", "is wrong: the passage presents the magnetic sense as separate from sight, and nothing says clouds block it."),
    R("were too cold under the clouds to hop up the funnel's sloping walls", "contradicted", "is contradicted: the footprints \"scattered,\" so the birds were still hopping."),
    R("had been raised by hand without ever seeing a turning night sky", "misplaced detail", "confuses these outdoor birds with the separate hand-raised groups of the fourth and fifth paragraphs.")]),
 I("IR4-P06-5", "purpose", "hard", "The author mentions that a bunting \"weighs roughly as much as a few coins\" mainly to",
   ["stress how much a very small bird has learned before its first trip",
    "explain why buntings must make their long journey only at night",
    "show why small birds are easy to study in funnels made of paper",
    "suggest that heavier birds find their way by using other cues"],
   "stress how much a very small bird has learned before its first trip",
   "weighs roughly as much as a few coins",
   "the tiny weight is set against what the bird has done \"before it ever flies south\": learned \"how to read the sky.\"",
   [R("explain why buntings must make their long journey only at night", "invented", "has no support; the passage never explains night travel, and weight is not linked to it."),
    R("show why small birds are easy to study in funnels made of paper", "invented", "has no support; the weight appears in the closing sentence about learning, not with the funnel."),
    R("suggest that heavier birds find their way by using other cues", "invented", "has no support; the passage says cues may differ \"from one species to the next,\" not by weight.")]),
 I("IR4-P06-6", "attitude", "medium", "The author's attitude toward the results of Emlen's planetarium experiments is best described as",
   ["intrigued", "doubtful", "detached", "uneasy"], "intrigued",
   "The most striking result came from birds raised by hand.",
   "the author calls one result \"The most striking\" and says the experiments \"showed something remarkable.\"",
   [R("doubtful", "concession misread", "mistakes the caution that the stars are not \"the whole story\" for doubt; the author accepts the results and only adds other cues."),
    R("detached", "register misread", "is wrong: words like \"striking\" and \"remarkable\" show interest, not a flat report."),
    R("uneasy", "invented", "has no support; nothing in the results is presented as troubling.")],
   why2="But the planetarium results showed something remarkable")]})

json.dump(sets, open('authored/d4.json', 'w'), indent=1, ensure_ascii=False)
print(len(sets))
