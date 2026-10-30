import json, os

def item(qid, kind, diff, prompt, key, distractors, why, explanation, why2=None, order=None):
    # distractors: list of (choice, lure, reason)
    choices = [key] + [d[0] for d in distractors]
    if order:
        choices = [choices[i] for i in order]
    it = {
        "qid": qid, "kind": kind, "difficulty": diff, "prompt": prompt,
        "choices": choices, "correct_answer": key, "why": why,
    }
    if why2:
        it["why2"] = why2
    it["explanation"] = explanation
    it["distractor_rationales"] = [
        {"choice": c, "lure": l, "reason": f'"{c}" {r}'} for c, l, r in distractors
    ]
    return it

# ---------------- P1A advertisement ----------------
p1a = (
    "Come to the Pellridge farm this June and pick your own strawberries! Our fields are open every "
    "Saturday and Sunday from eight until four. We give you a basket "
    "at the gate, and you pay only for the fruit you take home. Children under six come in free with "
    "an adult. Please wear strong shoes, because the paths between the rows can be muddy after rain. "
    "Our farm shop also sells fresh jam and cold lemonade. You can find us just past the old mill "
    "on the road out of Rellbury."
)
k = "a farm where visitors pick and pay for their own strawberries"
set_p1a = {
    "set_id": "ITR1-C-P1A", "part": 1, "genre": "advertisement",
    "title": "Pick-your-own strawberries",
    "passage": p1a,
    "names": ["Pellridge", "Rellbury"],
    "other_caps": ["June", "Saturday", "Sunday"],
    "items": [item(
        "ITR1-C-P1A-1", "main-idea", "easy",
        "What is the advertisement mainly about?",
        k,
        [
            ("a farm that is looking for young workers to pick its strawberries", "central misreading",
             'is wrong: the visitors are not paid to work; the text says "you pay only for the fruit you take home".'),
            ("the jam and cold drinks that a farm shop sells", "narrower",
             'is only one detail near the end ("Our farm shop also sells fresh jam and cold lemonade"); the rest of the text is about coming to "pick your own strawberries".'),
            ("places where families can spend a summer weekend outdoors", "broader",
             'is too general: the text is about one farm, "the Pellridge farm", and one activity, "pick your own strawberries", not places in general.'),
        ],
        "pick your own strawberries",
        f'"{k}" is correct: the advert invites people to "pick your own strawberries" and says "you pay only for the fruit you take home".',
        order=[1, 0, 3, 2],
    )],
}

# ---------------- P1B diary entry ----------------
p1b = (
    "This morning my mother woke me at six because the weather report said there might be hail in the "
    "afternoon. We spent the whole morning putting old sheets over the lettuce and the young peppers in "
    "our garden. My arms hurt by lunch. At three o'clock the sky went dark, and white balls of ice the "
    "size of peas bounced across the yard for ten minutes. Afterwards I lifted the sheets. Every plant "
    "underneath was fine, but the beans by the fence had holes in their leaves. Next time we will need "
    "more sheets."
)
k = "The beans by the fence were left without a sheet."
set_p1b = {
    "set_id": "ITR1-C-P1B", "part": 1, "genre": "diary entry",
    "title": "Hail in the garden",
    "passage": p1b,
    "names": [],
    "other_caps": [],
    "items": [item(
        "ITR1-C-P1B-1", "inference", "easy",
        "What can be inferred from the diary entry?",
        k,
        [
            ("The hail fell for most of the afternoon.", "contradicted",
             'is wrong: the hail came "At three o\'clock" and bounced across the yard "for ten minutes".'),
            ("The writer covered the garden with no one to help.", "contradicted",
             'is wrong: the writer\'s mother was there, and "We spent the whole morning putting old sheets over the lettuce".'),
            ("The lettuce was hurt more badly than the beans.", "contradicted",
             'is wrong: the lettuce was under the sheets, and "Every plant underneath was fine", while "the beans by the fence had holes in their leaves".'),
        ],
        "Every plant underneath was fine, but the beans by the fence had holes in their leaves",
        f'"{k}" is correct: "Every plant underneath was fine, but the beans by the fence had holes in their leaves", and the writer adds "Next time we will need more sheets", so the sheets ran out before the beans were covered.',
        why2="Next time we will need more sheets.",
        order=[2, 0, 3, 1],
    )],
}

