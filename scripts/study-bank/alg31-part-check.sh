#!/bin/zsh
# alg31-part-check.sh <scripts/study-bank/sat-math-alg31-work/parts/SM31L-XN.json> — the per-ITEM check an
# author runs on each part file the moment it is written (PREREG-MATH-ALG31-2026-10-23.md; = mf30-part-check.sh
# with the alg31 checks). On the single item:
#   1 sandbox verify      math-bank-helper verify (key + every distractor_solve recompute)
#   2 slot                alg31-slots.mjs (id, Algebra, hard, mech, ask, key rank)
#   3 pre-flight          alg31-preflight.mjs single-item mode (R1-R6, R9, R11 + the M block; R7 / R8 / R10
#                         are batch rules, printed only)
#   4 live-dup ORDER      alg31-census.mjs check-part (the idea was probed against the live rows BEFORE the
#                         part was written; every query read)
#   5 near-dup            check-math-near-dup.mjs --family sat (prompt Jaccard >= 0.60 or an equal option
#                         multiset vs a live SAT Math row)
#   6 interior niceness   check-interior-niceness.mjs (parity / KEY-CLEANER / complement / denominator)
# Prints "PART OK" or "PART FAIL"; exit 1 on FAIL, 2 on a missing / unparseable part.
# '(read)' lines are not failures but must be answered in the item's self_audit.
cd /Users/andylee/Downloads/saas/classraum || exit 2
S=scripts/study-bank; P=$1
[[ -n $P && -s $P ]] || { echo "REFUSING: part ${P:-<none>} missing or empty"; exit 2 }
T=$(mktemp -d); node -e "const it=JSON.parse(require('fs').readFileSync('$P','utf8')); if(!it||Array.isArray(it)||!it.id) process.exit(3); require('fs').writeFileSync('$T/one.json', JSON.stringify([it]))" || { echo "REFUSING: $P is not one parseable item object"; rm -rf $T; exit 2 }
bad=0
node $S/math-bank-helper.mjs verify $T/one.json 2>&1 | tail -4; [[ ${pipestatus[1]} -eq 0 ]] || bad=1
node $S/alg31-slots.mjs $T/one.json 2>&1 | grep -v '^selftest'; [[ ${pipestatus[1]} -eq 0 ]] || bad=1
node $S/alg31-preflight.mjs $T/one.json 2>&1 | grep -v '^selftest'; [[ ${pipestatus[1]} -eq 0 ]] || bad=1
node $S/alg31-census.mjs check-part $P 2>&1; [[ ${pipestatus[1]} -eq 0 ]] || bad=1
set -a; source .env.local; set +a
node $S/check-math-near-dup.mjs $T/one.json --family sat 2>&1 | grep -E 'FLAG|best'; [[ ${pipestatus[1]} -eq 0 ]] || bad=1
node $S/check-interior-niceness.mjs $T/one.json 2>&1 | grep -E 'KEY-CLEANER|parity [a-z]|complement|denominator' | grep -vE 'violations|pairs|singling' && bad=1
rm -rf $T
echo "PART $([[ $bad -eq 0 ]] && echo OK || echo FAIL) $P"; exit $bad
