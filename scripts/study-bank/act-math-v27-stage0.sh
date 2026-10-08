#!/bin/zsh
# act-math-v27-stage0.sh [DROP_IDS...]
# Stage 0 for act-math-v27 (ACT-MATH-V27-PREREGISTERED.md): per author file, the merged set and the IES 20.
# Runs every mechanical check AND the option-shape / merge checks BEFORE the single return is spent (A88 lesson 2).
# Optional args: ids dropped after the return (excluded from the merge). Writes act-math-v27.batch.json.
cd /Users/andylee/Downloads/saas/classraum || exit 2
S=scripts/study-bank
SCR=/private/tmp/claude-501/-Users-andylee-Downloads-saas-classraum/93d95221-6d94-4948-9914-9bd6bbc5b2a4/scratchpad/v27   # session scratch (no env var)
F=($S/act-math-v27-{d1,d2,b,c}.batch.json)
for f in $F; do [[ -s $f ]] || { echo "REFUSING: $f missing"; exit 2 }; done
DROP="$*"
node -e "
const fs=require('fs');const DROP=new Set(process.argv[1].split(' ').filter(Boolean));const all=process.argv.slice(2).flatMap(p=>JSON.parse(fs.readFileSync(p,'utf8'))).filter(i=>!DROP.has(i.id));
const ids=all.map(i=>i.id); if(new Set(ids).size!==ids.length){console.error('DUP IDS');process.exit(2)}
fs.writeFileSync('$S/act-math-v27.batch.json',JSON.stringify(all,null,1)+'\n');
const ies=all.filter(i=>i.domain==='Integrating Essential Skills');
fs.writeFileSync('$SCR/act-math-v27-ies.batch.json',JSON.stringify(ies,null,1)+'\n');
const d={};for(const i of all)d[i.domain]=(d[i.domain]||0)+1;console.log('merged',all.length,JSON.stringify(d))" "$DROP" $F || exit 2
M=$S/act-math-v27.batch.json; I=$SCR/act-math-v27-ies.batch.json
echo "merged sha $(shasum -a 256 $M | cut -c1-16)"
zsh $S/act-math-v18-preflight.sh $F $M $I 2>&1
echo "######## key-rank-position"; node $S/key-rank-position.mjs $F $M $I 2>&1 | tail -30
echo "######## key-extremity-projection (v25 bars, merged; read-only, sha $(shasum -a 256 $S/key-extremity-projection.mjs | cut -c1-16))"; node $S/key-extremity-projection.mjs $F 2>&1 | tail -30
echo "######## act-math-v26-projection (v26 bars, merged)"; node $S/act-math-v26-projection.mjs $F 2>&1 | tail -40; echo "-> exit ${pipestatus[1]}"
echo "######## act-math-v27-projection (v27 bars, merged + IES subset)"; node $S/act-math-v27-projection.mjs $F 2>&1 | tail -60; echo "-> exit ${pipestatus[1]}"
echo "######## (c) mechanical"
for f in $F $M; do node $SCR/onesided.mjs $f; done   # v26 onesided.mjs, copied to the scratch dir
echo "######## IES direction declarations (D1-D4 return; D5 read)"; for f in $F; do node $S/act-math-v27-ies-directions.mjs $f 2>&1 | grep -v '^selftest'; done
echo "######## interior niceness"; for f in $F $M; do node $S/check-interior-niceness.mjs $f 2>&1 | tail -12; done
echo "######## option shapes (RUN = return; GAP read), per file and merged"; for f in $F $M; do node $S/act-math-v26-option-shapes.mjs $f 2>&1 | grep -v '^selftest'; done
echo "######## merge checks (closure ON THE KEY = return; shared values / subskills read), per file and merged"
E=$SCR/empty.json; echo '[]' > $E
for f in $F; do echo "--- $f"; node $S/merge-halves.mjs $f $E $SCR/mh-tmp.json 2>&1 | grep -E 'CLOSURE|no option set|SHARED|OPTION VALUE|TRIPLE|SUBSKILL IS'; done
node $S/merge-halves.mjs $S/act-math-v27-d1.batch.json $S/act-math-v27-d2.batch.json $SCR/mh-d.json 2>&1 | grep -vE '^ +[0-9]+x |^wrote|^subskills'
node $S/merge-halves.mjs $S/act-math-v27-b.batch.json $S/act-math-v27-c.batch.json $SCR/mh-bc.json 2>&1 | grep -vE '^ +[0-9]+x |^wrote|^subskills'
node $S/merge-halves.mjs $SCR/mh-d.json $SCR/mh-bc.json $SCR/mh-all.json 2>&1 | grep -E 'SHARED|OPTION VALUE|stem-overlap|merged'
echo "######## run-middle / key-is-sum / pair-constant (reading lists)"; for c in check-run-middle check-key-is-sum check-option-pair-constant; do node $S/$c.mjs $M 2>&1 | tail -12; done
N=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$M','utf8')).length)")
echo "######## arith class (reading list)"; node $S/check-key-arith-class.mjs $N $M 2>&1 | tail -40
