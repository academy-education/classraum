# Mechanical checks for an SSAT verbal batch. Run: python3 check.py ana  |  python3 check.py syn
import json,sys,collections
fold=lambda w:(w.lower().strip()[:-1] if len(w.strip())>4 and w.lower().strip().endswith('s') and not w.lower().strip().endswith('ss') else w.lower().strip())
P=set(json.load(open('existing-pairs.json'))); H=set(json.load(open('existing-headwords.json')))
mode=sys.argv[1]; probs=[]
def lens(key,ds):
    L=[len(key)]+[len(d) for d in ds]; return L[0]==max(L) and L.count(max(L))==1, L[0]==min(L) and L.count(min(L))==1, max(L)/min(L)
if mode=='ana':
    A=json.load(open('ana-draft.json')); seen=set(); lo=sh=0
    if not A: sys.exit('NOT MEASURED: no items')
    for x in A:
        prs=[('stem',x['stem']),('key',x['key'])]+[('d%d'%i,(d[0],d[1])) for i,d in enumerate(x['ds'])]
        if len(x['ds'])!=4: probs.append(f"{x['id']} needs 4 distractors")
        for lab,(a,b) in prs:
            k=fold(a)+'|'+fold(b)
            if k in P: probs.append(f"{x['id']} {lab} {a}/{b} already in the bank")
            if k in seen or fold(b)+'|'+fold(a) in seen: probs.append(f"{x['id']} {lab} {a}/{b} repeated in this batch")
            seen.add(k)
        rels=[d[2] for d in x['ds']]
        if x['rel'] in rels or len(set(rels))<4: probs.append(f"{x['id']} distractor relations must differ from the key's and each other: {x['rel']} / {rels}")
        l,s,r=lens(f"{x['key'][0]} is to {x['key'][1]}",[f"{d[0]} is to {d[1]}" for d in x['ds']]); lo+=l; sh+=s
        if r>1.6: probs.append(f"{x['id']} choice length ratio {r:.2f}")
    keyw=collections.Counter(w for x in A for w in x['key']); rep=[w for w,c in keyw.items() if c>1]
    if rep: probs.append(f"key words used twice: {rep}")
    n=len(A); print(f"analogies {n}; key uniquely longest {lo}/{n}; shortest {sh}/{n}; difficulty {dict(collections.Counter(x['d'] for x in A))}")
    if lo>0.27*n or sh>0.27*n: probs.append('key length tell: rebalance to about 20%')
else:
    S=json.load(open('syn-draft.json')); seen=set(); lo=sh=0
    if not S: sys.exit('NOT MEASURED: no items')
    for x in S:
        h=fold(x['head'])
        if h in H: probs.append(f"{x['head']} is already a headword in the bank")
        if h in seen: probs.append(f"{x['head']} repeated")
        seen.add(h)
        ch=[x['key']]+[d[0] for d in x['ds']]
        if len(x['ds'])!=4 or len(set(c.lower() for c in ch))!=5: probs.append(f"{x['head']} needs 5 distinct choices")
        if fold(x['key'])==h: probs.append(f"{x['head']} key equals headword")
        if len(set(d[2] for d in x['ds']))<4: probs.append(f"{x['head']} distractor sense-families must differ")
        l,s,r=lens(x['key'],[d[0] for d in x['ds']]); lo+=l; sh+=s
        if r>2.2: probs.append(f"{x['head']} choice length ratio {r:.2f}")
    keyc=collections.Counter(x['key'].lower() for x in S); rep=[w for w,c in keyc.items() if c>1]
    if rep: probs.append(f"keys used twice: {rep}")
    n=len(S); print(f"synonyms {n}; key uniquely longest {lo}/{n}; shortest {sh}/{n}; difficulty {dict(collections.Counter(x['d'] for x in S))}")
    if lo>0.30*n or sh>0.30*n: probs.append('key length tell: rebalance toward 20%')
print('problems',len(probs)); [print(' ',p) for p in probs]
sys.exit(1 if probs else 0)
