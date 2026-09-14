#!/usr/bin/env python3
"""Score the act-math-v15-mix options-only attack.

TWO SCORING DECISIONS ARE MADE HERE IN ADVANCE OF SEEING ANY NUMBER, because
solver A raised both in their report and both move the result:

1. THE DENOMINATOR IS ALL 72 ITEMS. Solver A asked that three items carrying no
   numeric channel at all (categorical option sets -- sign combinations,
   strict/non-strict pairs) be reported NOT MEASURED rather than as misses.
   REFUSED, and the reason is the direction of the bias: an item that CANNOT be
   solved from its options is the best kind of item, and dropping it from the
   denominator removes the batch's strongest work and inflates the rate. The
   attack's question is "how often is this batch solvable options-only", and an
   unsolvable item is a true zero, not an absent measurement. Reported both ways
   so the choice is visible, with the full denominator as the headline.

2. THE MECHANISM/GUESS SPLIT IS EXPECTED TO BE UNINFORMATIVE HERE, and solver A
   said so themselves: 64 of their 72 picks are tagged `mechanism`, but the
   mechanism is overwhelmingly the tightest-adjacent-pair channel, which is a
   MEASURED ~33% edge rather than a crack. "If the mechanism stratum comes out
   near 33% that is TAP working as advertised, not a crack." So the split is
   printed, and read against 33% rather than against 25%.
"""
import json, math, collections, itertools, sys

K = json.load(open('scripts/study-bank/v15-attack.key.json'))
S = {n: json.load(open(f'scripts/study-bank/v15-attack.solver-{n}.json')) for n in 'abc'}
for n, s in S.items():
    miss = [i for i in K if i not in s or 'pick' not in s[i]]
    if miss:
        sys.exit(f'REFUSING: solver {n} skipped {miss}')

def wilson(k, n, z=1.96):
    if not n: return None
    p = k/n; d = 1+z*z/n; c = (p+z*z/(2*n))/d
    h = z*math.sqrt(p*(1-p)/n + z*z/(4*n*n))/d
    return (100*max(0, c-h), 100*min(1, c+h))

deal = collections.Counter(v['letter'] for v in K.values())
best = 100*max(deal.values())/len(K)
print(f"items {len(K)}  solvers 3  picks {3*len(K)}  deal {dict(sorted(deal.items()))}")
print(f"chance 25.0%  best-fixed-letter {best:.1f}%  -> CONTROL {max(25.0,best):.1f}%\n")

def band(label, pred, note=''):
    rows = [(i, n) for n in S for i in K if pred(i, n)]
    if not rows:
        print(f"  {label:44s} n=0   NOT MEASURED"); return None
    k = sum(S[n][i]['pick'].strip().upper() == K[i]['letter'] for i, n in rows)
    lo, hi = wilson(k, len(rows))
    print(f"  {label:44s} n={len(rows):3d}  {k:3d}/{len(rows)} = {100*k/len(rows):5.1f}%  CI {lo:4.1f}-{hi:4.1f}%{note}")
    return (100*k/len(rows), (lo, hi), len(rows))

print("BY STRATUM  — full denominator, every item counted")
c = band('CANDIDATE act-math-v15-mix', lambda i, n: K[i]['kind'] == 'candidate')
l = band('LIVE CONTROL (same 3 domains)', lambda i, n: K[i]['kind'] == 'live-control')

print("\nBY BASIS — read against 33%, not 25%: the 'mechanism' is mostly TAP")
for kind in ['candidate', 'live-control']:
    for b in ['mechanism', 'guess']:
        band(f'{kind:13s} / {b}', lambda i, n, k2=kind, b2=b: K[i]['kind'] == k2 and S[n][i].get('basis') == b2)

print("\nBY DOMAIN (candidates)")
for d in sorted({K[i]['domain'] for i in K if K[i]['kind'] == 'candidate'}):
    band(d, lambda i, n, d2=d: K[i]['kind'] == 'candidate' and K[i]['domain'] == d2)

