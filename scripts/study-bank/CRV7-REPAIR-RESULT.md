# CR-V7 exclusivity repair — 5 items, 2026-08-19

## What was wrong

The live `cr-v7` cohort (132 items) is NOT guessable — a human scored
20.0% blind against a 25.0% control. The separate defect was answer
EXCLUSIVITY: some items had a second defensible reply.

Two human sittings settled which. Of 13 screened items the co-founder
cleared 8 and confirmed 5. Root cause differed per item — an unbound
pronoun, an identity the line assumed but never stated, a request
readable as an offer.

## The repair

**Only the spoken line was edited. All four options and the key are
byte-identical**, verified against `crv7-items.json` (the file committed
at ship time) rather than against a snapshot taken by the same process
that did the editing. This is what preserves the blind-attack evidence:
a solver in that attack sees only the options, so an unchanged option
set means the -5.0 margin still stands and no fresh attack is owed.

| item | before | after |
|---|---|---|
| 0f6c0b2f | The sublet form needs your guarantor's signature too; he's abroad. | Your uncle's abroad, but his signature's all the form needs. |
| 3d9b3ebb | They can't repair it, the whole frame's coming out for a week. | They're in the room all week with drills and dust sheets. |
| c1b773b8 | Could you cover the Thursday morning sitting while I'm in a viva? | Your seminar's off Thursday, so could you take my sitting? |
| d335e9c5 | It's a semester placement, not the full year — you're all set. | Your room's held while you're away, and spring's as normal. |
| d80fd7a2 | The high path's closed, so the ridge is out from either side. | The ridge is shut, so Saturday's day walk needs a rethink. |

No length tell installed: the 127 untouched lines run 7-12 words
(p10 8, median 9, p90 11); all five repairs land at 10-11 words.

## The verification, and the instrument failure that preceded it

**First attempt was invalid and is recorded because the failure is the
lesson.** A grader was written ad hoc for this check and told "do not
give the item the benefit of the doubt" and "a false clean verdict is
worse than a false flag". Measured against 8 items the human had
CLEARED, it flagged 50-75% of them — a false-alarm rate indistinguishable
from its hit rate on the repaired items. Even 3/3 unanimity did not
discriminate (38% of human-cleared items drew unanimous flags). Any
verdict from it was noise.

The cause: a CALIBRATED brief already existed
(`EXCLUSIVITY-GRADER-BRIEF.md`, measured at 6.7% false-flag against the
human's own 40 labels) and says the opposite — "judge at listener level,
not lawyer level", "do not aim for any particular flag rate". Writing a
fresh prompt instead of quoting the frozen one is what broke it.

**Second attempt, the one that counts.** The frozen brief quoted
verbatim, three graders, and the 5 repaired items INTERLEAVED WITH the 8
human-cleared items into one 13-item blinded set — so the false-alarm
rate and the hit rate come out of a single identical run and cannot
diverge by treatment.

    repaired  n=5   grader-flags  6/15 = 40%   unanimous 1/5 = 20%
    control   n=8   grader-flags 13/24 = 54%   unanimous 2/8 = 25%

**The repaired items are flagged LESS than items the human passed, on
every measure.** Per item, contested votes out of 3: semester 0, ridge 0,
sublet 1, room 2, Thursday 3.

Caveat stated plainly: these graders ran on a different model than the
6.7% calibration, so the ABSOLUTE rate here is not the calibrated one.
The comparison is still sound because both sets went through one run.
Note also that 2 of 8 human-cleared items also draw 3/3 unanimous flags,
so a single unanimous flag is within this instrument's own noise.

## Verdict

Accept all five. They address the defects the human named, they preserve
the blind-attack evidence by construction, they install no length tell,
and against the only honest baseline — items the same human called clean
— they measure better rather than worse.

The Thursday item (c1b773b8) is the one that drew 3/3. It is inside the
control's own unanimous rate, so it is not evidence of a defect; but if
one more human minute is ever cheap, it is the single item worth asking
about.
