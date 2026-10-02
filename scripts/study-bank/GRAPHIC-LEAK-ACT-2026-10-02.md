# Graphic-leak sweep, ACT: all 66 findings are false positives (2026-10-02)

Read-only investigation. No live item was edited.

## Verdict

**0 of 66 findings are real leaks.** Every one is a detector false positive.
REGISTER §4's line "0 leaks across 164 graphics" is still true of what it
measured. But it is **stale**: it dates from 2026-08-06 and covers 164
graphics. The live bank now carries **294**.

## The premise was wrong in two places

1. **The A22 widening did not produce these findings.** I ran main's
   pre-A22 `check-graphic-leak.mjs` (no argument = whole bank) against the
   same live bank. It prints the **identical 54 + 12 = 66**. Every flagged
   item stores its figure in `item.graphic`, which the old checker already
   read. The new `graphicOf()` top-level-svg path adds nothing here. What
   changed is the population. All 55 flagged items were inserted after the
   Aug 6 sweep:
   - `act-science-v1` and `-v2` on 2026-09-03
   - `act-math-v3sp` on 09-04
   - `act-math-v3-sp` on 09-11
2. **ACT Science is NOT hidden.** It was unhidden on 2026-09-19 on the
   co-founder's sitting (6/21 = 28.6%, against a 28.6% control).
   `HIDDEN_SUBTOPIC_SLUGS` in `src/app/mobile/study/topic/[slug]/page.tsx`
   is `{'sat-essay', 'act-writing'}`. These 51 science items can be drawn
   by students today. Because none of them leaks, that does not matter for
   this finding.

## Population

The run reads `scorable 294 of 7166`. That gives 66 findings on 55 items
(11 items carry both kinds):

| cohort | items | figure-number only | answer-in-text (+fig) |
|---|---|---|---|
| act-science-v1 | 35 | 24 | 11 |
| act-science-v2 | 16 | 15 | 1 |
| act-math-v3-sp | 3 | 3 | 0 |
| act-math-v3sp | 1 | 1 | 0 |

## Hand check: 27 items, stratified

- **All 12 answer-in-figure-text items**, read against their stems, options
  and full graphic.
- **All 4 ACT Math items.**
- **11 of the 39 caption-only science items**: 2 per cohort × domain, plus
  08f2396d.

### figure-number-in-caption (54): the ACT labelling convention

- Every match is the literal string `Figure 1` (54/54). The DO/temperature
  passage reads "Figures 1 and 2".
- In 50 of 54 the passage uses that label to point at the graphic, as in
  "The results are shown in Figure 1". The stem names it in 22 of 54.
- The 4 ACT Math items (dotplot, bars, two-way table) all say "Figure 1".
  The label is constant across the cohort, so it carries no position
  information.
- The rule exists to catch a **batch-position** tell, such as "Question 7"
  or a figure number that follows the item's order. A constant label that
  the item itself refers to is neither of those.

### answer-in-figure-text (12): digits that name things, not quantities

| id | key | what matched | why it's not a leak |
|---|---|---|---|
| 1d2e21b1 | `3` | "Experiment **3**" | ratio 75/25 is read from the bars |
| 2ca2eb28 | less than 20 mm/h | bar label "L-**20**" | extrapolation of the trend; 20 is also in a distractor |
| 646dd252 | The 2 cm pine panel, by 2 dB | "Foam, **2** cm" | 2 is in 3 of 4 options; 24−22 needs the bars |
| 727042f5 | Repeat Experiment 2 on sand and clay... | "Experiment **2**" | design reasoning |
| 7ab29617 | ...produced CO2 without added glucose | "CO**2**" vs "**2**%" | chemical formula |
| 7b6abaaa | No; at 60 min ... only 10 mL more ... | 60 min, 10%, 5% condition names | the 10 mL difference must be read off the curves; every number is also in a distractor |
| 7f7381ce | lower, because ... pH 11 ... | "pH **11**" | calibration reasoning; pH 11 is in two options |
| ab2ddb17 | No; every trial in Study 1 ... same moisture | "Studies **1**-3" | needs the table's moisture column |
| ad8636e7 | Repeating Study 1 with 20% glycerol | "Study **1**", "**20**% glycerol" | design item; the caption restates conditions the passage gives |
| b13045b2 | In Exp 1 texture varied; in Exp 2 roller passes | "Experiment **1**/**2**" | same as ad8636e7 |
| c2bb6e38 | held 30 min rather than 1 min | "Study 1 (**1** min), Study 2 (**30** min)" | same as ad8636e7 |
| d5becdd0 | resistance varied in Study 1, capacitance in Study 2 | "Study **1**/**2**" | same as ad8636e7 |

