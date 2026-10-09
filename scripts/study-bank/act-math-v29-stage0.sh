#!/bin/zsh
# act-math-v29-stage0.sh [--commission]
# Stage 0 for act-math-v29 (ACT-MATH-V29-PREREGISTERED.md): per arm core file, the merged core, the IES 24
# and the spares file. Run AFTER act-math-v29-assemble.mjs (which applies any pre-registered spare promotion).
# Copied from act-math-v28-stage0.sh; changes: v29 names and ten arms, the v29 projection (GATE, rates re-derived
# with v28 included, G8 low side), key-extremity-projection and the v28 projection REPORTED, and the new
# cross-item tell check act-math-v29-cross-tells.mjs (CONV = return; WB / PCT2 read, PCT2 at most one per batch).
# Scratch dir: the session scratchpad (no env var).
cd /Users/andylee/Downloads/saas/classraum || exit 2
S=scripts/study-bank
SCR=/private/tmp/claude-501/-Users-andylee-Downloads-saas-classraum/93d95221-6d94-4948-9914-9bd6bbc5b2a4/scratchpad/act-math-v29-work
ARMS=(d1 d2 a1 a2 f1 f2 g1 g2 s n)
F=(); for a in $ARMS; do F+=($S/act-math-v29-$a.batch.json); done
X=$S/act-math-v29.spares.json
for f in $F $X; do [[ -s $f ]] || { echo "REFUSING: $f missing"; exit 2 }; done
COMM=""; [[ "$1" == "--commission" ]] && COMM="--commission"
node -e "
const fs=require('fs');const all=process.argv.slice(1).flatMap(p=>JSON.parse(fs.readFileSync(p,'utf8')));
const ids=all.map(i=>i.id); if(new Set(ids).size!==ids.length){console.error('DUP IDS');process.exit(2)}
fs.writeFileSync('$S/act-math-v29.batch.json',JSON.stringify(all,null,1)+'\n');
const ies=all.filter(i=>i.domain==='Integrating Essential Skills');
fs.writeFileSync('$SCR/act-math-v29-ies.batch.json',JSON.stringify(ies,null,1)+'\n');
const d={};for(const i of all)d[i.domain]=(d[i.domain]||0)+1;console.log('merged core',all.length,JSON.stringify(d))" $F || exit 2
M=$S/act-math-v29.batch.json; I=$SCR/act-math-v29-ies.batch.json
echo "merged sha $(shasum -a 256 $M | cut -c1-16)   spares sha $(shasum -a 256 $X | cut -c1-16)"
zsh $S/act-math-v18-preflight.sh $F $M $I $X 2>&1
echo "######## key-rank-position"; node $S/key-rank-position.mjs $F $M $I $X 2>&1 | tail -40
echo "######## act-math-v29-projection (GATE; $COMM)"; node $S/act-math-v29-projection.mjs $COMM $F 2>&1 | sed -n '/== MERGED/,$p'; echo "-> exit ${pipestatus[1]}"
echo "######## key-extremity-projection (v25 bars; REPORTED under v29, read-only, sha $(shasum -a 256 $S/key-extremity-projection.mjs | cut -c1-16))"; node $S/key-extremity-projection.mjs $F 2>&1 | tail -8; echo "-> exit ${pipestatus[1]} (reported)"
echo "######## act-math-v28-projection (REPORTED under v29: v24-v26 rates)"; node $S/act-math-v28-projection.mjs $F 2>&1 | sed -n '/== MERGED/,$p' | head -6
echo "######## cross-item tells (CONV = return; WB confirmed = return; PCT2 at most one confirmed per batch)"; node $S/act-math-v29-cross-tells.mjs $M $X 2>&1 | grep -v '^selftest'; echo "-> exit ${pipestatus[1]}"
echo "######## (c) mechanical"
for f in $F $M $X; do node $SCR/onesided.mjs $f; done
echo "######## IES direction declarations (D1-D4 return; D5 read)"; for f in $S/act-math-v29-d1.batch.json $S/act-math-v29-d2.batch.json $X; do node $S/act-math-v27-ies-directions.mjs $f 2>&1 | grep -v '^selftest'; done
echo "######## interior niceness"; for f in $F $M $X; do node $S/check-interior-niceness.mjs $f 2>&1 | tail -12; done
echo "######## option shapes (RUN = return; GAP read), per file, merged, spares"; for f in $F $M $X; do node $S/act-math-v26-option-shapes.mjs $f 2>&1 | grep -v '^selftest'; done
echo "######## merge checks (closure ON THE KEY = return; shared values / subskills read)"
E=$SCR/empty.json; echo '[]' > $E
for f in $F $X; do echo "--- $f"; node $S/merge-halves.mjs $f $E $SCR/mh-tmp.json 2>&1 | grep -E 'CLOSURE|no option set|SHARED|OPTION VALUE|TRIPLE|SUBSKILL IS'; done
for p in "d1 d2 d" "a1 a2 a" "f1 f2 f" "g1 g2 g"; do set -- ${=p}; node $S/merge-halves.mjs $S/act-math-v29-$1.batch.json $S/act-math-v29-$2.batch.json $SCR/mh-$3.json 2>&1 | grep -vE '^ +[0-9]+x |^wrote|^subskills'; done
node $S/merge-halves.mjs $S/act-math-v29-s.batch.json $S/act-math-v29-n.batch.json $SCR/mh-sn.json 2>&1 | grep -vE '^ +[0-9]+x |^wrote|^subskills'
node $S/merge-halves.mjs $SCR/mh-d.json $SCR/mh-a.json $SCR/mh-da.json 2>&1 | grep -E 'SHARED|OPTION VALUE|stem-overlap|merged'
node $S/merge-halves.mjs $SCR/mh-f.json $SCR/mh-g.json $SCR/mh-fg.json 2>&1 | grep -E 'SHARED|OPTION VALUE|stem-overlap|merged'
node $S/merge-halves.mjs $SCR/mh-da.json $SCR/mh-fg.json $SCR/mh-dafg.json 2>&1 | grep -E 'SHARED|OPTION VALUE|stem-overlap|merged'
node $S/merge-halves.mjs $SCR/mh-dafg.json $SCR/mh-sn.json $SCR/mh-all.json 2>&1 | grep -E 'SHARED|OPTION VALUE|stem-overlap|merged'
node $S/merge-halves.mjs $SCR/mh-all.json $X $SCR/mh-allx.json 2>&1 | grep -E 'SHARED|OPTION VALUE|stem-overlap|merged'
echo "######## run-middle / key-is-sum / pair-constant (reading lists)"; for c in check-run-middle check-key-is-sum check-option-pair-constant; do node $S/$c.mjs $M 2>&1 | tail -14; node $S/$c.mjs $X 2>&1 | tail -6; done
N=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$M','utf8')).length)")
echo "######## arith class (reading list)"; node $S/check-key-arith-class.mjs $N $M 2>&1 | tail -50
