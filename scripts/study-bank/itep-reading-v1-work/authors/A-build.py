import json, os

def item(qid, kind, diff, prompt, key, dists, why, expl, why2=None):
    # dists: list of (choice, lure, reason)
    choices = [key] + [d[0] for d in dists]
    # spread key position deterministically
    pos = sum(map(ord, qid)) % 4
    choices = [d[0] for d in dists]
    choices.insert(pos, key)
    it = {"qid": qid, "kind": kind, "difficulty": diff, "prompt": prompt,
          "choices": choices, "correct_answer": key, "why": why}
    if why2:
        it["why2"] = why2
    it["explanation"] = '"%s" is correct: %s' % (key, expl)
    it["distractor_rationales"] = [
        {"choice": c, "lure": l, "reason": '"%s" %s' % (c, r)} for c, l, r in dists]
    return it

P1A = ("To all students: The spring badminton tournament will start on Thursday, not Wednesday as we said last week. "
       "The floor in the main gym is being repaired, so all games will be played in the small gym next to the library. "
       "Players should arrive by 3:30 and wear clean indoor shoes. The school will lend rackets to anyone who needs one, "
       "but please bring your own water bottle. Parents are welcome to watch from the upper seats. "
       "Mr. Caddick, sports teacher")

P1B = ("Hi Fenna! Are you still coming snorkelling with my family on Saturday? We leave at eight. "
       "My mum says the water at the bay is cold this month, and my old wetsuit is too small for me now. "
       "You have two, right? Could I use your blue one for the day? I'll wash it before I give it back. "
       "If it's a problem, just tell me and I'll rent one at the beach shop. See you Saturday! Esme")

P2 = ("Bea had played on her school's flying disc team for three weeks. At practice, her long throws flew straight and far, "
      "and her teammates often cheered. In real games, however, something changed. As soon as the disc reached her hands, "
      "she felt everyone watching. Each time, she passed it quickly to the closest player.\n\n"
      "Before the last game of the season, the team captain, Dagny, sat down beside her. \"For the first half, just make "
      "short, easy passes,\" Dagny said. \"Get used to the noise. After that, look up the field.\" Bea nodded, though her "
      "stomach felt tight.\n\n"
      "The first half went slowly. Bea made six short passes, and each one reached a teammate. By the break, her nerves "
      "had started to settle, and she noticed that the wind was now blowing toward the other end of the field.\n\n"
      "Midway through the second half, Bea caught the disc near her own goal line. Far ahead, her teammate Arlo was "
      "running alone, with no defender near him. For a moment she thought about the short pass. Then she stepped forward "
      "and threw. The disc rode the wind over every player's head, and Arlo caught it in the end zone. The whole team "
      "ran toward Bea, shouting her name.")

P3 = ("In the mangrove swamps and river mouths of Southeast Asia and northern Australia lives a small fish with an unusual "
      "way of hunting. The archerfish feeds partly on insects that rest on leaves and twigs above the water. Instead of "
      "leaping for them, it knocks them down by shooting a thin jet of water from its mouth. A well-aimed shot can hit an "
      "insect resting a metre or more above the surface, and the stunned insect drops into the water, where the fish "
      "quickly swallows it.\n\n"
      "The fish has no special water gun inside its body. It presses its tongue against a groove in the roof of its "
      "mouth, forming a narrow tube, and then snaps its gill covers shut. This squeezes water forward through the tube at "
      "high speed. When researchers filmed the jets with high-speed cameras, they noticed something surprising: the back "
      "of the jet travels faster than the front. As the jet moves through the air, the rear water catches up with the "
      "leading water, so that much of it gathers into one heavy drop near the target.\n\n"
      "Aiming is a harder problem than it first appears. Light bends as it passes between air and water, so an insect "
      "seen from below the surface appears to be in a slightly different place from where it really is. A human spear "
      "fisher standing in a stream must learn to aim below the spot where a fish appears to be. The archerfish faces the "
      "same puzzle from the other side of the surface, yet it hits targets from many different angles. Experiments "
      "suggest that it does not simply line up with the image it sees; instead, it appears to correct for the bending of "
      "light, much as an experienced spear fisher does.\n\n"
      "Young archerfish are not born expert shooters. They improve with practice, but laboratory studies suggest they "
      "can also improve by watching. In one kind of experiment, young fish were allowed to observe a skilled fish hitting "
      "targets that moved across a screen above the tank. Afterwards, many of the watchers hit moving targets far better "
      "than before, even though they had barely practised on such targets themselves. Many scientists had once assumed "
      "that learning by observation of this kind was limited to animals with large brains, such as apes and some birds.\n\n"
      "Hunting is also a race. When an insect falls, other fish nearby rush toward it, so the shooter must reach the "
      "landing point first. Within roughly a tenth of a second after the insect starts to fall, the archerfish turns and "
      "swims toward the place where it will land. It judges this from the insect's early speed, direction and height, "
      "rather than waiting to see where it drops.\n\n"
      "Taken together, these findings have made the archerfish a favourite subject for scientists who study how animals "
      "think. A single hunt combines physics, careful aim, learning and fast prediction. The fish suggests that such "
      "skills can develop in an animal whose brain is small and built very differently from our own.")

