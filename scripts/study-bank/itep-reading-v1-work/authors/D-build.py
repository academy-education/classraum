import json, os

OUT = os.path.join(os.path.dirname(__file__), '..', 'items', 'D.json')

def item(qid, kind, diff, prompt, key, distractors, why, expl, why2=None):
    # distractors: list of (choice, lure, reason_without_leading_quote)
    choices = [d[0] for d in distractors]
    pos = sum(ord(c) for c in qid) % 4
    choices.insert(pos, key)
    it = {
        "qid": qid, "kind": kind, "difficulty": diff, "prompt": prompt,
        "choices": choices, "correct_answer": key, "why": why,
    }
    if why2:
        it["why2"] = why2
    it["explanation"] = f'"{key}" is correct: {expl}'
    it["distractor_rationales"] = [
        {"choice": c, "lure": l, "reason": f'"{c}" {r}'} for c, l, r in distractors
    ]
    return it

# ---------------- P1A library notice ----------------
p1a = ("The Stelbridge library is planning a show about our town in the past, and we need your help. "
       "Do you have photographs of Stelbridge that were taken before 1980? Please bring them to the local "
       "history room on any Saturday morning in March. A librarian will scan each photo while you wait, and "
       "you will take your originals home with you the same day. The copies will hang in the main hall from "
       "April. If you know the year or the place, please write it on the back of each photo.")

p1a_items = [
    item("ITR1-D-P1A-1", "purpose", "easy",
         "Why was this notice written?",
         "to ask people to lend their old town photos for copying",
         [
             ("to ask people to give their old town photos to the library", "contradicted",
              'is wrong: the photos are only scanned, and "you will take your originals home with you the same day".'),
             ("to ask people to take new town photos for a library show", "contradicted",
              'is wrong: the library wants photographs "that were taken before 1980", not new ones.'),
             ("to tell people that a show of old town photos is now open", "contradicted",
              'is wrong: the library "is planning a show", and "The copies will hang in the main hall from April", so the show has not opened yet.'),
         ],
         "A librarian will scan each photo while you wait",
         'the notice asks readers to "bring them to the local history room", where "A librarian will scan each photo while you wait", and the owners keep the originals, so the photos are lent and copied.'),
]

# ---------------- P1B email ----------------
p1b = ("Hi Tuva,\n\n"
       "Thanks for showing me your camera on Friday. My group has to film a short video about the school "
       "garden for science class, and my phone keeps shaking in my hands. Could I borrow your tripod? I can "
       "pick it up from your house on Saturday after my piano lesson, at about two o'clock. We plan to film "
       "on Sunday afternoon. I will bring the tripod back to school on Monday morning, before first period.\n\n"
       "See you soon,\nZora")

p1b_items = [
    item("ITR1-D-P1B-1", "detail", "easy",
         "When does Zora say she will return the tripod?",
         "on Monday, before lessons start at school",
         [
             ("on Saturday, after her piano lesson ends", "word lure",
              'is wrong: Saturday after the piano lesson is when she will "pick it up from your house", not return it.'),
             ("on Sunday, after her group films the video", "word lure",
              'is wrong: Sunday is only when "We plan to film"; she says "I will bring the tripod back to school on Monday morning".'),
             ("on Friday, after she sees Tuva's camera", "word lure",
              'is wrong: Friday is in the past, when Tuva was "showing me your camera on Friday"; the tripod comes back "on Monday morning".'),
         ],
         "I will bring the tripod back to school on Monday morning, before first period",
         'Zora writes "I will bring the tripod back to school on Monday morning, before first period", which is before lessons start.'),
]

# ---------------- P2 first-person school life ----------------
p2 = ("In October, our history teacher, Ms. Vandell, told us that our class would turn our classroom into a "
      "museum for one day. Each of us had to bring an everyday object that was at least fifty years old and "
      "write a short label explaining how it was used.\n\n"
      "I borrowed my grandmother's old iron. It was black, heavy and a little rusty, and it had to be heated "
      "on a stove before anyone could use it. Next to Talvi's painted music box, which played a tune when you "
      "opened it, my iron looked boring, and I almost left it in my bag.\n\n"
      "My grandmother helped me with the label. She told me that she pressed her school uniform with the iron "
      "every Sunday night. She also told me that she once burned her best blouse because she forgot to test "
      "the heat on an old cloth first. I wrote both stories on the card in my neatest handwriting.\n\n"
      "On museum day, the music box got a few smiles, but the iron got questions. Younger students tried to "
      "lift it with one hand and laughed when they could not. A father asked how anyone kept the heat even. "
      "Two teachers read my label twice.\n\n"
      "That evening I gave the iron back to my grandmother and told her about every visitor. She listened "
      "carefully. Then she asked whether she could come to the next museum day herself.")

