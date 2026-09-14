#!/usr/bin/env python3
"""Score the sat-cs-v10 options-only attack.

Solver A pre-registered a split BEFORE answering and predicted the two halves
would score very differently. It is the testable claim in this run, so it is
scored as its own stratum rather than mentioned afterwards:

  FRAME-SHARED (21 items)  all four options repeat one frame and vary a single
                           clause -- same speech act, same length, same
                           register. The construction CLAUDE.md calls clean.
                           Predicted: CHANCE, except where recall rescues it.

  HETEROGENEOUS (33)       exactly one option describes a RELATION BETWEEN TWO
                           PARTS of the text (concede-then-reverse,
                           present-then-recast) while the other three state a
                           flat claim. Predicted: far above chance.

If the split holds, the actionable finding is stronger than the usual advice and
is about DISTRACTORS, not the key: three flat claims plus one transition
description is solvable regardless of how good the passage is.
"""
import json, math, collections, sys

K = json.load(open('scripts/study-bank/cs10-attack.key.json'))
NAMES = 'abc'
S = {}
for n in NAMES:
    try:
        S[n] = json.load(open(f'scripts/study-bank/cs10-attack.solver-{n}.json'))
    except FileNotFoundError:
        sys.exit(f'REFUSING: solver {n} has not landed. A partial run is not a run.')
for n, s in S.items():
    miss = [i for i in K if i not in s or 'pick' not in s[i]]
    if miss:
        sys.exit(f'REFUSING: solver {n} skipped {miss}')

FRAME = set("S-02 S-07 S-11 S-13 S-17 S-21 S-27 S-28 S-29 S-30 S-32 S-33 S-35 S-39 S-44 S-46 S-49 S-51 S-52".split())

def wilson(k, n, z=1.96):
    if not n: return None
    p = k/n; d = 1+z*z/n; c = (p+z*z/(2*n))/d
    h = z*math.sqrt(p*(1-p)/n + z*z/(4*n*n))/d
    return (100*max(0, c-h), 100*min(1, c+h))

deal = collections.Counter(v['letter'] for v in K.values())
best = 100*max(deal.values())/len(K)
print(f"items {len(K)}  solvers {len(S)}  picks {len(S)*len(K)}  deal {dict(sorted(deal.items()))}")
print(f"chance 25.0%  best-fixed-letter {best:.1f}%  -> CONTROL {max(25.0,best):.1f}%")
for kind in ['candidate', 'live-control']:
    ids = [i for i in K if K[i]['kind'] == kind]
    c = collections.Counter(K[i]['letter'] for i in ids)
    print(f"   {kind:13s} deal {dict(sorted(c.items()))}  best-fixed WITHIN stratum {100*max(c.values())/len(ids):.1f}%")
print()

def band(label, pred):
    rows = [(i, n) for n in S for i in K if pred(i, n)]
    if not rows:
        print(f"  {label:46s} n=0   NOT MEASURED"); return None
    k = sum(S[n][i]['pick'].strip().upper() == K[i]['letter'] for i, n in rows)
    lo, hi = wilson(k, len(rows))
    print(f"  {label:46s} n={len(rows):3d}  {k:3d}/{len(rows)} = {100*k/len(rows):5.1f}%  CI {lo:4.1f}-{hi:4.1f}%")
    return (100*k/len(rows), (lo, hi), len(rows))

print("BY STRATUM")
c = band('CANDIDATE sat-cs-v10', lambda i, n: K[i]['kind'] == 'candidate')
l = band('LIVE CONTROL (same 2 subskills)', lambda i, n: K[i]['kind'] == 'live-control')
if c and l:
    print(f"\n  Candidate {c[0]:.1f}% vs live control {l[0]:.1f}%  ->  {c[0]-l[0]:+.1f}pts")
    ov = not (c[1][1] < l[1][0] or l[1][1] < c[1][0])
    print("  intervals OVERLAP — cannot separate the batch from the shipped bank." if ov
          else "  intervals DISJOINT — the batch differs from the shipped bank.")

print("\nSOLVER A'S PRE-REGISTERED ARCHITECTURE SPLIT — the testable claim in this run")
f = band('FRAME-SHARED  (predicted: chance)', lambda i, n: i in FRAME)
h = band('HETEROGENEOUS (predicted: far above)', lambda i, n: i not in FRAME)
if f and h:
    print(f"  gap {h[0]-f[0]:+.1f}pts   ->  " + ("PREDICTION HOLDS" if h[0] - f[0] > 15 else "prediction NOT borne out"))
print("  and within the candidates only:")
band('  candidate / frame-shared', lambda i, n: i in FRAME and K[i]['kind'] == 'candidate')
band('  candidate / heterogeneous', lambda i, n: i not in FRAME and K[i]['kind'] == 'candidate')

print("\nBY DECLARED BASIS — recall is the channel the attack cannot see")
for kind in ['candidate', 'live-control']:
    for b in ['mechanism', 'recall', 'guess']:
        band(f'{kind:13s} / {b}', lambda i, n, k2=kind, b2=b: K[i]['kind'] == k2 and S[n][i].get('basis') == b2)

print("\nBY SUBSKILL (candidates)")
for sub in sorted({K[i]['sub'] for i in K if K[i]['kind'] == 'candidate'}):
    band(sub, lambda i, n, s2=sub: K[i]['kind'] == 'candidate' and K[i]['sub'] == s2)

print("\nPER SOLVER")
for n in NAMES:
    out = []
    for kind in ['candidate', 'live-control']:
        ids = [i for i in K if K[i]['kind'] == kind]
        k = sum(S[n][i]['pick'].strip().upper() == K[i]['letter'] for i in ids)
        out.append(f"{kind[:4]} {k:2d}/{len(ids):2d} = {100*k/len(ids):5.1f}%")
    picks = collections.Counter(S[n][i]['pick'].strip().upper() for i in K)
    print(f"  solver {n}  " + "   ".join(out) + f"   picks {dict(sorted(picks.items()))}")