sets = []

sets.append({
    "set_id": "ITR1-A-P1A", "part": 1, "genre": "school notice",
    "title": "Badminton tournament moved", "passage": P1A,
    "names": ["Caddick"], "other_caps": ["Thursday", "Wednesday", "Mr"],
    "items": [item("ITR1-A-P1A-1", "detail", "easy",
        "According to the notice, why will the games be played in the small gym?",
        "Workers are fixing the floor of the main gym.",
        [("Another sports team needs to use the main gym.", "contradicted",
          "is not the reason given: the notice says \"The floor in the main gym is being repaired, so all games will be played in the small gym\"."),
         ("The small gym has more seats for parents.", "word lure",
          "is not the reason given: parents may \"watch from the upper seats\", but the reason for the move is \"The floor in the main gym is being repaired\"."),
         ("The small gym is easier for players to find.", "word lure",
          "is not the reason given: the small gym is \"next to the library\", but the games move there because \"The floor in the main gym is being repaired\".")],
        "The floor in the main gym is being repaired, so all games will be played in the small gym",
        "the notice says \"The floor in the main gym is being repaired, so all games will be played in the small gym\".")]})

sets.append({
    "set_id": "ITR1-A-P1B", "part": 1, "genre": "text message",
    "title": "Borrowing a wetsuit", "passage": P1B,
    "names": ["Fenna", "Esme"], "other_caps": ["Saturday", "I'll"],
    "items": [item("ITR1-A-P1B-1", "purpose", "easy",
        "Why did Esme send this message to Fenna?",
        "to ask if she can use one of Fenna's wetsuits",
        [("to invite Fenna to go snorkelling on Saturday", "contradicted",
          "is wrong: Fenna has already been invited, since Esme asks \"Are you still coming snorkelling with my family on Saturday?\""),
         ("to ask Fenna to rent a wetsuit at the shop", "word lure",
          "is wrong: Esme is the one who would rent: \"just tell me and I'll rent one at the beach shop\"."),
         ("to offer Fenna her old wetsuit for the trip", "contradicted",
          "is wrong: Esme says \"my old wetsuit is too small for me now\" and asks to borrow Fenna's: \"Could I use your blue one for the day?\"")],
        "Could I use your blue one for the day?",
        "after saying \"my old wetsuit is too small for me now\" and \"You have two, right?\", Esme asks \"Could I use your blue one for the day?\"")]})

