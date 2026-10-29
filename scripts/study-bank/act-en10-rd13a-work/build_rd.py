import json, sys, re
out = []
KID, CS, IKI = "Key Ideas and Details", "Craft and Structure", "Integration of Knowledge and Ideas"
def mk(pi, title, genre, paired, passage, items):
    for q in items:
        assert q['key'] in q['opts'] and len(set(q['opts'])) == 4, q['opts']
        lens = [len(o) for o in q['opts']]; assert max(lens) <= 1.6 * min(lens) or q.get('short'), (q['prompt'], lens)
        for m in q.get('must', []): assert m in passage, m
        if q['sub'] == 'vocabulary in context':
            w = re.search(r'the word "([^"]+)"', q['prompt']).group(1)
            assert len(re.findall(r'\b' + re.escape(w) + r'\b', passage)) == 1, (w, re.findall(r'\b' + re.escape(w) + r'\b', passage))
    for n, q in enumerate(items, 1):
        idx = len(out) + 1
        out.append(dict(id=f"ARV13a-{idx:02d}", passage_id=f"arv13a-p{pi}", passage_title=title, genre=genre, paired=paired,
                        passage=passage, prompt=q['prompt'], choices=q['opts'], correct_answer=q['key'], explanation=q['exp'],
                        domain=q['domain'], subskill=q['sub'], difficulty=q['diff']))