p2_items = [
    item("ITR1-D-P2-1", "main-idea", "medium",
         "What is the passage mainly about?",
         "how an object the writer thought was dull drew interest at a class museum",
         [
             ("how everyday objects from long ago can still interest young people today", "broader",
              'is too general: the passage is about one class museum and one object, the iron that "looked boring" to the writer and then "got questions".'),
             ("how younger students tried to lift a heavy old iron at a class museum", "narrower",
              'is only one detail from paragraph 4 ("Younger students tried to lift it with one hand"), not the whole passage.'),
             ("how an object the writer was proud of was ignored at a class museum", "central misreading",
              'gets the story backwards: the writer first thought "my iron looked boring", and on the day "the iron got questions".'),
         ],
         "my iron looked boring, and I almost left it in my bag",
         'the writer first says "my iron looked boring, and I almost left it in my bag", but on museum day "the iron got questions", and she later "told her about every visitor".'),
    item("ITR1-D-P2-2", "vocabulary", "medium",
         'In paragraph 3, the word "pressed" is closest in meaning to',
         "smoothed",
         [
             ("pushed", "other meaning",
              'is another meaning of the word, but the grandmother used an iron on clothes: she "pressed her school uniform with the iron", which makes cloth flat, not moved.'),
             ("insisted", "other meaning",
              'means to keep asking a person firmly for something; a uniform is a thing, and she "pressed her school uniform with the iron".'),
             ("squeezed", "other meaning",
              'is used for fruit or hands; an iron heated "on a stove" is used to flatten cloth, as when she "pressed her school uniform with the iron".'),
         ],
         "she pressed her school uniform with the iron every Sunday night",
         'an iron "had to be heated on a stove" and is used on clothes, so when she "pressed her school uniform with the iron" she made it smooth and flat.'),
    item("ITR1-D-P2-3", "purpose", "medium",
         "Why does the writer mention Talvi's music box in paragraph 2?",
         "to show why the writer's own object seemed boring to her",
         [
             ("to show which object got the most questions on museum day", "contradicted",
              'is wrong: on museum day "the music box got a few smiles, but the iron got questions".'),
             ("to show which object the writer had first planned to bring", "contradicted",
              'is wrong: the music box is "Talvi\'s painted music box", and the writer says "I borrowed my grandmother\'s old iron".'),
             ("to show what kind of object Ms. Vandell had asked them to bring", "other",
              'is wrong: the teacher\'s instruction is given in paragraph 1, "an everyday object that was at least fifty years old", and the music box appears only as the thing beside which "my iron looked boring".'),
         ],
         "Next to Talvi's painted music box, which played a tune when you opened it, my iron looked boring",
         'the writer says "Next to Talvi\'s painted music box, which played a tune when you opened it, my iron looked boring", so the music box is mentioned as a comparison.'),
    item("ITR1-D-P2-4", "inference", "medium",
         "What does the passage suggest about the label the writer made for the iron?",
         "It told about a mistake the grandmother once made with the iron.",
         [
             ("It was written by the grandmother in her own handwriting.", "contradicted",
              'is contradicted: the writer says "I wrote both stories on the card in my neatest handwriting".'),
             ("It said the grandmother used the iron every Saturday morning.", "contradicted",
              'is contradicted: the grandmother "pressed her school uniform with the iron every Sunday night".'),
             ("It told visitors that the iron was heated by electricity.", "contradicted",
              'is contradicted: the iron "had to be heated on a stove before anyone could use it".'),
         ],
         "she once burned her best blouse because she forgot to test the heat on an old cloth first",
         'the grandmother told her that "she once burned her best blouse because she forgot to test the heat on an old cloth first", and then the writer says "I wrote both stories on the card", so the label included that mistake.',
         why2="I wrote both stories on the card in my neatest handwriting"),
]