sets.append({
    "set_id": "ITR1-A-P2", "part": 2, "genre": "story",
    "title": "The long throw", "passage": P2,
    "names": ["Bea", "Dagny", "Arlo"], "other_caps": [],
    "items": [
        item("ITR1-A-P2-1", "main-idea", "medium",
            "What is the story mainly about?",
            "a player who finally makes a long throw in a real game",
            [("how members of a sports team help one another improve", "broader",
              "is too general: the story follows one player, from \"she passed it quickly to the closest player\" to \"Then she stepped forward and threw\", and describes no other player improving."),
             ("a captain who gives a teammate advice before a game", "narrower",
              "covers only paragraph 2 (\"the team captain, Dagny, sat down beside her\"), not the game in which \"Then she stepped forward and threw\"."),
             ("a player who chooses short passes instead of long throws", "central misreading",
              "gets the ending wrong: at the key moment \"she thought about the short pass. Then she stepped forward and threw\" and \"The disc rode the wind over every player's head\".")],
            "Then she stepped forward and threw.",
            "in games Bea always \"passed it quickly to the closest player\", but in the last game \"Then she stepped forward and threw\" and \"Arlo caught it in the end zone\"."),
        item("ITR1-A-P2-2", "detail", "medium",
            "According to the story, what did Bea do in real games when she got the disc?",
            "She threw it at once to the nearest teammate.",
            [("She threw it as far as she could up the field.", "word lure",
              "describes practice, not games: \"At practice, her long throws flew straight and far\", while in games \"she passed it quickly to the closest player\"."),
             ("She held it until the captain told her where to throw.", "contradicted",
              "is wrong: she did not wait, because \"she passed it quickly to the closest player\"."),
             ("She dropped it because her hands were shaking.", "contradicted",
              "is wrong: the story says what she did with it: \"Each time, she passed it quickly to the closest player\".")],
            "Each time, she passed it quickly to the closest player.",
            "the story says \"Each time, she passed it quickly to the closest player\"."),
        item("ITR1-A-P2-3", "vocabulary", "medium",
            "In paragraph 3, the word \"settle\" is closest in meaning to",
            "calm down",
            [("be decided", "other meaning",
              "is a meaning of settle for an argument, but nothing is being decided here: \"her nerves had started to settle\" after \"each one reached a teammate\"."),
             ("move in", "other meaning",
              "is a meaning of settle for a new home, but the sentence is about feelings: \"her nerves had started to settle\"."),
             ("sink down", "other meaning",
              "is a meaning of settle for dust or sand, but nerves cannot sink; the six successful passes (\"each one reached a teammate\") made her less nervous.")],
            "By the break, her nerves had started to settle",
            "after \"Bea made six short passes, and each one reached a teammate\", her nervousness grew less: \"her nerves had started to settle\"."),
        item("ITR1-A-P2-4", "inference", "medium",
            "What can be inferred about Dagny?",
            "She understood that Bea got nervous during games.",
            [("She wanted Bea to make short passes for the whole game.", "contradicted",
              "is contradicted: short passes were only \"For the first half\", and then Dagny said \"After that, look up the field.\""),
             ("She planned to keep Bea on the bench in the first half.", "contradicted",
              "is contradicted: Dagny told Bea what to do in that half: \"For the first half, just make short, easy passes\"."),
             ("She hoped Bea would throw long from the very start.", "contradicted",
              "is contradicted: Dagny said \"For the first half, just make short, easy passes\" and only later \"look up the field\".")],
            "she felt everyone watching",
            "in games Bea \"felt everyone watching\", and Dagny's advice is aimed at exactly that: \"just make short, easy passes\" and \"Get used to the noise.\"",
            why2="Get used to the noise."),
    ]})

