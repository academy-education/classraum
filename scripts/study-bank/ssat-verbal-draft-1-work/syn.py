import json
S=[]
def s(h,key,ksense,ds,d):
    S.append(dict(head=h,key=key,ksense=ksense,ds=ds,d=d))
# ds: (word, meaning, sense-family)
s("FRAIL","weak","lacking strength",[("eager","wanting something very much","desire"),("honest","truthful","truth"),("distant","far away","space"),("plain","simple, without decoration","appearance")],"easy")
s("DILIGENT","hardworking","working with steady effort",[("cheerful","in good spirits","mood"),("wealthy","having a lot of money","money"),("comfortable","at ease","comfort"),("nervous","easily worried","anxiety")],"medium")
s("VIVID","brilliant","strikingly bright or clear",[("ancient","very old","age"),("slender","thin and graceful","shape"),("mysterious","hard to explain","mystery"),("gentle","mild and kind","manner")],"easy")
s("ABANDON","forsake","to leave behind for good",[("collect","to gather together","gathering"),("invite","to ask to come","hospitality"),("polish","to make shiny","cleaning"),("inspect","to examine closely","checking")],"medium")
s("OBSOLETE","outdated","no longer in use",[("fragrant","sweet-smelling","smell"),("generous","willing to give","giving"),("courageous","brave","bravery"),("punctual","on time","timeliness")],"medium")
s("CANDOR","frankness","open, honest speech",[("elegance","graceful style","style"),("patience","calm waiting","waiting"),("stubbornness","refusal to change one's mind","obstinacy"),("laughter","the sound of laughing","amusement")],"hard")
s("FEASIBLE","possible","able to be done",[("delicious","tasting very good","taste"),("permanent","lasting forever","duration"),("sincere","genuine in feeling","honesty"),("hollow","empty inside","shape")],"medium")
s("NIMBLE","agile","quick and light in movement",[("stern","strict and serious","manner"),("costly","expensive","money"),("damp","slightly wet","moisture"),("loyal","faithful","devotion")],"medium")
s("VIGILANT","watchful","alert to danger",[("generous","willing to give","giving"),("clumsy","awkward in movement","movement"),("ancient","very old","age"),("fragrant","sweet-smelling","smell")],"medium")
s("ARDENT","passionate","full of strong feeling",[("wooden","made of wood","material"),("ordinary","usual, not special","commonness"),("distant","far away","space"),("careless","not paying attention","attention")],"hard")
s("BANISH","exile","to send away as punishment",[("soothe","to calm","comfort"),("repair","to fix","fixing"),("borrow","to take for a time","lending"),("gather","to bring together","collecting")],"medium")
s("CHERISH","treasure","to hold dear",[("scatter","to spread widely","spreading"),("imitate","to copy","copying"),("postpone","to put off","delay"),("examine","to look at closely","checking")],"easy")
s("DWINDLE","diminish","to grow smaller little by little",[("wander","to roam","travel"),("glisten","to shine wetly","light"),("stumble","to trip","movement"),("boast","to brag","speech")],"medium")
s("FLIMSY","fragile","easily broken",[("savory","tasty and salty","taste"),("noisy","loud","sound"),("sacred","holy","religion"),("rapid","fast","speed")],"medium")
s("GENIAL","friendly","pleasant and warm in manner",[("rigid","stiff","stiffness"),("ancient","very old","age"),("costly","expensive","money"),("hollow","empty inside","shape")],"medium")
s("PONDER","consider","to think about carefully",[("hurry","to move fast","speed"),("decorate","to make attractive","appearance"),("whisper","to speak softly","speech"),("lift","to raise","movement")],"medium")
s("ROBUST","sturdy","strong and healthy",[("fragrant","sweet-smelling","smell"),("shallow","not deep","depth"),("polite","courteous","manners"),("distant","far away","space")],"medium")
s("SHREWD","astute","clever in practical matters",[("gentle","mild and kind","manner"),("noisy","loud","sound"),("humble","modest","modesty"),("sleepy","tired","rest")],"hard")
json.dump(S,open('syn-draft.json','w'),indent=1)
lo=sh=0
for x in S:
    L=[len(x['key'])]+[len(d[0]) for d in x['ds']]
    if L[0]==max(L) and L.count(max(L))==1: lo+=1
    if L[0]==min(L) and L.count(min(L))==1: sh+=1
print(len(S),"key longest",lo,"shortest",sh)