# ---------------- P3 informational technology ----------------
p3 = ("For more than a century, the ordinary light bulb was really a small heater that happened to glow. "
      "Inside the glass, an electric current passed through a thin wire called a filament, usually made of the "
      "metal tungsten. The wire became so hot, well over two thousand degrees, that it gave off light. Yet most "
      "of the energy, roughly ninety percent, left the bulb as heat rather than as visible light. Anyone who has "
      "touched a lamp that was switched on an hour earlier has learned this quickly.\n\n"
      "The filament also limited how long a bulb could work. At such high temperatures, tiny amounts of tungsten "
      "slowly escaped from the surface of the wire, so the filament became thinner in places until it finally "
      "broke. A typical bulb lasted about a thousand hours, which is why changing bulbs was once a regular "
      "household chore.\n\n"
      "Light-emitting diodes, or LEDs, work in a completely different way. An LED is a tiny piece of specially "
      "prepared material, called a semiconductor, through which electricity flows. As the current moves through "
      "it, energy is released directly as light, with far less wasted as heat. An LED bulb can therefore produce "
      "the same amount of light as an old bulb while using less than a fifth of the electricity. Because there "
      "is no hot wire to wear thin, many LED bulbs are expected to last fifteen thousand hours or more.\n\n"
      "This does not mean that LEDs stay cool. The electronics in the base of an LED bulb still produce some "
      "heat, and heat shortens their working life. For this reason, many LED bulbs have metal fins or a metal "
      "base that carries warmth away, and they may fail early if they are fitted inside a closed lamp where hot "
      "air is trapped.\n\n"
      "The first LEDs gave off only red light, and later ones added yellow and green, which is why they were "
      "used mainly in the small indicator lights on machines. A bright white LED became practical only after "
      "engineers developed efficient blue LEDs. Most white LED bulbs today use a blue LED covered with a thin "
      "coating that changes part of the blue light into yellow. Our eyes see the mixture as white.\n\n"
      "The change has also affected the way people shop. For decades, customers chose bulbs by their wattage, "
      "which measures how much electricity a bulb uses, and treated that number as a measure of brightness. "
      "With the old technology the shortcut worked, because a 100-watt bulb was reliably brighter than a "
      "40-watt one. With LEDs it fails: a bulb that gives as much light as the old 60-watt type may use only "
      "eight or nine watts. Packages therefore now show lumens, a unit for the amount of light a bulb actually "
      "produces. Shoppers have had to learn to read a number that was always the real answer to their question.")

