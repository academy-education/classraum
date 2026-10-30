import json, os

def item(qid, kind, diff, prompt, key, distractors, why, expl, why2=None):
    # distractors: list of (choice, lure, reason_tail)
    choices = [key] + [d[0] for d in distractors]
    order = {"ITR1-B-P1A-1": [1, 0, 2, 3], "ITR1-B-P1B-1": [2, 3, 0, 1], "ITR1-B-P2-1": [3, 1, 0, 2],
             "ITR1-B-P2-2": [1, 2, 0, 3], "ITR1-B-P2-3": [2, 0, 3, 1], "ITR1-B-P2-4": [0, 3, 2, 1],
             "ITR1-B-P3-1": [3, 2, 1, 0], "ITR1-B-P3-2": [1, 0, 3, 2], "ITR1-B-P3-3": [2, 1, 0, 3],
             "ITR1-B-P3-4": [0, 2, 3, 1], "ITR1-B-P3-5": [3, 0, 1, 2], "ITR1-B-P3-6": [1, 3, 2, 0]}[qid]
    ch = [choices[i] for i in order]
    it = {"qid": qid, "kind": kind, "difficulty": diff, "prompt": prompt, "choices": ch,
          "correct_answer": key, "why": why}
    if why2:
        it["why2"] = why2
    it["explanation"] = f"\"{key}\" is correct: {expl}"
    it["distractor_rationales"] = [{"choice": c, "lure": l, "reason": f"\"{c}\" {r}"} for c, l, r in distractors]
    return it

P1A = ("The Art Club is holding a bookbinding workshop on Thursday, 14 March, in Room 12. It starts at 3:30 and "
       "finishes at 5:00. You will learn to fold paper, sew the pages together and add a strong cover to make your own "
       "notebook. We will give you everything you need, so you just have to bring yourself. The workshop is free, but "
       "there are only twenty places. To sign up, write your name on the list outside the art room by Tuesday. Please "
       "ask Ms Hesketh if you have any questions.")

P1B = ("Kirra,\nYour grandpa phoned this morning. His back hurts again, so he asked if you could help at his fruit stall "
       "at the market today. He needs you there by nine, not ten like last time, because the market opens an hour "
       "earlier in summer. He will stay until it closes at two. Bring a jacket, as the stall is in the shade all "
       "morning. He will pay you and give you a bag of plums to take home. I am taking your brother to swimming practice "
       "and will be back at noon.\nMum")

P2 = ("Three hundred years ago, the main street of Hallowmere looked very different from today. Above almost every shop "
      "door hung a painted wooden sign with a picture on it. A baker showed a loaf of bread, a shoemaker showed a boot, "
      "and a locksmith showed a large golden key. These pictures rarely changed, and a shop often kept the same sign for "
      "a hundred years, even after a new family took it over.\n\n"
      "The pictures had a practical purpose. Many people in the town could not read, so a written name over the door "
      "would have helped only a few customers. A picture could be understood by everyone, including farmers who came in "
      "from nearby villages on market day.\n\n"
      "The signs also worked as addresses. Houses had no numbers yet, so people gave directions by naming the pictures. "
      "A letter might be sent to the tailor beside the green hen, and the messenger would know exactly where to go.\n\n"
      "Over time, however, the signs became a problem. Shopkeepers competed to hang the biggest ones, and some stretched "
      "halfway across the street. They blocked light from upper windows and creaked loudly in the wind. In 1771, after a "
      "heavy sign fell and injured a horse, the town council ordered that every sign be fixed flat against the wall. "
      "Later, when the town began to number its houses, many shops replaced their pictures with painted names.")

