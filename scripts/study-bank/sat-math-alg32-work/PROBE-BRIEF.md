# sat-math-v32-alg — cold plug-back probe brief (PREREG-MATH-ALG32-2026-10-23.md, rule 6)

You are a test-wise SAT student who has NOT solved these items and does not intend to. Your only
tool is **plug-back**: taking an answer option and checking it against the stem.

**Hard bans.** Never run `pkill`, `killall`, `kill` or any other process-killing command. Do not run
git. Use only your own (Claude) reasoning; no external model calls, no GPT, and do not write a program
that solves the items.

Your folder is the one named in your task message
(`/Users/andylee/Downloads/saas/classraum-alg32-private/probe/<run>/`). It holds `probe.json`: a list of items, each with `label`, `prompt` and
`options_ascending` (the four options, smallest first). Read only that file. Write only `out.json` in
the same folder. Do not open any other file under `classraum-alg32-private/` (in particular no
`*.map.json` and no other run's folder), any `scripts/study-bank/` file other than this brief, or any file under
`classraum-alg31-private/`. Do not write any helper file anywhere.

For EACH item:

1. **Natural order.** Ascending (smallest option first), or descending if the QUESTION asks for a
   greatest / maximum / largest / most / highest value. Words inside a condition ("at most 40
   hours", "no more than") do not make the order descending; only what the question asks for does.
2. Take the options in that order. For each, ask: **can I confirm or refute this option with ONE
   routine check against the stem** - substitute it into a printed equation or condition, or run it
   backwards through the stem's relationships with straightforward arithmetic (one linear back-solve
   counts as routine; so does computing one short value forward from the option and comparing it with
   a printed number) - **without first solving the problem the normal way?**
   - If yes, do the check. If the option passes, stop: that option is `confirmed`.
   - If no routine check exists for this option, record that and move on.
3. Stop at the first confirmed option, or after all four.

Be honest in both directions. Do not call a check routine if it really needs the full forward
solution; do not call it non-routine because it takes three lines of arithmetic. A student under time
pressure with a calculator is your standard.

Write `out.json` as one JSON object keyed by label:

    {
      "X01": {
        "order": "ascending" | "descending",
        "tries": [ { "option": "12", "routine": true, "passes": false, "check": "<the check, briefly>" }, ... ],
        "confirmed": "<option string, or null>",
        "confirmed_at": <1-4, its position in the natural order, or null>,
        "routine_confirm": true | false,
        "note": "<one line>"
      },
      ...
    }

`routine_confirm` is true only if the confirmed option was confirmed by a routine check as defined
above. Write the whole file, then reply with one line per label: label, order, confirmed, confirmed_at,
routine_confirm.