# ---------------- P2 informational science ----------------
p2 = (
    "Have you ever noticed that a bowl of fruit often seems to ripen all at once? There is a simple reason "
    "for this. As many fruits ripen, they give off a gas called ethylene. The gas is invisible, but it works "
    "like a signal. When nearby fruit takes in the gas, it begins to ripen as well, and then it releases more "
    "ethylene of its own.\n\n"
    "Ripening brings several changes. The fruit becomes softer, and its color often changes from green to "
    "yellow or red. In bananas and many other fruits, starch turns into sugar, so the fruit tastes sweeter. Bananas, tomatoes "
    "and avocados keep ripening after they are picked. Other fruits, such as grapes, strawberries and oranges, "
    "do not ripen much more once they leave the plant.\n\n"
    "Farmers and shops make use of these facts. Bananas are usually picked while they are still green and "
    "hard, because firm fruit travels well on long journeys. Near the end of the trip, they are often kept in "
    "warm rooms with a little added ethylene, which helps them ripen evenly before they reach the shops.\n\n"
    "You can use the same idea at home. To ripen a hard avocado faster, put it in a paper bag with a ripe "
    "banana. The bag holds the gas close to the avocado. To slow ripening down, keep ripe fruit away from "
    "other fruit, or store it somewhere cool."
)
k1 = "how a ripening gas from fruit works and how people use it"
k2 = "Plant leaves and flowers give it off as well."
k3 = "It keeps the gas from the banana near the avocado."
k4 = "Bananas are less sweet when picked than when they reach the shops."
set_p2 = {
    "set_id": "ITR1-C-P2", "part": 2, "genre": "informational science",
    "title": "The ripening gas",
    "passage": p2,
    "names": [],
    "other_caps": [],
    "items": [
        item("ITR1-C-P2-1", "main-idea", "medium",
             "What is the passage mainly about?",
             k1,
             [
                 ("how the gas ethylene protects fruit from ripening too early", "central misreading",
                  'is wrong about what the gas does: "When nearby fruit takes in the gas, it begins to ripen as well".'),
                 ("a quick way to soften a hard avocado in a paper bag at home", "narrower",
                  'is only the last paragraph ("To ripen a hard avocado faster, put it in a paper bag"); the passage also covers the gas, the changes and how "Farmers and shops make use of these facts".'),
                 ("the natural changes that happen to fruit after it forms", "broader",
                  'is too general: the passage is about one cause of ripening, "a gas called ethylene", and how people use it, not every change in fruit.'),
             ],
             "As many fruits ripen, they give off a gas called ethylene.",
             f'"{k1}" is correct: paragraph 1 explains that ripening fruit gives off "a gas called ethylene" that makes nearby fruit ripen, and paragraphs 3 and 4 show that "Farmers and shops make use of these facts" and "You can use the same idea at home".',
             order=[2, 1, 0, 3]),
        item("ITR1-C-P2-2", "not-except", "medium",
             "All of the following are stated in the passage about ethylene EXCEPT:",
             k2,
             [
                 ("People are unable to see it in the air.", "stated",
                  'is stated in paragraph 1: "The gas is invisible".'),
                 ("Fruit that takes it in starts to give it off too.", "stated",
                  'is stated in paragraph 1: "it begins to ripen as well, and then it releases more ethylene of its own".'),
                 ("Bananas are given a little of it on their journey.", "stated",
                  'is stated in paragraph 3: "they are often kept in warm rooms with a little added ethylene".'),
             ],
             "As many fruits ripen, they give off a gas called ethylene.",
             f'"{k2}" is correct: the passage says only that fruit makes the gas ("As many fruits ripen, they give off a gas called ethylene"); it says nothing about leaves or flowers.',
             order=[1, 3, 0, 2]),
        item("ITR1-C-P2-3", "detail", "medium",
             "How does a paper bag help a hard avocado ripen faster?",
             k3,
             [
                 ("It keeps the avocado cool while it softens.", "contradicted",
                  'is wrong: coolness slows ripening, as the passage says "To slow ripening down", you "store it somewhere cool".'),
                 ("It stops the banana from giving off more gas.", "contradicted",
                  'is wrong: the bag is there to hold the gas the banana gives off: "The bag holds the gas close to the avocado".'),
                 ("It keeps the avocado apart from the other fruit nearby.", "word lure",
                  'is wrong: the avocado goes in the bag "with a ripe banana"; keeping fruit apart is how to slow ripening: "keep ripe fruit away from other fruit".'),
             ],
             "The bag holds the gas close to the avocado.",
             f'"{k3}" is correct: the avocado is put in the bag "with a ripe banana", and "The bag holds the gas close to the avocado".',
             order=[3, 1, 0, 2]),
        item("ITR1-C-P2-4", "inference", "medium",
             "Which of the following can be inferred about bananas?",
             k4,
             [
                 ("Bananas are picked after they have turned yellow on the plant.", "contradicted",
                  'is wrong: "Bananas are usually picked while they are still green and hard".'),
                 ("Bananas are given ethylene as soon as they are picked.", "contradicted",
                  'is wrong: the ethylene comes later: "Near the end of the trip, they are often kept in warm rooms with a little added ethylene".'),
                 ("Bananas are kept in cold rooms near the end of their trip.", "contradicted",
                  'is wrong: "Near the end of the trip, they are often kept in warm rooms".'),
             ],
             "In bananas and many other fruits, starch turns into sugar, so the fruit tastes sweeter.",
             f'"{k4}" is correct: bananas "are usually picked while they are still green and hard" and ripen "before they reach the shops", and "In bananas and many other fruits, starch turns into sugar, so the fruit tastes sweeter".',
             why2="Bananas are usually picked while they are still green and hard",
             order=[1, 2, 3, 0]),
    ],
}

