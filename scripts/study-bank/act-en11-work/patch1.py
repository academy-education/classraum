import re
P = {
'pa.py': [
 ("No, because it interrupts the paragraph's account of Penguin's sales and the series that imitated it with one author's career.", "No, because it shifts from Penguin's sales to one author's later career."),
 ('"afford on"', '"pay on"'),
 ('"plain it was"', '"plain, however, it was"'),
 ("No, because it describes an ability that does not help explain how the octopus could detect color.", "No, because tasting has no bearing on how the octopus could detect color."),
 ("Yes, because it describes how muscles, pigment sacs, and reflecting layers combine to produce the octopus's changing patterns.", "Yes, because it explains how muscles, pigment sacs, and reflecting layers change the skin."),
 ('"In other words,"], key="Even so,"', '"Thus,"], key="Even so,"'),
 ('"proven the"', '"proven, yet, the"'),
],
'pb.py': [
 ('Kept, because it sets up the narrator\'s reference in paragraph 5 to what happened \\"for forty seconds at a time.\\"', 'Kept, because it sets up the phrase \\"for forty seconds at a time\\" in paragraph 5.'),
 ("Yes, because it moves from the narrator's view of key cutting as dull to an understanding of what new keys meant to the customers.", "Yes, because it shows the narrator coming to see what new keys meant to customers."),
 ('"is never scolding"', '"never scold"'),
 ('opts=["Instead,", "Likewise,", "Moreover,"]', 'opts=["Instead,", "Also,", "Moreover,"]'),
 ('opts=["However,", "Similarly,", "In other words,"]', 'opts=["However,", "Similarly,", "Also,"]'),
 ('"having studied"', '"studies"'),
 ("No, because it describes the wait-and-pave approach as one practice and says that a barrier is sometimes the right answer.", "No, because it presents waiting to pave as one practice and grants that barriers are sometimes right."),
],
'pc.py': [
 ("Yes, because it introduces the view, borne out later in the paragraph, that cholera was carried by water rather than by air.", "Yes, because it introduces the idea, confirmed later in the paragraph, that cholera spread through water."),
 ("No, because the paragraph is concerned only with the outbreak of 1866 and not with earlier ones.", "No, because the paragraph is concerned only with the outbreak of 1866 and not with any of the earlier ones."),
 ('"use in recent years"', '"use, nevertheless in recent years"'),
 ('"The Times would later add puzzles to its weekday editions as well."', '"The Times later ran daily puzzles."'),
 ('"borrowing"], key="monopolizing"', '"recommending"], key="monopolizing"'),
],
'pd.py': [
 ('"emerged a thirteen-year"', '"emerged; whereas a thirteen-year"'),
 ('"Many predators hunt the nymphs before they ever leave the soil."', '"Predators also hunt the nymphs."'),
 ('"muscular", "forceful"', '"brawny", "forceful"'),
 ("No, because it recounts one adult's experience of learning to swim rather than setting out a method.", "No, because it tells one adult's story instead of setting out a method."),
],
'pe.py': [
 ("No, because it describes the room's earlier use, which has no bearing on the program the editorial supports.", "No, because the room's earlier use has no bearing on the program the editorial supports."),
 ("Yes, because it shows that the library has always lent more than books.", "Yes, because it shows that the library has always lent more than books, even in its basement."),
 ('"week, which the waiting"', '"week, being that the waiting"'),
 ('"rumor"], key="suggest"', '"proclaim"], key="suggest"'),
 ("The board should fund the program, as it did when it awarded the first small grant.", "The board should fund the program, just as it did when it awarded the collection's first small grant."),
 ("Yes, because it supports the claim that recognition came slowly and sets up the last sentence's point about the labels.", "Yes, because it supports the claim that recognition came slowly and sets up the final sentence."),
 ("No, because it contradicts the paragraph's report that the society's president honored her.", "No, because it contradicts the paragraph's report that the society's president delivered a tribute to her."),
 ("Yes, because it presents Anning's discoveries and observations alongside her exclusion from the Geological Society.", "Yes, because it pairs Anning's discoveries with her exclusion from the Geological Society."),
],
'pf.py': [
 ('"omen it is"', '"omen, therefore it is"'),
 ('"a minor"], key="an unusual"', '"an insignificant"], key="an unusual"'),
 ('opts=["After all,", "Nevertheless,", "As a result,"]', 'opts=["After all,", "Still,", "As a result,"]'),
],
}
for f, pairs in P.items():
    s = open(f).read()
    for a, b in pairs:
        n = s.count(a)
        assert n >= 1, (f, a)
        s = s.replace(a, b)
    open(f, 'w').write(s)
print('patched')
