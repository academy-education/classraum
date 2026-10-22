import json,hashlib,random
A=json.load(open('ana-draft.json')); S=json.load(open('syn-draft.json'))
rng=random.Random(int(hashlib.sha256(b'ssat-verbal-draft-1-2026-10-22').hexdigest()[:8],16))
def deal(n):
    sl=[i%5 for i in range(n)]; rng.shuffle(sl); return sl
items=[]
sa=deal(len(A))
for x,slot in zip(A,sa):
    pair=lambda a,b:f"{a} is to {b}"
    key=pair(*x["key"]); ds=[pair(d[0],d[1]) for d in x["ds"]]
    rng.shuffle(ds); ch=ds[:slot]+[key]+ds[slot:]
    why=x["why"][0].upper()+x["why"][1:]
    items.append({"localId":"SVD1-"+x["id"],"subskill":"analogy","difficulty":x["d"],"item":{"type":"multiple_choice","blanks":None,"prompt":f"[Analogy] {x['stem'][0]} is to {x['stem'][1]} as","choices":ch,"graphic":None,"passage":None,"difficulty":x["d"],
      "explanation":f"Relation: {x['rel']}. {why}.","correct_answer":key,"passageGroupId":None,"correct_answers":None,"acceptable_answers":None,
      "distractor_rationales":{pair(d[0],d[1]):f"relation it instantiates instead: {d[2]} ({d[3]}), not {x['rel']}" for d in x["ds"]}}})
ss=deal(len(S))
for x,slot in zip(S,ss):
    ds=[d[0] for d in x["ds"]]; rng.shuffle(ds); ch=ds[:slot]+[x["key"]]+ds[slot:]
    items.append({"localId":"SVD1-S-"+x["head"],"subskill":"synonym","difficulty":x["d"],"item":{"type":"multiple_choice","blanks":None,"prompt":f"[Synonym] {x['head']}","choices":ch,"graphic":None,"passage":None,"difficulty":x["d"],
      "explanation":f"{x['head']} means {x['ksense']}; '{x['key']}' is the closest synonym.","correct_answer":x["key"],"passageGroupId":None,"correct_answers":None,"acceptable_answers":None,
      "distractor_rationales":{d[0]:f"'{d[0]}' means {d[1]}, not {x['ksense']}; sense-family: {d[2]}." for d in x["ds"]}}})
json.dump(items,open('items.json','w'),indent=1,ensure_ascii=False)
for sub in ("analogy","synonym"):
    its=[i for i in items if i["subskill"]==sub]; lo=sh=0; slots=[0]*5
    for i in its:
        L=[len(c) for c in i["item"]["choices"]];k=len(i["item"]["correct_answer"])
        if k==max(L) and L.count(k)==1: lo+=1
        if k==min(L) and L.count(k)==1: sh+=1
        slots[i["item"]["choices"].index(i["item"]["correct_answer"])]+=1
    print(sub,len(its),"key longest",lo,"shortest",sh,"slots",slots)
