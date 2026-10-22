import json
# ISEE Upper Level Reading, draft 5 (2026-10-22). Four choices per item.
# Co-founder rules applied (from SSAT d4 / ISEE d1 notes):
#  1. main-idea distractors are on-topic: a real part but not the whole, too narrow, or a central misreading
#  2. attitude sets tailored per passage; no two sets in the batch share more than one word
#  3. inference / purpose keys combine two pieces of the passage, never restate one sentence
#  4. story logic checked line by line, not only the key
#  5. vocabulary distractors are senses that cannot fit the context
def R(c, lure, r): return {"choice": c, "lure": lure, "reason": '"' + c + '" ' + r}
def I(qid, kind, diff, prompt, choices, key, why, expl, rats, why2=None):
    d = {"qid": qid, "kind": kind, "difficulty": diff, "prompt": prompt, "choices": choices, "correct_answer": key,
         "why": why, "explanation": X(key, expl), "distractor_rationales": rats}
    if why2: d["why2"] = why2
    return d
def X(k, c): return f"\"{k}\" is correct: {c}"
sets = []

P01 = """The resolution for the November tournament was printed on a half sheet of paper taped to the door of Room 114: Resolved, that Carver City should pave the gravel path along Ash Creek. Mina read it twice. She walked that path every morning. She knew the place where it dipped under the willows and the stretch where the gravel crunched so loudly that the herons lifted off the water before she reached them. Paving it would be a mistake, and she could have argued that in her sleep.

Then Mr. Abara shook the coffee can, and Mina drew a slip that said AFFIRMATIVE.

"I'd like to trade," she said.

"Everybody would," said Mr. Abara. "Write me the best case for paving by Thursday. If it's a weak case, I'll know you wrote it that way on purpose."

She went to the public library meaning to do just enough to satisfy him. The city's maintenance reports were kept in binders on a shelf behind the reference desk. Every spring, the reports said, heavy rain washed gravel off the low stretch of the path and into Ash Creek, and every summer a crew spread new gravel over the bare clay. In one wet year the crew had come out three times. The fine grit from the path, a city biologist had written, settled over the stream bed where small fish laid their eggs. Mina read that page and then sat for a while with the binder open in front of her.

By Thursday she had four pages. Mr. Abara read them with his pen capped and handed them back without a mark.

At the tournament her opponent was a tall boy from Westfield who argued the case Mina would have made: the crunch underfoot, the herons, the way a path ought to feel different from a street. He argued it well. When her turn came to answer, she found she knew exactly where each of his points was thinnest, because she had leaned on them herself all week. The herons, she said, would lift off the water whether the path was gravel or asphalt. The fish under the grit would get no warning at all.

She won the round. The judge wrote on her ballot that she had seemed to believe every word.

The next morning Mina walked the path to school as usual. At the low stretch under the willows she stopped and looked down at the gray fan of grit spread across the clay toward the water. She had walked over that spot for three years. She stood there long enough that a heron, out in the shallows, went back to fishing."""

sets.append({"passage_id": "IR5-P01", "title": "The Affirmative", "genre": "fiction", "passage": P01, "items": [
 I("IR5-P01-1", "main-idea", "easy", "The passage is mainly about",
   ["a student whose assigned side in a debate changes how she sees a familiar place",
    "a student who loses a debate round because she argued a side she disliked",
    "a debate coach who expects his students to write deliberately weak cases",
    "a city's plan to pave the gravel path that runs beside a local creek"],
   "a student whose assigned side in a debate changes how she sees a familiar place",
   "She had walked over that spot for three years.",
   "Mina starts out sure that paving \"would be a mistake,\" draws the side for paving, learns from the reports what the gravel does to the creek, and ends by stopping to look at the grit she had walked over for three years.",
   [R("a student who loses a debate round because she argued a side she disliked", "central misreading", "is wrong: Mina wins the round arguing for paving, the side she first thought \"would be a mistake.\""),
    R("a debate coach who expects his students to write deliberately weak cases", "central misreading", "is wrong: Mr. Abara warns that he will know if she writes a weak case \"on purpose\"; he wants the best case."),
    R("a city's plan to pave the gravel path that runs beside a local creek", "part not whole", "takes the debate resolution as a real plan; nothing says the city intends to pave the path, and the passage follows Mina.")]),
 I("IR5-P01-2", "detail", "medium", "According to the passage, the city's maintenance reports said that every spring",
   ["heavy rain washed gravel from the path into the creek",
    "a crew paved part of the low stretch under the willows",
    "the herons left the creek because the path was so noisy",
    "the creek rose high enough to close the path to walkers"],
   "heavy rain washed gravel from the path into the creek",
   "Every spring, the reports said, heavy rain washed gravel off the low stretch of the path and into Ash Creek",
   "the reports say that \"Every spring\" heavy rain washed gravel \"into Ash Creek,\" and a crew spread new gravel each summer.",
   [R("a crew paved part of the low stretch under the willows", "distortion", "is wrong: the summer crew \"spread new gravel over the bare clay\"; nothing was paved."),
    R("the herons left the creek because the path was so noisy", "misplaced detail", "borrows Mina's own experience of the herons lifting off; the reports say nothing about birds."),
    R("the creek rose high enough to close the path to walkers", "invented", "has no support; the reports describe gravel washing away, not a closed path.")]),
 I("IR5-P01-3", "vocabulary-in-context", "medium", "As it is used in the seventh paragraph, the word \"thinnest\" most nearly means",
   ["weakest or least well supported", "narrowest from one side to the other", "most watery and least thick", "having the least fat on the body"],
   "weakest or least well supported",
   "she found she knew exactly where each of his points was thinnest",
   "Mina knows where his points are thinnest \"because she had leaned on them herself all week,\" testing them for weakness, and then she answers them.",
   [R("narrowest from one side to the other", "literal sense", "is the physical sense, as of a thin board; an argument's points have no width."),
    R("most watery and least thick", "other sense", "is the sense used for soup or paint, which does not fit points in a debate."),
    R("having the least fat on the body", "other sense", "is the sense used for people or animals; the word describes his points, not the boy from Westfield.")]),
 I("IR5-P01-4", "inference", "hard", "The last paragraph suggests that Mina",
   ["now notices on the path what her research for the debate described",
    "has decided that the city should pave the path as soon as it can",
    "wishes she had lost the round to the boy who argued for the gravel",
    "has stopped taking the path along Ash Creek on her way to school"],
   "now notices on the path what her research for the debate described",
   "looked down at the gray fan of grit spread across the clay toward the water",
   "the reports said grit from the path washed toward the creek, and now Mina stops at the low stretch to look at \"the gray fan of grit\" over a spot she \"had walked over\" for three years without stopping.",
   [R("has decided that the city should pave the path as soon as it can", "overreach", "goes beyond the passage: she stops and looks, but nothing says what she has decided."),
    R("wishes she had lost the round to the boy who argued for the gravel", "invented", "has no support; the round is over, and the last paragraph is about the path, not the result."),
    R("has stopped taking the path along Ash Creek on her way to school", "contradicted", "is contradicted: she \"walked the path to school as usual.\"")]),
 I("IR5-P01-5", "purpose", "hard", "The author includes the judge's comment that Mina \"had seemed to believe every word\" mainly to",
   ["hint that the case Mina argued had begun to become partly her own",
    "show that the judge knew Mina had drawn the side she first opposed",
    "suggest that the boy from Westfield had argued his own side rather poorly",
    "explain why Mr. Abara handed back her four pages without a mark"],
   "hint that the case Mina argued had begun to become partly her own",
   "The judge wrote on her ballot that she had seemed to believe every word.",
   "Mina began meaning \"to do just enough,\" but after the reports and the round, the judge sees belief in her, and the next morning she stops at the grit she used to walk past.",
   [R("show that the judge knew Mina had drawn the side she first opposed", "invented", "has no support; the sides were drawn from a coffee can at school, and nothing says the judge knew her views."),
    R("suggest that the boy from Westfield had argued his own side rather poorly", "contradicted", "is contradicted: \"He argued it well.\""),
    R("explain why Mr. Abara handed back her four pages without a mark", "misplaced detail", "is wrong: the pages come back before the tournament, and the judge's comment explains nothing about them.")]),
 I("IR5-P01-6", "attitude", "medium", "At the beginning of the passage, Mina's attitude toward the idea of paving the path is best described as",
   ["disapproving", "enthusiastic", "indifferent", "humorous"], "disapproving",
   "Paving it would be a mistake, and she could have argued that in her sleep.",
   "she thinks paving \"would be a mistake\" and asks to trade when she draws the side for it.",
   [R("enthusiastic", "wrong time", "fits how she sounds in the round, where the judge thought she believed every word, not how she feels at the start."),
    R("indifferent", "reversed", "is wrong: she walks the path \"every morning\" and has a firm view about it."),
    R("humorous", "invented", "has no support; she finds nothing funny in the resolution or in drawing the side for paving.")],
   why2="\"I'd like to trade,\" she said.")]})