# ---------------- P1 literary narrative ----------------
r1 = """[1] Every year on the last Saturday of January, my uncle Bram closed his hardware store at six in the evening and did not open it again until Monday. In between, he counted everything in it, from the rakes hanging by the door to the brass hinges in their paper envelopes behind the counter. The bank that held his loan wanted a figure for what was on the shelves, and Bram, who distrusted figures he had not made himself, wanted the same thing for his own reasons. The year I turned fifteen, he asked my parents whether I could help. My cousin Lise, who was seventeen and had done three inventories already, was to show me how. I arrived with a sharpened pencil behind my ear and the feeling that I was being let in on something grown-up.

[2] I had pictured counting as the simplest work in the world. You picked up a thing, you said a number, you wrote the number down. Lise let me believe this for about ten minutes. Then she led me to the back wall, where the fasteners lived: bins of wood screws, machine screws, washers, cotter pins, and nails in sizes I had not known existed, most of them in open drawers that held hundreds or thousands each.

[3] "We don't count these," she said. "We weigh them."

[4] Bram's scale stood on its own table near the bins, a brass thing with a flat pan on one side and a sliding weight on a notched arm. Lise showed me the method. You counted out fifty of something by hand and weighed them. Then you weighed the whole drawer, subtracted the weight of the empty drawer, which was written in pencil on its side, and did the division. She did a drawer of brass wood screws in under two minutes and wrote 1,140 on the sheet. Then she did another, and another, the slider clicking along its notches, her pencil moving down the column without a pause.

[5] I asked how she knew it wasn't 1,139.

[6] "I don't," she said. "Neither does the bank."

[7] I did not like this answer. It seemed to me that the whole point of an inventory was that it was true, and a number you had arrived at by dividing was a guess dressed up as a fact. When Lise went to the front to help Bram with the paint, I took the next drawer, a box of small galvanized nails, and began counting them one at a time onto a sheet of newspaper. I had reached four hundred and something when I lost my place, and I started again, and at a little past six hundred I realized that I could not say for certain whether I had counted one particular nail twice.

[8] Bram found me there an hour later, with the drawer still more than half full. He looked at the newspaper, then at me, and I waited for him to be annoyed. Instead he pulled up a crate and sat on it. For a while he said nothing at all, and the only sound was the radio at the front of the store, turned low, playing to the empty aisles.

[9] "Weigh what you've got," he said.

[10] I did, and then I weighed fifty from the drawer, and did the division. The scale said six hundred and twenty-one; my count, the one I no longer trusted, said six hundred and eighteen. Bram nodded as if that settled something. Then he told me what Lise had not: that every drawer he weighed, he also spot-checked, pouring a handful into the pan twice from different corners of the drawer, because the screws and nails at the bottom of a bin were sometimes from an older batch of a slightly different weight. A scale, he said, did not make you careless. It moved the care to a different place.

[11] We finished at three in the morning, all three of us gray with the fine dust that lives in the bottoms of nail bins. I weighed the rest of the back wall myself, spot-checking every drawer, and when I wrote down a number I knew roughly how far it might be off and in which direction. On the drive home I told my mother that the inventory was mostly guesses. Bram, in the passenger seat, said that it was mostly estimates, which was not the same thing, and that the difference was the whole job."""
mk(1, "Night Inventory", "literary_narrative", False, r1, [
 dict(prompt="Which choice best states the main idea of the passage?",
      opts=["The narrator comes to see that an estimate made with care can be more trustworthy than a careless count.",
            "The narrator learns that the bank's demand for a figure matters less than the store's own records.",
            "The narrator discovers that a cousin's quick method hides errors that an uncle has to correct.",
            "The narrator decides that counting by hand is the only honest way to take a store's inventory."],
      key="The narrator comes to see that an estimate made with care can be more trustworthy than a careless count.",
      exp="The passage moves from the narrator's distrust of weighing (paragraph 7) through a failed hand count to Bram's lesson that weighing 'moved the care to a different place' and the closing distinction between guesses and estimates. The bank appears only as background, Lise's method is never shown to hide errors, and the hand-count view is the one the narrator abandons.",
      domain=KID, sub="main idea", diff="medium"),
 dict(prompt="According to the passage, before weighing a whole drawer, the workers found the weight of a known number of items by:",
      opts=["counting out fifty of them by hand and putting that group on the scale.",
            "reading the weight that had been written in pencil on the drawer's side.",
            "pouring a handful into the pan twice from different corners of the drawer.",
            "subtracting the empty drawer's weight from the reading for the full drawer."],
      key="counting out fifty of them by hand and putting that group on the scale.",
      exp="Paragraph 4: 'You counted out fifty of something by hand and weighed them.' The penciled figure is the empty drawer's weight, the two handfuls are Bram's spot-check, and subtracting the drawer's weight is a later step in finding the drawer's total, not the weight of a known number.",
      domain=KID, sub="detail", diff="easy"),
 dict(prompt="In context, Lise's reply \"Neither does the bank\" (paragraph 6) most strongly suggests that she believes the inventory figures:",
      must=['"Neither does the bank."'],
      opts=["need to be close to the truth rather than exact to the last item.",
            "are checked by the bank only when a drawer looks badly miscounted.",
            "matter more to Bram's own planning than to the bank that asked for them.",
            "would be more accurate if every item in the store were counted by hand."],
      key="need to be close to the truth rather than exact to the last item.",
      exp="Lise admits she does not know the count is not 1,139 and adds that the bank does not either: the bank, like her, works with an approximate figure. The passage never says when or whether the bank checks drawers, never ranks Bram's needs against the bank's, and the belief that hand counts are more accurate is the narrator's, not hers.",
      domain=KID, sub="inference", diff="medium"),
 dict(prompt="The narrator's confidence in the hand count of the nails fails mainly because the narrator:",
      opts=["cannot be sure whether one particular nail was counted twice.",
            "sees that the drawer is still more than half full after an hour.",
            "finds that the scale gives a figure three higher than the count.",
            "hears Lise say that the bank will accept a number that is not exact."],
      key="cannot be sure whether one particular nail was counted twice.",
      exp="Paragraph 7 ends with the narrator realizing 'I could not say for certain whether I had counted one particular nail twice'; by paragraph 10 the count is 'the one I no longer trusted.' The half-full drawer is what Bram sees, the scale comparison comes after the doubt, and Lise's remark comes before the count began.",
      domain=KID, sub="cause-effect", diff="medium"),
 dict(prompt="It can reasonably be inferred that Bram poured handfuls from different corners of each drawer in order to:",
      opts=["detect items from an older batch that might not weigh the same.",
            "teach the narrator to finish the drawers faster than Lise could.",
            "confirm that the weight penciled on the drawer was still correct.",
            "show the bank that each figure had been tested more than once."],
      key="detect items from an older batch that might not weigh the same.",
      exp="Paragraph 10 gives the reason: items at the bottom of a bin 'were sometimes from an older batch of a slightly different weight.' Sampling two corners compares parts of the drawer. Speed, the penciled drawer weight, and the bank are not connected to the spot-check anywhere in the passage.",
      domain=KID, sub="inference", diff="medium"),
 dict(prompt='As it is used in paragraph 10, the word "settled" most nearly means:',
      opts=["decided.", "calmed.", "sank.", "paid."], key="decided.", short=True,
      exp="Bram nods 'as if that settled something': the close agreement between the scale and the count answers the question of whether weighing can be trusted, so 'settled' means decided. Calmed, sank, and paid are other senses of the word that do not fit a question being resolved.",
      domain=CS, sub="vocabulary in context", diff="easy"),
 dict(prompt="The main function of paragraph 7 is to:",
      opts=["show the narrator testing a doubt about Lise's method and meeting the problem it avoids.",
            "explain why the bank required the store to be counted every winter on the same night.",
            "show that Lise preferred working at the front of the store to working at the back wall.",
            "describe the narrator's first success with the weighing method that Lise had shown."],
      key="show the narrator testing a doubt about Lise's method and meeting the problem it avoids.",
      exp="In paragraph 7 the narrator rejects weighing as 'a guess dressed up as a fact,' counts nails by hand instead, and loses track of whether a nail was counted twice, the very difficulty weighing sidesteps. The bank's reasons are in paragraph 1, Lise leaves only to help with paint, and the narrator does not use the weighing method until paragraph 10.",
      domain=CS, sub="function", diff="medium"),
 dict(prompt="The narrator's description of a weighed figure as \"a guess dressed up as a fact\" (paragraph 7) presents:",
      must=["a guess dressed up as a fact"],
      opts=["a view the narrator held at the time and later came to revise.",
            "Bram's own opinion of the figures that the bank asked him for.",
            "a belief that Lise shared but chose not to say aloud that night.",
            "the narrator's final judgment of the weighing method as a whole."],
      key="a view the narrator held at the time and later came to revise.",
      exp="The phrase follows 'It seemed to me' and 'I did not like this answer,' marking the fifteen-year-old's view; by paragraph 11 the narrator weighs every drawer and Bram corrects 'guesses' to 'estimates.' Bram and Lise both endorse weighing, and the narrator's final position is the opposite of the phrase.",
      domain=CS, sub="point of view", diff="medium"),
 dict(prompt="Which detail from the passage most directly supports the idea that weighing still required careful attention?",
      opts=["Bram spot-checked every drawer he weighed, sampling it from two corners.",
            "Lise weighed a whole drawer of brass wood screws in under two minutes.",
            "The weight of each empty drawer was written in pencil on its side.",
            "Bram distrusted figures that he had not arrived at by himself."],
      key="Bram spot-checked every drawer he weighed, sampling it from two corners.",
      exp="The spot-check is the 'different place' Bram says the care moves to: weighing comes with its own checking routine. Lise's speed suggests ease rather than care, the penciled weights are a convenience, and Bram's distrust of others' figures explains why he takes inventory, not how weighing must be done.",
      domain=IKI, sub="argument/evidence", diff="medium"),
])