# ---------------- P3 informational history ----------------
p3 = (
    "In the spring of 1846, a farmer named Obadiah Raddle needed three days to haul a wagon of wheat to the "
    "market town of Rellford, a journey of only eighteen miles. The road was a strip of bare earth that turned "
    "to deep mud whenever it rained, and wagons regularly sank to their axles. Farmers in the valley could grow "
    "plenty of grain; the difficulty was getting it to buyers before it spoiled or before prices fell.\n\n"
    "That autumn, a group of Rellford merchants led by Osmond Quarles formed a company to build something new "
    "to the region: a plank road. Workers laid two long timber beams along the route and nailed thick boards "
    "across them, side by side, like the floor of an enormous wooden hallway. The company planned to recover "
    "its costs through tolls. At gates every few miles, a keeper collected a small fee from each wagon before "
    "lifting the wooden bar that stretched across the road.\n\n"
    "For the first few years, the road seemed a triumph. A team of horses could pull nearly twice its usual "
    "load over the smooth boards, and the trip from the valley to Rellford shrank from three days to a single "
    "day. Farmers paid the tolls without complaint, because the time they saved was worth far more than the "
    "fee. The company paid its owners generous profits, and newspapers in neighbouring districts urged their "
    "own towns to follow the example of Rellford.\n\n"
    "The planks, however, were made of wood, and wood laid on damp ground decays. Within five years many "
    "boards had warped or split, and those resting directly on wet soil had begun to rot from beneath. Loose "
    "planks tipped up under passing wheels, and more than one horse broke a leg in a hole where a board had "
    "been. Repairs grew more frequent and more expensive each season, until they swallowed nearly all of the "
    "toll money.\n\n"
    "The founders had made a careful estimate of what the road would cost to build, but they had treated that "
    "cost as something paid once. They had made no real plan for replacing every board within a decade, which "
    "is roughly how long the planks lasted. By 1857 the company's income had fallen below its repair bills, and "
    "its owners handed the road over to the county. Officials removed the remaining planks and spread a thick "
    "layer of gravel in their place.\n\n"
    "It would be easy to remember the Rellford plank road simply as a failure, yet the story is more "
    "complicated. The road had shown valley farmers, for the first time, how much a dependable route to market "
    "was worth to them. When the county later asked them to pay a small yearly tax to keep the gravel road in "
    "good condition, they agreed by a wide margin. Having once travelled quickly, they were unwilling to go "
    "back to the mud."
)
m1 = "A wooden toll road did well, then failed over unplanned repairs, but still changed what farmers valued."
v1 = "pole"
d1 = "The hours they saved were worth more to them than the fee."
pu = "to show the problem that the plank road was later built to solve"
v2 = "used up"
inf = "Its repair bills were smaller in the years when its owners earned well."
set_p3 = {
    "set_id": "ITR1-C-P3", "part": 3, "genre": "informational history",
    "title": "The Rellford plank road",
    "passage": p3,
    "names": ["Obadiah", "Raddle", "Rellford", "Osmond", "Quarles"],
    "other_caps": [],
    "items": [
        item("ITR1-C-P3-1", "main-idea", "medium",
             "What is the main idea of the passage?",
             m1,
             [
                 ("A plank road was well built, but farmers refused its tolls and soon went back to using the mud.", "central misreading",
                  'is wrong about what happened: "Farmers paid the tolls without complaint", and in the end "they were unwilling to go back to the mud".'),
                 ("Boards laid on wet soil rotted from beneath and made one road dangerous for horses.", "narrower",
                  'is one detail from paragraph 4 ("those resting directly on wet soil had begun to rot from beneath"); it leaves out the early success, the planning mistake and the lasting effect described in "the story is more complicated".'),
                 ("Good roads have played an important part in the way that farmers bring their crops to market and sell them.", "broader",
                  'is too general: the passage is about one road, "the Rellford plank road", why it failed, and what it taught "valley farmers".'),
             ],
             "the story is more complicated",
             f'"{m1}" is correct: the road "seemed a triumph" at first, failed because the founders "had made no real plan for replacing every board", yet the road showed farmers "how much a dependable route to market was worth to them".',
             order=[2, 0, 3, 1]),
        item("ITR1-C-P3-2", "vocabulary", "hard",
             'In paragraph 2, the word "bar" is closest in meaning to',
             v1,
             [
                 ("pub", "other meaning",
                  'is a meaning of "bar" (a place that serves drinks), but a keeper cannot lift a building; the text says he was "lifting the wooden bar that stretched across the road".'),
                 ("slab", "other meaning",
                  'is close to a meaning of "bar" (a bar of soap or chocolate), but this bar is long and thin enough to reach over a road: "the wooden bar that stretched across the road".'),
                 ("ban", "other meaning",
                  'is close to a meaning of "bar" (something that forbids, as when a person is barred from a place), but the keeper was "lifting the wooden bar", so it is a wooden object, not a ban.'),
             ],
             "lifting the wooden bar that stretched across the road",
             f'"{v1}" is correct: the keeper was "lifting the wooden bar that stretched across the road" to let a wagon through, so the bar is a long pole across the road.',
             order=[1, 3, 0, 2]),
        item("ITR1-C-P3-3", "detail", "medium",
             "Why did farmers pay the tolls on the plank road?",
             d1,
             [
                 ("The fee was lower than the cost of mending their broken wagons.", "other reason",
                  'is wrong: the passage gives a different reason, "because the time they saved was worth far more than the fee", and says nothing about wagon repairs.'),
                 ("The county required every wagon on the road to pay it.", "contradicted",
                  'is wrong: the tolls were the company\'s, which "planned to recover its costs through tolls"; the county only took the road over later, when "its owners handed the road over to the county".'),
                 ("They paid one small fee for a whole year of trips.", "contradicted",
                  'is wrong: the fee was paid on every trip, since "a keeper collected a small fee from each wagon", and the reason they paid was "because the time they saved was worth far more than the fee".'),
             ],
             "because the time they saved was worth far more than the fee",
             f'"{d1}" is correct: "Farmers paid the tolls without complaint, because the time they saved was worth far more than the fee."',
             order=[3, 0, 2, 1]),
        item("ITR1-C-P3-4", "purpose", "hard",
             "Why does the writer begin the passage with the story of Obadiah Raddle and his wagon of wheat?",
             pu,
             [
                 ("to introduce the man who later built the plank road", "contradicted",
                  'is wrong: the road was built by "a group of Rellford merchants led by Osmond Quarles", and Obadiah Raddle is only "a farmer".'),
                 ("to give an example of a farmer who refused to pay the tolls", "contradicted",
                  'is wrong: his journey was "In the spring of 1846", before the company was formed "That autumn", and later "Farmers paid the tolls without complaint".'),
                 ("to show how much more grain farmers grew after the road opened", "contradicted",
                  'is wrong: the story comes before the road existed, and the farmers already "could grow plenty of grain; the difficulty was getting it to buyers".'),
             ],
             "the difficulty was getting it to buyers before it spoiled or before prices fell",
             f'"{pu}" is correct: his journey on a road that "turned to deep mud whenever it rained" shows that "the difficulty was getting it to buyers before it spoiled or before prices fell", and the next paragraph describes the plank road built to fix this.',
             order=[2, 3, 0, 1]),
        item("ITR1-C-P3-5", "vocabulary", "hard",
             'In paragraph 4, the word "swallowed" is closest in meaning to',
             v2,
             [
                 ("gulped", "other meaning",
                  'is the eating meaning of "swallowed", but repairs cannot eat; "they swallowed nearly all of the toll money" means the repairs cost that money.'),
                 ("believed", "other meaning",
                  'is a meaning of "swallowed" (to believe a story), but repairs do not believe money; the sentence is about costs: "Repairs grew more frequent and more expensive each season".'),
                 ("held in", "other meaning",
                  'is a meaning of "swallowed" (to hold in tears or anger), but the repairs spent the money rather than kept it in; "Repairs grew more frequent and more expensive each season", so the money went on them.'),
             ],
             "until they swallowed nearly all of the toll money",
             f'"{v2}" is correct: "Repairs grew more frequent and more expensive each season, until they swallowed nearly all of the toll money", so the repairs used up the money.',
             order=[2, 0, 1, 3]),
        item("ITR1-C-P3-6", "inference", "hard",
             "Which of the following can most reasonably be inferred about the plank road company?",
             inf,
             [
                 ("Its repair bills were largest in the very first year of the road.", "contradicted",
                  'is wrong: "Repairs grew more frequent and more expensive each season", so the costs rose over time.'),
                 ("It paid for most of its repairs with money from the county.", "contradicted",
                  'is wrong: the repairs were paid from the tolls, since they "swallowed nearly all of the toll money", and the county only took over when "its owners handed the road over to the county".'),
                 ("It raised its tolls in order to pay for the new gravel surface of the road.", "contradicted",
                  'is wrong: the company had already "handed the road over to the county" when "Officials removed the remaining planks and spread a thick layer of gravel".'),
             ],
             "The company paid its owners generous profits",
             f'"{inf}" is correct: the owners got "generous profits" in the first years, and "Repairs grew more frequent and more expensive each season", so repair costs were lowest while the owners were earning well.',
             why2="Repairs grew more frequent and more expensive each season",
             order=[3, 1, 0, 2]),
    ],
}

out = {"author": "C", "sets": [set_p1a, set_p1b, set_p2, set_p3]}
path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "items", "C.json")
with open(path, "w") as f:
    json.dump(out, f, indent=2, ensure_ascii=False)
    f.write("\n")
for s in out["sets"]:
    print(s["set_id"], len(s["passage"].split()), "words")