sets.append({
    "set_id": "ITR1-A-P3", "part": 3, "genre": "informational science",
    "title": "How the archerfish hunts", "passage": P3,
    "names": [], "other_caps": ["Southeast", "Asia", "Australia"],
    "items": [
        item("ITR1-A-P3-1", "main-idea", "medium",
            "What is the passage mainly about?",
            "how the archerfish's hunting uses several complex skills",
            [("how many different kinds of fish catch insects above water", "broader",
              "is too general: the passage is about one fish, \"The archerfish feeds partly on insects\"; other fish appear only as rivals that \"rush toward it\"."),
             ("how the archerfish shapes its jet into a single heavy drop", "narrower",
              "covers only paragraph 2: \"much of it gathers into one heavy drop near the target\"."),
             ("how the archerfish's jet lets it hunt without needing to aim", "central misreading",
              "is wrong about aiming: \"Aiming is a harder problem than it first appears\", and a hunt needs \"careful aim\".")],
            "A single hunt combines physics, careful aim, learning and fast prediction.",
            "the passage moves through the jet, aiming, learning and fast prediction, and sums up: \"A single hunt combines physics, careful aim, learning and fast prediction.\""),
        item("ITR1-A-P3-2", "detail", "medium",
            "According to the passage, how does the archerfish produce its jet?",
            "It uses its tongue to form a tube and pushes water through it.",
            [("It pumps water through a special tube deep inside its body.", "contradicted",
              "is contradicted: \"The fish has no special water gun inside its body.\""),
             ("It pushes water out through its gills by closing its mouth.", "word lure",
              "is wrong: the gill covers close, and the water goes \"forward through the tube\" formed in its mouth."),
             ("It fills its mouth with air and then pushes the water out.", "contradicted",
              "is not how the passage describes it: the fish \"snaps its gill covers shut. This squeezes water forward through the tube at high speed\"; no air is involved.")],
            "It presses its tongue against a groove in the roof of its mouth, forming a narrow tube",
            "the fish \"presses its tongue against a groove in the roof of its mouth, forming a narrow tube\", and then \"This squeezes water forward through the tube at high speed.\""),
        item("ITR1-A-P3-3", "vocabulary", "hard",
            "In paragraph 5, the word \"judges\" is closest in meaning to",
            "estimates",
            [("condemns", "other meaning",
              "is a meaning of judge (to blame someone), but the fish blames no one: \"It judges this from the insect's early speed, direction and height\"."),
             ("referees", "other meaning",
              "is a meaning of judge for a contest; \"Hunting is also a race\", but the fish is a racer that \"must reach the landing point first\", not an official."),
             ("rules on", "other meaning",
              "is a meaning of judge in a court case; here the fish works out a place from \"the insect's early speed, direction and height\".")],
            "It judges this from the insect's early speed, direction and height",
            "the fish works out \"the place where it will land\" from \"the insect's early speed, direction and height, rather than waiting to see where it drops\"."),
        item("ITR1-A-P3-4", "inference", "hard",
            "What can be inferred about the laboratory studies of young archerfish?",
            "They challenged an earlier belief about which animals learn by watching.",
            [("They showed that young fish improve only through their own practice.", "contradicted",
              "is contradicted: \"laboratory studies suggest they can also improve by watching\"."),
             ("They showed that watching skilled fish made young fish less accurate.", "contradicted",
              "is contradicted: \"many of the watchers hit moving targets far better than before\"."),
             ("They confirmed what scientists had always believed about how fish learn.", "contradicted",
              "is contradicted: \"Many scientists had once assumed that learning by observation of this kind was limited to animals with large brains\", and the archerfish has a brain that \"is small\".")],
            "learning by observation of this kind was limited to animals with large brains",
            "scientists thought \"learning by observation of this kind was limited to animals with large brains\", yet the watching fish improved and the archerfish is \"an animal whose brain is small\".",
            why2="an animal whose brain is small"),
        item("ITR1-A-P3-5", "detail", "medium",
            "According to the passage, why must the archerfish move fast once an insect falls?",
            "Other fish may reach the fallen insect before it does.",
            [("The insect may wake up again and fly away from the water.", "contradicted",
              "is not the reason given: the passage says \"other fish nearby rush toward it, so the shooter must reach the landing point first\"."),
             ("The insect will sink below the surface very quickly.", "contradicted",
              "is not the reason given: the hurry is because \"other fish nearby rush toward it\"."),
             ("Birds above the water may take the insect first.", "word lure",
              "is not the reason given: the rivals named are fish, \"other fish nearby rush toward it\".")],
            "other fish nearby rush toward it, so the shooter must reach the landing point first",
            "the passage says \"other fish nearby rush toward it, so the shooter must reach the landing point first\"."),
        item("ITR1-A-P3-6", "purpose", "hard",
            "Why does the author mention a human spear fisher in paragraph 3?",
            "to compare the fish's aiming problem with a human one",
            [("to show that people aim more accurately than the fish", "contradicted",
              "is wrong: the fish corrects for the bending of light \"much as an experienced spear fisher does\", so the two are compared as similar, not ranked."),
             ("to explain why the fish shoots from straight below", "contradicted",
              "is wrong: the archerfish \"hits targets from many different angles\"."),
             ("to describe one way that people catch the archerfish", "word lure",
              "is wrong: the spear fisher aims at \"a fish\" in \"a stream\", and the paragraph is about aiming: \"The archerfish faces the same puzzle from the other side of the surface\".")],
            "The archerfish faces the same puzzle from the other side of the surface",
            "the spear fisher \"must learn to aim below the spot where a fish appears to be\", and \"The archerfish faces the same puzzle from the other side of the surface\"."),
    ]})

out = {"author": "A", "sets": sets}
here = os.path.dirname(os.path.abspath(__file__))
path = os.path.join(here, "..", "items", "A.json")
with open(path, "w") as f:
    json.dump(out, f, indent=1, ensure_ascii=False)
for s in sets:
    print(s["set_id"], len(s["passage"].split()))
    for it in s["items"]:
        L = [len(c) for c in it["choices"]]
        k = len(it["correct_answer"])
        print("  ", it["qid"], L, "key", k, "ratio %.2f" % (max(L) / min(L)),
              "LONG" if k == max(L) and L.count(k) == 1 else "", "SHORT" if k == min(L) and L.count(k) == 1 else "")