P02 = """By five the lot behind the feed store
is asphalt and painted lines and one tall light,
and then the trucks back in, one by one,
each with its small reverse-gear song.

My father drops the tailgate. We unfold
the table legs, snap the blue tarp square,
and stack the crates the way he likes them,
the reddest tomatoes at the front, the bruised ones

turned to face the back, where only we will see them.
Across the aisle the Ortegas hang their scale
from a hook and set a stone on each corner
of their cloth, so the wind will leave it be.

Nobody talks much. A woman from the egg stall
walks over with a coil of rope and ties
the loose corner of our tarp to the truck
without being asked, then goes back to her cartons.

The bread man hands my father the heel
of yesterday's loaf, and my father hands him
a pepper, and neither says a word about it.
This is how the market opens:

before any customer, a trade of small things
up and down the rows, a lent clip,
a borrowed knife, a hand on the far end
of a pole that someone could not lift alone.

At seven the first shoppers come,
holding their coffees, asking prices,
turning a melon over to knock on it.
They see a market. They see tables, signs,

a man who weighs out peaches on a scale.
I see the rope on our corner, the knife
still on our table that belongs to the Ortegas,
the egg woman bending again to her cartons.

By two it all comes down. The trucks pull out.
The lot goes back to painted lines
and asphalt and one tall light,
and you would never guess, driving past,

that for nine hours it held a town,
or that the town was put together at five
by people lending one another
the things they had forgotten to bring."""

