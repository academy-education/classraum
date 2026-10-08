#!/bin/zsh
# mf28-preflight.sh <batch.json> — stage-0 pre-flight for sat-math-v28-full
# (PREREG-MF28-2026-10-09.md; algf27-preflight.sh with mf28-slots.mjs and mf28-checks.mjs
# (PAIR / RUN / DIR + DPAIR / PLUG) in place of algf27-slots / algf27-checks; merge-halves CLOSURE on the single file, so all of them run on every
# author file BEFORE the return round is spent). Prints each check's tail and exit code.
# Exits 1 if a gating check fails; reading-list checks are printed only.
cd /Users/andylee/Downloads/saas/classraum || exit 2
set -a; source .env.local; set +a
S=scripts/study-bank
F=$1
[[ -s $F ]] || { echo "REFUSING: $F missing or empty"; exit 2 }
n=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$F','utf8')).length)") || { echo "REFUSING: $F unparseable"; exit 2 }
echo "##### $F  items=$n  sha $(shasum -a 256 $F | cut -c1-16)"
bad=0
node $S/math-bank-helper.mjs verify $F 2>&1 | grep -vE '^OK ' | tail -14; rc=${pipestatus[1]}
echo "-> verify exit $rc"; [[ $rc -eq 0 ]] || bad=1
for c in "mf28-slots.mjs $F" "mf28-checks.mjs $F" "check-sign-pair.mjs $F" "check-key-is-composition.mjs $F" "check-explanation-hygiene.mjs $F" "check-interior-niceness.mjs $F" "stem-duplicates.mjs $F --family sat" "check-math-near-dup.mjs $F --family sat" "check-duplicate-option-sets.mjs sat/math $F"; do
  echo "=== ${c%% *}"
  node $S/${=c} 2>&1 | tail -40; rc=${pipestatus[1]}
  echo "-> exit $rc"; [[ $rc -eq 0 ]] || bad=1
done
echo "=== merge-halves.mjs (single file: CLOSURE, shared keys/options within the file)"
T=$(mktemp -d); echo '[]' > $T/empty.json
node $S/merge-halves.mjs $F $T/empty.json $T/out.json 2>&1 | grep -E "CLOSURE|SHARED KEY|OPTION VALUE IN|no option set|no two items|SUBSKILL IS|TRIPLE"
if node $S/merge-halves.mjs $F $T/empty.json $T/out.json 2>&1 | grep -qE "^CLOSURE"; then echo "-> CLOSURE present: FAIL"; bad=1; else echo "-> closure exit 0"; fi
rm -rf $T
for c in "check-math-hub.mjs $F" "check-symbolic-hub.mjs $F" "key-rank-position.mjs $F" "check-key-magnitude.mjs sat/math $F" "check-key-arith-class.mjs $n $F" "math-mechanism-dup.mjs $n $F"; do
  echo "=== (report) ${c%% *}"
  node $S/${=c} 2>&1 | tail -25; echo "-> exit ${pipestatus[1]} (report, read by hand)"
done
echo "GATING CHECKS $([[ $bad -eq 0 ]] && echo PASS || echo FAIL)  (interior-niceness: any parity/KEY-CLEANER/complement/denominators line is a return even at exit 0; mf28-checks '(read)' lines (incl. every PLUG line) and every extreme key's stem-readable direction are read by hand)"
exit $bad
