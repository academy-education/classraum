#!/bin/sh
# MAP Science batch 4: build grader packets (b3-full layout). Run from the repo root AFTER stage 0/0b is clean and
# XDUP-REVIEW.md answers every REVIEW line. Cold packets per grader folder; keyed packets ONLY in packets/hold/.
#   sh scripts/study-bank/map-v2-work/science-b4/build-packets.sh
set -e
D=scripts/study-bank/map-v2-work; S=scratchpad/map-science-b4; P=$S/packets
for pair in life:L phys:P earth:E; do
  a=${pair%%:*}; A=${pair##*:}
  node $D/science-pilot/sci-packet.mjs grader $S/$A/items.json --out $P/$a
  mkdir -p $P/hold $P/$a-g1 $P/$a-g2
  mv $P/$a/grader-keyed.md $P/hold/$a-keyed.md
  cp $P/$a/grader-cold.md $P/$a-g1/grader-cold.md; cp $P/$a/grader-cold.md $P/$a-g2/grader-cold.md
  echo "$a: cold $(grep -c '^## MSB4' $P/$a/grader-cold.md) items, KEY lines $(grep -c '^KEY:' $P/$a/grader-cold.md); keyed $(grep -c '^KEY:' $P/hold/$a-keyed.md) KEY lines"
done
cp $D/science-b4/GRADER-PROMPT.md $P/GRADER-PROMPT.md