**On the last four.** These captions do restate the procedural difference
that the key names. I checked the passages for b13045b2, c2bb6e38 and
d5becdd0, and each one states that difference in full. The student sees
the passage, so the caption gives away nothing the passage does not. It
would only matter to an attack that **shows the figure but withholds the
passage**. Anyone running a no-passage attack on ACT Science should know
this, because the captions carry the design.

## Proposed detector fix (patch below, not committed)

**Why the patch is not committed.** It applies to the A22 version
(9f74ae5d), which is not merged into main. Main's working-copy checker is
the old one, so committing there would conflict with A22. Apply it after
A22 lands:

    sed -n "/^```diff$/,/^```$/p" scripts/study-bank/GRAPHIC-LEAK-ACT-2026-10-02.md | sed "1d;\$d" | git apply

**The five changes:**

- **A.** Mask identifier phrases before extracting numbers: `Experiment 3`,
  `Study 1`, `Studies 1-3`, `Figure 1`, `Table 1`, `Trial 4`, `Station`,
  `Site` and similar.
- **B.** Mask digits glued to letters: `L-20`, `CO2`, `S1`.
- **C.** Count only the key numbers that **distinguish** it, meaning numbers
  absent from every distractor.
- **D.** Apply answer-in-text only to quantity-shaped keys: at most 4
  non-numeric words of 3 or more letters, after masking.
- **E.** figure-number fires only for `Item N`/`Question N`, or for
  `Figure N` with N > 1 that neither the prompt nor the passage references.

**Results.** Self-test is 19/19. That is the original 8 plus 11 new
fixtures:

- 8 reproduce live false positives (0403ffd1, 8def2c85, 1d2e21b1, 2ca2eb28,
  646dd252, ad8636e7, 7ab29617, plus an L-20 quantity key).
- 3 are real leaks that must keep firing:
  - a caption stating `5.6 mg/L`
  - `Figure 3` on an item that never refers to it
  - `Question 4`

Live: 294 of 7166 scorable, **0 defects**. The 2 "suspicious" lines are
unchanged and out of scope.

**Break test.** I reverted each change separately:

| reverted | self-test fixture that fails | live defects with it reverted |
|---|---|---|
| A | Experiment 3 | 1 |
| B | L-20 quantity key | 0 (live cases also covered by C/D) |
| C | shared-number 646dd252 | 2 |
| D | prose ad8636e7 | 4 |
| E | five Figure 1 fixtures | 54 |

With D reverted, two items surface that were not among the original 66,
because C narrows which numbers must match. I hand-checked both and both
are false positives:

- **156e0846:** "cooled toward **20** °C" matched "a **20** cm tube".
- **c4c0ba0c:** "sites 0 to **40** km" matched the bar label "40 km".

**Known gaps of the fix:**

- An answer that *is* an identifier, such as key "Trial 3", is masked and
  can no longer fire. A figure whose bars name every trial would trip it
  anyway, so a scan cannot decide that case.
- Rule D is coarse. A prose key that genuinely leaks one distinguishing
  quantity through a caption would pass. Nothing in the live bank is of
  that shape. The with-source grade, not this scan, is the instrument for
  prose keys.

