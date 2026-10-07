#!/bin/zsh
# act-math-v18-preflight.sh <batch.json> [more.json ...]
# Stage-0 pre-flight for act-math-v18 (the v16/v17 list, unchanged), run per file.
# Prints every check's tail and its exit code; exits non-zero if any check that
# gates exits non-zero. check-plurality-key exit 2 = NOT MEASURED, reported, not a pass.
cd /Users/andylee/Downloads/saas/classraum || exit 2
set -a; source .env.local; set +a
S=scripts/study-bank
[[ $# -ge 1 ]] || { echo "usage: act-math-v18-preflight.sh <batch.json...>"; exit 2 }
bad=0
for F in "$@"; do
  [[ -s $F ]] || { echo "REFUSING: $F missing or empty"; exit 2 }
  n=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$F','utf8')).length)") || { echo "REFUSING: $F unparseable"; exit 2 }
  echo "##### $F  items=$n  sha $(shasum -a 256 $F | cut -c1-16)"
  BANK_FAMILY=act node $S/math-bank-helper.mjs verify $F 2>&1 | grep -vE '^OK ' | tail -12; rc=${pipestatus[1]}
  echo "-> verify exit $rc"; [[ $rc -eq 0 ]] || bad=1
  for c in "key-extremity-gate.mjs $F" "check-key-magnitude.mjs act/math $F" "check-key-is-composition.mjs $F" "check-sign-pair.mjs $F" "check-plurality-key.mjs $F" "check-dead-options.mjs $F" "check-stem-echo.mjs $F" "check-key-singleton.mjs $F" "stem-duplicates.mjs $F --family act" "check-duplicate-option-sets.mjs act/math $F"; do
    echo "=== ${c%% *}"
    node $S/${=c} 2>&1 | tail -6; rc=${pipestatus[1]}
    echo "-> exit $rc"
    if [[ $rc -ne 0 ]]; then
      if [[ ${c%% *} == check-plurality-key.mjs && $rc -eq 2 ]]; then echo "   (NOT MEASURED — not a pass, not a gate)"; else bad=1; fi
    fi
  done
done
echo "PREFLIGHT $([[ $bad -eq 0 ]] && echo PASS || echo FAIL)"
exit $bad
