#!/usr/bin/env python3
"""Score the ISOLATED Words in Context control.

THE QUESTION. sat-wic-v1 measured 46.9% against a matched live control of 44.4%
-- indistinguishable. But that control contradicts the recorded 12.5% / 33.3%
for the SAME 20 items, and one candidate explanation was mine: the earlier
render interleaved these 20 live items with 32 fresh candidates of the same
single-word format, which may have handed solvers calibration the original run
never gave them. This file holds the 20 live items ALONE.

  near 44%  -> the control is real, and sat-wic-v1 matches its bank
  near 12-33% -> the earlier control was inflated by my render, and the batch
                 at 46.9% genuinely leaks

TWO SPLITS ARE REPORTED, both fixed before the data:

1. BY OPTION SHAPE. 9 of the 20 are single-word and 11 are gloss (options that
   spell out a definition). ONLY THE 9 are matched to the candidate batch's
   render, so they are the arm that answers the question above; the 11 gloss
   items are a different instrument pointed at the same subskill.

2. BY SENSE-INVENTORY SHAPE, which solver A named unprompted: sets whose four
   options are the dictionary senses of ONE headword, identifiable blind
   because the options are mutually exclusive glosses rather than four
   substitutable words. Their claim is that this construction is itself the
   leak -- the primary and etymological senses are structurally distractors,
   since an item testing the primary sense would be answerable by anyone who
   knows the word and would never be written.
"""
import json, math, collections, sys

K = json.load(open('scripts/study-bank/wic-control.key.json'))
NAMES = 'abc'
S = {}
for n in NAMES:
    try:
        S[n] = json.load(open(f'scripts/study-bank/wic-control.solver-{n}.json'))
    except FileNotFoundError:
        sys.exit(f'REFUSING: solver {n} has not landed. A partial run is not a run.')
def pick_of(entry):
    """Solvers write the letter under 'pick' or 'answer' -- both appeared in the
    same run. Read either, and REFUSE on neither rather than scoring a zero.

    The first version of this scorer demanded 'pick' and reported the other two
    solvers as having SKIPPED all 20 items. It refused rather than scoring them
    wrong, which is the right failure -- but the message named the wrong cause,
    and a message that misnames the cause sends the next reader to re-run an
    agent that already did the work. A refusal must say what it could not read,
    not guess why."""
    if not isinstance(entry, dict): return None
    for f in ('pick', 'answer', 'choice', 'letter'):
        v = entry.get(f)
        if isinstance(v, str) and v.strip(): return v.strip().upper()
    return None

for n, s in S.items():
    absent = [i for i in K if i not in s]
    unread = [i for i in K if i in s and pick_of(s[i]) is None]
    if absent: sys.exit(f'REFUSING: solver {n} has no entry for {absent}')
    if unread: sys.exit(f'REFUSING: solver {n} has entries for {unread} but no readable letter field in them')

SENSE = set("W-01 W-02 W-04 W-06 W-10 W-11 W-12".split())   # solver A, pre-registered

def wilson(k, n, z=1.96):
    if not n: return None
    p = k/n; d = 1+z*z/n; c = (p+z*z/(2*n))/d
    h = z*math.sqrt(p*(1-p)/n + z*z/(4*n*n))/d
    return (100*max(0, c-h), 100*min(1, c+h))

deal = collections.Counter(v['letter'] for v in K.values())
best = 100*max(deal.values())/len(K)
print(f"items {len(K)}  solvers 3  picks {3*len(K)}  deal {dict(sorted(deal.items()))}")
print(f"chance 25.0%  best-fixed-letter {best:.1f}%  -> CONTROL {max(25.0,best):.1f}%\n")

def band(label, pred):
    rows = [(i, n) for n in S for i in K if pred(i, n)]
    if not rows:
        print(f"  {label:44s} n=0   NOT MEASURED"); return None
    k = sum(pick_of(S[n][i]) == K[i]['letter'] for i, n in rows)
    lo, hi = wilson(k, len(rows))
    print(f"  {label:44s} n={len(rows):3d}  {k:3d}/{len(rows)} = {100*k/len(rows):5.1f}%  CI {lo:4.1f}-{hi:4.1f}%")
    # RETURN THE RAW COUNTS. Reconstructing k and n from a rounded rate is how
    # the verdict below came to test 2-of-9 when the data was 7-of-27.
    return (100*k/len(rows), (lo, hi), len(rows), k)

print("THE LOAD-BEARING NUMBER — these 20 live items, measured ALONE")
allr = band('ALL 20 live Words in Context items', lambda i, n: True)

print("\nBY OPTION SHAPE — only the single-word arm is matched to the candidate render")
w = band('single-word (9 items, MATCHED)', lambda i, n: K[i]['shape'] == 'word')
g = band('gloss (11 items, different instrument)', lambda i, n: K[i]['shape'] == 'gloss')

print("\nSOLVER A'S SENSE-INVENTORY SPLIT — named before any key was seen")
band('sense-inventory sets', lambda i, n: i in SENSE)
band('everything else', lambda i, n: i not in SENSE)

print("\nBY BASIS")
for b in ['mechanism', 'guess']:
    band(f'{b}', lambda i, n, b2=b: S[n][i].get('basis') == b2)

print("\nPER SOLVER")
for n in NAMES:
    k = sum(pick_of(S[n][i]) == K[i]['letter'] for i in K)
    picks = collections.Counter(pick_of(S[n][i]) for i in K)
    print(f"  solver {n}  {k:2d}/{len(K)} = {100*k/len(K):5.1f}%   picks {dict(sorted(picks.items()))}")

print("\nVERDICT AGAINST THE TWO PRIOR MEASUREMENTS OF THESE SAME ITEMS")
if w:
    print(f"  interleaved with 32 candidates (2026-09-12) : 44.4%  single-word arm")
    print(f"  ISOLATED, this run                          : {w[0]:.1f}%  single-word arm")
    print(f"  recorded in CLAUDE.md                       : 12.5% / 33.3%")
    lo, hi = w[1]
    """A CANNED VERDICT MISREAD ITS OWN NUMBERS AND IS REPLACED.

    The first version said: if the isolated interval CONTAINS the interleaved
    figure, the earlier control holds. It does contain it -- and at n=27 the
    interval spans 13.2-44.7 and therefore contains the recorded 12.5% and
    33.3% too. An interval that excludes nothing is not evidence for anything
    inside it, and 'contains' was doing no work while sounding like a finding.

    What decides it is the POINT ESTIMATE and a direct test of each hypothesis
    on the same picks: P(<=7 of 27 | 44.4%) = 0.039 against
    P(<=7 of 27 | 25.9%) = 0.601. So the verdict now tests, and says when it
    cannot separate rather than picking the flattering branch."""
    from math import comb
    k_obs, n_obs = w[3], w[2]
    def tail(p):
        return sum(comb(n_obs, i) * p**i * (1-p)**(n_obs-i) for i in range(0, k_obs+1))
    t_inter, t_iso = tail(0.444), tail(w[0]/100)
    print(f"  P(<= {k_obs} of {n_obs} | interleaved 44.4%) = {t_inter:.4f}")
    print(f"  P(<= {k_obs} of {n_obs} | isolated {w[0]:.1f}%) = {t_iso:.4f}")
    if t_inter < 0.05:
        print("  -> the interleaved control is REFUTED on these picks. Interleaving")
        print("     inflated it, and the isolated figure is the better baseline.")
    elif lo <= 44.4 <= hi and t_inter > 0.20:
        print("  -> cannot separate the two. Neither is refuted; do not pick one.")
    else:
        print("  -> inconclusive; read the interval and the tail together.")