# ---------------- P2 social science ----------------
r2 = """[1] In the 1950s, the story goes, the managers of a tall office building were flooded with complaints that its elevators were too slow. Engineers proposed faster motors, which would have been expensive. Someone else proposed mirrors. Once the walls beside the elevator doors were lined with them, the complaints largely stopped, though the elevators ran exactly as before: people waiting had something to look at, mostly themselves.

[2] The story may be more legend than history, but researchers who study waiting have found that its central point holds up. How long a wait feels depends only loosely on how long it lasts. A ten-minute wait with nothing to do can feel longer than a twenty-minute wait spent filling out a form. A wait whose length is unknown feels longer than one whose length is posted in advance, and a wait that seems unfair can feel longest of all.

[3] Some of the clearest evidence comes from a study that the psychologist Hanne Ruud ran at a busy post office over two winters. In the first winter, customers simply joined the line. In the second, a screen near the door showed an estimated waiting time, updated every few minutes. The real waits in the two winters were nearly identical, but written complaints fell by more than a third in the second. Customers also told her interviewers that the line moved faster, which it had not. Ruud then tried something less honest. For a month she set the screen to show estimates about five minutes shorter than the truth. Complaints did not stay low; they rose above the level of the first winter, before any screen had been installed.

[4] Ruud's explanation was that the screen worked by replacing uncertainty with a promise, and that a broken promise is worse than no promise at all. A customer told to expect ten minutes who waits fifteen has been given a specific reason to feel cheated. A customer told nothing has only a vague sense that the line is slow.

[5] Fairness works in a similar way. Many banks and airports have replaced several parallel lines with a single winding one that feeds whichever counter comes free. On average, the single line does not move people through any faster. What it removes is the experience, familiar to anyone who has chosen a line at a supermarket, of watching the next line over move ahead. In parallel lines, a customer who picks badly can wait several minutes longer than someone who arrived after; that small injustice, more than the minutes themselves, is what people remember. In a single line no one can be passed by a person who arrived later, and surveys suggest that customers rate such waits as shorter even when the clock says otherwise.

[6] It is tempting to conclude from all this that the cheapest way to fix a slow line is to manage how it feels, with mirrors, music, screens, and ropes. I think that conclusion goes too far. A mirror costs less than a new elevator, and a television costs less than another nurse, but the savings are real only if the remedy works, and the research suggests it often does not. Distraction helps only when people do not notice they are being distracted. Ruud found that patients in a clinic waiting room that added a television rated their waits as longer, not shorter; several told her that the television made them think the staff expected them to be there a long time. A remedy that announces itself can work like a confession.

[7] The more durable lesson of the research, it seems to me, concerns honesty rather than clever design. The screen in Ruud's post office helped because it told people the truth about something they cared about, and it hurt when it stopped doing so. The single line helps because it keeps a promise that parallel lines cannot keep: that people will be served in the order in which they came. Neither is a trick. Both treat the person waiting as someone owed an accurate account of the situation, and that may be what people in a line want more than any mirror."""
mk(2, "The Longest Line", "social_science", False, r2, [
 dict(prompt="The main purpose of the passage is to:",
      opts=["argue that research on waiting points toward honesty with people rather than disguising their waits.",
            "explain why faster equipment rarely reduces the complaints that people make about slow service.",
            "describe how a single winding line serves customers more quickly than several parallel lines.",
            "show that distractions such as mirrors and music reliably make long waits feel much shorter."],
      key="argue that research on waiting points toward honesty with people rather than disguising their waits.",
      exp="After presenting research on how waits feel, the author rejects the idea that managing perception is the fix (paragraph 6) and concludes that 'the more durable lesson ... concerns honesty rather than clever design.' Faster motors appear only in the opening story, the passage says the single line is not faster, and the author argues that distraction can backfire.",
      domain=KID, sub="main idea", diff="medium"),
 dict(prompt="According to the passage, during the month when Ruud's screen showed estimates shorter than the real waits, written complaints:",
      opts=["rose above the level of the first winter, when there was no screen.",
            "fell by more than a third compared with the winter without a screen.",
            "stayed at about the same low level as in the rest of the second winter.",
            "dropped at first and then slowly returned to the first winter's level."],
      key="rose above the level of the first winter, when there was no screen.",
      exp="Paragraph 3: 'Complaints did not stay low; they rose above the level of the first winter, before any screen had been installed.' The drop of more than a third describes the honest screen, and the passage reports neither a steady level nor an early drop for the dishonest month.",
      domain=KID, sub="detail", diff="easy"),
 dict(prompt="Based on paragraph 4, Ruud would most likely say that a customer who is told nothing about the expected wait:",
      opts=["has less specific grounds for feeling cheated than one given a wrong estimate.",
            "usually believes the wait will be shorter than it turns out to be in the end.",
            "is the customer most likely to write a complaint about the length of the line.",
            "feels the wait is fair as long as no one who arrived later is served first."],
      key="has less specific grounds for feeling cheated than one given a wrong estimate.",
      exp="Paragraph 4 contrasts the customer given a broken promise, who has 'a specific reason to feel cheated,' with the customer told nothing, who has 'only a vague sense that the line is slow.' Ruud says nothing about what uninformed customers expect, her own data show the dishonest screen drew more complaints than no screen, and fairness belongs to paragraph 5.",
      domain=KID, sub="inference", diff="medium"),
 dict(prompt="According to the passage, customers rate waits in a single winding line as shorter mainly because in such a line:",
      opts=["no one who arrived later can be served ahead of them.",
            "people move through faster on average than in several lines.",
            "each customer can choose whichever counter appears to be free.",
            "the waiting time is posted on a screen near the start of the line."],
      key="no one who arrived later can be served ahead of them.",
      exp="Paragraph 5 says the single line removes the experience of watching others move ahead: 'no one can be passed by a person who arrived later.' The passage states the single line 'does not move people through any faster'; the line, not the customer, feeds the free counter; and the screen belongs to the post office study.",
      domain=KID, sub="cause-effect", diff="easy"),
 dict(prompt="The author begins the passage with the story about the office building's elevators primarily to:",
      opts=["introduce, with a perhaps legendary example, the gap between felt time and clock time.",
            "show that building engineers tend to prefer expensive solutions to inexpensive ones.",
            "present the first piece of evidence from the research that the author later describes.",
            "suggest that people waiting are mostly interested in their own appearance in mirrors."],
      key="introduce, with a perhaps legendary example, the gap between felt time and clock time.",
      exp="Paragraph 2 calls the story 'more legend than history' and states its 'central point': 'How long a wait feels depends only loosely on how long it lasts.' The engineers' proposal is one detail, the story is set apart from the research rather than offered as part of it, and the remark about people looking at themselves is a passing joke, not the point.",
      domain=CS, sub="function", diff="medium"),
 dict(prompt='As it is used in paragraph 6, the word "announces" most nearly means:',
      opts=["makes obvious.", "declares formally.", "reports as news.", "introduces by name."], key="makes obvious.",
      exp="A remedy that 'announces itself,' like the clinic's television, makes its own purpose obvious to the people it is meant to distract, so 'makes obvious' fits. A remedy does not formally declare, report news, or introduce a speaker.",
      domain=CS, sub="vocabulary in context", diff="medium"),
 dict(prompt="The author's attitude toward the idea that a slow line is best fixed by managing how it feels can best be described as:",
      opts=["skeptical.", "approving.", "indifferent.", "nostalgic."], key="skeptical.",
      exp="The author calls the idea 'tempting' but says 'I think that conclusion goes too far,' then gives evidence against it. That is skepticism. The author neither approves of the idea, nor is indifferent to it, nor looks back on it fondly.",
      domain=CS, sub="point of view", diff="easy"),
 dict(prompt="Which finding does the author use to support the claim that \"distraction helps only when people do not notice they are being distracted\"?",
      must=["Distraction helps only when people do not notice they are being distracted."],
      opts=["Patients rated their waits as longer after a television was added to a clinic waiting room.",
            "Complaints at the post office fell after a screen showing estimated waits was put in place.",
            "Customers rated waits in a single line as shorter even when the clock said otherwise.",
            "Customers told to expect ten minutes who then waited fifteen felt specifically cheated."],
      key="Patients rated their waits as longer after a television was added to a clinic waiting room.",
      exp="The claim is followed immediately by the clinic finding: the television made patients think staff 'expected them to be there a long time,' so a noticed distraction backfired. The post office screen supplied information rather than distraction, the single line concerns fairness, and the ten-minute customer illustrates broken promises.",
      domain=IKI, sub="argument/evidence", diff="medium"),
 dict(prompt="Based on the passage, the author would most likely recommend that a restaurant with a long wait for tables:",
      opts=["give each party an accurate estimate of when its table will be ready.",
            "offer free music and snacks so that the time passes almost unnoticed.",
            "quote waits a little shorter than expected so customers will not leave.",
            "seat parties in whatever order makes the dining room run most quickly."],
      key="give each party an accurate estimate of when its table will be ready.",
      exp="The author concludes that people waiting are 'owed an accurate account of the situation.' Distraction is doubted in paragraph 6, shorter-than-true estimates are exactly what raised complaints in Ruud's study, and seating out of order breaks the fairness the single line protects.",
      domain=IKI, sub="argument/evidence", diff="medium"),
])