P3 = ("Every December, our school turns the sports hall into a winter fair, and each club gets one table. Last year was "
      "the first time the woodwork club took part. There were six of us, and since September we had been carving small "
      "wooden spoons in the workshop after school. Each spoon took about three hours: sawing a rough shape from a block, "
      "hollowing the bowl with a curved knife, then sanding until the handle felt smooth. By the day of the fair we had "
      "forty of them.\n\n"
      "We argued for a week about the price. Hugo said nobody would pay more than two dollars for a spoon, while Imogen "
      "wanted five. Our teacher, Mr Lomax, refused to help and told us to decide for ourselves. In the end we chose two "
      "dollars, wrote the price on a card and waited. The spoons were gone in less than an hour, and at first we were "
      "thrilled. Then Imogen counted the money: eighty dollars, which was barely more than we had spent on wood and "
      "sandpaper. Worse, several buyers had called the spoons cute and asked if a machine had made them.\n\n"
      "That evening I worked it out. We had sold around a hundred and twenty hours of careful work for little more than "
      "the cost of the wood, and the low price had made people think the spoons were cheap objects rather than things "
      "made slowly by hand. Our price had told a story about the spoons, and it was the wrong story.\n\n"
      "This year we took forty spoons to the fair again, but we did two things differently. First, we brought a log, a "
      "knife and a half-finished spoon, and took turns carving at the table while people watched. Second, we raised the "
      "price to twelve dollars and kept it there all day, with a card explaining that each spoon takes about three hours "
      "to make. I was sure we would go home with a full box.\n\n"
      "We did not. We sold twenty-five spoons, fewer than last year, but they brought in three hundred dollars, and we "
      "used the money to buy a second set of carving knives. More surprising was the way people behaved. Instead of "
      "grabbing a spoon and walking away, they stood at the table and asked questions. An old man told us that his father "
      "had carved spoons from apple wood, and he showed us how his father used to hold the knife. Several buyers turned "
      "the spoons over in their hands for a long time before choosing one, as if the choice mattered.\n\n"
      "Near the end of the afternoon, a girl from year seven asked if she could join the club. Mr Lomax says the real "
      "lesson of the day was about business, but I am not so sure. I think the price of a handmade thing is also a "
      "message about it. Last year our message was that the spoons were cheap toys. This year it was that someone had "
      "spent an afternoon on each one, and people listened.")

sets = []

sets.append({
    "set_id": "ITR1-B-P1A", "part": 1, "genre": "poster", "title": "Bookbinding workshop poster",
    "passage": P1A, "names": ["Hesketh"],
    "other_caps": ["Art", "Club", "Thursday", "March", "Room", "Tuesday", "Ms"],
    "items": [item(
        "ITR1-B-P1A-1", "vocabulary", "easy",
        "In the poster, the word \"places\" is closest in meaning to",
        "spaces for people",
        [("towns or cities", "other meaning",
          "is a real meaning of the word, but the workshop happens in one room, \"in Room 12\", and the places are something students take by signing up: \"To sign up, write your name on the list\"."),
         ("positions in a race", "other meaning",
          "is a real meaning of the word, but the poster describes a workshop where \"You will learn to fold paper\", not a race; the places are filled when students \"write your name on the list\"."),
         ("homes to live in", "other meaning",
          "is a real meaning of the word, but nobody lives at the workshop; the places are limited spots students claim when they \"write your name on the list outside the art room\".")],
        "there are only twenty places. To sign up, write your name on the list",
        "the poster says \"there are only twenty places. To sign up, write your name on the list\", so a place is a space for one student in the workshop.")]})

sets.append({
    "set_id": "ITR1-B-P1B", "part": 1, "genre": "note", "title": "Note about helping at the fruit stall",
    "passage": P1B, "names": ["Kirra"], "other_caps": ["Mum"],
    "items": [item(
        "ITR1-B-P1B-1", "detail", "easy",
        "Why does Kirra need to arrive at the stall earlier than last time?",
        "The market starts earlier at this time of year.",
        [("Her grandfather wants to leave the market before lunch.", "contradicted",
          "is wrong because the note says \"He will stay until it closes at two\"."),
         ("Her grandfather's stall is moving to a sunnier part of the market.", "contradicted",
          "is wrong because the note says \"the stall is in the shade all morning\"; the reason for the time is \"because the market opens an hour earlier in summer\"."),
         ("She has to be at swimming practice later today.", "word lure",
          "is wrong because swimming practice is for her brother: \"I am taking your brother to swimming practice\".")],
        "because the market opens an hour earlier in summer",
        "the note says he needs her \"by nine, not ten like last time, because the market opens an hour earlier in summer\".")]})

