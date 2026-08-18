# ATV2 b5 pre-freeze review — atv2-b5-quads.json (verbatim reviewer report, 2026-08-18)

Fresh reviewer, independent of the author. Read in full: ATV2-DESIGN.md,
atv2-prefreeze-review.md (the pilot review — severity calibration and output
format), atv2-b1-prefreeze-review.md and atv2-b4-prefreeze-review.md (all
rounds, incl. what counted as REQUIRED and b4's round-2 lesson that every round
creates work for the next), ATV2-TRANCHE1-RESULT.md and ATV2-TRANCHE2-RESULT.md
(the at-b4 section, incl. the counted solver heuristics), the target
atv2-b5-quads.json (8 lectures × 4 pivots × 4 settings = 128 settings, count
verified), and for pattern comparison only: atv2-quads.json (pilot),
atv2-b1/b2/b3/b4-quads.json (FROZEN — no change proposed to any of them) and
atv2-b6/b7/b8-quads.json (unfrozen; b5 freezes first, so where b5 collides with
one of those the OTHER batch moves and the collision is only named here).

Severity bar, calibrated to the pilot review and the b1/b4 rounds:

- **REQUIRED** = world-decidable paradigm recognition; a setting that confirms,
  presupposes, refutes or near-forces a specific setting of a sibling pivot; two
  settings of one pivot that are not mutually exclusive; a setting incoherent
  with its own stem or with an entire sibling slate; one thesis stated in two
  pivots; a load-bearing evidence token appearing in exactly one setting of two
  pivots (b4 REQUIRED item 6); a slate that reproduces a frozen batch's slate
  member-for-member (b1 round-2 D1, b4 §4-B); and the mechanical sibling 3-gram,
  which `atv2-checks.mjs` hard-fails post-freeze.
- **ADVISORY** = lone-colour options, priors that random keying neutralises,
  diffuse (two-or-more-licensor) next-step tilts, family density, length and
  onomastic fingerprints, transcript-authoring burdens.

Mechanical pre-check reproduced independently before reading for content: a
re-implementation of the STOP list and gram rule over the option layer returns
**exactly one** sibling 3-gram — `atv2-b5-p3 q2 × q3 "than the published"` —
confirming the orchestrator's finding and confirming it is the complete set. The
same scan was run at content-word level (shared rare content word between
settings of different pivots in one lecture) as a near-miss warning; those hits
are reported per lecture where they carry semantic weight, since option text is
immutable after freeze and the checker is not. Slate word counts are the
tightest in the programme so far (max within-slate spread 5 words), so length is
not a channel in this file.

Every one of b5's six next-step / inference pivots (p1 q4, p3 q3, p4 q2, p5 q1,
p7 q2, p8 q1) was swept setting-by-setting against all 12 settings of its three
siblings, per the standing instruction that this is the confirmed live leak
(b4: solver A's "the thesis licenses the next step", 5/9 vs chance 2.25, named
independently by all three solvers). Four of the six carry a hit; two of those
are one-to-one and REQUIRED, two are diffuse and advisory. The sweep is written
out under each lecture rather than summarised, so the next round can check it.

---

## atv2-b5-p1 (Mycology, air samplers vs fruiting-body searches, the Hedravean orchard)

**REFUTABILITY:** one real prior, and it sits on the load-bearing setting.
q1/s1 — "The air samplers registered the species in stands where searchers had
found no fruiting bodies" — is the single most-repeated result in fungal survey
methodology: sporadic fruiting means spore/DNA sampling detects what fruiting
surveys miss. A mycology-literate solver ranks s1 first without hearing a word.
Random keying neutralises the edge in expectation, so on its own this would be
the pilot's "rainfall declined gradually" class (advisory) — but q1 has to be
re-aimed anyway under §4-A below, and the re-aim should not land back on the
direction the discipline already knows. No other pivot in this lecture is
world-decidable; the orchard, the northward-spread dispute and the survey
redesign are all free.