sets.append({"passage_id": "IR5-P02", "title": "Five O'Clock Lot", "genre": "poetry", "passage": P02, "items": [
 I("IR5-P02-1", "main-idea", "easy", "The poem is mainly about",
   ["the quiet help that vendors give one another as they set up a market",
    "a father and child arranging their vegetables on a table at a market",
    "the shoppers who arrive at seven to look over the produce at a market",
    "a parking lot that the town wants to turn into a permanent market"],
   "the quiet help that vendors give one another as they set up a market",
   "This is how the market opens:",
   "the poem dwells on the rope, the bread and the pepper, the lent clip and knife, and ends by saying the market was \"put together at five / by people lending one another\" what they forgot.",
   [R("a father and child arranging their vegetables on a table at a market", "part not whole", "takes the second stanza as the subject; the poem soon turns to what the other vendors do for each other."),
    R("the shoppers who arrive at seven to look over the produce at a market", "part not whole", "takes the seventh stanza as the subject; the shoppers matter mainly for what they fail to see."),
    R("a parking lot that the town wants to turn into a permanent market", "invented", "has no support; the market leaves the lot empty again each day, and no one plans to keep it.")]),
 I("IR5-P02-2", "detail", "medium", "According to the poem, the woman from the egg stall",
   ["ties the loose corner of the speaker's tarp to the truck",
    "lends the speaker's father a knife for the morning",
    "gives the speaker's father a piece of yesterday's loaf",
    "sets a stone on each corner of her stall's cloth"],
   "ties the loose corner of the speaker's tarp to the truck",
   "walks over with a coil of rope and ties the loose corner of our tarp to the truck",
   "she \"walks over with a coil of rope and ties / the loose corner of our tarp to the truck.\"",
   [R("lends the speaker's father a knife for the morning", "misplaced detail", "is wrong: the knife on the speaker's table \"belongs to the Ortegas.\""),
    R("gives the speaker's father a piece of yesterday's loaf", "misplaced detail", "borrows the bread man's trade with the father."),
    R("sets a stone on each corner of her stall's cloth", "misplaced detail", "is what the Ortegas do across the aisle, not the egg woman.")]),
 I("IR5-P02-3", "vocabulary-in-context", "medium", "As it is used in the fifth stanza, the word \"heel\" most nearly means",
   ["the end piece of a loaf of bread", "the rounded back part of the human foot", "the raised part on the bottom of a shoe", "a person who treats other people badly"],
   "the end piece of a loaf of bread",
   "The bread man hands my father the heel of yesterday's loaf,",
   "the bread man hands over \"the heel / of yesterday's loaf,\" the crusty end of the bread.",
   [R("the rounded back part of the human foot", "literal sense", "is the body sense; the heel here belongs to a loaf."),
    R("the raised part on the bottom of a shoe", "other sense", "is the shoemaker's sense, which cannot be part of a loaf."),
    R("a person who treats other people badly", "other sense", "is an informal sense for a person; the bread man hands over a thing, not a person.")]),
 I("IR5-P02-4", "inference", "hard", "The detail that \"neither says a word about\" the trade of bread for a pepper suggests that",
   ["such small exchanges are an ordinary, expected part of the vendors' mornings",
    "the bread man and the speaker's father are on bad terms with each other",
    "the bread man expects the speaker's father to pay him for the bread later in cash",
    "the speaker's father thinks the old bread is too stale to be worth thanks"],
   "such small exchanges are an ordinary, expected part of the vendors' mornings",
   "and neither says a word about it.",
   "the trade needs no words, the egg woman ties the tarp \"without being asked,\" and the speaker calls such trades \"how the market opens,\" so they are routine.",
   [R("the bread man and the speaker's father are on bad terms with each other", "reversed", "is wrong: each hands the other something, which is a friendly act, and the silence matches the stanza before, where \"Nobody talks much.\""),
    R("the bread man expects the speaker's father to pay him for the bread later in cash", "contradicted", "is contradicted: the father pays at once, with \"a pepper.\""),
    R("the speaker's father thinks the old bread is too stale to be worth thanks", "invented", "has no support; the poem says nothing about the bread's quality or the father's view of it.")]),
 I("IR5-P02-5", "purpose", "hard", "The poet includes the lines \"They see a market\" and \"I see the rope on our corner\" mainly to",
   ["contrast what the shoppers notice with the help the speaker saw that morning",
    "suggest that the shoppers are rude to the vendors as they look over the food",
    "show that the speaker would rather be a shopper than work behind a table",
    "explain how the vendors decide what prices to ask for their peaches"],
   "contrast what the shoppers notice with the help the speaker saw that morning",
   "They see a market. They see tables, signs,",
   "the shoppers see \"tables, signs\" and a man weighing peaches, while the speaker sees the egg woman's rope and the Ortegas' knife, signs of the trades made before seven.",
   [R("suggest that the shoppers are rude to the vendors as they look over the food", "invented", "has no support; the shoppers only hold coffees, ask prices, and knock on a melon."),
    R("show that the speaker would rather be a shopper than work behind a table", "invented", "has no support; the speaker values what only a vendor sees."),
    R("explain how the vendors decide what prices to ask for their peaches", "misplaced detail", "is wrong: shoppers are \"asking prices,\" but the poem never explains how prices are set.")]),
 I("IR5-P02-6", "attitude", "medium", "The speaker's attitude toward the other vendors is best described as",
   ["appreciative", "apprehensive", "whimsical", "impartial"], "appreciative",
   "I see the rope on our corner, the knife still on our table that belongs to the Ortegas,",
   "the speaker notices every small kindness, the rope and the borrowed knife, and closes by crediting the market to \"people lending one another\" what they need.",
   [R("apprehensive", "invented", "has no support; vendors walk into the speaker's stall and help freely, and nothing in the poem is dreaded or guarded against."),
    R("whimsical", "tone of one image", "fits at most the trucks' \"reverse-gear song\"; the vendors themselves are described plainly and seriously."),
    R("impartial", "reversed", "is wrong: the speaker singles out the help others give and sets it against what shoppers miss.")],
   why2="by people lending one another the things they had forgotten to bring.")]})

P03 = """My mother tried first. We went out on a Sunday in her sedan, the week I got my learner's permit, and within ten minutes she was holding the handle above her door and saying "Brake, brake, brake" in a voice that made my foot jump onto the pedal. We came home early. That evening my grandmother, who had driven a mail route in the county for twenty-two years, said she would take me out instead.

Her car was a long tan station wagon with a bench seat. On the first afternoon she drove us to the empty lot behind the grange hall, got out, and walked around to the passenger side. Then she took a paper cup from her bag, filled it to the brim from her thermos, and set it on the flat part of the dashboard.

"Drive," she said. "Try to keep my coffee in the cup."

I spilled it in the first thirty seconds. She mopped the dashboard with a handkerchief, refilled the cup, and said nothing. I spilled it again at the first turn and again when I stopped at the end of the lot. By the end of the hour I was gripping the wheel so hard my hands ached, and I wanted to tell her that real drivers kept their coffee in a holder.

We went out every Sunday that spring. Slowly I learned what the cup wanted. It wanted me to brake long before the stop sign, a little at first and then more. It wanted me to turn the wheel early and smoothly, instead of late and all at once. Most of all it wanted me to look farther ahead, because the only way to stop gently is to see the stop coming. When I watched the hood of the car, the coffee sloshed. When I watched the corner at the far end of the lot, it stayed level.

By June we were driving the county roads. My grandmother still brought the cup. She never told me I was doing well. Instead, at some point each afternoon, she would reach over, pick up the coffee, and drink it.

I have had my license for eleven years now. My grandmother gave up driving two winters ago, and when I visit, I take her to the grocery store and the library in her old wagon. She rides with a cup of coffee in her hand, no lid, and looks out the window at the fields going by."""