sets.append({
    "set_id": "ITR1-B-P2", "part": 2, "genre": "informational history", "title": "The picture signs of Hallowmere",
    "passage": P2, "names": ["Hallowmere"], "other_caps": [],
    "items": [
        item("ITR1-B-P2-1", "detail", "medium",
             "According to the passage, why did the signs on the main street grow so large?",
             "Shop owners were trying to do better than one another.",
             [("Visitors from the villages found small signs hard to see.", "word lure",
               "is wrong because the passage gives a different reason for the size: \"Shopkeepers competed to hang the biggest ones\"; the villagers are mentioned only as people who could understand pictures."),
              ("The town council asked shops to make their signs bigger.", "contradicted",
               "is wrong because the council acted against the signs: it \"ordered that every sign be fixed flat against the wall\"; the size came from the fact that \"Shopkeepers competed to hang the biggest ones\"."),
              ("Painters charged the same amount for a sign of any size.", "not stated",
               "is wrong because the passage explains the size in another way: \"Shopkeepers competed to hang the biggest ones\".")],
             "Shopkeepers competed to hang the biggest ones",
             "the passage says \"Shopkeepers competed to hang the biggest ones\", so each owner was trying to beat the others."),
        item("ITR1-B-P2-2", "vocabulary", "medium",
             "In paragraph 4, the word \"fixed\" is closest in meaning to",
             "attached",
             [("repaired", "other meaning",
               "is a real meaning of the word, but the order was about where signs went after one \"fell and injured a horse\": every sign had to sit \"flat against the wall\", which is about attaching, not mending."),
              ("decided", "other meaning",
               "is a real meaning of the word (a price can be fixed), but a sign cannot be decided \"flat against the wall\"; the phrase describes where the sign is held."),
              ("prepared", "other meaning",
               "is a real meaning of the word (to fix a meal), but a sign prepared \"flat against the wall\" makes no sense after a sign \"fell and injured a horse\"; the order was to hold signs to walls.")],
             "every sign be fixed flat against the wall",
             "after \"a heavy sign fell and injured a horse\", the council ordered \"every sign be fixed flat against the wall\", meaning attached firmly to the wall so it could not hang out and fall."),
        item("ITR1-B-P2-3", "not-except", "medium",
             "Which of the following is NOT stated about the old signs of Hallowmere?",
             "They were taken down when a shop got a new owner.",
             [("They hung above the doors of most of the shops.", "stated",
               "is stated: \"Above almost every shop door hung a painted wooden sign\"."),
              ("Farmers who visited from nearby villages could understand them.", "stated",
               "is stated: \"A picture could be understood by everyone, including farmers who came in from nearby villages\"."),
              ("They made a creaking noise when it was windy.", "stated",
               "is stated: the signs \"creaked loudly in the wind\".")],
             "even after a new family took it over",
             "the passage says the opposite: \"a shop often kept the same sign for a hundred years, even after a new family took it over\"."),
        item("ITR1-B-P2-4", "purpose", "medium",
             "Why does the writer include paragraph 3?",
             "to describe another job the signs did for the town",
             [("to explain why letters often reached the wrong shop", "contradicted",
               "is wrong because the paragraph says \"the messenger would know exactly where to go\"."),
              ("to give the main reason that shops used pictures", "other paragraph",
               "is wrong because that reason is in paragraph 2: \"Many people in the town could not read\"; paragraph 3 begins \"The signs also worked as addresses\"."),
              ("to describe how the town first numbered its houses", "contradicted",
               "is wrong because paragraph 3 says \"Houses had no numbers yet\"; numbering comes only in paragraph 4: \"Later, when the town began to number its houses\".")],
             "The signs also worked as addresses",
             "the paragraph opens \"The signs also worked as addresses\" and shows people giving \"directions by naming the pictures\", a second use beside telling customers what a shop sold.")]})

