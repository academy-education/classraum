# MAP Math b13 — stage-A author brief (one per author: N-a N-b O-a O-b G-a G-b D-a D-b)

You are one of eight Claude authors writing CANDIDATE multiple-choice maths items for the MAP Growth practice bank
(grades 5-8, four numeric options). Your author code, area and scope are in your task message and in
`scripts/study-bank/MAP-MATH-V2-B13.prereg.md` §A1. Repo root: `/Users/andylee/Downloads/saas/classraum`.
Your work folder: `scratchpad/map-v2-math-b13-work/<author>/` (create it). Write nothing outside it.

**Hard bans.** Never run `pkill`, `killall`, `kill` or any process-killing command. Do not run git. No web. No
external model calls (no GPT). No DB writes (the tools you run are read-only). Do not open any other author's folder.
Claude reasoning only. CLI flags, not env vars.

## Read first (in this order)

1. `scripts/study-bank/MAP-MATH-V2-B13.prereg.md` (the rules you are bound by; especially the duplicate standard,
   A2-A5).
2. `CLAUDE.md` sections "Verification standard", "a check that cannot read its input", "the options-only attack
   withholds the stem", "every structural proxy has been too coarse".
3. `scripts/study-bank/REGISTER.md`: every entry mentioning "MAP Math" dated 2026-10-29, -30, -31 (grep for it).
4. `scratchpad/map-v2-math-b12-work/README.md`, then its `scratch/engine12.mjs`, `scratch/mechs12.mjs`,
   `scratch/build12.mjs`, `scratch/survey12.mjs`, `slots.json`, and one item of `candidates.json` (the exact field
   shape math-check needs). You continue this method, with engine13 instead of engine12.
5. N authors only: `scripts/study-bank/map-v2-work/math-b7/`, `math-b8/`, `math-b9/` (MECHANISMS, FEASIBILITY,
   DROPPED, CHAIN-CHECK) and `scratchpad/map-v2-math-b11-work/README.md` — ideas already tried or killed.
6. `scripts/study-bank/map-v2-work/math-b13/engine13.mjs`, `probe13.mjs`, `deal13.mjs`.

Do not re-author any mechanism the b11/b12 READMEs dropped, held or selected, or any b7-b10 mechanism.

## Steps (order is enforced by file mtimes; the coordinator checks)

1. **Ideas.** List 20+ ideas in your scope (more than you need: the probe kills many). Each idea is a CHAIN of
   operations, not a context. Grade-appropriate, MAP-like (short stem, computation, real-world or pure).
   Avoid: greatest/least/maximum/minimum/"most" stems (refused by engine13 at every rank), "which of the following",
   non-numeric options, figures (no graphics in this batch), quartile/median-of-even conventions unless stated.
2. **Probe BEFORE any generator code.** Write `probe-spec.json` (format in probe13.mjs's header: per mechanism a
   draft stem in the item's own words, >= 1 one-term live query = the distinctive context noun, chain queries using
   `||` between conjunctions, >= 1 map query). Run
   `node scripts/study-bank/map-v2-work/math-b13/probe13.mjs <folder>/probe-spec.json <folder>/probes.json`.
   READ every hit. Write `PROBE-READ.md`: for each mechanism, each relevant hit id, same chain y/n, why, verdict.
   Use the prereg's duplicate standard: same chain on the same kind of givens to the same asked quantity, OR that
   chain with one step added or removed, is a duplicate (kill). Context-only overlap is fine. Also write a
   context-free chain query per idea (the operations, not the nouns) — the b12 misses were all chain repeats in new
   contexts. Expect to kill a third or more of your ideas. Keep >= 12 survivors if you can; if you cannot, say so.
3. **Deal ranks.** `node scripts/study-bank/map-v2-work/math-b13/deal13.mjs <author> <number of surviving
   mechanisms>` once. It writes `deal.json`: two ranks per mechanism (alternative a, alternative b). Rank = 1 + the
   number of options below the key (1 = key smallest, 4 = key largest).
4. **Generator.** `mechs13.mjs` (your mechanisms: gen() yields parameter sets with prompt, key, the NATURAL error set
   — each error a real student mistake computed from the printed numbers — legality rules and bounds) and
   `build13.mjs`, importing `scripts/study-bank/map-v2-work/math-b13/engine13.mjs` (absolute import path). For each
   mechanism write alternative a at its dealt rank a and alternative b at its dealt rank b, on DIFFERENT parameters
   and option sets. If a dealt rank is unreachable after the refusals, do NOT substitute another rank: record it as
   `rank-unreachable` with the survey's refusal counts at that rank. Never add a position rule of your own (no
   "avoid the middle", no "avoid extremes"): position is the deal's job. Do add stem-readable legality rules you
   find (multiple-of, units digit, sign, range, impossible denominators, increment bounds): the union may strike at
   most one distractor, per engine13.
5. **Candidates.** `candidates.json` (b12 field shape; ids `MB13C-<author>-<mech>-a|b`, e.g. `MB13C-Na-F3-a`; strip
   the hyphen from the author code in ids), `slots.json` (one row per candidate, b12 shape, with `rank`, `pos`
   S/I/L, grade, tier). Every candidate:
   - prints PART OK in
     `node scripts/study-bank/map-v2-work/math/math-check.mjs <folder>/candidates.json --slots <folder>/slots.json --prior scratchpad/map-v2-math-work/dump-b13/prior-math.json --families isee,ssat,map`
     (save stdout to `math-check-stdout.txt`; read the item count it reports and confirm it equals your file's);
   - has no option equal (by value, mixed numbers parsed as one value) to a number printed in the stem;
   - has a stated convention for any statistic with competing conventions;
   - carries `dup_search` (its mechanism's probe queries and your disposition) and `deal_rank` (= key_rank).
   For Number Systems, math-check's FORM/SLIP rules refuse; obey them.
6. **README.md** in your folder: ideas proposed / killed by the probe (with the colliding id) / written; per
   mechanism the dealt ranks, reached or `rank-unreachable`; rank histogram and nearMean share over your candidates;
   the math-check count; any risk you see that a cold screener should look at (name it, do not resolve it by a
   position rule). Also list in README any tool that could not read its input.

## What not to do

- Do not render screen or options-only packets, and do not judge your own items' guessability with a model: the
  coordinator runs fresh screeners and solvers.
- Do not stop to ask; work to completion. If the probe leaves you fewer than 8 mechanisms, write what you have and
  say so plainly in README.

Reply when done with: mechanisms written, candidates written, math-check PART OK count / file count, rank histogram,
ideas killed by the probe, and the folder path.