sets.append({"passage_id": "IR5-P03", "title": "The Cup on the Dashboard", "genre": "memoir", "passage": P03, "items": [
 I("IR5-P03-1", "main-idea", "easy", "The passage is mainly about",
   ["how a grandmother's unusual method taught the author to drive smoothly",
    "a mother whose nerves made the author's first driving lesson go badly",
    "the long career of a grandmother who drove a mail route in the county",
    "the author's habit of driving a grandmother to the store in her old car"],
   "how a grandmother's unusual method taught the author to drive smoothly",
   "Slowly I learned what the cup wanted.",
   "most of the passage follows the coffee-cup lessons, from the first spills to braking early and looking ahead, and ends with the grandmother riding with an open cup.",
   [R("a mother whose nerves made the author's first driving lesson go badly", "part not whole", "takes the first paragraph as the subject; the mother's lesson only leads to the grandmother's."),
    R("the long career of a grandmother who drove a mail route in the county", "part not whole", "takes one background detail as the subject; the mail route is mentioned once."),
    R("the author's habit of driving a grandmother to the store in her old car", "part not whole", "takes the last paragraph as the whole passage.")]),
 I("IR5-P03-2", "detail", "medium", "According to the passage, the coffee stayed level when the author",
   ["watched the far corner of the lot instead of the hood",
    "held the steering wheel as tightly as possible",
    "braked hard just before reaching the stop sign",
    "drove with the grandmother holding the cup"],
   "watched the far corner of the lot instead of the hood",
   "When I watched the corner at the far end of the lot, it stayed level.",
   "\"When I watched the hood of the car, the coffee sloshed. When I watched the corner at the far end of the lot, it stayed level.\"",
   [R("held the steering wheel as tightly as possible", "misplaced detail", "is wrong: the author gripped the wheel \"so hard my hands ached\" on the first afternoon, the day of all the spills."),
    R("braked hard just before reaching the stop sign", "reversed", "reverses the lesson to \"brake long before the stop sign, a little at first and then more.\""),
    R("drove with the grandmother holding the cup", "misplaced detail", "is wrong: during the lessons the cup sat \"on the flat part of the dashboard\"; she picks it up only to drink it.")]),
 I("IR5-P03-3", "vocabulary-in-context", "medium", "As it is used in the fifth paragraph, the word \"level\" most nearly means",
   ["flat and steady, without tipping", "equal in score with a rival", "honest and direct in speech", "at a certain stage of skill or ability"],
   "flat and steady, without tipping",
   "When I watched the corner at the far end of the lot, it stayed level.",
   "the coffee \"sloshed\" in one case and stayed level in the other, so level means its surface stayed flat and still.",
   [R("equal in score with a rival", "other sense", "is the sports sense, as when two teams are level; the coffee is competing with nothing."),
    R("honest and direct in speech", "other sense", "is the sense of being level with someone, which cannot describe coffee."),
    R("at a certain stage of skill or ability", "other sense", "is the sense of a beginner's level; the sentence describes the coffee in the cup, not the author's skill.")]),
 I("IR5-P03-4", "inference", "hard", "The detail that the grandmother now rides with a cup of coffee and \"no lid\" suggests that she",
   ["trusts the author to drive as smoothly as the old lessons required",
    "has forgotten the lessons she once gave the author in the empty lot",
    "wants to test the author's driving again before each trip to town",
    "has started to drink much more coffee since she gave up driving"],
   "trusts the author to drive as smoothly as the old lessons required",
   "She rides with a cup of coffee in her hand, no lid, and looks out the window",
   "an open cup was the test of smooth driving, and drinking it was her only praise; now she holds one with \"no lid\" and simply \"looks out the window,\" unconcerned.",
   [R("has forgotten the lessons she once gave the author in the empty lot", "invented", "has no support; the open cup echoes the lessons rather than showing she has forgotten them."),
    R("wants to test the author's driving again before each trip to town", "reversed", "is wrong: she holds the cup and \"looks out the window at the fields,\" which is not how a tester behaves."),
    R("has started to drink much more coffee since she gave up driving", "invented", "has no support; she brought coffee to every lesson years before.")]),
 I("IR5-P03-5", "purpose", "hard", "The author describes the lesson with the mother in the first paragraph mainly to",
   ["set up a contrast with the grandmother's calm and nearly silent way of teaching",
    "explain why the author was afraid to drive at all for several years afterward",
    "show that the mother was a careless driver who should not have been teaching anyone",
    "describe how the author earned a learner's permit during the week before"],
   "set up a contrast with the grandmother's calm and nearly silent way of teaching",
   "saying \"Brake, brake, brake\" in a voice that made my foot jump onto the pedal",
   "the mother holds the handle and calls out warnings that make the author's foot jump, while the grandmother mops up spills and \"said nothing,\" letting the cup do the teaching.",
   [R("explain why the author was afraid to drive at all for several years afterward", "contradicted", "is contradicted: the grandmother takes the author out that same week, and they go out \"every Sunday that spring.\""),
    R("show that the mother was a careless driver who should not have been teaching anyone", "misattributed", "is wrong: the author was the one driving; the mother was the passenger giving warnings."),
    R("describe how the author earned a learner's permit during the week before", "misplaced detail", "is wrong: the permit is mentioned only to date the lesson, and nothing says how it was earned.")]),
 I("IR5-P03-6", "attitude", "medium", "In the first paragraph, the mother's attitude while the author drives is best described as",
   ["anxious", "indignant", "playful", "detached"], "anxious",
   "she was holding the handle above her door",
   "within ten minutes she is gripping the handle above her door and repeating \"Brake, brake, brake.\"",
   [R("indignant", "misread intensity", "is wrong: her words are warnings to brake; nothing suggests she feels insulted or wronged."),
    R("playful", "invented", "has no support; the lesson ends early, with nothing light about it."),
    R("detached", "reversed", "is wrong: she is so involved that her voice makes the author's foot jump onto the pedal.")],
   why2="We came home early.")]})