# ---------------- P3 humanities ----------------
r3 = """[1] On the shelf above my desk are thirty-one sketchbooks, one for nearly every year I have been drawing seriously. Few of them contain anything I would hang on a wall. Most pages hold a hand drawn four or five times until it looks as though it could close, a doorway with its perspective corrected in a second color, or a list of paints to buy. A visitor who took one down would learn very little about what my finished paintings look like and a great deal about how I get to them.

[2] For most of the history of European art, that is roughly what a sketchbook was: a private workshop that happened to fit in a pocket. Painters filled them with studies, notes, and arithmetic, and many were taken apart after the painter's death, their best pages sold one at a time. Only in the last century or so have museums begun to treat whole sketchbooks as objects worth displaying, and the change has been, on the whole, a gift. To see a famous composition worked out in a dozen cramped thumbnails is to understand that it was not handed down complete. The figure who seems inevitable in the finished painting was, it turns out, once on the left, then on the right, then nearly cut.

[3] Still, the glass case does something to the book. A sketchbook on display is open to a single spread, almost always the most finished one, and the gallery lighting gives it the dignity of a framed drawing. The pages of false starts stay closed. A visitor walks away believing that the artist's private notebooks were full of small masterpieces, which is to say that the visitor has been shown the exception and told it was the rule.

[4] I see the same thing happening, faster, among my students. Many of them now keep sketchbooks partly so that they can photograph the pages and share them, and the pages they share are, naturally, the good ones. Some have told me, half joking, that they no longer like to draw in the book until they are sure the drawing will work. One student keeps two: a public book for drawings she expects to post, and a cheap pad she calls her "real" sketchbook, which no one sees. When I asked to look at the cheap pad, she hesitated for a long moment before handing it over, and it was full of exactly the kind of drawing I had hoped to find in the other book.

[5] My first drawing teacher, a printmaker named Odile Brask, would have understood that student completely. On our first day she handed each of us a sketchbook and told us that our first assignment was to ruin a page. We were to draw something we could not draw, badly, and leave it. When we turned in our books at the end of the term, she paged past the handsome drawings and stopped at the ugliest ones, and it was those she wanted to talk about: where the line had hesitated, what we had been trying to see.

[6] I do not think the answer is for artists to stop sharing their sketchbooks, or for museums to stop showing them. The thumbnails behind a famous painting teach something no finished work can. But I have come to believe that a sketchbook is useful only so long as its owner is willing to let it be bad. The moment every page has to be fit to be seen, the book stops being a place to think and becomes one more place to perform.

[7] I still follow Brask's rule, more or less. Each new book begins with a page I know I will spoil, usually a drawing of my own left hand from an angle I have never managed. I have never torn a page out of a sketchbook, though there are many I would rather nobody saw. When I take one of the old books down, it is usually not to admire anything. It is to find the page where a problem I am having now first appeared, and to watch, in my own clumsy lines, how long it took me to see it the first time."""
mk(3, "What a Sketchbook Is For", "humanities", False, r3, [
 dict(prompt="The passage is best described as an essay in which the author:",
      opts=["argues that a sketchbook keeps its value only while it is allowed to hold failed work.",
            "argues that museums should stop displaying the sketchbooks of artists in glass cases.",
            "describes how a teacher's methods shaped the paintings the author later exhibited.",
            "explains why many painters' sketchbooks were taken apart after their owners died."],
      key="argues that a sketchbook keeps its value only while it is allowed to hold failed work.",
      exp="Paragraph 6 states the thesis: 'a sketchbook is useful only so long as its owner is willing to let it be bad.' The author says the answer is not for museums to stop showing sketchbooks; Brask's lesson is about sketchbooks, not exhibited paintings; and the dismantled sketchbooks are one historical detail.",
      domain=KID, sub="main idea", diff="medium"),
 dict(prompt="According to the passage, Odile Brask's first assignment asked students to:",
      opts=["draw something they could not draw well and leave it in the book.",
            "photograph their best pages so that they could share them with others.",
            "keep a second, cheaper pad of paper that no one else would ever see.",
            "copy a famous composition from a dozen small thumbnail sketches."],
      key="draw something they could not draw well and leave it in the book.",
      exp="Paragraph 5: the assignment was 'to ruin a page. We were to draw something we could not draw, badly, and leave it.' Photographing pages and keeping a second pad describe the author's current students, and copying thumbnails is not mentioned as an assignment.",
      domain=KID, sub="detail", diff="easy"),
 dict(prompt="The author suggests that a visitor who sees a sketchbook in a glass case is likely to come away believing that:",
      opts=["the artist's private notebooks were filled mostly with polished drawings.",
            "the artist's finished paintings matter less than the sketches behind them.",
            "most famous compositions were planned in many pages of false starts.",
            "sketchbooks should be kept private rather than displayed in museums."],
      key="the artist's private notebooks were filled mostly with polished drawings.",
      exp="Paragraph 3: the visitor 'walks away believing that the artist's private notebooks were full of small masterpieces,' because only the most finished spread is shown. Learning about false starts is what the closed pages would have taught, and the passage attributes no view about privacy or the value of finished paintings to the visitor.",
      domain=KID, sub="inference", diff="medium"),
 dict(prompt="According to the passage, many sketchbooks were taken apart after their owners' deaths so that:",
      opts=["their best pages could be sold one at a time.",
            "museums could display their most finished spreads.",
            "students could study the thumbnails behind paintings.",
            "the notes and arithmetic in them could be thrown out."],
      key="their best pages could be sold one at a time.",
      exp="Paragraph 2: many 'were taken apart after the painter's death, their best pages sold one at a time.' Museum display of whole sketchbooks came later and kept them whole; study of thumbnails and discarding notes are not given as reasons.",
      domain=KID, sub="cause-effect", diff="easy"),
 dict(prompt="The author mentions the student who keeps a \"public book\" and a \"real\" sketchbook primarily to:",
      opts=["illustrate how the pressure to share pages can push actual thinking somewhere private.",
            "show that many of the author's students have stopped keeping sketchbooks altogether.",
            "suggest that inexpensive paper produces better drawings than costly sketchbooks do.",
            "contrast the author's students with the European painters described in paragraph 2."],
      key="illustrate how the pressure to share pages can push actual thinking somewhere private.",
      exp="The student is the end point of paragraph 4's account of students who share only good pages and hesitate to draw until a drawing will work: her working pages have retreated to a pad 'no one sees.' The students still keep sketchbooks, the cheap pad is about privacy rather than quality, and the paragraph links the students to the museum problem in paragraph 3, not to the painters.",
      domain=CS, sub="function", diff="medium"),
 dict(prompt='As it is used in paragraph 3, the word "dignity" most nearly means:',
      opts=["formal importance.", "personal pride.", "high social rank.", "calm self-control."], key="formal importance.",
      exp="The gallery lighting makes a working notebook look as important and finished as 'a framed drawing,' so 'dignity' here means formal importance. Personal pride, social rank, and self-control describe people, not an open book under glass.",
      domain=CS, sub="vocabulary in context", diff="medium"),
 dict(prompt="The author's attitude toward museums' displaying sketchbooks is best described as:",
      opts=["appreciative, though concerned about which pages visitors are shown.",
            "opposed, because the books were meant to remain entirely private.",
            "indifferent, because few visitors look at the open pages closely.",
            "enthusiastic, because the displays show an artist's very best work."],
      key="appreciative, though concerned about which pages visitors are shown.",
      exp="The author calls the change 'on the whole, a gift' (paragraph 2), then objects that a display opens only to 'the most finished' spread (paragraph 3), and later says museums should not stop showing sketchbooks. The author is not opposed or indifferent, and showing only the best work is the very thing the author worries about.",
      domain=CS, sub="point of view", diff="medium"),
 dict(prompt="Which detail from the passage best supports the author's claim that a sketchbook is useful \"only so long as its owner is willing to let it be bad\"?",
      must=["only so long as its owner is willing to let it be bad"],
      opts=["The author uses old sketchbooks to find where a present problem first appeared.",
            "Museums began displaying whole sketchbooks only in about the last hundred years.",
            "Painters have long used their sketchbooks for studies, notes, and arithmetic.",
            "Some students no longer draw in the book until they are sure a drawing will work."],
      key="The author uses old sketchbooks to find where a present problem first appeared.",
      exp="The author's books are useful precisely because they keep the clumsy pages: they let the author find 'the page where a problem I am having now first appeared.' The museum date and the painters' uses are history, and the students' reluctance shows the problem the claim warns about rather than the usefulness it describes.",
      domain=IKI, sub="argument/evidence", diff="hard"),
 dict(prompt="Based on the passage, Odile Brask would most likely respond to a student who tore out every unsuccessful page by saying that the student had:",
      opts=["removed the pages that were most worth discussing.",
            "made the sketchbook ready to be shown in a museum.",
            "shown proper care for the quality of the finished work.",
            "followed the rule of filling a new sketchbook every year."],
      key="removed the pages that were most worth discussing.",
      exp="Brask 'paged past the handsome drawings and stopped at the ugliest ones, and it was those she wanted to talk about.' Tearing out failures removes exactly those. She showed no interest in readiness for display or polished work, and the one-book-a-year habit is the author's, not a rule of hers.",
      domain=IKI, sub="argument/evidence", diff="medium"),
])