if c and l:
    print(f"\nCandidate {c[0]:.1f}% vs live control {l[0]:.1f}%  ->  {c[0]-l[0]:+.1f}pts")
    ov = not (c[1][1] < l[1][0] or l[1][1] < c[1][0])
    print("  intervals OVERLAP — cannot separate the batch from the shipped bank." if ov
          else "  intervals DISJOINT — the batch differs from the shipped bank.")

print("\nPER SOLVER")
for n in 'abc':
    for kind in ['candidate', 'live-control']:
        ids = [i for i in K if K[i]['kind'] == kind]
        k = sum(S[n][i]['pick'].strip().upper() == K[i]['letter'] for i in ids)
        print(f"  solver {n}  {kind:13s} {k:2d}/{len(ids):2d} = {100*k/len(ids):5.1f}%")

print("\nTHE SOLVERS' OWN LETTER SIGNATURE — both A and C raised this against themselves")
print("  A solver channel should not have a letter signature. The key deal is flat,")
print("  so each letter is the key on ~25% of items; a solver who under-picks a letter")
print("  forfeits that share and CANNOT reach their own ceiling. If the candidates")
print("  score low, part of it may be this rather than the batch.")
keyspread = collections.Counter(v['letter'] for v in K.values())
for n in 'abc':
    picks = collections.Counter(S[n][i]['pick'].strip().upper() for i in K)
    short = {L: keyspread[L] - picks.get(L, 0) for L in 'ABCD'}
    worst = max(short, key=lambda L: short[L])
    print(f"  solver {n}  picks {dict(sorted(picks.items()))}  vs key {dict(sorted(keyspread.items()))}"
          f"   most under-picked: {worst} by {short[worst]}")
print("  key letters are dealt flat by construction, so any deficit is the method's, not the file's.")

print("\nSCORABILITY NOTE — the three items both A and C called structurally blind")
BLIND = ['V-08', 'V-61', 'V-62']
present = [i for i in BLIND if i in K]
if present:
    kinds = {i: K[i]['kind'] for i in present}
    print(f"  {present} -> {kinds}")
    rows = [(i, n) for n in S for i in K if i in present]
    k = sum(S[n][i]['pick'].strip().upper() == K[i]['letter'] for i, n in rows)
    print(f"  they scored {k}/{len(rows)} = {100*k/len(rows):.1f}%")
    cand = [(i, n) for n in S for i in K if K[i]['kind'] == 'candidate']
    ck = sum(S[n][i]['pick'].strip().upper() == K[i]['letter'] for i, n in cand)
    keep = [(i, n) for i, n in cand if i not in present]
    kk = sum(S[n][i]['pick'].strip().upper() == K[i]['letter'] for i, n in keep)
    print(f"  candidates WITH them    {ck}/{len(cand)} = {100*ck/len(cand):5.1f}%   <- headline, the honest denominator")
    if keep:
        print(f"  candidates WITHOUT them {kk}/{len(keep)} = {100*kk/len(keep):5.1f}%   <- shown only so the choice is visible")
    print("  Excluding them would drop the batch's most leak-resistant items and inflate the rate.")

print("\nUNANIMOUS")
for kind in ['candidate', 'live-control']:
    ids = [i for i in K if K[i]['kind'] == kind]
    u = [i for i in ids if all(S[n][i]['pick'].strip().upper() == K[i]['letter'] for n in 'abc')]
    exp = len(ids)*(max(25.0, best)/100)**3
    print(f"  {kind:13s} {len(u)}/{len(ids)} unanimous (expected {exp:.2f})")
    for i in u:
        mech = sum(S[n][i].get('basis') == 'mechanism' for n in 'abc')
        print(f"     {i} {K[i]['localId'][:12]:13s} mechanism {mech}/3")