P04 = """At the entrance to the state park near my house there is a large map on a post, under a little roof, with a red dot that says YOU ARE HERE. I have watched a good many hikers stand in front of it, find the dot, find the lake they want, and then set off confidently in exactly the wrong direction.

The fault is the map's, and it is easy to see once you know where to look. The map is drawn the way nearly every map is drawn, with north at the top. But the board is set so that anyone reading it is facing south. The top of the map, the part that seems to lie straight ahead, is really behind her. A lake drawn above the dot lies at her back. She walks toward it, which is to say away from it.

We tend to treat north at the top as a fact about the world, but it is a habit. Many medieval European maps put east at the top, and mapmakers in other places and times have used other directions. North won out for good reasons, and for a map you hold in your hands it works well: you can always turn the paper until the roads on it line up with the roads in front of you. People do this without thinking, rotating a folded map as they walk.

A map bolted to a post is a different object. It cannot be turned, so the reader must do the turning in her head, and that is exactly the kind of mental work people do poorly when they are tired, hurried, or in a strange place. Psychologists who have tested such signs report that people make more wrong turns when the map is set at an angle to the scene in front of them than when it lines up with it.

The remedy costs almost nothing. A map that will be read in one fixed spot should be drawn to match that spot: whatever lies ahead of the reader goes at the top, and whatever lies to her left goes on the left. A small arrow can show where north is for those who want it. Such a map would look odd in an atlas. On a post at a trailhead it would simply be correct.

I have made this argument to friends who love maps, and they usually object that it would be confusing to have maps pointing every which way. But a person standing at a trailhead is using one map, not comparing a hundred. For her, the only direction that matters is the one she is facing."""

sets.append({"passage_id": "IR5-P04", "title": "You Are Here", "genre": "essay", "passage": P04, "items": [
 I("IR5-P04-1", "main-idea", "easy", "Which of the following best states the main idea of the passage?",
   ["A map read in one fixed spot should be drawn to match the reader's view.",
    "People read maps poorly when they are tired, hurried, or in a strange place.",
    "Mapmakers first put north at the top after they stopped putting east there.",
    "Maps carried in the hand are more useful than maps fixed to posts in parks."],
   "A map read in one fixed spot should be drawn to match the reader's view.",
   "A map that will be read in one fixed spot should be drawn to match that spot",
   "the author explains why hikers walk the wrong way from a north-up sign that faces south and proposes drawing such maps so that \"whatever lies ahead of the reader goes at the top.\"",
   [R("People read maps poorly when they are tired, hurried, or in a strange place.", "too narrow", "is one step in the fourth paragraph's reasoning, used to show why a fixed map should not make the reader turn it in her head."),
    R("Mapmakers first put north at the top after they stopped putting east there.", "distortion", "misreads the third paragraph, which mentions east at the top only to show that north is \"a habit,\" and gives no such history."),
    R("Maps carried in the hand are more useful than maps fixed to posts in parks.", "central misreading", "is wrong: the author says north-up works well for a map in the hand and wants posted maps redrawn, not replaced.")]),
 I("IR5-P04-2", "detail", "medium", "According to the author, a map held in the hands works well with north at the top because the reader can",
   ["turn the paper until its roads line up with the real ones",
    "check it against the same region's map in an atlas",
    "find north by looking for the small arrow drawn on it",
    "see the lake drawn above the red YOU ARE HERE dot"],
   "turn the paper until its roads line up with the real ones",
   "you can always turn the paper until the roads on it line up with the roads in front of you",
   "for a map in the hands, \"you can always turn the paper until the roads on it line up with the roads in front of you.\"",
   [R("check it against the same region's map in an atlas", "misplaced detail", "borrows the atlas from the fifth paragraph, where it is mentioned only to say an aligned map would look odd there."),
    R("find north by looking for the small arrow drawn on it", "misplaced detail", "borrows the arrow the author proposes adding to posted maps."),
    R("see the lake drawn above the red YOU ARE HERE dot", "misplaced detail", "borrows the posted trailhead map, which is the map that misleads hikers.")]),
 I("IR5-P04-3", "vocabulary-in-context", "medium", "As it is used in the second paragraph, the word \"fault\" most nearly means",
   ["the blame for something gone wrong", "a crack in rock where the ground has moved", "a serve that lands outside its proper area", "a break or short in an electric circuit"],
   "the blame for something gone wrong",
   "The fault is the map's, and it is easy to see once you know where to look.",
   "the hikers walk \"in exactly the wrong direction,\" and the author says the fault is the map's, that is, the map is to blame.",
   [R("a crack in rock where the ground has moved", "other sense", "is the geologist's sense; the park is the setting, but the sentence assigns the fault to a map, which has no rock."),
    R("a serve that lands outside its proper area", "other sense", "is the tennis sense, which has no place in a paragraph about reading a map."),
    R("a break or short in an electric circuit", "other sense", "is the electrician's sense; the map on the post is a board under a little roof, with no wiring.")]),
 I("IR5-P04-4", "inference", "hard", "Suppose a trailhead map is read by hikers who face south, toward a lake. The author would most likely say the lake should be drawn",
   ["at the top of the map, above the reader's dot",
    "at the bottom, so that north can stay at the top",
    "wherever an atlas of the region would place it",
    "beside a small arrow at the left edge of the map"],
   "at the top of the map, above the reader's dot",
   "whatever lies ahead of the reader goes at the top",
   "the lake lies ahead of hikers facing south, and the author's rule is that \"whatever lies ahead of the reader goes at the top.\"",
   [R("at the bottom, so that north can stay at the top", "reversed", "is the north-up drawing that sends hikers off \"in exactly the wrong direction.\""),
    R("wherever an atlas of the region would place it", "reversed", "is wrong: the author grants that an aligned map \"would look odd in an atlas\" and says that does not matter at a trailhead."),
    R("beside a small arrow at the left edge of the map", "misplaced detail", "misuses the arrow, which shows \"where north is,\" not where the lake goes; the lake ahead belongs at the top.")]),
 I("IR5-P04-5", "purpose", "hard", "The author describes hikers who \"set off confidently in exactly the wrong direction\" mainly to",
   ["present a familiar problem whose cause the essay goes on to explain",
    "suggest that most hikers seldom bother to read the maps at trailheads",
    "show that the paths in the state park are poorly marked and maintained",
    "argue that maps ought to be taken down from the entrances of parks"],
   "present a familiar problem whose cause the essay goes on to explain",
   "and then set off confidently in exactly the wrong direction",
   "the hikers' mistake opens the essay, and the next paragraph begins, \"The fault is the map's,\" explaining that a north-up board read facing south puts the lake behind the reader.",
   [R("suggest that most hikers seldom bother to read the maps at trailheads", "contradicted", "is contradicted: the hikers \"find the dot\" and \"find the lake they want\" before setting off."),
    R("show that the paths in the state park are poorly marked and maintained", "invented", "has no support; the author blames the map's drawing, not the paths."),
    R("argue that maps ought to be taken down from the entrances of parks", "contradicted", "is contradicted: the author wants such maps redrawn, and says the remedy \"costs almost nothing.\"")]),
 I("IR5-P04-6", "attitude", "medium", "The author's attitude toward posted maps drawn with north at the top is best described as",
   ["critical", "reverent", "wistful", "objective"], "critical",
   "The fault is the map's, and it is easy to see once you know where to look.",
   "the author blames such a map for sending hikers the wrong way and proposes a remedy, ending with the reply to friends who object.",
   [R("reverent", "misattributed", "fits the \"friends who love maps,\" whose objection the author answers, not the author's view of these maps."),
    R("wistful", "misplaced detail", "misreads the mention of medieval maps, which is evidence that north-up is a habit, not a longing for the past."),
    R("objective", "register misread", "is wrong: the essay takes a side, blames the map, and argues against an objection.")],
   why2="But a person standing at a trailhead is using one map, not comparing a hundred.")]})

