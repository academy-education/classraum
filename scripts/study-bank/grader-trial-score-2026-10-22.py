import json,sys,collections,os
G='/Users/andylee/Downloads/saas/classraum/scratchpad/grader-trial/'
K=json.load(open('packet-key.json')); rej={r['id']:r for r in json.load(open('rejects.json'))}; ctl={c['id']:c for c in json.load(open('controls.json'))}
pl={p['id']:p for p in json.load(open('planted.json'))}; pk=json.load(open('planted-key.json'))
grades={}
for g in range(1,5):
    f=G+f'grades-{g}.json'
    if not os.path.exists(f): sys.exit(f'NOT MEASURED: {f} missing')
    d=json.load(open(f))
    for n,v in d.items(): grades[f'g{g}-{n}']=v
missing=[k for k in K if k not in grades]
if missing: sys.exit(f'NOT MEASURED: {len(missing)} items ungraded e.g. {missing[:3]}')
prim={}; second={}
for k,m in K.items():
    (second if m['overlap'] else prim)[m['id']]=(grades[k]['verdict'],grades[k].get('reason',''),grades[k].get('other',''))
fam=lambda i:(rej.get(i) or ctl.get(i) or pl.get(i))['family']+'/'+(rej.get(i) or ctl.get(i) or pl.get(i))['section']
arm=lambda i:'reject' if i in rej else 'control' if i in ctl else 'planted'
flag=lambda v:v!='unique'
res=collections.defaultdict(lambda:[0,0])
for i,(v,_,_) in prim.items(): res[arm(i)][0]+=flag(v); res[arm(i)][1]+=1
print('items graded (primary):',len(prim),'| overlap:',len(second))
P,R,C=res['planted'],res['reject'],res['control']
print(f'1 planted recall  {P[0]}/{P[1]}  bar >=32/40 -> {"PASS" if P[0]>=32 and P[1]==40 else "FAIL"}')
print(f'2 reject recall   {R[0]}/{R[1]}  bar >=18/29 -> {"PASS" if R[0]>=18 and R[1]==29 else "FAIL"}')
print(f'3 control flags   {C[0]}/{C[1]} bar <=18/120 -> {"PASS" if C[0]<=18 and C[1]==120 else "FAIL"}')
byf=collections.defaultdict(lambda:collections.Counter())
for i,(v,_,_) in prim.items(): byf[(arm(i),fam(i))]['flag' if flag(v) else 'ok']+=1
for (a,f),c in sorted(byf.items()): print(f'   {a:8} {f:22} flagged {c["flag"]}/{c["flag"]+c["ok"]}')
bt=collections.defaultdict(lambda:[0,0])
for i,(v,_,_) in prim.items():
    if i in pk: bt[pk[i]['type']][0]+=flag(v); bt[pk[i]['type']][1]+=1
print('planted by type:',{k:f'{a}/{b}' for k,(a,b) in bt.items()})
agree=sum(1 for i in second if flag(second[i][0])==flag(prim[i][0])); print(f'overlap agreement (flag/no-flag): {agree}/{len(second)}')
json.dump({'prim':prim,'second':second},open('scored.json','w'),indent=1)
