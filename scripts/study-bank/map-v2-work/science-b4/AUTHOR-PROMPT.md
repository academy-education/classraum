You are MAP Science batch 4 author **<CODE>** (area <AREA_NAME>, cells <CELL1> and <CELL2>, <N> slots). Repo:
/Users/andylee/Downloads/saas/classraum (run every command from there). Claude only. No GPT, no web search, no NWEA
material (never open NWEA sample items, MAP prep sites, or any Herald file/PDF in the repo). No git, no database, no
sub-agents. Never run pkill/killall/kill. Pass options as CLI flags, never env vars.

1. Read the frozen brief in full: `scripts/study-bank/map-v2-work/science-b4/BRIEF.md` (version b4; your slot tables are
   in it and in `science-b4/slots.json`). Read B33-B43 twice: B38 (model distractors = held misconceptions of the key's
   category, declared per distractor) and B33 (variable passages) are where batch 3 lost most items. Read
   `science-b4/expand.mjs`'s header for the source-entry shape. Do NOT read `scripts/study-bank/briefs/*.pending.md`,
   any `packets/` folder, or any batch-3 source or grade file (`scratchpad/map-science-b3full/**`) - copying its
   sentence plans is exactly what the graders caught.
2. Write your plan FIRST: `scratchpad/map-science-b4/plans/<CODE>.md`, one line per slot (id | PE | system | the concept
   the key turns on | for model items the key's category). Read every other `plans/*.md` that exists; change yours where it
   collides on PE + system or PE + concept (B42/B43). Re-read the other plans before each cell. Grep
   `science-b4/EXCLUSIONS-science.txt` and `scratchpad/map-science-b4/live-map-science.json` for each system, invented name
   and term option before using it.
3. Write `scratchpad/map-science-b4/<A>/src-<CELL>.mjs` for each of your two cells (export `ITEMS`; one entry per slot,
   exactly the slot's fields; EMPTY only if a slot truly cannot be written as assigned). Model items need `cat` and each
   distractor as `[choice, fault, misconception, true]` where `fault` starts "misconception: ..." and `misconception` is the
   student's held belief in their words. Invented items need `names`, `ev`, `pf` where the brief requires.
4. Loop until clean: `sh scratchpad/map-science-b4/run.sh <A> --partial` (expand + `sci-check --rules b4` + probe-live-b4;
   it prints only failures and refusals). Every item of YOUR cells must print ok and the probe must refuse none of them.
   A probe refusal is fixed by a different system and question, never by rewording until the score drops.
   Then run the batch view over every area file present:
   `node scripts/study-bank/map-v2-work/science-pilot/sci-check.mjs --batch scratchpad/map-science-b4/*/items.partial.json --rules b4 --slots scripts/study-bank/map-v2-work/science-b4/slots.json --exclusions scripts/study-bank/map-v2-work/science-b4/EXCLUSIONS-science.txt | grep -E "FAIL|\[batch\]"`
   (expect "slot ... neither written" lines for cells nobody has finished; ignore those). Fix batch failures that touch
   your items per B43 (higher grade renames/changes; ties Physical before Life before Earth). Distribution checks
   (VARPLAN, SHORTLBL, KEYWORD, ECHOBAL, CLAIMBAL, TRENDFORM, FILLER) are area-wide: keep your own cells at base rate so
   the area passes when the other author's cells join.
5. Never edit another author's files. Do not write grader packets.

Reply in under 250 words: your two source paths, `sci-check: N ok, M empty` for your cells, each EMPTY slot with its
reason, any probe/batch line you could not clear and why, and any slot where you doubt the key is the only defensible
answer.