P05 = """For most of the 1870s, a farmer near Haskett who wanted to sell his wheat had two choices, and both of them stood on Depot Street. Amos Petch and the Lyle brothers ran the town's two grain buyers, and each morning they chalked a price on a board beside the door. A farmer could take that price or haul his wagon home. What wheat was fetching in the city, two hundred miles east, he could only guess from rumor and from newspapers that arrived a week or more after they were printed.

Samuel Breck, who owned the weekly Haskett Courier, thought a newspaper ought to be able to solve this problem. In the spring of 1876 the railroad opened a telegraph office in the depot, and Breck went to see the operator. They made an arrangement: every Friday afternoon, when the grain exchange in the city closed, the operator would wire to Haskett the day's closing price for wheat, and Breck would pay him a small fee for the trouble.

The first "Friday price" appeared in the Courier on May 12, set in a box at the top of the front page. Beneath it Breck printed a second figure, the cost of shipping a bushel by rail from Haskett to the city. A farmer who subtracted one from the other could see roughly what his wheat was worth on Depot Street.

The buyers objected at once. Petch called the box meddling and withdrew his advertisement, which had run on the back page for six years. The Lyle brothers said nothing in public, but their chalked price that Saturday was two cents higher than it had been the week before.

Within a year the box had changed how wheat was sold in Haskett. Farmers came to Depot Street with the Courier folded in their coat pockets, and a price that strayed too far below the box was argued over in the street. The paper's list of subscribers nearly doubled, most of the new names belonging to farms more than five miles out.

In October 1879 the box went wrong. A typesetter, working late, reversed two figures, and the price printed was eighteen cents higher than the price wired. Dozens of farmers turned down the buyers' offers and waited. The next week Breck printed a correction on the front page, larger than the box itself, and paid out of his own pocket for an extra edition carried to the outlying farms. It was an expensive way to apologize, and it is likely the reason the box kept its readers. After that, every figure was read back to the operator twice before it was set in type.

The Friday price ran in the same corner of the front page until 1911. By then many farms had telephones, and the figure the Courier printed on Friday was old news by Saturday."""

