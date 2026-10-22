import json,sys,os,collections
K='/private/tmp/claude-501/-Users-andylee-Downloads-saas-classraum/93d95221-6d94-4948-9914-9bd6bbc5b2a4/scratchpad/grader-keys/'
G='/Users/andylee/Downloads/saas/classraum/scratchpad/cofounder-grader/'
key=json.load(open(K+'cg-test-key.json')); rej={r['id']:r for r in json.load(open(K+'rejects.json'))}
ctl={c['id']:c for c in json.load(open(K+'controls.json'))}; pl={p['id']:p for p in json.load(open(K+'planted.json'))}
g={}
for name in ('A1','A2','B1','B2'):
    f=G+f'grades-{name}.json'
    if not os.path.exists(f): sys.exit(f'NOT MEASURED: {f} missing')
    for n,v in json.load(open(f)).items(): g[f'test-{name}-{n}']=v
miss=[k for k in key if k not in g]
if miss: sys.exit(f'NOT MEASURED: {len(miss)} ungraded')
arm=collections.defaultdict(lambda:[0,0]); fam=collections.defaultdict(lambda:[0,0])
for k,m in key.items():
    fl=g[k].get('verdict')!='unique'; arm[m['arm']][0]+=fl; arm[m['arm']][1]+=1
    src=rej.get(m['id']) or ctl.get(m['id']) or pl.get(m['id']); fam[(m['arm'],src['family']+'/'+src['section'])][0]+=fl; fam[(m['arm'],src['family']+'/'+src['section'])][1]+=1
R,P,C=arm['reject'],arm['planted'],arm['control']
print(f'1 held-out reject recall {R[0]}/{R[1]}  bar >=18/29 -> {"PASS" if R[0]>=18 and R[1]==29 else "FAIL"}')
print(f'2 planted recall         {P[0]}/{P[1]}  bar >=32/40 -> {"PASS" if P[0]>=32 and P[1]==40 else "FAIL"}')
print(f'3 control false flags    {C[0]}/{C[1]} bar <=24/120 -> {"PASS" if C[0]<=24 and C[1]==120 else "FAIL"}')
for (a,f),(x,n) in sorted(fam.items()): print(f'   {a:8} {f:22} flagged {x}/{n}')
for br in 'AB':
    sub=[(k,m) for k,m in key.items() if k.startswith(f'test-{br}')]
    r=[g[k]['verdict']!='unique' for k,m in sub if m['arm']=='reject']; print(f'brief {br}: rejects {sum(r)}/{len(r)}')
for k,m in key.items():
    if m['arm']=='control' and g[k].get('verdict')!='unique': print('control flag:',ctl[m['id']]['family'],ctl[m['id']]['section'],'|',g[k].get('reason','')[:150])