p3_items = [
    item("ITR1-D-P3-1", "main-idea", "medium",
         "Which of the following best states the main idea of the passage?",
         "LEDs waste far less energy as heat than old bulbs, which has changed how bulbs are chosen.",
         [
             ("New technology has made many everyday objects in the home cheaper, safer and easier to use.", "broader",
              'is too general: the passage is about one object, the light bulb, and about how "LEDs, work in a completely different way".'),
             ("White LED bulbs use a blue light with a coating that turns part of it into yellow.", "narrower",
              'is one detail from paragraph 5 ("a blue LED covered with a thin coating"), not the point of the whole passage.'),
             ("LEDs give off more heat than old bulbs, which is why they burn out much sooner.", "central misreading",
              'gets the comparison backwards: LEDs release light "with far less wasted as heat", and they are "expected to last fifteen thousand hours or more" against "about a thousand hours" for old bulbs.'),
         ],
         "energy is released directly as light, with far less wasted as heat",
         'the passage contrasts old bulbs, where "roughly ninety percent, left the bulb as heat", with LEDs, where "energy is released directly as light, with far less wasted as heat", and ends with how "The change has also affected the way people shop".'),
    item("ITR1-D-P3-2", "detail", "medium",
         "Why did an old light bulb eventually stop working?",
         "Its wire slowly lost metal and grew thin until it snapped.",
         [
             ("Its glass slowly turned dark until little light got out.", "not in text",
              'is wrong: the passage gives a different cause, that "the filament became thinner in places until it finally broke".'),
             ("Its glass cracked when cool air touched the hot surface.", "not in text",
              'is wrong: the passage gives a different cause, in the wire, not the glass: "tiny amounts of tungsten slowly escaped from the surface of the wire".'),
             ("Its wire suddenly melted when the current became too strong.", "contradicted",
              'is wrong: the wire failed gradually, as "tiny amounts of tungsten slowly escaped from the surface of the wire".'),
         ],
         "tiny amounts of tungsten slowly escaped from the surface of the wire, so the filament became thinner in places until it finally broke",
         'the passage says "tiny amounts of tungsten slowly escaped from the surface of the wire, so the filament became thinner in places until it finally broke".'),
    item("ITR1-D-P3-3", "not-except", "hard",
         "All of the following are stated about LED bulbs EXCEPT:",
         "Their light slowly becomes weaker as the bulbs grow older.",
         [
             ("They need much less electricity than old bulbs for the same light.", "stated",
              'is stated: an LED bulb gives "the same amount of light as an old bulb while using less than a fifth of the electricity".'),
             ("Their white light comes from mixing blue light with yellow made by a coating.", "stated",
              'is stated: white LED bulbs "use a blue LED covered with a thin coating that changes part of the blue light into yellow".'),
             ("Their packages now give the amount of light they produce in lumens.", "stated",
              'is stated: "Packages therefore now show lumens, a unit for the amount of light a bulb actually produces".'),
         ],
         "heat shortens their working life",
         'the passage discusses how long LED bulbs work ("expected to last fifteen thousand hours or more"; "heat shortens their working life"; "they may fail early"), but it says nothing about their light growing weaker with age.'),
    item("ITR1-D-P3-4", "inference", "hard",
         "It can be inferred that choosing old bulbs by their wattage worked mainly because",
         "all the old bulbs turned electricity into light in much the same way",
         [
             ("wattage was a direct measure of the light that each bulb gave off", "contradicted",
              'is contradicted: wattage "measures how much electricity a bulb uses", while lumens are "a unit for the amount of light a bulb actually produces".'),
             ("all the old bulbs produced very little heat compared with their light", "contradicted",
              'is contradicted: in old bulbs "roughly ninety percent, left the bulb as heat rather than as visible light".'),
             ("the old bulbs used a semiconductor that released energy directly as light", "contradicted",
              'is contradicted: old bulbs used "a thin wire called a filament"; the semiconductor is how "LEDs, work in a completely different way".'),
         ],
         "an electric current passed through a thin wire called a filament",
         'every old bulb made light the same way, as "an electric current passed through a thin wire called a filament", so more electricity meant more light: "With the old technology the shortcut worked, because a 100-watt bulb was reliably brighter than a 40-watt one". When LEDs "work in a completely different way", the shortcut fails.',
         why2="With the old technology the shortcut worked, because a 100-watt bulb was reliably brighter than a 40-watt one"),
    item("ITR1-D-P3-5", "purpose", "hard",
         "Why does the writer mention touching a lamp that was switched on an hour earlier?",
         "to give an everyday example of how much heat old bulbs produced",
         [
             ("to warn readers that old lamps can cause serious burns to the skin", "other",
              'is wrong: the sentence follows the claim that "roughly ninety percent, left the bulb as heat", and illustrates it; the passage gives readers no safety advice.'),
             ("to explain why the filament inside old bulbs was made of tungsten", "word lure",
              'is wrong: tungsten is only named as the usual material ("usually made of the metal tungsten"); the lamp sentence comes after the point about heat.'),
             ("to show that LED bulbs are much safer to touch than old bulbs", "contradicted",
              'is wrong: LEDs are not discussed until paragraph 3, and paragraph 4 says "This does not mean that LEDs stay cool".'),
         ],
         "Anyone who has touched a lamp that was switched on an hour earlier has learned this quickly",
         'the sentence "Anyone who has touched a lamp that was switched on an hour earlier has learned this quickly" comes right after "most of the energy, roughly ninety percent, left the bulb as heat", and gives a familiar example of that heat.'),
    item("ITR1-D-P3-6", "purpose", "hard",
         "What is the main purpose of paragraph 4?",
         "to warn that LED bulbs can still be harmed by their own heat",
         [
             ("to explain why LED bulbs use less electricity than old bulbs", "other paragraph",
              'is wrong: that is the work of paragraph 3 ("using less than a fifth of the electricity"); paragraph 4 is about how "heat shortens their working life".'),
             ("to describe how a white light is made from a blue LED", "other paragraph",
              'is wrong: that is paragraph 5 ("a blue LED covered with a thin coating"); paragraph 4 is about heat in the bulb\'s base.'),
             ("to show that LED bulbs last much longer than the old bulbs", "other paragraph",
              'is wrong: the long life is given in paragraph 3 ("fifteen thousand hours or more"); paragraph 4 explains why "they may fail early".'),
         ],
         "This does not mean that LEDs stay cool",
         'paragraph 4 opens with "This does not mean that LEDs stay cool" and explains that "heat shortens their working life" and "they may fail early if they are fitted inside a closed lamp where hot air is trapped".'),
]

doc = {
    "author": "D",
    "sets": [
        {"set_id": "ITR1-D-P1A", "part": 1, "genre": "library notice", "title": "Old town photos wanted",
         "passage": p1a, "names": ["Stelbridge"], "other_caps": ["Saturday", "March", "April"], "items": p1a_items},
        {"set_id": "ITR1-D-P1B", "part": 1, "genre": "email", "title": "Borrowing a tripod",
         "passage": p1b, "names": ["Tuva", "Zora"], "other_caps": ["Friday", "Saturday", "Sunday", "Monday"], "items": p1b_items},
        {"set_id": "ITR1-D-P2", "part": 2, "genre": "first-person school life", "title": "The iron at the class museum",
         "passage": p2, "names": ["Vandell", "Talvi"], "other_caps": ["October", "Ms", "Sunday"], "items": p2_items},
        {"set_id": "ITR1-D-P3", "part": 3, "genre": "informational technology", "title": "From hot wires to LEDs",
         "passage": p3, "names": [], "other_caps": ["LED", "LEDs"], "items": p3_items},
    ],
}

with open(OUT, 'w') as f:
    json.dump(doc, f, indent=1, ensure_ascii=False)
print('wrote', os.path.abspath(OUT))