sets.append({"passage_id": "IR5-P05", "title": "The Friday Price", "genre": "history", "passage": P05, "items": [
 I("IR5-P05-1", "main-idea", "easy", "The passage is mainly about",
   ["how a weekly newspaper's wheat price changed the way a town's farmers sold grain",
    "a typesetting error that misled a town's farmers about the price of their wheat",
    "the opening of a telegraph office in a small town's railroad depot in 1876",
    "a quarrel between a newspaper owner and a grain buyer over an advertisement"],
   "how a weekly newspaper's wheat price changed the way a town's farmers sold grain",
   "Within a year the box had changed how wheat was sold in Haskett.",
   "the passage follows the Friday price from Breck's arrangement with the operator through the buyers' response, the farmers' use of it, the 1879 error, and its end in 1911.",
   [R("a typesetting error that misled a town's farmers about the price of their wheat", "part not whole", "takes the sixth paragraph as the subject; the error is one episode in the box's history."),
    R("the opening of a telegraph office in a small town's railroad depot in 1876", "part not whole", "takes one detail of the second paragraph as the subject; the office matters only because it made the box possible."),
    R("a quarrel between a newspaper owner and a grain buyer over an advertisement", "part not whole", "takes Petch's response in the fourth paragraph as the whole passage.")]),
 I("IR5-P05-2", "detail", "medium", "According to the passage, beneath the Friday price Breck printed",
   ["the cost of shipping a bushel of wheat to the city",
    "the prices the town's buyers had chalked that week",
    "a list of the farms that had just begun to subscribe",
    "the fee he paid the telegraph operator for each wire"],
   "the cost of shipping a bushel of wheat to the city",
   "Beneath it Breck printed a second figure, the cost of shipping a bushel by rail from Haskett to the city.",
   "\"Beneath it Breck printed a second figure, the cost of shipping a bushel by rail from Haskett to the city.\"",
   [R("the prices the town's buyers had chalked that week", "misplaced detail", "borrows the buyers' boards on Depot Street, which the farmers compared with the box."),
    R("a list of the farms that had just begun to subscribe", "misplaced detail", "borrows the growth in subscribers from the fifth paragraph; no list was printed under the price."),
    R("the fee he paid the telegraph operator for each wire", "misplaced detail", "borrows the \"small fee\" from the second paragraph; nothing says it was printed.")]),
 I("IR5-P05-3", "vocabulary-in-context", "medium", "As it is used in the fifth paragraph, the word \"strayed\" most nearly means",
   ["moved away from a standard", "wandered off from its herd", "lost its way in the dark", "drifted off the subject in thought"],
   "moved away from a standard",
   "a price that strayed too far below the box was argued over in the street",
   "the box gave a standard, and a buyer's price that strayed \"too far below the box\" moved away from it and was argued over.",
   [R("wandered off from its herd", "literal sense", "is the sense used for a cow or a sheep; a price has no herd."),
    R("lost its way in the dark", "other sense", "is the sense used for a traveler; the price is measured against the box, not lost."),
    R("drifted off the subject in thought", "other sense", "is the sense used for a wandering mind, which cannot describe a chalked price.")]),
 I("IR5-P05-4", "inference", "hard", "The farmers' response to the error in October 1879 suggests that by then they",
   ["relied on the Courier's figure as a guide to a fair price",
    "had begun selling their wheat directly at the city exchange",
    "doubted most of the figures the Courier printed each week",
    "blamed the telegraph operator for sending the wrong price"],
   "relied on the Courier's figure as a guide to a fair price",
   "Dozens of farmers turned down the buyers' offers and waited.",
   "farmers had been coming to Depot Street \"with the Courier folded in their coat pockets,\" and when the box showed a higher price, dozens turned down offers and waited, acting on the printed figure.",
   [R("had begun selling their wheat directly at the city exchange", "invented", "has no support; they still sold to the buyers on Depot Street, whose offers they turned down."),
    R("doubted most of the figures the Courier printed each week", "reversed", "is wrong: they acted on the wrong figure because they believed it."),
    R("blamed the telegraph operator for sending the wrong price", "contradicted", "is contradicted: the error was the typesetter's, who \"reversed two figures,\" and nothing says anyone blamed the operator.")]),
 I("IR5-P05-5", "purpose", "hard", "The author mentions that Petch withdrew his advertisement mainly to",
   ["show how strongly a buyer objected to farmers knowing the city price",
    "suggest that the Courier depended mostly on money from Petch's grain store",
    "show that Breck and Petch had long been personal enemies in the town of Haskett",
    "explain why the Friday price was later moved to the back page of the paper"],
   "show how strongly a buyer objected to farmers knowing the city price",
   "Petch called the box meddling and withdrew his advertisement, which had run on the back page for six years.",
   "the box let a farmer see \"roughly what his wheat was worth on Depot Street,\" and Petch gave up a six-year advertisement rather than support it, which shows what the box cost the buyers.",
   [R("suggest that the Courier depended mostly on money from Petch's grain store", "contradicted", "is contradicted: the paper's subscribers \"nearly doubled\" after the box appeared, and the box ran for decades."),
    R("show that Breck and Petch had long been personal enemies in the town of Haskett", "invented", "has no support; his advertisement had run in the Courier for six years before the box."),
    R("explain why the Friday price was later moved to the back page of the paper", "contradicted", "is contradicted: the box \"ran in the same corner of the front page until 1911.\"")]),
 I("IR5-P05-6", "attitude", "medium", "The author's attitude toward Breck's handling of the October 1879 error is best described as",
   ["approving", "scornful", "nostalgic", "humorous"], "approving",
   "It was an expensive way to apologize, and it is likely the reason the box kept its readers.",
   "the author notes that the correction was \"larger than the box itself\" and paid for from his own pocket, and credits it as \"likely the reason the box kept its readers.\"",
   [R("scornful", "misattributed", "fits Petch, who \"called the box meddling,\" not the author's view of Breck's correction."),
    R("nostalgic", "misplaced detail", "misreads the last paragraph, which reports the box's end without any longing for it."),
    R("humorous", "invented", "has no support; the error and the correction are reported plainly, with no joke.")],
   why2="paid out of his own pocket for an extra edition carried to the outlying farms")]})

P06 = """Ask a roomful of parents why teenagers stay up late and sleep until noon, and many will give the same answer: phones, video games, or simple laziness. Screens may play some part. But researchers who study sleep have found that much of the change begins inside the body, and that it arrives on a schedule of its own.

Two systems work together to decide when a person falls asleep. The first is a kind of pressure that builds the longer someone is awake. A person who has been up for sixteen hours feels a strong pull toward sleep; a nap or a night's rest relieves it. The second is the body's internal clock, a cluster of cells deep in the brain that keeps a rhythm of roughly twenty-four hours. In the evening the clock signals the release of melatonin, a hormone that helps prepare the body for sleep, and light reaching the eyes, especially bright light in the morning, helps keep the clock matched to the day outside.

In the years around puberty, both systems seem to shift. Studies that measure melatonin in saliva have found that, in many teenagers, its evening release begins later than it did in childhood, sometimes by an hour or more. There is also evidence that sleep pressure builds more slowly in older adolescents, so that late in the evening a sixteen-year-old may feel far less drowsy than a ten-year-old who has been awake just as long.

The trouble is that school does not shift with them. A student whose body is ready for sleep only around eleven, and who must wake at six-thirty to catch a bus, will lose sleep night after night. Sleep specialists generally recommend eight to ten hours a night for teenagers, and surveys suggest that many get considerably less. On weekends, many sleep late to make up the difference, which can push the clock later still and make Monday morning harder.

The pattern appears to be widespread. Researchers have found a similar delay in adolescents in many countries, and some studies have reported comparable shifts in young animals of several other species around the time they mature. That makes habits and screens unlikely to be the whole explanation, although bright screens late at night may push the clock later too.

The shift does not last forever. By the early twenties, most people's sleep has begun to move earlier again. Until then, the teenager who struggles to get up at dawn may be less a person with poor habits than a person whose inner clock is running on a later schedule than the bus."""