**ASYMMETRY:** q2/s4 ("Complaints from its growers were what first drew the
team's attention") is the lone origin-story option among three method options,
and q4/s2 ("Replace the sticky slides with a filter cartridge that a machine can
read") is the lone hardware change among three sampling-design changes. Both are
the pilot p4/q3-s4 class in isolation and both are advisory. q3 is the
best-balanced attitude slate in the batch — two deflations (s1 sampling
artifact, s3 misidentification), one endorsement (s2), one narrowed grant (s4),
with no defer member and no hedged survivor.

**ORTHOGONALITY — one REQUIRED, one advisory.**

- **q2/s1 and q2/s2 are not mutually exclusive.** "It was the trial ground where
  the equipment was proved before the forest work began" and "Its mapped and
  managed trees gave the team a known population to calibrate against" are the
  same function — the orchard is where the method was checked against known
  ground truth — split only by whether the thing checked is the hardware or the
  detection rate. Any transcript that asserts either will contain sentences that
  make the other defensible, which is the exact shape the with-source
  exclusivity pass quarantined b4-p7 for. The design's premise is four mutually
  exclusive settings; this pivot has three. Re-aim s1 clear off the validation
  axis (e.g. the orchard's spraying records show the fungus persisting through
  treatments the forest never received).
- **q4 (next-step sweep).** s1 (winter collecting) and s4 (rain gauge beside each
  collector) are both licensed by q1/s3 ("agreed closely once the counts were
  adjusted for the week of collection"), which makes season and weather the
  lecture's nuisance variable. Because q1/s3 licenses *two* of the four, a solver
  who solves the thesis still faces a coin flip, so this is a tilt rather than
  the b4 channel — advisory. s2 and s3 have no sibling licensor. Note also the
  shared content word `shift` (q3/s1 "any shift in range" × q4/s3 "Shift part of
  the effort"), harmless today but a near-miss on soon-immutable text.

**Verdict: NEEDS REWRITE — p1 q2/s1 (not exclusive of q2/s2); p1 q1 required to
move by §4-A. Advisory: q1/s1 prior, q2/s4 and q4/s2 lone colour, the q1/s3 →
q4/s1+s4 tilt.**

## atv2-b5-p2 (History of Medicine, the Trelundy infirmary's weekly weighing)

**REFUTABILITY:** none. Routine weighing in an infirmary is close enough to real
period practice to be plausible in every setting, and it is not a clone of a
canonical episode — Sanctorius's balance chair is a self-experiment, not an
institutional regimen, and no famous configuration is being renamed here. This
is the cleanest lecture in the batch on this axis.

**ASYMMETRY:** q4/s3 ("He holds the surviving papers cannot settle it until the
admission registers are worked through") is the lone defer member. Across b5's
six attitude pivots it is the *only* defer member, so there is no repeat of b3's
defer-family saturation and it stands as acceptable in isolation. q1/s3 is the
lone economic option and q1/s4 the lone negative-evidence option in a slate
otherwise about what the ledger positively preserves; both mild.

**ORTHOGONALITY — one REQUIRED (q4/s4 collides with two of q2's settings).**

- **q2/s1 × q4/s4 is not writable as one lecture.** q2/s1 makes the professor's
  CENTRAL point a developmental arc — the weighing "began as a check on the
  kitchen's provisioning and drifted into a diagnostic habit". q4/s4 makes his
  verdict a different developmental arc for the same practice — "the choices came
  first, and the measuring grew up to justify them". These are competing origin
  stories for one practice, and a transcript asserting the first while making the
  second the verdict has to hold two incompatible accounts of why the weighing
  exists.
- **q2/s2 × q4/s4 is one thesis in two pivots.** "Physicians read the charts as
  tracking recovery, while the ward staff had other ends in view" and "the
  measuring grew up to justify them" are both the ulterior-institutional-purpose
  reading; if either is the key the other is inferable well above chance. The
  lexical near-miss `other` (q2/s2 × q4/s4) is the shadow of the same echo.
  Re-aim q4/s4 to a verdict that does not re-tell the origin or the purpose of
  the weighing (the reversal family is also getting dense across the union — see
  §4-D).
- Checked and clear: q3's four register findings coexist with every q2 and q4
  setting (q2/s3's replaced balance and q3/s2's round-figure rounding are
  different defects in the same series, and a transcript can carry both); q4/s2's
  arms-length subscribers coexist with every q1 setting.
- Advisory: q2/s4 ("Its findings mattered less than its rhythm") strains q4/s1
  (admission notes weighing a candidate's likely response), since a practice
  whose numbers did not matter is a thin basis for gating admission. Writable,
  but it is the heaviest transcript burden in the lecture.

**Verdict: NEEDS REWRITE — p2 q4/s4 (non-writable against q2/s1, thesis-shared
with q2/s2). Advisory: q2/s4 × q4/s1 strain; q4/s3 lone defer.**

## atv2-b5-p3 (Architectural History, the Lanmorick priory survey and laser scan)

**REFUTABILITY:** none. The 1840s restorers' survey, the scan, and the mason's
marks are all generic to the discipline; no canonical priory episode is being
renamed, and q4/s4's "unit of length the medieval masons worked to" is a live
open research question rather than a settled fact.

**ASYMMETRY:** q4/s1 and q4/s2 are close in job — both make the marks a dating
instrument — but they date different things (phases of the original campaign vs
later repairs), so they stay exclusive. Advisory only. q3/s4 is the lone
leave-the-building option. No hedged survivor anywhere in the lecture.

**ORTHOGONALITY — the batch's clearest instance of the b4 next-step channel.**

- **q3/s2 is licensed by exactly one sibling setting, q1/s2.** "Re-derive the
  1840s figures from the surveyors' rough sheets rather than the published
  plates" is the step that exactly one thesis licenses: q1/s2, "It deserves more
  trust than the drawings made from it, which tidied irregularities the field
  books preserve". The other three q3 settings (roof spaces, repeat scan, other
  parish buildings) are generically sensible recording activities licensed by
  nothing in particular. This is solver A's heuristic verbatim — solve the
  lecture's thesis, then pick the next step only that thesis licenses — and it
  runs in both directions, so drawing q3/s2 also hands the reader q1/s2. It is
  additionally where the mechanical 3-gram lives, which is not a coincidence:
  the shared "than the published" is the lexical shadow of a shared thesis.
  Re-aim q3/s2 to a step independent of the 1840s material, or re-aim q1/s2.
- **q1/s2 × q2/s2 is the same thesis a third time.** "The drawings made from it …
  tidied irregularities" and "Its walls thin toward the top more sharply than the
  published sections indicate" are both "the published derivative misrepresents
  the fabric". Weaker than the q1/q3 pair because q2/s2 is a specific measurement
  rather than a programme, so advisory — but if q1/s2 is kept as the fix for the
  q3 leak, this pair should be looked at again.
- Advisory: q2/s1 (lean opposite to the earlier plumb readings) mildly licenses
  q3/s3 (repeat the scan to test repeatability); shared content word `readings`.

**Verdict: NEEDS REWRITE — p3 q3/s2 (or q1/s2): one-to-one next-step licensing,
plus the mechanical 3-gram q2 × q3 "than the published". Advisory: q1/s2 ×
q2/s2 published-derivative echo; q3/s4 in the extend-to-the-neighbours family
(§4-E).**

## atv2-b5-p4 (Lexicography, the five-citation rule, the slip archive)

**REFUTABILITY — the batch's paradigm problem, and it is a whole-lecture one.**
The dictionary is an OED silhouette drawn tightly enough to be recognised by
anyone who has read one book about it: volunteer correspondents supplying
quotation slips in boxes, publication in **fascicles**, a **chief editor** with a
rival wordbook he kept annotating, a house style forming across drafts, and
dialect entries forcing decisions about regional labels. The fictional names
change nothing — that is the pilot's TMR finding, b2-p7's Rothamsted finding and
b4-p3's régisseur finding, each of which was screened here rather than in the
attack.

What is decidable is q1. "She argues it tilted the coverage toward whatever print
the correspondents happened to own" (s3) is the received modern critique of the
OED's evidence base, and "what kept the coverage answerable to evidence any
reader could check" (s1) is the traditional defence; s2 and s4 are markedly less
attested. A well-read undergraduate can rank this slate. The counter-argument —
that an attitude pivot asks for a fictional professor's POSITION, which no fact
can settle — is real and is why this is not as bad as the pilot's q2, where three
settings were flatly false in the world. It is still the defect the rebuild
exists to remove: the solver's heuristic is "pick the option the field actually
believes", and here the field believes one of the four.

Minimum fix, cheapest first: move the dictionary off the OED silhouette (the
identifying combination is correspondents' slips + fascicles + the chief editor's
annotated rival), **or** re-aim q1's axis away from the coverage-bias question
onto something the historiography has not already settled. Renaming will not do
it.

**ASYMMETRY:** q1 is well built as a slate — two defences, two attacks, matched
openers — and would be a model pivot on any other subject. q3/s4 is the lone
person-centred option and the longest in its slate (18 vs 13/14/14); q4 is
symmetric. Nothing else.

**ORTHOGONALITY — one REQUIRED next-step hit.**

- **q2/s1 is licensed by exactly one sibling setting, q1/s3.** "Trace which helper
  supplied which quotations, and so map the private libraries behind the
  dictionary" is the research programme that exactly one thesis makes worth
  doing: q1/s3's claim that coverage tilted toward whatever print the
  correspondents owned. q2/s2 (recover cut entries), q2/s3 (date senses from
  postmarks) and q2/s4 (compare with the rival wordbook) are generic archive
  activities. Both directions leak. Re-aim q2/s1, or — if q1 is rebuilt for the
  paradigm finding — re-check the replacement slate against q2 before freeze.
- Advisory: q4/s1 (boxes thinned, discards unrecorded) and q2/s2 (entries written
  and then cut) are two removal stories about different objects; q3/s2 (six
  successive drafts survive) and q2/s2 are two draft-survival stories. Keep them
  distinct in the transcript. Shared content word `kept` (q1/s1 × q2/s4).

**Verdict: NEEDS REWRITE — p4 q1 (PIVOT-LEVEL: OED paradigm, s3 is the received
critique) and p4 q2/s1 (one-to-one licensing by q1/s3). Advisory: q3/s4 length
and lone colour; the two removal stories.**

## atv2-b5-p5 (Herpetology, the salamander mark-recapture series)

**REFUTABILITY:** none decisive. Mark loss, capture heterogeneity and spot-pattern
photo-ID are all real and none of the four settings of any pivot is uniquely
true. q3/s1 ("Less the population than a readiness to enter traps") is the
methodologically fashionable answer and q2/s2's mark-shedding correction is a
known real problem, but both are priors that random keying neutralises.

**ASYMMETRY:** q4 is a good slate — s1 and s3 read the same observation (young
appearing before local eggs) in opposite directions, which is the symmetry the
design wants. q3 splits 2–2 between artifact readings (s1, s3) and real-phenomenon
readings (s2, s4). No lone hedge, no meta option, no length outlier.

**ORTHOGONALITY — two REQUIRED. This is the worst lecture in the batch on axis 3.**

- **q1/s1 is licensed by exactly one sibling setting, q2/s2.** "They will give up
  the physical tags and rely on each animal's spot pattern" is the move that
  q2/s2 — "The estimate fell by half once a correction for shed marks was
  applied" — and nothing else licenses. Worse, q2/s2 also licenses q1/s2 ("keep
  the two systems running side by side"), so one sibling setting decides half of
  the next-step slate. This is the b4 channel with the licensing relation stated
  almost explicitly in the option text.
- **q3/s2 × q4/s4 put the size distribution in exactly one setting of two
  pivots.** "A genuine decline, though one confined to the biggest size classes"
  and "reading the size distribution as the signature of a single breeding place"
  are the b4-p1 squeezes shape (REQUIRED there): a load-bearing evidence token
  that appears once in each of two slates, so each identifies the other. They are
  also in substantive tension — a decline concentrated in the largest animals
  deforms the very distribution q4/s4 reads as a single-site signature — so the
  pair is both a leak and a transcript burden. The lexical near-miss `size`
  (q3/s2 × q4/s4) is its shadow. Move the size evidence out of one of them.
- Advisory, but named because it is the same channel: q1/s4 ("a tag that can be
  read at a distance, without handling") is licensed by q3/s1 (trap-readiness
  swinging with the weather, i.e. capture and handling are the problem), and
  q2/s1 and q2/s3 both point at q3/s1. The result is that three of q1's four
  settings and two of q3's four have a distinct sibling licensor, so a solver
  reasoning toward a *coherent tuple* — b3's narrative-chain channel, which paid
  2/3 for all three solvers there — gets more traction in this lecture than
  anywhere else in b5. Fixing the two REQUIRED items thins this considerably;
  re-check the whole 4×4×3 sweep after the rewrite.

**Verdict: NEEDS REWRITE — p5 q1/s1 (licensed by q2/s2, which also licenses
q1/s2) and p5 q3/s2 or q4/s4 (shared size-distribution evidence). Advisory: the
q3/s1 ← q2/s1+s3 → q1/s4 chain.**

## atv2-b5-p6 (History of Photography, Morgelly's exposure ledger)

**REFUTABILITY:** none. A provincial photographer's exposure book, home-made
actinometry and plate-makers' price lists are all period-real and none of the
settings is world-decidable. Clean on the highest-yield axis.

**ASYMMETRY — one REQUIRED (two settings of q2 are not exclusive).**

- **q2/s1 and q2/s2 are the same move on the same kind of evidence.** "She rejects
  it, pointing to shifts of ink from entry to entry that fit a book kept daily"
  and "She rejects it on the arithmetic, since a fair copy would lack the
  crossed-out corrections" both reject Chelvern on the physical state of the book
  showing live keeping, and they are logically compatible — a book can carry both
  ink shifts and crossings-out — so the pivot offers three alternatives, not four.
  s2 also contradicts itself: "on the arithmetic" names a ground that has nothing
  to do with crossed-out corrections. Replace s2 with a rejection on a
  non-physical ground (e.g. that the volumes were never shown outside the studio,
  which kills the advertisement premise directly). Do **not** repair it into
  "rejects it on X rather than Y": b1 round-2 D3 asked that the
  accept/reject-on-other-grounds formula not reach a third batch, b4 was required
  to drop one instance, and b5 currently has none — it should stay that way.
- Advisory: q3/s3 (side-selling supplies earned more than camera work) is the lone
  economic option among three material/technique options, and is the one setting
  that the ledger-beside-price-lists juxtaposition does not obviously support.
  q4/s4 is the lone utilitarian option among three interpretive ones.

**ORTHOGONALITY — REQUIRED at PIVOT level: q1 decides what q3 and q4 can be.**

q1 asks what the ledger contains besides exposure times; q3 and q4 ask what the
ledger can be used for. Contents determine uses, so the pivots are not
independent, and the sweep shows it is not a stray pair but a hub:

- **q1/s2** ("The batch number of the material in use, which can be matched to the
  makers' delivery lists") licenses **q3/s4** ("To trace his suppliers, since the
  studio's own purchase papers do not survive"), **q3/s2** ("To show he kept
  ordering a line the catalogues had dropped some years before") and **q4/s4**
  ("Its chief use is for dating his surviving prints … to within a week"). All
  three need the ledger to identify the material; only q1/s2 puts that in it.
  Under q1/s1, q1/s3 or q1/s4 the transcript has to smuggle material identity in
  anyway, which makes those worlds strained rather than free.
- **q1/s1** ("A reading from his home-made paper meter, set down in units of his
  own devising") licenses **q4/s1** ("It preserves one man's judgment of light,
  usable as an instrument once his habits are known") — that is the same
  proposition twice — and sits badly against **q4/s2** ("adopting the handbook
  numbers years ahead of the trade press"), since a man working in units of his
  own devising is not the man adopting the published numbers early.

Six of the sixteen q3/q4 settings are decided or strained by one q1 setting. That
is not repairable by moving one member; q1's axis has to change to something that
does not determine the ledger's evidential capacity (for instance what the
ledger's *form* shows — how it was ruled, bound or indexed — or a fact about its
custody). Shared content words `years` (q1/s4 × q3/s2 × q4/s2) and `since`
(q2/s2 × q3/s4 × q4/s3) are the shadows of the same entanglement.

**Verdict: NEEDS REWRITE — p6 q1 (PIVOT-LEVEL: contents pivot decides the
use pivots; six settings affected) and p6 q2/s2 (not exclusive of q2/s1, and
internally incoherent). Advisory: q3/s3 and q4/s4 lone colour.**

## atv2-b5-p7 (Naval History, the measured mile off Aberwynt, trial speeds)

**REFUTABILITY — one setting is a world truism, and it also breaks its own stem.**
q4 asks what "the survey of trial-day coal returns across the fleet" showed.

- **q4/s4** — "Consumption climbed over each commission in step with the fouling
  of the hulls" — is textbook naval engineering (fouling raises consumption), so a
  reader who knows anything about ships ranks it true; and a survey of *trial-day*
  returns cannot show a trend across a commission, because trial day happens once,
  before the commission. The setting is both world-decidable and not writable
  under its stem. It must go.
- **q4/s3** ("Returns sent home from foreign stations ran higher than domestic
  ones for the same class") has the same, milder, stem problem: trials are run at
  home before commissioning, so foreign-station returns are not trial-day returns.
  Advisory, but if q4 is being edited, fix both.
- The rest of the lecture is clean on this axis: the inflated-trial-speeds charge
  is a real historiographic commonplace, but all four of q3's positions on it are
  attested argument-forms with no winner, which is exactly what the design wants.

**ASYMMETRY:** q3 is the strongest verdict slate in the batch — reject-with-
mechanism, endorse-and-extend, reverse, and partition, with no defer and no
hedged survivor. q1/s3 (identify the shore observers) and q1/s4 (a civilian pier
forced the course to be moved) are both off the argumentative axis, which
balances rather than exposes the slate. No length outliers (spread 5 in q1).

**ORTHOGONALITY — one REQUIRED hub on q1/s1.**

- **q1/s1 is the lecture's thesis stated in the function pivot, and it reaches two
  siblings.** "To show how much of a trial's outcome was settled beforehand, in
  the choice of water and tide" (i) licenses **q2/s4** ("How thoroughly the firm
  rehearsed the runs beforehand with a sister ship") — the shared content word
  `beforehand` is the lexical shadow, and rehearsal is the natural next document
  to want only if the outcome was pre-arranged; and (ii) collides with **q3/s1**
  ("He rejects a deliberate design, tracing the excess to a current allowance
  applied the wrong way"), since a lecture whose function pivot is "the water and
  tide were chosen to settle the result" has already conceded most of what q3/s1
  denies, and the tide/current mechanism then carries two pivots. Re-aim q1/s1
  off the tide-and-conditions axis (the arrangements at a measured mile offer
  plenty else: who certified the run, how many runs were averaged, who paid for
  the ground).
- Advisory: q2/s1 (marker posts strayed from the charted distance) is an
  alternative mechanism for the inflated speeds q3 adjudicates, so q2 and q3
  compete for the same explanatory job under some draws; q2/s1 is also licensed by
  q1/s4 (the course was moved and re-surveyed) and by q1/s2, so it is diffuse
  rather than one-to-one. The transcript must keep the two mechanisms separate
  whenever q2/s1 and q3/s1 are both drawn.

**Verdict: NEEDS REWRITE — p7 q4/s4 (world truism and stem-incoherent) and
p7 q1/s1 (licenses q2/s4, collides with q3/s1). Advisory: q4/s3 stem strain;
q2/s1 × q3 mechanism competition.**

## atv2-b5-p8 (Sedimentology, the Aberhenlow soundings series)

**REFUTABILITY:** none. Harbour-board soundings, datum shifts and post-dredging
infill are generic; q3/s4's "filling-in ran quickest the first winter" is a real
phenomenon but only as a prior, and the other three settings are equally
writable.

**ASYMMETRY:** q4/s1, s2 and s4 are all external checks on the depth record
(private notes, a dated rebuilding, a dated painting) while q4/s3 (sworn
testimony about *how* the soundings were taken) is the only one about method —
the pilot p4/q3-s4 shape, one lone colour in an otherwise uniform slate. It is
also the longest in its slate (18 vs 13/13/14). Advisory on both counts, but
they compound: the odd option is also the conspicuous one.

**ORTHOGONALITY — no REQUIRED. This is the cleanest lecture in b5 on axis 3, and
the next-step sweep is the reason it is worth saying so.**

- q1 (next-step sweep, all four against all twelve siblings): s3 ("Run the old
  lead line beside the current gear") has **no** sibling licensor — the model
  case. s1 (older harbor charts onto the modern datum) is weakly licensed by
  q3/s2 (stations moved between crews). s2 (publish the raw books rather than the
  smoothed tables) and s4 (core the fastest-gaining reaches) are both licensed by
  q2/s2 ("the board measuring where its case was best served"), and s4 also by
  q2/s4. Because q2/s2 licenses two of the four and the rest have licensors of
  their own, no single thesis picks the step out — diffuse, advisory. This is what
  a next-step pivot should look like after the other five are fixed.
- Advisory: q4/s3 (sworn testimony about how the soundings were taken) is the
  evidence that would establish q2/s2 (the board measured where its case was best
  served) and q3/s2 (stations moved between crews); it does not force either, but
  it is the one q4 setting that reaches into two sibling theses.
- Advisory strains for the transcript author, both writable: q3/s3 (shoal patches
  came and went within a year) against q2/s3 (a rhythm too slow for one
  engineer's term) — opposite timescales, and the transcript must keep them as
  two phenomena; and q3/s1 (the deepest water shifted toward the town shore, by
  more than supposed) against q2/s4 (the estuary ran steadier than its
  reputation).

**Verdict: CLEAN on required axes.** Advisory: q4/s3 lone colour and length;
the two transcript strains; the p7/p8 setting bleed under §4-F.

---

## §4 CROSS-LECTURE AND CROSS-BATCH PATTERNS

Solvers see every item with topic tags visible, and the CR-V7 lesson bites at the
level of the brief, not the item. b5's charter is measurement-and-instrumentation
and it has been followed closely enough to produce one required cross-batch
collision and one required family cut.

### §4-A — REQUIRED: p1 q1 reproduces the FROZEN b4-p8 q4 slate member-for-member

b5-p1 q1 (air samplers vs fruiting-body searches) and frozen b4-p8 q4
(Virkland's transparency readings vs the modern series) are the same slate under
different dressing:

| | b4-p8 q4 (FROZEN) | b5-p1 q1 |
|---|---|---|
| one instrument reads systematically higher | s1 "His figures run consistently deeper, by about the margin his larger disk … would produce" | s1 "The air samplers registered the species in stands where searchers had found no fruiting bodies" |
| the relation reverses in a subset | s4 "holds on the open lake but breaks down in the bays" | s2 "Stands rich in fruiting bodies sometimes yielded samplers holding barely a trace" |
| they agree once a SEASONAL adjustment is applied | s2 "agree closely once his summer readings are set against modern ones from the same weeks" | s3 "agreed closely once the counts were adjusted for the week of collection" |
| no usable relation at all | s3 "His numbers scatter too widely to carry a trend" | s4 "with no steady relation between the two" |

Three of four members correspond, and the seasonal-adjustment member matches in
prose shape as well as in content. This is the ink-chronology finding — a
recurring *slate*, not a recurring setting — that was REQUIRED in b1's round 2
and again in b4's §4-B, from a third independent author. Convergent slates are
the norm in this programme, not the exception. **b4 is frozen; b5 moves.** Re-aim
p1 q1's axis off "old instrument vs new instrument, and how they disagree"
entirely — the survey offers plenty that is not a method comparison (what the
samplers showed about timing of release, about which stands carry the fungus,
about how far spores travel).

Related and worth telling the b6 reviewer: b6-p6 q1 (the 1936 depth figure:
overstated / held up / understated / a different shaft) is a third member of the
same family. It is not member-for-member and b6 is unfrozen, so it stays
advisory — but the family is now the programme's most common detail-pivot shape
(b4-p8 q4, b5-p1 q1, b5-p3 q2, b6-p6 q1, b7-p2 q1+q2) and should not take a
fourth batch.

### §4-B — REQUIRED (mechanical): the sibling 3-gram, with a fix that does not weaken the pivot

    atv2-b5-p3  q2/s2 × q3/s2   "than the published"

`atv2-checks.mjs` hard-fails this post-freeze and it survives any semantic edit
that leaves both settings in place. Minimal fix, applied to q2/s2 so that it
holds whatever happens to q3/s2 under §4-A of the p3 section:

    q2/s2: "Its walls thin toward the top more sharply than the printed
            sections show"

("printed" is not a stopword either, but it appears nowhere else in p3; re-run
the scan after every rewritten setting — five of the eight lectures are being
edited and new hits are cheap to introduce.)

### §4-C — ADVISORY: every b5 lecture is an instrument lecture, and the batch's shape is b4's counted heuristic

All eight lectures resolve their pivots out of a measurement series and a second
instrument or record that disagrees with it: samplers vs searchers, a balance and
its registers, an 1840s survey vs a laser scan, citation slips recounted, tags vs
spot patterns, an exposure ledger vs plate catalogues, a measured mile vs the
builders' papers, lead-line soundings vs modern gear. Seven of eight then run the
same underlying claim in at least one setting — *the received number is an
artifact of how it was produced.* That is precisely the heuristic two b4 solvers
named as the batch's biggest exposure, and it paid **nothing** there (3/8, 2/8,
2/8 against chance 2.0) because b4's charter also put artifact-shaped readings in
the distractors. b5 does the same thing, so the same protection applies and this
stays advisory. It is recorded because it is the common cause of §4-A and §4-D,
and because if a later batch is written on a similar charter the union will have
a recognisable roster.

### §4-D — ADVISORY (borderline): the run-the-two-systems-side-by-side next step

- p5 q1/s2 "They will keep the two systems running side by side for several more
  seasons"
- p8 q1/s3 "Run the old lead line beside the current gear for a season to learn
  how they differ"
- p3 q3/s3 "Repeat the scan after an interval long enough to test how repeatable
  its readings are" (adjacent: one instrument against itself)

Two of b5's six next-step pivots carry a member of this family with near-identical
prose ("side by side" / "beside … to learn how they differ"), and a third carries
its self-comparison variant. b4's §4-D bar was four of seven, and b3's defer
saturation five of seven, so this sits below the required line — but the prose
match between p5 q1/s2 and p8 q1/s3 is tight enough that the cross-lecture
near-duplicate check would catch it if the wording were any closer, and both are
free to change now and permanent after freeze. **Reword one.** It also collides
outward with unfrozen **b7-p8 q2/s2** ("Take paired cores at each bog, to learn
how much the record shifts within a single site") — same job, same rider; b5
freezes first, so the b7 reviewer should be told the family is claimed.

### §4-E — ADVISORY: families already logged by earlier reviewers, with b5's members named

1. **Extend-to-the-neighbours-to-see-if-it-is-local.** b5-p3 q3/s4 ("Move on to
   the parish's other early buildings to give the priory a comparison") was
   already named in b4's §4-F3 alongside b6-p1 q4/s2, b7-p1 q4/s1, b7-p8 q1/s1,
   b8-p5 q1/s4 and two b4 members. Legitimate and near-unavoidable; density only.
2. **The private record fills the gap the official series leaves.** b5-p8 q4/s1
   ("Its keeper's private depth notes cover the years the official series leaves
   blank") and b5-p6 q3/s4 ("since the studio's own purchase papers do not
   survive"), against b7-p6 q2/s1, b7-p4 q3/s1, b4-p8 q2/s1, b1-p2 q4/s1. Two
   members in b5 is within tolerance; do not add a third.
3. **The reversal verdict.** b5-p2 q4/s4 ("He runs it the other way") and b5-p7
   q3/s3 ("He turns it around"), against b1-p3 q4/s3, b7-p6 q4/s1, b7-p4 q4/s4,
   b8-p7 q3/s4. Two in b5 is fine on its own, but note that p2 q4/s4 is being
   rewritten anyway under the p2 finding, which is the cheapest place to thin the
   family.
4. **The accept/reject-on-other-grounds formula** (b1 round-2 D3; b4 was required
   to drop one instance): b5 currently has **none**. Keep it that way — in
   particular do not repair p6 q2/s2 into it.
5. **Publish-the-tractable-class-first** (b4 §4-D, cut from four to two): b5 has
   one member, p8 q1/s2, and it is a raw-vs-smoothed argument rather than a
   class-A-before-class-B one. No action.

### §4-F — ADVISORY: fingerprints that are free now and permanent after freeze

1. **Uniformly Brythonic onomastics.** Hedravean, Trelundy, Maderwyn,
   Rostrellick, Lanmorick, Caldwyth, Polgrenna, Morgelly, Chelvern, Aberwynt,
   Porthlenny, Penvorran, Nansveor, Aberhenlow, Penvellan, Carnhedrow — sixteen
   names, one language, across eight disciplines and several implied countries.
   No collision with any other batch (swept across all nine files), which is the
   improvement b4 also achieved; but b4 was flagged for exactly this (its §4-F4,
   uniformly Finnic) and b5 reproduces it, so the union now has two batches each
   trivially clusterable by name.
2. **p7 and p8 read as one world.** Aberwynt/Aberhenlow, Penvorran/Penvellan, both
   maritime, both about distances measured over water against charts, adjacent in
   the file. Different domains on paper (Naval History, Sedimentology), one
   setting in effect. Since a solver sees topic tags, this is the pair most likely
   to be reasoned about jointly. Cheap to fix by moving p8's onomastics.
3. **p1's qtype order is detail / function / attitude / inference** — the same p1
   order as b1, b2, b4, b6, b7 and b8 (b3 alone differs). b4's §4-F5 asked for
   this to be rotated and it was not carried into b5. No answer leaks (the blind
   render shuffles item order), but it is an authoring-template fingerprint and it
   is free to rotate.
4. **Length is clean** — max within-slate spread 5 words, no slate with a
   conspicuous outlier except p4 q3/s4 and p8 q4/s4 (18 vs 13–14), both already
   noted as the lone-colour option in their slates. Note that b4's key-length-rank
   check FAILED post-selection at 41.7% on a draw, not on authoring; tight slates
   are the only defence available before the RNG runs, and b5's are tight.

---

## Summary of required rewrites

| Lecture | Verdict |
|---|---|
| atv2-b5-p1 | REWRITE: q2/s1 (not exclusive of q2/s2); **q1 slate** required by §4-A (reproduces frozen b4-p8 q4) |
| atv2-b5-p2 | REWRITE: q4/s4 (non-writable against q2/s1; thesis shared with q2/s2) |
| atv2-b5-p3 | REWRITE: q3/s2 (or q1/s2) — one-to-one next-step licensing; q2/s2 (3-gram) |
| atv2-b5-p4 | REWRITE: **q1 PIVOT-LEVEL** (OED paradigm; s3 is the received critique); q2/s1 (licensed by q1/s3) |
| atv2-b5-p5 | REWRITE: q1/s1 (licensed by q2/s2, which also licenses q1/s2); q3/s2 or q4/s4 (shared size-distribution evidence) |
| atv2-b5-p6 | REWRITE: **q1 PIVOT-LEVEL** (contents pivot decides q3 and q4; six settings affected); q2/s2 (not exclusive of q2/s1) |
| atv2-b5-p7 | REWRITE: q4/s4 (world truism, stem-incoherent); q1/s1 (licenses q2/s4, collides with q3/s1) |
| atv2-b5-p8 | CLEAN (advisories: q4/s3 lone colour and length; two transcript strains; §4-F2 setting bleed) |

### REQUIRED — per lecture

1. **atv2-b5-p6 q1 — PIVOT-LEVEL rebuild.** What the ledger contains determines
   what the ledger can be used for, and q3 and q4 both ask what it can be used
   for. q1/s2 licenses q3/s2, q3/s4 and q4/s4; q1/s1 restates q4/s1 and near-
   refutes q4/s2. Six of sixteen sibling settings are decided or strained by one
   q1 member. Re-aim q1 onto something that does not carry evidential capacity —
   the book's form, its ruling and indexing, or its custody.
2. **atv2-b5-p4 q1 — PIVOT-LEVEL.** The OED silhouette (correspondents' slips,
   fascicles, a chief editor with an annotated rival wordbook) is recognised, and
   s3 is the received modern critique of that dictionary's evidence base while s1
   is the traditional defence. Either break the silhouette or move q1's axis off
   the coverage-bias question. Renaming will not fix it. *(batch-level blocker,
   with §4-A)*
3. **atv2-b5-p1 q1 — slate re-aim, §4-A.** Reproduces frozen b4-p8 q4
   member-for-member on three of four members, including the seasonal-adjustment
   member's prose shape. b4 is frozen; b5 moves. Re-aim off the
   two-instruments-disagree axis; while doing so, avoid landing on q1/s1's
   direction, which mycology already knows.
4. **atv2-b5-p5 q1/s1** — abandoning physical tags for spot patterns is licensed
   by exactly one sibling setting (q2/s2, the shed-mark correction), which also
   licenses q1/s2. Re-aim s1, or move the mark-loss finding out of q2.
5. **atv2-b5-p5 q3/s2 or q4/s4** — the size distribution is the load-bearing
   evidence in exactly one setting of each of two pivots, and the two readings of
   it are in tension. Move it out of one.
6. **atv2-b5-p3 q3/s2** (or q1/s2) — "re-derive the 1840s figures from the
   surveyors' rough sheets rather than the published plates" is licensed only by
   q1/s2's field-books-over-drawings thesis; the other three q3 settings are
   generic. Re-aim to a step independent of the 1840s material.
7. **atv2-b5-p4 q2/s1** — "map the private libraries behind the dictionary" is
   licensed only by q1/s3's correspondents'-own-print thesis. Re-check against
   whatever q1 becomes under item 2.
8. **atv2-b5-p7 q4/s4** — world truism (fouling raises consumption) AND not
   writable under its own stem (trial-day returns cannot show a trend across a
   commission). Replace.
9. **atv2-b5-p7 q1/s1** — "how much of a trial's outcome was settled beforehand,
   in the choice of water and tide" licenses q2/s4 (rehearsal) and concedes most
   of what q3/s1 denies, putting the tide/current mechanism in two pivots.
10. **atv2-b5-p2 q4/s4** — "the choices came first, and the measuring grew up to
    justify them" cannot coexist with q2/s1's provisioning-to-diagnosis origin,
    and restates q2/s2's ulterior-purpose thesis. Replace with a verdict that
    does not re-tell the practice's origin or purpose.
11. **atv2-b5-p1 q2/s1** — not mutually exclusive of q2/s2; both make the orchard
    the ground-truth calibration site. Re-aim s1 off the validation axis.
12. **atv2-b5-p6 q2/s2** — not mutually exclusive of q2/s1 (both reject on the
    book's physical state showing live keeping) and internally incoherent ("on
    the arithmetic" names a ground unrelated to crossed-out corrections). Replace
    with a rejection on a non-physical ground; do **not** convert it into the
    "rejects it on X rather than Y" formula.

### REQUIRED — mechanical (`atv2-checks.mjs` hard-fails this post-freeze)

| Hit | Minimal fix, no weakening |
|---|---|
| p3 q2 × q3 "than the published" | q2/s2: "Its walls thin toward the top more sharply **than the printed sections show**" — holds regardless of what happens to q3/s2 under required item 6 |

Re-run the 3-gram scan over every rewritten setting before freeze. Five of eight
lectures are being edited.

### ADVISORY

- p1: q1/s1 mycological prior (fold into the §4-A re-aim); q2/s4 lone origin
  option; q4/s2 lone hardware option; q1/s3 licensing both q4/s1 and q4/s4;
  `shift` near-miss q3/s1 × q4/s3.
- p2: q2/s4 × q4/s1 strain (a practice whose numbers did not matter gating
  admission); q4/s3 lone defer member — acceptable because it is b5's only one.
- p3: q1/s2 × q2/s2 published-derivative echo (re-check if q1/s2 is kept);
  q2/s1 → q3/s3 repeatability tilt; q3/s4 in the extend-to-the-neighbours family.
- p4: q3/s4 lone person-centred option and length outlier; q2/s2 × q4/s1 two
  removal stories; q2/s2 × q3/s2 two draft-survival stories.
- p5: the q2/s1+s3 → q3/s1 → q1/s4 chain — b3's narrative-coherence channel gets
  more traction here than anywhere else in b5; re-sweep all 4×4×3 pairs after the
  two required fixes.
- p6: q3/s3 lone economic option and weakest fit to its own stem; q4/s4 lone
  utilitarian option.
- p7: q4/s3 shares q4/s4's stem strain; q2/s1 competes with q3 for the same
  explanatory job.
- p8: q4/s3 lone method option and longest in slate; q3/s3 × q2/s3 opposite
  timescales; q3/s1 × q2/s4 change-vs-steadiness strain.
- Batch: §4-C instrument-lecture uniformity (the artifact-of-its-making shape,
  counted at zero in b4 and protected the same way here); §4-D reword one of
  p5 q1/s2 / p8 q1/s3, and tell the b7 reviewer that b7-p8 q2/s2 collides;
  §4-E families 1–3 density, and keep §4-E4 at zero; §4-F1 uniform Brythonic
  naming; §4-F2 p7/p8 read as one setting; §4-F3 p1's qtype order is the
  seven-batch fingerprint and is free to rotate.

Twelve required items across seven lectures plus the one mechanical hit; two of
the twelve are pivot-level rebuilds (p6 q1, p4 q1) and one is a slate re-aim
forced by a frozen batch (p1 q1). Re-review by a FRESH reviewer after the
rewrites, with cross-batch scope held — b4's round 2 found a new leak created by
the round-1 rewrite itself, and every round of this project so far has made work
for the next one. In particular, p1 q1, p4 q1 and p6 q1 are being rebuilt whole,
so all 4×4×3 sibling pairs in those three lectures need re-sweeping from scratch,
not spot-checking.

NOT FREEZE-READY

---

## ROUND 2 (fresh reviewer)

Second reviewer, independent of both the round-1 reviewer and the rewrite author.
Read in full before opening the target: ATV2-DESIGN.md, atv2-prefreeze-review.md
(the pilot review — criteria and output format), and round 1 above. Then the
current atv2-b5-quads.json (8 lectures x 4 pivots x 4 settings = 128 settings,
count verified), and for pattern comparison the FROZEN atv2-quads.json (pilot)
and atv2-b1/b2/b3/b4-quads.json (no change proposed to any of them) plus the
unfrozen atv2-b6/b7/b8-quads.json (b5 freezes first, so those move).

Round-1 severity bar adopted unchanged. One methodological note carried from
CLAUDE.md and from b4's round 2: the orchestrator's mechanical green (zero
sibling 3-grams, zero avoid-list absolutes, zero cross-lecture near-duplicates,
zero proper-name collisions, correct counts/seed/qtypes) means NO MECHANICAL HIT
and nothing more. Two of this round's findings are the specific shape that green
cannot see — a shared THESIS whose lexical shadow was scrubbed while the thesis
stayed (p3), and a load-bearing evidence token shared across two pivots with no
word in common (p2).

Also confirmed from `atv2-render.mjs` (lines 88-99): the four settings are dealt
to letters by a seeded shuffle per lecture-pivot, so the s1..s4 ORDER in this
file never reaches a solver. Slot-order findings are therefore authoring
fingerprints only; family COMPOSITION is what can reach the attack. Round-1's
§4-F3 (p1's qtype order) is likewise cosmetic — it is noted below only because
it is still free.

### Round-1 REQUIRED items — landed or relabelled?

| # | Round-1 item | Verdict this round |
|---|---|---|
| 1 | p6 q1 pivot rebuild (contents hub) | **Axis genuinely changed** — custody carries no evidential capacity, q1 x q2 and q1 x q4 are now clean. But the replacement slate duplicates a FROZEN batch (R2-1) and the hub has partly re-formed on q2 (advisory). |
| 2 | p4 q1 pivot rebuild (OED silhouette) | **Axis genuinely changed.** The prefaces-audience question is not settled by OED historiography; no member is rankable. Note the silhouette itself was NOT removed (slips in boxes, parts, volunteer helpers, the chief editor's annotated rival wordbook in q2/s4, letters of the alphabet in q4/s2) — round 1 offered that as the alternative fix, and the author took the re-aim option, which is legitimate. Re-checked every remaining pivot against OED fact: none is decidable. |
| 3 | p1 q1 slate re-aim (§4-A, frozen b4-p8 q4) | **Axis genuinely changed** — dispersal distance, not instrument-comparison. No member of the new slate corresponds to any b4-p8 q4 member. New within-pivot exclusivity failure (R2-2). |
| 4 | p5 q1/s1 licensed by q2/s2 | **Fixed at the axis, and by the harder route.** The author moved q2/s2 off mark-shedding entirely ("The estimate climbed year on year until the season the trapping effort was cut back"). Swept all 12 sibling settings against q1: q1/s1 (spot patterns) now has NO licensor, and q1/s2 (both systems in use together) now has NO licensor. Both de-licensed, which is what round 1 asked and what a q1/s1-only edit would not have achieved. |
| 5 | p5 q3/s2 or q4/s4 (shared size distribution) | **Fixed.** q4/s4 is now "the young arrive in one short pulse rather than in scattered waves"; the size distribution appears in exactly one setting of one pivot (q3/s2). Advisory below on the new s3/s4 pair. |
| 6 | p3 q3/s2 (one-to-one next-step licensing) | **Fixed at the axis.** The 1840s-material step is gone; the new s2 (put the scan through a structural model) is licensed by all four q2 settings, i.e. by none. But the q1/q2 axis it was the symptom of was not fixed — see R2-3. |
| 7 | p4 q2/s1 (licensed by old q1/s3) | **Fixed against q1** — swept the new q1 slate four ways, no licensing. **Re-broken against q3** — see R2-5. |
| 8 | p7 q4/s4 (fouling truism, stem-incoherent) | **Fixed.** New slate is stem-coherent throughout; old s3's foreign-station strain also removed unprompted. |
| 9 | p7 q1/s1 (tide/water hub) | **Fixed at the axis.** New s1 is who pays the upkeep; it licenses nothing in q2 and concedes nothing to q3. Tide/current now appears once in the lecture (q3/s1). |
| 10 | p2 q4/s4 (origin/purpose restated) | **Fixed.** The narrowed grant ("shaping who was kept on rather than taken in") re-tells neither q2/s1's origin arc nor q2/s2's purpose thesis. |
| 11 | p1 q2/s1 (not exclusive of q2/s2) | **Fixed, whole slate re-checked.** s1 is now selection pressure under repeated spraying, s2 calibration, s3 dating past outbreaks, s4 the discovery narrative — four distinct functions, no pair co-assertable as the professor's reason. |
| 12 | p6 q2/s2 (not exclusive of q2/s1, internally incoherent) | **Exclusivity fixed** (s1 kept-daily vs s2 written-up-later are contradictory) **and the incoherent "on the arithmetic" ground is gone. But the replacement is the one shape round 1 forbade** — see R2-6. |
| M | p3 q2 x q3 "than the published" 3-gram | **Fixed** ("printed sections show"). Re-ran a 3-gram scan over every rewritten setting: no new sibling hit anywhere in the file. The thesis the 3-gram was shadowing survived the edit — R2-3. |

Ten of twelve landed at the axis rather than as relabels, which is a better ratio
than b4's round 2. The two that did not are 12 (a forbidden formula) and, in
substance, 1 (axis fixed, new cross-batch collision).

---

### atv2-b5-p1 (Mycology) — full re-sweep of the rebuilt q1

New q1 axis: how far spores carry. s1 falls away within a few hundred metres /
s2 holds across several kilometres, thinning slowly / s3 heaviest at middling
distances / s4 follows collector height more closely than distance.

**REFUTABILITY:** acceptable. The steep leptokurtic kernel (s1) is the textbook
first answer, but long-distance fungal dispersal (s2) is equally canonical for
other taxa, elevated-source deposition peaks downwind (s3) is a real result, and
height-of-collector effects (s4) are a real sampling artifact. No member is
uniquely true, and unlike the pre-rewrite q1/s1 no member is THE received result
for this exact question. The round-1 warning ("do not land back on the direction
the discipline already knows") was respected. Advisory prior only.

**R2-2 (REQUIRED) — q1/s2 and q1/s4 are not mutually exclusive.** "The catch
holds up across several kilometres of ground, thinning slowly with distance"
asserts a WEAK distance effect; "The catch follows the height of the collector
more closely than its distance from a stand" asserts that some other variable
dominates distance. These are not alternatives — they are the same finding
described twice, and a gentle distance gradient with a steeper height gradient is
one coherent world, not two. s4 contradicts s1 and s3 (both assert a strong
distance effect) but not s2, so the pivot offers three alternatives, not four.
This is the same defect round 1 made REQUIRED at p1 q2/s1-s2 and p6 q2/s1-s2, now
introduced by the re-aim itself. Cheap fix that keeps the axis: word s4 so it
denies any distance relation, e.g. "The catch bore no steady relation to distance
at all, tracking the height of the collector instead" — exclusive of s1, s2 and
s3 alike.

**NEXT-STEP SWEEP, q4 against all 12 siblings, both directions** (the re-aim's
main payoff): q4/s1 (winter collecting) — no licensor; seasonality left the
lecture with the old q1/s3. q4/s2 (machine-read cartridge) — no licensor. q4/s4
(rain gauge) — no licensor; the old q1/s3 that licensed both s1 and s4 is gone.
q4/s3 (shift effort from plot interior toward edges) — licensed by q1/s1 (a steep
kernel makes within-plot position load-bearing) and by q1/s3 (a mid-distance peak
puts the maximum at the edge), and mildly by q3/s4 (spread along river valleys).
Three licensors, so no thesis picks it out; but note the reverse direction is
sharper than round 1's usual tilt: a solver who settles on q4/s3 narrows q1 to
{s1, s3}. ADVISORY, named because it is the only surviving member of the b4
channel in this lecture and it halves a sibling slate.

**ORTHOGONALITY, remaining pairs:** q1 x q2 clean in all 16 combinations (the
orchard's spraying pressure, calibration, harvest-record dating and discovery
story are all indifferent to dispersal distance). q1 x q3 carries a diffuse
coupling — a long kernel (s2) eases a real northward expansion (q3/s2), a short
kernel (s1) or a mid-distance peak (s3) favours corridor-following (q3/s4) — but
each q1 member tilts a different q3 member, so nothing is handed to a solver.
Transcript burden, advisory.

**ASYMMETRY:** q3/s2 ("She credits it, chiefly because sites added in the north
have begun to turn it up") states as its ground the very inference q3/s1 names as
the artifact. Round 1 praised this same-observation-two-readings symmetry at p5
q4; it is defensible here for the same reason, but s2 is the one member whose
stated reasoning a methodologist would call naive, so the effective slate is
closer to three. ADVISORY. q2/s4 (lone origin story) and q4/s2 (lone hardware
change) carry over from round 1, unchanged, advisory.

**Verdict: NEEDS REWRITE — q1/s4 (not exclusive of q1/s2).** Advisory: q4/s3
narrowing q1 to two members; q3/s2's self-undermining ground; carried-over lone
colours.

### atv2-b5-p2 (History of Medicine) — round 1 missed a squeeze

q4/s4 is fixed (see table). The lecture is still clean on refutability. But the
full 4x4x3 sweep turns up a pair round 1 did not name:

**R2-4 (REQUIRED) — q1/s2 x q2/s2 put the ward staff's dissent in exactly one
setting of two pivots.** q1/s2: "Marginal notes in it preserve objections from
staff that appear nowhere in the official minutes." q2/s2: "Physicians read the
charts as tracking recovery, while the ward staff had other ends in view." q2/s2
is the only q2 setting that needs staff dissent to exist; q1/s2 is the only q1
setting that supplies the evidence for it. Each identifies the other well above
chance in both directions. This is the b4-p1 squeezes shape that round 1 itself
made REQUIRED at b5-p5 (the size distribution), and it shares no content word, so
the mechanical green was never going to see it. Cheapest fix: re-aim q1/s2 to a
different class of thing the ledger uniquely preserves (quantities issued,
substitutions when supply failed, the dispenser's own queries), leaving the
dissent thesis to q2 alone.

Otherwise clean and confirmed by sweep: q3's four register findings coexist with
every q2 and q4 setting; q4/s2's arms-length subscribers coexist with all of q1.
Advisory (new): q2/s1 (weighing began as a check on the kitchen's provisioning)
and q3/s1 (winter intake gained at rates the summer intake did not approach) are
the same provisioning story at two scales — weaker than R2-4 because a seasonal
gain difference is writable under any q2 setting, but the two should not be drawn
together without the transcript keeping them apart. Round-1 advisories (q2/s4 x
q4/s1 strain, q4/s3 as b5's only defer member) stand unchanged.

**Verdict: NEEDS REWRITE — q1/s2 (or q2/s2): staff-dissent squeeze.**

### atv2-b5-p3 (Architectural History) — the 3-gram went, the thesis stayed

q3/s2 is genuinely re-aimed and now has no unique licensor (all four q2 findings
would motivate a structural model, which is the diffuse state the design wants).
The mechanical hit is gone. What round 1 deferred to this round has got worse
rather than better, because the deferral condition was met:

**R2-3 (REQUIRED) — q1 and q2 both adjudicate "the earlier record was wrong", and
they do it in two matched one-to-one pairs.**

- q1/s2 ("It deserves more trust than the drawings made from it, which tidied
  irregularities the field books preserve") x q2/s2 ("Its walls thin toward the
  top more sharply than the printed sections show"). One thesis — the printed
  derivative misrepresents the fabric — stated as a programme in the main-emphasis
  pivot and as its instance in the detail pivot. Round 1 flagged this as advisory
  with the explicit rider "if q1/s2 is kept as the fix for the q3 leak, this pair
  should be looked at again". q1/s2 was kept, q3 was fixed elsewhere, and the pair
  was not looked at. The 3-gram repair ("published" to "printed") removed the
  lexical shadow and left the shared thesis intact — the exact failure mode
  CLAUDE.md records from b4 round 2, where a real dependency produced no shared
  n-gram at all.
- q1/s4 ("It served as a training exercise, and its errors follow the order in
  which the pupils worked") x q2/s1 ("Its lean runs opposite to the direction the
  earlier plumb readings had put it"). q2/s1 is a reversed field reading; q1/s4 is
  the only sibling setting that explains how a field reading came to be reversed.
  Second one-to-one pair on the same axis.

Two of q1's four settings each license a distinct q2 setting, so solving either
pivot materially narrows the other, and the pairing is not the diffuse
many-to-one that round 1 tolerated elsewhere. Note also that q1/s2 STRAINS q2/s1
in the other direction (a lecture whose main point is that the field books are
the trustworthy layer sits badly with a finding that the field plumb readings had
the lean backwards), so this is a leak and a transcript burden at once. Fix at
the q2 end, which is already being edited: move s1 or s2 off "the earlier record
was wrong" onto a fabric fact of the kind s3 and s4 already are.

Advisory: q4/s1 and q4/s2 remain close in job but exclusive (round 1); q3/s4 in
the extend-to-the-neighbours family (§4-E1).

**Verdict: NEEDS REWRITE — q2/s2 and q2/s1 (or q1/s2 and q1/s4): the q1 x q2
same-thesis axis, two matched pairs.**

### atv2-b5-p4 (Lexicography) — full re-sweep of the rebuilt q1

New q1: whose audience the prefaces had. s1 the reviewers (matched to quarterly
notices) / s2 the subscribers / s3 the volunteer helpers early, reviewers from the
middle parts / s4 the editorial staff.

**REFUTABILITY:** clean, and this is the round's most consequential confirmation.
The OED silhouette is still legible — slips in boxes (q4), publication in parts,
volunteer helpers (q1/s3), the chief editor's annotated rival wordbook (q2/s4),
letters late in the alphabet (q4/s2) — so the test is whether anything in the file
is now decidable BY that recognition. Checked pivot by pivot: the addressee of the
fascicle prefaces is not a settled point of OED historiography and all four
audiences are attested candidates in the general period; q2's four archive
payoffs, q3's four reasons to dwell on one dialect entry and q4's four recount
findings are all free. The re-aim was sufficient without breaking the silhouette.
Slate itself is well built: two flat positions, one partition, one reinterpretation,
matched openers, spread of 3 words.

**R2-5 (REQUIRED) — q2/s1 x q3/s4: the round-1 fix moved the leak rather than
removing it.** q2/s1 is now "Establish how the work was shared out, from the marks
each editor left on the material"; q3/s4 is "It was among the first work Caldwyth
did for the book, and it carries his habits in miniature". Both assert that
individual editorial hands are legible in the material — q2/s1 as the future
programme, q3/s4 as the worked example. q3/s4 is the only sibling setting that
supplies the premise q2/s1's programme needs, and q3/s2 (six drafts showing the
HOUSE style taking shape) cuts against it, so the licensing is one-to-one and
signed. q2 is an inference/next-step pivot, which is the confirmed live channel
(b4: 5/9 against chance 2.25, named independently by all three solvers). Round 1
de-licensed q2/s1 from q1 and did not re-sweep it against q3. Cheapest fix is
q3/s4, which round 1 already flags as the lone person-centred option AND the
slate's length outlier — one edit clears three flags.

Advisory: q3/s2 and q3/s4 are co-assertable of the same entry (drafts showing an
individual's habits being normalised into house style is one story, not two), so
even after R2-5 the two should not be left as near-neighbours. q4/s1 (boxes
thinned, discards unrecorded) is a mechanism that would produce q4/s2 (published
counts overstate the holdings) — different partitions of the collection keep them
formally exclusive, but the transcript must kill s2 explicitly in the s1 world and
vice versa. Round-1 advisories (two removal stories, two draft-survival stories)
stand.

**Verdict: NEEDS REWRITE — q3/s4 (or q2/s1): individual-hands thesis in two
pivots, on the next-step channel.**

### atv2-b5-p5 (Herpetology) — both required items landed

Confirmed above: moving q2/s2 off the shed-mark correction de-licenses q1/s1 AND
q1/s2, and the size distribution now sits in one setting of one pivot. Re-swept
all 4x4x3 pairs from scratch as round 1 asked. The lecture is no longer the
batch's worst on axis 3; nothing here reaches REQUIRED.

Advisory (new, created by the q4/s4 rewrite): q4/s3 ("He doubts it, taking the
young to be carried down from the known pools in high water") and q4/s4 ("He
resists it, since the young arrive in one short pulse rather than in scattered
waves") are two denials on logically compatible grounds — young can be both washed
down and synchronised. The old s4 (size-distribution reading) was not compatible
with s3 in this way, so this is a small regression in slate exclusivity. It is
repairable in the transcript (the s3 world must contain a verbatim span putting the
young in scattered waves), so ADVISORY, but it is a real burden and the author
should know the kill is now load-bearing.

Advisory (carried, re-measured): the q2/s1 + q2/s3 -> q3/s1 -> q1/s4 chain
survives. It is thinner than round 1 found it, and q3/s1 licenses q1/s1 about as
well as q1/s4 (photo-ID also removes the trapping dependence), so it stays
diffuse. Advisory (new, minor): q1/s3 (release juveniles unprocessed) sits oddly
in a lecture whose q4 debate turns entirely on the young.

**Verdict: CLEAN on required axes.**

### atv2-b5-p6 (History of Photography) — full re-sweep of the rebuilt q1

New q1 axis: how the ledger reached the archive. The hub is genuinely broken —
custody carries no evidential capacity, and the sweep confirms q1 x q2 is clean in
all 16 combinations and q1 x q4 in all 16. Two new problems, one of them the
round's most expensive.

**R2-1 (REQUIRED, cross-batch) — the new q1 slate reproduces FROZEN atv2-b3-p3 q4
member-for-member.** Same qtype (detail), same axis (what became of a practitioner's
working document between his hands and the archive):

| | b3-p3 q4 (FROZEN) | b5-p6 q1 (new) |
|---|---|---|
| passed to a successor / stayed in a family | s1 "passed to a schoolmaster who taught from them for thirty years"; s4 "stayed in the family, unread, until a descendant offered them for sale" | s1 "passed to the assistant who took over the studio and stayed in his family for decades" |
| lay among unrelated papers until a later event | s2 "lay misfiled among parish tax rolls until the 1950s" | s3 "sat in a solicitor's strongroom with the estate papers until a clearance sent it on" |
| dispersed by sale into a collection | s3 "divided, and half the pages are now in a collection abroad" + s4's sale | s2 "bought at a country sale by a camera collector, whose collection went to the town" |
| rescued from destruction | — | s4 "pulled from a builder's skip when the old premises were stripped out" |

Three of four members correspond and the fourth is the only member of the family
b3 did not use. This is the §4-A / b1 round-2 D1 / b4 §4-B finding for the fourth
time, from a fourth author — b3 is frozen, so b5 moves.

The instructive part is WHY it happened: round 1 proposed "a fact about its
custody" as the safe re-aim, and the custody family is a closed set (descent,
sale, misfiling, rescue), so any custody slate will land on b3's. Round 1's other
suggestion — the book's form, ruling and indexing — is not safe either, because a
book ruled and indexed in advance is evidence of systematic keeping and would leak
straight into q2's after-the-fact question. The structural fact is that all four
p6 pivots interrogate one object, so every axis internal to that object bears on
the others. The durable fix is to point one pivot at a DIFFERENT object (a rival
studio's practice, the sitters, the local trade in plates) rather than to re-aim
q1 within the ledger a second time.

**R2-6 (REQUIRED) — q2 now carries the accept/reject-on-other-grounds formula
twice, which round 1 explicitly forbade.** New q2/s2: "She agrees it was written up
from loose slips, but sees no advertising purpose behind it." q2/s4 (unchanged):
"She accepts it broadly, but sees a display aimed at rival photographers rather
than at customers." Both are concede-the-fact-then-redirect-the-purpose. Round 1's
§4-E4 and required item 12 said in terms: b5 has none of this formula, keep it at
zero, and do NOT repair q2/s2 into it; the precedent is b1 round-2 D3 (asking it
not reach a third batch) and b4 being required to drop an instance. The rewrite put
two instances in one slate. Independently of the family, two concede-then-redirect
members in a four-option slate is a within-pivot asymmetry: they are the two
sophisticated-reading options against one flat rejection (s1) and one restricted
acceptance (s3). Re-aim s2 to a rejection on a non-physical ground (round 1's own
example — the volumes were never shown outside the studio, which kills the
advertisement premise directly — is still available and is not the formula).

Advisory (new): the hub round 1 found on q1 has partly re-formed on q2 at lower
amplitude. Whether the ledger is a genuine contemporaneous record (q2) bears on
what it can be used for (q3/s1's exposure-time trend, q4/s1's instrument reading,
q4/s4's dating to within a week). It stays advisory because q2/s1 and q2/s2 both
leave the readings genuine and only q2/s4 really undercuts them, so no q2 setting
picks out one q4 setting. But it should be watched, and it is a second reason to
prefer moving a pivot off the ledger entirely over re-aiming q1 again.

Advisory (new): q3/s2 ("he kept ordering a line the catalogues had dropped") is
the finding that q3/s4's tracing operation ("trace his suppliers, since the
studio's own purchase papers do not survive") would produce; the two are close
enough in job that an s4 transcript will tend to license s2. Advisory (new): q1/s1
and q1/s3 both leave a body of the man's papers in existence, which strains q3/s4's
premise that the purchase papers do not survive — writable, two of four q1 settings
affected, the lecture's heaviest transcript burden. Round-1 advisories (q3/s3 lone
economic option, q4/s4 lone utilitarian option) stand.

**Verdict: NEEDS REWRITE — q1 (slate duplicates frozen b3-p3 q4; prefer moving a
pivot off the ledger) and q2/s2 (forbidden formula, second instance in slate).**

### atv2-b5-p7 (Naval History) — both required items landed

New q4 is stem-coherent throughout and carries no world truism: crew-to-crew
variation, trial-day burning below service consumption, winter-vs-summer trials,
and unreconciled yard measures are four writable findings with no winner. New q1/s1
(upkeep falling on the port authority) licenses nothing in q2 and concedes nothing
to q3; tide and current now appear once in the lecture. Both fixes are at the axis.

Advisory (new): q4/s2 (trial-day burning well below ordinary service) leans toward
q3/s2's endorsement of the misreporting charge, while q4/s4 (measures differing
yard to yard, unreconciled) leans toward q3/s1's muddle-not-fraud reading. The
lean is real but two-to-two and each has other readings, so it is a tilt, not the
channel. Advisory (carried and widened): q2/s1 (marker posts strayed) and now also
q2/s3 (what the builders privately took the draught to be) are alternative
mechanisms for the speed excess q3 adjudicates — two of q2's four compete with q3
for one explanatory job. Advisory (new): q1/s1 is the lone institutional/financial
option among three technical ones. Advisory: q2/s2 (intended propellers or a
borrowed set) is a period commonplace, a prior random keying neutralises.

**Verdict: CLEAN on required axes.**

### atv2-b5-p8 (Sedimentology) — still the model, with one correction to round 1

Unchanged except the onomastics, which the author moved off p7's register
(Marnstow, Ordwell, Fenrith replace Aberhenlow, Penvellan) — round 1's §4-F2 is
addressed and p7/p8 no longer read as one world.

Round 1 called q1/s3 the model next-step member and I agree: swept against all
twelve siblings it has no licensor. But round 1's sweep of q1/s1 is incomplete.
q1/s1 ("Carry it further back by working the older harbor charts onto the modern
datum") is licensed less by q3/s2 than by **q2/s3** ("The channel swings on a
rhythm too slow for one engineer's term of office to take in") — a thesis that the
series is too short is the thesis that makes extending it backwards the step to
take. q2/s4 (the estuary steadier than its reputation) gives it a second licensor,
so it stays diffuse and ADVISORY, but the pairing is sharper than round 1 recorded
and should be named for the next round rather than re-derived.

Round-1 advisories stand, with one correction: within q4 the lone-colour option
(s3, the only method setting among three external checks) and the length outlier
(s4, 18 words against 13/13/14) are DIFFERENT members, so they do not compound —
round 1's §4-F4 and p8 section disagree on this and §4-F4 is right.

**Verdict: CLEAN.**

---

### §5 CROSS-LECTURE AND CROSS-BATCH (round 2)

**§5-A — REQUIRED, cross-batch: p6 q1 vs FROZEN b3-p3 q4.** Stated in full above
as R2-1. b3 is frozen; b5 moves. This is the fourth batch in which a rewrite
landed on a frozen batch's slate, and the second time (after b4) that the
COLLISION WAS CREATED BY THE FIX FOR AN EARLIER FINDING. Recommend the standing
instruction to rewrite authors be: before proposing a replacement axis, grep the
frozen files for the family, not just for the words.

**§5-B — cross-batch collision another batch must move off: b7-p8 q2/s2.** Round
1's §4-D asked that one of p5 q1/s2 / p8 q1/s3 be reworded; the author reworded
p5 q1/s2 ("keep the tags and the photographs in use together"), so the b5-internal
prose match is gone. The outward collision is unaffected: b5-p8 q1/s3 "Run the old
lead line beside the current gear for a season **to learn how they differ**" vs
b7-p8 q2/s2 "Take paired cores at each bog, **to learn how much the record shifts**
within a single site" — same job, same rider, and both sit in the p8 slot of their
files. b5 freezes first, so **b7 moves**. Nothing else in b5 collides outward: the
three rebuilt pivots were swept against all eight other quad files for slate
family, distance/gradient slates, addressee slates and custody slates, with only
the b3 hit above.

**§5-C — ADVISORY: the partition verdict is universal.** Every one of b5's six
attitude/verdict pivots carries exactly one "grants a narrower version" member —
p1 q3/s4 (real expansion, but along the valleys), p2 q4/s4 (kept on rather than
taken in), p4 q1/s3 (from the middle parts onward), p5 q4/s2 (in wet years), p6
q2/s3 (for the earliest volume), p7 q3/s4 (for the export orders). Six of six is
above b3's defer saturation (five of seven) that earned a flag. Because the letter
deal shuffles settings, this is not an answer channel; it is a brief fingerprint,
and it means a solver can classify one option in every verdict slate by speech act
on sight. Free to fix now, permanent after freeze: drop the partition from one or
two slates and carry a second flat position instead.

**§5-D — ADVISORY: the incommensurable-series member.** p2 q2/s3 (the balance
replaced twice, published tables splicing readings that are not comparable), p7
q4/s4 (returns in measures differing yard to yard, unreconciled) and p8 q3/s2
(stations listed under one name having moved between crews) are three lectures
carrying the same artifact member. Round 1's §4-C covers the family at batch level
and counted it at zero in b4; recorded here only because p7 q4/s4 is new and took
the count from two to three.

**§5-E — round-1 advisories re-checked:** §4-E4 (accept/reject-on-other-grounds)
is now VIOLATED — see R2-6, and it is the only round-1 advisory the rewrite made
worse. §4-D reworded as asked. §4-F2 fixed. §4-F1 (uniform Brythonic onomastics)
partly relieved by p8's move to an English register. §4-F3 (p1's qtype order,
detail/function/attitude/inference, the seven-batch fingerprint) not carried out
and still free. §4-E1, §4-E2, §4-E3 densities unchanged; §4-E3 lost one member
with the p2 q4/s4 rewrite as round 1 predicted.

---

### Summary — round 2

| Lecture | Verdict |
|---|---|
| atv2-b5-p1 | REWRITE: q1/s4 (not exclusive of q1/s2) |
| atv2-b5-p2 | REWRITE: q1/s2 (or q2/s2) — staff-dissent squeeze |
| atv2-b5-p3 | REWRITE: q2/s1 and q2/s2 (or q1/s2 and q1/s4) — two matched same-thesis pairs |
| atv2-b5-p4 | REWRITE: q3/s4 (or q2/s1) — individual-hands thesis on the next-step channel |
| atv2-b5-p5 | CLEAN (both round-1 items landed at the axis) |
| atv2-b5-p6 | REWRITE: q1 (duplicates FROZEN b3-p3 q4) and q2/s2 (forbidden formula) |
| atv2-b5-p7 | CLEAN (both round-1 items landed at the axis) |
| atv2-b5-p8 | CLEAN |

#### REQUIRED

1. **atv2-b5-p6 q1 — slate re-aim, cross-batch.** Reproduces FROZEN atv2-b3-p3 q4
   member-for-member on three of four members, same qtype, same axis. Custody is a
   closed set, so a third custody slate will collide again; the durable fix is to
   aim one p6 pivot at an object other than the ledger.
2. **atv2-b5-p6 q2/s2** — "She agrees it was written up from loose slips, but sees
   no advertising purpose behind it" is the accept-then-redirect formula that round
   1 required be kept at zero, and q2/s4 is a second instance in the same slate.
   Replace with a rejection on a non-physical ground.
3. **atv2-b5-p3 q2/s1 and q2/s2** (or q1/s4 and q1/s2) — q1 and q2 both adjudicate
   "the earlier record was wrong", in two one-to-one pairs (q1/s2 x q2/s2, q1/s4 x
   q2/s1). The 3-gram fix removed the shadow and left the thesis.
4. **atv2-b5-p2 q1/s2** (or q2/s2) — the ward staff's dissent is the load-bearing
   evidence in exactly one setting of two pivots; no shared content word, so no
   mechanical check sees it.
5. **atv2-b5-p4 q3/s4** (or q2/s1) — "carries his habits in miniature" supplies the
   premise that "establish how the work was shared out from the marks each editor
   left" needs, and q3/s2 cuts against it, so the licensing is one-to-one on the
   confirmed next-step channel. Fixing q3/s4 also clears its lone-colour and
   length flags.
6. **atv2-b5-p1 q1/s4** — not mutually exclusive of q1/s2 (a weak distance effect
   and a dominant height effect are one world). Reword s4 to deny any distance
   relation.

#### ADVISORY

- p1: q4/s3 licensed by q1/s1 and q1/s3, so choosing it narrows q1 to two members;
  q3/s2's stated ground is the inference q3/s1 debunks; q2/s4 and q4/s2 lone colour.
- p2: q2/s1 x q3/s1 provisioning story at two scales; carried q2/s4 x q4/s1 strain;
  q4/s3 the batch's only defer member.
- p3: q4/s1 x q4/s2 close in job but exclusive; q3/s4 in the extend-to-neighbours
  family.
- p4: q3/s2 x q3/s4 co-assertable of one entry; q4/s1 is a mechanism for q4/s2 and
  needs an explicit kill in each other's world; carried removal/draft-survival pairs.
- p5: q4/s3 x q4/s4 are compatible denial grounds — a small exclusivity regression
  from the round-1 fix, repairable in the transcript but now load-bearing; the
  q2/s1+s3 -> q3/s1 -> q1/s4 chain, thinner than round 1 found it; q1/s3 releases
  juveniles unprocessed in a lecture whose q4 turns on the young.
- p6: the authenticity-determines-use hub partly re-formed on q2; q3/s2 is the
  finding q3/s4's operation produces; q1/s1 and q1/s3 strain q3/s4's premise.
- p7: q4/s2 and q4/s4 lean toward opposite q3 readings; q2/s1 and q2/s3 both
  compete with q3 for one explanatory job; q1/s1 lone financial option.
- p8: q1/s1 licensed by q2/s3 (sharper than round 1 recorded) and q2/s4.
- Batch: §5-C the partition verdict in six of six attitude pivots; §5-D the
  incommensurable-series member now in three lectures; §4-F3 p1's qtype order still
  free to rotate.

Six required items across five lectures, none mechanical. Four of the six were
created or left standing by the round-1 rewrite: R2-1 and R2-6 are new defects
introduced by fixes, R2-5 is a leak that moved from one sibling to another, and
R2-3 is the pair round 1 deferred to this round on a condition that was met. That
is the same pattern b4 recorded and is the reason this file has a third round
ahead of it. The three whole-pivot rebuilds were swept from scratch as instructed
(4x4x3 both directions, written out per lecture above): p1 q1 and p4 q1 are sound
on their new axes, p6 q1 is sound within its lecture and fails outward against a
frozen batch. Re-review by a fresh reviewer after these six, with cross-batch scope
held and with the frozen files grepped for the FAMILY of any replacement axis
before it is written.

NOT FREEZE-READY

---

## ROUND 3 (fresh reviewer)

Third reviewer, independent of the author, of the round-1 reviewer and of the
round-2 reviewer who diagnosed the current fixes. Read in full before opening
the target: ATV2-DESIGN.md, atv2-prefreeze-review.md (the pilot review —
criteria and output format), and rounds 1 and 2 above. Then the current
atv2-b5-quads.json (8 lectures x 4 pivots x 4 settings = 128 settings, count
verified in code), and for pattern comparison the FROZEN atv2-quads.json
(pilot) and atv2-b1/b2/b3/b4-quads.json — no change proposed to any of them —
plus the unfrozen atv2-b6/b7/b8-quads.json, which move if they collide because
b5 freezes first.

Round-1/round-2 severity bar adopted unchanged. Two calibration points I make
explicit because they decide several calls below:

- **A mechanical green means no mechanical hit and nothing more.** I
  re-implemented the sibling 3-gram scan independently over the option layer:
  **zero hits**, confirming the orchestrator. I also ran a shared-rare-content-
  word scan per lecture, which is where one of this round's findings lives (p2).
- **Under the flat letter deal and post-freeze world selection, a lone-colour /
  length / tense outlier cannot pay.** Eliminating one implausible member of a
  randomly-keyed quad returns exactly chance: 0.75 x 1/3 + 0.25 x 0 = 25%.
  Those flags are face-validity and with-source-pass concerns, which is why
  every round has ranked them ADVISORY, and why I do too — including the new
  ones the round-2 fixes introduced.

Slate lengths re-measured: exactly one slate in the file has a within-slate
spread of 5 words (p8 q4, carried), every other slate is 4 or below. Length is
not a channel in this file.

---

### PART 1 — the six post-round-2 changes, judged from scratch

#### Change 1 — p6 q1 re-aimed onto a rival studio's portrait pricing

**The round-2 defect is genuinely gone.** I re-derived the collision rather than
trusting the diagnosis: FROZEN atv2-b3-p3 q4 is the custody slate (successor /
misfiled / divided and sold abroad / stayed in the family). The new p6 q1 is
four findings about a competitor's price list and corresponds to no member of
it. I then swept the PRICING family across all nine quad files programmatically:
the other batches carry price/fee material only as single settings inside
unrelated slates (pilot p3 q3/s1, b1-p1 q3/s4, b4-p9 q1/s1, b6-p8 q2/s2,
b7-p8 q4/s1, b8-p3 q4/s4 and others). **No batch anywhere carries a pricing
SLATE**, so the fourth-consecutive-batch pattern of a re-aim landing on a frozen
slate did not recur here. The author also took round 2's structural advice —
the pivot now interrogates a DIFFERENT OBJECT (a rival firm) rather than the
ledger — which is what actually dissolves the hub.

**The hub is dissolved.** Swept all 16 q1 x q3 and all 16 q1 x q4 combinations:
what a rival studio charged carries no evidential capacity for what Morgelly's
ledger can be used for. Nothing in q3 or q4 is decided or strained by a q1
member. This is a real structural fix, not a relabel.

**Three things the replacement creates, all ADVISORY:**

1. **q1's four settings are conjunction-compatible in all six pairs.** A studio
   can charge a flat fee irrespective of print count (s1), match Morgelly on
   single sittings while undercutting on groups (s2), raise prices as each new
   process arrives (s3), and quietly discount its advertised rates for returning
   customers (s4) — all at once. They are four attributes of one price list, not
   four rival characterisations of one quantity, so every world puts three
   unrelated explicit denials on the transcript. I considered making this
   REQUIRED and decided against it on consistency: b5's other detail slates
   (p2 q3, p4 q4, p7 q4, p8 q3) are co-assertable in the same formal way and
   were passed by both earlier rounds, and the REQUIRED exclusivity findings in
   rounds 1 and 2 (p1 q2/s1-s2, p6 q2/s1-s2, p1 q1/s2-s4) were all ONE
   PROPOSITION STATED TWICE, which this is not. Named prominently because it is
   the item in b5 most likely to come back at the with-source exclusivity pass,
   and because p6 q1's kill burden is heavier than any comparable slate — the
   lecture is not otherwise about the rival's prices.
2. **q1/s4 reaches into q2's axis.** "It advertised fixed rates yet routinely
   discounted them for return customers, **a practice its own books record**" is
   the only q1 member that says anything about the relation between a studio's
   books and its advertising — which is exactly what Chelvern's charge in q2 is
   about. It leans toward q2/s1 (the books are candid daily records, Chelvern
   rejected). One-directional and weak (solving q2 does not pick q1/s4 out of
   four), so ADVISORY. The trailing clause is also the slate's only
   self-evidencing tag and makes s4 its longest member: **deleting the six words
   "a practice its own books record" clears all three flags at once** and is free
   before freeze.
3. **q1/s3 carries a real-world prior in the wrong direction.** Photographic
   prices fell as processes spread; "Its prices climbed each time a new
   photographic process reached the town" is the member a photo-historian ranks
   last. Per the arithmetic above this is worth exactly zero to a solver under
   random keying — the pilot's "rainfall declined gradually" class. ADVISORY.
   Also note q1/s3 is thematically adjacent to q3/s1 (exposure figures shortening
   as faster plates arrive); it is not a squeeze, because q3's own stem supplies
   the plate-makers' price lists, so q3/s1 needs nothing from q1.

#### Change 2 — p6 q2 s2 and s4 rewritten off "accepts the claim but redirects the reason"

**Confirmed removed, and I checked the replacements and every sibling in the
batch rather than the two rewritten members alone.**

- New s2 ("She accepts it, reading the uniform hand across the pages as a sign
  the book was copied out afterward for display") is a flat acceptance with a
  physical ground. New s4 ("She leaves it open, since the surviving pages give no
  way to tell entry date from copying date") is a defer. Neither is the formula.
- The slate is now properly exclusive AS VERDICTS: reject (s1, ink shifts) /
  accept whole (s2) / accept for the earliest volume only (s3) / defer (s4). s1
  and s2 additionally contradict each other on the physical evidence (ink varying
  entry to entry vs a uniform hand), which is the exclusivity round 1 asked for.
- **Batch-wide sweep for the formula:** the six attitude pivots carry no
  concede-the-fact-then-redirect-the-purpose member. The nearest relative is
  **p7 q3/s1** ("He rejects a deliberate design, tracing the excess to a current
  allowance applied the wrong way"), which concedes the phenomenon and redirects
  the mechanism. Both earlier rounds read this slate and called it the batch's
  strongest, and I agree it is distinguishable — the redirect is of a CAUSE, not
  of a PURPOSE, and there is no second instance in its slate, which was the
  aggravating factor in the b6 case. Recorded as a boundary case, ADVISORY.
- **New family increment the fix introduced:** round 1 recorded that p2 q4/s3 was
  b5's ONLY defer member. p6 q2/s4 is now a second, and both ground the deferral
  in the surviving documents' silence ("the surviving papers cannot settle it" /
  "the surviving pages give no way to tell"). Jaccard 0.107, far below the
  near-duplicate threshold, and two of six is nowhere near b3's five of seven —
  ADVISORY, but it is a real increment created by a fix, and rewording s4's
  ground is free now and permanent after freeze.
- **The q2 hub round 2 flagged did not get worse.** Under the old slate two q2
  members bore on the ledger's evidential uses; now exactly one does (s2, which
  strains q3/s1, q4/s1 and q4/s4 — all writable, since a book copied out
  afterward can still transmit faithful entries). Net amplitude is lower than
  round 2 measured. ADVISORY, unchanged in kind.

#### Change 3 — p3 q2 re-aimed onto the tower's shape

**Both one-to-one pairs are gone, in both directions, and I verified the axis
rather than the wording.** No member of the new q2 adjudicates "the earlier
record was wrong": s1 is a lean, s2 an oval plan, s3 an off-axis upper stage, s4
undulating courses — four fabric facts, none referring to any earlier survey,
drawing or publication. The two round-2 pairs (q1/s2 x old q2/s2, q1/s4 x old
q2/s1) therefore have no counterpart. Reverse direction checked: no q2 member
points at a q1 member.

**Unexpected payoff, verified independently:** q1/s2 (the field books preserve
irregularities the drawings tidied) now licenses ALL FOUR q2 findings equally,
which is the diffuse state the design wants, and the re-aim also de-licensed
p3's next-step pivot further than round 2 could have known — old q2/s1's
reversed plumb reading was the licensor for q3/s3 (repeat the scan to test
repeatability), and the new s1's "small but **consistent** amount" pre-empts
exactly that. q3/s1, s3 and s4 now have no sibling licensor at all; q3/s2
(structural model) is licensed by q2/s1 and q2/s4, i.e. two, i.e. diffuse.

ADVISORY, new: q2/s3 (upper stage off the axis of the stages beneath) implies a
break in the building campaign and so licenses both q4/s1 (assign walling to
building seasons) and q4/s2 (marks cluster where the fabric shows rebuilding) —
two licensees, diffuse. ADVISORY, new: q2/s1 (a lean) and q2/s3 (an off-axis
stage) are the closest pair in the file on the "same kind of finding" axis and
are co-assertable; distinguishable, but the s1 world must kill s3 explicitly.

#### Change 4 — p2 q1/s2 changed to the dispenser's dosage queries

**Partly landed. The evidential squeeze is genuinely gone; the thematic pairing
is not, and the fix added a lexical shadow to the very pair it was decoupling.**

- Gone: round 2's leak was that q1/s2 was the only q1 setting SUPPLYING evidence
  of ward-staff dissent and q2/s2 the only q2 setting NEEDING it. The new q1/s2
  is about dosages set by prescribing physicians — evidence about prescribing,
  not about the weighing — so it no longer supplies q2/s2's premise. That is a
  real narrowing, not a rename.
- Not gone: q1/s2 remains the only setting in q1 that stages a subordinate
  questioning the physicians, and q2/s2 remains the only setting in q2 that needs
  the ward staff to have had their own ends. A solver reasoning toward a coherent
  lecture still pairs them, and there is a writability push in the same
  direction: in the q1/s2 world the professor must justify a digression about
  dosages in a lecture otherwise entirely about the weighing, and the readiest
  justification is exactly q2/s2's thesis.
- **New:** my shared-rare-content-word scan returns `physicians` at **q1/s2 x
  q2/s2** — the one pair round 2 required be decoupled now shares the slate's
  most salient actor word. Not a 3-gram, so nothing hard-fails, but it is the
  lexical shadow of the surviving thesis pairing on soon-immutable text.
- Call: **ADVISORY (top of the advisory list).** It is below the bar of
  "confirms, presupposes, refutes or near-forces" that the programme has used
  for REQUIRED. Round 2's own cheaper alternative is still available and costs
  one clause: aim q1/s2 at something non-adversarial the ledger uniquely
  preserves (quantities issued, substitutions when supply failed), which removes
  both the pairing and the shared word.

**Other zero-shared-word leaks in p2, as instructed.** I swept all 4x4x3 pairs
looking specifically for tokens with no lexical trace:

- **q3/s4 x q4/s4 — the sharpest one, and it was created by ROUND 1's fix.**
  q3/s4: "Weight and length of stay tracked one another less closely than
  contemporary reports claimed." q4/s4: "He grants a narrower version, with the
  weighing shaping who was kept on rather than taken in." The weight-to-retention
  relation is load-bearing in exactly one setting of each pivot, with **no shared
  content word** ("length of stay" vs "kept on"), and the two are in substantive
  tension: a verdict that weighing governed who was kept on sits badly with a
  finding that weight and stay track less closely than believed. Each therefore
  identifies the other above chance by elimination. This is formally the b4-p1
  squeeze shape that round 1 made REQUIRED at p5 (the size distribution) — I
  weighed it as REQUIRED and settled on ADVISORY for two reasons: the relation is
  the EVIDENCE in only one of the two settings (in p5 it was the evidence in
  both), and the identification is exclusionary rather than confirmatory, which
  is materially weaker. Round 1 tolerated a closely comparable strain in this
  same lecture (q2/s4 x q4/s1) as advisory. Named first among advisories: if a
  fourth round is convened for any other reason, this is the item to fix, and
  re-aiming q3/s4 off length of stay is one edit.
- q2/s1 x q3/s1 (the provisioning story at two scales) — round 2's advisory,
  confirmed still present.
- Checked and clear with no lexical trace either way: q1/s4's interrupted scheme
  against all of q2/q3/q4; q1/s1's bed occupancy against q4/s2's subscribers;
  q1/s3's cost against q2/s4's rhythm; q3/s2's rounding against q2/s3's spliced
  tables (two different defects in one series, co-assertable but distinct).

#### Change 5 — p4 q3/s4 changed to a typesetting fact

**It has NOT relocated a third time.** I swept the whole q3 slate against all 12
settings of q1, q2 and q4, in both directions, treating "individual editorial
hands are legible in the material" as the token to trace:

- New q3/s4 ("reset in type after the first proof, needing a second pass unlike
  its neighboring entries") asserts nothing about hands, editors or attribution.
  q3/s1 (single-county evidence forcing a regional-label decision), q3/s2 (six
  drafts showing HOUSE style forming — which cuts AGAINST individual hands) and
  q3/s3 (an etymology error surviving four printings) supply nothing either.
- q2/s1 ("Establish how the work was shared out, from the marks each editor left
  on the material") therefore has no licensor in q3. Its nearest surviving
  relatives are q4/s3 ("material in the earliest hands sat misfiled…") and q1/s4
  (the prefaces addressed the editorial staff); both are weak — "earliest hands"
  is ordinary archival dating language and does not assert per-editor
  attributability — so the licensing is diffuse. **The round-2 REQUIRED is
  genuinely cleared.**
- Full next-step sweep of p4 q2, which is the live channel: s1 two weak
  licensors; s2 two (q3/s2 and, faintly, q3/s4 — both make pre-print material
  survive); s3 one faint (q4/s4's growth chronology, from a different
  instrument); s4 none. Diffuse throughout.

ADVISORY: round 2 predicted this edit would clear three flags. It cleared one.
q3/s4 is still the slate's longest member (17 vs 13/14/14, spread 4 — below the
file's flag threshold, so no longer an outlier by the batch's own measure) and it
is still the lone-colour option, having moved from lone person-centred to lone
purely-mechanical: s1, s2 and s3 are all reasons the entry matters to the
dictionary's editorial history, while s4 is a production accident, and it is the
weakest answer to a stem that asks why the professor DWELLS on the entry. Per the
arithmetic at the head of this section it cannot pay in the attack; it is a
face-validity item for the with-source pass.

ADVISORY, re-checked not inherited: p4's OED silhouette is still legible and
still decides nothing — but note q1/s1 ("She agrees, matching several passages in
them to notices that had appeared in the quarterlies") does have a real prior,
since the OED's own fascicle prefaces are known to answer critics. Under random
keying that prior is worth zero, and s2/s3/s4 name audiences equally attested in
the period, so this stays the pilot's "rainfall declined gradually" class rather
than round 1's paradigm finding.

#### Change 6 — p1 q1/s4 rewritten for mutual exclusivity

**All four q1 settings now exclude one another pairwise.** s1 (catch falls away
within a few hundred metres) x s2 (holds up across several kilometres, thinning
slowly) — contradictory gradients. s1 x s3 (heaviest at middling distances,
thinner both close in and far out) — monotonic decline vs a mid-distance peak.
s2 x s3 — s3 asserts the catch is thinner close in, which s2 denies. s4 ("showed
no steady relation to distance") denies the steady relation that s1, s2 and s3
each assert, including s2, which was round 2's specific failure: a gentle
gradient IS a steady relation, so the new wording excludes it. Confirmed.

**s4's new framing licenses and presupposes nothing in q2, q3 or q4.** Swept all
12: the orchard's four functions are indifferent to what governs the catch; the
northward-spread dispute is indifferent; and in q4 the step s4 would license — 
standardise or record collector height — is not among the four. q4/s2
(machine-read cartridge) is a reading-technology change, not a deployment fix, so
the licensing is weak at best. The reverse direction is clean too: no q4 member
points back at q1/s4.

ADVISORY, new and free to fix: **s4 is the only past-tense member of a
present-tense slate** ("The catch falls away / holds up / runs heaviest" vs "The
catch showed no steady relation"), and the only negatively-framed one. Cannot pay
in the attack; it is a visible authoring seam on text that becomes immutable at
freeze. "The catch shows no steady relation to distance, tracking the height of
the collector instead" fixes it in one word.

ADVISORY, carried and confirmed: q4/s3 (shift effort from plot interiors toward
edges) is licensed by q1/s1 and q1/s3, so choosing it narrows q1 to two members —
diffuse in the forward direction, sharper in reverse, exactly as round 2 measured.
q3/s2's stated ground remains the inference q3/s1 names as the artifact.

---

### PART 2 — independent per-lecture pass

**Refutability / paradigm recognition** (the mandated top axis; asked of every
pivot as "could a well-read undergraduate rank these four by real-world truth?"):
no pivot in b5 is rankable to a winner. Domains re-checked against the whole
union — Mycology, History of Medicine, Architectural History, Lexicography,
Herpetology, History of Photography, Naval History, Sedimentology are all fresh,
and none renames a canonical episode. Three settings carry a real-world prior and
all three are the zero-value class described at the head of this section: p6 q1/s3
(prices climbing with each new process), p4 q1/s1 (prefaces answering reviewers),
and — the one I would add to the record — **p7 q3/s2**, since the received view in
naval history is broadly that trial figures were unrepresentative. Round 1 called
p7 q3 four attested argument-forms with no winner; I would soften that to "one
member has the historiographical prior", which still leaves it advisory, because
s1's misapplied-allowance revisionism and s4's export/home partition are equally
attested forms. Related and equally advisory: p7 q4/s2 (trial-day burning below
ordinary service) runs mildly against forced-draught expectation — the opposite
direction from the fouling truism round 1 killed at the old q4/s4, and writable
per unit distance with a clean hull.

**Within-lecture asymmetry:** no lone hedged survivor anywhere. Meta-options: none
(no member rejects its stem's premise). Defer members: two (p2 q4/s3, p6 q2/s4 —
see change 2). Lone-colour members, all advisory and all carried or newly named
above: p1 q2/s4, p1 q4/s2, p4 q3/s4, p6 q3/s3, p6 q4/s4, p7 q1/s1, p8 q4/s3.
Length: one slate at spread 5 (p8 q4), everything else 4 or below.

**Orthogonality, both directions:** the 4x4x3 sweep was rerun from scratch in the
five edited lectures (p1, p2, p3, p4, p6) and spot-rerun in p5, p7, p8. Findings
are written into Part 1 and the advisory list rather than repeated. Two items in
the never-rebuilt lectures are worth naming because both rounds passed those
lectures as clean:

- **p5 q1/s3 x q3/s2 — the shadow of round 1's size-distribution finding.**
  Round 1 required the size evidence out of one of two pivots and the author took
  it out of q4/s4; but q1/s3 ("go on tagging adults but release the juveniles
  without processing") is still the only sibling setting that partitions the
  animals by age, and q3/s2 ("a genuine decline confined to the biggest size
  classes") is the only one that makes a size class load-bearing. Zero shared
  content words. Weaker than the pairs rounds 1 and 2 made REQUIRED because the
  link is a plausible motivation rather than a supplied premise, and q1/s3 has
  competing motivations (handling mortality, which q3/s1 supplies). ADVISORY.
- p8 q1/s1 licensed by q2/s3 rather than q3/s2 — round 2's correction to round 1
  is right, and it stays diffuse because q2/s4 gives it a second licensor.

**The next-step channel — the mandated special-attention axis.** All six
inference/next-step pivots (p1 q4, p3 q3, p4 q2, p5 q1, p7 q2, p8 q1) were swept
member-by-member against all 12 sibling settings in both directions. **No pivot in
b5 now carries a one-to-one licensing relation.** Licensor counts per member:

| pivot | s1 | s2 | s3 | s4 |
|---|---|---|---|---|
| p1 q4 | 0 | 0 | 3 (q1/s1, q1/s3, q3/s4) | 0 |
| p3 q3 | 0 | 2 (q2/s1, q2/s4) | 0 | 0 |
| p4 q2 | 2 weak | 2 | 1 weak | 0 |
| p5 q1 | 0 | 0 | 1 moderate + 1 (q3/s2; q3/s1) | 2 (q3/s1, q2/s3) |
| p7 q2 | 2 (q1/s4, q1/s2) | 0 | 0 | 2 (q3/s2, q3/s4) |
| p8 q1 | 2 (q2/s3, q2/s4) | 2 (q2/s2, q3/s2) | 0 | 3 |

Every licensed member has two or more licensors except p5 q1/s3, which has one
moderate and one weak. On rounds 1 and 2 naming p8 q1 as the model: I agree with
the verdict and would restate the reason — the model property is not that s3 has
no licensor (p1 q4 has three such members) but that the SLATE is multiply and
unevenly licensed, so no single thesis picks a step out. On that restatement p8
q1 and p4 q2 are now equally good, and the b4 channel that paid 5/9 there has no
open instance anywhere in this file. That is the most consequential positive
finding of this round.

---

### PART 3 — cross-lecture and cross-batch (round 3)

**§6-A — CORRECTION to round 2's cross-batch id.** Round 2 §5-B reported the
colliding b7 setting as "b7-p8 q2/s2". **That id is wrong.** b7-p8 q2/s2 is "She
accepts it for the lowest levels, while reading the later rise as growing near the
bog itself" — an unrelated attitude setting on a different pivot. The text round 2
quoted lives at **atv2-b7-p8 q1/s2**: "Take paired cores at each bog, to learn how
much the record shifts within a single site". I verified this by reading b7-p8 in
full. Acting on the round-2 id would have changed the wrong setting in b7, which
is the failure the standing instruction warns about.

**§6-B — the collision itself stands, and b7 moves.** b5-p8 q1/s3 "Run the old
lead line beside the current gear for a season **to learn how they differ**" vs
**atv2-b7-p8 q1/s2** "Take paired cores at each bog, **to learn how much the
record shifts** within a single site": same job (an internal-replication control
run as the next step), same rider construction, and both sit on the q1 next-step
pivot of the p8 lecture of their file. b5 freezes first, so **b7 moves**. I swept
the SIDE-BY-SIDE family across all nine files: the other members (pilot p5 q3/s1,
b1-p6 q4/s3, b6-p5 q1/s1, b7-p5 q2/s1, b7-p3 q4/s4, b8-p7 q2/s3, b8-p8 q4/s1) are
different jobs and none is close enough to name.

**§6-C — no other outward collision.** The three settings and one slate rewritten
since round 2 were swept against all nine quad files by family, not only by
wording: pricing slates (none anywhere — see change 1), tower/structural-geometry
slates (b5-p3 q2 is the only one in the programme), dispenser/dosage material
(unique to b5-p2 q1/s2), and typesetting/proof material (b5-p4 q3/s4 and q2/s2
against b6-p2's printing lecture — different claims, and b6 is unfrozen in any
case). Round 2's §5-A collision is resolved and no replacement collision was
introduced.

**§6-D — ADVISORY, cross-batch adjacency for whoever reviews b8:** b5-p6 is
History of Photography and b8-p3 is Cinema History. Distinct topics and no shared
onomastics or slate family, so this is not a collision; but they are the union's
closest pair of media-history domains and a solver sees topic tags. b5 freezes
first, so nothing in b5 need move. Named only so it is not re-derived later.

**§6-E — carried batch-level patterns, re-measured.** §5-C (a "grants a narrower
version" member in every one of the six attitude pivots — p1 q3/s4, p2 q4/s4,
p4 q1/s3, p5 q4/s2, p6 q2/s3, p7 q3/s4): still six of six, unchanged by the
rewrites, still a brief fingerprint rather than an answer channel, still free to
fix. §5-D (the incommensurable-series member in p2 q2/s3, p7 q4/s4, p8 q3/s2):
unchanged at three. §4-C (every lecture an instrument lecture running "the
received number is an artifact of how it was produced"): unchanged, and the b4
protection still applies since b5 also puts artifact-shaped readings in
distractors. §4-E4 (the accept/reject-on-other-grounds formula): back to **zero**
— the round-2 violation is repaired. §4-F3 (p1's qtype order
detail/function/attitude/inference, the seven-batch fingerprint): still not
rotated, still free, still cosmetic.

---

### Summary — round 3

| Lecture | Verdict |
|---|---|
| atv2-b5-p1 | CLEAN (q1/s4 exclusivity landed; advisory: past-tense outlier, q4/s3 reverse narrowing) |
| atv2-b5-p2 | CLEAN on required axes (q1/s2 squeeze genuinely narrowed; advisory: residual pairing + `physicians` shadow, q3/s4 x q4/s4) |
| atv2-b5-p3 | CLEAN (both q1 x q2 pairs gone in both directions; the re-aim also de-licensed q3/s3) |
| atv2-b5-p4 | CLEAN (individual-hands leak did not relocate; advisory: q3/s4 still lone colour and longest) |
| atv2-b5-p5 | CLEAN (advisory: q1/s3 x q3/s2, the shadow of round 1's size finding) |
| atv2-b5-p6 | CLEAN (custody duplication gone, hub dissolved, formula at zero; advisory: q1 conjunction-compatible slate, q1/s4 clause, second defer member) |
| atv2-b5-p7 | CLEAN (advisory: q3/s2 historiographical prior, q4/s2 forced-draught direction) |
| atv2-b5-p8 | CLEAN (one outward collision, b7 moves) |

#### REQUIRED — for b5

**None.** All six post-round-2 changes were judged from scratch against the whole
of their lectures and against all nine quad files, and each landed at the axis
rather than as a relabel or a relocation: the custody duplication is gone and did
not reappear in another family; the forbidden formula is back to zero and the
replacements are not disguised instances; p3's two same-thesis pairs are gone in
both directions; p2's evidential squeeze no longer transfers a token; p4's
individual-hands leak did not move a third time; and p1 q1 is exclusive pairwise.
No one-to-one next-step licensing survives anywhere in the file — the confirmed
live channel has no open instance. Nothing else in the eight lectures reaches the
bar rounds 1 and 2 used for REQUIRED.

#### REQUIRED — for another batch (b5 freezes first, so b5 does not move)

1. **atv2-b7-p8 q1/s2** — "Take paired cores at each bog, to learn how much the
   record shifts within a single site" collides with b5-p8 q1/s3. Note the
   corrected id: round 2 reported this as b7-p8 q2/s2, which is a different
   setting on a different pivot.

#### ADVISORY, in the order I would spend edits, all free before freeze and permanent after

1. **p2 q3/s4 x q4/s4** — the weight-to-retention relation load-bearing in exactly
   one setting of two pivots, in tension, zero shared words, created by round 1's
   fix. The strongest surviving item in the file; one re-aim of q3/s4 clears it.
2. **p2 q1/s2 x q2/s2** — residual thematic pairing plus the new shared word
   `physicians`; one clause re-aims q1/s2 to something non-adversarial.
3. **p6 q1/s4** — delete "a practice its own books record": removes the lean into
   q2's axis, the slate's only self-evidencing tag, and its longest member.
4. **p1 q1/s4** — "showed" to "shows": removes the slate's lone past-tense seam.
5. **p6 q1** — the four settings are conjunction-compatible in all six pairs; the
   heaviest kill burden in the batch and the item most likely to return at the
   with-source exclusivity pass.
6. **p6 q2/s4** — reword the deferral's ground so b5's two defer members do not
   both rest on the surviving documents' silence.
7. **p5 q1/s3 x q3/s2**; **p4 q3/s4** lone colour and longest; **p3 q2/s1 x
   q2/s3** co-assertable geometry; **p3 q2/s3** licensing q4/s1 and q4/s2;
   **p7 q3/s2** and **p7 q4/s2** priors; **§6-E** batch fingerprints (the
   universal partition verdict, p1's qtype order).
8. Carried and unchanged from rounds 1 and 2: p1 q2/s4 and q4/s2 lone colour;
   p1 q3/s2's self-undermining ground; p1 q4/s3 narrowing q1 to two; p2 q2/s1 x
   q3/s1 and q2/s4 x q4/s1; p4's removal and draft-survival pairs; p5 q4/s3 x
   q4/s4 compatible denials and the q2 to q3 to q1 chain; p6 q2/s2's strain on
   q3/s1, q4/s1 and q4/s4 (lower amplitude than round 2 measured), q3/s2 x q3/s4,
   q3/s3 and q4/s4 lone colour; p7 q2/s1 and q2/s3 competing with q3, q1/s1 lone
   financial option; p8 q4/s3 lone method option and longest, and the two
   transcript strains.

Mechanical state re-derived independently, not inherited: zero sibling 3-grams,
counts 8/4/4 exact, seed `atv2-b5-20260818`, one slate at length spread 5 and the
rest at 4 or below.

Two process notes for the record. First, this is the first b5 round whose findings
are all advisory, and the reason is visible in the sweep rather than assumed: the
three whole-pivot rebuilds of round 1 and the six targeted changes of round 2 moved
axes rather than words, and axis moves are what have historically stopped creating
new work. Second, the one error this round found in an earlier round was an ID, not
a judgement — round 2's b7 setting number — which is exactly the failure the
standing instruction predicted, and it would have been acted on by another batch's
author had it not been re-derived from the b7 file.

FREEZE OK
