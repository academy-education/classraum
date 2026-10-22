import json,random,hashlib
I=[
("object pronoun + infinitive","medium",["She","asked","me","to water","her plants"]),
("object pronoun + infinitive","medium",["The manager","told","us","to wait","for the next bus"]),
("let + object + bare infinitive","medium",["My parents","let","me","choose","my own classes"]),
("past perfect + infinitive","medium",["I","had","forgotten","to lock","the back door"]),
("promise + infinitive + relative","hard",["He","promised","to return","the book","he borrowed"]),
("keep from + gerund","medium",["The constant noise","kept","me","from","falling asleep"]),
("would like + object + infinitive","medium",["I","would like","you","to meet","my sister"]),
("extraposed it + infinitive","medium",["It","is","important","to read","the instructions carefully"]),
("adjective + of + gerund","medium",["She","is","afraid","of","losing her job"]),
("look forward to + gerund","medium",["We","are","looking forward","to","seeing you"]),
("insist on + gerund","medium",["They","insisted","on","paying","for dinner"]),
("make + object + bare infinitive","medium",["The teacher","made","us","rewrite","the whole essay"]),
("afford + infinitive","medium",["She","can't afford","to miss","another","class"]),
("admit + perfect gerund","hard",["He","admitted","having","broken","the window"]),
("advise + object + infinitive","medium",["My doctor","advised","me","to drink","more water"]),
("turn out + comparative + than-clause","hard",["The exam","turned out","easier","than","we feared"]),
("expect + object + infinitive","hard",["Nobody","expected","the old car","to start","so easily"]),
("want + pronoun + infinitive","medium",["The coach","wants","us","to train","harder"]),
("regret + negative gerund","hard",["I","regret","not","telling","you sooner"]),
("nothing but","hard",["The box","contained","nothing","but","old photographs"]),
("except phrase in subject","hard",["Everyone","except","my brother","enjoyed","the concert"]),
("present perfect progressive + on","medium",["She","has been","working","on","the same project"]),
("embedded how-clause","medium",["I","didn't realize","how late","it","was"]),
("want to know + why-clause","hard",["He","wanted","to know","why","I had left"]),
("the first time + perfect","hard",["This","is","the first time","I have","flown alone"]),
("help + object + bare infinitive","medium",["Her advice","helped","me","make","a decision"]),
("worth + noun phrase","hard",["The old museum","is","well worth","a","visit"]),
("adjective + infinitive","medium",["I","was","surprised","to see","so many people"]),
("past perfect phrasal verb","medium",["We","had","run out","of","printer paper"]),
("degree + too + infinitive","medium",["The children","were","far","too excited","to sleep"]),
("succeed in + gerund","medium",["He","succeeded","in","getting","a scholarship"]),
("passive infinitive with of-phrase","hard",["The front tire","of my bike","needs","to be","replaced"]),
("there is no point in + gerund","hard",["There","is","no point","in","arguing"]),
("manage + infinitive + relative","hard",["She","managed","to finish","the race","she had trained for"]),
("recommend + gerund","medium",["Our teacher","strongly recommends","reading","the novel","in English"]),
("prevent from + gerund","medium",["The weather","prevented","us","from","going out"]),
("it is kind of + infinitive","hard",["It","was","kind","of you","to help"]),
("need + someone + infinitive","medium",["We","need","someone","to look after","the dog"]),
("be likely + infinitive","medium",["He","is","likely","to arrive","late"]),
("comparative + than-clause with it","hard",["The new plan","sounds","simpler","than","it really is"]),
("can't help + gerund","medium",["I","can't help","laughing","at","his jokes"]),
("the only one + who","medium",["She","was","the only one","who","noticed"]),
("passive + infinitive phrasal verb","medium",["The students","were","asked","to hand in","their essays"]),
("teach + object + how-infinitive","medium",["My grandmother","taught","me","how","to knit"]),
("which + noun + infinitive","hard",["I","haven't decided","which","university","to choose"]),
("let + object + bare infinitive","medium",["The library","lets","students","borrow","ten books"]),
("can't stop + gerund","medium",["She","couldn't stop","thinking","about","the interview"]),
("it is no use + gerund","hard",["It","is","no use","complaining","about it"]),
("seem + perfect infinitive","hard",["He","seems","to have","forgotten","my name"]),
]
out=[]
for n,(fam,diff,chips) in enumerate(I,1):
    iid=f"BAS3-{n:02d}"
    r=random.Random(int(hashlib.sha256(iid.encode()).hexdigest()[:8],16)); sc=chips[:]
    for _ in range(20):
        r.shuffle(sc)
        if sc!=chips: break
    out.append({"id":iid,"structure_family":fam,"difficulty":diff,"choices":sc,"correct_answer":" | ".join(chips),
      "explanation":f"Structure: {fam}. The only order that makes a grammatical sentence is \"{' '.join(chips)}\"."})
json.dump(out,open('items.json','w'),indent=1,ensure_ascii=False); print(len(out))