# ---------------- P4 natural science, paired ----------------
r4 = """Passage A

[1] Walk through a stand of plane trees in late summer and you will find the ground littered with curled plates of bark, and the trunks above them mottled cream, olive, and gray where fresh bark has been exposed. Botanists have offered several explanations for why some trees shed their outer bark in this way while most hold on to it for decades. In my view the most important reason is the simplest one: shedding keeps the trunk clean.

[2] A tree's bark is a landscape. Lichens, mosses, and liverworts settle on it; climbing vines use it for footholds; insects lay eggs in its cracks. Fungi follow the moisture that the mosses trap. On a tree that never sheds, these passengers can build up for a century, until the trunk is as much a garden as a tree. Some do little harm, but a heavy coat of moss holds water against the bark, and a vine that reaches the crown can shade the leaves it climbs past.

[3] Trees that shed regularly carry far less of this load. In surveys of mixed forests, my colleagues and I have found that the trunks of shedding species hold a small fraction of the lichen and moss cover found on neighboring species that keep their bark, even when the trees are the same age and stand side by side. When we fastened mats of moss to the trunks of young shedding trees, most mats fell away within two seasons, carried off on the plates of bark beneath them. Mats fastened to neighboring trees that keep their bark were, after the same two seasons, still in place and spreading.

[4] None of this proves that getting rid of passengers is the reason a tree sheds. But a trait that so reliably produces a clean trunk is unlikely to be an accident, and I suspect that, in the damp forests where many shedding species evolved, a clean trunk was worth a great deal. A tree that can throw off its passengers every few years never has to carry them for long.

Passage B

[5] It is true that a tree shedding its bark also sheds whatever was living on it. I think it is a mistake, however, to treat that as the point. To understand why a tree sheds, it helps to look first at how a trunk grows.

[6] Each year a trunk adds a new layer of wood just under its bark, and so it grows wider. The living inner bark grows with it, but the outer bark is made of dead, corky cells that cannot stretch. On most trees the outer bark copes by splitting into the deep furrows familiar on an old oak. On some fast-growing species, it does not furrow; it cracks into plates and falls away, and new outer bark forms beneath. The difference seems to depend partly on the bark itself: thin outer bark tends to flake away in plates, while thick bark tends to furrow.

[7] If this is right, shedding should keep pace with growth, and it does. In the species I have measured, trees shed most heavily in the years and seasons when their trunks widen fastest, and young, fast-growing trees shed more than old, slow ones of the same species. A tree that shed in order to stay clean would have no reason to follow that schedule. Nor would it shed least in the dry seasons and slow years, when it does.

[8] Shedding may also bring a second benefit. The freshly exposed bark on many of these trees is green, because its cells contain chlorophyll, and for a few weeks it can carry out a modest amount of photosynthesis. How much that adds to the tree's food supply is still being measured; in most species it is likely small beside what the leaves provide, but it comes at no extra cost. A clean trunk, in other words, is real, but it is a consequence of the way these trees grow rather than the cause of their shedding."""
mk(4, "Why Some Trees Shed Their Bark: Two Views", "natural_science", True, r4, [
 dict(prompt="According to Passage A, when the author's team fastened mats of moss to the trunks of young shedding trees, most of the mats:",
      opts=["fell away within two seasons on the plates of bark beneath them.",
            "held water against the bark and slowed the growth of the trunks.",
            "spread within two seasons to neighboring trees that keep their bark.",
            "stayed attached until the trunks began to split into deep furrows."],
      key="fell away within two seasons on the plates of bark beneath them.",
      exp="Paragraph 3: 'most mats fell away within two seasons, carried off on the plates of bark beneath them.' Moss holding water is a general harm described in paragraph 2, spreading to neighbors is not reported, and furrowing belongs to Passage B's account of trees that do not shed.",
      domain=KID, sub="detail", diff="easy"),
 dict(prompt="The author of Passage A would most likely agree that a heavy coat of moss on a tree's trunk:",
      opts=["can harm the tree by keeping water against its bark.",
            "does no harm as long as no vine reaches the tree's crown.",
            "helps a tree that keeps its bark survive dry seasons.",
            "is the main reason a growing trunk splits into furrows."],
      key="can harm the tree by keeping water against its bark.",
      exp="Paragraph 2: 'a heavy coat of moss holds water against the bark,' offered as one of the passengers that can do harm. The author treats the vine as a separate harm, never credits moss with helping a tree, and says nothing about furrows, which come from Passage B.",
      domain=KID, sub="inference", diff="medium"),
 dict(prompt="According to Passage B, the outer bark of a trunk cannot keep up with the trunk's widening because the outer bark:",
      opts=["is made of dead, corky cells that are unable to stretch.",
            "is held in place by the lichens and mosses growing on it.",
            "contains chlorophyll that stops it from forming furrows.",
            "grows only in the seasons when the trunk is not widening."],
      key="is made of dead, corky cells that are unable to stretch.",
      exp="Paragraph 6: 'the outer bark is made of dead, corky cells that cannot stretch.' Passengers on the bark are Passage A's subject, chlorophyll is found in the freshly exposed bark (paragraph 8) and is not linked to furrows, and the passage says nothing about outer bark growing in particular seasons.",
      domain=KID, sub="detail", diff="easy"),
 dict(prompt="The author of Passage B argues that a tree that shed in order to stay clean \"would have no reason to follow that schedule.\" This argument assumes that:",
      must=["would have no reason to follow that schedule"],
      opts=["passengers do not build up on a trunk faster when the trunk is widening faster.",
            "fast-growing trees carry fewer lichens and mosses than slow-growing trees do.",
            "old trees of a species shed more heavily than young trees of the same species.",
            "new outer bark can form only after the old outer bark has completely fallen."],
      key="passengers do not build up on a trunk faster when the trunk is widening faster.",
      exp="The argument works only if the need to clean a trunk does not rise and fall with its growth; otherwise a cleaning tree would also shed most in fast-growing years. The passage makes no claim about which trees carry more lichens, says young trees shed more than old ones, and says new bark forms beneath the old, not after it has fallen.",
      domain=KID, sub="inference", diff="hard"),
 dict(prompt='As it is used in paragraph 6, the word "copes" most nearly means:',
      opts=["manages.", "suffers.", "covers.", "competes."], key="manages.", short=True,
      exp="The outer bark 'copes' with the widening trunk 'by splitting into the deep furrows'; it deals with, or manages, the problem. It does not suffer, cover, or compete in this sense.",
      domain=CS, sub="vocabulary in context", diff="medium"),
 dict(prompt="In Passage A, the main function of paragraph 2 is to:",
      opts=["describe what builds up on bark and how some of it can harm a tree.",
            "explain why bark splits into furrows as a tree's trunk grows wider.",
            "present the survey results that support the author's main claim.",
            "admit that shedding may not be the cause of a clean tree trunk."],
      key="describe what builds up on bark and how some of it can harm a tree.",
      exp="Paragraph 2 lists the lichens, mosses, vines, and insects that settle on bark and names two harms they can cause. Furrows are Passage B's subject, the surveys come in paragraph 3, and the author's admission comes in paragraph 4.",
      domain=CS, sub="function", diff="easy"),
 dict(prompt="Which statement best describes how the two passages relate to each other?",
      opts=["Passage B accepts the clean trunks that Passage A describes but explains them as a result of growth.",
            "Passage B disputes Passage A's report that shedding trees carry fewer lichens and mosses.",
            "Passage A tests the growth explanation that Passage B proposes and finds it lacking.",
            "Both passages argue that green bark is the main benefit a tree gains from shedding."],
      key="Passage B accepts the clean trunks that Passage A describes but explains them as a result of growth.",
      exp="Passage B opens 'It is true that a tree shedding its bark also sheds whatever was living on it' and ends that a clean trunk 'is real, but it is a consequence of the way these trees grow.' It does not dispute Passage A's surveys, Passage A never discusses growth, and only Passage B mentions green bark, as a possible 'second benefit.'",
      domain=IKI, sub="comparison", diff="medium"),
 dict(prompt="Both authors would most likely agree that:",
      opts=["trees that shed their bark tend to have cleaner trunks than trees that keep it.",
            "shedding has little to do with how quickly a tree's trunk is growing wider.",
            "the plants that live on bark seldom do a tree any real harm over time.",
            "a tree sheds most heavily in the years when its trunk widens fastest."],
      key="trees that shed their bark tend to have cleaner trunks than trees that keep it.",
      exp="Passage A's surveys find shedding trunks far cleaner, and Passage B grants that 'a clean trunk ... is real.' Passage B ties shedding closely to growth, Passage A says heavy moss and vines can harm a tree, and the link between shedding and fast widening is Passage B's finding alone; Passage A does not address growth.",
      domain=IKI, sub="comparison", diff="medium"),
 dict(prompt="The author of Passage B would most likely respond to the moss-mat experiment described in Passage A by saying that it shows:",
      opts=["that shedding removes passengers, not that removing them is why trees shed.",
            "that young trees shed less bark than old trees of the same species do.",
            "that moss cannot grow on bark whose cells contain any chlorophyll.",
            "that shedding trees grow too slowly to keep moss from building up."],
      key="that shedding removes passengers, not that removing them is why trees shed.",
      exp="Passage B accepts that shedding carries off 'whatever was living on it' but calls it 'a mistake ... to treat that as the point.' The experiment shows the removal, not its purpose. Passage B says young trees shed more, never connects chlorophyll to moss, and describes shedding species as fast-growing.",
      domain=IKI, sub="cross-passage", diff="medium"),
])

json.dump(out, open(sys.argv[1], 'w'), indent=1, ensure_ascii=False)
print(len(out), 'items')
for p in sorted(set(i['passage_id'] for i in out)):
    t = [i for i in out if i['passage_id'] == p][0]['passage']; print(p, len(re.sub(r'\[\d+\]', '', t).split()), 'words')