sets.append({
    "set_id": "ITR1-B-P3", "part": 3, "genre": "first-person school life", "title": "Pricing the woodwork club's spoons",
    "passage": P3, "names": ["Hugo", "Imogen", "Lomax"], "other_caps": ["December", "September", "Mr"],
    "items": [
        item("ITR1-B-P3-1", "main-idea", "medium",
             "What is the passage mainly about?",
             "How showing the work and charging more changed how buyers treated the club's spoons",
             [("How school clubs can earn useful money by selling the crafts they make at school fairs", "broader",
               "is too general: the passage is about one club and what its price told buyers, ending \"the price of a handmade thing is also a message about it\"."),
              ("How the club spent the money from this year's fair on a second set of carving knives", "narrower",
               "is one detail from paragraph 5: \"we used the money to buy a second set of carving knives\"."),
              ("How the club sold more spoons this year by lowering the price and carving faster", "central misreading",
               "is wrong on both points: they sold \"twenty-five spoons, fewer than last year\" after they \"raised the price to twelve dollars\".")],
             "I think the price of a handmade thing is also a message about it",
             "the first year's low price made buyers ask \"if a machine had made them\"; this year the club carved \"at the table while people watched\" and charged more, and people \"stood at the table and asked questions\". The writer concludes \"the price of a handmade thing is also a message about it\"."),
        item("ITR1-B-P3-2", "inference", "hard",
             "What can be inferred about the spoons the club took to this year's fair?",
             "A number of them were still unsold when the fair ended.",
             [("They took less time to make than last year's spoons.", "contradicted",
               "is contradicted: the card said \"each spoon takes about three hours to make\", the same as last year, when \"Each spoon took about three hours\"."),
              ("There were fewer of them than the club had the year before.", "contradicted",
               "is contradicted: \"we took forty spoons to the fair again\", and last year \"we had forty of them\"."),
              ("They were priced lower than the first year's spoons.", "contradicted",
               "is contradicted: last year \"we chose two dollars\", and this year \"we raised the price to twelve dollars\".")],
             "This year we took forty spoons to the fair again",
             "the club \"took forty spoons to the fair again\" but \"sold twenty-five spoons\", so about fifteen were left.",
             why2="We sold twenty-five spoons"),
        item("ITR1-B-P3-3", "detail", "medium",
             "According to the passage, what did some buyers ask at the club's first fair?",
             "whether a machine had been used to make the spoons",
             [("whether the club would take orders for more spoons", "not stated",
               "is wrong because the passage reports a different question from those buyers: they \"asked if a machine had made them\"."),
              ("how many hours each spoon had taken to carve", "word lure",
               "is wrong because the time was explained only this year, on \"a card explaining that each spoon takes about three hours to make\"; the first buyers \"asked if a machine had made them\"."),
              ("what kind of wood had been used for the spoons", "word lure",
               "is wrong because wood comes up this year, when \"An old man told us that his father had carved spoons from apple wood\"; the first buyers \"asked if a machine had made them\".")],
             "asked if a machine had made them",
             "the passage says \"several buyers had called the spoons cute and asked if a machine had made them\"."),
        item("ITR1-B-P3-4", "vocabulary", "hard",
             "In paragraph 4, the word \"raised\" is closest in meaning to",
             "increased",
             [("lifted up", "other meaning",
               "is a real meaning of the word, but a price is not physically lifted; the price went from \"two dollars\" to \"twelve dollars\"."),
              ("brought up", "other meaning",
               "is a real meaning of the word (to raise a child), but the sentence is about money: \"the price to twelve dollars\", up from \"two dollars\"."),
              ("collected", "other meaning",
               "is a real meaning of the word (to raise money), but the club did not collect a price; it changed the price from \"two dollars\" to \"twelve dollars and kept it there all day\".")],
             "raised the price to twelve dollars",
             "last year \"we chose two dollars\", and this year the club \"raised the price to twelve dollars\", so the price went up."),
        item("ITR1-B-P3-5", "not-except", "hard",
             "All of the following happened at this year's fair EXCEPT",
             "The club lowered its price near the end of the day.",
             [("Club members carved spoons while visitors watched.", "stated",
               "is stated in paragraph 4: \"took turns carving at the table while people watched\"."),
              ("A visitor talked about his father's spoon carving.", "stated",
               "is stated in paragraph 5: \"An old man told us that his father had carved spoons from apple wood\"."),
              ("A younger student asked to become a member.", "stated",
               "is stated in paragraph 6: \"a girl from year seven asked if she could join the club\".")],
             "kept it there all day",
             "the passage says the club \"raised the price to twelve dollars and kept it there all day\"."),
        item("ITR1-B-P3-6", "inference", "hard",
             "What is most likely true about the price the club chose for its first fair?",
             "It was far below what buyers later proved willing to pay.",
             [("It was the amount that Imogen had first suggested.", "contradicted",
               "is contradicted: \"Imogen wanted five\", but \"we chose two dollars\"."),
              ("It was chosen for the club by their teacher, Mr Lomax.", "contradicted",
               "is contradicted: \"Mr Lomax, refused to help and told us to decide for ourselves\"."),
              ("It easily covered the cost of the wood and sandpaper.", "contradicted",
               "is contradicted: the money was \"barely more than we had spent on wood and sandpaper\".")],
             "In the end we chose two dollars",
             "the first price was \"two dollars\", yet this year the club \"raised the price to twelve dollars and kept it there all day\" and still \"sold twenty-five spoons\", so buyers proved willing to pay far more than the first price.",
             why2="raised the price to twelve dollars and kept it there all day"),
    ]})

out = os.path.join(os.path.dirname(__file__), "..", "items", "B.json")
with open(out, "w") as f:
    json.dump({"author": "B", "sets": sets}, f, indent=2, ensure_ascii=False)
print("wrote", os.path.abspath(out))