sets.append({"passage_id": "IR5-P06", "title": "A Later Clock", "genre": "science", "passage": P06, "items": [
 I("IR5-P06-1", "main-idea", "easy", "Which of the following best states the main idea of the passage?",
   ["Changes inside the body help explain why teenagers fall asleep and wake later.",
    "Phones and video games are the main reason that teenagers stay up so late at night.",
    "Melatonin is a hormone that helps prepare the body for sleep each evening.",
    "Teenagers who sleep late on weekends make their Monday mornings harder."],
   "Changes inside the body help explain why teenagers fall asleep and wake later.",
   "But researchers who study sleep have found that much of the change begins inside the body",
   "the passage explains the two systems that time sleep, reports that both shift around puberty, and concludes that a sleepy teenager's \"inner clock is running on a later schedule.\"",
   [R("Phones and video games are the main reason that teenagers stay up so late at night.", "reversed", "is the parents' answer that the passage questions; screens \"may play some part\" but are \"unlikely to be the whole explanation.\""),
    R("Melatonin is a hormone that helps prepare the body for sleep each evening.", "too narrow", "is a background fact from the second paragraph, not the passage's point."),
    R("Teenagers who sleep late on weekends make their Monday mornings harder.", "part not whole", "is one detail of the fourth paragraph, a result of the shift rather than its explanation.")]),
 I("IR5-P06-2", "detail", "medium", "According to the passage, studies that measure melatonin in saliva have found that in many teenagers",
   ["its evening release begins later than it did in childhood",
    "the body makes far less of it than it did in childhood",
    "its release is set off by bright light in the morning",
    "it builds up steadily the longer a person stays awake"],
   "its evening release begins later than it did in childhood",
   "its evening release begins later than it did in childhood, sometimes by an hour or more",
   "the studies found that \"its evening release begins later than it did in childhood, sometimes by an hour or more.\"",
   [R("the body makes far less of it than it did in childhood", "distortion", "is wrong: the studies report a change in timing, not in amount."),
    R("its release is set off by bright light in the morning", "misplaced detail", "is wrong: melatonin is released \"In the evening\"; morning light helps keep the clock matched to the day."),
    R("it builds up steadily the longer a person stays awake", "confused term", "describes sleep pressure, the first system, not melatonin.")]),
 I("IR5-P06-3", "vocabulary-in-context", "medium", "As it is used in the second paragraph, the word \"pull\" most nearly means",
   ["an urge drawing someone toward something", "an act of tugging something with the hands", "influence with people who are in power", "a hard climb up a long, steep slope"],
   "an urge drawing someone toward something",
   "A person who has been up for sixteen hours feels a strong pull toward sleep",
   "someone who has been awake sixteen hours \"feels a strong pull toward sleep,\" an urge to sleep that rest relieves.",
   [R("an act of tugging something with the hands", "literal sense", "is the physical sense; nothing is being tugged, and the pull is felt from within."),
    R("influence with people who are in power", "other sense", "is the sense of having pull with officials, which cannot apply to sleep."),
    R("a hard climb up a long, steep slope", "other sense", "is the hiker's or cyclist's sense of a long pull uphill; the person here is simply tired.")]),
 I("IR5-P06-4", "inference", "hard", "Based on the passage, a teenager who cannot fall asleep before eleven and must wake at six-thirty on school days will most likely",
   ["get less sleep on school nights than specialists recommend",
    "begin falling asleep earlier as the school year goes on",
    "need fewer hours of sleep than a younger child would need",
    "have an internal clock that has stopped keeping a rhythm"],
   "get less sleep on school nights than specialists recommend",
   "Sleep specialists generally recommend eight to ten hours a night for teenagers",
   "eleven to six-thirty is seven and a half hours, short of the \"eight to ten hours a night\" recommended, and the passage says such a student \"will lose sleep night after night.\"",
   [R("begin falling asleep earlier as the school year goes on", "contradicted", "is contradicted: the shift lasts until \"the early twenties,\" and the loss continues \"night after night.\""),
    R("need fewer hours of sleep than a younger child would need", "invented", "has no support; the passage gives teenagers \"eight to ten hours\" and makes no comparison with younger children's needs."),
    R("have an internal clock that has stopped keeping a rhythm", "contradicted", "is contradicted: the clock still runs, \"on a later schedule than the bus.\"")]),
 I("IR5-P06-5", "purpose", "hard", "The author begins with the answer that many parents give mainly to",
   ["introduce a common explanation that the passage goes on to question",
    "show that most parents already understand the science of sleep well",
    "argue that phones should be kept out of teenagers' bedrooms at night",
    "explain how researchers measure melatonin in samples of saliva"],
   "introduce a common explanation that the passage goes on to question",
   "phones, video games, or simple laziness",
   "the parents blame \"phones, video games, or simple laziness\"; the passage answers that the change \"begins inside the body\" and that habits and screens are \"unlikely to be the whole explanation.\"",
   [R("show that most parents already understand the science of sleep well", "contradicted", "is contradicted: the passage sets the researchers' findings against the parents' answer."),
    R("argue that phones should be kept out of teenagers' bedrooms at night", "invented", "has no support; the passage grants screens \"may play some part\" but gives no such advice."),
    R("explain how researchers measure melatonin in samples of saliva", "misplaced detail", "borrows the saliva studies from the third paragraph, which have nothing to do with the opening.")]),
 I("IR5-P06-6", "attitude", "medium", "The author's attitude toward teenagers who have trouble getting up early is best described as",
   ["sympathetic", "exasperated", "skeptical", "whimsical"], "sympathetic",
   "may be less a person with poor habits than a person whose inner clock is running on a later schedule than the bus",
   "the author explains their sleepiness as a shifted clock rather than \"poor habits\" and points out that school \"does not shift with them.\"",
   [R("exasperated", "misattributed", "fits the parents who blame \"simple laziness,\" not the author, who defends the teenagers."),
    R("skeptical", "misattributed", "describes the author's view of the laziness explanation, not of the teenagers themselves."),
    R("whimsical", "tone of one image", "fits the light closing comparison with the bus at most; the author treats the lost sleep seriously.")],
   why2="The trouble is that school does not shift with them.")]})

json.dump(sets, open('authored/d5.json', 'w'), indent=1, ensure_ascii=False)
print(len(sets))
