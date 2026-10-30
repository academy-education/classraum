import json
L=[ # pid, grade, genre, subject, kinds(non-theme), theme families, key marker, distractor markers, purpose key verb
 ("P01",5,"realistic fiction","a boy and his older sister flying a homemade kite on a windy beach",["inference","figurative"],"NRW",("0",""),["0","H:usually","S:should"],None),
 ("P02",5,"fantasy","a girl finds a pencil whose drawings come true, but each one erases one of her memories",["purpose","character"],"OXR",("H","can"),["H:can","A:always","0"],"show"),
 ("P03",5,"fable","a squirrel who hoards acorns and a magpie who trades them, invented fable with a twist",["structure","inference"],"NNO",("S","should"),["S:should","H:often","0"],None),
 ("P04",6,"adventure story","two cousins caught by fog on a ridge trail who find their way back by stone cairns",["character","purpose"],"RWX",("H","usually"),["H:usually","H:can","A:every"],"suggest"),
 ("P05",6,"poem","a laundromat late at night",["figurative","point-of-view"],"OON",("0",""),["0","H:sometimes","H:tends to"],None),
 ("P06",6,"drama","two siblings pet-sitting a neighbour's old tortoise for a week (two or three speakers, stage directions)",["inference","purpose"],"XRN",("A","only"),["A:only","H:can","0"],"emphasize"),
 ("P07",6,"personal narrative","making dumplings with a father for the first time, told in first person",["point-of-view","structure"],"WOX",("H","tends to"),["H:tends to","S:should","0"],None),
 ("P08",7,"historical fiction","a girl working at her uncle's soda fountain in an invented small town around 1915 (no real named events)",["character","figurative"],"NRO",("0",""),["0","H:often","A:never"],None),
 ("P09",7,"myth-style tale","an invented origin tale explaining why mountains echo, invented culture",["purpose","structure"],"RRW",("S","must"),["S:must","H:usually","0"],"explain"),
 ("P10",7,"realistic fiction","a boy who reads the newspaper aloud each week to an elderly neighbour whose eyesight is failing",["inference","point-of-view"],"XNW",("H","sometimes"),["H:sometimes","S:should","0"],None),
 ("P11",8,"poem","a scrapyard at dusk",["structure","figurative"],"OWR",("0",""),["0","H:can","A:always"],None),
 ("P12",8,"science fiction","a near-future city whose street trees are all artificial; a teenager finds a real seedling",["character","purpose"],"NXO",("A","never"),["A:never","H:often","S:should"],"contrast"),
 ("P13",8,"realistic fiction","a teenager closing her family's restaurant alone for the first time",["inference","structure"],"WXN",("H","often"),["H:usually","0","0"],None),
]
I=[
 ("P01",5,"science article","axolotls and how they regrow lost limbs",["detail","inference"],"NOB",("0",""),["0","H","0"],None),
 ("P02",5,"how-it-works","how a vacuum flask (thermos) keeps drinks hot or cold",["structure","detail"],"RMN",("H",""),["H","A","0"],None),
 ("P03",5,"biography","Wilson Bentley, the Vermont farmer who photographed snowflakes (real, well documented)",["purpose","evidence"],"OBR",("A",""),["A","0","H"],"emphasize"),
 ("P04",6,"science article","how camels survive in hot deserts (the hump stores fat, not water)",["inference","purpose"],"NNM",("0",""),["0","0","A"],"explain"),
 ("P05",6,"history article","the history of the pencil: Borrowdale graphite and Conte's clay-and-graphite lead (well documented facts only)",["structure","evidence"],"BRO",("H",""),["H","0","A"],None),
 ("P06",6,"opinion essay","schools should give students a longer lunch period (argued, with a counterclaim)",["point-of-view","purpose"],"MON",("S",""),["S","S","S"],"argue"),
 ("P07",7,"science article","how quicksand works and why a person floats in it rather than sinking out of sight",["detail","purpose"],"RNB",("0",""),["0","H","H"],"introduce"),
 ("P08",7,"how-it-works","how noise-cancelling headphones work",["structure","inference"],"OMR",("H",""),["H","A","0"],None),
 ("P09",7,"biography","Mary Anning, fossil collector of Lyme Regis (real, well documented)",["evidence","inference"],"NBM",("A",""),["A","0","0"],None),
 ("P10",8,"history article","how the potato travelled from the Andes to Europe and how Europeans came to accept it",["purpose","detail"],"MRO",("0",""),["0","H","0"],"suggest"),
 ("P11",8,"opinion essay","towns should replace festival fireworks with drone light shows (argued, with a counterclaim)",["point-of-view","evidence"],"BNR",("S",""),["S","S","S"],None),
 ("P12",8,"science article","why the ocean is salty while rivers are fresh",["inference","structure"],"OMN",("0",""),["0","H","0"],None),
]
P_VERB_D={"show":3,"introduce":3,"suggest":6,"emphasize":6,"explain":6,"contrast":3,"argue":3}
out={"seed_note":"map-v2 reading batch 3 (MRV4), coordinated authors to reading-b3/BRIEF-B3.md, 2026-10-31","passages":[],"vocab":{"V1":{"grades":[5,6],"letters":"a-m","n":40},"V2":{"grades":[7,8],"letters":"n-z","n":40}},"purpose_distractor_verb_budget":P_VERB_D}
for area,code,rows,must in (("Literary Text","R1",L,"theme"),("Informational Text","R2",I,"central-idea")):
  for pid,g,genre,subj,kinds,fam,km,dm,pv in rows:
    out["passages"].append({"author":code,"passage_id":f"MRV4-{code}-{pid}","map_area":area,"grade":g,"genre":genre,"field":subj,
      "kinds":[must]+kinds,
      "spec":{"kind":must,"distractor_families":list(fam),"key_marker":km[0]+((":"+km[1]) if km[1] else ""),"distractor_markers":dm},
      "purpose_key_verb":pv})
json.dump(out,open("assignments.json","w"),indent=1)
print(len(out["passages"]))
