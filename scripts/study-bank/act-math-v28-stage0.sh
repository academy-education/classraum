#!/bin/zsh
# act-math-v28-stage0.sh [--commission]
# Stage 0 for act-math-v28 (ACT-MATH-V28-PREREGISTERED.md): per author core file, the merged core, the IES 22
# and the spares file. Run AFTER act-math-v28-assemble.mjs (which applies any pre-registered spare promotion).
# Runs every mechanical check AND the option-shape / merge checks BEFORE the single return is spent.
# --commission (round 1 only): the v28 projection also checks >= 2.5 points of headroom and leave-one-out.
# Copied from act-math-v27-stage0.sh; changes: v28 names, the spares file, the v28 projection (GATE) with
# key-extremity-projection (GATE, read-only), v26/v27 projections REPORTED.
cd /Users/andylee/Downloads/saas/classraum || exit 2
S=scripts/study-bank
SCR=/private/tmp/claude-501/-Users-andylee-Downloads-saas-classraum/93d95221-6d94-4948-9914-9bd6bbc5b2a4/scratchpad/v28   # session scratch (no env var)
F=($S/act-math-v28-{d1,d2,b,c}.batch.json)
X=$S/act-math-v28.spares.json
for f in $F $X; do [[ -s $f ]] || { echo "REFUSING: $f missing"; exit 2 }; done
COMM=""; [[ "$1" == "--commission" ]] && COMM="--commission"
node -e "
const fs=require('fs');const all=process.argv.slice(1).flatMap(p=>JSON.parse(fs.readFileSync(p,'utf8')));
const ids=all.map(i=>i.id); if(new Set(ids).size!==ids.length){console.error('DUP IDS');process.exit(2)}
fs.writeFileSync('$S/act-math-v28.batch.json',JSON.stringify(all,null,1)+'\n');
const ies=all.filter(i=>i.domain==='Integrating Essential Skills');
fs.writeFileSync('$SCR/act-math-v28-ies.batch.json',JSON.stringify(ies,null,1)+'\n');
const d={};for(const i of all)d[i.domain]=(d[i.domain]||0)+1;console.log('merged core',all.length,JSON.stringify(d))" $F || exit 2
M=$S/act-math-v28.batch.json; I=$SCR/act-math-v28-ies.batch.json
echo "merged sha $(shasum -a 256 $M | cut -c1-16)   spares sha $(shasum -a 256 $X | cut -c1-16)"
zsh $S/act-math-v18-preflight.sh $F $M $I $X 2>&1
echo "######## key-rank-position"; node $S/key-rank-position.mjs $F $M $I $X 2>&1 | tail -30
echo "######## act-math-v28-projection (GATE; $COMM)"; node $S/act-math-v28-projection.mjs $COMM $F 2>&1 | tail -40; echo "-> exit ${pipestatus[1]}"
echo "######## key-extremity-projection (v25 bars, GATE; read-only, sha $(shasum -a 256 $S/key-extremity-projection.mjs | cut -c1-16))"; node $S/key-extremity-projection.mjs $F 2>&1 | tail -8; echo "-> exit ${pipestatus[1]}"
echo "######## act-math-v26-projection (REPORTED under v28)"; node $S/act-math-v26-projection.mjs $F 2>&1 | grep -E 'MERGED|rate|PROJECTION' | tail -6
echo "######## act-math-v27-projection (REPORTED under v28; its IES ies-rate line equals v28 G6)"; node $S/act-math-v27-projection.mjs $F 2>&1 | sed -n '/== MERGED/,$p'
echo "######## (c) mechanical"
for f in $F $M $X; do node $SCR/onesided.mjs $f; done   # v26 onesided.mjs, copied to the scratch dir
echo "######## IES direction declarations (D1-D4 return; D5 read)"; for f in $S/act-math-v28-d1.batch.json $S/act-math-v28-d2.batch.json $X; do node $S/act-math-v27-ies-directions.mjs $f 2>&1 | grep -v '^selftest'; done
echo "######## interior niceness"; for f in $F $M $X; do node $S/check-interior-niceness.mjs $f 2>&1 | tail -12; done
echo "######## option shapes (RUN = return; GAP read), per file, merged, spares"; for f in $F $M $X; do node $S/act-math-v26-option-shapes.mjs $f 2>&1 | grep -v '^selftest'; done
echo "######## merge checks (closure ON THE KEY = return; shared values / subskills read)"
E=$SCR/empty.json; echo '[]' > $E
for f in $F $X; do echo "--- $f"; node $S/merge-halves.mjs $f $E $SCR/mh-tmp.json 2>&1 | grep -E 'CLOSURE|no option set|SHARED|OPTION VALUE|TRIPLE|SUBSKILL IS'; done
node $S/merge-halves.mjs $S/act-math-v28-d1.batch.json $S/act-math-v28-d2.batch.json $SCR/mh-d.json 2>&1 | grep -vE '^ +[0-9]+x |^wrote|^subskills'
node $S/merge-halves.mjs $S/act-math-v28-b.batch.json $S/act-math-v28-c.batch.json $SCR/mh-bc.json 2>&1 | grep -vE '^ +[0-9]+x |^wrote|^subskills'
node $S/merge-halves.mjs $SCR/mh-d.json $SCR/mh-bc.json $SCR/mh-all.json 2>&1 | grep -E 'SHARED|OPTION VALUE|stem-overlap|merged'
node $S/merge-halves.mjs $SCR/mh-all.json $X $SCR/mh-allx.json 2>&1 | grep -E 'SHARED|OPTION VALUE|stem-overlap|merged'
echo "######## run-middle / key-is-sum / pair-constant (reading lists)"; for c in check-run-middle check-key-is-sum check-option-pair-constant; do node $S/$c.mjs $M 2>&1 | tail -12; node $S/$c.mjs $X 2>&1 | tail -6; done
N=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$M','utf8')).length)")
echo "######## arith class (reading list)"; node $S/check-key-arith-class.mjs $N $M 2>&1 | tail -40
