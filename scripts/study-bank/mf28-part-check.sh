#!/bin/zsh
# mf28-part-check.sh <mf28-parts/SM28F-XNN.json> — the per-ITEM check an author runs on each part file the
# moment it is written (PREREG-MF28-2026-10-09.md; A90: plug-back was the largest drop class, so it is
# tested DURING authoring, item by item, not only at hand-in). Runs on the single item: sandbox verify
# (key + every distractor_solve recompute), the slot (domain / difficulty / key position), and
# mf28-checks (PAIR, RUN, DIR, DPAIR, PLUG). Prints "PART OK" or "PART FAIL"; exit 1 on FAIL.
# '(read)' lines are not failures but must be answered in the item's self_audit.
cd /Users/andylee/Downloads/saas/classraum || exit 2
S=scripts/study-bank; P=$1
[[ -s $P ]] || { echo "REFUSING: $P missing"; exit 2 }
T=$(mktemp -d); node -e "const it=JSON.parse(require('fs').readFileSync('$P','utf8')); require('fs').writeFileSync('$T/one.json', JSON.stringify([it]))" || { echo "REFUSING: $P unparseable"; rm -rf $T; exit 2 }
bad=0
node $S/math-bank-helper.mjs verify $T/one.json 2>&1 | tail -4; [[ ${pipestatus[1]} -eq 0 ]] || bad=1
node $S/mf28-slots.mjs $T/one.json 2>&1 | tail -3; [[ ${pipestatus[1]} -eq 0 ]] || bad=1
node $S/mf28-checks.mjs $T/one.json 2>&1 | grep -v '^selftest'; [[ ${pipestatus[1]} -eq 0 ]] || bad=1
# added 2026-10-09 after the first returns (P, Q): two pre-flight gates authors could not see per item
set -a; source .env.local; set +a
node $S/check-math-near-dup.mjs $T/one.json --family sat 2>&1 | grep -E 'FLAG|best'; [[ ${pipestatus[1]} -eq 0 ]] || bad=1
node $S/check-interior-niceness.mjs $T/one.json 2>&1 | grep -E 'KEY-CLEANER|parity [a-z]|complement|denominator' | grep -vE 'violations|pairs|singling' && bad=1
rm -rf $T
echo "PART $([[ $bad -eq 0 ]] && echo OK || echo FAIL) $P"; exit $bad