```diff
--- a/scripts/study-bank/check-graphic-leak.mjs
+++ b/scripts/study-bank/check-graphic-leak.mjs
@@ -94,7 +94,19 @@
   return out
 }
 
-const numsIn = s => (String(s).match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
+/*
+ * 2026-10-02 (GRAPHIC-LEAK-ACT-2026-10-02.md): numbers that NAME something
+ * are not quantities. ACT Science captions read "Experiment 3", "Study 1",
+ * "Studies 1-3", "L-20", and keys say "CO2"; matching those digits produced
+ * every one of the 12 answer-in-figure-text findings on the live bank, all
+ * false. Mask identifier phrases and letter-glued digits before extracting.
+ */
+const ID_PHRASE = /\b(?:experiments?|stud(?:y|ies)|trials?|figures?|fig\.|tables?|stations?|sites?|groups?|samples?|panels?|plots?|models?|students?|scientists?|hypothes[ie]s)\s*\d+(?:\s*(?:-|–|,|and|or|through)\s*\d+)*/gi
+const maskIds = s => String(s).replace(ID_PHRASE, ' ').replace(/[A-Za-z][A-Za-z-]*\d+(?:\.\d+)?/g, ' ')
+const numsIn = s => (maskIds(s).match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
+/* A key is quantity-shaped when, numbers and units aside, it is a few words at most. */
+const PROSE_WORDS = 4
+const proseWords = s => maskIds(s).replace(/-?\d+(?:[.,]\d+)*/g, ' ').split(/[^A-Za-z]+/).filter(w => w.length > 2).length
 
 /** Standalone-token match, so "5" does not match "15" or "x5". */
 const hasToken = (hay, needle) =>
@@ -110,6 +122,22 @@
  * gone; "question" still matches, and so does "Fig. 3".
  */
 const FIG_NUM = /\b(figure|fig\.|item|question)\s*\d+/i
+/*
+ * 2026-10-02: every one of the live bank's 54 figure-number findings was
+ * "Figure 1" in an ACT item — the exam's own labelling convention, constant
+ * across the cohort (so it carries no position), and in 50 of 54 the label
+ * the passage or stem uses to point at the graphic. A label the item itself
+ * refers to is a referent, not a tell; nor is figure number 1, which is
+ * what every single-figure item would be called. "Item N"/"Question N"
+ * still fire unconditionally.
+ */
+function isPositionTell(match, it) {
+  if (/^(item|question)/i.test(match)) return true
+  const n = Number(match.match(/\d+/)[0])
+  if (n === 1) return false
+  const refs = `${it.prompt ?? ''} ${it.passage ?? ''}`
+  return !new RegExp(`\\b(?:figures?|fig\\.)\\s*(?:\\d+\\s*(?:and|,)\\s*)*${n}\\b`, 'i').test(refs)
+}
 
 /** Scan ONE item. Extracted so --selftest can drive it without a DB. */
 export function scanItem(row, findings, suspicious) {
@@ -131,10 +159,21 @@
    * appear in ONE string, so an axis that merely ticks past 24 does not
    * trip it.
    */
-  if (keyNums.length) {
-    for (const t of texts) {
-      const hit = keyNums.filter(n => hasToken(t, String(n)))
-      if (hit.length === keyNums.length) {
+  /*
+   * 2026-10-02: only numbers that DISTINGUISH the key from the other
+   * options can give it away. "The 2 cm pine panel, by 2 dB" shares its 2
+   * with three distractors; "less than 20 mm/h" shares 20 with "between 20
+   * and 40". And a prose key whose numbers are passage conditions ("Repeat
+   * Study 1 with 20% glycerol") is not answered by a caption that restates
+   * the procedure — the passage states it too.
+   */
+  const otherNums = new Set(choices.filter(c => c !== key).flatMap(c => numsIn(c)).map(String))
+  const discNums = keyNums.filter(n => !otherNums.has(String(n)))
+  const quantityShaped = proseWords(key) <= PROSE_WORDS
+  if (discNums.length && quantityShaped) {
+    for (const t of texts.map(maskIds)) {
+      const hit = discNums.filter(n => hasToken(t, String(n)))
+      if (hit.length === discNums.length) {
         findings.push({
           id: row.id, domain: row.domain,
           kind: 'answer-in-figure-text',
@@ -157,7 +196,8 @@
     }
   }
 
-  if (FIG_NUM.test(blob)) {
+  const figMatch = blob.match(FIG_NUM)
+  if (figMatch && isPositionTell(figMatch[0], it)) {
     findings.push({
       id: row.id, domain: row.domain,
       kind: 'figure-number-in-caption',
@@ -202,6 +242,55 @@
                { label: 'Q3', value: 150 }, { label: 'Q4', value: 140 }],
       },
     }],
+    // ── 2026-10-02 false positives from the live ACT sweep, each reproduced ──
+    ['ACT "Figure 1" the passage points at (live 0403ffd1 shape)', null, {
+      correct_answer: '75', choices: ['25', '40', '75', '200'],
+      passage: 'One trial was performed on each plot. The results are shown in Figure 1.',
+      graphic: { type: 'bar', caption: 'Figure 1. Average infiltration rate for each trial.', bars: [{ label: 'Loam', value: 75 }] },
+    }],
+    ['constant "Figure 1" on a math item (live 8def2c85 shape)', null, {
+      correct_answer: '11', choices: ['6', '9', '11', '14'],
+      graphic: { type: 'dotplot', caption: 'Figure 1. Laps completed during one practice.', values: [3, 5, 14] },
+    }],
+    ['key number matches "Experiment 3" (live 1d2e21b1)', null, {
+      correct_answer: '3', choices: ['2', '3', '8', '12'],
+      graphic: { type: 'bar', caption: 'Figure 1. Experiment 1: Sand, Loam, Clay. Experiment 3: pre-wetted loam.', bars: [{ label: 'Loam', value: 75 }, { label: 'Clay', value: 25 }] },
+    }],
+    ['key number matches bar label "L-20" (live 2ca2eb28)', null, {
+      correct_answer: 'less than 20 mm/h.', choices: ['greater than 75 mm/h.', 'between 40 mm/h and 75 mm/h.', 'between 20 mm/h and 40 mm/h.', 'less than 20 mm/h.'],
+      graphic: { type: 'bar', bars: [{ label: 'L-10', value: 40 }, { label: 'L-20', value: 20 }] },
+    }],
+    ['key number shared with distractors (live 646dd252)', null, {
+      correct_answer: 'The 2 cm pine panel, by 2 dB', choices: ['The 4 cm foam panel, by 2 dB', 'The 2 cm pine panel, by 2 dB', 'The 4 cm foam panel, by 7 dB', 'The 2 cm pine panel, by 9 dB'],
+      graphic: { type: 'bar', bars: [{ label: 'Foam, 2 cm', value: 15 }, { label: 'Pine, 2 cm', value: 24 }] },
+    }],
+    ['prose key whose numbers are passage conditions (live ad8636e7)', null, {
+      correct_answer: 'Repeating Study 1 with 20% glycerol in the buffer',
+      choices: ['Repeating Study 3 with a pre-incubation period of 60 min', 'Repeating Study 1 with 20% glycerol in the buffer', 'Repeating Study 2 with a buffer solution of pH 5.0', 'Repeating Study 3 with 0.20 mg of enzyme instead of 0.10 mg'],
+      graphic: { type: 'svg', svg: '<svg/>', caption: 'Figure 1. Rate for Study 1 (1 min), Study 2 (30 min), and Study 3 (30 min with 20% glycerol).' },
+    }],
+    ['"CO2" in a prose key (live 7ab29617)', null, {
+      correct_answer: 'determine whether the yeast produced CO2 without added glucose.',
+      choices: ['measure the largest volume.', 'determine whether the yeast produced CO2 without added glucose.', 'test temperature.', 'provide the most glucose.'],
+      graphic: { type: 'svg', svg: '<svg/>', caption: 'Figure 1. Volume of CO2 collected. Experiment 1 flasks (0%, 2%, 5%, 10% glucose).' },
+    }],
+    ['quantity key matching a letter-glued label "L-20"', null, {
+      correct_answer: '20', choices: ['10', '20', '40', '75'],
+      graphic: { type: 'bar', caption: 'Infiltration by compaction', bars: [{ label: 'L-10', value: 40 }, { label: 'L-20', value: 20 }] },
+    }],
+    // ── and the real leaks must survive the narrowing ──
+    ['caption states a distinguishing quantity key with a unit', 'answer-in-figure-text', {
+      correct_answer: '5.6 mg/L', choices: ['4.2 mg/L', '5.6 mg/L', '7.1 mg/L', '8.0 mg/L'],
+      graphic: { type: 'svg', svg: '<svg/>', caption: 'Figure 1. DO at Station A peaks at 5.6 mg/L at 20 m.' },
+    }],
+    ['"Figure 3" on a lone item that never refers to it', 'figure-number-in-caption', {
+      correct_answer: '12', choices: ['10', '11', '12', '13'], prompt: 'What is the total?',
+      graphic: { type: 'bar', caption: 'Figure 3 — monthly totals' },
+    }],
+    ['"Question 4" in a caption still fires', 'figure-number-in-caption', {
+      correct_answer: '12', choices: ['10', '11', '12', '13'],
+      graphic: { type: 'bar', caption: 'Question 4 data' },
+    }],
     ['clean figure', null, {
       correct_answer: '24', choices: ['18', '20', '24', '30'],
       graphic: { type: 'bar', caption: 'Rainfall by month', bars: [{ label: 'Jan', value: 7 }] },
```

## Register follow-ups (not made here)

- REGISTER §4: "0 leaks across 164 graphics" should read **0 real leaks
  across 294 graphics (2026-10-02)**. The 66 raw findings are
  detector-side; see this file.
- The task brief said ACT Science is hidden. It is not, and has not been
  since 2026-09-19.
